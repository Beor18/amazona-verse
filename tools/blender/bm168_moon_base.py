# BM168 paso 1: limpia la copia del «Cat Superior Moon.blend» (el original no se toca) y la guarda lista para vestir.
#   Blender -b "~/AmazonaVerse/modelos/Cat Superior Moon.blend" --python tools/blender/bm168_moon_base.py -- /tmp/moon/base.blend
# Fuera: katana y vaina (Katana, Batotsu: sin armas), melena de púas (Cube.011, Plane.007/8; 87 k tris), Circle, cámara y luz. Materiales fuera.
import bpy, sys
from mathutils import Vector
out = sys.argv[sys.argv.index('--') + 1]
for n in ('Katana', 'Batotsu', 'Cube.011', 'Plane.007', 'Plane.008', 'Circle', 'Camera.001', 'Sun'): bpy.data.objects.remove(bpy.data.objects[n], do_unlink=True)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
OBJ = {'Head.001': 2200, 'Cube': 1300, 'Cube.001': 700, 'Foot Left': 450, 'Foot Rigth': 450, 'Brazo Cat L': 600, 'Brazo Cat R': 600, 'Ocico': 500, 'Bandana': 500, 'Plane.003': 300, 'Plane.004': 150, 'Plane.005': 150, 'Plane.006': 100, 'Sphere': 200, 'Sphere.001': 200, 'Cejas Rigth': 160, 'Cejas Rigth.001': 160}
for o in [o for o in bpy.context.scene.objects if o.type == 'MESH']:
    for m in o.modifiers:
        if m.type == 'SUBSURF': m.levels = 1; m.render_levels = 1
    bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
    tgt = OBJ.get(o.name, 0); cur = sum(len(p.vertices) - 2 for p in o.data.polygons)
    if tgt and cur > tgt:
        d = o.modifiers.new('dec', 'DECIMATE'); d.ratio = tgt / cur; bpy.ops.object.modifier_apply(modifier='dec')
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    o.data.materials.clear()
    bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
    print('BB', o.name, sum(len(p.vertices) - 2 for p in o.data.polygons), tuple(round(min(v[i] for v in bb), 2) for i in range(3)), tuple(round(max(v[i] for v in bb), 2) for i in range(3)))
bpy.ops.wm.save_as_mainfile(filepath=out)
