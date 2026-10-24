import bpy, bmesh, math
from mathutils import Vector
sc=bpy.context.scene
for o in list(bpy.data.objects):
    if o.name!="Amazon parrots": bpy.data.objects.remove(o)
p=bpy.data.objects["Amazon parrots"]; me=p.data
bpy.context.view_layer.objects.active=p; p.select_set(True)
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
gi={vg.name:vg.index for vg in p.vertex_groups}
col=me.color_attributes.new("D",'FLOAT_COLOR','POINT')
for v in me.vertices:
    w={g.group:g.weight for g in v.groups}
    up=w.get(gi['PicoUp'],0); dn=w.get(gi['PicoDown'],0); cb=w.get(gi['Cabeza'],0)
    col.data[v.index].color=(up,cb,dn,1)
mat=bpy.data.materials.new("d"); mat.use_nodes=True; nt=mat.node_tree
bs=nt.nodes["Principled BSDF"]; a=nt.nodes.new("ShaderNodeAttribute"); a.attribute_name="D"
nt.links.new(a.outputs["Color"],bs.inputs["Base Color"])
me.materials.clear(); me.materials.append(mat)
cam=bpy.data.objects.new("cam",bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera=cam
l=bpy.data.objects.new("sun",bpy.data.lights.new("sun","SUN")); sc.collection.objects.link(l); l.rotation_euler=(0.6,0.2,-0.5)
sc.world=bpy.data.worlds.new("w"); sc.world.color=(0.3,0.3,0.3)
c=Vector((0,-0.2,7.3))
sc.render.engine='BLENDER_EEVEE_NEXT'; sc.render.resolution_x=500; sc.render.resolution_y=500
for name,d in [("front",Vector((0,-1,0))),("side",Vector((1,0,0))),("q",Vector((0.7,-1,0.3))),("top",Vector((0.0,-0.3,1)))]:
    d.normalize(); cam.location=c+d*12
    cam.rotation_euler=(c-cam.location).to_track_quat('-Z','Y').to_euler()
    sc.render.filepath=f"/private/tmp/claude-501/vittata_build/diag_{name}.png"
    bpy.ops.render.render(write_still=True)
