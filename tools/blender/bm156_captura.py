"""BM156: captura 3/4 de un glb con Blender (Workbench). Blender -b --python bm156_captura.py -- <glb> <png>"""
import sys, math
import bpy
from mathutils import Vector
glb, png = sys.argv[sys.argv.index('--') + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)
ms = [o for o in bpy.data.objects if o.type == 'MESH']
pts = [o.matrix_world @ Vector(c) for o in ms for c in o.bound_box]
mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
c = (mn + mx) / 2
r = max((mx - mn).length, 1)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
bpy.context.scene.collection.objects.link(cam)
cam.location = c + Vector((r * 0.9, -r * 0.9, r * 0.6))
cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler()
bpy.context.scene.camera = cam
s = bpy.context.scene
s.render.engine = 'BLENDER_WORKBENCH'
s.display.shading.light = 'STUDIO'
s.display.shading.color_type = 'MATERIAL'
s.display.shading.show_backface_culling = False
s.render.resolution_x = s.render.resolution_y = 800
s.render.filepath = png
bpy.ops.render.render(write_still=True)
