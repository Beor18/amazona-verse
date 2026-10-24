import bpy
for o in bpy.data.objects:
    print("OBJ",o.name,o.type,o.parent.name if o.parent else None,tuple(round(x,3) for x in o.location),tuple(round(x,3) for x in o.rotation_euler),tuple(round(x,3) for x in o.scale),[(m.type,getattr(m,'object',None) and m.object.name) for m in getattr(o,'modifiers',[])], o.hide_render, o.hide_get())
o=bpy.data.objects["Cube.002"]; me=o.data
print("dims",o.dimensions, "verts",len(me.vertices),"uv",[u.name for u in me.uv_layers],"attrs",[a.name for a in me.color_attributes])
import collections
print("matidx",collections.Counter(p.material_index for p in me.polygons),[m.name for m in me.materials])
mw=o.matrix_world; cs=[mw@v.co for v in me.vertices]
print("bbox",[round(min(c[i] for c in cs),3) for i in range(3)],[round(max(c[i] for c in cs),3) for i in range(3)])
for m in me.materials:
    print("MAT",m.name,[(n.type,n.name,getattr(n,'image',None) and n.image.name) for n in m.node_tree.nodes])
    for l in m.node_tree.links: print("   ",l.from_node.name,l.from_socket.name,"->",l.to_node.name,l.to_socket.name)
for i in bpy.data.images: print("IMG",i.name,i.filepath,i.size[:])
a=bpy.data.objects["Armature"]
print("arm",a.matrix_world)
for b in a.data.bones:
    print("B",b.name,b.parent.name if b.parent else None,tuple(round(x,3) for x in (a.matrix_world@b.head_local)),tuple(round(x,3) for x in (a.matrix_world@b.tail_local)),b.use_deform)
print("vgs",[g.name for g in o.vertex_groups])
print("pose pos",a.data.pose_position, [ (pb.name,tuple(round(x,3) for x in pb.rotation_quaternion)) for pb in a.pose.bones if pb.rotation_quaternion[0]<0.9999 or pb.rotation_mode!='QUATERNION'][:20])
