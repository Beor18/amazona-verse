#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-022: validar con GPU real el _hd400 de complejo_ruinas.
   Chrome headless propio + CDP (sin librerías). Una condición por proceso:
     --modo escritorio|movil   (escritorio 1600×900 dpr1 cpu×1 · movil 390×844 dpr3 cpu×4 UA iPhone)
     --calidad alta|media|bajo (forzado con ?calidad=; natural si no se pasa)
     --hd400 0|1               (?hd400=1 activa complejo_ruinas_hd400 en streaming.js)
   Escenario: semilla cap1 → portada → Aventura → teleport junto al complejo (-18.5,35.7,177.2)
   → ST.terminar() (drenado presupuestado) → órbita lenta r=38 m a +18 m durante 16 s
   → FPS p50/p10/peor, draw calls, triángulos, info.memory, heap, look.medir, captura.
   Salida: docs/img/kimi022/k022-<etiqueta>.json + k022-<etiqueta>.jpg
   Uso: node tools/build/kimi1_022.js --modo escritorio --calidad media --hd400 1 --etiqueta escritorio-media-hd1 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const MODO = arg('--modo', 'escritorio');
const CALIDAD = (arg('--calidad', null) || '').replace(/^media$/, 'medio') || null;
const HD400 = arg('--hd400', '0');
const ETIQUETA = arg('--etiqueta', `${MODO}-${CALIDAD || 'natural'}-hd${HD400}`);
const DUR = parseInt(arg('--secs', '16'), 10);
const ES_MOVIL = MODO === 'movil';
const ANCHO = ES_MOVIL ? 390 : 1600, ALTO = ES_MOVIL ? 844 : 900, DPR = ES_MOVIL ? 3 : 1, CPU = ES_MOVIL ? 4 : 1;
const UA = ES_MOVIL
  ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi022');
fs.mkdirSync(SALIDA, { recursive: true });

// Centro de la única instancia de complejo_ruinas (assets/data/mapa_cap1.js, zona kelvin_aldea_colina)
const CX = -18.5, CZ = 177.2, R_ORBITA = 38, H_ORBITA = 18;

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
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); this.eventos = []; ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error de conexión'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message + ' ' + JSON.stringify(d.error.data || ''))) : p.re(d.result); } else if (d.method) this.eventos.push(d); }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(m, p, s, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: m, params: p || {}, sessionId: s })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + m)); } }, t); }); }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function ev(cdp, ses, exp, t, aw) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, returnByValue: true, awaitPromise: aw !== false }, ses, (t || 30) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.textDetails || r.exceptionDetails.text).slice(0, 400));
  return r.result ? r.result.value : undefined;
}

const SEMILLA_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.capitulo', '1');
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;

const INIT_JS = `window.__k22 = { nav: Math.round(performance.now()), cuadros: [], jugable: null, ml: null, mlT: null };
(function () {
  const v = window.__k22;
  try { performance.setResourceTimingBufferSize(100000); } catch (e) {}
  try { performance.clearResourceTimings(); } catch (e) {}
  try {
    let ult = performance.now();
    function tick(t) { v.cuadros.push(Math.round(t - ult)); ult = t; if (v.cuadros.length < 400000) requestAnimationFrame(tick); }
    requestAnimationFrame(tick);
  } catch (e) {}
  try {
    setInterval(() => {
      try {
        if (v.ml == null && window.AV && AV.G) {
          if (AV.G.mundo && AV.G.mundo.listo) { v.ml = 0; Promise.resolve(AV.G.mundo.listo).then(() => { v.mlT = Math.round(performance.now()); v.ml = 1; }); }
          else if (AV.G.on) { v.ml = 0; AV.G.on('mundoListo', () => { v.mlT = Math.round(performance.now()); v.ml = 1; }); }
        }
        if (v.jugable == null && window.AV && AV.G && AV.G.ui && AV.G.ui.worldHidden && !AV.G.ui.worldHidden()) {
          const st = (() => { try { return AV.G.renderer.stats(); } catch (e) { return null; } })();
          if (st && st.calls > 5) v.jugable = Math.round(performance.now());
        }
      } catch (e) {}
    }, 250);
  } catch (e) {}
})();`;

// Órbita lenta alrededor del complejo + stats. Verifica posición real (los teleport a sólidos redirigen).
const MEDIDA_JS = `(async () => {
  const AV = window.AV, G = AV.G, S = G.S, ST = (G.mundo && G.mundo.streaming) || (G.streaming && G.streaming.gestor);
  if (!ST) return JSON.stringify({ error: 'sin streaming' });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const bajando = async (x, z, y) => {
    AV.teleport(x, z);
    await sleep(700);
    S.pos.x = x; S.pos.z = z; S.pos.y = y; S.vy = 0;
    G.fisica.MOVE.flying = true;
    await sleep(300);
  };
  await bajando(${CX}, ${CZ + R_ORBITA}, 60);
  try { await ST.alrededor(S.pos.x, S.pos.z); } catch (e) {}
  let valor = null;
  try { valor = await ST.terminar({ topeMs: 30000 }); } catch (e) {}
  await sleep(1500);
  const posEsperada = [${CX}, ${CZ + R_ORBITA}];
  const desvio0 = Math.hypot(S.pos.x - posEsperada[0], S.pos.z - posEsperada[1]);
  window.__k22.cuadros.length = 0;
  const t0 = performance.now();
  const mem = [];
  const mTimer = setInterval(() => { try { const R2 = G.renderer; mem.push({ t: Math.round((performance.now() - t0) / 100) / 10, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576 * 10) / 10 : null, geo: R2.renderer.info.memory.geometries, tex: R2.renderer.info.memory.textures, prog: R2.renderer.info.programs.length }); } catch (e) {} }, 2000);
  await new Promise(res => {
    function paso() {
      const t = (performance.now() - t0) / 1000;
      if (t >= ${DUR}) return res();
      const a = (t / ${DUR}) * Math.PI * 2 - Math.PI / 2;
      S.pos.x = ${CX} + Math.cos(a) * ${R_ORBITA}; S.pos.z = ${CZ} + Math.sin(a) * ${R_ORBITA};
      S.pos.y = ${35.7 + H_ORBITA} + Math.sin(t * 0.5) * 2; S.vy = 0;
      G.fisica.MOVE.flying = true;
      try { AV.debug.camYaw(Math.atan2((${CX} - S.pos.x), (${CZ} - S.pos.z))); } catch (e) {}
      requestAnimationFrame(paso);
    }
    paso();
  });
  clearInterval(mTimer);
  const st = (() => { try { return G.renderer.stats(); } catch (e) { return {}; } })();
  let look = null;
  try { look = AV.look.medir(); } catch (e) {}
  const cargadoHd400 = (() => { try { return performance.getEntriesByType('resource').some(r => r.name.indexOf('complejo_ruinas_hd400') >= 0) ? 1 : 0; } catch (e) { return null; } })();
  const recursosComplejo = (() => { try { return performance.getEntriesByType('resource').filter(r => r.name.indexOf('complejo_ruinas') >= 0).map(r => r.name.split('/').pop()); } catch (e) { return null; } })();
  const href = location.href;
  const zonasDump = (() => { try { return Object.values(ST.zonas || {}).filter(Z => Z.d < 120 || Z.id.indexOf('colina') >= 0 || Z.id.indexOf('ruinas_yunque') >= 0).map(Z => ({ id: Z.id, nivel: Z.nivel, d: Math.round(Z.d), ciudad: !!Z.ciudad, hd: !!Z.hd, usaMalla: !!Z.usaMalla, hdVe: !!Z.hdVe, modelos: Z.modelos ? [...Z.modelos].slice(0, 8) : [] })); } catch (e) { return String(e).slice(0, 120); } })();
  const stStreaming = (() => { try { return ST.stats(); } catch (e) { return String(e).slice(0, 120); } })();
  const v = window.__k22; const orden = [...v.cuadros].sort((a, b) => a - b);
  const p = q => (orden.length ? orden[Math.min(orden.length - 1, Math.floor(orden.length * q))] : null);
  const suma = orden.reduce((a, b) => a + b, 0);
  return JSON.stringify({ durReal: Math.round(suma / 100) / 10, nCuadros: orden.length,
    fpsMed: orden.length ? Math.round(orden.length * 100000 / suma) / 100 : null,
    fpsP50: p(0.5) ? Math.round(100000 / p(0.5)) / 100 : null, fpsP10: p(0.9) ? Math.round(100000 / p(0.9)) / 100 : null,
    peorMs: p(1), p95Ms: p(0.95),
    calls: st.calls, ktris: st.triangulos != null ? Math.round(st.triangulos / 1000) : null, calidad: st.calidad,
    geo: st.geometrias != null ? st.geometrias : null,
    heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576 * 10) / 10 : null,
    infoMem: (() => { try { const m = G.renderer.renderer.info.memory; return { geo: m.geometries, tex: m.textures }; } catch (e) { return null; } })(),
    progs: (() => { try { return G.renderer.renderer.info.programs.length; } catch (e) { return null; } })(),
    lookTexturasMB: look && look.texturasMB != null ? look.texturasMB : null,
    cargadoHd400, recursosComplejo, href, zonasDump, stStreaming, terminarTope: !!(valor && valor.tope),
    desvio0: Math.round(desvio0 * 10) / 10,
    posFin: [Math.round(S.pos.x * 10) / 10, Math.round(S.pos.y * 10) / 10, Math.round(S.pos.z * 10) / 10], mem });
})()`;

const GPU_JS = `(() => { try { const gl = AV.G.renderer.renderer.getContext(); const ext = gl.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'sin debug_info'; } catch (e) { return 'n/d'; } })()`;

async function lanzarChrome(perf) {
  fs.mkdirSync(perf, { recursive: true });
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--enable-logging=stderr', '--v=0', `--window-size=${ANCHO},${ALTO}`, 'about:blank'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim(), err: () => err }; }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools en 60 s: ' + err.slice(0, 300));
}

function erroresDe(cdp) {
  const out = [];
  for (const e of cdp.eventos) {
    if (e.method === 'Runtime.exceptionThrown') out.push('EXC ' + JSON.stringify(e.params.exceptionDetails.exception && e.params.exceptionDetails.exception.description || e.params.exceptionDetails.text).slice(0, 300));
    else if (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') out.push('console.error ' + (e.params.args || []).map(a => a.value != null ? String(a.value).slice(0, 200) : (a.description || '').slice(0, 200)).join(' '));
    else if (e.method === 'Log.entryAdded' && e.params.entry.level === 'error') out.push('log ' + String(e.params.entry.text).slice(0, 300));
  }
  return out.slice(0, 20);
}

async function matarChrome(chrome, perf) {
  try { chrome.kill(); } catch (e) {}
  try {
    const { execSync } = require('child_process');
    // chrome.exe puede delegar el navegador real en otro proceso del árbol: matar por el
    // perfil (único por corrida), no por PID (deja zombis que roban GPU a las otras sesiones).
    const marca = path.basename(perf).replace(/'/g, '');
    execSync(`powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name='chrome.exe'\\" | Where-Object { \\$_.CommandLine -match '${marca}' } | ForEach-Object { try { Stop-Process -Id \\$_.ProcessId -Force -ErrorAction Stop } catch {} }"`, { stdio: 'ignore', timeout: 30000 });
  } catch (e) {}
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const qs = [];
  if (CALIDAD) qs.push('calidad=' + CALIDAD);
  qs.push('hd400=' + HD400);
  const url = origen + '/index.html?' + qs.join('&');
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1x22-'));
  const res = { etiqueta: ETIQUETA, modo: MODO, calidadForzada: CALIDAD, hd400: HD400, url, pantalla: { ancho: ANCHO, alto: ALTO, dpr: DPR, cpu: CPU }, durOrbitaS: DUR };
  let chromeL = null, ws = null;
  try {
    chromeL = await lanzarChrome(perf);
    ws = new WebSocket(`ws://127.0.0.1:${chromeL.puerto}${chromeL.wsPath}`);
    const cdp = new CDP(ws); await cdp.listo();
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: ES_MOVIL }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
    await cdp.call('Network.enable', {}, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS + '\n' + INIT_JS }, ses);
    await cdp.call('Page.navigate', { url }, ses);
    // portada → tarjeta Aventura
    let clicado = false;
    for (let i = 0; i < 160; i++) {
      await cdp.bombear(0.5);
      try {
        const hecho = await ev(cdp, ses, `(() => { const b = document.querySelector('[data-modo="aventura"]'); if (!b) return false; b.click(); return true; })()`, 5, false);
        if (hecho) { clicado = true; break; }
      } catch (e) { /* aún no */ }
    }
    res.clicAventura = clicado;
    let listo = false;
    const t0 = Date.now();
    while (Date.now() - t0 < 150000) {
      await cdp.bombear(0.5);
      try {
        const r = await ev(cdp, ses, `(() => { const v = window.__k22; return (v.ml === 1 && v.jugable != null) ? 1 : 0; })()`, 5, false);
        if (r === 1) { await cdp.bombear(2); listo = true; break; }
      } catch (e) { /* aún cargando */ }
    }
    res.okCarga = listo;
    res.gpu = await ev(cdp, ses, GPU_JS, 15);
    if (listo) {
      const raw = await ev(cdp, ses, MEDIDA_JS, DUR + 120);
      res.medida = JSON.parse(raw);
      try {
        const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 30000);
        fs.writeFileSync(path.join(SALIDA, `k022-${ETIQUETA}.jpg`), Buffer.from(shot.data, 'base64'));
      } catch (e) { res.shotError = String(e.message).slice(0, 120); }
    }
    res.errores = erroresDe(cdp);
  } catch (e) {
    res.error = String(e.message).slice(0, 300);
  } finally {
    if (chromeL) await matarChrome(chromeL.chrome, perf);
    await new Promise(r => setTimeout(r, 1200));
    try { ws && ws.close(); } catch (e) {}
    srv.close();
    try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) {}
  }
  const out = path.join(SALIDA, `k022-${ETIQUETA}.json`);
  fs.writeFileSync(out, JSON.stringify(res, null, 1));
  console.log('DATOS ' + out);
  console.log(JSON.stringify({ etiqueta: ETIQUETA, ok: res.okCarga, medida: res.medida && { fpsMed: res.medida.fpsMed, fpsP50: res.medida.fpsP50, fpsP10: res.medida.fpsP10, peorMs: res.medida.peorMs, calls: res.medida.calls, ktris: res.medida.ktris, calidad: res.medida.calidad, heapMB: res.medida.heapMB, infoMem: res.medida.infoMem, lookTexturasMB: res.medida.lookTexturasMB, cargadoHd400: res.medida.cargadoHd400, desvio0: res.medida.desvio0 }, errores: res.errores }, null, 1));
  process.exit(res.error && !res.medida ? 1 : 0);
})();
