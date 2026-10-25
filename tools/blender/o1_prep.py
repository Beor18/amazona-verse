# Pipeline de Vittata · paso 1/9: limpia el original de Kelvin (borra cámara/luces/metarig/duplicados, deja un modificador Armature) → BUILD/o_clean.blend
# Comando: Blender -b SRC/cotorrofiver.blend --python tools/blender/o1_prep.py
# Regenerar todo desde cero (vittata.glb, vittata_masks.png, vittata_mounts.json, vittata_glb.js):
#   tools/blender/vittata_build.sh    · rutas en tools/blender/vittata_paths.py (SRC original, BUILD intermedios, OUT)
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); from vittata_paths import src, build, out, tool
import bpy, os
D=src("")
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
bpy.ops.wm.save_as_mainfile(filepath=build("o_clean.blend"))
