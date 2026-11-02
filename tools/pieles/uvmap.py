import json,sys,numpy as np
from PIL import Image,ImageDraw
d=json.load(open('out/uv.json'))
tex=sys.argv[1]; outp=sys.argv[2]
im=Image.open(tex).convert('RGB').resize((2048,2048)); dr=ImageDraw.Draw(im)
for m in d:
    if not m['hasMap']: continue
    uv=np.array(m['uv']).reshape(-1,3,2); p=np.array(m['pos']).reshape(-1,3,3)
    print(m['name'],p.reshape(-1,3).min(0),p.reshape(-1,3).max(0), uv.reshape(-1,2).min(0),uv.reshape(-1,2).max(0))
    col=(255,0,255) if m['mat']=='cuerpo' else (0,255,255)
    for t in uv:
        pts=[(u*2048,v*2048) for u,v in t]; dr.line(pts+[pts[0]],fill=col,width=1)
im.save(outp)
