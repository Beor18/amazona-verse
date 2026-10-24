import bpy
rig=bpy.data.objects["Rig"]; o=bpy.data.objects["Vittata"]; sc=bpy.context.scene
rig.animation_data.action=bpy.data.actions["Walk"]; zs=[]
for f in range(0,31,2):
    sc.frame_set(f); dg=bpy.context.evaluated_depsgraph_get(); e=o.evaluated_get(dg); m=e.to_mesh(); zs.append(min(v.co.z for v in m.vertices)); e.to_mesh_clear()
print("WALKZ",round(min(zs),3))
