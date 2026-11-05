#!/usr/bin/env python3
"""Amazona Verse · BM152: retratos 256×256 con fondo transparente de las cotorras de la demo.

    python3.11 -I tools/build/bm152_retratos.py --raiz <build>

Crea un personaje con AVCharacter.create(), le aplica la piel (applyLook({species})), lo pinta de frente en una escena
aparte con un renderer con alfa y guarda assets/retratos/v18/<especie>.png. Hoja de contacto: docs/img/v18/retratos.jpg.
"""
import argparse, base64, json, os, sys, tempfile, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import avtest, look_capturas  # noqa: E402

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(AQUI, '..', '..'))
ESPECIES = ['agilis', 'farinosa', 'barbadensis', 'xantholora', 'arausiaca']
JS = r'''(async () => {
  for (let i = 0; i < 100 && !(window.AVCharacter && window.THREE); i++) await new Promise(r => setTimeout(r, 300));
  if (!window.AVCharacter) throw new Error('sin AVCharacter; THREE=' + typeof window.THREE + ' AV=' + Object.keys(window.AV || {}).slice(0, 8));
  const T = window.THREE, ch = await window.AVCharacter.create();
  ch.applyLook({ species: %(e)s, accessories: {} });
  const ok = await window.AVE.pieles.aplicar(ch, %(e)s); ch.play('Idle');
  if (ch.mixer) ch.mixer.update(0.3);
  const sc = new T.Scene(), cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const r = new T.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(256, 256, false); r.setClearColor(0x000000, 0);
  if (T.sRGBEncoding) r.outputEncoding = T.sRGBEncoding;
  sc.add(new T.HemisphereLight(0xffffff, 0x8a9a7a, 1.1));
  const d = new T.DirectionalLight(0xffffff, 1.2); d.position.set(1.5, 2.5, 3); sc.add(d);
  sc.add(ch.root); ch.root.rotation.set(0, %(yaw)s, 0); ch.root.updateMatrixWorld(true);
  const b = new T.Box3().setFromObject(ch.root), s = b.getSize(new T.Vector3()), c = b.getCenter(new T.Vector3());
  const cam = new T.PerspectiveCamera(22, 1, 0.01, 100);
  const top = b.max.y, h = s.y * %(frac)s, cy = top - h / 2, dist = (h / 2) / Math.tan(11 * Math.PI / 180) * 1.12;
  cam.position.set(c.x, cy, c.z + dist); cam.lookAt(c.x, cy, c.z);
  r.render(sc, cam);
  return { ok, url: cv.toDataURL('image/png'), alto: s.y, ancho: s.x };
})()'''


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--raiz', required=True)
    ap.add_argument('--yaw', default='0')
    ap.add_argument('--frac', default='0.45')
    ap.add_argument('--especies', default=','.join(ESPECIES))
    a = ap.parse_args()
    P = json.load(open(os.path.join(AQUI, 'config.json')))['pruebas']
    srv = avtest.Servidor(os.path.abspath(a.raiz if os.path.exists(os.path.join(a.raiz, 'index.html')) else os.path.join(a.raiz, 'site')), 0, None)
    chrome = look_capturas.ChromePaciente(P, set(P['puertos_prohibidos']), os.path.join(tempfile.mkdtemp(prefix='bm152-'), 'chrome.log'))
    ws = avtest.WS('ws://127.0.0.1:%d%s' % (chrome.puerto, chrome.ws_path))
    out = os.path.join(REPO, 'assets', 'retratos', 'v18'); os.makedirs(out, exist_ok=True)
    try:
        cdp = avtest.CDP(ws, lambda m: None)
        tid = cdp.call('Target.createTarget', {'url': 'about:blank'})['targetId']
        ses = cdp.call('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
        for me in ('Page.enable', 'Runtime.enable', 'Page.bringToFront'):
            cdp.call(me, {}, ses)
        cdp.call('Page.navigate', {'url': 'http://127.0.0.1:%d/index.html?v18=1&clima=sol&hud=0' % srv.puerto}, ses)
        t0 = time.monotonic()
        while time.monotonic() - t0 < P['espera_listo_s']:
            try:
                if avtest.evaluar(cdp, ses, '!!(%s)' % P['listo_js'], 10, promesa=False):
                    break
            except (avtest.CDPError, avtest.JSError, TimeoutError):
                pass
            cdp.bombear(0.5)
        for e in a.especies.split(','):
            r = avtest.evaluar(cdp, ses, JS % {'e': json.dumps(e), 'yaw': a.yaw, 'frac': a.frac}, 120)
            open(os.path.join(out, e + '.png'), 'wb').write(base64.b64decode(r['url'].split(',', 1)[1]))
            print('·', e, r['ok'], round(r['alto'], 2), round(r['ancho'], 2), flush=True)
    finally:
        ws.cerrar(); chrome.cerrar(); srv.cerrar()


if __name__ == '__main__':
    sys.exit(main())
