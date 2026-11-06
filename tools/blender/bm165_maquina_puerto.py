"""BM165: máquina de obra de la misión del puerto (un solo glb, 2 estados por mallas).
Uso: blender -b -P tools/blender/bm165_maquina_puerto.py   (desde la raíz del repo)
Convención: delante = +X (Blender). Mallas 'Bloqueando_*' y 'Reconvertida_*' se encienden/apagan;
'Engranaje' y 'Palanca' giran sobre su propio origen."""
import bpy, math, base64, os
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
M = {}
def mat(n, c, e=0.0):
    if n in M: return M[n]
    m = bpy.data.materials.new(n); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*[((int(c[i:i+2], 16)) / 255) ** 2.2 for i in (1, 3, 5)], 1)
    b.inputs['Roughness'].default_value = 0.7; b.inputs['Metallic'].default_value = 0.0
    if e:
        b.inputs['Emission Color'].default_value = b.inputs['Base Color'].default_value; b.inputs['Emission Strength'].default_value = e
    M[n] = m; return m
def fin(o, n, m, parent=None):
    o.name = n; o.data.name = n; o.data.materials.append(mat(*m) if isinstance(m, tuple) else m)
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.shade_flat(); o.select_set(False)
    if parent: o.parent = parent
    return o
def caja(n, s, l, m, rot=(0, 0, 0), p=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=l, rotation=rot); o = bpy.context.object; o.scale = s
    bpy.ops.object.transform_apply(scale=True); return fin(o, n, m, p)
def cil(n, r, h, l, m, rot=(0, 0, 0), v=12, p=None, r2=None):
    bpy.ops.mesh.primitive_cone_add(vertices=v, radius1=r, radius2=r if r2 is None else r2, depth=h, location=l, rotation=rot)
    return fin(bpy.context.object, n, m, p)
def esf(n, r, l, m, sc=(1, 1, 1), p=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=6, radius=r, location=l); o = bpy.context.object
    o.scale = sc; bpy.ops.object.transform_apply(scale=True); return fin(o, n, m, p)
H = math.pi / 2
GRIS, GRIS2, NEGRO, AMA = ('Gris', '#8d949b'), ('GrisOscuro', '#3b4046'), ('Negro', '#202225'), ('Amarillo', '#f2c230')
METAL, ROJO = ('Metal', '#b8c0c6'), ('Rojo', '#c8322a')
raiz = bpy.data.objects.new('MaquinaPuerto', None); bpy.context.collection.objects.link(raiz)
# --- común: chasis, orugas, tanque, chimenea, brazo de la broca, panel, palanca, engranaje, franjas
caja('Chasis', (2.2, 1.7, 0.7), (0, 0, 0.75), GRIS, p=raiz)
for s in (-0.95, 0.95):
    caja('Oruga', (2.7, 0.4, 0.55), (0, s, 0.3), GRIS2, p=raiz)
    for x in (-1.1, 0, 1.1): cil('Rueda', 0.26, 0.44, (x, s, 0.3), METAL, rot=(H, 0, 0), v=8, p=raiz)
cil('Tanque', 0.45, 1.2, (-0.3, 0, 1.95), METAL, rot=(0, H, 0), v=10, p=raiz)
cil('Chimenea', 0.17, 1.0, (-0.8, -0.5, 2.3), GRIS2, v=8, p=raiz, r2=0.14)
cil('ChimeneaBoca', 0.21, 0.1, (-0.8, -0.5, 2.82), NEGRO, v=8, p=raiz)
caja('Panel', (0.6, 0.06, 0.45), (0.3, -0.93, 1.2), GRIS2, p=raiz)
cil('Broca', 0.35, 1.2, (1.75, 0, 0.75), METAL, rot=(0, H, 0), v=10, p=raiz, r2=0.02)
for i in range(3): cil('BrocaFiletea', 0.3 - i * 0.08, 0.06, (1.45 + i * 0.3, 0, 0.75), GRIS2, rot=(0, H, 0), v=10, p=raiz)
# franjas de aviso (amarillo/negro) en frente y trasera
for x in (-1.11, 1.11):
    for i in range(5): caja('Franja', (0.03, 0.3, 0.16), (x, -0.6 + i * 0.3, 0.62), AMA if i % 2 == 0 else NEGRO, p=raiz)
# engranaje (pivote propio, gira en X)
eng = bpy.data.objects.new('Engranaje', None); eng.location = (1.18, 0, 1.35); eng.parent = raiz; bpy.context.collection.objects.link(eng)
cil('EngranajeDisco', 0.6, 0.22, (0, 0, 0), METAL, rot=(0, H, 0), v=16, p=eng).location = (1.18, 0, 1.35)
d = bpy.data.objects['EngranajeDisco']; d.parent = eng; d.location = (0, 0, 0)
for i in range(10):
    a = i / 10 * math.tau
    c = caja('EngranajeDiente', (0.22, 0.2, 0.22), (0, math.cos(a) * 0.68, math.sin(a) * 0.68), METAL, rot=(a, 0, 0), p=eng)
# palanca de freno (pivote en la base)
pal = bpy.data.objects.new('Palanca', None); pal.location = (-1.1, 0.55, 1.1); pal.rotation_euler = (0, 0.4, 0); pal.parent = raiz; bpy.context.collection.objects.link(pal)
cil('PalancaVarilla', 0.05, 0.9, (0, 0, 0.45), ROJO, v=6, p=pal); esf('PalancaPomo', 0.11, (0, 0, 0.92), ROJO, p=pal)
# --- pintura según estado: cabina, capó y guardabarros
def pintura(pref, m):
    caja(pref + '_Cabina', (1.0, 1.5, 0.95), (-0.5, 0, 1.55), m, p=raiz)
    caja(pref + '_Capo', (1.0, 1.55, 0.35), (0.65, 0, 1.15), m, p=raiz)
    for s in (-0.97, 0.97): caja(pref + '_Guardabarros', (2.5, 0.12, 0.08), (0, s * 1.0, 0.62), m, p=raiz)
    caja(pref + '_Techo', (1.15, 1.65, 0.1), (-0.5, 0, 2.08), GRIS2 if pref == 'Bloqueando' else ('VerdeOscuro', '#2c6b34'), p=raiz)
pintura('Bloqueando', AMA); pintura('Reconvertida', ('Verde', '#4aa84f'))
# ventana
caja('Ventana', (0.5, 1.2, 0.4), (0.02, 0, 1.6), ('Cristal', '#9fd3e6'), p=raiz)
# --- Bloqueando: humo, luces de alarma rojas
for i, (x, y, z, r) in enumerate([(-0.8, -0.5, 3.0, 0.2), (-0.65, -0.45, 3.35, 0.28), (-0.45, -0.4, 3.75, 0.36), (-0.2, -0.3, 4.2, 0.3)]):
    esf('Bloqueando_Humo%d' % i, r, (x, y, z), ('Humo', '#6f7479'), sc=(1, 1, 0.85), p=raiz)
esf('Bloqueando_LuzAlarma', 0.14, (-0.6, 0.55, 2.2), ('LuzRoja', '#ff3b2e', 4), p=raiz)
esf('Bloqueando_LuzAlarma2', 0.14, (-0.6, -0.55, 2.2), ('LuzRoja', '#ff3b2e', 4), p=raiz)
# --- Reconvertida: maceta con flores, farol y luz verde
cil('Reconvertida_Maceta', 0.42, 0.45, (-0.3, 0, 2.7), ('Barro', '#b5643c'), v=10, r2=0.32, p=raiz)
esf('Reconvertida_Hojas', 0.48, (-0.3, 0, 3.15), ('Hojas', '#3f8f3a'), sc=(1, 1, 0.75), p=raiz)
for i in range(6):
    a = i * 1.05
    esf('Reconvertida_Flor%d' % i, 0.1, (-0.3 + math.cos(a) * 0.36, math.sin(a) * 0.36, 3.3 + (i % 2) * 0.1), ('Flor%d' % (i % 3), ['#ff6fa8', '#ffd23a', '#ffffff'][i % 3]), p=raiz)
cil('Reconvertida_FarolPoste', 0.045, 1.2, (0.8, 0.8, 2.7), NEGRO, v=6, p=raiz)
esf('Reconvertida_FarolLuz', 0.17, (0.8, 0.8, 3.38), ('LuzFarol', '#ffe08a', 5), p=raiz)
esf('Reconvertida_LuzVerde', 0.14, (-0.6, 0.55, 2.2), ('LuzVerde', '#46e06a', 4), p=raiz)
# --- exportar
tris = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')  # aprox (quads/ngons)
out = 'assets/models/personajes/maquina_puerto.glb'
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_yup=True, export_apply=True)
b = open(out, 'rb').read()
open('assets/models/personajes/maquina_puerto_glb.js', 'w').write('(window.AV_PERSONAJES_B64=window.AV_PERSONAJES_B64||{})["maquina_puerto"]="' + base64.b64encode(b).decode() + '"\n')
dg = bpy.context.evaluated_depsgraph_get()
t = 0
for o in bpy.data.objects:
    if o.type == 'MESH':
        me = o.evaluated_get(dg).to_mesh(); me.calc_loop_triangles(); t += len(me.loop_triangles)
print('BM165 tris', t, 'bytes', len(b))
# --- capturas
sc = bpy.context.scene; sc.render.engine = 'BLENDER_EEVEE_NEXT' if hasattr(bpy.types, 'SceneEEVEE') else 'BLENDER_EEVEE'
try: sc.render.engine = 'BLENDER_EEVEE_NEXT'
except Exception: sc.render.engine = 'BLENDER_WORKBENCH'
sc.render.resolution_x, sc.render.resolution_y = 900, 700
w = bpy.data.worlds.new('w'); w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.62, 0.78, 0.9, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 1.0; sc.world = w
sol = bpy.data.lights.new('sol', 'SUN'); sol.energy = 4; so = bpy.data.objects.new('sol', sol); so.rotation_euler = (0.9, 0.2, 0.7); bpy.context.collection.objects.link(so)
caja('Suelo', (12, 12, 0.1), (0, 0, -0.05), ('Suelo', '#8a7a5c'))
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); bpy.context.collection.objects.link(cam); sc.camera = cam
cam.location = (5.8, 6.2, 3.8); d = Vector((0, 0, 1.7)) - cam.location; cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
for estado, pref, otro in (('bloqueando', 'Bloqueando', 'Reconvertida'), ('reconvertida', 'Reconvertida', 'Bloqueando')):
    for o in bpy.data.objects:
        if o.name.startswith(otro + '_'): o.hide_render = True
        if o.name.startswith(pref + '_'): o.hide_render = False
    sc.render.filepath = os.path.abspath('docs/img/bm165/maquina_%s.png' % estado); bpy.ops.render.render(write_still=True)
