# Pipeline de Vittata · auxiliar (no entra en la build): inspección del original.
# Regenerar todo desde cero (vittata.glb, máscaras, montajes, vittata_glb.js): tools/blender/vittata_build.sh
import bpy, collections
p=bpy.data.objects["Amazon parrots"]; me=p.data
col=me.attributes["Col"]
c=collections.Counter()
for d in col.data:
    r,g,b,a=d.color
    c[(round(r,1),round(g,1),round(b,1))]+=1
print(c.most_common(30))
