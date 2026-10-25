# Pipeline de Vittata · auxiliar (no entra en la build): comprueba pesos e imágenes de o_clean.blend.
# Regenerar todo desde cero (vittata.glb, máscaras, montajes, vittata_glb.js): tools/blender/vittata_build.sh
import bpy, collections
o=bpy.data.objects["Cube.002"]
names={g.index:g.name for g in o.vertex_groups}
dom=collections.Counter(); zr=collections.defaultdict(lambda:[9,-9])
mw=o.matrix_world
for v in o.data.vertices:
    gs=[(g.weight,names[g.group]) for g in v.groups if names[g.group] not in("mouth","body","eye")]
    if not gs: dom["NONE"]+=1; continue
    w,n=max(gs); dom[n]+=1; z=(mw@v.co).z; zr[n][0]=min(zr[n][0],z); zr[n][1]=max(zr[n][1],z)
    s=sum(x for x,_ in gs)
    if abs(s-1)>0.05: dom["unnorm"]+=1
for n,c in dom.most_common(): print(n,c,[round(x,2) for x in zr.get(n,[0,0])])
print("used images",[(i.name,i.users) for i in bpy.data.images])
