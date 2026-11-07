#!/usr/bin/env node
/* KIMI-3 · KIMI-192 — palanca QA-81 (PEDIDOS 144 de Kimi 1): runs por cuadro de las fusiones GLOBALES
   (edificiosZonaHDGlobal:* y edificiosZonaCercaGlobal:*) en la peor vista (réplica de streamingTest:
   zona con más instancias, borde sur, 4 yaw). Antes del orden Morton de zonas, la fusión HD global
   dibujaba 6 runs × 2 materiales = 12 calls aquí; el objetivo es 1-2 runs por malla.

   Uso: node tools/build/kimi3_192.js [--etiqueta r1]
   El juego no se toca: solo mide. Evidencia en docs/img/kimi192/. */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ETIQUETA = (() => { const i = process.argv.indexOf('--etiqueta'); return i > 0 ? process.argv[i + 1] : 'r1'; })();
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi192');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result ? r.result.value : undefined; }
(async () => {
  fs.mkdirSync(SALIDA, { recursive: true });
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3k192-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--window-size=1600,900'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoDev) throw new Error('Chrome no abrió DevTools: ' + err.slice(0, 200));
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); } catch(e){}" }, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1&mapa=real&calidad=alto` }, ses);
  const t0 = Date.now(); let ok = false;
  while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  console.log('· listo:', ok);
  await ev(cdp, ses, CFG.preparar_js, 300);
  const r = JSON.parse(await ev(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, R = G.renderer, ST = G.mundo.streaming, P = G.pruebas;
    const tZ = performance.now(); while (!Object.keys(ST.zonas).length && performance.now() - tZ < 120000) await sleep(250);
    if (G.mundo.listo) await G.mundo.listo; await ST.listo; await ST.terminar();
    if (R.setCalidad) R.setCalidad('alto', true);
    const zs = Object.values(ST.zonas);
    const ZM = zs.slice().sort((a, b) => b.inst.length - a.inst.length)[0];
    ST.soltarTodo(); await sleep(300);
    P.teleport(ZM.cx, ZM.cz + Math.min(ZM.r, 40) + 6, 0, -1); P.tick(0.1);
    await ST.alrededor(ZM.cx, ZM.cz + Math.min(ZM.r, 40) + 6); await ST.terminar();
    if (G.solidos && G.solidos.terminar) G.solidos.terminar();
    const dibujar = n => { for (let i = 0; i < (n || 2); i++) { G.camara.place(true); R.render(1 / 60, false); } };
    const rr = R.renderer, orig = rr.render;
    const contar = () => { let n = 0; rr.render = function (a, b) { orig.call(rr, a, b); n += rr.info.render.calls; }; try { G.camara.place(true); R.render(1 / 60, false); } finally { rr.render = orig; } return n; };
    let st = null; const porYaw = [];
    for (const yaw of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) { G.camara.yaw = yaw; dibujar(2); const c = contar(); porYaw.push(Math.round(yaw * 10) / 10 + ':' + c); if (!st || c > st.calls) st = { calls: c, yaw }; }
    G.camara.yaw = st.yaw; dibujar(2);
    const fusibles = [];
    R.scene.traverse(o => {
      if (!o.isMesh) return;
      const n = o.name || '';
      if (n.indexOf('edificiosZonaHDGlobal:') !== 0 && n.indexOf('edificiosZonaCercaGlobal:') !== 0) return;
      fusibles.push({ nombre: n, visible: !!o.visible, mat: (o.userData.mat || o.material || {}).name || '?', runs: o.visible ? (o.geometry.groups || []).length : 0, tramos: (o.userData.tramos || []).length });
    });
    // KIMI-192: composición de runs y huecos de la peor malla (tramos marcados = visibles este cuadro)
    const composicion = [];
    for (const o of (() => { const v = []; R.scene.traverse(x => { if (x.isMesh && x.visible && String(x.name || '').indexOf('edificiosZonaHDGlobal:') === 0) v.push(x); }); return v; })()) {
      const T = o.userData.tramos, esVis = t => !!(t.z && t.z.fus === 1);
      const bloques = []; let cur = null;
      for (const t of T) {
        const v = esVis(t);
        if (!cur || cur.vis !== v) { cur = { vis: v, tramos: 0, verts: 0 }; bloques.push(cur); }
        cur.tramos++; cur.verts += t.count;
      }
      composicion.push({ nombre: o.name, bloques: bloques.map(b => (b.vis ? 'V' : 'h') + b.tramos + '/' + Math.round(b.verts / 1000) + 'k') });
    }
    const hdG = ST && G.mundo.streaming ? null : null;
    return JSON.stringify({ zona: ZM.id, porYaw, peor: st, fusibles, composicion, posJ: [Math.round(G.S.pos.x), Math.round(G.S.pos.y), Math.round(G.S.pos.z)] }); })()`, 300));
  const runsHD = r.fusibles.filter(f => f.nombre.indexOf('HDGlobal') > 0).reduce((a, f) => a + f.runs, 0);
  const runsCerca = r.fusibles.filter(f => f.nombre.indexOf('CercaGlobal') > 0).reduce((a, f) => a + f.runs, 0);
  console.log('· zona:', r.zona, '· jugador:', r.posJ.join(','), '· por yaw:', r.porYaw.join('  '));
  console.log('· peor vista: yaw', r.peor.yaw, '=', r.peor.calls, 'calls');
  console.log('· fusiones globales (' + r.fusibles.length + ' mallas): runs HD=' + runsHD + ' · runs Cerca=' + runsCerca);
  for (const f of r.fusibles) console.log('    ' + f.nombre + ' · visible=' + f.visible + ' · runs=' + f.runs + ' · tramos=' + f.tramos + ' · mat=' + f.mat);
  if (r.composicion) for (const c of r.composicion) console.log('    comp ' + c.nombre + ': ' + c.bloques.join('  '));
  fs.writeFileSync(path.join(SALIDA, 'k192_' + ETIQUETA + '.json'), JSON.stringify({ etiqueta: ETIQUETA, fecha: new Date().toISOString(), zona: r.zona, posJ: r.posJ, porYaw: r.porYaw, peor: r.peor, fusibles: r.fusibles, runsHD, runsCerca, composicion: r.composicion }, null, 1));
  console.log('· evidencia: docs/img/kimi192/k192_' + ETIQUETA + '.json');
  try { chrome.kill(); } catch (e) { } try { srv.close(); } catch (e) { }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  process.exit(0);
})().catch(e => { console.error('FALLO: ' + (e && e.message || e)); process.exit(1); });
