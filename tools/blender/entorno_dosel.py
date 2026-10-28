# Dosel por celdas (AW3, MAPA_PLAN_COMPLETO.md F1.2): el tercer nivel de los árboles. Una manta de copas fundidas sobre el
# bosque, horneada aquí y no en el juego: por cada celda de 32 m, ~200–400 triángulos con color de vértice, unos 50 k para
# toda la isla. La dibuja src/engine/dosel.js de 90 m en adelante (una sola llamada, recortada por celdas) y sustituye a los
# impostores sueltos a más de 250 m.
#   taskpolicy -b nice -n 15 ~/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python tools/blender/entorno_dosel.py
# Entradas: las alturas (assets/data/mapa_cap1_altura.js), la flora del mapa (assets/data/mapa_cap1.js: densidad de árboles y
# máscara «libre», sin sendas, agua ni edificios) y la máscara de MultiScatter de Kelvin ($AV_MAX_WORK_TERRENO/trees.bmp, ver
# mapa_original_diag.py; la misma que usa el bosque lleno de AW2). Si falta trees.bmp, solo la densidad del mapa.
# Salida: assets/data/dosel_cap1.js (AV_DOSEL_CAP1; y dosel_cap1_bajo.js, más simplificado, para «bajo»): vértices Uint16 (1/64 m), color sRGB Uint8, índices Uint16 ordenados por
# celda, la altura de cada vértice sobre el suelo (Uint8, dm) y la tabla de celdas [ix, iz, primer índice, nº de índices, y mín, y máx]. Blender pone la malla y la simplifica
# (Decimate) hasta el objetivo de triángulos; el color se recalcula después a partir de la posición.
import os, sys, re, json, base64
import numpy as np
import bpy

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from mapa_original_diag import bmp, bilin, WORK, ROOT

CELDA = 32.0            # m por celda del dosel (16 cuadros de la rejilla de alturas, 2 m)
OBJ_TRIS = 50000        # triángulos para toda la isla tras simplificar (medio y alto)
OBJ_TRIS_BAJO = 16000   # y para la calidad «bajo» (assets/data/dosel_cap1_bajo.js, AV_DOSEL_CAP1_BAJO): ya va justa de triángulos
ALTO = ((24, 9.5), (64, 7.0), (999, 4.5))   # altura del dosel sobre el suelo por cota (copas algo por debajo de los árboles reales)
S_K, HALF = 0.255, 264.0
TEPUY = dict(x=-25.0, z=-160.0, rx=135.0, rz=105.0, borde=0.3, ciudad=8.0)   # BL1: como TEPUY en src/engine/terreno.js

def leer_altura():
    t = open(os.path.join(ROOT, 'assets', 'data', 'mapa_cap1_altura.js'), encoding='utf-8').read()
    num = lambda k: float(re.search(r'\b%s:\s*(-?[\d.]+)' % k, t).group(1))
    nx, nz = int(num('nx')), int(num('nz'))
    v = np.frombuffer(base64.b64decode(re.search(r'datos:\s*"([^"]+)"', t).group(1)), '<u2').reshape(nz, nx)
    return num('min') + v / 65535.0 * (num('max') - num('min')), num('x0'), num('z0'), num('paso')

def leer_mapa():
    t = open(os.path.join(ROOT, 'assets', 'data', 'mapa_cap1.js'), encoding='utf-8').read()
    i = t.index('window.AV_MAPA_CAP1 =') + len('window.AV_MAPA_CAP1 =')
    return json.JSONDecoder().raw_decode(t[i:].lstrip())[0]

def bits(b64, n):
    u = np.frombuffer(base64.b64decode(b64), np.uint8)
    return np.unpackbits(u, bitorder='little')[:n].astype(bool)

def caja(a, r):
    """media en una ventana (2r+1)² con bordes replicados"""
    p = np.pad(a.astype(np.float32), r, mode='edge'); c = p.cumsum(0).cumsum(1); c = np.pad(c, ((1, 0), (1, 0)))
    k = 2 * r + 1
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)

def ruido(nz, nx, paso, semilla):
    """ruido de valor suave (paso en vértices), 0..1"""
    g = np.random.default_rng(semilla).random((nz // paso + 3, nx // paso + 3))
    zz, xx = np.mgrid[0:nz, 0:nx] / paso
    return bilin(g, xx + 0.5, zz + 0.5)

def mascara(H, x0, z0, paso, M):
    nz, nx = H.shape
    FD = M['flora']; LB = FD['libre']
    assert LB['celda'] == paso and LB['nx'] == nx and LB['nz'] == nz and LB['x0'] == x0, 'libre y alturas no coinciden'
    # «libre» va por celdas de 2 m (celda i = [x0+2i, x0+2i+2)); el vértice i está en x0+2i: le vale la celda que empieza ahí
    libre = bits(LB['bits'], nx * nz).reshape(nz, nx)
    gx, gz = np.meshgrid(x0 + np.arange(nx) * paso, z0 + np.arange(nz) * paso)
    # densidad de árboles del mapa (celdas de 8 m): hay árboles hoy
    arb = np.zeros((FD['nz'], FD['nx']))
    for k in ('tabonuco', 'yagrumo', 'palma_sierra', 'helecho_gigante', 'ceiba', 'flamboyan', 'bambu', 'tabonuco_enano'):
        if k in FD['densidad']: arb += np.frombuffer(base64.b64decode(FD['densidad'][k]), np.uint8).reshape(FD['nz'], FD['nx'])
    ix = np.clip(((gx - FD['x0']) / FD['celda']).astype(int), 0, FD['nx'] - 1); iz = np.clip(((gz - FD['z0']) / FD['celda']).astype(int), 0, FD['nz'] - 1)
    bosque = arb[iz, ix] > 0
    # máscara de Kelvin (negro = sin árboles), misma correspondencia que bosque_mascara.py y mapa_sendas_kelvin.py
    p = os.path.join(WORK, 'trees.bmp')
    if os.path.exists(p):
        T = bmp(p); Xu = gx / S_K; Yu = -gz / S_K
        x0u, x1u, y0u, y1u = -896.0, 896.0, -960.0, 960.0
        dentro = (Xu >= x0u) & (Xu <= x1u) & (Yu >= y0u) & (Yu <= y1u)
        Tm = bilin(T, (1 - (Xu - x0u) / (x1u - x0u)) * (T.shape[1] - 1), (Yu - y0u) / (y1u - y0u) * (T.shape[0] - 1))
        bosque |= np.where(dentro, Tm >= 70, False)
    else:
        print('AVISO: sin %s; dosel solo con la densidad del mapa' % p)
    gy, gxx = np.gradient(H, paso); ny = 1 / np.sqrt(1 + gy ** 2 + gxx ** 2)
    m = bosque & libre & (H >= 0.8) & (ny >= 0.72)
    # BL1: selva del tepuy (misma elipse que src/engine/terreno.js): bosque en la cima y las laderas alrededor de la gran ciudad,
    # hasta ~57° de pendiente, fuera de las piezas de las ruinas (escenaKelvin) con su margen y de sendas y agua (libre)
    T = TEPUY; d = np.hypot((gx - T['x']) / T['rx'], (gz - T['z']) / T['rz'])
    zona = np.clip((1 - d) / T['borde'], 0, 1) > 0.35
    for g in M.get('escenaKelvin', {}).get('compacto', []):
        if 'ruinas' not in g.get('grupo', ''): continue
        for t in g['inst']:
            px, pz = (t[12], t[14]) if len(t) >= 16 else (t[0], t[2])
            zona &= np.hypot(gx - px, gz - pz) >= T['ciudad'] + 3
    m |= zona & libre & (H >= 4) & (ny >= 0.55)
    # sin motas sueltas: el vértice queda si al menos 5 de sus 9 vecinos son bosque
    return m & (caja(m, 1) >= 5 / 9 - 1e-3)

COPA = 7.0              # m entre copas: patrón de copas sueltas (celdas con un punto al azar) que se funden en la manta

def copas(x, z):
    """0..1: lo alto de la copa más cercana en (x, z) (1 en su centro, 0 en el hueco entre copas)"""
    gx, gz = np.floor(x / COPA), np.floor(z / COPA); d = np.full(x.shape, 9e9)
    for ox in (-1, 0, 1):
        for oz in (-1, 0, 1):
            cx, cz = gx + ox, gz + oz
            h = np.sin(cx * 127.1 + cz * 311.7) * 43758.5453; jx = h - np.floor(h)
            h = np.sin(cx * 269.5 + cz * 183.3) * 43758.5453; jz = h - np.floor(h)
            h = np.sin(cx * 419.2 + cz * 371.9) * 43758.5453; r = 0.55 + 0.35 * (h - np.floor(h))   # radio relativo de cada copa
            d = np.minimum(d, np.hypot(x - (cx + 0.15 + 0.7 * jx) * COPA, z - (cz + 0.15 + 0.7 * jz) * COPA) / (r * COPA))
    return np.sqrt(np.clip(1 - d * d, 0, 1))

def color(x, z, y, Hs, hc, borde, cota):
    """color sRGB 0..255 a partir de la posición (se recalcula tras simplificar)"""
    hueco = np.array([20, 40, 22.]); medio = np.array([44, 80, 36.]); claro = np.array([88, 122, 50.]); niebla = np.array([58, 80, 64.])
    b = copas(x, z)[:, None]                                                       # hueco oscuro, copa clara
    n = (np.sin(x * 0.071 + z * 0.043) * np.sin(z * 0.057 - x * 0.029) * 0.5 + 0.5)[:, None]   # manchas de especies, a gran escala
    k = (np.sin(x * 1.7 + z * 2.3) * 0.5 + 0.5)[:, None]                           # una copa clara o rojiza de vez en cuando
    top = medio * (1 - n) + claro * n
    c = hueco * (1 - b) + top * b
    c = np.where(k > 0.97, c * np.array([1.25, 1.05, 0.8]), c)
    c = c * (1 - np.clip(borde, 0, 1)[:, None] * 0.35)                           # la falda del borde, en sombra
    t = np.clip((cota - 55) / 30, 0, 1)[:, None]                                   # bosque enano de la niebla: gris verdoso
    return np.clip(c * (1 - t * 0.55) + niebla * t * 0.55, 0, 255)

def main(objetivo=OBJ_TRIS, nombre='dosel_cap1', glob='AV_DOSEL_CAP1'):
    H, x0, z0, paso = leer_altura(); M = leer_mapa()
    nz, nx = H.shape
    m = mascara(H, x0, z0, paso, M)
    f = caja(m, 3)                                                   # fracción de bosque cerca: copas más bajas en el borde
    alto = np.select([H < a for a, _ in ALTO], [h for _, h in ALTO])
    rr = ruido(nz, nx, 3, 11) * 0.6 + ruido(nz, nx, 9, 12) * 0.4
    gx, gz = np.meshgrid(x0 + np.arange(nx) * paso, z0 + np.arange(nz) * paso)
    borde = np.clip((f - 0.35) / 0.6, 0, 1); borde = borde * borde * (3 - 2 * borde)
    hc = alto * (0.8 + 0.35 * rr) * (0.25 + 0.75 * borde)
    Yc = H + hc * (0.62 + 0.38 * copas(gx, gz))                     # copas con bulto: los huecos entre copas, más bajos
    # el borde baja al suelo del bosque vecino (no al pie del risco: sin cortinas colgando)
    nm = caja(m, 1); Hf = np.where(nm > 0, caja(np.where(m, H, 0), 1) / np.maximum(nm, 1e-6), H)
    Y = np.where(m, Yc, np.where(nm > 0, np.minimum(H, Hf) - 0.6, H - 1.5))
    # cuadros con algún vértice de bosque
    q = m[:-1, :-1] | m[1:, :-1] | m[:-1, 1:] | m[1:, 1:]
    qz, qx = np.nonzero(q)
    usados = np.zeros((nz, nx), bool)
    for dz, dx in ((0, 0), (0, 1), (1, 0), (1, 1)): usados[qz + dz, qx + dx] = True
    vid = -np.ones((nz, nx), np.int64); vid[usados] = np.arange(usados.sum())
    verts = np.stack([gx[usados], -gz[usados], Y[usados]], 1)       # Blender: z arriba, y = -z del juego
    a, b, c, d = vid[qz, qx], vid[qz, qx + 1], vid[qz + 1, qx + 1], vid[qz + 1, qx]
    caras = np.stack([a, d, c, b], 1)                                # normal hacia arriba en Blender
    print('rejilla %dx%d, bosque %.1f %%, %d vértices, %d tris antes' % (nx, nz, 100 * m.mean(), len(verts), 2 * len(caras)))

    bpy.ops.wm.read_factory_settings(use_empty=True)
    me = bpy.data.meshes.new('dosel'); me.from_pydata(verts.tolist(), [], caras.tolist()); me.update()
    ob = bpy.data.objects.new('dosel', me); bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    tri = ob.modifiers.new('tri', 'TRIANGULATE')
    bpy.ops.object.modifier_apply(modifier=tri.name)
    dec = ob.modifiers.new('dec', 'DECIMATE'); dec.decimate_type = 'COLLAPSE'; dec.ratio = min(1.0, objetivo / (2 * len(caras)))
    dec.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=dec.name)
    me = ob.data
    V = np.empty(len(me.vertices) * 3, np.float32); me.vertices.foreach_get('co', V); V = V.reshape(-1, 3)
    me.calc_loop_triangles()
    F = np.empty(len(me.loop_triangles) * 3, np.int64); me.loop_triangles.foreach_get('vertices', F); F = F.reshape(-1, 3)
    # al juego: x, y (arriba), z
    P = np.stack([V[:, 0], V[:, 2], -V[:, 1]], 1)
    # (x, y, z) del juego = (X, Z, -Y) de Blender: es una rotación, el giro de los triángulos no cambia
    # quitar triángulos enteros bajo el suelo (falda que quedó sola)
    fx = np.clip((P[:, 0] - x0) / paso, 0, nx - 1.001); fz = np.clip((P[:, 2] - z0) / paso, 0, nz - 1.001)
    Hs = bilin(H, fx, fz)
    bajo = P[:, 1] < Hs + 0.3
    F = F[~bajo[F].all(1)]
    # color desde la posición
    hcv = bilin(hc, fx, fz); fv = bilin(f, fx, fz)
    col = color(P[:, 0], P[:, 2], P[:, 1], Hs, hcv, 1 - fv, Hs)
    # celdas de 32 m: cada triángulo a la celda de su centro; índices ordenados por celda
    cen = P[F].mean(1)
    ncx = int(np.ceil(2 * HALF / CELDA))
    cx = np.clip(((cen[:, 0] + HALF) // CELDA).astype(int), 0, ncx - 1); cz = np.clip(((cen[:, 2] + HALF) // CELDA).astype(int), 0, ncx - 1)
    orden = np.argsort(cx + cz * ncx, kind='stable'); F = F[orden]; cid = (cx + cz * ncx)[orden]
    celdas = []
    for k in np.unique(cid):
        s = np.nonzero(cid == k)[0]; ys = P[F[s].ravel(), 1]
        celdas.append([int(k % ncx), int(k // ncx), int(s[0] * 3), int(len(s) * 3), round(float(ys.min()), 1), round(float(ys.max()), 1)])
    # compactar vértices usados
    usadosV = np.unique(F); remap = -np.ones(len(P), np.int64); remap[usadosV] = np.arange(len(usadosV))
    alt = np.clip(np.round((P[:, 1] - Hs) * 10), 0, 255).astype(np.uint8)   # altura sobre el suelo (dm): el juego hunde el dosel en el anillo cercano
    P = P[usadosV]; col = col[usadosV]; alt = alt[usadosV]; F = remap[F]
    assert len(P) < 65536, 'demasiados vértices para Uint16'
    q0 = np.array([-HALF, -20.0, -HALF], np.float32)
    Q = np.clip(np.round((P - q0) * 64), 0, 65535).astype('<u2')
    b64 = lambda a: base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()
    porCelda = [c[3] // 3 for c in celdas]
    js = ('// Generado por tools/blender/entorno_dosel.py (AW3, dosel por celdas de 32 m). No editar a mano.\n'
          'window.%s = %s;\n' % (glob, json.dumps({
              'celda': CELDA, 'x0': -HALF, 'z0': -HALF, 'ncx': ncx, 'origen': q0.tolist(), 'escala': 1 / 64,
              'vertices': len(P), 'triangulos': len(F),
              'nota': 'pos: Uint16 x,y,z (origen + v*escala); col: Uint8 sRGB; alt: Uint8 altura sobre el suelo en dm; idx: Uint16; celdas: [ix, iz, primer índice, nº índices, y mín, y máx]',
              'celdas': celdas, 'pos': b64(Q), 'col': b64(col.round().astype(np.uint8)), 'alt': b64(alt), 'idx': b64(F.astype('<u2'))}, separators=(',', ':'))))
    out = os.path.join(ROOT, 'assets', 'data', nombre + '.js')
    open(out, 'w', encoding='utf-8').write(js)
    print('dosel: %d vértices, %d tris, %d celdas (%d–%d tris por celda, mediana %d), %d KB -> %s' % (
        len(P), len(F), len(celdas), min(porCelda), max(porCelda), int(np.median(porCelda)), len(js) // 1024, out))

main()
main(OBJ_TRIS_BAJO, 'dosel_cap1_bajo', 'AV_DOSEL_CAP1_BAJO')
