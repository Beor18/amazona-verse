#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-044: pico transitorio de heap en la fusión HD de zona
   (QA-152 fase 7 / QA-153 palanca documentada: «soltar atributos ya consumidos por la fusión»).
   Escritorio calidad ALTO (hdZona() true; en móvil «bajo» QA-158 ya no funde): semilla cap1 →
   teleport Ciudad de los 36 (-33,-136) +30 m → ST.terminar() — el drenado funde el _hd de la zona
   clonando cada parte por instancia (p.geo.clone()+applyMatrix4) y retiene TODOS los clones hasta
   cerrar el último grupo. Muestrea heap JS + info.memory cada 300 ms alrededor del drenado:
   el pico transitorio es lo que esta vuelta recorta (clones por grupo, no los lotes ni las fuentes).
   Chrome headless propio + CDP (sin librerías), 1280×800 dpr 1, CPU ×4, GPU real.
   Salida: docs/img/kimi044/k044-<etiqueta>.json
   Uso: node tools/build/kimi3_044.js --etiqueta base1 [--cpu 4] */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ETIQUETA = (() => { const i = process.argv.indexOf('--etiqueta'); return i > 0 ? process.argv[i + 1] : 'r1'; })();
const CPU = parseFloat((() => { const i = process.argv.indexOf('--cpu'); return i > 0 ? process.argv[i + 1] : '4'; })(), 10);
const X = -33, Z = -136, ALZAR = 30;
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi044');
fs.mkdirSync(SALIDA, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); return res.end('404'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(d);
    });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error de conexión'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message + ' ' + JSON.stringify(d.error.data || ''))) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(method, params, sessionId, timeoutMs) {
    const id = ++this.id;
    return new Promise((re, re2) => {
      this.pend.set(id, { re, re2 });
      this.ws.send(JSON.stringify({ id, method, params: params || {}, sessionId }));
      if (timeoutMs) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + method)); } }, timeoutMs);
    });
  }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function evaluar(cdp, ses, exp, timeoutS, promesa) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: promesa !== false, returnByValue: true }, ses, (timeoutS || 30) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 500));
  return r.result ? r.result.value : undefined;
}

const SEMILLA_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.capitulo', '1');
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi3-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;

// muestreador en página: heap + memoria del renderer cada 300 ms desde que se arma hasta que se para
const ARMAR_JS = `(() => {
  window.__k44 = { muestras: [], t0: performance.now(), timer: null };
  const mem = () => { try { const m = (AV.G.renderer.info && AV.G.renderer.info.memory) || {}; return { geo: m.geometries || 0, tex: m.textures || 0 }; } catch (e) { return {}; } };
  window.__k44.timer = setInterval(() => {
    try { window.__k44.muestras.push({ t: Math.round(performance.now() - window.__k44.t0), heap: Math.round(performance.memory.usedJSHeapSize / 1048576), ...mem() }); } catch (e) {}
  }, 300);
  return true; })()`;
const PARAR_JS = `(() => { if (window.__k44 && window.__k44.timer) { clearInterval(window.__k44.timer); window.__k44.timer = null; } const m = window.__k44 ? window.__k44.muestras : []; window.__k44.muestras = []; return m; })()`;

const DRENAR_JS = `(async () => {
  const AV = window.AV, G = AV.G, S = G.S;
  const ST = (G.mundo && G.mundo.streaming) || (G.streaming && G.streaming.gestor);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  // KIMI-044: asentar la villa ANTES de medir (sin esto el drenado pendiente al teleport depende de la
  // contención de la PC en la entrada y la medición no es comparable entre corridas)
  await ST.terminar({ topeMs: 60000 });
  await sleep(1500);
  if (window.gc) window.gc();
  await sleep(300);
  const basePre = Math.round(performance.memory.usedJSHeapSize / 1048576);
  AV.teleport(${X}, ${Z});
  S.pos.y += ${ALZAR}; S.vy = 0; G.fisica.MOVE.flying = true;
  try { AV.debug.camYaw(0.8); } catch (e) {}
  const t0 = performance.now();
  const v = await ST.terminar({ topeMs: 60000 });
  const terminarMs = Math.round(performance.now() - t0);
  await sleep(4000); // asentado: cola vacía y varios cuadros dibujados
  const st = (() => { try { const s = G.renderer.stats() || {}; return { calls: s.calls, ktris: s.triangulos != null ? Math.round(s.triangulos / 1000) : null, calidad: s.calidad }; } catch (e) { return {}; } })();
  if (window.gc) window.gc();
  await sleep(300);
  const prog = (() => { try { return G.renderer.info.programs ? G.renderer.info.programs.length : null; } catch (e) { return null; } })();
  return JSON.stringify({ terminar: v, terminarMs, basePre, pos: [Math.round(S.pos.x), Math.round(S.pos.y), Math.round(S.pos.z)], ...st, prog,
    heapAsentado: Math.round(performance.memory.usedJSHeapSize / 1048576) }); })()`;

async function lanzarChrome() {
  let ultimo = '';
  for (let intento = 0; intento < 3; intento++) {
    try { return await lanzarChromeUnaVez(); } catch (e) { ultimo = e.message; await new Promise(r => setTimeout(r, 2500)); }
  }
  throw new Error(ultimo);
}
async function lanzarChromeUnaVez() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3c44-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--enable-logging=stderr', '--v=0', '--expose-gc',
    '--window-size=1280,800', 'about:blank'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let err = '';
  chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    if (fs.existsSync(puertoFile)) {
      const l = fs.readFileSync(puertoFile, 'utf8').split('\n');
      const puerto = parseInt(l[0], 10), wsPath = (l[1] || '').trim();
      if (puerto > 0 && wsPath) return { chrome, perf, puerto, wsPath };
    }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('Chrome no abrió DevTools en 30 s: ' + err.slice(0, 300));
}
function limpiarHuerfanos() {
  try {
    const ps = "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*kimi3c44-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { /* seguir */ }
}
function matarChrome(chrome) {
  try { chrome.kill(); } catch (e) {}
  try { execSync(`taskkill /PID ${chrome.pid} /T /F 2>NUL`, { stdio: 'ignore' }); } catch (e) {}
}

(async () => {
  limpiarHuerfanos();
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf } = await lanzarChrome();
  const l = fs.readFileSync(path.join(perf, 'DevToolsActivePort'), 'utf8').split('\n');
  const puertoDev = parseInt(l[0], 10), wsPath = (l[1] || '').trim();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws);
  await cdp.listo();
  const errores = [];
  const res = { etiqueta: ETIQUETA, cuando: new Date().toISOString(),
    escenario: 'k044-drenado-ciudad-alto', escritorio: { ancho: 1280, alto: 800, dpr: 1, cpu: CPU, gpu: 'PC real (ANGLE/D3D11)' },
    ancla: { x: X, z: Z, alzar: ALZAR } };
  console.log(`· KIMI-044 · pico transitorio fusión HD · escritorio 1280×800 · CPU ×${CPU} · calidad ALTO · ciudad +${ALZAR} m`);
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1&calidad=alto` }, ses);
    let clicado = false;
    for (let i = 0; i < 150 && !clicado; i++) {
      await cdp.bombear(0.5);
      try { clicado = !!(await evaluar(cdp, ses, `(() => { const b = document.querySelector('[data-modo="aventura"]'); if (!b) return false; b.click(); return true; })()`, 5, false)); } catch (e) { }
    }
    if (!clicado) throw new Error('no apareció la tarjeta Aventura');
    let jugable = false;
    for (let i = 0; i < 240 && !jugable; i++) {
      await cdp.bombear(0.5);
      try { jugable = !!(await evaluar(cdp, ses, `(() => { const G = window.AV && AV.G; if (!G || !G.ui || G.ui.worldHidden()) return false; const st = (() => { try { return G.renderer.stats(); } catch (e) { return null; } })(); return st && st.calls > 5; })()`, 5, false)); } catch (e) { }
    }
    if (!jugable) throw new Error('el mundo no llegó a jugable');
    console.log('· entrada: mundo jugable');
    await evaluar(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)); for (let i = 0; i < 200; i++) { const b = document.getElementById('c1-saltar'); if (b && b.isConnected) { b.click(); return 'saltada'; } await sleep(100); } return 'sin botón'; })()`, 40, true);
    const nivel = await evaluar(cdp, ses, `(() => { const R = AV.G.renderer; if (R.calidad) R.calidad.manual = true; if (R.setCalidad) R.setCalidad('alto'); return R.calidad && R.calidad.nivel; })()`, 15, false);
    console.log('· calidad forzada: ' + nivel);
    await evaluar(cdp, ses, ARMAR_JS, 10, false);
    console.log('· drenando la ciudad (teleport +30 m + ST.terminar)…');
    res.drenado = JSON.parse(await evaluar(cdp, ses, DRENAR_JS, 120, true));
    res.muestras = await evaluar(cdp, ses, PARAR_JS, 10, false);
    // base previa al teleport (primeras muestras) y pico
    const hs = res.muestras.map(m => m.heap);
    res.baseHeap = hs.length ? hs[0] : null;
    res.heapMax = hs.length ? Math.max(...hs) : null;
    res.heapMaxEn = hs.length ? res.muestras[hs.indexOf(Math.max(...hs))].t : null;
    const consola = await evaluar(cdp, ses, `(() => { try { return (AV.G && AV.G.consola && AV.G.consola.errores) || []; } catch (e) { return []; } })()`, 10, false);
    res.errores = (consola || []).slice(0, 20);
    console.log(`· resultado: terminar ${res.drenado.terminarMs} ms · asentado ${res.drenado.calls} calls / ${res.drenado.ktris} k tris · heap base ${res.baseHeap} → pico ${res.heapMax} MB (t+${res.heapMaxEn} ms) · asentado tras gc ${res.drenado.heapAsentado} MB`);
  } catch (e) {
    res.error = e.message;
    try { res.muestras = await evaluar(cdp, ses, PARAR_JS, 10, false); } catch (e2) { }
  } finally {
    try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { matarChrome(chrome); }
    await cdp.bombear(1);
    try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
    srv.close();
  }
  fs.writeFileSync(path.join(SALIDA, `k044-${ETIQUETA}.json`), JSON.stringify(res, null, 1));
  console.log('· evidencia: docs/img/kimi044/k044-' + ETIQUETA + '.json');
})();
