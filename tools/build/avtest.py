"""Amazona Verse · pruebas de una build en Chrome sin interfaz (dueño: Build/Release Engineer; lo llama tools/build/test.sh).

Uso (siempre con el python de Blender y -I; nunca `python3`):
  <python3.11> -I tools/build/avtest.py <carpeta> [--extra] [--puerto N] [--informe DIR]

- <carpeta> es la salida de build.sh (con site/ y manifiesto.json) o una carpeta con index.html.
- Comprueba que site/ coincide con su manifiesto (lo probado es lo que se publica).
- Sirve la carpeta en 127.0.0.1 en un puerto libre (solo GET) y abre un Chrome propio sin interfaz (GPU por Metal, perfil
  temporal, DevTools en un puerto que elige el sistema; nunca el 9333 de otro agente). Lo controla por el protocolo DevTools
  con un websocket escrito a mano (sin librerías).
- Flujo de jugador nuevo: portada → Jugar → el creador se abre → Empezar. Luego mide la carga inicial (descarga, heap a
  ~9 s y tras GC, base64 que sigue en window) y la compara con los presupuestos de config.json.
- Inyecta tests/qa/e2e.js (servido aparte en /__pruebas/, no es parte de la build) y corre las baterías de config.json.
- Vigila consola, excepciones y red: ningún 404 (en una build marcada ave:sin-glb tampoco las sondas .glb) y ninguna
  petición a dominios fuera de la lista permitida.
- Escribe reporte-test.{json,md} y capturas, y sale con 0 si pasa, 1 si falla y 2 si no pudo correr (Chrome, servidor).
"""
import argparse
import base64
import datetime
import hashlib
import http.server
import json
import os
import re
import shutil
import signal
import socket
import struct
import subprocess
import sys
import tempfile
import threading
import time
import urllib.parse
import urllib.request

VERSION = '1.1.0'
MB = 1024 * 1024


def posix_basename(p):
    return p.rstrip('/').rsplit('/', 1)[-1]


class Infra(Exception):
    """No se pudo correr la prueba (no es culpa de la build)."""


class CDPError(Exception):
    pass


class JSError(Exception):
    pass


# ---------------------------------------------------------------- servidor
PRUEBAS_RUTA = '/__pruebas/'  # archivos de prueba inyectados (tests/qa/e2e.js…): se sirven aparte, fuera de la build


class Servidor:
    def __init__(self, raiz, puerto=0, extra_dir=None):
        registro = self.registro = []

        class H(http.server.SimpleHTTPRequestHandler):
            extensions_map = dict(http.server.SimpleHTTPRequestHandler.extensions_map, **{
                '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2',
                '.woff': 'font/woff', '.svg': 'image/svg+xml', '.wasm': 'application/wasm'})

            def __init__(s, *a, **k):
                super().__init__(*a, directory=raiz, **k)

            def translate_path(s, path):
                if extra_dir and path.startswith(PRUEBAS_RUTA):
                    nombre = posix_basename(urllib.parse.unquote(path.split('?', 1)[0]))
                    return os.path.join(extra_dir, nombre)
                return super().translate_path(path)

            def end_headers(s):
                s.send_header('Cache-Control', 'no-store')
                super().end_headers()

            def log_message(s, *a):
                pass

            def log_request(s, code='-', size='-'):
                try:
                    registro.append((s.command, s.path, int(code)))
                except (TypeError, ValueError):
                    registro.append((s.command, s.path, 0))

            def do_POST(s):  # el artifact tampoco acepta escrituras
                s.send_error(405, 'la build es de solo lectura')

        self.httpd = http.server.ThreadingHTTPServer(('127.0.0.1', puerto), H)
        self.httpd.daemon_threads = True
        self.puerto = self.httpd.server_address[1]
        self.hilo = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.hilo.start()

    def cerrar(self):
        self.httpd.shutdown()
        self.httpd.server_close()


# ---------------------------------------------------------------- websocket mínimo (RFC 6455, cliente)
def _xor(data, mk):
    if not data:
        return b''
    n = len(data)
    rep = (mk * (n // 4 + 1))[:n]
    return (int.from_bytes(data, 'little') ^ int.from_bytes(rep, 'little')).to_bytes(n, 'little')


class WS:
    def __init__(self, url, timeout=10):
        u = urllib.parse.urlsplit(url)
        self.sock = socket.create_connection((u.hostname, u.port), timeout=timeout)
        key = base64.b64encode(os.urandom(16)).decode()
        ruta = u.path + ('?' + u.query if u.query else '')
        self.sock.sendall(('GET %s HTTP/1.1\r\nHost: %s:%d\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
                           'Sec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n' % (ruta, u.hostname, u.port, key)).encode())
        buf = b''
        while b'\r\n\r\n' not in buf:
            c = self.sock.recv(4096)
            if not c:
                raise Infra('el websocket de DevTools cerró en el saludo')
            buf += c
        cab, resto = buf.split(b'\r\n\r\n', 1)
        lineas = cab.decode('latin-1').split('\r\n')
        if ' 101 ' not in lineas[0] + ' ':
            raise Infra('DevTools rechazó el websocket: ' + lineas[0])
        h = {l.split(':', 1)[0].strip().lower(): l.split(':', 1)[1].strip() for l in lineas[1:] if ':' in l}
        acc = base64.b64encode(hashlib.sha1((key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').encode()).digest()).decode()
        if h.get('sec-websocket-accept') != acc:
            raise Infra('Sec-WebSocket-Accept no coincide')
        self.buf = bytearray(resto)
        self.partes = []
        self.sock.settimeout(0.25)

    def _enviar(self, op, data):
        n = len(data)
        h = bytearray([0x80 | op])
        if n < 126:
            h.append(0x80 | n)
        elif n < 65536:
            h.append(0x80 | 126)
            h += struct.pack('>H', n)
        else:
            h.append(0x80 | 127)
            h += struct.pack('>Q', n)
        mk = os.urandom(4)
        self.sock.settimeout(10)
        try:
            self.sock.sendall(bytes(h) + mk + _xor(data, mk))
        finally:
            self.sock.settimeout(0.25)

    def enviar(self, texto):
        self._enviar(1, texto.encode('utf-8'))

    def _trama(self):
        b = self.buf
        if len(b) < 2:
            return None
        b0, b1 = b[0], b[1]
        ln, i = b1 & 0x7F, 2
        if ln == 126:
            if len(b) < 4:
                return None
            ln, i = struct.unpack_from('>H', b, 2)[0], 4
        elif ln == 127:
            if len(b) < 10:
                return None
            ln, i = struct.unpack_from('>Q', b, 2)[0], 10
        mk = None
        if b1 & 0x80:
            if len(b) < i + 4:
                return None
            mk, i = bytes(b[i:i + 4]), i + 4
        if len(b) < i + ln:
            return None
        data = bytes(b[i:i + ln])
        del self.buf[:i + ln]
        return b0 & 0x80, b0 & 0x0F, (_xor(data, mk) if mk else data)

    def recibir(self, limite):
        """Siguiente mensaje de texto completo; TimeoutError si llega el límite sin mensaje (el flujo queda íntegro)."""
        while True:
            t = self._trama()
            if t is None:
                try:
                    c = self.sock.recv(1 << 20)
                except socket.timeout:
                    if time.monotonic() >= limite:
                        raise TimeoutError
                    continue
                if not c:
                    raise Infra('Chrome cerró el websocket de DevTools')
                self.buf += c
                continue
            fin, op, data = t
            if op == 9:
                self._enviar(10, data)
                continue
            if op == 10:
                continue
            if op == 8:
                raise Infra('Chrome cerró el websocket de DevTools')
            self.partes.append(data)
            if fin:
                msg, self.partes = b''.join(self.partes), []
                return msg.decode('utf-8', 'replace')

    def cerrar(self):
        try:
            self._enviar(8, struct.pack('>H', 1000))
        except OSError:
            pass
        try:
            self.sock.close()
        except OSError:
            pass


class CDP:
    def __init__(self, ws, al_evento):
        self.ws, self.al_evento, self.n = ws, al_evento, 0

    def call(self, metodo, params=None, sesion=None, timeout=60):
        self.n += 1
        mid = self.n
        m = {'id': mid, 'method': metodo, 'params': params or {}}
        if sesion:
            m['sessionId'] = sesion
        self.ws.enviar(json.dumps(m))
        limite = time.monotonic() + timeout
        while True:
            r = json.loads(self.ws.recibir(limite))
            if r.get('id') == mid:
                if 'error' in r:
                    raise CDPError('%s: %s' % (metodo, r['error'].get('message')))
                return r.get('result', {})
            if 'method' in r:
                self.al_evento(r)

    def bombear(self, segundos):
        limite = time.monotonic() + segundos
        try:
            while True:
                r = json.loads(self.ws.recibir(limite))
                if 'method' in r:
                    self.al_evento(r)
        except TimeoutError:
            pass


def evaluar(cdp, ses, expr, timeout, promesa=True):
    r = cdp.call('Runtime.evaluate', {'expression': expr, 'awaitPromise': promesa, 'returnByValue': True, 'userGesture': True}, ses, timeout)
    if 'exceptionDetails' in r:
        d = r['exceptionDetails']
        raise JSError((d.get('exception') or {}).get('description') or d.get('text') or 'excepción')
    return (r.get('result') or {}).get('value')


BATERIA_JS = r'''(async () => {
  const name = %s, t0 = performance.now();
  const fn = window.AV && window.AV[name];
  if (typeof fn !== 'function') return JSON.stringify({ existe: false });
  try {
    const r = (await fn.call(window.AV)) || {};
    const lista = r.results || r.checks || [];
    return JSON.stringify({ existe: true, ms: Math.round(performance.now() - t0),
      passed: r.passed != null ? r.passed : lista.filter(x => x.ok).length, total: r.total != null ? r.total : lista.length,
      results: lista.map(x => ({ name: String(x.name), ok: !!x.ok, extra: x.extra == null ? '' : String(x.extra) })) });
  } catch (e) {
    return JSON.stringify({ existe: true, ms: Math.round(performance.now() - t0), error: String((e && e.stack) || e) });
  }
})()'''


INYECTAR_JS = r'''new Promise((ok, mal) => { const s = document.createElement('script'); s.src = %s; s.charset = 'utf-8';
  s.onload = () => ok(true); s.onerror = () => mal(new Error('no cargó ' + s.src)); document.head.appendChild(s); })'''

# Heap sin forzar GC (performance.memory, preciso con --enable-precise-memory-info) y cadenas base64 que siguen en window
MEMORIA_JS = r'''(() => {
  const m = performance.memory || {};
  let n = 0, bytes = 0;
  for (const k of Object.keys(window)) {
    if (!/^AV_[A-Z0-9_]*_B64$/.test(k)) continue;
    const v = window[k];
    if (typeof v === 'string') { n++; bytes += v.length; }
    else if (v && typeof v === 'object') for (const s of Object.values(v)) if (typeof s === 'string') { n++; bytes += s.length; }
  }
  return JSON.stringify({ usado: m.usedJSHeapSize || null, b64_cadenas: n, b64_bytes: bytes, t_ms: Math.round(performance.now()) });
})()'''


def medir(cdp, ses, estado, P):
    """Carga inicial: espera a que la red quede quieta y mide el heap (sin GC y tras GC) y el base64 residente."""
    out = {}
    t0 = time.monotonic()
    while time.monotonic() - t0 < P.get('espera_red_s', 30):
        cdp.bombear(0.5)
        pend = [q for q in estado['reqs'].values() if not q.get('fin') and not q.get('url', '').startswith(('data:', 'blob:'))]
        if not pend and time.monotonic() - estado['ultima_red'] >= 2.0:
            break
    out['red_quieta_s'] = round(time.monotonic() - t0, 1)
    # Como la auditoría: el heap a ~9 s de empezar a cargar (sin forzar GC)
    try:
        ahora = evaluar(cdp, ses, 'performance.now()', 60, promesa=False) or 0
        falta = P.get('medir_heap_tras_s', 9) - ahora / 1000
        if falta > 0:
            cdp.bombear(falta)
        m = json.loads(evaluar(cdp, ses, MEMORIA_JS, 60, promesa=False))
        out.update(heap_mb=round(m['usado'] / MB, 1) if m.get('usado') else None, heap_t_s=round(m['t_ms'] / 1000, 1),
                   b64_residente_mb=round(m['b64_bytes'] / MB, 2), b64_residente_cadenas=m['b64_cadenas'])
    except (CDPError, JSError, TimeoutError, ValueError) as e:
        out['error_heap'] = ('%s: %s' % (type(e).__name__, e))[:200]  # la página ocupada (máquina cargada) da TimeoutError
    try:
        cdp.call('HeapProfiler.enable', {}, ses, 20)
        for _ in range(2):
            cdp.call('HeapProfiler.collectGarbage', {}, ses, 60)
        hu = cdp.call('Runtime.getHeapUsage', {}, ses, 20)
        out['heap_gc_mb'] = round(hu['usedSize'] / MB, 1)
        for k, n in (('embedderHeapUsedSize', 'heap_gc_embedder_mb'), ('backingStorageSize', 'heap_gc_arraybuffers_mb')):
            if hu.get(k) is not None:
                out[n] = round(hu[k] / MB, 1)
        m2 = json.loads(evaluar(cdp, ses, MEMORIA_JS, 60, promesa=False))
        if m2.get('usado'):
            out['heap_gc_pm_mb'] = round(m2['usado'] / MB, 1)
        out.setdefault('b64_residente_mb', round(m2['b64_bytes'] / MB, 2))
        out.setdefault('b64_residente_cadenas', m2['b64_cadenas'])
        cdp.call('HeapProfiler.disable', {}, ses, 20)
    except (CDPError, JSError, TimeoutError, KeyError, ValueError) as e:
        out['error_heap_gc'] = ('%s: %s' % (type(e).__name__, e))[:200]
    return out


# ---------------------------------------------------------------- Chrome
class Chrome:
    def __init__(self, cfg, prohibidos, log_path, puerto_devtools=0):
        exe = os.environ.get('AV_CHROME') or cfg['chrome']
        if not os.path.exists(exe):
            raise Infra('no encuentro Chrome en %s (define AV_CHROME)' % exe)
        if puerto_devtools in prohibidos:
            raise Infra('el puerto %d de DevTools está reservado para otro agente' % puerto_devtools)
        self.perfil = tempfile.mkdtemp(prefix='avtest-chrome-')
        self.log_path = log_path
        self.log = open(self.log_path, 'w')
        args = [exe] + cfg['chrome_flags'] + ['--remote-debugging-port=%d' % puerto_devtools, '--user-data-dir=' + self.perfil,
                                             '--window-size=%d,%d' % tuple(cfg['ventana']), 'about:blank']
        self.proc = subprocess.Popen(args, stdout=self.log, stderr=subprocess.STDOUT, start_new_session=True)
        archivo = os.path.join(self.perfil, 'DevToolsActivePort')
        limite = time.monotonic() + 40
        while time.monotonic() < limite:
            if self.proc.poll() is not None:
                raise Infra('Chrome terminó al arrancar (código %s): %s' % (self.proc.returncode, self.cola()))
            try:
                lineas = open(archivo).read().split()
                if len(lineas) >= 2:
                    self.puerto, self.ws_path = int(lineas[0]), lineas[1]
                    break
            except (OSError, ValueError):
                pass
            time.sleep(0.1)
        else:
            raise Infra('Chrome no abrió DevTools en 40 s: ' + self.cola())
        if self.puerto in prohibidos:
            raise Infra('Chrome eligió el puerto reservado %d' % self.puerto)
        with urllib.request.urlopen('http://127.0.0.1:%d/json/version' % self.puerto, timeout=10) as r:
            self.version = json.loads(r.read().decode()).get('Browser', '?')

    def cola(self):
        try:
            self.log.flush()
            return ' | '.join(open(self.log_path, errors='replace').read().strip().splitlines()[-5:])
        except OSError:
            return ''

    def cerrar(self):
        if self.proc.poll() is None:
            try:
                os.killpg(self.proc.pid, signal.SIGTERM)
            except OSError:
                pass
            try:
                self.proc.wait(8)
            except subprocess.TimeoutExpired:
                try:
                    os.killpg(self.proc.pid, signal.SIGKILL)
                except OSError:
                    pass
                self.proc.wait(5)
        self.log.close()
        shutil.rmtree(self.perfil, ignore_errors=True)


# ---------------------------------------------------------------- integridad
def sha256_archivo(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for c in iter(lambda: f.read(1 << 20), b''):
            h.update(c)
    return h.hexdigest()


def verificar_manifiesto(raiz, man):
    reales = {}
    for d, _, fs in os.walk(raiz):
        for f in fs:
            p = os.path.join(d, f)
            reales[os.path.relpath(p, raiz).replace(os.sep, '/')] = p
    esperados = {x['ruta']: x for x in man['archivos']}
    faltan = sorted(set(esperados) - set(reales))
    sobran = sorted(set(reales) - set(esperados))
    distintos = sorted(r for r in set(esperados) & set(reales) if sha256_archivo(reales[r]) != esperados[r]['sha256'])
    return faltan, sobran, distintos


# ---------------------------------------------------------------- principal
def correr(a, cfg):
    P = cfg['pruebas']
    carpeta = os.path.abspath(a.carpeta)
    if os.path.exists(os.path.join(carpeta, 'site', 'index.html')):
        raiz, build = os.path.join(carpeta, 'site'), carpeta
    elif os.path.exists(os.path.join(carpeta, 'index.html')):
        raiz = carpeta
        build = os.path.dirname(carpeta) if os.path.exists(os.path.join(os.path.dirname(carpeta), 'manifiesto.json')) else None
    else:
        raise Infra('no hay index.html en %s ni en %s/site' % (carpeta, carpeta))
    informe = os.path.abspath(a.informe) if a.informe else (build or tempfile.mkdtemp(prefix='avtest-informe-'))
    os.makedirs(informe, exist_ok=True)
    R = {'avtest': VERSION, 'carpeta': raiz, 'inicio': datetime.datetime.now().astimezone().isoformat(timespec='seconds'),
         'fallas': [], 'avisos': []}
    falla = R['fallas'].append
    aviso = R['avisos'].append

    # 1. Integridad frente al manifiesto
    man = None
    if build and os.path.exists(os.path.join(build, 'manifiesto.json')):
        man = json.load(open(os.path.join(build, 'manifiesto.json')))
        faltan, sobran, distintos = verificar_manifiesto(raiz, man)
        R['manifiesto'] = {'ref': man.get('ref'), 'commit': man.get('commit'), 'huella': man.get('huella'), 'estado_build': man.get('estado'),
                           'archivos': len(man['archivos']), 'faltan': faltan, 'sobran': sobran, 'distintos': distintos}
        if faltan or sobran or distintos:
            falla('la carpeta no coincide con su manifiesto (faltan %d, sobran %d, distintos %d)' % (len(faltan), len(sobran), len(distintos)))
        if man.get('estado') != 'ok':
            aviso('la build se generó con errores de validación (manifiesto: %s)' % man.get('estado'))
    else:
        aviso('sin manifiesto.json: no se comprueba que lo probado sea lo que se publica')
    podados = set()
    if build and os.path.exists(os.path.join(build, 'reporte-build.json')):
        try:
            podados = {p['archivo'] for p in json.load(open(os.path.join(build, 'reporte-build.json'))).get('podados') or []}
        except (OSError, ValueError):
            pass

    # Build marcada sin .glb (<meta name="ave:sin-glb">): el juego no debe pedir ningún .glb
    try:
        sin_glb = 'name="ave:sin-glb"' in open(os.path.join(raiz, 'index.html'), encoding='utf-8', errors='replace').read(4096)
    except OSError:
        sin_glb = False
    R['build_sin_glb'] = sin_glb

    # Archivos de prueba que se inyectan (no son parte de la build): del commit de la build si está; si no, de la copia de trabajo
    repo = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
    extra_dir = tempfile.mkdtemp(prefix='avtest-pruebas-')
    inyectados = []
    for ruta in P.get('inyectar') or []:
        datos, origen = None, None
        if man and man.get('commit'):
            r = subprocess.run(['git', '-C', repo, 'show', '%s:%s' % (man['commit'], ruta)], capture_output=True)
            if r.returncode == 0:
                datos, origen = r.stdout, 'commit %s' % man['commit'][:7]
        if datos is None and os.path.exists(os.path.join(repo, ruta)):
            datos, origen = open(os.path.join(repo, ruta), 'rb').read(), 'copia de trabajo'
            aviso('%s no está en el commit de la build: se inyecta el de la copia de trabajo' % ruta)
        if datos is None:
            aviso('no encuentro %s para inyectarlo' % ruta)
            continue
        open(os.path.join(extra_dir, posix_basename(ruta)), 'wb').write(datos)
        inyectados.append({'ruta': ruta, 'url': PRUEBAS_RUTA + posix_basename(ruta), 'origen': origen})
    R['inyectados'] = inyectados

    H = cfg['hosts_permitidos']
    permitidos = set(H['scripts']) | set(H['estilos']) | set(H['fuentes'])
    estado = {'ses': None, 'reqs': {}, 'excepciones': [], 'consola': [], 'log': [], 'avisos_consola': 0, 'muestras_aviso': [], 'caida': False,
              'fase': 'arranque', 'ultima_red': time.monotonic()}

    def al_evento(m):
        if estado['ses'] and m.get('sessionId') not in (None, estado['ses']):
            return
        me, p = m.get('method'), m.get('params') or {}
        if me and me.startswith('Network.'):
            estado['ultima_red'] = time.monotonic()
        if me == 'Runtime.exceptionThrown':
            d = p.get('exceptionDetails') or {}
            estado['excepciones'].append({'texto': ((d.get('exception') or {}).get('description') or d.get('text') or '')[:600],
                                          'url': d.get('url', ''), 'linea': d.get('lineNumber')})
        elif me == 'Runtime.consoleAPICalled':
            texto = ' '.join(str(x.get('value', x.get('description', ''))) for x in p.get('args') or [])[:600]
            if p.get('type') in ('error', 'assert'):
                estado['consola'].append({'tipo': p['type'], 'texto': texto})
            elif p.get('type') == 'warning':
                estado['avisos_consola'] += 1
                if len(estado['muestras_aviso']) < 8 and texto not in estado['muestras_aviso']:
                    estado['muestras_aviso'].append(texto)
        elif me == 'Log.entryAdded':
            e = p.get('entry') or {}
            if e.get('level') == 'error':
                estado['log'].append({'texto': e.get('text', '')[:600], 'url': e.get('url', ''), 'fuente': e.get('source', '')})
        elif me == 'Network.requestWillBeSent':
            q = p.get('request') or {}
            estado['reqs'].setdefault(p['requestId'], {}).update(url=q.get('url', ''), metodo=q.get('method'), tipo=p.get('type'), fase=estado['fase'])
        elif me == 'Network.responseReceived':
            estado['reqs'].setdefault(p['requestId'], {})['estado'] = (p.get('response') or {}).get('status')
        elif me == 'Network.loadingFinished':
            estado['reqs'].setdefault(p['requestId'], {}).update(bytes=int(p.get('encodedDataLength') or 0), fin=True)
        elif me == 'Network.loadingFailed':
            estado['reqs'].setdefault(p['requestId'], {}).update(fallo=p.get('errorText'), cancelado=p.get('canceled'), bloqueo=p.get('blockedReason'), fin=True)
        elif me in ('Inspector.targetCrashed', 'Target.targetCrashed'):
            estado['caida'] = True

    t_ini = time.monotonic()
    srv = chrome = ws = None
    try:
        srv = Servidor(raiz, a.puerto or 0, extra_dir)
        origen = 'http://127.0.0.1:%d' % srv.puerto
        chrome = Chrome(P, set(P['puertos_prohibidos']), os.path.join(informe, 'chrome-test.log'))
        R['entorno'] = {'chrome': chrome.version, 'puerto_web': srv.puerto, 'puerto_devtools': chrome.puerto, 'perfil': chrome.perfil}
        print('· servidor %s · Chrome %s · DevTools 127.0.0.1:%d (perfil temporal propio)' % (origen, chrome.version, chrome.puerto), flush=True)
        ws = WS('ws://127.0.0.1:%d%s' % (chrome.puerto, chrome.ws_path))
        cdp = CDP(ws, al_evento)
        tid = cdp.call('Target.createTarget', {'url': 'about:blank'})['targetId']
        ses = estado['ses'] = cdp.call('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
        for me, pa in (('Page.enable', {}), ('Runtime.enable', {}), ('Log.enable', {}), ('Network.enable', {}),
                       ('Network.setCacheDisabled', {'cacheDisabled': True}), ('Emulation.setFocusEmulationEnabled', {'enabled': True})):
            cdp.call(me, pa, ses)
        cdp.call('Page.navigate', {'url': origen + '/index.html'}, ses)

        # 2. Arranque
        t0 = time.monotonic()
        listo = False
        while time.monotonic() - t0 < P['espera_listo_s'] and not estado['caida']:
            try:
                listo = bool(evaluar(cdp, ses, '!!(%s)' % P['listo_js'], 10, promesa=False))
            except (CDPError, JSError, TimeoutError):
                listo = False
            if listo:
                break
            cdp.bombear(0.5)
        R['arranque_s'] = round(time.monotonic() - t0, 1)
        if not listo:
            falla('el juego no expuso window.AV con el personaje en %d s' % P['espera_listo_s'])
        else:
            f3d = evaluar(cdp, ses, '!!(window.AV.G.actores.failed3D)', 10, promesa=False)
            if f3d:
                falla('el modelo 3D de Vittata no cargó (actores.failed3D)')
            print('· juego listo en %.1f s' % R['arranque_s'], flush=True)
            cdp.bombear(1.5)
            if P.get('preparar_js'):
                try:
                    R['preparacion'] = evaluar(cdp, ses, P['preparar_js'], 90, promesa=True)
                except (CDPError, JSError, TimeoutError) as e:
                    R['preparacion'] = 'error: %s' % e
                if not str(R['preparacion']).startswith('ok'):
                    falla('flujo de jugador nuevo: %s' % R['preparacion'])
                print('· preparación: %s' % R['preparacion'], flush=True)
                cdp.bombear(0.8)
            # Medidas de la carga inicial (antes de las baterías): red quieta, heap y base64 residente
            R['medidas'] = medir(cdp, ses, estado, P)
            estado['fase'] = 'pruebas'
            med = R['medidas']
            print('· medida la carga inicial: heap %s MB (%s MB tras GC) · base64 residente %s MB' % (
                med.get('heap_mb'), med.get('heap_gc_mb'), med.get('b64_residente_mb')), flush=True)
            for x in ([] if a.solo_medir else inyectados):
                try:
                    evaluar(cdp, ses, INYECTAR_JS % json.dumps(x['url']), 30, promesa=True)
                except (CDPError, JSError, TimeoutError) as e:
                    falla('no se pudo inyectar %s: %s' % (x['ruta'], e))
            try:
                png = cdp.call('Page.captureScreenshot', {'format': 'png'}, ses, 30)['data']
                open(os.path.join(informe, 'captura-arranque.png'), 'wb').write(base64.b64decode(png))
            except (CDPError, TimeoutError):
                aviso('no se pudo capturar la pantalla de arranque')
            disponibles = evaluar(cdp, ses, "Object.keys(window.AV || {}).filter(k => /Test$/.test(k) && typeof window.AV[k] === 'function')", 10, promesa=False) or []
            R['baterias_disponibles'] = disponibles
            req = [] if a.solo_medir else list(P['baterias'])
            extra = [b for b in disponibles if b not in req] if a.extra else []
            R['baterias'] = {}
            # 3. Baterías
            for nombre in req + extra:
                if time.monotonic() - t_ini > P['total_max_s']:
                    R['baterias'][nombre] = {'existe': None, 'error': 'sin tiempo (límite total %d s)' % P['total_max_s'], 'requerida': nombre in req}
                    continue
                print('· AV.%s() …' % nombre, end=' ', flush=True)
                try:
                    r = json.loads(evaluar(cdp, ses, BATERIA_JS % json.dumps(nombre), P['bateria_max_s']))
                except TimeoutError:
                    r = {'existe': True, 'error': 'tiempo agotado (%d s)' % P['bateria_max_s']}
                except (CDPError, JSError) as e:
                    r = {'existe': True, 'error': str(e)[:600]}
                r['requerida'] = nombre in req
                R['baterias'][nombre] = r
                if not r.get('existe'):
                    print('no existe')
                elif 'error' in r:
                    print('ERROR: ' + r['error'].splitlines()[0][:160])
                else:
                    print('%d/%d en %.1f s' % (r['passed'], r['total'], r['ms'] / 1000))
                cdp.bombear(0.3)
            cdp.bombear(2.0)
            try:
                R['ave_errores'] = json.loads(evaluar(cdp, ses, 'JSON.stringify(window.__aveErrores || [])', 10, promesa=False) or '[]')
            except (CDPError, JSError, TimeoutError):
                R['ave_errores'] = None
            try:
                png = cdp.call('Page.captureScreenshot', {'format': 'png'}, ses, 30)['data']
                open(os.path.join(informe, 'captura-final.png'), 'wb').write(base64.b64decode(png))
            except (CDPError, TimeoutError):
                pass
        try:
            cdp.call('Browser.close', {}, None, 5)
        except (CDPError, TimeoutError, Infra, OSError):
            pass
    except Infra as e:
        raise Infra('%s · Chrome: %s · %s' % (e, 'vivo' if chrome and chrome.proc.poll() is None else 'terminó (%s)' % (chrome.proc.returncode if chrome else '?'),
                                             chrome.cola() if chrome else '')) from None
    finally:
        if ws:
            ws.cerrar()
        if chrome:
            chrome.cerrar()
        if srv:
            srv.cerrar()
        shutil.rmtree(extra_dir, ignore_errors=True)

    # 4. Veredicto
    for nombre, r in (R.get('baterias') or {}).items():
        if not r['requerida']:
            continue
        if not r.get('existe'):
            falla('AV.%s no existe en esta build' % nombre if r.get('existe') is False else 'AV.%s: %s' % (nombre, r.get('error')))
        elif 'error' in r:
            falla('AV.%s lanzó: %s' % (nombre, r['error'].splitlines()[0][:200]))
        elif r['total'] == 0 or r['passed'] != r['total']:
            mal = [x for x in r['results'] if not x['ok']]
            falla('AV.%s %d/%d · falla: %s' % (nombre, r['passed'], r['total'], ' | '.join(x['name'] + (' (%s)' % x['extra'] if x['extra'] else '') for x in mal)[:600]))
    for nombre, r in (R.get('baterias') or {}).items():
        if not r['requerida'] and r.get('existe') and ('error' in r or r.get('passed') != r.get('total')):
            aviso('AV.%s (extra, no obligatoria) no pasa: %s' % (nombre, r.get('error') or '%s/%s' % (r.get('passed'), r.get('total'))))
    if estado['caida']:
        falla('la pestaña de Chrome se cayó')

    # Red
    puerto = R.get('entorno', {}).get('puerto_web')
    locales, sondas, rotas, ext_ok, ext_mal, ext_fallo, n404 = 0, [], [], set(), set(), set(), 0
    ini = {'bytes': 0, 'peticiones': 0, 'por_tipo': {}, 'archivos': {}}
    for q in estado['reqs'].values():
        u = q.get('url', '')
        if not u or u.startswith(('data:', 'blob:', 'about:', 'chrome', 'devtools')):
            continue
        sp = urllib.parse.urlsplit(u)
        mal = (q.get('fallo') and not q.get('cancelado')) or (q.get('estado') or 0) >= 400
        n404 += (q.get('estado') == 404)
        local = sp.hostname == '127.0.0.1' and sp.port == puerto
        ruta = urllib.parse.unquote(sp.path).lstrip('/') or 'index.html' if local else u
        if q.get('fase') == 'arranque' and not ruta.startswith(PRUEBAS_RUTA.strip('/')):
            # Cada archivo cuenta una vez (lo que baja un navegador con caché); las repeticiones van aparte
            ini['bytes_peticiones'] = ini.get('bytes_peticiones', 0) + q.get('bytes', 0)
            ini['peticiones'] += 1
            ini['archivos'][ruta] = max(ini['archivos'].get(ruta, 0), q.get('bytes', 0))
        if local:
            if not mal:
                locales += 1
            elif ruta.endswith('.glb') and os.path.exists(os.path.join(raiz, ruta[:-4] + '_glb.js')):
                sondas.append(ruta)
            elif ruta == 'favicon.ico':
                continue
            else:
                rotas.append({'ruta': ruta, 'estado': q.get('estado'), 'fallo': q.get('fallo'), 'podado': ruta in podados})
        else:
            h = (sp.hostname or '').lower()
            if h in permitidos:
                (ext_fallo if mal else ext_ok).add(u)
            else:
                ext_mal.add(u)
    for r in rotas:
        falla('petición rota: %s (%s)%s' % (r['ruta'], r['estado'] or r['fallo'],
                                            ' · la build la podó: añádela a podar.conservar en tools/build/config.json' if r['podado'] else ''))
    for u in sorted(ext_mal):
        falla('petición a un dominio no permitido: %s' % u)
    for u in sorted(ext_fallo):
        falla('no cargó un recurso externo permitido (¿sin red?): %s' % u)
    if sin_glb and sondas:
        falla('la build está marcada sin .glb (ave:sin-glb) y el juego pidió %d .glb con 404: %s' % (len(set(sondas)), ', '.join(sorted(set(sondas))[:5])))
    R['red'] = {'locales_ok': locales, 'sondas_glb': len(set(sondas)), 'peticiones_404': n404, 'rotas': rotas,
                'externas_permitidas': sorted(ext_ok), 'externas_prohibidas': sorted(ext_mal), 'externas_fallidas': sorted(ext_fallo)}

    # Carga inicial y presupuestos (lo pedido hasta tener el mundo jugable, antes de las baterías)
    PR = P.get('presupuestos') or {}
    duros = set(PR.get('fallan') or [])
    for ruta, b in ini['archivos'].items():
        t = ('_glb.js' if ruta.endswith('_glb.js') else '.glb' if ruta.endswith('.glb') else 'imágenes' if re.search(r'\.(png|jpe?g|webp)$', ruta, re.I)
             else '.js' if ruta.endswith('.js') else 'externas' if ruta.startswith('http') else 'otros')
        ini['por_tipo'][t] = ini['por_tipo'].get(t, 0) + b
    ini['bytes'] = sum(ini['archivos'].values())
    ini['archivos_n'] = len(ini['archivos'])
    ini['mb'] = round(ini['bytes'] / MB, 2)
    ini['mb_peticiones'] = round(ini.get('bytes_peticiones', 0) / MB, 2)
    ini['por_tipo'] = {k: round(v / MB, 2) for k, v in sorted(ini['por_tipo'].items(), key=lambda kv: -kv[1])}
    ini['mayores'] = [[k, round(v / 1024)] for k, v in sorted(ini['archivos'].items(), key=lambda kv: -kv[1])[:15]]
    del ini['archivos']
    R['carga_inicial'] = ini
    med = R.get('medidas') or {}
    for clave, valor, unidad in (('descarga_inicial_mb', ini['mb'], 'MB de descarga inicial'), ('heap_mb', med.get('heap_mb'), 'MB de heap a ~9 s'),
                                 ('heap_gc_mb', med.get('heap_gc_mb'), 'MB de heap tras GC'), ('b64_residente_mb', med.get('b64_residente_mb'), 'MB de base64 residente')):
        lim = PR.get(clave)
        if lim is None:
            continue
        if valor is None:
            aviso('presupuesto sin medir: %s (%s)' % (clave, med.get('error_heap') or med.get('error_heap_gc') or 'sin dato'))
            continue
        if valor > lim:
            (falla if clave in duros else aviso)('presupuesto: %s %s (límite %s)' % (valor, unidad, lim))

    # Consola
    permitidos_re = [re.compile(x) for x in P['errores_permitidos']]
    sondas_url = {'http://127.0.0.1:%d/%s' % (puerto, s) for s in sondas} if puerto else set()

    def esperado(t, url=''):
        if url in sondas_url or url.endswith('/favicon.ico'):
            return True
        return any(r.search(t) for r in permitidos_re)
    errs = [dict(e, origen='excepción') for e in estado['excepciones'] if not esperado(e['texto'], e.get('url', ''))]
    errs += [dict(e, origen='console.' + e['tipo']) for e in estado['consola'] if not esperado(e['texto'])]
    errs += [dict(e, origen='log:' + e['fuente']) for e in estado['log'] if not esperado(e['texto'], e.get('url', ''))
             and not (e['fuente'] == 'network' and any(e.get('url', '').endswith(r['ruta']) for r in rotas))]
    R['consola'] = {'errores': errs[:100], 'errores_total': len(errs), 'avisos_total': estado['avisos_consola'], 'muestras_aviso': estado['muestras_aviso']}
    if errs:
        msg = '%d errores en consola: %s' % (len(errs), ' | '.join('%s: %s' % (e['origen'], e['texto'].splitlines()[0][:140]) for e in errs[:4]))
        (falla if P['consola_errores_fallan'] else aviso)(msg)

    R['duracion_s'] = round(time.monotonic() - t_ini, 1)
    R['estado'] = 'pasa' if not R['fallas'] else 'falla'
    escribir_reporte(informe, R)
    print('· %s · %s' % ('PASA' if R['estado'] == 'pasa' else 'FALLA', ', '.join(
        '%s %s' % (n, ('%d/%d' % (r['passed'], r['total'])) if r.get('existe') and 'error' not in r else 'X') for n, r in (R.get('baterias') or {}).items())))
    print('  red: %d locales ok, %d con 404 (%d sondas .glb), %d rotas, %d externas permitidas, %d prohibidas · consola: %d errores, %d avisos'
          % (locales, n404, len(set(sondas)), len(rotas), len(ext_ok), len(ext_mal), len(errs), estado['avisos_consola']))
    print('  carga inicial: %.2f MB en %d archivos %s (%.2f MB en %d peticiones sin caché) · heap %s MB (%s MB tras GC) · base64 residente %s MB'
          % (ini['mb'], ini['archivos_n'], json.dumps(ini['por_tipo'], ensure_ascii=False), ini['mb_peticiones'], ini['peticiones'],
             med.get('heap_mb'), med.get('heap_gc_mb'), med.get('b64_residente_mb')))
    for f in R['fallas']:
        print('  FALLA ' + f)
    for w in R['avisos']:
        print('  aviso ' + w)
    print('  reporte: %s' % os.path.join(informe, 'reporte-test.md'))
    return 0 if R['estado'] == 'pasa' else 1


def escribir_reporte(informe, R):
    md = ['# Pruebas de la build · %s\n' % ('PASA' if R['estado'] == 'pasa' else 'FALLA')]
    m = R.get('manifiesto')
    if m:
        md.append('- Build: `%s` → `%s` · huella `%s` · %d archivos · coincide con el manifiesto: %s'
                  % (m['ref'], (m['commit'] or '')[:10], (m['huella'] or '')[:16], m['archivos'], 'sí' if not (m['faltan'] or m['sobran'] or m['distintos']) else 'NO'))
    e = R.get('entorno') or {}
    md.append('- %s · %s · servidor 127.0.0.1:%s · DevTools 127.0.0.1:%s (perfil temporal propio)' % (R['inicio'], e.get('chrome', '?'), e.get('puerto_web', '?'), e.get('puerto_devtools', '?')))
    md.append('- Arranque hasta window.AV: %s s · preparación: %s · duración total: %s s\n' % (R.get('arranque_s', '?'), R.get('preparacion', '—'), R.get('duracion_s', '?')))
    md.append('## Baterías\n')
    md.append('| Batería | Resultado | Tiempo | Detalle |\n|---|---|---|---|')
    for n, r in (R.get('baterias') or {}).items():
        if not r.get('existe'):
            res, det = 'NO EXISTE' if r.get('existe') is False else 'NO CORRIÓ', r.get('error', '')
        elif 'error' in r:
            res, det = 'ERROR', r['error'].splitlines()[0][:200]
        else:
            ok = r['passed'] == r['total'] and r['total'] > 0
            res = '%s %d/%d' % ('pasa' if ok else 'FALLA', r['passed'], r['total'])
            det = ' · '.join(x['name'] + (' (%s)' % x['extra'] if x['extra'] else '') for x in r['results'] if not x['ok'])[:400]
        md.append('| %s%s | %s | %s | %s |' % (n, '' if r.get('requerida') else ' (extra)', res, '%.1f s' % (r['ms'] / 1000) if r.get('ms') else '—', det.replace('|', '/')))
    ci, med = R.get('carga_inicial') or {}, R.get('medidas') or {}
    md.append('\n## Carga inicial y memoria\n')
    md.append('Desde que se abre la página hasta tener el mundo jugable (portada → creador → Empezar, red quieta), antes de las baterías.\n')
    md.append('| Medida | Valor |\n|---|---|')
    md.append('| Descarga inicial (cada archivo una vez) | **%s MB** en %s archivos |' % (ci.get('mb', '?'), ci.get('archivos_n', '?')))
    md.append('| Sin caché HTTP (cada petición cuenta) | %s MB en %s peticiones |' % (ci.get('mb_peticiones', '?'), ci.get('peticiones', '?')))
    md.append('| Por tipo (MB) | %s |' % ', '.join('%s %s' % kv for kv in (ci.get('por_tipo') or {}).items()))
    md.append('| Heap a ~%s s, sin forzar GC | **%s MB** |' % (med.get('heap_t_s', '?'), med.get('heap_mb', '?')))
    md.append('| Heap tras GC | %s MB |' % med.get('heap_gc_mb', '?'))
    md.append('| Base64 que sigue en `window.AV_*_B64` | %s MB en %s cadenas |' % (med.get('b64_residente_mb', '?'), med.get('b64_residente_cadenas', '?')))
    md.append('| Build marcada sin .glb (`ave:sin-glb`) | %s |' % ('sí' if R.get('build_sin_glb') else 'no'))
    if ci.get('mayores'):
        md.append('\nMayores en la carga inicial: ' + ', '.join('`%s` %s KB' % (k, v) for k, v in ci['mayores'][:10]) + '.')
    red = R.get('red') or {}
    md.append('\n## Red\n')
    md.append('- %s peticiones locales correctas; %s con 404, de ellas %s sondas .glb' % (red.get('locales_ok', 0), red.get('peticiones_404', 0), red.get('sondas_glb', 0)))
    md.append('- Rotas: %s' % (', '.join('%s (%s)' % (r['ruta'], r['estado'] or r['fallo']) for r in red.get('rotas') or []) or 'ninguna'))
    md.append('- Externas permitidas: %s' % (', '.join(red.get('externas_permitidas') or []) or 'ninguna'))
    md.append('- Externas prohibidas: %s' % (', '.join(red.get('externas_prohibidas') or []) or 'ninguna'))
    c = R.get('consola') or {}
    md.append('\n## Consola\n')
    md.append('- %s errores, %s avisos' % (c.get('errores_total', 0), c.get('avisos_total', 0)))
    md += ['  - %s: %s' % (x['origen'], x['texto'].splitlines()[0][:200]) for x in (c.get('errores') or [])[:20]]
    if R['fallas']:
        md.append('\n## Fallas\n')
        md += ['- ' + f for f in R['fallas']]
    if R['avisos']:
        md.append('\n## Avisos\n')
        md += ['- ' + w for w in R['avisos']]
    md.append('\nCapturas: `captura-arranque.png`, `captura-final.png`.')
    with open(os.path.join(informe, 'reporte-test.md'), 'w') as f:
        f.write('\n'.join(md) + '\n')
    with open(os.path.join(informe, 'reporte-test.json'), 'w') as f:
        json.dump(R, f, ensure_ascii=False, indent=1)


def main():
    ap = argparse.ArgumentParser(description='Pruebas de una build de Amazona Verse en Chrome sin interfaz')
    ap.add_argument('carpeta')
    ap.add_argument('--config', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config.json'))
    ap.add_argument('--extra', action='store_true', help='corre también las AV.*Test que no están en config (informativas)')
    ap.add_argument('--puerto', type=int, default=0, help='puerto del servidor web (por defecto, uno libre)')
    ap.add_argument('--informe', help='carpeta para reporte-test.* (por defecto, la de la build)')
    ap.add_argument('--solo-medir', action='store_true', help='solo el flujo de jugador nuevo y las medidas de carga y heap, sin baterías')
    ap.add_argument('--reintentos', type=int, default=1, help='reintentos si Chrome o el servidor fallan (no si fallan las pruebas)')
    a = ap.parse_args()
    signal.signal(signal.SIGTERM, lambda *x: sys.exit(2))
    cfg = json.load(open(a.config))
    intentos = 1 + max(0, a.reintentos)
    for n in range(1, intentos + 1):
        try:
            return correr(a, cfg)
        except Infra as e:
            # Chrome sin interfaz puede caer por falta de memoria (no es culpa de la build): se reintenta desde cero
            print('· NO SE PUDO PROBAR (intento %d de %d): %s' % (n, intentos, e), file=sys.stderr)
        except KeyboardInterrupt:
            print('· interrumpido', file=sys.stderr)
            return 2
    return 2


if __name__ == '__main__':
    sys.exit(main())
