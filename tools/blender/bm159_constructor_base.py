# BM159 paso 1: limpia la copia del «Piloto CiberPunk Human.blend» (el original no se toca) y la guarda lista para vestir.
#   Blender -b "~/AmazonaVerse/modelos/Piloto CiberPunk Human.blend" --python tools/blender/bm159_constructor_base.py -- /tmp/con/base.blend
# Fuera: texturas externas (camiseta del Real Madrid, gorra), cámaras, animaciones y modificadores (se aplican y se decima).
import bpy, sys
out = sys.argv[sys.argv.index('--') + 1]
for n in ('Circle', 'Cejas Rigth.000', 'Cejas Rigth.001', 'Nariz'):
    if n in bpy.data.objects: bpy.data.objects.remove(bpy.data.objects[n], do_unlink=True)
for o in [o for o in bpy.data.objects if o.type == 'CAMERA']: bpy.data.objects.remove(o, do_unlink=True)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
OBJ = {'Cuerpo': 4500, 'Head': 2200, 'Sphere': 300, 'Sphere.001': 300, 'Cube.001': 250, 'Cube.002': 250, 'Cube.003': 100,
       'Ears LEFT': 120, 'Ears LEFT.001': 120}
for o in [o for o in bpy.context.scene.objects if o.type == 'MESH']:
    for m in o.modifiers:
        if m.type == 'SUBSURF': m.levels = 0; m.render_levels = 0
    bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers):
        m.show_viewport = True
        try: bpy.ops.object.modifier_apply(modifier=m.name)
        except RuntimeError: o.modifiers.remove(m)
    tgt = OBJ.get(o.name, 1000 if o.name.startswith('Brazo') else 0)
    cur = sum(len(p.vertices) - 2 for p in o.data.polygons)
    if tgt and cur > tgt:
        d = o.modifiers.new('dec', 'DECIMATE'); d.ratio = tgt / cur; bpy.ops.object.modifier_apply(modifier='dec')
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    o.data.materials.clear()
    print('BASE', o.name, sum(len(p.vertices) - 2 for p in o.data.polygons))
bpy.ops.wm.save_as_mainfile(filepath=out)
