# BM160 paso 2: viste a la Ingeniera (colores lisos, pelo propio, chaqueta/cinturón/mochila/guantes como mallas aparte),
# anima Idle/Hablar/Reparar moviendo brazos y cabeza, y exporta assets/models/personajes/ingeniera.glb (+ _glb.js) y el retrato.
#   Blender -b /tmp/ing/base.blend --python tools/blender/bm160_ingeniera.py   (base.blend sale de bm160_ingeniera_base.py)
import bpy, bmesh, math, os, sys, base64
from mathutils import Vector, Euler
HERE = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(REPO, 'assets/models/personajes'); IMG = os.path.join(REPO, 'docs/img/v18_3')
S = 1.62 / 9.22   # altura total 1,62 m (cotorra de 1,4 m a su lado)
sc = bpy.context.scene
def hexrgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)
def mat(name, hexc, rough=0.8, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*hexrgb(hexc), 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    m.diffuse_color = (*hexrgb(hexc), 1); return m
M = {k: mat(k, *v) for k, v in dict(PIEL=('#c98b5b',), PELO=('#3b2416',), MONO=('#35506b',), RODILLERA=('#c3cad1', 0.5), OJOS=('#15110f', 0.3),
     CHAQUETA=('#e8832a',), CINTURON=('#6b4423',), BOLSAS=('#b07a3c',), METAL=('#9aa4ad', 0.35, 0.8), MOCHILA=('#1f8a8a',), CORREAS=('#146a6a',),
     GUANTES=('#8a5a2b',), BOCA=('#8c2f2f',)).items()}
def setm(o, m): o.data.materials.clear(); o.data.materials.append(M[m]); return o
O = bpy.data.objects
for n, m in (('Cube', 'MONO'), ('Cube.001', 'RODILLERA'), ('Cube.002', 'RODILLERA'), ('Cube.003', 'METAL'), ('Face', 'PIEL'), ('Sphere', 'OJOS'),
             ('Sphere.001', 'OJOS'), ('Brazo.000', 'MONO'), ('Brazo.001', 'MONO')): setm(O[n], m)
O['Cube'].name = 'Cuerpo'; O['Face'].name = 'Cara'; O['Sphere'].name = 'OjoL'; O['Sphere.001'].name = 'OjoR'
O['Brazo.001'].name = 'BrazoL'; O['Brazo.000'].name = 'BrazoR'
for n in ('Cube.001', 'Cube.002'): O[n].name = 'Rodillera' + n[-1]
O['Cube.003'].name = 'Cremallera'

def new(name, mname, bm_fn, bevel=0.0, subdiv=0):
    me = bpy.data.meshes.new(name); bm = bmesh.new(); bm_fn(bm); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o); bpy.context.view_layer.objects.active = o
    if bevel:
        b = o.modifiers.new('b', 'BEVEL'); b.width = bevel; b.segments = 2
    if subdiv: o.modifiers.new('s', 'SUBSURF').levels = subdiv
    for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
    for p in o.data.polygons: p.use_smooth = True
    return setm(o, mname)
def box(c, size, rz=0, rx=0):
    def f(bm):
        bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, vec=size, verts=bm.verts)
        bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Euler((rx, 0, rz)).to_matrix(), verts=bm.verts)
        bmesh.ops.translate(bm, vec=c, verts=bm.verts)
    return f
def ell(c, r, seg=14):
    def f(bm):
        bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=max(6, seg // 2), radius=1.0)
        bmesh.ops.scale(bm, vec=r, verts=bm.verts); bmesh.ops.translate(bm, vec=c, verts=bm.verts)
    return f
def merge(name, mname, objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); objs[0].name = name; return setm(objs[0], mname)
def shell(name, mname, rows, seg=28):
    """Tubo por anillos elípticos (z, rx, cy, ry) alrededor del torso, con grosor."""
    def f(bm):
        rings = [[bm.verts.new((rx * math.sin(a), cy - ry * math.cos(a), z)) for a in [k / seg * 2 * math.pi for k in range(seg)]] for z, rx, cy, ry in rows]
        for i in range(len(rings) - 1):
            for k in range(seg): bm.faces.new((rings[i][k], rings[i][(k + 1) % seg], rings[i + 1][(k + 1) % seg], rings[i + 1][k]))
    o = new(name, mname, f)
    sol = o.modifiers.new('sol', 'SOLIDIFY'); sol.thickness = 0.12; sol.offset = 0
    bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='sol')
    for p in o.data.polygons: p.use_smooth = True
    return o

# --- prendas (cada una malla aparte, se enciende/apaga por nombre) --------------------------------------------------------
ch = shell('Chaqueta', 'CHAQUETA', [(3.05, 2.00, -0.07, 1.15), (3.5, 2.02, -0.07, 1.17), (4.2, 1.98, -0.12, 1.22), (5.0, 1.80, -0.15, 1.22), (5.6, 1.45, -0.1, 1.0)])
cuello = new('Cuello', 'CHAQUETA', ell((0, -0.1, 5.75), (0.95, 0.85, 0.28), 16))
bolsillos = [new('bq%d' % i, 'CHAQUETA', box((sg * 0.95, -1.32, 3.75), (0.8, 0.12, 0.7))) for i, sg in enumerate((1, -1))]
ch = merge('Chaqueta', 'CHAQUETA', [ch, cuello] + bolsillos)

cin = shell('Cinturon', 'CINTURON', [(3.1, 2.12, -0.07, 1.27), (3.38, 2.12, -0.07, 1.27)])
hebilla = new('hb', 'METAL', box((0, -1.37, 3.24), (0.5, 0.12, 0.34)), bevel=0.04)
bols = [new('bo%d' % i, 'BOLSAS', box((sg * 1.35, -1.25, 3.0), (0.62, 0.42, 0.75)), bevel=0.06) for i, sg in enumerate((1, -1))]
llave = [new('ll', 'METAL', box((-0.95, -1.35, 3.0), (0.14, 0.12, 0.95))), new('ll2', 'METAL', box((-0.95, -1.35, 3.5), (0.34, 0.12, 0.2)))]
mart = [new('ma', 'METAL', box((0.95, -1.35, 3.0), (0.14, 0.12, 0.8))), new('ma2', 'METAL', box((0.95, -1.35, 3.45), (0.5, 0.14, 0.22)))]
cin = merge('Cinturon', 'CINTURON', [cin, hebilla] + bols + llave + mart)
cin.data.materials.clear()
for m in ('CINTURON', 'METAL', 'BOLSAS'): cin.data.materials.append(M[m])
for p in cin.data.polygons:
    c = sum((cin.data.vertices[i].co for i in p.vertices), Vector()) / len(p.vertices)
    p.material_index = 1 if (abs(c.x) < 0.3 and c.y < -1.3) else (2 if abs(c.x) > 1.0 and c.y < -1.0 and c.z < 3.5 else 0)

moch = new('Mochila', 'MOCHILA', box((0, 1.62, 4.45), (2.5, 1.5, 2.5)), bevel=0.3, subdiv=1)
tapa = new('mt', 'CORREAS', box((0, 1.62, 5.62), (2.2, 1.35, 0.4)), bevel=0.12)
bolso = new('mb', 'CORREAS', box((0, 2.42, 4.0), (1.7, 0.4, 1.2)), bevel=0.1)
cor2 = [new('cf%d' % i, 'CORREAS', box((sg * 0.85, -1.31, 4.75), (0.38, 0.1, 1.9))) for i, sg in enumerate((1, -1))]
moch = merge('Mochila', 'MOCHILA', [moch, tapa, bolso] + cor2)
moch.data.materials.clear()
for m in ('MOCHILA', 'CORREAS'): moch.data.materials.append(M[m])
for p in moch.data.polygons:
    c = sum((moch.data.vertices[i].co for i in p.vertices), Vector()) / len(p.vertices)
    p.material_index = 1 if (c.y < 0 or c.z > 5.4 or c.y > 2.2) else 0

def mano(o):
    zs = [v.co for v in o.data.vertices]; low = sorted(zs, key=lambda v: v.z)[:max(30, len(zs) // 12)]
    return sum(low, Vector()) / len(low)
gl = {}
for nm in ('BrazoL', 'BrazoR'):
    h = mano(O[nm])
    g = new('Guante' + nm[-1], 'GUANTES', ell((h.x, h.y, h.z + 0.28), (0.5, 0.45, 0.62), 14))
    pu = new('pu' + nm[-1], 'GUANTES', ell((h.x, h.y, h.z + 0.85), (0.56, 0.52, 0.34), 12))
    gl[nm] = merge('Guante' + nm[-1], 'GUANTES', [g, pu])

# --- pelo propio, cejas, nariz y boca ------------------------------------------------------------------------------------
pelo = [new('p_top', 'PELO', box((0, 0.05, 9.0), (5.5, 4.1, 1.15)), bevel=0.45, subdiv=1),
        new('p_back', 'PELO', box((0, 1.15, 7.7), (5.45, 1.9, 3.6)), bevel=0.45, subdiv=1),
        new('p_sl', 'PELO', box((2.6, 0.35, 8.2), (0.5, 3.4, 2.2)), bevel=0.15), new('p_sr', 'PELO', box((-2.6, 0.35, 8.2), (0.5, 3.4, 2.2)), bevel=0.15),
        new('p_fl', 'PELO', box((1.45, -1.95, 8.85), (2.7, 0.45, 0.55)), bevel=0.15), new('p_fr', 'PELO', box((-1.45, -1.95, 8.85), (2.7, 0.45, 0.55)), bevel=0.15),
        new('p_bl', 'PELO', ell((1.9, 0.3, 9.9), (0.85, 0.85, 0.85), 14)), new('p_br', 'PELO', ell((-1.9, 0.3, 9.9), (0.85, 0.85, 0.85), 14))]
pelo = merge('Pelo', 'PELO', pelo)
cej = [new('cj%d' % i, 'PELO', box((sg * 1.5, -1.9, 8.15), (1.05, 0.12, 0.2)), bevel=0.04) for i, sg in enumerate((1, -1))]
nar = new('Nariz', 'PIEL', ell((0, -1.98, 6.5), (0.28, 0.22, 0.26), 10))
boca = new('Boca', 'BOCA', box((0, -1.88, 5.95), (0.9, 0.1, 0.16)), bevel=0.04)
rostro = [merge('Cejas', 'PELO', cej), nar, boca]

# --- jerarquía y pivotes ------------------------------------------------------------------------------------------------
root = bpy.data.objects.new('Ingeniera', None); sc.collection.objects.link(root)
cab = bpy.data.objects.new('Cabeza', None); cab.location = (0, 0, 5.6); sc.collection.objects.link(cab)
piv = {}
for nm, sg in (('BrazoL', 1), ('BrazoR', -1)):
    e = bpy.data.objects.new('Hombro' + nm[-1], None); e.location = (sg * 1.6, 0, 3.3); sc.collection.objects.link(e); piv[nm] = e
def par(o, p):
    o.parent = p; o.matrix_parent_inverse = p.matrix_world.inverted()
bpy.context.view_layer.update()
for o in (cab, piv['BrazoL'], piv['BrazoR']): par(o, root)
for n in ('Cuerpo', 'Rodillera1', 'Rodillera2', 'Cremallera', 'Chaqueta', 'Cinturon', 'Mochila'): par(O[n], root)
for o in [O['Cara'], O['OjoL'], O['OjoR'], pelo] + rostro: par(o, cab)
for nm in ('BrazoL', 'BrazoR'): par(O[nm], piv[nm]); par(gl[nm], piv[nm])
root.scale = (S, S, S)
root['variantes'] = '{"aprendiz":["Guantes","Cinturon"],"ingeniera":["Chaqueta","Cinturon","Mochila","Guantes"],"mallas":["Chaqueta","Cinturon","Mochila","GuanteL","GuanteR"]}'
root['fuente'] = 'Modelo propio de Kelvin (Piloto CiberPunk Girl.blend), sin foto ni camiseta: colores lisos'

# --- animaciones (NLA, una pista por acción) -----------------------------------------------------------------------------
sc.render.fps = 24
def action(name, keys):
    act = bpy.data.actions.new(name)
    for o, props in keys.items():
        if not o.animation_data: o.animation_data_create()
        o.animation_data.action = act
        for (prop, idx), pts in props.items():
            for f, v in pts:
                o.rotation_euler[idx] = v; o.keyframe_insert(prop, index=idx, frame=f)
    for o in keys:
        ad = o.animation_data; tr = ad.nla_tracks.new(); tr.name = name; st = tr.strips.new(name, 1, ad.action); st.name = name
        ad.action = None
def sin_keys(n, amp, per=1.0, ph=0.0, base=0.0):
    return [(1 + round(i * (n - 1) / 8), base + amp * math.sin(2 * math.pi * (i / 8 * per) + ph)) for i in range(9)]
N = 49; r = math.radians
L, R, C = piv['BrazoL'], piv['BrazoR'], cab
action('Idle', {C: {('rotation_euler', 0): sin_keys(N, r(1.5)), ('rotation_euler', 2): sin_keys(N, r(2), 1, 1.2)},
                L: {('rotation_euler', 0): sin_keys(N, r(3), 1, 0.5), ('rotation_euler', 1): [(f, r(-3)) for f in (1, N)]},
                R: {('rotation_euler', 0): sin_keys(N, r(3), 1, 2.5), ('rotation_euler', 1): [(f, r(3)) for f in (1, N)]}})
action('Hablar', {C: {('rotation_euler', 0): sin_keys(N, r(5), 2, 0.0), ('rotation_euler', 2): sin_keys(N, r(6), 1, 0.0)},
                  L: {('rotation_euler', 0): sin_keys(N, r(14), 2, 0.0, r(-28)), ('rotation_euler', 1): [(f, r(-14)) for f in (1, N)]},
                  R: {('rotation_euler', 0): sin_keys(N, r(10), 2, 1.5, r(-12)), ('rotation_euler', 1): [(f, r(10)) for f in (1, N)]}})
action('Reparar', {C: {('rotation_euler', 0): [(f, r(14)) for f in (1, N)], ('rotation_euler', 2): sin_keys(N, r(4), 2, 0.0)},
                   R: {('rotation_euler', 0): sin_keys(N, r(14), 4, 0.0, r(-78)), ('rotation_euler', 1): [(f, r(18)) for f in (1, N)]},
                   L: {('rotation_euler', 0): sin_keys(N, r(8), 4, 1.6, r(-60)), ('rotation_euler', 1): [(f, r(-22)) for f in (1, N)]}})
sc.frame_start, sc.frame_end = 1, N

# --- conteo, exportación y retrato ---------------------------------------------------------------------------------------
meshes = [o for o in sc.objects if o.type == 'MESH']
print('TRIS', sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes), [(o.name, sum(len(p.vertices) - 2 for p in o.data.polygons)) for o in meshes])
if '--solo-captura' not in sys.argv:
    path = os.path.join(OUT, 'ingeniera.glb'); os.makedirs(OUT, exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_yup=True, export_materials='EXPORT', export_apply=False,
                              export_animations=True, export_nla_strips=True, export_animation_mode='NLA_TRACKS', export_extras=True, export_cameras=False,
                              export_lights=False, export_texcoords=False)
    b = base64.b64encode(open(path, 'rb').read()).decode()
    open(os.path.join(OUT, 'ingeniera_glb.js'), 'w').write('(window.AV_PERSONAJES_B64=window.AV_PERSONAJES_B64||{})["ingeniera"]="%s";\n' % b)
    print('KB', os.path.getsize(path) // 1024)
for e in (L, R, C): e.animation_data_clear(); e.rotation_euler = (0, 0, 0)
w = bpy.data.worlds.new('w'); w.color = (0.93, 0.95, 0.92); sc.world = w
sc.render.engine = 'BLENDER_WORKBENCH'; sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'MATERIAL'; sc.display.shading.show_cavity = False
sc.render.resolution_x = sc.render.resolution_y = 512; sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 88
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); cam.data.type = 'ORTHO'; cam.data.clip_end = 50; sc.camera = cam
def shot(path, loc, tgt, scale=2.05):
    cam.data.ortho_scale = scale; cam.location = Vector(loc); d = Vector(tgt) - cam.location
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler(); sc.render.filepath = path; bpy.ops.render.render(write_still=True)
os.makedirs(IMG, exist_ok=True)
shot(os.path.join(IMG, 'ingeniera.jpg'), (2.2, -4.0, 1.4), (0, 0, 0.84))
if '--extra' in sys.argv:
    shot('/tmp/ing/e_espalda.png', (-2.2, 4.0, 1.4), (0, 0, 0.84)); shot('/tmp/ing/e_lado.png', (5, 0, 1.0), (0, 0, 0.84))
