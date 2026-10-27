#!/usr/bin/env python3
"""Amazona Verse · rendimiento en el móvil de cada modo (AF1; informe en docs/equipo/RENDIMIENTO_MOVIL.md).

    python3.11 -I tools/build/movil_modos.py [--raiz .] [--modos aventura,flight,banquete,tormenta,carrera,criadero]
                                            [--cpu 4] [--segundos 12] [--calidad ''] [--nucleos 6] [--salida <json>]

Sirve --raiz (el repo o una build) con el servidor y el Chrome sin interfaz de avtest.py (GPU real por Metal), emula un celular
de 375×812 (dpr 3, táctil, pointer:coarse, UA de iPhone, --nucleos núcleos; sin deviceMemory, como Safari), pasa el flujo de
jugador nuevo y mide cada modo con la CPU --cpu veces más lenta (Emulation.setCPUThrottlingRate, solo mientras se mide):
- aventura: Vittata vuela recto con W pulsada, girando la cámara poco a poco (streaming, flora y agua de verdad);
- flight: AV.flight() con el piloto automático de flight_medidas.py;
- banquete, tormenta y carrera: G.retosApi.jugar(<reto>) con W pulsada (la cuenta atrás entra en la medida);
- criadero: G.criadero.abrir() (su propio lienzo).
Cada modo da: FPS medios, mediana, p95, p99 y peor cuadro (ms), cuadros de más de 50 ms, draw calls, triángulos, calidad y dpr al
final. La calidad es la que el juego elige solo (perfil del equipo, arranque y ajuste por FPS), salvo --calidad. La GPU es la de la
Mac: la CPU lenta emula el procesador de un móvil, no su GPU. Guarda las medidas en --salida (clave = etiqueta --nombre).
"""
import argparse
import json
import os
import sys
import tempfile
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import avtest  # noqa: E402
import look_capturas  # noqa: E402  (ChromePaciente)
import flight_medidas  # noqa: E402  (PILOTO_JS)

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(AQUI, '..', '..'))
MODOS = ['aventura', 'flight', 'banquete', 'tormenta', 'carrera', 'criadero']
MODOS_RN = ['arranque', 'bosque', 'ciudad', 'caleta', 'river', 'tren']   # RN1: escenarios del informe RENDIMIENTO_MOVIL.md

# Abre el modo y deja lo que haga falta en marcha; devuelve un texto que empieza por 'ok' si abrió
ABRIR_JS = {
    'aventura': r'''(async () => { const G = window.AV.G, S = G.S;
      if (G.clima && G.clima.fijar) G.clima.fijar('sol', { inmediato: true, forzar: true });
      G.fisica.MOVE.flying = true; S.pos.y = Math.max(S.pos.y, G.terreno.height(S.pos.x, S.pos.z) + 6);
      dispatchEvent(new KeyboardEvent('keydown', { key: 'w', code: 'KeyW' }));
      let vivo = true; window.__parar = () => { vivo = false; dispatchEvent(new KeyboardEvent('keyup', { key: 'w', code: 'KeyW' })); };
      const giro = () => { if (!vivo) return; G.camara.yaw += 0.004; requestAnimationFrame(giro); }; requestAnimationFrame(giro);
      return 'ok aventura'; })()''',
    'flight': r'''(async () => { const AV = window.AV; const ok = await AV.flight(); if (ok !== true) return 'no abrió: ' + ok;''' + flight_medidas.PILOTO_JS + r'''
      api.otraVez(); api.toque(); prev = performance.now(); let vivo = true; window.__parar = () => { vivo = false; };
      const bucle = () => { if (!vivo) return; if (api.fase !== 'juego') { api.otraVez(); api.toque(); } decide(); requestAnimationFrame(bucle); }; requestAnimationFrame(bucle);
      return 'ok flight'; })()''',
    'criadero': r'''(async () => { const G = window.AV.G; if (!G.criadero || !G.criadero.abrir) return 'sin criadero';
      const ok = await G.criadero.abrir(); window.__parar = () => {}; return ok ? 'ok criadero' : 'el criadero no abrió'; })()''',
}
RETO_JS = r'''(async () => { const AV = window.AV, G = AV.G; await AV.retos(); const R = G.retosApi; if (!R) return 'sin retos';
  R.jugar('%s'); const t0 = performance.now(); while (performance.now() - t0 < 30000 && !(R.activo && R.reto === '%s' && R.fase !== 'menu')) await new Promise(r => setTimeout(r, 100));
  if (!(R.activo && R.reto === '%s')) return 'no arrancó: activo ' + R.activo + ' reto ' + R.reto + ' fase ' + R.fase;
  dispatchEvent(new KeyboardEvent('keydown', { key: 'w', code: 'KeyW' }));
  window.__parar = () => dispatchEvent(new KeyboardEvent('keyup', { key: 'w', code: 'KeyW' }));
  return 'ok ' + R.reto + ' (' + R.fase + ')'; })()'''
for _r in ('banquete', 'tormenta', 'carrera'):
    ABRIR_JS[_r] = RETO_JS % (_r, _r, _r)

SALIR_JS = {
    'aventura': "window.__parar && window.__parar(); window.AV.G.fisica.MOVE.flying = false; 'ok'",
    'flight': "window.__parar && window.__parar(); window.AV.G.flightApi.salir(); 'ok'",
    'criadero': "window.AV.G.criadero.cerrar(); 'ok'",
}
for _r in ('banquete', 'tormenta', 'carrera'):
    SALIR_JS[_r] = "window.__parar && window.__parar(); window.AV.G.retosApi.salir(); 'ok'"

# RN1: vuelo en un lugar (teleport + W + cámara girando); el lugar sale del mapa (villa = ciudad, agua.bahiaBio = caleta)
def _lugar_js(expr, alto, shift):
    return r"""(async () => { const G = window.AV.G, S = G.S, M = G.terreno.mapa || {}, L = M.lugares || {}, A = M.agua || {}; const lug = %s;
      if (!lug) return 'sin lugar';
      if (G.clima && G.clima.fijar) G.clima.fijar('sol', { inmediato: true, forzar: true });
      G.fisica.MOVE.flying = true; G.pruebas.teleport(lug.x, lug.z, 0, -1); G.pruebas.tick(0.1);
      if (G.streaming && G.streaming.gestor) { try { await G.streaming.gestor.alrededor(lug.x, lug.z); } catch (e) {} }
      S.pos.y = Math.max(S.pos.y, G.terreno.height(S.pos.x, S.pos.z) + %d);
      await new Promise(r => setTimeout(r, 2500));
      dispatchEvent(new KeyboardEvent('keydown', { key: 'w', code: 'KeyW' })); %s
      let vivo = true; window.__parar = () => { vivo = false; dispatchEvent(new KeyboardEvent('keyup', { key: 'w', code: 'KeyW' })); %s };
      const giro = () => { if (!vivo) return; G.camara.yaw += 0.004; requestAnimationFrame(giro); }; requestAnimationFrame(giro);
      return 'ok lugar'; })()""" % (expr, alto, "dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', code: 'ShiftLeft', shiftKey: true }));" if shift else '', "dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift', code: 'ShiftLeft' }));" if shift else '')
ABRIR_JS['bosque'] = ABRIR_JS['aventura']
ABRIR_JS['ciudad'] = _lugar_js("L.villa", 8, False)
ABRIR_JS['caleta'] = _lugar_js("A.bahiaBio || L.bahiaBio", 6, False)
ABRIR_JS['arranque'] = r"""(async () => { window.__parar = () => {}; return 'ok arranque'; })()"""
ABRIR_JS['river'] = r"""(async () => { const AV = window.AV, G = AV.G; const ok = await AV.riverRush(); const R = G.riverRushApi; if (!R) return 'sin river';
  let vivo = true, lado = 0; window.__parar = () => { vivo = false; };
  const k = (t, c) => dispatchEvent(new KeyboardEvent(t, { key: c, code: c }));
  const bucle = () => { if (!vivo) return; if (R.fase !== 'juego') { try { R.otraVez(); } catch (e) {} k('keydown', 'w'); k('keyup', 'w'); } requestAnimationFrame(bucle); }; requestAnimationFrame(bucle);
  const zig = setInterval(() => { if (!vivo) return clearInterval(zig); lado = !lado; k('keydown', lado ? 'ArrowLeft' : 'ArrowRight'); setTimeout(() => k('keyup', lado ? 'ArrowLeft' : 'ArrowRight'), 250); }, 900);
  k('keydown', 'w'); k('keyup', 'w'); return 'ok river (' + R.fase + ')'; })()"""
ABRIR_JS['tren'] = r"""(async () => { const AV = window.AV, G = AV.G; const ok = await AV.tren(); const T = G.trenApi; if (!T) return 'sin tren';
  let vivo = true; window.__parar = () => { vivo = false; T.held.gas = false; };
  const bucle = () => { if (!vivo) return; if (T.fase === 'listo' || T.fase === 'fin') { try { T.toque(); } catch (e) {} } T.held.gas = true; requestAnimationFrame(bucle); }; requestAnimationFrame(bucle);
  return 'ok tren (' + T.fase + ')'; })()"""
SALIR_JS['bosque'] = SALIR_JS['aventura']; SALIR_JS['ciudad'] = SALIR_JS['aventura']; SALIR_JS['caleta'] = SALIR_JS['aventura']
SALIR_JS['arranque'] = "window.__parar && window.__parar(); 'ok'"
SALIR_JS['river'] = "window.__parar && window.__parar(); window.AV.G.riverRushApi.salir(); 'ok'"
SALIR_JS['tren'] = "window.__parar && window.__parar(); window.AV.G.trenApi.salir(); 'ok'"

# Tiempo de JS dentro de los callbacks de requestAnimationFrame (el bucle del juego y lo que cuelga de él), sumado por cuadro
RAF_JS = r'''
;(() => { const raf = window.requestAnimationFrame.bind(window); window.__raf = { ms: 0, n: 0, max: 0, cuadro: 0, t: -1 };
  window.requestAnimationFrame = cb => raf(t => { const R = window.__raf; if (t !== R.t) { if (R.t >= 0) { R.n++; R.max = Math.max(R.max, R.cuadro); } R.t = t; R.cuadro = 0; }
    const a = performance.now(); try { cb(t); } finally { const d = performance.now() - a; R.ms += d; R.cuadro += d; } });
  window.__largas = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__largas.push(e.duration); }).observe({ entryTypes: ['longtask'] }); } catch (e) {} })();'''

# Todos los cuadros de seg segundos (rAF) y el estado del renderer al final
MEDIR_JS = r'''(async () => { const G = window.AV.G, R = G.renderer, seg = %f;
  const dts = [], tr = [], tt = []; let pv = 0, tp = performance.now(); const tri = setInterval(() => { const st = R.stats(); tr.push(st.dpr + '/' + st.calidad[0]); }, 1000); const J = window.__raf; J.ms = 0; J.n = 0; J.max = 0; window.__largas.length = 0;
  await new Promise(r => { const t1 = performance.now(); const f = t => { if (pv) { dts.push(t - pv); tt.push(t); } pv = t; if (t - t1 >= seg * 1000) return r(); requestAnimationFrame(f); }; requestAnimationFrame(f); });
  clearInterval(tri); const fin = dts.slice(Math.floor(dts.length * 0.6)).sort((a, b) => a - b), pFin = fin.length ? fin[Math.min(fin.length - 1, Math.floor(0.95 * fin.length))] : 0, mFin = fin.length ? fin.reduce((a, b) => a + b, 0) / fin.length : 0;
  const o = dts.slice().sort((a, b) => a - b), q = p => o[Math.min(o.length - 1, Math.floor(p * o.length))], ms = dts.reduce((a, b) => a + b, 0) / Math.max(1, dts.length), d = x => Math.round(x * 10) / 10;
  const s = R.stats();
  return JSON.stringify({ fps: Math.round(1000 / ms), ms: d(ms), mediana: d(q(0.5)), p95: d(q(0.95)), p99: d(q(0.99)), peor: d(o[o.length - 1] || 0), mas50: dts.filter(x => x > 50).length,
    cuadros: dts.length, p95Fin: d(pFin), msFin: d(mFin), traza: tr.join(' '), jsMs: d(J.ms / Math.max(1, J.n)), jsPeor: d(J.max), largas: window.__largas.length, largasMs: Math.round(window.__largas.reduce((a, b) => a + b, 0)), calls: s.calls, triangulos: s.triangulos, calidad: s.calidad, dpr: s.dpr, geoms: R.renderer.info.memory.geometries, texs: R.renderer.info.memory.textures, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null });
})()'''


def metricas(cdp, ses):
    return {x['name']: x['value'] for x in cdp.call('Performance.getMetrics', {}, ses)['metrics']}


def resumen_perfil(pr, n=12):
    """Tiempo propio por función (muestras), en % del total; a las nativas (sin archivo) se les añade quién las llama."""
    por_id = {x['id']: x for x in pr['nodes']}
    padre = {c: x['id'] for x in pr['nodes'] for c in x.get('children', [])}
    cuenta = {}
    for sid in pr.get('samples', []):
        cuenta[sid] = cuenta.get(sid, 0) + 1
    total = max(1, sum(cuenta.values()))

    def nombre(i):
        cf = por_id[i]['callFrame']
        return '%s %s:%d' % (cf.get('functionName') or '(anónima)', os.path.basename(cf.get('url', '')) or '-', cf.get('lineNumber', 0) + 1)
    suma, quien = {}, {}
    for sid, k in cuenta.items():
        nom = nombre(sid)
        suma[nom] = suma.get(nom, 0) + k
        if nom.endswith(' -:0') and not nom.startswith('('):
            q = quien.setdefault(nom, {})
            pn = nombre(padre[sid]) if sid in padre else '?'
            q[pn] = q.get(pn, 0) + k
    orden = sorted(suma.items(), key=lambda kv: -kv[1])
    out = []
    for nom, k in orden[:n]:
        if nom in quien:
            nom += ' ← ' + ', '.join('%s (%d)' % kv for kv in sorted(quien[nom].items(), key=lambda kv: -kv[1])[:3])
        out.append([round(100.0 * k / total, 1), nom])
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--raiz', default=REPO)
    ap.add_argument('--modos', default=','.join(MODOS))
    ap.add_argument('--cpu', type=float, default=4)
    ap.add_argument('--segundos', type=float, default=12)
    ap.add_argument('--calidad', default='')
    ap.add_argument('--nucleos', type=int, default=6)
    ap.add_argument('--dpr', type=float, default=3)
    ap.add_argument('--js', default='', help='archivo JS: se evalua tras el flujo de jugador nuevo y se imprime (diagnostico)')
    ap.add_argument('--pack', default='', help='content pack (ep3…)')
    ap.add_argument('--carga', action='store_true', help='CPU lenta tambien durante la carga: mide el tiempo hasta poder jugar')
    ap.add_argument('--escritorio', action='store_true', help='sin emular el móvil (referencia)')
    ap.add_argument('--nombre', default='medida')
    ap.add_argument('--perfil', action='store_true', help='perfil de CPU de cada modo: las 12 funciones con más tiempo propio')
    ap.add_argument('--salida', default=os.path.join(tempfile.gettempdir(), 'af1_movil.json'))
    a = ap.parse_args()
    cfg = json.load(open(os.path.join(AQUI, 'config.json')))
    P = cfg['pruebas']
    errores = []

    def al_evento(m):
        me, p = m.get('method'), m.get('params') or {}
        if me == 'Runtime.exceptionThrown':
            d = p.get('exceptionDetails') or {}
            errores.append('%s (%s:%s)' % (((d.get('exception') or {}).get('description') or d.get('text') or '')[:200], d.get('url', ''), d.get('lineNumber')))
        elif me == 'Runtime.consoleAPICalled' and p.get('type') in ('error', 'assert'):
            errores.append(' '.join(str(x.get('value', x.get('description', ''))) for x in p.get('args') or [])[:300])

    srv = chrome = ws = None
    res = {'cpu': a.cpu, 'segundos': a.segundos, 'calidadPedida': a.calidad or 'auto', 'nucleos': a.nucleos, 'modos': {}}
    try:
        srv = avtest.Servidor(os.path.abspath(a.raiz), 0, None)
        origen = 'http://127.0.0.1:%d' % srv.puerto
        chrome = look_capturas.ChromePaciente(P, set(P['puertos_prohibidos']), os.path.join(tempfile.mkdtemp(prefix='af1-movil-'), 'chrome.log'))
        ws = avtest.WS('ws://127.0.0.1:%d%s' % (chrome.puerto, chrome.ws_path))
        cdp = avtest.CDP(ws, al_evento)
        print('· servidor %s · Chrome %s · CPU ×%g · calidad %s' % (origen, chrome.version, a.cpu, a.calidad or 'auto'), flush=True)
        tid = cdp.call('Target.createTarget', {'url': 'about:blank'})['targetId']
        ses = cdp.call('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
        for me in ('Page.enable', 'Runtime.enable', 'Log.enable', 'Performance.enable'):
            cdp.call(me, {}, ses)
        cdp.call('Emulation.setDeviceMetricsOverride', {'width': 375, 'height': 812, 'deviceScaleFactor': a.dpr, 'mobile': not a.escritorio}, ses)
        cdp.call('Emulation.setTouchEmulationEnabled', {'enabled': True, 'maxTouchPoints': 5}, ses)
        cdp.call('Emulation.setEmitTouchEventsForMouse', {'enabled': True, 'configuration': 'mobile'}, ses)
        cdp.call('Emulation.setUserAgentOverride', {'userAgent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'}, ses)
        try:
            cdp.call('Emulation.setHardwareConcurrencyOverride', {'hardwareConcurrency': a.nucleos}, ses)
        except avtest.CDPError:
            pass
        cdp.call('Page.addScriptToEvaluateOnNewDocument', {'source': 'try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}' + RAF_JS}, ses)
        if a.carga:
            cdp.call('Emulation.setCPUThrottlingRate', {'rate': a.cpu}, ses)
        cdp.call('Page.navigate', {'url': '%s/index.html?clima=sol' % origen + ('&calidad=' + a.calidad if a.calidad else '') + ('&pack=' + a.pack if a.pack else '')}, ses)
        t0 = time.monotonic()
        while time.monotonic() - t0 < P['espera_listo_s']:
            try:
                if avtest.evaluar(cdp, ses, '!!(%s)' % P['listo_js'], 10, promesa=False):
                    break
            except (avtest.CDPError, avtest.JSError, TimeoutError):
                pass
            cdp.bombear(0.5)
        else:
            raise avtest.Infra('el juego no arrancó en %d s' % P['espera_listo_s'])
        t_listo = time.monotonic() - t0
        cdp.bombear(1.0)
        prep = avtest.evaluar(cdp, ses, P['preparar_js'], 120)
        print('· juego listo en %.0f s · %s' % (time.monotonic() - t0, prep), flush=True)
        if not str(prep).startswith('ok'):
            raise avtest.Infra('flujo de jugador nuevo: %s' % prep)
        avtest.evaluar(cdp, ses, '(async () => { const G = window.AV.G; await (G.mundo && G.mundo.listo); await new Promise(r => setTimeout(r, 3000)); return true; })()', 120)
        res['tListoS'] = round(t_listo, 1); res['tJugarS'] = round(time.monotonic() - t0, 1)
        print('· hasta poder jugar: %.1f s (modelo del jugador %.1f s)' % (res['tJugarS'], t_listo), flush=True)
        if a.carga:
            cdp.call('Emulation.setCPUThrottlingRate', {'rate': 1}, ses)
        if a.js:
            print('· js:', avtest.evaluar(cdp, ses, open(a.js).read(), 120), flush=True)
        res['perfil'] = avtest.evaluar(cdp, ses, 'JSON.stringify(window.AV.G.renderer.stats())', 10, promesa=False)
        for modo in [x for x in a.modos.split(',') if x]:
            n0 = len(errores)
            r = avtest.evaluar(cdp, ses, ABRIR_JS[modo], 120)
            if not str(r).startswith('ok'):
                res['modos'][modo] = {'error': r}
                print('· %-9s NO ABRIÓ: %s' % (modo, r), flush=True)
                continue
            cdp.bombear(1.5)
            cdp.call('Emulation.setCPUThrottlingRate', {'rate': a.cpu}, ses)
            met0 = metricas(cdp, ses)
            if a.perfil:
                cdp.call('Profiler.enable', {}, ses)
                cdp.call('Profiler.setSamplingInterval', {'interval': 1000}, ses)
                cdp.call('Profiler.start', {}, ses)
            try:
                m = json.loads(avtest.evaluar(cdp, ses, MEDIR_JS % a.segundos, 60 + a.segundos * 10))
            finally:
                met1 = metricas(cdp, ses)
                cdp.call('Emulation.setCPUThrottlingRate', {'rate': 1}, ses)
            nc = max(1, m['cuadros'])
            for k, nom, esc in (('LayoutCount', 'reflujos', 1), ('RecalcStyleCount', 'estilos', 1), ('LayoutDuration', 'reflujoMs', 1000), ('RecalcStyleDuration', 'estiloMs', 1000), ('ScriptDuration', 'scriptMs', 1000)):
                m[nom] = round((met1.get(k, 0) - met0.get(k, 0)) * esc / nc, 2)
            if a.perfil:
                m['perfil'] = resumen_perfil(cdp.call('Profiler.stop', {}, ses, 120)['profile'])
            avtest.evaluar(cdp, ses, SALIR_JS[modo], 30, promesa=False)
            cdp.bombear(2.0)
            m['errores'] = errores[n0:][:3]
            print('    traza dpr/calidad por segundo: %s · fin: media %s ms, p95 %s ms' % (m['traza'], m['msFin'], m['p95Fin']), flush=True)
            for linea in m.get('perfil', []):
                print('    %5.1f %%  %s' % (linea[0], linea[1]), flush=True)
            res['modos'][modo] = m
            print('· %-9s %3d FPS · %5.1f ms media · mediana %5.1f · p95 %5.1f · p99 %5.1f · peor %6.1f · >50 ms %3d/%d · JS %5.1f ms/cuadro (peor %6.1f) · %3d tareas largas · por cuadro: %4.2f reflujos (%4.1f ms), %4.2f estilos (%4.1f ms), script %5.1f ms · %4s calls · %7s tris · %s dpr %s · geom %s tex %s heap %s MB%s' % (
                modo, m['fps'], m['ms'], m['mediana'], m['p95'], m['p99'], m['peor'], m['mas50'], m['cuadros'], m['jsMs'], m['jsPeor'], m['largas'], m['reflujos'], m['reflujoMs'], m['estilos'], m['estiloMs'], m['scriptMs'], m['calls'], m['triangulos'], m['calidad'], m['dpr'], m['geoms'], m['texs'], m['heapMB'],
                (' · ERRORES ' + str(m['errores'])) if m['errores'] else ''), flush=True)
        try:
            cdp.call('Browser.close', {}, None, 5)
        except Exception:
            pass
    finally:
        if ws:
            ws.cerrar()
        if chrome:
            chrome.cerrar()
        if srv:
            srv.cerrar()
    todo = json.load(open(a.salida)) if os.path.exists(a.salida) else {}
    todo[a.nombre] = res
    json.dump(todo, open(a.salida, 'w'), indent=1, ensure_ascii=False)
    print('· medidas en %s [%s] · %s' % (a.salida, a.nombre, '0 errores de consola' if not errores else 'errores: %s' % errores[:3]), flush=True)
    return 1 if errores or any('error' in v for v in res['modos'].values()) else 0


if __name__ == '__main__':
    sys.exit(main())
