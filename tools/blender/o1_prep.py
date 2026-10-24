import bpy, os
D="/private/tmp/claude-501/vittata_build/orig/"
for n in ["Camera","Cube.000","Cube.001","Lamp","Plane","rig","Sun","WGT-rig_root"]:
    o=bpy.data.objects.get(n)
    if o: bpy.data.objects.remove(o)
for i in bpy.data.images:
    if i.name in ("cuerpo_Base_color.jpg","Material.001_Base_color.jpg"):
        i.filepath=D+i.name; i.reload(); print("IMG",i.name,i.size[:])
print("Untitled users",bpy.data.images["Untitled"].users)
o=bpy.data.objects["Cube.002"]
mods=[m for m in o.modifiers if m.type=='ARMATURE']
for m in mods[1:]: o.modifiers.remove(m)
print("mods",[(m.name,m.use_vertex_groups,m.use_deform_preserve_volume) for m in o.modifiers])
# weight stats
import collections
c=collections.Counter(len([g for g in v.groups if g.weight>0]) for v in o.data.vertices); print("influences",sorted(c.items()))
for gname in ["mouth","body","eye"]:
    gi=o.vertex_groups[gname].index
    n=sum(1 for v in o.data.vertices for g in v.groups if g.group==gi and g.weight>0)
    print("group",gname,n)
bpy.ops.wm.save_as_mainfile(filepath="/private/tmp/claude-501/vittata_build/o_clean.blend")
