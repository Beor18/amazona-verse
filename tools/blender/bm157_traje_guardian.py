# BM157 · Traje de Guardián PROPIO (diseño original: plumas/hoja de yagrumo, cotorra puertorriqueña en vuelo).
#   Blender -b ~/AmazonaVerse/04_Blender_3D/vittata_rig_final.blend --python tools/blender/bm157_traje_guardian.py
# Una sola pieza con piel sobre el Rig: túnica ajustada (TELA, se tiñe por especie) + pechera y hombreras de placas en forma de
# pluma (ORO) + emblema de cotorra en vuelo sobre medallón + corona de hojas (rígida a cabeza.001).
import sys, os, math
sys.path.insert(0, os.path.expanduser('~/AmazonaVerse/Juego/tools/blender'))
import ropa_lib
from ropa_lib import *
from ropa_camisa import T, dense_rows, lift_back_hem

HERE = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(os.path.dirname(HERE))
ropa_lib.OUT = os.path.join(REPO, 'assets/models/ropa'); ropa_lib.PREV = os.path.join(REPO, 'tests/out/ropa')
os.makedirs(ropa_lib.OUT, exist_ok=True); os.makedirs(ropa_lib.PREV, exist_ok=True)
X = Vector((1, 0, 0)); Z = Vector((0, 0, 1))
M = dict(TELA=mat('TELA', hexrgb('#1f7a5c'), 0.8), ORO=mat('ORO', hexrgb('#e3b022'), 0.32, 0.85),
         VERDE=mat('COTORRA_VERDE', hexrgb('#35a046'), 0.6), ROJO=mat('COTORRA_ROJO', hexrgb('#d6322e'), 0.6),
         AZUL=mat('COTORRA_AZUL', hexrgb('#2c63c8'), 0.6))
bvh = body_bvh()


def surf(x, z, d=(0, 1, 0), start=None):
    """Punto y normal del cuerpo: rayo desde `start` (por defecto delante) en la dirección d."""
    s = Vector(start) if start else Vector((x, -1.0, z)); d = Vector(d).normalized()
    h = bvh.ray_cast(s, d, 3.0)
    return Vector(h[0]), Vector(h[1])


def feather(W, L, n=5):
    """Contorno de pluma/hoja (x, y) desde la base (y=0) hasta la punta (y=-L)."""
    pts = []
    for i in range(n + 1):
        t = i / n; w = W / 2 * (1 - t ** 2.4) ** 0.75 * (0.8 + 0.2 * math.sin(math.pi * min(1, t * 1.4)))
        pts.append((w, -L * t))
    return [(x, y) for x, y in pts] + [(-x, y) for x, y in reversed(pts[:-1])]


def plate(name, org, n, tipdir, W, L, mt, lift=0.02, flare=14, th=0.006, bevel=0):
    n = n.normalized(); tipdir = (tipdir - n * tipdir.dot(n)).normalized()
    ey = -tipdir; ex = ey.cross(n).normalized(); c, s = math.cos(math.radians(flare)), math.sin(math.radians(flare))
    ey2 = ey * c - n * s; ez2 = n * c + ey * s
    o = prism(name, feather(W, L), 0, th, frame=(org + n * lift, ex, ey2, ez2), bevel=bevel)
    return set_mat(o, mt)


def emblema(center_z, h):
    """Cotorra en vuelo, vista de frente: alas arriba, cuerpo, cola abierta. Medio contorno (x, z) y su espejo."""
    half = [(0, 0.056), (0.012, 0.050), (0.016, 0.034), (0.034, 0.036), (0.052, 0.058), (0.072, 0.066), (0.064, 0.044), (0.074, 0.034),
            (0.060, 0.020), (0.064, 0.006), (0.044, 0.002), (0.024, -0.010), (0.016, -0.034), (0.026, -0.064), (0.008, -0.052)]
    out = half + [(-x, y) for x, y in reversed(half[1:])]
    out = [(x * h / 0.07, y * h / 0.07) for x, y in out]
    p, n = surf(0, center_z); ey = (Z - n * Z.dot(n)).normalized(); ex = ey.cross(n).normalized()
    med = [(0.082 * math.cos(a), 0.082 * math.sin(a)) for a in [k / 28 * 2 * math.pi for k in range(28)]]
    base = prism('medallon', med, 0, 0.008, frame=(p + n * 0.062, ex, ey, n))
    base = set_mat(base, M['ORO'])
    ave = prism('cotorra', out, 0, 0.007, frame=(p + n * 0.070, ex, ey, n))
    ave = set_mat(ave, M['VERDE'])
    # frente roja y plumas azules de las alas (parches planos sobre el ave)
    fr = prism('frente', [(0.0, 0.056 * h / 0.07), (0.011 * h / 0.07, 0.050 * h / 0.07), (0, 0.040 * h / 0.07), (-0.011 * h / 0.07, 0.050 * h / 0.07)], 0, 0.004,
               frame=(p + n * 0.075, ex, ey, n)); set_mat(fr, M['ROJO'])
    az = []
    for sg in (1, -1):
        pts = [(sg * 0.046 * h / 0.07, 0.044 * h / 0.07), (sg * 0.070 * h / 0.07, 0.064 * h / 0.07), (sg * 0.062 * h / 0.07, 0.040 * h / 0.07), (sg * 0.046 * h / 0.07, 0.032 * h / 0.07)]
        if sg < 0: pts = pts[::-1]
        a = prism('ala%d' % sg, pts, 0, 0.004, frame=(p + n * 0.075, ex, ey, n)); az.append(set_mat(a, M['AZUL']))
    return [base, ave, fr] + az


def pechera():
    out = []
    rows = [(0.640, [-0.09, -0.03, 0.03, 0.09]), (0.580, [-0.12, -0.06, 0.0, 0.06, 0.12]), (0.515, [-0.10, -0.05, 0.0, 0.05, 0.10]),
            (0.455, [-0.07, 0.0, 0.07]), (0.405, [-0.03, 0.03])]
    for r, (z, xs) in enumerate(rows):
        for x in xs:
            if abs(x) < 0.075 and 0.46 < z < 0.62: continue  # lo tapa el medallón
            if abs(x) < 0.075 and 0.46 < z < 0.62: continue  # lo tapa el medallón
            p, n = surf(x, z); out.append(plate('pl%d_%d' % (r, int(x * 1000)), p, n, -Z, 0.07, 0.105, M['ORO'], lift=0.020 + 0.004 * r, flare=12))
    return out


def hombreras():
    out = []
    for sg in (1, -1):
        for i, x in enumerate((0.34, 0.27, 0.20)):
            p, n = surf(sg * x, 0, d=(0, 0, -1), start=(sg * x, -0.012, 1.0))
            out.append(plate('hb%d_%d' % (sg, i), p, n, Vector((sg, 0, -0.25)), 0.10, 0.13, M['ORO'], lift=0.018 + 0.005 * i, flare=10))
    return out


def corona(z=1.30):
    """Aro dorado sobre la frente + tres hojas de yagrumo (pluma): una central alta y dos laterales abiertas."""
    ring = []
    for k in range(24):
        a = k / 24 * 2 * math.pi
        r = head_radius(z, a) + 0.016
        ring.append(Vector((math.sin(a) * r, 0.04 - math.cos(a) * r, z)))
    aro = set_mat(tube_path('aro', ring, 0.012, seg=6, closed=True), M['ORO'])
    out = [aro]
    for name, az, L, W, tilt in (('hc', 0, 0.21, 0.11, 12), ('hl', 40, 0.16, 0.09, 26), ('hr', -40, 0.16, 0.09, 26)):
        a = math.radians(az); r = head_radius(z, a) + 0.018
        p = Vector((math.sin(a) * r, 0.04 - math.cos(a) * r, z - 0.005)); n = Vector((math.sin(a), -math.cos(a), 0))
        ex = Vector((math.cos(a), math.sin(a), 0)); ey0 = Z
        c, s = math.cos(math.radians(tilt)), math.sin(math.radians(tilt))
        ey = ey0 * c + n * s; ez = n * c - ey0 * s
        # hoja con la punta arriba: contorno de feather volteado
        o = prism(name, [(x, -y) for x, y in feather(W, L)], 0, 0.007, frame=(p, ex, ey, ez))
        out.append(set_mat(o, M['ORO']))
    return out


def build():
    # túnica ajustada
    body = lathe('tunica', dense_rows(T, 10), seg=36); lift_back_hem(body)
    wrap_outside(body, offset=0.012, smooth=6, thickness=0.006, subdiv=0)
    cyl_uv(body); weights_from_body(body); set_mat(body, M['TELA']); body.parent = None
    arm = pechera() + hombreras() + emblema(0.535, 0.074)
    for o in arm: apply_mods(o); ensure_uv(o)
    j = join(arm, 'armadura'); weights_from_body(j)
    cr = corona()
    for o in cr: apply_mods(o); ensure_uv(o)
    c = join(cr, 'corona'); rigid_part(c, 'cabeza.001')
    o = join([body, j, c], 'traje_guardian')
    shade_smooth(o, 50); add_armature(o)
    return o


if __name__ == '__main__':
    o = build()
    print('TRIS', tri_count(o), 'MATS', [m.name for m in o.data.materials])
    check_clear([o], eyes=True)
    if '--solo-captura' not in sys.argv:
        export([o], 'traje_guardian'); print('KB', round(glb_kb('traje_guardian'), 1))
    for k, col in (('verde', '#1f7a5c'), ('azul', '#2a5bd7'), ('rojo', '#b3262b')):
        M['TELA'].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*hexrgb(col), 1)
        M['TELA'].diffuse_color = (*hexrgb(col), 1)
        preview([o], 'tg_' + k, views=(('frente', (0.6, -3.0, 1.0)), ('espalda', (-1.6, 2.9, 1.2))))
        preview_head([o], 'tg_' + k)
    preview_head([o], 'tg_pecho', size=520, target=(0, -0.2, 0.56), dist=0.75, views=(('frente', 0),))
