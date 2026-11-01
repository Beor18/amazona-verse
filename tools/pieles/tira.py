import sys
from PIL import Image
pre=sys.argv[1]; ns=['frente','lado','espalda','tq','cara']
ims=[Image.open(f'out/{pre}_{n}.png') for n in ns]
W=Image.new('RGBA',(768*5,768),(136,136,136,255))
for i,im in enumerate(ims): W.alpha_composite(im,(768*i,0))
W.convert('RGB').resize((1920,384)).save(f'out/{pre}_all.png')
