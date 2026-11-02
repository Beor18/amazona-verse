"""Amazona Verse · matas de guineo (Musa, plátano/banano) para los huertos junto a las casas (tablero C12).

  Blender -b --factory-startup --python tools/blender/entorno_guineo.py

Modelo propio, hecho por script (nada descargado). Un solo .glb con tres variantes (un objeto cada una):
  guineo_a  mata adulta: pseudotallo de ~2,4 m, 8 hojas, racimo de guineos verdes y la «bellota» (flor morada)
  guineo_b  mata sin racimo: 7 hojas y dos hojas secas colgando
  guineo_c  hijo (retoño): 5 hojas pequeñas y más erguidas
Sin texturas: un solo material (un draw call por variante en el juego). El color lo pone el shader de src/game/guineo.js
según la parte, que va codificada en la U del UV:
  U en [0,1) hoja (0 = borde izq., 0,5 = nervio central, 1 = borde der.) · [2,3) pseudotallo, pecíolo y raquis
  [4,5) guineo (V = 0 base → 1 punta) · [6,7) bellota · [8,9) hoja seca
  V: a lo largo de la pieza (0 base → 1 punta). El exportador glTF guarda 1 − V; el shader lo deshace.
Color de vértice (COLOR_0, como el kit de entorno): R = AO, G = peso del viento (0 base → 1 puntas), B = fase. No es color.
Hojas con desgarros (muescas en V desde el margen hasta cerca del nervio), como las de verdad tras el viento.
Salida: assets/models/guineo/guineo.glb y guineo_glb.js (window.AV_GUINEO_B64.guineo, para hosts sin .glb).
"""
import bpy, math, os, random, sys, json, base64
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import entorno_lib as L  # noqa: E402

TAU = math.tau
UP = Vector((0, 0, 1))
GOLD = math.pi * (3 - math.sqrt(5))
OUT = os.path.join(L.ROOT, 'assets/models/guineo')
HOJA, TALLO, FRUTO, BELLOTA, SECA = 0.0, 2.0, 4.0, 6.0, 8.0
sm = L.smooth


def tubo(mb, pts, rads, sides, code, ao, wind, ph, cap=False, u_rep=1.0):
    """Tubo sobre una polilínea con la parte codificada en U (code + 0..u_rep·0,98) y V = 0..1 a lo largo."""
    n = len(pts)
    fr = L.frames(pts)
    acc = [0.0]
    for i in range(1, n):
        acc.append(acc[-1] + (pts[i] - pts[i - 1]).length)
    tot = max(acc[-1], 1e-6)
    rows = []
    for i in range(n):
        T, Nn, B = fr[i]
        t = acc[i] / tot
        row = []
        for j in range(sides + 1):
            a = TAU * (j % sides) / sides
            d = Nn * math.cos(a) + B * math.sin(a)
            row.append(mb.v(pts[i] + d * rads[i], ao(t), wind(t), ph, d))
        rows.append((row, t))
    for i in range(n - 1):
        (ra, ta), (rb, tb) = rows[i], rows[i + 1]
        for j in range(sides):
            u0, u1 = code + j / sides * u_rep * 0.98, code + (j + 1) / sides * u_rep * 0.98
            mb.f((ra[j], ra[j + 1], rb[j + 1], rb[j]), ((u0, ta), (u1, ta), (u1, tb), (u0, tb)), 0)
    if cap:
        T = fr[-1][0]
        c = mb.v(pts[-1] + T * rads[-1] * 0.6, ao(1.0), wind(1.0), ph, T)
        r = rows[-1][0]
        for j in range(sides):
            mb.f((r[j], r[j + 1], c), ((code + 0.1, 1.0), (code + 0.2, 1.0), (code + 0.15, 1.0)), 0)
    return tot


def hoja(mb, rng, base, az, elev, Lp, Lb, Wb, droop, ph, tears, code=HOJA, nv=9, ao0=0.55, w0=0.22, curl=0.3):
    """Hoja de guineo: pecíolo (tubo) + lámina oblonga arqueada, con márgenes caídos y desgarros en V."""
    Lt = Lp + Lb
    d0 = Vector((math.cos(elev) * math.cos(az), math.cos(elev) * math.sin(az), math.sin(elev)))
    segs = 24
    raw = [base + d0 * (Lt * t) + Vector((0, 0, -droop * Lt * t * t)) for t in [i / segs for i in range(segs + 1)]]
    acc = [0.0]
    for i in range(segs):
        acc.append(acc[-1] + (raw[i + 1] - raw[i]).length)
    k = Lt / acc[-1]

    def mid(s):  # punto del nervio a la distancia s (m) desde la base, con su tangente
        s = max(0.0, min(Lt, s)) / k
        i = 0
        while i < segs - 1 and acc[i + 1] < s:
            i += 1
        f = (s - acc[i]) / max(acc[i + 1] - acc[i], 1e-9)
        p = base + (raw[i].lerp(raw[i + 1], f) - base) * k
        tg = (raw[i + 1] - raw[i]).normalized()
        return p, tg

    # pecíolo: tubo fino del tallo a la lámina
    pp = [mid(Lp * t)[0] for t in (0, 0.5, 1.0)]
    tubo(mb, pp, [0.035, 0.028, 0.022], 4, TALLO if code == HOJA else SECA, lambda t: ao0 + 0.15 * t,
         lambda t: w0 + 0.12 * t, ph, u_rep=0.3)

    def ancho(v):  # media anchura de la lámina (oblonga, punta redondeada)
        return Wb * 0.5 * sm(0.0, 0.12, v) ** 0.55 * (1.0 - 0.62 * sm(0.78, 1.0, v) ** 2.2)  # punta roma

    def pos(side, u, v):  # side ±1; u 0 (nervio) → 1 (margen); v 0 → 1 a lo largo de la lámina
        p, tg = mid(Lp + Lb * v)
        lat = UP.cross(tg)
        if lat.length < 1e-4:
            lat = Vector((-math.sin(az), math.cos(az), 0))
        lat.normalize()
        nup = tg.cross(lat).normalized()
        w = ancho(v) * u
        return p + lat * (side * w) - nup * (w * (0.18 + curl * u)), nup, lat

    # desgarros: filas donde la lámina se abre en V (un lado o los dos)
    cortes = {-1: set(), 1: set()}
    for _ in range(tears):
        j = rng.randint(2, nv - 2)
        cortes[rng.choice((-1, 1))].add(j)
    us = (0.0, 0.5, 1.0)
    for side in (-1, 1):
        gap = 0.035
        rows = []  # por fila: (inferior, superior) listas de 3 índices; iguales salvo en un desgarro
        for j in range(nv + 1):
            v = j / nv
            pair = []
            for dv in ((-gap, gap) if j in cortes[side] else (0.0,)):
                row = []
                for u in us:
                    vv = min(1.0, max(0.0, v + dv * u))  # en el nervio no hay corte: la muesca se abre hacia el margen
                    p, nup, lat = pos(side, u, vv)
                    n = (nup * 0.7 + UP * 0.25 + lat * side * 0.15 * u).normalized()
                    ao = ao0 + (1.0 - ao0) * sm(0.0, 0.6, vv) - 0.08 * (1 - u)
                    w = w0 + (1.0 - w0) * (0.35 + 0.65 * vv) ** 1.3 * (0.85 + 0.15 * u)
                    row.append((mb.v(p, ao, w, ph + 0.07 * side, n), (0.5 + side * 0.49 * u, vv)))
                pair.append(row)
            rows.append((pair[0], pair[-1]))
        for j in range(nv):
            a, b = rows[j][1], rows[j + 1][0]  # superior de esta fila → inferior de la siguiente
            for i in range(2):
                q = (a[i], a[i + 1], b[i + 1], b[i])
                if side < 0:
                    q = q[::-1]
                mb.f([x[0] for x in q], [(code + x[1][0], x[1][1]) for x in q], 0)


def racimo(mb, rng, top, az, manos=5, dedos=8, bellota=True, ph=0.6):
    """Raquis que sale de la corona y cuelga; manos de guineos verdes que se curvan hacia arriba; bellota al final."""
    d = Vector((math.cos(az), math.sin(az), 0))
    p0 = top + d * 0.08
    p1 = top + d * 0.55 + Vector((0, 0, 0.12))
    p2 = top + d * 0.8 + Vector((0, 0, -1.05))
    pts = L.curve(p0, p1, p2, 7)
    wind = lambda t: 0.25 + 0.15 * t  # noqa: E731
    tubo(mb, pts, [0.045, 0.042, 0.04, 0.038, 0.035, 0.03, 0.026], 5, TALLO, lambda t: 0.5 + 0.2 * t, wind, ph, u_rep=0.4)
    for h in range(manos):
        t = 0.42 + 0.4 * h / max(1, manos - 1)
        c = L.bez(p0, p1, p2, t)
        tg = (L.bez(p0, p1, p2, min(1, t + 0.02)) - L.bez(p0, p1, p2, max(0, t - 0.02))).normalized()
        a1 = tg.orthogonal().normalized()
        a2 = tg.cross(a1)
        n = dedos - (1 if h >= manos - 2 else 0)
        rot = rng.uniform(0, TAU)
        Lf = 0.26 * (1.0 - 0.18 * h / manos)
        for f in range(n):
            ang = rot + TAU * f / n
            rad = (a1 * math.cos(ang) + a2 * math.sin(ang)).normalized()
            q0 = c + rad * 0.05
            # los guineos salen hacia afuera y se curvan hacia arriba
            q1 = q0 + rad * Lf * 0.45 + UP * Lf * 0.2
            q2 = q0 + rad * Lf * 0.55 + UP * Lf * 0.85
            fp = L.curve(q0, q1, q2, 3)
            tubo(mb, fp, [0.026, 0.033, 0.016], 4, FRUTO, lambda t: 0.45 + 0.4 * t, lambda t: 0.4, ph + 0.05 * h,
                 cap=True, u_rep=0.6)
    end = p2
    if bellota:
        b0 = end
        b1 = end + Vector((0, 0, -0.32)) + d * 0.04
        prof = [0.03, 0.075, 0.085, 0.07, 0.04, 0.008]
        bp = [b0.lerp(b1, t) for t in (0.0, 0.18, 0.4, 0.62, 0.85, 1.0)]
        tubo(mb, bp, prof, 6, BELLOTA, lambda t: 0.55 + 0.35 * (1 - abs(t - 0.4)), lambda t: 0.55, ph + 0.3, u_rep=1.0)


def mata(rng, H=2.4, N=8, ls=1.0, bunch=True, dry=1, tears=3, joven=False):
    mb = L.MB()
    k = H / 2.4
    lean = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), 0)).normalized() * 0.12 * k
    pts = [lean * (t * t) + Vector((0, 0, H * t)) for t in [i / 6 for i in range(7)]]
    rad = [(0.2 if i == 0 else 0.17 - 0.05 * (i / 6)) * (0.55 + 0.45 * k) for i in range(7)]
    tubo(mb, pts, rad, 8, TALLO, lambda t: 0.4 + 0.5 * sm(0, 0.25, t), lambda t: 0.25 * t * t, 0.0, u_rep=1.0)
    top = pts[-1]
    # hoja nueva enrollada («cigarro»): cono vertical en el centro de la corona
    cg = [top + Vector((0, 0, z)) for z in (0.0, 0.35 * ls, 0.7 * ls)]
    tubo(mb, cg, [0.05 * ls, 0.035 * ls, 0.006], 4, HOJA + 0.42, lambda t: 0.7 + 0.3 * t, lambda t: 0.3 + 0.4 * t, 0.9, u_rep=0.16)
    for i in range(N):
        age = i / max(1, N - 1)  # 0 = la más joven (arriba, erguida) → 1 la más vieja (abajo, caída)
        az = i * GOLD * 1.15 + rng.uniform(-0.15, 0.15)
        if joven:
            elev = math.radians(78 - 30 * age + rng.uniform(-5, 5))
            droop = 0.12 + 0.25 * age
        else:
            elev = math.radians(62 - 70 * age ** 0.8 + rng.uniform(-6, 6))
            droop = 0.26 + 0.5 * age
        Lb = (1.75 + 0.45 * math.sin(math.pi * min(1.0, 0.25 + age * 0.9)) + rng.uniform(-0.12, 0.12)) * ls
        b = top + Vector((0, 0, -0.08 - 0.22 * age * k))
        hoja(mb, rng, b, az, elev, 0.38 * ls, Lb, Lb * 0.34, droop, i / N,
             tears=0 if age < 0.15 else rng.randint(max(0, tears - 2), tears), nv=8 if joven else 9)
    for i in range(dry):  # hojas secas colgando pegadas al pseudotallo
        az = rng.uniform(0, TAU)
        b = top + Vector((0, 0, -0.35 - 0.2 * i))
        hoja(mb, rng, b, az, math.radians(-66 - 10 * i), 0.15, 1.15 * ls, 0.2 * ls, 0.05, rng.random(), tears=3,
             code=SECA, nv=6, ao0=0.4, w0=0.15, curl=0.6)
    if bunch:
        racimo(mb, rng, top + Vector((0, 0, -0.1)), rng.uniform(0, TAU))
    return mb


def material():
    m = bpy.data.materials.new('GUINEO')
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (0.18, 0.42, 0.1, 1)
    b.inputs['Roughness'].default_value = 0.75
    m.use_backface_culling = False
    return m


VARIANTES = {
    'guineo_a': dict(seed=11, H=2.4, N=8, ls=1.0, bunch=True, dry=1, tears=3),
    'guineo_b': dict(seed=23, H=2.05, N=7, ls=0.92, bunch=False, dry=2, tears=4),
    'guineo_c': dict(seed=37, H=0.75, N=5, ls=0.5, bunch=False, dry=0, tears=1, joven=True),
}

if __name__ == '__main__':
    L.reset()
    os.makedirs(OUT, exist_ok=True)
    mat = material()
    obs, info = [], {}
    for n, cfg in VARIANTES.items():
        c = dict(cfg)
        rng = random.Random(c.pop('seed'))
        mb = mata(rng, **c)
        ob = mb.build(n, [mat])
        obs.append(ob)
        bb = [Vector(v) for v in ob.bound_box]
        info[n] = dict(tris=mb.tris(), alto=round(max(p.z for p in bb), 2),
                       ancho=round(max(max(p.x for p in bb) - min(p.x for p in bb), max(p.y for p in bb) - min(p.y for p in bb)), 2))
    for i, ob in enumerate(obs):  # en fila para la exportación no importa: cada variante va con su pivote en la base
        ob.location = (0, 0, 0)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in obs:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    path = os.path.join(OUT, 'guineo.glb')
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
        export_normals=True, export_texcoords=True, export_tangents=False, export_materials='EXPORT',
        export_vertex_color='ACTIVE', export_all_vertex_colors=False, export_animations=False, export_skins=False,
        export_morph=False, export_cameras=False, export_lights=False, export_extras=False)
    b64 = base64.b64encode(open(path, 'rb').read()).decode('ascii')
    with open(os.path.join(OUT, 'guineo_glb.js'), 'w') as f:
        f.write('(window.AV_GUINEO_B64=window.AV_GUINEO_B64||{})["guineo"]="%s";\n' % b64)
    gi = L.glb_info(path)
    json.dump(dict(variantes=info, tris=gi['tris'], kb=round(gi['size'] / 1024, 1), atributos=gi['attrs']),
              open(os.path.join(OUT, 'guineo.json'), 'w'), indent=1, ensure_ascii=False)
    print('OK guineo', json.dumps(info), 'tris', gi['tris'], 'KB', round(gi['size'] / 1024, 1), gi['attrs'])
