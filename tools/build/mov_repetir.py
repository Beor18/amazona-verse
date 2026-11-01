#!/usr/bin/env python3
"""BM86 · repite AV.movementTest N veces en Chrome real (GPU, calidad pedida) y cuenta fallos.
    python3.11 -I tools/build/mov_repetir.py [--raiz .] [--calidad alto] [--n 3] [--recargar]"""
import argparse, json, os, sys, tempfile, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import avtest, look_capturas
AQUI = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.abspath(os.path.join(AQUI, '..', '..'))
def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--raiz', default=REPO); ap.add_argument('--calidad', default='alto')
    ap.add_argument('--n', type=int, default=3); ap.add_argument('--recargar', action='store_true')
    a = ap.parse_args(); P = json.load(open(os.path.join(AQUI, 'config.json')))['pruebas']
    srv = avtest.Servidor(os.path.abspath(a.raiz), 0, None); origen = 'http://127.0.0.1:%d' % srv.puerto
    chrome = look_capturas.ChromePaciente(P, set(P['puertos_prohibidos']), os.path.join(tempfile.mkdtemp(prefix='mov-'), 'c.log'))
    ws = avtest.WS('ws://127.0.0.1:%d%s' % (chrome.puerto, chrome.ws_path)); cdp = avtest.CDP(ws, lambda m: None)
    tid = cdp.call('Target.createTarget', {'url': 'about:blank'})['targetId']
    ses = cdp.call('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
    for me in ('Page.enable', 'Runtime.enable'): cdp.call(me, {}, ses)
    cdp.call('Page.addScriptToEvaluateOnNewDocument', {'source': 'try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}'}, ses)
    def abrir():
        cdp.call('Page.navigate', {'url': '%s/index.html?clima=sol&calidad=%s' % (origen, a.calidad)}, ses)
        t0 = time.monotonic()
        while time.monotonic() - t0 < P['espera_listo_s']:
            try:
                if avtest.evaluar(cdp, ses, '!!(%s)' % P['listo_js'], 10, promesa=False): break
            except (avtest.CDPError, avtest.JSError, TimeoutError): pass
            cdp.bombear(0.5)
        cdp.bombear(1.0); print(avtest.evaluar(cdp, ses, P['preparar_js'], 120), flush=True)
        avtest.evaluar(cdp, ses, '(async () => { await (window.AV.G.mundo && window.AV.G.mundo.listo); return true; })()', 120)
    try:
        abrir()
        for i in range(a.n):
            if a.recargar and i: abrir()
            r = json.loads(avtest.evaluar(cdp, ses, '(async () => { const r = await AV.movementTest(); return JSON.stringify({p: r.passed, t: r.total, mal: r.results.filter(x => !x.ok).map(x => x.name + " :: " + x.extra), m: r.metricas && {rama: r.metricas.rama, subir: r.metricas.subir, ce: r.metricas.cernidoDeriva}}); })()', 600))
            print(i, json.dumps(r, ensure_ascii=False), flush=True)
    finally:
        try: chrome.cerrar()
        except Exception: pass
main()
