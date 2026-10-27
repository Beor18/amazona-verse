#!/usr/bin/env python3
"""Amazona Verse · ronda de QA de la temporada 1 en escritorio (BC1; informe en docs/equipo/QA_TEMPORADA1.md).

    python3.11 -I tools/build/qa_temporada1.py <build o repo> [--packs cap1,ep2,ep3,ep4,ep5,ep6] [--modos] [--salida DIR]
                                               [--ancho 1366] [--alto 768]

Sirve la carpeta con el servidor y el Chrome sin interfaz de avtest.py y juega como un jugador nuevo (origen limpio):
- por pack: portada, flujo de jugador nuevo, apertura (6 s y 40 s), pausa y el capítulo de punta a punta con su prueba
  (cap1: misiones por la API de pruebas; ep2…ep6: AV.epNTest), y el panel final;
- con --modos (en cap1): Diario, Retos y sus 4 retos, Flight, Maze, River Rush, Tren, criadero, récords, «Cambiar de
  juego» y la portada en inglés.
En cada escena guarda una captura JPG y una auditoría del DOM (botones fuera de pantalla o que se pisan, texto cortado,
scroll horizontal, «undefined», «NaN», «[object», «[KELVIN]» o claves sin traducir a la vista) y los errores de consola.
Escribe <salida>/qa.json. Salida: 0 sin errores de consola ni escenas que fallen; 1 si los hay.
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

AUDITA_JS = r'''(() => { const W = innerWidth, H = innerHeight, out = [];
  const vis = e => { if (e.closest('[hidden]')) return false; for (let p = e; p; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; } const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  const lbl = e => ((e.innerText || e.getAttribute('aria-label') || e.id || '').trim().replace(/\s+/g, ' ').slice(0, 40));
  const enScroll = e => { for (let p = e.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll)/.test(s.overflowY + s.overflowX) && (p.scrollHeight > p.clientHeight + 1 || p.scrollWidth > p.clientWidth + 1)) return true; } return false; };
  const els = [...document.querySelectorAll('button, a, h1, h2, h3, p, label, [role=button], #quest')].filter(vis);
  for (const e of els) { const r = e.getBoundingClientRect();
    if ((r.right > W + 1 || r.bottom > H + 1 || r.left < -1 || r.top < -1) && !enScroll(e)) out.push('fuera de pantalla: ' + e.tagName + ' «' + lbl(e) + '» ' + [r.left, r.top, r.right, r.bottom].map(Math.round).join(','));
    if (e.tagName === 'BUTTON' && getComputedStyle(e).overflow !== 'visible' && (e.scrollWidth > e.clientWidth + 2 || e.scrollHeight > e.clientHeight + 2)) out.push('texto cortado: «' + lbl(e) + '»'); }
  if (document.documentElement.scrollWidth > W + 1) out.push('scroll horizontal: ' + document.documentElement.scrollWidth);
  const arriba = (b, r) => { const t = document.elementFromPoint(Math.min(W - 1, Math.max(0, (r.left + r.right) / 2)), Math.min(H - 1, Math.max(0, (r.top + r.bottom) / 2))); return t && (b.contains(t) || t.contains(b)); };
  const bs = els.filter(e => e.tagName === 'BUTTON').map(b => [b, b.getBoundingClientRect()]).filter(([b, r]) => arriba(b, r)); // solo los que se ven (no los de un panel tapado)
  for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) { const [a, ra] = bs[i], [b, rb] = bs[j]; if (a.contains(b) || b.contains(a)) continue;
    const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (ix > 4 && iy > 4) { const t = document.elementFromPoint((Math.max(ra.left, rb.left) + Math.min(ra.right, rb.right)) / 2, (Math.max(ra.top, rb.top) + Math.min(ra.bottom, rb.bottom)) / 2); if (t && (a.contains(t) || b.contains(t))) out.push('se pisan: «' + lbl(a) + '» y «' + lbl(b) + '»'); } }
  const txt = document.body.innerText; for (const m of txt.match(/[^\n]{0,30}(undefined|NaN|\[object|\[KELVIN\]|\{\{|\b[a-z]+\.[a-z]+\.[a-z]+\b)[^\n]{0,20}/g) || []) out.push('texto raro: «' + m.trim() + '»');
  return JSON.stringify({ problemas: [...new Set(out)].slice(0, 30), quest: (document.getElementById('quest') || {}).innerText || '', dialogo: !!document.querySelector('#dialog[open], #dialog:popover-open') }); })()'''

INICIO_JS = '''(async () => { %s const G = window.AV.G; await (G.mundo && G.mundo.listo); await sleep(%d); return 'ok'; })()'''

PAUSA_JS = '''(async () => { %s const p = document.getElementById('pause'); p.showPopover(); await sleep(600); return p.matches(':popover-open') ? 'ok pausa' : 'la pausa no abrió'; })()''' % ESPERA
CERRAR_PAUSA_JS = '''(() => { const p = document.getElementById('pause'); if (p.matches(':popover-open')) p.hidePopover(); return 'ok'; })()'''

# Capítulo de punta a punta con la prueba del pack (la misma lógica que juega un alumno, sin teclas)
FIN_JS = {
    'cap1': '''(async () => { %s const AV = window.AV; const r = await AV.missionTest(); await sleep(1500); const mal = ((r && r.results) || []).filter(x => !x.ok).map(x => x.name); return 'ok missionTest ' + (r ? r.passed + '/' + r.total : '?') + (mal.length ? ' · falla: ' + mal.join(' | ') : ''); })()''' % ESPERA,
}
for _p in ('ep2', 'ep3', 'ep4', 'ep5', 'ep6'):
    FIN_JS[_p] = '''(async () => { %s const AV = window.AV; const f = AV.%sTest; if (!f) return 'no hay AV.%sTest'; const r = await f(); await sleep(1500); const mal = ((r && r.results) || []).filter(x => !x.ok).map(x => x.name + (x.extra ? ' (' + x.extra + ')' : '')); return 'ok %sTest ' + (r ? r.passed + '/' + r.total : '?') + (mal.length ? ' · falla: ' + mal.join(' | ') : ''); })()''' % (ESPERA, _p, _p, _p)

def _modo(abrir, salir, espera=6000, tecla=None):
    t = ("dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space' })); await sleep(120); dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space' }));" if tecla else '')
    return ('''(async () => { %s const AV = window.AV, G = AV.G; try { %s } catch (e) { return 'no abrió: ' + e.message; } await sleep(%d); %s await sleep(1500); return 'ok'; })()''' % (ESPERA, abrir, espera, t), salir)

MODOS = [
    ('diario', '''(async () => { %s document.getElementById('b-diary').click(); await sleep(1200); return 'ok'; })()''' % ESPERA,
     "(() => { const d = document.querySelector('#diary, #diario'); if (d && d.close) d.close(); if (d && d.hidePopover && d.matches(':popover-open')) d.hidePopover(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })); return 'ok'; })()"),
    ('retos_menu', '''(async () => { %s await window.AV.retos(); await sleep(1500); return document.querySelector('#retos:not([hidden])') ? 'ok' : 'Retos no abrió'; })()''' % ESPERA,
     "(() => { const R = window.AV.G.retosApi; if (R && R.activo) R.salir(); const b = document.querySelector('#retos:not([hidden]) [data-salir]'); if (b) b.click(); return 'ok'; })()"),
]
for _r in ('carrera', 'tormenta', 'banquete', 'rio'):
    MODOS.append(('reto_' + _r, '''(async () => { %s const G = window.AV.G; await window.AV.retos(); const R = G.retosApi; R.jugar('%s'); if (!await espera(() => R.activo && R.reto === '%s' && R.fase !== 'menu', 20000)) return 'no arrancó: ' + R.reto + ' ' + R.fase; dispatchEvent(new KeyboardEvent('keydown', { key: 'w', code: 'KeyW' })); await sleep(7000); dispatchEvent(new KeyboardEvent('keyup', { key: 'w', code: 'KeyW' })); return 'ok ' + R.fase; })()''' % (ESPERA, _r, _r),
                  "(() => { const R = window.AV.G.retosApi; if (R && R.activo) R.salir(); const b = document.querySelector('#retos:not([hidden]) [data-salir]'); if (b) b.click(); return 'ok'; })()"))
MODOS += [
    ('flight',) + _modo('await AV.flight();', "(() => { window.AV.G.flightApi.salir(); return 'ok'; })()", tecla=True),
    ('maze',) + _modo('await AV.maze();', "(() => { window.AV.G.mazeApi.salir(); return 'ok'; })()", tecla=True),
    ('river',) + _modo('await AV.riverRush();', "(() => { window.AV.G.riverRushApi.salir(); return 'ok'; })()", tecla=True),
    ('tren',) + _modo('await AV.tren();', "(() => { window.AV.G.trenApi.salir(); return 'ok'; })()", tecla=True),
    ('criadero',) + _modo('const ok = await G.criadero.abrir(); if (!ok) return "el criadero no abrió";', "(() => { window.AV.G.criadero.cerrar(); return 'ok'; })()", espera=3000),
    ('records',) + _modo('await AV.records();', "(() => { const R = window.AV.G.recordsApi; if (R && R.cerrar) R.cerrar(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })); return 'ok'; })()", espera=1500),
    ('cambiar_juego', '''(async () => { %s document.getElementById('pause').showPopover(); await sleep(300); document.getElementById('b-menu-modos').click(); await sleep(1500); return 'ok'; })()''' % ESPERA,
     "(() => { const t = document.getElementById('title'); const b = t && t.open && t.querySelector('[data-modo=aventura]'); if (b) b.click(); return 'ok'; })()"),
    ('ingles', '''(async () => { %s const p = document.getElementById('pause'); p.showPopover(); await sleep(300); const b = document.querySelector('[data-aula-idioma=en]'); if (!b) return 'sin botón EN'; b.click(); await sleep(2500); if (!p.matches(':popover-open')) p.showPopover(); await sleep(800); return 'ok'; })()''' % ESPERA,
     "(() => { const p = document.getElementById('pause'); if (p.matches(':popover-open')) p.hidePopover(); return 'ok'; })()"),
    ('ingles_retos', '''(async () => { %s await window.AV.retos(); await sleep(1500); return 'ok'; })()''' % ESPERA,
     "(() => { const R = window.AV.G.retosApi; if (R && R.activo) R.salir(); const b = document.querySelector('#retos:not([hidden]) [data-salir]'); if (b) b.click(); return 'ok'; })()"),
]


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('raiz')
    ap.add_argument('--packs', default='cap1,ep2,ep3,ep4,ep5,ep6')
    ap.add_argument('--modos', action='store_true')
    ap.add_argument('--solo', default='', help='solo estas escenas de --modos (coma)')
    ap.add_argument('--ancho', type=int, default=1366)
    ap.add_argument('--alto', type=int, default=768)
    ap.add_argument('--salida', default=os.path.join(tempfile.gettempdir(), 'bc1_qa'))
    a = ap.parse_args()
    os.makedirs(a.salida, exist_ok=True)
    cfg = json.load(open(os.path.join(AQUI, 'config.json')))
    P = cfg['pruebas']
    errores = []

    def al_evento(m):
        me, p = m.get('method'), m.get('params') or {}
        if me == 'Runtime.exceptionThrown':
            d = p.get('exceptionDetails') or {}
            errores.append('%s (%s:%s)' % (((d.get('exception') or {}).get('description') or d.get('text') or '')[:300], d.get('url', ''), d.get('lineNumber')))
        elif me == 'Runtime.consoleAPICalled' and p.get('type') in ('error', 'assert'):
            errores.append(' '.join(str(x.get('value', x.get('description', ''))) for x in p.get('args') or [])[:300])
        elif me == 'Log.entryAdded' and (p.get('entry') or {}).get('level') == 'error':
            e = p['entry']
            errores.append('%s %s' % (e.get('text', '')[:200], e.get('url', '')))

    srv = chrome = ws = None
    res = {'escenas': []}
    try:
        srv = avtest.Servidor(os.path.abspath(a.raiz), 0, None)
        origen = 'http://127.0.0.1:%d' % srv.puerto
        chrome = look_capturas.ChromePaciente(P, set(P['puertos_prohibidos']), os.path.join(tempfile.mkdtemp(prefix='bc1-qa-'), 'chrome.log'))
        ws = avtest.WS('ws://127.0.0.1:%d%s' % (chrome.puerto, chrome.ws_path))
        cdp = avtest.CDP(ws, al_evento)
        print('· servidor %s · Chrome %s · %d×%d' % (origen, chrome.version, a.ancho, a.alto), flush=True)

        def escena(ses, nombre, js, salir=None, timeout=600):
            n0, t0 = len(errores), time.monotonic()
            try:
                r = avtest.evaluar(cdp, ses, js, timeout) if js else 'ok'
            except Exception as e:  # noqa: BLE001  (una escena que falla no para la ronda)
                r = 'excepción: %s' % e
            cdp.bombear(0.5)
            try:
                au = json.loads(avtest.evaluar(cdp, ses, AUDITA_JS, 30, promesa=False))
            except Exception as e:  # noqa: BLE001
                au = {'problemas': ['auditoría: %s' % e]}
            img = cdp.call('Page.captureScreenshot', {'format': 'jpeg', 'quality': 60}, ses, 60)['data']
            ruta = os.path.join(a.salida, '%02d_%s.jpg' % (len(res['escenas']), nombre))
            open(ruta, 'wb').write(base64.b64decode(img))
            if salir:
                try:
                    avtest.evaluar(cdp, ses, salir, 30)
                except Exception as e:  # noqa: BLE001
                    r += ' · al salir: %s' % e
                cdp.bombear(1.5)
            e = {'escena': nombre, 'resultado': str(r)[:600], 's': round(time.monotonic() - t0, 1), 'errores': errores[n0:], 'captura': ruta}
            e.update(au)
            res['escenas'].append(e)
            print('· %-22s %5.1f s · %s%s%s' % (nombre, e['s'], e['resultado'][:110], ' · DOM: %s' % au.get('problemas') if au.get('problemas') else '',
                                              ' · ERRORES: %s' % e['errores'][:3] if e['errores'] else ''), flush=True)
            return e

        for pack in [x for x in a.packs.split(',') if x]:
            tid = cdp.call('Target.createTarget', {'url': 'about:blank'})['targetId']
            ses = cdp.call('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
            for me in ('Page.enable', 'Runtime.enable', 'Log.enable'):
                cdp.call(me, {}, ses)
            cdp.call('Emulation.setDeviceMetricsOverride', {'width': a.ancho, 'height': a.alto, 'deviceScaleFactor': 1, 'mobile': False}, ses)
            cdp.call('Page.addScriptToEvaluateOnNewDocument', {'source': 'try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}'}, ses)
            cdp.call('Page.navigate', {'url': '%s/index.html?qa=1%s' % (origen, '' if pack == 'cap1' else '&pack=' + pack)}, ses)
            t0 = time.monotonic()
            while time.monotonic() - t0 < P['espera_listo_s']:
                try:
                    if avtest.evaluar(cdp, ses, '!!(%s)' % P['listo_js'], 10, promesa=False):
                        break
                except (avtest.CDPError, avtest.JSError, TimeoutError):
                    pass
                cdp.bombear(0.5)
            else:
                res['escenas'].append({'escena': pack + '_carga', 'resultado': 'el juego no arrancó'})
                print('· %s: el juego no arrancó' % pack, flush=True)
                continue
            cdp.bombear(2.0)
            escena(ses, pack + '_portada', None)
            escena(ses, pack + '_jugar', P['preparar_js'], timeout=180)
            escena(ses, pack + '_apertura6s', INICIO_JS % (ESPERA, 6000))
            escena(ses, pack + '_apertura40s', INICIO_JS % (ESPERA, 34000))
            escena(ses, pack + '_pausa', PAUSA_JS, CERRAR_PAUSA_JS)
            if pack == 'cap1' and a.modos:
                for m in MODOS:
                    if not a.solo or m[0] in a.solo.split(','):
                        escena(ses, 'cap1_' + m[0], m[1], m[2])
            escena(ses, pack + '_fin', FIN_JS[pack], timeout=900)
            try:
                cdp.call('Target.closeTarget', {'targetId': tid})
            except Exception:  # noqa: BLE001
                pass
        try:
            cdp.call('Browser.close', {}, None, 5)
        except Exception:  # noqa: BLE001
            pass
    finally:
        if ws:
            ws.cerrar()
        if chrome:
            chrome.cerrar()
        if srv:
            srv.cerrar()
    json.dump(res, open(os.path.join(a.salida, 'qa.json'), 'w'), indent=1, ensure_ascii=False)
    malas = [e['escena'] for e in res['escenas'] if e.get('errores') or not str(e.get('resultado', '')).startswith('ok')]
    print('· informe en %s/qa.json · escenas con errores o que fallan: %s' % (a.salida, malas or 'ninguna'), flush=True)
    return 1 if malas else 0


if __name__ == '__main__':
    sys.exit(main())
