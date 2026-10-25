# CALZADO del ropero (Vittata). Blender 4.2 sin ventana:
#   cd ~ && Blender -b ~/AmazonaVerse/04_Blender_3D/vittata_rig_final.blend --python ~/AmazonaVerse/Juego/tools/blender/ropa_pies.py [-- botas_tenis ...]
# Sin lista tras `--` se construyen todas. Un objeto por pie, rígido al tarso (pieL3 / pieL3.001), luego join.
# La pata tiene 2 dedos adelante (hasta y=-0.224) y 2 atrás (hasta y=+0.13); el zapato se modela como un "loft"
# desde el contorno de la planta hasta el cuello alrededor del tarso, se empuja por fuera del cuerpo y se le da grosor.
# Suela separada (material SUELA): sobresale 1.4 cm del suelo y baja 6 mm bajo z=0 (los dedos no la atraviesan por fuera).
# Auditoría 2026-10-24: en el juego se leían como pantuflas largas y planas. Ahora: puntera abombada (TOE_BULGE), punta
# levantada (TOE_SPRING), suelas más gruesas, cordones y ojales más gruesos, caña de la bota militar más baja y abierta
# (rozaba la rodilla al andar), aletas de buzo con grosor de verdad y los tenis PR con un parche BANDERA 3:2 por lado.
import sys, os, math
sys.path.insert(0, os.path.expanduser('~/AmazonaVerse/Juego/tools/blender'))
from ropa_lib import *

R = math.radians
CX, CY = 0.176, -0.048                       # centro de la planta (pie izquierdo)
TA = Vector((0.174, 0.017, 0.189)); TB = Vector((0.195, -0.001, 0.042))   # tarso: tobillo alto → tobillo
TH = 0.006                                   # grosor del empeine
TOE_BULGE = -0.034                           # (<0) sube la puntera a media altura: caja de dedos redonda de caricatura
TOE_SPRING = 0.008                           # la punta de la suela se levanta hasta ~5 mm (los dedos siguen dentro)
FLAG_TENIS = 0.056                           # alto (m) del parche BANDERA en el lado de afuera de cada tenis (8,4 × 5,6 cm)


def M():
    return dict(TELA=mat('TELA', hexrgb('#d0473a')), ACENTO=mat('ACENTO', hexrgb('#2a5bd7'), 0.5),
                SUELA=mat('SUELA', hexrgb('#f4f4f0'), 0.7), CUERO=mat('CUERO', hexrgb('#8a5a2b'), 0.55),
                CUERO_OSCURO=mat('CUERO_OSCURO', hexrgb('#4a3020'), 0.6), CORDON=mat('CORDON', hexrgb('#f4f4f0'), 0.8),
                METAL=mat('METAL', hexrgb('#b9c4c9'), 0.3, 0.9), BLANCO=mat('BLANCO', hexrgb('#f2f3f5'), 0.45),
                GOMA=mat('GOMA', hexrgb('#1e1f22'), 0.6))


def axis_at(z, s):
    t = (TA.z - z) / (TA.z - TB.z); p = TA.lerp(TB, t)
    return Vector((s * p.x, p.y, z))


def outline_pt(th, s, grow=0.0, wf=0.086, wb=0.064, Lf=0.19, Lb=0.19, n=2.6):
    """Contorno de la planta: superelipse más ancha adelante (dos dedos abiertos). th=0 al frente, +90° hacia afuera."""
    c, sn = math.cos(th), math.sin(th)
    w = wb + (wf - wb) * (0.5 + 0.5 * c) + grow
    L = (Lf if c > 0 else Lb) + grow
    x = CX + w * math.copysign(abs(sn) ** (2 / n), sn)
    y = CY - L * math.copysign(abs(c) ** (2 / n), c)
    return Vector((s * x, y, 0.0))


def outline_ring(N, s, grow=0.0, **kw):
    """N puntos repartidos por longitud de arco, empezando en la punta (índice 0) y girando hacia afuera."""
    K = 720; P = [outline_pt(2 * math.pi * k / K, s, grow, **kw) for k in range(K)]
    cum = [0.0]
    for k in range(K): cum.append(cum[-1] + (P[(k + 1) % K] - P[k]).length)
    L = cum[-1]; out = []; k = 0
    for i in range(N):
        d = L * i / N
        while cum[k + 1] < d: k += 1
        f = (d - cum[k]) / max(1e-9, cum[k + 1] - cum[k])
        out.append(P[k].lerp(P[(k + 1) % K], f))
    return out


def upper(name, s, N=40, R_=8, zf=0.012, zc=0.098, rc=0.041, ztop=None, rtop=None, dz=0.016, grow=0.0, low_toe=TOE_BULGE):
    """Empeine: rejilla de filas desde la planta (fila 0) hasta el cuello y, si ztop, la caña por el tarso.
    Devuelve (obj, V, Nn) con posiciones y normales por fila/columna (columna 0 = punta)."""
    foot = outline_ring(N, s, grow); C = axis_at(zc, s)
    dirs = [Vector((p.x - C.x, p.y - C.y, 0)).normalized() for p in foot]
    rows = []
    for j in range(R_ + 1):
        t = j / R_; v = math.sin(t * math.pi / 2) ** 0.6; h = (1 - math.cos(t * math.pi / 2)) ** 1.2
        row = []
        for p, d in zip(foot, dirs):
            q = C + d * rc; xy = p.lerp(q, h)
            z = zf + (zc - zf) * v
            front = max(0.0, -(p.y - CY) / 0.19)       # punta más baja (caja de dedos)
            z -= low_toe * front * math.sin(t * math.pi) * 0.5
            row.append(Vector((xy.x, xy.y, z)))
        rows.append(row)
    if ztop:
        k = max(1, math.ceil((ztop - zc) / dz))
        for m in range(1, k + 1):
            z = zc + (ztop - zc) * m / k; Cz = axis_at(z, s); r = rc + ((rtop or rc) - rc) * m / k
            rows.append([Cz + d * r for d in dirs])
    o = grid_mesh(name, rows, close_u=True)
    orient_out(o, (s * CX, CY + 0.03, zf + 0.02))
    push_outside(o, offset=0.007, smooth=2, passes=2)
    orient_out(o, (s * CX, CY + 0.03, zf + 0.02))
    me = o.data; me.update(); nr = len(rows)
    V = [[me.vertices[j * N + i].co.copy() for i in range(N)] for j in range(nr)]
    Nn = [[me.vertices[j * N + i].normal.copy() for i in range(N)] for j in range(nr)]
    return o, V, Nn


def thicken(o, th=TH, bevel=0.0015, even=True):
    add_mod(o, 'SOLIDIFY', thickness=th, offset=1, use_rim=True, use_even_offset=even)
    if bevel: add_mod(o, 'BEVEL', width=bevel, segments=1, limit_method='ANGLE', angle_limit=R(60))
    apply_mods(o); return o


def row_pt(V, Nn, j, side, dist):
    """Punto de la fila j a `dist` (por la superficie) de la punta hacia el lado `side` (+1 afuera, -1 adentro)."""
    N = len(V[j]); i = 0; acc = 0.0
    for _ in range(N):
        i2 = (i + side) % N; seg = (V[j][i2] - V[j][i]).length
        if acc + seg >= dist:
            f = (dist - acc) / seg if seg > 0 else 0.0
            return V[j][i].lerp(V[j][i2], f), Nn[j][i].lerp(Nn[j][i2], f).normalized()
        acc += seg; i = i2
    return V[j][0], Nn[j][0]


def patch(name, V, Nn, rows, cols, off, th, center, closed=False, bevel=0.0015):
    N = len(V[0])
    G = [[V[j][i % N] + Nn[j][i % N] * off for i in cols] for j in rows]
    o = grid_mesh(name, G, close_u=closed); orient_out(o, center)
    return thicken(o, th, bevel)


def cols_around(N, i0, half):
    return [(i0 + k) % N for k in range(-half, half + 1)]


def sole(name, s, z0=-0.006, z1=0.014, grow=0.009, N=48):
    ring = outline_ring(N, s, grow)
    o = prism(name, [(p.x, p.y) for p in ring], z0, z1, bevel=0.004, segs=1)
    return o


def welt(name, s, z, grow, r=0.0022):
    ring = outline_ring(36, s, grow)
    return tube_path(name, [Vector((p.x, p.y, z)) for p in ring], r, seg=4, closed=True)


def laces(V, Nn, j0, j1, half, lift, r=0.0031, mt=None, eyelet=None, step=1):
    """Cordones en X sobre el empeine (filas j0..j1) + ojales opcionales."""
    out = []; L = []
    for j in range(j0, j1 + 1, step):
        pl, nl = row_pt(V, Nn, j, -1, half); pr, nr = row_pt(V, Nn, j, +1, half)
        L.append((pl + nl * lift, pr + nr * lift, nl, nr))
    for (a0, b0, na, nb), (a1, b1, _, _) in zip(L, L[1:]):
        for p, q in ((a0, b1), (b0, a1)):
            mid = (p + q) / 2 + (na + nb).normalized() * 0.003
            out.append(tube_path('cordon', [p, mid, q], r, seg=6))
    a, b, na, nb = L[-1]
    out.append(tube_path('cordon', [a, (a + b) / 2 + (na + nb).normalized() * 0.003, b], r, seg=6))
    # lazo arriba
    top = (a + b) / 2 + (na + nb).normalized() * 0.004
    for sd in (-1, 1):
        lp = [top, top + (b - a).normalized() * sd * 0.012 + Vector((0, 0, 0.008)), top + (b - a).normalized() * sd * 0.02 - Vector((0, 0, 0.004))]
        out.append(tube_path('lazo', lp, r * 0.9, seg=6))
    for o in out: set_mat(o, mt)
    if eyelet:
        for a, b, na, nb in L:
            for p, n in ((a, na), (b, nb)):
                e = revolve('ojal', p - n * 0.002, p + n * 0.0018, [(0, 0.0055), (1, 0.0055)], seg=8, cap0=False)
                out.append(set_mat(e, eyelet))
    return out


def tongue(V, Nn, R_, s, mt, half=0.022, up=0.022, lift=TH + 0.0015):
    rows = []
    for j in (R_ - 3, R_ - 2, R_ - 1, R_):
        rows.append([row_pt(V, Nn, j, sd, d)[0] + row_pt(V, Nn, j, sd, d)[1] * lift for sd, d in ((-1, half), (-1, half / 2), (1, 0), (1, half / 2), (1, half))])
    ax = (TA - TB).normalized(); ax.x *= s
    last = rows[-1]; fwd = Vector((0, -1, 0))
    rows.append([p + ax * up * 0.6 + fwd * 0.003 for p in last])
    rows.append([p + ax * up + fwd * 0.004 - (p - last[2]) * 0.25 for p in last])
    o = grid_mesh('lengueta', rows); orient_out(o, (s * CX, CY + 0.06, 0.03))
    return set_mat(thicken(o, 0.004, even=False), mt)


def collar_ring(V, Nn, j, r, mt, off=TH * 0.6, lift=0.0):
    pts = [p + n * off + Vector((0, 0, lift)) for p, n in list(zip(V[j], Nn[j]))[::2]]
    return set_mat(tube_path('ribete', pts, r, seg=6, closed=True), mt)


def heel_tab(V, Nn, j, mt, h=0.022):
    N = len(V[j]); i = N // 2; p = V[j][i] + Nn[j][i] * (TH + 0.001); up = Vector((0, 0, 1))
    pts = [p - up * 0.01, p + up * h * 0.5 + Nn[j][i] * 0.004, p + up * h]
    return set_mat(tube_path('tirador', pts, 0.0045, seg=6), mt)


def star(name, c, n, u, r=0.02, th=0.0025, mt=None):
    u = (u - n * u.dot(n)).normalized(); v = n.cross(u)
    pts = [(math.cos(R(90) + k * math.pi / 5) * (r if k % 2 == 0 else r * 0.42), math.sin(R(90) + k * math.pi / 5) * (r if k % 2 == 0 else r * 0.42)) for k in range(10)]
    return set_mat(prism(name, pts, 0, th, frame=(c, u, v, n)), mt)


# ---------------------------------------------------------------------------------------------- tipos
def tenis(s, pr=False):
    mt = M(); mt['SUELA'] = mat('SUELA', hexrgb('#f4f4f0'), 0.7); mt['CORDON'] = mat('CORDON', hexrgb('#f4f4f0'), 0.8)
    N = 40; R_ = 8
    up, V, Nn = upper('empeine', s, N=N, R_=R_, zf=0.014, zc=0.098, rc=0.041, ztop=0.104, rtop=0.042)
    top = len(V) - 1; ctr = (s * CX, CY + 0.03, 0.03)
    parts = [set_mat(thicken(up, bevel=0), mt['TELA']), set_mat(sole('suela', s, z1=0.018), mt['SUELA'])]
    parts.append(set_mat(patch('puntera', V, Nn, range(0, 3), cols_around(N, 0, 6), TH + 0.0008, 0.003, ctr), mt['SUELA']))
    parts.append(set_mat(patch('talon', V, Nn, range(0, 2), cols_around(N, N // 2, 7), TH + 0.0008, 0.003, ctr), mt['SUELA']))
    parts.append(tongue(V, Nn, top, s, mt['TELA']))
    parts += laces(V, Nn, top - 4, top - 1, 0.017, TH + 0.0065, mt=mt['CORDON'])
    parts.append(collar_ring(V, Nn, top, 0.006, mt['ACENTO']))
    parts.append(heel_tab(V, Nn, top, mt['ACENTO']))
    if pr:  # bandera de PR: parche BANDERA 3:2 en el lado de afuera, leída normal desde fuera (asta a la izquierda)
        body = parts[0]
        parts.append(flag_patch('bandera', Vector((s * (CX + 0.11), CY - 0.012, 0.053)), Vector((0, s, 0)), Vector((0, 0, 1)),
                                FLAG_TENIS, onto=target_bvh([body]), off=0.0016, nu=14, nv=8))
    else:   # franja lateral ACENTO
        for sd in (1, -1):
            cols = [(sd * k) % N for k in range(5, 17)]
            parts.append(set_mat(patch('franja', V, Nn, range(3, 5), cols, TH + 0.0008, 0.0025, ctr), mt['ACENTO']))
    return parts


def bota(s, kind):
    mt = M(); N = 40; R_ = 8
    cfg = dict(aventura=dict(ztop=0.166, rtop=0.049, up='CUERO', sole='#3b2a1f', lace='ACENTO', pad='ACENTO', z1=0.024),
               constructor=dict(ztop=0.166, rtop=0.05, up='ACENTO', sole='#2a2a2a', lace='CORDON', pad='CUERO_OSCURO', z1=0.028),
               militar=dict(ztop=0.162, rtop=0.058, up='TELA', sole='#1c1c1c', lace='CORDON', pad='CUERO_OSCURO', z1=0.024),
               espacial=dict(ztop=0.160, rtop=0.052, up='BLANCO', sole='#8f969c', lace=None, pad='METAL', z1=0.032))[kind]
    mt['SUELA'] = mat('SUELA', hexrgb(cfg['sole']), 0.75, 0.4 if kind == 'espacial' else 0.0)
    if kind == 'constructor': mt['ACENTO'] = mat('ACENTO', hexrgb('#e8b62a'), 0.6)
    if kind == 'militar':
        mt['CUERO_OSCURO'] = mat('CUERO_OSCURO', hexrgb('#1f1f1f'), 0.5); mt['CORDON'] = mat('CORDON', hexrgb('#141414'), 0.8)
        mt['TELA'] = mat('TELA', hexrgb('#5b6b3a'), 0.85)
    if kind == 'constructor': mt['CORDON'] = mat('CORDON', hexrgb('#6b4a2b'), 0.8)
    if kind == 'aventura': mt['CUERO_OSCURO'] = mat('CUERO_OSCURO', hexrgb('#4a3020'), 0.6)
    zf = cfg['z1'] - 0.004; rc = 0.046 if kind == 'espacial' else 0.042
    up, V, Nn = upper('empeine', s, N=N, R_=R_, zf=zf, zc=0.098, rc=rc, ztop=cfg['ztop'], rtop=cfg['rtop'], grow=0.006 if kind == 'espacial' else 0.0)
    top = len(V) - 1; ctr = (s * CX, CY + 0.03, 0.03)
    parts = [set_mat(thicken(up, 0.008 if kind == 'espacial' else TH, bevel=0), mt[cfg['up']])]
    parts.append(set_mat(sole('suela', s, z1=cfg['z1'], grow=0.011 if kind == 'espacial' else 0.009), mt['SUELA']))
    if kind != 'espacial':
        parts.append(set_mat(welt('vira', s, cfg['z1'] + 0.001, 0.0075), mt['CUERO_OSCURO'] if kind == 'aventura' else mt['SUELA']))
    th = 0.008 if kind == 'espacial' else TH
    if kind == 'constructor':   # puntera reforzada, gruesa
        parts.append(set_mat(patch('puntera', V, Nn, range(0, 6), cols_around(N, 0, 8), th + 0.001, 0.007, ctr, bevel=0.0025), mt['CUERO_OSCURO']))
    elif kind == 'militar':
        parts.append(set_mat(patch('puntera', V, Nn, range(0, 5), cols_around(N, 0, 7), th + 0.0008, 0.004, ctr), mt['CUERO_OSCURO']))
        parts.append(set_mat(patch('talonera', V, Nn, range(0, 7), cols_around(N, N // 2, 8), th + 0.0008, 0.004, ctr), mt['CUERO_OSCURO']))
    elif kind == 'aventura':    # costura de la puntera
        pts = [row_pt(V, Nn, 4, sd, d) for sd, d in [(-1, 0.07), (-1, 0.035), (1, 0.0), (1, 0.035), (1, 0.07)]]
        parts.append(set_mat(tube_path('costura', [p + n * (th + 0.0006) for p, n in pts], 0.0016, seg=5), mt['CUERO_OSCURO']))
    elif kind == 'espacial':
        parts.append(set_mat(patch('puntera', V, Nn, range(0, 4), cols_around(N, 0, 7), th + 0.0008, 0.004, ctr), mt['METAL']))
        jb = min(range(R_ + 1, top), key=lambda j: abs(V[j][0].z - 0.128))
        parts.append(set_mat(patch('franja', V, Nn, range(jb - 1, jb + 1), list(range(N)), th + 0.0008, 0.005, ctr, closed=True), mt['ACENTO']))
        for j in (R_, top - 1):
            parts.append(collar_ring(V, Nn, j, 0.0045, mt['METAL'], off=th + 0.002))
    if cfg['lace']:
        j0 = R_ - 4; step = 2 if top - j0 > 7 else 1
        parts += laces(V, Nn, j0, top - 1, 0.016, th + 0.004, mt=mt[cfg['lace']], eyelet=mt['METAL'], step=step)
    parts.append(collar_ring(V, Nn, top, 0.0085 if kind != 'espacial' else 0.011, mt[cfg['pad']], off=th * 0.6 + 0.003))
    if kind in ('aventura', 'militar', 'constructor'): parts.append(heel_tab(V, Nn, top, mt[cfg['pad']]))
    return parts


def buzo(s):
    mt = M(); mt['SUELA'] = mat('SUELA', hexrgb('#2b2d31'), 0.7); N = 40; R_ = 7
    up, V, Nn = upper('bolsillo', s, N=N, R_=R_, zf=0.012, zc=0.086, rc=0.041)
    top = len(V) - 1; ctr = (s * CX, CY + 0.03, 0.03)
    parts = [set_mat(thicken(up, bevel=0), mt['GOMA']), set_mat(sole('suela', s), mt['SUELA'])]
    parts.append(collar_ring(V, Nn, top, 0.0065, mt['GOMA']))
    # aleta: hoja ACENTO hacia adelante, más ancha en la punta, con bordes (rieles) y nervios
    G = []; nu = 9; nv = 10; y0 = -0.226; y1 = -0.45
    for m in range(nv + 1):
        t = m / nv; hw = 0.07 + 0.035 * t ** 0.8
        row = []
        for k in range(nu):
            u = -1 + 2 * k / (nu - 1)
            y = y0 + (y1 - y0) * t + (0.03 * (1 - u * u) * t ** 3)
            z = 0.034 - 0.02 * t + 0.006 * u * u
            row.append(Vector((s * (CX + u * hw), y, z)))
        G.append(row)
    bl = grid_mesh('aleta', G); orient_out(bl, (s * CX, -0.3, -0.2))
    parts.append(set_mat(thicken(bl, 0.011, 0.003), mt['ACENTO']))      # antes 7 mm: de canto parecía una hoja de papel
    for k in (0, nu - 1):
        parts.append(set_mat(tube_path('riel', [G[m][k] + Vector((0, 0, 0.0055)) for m in range(nv + 1)], [0.011 - 0.004 * m / nv for m in range(nv + 1)], seg=10), mt['ACENTO']))
    for k in (2, nu - 3):
        parts.append(set_mat(tube_path('nervio', [G[m][k] + Vector((0, 0, 0.011)) for m in range(1, nv)], 0.0042, seg=8), mt['GOMA']))
    # tira del talón con hebilla
    zt = 0.09; Cz = axis_at(zt, s); pts = []
    for a in range(-110, 111, 20):
        th_ = R(180 + a); d = Vector((math.sin(th_) * s, -math.cos(th_), 0))
        pts.append(Cz + d * 0.06 + Vector((0, 0, -0.012 * abs(a) / 110)))
    nr = [((p - axis_at(p.z, s)) * Vector((1, 1, 0))).normalized() for p in pts]
    parts.append(set_mat(ribbon('tira', pts, nr, 0.02, 0.005), mt['ACENTO']))
    return parts


def chancletas(s):
    mt = M(); mt['SUELA'] = mat('SUELA', hexrgb('#f2ece0'), 0.8)
    parts = [set_mat(sole('suela', s, z0=-0.006, z1=0.016, grow=0.012), mt['SUELA'])]
    # tira ancha ACENTO en arco sobre la base de los dedos (perfil = techo de los dedos + holgura)
    bvh = body_bvh(); xs = [CX - 0.088 + 0.176 * k / 16 for k in range(17)]; zs = []
    for x in xs:
        best = 0.0
        for y in (-0.11, -0.095, -0.08, -0.065, -0.05):
            h = bvh.ray_cast(Vector((s * x, y, 0.16)), Vector((0, 0, -1)), 0.2)
            if h[0] is not None and h[0].z < 0.11: best = max(best, h[0].z)
        zs.append(best)
    zz = [max(zs[max(0, i - 2):i + 3]) + 0.012 for i in range(len(zs))]
    zz = [(zz[max(0, i - 1)] + 2 * zz[i] + zz[min(len(zz) - 1, i + 1)]) / 4 for i in range(len(zz))]
    pts = [Vector((s * xs[0], -0.075, 0.008))] + [Vector((s * x, -0.075, z)) for x, z in zip(xs[1:-1], zz[1:-1])] + [Vector((s * xs[-1], -0.075, 0.008))]
    pts = catmull(pts, 2)
    nr = []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized(); n = t.cross(Vector((0, 1, 0))).normalized()
        if n.z < 0: n = -n
        nr.append(n)
    parts.append(set_mat(ribbon('tira', pts, nr, 0.038, 0.008), mt['ACENTO']))
    for p in (pts[1], pts[-2]):  # remaches
        parts.append(set_mat(sphere('remache', p + Vector((0, 0, 0.004)), 0.005, seg=8, rings=4), mt['ACENTO']))
    return parts


PIEZAS = {
    'botas_aventura': lambda s: bota(s, 'aventura'),
    'botas_constructor': lambda s: bota(s, 'constructor'),
    'botas_militar': lambda s: bota(s, 'militar'),
    'botas_tenis': lambda s: tenis(s),
    'botas_espacial': lambda s: bota(s, 'espacial'),
    'botas_buzo': buzo,
    'botas_tenis_pr': lambda s: tenis(s, pr=True),
    'botas_chancletas': chancletas,
}


def finish(name, build):
    sides = []
    for s, bone in ((1, 'pieL3'), (-1, 'pieL3.001')):
        parts = build(s)
        for p in parts: apply_mods(p); ensure_uv(p)
        for p in parts:   # punta levantada (toe spring): todo el zapato, más cuanto más adelante
            for v in p.data.vertices:
                f = max(0.0, (CY - 0.06 - v.co.y) / 0.17); v.co.z += TOE_SPRING * f * f
            p.data.update()
        flags = [p for p in parts if p.data.materials and p.data.materials[0].name == 'BANDERA']
        o = join(parts, name + ('_L' if s > 0 else '_R'))
        keep = [m.name for m in o.data.materials if m.name != 'BANDERA']
        if flags:   # cyl_uv_at pisa todas las caras: se guarda y se repone la UV del parche
            bi = [i for i, m in enumerate(o.data.materials) if m.name == 'BANDERA'][0]
            saved = {li: tuple(o.data.uv_layers['UVMap'].data[li].uv) for pl in o.data.polygons if pl.material_index == bi for li in pl.loop_indices}
        cyl_uv_at(o, s * CX, CY, R(90), sx=s)
        if flags:
            for li, uv in saved.items(): o.data.uv_layers['UVMap'].data[li].uv = uv
        shade_smooth(o, 60)
        sides.append((o, bone))
    check_clear([o for o, _ in sides], eyes=False)
    for o, b in sides: rigid(o, b)
    o = join([o for o, _ in sides], name)
    print('TRIS', name, tri_count(o), 'MATS', [m.name for m in o.data.materials], 'GROUPS', [g.name for g in o.vertex_groups])
    preview_tiles([o], name, 'pies', target=(0, -0.05, 0.08), dist=0.95, views=(('f', -28), ('l', 85), ('b', 205)), size=210, elev=0.4)
    export([o], name)
    print('KB', name, round(glb_kb(name), 1))
    bpy.data.objects.remove(o, do_unlink=True)


if __name__ == '__main__':
    rest_pose()
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    for n in (argv or list(PIEZAS)):
        print('=== PIEZA', n); finish(n, PIEZAS[n])
    for f in os.listdir(PREV):
        if f.startswith('_tmp_'): os.remove(os.path.join(PREV, f))
