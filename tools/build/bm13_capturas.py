#!/usr/bin/env python3
"""Amazona Verse · BM13: corre AV.bohiosTest y captura la puerta de cada casa amueblada (Villa Raíz + 3 aldeas).

    python3.11 -I tools/build/bm13_capturas.py --raiz <build> [--etiqueta 20261029]

Guarda docs/img/bm13_<casa>_<etiqueta>.jpg (Vittata en el umbral, 1440×900) e imprime el resultado de la prueba.
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
from tren_capturas import ESPERA_JS  # noqa: E402

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(AQUI, '..', '..'))
PRUEBA_JS = r'''(async () => { const r = await window.AV.bohiosTest(); return JSON.stringify({ ok: r.ok, n: r.passed + '/' + r.total, mal: r.results.filter(x => !x.ok).map(x => x.name + ' (' + x.extra + ')'), bien: r.results.filter(x => x.ok && /BM13/.test(x.name)).map(x => x.name + ' (' + x.extra + ')') }); })()'''
CASAS_JS = r'''(async () => { const G = window.AV.G, B = G.bohios, o = [];
  for (const k in B.montadas) { const I = (G.mundo.streaming.instancias || []).find(J => J.id === k); if (I) o.push({ id: k, zona: I.zona, escala: I.escala }); }
  return JSON.stringify(o); })()'''
IR_JS = r'''(async (id) => { const G = window.AV.G, st = G.mundo.streaming, I = st.instancias.find(J => J.id === id), p = G.bohios.puertaDe(I);
  await st.alrededor(p.x, p.z); await st.terminar(); if (G.solidos && G.solidos.terminar) G.solidos.terminar(true);
  const S = G.S; S.pos.x = p.x + p.nx * 0.9; S.pos.z = p.z + p.nz * 0.9; S.pos.y = G.terreno.height(S.pos.x, S.pos.z) + 0.1;
  G.camara.yaw = Math.atan2(-p.nx, -p.nz); G.camara.place(true); await new Promise(r => setTimeout(r, 2500)); G.camara.place(true); await new Promise(r => setTimeout(r, 1500));
  return 'ok ' + Math.round(p.alto * 100) / 100; })(%s)'''


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--raiz', required=True)
    ap.add_argument('--etiqueta', default='20261029')
    a = ap.parse_args()
    P = json.load(open(os.path.join(AQUI, 'config.json')))['pruebas']
    srv = avtest.Servidor(os.path.abspath(a.raiz), 0, None)
    chrome = look_capturas.ChromePaciente(P, set(P['puertos_prohibidos']), os.path.join(tempfile.mkdtemp(prefix='bm13-'), 'chrome.log'))
    ws = avtest.WS('ws://127.0.0.1:%d%s' % (chrome.puerto, chrome.ws_path))
    try:
        cdp = avtest.CDP(ws, lambda m: None)
        tid = cdp.call('Target.createTarget', {'url': 'about:blank'})['targetId']
        ses = cdp.call('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
        for me in ('Page.enable', 'Runtime.enable', 'Page.bringToFront'):
            cdp.call(me, {}, ses)
        cdp.call('Emulation.setDeviceMetricsOverride', {'width': 1440, 'height': 900, 'deviceScaleFactor': 1, 'mobile': False}, ses)
        cdp.call('Page.addScriptToEvaluateOnNewDocument', {'source': 'try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}'}, ses)
        cdp.call('Page.navigate', {'url': 'http://127.0.0.1:%d/index.html?clima=sol&hud=0&calidad=alto' % srv.puerto}, ses)
        t0 = time.monotonic()
        while time.monotonic() - t0 < P['espera_listo_s']:
            try:
                if avtest.evaluar(cdp, ses, '!!(%s)' % P['listo_js'], 10, promesa=False):
                    break
            except (avtest.CDPError, avtest.JSError, TimeoutError):
                pass
            cdp.bombear(0.5)
        cdp.bombear(1.0)
        avtest.evaluar(cdp, ses, '(async () => { for (let i = 0; i < 240 && !(window.AV && window.AV.G); i++) await new Promise(r => setTimeout(r, 500)); return !!(window.AV && window.AV.G); })()', 150)
        avtest.evaluar(cdp, ses, P['preparar_js'], 120)
        avtest.evaluar(cdp, ses, ESPERA_JS, 120)
        for intento in (1, 2):
            print('prueba', intento, avtest.evaluar(cdp, ses, PRUEBA_JS, 600), flush=True)
            casas = json.loads(avtest.evaluar(cdp, ses, CASAS_JS, 60))
            if len(casas) >= 4:
                break
        print('casas', casas, flush=True)
        for c in casas:
            print('  ir', c['id'], avtest.evaluar(cdp, ses, IR_JS % json.dumps(c['id']), 180), flush=True)
            img = cdp.call('Page.captureScreenshot', {'format': 'jpeg', 'quality': 85}, ses)['data']
            ruta = os.path.join(REPO, 'docs', 'img', 'bm13_%s_%s.jpg' % (c['zona'].replace('kelvin_aldea_', ''), a.etiqueta))
            open(ruta, 'wb').write(base64.b64decode(img))
        cdp.call('Target.closeTarget', {'targetId': tid})
    finally:
        ws.cerrar(); chrome.cerrar(); srv.cerrar()


if __name__ == '__main__':
    sys.exit(main())
