# Pipeline de Vittata · auxiliar (no entra en la build): renders de poses de las animaciones; correr desde BUILD.
# Regenerar todo desde cero (vittata.glb, máscaras, montajes, vittata_glb.js): tools/blender/vittata_build.sh
import bpy, sys
from mathutils import Vector
args=sys.argv[sys.argv.index("--")+1:]
out=args[0]; view=args[1]; jobs=[(a.split(":")[0],int(a.split(":")[1])) for a in args[2:]]
sc=bpy.context.scene; rig=bpy.data.objects["Rig"]
for o in list(bpy.data.objects):
    if o.type in('CAMERA','LIGHT'): bpy.data.objects.remove(o)
cam=bpy.data.objects.new("cam",bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera=cam
for rot,e in [((0.7,0.1,-0.6),3.0),((1.0,0,2.4),1.5),((0.3,0,0.9),1.0)]:
    l=bpy.data.objects.new("l",bpy.data.lights.new("l","SUN")); l.data.energy=e; l.data.use_shadow=(len(sys.argv)<0); sc.collection.objects.link(l); l.rotation_euler=rot
sc.world=bpy.data.worlds.new("w"); sc.world.color=(0.15,0.15,0.16)
sc.render.engine='BLENDER_EEVEE_NEXT'; sc.render.resolution_x=380; sc.render.resolution_y=480
sc.view_settings.view_transform='Standard'
c=Vector((0,0,0.75)); d={"q":Vector((0.8,-1,0.25)),"f":Vector((0,-1,0.1)),"s":Vector((1,0,0.05)),"b":Vector((-0.4,1,0.3))}[view].normalized()
cam.location=c+d*3.4; cam.rotation_euler=(c-cam.location).to_track_quat('-Z','Y').to_euler()
for tr in rig.animation_data.nla_tracks: tr.mute=True
files=[]
for i,(a,f) in enumerate(jobs):
    rig.animation_data.action=bpy.data.actions[a]; sc.frame_set(f)
    sc.render.filepath=f"{out}_{i}.png"; bpy.ops.render.render(write_still=True); files.append(sc.render.filepath)
print("FILES"," ".join(files))
