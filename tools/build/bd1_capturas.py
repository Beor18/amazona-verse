#!/usr/bin/env python3
"""Amazona Verse · capturas del estándar visual (G16 / BD1).

    AV_CHROME=/usr/local/bin/amazona-chrome AV_PYTHON=python3.12 \\
      python3 tools/build/bd1_capturas.py <build o sitio/juego> --salida docs/img --prefijo bd1_antes

Una foto por capítulo, en escritorio (1280×800) y en móvil (375×812), al arrancar,
con el HUD oculto y la cámara un poco alta. El JSON guarda cielo, niebla y look.
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
ESPERA = 'const sleep = ms => new Promise(r => setTimeout(r, ms));'

FOTO_JS = r'''(async () => { %s
  const G = window.AV.G, R = G.renderer, CAM = G.camara;
  const fade = document.getElementById('c1-fade'); if (fade) fade.remove();
  const rup = document.getElementById('c1-ruptura'); if (rup) rup.remove();
  for (const id of ['hud', 'quest', 'toast', 'keys', 'bocadillos']) { const e = document.getElementById(id); if (e) e.style.visibility = 'hidden'; }
  const dlg = document.getElementById('dialog'); if (dlg && dlg.close) dlg.close();
  if (CAM) { CAM.dist = 22; CAM.height = 9; CAM.look = 1.6; CAM.yaw = 0.7; CAM.place(true); }
  await sleep(700);
  if (R.drawScene) R.drawScene(R.camera);
  const cielo = (G.pack.mundo && G.pack.mundo.cielo) || {}, fog = R.scene.fog;
  const sky = R.sky && R.sky.material.uniforms;
  const hex = c => (c && c.getHexString) ? '#' + c.getHexString() : '';
  return JSON.stringify({
    pack: G.pack.id, atmos: !!R.ATMOS, look: (window.AV.look && (window.AV.look.actual || 'fabrica')) || 'sin',
    exp: R.renderer.toneMappingExposure, cenit: cielo.cenit || '', horizonte: cielo.color || '',
    niebla: cielo.niebla || null, permiso: cielo.permiso || '',
    fogFar: fog ? fog.far : null, skyCenit: sky ? hex(sky.uCenit.value) : '',
    solInt: R.sun ? R.sun.intensity : null
  });
})()''' % ESPERA


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('raiz')
    ap.add_argument('--salida', default='docs/img')
    ap.add_argument('--prefijo', default='bd1_')
    ap.add_argument('--packs', default='cap1,ep2,ep3,ep4,ep5,ep6')
    a = ap.parse_args()
    os.makedirs(a.salida, exist_ok=True)
    cfg = json.load(open(os.path.join(AQUI, 'config.json')))
    P = cfg['pruebas']
    medidas = []
    srv = chrome = ws = None
    try:
        srv = avtest.Servidor(os.path.abspath(a.raiz), 0, None)
        origen = 'http://127.0.0.1:%d' % srv.puerto
        chrome = look_capturas.ChromePaciente(P, set(P['puertos_prohibidos']), os.path.join(tempfile.mkdtemp(prefix='bd1-'), 'chrome.log'))
        ws = avtest.WS('ws://127.0.0.1:%d%s' % (chrome.puerto, chrome.ws_path))
        cdp = avtest.CDP(ws, lambda m: None)
        print('· servidor %s · Chrome %s' % (origen, chrome.version), flush=True)
        vistas = [('escritorio', 1280, 800, False), ('movil', 375, 812, True)]
        for pack in [x for x in a.packs.split(',') if x]:
            for nombre, w, h, movil in vistas:
                tid = cdp.call('Target.createTarget', {'url': 'about:blank'})['targetId']
                ses = cdp.call('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
                for me in ('Page.enable', 'Runtime.enable'):
                    cdp.call(me, {}, ses)
                cdp.call('Emulation.setDeviceMetricsOverride', {
                    'width': w, 'height': h, 'deviceScaleFactor': 2 if movil else 1, 'mobile': movil,
                }, ses)
                cdp.call('Page.addScriptToEvaluateOnNewDocument', {'source': 'try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}'}, ses)
                cdp.call('Page.navigate', {'url': '%s/index.html?qa=1%s' % (origen, '' if pack == 'cap1' else '&pack=' + pack)}, ses)
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
                etiqueta = '%s_%s_%s' % (a.prefijo.rstrip('_'), pack, nombre)
                if not listo:
                    print('· %s no arrancó' % etiqueta, flush=True)
                    medidas.append({'id': etiqueta, 'error': 'no arrancó'})
                    continue
                try:
                    avtest.evaluar(cdp, ses, P['preparar_js'], 180)
                except (avtest.CDPError, avtest.JSError, TimeoutError) as e:
                    print('· %s preparar: %s' % (etiqueta, e), flush=True)
                try:
                    info = json.loads(avtest.evaluar(cdp, ses, FOTO_JS, 30))
                except (avtest.CDPError, avtest.JSError, TimeoutError, ValueError) as e:
                    info = {'error': str(e)[:200]}
                img = cdp.call('Page.captureScreenshot', {'format': 'jpeg', 'quality': 70}, ses, 60)['data']
                ruta = os.path.join(a.salida, etiqueta + '.jpg')
                open(ruta, 'wb').write(base64.b64decode(img))
                info['id'] = etiqueta
                info['archivo'] = os.path.basename(ruta)
                medidas.append(info)
                print('· %s atmos=%s look=%s niebla=%s' % (etiqueta, info.get('atmos'), info.get('look'), info.get('niebla')), flush=True)
                try:
                    cdp.call('Target.closeTarget', {'targetId': tid})
                except (avtest.CDPError, TimeoutError):
                    pass
        try:
            cdp.call('Browser.close', {}, None, 5)
        except (avtest.CDPError, TimeoutError):
            pass
    finally:
        if ws:
            ws.cerrar()
        if chrome:
            chrome.cerrar()
        if srv:
            srv.cerrar()
    json.dump(medidas, open(os.path.join(a.salida, a.prefijo + 'medidas.json'), 'w'), indent=1, ensure_ascii=False)
    print('· %d capturas' % len(medidas), flush=True)
    return 0 if medidas and all('error' not in m for m in medidas) else 1


if __name__ == '__main__':
    sys.exit(main())
