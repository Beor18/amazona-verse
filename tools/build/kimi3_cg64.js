#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — CG-64: la foto del cómic ya no congela el juego en móvil.
   Mide en iPhone emulado (375×812 dpr 3, CPU ×4, GPU real) el coste de la foto del mundo:
     · base: cuadros de referencia tras Empezar
     · nueva: programar la foto con la lectura diferida (snapshot devuelve Promise; el JPEG se
       codifica 1–2 cuadros después en fotoPaso, fuera del cuadro del evento)
     · vieja: la lectura antigua (drawImage síncrono del lienzo WebGL) en la misma sesión, para
       comparar el peor cuadro antes/después
   Uso: node tools/build/kimi3_cg64.js [--salida DIR]
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const SALIDA = arg('--salida', path.join(AQUI, 'salida', 'kimi3-cg64'));
fs.mkdirSync(SALIDA, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };

function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    const qa = /[?&]qa=1(?:&|$)/.test(req.url);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); return res.end('404'); }
      if (qa && /index\.html$/.test(f)) d = Buffer.from(d.toString('utf8').replace(/<meta charset[^>]*>/i, m => m + '<script src="tests/qa/qa.js" charset="utf-8"></script>'), 'utf8');
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(d);
    });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(method, params, sessionId, timeoutMs) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method, params: params || {}, sessionId })); if (timeoutMs) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + method)); } }, timeoutMs); }); }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}

async function evaluar(cdp, ses, exp, timeoutS, promesa) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: promesa !== false, returnByValue: true }, ses, (timeoutS || 30) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 400));
  return r.result ? r.result.value : undefined;
}

function limpiarHuerfanos() {
  try { execSync('powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name=\'chrome.exe\'\\" | Where-Object { $_.CommandLine -like \'*kimi3cg64-*\' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"', { timeout: 30000, stdio: 'ignore' }); } catch (e) { /* seguir */ }
}

async function lanzarChrome() {
  let ultimo = '';
  for (let intento = 0; intento < 3; intento++) { try { return await lanzarChromeUnaVez(); } catch (e) { ultimo = e.message; await new Promise(r => setTimeout(r, 2000)); } }
  throw new Error(ultimo);
}
async function lanzarChromeUnaVez() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3cg64-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--enable-logging=stderr', '--v=0', '--window-size=500,900', 'about:blank'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); const puerto = parseInt(l[0], 10), wsPath = (l[1] || '').trim(); if (puerto > 0 && wsPath) return { chrome, perf, puerto, wsPath }; }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('Chrome no abrió DevTools en 30 s: ' + err.slice(0, 300));
}

const MEDIR_JS = `(async () => {
  const G = AV.G, R = G.renderer;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const medir = async ms => { const ds = []; let last = performance.now(); const t0 = last;
    while (performance.now() - t0 < ms) { await new Promise(r => requestAnimationFrame(r)); const n = performance.now(); ds.push(n - last); last = n; }
    ds.sort((a, b) => a - b); return { n: ds.length, p50: Math.round(ds[Math.floor(ds.length * 0.5)] || 0), peor: Math.round(ds[ds.length - 1] || 0) }; };
  await sleep(3000); // asentar tras Empezar (streaming de la zona de inicio)
  const base = await medir(1500);
  // vía nueva (CG-64): programar = render + readPixels a PBO (cuesta lo de dibujar, no la espera de la GPU)
  const t0 = performance.now();
  const p = R.snapshot(640, 480, 0.72);
  const progMs = Math.round(performance.now() - t0);
  const post = await medir(1200); // aquí se ve el cuadro que codifica el JPEG (fotoPaso en update)
  const url = await p;
  const nueva = { progMs, urlOK: typeof url === 'string' && url.length > 2000, bytes: url ? url.length : 0, post };
  // vía vieja (antes de CG-64): drawImage síncrono del lienzo WebGL en la misma sesión y situación
  let vieja = null;
  try {
    const canvas = R.canvas;
    const t1 = performance.now();
    G.camara.place(true);
    R.renderer.render(R.scene, R.camera);
    const c = document.createElement('canvas'); c.width = 640; c.height = 480;
    const x = c.getContext('2d');
    const sw = canvas.width, sh = canvas.height, ar = 640 / 480;
    let cw = sw, ch = sw / ar; if (ch > sh) { ch = sh; cw = sh * ar; }
    x.drawImage(canvas, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, 640, 480);
    const jpg = c.toDataURL('image/jpeg', 0.72);
    vieja = { ms: Math.round(performance.now() - t1), ok: jpg.length > 2000 };
  } catch (e) { vieja = { error: String(e).slice(0, 120) }; }
  return JSON.stringify({ base, nueva, vieja, fotos: R.fotos(), webgl2: R.renderer.capabilities.isWebGL2 });
})()`;

(async () => {
  limpiarHuerfanos();
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  let limpio = false;
  const salir = cod => { if (!limpio) { limpio = true; try { chrome.kill('SIGKILL'); } catch (e) {} srv.close(); } process.exit(cod); };
  process.on('SIGINT', () => salir(2));
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws);
  await cdp.listo();
  console.log(`· servidor ${origen} · Chrome (perfil ${path.basename(perf)}) · 375×812 dpr 3 · CPU ×4 · GPU real`);
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 3, mobile: true }, ses);
    await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: 4 }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1` }, ses);
    const t0 = Date.now();
    let listo = false;
    while (Date.now() - t0 < CFG.espera_listo_s * 1000) { try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) {} await cdp.bombear(0.5); }
    if (!listo) { console.log('· el juego no arrancó'); salir(1); }
    console.log('· jugador nuevo: ' + await evaluar(cdp, ses, CFG.preparar_js, 300));
    const r = JSON.parse(await evaluar(cdp, ses, MEDIR_JS, 120));
    fs.writeFileSync(path.join(SALIDA, 'cg64.json'), JSON.stringify(r, null, 2));
    console.log(`· base (referencia): p50 ${r.base.p50} ms · peor ${r.base.peor} ms (${r.base.n} cuadros)`);
    console.log(`· NUEVA (diferida): programar ${r.nueva.progMs} ms · foto ${r.nueva.urlOK ? 'OK (' + Math.round(r.nueva.bytes / 1024) + ' KB)' : 'FALLA'} · cuadros post: p50 ${r.nueva.post.p50} ms · peor ${r.nueva.post.peor} ms`);
    console.log(`· VIEJA (drawImage síncrono): ${r.vieja.ms} ms de una tacada · ${r.vieja.ok ? 'foto OK' : 'falla'}`);
    console.log(`· contador renderer.fotos(): ${JSON.stringify(r.fotos)} · WebGL2: ${r.webgl2}`);
    salir(0);
  } catch (e) { console.log('· ERROR: ' + e.message); salir(1); }
})();
