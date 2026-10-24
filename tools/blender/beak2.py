import bpy, numpy as np, json
o=bpy.data.objects['Vittata']; me=o.data
mat=me.materials[0]; img=[n.image for n in mat.node_tree.nodes if n.type=='TEX_IMAGE'][0]
W,H=img.size; px=np.array(img.pixels[:],dtype=np.float32).reshape(H,W,4)
uv=me.uv_layers['UVMap'].data
col={}
for p in me.polygons:
    if p.material_index!=0: continue
    for li in p.loop_indices:
        u,v=uv[li].uv; c=px[min(H-1,int(v*H)),min(W-1,int(u*W))]
        col.setdefault(me.loops[li].vertex_index,[]).append(c[:3])
white=[]; data=[]
for vi,cs in col.items():
    c=np.mean(cs,axis=0); co=me.vertices[vi].co
    isw = c.min()>0.75
    data.append((vi,co.x,co.y,co.z,float(c[0]),float(c[1]),float(c[2]),int(isw)))
    if isw: white.append(co)
print("IMG",img.name,W,H,"WHITE",len(white))
if white:
    print("WHITE x",min(v.x for v in white),max(v.x for v in white),"y",min(v.y for v in white),max(v.y for v in white),"z",min(v.z for v in white),max(v.z for v in white))
json.dump(data,open('/tmp/claude-501/beakverts.json','w'))
