# Pipeline de Vittata · auxiliar (no entra en la build): inspección del original.
# Regenerar todo desde cero (vittata.glb, máscaras, montajes, vittata_glb.js): tools/blender/vittata_build.sh
import bpy, bmesh, collections
from mathutils import Vector
for o in bpy.data.objects:
    print("OBJ",o.name,o.type,tuple(round(x,3) for x in o.location),tuple(round(x,3) for x in o.rotation_euler),tuple(round(x,3) for x in o.scale), o.parent.name if o.parent else None, [m.type for m in getattr(o,'modifiers',[])])
p=bpy.data.objects["Amazon parrots"]; me=p.data; mw=p.matrix_world
print("verts",len(me.vertices),"polys",len(me.polygons),"mats",[m.name if m else None for m in me.materials], "uv",[u.name for u in me.uv_layers])
print("tris",sum(len(f.vertices)-2 for f in me.polygons))
acc=collections.defaultdict(lambda:[0,Vector(),0.0,[1e9,-1e9,1e9,-1e9,1e9,-1e9]])
for v in me.vertices:
    for g in v.groups:
        if g.weight<=0.01: continue
        a=acc[g.group]; a[0]+=1; c=mw@v.co; a[1]+=c*g.weight; a[2]+=g.weight
        b=a[3]; b[0]=min(b[0],c.x);b[1]=max(b[1],c.x);b[2]=min(b[2],c.y);b[3]=max(b[3],c.y);b[4]=min(b[4],c.z);b[5]=max(b[5],c.z)
for vg in p.vertex_groups:
    a=acc.get(vg.index)
    if a is None: continue
    print("VG",vg.name,a[0],"cen",tuple(round(x,2) for x in a[1]/a[2]),"bb",[round(x,2) for x in a[3]])
