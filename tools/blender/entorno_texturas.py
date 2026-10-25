"""Amazona Verse · kit de entorno · TEXTURAS procedurales horneadas en Cycles.

  Blender -b --factory-startup --python tools/blender/entorno_texturas.py [-- nombre1 nombre2 ...]

Hojas (PNG con alfa, paleta 8 bits): geometría 2D procedural de hojas/flores con un shader de emisión
(color, nervaduras, degradados) que se hornea con una cámara ortográfica → albedo puro con alfa.
Cortezas y suelos (JPG tileables): shaders 100 % procedurales con ruido 4D sobre un toro (repite en U y V),
horneados a color + altura; la normal map (convención OpenGL/glTF) se calcula de la altura.
Salida: assets/tex/entorno/  (hoja_*.png, corteza_*.jpg + _n.jpg, suelo_*.jpg + _n.jpg)
"""
import bpy, math, os, random, sys
import numpy as np
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import entorno_lib as L  # noqa: E402

H = L.hexl
TAU = math.tau

# ───────────────────────── perfiles de hoja (medio ancho 0..1 a lo largo de t) ─────────────────────────
P = {
    'lance': lambda t: math.sin(math.pi * t) ** 0.8 * (1 - 0.3 * t),
    'ovate': lambda t: math.sin(math.pi * t ** 0.75) ** 0.7,
    'acum': lambda t: math.sin(math.pi * t ** 0.8) ** 0.6 * (1 - t ** 5),
    'oval': lambda t: math.sin(math.pi * t) ** 0.5,
    'disc': lambda t: math.sqrt(max(0.0, 1 - (2 * t - 1) ** 2)),
    'blade': lambda t: (1 - t) ** 0.75 * min(1.0, 0.45 + t * 5),
    'strap': lambda t: min(1.0, 0.8 + t * 2) * (1.0 if t < 0.8 else math.sqrt(max(0.0, (1 - t) / 0.2))),
    'spoon': lambda t: 0.18 + 0.82 * math.sin(math.pi * min(1.0, max(0.0, (t - 0.18) / 0.82))) ** 0.55 if t > 0.18 else 0.18,
    'lobe': lambda t: min(1.0, 0.3 + t * 1.4) * math.sqrt(max(0.0, 1 - max(0.0, (t - 0.55) / 0.45) ** 2)),
    'line': lambda t: 1.0,
    'taper': lambda t: 1 - 0.75 * t,
    'pod': lambda t: math.sqrt(max(0.0, 1 - (2 * t - 1) ** 8)),
    'pinnule': lambda t: math.sin(math.pi * t) ** 0.45 * (1 - 0.25 * t),
    'paddle': lambda t: math.sin(math.pi * t ** 0.9) ** 0.35 * (1 - 0.12 * t),
    'bract': lambda t: math.sin(math.pi * (0.15 + 0.85 * t)) ** 0.5,
}


class TB:
    """Geometría 2D de hojas para hornear. Atributos: LUV=(s across -1..1, t along 0..1), CB/CT colores base/punta,
    CP=(nervadura, sombra por capa, oscurecer borde, fin del degradado)."""

    def __init__(self):
        self.V, self.F, self.UV, self.CB, self.CT, self.CP, self.M = [], [], [], [], [], [], []

    def leaf(self, x, y, ang, Ln, W, prof='lance', z=0.0, cb=(0.1, 0.3, 0.05), ct=None, vein=1.0, shade=1.0,
             edge=1.0, gend=1.0, nv=9, bend=0.0, nt=8, ns=2, curl=0.0, m=0, wrap=False, vang=45):
        ct = ct or cb
        vk = math.tan(math.radians(vang)) * W * 0.5 / max(Ln, 1e-6)   # pendiente de nervaduras laterales en (s,t)
        pf = P[prof] if isinstance(prof, str) else prof
        offs = [(0, 0)]
        if wrap:
            r = Ln + W
            offs = [(dx, dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)
                    if (dx == 0 or (dx == -1 and x > 1 - r) or (dx == 1 and x < r))
                    and (dy == 0 or (dy == -1 and y > 1 - r) or (dy == 1 and y < r))]
        d = Vector((math.cos(ang), math.sin(ang)))
        p = Vector((-d.y, d.x))
        for ox, oy in offs:
            base = len(self.V)
            for i in range(nt + 1):
                t = i / nt
                c = Vector((x + ox, y + oy)) + d * (t * Ln) + p * (bend * Ln * t * t)
                tg = (d * Ln + p * (2 * bend * Ln * t)).normalized()
                q = Vector((-tg.y, tg.x))
                hw = max(1e-4, pf(t)) * W * 0.5
                for j in range(-ns, ns + 1):
                    s = j / ns
                    pt = c + q * (s * hw)
                    self.V.append((pt.x, pt.y, z + curl * s * s * W * 0.5 + curl * 0.3 * W * t * t))
                    self.CB.append((*cb, nv / 40.0))
                    self.CT.append((*ct, vk))
                    self.CP.append((vein, shade, edge, gend))
            row = 2 * ns + 1
            for i in range(nt):
                for j in range(2 * ns):
                    a = base + i * row + j
                    self.F.append((a, a + 1, a + 1 + row, a + row))
                    s0, s1 = (j - ns) / ns, (j + 1 - ns) / ns
                    t0, t1 = i / nt, (i + 1) / nt
                    self.UV.append(((s0, t0), (s1, t0), (s1, t1), (s0, t1)))
                    self.M.append(m)

    def mark(self):
        return len(self.V)

    def fit(self, i0, x0, y0, x1, y1, anchor='bottom', margin=0.008):
        """Escala uniformemente (sin mover el ancla) lo creado desde i0 para que quepa en la región."""
        vs = self.V[i0:]
        if not vs:
            return
        cx = (x0 + x1) / 2
        ay = {'bottom': y0, 'top': y1, 'center': (y0 + y1) / 2}[anchor]
        s = 1.0
        for x, y, _ in vs:
            dx, dy = x - cx, y - ay
            if dx > 1e-9: s = min(s, (x1 - margin - cx) / dx)
            if dx < -1e-9: s = min(s, (x0 + margin - cx) / dx)
            if dy > 1e-9 and anchor != 'top': s = min(s, (y1 - margin - ay) / dy)
            if dy < -1e-9 and anchor != 'bottom': s = min(s, (y0 + margin - ay) / dy)
        if s < 1.0:
            self.V[i0:] = [(cx + (x - cx) * s, ay + (y - ay) * s, z) for x, y, z in vs]

    def build(self, mats, name='hojas'):
        me = bpy.data.meshes.new(name)
        me.from_pydata(self.V, [], self.F)
        uv = me.uv_layers.new(name='LUV')
        uv.data.foreach_set('uv', [c for f in self.UV for p in f for c in p])
        for nm, data in (('CB', self.CB), ('CT', self.CT), ('CP', self.CP)):
            a = me.color_attributes.new(nm, 'FLOAT_COLOR', 'POINT')
            a.data.foreach_set('color', [c for cc in data for c in cc])
        me.polygons.foreach_set('material_index', self.M)
        for m in mats:
            me.materials.append(m)
        ob = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(ob)
        return ob


# ───────────────────────── materiales de horneado ─────────────────────────
def mode_value(t):
    v = t.new('ShaderNodeValue')
    v.name = 'MODE'
    v.outputs[0].default_value = 0.0
    return v.outputs[0]


def set_mode(val):
    for m in bpy.data.materials:
        if m.node_tree and 'MODE' in m.node_tree.nodes:
            m.node_tree.nodes['MODE'].outputs[0].default_value = val


def leaf_material(hk=40.0, noise_scale=55.0):
    """Shader de hoja estilizada: degradado base→punta, nervio central claro, nervaduras laterales,
    margen más oscuro, dos mitades con distinto valor (hoja plegada) y sombra por capa."""
    m = bpy.data.materials.new('LEAF')
    t = L.NT(m)
    uv = t.new('ShaderNodeUVMap', uv_map='LUV').outputs[0]
    s, tt, _ = t.sep(uv)
    cbn = t.new('ShaderNodeAttribute', attribute_name='CB')
    cb, nva = cbn.outputs['Color'], cbn.outputs['Alpha']
    ctn = t.new('ShaderNodeAttribute', attribute_name='CT')
    ct, vk = ctn.outputs['Color'], ctn.outputs['Alpha']
    cpn = t.new('ShaderNodeAttribute', attribute_name='CP')
    vein, shade, edge = t.sep(cpn.outputs['Color'])
    gend = cpn.outputs['Alpha']
    a = t.math('ABSOLUTE', s)
    mr = t.new('ShaderNodeMapRange', interpolation_type='SMOOTHSTEP', clamp=True)
    t.put(mr.inputs['Value'], tt)
    mr.inputs['From Min'].default_value = 0.04
    t.put(mr.inputs['From Max'], gend)
    c = t.mix(cb, ct, mr.outputs['Result'])
    rib = t.mul(t.sub(1.0, t.ramp(a, 0.035, 0.12)), vein)
    c = t.mix(c, t.vadd(t.vscale(c, 1.45), t.col((0.03, 0.035, 0.012))), t.mul(rib, 0.8))
    nv = t.mul(nva, 40.0)
    f = t.math('FRACT', t.mul(t.sub(tt, t.mul(a, vk)), nv))
    dd = t.math('MINIMUM', f, t.sub(1.0, f))
    line = t.sub(1.0, t.ramp(dd, 0.0, 0.1))
    lat = t.mul(t.mul(line, vein), t.mul(t.ramp(a, 0.08, 0.16), t.sub(1.0, t.ramp(a, 0.72, 0.95))))
    c = t.mix(c, t.vadd(t.vscale(c, 1.28), t.col((0.012, 0.014, 0.004))), t.mul(lat, 0.5))
    e = t.mul(t.ramp(a, 0.68, 1.0), edge)
    c = t.vscale(c, t.sub(1.0, t.mul(e, 0.3)))
    side = t.add(1.0, t.mul(t.math('MAXIMUM', t.math('MINIMUM', t.mul(s, 6.0), 1.0), -1.0), 0.07))
    c = t.vscale(c, side)
    c = t.vscale(c, t.add(0.48, t.mul(shade, 0.52)))
    nz = t.noise(t.coord('Object'), None, noise_scale, 3.0, 0.55)
    c = t.vscale(c, t.add(0.88, t.mul(nz, 0.24)))
    _, _, pz = t.sep(t.geo('Position'))
    h = t.mul(pz, hk)
    out = t.mix(c, t.comb(h, h, h), mode_value(t))
    t.emission_out(out)
    return m


def holdout_material():
    m = bpy.data.materials.new('HOLD')
    t = L.NT(m)
    o = t.new('ShaderNodeOutputMaterial')
    t.L.new(t.new('ShaderNodeHoldout').outputs[0], o.inputs['Surface'])
    return m


def proc_material(name, fn, hk=1.0):
    """fn(t, uv) → (color_socket, height_socket[0..1]). uv = posición XY de mundo (tile = [0,1)²)."""
    m = bpy.data.materials.new(name)
    t = L.NT(m)
    uv = t.geo('Position')
    col, hgt = fn(t, uv)
    hh = t.mul(hgt, hk)
    t.emission_out(t.mix(col, t.comb(hh, hh, hh), mode_value(t)))
    return m


# ───────────────────────── captura ortográfica ─────────────────────────
def capture_scene(W, Hh, rx, ry, samples=24):
    sc = L.reset()
    L.cycles(sc, samples)
    r = sc.render
    r.resolution_x, r.resolution_y, r.resolution_percentage = rx, ry, 100
    r.film_transparent = True
    r.filter_size = 1.2
    r.image_settings.file_format = 'OPEN_EXR'
    r.image_settings.color_depth = '32'
    r.image_settings.exr_codec = 'ZIP'
    sc.view_settings.view_transform = 'Standard'
    cd = bpy.data.cameras.new('cam')
    cd.type = 'ORTHO'
    cd.ortho_scale = max(W, Hh)
    cd.clip_start, cd.clip_end = 0.1, 100
    cam = bpy.data.objects.new('cam', cd)
    cam.location = (W / 2, Hh / 2, 50)
    sc.collection.objects.link(cam)
    sc.camera = cam
    sc.world = None
    return sc


def render_np(sc, tag):
    path = os.path.join(L.TMP, tag + '.exr')
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    a = L.load_px(path, linear=True)
    os.remove(path)
    return a


def albedo_from(a):
    al = a[..., 3:4]
    rgb = np.where(al > 1e-4, a[..., :3] / np.maximum(al, 1e-4), 0)
    return np.dstack([L.lin2srgb_np(rgb), al[..., 0]])


def plane(size=1.4, cx=0.5, cy=0.5, z=0.0, mat=None):
    me = bpy.data.meshes.new('plano')
    s = size / 2
    me.from_pydata([(cx - s, cy - s, z), (cx + s, cy - s, z), (cx + s, cy + s, z), (cx - s, cy + s, z)], [],
                   [(0, 1, 2, 3)])
    if mat:
        me.materials.append(mat)
    ob = bpy.data.objects.new('plano', me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def downsample(a, f):
    """Promedio por bloques f×f sobre color premultiplicado (antialias limpio al reducir)."""
    h, w = a.shape[:2]
    pm = np.dstack([a[..., :3] * a[..., 3:4], a[..., 3:4]])
    pm = pm.reshape(h // f, f, w // f, f, 4).mean((1, 3))
    al = pm[..., 3:4]
    return np.dstack([np.where(al > 1e-4, pm[..., :3] / np.maximum(al, 1e-4), 0), al])


LEAF_MAX = 512  # pedido del programador gráfico: hojas ≤512 px para móvil


def save_leaf(name, sc):
    a = albedo_from(render_np(sc, name))
    f = max(1, max(a.shape[:2]) // LEAF_MAX)
    if f > 1:
        a = downsample(a, f)
    # borde de alfa limpio: transición de ~1 px para que el alphaTest con mipmaps no se coma las hojas
    a[..., 3] = np.clip((a[..., 3] - 0.5) * 2.5 + 0.5, 0, 1)
    a = L.pad_rgba(a)
    path = os.path.join(L.TEX, name + '.png')
    size = L.save_png_indexed(a, path)
    print(f'  {name}.png  {a.shape[1]}x{a.shape[0]}  {size / 1024:.0f} KB')
    return a


def save_tileable(name, sc, nstrength, q=86, qn=88):
    set_mode(0.0)
    col = albedo_from(render_np(sc, name + '_c'))[..., :3]
    set_mode(1.0)
    hgt = render_np(sc, name + '_h')[..., 0]
    hgt = (hgt - hgt.min()) / max(1e-6, hgt.max() - hgt.min())
    set_mode(0.0)
    p1 = os.path.join(L.TEX, name + '.jpg')
    p2 = os.path.join(L.TEX, name + '_n.jpg')
    s1 = L.save_jpg(col, p1, q)
    nrm = L.height_to_normal(hgt, nstrength)
    s2 = L.save_jpg(nrm, p2, qn, noncolor=True)
    while s1 > 290 * 1024 and q > 60:
        q -= 6
        s1 = L.save_jpg(col, p1, q)
    while s2 > 290 * 1024 and qn > 60:
        qn -= 6
        s2 = L.save_jpg(nrm, p2, qn, noncolor=True)
    print(f'  {name}.jpg {s1 / 1024:.0f} KB (q{q}) · _n.jpg {s2 / 1024:.0f} KB (q{qn})  h[{hgt.min():.2f},{hgt.max():.2f}]')
    return col


# ───────────────────────── composiciones de hojas ─────────────────────────
def frond_palm(tb, rng, ox, oy, W, Hh, cols, n=38, dry=False):
    """Hoja pinnada de palma de sierra: raquis central y foliolos angostos, colgantes."""
    cx = ox + W / 2
    rach_b, rach_t, leaf_b, leaf_t = cols
    tb.leaf(cx, oy + 0.004, math.pi / 2, Hh * 0.985, 0.016 * W / 0.5, 'taper', z=1.0, cb=rach_b, ct=rach_t,
            vein=0, edge=0.4, nt=6, ns=1)
    room = W / 2 - 0.012
    for i in range(n):
        t = 0.035 + 0.95 * i / (n - 1)
        y = oy + t * Hh * 0.975
        for side in (-1, 1):
            a = math.radians(48 + 18 * t + rng.uniform(-5, 5))
            size = (0.5 + 0.5 * math.sin(math.pi * min(1.0, 0.18 + t * 0.95)) ** 0.7) * (1 - 0.25 * t)
            Ln = min(room / math.sin(a), 0.36 * Hh) * size * rng.uniform(0.9, 1.0)
            ang = math.pi / 2 - side * a
            z = 0.3 + rng.random() * 0.5
            cb = L.jitter(leaf_b, rng, 0.1)
            ct = L.jitter(leaf_t, rng, 0.12, 0.05)
            if dry and rng.random() < 0.35:
                ct = L.jitter(H('#9a7a45'), rng, 0.15)
            tb.leaf(cx + side * 0.004, y, ang, Ln, Ln * rng.uniform(0.085, 0.11), 'lance', z=z, cb=cb, ct=ct,
                    vein=0.7, shade=0.55 + 0.45 * (z - 0.3) / 0.5, nv=3, bend=side * rng.uniform(0.02, 0.08),
                    nt=8, ns=1, edge=0.8)


def fruit_cluster(tb, rng, ox, oy, W, Hh):
    """Infructescencia de la palma de sierra: ramitas anaranjadas con frutos morados casi negros."""
    top = Vector((ox + W / 2, oy + Hh - 0.01))
    tb.leaf(top.x, top.y, -math.pi / 2, Hh * 0.3, 0.018, 'taper', z=0.5, cb=H('#b8742e'), ct=H('#c98a3a'), vein=0,
            nt=4, ns=1)
    n = 15
    for k in range(n):
        a = -math.pi / 2 + (k / (n - 1) - 0.5) * 1.9 + rng.uniform(-0.08, 0.08)
        sy = top.y - Hh * (0.12 + 0.18 * rng.random())
        Ln = Hh * rng.uniform(0.5, 0.68)
        bend = rng.uniform(-0.12, 0.12)
        tb.leaf(top.x, sy, a, Ln, 0.006, 'taper', z=0.6, cb=H('#c27b30'), ct=H('#d89a48'), vein=0, bend=bend, nt=8,
                ns=1)
        d = Vector((math.cos(a), math.sin(a)))
        p = Vector((-d.y, d.x))
        for j in range(16):
            tt = 0.25 + 0.75 * j / 15 + rng.uniform(-0.02, 0.02)
            c = Vector((top.x, sy)) + d * (tt * Ln) + p * (bend * Ln * tt * tt)
            r = 0.016 * rng.uniform(0.8, 1.15)
            ripe = rng.random()
            cbf = H('#2a1530') if ripe > 0.25 else H('#5b3a5a')
            if ripe < 0.08:
                cbf = H('#6f8a3a')
            off = p * rng.uniform(-0.012, 0.012)
            tb.leaf(c.x + off.x, c.y + off.y - r / 2, math.pi / 2, r, r * 0.95, 'disc', z=0.8 + rng.random() * 0.1,
                    cb=L.jitter(cbf, rng, 0.15), ct=L.lerp3(cbf, (0.25, 0.2, 0.3), 0.35), vein=0, edge=1.0, nt=6,
                    ns=3, shade=0.85)


def palm_texture():
    sc = capture_scene(1.0, 1.0, 1024, 1024)
    tb = TB()
    rng = random.Random(11)
    i0 = tb.mark()
    frond_palm(tb, rng, 0.0, 0.0, 0.5, 1.0, (H('#c4c46a'), H('#9fb150'), H('#2f6b2a'), H('#78ad3e')))
    tb.fit(i0, 0.0, 0.0, 0.5, 1.0, 'bottom', 0.004)
    i0 = tb.mark()
    frond_palm(tb, rng, 0.5, 0.0, 0.5, 0.5, (H('#a88a52'), H('#9b7e48'), H('#7a6a3a'), H('#a58a4e')), n=20, dry=True)
    tb.fit(i0, 0.5, 0.0, 1.0, 0.5, 'bottom', 0.004)
    i0 = tb.mark()
    fruit_cluster(tb, rng, 0.5, 0.5, 0.5, 0.5)
    tb.fit(i0, 0.5, 0.5, 1.0, 1.0, 'top')
    tb.build([leaf_material()])
    save_leaf('hoja_palma_sierra', sc)


def palmate_leaf(tb, rng, cx, cy, R, top=True, mirror=False, lobes=10, seed=3):
    r2 = random.Random(seed)
    base_ang = r2.uniform(0, TAU)
    web = H('#2a5a25') if top else H('#aebfa6')
    tb.leaf(cx, cy - R * 0.4, math.pi / 2, R * 0.8, R * 0.8, 'disc', z=0.1, cb=web, ct=web, vein=0, edge=0.2, nt=10,
            ns=5, shade=0.9)
    geo = [(base_ang + TAU * k / lobes + r2.uniform(-0.06, 0.06), R * r2.uniform(0.82, 1.0), R * r2.uniform(0.44, 0.52),
            r2.uniform(-0.04, 0.04), r2.random()) for k in range(lobes)]
    for k, (a, Ln, Wl, bnd, shd) in enumerate(geo):
        if mirror:
            a, bnd = math.pi - a, -bnd
        if top:
            cb, ct, vein = H('#2c5f27'), H('#4f8f38'), 1.0
            cb, ct = L.jitter(cb, rng, 0.08), L.jitter(ct, rng, 0.1, 0.04)
        else:
            cb, ct, vein = H('#9cb296'), H('#d9e4cf'), 1.0
            cb, ct = L.jitter(cb, rng, 0.05), L.jitter(ct, rng, 0.04)
        tb.leaf(cx, cy, a, Ln, Wl, 'lobe', z=0.3 + 0.04 * k, cb=cb, ct=ct, vein=vein, shade=0.85 + 0.15 * shd,
                nv=7, nt=12, ns=3, edge=1.0, bend=bnd, vang=35)
    cc = H('#9db86a') if top else H('#e9ece2')
    tb.leaf(cx, cy - R * 0.07, math.pi / 2, R * 0.14, R * 0.14, 'disc', z=1.0, cb=cc, ct=cc, vein=0, edge=0.5, nt=4,
            ns=2)


def yagrumo_texture():
    sc = capture_scene(1.0, 1.0, 1024, 1024)
    tb = TB()
    rng = random.Random(5)
    palmate_leaf(tb, rng, 0.25, 0.75, 0.235, True, False)
    palmate_leaf(tb, rng, 0.75, 0.75, 0.235, False, True)
    # amentos (espigas en forma de dedos) y franja para pecíolos
    for k in range(6):
        a = -math.pi / 2 + (k - 2.5) * 0.2
        tb.leaf(0.25, 0.47, a, 0.36 * rng.uniform(0.85, 1.0), 0.026, 'strap', z=0.5 + k * 0.01,
                cb=H('#8e9a52'), ct=H('#c2bf74'), vein=0, edge=0.9, nt=8, ns=2, bend=rng.uniform(-0.05, 0.05))
    tb.leaf(0.25, 0.47, math.pi / 2, 0.03, 0.05, 'disc', z=0.9, cb=H('#7d8a48'), vein=0)
    tb.leaf(0.75, 0.0, math.pi / 2, 0.5, 0.5, 'line', z=0.1, cb=H('#9a8a5a'), ct=H('#7f9a4a'), vein=0, edge=0.3)
    tb.build([leaf_material()])
    save_leaf('hoja_yagrumo', sc)


def compound_pinnate(tb, rng, x, y, ang, Ln, nl, lw, cols, z0, rach=True, prof='acum'):
    d = Vector((math.cos(ang), math.sin(ang)))
    p = Vector((-d.y, d.x))
    if rach:
        tb.leaf(x, y, ang, Ln, 0.006, 'taper', z=z0 + 0.05, cb=H('#6f7a3a'), vein=0, nt=3, ns=1)
    pairs = (nl - 1) // 2
    for k in range(pairs):
        t = 0.3 + 0.62 * k / max(1, pairs - 1) if pairs > 1 else 0.6
        c = Vector((x, y)) + d * (t * Ln)
        for sd in (-1, 1):
            a = ang + sd * math.radians(rng.uniform(52, 68))
            ll = lw[0] * rng.uniform(0.85, 1.05) * (0.85 + 0.15 * t)
            cb, ct = L.jitter(cols[0], rng, 0.12, 0.04), L.jitter(cols[1], rng, 0.12, 0.04)
            tb.leaf(c.x, c.y, a, ll, ll * lw[1], prof, z=z0 + rng.random() * 0.02, cb=cb, ct=ct, vein=0.9, shade=z0,
                    nv=8, nt=8, ns=2, bend=sd * rng.uniform(0.0, 0.08))
    e = Vector((x, y)) + d * Ln
    ll = lw[0] * 1.05
    tb.leaf(e.x, e.y, ang, ll, ll * lw[1], prof, z=z0 + 0.03, cb=L.jitter(cols[0], rng, 0.1), ct=L.jitter(cols[1], rng, 0.1),
            vein=0.9, shade=z0, nv=8, nt=8, ns=2)


def tabonuco_texture():
    sc = capture_scene(1.0, 0.5, 1024, 512)
    tb = TB()
    for v, (ox, light) in enumerate(((0.0, False), (0.5, True))):
        rng = random.Random(21 + v)
        i0 = tb.mark()
        cx, cy = ox + 0.25, 0.25
        cols = (H('#2f6a2c'), H('#6ea443')) if not light else (H('#3f7d33'), H('#9cc456'))
        n = 22
        for k in range(n):
            z0 = 0.35 + 0.65 * rng.random()
            a = TAU * k / n * 2 + rng.uniform(-0.2, 0.2)
            r0 = 0.07 * rng.random() if k < 11 else 0.02
            Ln = rng.uniform(0.11, 0.135) if k < 11 else rng.uniform(0.08, 0.1)
            x, y = cx + math.cos(a) * r0, cy + math.sin(a) * r0
            colk = cols if rng.random() > 0.12 else (H('#5f6e2c'), H('#a7a050'))
            compound_pinnate(tb, rng, x, y, a, Ln, rng.choice((5, 7)), (0.075, 0.42), colk, z0)
        for k in range(7):
            a = rng.uniform(0, TAU)
            compound_pinnate(tb, rng, cx + rng.uniform(-0.04, 0.04), cy + rng.uniform(-0.04, 0.04), a, 0.08, 5,
                             (0.06, 0.42), cols, 1.0)
        tb.fit(i0, ox, 0.0, ox + 0.5, 0.5, 'center')
    tb.build([leaf_material()])
    save_leaf('hoja_tabonuco', sc)


def palmate_compound(tb, rng, x, y, ang, pet, nl, ll, cols, z0, spread=3.6):
    d = Vector((math.cos(ang), math.sin(ang)))
    tb.leaf(x, y, ang, pet, 0.005, 'taper', z=z0, cb=H('#7a8a3e'), vein=0, nt=3, ns=1)
    e = Vector((x, y)) + d * pet
    for k in range(nl):
        a = ang + (k / (nl - 1) - 0.5) * spread + rng.uniform(-0.1, 0.1)
        lk = ll * (1 - 0.35 * abs(k / (nl - 1) - 0.5) * 2) * rng.uniform(0.9, 1.05)
        tb.leaf(e.x, e.y, a, lk, lk * 0.26, 'lance', z=z0 + 0.01 + 0.002 * k, cb=L.jitter(cols[0], rng, 0.1, 0.04),
                ct=L.jitter(cols[1], rng, 0.12, 0.05), vein=0.9, shade=z0, nv=9, nt=8, ns=2,
                bend=rng.uniform(-0.06, 0.06))


def bromeliad_rosette(tb, rng, cx, cy, size, z0=0.5):
    """Bromelia epífita vista de lado (para las ramas de la ceiba)."""
    for k in range(13):
        a = math.pi / 2 + (k / 12 - 0.5) * 2.7 + rng.uniform(-0.08, 0.08)
        Ln = size * rng.uniform(0.7, 1.0) * (1 - 0.3 * abs(k / 12 - 0.5))
        tb.leaf(cx, cy, a, Ln, Ln * 0.2, 'strap', z=z0 + rng.random() * 0.1, cb=H('#7a3a2a'), ct=H('#6fa040'),
                vein=0.2, gend=0.45, nt=8, ns=1, bend=(-1 if math.cos(a) > 0 else 1) * -0.18, edge=0.7)
    tb.leaf(cx, cy, math.pi / 2, size * 0.55, size * 0.16, 'oval', z=z0 + 0.2, cb=H('#c4282a'), ct=H('#f05a3a'),
            vein=0, nt=6, ns=2)


def ceiba_texture():
    sc = capture_scene(1.0, 1.0, 1024, 1024)
    tb = TB()
    for v, (ox, oy) in enumerate(((0.0, 0.5), (0.5, 0.5))):
        rng = random.Random(31 + v)
        i0 = tb.mark()
        cx, cy = ox + 0.25, oy + 0.25
        cols = (H('#3c7a31'), H('#86b84a')) if v == 0 else (H('#4c8a36'), H('#a9cf62'))
        for k in range(20):
            z0 = 0.3 + 0.7 * rng.random()
            a = TAU * k / 20 * 2 + rng.uniform(-0.2, 0.2)
            r0 = rng.uniform(0.0, 0.06) if k < 12 else rng.uniform(0.0, 0.02)
            palmate_compound(tb, rng, cx + math.cos(a) * r0, cy + math.sin(a) * r0, a, 0.07, rng.choice((5, 7)),
                             rng.uniform(0.1, 0.125), cols, z0)
        for k in range(6):
            palmate_compound(tb, rng, cx + rng.uniform(-0.03, 0.03), cy + rng.uniform(-0.03, 0.03), rng.uniform(0, TAU),
                             0.02, 6, 0.09, cols, 0.8 + 0.2 * rng.random(), 5.5)
        tb.fit(i0, ox, oy, ox + 0.5, oy + 0.5, 'center')
    rng = random.Random(39)
    i0 = tb.mark()
    bromeliad_rosette(tb, rng, 0.25, 0.06, 0.36)
    tb.fit(i0, 0.0, 0.0, 0.5, 0.5, 'bottom')
    # liana colgante con hojitas acorazonadas
    for s in range(2):
        x0 = 0.62 + s * 0.22
        pts = [Vector((x0 + 0.02 * math.sin(i * 0.9 + s), 0.49 - i * 0.47 / 10)) for i in range(11)]
        for i in range(10):
            a, b = pts[i], pts[i + 1]
            d = b - a
            tb.leaf(a.x, a.y, math.atan2(d.y, d.x), d.length * 1.05, 0.008, 'line', z=0.3, cb=H('#6a5a32'),
                    ct=H('#5a6a32'), vein=0, nt=1, ns=1)
            sd = 1 if i % 2 else -1
            tb.leaf(a.x, a.y, -math.pi / 2 + sd * 0.9 + rng.uniform(-0.2, 0.2), 0.05, 0.04, 'ovate', z=0.6,
                    cb=L.jitter(H('#3f7a30'), rng, 0.1), ct=H('#7aab45'), vein=0.8, nv=5, nt=6, ns=2)
    tb.build([leaf_material()])
    save_leaf('hoja_ceiba', sc)


def bipinnate(tb, rng, x, y, ang, Ln, npin, nlet, cols, z0, let=0.016):
    d = Vector((math.cos(ang), math.sin(ang)))
    p = Vector((-d.y, d.x))
    tb.leaf(x, y, ang, Ln, 0.004, 'taper', z=z0, cb=H('#6c7c3a'), vein=0, nt=3, ns=1)
    for k in range(npin):
        t = 0.15 + 0.85 * k / (npin - 1)
        c = Vector((x, y)) + d * (t * Ln)
        for sd in (-1, 1):
            a = ang + sd * math.radians(rng.uniform(60, 80))
            pl = Ln * 0.3 * (1 - 0.45 * t)
            dd = Vector((math.cos(a), math.sin(a)))
            pp = Vector((-dd.y, dd.x))
            tb.leaf(c.x, c.y, a, pl, 0.0025, 'line', z=z0 + 0.002, cb=H('#6c7c3a'), vein=0, nt=1, ns=1)
            for j in range(nlet):
                tj = (j + 0.6) / (nlet + 0.2)
                q = c + dd * (tj * pl)
                for s2 in (-1, 1):
                    b = a + s2 * math.radians(75)
                    tb.leaf(q.x, q.y, b, let, let * 0.45, 'oval', z=z0 + 0.004 + rng.random() * 0.003,
                            cb=L.jitter(cols[0], rng, 0.12), ct=L.jitter(cols[1], rng, 0.12), vein=0, shade=z0,
                            nt=4, ns=1, edge=0.6)


def flower(tb, rng, x, y, R, z, orange=False):
    rot = rng.uniform(0, TAU)
    red = H('#e23a22') if not orange else H('#f2622a')
    red2 = H('#f5643a') if not orange else H('#ff8a3a')
    for k in range(5):
        a = rot + TAU * k / 5 + rng.uniform(-0.12, 0.12)
        if k == 0:  # estandarte: pétalo blanco-amarillo con base roja
            tb.leaf(x, y, a, R * 1.05, R * 0.75, 'spoon', z=z + 0.004, cb=H('#d8442a'), ct=H('#f7ecc4'), gend=0.55,
                    vein=0.3, nv=6, nt=6, ns=2, edge=0.6)
        else:
            tb.leaf(x, y, a, R * rng.uniform(0.95, 1.1), R * 0.95, 'spoon', z=z + 0.001 * k, cb=L.jitter(red, rng, 0.08),
                    ct=L.jitter(red2, rng, 0.08), vein=0.35, nv=6, nt=6, ns=2, edge=0.8, shade=0.9)
    for k in range(7):  # estambres
        a = rot + math.pi + rng.uniform(-0.5, 0.5)
        tb.leaf(x, y, a, R * rng.uniform(0.7, 1.0), R * 0.06, 'line', z=z + 0.01, cb=H('#b8221a'), vein=0, nt=2, ns=1,
                bend=rng.uniform(-0.2, 0.2))


def flamboyan_texture():
    sc = capture_scene(1.0, 1.0, 1024, 1024)
    tb = TB()
    for v, (ox, oy) in enumerate(((0.0, 0.5), (0.5, 0.5))):
        rng = random.Random(41 + v)
        i0 = tb.mark()
        cx, cy = ox + 0.25, oy + 0.25
        for k in range(6):  # follaje plumoso detrás de las flores
            a = TAU * k / 6 + rng.uniform(-0.3, 0.3)
            bipinnate(tb, rng, cx, cy, a, 0.2, 7, 7, (H('#3a7a2e'), H('#78ad48')), 0.1 + 0.2 * rng.random(), 0.014)
        n = 26
        for k in range(n):
            r = 0.17 * math.sqrt(rng.random())
            a = rng.uniform(0, TAU)
            flower(tb, rng, cx + math.cos(a) * r, cy + math.sin(a) * r, rng.uniform(0.032, 0.042),
                   0.4 + 0.5 * rng.random(), orange=(v == 1 and rng.random() < 0.6))
        for k in range(10):  # botones
            r = 0.2 * math.sqrt(rng.random())
            a = rng.uniform(0, TAU)
            tb.leaf(cx + math.cos(a) * r, cy + math.sin(a) * r, rng.uniform(0, TAU), 0.02, 0.014, 'oval', z=0.95,
                    cb=H('#8a2a1a'), ct=H('#c2402a'), vein=0, nt=4, ns=1)
        tb.fit(i0, ox, oy, ox + 0.5, oy + 0.5, 'center')
    rng = random.Random(45)
    i0 = tb.mark()
    for k in range(12):
        a = TAU * k / 12 + rng.uniform(-0.2, 0.2)
        bipinnate(tb, rng, 0.25 + rng.uniform(-0.03, 0.03), 0.25 + rng.uniform(-0.03, 0.03), a, 0.22 * rng.uniform(0.75, 1.0), 9, 9, (H('#2f6e2a'), H('#7db04a')), 0.3 + 0.6 * rng.random(), 0.013)
    tb.fit(i0, 0.0, 0.0, 0.5, 0.5, 'center')
    for k in range(3):  # vainas (semillas)
        x = 0.58 + k * 0.14
        tb.leaf(x, 0.47, -math.pi / 2 + rng.uniform(-0.05, 0.05), 0.44, 0.065, 'pod', z=0.5, cb=H('#4a2c1a'),
                ct=H('#5e3a22'), vein=0, edge=1.0, nt=12, ns=3, bend=rng.uniform(-0.12, 0.12))
    tb.build([leaf_material()])
    save_leaf('hoja_flamboyan', sc)


def fern_frond(tb, rng, ox, oy, W, Hh, cols, npin=26, nlet=13, z0=0.5, tree=True):
    cx = ox + W / 2
    tb.leaf(cx, oy + 0.004, math.pi / 2, Hh * 0.985, 0.012 * W / 0.5, 'taper', z=1.0, cb=H('#6b5a32'),
            ct=H('#7a9a3e'), vein=0, nt=6, ns=1)
    room = W / 2 - (0.03 if tree else 0.012)
    for i in range(npin):
        t = 0.03 + 0.95 * i / (npin - 1)
        y = oy + t * Hh * 0.97
        env = math.sin(math.pi * min(1.0, 0.1 + t * 0.92)) ** 0.75 * (1 - 0.3 * t)
        for sd in (-1, 1):
            a = math.radians((72 if tree else 80) - 22 * t + rng.uniform(-3, 3))
            Lp = room / math.sin(a) * env * rng.uniform(0.92, 1.0)
            ang = math.pi / 2 - sd * a
            d = Vector((math.cos(ang), math.sin(ang)))
            zz = z0 + rng.random() * 0.2
            sh = 0.6 + 0.4 * rng.random()
            if tree:
                tb.leaf(cx, y, ang, Lp, 0.004, 'taper', z=zz + 0.05, cb=H('#6d7a3a'), vein=0, nt=2, ns=1)
                n = max(3, int(nlet * env + 1))
                for j in range(n):
                    tj = (j + 0.5) / n
                    q = Vector((cx, y)) + d * (tj * Lp)
                    pl = Lp * 0.21 * (1 - 0.6 * tj) + 0.005
                    for s2 in (-1, 1):
                        b = ang + s2 * math.radians(58)
                        tb.leaf(q.x, q.y, b, pl, pl * 0.55, 'pinnule', z=zz + rng.random() * 0.02,
                                cb=L.jitter(cols[0], rng, 0.1), ct=L.jitter(cols[1], rng, 0.12, 0.04), vein=0.6,
                                nv=2, shade=sh, nt=5, ns=1, edge=0.7)
            else:
                tb.leaf(cx, y, ang, Lp, Lp * 0.3, 'pinnule', z=zz, cb=L.jitter(cols[0], rng, 0.1),
                        ct=L.jitter(cols[1], rng, 0.12, 0.04), vein=0.8, nv=6, shade=sh, nt=6, ns=2, edge=0.8,
                        bend=sd * 0.12)


def helecho_arboreo_texture():
    sc = capture_scene(0.5, 1.0, 1024, 2048)
    tb = TB()
    fern_frond(tb, random.Random(51), 0.0, 0.0, 0.5, 1.0, (H('#3c7f2c'), H('#8cc24a')), 30, 12)
    tb.fit(0, 0.0, 0.0, 0.5, 1.0, 'bottom', 0.004)
    tb.build([leaf_material()])
    save_leaf('hoja_helecho_arboreo', sc)


def helecho_suelo_texture():
    sc = capture_scene(1.0, 1.0, 1024, 1024)
    tb = TB()
    fern_frond(tb, random.Random(61), 0.0, 0.0, 0.5, 1.0, (H('#2f6e28'), H('#78b044')), 34, 0, tree=False)
    tb.fit(0, 0.0, 0.0, 0.5, 1.0, 'bottom', 0.006)
    i0 = tb.mark()
    fern_frond(tb, random.Random(62), 0.5, 0.0, 0.5, 1.0, (H('#3f7d2c'), H('#a2c552')), 30, 0, tree=False)
    tb.fit(i0, 0.5, 0.0, 1.0, 1.0, 'bottom', 0.006)
    tb.build([leaf_material(noise_scale=30)])
    save_leaf('hoja_helecho_suelo', sc)


def pasto_texture():
    sc = capture_scene(1.0, 1.0, 1024, 1024)
    tb = TB()
    rng = random.Random(71)
    for k in range(70):
        x = 0.5 + rng.gauss(0, 0.07)
        a = math.pi / 2 + rng.gauss(0, 0.42)
        Ln = rng.uniform(0.45, 0.95) * (1 - 0.35 * abs(a - math.pi / 2))
        z = rng.random()
        ct = H('#8fc246') if rng.random() > 0.07 else H('#c9b46a')
        tb.leaf(x, 0.0, a, Ln, rng.uniform(0.022, 0.032), 'blade', z=z, cb=H('#1f4f1c'), ct=L.jitter(ct, rng, 0.12),
                vein=0.4, shade=0.4 + 0.6 * z, gend=0.9, nv=1, nt=10, ns=1,
                bend=(1 if a < math.pi / 2 else -1) * rng.uniform(0.0, 0.18), edge=0.5)
    for k in range(5):  # espigas
        x = 0.5 + rng.gauss(0, 0.05)
        a = math.pi / 2 + rng.gauss(0, 0.25)
        Ln = rng.uniform(0.8, 0.97)
        tb.leaf(x, 0.0, a, Ln, 0.006, 'line', z=1.0, cb=H('#6f8a3a'), ct=H('#a89a5a'), vein=0, nt=6, ns=1,
                bend=rng.uniform(-0.05, 0.05))
        d = Vector((math.cos(a), math.sin(a)))
        for j in range(9):
            q = Vector((x, 0.0)) + d * (Ln * (0.72 + 0.03 * j))
            tb.leaf(q.x, q.y, a + rng.choice((-1, 1)) * 0.5, 0.035, 0.012, 'oval', z=1.0, cb=H('#a08a52'),
                    ct=H('#d2c08a'), vein=0, nt=3, ns=1)
    tb.fit(0, 0.0, 0.0, 1.0, 1.0, 'bottom', 0.004)
    tb.build([leaf_material(noise_scale=30)])
    save_leaf('hoja_pasto', sc)


def bamboo_texture():
    sc = capture_scene(1.0, 1.0, 1024, 1024)
    tb = TB()
    rng = random.Random(81)
    for s in range(7):
        a0 = -math.pi / 2 + (s - 3) * 0.3 + rng.uniform(-0.1, 0.1)
        Ln = rng.uniform(0.62, 0.8)
        bend = rng.uniform(-0.15, 0.15)
        tb.leaf(0.5, 0.99, a0, Ln, 0.006, 'taper', z=0.2, cb=H('#7a8a3a'), vein=0, nt=6, ns=1, bend=bend)
        d = Vector((math.cos(a0), math.sin(a0)))
        p = Vector((-d.y, d.x))
        for j in range(10):
            t = 0.15 + 0.85 * j / 9
            c = Vector((0.5, 0.99)) + d * (t * Ln) + p * (bend * Ln * t * t)
            sd = 1 if j % 2 else -1
            a = a0 + sd * rng.uniform(0.3, 0.65)
            ll = rng.uniform(0.2, 0.28)
            old = rng.random() < 0.1
            tb.leaf(c.x, c.y, a, ll, ll * 0.2, 'lance', z=0.3 + rng.random() * 0.7,
                    cb=H('#4c8c32') if not old else H('#8a8a3a'), ct=L.jitter(H('#b0d35c') if not old else H('#c9b060'), rng, 0.1),
                    vein=0.7, nv=1, shade=0.5 + 0.5 * rng.random(), nt=8, ns=1, bend=sd * rng.uniform(0.05, 0.15))
    tb.fit(0, 0.0, 0.0, 1.0, 1.0, 'top', 0.006)
    tb.build([leaf_material()])
    save_leaf('hoja_bambu', sc)


def heliconia_texture():
    sc = capture_scene(0.5, 1.0, 1024, 2048)
    tb = TB()
    rng = random.Random(91)
    # hoja grande tipo remo (mitad izquierda del atlas: x 0..0.34)
    tb.leaf(0.17, 0.006, math.pi / 2, 0.988, 0.32, 'paddle', z=0.2, cb=H('#3a7a30'), ct=H('#62a03e'), vein=1.0,
            nv=26, nt=24, ns=4, edge=0.8, vang=24)
    for k in range(5):  # rasgaduras del viento
        t = rng.uniform(0.25, 0.85)
        sd = rng.choice((-1, 1))
        y = 0.006 + t * 0.988
        ang = -math.radians(24) if sd < 0 else math.radians(204)
        tb.leaf(0.17 + sd * 0.175, y, ang, rng.uniform(0.07, 0.13), 0.007, 'taper', z=0.9, m=1, nt=2, ns=1)
    # bráctea: rojo con labio amarillo y quilla verde (x 0.36..0.5, y 0..0.5)
    tb.leaf(0.43, 0.0, math.pi / 2, 0.5, 0.13, 'line', z=0.2, cb=H('#c51f1c'), ct=H('#e8392a'), vein=0, edge=0.5,
            nt=8, ns=2)
    tb.leaf(0.43, 0.36, math.pi / 2, 0.14, 0.13, 'line', z=0.3, cb=H('#f4b82a'), ct=H('#ffd84a'), vein=0, edge=0.2,
            gend=0.5, nt=2, ns=2)
    tb.leaf(0.43, 0.38, math.pi / 2, 0.12, 0.012, 'line', z=0.4, cb=H('#6c9a38'), ct=H('#9cbf4a'), vein=0, nt=2, ns=1)
    # tallo (x 0.36..0.5, y 0.5..1)
    tb.leaf(0.43, 0.5, math.pi / 2, 0.5, 0.13, 'line', z=0.2, cb=H('#4f7a2e'), ct=H('#7da040'), vein=0, edge=0.6,
            nt=4, ns=2)
    tb.build([leaf_material(), holdout_material()])
    save_leaf('hoja_heliconia', sc)


def bromelia_texture():
    sc = capture_scene(1.0, 1.0, 1024, 1024)
    tb = TB()
    rng = random.Random(101)
    # hoja en cinta (x 0..0.5): base vino → verde, punta aguda
    tb.leaf(0.25, 0.005, math.pi / 2, 0.99, 0.42, 'strap', z=0.2, cb=H('#7a2a2a'), ct=H('#5c9a3a'), gend=0.42,
            vein=0.25, nv=1, nt=14, ns=3, edge=0.9)
    for k in range(7):  # rayitas longitudinales
        x = 0.25 + (k - 3) * 0.045
        tb.leaf(x, 0.05, math.pi / 2, 0.75 - abs(k - 3) * 0.08, 0.004, 'taper', z=0.3, cb=H('#4f7a30'), ct=H('#6f9f42'),
                vein=0, nt=2, ns=1)
    # espiga roja con flores amarillas (x 0.5..1)
    for j in range(9):
        y = 0.05 + j * 0.1
        for sd in (-1, 1):
            tb.leaf(0.75, y, math.pi / 2 + sd * 0.55, 0.17 - j * 0.008, 0.11, 'bract', z=0.3 + j * 0.02,
                    cb=H('#b51e22'), ct=H('#ef4a35'), vein=0.3, nv=3, nt=6, ns=2, edge=0.8)
        if j % 2:
            tb.leaf(0.75 + rng.uniform(-0.03, 0.03), y + 0.04, math.pi / 2, 0.06, 0.03, 'oval', z=0.8, cb=H('#f2c230'),
                    ct=H('#fff07a'), vein=0, nt=4, ns=1)
    tb.leaf(0.75, 0.0, math.pi / 2, 0.98, 0.05, 'taper', z=0.25, cb=H('#9a2020'), ct=H('#c83028'), vein=0, nt=4, ns=1)
    tb.build([leaf_material()])
    save_leaf('hoja_bromelia', sc)


LITTER = ['#6b4428', '#8a5a32', '#a67a3e', '#c09040', '#4a3020', '#7a5030', '#b5843e', '#5d3a24']


def litter_leaf(tb, rng, x, y, z, scale=1.0, wrap=False, green=0.06, silver=0.12, sat=1.0, shade=None):
    shade = z if shade is None else shade
    r = rng.random()
    a = rng.uniform(0, TAU)
    if r < silver:  # hoja seca de yagrumo: lóbulos enrollados, plateado-canela
        nl = rng.randint(3, 5)
        sp_ = rng.uniform(1.2, 2.0)
        for k in range(nl):
            b = a + (k / (nl - 1) - 0.5) * sp_
            Ln = 0.075 * scale * rng.uniform(0.8, 1.0)
            tb.leaf(x, y, b, Ln, Ln * 0.38, 'lobe', z=z + k * 0.0004, cb=H('#6e6250'),
                    ct=L.jitter(H('#9e9784'), rng, 0.08), vein=0.6, nv=4, nt=6, ns=2, curl=0.8, shade=shade, wrap=wrap)
        return
    if r < silver + green:
        cb, ct = H('#4f6a2a'), H('#7f9a3e')
    else:
        cb = L.jitter(H(rng.choice(LITTER)), rng, 0.12, 0.05)
        ct = L.jitter(H(rng.choice(LITTER)), rng, 0.15, 0.05)
    if sat != 1.0:
        g = lambda c: tuple(sum(c) / 3 + (ci - sum(c) / 3) * sat for ci in c)  # noqa
        cb, ct = g(cb), g(ct)
    shape = rng.choice(('lance', 'ovate', 'acum', 'oval'))
    Ln = rng.uniform(0.06, 0.11) * scale
    tb.leaf(x, y, a, Ln, Ln * rng.uniform(0.35, 0.55), shape, z=z, cb=cb, ct=ct, vein=0.7, nv=7, nt=8, ns=2,
            curl=rng.uniform(0.2, 0.9), shade=shade, edge=1.0, bend=rng.uniform(-0.12, 0.12), wrap=wrap)


def hojarasca_texture():
    sc = capture_scene(1.0, 1.0, 1024, 1024)
    tb = TB()
    rng = random.Random(111)
    for k in range(150):
        a = rng.uniform(0, TAU)
        rr = 0.4 * math.sqrt(rng.random()) * (0.8 + 0.2 * math.sin(3 * a + 1))
        litter_leaf(tb, rng, 0.5 + math.cos(a) * rr, 0.5 + math.sin(a) * rr, k / 150, scale=1.5, silver=0.1)
    for k in range(6):
        tb.leaf(rng.uniform(0.25, 0.7), rng.uniform(0.25, 0.7), rng.uniform(0, TAU), rng.uniform(0.15, 0.3), 0.012,
                'taper', z=rng.random(), cb=H('#4a3424'), ct=H('#6a4a30'), vein=0, nt=3, ns=1, edge=0.5)
    tb.fit(0, 0.0, 0.0, 1.0, 1.0, 'center', 0.01)
    tb.build([leaf_material(hk=1.0)])
    save_leaf('hoja_hojarasca', sc)


# ───────────────────────── suelos tileables (1024) ─────────────────────────
def soil_fn(t, uv):
    v, w = t.torus(uv, 1.0, 1.0)
    n1 = t.noise(v, w, 2.2, 5, 0.6)
    n2 = t.noise(v, t.add(w, 7.0), 9.0, 3, 0.5)
    cr = t.voronoi(v, t.add(w, 3.0), 30.0)
    crumbs = t.sub(1.0, t.ramp(cr, 0.05, 0.16))
    c = t.mix(L.hexl('#2c1e15'), L.hexl('#5a3e2a'), t.ramp(n1, 0.35, 0.68))
    c = t.mix(c, L.hexl('#7a5a3e'), t.mul(crumbs, t.ramp(n2, 0.45, 0.7)))
    h = t.add(t.mul(n1, 0.25), t.mul(crumbs, 0.12))
    return c, h


def suelo_tierra_hojarasca():
    sc = capture_scene(1.0, 1.0, 1024, 1024, samples=12)
    tb = TB()
    rng = random.Random(121)
    N = 300
    for k in range(N):
        litter_leaf(tb, rng, rng.random(), rng.random(), 0.012 + 0.02 * k / N, scale=0.9, wrap=True,
                    green=0.05, silver=0.06, sat=0.85, shade=0.25 + 0.75 * k / N)
    for k in range(18):
        x, y = rng.random(), rng.random()
        tb.leaf(x, y, rng.uniform(0, TAU), rng.uniform(0.08, 0.2), rng.uniform(0.006, 0.012), 'taper',
                z=0.034, cb=H('#3e2a1c'), ct=H('#5a4030'), vein=0, nt=3, ns=1, curl=0.5, wrap=True)
    tb.build([leaf_material(hk=1.0, noise_scale=80)])
    plane(mat=proc_material('soil', soil_fn, 0.03))
    save_tileable('suelo_tierra_hojarasca', sc, 5.0)


def moss_fn(t, uv):
    v, w = t.torus(uv, 1.0, 1.0)
    big = t.noise(v, t.add(w, 13.0), 1.4, 3, 0.5)
    clump = t.noise(v, w, 3.2, 6, 0.62, dist=0.3)
    cell = t.voronoi(v, t.add(w, 2.0), 2.6, 'F1')
    bump = t.sub(1.0, t.math('POWER', t.math('MINIMUM', t.mul(cell, 1.2), 1.0), 1.4))
    fine = t.noise(v, t.add(w, 5.0), 120.0, 8, 0.75)
    sprig = t.ramp(t.noise(v, t.add(w, 9.0), 55.0, 6, 0.7), 0.5, 0.72)
    h = t.add(t.add(t.mul(t.ramp(clump, 0.3, 0.75), 0.45), t.mul(bump, 0.25)), t.add(t.mul(fine, 0.18), t.mul(sprig, 0.12)))
    c = t.mix(L.hexl('#2a5219'), L.hexl('#4b8a2b'), t.ramp(h, 0.25, 0.55))
    c = t.mix(c, L.hexl('#94c246'), t.ramp(h, 0.55, 0.85))
    c = t.mix(c, t.vmul(c, L.hexl('#fff0a0')), t.mul(t.ramp(big, 0.48, 0.66), 0.55))
    c = t.vscale(c, t.add(0.9, t.mul(sprig, 0.2)))
    spor = t.sub(1.0, t.ramp(t.voronoi(v, t.add(w, 21.0), 70.0), 0.0, 0.06))
    c = t.mix(c, L.hexl('#b06a35'), t.mul(spor, t.mul(t.ramp(big, 0.35, 0.45), 0.8)))
    return c, h


def suelo_musgo():
    sc = capture_scene(1.0, 1.0, 1024, 1024, samples=4)
    plane(mat=proc_material('moss', moss_fn, 1.0))
    save_tileable('suelo_musgo', sc, 6.0)


def rock_fn(t, uv):
    v, w = t.torus(uv, 1.0, 1.0)
    d = t.voronoi(v, w, 0.55, 'DISTANCE_TO_EDGE')
    sc_, _, _ = t.sep(t.voronoi(v, w, 0.55, 'F1', out='Color'))
    d2 = t.voronoi(v, t.add(w, 4.0), 2.2, 'DISTANCE_TO_EDGE')
    n1 = t.noise(v, t.add(w, 1.0), 3.0, 5, 0.6)
    n2 = t.noise(v, t.add(w, 2.0), 40.0, 4, 0.6)
    warm = t.noise(v, t.add(w, 8.0), 1.2, 2, 0.5)
    crack = t.sub(1.0, t.ramp(d, 0.0, 0.03))
    crack2 = t.mul(t.mul(t.sub(1.0, t.ramp(d2, 0.0, 0.015)), t.ramp(n1, 0.45, 0.6)), 0.6)
    slab = t.ramp(d, 0.0, 0.25)
    c = t.mix(L.hexl('#6c6963'), L.hexl('#a39e93'), t.ramp(n1, 0.3, 0.7))
    c = t.mix(c, t.vmul(c, L.hexl('#ffe2c0')), t.ramp(warm, 0.45, 0.65))
    c = t.vscale(c, t.add(0.9, t.mul(n2, 0.2)))
    lich = t.voronoi(v, t.add(w, 6.0), 14.0)
    lmask = t.mul(t.sub(1.0, t.ramp(lich, 0.12, 0.22)), t.ramp(n1, 0.5, 0.6))
    c = t.mix(c, L.hexl('#c8cca2'), t.mul(lmask, 0.85))
    c = t.mix(c, L.hexl('#4a7a2c'), t.mul(t.sub(1.0, t.ramp(d, 0.0, 0.06)), t.ramp(warm, 0.55, 0.7)))
    c = t.vscale(c, t.add(0.8, t.add(t.mul(slab, 0.15), t.mul(sc_, 0.18))))
    c = t.vscale(c, t.sub(1.0, t.add(t.mul(crack, 0.42), t.mul(crack2, 0.2))))
    h = t.sub(t.add(t.mul(slab, 0.6), t.mul(n1, 0.35)), t.mul(crack2, 0.1))
    h = t.add(h, t.mul(n2, 0.08))
    return c, h


def suelo_roca():
    sc = capture_scene(1.0, 1.0, 1024, 1024, samples=4)
    plane(mat=proc_material('rock', rock_fn, 1.0))
    save_tileable('suelo_roca', sc, 6.0)


def sand_fn(t, uv):
    v, w = t.torus(uv, 1.0, 1.0)
    u_, vv, _ = t.sep(uv)
    n1 = t.noise(v, w, 2.5, 4, 0.55)
    grain = t.noise(v, t.add(w, 3.0), 260.0, 2, 0.5)
    rip = t.math('SINE', t.add(t.mul(t.add(t.mul(u_, 3.0), t.mul(vv, 7.0)), TAU), t.mul(n1, 4.0)))
    c = t.mix(L.hexl('#a88f66'), L.hexl('#d2bf96'), t.ramp(n1, 0.3, 0.7))
    c = t.vscale(c, t.add(0.9, t.mul(grain, 0.2)))
    c = t.vscale(c, t.add(1.0, t.mul(rip, 0.035)))
    h = t.add(t.mul(t.add(rip, 1.0), 0.04), t.add(t.mul(grain, 0.02), t.mul(n1, 0.06)))
    return c, h


def pebble_material():
    m = bpy.data.materials.new('PEBBLE')
    t = L.NT(m)
    c = t.attr('PC')
    nz = t.noise(t.coord('Object'), None, 300.0, 3, 0.6)
    _, _, gz = t.sep(t.geo('Normal'))
    c = t.vscale(c, t.add(0.86, t.mul(nz, 0.28)))
    c = t.vscale(c, t.add(0.45, t.mul(t.math('POWER', t.math('MAXIMUM', gz, 0.0), 1.4), 0.7)))
    _, _, pz = t.sep(t.geo('Position'))
    h = t.mul(t.add(pz, 0.0), 1.0 / 0.03)
    t.emission_out(t.mix(c, t.comb(h, h, h), mode_value(t)))
    return m


def suelo_arena_rio():
    sc = capture_scene(1.0, 1.0, 1024, 1024, samples=12)
    plane(mat=proc_material('sand', sand_fn, 0.25))
    rng = random.Random(131)
    pal = ['#8c8a85', '#7a7068', '#a39885', '#6a6e70', '#b8a58a', '#c9c4ba', '#8a6a55', '#77706a', '#9a948c']
    V, F, C = [], [], []
    seg, rings = 14, 7
    for k in range(95):
        x, y = rng.random(), rng.random()
        r = rng.uniform(0.008, 0.034) if rng.random() < 0.85 else rng.uniform(0.035, 0.05)
        sx, sy = r, r * rng.uniform(0.6, 0.95)
        sz = min(sx, sy) * rng.uniform(0.35, 0.55)
        rot = rng.uniform(0, TAU)
        col = L.jitter(H(rng.choice(pal)), rng, 0.12)
        zc = sz * rng.uniform(-0.3, 0.1)
        for ox in (-1, 0, 1):
            for oy in (-1, 0, 1):
                if (ox and not (x + ox * 1 > -0.06 and x + ox < 1.06)) or (oy and not (y + oy > -0.06 and y + oy < 1.06)):
                    continue
                base = len(V)
                for i in range(rings + 1):
                    th = math.pi * i / rings - math.pi / 2
                    for j in range(seg):
                        ph = TAU * j / seg
                        lx, ly, lz = math.cos(th) * math.cos(ph) * sx, math.cos(th) * math.sin(ph) * sy, math.sin(th) * sz
                        V.append((x + ox + lx * math.cos(rot) - ly * math.sin(rot),
                                  y + oy + lx * math.sin(rot) + ly * math.cos(rot), zc + lz))
                        C.append((*col, 1.0))
                for i in range(rings):
                    for j in range(seg):
                        a = base + i * seg + j
                        b = base + i * seg + (j + 1) % seg
                        F.append((a, b, b + seg, a + seg))
    me = bpy.data.meshes.new('piedritas')
    me.from_pydata(V, [], F)
    ca = me.color_attributes.new('PC', 'FLOAT_COLOR', 'POINT')
    ca.data.foreach_set('color', [c for cc in C for c in cc])
    me.shade_smooth()
    me.materials.append(pebble_material())
    ob = bpy.data.objects.new('piedritas', me)
    sc.collection.objects.link(ob)
    save_tileable('suelo_arena_rio', sc, 5.0)


# ───────────────────────── cortezas tileables (512) ─────────────────────────
def bark_common(t, uv, base_a, base_b, ru=1.0, rv=1.0, streak=0.12, lichen=0.0):
    v, w = t.torus(uv, ru, rv)
    vs, ws = t.torus(uv, 3.0 * ru, 0.35 * rv, (3, 0, 0, 0))
    n1 = t.noise(v, w, 2.5, 5, 0.6)
    st = t.noise(vs, ws, 4.0, 6, 0.7)
    fine = t.noise(v, t.add(w, 4.0), 45.0, 3, 0.6)
    c = t.mix(L.hexl(base_a), L.hexl(base_b), t.ramp(n1, 0.3, 0.7))
    c = t.vscale(c, t.add(1.0 - streak, t.mul(st, 2 * streak)))
    c = t.vscale(c, t.add(0.93, t.mul(fine, 0.14)))
    h = t.add(t.mul(st, 0.45), t.add(t.mul(n1, 0.35), t.mul(fine, 0.12)))
    if lichen:
        lv = t.voronoi(v, t.add(w, 11.0), 7.0)
        lm = t.mul(t.sub(1.0, t.ramp(lv, 0.1, 0.24)), t.ramp(t.noise(v, t.add(w, 17.0), 3.0, 2, 0.5), 0.45, 0.6))
        c = t.mix(c, L.hexl('#d7dac8'), t.mul(lm, lichen))
        h = t.add(h, t.mul(lm, 0.05))
    return v, w, c, h


def rings(t, uv, n, w, wob, n1):
    _, vv, _ = t.sep(uv)
    f = t.math('FRACT', t.add(t.mul(vv, n), t.mul(t.sub(n1, 0.5), wob)))
    d = t.math('MINIMUM', f, t.sub(1.0, f))
    return t.sub(1.0, t.ramp(d, 0.0, w)), d


def bark_palma(t, uv):
    v, w, c, h = bark_common(t, uv, '#7a766c', '#a19b8d', streak=0.1, lichen=0.6)
    n = t.noise(v, t.add(w, 30.0), 3.0, 2, 0.5)
    r, d = rings(t, uv, 5.0, 0.05, 0.25, n)
    lip = t.mul(t.ramp(d, 0.04, 0.09), t.sub(1.0, t.ramp(d, 0.09, 0.16)))
    c = t.vscale(c, t.sub(1.0, t.mul(r, 0.42)))
    c = t.vscale(c, t.add(1.0, t.mul(lip, 0.12)))
    h = t.sub(t.add(h, t.mul(lip, 0.2)), t.mul(r, 0.5))
    return c, h


def bark_yagrumo(t, uv):
    v, w, c, h = bark_common(t, uv, '#a49d8a', '#c9c3b0', streak=0.06, lichen=0.9)
    n = t.noise(v, t.add(w, 30.0), 3.0, 2, 0.5)
    r, d = rings(t, uv, 3.0, 0.035, 0.12, n)
    band = t.mul(t.ramp(d, 0.03, 0.06), t.sub(1.0, t.ramp(d, 0.06, 0.12)))
    c = t.vscale(c, t.sub(1.0, t.mul(r, 0.35)))
    c = t.mix(c, L.hexl('#d9d3c0'), t.mul(band, 0.6))
    h = t.sub(t.add(h, t.mul(band, 0.25)), t.mul(r, 0.35))
    return c, h


def bark_tabonuco(t, uv):
    v, w, c, h = bark_common(t, uv, '#b9b2a2', '#ddd7c8', streak=0.05, lichen=0.4)
    fl = t.voronoi(v, t.add(w, 40.0), 1.6, 'F1', out='Color')
    fr, _, _ = t.sep(fl)
    pe = t.voronoi(v, t.add(w, 40.0), 1.6, 'DISTANCE_TO_EDGE')
    patch = t.ramp(fr, 0.6, 0.7)
    c = t.mix(c, t.vmul(c, L.hexl('#e0d4c0')), t.mul(patch, 0.45))
    c = t.vscale(c, t.sub(1.0, t.mul(t.sub(1.0, t.ramp(pe, 0.0, 0.02)), t.mul(patch, 0.3))))
    h = t.add(h, t.mul(patch, 0.15))
    return c, h


def bark_ceiba(t, uv):
    v, w, c, h = bark_common(t, uv, '#86887e', '#b3b4a8', streak=0.2, lichen=0.8)
    gn = t.noise(v, t.add(w, 50.0), 1.5, 2, 0.5)
    c = t.mix(c, t.vmul(c, L.hexl('#c8e0b0')), t.mul(t.ramp(gn, 0.5, 0.7), 0.5))
    return c, h


def bark_flamboyan(t, uv):
    v, w, c, h = bark_common(t, uv, '#6b5c4e', '#8f7d6b', streak=0.08, lichen=0.35)
    vl, wl = t.torus(uv, 0.5, 3.0, (0, 0, 5, 0))
    len_ = t.voronoi(vl, wl, 6.0)
    lent = t.sub(1.0, t.ramp(len_, 0.0, 0.12))
    c = t.mix(c, L.hexl('#b5a58c'), t.mul(lent, 0.85))
    h = t.add(h, t.mul(lent, 0.2))
    return c, h


def bark_helecho(t, uv):
    u_, vv, _ = t.sep(uv)
    v, w = t.torus(uv, 1.0, 1.0)
    vs, ws = t.torus(uv, 6.0, 0.3)
    fib = t.noise(vs, ws, 3.0, 8, 0.75)
    n1 = t.noise(v, w, 3.0, 4, 0.6)
    # cicatrices ovaladas en tresbolillo (4 columnas × 4 filas por tile)
    row = t.math('FLOOR', t.mul(vv, 4.0))
    off = t.mul(t.math('MODULO', row, 2.0), 0.5)
    cu = t.sub(t.math('FRACT', t.add(t.mul(u_, 4.0), off)), 0.5)
    cv = t.sub(t.math('FRACT', t.mul(vv, 4.0)), 0.5)
    dist = t.math('SQRT', t.add(t.mul(t.mul(cu, cu), 5.0), t.mul(t.mul(cv, cv), 1.6)))
    dist = t.add(dist, t.mul(t.sub(n1, 0.5), 0.6))
    scar = t.sub(1.0, t.ramp(dist, 0.45, 0.6))
    rim = t.mul(t.mul(t.ramp(dist, 0.38, 0.5), t.sub(1.0, t.ramp(dist, 0.52, 0.7))), 0.6)
    c = t.mix(L.hexl('#2a1d15'), L.hexl('#5a4030'), t.ramp(fib, 0.4, 0.65))
    c = t.mix(c, L.hexl('#7a5a40'), t.mul(rim, 0.8))
    c = t.mix(c, L.hexl('#3e3020'), t.mul(t.sub(scar, t.mul(rim, 1.0)), 0.7))
    hairs = t.ramp(t.noise(vs, t.add(ws, 9.0), 12.0, 4, 0.7), 0.6, 0.75)
    c = t.mix(c, L.hexl('#8a4a2a'), t.mul(hairs, 0.5))
    h = t.add(t.mul(fib, 0.4), t.add(t.mul(rim, 0.4), t.mul(t.sub(1.0, scar), 0.2)))
    return c, h


def bark_bambu(t, uv):
    u_, vv, _ = t.sep(uv)
    v, w = t.torus(uv, 1.0, 1.0)
    vs, ws = t.torus(uv, 5.0, 0.25)
    st = t.noise(vs, ws, 3.0, 5, 0.6)
    n1 = t.noise(v, w, 2.0, 3, 0.5)
    c = t.mix(L.hexl('#6f9a2e'), L.hexl('#a8bf45'), t.ramp(n1, 0.35, 0.7))
    c = t.mix(c, t.vmul(c, L.hexl('#a0d090')), t.mul(t.ramp(st, 0.5, 0.65), 0.6))
    d = t.math('MINIMUM', vv, t.sub(1.0, vv))
    node = t.sub(1.0, t.ramp(d, 0.0, 0.025))
    ridge = t.mul(t.ramp(d, 0.01, 0.03), t.sub(1.0, t.ramp(d, 0.03, 0.06)))
    c = t.mix(c, L.hexl('#c8c27a'), t.mul(ridge, 0.7))
    c = t.vscale(c, t.sub(1.0, t.mul(node, 0.45)))
    spots = t.sub(1.0, t.ramp(t.voronoi(v, t.add(w, 7.0), 9.0), 0.0, 0.08))
    c = t.mix(c, L.hexl('#5a5a2a'), t.mul(spots, t.mul(t.ramp(n1, 0.55, 0.6), 0.5)))
    h = t.add(t.mul(ridge, 0.6), t.sub(t.mul(st, 0.1), t.mul(node, 0.3)))
    return c, h


BARKS = {
    'palma_sierra': (bark_palma, 5.0), 'yagrumo': (bark_yagrumo, 4.0), 'tabonuco': (bark_tabonuco, 3.0),
    'ceiba': (bark_ceiba, 4.0), 'flamboyan': (bark_flamboyan, 4.0), 'helecho_arboreo': (bark_helecho, 6.0),
    'bambu': (bark_bambu, 4.0),
}


def bark_texture(name):
    fn, s = BARKS[name]
    sc = capture_scene(1.0, 1.0, 512, 512, samples=4)
    plane(mat=proc_material('bark', fn, 1.0))
    save_tileable('corteza_' + name, sc, s, q=86, qn=78)


JOBS = {
    'hoja_palma_sierra': palm_texture, 'hoja_yagrumo': yagrumo_texture, 'hoja_tabonuco': tabonuco_texture,
    'hoja_ceiba': ceiba_texture, 'hoja_flamboyan': flamboyan_texture, 'hoja_helecho_arboreo': helecho_arboreo_texture,
    'hoja_helecho_suelo': helecho_suelo_texture, 'hoja_pasto': pasto_texture, 'hoja_bambu': bamboo_texture,
    'hoja_heliconia': heliconia_texture, 'hoja_bromelia': bromelia_texture, 'hoja_hojarasca': hojarasca_texture,
    'suelo_tierra_hojarasca': suelo_tierra_hojarasca, 'suelo_musgo': suelo_musgo, 'suelo_roca': suelo_roca,
    'suelo_arena_rio': suelo_arena_rio,
}
for _b in BARKS:
    JOBS['corteza_' + _b] = (lambda n: (lambda: bark_texture(n)))(_b)


def preview(names):
    """Hoja de vista previa de las texturas (sobre gris) para revisarlas."""
    tiles = []
    for n in names:
        p = os.path.join(L.TEX, n + ('.png' if n.startswith('hoja') else '.jpg'))
        if not os.path.exists(p):
            continue
        a = L.load_px(p)
        h, w = a.shape[:2]
        k = max(1, max(h, w) // 256)
        a = a[::k, ::k]
        bg = np.ones_like(a) * np.array([0.55, 0.6, 0.62, 1.0], np.float32)
        al = a[..., 3:4]
        a = np.dstack([a[..., :3] * al + bg[..., :3] * (1 - al), np.ones(a.shape[:2])])
        tile = np.ones((260, 260, 4), np.float32) * 0.2
        tile[..., 3] = 1
        tile[2:2 + a.shape[0], 2:2 + a.shape[1]] = a[:256, :256]
        tiles.append(tile)
    cols = 6
    rows = (len(tiles) + cols - 1) // cols
    sheet = np.ones((rows * 260, cols * 260, 4), np.float32) * 0.2
    for i, tl in enumerate(tiles):
        r, c = i // cols, i % cols
        sheet[(rows - 1 - r) * 260:(rows - r) * 260, c * 260:(c + 1) * 260] = tl
    L.save_jpg(sheet[..., :3], os.path.join(L.TMP, 'preview_tex.jpg'), 90)


if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    todo = [n for n in JOBS if not argv or any(n.startswith(a) for a in argv)]
    for n in todo:
        print('·', n)
        JOBS[n]()
    L.reset()
    preview(todo)
    print('LISTO', len(todo))
