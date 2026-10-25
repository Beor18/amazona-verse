# OBJETOS EN LA MANO IZQUIERDA (Vittata), rígidos a `armL2` (la palma y los dedos cuelgan de armL2; es el hueso que
# usa wardrobe.js). Blender 4.2 sin ventana:
#   cd ~ && Blender -b ~/AmazonaVerse/04_Blender_3D/vittata_rig_final.blend --python ~/AmazonaVerse/Juego/tools/blender/ropa_mano.py [-- mano_bandera ...]
# Mano ≈ (0.70, -0.05, 0.688), dedos hasta x≈0.80. El puño agarra a lo largo de -Y; como en wardrobe.js, los objetos
# largos apuntan al frente y suben 20°. El mango se coloca con BVH justo delante de los dedos / bajo la palma, sin
# atravesar la mano (se busca la posición libre más cercana al puño).
import sys, os, math
sys.path.insert(0, os.path.expanduser('~/AmazonaVerse/Juego/tools/blender'))
from ropa_lib import *

R = math.radians
TILT = R(20)
A = Vector((0, -math.cos(TILT), math.sin(TILT)))     # a lo largo del mango (al frente y arriba)
S = Vector((1, 0, 0))                                 # hacia afuera (punta de los dedos)
NUP = A.cross(S).normalized()                         # perpendicular "arriba" (sube y va un poco atrás)
if NUP.z < 0: NUP = -NUP
HAND = Vector((0.70, -0.05, 0.688))


def M():
    return dict(MADERA=mat('MADERA', hexrgb('#a86a35'), 0.55), MADERA_CLARA=mat('MADERA_CLARA', hexrgb('#d9b27a'), 0.6),
                MADERA_OSCURA=mat('MADERA_OSCURA', hexrgb('#5a3519'), 0.5), METAL=mat('METAL', hexrgb('#b9c4c9'), 0.3, 0.9),
                ACENTO=mat('ACENTO', hexrgb('#2a5bd7'), 0.5), NEGRO=mat('NEGRO', hexrgb('#1c1c1e'), 0.6),
                BLANCO=mat('BLANCO', hexrgb('#f6f6f2'), 0.6), ROJO=mat('ROJO', hexrgb('#e3262e'), 0.6),
                AZUL=mat('AZUL', hexrgb('#2c6fd6'), 0.6),
                PR_ROJO=mat('PR_ROJO', hexrgb('#ee0000'), 0.6), PR_AZUL=mat('PR_AZUL', hexrgb('#0044ff'), 0.6),
                PR_BLANCO=mat('PR_BLANCO', hexrgb('#ffffff'), 0.6), DORADO=mat('DORADO', hexrgb('#d8b04a'), 0.3, 0.9),
                PAPEL=mat('PAPEL', hexrgb('#efe2b8'), 0.9), TINTA=mat('TINTA', hexrgb('#7a5634'), 0.8))


def cristal(color='#ffd84a'):
    m = mat('CRISTAL', hexrgb(color), 0.15)
    b = m.node_tree.nodes.get('Principled BSDF')
    for k, v in (('Emission Color', (*hexrgb(color), 1)), ('Emission Strength', 1.5)):
        if k in b.inputs: b.inputs[k].default_value = v
    return m


def fit_grip(r, back, fwd, clear=0.003):
    """Busca el punto de agarre G (eje A) libre de la mano: el mango [G-A*back, G+A*fwd] de radio r queda a
    ≥ clear del cuerpo. Prefiere el sitio más cercano al puño (delante de los dedos, a media altura)."""
    bvh = body_bvh(); target = Vector((0.745, -0.08, 0.684)); best = None
    for x in [0.70 + 0.01 * i for i in range(11)]:
        for y in (-0.07, -0.085, -0.10, -0.115):
            for z in [0.60 + 0.004 * k for k in range(31)]:
                G = Vector((x, y, z)); sc = (G - target).length
                if best and sc >= best[0]: continue
                ok = True
                for k in range(13):
                    p = G + A * (-back + (back + fwd) * k / 12)
                    loc, nrm, idx, d = bvh.find_nearest(p)
                    sd = d if (p - loc).dot(nrm) >= 0 else -d
                    if sd < r + clear: ok = False; break
                if ok: best = (sc, G)
    print('GRIP', tuple(round(c, 3) for c in best[1]))
    return best[1]


FLAG_PHI = 40   # grados


def fan_solid(name, center, ring, th):
    """Polígono en abanico (centro + contorno) con grosor: estrellas que siguen la superficie curva del paño."""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    c = bm.verts.new(center); V = [bm.verts.new(p) for p in ring]; n = len(V)
    for i in range(n): bm.faces.new((c, V[i], V[(i + 1) % n]))
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    add_mod(o, 'SOLIDIFY', thickness=th, offset=0, use_rim=True); apply_mods(o)
    return normals_out(o)


def normals_out(o):
    """Normales hacia fuera en una cáscara cerrada (la tela de la bandera se veía oscura por un lado: normales al revés)."""
    bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(o.data); bm.free()
    o.data.update(); return o


def F(G, s, a=0.0, b=0.0):
    """Punto del marco del objeto: s a lo largo de A, a hacia afuera (S), b hacia arriba (NUP)."""
    return G + A * s + S * a + NUP * b


def handle(G, s0, s1, r0, r1, mt, seg=12):
    return set_mat(revolve('mango', F(G, s0), F(G, s1), [(0, r0 * 0.85), (0.04, r0), (0.96, r1), (1, r1 * 0.85)], seg=seg), mt)


# ---------------------------------------------------------------------------------------------- piezas
def bandera():
    """Bandera de PR fiel (docs/BANDERA_PR_GUIA.md): 2:3, 5 franjas iguales (rojo arriba y abajo), triángulo equilátero en
    el asta por las dos caras y estrella regular de 5 puntas con una punta hacia arriba, en el baricentro (radio alto/6,
    interior 0,382). Colores #EE0000 / #FFFFFF / #0044FF.
    Paño de 22 × 33 cm (antes 15 × 22,5) en un asta de 0,69 m, ondulación suave (8 mm).
    Orientación: en Idle el brazo cuelga y el eje S de la mano (hacia los dedos en pose T) queda hacia abajo y adelante,
    y NUP hacia afuera. Por eso el vuelo va hacia −S abierto FLAG_PHI hacia NUP: en el juego el paño sube hacia atrás y
    afuera desde el asta, de cara a la luz. Antes iba en (A, NUP) y en Idle quedaba horizontal, mostrando la cara de
    abajo, oscura."""
    mt = M(); r = 0.012
    G = fit_grip(r, 0.07, 0.14)
    top = 0.62
    parts = [handle(G, -0.07, top, r, r * 0.9, mt['MADERA'])]
    parts.append(set_mat(sphere('remate', F(G, top + 0.015), 0.02, seg=16, rings=8), mt['DORADO']))
    parts.append(set_mat(revolve('punta', F(G, top + 0.028), F(G, top + 0.072), [(0, 0.0085), (1, 0.0)], seg=12, cap1=False), mt['DORADO']))
    parts.append(set_mat(revolve('regaton', F(G, -0.082), F(G, -0.064), [(0, 0.0105), (1, 0.013)], seg=14), mt['DORADO']))
    s0, hoist = top - 0.225, 0.22
    fly = 1.5 * hoist
    PHI = R(FLAG_PHI)   # el vuelo se abre hacia afuera (en Idle) para no tapar la panza ni cruzar el cuerpo al bailar
    FL = (-S * math.cos(PHI) + NUP * math.sin(PHI)).normalized(); NR = (NUP * math.cos(PHI) + S * math.sin(PHI)).normalized()
    def fp(s, q, side=0.0):
        t = q / fly
        wave = 0.008 * math.sin(2 * math.pi * 0.9 * t + 0.3) * t + 0.003 * math.sin(math.pi * s / hoist) * t
        return G + A * (s0 + s - 0.008 * t * t) + FL * (r * 0.6 + q) + NR * (wave + side)
    nq = 18; rows = []
    for st in range(5):
        for h in (0, 0.5):
            rows.append(hoist * (st + h) / 5)
    rows.append(hoist)
    G2 = [[fp(s, fly * i / nq) for i in range(nq + 1)] for s in rows]
    fl = grid_mesh('bandera', G2)
    fl.data.materials.append(mt['PR_ROJO']); fl.data.materials.append(mt['PR_BLANCO'])
    for p in fl.data.polygons:
        row = p.index // nq; stripe = row // 2
        p.material_index = 0 if stripe % 2 == 0 else 1
    add_mod(fl, 'SOLIDIFY', thickness=0.0024, offset=0, use_rim=True); apply_mods(fl); normals_out(fl)
    parts.append(fl)
    # triángulo (equilátero, base en el asta) y estrella, por las dos caras
    apex = hoist * math.sqrt(3) / 2
    for side in (0.0021, -0.0021):
        tri = []; n = 12; m = 10   # rejilla que sigue la onda del paño (antes cuerdas rectas: la tela lo atravesaba)
        for k in range(n + 1):
            s = hoist * k / n; qmax = apex * (1 - abs(2 * k / n - 1)) * 0.999
            tri.append([fp(s, qmax * j / m, side) for j in range(m + 1)])
        t = grid_mesh('triangulo', tri)
        add_mod(t, 'SOLIDIFY', thickness=0.0008, offset=0, use_rim=True); apply_mods(t); normals_out(t)
        parts.append(set_mat(t, mt['PR_AZUL']))
        # estrella pegada al paño (sigue la onda): punta k=0 hacia +s, el borde de arriba (el remate del asta)
        ro = hoist / 6; ri = ro * 0.382; sc, qc = hoist / 2, apex / 3
        star_pts = [fp(sc + math.cos(k * math.pi / 5) * (ro if k % 2 == 0 else ri), qc + math.sin(k * math.pi / 5) * (ro if k % 2 == 0 else ri), side * 1.6) for k in range(10)]
        parts.append(set_mat(fan_solid('estrella', fp(sc, qc, side * 1.6), star_pts, 0.0008), mt['PR_BLANCO']))
    return parts


def maracas():
    mt = M(); r = 0.0095; parts = []
    G = fit_grip(r + 0.01, 0.03, 0.09)
    for k, sd in enumerate((-1, 1)):
        ax = (A * math.cos(R(17)) + S * sd * math.sin(R(17))).normalized()
        g = G + NUP * (0.006 * sd)
        a = g - ax * 0.035; b = g + ax * 0.115
        parts.append(set_mat(revolve('mango', a, b, [(0, r * 1.25), (0.08, r), (0.8, r * 0.85), (1, r * 1.3)], seg=10), mt['MADERA']))
        c = g + ax * 0.165; u, v, n = frame_from(ax)
        head = sphere('higuera', (0, 0, 0), 1.0, seg=20, rings=12)
        for vv in head.data.vertices:
            x, y, z = vv.co; zz = z * 0.056 + 0.006 * z * z * z
            vv.co = c + u * x * 0.047 + v * y * 0.047 + n * zz
        parts.append(set_mat(head, mt['MADERA_CLARA']))
        # decoración pintada ACENTO: dos aros y una franja en zigzag
        for f in (-0.55, 0.55):
            rr = 0.047 * math.sqrt(1 - f * f) + 0.0012
            parts.append(set_mat(tube_path('aro', [c + n * (0.056 * f) + (u * math.cos(2 * math.pi * i / 24) + v * math.sin(2 * math.pi * i / 24)) * rr for i in range(24)], 0.0028, seg=5, closed=True), mt['ACENTO']))
        zz = []
        for i in range(36):
            ang = 2 * math.pi * i / 36; f = 0.28 * (1 if i % 2 == 0 else -1); rr = 0.047 * math.sqrt(1 - f * f) + 0.0012
            zz.append(c + n * (0.056 * f) + (u * math.cos(ang) + v * math.sin(ang)) * rr)
        parts.append(set_mat(tube_path('zigzag', zz, 0.0022, seg=5, closed=True), mt['ACENTO']))
        for i in range(6):  # puntitos
            ang = 2 * math.pi * (i + 0.5) / 6; rr = 0.047 + 0.001
            parts.append(set_mat(sphere('punto', c + (u * math.cos(ang) + v * math.sin(ang)) * rr, 0.0045, seg=8, rings=4), mt['ACENTO']))
        parts.append(set_mat(revolve('tapon', c - n * 0.06, c - n * 0.05, [(0, 0.013), (1, 0.016)], seg=10), mt['MADERA_OSCURA']))
    return parts


def linterna():
    """Linterna: cabeza de Ø 8,4 cm (antes 7) y 0,25 m; el mango (Ø 4,8 cm) sigue en el puño."""
    mt = M(); r = 0.024; parts = []
    G = fit_grip(r, 0.05, 0.12)
    _F = globals()['F']
    def F(G_, s, a=0.0, b=0.0): return _F(G_, s * 1.2, a * 1.2, b * 1.2)
    prof = [(t, rr * 1.2) for t, rr in [(0, 0.017), (0.03, 0.02), (0.62, 0.02), (0.7, 0.024), (0.86, 0.033), (0.88, 0.035), (1.0, 0.035)]]
    parts.append(set_mat(revolve('cuerpo', F(G, -0.055), F(G, 0.15), prof, seg=20, cap0=True, cap1=False), mt['METAL']))
    for s in (-0.03, -0.015, 0.0, 0.015, 0.03, 0.045):   # estrías del mango
        ring = [F(G, s) + (S * math.cos(2 * math.pi * i / 20) + NUP * math.sin(2 * math.pi * i / 20)) * 0.0246 for i in range(20)]
        parts.append(set_mat(tube_path('estria', ring, 0.002, seg=6, closed=True), mt['NEGRO']))
    lens = revolve('luz', F(G, 0.146), F(G, 0.156), [(0, 0.037), (0.5, 0.037), (1, 0.031)], seg=24)
    parts.append(set_mat(lens, cristal()))
    bez = [F(G, 0.152) + (S * math.cos(2 * math.pi * i / 24) + NUP * math.sin(2 * math.pi * i / 24)) * 0.0414 for i in range(24)]
    parts.append(set_mat(tube_path('bisel', bez, 0.0048, seg=8, closed=True), mt['METAL']))
    parts.append(set_mat(rbox('boton', F(G, 0.085, 0, 0.0215), (0.017, 0.024, 0.0096), bevel=0.0036, axes=(S, A, NUP)), mt['ACENTO']))
    loop = [F(G, -0.055, 0, 0.0), F(G, -0.07, 0, 0.008), F(G, -0.078, 0, 0.0), F(G, -0.07, 0, -0.008), F(G, -0.055, 0, 0.0)]
    parts.append(set_mat(tube_path('cordel', loop, 0.0028, seg=8), mt['ACENTO']))
    return parts


def martillo():
    """Martillo de juguete robusto (auditoría: el de antes se veía de alambre): mango de Ø 3,4 cm y 0,33 m, cabeza de
    5,2 cm con cara de golpe de Ø 4,6 cm y uña gruesa partida en V."""
    mt = M(); r = 0.016; parts = []
    G = fit_grip(r, 0.05, 0.12)
    parts.append(set_mat(revolve('mango', F(G, -0.06), F(G, 0.27), [(0, 0.016), (0.04, 0.019), (0.3, 0.017), (0.85, 0.0145), (1, 0.015)], seg=16), mt['MADERA']))
    parts.append(set_mat(revolve('tope', F(G, -0.072), F(G, -0.058), [(0, 0.015), (0.5, 0.02), (1, 0.019)], seg=16), mt['ACENTO']))
    parts.append(set_mat(revolve('virola', F(G, 0.245), F(G, 0.278), [(0, 0.0165), (1, 0.0165)], seg=16), mt['METAL']))
    hc = F(G, 0.29)
    parts.append(set_mat(rbox('cabeza', hc, (0.046, 0.05, 0.054), bevel=0.007, segs=3, axes=(S, A, NUP)), mt['METAL']))
    # cara de golpe hacia abajo (-NUP)
    parts.append(set_mat(revolve('cara', hc - NUP * 0.024, hc - NUP * 0.08, [(0, 0.021), (0.75, 0.022), (0.88, 0.025), (1, 0.022)], seg=20), mt['METAL']))
    # orejas (uña) hacia arriba, curvadas hacia atrás y partidas en V
    for sd in (-1, 1):
        pts = []; rs = []
        for k in range(8):
            t = k / 7; pts.append(hc + NUP * (0.024 + 0.062 * t) - A * (0.03 * t * t) + S * sd * (0.008 + 0.005 * t)); rs.append(0.0125 * (1 - 0.6 * t))
        parts.append(set_mat(tube_path('una', pts, rs, seg=10), mt['METAL']))
    parts.append(set_mat(rbox('cuna', hc + A * 0.0, (0.026, 0.016, 0.008), bevel=0.0025, axes=(S, NUP, A)), mt['MADERA_OSCURA']))
    return parts


def mapa():
    mt = M(); r = 0.016; parts = []
    G = fit_grip(r, 0.03, 0.17)
    s0, s1 = -0.03, 0.17
    parts.append(set_mat(revolve('rollo', F(G, s0), F(G, s1), [(0, 0.014), (0.03, r), (0.97, r), (1, 0.014)], seg=16), mt['PAPEL']))
    for s in (s0, s1):  # bordes enrollados (espiral) a cada lado
        sp = [F(G, s + (0.0015 if s == s0 else -0.0015), 0.0, 0.0) + (S * math.cos(t) + NUP * math.sin(t)) * (0.004 + 0.0018 * t) for t in [k * 0.5 for k in range(14)]]
        parts.append(set_mat(tube_path('espiral', sp, 0.0012, seg=6), mt['TINTA']))
    # hoja abierta colgando del rollo hacia abajo y afuera, con el otro extremo enrollado
    L = 0.17; nl = 12; ns = 8
    def sheet(s, t, off=0.0):
        d = (-NUP * math.cos(R(28)) + S * math.sin(R(28)))  # cae hacia abajo y un poco afuera
        base = F(G, s0 + 0.012 + (s1 - s0 - 0.024) * s, 0.0, 0.0) + S * r
        bow = 0.018 * math.sin(math.pi * t) * (1 + 0.15 * math.sin(math.pi * s))
        n = (d.cross(A)).normalized()
        if n.dot(S) < 0: n = -n
        return base + d * (L * t) + n * (bow + off), n
    Gs = [[sheet(i / ns, j / nl)[0] for i in range(ns + 1)] for j in range(nl + 1)]
    sh = grid_mesh('hoja', Gs)
    add_mod(sh, 'SOLIDIFY', thickness=0.0016, offset=0, use_rim=True); apply_mods(sh)
    parts.append(set_mat(sh, mt['PAPEL']))
    e0, _ = sheet(0.0, 1.0); e1, _ = sheet(1.0, 1.0)
    parts.append(set_mat(revolve('rollo2', e0 - A * 0.004, e1 + A * 0.004, [(0, 0.008), (0.05, 0.0105), (0.95, 0.0105), (1, 0.008)], seg=12), mt['PAPEL']))
    # dibujo por los dos lados: isla, camino punteado y una X roja
    for sgn in (1, -1):
        off = 0.0016 * sgn
        isla = []
        for k in range(28):
            ang = 2 * math.pi * k / 28
            rr = 1 + 0.18 * math.sin(3 * ang) + 0.08 * math.cos(5 * ang)
            isla.append(sheet(0.5 + 0.36 * math.cos(ang) * rr, 0.42 + 0.17 * math.sin(ang) * rr, off)[0])
        parts.append(set_mat(tube_path('isla', isla, 0.0013, seg=6, closed=True), mt['TINTA']))
        for k in range(6):
            t = k / 5; p, n = sheet(0.25 + 0.45 * t, 0.62 - 0.32 * t + 0.08 * math.sin(math.pi * t * 2), off)
            parts.append(set_mat(sphere('paso', p, 0.0026, scale=(1, 1, 1), seg=6, rings=3), mt['ROJO']))
        xc, n = sheet(0.74, 0.28, off)
        for da, db in ((1, 1), (1, -1)):
            p0 = sheet(0.74 - 0.05 * da, 0.28 - 0.06 * db, off)[0]; p1 = sheet(0.74 + 0.05 * da, 0.28 + 0.06 * db, off)[0]
            parts.append(set_mat(tube_path('x', [p0, p1], 0.0022, seg=5), mt['ROJO']))
        # rosa de los vientos
        c, n = sheet(0.2, 0.8, off * 1.2); u = (sheet(0.21, 0.8, off)[0] - c).normalized(); nn = n * sgn
        pts = [(math.cos(k * math.pi / 4) * (0.014 if k % 2 == 0 else 0.005), math.sin(k * math.pi / 4) * (0.014 if k % 2 == 0 else 0.005)) for k in range(8)]
        parts.append(set_mat(prism('rosa', pts, 0, 0.0006, frame=(c, u, nn.cross(u), nn)), mt['TINTA']))
    return parts


def coqui(cx=0.65, cy=-0.02):
    mt = M()
    VERDE = mat('COQUI', hexrgb('#6aa84f'), 0.9); CLARO = mat('COQUI_PANZA', hexrgb('#f1e3b5'), 0.9)
    OJO = mat('OJO_BLANCO', hexrgb('#ffffff'), 0.3); PUP = mat('PUPILA', hexrgb('#141414'), 0.2)
    ROSA = mat('MEJILLA', hexrgb('#ff8fa3'), 0.8); DEDO = mat('COQUI_DEDOS', hexrgb('#a9d17c'), 0.8)
    bvh = body_bvh(); top = 0.0
    for dx, dy in ((0, 0.01), (0, -0.005), (-0.03, -0.02), (0.03, -0.02), (-0.04, 0.01), (0.04, 0.01), (-0.03, -0.05), (0.03, -0.05)):
        x, y = cx + dx, cy + dy
        h = bvh.ray_cast(Vector((x, y, 0.95)), Vector((0, 0, -1)), 0.4)
        if h[0] is not None: top = h[0].z if top == 0.0 else min(top, h[0].z)
    z0 = top  # se sube después lo justo para no tocar la mano (ver lift)
    print('HAND_TOP', round(top, 3))
    def E(name, c, rad, m, seg=16, rings=10):
        return set_mat(sphere(name, c, 1.0, scale=rad, seg=seg, rings=rings), m)
    parts = []
    parts.append(E('cuerpo', (cx, cy + 0.005, z0 + 0.038), (0.042, 0.046, 0.04), VERDE))
    parts.append(E('panza', (cx, cy - 0.022, z0 + 0.034), (0.032, 0.026, 0.03), CLARO))
    parts.append(E('cabeza', (cx, cy - 0.022, z0 + 0.082), (0.05, 0.04, 0.036), VERDE))
    for sx in (-1, 1):
        ex = cx + sx * 0.026
        parts.append(E('ojo', (ex, cy - 0.04, z0 + 0.108), (0.0175, 0.0175, 0.0175), OJO, seg=12, rings=8))
        parts.append(E('pupila', (ex + sx * 0.002, cy - 0.055, z0 + 0.109), (0.0095, 0.006, 0.0095), PUP, seg=10, rings=6))
        parts.append(E('brillo', (ex - sx * 0.002, cy - 0.06, z0 + 0.114), (0.0032, 0.002, 0.0032), OJO, seg=6, rings=4))
        parts.append(E('mejilla', (cx + sx * 0.036, cy - 0.052, z0 + 0.074), (0.009, 0.004, 0.006), ROSA, seg=8, rings=5))
        # patas delanteras con dedos (ventosas)
        sh = Vector((cx + sx * 0.026, cy - 0.03, z0 + 0.05)); hand = Vector((cx + sx * 0.03, cy - 0.052, z0 + 0.004))
        parts.append(set_mat(tube_path('brazo', [sh, (sh + hand) / 2 + Vector((sx * 0.006, -0.004, 0)), hand], 0.0075, seg=8), VERDE))
        for k in (-1, 0, 1):
            parts.append(E('dedo', hand + Vector((sx * 0.004 + k * 0.009, -0.012 + abs(k) * 0.003, -0.001)), (0.0045, 0.0045, 0.003), DEDO, seg=8, rings=4))
        # patas traseras dobladas (sentado)
        th = Vector((cx + sx * 0.04, cy + 0.012, z0 + 0.016))
        parts.append(E('muslo', th, (0.016, 0.03, 0.015), VERDE, seg=12, rings=8))
        ft = Vector((cx + sx * 0.05, cy - 0.022, z0 + 0.003))
        parts.append(E('pie', ft, (0.011, 0.02, 0.005), VERDE, seg=10, rings=5))
        for k in (-1, 0, 1):
            parts.append(E('dedo', ft + Vector((k * 0.008 + sx * 0.003, -0.02 + abs(k) * 0.004, 0.0)), (0.0042, 0.0042, 0.0028), DEDO, seg=8, rings=4))
    mouth = [Vector((cx + 0.022 * math.cos(a), cy - 0.0585 + 0.004 * math.sin(a) * 0, z0 + 0.074 - 0.008 * math.sin(a))) for a in [math.pi * k / 8 for k in range(9)]]
    parts.append(set_mat(tube_path('boca', mouth, 0.0016, seg=6), PUP))
    # auditoría: ×1,4 (14 cm de alto; antes no se distinguía en la mano a la distancia de juego)
    piv = Vector((cx, cy, z0))
    for o in parts:
        for v in o.data.vertices: v.co = piv + (v.co - piv) * 1.4
        o.data.update()
    # lift: sube todo hasta que el punto más bajo quede a 3 mm de la mano
    for _ in range(4):
        w = 9.0
        for o in parts:
            for v in o.data.vertices:
                loc, nrm, idx, d = bvh.find_nearest(v.co); w = min(w, d if (v.co - loc).dot(nrm) >= 0 else -d)
        if abs(w - 0.003) < 0.0005: break
        for o in parts:
            for v in o.data.vertices: v.co.z += 0.003 - w
            o.data.update()
    return parts


def cuaderno():
    """Cuaderno de campo (P0 de TRAITS_V2, cápsula del bosque · adulto): libreta de 20 × 14,5 × 2,6 cm pinzada entre el
    pulgar (delante) y los dedos (detrás). En Idle cuelga junto a la pata con la tapa de cara al frente. Tapa ACENTO
    (color elegido), hojas PAPEL con lomo redondeado, elástico NEGRO, etiqueta BLANCO con una hoja dibujada y un lápiz
    bajo el elástico. Se coloca con BVH: holgura de 3–6 mm con el pulgar y los dedos, lo más cerca posible de la palma."""
    mt = M(); bvh = body_bvh()
    VERDE = mat('HOJA', hexrgb('#3f9b4a'), 0.7); AMAR = mat('LAPIZ', hexrgb('#f2c21a'), 0.55); ROSA = mat('GOMA_BORRAR', hexrgb('#f28fa0'), 0.8)
    Lx, Wz, T = 0.2, 0.145, 0.026            # largo (hacia los dedos), ancho (arriba en pose T), grosor (Y)
    def slab_clear(x0, yc, zc):
        worst = 9.0
        for i in range(9):
            for j in range(7):
                for yy in (yc - T / 2 - 0.004, yc + T / 2 + 0.004):
                    q = Vector((x0 + Lx * i / 8, yy, zc - Wz / 2 + Wz * j / 6))
                    loc, nr, k, d = bvh.find_nearest(q); worst = min(worst, d if (q - loc).dot(nr) >= 0 else -d)
        return worst
    best = None
    for x0 in (0.70, 0.705, 0.71, 0.715, 0.72, 0.73):
        for yc in [-0.095 + 0.0025 * k for k in range(9)]:
            for zc in (0.69, 0.70, 0.71, 0.72):
                w = slab_clear(x0, yc, zc)
                if w < 0.003: continue      # pinzado: holgura de 3–6 mm, lo más cerca de la palma posible
                sc = -(x0 - 0.70) - 2 * abs(w - 0.0045) - 0.2 * abs(zc - 0.70)
                if best is None or sc > best[0]: best = (sc, x0, yc, zc, w)
    _, x0, yc, zc, w = best
    print('CUADERNO x0=%.3f yc=%.3f zc=%.3f holgura=%.4f' % (x0, yc, zc, w))
    X, Y, Z = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))
    C = Vector((x0 + Lx / 2, yc, zc))
    Q = lambda x, y, z: C + X * x + Y * y + Z * z
    parts = []
    # tapas (delante -Y y detrás +Y), lomo redondeado en -Z (hacia el cuerpo en Idle) y bloque de hojas
    for sy in (-1, 1):
        parts.append(set_mat(rbox('tapa', Q(0, sy * (T / 2 - 0.002), 0.001), (Lx, 0.004, Wz), bevel=0.0018, segs=2), mt['ACENTO']))
    parts.append(set_mat(revolve('lomo', Q(-Lx / 2, 0, -Wz / 2 + 0.003), Q(Lx / 2, 0, -Wz / 2 + 0.003), [(0, T / 2), (1, T / 2)], seg=16), mt['ACENTO']))
    parts.append(set_mat(rbox('hojas', Q(0, 0, 0.0), (Lx - 0.008, T - 0.008, Wz - 0.006), bevel=0.0015, segs=1), mt['PAPEL']))
    for k in range(1, 4):   # cantos de las hojas (líneas finas en el borde abierto)
        yy = -T / 2 + 0.004 + (T - 0.008) * k / 4
        parts.append(set_mat(tube_path('canto', [Q(-Lx / 2 + 0.006, yy, Wz / 2 - 0.0028), Q(Lx / 2 - 0.006, yy, Wz / 2 - 0.0028)], 0.0006, seg=4), mt['TINTA']))
    # etiqueta con una hoja dibujada (cara de delante)
    yf = -T / 2 - 0.0005
    parts.append(set_mat(rbox('etiqueta', Q(-0.035, yf - 0.0006, -0.005), (0.075, 0.0012, 0.055), bevel=0.0005, segs=1), mt['BLANCO']))
    leaf = [(math.cos(t) * 0.022, math.sin(t) * 0.011 * (1 - 0.35 * math.cos(t))) for t in [2 * math.pi * k / 20 for k in range(20)]]
    parts.append(set_mat(prism('hoja', leaf, 0, 0.0008, frame=(Q(-0.035, yf - 0.0013, -0.005), X, Z, -Y)), VERDE))
    parts.append(set_mat(tube_path('nervio', [Q(-0.06, yf - 0.0022, -0.005), Q(-0.012, yf - 0.0022, -0.005)], 0.0007, seg=4), mt['TINTA']))
    # lápiz bajo el elástico, a lo largo del cuaderno, cerca del borde abierto
    zp = Wz / 2 - 0.022; yp = yf - 0.0065; rp = 0.0055
    parts.append(set_mat(revolve('lapiz', Q(-Lx / 2 + 0.01, yp, zp), Q(Lx / 2 - 0.03, yp, zp), [(0, rp), (1, rp)], seg=6), AMAR))
    parts.append(set_mat(revolve('virola', Q(-Lx / 2 + 0.0, yp, zp), Q(-Lx / 2 + 0.012, yp, zp), [(0, rp * 1.05), (1, rp * 1.05)], seg=10), mt['METAL']))
    parts.append(set_mat(revolve('borrador', Q(-Lx / 2 - 0.009, yp, zp), Q(-Lx / 2 + 0.001, yp, zp), [(0, rp * 0.8), (0.3, rp), (1, rp)], seg=10), ROSA))
    parts.append(set_mat(revolve('punta', Q(Lx / 2 - 0.031, yp, zp), Q(Lx / 2 - 0.012, yp, zp), [(0, rp), (1, 0.0018)], seg=10, cap1=False), mt['MADERA_CLARA']))
    parts.append(set_mat(revolve('mina', Q(Lx / 2 - 0.0125, yp, zp), Q(Lx / 2 - 0.006, yp, zp), [(0, 0.0019), (1, 0.0)], seg=8, cap1=False), mt['TINTA']))
    # elástico: lazo alrededor del cuaderno (por encima del lápiz delante)
    ze = zp; ye0, ye1 = yp - rp - 0.002, T / 2 + 0.0025; xa, xb = -Lx / 2 - 0.0025, Lx / 2 + 0.0025
    loop = [Q(xa, ye0, ze), Q(0, ye0 - 0.001, ze), Q(xb, ye0, ze), Q(xb, 0, ze), Q(xb, ye1, ze), Q(0, ye1, ze), Q(xa, ye1, ze), Q(xa, 0, ze)]
    parts.append(set_mat(tube_path('elastico', catmull(loop + [loop[0]], 3), 0.0026, seg=6, closed=True), mt['NEGRO']))
    return parts


def lupa():
    """Lupa (P0 de TRAITS_V2, cápsula dorada · adulto; primera ficha de ciencia): mango de madera torneado de 14 cm con
    anillo ACENTO, casquillo y aro DORADO de Ø 12,7 cm y lente VIDRIO clara y abombada. El aro va en el plano del mango,
    girado 45° hacia arriba y afuera (en Idle se ve desde la cámara de detrás y desde el lado). Largo total 0,29 m."""
    mt = M(); r = 0.0145
    G = fit_grip(r, 0.05, 0.10)
    lente = mat('VIDRIO', hexrgb('#e3f4ff'), 0.05)
    parts = [set_mat(revolve('mango', F(G, -0.05), F(G, 0.095), [(0, 0.012), (0.04, 0.0165), (0.12, 0.0175), (0.3, 0.0155),
                                                               (0.62, 0.0145), (0.85, 0.0128), (1, 0.0118)], seg=16), mt['MADERA'])]
    parts.append(set_mat(revolve('remate', F(G, -0.062), F(G, -0.046), [(0, 0.007), (0.6, 0.0125), (1, 0.0125)], seg=16), mt['DORADO']))
    parts.append(set_mat(revolve('anillo', F(G, 0.062), F(G, 0.074), [(0, 0.0147), (0.5, 0.0156), (1, 0.0147)], seg=16), mt['ACENTO']))
    parts.append(set_mat(revolve('casquillo', F(G, 0.09), F(G, 0.118), [(0, 0.0128), (0.4, 0.0118), (0.8, 0.009), (1, 0.008)], seg=16), mt['DORADO']))
    Rr, tr = 0.055, 0.0085
    c = F(G, 0.118 + tr + Rr)
    nrm = (NUP * math.cos(R(45)) - S * math.sin(R(45))).normalized()
    ex = A; ey = nrm.cross(ex).normalized()
    ring = [c + (ex * math.cos(2 * math.pi * k / 40) + ey * math.sin(2 * math.pi * k / 40)) * Rr for k in range(40)]
    parts.append(set_mat(tube_path('aro', ring, tr, seg=12, closed=True), mt['DORADO']))
    for sg in (1, -1):   # bisel interior que sujeta la lente
        lip = [c + nrm * sg * 0.004 + (ex * math.cos(2 * math.pi * k / 40) + ey * math.sin(2 * math.pi * k / 40)) * (Rr - tr * 0.6) for k in range(40)]
        parts.append(set_mat(tube_path('bisel', lip, 0.0026, seg=6, closed=True), mt['DORADO']))
    parts.append(set_mat(revolve('lente', c - nrm * 0.006, c + nrm * 0.006, [(0, 0.0), (0.12, Rr * 0.55), (0.3, Rr * 0.85), (0.5, Rr - tr * 0.5),
                                                                           (0.7, Rr * 0.85), (0.88, Rr * 0.55), (1, 0.0)], seg=32, cap0=False, cap1=False), lente))
    parts.append(set_mat(revolve('cuello', F(G, 0.112), F(G, 0.118 + tr * 0.6), [(0, 0.0085), (1, 0.0105)], seg=12), mt['DORADO']))
    return parts


PIEZAS = {'mano_bandera': bandera, 'mano_maracas': maracas, 'mano_linterna': linterna, 'mano_martillo': martillo,
          'mano_mapa': mapa, 'mano_coqui': coqui, 'mano_cuaderno': cuaderno, 'mano_lupa': lupa}


def finish(name):
    parts = PIEZAS[name]()
    for p in parts: apply_mods(p); ensure_uv(p)
    o = join(parts, name)
    shade_smooth(o, 75)
    check_clear([o], eyes=False)
    rigid(o, 'armL2')
    print('TRIS', name, tri_count(o), 'MATS', [m.name for m in o.data.materials])
    dist = 1.15 if name == 'mano_bandera' else 0.75
    tgt = (0.75, -0.25, 0.78) if name == 'mano_bandera' else (0.73, -0.1, 0.69)
    preview_tiles([o], name, 'mano', target=tgt, dist=dist, views=(('f', -25), ('l', 80), ('b', 160)), size=210, elev=0.3)
    export([o], name)
    print('KB', name, round(glb_kb(name), 1))
    bpy.data.objects.remove(o, do_unlink=True)


if __name__ == '__main__':
    rest_pose()
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    for n in (argv or list(PIEZAS)):
        print('=== PIEZA', n); finish(n)
    for f in os.listdir(PREV):
        if f.startswith('_tmp_'): os.remove(os.path.join(PREV, f))
