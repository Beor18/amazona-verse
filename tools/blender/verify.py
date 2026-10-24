import bpy, os, math
from mathutils import Vector
G="/Users/kelvingarciapr/AmazonaVerse/Juego/assets/models/vittata.glb"; OUT="/Users/kelvingarciapr/AmazonaVerse/Juego/docs/img/"
bpy.ops.wm.read_factory_settings(use_empty=True)
sc=bpy.context.scene; sc.render.fps=30
bpy.ops.import_scene.gltf(filepath=G)
meshes=[o for o in bpy.data.objects if o.type=='MESH']; rig=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]
for o in meshes:
    print("MESH",o.name,"verts",len(o.data.vertices),"tris",sum(len(p.vertices)-2 for p in o.data.polygons),"mats",[m.name for m in o.data.materials])
print("TOTAL TRIS",sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes))
names=[b.name for b in rig.data.bones]; print("BONES",len(names),names)
print("MOUNTS",[n for n in names if n.startswith("mount_")])
for a in bpy.data.actions: print("ACTION",a.name,a.frame_range[:], "sec",(a.frame_range[1]-a.frame_range[0])/30)
print("MATERIALS",[m.name for m in bpy.data.materials],"IMAGES",[(i.name,i.size[:]) for i in bpy.data.images])
print("SIZE",os.path.getsize(G))
def act(n): return [a for a in bpy.data.actions if a.name.startswith(n)][0]
rig.animation_data.action=act("Idle")
# feet check over each action
for n in ["Idle","Welcome","Celebrate","Curious","Walk"]:
    rig.animation_data.action=act(n); a=act(n); zs=[]
    for f in range(int(a.frame_range[0]),int(a.frame_range[1])+1,3):
        sc.frame_set(f); dg=bpy.context.evaluated_depsgraph_get()
        e=bpy.data.objects['Vittata'].evaluated_get(dg); m=e.to_mesh(); zs.append(min((e.matrix_world@v.co).z for v in m.vertices)); e.to_mesh_clear()
    print("MINZ",n,round(min(zs),3),round(max(zs),3))
# ---- render setup
sc.render.engine='CYCLES'; sc.cycles.samples=48; sc.cycles.use_denoising=True
sc.render.resolution_x=900; sc.render.resolution_y=1000; sc.view_settings.view_transform='Standard'
w=bpy.data.worlds.new("w"); sc.world=w; w.use_nodes=True; w.node_tree.nodes["Background"].inputs[0].default_value=(0.035,0.037,0.042,1)
def area(name,loc,energy,size,col=(1,1,1)):
    l=bpy.data.lights.new(name,'AREA'); l.energy=energy; l.size=size; l.color=col
    o=bpy.data.objects.new(name,l); sc.collection.objects.link(o); o.location=loc
    o.rotation_euler=(Vector((0,0,0.75))-Vector(loc)).to_track_quat('-Z','Y').to_euler()
area("key",(1.8,-2.2,2.4),180,1.5,(1,0.97,0.92)); area("fill",(-2.4,-1.6,1.2),60,2.0,(0.9,0.95,1)); area("rim",(0.3,2.5,2.4),140,1.2)
fl=bpy.data.objects.new("floor",bpy.data.meshes.new("floor")); 
import bmesh; bm=bmesh.new(); bmesh.ops.create_circle(bm,cap_ends=True,radius=3,segments=48); bm.to_mesh(fl.data); bm.free()
sc.collection.objects.link(fl); fm=bpy.data.materials.new("fm"); fm.use_nodes=True
fm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value=(0.05,0.052,0.058,1); fl.data.materials.append(fm)
cam=bpy.data.objects.new("cam",bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera=cam
cam.data.lens=50; c=Vector((0,0,0.72)); cam.location=c+Vector((1.35,-2.9,0.75))
cam.rotation_euler=(c-cam.location).to_track_quat('-Z','Y').to_euler()
def shot(n,f,fn):
    rig.animation_data.action=act(n); sc.frame_set(f); sc.render.filepath=OUT+fn; bpy.ops.render.render(write_still=True)
shot("Idle",45,"vittata3d_idle.png"); shot("Welcome",30,"vittata3d_welcome.png"); shot("Celebrate",20,"vittata3d_celebrate.png")
rig.animation_data.action=act("Idle"); sc.frame_set(45)
cols={"mount_head_top":(1,0,0),"mount_eyes":(1,0.6,0),"mount_neck":(1,1,0),"mount_chest":(0,1,1),"mount_back":(0.2,0.3,1),"mount_wing_L":(1,0,1),"mount_wing_R":(0.6,0,1)}
for n,cl in cols.items():
    pb=rig.pose.bones[n]; p=rig.matrix_world@pb.matrix; 
    bm=bmesh.new(); bmesh.ops.create_uvsphere(bm,u_segments=16,v_segments=10,radius=0.035); me=bpy.data.meshes.new(n); bm.to_mesh(me); bm.free()
    s=bpy.data.objects.new("S"+n,me); sc.collection.objects.link(s); s.location=p.translation
    m=bpy.data.materials.new(n); m.use_nodes=True; b=m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value=cl+(1,)
    b.inputs["Emission Color"].default_value=cl+(1,); b.inputs["Emission Strength"].default_value=2.0; me.materials.append(m)
    # axis stick showing +Z outward
    z=p.to_3x3().col[2].normalized()
    bm=bmesh.new(); bmesh.ops.create_cone(bm,cap_ends=True,segments=8,radius1=0.008,radius2=0.008,depth=0.09); me2=bpy.data.meshes.new(n+"z"); bm.to_mesh(me2); bm.free()
    st=bpy.data.objects.new("Z"+n,me2); sc.collection.objects.link(st); st.location=p.translation+z*0.045
    st.rotation_euler=Vector((0,0,1)).rotation_difference(z).to_euler(); me2.materials.append(m)
    print("MPOS",n,tuple(round(x,3) for x in p.translation))
sc.render.filepath=OUT+"vittata3d_mounts.png"; bpy.ops.render.render(write_still=True)
