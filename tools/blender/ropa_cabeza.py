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


FLAG_GORRA = 0.073   # alto (m) del parche BANDERA de la gorra


def gorra(name='gorra', reves=False, trucker=False):
    mt = M(); seg = 48; th = 0.0045
    if reves:
        # Auditoría: antes el borde iba plano a z≈1,296 y la copa quedaba alta y chica. Ahora baja por los lados como la
        # gorra normal (1,268), al frente queda sobre los ojos (1,284, con el arco del cierre) y atrás sigue alta (1,296)
        # para que la visera pase sobre el mechón.
        def rimf(a):
            c = math.cos(a); z = 1.268 - 0.006 * c + 0.022 * c * c
            d = abs((a + math.pi) % (2 * math.pi) - math.pi)
            if d < R(26): z += 0.022 * math.cos(d / R(26) * math.pi / 2) ** 2
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
            a = R(6.5 * k); z = 1.289
            pts.append(Vector((0, 0.03, z)) + D(a) * (head_radius(z, a, 0.03) + 0.011))
        parts.append(put(tube_path('correa', pts, 0.0055, seg=6), mt['ACENTO']))
    if not reves and not trucker:   # parche BANDERA 3:2 (11 × 7,3 cm) en el panel delantero: el juego lo muestra sólo con 'pr'
        up = Vector((0, 0.36, 0.93))
        parts.append(flag_patch('bandera', Vector((0, -0.2, 1.352)), Vector((1, 0, 0)), up, FLAG_GORRA, onto=target_bvh([cr]), off=0.0018, nu=10, nv=6))
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
        # Auditoría: el ala caía 8,5 cm al frente y tapaba los ojos. Ahora la base va 1 cm más alta, la copa es un 10 %
        # más baja y el ala cae parejo (3,5 cm al frente, 7 cm atrás), como un bucket de caricatura.
        zb = lambda a: 1.306 - 0.006 * math.cos(a)
        prof = [(dz * 0.9, s_) for dz, s_ in [(0, 1.0), (0.012, 0.99), (0.04, 0.965), (0.07, 0.935), (0.1, 0.9), (0.125, 0.86), (0.142, 0.78),
                (0.162, 0.6), (0.168, 0.32), (0.17, 0)]]
        cr, V, N = hat_crown(name, zb, prof, rx=0.255, ry=0.268)
        put(cr, mt['TELA'])
        b, G = brim('ala', V[0], N[0], lambda a: (0.34, 0.36), lambda a, t: -(0.035 + 0.035 * (0.5 - 0.5 * math.cos(a)) + 0.003) * t ** 1.3, rows=6, th=0.009)
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
        w, rr = 0.016, 0.0085      # auditoría: montura 1,6 cm y patilla Ø 1,7 cm (antes 1,3 y 1,1: de lejos desaparecían)
        parts += lens_parts(P, nl, ol, w, 0.015, mt['ACENTO'], vid)
    else:
        P, nl = lens_frame(d=0.048, k=0.16)
        ol = outline(0.07, 0.07, 0.0, 0.012, m=2.0)
        w, rr = 0.006, 0.0055      # auditoría: aro Ø 1,3 cm y patilla Ø 1,1 cm (antes 0,7 y 0,6: alambre invisible)
        parts += lens_parts(P, nl, ol, w, 0.006, mt['ACENTO'], vid, round_tube=0.0065)
    # bisagra y patilla
    iu = max(range(len(ol)), key=lambda i: ol[i][0] - 0.3 * abs(ol[i][1] - 0.03))
    hu, hv = ol[iu]; hinge = P(hu + w * 0.6, hv, -0.004)
    if kind == 'sol':
        parts.append(put(oriented_sphere('bisagra', hinge, 0.012, *frame_at(nl), s=(1, 1.3, 0.8)), mt['ACENTO']))
    parts.append(put(temple(hinge, r=rr, gap=0.008 + rr), mt['ACENTO']))
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
        # auditoría: tubo de Ø 3,2 cm (antes 2,2: parecía una pajita), boquilla y clip más grandes y remate arriba
        parts.append(put(tube_path('snorkel', pts, 0.016, seg=12), sn))
        parts.append(put(oriented_sphere('boquilla', pts[-1] + D(R(50)) * 0.01, 0.022, *frame_at(D(R(57))), s=(1.2, 0.8, 0.6)), sn))
        parts.append(put(tube_path('clip', [pts[4] + Vector((0, 0, -0.022)), pts[4] + Vector((0, 0, 0.022))], 0.021, seg=12), neg))
        tip = pts[0]; ax = (pts[0] - pts[1]).normalized()
        parts.append(put(revolve('remate', tip - ax * 0.004, tip + ax * 0.026, [(0, 0.02), (0.7, 0.021), (1, 0.012)], seg=14), neg))
    return parts



# ---------------------------------------------------------------------------------------------- pañuelo
# Bandana de verdad, de una sola tela (TELA, para que el juego la estampe entera):
#  - banda enrollada alrededor de la BASE del cuello (más baja al frente, visible bajo el pico; sube por los lados por encima
#    del hombro) con relieve de tela torcida;
#  - pico triangular que cae sobre el pecho con pliegues que convergen a la punta, dobladillo en los bordes y caída hacia fuera;
#  - nudo atrás (dos lóbulos y la vuelta que los aprieta) con dos puntas sueltas que caen por la espalda.
# Pesos copiados de la piel (incluidos los hombros: la tela se mueve con la piel que tiene debajo) y alisados.
# Shape key 'camisa': todo lo que quedaría dentro de la camisa se lleva 7 mm por fuera de ella (el juego la activa con camisa).
NECK_Y = -0.03


def neck_r(z, a, cy=NECK_Y):
    """Radio de la superficie del cuello/pecho desde dentro (no ve los brazos)."""
    d = D(a); hit = body_bvh().ray_cast(Vector((0, cy, z)), d, 1.0)
    r = hit[3] if hit[0] is not None else 0.12
    return min(r, 1 / math.hypot(math.sin(a) / 0.2, math.cos(a) / 0.26))  # por los lados el rayo podría seguir por el brazo


def band_z(a):
    """Altura del centro de la banda: 0,682 al frente (bajo el pico), 0,737 a los lados (encima del hombro), 0,712 atrás."""
    return 0.682 + 0.055 * math.sin(a) ** 2 + 0.03 * max(0.0, -math.cos(a))


BAND_GAP, BAND_RR, BAND_RZ = 0.007, 0.0125, 0.02   # holgura con el cuello y semiejes del rollo (radial, vertical)


def band_center(a):
    z = band_z(a)
    return Vector((0, NECK_Y, z)) + D(a) * (neck_r(z, a) + BAND_GAP + BAND_RR)


def panuelo_band(mt, N=80, M=10):
    """Rollo de tela alrededor del cuello: sección elíptica con crestas en hélice (tela torcida)."""
    me = bpy.data.meshes.new('banda'); bm = bmesh.new(); rings = []
    C = [band_center(2 * math.pi * i / N - math.pi) for i in range(N)]
    for _ in range(2):  # suaviza el recorrido (el cuello no es liso)
        C = [(C[i - 1] + 2 * C[i] + C[(i + 1) % N]) / 4 for i in range(N)]
    for i in range(N):
        t = (C[(i + 1) % N] - C[i - 1]).normalized(); up = Vector((0, 0, 1))
        out = t.cross(up).normalized()
        if out.dot(C[i] - Vector((0, NECK_Y, C[i].z))) < 0: out = -out
        up = out.cross(t).normalized()
        if up.z < 0: up = -up
        ring = []
        for j in range(M):
            ph = 2 * math.pi * j / M
            twist = 1 + 0.2 * math.sin(3 * ph + 2 * math.pi * i / N * 16)    # crestas diagonales del rollo
            ring.append(bm.verts.new(C[i] + out * math.cos(ph) * BAND_RR * twist + up * math.sin(ph) * BAND_RZ * (0.92 + 0.08 * twist)))
        rings.append(ring)
    for i in range(N):
        r0, r1 = rings[i], rings[(i + 1) % N]
        for j in range(M): bm.faces.new((r0[j], r0[(j + 1) % M], r1[(j + 1) % M], r1[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('banda', me); bpy.context.collection.objects.link(o)
    return put(o, mt['TELA'])


def panuelo_pico(mt, A=R(60), z_tip=0.448, rows=18, cols=24):
    """Pico triangular: cuelga del borde inferior de la banda (±A) a la punta, con pliegues y caída."""
    P = []
    for m in range(rows + 1):
        v = m / rows * 0.97; row = []
        for k in range(cols + 1):
            u = -1 + 2 * k / cols
            a_top = u * A; a = a_top * (1 - v) ** 0.92
            z_top = band_z(a_top) - BAND_RZ * 0.55
            z = z_top + (z_tip - z_top) * v
            # caída: se separa del pecho hacia la punta; pliegues verticales que convergen a la punta (tres crestas y un
            # pliegue central), más fuertes a media altura; los bordes laterales se curvan un poco hacia dentro
            env = math.sin(math.pi * min(1.0, v / 0.8) * 0.5 + math.pi * 0.5 * max(0.0, v - 0.8) / 0.2)
            fold = 0.0095 * env * math.cos(2.5 * math.pi * u) * (1 - 0.3 * abs(u))
            crease = 0.006 * v * max(0.0, 1 - abs(u) / 0.18)       # lomo central del pico doblado
            off = 0.013 + 0.014 * v * v + fold + crease + 0.004 * (1 - abs(u)) * v
            row.append(Vector((0, NECK_Y, z)) + D(a) * (neck_r(z, a) + off))
        P.append(row)
    tip = P[-1][cols // 2] + Vector((0, -0.004, -0.014))
    o = grid_mesh('pico', P, pole=tip)
    orient_out(o, (0, -0.02, 0.6))
    edges = [[P[m][0] for m in range(rows + 1)] + [tip], [P[m][cols] for m in range(rows + 1)] + [tip]]
    add_mod(o, 'SOLIDIFY', thickness=0.004, offset=1, use_rim=True, use_even_offset=True)
    apply_mods(o)
    put(o, mt['TELA'])
    hems = [put(tube_path('dobladillo', e, 0.0028, seg=5), mt['TELA']) for e in edges]
    return [o] + hems


def panuelo_nudo(mt):
    """Nudo atrás (dos lóbulos y la vuelta que los aprieta) y dos puntas sueltas que caen por la espalda."""
    a = math.pi; zk = band_z(a) - 0.006
    out = D(a); kc = Vector((0, NECK_Y, zk)) + out * (neck_r(zk, a) + 0.024)
    X = Vector((1, 0, 0)); Z = Vector((0, 0, 1))
    parts = []
    for sx in (-1, 1):  # lóbulos
        c = kc + X * sx * 0.011 + Z * 0.002
        U = (X * math.cos(0.5 * sx) + Z * math.sin(0.5 * sx)).normalized(); W = out; V = W.cross(U).normalized()
        parts.append(put(oriented_sphere('nudo', c, 0.018, U, V, W, s=(1.25, 0.85, 0.8), seg=14, rings=8), mt['TELA']))
    # vuelta que aprieta el nudo (anillo inclinado alrededor del centro)
    ring = []
    for i in range(16):
        ph = 2 * math.pi * i / 16
        ring.append(kc + (Z * math.cos(ph) * 0.019 + out * math.sin(ph) * 0.014) + X * 0.004 * math.sin(ph))
    parts.append(put(tube_path('vuelta', ring, 0.0075, seg=8, closed=True), mt['TELA']))
    # puntas: cintas que bajan y se abren, pegadas a la espalda con holgura, con giro suave y punta en pico
    for sx in (-1, 1):
        rows = []; n = 12
        for i in range(n + 1):
            t = i / n
            x = sx * (0.013 + 0.058 * t ** 1.1)
            z = zk - 0.008 - 0.125 * t
            a2 = math.pi - math.atan2(x, 0.11)            # acimut del punto (atrás = 180°)
            base = Vector((x, NECK_Y, z)); base.y = NECK_Y
            r = neck_r(z, a2)
            ctr = Vector((0, NECK_Y, z)) + D(a2) * (r + 0.022 + 0.016 * t)
            ctr.x = x
            tang = Vector((sx * 0.45, 0.0, -1.0)).normalized()
            nrm = D(a2)
            side = tang.cross(nrm).normalized()
            tw = 0.55 * t * sx                                   # giro de la cinta
            side = (side * math.cos(tw) + nrm * math.sin(tw)).normalized()
            w = 0.024 * (1 - t) ** 0.65 + 0.002
            sag = 0.004 * math.sin(math.pi * t * 1.5)            # pequeña ondulación
            c = ctr + nrm * sag
            rows.append([c - side * w, c - side * w * 0.3 + nrm * 0.0015, c + side * w * 0.3 + nrm * 0.0015, c + side * w])
        tail = grid_mesh('punta', rows)
        orient_out(tail, (0, NECK_Y, zk - 0.05))
        add_mod(tail, 'SOLIDIFY', thickness=0.0035, offset=0, use_rim=True)
        add_mod(tail, 'SUBSURF', levels=1); apply_mods(tail)
        parts.append(put(tail, mt['TELA']))
    return parts


def panuelo(name='panuelo'):
    mt = M()
    return [panuelo_band(mt)] + panuelo_pico(mt) + panuelo_nudo(mt)


def push_clear(o, target_bvh, need, smooth=4):
    """Desplazamientos que llevan cada vértice al menos `need` por fuera de la superficie de target_bvh (normal de la cara
    más cercana), dilatados y alisados por la malla. Devuelve la lista de vectores (uno por vértice)."""
    me = o.data; n = len(me.vertices)
    disp = [Vector((0, 0, 0)) for _ in range(n)]
    for v in me.vertices:
        p = o.matrix_world @ v.co
        loc, nrm, idx, dist = target_bvh.find_nearest(p)
        if loc is None: continue
        sd = (p - loc).dot(nrm)
        if sd < need and dist < 0.06: disp[v.index] = nrm * (need - sd)
    adj = [[] for _ in range(n)]
    for e in me.edges: a, b = e.vertices; adj[a].append(b); adj[b].append(a)
    for _ in range(2):  # dilata: el vecino más empujado manda (las dos caras de la tela se mueven juntas)
        disp = [max([disp[i]] + [disp[j] for j in adj[i]], key=lambda d: d.length) for i in range(n)]
    for _ in range(smooth):  # alisado que nunca reduce un empuje necesario: el bulto queda suave
        new = []
        for i in range(n):
            if not adj[i]: new.append(disp[i]); continue
            avg = (disp[i] * 2 + sum((disp[j] for j in adj[i]), Vector((0, 0, 0)))) / (2 + len(adj[i]))
            new.append(avg if avg.length > disp[i].length else disp[i])
        disp = new
    return disp


def smooth_weights(o, repeat=4, factor=0.5):
    """Alisa los pesos por la malla (media con los vecinos), sin operadores de modo edición."""
    me = o.data; n = len(me.vertices); G = len(o.vertex_groups)
    adj = [[] for _ in range(n)]
    for e in me.edges: a, b = e.vertices; adj[a].append(b); adj[b].append(a)
    W = [[0.0] * G for _ in range(n)]
    for v in me.vertices:
        for g in v.groups: W[v.index][g.group] = g.weight
    for _ in range(repeat):
        W2 = []
        for i in range(n):
            if not adj[i]: W2.append(W[i]); continue
            avg = [sum(W[j][k] for j in adj[i]) / len(adj[i]) for k in range(G)]
            W2.append([W[i][k] * (1 - factor) + avg[k] * factor for k in range(G)])
        W = W2
    for k, vg in enumerate(o.vertex_groups):
        for i in range(n):
            if W[i][k] > 1e-4: vg.add([i], W[i][k], 'REPLACE')
            else: vg.remove([i])


# Poses en las que se ajusta la forma 'camisa': las acciones del rig (Idle y Walk muestreadas) y las capas que el juego
# suma por código (character.js: bailar = brazos arriba y codos; nadar = alas abiertas, cabeza y pecho hacia atrás).
EXTRA_POSES = {
    'bailar': {'armL1': ('Z', 0.9), 'armL1.001': ('Z', -0.9), 'armL2': ('X', 0.7), 'armL2.001': ('X', 0.7)},
    'bailar2': {'armL1': ('Z', 1.4), 'armL1.001': ('Z', -0.5), 'armL2': ('X', 1.1), 'armL2.001': ('X', 0.3)},
    'nadar': {'armL1': ('Z', 0.92), 'armL1.001': ('Z', -0.92), 'cabeza': ('X', -0.75), 'espalda2': ('X', -0.25)},
    'nadar2': {'armL1': ('Z', 0.32), 'armL1.001': ('Z', -0.32), 'armL2': ('X', 0.75), 'armL2.001': ('X', 0.75), 'cabeza': ('X', -0.75), 'espalda2': ('X', -0.25)},
}


def pose_iter():
    """Recorre poses: reposo, Idle y Walk (6 cuadros cada una) y las poses extra sobre el cuadro medio de Idle."""
    from mathutils import Quaternion
    rig = RIG(); sc = bpy.context.scene
    rest_pose(); yield 'reposo'
    rig.animation_data_create()
    for an in ('Idle', 'Walk'):
        act = bpy.data.actions[an]; rig.animation_data.action = act
        f0, f1 = act.frame_range
        for k in range(6):
            sc.frame_set(int(round(f0 + (f1 - f0) * k / 6))); bpy.context.view_layer.update(); yield '%s%d' % (an, k)
    act = bpy.data.actions['Idle']; rig.animation_data.action = act
    for name, rot in EXTRA_POSES.items():
        sc.frame_set(int(sum(act.frame_range) / 2))
        for bn, (ax, ang) in rot.items():
            pb = rig.pose.bones[bn]; pb.rotation_mode = 'QUATERNION'
            pb.rotation_quaternion = pb.rotation_quaternion @ Quaternion({'X': (1, 0, 0), 'Y': (0, 1, 0), 'Z': (0, 0, 1)}[ax], ang)
        bpy.context.view_layer.update(); yield name
    rig.animation_data.action = None; rest_pose()


def skin_mats(o):
    """Matriz de deformación (3×3) de cada vértice de `o` en la pose actual (mezcla lineal de huesos, como el juego)."""
    rig = RIG(); mw = rig.matrix_world; mwi = mw.inverted()
    B = {pb.name: (mw @ pb.matrix @ pb.bone.matrix_local.inverted() @ mwi).to_3x3() for pb in rig.pose.bones if pb.bone.use_deform}
    names = {g.index: g.name for g in o.vertex_groups}; out = []
    from mathutils import Matrix
    for v in o.data.vertices:
        M = Matrix(((0, 0, 0), (0, 0, 0), (0, 0, 0))); tw = 0.0
        for g in v.groups:
            bm = B.get(names[g.group])
            if bm is None or g.weight <= 0: continue
            M += bm * g.weight; tw += g.weight
        out.append(M * (1 / tw) if tw > 0 else Matrix.Identity(3))
    return out


def fit_over_shirt(o, need=0.007, passes=2):
    """Forma 'camisa' del pañuelo: en cada pose, todo vértice que quede a menos de `need` de la cara exterior de la camisa
    (o dentro) se empuja por su normal; el empuje se pasa al espacio de reposo con la inversa de la piel del vértice, se
    toma el mayor de todas las poses y se alisa. Dos pasadas (la segunda corrige lo que la primera no alcanzó)."""
    import ropa_camisa
    sh = ropa_camisa.camisa('camisa_ajuste')
    bvh0 = body_bvh(); me = sh.data
    outer = []
    for pl in me.polygons:  # cara exterior: mirando hacia dentro (−normal) se encuentra el cuerpo enseguida
        c = sh.matrix_world @ pl.center; n = (sh.matrix_world.to_3x3() @ pl.normal).normalized()
        if bvh0.ray_cast(c - n * 0.0005, -n, 0.06)[0] is not None: outer.append(tuple(pl.vertices))
    print('CAMISA caras exteriores %d de %d' % (len(outer), len(me.polygons)))
    n = len(o.data.vertices); total = [Vector((0, 0, 0)) for _ in range(n)]
    key = o.shape_key_add(name='camisa', from_mix=False) if not (o.data.shape_keys and 'camisa' in o.data.shape_keys.key_blocks) else o.data.shape_keys.key_blocks['camisa']
    key.value = 1.0
    for ps in range(passes):
        best = [Vector((0, 0, 0)) for _ in range(n)]; worst = {}
        for pname in pose_iter():
            dg = bpy.context.evaluated_depsgraph_get()
            se = sh.evaluated_get(dg); sm = se.to_mesh(); SV = [sh.matrix_world @ v.co for v in sm.vertices]; se.to_mesh_clear()
            bvh = BVHTree.FromPolygons(SV, outer)
            oe = o.evaluated_get(dg); om = oe.to_mesh(); P = [o.matrix_world @ v.co for v in om.vertices]; oe.to_mesh_clear()
            S = skin_mats(o); w = 1.0
            for i, p in enumerate(P):
                q, nr, idx, dist = bvh.find_nearest(p, 0.05)
                if q is None: continue
                sd = (p - q).dot(nr); w = min(w, sd)
                if sd < need:
                    d = S[i].inverted_safe() @ (nr * (need - sd))
                    if d.length > best[i].length: best[i] = d
            worst[pname] = round(w, 4)
        print('PASADA', ps, 'peor por pose', worst)
        adj = [[] for _ in range(n)]
        for e in o.data.edges: a_, b_ = e.vertices; adj[a_].append(b_); adj[b_].append(a_)
        for _ in range(2):
            best = [max([best[i]] + [best[j] for j in adj[i]], key=lambda d: d.length) for i in range(n)]
        for _ in range(5):
            nb = []
            for i in range(n):
                avg = (best[i] * 2 + sum((best[j] for j in adj[i]), Vector((0, 0, 0)))) / (2 + len(adj[i]))
                nb.append(avg if avg.length > best[i].length else best[i])
            best = nb
        for i in range(n):
            total[i] = total[i] + best[i]
            key.data[i].co = o.data.vertices[i].co + total[i]
    bpy.data.objects.remove(sh, do_unlink=True)
    print('CAMISA morph: verts movidos', sum(1 for d in total if d.length > 1e-5), 'max %.4f' % max(d.length for d in total))
    key.value = 0.0


def finish_panuelo(name='panuelo'):
    parts = panuelo(name)
    for p in parts: apply_mods(p)
    o = join(parts, name)
    cyl_uv(o)
    shade_smooth(o, 60)
    # separación mínima del cuerpo en reposo (por si algún punto quedó cerca de las plumas)
    disp = push_clear(o, body_bvh(), 0.009, smooth=3)
    for v, d in zip(o.data.vertices, disp): v.co += d
    o.data.update()
    check_clear([o], eyes=True)
    # pesos: los de la piel más cercana (cuello, pecho y hombros), alisados para que la tela no se arrugue de golpe
    weights_from_body(o)
    smooth_weights(o, repeat=4)
    clean_weights(o)
    add_armature(o)
    # shape key 'camisa': por fuera de la camisa en todas las poses de prueba (el juego la activa con camisa puesta)
    o.shape_key_add(name='Basis', from_mix=False)
    fit_over_shirt(o)
    print('GROUPS', [g.name for g in o.vertex_groups])
    print('TRIS', name, tri_count(o), 'MATS', [m.name for m in o.data.materials])
    preview_head([o], name, target=(0, -0.05, 0.64), dist=1.45, views=(('frente', -8), ('lado', 90), ('atras', 160)))
    export([o], name, morph=True)
    print('KB', name, round(glb_kb(name), 1))
    bpy.data.objects.remove(o, do_unlink=True)


# ---------------------------------------------------------------------------------------------- final
def finish(name, parts, eyes=True, bone='cabeza.001', skin=False, uv='cyl', target=(0, -0.04, 1.25), dist=1.35):
    for p in parts: apply_mods(p)
    o = join(parts, name)
    keep_flag_uv(o, hat_uv if uv == 'hat' else cyl_uv)
    shade_smooth(o, 60)
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
    'panuelo': lambda: finish_panuelo('panuelo'),
}

if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    for n in (argv or list(PIEZAS)):
        print('=== PIEZA', n); PIEZAS[n]()
    for f in os.listdir(PREV):
        if f.startswith('_tmp_'): os.remove(os.path.join(PREV, f))
