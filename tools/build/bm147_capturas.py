#!/usr/bin/env python3
"""Amazona Verse · BM147: 6 capturas de la demo V18.1 (?v18=1, calidad medio, HUD visible).

    python3.11 -I tools/build/bm147_capturas.py --raiz <build>/site [--solo cotorra,reto,...]

Guarda docs/img/v18/<nombre>.jpg (1440×900), todas en una sola partida.
"""
import argparse, base64, os, sys, tempfile, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import avtest, look_capturas  # noqa: E402
from tren_capturas import ESPERA_JS  # noqa: E402

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(AQUI, '..', '..'))
PREAMBULO = r'''
const AV = window.AV, G = AV.G, S = G.S;
const cuadros = n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
const dormir = ms => new Promise(r => setTimeout(r, ms));
const limpiarIntro = async () => {
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 10; j++) { const b = [...document.querySelectorAll('button')].find(b => /Saltar intro/i.test(b.textContent) && b.offsetParent); if (!b) break; b.click(); await dormir(300); }
    try { G.dialogo.cancelarLibre(); } catch (e) {}
    if (G.c && G.c.apertura && G.c.apertura.fin) G.c.apertura.fin();
    ['c1-fade', 'c1-ruptura', 'c1-saltar'].forEach(id => { const e = document.getElementById(id); if (e) e.remove(); });
    await cuadros(15);
  }
};
const mirar = (x, y, z, hx, hy, hz) => { S.pos.x = x; S.pos.y = y; S.pos.z = z; S.vy = 0; G.fisica.MOVE.flying = true; G.camara.yaw = Math.atan2(-(hx - x), -(hz - z)); };
const cargar = async (x, z) => { const ST = G.mundo && G.mundo.streaming; if (ST) { if (ST.alrededor) await ST.alrededor(x, z); if (ST.terminar) await ST.terminar(); } if (G.solidos && G.solidos.terminar) G.solidos.terminar(); await Promise.resolve(G.vegetacion && G.vegetacion.listo); };
const puente = () => { const p = G.terreno.plataformas.find(p => p.id === 'puente' && p.tipo === 'puente'); const t = 0.5; return { p, cx: p.ax + (p.bx - p.ax) * t, cz: p.az + (p.bz - p.az) * t, cy: p.ay + (p.by - p.ay) * t - p.comba, L: Math.hypot(p.bx - p.ax, p.bz - p.az) }; };
'''
LISTO_JS = PREAMBULO + r'''
G.pausa.set('captura', false);
if (G.clima && G.clima.fijar) G.clima.fijar('sol', { inmediato: true, forzar: true });
if (G.atardecer) G.atardecer.forzar(false);
await limpiarIntro();
for (let i = 0; i < 80 && !(G.v18descubrir && G.v18combate && G.v18 && G.v18.mundo); i++) { window.dispatchEvent(new Event('pointerdown')); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' })); await dormir(500); }
await limpiarIntro();
return [!!G.v18descubrir, !!G.v18combate, !!(G.v18 && G.v18.mundo), !!G.v18reparar].join(',');
'''
ESCENAS = {
    'cotorra': PREAMBULO + r'''
const D = G.v18descubrir, b = D.B.pos;
const x = b.x + 9, z = b.z + 9;
await cargar(b.x, b.z);
mirar(b.x + 6, b.y + 2, b.z + 6, b.x, b.y, b.z); const pj = G.actores.player3D.root; window.__pjs = pj.scale.x; pj.scale.setScalar(0.001); // la cámara sigue a Vittata: se oculta para ver a la cotorra

G.camara.place(true); await cuadros(90); await limpiarIntro();
return 'cotorra ' + [b.x, b.y, b.z].map(Math.round);''',
    'reto': PREAMBULO + r'''
const D = G.v18descubrir, b = D.B.pos, pj = G.actores.player3D.root;
pj.scale.setScalar(window.__pjs);
D.R.activo = false;
const x = b.x + 9, z = b.z + 9;
await cargar(b.x, b.z);
mirar(x, b.y + 4, z, b.x, b.y + 1, b.z);
G.camara.place(true); pj.scale.setScalar(0.001); await cuadros(30);
const ok = D.empezarReto();
await cuadros(25);
const q = D.P[1]; const bp = D.B.pos;
mirar(bp.x + 6, bp.y + 2, bp.z + 6, bp.x, bp.y, bp.z); G.camara.place(true);
await cuadros(20);
return 'reto ' + ok + ' activo=' + D.R.activo;''',
    'duelo': PREAMBULO + r'''
const C = G.v18combate; G.actores.player3D.root.scale.setScalar(window.__pjs); if (D_ = G.v18descubrir) { D_.R.activo = false; }
C.iniciar({ sinCuenta: true });
await cuadros(60); await dormir(11000);
return 'duelo ' + JSON.stringify(Object.keys(C.estado()).slice(0, 4)) + ' fase=' + C.estado().fase;''',
    'puente_roto': PREAMBULO + r'''
try { G.v18combate.salir(); } catch (e) {}
const B = puente(), P = B.p;
const ux = (P.bx - P.ax) / B.L, uz = (P.bz - P.az) / B.L;
await cargar(B.cx, B.cz);
mirar(B.cx - uz * 7 - ux * 5, B.cy + 6, B.cz + ux * 7 - uz * 5, B.cx, B.cy, B.cz);
G.camara.place(true); await cuadros(60); await dormir(6000); await limpiarIntro();
return 'roto estado=' + G.v18.mundo('puente_villa');''',
    'puente_reparado': PREAMBULO + r'''
G.v18.cambiarMundo('puente_villa', 'reparado');
await cuadros(30); G.v18.cambiarMundo('puente_villa', 'reparado');
const B = puente(), P = B.p;
const ux = (P.bx - P.ax) / B.L, uz = (P.bz - P.az) / B.L;
await cargar(B.cx, B.cz);
mirar(B.cx - uz * 7 - ux * 5, B.cy + 6, B.cz + ux * 7 - uz * 5, B.cx, B.cy, B.cz);
G.camara.place(true); await cuadros(60); await dormir(6000);
return 'reparado estado=' + G.v18.mundo('puente_villa') + ' piso=' + (P.when ? P.when() : '-');''',
    'corriente': PREAMBULO + r'''
const B = puente(), P = B.p;
const ux = (P.bx - P.ax) / B.L, uz = (P.bz - P.az) / B.L;
mirar(B.cx - ux * 5, B.cy + 12, B.cz - uz * 5, B.cx + ux * 20, B.cy + 6, B.cz + uz * 20);
G.camara.place(true); await cuadros(60); await dormir(6000);
return 'corriente y=' + Math.round(S.pos.y) + ' deck=' + Math.round(B.cy);''',
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--raiz', required=True)
    ap.add_argument('--solo', default=','.join(ESCENAS))
    a = ap.parse_args()
    P = __import__('json').load(open(os.path.join(AQUI, 'config.json')))['pruebas']
    srv = avtest.Servidor(os.path.abspath(a.raiz), 0, None)
    chrome = look_capturas.ChromePaciente(P, set(P['puertos_prohibidos']), os.path.join(tempfile.mkdtemp(prefix='bm147-'), 'chrome.log'))
    ws = avtest.WS('ws://127.0.0.1:%d%s' % (chrome.puerto, chrome.ws_path))
    try:
        cdp = avtest.CDP(ws, lambda m: None)
        tid = cdp.call('Target.createTarget', {'url': 'about:blank'})['targetId']
        ses = cdp.call('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
        for me in ('Page.enable', 'Runtime.enable', 'Page.bringToFront'):
            cdp.call(me, {}, ses)
        cdp.call('Emulation.setDeviceMetricsOverride', {'width': 1440, 'height': 900, 'deviceScaleFactor': 1, 'mobile': False}, ses)
        cdp.call('Page.addScriptToEvaluateOnNewDocument', {'source': 'try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}'}, ses)
        cdp.call('Page.navigate', {'url': 'http://127.0.0.1:%d/index.html?v18=1&clima=sol&calidad=medio' % srv.puerto}, ses)
        t0 = time.monotonic()
        while time.monotonic() - t0 < P['espera_listo_s']:
            try:
                if avtest.evaluar(cdp, ses, '!!(%s)' % P['listo_js'], 10, promesa=False):
                    break
            except (avtest.CDPError, avtest.JSError, TimeoutError):
                pass
            cdp.bombear(0.5)
        cdp.bombear(1.0)
        avtest.evaluar(cdp, ses, P['preparar_js'], 120)
        avtest.evaluar(cdp, ses, ESPERA_JS, 120)
        avtest.evaluar(cdp, ses, '(async () => { const G = window.AV.G; await (G.mundo && G.mundo.listo); return true; })()', 120)
        print('· listo', avtest.evaluar(cdp, ses, '(async () => {' + LISTO_JS + '})()', 240), flush=True)
        for nombre in a.solo.split(','):
            print('·', nombre, avtest.evaluar(cdp, ses, '(async () => {' + ESCENAS[nombre] + '})()', 240), flush=True)
            cdp.bombear(1.5)
            img = cdp.call('Page.captureScreenshot', {'format': 'jpeg', 'quality': 85}, ses)['data']
            open(os.path.join(REPO, 'docs', 'img', 'v18', nombre + '.jpg'), 'wb').write(base64.b64decode(img))
    finally:
        ws.cerrar(); chrome.cerrar(); srv.cerrar()


if __name__ == '__main__':
    sys.exit(main())
