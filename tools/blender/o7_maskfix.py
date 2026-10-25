# Pipeline de Vittata · paso 4/9: cierra huecos de la máscara del pico (canal B) en OUT/vittata_masks.png
# Comando: Blender -b --python tools/blender/o7_maskfix.py
# Regenerar todo desde cero (vittata.glb, vittata_masks.png, vittata_mounts.json, vittata_glb.js):
#   tools/blender/vittata_build.sh    · rutas en tools/blender/vittata_paths.py (SRC original, BUILD intermedios, OUT)
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); from vittata_paths import src, build, out, tool
import bpy, numpy as np
p=out("vittata_masks.png")
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
