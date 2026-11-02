#!/usr/bin/env python3
"""Amazona Verse · informe de la última publicación (CG-2). Lo llaman publicar_mac.sh y publicar_nube.sh.

  ultima_publicacion.py <reporte-test.json|-> <salida.json> --codigo SHA [--sitio SHA] [--nota TEXTO]

Resume el reporte-test.json de avtest.py (la misma corrida que decide la publicación) en
docs/equipo/ultima_publicacion.json, que va en el mismo commit «Sitio: publica <codigo>».
- codigo: commit de código probado (manifiesto.commit del reporte; si falta, --codigo).
- sitio: commit de sitio/ si se conoce. El commit que lleva este archivo no puede saber su propio hash,
  así que sale null y se busca con  git log --grep '^Sitio: publica <codigo>'.
- Reporte «-»: no hubo pruebas (publicar_mac.sh --igual); las baterías salen null.
Solo biblioteca estándar; en la Mac se corre con el python de Blender (-I), nunca el del sistema.
"""
import argparse
import datetime
import json
import os
import sys


def resumen(R, codigo, sitio, nota):
    m = R.get('manifiesto') or {}
    bats = {}
    for n, r in (R.get('baterias') or {}).items():
        b = {'requerida': bool(r.get('requerida'))}
        if not r.get('existe'):
            b.update(passed=None, total=None, ok=False, error=r.get('error') or ('no existe' if r.get('existe') is False else 'no corrió'))
        elif 'error' in r:
            b.update(passed=None, total=None, ok=False, error=str(r['error']).splitlines()[0][:200])
        else:
            b.update(passed=r['passed'], total=r['total'], ok=r['passed'] == r['total'] and r['total'] > 0)
        bats[n] = b
    c, ci, med = R.get('consola') or {}, R.get('carga_inicial') or {}, R.get('medidas') or {}
    return {
        'codigo': m.get('commit') or codigo,
        'sitio': sitio,
        'fecha': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'nota': nota,
        'pruebas': {
            'estado': R.get('estado'),
            'inicio': R.get('inicio'),
            'duracion_s': R.get('duracion_s'),
            'chrome': (R.get('entorno') or {}).get('chrome'),
            'huella_build': m.get('huella'),
            'requeridas_ok': sum(1 for b in bats.values() if b['requerida'] and b['ok']),
            'requeridas': sum(1 for b in bats.values() if b['requerida']),
        },
        'baterias': bats,
        'consola': {'errores': c.get('errores_total', 0), 'avisos': c.get('avisos_total', 0),
                    'muestras_error': [('%s: %s' % (e.get('origen'), (e.get('texto') or '').splitlines()[0][:200])) for e in (c.get('errores') or [])[:10]]},
        'carga_inicial_mb': ci.get('mb'),
        'heap_mb': med.get('heap_mb'),
        'fallas': R.get('fallas') or [],
        'avisos': R.get('avisos') or [],
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('reporte', help='reporte-test.json de avtest.py, o «-» si no hubo pruebas')
    ap.add_argument('salida')
    ap.add_argument('--codigo', default='')
    ap.add_argument('--sitio', default=None)
    ap.add_argument('--nota', default='')
    a = ap.parse_args()
    if a.reporte == '-':
        R = {'estado': 'sin pruebas', 'baterias': None}
    else:
        with open(a.reporte, encoding='utf-8') as f:
            R = json.load(f)
    out = resumen(R, a.codigo, a.sitio, a.nota)
    if a.reporte == '-':
        out['baterias'] = None
    d = os.path.dirname(os.path.abspath(a.salida))
    os.makedirs(d, exist_ok=True)
    with open(a.salida, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write('\n')
    p = out['pruebas']
    print('ultima_publicacion: %s · %s · %s/%s requeridas · consola %s errores, %s avisos · carga %s MB'
          % (a.salida, p['estado'], p['requeridas_ok'], p['requeridas'], out['consola']['errores'], out['consola']['avisos'], out['carga_inicial_mb']))


if __name__ == '__main__':
    sys.exit(main())
