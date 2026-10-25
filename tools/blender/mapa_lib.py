# Mapa Cap. 1 "El Yunque" de Amazona Verse: diseño del terreno en numpy (sin bpy).
# Base: el terreno original de Kelvin (AV3DMaxTerrainExport.max -> mapa_base_kelvin.npy, 201x201)
# con su río serpenteante y sus mesetas; encima van la isla, la montaña en terrazas, la quebrada
# de La Mina, la playa con arrecife, el cañón del puente, senderos y explanadas.
# Coordenadas del mapa: X este, Y norte, Z arriba (Blender). En el juego: x = X, y = Z, z = -Y.
import numpy as np, os, math

HERE = os.path.dirname(os.path.abspath(__file__))
KELVIN_MAX = os.path.expanduser('~/AmazonaVerse/04_Mapa_3D/AV3DMaxTerrainExport/AV3DMaxTerrainExport.max')
KELVIN_NPY = os.path.join(HERE, 'mapa_base_kelvin.npy')
HALF = 264.0          # dominio +-264 m
RES = 1.0             # malla de trabajo de 1 m
S_K = 0.255           # metros por unidad del terreno de Kelvin
V_K = 0.30            # escala vertical del terreno de Kelvin
SEA = 0.0

def ss(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3 - 2 * t)

def gauss(X, Y, cx, cy, r):
    return np.exp(-((X - cx) ** 2 + (Y - cy) ** 2) / (r * r))

def game(X, Y, Z=0.0):
    return [round(float(X), 2), round(float(Z), 2), round(float(-Y), 2)]

# ---------------------------------------------------------------- terreno de Kelvin
def load_kelvin(blur=1):
    K = np.load(KELVIN_NPY).astype(np.float64)
    for _ in range(blur):   # suaviza las agujas del Terrain Builder sin perder mesetas ni cauce
        P = np.pad(K, 1, mode='edge')
        K = (P[:-2, :-2] + P[:-2, 1:-1] + P[:-2, 2:] + P[1:-1, :-2] + 2 * P[1:-1, 1:-1] + P[1:-1, 2:] + P[2:, :-2] + P[2:, 1:-1] + P[2:, 2:]) / 10
    return K

def bicubic(G, fx, fy):
    ny, nx = G.shape
    x0 = np.floor(fx).astype(int); y0 = np.floor(fy).astype(int)
    tx = fx - x0; ty = fy - y0
    def w(t):
        return [((-0.5 * t + 1.0) * t - 0.5) * t, (1.5 * t - 2.5) * t * t + 1.0,
                ((-1.5 * t + 2.0) * t + 0.5) * t, (0.5 * t - 0.5) * t * t]
    wx = w(tx); wy = w(ty); out = np.zeros_like(fx)
    for j in range(4):
        yy = np.clip(y0 + j - 1, 0, ny - 1)
        row = np.zeros_like(fx)
        for i in range(4):
            xx = np.clip(x0 + i - 1, 0, nx - 1)
            row += wx[i] * G[yy, xx]
        out += wy[j] * row
    return out

def kelvin_at(K, X, Y):
    fx = (X / S_K + 896.0) / 8.96; fy = (Y / S_K + 960.0) / 9.6
    return bicubic(K, fx, fy) * V_K

def kelvin_river(K):
    """Línea central del río de Kelvin (de oeste a este), en metros del mapa, cada 2 m."""
    from collections import deque
    m = K < 2.0
    seen = np.zeros(K.shape, bool); comps = []
    for s in zip(*np.nonzero(m)):
        if seen[s]: continue
        q = deque([s]); seen[s] = True; n = [s]
        while q:
            a, b = q.popleft()
            for da in (-1, 0, 1):
                for db in (-1, 0, 1):
                    c = (a + da, b + db)
                    if 0 <= c[0] < K.shape[0] and 0 <= c[1] < K.shape[1] and m[c] and not seen[c]:
                        seen[c] = True; q.append(c); n.append(c)
        comps.append(n)
    big = max(comps, key=len); cells = set(big)
    def bfs(src):
        d = {src: 0}; q = deque([src])
        while q:
            a = q.popleft()
            for da in (-1, 0, 1):
                for db in (-1, 0, 1):
                    c = (a[0] + da, a[1] + db)
                    if c in cells and c not in d: d[c] = d[a] + 1; q.append(c)
        return d
    d0 = bfs(big[0]); e1 = max(d0, key=d0.get); d1 = bfs(e1); e2 = max(d1, key=d1.get)
    if e1[1] > e2[1]: d1 = bfs(e2)
    L = max(d1.values()); pts = []
    for k in range(0, L + 1, 2):
        sel = [p for p, v in d1.items() if k <= v < k + 2]
        if sel: pts.append((np.mean([p[1] for p in sel]), np.mean([p[0] for p in sel])))
    P = np.array(pts)
    P = np.c_[(P[:, 0] * 8.96 - 896) * S_K, (P[:, 1] * 9.6 - 960) * S_K]
    for _ in range(3):  # suavizado
        P[1:-1] = (P[:-2] + 2 * P[1:-1] + P[2:]) / 4
    return resample(P, 2.0)

def resample(P, step):
    P = np.asarray(P, float)
    seg = np.linalg.norm(np.diff(P, axis=0), axis=1); s = np.r_[0, np.cumsum(seg)]
    n = max(2, int(s[-1] / step) + 1); t = np.linspace(0, s[-1], n)
    return np.c_[np.interp(t, s, P[:, 0]), np.interp(t, s, P[:, 1])]

def chaikin(P, n=3):
    P = np.asarray(P, float)
    for _ in range(n):
        Q = [P[0]]
        for a, b in zip(P[:-1], P[1:]):
            Q += [0.75 * a + 0.25 * b, 0.25 * a + 0.75 * b]
        Q.append(P[-1]); P = np.array(Q)
    return P

# ---------------------------------------------------------------- ruido
def value_noise(X, Y, scale, seed):
    rs = np.random.RandomState(seed); N = 64
    G = rs.rand(N, N)
    fx = (X / scale) % N; fy = (Y / scale) % N
    x0 = np.floor(fx).astype(int); y0 = np.floor(fy).astype(int)
    tx = fx - x0; ty = fy - y0; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty)
    x1 = (x0 + 1) % N; y1 = (y0 + 1) % N
    return (G[y0, x0] * (1 - tx) * (1 - ty) + G[y0, x1] * tx * (1 - ty) + G[y1, x0] * (1 - tx) * ty + G[y1, x1] * tx * ty) * 2 - 1

def fbm(X, Y, scale, octaves, seed):
    out = 0; amp = 1; tot = 0
    for o in range(octaves):
        out = out + amp * value_noise(X, Y, scale / (2 ** o), seed + o); tot += amp; amp *= 0.5
    return out / tot

# ---------------------------------------------------------------- campos de distancia
def polyline_field(X, Y, P, maxr):
    """Distancia mínima a la polilínea P (N,2) y parámetro de arco t en el punto más cercano.
    X, Y: rejilla regular (Y filas de sur a norte). Solo se calcula dentro de maxr."""
    x0 = X[0, 0]; y0 = Y[0, 0]; dx = X[0, 1] - X[0, 0]
    D = np.full(X.shape, np.inf); T = np.zeros(X.shape)
    seg = np.linalg.norm(np.diff(P, axis=0), axis=1); s = np.r_[0, np.cumsum(seg)]
    for i in range(len(P) - 1):
        a = P[i]; b = P[i + 1]
        lo = np.minimum(a, b) - maxr; hi = np.maximum(a, b) + maxr
        i0 = max(0, int((lo[0] - x0) / dx)); i1 = min(X.shape[1], int((hi[0] - x0) / dx) + 2)
        j0 = max(0, int((lo[1] - y0) / dx)); j1 = min(X.shape[0], int((hi[1] - y0) / dx) + 2)
        if i0 >= i1 or j0 >= j1: continue
        xs = X[j0:j1, i0:i1]; ys = Y[j0:j1, i0:i1]
        ab = b - a; L2 = max(1e-9, ab @ ab)
        u = np.clip(((xs - a[0]) * ab[0] + (ys - a[1]) * ab[1]) / L2, 0, 1)
        d = np.hypot(xs - (a[0] + u * ab[0]), ys - (a[1] + u * ab[1]))
        sub = D[j0:j1, i0:i1]; m = d < sub
        sub[m] = d[m]; T[j0:j1, i0:i1][m] = (s[i] + u * seg[i])[m]
    return D, T, s

def point_in_poly(X, Y, poly):
    inside = np.zeros(X.shape, bool); n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % n]
        c = ((y1 > Y) != (y2 > Y)) & (X < (x2 - x1) * (Y - y1) / (y2 - y1 + 1e-12) + x1)
        inside ^= c
    return inside

# ---------------------------------------------------------------- DISEÑO
# Costa de la isla (sentido horario desde el noroeste). Bahía Bio = caleta cerrada del suroeste.
COAST = [(-110, 236), (-60, 250), (20, 252), (100, 250), (150, 238), (175, 222), (190, 198), (212, 180),
         (232, 150), (240, 110), (236, 70), (241, 30), (242, -10), (234, -48), (220, -70),
         (226, -100), (234, -135), (233, -172), (229, -206), (219, -217), (200, -214),
         (160, -212), (125, -211), (100, -210), (88, -216), (62, -224), (28, -226), (-8, -223),
         (-30, -216), (-58, -222), (-100, -226), (-134, -224), (-141, -219), (-139, -204), (-147, -191),
         (-165, -188), (-180, -197), (-176, -214), (-166, -223), (-196, -222), (-222, -205), (-238, -176),
         (-246, -120), (-242, -40), (-246, 40), (-240, 100), (-226, 140), (-200, 162), (-170, 178),
         (-150, 202), (-135, 224)]
# Zonas de playa (x, y, radio): fuera de ellas la costa es acantilado
BEACHES = [(158, -214, 62), (-95, -228, 52), (-205, -228, 30), (-160, -205, 22)]
REEF = (150, -214, 75)   # arrecife frente a la playa sur: (x, y, radio de influencia)

# Montaña: terrazas (bandas de acantilado) que suben hacia el norte
# La montaña sube en terrazas concéntricas alrededor de la cresta (El Yunque - Los Picachos).
SPINE = ((-110.0, 196.0), (120.0, 196.0))
TERRACES = [92.0, 72.0, 52.0]      # distancia a la cresta de cada banda de acantilado
TERRACE_H = 13.0
TERRACE_GAPS = [(136, -150), (98, -118), (138, -86)]   # pasos (X) por banda: rampas que guían sin paredes

# Quebrada de La Mina (nace en la Charca de las Nubes y cae al río). Coordenadas del mapa.
CREEK = [(-6, 186), (14, 184), (36, 180), (58, 176), (74, 166), (80, 150), (79, 136), (77, 124),
         (76, 113), (75, 104), (73, 96), (70, 88), (69, 80), (68, 73)]

# Pozas: (id, cauce, x, y, radio, profundidad). Las del río se ajustan al punto más cercano del cauce.
POOLS = [
    ('charca_nubes', 'creek', -6, 186, 7.0, 1.6),
    ('poza_la_mina', 'creek', 72, 91, 10.0, 3.0),
    ('poza_honda',   'rio',  188, -116, 8.0, 3.8),
    ('poza_dajao',   'rio',   82, 12, 7.5, 2.4),
]
BRIDGE_HINT = (156, -134)

# Puntos de interés (mapa X, Y). Los que dependen del río se recalculan en build().
POI = {
    'estacion': (167, -183), 'plaza': (150, -170), 'taller': (133, -178), 'luma': (153, -163),
    'terrenoA': (181, -136), 'terrenoB': (77, -181), 'mirador': (14, -172),
    'muelle': (150, -205), 'casita': (-104, -138), 'ruinas': (198, 4),
    'cumbre': (-32, 150), 'picachos': (60, 231), 'cueva_rio': (-226, -80),
    'gruta_mina': (66, 104), 'cueva_mar': (232, 3), 'bahia_bio': (-160, -207),
}
# Explanadas: (id, radio, altura fija o None = media del terreno)
PADS = [('plaza', 10, None), ('taller', 7, None), ('estacion', 9, None), ('terrenoA', 7, None),
        ('terrenoB', 8, None), ('mirador', 6, None), ('casita', 7, None), ('ruinas', 11, None),
        ('cumbre', 7, None), ('picachos', 6, None)]

# Senderos: nodos de diseño (mapa X, Y). Entre nodos, la ruta la traza un A* que limita la pendiente
# (zigzags naturales). 'PS'/'PN' = extremos sur/norte del puente colgante.
TRAILS = {
    'playa':      [(150, -205), (150, -172)],
    'estacion':   [(150, -172), (160, -178)],
    'taller':     [(150, -172), (138, -177)],
    'puente_sur': [(150, -170), (166, -157), 'PS'],
    'norte':      ['PN', (164, -84), (171, -50), (140, 18), (126, 60), (136, 81), (136, 109), (98, 102), (98, 126),
                   (138, 126), (138, 151), (100, 176), (44, 186), (-6, 198)],
    'la_mina':    [(126, 60), (86, 86)],
    'cumbre':     [(-46, 151), (-32, 150)],
    'picachos':   [(44, 186), (0, 204)],
    'colina':     [(150, -170), (98, -166), (80, -158), (48, -164), (56, -190)],
    'oeste':      [(98, -166), (40, -150), (0, -142), (-104, -138)],
    'cueva_rio':  [(-104, -138), (-214, -70)],
    'este':       [(140, 18), (146, 30)],
    'ruinas':     [(214, 13), (198, 4)],
    'dajao':      [(140, 18), (90, 12)],
    'bahia':      [(-104, -138), (-150, -182)],
}
# Edificios del kit de Kelvin (assets/models/edificios, ver docs/EDIFICIOS.md): (glb, ancla POI o None, dx, dy, giro°, grupo, rol)
# Dimensiones (ancho X, alto, fondo Z) del catálogo para colisiones aproximadas.
KDIM = {'bohio_redondo': (6.3, 3.6, 6.4), 'bohio_puntiagudo': (9.4, 5.9, 6.1), 'casa_paja_a': (8.3, 5.3, 8.5), 'casa_paja_b': (14.9, 5.4, 14.6),
        'casa_plataforma': (15.0, 7.8, 11.0), 'caney_largo': (22.3, 7.1, 6.9), 'cercado_redondo': (14.4, 4.8, 14.4), 'torre_vigia': (8.2, 7.9, 4.8),
        'mirador_escalonado': (10.8, 11.1, 10.8), 'puente_madera': (9.8, 6.0, 2.6), 'muelle_troncos': (7.2, 0.6, 3.9), 'empalizada': (7.2, 3.9, 0.6),
        'toldo_pequeno': (3.4, 3.3, 3.3), 'canoa': (3.8, 0.6, 1.0), 'ruina_torre': (6.5, 14.1, 6.5), 'ruina_mirador': (5.5, 10.4, 14.8),
        'ruina_pilar': (2.5, 8.8, 2.7), 'ruina_portal': (7.3, 9.5, 3.4), 'ruina_altar': (2.0, 2.0, 1.7), 'templo_mediano': (10.7, 9.8, 12.4),
        'templo_grande': (38.0, 21.8, 27.8)}
KELVIN = [
    # puntos del layout (sustituyen a las estructuras propias, que quedan de respaldo)
    ('casa_plataforma', 'estacion', 0, 0, 52, 'villa', 'refugio'),
    ('casa_paja_a', 'casita', 0, 0, -135, 'lomas', 'casita'),
    ('mirador_escalonado', 'mirador', 0, 0, -90, 'colina', 'mirador'),
    # el resto de los edificios de Kelvin va en su escena original (mapa_kelvin.py: 377 instancias por zonas)
]
TRAIL_GMAX = 0.30   # pendiente máxima de los senderos (30 %); las rampas de diseño llegan a 35 %
RAMPS = {   # id: (puntos, z inicial o None = terreno, z final o id de explanada)
    'escalinata_yunque': ([(44, 186), (24, 180), (0, 174), (-25, 170), (-50, 167), (-66, 160), (-62, 150), (-46, 151)], None, 'cumbre'),
    'rampa_ruinas':      ([(146, 30), (180, 28), (208, 23), (214, 13)], None, 'ruinas'),
    'rampa_b':           ([(98, -166), (86, -162), (70, -164), (60, -172), (64, -182), (72, -182)], None, 'terrenoB'),
    'rampa_mirador':     ([(56, -190), (44, -192), (30, -192), (16, -189), (5, -183), (3, -173), (8, -172)], None, 'mirador'),
    'rampa_picachos':    ([(0, 204), (30, 211), (52, 218), (58, 226)], None, 'picachos'),
}
CAVES = {   # grieta tallada: (entrada, fondo), ancho, altura del piso sobre el terreno de la entrada
    'gruta_mina': ((68, 101), (64, 111), 4.0),
    'cueva_mar':  ((240, 3), (224, 5), 4.5),
}

def terrace_wig(X, Y, k):
    return 11 * np.sin(X / 41 + 1.6) + 6 * fbm(X, Y * 0.3, 40, 3, 11 + k)

def spine_r(X, Y):
    (ax_, ay_), (bx_, by_) = SPINE
    u = np.clip((X - ax_) / (bx_ - ax_), 0, 1)
    return np.hypot(X - (ax_ + u * (bx_ - ax_)), Y - (ay_ + u * (by_ - ay_)))

def terrace_y(x, k):
    """Y del acantilado k en la columna x, del lado sur de la cresta."""
    ys = np.linspace(SPINE[0][1], SPINE[0][1] - 140, 1401)
    xs = np.full_like(ys, float(x))
    v = spine_r(xs, ys) + terrace_wig(xs, ys, k) - TERRACES[k]
    return float(ys[np.argmin(np.abs(v))])

def rdp(P, eps):
    P = np.asarray(P, float)
    if len(P) < 3: return P
    a, b = P[0], P[-1]; ab = b - a; L = np.linalg.norm(ab) + 1e-9
    d = np.abs(ab[0] * (P[:, 1] - a[1]) - ab[1] * (P[:, 0] - a[0])) / L
    i = int(np.argmax(d))
    if d[i] > eps:
        return np.r_[rdp(P[:i + 1], eps)[:-1], rdp(P[i:], eps)]
    return np.array([a, b])

def astar(G, pen, a, b, cell=2.0, margin=60):
    """Ruta de a a b sobre la rejilla G (paso de 2 m) que evita pendientes de más de ~15 % y el agua."""
    import heapq
    ny, nx = G.shape
    def idx(p): return (int(round((p[1] + HALF) / cell)), int(round((p[0] + HALF) / cell)))
    sa, sb = idx(a), idx(b)
    j0 = max(0, min(sa[0], sb[0]) - int(margin / cell)); j1 = min(ny - 1, max(sa[0], sb[0]) + int(margin / cell))
    i0 = max(0, min(sa[1], sb[1]) - int(margin / cell)); i1 = min(nx - 1, max(sa[1], sb[1]) + int(margin / cell))
    nb = [(1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1),
          (1, 2), (2, 1), (-1, 2), (-2, 1), (1, -2), (2, -1), (-1, -2), (-2, -1)]
    nbl = [math.hypot(*d) * cell for d in nb]
    g = {sa: 0.0}; came = {}; openh = [(0.0, sa)]; done = set()
    hz = lambda n: math.hypot(n[0] - sb[0], n[1] - sb[1]) * cell
    while openh:
        _, n = heapq.heappop(openh)
        if n == sb: break
        if n in done: continue
        done.add(n); zn = G[n]
        for (dj, di), L in zip(nb, nbl):
            m = (n[0] + dj, n[1] + di)
            if not (j0 <= m[0] <= j1 and i0 <= m[1] <= i1): continue
            gr = abs(G[m] - zn) / L
            ng = g[n] + L * (1 + (gr / 0.15) ** 4) + pen[m] * L
            if ng < g.get(m, 1e18):
                g[m] = ng; came[m] = n; heapq.heappush(openh, (ng + hz(m), m))
    path = [sb]
    while path[-1] != sa and path[-1] in came: path.append(came[path[-1]])
    path.reverse()
    return [np.array(a, float)] + [np.array([i * cell - HALF, j * cell - HALF]) for j, i in path[1:-1]] + [np.array(b, float)]

# ---------------------------------------------------------------- generación
class Mapa:
    pass

def build(verbose=True):
    M = Mapa()
    n = int(2 * HALF / RES) + 1
    ax = np.linspace(-HALF, HALF, n)
    X, Y = np.meshgrid(ax, ax)
    M.X, M.Y, M.ax = X, Y, ax
    K = load_kelvin(); M.K = K
    kel = kelvin_at(K, X, Y)
    # fuera del rectángulo de Kelvin: llano
    kx = 896 * S_K; ky = 960 * S_K
    edge = ss(0, 12, np.minimum(kx - np.abs(X), ky - np.abs(Y)))
    kel = kel * edge + 3.0 * (1 - edge)
    kel = np.maximum(kel, 3.0)                   # se rellena el cauce de Kelvin: el río se talla de nuevo
    M.kel = kel

    # ---- río de Kelvin
    R = kelvin_river(K)
    # el río nace en una cueva en las lomas del oeste y desemboca al sureste
    start = R[0]; R = np.r_[[start + (np.array([-4.0, -14.0]))], R]
    R = R[R[:, 1] > -217]
    R = np.r_[R, [[215.0, -222.0], [218.0, -236.0]]]
    R = resample(chaikin(R, 2), 2.0)
    M.river = R

    # ---- inclinación general (oeste alto, este bajo) y montaña en terrazas
    T = 2.0 + 13.0 * np.clip(1 - (X + 230) / 460, 0, 1) - 2.5 * gauss(X, Y, 165, -175, 80)
    U = np.zeros_like(X)
    rS = spine_r(X, Y); M.spine_r = rS
    for k, rb in enumerate(TERRACES):
        hw = 2.2
        for gx in TERRACE_GAPS[k]:
            gy = terrace_y(gx, k)
            hw = hw + 26.0 * np.exp(-((X - gx) ** 2 + (Y - gy) ** 2) / 13.0 ** 2)   # paso: rampa natural
        hk = TERRACE_H * (0.75 + 0.35 * fbm(X, Y * 0.2, 70, 2, 51 + k))
        U += hk * ss(rb + hw, rb - hw, rS + terrace_wig(X, Y, k))
    U += 9 * ss(115, 40, rS)                      # rampa suave bajo las terrazas
    U += 15 * gauss(X, Y, -10, 188, 85)           # domo del collado nublado
    U -= 14 * gauss(X, Y, 71, 89, 17)              # hondonada de la Poza La Mina, al pie de la cascada
    mesa = ss(24, 36, kel)                        # mesetas de Kelvin
    yunque = gauss(X, Y, -30, 134, 75)
    U += mesa * 3 * yunque                        # El Yunque queda como el punto más alto
    # oeste: loma costera junto al río y cerro de la cueva del río
    W = 10 * ss(-222, -238, X) * ss(-90, -60, Y) * (1 - ss(150, 200, Y))
    W += 16 * gauss(X, Y, -226, -84, 16)
    base = kel + T + U + W
    # la meseta de Kelvin conserva su tope plano sobre la terraza
    base += mesa * np.maximum(0, (TERRACE_H * 3 + 9) * ss(100, 45, rS) - U) * 0.6

    # ---- costa
    coast = np.array(COAST, float)
    inside = point_in_poly(X, Y, coast)
    Dc, _, _ = polyline_field(X, Y, np.r_[coast, coast[:1]], 70)
    Dc = np.where(np.isinf(Dc), 70, Dc)
    sd = np.where(inside, Dc, -Dc)                # >0 tierra, <0 mar
    sd = sd + 3.0 * fbm(X, Y, 25, 3, 21)
    beach = np.zeros_like(X)
    for bx, by, br in BEACHES:
        beach = np.maximum(beach, 1 - ss(br * 0.6, br, np.hypot(X - bx, Y - by)))
    M.sd, M.beach = sd, beach
    # tierra: rampa de playa (ancha) o acantilado (corto)
    wland = 4 + 36 * beach
    f = ss(wland * 0.35 * beach, wland, sd)
    shore = np.maximum(0.0, sd) * (0.05 + 0.30 * (1 - beach))
    land = base * f + np.minimum(base, shore) * (1 - f)
    # mar: laguna, arrecife y caída
    dd = np.maximum(0.0, -sd)
    reef = 1 - ss(REEF[2] * 0.7, REEF[2], np.hypot(X - REEF[0], Y - REEF[1]))
    lag = -np.minimum(1.5, 0.07 * dd)
    crest = 1.1 * np.exp(-((dd - 30) / 5.0) ** 2) * reef * (0.75 + 0.25 * fbm(X, Y, 6, 2, 5))
    drop = -9.0 * ss(36 if True else 0, 60, dd) * reef
    sea_beach = lag + crest + drop
    sea_cliff = -1.2 - np.minimum(10.0, 0.35 * dd)
    seab = beach * 0 + np.maximum(beach, reef * 0.9)
    sea = sea_beach * seab + sea_cliff * (1 - seab)
    sea = np.maximum(sea, -12.0)
    H = np.where(sd >= 0, land, sea)
    # transición continua alrededor de la línea de costa
    H = np.where((sd < 0) & (sd > -3), H * ss(0, -3, sd) + 0 * (1 - ss(0, -3, sd)) - 0.15 * (1 - beach), H)
    M.land_mask = sd > 0
    M.H0 = H.copy()

    # ---- micro-relieve
    H += np.where(sd > 2, 0.45 * fbm(X, Y, 9, 3, 31) + 0.9 * fbm(X, Y, 38, 2, 41), 0)
    M.Hnat = H.copy()
    base_lv = kel + T + U                       # relieve sin ruido para calcular niveles de agua

    # ---- puente colgante sobre el río, a la salida de Villa Raíz: dos peñones forman un cañón
    R = M.river; sR = np.r_[0, np.cumsum(np.linalg.norm(np.diff(R, axis=0), axis=1))]
    ib = int(np.argmin(np.hypot(R[:, 0] - BRIDGE_HINT[0], R[:, 1] - BRIDGE_HINT[1])))
    tg = R[ib + 2] - R[ib - 2]; tg /= np.linalg.norm(tg); nr = np.array([-tg[1], tg[0]])
    e1 = R[ib] + nr * 12.5; e2 = R[ib] - nr * 12.5
    plaza = np.array(POI['plaza'])
    PS, PN = (e1, e2) if np.linalg.norm(e1 - plaza) < np.linalg.norm(e2 - plaza) else (e2, e1)
    M.bridge = {'centro': R[ib].copy(), 'sur': PS, 'norte': PN, 'i': ib}
    for e in (PS, PN):
        H += 5.5 * gauss(X, Y, e[0], e[1], 11.0)

    # ---- niveles del río (escalones de 1 m) y de la quebrada (escalones de 1.5 m; las terrazas hacen las cascadas)
    def sample(G, P):
        fx = (P[:, 0] + HALF) / RES; fy = (P[:, 1] + HALF) / RES
        x0 = np.clip(fx.astype(int), 0, G.shape[1] - 2); y0 = np.clip(fy.astype(int), 0, G.shape[0] - 2)
        tx = fx - x0; ty = fy - y0
        return (G[y0, x0] * (1 - tx) * (1 - ty) + G[y0, x0 + 1] * tx * (1 - ty) + G[y0 + 1, x0] * (1 - tx) * ty + G[y0 + 1, x0 + 1] * tx * ty)
    M.sample = sample
    zr = sample(base_lv, R)
    sd_r = sample(sd, R)
    tail = sR > sR[-1] - 150
    zr = np.where(tail & (sd_r < 30), np.minimum(zr, 3.0 * np.clip(sd_r, 0, 30) / 30 + 1.4), zr)
    Lr = np.floor(np.minimum.accumulate(zr - 1.5) / 1.0) * 1.0
    Lr = np.maximum(Lr, SEA)
    C = resample(chaikin(CREEK, 2), 1.5); M.creek = C
    sC = np.r_[0, np.cumsum(np.linalg.norm(np.diff(C, axis=0), axis=1))]
    zc = sample(base_lv, C)
    Lc = np.floor(np.minimum.accumulate(zc - 1.2) / 1.5) * 1.5
    jr = int(np.argmin(np.hypot(R[:, 0] - C[-1, 0], R[:, 1] - C[-1, 1])))
    Lc = np.maximum(Lc, Lr[jr])
    # pozas: nivel plano
    pools = []
    yb1 = terrace_y(72, 0)
    POOLS[1] = ('poza_la_mina', 'creek', 72, yb1 - 10.5, 10.0, 3.0)
    CAVES['gruta_mina'] = ((65.5, yb1 - 3.5), (61, yb1 + 7), 4.0)
    POI['gruta_mina'] = (65.5, yb1 - 3.5)
    for pid, which, px, py, pr, pd in POOLS:
        P_, L_, s_ = (R, Lr, sR) if which == 'rio' else (C, Lc, sC)
        k = int(np.argmin(np.hypot(P_[:, 0] - px, P_[:, 1] - py)))
        if which == 'rio': px, py = P_[k]
        sel = np.abs(s_ - s_[k]) <= pr * 1.15
        lvl = L_[sel].min() if which == 'rio' else L_[k]
        if which == 'creek':
            down = s_ > s_[k] + pr * 1.15
            L_[sel] = lvl
        else:
            L_[sel] = lvl
        pools.append({'id': pid, 'cauce': which, 'x': float(px), 'y': float(py), 'r': pr, 'prof': pd, 'nivel': float(lvl)})
    Lr = np.minimum.accumulate(Lr); Lc = np.minimum.accumulate(Lc)
    for p in pools:
        P_, L_ = (R, Lr) if p['cauce'] == 'rio' else (C, Lc)
        k = int(np.argmin(np.hypot(P_[:, 0] - p['x'], P_[:, 1] - p['y']))); p['nivel'] = float(L_[k])
    M.pools = pools
    nR = len(R)
    wr = 3.4 + 1.6 * (sR / sR[-1])
    dr = np.full(nR, 1.5)
    Br = np.full(nR, 8.0)
    near_b = np.abs(sR - sR[ib]) < 22
    Br[near_b] = 1.6; wr[near_b] = 3.6
    M.river_s, M.river_L, M.river_w = sR, Lr, wr
    wc = np.full(len(C), 2.2); dc = np.full(len(C), 0.9); Bc = np.full(len(C), 4.0)
    M.creek_s, M.creek_L, M.creek_w = sC, Lc, wc

    # ---- explanadas (antes de tallar el agua)
    padz = {}
    for pid, pr, pz in PADS:
        cx, cy = POI[pid]
        d = np.hypot(X - cx, Y - cy)
        z = float(H[d < pr].mean()) if pz is None else pz
        if pid == 'terrenoA':
            k = int(np.argmin(np.hypot(R[:, 0] - cx, R[:, 1] - cy))); z = float(Lr[k]) + 0.9
        padz[pid] = z
        wgt = 1 - ss(pr, pr + 6, d)
        H = H * (1 - wgt) + z * wgt
    M.padz = padz

    # ---- tallado de cauces
    def carve(H, P, s, Lv, wv, dv, Bv):
        D, Tt, _ = polyline_field(X, Y, P, float((wv + Bv).max()) + 1)
        m = np.isfinite(D)
        L = np.interp(Tt, s, Lv); w = np.interp(Tt, s, wv); dep = np.interp(Tt, s, dv); B = np.interp(Tt, s, Bv)
        bowl = L - dep * np.clip(1 - (D / w) ** 2, 0, 1) ** 0.6
        bank = L - 0.05 + (D - w) * 0.55
        sB = ss(w, w + B, D)
        hb = bank * (1 - sB) + H * sB
        Hn = np.where(D < w, bowl, hb)
        H = np.where(m, Hn, H)
        return H, D, Tt
    H, M.riverD, M.riverT = carve(H, R, sR, Lr, wr, dr, Br)
    H, M.creekD, M.creekT = carve(H, C, sC, Lc, wc, dc, Bc)
    for p in pools:
        d = np.hypot(X - p['x'], Y - p['y']); r = p['r']
        bowl = p['nivel'] - p['prof'] * np.clip(1 - (d / r) ** 2, 0, 1) ** 0.6
        bank = p['nivel'] - 0.05 + (d - r) * 0.55
        sB = ss(r, r + 5, d)
        hb = bank * (1 - sB) + H * sB
        H = np.where(d < r, np.minimum(H, bowl), np.minimum(H, hb))

    M.bridge['zs'] = float(sample(H, PS[None])[0]); M.bridge['zn'] = float(sample(H, PN[None])[0])
    zb = max(M.bridge['zs'], M.bridge['zn']); M.bridge['zs'] = M.bridge['zn'] = zb
    for e in (PS, PN):   # estribos a la misma altura
        d = np.hypot(X - e[0], Y - e[1]); w_ = 1 - ss(3.0, 7.0, d); H = H * (1 - w_) + zb * w_
    # ---- rampas de diseño (cornisas talladas en los acantilados: El Yunque, las ruinas)
    M.ramp_ends = {}
    for rid, (pts, z0, z1) in RAMPS.items():
        Pp = np.array(pts, float)
        za = float(sample(H, Pp[:1])[0]) if z0 is None else (padz[z0] if isinstance(z0, str) else z0)
        zb_ = float(sample(H, Pp[-1:])[0]) if z1 is None else (padz[z1] if isinstance(z1, str) else z1)
        Pr = resample(chaikin(Pp, 2), 1.0); sr = np.r_[0, np.cumsum(np.linalg.norm(np.diff(Pr, axis=0), axis=1))]
        D, Tt, _ = polyline_field(X, Y, Pr, 6.0)
        prof = za + (zb_ - za) * Tt / sr[-1]
        wgt = np.where(np.isfinite(D), 1 - ss(2.2, 4.5, D), 0)
        H = H * (1 - wgt) + prof * wgt
        M.ramp_ends[rid + '_a'] = (Pp[0, 0], Pp[0, 1], za); M.ramp_ends[rid + '_b'] = (Pp[-1, 0], Pp[-1, 1], zb_)
        M.rampD = np.minimum(getattr(M, 'rampD', np.full(X.shape, np.inf)), np.where(np.isfinite(D), D, np.inf))
        M.ramps = getattr(M, 'ramps', {}); M.ramps[rid] = np.c_[Pr, za + (zb_ - za) * np.r_[0, np.cumsum(np.linalg.norm(np.diff(Pr, axis=0), axis=1))] / sr[-1]]
    M.H_pre = H.copy()
    # ---- senderos: A* con pendiente limitada sobre la rejilla de 2 m; perfil suavizado; corte y relleno
    water_d = np.minimum(M.riverD - np.interp(M.riverT, sR, wr), M.creekD - 2.2)
    for p in pools:
        water_d = np.minimum(water_d, np.hypot(X - p['x'], Y - p['y']) - p['r'])
    M.water_d = water_d
    G2 = H[::2, ::2]; pen = np.where((water_d[::2, ::2] < 1.2) | (H[::2, ::2] < 0.5), 1e4, 0.0)
    for pid, z in padz.items():   # las explanadas atraen el sendero
        pass
    TD = np.full(X.shape, np.inf); M.trails = {}; M.trail_grades = {}
    for tid, nodes in TRAILS.items():
        Q = [tuple(PS) if q == 'PS' else tuple(PN) if q == 'PN' else q for q in nodes]
        path = [np.array(Q[0], float)]
        for a, b in zip(Q[:-1], Q[1:]):
            seg = astar(G2, pen, a, b)
            path += list(seg[1:])
        P = np.array(path)
        P = resample(chaikin(rdp(P, 1.6), 3), 1.0)
        zq = sample(H, P)
        k = 9; zsm = np.convolve(np.r_[[zq[0]] * k, zq, [zq[-1]] * k], np.ones(2 * k + 1) / (2 * k + 1), 'valid')
        pins = [None, None]
        for e, q in ((0, Q[0]), (1, Q[-1])):
            for pid, z in padz.items():
                if np.hypot(*(np.array(POI[pid]) - np.array(q))) < 3: pins[e] = z
            for rid, rp in M.ramp_ends.items():
                if np.hypot(rp[0] - q[0], rp[1] - q[1]) < 3: pins[e] = rp[2]
        if tid == 'puente_sur': pins[1] = M.bridge['zs']
        if tid == 'norte': pins[0] = M.bridge['zn']
        sq = np.r_[0, np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))]
        Lr = min(30.0, sq[-1] * 0.5); zs = zsm.copy()
        if pins[0] is not None: zs += (pins[0] - zsm[0]) * np.clip(1 - sq / Lr, 0, 1)
        if pins[1] is not None: zs += (pins[1] - zsm[-1]) * np.clip(1 - (sq[-1] - sq) / Lr, 0, 1)
        # pendiente máxima: envolventes de Lipschitz (corte y relleno repartidos), se repite para respetar los extremos fijos
        for _ in range(3):
            Dm = np.abs(sq[:, None] - sq[None, :])
            zs = 0.5 * (np.min(zs[None, :] + TRAIL_GMAX * Dm, axis=1) + np.max(zs[None, :] - TRAIL_GMAX * Dm, axis=1))
            if pins[0] is not None: zs += (pins[0] - zs[0]) * np.clip(1 - sq / Lr, 0, 1)
            if pins[1] is not None: zs += (pins[1] - zs[-1]) * np.clip(1 - (sq[-1] - sq) / Lr, 0, 1)
        D, Tt, _ = polyline_field(X, Y, P, 4.0)
        prof = np.interp(Tt, sq, zs)
        wgt = (1 - ss(1.3, 3.2, D)) * ss(0.5, 2.5, water_d)
        wgt = np.where(np.isfinite(D), wgt, 0)
        H = H * (1 - wgt) + (prof - 0.12) * wgt
        TD = np.minimum(TD, D)
        g = np.abs(np.diff(zs)) / np.maximum(1e-6, np.diff(sq))
        M.trails[tid] = np.c_[P, zs - 0.12]
        im = int(np.argmax(g))
        M.trail_grades[tid] = (int(sq[-1]), int(np.percentile(g, 90) * 100), int(g.max() * 100), (int(P[im, 0]), int(P[im, 1])))
    for rid, Rp in M.ramps.items():   # las rampas se vuelven a tallar encima de los senderos que las tocan
        D, Tt, sr_ = polyline_field(X, Y, Rp[:, :2], 6.0)
        prof = np.interp(Tt, sr_, Rp[:, 2]); wgt = np.where(np.isfinite(D), 1 - ss(2.2, 4.5, D), 0)
        H = H * (1 - wgt) + prof * wgt
    M.trailD = np.minimum(TD, M.rampD)   # las rampas cuentan como sendero (tierra, sin plantas, más vértices)
    # suaviza los escalones entre tramos cercanos (curvas en zigzag) solo sobre los senderos
    Hb = H.copy()
    for _ in range(3):
        P_ = np.pad(Hb, 1, mode='edge')
        Hb = (P_[:-2, :-2] + P_[:-2, 1:-1] + P_[:-2, 2:] + P_[1:-1, :-2] + P_[1:-1, 1:-1] + P_[1:-1, 2:] + P_[2:, :-2] + P_[2:, 1:-1] + P_[2:, 2:]) / 9
    wb = (1 - ss(2.5, 4.5, TD)) * ss(0.5, 2.5, water_d) * ss(4.0, 7.0, M.rampD)
    for e in (PS, PN): wb = wb * ss(6.0, 10.0, np.hypot(X - e[0], Y - e[1]))
    H = H * (1 - wb) + Hb * wb

    # ---- grutas: grietas talladas en la roca (el techo es la malla grutas.glb)
    caves = {}
    for cid, (a, b, w) in CAVES.items():
        a = np.array(a, float); b = np.array(b, float)
        za = max(float(sample(H, a[None])[0]), 1.2 if cid == 'cueva_mar' else -99)
        D, Tt, sP = polyline_field(X, Y, np.array([a, b]), w)
        floor = za + 0.6 * Tt / max(1e-6, sP[-1])
        wgt = np.where(np.isfinite(D), 1 - ss(w * 0.5, w * 0.5 + 1.2, D), 0)
        H = np.where(wgt > 0, np.minimum(H, H * (1 - wgt) + floor * wgt), H)
        caves[cid] = {'a': a, 'b': b, 'w': w, 'z': za}
    M.caves = caves

    M.H = H
    return M, H

def splat(M, H):
    """Pesos RGBA por celda: R pasto/musgo, G tierra, B roca, A arena (suman 1)."""
    X, Y = M.X, M.Y
    gy, gx = np.gradient(H, RES)
    slope = np.degrees(np.arctan(np.hypot(gx, gy)))
    M.slope = slope
    n1 = fbm(X, Y, 14, 3, 71); n2 = fbm(X, Y, 5, 2, 72)
    rock = ss(46, 60, slope + 5 * n1)
    rock = rock * (1 - 0.6 * ss(30, 55, H) * ss(-0.3, 0.3, n1))                # paredes húmedas con musgo en la montaña
    rock = np.maximum(rock, ss(0.35, 0.8, n1) * ss(55, 75, H) * 0.5)          # lajas en la cumbre
    rock = np.maximum(rock, (1 - ss(0.0, 1.6, M.water_d)) * ss(0.1, 0.5, n2))  # piedras de río
    sand = np.maximum(ss(3.0, 1.5, H) * M.beach * ss(-0.2, 0.3, M.sd + 6), ss(0.2, -0.6, H))
    sand = np.maximum(sand, (1 - ss(-1.0, 0.4, M.water_d)) * 0.8)              # lecho del río
    dirt = 1 - ss(1.1, 2.7, M.trailD + 0.6 * n2)
    for pid, z in M.padz.items():
        cx, cy = POI[pid]; r = dict((p[0], p[1]) for p in PADS)[pid]
        dirt = np.maximum(dirt, (1 - ss(r * 0.45, r * 0.9, np.hypot(X - cx, Y - cy) + 2 * n2)) * 0.85)
    dirt = np.maximum(dirt, (1 - ss(0.0, 3.5, M.water_d)) * ss(-0.5, 0.2, M.water_d) * 0.7)  # orilla de barro
    dirt = np.maximum(dirt, ss(0.25, 0.7, n1) * ss(24, 34, slope) * 0.7)
    dirt = np.maximum(dirt, ss(0.45, 0.85, fbm(X, Y, 22, 2, 73)) * 0.45 * ss(3, 6, H) * (1 - ss(50, 60, H)))
    for c in M.caves.values():
        D, _, _ = polyline_field(X, Y, np.array([c['a'], c['b']]), c['w'] + 2)
        rock = np.maximum(rock, np.where(np.isfinite(D), 1 - ss(c['w'] * 0.5, c['w'] * 0.5 + 2, D), 0))
    A = sand; B = rock * (1 - A * 0.6); G = dirt * (1 - B) * (1 - A)
    Rg = np.clip(1 - A - B - G, 0, 1)
    tot = Rg + G + B + A + 1e-9
    return np.stack([Rg / tot, G / tot, B / tot, A / tot], -1)

if __name__ == '__main__':
    M, H = build()
    print(H.min(), H.max())

# ---------------------------------------------------------------- contenido del juego (coordenadas del mapa)
# Misiones y Diario reubicados en el mapa nuevo (ids de game.js). y de RINGS = metros sobre el suelo.
# Sin anillos de vuelo (regla del fundador). M2 educativa "La ruta de la gota" (EDUCATIVO.md §2): perchas de capas del bosque
# junto al sendero norte, a 40-80 m del puente. (id, especie héroe, x, y, altura de la percha sobre el suelo)
PERCHAS = [('suelo', 'tabonuco', 157, -100, 0.3), ('sotobosque', 'helecho_gigante', 146, -92, 4.6),
           ('dosel', 'palma_sierra', 171, -80, 7.6), ('emergente', 'ceiba', 160, -64, 14.0)]
BUSHES = [('coqui1', 141, -104, ['co', 'qui']), ('coqui2', 201, -142, ['co', 'qui', 'qui']), ('coqui3', 97, -160, ['qui', 'co', 'qui'])]
FIELD = [  # id, x, y, radio (None = por defecto), en agua
    ('coqui', 166, -70, None, False), ('sanpedrito', -210, -60, None, False), ('reinita', 6, 197, None, False),
    ('dajao', 0, 0, 2.6, True), ('jicotea', 207, -178, None, False), ('manati', 140, -233, 3.5, True),
    ('maraca', 0, 0, None, False), ('guiro', 0, 0, None, False), ('cuatro', 192, 9, None, False),
    ('petroglifo', 0, 0, None, False), ('vejigante', 112, -204, None, False), ('pava', -100, -132, None, False),
]
RESOURCES = [('m1', 'madera', 122, -188), ('m2', 'madera', 176, -162), ('m3', 'madera', 112, -160),
             ('m4', 'madera', 190, -170), ('m5', 'madera', 128, -150),
             ('p1', 'piedra', 160, -197), ('p2', 'piedra', 100, -176), ('p3', 'piedra', 196, -153), ('p4', 'piedra', 140, -197),
             ('c1', 'componente', 0, 0), ('c2', 'componente', 118, -201)]
ISLANDS = [(-330, -430, 60), (40, -520, 45), (380, -420, 40)]   # otras islas al sur, tras la niebla
HEROES = [  # árboles insignia que se ven de lejos
    ('ceiba', 122, -160, 1.2), ('ceiba', 126, 64, 1.0), ('ceiba', -42, -92, 1.1), ('ceiba', 98, 30, 0.9), ('ceiba', -160, 40, 1.0),
    ('flamboyan', 178, -194, 1.0), ('flamboyan', -116, -128, 1.05), ('flamboyan', 42, -158, 0.9), ('flamboyan', 108, -196, 0.85),
    ('flamboyan', 186, 16, 0.9), ('flamboyan', 158, -176, 0.8), ('ceiba', -147, -146, 1.1), ('flamboyan', -146, -170, 0.9),
    ('tabonuco', 186, -128, 1.1), ('tabonuco', 174, -143, 1.0),   # árboles con marcas de agua del terreno A
    ('tabonuco', 157, -100, 1.0), ('helecho_gigante', 146, -92, 1.0), ('heliconia', 149, -90, 1.0), ('heliconia', 144, -95, 0.9),
    ('palma_sierra', 171, -80, 1.0), ('yagrumo', 166, -84, 1.0), ('bromelia', 172, -78, 1.0), ('ceiba', 160, -64, 1.0),
    ('bambu', 128, -104, 1.0), ('flamboyan', 150, -160, 0.85),   # hallazgos opcionales: nativa frente a introducidas
]
CLAROS = []   # (x, y, r): claros del bosque sin árboles (paradas de aprendizaje); los llena mapa_build
SPECIES = ['palma_sierra', 'yagrumo', 'tabonuco', 'tabonuco_enano', 'helecho_gigante', 'ceiba', 'flamboyan', 'bambu',
           'heliconia', 'bromelia', 'helechos', 'rocas', 'troncos']

def flora(M, H, step=2):
    """Densidad por especie (instancias por 100 m2) en rejilla de `step` m y máscara de suelo libre."""
    sl = slice(None, None, step)
    h = H[sl, sl]; X = M.X[sl, sl]; Y = M.Y[sl, sl]
    slope = M.slope[sl, sl]; wd = M.water_d[sl, sl]; td = M.trailD[sl, sl]; sd = M.sd[sl, sl]; be = M.beach[sl, sl]
    n1 = fbm(X, Y, 30, 3, 91); n2 = fbm(X, Y, 11, 2, 92)
    patch = np.clip(0.55 + 0.9 * n1, 0, 1.4)
    free = (td > 2.6) & (wd > 1.2) & (sd > 2.5) & (h > 0.8)
    for pid, pr, _ in PADS:
        cx, cy = POI[pid]; free &= np.hypot(X - cx, Y - cy) > pr + 1.5
    for k, v in getattr(M, 'footprints', {}).items():
        free &= np.hypot(X - v[0], Y - v[1]) > v[2]
    low = ss(4, 8, h)
    D = {}
    D['tabonuco'] = 2.2 * low * ss(55, 42, h) * ss(32, 22, slope) * ss(4, 10, wd) * ss(15, 35, sd) * patch
    D['tabonuco_enano'] = 2.6 * ss(64, 72, h) * ss(40, 28, slope) * patch
    D['palma_sierra'] = (5.0 * ss(24, 34, h) * ss(80, 68, h) * ss(56, 44, slope) +
                         1.0 * ss(10, 18, h) * ss(30, 24, h) * ss(2, 6, wd) * ss(25, 12, wd)) * patch
    D['yagrumo'] = 0.2 * low * ss(75, 62, h) * ss(35, 25, slope) + 0.6 * ss(2.6, 4, td) * ss(14, 7, td) * ss(5, 8, h) * ss(70, 60, h)
    D['helecho_gigante'] = 2.4 * ss(2, 4, wd) * ss(24, 10, wd) * ss(12, 22, h) + 1.2 * ss(60, 68, h) * ss(40, 28, slope) \
        + 1.4 * ss(30, 40, h) * ss(70, 60, h) * ss(52, 40, slope)
    D['ceiba'] = 0.025 * low * ss(30, 20, h) * ss(10, 20, wd)
    D['flamboyan'] = 0.07 * ss(2, 4, h) * ss(20, 12, h) * ss(8, 16, sd) * ss(80, 40, sd)
    D['bambu'] = 3.2 * ss(1.2, 2.5, wd) * ss(10, 5, wd) * ss(40, 30, h) * ss(0.0, 0.3, n2)
    D['heliconia'] = 4.0 * ss(2.6, 3.4, td) * ss(7.5, 4.5, td) * ss(60, 50, h) + 2.4 * ss(1.2, 2.2, wd) * ss(7, 4, wd) * ss(55, 45, h)
    D['bromelia'] = 7.0 * ss(58, 68, h) + 1.6 * ss(40, 48, h) * ss(60, 54, h)
    D['helechos'] = (5.0 * ss(6, 10, h) * ss(58, 52, h) * ss(40, 30, slope) + 9.0 * ss(58, 66, h) * ss(45, 32, slope)) * patch
    D['troncos'] = 0.35 * ss(6, 10, h) * ss(58, 50, h) * ss(30, 20, slope)
    rocks = 1.4 * ss(24, 32, slope) * ss(44, 36, slope) * (h > 0.5) + 2.6 * (1 - ss(-0.6, 1.4, wd)) * ss(-4.5, -2.5, wd) * (h > 0) \
        + 3.0 * (1 - be) * ss(-5, -1, sd) * ss(9, 3, sd) + 1.2 * be * ss(-0.9, -0.4, h) * ss(0.1, -0.2, h) * ss(-26, -32, sd)
    land = (sd > 2.5) & (h > 0.8)
    for k in D: D[k] = np.where(free & land, D[k], 0)
    for cx, cy, cr in CLAROS:   # claro: sin árboles ni arbustos altos, con helechos y bromelias
        m = np.hypot(X - cx, Y - cy) < cr
        for k in ('tabonuco', 'tabonuco_enano', 'palma_sierra', 'yagrumo', 'helecho_gigante', 'ceiba', 'flamboyan', 'bambu', 'troncos'): D[k][m] = 0
    D['rocas'] = np.where((td > 2.2), rocks, 0)
    return D, free, X, Y
