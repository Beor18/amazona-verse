# HISTÓRICO: primer intento (cabeza original + cuerpo reconstruido), descartado. No entra en la build actual; s4_anim.py sí:
# o3_build.py ejecuta sus funciones de animación. Rutas relativas al repo (vittata_paths.py).
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); from vittata_paths import src, build, out, tool
import bpy, bmesh, math, sys
sys.path.insert(0,tool(""))
from common import *
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
for o in list(bpy.data.objects):
    if o.name!="Amazon parrots": bpy.data.objects.remove(o)
for m in list(bpy.data.materials): bpy.data.materials.remove(m)
p=bpy.data.objects["Amazon parrots"]; p.name="Head"; p.data.name="Head"
bpy.context.view_layer.objects.active=p; p.select_set(True)
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
me=p.data
if "UVMap" in me.uv_layers: me.uv_layers.remove(me.uv_layers["UVMap"])
if "Col" in me.attributes: me.attributes.remove(me.attributes["Col"])
gi={vg.name:vg.index for vg in p.vertex_groups}
def W(v,n): 
    for g in v.groups:
        if g.group==gi[n]: return g.weight
    return 0.0
bm=bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
dl=bm.verts.layers.deform.active
def w(v,n): return v[dl].get(gi[n],0.0)
# eye spheres
eyes={}
for side,g in (("L","OjoL"),("R","OjoR")):
    vs=[v for v in bm.verts if w(v,g)>0.5]
    lo=Vector((min(v.co.x for v in vs),min(v.co.y for v in vs),min(v.co.z for v in vs)))
    hi=Vector((max(v.co.x for v in vs),max(v.co.y for v in vs),max(v.co.z for v in vs)))
    c=(lo+hi)/2; r=sum((v.co-c).length for v in vs)/len(vs)
    eyes[side]=(c,r); print("EYE",side,tuple(round(x,3) for x in c),round(r,3))
    bmesh.ops.delete(bm,geom=vs,context='VERTS')
# tongue flag, delete flare
bm.verts.ensure_lookup_table()
flare=[v for v in bm.verts if v.co.z<5.62]
bmesh.ops.delete(bm,geom=flare,context='VERTS')
bm.faces.ensure_lookup_table()
# shell bvh for eye exposure
bvh=BVHTree.FromBMesh(bm)
# materials index: 0 Feathers 1 Beak 2 Patch 3 Ring 4 Claws(tongue)
names=["Feathers","Beak","Patch","Ring","Claws"]
tongue=set(v.index for v in bm.verts if max(w(v,n) for n in ["Lengua","Lengua.001","Lengua.002"])>0.5)
# beak verts
P=dict(ring_r=float(sys.argv[-4]) if len(sys.argv)>5 else 0.62)
def is_beak_v(v):
    up=w(v,"PicoUp"); dn=w(v,"PicoDown"); cb=w(v,"Cabeza")
    return up>0.5 or (dn>0.8)
beakv=[v.co.copy() for v in bm.verts if is_beak_v(v) and v.index not in tongue]
from mathutils.kdtree import KDTree
kd=KDTree(len(beakv))
for i,c in enumerate(beakv): kd.insert(c,i)
kd.balance()
cnt=[0]*5
for f in bm.faces:
    vs=f.verts; c=f.calc_center_median()
    if all(v.index in tongue for v in vs): mi=4
    elif sum(1 for v in vs if is_beak_v(v))*2>len(vs): mi=1
    else:
        mi=0
        for s,(ec,er) in eyes.items():
            if (c-ec).length<er*2.0: mi=3
        if mi==0:
            ez=eyes["L"][0].z; ex=abs(eyes["L"][0].x)
            dist=kd.find(c)[2]
            fy=c.y<eyes["L"][0].y+0.3
            if fy and abs(c.x)<ex and ez-1.0<c.z<ez+0.32 and dist<0.8: mi=2
            if fy and abs(c.x)<ex+0.45 and ez-1.0<c.z<ez-0.25 and dist<0.4: mi=2
    f.material_index=mi; cnt[mi]+=1
print("faces per mat",dict(zip(names,cnt)))
set_mats(p,names)
bm.to_mesh(me); bm.free()
for f in me.polygons: f.use_smooth=True
# decimate
tris=sum(len(f.vertices)-2 for f in me.polygons)
mod=p.modifiers.new("dec",'DECIMATE'); mod.ratio=22000/tris
bpy.ops.object.modifier_apply(modifier="dec")
print("head tris",sum(len(f.vertices)-2 for f in me.polygons))
# eyes: new spheres aligned to gaze
eo_list=[]
for s,(c,r) in eyes.items():
    # gaze: directions on sphere not covered by shell
    acc=Vector(); n=0
    for i in range(2000):
        th=math.acos(1-2*(i+0.5)/2000); ph=math.pi*(1+5**0.5)*i
        d=Vector((math.sin(th)*math.cos(ph),math.sin(th)*math.sin(ph),math.cos(th)))
        hit=bvh.ray_cast(c+d*r*1.01,d,20.0)
        if hit[0] is None: acc+=d; n+=1
    gaze=acc.normalized(); print("GAZE",s,tuple(round(x,3) for x in gaze),n)
    bm=bmesh.new()
    bmesh.ops.create_uvsphere(bm,u_segments=40,v_segments=28,radius=r)
    rot=Vector((0,0,1)).rotation_difference(gaze).to_matrix().to_4x4()
    bmesh.ops.transform(bm,matrix=Matrix.Translation(c)@rot,verts=bm.verts)
    em=bpy.data.meshes.new("Eye"+s); bm.to_mesh(em); bm.free()
    eo=bpy.data.objects.new("Eye"+s,em); bpy.context.scene.collection.objects.link(eo)
    set_mats(eo,["EyeWhite","EyeIris"])
    col=em.color_attributes.new("Col",'BYTE_COLOR','CORNER')
    hl=(gaze+Vector((0,0,0.55))+Vector((-0.25 if s=="L" else 0.25,-0.2,0))).normalized()
    for f in em.polygons:
        fc=(f.center-c).normalized(); a=math.degrees(fc.angle(gaze))
        f.use_smooth=True
        if a<40:
            f.material_index=1
            if (fc.angle(hl))<math.radians(7.5): f.material_index=0
        for li in f.loop_indices:
            vco=(em.vertices[em.loops[li].vertex_index].co-c).normalized()
            av=math.degrees(vco.angle(gaze))
            colr=(1,1,1,1) if f.material_index==0 else ((0.012,0.008,0.006,1) if av<19 else (0.20,0.11,0.045,1))
            col.data[li].color=colr
    vg=eo.vertex_groups.new(name="Ojo"+s); vg.add(list(range(len(em.vertices))),1.0,'REPLACE')
    eo["gaze"]=list(gaze); eo["center"]=list(c); eo["radius"]=r
bpy.ops.wm.save_as_mainfile(filepath=build("head.blend"))
