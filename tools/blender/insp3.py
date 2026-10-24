import bpy, collections
p=bpy.data.objects["Amazon parrots"]; me=p.data
col=me.attributes["Col"]
c=collections.Counter()
for d in col.data:
    r,g,b,a=d.color
    c[(round(r,1),round(g,1),round(b,1))]+=1
print(c.most_common(30))
