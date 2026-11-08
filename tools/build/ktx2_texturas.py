#!/usr/bin/env python3
"""Amazona Verse · «texturas optimizadas» (Modo Escuela QA-181, memoria del iPhone QA-110). Ver docs/equipo/BUILD.md.

    python3 -I tools/build/ktx2_texturas.py              # comprueba: ¿cada .ktx2 del repo está al día con su imagen?
    python3 -I tools/build/ktx2_texturas.py --escribir   # codifica los que no lo estén y actualiza tools/build/ktx2.json

Las imágenes y su modo (etc1s/uastc) salen de config.json (ktx2.texturas); cada <imagen>.ktx2 queda junto a la imagen, que no
se toca. Codifica con tools/build/bin/basisu (basis_universal 1.15, commit 7f0a00a: el mismo del transcoder de three r136 que
va con su KTX2Loader en assets/vendor/three/examples/js). Salida: 0 todo al día (o escrito), 1 hay alguno sin poner al día, 2 error de uso.
"""
import argparse
import json
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import avbuild  # noqa: E402

REPO = os.path.dirname(os.path.dirname(AQUI))


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--escribir', action='store_true', help='codificar los .ktx2 que no estén al día y actualizar ktx2.json')
    a = ap.parse_args()
    cfg = json.loads(avbuild.leer(os.path.join(AQUI, 'config.json'), 'r'))
    C = cfg.get('ktx2') or {}
    rec_p = os.path.join(AQUI, 'ktx2.json')
    try:
        rec = json.loads(avbuild.leer(rec_p, 'r'))
    except (OSError, ValueError):
        rec = {}
    tex = rec.setdefault('texturas', {})
    exe = avbuild.basisu_exe(cfg)
    if a.escribir and not exe:
        print('falta tools/build/bin/basisu %s (ver docs/equipo/BUILD.md)' % C.get('version', ''))
        return 2
    pendientes = 0
    for ruta, modo, opts in avbuild.ktx2_texturas(cfg):
        src = os.path.join(REPO, ruta)
        dst = os.path.splitext(src)[0] + '.ktx2'
        hs = avbuild.sha256(avbuild.leer(src))
        r = tex.get(ruta) or {}
        if os.path.exists(dst) and r.get('fuente') == hs and r.get('opciones') == opts and avbuild.sha256(avbuild.leer(dst)) == r.get('ktx2'):
            print('· al día   %s' % ruta)
            continue
        if not a.escribir:
            print('· VIEJO    %s (usa --escribir)' % ruta)
            pendientes += 1
            continue
        avbuild.codificar_ktx2(exe, opts, src, dst)
        tex[ruta] = {'modo': modo, 'opciones': opts, 'fuente': hs, 'ktx2': avbuild.sha256(avbuild.leer(dst)), 'bytes_imagen': os.path.getsize(src), 'bytes_ktx2': os.path.getsize(dst)}
        print('· escrito  %s [%s] → %s (%.2f MB → %.2f MB)' % (ruta, modo, os.path.basename(dst), os.path.getsize(src) / 1048576, os.path.getsize(dst) / 1048576))
    if a.escribir:
        rec['_nota'] = 'Generado por tools/build/ktx2_texturas.py --escribir: SHA256 de cada imagen de config.json ktx2.texturas y de su .ktx2 del repo.'
        rec['basisu'] = C.get('version')
        avbuild.escribir(rec_p, (json.dumps(rec, ensure_ascii=False, indent=1, sort_keys=True) + '\n').encode('utf-8'))
    return 1 if pendientes else 0


if __name__ == '__main__':
    sys.exit(main())
