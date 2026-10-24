import bpy, numpy as np
p="/Users/kelvingarciapr/AmazonaVerse/Juego/assets/models/vittata_masks.png"
im=bpy.data.images.load(p); W=im.size[0]
a=np.array(im.pixels[:],np.float32).reshape(W,W,4)
B=a[...,2]>0.5
def sh(m,f,n):
    out=m.copy()
    for dy in range(-n,n+1):
        for dx in range(-n,n+1):
            out=f(out,np.roll(np.roll(m,dy,0),dx,1))
    return out
C=sh(sh(B,np.logical_or,3),np.logical_and,3)
a[...,2]=C.astype(np.float32)
im.pixels.foreach_set(a.ravel()); im.filepath_raw=p; im.file_format='PNG'; im.save()
print("B%",C.mean()*100)
