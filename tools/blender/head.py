# Pipeline de Vittata · auxiliar (no entra en la build): medidas de la cabeza para gorras y lentes (BUILD/o_final_pico.blend).
# Regenerar todo desde cero (vittata.glb, máscaras, montajes, vittata_glb.js): tools/blender/vittata_build.sh
import bpy, json
o=bpy.data.objects['Vittata']; me=o.data
gi={g.index:g.name for g in o.vertex_groups}
beak=set()
for p in me.polygons:
    if p.material_index==0: beak.update(p.vertices)
pts=[]
for v in me.vertices:
    if v.index in beak: continue
    b=max(v.groups,key=lambda g:g.weight,default=None)
    if b and gi[b.group] in ('cabeza.001','pico','cabeza'): pts.append((v.co.x,v.co.z,-v.co.y))
out=[]
for i in range(16):
    y0=0.86+i*0.035
    s=[p for p in pts if abs(p[1]-y0)<0.015]
    if len(s)<6: continue
    xs=[p[0] for p in s]; zs=[p[2] for p in s]
    out.append([round(y0,3),round(min(xs),3),round(max(xs),3),round(min(zs),3),round(max(zs),3)])
print("HEAD", json.dumps(out))
bp=[(me.vertices[i].co.x,me.vertices[i].co.z,-me.vertices[i].co.y) for i in beak]
print("BEAKTOP", round(max(p[1] for p in bp),3), "zmax", round(max(p[2] for p in bp),3))
