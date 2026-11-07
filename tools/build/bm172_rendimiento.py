#!/usr/bin/env python3
"""Amazona Verse · BM172: rendimiento con la GPU de Apple emulando un iPad (1024×1366, DPR 2, táctil), en calidad medio y bajo.

    python3.11 -I tools/build/bm172_rendimiento.py --raiz <build> [--calidades medio,bajo] [--segundos 15] [--salida <json>]

Reutiliza MEDIR_JS/RAF_JS de movil_modos.py. Sin freno de CPU (lo que se mide es la GPU Metal de la Mac, la familia de la del iPad).
Escenas (cap. 1): arranque, villa, minigolf, chispa, moon, guardian, puerto; y ciudad36 con ?pack=ep6. Captura en docs/img/bm172/ si baja de 30 FPS.
"""
import argparse, base64, json, os, sys, tempfile, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import avtest, look_capturas, movil_modos as MM  # noqa: E402

REPO = MM.REPO
UA = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

IR = r'''const G = window.AV.G, S = G.S, M = G.fisica.MOVE;
  const ir = (x, z) => { if (M.flying) { try { G.fisica.land(); } catch (e) {} } G.pruebas.teleport(x, z, 0, -1); G.pruebas.tick(0.1); };
  const W = on => dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { key: 'w', code: 'KeyW' }));
  const giro = () => { if (!window.__vivo) return; G.camara.yaw += 0.004; requestAnimationFrame(giro); };
  const esperaStream = async (x, z) => { try { if (G.streaming && G.streaming.gestor) await G.streaming.gestor.alrededor(x, z); } catch (e) {} await new Promise(r => setTimeout(r, 2500)); };
  dispatchEvent(new PointerEvent('pointerdown')); dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', code: 'ShiftLeft' })); dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift', code: 'ShiftLeft' }));
  const hay = async n => { for (let i = 0; i < 90 && !G[n]; i++) await new Promise(r => setTimeout(r, 500)); return G[n]; };
  if (G.clima && G.clima.fijar) G.clima.fijar('sol', { inmediato: true, forzar: true });
  G.pausa && G.pausa.set && G.pausa.set('captura', false);
'''
def escena(cuerpo, salir):
    return ('(async () => { ' + IR + cuerpo + ' })()', '(async () => { ' + IR + salir + " return 'ok'; })()")

ESCENAS = {
    'arranque': escena("window.__vivo = false; return 'ok arranque';", "window.__vivo = false;"),
    'villa': escena("const L = (G.terreno.mapa || {}).lugares || {}; const v = L.villa; if (!v) return 'sin villa'; ir(v.x, v.z); await esperaStream(v.x, v.z); window.__vivo = true; giro(); W(true); return 'ok villa';",
                    "window.__vivo = false; W(false);"),
    'minigolf': escena("if (!await hay('v18minigolf')) return 'sin minigolf'; window.__vivo = false; const o = G.v18minigolf.irYJugar(); await new Promise(r => setTimeout(r, 3000)); return o ? 'ok minigolf' : 'no abrió minigolf ' + JSON.stringify(G.v18minigolf.estado().fase);",
                       "try { G.v18minigolf.salir(); } catch (e) {} window.__vivo = false;"),
    'chispa': escena("const A = await hay('v18chispa'); if (!A) return 'sin chispa'; ir(A.SITIO.salida.x, A.SITIO.salida.z); await esperaStream(A.SITIO.salida.x, A.SITIO.salida.z); const o = A.empezar({ forzar: true }); window.__vivo = false; W(true); return o ? 'ok chispa' : 'no arrancó chispa';",
                     "try { G.v18chispa.cancelar(); } catch (e) {} W(false);"),
    'moon': escena("const A = await hay('v18moon'); if (!A) return 'sin moon'; ir(A.SITIO.x, A.SITIO.z); await esperaStream(A.SITIO.x, A.SITIO.z); const o = A.empezar({ forzar: true }); window.__vivo = false; return o ? 'ok moon' : 'no arrancó moon';",
                   "try { G.v18moon.cancelar(); } catch (e) {}"),
    'guardian': escena("const A = await hay('v18guardian'); if (!A) return 'sin guardian'; ir(A.SITIO.salida.x, A.SITIO.salida.z); await esperaStream(A.SITIO.salida.x, A.SITIO.salida.z); const o = A.empezar({ forzar: true }); window.__vivo = false; W(true); return o ? 'ok guardian' : 'no arrancó guardian';",
                       "try { G.v18guardian.cancelar(); } catch (e) {} W(false);"),
    'puerto': escena("const P = await hay('v18puerto'); if (!P) return 'sin puerto'; const s = P.SITIO.plaza; ir(s.x, s.z); await esperaStream(s.x, s.z); window.__vivo = true; giro(); return 'ok puerto';",
                     "window.__vivo = false;"),
    'ciudad36': escena("const x = -40, z = -131; ir(x, z); await esperaStream(x, z); window.__vivo = true; giro(); W(true); return 'ok ciudad36';",
                       "window.__vivo = false; W(false);"),
}
CAP1 = ['arranque', 'villa', 'minigolf', 'chispa', 'moon', 'guardian', 'puerto']


def abrir(cdp, ses, origen, P, calidad, pack, errores):
    cdp.call('Page.navigate', {'url': '%s/index.html?clima=sol&calidad=%s%s' % (origen, calidad, '&pack=' + pack if pack else '')}, ses)
    t0 = time.monotonic()
    while time.monotonic() - t0 < P['espera_listo_s']:
        try:
            if avtest.evaluar(cdp, ses, '!!(%s)' % P['listo_js'], 10, promesa=False):
                break
        except (avtest.CDPError, avtest.JSError, TimeoutError):
            pass
        cdp.bombear(0.5)
    else:
        raise avtest.Infra('no arrancó')
    cdp.bombear(1.0)
    prep = avtest.evaluar(cdp, ses, P['preparar_js'], 120)
    if not str(prep).startswith('ok'):
        raise avtest.Infra('flujo nuevo: %s' % prep)
    avtest.evaluar(cdp, ses, '(async () => { const G = window.AV.G; await (G.mundo && G.mundo.listo); await new Promise(r => setTimeout(r, 3000)); return true; })()', 120)
    return round(time.monotonic() - t0, 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--raiz', required=True); ap.add_argument('--calidades', default='medio,bajo')
    ap.add_argument('--escenas', default=','.join(CAP1 + ['ciudad36'])); ap.add_argument('--segundos', type=float, default=15)
    ap.add_argument('--salida', default=os.path.join(tempfile.gettempdir(), 'bm172.json'))
    ap.add_argument('--capturas', default=os.path.join(REPO, 'docs', 'img', 'bm172'))
    a = ap.parse_args()
    P = json.load(open(os.path.join(MM.AQUI, 'config.json')))['pruebas']
    errores = []
    def al_evento(m):
        me, p = m.get('method'), m.get('params') or {}
        if me == 'Runtime.exceptionThrown':
            d = p.get('exceptionDetails') or {}; errores.append(((d.get('exception') or {}).get('description') or d.get('text') or '')[:200])
        elif me == 'Runtime.consoleAPICalled' and p.get('type') in ('error', 'assert'):
            errores.append(' '.join(str(x.get('value', x.get('description', ''))) for x in p.get('args') or [])[:300])
    srv = chrome = ws = None; res = {}
    try:
        srv = avtest.Servidor(os.path.abspath(a.raiz), 0, None); origen = 'http://127.0.0.1:%d' % srv.puerto
        chrome = look_capturas.ChromePaciente(P, set(P['puertos_prohibidos']), os.path.join(tempfile.mkdtemp(prefix='bm172-'), 'chrome.log'))
        ws = avtest.WS('ws://127.0.0.1:%d%s' % (chrome.puerto, chrome.ws_path)); cdp = avtest.CDP(ws, al_evento)
        tid = cdp.call('Target.createTarget', {'url': 'about:blank'})['targetId']
        ses = cdp.call('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
        for me in ('Page.enable', 'Runtime.enable', 'Log.enable', 'Performance.enable'):
            cdp.call(me, {}, ses)
        cdp.call('Emulation.setDeviceMetricsOverride', {'width': 1024, 'height': 1366, 'deviceScaleFactor': 2, 'mobile': True}, ses)
        cdp.call('Emulation.setTouchEmulationEnabled', {'enabled': True, 'maxTouchPoints': 5}, ses)
        cdp.call('Emulation.setUserAgentOverride', {'userAgent': UA}, ses)
        cdp.call('Page.addScriptToEvaluateOnNewDocument', {'source': 'try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}' + MM.RAF_JS}, ses)
        print('· Chrome %s · iPad 1024×1366 dpr 2' % chrome.version, flush=True)
        os.makedirs(a.capturas, exist_ok=True)
        escs = [x for x in a.escenas.split(',') if x]
        for cal in [x for x in a.calidades.split(',') if x]:
            for pack, grupo in (('', [e for e in escs if e in CAP1]), ('ep6', [e for e in escs if e == 'ciudad36'])):
                if not grupo:
                    continue
                t = abrir(cdp, ses, origen, P, cal, pack, errores)
                print('· [%s%s] listo en %.0f s' % (cal, ' ' + pack if pack else '', t), flush=True)
                for e in grupo:
                    n0 = len(errores); k = '%s/%s' % (cal, e)
                    ab, sal = ESCENAS[e]
                    try:
                        r = avtest.evaluar(cdp, ses, ab, 120)
                        if not str(r).startswith('ok'):
                            res[k] = {'error': r}; print('  %-18s NO ABRIÓ: %s' % (k, r), flush=True); avtest.evaluar(cdp, ses, sal, 30); continue
                        cdp.bombear(1.5)
                        m = json.loads(avtest.evaluar(cdp, ses, MM.MEDIR_JS % a.segundos, 60 + a.segundos * 10))
                        m['heapMB'] = avtest.evaluar(cdp, ses, 'performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null', 10, promesa=False)
                        m['calidadFinal'] = avtest.evaluar(cdp, ses, 'AV.G.renderer.stats().calidad', 10, promesa=False)
                        m['texMB'] = avtest.evaluar(cdp, ses, 'AV.G.renderer.stats().texturasMB', 10, promesa=False)
                        m['fpsMin'] = round(1000 / m['p99']) if m['p99'] else None
                        if m['fps'] < 30 or (m['fpsMin'] or 99) < 30:
                            png = cdp.call('Page.captureScreenshot', {'format': 'png'}, ses, 60)['data']
                            ruta = os.path.join(a.capturas, '%s_%s.png' % (cal, e)); open(ruta, 'wb').write(base64.b64decode(png)); m['captura'] = os.path.relpath(ruta, REPO)
                        avtest.evaluar(cdp, ses, sal, 30)
                    except Exception as ex:
                        m = {'error': repr(ex)[:200]}
                    cdp.bombear(2.0)
                    m['errores'] = errores[n0:][:3]; res[k] = m
                    print('  %-18s %s' % (k, json.dumps({x: m.get(x) for x in ('fps', 'fpsMin', 'mediana', 'p95', 'peor', 'mas50', 'calls', 'triangulos', 'heapMB', 'texMB', 'calidadFinal', 'captura', 'error', 'errores')}, ensure_ascii=False)), flush=True)
        try: cdp.call('Browser.close', {}, None, 5)
        except Exception: pass
    finally:
        if ws: ws.cerrar()
        if chrome: chrome.cerrar()
        if srv: srv.cerrar()
    json.dump(res, open(a.salida, 'w'), indent=1, ensure_ascii=False)
    print('· medidas en', a.salida, '· errores de consola:', len(errores), errores[:3])

main()
