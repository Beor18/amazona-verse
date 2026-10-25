#!/usr/bin/env python3
"""Captura del pitch en un solo comando (herramienta del editor de video; no toca el juego).

  python3 tools/video/capturar.py --ver v1                       # todas las tomas de tools/video/guiones/pitch.json
  python3 tools/video/capturar.py --ver v1 --solo vuelo_mirador   # recapturar una o varias tomas (coma)
  python3 tools/video/capturar.py --ver v1p --previa              # 3 cuadros por toma para revisar encuadres
  python3 tools/video/capturar.py --ver v1 --solo-mover           # solo mover lo que ya esté en tests/out

Qué hace:
 1. Comprueba el servidor de desarrollo (tests/server.py en :8765) y lo arranca si no está.
 2. Abre tools/video/capturar.html en Google Chrome sin ventana (perfil propio y temporal, sin tocar el del usuario).
    La página carga el juego en un iframe de 1920x1080, le inyecta tools/video/captura.js y corre el guion:
    cada cuadro llega por POST /__save a tests/out/pitch-<ver>-<toma>-<00000>.jpg.
 3. Mueve los cuadros, mientras llegan, a ~/AmazonaVerse/_trabajo_claude/pitch/frames/<ver>/<toma>/<00000>.jpg
    (los gráficos a frames/<ver>/gfx/) y fusiona el manifiesto de la versión (frames/<ver>/manifest.json).
    Al recapturar una toma se borran antes sus cuadros viejos.
Con --navegador abrir usa el navegador por defecto (con ventana) en lugar de Chrome sin ventana.
"""
import argparse
import json
import os
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import urllib.request

JUEGO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(JUEGO, 'tests', 'out')
TRABAJO = os.path.expanduser('~/AmazonaVerse/_trabajo_claude/pitch')
FRAMES = os.path.join(TRABAJO, 'frames')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
PUERTO = 8765
PAT = re.compile(r'^pitch-(?P<ver>\w+?)-(?P<toma>\w+)-(?P<n>\d{5})\.jpg$')
PAT_GFX = re.compile(r'^pitch-(?P<ver>\w+?)-gfx-(?P<id>\w+)\.png$')
PAT_HOJA = re.compile(r'^pitch-(?P<ver>\w+?)-hoja-(?P<n>\w+)\.jpg$')


def servidor_vivo():
    try:
        with urllib.request.urlopen(f'http://127.0.0.1:{PUERTO}/index.html', timeout=3) as r:
            return r.status == 200
    except Exception:
        return False


def asegurar_servidor():
    if servidor_vivo():
        return None
    print(f'· arrancando tests/server.py en :{PUERTO}')
    p = subprocess.Popen([sys.executable, os.path.join(JUEGO, 'tests', 'server.py'), str(PUERTO)], cwd=JUEGO,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        if servidor_vivo():
            return p
        time.sleep(0.2)
    sys.exit('No arrancó el servidor de desarrollo')


class Movedor:
    """Mueve los archivos de una versión desde tests/out a frames/<ver>/ en cuanto terminan de escribirse."""

    def __init__(self, ver):
        self.ver = ver
        self.dest = os.path.join(FRAMES, ver)
        self.limpias = set()   # tomas cuyo directorio ya se vació en esta corrida
        self.movidos = 0
        os.makedirs(self.dest, exist_ok=True)

    def pasada(self, todo=False):
        ahora = time.time()
        for nombre in os.listdir(OUT):
            if not nombre.startswith(f'pitch-{self.ver}-'):
                continue
            ruta = os.path.join(OUT, nombre)
            try:
                if not todo and ahora - os.path.getmtime(ruta) < 1.0:
                    continue  # quizá aún se está escribiendo
            except FileNotFoundError:
                continue
            m = PAT.match(nombre)
            g = PAT_GFX.match(nombre)
            h = PAT_HOJA.match(nombre)
            if h and h.group('ver') == self.ver:
                d = os.path.join(self.dest, 'hojas')
                if 'hojas' not in self.limpias:
                    shutil.rmtree(d, ignore_errors=True)
                    self.limpias.add('hojas')
                os.makedirs(d, exist_ok=True)
                shutil.move(ruta, os.path.join(d, h.group('n') + '.jpg'))
            elif m and m.group('ver') == self.ver:
                toma = m.group('toma')
                d = os.path.join(self.dest, toma)
                if toma not in self.limpias:
                    shutil.rmtree(d, ignore_errors=True)
                    self.limpias.add(toma)
                os.makedirs(d, exist_ok=True)
                shutil.move(ruta, os.path.join(d, m.group('n') + '.jpg'))
                self.movidos += 1
            elif g and g.group('ver') == self.ver:
                d = os.path.join(self.dest, 'gfx')
                os.makedirs(d, exist_ok=True)
                shutil.move(ruta, os.path.join(d, g.group('id') + '.png'))
            elif nombre == f'pitch-{self.ver}-manifest.json':
                self.fusionar(ruta)

    def fusionar(self, ruta):
        """El manifiesto de la corrida se fusiona con el de la versión (las tomas recapturadas se reemplazan)."""
        with open(ruta, encoding='utf-8') as f:
            nuevo = json.load(f)
        os.remove(ruta)
        mpath = os.path.join(self.dest, 'manifest.json')
        viejo = {}
        if os.path.exists(mpath):
            with open(mpath, encoding='utf-8') as f:
                viejo = json.load(f)
        tomas = {t['id']: t for t in viejo.get('tomas', [])}
        for t in nuevo.get('tomas', []):
            t['capturada'] = nuevo.get('fin')
            tomas[t['id']] = t
        viejo.update({k: v for k, v in nuevo.items() if k != 'tomas'})
        viejo['tomas'] = list(tomas.values())
        with open(mpath, 'w', encoding='utf-8') as f:
            json.dump(viejo, f, ensure_ascii=False, indent=1)

    def estado(self):
        ruta = os.path.join(OUT, f'pitch-{self.ver}-estado.json')
        if not os.path.exists(ruta):
            return None
        try:
            with open(ruta, encoding='utf-8') as f:
                d = json.load(f)
        except (OSError, ValueError):
            return None
        os.remove(ruta)
        return d


def main():
    global PUERTO
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--ver', required=True, help='versión de la captura (letras, números y _), p. ej. v1')
    ap.add_argument('--guion', default='tools/video/guiones/pitch.json', help='guion de captura, relativo a Juego/')
    ap.add_argument('--solo', help='ids de toma separados por coma')
    ap.add_argument('--previa', action='store_true', help='solo 3 cuadros por toma (inicio, mitad y final)')
    ap.add_argument('--ss', type=int, help='supermuestreo (1 o 2; por defecto el del guion o 2)')
    ap.add_argument('--sin-graficos', action='store_true', help='no regenerar títulos ni logo')
    ap.add_argument('--navegador', choices=['chrome', 'abrir'], default='chrome')
    ap.add_argument('--solo-mover', action='store_true')
    ap.add_argument('--timeout', type=float, default=3600)
    ap.add_argument('--puerto', type=int, default=8765,
                    help='puerto del servidor de desarrollo (tests/server.py); usa uno propio si 8765 es de otro')
    a = ap.parse_args()
    PUERTO = a.puerto
    if not re.fullmatch(r'[A-Za-z0-9_]+', a.ver):
        sys.exit('--ver solo admite letras, números y _')

    mov = Movedor(a.ver)
    if a.solo_mover:
        mov.pasada(todo=True)
        print(f'{mov.movidos} cuadros movidos a {mov.dest}')
        return

    srv = asegurar_servidor()
    # Una pasada por content pack (las tomas con "pack" distinto se capturan en su propia página)
    with open(os.path.join(JUEGO, a.guion), encoding='utf-8') as f:
        guion = json.load(f)
    base_pack = guion.get('pack', 'cap1')
    solo = set(a.solo.split(',')) if a.solo else None
    packs = []
    for t in guion.get('tomas', []):
        pk = t.get('pack', base_pack)
        if not t.get('sinCaptura') and (not solo or t['id'] in solo) and pk not in packs:
            packs.append(pk)
    if base_pack in packs:
        packs.remove(base_pack)
        packs.insert(0, base_pack)
    if not packs:
        packs = [base_pack]
    fin = None
    t0 = time.time()
    try:
        for i, pk in enumerate(packs):
            fin = pasada(a, mov, pk if pk != base_pack else None, graficos=(i == 0 and not a.sin_graficos))
            if not fin or fin.get('error'):
                break
    finally:
        if srv:
            srv.terminate()
    mpath = os.path.join(mov.dest, 'manifest.json')
    print(f'{mov.movidos} cuadros en {mov.dest} · {time.time() - t0:.0f} s')
    if fin and fin.get('error'):
        print('ERROR en la captura:', fin['error'])
        sys.exit(1)
    if not fin:
        sys.exit('La captura no terminó (sin estado final)')
    if os.path.exists(mpath):
        with open(mpath, encoding='utf-8') as f:
            m = json.load(f)
        for t in m.get('tomas', []):
            print(f"  {t['id']:<28} {t['guardados']:>5} cuadros  {t['dur']:>5} s{'  HUD' if t.get('hud') else ''}")


def pasada(a, mov, pack, graficos):
    q = f'guion={a.guion}&ver={a.ver}'
    if pack:
        q += f'&pack={pack}'
    if not graficos:
        q += '&graficos=0'
    if a.solo:
        q += f'&solo={a.solo}'
    if a.previa:
        q += '&previa=1'
    if a.ss:
        q += f'&ss={a.ss}'
    url = f'http://localhost:{PUERTO}/tools/video/capturar.html?{q}'
    perfil = tempfile.mkdtemp(prefix='av_captura_chrome_')
    chrome = None
    # Restos de una corrida anterior interrumpida de esta misma versión
    viejo = os.path.join(OUT, f'pitch-{a.ver}-estado.json')
    if os.path.exists(viejo):
        os.remove(viejo)
    if a.navegador == 'chrome' and os.path.exists(CHROME):
        args = [CHROME, '--headless=new', f'--user-data-dir={perfil}', '--window-size=1280,720', '--hide-scrollbars',
                '--mute-audio', '--no-first-run', '--no-default-browser-check', '--ignore-gpu-blocklist', '--enable-gpu',
                '--use-angle=metal', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
                '--disable-backgrounding-occluded-windows', '--force-device-scale-factor=2', url]
        chrome = subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f'· Chrome sin ventana: {url}')
    else:
        subprocess.call(['open', url])
        print(f'· abierto en el navegador: {url}')

    t0 = time.time()
    fin = None
    try:
        while time.time() - t0 < a.timeout:
            mov.pasada()
            fin = mov.estado()
            if fin:
                break
            if chrome and chrome.poll() is not None:
                print('Chrome terminó antes de tiempo')
                break
            time.sleep(1.0)
        time.sleep(1.5)
        mov.pasada(todo=True)
    finally:
        if chrome and chrome.poll() is None:
            chrome.send_signal(signal.SIGTERM)
            try:
                chrome.wait(10)
            except subprocess.TimeoutExpired:
                chrome.kill()
        shutil.rmtree(perfil, ignore_errors=True)
    return fin


if __name__ == '__main__':
    main()
