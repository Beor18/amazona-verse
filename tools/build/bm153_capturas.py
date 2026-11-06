#!/usr/bin/env python3
"""Amazona Verse · BM153: 11 capturas de la demo nueva (Sombra, Serpiente, Sapo, poderes, minigolf) (?v18=1, calidad medio, HUD visible).

    python3.11 -I tools/build/bm153_capturas.py --raiz <build>/site [--solo cotorra,reto,...]

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
SALIR = r"""
try { const a = G.v18amenaza.estado(); if (a.fase === 'disuelve') a.fase = 'lucha'; } catch (e) {}
for (const k of ['v18amenaza', 'v18serpiente', 'v18sapo', 'v18minigolf', 'v18combate']) { try { const m = G[k]; if (m && m.estado && m.estado().fase && m.estado().fase !== 'nada') m.salir(); } catch (e) {} }
await cuadros(20);
"""
ESCENAS = {
    'sombra_antes': PREAMBULO + SALIR + r'''
const M = G.v18amenaza; M.iniciar({ forzar: true, sinEspera: true }); const c = M.centro; await cargar(c.x, c.z);
const A = M.estado(); const y = A.pos.y;
mirar(c.x - 9, y + 5, c.z + 9, c.x, y + 3, c.z); G.camara.place(true); await cuadros(90);
return 'sombra fase=' + A.fase + ' pos=' + [A.pos.x, A.pos.y, A.pos.z].map(Math.round);''',
    'sombra_dispersa': PREAMBULO + r'''
const M = G.v18amenaza, A = M.estado(), c = M.centro; const y = A.pos.y;
A.fase = 'disuelve'; A.t = 0.35; await cuadros(2);
mirar(c.x - 9, y + 5, c.z + 9, c.x, y + 3, c.z); G.camara.place(true);
return 'dispersa fase=' + A.fase;''',
    'serpiente': PREAMBULO + SALIR + r'''
const M = G.v18serpiente; M.iniciar({ forzar: true }); const s = M.sitio; await cargar(s.x, s.z);
const A = M.estado(); A.sueltos[0] = true; A.sueltos[1] = true; A.siguiente = 2;
const p = M.posNudo(2);
mirar(s.x - 8, p.y + 1, s.z + 6, s.x, p.y, s.z); G.camara.place(true); await cuadros(60);
return 'serpiente fase=' + A.fase + ' nudo=' + A.siguiente + ' y=' + Math.round(p.y);''',
    'sapo': PREAMBULO + SALIR + r'''
const M = G.v18sapo; M.iniciar({ forzar: true, reloj: 99 }); const s = M.sitio; await cargar(s.x, s.z);
const A = M.estado(); const y = G.terreno.height(s.x, s.z);
const vx = s.x - s.poza.x, vz = s.z - s.poza.z, vn = Math.hypot(vx, vz) || 1, px = -vz / vn, pz = vx / vn;
mirar(s.x + vx / vn * 3.5 + px * 3, y + 1.6, s.z + vz / vn * 3.5 + pz * 3, s.x, y + 1, s.z); G.camara.place(true); await cuadros(30);
A.reloj = 99; A.abierta = 5; await cuadros(3);
return 'sapo fase=' + A.fase + ' abierta=' + A.abierta;''',
}
def duelo(esp, poder, nombre):
    ESCENAS[nombre] = PREAMBULO + SALIR + r"""
const C = G.v18combate; C.iniciar({ sinCuenta: true, especie: '%s' });
await cuadros(60);
const E = C.estado(), J = E.j; J.energia = 100; const dis = Math.hypot(E.r.pos.x - S.pos.x, E.r.pos.z - S.pos.z);
J.mareo = 0; J.cd = {}; J.energia = 100; E.r.ia = false; const r = C.usar(J, '%s'); await cuadros(10);
return '%s poder=' + J.poder + ' ok=' + JSON.stringify(r).slice(0, 80) + ' dist=' + dis.toFixed(1);""" % (esp, poder, nombre)
duelo('agilis', 'quiebro', 'duelo_quiebro')
duelo('barbadensis', 'lluvia_semillas', 'duelo_lluvia')
duelo('xantholora', 'ojo_cenote', 'duelo_ojo')
duelo('farinosa', 'ala_fuerte', 'duelo_ala')
ESCENAS['minigolf'] = PREAMBULO + SALIR + r'''
const M = G.v18minigolf; const ok = M.iniciar({ forzar: true }); await cuadros(30); M.elegir(1); await cuadros(60); await dormir(1500);
return 'minigolf ' + ok + ' fase=' + M.estado().fase;'''
duelo('guildingii', 'abanico_colores', 'poder_abanico')
duelo('diadema', 'semilla_rio', 'poder_semilla_rio')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--raiz', required=True)
    ap.add_argument('--solo', default=','.join(ESCENAS))
    a = ap.parse_args()
    P = __import__('json').load(open(os.path.join(AQUI, 'config.json')))['pruebas']
    srv = avtest.Servidor(os.path.abspath(a.raiz), 0, None)
    chrome = look_capturas.ChromePaciente(P, set(P['puertos_prohibidos']), os.path.join(tempfile.mkdtemp(prefix='bm153-'), 'chrome.log'))
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
            cdp.bombear(0.3)
            img = cdp.call('Page.captureScreenshot', {'format': 'jpeg', 'quality': 85}, ses)['data']
            open(os.path.join(REPO, 'docs', 'img', 'v18', 'demo2_' + nombre + '.jpg'), 'wb').write(base64.b64decode(img))
    finally:
        ws.cerrar(); chrome.cerrar(); srv.cerrar()


if __name__ == '__main__':
    sys.exit(main())
