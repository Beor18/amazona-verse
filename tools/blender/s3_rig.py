import bpy, bmesh, math, sys, json
sys.path.insert(0,"/private/tmp/claude-501/vittata_build")
from common import *
from mathutils import Vector, Matrix, Quaternion, Euler
from mathutils.bvhtree import BVHTree
sc=bpy.context.scene; sc.render.fps=30
for o in list(bpy.data.objects):
    if o.type!='MESH': bpy.data.objects.remove(o)
objs={n:bpy.data.objects[n] for n in ["Head","EyeL","EyeR","Body","Feet"]}
minz=min(v.co.z for v in objs["Feet"].data.vertices); maxz=max(v.co.z for v in objs["Head"].data.vertices)
H=1.4; k=H/(maxz-minz); O=Vector((0,0.05,minz))
print("SCALE k",k)
M=Matrix.Diagonal((k,k,k,1))@Matrix.Translation(-O)
for o in objs.values():
    o.data.transform(M); o.data.update()
    o.matrix_world=Matrix.Identity(4)
def T(*v): return (Vector(v)-O)*k
# eye info
eyes={}
for s in "LR":
    e=objs["Eye"+s]; eyes[s]=(T(*e["center"]),Vector(e["gaze"]),e["radius"]*k)
# ---------- armature
arm=bpy.data.armatures.new("Rig"); rig=bpy.data.objects.new("Rig",arm); sc.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig; bpy.ops.object.mode_set(mode='EDIT')
eb=arm.edit_bones
def bone(name,h,t,parent=None,deform=True,roll_up=None,conn=False):
    b=eb.new(name); b.head=h; b.tail=t
    if parent: b.parent=eb[parent]; b.use_connect=conn
    b.use_deform=deform
    if roll_up is not None: b.align_roll(Vector(roll_up))
    return b
bone("root",T(0,0,minz),T(0,0.9,minz))
bone("hips",T(0,0.08,2.2),T(0,0.06,3.2),"root",roll_up=(0,-1,0))
bone("spine",T(0,0.06,3.2),T(0,0.05,4.1),"hips",roll_up=(0,-1,0),conn=True)
bone("chest",T(0,0.05,4.1),T(0,0.03,5.1),"spine",roll_up=(0,-1,0),conn=True)
bone("neck",T(0,0.03,5.1),T(0,0.1,6.2),"chest",roll_up=(0,-1,0),conn=True)
bone("head",T(0,0.1,6.2),T(0,0.1,9.3),"neck",roll_up=(0,-1,0),conn=True)
bone("beak_upper",T(0,-0.6,7.7),T(0,-2.4,7.0),"head",roll_up=(0,0,1))
bone("beak_lower",T(0,0.0,6.95),T(0,-1.9,6.15),"head",roll_up=(0,0,1))
for s in "LR":
    c,g,r=eyes[s]; bone("eye_"+s,c,c+g*0.06,"head",roll_up=(0,0,1))
for s,sg in (("L",1),("R",-1)):
    bone("shoulder_"+s,T(sg*0.35,0.1,4.75),T(sg*1.0,0.1,4.6),"chest",roll_up=(0,0,1))
    bone("upper_"+s,T(sg*1.0,0.1,4.6),T(sg*2.2,0.14,4.45),"shoulder_"+s,roll_up=(0,0,1),conn=True)
    bone("lower_"+s,T(sg*2.2,0.14,4.45),T(sg*3.3,0.1,4.33),"upper_"+s,roll_up=(0,0,1),conn=True)
    bone("hand_"+s,T(sg*3.3,0.1,4.33),T(sg*4.45,0.08,4.26),"lower_"+s,roll_up=(0,0,1),conn=True)
    bone("thigh_"+s,T(sg*0.62,0.03,2.15),T(sg*0.64,0.0,1.3),"hips",roll_up=(0,-1,0))
    bone("shin_"+s,T(sg*0.64,0.0,1.3),T(sg*0.66,-0.05,0.6),"thigh_"+s,roll_up=(0,-1,0),conn=True)
    bone("foot_"+s,T(sg*0.66,-0.05,0.6),T(sg*0.66,-0.85,0.4),"shin_"+s,roll_up=(0,0,1),conn=True)
bone("tail",T(0,0.9,2.3),T(0,1.9,1.55),"hips",roll_up=(0,0,1))
bpy.ops.object.mode_set(mode='OBJECT')
# ---------- skin
dg=bpy.context.evaluated_depsgraph_get()
def add_arm_mod(o):
    m=o.modifiers.new("Armature",'ARMATURE'); m.object=rig; o.parent=rig
# head weights
h=objs["Head"]; gi={vg.name:vg.index for vg in h.vertex_groups}
src={"head":["Cabeza"],"beak_upper":["PicoUp"],"beak_lower":["PicoDown","Lengua","Lengua.001","Lengua.002"],"neck":["Cuello","Pecho"]}
new={b:h.vertex_groups.new(name=b) for b in src}
for v in h.data.vertices:
    w={g.group:g.weight for g in v.groups}
    vals={b:sum(w.get(gi[n],0) for n in ns if n in gi) for b,ns in src.items()}
    vals["beak_lower"]=min(vals["beak_lower"],1.0)
    tot=sum(vals.values())
    if tot<1e-4: vals={"head":1.0}; tot=1.0
    for b,x in vals.items():
        if x/tot>0.01: new[b].add([v.index],x/tot,'REPLACE')
for n in list(gi): h.vertex_groups.remove(h.vertex_groups[n])
add_arm_mod(h)
for s in "LR":
    e=objs["Eye"+s]; e.vertex_groups[0].name="eye_"+s; add_arm_mod(e)
# body/feet auto weights (only body bones deform during heat)
nodef=["beak_upper","beak_lower","eye_L","eye_R","root"]
for n in nodef: arm.bones[n].use_deform=False
for n in ["Body","Feet"]:
    o=objs[n]; bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); rig.select_set(True)
    bpy.context.view_layer.objects.active=rig
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    print(n,"groups",[g.name for g in o.vertex_groups])
for n in nodef[:-1]: arm.bones[n].use_deform=True
arm.bones["root"].use_deform=False
# feet: force leg-only bones
f=objs["Feet"]
allowed={"thigh_L","shin_L","foot_L","thigh_R","shin_R","foot_R"}
for o in [objs["Body"],f]:
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active=o
    if o is f:
        for g in list(o.vertex_groups):
            if g.name not in allowed: o.vertex_groups.remove(g)
    bpy.ops.object.vertex_group_clean(group_select_mode='ALL',limit=0.02)
    bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL',limit=4)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL',lock_active=False)
    # verts without weights
    nz=[v.index for v in o.data.vertices if not v.groups]
    print(o.name,"unweighted",len(nz))
    for i in nz:
        x=o.data.vertices[i].co.x
        o.vertex_groups["foot_L" if x>0 else "foot_R"].add([i],1.0,'REPLACE')
# ---------- mounts
for b in ["Head","Body"]: pass
rig.data.pose_position='REST'; bpy.context.view_layer.update()
def bvh_of(names):
    bm=bmesh.new()
    for n in names:
        bm.from_mesh(objs[n].data)
    t=BVHTree.FromBMesh(bm); bm.free(); return t
surf=bvh_of(["Head","Body","EyeL","EyeR"])
bodyb=bvh_of(["Body"]); headb=bvh_of(["Head","EyeL","EyeR"])
def ray(b,origin,d):
    loc,n,i,dist=b.ray_cast(origin,Vector(d).normalized(),50)
    return loc,n
ec=(eyes["L"][0]+eyes["R"][0])/2
mounts={}
loc,n=ray(headb,Vector((0,T(0,0.5,0).y,10)),(0,0,-1)); mounts["mount_head_top"]=(loc,Vector((0,0,1)),Vector((0,-1,0)),"head")
loc,n=ray(headb,Vector((0,-5,ec.z+0.01)),(0,1,0)); mounts["mount_eyes"]=(loc,Vector((0,-1,0)),Vector((0,0,1)),"head")
loc,n=ray(bodyb,Vector((0,-5,T(0,0,5.3).z)),(0,1,0)); mounts["mount_neck"]=(loc,n,Vector((0,0,1)),"neck")
loc,n=ray(bodyb,Vector((0,-5,T(0,0,4.15).z)),(0,1,0)); mounts["mount_chest"]=(loc,n,Vector((0,0,1)),"chest")
loc,n=ray(bodyb,Vector((0,5,T(0,0,4.45).z)),(0,-1,0)); mounts["mount_back"]=(loc,n,Vector((0,0,1)),"chest")
for s,sg in (("L",1),("R",-1)):
    p=T(sg*2.75,0.12,4.39)
    loc,n=ray(bodyb,Vector((p.x,p.y,5)),(0,0,-1))
    # glTF +Y along forearm toward hand
    mounts["mount_wing_"+s]=(loc,Vector((0,0,1)),Vector((sg,0,0)),"lower_"+s)
bpy.context.view_layer.objects.active=rig; bpy.ops.object.mode_set(mode='EDIT')
for name,(loc,nrm,up,par) in mounts.items():
    nrm=nrm.normalized(); up=(up-nrm*up.dot(nrm)).normalized()
    b=eb.new(name); b.head=loc; b.tail=loc-nrm*0.05   # Blender local -Y = outward -> glTF +Z outward
    b.align_roll(up); b.use_deform=False; b.parent=eb[par]
    print("MOUNT",name,tuple(round(x,4) for x in loc))
bpy.ops.object.mode_set(mode='OBJECT')
rig.data.pose_position='POSE'
bpy.ops.wm.save_as_mainfile(filepath="/private/tmp/claude-501/vittata_build/rigged.blend")
