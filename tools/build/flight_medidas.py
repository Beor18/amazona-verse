#!/usr/bin/env python3
"""Amazona Verse · medidas y capturas del prototipo Amazona Flight (C14; docs/equipo/MINIJUEGOS.md).

    python3.11 -I tools/build/flight_medidas.py [--raiz .] [--salida docs/img] [--calidad alto] [--movil] [--segundos 14] [--reinicios 50]

Sirve --raiz (el repo o una build) con el servidor y el Chrome sin interfaz de avtest.py (GPU real por Metal), pasa el flujo de jugador
nuevo, abre Amazona Flight (AV.flight(), el mismo camino que ?mini=flight) y mide:
- «listo»: 180 cuadros con Vittata cernida antes del primer toque (ms media/mediana/p90, draw calls, triángulos, programas, texturas
  estimadas en MB, heap JS);
- «juego»: --segundos s de partida con un piloto automático (la misma regla que el robot de AV.flightTest, con el tiempo real del
  navegador), midiendo todos los cuadros; apunta los obstáculos superados;
- «reinicios»: --reinicios partidas cortas seguidas (otra vez + toque + robot) y las geometrías y texturas del renderer antes y
  después (tienen que ser las mismas);
- «salir»: al salir, geometrías y texturas vuelven a las de antes de entrar (el pool se libera) y no queda nada visible del vuelo.
Guarda capturas de la pantalla entera (con HUD) en <salida>/c14_flight_<listo|juego|fin>[_movil].jpg y las medidas en
<salida>/c14_flight_medidas.json (clave 'escritorio' o 'movil'). --movil emula un celular (390×844, dpr 2, táctil); el juego elige su
calidad como en un móvil, salvo --calidad. Una captura a la vez (la Mac va cargada). Salida: 0 si todo cuadra, 1 si algo falla.
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
import look_capturas  # noqa: E402  (ChromePaciente y MEDIR_JS)

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(AQUI, '..', '..'))

# Piloto automático en tiempo real (la regla del robot de flightTest) sobre la API pública y _dev del módulo
PILOTO_JS = r'''
  const api = AV.G.flightApi, D = api._dev, P = api.P, J = D.J, st = D.st, obst = D.obst, hd = D.huecoDe;
  let desde = 0, prev = performance.now();
  const decide = () => { const now = performance.now(), dt = Math.min(0.05, (now - prev) / 1000); prev = now; desde += dt;
    if (st.fase !== 'juego') return;
    const k0 = obst.findIndex(q => q.x + P.anchoColumna + P.radio >= J.dist), sig = k0 >= 0 ? obst[k0] : null, sig2 = k0 >= 0 ? obst[k0 + 1] : null;
    if (!sig) return;
    const [b0, b1] = hd(sig), c = (b0 + b1) / 2, r = P.radio, tH = (sig.x - J.dist) / J.v, apice = J.y + P.impulso * P.impulso / (2 * P.gravedad);
    const t2 = sig2 ? (sig2.x - J.dist) / J.v : 9, yEn2 = J.y + P.impulso * t2 - 0.5 * P.gravedad * t2 * t2;
    const seguro = apice <= b1 - r - 0.1 && (t2 > 1.2 || yEn2 <= hd(sig2)[1] - r - 0.1) && !(tH > 0 && tH < P.frenado && J.y + r < b1);
    const yEn = J.y + J.vy * 0.2 - 0.5 * P.gravedad * 0.04, hace = (J.vy <= 0 && yEn < c - 0.5) || yEn < b0 + r + 0.4, emergencia = J.y + J.vy * 2 * dt < b0 + r + 0.15;
    if (desde >= 0.12 && ((hace && seguro) || emergencia)) { api.toque({ sinFx: !!window.__sinFx }); desde = 0; } };
'''

MEDIDA_JS = r'''(async () => {
  const AV = window.AV, G = AV.G, R = G.renderer;''' + look_capturas.MEDIR_JS + r'''
  const cuadros = n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  const base = () => (AV.look && AV.look.medir ? AV.look.medir() : R.stats());
  const mem = () => ({ geometrias: R.renderer.info.memory.geometries, texturas: R.renderer.info.memory.textures });
  const heap = () => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null);
  const foto = {};
  if (G.clima && G.clima.fijar) G.clima.fijar('sol', { inmediato: true, forzar: true });
  // Calentar lo perezoso del motor que el vuelo usa (atlas y sprites de fx, gotas del agua): no son del minijuego y viven ~1 s
  try { G.fx.burst(G.S.pos.x, G.S.pos.y + 1, G.S.pos.z, 'feathers', 3, G.S.pos.y + 3); G.agua.spray(G.S.pos.x, G.S.pos.y + 1, G.S.pos.z); } catch (e) { /* sin fx */ }
  await new Promise(r => setTimeout(r, 1600)); await cuadros(2);
  const out = { antes: mem(), calidad: R.calidad.nivel };
  const t0 = performance.now();
  const ok = await AV.flight();
  out.abrirMs = Math.round(performance.now() - t0);
  if (ok !== true) return JSON.stringify({ error: 'no abrió: ' + ok });
  ''' + PILOTO_JS + r'''
  await cuadros(90);
  out.listo = await medirCuadros(180, base()); out.listo.heapMB = heap(); out.listo.mem = mem(); out.listo.estado = api.estado();
  foto.listo = true; window.__fotos = { listo: performance.now() };
  // ---- partida con piloto automático, midiendo todos los cuadros ----
  api.otraVez(); api.toque(); prev = performance.now();
  let vivo = true; const bucle = () => { if (!vivo) return; decide(); requestAnimationFrame(bucle); }; requestAnimationFrame(bucle);
  const seg = %(segundos)d; const dts = []; let pv = 0, fotoJuego = null;
  await new Promise(r => { const t1 = performance.now(); const f = t => { if (pv) dts.push(t - pv); pv = t; if (!fotoJuego && t - t1 > seg * 1000 * 0.45) fotoJuego = t; if (t - t1 >= seg * 1000 || api.fase !== 'juego') return r(); requestAnimationFrame(f); }; requestAnimationFrame(f); });
  vivo = false;
  const o = dts.slice().sort((a, b) => a - b), q = p => o[Math.min(o.length - 1, Math.floor(p * o.length))], ms = dts.reduce((a, b) => a + b, 0) / Math.max(1, dts.length);
  out.juego = Object.assign(base(), { ms: Math.round(ms * 100) / 100, fpsMedidos: Math.round(1000 / ms), msMediana: Math.round(q(0.5) * 100) / 100, msP90: Math.round(q(0.9) * 100) / 100, cuadros: dts.length, segundos: Math.round(dts.reduce((a, b) => a + b, 0) / 100) / 10, heapMB: heap(), mem: mem(), estado: api.estado() });
  // ---- reinicios seguidos: partidas cortas con el robot síncrono (como en flightTest) ----
  await cuadros(2); const m0 = mem();
  const robot = (n, dt) => { let desde = 0, pasos = 0, n0 = J.n; while (st.fase === 'juego' && J.n - n0 < n && pasos++ < 100000) { prev = performance.now() - dt * 1000; decide(); D.paso(dt); desde += dt; } };
  const tR = performance.now(); window.__sinFx = true;
  for (let i = 0; i < %(reinicios)d; i++) { api.otraVez(); api.toque({ sinFx: true }); robot(15 + (i %% 5), 1 / 30); if (i %% 10 === 9) await cuadros(1); }
  window.__sinFx = false; await cuadros(3);
  out.reinicios = { n: %(reinicios)d, ms: Math.round(performance.now() - tR), antes: m0, despues: mem(), heapMB: heap(), instancias: api.estado().instancias };
  // ---- resultados a la vista para la captura ----
  if (api.fase === 'juego') { J.y = -1; D.paso(1 / 60); }
  await new Promise(r => setTimeout(r, 500)); await cuadros(2);
  out.fin = { fase: api.fase, panel: !!document.querySelector('#flight .fl-fin') && !document.querySelector('#flight .fl-fin').hidden, puntos: api.estado().puntos };
  return JSON.stringify(out);
})()'''

SALIR_JS = r'''(async () => {
  const AV = window.AV, G = AV.G, R = G.renderer, api = G.flightApi;
  const cuadros = n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  api.salir(); await new Promise(r => setTimeout(r, 1600)); await cuadros(3); // las plumas de fx de la última partida ya murieron
  const raiz = R.scene.children.find(o => o.name === 'flight');
  return JSON.stringify({ activo: api.activo, visible: !!(raiz && raiz.visible), hijos: raiz ? raiz.children.length : 0, mem: { geometrias: R.renderer.info.memory.geometries, texturas: R.renderer.info.memory.textures },
    clases: [...document.body.classList].filter(c => /flight|retos/.test(c)), fov: R.camera.fov, busy: G.ui.busy() });
})()'''


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--raiz', default=REPO)
    ap.add_argument('--salida', default=os.path.join(REPO, 'docs', 'img'))
    ap.add_argument('--calidad', default='')
    ap.add_argument('--movil', action='store_true', help='emula un celular (390×844, dpr 2, táctil)')
    ap.add_argument('--segundos', type=int, default=14)
    ap.add_argument('--reinicios', type=int, default=50)
    a = ap.parse_args()
    cfg = json.load(open(os.path.join(AQUI, 'config.json')))
    P = cfg['pruebas']
    os.makedirs(a.salida, exist_ok=True)
    ruta_med = os.path.join(a.salida, 'c14_flight_medidas.json')
    medidas = json.load(open(ruta_med)) if os.path.exists(ruta_med) else {}
    clave = 'movil' if a.movil else 'escritorio'
    suf = '_movil' if a.movil else ''
    estado = {'excepciones': [], 'consola': []}

    def al_evento(m):
        me, p = m.get('method'), m.get('params') or {}
        if me == 'Runtime.exceptionThrown':
            d = p.get('exceptionDetails') or {}
            estado['excepciones'].append('%s (%s:%s)' % (((d.get('exception') or {}).get('description') or d.get('text') or '')[:200], d.get('url', ''), d.get('lineNumber')))
        elif me == 'Runtime.consoleAPICalled' and p.get('type') in ('error', 'assert'):
            estado['consola'].append(' '.join(str(x.get('value', x.get('description', ''))) for x in p.get('args') or [])[:300])

    srv = chrome = ws = None
    fallos = []
    try:
        srv = avtest.Servidor(os.path.abspath(a.raiz), 0, None)
        origen = 'http://127.0.0.1:%d' % srv.puerto
        chrome = look_capturas.ChromePaciente(P, set(P['puertos_prohibidos']), os.path.join(tempfile.mkdtemp(prefix='flight-medidas-'), 'chrome.log'))
        ws = avtest.WS('ws://127.0.0.1:%d%s' % (chrome.puerto, chrome.ws_path))
        cdp = avtest.CDP(ws, al_evento)
        print('· servidor %s · Chrome %s · %s' % (origen, chrome.version, clave), flush=True)
        tid = cdp.call('Target.createTarget', {'url': 'about:blank'})['targetId']
        ses = cdp.call('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
        for me in ('Page.enable', 'Runtime.enable', 'Log.enable'):
            cdp.call(me, {}, ses)
        if a.movil:
            cdp.call('Emulation.setDeviceMetricsOverride', {'width': 390, 'height': 844, 'deviceScaleFactor': 2, 'mobile': True}, ses)
            cdp.call('Emulation.setTouchEmulationEnabled', {'enabled': True, 'maxTouchPoints': 5}, ses)
            cdp.call('Emulation.setUserAgentOverride', {'userAgent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'}, ses)
        cdp.call('Page.addScriptToEvaluateOnNewDocument', {'source': 'try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}'}, ses)
        url = '%s/index.html?clima=sol' % origen + ('&calidad=' + a.calidad if a.calidad else '')
        cdp.call('Page.navigate', {'url': url}, ses)
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
        cdp.bombear(1.0)
        prep = avtest.evaluar(cdp, ses, P['preparar_js'], 120)
        print('· juego listo en %.0f s · %s' % (time.monotonic() - t0, prep), flush=True)
        if not str(prep).startswith('ok'):
            raise avtest.Infra('flujo de jugador nuevo: %s' % prep)
        avtest.evaluar(cdp, ses, '(async () => { const G = window.AV.G; await (G.mundo && G.mundo.listo); return true; })()', 120)

        # Capturas en momentos concretos: listo (antes del primer toque), juego (a mitad de partida) y fin (resultados)
        def captura(nombre):
            d = cdp.call('Page.captureScreenshot', {'format': 'jpeg', 'quality': 84}, ses, 60)['data']
            ruta = os.path.join(a.salida, 'c14_flight_%s%s.jpg' % (nombre, suf))
            open(ruta, 'wb').write(base64.b64decode(d))
            return ruta

        # 1) abrir y medir «listo»; la captura de listo se toma aparte (la medida no debe incluirla)
        r = json.loads(avtest.evaluar(cdp, ses, '(async () => { const AV = window.AV; const ok = await AV.flight(); await new Promise(r => setTimeout(r, 1200)); return JSON.stringify({ ok, estado: AV.G.flightApi.estado() }); })()', 180))
        if r.get('ok') is not True:
            raise avtest.Infra('no abrió Amazona Flight: %s' % r)
        rutas = [captura('listo')]
        avtest.evaluar(cdp, ses, 'window.AV.G.flightApi.salir(); true', 30, promesa=False)
        cdp.bombear(0.5)
        # 2) la medida completa (listo, partida, reinicios, fin) en una sola corrida
        m = json.loads(avtest.evaluar(cdp, ses, MEDIDA_JS % {'segundos': a.segundos, 'reinicios': a.reinicios}, 600))
        if m.get('error'):
            raise avtest.Infra(m['error'])
        rutas.append(captura('fin'))
        # 3) captura de una partida en marcha: otra partida corta con el piloto, foto a los 4 s
        avtest.evaluar(cdp, ses, '(async () => { const AV = window.AV;' + PILOTO_JS + ' api.otraVez(); api.toque(); let vivo = true; window.__paraPiloto = () => { vivo = false; }; const bucle = () => { if (!vivo) return; decide(); requestAnimationFrame(bucle); }; requestAnimationFrame(bucle); await new Promise(r => setTimeout(r, 4200)); return api.estado().puntos; })()', 60)
        rutas.append(captura('juego'))
        avtest.evaluar(cdp, ses, 'window.__paraPiloto && window.__paraPiloto(); true', 10, promesa=False)
        # 4) salir: nada queda y la memoria vuelve
        s = json.loads(avtest.evaluar(cdp, ses, SALIR_JS, 60))
        m['salir'] = s
        m['movil'] = bool(a.movil)
        m['errores'] = (estado['excepciones'] + estado['consola'])[:5]
        medidas[clave] = m
        json.dump(medidas, open(ruta_med, 'w'), indent=1, ensure_ascii=False)
        # Resumen y comprobaciones
        li, ju, re = m['listo'], m['juego'], m['reinicios']
        print('· listo : %.1f ms media · %s mediana · %s p90 (%s FPS) · %s calls · %s tris · %s programas · %s MB tex · heap %s MB · calidad %s' % (
            li.get('ms', 0), li.get('msMediana'), li.get('msP90'), li.get('fpsMedidos'), li.get('calls'), li.get('triangulos'), li.get('programas'), li.get('texturasMB'), li.get('heapMB'), m.get('calidad')), flush=True)
        print('· juego : %.1f ms media · %s mediana · %s p90 (%s FPS) · %s calls · %s tris · heap %s MB · %s s · %s obstáculos superados' % (
            ju.get('ms', 0), ju.get('msMediana'), ju.get('msP90'), ju.get('fpsMedidos'), ju.get('calls'), ju.get('triangulos'), ju.get('heapMB'), ju.get('segundos'), ju['estado']['puntos']), flush=True)
        print('· %d reinicios en %d ms: geometrías %s → %s · texturas %s → %s · heap %s MB · instancias vivas %s' % (
            re['n'], re['ms'], re['antes']['geometrias'], re['despues']['geometrias'], re['antes']['texturas'], re['despues']['texturas'], re['heapMB'], re['instancias']), flush=True)
        print('· salir : activo %s · visible %s · geometrías %s (antes de entrar %s) · texturas %s (antes %s) · clases %s · fov %s · busy %s' % (
            s['activo'], s['visible'], s['mem']['geometrias'], m['antes']['geometrias'], s['mem']['texturas'], m['antes']['texturas'], s['clases'], s['fov'], s['busy']), flush=True)
        print('· capturas: ' + ', '.join(os.path.relpath(x, REPO) for x in rutas), flush=True)
        if re['antes'] != re['despues']:
            fallos.append('los %d reinicios cambian geometrías o texturas' % re['n'])
        if s['activo'] or s['visible'] or s['clases'] or s['busy']:
            fallos.append('al salir queda algo del vuelo')
        if s['mem']['geometrias'] > m['antes']['geometrias'] or s['mem']['texturas'] > m['antes']['texturas']:
            fallos.append('al salir no se liberan geometrías o texturas (%s vs %s)' % (s['mem'], m['antes']))
        if not m['fin']['panel']:
            fallos.append('los resultados no se ven')
        if m['errores']:
            fallos.append('errores de consola: %s' % m['errores'])
        print('· %s' % ('0 errores de consola' if not m['errores'] else 'errores de consola: %s' % m['errores']), flush=True)
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
    if fallos:
        print('· FALLA: ' + ' | '.join(fallos), flush=True)
        return 1
    print('· todo cuadra', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
