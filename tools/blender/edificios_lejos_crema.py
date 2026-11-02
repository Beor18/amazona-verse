"""Piedra crema en los `_lejos` Ancient (ciudades de piedra, carril J).

El lejano ya tiene dos tonos (F0.5), pero el color sigue ocre: desde el aire
la piedra se lee dorada. Aquí se conserva la luz de cada vértice y se cambia
el tono al crema mate del shader Ancient (0,96 · 0,86 · 0,68), un poco más
claro para que se distinga del suelo. La geometría no se toca. No entra el kit
Savage ni `streaming.js`.

  python3 tools/blender/edificios_lejos_crema.py
"""
import base64
import os
import sys

import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import edificios_lejos_tono as T  # noqa: E402

W = np.array([0.2126, 0.7152, 0.0722])
# Mismo crema que avCrema en streaming.js, normalizado a luma 1.
CREMA = np.array([0.96, 0.86, 0.68])
CREMA = CREMA / float(CREMA @ W)
# El ocre de partida es oscuro. 1,28 lo acerca al crema legible sin llegar al blanco.
GANANCIA = 1.28


def _luma(col):
    return col[:, :3] @ W


def crema(col):
    luma = _luma(col)
    out = col.copy()
    out[:, :3] = np.clip(luma[:, None] * GANANCIA * CREMA, 0.06, 0.88)
    return out


def aplicar(path, forzar=False):
    js, buf = T._leer(path)
    mat = js['materials'][0]
    if not forzar and (mat.get('extras') or {}).get('avCremaLejos') == 1:
        return None
    prim = js['meshes'][0]['primitives'][0]
    col, a, start, stride, ancho = T._acc(js, buf, prim['attributes']['COLOR_0'])
    nuevo = crema(col)
    T._escribir_color(buf, a, start, stride, ancho, nuevo)
    mat.setdefault('extras', {})['avCremaLejos'] = 1
    T._guardar(path, js, buf)
    antes = round(float(_luma(col).mean()), 3)
    despues = round(float(_luma(nuevo).mean()), 3)
    return {'antes': antes, 'despues': despues}


def main():
    mal = []
    nombres = T.ancient()
    for nombre in nombres:
        path = os.path.join(T.ED, nombre + '_lejos.glb')
        if not os.path.exists(path):
            mal.append(nombre + ':falta')
            continue
        r = aplicar(path)
        if r is None:
            js, buf = T._leer(path)
            prim = js['meshes'][0]['primitives'][0]
            col, _, _, _, _ = T._acc(js, buf, prim['attributes']['COLOR_0'])
            r = dict(antes=None, despues=round(float(_luma(col).mean()), 3), ya=True)
        marca = 'ya' if r.get('ya') else ('%.3f →' % r['antes'])
        print('%-22s %s %.3f' % (nombre, marca, r['despues']))
        if not (0.28 <= r['despues'] <= 0.62):
            mal.append(nombre)
        js2 = open(path[:-4] + '_glb.js').read()
        b64 = js2.split('="', 1)[1].rstrip().rstrip('";')
        if base64.b64decode(b64) != open(path, 'rb').read():
            mal.append(nombre + ':js')
    if mal:
        print('REVISAR', ', '.join(mal))
        return 1
    print('ok', len(nombres))
    return 0


if __name__ == '__main__':
    sys.exit(main())
