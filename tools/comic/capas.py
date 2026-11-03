# Capas del cómic (plantilla de Kelvin, 3-nov): de los recortes rectangulares de assets/comic/plantilla/originales/ saca la pieza
# sola con transparencia, sin redibujarla. Los recortes traen el fondo de la referencia alrededor; cada pieza tiene un contorno de
# tinta oscuro, así que el fondo es lo que se alcanza desde el borde del recorte sin cruzar la tinta (relleno por inundación).
# El logo 00 no pasa por aquí: el juego carga el archivo original intacto.
# uso: python3 -I tools/comic/capas.py   (Mac: el python de Blender, ver CLAUDE.md; necesita Pillow y numpy)
import os, sys, json
import numpy as np
from PIL import Image, ImageFilter

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ORIG = os.path.join(RAIZ, 'assets/comic/plantilla/originales')
DEST = os.path.join(RAIZ, 'assets/comic/plantilla/capas')

# pieza → (umbral de tinta: luminancia máxima del contorno, margen que se fuerza como fondo en cada lado [izq, arriba, der, abajo])
PIEZAS = {
    '07_cabecera_crea_tu_comic.png': ('cabecera', 90, 0),
    '08_pasos_1_a_4.png': ('pasos', 70, 0),
    '09_campo_titulo_aventura.png': ('campo_titulo', 90, 0),
    '10_campo_mi_cotorra.png': ('campo_cotorra', 90, 0),
    '11_seccion_que_aprendi.png': ('que_aprendi', 80, 0),
    '12_seccion_ensenanza_de_vida.png': ('ensenanza', 80, 0),
    '14_boton_ver_mis_escenas.png': ('boton_escenas', 80, 0),
    '15_boton_editar_mi_comic.png': ('boton_editar', 80, 0),
    '16_boton_descargar.png': ('boton_descargar', 80, 0),
    '17_boton_compartir.png': ('boton_compartir', 80, 0),
    '43_signos_confusion.png': ('confusion', 90, 0),
}
# 42 (¡FUUUSH!), 44 (bandera: el recorte cae sobre la placa) y 45 (placa: la corona sale cortada) se reconstruyen por programa
# en src/game/comic_plantilla.js; también las viñetas 01–06, globos, círculos, cajas y cintillos (traen textos y siluetas de muestra).
BOTONES = {'14_boton_ver_mis_escenas.png', '15_boton_editar_mi_comic.png', '16_boton_descargar.png', '17_boton_compartir.png'}

def fondo_desde_borde(libre):
    """libre: bool HxW (no es tinta). Devuelve lo alcanzable desde el borde por píxeles libres (4-vecinos)."""
    h, w = libre.shape
    f = np.zeros_like(libre)
    f[0, :] = libre[0, :]; f[-1, :] = libre[-1, :]; f[:, 0] = libre[:, 0]; f[:, -1] = libre[:, -1]
    while True:
        g = f.copy()
        g[1:, :] |= f[:-1, :]; g[:-1, :] |= f[1:, :]; g[:, 1:] |= f[:, :-1]; g[:, :-1] |= f[:, 1:]
        g &= libre
        if (g == f).all():
            return f
        f = g

def conectado(m, semilla):
    f = semilla & m
    while True:
        g = f.copy()
        g[1:, :] |= f[:-1, :]; g[:-1, :] |= f[1:, :]; g[:, 1:] |= f[:, :-1]; g[:, :-1] |= f[:, 1:]
        g &= m
        if (g == f).all():
            return f
        f = g

def boton(nombre):
    # Botón: rectángulo redondeado. El fondo de selva es oscuro como la tinta, así que se mide el cuerpo de color del botón
    # (parecido al color del centro) y se le suma el contorno.
    im = Image.open(os.path.join(ORIG, nombre)).convert('RGBA')
    a = np.asarray(im).astype(np.float32); h, w = a.shape[:2]
    c = np.median(a[h // 3:2 * h // 3, w // 3:2 * w // 3, :3].reshape(-1, 3), axis=0)
    cuerpo = np.sqrt(((a[..., :3] - c) ** 2).sum(-1)) < 70
    ys, xs = np.nonzero(cuerpo)
    x0, x1 = np.percentile(xs, 0.5), np.percentile(xs, 99.5); y0, y1 = np.percentile(ys, 0.5), np.percentile(ys, 99.5)
    m = Image.new('L', (w * 4, h * 4), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(m).rounded_rectangle(((x0 - 5) * 4, (y0 - 5) * 4, (x1 + 5) * 4, (y1 + 5) * 4), radius=18 * 4, fill=255)
    m = m.resize((w, h), Image.LANCZOS)
    out = a.copy(); out[..., 3] = np.minimum(np.asarray(m).astype(np.float32), a[..., 3])
    o = Image.fromarray(out.astype(np.uint8), 'RGBA')
    return o, o.getchannel('A').point(lambda v: 255 if v > 10 else 0).getbbox()

def recortar(nombre, umbral):
    im = Image.open(os.path.join(ORIG, nombre)).convert('RGBA')
    a = np.asarray(im).astype(np.float32)
    lum = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
    tinta = lum < umbral
    # la tinta se engorda 1 px para cerrar huecos de antialias en el contorno
    t = tinta.copy(); t[1:, :] |= tinta[:-1, :]; t[:-1, :] |= tinta[1:, :]; t[:, 1:] |= tinta[:, :-1]; t[:, :-1] |= tinta[:, 1:]
    fondo = fondo_desde_borde(~t)
    # la pieza = lo que no es fondo; se quitan islas sueltas pequeñas (hojas del fondo encerradas) quedándose con lo conectado al centro
    pieza = ~fondo
    if nombre.startswith('43_'):
        # Signos ???: el fondo morado queda encerrado por el globo de abajo; se toma el naranja/amarillo y su tinta
        r, g_, b = a[..., 0], a[..., 1], a[..., 2]
        nar = (r > 170) & (g_ > 90) & (b < 140) & (r - b > 90)
        cerca = Image.fromarray((nar * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))
        pieza = nar | (tinta & (np.asarray(cerca) > 0))
    else:
        # solo lo conectado con el centro (fuera las manchas sueltas del fondo)
        h, w = pieza.shape; sem = np.zeros_like(pieza); sem[h // 4:3 * h // 4, w // 4:3 * w // 4] = True
        pieza = conectado(pieza, sem)
    alfa = Image.fromarray((pieza * 255).astype(np.uint8))
    alfa = alfa.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))  # quita el px engordado; borde suave
    al = np.minimum(np.asarray(alfa).astype(np.float32), a[..., 3])
    out = a.copy(); out[..., 3] = al
    o = Image.fromarray(out.astype(np.uint8), 'RGBA')
    bb = o.getchannel('A').point(lambda v: 255 if v > 10 else 0).getbbox()
    return o, bb

def main():
    os.makedirs(DEST, exist_ok=True)
    man = json.load(open(os.path.join(ORIG, 'MANIFIESTO_ELEMENTOS.json')))
    bounds = {x['file']: x['bounds'] for x in man['assets']}
    info = {}
    for nombre, (dest, umbral, _) in PIEZAS.items():
        o, bb = recortar(nombre, umbral) if nombre not in BOTONES else boton(nombre)
        o = o.crop(bb)
        x0, y0 = bounds[nombre][0] + bb[0], bounds[nombre][1] + bb[1]
        ruta = os.path.join(DEST, dest + '.webp')
        o.save(ruta, 'WEBP', quality=92, alpha_quality=100, method=6)
        info[dest] = {'de': nombre, 'x': x0, 'y': y0, 'w': o.width, 'h': o.height}
        print('%-18s %4d,%4d %3dx%3d %6.1f KB' % (dest, x0, y0, o.width, o.height, os.path.getsize(ruta) / 1024))
    json.dump(info, open(os.path.join(DEST, 'capas.json'), 'w'), indent=1)

if __name__ == '__main__':
    main()
