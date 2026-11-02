#!/usr/bin/env python3
"""Amazona Verse · capturas del pulido del capítulo 4 (BF4).

    AV_CHROME=… python3.11 -I tools/build/bf4_capturas.py <build o raíz> --salida docs/img --prefijo bf4_antes

Una foto por momento clave del capítulo 4 (llegada, la orilla, las voces, la mesa, lo construido de cada opción y el
cruce), en escritorio (1280×800) y móvil (375×812), en ES y EN. La partida se arma con el estado del capítulo
(S.collected y S.step) y se recarga para que el pack dibuje la obra; el HUD queda a la vista para ver la guía y los textos.
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

AQUI = os.path.dirname(os.path.abspath(__file__))

OBS = ['obs_a', 'obs_b', 'obs_c', 'obs_bosque']
VOC = ['voz_abuela', 'voz_papa', 'voz_navegante', 'voz_iguaca']
M2 = OBS + VOC + ['bal_abuela', 'bal_papa', 'bal_navegante', 'bal_iguaca', 'bal_vista', 'frase_0']
PRU = ['prueba_a', 'prueba_b', 'prueba_c']
# id, paso, collected, misiones, eventos, jugador (x, z), cámara (yaw, dist, alto), diálogo (interacción a usar, opcional)
ESCENAS = [
    ('inicio', 0, [], [], [], (-6, 4.5), (-0.6, 8, 3.5), None),
    ('orilla', 1, ['obs_c'], [], ['ShoreLooked'], (0.5, -13), (-1.9, 11, 5), None),
    ('voces', 3, OBS + ['voz_abuela'], ['orilla'], ['ShoreSurveyed'], (-1, 3.5), (-1.3, 9, 4), None),
    ('mesa', 5, M2 + ['prueba_a'], ['orilla', 'voces'], ['ShoreSurveyed', 'VoicesHeard', 'TradeoffSeen'], (-5, 0.5), (0.5, 7, 3.5), None),
    ('obra_a', 8, M2 + PRU + ['opcion_a', 'cuidado_cajas', 'palabra_0', 'construido'], ['orilla', 'voces', 'acuerdo'],
     ['ShoreSurveyed', 'VoicesHeard', 'TradeoffSeen', 'ModelTested', 'AgreementMade', 'CareChosen', 'ProjectBuilt'], (2.9, -14.8), (-0.574, 9, 4.5), None),
    ('obra_b', 8, M2 + PRU + ['opcion_b', 'cuidado_descansos', 'palabra_0', 'construido'], ['orilla', 'voces', 'acuerdo'],
     ['ShoreSurveyed', 'VoicesHeard', 'TradeoffSeen', 'ModelTested', 'AgreementMade', 'CareChosen', 'ProjectBuilt'], (2.9, 11.2), (-2.567, 9, 4.5), None),
    ('obra_c', 8, M2 + PRU + ['opcion_c', 'cuidado_turnos', 'palabra_0', 'construido'], ['orilla', 'voces', 'acuerdo'],
     ['ShoreSurveyed', 'VoicesHeard', 'TradeoffSeen', 'ModelTested', 'AgreementMade', 'CareChosen', 'ProjectBuilt'], (2.9, 0.2), (-0.574, 9, 4.5), None),
    ('muelle', 3, OBS + ['voz_abuela'], ['orilla'], ['ShoreSurveyed'], (2.5, 1.5), (3.6, 8, 3.5), None),
    ('dialogo', 3, OBS, ['orilla'], ['ShoreSurveyed'], (-1, -4), (-0.6, 8, 3.5), 'abuela'),
]

FOTO_JS = r'''(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const AV = window.AV, G = AV.G, S = G.S, CAM = G.camara, R = G.renderer;
  const E = %s, lang = %s;
  for (const id of ['c1-fade', 'c1-ruptura']) { const e = document.getElementById(id); if (e) e.remove(); }
  while (G.dialogo.open && G.dialogo.open()) G.dialogo.next();
  if (G.ui.hideCard) G.ui.hideCard();
  S.collected = E.collected.slice(); S.step = E.paso; S.complete = false;
  S.missions = {}; for (const m of E.misiones) S.missions[m] = true;
  for (const ev of E.eventos) if (!G.eventos.had(ev)) G.eventos.log(ev);
  G.guardado.save(true); G.guardado.load(true);
  if (G.aula && G.aula.aj) G.aula.aj.idioma = lang;
  if (G.idioma && G.idioma.poner) await G.idioma.poner(lang);
  if (G.ui.toast) { const t = document.getElementById('toast'); if (t) t.hidden = true; }
  while (G.dialogo.open && G.dialogo.open()) G.dialogo.next();
  AV.teleport(E.pos[0], E.pos[1]); AV.tick(0.3);
  if (E.usar) { const it = G.interaccion.find(E.usar); AV.teleport(it.x + 0.9, it.z); AV.tick(0.1); G.interaccion.action(); }
  const gp = document.getElementById('guia-panel'); if (gp) gp.hidden = true;
  if (CAM) { CAM.yaw = E.cam[0]; CAM.CAM.dist = E.cam[1]; CAM.CAM.height = E.cam[2]; CAM.place(true); }
  for (let i = 0; i < 20; i++) { await sleep(60); }
  if (!E.usar) while (G.dialogo.open && G.dialogo.open()) G.dialogo.next();
  { const gp2 = document.getElementById('guia-panel'); if (gp2) gp2.hidden = true; }
  await sleep(200);
  if (R.drawScene) R.drawScene(R.camera);
  const it = G.interaccion.nearest(), g = G.misiones.guideTarget && G.misiones.guideTarget();
  return JSON.stringify({ paso: S.step, cerca: it && it.id, guia: g ? [Math.round(g.x * 10) / 10, Math.round(g.z * 10) / 10] : null,
    quest: (document.getElementById('quest') || {}).textContent || '' });
})()'''


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('raiz')
    ap.add_argument('--salida', default='docs/img')
    ap.add_argument('--prefijo', default='bf4_')
    ap.add_argument('--escenas', default='')
    ap.add_argument('--idiomas', default='es,en')
    ap.add_argument('--vistas', default='escritorio,movil')
    a = ap.parse_args()
    os.makedirs(a.salida, exist_ok=True)
    P = json.load(open(os.path.join(AQUI, 'config.json')))['pruebas']
    quiero = set(x for x in a.escenas.split(',') if x)
    escenas = [e for e in ESCENAS if not quiero or e[0] in quiero]
    vistas = [v for v in [('escritorio', 1280, 800, False), ('movil', 375, 812, True)] if v[0] in a.vistas.split(',')]
    medidas = []
    srv = chrome = ws = None
    try:
        srv = avtest.Servidor(os.path.abspath(a.raiz), 0, None)
        origen = 'http://127.0.0.1:%d' % srv.puerto
        chrome = look_capturas.ChromePaciente(P, set(P['puertos_prohibidos']), os.path.join(tempfile.mkdtemp(prefix='bf4-'), 'chrome.log'))
        ws = avtest.WS('ws://127.0.0.1:%d%s' % (chrome.puerto, chrome.ws_path))
        cdp = avtest.CDP(ws, lambda m: None)
        print('· servidor %s · Chrome %s' % (origen, chrome.version), flush=True)
        for nombre, w, h, movil in vistas:
            tid = cdp.call('Target.createTarget', {'url': 'about:blank'})['targetId']
            ses = cdp.call('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
            for me in ('Page.enable', 'Runtime.enable'):
                cdp.call(me, {}, ses)
            cdp.call('Emulation.setDeviceMetricsOverride', {'width': w, 'height': h, 'deviceScaleFactor': 2 if movil else 1, 'mobile': movil}, ses)
            cdp.call('Page.addScriptToEvaluateOnNewDocument', {'source': 'try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}'}, ses)
            cdp.call('Page.navigate', {'url': '%s/index.html?qa=1&pack=ep4' % origen}, ses)
            t0 = time.monotonic()
            listo = False
            while time.monotonic() - t0 < P['espera_listo_s']:
                try:
                    if avtest.evaluar(cdp, ses, '!!(%s)' % P['listo_js'], 10, promesa=False):
                        listo = True
                        break
                except (avtest.CDPError, avtest.JSError, TimeoutError):
                    pass
                cdp.bombear(0.4)
            if not listo:
                print('· %s no arrancó' % nombre, flush=True)
                medidas.append({'id': nombre, 'error': 'no arrancó'})
                continue
            try:
                avtest.evaluar(cdp, ses, P['preparar_js'], 180)
            except (avtest.CDPError, avtest.JSError, TimeoutError) as e:
                print('· %s preparar: %s' % (nombre, e), flush=True)
            for lang in [x for x in a.idiomas.split(',') if x]:
                for eid, paso, col, mis, evs, pos, cam, usar in escenas:
                    etiqueta = '%s_%s_%s_%s' % (a.prefijo.rstrip('_'), eid, nombre, lang)
                    E = {'paso': paso, 'collected': col, 'misiones': mis, 'eventos': evs, 'pos': pos, 'cam': cam, 'usar': usar}
                    try:
                        info = json.loads(avtest.evaluar(cdp, ses, FOTO_JS % (json.dumps(E), json.dumps(lang)), 60))
                    except (avtest.CDPError, avtest.JSError, TimeoutError, ValueError) as e:
                        info = {'error': str(e)[:300]}
                    img = cdp.call('Page.captureScreenshot', {'format': 'jpeg', 'quality': 70}, ses, 60)['data']
                    ruta = os.path.join(a.salida, etiqueta + '.jpg')
                    open(ruta, 'wb').write(base64.b64decode(img))
                    info['id'] = etiqueta
                    medidas.append(info)
                    print('· %s %s' % (etiqueta, json.dumps(info, ensure_ascii=False)[:200]), flush=True)
            try:
                cdp.call('Target.closeTarget', {'targetId': tid})
            except (avtest.CDPError, TimeoutError):
                pass
    finally:
        if ws:
            ws.cerrar()
        if chrome:
            chrome.cerrar()
        if srv:
            srv.cerrar()
    json.dump(medidas, open(os.path.join(a.salida, a.prefijo.rstrip('_') + '_medidas.json'), 'w'), indent=1, ensure_ascii=False)
    print('· %d capturas' % len(medidas), flush=True)
    return 0 if medidas and all('error' not in m for m in medidas) else 1


if __name__ == '__main__':
    sys.exit(main())
