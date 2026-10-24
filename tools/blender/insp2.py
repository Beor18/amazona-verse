import bpy, collections
p=bpy.data.objects["Amazon parrots"]; me=p.data
print("mats",[m.name if m else None for m in me.materials])
c=collections.Counter(f.material_index for f in me.polygons); print("matidx",c)
print("images",[(i.name,i.filepath,i.size[:], i.packed_file is not None) for i in bpy.data.images])
for m in me.materials:
    if m and m.use_nodes:
        print("MAT",m.name,[(n.type,n.name, n.image.name if getattr(n,'image',None) else '') for n in m.node_tree.nodes])
print("attrs",[(a.name,a.domain,a.data_type) for a in me.attributes])
print("color attrs",[a.name for a in me.color_attributes])
print("armatures",[(o.name,len(o.data.bones)) for o in bpy.data.objects if o.type=='ARMATURE'])
print("mods",[(m.name,m.type) for m in p.modifiers])
print("shapekeys", me.shape_keys and [k.name for k in me.shape_keys.key_blocks])
