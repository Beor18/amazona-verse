#!/usr/bin/env python3
"""Amazona Verse · capturas de la web (landing) a 375 px y a escritorio, con comprobación de desborde horizontal.

    python3.11 -I tools/build/web_capturas.py [--raiz web] [--salida docs/img] [--prefijo web_] [--paginas index.html,cotorra.html,escuelas.html]

Sirve --raiz con el servidor y el Chrome sin interfaz de avtest.py, abre cada página a 375×812 (móvil emulado, dpr 2) y a 1366×900, espera a
que cargue, abre todos los <details>, mide document.documentElement.scrollWidth contra el ancho de la ventana (desborde horizontal) y guarda
<salida>/<prefijo><página>_<movil|escritorio>.jpg de la página entera. También apunta los errores de consola. Salida: 0 si no hay desborde
ni errores, 1 si algo falla.
"""
import argparse
import base64
import json
import os
import subprocess
import sys
import tempfile
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import avtest  # noqa: E402

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(AQUI, '..', '..'))
MEDIR_JS = r'''(() => { document.querySelectorAll('details').forEach(d => { d.open = true; });
  const w = innerWidth, sw = document.documentElement.scrollWidth, malos = [];
  document.querySelectorAll('body *').forEach(el => { const r = el.getBoundingClientRect();
    if (r.right > w + 1 && r.width > 0) malos.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + '.' + String(el.className && el.className.baseVal !== undefined ? 'svg' : el.className).slice(0, 40) + ' ' + Math.round(r.right)); });
  return JSON.stringify({ ancho: w, scrollWidth: sw, desborde: sw > w, malos: malos.slice(0, 12), alto: document.documentElement.scrollHeight, titulo: document.title }); })()'''


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--raiz', default=os.path.join(REPO, 'web'))
    ap.add_argument('--salida', default=os.path.join(REPO, 'docs', 'img'))
    ap.add_argument('--prefijo', default='web_')
    ap.add_argument('--paginas', default='index.html,cotorra.html,escuelas.html')
    ap.add_argument('--espera', type=float, default=3.0)
    a = ap.parse_args()
    P = json.load(open(os.path.join(AQUI, 'config.json')))['pruebas']
    os.makedirs(a.salida, exist_ok=True)
    estado = {'consola': []}

    def al_evento(r):
        me, p = r.get('method'), r.get('params') or {}
        if me == 'Runtime.exceptionThrown':
            estado['consola'].append((p.get('exceptionDetails') or {}).get('text', 'excepción'))
        elif me == 'Runtime.consoleAPICalled' and p.get('type') in ('error', 'assert'):
            estado['consola'].append(' '.join(str(x.get('value', x.get('description', ''))) for x in p.get('args') or [])[:300])

    fallo = False
    srv = chrome = ws = None
    try:
        srv = avtest.Servidor(os.path.abspath(a.raiz), 0, None)
        origen = 'http://127.0.0.1:%d' % srv.puerto
        chrome = avtest.Chrome(P, set(P['puertos_prohibidos']), os.path.join(tempfile.mkdtemp(prefix='web-capturas-'), 'chrome.log'))
        ws = avtest.WS('ws://127.0.0.1:%d%s' % (chrome.puerto, chrome.ws_path))
        cdp = avtest.CDP(ws, al_evento)
        print('· servidor %s · Chrome %s' % (origen, chrome.version), flush=True)
        for pagina in [x.strip() for x in a.paginas.split(',') if x.strip()]:
            nombre = 'index' if pagina in ('', 'index.html') else os.path.splitext(pagina)[0]
            for modo, metrica in (('movil', {'width': 375, 'height': 812, 'deviceScaleFactor': 2, 'mobile': True}),
                                  ('escritorio', {'width': 1366, 'height': 900, 'deviceScaleFactor': 1, 'mobile': False})):
                tid = cdp.call('Target.createTarget', {'url': 'about:blank'})['targetId']
                ses = cdp.call('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
                for me in ('Page.enable', 'Runtime.enable'):
                    cdp.call(me, {}, ses)
                cdp.call('Emulation.setDeviceMetricsOverride', metrica, ses)
                if metrica['mobile']:
                    cdp.call('Emulation.setTouchEmulationEnabled', {'enabled': True, 'maxTouchPoints': 5}, ses)
                cdp.call('Page.navigate', {'url': '%s/%s' % (origen, pagina)}, ses)
                cdp.bombear(a.espera)
                r = json.loads(avtest.evaluar(cdp, ses, MEDIR_JS, 30, promesa=False))
                cdp.bombear(0.8)
                # La captura de página entera necesita que el alto emulado cubra todo el documento
                cdp.call('Emulation.setDeviceMetricsOverride', dict(metrica, height=min(int(r['alto']) + 10, 16000)), ses)
                cdp.bombear(0.8)
                png = cdp.call('Page.captureScreenshot', {'format': 'jpeg', 'quality': 72, 'captureBeyondViewport': True}, ses, 120)['data']
                ruta = os.path.join(a.salida, '%s%s_%s.jpg' % (a.prefijo, nombre, modo))
                open(ruta, 'wb').write(base64.b64decode(png))
                print('· %s · %s: %dx%d · scrollWidth %d · %s · %s' % (pagina, modo, r['ancho'], r['alto'], r['scrollWidth'],
                      'DESBORDE ' + ', '.join(r['malos']) if r['desborde'] else 'sin desborde', ruta), flush=True)
                fallo = fallo or r['desborde']
                cdp.call('Target.closeTarget', {'targetId': tid})
                cdp.bombear(0.3)
        if estado['consola']:
            print('· errores de consola:', estado['consola'][:5], flush=True)
            fallo = True
        else:
            print('· 0 errores de consola', flush=True)
        try:
            cdp.call('Browser.close', {}, None, 5)
        except Exception:
            pass
    finally:
        if ws:
            ws.cerrar()
        if chrome:
            chrome.cerrar()
        if srv:
            srv.cerrar()
    return 1 if fallo else 0


if __name__ == '__main__':
    sys.exit(main())
