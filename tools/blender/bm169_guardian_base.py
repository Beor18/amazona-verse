# BM169 paso 1: limpia la copia del «Piloto Cotorra.blend» (el original no se toca) y la guarda lista para vestir.
#   Blender -b "~/AmazonaVerse/modelos/Piloto Cotorra.blend" --python tools/blender/bm169_guardian_base.py -- /tmp/gv/base.blend
# Fuera: cámaras, luces, acciones, texturas y materiales originales (la piel de la cabeza era de A. brasiliensis; aquí se repinta de otra especie).
import bpy, sys
out = sys.argv[sys.argv.index('--') + 1]
for o in [o for o in bpy.data.objects if o.type in ('CAMERA', 'LIGHT')]: bpy.data.objects.remove(o, do_unlink=True)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
OBJ = {'Amazon parrots': 7000, 'Cuerpo': 2600, 'Brazo.000': 600, 'Brazo.001': 600}
for o in [o for o in bpy.context.scene.objects if o.type == 'MESH']:
    bpy.context.view_layer.objects.active = o
    for m in o.modifiers:
        if m.type == 'SUBSURF': m.levels = 1; m.render_levels = 1
    for m in list(o.modifiers):
        if m.type == 'ARMATURE' and (o.name != 'Amazon parrots' or not m.object): o.modifiers.remove(m)
    for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
    cur = sum(len(p.vertices) - 2 for p in o.data.polygons); tgt = OBJ[o.name]
    if cur > tgt:
        d = o.modifiers.new('dec', 'DECIMATE'); d.ratio = tgt / cur; bpy.ops.object.modifier_apply(modifier='dec')
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    o.data.materials.clear()
for o in [o for o in bpy.data.objects if o.type == 'ARMATURE']: bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.wm.save_as_mainfile(filepath=out)
for o in bpy.data.objects: print('B', o.name, o.type, tuple(round(x, 2) for x in o.bound_box[0]), tuple(round(x, 2) for x in o.bound_box[6]), sum(len(p.vertices)-2 for p in o.data.polygons) if o.type=='MESH' else '')
