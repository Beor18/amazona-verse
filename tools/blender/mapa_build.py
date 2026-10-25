# Construye el mapa del Capítulo 1 (El Yunque) y exporta todo para el juego.
# Uso: Blender -b -P tools/blender/mapa_build.py            (Blender 4.2, sin ventana; no guarda .blend)
# Salidas: assets/models/mapa/*.glb + *_glb.js, assets/data/mapa_cap1.js, assets/data/mapa_cap1_altura.js
import bpy, bmesh, numpy as np, os, sys, json, base64, struct, math, time
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import importlib, mapa_lib as ML, mapa_estructuras as ME
importlib.reload(ML); importlib.reload(ME)
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT_M = os.path.join(ROOT, 'assets', 'models', 'mapa'); OUT_D = os.path.join(ROOT, 'assets', 'data')
os.makedirs(OUT_M, exist_ok=True)
TRI_TARGET = 37400
HM_STEP = 2.0
T0 = time.time()
def log(*a): print('[mapa %5.1fs]' % (time.time() - T0), *a, flush=True)

bpy.ops.wm.read_homefile(use_empty=True)
M, H = ML.build()
SPL = ML.splat(M, H)
log('terreno diseñado', H.min(), H.max())
G = lambda X, Y, Z=0.0: ML.game(X, Y, Z)

# ------------------------------------------------------------------ GLB propio (terreno y agua): COLOR_0 en unorm8
def write_glb(path, prims, materials, extras=None):
    bins = bytearray(); views = []; accs = []; meshes = []
    def add(arr, target, comp, typ, norm=False, minmax=False):
        nonlocal bins
        while len(bins) % 4: bins += b'\0'
        b = arr.tobytes(); views.append({'buffer': 0, 'byteOffset': len(bins), 'byteLength': len(b), **({'target': target} if target else {})})
        bins += b
        a = {'bufferView': len(views) - 1, 'componentType': comp, 'count': int(arr.shape[0]), 'type': typ}
        if norm: a['normalized'] = True
        if minmax: a['min'] = arr.min(0).tolist(); a['max'] = arr.max(0).tolist()
        accs.append(a); return len(accs) - 1
    nodes = []
    for p in prims:
        at = {'POSITION': add(p['pos'].astype(np.float32), 34962, 5126, 'VEC3', minmax=True),
              'NORMAL': add(p['nrm'].astype(np.float32), 34962, 5126, 'VEC3')}
        if p.get('col') is not None: at['COLOR_0'] = add(p['col'].astype(np.uint8), 34962, 5121, 'VEC4', norm=True)
        if p.get('uv') is not None: at['TEXCOORD_0'] = add(p['uv'].astype(np.float32), 34962, 5126, 'VEC2')
        idx = p['idx'].astype(np.uint16 if p['pos'].shape[0] < 65535 else np.uint32).reshape(-1)
        ia = add(idx, 34963, 5123 if idx.dtype == np.uint16 else 5125, 'SCALAR')
        meshes.append({'name': p['name'], 'primitives': [{'attributes': at, 'indices': ia, 'material': p['mat']}]})
        nodes.append({'name': p['name'], 'mesh': len(meshes) - 1})
    while len(bins) % 4: bins += b'\0'
    js = {'asset': {'version': '2.0', 'generator': 'AmazonaVerse mapa_build.py (Blender 4.2 + numpy)'},
          'scene': 0, 'scenes': [{'nodes': list(range(len(nodes)))}], 'nodes': nodes, 'meshes': meshes,
          'materials': materials, 'accessors': accs, 'bufferViews': views, 'buffers': [{'byteLength': len(bins)}]}
    if extras: js['extras'] = extras
    jb = json.dumps(js, separators=(',', ':')).encode()
    while len(jb) % 4: jb += b' '
    out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(jb) + 8 + len(bins)) + struct.pack('<II', len(jb), 0x4E4F534A) + jb + \
        struct.pack('<II', len(bins), 0x004E4942) + bytes(bins)
    open(path, 'wb').write(out)

def b64js(name):
    p = os.path.join(OUT_M, name + '.glb')
    b = base64.b64encode(open(p, 'rb').read()).decode()
    open(os.path.join(OUT_M, name + '_glb.js'), 'w').write('(window.AV_MAPA_B64=window.AV_MAPA_B64||{})["%s"]="%s";\n' % (name, b))

def to_gltf(P):   # mapa (X, Y, Z) -> glTF (x, y, z) = (X, Z, -Y)
    return np.c_[P[:, 0], P[:, 2], -P[:, 1]]

# ------------------------------------------------------------------ malla del terreno: rejilla 1 m -> decimado
n = H.shape[0]
xs = M.ax
VX, VY = np.meshgrid(xs, xs)
co = np.c_[VX.ravel(), VY.ravel(), H.ravel()].astype(np.float32)
q = np.arange(n * n).reshape(n, n)
quads = np.stack([q[:-1, :-1], q[:-1, 1:], q[1:, 1:], q[1:, :-1]], -1).reshape(-1, 4)
me = bpy.data.meshes.new('terreno_full')
me.vertices.add(len(co)); me.vertices.foreach_set('co', co.ravel())
me.loops.add(quads.size); me.loops.foreach_set('vertex_index', quads.ravel().astype(np.int32))
me.polygons.add(len(quads)); me.polygons.foreach_set('loop_start', (np.arange(len(quads)) * 4).astype(np.int32))
me.update(); me.validate()
ob = bpy.data.objects.new('terreno_full', me); bpy.context.scene.collection.objects.link(ob)
# grupo de detalle: senderos, explanadas, orillas y costa conservan más vértices (el splat necesita bordes nítidos)
VG_FACTOR = float(os.environ.get('MAPA_VGF', '1'))
TBAND = float(os.environ.get('MAPA_TBAND', '1.6'))
IJ = np.indices(M.trailD.shape)
wdet = ((M.trailD < TBAND) & (M.trailD > TBAND - 1.0) & (IJ[0] % 2 == 0) & (IJ[1] % 2 == 0)).astype(float).ravel()   # borde de los senderos (1 de cada 4)
vg = ob.vertex_groups.new(name='detalle')
for lo, hi_, val in ((0.25, 0.6, 0.4), (0.6, 0.85, 0.75), (0.85, 1.01, 1.0)):
    ids = np.nonzero((wdet >= lo) & (wdet < hi_))[0].tolist()
    if ids: vg.add(ids, val, 'REPLACE')
mod = ob.modifiers.new('dec', 'DECIMATE'); mod.decimate_type = 'COLLAPSE'
mod.ratio = TRI_TARGET / (2 * len(quads)); mod.use_collapse_triangulate = True
if VG_FACTOR > 0:
    mod.vertex_group = 'detalle'; mod.invert_vertex_group = True; mod.vertex_group_factor = VG_FACTOR
dg = bpy.context.evaluated_depsgraph_get()
tm = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
bpy.data.objects.remove(ob); bpy.data.meshes.remove(me)
tm.calc_loop_triangles()
V = np.zeros(len(tm.vertices) * 3, np.float32); tm.vertices.foreach_get('co', V); V = V.reshape(-1, 3)
T = np.zeros(len(tm.loop_triangles) * 3, np.int32); tm.loop_triangles.foreach_get('vertices', T); T = T.reshape(-1, 3)
log('terreno decimado: %d vértices, %d triángulos' % (len(V), len(T)))
# densidad de vértices cerca de senderos (control del grupo de detalle)
def bil(A, x, y, step=ML.RES):
    fx = (x + ML.HALF) / step; fy = (y + ML.HALF) / step
    x0 = np.clip(fx.astype(int), 0, A.shape[1] - 2); y0 = np.clip(fy.astype(int), 0, A.shape[0] - 2)
    tx = (fx - x0)[..., None] if A.ndim == 3 else fx - x0; ty = (fy - y0)[..., None] if A.ndim == 3 else fy - y0
    return A[y0, x0] * (1 - tx) * (1 - ty) + A[y0, x0 + 1] * tx * (1 - ty) + A[y0 + 1, x0] * (1 - tx) * ty + A[y0 + 1, x0 + 1] * tx * ty
near = bil(M.trailD.clip(0, 50), V[:, 0], V[:, 1]) < 3
log('vértices junto a senderos: %.1f%%' % (100 * near.mean()))

# normales suaves de la malla completa (sin costuras entre trozos)
fn = np.cross(V[T[:, 1]] - V[T[:, 0]], V[T[:, 2]] - V[T[:, 0]])
NV = np.zeros_like(V)
for k in range(3): np.add.at(NV, T[:, k], fn)
NV /= np.linalg.norm(NV, axis=1, keepdims=True) + 1e-12
# splat por vértice
S = bil(SPL, V[:, 0], V[:, 1]); S = S / S.sum(1, keepdims=True)
COL = np.clip(np.round(S * 255), 0, 255).astype(np.uint8)

# ------------------------------------------------------------------ mapa de alturas (desde la malla final, BVH)
from mathutils.bvhtree import BVHTree
bvh = BVHTree.FromPolygons(V.tolist(), T.tolist())
nh = int(round(2 * ML.HALF / HM_STEP)) + 1
hx = np.linspace(-ML.HALF, ML.HALF, nh)
HM = np.zeros((nh, nh), np.float64)    # filas: z del juego creciente (= norte a sur)
from mathutils import Vector
for iz in range(nh):
    Yw = -hx[iz]
    for ix in range(nh):
        hit = bvh.ray_cast(Vector((hx[ix], Yw, 400.0)), Vector((0, 0, -1)))
        HM[iz, ix] = hit[0].z if hit[0] is not None else H[int(round(Yw + ML.HALF)), int(round(hx[ix] + ML.HALF))]
hmin, hmax = float(np.floor(HM.min())), float(np.ceil(HM.max()))
Q16 = np.round((HM - hmin) / (hmax - hmin) * 65535).astype('<u2')
# error del mapa de alturas frente a la malla en puntos al azar de tierra firme
rs = np.random.RandomState(3); err = []; errs = []
for _ in range(4000):
    x, y = rs.uniform(-230, 230, 2)
    hit = bvh.ray_cast(Vector((x, y, 400.0)), Vector((0, 0, -1)))
    if hit[0] is None or hit[0].z < 0: continue
    fx = (x + ML.HALF) / HM_STEP; fz = (-y + ML.HALF) / HM_STEP; i0 = int(fx); j0 = int(fz); tx = fx - i0; tz = fz - j0
    hq = HM[j0, i0] * (1 - tx) * (1 - tz) + HM[j0, i0 + 1] * tx * (1 - tz) + HM[j0 + 1, i0] * (1 - tx) * tz + HM[j0 + 1, i0 + 1] * tx * tz
    err.append(abs(hq - hit[0].z)); errs.append(math.degrees(math.acos(max(-1, min(1, hit[1].z)))))
err = np.array(err)
HM_ERR = (float(np.mean(err)), float(np.percentile(err, 95)), float(err.max()))
log('error en suelo caminable (pendiente < 30 grados): p95 %.3f m' % np.percentile(err[np.array(errs) < 30], 95))
log('mapa de alturas %dx%d, error medio %.3f m, p95 %.3f m, máx %.2f m' % (nh, nh, *HM_ERR))

# ------------------------------------------------------------------ trozos del terreno (2 x 2)
cen = V[T].mean(1)
mat_terr = [{'name': 'AV_Terreno_Splat', 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0, 'roughnessFactor': 0.95},
             'extras': {'splat': 'COLOR_0 RGBA = pesos: R pasto/musgo, G tierra, B roca, A arena (suman 1)'}}]
CHUNKS = []
for cid, (sx, sy) in {'terreno_no': (-1, 1), 'terreno_ne': (1, 1), 'terreno_so': (-1, -1), 'terreno_se': (1, -1)}.items():
    sel = ((cen[:, 0] >= 0) == (sx > 0)) & ((cen[:, 1] >= 0) == (sy > 0))
    tri = T[sel]; used, inv = np.unique(tri, return_inverse=True)
    prim = {'name': cid, 'pos': to_gltf(V[used]), 'nrm': to_gltf(NV[used]), 'col': COL[used], 'idx': inv.reshape(-1, 3), 'mat': 0}
    write_glb(os.path.join(OUT_M, cid + '.glb'), [prim], mat_terr,
              extras={'trozo': cid, 'triangulos': int(sel.sum()), 'splat': 'R pasto/musgo, G tierra, B roca, A arena'})
    b64js(cid); CHUNKS.append({'id': cid, 'glb': 'assets/models/mapa/%s.glb' % cid, 'triangulos': int(sel.sum())})
log('trozos', [(c['id'], c['triangulos']) for c in CHUNKS])

# ------------------------------------------------------------------ agua: río, quebrada, pozas y cascadas
def ribbon(P, s, L, w, skip_pools, foam_drop=2.5):
    pos, uv, col, idx = [], [], [], []
    tg = np.gradient(P, axis=0); tg /= np.linalg.norm(tg, axis=1, keepdims=True) + 1e-9
    nr = np.c_[-tg[:, 1], tg[:, 0]]
    def inpool(p):
        return any(np.hypot(p[0] - q['x'], p[1] - q['y']) < q['r'] - 1.2 for q in skip_pools)
    rows = []
    for i in range(len(P)):
        ww = w[i] + 0.45
        if i > 0 and L[i] < L[i - 1] - 0.05:   # escalón: fila doble (salto de agua)
            drop = L[i - 1] - L[i]
            off = tg[i] * min(1.6, 0.35 * drop)
            rows.append((P[i], L[i - 1], ww, s[i], 1.0 if drop >= foam_drop else 0.25, i))
            rows.append((P[i] + off, L[i], ww, s[i] + 0.3, 1.0 if drop >= foam_drop else 0.35, i))
        else:
            rows.append((P[i], L[i], ww, s[i], 0.0, i))
    base = 0
    for r, (p, lv, ww, v, fo, i) in enumerate(rows):
        for side in (-1, 1):
            q = p + nr[i] * side * ww
            pos.append((q[0], q[1], lv)); uv.append((side * ww, v)); col.append((int(255 * fo), 160, 0, 255))
        if r > 0 and not (inpool(p) and inpool(rows[r - 1][0])):
            a = 2 * (r - 1); b = 2 * r
            idx += [(a, a + 1, b + 1), (a, b + 1, b)]
    return np.array(pos), np.array(uv), np.array(col), np.array(idx)

def disc(cx, cy, r, z, seg=28):
    pos = [(cx, cy, z)] + [(cx + r * math.cos(2 * math.pi * k / seg), cy + r * math.sin(2 * math.pi * k / seg), z) for k in range(seg)]
    idx = [(0, 1 + k, 1 + (k + 1) % seg) for k in range(seg)]
    uv = [(p[0] - cx, p[1] - cy) for p in pos]
    return np.array(pos), np.array(uv), np.array([(0, 40, 0, 255)] * len(pos)), np.array(idx)

parts = [ribbon(M.river, M.river_s, M.river_L, M.river_w, [p for p in M.pools if p['cauce'] == 'rio']),
         ribbon(M.creek, M.creek_s, M.creek_L, M.creek_w, [p for p in M.pools if p['cauce'] == 'creek'])]
for p in M.pools: parts.append(disc(p['x'], p['y'], p['r'] + 0.6, p['nivel'] - 0.015))
WP, WU, WC, WI = [], [], [], []; off = 0
for pos, uv, col, idx in parts:
    WP.append(pos); WU.append(uv); WC.append(col); WI.append(idx + off); off += len(pos)
WP = np.vstack(WP); WU = np.vstack(WU); WC = np.vstack(WC); WI = np.vstack(WI)
# normales del agua: hacia arriba salvo en los saltos (se calculan por caras)
fnw = np.cross(WP[WI[:, 1]] - WP[WI[:, 0]], WP[WI[:, 2]] - WP[WI[:, 0]])
WI = np.where((fnw[:, 2] < 0)[:, None], WI[:, [0, 2, 1]], WI)
fnw = np.cross(WP[WI[:, 1]] - WP[WI[:, 0]], WP[WI[:, 2]] - WP[WI[:, 0]])
WN = np.zeros_like(WP)
for k in range(3): np.add.at(WN, WI[:, k], fnw)
WN /= np.linalg.norm(WN, axis=1, keepdims=True) + 1e-12
mat_w = [{'name': 'AV_Agua_Rio', 'pbrMetallicRoughness': {'baseColorFactor': [0.18, 0.5, 0.62, 0.85], 'metallicFactor': 0, 'roughnessFactor': 0.08},
          'alphaMode': 'BLEND', 'extras': {'COLOR_0': 'R espuma (saltos), G velocidad, A 1', 'TEXCOORD_0': 'u: metros a través, v: metros a lo largo (flujo)'}}]
write_glb(os.path.join(OUT_M, 'agua.glb'), [{'name': 'agua', 'pos': to_gltf(WP), 'nrm': to_gltf(WN), 'col': WC, 'uv': WU, 'idx': WI, 'mat': 0}], mat_w)
b64js('agua')
log('agua: %d triángulos' % len(WI))
# cascadas (saltos >= 2.5 m)
CASC = []
for nm, P, Lv, w in (('rio', M.river, M.river_L, M.river_w), ('quebrada', M.creek, M.creek_L, M.creek_w)):
    for i in range(1, len(P)):
        d = Lv[i - 1] - Lv[i]
        if d >= 2.5: CASC.append({'cauce': nm, 'arriba': G(P[i][0], P[i][1], Lv[i - 1]), 'abajo': G(P[i][0], P[i][1], Lv[i]), 'caida': round(float(d), 1), 'ancho': round(float(2 * w[i]), 1)})
CASC.sort(key=lambda c: -c['caida'])
log('cascadas', [(c['cauce'], c['caida']) for c in CASC])

# ------------------------------------------------------------------ estructuras (coordenadas locales + colocación)
def hz(x, y): return float(bil(H, np.array([x]), np.array([y]))[0])
PL = {}
br = M.bridge; PS, PN = br['sur'], br['norte']; mid = (PS + PN) / 2; span = float(np.linalg.norm(PN - PS))
PL['refugio'] = (167, -183, M.padz['estacion'], math.radians(52))
PL['mirador'] = (14, -172, M.padz['mirador'], math.radians(-90))
PL['casita'] = (-104, -138, M.padz['casita'], math.radians(-135))
PL['puente'] = (float(mid[0]), float(mid[1]), br['zs'], math.atan2(PN[1] - PS[1], PN[0] - PS[0]))
ym = -200.0
while hz(150, ym) > 1.15 and ym > -230: ym -= 0.5
PL['muelle'] = (150, ym, 0.0, math.radians(180))
PL['ruinas'] = (198, 4, M.padz['ruinas'], math.radians(8))
builders = {'refugio': ME.estacion, 'mirador': ME.mirador, 'casita': ME.casita, 'puente': lambda: ME.puente(span - 0.3),
            'muelle': ME.muelle, 'ruinas': ME.ruinas}
EST = []; COLS = []; MIRADOR_TOP = 0
def xf(px, py, x, y, th):   # local -> mapa
    c, s = math.cos(th), math.sin(th); return x + px * c - py * s, y + px * s + py * c
for sid, fn in builders.items():
    r = fn(); obj, col = r[0], r[1]
    if sid == 'mirador': MIRADOR_TOP = r[2]
    tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active = obj
    path = os.path.join(OUT_M, sid + '.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_yup=True, export_apply=True,
                              export_texcoords=False, export_normals=True, export_materials='EXPORT', export_cameras=False,
                              export_lights=False, export_animations=False, export_extras=False)
    b64js(sid)
    x, y, z, th = PL[sid]
    EST.append({'id': sid, 'glb': 'assets/models/mapa/%s.glb' % sid, 'pos': G(x, y, z), 'rotY': round(th, 4), 'triangulos': tris,
                'materiales': [m.name for m in obj.data.materials]})
    for c in col:
        o = {'estructura': sid, 'tipo': c['tipo']}
        if c['tipo'] in ('caja', 'piso'):
            wx, wy = xf(c['c'][0], c['c'][1], x, y, th)
            o.update({'x': round(wx, 2), 'z': round(-wy, 2), 'hx': c['h'][0], 'hz': c['h'][1], 'rotY': round(th + c.get('rz', 0), 4)})
            if c['tipo'] == 'caja': o.update({'y0': round(z + c['c'][2] - c['h'][2], 2), 'y1': round(z + c['c'][2] + c['h'][2], 2)})
            else: o.update({'y': round(z + c['z'], 2)}); o.update({'forma': c['forma']} if 'forma' in c else {})
        elif c['tipo'] == 'cilindro':
            wx, wy = xf(c['c'][0], c['c'][1], x, y, th)
            o.update({'x': round(wx, 2), 'z': round(-wy, 2), 'r': c['r'], 'y0': round(z + c['z0'], 2), 'y1': round(z + c['z1'], 2)})
        else:
            for k in ('a', 'b'):
                wx, wy = xf(c[k][0], c[k][1], x, y, th); o[k] = G(wx, wy, z + c[k][2])
            o['ancho'] = c['ancho']
            if 'comba' in c: o['comba'] = c['comba']
        COLS.append(o)
    bpy.data.objects.remove(obj)
log('estructuras', [(e['id'], e['triangulos']) for e in EST])

# ------------------------------------------------------------------ grutas (coordenadas del mundo)
def gruta(gid, a, b, floor, w, hgt=3.4, size=1.0):
    a = np.array(a, float); b = np.array(b, float); d = b - a; L = float(np.linalg.norm(d)); u = d / L
    ang = math.atan2(u[1], u[0]); c = (a + b) / 2
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=1.0, location=(c[0], c[1], floor + 1.2))
    rock = bpy.context.object; rock.name = gid
    rock.scale = ((L / 2 + 3.5) * size, (w / 2 + 3.2) * size, (hgt + 3.0) * size); rock.rotation_euler = (0, 0, ang)
    tex = bpy.data.textures.new(gid + '_n', 'CLOUDS'); tex.noise_scale = 1.1; tex.noise_depth = 2
    dm = rock.modifiers.new('d', 'DISPLACE'); dm.texture = tex; dm.strength = 1.4; dm.mid_level = 0.5
    bpy.ops.mesh.primitive_cube_add(location=(c[0] - u[0] * 1.5, c[1] - u[1] * 1.5, floor + hgt / 2 - 0.6))
    tun = bpy.context.object; tun.scale = (L / 2 + 6.0, w / 2 * 0.95, hgt / 2 + 0.6); tun.rotation_euler = (0, 0, ang)
    bm_ = rock.modifiers.new('b', 'BOOLEAN'); bm_.operation = 'DIFFERENCE'; bm_.object = tun; bm_.solver = 'EXACT'
    bpy.ops.mesh.primitive_cube_add(location=(c[0], c[1], floor - 6.0 - 0.3)); low = bpy.context.object
    low.scale = (L + 20, L + 20, 6.0); low.rotation_euler = (0, 0, ang)
    bm2 = rock.modifiers.new('b2', 'BOOLEAN'); bm2.operation = 'DIFFERENCE'; bm2.object = low; bm2.solver = 'EXACT'
    dec = rock.modifiers.new('dec', 'DECIMATE'); dec.ratio = 0.22
    dg = bpy.context.evaluated_depsgraph_get(); mesh = bpy.data.meshes.new_from_object(rock.evaluated_get(dg))
    mesh.transform(rock.matrix_world)
    for o in (rock, tun, low): bpy.data.objects.remove(o)
    ob = bpy.data.objects.new(gid, mesh); bpy.context.scene.collection.objects.link(ob)
    mesh.materials.append(ME.material('AV_Roca_Gruta', '#77706a', 1.0)); mesh.materials.append(ME.material('AV_Musgo_Gruta', '#4d7a3c', 1.0))
    for p in mesh.polygons: p.material_index = 1 if p.normal.z > 0.55 else 0; p.use_smooth = False
    return ob
GR = []; grot_objs = []
cv = M.caves
for gid, (a, b, w) in ML.CAVES.items():
    grot_objs.append(gruta(gid, a, b, cv[gid]['z'], w)); GR.append({'id': gid, 'a': G(*a, cv[gid]['z']), 'b': G(*b, cv[gid]['z'] + 0.6), 'ancho': w, 'techo': round(cv[gid]['z'] + 3.4, 2)})
R0 = M.river; ia = 10
grot_objs.append(gruta('cueva_rio', R0[ia], R0[0], float(M.river_L[0]) + 0.2, float(M.river_w[0]) * 2 + 1.5, hgt=3.6, size=1.0))
GR.append({'id': 'cueva_rio', 'a': G(*R0[ia], float(M.river_L[0])), 'b': G(*R0[0], float(M.river_L[0])), 'ancho': round(float(M.river_w[0]) * 2 + 1.5, 1), 'techo': round(float(M.river_L[0]) + 3.8, 2)})
bpy.ops.object.select_all(action='DESELECT')
for o in grot_objs: o.select_set(True)
bpy.context.view_layer.objects.active = grot_objs[0]
gt = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in grot_objs)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT_M, 'grutas.glb'), export_format='GLB', use_selection=True, export_yup=True,
                          export_apply=True, export_texcoords=False, export_normals=True, export_materials='EXPORT')
b64js('grutas')
for o in grot_objs: bpy.data.objects.remove(o)
EST.append({'id': 'grutas', 'glb': 'assets/models/mapa/grutas.glb', 'pos': [0, 0, 0], 'rotY': 0, 'triangulos': gt, 'materiales': ['AV_Roca_Gruta', 'AV_Musgo_Gruta'], 'mundo': True})
log('grutas: %d triángulos' % gt)

# ------------------------------------------------------------------ flora (densidades 8 m + máscara libre 2 m)
M.footprints = {k: (v[0], v[1], {'refugio': 8.5, 'mirador': 5.5, 'casita': 6, 'puente': 4, 'muelle': 3, 'ruinas': 11}[k]) for k, v in PL.items()}
# ------------------------------------------------------------------ edificios del kit de Kelvin
KEL = []
def kplace(glb, x, y, z, rot, grupo, rol):
    n = sum(1 for k in KEL if k['glb_n'] == glb)
    w_, h_, d_ = ML.KDIM[glb]
    KEL.append({'id': '%s_%d' % (glb, n + 1), 'glb_n': glb, 'glb': 'assets/models/edificios/%s.glb' % glb, 'b64': 'assets/models/edificios/%s_glb.js' % glb,
                'pos': G(x, y, z), 'rotY': round(rot, 4), 'grupo': grupo, 'rol': rol, 'dim': [w_, h_, d_]})
    M.footprints['k_%s_%d' % (glb, n + 1)] = (x, y, max(w_, d_) / 2 + 1.0)
for glb, anc, dx, dy, rot, grupo, rol in ML.KELVIN:
    th = math.radians(rot)
    if anc:
        ax_, ay_ = ML.POI[anc]; x, y = ax_ + dx, ay_ + dy
        z = M.padz.get(anc, hz(x, y)) if (dx == 0 and dy == 0) else hz(x, y)
        if anc in M.padz and math.hypot(dx, dy) < dict((p[0], p[1]) for p in ML.PADS)[anc]: z = M.padz[anc]
    else:
        x, y = dx, dy; z = hz(x, y)
    kplace(glb, x, y, z, th, grupo, rol)
mx_, my_ = PL['muelle'][:2]
for k in range(4):   # muelle de troncos: cuatro tramos en fila sobre el eje del muelle
    kplace('muelle_troncos', mx_, my_ - 3.6 - 7.2 * k, 0.75, math.radians(90), 'costa', 'muelle' if k == 0 else None)
pdj = [p for p in M.pools if p['id'] == 'poza_dajao'][0]
kr = int(np.argmin(np.hypot(M.river[:, 0] - pdj['x'], M.river[:, 1] - pdj['y'])))
kb = min(len(M.river) - 3, kr + int((pdj['r'] + 12) / 2.0))
tgk = M.river[kb + 2] - M.river[kb - 2]; tgk /= np.linalg.norm(tgk)
PB2 = M.river[kb]; nb2 = np.array([-tgk[1], tgk[0]])
zb2 = max(hz(*(PB2 + nb2 * 5.5)), hz(*(PB2 - nb2 * 5.5)))
kplace('puente_madera', float(PB2[0]), float(PB2[1]), zb2 - 0.2, math.atan2(nb2[1], nb2[0]), 'meandros', 'puente_dajao')
log('edificios de Kelvin colocados: %d' % len(KEL))
DEN, FREE, FX, FY = ML.flora(M, H, step=2)
def coarse(A, f=4):
    n_ = (A.shape[0] - 1) // f; return A[:n_ * f, :n_ * f].reshape(n_, f, n_, f).mean((1, 3))
FL = {'celda': 8, 'nx': None, 'nz': None, 'x0': -ML.HALF, 'z0': -ML.HALF, 'unidad': 'instancias por 100 m2 = valor / 10', 'densidad': {}}
for sp in ML.SPECIES:
    C8 = coarse(DEN[sp])[::-1]     # filas de norte a sur (z del juego creciente)
    FL['nx'] = C8.shape[1]; FL['nz'] = C8.shape[0]
    FL['densidad'][sp] = base64.b64encode(np.clip(np.round(C8 * 10), 0, 255).astype(np.uint8).tobytes()).decode()
fr = FREE[::-1]; bits = np.packbits(fr.astype(np.uint8).ravel(), bitorder='little')
FL['libre'] = {'celda': 2, 'nx': fr.shape[1], 'nz': fr.shape[0], 'x0': -ML.HALF, 'z0': -ML.HALF, 'bits': base64.b64encode(bits.tobytes()).decode(),
               'nota': '1 = se puede instanciar (fuera de senderos, agua, explanadas y estructuras); bit i = ix + iz*nx, orden little'}
FL['heroes'] = [{'especie': sp, 'pos': G(x, y, hz(x, y)), 'escala': s} for sp, x, y, s in ML.HEROES]
np.save(os.path.join(os.environ.get('MAPA_TMP', '/tmp'), 'mapa_flora.npy'), np.array([DEN[sp] for sp in ML.SPECIES], np.float32)) if os.environ.get('MAPA_TMP') else None
tot = {sp: int(DEN[sp].sum() * 4 / 100) for sp in ML.SPECIES}
log('flora (instancias aprox.)', tot)

# ------------------------------------------------------------------ datos del juego
def pt(x, y, dz=0.0): return G(x, y, hz(x, y) + dz)
pools = {p['id']: p for p in M.pools}
ph = pools['poza_honda']; pd_ = pools['poza_dajao']; pm = pools['poza_la_mina']; pc = pools['charca_nubes']
cav = {g['id']: g for g in GR}
fieldpos = {'dajao': (pd_['x'], pd_['y']), 'maraca': (ML.CAVES['gruta_mina'][1][0], ML.CAVES['gruta_mina'][1][1]),
            'guiro': (14, -172), 'petroglifo': ((ML.CAVES['cueva_mar'][0][0] + ML.CAVES['cueva_mar'][1][0] * 2) / 3, (ML.CAVES['cueva_mar'][0][1] + ML.CAVES['cueva_mar'][1][1] * 2) / 3)}
FIELD = []
for fid, x, y, r, wat in ML.FIELD:
    if fid in fieldpos: x, y = fieldpos[fid]
    if fid == 'guiro': pos = G(x, y, PL['mirador'][2] + MIRADOR_TOP)
    elif wat: pos = G(x, y, (pools['poza_dajao']['nivel'] if fid == 'dajao' else 0.0) - 0.35)
    else: pos = pt(x, y)
    o = {'id': fid, 'x': pos[0], 'y': pos[1], 'z': pos[2]}
    if r: o['r'] = r
    if wat: o['water'] = True
    FIELD.append(o)
RES = []
for rid, typ, x, y in ML.RESOURCES:
    if rid == 'c1': x, y = ph['x'], ph['y']; p_ = G(x, y, ph['nivel'] - ph['prof'] + 0.3); RES.append({'id': rid, 'type': typ, 'x': p_[0], 'y': p_[1], 'z': p_[2], 'under': True}); continue
    p_ = pt(x, y); RES.append({'id': rid, 'type': typ, 'x': p_[0], 'y': p_[1], 'z': p_[2]})
tal = ML.POI['taller']
LUG = {k: dict(zip(('x', 'y', 'z'), pt(*ML.POI[v]))) for k, v in {'taller': 'taller', 'villa': 'plaza', 'A': 'terrenoA', 'B': 'terrenoB'}.items()}
for k, r in {'taller': 7, 'villa': 10, 'A': 7, 'B': 8}.items(): LUG[k]['r'] = r
LUG['A']['half'] = 4; LUG['B']['half'] = 4
mp = PL['mirador']
LUG['mirador'] = {'x': mp[0], 'y': round(mp[2], 2), 'z': -mp[1], 'r': 2.5, 'yPlataforma': round(mp[2] + MIRADOR_TOP, 2), 'radioPlataforma': 3.5,
                  'nota': 'torre de 12.9 m: el jugador sube volando o por la escalera interior (puerta al este)'}
spawn = pt(tal[0] + 1, tal[1] - 4.5)
NOMBRES = {'estacion': 'Estación de Conservación (Villa Raíz)', 'plaza': 'Plaza de Villa Raíz', 'taller': 'Taller de Vittata',
           'luma': 'Luma', 'terrenoA': 'Terreno A · Junto al río', 'terrenoB': 'Terreno B · La colina', 'mirador': 'Mirador Yokahú',
           'muelle': 'Muelle', 'casita': 'Casita jíbara del Guardián', 'ruinas': 'Ruinas de la hacienda', 'cumbre': 'Cumbre de El Yunque',
           'picachos': 'Los Picachos', 'cueva_rio': 'Cueva del Río (nacimiento)', 'gruta_mina': 'Gruta de La Mina', 'cueva_mar': 'Cueva del Mar',
           'bahia_bio': 'Bahía Bioluminiscente', 'aldea': 'Yucayeque taíno (aldea con batey)',
           'ruinas_bosque': 'Ruinas del Pacto (bosque de los meandros)', 'templo': 'Templo de la Niebla (secreto, noroeste)'}
POIS = [{'id': k, 'nombre': NOMBRES.get(k, k), 'pos': pt(*v) if k not in ('mirador',) else G(v[0], v[1], mp[2])} for k, v in ML.POI.items()]
POIS += [{'id': 'puente', 'nombre': 'Puente colgante', 'pos': G(mid[0], mid[1], br['zs'])},
         {'id': 'poza_honda', 'nombre': 'Poza Honda (misión de buceo)', 'pos': G(ph['x'], ph['y'], ph['nivel'])},
         {'id': 'poza_dajao', 'nombre': 'Poza del Dajao', 'pos': G(pd_['x'], pd_['y'], pd_['nivel'])},
         {'id': 'poza_la_mina', 'nombre': 'Poza y Cascada La Mina', 'pos': G(pm['x'], pm['y'], pm['nivel'])},
         {'id': 'charca_nubes', 'nombre': 'Charca de las Nubes (nace la quebrada)', 'pos': G(pc['x'], pc['y'], pc['nivel'])},
         {'id': 'playa', 'nombre': 'Playa y arrecife', 'pos': pt(170, -205)}]
for p in POIS:
    if p['id'] == 'luma': p['nombre'] = 'Luma (NPC)'
WATER = {
    'mar': {'nivel': 0.0, 'nota': 'plano infinito a y=0; laguna y arrecife al sur, caída a -9 m'},
    'rio': {'nota': 'polilínea [x, z, nivel, medioAncho]; nivel constante por tramos con saltos de 1 m', 'puntos':
            [[round(float(p[0]), 1), round(float(-p[1]), 1), round(float(l), 2), round(float(w), 2)] for p, l, w in zip(M.river[::2], M.river_L[::2], M.river_w[::2])]},
    'quebrada': {'nota': 'Quebrada de La Mina, misma forma', 'puntos':
                 [[round(float(p[0]), 1), round(float(-p[1]), 1), round(float(l), 2), round(float(w), 2)] for p, l, w in zip(M.creek, M.creek_L, M.creek_w)]},
    'pozas': [{'id': p['id'], 'x': round(p['x'], 1), 'z': round(-p['y'], 1), 'r': p['r'], 'nivel': p['nivel'], 'profundidad': p['prof']} for p in M.pools],
    'cascadas': CASC,
    'crecida': {'zona': {'x': LUG['A']['x'], 'z': LUG['A']['z'], 'r': 16}, 'nivel': round(LUG['A']['y'] + 1.1, 2),
                'nota': 'nivel del agua sobre el terreno A durante la crecida (FLOOD_LEVEL = A.base + 1.1)'},
    'bahiaBio': {'x': -160, 'z': 207, 'r': 24, 'nota': 'caleta del suroeste: estela azul al nadar de noche'},
}
FLIGHT = [
    {'id': 'salto_mirador', 'nombre': 'Del Mirador Yokahú a la playa', 'puntos': [G(14, -172, mp[2] + 14), G(80, -190, 26), G(150, -215, 12)]},
    {'id': 'rio_arriba', 'nombre': 'Río arriba hasta La Mina', 'puntos': [G(159, -135, 22), G(171, -50, 30), G(118, 46, 34), G(72, 96, 40)]},
    {'id': 'cumbre_cascada', 'nombre': 'De la cumbre a la Poza La Mina', 'puntos': [G(-32, 150, 120), G(30, 125, 80), G(72, 96, 30)]},
    {'id': 'costa_sur', 'nombre': 'Sobre el arrecife hasta la Bahía Bio', 'puntos': [G(150, -232, 10), G(0, -240, 14), G(-160, -215, 10)]},
]
UPDRAFT = [{'x': x, 'z': -y, 'r': r, 'fuerza': f, 'nota': n} for x, y, r, f, n in (
    (14, -172, 7, 6, 'torre del mirador'), (72, 104, 9, 8, 'neblina de La Mina'), (-32, 150, 14, 7, 'cumbre'),
    (100, 124, 10, 5, 'acantilado de las terrazas'), (198, 4, 10, 5, 'mesa de las ruinas'))]
ZONES = [
    {'id': 'costa', 'nombre': 'Playa, arrecife y muelle', 'bioma': 'costa', 'centro': G(150, -212), 'r': 70},
    {'id': 'villa', 'nombre': 'Villa Raíz y la Estación', 'bioma': 'llano costero', 'centro': G(155, -172), 'r': 40},
    {'id': 'meandros', 'nombre': 'Río de los Meandros (bosque de tabonuco)', 'bioma': 'tabonuco', 'centro': G(-60, 10), 'r': 170},
    {'id': 'colina', 'nombre': 'Colina del Mirador', 'bioma': 'tabonuco', 'centro': G(40, -178), 'r': 60},
    {'id': 'lomas', 'nombre': 'Lomas del Oeste y casita jíbara', 'bioma': 'tabonuco', 'centro': G(-110, -105), 'r': 80},
    {'id': 'terrazas', 'nombre': 'Terrazas de palma de sierra', 'bioma': 'palma de sierra', 'centro': G(80, 120), 'r': 90},
    {'id': 'la_mina', 'nombre': 'Cascada La Mina', 'bioma': 'palma de sierra', 'centro': G(72, 98), 'r': 25},
    {'id': 'nublado', 'nombre': 'Bosque enano y nublado', 'bioma': 'nublado', 'centro': G(-10, 185), 'r': 110, 'niebla': True},
    {'id': 'mesa_este', 'nombre': 'Mesa del Este y Cueva del Mar', 'bioma': 'costa rocosa', 'centro': G(205, 5), 'r': 40},
]
TR = {}
for tid, P in M.trails.items():
    Pq = ML.rdp(P[:, :2], 0.8); zq = bil(H, Pq[:, 0], Pq[:, 1])
    TR[tid] = [G(x, y, z) for (x, y), z in zip(Pq, zq)]
ROUND = ('bohio', 'casa_paja', 'cercado', 'mirador_escalonado', 'toldo', 'ruina_torre', 'ruina_pilar', 'ruina_altar')
for e in KEL:
    w_, h_, d_ = e['dim']; x, y, z = e['pos']
    if e['glb_n'] in ('muelle_troncos',):
        COLS.append({'estructura': e['id'], 'kit': 'kelvin', 'tipo': 'piso', 'x': x, 'z': z, 'hx': w_ / 2, 'hz': d_ / 2, 'rotY': e['rotY'], 'y': round(y + h_, 2)}); continue
    if e['glb_n'] == 'puente_madera':
        c, s_ = math.cos(e['rotY']), math.sin(e['rotY'])
        COLS.append({'estructura': e['id'], 'kit': 'kelvin', 'tipo': 'puente', 'a': [round(x - c * w_ / 2, 2), round(y + 0.3, 2), round(z + s_ * w_ / 2, 2)],
                     'b': [round(x + c * w_ / 2, 2), round(y + 0.3, 2), round(z - s_ * w_ / 2, 2)], 'ancho': d_ * 0.7, 'comba': 0.0, 'nota': 'ajustar y al piso real del modelo'}); continue
    if e['glb_n'] == 'canoa': continue
    if any(e['glb_n'].startswith(r_) for r_ in ROUND):
        COLS.append({'estructura': e['id'], 'kit': 'kelvin', 'tipo': 'cilindro', 'x': x, 'z': z, 'r': round(0.42 * min(w_, d_), 2), 'y0': y, 'y1': round(y + h_, 2)})
    else:
        COLS.append({'estructura': e['id'], 'kit': 'kelvin', 'tipo': 'caja', 'x': x, 'z': z, 'hx': round(w_ * 0.45, 2), 'hz': round(d_ * 0.45, 2), 'rotY': e['rotY'], 'y0': y, 'y1': round(y + h_, 2)})
POIS += [{'id': 'puente_dajao', 'nombre': 'Puente de madera de la Poza del Dajao', 'pos': G(float(PB2[0]), float(PB2[1]), zb2)}]
DPZ = {}
for zn in ZONES:
    cx_, cz_ = zn['centro'][0], zn['centro'][2]; m_ = np.hypot(FX - cx_, FY + cz_) < zn['r']
    if m_.sum(): DPZ[zn['id']] = {sp: round(float(DEN[sp][m_].mean()), 2) for sp in ML.SPECIES if DEN[sp][m_].mean() > 0.01}
# ruta de la gota: vapor desde la Poza Honda a la nube de la cumbre, lluvia en las bromelias, escorrentía por la quebrada y el río
cum = ML.POI['cumbre']; jr_ = int(np.argmin(np.hypot(M.river[:, 0] - M.creek[-1, 0], M.river[:, 1] - M.creek[-1, 1])))
ih_ = int(np.argmin(np.hypot(M.river[:, 0] - ph['x'], M.river[:, 1] - ph['y'])))
riv = [G(*M.river[i], float(M.river_L[i]) + 0.6) for i in range(jr_, ih_, 14)]
RUTA = {
    'nota': 'p5 vapor (volar), p6 lluvia + escorrentía (volar siguiendo el agua), p7 bucear en la poza; y = altura absoluta',
    'vapor': [G(ph['x'], ph['y'], ph['nivel'] + 1), G(150, -40, 45), G(80, 60, 75), G(cum[0], cum[1], hz(*cum) + 22)],
    'nube': {'x': cum[0], 'z': -cum[1], 'y': round(hz(*cum) + 22, 1), 'r': 22},
    'lluvia': [pt(-10, 170, 1.0), pt(8, 196, 0.6)],
    'escorrentia': [G(pc['x'], pc['y'], pc['nivel'] + 0.6)] + [G(*M.creek[i], float(M.creek_L[i]) + 0.6) for i in range(0, len(M.creek), 10)] + riv + [G(ph['x'], ph['y'], ph['nivel'] + 0.6)],
    'infiltracion': [pt(cum[0], cum[1], 0.5), G(-200, -60, 30), G(*M.river[2], float(M.river_L[2]) + 0.5)],
    'marcaCrecida': {'x': round(ph['x'] + ph['r'] + 0.8, 2), 'z': round(-ph['y'], 2), 'y': round(LUG['A']['y'] + 1.1, 2), 'nota': 'roca con la marca de crecida en la orilla de la Poza Honda'},
}
DATA = {
    'version': 1, 'nombre': 'Capítulo 1 · El Yunque', 'unidades': 'metros',
    'ejes': 'x = este, y = arriba, z = sur (como three.js). Origen en el centro de la isla. Mar a y = 0.',
    'origen': 'Relieve base: terreno original de Kelvin (04_Mapa_3D/AV3DMaxTerrainExport.max) escalado 0.255 m/u con su río serpenteante y sus mesetas; montaña en terrazas, costa, cauces y senderos encima (tools/blender/mapa_lib.py).',
    'tamano': {'x0': -ML.HALF, 'z0': -ML.HALF, 'ancho': 2 * ML.HALF, 'largo': 2 * ML.HALF, 'altMin': hmin, 'altMax': hmax},
    'recorrido': {'aPieSegundos': 180, 'volandoSegundos': 40, 'nota': 'muelle -> cumbre por senderos ~1.1 km a 6.5 m/s; isla de 470 m de norte a sur a 12 m/s'},
    'spawn': {'x': spawn[0], 'y': spawn[1], 'z': spawn[2], 'mirar': {'x': 0, 'z': -1}},
    'lugares': LUG,
    'pois': POIS,
    'misiones': {
        'POOL': {'x': round(ph['x'], 2), 'z': round(-ph['y'], 2), 'nivel': ph['nivel'], 'profundidad': ph['prof']},
        'perchas': [{'id': i, 'especie': sp, 'x': x, 'z': -y, 'y': round(hz(x, y) + h_, 2)} for i, sp, x, y, h_ in ML.PERCHAS],
        'rutaGota': RUTA,
        'BUSHES': [{'id': i, 'x': x, 'z': -y, 'song': s_} for i, x, y, s_ in ML.BUSHES],
        'FIELD': FIELD, 'RESOURCES': RES,
        'LUMA': {'x': ML.POI['luma'][0], 'z': -ML.POI['luma'][1]},
        'GUARD': {'x': 142, 'z': 166, 'casa': {'x': ML.POI['casita'][0], 'z': -ML.POI['casita'][1]}},
        'ISLANDS': [{'x': x, 'z': -y, 'r': r} for x, y, r in ML.ISLANDS],
        'markTrees': [{'x': x, 'z': -y, 's': s} for sp, x, y, s in ML.HEROES if sp == 'tabonuco'],
        'KEEP_CLEAR': 'usar flora.libre',
    },
    'agua': WATER,
    'estructuras': EST,
    'colocaciones': {k: {'pos': G(*PL[k][:3]), 'rotY': round(PL[k][3], 4), 'huella': {'refugio': [6.2, 5.1], 'casita': [3.2, 3.2], 'muelle': [1.5, 16], 'ruinas': [9, 7], 'mirador': [4.6, 4.6], 'puente': [span / 2, 1.2]}[k],
                         'respaldo': 'assets/models/mapa/%s.glb' % k,
                         'edificioKelvin': next(({'id': e['id'], 'glb': e['glb'], 'pos': e['pos'], 'rotY': e['rotY']} for e in KEL if e['rol'] == k), None),
                         'nota': {'puente': 'el kit no tiene un puente colgante de 25 m: se usa el propio; puente_madera va en la Poza del Dajao',
                                  'muelle': 'muelle_troncos x4 en fila (sin pilotes); el muelle propio tiene pilotes, farol y escalera',
                                  'casita': 'casa_paja_a es choza de paja; la casita jíbara propia (madera y zinc) es más fiel a la montaña boricua',
                                  'mirador': 'mirador_escalonado (11 m); la torre Yokahú propia es la referencia de El Yunque',
                                  'refugio': 'casa_plataforma; la estación propia trae la antena-transmisor de la historia'}.get(k, '')} for k in PL},
    'edificiosKelvin': [{k_: v for k_, v in e.items() if k_ != 'glb_n'} for e in KEL],
    'colisiones': COLS,
    'grutas': GR,
    'senderos': TR,
    'rutasVuelo': FLIGHT, 'corrientes': UPDRAFT, 'zonas': ZONES,
    'flora': {'especies': ML.SPECIES, **FL,
              'modelos': {'palma_sierra': {'kit': ['palma_sierra']}, 'yagrumo': {'kit': ['yagrumo']}, 'tabonuco': {'kit': ['tabonuco'], 'extra': 'hojarasca bajo la copa'},
                          'tabonuco_enano': {'kit': ['arbol_enano'], 'respaldo': {'kit': 'tabonuco', 'escala': 0.55}, 'nota': 'bosque enano de la cumbre; arbol_enano en producción'},
                          'helecho_gigante': {'kit': ['helecho_arboreo']}, 'ceiba': {'kit': ['ceiba']}, 'flamboyan': {'kit': ['flamboyan'], 'nota': 'introducido: solo en claros y pueblo'},
                          'bambu': {'kit': ['bambu'], 'nota': 'introducido: orillas'}, 'heliconia': {'kit': ['heliconia']}, 'bromelia': {'kit': ['bromelia']},
                          'helechos': {'kit': ['helecho_suelo']}, 'rocas': {'kit': ['roca_musgo_a', 'roca_musgo_b', 'piedras_rio'], 'nota': 'piedras_rio a menos de 4 m del agua; roca_musgo en el resto'},
                          'troncos': {'kit': ['tronco_caido']}},
              'densidadPorZona': DPZ,
              'variantes': [{'id': 'arbol_enano', 'especie': 'tabonuco_enano', 'uso': 'todo el bosque enano (y > 62 m)', 'mientras': 'tabonuco x0.55'},
                            {'id': 'palma_sierra_joven', 'especie': 'palma_sierra', 'uso': '30 % de las palmas a menos de 8 m del borde de una terraza', 'mientras': 'palma_sierra x0.6'},
                            {'id': 'yagrumo_joven', 'especie': 'yagrumo', 'uso': '40 % de los yagrumos junto a senderos y claros', 'mientras': 'yagrumo x0.55'}],
              'colorKit': 'COLOR_0 del kit = R AO, G peso de viento, B fase (no es color)',
              'extras': {'hojarasca': 'un parche de 2 m bajo cada tabonuco y ceiba', 'pasto': 'claros con densidad de árboles < 0.3 y explanadas (plaza, batey, terrenos A y B): 20 por 100 m2',
                         'impostores': 'árboles a más de 90 m como impostores (acordado entre programador gráfico y artista de entorno)'}},
    'terreno': {'trozos': CHUNKS, 'agua': 'assets/models/mapa/agua.glb', 'splat': 'COLOR_0 RGBA (unorm8): R pasto/musgo, G tierra, B roca, A arena; suman 1',
                'alturas': 'assets/data/mapa_cap1_altura.js', 'triangulos': int(len(T))},
}
HELP = r'''
// nivel del agua en (x, z): río, quebrada y pozas; -Infinity si no hay agua dulce (el mar está a 0)
D.nivelAguaEn = function (x, z) {
  var best = -Infinity, i, p, q, P, t, dx, dz, L2, px, pz, d;
  for (var w = 0; w < D.agua.pozas.length; w++) { p = D.agua.pozas[w]; if (Math.hypot(x - p.x, z - p.z) < p.r) best = Math.max(best, p.nivel); }
  var cs = [D.agua.rio.puntos, D.agua.quebrada.puntos];
  for (var c = 0; c < 2; c++) { P = cs[c];
    for (i = 0; i < P.length - 1; i++) { p = P[i]; q = P[i + 1];
      dx = q[0] - p[0]; dz = q[1] - p[1]; L2 = dx * dx + dz * dz || 1;
      t = Math.max(0, Math.min(1, ((x - p[0]) * dx + (z - p[1]) * dz) / L2)); px = p[0] + t * dx; pz = p[1] + t * dz;
      d = Math.hypot(x - px, z - pz); if (d < p[3] + t * (q[3] - p[3])) best = Math.max(best, t < 0.5 ? p[2] : q[2]); } }
  if (best === -Infinity && D.alturaEn && D.alturaEn(x, z) < 0) return 0;
  return best;
};
'''
js = '// Generado por tools/blender/mapa_build.py. No editar a mano.\n(function () {\nvar D = window.AV_MAPA_CAP1 = ' + json.dumps(DATA, ensure_ascii=False, separators=(',', ':')) + ';\n' + HELP + \
     'D.alturaEn = function (x, z) { return window.AV_MAPA_CAP1_ALTURA ? window.AV_MAPA_CAP1_ALTURA.alturaEn(x, z) : 0; };\n})();\n'
open(os.path.join(OUT_D, 'mapa_cap1.js'), 'w').write(js)
HJS = '''// Generado por tools/blender/mapa_build.py. Alturas del terreno del Cap. 1 muestreadas de la malla final.
(function () {
var A = window.AV_MAPA_CAP1_ALTURA = {nx: %d, nz: %d, x0: %s, z0: %s, paso: %s, min: %s, max: %s, formato: 'Uint16 little-endian, fila = z, columna = x; altura = min + v / 65535 * (max - min)',
  error: {medio: %.3f, p95: %.3f, max: %.3f}, datos: "%s"};
var bin = atob(A.datos), u8 = new Uint8Array(bin.length);
for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
var u16 = new Uint16Array(u8.buffer), k = (A.max - A.min) / 65535, h = new Float32Array(u16.length);
for (i = 0; i < u16.length; i++) h[i] = A.min + u16[i] * k;
A.alturas = h; A.datos = null;
A.alturaEn = function (x, z) {
  var fx = (x - A.x0) / A.paso, fz = (z - A.z0) / A.paso;
  fx = Math.max(0, Math.min(A.nx - 1.001, fx)); fz = Math.max(0, Math.min(A.nz - 1.001, fz));
  var ix = fx | 0, iz = fz | 0, tx = fx - ix, tz = fz - iz, o = iz * A.nx + ix;
  return (h[o] * (1 - tx) + h[o + 1] * tx) * (1 - tz) + (h[o + A.nx] * (1 - tx) + h[o + A.nx + 1] * tx) * tz;
};
A.normalEn = function (x, z) {
  var e = A.paso, dx = A.alturaEn(x + e, z) - A.alturaEn(x - e, z), dz = A.alturaEn(x, z + e) - A.alturaEn(x, z - e), l = Math.hypot(dx, 2 * e, dz);
  return {x: -dx / l, y: 2 * e / l, z: -dz / l};
};
})();
''' % (nh, nh, -ML.HALF, -ML.HALF, HM_STEP, hmin, hmax, *HM_ERR, base64.b64encode(Q16.tobytes()).decode())
open(os.path.join(OUT_D, 'mapa_cap1_altura.js'), 'w').write(HJS)
# resumen
tot = 0; totb = 0
for f in sorted(os.listdir(OUT_M)):
    sz = os.path.getsize(os.path.join(OUT_M, f))
    if f.endswith('.glb'): tot += sz
    else: totb += sz
    print('   %-26s %8.1f KB' % (f, sz / 1024))
for f in ('mapa_cap1.js', 'mapa_cap1_altura.js'):
    sz = os.path.getsize(os.path.join(OUT_D, f)); tot += sz; print('   %-26s %8.1f KB' % (f, sz / 1024))
log('TOTAL glb + datos: %.2f MB; copias base64: %.2f MB' % (tot / 1048576, totb / 1048576))
log('senderos (largo m, p90 %, máx %)', M.trail_grades)
