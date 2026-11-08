#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-279: verificación funcional con GPU real del
   parche c360a2e1 «Salir vuelve al menú si se entró desde él» (menu_modos.js), ya cubierto
   a baterías por menuModosTest. Esta sonda lo demuestra por el camino de jugador real con
   clics en el botón «Salir» verdadero del HUD y capturas:
   - Flight abierto DESDE EL MUNDO (window.AV.flight): «Salir» deja en el mundo (portada cerrada).
   - Flight abierto DESDE EL MENÚ (elegir('flight')): «Salir» vuelve al menú (portada abierta).
   - Tormenta (retos) DESDE EL MENÚ: salir vuelve al menú.
   - Maze DESDE EL MUNDO: salir deja en el mundo.
   Perfil iPhone 390×844 dpr 3 CPU ×4 táctil, GPU real RX 5700 XT. El juego no se toca.
   Uso: node tools/build/kimi1_279_salir.js
   Salida: consola + docs/img/kimi279/k279_salir_*.jpg + k279_salir.json */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn, execSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi279');
fs.mkdirSync(SALIDA, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end('400'); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end('403'); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = this.ws0 = ws; this.id = 0; this.pend = new Map(); ws.onerror = () => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result ? r.result.value : undefined; }
async function foto(cdp, ses, archivo) { const r = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 60000); fs.writeFileSync(archivo, Buffer.from(r.data, 'base64')); }
let PERF_GLOB = null;
(async () => {
  const gpu = (() => { try { return execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_VideoController | Where-Object { $_.AdapterRAM -gt 0 } | Select-Object -First 1).Name"', { timeout: 15000 }).toString().trim(); } catch (e) { return '?'; } })();
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k279-')); PERF_GLOB = perf;
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--window-size=390,844'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoDev) { try { chrome.kill(); } catch (e) { } throw new Error('Chrome no abrió DevTools en 60 s ' + err.slice(0, 200)); }
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  const erroresConsola = [];
  ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Runtime.consoleAPICalled' && (d.params.type === 'error' || d.params.type === 'assert')) erroresConsola.push((d.params.args || []).map(a => String(a.value != null ? a.value : a.description || '')).join(' ').slice(0, 300)); });
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }, ses);
  await cdp.call('Emulation.setCPUThrottlingRate', { rate: 4 }, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: `try {
    localStorage.clear(); sessionStorage.clear();
    localStorage.setItem('amazonaverse.save', JSON.stringify({
      v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1k279-' + Math.random().toString(36).slice(2, 10),
      profile: { created: true, name: 'Brisa del Valle', look: null },
      pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
      inv: {}, collected: [], complete: false, explorando: false, clock: 0,
      events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
      comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
      evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
    }));
  } catch (e) {}` }, ses);
  const t0 = Date.now(); let ok = false;
  await cdp.call('Page.navigate', { url: `${origen}/index.html?v18=1` }, ses);
  while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!ok) throw new Error('el juego no arrancó');
  const prep = await ev(cdp, ses, `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const sx = document.getElementById('c1-saltar');
    if (sx) { sx.click(); await sleep(1500); }
    const t = document.getElementById('title');
    return 'ok: portada ' + (t && t.open ? 'abierta' : 'cerrada');
  })()`, 60);
  if (!/^ok/.test(String(prep))) throw new Error('preparar: ' + prep);
  console.log('· preparar:', prep);
  const R = { gpu, hora: new Date().toISOString(), head: execSync('git rev-parse --short HEAD', { cwd: RAIZ }).toString().trim(), checks: {} };
  // Entrar al mundo (la semilla cae en la portada): la tarjeta Aventura arranca el mundo y cierra la portada
  const entro = await ev(cdp, ses, `(async () => {
    const G = window.AV.G, sleep = ms => new Promise(r => setTimeout(r, ms));
    const t = document.getElementById('title');
    if (!t.open) return 'ya estaba en el mundo';
    await G.menuModos.elegir('aventura');
    for (let i = 0; i < 100 && document.getElementById('title').open; i++) await sleep(300);
    await sleep(2500);
    return 'mundo: portada ' + (document.getElementById('title').open ? 'abierta' : 'cerrada');
  })()`, 120);
  console.log('· entrada al mundo:', entro);

  // Helper inyectado: espera una condición hasta t ms (poll 200 ms)
  const ESPERA = `window.__k279hasta = (fn, ms) => new Promise(res => { const t0 = Date.now(); const p = () => { let v = false; try { v = fn(); } catch (e) {} if (v) return res(true); if (Date.now() - t0 > ms) return res(false); setTimeout(p, 200); }; p(); });`;
  await ev(cdp, ses, ESPERA, 10);

  // — 1) Flight DESDE EL MUNDO: «Salir» deja en el mundo —
  R.checks.flight_mundo = JSON.parse(await ev(cdp, ses, `(async () => {
    try {
    const G = window.AV.G, sleep = ms => new Promise(r => setTimeout(r, ms));
    const t = document.getElementById('title');
    if (t.open) { t.returnValue = ''; t.close(); await sleep(400); }
    await window.AV.flight();
    const dentro = await window.__k279hasta(() => G.flightApi && G.flightApi.activo, 20000);
    if (!dentro) return JSON.stringify({ ok: false, det: 'flight no arrancó desde el mundo' });
    await sleep(1200);
    const btn = [...document.querySelectorAll('button[data-salir]')].find(b => b.offsetParent !== null);
    if (!btn) return JSON.stringify({ ok: false, det: 'no hay botón Salir visible' });
    btn.click();
    const volvioMenu = await window.__k279hasta(() => document.getElementById('title').open, 6000);
    await sleep(1500);
    const portada = document.getElementById('title').open, activo = !!(G.flightApi && G.flightApi.activo), on = document.body.classList.contains('flight-on');
    const R3 = G.renderer && G.renderer.renderer;
    const f0 = R3 && R3.info ? R3.info.render.frame : 0;
    await sleep(500);
    const mundoVisible = !!(R3 && R3.info) && R3.info.render.frame > f0;
    return JSON.stringify({ ok: !volvioMenu && !portada && !activo && !on && mundoVisible, volvioMenu, portada, activo, flightOn: on, mundoVisible, btn: btn.textContent.trim() });
    } catch (e) { return JSON.stringify({ ok: false, det: 'EX ' + (e && e.message ? e.message.slice(0, 160) : e) }); }
  })()`, 90));
  console.log('· flight_mundo:', JSON.stringify(R.checks.flight_mundo));
  await foto(cdp, ses, path.join(SALIDA, 'k279_salir_flight_mundo.jpg'));

  // — 2) Flight DESDE EL MENÚ: «Salir» vuelve al menú —
  R.checks.flight_menu = JSON.parse(await ev(cdp, ses, `(async () => {
    try {
    const G = window.AV.G, sleep = ms => new Promise(r => setTimeout(r, ms));
    G.menuModos.mostrar();
    await window.__k279hasta(() => document.getElementById('title').open, 8000);
    await sleep(600);
    await G.menuModos.elegir('flight');
    const dentro = await window.__k279hasta(() => G.flightApi && G.flightApi.activo, 20000);
    if (!dentro) return JSON.stringify({ ok: false, det: 'flight no arrancó desde el menú' });
    const portadaCerro = !document.getElementById('title').open;
    await sleep(1200);
    const btn = [...document.querySelectorAll('button[data-salir]')].find(b => b.offsetParent !== null);
    if (!btn) return JSON.stringify({ ok: false, det: 'no hay botón Salir visible' });
    btn.click();
    const volvio = await window.__k279hasta(() => document.getElementById('title').open, 9000);
    await sleep(1200);
    const portada = document.getElementById('title').open, activo = !!(G.flightApi && G.flightApi.activo), on = document.body.classList.contains('flight-on');
    return JSON.stringify({ ok: portadaCerro && volvio && portada && !activo && !on, portadaCerro, volvio, portada, activo, flightOn: on, btn: btn.textContent.trim() });
    } catch (e) { return JSON.stringify({ ok: false, det: 'EX ' + (e && e.message ? e.message.slice(0, 160) : e) }); }
  })()`, 90));
  console.log('· flight_menu:', JSON.stringify(R.checks.flight_menu));
  await foto(cdp, ses, path.join(SALIDA, 'k279_salir_flight_menu.jpg'));

  // — 3) Tormenta (retos) DESDE EL MENÚ: salir vuelve al menú —
  R.checks.tormenta_menu = JSON.parse(await ev(cdp, ses, `(async () => {
    try {
    const G = window.AV.G, sleep = ms => new Promise(r => setTimeout(r, ms));
    if (!document.getElementById('title').open) { G.menuModos.mostrar(); await window.__k279hasta(() => document.getElementById('title').open, 8000); await sleep(600); }
    await G.menuModos.elegir('tormenta');
    const dentro = await window.__k279hasta(() => G.retosApi && G.retosApi.activo && G.retosApi.reto === 'tormenta', 20000);
    if (!dentro) return JSON.stringify({ ok: false, det: 'tormenta no arrancó desde el menú', fase: G.retosApi && G.retosApi.fase, reto: G.retosApi && G.retosApi.reto });
    await sleep(1000);
    G.retosApi.salir();
    const volvio = await window.__k279hasta(() => document.getElementById('title').open, 9000);
    await sleep(1200);
    const portada = document.getElementById('title').open, activo = !!(G.retosApi && G.retosApi.activo);
    return JSON.stringify({ ok: volvio && portada && !activo, volvio, portada, activo });
    } catch (e) { return JSON.stringify({ ok: false, det: 'EX ' + (e && e.message ? e.message.slice(0, 160) : e) }); }
  })()`, 90));
  console.log('· tormenta_menu:', JSON.stringify(R.checks.tormenta_menu));
  await foto(cdp, ses, path.join(SALIDA, 'k279_salir_tormenta_menu.jpg'));

  // — 4) Maze DESDE EL MUNDO: salir deja en el mundo —
  R.checks.maze_mundo = JSON.parse(await ev(cdp, ses, `(async () => {
    try {
    const G = window.AV.G, sleep = ms => new Promise(r => setTimeout(r, ms));
    const t = document.getElementById('title');
    if (t.open) { t.returnValue = ''; t.close(); await sleep(400); }
    await window.AV.maze();
    const dentro = await window.__k279hasta(() => G.mazeApi && G.mazeApi.activo, 20000);
    if (!dentro) return JSON.stringify({ ok: false, det: 'maze no arrancó desde el mundo' });
    await sleep(1000);
    G.mazeApi.salir();
    const volvioMenu = await window.__k279hasta(() => document.getElementById('title').open, 6000);
    await sleep(1500);
    const portada = document.getElementById('title').open, activo = !!(G.mazeApi && G.mazeApi.activo), on = document.body.classList.contains('maze-on');
    return JSON.stringify({ ok: !volvioMenu && !portada && !activo && !on, volvioMenu, portada, activo, mazeOn: on });
    } catch (e) { return JSON.stringify({ ok: false, det: 'EX ' + (e && e.message ? e.message.slice(0, 160) : e) }); }
  })()`, 90));
  console.log('· maze_mundo:', JSON.stringify(R.checks.maze_mundo));
  await foto(cdp, ses, path.join(SALIDA, 'k279_salir_maze_mundo.jpg'));

  // — Stats finales: tras volver al mundo, el render sigue sano (fps/calls/tris/heap) —
  R.stats = JSON.parse(await ev(cdp, ses, `(async () => {
    const G = window.AV.G, sleep = ms => new Promise(r => setTimeout(r, ms));
    const t = document.getElementById('title');
    if (t.open) { t.returnValue = ''; t.close(); await sleep(400); }
    await sleep(2000);
    const cuadros = await new Promise(res => { const ts = []; let ant = performance.now(); const p = n => { const a = performance.now(); ts.push(a - ant); ant = a; if (ts.length < 90) requestAnimationFrame(p); else res(ts); }; requestAnimationFrame(p); });
    cuadros.sort((a, b) => a - b);
    const med = cuadros[Math.floor(cuadros.length / 2)], p95 = cuadros[Math.floor(cuadros.length * 0.95)];
    const info = await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => {
      const R3 = G.renderer && G.renderer.renderer;
      const inf = (R3 && R3.info) ? R3.info.render : { calls: 0, triangles: 0 };
      const mem = (R3 && R3.info) ? R3.info.memory : { geometries: 0, textures: 0 };
      res({ calls: inf.calls, tris: inf.triangles, geo: mem.geometries, tex: mem.textures });
    })));
    return JSON.stringify({ fpsMed: Math.round(1000 / med * 10) / 10, p95ms: Math.round(p95 * 10) / 10, calls: info.calls, tris: info.tris, geo: info.geo, tex: info.tex, heapMB: Math.round((performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0) * 10) / 10 });
  })()`, 60));
  console.log('· stats:', JSON.stringify(R.stats));

  R.erroresConsola = erroresConsola;
  fs.writeFileSync(path.join(SALIDA, 'k279_salir.json'), JSON.stringify(R, null, 2));
  const todos = Object.values(R.checks).every(c => c.ok);
  console.log('· RESULTADO:', todos ? 'TODO OK' : 'HAY FALLOS', '· errores de consola:', erroresConsola.length);
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  try { chrome.kill(); } catch (e) { }
  await new Promise(r => setTimeout(r, 1200));
  try { console.log('· ' + execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(AQUI, 'kimi2_mata_perfil.ps1')}" ${path.basename(perf)}`, { timeout: 30000 }).toString().trim()); } catch (e) { }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close(); process.exit(todos && erroresConsola.length === 0 ? 0 : 1);
})().catch(e => {
  console.error('FATAL', e);
  try { if (PERF_GLOB) console.log('· ' + execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(AQUI, 'kimi2_mata_perfil.ps1')}" ${path.basename(PERF_GLOB)}`, { timeout: 30000 }).toString().trim()); } catch (e2) { }
  process.exit(1);
});
