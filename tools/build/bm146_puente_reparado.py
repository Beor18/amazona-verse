# BM146: variante «reparado» del puente colgante (puente.glb -> puente_reparado.glb + puente_reparado_glb.js): tablas claras de madera nueva,
# cuerdas nuevas y cable tenso (menos comba). Mismo origen, encuadre y materiales (solo cambian colores) que puente.glb.
# Blender -b -P tools/build/bm146_puente_reparado.py   (desde la raíz del repo)
import bpy, bmesh, base64, sys
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="assets/models/mapa/puente.glb")
o = [o for o in bpy.data.objects if o.type == 'MESH'][0]
def color(nombre, rgb):
    m = [s.material for s in o.material_slots if s.material.name == nombre][0]
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*rgb, 1.0)
color('AV_Madera_Tablones', (0.62, 0.38, 0.15, ))   # madera nueva, clara
color('AV_Soga', (0.85, 0.72, 0.45))                # cuerda nueva
color('AV_Cable_Acero', (0.42, 0.46, 0.50))         # cable limpio
# Cable y pasamanos (soga alta) tensos: se sube la comba hacia la cuerda recta entre torres.
SUBE, XT = 1.1, 12.4
bm = bmesh.new(); bm.from_mesh(o.data)
tipo = lambda v: {o.material_slots[f.material_index].material.name for f in v.link_faces}
for v in bm.verts:
    t = tipo(v); x = abs(v.co.x)
    if x >= XT: continue
    k = max(0.0, 1 - (x / XT) ** 2)
    if 'AV_Cable_Acero' in t and v.co.z > 0.1: v.co.z += SUBE * k
    elif 'AV_Soga' in t and v.co.z > 0.2: v.co.z += SUBE * k * min(1.0, (v.co.z - 0.2) / 0.5)
bm.to_mesh(o.data); bm.free()
bpy.ops.export_scene.gltf(filepath="assets/models/mapa/puente_reparado.glb", export_format='GLB', export_yup=True, export_apply=True)
b = open("assets/models/mapa/puente_reparado.glb", "rb").read()
open("assets/models/mapa/puente_reparado_glb.js", "w").write('(window.AV_MAPA_B64=window.AV_MAPA_B64||{})["puente_reparado"]="' + base64.b64encode(b).decode() + '"\n')
print("BM146 caras", len(o.data.polygons), "bytes", len(b))
