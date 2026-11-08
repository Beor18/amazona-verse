#!/usr/bin/env node
/* Sonda rápida de stats para validaciones (KIMI-268): entra al juego (?qa=1), va a la zona con más
   instancias (kelvin_ruinas_yunque, borde sur mirando al centro — réplica del peor caso de QA-81),
   asienta y mide FPS reales (rAF 6 s), draw calls, triángulos y memoria del renderer.
   Uso: node tools/build/kimi2_k268_stats.js [--etiqueta r1] */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ETIQ = (process.argv.indexOf('--etiqueta') > 0 ? process.argv[process.argv.indexOf('--etiqueta') + 1] : 'r1');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = () => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result ? r.result.value : undefined; }
(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2s268-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--window-size=1600,900'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoDev) throw new Error('Chrome no abrió DevTools en 60 s: ' + err.slice(0, 200));
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); } catch(e){}" }, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1` }, ses);
  const t0 = Date.now(); let ok = false;
  while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!ok) throw new Error('el juego no arrancó en 240 s');
  console.log('· preparar:', await ev(cdp, ses, CFG.preparar_js, 300));
  const r = await ev(cdp, ses, `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms)), G = window.AV.G, P = G.pruebas, R = G.renderer, rr = R.renderer, ST = G.mundo.streaming;
    if (!P || !P.teleport) return { error: 'sin API de pruebas' };
    if (G.mundo.listo) await G.mundo.listo; await ST.listo; await ST.terminar();
    if (R.setCalidad) R.setCalidad('alto', true);
    const ZM = Object.values(ST.zonas).filter(z => z && z.inst && z.inst.length).sort((a, b) => b.inst.length - a.inst.length)[0];
    if (!ZM) return { error: 'sin zonas' };
    P.teleport(ZM.cx, ZM.cz + Math.min(ZM.r, 40) + 6, 0, -1); P.tick(0.1);
    await ST.alrededor(ZM.cx, ZM.cz + Math.min(ZM.r, 40) + 6); await ST.terminar();
    let mejor = null;
    const medirCuadro = () => { let calls = 0, tris = 0; const orig = rr.render; rr.render = function (a, b) { orig.call(rr, a, b); calls += rr.info.render.calls; tris += rr.info.render.triangles; }; try { G.camara.place(true); R.render(1 / 60, false); } finally { rr.render = orig; } return { calls, tris }; };
    for (const yaw of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      G.camara.yaw = yaw;
      for (let i = 0; i < 2; i++) { G.camara.place(true); R.render(1 / 60, false); }
      const m = medirCuadro();
      if (!mejor || m.calls > mejor.calls) mejor = { calls: m.calls, tris: m.tris, yaw };
    }
    G.camara.yaw = mejor.yaw;
    for (let i = 0; i < 90; i++) { G.camara.place(true); R.render(1 / 60, false); await sleep(16); }
    const ts = []; let ant = performance.now();
    await new Promise(res => { const cb = () => { const a = performance.now(); ts.push(a - ant); ant = a; if (ts.length < 360) requestAnimationFrame(cb); else res(); }; requestAnimationFrame(cb); });
    ts.sort((a, b) => a - b);
    const med = ts[Math.floor(ts.length * 0.5)], p95 = ts[Math.floor(ts.length * 0.95)];
    return { zona: ZM.id, instancias: ZM.inst.length, yaw: Math.round(mejor.yaw * 100) / 100,
      calls: mejor.calls, tris: mejor.tris, geo: rr.info.memory.geometries, tex: rr.info.memory.textures, prog: rr.info.programs.length,
      cuadroMedMs: Math.round(med * 100) / 100, cuadroP95Ms: Math.round(p95 * 100) / 100,
      fpsMed: Math.round(1000 / med * 10) / 10, fpsP95: Math.round(1000 / p95 * 10) / 10,
      heapMB: Math.round((performance.memory ? performance.memory.usedJSHeapSize / 1048576 : -1) * 10) / 10 };
  })()`, 120);
  console.log('· stats ' + ETIQ + ':', JSON.stringify(r));
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  try { chrome.kill(); } catch (e) { }
  await new Promise(r => setTimeout(r, 1200));
  try { const { execSync } = require('child_process'); console.log('· ' + execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(AQUI, 'kimi2_mata_perfil.ps1')}" ${path.basename(perf)}`, { timeout: 30000 }).toString().trim()); } catch (e) { }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
