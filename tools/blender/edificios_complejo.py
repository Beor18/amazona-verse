# Pipeline de edificios de Kelvin: complejo_ruinas reconstruido. Ver docs/EDIFICIOS.md § Ciudad completa.
"""El complejo de ruinas (Group001 del .max: LargeG, LargeH, LargeJ, 8 MediumC y TowerE) llegó al migrado sin las
traslaciones de sus piezas: todos los templos quedaron apilados en el origen con giros distintos (de ahí la «masa rota»
del juego, también en el ligero por vóxeles). Las traslaciones sí están en el inventario de la migración
(_trabajo_claude/av_max/assets.json, members[].local, unidades de Max con Z arriba), así que aquí se rehace:

  p_max = local · (C · v_migrado)   (C: de Y arriba a Z arriba; v_migrado es el vértice del GLB migrado, sin su nodo)
  p_web = (x, z, -y) · 0,3048 + d   (d: el mismo pivote de la instancia k049 en x y z; la base, sobre la loma)

y se generan las tres versiones con la geometría y la UV originales: _hd (edificios_hd.py, atlas), el ligero (≤ 12 000
tris, paleta del kit y sus colisiones) y el lejano (color de vértice). La escena (assets/data/escena_kelvin_cap1.json) no
cambia: la corrección va en el modelo y en conversion.json (M del complejo).

Blender -b --python edificios_complejo.py -- [--base 35.75] [--out DIR] [--kit] [--sin-hd]   (--kit: escribe kit.js y conversion.json)
"""
import bpy, sys, os, json, math, base64, struct, re
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import edificios_hd as H

REPO = os.path.normpath(os.path.join(HERE, '../..'))
ED = os.path.normpath(H.OUT)                              # --out (por defecto assets/models/edificios)
TEX = os.path.join(REPO, 'assets/models/edificios/tex')
INVENTARIO = os.path.expanduser('~/AmazonaVerse/_trabajo_claude/av_max/assets.json')
ESCENA = os.path.join(REPO, 'assets/data/escena_kelvin_cap1.json')
ASSET, NOMBRE = 'ancient_complejo_group001', 'complejo_ruinas'
U = 0.3048
C = np.array([[1, 0, 0], [0, 0, 1], [0, -1, 0]], float)
BASE = float(H.A.get('base', 35.75))      # m: cota de las losas de la loma (losa_piedra, y1 ≈ 35,8)
# Ajuste a la loma del juego (más pequeña que la del .max; decisión delegada por Kelvin, 25-oct): fuera los tres templos
# del borde oeste que quedaban en el aire sobre la ladera, 4 m al este (con 2 m libres hasta el mirador) y la base de los
# templos (mediana de sus bases) a ras de las losas. Los oscuros (mudDarkM, floorDarkM) van a su versión clara: el
# complejo se veía casi negro a contraluz y en el render de 2022 es color crema.
QUITAR = {'MediumC#007', 'MediumC#008', 'TowerE'}
ESTE = 4.0
CLARO = {'mudDarkM': 'mudM', 'floorDarkM': 'floorM'}
LIGERO, LEJOS = 12000, 1200   # el complejo son 12 templos: más que el ≤ 5 000 de un edificio; el lejano, cerca de los ≤ 600 (entra en la descarga inicial)
# paleta del kit ligero (tex/kb3d_*.jpg) para cada material original
PALETA = {'stoneM': 'stoneM', 'blocksL': 'stoneM', 'bricksM': 'stoneM', 'decoM': 'stoneM', 'sculptM': 'stoneM', 'rockM': 'stoneM',
          'wallM': 'wallL', 'wallL': 'wallL', 'pillarsM': 'pillarsM', 'floorM': 'floorM', 'floorDarkM': 'floorM',
          'mudM': 'mudM', 'mudDarkM': 'mudM', 'damageM': 'mudM', 'damageL': 'mudM', 'beams': 'beams'}


def piezas_corregidas():
    a = [e for e in json.load(open(INVENTARIO)) if e['id'] == ASSET][0]
    mem = {m['name']: m for m in a['members']}
    j, acc = H.leer_glb(os.path.join(H.MIG, ASSET + '.glb'))
    out = []
    for nd in j['nodes']:
        g = re.match(r'(Component_)?([A-Za-z]+?)_', nd['name']).group(2)
        if g == 'MediumC':
            g += '#' + nd['name'][-3:]
        if g in QUITAR:
            continue
        L = np.array(mem[nd['name']]['local'], float)
        for pr in j['meshes'][nd['mesh']]['primitives']:
            V = acc(pr['attributes']['POSITION']).astype(float)
            UV = acc(pr['attributes']['TEXCOORD_0']).astype(float)
            I = acc(pr['indices']).reshape(-1, 3).astype(np.int64)
            W = ((V @ C.T) @ L[:3, :3].T + L[:3, 3]) * U
            G = np.stack([W[:, 0], W[:, 2], -W[:, 1]], 1)
            if np.linalg.det(L[:3, :3]) < 0:
                I = I[:, [0, 2, 1]]
            if not np.isfinite(G).all():
                continue
            m = j['materials'][pr['material']]['name'].replace('KB3D_', '')
            out.append((CLARO.get(m, m), G, UV, I, g))
    return out


def colocar(ps):
    """Desplazamiento d en el espacio del modelo: misma x y z del grupo que en el migrado y la base sobre la loma."""
    inst = [i for z in json.load(open(ESCENA))['zonas'] for i in z['instancias'] if i.get('modelo') == NOMBRE][0]
    s, mt, gt = inst['matriz'][0], inst['matriz'][12:15], inst['matrizMigrado'][12:15]
    bases = {}
    for _, P, _, _, g in ps:
        bases[g] = min(bases.get(g, np.inf), P[:, 1].min())
    ymin = float(np.median(list(bases.values())))
    d = np.array([(gt[0] - mt[0] + ESTE) / s, (BASE - mt[1]) / s - ymin, (gt[2] - mt[2]) / s])
    return [(m, P + d, UV, I) for m, P, UV, I, _ in ps], d, inst


def unir(obs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    if len(obs) > 1:
        bpy.ops.object.join()
    return bpy.context.view_layer.objects.active


def esquinas(ob):
    """Datos por esquina de los triángulos: vértice, posición, normal, UV y material."""
    me = ob.data
    me.calc_loop_triangles()
    nt = len(me.loop_triangles)
    lt = np.empty(nt * 3, np.int32)
    me.loop_triangles.foreach_get('loops', lt)
    mi = np.empty(nt, np.int32)
    me.loop_triangles.foreach_get('material_index', mi)
    nl = len(me.loops)
    vi = np.empty(nl, np.int32)
    me.loops.foreach_get('vertex_index', vi)
    co = np.empty(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get('co', co)
    cn = np.empty(nl * 3, np.float32)
    me.corner_normals.foreach_get('vector', cn)
    uv = np.zeros(nl * 2, np.float32)
    if me.uv_layers:
        me.uv_layers[0].data.foreach_get('uv', uv)
    return dict(lt=lt, mi=np.repeat(mi, 3), vi=vi, co=co.reshape(-1, 3), cn=cn.reshape(-1, 3), uv=uv.reshape(-1, 2),
                mats=[m.name for m in me.materials])


def glb(path, clave, prims, materiales, imagenes):
    """GLB sin comprimir (la build lo comprime y pasa tex/ a WebP): prims = [(attrs {nombre: array}, idx, material)]."""
    partes, vistas, accs, off = [], [], [], 0

    def vista(arr, target):
        nonlocal off
        b = arr.tobytes()
        pad = (-len(b)) % 4
        vistas.append({'buffer': 0, 'byteOffset': off, 'byteLength': len(b), 'target': target})
        partes.append(b + b'\0' * pad)
        off += len(b) + pad
        return len(vistas) - 1
    gp = []
    for attrs, idx, mat in prims:
        at = {}
        for k, arr in attrs.items():
            arr = arr.astype(np.float32)
            a = {'bufferView': vista(arr, 34962), 'componentType': 5126, 'count': len(arr), 'type': {2: 'VEC2', 3: 'VEC3', 4: 'VEC4'}[arr.shape[1]]}
            if k == 'POSITION':
                a['min'], a['max'] = arr.min(0).tolist(), arr.max(0).tolist()
            accs.append(a)
            at[k] = len(accs) - 1
        ix = idx.astype(np.uint16 if len(attrs['POSITION']) < 65536 else np.uint32).ravel()
        accs.append({'bufferView': vista(ix, 34963), 'componentType': 5123 if ix.dtype == np.uint16 else 5125, 'count': len(ix), 'type': 'SCALAR'})
        gp.append({'attributes': at, 'indices': len(accs) - 1, 'material': mat})
    binc = b''.join(partes)
    js = {'asset': {'version': '2.0', 'generator': 'AmazonaVerse edificios_complejo.py'}, 'scene': 0, 'scenes': [{'nodes': [0]}],
          'nodes': [{'mesh': 0, 'name': clave}], 'meshes': [{'name': clave, 'primitives': gp}], 'materials': materiales,
          'accessors': accs, 'bufferViews': vistas, 'buffers': [{'byteLength': len(binc)}]}
    if imagenes:
        js['images'] = [{'uri': u, 'name': os.path.basename(u)[:-4]} for u in imagenes]
        js['textures'] = [{'source': i, 'sampler': 0} for i in range(len(imagenes))]
        js['samplers'] = [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}]
    jb = json.dumps(js, separators=(',', ':')).encode()
    jb += b' ' * ((-len(jb)) % 4)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(jb) + 8 + len(binc)))
        f.write(struct.pack('<II', len(jb), 0x4E4F534A) + jb)
        f.write(struct.pack('<II', len(binc), 0x004E4942) + binc)
    out = open(path, 'rb').read()
    open(path[:-4] + '_glb.js', 'w').write('(window.AV_EDIFICIOS_B64=window.AV_EDIFICIOS_B64||{})["%s"]="%s";\n' % (clave, base64.b64encode(out).decode('ascii')))
    return len(out), os.path.getsize(path[:-4] + '_glb.js')


def ligero(obs):
    """Modelo ligero: paleta del kit (tex/kb3d_*.jpg) con la UV original, un primitivo por material de la paleta."""
    ob = unir(list(obs.values()))
    E = esquinas(ob)
    pal = np.array([PALETA.get(m, 'stoneM') for m in E['mats']])[E['mi']]  # material de la paleta de cada esquina
    nombres = sorted(set(pal))
    prims, mats, imgs = [], [], []
    for k, p in enumerate(nombres):
        sel = np.nonzero(pal == p)[0]               # triángulos-esquina de este material
        lt = E['lt'][sel]
        clave = np.concatenate([E['vi'][lt][:, None].astype(np.float64), np.round(E['cn'][lt] * 1e4), np.round(E['uv'][lt] * 1e5)], 1)
        _, pri, inv = np.unique(clave, axis=0, return_index=True, return_inverse=True)
        s = lt[pri]
        n = E['cn'][s] / np.maximum(1e-8, np.linalg.norm(E['cn'][s], axis=1))[:, None]
        prims.append(({'POSITION': E['co'][E['vi'][s]], 'NORMAL': n, 'TEXCOORD_0': E['uv'][s]}, inv.reshape(-1, 3), k))
        mats.append({'name': 'KB3D_' + p, 'doubleSided': True, 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0.0,
                     'roughnessFactor': 0.9, 'baseColorTexture': {'index': k}}})
        imgs.append('tex/kb3d_%s.jpg' % p.lower())
    kb = glb(os.path.join(ED, NOMBRE + '.glb'), NOMBRE, prims, mats, imgs)
    return ob, dict(tris=int(len(E['lt']) // 3), mats=['KB3D_' + p for p in nombres], kb=kb)


def color_medio(p):
    import OpenImageIO as oiio
    b = oiio.ImageBuf(os.path.join(TEX, 'kb3d_%s.jpg' % p.lower()))
    c = b.get_pixels(oiio.FLOAT)[:, :, :3].reshape(-1, 3).mean(0)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)  # sRGB → lineal (COLOR_0)


def lejos(ob):
    """Lejano: el ligero con grosor, remallado por vóxeles (la silueta de conjunto, sin astillas) y reducido; el color de
    vértice es el medio de la textura de la cara del ligero más cercana."""
    from mathutils.bvhtree import BVHTree
    lo = ob.copy()
    lo.data = ob.data.copy()
    lo.modifiers.clear()
    bpy.context.scene.collection.objects.link(lo)
    co = np.array([v.co[:] for v in ob.data.vertices])
    diag = float(np.linalg.norm(co.max(0) - co.min(0)))
    bpy.context.view_layer.objects.active = lo
    for tipo, ajuste in (('SOLIDIFY', dict(thickness=0.35, offset=0.0)), ('REMESH', dict(mode='VOXEL', voxel_size=diag / 220))):
        md = lo.modifiers.new(tipo.lower(), tipo)
        for k, v in ajuste.items():
            setattr(md, k, v)
        bpy.ops.object.modifier_apply(modifier=md.name)
    for _ in range(3):  # el colapso no baja de un 2 % por pasada
        if H.colapsar(lo, LEJOS) <= LEJOS:
            break
    H.quitar_islas(lo, int(LEJOS * 0.97), protege=0.002)  # astillas sueltas del colapso
    lo.data.shade_smooth()
    me = lo.data
    me.materials.clear()
    bvh = BVHTree.FromObject(ob, bpy.context.evaluated_depsgraph_get())
    pal = [PALETA.get(m.name, 'stoneM') for m in ob.data.materials]
    cols = np.array([color_medio(p) for p in pal])
    mi = np.empty(len(ob.data.polygons), np.int32)
    ob.data.polygons.foreach_get('material_index', mi)
    E = esquinas(lo)
    lt = E['lt']
    v = E['vi'][lt]
    nv = len(E['co'])
    vc = np.zeros((nv, 3))
    for k in np.unique(v):
        _, _, cara, _ = bvh.find_nearest(E['co'][k])
        vc[k] = cols[mi[cara]] if cara is not None else cols[0]
    acc = vc
    cnt = (np.bincount(v, minlength=nv) > 0).astype(np.int64)
    usados = np.nonzero(cnt)[0]
    mapa = -np.ones(nv, np.int64)
    mapa[usados] = np.arange(len(usados))
    col = acc[usados]
    nrm = np.zeros((nv, 3))
    np.add.at(nrm, v, E['cn'][lt])
    nrm = nrm[usados] / np.maximum(1e-8, np.linalg.norm(nrm[usados], axis=1))[:, None]
    I = mapa[v].reshape(-1, 3)
    mats = [{'name': 'AV_Lejos', 'doubleSided': True, 'pbrMetallicRoughness': {'baseColorFactor': [0.8, 0.8, 0.8, 1], 'metallicFactor': 0.0, 'roughnessFactor': 0.95}}]
    kb = glb(os.path.join(ED, NOMBRE + '_lejos.glb'), NOMBRE + '_lejos', [({'POSITION': E['co'][usados], 'NORMAL': nrm, 'COLOR_0': col}, I, 0)], mats, [])
    return dict(tris=int(len(I)), kb=kb)


def main():
    ps, d, inst = colocar(piezas_corregidas())
    H.log('complejo: d =', np.round(d, 3).tolist(), 'piezas', len(ps))
    # 1. _hd con el atlas (comprimido como los demás _hd)
    if not H.A.get('sin-hd'):
        H.limpiar()
        obs, t0, _ = H.reducir(NOMBRE, ps, H.PRESUPUESTO[NOMBRE])
        hd = H.exportar(list(obs.values()), NOMBRE, 'ancient')
        H.log('hd', json.dumps(hd))
    # 2. ligero y 3. lejano
    H.limpiar()
    obs, _, _ = H.reducir(NOMBRE, ps, LIGERO)
    ob, li = ligero(obs)
    le = lejos(ob)
    H.log('ligero', json.dumps(li), 'lejos', json.dumps(le))
    P = np.concatenate([P for _, P, _, _ in ps])
    if H.A.get('kit'):
        p = os.path.join(ED, 'kit.js')
        s = open(p).read()
        i = s.index('window.AV_EDIFICIOS_KIT = ') + len('window.AV_EDIFICIOS_KIT = ')
        j = s.rindex(';')
        kit = json.loads(s[i:j])
        mn, mx = hd['min'], hd['max']
        corners = np.array([[x, y, z] for x in (mn[0], mx[0]) for y in (mn[1], mx[1]) for z in (mn[2], mx[2])])
        kit[NOMBRE].update(tris=li['tris'], trisLejos=le['tris'], lejos=True, radio=round(float(np.linalg.norm(corners, axis=1).max()), 2),
                           alto=round(float(mx[1]), 2), kb=round(li['kb'][1] / 1024, 1), kbLejos=round(le['kb'][1] / 1024, 1),
                           mats=li['mats'], hd=True, trisHD=hd['tris'], kbHD=hd['kbJs'])
        open(p, 'w').write(s[:i] + json.dumps(kit, ensure_ascii=False, separators=(',', ':')) + s[j:])
        cp = os.path.join(ED, 'conversion.json')
        conv = json.load(open(cp))
        e = conv['assets'][ASSET]
        e['M'] = [1.0, 0, 0, 0, 0, 1.0, 0, 0, 0, 0, 1.0, 0, round(float(d[0]), 5), round(float(d[1]), 5), round(float(d[2]), 5), 1.0]
        e['c'] = [round(float(-d[0]), 4), round(float(-d[1]), 4), round(float(-d[2]), 4)]
        e['nota'] = ('reconstruido (tools/blender/edificios_complejo.py): el migrado perdió las traslaciones de las piezas del grupo; '
                     'web = M · p, con p = las piezas recolocadas con members[].local del inventario (no el GLB migrado tal cual)')
        json.dump(conv, open(cp, 'w'), indent=1, ensure_ascii=False)
        H.log('kit.js y conversion.json')


if __name__ == '__main__':
    main()
