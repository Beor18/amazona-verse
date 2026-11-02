#!/usr/bin/env python3
"""Amazona Verse · capturas del pulido del capítulo 3 (BF3).

    ~/Applications/Blender.app/Contents/Resources/4.2/python/bin/python3.11 -I tools/build/bf3_capturas.py \\
      <build> [--salida docs/img] [--prefijo bf3_antes] [--idioma es|en] [--solo escritorio|movil]

Juega «Más allá de la bahía» como un jugador nuevo con las ayudas de G.pruebas (useAt, drain) y, en los momentos clave,
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
AYUDA = r'''window.__bf3 = window.__bf3 || (() => {
  const G = window.AV.G, T = G.pruebas, S = G.S, sleep = ms => new Promise(r => setTimeout(r, ms));
  const pick = txt => { const b = [...document.querySelectorAll('[id^="ch-"]')].find(x => x.textContent.includes(txt)); if (b) b.click(); T.drain(); return !!b; };
  const mirar = (x, z) => { const y = Math.atan2(S.pos.x - x, S.pos.z - z); window.AV.debug.camYaw(y); S.facing = { x: -Math.sin(y), z: -Math.cos(y) }; G.camara.place(true); };
  const navegar = seg => { for (let i = 0; i < (seg || 60) * 20 && G.ep3.enViaje() && !G.ui.cardOpen; i++) { T.tick(0.05); T.drain(); } };
  const responder = () => { const txt = document.getElementById('card').textContent, s = ['remo', 'bandera', 'silbido', 'gesto'].find(k => txt.includes({ bandera: 'levanta la bandera', silbido: 'navegante silba.', gesto: 'gesto con el ala', remo: 'levanta el remo' }[k]) || txt.includes({ bandera: 'raises the flag', silbido: 'navigator whistles.', gesto: 'gesture with her wing', remo: 'raises the paddle' }[k])); const o = ['izquierda', 'derecha', 'para'].find(x => S.collected.includes('sen_' + x + '_' + s)); const i = ['izquierda', 'derecha', 'para'].indexOf(o); const b = document.querySelectorAll('[id^="ch-"]')[i]; if (b) b.click(); T.drain(); };
  const guia = () => { const g = G.misiones.guideTarget && G.misiones.guideTarget(); return g ? [+g.x.toFixed(1), +g.z.toFixed(1)] : null; };
  return { G, T, S, sleep, pick, mirar, navegar, responder, guia };
})(); 'ok' '''

ESCENA_JS = r'''(async () => { const { G, T, S, sleep, pick, mirar, navegar, responder, guia } = window.__bf3;
  const gc = document.querySelector('[data-guia=cerrar]'); if (gc && gc.offsetParent) gc.click(); for (const id of ['toast']) { const e = document.getElementById(id); if (e) e.style.visibility = 'hidden'; }
  %s
  await sleep(%d); return JSON.stringify({ paso: S.step, guia: guia(), pos: [+S.pos.x.toFixed(1), +S.pos.z.toFixed(1)], carta: G.ui.cardOpen, dialogo: !!(G.dialogo.activo ? G.dialogo.activo() : G.dialogo.open()) });
})()'''

# (nombre, JS que avanza la partida y encuadra, espera en ms). Los nombres de las opciones van en ES y EN.
ESCENAS = [
    ('inicio', "T.teleport(-6, -10); mirar(-12, -14);", 2500),
    ('papa', "T.useAt('papa'); T.drain(); T.teleport(10.2, -1.4); mirar(15, 0);", 1800),
    ('poza', "T.useAt('mesa'); T.drain(); pick('Lo grande') || pick('Big things'); for (const m of ['piedra', 'tronco', 'bambu', 'tabla', 'coco', 'clavo']) { T.useAt('mat_' + m); T.drain(); } T.teleport(13.4, -7); mirar(18.6, 0);", 2200),
    ('astillero', "T.useAt('fondo_piedra'); T.drain(); T.useAt('fondo_clavo'); T.drain(); T.useAt('astillero'); T.drain(); pick('Bambú') || pick('Bamboo'); T.teleport(10.5, 6.5); mirar(13.5, 8);", 1500),
    ('botadura', "pick('Bejuco') || pick('vine'); pick('Al centro') || pick('In the middle'); pick('No: más rápida') || pick('No: faster'); T.useAt('astillero'); T.drain(); T.teleport(15.2, 4.5); mirar(20, 8);", 1800),
    ('muelle', "T.useAt('astillero'); T.drain(); pick('Cambiar el bejuco') || pick('Swap the vine'); T.useAt('astillero'); T.drain(); T.teleport(8.5, 12.5); mirar(7.6, 16.4);", 2000),
    ('mirador', "T.useAt('navegante'); T.drain(); T.useAt('poste_muelle'); T.drain(); T.useAt('poste_punta'); T.drain(); T.teleport(-17.5, -17.5); mirar(-4, 30);", 2000),
    ('practica', "T.useAt('mirador'); T.drain(); T.useAt('semilla'); T.drain(); T.useAt('navegante'); T.drain(); for (const s of ['Levantar la bandera', 'Un silbido', 'Un gesto']) pick(s) || pick({ 'Levantar la bandera': 'Raise the flag', 'Un silbido': 'A whistle', 'Un gesto': 'A gesture' }[s]); T.useAt('practica'); T.drain(); navegar();", 1800),
    ('bahia', "responder(); navegar(); for (let i = 0; i < 3 && G.ui.cardOpen; i++) { const t = document.getElementById('card').textContent; if (/silbido|whistle/i.test(t) && /viento|wind/i.test(t)) { pick('Cambiar el silbido') || pick('Swap the whistle'); } responder(); navegar(); } pick('Llévalo tú') || pick('You take it'); T.drain(); T.useAt('muelle'); T.drain(); navegar(); responder(); navegar(1.2);", 1500),
    ('llegada', "navegar(); responder(); navegar(); pick('Por la costa') || pick('Along the coast'); navegar(); responder(); navegar(); pick('Atrás') || pick('Back'); navegar(); T.drain(); mirar(-32, 28.5);", 2200),
    ('aldea_vista', "const C = G.camara.CAM, d0 = C.dist, h0 = C.height; C.dist = 15; C.height = 8; T.teleport(-27.5, 31); mirar(-33, 31); await sleep(1500); C.dist = d0; C.height = h0;", 200),
    ('astillero_vista', "G.misiones.seguirExplorando && G.misiones.seguirExplorando(); const C = G.camara.CAM, d0 = C.dist, h0 = C.height; C.dist = 15; C.height = 8; T.teleport(8, 11); mirar(13, 5); await sleep(1500); C.dist = d0; C.height = h0;", 200),
]


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('raiz')
    ap.add_argument('--salida', default='docs/img')
    ap.add_argument('--prefijo', default='bf3')
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
        chrome = look_capturas.ChromePaciente(P, set(P['puertos_prohibidos']), os.path.join(tempfile.mkdtemp(prefix='bf3-'), 'chrome.log'))
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
            cdp.call('Page.navigate', {'url': '%s/index.html?qa=1&pack=ep3%s' % (origen, '&lang=en' if a.idioma == 'en' else '')}, ses)
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
