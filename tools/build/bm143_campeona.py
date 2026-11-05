#!/usr/bin/env python3
"""Amazona Verse · BM143: 3 propuestas de look para la «Campeona de la Explanada» (solo ropa/accesorios existentes).

    python3.11 -I tools/build/bm143_campeona.py --raiz <build>

Guarda docs/img/bm143_campeona_<a|b|c>.jpg. No toca el duelo: aplica el look en vivo a la rival (G.v18combate.estado().ch).
"""
import argparse, base64, json, os, sys, tempfile, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import avtest, look_capturas  # noqa: E402
from tren_capturas import ESPERA_JS  # noqa: E402

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(AQUI, '..', '..'))
LOOKS = {
    'a': {'neck': {'id': 'panuelo', 'color': '#0a50a1', 'style': 'pr'}, 'head': {'id': 'pava', 'color': '#d6403a'},
          'eyes': {'id': 'lentes', 'color': '#d6403a', 'style': 'deportivas'}, 'wings': {'id': 'brazaletes', 'color': '#c9a227'}},
    'b': {'head': {'id': 'gorra', 'color': '#2b2b2b', 'style': 'trucker'}, 'eyes': {'id': 'lentes', 'color': '#c9a227', 'style': 'sol'},
          'torso': {'id': 'camisa', 'color': '#d6403a'}, 'wings': {'id': 'brazaletes', 'color': '#2b2b2b'}, 'feet': {'id': 'botas', 'color': '#2b2b2b', 'style': 'militar'}},
    'c': {'head': {'id': 'casco', 'color': '#2b2b2b', 'style': 'pirata'}, 'neck': {'id': 'panuelo', 'color': '#2f8f4e', 'style': 'camuflaje'},
          'chest': {'id': 'brujula', 'color': '#c9a227'}, 'wings': {'id': 'brazaletes', 'color': '#c9a227'}},
}
PON_JS = r'''(async () => {
  const AV = window.AV, G = AV.G, S = G.S, L = %(l)s;
  const cuadros = n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  G.pausa.set('captura', false);
  if (G.clima && G.clima.fijar) G.clima.fijar('sol', { inmediato: true, forzar: true });
  for (let i = 0; i < 6; i++) {
    try { G.dialogo.cancelarLibre(); } catch (e) {}
    if (G.c && G.c.apertura && G.c.apertura.fin) G.c.apertura.fin();
    ['c1-fade', 'c1-ruptura', 'c1-saltar'].forEach(id => { const e = document.getElementById(id); if (e) e.remove(); });
    await cuadros(10);
  }
  window.dispatchEvent(new Event('pointerdown'));
  for (let i = 0; i < 100 && !G.v18combate; i++) await new Promise(r => setTimeout(r, 300));
  if (!G.v18combate) return 'sin combate';
  const C = G.v18combate.estado(), si = G.v18combate.sitio;
  S.pos.x = si.x + 4 + %(dx)s; S.pos.z = si.z + %(dz)s; S.pos.y = G.terreno.height(S.pos.x, S.pos.z); S.vy = 0;
  const ST = G.mundo && G.mundo.streaming;
  if (ST) { if (ST.alrededor) await ST.alrededor(S.pos.x, S.pos.z); if (ST.terminar) await ST.terminar(); }
  await Promise.resolve(G.vegetacion && G.vegetacion.listo);
  for (let i = 0; i < 60 && !C.ch; i++) await cuadros(10);
  if (!C.ch) return 'sin rival';
  C.ch.applyLook({ species: C.r.especie, accessories: L });
  C.ch.root.rotation.y = %(yaw)s;
  G.camara.yaw = %(cyaw)s; G.camara.place(true); await cuadros(60);
  try { G.actores.player3D.root.visible = false; } catch (e) {}
  await cuadros(60);
  return 'ok ' + C.r.especie + ' ' + Object.keys(L).join(',');
})()'''


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--raiz', required=True)
    ap.add_argument('--dx', default="-0.9")
    ap.add_argument('--dz', default="0")
    ap.add_argument('--yaw', default='-1.57')
    ap.add_argument('--cyaw', default='-1.57')
    ap.add_argument('--looks', default='a,b,c')
    a = ap.parse_args()
    P = json.load(open(os.path.join(AQUI, 'config.json')))['pruebas']
    srv = avtest.Servidor(os.path.abspath(a.raiz), 0, None)
    chrome = look_capturas.ChromePaciente(P, set(P['puertos_prohibidos']), os.path.join(tempfile.mkdtemp(prefix='bm143-'), 'chrome.log'))
    ws = avtest.WS('ws://127.0.0.1:%d%s' % (chrome.puerto, chrome.ws_path))
    try:
        cdp = avtest.CDP(ws, lambda m: None)
        tid = cdp.call('Target.createTarget', {'url': 'about:blank'})['targetId']
        ses = cdp.call('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
        for me in ('Page.enable', 'Runtime.enable', 'Page.bringToFront'):
            cdp.call(me, {}, ses)
        cdp.call('Emulation.setDeviceMetricsOverride', {'width': 1440, 'height': 900, 'deviceScaleFactor': 1, 'mobile': False}, ses)
        cdp.call('Page.addScriptToEvaluateOnNewDocument', {'source': 'try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}'}, ses)
        cdp.call('Page.navigate', {'url': 'http://127.0.0.1:%d/index.html?v18=1&clima=sol&hud=0&calidad=alto' % srv.puerto}, ses)
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
        for k in a.looks.split(','):
            print('·', k, avtest.evaluar(cdp, ses, PON_JS % {'l': json.dumps(LOOKS[k]), 'yaw': a.yaw, 'cyaw': a.cyaw, 'dx': a.dx, 'dz': a.dz}, 240), flush=True)
            cdp.bombear(2.0)
            img = cdp.call('Page.captureScreenshot', {'format': 'jpeg', 'quality': 88}, ses)['data']
            open(os.path.join(REPO, 'docs', 'img', 'bm143_campeona_%s.jpg' % k), 'wb').write(base64.b64decode(img))
    finally:
        ws.cerrar(); chrome.cerrar(); srv.cerrar()


if __name__ == '__main__':
    sys.exit(main())
