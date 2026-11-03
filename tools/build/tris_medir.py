#!/usr/bin/env python3
"""Mide triángulos y draw calls en vistas fijas (AV.look.medir) y saca una captura por vista, con desglose por malla.
   AV_CHROME=... python3.11 -I tools/build/tris_medir.py <raiz build/site> <salida> <calidad> [vistas,...] [--extra '&pack=ep5']"""
import base64, json, os, sys, tempfile, time
REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
sys.path.insert(0, os.path.join(REPO, 'tools', 'build'))
import avtest  # noqa
import look_capturas  # noqa

# objetivo: punto al que mira la cámara (yaw = atan2(-dx, -dz)). 'villa': lugar del mapa; 'ciudad': centro de las zonas ciudad
VISTAS = {
    'ipad': {'en': 'villa', 'alt': 40, 'vuelo': True, 'mira': 'ciudad', 'nota': 'Villa Raíz, 40 m, mirando al tepuy y la ciudad'},
    'aldea': {'x': 120, 'y': 8, 'z': 162, 'vuelo': True, 'yaw': 0.63},
    'ciudad': {'x': 52, 'y': 110, 'z': -84, 'vuelo': True, 'yaw': 0.885},
    'kelvin_villa': {'x': 125, 'y': 150, 'z': 175, 'vuelo': True, 'yaw': 0.5},
    'tepuy': {'x': -46, 'alt': 1, 'z': -121, 'vuelo': False, 'mira': 'ciudad', 'nota': 'cap. 5: inicio en la meseta del tepuy'},
    'tepuy_aire': {'x': -46, 'alt': 25, 'z': -121, 'vuelo': True, 'mira': 'ciudad'},
}

JS = r'''window.__res = null; window.__etapa = 'inicio'; (async () => { try {
  const V = %s, AV = window.AV, G = AV.G, R = G.renderer, S = G.S;
  const cuadros = n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  if (G.clima && G.clima.fijar) G.clima.fijar('sol', { inmediato: true, forzar: true });
  if (G.dialogo && G.dialogo.open && G.dialogo.open() && G.pruebas && G.pruebas.drain) G.pruebas.drain();
  const ST = G.mundo && G.mundo.streaming;
  const M = G.terreno.mapa || {}, L = M.lugares || {};
  let x = V.x, z = V.z;
  if (V.en === 'villa') { const v = L.villa || (G.mundo && G.mundo.lugares && G.mundo.lugares.villa); x = v.x; z = v.z; }
  let yaw = V.yaw;
  if (V.mira === 'ciudad') {
    const zs = Object.values(ST.zonas).filter(Z => /ciudad|yunque|ruinas/i.test(Z.id));
    let cx = 0, cz = 0, n = 0; for (const Z of zs) { cx += Z.cx * Z.inst.length; cz += Z.cz * Z.inst.length; n += Z.inst.length; }
    cx /= n; cz /= n; yaw = Math.atan2(-(cx - x), -(cz - z)); V.zonasMira = zs.map(Z => Z.id);
  }
  const y = V.y != null ? V.y : G.terreno.height(x, z) + (V.alt || 0);
  S.pos.x = x; S.pos.y = y; S.pos.z = z; S.vy = 0; G.fisica.MOVE.flying = !!V.vuelo;
  S.facing = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
  G.camara.yaw = yaw;
  const dS = window.__dS = window.__dS || R.drawScene; R.drawScene = () => {}; // sin dibujar mientras carga: en SwiftShader cada cuadro de 8 M triángulos frena la carga
  window.__etapa = 'alrededor'; if (ST) { if (ST.alrededor) await ST.alrededor(x, z); window.__etapa = 'terminar'; if (ST.terminar) await ST.terminar(); }
  if (G.solidos && G.solidos.terminar) G.solidos.terminar();
  window.__etapa = 'flora'; await Promise.resolve(G.vegetacion && G.vegetacion.listo);
  if (AV.guineo) await AV.guineo().then(g => g.listo).catch(() => {});
  if (AV.dosel) await AV.dosel().catch(() => {});
  R.drawScene = dS;
  window.__etapa = 'cuadros'; G.camara.yaw = yaw; G.camara.place(true);
  await cuadros(20);
  R.drawScene = () => {}; if (ST && ST.terminar) await ST.terminar(); R.drawScene = dS;
  G.camara.yaw = yaw; G.camara.place(true);
  await cuadros(40);
  S.pos.x = x; S.pos.y = y; S.pos.z = z; G.camara.yaw = yaw; G.camara.place(true);
  await cuadros(8);
  const med = AV.look && AV.look.medir ? AV.look.medir() : R.stats();
  const st = ST && ST.stats ? ST.stats() : {};
  // desglose: triángulos de las mallas visibles que pasan el frustum, por nombre (hasta el segundo «:»)
  const cam = R.camera, fr = new THREE.Frustum(), pm = new THREE.Matrix4(); cam.updateMatrixWorld();
  fr.setFromProjectionMatrix(pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  const por = {}, sp = new THREE.Sphere();
  R.scene.traverseVisible(o => { if (!o.isMesh || !o.geometry || o.layers.mask === 2) return;
    const g = o.geometry; let t = (g.index ? g.index.count : (g.attributes.position ? g.attributes.position.count : 0)) / 3;
    if (g.drawRange && g.drawRange.count !== Infinity) t = Math.min(t, g.drawRange.count / 3);
    if (Array.isArray(o.material)) t = g.groups.reduce((a, q) => a + q.count, 0) / 3;
    if (o.isInstancedMesh) t *= o.count;
    if (!t) return;
    if (o.frustumCulled && !o.isInstancedMesh) { if (!g.boundingSphere) g.computeBoundingSphere(); sp.copy(g.boundingSphere).applyMatrix4(o.matrixWorld); if (!fr.intersectsSphere(sp)) return; }
    const k = (o.name || o.type).split(':').slice(0, 2).join(':');
    por[k] = (por[k] || 0) + t; });
  const top = Object.entries(por).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => [k, Math.round(v)]);
  const out = { calls: med.calls, triangulos: med.triangulos, calidad: med.calidad, dpr: med.dpr, cam: [cam.position.x, cam.position.y, cam.position.z].map(Math.round), yaw: Math.round(yaw * 1000) / 1000,
    st: { zonasCerca: st.zonasCerca, zonasLejos: st.zonasLejos, visiblesCerca: st.visiblesCerca, visiblesLejos: st.visiblesLejos, visiblesHD: st.visiblesHD, drawEdificios: st.drawEdificios, modelosHD: st.modelosHD }, top, zonasMira: V.zonasMira };
  R.drawScene(R.camera);
  const png = R.canvas.toDataURL('image/jpeg', 0.85);
  window.__res = JSON.stringify({ med: out, png }); } catch (e) { if (window.__dS) window.AV.G.renderer.drawScene = window.__dS; window.__res = JSON.stringify({ error: String(e && e.stack || e) }); } })(); 1'''


def main():
    raiz, salida, calidad = sys.argv[1], sys.argv[2], sys.argv[3]
    vistas = sys.argv[4].split(',') if len(sys.argv) > 4 and not sys.argv[4].startswith('--') else list(VISTAS)
    extra = sys.argv[sys.argv.index('--extra') + 1] if '--extra' in sys.argv else ''
    os.makedirs(salida, exist_ok=True)
    cfg = json.load(open(os.path.join(REPO, 'tools', 'build', 'config.json')))
    P = cfg['pruebas']
    srv = avtest.Servidor(os.path.abspath(raiz), 0, None)
    origen = 'http://127.0.0.1:%d' % srv.puerto
    chrome = look_capturas.ChromePaciente(P, set(P['puertos_prohibidos']), os.path.join(tempfile.mkdtemp(prefix='tris-'), 'chrome.log'))
    ws = avtest.WS('ws://127.0.0.1:%d%s' % (chrome.puerto, chrome.ws_path))
    errores = []

    def ev(m):
        me, p = m.get('method'), m.get('params') or {}
        if me == 'Runtime.exceptionThrown':
            errores.append(str(p)[:300])
        elif me == 'Runtime.consoleAPICalled' and p.get('type') in ('error', 'assert'):
            errores.append(' '.join(str(x.get('value', x.get('description', ''))) for x in p.get('args') or [])[:300])
    cdp = avtest.CDP(ws, ev)
    res = {}
    try:
        tid = cdp.call('Target.createTarget', {'url': 'about:blank'})['targetId']
        ses = cdp.call('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
        for me in ('Page.enable', 'Runtime.enable', 'Log.enable'):
            cdp.call(me, {}, ses)
        cdp.call('Page.addScriptToEvaluateOnNewDocument', {'source': 'try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}'}, ses)
        cdp.call('Page.navigate', {'url': '%s/index.html?clima=sol&calidad=%s%s' % (origen, calidad, extra)}, ses)
        t0 = time.monotonic()
        while time.monotonic() - t0 < 600:
            try:
                if avtest.evaluar(cdp, ses, '!!(%s)' % P['listo_js'], 10, promesa=False):
                    break
            except Exception:
                pass
            cdp.bombear(0.5)
        prep = avtest.evaluar(cdp, ses, P['preparar_js'], 300)
        print('· listo en %.0f s · %s' % (time.monotonic() - t0, prep), flush=True)
        avtest.evaluar(cdp, ses, '(async () => { await (window.AV.G.mundo && window.AV.G.mundo.listo); await new Promise(r => setTimeout(r, 4000)); return 1; })()', 300)
        for v in vistas:
            t1 = time.monotonic()
            avtest.evaluar(cdp, ses, JS % json.dumps(VISTAS[v]), 60, promesa=False)
            et0 = ''
            while True:
                cdp.bombear(10)
                try:
                    st = avtest.evaluar(cdp, ses, 'JSON.stringify([window.__etapa, !!window.__res])', 900, promesa=False)
                except TimeoutError:
                    continue
                et, hecho = json.loads(st)
                if et != et0: print('    %s: %s (%.0f s)' % (v, et, time.monotonic() - t1), flush=True); et0 = et
                if hecho: break
            r = json.loads(avtest.evaluar(cdp, ses, 'window.__res', 900, promesa=False))
            if r.get('error'): print('  · %s: ERROR %s' % (v, r['error'][:500]), flush=True); continue
            open(os.path.join(salida, '%s_%s.jpg' % (v, calidad)), 'wb').write(base64.b64decode(r['png'].split(',', 1)[1]))
            m = r['med']; res[v] = m
            print('  · %s/%s: %s calls · %.2f M tris · cam %s · %s · %.0f s' % (v, calidad, m['calls'], m['triangulos'] / 1e6, m['cam'], m['st'], time.monotonic() - t1), flush=True)
            for k, t in m['top'][:12]:
                print('      %8d  %s' % (t, k), flush=True)
            json.dump(res, open(os.path.join(salida, 'medidas_%s.json' % calidad), 'w'), indent=1, ensure_ascii=False)
        print('· errores de consola: %d %s' % (len(errores), errores[:3]), flush=True)
    finally:
        try:
            cdp.call('Browser.close', {}, None, 5)
        except Exception:
            pass
        ws.cerrar(); chrome.cerrar(); srv.cerrar()


if __name__ == '__main__':
    main()
