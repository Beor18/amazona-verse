"""Colores de las pieles de especie para el Álbum de las 36 y las cotorras 3D (src/game/album.js, PALETA).

Mide los colores principales (k-medias, 9 grupos) de cada assets/textures/pieles/<piel>.jpg e imprime cada grupo con su
porcentaje. La PALETA de album.js toma de aquí el verde del cuerpo (el grupo verde saturado; el grupo oliva de ~45 % es el
relleno del UV) y el color de la cabeza, elegido entre los grupos según el rasgo con fuente de content/comun/especies.js
(p. ej. vittata «frente roja» → el rojo #d40904). Solo lee: no escribe nada.

Uso (Mac: el python de Blender, como pide CLAUDE.md; necesita Pillow):
  ~/Applications/Blender.app/Contents/Resources/4.2/python/bin/python3.11 -I tools/build/paleta_pieles.py [assets/textures/pieles]
"""
import os, random, sys

from PIL import Image


def grupos(ruta, k=9, vueltas=12):
    im = Image.open(ruta).convert('RGB').resize((96, 96))
    px = [p for p in im.getdata() if sum(p) > 60]
    random.seed(1)
    C = random.sample(px, k)
    for _ in range(vueltas):
        G = [[] for _ in C]
        for p in px:
            G[min(range(len(C)), key=lambda j: sum((p[i] - C[j][i]) ** 2 for i in range(3)))].append(p)
        C = [tuple(sum(q[i] for q in g) / len(g) for i in range(3)) if g else C[j] for j, g in enumerate(G)]
    return sorted(((len(g) / len(px), C[j]) for j, g in enumerate(G)), reverse=True)


def main():
    d = sys.argv[1] if len(sys.argv) > 1 else 'assets/textures/pieles'
    hx = lambda c: '#%02x%02x%02x' % tuple(int(round(x)) for x in c)
    for f in sorted(os.listdir(d)):
        if f.endswith('.jpg'):
            print(f[:-4], ' '.join('%s:%.3f' % (hx(c), s) for s, c in grupos(os.path.join(d, f)) if s > 0.006))


if __name__ == '__main__':
    main()
