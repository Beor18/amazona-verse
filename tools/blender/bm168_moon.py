# BM168 paso 2: viste a Maestro Moon (gato sabio, maestro del dojo de los fenómenos; SIN katana ni armas): colores lisos, diadema dorada,
# emblema de luna creciente, cola, bigotes largos, anima Idle/Hablar/Señalar y exporta assets/models/personajes/maestro_moon.glb (+ _glb.js) y el retrato.
#   Blender -b /tmp/moon/base.blend --python tools/blender/bm168_moon.py   (base.blend sale de bm168_moon_base.py)
import bpy, bmesh, math, os, sys, base64
from mathutils import Vector, Euler
HERE = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(REPO, 'assets/models/personajes'); IMG = os.path.join(REPO, 'docs/img/bm168')
S = 1.45 / 9.9   # altura total 1,45 m (maestro, algo más alto que la cotorra pero cabezón)
sc = bpy.context.scene
def hexrgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)
def mat(name, hexc, rough=0.8, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*hexrgb(hexc), 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    m.diffuse_color = (*hexrgb(hexc), 1); return m
M = {k: mat(k, *v) for k, v in dict(PELO=('#cfd6e6',), CREMA=('#f4efe4',), KIMONO=('#33407a',), FAJA=('#e8c25a', 0.5), ORO=('#f0b93a', 0.4, 0.3),
     OJOS=('#15110f', 0.3), BRILLO=('#ffffff', 0.3), NARIZ=('#e58fa0', 0.5), ORELLA=('#f2b5c0',), CEJA=('#ffffff',), BOTA=('#7a5a3c',),
     LUNA=('#fff3b8', 0.4), CLARO=('#4a5aa0',)).items()}
def setm(o, m): o.data.materials.clear(); o.data.materials.append(M[m]); return o
def cen(o, p): return sum((o.data.vertices[i].co for i in p.vertices), Vector()) / len(p.vertices)
def multi(o, names, fn):
    o.data.materials.clear()
    for n in names: o.data.materials.append(M[n])
    for p in o.data.polygons: p.material_index = fn(cen(o, p))
O = bpy.data.objects
for a, b in (('Head.001', 'Cara'), ('Cube', 'Torso'), ('Cube.001', 'Hakama'), ('Cube.002', 'Nudo'), ('Ocico', 'Hocico'), ('Sphere', 'OjoL'), ('Sphere.001', 'OjoR'),
             ('Cejas Rigth', 'CejaL'), ('Cejas Rigth.001', 'CejaR'), ('Brazo Cat L', 'BrazoL'), ('Brazo Cat R', 'BrazoR'), ('Foot Left', 'PieL'), ('Foot Rigth', 'PieR'),
             ('Plane.003', 'Faja'), ('Plane.004', 'FajaA'), ('Plane.005', 'FajaB'), ('Plane.006', 'FajaC')): O[a].name = b
setm(O['Torso'], 'KIMONO'); setm(O['Hakama'], 'KIMONO'); setm(O['Nudo'], 'ORO')
for n in ('Faja', 'FajaA', 'FajaB', 'FajaC'): setm(O[n], 'FAJA')
for n in ('OjoL', 'OjoR'): setm(O[n], 'OJOS')
for n in ('CejaL', 'CejaR'): setm(O[n], 'CEJA')
for n in ('PieL', 'PieR'): setm(O[n], 'BOTA')
setm(O['Bandana'], 'ORO')
# cuello del kimono más claro; manos crema; hocico crema con nariz rosa
multi(O['Torso'], ('KIMONO', 'CLARO'), lambda c: 1 if (abs(c.x) < 0.9 and c.z > 4.3 and c.y < 0) else 0)
for n in ('BrazoL', 'BrazoR'): multi(O[n], ('KIMONO', 'CREMA'), lambda c: 1 if c.z < 2.5 else 0)
multi(O['Hocico'], ('CREMA', 'NARIZ'), lambda c: 1 if (c.z > 5.95 and abs(c.x) < 0.45) else 0)
multi(O['Cara'], ('PELO', 'ORELLA', 'CREMA'), lambda c: 1 if (c.z > 8.6 and abs(c.x) > 1.2 and abs(c.x) < 2.2 and c.y < 0.2) else (2 if (c.y < -1.4 and c.z < 6.6) else 0))

def new(name, mname, bm_fn, bevel=0.0, subdiv=0):
    me = bpy.data.meshes.new(name); bm = bmesh.new(); bm_fn(bm); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o); bpy.context.view_layer.objects.active = o
    if bevel:
        b = o.modifiers.new('b', 'BEVEL'); b.width = bevel; b.segments = 2
    if subdiv: o.modifiers.new('s', 'SUBSURF').levels = subdiv
    for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
    for p in o.data.polygons: p.use_smooth = True
    return setm(o, mname)
def box(c, size, rz=0, rx=0, ry=0):
    def f(bm):
        bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, vec=size, verts=bm.verts)
        bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Euler((rx, ry, rz)).to_matrix(), verts=bm.verts)
        bmesh.ops.translate(bm, vec=c, verts=bm.verts)
    return f
def ell(c, r, seg=14, rx=0, ry=0, rz=0):
    def f(bm):
        bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=max(6, seg // 2), radius=1.0)
        bmesh.ops.scale(bm, vec=r, verts=bm.verts)
        bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Euler((rx, ry, rz)).to_matrix(), verts=bm.verts)
        bmesh.ops.translate(bm, vec=c, verts=bm.verts)
    return f
def cone(c, r1, r2, h, rx=0, ry=0, seg=10):
    def f(bm):
        bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r1, radius2=r2, depth=h)
        bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Euler((rx, ry, 0)).to_matrix(), verts=bm.verts)
        bmesh.ops.translate(bm, vec=c, verts=bm.verts)
    return f
def merge(name, mname, objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); objs[0].name = name; return setm(objs[0], mname)

def crescent(c, R, r, off):
    a = new('lu_a', 'LUNA', lambda bm: (bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=R, radius2=R, depth=0.12), bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Euler((math.pi / 2, 0, 0)).to_matrix(), verts=bm.verts)))
    b = new('lu_b', 'LUNA', lambda bm: (bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=r, radius2=r, depth=0.5), bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Euler((math.pi / 2, 0, 0)).to_matrix(), verts=bm.verts), bmesh.ops.translate(bm, vec=(off, 0, 0), verts=bm.verts)))
    bpy.context.view_layer.objects.active = a
    bo = a.modifiers.new('bo', 'BOOLEAN'); bo.operation = 'DIFFERENCE'; bo.object = b; bpy.ops.object.modifier_apply(modifier='bo')
    bpy.data.objects.remove(b, do_unlink=True)
    for v in a.data.vertices: v.co += Vector(c)
    a.name = 'Luna'; return a
# --- piezas propias --------------------------------------------------------------------------------------------------------
luna = crescent((0.0, -0.95, 3.9), 0.75, 0.62, 0.3)    # emblema en el pecho del kimono (creciente de luna)
luna2 = crescent((0.0, -2.15, 8.55), 0.42, 0.34, 0.18)  # y en la diadema
nar = new('NarizP', 'NARIZ', ell((0, -2.2, 6.2), (0.3, 0.2, 0.2), 10))
brillos = [new('br' + n, 'BRILLO', ell((sx, -2.12, 6.95), (0.13, 0.07, 0.13), 8)) for n, sx in (('L', 1.55), ('R', -1.55))]
# bigotes largos y blancos de sabio (cintas finas a cada lado del hocico)
bg = []
for sg in (1, -1):
    for k, dz in enumerate((0.05, -0.2)):
        bg.append(new('bg%d%d' % (sg > 0, k), 'CEJA', box((sg * 1.75, -2.0, 5.95 + dz), (1.2, 0.08, 0.1), rz=sg * math.radians(-18 + 18 * k * 2)), bevel=0.02))
bigotes = merge('Bigotes', 'CEJA', bg)
# cola esponjosa
cp = [new('c1', 'PELO', ell((0, 1.0, 3.0), (0.55, 0.65, 0.55), 10)), new('c2', 'PELO', ell((0, 1.7, 3.7), (0.55, 0.6, 0.75), 10, rx=math.radians(-30))),
      new('c3', 'PELO', ell((0, 2.0, 4.8), (0.6, 0.6, 0.85), 10, rx=math.radians(-10))), new('c4', 'CREMA', ell((0, 2.0, 5.6), (0.55, 0.55, 0.55), 10))]
cola = merge('Cola', 'PELO', cp)
cola.data.materials.clear(); cola.data.materials.append(M['PELO']); cola.data.materials.append(M['CREMA'])
for p in cola.data.polygons: p.material_index = 1 if cen(cola, p).z > 5.5 else 0
# diadema: se sube a la frente para dejar ver los ojos
ban = O['Bandana']; ban.scale = (0.97, 0.97, 1.0); ban.location = (0, 0, 1.45)
bpy.context.view_layer.update()

# --- jerarquía y pivotes ---------------------------------------------------------------------------------------------------
root = bpy.data.objects.new('MaestroMoon', None); sc.collection.objects.link(root)
rig = bpy.data.objects.new('Rig', None); sc.collection.objects.link(rig)
cab = bpy.data.objects.new('Cabeza', None); cab.location = (0, 0, 5.2); sc.collection.objects.link(cab)
colap = bpy.data.objects.new('ColaPivote', None); colap.location = (0, 0.9, 3.0); sc.collection.objects.link(colap)
piv = {}
for nm, sg in (('BrazoL', 1), ('BrazoR', -1)):
    e = bpy.data.objects.new('Hombro' + nm[-1], None); e.location = (sg * 1.7, 0.15, 3.35); sc.collection.objects.link(e); piv[nm] = e
def par(o, p):
    o.parent = p; o.matrix_parent_inverse = p.matrix_world.inverted()
bpy.context.view_layer.update()
par(rig, root)
for o in (cab, colap, piv['BrazoL'], piv['BrazoR']): par(o, rig)
for n in ('Torso', 'Hakama', 'Nudo', 'Faja', 'FajaA', 'FajaB', 'FajaC', 'PieL', 'PieR'): par(O[n], rig)
par(luna, rig)
for o in [O['Cara'], O['Hocico'], O['OjoL'], O['OjoR'], O['CejaL'], O['CejaR'], O['Bandana'], nar, bigotes, luna2] + brillos: par(o, cab)
par(cola, colap)
for nm in ('BrazoL', 'BrazoR'): par(O[nm], piv[nm])
root.scale = (S, S, S)
root['fuente'] = 'Modelo propio de Kelvin (Cat Superior Moon.blend), sin armas: colores lisos'
root['personaje'] = 'Maestro Moon'
# --- animaciones (NLA, una pista por acción) --------------------------------------------------------------------------------
sc.render.fps = 24
def action(name, keys):
    act = bpy.data.actions.new(name)
    for o, props in keys.items():
        if not o.animation_data: o.animation_data_create()
        o.animation_data.action = act
        for (prop, idx), pts in props.items():
            for f, v in pts:
                getattr(o, prop)[idx] = v; o.keyframe_insert(prop, index=idx, frame=f)
    for o in keys:
        ad = o.animation_data; tr = ad.nla_tracks.new(); tr.name = name; st = tr.strips.new(name, 1, ad.action); st.name = name
        ad.action = None
def sk(n, amp, per=1.0, ph=0.0, base=0.0):
    return [(1 + round(i * (n - 1) / 8), base + amp * math.sin(2 * math.pi * (i / 8 * per) + ph)) for i in range(9)]
BASE = {o: o.location.copy() for o in (piv['BrazoL'], piv['BrazoR'], cab, colap, rig)}
N = 49; r = math.radians; RE, LO = 'rotation_euler', 'location'
L, R, C, T, G = piv['BrazoL'], piv['BrazoR'], cab, colap, rig
action('Idle', {C: {(RE, 0): sk(N, r(2)), (RE, 2): sk(N, r(4), 1, 1.2)},
                L: {(RE, 0): sk(N, r(3), 1, 0.5), (RE, 1): [(f, r(-3)) for f in (1, N)]},
                R: {(RE, 0): sk(N, r(3), 1, 2.5), (RE, 1): [(f, r(3)) for f in (1, N)]},
                T: {(RE, 2): sk(N, r(18), 2)}, G: {(LO, 2): sk(N, 0.05, 2)}})
action('Hablar', {C: {(RE, 0): sk(N, r(5), 4, 0.0, r(2)), (RE, 2): sk(N, r(6), 2, 0.8)},
                  R: {(RE, 0): sk(N, r(14), 3, 0.0, r(-38)), (RE, 1): [(f, r(14)) for f in (1, N)]},
                  L: {(RE, 0): sk(N, r(10), 2, 1.5, r(-22)), (RE, 1): [(f, r(-12)) for f in (1, N)]},
                  T: {(RE, 2): sk(N, r(12), 2)}, G: {(LO, 2): sk(N, 0.04, 4)}})
action('Señalar', {C: {(RE, 0): [(f, r(4)) for f in (1, N)], (RE, 2): [(1, r(0)), (10, r(-16)), (40, r(-16)), (N, r(0))]},
                   R: {(RE, 0): [(1, r(-6)), (12, r(-84)), (20, r(-76)), (28, r(-86)), (36, r(-76)), (44, r(-84)), (N, r(-6))], (RE, 1): [(f, r(8)) for f in (1, N)]},
                   L: {(RE, 0): sk(N, r(3), 1, 0.5), (RE, 1): [(f, r(-4)) for f in (1, N)]},
                   T: {(RE, 2): sk(N, r(14), 1)}, G: {(RE, 2): [(1, 0), (10, r(-8)), (40, r(-8)), (N, 0)]}})
sc.frame_start, sc.frame_end = 1, N

# --- conteo, exportación y retrato -------------------------------------------------------------------------------------------
meshes = [o for o in sc.objects if o.type == 'MESH']
print('TRIS', sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes), [(o.name, sum(len(p.vertices) - 2 for p in o.data.polygons)) for o in meshes])
if '--solo-captura' not in sys.argv:
    path = os.path.join(OUT, 'maestro_moon.glb'); os.makedirs(OUT, exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_yup=True, export_materials='EXPORT', export_apply=False,
                              export_animations=True, export_nla_strips=True, export_animation_mode='NLA_TRACKS', export_extras=True, export_cameras=False,
                              export_lights=False, export_texcoords=False)
    b = base64.b64encode(open(path, 'rb').read()).decode()
    open(os.path.join(OUT, 'maestro_moon_glb.js'), 'w').write('(window.AV_PERSONAJES_B64=window.AV_PERSONAJES_B64||{})["maestro_moon"]="%s";\n' % b)
    print('KB', os.path.getsize(path) // 1024)
for e in (L, R, C, T, G): e.animation_data_clear(); e.rotation_euler = (0, 0, 0); e.location = BASE[e]
w = bpy.data.worlds.new('w'); w.color = (0.93, 0.95, 0.92); sc.world = w
sc.render.engine = 'BLENDER_WORKBENCH'; sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'MATERIAL'; sc.display.shading.show_cavity = False
sc.render.resolution_x = sc.render.resolution_y = 512; sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 88
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); cam.data.type = 'ORTHO'; cam.data.clip_end = 50; sc.camera = cam
def shot(path, loc, tgt, scale=1.55):
    cam.data.ortho_scale = scale; cam.location = Vector(loc); d = Vector(tgt) - cam.location
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler(); sc.render.filepath = path; bpy.ops.render.render(write_still=True)
os.makedirs(IMG, exist_ok=True)
shot(os.path.join(IMG, 'moon_frente.jpg'), (2.2, -4.0, 1.0), (0, 0, 0.72), 1.9)
shot(os.path.join(IMG, 'moon_espalda.jpg'), (-2.2, 4.0, 1.0), (0, 0, 0.72), 1.9)
shot(os.path.join(IMG, 'moon_lado.jpg'), (5, 0, 0.8), (0, 0, 0.72), 1.9)
