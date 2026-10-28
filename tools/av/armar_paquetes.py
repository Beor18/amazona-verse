#!/usr/bin/env python3
"""Arma un .zip por paquete de producción (docs/equipo/av/paquetes.json): las referencias numeradas, PROMPT.txt y
ACEPTACION.txt, listos para subir a Grok Imagine. Uso: python3 -I tools/av/armar_paquetes.py <carpeta_salida> [id ...]"""
import json, sys, zipfile
from pathlib import Path

JUEGO = Path(__file__).resolve().parents[2]
datos = json.loads((JUEGO / 'docs/equipo/av/paquetes.json').read_text(encoding='utf-8'))
salida = Path(sys.argv[1]); salida.mkdir(parents=True, exist_ok=True)
pedidos = set(sys.argv[2:])
comunes = datos['ajustes_comunes']
for p in datos['paquetes']:
    if pedidos and p['id'] not in pedidos:
        continue
    zf = salida / f"{p['id']}.zip"
    with zipfile.ZipFile(zf, 'w', zipfile.ZIP_DEFLATED) as z:
        for i, ref in enumerate(p['referencias'], 1):
            f = JUEGO / ref
            z.write(f, f"ref_{i:02d}_{f.name}")
        ajustes = f"Resolución: {comunes['resolucion']} · Duración: {comunes['duracion_s']} s · Formato: {comunes['formato']} ({comunes['variante']}) · Audio: {p['audio']}"
        z.writestr('PROMPT.txt', p['prompt'] + '\n\n' + ajustes + '\n')
        z.writestr('ACEPTACION.txt', '\n'.join('- ' + a for a in p['aceptacion']) + '\n')
    print(zf, zf.stat().st_size // 1024, 'KB')
