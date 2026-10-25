# EQUIPO DE ESPALDA del ropero (Vittata), rígido a `espalda2`. Blender 4.2 sin ventana:
#   cd ~ && Blender -b ~/AmazonaVerse/04_Blender_3D/vittata_rig_final.blend --python ~/AmazonaVerse/Juego/tools/blender/ropa_espalda.py [-- equipo_cuatro ...]
# Las piezas se modelan en un marco "plano de la espalda" (montaje (0, 0.092, 0.628), inclinado como la espalda),
# se asientan por FUERA (holgura sobre la camisa) con BVH, quedan por encima de la cola (z>0.5) y bajo la cabeza,
# y las correas van por encima de los hombros siguiendo la superficie del cuerpo, sin tocar las alas.
# Auditoría 2026-10-24: en el juego todo el equipo se veía de juguete (~40 % del ancho de la espalda) y las correas,
# rígidas al pecho, se metían 2 cm en el hombro con las alas bajadas (Idle). Ahora cada pieza se escala por K sobre su
# cara de apoyo, las correas y la manguera llevan los pesos de la piel (siguen hombros y pecho, nunca la cabeza) y la
# mochila PR usa el contrato métrico de TELA con la bandera centrada en la cara de atrás.
import sys, os, math
sys.path.insert(0, os.path.expanduser('~/AmazonaVerse/Juego/tools/blender'))
from ropa_lib import *

R = math.radians
X = Vector((1, 0, 0))
U = Vector((0, -0.05, 0.26)).normalized()          # "arriba" de la espalda (inclinado hacia el cuerpo)
W = X.cross(U).normalized() * -1                    # hacia afuera (atrás, +Y)
O = Vector((0, 0.125, 0.66))                        # centro de la cara que mira al cuerpo


def P(x, u, w):
    return O + X * x + U * u + W * w


def M():
    return dict(TELA=mat('TELA', hexrgb('#d0473a'), 0.85), ACENTO=mat('ACENTO', hexrgb('#2a5bd7'), 0.55),
                METAL=mat('METAL', hexrgb('#b9c4c9'), 0.3, 0.9), NEGRO=mat('NEGRO', hexrgb('#1c1c1e'), 0.6),
                MADERA=mat('MADERA', hexrgb('#a86a35'), 0.5), MADERA_CLARA=mat('MADERA_CLARA', hexrgb('#e2b77c'), 0.55),
                MADERA_OSCURA=mat('MADERA_OSCURA', hexrgb('#5a3519'), 0.5), CUERDA=mat('CUERDA', hexrgb('#ece6d6'), 0.35, 0.7),
                BLANCO=mat('BLANCO', hexrgb('#f2f3f5'), 0.5))


def local(o, fn=None):
    """Pasa una malla modelada en coordenadas locales (x, u, w) al marco de la espalda."""
    for v in o.data.vertices:
        x, u, w = v.co; v.co = P(x, u, w)
    o.data.update(); return o


def scale_about(objs, c, k):
    """Escala las piezas (ya en el marco de la espalda) alrededor de `c`."""
    for o in objs:
        for v in o.data.vertices: v.co = c + (v.co - c) * k
        o.data.update()


def skin(o):
    o['skin'] = 1; return o


def seat(objs, clear=0.03, it=6):
    """Mueve las piezas a lo largo de W hasta que el vértice más cercano quede a `clear` del cuerpo."""
    bvh = body_bvh()
    for _ in range(it):
        worst = 9.0
        for o in objs:
            for v in o.data.vertices:
                loc, nrm, idx, d = bvh.find_nearest(v.co)
                sd = d if (v.co - loc).dot(nrm) >= 0 else -d
                worst = min(worst, sd)
        sh = clear - worst
        if abs(sh) < 0.001: break
        for o in objs:
            for v in o.data.vertices: v.co += W * sh
            o.data.update()
    print('SEAT worst=%.4f' % worst)


def strap(name, keys, width=0.03, th=0.005, gap=0.024, mt=None):
    pts, nrm = body_path(keys, gap=gap, n_per=5, fixed=(0, -1))
    for i in (0, -1):  # en los extremos la normal mira hacia afuera de la pieza (W)
        nrm[i] = (nrm[i] + W).normalized()
    return skin(set_mat(ribbon(name, pts, nrm, width, th), mt))


def harness(top, bot, mt, sternum=True, buckle=None, z_st=0.62, sw=0.034):
    """Dos correas de hombro: de `top(s)` por encima del hombro y bajan por el pecho hasta la panza (no rodean el
    costado: ahí van las alas plegadas). `bot(s)`: correíta corta del fondo de la pieza. + correa de pecho con hebilla."""
    out = []
    for s in (1, -1):
        keys = [top(s), Vector((s * 0.11, 0.06, 0.765)), Vector((s * 0.128, -0.03, 0.758)), Vector((s * 0.13, -0.13, 0.7)),
                Vector((s * 0.13, -0.2, 0.62)), Vector((s * 0.135, -0.215, 0.52))]
        pts, nrm = body_path(keys, gap=0.022, n_per=5, fixed=(0,))
        nrm[0] = (nrm[0] + W).normalized()
        out.append(skin(set_mat(ribbon('correa', pts, nrm, sw, 0.006), mt)))
        tip = pts[-1]; n = nrm[-1]; d = (pts[-1] - pts[-2]).normalized()
        out.append(skin(set_mat(rbox('punta', tip + n * 0.005 - d * 0.013, (sw + 0.006, 0.028, 0.007), bevel=0.0028, axes=(n.cross(d).normalized(), d, n)), buckle or mt)))
    if sternum:
        keys = [Vector((0.13, -0.24, z_st)), Vector((0.0, -0.27, z_st)), Vector((-0.13, -0.24, z_st))]
        pts, nrm = body_path(keys, gap=0.028, n_per=4, fixed=())
        out.append(skin(set_mat(ribbon('pecho', pts, nrm, 0.02, 0.005), mt)))
        c = pts[len(pts) // 2]; n = nrm[len(nrm) // 2]
        out.append(skin(set_mat(rbox('hebilla', c + n * 0.007, (0.04, 0.009, 0.028), bevel=0.0035, axes=(X, -n, Vector((0, 0, 1)))), buckle or mt)))
    return out


# ---------------------------------------------------------------------------------------------- piezas
FLAG_MOCHILA = 0.107  # alto (m) del parche BANDERA 3:2 en la cara de atrás (16 × 10,7 cm)


def mochila_pr():
    """Mochila escolar: cuerpo 0,31 × 0,29 × 0,17 m (antes 0,25 × 0,26 × 0,14), bolsillo delantero, cremalleras, asa y
    arnés. La bandera es un parche BANDERA (textura fiel del juego); la TELA lleva la UV métrica y sale lisa."""
    # El canto de arriba queda 2 cm por debajo de la nuca en Idle/dance (al bailar la cabeza se ladea sobre la mochila).
    mt = M(); hw, hh, dp, uc = 0.155, 0.145, 0.17, -0.01
    bag = local(rbox('mochila', (0, uc, dp / 2), (2 * hw, 2 * hh, dp), bevel=0.055, segs=5))
    pocket = local(rbox('bolsillo', (0, uc - 0.084, dp + 0.022), (0.235, 0.1, 0.05), bevel=0.022, segs=4))
    seat([bag, pocket], clear=0.03)
    off = min((v.co - O).dot(W) for v in bag.data.vertices)
    Pw = lambda x, u, w: P(x, u + uc, w + off)
    parts = [set_mat(bag, mt['TELA']), set_mat(pocket, mt['TELA'])]
    # cremallera por encima (de costado a costado, siguiendo el canto redondeado) y la del bolsillo, con tiradores
    ztop = []
    for k in range(17):
        a = math.pi * k / 16; ztop.append(Pw(-0.122 * math.cos(a), hh + 0.002 - 0.012 * math.cos(a) ** 8, dp / 2 + 0.056 * math.sin(a)))
    parts.append(set_mat(tube_path('cremallera', ztop, 0.0035, seg=8), mt['METAL']))
    zp = [Pw(-0.1 + 0.02 * k, -0.046, dp + 0.0475) for k in range(11)]
    parts.append(set_mat(tube_path('cremallera', zp, 0.003, seg=8), mt['METAL']))
    for p in (ztop[4], zp[-2]):
        parts.append(set_mat(rbox('tirador', p + W * 0.005 - U * 0.014, (0.01, 0.026, 0.005), bevel=0.0018, axes=(X, U, W)), mt['ACENTO']))
    # asa arriba
    # (en la mitad de afuera del canto y baja: la nuca está a 4 cm cuando la cabeza mira arriba)
    asa = [Pw(-0.048, hh - 0.006, 0.112), Pw(-0.04, hh + 0.012, 0.116), Pw(0, hh + 0.019, 0.118), Pw(0.04, hh + 0.012, 0.116), Pw(0.048, hh - 0.006, 0.112)]
    parts.append(set_mat(tube_path('asa', asa, 0.0065, seg=10), mt['ACENTO']))
    # ribete del canto de atrás (da peso y forma de mochila de verdad)
    rib = []
    for k in range(48):
        a = 2 * math.pi * k / 48; cx, cu = math.cos(a), math.sin(a)
        e = 1 / max(abs(cx), abs(cu)) ** 0.5   # cuadrado redondeado
        rib.append(Pw((hw - 0.012) * cx * min(1, e * 0.82), (hh - 0.012) * cu * min(1, e * 0.82), dp - 0.004))
    parts.append(set_mat(tube_path('ribete', rib, 0.0042, seg=8, closed=True), mt['ACENTO']))
    # correas (más anchas) y punto de anclaje en el canto de arriba y abajo de la mochila
    top = lambda s: Pw(s * 0.085, hh - 0.02, 0.012)
    bot = lambda s: Pw(s * 0.12, -hh + 0.02, 0.012)
    parts += harness(top, bot, mt['ACENTO'], buckle=mt['NEGRO'], sw=0.036)
    # bandera de PR: parche 3:2 cosido en la cara de atrás, encima del bolsillo (asta a la izquierda vista desde atrás)
    parts.append(flag_patch('bandera', Pw(0, 0.034, dp), Vector((-1, 0, 0)), U, FLAG_MOCHILA, onto=target_bvh([bag]), off=0.0018))
    return parts, ('planar', Pw(0, 0.034, dp), None)


K_CUATRO = 1.04


def cuatro():
    mt = M()
    # contorno del cuerpo (l a lo largo del mástil, desde abajo; ancho medio)
    def hwid(l):
        b = 0.094 * math.exp(-((l - 0.075) / 0.07) ** 2) ; t = 0.074 * math.exp(-((l - 0.215) / 0.05) ** 2)
        return max(0.0, max(b, t, 0.058 * (0.03 < l < 0.25)) * math.sqrt(max(0.0, 1 - ((l - 0.135) / 0.137) ** 8)))
    Lb = 0.272; ls = [Lb * (0.5 - 0.5 * math.cos(math.pi * k / 30)) for k in range(31)]
    side = [(hwid(l), l) for l in ls]
    pts = [(w, l) for w, l in side] + [(-w, l) for w, l in reversed(side[1:-1])]
    # ejes del instrumento en el plano de la espalda (diagonal 42°: el clavijero hacia la derecha del ave, -X)
    Ld = (U * math.cos(R(46)) - X * math.sin(R(46))).normalized(); Wd = W.cross(Ld).normalized() * -1
    base = P(0.095, -0.15, 0.0)
    fr = lambda d: (base + W * d, Wd, Ld, W)  # marco (origen, eje ancho, eje largo, eje afuera)
    def Q(w, l, d): return base + Wd * w + Ld * l + W * d
    body = prism('caja', pts, 0.0, 0.048, frame=fr(0), bevel=0.005, segs=2)
    tapa = prism('tapa', [(x * 0.985, y) for x, y in pts], 0.0, 0.003, frame=fr(0.048), bevel=0.0012, segs=1)
    parts = [set_mat(body, mt['MADERA']), set_mat(tapa, mt['MADERA_CLARA'])]
    # boca (agujero) con roseta, puente
    bc = Q(0, 0.168, 0.0512)
    parts.append(set_mat(revolve('boca', bc - W * 0.0005, bc + W * 0.0008, [(0, 0.03), (1, 0.03)], seg=24), mt['NEGRO']))
    ros = [bc + (Wd * math.cos(2 * math.pi * k / 24) + Ld * math.sin(2 * math.pi * k / 24)) * 0.036 + W * 0.0008 for k in range(24)]
    parts.append(set_mat(tube_path('roseta', ros, 0.0028, seg=5, closed=True), mt['MADERA_OSCURA']))
    parts.append(set_mat(rbox('puente', Q(0, 0.06, 0.0545), (0.075, 0.012, 0.007), bevel=0.0025, axes=(Wd, Ld, W)), mt['MADERA_OSCURA']))
    # mástil, diapasón, trastes, clavijero y clavijas
    Ln = 0.205
    parts.append(set_mat(rbox('mastil', Q(0, Lb + Ln / 2 - 0.012, 0.03), (0.042, Ln + 0.03, 0.026), bevel=0.008, axes=(Wd, Ld, W)), mt['MADERA']))
    parts.append(set_mat(rbox('diapason', Q(0, Lb + Ln / 2 - 0.045, 0.047), (0.038, Ln + 0.09, 0.006), bevel=0.0015, axes=(Wd, Ld, W)), mt['MADERA_OSCURA']))
    for k in range(9):
        l = Lb + Ln - 0.015 - 0.026 * k * (1 - 0.035 * k)
        parts.append(set_mat(tube_path('traste', [Q(-0.018, l, 0.0505), Q(0.018, l, 0.0505)], 0.0011, seg=4), mt['CUERDA']))
    hl = Lb + Ln + 0.04
    head = rbox('clavijero', Q(0, hl, 0.027), (0.058, 0.085, 0.02), bevel=0.008, axes=(Wd, Ld, W))
    parts.append(set_mat(head, mt['MADERA_OSCURA']))
    for sd in (-1, 1):
        for k in range(5):
            l = hl - 0.032 + 0.016 * k; a = Q(sd * 0.027, l, 0.027); b = Q(sd * 0.047, l, 0.027)
            parts.append(set_mat(revolve('clavija', a, b, [(0, 0.0035), (0.55, 0.0035), (0.6, 0.007), (1, 0.006)], seg=8), mt['METAL']))
    # 10 cuerdas (5 órdenes dobles) del puente a la cejuela
    for c in range(5):
        for e in (-0.0018, 0.0018):
            w = (c - 2) * 0.0072 + e
            parts.append(set_mat(tube_path('cuerda', [Q(w * 1.6, 0.06, 0.06), Q(w, Lb + Ln - 0.005, 0.0525)], 0.0007, seg=4, cap=False), mt['CUERDA']))
    scale_about(parts, base, K_CUATRO)       # 0,58 m, más bajo y abierto (46°): el clavijero no toca la cabeza al andar
    seat(parts, clear=0.03)
    off = min((v.co - O).dot(W) for v in body.data.vertices)
    Qs = lambda w, l, d: base + (Q(w, l, d) - base) * K_CUATRO + W * off
    # correa en diagonal: del botón de abajo, por el costado izquierdo, cruza el pecho y sube al hombro derecho
    keys = [Qs(0, -0.004, 0.024), Vector((0.1, 0.07, 0.7)), Vector((0.135, -0.03, 0.758)), Vector((0.12, -0.15, 0.68)),
            Vector((0.0, -0.235, 0.57)), Vector((-0.12, -0.15, 0.68)), Vector((-0.135, -0.03, 0.758)), Vector((-0.11, 0.06, 0.77)),
            Qs(0, Lb + 0.004, 0.024)]
    parts.append(strap('correa', keys, width=0.032, mt=mt['ACENTO']))
    return parts, None


def tanques():
    """Dos botellas de buceo de 0,27 m (antes 0,25) y Ø 12,6 cm (antes 10,8), placa, abrazaderas, arnés y manguera."""
    mt = M(); parts = []; r = 0.063; L = 0.27; gx = 0.072; u0 = -0.148   # válvulas 2 cm bajo la nuca
    for s in (1, -1):
        a = P(s * gx, u0, r + 0.006); b = a + U * L
        prof = [(0, 0.0), (0.02, r * 0.55), (0.06, r * 0.88), (0.11, r), (0.85, r), (0.92, r * 0.88), (0.97, r * 0.55), (1.0, r * 0.18)]
        t = revolve('tanque', a, b, prof, seg=20, cap0=False, cap1=True)
        add_mod(t, 'SUBSURF', levels=1); apply_mods(t)
        parts.append(set_mat(t, mt['METAL']))
        for f in (0.28, 0.72):  # franjas ACENTO
            c0 = a + U * (L * f - 0.02); c1 = a + U * (L * f + 0.02)
            parts.append(set_mat(revolve('franja', c0, c1, [(0, r + 0.003), (0.15, r + 0.0045), (0.85, r + 0.0045), (1, r + 0.003)], seg=24, cap0=False, cap1=False), mt['ACENTO']))
        v0 = b - U * 0.004; v1 = v0 + U * 0.034
        parts.append(set_mat(revolve('valvula', v0, v1, [(0, 0.015), (0.6, 0.015), (0.7, 0.019), (1, 0.019)], seg=14), mt['METAL']))
        kn = v1 - U * 0.009
        parts.append(set_mat(revolve('perilla', kn, kn + X * s * 0.03, [(0, 0.007), (0.6, 0.007), (0.65, 0.016), (1, 0.016)], seg=14), mt['ACENTO']))
    pl = set_mat(rbox('placa', P(0, u0 + L / 2, 0.006), (0.17, 0.27, 0.012), bevel=0.004, axes=(X, U, W)), mt['NEGRO'])
    parts.append(pl)
    for f in (0.3, 0.7):  # abrazaderas negras
        c0 = P(0, u0 + L * f, 0.0)
        parts.append(set_mat(rbox('abrazadera', c0 + W * (r * 0.75), (2 * (gx + r) + 0.012, 0.02, 0.014), bevel=0.0045, axes=(X, U, W)), mt['NEGRO']))
    seat(parts, clear=0.03)
    off = min((v.co - O).dot(W) for v in pl.data.vertices)
    Pw = lambda x, u, w: P(x, u, w + off)
    top = lambda s: Pw(s * 0.065, u0 + L - 0.04, 0.004)
    bot = lambda s: Pw(s * 0.075, u0 + 0.03, 0.004)
    parts += harness(top, bot, mt['NEGRO'], buckle=mt['ACENTO'])
    # manguera desde la válvula izquierda sobre el hombro hasta el regulador en el pecho (sigue la piel)
    v_top = Pw(gx, u0 + L + 0.022, r + 0.006)
    keys = [v_top + X * 0.032, Vector((0.17, 0.11, 0.80)), Vector((0.165, 0.0, 0.81)), Vector((0.16, -0.13, 0.74)), Vector((0.12, -0.215, 0.65))]
    pts, nrm = body_path(keys, gap=0.04, n_per=5, fixed=(0,))
    parts.append(skin(set_mat(tube_path('manguera', pts, 0.009, seg=10), mt['NEGRO'])))
    reg = pts[-1]; n = nrm[-1]
    parts.append(skin(set_mat(revolve('regulador', reg, reg + n * 0.032, [(0, 0.022), (0.7, 0.022), (1, 0.013)], seg=16), mt['NEGRO'])))
    return parts, None


K_JET = 1.22


def jetpack():
    mt = M(); parts = []
    core = local(rbox('cuerpo', (0, 0.0, 0.04), (0.15, 0.22, 0.08), bevel=0.025, segs=3))
    parts.append(set_mat(core, mt['ACENTO']))
    for s in (1, -1):
        a = P(s * 0.125, -0.085, 0.07); b = a + U * 0.215; r = 0.048
        prof = [(0, r * 0.8), (0.04, r), (0.9, r), (0.96, r * 0.75), (1.0, 0.0)]
        parts.append(set_mat(revolve('celda', a, b, prof, seg=20, cap0=True, cap1=False), mt['ACENTO']))
        parts.append(set_mat(revolve('tapa', b - U * 0.035, b - U * 0.02, [(0, r + 0.003), (1, r + 0.003)], seg=20), mt['METAL']))
        parts.append(set_mat(revolve('aro', a + U * 0.03, a + U * 0.045, [(0, r + 0.003), (1, r + 0.003)], seg=20), mt['METAL']))
        # tobera METAL abajo
        n0 = a + U * 0.005; n1 = a - U * 0.075
        parts.append(set_mat(revolve('tobera', n0, n1, [(0, 0.024), (0.3, 0.02), (0.7, 0.03), (1, 0.04)], seg=20, cap0=True, cap1=False), mt['METAL']))
        parts.append(set_mat(revolve('fuego', n1 + U * 0.012, n1 + U * 0.004, [(0, 0.03), (1, 0.034)], seg=20, cap0=True, cap1=False), mt['NEGRO']))
        # aleta
        fin = [(0, 0), (0.07, 0), (0.035, 0.05), (0.0, 0.05)]
        f = prism('aleta', [(u, w) for u, w in fin], -0.003, 0.003, frame=(a + U * 0.02 + X * s * r * 0.8, U * 1.0, X * s, W.cross(X * s).normalized()), bevel=0.0015)
        parts.append(set_mat(f, mt['METAL']))
    # panel y luz
    parts.append(set_mat(rbox('panel', P(0, 0.03, 0.082), (0.08, 0.07, 0.008), bevel=0.003, axes=(X, U, W)), mt['METAL']))
    for k, c in enumerate(('#f2a03d', '#5ad15a')):
        parts.append(set_mat(sphere('boton', P(-0.02 + 0.04 * k, 0.03, 0.088), 0.008, seg=10, rings=5), mat('LUZ%d' % k, hexrgb(c), 0.3)))
    scale_about(parts, P(0, -0.01, 0), K_JET)   # cuerpo 0,19 × 0,28 m y celdas de Ø 11,7 cm (antes 0,15 × 0,22 y Ø 9,6)
    seat(parts, clear=0.03)
    off = min((v.co - O).dot(W) for v in core.data.vertices)
    Pw = lambda x, u, w: P(x * K_JET, u * K_JET, w + off)
    top = lambda s: Pw(s * 0.055, 0.1, 0.004)
    bot = lambda s: Pw(s * 0.065, -0.1, 0.004)
    parts += harness(top, bot, mt['NEGRO'], buckle=mt['METAL'])
    return parts, None


PIEZAS = {'equipo_mochila_pr': mochila_pr, 'equipo_cuatro': cuatro, 'equipo_tanques': tanques, 'equipo_jetpack': jetpack}


def finish(name):
    parts, uvinfo = PIEZAS[name]()
    for p in parts: apply_mods(p); ensure_uv(p)
    # pesos antes de juntar: la pieza rígida a espalda2; correas, hebillas y manguera con la piel (sin la cabeza)
    for p in parts:
        if p.get('skin'): skin_part(p)
        else: rigid_part(p, 'espalda2')
    o = join(parts, name)
    if uvinfo is None: cyl_uv(o)
    else:   # contrato métrico de TELA: bandera centrada en la cara de atrás, leída desde atrás (derecha = -X)
        _, c, fh = uvinfo
        keep = [m.name for m in o.data.materials if m.name != 'BANDERA']        # el parche BANDERA conserva su UV
        uv_planar_metric(o, c, Vector((-1, 0, 0)), U, mat_names=keep)
        for m in o.data.materials:
            if m.name.startswith('TELA'): tela_metric(m, fh)
    shade_smooth(o, 75)
    check_clear([o], eyes=False)
    add_armature(o)
    print('TRIS', name, tri_count(o), 'MATS', [m.name for m in o.data.materials], 'GROUPS', [g.name for g in o.vertex_groups])
    preview_tiles([o], name, 'espalda', target=(0, 0.02, 0.66), dist=1.5, views=(('b', 160), ('l', 75), ('f', -20)), size=210, elev=0.25)
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
