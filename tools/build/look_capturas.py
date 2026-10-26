#!/usr/bin/env python3
"""Amazona Verse · capturas comparativas de los looks de color (docs/equipo/LOOK_VIBRANTE.md).

    python3.11 -I tools/build/look_capturas.py [--looks fabrica,vibrante,soleado,toon] [--vistas aldea,yunque,rio,ciudad]
                                               [--raiz .] [--salida docs/img] [--calidad alto] [--lamina] [--solo-lamina]

Sirve la carpeta --raiz (el repo o una build) con el servidor y el Chrome sin interfaz de avtest.py (GPU real por Metal),
abre el juego una vez por look (?look=…&calidad=…&clima=sol), pasa el flujo de jugador nuevo, lleva a Vittata a cada vista,
espera el streaming, mide 90 cuadros (ms por cuadro, draw calls, triángulos, programas y memoria estimada de texturas) y
guarda el lienzo del mundo (sin HUD) en <salida>/look_<look>_<vista>.png. Con --lamina compone <salida>/look_comparacion.png
(filas: looks; columnas: vistas) y escribe <salida>/look_medidas.json. Una captura a la vez (la Mac va cargada).
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

# Con la Mac cargada (otros agentes probando a la vez) Chrome tarda más de 10 s en contestar /json/version: más margen
_urlopen = avtest.urllib.request.urlopen
avtest.urllib.request.urlopen = lambda url, *a, timeout=10, **k: _urlopen(url, *a, timeout=max(timeout, 90), **k)



class ChromePaciente(avtest.Chrome):
    """Como avtest.Chrome, pero espera hasta 240 s a DevTools (con la máquina cargada 40 s no bastan)."""

    def __init__(self, cfg, prohibidos, log_path):
        import shutil
        import subprocess
        import tempfile
        exe = os.environ.get('AV_CHROME') or cfg['chrome']
        if not os.path.exists(exe):
            raise avtest.Infra('no encuentro Chrome en %s (define AV_CHROME)' % exe)
        self.perfil = tempfile.mkdtemp(prefix='avtest-chrome-')
        self.log_path = log_path
        self.log = open(self.log_path, 'w')
        args = [exe] + cfg['chrome_flags'] + ['--remote-debugging-port=0', '--user-data-dir=' + self.perfil, '--window-size=%d,%d' % tuple(cfg['ventana']), 'about:blank']
        self.proc = subprocess.Popen(args, stdout=self.log, stderr=subprocess.STDOUT, start_new_session=True)
        archivo = os.path.join(self.perfil, 'DevToolsActivePort')
        limite = time.monotonic() + 240
        while time.monotonic() < limite:
            if self.proc.poll() is not None:
                raise avtest.Infra('Chrome terminó al arrancar (código %s): %s' % (self.proc.returncode, self.cola()))
            try:
                lineas = open(archivo).read().split()
                if len(lineas) >= 2:
                    self.puerto, self.ws_path = int(lineas[0]), lineas[1]
                    break
            except (OSError, ValueError):
                pass
            time.sleep(0.25)
        else:
            shutil.rmtree(self.perfil, ignore_errors=True)
            raise avtest.Infra('Chrome no abrió DevTools en 240 s: ' + self.cola())
        if self.puerto in prohibidos:
            raise avtest.Infra('Chrome eligió el puerto reservado %d' % self.puerto)
        with avtest.urllib.request.urlopen('http://127.0.0.1:%d/json/version' % self.puerto, timeout=120) as r:
            self.version = json.loads(r.read().decode()).get('Browser', '?')


AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(AQUI, '..', '..'))

# Vistas: posición de Vittata (x, z; y = altura del suelo + alt, o y fija), si vuela y hacia dónde mira la cámara (yaw de
# camara.js: la cámara queda en pos + (sin·d, h, cos·d) y mira a Vittata, así que la vista apunta a −(sin yaw, cos yaw)).
VISTAS = {  # en las vistas de vuelo Vittata queda 8 m bajo la cámara (fuera del encuadre; la sombra la sigue)
    'aldea': {'x': 120, 'y': 8, 'z': 162, 'vuelo': True, 'yaw': 0.63, 'cam': [120, 16, 162], 'mirar': [88, 9, 118], 'nota': 'Aldea de Kelvin junto a Villa Raíz'},
    'yunque': {'x': 80, 'y': 30, 'z': 8, 'vuelo': True, 'yaw': 0.6, 'cam': [80, 38, 8], 'mirar': [-30, 95, -150], 'nota': 'El Yunque: paredes, cascadas y cumbre'},
    'rio': {'x': 190, 'alt': 0, 'z': 122, 'vuelo': False, 'yaw': 2.6, 'cam': [194.7, 5.5, 114.3], 'mirar': [179.6, 4, 139.2], 'nota': 'Río junto a Poza Honda'},
    'ciudad': {'x': 52, 'y': 110, 'z': -84, 'vuelo': True, 'yaw': 0.885, 'cam': [52, 118, -84], 'mirar': [-10, 100, -140], 'nota': 'Ruinas de Kelvin (ciudad antigua)'},
}

VISTA_JS = r'''(async () => {
  const V = %s, AV = window.AV, G = AV.G, R = G.renderer, S = G.S;
  const cuadros = n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  G.pausa.set('captura', true);
  if (G.clima && G.clima.fijar) G.clima.fijar('sol', { inmediato: true, forzar: true });
  if (G.dialogo && G.dialogo.open && G.dialogo.open() && G.pruebas && G.pruebas.drain) G.pruebas.drain();
  const y = V.y != null ? V.y : G.terreno.height(V.x, V.z) + (V.alt || 0);
  S.pos.x = V.x; S.pos.y = y; S.pos.z = V.z; S.vy = 0; G.fisica.MOVE.flying = !!V.vuelo;
  S.facing = { x: -Math.sin(V.yaw), z: -Math.cos(V.yaw) };
  G.camara.yaw = V.yaw;
  const ST = G.mundo && G.mundo.streaming;
  if (ST) { if (ST.alrededor) await ST.alrededor(V.x, V.z); if (ST.terminar) await ST.terminar(); }
  if (G.solidos && G.solidos.terminar) G.solidos.terminar();
  await Promise.resolve(G.vegetacion && G.vegetacion.listo);
  G.camara.yaw = V.yaw; G.camara.place(true);
  await cuadros(60);
  G.camara.yaw = V.yaw; G.camara.place(true);
  const t0 = performance.now(); await cuadros(90); const ms = (performance.now() - t0) / 90;
  const med = AV.look && AV.look.medir ? AV.look.medir() : R.stats();
  med.ms = Math.round(ms * 100) / 100; med.fpsMedidos = Math.round(1000 / ms); med.cam = [R.camera.position.x, R.camera.position.y, R.camera.position.z].map(v => Math.round(v));
  med.look = AV.look ? (AV.look.actual || 'fabrica') : 'fabrica'; med.tamano = [R.canvas.width, R.canvas.height];
  G.camara.place(true);
  if (V.cam) { R.camera.position.set(V.cam[0], V.cam[1], V.cam[2]); R.camera.lookAt(V.mirar[0], V.mirar[1], V.mirar[2]); R.camera.updateMatrixWorld(); }
  R.drawScene(R.camera);
  const png = R.canvas.toDataURL('image/png');
  return JSON.stringify({ med, png });
})()'''

LAMINA_HTML = '''<!doctype html><meta charset="utf-8"><style>
body { margin: 0; background: #0f1a14; color: #f4f7f1; font: 600 15px/1.3 -apple-system, Helvetica, Arial, sans-serif; }
table { border-collapse: collapse; } th, td { padding: 6px; text-align: left; vertical-align: top; }
th.col { font-size: 17px; } th.fila { white-space: nowrap; font-size: 17px; }
img { display: block; width: %(w)dpx; height: %(h)dpx; object-fit: cover; border-radius: 6px; }
small { display: block; color: #b8c7bd; font-weight: 500; font-size: 12px; margin-top: 3px; }
h1 { margin: 10px 12px 0; font-size: 20px; } p { margin: 2px 12px 8px; color: #b8c7bd; font-weight: 500; font-size: 13px; }
</style><h1>Amazona Verse · looks de color (A/B)</h1><p>Mismas cuatro vistas y calidad «%(calidad)s»; el lienzo del mundo sin HUD. Medidas bajo cada imagen: ms por cuadro · draw calls · texturas estimadas (MB).</p>
<table>%(filas)s</table>'''


def lamina(cdp, ses, origen, salida, looks, vistas, medidas, calidad):
    w, h = 480, 300
    filas = ['<tr><th></th>' + ''.join('<th class="col">%s<small>%s</small></th>' % (v, VISTAS[v]['nota']) for v in vistas) + '</tr>']
    for lk in looks:
        celdas = []
        for v in vistas:
            m = medidas.get(lk, {}).get(v) or {}
            txt = ('%.1f ms · %s calls · %s MB tex' % (m.get('ms', 0), m.get('calls', '?'), m.get('texturasMB', '?'))) if m else 'sin medida'
            celdas.append('<td><img src="look_%s_%s.png?%d"><small>%s</small></td>' % (lk, v, int(time.time()), txt))
        filas.append('<tr><th class="fila">%s</th>%s</tr>' % (lk, ''.join(celdas)))
    html = LAMINA_HTML % {'w': w, 'h': h, 'filas': ''.join(filas), 'calidad': calidad}
    ancho, alto = 140 + (w + 14) * len(vistas), 90 + (h + 42) * len(looks)
    cdp.call('Emulation.setDeviceMetricsOverride', {'width': ancho, 'height': alto, 'deviceScaleFactor': 1, 'mobile': False}, ses)
    tmp = os.path.join(salida, 'look_lamina_tmp.html')
    open(tmp, 'w', encoding='utf-8').write(html)
    cdp.call('Page.navigate', {'url': '%s/%s/look_lamina_tmp.html' % (origen, os.path.relpath(salida, REPO))}, ses)
    cdp.bombear(1.5)
    avtest.evaluar(cdp, ses, 'Promise.all([...document.images].map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; })))', 60)
    cdp.bombear(0.5)
    png = cdp.call('Page.captureScreenshot', {'format': 'png', 'captureBeyondViewport': True}, ses, 60)['data']
    ruta = os.path.join(salida, 'look_comparacion.png')
    open(ruta, 'wb').write(base64.b64decode(png))
    os.remove(tmp)
    print('· lámina', ruta, flush=True)


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--looks', default='fabrica,vibrante,soleado,toon')
    ap.add_argument('--vistas', default=','.join(VISTAS))
    ap.add_argument('--raiz', default=REPO)
    ap.add_argument('--salida', default=os.path.join(REPO, 'docs', 'img'))
    ap.add_argument('--calidad', default='alto')
    ap.add_argument('--lamina', action='store_true')
    ap.add_argument('--solo-lamina', action='store_true')
    ap.add_argument('--vistas-json', help='vistas de prueba {nombre: {x, y|alt, z, vuelo, yaw}} (exploración)')
    a = ap.parse_args()
    cfg = json.load(open(os.path.join(AQUI, 'config.json')))
    P = cfg['pruebas']
    looks, vistas = a.looks.split(','), a.vistas.split(',')
    if a.vistas_json:
        VISTAS.update(json.load(open(a.vistas_json)))
        vistas = list(json.load(open(a.vistas_json)))
    os.makedirs(a.salida, exist_ok=True)
    ruta_med = os.path.join(a.salida, 'look_medidas.json')
    medidas = json.load(open(ruta_med)) if os.path.exists(ruta_med) else {}
    estado = {'excepciones': [], 'consola': []}

    def al_evento(m):
        me, p = m.get('method'), m.get('params') or {}
        if me == 'Runtime.exceptionThrown':
            d = p.get('exceptionDetails') or {}
            estado['excepciones'].append('%s (%s:%s)' % (((d.get('exception') or {}).get('description') or d.get('text') or '')[:200], d.get('url', ''), d.get('lineNumber')))
        elif me == 'Runtime.consoleAPICalled' and p.get('type') in ('error', 'assert'):
            estado['consola'].append(' '.join(str(x.get('value', x.get('description', ''))) for x in p.get('args') or [])[:300])

    srv = chrome = ws = None
    try:
        srv = avtest.Servidor(os.path.abspath(a.raiz), 0, None)
        origen = 'http://127.0.0.1:%d' % srv.puerto
        chrome = ChromePaciente(P, set(P['puertos_prohibidos']), os.path.join(tempfile.mkdtemp(prefix='look-capturas-'), 'chrome.log'))
        ws = avtest.WS('ws://127.0.0.1:%d%s' % (chrome.puerto, chrome.ws_path))
        cdp = avtest.CDP(ws, al_evento)
        print('· servidor %s · Chrome %s' % (origen, chrome.version), flush=True)
        for lk in ([] if a.solo_lamina else looks):
            tid = cdp.call('Target.createTarget', {'url': 'about:blank'})['targetId']
            ses = cdp.call('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
            for me in ('Page.enable', 'Runtime.enable', 'Log.enable'):
                cdp.call(me, {}, ses)
            # Cada look empieza como jugador nuevo (mismo perfil de Chrome): se vacía el almacén antes de que corra el juego
            cdp.call('Page.addScriptToEvaluateOnNewDocument', {'source': 'try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}'}, ses)
            url = '%s/index.html?calidad=%s&clima=sol' % (origen, a.calidad) + ('' if lk == 'fabrica' else '&look=' + lk)
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
                raise avtest.Infra('el juego no arrancó en %d s (%s)' % (P['espera_listo_s'], lk))
            cdp.bombear(1.0)
            prep = avtest.evaluar(cdp, ses, P['preparar_js'], 120)
            print('· %s: juego listo en %.0f s · %s' % (lk, time.monotonic() - t0, prep), flush=True)
            if not str(prep).startswith('ok'):
                raise avtest.Infra('flujo de jugador nuevo: %s' % prep)
            avtest.evaluar(cdp, ses, '(async () => { const G = window.AV.G; await (G.mundo && G.mundo.listo); if (window.AV.look === undefined) await new Promise(r => setTimeout(r, 8000)); return (window.AV.look && window.AV.look.actual) || "fabrica"; })()', 120)
            for v in vistas:
                r = json.loads(avtest.evaluar(cdp, ses, VISTA_JS % json.dumps(VISTAS[v]), 240))
                ruta = os.path.join(a.salida, 'look_%s_%s.png' % (lk, v))
                open(ruta, 'wb').write(base64.b64decode(r['png'].split(',', 1)[1]))
                medidas.setdefault(lk, {})[v] = r['med']
                m = r['med']
                print('  · %s/%s: %.1f ms (%s FPS) · %s calls · %s tris · %s programas · %s MB tex (%s > 512 px) · cámara %s' % (
                    lk, v, m.get('ms', 0), m.get('fpsMedidos'), m.get('calls'), m.get('triangulos'), m.get('programas'), m.get('texturasMB'), m.get('texturasGrandes'), m.get('cam')), flush=True)
                json.dump(medidas, open(ruta_med, 'w'), indent=1, ensure_ascii=False)
            cdp.call('Target.closeTarget', {'targetId': tid})
            cdp.bombear(1.0)
        if a.lamina or a.solo_lamina:
            tid = cdp.call('Target.createTarget', {'url': 'about:blank'})['targetId']
            ses = cdp.call('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
            for me in ('Page.enable', 'Runtime.enable'):
                cdp.call(me, {}, ses)
            lamina(cdp, ses, origen, a.salida, looks, vistas, medidas, a.calidad)
        if estado['excepciones'] or estado['consola']:
            print('· errores de consola:', (estado['excepciones'] + estado['consola'])[:5], flush=True)
        else:
            print('· 0 errores de consola', flush=True)
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


if __name__ == '__main__':
    main()
