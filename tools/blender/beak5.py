# Pipeline de Vittata · paso 7/9: hueso 'pico' con sus pesos, exportación FINAL OUT/vittata.glb y BUILD/o_final_pico.blend (= 04_Blender_3D/vittata_rig_final.blend)
# Comando: Blender -b BUILD/o_final.blend --python tools/blender/beak5.py
# Regenerar todo desde cero (vittata.glb, vittata_masks.png, vittata_mounts.json, vittata_glb.js):
#   tools/blender/vittata_build.sh    · rutas en tools/blender/vittata_paths.py (SRC original, BUILD intermedios, OUT)
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); from vittata_paths import src, build, out, tool
import bpy, json
from mathutils import Vector, kdtree
J=json.load(open(build("jaw.json"))); c=J["coef"]; D={d[0]:d for d in json.load(open(build("beakverts.json")))}
zl=lambda x,y: c[0]+c[1]*x*x+c[2]*y
rig=bpy.data.objects['Rig']; o=bpy.data.objects['Vittata']; me=o.data
kd=kdtree.KDTree(len(me.vertices))
for v in me.vertices: kd.insert(v.co,v.index)
kd.balance()
mapped=[]; maxd=0
for vi,w in J['verts']:
    d=D[vi]; co,idx,dist=kd.find(Vector((d[1],d[2],d[3]))); maxd=max(maxd,dist); mapped.append((idx,w))
print("MAPPED",len(mapped),"maxdist",maxd,"nverts",len(me.vertices))
bpy.context.view_layer.objects.active=rig; bpy.ops.object.mode_set(mode='EDIT')
eb=rig.data.edit_bones; b=eb.new('pico')
b.head=Vector((0,-0.10,zl(0,-0.10))); b.tail=Vector((0,-0.34,zl(0,-0.34)-0.02)); b.parent=eb['cabeza.001']; b.use_deform=True; b.roll=0
bpy.ops.object.mode_set(mode='OBJECT')
g=o.vertex_groups.new(name='pico')
for vi,w in mapped:
    for ge in me.vertices[vi].groups: ge.weight*=(1-w)
    g.add([vi],w,'REPLACE')
bpy.context.view_layer.objects.active=o; o.select_set(True)
bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL',lock_active=False)
if rig.animation_data: rig.animation_data.action=None
for pb in rig.pose.bones: pb.rotation_quaternion=(1,0,0,0); pb.location=(0,0,0); pb.scale=(1,1,1)
bpy.context.scene.frame_set(0)
bpy.ops.wm.save_as_mainfile(filepath=build("o_final_pico.blend"))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out("vittata.glb"),
  export_format='GLB', export_yup=True, export_apply=True, export_texcoords=True, export_normals=True,
  export_materials='EXPORT', export_image_format='JPEG', export_jpeg_quality=90,
  export_skins=True, export_def_bones=False, export_all_influences=False,
  export_animations=True, export_animation_mode='ACTIONS', export_force_sampling=True,
  export_optimize_animation_size=True, export_anim_single_armature=True, export_reset_pose_bones=True,
  export_morph=False, export_cameras=False, export_lights=False)
print("EXPORTED")
