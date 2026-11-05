# BM148: piedra_recogible.glb y fibra_recogible.glb (+ _glb.js) en assets/models/mapa/, ligeros (<600 tris), estilo toon liso de las maderas del puente.
# Blender -b -P tools/build/bm148_recogibles.py   (desde la raíz del repo). Origen en el suelo (z=0), ~0.5 m de ancho.
import bpy, bmesh, base64, math, random
from mathutils import Vector
OUT = "assets/models/mapa/"
def mat(nombre, rgb, rug=0.9):
    m = bpy.data.materials.new(nombre); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*rgb, 1.0); b.inputs['Roughness'].default_value = rug; m.diffuse_color = (*rgb, 1.0)
    return m
def limpiar():
    bpy.ops.wm.read_factory_settings(use_empty=True)
def unir(objs, nombre):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join(); o = bpy.context.active_object; o.name = nombre
    for p in o.data.polygons: p.use_smooth = False
    return o
def roca(centro, r, semilla, m, aplast=0.7):
    random.seed(semilla)
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=r)
    for v in bm.verts:
        v.co *= random.uniform(0.78, 1.15); v.co.z *= aplast
    bm.verts.ensure_lookup_table()
    for v in bm.verts: v.co += Vector(centro) + Vector((0, 0, r * aplast * 0.55))
    me = bpy.data.meshes.new("r"); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new("r", me); bpy.context.collection.objects.link(o); me.materials.append(m); return o
def cil(centro, rx, alto, rot, m, seg=5, punta=0.0):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=rx, radius2=rx * punta, depth=alto)
    me = bpy.data.meshes.new("c"); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new("c", me); bpy.context.collection.objects.link(o); me.materials.append(m)
    o.rotation_euler = rot if len(rot) == 3 else rot.to_euler(); o.location = centro; bpy.context.view_layer.update()
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True); return o
def exportar(o, nombre):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
    ruta = OUT + nombre + ".glb"
    bpy.ops.export_scene.gltf(filepath=ruta, export_format='GLB', export_yup=True, export_apply=True, use_selection=True)
    b = open(ruta, "rb").read()
    open(OUT + nombre + "_glb.js", "w").write('(window.AV_MAPA_B64=window.AV_MAPA_B64||{})["' + nombre + '"]="' + base64.b64encode(b).decode() + '"\n')
    tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
    print("BM148", nombre, "tris", tris, "bytes", len(b)); return tris
def captura(o, png, alto=0.12, dist=1.0):
    sc = bpy.context.scene
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
    cam.location = (0.7 * dist, -0.85 * dist, alto + 0.55 * dist); d = Vector((0, 0, alto)) - cam.location
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    sol = bpy.data.objects.new("sol", bpy.data.lights.new("sol", 'SUN')); sol.data.energy = 4
    sol.rotation_euler = (math.radians(50), 0, math.radians(35)); sc.collection.objects.link(sol)
    w = bpy.data.worlds.new("w"); w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.62, 0.8, 0.9, 1)
    sc.world = w
    sc.render.engine = 'BLENDER_WORKBENCH'; sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'MATERIAL'
    sc.render.resolution_x = 640; sc.render.resolution_y = 480; sc.render.filepath = png
    bpy.ops.render.render(write_still=True)
# --- piedra: 3 cantos rodados grises/ocres apilados
limpiar()
g1, g2, g3 = mat('AV_Piedra_Gris', (0.42, 0.42, 0.40)), mat('AV_Piedra_Ocre', (0.55, 0.47, 0.34)), mat('AV_Piedra_Clara', (0.62, 0.60, 0.55))
p = unir([roca((0, 0, 0), 0.15, 1, g1), roca((0.2, 0.08, 0), 0.11, 2, g2), roca((-0.06, 0.17, 0), 0.09, 3, g3, 0.8),
          roca((0.07, 0.03, 0.13), 0.08, 4, g3, 0.9)], "piedra_recogible")
t1 = exportar(p, "piedra_recogible"); captura(p, "/tmp/bm148_piedra.png")
# --- fibra: manojo de tallos atados con una cuerda
limpiar()
v1, v2, cu = mat('AV_Fibra_Verde', (0.45, 0.62, 0.22)), mat('AV_Fibra_Seca', (0.78, 0.66, 0.34)), mat('AV_Soga', (0.55, 0.38, 0.18))
random.seed(7); ob = []
for i in range(9):
    a = i / 9 * math.tau; rad = 0.05 + 0.03 * (i % 3)
    abre = 0.28 + 0.1 * (i % 2); h = 0.50 + 0.1 * (i % 4)
    cx, cy = math.cos(a) * rad, math.sin(a) * rad
    ob.append(cil((cx + math.cos(a) * math.sin(abre) * h / 2, cy + math.sin(a) * math.sin(abre) * h / 2, math.cos(abre) * h / 2),
                  0.018, h, Vector((math.cos(a) * math.sin(abre), math.sin(a) * math.sin(abre), math.cos(abre))).to_track_quat('Z', 'Y'), v1 if i % 3 else v2, 5, 0.35))
# atadura (anillo cónico corto) y base cortada
ob.append(cil((0, 0, 0.13), 0.085, 0.05, (0, 0, 0), cu, 8, 0.85))
f = unir(ob, "fibra_recogible")
t2 = exportar(f, "fibra_recogible"); captura(f, "/tmp/bm148_fibra.png", 0.3, 1.5)
assert t1 < 600 and t2 < 600
