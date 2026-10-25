# HISTÓRICO: primer intento (cabeza original + cuerpo reconstruido), descartado. No entra en la build actual; s4_anim.py sí:
# o3_build.py ejecuta sus funciones de animación. Rutas relativas al repo (vittata_paths.py).
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); from vittata_paths import src, build, out, tool
import bpy, math, sys
from mathutils import Vector, Matrix, Quaternion, Euler
sc=bpy.context.scene; sc.render.fps=30
rig=bpy.data.objects["Rig"]; arm=rig.data
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
R={b.name:b.matrix_local.to_3x3() for b in arm.bones}
def sm(x): x=max(0,min(1,x)); return x*x*(3-2*x)
def env(t,a,b,c,d): # 0->1 over a..b, hold, 1->0 over c..d
    if t<=a or t>=d: return 0.0
    if t<b: return sm((t-a)/(b-a))
    if t>c: return 1-sm((t-c)/(d-c))
    return 1.0
SIDES=(("L",1),("R",-1))
def base():
    P={}
    for s,g in SIDES:
        P["shoulder_"+s]=[0,8*g,0]; P["upper_"+s]=[0,50*g,-12*g]; P["lower_"+s]=[0,14*g,-18*g]; P["hand_"+s]=[0,6*g,-8*g]
    return P
def add(P,b,v,g=1):
    cur=P.setdefault(b,[0,0,0]); P[b]=[cur[0]+v[0],cur[1]+v[1]*g,cur[2]+v[2]*g]
def mixarms(P,vals,e):  # blend arms toward target dict (L-side values), mirrored
    for s,g in SIDES:
        for part,v in vals.items():
            b=part+"_"+s; cur=P.setdefault(b,[0,0,0])
            tgt=[v[0],v[1]*g,v[2]*g]
            P[b]=[cur[i]+(tgt[i]-cur[i])*e for i in range(3)]
def idle(t):
    P=base(); ph=2*math.pi*t/90; L={}; S={}
    add(P,"chest",[1.5*math.sin(ph),0,0]); add(P,"spine",[-0.8*math.sin(ph),0,0])
    add(P,"neck",[-1.0*math.sin(ph),0,0])
    add(P,"head",[2.0*math.sin(2*ph),5*math.sin(ph),3*math.sin(ph)])
    for s,g in SIDES:
        add(P,"shoulder_"+s,[0,-2.5*math.sin(ph),0],g); add(P,"upper_"+s,[0,3*math.sin(ph+0.6)-3*math.sin(0.6)*math.cos(ph)*0,0],g)
        add(P,"lower_"+s,[0,0,-4*math.sin(ph)],g)
    add(P,"tail",[0,0,5*math.sin(ph)])
    bl=env(t,50,53,53,57)
    S["eye_L"]=S["eye_R"]=(1,1,1-0.8*bl)
    return P,L,S
def welcome(t):
    P=base(); e=env(t,0,18,40,60); L={}; S={}
    mixarms(P,{"shoulder":[0,-8,0],"upper":[-25,-2,-48],"lower":[-10,-4,-12],"hand":[-35,-12,-4]},e)
    add(P,"chest",[-6*e,0,0]); add(P,"neck",[-3*e,0,0]); add(P,"head",[-6*e,7*e*math.sin(math.pi*t/60),0])
    add(P,"beak_lower",[12*e,0,0]); add(P,"spine",[-3*e,0,0])
    L["root"]=Vector((0,0,0.01*math.sin(math.pi*min(1,t/20))*(1 if t<20 else 0)))
    return P,L,S
def celebrate(t):
    P=base(); L={}; S={}
    ea=env(t,0,6,36,45)
    hop=math.sin(math.pi*(t-8)/22) if 8<t<30 else 0.0
    L["root"]=Vector((0,0,0.16*hop))
    pre=env(t,0,6,6,12)
    add(P,"chest",[6*pre-6*hop,0,0]); add(P,"head",[-10*ea,0,0]); add(P,"beak_lower",[16*ea,0,0])
    for s,g in SIDES:
        add(P,"thigh_"+s,[-22*hop,0,0],g); add(P,"shin_"+s,[38*hop,0,0],g); add(P,"foot_"+s,[-20*hop,0,0],g)
    if 4<t<40:
        fl=0.5-0.5*math.cos(2*math.pi*2*(t-4)/36)
        for s,g in SIDES:
            add(P,"upper_"+s,[0,-95*fl,10*fl],g); add(P,"lower_"+s,[0,-10*fl,0],g); add(P,"hand_"+s,[0,20*fl*math.sin(2*math.pi*2*(t-4)/36),0],g)
    add(P,"tail",[-15*ea,0,0])
    return P,L,S
def curious(t):
    P=base(); e=env(t,0,12,46,60); L={}; S={}
    add(P,"spine",[5*e,0,0]); add(P,"chest",[9*e,0,0]); add(P,"neck",[6*e,0,0])
    look=math.sin(2*math.pi*t/60)
    add(P,"head",[4*e,16*e*math.sin(math.pi*t/60)**1,28*e*look])
    add(P,"eye_L",[0,0,0]); 
    for s,g in SIDES:
        add(P,"upper_"+s,[0,-4*e,14*e],g); add(P,"lower_"+s,[0,0,10*e],g)
    add(P,"tail",[-10*e,0,0])
    return P,L,S
def walk(t):
    P=base(); ph=2*math.pi*t/30; L={}; S={}
    sn=math.sin(ph)
    add(P,"hips",[0,7*sn,5*sn]); add(P,"chest",[0,-4*sn,-3*sn]); add(P,"head",[0,-3*sn,0])
    L["root"]=Vector((0,0,0.012*(1-math.cos(2*ph))/2))
    for s,g,sg in (("L",1,1),("R",-1,-1)):
        x=sn*sg; lift=max(0,x)**2
        add(P,"thigh_"+s,[-20*x,0,0],g); add(P,"shin_"+s,[32*lift,0,0],g); add(P,"foot_"+s,[-30*lift-10*x,0,0],g)
        add(P,"upper_"+s,[0,0,10*x],g)
    add(P,"tail",[0,0,9*sn])
    return P,L,S
def apply_pose(P,L,S):
    for pb in rig.pose.bones:
        pb.rotation_mode='QUATERNION'
        rx,ry,rz=P.get(pb.name,[0,0,0])
        Q=(Quaternion((0,0,1),math.radians(rz))@Quaternion((0,1,0),math.radians(ry))@Quaternion((1,0,0),math.radians(rx)))
        r=R[pb.name]
        ql=(r.inverted()@Q.to_matrix()@r).to_quaternion()
        pb.rotation_quaternion=ql
        lw=L.get(pb.name,Vector()); pb.location=r.inverted()@lw
        pb.scale=S.get(pb.name,(1,1,1))
ACTS=[("Idle",idle,90),("Welcome",welcome,60),("Celebrate",celebrate,45),("Curious",curious,60),("Walk",walk,30)]
rig.animation_data_create()
deform=[pb for pb in rig.pose.bones if not pb.name.startswith("mount_")]
for name,fn,n in ACTS:
    act=bpy.data.actions.new(name); act.use_fake_user=True; rig.animation_data.action=act
    for f in range(n+1):
        apply_pose(*fn(f))
        for pb in deform:
            pb.keyframe_insert("rotation_quaternion",frame=f,group=pb.name)
            pb.keyframe_insert("location",frame=f,group=pb.name)
            pb.keyframe_insert("scale",frame=f,group=pb.name)
    for fc in act.fcurves:
        for kp in fc.keyframe_points: kp.interpolation='LINEAR'
    act.frame_range=(0,n); act.use_frame_range=True
    tr=rig.animation_data.nla_tracks.new(); tr.name=name
    st=tr.strips.new(name,0,act); tr.mute=True
rig.animation_data.action=bpy.data.actions["Idle"]
sc.frame_start=0; sc.frame_end=90
# check every action starts/ends at base
apply_pose(*idle(0))
bpy.ops.wm.save_as_mainfile(filepath=build("animated.blend"))
print("ACTIONS",[(a.name,tuple(a.frame_range)) for a in bpy.data.actions])
