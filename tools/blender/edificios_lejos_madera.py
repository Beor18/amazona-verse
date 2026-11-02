"""Color de vértice de los `_lejos` Savage (aldeas de madera, carril K).

El lejano sale del atlas con luma ~0,11: desde el aire el bohío, la empalizada,
el puente y la canoa se leen como una mancha. El tejado ya lo pinta `techar`
en el motor (rojo teja). Aquí el muro, la estaca, el puente y la canoa pasan
a madera cálida, y la lona (toldo, carpa, campamento) a ocre. La cara de arriba
del bohío queda en el mismo rojo que `techar`, por si el lejano se dibuja antes.
La geometría no se toca. No entra la piedra Ancient.

  python3 tools/blender/edificios_lejos_madera.py
"""
import os
import sys

import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import edificios_lejos_tono as T  # noqa: E402

# Mismos números que techar() en streaming.js: rojo teja cálido.
TEJA = np.array([0.70, 0.28, 0.18])
W = np.array([0.2126, 0.7152, 0.0722])

TECHO = {
    'bohio_redondo', 'bohio_puntiagudo', 'casa_paja_a', 'casa_paja_b', 'caney_largo',
    'torre_vigia', 'torre_vigia_b', 'casa_plataforma', 'cercado_redondo', 'mirador_escalonado',
    'portal_madera_a', 'portal_madera_b', 'portal_madera_c',
}
MADERA = {
    'empalizada', 'puente_madera', 'portal_puas', 'muralla_atalaya_a', 'muralla_atalaya_b',
    'corral', 'muelle_troncos', 'canoa',
}
LONA = {
    'toldo_pequeno', 'tienda_pequena',
    'campamento_a', 'campamento_c', 'campamento_f',
    'carpa_a', 'carpa_b', 'carpa_c', 'carpa_d', 'carpa_e', 'carpa_f', 'carpa_g',
}


def _luma(col):
    return col[:, :3] @ W


def _curva(luma):
    lo, hi = np.percentile(luma, [8, 92])
    t = np.clip((luma - lo) / max(float(hi - lo), 1e-4), 0, 1)
    return t * t * (3 - 2 * t)


def _madera(pos, nrm, col, techo, canoa=False):
    n = nrm / np.maximum(1e-8, np.linalg.norm(nrm, axis=1))[:, None]
    luma = _luma(col)
    t = _curva(luma)
    # Madera legible: sombra 0,20, cara clara 0,56. La canoa un poco más clara sobre el agua.
    hi = 0.64 if canoa else 0.56
    target = 0.20 + (hi - 0.20) * t
    chroma = col[:, :3] / np.maximum(luma, 1e-4)[:, None]
    wood = np.array([0.62, 0.36, 0.16])
    wood = wood / max(float(wood @ W), 1e-6)
    mix = 0.62 * chroma + 0.38 * wood
    out = col.copy()
    out[:, :3] = np.clip(target[:, None] * mix, 0.05, 0.90)
    if techo:
        y1 = float(pos[:, 1].max())
        cara = (n[:, 1] > 0.32) & (pos[:, 1] > y1 * 0.42)
        out[cara, 0:3] = TEJA
    return out


def _lona(nrm, col):
    n = nrm / np.maximum(1e-8, np.linalg.norm(nrm, axis=1))[:, None]
    t = _curva(_luma(col))
    luz = np.clip(n[:, 1] * 0.5 + 0.5, 0, 1)
    shade = (0.46 + 0.54 * t) * (0.78 + 0.22 * luz)
    base = np.array([0.72, 0.46, 0.22])
    out = col.copy()
    out[:, :3] = np.clip(base * shade[:, None], 0.08, 0.92)
    return out


def aplicar(path, nombre, forzar=False):
    js, buf = T._leer(path)
    mat = js['materials'][0]
    if not forzar and (mat.get('extras') or {}).get('avMadera') == 1:
        return None
    prim = js['meshes'][0]['primitives'][0]
    pos, _, _, _, _ = T._acc(js, buf, prim['attributes']['POSITION'])
    nrm, _, _, _, _ = T._acc(js, buf, prim['attributes']['NORMAL'])
    col, a, start, stride, ancho = T._acc(js, buf, prim['attributes']['COLOR_0'])
    if nombre in LONA:
        nuevo = _lona(nrm, col)
    else:
        nuevo = _madera(pos, nrm, col, nombre in TECHO, canoa=(nombre == 'canoa'))
    T._escribir_color(buf, a, start, stride, ancho, nuevo)
    mat.setdefault('extras', {})['avMadera'] = 1
    T._guardar(path, js, buf)
    y0, y1 = float(_luma(col).mean()), float(_luma(nuevo).mean())
    return dict(antes=round(y0, 3), despues=round(y1, 3))


def modelos():
    return sorted(TECHO | MADERA | LONA)


def main():
    mal = []
    for nombre in modelos():
        path = os.path.join(T.ED, nombre + '_lejos.glb')
        if not os.path.exists(path):
            mal.append(nombre + ':falta')
            continue
        r = aplicar(path, nombre)
        if r is None:
            js, buf = T._leer(path)
            prim = js['meshes'][0]['primitives'][0]
            col, _, _, _, _ = T._acc(js, buf, prim['attributes']['COLOR_0'])
            r = dict(antes=None, despues=round(float(_luma(col).mean()), 3), ya=True)
        marca = 'ya' if r.get('ya') else ('%.3f →' % r['antes'])
        print('%-22s %s %.3f' % (nombre, marca, r['despues']))
        if not (0.22 <= r['despues'] <= 0.62):
            mal.append(nombre)
        js2 = open(path[:-4] + '_glb.js').read()
        import base64
        b64 = js2.split('="', 1)[1].rstrip().rstrip('";')
        if base64.b64decode(b64) != open(path, 'rb').read():
            mal.append(nombre + ':js')
    if mal:
        print('REVISAR', ', '.join(mal))
        return 1
    print('ok', len(modelos()))
    return 0


if __name__ == '__main__':
    sys.exit(main())
