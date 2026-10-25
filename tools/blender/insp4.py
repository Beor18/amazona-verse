# Pipeline de Vittata · auxiliar (no entra en la build): inspección del original.
# Regenerar todo desde cero (vittata.glb, máscaras, montajes, vittata_glb.js): tools/blender/vittata_build.sh
import bpy, bmesh
from mathutils import Vector
p=bpy.data.objects["Amazon parrots"]; me=p.data; mw=p.matrix_world
gi={vg.name:vg.index for vg in p.vertex_groups}
bins={}
for v in me.vertices:
    w={g.group:g.weight for g in v.groups}
    if w.get(gi['OjoL'],0)>0.5 or w.get(gi['OjoR'],0)>0.5 or any(w.get(gi[n],0)>0.5 for n in ['Lengua','Lengua.001','Lengua.002']): continue
    c=mw@v.co
    if c.z<6.6:
        b=round(c.z*10)/10
        e=bins.setdefault(b,[9,-9,9,-9,0])
        e[0]=min(e[0],c.x);e[1]=max(e[1],c.x);e[2]=min(e[2],c.y);e[3]=max(e[3],c.y);e[4]+=1
for b in sorted(bins): print(b,[round(x,2) for x in bins[b]])
# boundary edges
bm=bmesh.new(); bm.from_mesh(me)
bd=[e for e in bm.edges if e.is_boundary]
print("boundary edges",len(bd))
zs=sorted(set(round((mw@e.verts[0].co).z,1) for e in bd)); print("boundary z",zs[:20])
