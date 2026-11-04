#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — QA-158: identificar las ~207 mallas de escena SIN nombre
   (2 MB, 199 visibles) que la atribución de Kimi 2 dejó como familia pendiente (docs/img/kimi158/qa158-atrib2.json).
   Chrome headless propio + CDP (sin librerías), iPhone 390×844 dpr 3, CPU ×4, GPU real, calidad «bajo».
   Entra como KIMI-040 (partida sembrada → Aventura → salta intro), vuela el circuito villa→ciudad unos --mins,
   y vuelca por FIRMA (tipo de malla/geometría/material/padres) todas las mallas sin nombre de la escena.
   Salida: docs/img/kimi158/nombres-<etiqueta>.json
   Uso: node tools/build/kimi3_nombres.js --etiqueta r1 [--mins 2.5] [--cpu 4] */
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
const MINS = parseFloat((() => { const i = process.argv.indexOf('--mins'); return i > 0 ? process.argv[i + 1] : '2.5'; })(), 10);
const CPU = parseFloat((() => { const i = process.argv.indexOf('--cpu'); return i > 0 ? process.argv[i + 1] : '4'; })(), 10);
const VEL = 17, ALTURA = 26;
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi158');
fs.mkdirSync(SALIDA, { recursive: true });
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

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

// Vuelo corto por el circuito (mismo patrón que kimi3_qa158.js) para reproducir el estado de vuelo
const VUELO_JS = `(async () => {
  const AV = window.AV, G = AV.G, S = G.S;
  const RUTA = [ { n: 'villa', x: 150, z: 203 }, { n: 'plaza', x: 145.5, z: 178.5 }, { n: 'ciudad', x: -33, z: -136 } ];
  const v = window.__qa158 = { t0: Math.round(performance.now()), listo: false };
  const altura = (x, z) => { try { const h = AV.debug.height(x, z); return isFinite(h) ? h : 8; } catch (e) { return 8; } };
  G.fisica.MOVE.flying = true;
  let wp = 0;
  v.tick = setInterval(() => {
    try {
      const paso = ${VEL} * 0.25;
      const dx = RUTA[wp].x - S.pos.x, dz = RUTA[wp].z - S.pos.z, d = Math.hypot(dx, dz);
      if (d < Math.max(25, paso)) { wp = (wp + 1) % RUTA.length; return; }
      S.pos.x += dx / d * paso; S.pos.z += dz / d * paso;
      S.pos.y = Math.max(altura(S.pos.x, S.pos.z) + ${ALTURA}, 8); S.vy = 0;
      try { AV.debug.camYaw(Math.atan2(dx, dz)); } catch (e) {}
      G.fisica.MOVE.flying = true;
    } catch (e) {}
  }, 250);
  v.listo = true;
  return 'ok: circuito en marcha'; })()`;

// Volcado de mallas SIN nombre por firma + resumen global de la escena
const IDENT_JS = `(async () => {
  const AV = window.AV, G = AV.G, S = G.S, R = G.renderer;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  await sleep(1200);
  const raiz = (R.scene || G.scene);
  if (!raiz) return JSON.stringify({ error: 'sin escena' });
  const grupos = {}; const conNombre = {}; let total = 0, sinNombre = 0;
  const cadenaPadres = o => { const c = []; let p = o; for (let i = 0; i < 5 && p; i++) { c.push((p.name || p.type) + ''); p = p.parent; } return c.join(' < '); };
  raiz.traverse(o => {
    if (!(o.isMesh || o.isPoints || o.isLine)) return;
    total++;
    const nombre = o.name || '';
    if (nombre) { const k = nombre.split(':').slice(0, 2).join(':'); conNombre[k] = (conNombre[k] || 0) + 1; return; }
    sinNombre++;
    const g = o.geometry, m = o.material || {};
    const firma = JSON.stringify({
      t: o.type, gt: g && g.type,
      at: g && g.attributes ? Object.keys(g.attributes).join('+') : null,
      idx: !!(g && g.index),
      mt: m.type, mn: m.name || null,
      map: !!m.map, col: m.color ? m.color.getHexString() : null,
      tr: !!m.transparent, ds: m.side,
      pp: cadenaPadres(o.parent)
    });
    const gr = grupos[firma] || (grupos[firma] = { n: 0, verts: 0, inst: 0, vis: 0, ej: null });
    gr.n++;
    if (g && g.attributes && g.attributes.position) gr.verts += g.attributes.position.count;
    if (o.isInstancedMesh) gr.inst++;
    if (o.visible) gr.vis++;
    if (!gr.ej) { const v = new (o.position.constructor)(); try { o.getWorldPosition(v); } catch (e) {} gr.ej = { pos: [Math.round(v.x), Math.round(v.y), Math.round(v.z)], padres: cadenaPadres(o.parent) }; }
  });
  const firmas = Object.entries(grupos).map(([f, g]) => ({ firma: JSON.parse(f), n: g.n, verts: g.verts, inst: g.inst, vis: g.vis, ej: g.ej }))
    .sort((a, b) => b.n - a.n);
  const inf = (() => { try { const i = (R.renderer || R).info; return { geo: i.memory.geometries, tex: i.memory.textures, prog: i.programs ? i.programs.length : 0 }; } catch (e) { return {}; } })();
  return JSON.stringify({ pos: [Math.round(S.pos.x), Math.round(S.pos.y), Math.round(S.pos.z)],
    heap: Math.round(performance.memory.usedJSHeapSize / 1048576),
    inf, total, sinNombre,
    conNombre: Object.entries(conNombre).map(([p, n]) => ({ p, n })).sort((a, b) => b.n - a.n).slice(0, 40),
    firmas }); })()`;

async function lanzarChrome() {
  let ultimo = '';
  for (let intento = 0; intento < 3; intento++) {
    try { return await lanzarChromeUnaVez(); } catch (e) { ultimo = e.message; await new Promise(r => setTimeout(r, 2500)); }
  }
  throw new Error(ultimo);
}
async function lanzarChromeUnaVez() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3nom-'));
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
    const ps = "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*kimi3nom-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
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
  // el puerto real sale del perfil (DevToolsActivePort ya lo leyó lanzarChromeUnaVez)
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  const l = fs.readFileSync(puertoFile, 'utf8').split('\n');
  const puertoDev = parseInt(l[0], 10), wsPath = (l[1] || '').trim();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws);
  await cdp.listo();
  const res = { etiqueta: ETIQUETA, cuando: new Date().toISOString(), mins: MINS,
    movil: { ancho: 390, alto: 844, dpr: 3, cpu: CPU, gpu: 'PC real (ANGLE/D3D11)', calidad: 'bajo' } };
  console.log(`· identificación de mallas sin nombre · iPhone 390×844 dpr 3 · CPU ×${CPU} · bajo · ${MINS} min de circuito`);
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }, ses);
    await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1&calidad=bajo` }, ses);
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
    await evaluar(cdp, ses, `(() => { try { for (const t of ['keydown', 'keyup']) window.dispatchEvent(new KeyboardEvent(t, { key: ' ', bubbles: true })); } catch (e) {} const R = AV.G.renderer; if (R.calidad) R.calidad.manual = true; if (R.setCalidad) R.setCalidad('bajo'); return R.calidad && R.calidad.nivel; })()`, 15, false);
    console.log('· arranque: ' + await evaluar(cdp, ses, VUELO_JS, 30, true));
    console.log(`· volando ${MINS} min por el circuito…`);
    await cdp.bombear(MINS * 60);
    const ident = JSON.parse(await evaluar(cdp, ses, IDENT_JS, 60, true));
    res.ident = ident;
    console.log(`· escena: ${ident.total} mallas/puntos/lineas · sin nombre: ${ident.sinNombre} · geo ${ident.inf.geo} · heap ${ident.heap} MB · pos ${ident.pos}`);
    for (const f of ident.firmas.slice(0, 12)) {
      console.log(`  · ×${f.n} ${f.firma.t}/${f.firma.gt} mat=${f.firma.mt}${f.firma.mn ? ':' + f.firma.mn : ''}${f.firma.map ? ' map' : ''}${f.firma.tr ? ' transp' : ''} vis=${f.vis}${f.inst ? ' inst=' + f.inst : ''} verts=${f.verts}`);
      console.log(`      padres: ${f.ej.padres} · ej @ ${f.ej.pos}`);
    }
    const errores = await evaluar(cdp, ses, 'JSON.stringify((window.__aveErrores || []).slice(0, 8))', 10, false).catch(() => '[]');
    res.errores = JSON.parse(errores || '[]');
    try { await cdp.call('Target.closeTarget', { targetId: tid }, undefined, 10); } catch (e) { }
  } catch (e) {
    res.error = e && e.message || String(e);
    console.log('· FALLO: ' + res.error);
  }
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { matarChrome(chrome); }
  srv.close();
  const ruta = path.join(SALIDA, `nombres-${ETIQUETA}.json`);
  fs.writeFileSync(ruta, JSON.stringify(res, null, 2));
  console.log(`· resultado en ${ruta}`);
  process.exit(res.error ? 2 : 0);
})().catch(e => { console.error('FALLO:', e && e.stack || JSON.stringify(e) || String(e)); process.exit(2); });
