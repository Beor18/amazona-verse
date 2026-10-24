import bpy, numpy as np, json
o=bpy.data.objects['Vittata']; me=o.data
img=bpy.data.images['vittata_albedo']; W,H=img.size; px=np.array(img.pixels[:],dtype=np.float32).reshape(H,W,4)
uv=me.uv_layers.active.data
M=json.load(open('/Users/kelvingarciapr/AmazonaVerse/Juego/assets/models/vittata_mounts.json'))
res={}
for k,e in M['eyes'].items():
    c=np.array([e[0],-e[2],e[1]])  # glTF (x,y,z) -> Blender (x,-z,y)
    pts=[]
    for p in me.polygons:
        for li in p.loop_indices:
            vi=me.loops[li].vertex_index; co=np.array(me.vertices[vi].co)
            if np.linalg.norm(co-c)>0.2: continue
            u,v=uv[li].uv; col=px[min(H-1,int(v*H)),min(W-1,int(u*W)),:3]
            whiteish = col.min()>0.7
            blueish = col[2]>0.5 and col[2]>col[0]+0.15
            if whiteish or blueish: pts.append(co)
    P=np.unique(np.array(pts),axis=0); cen=P.mean(0)
    _,_,vt=np.linalg.svd(P-cen); n=vt[2]
    hc=np.array([M['head_sphere']['center'][0],-M['head_sphere']['center'][2],M['head_sphere']['center'][1]])
    if np.dot(n,cen-hc)<0: n=-n
    d=P-cen; d-=np.outer(d@n,n); rad=np.percentile(np.linalg.norm(d,axis=1),95)
    bulge=np.percentile((P-cen)@n,95)
    g=lambda a:[float(a[0]),float(a[2]),float(-a[1])]  # Blender -> glTF
    res[k]={"center":g(cen),"normal":g(n),"radius":float(rad),"bulge":float(bulge),"n":len(P)}
print("EYES",json.dumps(res))
