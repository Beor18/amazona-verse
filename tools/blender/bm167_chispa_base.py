# BM167 paso 1: limpia la copia del «Piloto CiberPunk Dog Shiba.blend» (el original no se toca) y la guarda lista para vestir.
#   Blender -b "~/AmazonaVerse/modelos/Piloto CiberPunk Dog Shiba.blend" --python tools/blender/bm167_chispa_base.py -- /tmp/chi/base.blend
# Fuera: camiseta (Cap Texture, 'Circle'), cámaras, acciones y todos los materiales/texturas originales (la imagen de referencia incluida).
import bpy, sys
out = sys.argv[sys.argv.index('--') + 1]
bpy.data.objects.remove(bpy.data.objects['Circle'], do_unlink=True)
for o in [o for o in bpy.data.objects if o.type == 'CAMERA']: bpy.data.objects.remove(o, do_unlink=True)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
OBJ = {'Cuerpo': 2800, 'Head': 2400, 'Cube.003': 150, 'Cube.004': 400, 'Sphere': 300, 'Sphere.001': 300, 'Brazo.000': 900, 'Brazo.001': 900, 'Cube.001': 250, 'Cube.002': 250}
for o in [o for o in bpy.context.scene.objects if o.type == 'MESH']:
    for m in o.modifiers:
        if m.type == 'SUBSURF': m.levels = 1; m.render_levels = 1
    bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
    d = o.modifiers.new('dec', 'DECIMATE')
    tgt = OBJ.get(o.name, 0)
    cur = sum(len(p.vertices) - 2 for p in o.data.polygons)
    if tgt and cur > tgt: d.ratio = tgt / cur; bpy.ops.object.modifier_apply(modifier='dec')
    else: o.modifiers.remove(d)
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    o.data.materials.clear()
bpy.ops.wm.save_as_mainfile(filepath=out)
for o in bpy.data.objects: print('B', o.name, tuple(round(x, 2) for x in o.bound_box[0]), tuple(round(x, 2) for x in o.bound_box[6]), sum(len(p.vertices)-2 for p in o.data.polygons))
