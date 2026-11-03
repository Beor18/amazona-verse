# Hoja «Amazona Verse · Poses de acción»: recorta cada ave (alfa), la monta en su tarjeta y arma la hoja 4×3.
# uso: python3 -I hoja.py sel.json raw outdir
import sys, json, math, random
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops

sel = json.load(open(sys.argv[1])); RAW = sys.argv[2]; OUT = sys.argv[3]
F = '/usr/share/fonts/opentype/inter/'
def font(n, s): return ImageFont.truetype(F + n, s)
SS = 2  # supermuestreo de la tarjeta
TW, TH = 560, 520          # tarjeta final
ART_H = 420                # zona del ave

def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
def hexc(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def gradiente(w, h, top, bot, glow):
    g = Image.new('RGB', (1, h))
    for y in range(h): g.putpixel((0, y), lerp(top, bot, (y / (h - 1)) ** 1.1))
    g = g.resize((w, h))
    # halo suave detrás del ave
    m = Image.new('L', (w, h), 0); d = ImageDraw.Draw(m)
    d.ellipse((w * 0.12, h * 0.08, w * 0.88, h * 0.92), fill=150)
    m = m.filter(ImageFilter.GaussianBlur(w * 0.12))
    g.paste(Image.new('RGB', (w, h), glow), (0, 0), m)
    return g

def recorte(p):
    a = Image.open(p).convert('RGBA'); bb = a.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    W, H = a.size
    toca = bb[0] <= 1 or bb[1] <= 1 or bb[2] >= W - 1 or bb[3] >= H - 1
    return a.crop(bb), toca

def lineas(d, w, h, ang, n, col, rnd, zona):
    # líneas de velocidad: trazos finos paralelos a la dirección del movimiento, detrás del ave
    x0, y0, x1, y1 = zona
    dx, dy = math.cos(ang), math.sin(ang)
    for i in range(n):
        cx = rnd.uniform(x0, x1); cy = rnd.uniform(y0, y1); L = rnd.uniform(0.12, 0.3) * w
        a = rnd.uniform(0.35, 0.8)
        wd = max(2, int(rnd.uniform(2.5, 5) * SS))
        d.line((cx, cy, cx + dx * L, cy + dy * L), fill=col + (int(255 * a),), width=wd)

tiles = []
for k, s in enumerate(sel):
    W, H = TW * SS, TH * SS; AH = ART_H * SS
    card = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    bg = gradiente(W, AH + 40 * SS, hexc(s['top']), hexc(s['bot']), hexc(s['glow']))
    card.paste(bg, (0, 0))
    ave, toca = recorte(f"{RAW}/{s['id']}_{s['frame']}.png")
    if toca: print('AVISO: el ave toca el borde del render en', s['id'])
    # encaje: cabe en la zona con margen; escala acotada para que todas se lean del mismo tamaño
    mx, my = W * 0.86, AH * 0.84
    sc = min(mx / ave.width, my / ave.height) * s.get('zoom', 1)
    ave = ave.resize((int(ave.width * sc), int(ave.height * sc)), Image.LANCZOS)
    cx = W / 2 + s.get('dx', 0) * W; cy = AH / 2 + s.get('dy', 0) * AH + 10 * SS
    px, py = int(cx - ave.width / 2), int(cy - ave.height / 2)
    fx = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(fx)
    rnd = random.Random(k * 7 + 3)
    if s.get('lineas'):
        ang = math.radians(s['lineas']); col = (255, 255, 255)
        lineas(d, W, AH, ang, s.get('nl', 14), col, rnd, (W * 0.02, AH * 0.12, W * 0.98, AH * 0.88))
    if s.get('sombra'):
        sh = Image.new('L', (W, H), 0); ds = ImageDraw.Draw(sh)
        sw = ave.width * 0.55; sy = py + ave.height - 6 * SS if s['sombra'] == 'pies' else AH * 0.9
        ds.ellipse((cx - sw / 2, sy - 14 * SS, cx + sw / 2, sy + 14 * SS), fill=110)
        sh = sh.filter(ImageFilter.GaussianBlur(10 * SS))
        fx.paste(Image.new('RGBA', (W, H), (20, 40, 30, 255)), (0, 0), sh)
    fx = fx.filter(ImageFilter.GaussianBlur(0.6 * SS))
    card = Image.alpha_composite(card, fx)
    # sombra propia muy suave (despega la figura del fondo)
    a = ave.getchannel('A').filter(ImageFilter.GaussianBlur(12 * SS)).point(lambda v: int(v * 0.28))
    glow = Image.new('RGBA', ave.size, (10, 25, 40, 255)); glow.putalpha(a)
    card.alpha_composite(glow, (px + 6 * SS, py + 10 * SS))
    card.alpha_composite(ave, (px, py))
    # franja del rótulo
    d = ImageDraw.Draw(card)
    d.rectangle((0, AH, W, H), fill=(255, 251, 242, 255))
    d.line((0, AH, W, AH), fill=hexc(s['bot']) + (255,), width=3 * SS)
    f1 = font('Inter-Bold.otf', 34 * SS); f2 = font('Inter-Medium.otf', 19 * SS); f3 = font('Inter-Italic.otf', 16 * SS) if False else font('Inter-MediumItalic.otf', 15 * SS)
    d.text((26 * SS, AH + 14 * SS), s['es'], font=f1, fill=(38, 52, 44, 255))
    wes = d.textlength(s['es'], font=f1)
    d.text((26 * SS + wes + 12 * SS, AH + 28 * SS), s['en'], font=f2, fill=(120, 128, 120, 255))
    d.text((26 * SS, AH + 62 * SS), s['nota'], font=f3, fill=(110, 118, 110, 255))
    # chip de especie arriba a la derecha
    fc = font('Inter-SemiBold.otf', 15 * SS); txt = s['especie']; tw = d.textlength(txt, font=fc)
    d.rounded_rectangle((W - tw - 40 * SS, 14 * SS, W - 14 * SS, 46 * SS), radius=16 * SS, fill=(255, 255, 255, 200))
    d.text((W - tw - 27 * SS, 20 * SS), txt, font=fc, fill=(50, 62, 56, 255))
    # esquinas redondeadas
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, W - 1, H - 1), radius=26 * SS, fill=255)
    card.putalpha(ImageChops.multiply(card.getchannel('A'), m))
    card = card.resize((TW, TH), Image.LANCZOS)
    card.save(f"{OUT}/tiles/{k + 1:02d}_{s['id']}.png", optimize=True)
    tiles.append(card)

# hoja
SW, SHt = 2400, 1800; COLS = 4; GX = 24; top = 150
ox = (SW - (COLS * TW + (COLS - 1) * GX)) // 2
sheet = gradiente(SW, SHt, hexc('#0f3b4a'), hexc('#123f2c'), hexc('#1c5a5e')).convert('RGBA')
d = ImageDraw.Draw(sheet)
ft = font('InterDisplay-Bold.otf', 64); fs = font('Inter-Medium.otf', 24)
d.text((ox, 38), 'Amazona Verse · Poses de acción', font=ft, fill=(255, 255, 255, 255))
d.text((ox, 112), 'Modelo y animación reales del juego (vittata.glb + animación procedural), pieles de especie, look vibrant_toon  ·  Action poses',
       font=fs, fill=(196, 226, 214, 255))
for i, c in enumerate(tiles):
    r, q = divmod(i, COLS)
    x = ox + q * (TW + GX); y = top + 14 + r * (TH + 22)
    sh = Image.new('RGBA', (TW + 60, TH + 60), (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle((30, 36, TW + 30, TH + 30), radius=26, fill=(0, 0, 0, 110))
    sheet.alpha_composite(sh.filter(ImageFilter.GaussianBlur(12)), (x - 30, y - 30))
    sheet.alpha_composite(c, (x, y))
sheet.convert('RGB').save(f'{OUT}/poses_de_accion.png', optimize=True)
print('ok', sheet.size)
