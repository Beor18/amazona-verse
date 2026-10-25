"""Amazona Verse · kit de entorno · LÁMINA DE CONTACTO (Eevee, luz cálida tropical).

  Blender -b --factory-startup --python tools/blender/entorno_lamina.py            # lámina completa
  Blender -b --factory-startup --python tools/blender/entorno_lamina.py -- tiles ceiba yagrumo   # sólo fichas (revisión)
  Blender -b --factory-startup --python tools/blender/entorno_lamina.py -- hero     # sólo la escena principal

Importa los .glb exportados (así la lámina también verifica la exportación), arma materiales de vista
(textura × AO del color de vértice R, alfa con corte, translucidez en hojas) y compone docs/img/entorno_kit.png.
"""
import bpy, math, os, sys, json, random
import numpy as np
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import entorno_lib as L  # noqa: E402

OUT = os.path.join(L.ROOT, 'docs/img/entorno_kit.png')
FONT_T = '/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf'
FONT_B = '/System/Library/Fonts/Supplemental/Verdana.ttf'
FONT_I = '/System/Library/Fonts/Supplemental/Verdana Italic.ttf'
MAN = json.load(open(os.path.join(L.MODELS, 'entorno_kit.json')))
TREES = ['ceiba', 'tabonuco', 'yagrumo', 'palma_sierra', 'bambu', 'flamboyan', 'helecho_arboreo']
SMALL = ['heliconia', 'bromelia', 'helecho_suelo', 'pasto', 'hojarasca', 'tronco_caido', 'roca_musgo_a', 'roca_musgo_b',
         'piedras_rio']
GROUNDS = [('suelo_tierra_hojarasca', 'Tierra húmeda con hojarasca'), ('suelo_musgo', 'Musgo'), ('suelo_roca', 'Roca'),
           ('suelo_arena_rio', 'Arena de río')]
SUN_COL = L.hexl('#ffd8a0')


# ───────────────────────── escena y luz ─────────────────────────
def base_scene(w, h, transparent=True):
    sc = L.reset()
    sc.render.engine = 'BLENDER_EEVEE_NEXT'
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = w, h, 100
    sc.render.film_transparent = transparent
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    e = sc.eevee
    e.taa_render_samples = 64
    e.use_shadows = True
    e.use_raytracing = True
    e.ray_tracing_options.resolution_scale = '1'
    for k, v in (('fast_gi_distance', 2.0), ('shadow_ray_count', 2), ('shadow_step_count', 8), ('use_gtao', True),
                 ('horizon_quality', 0.8), ('fast_gi_resolution', '2')):
        try:
            setattr(e, k, v)
        except Exception as ex:  # noqa
            print('eevee', k, ex)
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.look = 'AgX - Punchy'
    sc.view_settings.exposure = 0.15
    # cielo: gradiente cálido en el horizonte y azul arriba
    world = bpy.data.worlds.new('cielo')
    sc.world = world
    t = L.NT(world)
    bg = t.new('ShaderNodeBackground')
    vz = t.sep(t.new('ShaderNodeTexCoord').outputs['Generated'])[2]   # dirección del rayo (z: -1..1)
    sky = t.mix(L.hexl('#ffe0b0'), L.hexl('#6aaee0'), t.ramp(vz, 0.0, 0.42))
    sky = t.mix(L.hexl('#7a7a52'), sky, t.ramp(vz, -0.12, 0.0))
    t.put(bg.inputs['Color'], sky)
    bg.inputs['Strength'].default_value = 1.0
    o = t.new('ShaderNodeOutputWorld')
    t.L.new(bg.outputs[0], o.inputs['Surface'])
    sun = bpy.data.lights.new('sol', 'SUN')
    sun.energy = 4.2
    sun.color = SUN_COL
    sun.angle = math.radians(3.5)
    so = bpy.data.objects.new('sol', sun)
    so.rotation_euler = (math.radians(48), 0, math.radians(-112))
    sc.collection.objects.link(so)
    return sc


def camera(sc, loc, target, lens=50, ortho=None):
    cd = bpy.data.cameras.new('cam')
    cd.lens = lens
    cd.clip_start, cd.clip_end = 0.1, 400
    if ortho:
        cd.type = 'ORTHO'
        cd.ortho_scale = ortho
    cam = bpy.data.objects.new('cam', cd)
    cam.location = loc
    d = Vector(target) - Vector(loc)
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    sc.collection.objects.link(cam)
    sc.camera = cam
    return cam


def render(sc, tag):
    path = os.path.join(L.TMP, tag + '.png')
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    a = L.load_px(path)
    return a


# ───────────────────────── materiales de vista ─────────────────────────
def view_material(m, colname):
    nodes = m.node_tree.nodes
    base_img, nrm_img = None, None
    for n in nodes:
        if n.type == 'TEX_IMAGE' and n.image:
            if n.image.colorspace_settings.name == 'Non-Color' or n.image.name.endswith('_n'):
                nrm_img = n.image
            else:
                base_img = n.image
    leaf = m.name.startswith('HOJA_')
    t = L.NT(m)
    out = t.new('ShaderNodeOutputMaterial')
    b = t.new('ShaderNodeBsdfPrincipled')
    tx = t.new('ShaderNodeTexImage')
    tx.image = base_img
    ao = t.attr(colname)
    r, _, _ = t.sep(ao)
    aok = t.add(0.12, t.mul(r, 0.88))
    col = t.vscale(tx.outputs['Color'], aok)
    t.put(b.inputs['Base Color'], col)
    b.inputs['Roughness'].default_value = 0.68 if leaf else 0.9
    b.inputs['Specular IOR Level'].default_value = 0.3 if leaf else 0.15
    if leaf:
        lt = t.math('LESS_THAN', tx.outputs['Alpha'], 0.5)
        t.put(b.inputs['Alpha'], t.math('SUBTRACT', 1.0, lt))
        tr = t.new('ShaderNodeBsdfTranslucent')
        t.put(tr.inputs['Color'], t.vmul(col, (1.15, 1.1, 0.55)))
        mx = t.new('ShaderNodeMixShader')
        mx.inputs[0].default_value = 0.28
        t.L.new(b.outputs[0], mx.inputs[1])
        t.L.new(tr.outputs[0], mx.inputs[2])
        # el alfa del principled no alcanza al translúcido: mezcla con transparente
        tp = t.new('ShaderNodeBsdfTransparent')
        mx2 = t.new('ShaderNodeMixShader')
        t.put(mx2.inputs[0], t.math('SUBTRACT', 1.0, lt))
        t.L.new(tp.outputs[0], mx2.inputs[1])
        t.L.new(mx.outputs[0], mx2.inputs[2])
        t.L.new(mx2.outputs[0], out.inputs['Surface'])
        m.use_transparent_shadow = True
    else:
        t.L.new(b.outputs[0], out.inputs['Surface'])
    if nrm_img:
        nt = t.new('ShaderNodeTexImage')
        nt.image = nrm_img
        nm = t.new('ShaderNodeNormalMap')
        nm.inputs['Strength'].default_value = 1.2
        t.L.new(nt.outputs['Color'], nm.inputs['Color'])
        t.L.new(nm.outputs['Normal'], b.inputs['Normal'])


def import_piece(name, loc=(0, 0, 0), rot=0.0, scale=1.0):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(L.MODELS, name + '.glb'))
    new = [o for o in bpy.data.objects if o not in before]
    done = set()
    for o in new:
        if o.type == 'MESH':
            cn = o.data.color_attributes[0].name if o.data.color_attributes else 'Col'
            for m in o.data.materials:
                if m and m.name not in done:
                    view_material(m, cn)
                    done.add(m.name)
        if o.parent is None:
            o.location = Vector(loc)
            o.rotation_euler = (0, 0, rot)
            o.scale = (scale, scale, scale)
    return new


def ground_material(name, tex, rep=1.0, nstr=1.0):
    m = bpy.data.materials.new(name)
    t = L.NT(m)
    out = t.new('ShaderNodeOutputMaterial')
    b = t.new('ShaderNodeBsdfPrincipled')
    b.inputs['Roughness'].default_value = 0.9
    b.inputs['Specular IOR Level'].default_value = 0.15
    uv = t.vscale(t.coord('Object'), rep)
    tx = t.new('ShaderNodeTexImage')
    tx.image = bpy.data.images.load(os.path.join(L.TEX, tex + '.jpg'), check_existing=True)
    t.put(tx.inputs['Vector'], uv)
    nt = t.new('ShaderNodeTexImage')
    nt.image = bpy.data.images.load(os.path.join(L.TEX, tex + '_n.jpg'), check_existing=True)
    nt.image.colorspace_settings.name = 'Non-Color'
    t.put(nt.inputs['Vector'], uv)
    nm = t.new('ShaderNodeNormalMap')
    nm.inputs['Strength'].default_value = nstr
    t.L.new(nt.outputs['Color'], nm.inputs['Color'])
    t.L.new(nm.outputs['Normal'], b.inputs['Normal'])
    t.L.new(tx.outputs['Color'], b.inputs['Base Color'])
    t.L.new(b.outputs[0], out.inputs['Surface'])
    return m, t, b, tx


def disc(r, mat, z=0.0, seg=64):
    me = bpy.data.meshes.new('disco')
    vs = [(0, 0, z)] + [(math.cos(a) * r, math.sin(a) * r, z) for a in [math.tau * i / seg for i in range(seg)]]
    fs = [(0, i + 1, (i + 1) % seg + 1) for i in range(seg)]
    me.from_pydata(vs, [], fs)
    me.materials.append(mat)
    o = bpy.data.objects.new('disco', me)
    bpy.context.scene.collection.objects.link(o)
    return o


def soft_disc_material(tex, rep):
    """Suelo en disco con borde que se desvanece (alfa) para las fichas."""
    m, t, b, tx = ground_material('suelo_' + tex, tex, rep)
    x, y, _ = t.sep(t.coord('Object'))
    r = t.math('SQRT', t.add(t.mul(x, x), t.mul(y, y)))
    rr = t.new('ShaderNodeValue')
    rr.name = 'R'
    edge = t.sub(1.0, t.ramp(t.math('DIVIDE', r, rr.outputs[0]), 0.72, 1.0))
    tp = t.new('ShaderNodeBsdfTransparent')
    mx = t.new('ShaderNodeMixShader')
    t.put(mx.inputs[0], edge)
    t.L.new(tp.outputs[0], mx.inputs[1])
    t.L.new(b.outputs[0], mx.inputs[2])
    out = [n for n in t.N if n.type == 'OUTPUT_MATERIAL'][0]
    t.L.new(mx.outputs[0], out.inputs['Surface'])
    m.surface_render_method = 'DITHERED'
    return m, rr


# ───────────────────────── texto ─────────────────────────
def text_image(lines, w, h, bg=None):
    """lines: [(texto, fuente, tamaño_px, color_hex, x_px, y_px_baseline)] → RGBA numpy (fila 0 abajo)."""
    sc = L.reset()
    sc.render.engine = 'BLENDER_EEVEE_NEXT'
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'Standard'
    sc.eevee.taa_render_samples = 16
    camera(sc, (w / 2, h / 2, 10), (w / 2, h / 2, 0), ortho=w)
    for i, (txt, font, size, col, x, y) in enumerate(lines):
        cu = bpy.data.curves.new('t%d' % i, 'FONT')
        cu.body = txt
        if os.path.exists(font):
            cu.font = bpy.data.fonts.load(font, check_existing=True)
        cu.size = size
        o = bpy.data.objects.new('t%d' % i, cu)
        o.location = (x, y, 0)
        m = bpy.data.materials.new('tm%d' % i)
        t = L.NT(m)
        t.emission_out(L.hexl(col))
        cu.materials.append(m)
        sc.collection.objects.link(o)
    return render(sc, 'txt')


def over(dst, src, x, y):
    """Pega src (RGBA, recta) sobre dst en (x, y) contando desde ARRIBA-izquierda."""
    H = dst.shape[0]
    h, w = src.shape[:2]
    y0 = H - y - h
    a = src[..., 3:4]
    region = dst[y0:y0 + h, x:x + w]
    region[..., :3] = src[..., :3] * a + region[..., :3] * (1 - a)
    region[..., 3:4] = np.maximum(region[..., 3:4], a)


def vgrad(h, w, top, bot):
    t = np.linspace(0, 1, h)[:, None, None]
    c = np.array(bot)[None, None] * (1 - t) + np.array(top)[None, None] * t
    return np.dstack([np.broadcast_to(c, (h, w, 3)), np.ones((h, w))]).astype(np.float32)


def srgb_hex(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]


# ───────────────────────── fichas ─────────────────────────
GROUND_OF = {'heliconia': 'suelo_tierra_hojarasca', 'bromelia': 'suelo_tierra_hojarasca',
             'helecho_suelo': 'suelo_tierra_hojarasca', 'pasto': 'suelo_tierra_hojarasca',
             'piedras_rio': 'suelo_arena_rio', 'helecho_arboreo': 'suelo_tierra_hojarasca'}


def tile(name, w, h, ground=None):
    ground = ground or GROUND_OF.get(name, 'suelo_musgo')
    sc = base_scene(w, h)
    objs = import_piece(name)
    meshes = [o for o in objs if o.type == 'MESH']
    pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    size = mx - mn
    ctr = (mn + mx) / 2
    R = max(size.x, size.y) * 0.62 + 0.3
    m, rr = soft_disc_material(ground, 1.0 / 1.6)
    rr.outputs[0].default_value = R
    disc(R, m)
    # cámara a 3/4, un poco elevada; encuadre por altura y ancho
    span = max(size.z * 1.2, max(size.x, size.y) * 0.95 * h / w)
    dist = span / (2 * math.tan(math.radians(30) / 2)) * 1.05
    az = math.radians(-28)
    el = math.radians(12 if size.z > 2 else 24)
    tgt = Vector((ctr.x, ctr.y, span * 0.42 if size.z > 2 else size.z * 0.45))
    loc = tgt + Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el))) * dist
    cam = camera(sc, loc, tgt)
    cam.data.sensor_fit = 'VERTICAL'
    cam.data.angle = math.radians(30)
    return render(sc, 'tile_' + name)


def ground_swatch(tex, w, h):
    sc = base_scene(w, h)
    me = bpy.data.meshes.new('p')
    s = 3.0
    me.from_pydata([(-s, -s, 0), (s, -s, 0), (s, s, 0), (-s, s, 0)], [], [(0, 1, 2, 3)])
    m, *_ = ground_material('g', tex, 1 / 2.0, 1.3)
    me.materials.append(m)
    o = bpy.data.objects.new('p', me)
    sc.collection.objects.link(o)
    sc.objects['sol'].rotation_euler = (math.radians(62), 0, math.radians(-70))
    camera(sc, (0, -3.2, 2.2), (0, 0.4, 0), lens=35)
    return render(sc, 'sw_' + tex)


# ───────────────────────── escena principal ─────────────────────────
def hero(w, h):
    """Claro de bosque de El Yunque: río con orillas de arena, la ceiba al fondo, bosque en bruma y la cotorra
    (1.4 m) parada sobre el tronco caído como referencia de escala."""
    sc = base_scene(w, h, transparent=False)
    rx = lambda y: -7.5 - 0.06 * y + 1.6 * math.sin(y * 0.09)  # noqa  centro del río
    def gz(x, y):
        d = abs(x - rx(y))
        return 0.22 * math.sin(x * 0.13) * math.cos(y * 0.09) - 0.55 * max(0.0, 1 - d / 3.4) ** 1.5
    me = bpy.data.meshes.new('terreno')
    N, S, cy = 120, 170.0, 60.0
    vs, fs, wsand = [], [], []
    for j in range(N + 1):
        for i in range(N + 1):
            x, y = (i / N - 0.5) * S, (j / N - 0.5) * S + cy
            vs.append((x, y, gz(x, y)))
            wsand.append(max(0.0, min(1.0, (5.2 - abs(x - rx(y))) / 1.6)))
    for j in range(N):
        for i in range(N):
            a = j * (N + 1) + i
            fs.append((a, a + 1, a + N + 2, a + N + 1))
    me.from_pydata(vs, [], fs)
    ca = me.color_attributes.new('W', 'FLOAT_COLOR', 'POINT')
    ca.data.foreach_set('color', [c for wv in wsand for c in (wv, 0, 0, 1)])
    me.shade_smooth()
    m = bpy.data.materials.new('terreno')
    t = L.NT(m)
    out = t.new('ShaderNodeOutputMaterial')
    b = t.new('ShaderNodeBsdfPrincipled')
    b.inputs['Roughness'].default_value = 0.92
    b.inputs['Specular IOR Level'].default_value = 0.1
    p = t.coord('Object')
    uv = t.vscale(p, 1 / 2.2)
    cols, nrms = [], []
    for tex in ('suelo_musgo', 'suelo_tierra_hojarasca', 'suelo_arena_rio'):
        tx = t.new('ShaderNodeTexImage')
        tx.image = bpy.data.images.load(os.path.join(L.TEX, tex + '.jpg'), check_existing=True)
        t.put(tx.inputs['Vector'], uv)
        nt = t.new('ShaderNodeTexImage')
        nt.image = bpy.data.images.load(os.path.join(L.TEX, tex + '_n.jpg'), check_existing=True)
        nt.image.colorspace_settings.name = 'Non-Color'
        t.put(nt.inputs['Vector'], uv)
        cols.append(tx.outputs['Color'])
        nrms.append(nt.outputs['Color'])
    nz = t.noise(p, None, 0.09, 4, 0.55)
    f_soil = t.ramp(nz, 0.42, 0.56)
    f_sand, _, _ = t.sep(t.attr('W'))
    c = t.mix(t.mix(cols[0], cols[1], f_soil), cols[2], f_sand)
    nn = t.mix(t.mix(nrms[0], nrms[1], f_soil), nrms[2], f_sand)
    nm = t.new('ShaderNodeNormalMap')
    t.put(nm.inputs['Color'], nn)
    t.L.new(nm.outputs['Normal'], b.inputs['Normal'])
    t.put(b.inputs['Base Color'], c)
    t.L.new(b.outputs[0], out.inputs['Surface'])
    me.materials.append(m)
    sc.collection.objects.link(bpy.data.objects.new('terreno', me))
    # agua
    wm = bpy.data.materials.new('agua')
    t = L.NT(wm)
    o = t.new('ShaderNodeOutputMaterial')
    bw = t.new('ShaderNodeBsdfPrincipled')
    bw.inputs['Base Color'].default_value = (*L.hexl('#1d5566'), 1)
    bw.inputs['Roughness'].default_value = 0.12
    bw.inputs['Alpha'].default_value = 0.9
    bump = t.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.15
    t.put(bump.inputs['Height'], t.noise(t.coord('Object'), None, 1.2, 3, 0.5))
    t.L.new(bump.outputs[0], bw.inputs['Normal'])
    t.L.new(bw.outputs[0], o.inputs['Surface'])
    wm.surface_render_method = 'BLENDED'
    wv, wf = [], []
    for j in range(61):
        y = -20 + j * 2.5
        c0 = rx(y)
        wv += [(c0 - 2.6, y, -0.22), (c0 + 2.6, y, -0.22)]
        if j:
            a = 2 * (j - 1)
            wf.append((a, a + 1, a + 3, a + 2))
    wme = bpy.data.meshes.new('agua')
    wme.from_pydata(wv, [], wf)
    wme.materials.append(wm)
    sc.collection.objects.link(bpy.data.objects.new('agua', wme))
    # piezas (importadas una vez; las copias comparten malla)
    cache = {}

    def put(name, x, y, rot, s=1.0, z=None):
        if name not in cache:
            cache[name] = [o for o in import_piece(name) if o.type == 'MESH']
            for o in cache[name]:
                o.location = (x, y, gz(x, y) - 0.03 if z is None else z)
                o.rotation_euler = (0, 0, rot)
                o.scale = (s, s, s)
            return
        for o0 in cache[name]:
            o = o0.copy()
            o.location = (x, y, gz(x, y) - 0.03 if z is None else z)
            o.rotation_euler = (0, 0, rot)
            o.scale = (s, s, s)
            sc.collection.objects.link(o)
    P = [('tronco_caido', 0.6, 3.2, 0.12), ('roca_musgo_a', -4.6, 1.6, 0.4), ('roca_musgo_b', 6.4, 2.2, 2.4),
         ('piedras_rio', -6.4, 4.0, 0.0), ('piedras_rio', -8.2, 9.0, 1.5), ('roca_musgo_a', -10.6, 13.0, 1.2),
         ('heliconia', -2.9, 5.2, 0.3), ('heliconia', 4.6, 6.4, 2.0), ('heliconia', 9.5, 9.0, 1.0),
         ('bromelia', -1.6, 2.0, 0.0), ('bromelia', 3.0, 1.6, 1.0), ('helecho_suelo', -4.0, 7.8, 0.0),
         ('helecho_suelo', 6.6, 4.4, 1.0), ('helecho_suelo', 2.4, 8.6, 2.0), ('helecho_suelo', -1.0, 11.0, 0.7),
         ('hojarasca', 0.0, 1.6, 0.0), ('hojarasca', 2.6, 5.4, 1.0), ('hojarasca', -2.2, 8.4, 2.0),
         ('palma_sierra', -2.6, 14.5, 0.5), ('palma_sierra', 9.5, 13.0, 2.5), ('helecho_arboreo', 4.2, 11.5, 1.3),
         ('helecho_arboreo', -5.8, 17.0, 0.4), ('yagrumo', 13.5, 18.0, 2.0), ('bambu', -13.5, 15.0, 0.2),
         ('ceiba', 3.0, 30.0, 0.3), ('tabonuco', -9.5, 31.0, 1.0), ('flamboyan', 17.0, 27.0, 0.7),
         ('yagrumo', -4.0, 36.0, 0.9), ('palma_sierra', 11.0, 34.0, 1.7), ('helecho_arboreo', 8.0, 22.0, 2.2)]
    rnd = random.Random(9)
    for k in range(14):
        P.append(('pasto', rnd.uniform(-6, 9), rnd.uniform(-1, 9), rnd.uniform(0, 6)))
    for k in range(60):  # sotobosque del plano medio
        y = rnd.uniform(9, 40)
        x = rnd.uniform(-16, 26)
        if abs(x - rx(y)) < 4.2:
            continue
        P.append((rnd.choice(('helecho_suelo', 'helecho_suelo', 'heliconia', 'pasto', 'pasto', 'bromelia')), x, y,
                  rnd.uniform(0, 6), rnd.uniform(0.9, 1.3)))
    for k in range(8):
        y = rnd.uniform(18, 42)
        x = rnd.uniform(-18, 28)
        if abs(x - rx(y)) > 5:
            P.append(('helecho_arboreo', x, y, rnd.uniform(0, 6), rnd.uniform(0.85, 1.2)))
    for k in range(40):  # bosque del fondo (en bruma)
        nm_ = rnd.choice(('tabonuco', 'tabonuco', 'yagrumo', 'palma_sierra', 'palma_sierra', 'helecho_arboreo', 'ceiba'))
        y = rnd.uniform(44, 95)
        x = rnd.uniform(-60, 60)
        if abs(x - rx(y)) < 5:
            continue
        P.append((nm_, x, y, rnd.uniform(0, 6), rnd.uniform(0.9, 1.25)))
    for it in P:
        put(*it)
    # la cotorra (1.4 m) parada sobre el tronco
    try:
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=os.path.join(L.ROOT, 'assets/models/vittata.glb'))
        for o in [o for o in bpy.data.objects if o not in before]:
            if o.parent is None:
                o.location = (0.55, 3.38, gz(0.6, 3.2) + 0.62)
                o.rotation_euler = (0, 0, math.radians(195))
        sc.frame_set(1)
    except Exception as e:  # noqa
        print('sin cotorra:', e)
    sun = sc.objects['sol']
    sun.rotation_euler = (math.radians(60), 0, math.radians(-52))
    sun.data.energy = 6.0
    sun.data.color = L.hexl('#ffcf90')
    sc.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.95
    camera(sc, (1.6, -9.0, 1.95), (2.2, 20.0, 5.0), lens=26)
    # bruma (pase de niebla + compositor)
    sc.view_layers[0].use_pass_mist = True
    sc.view_layers[0].use_pass_z = True
    sc.world.mist_settings.start, sc.world.mist_settings.depth = 22.0, 110.0
    sc.world.mist_settings.falloff = 'QUADRATIC'
    sc.use_nodes = True
    ct = sc.node_tree
    ct.nodes.clear()
    rl = ct.nodes.new('CompositorNodeRLayers')
    mx = ct.nodes.new('CompositorNodeMixRGB')
    mx.inputs[2].default_value = (*L.hexl('#e6ecd8'), 1)
    mul = ct.nodes.new('CompositorNodeMath')
    mul.operation = 'MULTIPLY'
    mul.inputs[1].default_value = 0.62
    sky_m = ct.nodes.new('CompositorNodeMath')
    sky_m.operation = 'LESS_THAN'
    sky_m.inputs[1].default_value = 380.0   # el fondo queda en el plano lejano (400)
    ct.links.new(rl.outputs['Depth'], sky_m.inputs[0])
    mul2 = ct.nodes.new('CompositorNodeMath')
    mul2.operation = 'MULTIPLY'
    ct.links.new(rl.outputs['Mist'], mul2.inputs[0])
    ct.links.new(sky_m.outputs[0], mul2.inputs[1])
    ct.links.new(mul2.outputs[0], mul.inputs[0])
    ct.links.new(mul.outputs[0], mx.inputs[0])
    ct.links.new(rl.outputs['Image'], mx.inputs[1])
    gl = ct.nodes.new('CompositorNodeGlare')
    gl.glare_type = 'FOG_GLOW'
    gl.threshold = 0.85
    gl.mix = -0.75
    ct.links.new(mx.outputs[0], gl.inputs[0])
    cb = ct.nodes.new('CompositorNodeColorBalance')
    cb.correction_method = 'LIFT_GAMMA_GAIN'
    cb.gain = (1.05, 1.0, 0.92)
    cb.lift = (1.0, 1.0, 1.02)
    ct.links.new(gl.outputs[0], cb.inputs[1])
    co = ct.nodes.new('CompositorNodeComposite')
    ct.links.new(cb.outputs[0], co.inputs[0])
    return render(sc, 'hero')


# ───────────────────────── composición ─────────────────────────
def label(title, sub, tris, w, h=84):
    return text_image([(title, FONT_T, 21, '#2b3a22', 12, 58), (sub, FONT_I, 13, '#5d6a52', 12, 36),
                       (tris, FONT_B, 13, '#8a5a2a', 12, 14)], w, h)


def sheet():
    W = 2000
    hdr, heroH = 130, 820
    tw, th = W // 7, 560
    sw, sh_ = W // 9, 330
    gw, gh = W // 4, 300
    Ht = hdr + heroH + 20 + th + 84 + 10 + sh_ + 84 + 10 + gh + 60 + 40
    bg = vgrad(Ht, W, srgb_hex('#f6efe0'), srgb_hex('#efe4cf'))
    y = 0
    t = text_image([('Amazona Verse · Flora de El Yunque', FONT_T, 46, '#24401f', 40, 82),
                    ('Kit de entorno estilizado: 16 piezas .glb, texturas horneadas en Blender, '
                     'escala de mundo con la cotorra de 1.4 m', FONT_B, 18, '#5a6a4e', 42, 42),
                    ('Eevee · luz cálida tropical', FONT_I, 16, '#8a5a2a', W - 300, 42)], W, hdr)
    over(bg, t, 0, y)
    y += hdr
    hero_img = hero(W - 60, heroH)
    over(bg, hero_img, 30, y)
    y += heroH + 20
    for i, n in enumerate(TREES):
        a = tile(n, tw - 10, th)
        over(bg, a, i * tw + 5, y)
        mm = MAN[n]
        lb = label(mm['especie'], mm['cientifico'] + f" · {mm['alto_m']:.1f} m", f"{mm['tris']} tris", tw - 10)
        over(bg, lb, i * tw + 5, y + th)
    y += th + 84 + 10
    for i, n in enumerate(SMALL):
        a = tile(n, sw - 8, sh_)
        over(bg, a, i * sw + 4, y)
        mm = MAN[n]
        sub = (mm['cientifico'] + ' · ' if mm['cientifico'] != '-' else '') + f"{mm['ancho_m']:.1f} m"
        lb = label(mm['especie'] if not n.startswith('roca') else 'Roca ' + n[-1].upper(), sub, f"{mm['tris']} tris",
                   sw - 8)
        over(bg, lb, i * sw + 4, y + sh_)
    y += sh_ + 84 + 10
    for i, (tex, nm) in enumerate(GROUNDS):
        a = ground_swatch(tex, gw - 16, gh)
        over(bg, a, i * gw + 8, y)
        lb = text_image([(nm, FONT_T, 20, '#2b3a22', 10, 34), ('1024 px tileable + normal map', FONT_I, 13, '#5d6a52',
                                                                10, 12)], gw - 16, 50)
        over(bg, lb, i * gw + 8, y + gh + 4)
    y += gh + 60
    tot = sum(v['kb'] for v in MAN.values())
    ft = text_image([(f"Total modelos: {tot / 1024:.1f} MB (.glb con texturas incluidas) · Color de vértice: "
                      "R = AO, G = viento, B = fase · Hojas HOJA_* con alphaTest · Corteza CORTEZA_*", FONT_B, 15,
                      '#5a6a4e', 40, 14)], W, 40)
    over(bg, ft, 0, y)
    L.save_png_rgb(bg, OUT)
    print('LAMINA', OUT, os.path.getsize(OUT) // 1024, 'KB')


if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if argv and argv[0] == 'tiles':
        names = argv[1:] or TREES + SMALL
        tiles = [tile(n, 420 if n in TREES else 360, 640 if n in TREES else 400) for n in names]
        H = max(a.shape[0] for a in tiles)
        row = np.hstack([np.vstack([np.ones((H - a.shape[0], a.shape[1], 4), np.float32), a]) for a in tiles])
        bgc = vgrad(row.shape[0], row.shape[1], srgb_hex('#f6efe0'), srgb_hex('#efe4cf'))
        over(bgc, row, 0, 0)
        L.save_jpg(bgc[..., :3], os.path.join(L.TMP, 'tiles.jpg'), 92)
    elif argv and argv[0] == 'hero':
        a = hero(1600, 600)
        L.save_jpg(a[..., :3], os.path.join(L.TMP, 'hero.jpg'), 92)
    else:
        sheet()
