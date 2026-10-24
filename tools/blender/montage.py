import sys, bpy, numpy as np
args=sys.argv[sys.argv.index("--")+1:]
out=args[0]; arrs=[]
for a in args[1:]:
    im=bpy.data.images.load(a); w,h=im.size
    px=np.array(im.pixels[:],dtype=np.float32).reshape(h,w,4); arrs.append(px)
H=max(a.shape[0] for a in arrs)
arrs=[np.pad(a,((H-a.shape[0],0),(0,0),(0,0))) for a in arrs]
m=np.concatenate(arrs,axis=1); h,w=m.shape[:2]
img=bpy.data.images.new("m",w,h,alpha=True); img.pixels.foreach_set(m.ravel())
img.filepath_raw=out; img.file_format='PNG'; img.save()
