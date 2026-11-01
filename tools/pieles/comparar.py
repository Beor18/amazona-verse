import os
import sys, shutil, os
from PIL import Image, ImageDraw, ImageFont
V = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out') + os.sep
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 18); f2 = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
REF = {
 'finschi': ('Amazona finschi (loro corona lila)', [('L2148345.jpg', (280, 0, 880, 683), 'Nigel Voaden', 1775304), ('L631238970.jpg', (150, 100, 800, 683), 'Lisa Biasillo', 346302765)]),
 'lilacina': ('Amazona lilacina (loro de Ecuador)', [('L231165742.jpg', (280, 100, 900, 768), 'Carlos Viteri', 135527196)]),
 'vinacea': ('Amazona vinacea (loro de pecho vinoso)', [('L299345147.jpg', (380, 40, 960, 770), 'vinicius_s_domingues', 172436602), ('L388753172.jpg', (250, 100, 700, 768), 'Reuber Brandão', 219623641)]),
 'autumnalis': ('Amazona autumnalis (loro frentirrojo)', [('L287564658.jpg', (250, 0, 750, 683), 'Ricard Busquets Reverte', 166082686), ('L669249420.jpg', (450, 150, 850, 550), 'Reid Hardin', 366511244)]),
}
for sp in sys.argv[1:]:
    tit, refs = REF[sp]; D = os.path.join('..', sp)
    for n in ('frente', 'lado', 'espalda', 'cara'): shutil.copy(V + f'A_{sp}_{n}.png', os.path.join(D, f'render_{n}.png'))
    W = Image.new('RGBA', (1010 + 450 * 2, 620), (236, 236, 232, 255)); d = ImageDraw.Draw(W)
    d.text((20, 12), f'{tit} · piel sobre el modelo Vittata, look vibrant_toon', fill=(20, 20, 20), font=F)
    for i, (n, t) in enumerate([('frente', 'Frente'), ('lado', 'Lado'), ('espalda', 'Espalda')]):
        im = Image.open(V + f'A_{sp}_{n}.png').convert('RGBA'); im = im.crop(im.getbbox()); im.thumbnail((380, 460))
        x = 20 + i * 330; W.alpha_composite(im, (x + (310 - im.width) // 2, 60 + (470 - im.height) // 2)); d.text((x + 120, 540), t, fill=(30, 30, 30), font=F)
    for i, (fn, c, autor, obs) in enumerate(refs):
        im = Image.open('ref/' + fn).convert('RGBA').crop(c); im.thumbnail((440, 470)); x = 1010 + i * 450
        W.alpha_composite(im, (x, 60)); d.multiline_text((x, 545), f'Foto: {autor}, iNaturalist obs. {obs} (CC BY)\ninaturalist.org/observations/{obs}', fill=(30, 30, 30), font=f2)
    if len(refs) == 1:
        d.multiline_text((1460, 250), 'Solo hay 1 foto CC BY de\nA. lilacina en iNaturalist\n(el resto es CC BY-NC).', fill=(80, 80, 80), font=f2)
    W.convert('RGB').save(os.path.join(D, f'comparativa_{sp}.png')); print(sp)
