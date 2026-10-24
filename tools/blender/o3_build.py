import bpy, bmesh, math, sys, json
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree
sc=bpy.context.scene; sc.render.fps=30
rig=bpy.data.objects["Armature"]; rig.name="Rig"; rig.data.name="Rig"
o=bpy.data.objects["Cube.002"]; o.name="Vittata"; o.data.name="Vittata"
ARM_ANGLE=float(sys.argv[-1])
mw=o.matrix_world.copy(); amw=rig.matrix_world.copy()
o.parent=None
cs=[mw@v.co for v in o.data.vertices]
minz=min(c.z for c in cs); maxz=max(c.z for c in cs)
k=1.4/(maxz-minz); O=Vector((0.021,0,minz))
Mf=Matrix.Diagonal((k,k,k,1))@Matrix.Translation(-O)
print("SCALE",k,"orig height",maxz-minz)
o.data.transform(Mf@mw); o.matrix_world=Matrix.Identity(4)
for g in ["mouth","body","eye"]:
    o.vertex_groups.remove(o.vertex_groups[g])
bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
rig.data.transform(Mf@amw)
bpy.ops.object.mode_set(mode='OBJECT')
rig.matrix_world=Matrix.Identity(4)
o.parent=rig; o.matrix_parent_inverse=Matrix.Identity(4)
o.modifiers["Armature"].object=rig
# weights cleanup
bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active=o
bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL',limit=4)
bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL',lock_active=False)
print("unweighted",sum(1 for v in o.data.vertices if not v.groups))
for f in o.data.polygons: f.use_smooth=True
# root + tail parenting
bpy.context.view_layer.objects.active=rig; bpy.ops.object.mode_set(mode='EDIT')
eb=rig.data.edit_bones
r=eb.new("root"); r.head=(0,0,0); r.tail=(0,0.12,0); r.use_deform=False
eb["espalda1"].parent=r; eb["espalda1.001"].parent=eb["espalda1"]; eb["espalda1.001"].use_connect=False
bpy.ops.object.mode_set(mode='OBJECT')
# ---------- landmarks
me=o.data; uv=me.uv_layers["UVMap"].data
mat_beak=[i for i,m in enumerate(me.materials) if m.name=="Material.001"][0]
IRIS={"L":(0.415,0.326),"R":(0.186,0.326)}  # guess; resolved by x sign below
eyepts={0:[],1:[]}; eyefaces=[]
for p in me.polygons:
    if p.material_index==mat_beak: continue
    for li in p.loop_indices:
        u,v=uv[li].uv
        for j,(cu,cv) in enumerate(IRIS.values()):
            d=math.hypot(u-cu,v-cv)
            if d<0.03: eyepts[j].append(me.vertices[me.loops[li].vertex_index].co.copy())
            if d<0.085: eyefaces.append(p.index)
eyes={}
for j,pts in eyepts.items():
    c=sum(pts,Vector())/len(pts); eyes["L" if c.x>0 else "R"]=c
print("EYES",{s:tuple(round(x,4) for x in c) for s,c in eyes.items()})
bm=bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
full=BVHTree.FromBMesh(bm)
beak_f=[f for f in bm.faces if f.material_index==mat_beak]
def sub_bvh(faces):
    verts=[];polys=[];idx={}
    for f in faces:
        pl=[]
        for v in f.verts:
            if v.index not in idx: idx[v.index]=len(verts); verts.append(v.co.copy())
            pl.append(idx[v.index])
        polys.append(pl)
    return BVHTree.FromPolygons(verts,polys),verts
beak_bvh,beak_verts=sub_bvh(beak_f)
ef=set(eyefaces); eye_bvh,eye_verts=sub_bvh([bm.faces[i] for i in ef])
B={b.name:b for b in rig.data.bones}
def mid(n): b=B[n]; return (b.head_local+b.tail_local)/2
hidx=rig.data.bones.find("cabeza.001")
gi=o.vertex_groups["cabeza.001"].index
hv=[v.co.copy() for v in me.vertices if any(g.group==gi and g.weight>0.5 for g in v.groups)]
hc=sum(hv,Vector())/len(hv)
def cast(orig,d):
    d=Vector(d).normalized(); loc,n,i,dist=full.ray_cast(Vector(orig),d,5)
    return loc
ec=(eyes["L"]+eyes["R"])/2
M={}
M["mount_head_top"]=(cast((0,hc.y,hc.z),(0,0,1)),Vector((0,0,1)),Vector((0,-1,0)),"cabeza.001")
M["mount_eyes"]=(cast((0,ec.y+0.12,ec.z),(0,-1,0)),Vector((0,-1,0)),Vector((0,0,1)),"cabeza.001")
nb=B["cabeza"].head_local
M["mount_neck"]=(cast((0,nb.y,nb.z),(0,-1,0)),Vector((0,-1,0.25)),Vector((0,0,1)),"espalda2")
cm=mid("espalda2")
M["mount_chest"]=(cast((0,cm.y,cm.z-0.02),(0,-1,0)),Vector((0,-1,0)),Vector((0,0,1)),"espalda2")
sh=B["armL1"].head_local
M["mount_back"]=(cast((0,cm.y,(cm.z+sh.z)/2),(0,1,0)),Vector((0,1,0)),Vector((0,0,1)),"espalda2")
for s,bn in (("L","armL2"),("R","armL2.001")):
    m=mid(bn); M["mount_wing_"+s]=(cast(m,(0,0,1)),Vector((0,0,1)),(B[bn].tail_local-B[bn].head_local).normalized(),bn)
bpy.ops.object.mode_set(mode='EDIT')
eb=rig.data.edit_bones
for name,(loc,nrm,up,par) in M.items():
    nrm=nrm.normalized(); up=(up-nrm*up.dot(nrm)).normalized()
    b=eb.new(name); b.head=loc; b.tail=loc+up*0.04; b.align_roll(nrm); b.use_deform=False; b.parent=eb[par]  # bone Y=up, Z=outward
    print("MOUNT",name,par,tuple(round(x,4) for x in loc))
bpy.ops.object.mode_set(mode='OBJECT')
print("PARENTS",[(n,rig.data.bones[n].parent.name if rig.data.bones[n].parent else None) for n in M])
# save landmark data for JSON (blender coords)
def bbox(vs): return [min(v.x for v in vs),min(v.y for v in vs),min(v.z for v in vs)],[max(v.x for v in vs),max(v.y for v in vs),max(v.z for v in vs)]
hr=max((v-hc).length for v in hv)
clear={}
for name,(loc,_,_,_) in M.items():
    d=min(beak_bvh.find_nearest(loc)[3],eye_bvh.find_nearest(loc)[3]); clear[name]=d
LM={"k":k,"head_center":list(hc),"head_radius":hr,"beak_bbox":[list(x) for x in bbox(beak_verts)],"eyes":{s:list(c) for s,c in eyes.items()},
    "clearance":clear,"mount_parent":{n:v[3] for n,v in M.items()}}
json.dump(LM,open("/private/tmp/claude-501/vittata_build/landmarks.json","w"),indent=1)
bm.free()
# ---------- animation
src=open("/private/tmp/claude-501/vittata_build/s4_anim.py").read()
exec(src[src.index("def sm("):src.index("def apply_pose")])
def base():
    P={}
    for s,g in SIDES:
        P["upper_"+s]=[0,ARM_ANGLE*g,-10*g]; P["lower_"+s]=[0,12*g,-16*g]; P["hand_"+s]=[0,6*g,-8*g]
    return P
MAP={"hips":["espalda1"],"spine":["espalda1"],"chest":["espalda2"],"neck":["cabeza"],"head":["cabeza.001"],"tail":["espalda1.001"],"root":["root"],
 "upper_L":["armL1"],"lower_L":["armL2"],"hand_L":["armL3","armL2.002","armL2.004","armL2.006"],
 "upper_R":["armL1.001"],"lower_R":["armL2.001"],"hand_R":["armL3.001","armL2.010","armL2.013","armL2.016"],
 "thigh_L":["pieL1"],"shin_L":["pieL3"],"foot_L":["pieL4","pieL7","pieL8"],
 "thigh_R":["pieL1.001"],"shin_R":["pieL3.001"],"foot_R":["pieL4.001","pieL7.001","pieL8.001"]}
R={b.name:b.matrix_local.to_3x3() for b in rig.data.bones}
def apply_pose(P,L,S):
    rot={}; loc={}
    for key,v in P.items():
        for bn in MAP.get(key,[]):
            cur=rot.get(bn,[0,0,0]); rot[bn]=[cur[i]+v[i] for i in range(3)]
    for key,v in L.items():
        for bn in MAP.get(key,[]): loc[bn]=v
    for pb in rig.pose.bones:
        pb.rotation_mode='QUATERNION'
        rx,ry,rz=rot.get(pb.name,[0,0,0])
        Q=(Quaternion((0,0,1),math.radians(rz))@Quaternion((0,1,0),math.radians(ry))@Quaternion((1,0,0),math.radians(rx)))
        r=R[pb.name]
        pb.rotation_quaternion=(r.inverted()@Q.to_matrix()@r).to_quaternion()
        pb.location=r.inverted()@loc.get(pb.name,Vector()); pb.scale=(1,1,1)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
ACTS=[("Idle",idle,90),("Welcome",welcome,60),("Celebrate",celebrate,45),("Curious",curious,60),("Walk",walk,30)]
rig.animation_data_create()
animated=set(sum(MAP.values(),[]))
for name,fn,n in ACTS:
    act=bpy.data.actions.new(name); act.use_fake_user=True; rig.animation_data.action=act
    for f in range(n+1):
        apply_pose(*fn(f))
        for pb in rig.pose.bones:
            if pb.name not in animated: continue
            pb.keyframe_insert("rotation_quaternion",frame=f,group=pb.name)
            if pb.name=="root": pb.keyframe_insert("location",frame=f,group=pb.name)
    for fc in act.fcurves:
        for kp in fc.keyframe_points: kp.interpolation='LINEAR'
    act.frame_range=(0,n); act.use_frame_range=True
    tr=rig.animation_data.nla_tracks.new(); tr.name=name; tr.strips.new(name,0,act); tr.mute=True
rig.animation_data.action=bpy.data.actions["Idle"]; sc.frame_start=0; sc.frame_end=90
bpy.ops.wm.save_as_mainfile(filepath="/private/tmp/claude-501/vittata_build/o_anim.blend")
print("ACTIONS",[(a.name,tuple(a.frame_range)) for a in bpy.data.actions])
