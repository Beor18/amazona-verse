import json, struct, numpy as np, os
G="/Users/kelvingarciapr/AmazonaVerse/Juego/assets/models/vittata.glb"
f=open(G,'rb').read(); jl=struct.unpack('<I',f[12:16])[0]; J=json.loads(f[20:20+jl])
nodes=J['nodes']; parent={}
for i,n in enumerate(nodes):
    for c in n.get('children',[]): parent[c]=i
def local(n):
    if 'matrix' in n: return np.array(n['matrix']).reshape(4,4).T
    t=np.array(n.get('translation',[0,0,0])); x,y,z,w=n.get('rotation',[0,0,0,1]); s=np.array(n.get('scale',[1,1,1]))
    R=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])
    M=np.eye(4); M[:3,:3]=R*s; M[:3,3]=t; return M
def world(i):
    M=local(nodes[i])
    while i in parent: i=parent[i]; M=local(nodes[i])@M
    return M
byname={n.get('name'):i for i,n in enumerate(nodes)}
LM=json.load(open("/private/tmp/claude-501/vittata_build/landmarks.json"))
g=lambda v:[round(v[0],4),round(v[2],4),round(-v[1],4)]
mins=[];maxs=[]
for m in J['meshes']:
    for p in m['primitives']:
        a=J['accessors'][p['attributes']['POSITION']]; mins.append(a['min']); maxs.append(a['max'])
mn=np.min(mins,0); mx=np.max(maxs,0)
mounts={}
use={"mount_head_top":"hats; +Z=up (outward), +Y=forward (beak direction)","mount_eyes":"goggles/glasses; +Z=forward out of face, +Y=up",
 "mount_neck":"scarf/bandana; +Z=forward, +Y=up","mount_chest":"pendant/badge; +Z=forward, +Y=up","mount_back":"backpack; +Z=backward (out of back), +Y=up",
 "mount_wing_L":"bracelet; +Z=out of top of forearm (rest T-pose: up), +Y=along forearm toward hand","mount_wing_R":"bracelet; same as L, mirrored"}
for name in use:
    W=world(byname[name])
    mounts[name]={"position":[round(float(x),4) for x in W[:3,3]],"axis_x":[round(float(x),3) for x in W[:3,0]],
      "axis_y":[round(float(x),3) for x in W[:3,1]],"axis_z_outward":[round(float(x),3) for x in W[:3,2]],
      "parent_bone":LM["mount_parent"][name],"clearance":round(LM["clearance"][name],4),"use":use[name]}
bb=LM["beak_bbox"]
out={"model":"vittata.glb","units":"glTF meters, Y-up, character faces +Z, feet at y=0, rest pose = T-pose (play 'Idle' for relaxed wings)",
 "height":round(float(mx[1]-mn[1]),4),"bbox_min":[round(float(x),4) for x in mn],"bbox_max":[round(float(x),4) for x in mx],
 "head_sphere":{"center":g(LM["head_center"]),"radius":round(LM["head_radius"],4)},
 "beak_bbox":{"min":[round(bb[0][0],4),round(bb[0][2],4),round(-bb[1][1],4)],"max":[round(bb[1][0],4),round(bb[1][2],4),round(-bb[0][1],4)]},
 "eyes":{s:g(v) for s,v in LM["eyes"].items()},
 "clearance_note":"distance (m) from mount position to nearest beak (material Material.001) or eye-region surface, rest pose",
 "mounts":mounts,
 "materials":{"cuerpo":"body/head atlas: green feathers, red forehead patch, white eye rings, eyes, feet+claws (texture vittata_albedo)","Material.001":"beak (same atlas texture, beak region)"},
 "masks":"vittata_masks.png","masks_channels":{"R":"red forehead patch","G":"white eye-ring","B":"beak"},
 "masks_note":"same UVs (TEXCOORD_0) as the albedo; 1024x1024",
 "animations":{a['name']:None for a in J['animations']}}
# durations
for a in J['animations']:
    t=max(J['accessors'][s['input']]['max'][0] for s in a['samplers']); out["animations"][a['name']]=round(t,3)
json.dump(out,open("/Users/kelvingarciapr/AmazonaVerse/Juego/assets/models/vittata_mounts.json","w"),indent=1)
print(json.dumps({k:out[k] for k in ["height","bbox_min","bbox_max","head_sphere","beak_bbox","animations"]}))
for n,m in mounts.items(): print(n,m["position"],"Z",m["axis_z_outward"],"Y",m["axis_y"],"clr",m["clearance"])
print("size",os.path.getsize(G),"images",[(i.get('name'),i.get('mimeType')) for i in J.get('images',[])],"materials",[m['name'] for m in J['materials']])
print("joints",len(J['skins'][0]['joints']),"nodes",len(nodes))
