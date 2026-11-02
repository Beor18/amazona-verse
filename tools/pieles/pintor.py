"""Pieles del lote A (finschi, lilacina, vinacea, autumnalis) sobre el UV de la Vittata.
Mismo método que ventralis: regiones por posición 3D de cada texel (posmap.npz, de ../../../ventralis/out), base verde de la
piel xantholora de Kelvin (verde, sombreado, pico y patas cocidos en el mismo UV), globo del ojo de ochrocephala_panamensis.
Cada rasgo pintado lleva su fuente en <id>/fuentes.md.
Uso: python3 -I pintor.py <id> [salida.jpg]"""
import sys, os, numpy as np
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
PIELES = os.path.join(AQUI, '..', '..', 'assets', 'textures', 'pieles') + os.sep
N = 1024
z = np.load(os.path.join(AQUI, 'datos', 'posmap.npz'))
P = z['P']; MID = z['MID']
ok = np.isfinite(P[..., 0]); body = (MID == 3) & ok; beak = (MID == 2) & ok
Pz = np.nan_to_num(P); x = np.abs(Pz[..., 0]); y = Pz[..., 1]; zz = Pz[..., 2]
Q = np.stack([x, y, zz], -1)
E = np.array([0.159, 1.204, 0.133], np.float32)
dE = np.linalg.norm(Q - E, axis=-1)
cab = body & (y > 0.80)

def lin(c): return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def srgb(c): c = np.clip(c, 0, 1); return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)
def hexc(h): h = h.lstrip('#'); return lin(np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)], np.float32))
def ss(e0, e1, v): t = np.clip((v - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)
def gauss(c, s): return np.exp(-sum(((Q[..., i] - c[i]) / s[i]) ** 2 for i in range(3)))
def ruido(f, sem=0):
    r = np.zeros_like(x); rng = np.random.RandomState(sem)
    for k in range(5):
        d = rng.normal(size=3); d /= np.linalg.norm(d); fr = f * (1.7 ** k); ph = rng.uniform(0, 6.3)
        r += np.sin((Pz[..., 0] * d[0] + y * d[1] + zz * d[2]) * fr + ph) / (1.5 ** k)
    return r / 2.2
def hsv(path):
    h = np.asarray(Image.open(path).convert('HSV')).astype(np.float32)
    return h[..., 0] * 360 / 255, h[..., 1] / 255, h[..., 2] / 255
def _box1(a, r, ax):
    c = np.cumsum(np.pad(a, [(r + 1, r) if i == ax else (0, 0) for i in range(a.ndim)], mode='edge'), axis=ax)
    n = a.shape[ax]
    return (np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=ax) - np.take(c, np.arange(0, n), axis=ax)) / (2 * r + 1)
def blur(a, r):
    r = max(1, int(r))
    for _ in range(3): a = _box1(_box1(a, r, 0), r, 1)
    return a
def pushpull(img, m, iters=9):
    res = np.zeros_like(img); wsum = np.zeros(m.shape, np.float32)
    acc = img * m[..., None]; w = m.astype(np.float32)
    for i in range(iters):
        r = 2 ** i
        A = np.stack([blur(acc[..., c], r) for c in range(3)], -1); W = blur(w, r)
        nuevo = (W > 1e-3) & (wsum < 1e-3); res[nuevo] = A[nuevo] / W[nuevo][:, None]; wsum[nuevo] = 1
    res[m] = img[m]; return res

LUM = np.array([0.2126, 0.7152, 0.0722], np.float32)
# brazo: centro vertical del ala en reposo (T), para separar el borde de fuga (abajo) del de ataque (arriba)
centro_brazo = np.interp(x, [0.24, 0.30, 0.40, 0.48, 0.56, 0.64, 0.80], [0.66, 0.659, 0.66, 0.672, 0.688, 0.693, 0.685])
brazo = body & (x > 0.24) & (y > 0.5) & (y < 0.80)

class Lienzo:
    def __init__(self, base='xantholora'):
        self.base_path = PIELES + base + '.jpg'
        self.base = np.asarray(Image.open(self.base_path).convert('RGB')).astype(np.float32) / 255
        self.L = lin(self.base); self.out = self.L.copy()
        self.H, self.S, self.V = hsv(self.base_path)
        self.verde = body & (self.H > 75) & (self.H < 150) & (self.S > 0.5)
        yy, xx = np.mgrid[0:N, 0:N]; self.yy, self.xx = yy, xx
        self.ojos_uv = np.zeros((N, N), bool)
        for cx, cy, rr in ((202, 685, 78), (414, 685, 78), (910, 575, 42), (922, 683, 42)):
            self.ojos_uv |= np.hypot(xx - cx, yy - cy) < rr
        G = pushpull(self.L, self.verde)
        self.repintar = body & ~self.ojos_uv & ~((y < 0.20) & ~self.verde)
        self.out[self.repintar] = G[self.repintar]
    def pintar(self, peso, color):
        p = np.clip(peso, 0, 1)[..., None]; self.out = self.out * (1 - p) + color * p
    def tintar(self, peso, color, keep=0.55):
        lum = (self.out * LUM).sum(-1, keepdims=True); cl = max((color * LUM).sum(), 1e-4)
        c = color * (lum / cl) * keep + color * (1 - keep)
        p = np.clip(peso, 0, 1)[..., None]; self.out = self.out * (1 - p) + c * p
    def oscurecer(self, peso):
        self.out *= (1 - np.clip(peso, 0, 1))[..., None]
    def tono(self, verde_vientre='#5fae1e', k_vientre=0.30, k_espalda=0.12):
        t_under = ss(0.02, 0.16, zz) * ss(0.85, 0.7, y) * (x < 0.24) * body
        self.out = self.out * (1 - k_vientre * t_under[..., None]) + hexc(verde_vientre) * k_vientre * t_under[..., None]
        self.oscurecer(k_espalda * ss(-0.05, -0.25, zz) * ss(0.2, 0.35, y) * body)
    def festoneado(self, zona, fuerza):
        ang = np.arctan2(Pz[..., 0], zz + 0.05); fil = y / 0.034; col = ang / 0.16 + 0.5 * np.floor(fil)
        fy = fil - np.floor(fil); fx = col - np.floor(col)
        esc = np.clip(((fx - 0.5) ** 2 * 1.6 + (fy - 0.15) ** 2), 0, 1)
        self.borde = ss(0.20, 0.30, esc) * ss(0.42, 0.30, esc)
        self.oscurecer(self.borde * zona * fuerza)
    def festoneado_color(self, zona, color, fuerza):  # borde de pluma de color (vinacea: azul pálido en la nuca)
        self.pintar(self.borde * zona * fuerza, color)
    def pico(self, color_base, color_punta=None, color_inferior=None, punta=(0.34, 0.43)):
        H, S, V = self.H, self.S, self.V
        boca = (V < 0.42) | (H < 12) | (H > 330)
        lumb = (self.L * LUM).sum(-1); ref = np.median(lumb[beak & ~boca])
        sh = np.clip(lumb / ref, 0.55, 1.15)[..., None]
        c = np.broadcast_to(hexc(color_base), self.out.shape).copy()
        if color_inferior is not None:
            inf = ss(0.985, 0.955, y)[..., None]          # mandíbula inferior (lo más bajo del pico)
            c = c * (1 - inf) + hexc(color_inferior) * inf
        if color_punta is not None:
            tp = ss(punta[0], punta[1], zz)[..., None]
            c = c * (1 - tp) + hexc(color_punta) * tp
        pc = c * sh; w = (beak & ~boca)[..., None]
        self.out = np.where(w, pc, self.out)
        com = beak & boca & (H > 12) & (H < 55) & (S > 0.45)
        self.out = np.where(com[..., None], c * 0.42 * np.clip(lumb / max(ref, 1e-4) * 1.6, 0.4, 1.1)[..., None], self.out)
    def patas(self, color, garra='#3f3a38'):
        H, S, V = self.H, self.S, self.V
        pata = body & (y < 0.20) & ~self.verde; g = pata & (V < 0.35)
        lumf = (self.L * LUM).sum(-1); reff = np.median(lumf[pata & ~g])
        self.out = np.where((pata & ~g)[..., None], hexc(color) * np.clip(lumf / reff, 0.6, 1.15)[..., None], self.out)
        self.out = np.where(g[..., None], hexc(garra) * np.clip(lumf / max(np.median(lumf[g]), 1e-4), 0.6, 1.3)[..., None], self.out)
    def ojo(self, iris, anillo):
        """Globo del ojo de ochrocephala_panamensis (anillo blanco, iris castaño): iris al color pedido, anillo al color pedido."""
        OJO = PIELES + 'ochrocephala_panamensis.jpg'
        oj = lin(np.asarray(Image.open(OJO).convert('RGB')).astype(np.float32) / 255)
        oH, oS, oV = hsv(OJO)
        self.out = np.where(self.ojos_uv[..., None], oj, self.out)
        ir = self.ojos_uv & (oH > 10) & (oH < 45) & (oS > 0.45) & (oV > 0.2) & (oV < 0.8)
        li = (oj * LUM).sum(-1); m = np.median(li[ir])
        self.out = np.where(ir[..., None], hexc(iris) * np.clip(li / m, 0.5, 1.35)[..., None], self.out)
        bl = self.ojos_uv & (oS < 0.12) & (oV > 0.80)
        self.out = np.where(bl[..., None], hexc(anillo) * np.clip(li / np.median(li[bl]), 0.7, 1.1)[..., None], self.out)
    def guardar(self, path):
        res = srgb(self.out); img = res.copy(); cub = ok.copy()
        for _ in range(10):
            acc = np.zeros_like(img); cnt = np.zeros(cub.shape)
            for a in (0, 1):
                for s in (1, -1):
                    acc += np.roll(img, s, a) * np.roll(cub, s, a)[..., None]; cnt += np.roll(cub, s, a)
            nuevo = (~cub) & (cnt > 0); img[nuevo] = acc[nuevo] / cnt[nuevo][:, None]; cub |= nuevo
        img[~cub] = self.base[~cub]
        im = Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8))
        for q in (85, 80, 75, 70):
            im.save(path, quality=q, optimize=True)
            if os.path.getsize(path) <= 82000: break
        print(path, os.path.getsize(path), 'q', q)

# ---------- regiones comunes de la cabeza (pose de reposo) ----------
n1, n2, n3, n4 = ruido(30, 1), ruido(40, 2), ruido(45, 3), ruido(28, 5)
R = {}
R['frente'] = ss(0.115, 0.08, x + 0.008 * n3) * ss(1.17, 1.20, y) * ss(1.315, 1.29, y + 0.01 * n3) * ss(0.08, 0.14, zz)
R['frente_ancha'] = ss(0.14, 0.10, x + 0.008 * n3) * ss(1.17, 1.20, y) * ss(1.345, 1.32, y + 0.01 * n3) * ss(0.02, 0.10, zz)  # frente + parte delantera de la corona
R['lores'] = gauss((0.10, 1.185, 0.17), (0.055, 0.045, 1e9)) * ss(0.08, 0.15, zz)
R['supercilio'] = ss(0.075, 0.095, dE) * ss(0.13, 0.11, dE) * ss(1.235, 1.26, y) * ss(0.0, 0.06, zz)   # línea roja sobre el ojo
R['corona'] = ss(1.27, 1.33, y + 0.012 * n1) * ss(-0.26, -0.10, zz) * ss(0.20, 0.10, zz)
R['nuca'] = ss(0.95, 1.12, y) * ss(0.0, -0.18, zz) * cab                       # nuca y cuello por detrás
R['lados_cuello'] = ss(0.85, 0.95, y) * ss(1.20, 1.10, y) * ss(0.14, 0.22, x) * ss(0.10, 0.0, zz) * cab
R['mejilla'] = gauss((0.215, 1.095, 0.07), (0.06, 0.06, 0.08))                 # mejilla bajo el ojo
R['auricular'] = gauss((0.235, 1.145, 0.0), (0.055, 0.07, 0.075))
R['anillo'] = ss(0.098, 0.082, dE + 0.004 * n3)
R['pecho'] = body & (x < 0.24) & (zz > 0.0) & (y > 0.50) & (y < 0.86)
R['espejo'] = brazo * ss(0.27, 0.31, x) * ss(0.48, 0.44, x) * ss(-0.005, -0.02, y - centro_brazo)   # bases de las secundarias 1-5
R['carpo'] = brazo * gauss((0.52, 0.0, 0.0), (0.035, 1e9, 1e9)) * ss(0.0, 0.02, y - centro_brazo)  # borde del ala en la «muñeca»
R['primarias'] = body * (y > 0.45) * ss(0.50, 0.60, x + 0.02 * ruido(25, 6))
R['punta_primarias'] = body * (y > 0.45) * ss(0.64, 0.74, x)
R['borde_secundarias'] = brazo * ss(0.30, 0.34, x) * ss(0.56, 0.52, x) * ss(-0.025, -0.04, y - centro_brazo)
R['cola'] = body & (zz < -0.26) & (y > 0.28) & (y < 0.56)
R['cola_punta'] = ss(-0.33, -0.385, zz) * R['cola']
R['cola_base_lat'] = ss(-0.27, -0.31, zz) * ss(-0.36, -0.33, zz) * ss(0.03, 0.09, x) * R['cola']
R['festoneado_todo'] = body & (x < 0.30) & (y > 0.45) & (y < 1.36) & (zz > -0.32)

# ---------- especies ----------
def finschi(c):
    c.tono(); c.festoneado(R['festoneado_todo'] * ~(R['mejilla'] + R['auricular'] > 0.3), 0.26)    # «feathers edged black»; mejillas sin borde
    c.tintar(cab * np.clip(R['mejilla'] * 1.1 + R['auricular'] * 1.1, 0, 0.7), hexc('#a6c832'))     # mejillas y auriculares verde amarillento
    c.tintar(cab * np.clip(R['corona'] * 0.9 + R['nuca'] * 0.6 + R['lados_cuello'] * 0.55, 0, 0.85), hexc('#8a86d0'))  # lila azulado
    c.pintar(cab * np.clip(np.maximum(R['frente_ancha'], R['lores']) * 0.95, 0, 1), hexc('#6e1b26'))  # granate
    c.pintar(cab * R['anillo'], hexc('#c9c7c2'))                                              # anillo gris pálido
    c.pintar(R['espejo'] * 0.95, hexc('#d22b22'))
    c.pintar(R['primarias'] * 0.95, hexc('#23408f')); c.pintar(R['punta_primarias'] * 0.35, hexc('#16265a'))
    c.pintar(R['borde_secundarias'] * 0.7, hexc('#23408f'))                                   # secundarias con punta azul oscuro
    c.pintar(R['cola_punta'] * 0.55, hexc('#b8cf3a'))
    c.pico('#ad9e8f'); c.patas('#8c8079'); c.ojo('#d8891f', '#c9c7c2')

def lilacina(c):
    c.tono(); c.festoneado(R['festoneado_todo'] * ((y > 0.62) | (zz > 0.0)), 0.26)          # borde negro de la corona al manto y el pecho
    c.tintar(cab * np.clip(R['mejilla'] * 1.1 + R['auricular'] * 0.9, 0, 0.75), hexc('#c4cf3a'))  # mejillas amarillo verdoso
    c.tintar(cab * np.clip(R['corona'] * 0.55 + R['nuca'] * 0.35, 0, 0.6), hexc('#9a80c0'))   # puntas malva/azul
    c.pintar(cab * np.clip(np.maximum(np.maximum(R['frente'], R['lores']), R['supercilio'] * 0.95) * 0.95, 0, 1), hexc('#d3261f'))
    c.pintar(cab * R['anillo'], hexc('#eadf9e'))                                              # anillo amarillo pálido
    c.pintar(R['espejo'] * 0.95, hexc('#d22b22'))
    c.pintar(R['punta_primarias'] * 0.85, hexc('#2a4aa0'))                                    # primarias verdes con punta azul (Clubb, especie)
    c.pintar(R['cola_base_lat'] * 0.7, hexc('#c0372c')); c.pintar(R['cola_punta'] * 0.45, hexc('#b8cf3a'))
    c.pico('#3a3a3d', color_punta='#2a2a2c'); c.patas('#8f8580'); c.ojo('#d9821c', '#eadf9e')

def autumnalis(c):
    c.tono(); c.festoneado(R['festoneado_todo'] * ((y > 0.62) | (zz > 0.0)), 0.24)
    amar = gauss((0.215, 1.12, 0.05), (0.075, 0.085, 0.11))
    c.pintar(cab * np.clip(amar * 1.5, 0, 0.95) * ss(1.0, 1.05, y) * ss(0.075, 0.09, dE), hexc('#f2d21a'))  # amarillo
    c.tintar(cab * np.clip(R['corona'] * 0.7 + R['nuca'] * 0.35, 0, 0.75), hexc('#8a84cc'))   # corona hacia malva/azul en las puntas
    c.pintar(cab * np.clip(np.maximum(R['frente'], R['lores']) * 0.95, 0, 1), hexc('#d3261f'))
    c.pintar(cab * R['anillo'], hexc('#efede6'))
    c.pintar(R['espejo'] * 0.95, hexc('#d22b22'))
    c.pintar(R['punta_primarias'] * 0.85, hexc('#2a4aa0'))
    c.pintar(R['cola_punta'] * 0.5, hexc('#b8cf3a'))
    c.pico('#d6c08a', color_punta='#4a4a4c', color_inferior='#3a3a3c', punta=(0.30, 0.40))      # cuerno/amarillo en la base, gris oscuro
    c.patas('#8f8580'); c.ojo('#e0841a', '#efede6')

def vinacea(c):
    c.tono(); c.festoneado(R['festoneado_todo'], 0.30)                                        # «feathers edged with dusky black»
    nuca = cab * np.clip(R['nuca'] * 1.0 + R['lados_cuello'] * 0.9, 0, 1)
    c.festoneado_color(nuca, hexc('#8fc3d6'), 0.85)                                           # plumas de la nuca con borde azul pálido
    c.oscurecer(nuca * c.borde * 0)                                                           # (la punta negra ya la pone festoneado)
    pecho = R['pecho'] * ss(0.86, 0.80, y) * ss(0.46, 0.62, y + 0.03 * n4) * ss(0.0, 0.06, zz)
    c.tintar(pecho * 0.92, hexc('#6a2842'), keep=0.25)                                        # pecho vinoso (lila/rojo)
    c.tintar(pecho * ss(0.70, 0.84, y) * 0.15, hexc('#7a78b8'), keep=0.6)                    # lavado azul en la parte alta
    c.oscurecer(pecho * c.borde * 0.25)
    c.pintar(cab * np.clip(np.maximum(R['frente'], R['lores']) * 0.95, 0, 1), hexc('#cf2a22'))
    c.pintar(cab * R['anillo'], hexc('#b9b7b3'))                                              # anillo gris
    c.pintar(R['espejo'] * ss(0.40, 0.37, x) * 0.95, hexc('#cc2a22'))                        # secundarias 1-3
    c.pintar(R['carpo'] * 0.9, hexc('#cc2a22'))
    c.pintar(R['punta_primarias'] * 0.9, hexc('#1f2f6a'))                                     # primarias con punta azul a negra
    c.pintar(R['cola_base_lat'] * 0.8, hexc('#8e1e22'))                                       # rojo oscuro en la base de la cola
    c.pico('#d87a80', color_punta='#d8c3a4', punta=(0.33, 0.42))                              # rosa/rojo con punta cuerno
    c.patas('#8e8d8c'); c.ojo('#c8401e', '#b9b7b3')

def arausiaca(c):
    # Render de Kelvin (docs/referencias/renders_especies/Arausiaca.jpg): cabeza azul y triángulo rojo en la garganta.
    c.tono(); c.festoneado(R['nuca'] * cab, 0.30)                                              # márgenes oscuros en la corona trasera y la nuca
    azul = cab * ss(0.86, 0.95, y + 0.01 * n1) * 0.93                                       # toda la cabeza azul (render de Kelvin)
    c.tintar(azul, hexc('#3f63b4'), keep=0.25)                                                 # lores, frente, corona, zona orbital y mejillas azules
    c.tintar(cab * R['nuca'] * 0.25, hexc('#35508f'), keep=0.6)                               # azul más oscuro hacia la nuca
    frente_cuello = body & (x < 0.15) & (zz > 0.04)
    barbilla = frente_cuello * ss(0.80, 0.83, y) * ss(0.88, 0.86, y)
    c.tintar(barbilla * 0.85, hexc('#3f63b4'), keep=0.4)                                       # barbilla y garganta alta azules
    roja = frente_cuello * ss(0.66, 0.72, y + 0.015 * n4) * ss(0.83, 0.80, y) * ss(0.15, 0.08, x + 0.25 * (0.83 - y))
    c.pintar(roja * 0.92, hexc('#c9302a'))                                                     # parche rojo anaranjado en la garganta baja
    c.pintar(cab * R['anillo'], hexc('#d6d5d1'))                                              # anillo gris muy pálido
    c.pintar(R['espejo'] * ss(0.40, 0.37, x) * 0.95, hexc('#d22b22'))                        # espejo rojo (3 secundarias)
    c.pintar(R['cola_base_lat'] * 0.75, hexc('#c0372c'))                                      # rojo en la base de la cola
    c.pico('#c9b49a', color_punta='#6a6866', punta=(0.32, 0.42))                              # cuerno con punta gris
    c.patas('#8e8c8a'); c.ojo('#e07a1c', '#d6d5d1')

def collaria(c):
    # Render de Kelvin (docs/referencias/renders_especies/Collaria.jpg): corona azul, frente blanca y garganta rosada.
    c.tono(); c.festoneado(R['festoneado_todo'] * ((y > 0.95) & (zz < 0.1)), 0.30)           # plumas de la corona al manto con borde negro
    c.tintar(cab * np.clip(R['corona'] * 1.0 + R['frente_ancha'] * 0.6, 0, 0.9), hexc('#4c74b0'), keep=0.4)  # corona delantera azul apagado
    c.tintar(cab * np.clip(R['mejilla'] * 1.1, 0, 0.75), hexc('#a9c9de'), keep=0.45)         # mejillas altas azul pálido
    c.tintar(cab * np.clip(R['auricular'] * 1.0, 0, 0.7), hexc('#6f9790'), keep=0.5)         # auriculares gris azulado con tinte verde
    c.pintar(cab * np.clip(R['frente'] * 1.0, 0, 0.95), hexc('#f2f1ec'))                      # barra frontal blanca
    c.pintar(cab * np.clip(R['lores'] * 0.9, 0, 0.9), hexc('#dde8ee'))                        # lores blancos (FWS) / azul pálido (parrots.org)
    rosa = (body & (zz > 0.02)) * ss(0.19, 0.13, x) * ss(0.62, 0.70, y + 0.02 * n4) * ss(0.88, 0.84, y)
    c.tintar(rosa * 0.92, hexc('#c24a63'), keep=0.3)                                           # garganta, lados del cuello y pecho alto rosados
    c.pintar(cab * R['anillo'], hexc('#f1f0eb'))                                              # anillo blanco
    c.pintar(R['primarias'] * 0.7, hexc('#2f56a8'))                                          # primarias azuladas
    c.pintar(R['cola_base_lat'] * 0.7, hexc('#c8505e'))                                       # rojo rosado en la base de la cola
    c.pico('#e9c84a', color_punta='#d8b23a')                                                   # pico amarillo
    c.patas('#c9a39c'); c.ojo('#6b3a1e', '#f1f0eb')

# muslos y borde de ataque del ala (bend of wing, borde carpal, álula y coberteras primarias)
R['muslo'] = body * ss(0.20, 0.23, y) * gauss((0.16, 0.25, 0.0), (0.07, 0.06, 0.12))
R['borde_ataque'] = brazo * ss(0.44, 0.49, x) * ss(0.64, 0.58, x) * ss(-0.005, 0.015, y - centro_brazo)

def pretrei(c):
    # Sin render de Kelvin: solo fuentes (docs/equipo/pieles_fuentes/pretrei.md). Macho adulto.
    c.tono(); c.festoneado(R['festoneado_todo'], 0.28)                                        # «feathers edged with black»
    cara = np.maximum.reduce([R['frente_ancha'], R['corona'] * 0.9, R['lores'], ss(0.14, 0.10, dE + 0.006 * n3)])
    c.pintar(cab * np.clip(cara * 0.95, 0, 0.95), hexc('#d3261f'))                            # frente, corona hasta los lores y alrededor de los ojos
    c.pintar(cab * R['anillo'], hexc('#f1f0eb'))                                              # anillo blanco
    c.pintar(R['borde_ataque'] * 0.92, hexc('#d22b22'))                                       # curva del ala, borde carpal, álula y coberteras primarias
    c.pintar(R['muslo'] * 0.9, hexc('#d22b22'))                                               # muslos rojos
    c.pintar(R['cola_punta'] * 0.75, hexc('#c4d43c'))                                         # cola con punta ancha verde amarillenta
    c.pico('#e2cf8a'); c.patas('#8f8580'); c.ojo('#e8901c', '#f1f0eb')                        # pico amarillo/cuerno, iris naranja/amarillo; patas gris neutro (sin fuente)

def tucumana(c):
    # Sin render de Kelvin: solo fuentes (docs/equipo/pieles_fuentes/tucumana.md).
    c.tono(); c.festoneado(R['festoneado_todo'] * ((zz < 0.05) | (y > 0.95)), 0.30)          # plumas del dorso con margen negro (escamado)
    c.festoneado(R['festoneado_todo'] * (zz >= 0.05) * (y <= 0.95), 0.16)
    c.pintar(cab * np.clip(R['frente_ancha'] * 0.95, 0, 0.95), hexc('#d3261f'))              # frente y corona delantera rojas (no rodea el ojo)
    c.pintar(cab * R['anillo'], hexc('#f1f0eb'))                                              # anillo blanco
    c.pintar(R['borde_ataque'] * ss(0.50, 0.54, x) * 0.92, hexc('#d22b22'))                  # coberteras primarias rojas (sin rojo en la curva del ala)
    c.pintar(R['muslo'] * 0.9, hexc('#e8761c'))                                               # muslos naranjas
    c.pintar(R['cola_base_lat'] * 0.75, hexc('#c0372c'))                                      # rojo en la base de la cola
    c.pico('#d9b9a2'); c.patas('#a4928e'); c.ojo('#e6801c', '#f1f0eb')                        # cuerno rosado; patas gris rosado; iris naranja

def agilis(c):
    # Render de Kelvin (Agilis.jpg): verde entera y pico gris. Macho adulto.
    c.tono(verde_vientre='#7fbf2a', k_vientre=0.38)                                           # partes inferiores más pálidas y amarillentas
    c.tintar(cab * np.clip(R['auricular'] * 1.2, 0, 0.85), hexc('#1f2a22'), keep=0.3)         # auriculares negruzcos
    c.pintar(R['borde_ataque'] * ss(0.50, 0.54, x) * 0.92, hexc('#d22b22'))                   # coberteras primarias rojas
    c.pintar(R['primarias'] * 0.85, hexc('#3c3f9a')); c.pintar(R['punta_primarias'] * 0.5, hexc('#1a1c3a'))  # primarias azul violáceo y negro
    c.pintar(R['cola_base_lat'] * 0.7, hexc('#c0372c'))                                       # plumas laterales de la cola con rojo
    c.pintar(cab * R['anillo'], hexc('#5e5f62'))                                              # anillo gris oscuro
    c.pico('#4d4e52', color_punta='#3a3b3e', color_inferior='#6a6b6e')                        # gris oscuro, más pálido en la base
    c.patas('#8e958a'); c.ojo('#4a2c18', '#5e5f62')                                           # patas gris verdoso; iris castaño oscuro

def albifrons(c):
    # Render de Kelvin (Albifrons.jpg): frente blanca, corona azul, antifaz rojo alrededor de los ojos y primarias azules. Macho.
    c.tono()
    c.tintar(cab * np.clip(R['corona'] * 1.0, 0, 0.9), hexc('#3f63b4'), keep=0.35)            # corona azul tras la frente
    c.pintar(cab * np.clip(R['frente_ancha'] * 0.95, 0, 0.95), hexc('#f2f1ec'))               # frente blanca
    roja = np.maximum(R['lores'], ss(0.165, 0.125, dE + 0.006 * n3) * ss(-0.02, 0.05, zz) * ss(1.15, 1.18, y))
    c.pintar(cab * np.clip(roja * 0.95, 0, 0.95), hexc('#d3261f'))                            # lores y zona del ojo rojos
    c.pintar(cab * R['anillo'], hexc('#d6d5d1'))                                              # anillo gris pálido
    c.pintar(R['borde_ataque'] * 0.9, hexc('#d22b22'))                                        # borde carpal y coberteras primarias rojas
    c.pintar(R['espejo'] * 0.8, hexc('#24408a'))                                              # espejo azul oscuro
    c.pintar(R['primarias'] * 0.8, hexc('#2f56a8'))                                           # primarias azules (render de Kelvin)
    c.pico('#e9c84a', color_punta='#d8b23a'); c.patas('#8f8580'); c.ojo('#e6c21c', '#d6d5d1')  # pico e iris amarillos

def festiva(c):
    # Render de Kelvin (Festiva.jpg): franja roja en la frente y los lores, azul alrededor de los ojos y primarias azules.
    c.tono()
    azul = ss(0.15, 0.10, dE + 0.006 * n3) * ss(1.17, 1.215, y) * ss(-0.12, 0.04, zz)       # azul sobre y detrás del ojo
    c.tintar(cab * np.clip(azul * 1.0, 0, 0.9), hexc('#3f63b4'), keep=0.3)
    c.pintar(cab * np.clip(np.maximum(R['frente'], R['lores']) * 0.95, 0, 0.95), hexc('#8e1e22'))  # frente estrecha y lores rojo oscuro
    rabadilla = body * (x < 0.2) * ss(-0.05, -0.15, zz) * ss(0.40, 0.46, y) * ss(0.66, 0.58, y + 0.02 * n4)
    c.tintar(rabadilla * 0.9, hexc('#c0262a'), keep=0.35)                                      # espalda baja y rabadilla rojas
    c.pintar(R['primarias'] * 0.85, hexc('#3c3f9a'))                                          # primarias violeta azulado
    c.pintar(cab * R['anillo'], hexc('#c9c7c2'))
    c.pico('#8f857c', color_punta='#5e5650'); c.patas('#8f8580'); c.ojo('#d8891f', '#c9c7c2')  # pico cuerno oscuro; iris sin fuente (neutro)

# ---------- PROPUESTAS (extintas, canon de Kelvin: no entran en el juego) ----------
def martinicana(c):
    # Sin ejemplares: Labat (1742) y Buffon (1779). Wikipedia: «top of the head slate colour with a small amount of red»;
    # parrots.org: «red crown and blue and lilac wash on face, nape and neck», cola externa roja, pico gris pizarra.
    c.tono()
    c.tintar(cab * np.clip(np.maximum.reduce([R['mejilla'] * 1.2, R['auricular'], R['lores'], R['nuca'], R['lados_cuello']]) * 0.8, 0, 0.8), hexc('#8a84cc'), keep=0.45)  # lavado azul y lila
    c.tintar(cab * np.clip(R['corona'] * 1.0 + R['frente_ancha'] * 0.5, 0, 0.9), hexc('#5d6472'), keep=0.3)  # parte alta de la cabeza color pizarra
    c.pintar(cab * np.clip(R['frente'] * 0.9, 0, 0.9), hexc('#c8302a'))                      # un poco de rojo en la frente
    c.pintar(cab * R['anillo'], hexc('#d6d5d1'))
    c.pintar(R['cola_base_lat'] * 0.85, hexc('#c0372c'))                                      # plumas externas de la cola rojas
    c.pico('#6c7075'); c.patas('#6c7075'); c.ojo('#e07a1c', '#d6d5d1')                        # pico y patas gris pizarra; iris sin fuente

def violacea(c):
    # Propuesta: tools/pieles/propuestas/README.md. Du Tertre 1667, Labat 1742; las fuentes discrepan (violeta pizarra o negra).
    c.tono(); c.oscurecer(0.18 * ss(-0.05, -0.25, zz) * body)                                  # dorso verde parduzco (aprox.: verde más apagado)
    violeta = np.maximum(cab * 0.9, R['pecho'] * ss(0.40, 0.60, y) * 0.85)
    c.tintar(np.clip(violeta, 0, 0.9), hexc('#4a3f78'), keep=0.25)                            # cabeza, cuello y partes inferiores violeta pizarra
    c.festoneado(cab * 1.0, 0.25)                                                              # mezcla con negro
    c.pintar(R['carpo'] * 0.9, hexc('#d22b22'))                                               # rojo en el hombro
    c.pintar(R['espejo'] * 0.6, hexc('#e0b020'))                                              # coberteras amarillo intenso (aprox.)
    c.pintar(cab * R['anillo'], hexc('#b9b7b3'))
    c.pico('#2c2c2e'); c.patas('#6c7075'); c.ojo('#c8281e', '#b9b7b3')                        # pico negro, ojos rojos

ESP = {'finschi': finschi, 'lilacina': lilacina, 'autumnalis': autumnalis, 'vinacea': vinacea, 'arausiaca': arausiaca, 'collaria': collaria, 'pretrei': pretrei, 'tucumana': tucumana, 'agilis': agilis, 'albifrons': albifrons, 'festiva': festiva, 'martinicana': martinicana, 'violacea': violacea}
if __name__ == '__main__':
    sp = sys.argv[1]; out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(AQUI, '..', sp, sp + '.jpg')
    c = Lienzo(); ESP[sp](c); c.guardar(out)
