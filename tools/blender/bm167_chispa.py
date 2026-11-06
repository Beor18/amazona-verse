# BM167 paso 2: viste a Chispa (shiba piloto, rival amistoso y cómico): colores lisos, orejas, cola, gafas de piloto y lengua propias,
# anima Idle/Correr/Celebrar y exporta assets/models/personajes/chispa.glb (+ _glb.js) y el retrato.
#   Blender -b /tmp/chi/base.blend --python tools/blender/bm167_chispa.py   (base.blend sale de bm167_chispa_base.py)
import bpy, bmesh, math, os, sys, base64
from mathutils import Vector, Euler
HERE = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(REPO, 'assets/models/personajes'); IMG = os.path.join(REPO, 'docs/img/bm167')
S = 1.25 / 10.4   # altura total 1,25 m (cotorra de 1,4 m a su lado; cabezón tipo figura)
sc = bpy.context.scene
def hexrgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)
def mat(name, hexc, rough=0.8, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*hexrgb(hexc), 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    m.diffuse_color = (*hexrgb(hexc), 1); return m
M = {k: mat(k, *v) for k, v in dict(PELO=('#e0903a',), CREMA=('#f6e6c8',), TRAJE=('#2c3e63',), NEON=('#27c6d9', 0.4), RODILLERA=('#c3cad1', 0.5),
     OJOS=('#15110f', 0.3), BRILLO=('#ffffff', 0.3), NARIZ=('#1b1412', 0.4), LENGUA=('#e8637a',), GAFAS=('#ff6a2b', 0.5), CRISTAL=('#7fe3f0', 0.2),
     BOTA=('#f6e6c8',), ORELLA=('#f2b0a0',)).items()}
def setm(o, m): o.data.materials.clear(); o.data.materials.append(M[m]); return o
def multi(o, names, fn):
    o.data.materials.clear()
    for n in names: o.data.materials.append(M[n])
    for p in o.data.polygons:
        c = sum((o.data.vertices[i].co for i in p.vertices), Vector()) / len(p.vertices); p.material_index = fn(c)
O = bpy.data.objects
setm(O['Cuerpo'], 'TRAJE'); setm(O['Head'], 'PELO'); setm(O['Cube.004'], 'CREMA'); setm(O['Cube.003'], 'NEON')
for n in ('Cube.001', 'Cube.002'): setm(O[n], 'RODILLERA')
for n in ('Sphere', 'Sphere.001', 'Cejas Rigth', 'Cejas Rigth.001'): setm(O[n], 'OJOS')
O['Cuerpo'].name = 'Cuerpo'; O['Head'].name = 'Cara'; O['Cube.004'].name = 'Hocico'; O['Cube.003'].name = 'Cremallera'
O['Sphere'].name = 'OjoL'; O['Sphere.001'].name = 'OjoR'; O['Cejas Rigth'].name = 'CejaL'; O['Cejas Rigth.001'].name = 'CejaR'
O['Brazo.001'].name = 'BrazoL'; O['Brazo.000'].name = 'BrazoR'
for n in ('Cube.001', 'Cube.002'): O[n].name = 'Rodillera' + n[-1]
# botas y manos de pelo crema; cuello y cinturón con vivos de neón
multi(O['Cuerpo'], ('TRAJE', 'BOTA', 'NEON'), lambda c: 1 if c.z < 1.0 else (2 if c.z > 5.95 else 0))
for n in ('BrazoL', 'BrazoR'): multi(O[n], ('TRAJE', 'CREMA'), lambda c: 1 if c.z < 2.3 else 0)
# mejillas y vientre crema en la cara: la mitad inferior frontal del Head
multi(O['Cara'], ('PELO', 'CREMA'), lambda c: 1 if (c.y < -0.6 and c.z < 7.0) else 0)

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

# --- piezas propias --------------------------------------------------------------------------------------------------------
orejas = []
for sg, n in ((1, 'L'), (-1, 'R')):
    ex = new('oe' + n, 'PELO', cone((sg * 1.75, 0.1, 10.5), 0.95, 0.12, 1.9, ry=sg * math.radians(14)), bevel=0.1)
    ei = new('oi' + n, 'ORELLA', cone((sg * 1.72, -0.2, 10.4), 0.6, 0.08, 1.5, ry=sg * math.radians(14)), bevel=0.05)
    orejas.append(merge('Oreja' + n, 'PELO', [ex, ei]))
    orejas[-1].data.materials.clear(); orejas[-1].data.materials.append(M['PELO']); orejas[-1].data.materials.append(M['ORELLA'])
    for p in orejas[-1].data.polygons:
        c = sum((orejas[-1].data.vertices[i].co for i in p.vertices), Vector()) / len(p.vertices); p.material_index = 1 if c.y < -0.15 else 0
nariz = new('Nariz', 'NARIZ', ell((0, -2.4, 6.75), (0.42, 0.3, 0.27), 12))
lengua = new('Lengua', 'LENGUA', ell((0.0, -2.2, 5.55), (0.45, 0.3, 0.75), 10))   # cómica, colgando de la boca
brillos = [new('br' + n, 'BRILLO', ell((sx, -2.12, 7.45), (0.15, 0.08, 0.15), 8)) for n, sx in (('L', 1.45), ('R', -1.45))]
# gafas de piloto subidas a la frente
banda = new('ga_b', 'GAFAS', box((0, -0.1, 9.3), (4.7, 3.9, 0.3), 0), bevel=0.1)
lentes = [new('ga_l%d' % i, 'CRISTAL', ell((sx, -2.0, 9.4), (0.95, 0.35, 0.65), 12)) for i, sx in enumerate((1.05, -1.05))]
marcos = [new('ga_m%d' % i, 'GAFAS', ell((sx, -1.95, 9.4), (1.1, 0.3, 0.8), 12)) for i, sx in enumerate((1.05, -1.05))]
gafas = merge('Gafas', 'GAFAS', [banda] + marcos + lentes)
gafas.data.materials.clear(); gafas.data.materials.append(M['GAFAS']); gafas.data.materials.append(M['CRISTAL'])
for p in gafas.data.polygons:
    c = sum((gafas.data.vertices[i].co for i in p.vertices), Vector()) / len(p.vertices); p.material_index = 1 if (c.y < -2.2 and abs(c.x) > 0.2) else 0
# cola enroscada
cola_p = [new('c1', 'PELO', ell((0, 0.9, 0.35), (0.65, 0.65, 0.95), 10, rx=math.radians(-40))), new('c2', 'PELO', ell((0, 1.5, 1.15), (0.7, 0.7, 0.8), 10, rx=math.radians(-10))),
          new('c3', 'CREMA', ell((0, 1.5, 1.85), (0.62, 0.62, 0.55), 10))]
cola = merge('Cola', 'PELO', cola_p)
cola.data.materials.clear(); cola.data.materials.append(M['PELO']); cola.data.materials.append(M['CREMA'])
for p in cola.data.polygons:
    c = sum((cola.data.vertices[i].co for i in p.vertices), Vector()) / len(p.vertices); p.material_index = 1 if c.z > 1.8 else 0
for o in (O['CejaL'], O['CejaR']): pass

# --- jerarquía y pivotes ---------------------------------------------------------------------------------------------------
root = bpy.data.objects.new('Chispa', None); sc.collection.objects.link(root)
rig = bpy.data.objects.new('Rig', None); sc.collection.objects.link(rig)
cab = bpy.data.objects.new('Cabeza', None); cab.location = (0, 0, 5.7); sc.collection.objects.link(cab)
colap = bpy.data.objects.new('ColaPivote', None); colap.location = (0, 1.0, 2.6); sc.collection.objects.link(colap)
piv = {}
for nm, sg in (('BrazoL', 1), ('BrazoR', -1)):
    e = bpy.data.objects.new('Hombro' + nm[-1], None); e.location = (sg * 1.65, 0, 2.95); sc.collection.objects.link(e); piv[nm] = e
def par(o, p):
    o.parent = p; o.matrix_parent_inverse = p.matrix_world.inverted()
bpy.context.view_layer.update()
par(rig, root)
for o in (cab, colap, piv['BrazoL'], piv['BrazoR']): par(o, rig)
for n in ('Cuerpo', 'Rodillera1', 'Rodillera2', 'Cremallera'): par(O[n], rig)
for o in [O['Cara'], O['Hocico'], O['OjoL'], O['OjoR'], O['CejaL'], O['CejaR'], nariz, lengua, gafas] + orejas + brillos: par(o, cab)
par(cola, colap)
for nm in ('BrazoL', 'BrazoR'): par(O[nm], piv[nm])
root.scale = (S, S, S)
root['fuente'] = 'Modelo propio de Kelvin (Piloto CiberPunk Dog Shiba.blend), sin camiseta ni textura externa: colores lisos'
root['personaje'] = 'Chispa'

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
action('Correr', {G: {(LO, 2): [(f, abs(0.35 * math.sin(2 * math.pi * (f - 1) / 24 * 1.0))) for f in range(1, N + 1, 3)] + [(N, 0.0)], (RE, 0): [(f, r(-14)) for f in (1, N)]},
                  C: {(RE, 0): [(f, r(12)) for f in (1, N)], (RE, 1): sk(N, r(5), 2)},
                  R: {(RE, 0): sk(N, r(62), 2, 0.0), (RE, 1): [(f, r(8)) for f in (1, N)]},
                  L: {(RE, 0): sk(N, r(62), 2, 0.5), (RE, 1): [(f, r(-8)) for f in (1, N)]},
                  T: {(RE, 2): sk(N, r(30), 4), (RE, 0): [(f, r(28)) for f in (1, N)]}})
action('Celebrar', {G: {(LO, 2): [(f, abs(0.9 * math.sin(2 * math.pi * (f - 1) / 24 * 1.0))) for f in range(1, N + 1, 3)] + [(N, 0.0)]},
                    C: {(RE, 0): sk(N, r(6), 2, 0.0, r(-8)), (RE, 1): sk(N, r(12), 2)},
                    R: {(RE, 0): sk(N, r(14), 2, 0.0, r(-165)), (RE, 1): [(f, r(14)) for f in (1, N)]},
                    L: {(RE, 0): sk(N, r(14), 2, 0.5, r(-165)), (RE, 1): [(f, r(-14)) for f in (1, N)]},
                    T: {(RE, 2): sk(N, r(40), 6)}})
sc.frame_start, sc.frame_end = 1, N

# --- conteo, exportación y retrato -------------------------------------------------------------------------------------------
meshes = [o for o in sc.objects if o.type == 'MESH']
print('TRIS', sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes), [(o.name, sum(len(p.vertices) - 2 for p in o.data.polygons)) for o in meshes])
if '--solo-captura' not in sys.argv:
    path = os.path.join(OUT, 'chispa.glb'); os.makedirs(OUT, exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_yup=True, export_materials='EXPORT', export_apply=False,
                              export_animations=True, export_nla_strips=True, export_animation_mode='NLA_TRACKS', export_extras=True, export_cameras=False,
                              export_lights=False, export_texcoords=False)
    b = base64.b64encode(open(path, 'rb').read()).decode()
    open(os.path.join(OUT, 'chispa_glb.js'), 'w').write('(window.AV_PERSONAJES_B64=window.AV_PERSONAJES_B64||{})["chispa"]="%s";\n' % b)
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
shot(os.path.join(IMG, 'chispa_frente.jpg'), (2.2, -4.0, 1.0), (0, 0, 0.62))
shot(os.path.join(IMG, 'chispa_espalda.jpg'), (-2.2, 4.0, 1.0), (0, 0, 0.62))
shot(os.path.join(IMG, 'chispa_lado.jpg'), (5, 0, 0.8), (0, 0, 0.62))
