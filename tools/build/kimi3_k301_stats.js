#!/usr/bin/env node
/* Sonda de stats del parche Family Quest (KIMI-301, validación 24693ca5+4d810a3c):
   entra con semilla (escritorio 1600×900, alto), asienta el mundo, mide base quieta,
   panel abierto, aventura «duo» (HUD de turno + trucos) y aventura «relevo» (HUD volando);
   cuenta textos ES-only visibles con EN puesto; captura pantalla; vuelca JSON.
   Uso: node tools/build/kimi3_k301_stats.js [--etiqueta r1] */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn, execSync } = require('child_process');
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
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3k301-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--window-size=1600,900'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoDev) throw new Error('Chrome no abrió DevTools en 60 s: ' + err.slice(0, 200));
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html` }, ses);
  const t0 = Date.now(); let ok = false;
  while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!ok) throw new Error('el juego no arrancó en 240 s');
  console.log('· preparar:', await ev(cdp, ses, CFG.preparar_js, 300));
  const r = await ev(cdp, ses, `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms)), G = window.AV.G, R = G.renderer, rr = R.renderer, ST = G.mundo.streaming;
    if (G.mundo.listo) await G.mundo.listo; await ST.listo; await ST.terminar();
    if (R.setCalidad) R.setCalidad('alto', true);
    await window.AVE.assets.script('src/game/familia_aventuras.js'); window.AVFamiliaAventuras(G);
    const FQ = G.familyQuest;
    for (let i = 0; i < 60; i++) { G.camara.place(true); R.render(1 / 60, false); await sleep(16); }
    const muestrear = seg => new Promise(res => { const ts = []; let ant = performance.now(); const fin = ant + seg * 1000; const cb = () => { const a = performance.now(); ts.push(a - ant); ant = a; if (a < fin) requestAnimationFrame(cb); else res(ts); }; requestAnimationFrame(cb); });
    const fpsDe = ts => { ts.sort((a, b) => a - b); const med = ts[Math.floor(ts.length * 0.5)], p95 = ts[Math.floor(ts.length * 0.95)]; return { fpsMed: Math.round(1000 / med * 10) / 10, fpsP95: Math.round(1000 / p95 * 10) / 10, cuadros: ts.length }; };
    const medirCuadro = () => { let calls = 0, tris = 0; const orig = rr.render; rr.render = function (a, b) { orig.call(rr, a, b); calls += rr.info.render.calls; tris += rr.info.render.triangles; }; try { G.camara.place(true); R.render(1 / 60, false); } finally { rr.render = orig; } return { calls, tris }; };
    const stats = () => { let calls = 0, tris = 0; for (let i = 0; i < 3; i++) { const m = medirCuadro(); calls = Math.max(calls, m.calls); tris = Math.max(tris, m.tris); } return { calls, tris, geo: rr.info.memory.geometries, tex: rr.info.memory.textures, prog: rr.info.programs.length }; };
    const mem = () => Math.round(((performance.memory && performance.memory.usedJSHeapSize) || 0) / 1048576);
    const base = { fps: fpsDe(await muestrear(3)) };
    Object.assign(base, stats(), { heapMB: mem() });
    // panel abierto
    FQ.abrir();
    for (let i = 0; i < 20; i++) { G.camara.place(true); R.render(1 / 60, false); await sleep(16); }
    const panel = { fps: fpsDe(await muestrear(3)) };
    Object.assign(panel, stats(), { heapMB: mem() });
    // aventura duo: HUD de turno + trucos
    FQ.empezar('duo');
    document.getElementById('fq-duo-ya').click();
    let duo, trucos = 0;
    { const m = muestrear(6); const iv = setInterval(() => { try { G.emit('truco', ['tonel', 'looping', 'barrena'][trucos % 3]); trucos++; } catch (e) {} }, 400); const ts = await m; clearInterval(iv); duo = { fps: fpsDe(ts) }; Object.assign(duo, stats(), { heapMB: mem(), trucos }); }
    document.getElementById('fq-hud-salir').click();
    // aventura relevo: HUD volando (cernido quieto: aísla el coste del HUD)
    FQ.empezar('relevo');
    document.getElementById('fq-destino-0').click();
    let relevo;
    { const m = muestrear(5); const ts = await m; relevo = { fps: fpsDe(ts) }; Object.assign(relevo, stats(), { heapMB: mem() }); }
    document.getElementById('fq-hud-salir').click();
    // EN: textos ES-only visibles en el panel
    let esOnly = null;
    try {
      if (G.idioma && G.idioma.set) { G.idioma.set('en'); await sleep(400); FQ.abrir(); await sleep(200); }
      const vis = [...document.querySelectorAll('#fq button, #fq h2, #fq h3, #fq p, #fq .tarjeta, #fq .serie, #fq li')].filter(e => e.offsetParent !== null);
      const total = vis.length, con = vis.filter(e => /[áéíóúñ¿¡]/i.test(e.textContent)).length;
      esOnly = { muestras: total, conTildesES: con };
      FQ.cerrar(); if (G.idioma && G.idioma.set) { G.idioma.set('es'); }
    } catch (e) { esOnly = { error: String(e && e.message || e) }; }
    const errores = (window.__aveErrores || []).length;
    return { base, panel, duo, relevo, esOnly, heapFinalMB: mem(), errores };
  })()`, 300);
  console.log('· stats:', JSON.stringify(r));
  // captura
  try {
    const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 80 }, ses, 20000);
    fs.writeFileSync(path.join(RAIZ, 'docs', 'img', 'kimi301', `k301_stats_${ETIQ}.jpg`), Buffer.from(shot.data, 'base64'));
  } catch (e) { console.log('· sin captura:', e.message); }
  fs.writeFileSync(path.join(RAIZ, 'docs', 'img', 'kimi301', `k301_stats_${ETIQ}.json`), JSON.stringify({ head: (() => { try { return execSync('git rev-parse --short HEAD', { cwd: RAIZ }).toString().trim(); } catch (e) { return 'desconocido'; } })(), etiqueta: ETIQ, fecha: new Date().toISOString(), contencion: 'Kimi 1 (kimi1_127) y/o Kimi 2 midiendo: FPS techo, conteos validos', stats: r }, null, 1));
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  try { chrome.kill(); } catch (e) { }
  await new Promise(r2 => setTimeout(r2, 1200));
  try { console.log('· ' + execSync('powershell -NoProfile -ExecutionPolicy Bypass -File "' + path.join(AQUI, 'kimi2_mata_perfil.ps1') + '" ' + path.basename(perf), { timeout: 30000 }).toString().trim()); } catch (e) { }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close();
  console.log('· fin');
  process.exit(0);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
