import bpy
o=bpy.data.objects["Cube.001"]; me=o.data
print("C1 verts",len(me.vertices),"uv",[u.name for u in me.uv_layers],"mats",[m.name for m in me.materials])
for m in me.materials:
    print(" ",m.name,[(n.type,getattr(n,'image',None) and n.image.name) for n in m.node_tree.nodes if n.type=='TEX_IMAGE'])
o2=bpy.data.objects["Cube.002"]; print("C2 uv",[u.name for u in o2.data.uv_layers])
o0=bpy.data.objects["Cube.000"]; print("C0 verts",len(o0.data.vertices),"uv",[u.name for u in o0.data.uv_layers],[m.name for m in o0.data.materials])
