#!/usr/bin/env python3
"""Amazona Verse · capturas del pulido del capítulo 6 (BF6).

    AV_CHROME=… python3.11 -I tools/build/bf6_capturas.py <build o raíz> --salida docs/img --prefijo bf6_antes

Una foto por momento clave del capítulo 6 (llegada, muelles, mesa, puente, percha, tabla larga, grupos, asientos
y pacto), en escritorio (1280×800) y móvil (375×812), en ES y EN. La partida se arma con
el estado del capítulo (S.collected y S.step) y se recarga para que el pack lo dibuje; el HUD queda a la vista.
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

VIS = ['mira', 'roca', 'marea', 'nudo', 'eco', 'brote']
CON = ['conocido_' + v for v in VIS]
M1 = CON + ['obs_sombra', 'obs_rio', 'pareja_mira+brote', 'pareja_roca+eco', 'pareja_marea+nudo']
EV1 = ['GuestsArrived', 'CardsFilled']
PLAN = {'asig': {'cargar': 'roca', 'sostener': 'nudo', 'atar': 'brote', 'revisar': 'mira', 'avisar': 'aprendiz'}, 'pruebas': 3, 'atasco': 'revisar'}
M2 = M1 + ['criterios', 'plan_ensena', 'levantada', 'tabla_dos']
EV2 = EV1 + ['PlanStuck', 'PlanMade', 'RaisedTogether']
M3 = M2 + ['grupos_intro', 'escucha_alta', 'escucha_baja', 'comparten', 'propuesta_mezcla', 'forma_4x9']
EV3 = EV2 + ['GroupsListened', 'CircleFormed']
# id, paso, collected, misiones, eventos, jugador (x, z), cámara (yaw, dist, alto), interacción a usar (opcional), plan
ESCENAS = [
    ('inicio', 0, [], [], [], (-16, -16), (0.6, 8, 3.5), None, None),
    ('muelle', 1, ['conocido_mira'], [], ['GuestsArrived'], (11, -8), (-1.2, 8, 3.5), None, None),
    ('mesa', 3, CON + ['obs_sombra', 'obs_rio'], [], ['GuestsArrived'], (-4, 3), (0.9, 7, 3.2), None, None),
    ('puente', 5, M1 + ['criterios'], ['conocer'], EV1, (12, -1), (-1.4, 9, 4), None, None),
    ('percha', 6, M1 + ['criterios', 'plan_ensena'], ['conocer'], EV1 + ['PlanStuck', 'PlanMade'], (16, 3), (-2.0, 9, 4.5), None, PLAN),
    ('tabla', 7, M1 + ['criterios', 'plan_ensena', 'levantada'], ['conocer'], EV1 + ['PlanStuck', 'PlanMade'], (9, -1), (-1.2, 8, 4), None, PLAN),
    ('grupos', 8, M2, ['conocer', 'obra'], EV2, (0, 5), (3.1, 9, 4), None, PLAN),
    ('sentar', 10, M3 + ['sentado_mira', 'sentado_alta'], ['conocer', 'obra'], EV3, (0, -9), (0.0, 12, 7), None, PLAN),
    ('pacto', 11, M3 + ['sentado_' + k for k in VIS + ['alta', 'baja']], ['conocer', 'obra'], EV3, (0, -5), (0.0, 10, 5), None, PLAN),
]

FOTO_JS = r'''(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const AV = window.AV, G = AV.G, S = G.S, CAM = G.camara, R = G.renderer;
  const E = %s, lang = %s;
  for (const id of ['c1-fade', 'c1-ruptura']) { const e = document.getElementById(id); if (e) e.remove(); }
  while (G.dialogo.open && G.dialogo.open()) G.dialogo.next();
  if (G.ui.hideCard) G.ui.hideCard();
  S.collected = E.collected.slice(); S.step = E.paso; S.complete = false;
  S.missions = {}; for (const m of E.misiones) S.missions[m] = true; S.plan = E.plan;
  S.events = (S.events || []).filter(e => E.eventos.includes(e.key) || e.key === "PlayerCharacterCreated");
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
    ap.add_argument('--prefijo', default='bf6_')
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
        chrome = look_capturas.ChromePaciente(P, set(P['puertos_prohibidos']), os.path.join(tempfile.mkdtemp(prefix="bf6-"), 'chrome.log'))
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
            cdp.call('Page.navigate', {'url': '%s/index.html?qa=1&pack=ep6' % origen}, ses)
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
                for eid, paso, col, mis, evs, pos, cam, usar, plan in escenas:
                    etiqueta = '%s_%s_%s_%s' % (a.prefijo.rstrip('_'), eid, nombre, lang)
                    E = {'paso': paso, 'collected': col, 'misiones': mis, 'eventos': evs, 'pos': pos, 'cam': cam, 'usar': usar, 'plan': plan}
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
