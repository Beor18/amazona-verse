"""Amazona Verse · kit de entorno · MODELOS de flora de El Yunque (exporta .glb + _glb.js).

  Blender -b --factory-startup --python tools/blender/entorno_modelos.py [-- nombre1 nombre2 ...]

Requiere las texturas de entorno_texturas.py. Cada pieza: un objeto, pivote en la base, metros,
materiales HOJA_<especie> (alfa con corte → alphaTest) y CORTEZA_<especie> (o ROCA_<pieza>).
Color de vértice (COLOR_0): R = AO, G = viento (0 base → 1 puntas), B = fase por rama/hoja.
Normales del follaje: mezcla con la normal del volumen de la copa (sombreado suave, estilo pintado).
Las rocas y el tronco caído se hornean (Cycles: EMIT + NORMAL) de shaders procedurales a su UV.
"""
import bpy, math, os, random, sys, json, zlib
from mathutils import Vector, Matrix, noise

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import entorno_lib as L  # noqa: E402

TAU = math.tau
UP = Vector((0, 0, 1))
GOLD = math.pi * (3 - math.sqrt(5))
TX = lambda n: os.path.join(L.TEX, n)  # noqa
sm = L.smooth


def leaf_mat(sp, double=True, rough=0.72):
    return L.mat_tex('HOJA_' + sp, TX('hoja_' + sp + '.png'), alpha=True, double=double, rough=rough)


def bark_mat(sp, rough=0.9):
    return L.mat_tex('CORTEZA_' + sp, TX('corteza_' + sp + '.jpg'), TX('corteza_' + sp + '_n.jpg'), rough=rough,
                     double=False)


def ell_n(p, c, ax):
    d = p - c
    return Vector((d.x / ax.x ** 2, d.y / ax.y ** 2, d.z / ax.z ** 2)).normalized()


def ell_d(p, c, ax):
    d = p - c
    return math.sqrt((d.x / ax.x) ** 2 + (d.y / ax.y) ** 2 + (d.z / ax.z) ** 2)


def basis(n, roll):
    n = n.normalized()
    t1 = n.orthogonal().normalized()
    t2 = n.cross(t1)
    r = t1 * math.cos(roll) + t2 * math.sin(roll)
    return r, n.cross(r)


# ───────────────────────── primitivas de follaje ─────────────────────────
def card(mb, c, n, size, uvr, m, rng, crown, fold=0.18, ar=1.0, ph=0.0, wmin=0.35, ao_k=1.0, puff=None):
    """Tarjeta de racimo (2 triángulos plegados por la diagonal) centrada en c, mirando a n.
    crown = (centro, ejes) de la copa entera; puff = (centro, ejes) del bulto al que pertenece."""
    right, up = basis(n, rng.uniform(0, TAU))
    hw, hh = size * 0.5 * ar, size * 0.5
    u0, v0, u1, v1 = uvr
    cc, cax = crown
    pc, pax = puff or crown
    corners = [(-1, -1), (1, -1), (1, 1), (-1, 1)]
    ids = []
    for k, (sx, sy) in enumerate(corners):
        p = c + right * (sx * hw) + up * (sy * hh)
        if k in (1, 3):
            p = p - n * (fold * size)
        gn = ell_n(p, cc, cax)
        pn = ell_n(p, pc, pax)
        nn = (pn * 0.55 + gn * 0.3 + n * 0.15).normalized()
        dg = min(1.0, ell_d(p, cc, cax))
        hz = sm(-1.0, 1.0, (p.z - cc.z) / cax.z)
        ao = (0.42 + 0.58 * dg ** 1.4) * (0.62 + 0.38 * hz) * (0.8 + 0.2 * sm(-0.8, 0.6, pn.z))
        ao = 1 - (1 - ao) * ao_k
        w = wmin + (1 - wmin) * sm(0.2, 1.05, dg)
        ids.append(mb.v(p, ao, w, ph, nn))
    uv = [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]
    mb.f((ids[0], ids[1], ids[2]), (uv[0], uv[1], uv[2]), m)
    mb.f((ids[0], ids[2], ids[3]), (uv[0], uv[2], uv[3]), m)


def frond(mb, base, az, elev, Ln, Wd, uvr, m, droop=0.5, fold=0.45, twist=0.0, segs=8, ao0=0.45, ao1=1.0, w0=0.3,
          ph=0.0, cen=None, nb=0.45, upb=0.35, flip_u=False):
    """Hoja larga (fronda/cinta) doblada en V a lo largo del raquis; v=0 en la base, v=1 en la punta."""
    d0 = Vector((math.cos(elev) * math.cos(az), math.cos(elev) * math.sin(az), math.sin(elev)))
    sp = [base + d0 * (Ln * t) + Vector((0, 0, -droop * Ln * t * t)) for t in [i / segs for i in range(segs + 1)]]
    # re-muestrear para conservar el largo
    tot = sum((sp[i + 1] - sp[i]).length for i in range(segs))
    sp = [base + (p - base) * (Ln / tot) for p in sp]
    u0, v0, u1, v1 = uvr
    if flip_u:
        u0, u1 = u1, u0
    cen = cen if cen is not None else base

    def pos(u, v):
        i = min(segs - 1, int(v * segs))
        f = v * segs - i
        c = sp[i].lerp(sp[i + 1], f)
        tg = (sp[i + 1] - sp[i]).normalized()
        lat = UP.cross(tg)
        if lat.length < 1e-4:
            lat = Vector((-math.sin(az), math.cos(az), 0))
        lat.normalize()
        nup = tg.cross(lat).normalized()
        tw = twist * v
        lat, nup = lat * math.cos(tw) + nup * math.sin(tw), nup * math.cos(tw) - lat * math.sin(tw)
        s = (0.5 - u) * 2  # +1 izquierda (u=0), -1 derecha (u=1)
        fa = fold * (0.6 + 0.4 * v)
        return c + lat * (s * Wd * 0.5 * math.cos(fa)) - nup * (abs(s) * Wd * 0.5 * math.sin(fa))

    def attr(u, v, p):
        i = min(segs - 1, int(v * segs))
        tg = (sp[i + 1] - sp[i]).normalized()
        lat = UP.cross(tg)
        if lat.length < 1e-4:
            lat = Vector((-math.sin(az), math.cos(az), 0))
        nup = tg.cross(lat.normalized()).normalized()
        rad = (p - cen).normalized()
        n = (nup * (1 - nb - upb) + rad * nb + UP * upb).normalized()
        ao = ao0 + (ao1 - ao0) * sm(0.0, 0.7, v)
        w = w0 + (1 - w0) * v ** 1.2
        return ao, w, ph, n

    L.grid(mb, 2, segs, pos, lambda u, v: (u0 + (u1 - u0) * u, v0 + (v1 - v0) * v), attr, m)


def strip(mb, pts, Wd, uvr, m, side, aos, ws, ph=0.0, nrm=None):
    """Tira plana (dos lados) siguiendo pts; side = vector lateral."""
    n = len(pts) - 1
    u0, v0, u1, v1 = uvr

    def pos(u, v):
        i = min(n - 1, int(v * n))
        f = v * n - i
        return pts[i].lerp(pts[i + 1], f) + side * ((u - 0.5) * Wd)

    def attr(u, v, p):
        nn = nrm if nrm is not None else side.cross(pts[-1] - pts[0]).normalized()
        return aos[0] + (aos[1] - aos[0]) * v, ws[0] + (ws[1] - ws[0]) * v, ph, nn

    L.grid(mb, 1, n, pos, lambda u, v: (u0 + (u1 - u0) * u, v0 + (v1 - v0) * v), attr, m)


def fibo(n, i):
    z = 1 - (i + 0.5) / n * 2
    r = math.sqrt(max(0.0, 1 - z * z))
    a = i * GOLD
    return Vector((math.cos(a) * r, math.sin(a) * r, z))


def puff(mb, c, ax, n, size, uvrs, m, rng, crown, zmin=-0.55, ph=0.0, wmin=0.35, fold=0.18, ao_k=1.0):
    """Bulto de follaje: n tarjetas sobre un elipsoide, mirando hacia afuera."""
    k = 0
    i = 0
    while k < n and i < n * 3:
        d = fibo(int(n * 1.5), i)
        i += 1
        if d.z < zmin:
            continue
        p = c + Vector((d.x * ax.x, d.y * ax.y, d.z * ax.z)) * rng.uniform(0.78, 1.0)
        nn = (ell_n(p, c, ax) + Vector((rng.uniform(-.25, .25), rng.uniform(-.25, .25), rng.uniform(-.1, .3)))).normalized()
        card(mb, p, nn, size * rng.uniform(0.85, 1.15), rng.choice(uvrs), m, rng, crown, fold=fold, ph=ph + rng.uniform(0, 0.08),
             wmin=wmin, ao_k=ao_k, puff=(c, ax))
        k += 1


def branch(mb, p0, p1, p2, r0, r1, m, segs=5, sides=6, H=10.0, ph=0.0, ao=None, w_top=0.4, v0=0.0):
    pts = L.curve(p0, p1, p2, segs + 1)
    rad = [r0 + (r1 - r0) * (i / segs) for i in range(segs + 1)]
    aof = ao or (lambda p, t: 0.55 + 0.4 * sm(0, H, p.z))
    wf = lambda p, t: w_top * sm(0.0, H, p.z) ** 1.5 * (0.6 + 0.4 * t)  # noqa
    rep = max(1, round(TAU * max(r0, 0.05) / 0.9))
    return L.tube(mb, pts, rad, sides, m, uv_rep=rep, v_len=1.0, ao=aof, wind=wf, ph=ph, v0=v0)


def buttress(mb, ang, rcore, reach, hb, thick, m, rng, H=10.0, segs=9, wig=0.18):
    """Raíz tablar: lámina curva que baja del tronco al suelo."""
    path = []
    for i in range(segs + 1):
        s = i / segs
        a = ang + wig * math.sin(math.pi * s * 1.3 + ang)
        r = rcore * 0.55 + s * (reach - rcore * 0.55)
        path.append((Vector((math.cos(a) * r, math.sin(a) * r, 0)), s))
    sec = [(-1, 0.0), (-1, 0.72), (-0.6, 0.94), (0, 1.0), (0.6, 0.94), (1, 0.72), (1, 0.0)]
    rows = []
    for i, (p, s) in enumerate(path):
        nxt = path[min(i + 1, segs)][0] - path[max(i - 1, 0)][0]
        tg = Vector((nxt.x, nxt.y, 0)).normalized()
        side = UP.cross(tg)
        top = hb * (1 - s) ** 1.7 + 0.06
        th = thick * (1 - 0.7 * s) * 0.5
        row = []
        for j, (sx, sz) in enumerate(sec):
            q = p + side * (sx * th) + Vector((0, 0, -0.12 + (top + 0.12) * sz))
            nrm = (side * sx + UP * (0.6 * sz if abs(sx) < 1 else 0.15) + tg * 0.25 * (hb / max(reach, 1))).normalized()
            ao = 0.38 + 0.5 * sm(0.0, 1.6, q.z) * (0.6 + 0.4 * s) + 0.12 * s
            row.append(mb.v(q, ao, 0.0, 0.0, nrm))
        rows.append(row)
    per = [0.0]
    for j in range(1, len(sec)):
        per.append(per[-1] + abs(sec[j][0] - sec[j - 1][0]) * thick * 0.5 + abs(sec[j][1] - sec[j - 1][1]) * hb)
    for i in range(segs):
        va, vb = path[i][1] * (reach - rcore * 0.5), path[i + 1][1] * (reach - rcore * 0.5)
        for j in range(len(sec) - 1):
            mb.f((rows[i][j], rows[i][j + 1], rows[i + 1][j + 1], rows[i + 1][j]),
                 ((per[j], va), (per[j + 1], va), (per[j + 1], vb), (per[j], vb)), m)


def finish(mb, name, mats):
    ob = mb.build(name, mats)
    return ob


# ───────────────────────── ÁRBOLES ─────────────────────────
def palma_sierra(rng, HT=5.5, N=16, ls=1.0, fruits=3, dry=2, roots=9):
    """HT: altura del estípite; ls: escala de las hojas. La variante joven usa HT=2.6, N=11, ls=0.78."""
    sp = 'palma_sierra'
    mb = L.MB()
    k_ = HT / 5.5
    lean = Vector((0.4, 0.15, 0)) * k_
    pts = [lean * (t * t) + Vector((0, 0, HT * t)) for t in [i / 10 for i in range(11)]]
    rad = [(0.15 + 0.09 * (1 - t) ** 3 - 0.02 * t) * (0.75 + 0.25 * k_) for t in [i / 10 for i in range(11)]]
    L.tube(mb, pts, rad, 9, 1, uv_rep=1, v_len=1.1,
           ao=lambda p, t: 0.5 + 0.45 * sm(0, 0.3, t) - 0.3 * sm(0.82, 1, t),
           wind=lambda p, t: 0.3 * t * t)
    for k in range(roots):  # cono de raíces zancudas
        a = TAU * k / roots + rng.uniform(-0.15, 0.15)
        d = Vector((math.cos(a), math.sin(a), 0))
        p0 = d * 0.1 + Vector((0, 0, rng.uniform(0.35, 0.65) * (0.6 + 0.4 * k_)))
        p2 = d * rng.uniform(0.42, 0.6) * (0.7 + 0.3 * k_) + Vector((0, 0, -0.06))
        p1 = d * 0.38 + Vector((0, 0, p0.z * 0.6))
        L.tube(mb, L.curve(p0, p1, p2, 4), [0.045, 0.04, 0.035, 0.03], 5, 1, uv_rep=1, v_len=1.1,
               ao=lambda p, t: 0.35 + 0.4 * sm(0, 0.6, p.z), wind=lambda p, t: 0.0)
    top = pts[-1]
    # vaina verde-oliva bajo la corona (usa la franja de tallo del atlas: frutos/ramitas → no; usamos corteza)
    cen = top + Vector((0, 0, 0.3))
    for k in range(N):
        age = k / (N - 1)
        az = k * GOLD + rng.uniform(-0.1, 0.1)
        elev = math.radians(70 - 100 * age ** 0.9 + rng.uniform(-6, 6))
        Ln = (2.5 + 0.7 * math.sin(math.pi * min(1, age * 1.2)) + rng.uniform(-0.15, 0.15)) * ls
        frond(mb, top + Vector((0, 0, 0.12 - 0.25 * age)), az, elev, Ln, Ln * 0.5, (0.0, 0.0, 0.5, 1.0), 0,
              droop=0.25 + 0.35 * age, fold=math.radians(32), twist=rng.uniform(-0.5, 0.5), segs=8,
              ao0=0.38 + 0.2 * (1 - age), ao1=0.8 + 0.2 * (1 - age), w0=0.3, ph=k / N, cen=cen, nb=0.4, upb=0.3)
    for k in range(dry):  # hojas secas colgando
        az = rng.uniform(0, TAU)
        frond(mb, top + Vector((0, 0, -0.25)), az, math.radians(-70), 1.6 * ls, 0.8 * ls, (0.5, 0.0, 1.0, 0.5), 0, droop=0.05,
              fold=math.radians(25), segs=4, ao0=0.3, ao1=0.55, w0=0.3, ph=rng.random(), cen=cen, nb=0.3, upb=0.1)
    for k in range(fruits):  # racimos de frutos
        az = TAU * k / 3 + rng.uniform(-0.3, 0.3)
        d = Vector((math.cos(az), math.sin(az), 0))
        a = top + d * 0.12 + Vector((0, 0, -0.35))
        for j in range(2):
            side = Vector((math.cos(az + math.pi / 2 + j * math.pi / 2), math.sin(az + math.pi / 2 + j * math.pi / 2), 0))
            pts2 = [a, a + d * 0.35 + Vector((0, 0, -0.45)), a + d * 0.45 + Vector((0, 0, -1.0))]
            strip(mb, pts2[::-1], 1.0, (0.5, 0.5, 1.0, 1.0), 0, side, (0.45, 0.6), (0.6, 0.35), ph=k / 3)
    return finish(mb, sp, [leaf_mat(sp), bark_mat(sp)])


def umbrella_leaf(mb, c, n, R, m, rng, ph, crown, droop=0.35):
    """Hoja palmeada peltada del yagrumo: abanico de 10 lados en forma de sombrilla (haz arriba, envés plateado abajo)."""
    right, up = basis(n, rng.uniform(0, TAU))
    seg = 10
    cc, cax = crown
    for layer in (0, 1):
        off = -n * (0.018 * layer)
        uc = (0.25, 0.75) if layer == 0 else (0.75, 0.75)
        ids = []
        hub = c + off + n * (0.06 * R)
        dg = min(1.0, ell_d(hub, cc, cax))
        nh = (n * 0.5 + ell_n(hub, cc, cax) * 0.5).normalized()
        if layer:
            nh = (-n * 0.6 + ell_n(hub, cc, cax) * 0.4).normalized()
        hid = mb.v(hub, 0.5 + 0.4 * dg, 0.55, ph, nh)
        for k in range(seg):
            a = TAU * k / seg
            lx, ly = math.cos(a), math.sin(a)
            p = c + off + right * (lx * R) + up * (ly * R) - n * (droop * R)
            gn = ell_n(p, cc, cax)
            nn = ((n if not layer else -n) * 0.45 + gn * 0.35 + (p - c).normalized() * 0.2).normalized()
            ao = 0.45 + 0.55 * min(1.0, ell_d(p, cc, cax)) ** 1.3
            ids.append((mb.v(p, ao, 1.0, ph, nn), (uc[0] + (lx if not layer else -lx) * 0.25, uc[1] + ly * 0.25)))
        huv = uc
        for k in range(seg):
            a_, b_ = ids[k], ids[(k + 1) % seg]
            if layer == 0:
                mb.f((hid, a_[0], b_[0]), (huv, a_[1], b_[1]), m)
            else:
                mb.f((hid, b_[0], a_[0]), (huv, b_[1], a_[1]), m)


def yagrumo(rng, HT=6.6, nb=4, nl=9, ls=1.0):
    """La variante joven usa HT=3.0, nb=2, nl=7: tronco corto y pocas hojas grandes."""
    sp = 'yagrumo'
    mb = L.MB()
    bs = min(1.0, HT / 6.6 * 1.4)
    pts = [Vector((0.35 * math.sin(t * 2.2) * t, 0.15 * t * t, HT * t)) for t in [i / 11 for i in range(12)]]
    rad = [(0.13 + 0.07 * (1 - t) ** 3 - 0.03 * t) * (0.15 + 0.85 * bs ** 2) for t in [i / 11 for i in range(12)]]
    L.tube(mb, pts, rad, 8, 1, uv_rep=1, v_len=1.2, ao=lambda p, t: 0.5 + 0.45 * sm(0, 0.25, t) - 0.15 * sm(0.85, 1, t),
           wind=lambda p, t: 0.3 * t * t)
    for k in range(4):  # contrafuertes pequeños
        a = TAU * k / 4 + 0.4
        buttress(mb, a, 0.18 * bs, 0.55 * bs, 0.5 * bs, 0.14 * bs, 1, rng, segs=5)
    top = pts[-1]
    crown = (top + Vector((0, 0, 0.6 * bs)), Vector((2.8, 2.8, 1.6)) * bs)
    tips = []
    for k in range(nb):
        az = TAU * k / nb + rng.uniform(-0.3, 0.3)
        d = Vector((math.cos(az), math.sin(az), 0))
        z0 = HT - 1.2 * bs + k * 0.32 * bs
        p0 = pts[int(z0 / HT * 11)]
        p2 = p0 + d * rng.uniform(1.3, 1.9) * bs + Vector((0, 0, rng.uniform(1.0, 1.5) * bs))
        p1 = p0 + d * 1.0 * bs + Vector((0, 0, 0.2 * bs))
        branch(mb, p0, p1, p2, 0.09 * bs, 0.05 * bs, 1, segs=5, sides=6, H=HT + 1.5, ph=k / nb, w_top=0.45)
        tips.append((p2, k / nb))
    tips.append((top + Vector((0, 0, 0.1)), 0.9))
    for tip, ph in tips:
        n_l = nl
        for j in range(n_l):
            az = j * GOLD + rng.uniform(-0.2, 0.2)
            el = math.radians(rng.uniform(-5, 50) if j > 1 else 70)
            d = Vector((math.cos(az) * math.cos(el), math.sin(az) * math.cos(el), math.sin(el)))
            pl = rng.uniform(0.45, 0.9) * (0.6 if j < 2 else 1)
            c = tip + d * pl
            # pecíolo (franja de tallo del atlas)
            side = d.cross(UP).normalized() if abs(d.z) < 0.99 else Vector((1, 0, 0))
            strip(mb, [tip, tip.lerp(c, 0.5) + Vector((0, 0, 0.06)), c], 0.05, (0.8, 0.05, 0.95, 0.45), 0, side,
                  (0.6, 0.8), (0.45, 0.85), ph=ph)
            nrm = (UP * 1.0 + d * rng.uniform(0.2, 0.9) + Vector((rng.uniform(-.3, .3), rng.uniform(-.3, .3), 0))).normalized()
            if rng.random() < 0.12:  # algunas volteadas por el viento: se ve el envés plateado
                nrm = (d * 1.0 - UP * 0.4).normalized()
            umbrella_leaf(mb, c, nrm, rng.uniform(0.5, 0.7) * (0.7 if j < 2 else 1) * ls, 0, rng, ph + j * 0.02, crown)
        for j in range(2):  # amentos colgantes
            az = rng.uniform(0, TAU)
            side = Vector((math.cos(az), math.sin(az), 0))
            a = tip + Vector((0, 0, -0.05))
            strip(mb, [a + Vector((0, 0, -0.75)), a + Vector((0, 0, -0.35)), a], 0.6, (0.02, 0.02, 0.48, 0.47), 0, side,
                  (0.5, 0.6), (0.7, 0.5), ph=ph)
    return finish(mb, sp, [leaf_mat(sp, double=False), bark_mat(sp)])


def arbol_enano(rng):
    """Bosque enano de la cumbre: tronco corto y retorcido cubierto de musgo, copa baja aplastada por el viento,
    bromelias epífitas y musgo colgante."""
    sp = 'arbol_enano'
    mb = L.MB()
    pts = []
    for i in range(9):
        t = i / 8
        pts.append(Vector((0.35 * math.sin(t * 3.4) + 0.25 * t, 0.25 * math.sin(t * 2.3 + 1.0), 1.7 * t)))
    rad = [0.2 + 0.1 * (1 - t) ** 3 - 0.05 * t for t in [i / 8 for i in range(9)]]
    L.tube(mb, pts, rad, 9, 1, uv_rep=1, v_len=0.9, ao=lambda p, t: 0.42 + 0.45 * sm(0, 0.5, t),
           wind=lambda p, t: 0.15 * t * t)
    for k in range(4):
        buttress(mb, TAU * k / 4 + rng.uniform(-0.3, 0.3), 0.25, rng.uniform(0.55, 0.8), 0.45, 0.16, 1, rng, segs=5,
                 wig=0.35)
    top = pts[-1]
    crown = (Vector((0.3, 0.1, 2.9)), Vector((2.4, 2.4, 0.9)))
    puffs, limbs = [], []
    for k in range(4):
        az = TAU * k / 4 + rng.uniform(-0.35, 0.35)
        d = Vector((math.cos(az), math.sin(az), 0))
        p0 = pts[5 + k % 3]
        reach = rng.uniform(1.3, 2.0)
        p2 = p0 + d * reach + Vector((0, 0, rng.uniform(0.7, 1.2)))
        mid = p0.lerp(p2, 0.5) + Vector((rng.uniform(-.3, .3), rng.uniform(-.3, .3), rng.uniform(-0.25, 0.1)))
        branch(mb, p0, mid, p2, 0.11, 0.045, 1, segs=6, sides=6, H=3.5, ph=k / 4, w_top=0.3)
        limbs.append((p0, mid, p2, az))
        q0 = L.bez(p0, mid, p2, 0.55)
        e = Vector((math.cos(az + 0.9), math.sin(az + 0.9), 0))
        q2 = q0 + e * 0.8 + Vector((0, 0, 0.45))
        branch(mb, q0, q0 + e * 0.3 + Vector((0, 0, 0.3)), q2, 0.05, 0.025, 1, segs=3, sides=5, H=3.5, ph=k / 4 + .05)
        puffs.append((p2 + Vector((0, 0, 0.15)), Vector((1.05, 1.05, 0.55)), k / 4))
        puffs.append((q2 + Vector((0, 0, 0.1)), Vector((0.75, 0.75, 0.45)), k / 4 + 0.05))
    puffs.append((top + Vector((0.1, 0, 1.0)), Vector((1.1, 1.1, 0.55)), 0.95))
    uvrs = [(0.0, 0.5, 0.5, 1.0), (0.5, 0.5, 1.0, 1.0)]
    for c, ax, ph in puffs:
        puff(mb, c, ax, max(16, int(30 * ax.x * ax.y)), 0.85, uvrs, 0, rng, crown, zmin=-0.45, ph=ph, fold=0.15)
    for k, (p0, mid, p2, az) in enumerate(limbs):
        b = L.bez(p0, mid, p2, 0.35) + Vector((0, 0, 0.08))
        for j in range(2):  # bromelia epífita
            sd = Vector((math.cos(az + j * math.pi / 2 + 0.6), math.sin(az + j * math.pi / 2 + 0.6), 0))
            strip(mb, [b + Vector((0, 0, -0.12)), b + Vector((0, 0, 0.42))], 0.54, (0.02, 0.0, 0.48, 0.48), 0, sd,
                  (0.55, 0.85), (0.2, 0.3), ph=k / 4)
        a = L.bez(p0, mid, p2, 0.75)
        for j in range(2):  # musgo colgante
            sd = Vector((math.cos(az + j * math.pi / 2), math.sin(az + j * math.pi / 2), 0))
            strip(mb, [a + Vector((0, 0, -0.85)), a + Vector((0, 0, -0.4)), a], 0.55, (0.52, 0.02, 0.98, 0.49), 0, sd,
                  (0.45, 0.7), (0.8, 0.4), ph=k / 4 + 0.5)
    return finish(mb, sp, [leaf_mat(sp), bark_mat(sp)])


def tabonuco(rng):
    sp = 'tabonuco'
    mb = L.MB()
    HT = 7.0
    pts = [Vector((0.12 * math.sin(t * 3), 0.08 * t, HT * t)) for t in [i / 10 for i in range(11)]]
    rad = [0.26 + 0.1 * (1 - t) ** 4 - 0.07 * t for t in [i / 10 for i in range(11)]]
    L.tube(mb, pts, rad, 12, 1, uv_rep=2, v_len=1.2,
           ao=lambda p, t: 0.45 + 0.5 * sm(0, 0.3, t) - 0.25 * sm(0.8, 1, t), wind=lambda p, t: 0.25 * t * t)
    for k in range(5):
        buttress(mb, TAU * k / 5 + rng.uniform(-0.2, 0.2), 0.3, rng.uniform(0.9, 1.3), rng.uniform(0.9, 1.4), 0.2, 1, rng,
                 segs=7)
    top = pts[-1]
    crown = (Vector((0, 0, 9.0)), Vector((4.2, 4.2, 2.2)))
    puffs = []
    for k in range(6):
        az = TAU * k / 6 + rng.uniform(-0.25, 0.25)
        d = Vector((math.cos(az), math.sin(az), 0))
        p0 = pts[8 + k % 3]
        p2 = p0 + d * rng.uniform(2.3, 3.1) + Vector((0, 0, rng.uniform(1.6, 2.4)))
        branch(mb, p0, p0 + d * 0.8 + Vector((0, 0, 1.0)), p2, 0.15, 0.06, 1, segs=5, sides=6, H=11, ph=k / 6)
        # rama secundaria
        q0 = p0.lerp(p2, 0.55)
        e = Vector((math.cos(az + 0.8), math.sin(az + 0.8), 0))
        q2 = q0 + e * 1.4 + Vector((0, 0, 1.2))
        branch(mb, q0, q0 + e * 0.6 + Vector((0, 0, 0.4)), q2, 0.07, 0.035, 1, segs=3, sides=5, H=11, ph=k / 6 + 0.05)
        puffs.append((p2 + Vector((0, 0, 0.4)), Vector((1.9, 1.9, 1.35)), k / 6))
        puffs.append((q2 + Vector((0, 0, 0.2)), Vector((1.3, 1.3, 1.0)), k / 6 + 0.05))
    puffs.append((Vector((0, 0, 10.0)), Vector((2.0, 2.0, 1.3)), 0.95))
    uvrs = [(0.0, 0.0, 0.5, 1.0), (0.5, 0.0, 1.0, 1.0)]
    for c, ax, ph in puffs:
        n = int(26 * (ax.x * ax.y) / 3.6)
        puff(mb, c, ax, max(18, int(n * 1.7)), 1.35, uvrs, 0, rng, crown, zmin=-0.5, ph=ph)
    return finish(mb, sp, [leaf_mat(sp), bark_mat(sp)])


def helecho_arboreo(rng):
    sp = 'helecho_arboreo'
    mb = L.MB()
    HT = 3.6
    pts = [Vector((0.25 * math.sin(t * 2.0) * t, -0.12 * t * t, HT * t)) for t in [i / 8 for i in range(9)]]
    rad = [0.105 + 0.12 * (1 - t) ** 5 for t in [i / 8 for i in range(9)]]
    L.tube(mb, pts, rad, 8, 1, uv_rep=1, v_len=0.9, ao=lambda p, t: 0.45 + 0.5 * sm(0, 0.3, t) - 0.2 * sm(0.85, 1, t),
           wind=lambda p, t: 0.3 * t * t)
    top = pts[-1]
    cen = top + Vector((0, 0, 0.2))
    N = 14
    for k in range(N):
        age = k / (N - 1)
        az = k * GOLD + rng.uniform(-0.1, 0.1)
        elev = math.radians(62 - 80 * age + rng.uniform(-5, 5))
        Ln = 2.3 + 0.5 * math.sin(math.pi * min(1.0, age * 1.3)) + rng.uniform(-0.1, 0.1)
        frond(mb, top + Vector((0, 0, 0.05 - 0.1 * age)), az, elev, Ln, Ln * 0.5, (0.0, 0.0, 1.0, 1.0), 0,
              droop=0.38 + 0.25 * age, fold=math.radians(14), twist=rng.uniform(-0.3, 0.3), segs=9, ao0=0.4,
              ao1=0.85 + 0.15 * (1 - age), w0=0.3, ph=k / N, cen=cen, nb=0.45, upb=0.3, flip_u=bool(k % 2))
    for k in range(3):  # báculos (frondas nuevas enrolladas)
        az = TAU * k / 3 + 0.5
        d = Vector((math.cos(az), math.sin(az), 0))
        c0 = top + Vector((0, 0, 0.02))
        cp = [c0, c0 + d * 0.05 + Vector((0, 0, 0.3)), c0 + d * 0.1 + Vector((0, 0, 0.5))]
        for j in range(7):
            a = j / 6 * 4.2
            cp.append(cp[2] + d * (0.09 * math.sin(a)) + Vector((0, 0, 0.09 * (1 - math.cos(a)) * 0.9 - 0.02 * j)))
        L.tube(mb, cp, [0.035 - 0.003 * i for i in range(len(cp))], 5, 1, uv_rep=1, v_len=0.5,
               ao=lambda p, t: 0.75, wind=lambda p, t: 0.35 + 0.2 * t, ph=k / 3)
    return finish(mb, sp, [leaf_mat(sp), bark_mat(sp)])


def ceiba(rng):
    sp = 'ceiba'
    mb = L.MB()
    HT = 9.0
    pts = [Vector((0.2 * math.sin(t * 2.5), 0.1 * t, -0.15 + (HT + 0.15) * t)) for t in [i / 9 for i in range(10)]]
    rad = [1.0 + 0.6 * (1 - t) ** 4 - 0.18 * t + 0.05 * math.sin(t * 6) for t in [i / 9 for i in range(10)]]
    L.tube(mb, pts, rad, 20, 1, uv_rep=5, v_len=1.6,
           ao=lambda p, t: 0.42 + 0.48 * sm(0, 0.35, t) - 0.25 * sm(0.75, 1, t), wind=lambda p, t: 0.12 * t * t)
    for k in range(7):  # raíces tablares (el sello de la ceiba)
        a = TAU * k / 7 + rng.uniform(-0.18, 0.18)
        buttress(mb, a, 1.25, rng.uniform(3.6, 4.6), rng.uniform(3.6, 4.6), 0.75, 1, rng, segs=11, wig=0.25)
    top = pts[-1]
    crown = (Vector((0, 0, 11.5)), Vector((8.5, 8.5, 3.4)))
    puffs = []
    limbs = []
    for k in range(7):
        az = TAU * k / 7 + rng.uniform(-0.2, 0.2)
        d = Vector((math.cos(az), math.sin(az), 0))
        p0 = pts[7 + k % 3] + Vector((0, 0, 0.2))
        reach = rng.uniform(5.4, 7.0)
        p2 = p0 + d * reach + Vector((0, 0, rng.uniform(2.2, 3.2)))
        p1 = p0 + d * (reach * 0.45) + Vector((0, 0, 0.6))
        branch(mb, p0, p1, p2, 0.55, 0.14, 1, segs=7, sides=10, H=14, ph=k / 7, w_top=0.25)
        limbs.append((p0, p1, p2, az))
        for j, f in enumerate((0.42, 0.7)):  # ramas secundarias que suben
            q0 = L.bez(p0, p1, p2, f)
            e = Vector((math.cos(az + (0.7 if j else -0.7)), math.sin(az + (0.7 if j else -0.7)), 0))
            q2 = q0 + e * rng.uniform(1.8, 2.6) + Vector((0, 0, rng.uniform(1.4, 2.2)))
            branch(mb, q0, q0 + e * 0.7 + Vector((0, 0, 0.3)), q2, 0.17, 0.05, 1, segs=4, sides=6, H=14,
                   ph=k / 7 + 0.03 * j, w_top=0.3)
            puffs.append((q2 + Vector((0, 0, 0.35)), Vector((2.3, 2.3, 1.15)), k / 7 + 0.03 * j))
        puffs.append((p2 + Vector((0, 0, 0.3)), Vector((2.8, 2.8, 1.3)), k / 7))
        puffs.append((L.bez(p0, p1, p2, 0.6) + Vector((0, 0, 1.6)), Vector((2.4, 2.4, 1.1)), k / 7 + 0.01))
    puffs.append((Vector((0, 0, 12.6)), Vector((3.4, 3.4, 1.4)), 0.97))
    uvrs = [(0.0, 0.5, 0.5, 1.0), (0.5, 0.5, 1.0, 1.0)]
    for c, ax, ph in puffs:
        n = int(44 * (ax.x * ax.y) / 6.0)
        puff(mb, c, ax, max(18, n), 1.85, uvrs, 0, rng, crown, zmin=-0.35, ph=ph, wmin=0.3, fold=0.15)
    for k, (p0, p1, p2, az) in enumerate(limbs):  # bromelias epífitas y lianas
        for f in (0.3, 0.55):
            b = L.bez(p0, p1, p2, f) + Vector((0, 0, 0.3))
            for j in range(2):
                sd = Vector((math.cos(az + j * math.pi / 2 + 0.7), math.sin(az + j * math.pi / 2 + 0.7), 0))
                strip(mb, [b + Vector((0, 0, -0.2)), b + Vector((0, 0, 0.8))], 1.0, (0.02, 0.0, 0.48, 0.48), 0, sd,
                      (0.55, 0.85), (0.25, 0.35), ph=k / 7)
        if k % 2 == 0:
            a = L.bez(p0, p1, p2, rng.uniform(0.5, 0.75))
            Lh = rng.uniform(4.0, 6.5)
            for j in range(2):
                sd = Vector((math.cos(az + j * math.pi / 2), math.sin(az + j * math.pi / 2), 0))
                u0 = 0.56 if k % 4 == 0 else 0.78
                strip(mb, [a + Vector((0.1 * math.sin(i), 0, -Lh * i / 4)) for i in range(4, -1, -1)], 0.55,
                      (u0, 0.0, u0 + 0.12, 0.49), 0, sd, (0.45, 0.7), (0.9, 0.35), ph=k / 7 + 0.5)
    return finish(mb, sp, [leaf_mat(sp), bark_mat(sp)])


def flamboyan(rng):
    sp = 'flamboyan'
    mb = L.MB()
    # copa alta (base a ~6.3 m): la cámara de tercera persona (jugador + 4.2 m) pasa por debajo, no por dentro
    HT = 3.8
    pts = [Vector((0.12 * t, 0.06 * t, -0.1 + (HT + 0.1) * t)) for t in [i / 5 for i in range(6)]]
    rad = [0.4 + 0.16 * (1 - t) ** 3 for t in [i / 5 for i in range(6)]]
    L.tube(mb, pts, rad, 12, 1, uv_rep=2, v_len=1.2, ao=lambda p, t: 0.45 + 0.4 * sm(0, 0.5, t),
           wind=lambda p, t: 0.05 * t)
    for k in range(5):  # raíces superficiales
        buttress(mb, TAU * k / 5 + rng.uniform(-0.2, 0.2), 0.42, rng.uniform(1.2, 1.8), 0.6, 0.2, 1, rng, segs=6)
    crown = (Vector((0, 0, 7.3)), Vector((5.6, 5.6, 1.7)))
    puffs = []
    top = pts[-1]
    for k in range(5):
        az = TAU * k / 5 + rng.uniform(-0.25, 0.25)
        d = Vector((math.cos(az), math.sin(az), 0))
        reach = rng.uniform(3.4, 4.4)
        p0 = top + Vector((0, 0, -0.1))
        p2 = p0 + d * reach + Vector((0, 0, rng.uniform(2.7, 3.1)))
        p1 = p0 + d * (reach * 0.35) + Vector((0, 0, 1.8))
        branch(mb, p0, p1, p2, 0.22, 0.08, 1, segs=6, sides=7, H=7, ph=k / 5, w_top=0.35)
        for j in (-1, 1):
            q0 = L.bez(p0, p1, p2, 0.6)
            e = Vector((math.cos(az + j * 0.75), math.sin(az + j * 0.75), 0))
            q2 = q0 + e * rng.uniform(1.6, 2.2) + Vector((0, 0, 1.15))
            branch(mb, q0, q0 + e * 0.8 + Vector((0, 0, 0.4)), q2, 0.08, 0.035, 1, segs=3, sides=5, H=7,
                   ph=k / 5 + 0.04 * j, w_top=0.4)
            puffs.append((q2 + Vector((0, 0, 0.35)), Vector((1.8, 1.8, 0.85)), k / 5 + 0.04 * j))
        puffs.append((p2 + Vector((0, 0, 0.3)), Vector((2.2, 2.2, 0.95)), k / 5))
    puffs.append((Vector((0, 0, 8.0)), Vector((2.8, 2.8, 1.0)), 0.95))
    for k in range(5):
        a = TAU * k / 5 + 0.6
        puffs.append((Vector((math.cos(a) * 2.2, math.sin(a) * 2.2, 7.6)), Vector((1.8, 1.8, 0.9)), 0.9 + k * 0.01))
    red = [(0.0, 0.5, 1.0, 1.0)]
    green = [(0.0, 0.0, 0.5, 0.5)]
    for c, ax, ph in puffs:
        n = int(34 * (ax.x * ax.y) / 3.3)
        k = 0
        i = 0
        while k < n and i < n * 3:
            d = fibo(int(n * 1.5), i)
            i += 1
            if d.z < -0.6:
                continue
            p = c + Vector((d.x * ax.x, d.y * ax.y, d.z * ax.z)) * rng.uniform(0.78, 1.0)
            nn = (ell_n(p, c, ax) + Vector((rng.uniform(-.25, .25), rng.uniform(-.25, .25), rng.uniform(-.1, .3)))).normalized()
            if d.z > -0.15 and rng.random() < 0.8:  # flores: franja 2:1 → tarjeta de 1.6×0.8 m
                card(mb, p, nn, rng.uniform(0.72, 0.88), red[0], 0, rng, crown, fold=0.1, ar=2.0,
                     ph=ph + rng.uniform(0, .08), wmin=0.35, puff=(c, ax))
            else:
                card(mb, p, nn, rng.uniform(1.0, 1.2), green[0], 0, rng, crown, fold=0.16, ph=ph + rng.uniform(0, .08),
                     wmin=0.35, puff=(c, ax))
            k += 1
    for k in range(12):  # vainas colgantes
        c, ax, ph = rng.choice(puffs)
        a = c + Vector((rng.uniform(-1, 1) * ax.x * 0.6, rng.uniform(-1, 1) * ax.y * 0.6, -ax.z * 0.55))
        az = rng.uniform(0, TAU)
        sd = Vector((math.cos(az), math.sin(az), 0))
        u0 = rng.choice((0.53, 0.67, 0.81))
        strip(mb, [a + Vector((0, 0, -0.7)), a], 0.16, (u0, 0.02, u0 + 0.12, 0.49), 0, sd, (0.5, 0.6), (0.8, 0.6),
              ph=ph)
    return finish(mb, sp, [leaf_mat(sp), bark_mat(sp)])


def bambu(rng):
    sp = 'bambu'
    mb = L.MB()
    N = 16
    tips = []
    for k in range(N):
        a = TAU * k / N + rng.uniform(-0.2, 0.2)
        r0 = rng.uniform(0.1, 0.55)
        d = Vector((math.cos(a), math.sin(a), 0))
        Hc = rng.uniform(5.5, 8.4) * (1 - 0.35 * (r0 / 0.55) ** 2)
        lean = rng.uniform(0.6, 2.4) * (0.5 + r0)
        p0 = d * r0 + Vector((0, 0, -0.05))
        p1 = p0 + d * (lean * 0.2) + Vector((0, 0, Hc * 0.6))
        p2 = p0 + d * (lean * 1.0 + 0.5) + Vector((0, 0, Hc))
        pts = L.curve(p0, p1, p2, 10)
        r = rng.uniform(0.05, 0.075)
        rad = [r * (1 - 0.6 * (i / 9) ** 2) for i in range(10)]
        ph = rng.random()
        L.tube(mb, pts, rad, 5, 1, uv_rep=1, v_len=0.45, ao=lambda p, t: 0.45 + 0.5 * sm(0, 0.45, t),
               wind=lambda p, t: 0.75 * t ** 1.6, ph=ph, v0=rng.random(), cap=True)
        for j in range(9):
            t = 0.36 + 0.62 * j / 8
            q = L.bez(p0, p1, p2, t)
            az = a + (1 if j % 2 else -1) * rng.uniform(0.6, 1.4)
            e = Vector((math.cos(az), math.sin(az), 0))
            Ls = rng.uniform(1.5, 2.1) * (1.15 - 0.3 * t)
            sp_pts = [q, q + e * (Ls * 0.45) + Vector((0, 0, -0.1)), q + e * (Ls * 0.75) + Vector((0, 0, -Ls * 0.55))]
            side = e.cross(UP).normalized()
            nrm = (UP * 0.6 + e * 0.4 + side * rng.uniform(-0.3, 0.3)).normalized()
            strip(mb, sp_pts[::-1], Ls * 0.85, (0.0, 0.0, 1.0, 1.0), 0, side,
                  (0.7 + 0.2 * t, 0.85 + 0.15 * t), (1.0, 0.75 * t ** 1.6 + 0.1), ph=ph, nrm=nrm)
    for k in range(3):  # brotes jóvenes
        a = rng.uniform(0, TAU)
        p0 = Vector((math.cos(a) * 0.4, math.sin(a) * 0.4, -0.05))
        L.tube(mb, [p0, p0 + Vector((0, 0, 0.5)), p0 + Vector((0.02, 0, 0.95))], [0.07, 0.055, 0.02], 5, 1, uv_rep=1,
               v_len=0.45, ao=lambda p, t: 0.5 + 0.3 * t, wind=lambda p, t: 0.1 * t, cap=True)
    return finish(mb, sp, [leaf_mat(sp), bark_mat(sp)])


# ───────────────────────── PLANTAS BAJAS ─────────────────────────
def heliconia(rng):
    sp = 'heliconia'
    mb = L.MB()
    cen = Vector((0, 0, 0.9))
    for k in range(7):
        az = k * GOLD + rng.uniform(-0.2, 0.2)
        d = Vector((math.cos(az), math.sin(az), 0))
        base = d * rng.uniform(0.02, 0.15)
        hp = rng.uniform(0.45, 0.85)
        top = base + d * (0.12 + 0.1 * rng.random()) + Vector((0, 0, hp))
        strip(mb, [base, base.lerp(top, 0.5), top], 0.05, (0.52, 0.52, 0.98, 0.98), 0, d.cross(UP).normalized(),
              (0.35, 0.7), (0.0, 0.35), ph=k / 7)
        strip(mb, [base, base.lerp(top, 0.5), top], 0.05, (0.52, 0.52, 0.98, 0.98), 0, d, (0.35, 0.7), (0.0, 0.35),
              ph=k / 7)
        Ln = rng.uniform(0.95, 1.2)
        frond(mb, top, az, math.radians(rng.uniform(40, 68)), Ln, Ln * 0.5, (0.0, 0.0, 0.5, 1.0), 0,
              droop=rng.uniform(0.25, 0.45), fold=math.radians(18), twist=rng.uniform(-0.4, 0.4), segs=6, ao0=0.55,
              ao1=1.0, w0=0.35, ph=k / 7, cen=cen, nb=0.35, upb=0.3)
    for k in range(2):  # inflorescencias erectas: brácteas rojas y amarillas en zigzag
        az = rng.uniform(0, TAU) + k * math.pi
        d = Vector((math.cos(az), math.sin(az), 0))
        base = d * 0.12
        Hs = rng.uniform(1.25, 1.5)
        top = base + d * 0.12 + Vector((0, 0, Hs))
        side = d.cross(UP).normalized()
        strip(mb, [base, base.lerp(top, 0.5), top], 0.045, (0.52, 0.52, 0.98, 0.98), 0, side, (0.4, 0.8), (0.0, 0.5),
              ph=0.3 + k * 0.4)
        strip(mb, [base, base.lerp(top, 0.5), top], 0.045, (0.52, 0.52, 0.98, 0.98), 0, d, (0.4, 0.8), (0.0, 0.5),
              ph=0.3 + k * 0.4)
        nb = 7
        for j in range(nb):
            t = 0.62 + 0.36 * j / (nb - 1)
            a = base.lerp(top, t)
            sdir = side * (1 if j % 2 else -1)
            Lb = 0.24 * (1 - 0.45 * j / nb)
            tipd = (sdir * 0.85 + UP * 0.55).normalized()
            fwd = d
            ids = []
            for rr in range(3):
                f = rr / 2
                c = a + tipd * (Lb * f)
                wv = Lb * 0.32 * math.sin(math.pi * (0.25 + 0.6 * f))
                row = []
                for cc, sx in enumerate((-1, 0, 1)):
                    p = c + fwd * (sx * wv) + (UP * (-0.05 * Lb) if sx == 0 else UP * (0.03 * Lb))
                    nn = (tipd.cross(fwd) * (-1 if j % 2 else 1) * 0.3 + fwd * sx * 0.6 + UP * 0.4).normalized()
                    row.append(mb.v(p, 0.65 + 0.35 * f, 0.4 + 0.2 * t, 0.3 + k * 0.4, nn))
                ids.append(row)
            us = (0.52, 0.75, 0.98)
            for rr in range(2):
                for cc in range(2):
                    q = (ids[rr][cc], ids[rr][cc + 1], ids[rr + 1][cc + 1], ids[rr + 1][cc])
                    uv = ((us[cc], rr * 0.24), (us[cc + 1], rr * 0.24), (us[cc + 1], (rr + 1) * 0.24),
                          (us[cc], (rr + 1) * 0.24))
                    mb.f(q, uv, 0)
    return finish(mb, sp, [leaf_mat(sp)])


def bromelia(rng):
    sp = 'bromelia'
    mb = L.MB()
    cen = Vector((0, 0, 0.25))
    N = 22
    for k in range(N):
        ring = k / N
        az = k * GOLD
        elev = math.radians(75 - 55 * ring + rng.uniform(-5, 5))
        Ln = 0.38 + 0.25 * ring + rng.uniform(-0.03, 0.03)
        base = Vector((math.cos(az), math.sin(az), 0)) * (0.03 + 0.04 * ring) + Vector((0, 0, 0.02))
        frond(mb, base, az, elev, Ln, Ln * 0.2, (0.02, 0.0, 0.48, 1.0), 0, droop=0.2 + 0.5 * ring,
              fold=math.radians(38), segs=5, ao0=0.35, ao1=0.95, w0=0.0, ph=rng.random(), cen=cen, nb=0.45, upb=0.25)
    for j in range(2):  # espiga roja central
        az = j * math.pi / 2 + 0.3
        side = Vector((math.cos(az), math.sin(az), 0))
        strip(mb, [Vector((0, 0, 0.05)), Vector((0, 0, 0.3)), Vector((0, 0, 0.6))], 0.2, (0.52, 0.0, 0.98, 1.0), 0, side,
              (0.6, 1.0), (0.1, 0.5), ph=0.5)
    return finish(mb, sp, [leaf_mat(sp)])


def helecho_suelo(rng):
    sp = 'helecho_suelo'
    mb = L.MB()
    cen = Vector((0, 0, 0.3))
    N = 13
    for k in range(N):
        az = k * GOLD + rng.uniform(-0.1, 0.1)
        elev = math.radians(rng.uniform(30, 72))
        Ln = rng.uniform(0.7, 1.0)
        uv = (0.0, 0.0, 0.5, 1.0) if k % 2 else (0.5, 0.0, 1.0, 1.0)
        frond(mb, Vector((math.cos(az) * 0.04, math.sin(az) * 0.04, 0.0)), az, elev, Ln, Ln * 0.5, uv, 0,
              droop=rng.uniform(0.45, 0.7), fold=math.radians(14), twist=rng.uniform(-0.4, 0.4), segs=6, ao0=0.35,
              ao1=1.0, w0=0.0, ph=k / N, cen=cen, nb=0.4, upb=0.4)
    return finish(mb, sp, [leaf_mat(sp)])


def pasto(rng):
    sp = 'pasto'
    mb = L.MB()
    N = 7
    for k in range(N):
        az = TAU * k / N + rng.uniform(-0.2, 0.2)
        d = Vector((math.cos(az), math.sin(az), 0))
        side = Vector((-d.y, d.x, 0))
        Wc = rng.uniform(0.45, 0.6)
        Hc = Wc * rng.uniform(0.85, 1.0)
        c0 = d * 0.06

        def pos(u, v, c0=c0, side=side, d=d, Wc=Wc, Hc=Hc):
            return c0 + side * ((u - 0.5) * Wc * (1 + 0.25 * v)) + d * (0.12 * v * v * Hc) + UP * (v * Hc * (1 - 0.1 * v))

        def attr(u, v, p, d=d):
            return 0.35 + 0.65 * v ** 0.8, v ** 1.3, k / N, (UP * 0.75 + d * 0.25).normalized()

        L.grid(mb, 2, 2, pos, lambda u, v: (u, v), attr, 0)
    return finish(mb, sp, [leaf_mat(sp)])


# ───────────────────────── DETALLES (horneados) ─────────────────────────
def hojarasca(rng):
    sp = 'hojarasca'
    mb = L.MB()
    for k, (sz, rot, off) in enumerate(((1.7, 0.0, Vector((0, 0, 0))), (1.1, 1.1, Vector((0.55, 0.35, 0.004))))):
        def pos(u, v, sz=sz, rot=rot, off=off):
            x, y = (u - 0.5) * sz, (v - 0.5) * sz
            xr, yr = x * math.cos(rot) - y * math.sin(rot), x * math.sin(rot) + y * math.cos(rot)
            z = 0.02 + 0.025 * noise.noise(Vector((xr * 1.3, yr * 1.3, k * 3.0)))
            return off + Vector((xr, yr, z))

        L.grid(mb, 3, 3, pos, lambda u, v: (u, v), lambda u, v, p: (0.9, 0.0, 0.0, UP), 0)
    return finish(mb, sp, [leaf_mat(sp, double=False)])


def rock_mesh(mb, c, scale, sub, seed, flat=-0.15, facet=0.0, m=0, sharp=0.0):
    """Icosfera desplazada con ruido (y facetas tipo voronoi) y base aplanada."""
    import bmesh
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0)
    off = Vector((seed * 7.1, seed * 3.3, seed * 1.7))
    verts = []
    for v in bm.verts:
        p = v.co.copy()
        n1 = noise.noise(p * 1.3 + off)
        n2 = noise.noise(p * 3.1 + off * 2)
        r = 1 + 0.22 * n1 + 0.08 * n2
        if facet:
            cell = noise.voronoi(p * 1.6 + off, distance_metric='DISTANCE', exponent=2.5)[0]
            r -= facet * (cell[0] - 0.2)
        q = Vector((p.x * scale.x, p.y * scale.y, p.z * scale.z)) * r
        q.z = max(q.z, flat * scale.z)
        verts.append(q)
    zmin = min(q.z for q in verts)
    hz = max(q.z for q in verts) - zmin
    idmap = {}
    for v, q in zip(bm.verts, verts):
        p = c + Vector((q.x, q.y, q.z - zmin - 0.08 * hz))
        ao = 0.45 + 0.55 * sm(-0.05, 0.55 * hz, p.z - c.z)
        idmap[v.index] = mb.v(p, ao, 0.0, 0.0, None)
    for f in bm.faces:
        mb.f(tuple(idmap[v.index] for v in f.verts), tuple((0.0, 0.0) for _ in f.verts), m)
    bm.free()


def smart_uv(ob, margin=0.02):
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=margin, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode='OBJECT')


def bake_maps(ob, name, shader, res=512, nstrength=1.0, q=88):
    """Hornea color (EMIT) y normal (NORMAL, tangente) de un shader procedural al UV del objeto."""
    sc = bpy.context.scene
    L.cycles(sc, samples=16)
    sc.render.bake.margin = 12
    sc.render.bake.use_selected_to_active = False
    sc.render.bake.target = 'IMAGE_TEXTURES'
    keep = list(ob.data.materials)
    idx = [p.material_index for p in ob.data.polygons]
    m = bpy.data.materials.new('BAKE_' + name)
    t = L.NT(m)
    col, hgt = shader(t)
    em = t.new('ShaderNodeEmission')
    t.put(em.inputs['Color'], col)
    bump = t.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = nstrength
    bump.inputs['Distance'].default_value = 0.02
    t.put(bump.inputs['Height'], hgt)
    df = t.new('ShaderNodeBsdfDiffuse')
    t.L.new(bump.outputs['Normal'], df.inputs['Normal'])
    out = t.new('ShaderNodeOutputMaterial')
    img = bpy.data.images.new(name, res, res, alpha=False)
    nimg = bpy.data.images.new(name + '_n', res, res, alpha=False)
    nimg.colorspace_settings.name = 'Non-Color'
    tn = t.new('ShaderNodeTexImage')
    t.N.active = tn
    ob.data.materials.clear()
    ob.data.materials.append(m)
    ob.data.polygons.foreach_set('material_index', [0] * len(ob.data.polygons))
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    tn.image = img
    t.L.new(em.outputs[0], out.inputs['Surface'])
    bpy.ops.object.bake(type='EMIT')
    tn.image = nimg
    t.L.new(df.outputs[0], out.inputs['Surface'])
    bpy.ops.object.bake(type='NORMAL', normal_space='TANGENT')
    p1, p2 = TX(name + '.jpg'), TX(name + '_n.jpg')
    for im, p in ((img, p1), (nimg, p2)):
        im.file_format = 'JPEG'
        im.filepath_raw = p
        im.save(filepath=p, quality=q)
    ob.data.materials.clear()
    for mm in keep:
        ob.data.materials.append(mm)
    ob.data.polygons.foreach_set('material_index', idx)
    bpy.data.images.remove(img)
    bpy.data.images.remove(nimg)
    bpy.data.materials.remove(m)
    print(f'  horneado {name}: {os.path.getsize(p1) // 1024} KB + {os.path.getsize(p2) // 1024} KB')
    return p1, p2


def rock_shader(moss=1.0, seed=0.0, wet=0.0, cracks=1.0):
    def sh(t):
        p = t.coord('Object')
        p = t.vadd(p, (seed, seed * 0.7, seed * 0.3))
        _, _, nz = t.sep(t.geo('Normal'))
        _, _, pz = t.sep(t.coord('Object'))
        n1 = t.noise(p, None, 1.6, 6, 0.6)
        n2 = t.noise(p, None, 7.0, 5, 0.6)
        fine = t.noise(p, None, 40.0, 3, 0.6)
        cr = t.voronoi(p, None, 1.2, 'DISTANCE_TO_EDGE')
        crack = t.mul(t.sub(1.0, t.ramp(cr, 0.0, 0.03)), cracks)
        c = t.mix(L.hexl('#5b5d5c'), L.hexl('#9a9a93'), t.ramp(n1, 0.3, 0.72))
        c = t.mix(c, t.vmul(c, L.hexl('#f2ead8')), t.ramp(n2, 0.5, 0.7))
        c = t.vscale(c, t.add(0.9, t.mul(fine, 0.2)))
        c = t.vscale(c, t.sub(1.0, t.mul(crack, 0.35)))
        lich = t.sub(1.0, t.ramp(t.voronoi(p, None, 9.0), 0.1, 0.2))
        c = t.mix(c, L.hexl('#c9cda4'), t.mul(lich, t.mul(t.ramp(n2, 0.5, 0.56), 0.5)))
        if wet:
            c = t.vscale(c, t.add(1.0 - wet, t.mul(t.ramp(pz, 0.02, 0.18), wet)))
        mm = t.ramp(t.add(nz, t.add(t.mul(t.sub(n2, 0.5), 0.9), t.mul(t.sub(n1, 0.5), 0.5))), 0.72 - 0.2 * moss,
                    0.92 - 0.2 * moss)
        mm = t.mul(mm, moss)
        mc = t.mix(L.hexl('#2f5f1e'), L.hexl('#8cb840'), t.ramp(t.noise(p, None, 14.0, 6, 0.7), 0.35, 0.7))
        c = t.mix(c, mc, mm)
        h = t.add(t.mul(t.sub(1.0, crack), 0.4), t.add(t.mul(n2, 0.3), t.mul(fine, 0.12)))
        h = t.add(h, t.mul(mm, t.mul(t.noise(p, None, 30.0, 4, 0.7), 0.5)))
        return c, h
    return sh


def roca(rng, name, scale, sub, seed, facet, moss, flat=-0.15):
    mb = L.MB()
    rock_mesh(mb, Vector((0, 0, 0)), scale, sub, seed, flat=flat, facet=facet)
    ob = mb.build(name, [])
    smart_uv(ob)
    p1, p2 = bake_maps(ob, name, rock_shader(moss, seed),
                       512, 1.0)
    ob.data.materials.append(L.mat_tex('ROCA_' + name, p1, p2, rough=0.85))
    return ob


def piedras_rio(rng):
    mb = L.MB()
    specs = [((0, 0, 0), (0.55, 0.42, 0.26), 2), ((0.62, 0.25, 0), (0.36, 0.3, 0.2), 2), ((-0.5, 0.35, 0), (0.3, 0.24, 0.16), 2),
             ((0.15, -0.55, 0), (0.42, 0.3, 0.2), 2), ((-0.3, -0.35, 0), (0.18, 0.15, 0.1), 1), ((0.45, -0.15, 0), (0.15, 0.12, 0.09), 1)]
    for k, (c, s, sub) in enumerate(specs):
        bm_start = len(mb.V)
        rock_mesh(mb, Vector(c), Vector(s), sub, 10 + k * 3.7, flat=-0.3)
        for i in range(bm_start, len(mb.V)):  # piedras de río: lisas y redondeadas
            pass
    ob = mb.build('piedras_rio', [])
    smart_uv(ob, 0.03)

    def sh(t):
        c0, h0 = rock_shader(0.45, 3.0, wet=0.35, cracks=0.0)(t)
        p = t.coord('Object')
        v = t.voronoi(p, None, 1.1, 'F1', out='Color')
        c = t.vmul(c0, t.vadd(t.vscale(v, 0.16), (0.8, 0.86, 0.92)))
        return c, t.mul(h0, 0.5)
    p1, p2 = bake_maps(ob, 'piedras_rio', sh, 512, 0.6)
    ob.data.materials.append(L.mat_tex('ROCA_piedras_rio', p1, p2, rough=0.6))
    return ob


def tronco_caido(rng):
    mb = L.MB()
    Ln = 4.2
    pts = [Vector((-Ln / 2 + Ln * t, 0.18 * math.sin(t * 3.0), 0.3 + 0.05 * math.sin(t * 5))) for t in [i / 7 for i in range(8)]]
    rad = [0.36 - 0.06 * (i / 7) for i in range(8)]
    L.tube(mb, pts, rad, 10, 0, uv_rep=1, v_len=1.0, ao=lambda p, t: 0.4 + 0.6 * sm(0.0, 0.55, p.z), wind=lambda p, t: 0.0)
    for end, r in ((0, rad[0]), (7, rad[-1])):  # tapas con anillos
        p = pts[end]
        tg = (pts[1] - pts[0]).normalized() if end == 0 else (pts[7] - pts[6]).normalized()
        fr = L.frames(pts)[end]
        c = mb.v(p + tg * (0.02 if end else -0.02), 0.85, 0.0, 0.0, tg if end else -tg)
        ring = []
        for j in range(10):
            a = TAU * j / 10
            d = fr[1] * math.cos(a) + fr[2] * math.sin(a)
            q = p + d * r * 0.97 + tg * (0.0 if end else 0.0)
            ring.append(mb.v(q, 0.4 + 0.6 * sm(0.0, 0.55, q.z), 0.0, 0.0, tg if end else -tg))
        for j in range(10):
            a, b = ring[j], ring[(j + 1) % 10]
            mb.f((c, a, b) if end else (c, b, a), ((0, 0), (0, 0), (0, 0)), 0)
    for k, t in enumerate((0.3, 0.68)):  # muñones de ramas
        p = L.bez(pts[0], pts[3], pts[7], t)
        d = Vector((0.3 * (1 if k else -1), 0.6 * (1 if k else -1), 0.75)).normalized()
        L.tube(mb, [p, p + d * 0.45, p + d * 0.75], [0.12, 0.09, 0.07], 6, 0, uv_rep=1, ao=lambda p, t: 0.75,
               wind=lambda p, t: 0.0, cap=True)
    for k in range(7):  # hongos de repisa
        t = rng.uniform(0.15, 0.85)
        p = L.bez(pts[0], pts[3], pts[7], t)
        a = rng.uniform(-1.2, 1.2) + (math.pi if k % 2 else 0)
        d = Vector((0, math.cos(a), math.sin(a) * 0.4)).normalized()
        base = p + d * 0.33 + Vector((0, 0, rng.uniform(-0.1, 0.15)))
        R = rng.uniform(0.09, 0.17)
        side = Vector((1, 0, 0))
        hub = mb.v(base, 0.7, 0.0, 0.0, UP)
        rim = []
        for j in range(7):
            ang = math.pi * j / 6
            q = base + side * (math.cos(ang) * R) + d * (math.sin(ang) * R) + Vector((0, 0, -0.015))
            rim.append(mb.v(q, 0.9, 0.0, 0.0, (UP + d * 0.3).normalized()))
        below = mb.v(base + Vector((0, 0, -0.04)), 0.45, 0.0, 0.0, -UP)
        for j in range(6):
            mb.f((hub, rim[j + 1], rim[j]), ((0, 0), (0, 0), (0, 0)), 1)
            mb.f((below, rim[j], rim[j + 1]), ((0, 0), (0, 0), (0, 0)), 1)
    ob = mb.build('tronco_caido', [])
    # marca de material 1 = hongo → atributo para el horneado
    fa = ob.data.attributes.new('hongo', 'FLOAT', 'FACE')
    fa.data.foreach_set('value', [1.0 if p.material_index == 1 else 0.0 for p in ob.data.polygons])
    ob.data.polygons.foreach_set('material_index', [0] * len(ob.data.polygons))
    smart_uv(ob, 0.02)

    def sh(t):
        p = t.coord('Object')
        px, py, pz = t.sep(p)
        nx, _, nz = t.sep(t.geo('Normal'))
        stretched = t.comb(t.mul(px, 0.5), t.mul(py, 5.0), t.mul(pz, 5.0))
        fur = t.noise(stretched, None, 3.0, 6, 0.65)
        n1 = t.noise(p, None, 2.0, 4, 0.6)
        c = t.mix(L.hexl('#3e2e22'), L.hexl('#7a6250'), t.ramp(fur, 0.35, 0.7))
        c = t.vscale(c, t.add(0.85, t.mul(n1, 0.3)))
        mm = t.ramp(t.add(nz, t.mul(t.sub(n1, 0.5), 1.0)), 0.15, 0.45)
        mc = t.mix(L.hexl('#2c5a1c'), L.hexl('#8ab83e'), t.ramp(t.noise(p, None, 12.0, 6, 0.7), 0.35, 0.7))
        c = t.mix(c, mc, mm)
        cap = t.ramp(t.math('ABSOLUTE', nx), 0.75, 0.9)
        rr = t.math('SQRT', t.add(t.mul(py, py), t.mul(t.sub(pz, 0.3), t.sub(pz, 0.3))))
        rings = t.math('SINE', t.add(t.mul(rr, 70.0), t.mul(n1, 3.0)))
        wood = t.mix(L.hexl('#a27a4e'), L.hexl('#c9a06a'), t.ramp(rings, -0.4, 0.6))
        wood = t.mix(wood, L.hexl('#4a3424'), t.ramp(rr, 0.27, 0.32))
        c = t.mix(c, wood, cap)
        hg = t.attr('hongo', 'Fac')
        fr = t.math('FRACT', t.mul(t.add(t.mul(px, 9.0), t.mul(py, 7.0)), 3.0))
        fung = t.mix(L.hexl('#c8641e'), L.hexl('#f0d9a8'), t.ramp(fr, 0.55, 0.85))
        c = t.mix(c, fung, hg)
        h = t.add(t.mul(fur, 0.6), t.mul(mm, t.mul(t.noise(p, None, 25.0, 4, 0.7), 0.5)))
        h = t.add(h, t.mul(cap, t.mul(rings, 0.1)))
        return c, h
    p1, p2 = bake_maps(ob, 'tronco_caido', sh, 512, 0.9)
    ob.data.materials.append(L.mat_tex('CORTEZA_tronco_caido', p1, p2, rough=0.88))
    return ob


# ───────────────────────── catálogo ─────────────────────────
KIT = {
    # nombre: (constructor, especie, científico, alto real m, dato educativo (alineado con las fichas del Diario),
    #          ficha del Diario en content/cap1/lecciones.js, radio de colisión m)
    'palma_sierra': (palma_sierra, 'Palma de sierra', 'Prestoea montana', '10-15',
                     'Tras los huracanes Hugo y Georges fue la especie que más creció en un estudio de El Yunque.',
                     'palma_sierra', 0.35),
    'yagrumo': (yagrumo, 'Yagrumo', 'Cecropia schreberiana', '15-20',
                'Árbol pionero: tras un huracán llena los claros; el envés plateado de sus hojas brilla con el viento.',
                'yagrumo', 0.25),
    'palma_sierra_joven': (lambda r: palma_sierra(r, HT=2.6, N=11, ls=0.78, fruits=0, dry=1, roots=6),
                           'Palma de sierra joven', 'Prestoea montana', '3-6',
                           'Joven: brota rápido en los claros que abren los huracanes.', 'palma_sierra', 0.25),
    'yagrumo_joven': (lambda r: yagrumo(r, HT=3.0, nb=2, nl=7, ls=0.85), 'Yagrumo joven', 'Cecropia schreberiana',
                      '3-6', 'Crece muy rápido: es de los primeros en ocupar un claro.', 'yagrumo', 0.15),
    'arbol_enano': (arbol_enano, 'Árbol del bosque enano', 'Tabebuia rigida', '3-6',
                    'En las cumbres llueve 150-200 pulgadas al año; el viento y la niebla lo mantienen bajo y con musgo.',
                    'lluvia_bosque_enano', 0.3),
    'tabonuco': (tabonuco, 'Tabonuco', 'Dacryodes excelsa', '25-35',
                 'Da nombre al bosque más bajo de El Yunque, por debajo de unos 2,000 pies.', 'tabonuco', 0.45),
    'helecho_arboreo': (helecho_arboreo, 'Helecho gigante', 'Cyathea arborea', '5-10',
                        'Un helecho del tamaño de un árbol; es común en El Yunque.', 'helecho_gigante', 0.25),
    'ceiba': (ceiba, 'Ceiba', 'Ceiba pentandra', '30-50',
              'Uno de los árboles más altos; sus raíces en tabla la sostienen.', 'ceiba', 2.0),
    'flamboyan': (flamboyan, 'Flamboyán', 'Delonix regia', '8-12',
                  'No es nativo: viene de Madagascar. Florece rojo en verano.', 'flamboyan', 0.6),
    'bambu': (bambu, 'Bambú', 'Bambusa vulgaris', '10-15',
              'Una hierba gigante introducida en Puerto Rico; no es nativa.', 'bambu', 0.7),
    'heliconia': (heliconia, 'Heliconia', 'Heliconia caribaea', '2-4',
                  'Sus brácteas rojas las visitan los colibríes.', 'heliconia', 0.0),
    'bromelia': (bromelia, 'Bromelia', 'Guzmania berteroniana', '0.4-0.6',
                 'Guarda agua entre sus hojas; el coquí pone allí sus huevos.', 'bromelia', 0.0),
    'helecho_suelo': (helecho_suelo, 'Helecho de suelo', 'Nephrolepis sp.', '0.5-1',
                      'Se reproduce con esporas, no con semillas.', None, 0.0),
    'pasto': (pasto, 'Pasto', 'gramíneas', '0.3-0.6', 'Sus raíces sujetan la tierra de las orillas.', None, 0.0),
    'hojarasca': (hojarasca, 'Hojarasca', '-', '-', 'Hongos e insectos la descomponen y devuelven nutrientes al suelo.',
                  None, 0.0),
    'roca_musgo_a': (lambda r: roca(r, 'roca_musgo_a', Vector((0.8, 0.68, 0.62)), 3, 1.0, 0.0, 1.0), 'Roca con musgo',
                     '-', '-', 'El musgo retiene agua como una esponja.', None, 0.75),
    'roca_musgo_b': (lambda r: roca(r, 'roca_musgo_b', Vector((1.05, 0.75, 0.42)), 3, 5.0, 0.35, 0.8, flat=-0.3),
                     'Roca con musgo', '-', '-', 'El musgo retiene agua como una esponja.', None, 0.9),
    'piedras_rio': (piedras_rio, 'Piedras de río', '-', '-', 'El agua del río las pule y redondea con el tiempo.', None,
                    0.0),
    'tronco_caido': (tronco_caido, 'Tronco caído', '-', '-',
                     'Al pudrirse alimenta hongos, insectos y plantas nuevas.', None, 0.4),
}

if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    todo = [n for n in KIT if not argv or n in argv]
    man_path = os.path.join(L.MODELS, 'entorno_kit.json')
    manifest = json.load(open(man_path)) if os.path.exists(man_path) else {}
    for n in todo:
        L.reset()
        fn, esp, cien, alto_real, dato, ficha, rcol = KIT[n]
        ob = fn(random.Random(zlib.crc32(n.encode()) % 1000 + 7))  # semilla estable
        bb = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
        h = max(p.z for p in bb)
        w = max(max(p.x for p in bb) - min(p.x for p in bb), max(p.y for p in bb) - min(p.y for p in bb))
        info = L.export_glb(ob, n)
        manifest[n] = dict(especie=esp, cientifico=cien, alto_real_m=alto_real, alto_m=round(h, 2), ancho_m=round(w, 2),
                           tris=info['tris'], kb=round(info['size'] / 1024), materiales=info['mats'], dato=dato,
                           ficha=ficha, radio_colision=rcol)
        print(f"OK {n:16s} tris={info['tris']:5d} size={info['size'] / 1024:6.0f}KB alto={h:5.2f} ancho={w:5.2f} "
              f"mats={info['alpha']} attrs={info['attrs']} imgs={[(i[0], i[2] // 1024) for i in info['imgs']]}")
    json.dump(manifest, open(man_path, 'w'), ensure_ascii=False, indent=1)
