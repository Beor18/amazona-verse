#!/usr/bin/env python3
# Amazona Verse · banco de capturas de referencia (G29, AV-0).
# Cada vista de tools/build/mapa_vistas.json en 16:9 y 9:16, y Vittata en el creador
# en tres ángulos. Solo el lienzo: sin interfaz. No toca el mapa.
#
#   python3 -I tools/av/av_ref.py [--salida docs/img] [--fecha 20261028]
import base64, json, os, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'build'))
import avtest

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
VISTAS = json.load(open(os.path.join(REPO, 'tools', 'build', 'mapa_vistas.json')))
VISTAS = {k: v for k, v in VISTAS.items() if not k.startswith('_')}
FORMATOS = (('16x9', 1920, 1080), ('9x16', 1080, 1920))
ANGULOS = (('frente', 0), ('tres_cuartos', 0.7), ('perfil', 1.45))

VISTA_JS = r'''(async () => {
  const V = %s, W = %d, H = %d, AV = window.AV, G = AV.G, R = G.renderer, S = G.S;
  G.pausa.set('captura', true);
  if (G.clima && G.clima.fijar) G.clima.fijar('sol', { inmediato: true, forzar: true });
  if (G.dialogo && G.dialogo.open && G.dialogo.open() && G.pruebas && G.pruebas.drain) G.pruebas.drain();
  const y = V.y != null ? V.y : G.terreno.height(V.x, V.z) + (V.alt || 0);
  S.pos.x = V.x; S.pos.y = y; S.pos.z = V.z; S.vy = 0; G.fisica.MOVE.flying = !!V.vuelo;
  S.facing = { x: -Math.sin(V.yaw || 0), z: -Math.cos(V.yaw || 0) };
  G.camara.yaw = V.yaw || 0;
  const ST = G.mundo && G.mundo.streaming;
  if (ST && ST.alrededor) await ST.alrededor(V.x, V.z);
  if (ST && ST.terminar) await ST.terminar();
  if (G.solidos && G.solidos.terminar) G.solidos.terminar();
  R.renderer.setPixelRatio(1);
  R.renderer.setSize(W, H, false);
  if (R.camera) { R.camera.aspect = W / H; R.camera.updateProjectionMatrix(); }
  G.camara.yaw = V.yaw || 0; G.camara.place(true);
  if (V.cam) { R.camera.position.set(V.cam[0], V.cam[1], V.cam[2]); R.camera.lookAt(V.mirar[0], V.mirar[1], V.mirar[2]); R.camera.updateMatrixWorld(); }
  if (R.drawScene) R.drawScene(R.camera); else R.renderer.render(R.scene, R.camera);
  const c = R.renderer.domElement;
  return JSON.stringify({ jpg: c.toDataURL('image/jpeg', 0.82), w: c.width, h: c.height, errs: (window.__aveErrores || []).length });
})()'''

CREADOR_JS = r'''(async () => {
  const yaw = %s, W = 1080, H = 1080, AV = window.AV, G = AV.G;
  if (G.creador && G.creador.open) await G.creador.open(true);
  const t0 = performance.now();
  while (performance.now() - t0 < 25000) {
    if (window.AVShowcase && AVShowcase.status() === 'ready') break;
    await new Promise(r => setTimeout(r, 100));
  }
  if (!window.AVShowcase || AVShowcase.status() !== 'ready') return JSON.stringify({ error: 'el taller no cargó' });
  const c = document.getElementById('p-stage');
  c.style.width = W + 'px'; c.style.height = H + 'px';
  window.dispatchEvent(new Event('resize'));
  await new Promise(r => setTimeout(r, 200));
  const ch = AVShowcase.character && AVShowcase.character();
  if (ch && ch.play) ch.play('Idle');
  AVShowcase.fijar(yaw);
  await new Promise(r => setTimeout(r, 350));
  return JSON.stringify({ jpg: c.toDataURL('image/jpeg', 0.82), w: c.width, h: c.height, errs: (window.__aveErrores || []).length });
})()'''


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--salida', default=os.path.join(REPO, 'docs', 'img'))
    ap.add_argument('--fecha', default='20261028')
    ap.add_argument('--solo', help='una vista o un ángulo (frente, tres_cuartos, perfil)')
    a = ap.parse_args()
    os.makedirs(a.salida, exist_ok=True)
    cfg = json.load(open(os.path.join(REPO, 'tools', 'build', 'config.json')))
    P = cfg['pruebas']
    errores = []
    srv = avtest.Servidor(REPO, 0, None)
    chrome = avtest.Chrome(P, set(P['puertos_prohibidos']), '/tmp/av-ref-chrome.log')
    try:
        ws = avtest.WS('ws://127.0.0.1:%d%s' % (chrome.puerto, chrome.ws_path))
        cdp = avtest.CDP(ws, lambda m: None)
        tid = cdp.call('Target.createTarget', {'url': 'about:blank'})['targetId']
        ses = cdp.call('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
        for me in ('Page.enable', 'Runtime.enable'):
            cdp.call(me, {}, ses)
        cdp.call('Emulation.setDeviceMetricsOverride', {'width': 1920, 'height': 1080, 'deviceScaleFactor': 1, 'mobile': False}, ses)
        cdp.call('Page.addScriptToEvaluateOnNewDocument', {'source': 'try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}'}, ses)
        cdp.call('Page.navigate', {'url': 'http://127.0.0.1:%d/index.html?clima=sol&calidad=alto' % srv.puerto}, ses)
        t0 = time.monotonic()
        while time.monotonic() - t0 < 150:
            try:
                if avtest.evaluar(cdp, ses, '!!(%s)' % P['listo_js'], 10, promesa=False):
                    break
            except Exception:
                pass
            cdp.bombear(0.4)
        else:
            raise SystemExit('el juego no arrancó')
        prep = avtest.evaluar(cdp, ses, P['preparar_js'], 120, promesa=True)
        print('prep', prep, flush=True)
        if not str(prep).startswith('ok'):
            raise SystemExit('creador: ' + str(prep))
        vistas = VISTAS if not a.solo or a.solo not in dict(ANGULOS) else {}
        if a.solo and a.solo in VISTAS:
            vistas = {a.solo: VISTAS[a.solo]}
        for nombre, ancho, alto in FORMATOS:
            if not vistas:
                break
            cdp.call('Emulation.setDeviceMetricsOverride', {'width': ancho, 'height': alto, 'deviceScaleFactor': 1, 'mobile': False}, ses)
            for vid, V in vistas.items():
                print('vista', nombre, vid, flush=True)
                raw = avtest.evaluar(cdp, ses, VISTA_JS % (json.dumps(V), ancho, alto), 180, promesa=True)
                r = json.loads(raw)
                ruta = os.path.join(a.salida, 'av_ref_%s_%s_%s.jpg' % (vid, nombre, a.fecha))
                open(ruta, 'wb').write(base64.b64decode(r['jpg'].split(',', 1)[1]))
                ok = r.get('w') == ancho and r.get('h') == alto and not r.get('errs')
                print(' ', ruta, r.get('w'), r.get('h'), 'errs', r.get('errs'), os.path.getsize(ruta), flush=True)
                if not ok:
                    errores.append('%s %s %sx%s errs=%s' % (vid, nombre, r.get('w'), r.get('h'), r.get('errs')))
        angulos = ANGULOS if not a.solo or a.solo in dict(ANGULOS) else ()
        if a.solo and a.solo in VISTAS:
            angulos = ()
        for nombre, yaw in angulos:
            print('vittata', nombre, flush=True)
            raw = avtest.evaluar(cdp, ses, CREADOR_JS % json.dumps(yaw), 60, promesa=True)
            r = json.loads(raw)
            if r.get('error'):
                errores.append(nombre + ' ' + r['error'])
                print(' ', r['error'], flush=True)
                continue
            ruta = os.path.join(a.salida, 'av_ref_vittata_%s_%s.jpg' % (nombre, a.fecha))
            open(ruta, 'wb').write(base64.b64decode(r['jpg'].split(',', 1)[1]))
            print(' ', ruta, r.get('w'), r.get('h'), 'errs', r.get('errs'), os.path.getsize(ruta), flush=True)
            if r.get('errs'):
                errores.append(nombre + ' errs ' + str(r.get('errs')))
        if errores:
            print('FALLOS', errores, flush=True)
            raise SystemExit(1)
        print('banco listo', flush=True)
    finally:
        chrome.cerrar()
        srv.cerrar()

if __name__ == '__main__':
    main()
