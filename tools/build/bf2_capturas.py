#!/usr/bin/env python3
"""Amazona Verse · capturas del pulido del capítulo 2 (BF2).

    ~/Applications/Blender.app/Contents/Resources/4.2/python/bin/python3.11 -I tools/build/bf2_capturas.py \\
      <build> [--salida docs/img] [--prefijo bf2_antes] [--idioma es|en] [--solo escritorio|movil]

Juega «Un lugar para todos» como un jugador nuevo con las ayudas de G.pruebas (useAt, drain) y, en los momentos clave,
deja la cámara del juego (la que ve el jugador, con el HUD) mirando al objetivo y guarda una foto, en escritorio
(1280×800) y en móvil (390×844, táctil). Escribe <salida>/<prefijo>_<vista>_<escena>.jpg y un JSON con lo que vio:
el paso, si la flecha de guía apunta al objetivo, si hay texto cortado y los errores de consola.
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
from qa_temporada1 import AUDITA_JS  # noqa: E402

AQUI = os.path.dirname(os.path.abspath(__file__))

# Ayudas en la página: P(...) ejecuta la escena con T (G.pruebas), mira hacia (x, z) y espera a que se dibuje
AYUDA = r'''window.__bf2 = window.__bf2 || (() => {
  const G = window.AV.G, T = G.pruebas, S = G.S, sleep = ms => new Promise(r => setTimeout(r, ms));
  // Elige la opción i de la tarjeta de elección (por índice: vale en ES y en EN) y pasa los diálogos
  const op = (...is) => { for (const i of is) { const b = document.querySelectorAll('[id^="ch-"]')[i]; if (b) b.click(); T.drain(); } };
  const mirar = (x, z) => { const y = Math.atan2(S.pos.x - x, S.pos.z - z); window.AV.debug.camYaw(y); S.facing = { x: -Math.sin(y), z: -Math.cos(y) }; G.camara.place(true); };
  const guia = () => { const g = G.misiones.guideTarget && G.misiones.guideTarget(); return g ? [+g.x.toFixed(1), +g.z.toFixed(1)] : null; };
  return { G, T, S, sleep, op, mirar, guia };
})(); 'ok' '''

ESCENA_JS = r'''(async () => { const { G, T, S, sleep, op, mirar, guia } = window.__bf2;
  const gc = document.querySelector('[data-guia=cerrar]'); if (gc && gc.offsetParent) gc.click(); for (const id of ['toast']) { const e = document.getElementById(id); if (e) e.style.visibility = 'hidden'; }
  %s
  await sleep(%d); return JSON.stringify({ paso: S.step, guia: guia(), pos: [+S.pos.x.toFixed(1), +S.pos.z.toFixed(1)], carta: G.ui.cardOpen, dialogo: !!(G.dialogo.activo ? G.dialogo.activo() : G.dialogo.open()) });
})()'''

# (nombre, JS que avanza la partida y encuadra, espera en ms). Las opciones van por índice.
# Orden de la mesa: criterio, restricción, c, c, c, r, c, c, c (ORDEN de content/ep2/pack.js)
ESCENAS = [
    ('inicio', "", 2500),
    ('dialogo', "T.useAt('iguaca');", 1500),
    ('llano', "T.drain(); T.teleport(-12, 15.5); mirar(-12, 10);", 2000),
    ('loma', "T.useAt('sitio_a'); T.drain(); T.teleport(16, 0); mirar(16, -6);", 2000),
    ('claro', "T.useAt('sitio_b'); T.drain(); T.teleport(0, -10.5); mirar(0, -16);", 2000),
    ('abuela', "T.useAt('sitio_c'); T.drain(); T.useAt('sitio_c'); T.drain(); T.useAt('iguaca'); T.drain(); T.teleport(4, 12.5); mirar(8, 9);", 2000),
    ('plano', "T.useAt('abuela');", 1500),
    ('papa', "T.drain(); T.useAt('abuela'); T.drain(); op(0, 0, 0); T.teleport(-6, -3.5); mirar(-10, -7);", 2000),
    ('mesa', "T.useAt('papa'); T.drain(); op(0, 0, 0, 0); T.teleport(5, 5); mirar(5, 1); T.useAt('mesa');", 1800),
    ('obra', "op(0, 1, 0, 0, 0, 1, 0, 0, 0); T.drain(); op(2); T.drain(); T.useAt('obra');", 1800),
    ('nido', "op(0, 0, 0, 0, 0); T.useAt('obra'); T.drain();", 1800),
    ('tormenta', "op(0, 1, 0); T.drain(); T.useAt('obra'); for (let i = 0; i < 40; i++) T.tick(0.05);", 300),
    ('mejora', "T.drain(); T.useAt('obra'); T.drain();", 1500),
    ('fiesta', "op(1); T.drain(); T.useAt('obra'); for (let i = 0; i < 30; i++) T.tick(0.05);", 1500),
    ('final', "T.drain(); G.misiones.seguirExplorando && G.misiones.seguirExplorando(); const C = G.camara.CAM, d0 = C.dist, h0 = C.height; C.dist = 13; C.height = 6; T.teleport(-3, -9); mirar(-3, -16); await sleep(1500); C.dist = d0; C.height = h0;", 200),
]


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('raiz')
    ap.add_argument('--salida', default='docs/img')
    ap.add_argument('--prefijo', default='bf2')
    ap.add_argument('--idioma', default='es')
    ap.add_argument('--solo', default='')
    ap.add_argument('--escenas', default='', help='solo hasta esta escena (y las anteriores)')
    ap.add_argument('--sonda', default='', help='JS que se evalúa tras cada escena y se imprime')
    a = ap.parse_args()
    os.makedirs(a.salida, exist_ok=True)
    P = json.load(open(os.path.join(AQUI, 'config.json')))['pruebas']
    errores = []

    def al_evento(m):
        me, p = m.get('method'), m.get('params') or {}
        if me == 'Runtime.exceptionThrown':
            d = p.get('exceptionDetails') or {}
            errores.append(((d.get('exception') or {}).get('description') or d.get('text') or '')[:300])
        elif me == 'Runtime.consoleAPICalled' and p.get('type') in ('error', 'assert'):
            errores.append(' '.join(str(x.get('value', x.get('description', ''))) for x in p.get('args') or [])[:300])

    vistas = [('escritorio', 1280, 800, False), ('movil', 390, 844, True)]
    res = []
    srv = chrome = ws = None
    try:
        srv = avtest.Servidor(os.path.abspath(a.raiz), 0, None)
        origen = 'http://127.0.0.1:%d' % srv.puerto
        chrome = look_capturas.ChromePaciente(P, set(P['puertos_prohibidos']), os.path.join(tempfile.mkdtemp(prefix='bf2-'), 'chrome.log'))
        ws = avtest.WS('ws://127.0.0.1:%d%s' % (chrome.puerto, chrome.ws_path))
        cdp = avtest.CDP(ws, al_evento)
        for vista, w, h, movil in vistas:
            if a.solo and a.solo != vista:
                continue
            tid = cdp.call('Target.createTarget', {'url': 'about:blank'})['targetId']
            ses = cdp.call('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
            for me in ('Page.enable', 'Runtime.enable'):
                cdp.call(me, {}, ses)
            cdp.call('Emulation.setDeviceMetricsOverride', {'width': w, 'height': h, 'deviceScaleFactor': 1, 'mobile': movil}, ses)
            if movil:
                cdp.call('Emulation.setTouchEmulationEnabled', {'enabled': True, 'maxTouchPoints': 5}, ses)
            cdp.call('Page.addScriptToEvaluateOnNewDocument', {'source': 'try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}'}, ses)
            cdp.call('Page.navigate', {'url': '%s/index.html?qa=1&pack=ep2%s' % (origen, '&lang=en' if a.idioma == 'en' else '')}, ses)
            t0 = time.monotonic()
            while time.monotonic() - t0 < P['espera_listo_s']:
                try:
                    if avtest.evaluar(cdp, ses, '!!(%s)' % P['listo_js'], 10, promesa=False):
                        break
                except (avtest.CDPError, avtest.JSError, TimeoutError):
                    pass
                cdp.bombear(0.5)
            cdp.bombear(2.0)
            print('· %s: %s' % (vista, avtest.evaluar(cdp, ses, P['preparar_js'], 180)), flush=True)
            if a.idioma == 'en':
                avtest.evaluar(cdp, ses, "(async () => { await window.AV.G.idioma.poner('en'); await window.AV.G.idioma.listo; return 'ok'; })()", 60)
            avtest.evaluar(cdp, ses, "(async () => { await new Promise(r => setTimeout(r, 3000)); const G = window.AV.G; G.pruebas.drain(); return 'ok'; })()", 60)
            avtest.evaluar(cdp, ses, AYUDA, 30, promesa=False)
            for nombre, js, espera in ESCENAS[:[e[0] for e in ESCENAS].index(a.escenas) + 1 if a.escenas else None]:
                n0 = len(errores)
                try:
                    r = json.loads(avtest.evaluar(cdp, ses, ESCENA_JS % (js, espera), 120))
                except Exception as e:  # noqa: BLE001  (una escena que falla no para las demás)
                    r = {'excepcion': str(e)[:300]}
                cdp.bombear(0.3)
                try:
                    au = json.loads(avtest.evaluar(cdp, ses, AUDITA_JS, 30, promesa=False))
                except Exception as e:  # noqa: BLE001
                    au = {'problemas': ['auditoría: %s' % e]}
                img = cdp.call('Page.captureScreenshot', {'format': 'jpeg', 'quality': 70}, ses, 60)['data']
                ruta = os.path.join(a.salida, '%s_%s_%s.jpg' % (a.prefijo, vista, nombre))
                open(ruta, 'wb').write(base64.b64decode(img))
                r.update({'vista': vista, 'escena': nombre, 'problemas': au.get('problemas'), 'quest': au.get('quest', '')[:120], 'errores': errores[n0:]})
                res.append(r)
                if a.sonda:
                    print('  sonda:', avtest.evaluar(cdp, ses, a.sonda, 30, promesa=False), flush=True)
                print('· %-10s %-10s %s' % (vista, nombre, json.dumps({k: r.get(k) for k in ('paso', 'guia', 'pos', 'carta', 'problemas', 'errores', 'excepcion')}, ensure_ascii=False)), flush=True)
            try:
                cdp.call('Target.closeTarget', {'targetId': tid})
            except Exception:  # noqa: BLE001
                pass
    finally:
        if ws:
            ws.cerrar()
        if chrome:
            chrome.cerrar()
        if srv:
            srv.cerrar()
    json.dump(res, open(os.path.join(a.salida, '%s.json' % a.prefijo), 'w'), indent=1, ensure_ascii=False)
    return 1 if any(r.get('errores') or r.get('excepcion') for r in res) else 0


if __name__ == '__main__':
    sys.exit(main())
