#!/usr/bin/env python3
"""Amazona Verse · BM11: gameplay de cine para el tráiler (1280×720, 60 fps, sin interfaz, mp4).

    python3.11 -I tools/build/bm11_gameplay.py --raiz <build> [--fecha 20261029] [--escenas vuelo,ciudad,river,flight,maze,ropero,criadero]

Sirve la build, pasa el flujo de jugador nuevo, abre la escena con ?hud=0 y la graba con MediaRecorder sobre el canvas
(captureStream(60), H.264). Guarda docs/av/gameplay_<escena>_<fecha>.mp4. Chrome con GPU real (Metal), como el resto de tools/build.
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
from flight_medidas import PILOTO_JS as PILOTO_FLIGHT  # noqa: E402
from maze_capturas import PILOTO_JS as PILOTO_MAZE  # noqa: E402
from movil_modos import ABRIR_JS as ABRIR_MODOS  # noqa: E402
from tren_capturas import ESPERA_JS  # noqa: E402

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(AQUI, '..', '..'))

# Graba un canvas durante `seg` segundos y devuelve el mp4 en base64.
GRABAR_JS = r'''(async () => {
  const cv = document.querySelector(%(sel)r), seg = %(seg)s;
  const tipo = ['video/mp4;codecs=avc1.640028', 'video/mp4;codecs=avc1', 'video/mp4'].find(t => MediaRecorder.isTypeSupported(t));
  if (!tipo) return 'sin-mp4';
  const flujo = cv.captureStream(60), rec = new MediaRecorder(flujo, { mimeType: tipo, videoBitsPerSecond: %(bps)d });
  const trozos = []; rec.ondataavailable = e => { if (e.data && e.data.size) trozos.push(e.data); };
  const fin = new Promise(r => { rec.onstop = r; });
  const dts = []; let pv = 0, vivo = true; const f = t => { if (!vivo) return; if (pv) dts.push(t - pv); pv = t; requestAnimationFrame(f); }; requestAnimationFrame(f);
  rec.start(500); await new Promise(r => setTimeout(r, seg * 1000)); rec.stop(); await fin; vivo = false; flujo.getTracks().forEach(t => t.stop());
  const blob = new Blob(trozos, { type: tipo }), buf = new Uint8Array(await blob.arrayBuffer());
  let s = ''; for (let i = 0; i < buf.length; i += 32768) s += String.fromCharCode.apply(null, buf.subarray(i, i + 32768));
  const o = dts.slice().sort((a, b) => a - b), ms = dts.reduce((a, b) => a + b, 0) / Math.max(1, dts.length);
  window.__ultimoClip = { fps: Math.round(1000 / ms), p90: Math.round(o[Math.floor(o.length * 0.9)] || 0), bytes: buf.length, tipo };
  return btoa(s);
})()'''

# Vittata en vuelo por una ruta: mueve S.pos cada cuadro (la cámara de tercera persona la sigue) y gira suave.
VUELO_JS = r'''(async () => {
  const AV = window.AV, G = AV.G, S = G.S, V = %(v)s;
  const cuadros = n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  G.pausa.set('captura', false);
  if (G.clima && G.clima.fijar) G.clima.fijar('sol', { inmediato: true, forzar: true });
  if (G.dialogo && G.dialogo.open && G.dialogo.open() && G.pruebas && G.pruebas.drain) G.pruebas.drain();
  const y0 = V.y != null ? V.y : G.terreno.height(V.x, V.z) + V.alt;
  S.pos.x = V.x; S.pos.y = y0; S.pos.z = V.z; S.vy = 0; G.fisica.MOVE.flying = true;
  let yaw = V.yaw; G.camara.yaw = yaw;
  const ST = G.mundo && G.mundo.streaming;
  if (ST) { if (ST.alrededor) await ST.alrededor(V.x, V.z); if (ST.terminar) await ST.terminar(); }
  if (G.solidos && G.solidos.terminar) G.solidos.terminar();
  await Promise.resolve(G.vegetacion && G.vegetacion.listo);
  if (AV.guineo) await AV.guineo().then(g => g.listo).catch(() => {});
  if (AV.dosel) await AV.dosel().catch(() => {});
  G.camara.place(true); await cuadros(90);
  // La ruta la recorre un bucle propio durante toda la grabación; AV.__rutaFin lo detiene.
  let vivo = true, prev = performance.now(); AV.__rutaFin = () => { vivo = false; };
  const dir = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
  const paso = t => { if (!vivo) return; const dt = Math.min(0.05, (t - prev) / 1000); prev = t;
    yaw += V.giro * dt; G.camara.yaw = yaw; const d = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
    S.facing = d; S.pos.x += d.x * V.vel * dt; S.pos.z += d.z * V.vel * dt; S.vy = 0;
    const suelo = G.terreno.height(S.pos.x, S.pos.z) + 6; S.pos.y += (Math.max(V.y != null ? V.y : suelo, suelo) - S.pos.y) * Math.min(1, dt * 1.5);
    requestAnimationFrame(paso); };
  requestAnimationFrame(paso); return 'ok vuelo';
})()'''

ESCENAS = {
    'vuelo': {'desc': 'Vuelo sobre Villa Raíz y el río', 'canvas': '#game',
              'abrir': VUELO_JS % {'v': json.dumps({'x': 120, 'z': 162, 'alt': 22, 'y': None, 'yaw': 0.63, 'vel': 14, 'giro': 0.05})},
              'cerrar': "window.AV.__rutaFin && window.AV.__rutaFin(); 'ok'"},
    'ciudad': {'desc': 'Llegada a la Ciudad de los 36 (vista ciudad_tepuy)', 'canvas': '#game',
               'abrir': VUELO_JS % {'v': json.dumps({'x': 81, 'z': -278, 'alt': 0, 'y': 150, 'yaw': 0.34, 'vel': 9, 'giro': 0.0})},
               'cerrar': "window.AV.__rutaFin && window.AV.__rutaFin(); 'ok'"},
    'river': {'desc': 'River Rush', 'canvas': '#game', 'abrir': ABRIR_MODOS['river'], 'cerrar': "window.__parar && window.__parar(); window.AV.G.riverRushApi.salir(); 'ok'"},
    'flight': {'desc': 'Amazona Flight', 'canvas': '#game',
               'abrir': '(async () => { const AV = window.AV; await AV.flight(); await new Promise(r => setTimeout(r, 1500));' + PILOTO_FLIGHT +
                        ' api.toque(); let vivo = true; window.__parar = () => { vivo = false; }; const bucle = () => { if (!vivo) return; decide(); requestAnimationFrame(bucle); }; requestAnimationFrame(bucle); return "ok flight"; })()',
               'cerrar': "window.__parar && window.__parar(); window.AV.G.flightApi.salir && window.AV.G.flightApi.salir(); 'ok'"},
    'maze': {'desc': 'Amazona Maze', 'canvas': '#game',
             'abrir': '(async () => { const AV = window.AV; await AV.maze(); await new Promise(r => setTimeout(r, 1500));' + PILOTO_MAZE + ' const api = AV.G.mazeApi; api.otraVez(); api.dirigir(0); requestAnimationFrame(bucle); return "ok maze"; })()',
             'cerrar': "window.__paraPiloto && window.__paraPiloto(); window.AV.G.mazeApi.salir(); 'ok'"},
    'ropero': {'desc': 'El ropero (creador de personaje)', 'canvas': '#p-stage',
               'abrir': "(async () => { const G = window.AV.G; await G.creador.open(false); await new Promise(r => setTimeout(r, 2500));"
                        " const st = document.getElementById('p-stage'); let t = 0; window.__parar = () => {};"
                        " const b = [...document.querySelectorAll('#p-slots button, #creator [data-slot], #creator .swatch')].slice(0, 12);"
                        " let i = 0; const iv = setInterval(() => { if (b[i % b.length]) b[i % b.length].click(); i++; }, 700); window.__parar = () => clearInterval(iv); return 'ok ropero ' + b.length; })()",
               'cerrar': "window.__parar && window.__parar(); 'ok'"},
    'criadero': {'desc': 'El criadero', 'canvas': '#criadero canvas',
                 'abrir': "(async () => { const G = window.AV.G; await G.criadero.abrir(); await new Promise(r => setTimeout(r, 3000)); return 'ok criadero'; })()",
                 'cerrar': "window.AV.G.criadero.cerrar(); 'ok'"},
}


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--raiz', required=True)
    ap.add_argument('--fecha', default=time.strftime('%Y%m%d'))
    ap.add_argument('--salida', default=os.path.join(REPO, 'docs', 'av'))
    ap.add_argument('--escenas', default=','.join(ESCENAS))
    ap.add_argument('--segundos', type=float, default=10)
    ap.add_argument('--bps', type=int, default=2800000)
    a = ap.parse_args()
    P = json.load(open(os.path.join(AQUI, 'config.json')))['pruebas']
    os.makedirs(a.salida, exist_ok=True)
    errores = []

    def al_evento(m):
        me, p = m.get('method'), m.get('params') or {}
        if me == 'Runtime.exceptionThrown':
            errores.append(str(((p.get('exceptionDetails') or {}).get('exception') or {}).get('description', ''))[:200])
        elif me == 'Runtime.consoleAPICalled' and p.get('type') in ('error', 'assert'):
            errores.append(' '.join(str(x.get('value', x.get('description', ''))) for x in p.get('args') or [])[:200])

    srv = avtest.Servidor(os.path.abspath(a.raiz), 0, None)
    chrome = look_capturas.ChromePaciente(P, set(P['puertos_prohibidos']), os.path.join(tempfile.mkdtemp(prefix='bm11-'), 'chrome.log'))
    ws = avtest.WS('ws://127.0.0.1:%d%s' % (chrome.puerto, chrome.ws_path))
    fallos = 0
    try:
        cdp = avtest.CDP(ws, al_evento)
        for nombre in a.escenas.split(','):
            esc = ESCENAS[nombre]
            tid = cdp.call('Target.createTarget', {'url': 'about:blank'})['targetId']
            ses = cdp.call('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
            for me in ('Page.enable', 'Runtime.enable', 'Page.bringToFront'):
                cdp.call(me, {}, ses)
            cdp.call('Emulation.setDeviceMetricsOverride', {'width': 1280, 'height': 720, 'deviceScaleFactor': 1, 'mobile': False}, ses)
            cdp.call('Page.addScriptToEvaluateOnNewDocument', {'source': 'try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}'}, ses)
            cdp.call('Page.navigate', {'url': 'http://127.0.0.1:%d/index.html?clima=sol&hud=0' % srv.puerto}, ses)
            t0 = time.monotonic()
            while time.monotonic() - t0 < P['espera_listo_s']:
                try:
                    if avtest.evaluar(cdp, ses, '!!(%s)' % P['listo_js'], 10, promesa=False):
                        break
                except (avtest.CDPError, avtest.JSError, TimeoutError):
                    pass
                cdp.bombear(0.5)
            else:
                raise avtest.Infra('el juego no arrancó')
            cdp.bombear(1.0)
            prep = avtest.evaluar(cdp, ses, P['preparar_js'], 120)
            if not str(prep).startswith('ok'):
                raise avtest.Infra('flujo de jugador nuevo: %s' % prep)
            avtest.evaluar(cdp, ses, ESPERA_JS, 120)
            avtest.evaluar(cdp, ses, '(async () => { const G = window.AV.G; await (G.mundo && G.mundo.listo); return true; })()', 120)
            r = avtest.evaluar(cdp, ses, esc['abrir'], 180)
            print('· %s: %s' % (nombre, r), flush=True)
            cdp.bombear(1.5)
            b64 = avtest.evaluar(cdp, ses, GRABAR_JS % {'sel': esc['canvas'], 'seg': a.segundos, 'bps': a.bps}, int(a.segundos) + 120)
            if b64 == 'sin-mp4' or not b64:
                print('  ✗ este Chrome no graba mp4', flush=True)
                fallos += 1
            else:
                ruta = os.path.join(a.salida, 'gameplay_%s_%s.mp4' % (nombre, a.fecha))
                open(ruta, 'wb').write(base64.b64decode(b64))
                info = avtest.evaluar(cdp, ses, 'JSON.stringify(window.__ultimoClip)', 10, promesa=False)
                print('  ✓ %s (%d KB) %s' % (os.path.relpath(ruta, REPO), os.path.getsize(ruta) // 1024, info), flush=True)
            try:
                avtest.evaluar(cdp, ses, esc['cerrar'], 30)
            except Exception as e:  # noqa: BLE001
                print('  (cerrar: %s)' % str(e)[:100], flush=True)
            cdp.call('Target.closeTarget', {'targetId': tid})
    finally:
        ws.cerrar()
        chrome.cerrar()
        srv.cerrar()
    print('· %s' % ('0 errores de consola' if not errores else 'errores: %s' % errores[:5]), flush=True)
    return 1 if fallos else 0


if __name__ == '__main__':
    sys.exit(main())
