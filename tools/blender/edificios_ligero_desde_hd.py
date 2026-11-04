"""BM134: rehace el ligero de un edificio roto a partir de su _hd (decimado), con materiales planos del juego.

Blender -b --python tools/blender/edificios_ligero_desde_hd.py -- <modelo> <tris> <techo|ninguno> [--voltear]

Alinea el resultado a la caja del ligero anterior (centro XY y base), reparte materiales por la normal de la cara
(techo = KB3D_TarpFabricDamaged, resto = KB3D_BarkNew), exporta <modelo>.glb y <modelo>_glb.js y actualiza tris y kb en kit.js."""
import base64, json, math, sys
from pathlib import Path
import bpy, bmesh
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/models/edificios'
argv = sys.argv[sys.argv.index('--') + 1:]
name, target, techo = argv[0], int(argv[1]), argv[2]
voltear = '--voltear' in argv
voxel = float(argv[argv.index('--voxel') + 1]) if '--voxel' in argv else 0


def importar(path):
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [o for o in bpy.data.objects if o not in antes and o.type == 'MESH']


def caja(objs):
    pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    return (Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))),
            Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts))))


bpy.ops.wm.read_factory_settings(use_empty=True)
viejo = importar(OUT / (name + '.glb'))
vmin, vmax = caja(viejo)
for o in viejo:
    bpy.data.objects.remove(o, do_unlink=True)

hd = importar(OUT / (name + '_hd.glb'))
for o in bpy.context.selected_objects:
    o.select_set(False)
for o in hd:
    o.select_set(True)
bpy.context.view_layer.objects.active = hd[0]
bpy.ops.object.join()
ob = bpy.context.active_object
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
me = ob.data
if voltear:
    for v in me.vertices:
        v.co.z = -v.co.z
        v.co.y = -v.co.y
    me.flip_normals()
me.update()
bpy.ops.object.mode_set(mode='OBJECT')

# alinear: centro XY y base del ligero anterior
hmin, hmax = caja([ob])
d = Vector(((vmin.x + vmax.x) / 2 - (hmin.x + hmax.x) / 2, (vmin.y + vmax.y) / 2 - (hmin.y + hmax.y) / 2, vmin.z - hmin.z))
for v in me.vertices:
    v.co += d

# soldar vértices de las costuras y decimar
bm = bmesh.new()
bm.from_mesh(me)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.02)
bm.to_mesh(me)
bm.free()
if voxel:
    me.remesh_voxel_size = voxel
    me.remesh_voxel_adaptivity = 0.0
    bpy.ops.object.voxel_remesh()
    me = ob.data
tris0 = sum(len(p.vertices) - 2 for p in me.polygons)
mod =ob.modifiers.new('dec', 'DECIMATE')
mod.ratio = min(1.0, target / tris0)
bpy.ops.object.modifier_apply(modifier='dec')
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.quads_convert_to_tris()
bpy.ops.object.mode_set(mode='OBJECT')
me = ob.data
me.calc_loop_triangles()

# materiales por normal
me.materials.clear()
mats = []
for n, c in (('KB3D_BarkNew', (0.45, 0.32, 0.22, 1)), ('KB3D_TarpFabricDamaged', (0.8, 0.45, 0.35, 1))):
    m = bpy.data.materials.new(n)
    m.diffuse_color = c
    m.use_backface_culling = False
    me.materials.append(m)
for p in me.polygons:
    p.material_index = 1 if (techo == 'techo' and abs(p.normal.z) > 0.25 and p.center.z > (vmin.z + vmax.z) / 2 * 0.8 + 0.2 * vmin.z) else 0
if not me.uv_layers:
    me.uv_layers.new(name='UVMap')

ob.name = name
bpy.ops.export_scene.gltf(filepath=str(OUT / (name + '.glb')), export_format='GLB', use_selection=False, export_yup=True,
                          export_apply=True, export_materials='EXPORT', export_image_format='NONE')
data = (OUT / (name + '.glb')).read_bytes()
(OUT / (name + '_glb.js')).write_text('(window.AV_EDIFICIOS_B64=window.AV_EDIFICIOS_B64||{})["%s"]="%s";\n' % (name, base64.b64encode(data).decode()))

kit_path = OUT / 'kit.js'
text = kit_path.read_text()
s = text.index('window.AV_EDIFICIOS_KIT = ') + len('window.AV_EDIFICIOS_KIT = ')
kit = json.loads(text[s:text.rindex(';')])
tris = len(me.loop_triangles)
kit[name].update({'tris': tris, 'kb': round((OUT / (name + '_glb.js')).stat().st_size / 1024, 1),
                  'mats': [m.name for m in me.materials]})
kit_path.write_text(text[:s] + json.dumps(kit, ensure_ascii=False, separators=(',', ':')) + text[text.rindex(';'):])
print('LISTO', name, tris0, '->', tris, 'tris')
