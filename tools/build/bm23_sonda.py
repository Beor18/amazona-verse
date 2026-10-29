"""BM23: sonda de rayo en la vista ciudad."""
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
from bm11_gameplay import ESCENAS  # noqa: E402
from tren_capturas import ESPERA_JS  # noqa: E402

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(AQUI, '..', '..'))
MEDIR_JS = r'''(async () => {
  const AV = window.AV, G = AV.G, dts = []; let pv = 0, vivo = true;
  const f = t => { if (!vivo) return; if (pv) dts.push(t - pv); pv = t; requestAnimationFrame(f); }; requestAnimationFrame(f);
  await new Promise(r => setTimeout(r, 8000)); vivo = false;
  const o = dts.slice().sort((a, b) => a - b), ms = dts.reduce((a, b) => a + b, 0) / Math.max(1, dts.length);
  let tex = null; try { tex = AV.look && AV.look.medir ? AV.look.medir().texturasMB : null; } catch (e) {}
  const R = G.renderer, veg = G.vegetacion && G.vegetacion.ultimo ? G.vegetacion.ultimo() : null;
  return JSON.stringify({ fps: Math.round(1000 / ms), p95ms: Math.round(o[Math.floor(o.length * 0.95)] || 0), dpr: R.renderer.getPixelRatio(), texturasMB: tex,
    calidad: R.calidad.nivel, info: R.renderer.info.render.triangles, calls: R.renderer.info.render.calls, texturas: R.renderer.info.memory.textures });
})()'''


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--raiz', required=True)
    ap.add_argument('--etiqueta', required=True)
    ap.add_argument('--escenas', default='vuelo,ciudad')
    a = ap.parse_args()
    P = json.load(open(os.path.join(AQUI, 'config.json')))['pruebas']
    srv = avtest.Servidor(os.path.abspath(a.raiz), 0, None)
    chrome = look_capturas.ChromePaciente(P, set(P['puertos_prohibidos']), os.path.join(tempfile.mkdtemp(prefix='bm14-'), 'chrome.log'))
    ws = avtest.WS('ws://127.0.0.1:%d%s' % (chrome.puerto, chrome.ws_path))
    try:
        cdp = avtest.CDP(ws, lambda m: None)
        for nombre in a.escenas.split(','):
            esc = ESCENAS[nombre]
            abrir = esc['abrir'].replace("'vel': 14", "'vel': 0").replace('"vel": 14', '"vel": 0').replace('"vel": 9', '"vel": 0')
            tid = cdp.call('Target.createTarget', {'url': 'about:blank'})['targetId']
            ses = cdp.call('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
            for me in ('Page.enable', 'Runtime.enable', 'Page.bringToFront'):
                cdp.call(me, {}, ses)
            cdp.call('Emulation.setDeviceMetricsOverride', {'width': 1440, 'height': 900, 'deviceScaleFactor': 2, 'mobile': False}, ses)
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
            avtest.evaluar(cdp, ses, P['preparar_js'], 120)
            avtest.evaluar(cdp, ses, ESPERA_JS, 120)
            avtest.evaluar(cdp, ses, '(async () => { const G = window.AV.G; await (G.mundo && G.mundo.listo); return true; })()', 120)
            print('·', nombre, avtest.evaluar(cdp, ses, abrir, 180), flush=True)
            cdp.bombear(2.0)
            print('  sonda', avtest.evaluar(cdp, ses, open('/tmp/sonda_js.txt').read(), 60), flush=True)
            open('/tmp/sonda.jpg', 'wb').write(base64.b64decode(cdp.call('Page.captureScreenshot', {'format': 'jpeg', 'quality': 70}, ses)['data']))
            cdp.call('Target.closeTarget', {'targetId': tid})
    finally:
        ws.cerrar(); chrome.cerrar(); srv.cerrar()


if __name__ == '__main__':
    sys.exit(main())
