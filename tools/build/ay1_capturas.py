"""Amazona Verse · capturas de AY1: rótulo «Bienvenido a …», mapa grande con los 14 asentamientos y el Diario.

Uso (python de Blender y -I; nunca `python3`):
  <python3.11> -I tools/build/ay1_capturas.py <build o carpeta con index.html> [--salida docs/img] [--movil]

Juega como un jugador nuevo en el cap. 1, lleva a Vittata a tres asentamientos (S.pos) y guarda capturas de página
(con HUD) en <salida>/ay1_<escritorio|movil>_{rotulo,mapa,diario}.jpg. --movil: 375×812, dpr 3, táctil y en inglés.
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
import look_capturas  # noqa: E402  (ChromePaciente)

AQUI = os.path.dirname(os.path.abspath(__file__))
ESPERA = 'const sleep = ms => new Promise(r => setTimeout(r, ms)); const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } return false; };'

# Idioma, carga de los asentamientos, dos visitas previas (para que el mapa tenga nombres) y la llegada que se fotografía
ROTULO_JS = '''(async () => { %s const AV = window.AV, G = AV.G, S = AV.state; await (G.mundo && G.mundo.listo);
  if (%s) { await G.idioma.poner('en'); }
  dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
  // La intro del narrador (pantalla negra) tapa el mundo: se avanza con Enter hasta que el jugador está libre
  const libre = () => !G.quiet && !G.ui.busy() && !(G.ui.worldHidden && G.ui.worldHidden());
  for (let i = 0; i < 60 && !libre(); i++) { for (const k of ['Enter', ' ', 'Escape']) dispatchEvent(new KeyboardEvent('keydown', { key: k, code: k === ' ' ? 'Space' : k, bubbles: true })); await sleep(1000); }
  if (!libre()) return 'el jugador no quedó libre';
  if (!await espera(() => G.lugares.lista().some(p => p.asentamiento), 15000)) return 'sin asentamientos';
  const A = G.lugares.lista().filter(p => p.asentamiento), ir = p => { S.pos.x = p.x + p.r * 0.4; S.pos.z = p.z; S.pos.y = G.terreno.height(S.pos.x, S.pos.z) + 0.2; };
  for (const id of ['kelvin_aldea_rio_este', 'kelvin_ruinas_yunque']) { const p = A.find(q => q.id === id); if (p) G.lugares.descubrir(p, true); }
  ir(A.find(q => q.id === 'kelvin_aldea_meandros'));
  if (!await espera(() => { const r = document.getElementById('rotulo-lugar'); return r && !r.hidden; }, 15000)) return 'no salió el rótulo';
  await sleep(700); return 'ok ' + document.getElementById('rotulo-lugar').textContent; })()'''
MAPA_JS = '''(async () => { %s const G = window.AV.G; G.minimapa.abrir(); await sleep(1200); return 'ok ' + G.minimapa.marcadores().filter(m => m.tipo === 'pueblo').length + ' asentamientos'; })()''' % ESPERA
CERRAR_MAPA_JS = '(() => { window.AV.G.minimapa.cerrar(); return "ok"; })()'
DIARIO_JS = '''(async () => { %s const G = window.AV.G; G.diario.open(); await sleep(900);
  const l = document.querySelector('.lugares-isla'); if (l) l.scrollIntoView({ block: 'center' }); await sleep(400); return l ? 'ok ' + l.children.length : 'sin sección'; })()''' % ESPERA


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('raiz')
    ap.add_argument('--salida', default='docs/img')
    ap.add_argument('--movil', action='store_true')
    a = ap.parse_args()
    cfg = json.load(open(os.path.join(AQUI, 'config.json')))
    P = cfg['pruebas']
    raiz = os.path.abspath(a.raiz)
    if os.path.isdir(os.path.join(raiz, 'site')):
        raiz = os.path.join(raiz, 'site')
    errores = []

    def al_evento(m):
        if m.get('method') == 'Runtime.exceptionThrown':
            errores.append(str((m.get('params') or {}).get('exceptionDetails'))[:300])

    srv = chrome = ws = None
    tipo = 'movil' if a.movil else 'escritorio'
    try:
        srv = avtest.Servidor(raiz, 0, None)
        origen = 'http://127.0.0.1:%d' % srv.puerto
        chrome = look_capturas.ChromePaciente(P, set(P['puertos_prohibidos']), os.path.join(tempfile.mkdtemp(prefix='ay1-cap-'), 'chrome.log'))
        ws = avtest.WS('ws://127.0.0.1:%d%s' % (chrome.puerto, chrome.ws_path))
        cdp = avtest.CDP(ws, al_evento)
        tid = cdp.call('Target.createTarget', {'url': 'about:blank'})['targetId']
        ses = cdp.call('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
        for me in ('Page.enable', 'Runtime.enable'):
            cdp.call(me, {}, ses)
        if a.movil:
            cdp.call('Emulation.setDeviceMetricsOverride', {'width': 375, 'height': 812, 'deviceScaleFactor': 3, 'mobile': True}, ses)
            cdp.call('Emulation.setTouchEmulationEnabled', {'enabled': True, 'maxTouchPoints': 5}, ses)
        else:
            cdp.call('Emulation.setDeviceMetricsOverride', {'width': 1366, 'height': 768, 'deviceScaleFactor': 1, 'mobile': False}, ses)
        cdp.call('Page.addScriptToEvaluateOnNewDocument', {'source': 'try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}'}, ses)
        cdp.call('Page.navigate', {'url': origen + '/index.html?qa=1'}, ses)
        t0 = time.monotonic()
        while time.monotonic() - t0 < P['espera_listo_s']:
            try:
                if avtest.evaluar(cdp, ses, '!!(%s)' % P['listo_js'], 10, promesa=False):
                    break
            except (avtest.CDPError, avtest.JSError, TimeoutError):
                pass
            cdp.bombear(0.5)
        print('· jugar:', avtest.evaluar(cdp, ses, P['preparar_js'], 180), flush=True)

        def foto(nombre, js, salir=None):
            r = avtest.evaluar(cdp, ses, js, 120)
            img = cdp.call('Page.captureScreenshot', {'format': 'jpeg', 'quality': 72}, ses, 60)['data']
            ruta = os.path.join(a.salida, 'ay1_%s_%s.jpg' % (tipo, nombre))
            open(ruta, 'wb').write(base64.b64decode(img))
            if salir:
                avtest.evaluar(cdp, ses, salir, 30)
            print('· %s: %s → %s' % (nombre, str(r)[:160], ruta), flush=True)

        foto('rotulo', ROTULO_JS % (ESPERA, 'true' if a.movil else 'false'))
        foto('mapa', MAPA_JS, CERRAR_MAPA_JS)
        foto('diario', DIARIO_JS)
        print('· errores de JS: %d %s' % (len(errores), errores[:3]), flush=True)
    finally:
        if ws:
            ws.cerrar()
        if chrome:
            chrome.cerrar()
        if srv:
            srv.cerrar()


if __name__ == '__main__':
    main()
