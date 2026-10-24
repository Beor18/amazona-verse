import bpy, json
from mathutils import Vector
o=bpy.data.objects['Vittata']; me=o.data; rig=bpy.data.objects['Rig']
gi={g.index:g.name for g in o.vertex_groups}
def dom(v):
    best=max(v.groups,key=lambda g:g.weight,default=None); return gi[best.group] if best else ''
G=lambda p:[round(p.x,4),round(p.z,4),round(-p.y,4)]  # Blender -> glTF
torso=[];feetL=[];feetR=[];thighs=[]
for v in me.vertices:
    d=dom(v); co=v.co
    if d.startswith('arm') or d.startswith('Bone') or d.startswith('mount'): continue
    if d.startswith('pie'):
        if d in ('pieL3','pieL4','pieL5','pieL6','pieL7','pieL8','pieL8.002'): feetL.append(co)
        if d in ('pieL3.001','pieL4.001','pieL5.001','pieL6.001','pieL7.001','pieL8.001','pieL8.003'): feetR.append(co)
        if d in ('pieL1','pieL2','pieL1.001','pieL2.001'): thighs.append(co)
        continue
    if d in ('espalda1','espalda2','espalda1.001','root') or (d=='cabeza' and co.z<0.75): torso.append(co)
sec=[]
for i in range(0,20):
    y0=0.1+i*0.04
    pts=[p for p in torso if abs(p.z-y0)<0.02]
    if len(pts)<8: continue
    xs=[p.x for p in pts]; zs=[-p.y for p in pts]
    sec.append({"y":round(y0,3),"cx":round((max(xs)+min(xs))/2,3),"cz":round((max(zs)+min(zs))/2,3),"rx":round((max(xs)-min(xs))/2,3),"rz":round((max(zs)-min(zs))/2,3),"zmin":round(min(zs),3),"zmax":round(max(zs),3)})
def bb(pts):
    return {"min":G(Vector((min(p.x for p in pts),max(p.y for p in pts),min(p.z for p in pts)))),"max":G(Vector((max(p.x for p in pts),min(p.y for p in pts),max(p.z for p in pts))))}
B={b.name:{"head":G(b.head_local),"tail":G(b.tail_local)} for b in rig.data.bones if b.name in ('espalda1','espalda2','cabeza','pieL1','pieL2','pieL3','pieL1.001','pieL2.001','pieL3.001','armL1','armL2','armL3','armL1.001','armL2.001','armL2.008','Bone.005','armL2.003','armL2.005')}
json.dump({"torso_sections":sec,"feetL":bb(feetL),"feetR":bb(feetR),"thighs":bb(thighs),"bones":B},open('/tmp/claude-501/body.json','w'),indent=1)
print("OK",len(torso),len(feetL),len(thighs))
