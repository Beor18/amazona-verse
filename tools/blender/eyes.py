# Pipeline de Vittata · paso 9/9: mide los ojos pintados y añade eye_lids y bones_extra a OUT/vittata_mounts.json
# Comando: Blender -b BUILD/o_final_pico.blend --python tools/blender/eyes.py
# Regenerar todo desde cero (vittata.glb, vittata_masks.png, vittata_mounts.json, vittata_glb.js):
#   tools/blender/vittata_build.sh    · rutas en tools/blender/vittata_paths.py (SRC original, BUILD intermedios, OUT)
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); from vittata_paths import src, build, out, tool
import bpy, numpy as np, json
o=bpy.data.objects['Vittata']; me=o.data
img=bpy.data.images['vittata_albedo']; W,H=img.size; px=np.array(img.pixels[:],dtype=np.float32).reshape(H,W,4)
uv=me.uv_layers.active.data
M=json.load(open(out("vittata_mounts.json")))
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
# Párpados (character.js) y hueso extra: se guardan en vittata_mounts.json con 4 decimales
r4 = lambda a: [round(float(x), 4) for x in a]
M['eye_lids'] = {k: {"center": r4(v["center"]), "normal": r4(v["normal"]), "radius": round(v["radius"], 4), "bulge": round(v["bulge"], 4)} for k, v in res.items()}
M['eye_lids']["note"] = "ojo pintado medido sobre la textura (blanco+iris): centro, normal hacia afuera, radio y cuánto sobresale"
M['bones_extra'] = {"pico": "mandíbula inferior, padre cabeza.001; rotación +X abre el pico (0.35 rad ≈ 5,5 cm)"}
json.dump(M, open(out("vittata_mounts.json"), "w"), indent=1, ensure_ascii=False)
print("OK eye_lids")
