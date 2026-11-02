#!/usr/bin/env python3
"""Amazona Verse · BK1: capturas de Amazona Flight a mitad de partida, en escritorio (1280×720) y en el móvil (375×812).

    python3.11 -I tools/build/bk1_capturas.py --raiz <build> --nombre bk1 [--salida docs/img]

Sirve la build, pasa el flujo de jugador nuevo, abre Flight (AV.flight()), juega con el piloto de flight_medidas.py ~3,5 s y guarda
<salida>/bk1_flight_<nombre>_<escritorio|movil>.jpg. Sirve también con builds viejas (la primera versión, 9504464^): solo usa
AV.flight() y la API de flightApi que ya tenían. Salida: 0 si se tomaron las dos capturas sin errores de consola.
"""
import argparse
import base64
import json
import os
import sys
import tempfile
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import avtest  # noqa: E402
import look_capturas  # noqa: E402
from flight_medidas import PILOTO_JS  # noqa: E402
from tren_capturas import ESPERA_JS  # noqa: E402  (espera a que pase el fundido negro de la apertura del capítulo 1)

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(AQUI, '..', '..'))
MODOS = {'escritorio': (1280, 720, 1, False), 'movil': (375, 812, 2, True)}


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--raiz', required=True)
    ap.add_argument('--nombre', required=True)
    ap.add_argument('--salida', default=os.path.join(REPO, 'docs', 'img'))
    ap.add_argument('--segundos', type=float, default=3.5)
    a = ap.parse_args()
    P = json.load(open(os.path.join(AQUI, 'config.json')))['pruebas']
    errores = []

    def al_evento(m):
        me, p = m.get('method'), m.get('params') or {}
        if me == 'Runtime.exceptionThrown':
            errores.append(str(((p.get('exceptionDetails') or {}).get('exception') or {}).get('description', ''))[:200])
        elif me == 'Runtime.consoleAPICalled' and p.get('type') in ('error', 'assert'):
            errores.append(' '.join(str(x.get('value', x.get('description', ''))) for x in p.get('args') or [])[:200])

    srv = avtest.Servidor(os.path.abspath(a.raiz), 0, None)
    chrome = look_capturas.ChromePaciente(P, set(P['puertos_prohibidos']), os.path.join(tempfile.mkdtemp(prefix='bk1-'), 'chrome.log'))
    ws = avtest.WS('ws://127.0.0.1:%d%s' % (chrome.puerto, chrome.ws_path))
    try:
        cdp = avtest.CDP(ws, al_evento)
        for modo, (w, h, dpr, movil) in MODOS.items():
            tid = cdp.call('Target.createTarget', {'url': 'about:blank'})['targetId']
            ses = cdp.call('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
            for me in ('Page.enable', 'Runtime.enable', 'Page.bringToFront'):
                cdp.call(me, {}, ses)
            cdp.call('Emulation.setDeviceMetricsOverride', {'width': w, 'height': h, 'deviceScaleFactor': dpr, 'mobile': movil}, ses)
            if movil:
                cdp.call('Emulation.setTouchEmulationEnabled', {'enabled': True, 'maxTouchPoints': 5}, ses)
            cdp.call('Page.addScriptToEvaluateOnNewDocument', {'source': 'try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}'}, ses)
            cdp.call('Page.navigate', {'url': 'http://127.0.0.1:%d/index.html?clima=sol' % srv.puerto}, ses)
            t0 = time.monotonic()
            while time.monotonic() - t0 < P['espera_listo_s']:
                try:
                    if avtest.evaluar(cdp, ses, '!!(%s)' % P['listo_js'], 10, promesa=False):
                        break
                except (avtest.CDPError, avtest.JSError, TimeoutError):
                    pass
                cdp.bombear(0.5)
            else:
                raise avtest.Infra('el juego no arrancó')
            cdp.bombear(1.0)
            prep = avtest.evaluar(cdp, ses, P['preparar_js'], 120)
            if not str(prep).startswith('ok'):
                raise avtest.Infra('flujo de jugador nuevo: %s' % prep)
            avtest.evaluar(cdp, ses, ESPERA_JS, 120)
            pts = avtest.evaluar(cdp, ses, '(async () => { const AV = window.AV; await AV.flight(); await new Promise(r => setTimeout(r, 1500));' + PILOTO_JS +
                                 ' api.toque(); let vivo = true; const bucle = () => { if (!vivo) return; decide(); requestAnimationFrame(bucle); }; requestAnimationFrame(bucle);'
                                 ' await new Promise(r => setTimeout(r, %d)); return api.estado().fase + " " + api.estado().puntos; })()' % int(a.segundos * 1000), 90)
            d = cdp.call('Page.captureScreenshot', {'format': 'jpeg', 'quality': 84}, ses, 60)['data']
            ruta = os.path.join(a.salida, 'bk1_flight_%s_%s.jpg' % (a.nombre, modo))
            open(ruta, 'wb').write(base64.b64decode(d))
            print('· %s %dx%d: %s → %s' % (modo, w, h, pts, os.path.relpath(ruta, REPO)), flush=True)
            cdp.call('Target.closeTarget', {'targetId': tid})
    finally:
        ws.cerrar()
        chrome.cerrar()
        srv.cerrar()
    print('· %s' % ('0 errores de consola' if not errores else 'errores: %s' % errores[:5]), flush=True)
    return 1 if errores else 0


if __name__ == '__main__':
    sys.exit(main())
