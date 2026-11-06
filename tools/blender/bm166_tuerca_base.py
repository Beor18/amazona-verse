# BM166 paso 1: limpia la copia del «Piloto CiberPunk Monkey.blend» (el original no se toca) y la guarda lista para vestir.
#   Blender -b "~/AmazonaVerse/modelos/Piloto CiberPunk Monkey.blend" --python tools/blender/bm166_tuerca_base.py -- /tmp/mono/base.blend
# Fuera: Circle (camiseta/textura), cámaras, acciones; la cabeza (70 k tris) se decima. Materiales fuera (se pintan en el paso 2).
import bpy, sys
out = sys.argv[sys.argv.index('--') + 1]
bpy.data.objects.remove(bpy.data.objects['Circle'], do_unlink=True)
for o in [o for o in bpy.data.objects if o.type == 'CAMERA']: bpy.data.objects.remove(o, do_unlink=True)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
OBJ = {'Head': 5500, 'Cuerpo': 2500, 'Capuchon': 700, 'Cube.001': 200, 'Cube.002': 200, 'Cube.003': 150}
for o in [o for o in bpy.context.scene.objects if o.type == 'MESH']:
    for m in list(o.modifiers):
        if m.type == 'SUBSURF': m.levels = 1; m.render_levels = 1
    bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
    tgt = OBJ.get(o.name, 900 if o.name.startswith('Brazo') else 0)
    cur = sum(len(p.vertices) - 2 for p in o.data.polygons)
    if tgt and cur > tgt:
        d = o.modifiers.new('dec', 'DECIMATE'); d.ratio = tgt / cur; bpy.ops.object.modifier_apply(modifier='dec')
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    o.data.materials.clear()
    bb = [o.matrix_world @ __import__('mathutils').Vector(c) for c in o.bound_box]
    print('BB', o.name, sum(len(p.vertices) - 2 for p in o.data.polygons), tuple(round(min(v[i] for v in bb), 2) for i in range(3)), tuple(round(max(v[i] for v in bb), 2) for i in range(3)))
bpy.ops.wm.save_as_mainfile(filepath=out)
