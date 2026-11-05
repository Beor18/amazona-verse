#!/usr/bin/env python3
"""Amazona Verse · BM150: cuadros del video del hero con el juego actual (GPU real, sin HUD).

    python3.11 -I tools/build/bm150_video.py [--ver h2] [--solo h2_yunque,...] [--previa]

Arranca el juego (?v18=1&calidad=medio) como bm149 (portada → creador → Empezar), inyecta tools/video/captura.js y corre
tools/video/guiones/hero2.json. Los cuadros que captura.js «sube» a /__save se quedan en memoria en la página y se pasan
por CDP a ~/AmazonaVerse/_trabajo_claude/pitch/frames/<ver>/<toma>/<n>.jpg (lo que lee tools/video/loops.py).
"""
import argparse, base64, json, os, re, shutil, sys, tempfile, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import avtest, look_capturas  # noqa: E402
from tren_capturas import ESPERA_JS  # noqa: E402

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(AQUI, '..', '..'))
FRAMES = os.path.expanduser('~/AmazonaVerse/_trabajo_claude/pitch/frames')
PAT = re.compile(r'^pitch-(?P<ver>\w+?)-(?P<toma>\w+)-(?P<n>\d{5})\.jpg$')
SINK = r'''(() => { window.__F = {}; const f0 = window.fetch.bind(window);
  window.fetch = async (u, o) => { if (String(u).startsWith('/__save')) { const n = decodeURIComponent(String(u).split('name=')[1]);
    const b = await o.body.arrayBuffer(); let s = ''; const u8 = new Uint8Array(b); for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
    window.__F[n] = btoa(s); return new Response('ok', { status: 200 }); } return f0(u, o); }; return 1; })()'''


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ver', default='h2')
    ap.add_argument('--solo', default='')
    ap.add_argument('--previa', action='store_true')
    ap.add_argument('--guion', default='tools/video/guiones/hero2.json')
    a = ap.parse_args()
    P = json.load(open(os.path.join(AQUI, 'config.json')))['pruebas']
    srv = chrome = ws = None
    try:
        srv = avtest.Servidor(REPO, 0, None)
        chrome = look_capturas.ChromePaciente(P, set(P['puertos_prohibidos']), os.path.join(tempfile.mkdtemp(prefix='bm150-'), 'chrome.log'))
        ws = avtest.WS('ws://127.0.0.1:%d%s' % (chrome.puerto, chrome.ws_path))
        cdp = avtest.CDP(ws, lambda m: None)
        tid = cdp.call('Target.createTarget', {'url': 'about:blank'})['targetId']
        ses = cdp.call('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
        for me in ('Page.enable', 'Runtime.enable'):
            cdp.call(me, {}, ses)
        cdp.call('Page.addScriptToEvaluateOnNewDocument', {'source': 'try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}'}, ses)
        cdp.call('Page.navigate', {'url': 'http://127.0.0.1:%d/index.html?clima=sol&calidad=medio&v18=1' % srv.puerto}, ses)
        t0 = time.monotonic()
        while time.monotonic() - t0 < P['espera_listo_s']:
            try:
                if avtest.evaluar(cdp, ses, '!!(%s)' % P['listo_js'], 10, promesa=False):
                    break
            except (avtest.CDPError, avtest.JSError, TimeoutError):
                pass
            cdp.bombear(0.5)
        cdp.bombear(1.0)
        print('· preparar', avtest.evaluar(cdp, ses, P['preparar_js'], 120), flush=True)
        avtest.evaluar(cdp, ses, ESPERA_JS, 120)
        avtest.evaluar(cdp, ses, "(() => { window.dispatchEvent(new Event('pointerdown')); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' })); return 1; })()", 10, promesa=False)
        for _ in range(60):
            if avtest.evaluar(cdp, ses, '!!(AV.G.v18 && AV.G.v18.cambiarMundo)', 10, promesa=False):
                break
            cdp.bombear(0.5)
        print('· v18', avtest.evaluar(cdp, ses, '!!(AV.G.v18 && AV.G.v18.cambiarMundo)', 10, promesa=False), flush=True)
        avtest.evaluar(cdp, ses, SINK, 10, promesa=False)
        avtest.evaluar(cdp, ses, "new Promise((res, rej) => { const s = document.createElement('script'); s.src = '/tools/video/captura.js?t=' + Date.now(); s.onload = () => res(1); s.onerror = () => rej(new Error('captura.js')); document.head.append(s); })", 240)
        op = {'version': a.ver}
        if a.solo:
            op['solo'] = a.solo.split(',')
        if a.previa:
            op['tiempos'] = True
        avtest.evaluar(cdp, ses, "(() => { window.__fin = null; AVCAP.guion(%s, %s).then(m => { window.__fin = JSON.stringify({ e: m.error || null, t: (m.tomas || []).map(t => t.id + ':' + t.guardados) }); }, e => { window.__fin = 'ERR ' + e; }); return 1; })()" % (json.dumps('/' + a.guion), json.dumps(op)), 10, promesa=False)
        dest = os.path.join(FRAMES, a.ver)
        limpias = set()
        n = 0
        while True:
            cdp.bombear(1.5)
            lote = json.loads(avtest.evaluar(cdp, ses, "(() => { const k = Object.keys(window.__F).slice(0, 12), o = {}; k.forEach(n => { o[n] = window.__F[n]; delete window.__F[n]; }); return JSON.stringify(o); })()", 240, promesa=False))
            for nombre, b64 in lote.items():
                m = PAT.match(nombre)
                if not m:
                    continue
                d = os.path.join(dest, m.group('toma'))
                if m.group('toma') not in limpias:
                    shutil.rmtree(d, ignore_errors=True)
                    limpias.add(m.group('toma'))
                os.makedirs(d, exist_ok=True)
                open(os.path.join(d, m.group('n') + '.jpg'), 'wb').write(base64.b64decode(b64))
                n += 1
            fin = avtest.evaluar(cdp, ses, 'window.__fin', 240, promesa=False)
            if fin and not lote:
                print('· fin', fin, '· cuadros', n, flush=True)
                break
    finally:
        if ws: ws.cerrar()
        if chrome: chrome.cerrar()
        if srv: srv.cerrar()


if __name__ == '__main__':
    main()
