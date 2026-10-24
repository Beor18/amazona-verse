import bpy, sys
from mathutils import Vector
args=sys.argv[sys.argv.index("--")+1:]
out=args[0]; cz=float(args[1]); dist=float(args[2])
sc=bpy.context.scene
for o in list(bpy.data.objects):
    if o.type in('CAMERA','LIGHT'): bpy.data.objects.remove(o)
cam=bpy.data.objects.new("cam",bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera=cam
for rot,e in [((0.7,0.1,-0.6),3.0),((1.0,0,2.4),1.5),((0.3,0,0.9),1.0)]:
    l=bpy.data.objects.new("l",bpy.data.lights.new("l","SUN")); l.data.energy=e; l.data.use_shadow=False; sc.collection.objects.link(l); l.rotation_euler=rot
sc.world=bpy.data.worlds.new("w"); sc.world.color=(0.15,0.15,0.16)
sc.render.engine='BLENDER_EEVEE_NEXT'; sc.render.resolution_x=450; sc.render.resolution_y=500
sc.view_settings.view_transform='Standard'
c=Vector((0,0,cz)); files=[]
for name,d in [("f",Vector((0,-1,0.1))),("q",Vector((0.8,-1,0.25))),("s",Vector((1,0,0.05))),("b",Vector((-0.5,1,0.3)))]:
    d.normalize(); cam.location=c+d*dist
    cam.rotation_euler=(c-cam.location).to_track_quat('-Z','Y').to_euler()
    sc.render.filepath=f"{out}_{name}.png"; files.append(sc.render.filepath)
    bpy.ops.render.render(write_still=True)
print("FILES"," ".join(files))
