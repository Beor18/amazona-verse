# BM159 paso 2: viste al Constructor (colores lisos, sin camiseta ni texturas; casco, chaleco, guantes, botas y mochila como mallas aparte),
# anima Idle/Hablar/Señalar/Enfadado y exporta assets/models/personajes/constructor.glb (+ _glb.js) y el retrato.
#   Blender -b /tmp/con/base.blend --python tools/blender/bm159_constructor.py   (base.blend sale de bm159_constructor_base.py)
import bpy, bmesh, math, os, sys, base64
from mathutils import Vector, Euler
HERE = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(REPO, 'assets/models/personajes'); IMG = os.path.join(REPO, 'docs/img/v18_3')
S = 1.75 / 10.37   # altura total 1,75 m (cotorra de 1,4 m a su lado)
sc = bpy.context.scene
def hexrgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)
def mat(name, hexc, rough=0.8, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*hexrgb(hexc), 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    m.diffuse_color = (*hexrgb(hexc), 1); return m
M = {k: mat(k, *v) for k, v in dict(PIEL=('#d9a074',), PELO=('#2a1d14',), CAMISA=('#4d5a66',), PANTALON=('#6b6a4f',), OJOS=('#15110f', 0.3),
     CASCO=('#f2c200', 0.45), CHALECO=('#f07a1a',), FRANJA=('#e9ecdf', 0.5), BOTAS=('#4a2f1d', 0.9), GUANTES=('#8a5a2b',), METAL=('#9aa4ad', 0.35, 0.8),
     MOCHILA=('#7a5b2e',), CORREAS=('#3b2a17',), BOCA=('#8c2f2f',), CEJA=('#2a1d14',), CREM=('#9aa4ad', 0.35, 0.8)).items()}
def setm(o, m): o.data.materials.clear(); o.data.materials.append(M[m]); return o
O = bpy.data.objects
for n in ('Cube.001', 'Cube.002', 'Cube.003'): bpy.data.objects.remove(O[n], do_unlink=True)   # rodilleras y cremallera sueltas: no hacen falta
O['Sphere'].name = 'OjoL'; O['Sphere.001'].name = 'OjoR'; setm(O['OjoL'], 'OJOS'); setm(O['OjoR'], 'OJOS')
O['Brazo.001'].name = 'ManoL'; O['Brazo.000'].name = 'ManoR'; setm(O['ManoL'], 'PIEL'); setm(O['ManoR'], 'PIEL')
O['Ears LEFT'].name = 'OrejaL'; O['Ears LEFT.001'].name = 'OrejaR'; setm(O['OrejaL'], 'PIEL'); setm(O['OrejaR'], 'PIEL')

def cen(o, p): return sum((o.data.vertices[i].co for i in p.vertices), Vector()) / len(p.vertices)
def split(o, name, pred):
    """Separa de 'o' las caras cuyo centroide cumple pred y las devuelve como malla nueva."""
    bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table()
    sel = [f for f in bm.faces if pred(f.calc_center_median())]
    me = bpy.data.meshes.new(name); nb = bmesh.new(); mp = {}
    for f in sel:
        vs = []
        for v in f.verts:
            if v.index not in mp: mp[v.index] = nb.verts.new(v.co)
            vs.append(mp[v.index])
        nb.faces.new(vs)
    nb.to_mesh(me); nb.free()
    bmesh.ops.delete(bm, geom=sel, context='FACES'); bm.to_mesh(o.data); bm.free()
    n = bpy.data.objects.new(name, me); sc.collection.objects.link(n); return n
def overlay(src, name, mname, pred, off):
    """Copia hinchada (a lo largo de las normales) de las caras de 'src' que cumplen pred: prenda que se enciende/apaga sin dejar huecos."""
    bm = bmesh.new(); bm.from_mesh(src.data); bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not pred(f.calc_center_median())], context='FACES')
    bm.normal_update()
    for v in bm.verts: v.co += v.normal * off
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o)
    for p in o.data.polygons: p.use_smooth = True
    return setm(o, mname)
def paint(o, fn, names):
    o.data.materials.clear()
    for n in names: o.data.materials.append(M[n])
    for p in o.data.polygons: p.material_index = fn(cen(o, p))

# --- cuerpo: brazos separados (para animarlos), camisa/pantalón por altura; cabeza: pelo / piel ------------------------------
cuerpo = O['Cuerpo']
armL = split(cuerpo, 'BrazoL', lambda c: c.x > 1.3 and c.z > 1.85)
armR = split(cuerpo, 'BrazoR', lambda c: c.x < -1.3 and c.z > 1.85)
paint(cuerpo, lambda c: 0 if c.z > 3.3 else 1, ('CAMISA', 'PANTALON'))
for a in (armL, armR): setm(a, 'CAMISA')
head = O['Head']; head.name = 'Cara'
paint(head, lambda c: 1 if (c.z > 9.0 or (c.z > 7.6 and c.y > 0.5)) else 0, ('PIEL', 'PELO'))

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
def dome(name, mname, c, r):
    def f(bm):
        bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=10, radius=1.0)
        bmesh.ops.scale(bm, vec=r, verts=bm.verts); bmesh.ops.translate(bm, vec=c, verts=bm.verts)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < c[2] - 0.05], context='VERTS')
    return new(name, mname, f)
casco = [dome('c1', 'CASCO', (0, 0.1, 8.9), (3.25, 2.85, 2.45)),
         new('c2', 'CASCO', box((0, -2.65, 9.1), (3.0, 1.1, 0.16)), bevel=0.06),
         new('c3', 'CASCO', box((0, 0.1, 11.0), (0.55, 4.0, 0.22)), bevel=0.08), new('c4', 'METAL', box((0, -2.2, 10.2), (0.9, 0.3, 0.5)), bevel=0.05)]
casco = merge('Casco', 'CASCO', casco)

chal = shell('Chaleco', 'CHALECO', [(3.2, 1.38, -0.08, 1.12), (3.9, 1.42, -0.08, 1.15), (4.7, 1.40, -0.1, 1.12), (5.4, 1.30, -0.1, 1.02)], seg=24)
fr = [new('f%d' % i, 'FRANJA', box((sg * 0.62, -1.2, 4.0), (0.3, 0.1, 1.5)), bevel=0.03) for i, sg in enumerate((1, -1))]
fr += [new('fh', 'FRANJA', box((0, -1.2, 3.75), (2.5, 0.1, 0.26)), bevel=0.03)]
chaleco = merge('Chaleco', 'CHALECO', [chal] + fr)
chaleco.data.materials.clear()
for m in ('CHALECO', 'FRANJA'): chaleco.data.materials.append(M[m])
for p in chaleco.data.polygons:
    c = cen(chaleco, p); p.material_index = 1 if (c.y < -1.15 and p.normal.y < -0.5 and abs(p.normal.x) < 0.5 and False) else 0
# las franjas son las mallas fr (material FRANJA ya asignado antes de unir): se reasigna por posición
for p in chaleco.data.polygons:
    c = cen(chaleco, p)
    if c.y < -1.18 and ((abs(abs(c.x) - 0.62) < 0.2 and 2.9 < c.z < 5.0) or (abs(c.x) < 1.35 and abs(c.z - 3.75) < 0.2)): p.material_index = 1

moch = new('Mochila', 'MOCHILA', box((0, 1.65, 4.3), (2.1, 1.2, 2.3)), bevel=0.3, subdiv=1)
tapa = new('mt', 'CORREAS', box((0, 1.65, 5.35), (1.9, 1.1, 0.35)), bevel=0.1)
bolso = new('mb', 'CORREAS', box((0, 2.35, 3.8), (1.5, 0.35, 1.0)), bevel=0.08)
herr = [new('h1', 'METAL', box((-0.6, 2.55, 4.2), (0.14, 0.14, 1.5))), new('h2', 'METAL', box((0.6, 2.6, 4.2), (0.6, 0.14, 0.22)), bevel=0.04)]
cor = [new('cf%d' % i, 'CORREAS', box((sg * 0.75, -0.2, 5.45), (0.3, 1.8, 0.14))) for i, sg in enumerate((1, -1))]
moch = merge('Mochila', 'MOCHILA', [moch, tapa, bolso] + herr + cor)
moch.data.materials.clear()
for m in ('MOCHILA', 'CORREAS', 'METAL'): moch.data.materials.append(M[m])
for p in moch.data.polygons:
    c = cen(moch, p); p.material_index = 2 if c.y > 2.4 and c.z > 3.0 else (1 if (c.y < 0.7 or c.z > 5.2 or c.y > 2.2) else 0)

guantes = {}
for nm in ('ManoL', 'ManoR'):
    guantes[nm] = overlay(O[nm], 'Guante' + nm[-1], 'GUANTES', lambda c: True, 0.06)
    pu = new('pu' + nm[-1], 'GUANTES', box((O[nm].data.vertices[0].co.x * 0 + (1.7 if nm == 'ManoL' else -1.7), 0, 3.2), (0.75, 0.75, 0.3)), bevel=0.08)
    guantes[nm] = merge('Guante' + nm[-1], 'GUANTES', [guantes[nm], pu])
botas = overlay(cuerpo, 'Botas', 'BOTAS', lambda c: c.z < 0.85, 0.07)

# --- cara: cejas, nariz y boca (las originales llevaban la textura de la camiseta) -----------------------------------------
cej = [new('cj%d' % i, 'CEJA', box((sg * 1.5, -2.08, 8.1), (1.0, 0.14, 0.22)), bevel=0.04) for i, sg in enumerate((1, -1))]
nar = new('Nariz', 'PIEL', ell((0, -2.1, 6.7), (0.28, 0.25, 0.32), 10))
boca = new('Boca', 'BOCA', box((0, -2.06, 5.95), (0.95, 0.1, 0.16)), bevel=0.04)
rostro = [merge('Cejas', 'CEJA', cej), nar, boca]

# --- jerarquía y pivotes ------------------------------------------------------------------------------------------------
root = bpy.data.objects.new('Constructor', None); sc.collection.objects.link(root)
cab = bpy.data.objects.new('Cabeza', None); cab.location = (0, 0, 5.7); sc.collection.objects.link(cab)
piv = {}
for nm, sg in (('BrazoL', 1), ('BrazoR', -1)):
    e = bpy.data.objects.new('Hombro' + nm[-1], None); e.location = (sg * 1.6, 0, 4.9); sc.collection.objects.link(e); piv[nm] = e
def par(o, p):
    o.parent = p; o.matrix_parent_inverse = p.matrix_world.inverted()
bpy.context.view_layer.update()
for o in (cab, piv['BrazoL'], piv['BrazoR']): par(o, root)
for o in (cuerpo, chaleco, moch, botas): par(o, root)
for o in [O['Cara'], O['OjoL'], O['OjoR'], O['OrejaL'], O['OrejaR'], casco] + rostro: par(o, cab)
for nm, a in (('L', armL), ('R', armR)):
    for o in (a, O['Mano' + nm], guantes['Mano' + nm]): par(o, piv['Brazo' + nm])
root.scale = (S, S, S)
root['variantes'] = '{"supervisor":["Casco","Chaleco","Guantes","Botas","Mochila"],"explorador":["Guantes","Botas","Mochila"],"reparador":["Casco","Guantes","Botas","Mochila"],"mallas":["Casco","Chaleco","Mochila","GuanteL","GuanteR","Botas"]}'
root['fuente'] = 'Modelo propio de Kelvin (Piloto CiberPunk Human.blend), sin camiseta ni texturas: colores lisos'

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
action('Señalar', {C: {('rotation_euler', 0): [(f, r(4)) for f in (1, N)], ('rotation_euler', 2): [(f, r(-8)) for f in (1, N)]},
                   R: {('rotation_euler', 0): sin_keys(N, r(3), 2, 0.0, r(-88)), ('rotation_euler', 1): [(f, r(8)) for f in (1, N)]},
                   L: {('rotation_euler', 0): sin_keys(N, r(2), 1, 1.0, r(-8)), ('rotation_euler', 1): [(f, r(-4)) for f in (1, N)]}})
action('Enfadado', {C: {('rotation_euler', 0): [(f, r(10)) for f in (1, N)], ('rotation_euler', 2): sin_keys(N, r(7), 4, 0.0)},
                    L: {('rotation_euler', 0): sin_keys(N, r(8), 4, 0.0, r(-30)), ('rotation_euler', 1): [(f, r(-16)) for f in (1, N)]},
                    R: {('rotation_euler', 0): sin_keys(N, r(8), 4, 3.14, r(-30)), ('rotation_euler', 1): [(f, r(16)) for f in (1, N)]}})
sc.frame_start, sc.frame_end = 1, N

# --- conteo, exportación y retrato ---------------------------------------------------------------------------------------
meshes = [o for o in sc.objects if o.type == 'MESH']
print('TRIS', sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes), [(o.name, sum(len(p.vertices) - 2 for p in o.data.polygons)) for o in meshes])
if '--solo-captura' not in sys.argv:
    path = os.path.join(OUT, 'constructor.glb'); os.makedirs(OUT, exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_yup=True, export_materials='EXPORT', export_apply=False,
                              export_animations=True, export_nla_strips=True, export_animation_mode='NLA_TRACKS', export_extras=True, export_cameras=False,
                              export_lights=False, export_texcoords=False)
    b = base64.b64encode(open(path, 'rb').read()).decode()
    open(os.path.join(OUT, 'constructor_glb.js'), 'w').write('(window.AV_PERSONAJES_B64=window.AV_PERSONAJES_B64||{})["constructor"]="%s";\n' % b)
    print('KB', os.path.getsize(path) // 1024)
for e in (L, R, C): e.animation_data_clear(); e.rotation_euler = (0, 0, 0)
w = bpy.data.worlds.new('w'); w.color = (0.93, 0.95, 0.92); sc.world = w
sc.render.engine = 'BLENDER_WORKBENCH'; sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'MATERIAL'; sc.display.shading.show_cavity = False
sc.render.resolution_x = sc.render.resolution_y = 512; sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 88
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); cam.data.type = 'ORTHO'; cam.data.clip_end = 50; sc.camera = cam
def shot(path, loc, tgt, scale=2.1):
    cam.data.ortho_scale = scale; cam.location = Vector(loc); d = Vector(tgt) - cam.location
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler(); sc.render.filepath = path; bpy.ops.render.render(write_still=True)
os.makedirs(IMG, exist_ok=True)
shot(os.path.join(IMG, 'constructor.jpg'), (2.2, -4.0, 1.2), (0, 0, 0.9))
if '--extra' in sys.argv:
    shot('/tmp/con/e_espalda.png', (-2.2, 4.0, 1.2), (0, 0, 0.9)); shot('/tmp/con/e_lado.png', (5, 0, 1.0), (0, 0, 0.9))
