# Sendas originales de Kelvin (R1, docs/equipo/MAPA_COMPLETO.md §A1): saca de la máscara del bosque de su terreno
# (WORK/Amazonas/maps/trees.psd, negro = sin árboles) las sendas finas que unen sus aldeas, sin el río ni los claros anchos,
# y las guarda como polilíneas en metros del mapa (X este, Y norte) en tools/blender/mapa_sendas_kelvin.json, que lee
# mapa_lib.build(). Solo numpy. Python de Blender, con -I:
#   taskpolicy -b nice -n 15 <python de Blender> -I tools/blender/mapa_sendas_kelvin.py
# Entrada: trees.psd convertido a BMP (ver mapa_original_diag.py) en $AV_MAX_WORK_TERRENO/trees.bmp.
import os, sys, json
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import mapa_lib as ML
from mapa_original_diag import bmp, bilin, WORK

ABRE = int(os.environ.get("SENDAS_ABRE", "5"))   # media anchura máxima (m) de una senda; lo más ancho es claro
MIN_L = 14.0   # redes de sendas más cortas se descartan (restos de bordes de claros)
CLARO_MAX = 1500.0   # m2: las sendas cruzan los claros de las aldeas más pequeños que esto; los grandes (mesetas) no

def disco(r):
    o = [(i, j) for i in range(-r, r + 1) for j in range(-r, r + 1) if i * i + j * j <= r * r + r]
    return o

def erosiona(m, r):
    out = m.copy(); P = np.pad(m, r, constant_values=False); n = m.shape
    for i, j in disco(r): out &= P[r + i:r + i + n[0], r + j:r + j + n[1]]
    return out

def dilata(m, r):
    out = m.copy(); P = np.pad(m, r, constant_values=False); n = m.shape
    for i, j in disco(r): out |= P[r + i:r + i + n[0], r + j:r + j + n[1]]
    return out

def componentes(m):
    lab = np.zeros(m.shape, np.int32); k = 0
    for s in zip(*np.nonzero(m)):
        if lab[s]: continue
        k += 1; pila = [s]; lab[s] = k
        while pila:
            a, b = pila.pop()
            for da in (-1, 0, 1):
                for db in (-1, 0, 1):
                    c = (a + da, b + db)
                    if 0 <= c[0] < m.shape[0] and 0 <= c[1] < m.shape[1] and m[c] and not lab[c]: lab[c] = k; pila.append(c)
    return lab, k

def adelgaza(m):
    """Zhang-Suen: esqueleto de 1 celda."""
    m = np.pad(m.astype(np.uint8), 1)
    while True:
        cambio = False
        for paso in (0, 1):
            p2 = m[:-2, 1:-1]; p3 = m[:-2, 2:]; p4 = m[1:-1, 2:]; p5 = m[2:, 2:]; p6 = m[2:, 1:-1]; p7 = m[2:, :-2]; p8 = m[1:-1, :-2]; p9 = m[:-2, :-2]
            vec = [p2, p3, p4, p5, p6, p7, p8, p9, p2]
            B = sum(vec[:8]); A = sum(((vec[i] == 0) & (vec[i + 1] == 1)).astype(np.uint8) for i in range(8))
            c = (p2 * p4 * p6 == 0) & (p4 * p6 * p8 == 0) if paso == 0 else (p2 * p4 * p8 == 0) & (p2 * p6 * p8 == 0)
            quita = (m[1:-1, 1:-1] == 1) & (B >= 2) & (B <= 6) & (A == 1) & c
            if quita.any(): m[1:-1, 1:-1][quita] = 0; cambio = True
        if not cambio: return m[1:-1, 1:-1].astype(bool)

def traza(sk):
    """Esqueleto -> polilíneas entre extremos y cruces (índices de fila, columna)."""
    V = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
    pts = set(zip(*np.nonzero(sk)))
    vec = lambda p: [(p[0] + a, p[1] + b) for a, b in V if (p[0] + a, p[1] + b) in pts]
    nodo = {p for p in pts if len(vec(p)) != 2}
    hecho = set(); out = []
    for n in list(nodo) + list(pts):
        for q in vec(n):
            if (n, q) in hecho: continue
            linea = [n, q]; hecho.add((n, q)); hecho.add((q, n)); prev, cur = n, q
            while cur not in nodo and cur != n:
                sig = [r for r in vec(cur) if r != prev and (cur, r) not in hecho]
                if not sig: break
                prev, cur = cur, sig[0]; linea.append(cur); hecho.add((prev, cur)); hecho.add((cur, prev))
            out.append(linea)
    return out

def main():
    n = int(2 * ML.HALF / ML.RES) + 1; ax = np.linspace(-ML.HALF, ML.HALF, n)
    X, Y = np.meshgrid(ax, ax)                                         # filas: Y de sur a norte (como mapa_lib)
    K = np.load(ML.KELVIN_NPY).astype(np.float64)
    T = bmp(os.path.join(WORK, 'trees.bmp'))
    x0u, x1u, y0u, y1u = -896.0, 896.0, -960.0, 960.0
    Xu = X / ML.S_K; Yu = Y / ML.S_K
    dentro = (Xu >= x0u) & (Xu <= x1u) & (Yu >= y0u) & (Yu <= y1u)
    # misma correspondencia que mapa_original_diag.py (filas = Y desde el sur; columnas = X invertida)
    Tm = bilin(T, (1 - (Xu - x0u) / (x1u - x0u)) * (T.shape[1] - 1), (Yu - y0u) / (y1u - y0u) * (T.shape[0] - 1))
    Ko = bilin(K, (Xu - x0u) / (x1u - x0u) * (K.shape[1] - 1), (Yu - y0u) / (y1u - y0u) * (K.shape[0] - 1))
    sin_arb = dentro & (Tm < 70)
    rio = dilata(dentro & (Ko < 3.0), 6)
    libre = sin_arb & ~rio
    # media anchura de cada celda libre (erosiones sucesivas); el esqueleto que pasa por lo estrecho es senda
    mw = np.zeros(libre.shape, np.int16); e = libre.copy()
    for r in range(1, 30):
        e = erosiona(e, 1)
        if not e.any(): break
        mw[e] = r
    claros = libre & (mw > ABRE)
    lc, _ = componentes(dilata(claros, ABRE + 1) & libre)
    chico = np.bincount(lc.ravel()) * ML.RES ** 2 < CLARO_MAX; chico[0] = False
    grande = (lc > 0) & ~chico[lc]                                   # dentro de una meseta abierta no hay senda
    sk = adelgaza(libre) & (((mw <= ABRE) & ~grande) | chico[lc])
    ls, _ = componentes(sk)
    sk &= (np.bincount(ls.ravel()) * ML.RES >= MIN_L)[ls]; sk[ls == 0] = False
    sendas = []
    lineas = traza(sk)
    grado = {}
    for ln in lineas:
        for q in (ln[0], ln[-1]): grado[q] = grado.get(q, 0) + 1
    for ln in lineas:
        P = np.array([[ax[j], ax[i]] for i, j in ln], float)
        L = float(np.sum(np.linalg.norm(np.diff(P, axis=0), axis=1)))
        if len(P) < 2 or (L < 6 and min(grado[ln[0]], grado[ln[-1]]) == 1): continue   # ramitas del esqueleto
        sendas.append(np.round(ML.rdp(P, 0.7), 1).tolist())
    larg = sum(float(np.sum(np.linalg.norm(np.diff(np.array(s), axis=0), axis=1))) for s in sendas)
    out = {'fuente': 'máscara de MultiScatter de AV3DMaxTerrainExport.max (WORK/Amazonas/maps/trees.psd), esqueleto de los tramos de %d m de media anchura o menos, sin el río' % ABRE,
           'coordenadas': 'metros del mapa (X este, Y norte); en el juego x = X, z = -Y',
           'largo': round(larg), 'sendas': sendas}
    json.dump(out, open(os.path.join(HERE, 'mapa_sendas_kelvin.json'), 'w'), separators=(',', ':'))
    print('sendas: %d, %.0f m; claros %.0f m2' % (len(sendas), larg, claros.sum()))

if __name__ == '__main__':
    main()
