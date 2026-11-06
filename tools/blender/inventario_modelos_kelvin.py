"""BM158: inventario de un .blend (stats en JSON) y render frontal 512x512.
Uso: blender -b <archivo.blend> -P inventario_modelos_kelvin.py -- <salida.jpg> <salida.json>"""
import bpy, sys, json, math, os
from mathutils import Vector
out_jpg, out_json = sys.argv[sys.argv.index('--')+1:][:2]
sc = bpy.context.scene
meshes = [o for o in sc.objects if o.type == 'MESH']
dg = bpy.context.evaluated_depsgraph_get()
tris = 0; verts = []
for o in meshes:
    e = o.evaluated_get(dg); m = e.to_mesh()
    tris += sum(len(p.vertices) - 2 for p in m.polygons)
    verts += [o.matrix_world @ v.co for v in m.vertices]
    e.to_mesh_clear()
if verts:
    mn = Vector((min(v.x for v in verts), min(v.y for v in verts), min(v.z for v in verts)))
    mx = Vector((max(v.x for v in verts), max(v.y for v in verts), max(v.z for v in verts)))
else:
    mn = mx = Vector((0, 0, 0))
imgs = [(i.name, bool(i.packed_file) or os.path.exists(bpy.path.abspath(i.filepath))) for i in bpy.data.images if i.type == 'IMAGE' and i.name not in ('Render Result', 'Viewer Node')]
info = {
    'objetos': len(sc.objects), 'mallas': len(meshes), 'tris': tris,
    'nombres': [o.name for o in meshes][:40],
    'armaduras': [o.name for o in sc.objects if o.type == 'ARMATURE'],
    'huesos': sum(len(o.data.bones) for o in sc.objects if o.type == 'ARMATURE'),
    'acciones': [a.name for a in bpy.data.actions],
    'materiales': len(bpy.data.materials),
    'texturas': imgs, 'faltan': [n for n, ok in imgs if not ok],
    'dim': [round(mx[i]-mn[i], 3) for i in range(3)],
    'modificadores': sorted({m.type for o in meshes for m in o.modifiers}),
}
json.dump(info, open(out_json, 'w'), ensure_ascii=False)
if not verts: sys.exit()
c = (mn + mx) / 2; size = max(mx - mn)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam)
cam.data.type = 'ORTHO'; cam.data.ortho_scale = size * 1.25
cam.data.clip_end = size * 20
cam.location = c + Vector((0, -size * 3, 0)); cam.rotation_euler = (math.pi/2, 0, 0)
sc.camera = cam
sc.render.engine = 'BLENDER_WORKBENCH'
sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'TEXTURE'
sc.render.resolution_x = sc.render.resolution_y = 512; sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 85
sc.render.film_transparent = False
w = sc.world or bpy.data.worlds.new('w'); sc.world = w
w.color = (0.8, 0.82, 0.85)
sc.render.filepath = out_jpg
bpy.ops.render.render(write_still=True)
