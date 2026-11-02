#!/usr/bin/env python3
"""Amazona Verse · capturas y medidas del prototipo Amazona Maze (AB1; docs/equipo/TAREAS_API.md, carril AB).

    python3.11 -I tools/build/maze_capturas.py [--raiz .] [--salida docs/img] [--movil] [--segundos 12]

Sirve --raiz (el repo o una build) con el servidor y el Chrome sin interfaz de avtest.py, pasa el flujo de jugador nuevo, abre Amazona Maze
(AV.maze(), el mismo camino que ?mini=maze) y guarda <salida>/ab1_maze_<listo|juego|fin>[_movil].jpg: antes de la primera dirección, a
mitad de una partida con un piloto (camino más corto al fruto más cercano, como el robot de mazeTest) y con los resultados. Mide los
cuadros de la partida (ms media, p90, FPS, draw calls) y lo apunta en <salida>/ab1_maze_medidas.json (clave 'escritorio' o 'movil').
--movil emula un celular en vertical (375×812, dpr 2, táctil). Salida: 0 si todo cuadra, 1 si algo falla.
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

# Piloto en tiempo real: en cada cuadro elige la dirección del camino más corto al fruto vivo más cercano
PILOTO_JS = r'''
  const api = AV.G.mazeApi, D = api._dev, P = api.P, J = D.J, lab = D.lab, DX = [0, 1, 0, -1], DZ = [-1, 0, 1, 0];
  const decide = () => { if (api.fase !== 'juego') return;
    const c = Math.round(J.gz) * P.n + Math.round(J.gx), vivos = lab.frutos.filter(f => f.activo); if (!vivos.length) return;
    const D0 = D.distancias(c); let obj = vivos[0].c, md = 1e9; for (const f of vivos) if (D0[f.c] >= 0 && D0[f.c] < md) { md = D0[f.c]; obj = f.c; }
    const Dd = D.distancias(obj), x = c % P.n, z = (c / P.n) | 0;
    for (let d = 0; d < 4; d++) if (D.abierto(c, d) && Dd[(z + DZ[d]) * P.n + x + DX[d]] === Dd[c] - 1) { api.dirigir(d); break; } };
  let vivo = true; window.__paraPiloto = () => { vivo = false; };
  const bucle = () => { if (!vivo) return; decide(); requestAnimationFrame(bucle); };
'''

JUEGO_JS = r'''(async () => {
  const AV = window.AV, G = AV.G, R = G.renderer;''' + look_capturas.MEDIR_JS + r'''
  const base = () => (AV.look && AV.look.medir ? AV.look.medir() : R.stats());
  ''' + PILOTO_JS + r'''
  api.otraVez(); api.dirigir(0); requestAnimationFrame(bucle);
  const dts = []; let pv = 0; const seg = %(segundos)d;
  await new Promise(r => { const t1 = performance.now(); const f = t => { if (pv) dts.push(t - pv); pv = t; if (t - t1 >= seg * 1000 || api.fase !== 'juego') return r(); requestAnimationFrame(f); }; requestAnimationFrame(f); });
  const o = dts.slice().sort((a, b) => a - b), q = p => o[Math.min(o.length - 1, Math.floor(p * o.length))], ms = dts.reduce((a, b) => a + b, 0) / Math.max(1, dts.length);
  return JSON.stringify(Object.assign(base(), { ms: Math.round(ms * 100) / 100, fpsMedidos: Math.round(1000 / ms), msP90: Math.round(q(0.9) * 100) / 100, peor: Math.round(o[o.length - 1] || 0), cuadros: dts.length, calidad: R.calidad.nivel, estado: api.estado() }));
})()'''

FIN_JS = r'''(async () => {
  const AV = window.AV, api = AV.G.mazeApi, D = api._dev; window.__paraPiloto && window.__paraPiloto();
  D.st.sinFx = true; for (const f of D.lab.frutos) if (f.activo) { D.J.gx = f.c % api.P.n; D.J.gz = (f.c / api.P.n) | 0; D.paso(1 / 60); } D.st.sinFx = false;
  await new Promise(r => setTimeout(r, 900));
  const fin = document.querySelector('#maze .mz-fin');
  return JSON.stringify({ fase: api.fase, panel: !!fin && !fin.hidden, estado: api.estado() });
})()'''


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--raiz', default=REPO)
    ap.add_argument('--salida', default=os.path.join(REPO, 'docs', 'img'))
    ap.add_argument('--movil', action='store_true', help='emula un celular en vertical (375×812, dpr 2, táctil)')
    ap.add_argument('--segundos', type=int, default=12)
    a = ap.parse_args()
    P = json.load(open(os.path.join(AQUI, 'config.json')))['pruebas']
    os.makedirs(a.salida, exist_ok=True)
    ruta_med = os.path.join(a.salida, 'ab1_maze_medidas.json')
    medidas = json.load(open(ruta_med)) if os.path.exists(ruta_med) else {}
    clave, suf = ('movil', '_movil') if a.movil else ('escritorio', '')
    errores = []

    def al_evento(m):
        me, p = m.get('method'), m.get('params') or {}
        if me == 'Runtime.exceptionThrown':
            d = p.get('exceptionDetails') or {}
            errores.append(((d.get('exception') or {}).get('description') or d.get('text') or '')[:200])
        elif me == 'Runtime.consoleAPICalled' and p.get('type') in ('error', 'assert'):
            errores.append(' '.join(str(x.get('value', x.get('description', ''))) for x in p.get('args') or [])[:300])

    srv = chrome = ws = None
    fallos = []
    try:
        srv = avtest.Servidor(os.path.abspath(a.raiz), 0, None)
        origen = 'http://127.0.0.1:%d' % srv.puerto
        chrome = look_capturas.ChromePaciente(P, set(P['puertos_prohibidos']), os.path.join(tempfile.mkdtemp(prefix='maze-capturas-'), 'chrome.log'))
        ws = avtest.WS('ws://127.0.0.1:%d%s' % (chrome.puerto, chrome.ws_path))
        cdp = avtest.CDP(ws, al_evento)
        print('· servidor %s · Chrome %s · %s' % (origen, chrome.version, clave), flush=True)
        tid = cdp.call('Target.createTarget', {'url': 'about:blank'})['targetId']
        ses = cdp.call('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
        for me in ('Page.enable', 'Runtime.enable', 'Log.enable'):
            cdp.call(me, {}, ses)
        if a.movil:
            cdp.call('Emulation.setDeviceMetricsOverride', {'width': 375, 'height': 812, 'deviceScaleFactor': 2, 'mobile': True}, ses)
            cdp.call('Emulation.setTouchEmulationEnabled', {'enabled': True, 'maxTouchPoints': 5}, ses)
            cdp.call('Emulation.setUserAgentOverride', {'userAgent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'}, ses)
        cdp.call('Page.addScriptToEvaluateOnNewDocument', {'source': 'try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}'}, ses)
        cdp.call('Page.navigate', {'url': '%s/index.html?clima=sol' % origen}, ses)
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

        def captura(nombre):
            d = cdp.call('Page.captureScreenshot', {'format': 'jpeg', 'quality': 82}, ses, 60)['data']
            ruta = os.path.join(a.salida, 'ab1_maze_%s%s.jpg' % (nombre, suf))
            open(ruta, 'wb').write(base64.b64decode(d))
            return ruta

        r = json.loads(avtest.evaluar(cdp, ses, '(async () => { const AV = window.AV; const ok = await AV.maze(); await new Promise(r => setTimeout(r, 1500)); return JSON.stringify({ ok, estado: AV.G.mazeApi.estado() }); })()', 180))
        if r.get('ok') is not True:
            raise avtest.Infra('no abrió Amazona Maze: %s' % r)
        rutas = [captura('listo')]
        m = json.loads(avtest.evaluar(cdp, ses, JUEGO_JS % {'segundos': a.segundos}, 120))
        rutas.append(captura('juego'))
        f = json.loads(avtest.evaluar(cdp, ses, FIN_JS, 60))
        rutas.append(captura('fin'))
        s = avtest.evaluar(cdp, ses, '(async () => { const G = window.AV.G; G.mazeApi.salir(); await new Promise(r => setTimeout(r, 600)); return JSON.stringify({ activo: G.mazeApi.activo, busy: G.ui.busy(), clases: [...document.body.classList].filter(c => /maze|retos/.test(c)) }); })()', 60)
        s = json.loads(s)
        medidas[clave] = {'juego': m, 'fin': f, 'salir': s, 'errores': errores[:5]}
        json.dump(medidas, open(ruta_med, 'w'), indent=1, ensure_ascii=False)
        print('· juego : %.1f ms media · %s p90 · peor %s ms (%s FPS) · %s calls · %s tris · calidad %s · %s' % (
            m.get('ms', 0), m.get('msP90'), m.get('peor'), m.get('fpsMedidos'), m.get('calls'), m.get('triangulos'), m.get('calidad'), m['estado']), flush=True)
        print('· fin   : %s · salir %s' % (f, s), flush=True)
        print('· capturas: ' + ', '.join(os.path.relpath(x, REPO) for x in rutas), flush=True)
        if not f['panel']:
            fallos.append('los resultados no se ven')
        if s['activo'] or s['busy'] or s['clases']:
            fallos.append('al salir queda algo del laberinto')
        if errores:
            fallos.append('errores de consola: %s' % errores[:5])
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
