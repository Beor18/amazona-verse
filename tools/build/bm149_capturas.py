#!/usr/bin/env python3
"""Amazona Verse · BM149: imágenes de los minijuegos de la portada (sin HUD, GPU real).

    python3.11 -I tools/build/bm149_capturas.py [--raiz .] [--salida /tmp/bm149] [--solo carrera,river,banquete] [--esperas 4,9]

Abre cada minijuego como lo hace la portada (Retos.jugar / AV.riverRush), espera, oculta todo menos el lienzo y guarda
<salida>/<nombre>_<espera>s.jpg al tamaño de web/assets/img (800×450; banquete 800×500).
"""
import argparse, base64, os, sys, tempfile, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import avtest, look_capturas  # noqa: E402
from tren_capturas import ESPERA_JS  # noqa: E402

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(AQUI, '..', '..'))
ESCENAS = {
    'carrera': ('retos-carrera', 450, "(async () => { const AV = window.AV; const r = await AV.retos(); const R = await AV.retos; return 'x'; })()"),
    'river': ('minijuego-river-rush', 450, "(async () => { const ok = await window.AV.riverRush(); return String(ok); })()"),
    'banquete': ('minijuego-banquete', 500, "(async () => { const ok = await window.AV.retos(); return 'x'; })()"),
}
# Retos: se abre el menú y se pulsa «Jugar» del reto pedido
RETO_JS = r'''(async () => { const AV = window.AV; await AV.retos(); await new Promise(r => setTimeout(r, 800));
  const b = document.querySelector('[data-jugar="%s"]'); if (!b) return 'sin boton'; b.click(); return 'ok'; })()'''
OCULTAR = "(() => { const s = document.createElement('style'); s.id = 'bm149-oculto'; s.textContent = 'body *{visibility:hidden !important} #game{visibility:visible !important}'; document.head.appendChild(s); return [innerWidth, innerHeight].join(','); })()"
MOSTRAR = "(() => { const s = document.getElementById('bm149-oculto'); if (s) s.remove(); return 1; })()"


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--raiz', default=REPO)
    ap.add_argument('--salida', default='/tmp/bm149')
    ap.add_argument('--solo', default='carrera,river,banquete')
    ap.add_argument('--esperas', default='4,9')
    a = ap.parse_args()
    P = json.load(open(os.path.join(AQUI, 'config.json')))['pruebas']
    os.makedirs(a.salida, exist_ok=True)
    srv = chrome = ws = None
    try:
        srv = avtest.Servidor(os.path.abspath(a.raiz), 0, None)
        origen = 'http://127.0.0.1:%d' % srv.puerto
        chrome = look_capturas.ChromePaciente(P, set(P['puertos_prohibidos']), os.path.join(tempfile.mkdtemp(prefix='bm149-'), 'chrome.log'))
        ws = avtest.WS('ws://127.0.0.1:%d%s' % (chrome.puerto, chrome.ws_path))
        cdp = avtest.CDP(ws, lambda m: None)
        tid = cdp.call('Target.createTarget', {'url': 'about:blank'})['targetId']
        ses = cdp.call('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
        for me in ('Page.enable', 'Runtime.enable'):
            cdp.call(me, {}, ses)
        cdp.call('Page.addScriptToEvaluateOnNewDocument', {'source': 'try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}'}, ses)
        cdp.call('Page.navigate', {'url': '%s/index.html?clima=sol&calidad=alto' % origen}, ses)
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
        for nombre in a.solo.split(','):
            dest, alto, js = ESCENAS[nombre]
            if nombre == 'river':
                r = avtest.evaluar(cdp, ses, js, 120)
            else:
                r = avtest.evaluar(cdp, ses, RETO_JS % ('banquete' if nombre == 'banquete' else 'carrera'), 120)
            print('· %s abre: %s' % (nombre, r), flush=True)
            if nombre != 'banquete':  # mantiene «adelante» (W) y el impulso (F) para que Vittata vuele la ruta
                avtest.evaluar(cdp, ses, "(() => { for (const k of ['w']) window.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: 'Key' + k.toUpperCase(), bubbles: true })); return 1; })()", 10, promesa=False)
            prev = 0
            for e in [float(x) for x in a.esperas.split(',')]:
                cdp.bombear(e - prev); prev = e
                wh = avtest.evaluar(cdp, ses, OCULTAR, 10, promesa=False)
                W, H = [int(x) for x in str(wh).split(',')]
                ch = min(H, round(W * alto / 800)); cw = round(ch * 800 / alto)
                clip = {'x': (W - cw) / 2, 'y': (H - ch) / 2, 'width': cw, 'height': ch, 'scale': 800 / cw}
                d = cdp.call('Page.captureScreenshot', {'format': 'jpeg', 'quality': 84, 'clip': clip}, ses, 60)['data']
                ruta = os.path.join(a.salida, '%s_%ds.jpg' % (dest, int(e)))
                open(ruta, 'wb').write(base64.b64decode(d))
                avtest.evaluar(cdp, ses, MOSTRAR, 10, promesa=False)
                print('  ', ruta, flush=True)
            avtest.evaluar(cdp, ses, "(async () => { const G = window.AV.G; try { if (G.riverApi && G.riverApi.salir) G.riverApi.salir(); } catch (e) {} const x = [...document.querySelectorAll('button')].filter(b => b.offsetParent && /salir|cerrar|menú|menu/i.test(b.textContent + (b.getAttribute('aria-label')||''))); x.forEach(b => b.click()); await new Promise(r => setTimeout(r, 800)); return 1; })()", 30)
    finally:
        if ws: ws.cerrar()
        if chrome: chrome.cerrar()
        if srv: srv.cerrar()


if __name__ == '__main__':
    main()
