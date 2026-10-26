#!/usr/bin/env python3
"""Amazona Verse · el episodio 2 jugado de punta a punta en una pestaña visible, con capturas (AD1).

    <python3.11> -I tests/qa/ep2_capturas.py [--raiz .] [--idioma es|en] [--movil] [--salida docs/img] [--prefijo ad1_ep2_]
                                             [--sin-capturas] [--informe /tmp/ep2.json]

Sirve --raiz (el repo o una build) con el servidor y el Chrome sin interfaz de tools/build/avtest.py, abre
index.html?pack=ep2 con el almacenamiento vacío, inyecta tests/qa/ep2_e2e.js y corre AV.ep2e2eTest({ aqui: true, capturas: true })
en la propia pestaña. En cada momento clave la prueba pide una captura (window.__ep2Pide) y aquí se guarda la pantalla entera
(con el HUD) en <salida>/<prefijo><momento>[_en][_movil].jpg. --movil emula un teléfono de 375×812 (dpr 2, táctil).
Imprime el resultado y la tabla de duración (md) y, con --informe, guarda el JSON completo.
"""
import argparse
import base64
import json
import os
import sys
import tempfile
import time

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(AQUI, '..', '..'))
sys.path.insert(0, os.path.join(REPO, 'tools', 'build'))
import avtest  # noqa: E402
from look_capturas import ChromePaciente  # noqa: E402


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--raiz', default=REPO)
    ap.add_argument('--idioma', default='es', choices=['es', 'en'])
    ap.add_argument('--movil', action='store_true')
    ap.add_argument('--salida', default=os.path.join(REPO, 'docs', 'img'))
    ap.add_argument('--prefijo', default='ad1_ep2_')
    ap.add_argument('--sin-capturas', action='store_true')
    ap.add_argument('--momentos', help='solo guarda estos momentos (lista con comas; por defecto, todos)')
    ap.add_argument('--informe')
    a = ap.parse_args()
    cfg = json.load(open(os.path.join(REPO, 'tools', 'build', 'config.json')))
    P = cfg['pruebas']
    errores = []

    def al_evento(m):
        me, p = m.get('method'), m.get('params') or {}
        if me == 'Runtime.exceptionThrown':
            d = p.get('exceptionDetails') or {}
            errores.append(((d.get('exception') or {}).get('description') or d.get('text') or '')[:300])
        elif me == 'Runtime.consoleAPICalled' and p.get('type') in ('error', 'assert'):
            errores.append(' '.join(str(x.get('value', x.get('description', ''))) for x in p.get('args') or [])[:300])

    srv = chrome = ws = None
    try:
        srv = avtest.Servidor(os.path.abspath(a.raiz), 0, None)
        origen = 'http://127.0.0.1:%d' % srv.puerto
        chrome = ChromePaciente(P, set(P['puertos_prohibidos']), os.path.join(tempfile.mkdtemp(prefix='ep2-capturas-'), 'chrome.log'))
        ws = avtest.WS('ws://127.0.0.1:%d%s' % (chrome.puerto, chrome.ws_path))
        cdp = avtest.CDP(ws, al_evento)
        tid = cdp.call('Target.createTarget', {'url': 'about:blank'})['targetId']
        ses = cdp.call('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
        for me in ('Page.enable', 'Runtime.enable', 'Log.enable'):
            cdp.call(me, {}, ses)
        if a.movil:
            cdp.call('Emulation.setDeviceMetricsOverride', {'width': 375, 'height': 812, 'deviceScaleFactor': 2, 'mobile': True}, ses)
            cdp.call('Emulation.setTouchEmulationEnabled', {'enabled': True, 'maxTouchPoints': 5}, ses)
        else:
            cdp.call('Emulation.setDeviceMetricsOverride', {'width': 1280, 'height': 800, 'deviceScaleFactor': 1, 'mobile': False}, ses)
        cdp.call('Page.addScriptToEvaluateOnNewDocument', {'source': 'try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}'}, ses)
        cdp.call('Page.navigate', {'url': origen + '/index.html?pack=ep2'}, ses)
        t0 = time.monotonic()
        listo = P['listo_js'] + " && window.AV.pack === 'ep2'"
        while time.monotonic() - t0 < P['espera_listo_s']:
            try:
                if avtest.evaluar(cdp, ses, '!!(%s)' % listo, 10, promesa=False):
                    break
            except (avtest.CDPError, avtest.JSError, TimeoutError):
                pass
            cdp.bombear(0.5)
        else:
            raise avtest.Infra('el episodio 2 no arrancó')
        cdp.bombear(1.0)
        print('· listo en %.0f s (%s)' % (time.monotonic() - t0, origen), flush=True)
        avtest.evaluar(cdp, ses, '''new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'tests/qa/ep2_e2e.js?' + Date.now();
            s.onload = () => res('ok'); s.onerror = rej; document.head.appendChild(s); })''', 30)
        avtest.evaluar(cdp, ses, 'window.__ep2Res = null; AV.ep2e2eTest(%s).then(r => { window.__ep2Res = JSON.stringify(r); }, e => { window.__ep2Res = JSON.stringify({ error: String(e && e.stack || e) }); }); 1'
                       % json.dumps({'aqui': True, 'capturas': not a.sin_capturas, 'idioma': a.idioma}), 10, promesa=False)
        suf = ('_en' if a.idioma == 'en' else '') + ('_movil' if a.movil else '')
        res = None
        while time.monotonic() - t0 < 900:
            pide = avtest.evaluar(cdp, ses, 'window.__ep2Pide || ""', 10, promesa=False)
            if pide and a.momentos and pide not in a.momentos.split(','):
                avtest.evaluar(cdp, ses, 'window.__ep2Pide = null; 1', 10, promesa=False)
                continue
            if pide:
                cdp.bombear(0.4)
                jpg = cdp.call('Page.captureScreenshot', {'format': 'jpeg', 'quality': 82}, ses, 60)['data']
                ruta = os.path.join(a.salida, '%s%s%s.jpg' % (a.prefijo, pide, suf))
                open(ruta, 'wb').write(base64.b64decode(jpg))
                print('  · captura', os.path.relpath(ruta, REPO), flush=True)
                avtest.evaluar(cdp, ses, 'window.__ep2Pide = null; 1', 10, promesa=False)
                continue
            res = avtest.evaluar(cdp, ses, 'window.__ep2Res', 10, promesa=False)
            if res:
                break
            cdp.bombear(0.2)
        r = json.loads(res or '{"error": "sin resultado en 900 s"}')
        if r.get('error'):
            print('· ERROR', r['error'])
            return 1
        for x in r['results']:
            print('  %s %s%s' % ('ok ' if x['ok'] else 'MAL', x['name'], (' · ' + x['extra']) if x['extra'] and not x['ok'] else ''))
        print('· %d/%d' % (r['passed'], r['total']))
        print(r['md'])
        for idi, t in r['tramos'].items():
            for x in t['atascos']:
                print('  · atasco (%s) paso %s · %s · %s' % (idi, x['paso'], x['que'], x['extra']))
        print('· errores de consola:', errores[:5] if errores else 0)
        if a.informe:
            json.dump(r, open(a.informe, 'w'), ensure_ascii=False, indent=1)
        return 0 if r['passed'] == r['total'] and not errores else 1
    finally:
        if ws:
            ws.cerrar()
        if chrome:
            chrome.cerrar()
        if srv:
            srv.cerrar()


if __name__ == '__main__':
    sys.exit(main())
