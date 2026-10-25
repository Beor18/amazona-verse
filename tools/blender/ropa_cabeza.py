# Piezas de CABEZA, LENTES y PAÑUELO del ropero (Vittata). Blender 4.2 sin ventana:
#   cd ~ && Blender -b ~/AmazonaVerse/04_Blender_3D/vittata_rig_final.blend --python ~/AmazonaVerse/Juego/tools/blender/ropa_cabeza.py [-- gorra pava ...]
# Sin lista tras `--` se construyen todas. Cada pieza: modela → comprueba (BVH del cuerpo y ojos) → preview → export.
# Blender: Z arriba, el personaje mira a -Y. Acimut a=0 al frente, a=+90° hacia +X (lado izquierdo del personaje).
import sys, os, math
sys.path.insert(0, os.path.expanduser('~/AmazonaVerse/Juego/tools/blender'))
from ropa_lib import *

R = math.radians
AX = Vector((0, 0.03, 0))  # eje vertical de la cabeza (x=0, y=0.03)


def D(a):
    return Vector((math.sin(a), -math.cos(a), 0))


def M():
    """Materiales (colores de prueba para TELA/ACENTO/PAJA; el juego los cambia por nombre)."""
    return dict(TELA=mat('TELA', hexrgb('#d0473a')), ACENTO=mat('ACENTO', hexrgb('#2a5bd7'), 0.5),
                PAJA=mat('PAJA', hexrgb('#d9b56a'), 0.9), BLANCO=mat('BLANCO', hexrgb('#f4f4f0'), 0.6),
                NEGRO=mat('NEGRO', hexrgb('#1c1c1e'), 0.5))


def put(o, m):
    o.data.materials.clear(); o.data.materials.append(m); return o


def smooth_cyc(vals, it=2):
    n = len(vals)
    for _ in range(it): vals = [(vals[i - 1] + 2 * vals[i] + vals[(i + 1) % n]) / 4 for i in range(n)]
    return vals


# ---------------------------------------------------------------------------------------------- gorras
def crown(name, rim, c=(0, 0.03, 1.26), r=(0.235, 0.24, 0.155), seg=48, rows=12, deform=None, offset=0.008):
    """Copa: elipsoide recortado por abajo en z=rim(a), empujado por fuera de la cabeza.
    Devuelve (obj, V, N): posiciones y normales (hacia fuera) por fila/columna + polo."""
    c = Vector(c); P = []
    for j in range(rows):
        row = []
        for i in range(seg):
            a = 2 * math.pi * i / seg
            cr = max(-0.97, min(0.97, (rim(a) - c.z) / r[2])); ph = math.acos(cr) * (1 - j / rows) ** 0.9
            p = Vector((r[0] * math.sin(ph) * math.sin(a), c.y - r[1] * math.sin(ph) * math.cos(a), c.z + r[2] * math.cos(ph)))
            if deform: p = deform(p, a, j / rows)
            row.append(p)
        P.append(row)
    pole = Vector((0, c.y, c.z + r[2]))
    if deform: pole = deform(pole, 0, 1.0)
    return shell_from(name, P, pole, offset, (0, c.y, c.z - 0.05))


def shell_from(name, P, pole, offset=0.008, center=(0, 0.03, 1.2), smooth=3):
    """Malla de casquete (filas cerradas + polo) empujada por fuera de la cabeza → (obj, V, N)."""
    seg = len(P[0]); rows = len(P)
    o = grid_mesh(name, P, close_u=True, pole=pole)
    push_outside(o, offset=offset, smooth=smooth)
    orient_out(o, center)
    me = o.data; me.update()
    V = [[me.vertices[j * seg + i].co.copy() for i in range(seg)] for j in range(rows)]
    N = [[me.vertices[j * seg + i].normal.copy() for i in range(seg)] for j in range(rows)]
    V.append([me.vertices[rows * seg].co.copy()]); N.append([me.vertices[rows * seg].normal.copy()])
    return o, V, N


def seams(V, N, cols, th, r=0.0028, name='costura'):
    out = []
    for i in cols:
        pts = [V[j][i] + N[j][i] * (th + 0.001) for j in range(len(V) - 1)]
        top = V[-1][0] + N[-1][0] * (th + 0.001)
        pts.append(pts[-1].lerp(top, 0.6))
        out.append(tube_path(name, pts, r, seg=6))
    return out


def visor(name, V, N, az, seg=48, half=10, L0=0.14, tilt=0.032, curl=0.028, th=0.009, rows=6, lift=0.0):
    """Visera curva con grosor y bisel, pegada al borde de la copa, centrada en el acimut `az`."""
    ic = round(az / (2 * math.pi) * seg) % seg; P = []; outer = []
    for k in range(-half, half + 1):
        i = (ic + k) % seg; a = 2 * math.pi * i / seg; s = k / half
        L = max(0.006, L0 * math.cos(s * math.pi / 2) ** 0.55)
        base = V[0][i] + N[0][i] * 0.002 - D(a) * 0.004
        col = []
        for m in range(rows + 1):
            t = m / rows
            p = base + D(a) * L * t
            p.z += (-tilt + lift) * (L / L0) * t - curl * s * s * t ** 1.3
            col.append(p)
        P.append(col); outer.append((col, L))
    G = [[P[k][m] for k in range(len(P))] for m in range(rows + 1)]
    o = grid_mesh(name, G)
    add_mod(o, 'SOLIDIFY', thickness=th, offset=0, use_rim=True, use_even_offset=True)
    add_mod(o, 'BEVEL', width=0.0025, segments=2, limit_method='ANGLE', angle_limit=R(50))
    apply_mods(o)
    # pespuntes paralelos al borde
    st = []
    for dd in (0.012, 0.024):
        pts = []
        for col, L in outer[1:-1]:
            if L < dd + 0.02: continue
            t = 1 - dd / L; m = t * rows; m0 = min(int(m), rows - 1); f = m - m0
            p = col[m0].lerp(col[m0 + 1], f); p.z += th / 2 + 0.0008
            pts.append(p)
        if len(pts) > 3: st.append(tube_path('pespunte', pts, 0.0016, seg=5))
    return o, st


def cap_rim(back=1.238, front=1.292, arch=0.05, arch_w=R(30)):
    def f(a):
        z = back + (front - back) * (0.5 + 0.5 * math.cos(a))
        d = abs((a - math.pi + math.pi) % (2 * math.pi) - math.pi)  # distancia angular a la nuca
        if d < arch_w and arch: z += arch * math.cos(d / arch_w * math.pi / 2) ** 2
        return z
    return f


def gorra(name='gorra', reves=False, trucker=False):
    mt = M(); seg = 48; th = 0.0045
    if reves:
        def rimf(a):  # borde casi plano y alto (visera sobre el mechón); abertura en arco al frente
            z = 1.296 - 0.004 * math.cos(a)
            d = abs((a + math.pi) % (2 * math.pi) - math.pi)
            if d < R(26): z += 0.032 * math.cos(d / R(26) * math.pi / 2) ** 2
            return z
        rim = rimf
    else:
        rim = cap_rim()
    deform = None; r = (0.238, 0.243, 0.168)
    if trucker:
        r = (0.238, 0.243, 0.19)
        def deform(p, a, t):  # panel frontal alto, casi vertical y abombado
            f = max(0.0, math.cos(a)) ** 1.5 * math.sin(min(1.0, t * 1.25) * math.pi) * (1 if t < 1 else 0)
            return p + Vector((0, -0.03 * f, 0.03 * f))
    cr, V, N = crown(name + '_copa', rim, r=r, seg=seg, deform=deform)
    cols = [8 * k for k in range(6)] if trucker else [4 + 8 * k for k in range(6)]
    parts = seams(V, N, cols, th)
    add_mod(cr, 'SOLIDIFY', thickness=th, offset=1, use_rim=True, use_even_offset=True)
    apply_mods(cr)
    if trucker:  # frente BLANCO (dos paneles delanteros), resto malla TELA
        cr.data.materials.append(mt['BLANCO']); cr.data.materials.append(mt['TELA'])
        for p in cr.data.polygons:
            a = math.atan2(p.center.x, -(p.center.y - 0.03))
            p.material_index = 0 if abs(a) < R(60) and p.center.z > 1.25 else 1
        for s, i in zip(parts, cols): put(s, mt['BLANCO'] if i in (0,) else mt['TELA'])
    else:
        put(cr, mt['TELA']); [put(s, mt['TELA']) for s in parts]
    # ribete del borde inferior
    rp = [V[0][i] + N[0][i] * th * 0.5 for i in range(seg)]
    parts.append(put(tube_path('ribete', rp, 0.0048, seg=6, closed=True), mt['ACENTO']))
    vz, st = visor('visera', V, N, math.pi if reves else 0.0, seg=seg, lift=0.085 if reves else 0.0,
                   tilt=0.02 if reves else 0.032, curl=0.01 if reves else 0.028)
    parts += [put(vz, mt['ACENTO'])] + [put(s, mt['ACENTO']) for s in st]
    top = V[-1][0] + N[-1][0] * th
    parts.append(put(sphere('boton', top, 0.016, (1, 1, 0.5), seg=12, rings=6), mt['ACENTO']))
    if reves:  # correa del cierre, cruzando la abertura (ahora al frente)
        pts = []
        for k in range(-4, 5):
            a = R(6.5 * k); z = 1.293
            pts.append(Vector((0, 0.03, z)) + D(a) * (head_radius(z, a, 0.03) + 0.011))
        parts.append(put(tube_path('correa', pts, 0.0055, seg=6), mt['ACENTO']))
    if trucker:  # cierre trasero (snapback) bajo el arco
        ib = seg // 2; pts = [V[0][(ib + k) % seg] + N[0][(ib + k) % seg] * 0.004 for k in range(-4, 5)]
        parts.append(put(tube_path('broche', pts, 0.006, seg=6), mt['ACENTO']))
    return [cr] + parts



# ---------------------------------------------------------------------------------------------- sombreros
HY = 0.04  # eje de los sombreros (x=0, y=HY)


def hat_crown(name, zb, prof, rx=0.245, ry=0.258, seg=48, deform=None, offset=0.008):
    """Copa por perfil: prof = [(dz, escala_radial), ...] de la base (zb(a)) hacia arriba; el último es el polo."""
    P = []; nr = len(prof) - 1
    for j, (dz, s) in enumerate(prof[:-1]):
        row = []
        for i in range(seg):
            a = 2 * math.pi * i / seg
            p = Vector((rx * s * math.sin(a), HY - ry * s * math.cos(a), zb(a) + dz))
            if deform: p = deform(p, a, j / nr)
            row.append(p)
        P.append(row)
    zm = sum(zb(2 * math.pi * i / seg) for i in range(seg)) / seg
    pole = Vector((0, HY, zm + prof[-1][0]))
    if deform: pole = deform(pole, 0.0, 1.0)
    return shell_from(name, P, pole, offset, (0, HY, zm), smooth=2)


def grid_n(G, m, i, closed=True):
    """Normal aproximada de una rejilla G[m][i] (filas m, columnas i cerradas)."""
    n_ = len(G[0]); M = len(G)
    du = G[m][(i + 1) % n_] - G[m][i - 1]
    dv = G[min(m + 1, M - 1)][i] - G[max(m - 1, 0)][i]
    nn = du.cross(dv).normalized()
    return nn if nn.z >= 0 else -nn


def brim(name, V0, N0, outer, zfun, rows=6, th=0.008, bevel=True, inset=0.004):
    """Ala: anillo desde la base de la copa hasta outer(a)=(rx,ry); zfun(a,t) sube/baja el ala."""
    seg = len(V0); G = []
    for m in range(rows + 1):
        t = m / rows; row = []
        for i in range(seg):
            a = 2 * math.pi * i / seg
            b = V0[i] - N0[i] * inset; rx, ry = outer(a)
            o = Vector((rx * math.sin(a), HY - ry * math.cos(a), b.z))
            p = b.lerp(o, t); p.z = b.z + zfun(a, t)
            row.append(p)
        G.append(row)
    o = grid_mesh(name, G, close_u=True)
    add_mod(o, 'SOLIDIFY', thickness=th, offset=0, use_rim=True, use_even_offset=True)
    if bevel: add_mod(o, 'BEVEL', width=0.0025, segments=2, limit_method='ANGLE', angle_limit=R(50))
    apply_mods(o)
    return o, G


def band(name, V, N, j0, j1, off=0.004, th=0.003):
    o = grid_mesh(name, [[V[j][i] + N[j][i] * off for i in range(len(V[0]))] for j in range(j0, j1 + 1)], close_u=True)
    add_mod(o, 'SOLIDIFY', thickness=th, offset=1, use_rim=True)
    apply_mods(o)
    return o


def ring_tube(name, G, m, up, r, seg=6, step=1):
    """Tubo cerrado sobre la fila m de una rejilla de ala, desplazado `up` según la normal."""
    pts = [G[m][i] + grid_n(G, m, i) * up for i in range(0, len(G[0]), step)]
    return tube_path(name, pts, r, seg=seg, closed=True)


def oriented_sphere(name, c, r, U, V, W, s=(1, 1, 1), seg=10, rings=6):
    o = sphere(name, (0, 0, 0), r, seg=seg, rings=rings)
    for v in o.data.vertices:
        x, y, z = v.co; v.co = c + U * (x * s[0]) + V * (y * s[1]) + W * (z * s[2])
    return o


def frame_at(n):
    n = n.normalized(); u = Vector((0, 0, 1)).cross(n)
    u = u.normalized() if u.length > 1e-4 else Vector((1, 0, 0))
    return u, n.cross(u).normalized(), n


def hibiscus(c, n, size, mp, mc, rot=0.0):
    u, v, n = frame_at(n); out = []
    for k in range(5):
        th_ = rot + k * 2 * math.pi / 5; d = u * math.cos(th_) + v * math.sin(th_); sd = n.cross(d)
        G = []
        for m in range(5):
            t = m / 4; w = size * 0.5 * math.sin(math.pi * (0.12 + 0.62 * t)) * (0.55 + 0.6 * t)
            row = []
            for q in range(4):
                sq = -1 + 2 * q / 3
                row.append(c + d * (size * (0.08 + t)) + sd * (w * sq) + n * (size * (0.32 * t * t + 0.1 * sq * sq * t) + 0.002 * k / 5))
            G.append(row)
        out.append(put(grid_mesh('petalo', G), mp))
    tip = c + n * size * 0.75 + u * size * 0.15
    out.append(put(tube_path('estambre', [c, c + n * size * 0.4, tip], 0.0028, seg=5), mc))
    out.append(put(sphere('polen', tip, 0.0065, seg=8, rings=4), mc))
    return out


def hat_base(z0):
    return lambda a: z0 + 0.008 * math.cos(a)  # un poco más alto al frente (despeja los ojos)


ROUND = [(0, 1.0), (0.012, 0.995), (0.028, 0.99), (0.05, 0.98), (0.08, 0.955), (0.105, 0.91), (0.128, 0.82),
         (0.145, 0.66), (0.156, 0.45), (0.162, 0.22), (0.165, 0)]


def sombrero(name, kind):
    mt = M(); parts = []; seg = 48
    if kind == 'pava':
        prof = [(0, 1.0), (0.012, 0.99), (0.028, 0.975), (0.05, 0.92), (0.075, 0.82), (0.1, 0.66), (0.12, 0.48),
                (0.135, 0.3), (0.145, 0.14), (0.15, 0)]
        def deform(p, a, t):  # pico al frente: la parte alta se adelanta y se pellizca
            f = t ** 1.6
            q = p + Vector((0, -0.075 * f * max(0.0, math.cos(a)) ** 3 - 0.03 * f, 0.02 * f * max(0.0, math.cos(a)) ** 4))
            q.x *= 1 - 0.18 * f * max(0.0, math.cos(a)) ** 2
            return q
        cr, V, N = hat_crown(name, hat_base(1.30), prof, deform=deform)
        put(cr, mt['PAJA'])
        b, G = brim('ala', V[0], N[0], lambda a: (0.47, 0.49), lambda a, t: -0.012 * t + 0.03 * math.cos(4 * a) * t ** 2, rows=6)
        parts += [put(b, mt['PAJA']), put(ring_tube('borde', G, len(G) - 1, 0.0, 0.012, seg=8), mt['PAJA']),
                  put(band('cinta', V, N, 0, 2), mt['ACENTO'])]
    elif kind in ('paja', 'tropical'):
        cr, V, N = hat_crown(name, hat_base(1.30), ROUND)
        put(cr, mt['PAJA'])
        b, G = brim('ala', V[0], N[0], lambda a: (0.37, 0.39), lambda a, t: -0.045 * t ** 1.6, rows=5)
        parts += [put(b, mt['PAJA']), put(ring_tube('borde', G, len(G) - 1, 0.0, 0.0065, seg=6), mt['PAJA']),
                  put(band('cinta', V, N, 0, 2), mt['ACENTO'])]
        if kind == 'tropical':
            fl = [mat('FLOR_ROSA', hexrgb('#f0508c'), 0.6), mat('FLOR_AMARILLA', hexrgb('#ffd23f'), 0.6),
                  mat('FLOR_BLANCA', hexrgb('#fafafa'), 0.6)]
            spots = [(R(30), 1, 0, 0.066), (R(62), 1, 1, 0.07), (R(94), 1, 2, 0.066), (R(124), 1, 0, 0.058), (R(-32), 0, 1, 0.052)]
            for k, (a, j, ci, sz) in enumerate(spots):
                i = round(a / (2 * math.pi) * seg) % seg
                n = (N[j][i] + Vector((0, 0, 0.35))).normalized()
                c = V[j][i] + N[j][i] * 0.012
                parts += hibiscus(c, n, sz, fl[ci], fl[1] if ci != 1 else fl[0], rot=k * 0.7)
    elif kind == 'vaquero':
        prof = [(0, 1.0), (0.012, 0.995), (0.028, 0.99), (0.06, 0.975), (0.1, 0.95), (0.14, 0.91), (0.17, 0.85),
                (0.188, 0.72), (0.196, 0.5), (0.2, 0.25), (0.202, 0)]
        def deform(p, a, t):  # hendidura central y pellizcos al frente
            f = max(0.0, (t - 0.55) / 0.45)
            q = p.copy(); q.z -= 0.065 * f ** 1.1 * max(0.0, 1 - (q.x / 0.15) ** 2)
            q.x *= 1 - 0.28 * f * max(0.0, math.cos(a)) ** 2
            return q
        cr, V, N = hat_crown(name, hat_base(1.30), prof, rx=0.25, ry=0.265, deform=deform)
        put(cr, mt['TELA'])
        b, G = brim('ala', V[0], N[0], lambda a: (0.40, 0.44),
                    lambda a, t: 0.11 * math.sin(a) ** 2 * t ** 2.2 - 0.035 * max(0.0, math.cos(a)) ** 2 * t ** 1.5, rows=6)
        parts += [put(b, mt['TELA']), put(ring_tube('borde', G, len(G) - 1, 0.0, 0.006, seg=6), mt['TELA']),
                  put(band('cinta', V, N, 0, 2, th=0.004), mt['ACENTO'])]
        # hebilla de la cinta (lado izquierdo)
        i = round(R(70) / (2 * math.pi) * seg); u_, v_, n_ = frame_at(N[1][i])
        parts.append(put(oriented_sphere('hebilla', V[1][i] + N[1][i] * 0.009, 0.014, u_, v_, n_, (1, 0.9, 0.35)), mt['ACENTO']))
    elif kind == 'pescador':
        zb = lambda a: 1.296 - 0.006 * math.cos(a)
        prof = [(0, 1.0), (0.012, 0.99), (0.04, 0.965), (0.07, 0.935), (0.1, 0.9), (0.125, 0.86), (0.142, 0.78),
                (0.162, 0.6), (0.168, 0.32), (0.17, 0)]
        cr, V, N = hat_crown(name, zb, prof, rx=0.255, ry=0.268)
        put(cr, mt['TELA'])
        b, G = brim('ala', V[0], N[0], lambda a: (0.35, 0.37), lambda a, t: -(0.085 * (0.5 + 0.5 * math.cos(a)) ** 0.8 + 0.003) * t, rows=6, th=0.007)
        parts += [put(b, mt['TELA'])]
        for m in (2, 4, 6):  # costuras circulares del ala
            parts.append(put(ring_tube('pespunte', G, m, 0.0045 if m < 6 else 0.0, 0.0018 if m < 6 else 0.005, seg=4 if m < 6 else 6, step=1 if m == 6 else 2), mt['TELA']))
        for j in (3, 6):  # costuras de la copa
            pts = [V[j][i] + N[j][i] * 0.0015 for i in range(0, seg, 2)]
            parts.append(put(tube_path('pespunte', pts, 0.0018, seg=4, closed=True), mt['TELA']))
    elif kind == 'constructor':
        rim = lambda a: 1.268 + 0.026 * (0.5 + 0.5 * math.cos(a))
        cr, V, N = crown(name, rim, c=(0, 0.03, 1.275), r=(0.262, 0.276, 0.2), seg=seg, rows=12, offset=0.022)
        th = 0.008
        add_mod(cr, 'SOLIDIFY', thickness=th, offset=1, use_rim=True, use_even_offset=True); apply_mods(cr)
        put(cr, mt['ACENTO'])
        rows = len(V) - 1
        for i, rr in ((0, 0.018), (6, 0.011), (42, 0.011)):  # cresta central y nervios laterales
            j0 = 1 if i == 0 else 3
            fwd = [V[j][i] + N[j][i] * (th - 0.006) for j in range(j0, rows)]
            back = [V[j][(i + seg // 2) % seg if i == 0 else (seg - i + seg // 2) % seg] + N[j][(i + seg // 2) % seg if i == 0 else (seg - i + seg // 2) % seg] * (th - 0.006) for j in range(rows - 1, j0 - 1, -1)]
            if i != 0:  # nervios laterales: del frente hacia atrás, sin pasar por el polo
                back = [V[j][(seg // 2 - i) % seg] + N[j][(seg // 2 - i) % seg] * (th - 0.006) for j in range(rows - 2, j0 - 1, -1)]
                fwd = fwd[:-1]
            top = V[-1][0] + N[-1][0] * (th - 0.006)
            pts = fwd + ([top] if i == 0 else []) + back
            parts.append(put(tube_path('cresta', pts, rr, seg=10), mt['ACENTO']))
        # ala completa, más ancha al frente
        G = []
        for m in range(4):
            t = m / 3; row = []
            for i in range(seg):
                a = 2 * math.pi * i / seg; w = 0.03 + 0.06 * max(0.0, math.cos(a)) ** 3
                p = V[0][i] + N[0][i] * th * 0.5 + D(a) * (w * t - 0.004); p.z -= 0.012 * t * t
                row.append(p)
            G.append(row)
        al = grid_mesh('ala', G, close_u=True)
        add_mod(al, 'SOLIDIFY', thickness=0.009, offset=0, use_rim=True, use_even_offset=True)
        add_mod(al, 'BEVEL', width=0.003, segments=2, limit_method='ANGLE', angle_limit=R(50)); apply_mods(al)
        parts.append(put(al, mt['ACENTO']))
        # arnés interior (NEGRO): banda a la cabeza + 4 tirantes a la copa
        ring = []
        for z in (1.30, 1.322):
            row = []
            for i in range(32):
                a = 2 * math.pi * i / 32
                row.append(Vector((0, 0.04, z)) + D(a) * (head_radius(z, a) + 0.007))
            ring.append(row)
        hb = grid_mesh('arnes', ring, close_u=True)
        add_mod(hb, 'SOLIDIFY', thickness=0.003, offset=1, use_rim=True); apply_mods(hb)
        parts.append(put(hb, mt['NEGRO']))
        for i in (6, 18, 30, 42):
            a = 2 * math.pi * i / seg; p0 = ring[1][round(i / seg * 32) % 32]
            p1 = V[5][i] - N[5][i] * 0.004
            parts.append(put(tube_path('tirante', [p0, p0.lerp(p1, 0.5) + Vector((0, 0, 0.004)), p1], 0.0035, seg=6), mt['NEGRO']))
    elif kind == 'marinero':
        cr, V, N = hat_crown(name, hat_base(1.306), ROUND, rx=0.248, ry=0.26)
        put(cr, mt['BLANCO'])
        G = []
        for m in range(5):  # ala vuelta hacia arriba
            t = m / 4; row = []
            for i in range(seg):
                a = 2 * math.pi * i / seg
                p = V[0][i] + N[0][i] * (0.006 + 0.042 * t ** 1.4) + Vector((0, 0, -0.008 + 0.075 * t))
                row.append(p)
            G.append(row)
        al = grid_mesh('ala', G, close_u=True)
        add_mod(al, 'SOLIDIFY', thickness=0.006, offset=0, use_rim=True, use_even_offset=True)
        add_mod(al, 'BEVEL', width=0.0025, segments=2, limit_method='ANGLE', angle_limit=R(50)); apply_mods(al)
        parts.append(put(al, mt['BLANCO']))
        parts.append(put(tube_path('dobladillo', [G[0][i] for i in range(seg)], 0.008, seg=6, closed=True), mt['BLANCO']))
        ci = grid_mesh('cinta', [[G[m][i] + (G[m][i] - Vector((0, HY, G[m][i].z))).normalized() * 0.0045
                                  for i in range(seg)] for m in (2, 3)], close_u=True)
        add_mod(ci, 'SOLIDIFY', thickness=0.002, offset=1, use_rim=True); apply_mods(ci)
        parts.append(put(ci, mt['ACENTO']))
        parts.append(put(tube_path('ribete', [G[4][i] for i in range(seg)], 0.0045, seg=6, closed=True), mt['ACENTO']))
    elif kind == 'pirata':
        prof = [(0, 1.0), (0.012, 0.99), (0.04, 0.975), (0.075, 0.94), (0.1, 0.88), (0.12, 0.78), (0.135, 0.6),
                (0.145, 0.36), (0.15, 0)]
        cr, V, N = hat_crown(name, hat_base(1.30), prof)
        put(cr, mt['NEGRO'])
        G = []
        for m in range(7):  # tricornio: tres puntas (frente y dos atrás) y el ala doblada hacia arriba entre ellas
            t = m / 6; row = []
            for i in range(seg):
                a = 2 * math.pi * i / seg; f = ((1 - math.cos(3 * a)) / 2) ** 1.2
                ext = 0.12 + 0.07 * math.cos(3 * a)
                p = V[0][i] - N[0][i] * 0.004 + D(a) * ext * t * (1 - 0.6 * f * t)
                p.z += 0.17 * f * t ** 1.4 - 0.006 * t
                row.append(p)
            G.append(row)
        al = grid_mesh('ala', G, close_u=True)
        add_mod(al, 'SOLIDIFY', thickness=0.008, offset=0, use_rim=True, use_even_offset=True)
        add_mod(al, 'BEVEL', width=0.0025, segments=2, limit_method='ANGLE', angle_limit=R(50)); apply_mods(al)
        parts.append(put(al, mt['NEGRO']))
        parts.append(put(tube_path('ribete', G[-1], 0.0055, seg=6, closed=True), mt['ACENTO']))
        # calavera simple al frente de la copa
        j = 4; p0 = V[j][0]; u_, v_, n_ = frame_at(N[j][0] + Vector((0, 0, 0.2)))
        c = p0 + n_ * 0.006
        wb = mt['BLANCO']
        parts.append(put(oriented_sphere('craneo', c + v_ * 0.008, 0.026, u_, v_, n_, (1, 0.95, 0.42)), wb))
        parts.append(put(oriented_sphere('mandibula', c - v_ * 0.02, 0.016, u_, v_, n_, (1, 0.7, 0.4)), wb))
        for sx in (-1, 1):
            parts.append(put(oriented_sphere('ojo', c + v_ * 0.006 + u_ * sx * 0.0105 + n_ * 0.0095, 0.0075, u_, v_, n_, (1, 1, 0.5), seg=8, rings=4), mt['NEGRO']))
            a0 = c - v_ * 0.012 + n_ * -0.001
            e0 = a0 + (u_ * sx + v_ * -1).normalized() * 0.05; e1 = a0 - (u_ * sx + v_ * -1).normalized() * 0.05
            parts.append(put(tube_path('hueso', [e0, e1], 0.0055, seg=6), wb))
            for e in (e0, e1):
                q = (u_ * -sx + v_ * -1).normalized() if False else (u_ * sx - v_).normalized()
                w_ = q.cross(n_).normalized()
                for sg in (-1, 1):
                    parts.append(put(sphere('nudo', e + w_ * sg * 0.006, 0.0075, seg=8, rings=4), wb))
    return [cr] + parts



# ---------------------------------------------------------------------------------------------- lentes
def mirror_x(o, name):
    me = o.data.copy(); m2 = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(m2)
    bm = bmesh.new(); bm.from_mesh(me)
    for v in bm.verts: v.co.x = -v.co.x
    bmesh.ops.reverse_faces(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    return m2


def lens_frame(d=0.048, k=0.22):
    """Plano del lente izquierdo: P(u,v,h) = c + U·u + V·v + n·(d − k·u + h). U hacia fuera (+X)."""
    c, n = EYES[0]; U = Vector((-n.y, n.x, 0)).normalized(); Vv = n.cross(U).normalized()
    if Vv.z < 0: Vv = -Vv
    P = lambda u, v, h=0.0: c + U * u + Vv * v + n * (d - k * u + h)
    nl = (n + U * k).normalized()
    return P, nl


def outline(A, B, u0=0.0, v0=0.0, m=3.0, cut=0.0, top=0.0, nseg=40):
    """Contorno superelíptico (u,v); cut recorta la esquina interior-inferior; top ensancha arriba."""
    pts = []
    for i in range(nseg):
        t = 2 * math.pi * i / nseg; ct, st = math.cos(t), math.sin(t)
        u = A * math.copysign(abs(ct) ** (2 / m), ct); v = B * math.copysign(abs(st) ** (2 / m), st)
        u *= 1 + top * max(0.0, st)
        f = 1 - cut * max(0.0, -ct) * max(0.0, -st)
        pts.append((u0 + u * f, v0 + v * f))
    return pts


def lens_parts(P, nl, ol_in, w, depth, rim_mat, glass_mat, round_tube=0.0):
    """Montura (anillo biselado o tubo fino) + cristal, para el ojo izquierdo."""
    u0 = sum(p[0] for p in ol_in) / len(ol_in); v0 = sum(p[1] for p in ol_in) / len(ol_in)
    def grow(p, e):
        du, dv = p[0] - u0, p[1] - v0; L = math.hypot(du, dv) or 1
        return (p[0] + du / L * e, p[1] + dv / L * e)
    out = []
    if round_tube:
        out.append(put(tube_path('aro', [P(*grow(p, round_tube * 0.3)) for p in ol_in], round_tube, seg=8, closed=True), rim_mat))
    else:
        fr = grid_mesh('montura', [[P(*p) for p in ol_in], [P(*grow(p, w)) for p in ol_in]], close_u=True)
        add_mod(fr, 'SOLIDIFY', thickness=depth, offset=0, use_rim=True, use_even_offset=True)
        add_mod(fr, 'BEVEL', width=min(0.003, depth * 0.3), segments=2, limit_method='ANGLE', angle_limit=R(40))
        apply_mods(fr); out.append(put(fr, rim_mat))
    rows = [[P(*grow(p, -e), -0.001) for p in ol_in] for e in (-0.002, 0.02, 0.04)]
    gl = grid_mesh('cristal', rows, close_u=True, pole=P(u0, v0, -0.001))
    add_mod(gl, 'SOLIDIFY', thickness=0.0025, offset=0, use_rim=True); apply_mods(gl)
    out.append(put(gl, glass_mat))
    return out


def front_y(z, x=0.0):
    hit = body_bvh().ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)), 2.0)
    return hit[0].y if hit[0] is not None else -0.2


def temple(p0, z1=1.225, a1=R(118), r=0.005, gap=0.012, n=9):
    """Patilla: desde la bisagra p0 hacia atrás por el lado de la cabeza (siempre por fuera)."""
    a0 = math.atan2(p0.x, -(p0.y - 0.04)); pts = [p0]
    for i in range(1, n + 1):
        t = i / n; a = a0 + (a1 - a0) * t; z = p0.z + (z1 - p0.z) * t
        rr = max(head_radius(z, a) + gap, (1 - t) * (p0 - Vector((0, 0.04, p0.z))).length + t * 0)
        pts.append(Vector((0, 0.04, z)) + D(a) * rr)
    pts[-1].z -= 0.006
    return tube_path('patilla', pts, r, seg=6)


def lentes(name, kind):
    mt = M(); parts = []
    vid = mat('VIDRIO', hexrgb('#1b2430' if kind == 'sol' else '#a9d6e5'), 0.1)
    if kind == 'sol':
        P, nl = lens_frame(d=0.05, k=0.24)
        ol = outline(0.084, 0.058, 0.004, 0.014, m=3.2, cut=0.3, top=0.08)
        w, rr = 0.013, 0.0055
        parts += lens_parts(P, nl, ol, w, 0.012, mt['ACENTO'], vid)
    else:
        P, nl = lens_frame(d=0.048, k=0.16)
        ol = outline(0.07, 0.07, 0.0, 0.012, m=2.0)
        w, rr = 0.004, 0.0032
        parts += lens_parts(P, nl, ol, w, 0.004, mt['ACENTO'], vid, round_tube=0.0035)
    # bisagra y patilla
    iu = max(range(len(ol)), key=lambda i: ol[i][0] - 0.3 * abs(ol[i][1] - 0.03))
    hu, hv = ol[iu]; hinge = P(hu + w * 0.6, hv, -0.004)
    if kind == 'sol':
        parts.append(put(oriented_sphere('bisagra', hinge, 0.009, *frame_at(nl), s=(1, 1.3, 0.8)), mt['ACENTO']))
    parts.append(put(temple(hinge, r=rr), mt['ACENTO']))
    # puente (mitad izquierda; se refleja)
    il = min(range(len(ol)), key=lambda i: ol[i][0] - 0.3 * abs(ol[i][1] - 0.03))
    bu, bv = ol[il]; b0 = P(bu - w * 0.4, bv)
    zt = b0.z + 0.012; ym = min(b0.y, front_y(zt) - 0.022)
    mid = Vector((0, ym, zt))
    q = b0.lerp(mid, 0.5); q.y = min(q.y, front_y(q.z, q.x) - 0.016)
    half = put(tube_path('puente', [b0, q, mid + Vector((0.0005, 0, 0))], rr * 1.1, seg=6, cap=False), mt['ACENTO'])
    parts.append(half)
    left = join(parts, 'lente_L')
    right = mirror_x(left, 'lente_R')
    return [left, right]


def wrap_R(a_list, zb, zt, gap):
    """Radio desde el eje (0,0.04) que despeja la cara entre zb(a) y zt(a) en cada acimut (+ gap), suavizado."""
    rs = []
    for a in a_list:
        zs = [zb(a) + (zt(a) - zb(a)) * k / 6 for k in range(7)]
        rs.append(max(head_radius(z, a) for z in zs) + gap)
    m = [max(rs[max(0, i - 2):i + 3]) for i in range(len(rs))]  # max-filter
    for _ in range(3): m = [m[0]] + [(m[i - 1] + 2 * m[i] + m[i + 1]) / 4 for i in range(1, len(m) - 1)] + [m[-1]]
    return m


def strap(name, a0, z0, z1, gap=0.008, w=0.022, nseg=24, th=0.003):
    """Correa por detrás de la cabeza desde ±a0 (altura z0) subiendo a z1 en la nuca (sobre el mechón)."""
    rows = []
    for e in (-w / 2, w / 2):
        row = []
        for i in range(nseg + 1):
            a = a0 + (2 * math.pi - 2 * a0) * i / nseg
            f = max(0.0, math.sin((a - a0) / (2 * math.pi - 2 * a0) * math.pi))
            z = z0 + (z1 - z0) * f ** 1.5 + e
            row.append(Vector((0, 0.04, z)) + D(a) * (head_radius(z, a) + gap))
        rows.append(row)
    o = grid_mesh(name, rows)
    add_mod(o, 'SOLIDIFY', thickness=th, offset=1, use_rim=True); apply_mods(o)
    orient_out(o, (0, 0.04, 1.25))
    return o


def visor_wrap(name, kind):
    mt = M(); parts = []
    if kind == 'deportivas':
        vid = mat('VIDRIO', hexrgb('#1b2430'), 0.1)
        A = R(86); nc = 34
        zt = lambda a: 1.287 - 0.022 * (a / A) ** 2
        zb = lambda a: max(1.132 + 0.03 * (a / A) ** 2, 1.132 + 0.086 * math.exp(-(a / R(19)) ** 2))
        gap, bul = 0.017, 0.008
    else:
        vid = mat('VIDRIO', hexrgb('#bfe8ff'), 0.1)
        A = R(64); nc = 30
        zt = lambda a: 1.295 - 0.04 * abs(a / A) ** 4
        zb = lambda a: max(1.122 + 0.045 * abs(a / A) ** 4, 1.122 + 0.09 * math.exp(-(a / R(17)) ** 2))
        gap, bul = 0.03, 0.006
    As = [-A + 2 * A * i / (nc - 1) for i in range(nc)]
    Rs = wrap_R(As, zb, zt, gap)
    def S(i, f, extra=0.0):
        a = As[i]; z = zb(a) + (zt(a) - zb(a)) * f
        return Vector((0, 0.04, z)) + D(a) * (Rs[i] + extra + bul * math.sin(math.pi * f) * math.cos(a / A * math.pi / 2))
    nr = 7
    G = [[S(i, m / nr) for i in range(nc)] for m in range(nr + 1)]
    gl = grid_mesh('cristal', G)
    add_mod(gl, 'SOLIDIFY', thickness=0.004, offset=1, use_rim=True, use_even_offset=True)
    add_mod(gl, 'BEVEL', width=0.0015, segments=1, limit_method='ANGLE', angle_limit=R(50)); apply_mods(gl)
    orient_out(gl, (0, 0.04, 1.2))
    parts.append(put(gl, vid))
    loop = [S(i, 1.0, 0.004) for i in range(nc)] + [S(nc - 1, 1 - m / nr, 0.004) for m in range(1, nr)] + \
           [S(i, 0.0, 0.004) for i in range(nc - 1, -1, -1)] + [S(0, m / nr, 0.004) for m in range(1, nr)]
    if kind == 'deportivas':
        parts.append(put(tube_path('marco', [S(i, 1.0, 0.004) for i in range(nc)], 0.0055, seg=6), mt['ACENTO']))
        parts.append(put(tube_path('marco_inf', [S(i, 0.0, 0.003) for i in range(nc)], 0.0032, seg=5), mt['ACENTO']))
        for sgn, i in ((1, nc - 1), (-1, 0)):  # terminales laterales
            c = S(i, 0.5, 0.004)
            parts.append(put(oriented_sphere('terminal', c, 0.02, *frame_at(D(As[i])), s=(0.7, 1.6, 0.5)), mt['ACENTO']))
        parts.append(put(strap('banda', A + R(4), 1.21, 1.305, w=0.026), mt['ACENTO']))
    else:
        # marco grueso de goma (ACENTO): faldón que va del cristal hacia la cara
        rows = []
        for (e, ex) in ((-0.004, 0.034), (0.008, 0.04), (0.02, 0.03), (0.024, 0.006)):
            row = []
            for p in loop:
                q = p - Vector((0, 0.04, p.z)); a = math.atan2(q.x, -q.y)
                # extiende el contorno en el plano (a,z) desde el centro del cristal
                ac, zc = 0.0, (zb(0) + zt(0)) / 2 - 0.02
                da, dz = (a - ac) * 0.27, p.z - zc; L = math.hypot(da, dz) or 1
                a2 = a + da / L * e / 0.27; z2 = p.z + dz / L * e
                i2 = min(nc - 1, max(0, round((a2 + A) / (2 * A) * (nc - 1))))
                rr = (Rs[max(0, min(nc - 1, int((a2 + A) / (2 * A) * (nc - 1))))] if abs(a2) <= A else Rs[0 if a2 < 0 else -1])
                row.append(Vector((0, 0.04, z2)) + D(a2) * (rr + ex - gap + 0.012))
            rows.append(row)
        fr = grid_mesh('marco', rows, close_u=True)
        add_mod(fr, 'SOLIDIFY', thickness=0.005, offset=0, use_rim=True); apply_mods(fr)
        parts.append(put(fr, mt['ACENTO']))
        neg = mt['NEGRO']; sn = mat('SNORKEL', hexrgb('#f2a03d'), 0.5)
        parts.append(put(strap('correa', A + R(10), 1.205, 1.31, w=0.03, gap=0.009), neg))
        # snorkel por el lado izquierdo
        pts = []
        for z, a in ((1.53, R(98)), (1.47, R(95)), (1.40, R(93)), (1.32, R(92)), (1.24, R(92)), (1.17, R(90)),
                     (1.115, R(84)), (1.085, R(70)), (1.075, R(57))):
            rr = max(head_radius(z, a) + 0.045, 0.27)
            pts.append(Vector((0, 0.04, z)) + D(a) * rr)
        parts.append(put(tube_path('snorkel', pts, 0.011, seg=10), sn))
        parts.append(put(oriented_sphere('boquilla', pts[-1] + D(R(50)) * 0.008, 0.016, *frame_at(D(R(57))), s=(1.2, 0.8, 0.6)), sn))
        parts.append(put(tube_path('clip', [pts[4] + Vector((0, 0, -0.018)), pts[4] + Vector((0, 0, 0.018))], 0.015, seg=10), neg))
    return parts



# ---------------------------------------------------------------------------------------------- pañuelo
def neck_r(z, a, cy=-0.03):
    """Radio de la superficie del cuello/pecho desde dentro (no ve los brazos)."""
    d = D(a); hit = body_bvh().ray_cast(Vector((0, cy, z)), d, 1.0)
    return hit[3] if hit[0] is not None else 0.12


def panuelo(name='panuelo'):
    mt = M(); seg = 32; rows = 8
    side = lambda a: math.sin(a) ** 2  # 1 a los lados (hombros), 0 frente/atrás
    zt = lambda a: 0.742 + 0.03 * side(a) - 0.008 * max(0.0, math.cos(a))
    zb = lambda a: 0.668 + 0.04 * side(a) - 0.185 * max(0.0, 1 - abs(a) / R(58)) ** 1.15
    G = []
    for m in range(rows + 1):
        t = m / rows; row = []
        for i in range(seg):
            a = math.pi + 2 * math.pi * i / seg; a = (a + math.pi) % (2 * math.pi) - math.pi
            z = zt(a) + (zb(a) - zt(a)) * t
            fold = 0.006 * math.sin(a * 7) * t * max(0.0, math.cos(a))  # pliegues en la punta
            cap = 1 / math.hypot(math.sin(a) / 0.135, math.cos(a) / 0.24)  # el rayo no debe seguir por el brazo
            row.append(Vector((0, -0.03, z)) + D(a) * (min(neck_r(z, a), cap) + 0.016 + 0.012 * t * max(0.0, math.cos(a)) + fold))
        G.append(row)
    o = grid_mesh(name, G, close_u=True)
    orient_out(o, (0, -0.03, 0.66))
    wrap_outside(o, offset=0.01, smooth=5, thickness=0.006, subdiv=1)
    put(o, mt['TELA'])
    # nudo atrás y dos puntas sueltas
    zk = 0.70; kc = Vector((0, -0.03, zk)) + D(math.pi) * (neck_r(zk, math.pi) + 0.03)
    parts = [o, put(oriented_sphere('nudo', kc, 0.03, Vector((1, 0, 0)), Vector((0, 0, 1)), Vector((0, 1, 0)), s=(1.1, 0.85, 0.7), seg=12, rings=8), mt['TELA'])]
    for sx in (-1, 1):
        base = kc + Vector((sx * 0.012, 0.006, -0.012))
        tip = base + Vector((sx * 0.05, 0.02, -0.075))
        side = Vector((-sx * 0.0, 1, 0)).cross(tip - base).normalized()
        Gt = [[base.lerp(tip, t) + side * (0.022 * (1 - t) * q) + Vector((0, 0.01 * math.sin(math.pi * t), 0)) for q in (-1, 0, 1)] for t in (0, 0.33, 0.66, 1.0)]
        fl = grid_mesh('punta', Gt)
        add_mod(fl, 'SOLIDIFY', thickness=0.005, offset=0, use_rim=True)
        add_mod(fl, 'SUBSURF', levels=1); apply_mods(fl)
        parts.append(put(fl, mt['TELA']))
    return parts


# ---------------------------------------------------------------------------------------------- final
def finish(name, parts, eyes=True, bone='cabeza.001', skin=False, uv='cyl', target=(0, -0.04, 1.25), dist=1.35):
    for p in parts: apply_mods(p)
    o = join(parts, name)
    (hat_uv if uv == 'hat' else cyl_uv)(o)
    shade_smooth(o, 50)
    check_clear([o], eyes=eyes)
    if not eyes and bone == 'cabeza.001': check_lens([o])
    if skin:
        weights_from_body(o)
        for g in list(o.vertex_groups):  # el pañuelo sigue al cuello y al pecho, no a los brazos
            if not g.name.startswith(('cabeza', 'espalda')): o.vertex_groups.remove(g)
        clean_weights(o); add_armature(o)
        print('GROUPS', [g.name for g in o.vertex_groups])
    else: rigid(o, bone)
    print('TRIS', name, tri_count(o), 'MATS', [m.name for m in o.data.materials])
    preview_head([o], name, target=target, dist=dist)
    export([o], name)
    bpy.data.objects.remove(o, do_unlink=True)


PIEZAS = {
    'gorra': lambda: finish('gorra', gorra('gorra')),
    'gorra_reves': lambda: finish('gorra_reves', gorra('gorra_reves', reves=True)),
    'gorra_trucker': lambda: finish('gorra_trucker', gorra('gorra_trucker', trucker=True)),
    'pava': lambda: finish('pava', sombrero('pava', 'pava'), uv='hat', dist=1.7, target=(0, 0, 1.28)),
    'sombrero_paja': lambda: finish('sombrero_paja', sombrero('sombrero_paja', 'paja'), uv='hat', dist=1.55, target=(0, 0, 1.28)),
    'sombrero_tropical': lambda: finish('sombrero_tropical', sombrero('sombrero_tropical', 'tropical'), uv='hat', dist=1.55, target=(0, 0, 1.28)),
    'sombrero_vaquero': lambda: finish('sombrero_vaquero', sombrero('sombrero_vaquero', 'vaquero'), uv='hat', dist=1.6, target=(0, 0, 1.3)),
    'sombrero_pescador': lambda: finish('sombrero_pescador', sombrero('sombrero_pescador', 'pescador'), uv='hat', dist=1.5, target=(0, 0, 1.27)),
    'casco_constructor': lambda: finish('casco_constructor', sombrero('casco_constructor', 'constructor'), dist=1.45),
    'casco_marinero': lambda: finish('casco_marinero', sombrero('casco_marinero', 'marinero'), uv='hat', dist=1.45),
    'casco_pirata': lambda: finish('casco_pirata', sombrero('casco_pirata', 'pirata'), uv='hat', dist=1.55, target=(0, 0, 1.3)),
    'lentes_sol': lambda: finish('lentes_sol', lentes('lentes_sol', 'sol'), eyes=False, dist=1.1, target=(0, -0.08, 1.2)),
    'lentes_redondas': lambda: finish('lentes_redondas', lentes('lentes_redondas', 'redondas'), eyes=False, dist=1.1, target=(0, -0.08, 1.2)),
    'lentes_deportivas': lambda: finish('lentes_deportivas', visor_wrap('lentes_deportivas', 'deportivas'), eyes=False, dist=1.15, target=(0, -0.06, 1.2)),
    'lentes_buceo': lambda: finish('lentes_buceo', visor_wrap('lentes_buceo', 'buceo'), eyes=False, dist=1.35, target=(0, -0.04, 1.25)),
    'panuelo': lambda: finish('panuelo', panuelo(), skin=True, dist=1.7, target=(0, -0.05, 0.66)),
}

if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    for n in (argv or list(PIEZAS)):
        print('=== PIEZA', n); PIEZAS[n]()
    for f in os.listdir(PREV):
        if f.startswith('_tmp_'): os.remove(os.path.join(PREV, f))
