#!/usr/bin/env python3
"""Amazona Verse · lento en móvil (4-nov). Mide tirones en móvil emulado: tras la pantalla de carga, 60 s caminando/volando + 30 s en la ciudad (cap1)
o 60 s por la zona del río (ep4). Perfil de CPU anclado para atribuir los cuadros > 200 ms.
uso: AV_CHROME=… python3 -I tools/build/lento_movil.py <build>/site --movil ios|android --pack cap1|ep4 [--guardada] [--salida F.json]"""
import argparse, json, os, sys, tempfile, time

ap = argparse.ArgumentParser()
ap.add_argument('raiz'); ap.add_argument('--repo', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
ap.add_argument('--movil', default='ios'); ap.add_argument('--pack', default='cap1')
ap.add_argument('--guardada', action='store_true', help='entra, juega 20 s, recarga con la partida guardada y mide')
ap.add_argument('--sinperfil', action='store_true')
ap.add_argument('--salida', default='')
ap.add_argument('--extra', default='', help='query extra')
a = ap.parse_args()
sys.path.insert(0, os.path.join(a.repo, 'tools', 'build'))
import avtest, look_capturas  # noqa

UA = {'ios': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      'android': 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'}[a.movil]
W, H, DPR = (390, 844, 3) if a.movil == 'ios' else (412, 915, 2.625)
P = json.load(open(os.path.join(a.repo, 'tools', 'build', 'config.json')))['pruebas']

SONDA = r'''(() => { const Q = window.__lm = { f: [], on: false }; let t = 0;
  const f = n => { if (t && Q.on) Q.f.push([Math.round(t * 10) / 10, Math.round((n - t) * 10) / 10]); t = n; requestAnimationFrame(f); }; requestAnimationFrame(f); })();'''

ANCLA = r'''(() => { window.__anclaT = performance.now(); (function __ancla() { const t0 = performance.now(); let x = 0; while (performance.now() - t0 < 60) x += Math.sqrt(x + 1); return x; })(); return window.__anclaT; })()'''

RUTA = r'''(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms));
  const G = AV.G, S = G.S, M = G.fisica.MOVE, Q = window.__lm, log = [];
  const k = (t, key, code) => dispatchEvent(new KeyboardEvent(t, { key, code, bubbles: true }));
  const apunta = (x, z) => { const dx = x - S.pos.x, dz = z - S.pos.z; G.camara.yaw = Math.atan2(-dx, -dz); return Math.hypot(dx, dz); };
  const PACK = '%s';
  const x0 = S.pos.x, z0 = S.pos.z;
  const tramos = PACK === 'cap1'
    ? [{ s: 15, x: x0 + 60, z: z0 + 10, vuela: false }, { s: 45, x: -34, z: -144, vuela: true, alto: 14 }, { s: 30, x: -34, z: -144, vuela: false, ciudad: true }]
    : [{ s: 20, x: x0 + 50, z: z0, vuela: false }, { s: 40, x: x0 + 60, z: z0 - 160, vuela: true, alto: 10 }];
  Q.f = []; Q.on = true; const T0 = performance.now(); let marcas = [];
  for (const tr of tramos) {
    marcas.push([Math.round(performance.now()), tr.ciudad ? 'ciudad' : tr.vuela ? 'vuelo' : 'camina']);
    if (tr.ciudad) { if (Math.hypot(S.pos.x - tr.x, S.pos.z - tr.z) > 40) { log.push('no llegó a la ciudad: salta desde ' + Math.round(S.pos.x) + ',' + Math.round(S.pos.z)); S.pos.x = tr.x; S.pos.z = tr.z; S.pos.y = G.terreno.height(tr.x, tr.z) + 8; } if (M.flying) G.fisica.land(); }
    if (tr.vuela && !M.flying) G.fisica.startFlying();
    k('keydown', 'w', 'KeyW');
    const t1 = performance.now(); let i = 0;
    while (performance.now() - t1 < tr.s * 1000) {
      i++;
      if (tr.ciudad) { const a = (performance.now() - t1) / 4000; apunta(tr.x + Math.cos(a) * 18, tr.z + Math.sin(a) * 18); }
      else { const d = apunta(tr.x, tr.z); if (d < 6) { k('keyup', 'w', 'KeyW'); } }
      if (tr.vuela && M.flying) { const sobre = S.pos.y - G.terreno.height(S.pos.x, S.pos.z); if (sobre < tr.alto) k('keydown', ' ', 'Space'); else k('keyup', ' ', 'Space'); }
      if (i %% 20 === 0) log.push(Math.round((performance.now() - T0) / 1000) + 's ' + Math.round(S.pos.x) + ',' + Math.round(S.pos.y) + ',' + Math.round(S.pos.z) + (M.flying ? ' vuela' : ''));
      await sleep(100);
    }
    k('keyup', 'w', 'KeyW'); k('keyup', ' ', 'Space');
  }
  Q.on = false;
  let cal = null; try { cal = G.renderer.calidad && G.renderer.calidad.nivel; } catch (e) {}
  let st = {}; try { st = G.renderer.stats ? G.renderer.stats() : {}; } catch (e) {}
  return JSON.stringify({ f: Q.f, marcas, log, calidad: cal, stats: { texMB: st.texturasMB, calls: st.calls, dpr: st.dpr }, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null });
})()''' % a.pack


def resumen(fr):
    d = sorted(x[1] for x in fr); n = len(d)
    q = lambda p: d[min(n - 1, int(n * p))] if n else 0
    return {'n': n, 'p50': q(.5), 'p95': q(.95), 'max': d[-1] if n else 0, 'mas50': sum(x > 50 for x in d), 'mas100': sum(x > 100 for x in d), 'mas200': sum(x > 200 for x in d)}


def atribuir(pr, desde_us, hasta_us, N=6):
    nodos = {n['id']: n for n in pr['nodes']}
    padre = {c: n['id'] for n in pr['nodes'] for c in n.get('children') or []}
    t = pr['startTime']; S, D = pr['samples'], pr['timeDeltas']; propio, juego = {}, {}
    for i in range(1, len(S)):
        t += D[i]
        if t < desde_us or t > hasta_us:
            continue
        sid = S[i - 1]; cf = nodos[sid]['callFrame']; us = D[i]
        k = '%s %s:%d' % (cf.get('functionName') or '(anon)', (cf.get('url') or '').split('/')[-1], cf.get('lineNumber', -1) + 1)
        propio[k] = propio.get(k, 0) + us
        n, pila = sid, []
        while True:
            f = nodos[n]['callFrame']; u = f.get('url') or ''
            if ('/src/' in u or '/content/' in u) and len(pila) < 3:
                pila.append('%s %s:%d' % (f.get('functionName') or '(anon)', u.split('/')[-1], f.get('lineNumber', -1) + 1))
            if n not in padre:
                break
            n = padre[n]
        kj = ' < '.join(pila) or '(fuera del juego)'
        juego[kj] = juego.get(kj, 0) + us
    top = lambda m: [(round(v / 1000), k) for k, v in sorted(m.items(), key=lambda x: -x[1])[:N]]
    return {'propio': top(propio), 'juego': top(juego)}


errores = []
def al_evento(m):
    me, p = m.get('method'), m.get('params') or {}
    if me == 'Runtime.exceptionThrown':
        d = p.get('exceptionDetails') or {}; errores.append(((d.get('exception') or {}).get('description') or d.get('text') or '')[:300])
    elif me == 'Runtime.consoleAPICalled' and p.get('type') in ('error', 'assert'):
        errores.append(' '.join(str(x.get('value', x.get('description', ''))) for x in p.get('args') or [])[:300])

srv = chrome = ws = None; res = {'movil': a.movil, 'pack': a.pack, 'guardada': a.guardada}
try:
    srv = avtest.Servidor(os.path.abspath(a.raiz), 0, None)
    origen = 'http://127.0.0.1:%d' % srv.puerto
    chrome = look_capturas.ChromePaciente(P, set(P['puertos_prohibidos']), os.path.join(tempfile.mkdtemp(prefix='lento-'), 'chrome.log'))
    ws = avtest.WS('ws://127.0.0.1:%d%s' % (chrome.puerto, chrome.ws_path)); cdp = avtest.CDP(ws, al_evento)
    tid = cdp.call('Target.createTarget', {'url': 'about:blank'})['targetId']
    ses = cdp.call('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
    for me in ('Page.enable', 'Runtime.enable', 'Log.enable'):
        cdp.call(me, {}, ses)
    cdp.call('Emulation.setDeviceMetricsOverride', {'width': W, 'height': H, 'deviceScaleFactor': DPR, 'mobile': True}, ses)
    cdp.call('Emulation.setTouchEmulationEnabled', {'enabled': True, 'maxTouchPoints': 5}, ses)
    cdp.call('Emulation.setUserAgentOverride', {'userAgent': UA}, ses)
    cdp.call('Emulation.setCPUThrottlingRate', {'rate': 4}, ses)
    sc = cdp.call('Page.addScriptToEvaluateOnNewDocument', {'source': 'try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}'}, ses)['identifier']
    cdp.call('Page.addScriptToEvaluateOnNewDocument', {'source': SONDA}, ses)
    url = '%s/index.html?qa=1%s%s' % (origen, '' if a.pack == 'cap1' else '&pack=' + a.pack, a.extra)

    def cargar():
        t = time.monotonic(); cdp.call('Page.navigate', {'url': url}, ses)
        while time.monotonic() - t < P['espera_listo_s'] * 2:
            try:
                if avtest.evaluar(cdp, ses, '!!(%s)' % P['listo_js'], 10, promesa=False):
                    return
            except Exception:
                pass
            cdp.bombear(0.5)
        raise RuntimeError('no arrancó')
    cargar()
    print('· jugar:', avtest.evaluar(cdp, ses, P['preparar_js'], 300), flush=True)
    if a.guardada:
        avtest.evaluar(cdp, ses, '(async () => { await new Promise(r => setTimeout(r, 20000)); try { AV.G.guardado && AV.G.guardado.guardar && AV.G.guardado.guardar(); } catch (e) {} return "ok"; })()', 60)
        cdp.call('Page.removeScriptToEvaluateOnNewDocument', {'identifier': sc}, ses)
        cargar()
        r = avtest.evaluar(cdp, ses, '''(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)); const t = document.getElementById('title');
          if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); b && b.click(); }
          await sleep(1500); const cr = document.getElementById('creator'); const C = AV.cargaEsperar ? await AV.cargaEsperar(30000) : null;
          return 'recarga · creador ' + (cr && !cr.hidden ? 'ABIERTO' : 'cerrado') + (C ? ' · carga ' + C.ms + ' ms' : ''); })()''', 120)
        print('· guardada:', r, flush=True)
    if not a.sinperfil:
        cdp.call('Profiler.enable', {}, ses); cdp.call('Profiler.setSamplingInterval', {'interval': 2000}, ses); cdp.call('Profiler.start', {}, ses)
        tA = avtest.evaluar(cdp, ses, ANCLA, 30, promesa=False)
    out = json.loads(avtest.evaluar(cdp, ses, RUTA, 400))
    pr = None
    if not a.sinperfil:
        pr = cdp.call('Profiler.stop', {}, ses, 300)['profile']
        nodos = {n['id']: n for n in pr['nodes']}; t = pr['startTime']; ancla_us = None
        for i in range(1, len(pr['samples'])):
            t += pr['timeDeltas'][i]
            if nodos[pr['samples'][i]]['callFrame'].get('functionName') == '__ancla':
                ancla_us = t; break
        off = ancla_us - tA * 1000 if ancla_us else None
    fr = out['f']; m = out['marcas']
    tramos = {}
    for j, (t0, nom) in enumerate(m):
        t1 = m[j + 1][0] if j + 1 < len(m) else 1e18
        tramos[nom] = resumen([x for x in fr if t0 <= x[0] < t1])
    res.update({'total': resumen(fr), 'tramos': tramos, 'calidad': out['calidad'], 'stats': out['stats'], 'heap': out['heap'], 'log': out['log'], 'errores': errores})
    largos = sorted([x for x in fr if x[1] > 150], key=lambda x: -x[1])[:12]
    res['largos'] = []
    for t, d in largos:
        e = {'t_s': round((t - m[0][0]) / 1000, 1), 'ms': d}
        if pr and off is not None:
            e.update(atribuir(pr, t * 1000 + off, (t + d) * 1000 + off))
        res['largos'].append(e)
    if pr and off is not None:  # perfil completo: top del juego
        res['juego_total'] = atribuir(pr, m[0][0] * 1000 + off, 1e18, 60)
finally:
    if ws: ws.cerrar()
    if chrome: chrome.cerrar()
    if srv: srv.cerrar()
print(json.dumps({k: res.get(k) for k in ('movil', 'pack', 'calidad', 'total', 'tramos', 'stats', 'heap')}, ensure_ascii=False))
for e in res.get('largos', []):
    print('  largo %5.0f ms @%5.1fs' % (e['ms'], e['t_s']), '| juego:', e.get('juego', [])[:3], '| propio:', e.get('propio', [])[:3])
print('  log:', res.get('log', [])[::3][:12]); print('  errores:', res.get('errores'))
if a.salida:
    json.dump(res, open(a.salida, 'w'), indent=1, ensure_ascii=False)
