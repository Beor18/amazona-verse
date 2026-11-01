#!/usr/bin/env python3
"""Amazona Verse · BM98: captura la Ciudad de los 36 a ~20 m sobre el terreno (3 vistas) para ver caras que faltan.

    python3.11 -I tools/build/bm98_capturas.py --raiz <build> --etiqueta antes
Guarda docs/img/bm14_c20{a,b,c}_<etiqueta>.jpg (usa bm14_medir con escenas nuevas).
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bm11_gameplay as G  # noqa: E402
import bm14_medir  # noqa: E402

VISTAS = {'c20a': (81, -278, 2.62), 'c20b': (60, -270, 2.6), 'c20c': (100, -265, 4.4)}
for k, (x, z, yaw) in VISTAS.items():
    G.ESCENAS[k] = dict(G.ESCENAS['ciudad'], abrir=G.VUELO_JS % {'v': json.dumps({'x': x, 'z': z, 'y': 155, 'yaw': yaw, 'vel': 0, 'giro': 0.0})})

if __name__ == '__main__':
    sys.argv += ['--escenas', ','.join(VISTAS)]
    sys.exit(bm14_medir.main())
