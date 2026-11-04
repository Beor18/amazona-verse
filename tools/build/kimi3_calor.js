#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-041: medición local del parche 0j.2
   (caché de calor por material de renderer.js, KIMI-024). Cierra el pendiente que dejó KIMI-024
   («medición local con PC libre aplazada por contención»): self-time y hitCount de
   `cacheDe`/`objPendiente`/`texturasPendientes`/`siguienteCalor` en una vista asentada con
   el kit entero de la Ciudad de los 36 drenado (teleport +30 m + ST.terminar(), KIMI-020).
   Chrome headless propio + CDP (sin librerías), 375×812 dpr 3, CPU ×4, GPU real.
   Salida: docs/img/kimi041/calor-<etiqueta>.json
   Uso: node tools/build/kimi3_calor.js --etiqueta r1 [--calidad medio] [--cpu 4] [--ventana 10] */
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
const CALIDAD = (() => { const i = process.argv.indexOf('--calidad'); return i > 0 ? process.argv[i + 1] : 'medio'; })();
const CPU = parseFloat((() => { const i = process.argv.indexOf('--cpu'); return i > 0 ? process.argv[i + 1] : '4'; })(), 10);
const VENTANA_S = parseFloat((() => { const i = process.argv.indexOf('--ventana'); return i > 0 ? process.argv[i + 1] : '10'; })(), 10);
const X = -33, Z = -136, ALZAR = 30; // ancla de la ciudad (KIMI-020/030), drena todo el kit
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi041');
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

// teleport + alzar + terminar: asienta TODO el kit de la ciudad (máximos dibujables) — escenario KIMI-020
const ASENTAR_JS = `(async () => {
  const AV = window.AV, G = AV.G, S = G.S;
  const ST = (G.mundo && G.mundo.streaming) || (G.streaming && G.streaming.gestor);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  AV.teleport(${X}, ${Z});
  S.pos.y += ${ALZAR}; S.vy = 0; G.fisica.MOVE.flying = true;
  try { AV.debug.camYaw(0.8); } catch (e) {}
  const v = await ST.terminar({ topeMs: 30000 });
  await sleep(3000); // asentado de verdad: la cola vacía y varios cuadros dibujados
  const st = (() => { try { const s = G.renderer.stats() || {}; return { calls: s.calls, ktris: s.triangulos != null ? Math.round(s.triangulos / 1000) : null, calidad: s.calidad }; } catch (e) { return {}; } })();
  const dib = (() => { try { const d = G.renderer.dibujables ? G.renderer.dibujables() : null; return d ? d.length : null; } catch (e) { return null; } })();
  return JSON.stringify({ terminar: v, pos: [Math.round(S.pos.x), Math.round(S.pos.y), Math.round(S.pos.z)], ...st, dibujables: dib,
    heap: Math.round(performance.memory.usedJSHeapSize / 1048576) }); })()`;

async function lanzarChrome() {
  let ultimo = '';
  for (let intento = 0; intento < 3; intento++) {
    try { return await lanzarChromeUnaVez(); } catch (e) { ultimo = e.message; await new Promise(r => setTimeout(r, 2500)); }
  }
  throw new Error(ultimo);
}
async function lanzarChromeUnaVez() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3calor-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--enable-logging=stderr', '--v=0',
    '--window-size=500,900', 'about:blank'];
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
    const ps = "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*kimi3calor-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { /* seguir */ }
}
function matarChrome(chrome) {
  try { chrome.kill(); } catch (e) {}
  try { execSync(`taskkill /PID ${chrome.pid} /T /F 2>NUL`, { stdio: 'ignore' }); } catch (e) {}
}

// self-time por nombre de función reconstruido desde samples + timeDeltas del perfil CDP
// (el protocolo no da selfTime por nodo: DevTools lo deriva así). hitCount del nodo aparte.
function atribuir(profile) {
  const porNombre = {};
  const nodos = new Map();
  for (const nd of profile.nodes) nodos.set(nd.id, nd);
  const samples = profile.samples || [], deltas = profile.timeDeltas || [];
  let totalUs = 0;
  for (let i = 0; i < samples.length; i++) {
    const dt = deltas[i] || 0; totalUs += dt;
    const nd = nodos.get(samples[i]);
    if (!nd) continue;
    const nombre = nd.callFrame.functionName || '(anónima)';
    const t = porNombre[nombre] || (porNombre[nombre] = { selfUs: 0, hits: 0 });
    t.selfUs += dt;
  }
  for (const nd of profile.nodes) {
    if (!nd.hitCount) continue;
    const nombre = nd.callFrame.functionName || '(anónima)';
    const t = porNombre[nombre] || (porNombre[nombre] = { selfUs: 0, hits: 0 });
    t.hits += nd.hitCount;
  }
  return { porNombre, totalUs };
}

(async () => {
  limpiarHuerfanos();
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf } = await lanzarChrome();
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  const l = fs.readFileSync(puertoFile, 'utf8').split('\n');
  const puertoDev = parseInt(l[0], 10), wsPath = (l[1] || '').trim();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws);
  await cdp.listo();
  const res = { etiqueta: ETIQUETA, cuando: new Date().toISOString(), calidad: CALIDAD,
    movil: { ancho: 375, alto: 812, dpr: 3, cpu: CPU, gpu: 'PC real (ANGLE/D3D11)' },
    ancla: { x: X, z: Z, alzar: ALZAR }, ventana_s: VENTANA_S };
  console.log(`· KIMI-041 · parche 0j.2 (caché de calor) · 375×812 dpr 3 · CPU ×${CPU} · calidad ${CALIDAD} · ciudad +${ALZAR} m · perfil ${VENTANA_S} s asentado`);
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable', 'Profiler.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 3, mobile: true }, ses);
    await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1&calidad=${CALIDAD}` }, ses);
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
    await evaluar(cdp, ses, `(() => { try { for (const t of ['keydown', 'keyup']) window.dispatchEvent(new KeyboardEvent(t, { key: ' ', bubbles: true })); } catch (e) {} const R = AV.G.renderer; if (R.calidad) R.calidad.manual = true; if (R.setCalidad) R.setCalidad('${CALIDAD}'); return R.calidad && R.calidad.nivel; })()`, 15, false);
    console.log('· asentando la ciudad (teleport +30 m + ST.terminar)…');
    res.asentado = JSON.parse(await evaluar(cdp, ses, ASENTAR_JS, 90, true));
    console.log(`· asentado: ${res.asentado.calls} calls · ${res.asentado.ktris} k tris · ${res.asentado.dibujables} dibujables · heap ${res.asentado.heap} MB · terminar=${res.asentado.terminar}`);
    // perfil de CPU con la vista quieta (sigue dibujando cuadros)
    await cdp.call('Profiler.start', {}, ses);
    await cdp.bombear(VENTANA_S);
    const prof = (await cdp.call('Profiler.stop', {}, ses, 60000)).profile;
    const statsFin = JSON.parse(await evaluar(cdp, ses, `JSON.stringify((() => { try { const s = AV.G.renderer.stats() || {}; return { fps: s.fps, calls: s.calls, ktris: s.triangulos != null ? Math.round(s.triangulos / 1000) : null }; } catch (e) { return {}; } })())`, 10, false));
    res.fin = statsFin;
    const { porNombre, totalUs } = atribuir(prof);
    res.perfil = { duracionMs: Math.round(totalUs / 1000), muestras: (prof.samples || []).length, funciones: Object.entries(porNombre).map(([nombre, t]) => ({ nombre, selfMs: +(t.selfUs / 1000).toFixed(1), hits: t.hits, pct: totalUs ? +(100 * t.selfUs / totalUs).toFixed(2) : 0 })).sort((a, b) => b.selfMs - a.selfMs).slice(0, 40) };
    res.calor = {};
    for (const f of ['cacheDe', 'objPendiente', 'texturasPendientes', 'siguienteCalor', 'calorHecho', 'precalentar']) {
      const e = porNombre[f];
      res.calor[f] = e ? { selfMs: +(e.selfUs / 1000).toFixed(2), hits: e.hits, pct: totalUs ? +(100 * e.selfUs / totalUs).toFixed(3) : 0 } : null;
    }
    console.log('· calor (self-time total en la ventana):');
    for (const f of Object.keys(res.calor)) {
      const c = res.calor[f];
      console.log(`   ${f}: ${c ? c.selfMs + ' ms · ' + c.hits + ' hits · ' + c.pct + ' %' : 'sin muestras'}`);
    }
    const top = res.perfil.funciones.slice(0, 8).map(f => `${f.nombre} ${f.selfMs}ms`).join(' · ');
    console.log('· top: ' + top);
    const errores = await evaluar(cdp, ses, 'JSON.stringify((window.__aveErrores || []).slice(0, 8))', 10, false).catch(() => '[]');
    res.errores = JSON.parse(errores || '[]');
    try { await cdp.call('Target.closeTarget', { targetId: tid }, undefined, 10); } catch (e) { }
  } catch (e) {
    res.error = e && e.message || String(e);
    console.log('· FALLO: ' + res.error);
  }
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { matarChrome(chrome); }
  srv.close();
  const ruta = path.join(SALIDA, `calor-${ETIQUETA}.json`);
  fs.writeFileSync(ruta, JSON.stringify(res, null, 2));
  console.log(`· resultado en ${ruta}`);
  process.exit(res.error ? 2 : 0);
})().catch(e => { console.error('FALLO:', e && e.stack || JSON.stringify(e) || String(e)); process.exit(2); });
