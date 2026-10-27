# Máscara del bosque de Kelvin para el bosque lleno (AW2, MAPA_PLAN_COMPLETO.md F1.1): la máscara de MultiScatter de su terreno
# (WORK/Amazonas/maps/trees.psd, negro = sin árboles) pasada a celdas de 4 m del mapa del juego, en bits, en
# assets/data/bosque_cap1.js (AV_BOSQUE_CAP1). La lee src/engine/vegetacion.js para rellenar el bosque donde Kelvin lo tenía;
# las sendas, el agua y los edificios siguen saliendo de la máscara «libre» del mapa. Solo numpy. Python de Blender, con -I:
#   taskpolicy -b nice -n 15 <python de Blender> -I tools/blender/bosque_mascara.py
# Entrada: trees.psd convertido a BMP (ver mapa_original_diag.py) en $AV_MAX_WORK_TERRENO/trees.bmp.
import os, sys, base64
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import mapa_lib as ML
from mapa_original_diag import bmp, bilin, WORK, ROOT

CELDA = 4.0      # m por celda (la máscara libre del mapa es de 2 m; la densidad, de 8 m)
SUB = 4          # muestras por lado dentro de cada celda; la celda es bosque si lo es la mayoría

def main():
    n = int(round(2 * ML.HALF / CELDA)); x0 = z0 = -ML.HALF
    s = (np.arange(n * SUB) + 0.5) * (CELDA / SUB) + x0
    gx, gz = np.meshgrid(s, s)                                    # filas: z del juego de norte a sur (z0 = -264)
    Xu = gx / ML.S_K; Yu = -gz / ML.S_K                           # en el juego x = X, z = -Y
    T = bmp(os.path.join(WORK, 'trees.bmp'))
    x0u, x1u, y0u, y1u = -896.0, 896.0, -960.0, 960.0
    dentro = (Xu >= x0u) & (Xu <= x1u) & (Yu >= y0u) & (Yu <= y1u)
    # misma correspondencia que mapa_original_diag.py y mapa_sendas_kelvin.py (filas = Y desde el sur; columnas = X invertida)
    Tm = bilin(T, (1 - (Xu - x0u) / (x1u - x0u)) * (T.shape[1] - 1), (Yu - y0u) / (y1u - y0u) * (T.shape[0] - 1))
    arb = np.where(dentro, Tm >= 70, True)                        # fuera de su terreno (la costa nueva) decide el mapa
    m = arb.reshape(n, SUB, n, SUB).mean((1, 3)) > 0.5
    bits = np.packbits(m.ravel(), bitorder='little')
    js = ('// Generado por tools/blender/bosque_mascara.py desde la máscara de MultiScatter de Kelvin (trees.psd). No editar a mano.\n'
          'window.AV_BOSQUE_CAP1 = {"celda":%g,"nx":%d,"nz":%d,"x0":%g,"z0":%g,"bits":"%s",'
          '"nota":"1 = bosque en el terreno de Kelvin; bit i = ix + iz*nx, orden little"};\n'
          % (CELDA, n, n, x0, z0, base64.b64encode(bits.tobytes()).decode()))
    out = os.path.join(ROOT, 'assets', 'data', 'bosque_cap1.js')
    open(out, 'w', encoding='utf-8').write(js)
    print('celdas %d x %d, bosque %.1f %%, %d bytes -> %s' % (n, n, 100 * m.mean(), len(js), out))

if __name__ == '__main__':
    main()
