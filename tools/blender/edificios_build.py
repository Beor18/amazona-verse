# Pipeline de edificios de Kelvin (.max -> migrado fiel + kit web). Ver docs/EDIFICIOS.md. Datos de trabajo en $AV_MAX_WORK.
"""Build AmazonaVerse building assets from the streamed .max scene inside Blender.

Usage:
  Blender -b --python build_assets.py -- --mode faithful|web --ids a,b,c --out DIR [--tex DIR]

faithful: original geometry (all polys, smoothing groups, UV ch1, matIDs, modifiers
          TurboSmooth/UVW Map re-applied), one GLB per asset, textures referenced by
          relative URI to the original files (no copies).
web:      same build, then decimated to <= budget tris, 512 px jpg base colour only.
"""
import bpy, sys, os, json, time, math, struct, re, gc, urllib.parse
import numpy as np

W = os.path.join(os.environ.get('AV_MAX_WORK', os.path.expanduser('~/AmazonaVerse/_trabajo_claude/av_max')), '')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from edificios_maxscene import Scene
from edificios_maxindex import check_mem, MemGuard, rss_peak_gb
import edificios_import_max_stream as IM

MAX = '/Users/kelvingarciapr/AmazonaVerse/04_Mapa_3D/AV3DMaxExportBuildings/AV3DMaxExportBuildings.max'
SRC_DIR = os.path.dirname(MAX)
UNIT = 0.3048  # 1 Max scene unit ~ 1 ft (canoe 15 u = 4.6 m, door/hut scale coherent)

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
args = {}
k = None
for a in argv:
    if a.startswith('--'):
        k = a[2:]
        args[k] = True
    elif k:
        args[k] = a
        k = None
MODE = args.get('mode', 'faithful')
OUT = args.get('out', W + 'out')
IDS = [x for x in args.get('ids', '').split(',') if x]
TEXDIR = args.get('tex', W + 'tex512')
BUDGET = int(args.get('budget', 4900))
MEMLIM = float(args.get('memlim', 9.0))
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------- texture lookup
TEXFILES = {}
for root, dirs, files in os.walk(SRC_DIR):
    for f in files:
        if f.lower().endswith(('.jpg', '.jpeg', '.png')):
            TEXFILES.setdefault(f.lower(), os.path.join(root, f))

sc = Scene(MAX, W + 'index.npz')
IM.init_streaming(MAX, sc.si)
ASSETS = {a['id']: a for a in json.load(open(W + 'assets.json'))}


def log(*a):
    print('[build]', *a, flush=True)


# ---------------------------------------------------------------- materials
MATCACHE = {}


def std_info(midx):
    """Standard material -> dict(name, base, normal, gloss, diffuse, rough)."""
    ch = IM.get_node(midx)
    uid = IM.get_guid(ch)
    d = None
    if uid == 0x0002:
        m = IM.get_standard_material(IM.get_references(ch))
        d = m.data if m else {}
    elif uid == IM.VRAY_MTL:
        m = IM.get_vray_material(IM.get_reference(ch))
        d = m.data if m else {}
    else:
        d = {}
    base = d.get('bitmap')
    nm = None
    if base:
        nm = re.sub(r'_(diffuse|basecolor|base_color|albedo)$', '', os.path.splitext(base)[0], flags=re.I)
    if not nm:
        nm = 'Mat_%d' % midx
    shin = d.get('shinines')
    rough = 0.9 if shin is None else max(0.35, min(1.0, 1.0 - shin))
    return dict(name=nm, base=base, normal=d.get('normalmap'), gloss=d.get('glossmap'),
                diffuse=tuple(d.get('diffuse') or (0.6, 0.6, 0.6))[:3], rough=rough, opacity=d.get('opacity', 1.0) or 1.0)


def multi_ids(pb_idx, n):
    try:
        c = sc.small(pb_idx)
        for k in c.ch or []:
            if k.t == 0x100E and not k.ch:
                b = bytes(k.d)
                pid, typ = struct.unpack_from('<HI', b, 0)
                if pid == 3 and typ == 0x801:
                    cnt = struct.unpack_from('<I', b, 15)[0]
                    return [struct.unpack_from('<I', b, 19 + 5 * j + 1)[0] for j in range(cnt)]
    except Exception as e:
        log('multi ids fail', e)
    return list(range(n))


def material_slots(midx):
    """-> (list of std info dicts, id list) for a node material (multi/sub aware)."""
    if midx is None:
        return [dict(name='Mat_default', base=None, normal=None, gloss=None, diffuse=(0.6, 0.6, 0.6), rough=0.9, opacity=1.0)], [0]
    if midx in MATCACHE:
        return MATCACHE[midx]
    g = sc.guid(midx)
    if g == 0x200:
        r = sc.refs(midx)
        ks = sorted(r)
        pb = r[ks[0]] if sc.clsname(r[ks[0]]) == 'ParamBlock2' else None
        subs = [r[k] for k in ks if r[k] != pb]
        infos = [std_info(s) for s in subs]
        ids = multi_ids(pb, len(infos)) if pb is not None else list(range(len(infos)))
        if len(ids) != len(infos):
            ids = list(range(len(infos)))
        res = (infos, ids)
    else:
        res = ([std_info(midx)], [0])
    MATCACHE[midx] = res
    return res


BLMAT = {}


# Web palette: similar tiling textures are consolidated (fewer materials/draw calls); one shared JPG per palette entry.
PALETTE = {'KB3D_BarkCharred': 'KB3D_BarkNew', 'KB3D_RockSmooth': 'KB3D_RockSharp', 'KB3D_Rope': 'KB3D_WoodHewn',
           'KB3D_blocksL': 'KB3D_stoneM', 'KB3D_rockM': 'KB3D_stoneM', 'KB3D_bricksM': 'KB3D_stoneM',
           'KB3D_wallM': 'KB3D_wallL', 'KB3D_sculptM': 'KB3D_pillarsM', 'KB3D_decoM': 'KB3D_pillarsM',
           'KB3D_floorDarkM': 'KB3D_floorM', 'KB3D_mudDarkM': 'KB3D_mudM', 'KB3D_damageM': 'KB3D_mudM', 'KB3D_damageL': 'KB3D_mudM'}
WEB_TEXDIR = args.get('webtex', '/Users/kelvingarciapr/AmazonaVerse/Juego/assets/models/edificios/tex')


def palette_tex(nm):
    """palette material name -> (shared tex file name, source diffuse path)."""
    if nm == 'canoa':
        return 'canoa.jpg', TEXFILES.get('canoa.jpg')
    for f, pth in TEXFILES.items():
        st = os.path.splitext(f)[0]
        if st.startswith(nm.lower() + '_') and re.search(r'_(diffuse|basecolor)$', st):
            return nm.lower() + '.jpg', pth
    return None, None


def bl_material(info):
    nm = info['name']
    if MODE == 'web':
        info = dict(info)
        nm = PALETTE.get(nm, nm)
        info['name'] = nm
        info['webtex'] = palette_tex(nm)[0] if info.get('base') else None
    if nm in BLMAT:
        return BLMAT[nm]
    m = bpy.data.materials.new(nm)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get('Principled BSDF')
    bsdf.inputs['Roughness'].default_value = info['rough']
    bsdf.inputs['Metallic'].default_value = 0.0
    col = info['diffuse']
    bsdf.inputs['Base Color'].default_value = (col[0], col[1], col[2], 1.0)
    if MODE == 'web' and info.get('webtex'):
        p = os.path.join(WEB_TEXDIR, info['webtex'])
        if os.path.exists(p):
            img = bpy.data.images.load(p, check_existing=True)
            tn = nt.nodes.new('ShaderNodeTexImage')
            tn.image = img
            nt.links.new(tn.outputs['Color'], bsdf.inputs['Base Color'])
    m['av_src'] = json.dumps(info)
    BLMAT[nm] = m
    return m


# ---------------------------------------------------------------- geometry
def param_block_values(pb_idx):
    """Old-style ParamBlock -> {index: value} (floats 0x100, ints 0x101)."""
    out = {}
    c = sc.small(pb_idx)
    for k in c.ch or []:
        if k.t == 0x2 and k.ch:
            i = v = None
            for kk in k.ch:
                if kk.t == 0x3:
                    i = struct.unpack_from('<I', kk.d, 0)[0]
                elif kk.t == 0x100 and len(kk.d) >= 4:
                    v = struct.unpack_from('<f', kk.d, 0)[0]
                elif kk.t == 0x101 and len(kk.d) >= 4:
                    v = struct.unpack_from('<i', kk.d, 0)[0]
            if i is not None:
                out[i] = v
    return out


def pb2_int(pb_idx, pid):
    c = sc.small(pb_idx)
    for k in c.ch or []:
        if k.t == 0x100E and not k.ch and len(k.d) >= 19:
            b = bytes(k.d)
            p, typ = struct.unpack_from('<HI', b, 0)
            if p == pid:
                return struct.unpack_from('<i', b, len(b) - 4)[0]
    return None


def box_mesh(base):
    pb = sc.refs(base).get(0)
    v = param_block_values(pb) if pb is not None else {}
    L, Wd, H = v.get(0, 10.0), v.get(1, 10.0), v.get(2, 10.0)
    x, y = Wd / 2.0, L / 2.0
    z0, z1 = (0.0, H) if H >= 0 else (H, 0.0)
    verts = np.array([[-x, -y, z0], [x, -y, z0], [x, y, z0], [-x, y, z0],
                      [-x, -y, z1], [x, -y, z1], [x, y, z1], [-x, y, z1]], np.float32)
    faces = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]
    fs = np.full(6, 4, np.int32)
    fi = np.array(sum(faces, []), np.int64)
    return dict(verts=verts, fs=fs, fi=fi, mat=np.array([1, 0, 4, 3, 5, 2], np.int32),
                uv=[], smooth=np.array([2, 4, 8, 16, 32, 64], np.uint32), box=(L, Wd, H))


def node_object_stack(node):
    ni = sc.node_info(node)
    obj = ni['obj']
    mods = []
    while obj is not None and int(sc.si.typ[obj]) in (0x2032, 0x2033):
        r = sc.refs(obj)
        ks = sorted(r)
        for kk in ks[:-1]:
            mods.append(r[kk])
        obj = r[ks[-1]]
    return obj, mods  # mods top-first


def decode_base(base):
    cls = sc.clsname(base)
    if cls == 'Box':
        return box_mesh(base)
    return sc.mesh(base)


def build_bl_mesh(name, md, mat_slots_ids, offset):
    """numpy mesh dict -> bpy mesh, with matIDs, UV ch1, smoothing groups."""
    infos, ids = mat_slots_ids
    verts = md['verts'].astype(np.float64)
    if offset is not None and not np.allclose(offset, np.eye(4)):
        vh = np.c_[verts, np.ones(len(verts))]
        verts = (vh @ np.array(offset).T)[:, :3]
    fs = md['fs'].astype(np.int64)
    fi = md['fi'].astype(np.int64)
    nv = len(verts)
    ok = (fi >= 0) & (fi < nv)
    if not ok.all():
        # drop faces referencing invalid verts
        bad_loop = ~ok
        face_of_loop = np.repeat(np.arange(len(fs)), fs)
        badf = np.unique(face_of_loop[bad_loop])
        keepf = np.ones(len(fs), bool)
        keepf[badf] = False
        keepl = keepf[face_of_loop]
        fi = fi[keepl]
        md = dict(md)
        md['mat'] = md['mat'][keepf] if md.get('mat') is not None else None
        md['smooth'] = md['smooth'][keepf] if md.get('smooth') is not None else None
        md['uv'] = [(c, crd, uvi[keepl]) for c, crd, uvi in md['uv']]
        fs = fs[keepf]
        log('  dropped faces with bad verts', len(badf))
    me = bpy.data.meshes.new(name)
    me.vertices.add(nv)
    me.vertices.foreach_set('co', verts.astype(np.float32).ravel())
    me.loops.add(len(fi))
    me.loops.foreach_set('vertex_index', fi.astype(np.int32))
    me.polygons.add(len(fs))
    ls = np.zeros(len(fs), np.int64)
    if len(fs) > 1:
        ls[1:] = np.cumsum(fs[:-1])
    me.polygons.foreach_set('loop_start', ls.astype(np.int32))
    # UV: prefer channel 1
    uvs = md.get('uv') or []
    ch = [u for u in uvs if u[0] == 1] or [u for u in uvs if u[0] >= 1] or uvs
    if ch:
        c, crd, uvi = ch[0]
        uvi = np.clip(uvi, 0, len(crd) - 1)
        uv = crd[uvi][:, :2].astype(np.float32)
        lay = me.uv_layers.new(name='UVMap')
        lay.data.foreach_set('uv', uv.ravel())
    # materials
    for inf in infos:
        me.materials.append(bl_material(inf))
    mat = md.get('mat')
    if mat is not None and len(infos) > 1:
        idmap = {v: i for i, v in enumerate(ids)}
        n = len(infos)
        mi = np.array([idmap.get(int(m), int(m) % n) for m in mat], np.int32) if len(mat) < 200000 else \
            np.vectorize(lambda m: idmap.get(int(m), int(m) % n))(mat).astype(np.int32)
        me.polygons.foreach_set('material_index', mi)
    me.update(calc_edges=True)
    # smoothing groups -> sharp edges / flat faces
    sm = md.get('smooth')
    if sm is not None and len(sm) == len(me.polygons):
        nl = len(me.loops)
        le = np.empty(nl, np.int32)
        me.loops.foreach_get('edge_index', le)
        lf = np.repeat(np.arange(len(fs)), fs).astype(np.int64)
        order = np.argsort(le, kind='stable')
        les, lfs = le[order], lf[order]
        sharp = np.zeros(len(me.edges), bool)
        # edges with exactly 2 adjacent faces
        same = les[1:] == les[:-1]
        idx = np.nonzero(same)[0]
        e = les[idx]
        f1, f2 = lfs[idx], lfs[idx + 1]
        s1, s2 = sm[f1], sm[f2]
        sharp_pair = (s1 & s2) == 0
        np.logical_or.at(sharp, e, sharp_pair)
        a = me.attributes.get('sharp_edge') or me.attributes.new('sharp_edge', 'BOOLEAN', 'EDGE')
        a.data.foreach_set('value', sharp)
        flat = (sm == 0)
        fa = me.attributes.get('sharp_face') or me.attributes.new('sharp_face', 'BOOLEAN', 'FACE')
        fa.data.foreach_set('value', flat)
    else:
        fa = me.attributes.get('sharp_face') or me.attributes.new('sharp_face', 'BOOLEAN', 'FACE')
        fa.data.foreach_set('value', np.zeros(len(me.polygons), bool))
    me.validate(clean_customdata=False)
    return me


def apply_uvw_map(obj, uvw_idx):
    r = sc.refs(uvw_idx)
    pb = r.get(1)
    v = param_block_values(pb) if pb is not None else {}
    mtype = v.get(0, 0)
    ut, vt, wt = v.get(1, 1.0) or 1.0, v.get(2, 1.0) or 1.0, v.get(3, 1.0) or 1.0
    L, Wd, H = abs(v.get(9, 1.0) or 1.0), abs(v.get(10, 1.0) or 1.0), abs(v.get(11, 1.0) or 1.0)
    G = sc.prs_matrix(r.get(0)) if r.get(0) is not None else np.eye(4)
    me = obj.data
    nv = len(me.vertices)
    co = np.empty(nv * 3, np.float32)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3).astype(np.float64)
    ctr = (co.min(0) + co.max(0)) / 2.0
    R = G[:3, :3]
    R = R / np.maximum(np.linalg.norm(R, axis=0), 1e-9)
    g = (co - ctr) @ R  # gizmo space
    nl = len(me.loops)
    lv = np.empty(nl, np.int32)
    me.loops.foreach_get('vertex_index', lv)
    npoly = len(me.polygons)
    nrm = np.empty(npoly * 3, np.float32)
    me.polygons.foreach_get('normal', nrm)
    nrm = (nrm.reshape(-1, 3) @ R)
    ls = np.empty(npoly, np.int32)
    lt = np.empty(npoly, np.int32)
    me.polygons.foreach_get('loop_start', ls)
    me.polygons.foreach_get('loop_total', lt)
    lf = np.repeat(np.arange(npoly), lt)
    p = g[lv]
    n = nrm[lf]
    u = np.zeros(nl)
    w = np.zeros(nl)
    if mtype == 4:  # box
        ax = np.argmax(np.abs(n), axis=1)
        sx = np.sign(n[np.arange(nl), ax])
        u = np.where(ax == 0, -sx * p[:, 1] / L, np.where(ax == 1, sx * p[:, 0] / Wd, sx * p[:, 0] / Wd))
        w = np.where(ax == 2, p[:, 1] / L, p[:, 2] / H)
    else:  # planar along gizmo Z
        u = p[:, 0] / Wd
        w = p[:, 1] / L
    uv = np.c_[(u + 0.5) * ut, (w + 0.5) * vt].astype(np.float32)
    lay = me.uv_layers.get('UVMap') or me.uv_layers.new(name='UVMap')
    lay.data.foreach_set('uv', uv.ravel())


def apply_mods(obj, mods):
    """mods: top-first list of modifier scene idx. Apply base-up."""
    for mi in reversed(mods):
        cn = sc.clsname(mi)
        if cn == 'TurboSmooth':
            pb = sc.refs(mi).get(0)
            it = pb2_int(pb, 0) if pb is not None else 1
            it = max(1, min(int(it or 1), 2 if MODE == 'faithful' else 1))
            m = obj.modifiers.new('ts', 'SUBSURF')
            m.levels = it
            m.render_levels = it
            m.uv_smooth = 'PRESERVE_BOUNDARIES'
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.modifier_apply(modifier=m.name)
        elif cn == 'UVW Map':
            apply_uvw_map(obj, mi)
        else:
            log('  modifier not replicated:', cn)


def clear_scene():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.collections):
        for d in list(coll):
            if d.users == 0 or coll is not bpy.data.collections:
                try:
                    coll.remove(d)
                except Exception:
                    pass
    BLMAT.clear()
    gc.collect()


C4 = np.array([[1, 0, 0, 0], [0, 0, 1, 0], [0, -1, 0, 0], [0, 0, 0, 1]], float)  # Z-up -> Y-up


def build_asset(aid):
    a = ASSETS[aid]
    meshcache = {}
    objs = []
    S = np.diag([UNIT, UNIT, UNIT, 1.0])
    for m in a['members']:
        node = m['node']
        base, mods = node_object_stack(node)
        if base is None:
            continue
        key = (base, tuple(np.round(np.array(m['offset']).ravel(), 5)), tuple(mods))
        slots = material_slots(m['mtl'])
        if key in meshcache:
            me = meshcache[key]
        else:
            md = decode_base(base)
            if md is None:
                log('  skip undecodable', m['name'], sc.clsname(base))
                continue
            me = build_bl_mesh(m['name'], md, slots, np.array(m['offset']))
            del md
            if mods:
                tmp = bpy.data.objects.new('tmp', me)
                bpy.context.scene.collection.objects.link(tmp)
                apply_mods(tmp, mods)
                me = tmp.data
                bpy.data.objects.remove(tmp, do_unlink=True)
            meshcache[key] = me
        o = bpy.data.objects.new(re.sub(r'\.\d+$', '', m['name']), me)
        bpy.context.scene.collection.objects.link(o)
        L = np.array(m['local'])
        Mw = S @ L
        o.matrix_world = [list(r) for r in Mw]
        objs.append(o)
        check_mem(MEMLIM)
    return objs


def tri_count(objs):
    t = 0
    for o in objs:
        me = o.data
        lt = np.empty(len(me.polygons), np.int32)
        me.polygons.foreach_get('loop_total', lt)
        t += int((lt - 2).sum())
    return t


# ---------------------------------------------------------------- faithful export
def export_glb(path, image_format):
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_image_format=image_format,
                              export_materials='EXPORT', export_normals=True, export_texcoords=True,
                              export_tangents=False, export_apply=True, export_yup=True,
                              export_animations=False, export_skins=False, export_morph=False,
                              export_cameras=False, export_lights=False, export_extras=False,
                              use_selection=False, will_save_settings=False)


def read_glb(path):
    b = open(path, 'rb').read()
    magic, ver, length = struct.unpack_from('<III', b, 0)
    jl, jt = struct.unpack_from('<II', b, 12)
    js = json.loads(b[20:20 + jl].decode('utf-8'))
    rest = b[20 + jl:]
    return js, rest


def write_glb(path, js, rest):
    jb = json.dumps(js, separators=(',', ':')).encode('utf-8')
    jb += b' ' * ((4 - len(jb) % 4) % 4)
    total = 12 + 8 + len(jb) + len(rest)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total))
        f.write(struct.pack('<II', len(jb), 0x4E4F534A))
        f.write(jb)
        f.write(rest)


def inject_texture_uris(path):
    """Add images/textures with relative URIs to the ORIGINAL texture files."""
    js, rest = read_glb(path)
    outdir = os.path.dirname(path)
    images, textures = [], []
    imgidx = {}

    def tex_for(fname):
        if not fname:
            return None
        p = TEXFILES.get(fname.lower())
        if p is None:
            return None
        if p not in imgidx:
            rel = os.path.relpath(p, outdir).replace(os.sep, '/')
            images.append({'uri': urllib.parse.quote(rel), 'name': os.path.splitext(os.path.basename(p))[0]})
            textures.append({'source': len(images) - 1, 'sampler': 0})
            imgidx[p] = len(textures) - 1
        return imgidx[p]

    missing = set()
    for mat in js.get('materials', []):
        info = None
        bm = bpy.data.materials.get(mat.get('name', ''))
        if bm is not None and 'av_src' in bm:
            info = json.loads(bm['av_src'])
        if not info:
            continue
        t = tex_for(info.get('base'))
        if t is not None:
            pbr = mat.setdefault('pbrMetallicRoughness', {})
            pbr['baseColorTexture'] = {'index': t}
            pbr['baseColorFactor'] = [1, 1, 1, 1]
        elif info.get('base'):
            missing.add(info['base'])
        t = tex_for(info.get('normal'))
        if t is not None:
            mat['normalTexture'] = {'index': t, 'scale': 1.0}
        mat.setdefault('extras', {})
        if info.get('gloss'):
            mat['extras']['glossMap_original'] = info['gloss']
    if images:
        js['images'] = images
        js['textures'] = textures
        js['samplers'] = [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}]
    write_glb(path, js, rest)
    return sorted(missing), len(images)


# ---------------------------------------------------------------- web optimisation
def island_labels(me):
    nv = len(me.vertices)
    ev = np.empty(len(me.edges) * 2, np.int64)
    me.edges.foreach_get('vertices', ev)
    ev = ev.reshape(-1, 2)
    lab = np.arange(nv)
    for _ in range(2000):
        a, b = lab[ev[:, 0]], lab[ev[:, 1]]
        m = np.minimum(a, b)
        new = lab.copy()
        np.minimum.at(new, ev[:, 0], m)
        np.minimum.at(new, ev[:, 1], m)
        new = new[new]  # pointer jumping
        if np.array_equal(new, lab):
            break
        lab = new
    return lab


def logfit(o, sides=8, min_elong=4.0, budget=4900, share=0.5):
    """Retopo: replace elongated islands (logs/stakes) by fitted low-poly prisms with a pointed tip."""
    import bmesh
    me = o.data
    nv = len(me.vertices)
    co = np.empty(nv * 3, np.float32)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3).astype(np.float64)
    lab = island_labels(me)
    npoly = len(me.polygons)
    lt = np.empty(npoly, np.int32); ls = np.empty(npoly, np.int32); mi = np.empty(npoly, np.int32)
    me.polygons.foreach_get('loop_total', lt); me.polygons.foreach_get('loop_start', ls); me.polygons.foreach_get('material_index', mi)
    lv = np.empty(len(me.loops), np.int32)
    me.loops.foreach_get('vertex_index', lv)
    face_lab = lab[lv[ls]]
    logs = []
    remove_faces = np.zeros(npoly, bool)
    for L in np.unique(lab):
        idx = np.nonzero(lab == L)[0]
        if len(idx) < 12:
            continue
        P = co[idx]
        c = P.mean(0)
        u, sv, vt = np.linalg.svd(P - c, full_matrices=False)
        ax = vt[0]
        t = (P - c) @ ax
        tmin, tmax = t.min(), t.max()
        Ln = tmax - tmin
        rad_vec = (P - c) - np.outer(t, ax)
        r = np.linalg.norm(rad_vec, axis=1)
        mid = (t > tmin + 0.2 * Ln) & (t < tmax - 0.2 * Ln)
        R = float(np.percentile(r[mid] if mid.sum() > 5 else r, 75))
        if R <= 0 or Ln / (2 * R) < min_elong:
            continue
        lo = r[t < tmin + 0.08 * Ln].max(initial=0)
        hi = r[t > tmax - 0.08 * Ln].max(initial=0)
        tip_at_max = None
        if hi < 0.6 * R and lo > hi:
            tip_at_max = True
        elif lo < 0.6 * R and hi > lo:
            tip_at_max = False
        fm = mi[face_lab == L]
        mat = int(np.bincount(fm).argmax()) if len(fm) else 0
        logs.append((c, ax, tmin, tmax, R, tip_at_max, mat))
        remove_faces |= (face_lab == L)
    if not logs:
        return 0
    allowed = share * budget / len(logs)
    sides = int(min(8, (allowed + 2) // 4))
    if sides < 5:
        log('  logfit skipped: too many logs', len(logs))
        return 0
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.faces[i] for i in np.nonzero(remove_faces)[0]], context='FACES')
    uvl = bm.loops.layers.uv.active or bm.loops.layers.uv.new('UVMap')
    for (c, ax, tmin, tmax, R, tip, mat) in logs:
        if tip is False:
            ax = -ax; tmin, tmax = -tmax, -tmin
        a0 = np.cross(ax, [0, 0, 1.0])
        if np.linalg.norm(a0) < 1e-3:
            a0 = np.cross(ax, [1.0, 0, 0])
        a0 /= np.linalg.norm(a0)
        a1 = np.cross(ax, a0)
        Ln = tmax - tmin
        ttip = tmax - min(0.15 * Ln, 4 * R) if tip is not None else tmax
        ring = lambda tt: [bm.verts.new(c + ax * tt + R * (math.cos(2 * math.pi * k / sides) * a0 + math.sin(2 * math.pi * k / sides) * a1)) for k in range(sides)]
        r0 = ring(tmin); r1 = ring(ttip)
        circ = 2 * math.pi * R
        for k in range(sides):
            k2 = (k + 1) % sides
            f = bm.faces.new((r0[k], r0[k2], r1[k2], r1[k]))
            f.material_index = mat
            u0, u1 = k / sides, (k + 1) / sides
            v0, v1 = 0.0, (ttip - tmin) / circ
            for lp, uv in zip(f.loops, ((u0, v0), (u1, v0), (u1, v1), (u0, v1))):
                lp[uvl].uv = uv
        if tip is not None:
            apex = bm.verts.new(c + ax * tmax)
            for k in range(sides):
                k2 = (k + 1) % sides
                f = bm.faces.new((r1[k], r1[k2], apex))
                f.material_index = mat
                vt0 = (ttip - tmin) / circ
                for lp, uv in zip(f.loops, ((k / sides, vt0), ((k + 1) / sides, vt0), ((k + 0.5) / sides, vt0 + (tmax - ttip) / circ))):
                    lp[uvl].uv = uv
        else:
            f = bm.faces.new(list(reversed(r1)))
            f.material_index = mat
        f = bm.faces.new(r0[::-1])
        f.material_index = mat
    bm.to_mesh(me)
    bm.free()
    me.update()
    return len(logs)


def _islands(bm):
    """Connected face islands (through shared edges). Uses BMesh tags, not indices (indices can be dirty)."""
    for f in bm.faces:
        f.tag = False
    out = []
    for f in bm.faces:
        if f.tag:
            continue
        f.tag = True
        stack = [f]
        comp = []
        while stack:
            g = stack.pop()
            comp.append(g)
            for e in g.edges:
                for h in e.link_faces:
                    if not h.tag:
                        h.tag = True
                        stack.append(h)
        area = sum(g.calc_area() for g in comp)
        out.append((area, sum(len(g.verts) - 2 for g in comp), comp))
    return out


def _collapse_until(o, budget, tag):
    if args.get('dbgc'):
        import bmesh
        bm = bmesh.new(); bm.from_mesh(o.data)
        log('  dbgc', o.name, 'tris', tri_count([o]), 'verts', len(bm.verts), 'boundary', sum(1 for e in bm.edges if e.is_boundary),
            'nonmanifold', sum(1 for e in bm.edges if not e.is_manifold), 'wire', sum(1 for e in bm.edges if e.is_wire), 'mods', [m.type for m in o.modifiers],
            'users', o.data.users, 'shapekeys', bool(o.data.shape_keys), 'attrs', [a.name for a in o.data.attributes])
        bm.free()
    for it in range(6):
        t = tri_count([o])
        if t <= budget:
            return t
        m = o.modifiers.new('%s%d' % (tag, it), 'DECIMATE')
        m.decimate_type = 'COLLAPSE'
        m.ratio = max(0.005, budget / t * 0.97)
        m.use_collapse_triangulate = True
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier=m.name)
        if tri_count([o]) > t * 0.97:
            break
    return tri_count([o])


def enforce_budget(o, budget, protect=0.25):
    """Collapse; when it stalls (many small islands) delete the smallest islands, never the biggest ones,
    then collapse again what is left."""
    import bmesh
    for rnd in range(4):
        t = _collapse_until(o, budget, 'dc%d_' % rnd)
        if t <= budget:
            return
        bm = bmesh.new()
        bm.from_mesh(o.data)
        isl = sorted(_islands(bm), key=lambda x: x[0])   # ascending by surface area
        tot_area = sum(x[0] for x in isl) or 1.0
        nprot = max(1, int(len(isl) * protect))
        kill = []
        for area, tris, comp in isl[:len(isl) - nprot]:
            if t <= budget or area > 0.015 * tot_area:
                break
            kill.extend(comp)
            t -= tris
        if kill:
            bmesh.ops.delete(bm, geom=kill, context='FACES')
            bm.to_mesh(o.data)
            o.data.update()
        bm.free()
        log('  removed small islands:', len(kill), 'faces ->', tri_count([o]))
        if not kill:
            break
    t = tri_count([o])
    if t > budget:
        m = o.modifiers.new('dcf', 'DECIMATE')
        m.decimate_type = 'COLLAPSE'
        m.ratio = max(0.005, budget / t * 0.95)
        m.use_collapse_triangulate = True
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier=m.name)
    if tri_count([o]) > budget:
        # last resort: keep the biggest islands that fit in the budget
        bm = bmesh.new()
        bm.from_mesh(o.data)
        isl = sorted(_islands(bm), key=lambda x: -x[0])
        acc, kill = 0, []
        for n_, (diag, tris, comp) in enumerate(isl):
            if n_ == 0 or acc + tris <= budget:
                acc += tris
            else:
                kill.extend(comp)
        bmesh.ops.delete(bm, geom=kill, context='FACES')
        bm.to_mesh(o.data)
        o.data.update()
        bm.free()
        log('  kept biggest islands ->', tri_count([o]))
        t = tri_count([o])
        if t > budget:
            m = o.modifiers.new('dcz', 'DECIMATE')
            m.decimate_type = 'COLLAPSE'
            m.ratio = max(0.005, budget / t * 0.9)
            m.use_collapse_triangulate = True
            bpy.context.view_layer.objects.active = o
            bpy.ops.object.modifier_apply(modifier=m.name)


def remesh_optimize(objs, budget, res):
    """Architecture retopo (Ancient kit): voxel remesh closes the thousands of small holes/blocks that stall the
    collapse decimator, then planar + collapse to budget. Materials come from the nearest original face and UVs
    are a world-space box projection (the palette textures tile), so the look stays coherent."""
    import bmesh, mathutils
    from mathutils.bvhtree import BVHTree
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    src = bpy.context.view_layer.objects.active
    co = np.array([v.co[:] for v in src.data.vertices])
    mn0, mx0 = co.min(0), co.max(0)
    size = float((mx0 - mn0).max())
    dst = src.copy()
    dst.data = src.data.copy()
    bpy.context.scene.collection.objects.link(dst)
    vsz = VOXEL_M if VOXEL_M > 0 else ((res / 1000.0) if res >= 20 and res < 1000 and VOXEL_ABS else max(0.05, size / res))
    # open shells (single-sided walls, slabs) vanish in a voxel remesh: give everything thickness first
    sd = dst.modifiers.new('sd', 'SOLIDIFY')
    sd.thickness = vsz * 1.5
    sd.offset = 0.0
    sd.use_even_offset = False
    bpy.context.view_layer.objects.active = dst
    bpy.ops.object.modifier_apply(modifier=sd.name)
    rm = dst.modifiers.new('vx', 'REMESH')
    rm.mode = 'VOXEL'
    rm.voxel_size = vsz
    rm.use_smooth_shade = False
    bpy.context.view_layer.objects.active = dst
    bpy.ops.object.modifier_apply(modifier=rm.name)
    log('  remesh voxel %.3f m -> %d tris' % (vsz, tri_count([dst])))
    check_mem(MEMLIM)
    m = dst.modifiers.new('pl', 'DECIMATE')
    m.decimate_type = 'DISSOLVE'
    m.angle_limit = math.radians(RM_PLANAR)
    bpy.ops.object.modifier_apply(modifier=m.name)
    log('  planar -> %d tris' % tri_count([dst]))
    enforce_budget(dst, budget)
    # materials from nearest original face
    dg = bpy.context.evaluated_depsgraph_get()
    bvh = BVHTree.FromObject(src, dg)
    smi = np.empty(len(src.data.polygons), np.int32)
    src.data.polygons.foreach_get('material_index', smi)
    me = dst.data
    me.materials.clear()
    for mt in src.data.materials:
        me.materials.append(mt)
    n = len(me.polygons)
    cen = np.empty(n * 3, np.float32); me.polygons.foreach_get('center', cen); cen = cen.reshape(-1, 3)
    mi = np.zeros(n, np.int32)
    for i in range(n):
        hit = bvh.find_nearest(mathutils.Vector(cen[i]))
        if hit[2] is not None:
            mi[i] = smi[hit[2]]
    me.polygons.foreach_set('material_index', mi)
    # world-space box-projection UVs, 3 m per texture tile
    nl = len(me.loops)
    lv = np.empty(nl, np.int32); me.loops.foreach_get('vertex_index', lv)
    vco = np.empty(len(me.vertices) * 3, np.float32); me.vertices.foreach_get('co', vco); vco = vco.reshape(-1, 3)
    nrm = np.empty(n * 3, np.float32); me.polygons.foreach_get('normal', nrm); nrm = nrm.reshape(-1, 3)
    lt = np.empty(n, np.int32); me.polygons.foreach_get('loop_total', lt)
    lf = np.repeat(np.arange(n), lt)
    ax = np.argmax(np.abs(nrm), axis=1)[lf]
    p = vco[lv] / 3.0
    u = np.where(ax == 0, p[:, 1], p[:, 0])
    v = np.where(ax == 2, p[:, 1], p[:, 2])
    lay = me.uv_layers.get('UVMap') or me.uv_layers.new(name='UVMap')
    lay.data.foreach_set('uv', np.c_[u, v].astype(np.float32).ravel())
    me.update()
    bpy.data.objects.remove(src, do_unlink=True)
    o = dst
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    try:
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(30))
    except Exception as e:
        log('smooth by angle failed', e)
    co = np.empty(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    mn, mx = co.min(0), co.max(0)
    shift = np.array([(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, mn[2]])
    co -= shift
    me.vertices.foreach_set('co', co.ravel())
    me.update()
    bpy.ops.object.material_slot_remove_unused()
    return o, tri_count([o]), (mx - mn).tolist(), shift.tolist()


def part_remesh(o, backup, target):
    """A part the collapse decimator cannot reduce (holes / coincident shells): voxel-remesh a copy of the
    original part, then planar + collapse; keep it only if the remesh did not lose the part's surface."""
    import mathutils
    from mathutils.bvhtree import BVHTree
    src = bpy.data.objects.new('src_tmp', backup)
    bpy.context.scene.collection.objects.link(src)
    src.matrix_world = o.matrix_world.copy()
    co = np.array([v.co[:] for v in backup.vertices])
    size = float((co.max(0) - co.min(0)).max()) if len(co) else 1.0
    area0 = sum(p.area for p in backup.polygons)
    for vs in (min(0.25, max(0.05, size / 90.0)), max(0.03, size / 260.0)):
        dst = src.copy(); dst.data = backup.copy()
        bpy.context.scene.collection.objects.link(dst)
        rm = dst.modifiers.new('vx', 'REMESH'); rm.mode = 'VOXEL'
        rm.voxel_size = vs
        bpy.context.view_layer.objects.active = dst
        bpy.ops.object.modifier_apply(modifier=rm.name)
        area1 = sum(p.area for p in dst.data.polygons)
        ok = len(dst.data.polygons) > 0 and area1 > 0.35 * area0
        if ok:
            break
        dme0 = dst.data
        bpy.data.objects.remove(dst, do_unlink=True)
        if dme0.users == 0:
            bpy.data.meshes.remove(dme0)
        dst = src.copy(); dst.data = backup.copy()
        bpy.context.scene.collection.objects.link(dst)
    if ok:
        m = dst.modifiers.new('pl', 'DECIMATE'); m.decimate_type = 'DISSOLVE'; m.angle_limit = math.radians(3.0)
        bpy.ops.object.modifier_apply(modifier=m.name)
        _collapse_until(dst, target, 'pr')
        ok = tri_count([dst]) <= 1.3 * target
    if ok:
        dg = bpy.context.evaluated_depsgraph_get()
        bvh = BVHTree.FromObject(src, dg)
        smi = np.empty(len(backup.polygons), np.int32); backup.polygons.foreach_get('material_index', smi)
        me = dst.data
        me.materials.clear()
        for mt in backup.materials:
            me.materials.append(mt)
        n = len(me.polygons)
        cen = np.empty(n * 3, np.float32); me.polygons.foreach_get('center', cen); cen = cen.reshape(-1, 3)
        mi = np.zeros(n, np.int32)
        for i in range(n):
            hit = bvh.find_nearest(mathutils.Vector(cen[i]))
            if hit[2] is not None:
                mi[i] = smi[hit[2]]
        me.polygons.foreach_set('material_index', mi)
        nl = len(me.loops)
        lv = np.empty(nl, np.int32); me.loops.foreach_get('vertex_index', lv)
        vco = np.empty(len(me.vertices) * 3, np.float32); me.vertices.foreach_get('co', vco); vco = vco.reshape(-1, 3)
        nrm = np.empty(n * 3, np.float32); me.polygons.foreach_get('normal', nrm); nrm = nrm.reshape(-1, 3)
        lt = np.empty(n, np.int32); me.polygons.foreach_get('loop_total', lt)
        lf = np.repeat(np.arange(n), lt)
        ax = np.argmax(np.abs(nrm), axis=1)[lf]
        p = vco[lv] / 3.0
        u = np.where(ax == 0, p[:, 1], p[:, 0]); v = np.where(ax == 2, p[:, 1], p[:, 2])
        lay = me.uv_layers.get('UVMap') or me.uv_layers.new(name='UVMap')
        lay.data.foreach_set('uv', np.c_[u, v].astype(np.float32).ravel())
        old = o.data
        o.data = me
        bpy.data.meshes.remove(old)
        log('  part remesh', o.name, '->', tri_count([o]), 'tris')
    else:
        log('  part remesh rejected', o.name)
    dme = dst.data
    for ob in (src, dst):
        try:
            bpy.data.objects.remove(ob, do_unlink=True)
        except ReferenceError:
            pass
    if dme is not None and dme.users == 0 and dme is not o.data:
        bpy.data.meshes.remove(dme)


def boxfit_optimize(objs, budget):
    """Blockout retopo for the big Ancient temples: every connected block becomes its axis-aligned box
    (12 tris) in the asset frame; the biggest blocks are kept until the budget is used. Box-projected UVs
    (3 m tiles) and the block's dominant palette material keep the look."""
    import bmesh
    boxes = []
    mats = []
    for o in objs:
        me = o.data
        nv = len(me.vertices)
        if nv == 0:
            continue
        co = np.empty(nv * 3, np.float32); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
        lab = island_labels(me)
        npoly = len(me.polygons)
        ls = np.empty(npoly, np.int32); me.polygons.foreach_get('loop_start', ls)
        mi = np.empty(npoly, np.int32); me.polygons.foreach_get('material_index', mi)
        lv = np.empty(len(me.loops), np.int32); me.loops.foreach_get('vertex_index', lv)
        flab = lab[lv[ls]]
        order = np.argsort(lab, kind='stable')
        ul, starts = np.unique(lab[order], return_index=True)
        ends = np.r_[starts[1:], len(order)]
        for L, a, b in zip(ul, starts, ends):
            P = co[order[a:b]]
            mn, mx = P.min(0), P.max(0)
            ext = mx - mn
            if ext.max() <= 1e-4:
                continue
            fm = mi[flab == L]
            m = me.materials[int(np.bincount(fm).argmax())] if len(fm) and len(me.materials) else None
            if m not in mats:
                mats.append(m)
            imp = float(np.sort(ext)[-1] * np.sort(ext)[-2])   # biggest face area of the box
            boxes.append((imp, mn, mx, mats.index(m)))
    for o in objs:
        bpy.data.objects.remove(o, do_unlink=True)
    boxes.sort(key=lambda x: -x[0])
    seen = set()
    keep = []
    for imp, mn, mx, k in boxes:
        key = tuple(np.round(np.r_[mn, mx], 2))
        if key in seen:
            continue
        seen.add(key)
        keep.append((mn, mx, k))
        if len(keep) * 12 >= budget - 12:
            break
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    F = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    for mn, mx, k in keep:
        vs = [bm.verts.new((mx[0] if i & 1 else mn[0], mx[1] if i & 2 else mn[1], mx[2] if i & 4 else mn[2])) for i in range(8)]
        for q in F:
            try:
                f = bm.faces.new([vs[i] for i in q])
            except ValueError:
                continue
            f.material_index = k
            f.normal_update()
            n = f.normal
            ax = int(np.argmax(np.abs([n.x, n.y, n.z])))
            for lp in f.loops:
                c = lp.vert.co
                u = (c.y if ax == 0 else c.x) / 3.0
                v = (c.y if ax == 2 else c.z) / 3.0
                lp[uvl].uv = (u, v)
    me = bpy.data.meshes.new('boxfit')
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    o = bpy.data.objects.new('boxfit', me)
    bpy.context.scene.collection.objects.link(o)
    a = me.attributes.get('sharp_face') or me.attributes.new('sharp_face', 'BOOLEAN', 'FACE')
    a.data.foreach_set('value', np.ones(len(me.polygons), bool))
    co = np.empty(len(me.vertices) * 3, np.float32); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    mn, mx = co.min(0), co.max(0)
    shift = np.array([(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, mn[2]])
    co -= shift
    me.vertices.foreach_set('co', co.ravel())
    me.update()
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    log('  boxfit: %d blocks of %d -> %d tris' % (len(keep), len(boxes), tri_count([o])))
    return o, tri_count([o]), (mx - mn).tolist(), shift.tolist()


def web_optimize(objs, budget, drop=(), logparts=(), logshare=0.5, remesh=0, boxfit=False):
    """Drop tiny/rope/debris parts, join, decimate to budget tris."""
    import bmesh
    # world-space bbox diag per object
    def diag(o):
        bb = np.array([o.matrix_world @ __import__('mathutils').Vector(c) for c in o.bound_box])
        return float(np.linalg.norm(bb.max(0) - bb.min(0))), bb
    allbb = np.vstack([diag(o)[1] for o in objs])
    D = float(np.linalg.norm(allbb.max(0) - allbb.min(0)))
    keep = []
    for o in objs:
        d, _ = diag(o)
        n = o.name.lower()
        if ('debris' in n or 'lashing' in n) and len(objs) > 2:
            continue
        if any(x in n for x in drop):
            continue
        if d < 0.04 * D and len(objs) > 2:
            continue
        keep.append(o)
    for o in objs:
        if o not in keep:
            bpy.data.objects.remove(o, do_unlink=True)
    objs = keep
    # make single-user + apply transforms, then join
    for o in objs:
        o.data = o.data.copy()
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for o in objs:
        bm = bmesh.new()
        bm.from_mesh(o.data)
        if WELD:
            bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.002)
        # clean: degenerate faces and duplicated faces (coincident shells block the collapse decimator)
        bmesh.ops.dissolve_degenerate(bm, dist=0.0005, edges=bm.edges[:])
        bm.verts.index_update()
        seenf, dup = set(), []
        for f in bm.faces:
            key = frozenset(v.index for v in f.verts)
            if key in seenf:
                dup.append(f)
            else:
                seenf.add(key)
        if dup:
            bmesh.ops.delete(bm, geom=dup, context='FACES_ONLY')
        bm.to_mesh(o.data)
        bm.free()
    if remesh:
        return remesh_optimize(objs, budget, remesh)
    if boxfit:
        return boxfit_optimize(objs, budget)
    for o in objs:
        if any(x in o.name.lower() for x in logparts):
            n = logfit(o, budget=budget, share=logshare)
            log('  logfit', o.name, n, 'logs ->', tri_count([o]), 'tris')
    # per-part decimation weighted by size; ropes get less
    tot = tri_count(objs)
    weights = []
    for o in objs:
        d, _ = diag(o)
        w = d * d
        if 'lashing' in o.name.lower() or 'rope' in o.name.lower():
            w *= 0.25
        weights.append(w)
    sw = sum(weights) or 1.0
    for o, w in zip(objs, weights):
        t = tri_count([o])
        target = max(60, int(budget * 0.97 * w / sw))
        backup = o.data.copy() if (PART_REMESH and t > target) else None
        if t > target and PLANAR:
            bpy.context.view_layer.objects.active = o
            m = o.modifiers.new('pl', 'DECIMATE')
            m.decimate_type = 'DISSOLVE'
            m.angle_limit = math.radians(PLANAR_DEG)
            m.delimit = {'MATERIAL'} if PLANAR_DEG > 5 else {'UV', 'MATERIAL'}
            bpy.ops.object.modifier_apply(modifier=m.name)
        t2 = tri_count([o])
        if t2 > target:
            _collapse_until(o, target, 'pc')
        if backup is not None and tri_count([o]) > 1.3 * target:
            part_remesh(o, backup, target)
        if backup is not None and backup.users == 0:
            bpy.data.meshes.remove(backup)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    enforce_budget(o, budget)
    try:
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(40))
    except Exception as e:
        log('smooth by angle failed', e)
    # pivot: bottom-centre at origin
    me = o.data
    co = np.empty(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    mn, mx = co.min(0), co.max(0)
    shift = np.array([(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, mn[2]])
    co -= shift
    me.vertices.foreach_set('co', co.ravel())
    me.update()
    # smooth by sharp edges already set; remove unused material slots
    bpy.ops.object.material_slot_remove_unused()
    return o, tri_count([o]), (mx - mn).tolist(), shift.tolist()


def inject_web_textures(path):
    js, rest = read_glb(path)
    images, textures, idx = [], [], {}
    for mat in js.get('materials', []):
        bm = bpy.data.materials.get(mat.get('name', ''))
        info = json.loads(bm['av_src']) if bm is not None and 'av_src' in bm else {}
        pbr = mat.setdefault('pbrMetallicRoughness', {})
        pbr['metallicFactor'] = 0.0
        pbr['roughnessFactor'] = 0.9
        tf = info.get('webtex')
        if tf:
            if tf not in idx:
                images.append({'uri': 'tex/' + tf, 'name': os.path.splitext(tf)[0]})
                textures.append({'source': len(images) - 1, 'sampler': 0})
                idx[tf] = len(textures) - 1
            pbr['baseColorTexture'] = {'index': idx[tf]}
            pbr['baseColorFactor'] = [1, 1, 1, 1]
            nf = os.path.splitext(tf)[0] + '_n.jpg'
            if os.path.exists(os.path.join(WEB_TEXDIR, nf)):
                if nf not in idx:
                    images.append({'uri': 'tex/' + nf, 'name': os.path.splitext(nf)[0]})
                    textures.append({'source': len(images) - 1, 'sampler': 0})
                    idx[nf] = len(textures) - 1
                mat['normalTexture'] = {'index': idx[nf]}
        mat.pop('extensions', None)
    js.pop('extensionsUsed', None)
    if images:
        js['images'] = images
        js['textures'] = textures
        js['samplers'] = [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}]
    write_glb(path, js, rest)


def write_js(path, key):
    import base64
    b = open(path, 'rb').read()
    js = '(window.AV_EDIFICIOS_B64=window.AV_EDIFICIOS_B64||{})["%s"]="%s";\n' % (key, base64.b64encode(b).decode('ascii'))
    jp = path[:-4] + '_glb.js'
    open(jp, 'w').write(js)
    return len(b), os.path.getsize(jp)


TEXPIX = {}


def tex_small(tf, n=64):
    if tf in TEXPIX:
        return TEXPIX[tf]
    img = bpy.data.images.load(os.path.join(WEB_TEXDIR, tf), check_existing=True)
    w, h = img.size
    px = np.array(img.pixels[:], np.float32).reshape(h, w, 4)[:, :, :3]
    f = max(1, w // n)
    sm = px[:h // f * f, :w // f * f].reshape(h // f, f, w // f, f, 3).mean((1, 3))
    TEXPIX[tf] = sm
    return sm


def make_lejos(o, name, tris0):
    """Far LOD: <=25 % and <=600 tris, one vertex-coloured material (AV_Lejos), same pivot."""
    lo = o.copy()
    lo.data = o.data.copy()
    bpy.context.scene.collection.objects.link(lo)
    target = max(12, min(600, int(tris0 * 0.25)))
    import bmesh
    co = np.array([v.co[:] for v in lo.data.vertices])
    diag = float(np.linalg.norm(co.max(0) - co.min(0))) if len(co) else 1.0
    bm = bmesh.new()
    bm.from_mesh(lo.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.01 * diag)
    bm.to_mesh(lo.data)
    bm.free()
    enforce_budget(lo, target, protect=0.4)
    if tri_count([lo]) > target:
        # stuck (many welded blocks): voxel remesh + collapse; colour falls back to the dominant material
        areas = mat_areas(lo)
        dom = int(np.argmax(areas)) if len(areas) else 0
        rm = lo.modifiers.new('vx', 'REMESH')
        rm.mode = 'VOXEL'
        rm.voxel_size = diag / 45.0
        bpy.context.view_layer.objects.active = lo
        bpy.ops.object.modifier_apply(modifier=rm.name)
        _collapse_until(lo, target, 'vxd')
        lo.data.polygons.foreach_set('material_index', np.full(len(lo.data.polygons), dom, np.int32))
        log('  lejos via voxel remesh ->', tri_count([lo]))
    me = lo.data
    # vertex colour from the (downsampled) shared texture of each face's material
    nl = len(me.loops)
    npoly = len(me.polygons)
    lt = np.empty(npoly, np.int32); mi = np.empty(npoly, np.int32)
    me.polygons.foreach_get('loop_total', lt); me.polygons.foreach_get('material_index', mi)
    lmat = np.repeat(mi, lt)
    uv = np.zeros((nl, 2), np.float32)
    if me.uv_layers.active:
        me.uv_layers.active.data.foreach_get('uv', uv.ravel())
    col = np.ones((nl, 4), np.float32)
    for k, m in enumerate(me.materials):
        sel = lmat == k
        if not sel.any() or m is None:
            continue
        info = json.loads(m['av_src']) if 'av_src' in m else {}
        tf = info.get('webtex')
        if tf:
            sm = tex_small(tf)
            hh, ww = sm.shape[:2]
            u = np.mod(uv[sel, 0], 1.0); v = np.mod(uv[sel, 1], 1.0)
            col[sel, :3] = sm[np.clip((v * hh).astype(int), 0, hh - 1), np.clip((u * ww).astype(int), 0, ww - 1)]
        else:
            d = info.get('diffuse', (0.6, 0.6, 0.6))
            col[sel, :3] = d[:3]
    # per-vertex colour (average of its corners) so vertices stay shared; fully smooth shading
    lv = np.empty(nl, np.int32)
    me.loops.foreach_get('vertex_index', lv)
    nvv = len(me.vertices)
    acc = np.zeros((nvv, 4), np.float64)
    np.add.at(acc, lv, col)
    cnt = np.bincount(lv, minlength=nvv).astype(np.float64)
    vcol = (acc / np.maximum(cnt, 1)[:, None]).astype(np.float32)
    vcol[:, 3] = 1.0
    ca = me.color_attributes.new('Col', 'BYTE_COLOR', 'POINT')
    ca.data.foreach_set('color_srgb', vcol.ravel())
    for an in ('sharp_edge', 'sharp_face'):
        a = me.attributes.get(an)
        if a is not None:
            me.attributes.remove(a)
    if hasattr(me, 'normals_domain') and me.has_custom_normals:
        bpy.context.view_layer.objects.active = lo
        bpy.ops.mesh.customdata_custom_splitnormals_clear()
    me.color_attributes.active_color = ca
    me.color_attributes.render_color_index = me.color_attributes.active_color_index
    if me.uv_layers:
        for l in list(me.uv_layers):
            me.uv_layers.remove(l)
    lm = bpy.data.materials.get('AV_Lejos') or bpy.data.materials.new('AV_Lejos')
    lm.use_nodes = True
    nt = lm.node_tree
    bsdf = nt.nodes.get('Principled BSDF')
    bsdf.inputs['Roughness'].default_value = 0.95
    if not any(nd.type == 'VERTEX_COLOR' for nd in nt.nodes):
        vc = nt.nodes.new('ShaderNodeVertexColor')
        vc.layer_name = 'Col'
        nt.links.new(vc.outputs['Color'], bsdf.inputs['Base Color'])
    me.materials.clear()
    me.materials.append(lm)
    lo.name = name + '_lejos'
    # export only the lejos object
    bpy.ops.object.select_all(action='DESELECT')
    lo.select_set(True)
    path = os.path.join(OUT, name + '_lejos.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_image_format='NONE', export_materials='EXPORT',
                              export_normals=True, export_texcoords=False, export_tangents=False, export_apply=True,
                              export_yup=True, export_animations=False, export_skins=False, export_morph=False,
                              export_cameras=False, export_lights=False, export_extras=False, use_selection=True,
                              export_vertex_color='ACTIVE', will_save_settings=False)
    js, rest = read_glb(path)
    for mat in js.get('materials', []):
        pbr = mat.setdefault('pbrMetallicRoughness', {})
        pbr['metallicFactor'] = 0.0; pbr['roughnessFactor'] = 0.95
        mat.pop('extensions', None)
    js.pop('extensionsUsed', None)
    write_glb(path, js, rest)
    kb, jskb = write_js(path, name + '_lejos')
    t = tri_count([lo])
    bpy.data.objects.remove(lo, do_unlink=True)
    return dict(tris_lejos=t, kb_lejos=round(kb / 1024, 1), js_kb_lejos=round(jskb / 1024, 1))


def limit_materials(o, maxm):
    """Keep the maxm materials with most area; reassign the rest to the kept one with the closest mean texture colour."""
    me = o.data
    mats = list(me.materials)
    if len(mats) <= maxm:
        return
    areas = mat_areas(o)
    order = list(np.argsort(-areas))
    keep = order[:maxm]

    def mean_col(m):
        info = json.loads(m['av_src']) if m is not None and 'av_src' in m else {}
        tf = info.get('webtex')
        if tf:
            return tex_small(tf).reshape(-1, 3).mean(0)
        return np.array(info.get('diffuse', (0.6, 0.6, 0.6))[:3])
    cols = {i: mean_col(mats[i]) for i in range(len(mats))}
    remap = {}
    for i in range(len(mats)):
        if i in keep:
            remap[i] = keep.index(i)
        else:
            j = min(keep, key=lambda kk: float(np.sum((cols[kk] - cols[i]) ** 2)))
            remap[i] = keep.index(j)
    n = len(me.polygons)
    mi = np.empty(n, np.int32)
    me.polygons.foreach_get('material_index', mi)
    mi = np.array([remap[i] for i in range(len(mats))], np.int32)[mi]
    kept = [mats[i] for i in keep]
    me.materials.clear()
    for m in kept:
        me.materials.append(m)
    me.polygons.foreach_set('material_index', mi)
    me.update()


def mat_areas(o):
    me = o.data
    n = len(me.polygons)
    ar = np.empty(n, np.float32)
    mi = np.empty(n, np.int32)
    me.polygons.foreach_get('area', ar)
    me.polygons.foreach_get('material_index', mi)
    return np.bincount(mi, weights=ar, minlength=len(me.materials))


def dedupe_slots(o):
    me = o.data
    mats = list(me.materials)
    first = {}
    remap = []
    for i, m in enumerate(mats):
        key = m.name if m else None
        if key not in first:
            first[key] = len(first)
        remap.append(first[key])
    if len(first) == len(mats):
        return
    n = len(me.polygons)
    mi = np.empty(n, np.int32)
    me.polygons.foreach_get('material_index', mi)
    mi = np.array(remap, np.int32)[mi]
    uniq = []
    for m in mats:
        if (m.name if m else None) not in [(u.name if u else None) for u in uniq]:
            uniq.append(m)
    me.materials.clear()
    for m in uniq:
        me.materials.append(m)
    me.polygons.foreach_set('material_index', mi)
    me.update()


def web_export(o, name):
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    path = os.path.join(OUT, name + '.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_image_format='NONE', export_materials='EXPORT',
                              export_normals=True, export_texcoords=True, export_tangents=False, export_apply=True,
                              export_yup=True, export_animations=False, export_skins=False, export_morph=False,
                              export_cameras=False, export_lights=False, export_extras=False, use_selection=True,
                              export_vertex_color='NONE', will_save_settings=False)
    inject_web_textures(path)
    kb, jskb = write_js(path, name)
    tris0 = tri_count([o])
    rec = dict(id=name, kb=round(kb / 1024, 1), js_kb=round(jskb / 1024, 1),
               materials=sorted(m.name for m in o.data.materials if m))
    rec.update(make_lejos(o, name, tris0))
    return rec


# ---------------------------------------------------------------- main
report = []
t0 = time.time()
WEBMAP = json.load(open(args['map'])) if args.get('map') else {}
WELD = not args.get('noweld')
PLANAR = not args.get('noplanar')
PLANAR_DEG = float(args.get('planar', 4.0))
VOXEL_ABS = bool(args.get('voxabs'))
PART_REMESH = bool(args.get('partremesh'))
VOXEL_M = float(args.get('voxel', 0) or 0)
RM_PLANAR = float(args.get('rmplanar', 3.0))
for name in IDS:
    aid = WEBMAP[name]['src'] if MODE == 'web' else name
    try:
        clear_scene()
        ta = time.time()
        objs = build_asset(aid)
        if not objs:
            log('EMPTY', aid)
            continue
        tris = tri_count(objs)
        if MODE == 'faithful':
            path = os.path.join(OUT, aid + '.glb')
            export_glb(path, 'NONE')
            missing, nimg = inject_texture_uris(path)
            kb = os.path.getsize(path) / 1024
            rec = dict(id=aid, tris=tris, kb=round(kb), parts=len(objs), images=nimg, missing=missing,
                       secs=round(time.time() - ta, 1), peak=round(rss_peak_gb(), 2))
        else:
            spec = WEBMAP[name]
            if spec.get('voxel'):
                VOXEL_M = float(spec['voxel'])
            if spec.get('rmplanar'):
                RM_PLANAR = float(spec['rmplanar'])
            budget = int(spec.get('budget', BUDGET))
            maxverts = int(spec.get('maxverts', budget * (1.6 if budget > 2000 else 1.3)))
            for attempt in range(3):
                if attempt:
                    clear_scene()
                    objs = build_asset(aid)
                if spec.get('lay_flat'):
                    import mathutils
                    R = mathutils.Matrix.Rotation(math.radians(-90), 4, 'X')
                    for ob in objs:
                        ob.matrix_world = R @ ob.matrix_world
                if spec.get('scale'):
                    import mathutils
                    Sm = mathutils.Matrix.Scale(float(spec['scale']), 4)
                    for ob in objs:
                        ob.matrix_world = Sm @ ob.matrix_world
                o, wt, size, shift = web_optimize(objs, budget, tuple(spec.get('drop', ())), tuple(spec.get('logfit', ())), float(spec.get('logshare', 0.5)), int(spec.get('remesh', 0)), bool(spec.get('boxfit')))
                o.name = name
                dedupe_slots(o)
                limit_materials(o, int(spec.get('maxmats', 3)))
                rec = web_export(o, name)
                jsg, _ = read_glb(os.path.join(OUT, name + '.glb'))
                nverts = sum(jsg['accessors'][p_['attributes']['POSITION']]['count'] for m_ in jsg['meshes'] for p_ in m_['primitives'])
                rec['verts'] = nverts
                if nverts <= maxverts:
                    break
                log('  %d verts > %d: retry with smaller budget' % (nverts, maxverts))
                budget = int(tri_count([o]) * maxverts / nverts * 0.95)
            rec.update(dict(src=aid, tris_src=tris, tris=tri_count([o]), size_m=[round(x, 2) for x in size],
                            k=float(spec.get('scale', 1.0)), shift_zup=[round(x, 5) for x in shift], lay_flat=bool(spec.get('lay_flat')),
                            budget=budget, secs=round(time.time() - ta, 1), peak=round(rss_peak_gb(), 2)))
        report.append(rec)
        log('DONE', json.dumps(rec))
    except MemGuard as e:
        log('MEMGUARD abort at', aid, e)
        report.append(dict(id=aid, error='memguard ' + str(e)))
        break
    except Exception as e:
        import traceback
        traceback.print_exc()
        report.append(dict(id=aid, error=repr(e)))
rp = os.path.join(OUT, '_report_%s_%d.json' % (MODE, int(time.time())))
json.dump(report, open(rp, 'w'), indent=1)
log('ALL', round(time.time() - t0, 1), 's peak', round(rss_peak_gb(), 2), 'GB ->', rp)
