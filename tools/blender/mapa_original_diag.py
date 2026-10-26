# Diagnóstico «mapa completo» (docs/equipo/MAPA_COMPLETO.md): el terreno original de Kelvin (AV3DMaxTerrainExport.max) frente al
# mapa del Cap. 1. Sin bpy ni 3ds Max: numpy + lectura por streaming del .max (edificios_maxscene). Python de Blender, con -I:
#   taskpolicy -b nice -n 15 <python de Blender> -I tools/blender/mapa_original_diag.py
# Entradas: el .max (malla TerrainBuilderSurface), WORK/Amazonas/maps/trees.psd convertido a BMP con
#   sips -s format bmp trees.psd --out $AV_MAX_WORK_TERRENO/trees.bmp   (máscara de MultiScatter: negro = sin árboles)
# y los datos del juego (assets/data/mapa_cap1*.js, escena_kelvin_cap1.json). Salidas: docs/img/mapa_original_vs_juego*.png + cifras.
import os, sys, json, struct, zlib, base64
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
MAX = os.path.expanduser('~/AmazonaVerse/04_Mapa_3D/AV3DMaxTerrainExport.max')
WORK = os.environ.get('AV_MAX_WORK_TERRENO', os.path.expanduser('~/AmazonaVerse/_trabajo_claude/av_max_terreno'))
S_K, V_K = 0.255, 0.30          # como mapa_lib: metros por unidad (horizontal y vertical)
OUT = os.path.join(ROOT, 'docs', 'img')

# ------------------------------------------------------------------ PNG mínimo
def png(path, rgb):
    rgb = np.ascontiguousarray(np.clip(rgb, 0, 255).astype(np.uint8)); h, w, _ = rgb.shape
    raw = b''.join(b'\x00' + rgb[i].tobytes() for i in range(h))
    ch = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + ch(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + ch(b'IDAT', zlib.compress(raw, 9)) + ch(b'IEND', b''))

def bmp(p):
    b = open(p, 'rb').read(); off = struct.unpack_from('<I', b, 10)[0]; w, h = struct.unpack_from('<ii', b, 18); bpp = struct.unpack_from('<H', b, 28)[0]
    rs = ((w * bpp // 8) + 3) // 4 * 4
    a = np.frombuffer(b, np.uint8, offset=off, count=rs * abs(h)).reshape(abs(h), rs)[:, :w * bpp // 8].reshape(abs(h), w, bpp // 8)
    return (a[::-1] if h > 0 else a)[..., :3].mean(-1)

def js_obj(path, marker):
    t = open(path, encoding='utf-8').read(); i = t.index(marker) + len(marker) - 1
    return json.JSONDecoder().raw_decode(t[i:])[0]

# ------------------------------------------------------------------ 1. el .max: nodos y terreno
def leer_max():
    from edificios_maxscene import Scene
    idx = os.path.join(WORK, 'index.npz')
    sc = Scene(MAX, idx if os.path.exists(idx) else None)
    if not os.path.exists(idx): os.makedirs(WORK, exist_ok=True); sc.si.save(idx)
    nodos = []
    terreno = None
    for i in sc.nodes():
        ni = sc.node_info(i)
        base, mods = sc.resolve_object(ni['obj']) if ni['obj'] is not None else (None, [])
        d = dict(nombre=ni['name'], clase=sc.clsname(base) if base is not None else None, modificadores=mods)
        if d['clase'] == 'Editable Poly':
            m = sc.mesh(base); M = sc.prs_matrix(ni['prs']) @ ni['offset']
            with np.errstate(all='ignore'): v = (M[:3, :3] @ m['verts'].T).T + M[:3, 3]
            d.update(vertices=len(v), caras=len(m['fs']), min=v.min(0).round(1).tolist(), max=v.max(0).round(1).tolist())
            if ni['name'] == 'TerrainBuilderSurface': terreno = v
        nodos.append(d)
    xs = np.unique(terreno[:, 0].round(2)); ys = np.unique(terreno[:, 1].round(2))
    K = np.zeros((len(ys), len(xs))); K[np.searchsorted(ys, terreno[:, 1].round(2)), np.searchsorted(xs, terreno[:, 0].round(2))] = terreno[:, 2]
    return nodos, K, (xs[0], xs[-1], ys[0], ys[-1])

# ------------------------------------------------------------------ muestreo
def bilin(G, fx, fy):
    ny, nx = G.shape; fx = np.clip(fx, 0, nx - 1.001); fy = np.clip(fy, 0, ny - 1.001)
    x0 = fx.astype(int); y0 = fy.astype(int); tx = fx - x0; ty = fy - y0
    return (G[y0, x0] * (1 - tx) + G[y0, x0 + 1] * tx) * (1 - ty) + (G[y0 + 1, x0] * (1 - tx) + G[y0 + 1, x0 + 1] * tx) * ty

def hillshade(H, px):
    gy, gx = np.gradient(H, px)
    n = np.dstack([-gx, gy, np.ones_like(H)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
    L = np.array([-0.5, 0.6, 0.65]); L /= np.linalg.norm(L)
    return np.clip(n @ L, 0, 1)

def colorear(H, sh, mar):
    c = np.zeros(H.shape + (3,))
    stops = [(0, (70, 120, 60)), (8, (95, 145, 70)), (20, (120, 150, 80)), (40, (150, 140, 100)), (70, (160, 150, 135)), (100, (235, 235, 230))]
    for (a, ca), (b, cb) in zip(stops[:-1], stops[1:]):
        t = np.clip((H - a) / (b - a), 0, 1)[..., None]; sel = (H >= a)[..., None]
        c = np.where(sel, np.array(ca) * (1 - t) + np.array(cb) * t, c)
    c = c * (0.45 + 0.75 * sh[..., None])
    return np.where(mar[..., None], np.array([60, 120, 170]) * (0.85 + 0.15 * sh[..., None]), c)

def linea(img, m, color):
    e = m & ~(np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1))
    e = e | np.roll(e, 1, 0) | np.roll(e, 1, 1)
    img[e] = color

def main():
    nodos, K, ext = leer_max()
    x0u, x1u, y0u, y1u = ext
    stats = {'nodos': nodos, 'terreno_unidades': [x1u - x0u, y1u - y0u], 'terreno_m_juego': [round((x1u - x0u) * S_K, 1), round((y1u - y0u) * S_K, 1)],
             'alturas_unidades': [float(K.min()), float(K.max())]}
    T = bmp(os.path.join(WORK, 'trees.bmp'))                       # 1792 filas x 1921 columnas
    # juego
    import re
    ta = open(os.path.join(ROOT, 'assets/data/mapa_cap1_altura.js')).read()
    A = {k: float(re.search(k + r': (-?[0-9.]+)', ta).group(1)) for k in ('nx', 'nz', 'x0', 'z0', 'paso', 'min', 'max')}
    A['nx'], A['nz'] = int(A['nx']), int(A['nz']); A['datos'] = re.search(r'datos: "([^"]+)"', ta).group(1)
    raw = base64.b64decode(A['datos']); Hg = A['min'] + np.frombuffer(raw, '<u2').reshape(A['nz'], A['nx']) / 65535 * (A['max'] - A['min'])
    D = js_obj(os.path.join(ROOT, 'assets/data/mapa_cap1.js'), 'AV_MAPA_CAP1 = {')
    E = json.load(open(os.path.join(ROOT, 'assets/data/escena_kelvin_cap1.json')))
    edif = np.array([[ins['matrizMigrado'][12], ins['matrizMigrado'][14]] for z in E['zonas'] for ins in z['instancias'] if 'matrizMigrado' in ins] or [[0, 0]])

    PX = 0.5; R0 = 270.0; n = int(2 * R0 / PX)
    ax = -R0 + (np.arange(n) + 0.5) * PX
    gx, gz = np.meshgrid(ax, ax)                                    # fila = z (norte arriba: z negativo)
    Xu = gx / S_K; Yu = -gz / S_K                                    # unidades del .max (Y norte)
    dentro = (Xu >= x0u) & (Xu <= x1u) & (Yu >= y0u) & (Yu <= y1u)
    Ko = bilin(K, (Xu - x0u) / (x1u - x0u) * (K.shape[1] - 1), (Yu - y0u) / (y1u - y0u) * (K.shape[0] - 1))
    Ho = np.where(dentro, Ko * V_K, -3.0)
    rio_o = dentro & (Ko < 2.0)
    # máscara de árboles: filas = Y (fila 0 al sur), columnas = X invertida (ajuste 0,80 con el cauce; ver MAPA_COMPLETO.md)
    tr = (Yu - y0u) / (y1u - y0u) * (T.shape[0] - 1); tc = (1 - (Xu - x0u) / (x1u - x0u)) * (T.shape[1] - 1)
    Tm = bilin(T, tc, tr)
    sin_arb = dentro & (Tm < 70)
    claros = sin_arb & ~np.where(dentro, bilin((K < 3).astype(float), (Xu - x0u) / (x1u - x0u) * (K.shape[1] - 1), (Yu - y0u) / (y1u - y0u) * (K.shape[0] - 1)) > 0.05, False)
    Hj = bilin(Hg, (gx - A['x0']) / A['paso'], (gz - A['z0']) / A['paso'])
    tierra_j = Hj > 0.3

    # cifras
    a = PX * PX
    area_o = dentro.sum() * a; area_j = tierra_j.sum() * a
    stats.update(
        area_original_m2=round(area_o), area_isla_m2=round(area_j),
        original_cubierto_por_isla=round((dentro & tierra_j).sum() / dentro.sum(), 3),
        original_bajo_el_mar_en_juego=round((dentro & ~tierra_j).sum() / dentro.sum(), 3),
        isla_fuera_del_original=round((tierra_j & ~dentro).sum() / tierra_j.sum(), 3),
        rio_original_m2=round(rio_o.sum() * a), sin_arboles_frac=round(sin_arb.sum() / dentro.sum(), 3), claros_frac=round(claros.sum() / dentro.sum(), 3))
    dif = np.where(dentro & tierra_j, Hj - Ho, np.nan)
    stats['relieve_igual_±3m'] = round(float(np.nanmean(np.abs(dif) <= 3)), 3)
    stats['relieve_subido_>3m'] = round(float(np.nanmean(dif > 3)), 3)
    stats['relieve_bajado_>3m'] = round(float(np.nanmean(dif < -3)), 3)
    # río: longitud de la línea central (mapa_lib.kelvin_river, ya en metros de juego) y ancho medio = área / longitud
    from mapa_lib import kelvin_river
    Rl = kelvin_river(K); L = float(np.sum(np.linalg.norm(np.diff(Rl, axis=0), axis=1)))
    stats['rio_original_largo_m'] = round(L); stats['rio_original_ancho_m'] = round(rio_o.sum() * a / L, 1)
    rj = np.array(D['agua']['rio']['puntos']); Lj = float(np.sum(np.hypot(np.diff(rj[:, 0]), np.diff(rj[:, 1]))))
    stats['rio_juego_largo_m'] = round(Lj); stats['rio_juego_ancho_m'] = round(float(2 * rj[:, 3].mean()), 1)

    # ---- imagen 1: original completo | juego (misma escala, 0,5 m/px, ±270 m)
    sh_o = hillshade(Ho, PX); img_o = colorear(Ho, sh_o, ~dentro | rio_o)
    img_o[claros] = img_o[claros] * 0.45 + np.array([235, 170, 60]) * 0.55       # sendas y claros del MultiScatter (sin árboles)
    linea(img_o, tierra_j, (255, 255, 255))                                     # costa de la isla del juego
    sh_j = hillshade(np.maximum(Hj, 0), PX); img_j = colorear(Hj, sh_j, ~tierra_j)
    for p in rj:
        i = int((p[1] + R0) / PX); j = int((p[0] + R0) / PX); r = max(1, int(p[3] / PX))
        img_j[max(0, i - r):i + r, max(0, j - r):j + r] = (70, 140, 200)
    linea(img_j, dentro, (255, 210, 40))                                        # rectángulo del terreno original
    for x, z in edif:
        i = int((z + R0) / PX); j = int((x + R0) / PX)
        if 0 <= i < n and 0 <= j < n: img_o[max(0, i - 2):i + 2, max(0, j - 2):j + 2] = (200, 40, 40)
    sep = np.full((n, 12, 3), 30)
    png(os.path.join(OUT, 'mapa_original_vs_juego.png'), np.concatenate([img_o, sep, img_j], 1))
    # ---- imagen 2: diferencia de relieve (juego − original)
    d = np.nan_to_num(dif, nan=0.0); t = np.clip(d / 40, -1, 1)[..., None]
    base = 120 + 100 * hillshade(np.maximum(Hj, 0), PX)[..., None]
    col = np.where(t > 0, base * (1 - t) + np.array([200, 60, 40]) * t, base * (1 + t) + np.array([40, 90, 200]) * (-t))
    col[~(dentro & tierra_j)] = (40, 50, 60)
    linea(col, tierra_j, (255, 255, 255)); linea(col, dentro, (255, 210, 40))
    png(os.path.join(OUT, 'mapa_original_vs_juego_relieve.png'), col)
    # ---- imagen 3: la máscara de MultiScatter (trees.psd) sobre el original, con los edificios de Kelvin
    sh = hillshade(Ho, PX); g = (90 + 140 * sh)[..., None] * np.ones(3)
    g[sin_arb] = g[sin_arb] * 0.35 + np.array([235, 170, 60]) * 0.65; g[rio_o] = (60, 120, 190); g[~dentro] = (40, 50, 60)
    for x, z in edif:
        i = int((z + R0) / PX); j = int((x + R0) / PX)
        if 0 <= i < n and 0 <= j < n: g[max(0, i - 2):i + 2, max(0, j - 2):j + 2] = (200, 30, 30)
    png(os.path.join(OUT, 'mapa_original_vs_juego_bosque.png'), g)
    st = dict(stats); st.pop('nodos')
    print(json.dumps(st, ensure_ascii=False, indent=1))
    print(json.dumps(nodos, ensure_ascii=False))

if __name__ == '__main__':
    main()
