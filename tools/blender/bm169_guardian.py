# BM169 paso 2: viste al Guardián del Primer Vuelo (Piloto Cotorra, mentor de vuelo): traje de piloto sin marcas y cabeza de OTRA especie
# que no es vittata. Opción A = amazona frentiazul (A. aestiva); opción B = amazona de corona amarilla (A. ochrocephala).
# Anima Idle y Hablar y exporta assets/models/personajes/guardian_vuelo.glb (+ _glb.js) con la opción A, más las capturas de las dos.
#   Blender -b /tmp/gv/base.blend --python tools/blender/bm169_guardian.py   (base.blend sale de bm169_guardian_base.py)
import bpy, bmesh, math, os, sys, base64
from mathutils import Vector, Euler
HERE = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(REPO, 'assets/models/personajes'); IMG = os.path.join(REPO, 'docs/img/bm169')
S = 1.4 / 9.34   # altura total 1,4 m
sc = bpy.context.scene
def hexrgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)
def mat(name, hexc, rough=0.8, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*hexrgb(hexc), 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    m.diffuse_color = (*hexrgb(hexc), 1); return m
M = {k: mat(k, *v) for k, v in dict(PLUMA=('#3f9a3c', 0.7), PLUMA2=('#2f7d33', 0.7), FRENTE=('#33b8d8', 0.6), CARA=('#f2c418', 0.6), CORONA=('#f2c418', 0.6),
     PICO=('#4a4743', 0.4), OJOS=('#15110f', 0.3), BRILLO=('#ffffff', 0.3), TRAJE=('#5b6b7a', 0.8), TRAJE2=('#3d4a57', 0.8), BOTA=('#2b2622', 0.7),
     GUANTE=('#3a3430', 0.7), CINTA=('#c9a45a', 0.6), GAFAS=('#a8a39a', 0.5, 0.3), CRISTAL=('#7fe3f0', 0.2), IRIS=('#e07a1c', 0.4)).items()}
O = bpy.data.objects
def cen(o, p): return sum((o.data.vertices[i].co for i in p.vertices), Vector()) / len(p.vertices)
def multi(o, names, fn):
    o.data.materials.clear()
    for n in names: o.data.materials.append(M[n])
    for p in o.data.polygons: p.material_index = fn(cen(o, p))
    for p in o.data.polygons: p.use_smooth = True
OPC = 'B' if '--opcion-b' in sys.argv else 'A'
def cabeza(c):
    if c.y < -1.35 and c.z < 7.55: return 'PICO'
    if OPC == 'A':
        if c.y < -0.8 and c.z > 8.25: return 'FRENTE'
        if c.y < -0.6 and c.z > 7.1: return 'CARA'
    else:
        if c.z > 8.3 and c.y < 0.4: return 'CORONA'
        if c.y < -0.5 and c.z < 7.5: return 'CARA'
    return 'PLUMA2' if c.y > 0.5 or c.z < 6.1 else 'PLUMA'
NAMES_C = ('PLUMA', 'PLUMA2', 'FRENTE', 'CARA', 'CORONA', 'PICO')
hd = O['Amazon parrots']; multi(hd, NAMES_C, lambda c: NAMES_C.index(cabeza(c)))
multi(O['Cuerpo'], ('TRAJE', 'BOTA', 'TRAJE2'), lambda c: 1 if c.z < 0.95 else (2 if (c.z > 5.1 or abs(c.x) > 1.0 or c.z < 1.8) else 0))
for n in ('Brazo.000', 'Brazo.001'): multi(O[n], ('TRAJE', 'GUANTE'), lambda c: 1 if c.z < 2.35 else 0)
hd.name = 'Cabeza3D'; O['Cuerpo'].name = 'Cuerpo'; O['Brazo.001'].name = 'BrazoL'; O['Brazo.000'].name = 'BrazoR'

def new(name, mname, bm_fn, bevel=0.0):
    me = bpy.data.meshes.new(name); bm = bmesh.new(); bm_fn(bm); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o); bpy.context.view_layer.objects.active = o
    for p in o.data.polygons: p.use_smooth = True
    o.data.materials.append(M[mname]); return o
def ell(c, r, seg=14):
    def f(bm):
        bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=max(6, seg // 2), radius=1.0)
        bmesh.ops.scale(bm, vec=r, verts=bm.verts); bmesh.ops.translate(bm, vec=c, verts=bm.verts)
    return f
EX, EY, EZ = 1.28, -0.35, 7.9
ojos = []
for n, sx in (('L', 1), ('R', -1)):
    ojos.append(new('Ojo' + n, 'OJOS', ell((sx * EX, EY, EZ), (0.3, 0.3, 0.3), 12)))
    ojos.append(new('Iris' + n, 'IRIS', ell((sx * (EX + 0.12), EY - 0.14, EZ), (0.14, 0.32, 0.32), 12)))
    ojos.append(new('Brillo' + n, 'BRILLO', ell((sx * (EX + 0.2), EY - 0.3, EZ + 0.1), (0.06, 0.1, 0.1), 8)))
def merge(name, objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); objs[0].name = name; return objs[0]
root = bpy.data.objects.new('GuardianVuelo', None); sc.collection.objects.link(root)
rig = bpy.data.objects.new('Rig', None); sc.collection.objects.link(rig)
cab = bpy.data.objects.new('Cabeza', None); cab.location = (0, 0, 5.4); sc.collection.objects.link(cab)
piv = {}
for nm, sg in (('BrazoL', 1), ('BrazoR', -1)):
    e = bpy.data.objects.new('Hombro' + nm[-1], None); e.location = (sg * 1.45, 0, 3.05); sc.collection.objects.link(e); piv[nm] = e
def par(o, p): o.parent = p; o.matrix_parent_inverse = p.matrix_world.inverted()
bpy.context.view_layer.update()
par(rig, root)
for o in (cab, piv['BrazoL'], piv['BrazoR'], O['Cuerpo']): par(o, rig)
for o in [hd] + ojos: par(o, cab)
for nm in ('BrazoL', 'BrazoR'): par(O[nm], piv[nm])
root.scale = (S, S, S)
root['fuente'] = 'Modelo propio de Kelvin (Piloto Cotorra.blend), repintado: especie distinta de vittata, traje sin marcas'
root['personaje'] = 'Guardián del Primer Vuelo'; root['opcion'] = OPC

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
        ad = o.animation_data; tr = ad.nla_tracks.new(); tr.name = name; st = tr.strips.new(name, 1, ad.action); st.name = name; ad.action = None
def sk(n, amp, per=1.0, ph=0.0, base=0.0):
    return [(1 + round(i * (n - 1) / 8), base + amp * math.sin(2 * math.pi * (i / 8 * per) + ph)) for i in range(9)]
BASE = {o: o.location.copy() for o in (piv['BrazoL'], piv['BrazoR'], cab, rig)}
N = 49; r = math.radians; RE, LO = 'rotation_euler', 'location'
L, R, C, G = piv['BrazoL'], piv['BrazoR'], cab, rig
action('Idle', {C: {(RE, 0): sk(N, r(2)), (RE, 2): sk(N, r(5), 1, 1.2)},
                L: {(RE, 0): sk(N, r(3), 1, 0.5), (RE, 1): [(f, r(-3)) for f in (1, N)]},
                R: {(RE, 0): sk(N, r(3), 1, 2.5), (RE, 1): [(f, r(3)) for f in (1, N)]}, G: {(LO, 2): sk(N, 0.05, 2)}})
action('Hablar', {C: {(RE, 0): sk(N, r(8), 4, 0, r(-3)), (RE, 2): sk(N, r(7), 2)},
                  R: {(RE, 0): sk(N, r(10), 2, 0, r(-35)), (RE, 1): [(f, r(14)) for f in (1, N)]},
                  L: {(RE, 0): sk(N, r(3), 1, 0.5), (RE, 1): [(f, r(-3)) for f in (1, N)]}, G: {(LO, 2): sk(N, 0.06, 4)}})
sc.frame_start, sc.frame_end = 1, N

meshes = [o for o in sc.objects if o.type == 'MESH']
print('TRIS', sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes))
if '--solo-captura' not in sys.argv:
    path = os.path.join(OUT, 'guardian_vuelo.glb'); os.makedirs(OUT, exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_yup=True, export_materials='EXPORT', export_apply=False,
                              export_animations=True, export_nla_strips=True, export_animation_mode='NLA_TRACKS', export_extras=True, export_cameras=False,
                              export_lights=False, export_texcoords=False)
    b = base64.b64encode(open(path, 'rb').read()).decode()
    open(os.path.join(OUT, 'guardian_vuelo_glb.js'), 'w').write('(window.AV_PERSONAJES_B64=window.AV_PERSONAJES_B64||{})["guardian_vuelo"]="%s";\n' % b)
    print('KB', os.path.getsize(path) // 1024)
for e in (L, R, C, G): e.animation_data_clear(); e.rotation_euler = (0, 0, 0); e.location = BASE[e]
w = bpy.data.worlds.new('w'); w.color = (0.93, 0.95, 0.92); sc.world = w
sc.render.engine = 'BLENDER_WORKBENCH'; sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'MATERIAL'; sc.display.shading.show_cavity = False
sc.render.resolution_x = sc.render.resolution_y = 512; sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 88
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); cam.data.type = 'ORTHO'; cam.data.clip_end = 50; sc.camera = cam
def shot(path, loc, tgt, scale=1.75):
    cam.data.ortho_scale = scale; cam.location = Vector(loc); d = Vector(tgt) - cam.location
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler(); sc.render.filepath = path; bpy.ops.render.render(write_still=True)
os.makedirs(IMG, exist_ok=True); t = OPC.lower()
shot(os.path.join(IMG, 'opcion_%s_frente.jpg' % t), (2.2, -4.0, 1.0), (0, 0, 0.7))
shot(os.path.join(IMG, 'opcion_%s_lado.jpg' % t), (-5, -0.3, 0.8), (0, 0, 0.7))
shot(os.path.join(IMG, 'opcion_%s_cabeza.jpg' % t), (1.0, -2.5, 1.35), (0, 0, 1.2), 0.6)
