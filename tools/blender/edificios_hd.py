# Pipeline de edificios de Kelvin: versión cercana de alta fidelidad (<modelo>_hd). Ver docs/EDIFICIOS.md § Ciudad completa.
"""Modelos _hd desde el migrado fiel (04_Mapa_3D/migrado, solo lectura): geometría y UV originales de KitBash3D, sin
remallado por vóxeles, con las sogas y los escombros de Savage; las texturas originales del kit en un atlas 4x4
(edificios_hd_atlas.py: hd_ancient, hd_savage) y un único material AV_HD_<Kit> (un draw call por modelo). La UV2 (TEXCOORD_1) es el origen de la celda del material; el shader
de streaming.js envuelve la UV original con fract() dentro de esa celda. Mismo pivote que el modelo ligero
(conversion.json: web = M · p_migrado). Solo se reduce lo que pasa del presupuesto: disolución plana que respeta UV y
material, y colapso por material (los de pocos triángulos quedan enteros).

Blender -b --python edificios_hd.py -- --ids templo_grande_a,ruina_torre --out <assets/models/edificios> [--mig DIR] [--kit]
  --kit: añade hd, trisHD y kbHD a kit.js (AV_EDIFICIOS_KIT). --crudo: sin gltfpack (por defecto el _hd se guarda ya
  comprimido con las mismas opciones que la build, tools/build/bin/gltfpack: el repo pesa ~4 veces menos).
"""
import bpy, bmesh, sys, os, json, struct, math, time, base64
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from edificios_hd_atlas import KITS, N as NATLAS

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
A = {}
k = None
for a in argv:
    if a.startswith('--'):
        k = a[2:]
        A[k] = True
    elif k:
        A[k] = a
        k = None
OUT = A.get('out') or os.path.join(HERE, '../../assets/models/edificios')
MIG = A.get('mig') or os.path.expanduser('~/AmazonaVerse/04_Mapa_3D/migrado')
IDS = [x for x in str(A.get('ids', '')).split(',') if x]

# Presupuesto de triángulos por modelo (lo que no llega se deja entero)
PRESUPUESTO = {
    'complejo_ruinas': 40000, 'templo_grande': 20000, 'templo_grande_a': 18000, 'templo_grande_d': 20000,
    'templo_grande_e': 20000, 'templo_grande_f': 20000, 'templo_mediano': 13000, 'templo_mediano_f': 13000,
    'templo_mediano_g': 13000, 'templo_mediano_h': 15000, 'muro_templo': 8000,
}
DEFECTO = 12000
DEFECTO_SAVAGE = 7000  # aldeas: muchas instancias y modelos; las sogas y los escombros vuelven sin pasar de ~200 KB por modelo
SOGA = 'Rope'
PRESUPUESTO.update({'empalizada': 3000, 'muelle_troncos': 3000, 'bohio_redondo': 6000, 'bohio_puntiagudo': 6000,
                    'monumento_a': 9000, 'puente_madera': 9000, 'torre_vigia': 8000, 'muralla_atalaya_a': 8000})
# Materiales orgánicos (barro, escombro, roca, talla, soga, lona, paja, corteza): normales suaves y se reducen antes que la
# arquitectura (piedra labrada, muros, pilares, suelos, frisos, vigas, tablas), que guarda aristas vivas y casi todo su detalle.
ORGANICO = {'mudM', 'mudDarkM', 'damageM', 'damageL', 'rockM', 'sculptM',
            'MudRocky', 'RockSharp', 'RockSmooth', 'Rope', 'TarpFabricDamaged', 'RoofThatched', 'BarkNew', 'BarkCharred'}
GLTFPACK = os.path.join(HERE, '../build/bin/gltfpack')
# mismas opciones que la build (tools/build/config.json, geometria.opciones): el repo guarda el _hd ya comprimido
GLTFPACK_OPC = ['-c', '-ce', 'ext', '-kn', '-km', '-ke', '-kv', '-tr', '-vtf', '-vn', '10', '-af', '0', '-ac', '-ar', '16']
CELDA, MARGEN = 512, 16   # deben coincidir con edificios_hd_atlas.py y con el shader de streaming.js


def kit_de(asset):
    return 'savage' if asset.startswith('savage_') else 'ancient'


def log(*a):
    print('[hd]', *a, flush=True)


# ---------------------------------------------------------------- GLB del migrado (numpy)
CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def leer_glb(p):
    b = open(p, 'rb').read()
    n = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + n])
    o = 20 + n
    bl = struct.unpack('<I', b[o:o + 4])[0]
    binc = b[o + 8:o + 8 + bl]

    def acc(i):
        a = j['accessors'][i]
        bv = j['bufferViews'][a['bufferView']]
        off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        dt, kk = CT[a['componentType']], NC[a['type']]
        st = bv.get('byteStride', 0)
        isz = np.dtype(dt).itemsize * kk
        if st and st != isz:
            raw = np.frombuffer(binc, np.uint8, count=st * a['count'], offset=off).reshape(a['count'], st)[:, :isz]
            return raw.copy().view(dt).reshape(a['count'], kk)
        return np.frombuffer(binc, dt, count=a['count'] * kk, offset=off).reshape(a['count'], kk)
    return j, acc


def matriz_nodo(nd):
    if 'matrix' in nd:
        return np.array(nd['matrix'], float).reshape(4, 4).T
    T = np.eye(4)
    x, y, z, w = nd.get('rotation', [0, 0, 0, 1])
    R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                  [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                  [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    T[:3, :3] = R * np.array(nd.get('scale', [1, 1, 1]), float)
    T[:3, 3] = nd.get('translation', [0, 0, 0])
    return T


def piezas(p, M):
    """[(material, pos (n,3) en el espacio web, uv (n,2), tris (m,3))] del GLB migrado, con web = M · p."""
    j, acc = leer_glb(p)
    W = {}

    def walk(i, P):
        Mi = P @ matriz_nodo(j['nodes'][i])
        W[i] = Mi
        for c in j['nodes'][i].get('children', []):
            walk(c, Mi)
    for sc in j.get('scenes', []):
        for r in sc['nodes']:
            walk(r, np.eye(4))
    out = []
    for ni, nd in enumerate(j['nodes']):
        if 'mesh' not in nd or ni not in W:
            continue
        T = M @ W[ni]
        for pr in j['meshes'][nd['mesh']]['primitives']:
            P = acc(pr['attributes']['POSITION']).astype(np.float64)
            P = (np.c_[P, np.ones(len(P))] @ T.T)[:, :3]
            uv = acc(pr['attributes']['TEXCOORD_0']).astype(np.float64) if 'TEXCOORD_0' in pr['attributes'] else np.zeros((len(P), 2))
            I = acc(pr['indices']).reshape(-1, 3).astype(np.int64) if 'indices' in pr else np.arange(len(P)).reshape(-1, 3)
            if np.linalg.det(T[:3, :3]) < 0:  # nodo en espejo (el complejo): sin esto se ven las caras de atrás
                I = I[:, [0, 2, 1]]
            nom = j['materials'][pr['material']]['name'].replace('KB3D_', '') if 'material' in pr else 'stoneM'
            if not np.isfinite(P).all():
                continue
            out.append((nom, P, uv, I))
    return out


# ---------------------------------------------------------------- Blender
def limpiar():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def objeto(nombre, P, UV, I):
    """Malla de Blender en el espacio glTF (sin cambio de ejes: solo se reduce y se exporta a mano)."""
    me = bpy.data.meshes.new(nombre)
    me.vertices.add(len(P))
    me.vertices.foreach_set('co', P.astype(np.float32).ravel())
    nt = len(I)
    me.loops.add(nt * 3)
    me.loops.foreach_set('vertex_index', I.astype(np.int32).ravel())
    me.polygons.add(nt)
    me.polygons.foreach_set('loop_start', (np.arange(nt, dtype=np.int32) * 3))
    uvl = me.uv_layers.new(name='UV')
    uvl.data.foreach_set('uv', UV[I.ravel()].astype(np.float32).ravel())
    me.update(calc_edges=True)
    me.validate(clean_customdata=False)
    ob = bpy.data.objects.new(nombre, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def tris(ob):
    ob.data.calc_loop_triangles()
    return len(ob.data.loop_triangles)


def preparar(ob):
    """Suelda los vértices repetidos (la UV va por esquina y se conserva) y disuelve lo plano sin cruzar costuras de UV."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=1e-5)
    bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(1.0), use_dissolve_boundaries=False,
                             verts=bm.verts, edges=bm.edges, delimit={'UV', 'NORMAL'})
    bmesh.ops.triangulate(bm, faces=bm.faces, quad_method='BEAUTY', ngon_method='BEAUTY')
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.update()


def islas(me):
    """Etiqueta de pieza suelta (componente conexa) de cada polígono: unión por aristas con saltos de puntero (numpy)."""
    nv = len(me.vertices)
    ev = np.empty(len(me.edges) * 2, np.int64)
    me.edges.foreach_get('vertices', ev)
    a, b = ev[0::2], ev[1::2]
    lab = np.arange(nv)
    while True:
        m = np.minimum(lab[a], lab[b])
        nuevo = lab.copy()
        np.minimum.at(nuevo, a, m)
        np.minimum.at(nuevo, b, m)
        nuevo = nuevo[nuevo]
        if np.array_equal(nuevo, lab):
            break
        lab = nuevo
    ls = np.empty(len(me.polygons), np.int64)
    me.polygons.foreach_get('loop_start', ls)
    vi = np.empty(len(me.loops), np.int64)
    me.loops.foreach_get('vertex_index', vi)
    return lab[vi[ls]]


def quitar_islas(ob, objetivo, protege=0.02):
    """Escombro: quita las piezas sueltas más pequeñas (por área) hasta entrar en el objetivo; nunca una de más del 2 %."""
    me = ob.data
    t = tris(ob)
    if t <= objetivo or not len(me.polygons):
        return t
    isl = islas(me)
    ar = np.empty(len(me.polygons), np.float64)
    me.polygons.foreach_get('area', ar)
    nt = np.empty(len(me.polygons), np.int64)
    me.polygons.foreach_get('loop_total', nt)
    nt = nt - 2
    u, inv = np.unique(isl, return_inverse=True)
    A = np.bincount(inv, weights=ar)
    T = np.bincount(inv, weights=nt)
    fuera, sobra = set(), t - objetivo
    for k in np.argsort(A):
        if sobra <= 0 or A[k] > protege * A.sum():
            break
        fuera.add(k)
        sobra -= T[k]
    if not fuera:
        return t
    quitar = np.isin(inv, list(fuera))
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.faces[i] for i in np.nonzero(quitar)[0]], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.to_mesh(me)
    bm.free()
    me.update()
    return tris(ob)


def colapsar(ob, objetivo, organico=False):
    t = tris(ob)
    if t <= objetivo:
        return t
    if organico:  # el escombro denso son muchas piezas sueltas que el colapso no puede juntar
        t = quitar_islas(ob, int(objetivo * 2.5))
        if t <= objetivo:
            return t
    md = ob.modifiers.new('dec', 'DECIMATE')
    md.decimate_type = 'COLLAPSE'
    md.ratio = max(0.02, objetivo / t)
    md.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.ops.object.modifier_apply(modifier=md.name)
    return tris(ob)


def area(ob):
    me = ob.data
    a = np.empty(len(me.polygons), np.float32)
    me.polygons.foreach_get('area', a)
    return float(a.sum())


def repartir(cuentas, areas, total, minimo=600):
    """Presupuesto por material, a cántaros: cada uno recibe según su área (la arquitectura pesa 3 veces más); el que no
    llena su parte queda entero y lo que sobra pasa a los demás. Así se reduce sobre todo el escombro denso."""
    if sum(cuentas.values()) <= total:
        return dict(cuentas)
    peso = {m: max(areas[m], 1e-3) * (1 if m in ORGANICO else 3) for m in cuentas}
    if SOGA in peso and len(peso) > 1:  # las sogas tienen poca área pero dan la vida: casi un tercio del presupuesto
        peso[SOGA] = 0.4 * sum(v for m, v in peso.items() if m != SOGA)
    libres, out, T = dict(cuentas), {}, float(total)
    while libres:
        W = sum(peso[m] for m in libres)
        parte = {m: T * peso[m] / W for m in libres}
        llenos = [m for m in libres if parte[m] >= libres[m]]
        if not llenos:
            for m in libres:
                out[m] = max(min(minimo, libres[m]), int(parte[m]))
            break
        for m in llenos:
            out[m] = libres.pop(m)
            T -= out[m]
    return out


# ---------------------------------------------------------------- GLB de salida
def escribir_glb(path, P, Nn, UV, UV2, I, nombre, kit):
    P = P.astype(np.float32)
    Nn = Nn.astype(np.float32)
    UV = UV.astype(np.float32)
    UV2 = UV2.astype(np.float32)
    idx = I.astype(np.uint16 if len(P) < 65536 else np.uint32).ravel()
    partes, vistas, accs = [], [], []
    off = 0

    def vista(arr, target):
        nonlocal off
        b = arr.tobytes()
        pad = (-len(b)) % 4
        vistas.append({'buffer': 0, 'byteOffset': off, 'byteLength': len(b), 'target': target})
        partes.append(b + b'\0' * pad)
        off += len(b) + pad
        return len(vistas) - 1
    for arr, tipo in ((P, 'VEC3'), (Nn, 'VEC3'), (UV, 'VEC2'), (UV2, 'VEC2')):
        a = {'bufferView': vista(arr, 34962), 'componentType': 5126, 'count': len(arr), 'type': tipo}
        if arr is P:
            a['min'] = P.min(0).tolist()
            a['max'] = P.max(0).tolist()
        accs.append(a)
    accs.append({'bufferView': vista(idx, 34963), 'componentType': 5123 if idx.dtype == np.uint16 else 5125,
                 'count': len(idx), 'type': 'SCALAR'})
    binc = b''.join(partes)
    js = {
        'asset': {'version': '2.0', 'generator': 'AmazonaVerse edificios_hd.py'},
        'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'mesh': 0, 'name': nombre}],
        'meshes': [{'name': nombre, 'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1, 'TEXCOORD_0': 2, 'TEXCOORD_1': 3},
                                                     'indices': 4, 'material': 0}]}],
        'materials': [{'name': 'AV_HD_' + kit.capitalize(), 'doubleSided': True, 'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicFactor': 0.0, 'roughnessFactor': 1.0},
                       'normalTexture': {'index': 1}}],
        'textures': [{'sampler': 0, 'source': 0}, {'sampler': 0, 'source': 1}],
        'images': [{'uri': 'tex_hd/hd_%s.jpg' % kit, 'mimeType': 'image/jpeg'}, {'uri': 'tex_hd/hd_%s_n.jpg' % kit, 'mimeType': 'image/jpeg'}],
        'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 33071, 'wrapT': 33071}],
        'accessors': accs, 'bufferViews': vistas, 'buffers': [{'byteLength': len(binc)}],
    }
    jb = json.dumps(js, separators=(',', ':')).encode()
    jb += b' ' * ((-len(jb)) % 4)
    total = 12 + 8 + len(jb) + 8 + len(binc)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total))
        f.write(struct.pack('<II', len(jb), 0x4E4F534A) + jb)
        f.write(struct.pack('<II', len(binc), 0x004E4942) + binc)
    crudo = os.path.getsize(path)
    if os.path.exists(GLTFPACK) and not A.get('crudo'):
        import subprocess
        tmp = path[:-4] + '.tmp.glb'
        r = subprocess.run([GLTFPACK, '-i', path, '-o', tmp] + GLTFPACK_OPC, capture_output=True, text=True)
        if r.returncode == 0 and os.path.exists(tmp):
            os.replace(tmp, path)
        else:
            log('  gltfpack falló, queda sin comprimir:', (r.stderr or '')[-200:])
    clave = os.path.basename(path)[:-4]
    jsp = path[:-4] + '_glb.js'
    open(jsp, 'w').write('(window.AV_EDIFICIOS_B64=window.AV_EDIFICIOS_B64||{})["%s"]="%s";\n' % (clave, base64.b64encode(open(path, 'rb').read()).decode('ascii')))
    return os.path.getsize(path), os.path.getsize(jsp), crudo


def exportar(obs, nombre, kit):
    """Une las piezas, normales con aristas vivas a 40°, y vértices únicos por (vértice, normal, UV, material)."""
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    if len(obs) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
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
    co = co.reshape(-1, 3)
    cn = np.empty(nl * 3, np.float32)
    me.corner_normals.foreach_get('vector', cn)
    cn = cn.reshape(-1, 3)
    uv = np.empty(nl * 2, np.float32)
    me.uv_layers[0].data.foreach_get('uv', uv)
    uv = uv.reshape(-1, 2)
    # material de cada esquina: el de su triángulo
    mats = [m.name for m in me.materials]
    mloop = np.repeat(mi, 3)
    orden = KITS[kit]['orden']
    sin = [m for m in mats if m not in orden]
    if sin:
        log('  materiales sin celda (van a la primera):', sin)
    celda = np.array([orden.index(m) if m in orden else 0 for m in mats], np.int32)[mloop]
    uv2 = np.stack([(celda % NATLAS) / NATLAS, (celda // NATLAS) / NATLAS], 1).astype(np.float32)
    clave = np.concatenate([vi[lt][:, None].astype(np.float64), np.round(cn[lt] * 1e4), np.round(uv[lt] * 1e5), celda[:, None]], 1)
    _, primero, inv = np.unique(clave, axis=0, return_index=True, return_inverse=True)
    sel = lt[primero]
    P = co[vi[sel]]
    Nn = cn[sel]
    Nn /= np.maximum(1e-8, np.linalg.norm(Nn, axis=1))[:, None]
    I = inv.reshape(-1, 3)
    path = os.path.join(OUT, nombre + '_hd.glb')
    kb, jskb, crudo = escribir_glb(path, P, Nn, uv[sel], uv2[primero], I, nombre + '_hd', kit)
    return dict(tris=int(len(I)), verts=int(len(P)), kb=round(kb / 1024, 1), kbJs=round(jskb / 1024, 1), kbCrudo=round(crudo / 1024, 1),
                min=P.min(0).round(3).tolist(), max=P.max(0).round(3).tolist())


def origen(nombre, conv):
    cand = [(a, v) for a, v in conv['assets'].items() if v.get('web') == nombre]
    cand.sort(key=lambda x: ('_v' in x[0], x[0]))
    if not cand:
        raise KeyError('sin asset migrado para ' + nombre)
    a, v = cand[0]
    return a, np.array(v['M'], float).reshape(4, 4).T


def construir(nombre, conv):
    limpiar()
    asset, M = origen(nombre, conv)
    ps = piezas(os.path.join(MIG, asset + '.glb'), M)
    obs, t0, cuentas = reducir(nombre, ps, PRESUPUESTO.get(nombre, DEFECTO_SAVAGE if kit_de(asset) == 'savage' else DEFECTO))
    rec = exportar(list(obs.values()), nombre, kit_de(asset))
    rec.update(id=nombre, src=asset, trisOrigen=t0, trisTrasPlano=sum(cuentas.values()), mats=sorted(obs))
    return rec


def reducir(nombre, ps, presupuesto):
    """Piezas → un objeto por material, soldado, disuelto en lo plano y reducido al presupuesto, con sus normales."""
    por = {}
    for m, P, UV, I in ps:
        por.setdefault(m, []).append((P, UV, I))
    obs = {}
    for m, lst in por.items():
        off, Ps, UVs, Is = 0, [], [], []
        for P, UV, I in lst:
            Ps.append(P)
            UVs.append(UV)
            Is.append(I + off)
            off += len(P)
        ob = objeto(nombre + '_' + m, np.concatenate(Ps), np.concatenate(UVs), np.concatenate(Is))
        mat = bpy.data.materials.get(m) or bpy.data.materials.new(m)
        ob.data.materials.append(mat)
        preparar(ob)
        obs[m] = ob
    t0 = sum(len(I) for _, _, _, I in ps)
    cuentas = {m: tris(o) for m, o in obs.items()}
    meta = repartir(cuentas, {m: area(o) for m, o in obs.items()}, presupuesto)
    for m, o in obs.items():
        org = m in ORGANICO and m != SOGA  # cada soga es una pieza suelta pequeña: se reduce, no se quita
        for _ in range(3):  # el colapso no baja de un 2 % por pasada (las sogas de Savage tienen cientos de miles de tris)
            if colapsar(o, meta[m], org) <= meta[m] * 1.3:
                break
        if tris(o) > meta[m] * 1.3 and org:
            quitar_islas(o, meta[m])
    for m, o in obs.items():
        o.data.shade_smooth()
        o.data.set_sharp_from_angle(angle=math.radians(180 if m in ORGANICO else 40))
    return obs, t0, cuentas


def kit_js(recs):
    p = os.path.join(OUT, 'kit.js')
    s = open(p).read()
    i = s.index('window.AV_EDIFICIOS_KIT = ') + len('window.AV_EDIFICIOS_KIT = ')
    j = s.rindex(';')
    kit = json.loads(s[i:j])
    for r in recs:
        if r['id'] in kit:
            kit[r['id']].update(hd=True, trisHD=r['tris'], kbHD=r['kbJs'])
    open(p, 'w').write(s[:i] + json.dumps(kit, ensure_ascii=False, separators=(',', ':')) + s[j:])


if __name__ == '__main__':
    conv = json.load(open(A.get('conv') or os.path.join(HERE, '../../assets/models/edificios/conversion.json')))
    recs = []
    for n in IDS:
        t = time.time()
        try:
            r = construir(n, conv)
            r['s'] = round(time.time() - t, 1)
            recs.append(r)
            log('OK', json.dumps(r))
        except Exception as e:
            import traceback
            traceback.print_exc()
            log('ERROR', n, repr(e))
    if A.get('kit') and recs:
        kit_js(recs)
        log('kit.js', len(recs))
    rp = os.path.join(A.get('informe') or OUT, '_hd_%d.json' % int(time.time())) if A.get('informe') else None
    if rp:
        json.dump(recs, open(rp, 'w'), indent=1)
