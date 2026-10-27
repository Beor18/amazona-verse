#!/usr/bin/env python3
"""Amazona Verse · ronda de QA de la temporada 1 en móvil (BC2; informe en docs/equipo/QA_TEMPORADA1.md).

    python3.11 -I tools/build/qa_movil.py <build o repo> [--packs cap1,ep2,ep3,ep4,ep5,ep6] [--modos] [--solo a,b]
                                          [--cpu 4] [--ancho 375] [--alto 812] [--dpr 3] [--salida DIR]

Emula un celular (375×812, dpr 3, táctil, pointer:coarse, UA de iPhone) con la CPU frenada ×4 y juega como un jugador
nuevo (origen limpio): portada, «Jugar», apertura, un paseo de 12 s con el streaming, pausa y el capítulo de punta a
punta con su prueba (cap1: missionTest; ep2…ep6: AV.epNTest). Con --modos (en cap1): Diario, Retos, Flight, Maze, River
Rush, Tren, criadero, récords y la pausa en inglés.
Por escena: captura JPG, errores de consola y una auditoría del DOM (fuera de pantalla, se pisan, texto cortado, scroll
horizontal, «undefined»/«NaN»/«[KELVIN]», botones de menos de 44 px y textos tapados por un botón), más los tirones
(cuadros de más de 50 y de 100 ms, p95 y peor cuadro, tareas largas) y la memoria (heap JS, MB de texturas, calls).
Escribe <salida>/qa_movil.json. Salida: 0 sin errores de consola ni escenas que fallen; 1 si los hay.
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
UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
ESPERA = 'const sleep = ms => new Promise(r => setTimeout(r, ms)); const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } return false; };'

# Registro de cuadros y tareas largas desde el primer momento (se lee y se vacía por escena)
SONDA_JS = r'''(() => { const Q = window.__qaM = { dt: [], largas: [] }; let t = 0;
  const f = n => { if (t) Q.dt.push(n - t); t = n; if (Q.dt.length > 20000) Q.dt.splice(0, 10000); requestAnimationFrame(f); }; requestAnimationFrame(f);
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) Q.largas.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: true }); } catch (e) {} })();'''

MEDIR_JS = r'''(() => { const Q = window.__qaM || { dt: [], largas: [] }; const d = Q.dt.slice().sort((a, b) => a - b), n = d.length;
  const q = p => n ? Math.round(d[Math.min(n - 1, Math.floor(n * p))]) : 0;
  let st = {}; try { const R = window.AV && AV.G && AV.G.renderer; st = Object.assign({}, (R && R.stats && R.stats()) || {}, (AV.look && AV.look.medir && AV.look.medir()) || {}); } catch (e) {}
  const out = { cuadros: n, p50: q(0.5), p95: q(0.95), peor: n ? Math.round(d[n - 1]) : 0, mas50: d.filter(x => x > 50).length, mas100: d.filter(x => x > 100).length,
    largas: Q.largas.length, largaPeor: Q.largas.length ? Math.max(...Q.largas) : 0,
    heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
    texMB: st.texturasMB != null ? st.texturasMB : null, calls: st.calls != null ? st.calls : null, calidad: st.calidad || (window.AV && AV.G && AV.G.renderer && AV.G.renderer.calidad) || null };
  Q.dt = []; Q.largas = []; return JSON.stringify(out); })()'''

AUDITA_JS = r'''(() => { const W = innerWidth, H = innerHeight, out = [];
  const vis = e => { if (e.closest('[hidden]')) return false; for (let p = e; p; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; } const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  const lbl = e => ((e.innerText || e.getAttribute('aria-label') || e.id || '').trim().replace(/\s+/g, ' ').slice(0, 40));
  const enScroll = e => { for (let p = e.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll)/.test(s.overflowY + s.overflowX) && (p.scrollHeight > p.clientHeight + 1 || p.scrollWidth > p.clientWidth + 1)) return true; } return false; };
  const encima = (e, x, y) => { const t = document.elementFromPoint(Math.min(W - 1, Math.max(0, x)), Math.min(H - 1, Math.max(0, y))); return t && (e.contains(t) || t.contains(e)) ? null : t; };
  const els = [...document.querySelectorAll('button, a, h1, h2, h3, p, label, [role=button], #quest')].filter(vis);
  for (const e of els) { const r = e.getBoundingClientRect();
    if ((r.right > W + 1 || r.bottom > H + 1 || r.left < -1 || r.top < -1) && !enScroll(e)) out.push('fuera de pantalla: ' + e.tagName + ' «' + lbl(e) + '» ' + [r.left, r.top, r.right, r.bottom].map(Math.round).join(','));
    if (e.tagName === 'BUTTON' && getComputedStyle(e).overflow !== 'visible' && (e.scrollWidth > e.clientWidth + 2 || e.scrollHeight > e.clientHeight + 2)) out.push('texto cortado: «' + lbl(e) + '»'); }
  if (document.documentElement.scrollWidth > W + 1) out.push('scroll horizontal: ' + document.documentElement.scrollWidth);
  const cx = r => (r.left + r.right) / 2, cy = r => (r.top + r.bottom) / 2;
  const bs = els.filter(e => e.tagName === 'BUTTON' || e.getAttribute('role') === 'button').map(b => [b, b.getBoundingClientRect()]).filter(([b, r]) => !encima(b, cx(r), cy(r)));
  for (const [b, r] of bs) if ((r.width < 43.5 || r.height < 43.5) && !enScroll(b)) out.push('botón pequeño: «' + lbl(b) + '» ' + Math.round(r.width) + '×' + Math.round(r.height));
  for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) { const [a, ra] = bs[i], [b, rb] = bs[j]; if (a.contains(b) || b.contains(a)) continue;
    const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (ix > 4 && iy > 4) out.push('se pisan: «' + lbl(a) + '» y «' + lbl(b) + '»'); }
  // Texto tapado: un párrafo, título o el objetivo cuyo centro o esquinas quedan bajo un botón u otro panel del HUD
  const modal = [...document.querySelectorAll(':popover-open, dialog[open]')].pop(); // lo que queda detrás de la pausa o un diálogo no cuenta
  for (const e of els.filter(e => /^(P|H1|H2|H3|LABEL)$/.test(e.tagName) || e.id === 'quest')) { const r = e.getBoundingClientRect(); if (r.bottom < 0 || r.top > H || enScroll(e) || (modal && !modal.contains(e))) continue;
    for (const [x, y] of [[cx(r), cy(r)], [r.left + 6, r.top + 6], [r.right - 6, r.top + 6], [r.left + 6, r.bottom - 6], [r.right - 6, r.bottom - 6]]) {
      const t = encima(e, x, y); if (!t || t === document.body || t.tagName === 'CANVAS' || t.tagName === 'HTML') continue;
      const tb = t.closest('button, [role=button], .joystick, #joystick, #hud > *'); if (tb && !tb.contains(e) && !e.contains(tb)) { out.push('texto tapado: «' + lbl(e) + '» bajo «' + lbl(tb) + '»'); break; } } }
  const txt = document.body.innerText; for (const m of txt.match(/[^\n]{0,30}(undefined|NaN|\[object|\[KELVIN\]|\{\{|\b[a-z]+\.[a-z]+\.[a-z]+\b)[^\n]{0,20}/g) || []) out.push('texto raro: «' + m.trim() + '»');
  return JSON.stringify({ problemas: [...new Set(out)].slice(0, 40), quest: (document.getElementById('quest') || {}).innerText || '' }); })()'''

INICIO_JS = '''(async () => { %s const G = window.AV.G; await (G.mundo && G.mundo.listo); await sleep(%d); return 'ok'; })()'''
# Paseo: 12 s hacia delante (tecla W, la misma ruta que el joystick) con giros, para medir los tirones del streaming
PASEO_JS = '''(async () => { %s const k = (t, c) => dispatchEvent(new KeyboardEvent(t, { key: c.slice(-1).toLowerCase(), code: c }));
  k('keydown', 'KeyW'); for (let i = 0; i < 6; i++) { k('keydown', i %% 2 ? 'KeyA' : 'KeyD'); await sleep(700); k('keyup', i %% 2 ? 'KeyA' : 'KeyD'); await sleep(1300); }
  k('keyup', 'KeyW'); await sleep(800); return 'ok'; })()''' % ESPERA
PAUSA_JS = '''(async () => { %s const p = document.getElementById('pause'); p.showPopover(); await sleep(600); return p.matches(':popover-open') ? 'ok pausa' : 'la pausa no abrió'; })()''' % ESPERA
CERRAR_PAUSA_JS = '''(() => { const p = document.getElementById('pause'); if (p.matches(':popover-open')) p.hidePopover(); return 'ok'; })()'''

FIN_JS = {'cap1': '''(async () => { %s const r = await window.AV.missionTest(); await sleep(1500); const mal = ((r && r.results) || []).filter(x => x && (x.pass === false || x.ok === false || x.passed === false)).map(x => x.name); return 'ok missionTest ' + (r && r.passed) + '/' + (r && r.total) + (mal.length ? ' · falla: ' + mal.join(' | ') : ''); })()''' % ESPERA}
for _p in ('ep2', 'ep3', 'ep4', 'ep5', 'ep6'):
    FIN_JS[_p] = '''(async () => { %s const f = window.AV.%sTest; if (!f) return 'no hay AV.%sTest'; const r = await f(); await sleep(1500); const mal = ((r && r.results) || []).filter(x => x && (x.pass === false || x.ok === false || x.passed === false)).map(x => x.name + (x.detail || x.info ? ' (' + (x.detail || x.info) + ')' : '')); return 'ok %sTest ' + (r && r.passed) + '/' + (r && r.total) + (mal.length ? ' · falla: ' + mal.join(' | ') : ''); })()''' % (ESPERA, _p, _p, _p)

SALIR_RETOS = "(() => { const R = window.AV.G.retosApi; if (R && R.activo) R.salir(); const b = document.querySelector('#retos:not([hidden]) [data-salir]'); if (b) b.click(); return 'ok'; })()"


def _modo(abrir, salir, espera=6000):
    toque = "const c = document.querySelector('canvas'); if (c) { const o = { bubbles: true, pointerType: 'touch', clientX: 187, clientY: 500, isPrimary: true }; c.dispatchEvent(new PointerEvent('pointerdown', o)); await sleep(150); c.dispatchEvent(new PointerEvent('pointerup', o)); }"
    return ('''(async () => { %s const AV = window.AV, G = AV.G; try { %s } catch (e) { return 'no abrió: ' + e.message; } await sleep(%d); %s await sleep(1500); return 'ok'; })()''' % (ESPERA, abrir, espera, toque), salir)


MODOS = [
    ('diario', '''(async () => { %s document.getElementById('b-diary').click(); await sleep(1200); return 'ok'; })()''' % ESPERA,
     "(() => { const d = document.querySelector('#diary, #diario'); if (d && d.close) d.close(); if (d && d.hidePopover && d.matches(':popover-open')) d.hidePopover(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })); return 'ok'; })()"),
    ('retos_menu', '''(async () => { %s await window.AV.retos(); await sleep(1500); return document.querySelector('#retos:not([hidden])') ? 'ok' : 'Retos no abrió'; })()''' % ESPERA, SALIR_RETOS),
    ('reto_carrera', '''(async () => { %s const G = window.AV.G; await window.AV.retos(); const R = G.retosApi; R.jugar('carrera'); if (!await espera(() => R.activo && R.fase !== 'menu', 20000)) return 'no arrancó'; await sleep(6000); return 'ok ' + R.fase; })()''' % ESPERA, SALIR_RETOS),
    ('flight',) + _modo('await AV.flight();', "(() => { window.AV.G.flightApi.salir(); return 'ok'; })()"),
    ('maze',) + _modo('await AV.maze();', "(() => { window.AV.G.mazeApi.salir(); return 'ok'; })()"),
    ('river',) + _modo('await AV.riverRush();', "(() => { window.AV.G.riverRushApi.salir(); return 'ok'; })()"),
    ('tren',) + _modo('await AV.tren();', "(() => { window.AV.G.trenApi.salir(); return 'ok'; })()"),
    ('criadero',) + _modo('const ok = await G.criadero.abrir(); if (!ok) return "el criadero no abrió";', "(() => { window.AV.G.criadero.cerrar(); return 'ok'; })()", espera=3000),
    ('records',) + _modo('await AV.records();', "(() => { const R = window.AV.G.recordsApi; if (R && R.cerrar) R.cerrar(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })); return 'ok'; })()", espera=1500),
    ('ingles', '''(async () => { %s const p = document.getElementById('pause'); p.showPopover(); await sleep(300); const b = document.querySelector('[data-aula-idioma=en]'); if (!b) return 'sin botón EN'; b.click(); await sleep(2500); if (!p.matches(':popover-open')) p.showPopover(); await sleep(800); return 'ok'; })()''' % ESPERA, CERRAR_PAUSA_JS),
]


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('raiz')
    ap.add_argument('--packs', default='cap1,ep2,ep3,ep4,ep5,ep6')
    ap.add_argument('--modos', action='store_true')
    ap.add_argument('--solo', default='', help='solo estas escenas de --modos (coma)')
    ap.add_argument('--sin-fin', action='store_true', help='no juega el capítulo entero (solo portada, apertura, paseo y pausa)')
    ap.add_argument('--cpu', type=float, default=4)
    ap.add_argument('--ancho', type=int, default=375)
    ap.add_argument('--alto', type=int, default=812)
    ap.add_argument('--dpr', type=float, default=3)
    ap.add_argument('--salida', default=os.path.join(tempfile.gettempdir(), 'bc2_qa'))
    a = ap.parse_args()
    os.makedirs(a.salida, exist_ok=True)
    P = json.load(open(os.path.join(AQUI, 'config.json')))['pruebas']
    errores = []

    def al_evento(m):
        me, p = m.get('method'), m.get('params') or {}
        if me == 'Runtime.exceptionThrown':
            d = p.get('exceptionDetails') or {}
            errores.append('%s (%s:%s)' % (((d.get('exception') or {}).get('description') or d.get('text') or '')[:300], d.get('url', ''), d.get('lineNumber')))
        elif me == 'Runtime.consoleAPICalled' and p.get('type') in ('error', 'assert'):
            errores.append(' '.join(str(x.get('value', x.get('description', ''))) for x in p.get('args') or [])[:300])
        elif me == 'Log.entryAdded' and (p.get('entry') or {}).get('level') == 'error' and not p['entry'].get('url', '').endswith('/favicon.ico'):  # el icono va en <link>; Chrome sin interfaz pide /favicon.ico igual
            errores.append('%s %s' % (p['entry'].get('text', '')[:200], p['entry'].get('url', '')))

    srv = chrome = ws = None
    res = {'movil': {'ancho': a.ancho, 'alto': a.alto, 'dpr': a.dpr, 'cpu': a.cpu}, 'escenas': []}
    try:
        srv = avtest.Servidor(os.path.abspath(a.raiz), 0, None)
        origen = 'http://127.0.0.1:%d' % srv.puerto
        chrome = look_capturas.ChromePaciente(P, set(P['puertos_prohibidos']), os.path.join(tempfile.mkdtemp(prefix='bc2-qa-'), 'chrome.log'))
        ws = avtest.WS('ws://127.0.0.1:%d%s' % (chrome.puerto, chrome.ws_path))
        cdp = avtest.CDP(ws, al_evento)
        print('· servidor %s · Chrome %s · %d×%d dpr %g · CPU ×%g' % (origen, chrome.version, a.ancho, a.alto, a.dpr, a.cpu), flush=True)

        def escena(ses, nombre, js, salir=None, timeout=600):
            n0, t0 = len(errores), time.monotonic()
            avtest.evaluar(cdp, ses, MEDIR_JS, 30, promesa=False)  # vacía el registro: los tirones son de esta escena
            try:
                r = avtest.evaluar(cdp, ses, js, timeout) if js else 'ok'
            except Exception as e:  # noqa: BLE001  (una escena que falla no para la ronda)
                r = 'excepción: %s' % e
            cdp.bombear(0.5)
            try:
                cdp.call('HeapProfiler.collectGarbage', {}, ses, 30)  # heap tras recoger basura: lo que de verdad se queda
            except Exception:  # noqa: BLE001
                pass
            try:
                me = json.loads(avtest.evaluar(cdp, ses, MEDIR_JS, 30, promesa=False))
            except Exception as e:  # noqa: BLE001
                me = {'error': str(e)}
            try:
                au = json.loads(avtest.evaluar(cdp, ses, AUDITA_JS, 30, promesa=False))
            except Exception as e:  # noqa: BLE001
                au = {'problemas': ['auditoría: %s' % e]}
            img = cdp.call('Page.captureScreenshot', {'format': 'jpeg', 'quality': 55}, ses, 90)['data']
            ruta = os.path.join(a.salida, '%02d_%s.jpg' % (len(res['escenas']), nombre))
            open(ruta, 'wb').write(base64.b64decode(img))
            if salir:
                try:
                    avtest.evaluar(cdp, ses, salir, 30)
                except Exception as e:  # noqa: BLE001
                    r = str(r) + ' · al salir: %s' % e
                cdp.bombear(1.5)
            e = {'escena': nombre, 'resultado': str(r)[:600], 's': round(time.monotonic() - t0, 1), 'errores': errores[n0:], 'captura': ruta, 'medidas': me}
            e.update(au)
            res['escenas'].append(e)
            print('· %-20s %5.1f s · %s · cuadros p50 %s p95 %s peor %s (>100 ms: %s) · heap %s MB tex %s MB calls %s%s%s' % (
                nombre, e['s'], e['resultado'][:90], me.get('p50'), me.get('p95'), me.get('peor'), me.get('mas100'), me.get('heapMB'), me.get('texMB'), me.get('calls'),
                ' · DOM: %s' % au.get('problemas') if au.get('problemas') else '', ' · ERRORES: %s' % e['errores'][:3] if e['errores'] else ''), flush=True)
            return e

        for pack in [x for x in a.packs.split(',') if x]:
            tid = cdp.call('Target.createTarget', {'url': 'about:blank'})['targetId']
            ses = cdp.call('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
            for me in ('Page.enable', 'Runtime.enable', 'Log.enable'):
                cdp.call(me, {}, ses)
            cdp.call('Emulation.setDeviceMetricsOverride', {'width': a.ancho, 'height': a.alto, 'deviceScaleFactor': a.dpr, 'mobile': True}, ses)
            cdp.call('Emulation.setTouchEmulationEnabled', {'enabled': True, 'maxTouchPoints': 5}, ses)
            cdp.call('Emulation.setUserAgentOverride', {'userAgent': UA}, ses)
            cdp.call('Emulation.setCPUThrottlingRate', {'rate': a.cpu}, ses)
            cdp.call('Page.addScriptToEvaluateOnNewDocument', {'source': 'try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}' + SONDA_JS}, ses)
            t_nav = time.monotonic()
            cdp.call('Page.navigate', {'url': '%s/index.html?qa=1%s' % (origen, '' if pack == 'cap1' else '&pack=' + pack)}, ses)
            while time.monotonic() - t_nav < P['espera_listo_s'] * 2:
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
            res.setdefault('carga_s', {})[pack] = round(time.monotonic() - t_nav, 1)
            cdp.bombear(2.0)
            escena(ses, pack + '_portada', None)
            escena(ses, pack + '_jugar', P['preparar_js'], timeout=300)
            escena(ses, pack + '_apertura6s', INICIO_JS % (ESPERA, 6000))
            escena(ses, pack + '_apertura30s', INICIO_JS % (ESPERA, 24000))
            escena(ses, pack + '_paseo', PASEO_JS)
            escena(ses, pack + '_pausa', PAUSA_JS, CERRAR_PAUSA_JS)
            if pack == 'cap1' and a.modos:
                for m in MODOS:
                    if not a.solo or m[0] in a.solo.split(','):
                        escena(ses, 'cap1_' + m[0], m[1], m[2])
            if not a.sin_fin:
                escena(ses, pack + '_fin', FIN_JS[pack], timeout=1500)
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
    json.dump(res, open(os.path.join(a.salida, 'qa_movil.json'), 'w'), indent=1, ensure_ascii=False)
    malas = [e['escena'] for e in res['escenas'] if e.get('errores') or not str(e.get('resultado', '')).startswith('ok')]
    print('· carga (s): %s · informe en %s/qa_movil.json · escenas con errores o que fallan: %s' % (res.get('carga_s'), a.salida, malas or 'ninguna'), flush=True)
    return 1 if malas else 0


if __name__ == '__main__':
    sys.exit(main())
