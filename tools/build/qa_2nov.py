#!/usr/bin/env python3
"""BM121 · QA visual con GPU: abre el juego (Chrome con Metal de avtest), pasa el flujo de jugador nuevo y ejecuta los
pasos de un archivo JS (--pasos) que devuelve {nombre: dataURL o texto}. Guarda los PNG en --salida.
    python3.11 -I tools/build/qa_2nov.py --pasos pasos.js [--salida docs/img/qa_2nov] [--ancho 1280 --alto 800]"""
import argparse, base64, json, os, sys, tempfile, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import avtest  # noqa: E402
import look_capturas as lc  # noqa: E402

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--pasos', required=True)
    ap.add_argument('--salida', default=os.path.join(lc.REPO, 'docs', 'img', 'qa_2nov'))
    ap.add_argument('--url', default='/index.html?clima=sol&calidad=alto')
    ap.add_argument('--espera', type=int, default=240)
    a = ap.parse_args()
    cfg = json.load(open(os.path.join(lc.AQUI, 'config.json'))); P = cfg['pruebas']
    os.makedirs(a.salida, exist_ok=True)
    errs = []
    def ev(m):
        me, p = m.get('method'), m.get('params') or {}
        if me == 'Runtime.exceptionThrown':
            d = p.get('exceptionDetails') or {}
            errs.append(((d.get('exception') or {}).get('description') or d.get('text') or '')[:200])
        elif me == 'Runtime.consoleAPICalled' and p.get('type') in ('error', 'assert'):
            errs.append(' '.join(str(x.get('value', x.get('description', ''))) for x in p.get('args') or [])[:300])
    srv = chrome = ws = None
    try:
        srv = avtest.Servidor(lc.REPO, 0, None)
        origen = 'http://127.0.0.1:%d' % srv.puerto
        chrome = lc.ChromePaciente(P, set(P['puertos_prohibidos']), os.path.join(tempfile.mkdtemp(prefix='qa2nov-'), 'chrome.log'))
        ws = avtest.WS('ws://127.0.0.1:%d%s' % (chrome.puerto, chrome.ws_path)); cdp = avtest.CDP(ws, ev)
        tid = cdp.call('Target.createTarget', {'url': 'about:blank'})['targetId']
        ses = cdp.call('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
        for me in ('Page.enable', 'Runtime.enable', 'Log.enable'): cdp.call(me, {}, ses)
        cdp.call('Page.addScriptToEvaluateOnNewDocument', {'source': 'try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}'}, ses)
        cdp.call('Page.navigate', {'url': origen + a.url}, ses)
        t0 = time.monotonic()
        while time.monotonic() - t0 < P['espera_listo_s']:
            try:
                if avtest.evaluar(cdp, ses, '!!(%s)' % P['listo_js'], 10, promesa=False): break
            except (avtest.CDPError, avtest.JSError, TimeoutError): pass
            cdp.bombear(0.5)
        cdp.bombear(1.0)
        print('prep:', avtest.evaluar(cdp, ses, P['preparar_js'], 120), flush=True)
        avtest.evaluar(cdp, ses, '(async () => { await (window.AV.G.mundo && window.AV.G.mundo.listo); return 1; })()', 120)
        import re
        texto = open(a.pasos, encoding='utf-8').read()
        etapas = re.split(r'^//--- *(\S+) *(pantalla)?\s*$', texto, flags=re.M)[1:]
        for i in range(0, len(etapas), 3):
            nombre, pant, js = etapas[i], etapas[i + 1], etapas[i + 2]
            try:
                r = json.loads(avtest.evaluar(cdp, ses, js, a.espera))
            except Exception as e:
                print('· ETAPA', nombre, 'falló:', str(e)[:300]); continue
            if pant:
                cdp.bombear(0.6)
                png = cdp.call('Page.captureScreenshot', {'format': 'png'}, ses, 60)['data']
                open(os.path.join(a.salida, nombre + '.png'), 'wb').write(base64.b64decode(png)); print('· pantalla', nombre)
            for k, v in (r or {}).items():
                if isinstance(v, str) and v.startswith('data:image'):
                    open(os.path.join(a.salida, k + '.png'), 'wb').write(base64.b64decode(v.split(',', 1)[1])); print('· guardado', k)
                else:
                    print('·', k, ':', json.dumps(v, ensure_ascii=False)[:1500])
        print('errores de consola:', errs[:6] or 0)
    finally:
        if ws: ws.cerrar()
        if chrome: chrome.cerrar()
        if srv: srv.cerrar()

main()
