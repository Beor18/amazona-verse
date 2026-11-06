# BM160 paso 1: limpia la copia del «Piloto CiberPunk Girl.blend» (el original no se toca) y la guarda lista para vestir.
#   Blender -b "~/AmazonaVerse/modelos/Piloto CiberPunk Girl.blend" --python tools/blender/bm160_ingeniera_base.py -- /tmp/ing/base.blend
# Fuera: foto personal (textura del pelo), camiseta (Cap Texture), textura rota de la cara, pelo simulado y cejas/pestañas sueltas.
import bpy, sys
out = sys.argv[sys.argv.index('--') + 1]
for n in ('Circle', 'Cabello', 'Cejas Left', 'Cejas Left.001', 'Pestañas Left', 'Pestañas Left.002', 'Nariz'):
    bpy.data.objects.remove(bpy.data.objects[n], do_unlink=True)
for o in [o for o in bpy.data.objects if o.type == 'CAMERA']: bpy.data.objects.remove(o, do_unlink=True)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
OBJ = {'Cube': 3800, 'Face': 1800, 'Sphere': 300, 'Sphere.001': 300, 'Cube.001': 250, 'Cube.002': 250, 'Cube.003': 250}
for o in [o for o in bpy.context.scene.objects if o.type == 'MESH']:
    for m in o.modifiers:
        if m.type == 'SUBSURF': m.levels = 1; m.render_levels = 1
    bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
    d = o.modifiers.new('dec', 'DECIMATE')
    tgt = OBJ.get(o.name, 1000 if o.name.startswith('Brazo') else 0)
    cur = sum(len(p.vertices) - 2 for p in o.data.polygons)
    if tgt and cur > tgt: d.ratio = tgt / cur; bpy.ops.object.modifier_apply(modifier='dec')
    else: o.modifiers.remove(d)
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    o.data.materials.clear()
bpy.ops.wm.save_as_mainfile(filepath=out)
