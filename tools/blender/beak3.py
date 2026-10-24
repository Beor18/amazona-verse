import bpy, json, numpy as np, math
from mathutils import Vector
d=json.load(open('/tmp/claude-501/beakverts.json'))
W=np.array([(x,y,z) for (_,x,y,z,r,g,b,w) in d if w])
# línea de la boca: z = a + b*x^2 + c*y (ajuste por mínimos cuadrados)
A=np.c_[np.ones(len(W)), W[:,0]**2, W[:,1]]; coef,*_=np.linalg.lstsq(A,W[:,2],rcond=None)
print("COEF",coef)
def zline(x,y): return coef[0]+coef[1]*x*x+coef[2]*y
o=bpy.data.objects['Vittata']; me=o.data
vs=[]
for (vi,x,y,z,r,g,b,w) in d:
    dz=zline(x,y)-z
    below=min(1,max(0,(dz-0.002)/0.02))          # 0 en la línea, 1 a 2 cm por debajo
    side=min(1,max(0,(0.2-abs(x))/0.08))         # se desvanece hacia las comisuras
    front=min(1,max(0,(-y-0.08)/0.06))           # solo la parte delantera
    wt=below*side*front
    if wt>0.01: vs.append((vi,wt))
print("JAWVERTS",len(vs),"full",sum(1 for _,w in vs if w>0.95))
json.dump({"coef":list(coef),"verts":vs},open('/tmp/claude-501/jaw.json','w'))
