#!/usr/bin/env python3
"""Amazona Verse · BM134/A9: capturas de la Ciudad de los 36 (plaza y aire × día y atardecer × calidad alto y bajo).

    python3.11 -I tools/build/bm134_capturas.py --raiz <build> [--etiqueta 20261104]

Guarda docs/img/bm134_ciudad_<plaza|aire>_<dia|tarde>_<alto|bajo>.jpg (1440×900).
"""
import argparse, base64, os, sys, tempfile, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
import avtest, look_capturas  # noqa: E402
from tren_capturas import ESPERA_JS  # noqa: E402

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(AQUI, '..', '..'))
VISTAS = {'aire': {'dx': 0, 'dz': 34, 'abs': 126.6}, 'plaza': {'dx': 0, 'dz': 26, 'alt': 14}}  # sobre la plaza de la Ciudad de los 36 (-33.9, -144.5)
PON_JS = r'''(async () => {
  const AV = window.AV, G = AV.G, S = G.S, V = %(v)s, tarde = %(t)s;
  const cuadros = n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  G.pausa.set('captura', false);
  if (G.clima && G.clima.fijar) G.clima.fijar('sol', { inmediato: true, forzar: true });
  if (tarde) { const a = await AV.atardecer(); a.forzar(true); a.avanzar(60); } else if (G.atardecer) G.atardecer.forzar(false);
  for (let i = 0; i < 40; i++) { const b = [...document.querySelectorAll('button')].find(b => /Saltar intro/i.test(b.textContent) && b.offsetParent); if (!b) break; b.click(); await new Promise(r => setTimeout(r, 500)); }
  const f = document.getElementById('c1-fade'); if (f) f.remove();
  const c = null;
  let x = V.x, z = V.z, y = V.y, yaw = V.yaw;
  x = -33.9 + V.dx; z = -144.5 + V.dz; y = V.abs != null ? V.abs : G.terreno.height(x, z) + V.alt; yaw = 0;
  S.pos.x = x; S.pos.y = y; S.pos.z = z; S.vy = 0; G.fisica.MOVE.flying = true; G.camara.yaw = yaw;
  const ST = G.mundo && G.mundo.streaming;
  if (ST) { if (ST.alrededor) await ST.alrededor(x, z); if (ST.terminar) await ST.terminar(); }
  if (G.solidos && G.solidos.terminar) G.solidos.terminar();
  await Promise.resolve(G.vegetacion && G.vegetacion.listo);
  if (AV.dosel) await AV.dosel().catch(() => {});
  G.camara.place(true); await cuadros(120);
  for (let i = 0; i < 40; i++) { const b = [...document.querySelectorAll('button')].find(b => /Saltar intro/i.test(b.textContent) && b.offsetParent); if (!b) break; b.click(); await new Promise(r => setTimeout(r, 500)); }
  const f2 = document.getElementById('c1-fade'); if (f2) f2.remove(); await cuadros(30);
  // BM136: la intro se vuelve a abrir al cargar el mundo; se salta de verdad (cancelar el diálogo libre y la apertura; sin teclas, que activarían el juego) y se quita todo lo que quede
  for (let i = 0; i < 6; i++) {
    try { G.dialogo.cancelarLibre(); } catch (e) {}
    if (G.c && G.c.apertura && G.c.apertura.fin) G.c.apertura.fin();
    ['c1-fade', 'c1-ruptura', 'c1-saltar'].forEach(id => { const e = document.getElementById(id); if (e) e.remove(); });
    await cuadros(20);
  }
  return 'ok ' + Math.round(x) + ',' + Math.round(z) + ' ' + (c ? 'col' : 'fijo');
})()'''


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--raiz', required=True)
    ap.add_argument('--vistas', default='plaza,aire')
    ap.add_argument('--calidades', default='alto,bajo')
    a = ap.parse_args()
    P = json.load(open(os.path.join(AQUI, 'config.json')))['pruebas']
    srv = avtest.Servidor(os.path.abspath(a.raiz), 0, None)
    chrome = look_capturas.ChromePaciente(P, set(P['puertos_prohibidos']), os.path.join(tempfile.mkdtemp(prefix='bm134-'), 'chrome.log'))
    ws = avtest.WS('ws://127.0.0.1:%d%s' % (chrome.puerto, chrome.ws_path))
    try:
        cdp = avtest.CDP(ws, lambda m: None)
        for cal in a.calidades.split(','):
            for vista in a.vistas.split(','):
                for tarde in (False, True):
                    tid = cdp.call('Target.createTarget', {'url': 'about:blank'})['targetId']
                    ses = cdp.call('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
                    for me in ('Page.enable', 'Runtime.enable', 'Page.bringToFront'):
                        cdp.call(me, {}, ses)
                    cdp.call('Emulation.setDeviceMetricsOverride', {'width': 1440, 'height': 900, 'deviceScaleFactor': 1, 'mobile': False}, ses)
                    cdp.call('Page.addScriptToEvaluateOnNewDocument', {'source': 'try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}'}, ses)
                    cdp.call('Page.navigate', {'url': 'http://127.0.0.1:%d/index.html?clima=sol&hud=0&calidad=%s' % (srv.puerto, cal)}, ses)
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
                    v = VISTAS[vista]
                    print('·', cal, vista, 'tarde' if tarde else 'dia', avtest.evaluar(cdp, ses, PON_JS % {'v': json.dumps(v), 't': 'true' if tarde else 'false'}, 240), flush=True)
                    cdp.bombear(2.0)
                    img = cdp.call('Page.captureScreenshot', {'format': 'jpeg', 'quality': 85}, ses)['data']
                    open(os.path.join(REPO, 'docs', 'img', 'bm134_ciudad_%s_%s_%s.jpg' % (vista, 'tarde' if tarde else 'dia', cal)), 'wb').write(base64.b64decode(img))
                    cdp.call('Target.closeTarget', {'targetId': tid})
    finally:
        ws.cerrar(); chrome.cerrar(); srv.cerrar()


if __name__ == '__main__':
    sys.exit(main())
