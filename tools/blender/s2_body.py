import bpy, bmesh, math, sys
sys.path.insert(0,"/private/tmp/claude-501/vittata_build")
from common import *
from mathutils import Vector, Matrix, Quaternion
def ellip(bm,c,rad,dirx=None,seg=20,ring=12):
    m=Matrix.Diagonal(Vector(rad)).to_4x4()
    if dirx is not None:
        # dirx: tuple of (xaxis, zhint) to build rotation
        xa=Vector(dirx[0]).normalized(); zh=Vector(dirx[1])
        ya=zh.cross(xa).normalized(); za=xa.cross(ya).normalized()
        R=Matrix((xa,ya,za)).transposed().to_4x4()
        m=R@m
    ret=bmesh.ops.create_uvsphere(bm,u_segments=seg,v_segments=ring,radius=1.0)
    bmesh.ops.transform(bm,matrix=Matrix.Translation(Vector(c))@m,verts=ret['verts'])
def chain(bm,pts,rads,flat=1.0,zhint=(0,0,1),step=0.25):
    for i in range(len(pts)-1):
        a=Vector(pts[i]);b=Vector(pts[i+1]); L=(b-a).length
        n=max(2,int(L/(step*min(rads[i],rads[i+1])))+1)
        for j in range(n+1):
            t=j/n; p=a.lerp(b,t); r=rads[i]+(rads[i+1]-rads[i])*t
            ellip(bm,p,(r*1.6,r,r*flat),((b-a),zhint),seg=16,ring=10)
def lathe(bm,prof,seg=48):
    rings=[]
    for z,rx,ry,cy in prof:
        rings.append([bm.verts.new((rx*math.cos(2*math.pi*i/seg),cy+ry*math.sin(2*math.pi*i/seg),z)) for i in range(seg)])
    for a,b in zip(rings,rings[1:]):
        for i in range(seg): bm.faces.new((a[i],a[(i+1)%seg],b[(i+1)%seg],b[i]))
    bot=bm.verts.new((0,prof[0][3],prof[0][0]-0.08)); top=bm.verts.new((0,prof[-1][3],prof[-1][0]+0.08))
    for i in range(seg):
        bm.faces.new((rings[0][(i+1)%seg],rings[0][i],bot)); bm.faces.new((rings[-1][i],rings[-1][(i+1)%seg],top))
def finish(bm,name,voxel,target):
    me=bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o=bpy.data.objects.new(name,me); bpy.context.scene.collection.objects.link(o)
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active=o; o.select_set(True)
    me.remesh_voxel_size=voxel; me.remesh_voxel_adaptivity=0.0
    bpy.ops.object.voxel_remesh()
    sm=o.modifiers.new("sm",'SMOOTH'); sm.factor=0.6; sm.iterations=6
    bpy.ops.object.modifier_apply(modifier="sm")
    tris=sum(len(f.vertices)-2 for f in o.data.polygons)
    d=o.modifiers.new("d",'DECIMATE'); d.ratio=target/tris
    bpy.ops.object.modifier_apply(modifier="d")
    sm=o.modifiers.new("sm2",'LAPLACIANSMOOTH'); sm.lambda_factor=0.4; sm.iterations=3; sm.use_volume_preserve=True
    bpy.ops.object.modifier_apply(modifier="sm2")
    for f in o.data.polygons: f.use_smooth=True
    print(name,"tris",sum(len(f.vertices)-2 for f in o.data.polygons))
    return o
# ---------- BODY
bm=bmesh.new()
prof=[(1.5,0.5,0.45,0.15),(1.6,0.9,0.8,0.14),(1.78,1.2,1.06,0.12),(2.1,1.46,1.28,0.09),(2.6,1.6,1.4,0.06),(3.1,1.62,1.4,0.05),
 (3.6,1.55,1.3,0.05),(4.1,1.4,1.14,0.05),(4.6,1.18,0.9,0.04),(5.0,0.95,0.68,0.03),(5.35,0.84,0.56,0.03),(5.65,0.8,0.52,0.03),
 (5.95,0.74,0.48,0.03),(6.1,0.55,0.34,0.03)]
lathe(bm,prof)
for s in (1,-1):
    # thigh bulge
    ellip(bm,(s*0.66,0.02,1.78),(0.55,0.55,0.48))
    # arm
    chain(bm,[(s*0.85,0.1,4.6),(s*1.4,0.12,4.55),(s*2.2,0.14,4.45),(s*3.3,0.1,4.33)],[0.46,0.34,0.3,0.26],flat=0.95)
    # hand
    ellip(bm,(s*3.62,0.08,4.31),(0.5,0.42,0.16),((s,0,-0.05),(0,0,1)))
    for k,ang in enumerate((-42,-15,12,38)):
        a=math.radians(ang); d=Vector((s*math.cos(a),math.sin(a),-0.06)).normalized()
        L=(0.78,0.92,0.88,0.7)[k]
        base=Vector((s*3.7,0.08,4.31))
        for j in range(7):
            t=j/6; r=0.145-0.06*t
            ellip(bm,base+d*(0.2+L*t),(r*1.5,r,0.09),(d,(0,0,1)),seg=16,ring=8)
# tail feathers
for ang in (-20,0,20):
    a=math.radians(ang); d=Vector((math.sin(a),math.cos(a)*0.85,-0.55)).normalized()
    c=Vector((0,1.05,2.05))+d*0.55
    ellip(bm,c,(0.62,0.21,0.06),(d,(0,-0.5,1)))
body=finish(bm,"Body",0.04,12500)
set_mats(body,["Feathers","WingTip"])
for f in body.data.polygons:
    if abs(f.center.x)>3.28: f.material_index=1
# ---------- FEET
bm=bmesh.new()
claws=[]
for s in (1,-1):
    ank=Vector((s*0.66,-0.05,0.6))
    chain(bm,[(s*0.62,0.02,1.75),tuple(ank)],[0.17,0.15],flat=1.0,zhint=(0,1,0))
    ellip(bm,ank,(0.19,0.19,0.18))
    for ang in (-30,0,30):
        a=math.radians(ang); d=Vector((s*math.sin(a)*1.0,-math.cos(a),0)).normalized()
        tip=ank+d*0.82+Vector((0,0,-0.17))
        mid=ank+d*0.42+Vector((0,0,-0.12))
        chain(bm,[tuple(ank+Vector((0,0,-0.05))),tuple(mid),tuple(tip)],[0.13,0.115,0.085],flat=0.9,zhint=(0,0,1))
        claws.append((tip+d*0.06,d))
    # small back toe
    chain(bm,[tuple(ank+Vector((0,0,-0.05))),tuple(ank+Vector((0,0.32,-0.16)))],[0.11,0.075])
feet=finish(bm,"Feet",0.03,2200)
bm=bmesh.new(); bm.from_mesh(feet.data)
for f in bm.faces: f.material_index=0
for p,d in claws:
    dd=(d+Vector((0,0,-0.55))).normalized()
    ret=bmesh.ops.create_cone(bm,cap_ends=True,segments=10,radius1=0.075,radius2=0.0,depth=0.24)
    R=Vector((0,0,1)).rotation_difference(dd).to_matrix().to_4x4()
    bmesh.ops.transform(bm,matrix=Matrix.Translation(p+dd*0.1)@R,verts=ret['verts'])
    for f in {f for v in ret['verts'] for f in v.link_faces}: f.material_index=1; f.smooth=True
set_mats(feet,["Feet","Claws"])
bm.to_mesh(feet.data); bm.free()
mz=min(v.co.z for v in feet.data.vertices); print("FEET minz",mz)
bpy.ops.wm.save_as_mainfile(filepath="/private/tmp/claude-501/vittata_build/model.blend")
