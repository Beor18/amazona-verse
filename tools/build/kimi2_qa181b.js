#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — QA-181: palanca «minimap marca()» (documentada por KIMI-140:
   game·marca ~7-9 % del hilo principal a CPU ×6 en Chromebook). El fix cachea cada marcador como sprite
   canvas rasterizado una vez y blitea por cuadro (src/game/minimapa.js).
   A/B en la MISMA sesión del probe:
     · BASE  (--antes): el servidor sirve src/game/minimapa.js del HEAD (código viejo, vía git show)
     · POST  (worktree): el archivo editado
   Medición 1 (micro): costo medio de un tick de minimapa forzado (pintar + texto, ~10 Hz reales).
   Medición 2 (perfil CDP 10 s caminando en círculo por la villa, CPU ×6): self-time de marca/dibujar/pintar.
   Medición 3: AV.minimapaTest() de regresión (ambas rondas).
   Perfil Chromebook 1366×768 @ DPR 1, CPU ×6, calidad «bajo», GPU real, cap1 sin bandera.
   Uso: node tools/build/kimi2_qa181b.js --etiqueta r1 [--cpu 6] [--secs 10] [--solo post|antes]
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

function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ETIQUETA = arg('--etiqueta', 'r1');
const CPU = parseInt(arg('--cpu', '6'), 10);
const SECS = parseInt(arg('--secs', '10'), 10);
const SOLO = arg('--solo', ''); // '', 'antes', 'post'
const PF = { w: 1366, h: 768, dpr: 1 }; // Chromebook escolar
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi181b'));
fs.mkdirSync(SALIDA, { recursive: true });
const LOGF = path.join(SALIDA, `k181b_${ETIQUETA}.log`);
fs.writeFileSync(LOGF, '');
function log(msg) { try { fs.appendFileSync(LOGF, `[${new Date().toISOString().slice(11, 19)}] ${msg}\n`); } catch (e) { } }
function guardar(res) { try { fs.writeFileSync(path.join(SALIDA, `k181b_${ETIQUETA}.json`), JSON.stringify(res, null, 1)); } catch (e) { } }

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi2q181b-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

// BASE: contenido viejo de minimapa.js desde HEAD (mi edición aún no se commitea)
let MINIMAPA_HEAD = null;
try { MINIMAPA_HEAD = execSync('git show HEAD:src/game/minimapa.js', { cwd: RAIZ, maxBuffer: 4 * 1024 * 1024 }).toString('utf8'); }
catch (e) { MINIMAPA_HEAD = null; log('aviso: no pude leer HEAD:src/game/minimapa.js (' + e.message + ')'); }

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir(usarHead) {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    if (usarHead && p === '/src/game/minimapa.js' && MINIMAPA_HEAD != null) {
      res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' });
      return res.end(MINIMAPA_HEAD);
    }
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); });
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
  if (r.exceptionDetails) { const d = r.exceptionDetails; throw new Error('JS@' + (d.lineNumber != null ? d.lineNumber + ':' + d.columnNumber : '?') + ': ' + JSON.stringify(d.exception && d.exception.description || d.text).slice(0, 900)); }
  return r.result ? r.result.value : undefined;
}

const SEMILLA_SAVE_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  window.__erroresConsola = [];
  addEventListener('error', e => __erroresConsola.push(String(e.message || e)));
  addEventListener('unhandledrejection', e => __erroresConsola.push('rechazo: ' + (e.reason && e.reason.message || e.reason)));
  const cerr = console.error; console.error = function () { try { __erroresConsola.push([].map.call(arguments, String).join(' ').slice(0, 300)); } catch (e) {} return cerr.apply(this, arguments); };
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi2q181b-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Brisa del Yunque', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;

const ENTRAR_JS = `(async () => { try { return await (async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene Jugar'; b.click();
    if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta'; }
  const S = window.AV && window.AV.state; if (!S || !S.profile || !S.profile.created) return 'sin perfil';
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(30000);
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 45000);
  const b = document.getElementById('c1-saltar'); if (b) b.click();
  await sleep(800);
  const f = document.getElementById('c1-fade'); if (f) f.remove();
  if (AV.G.ui && AV.G.ui.hideToast) AV.G.ui.hideToast();
  try { window.dispatchEvent(new PointerEvent('pointerdown')); } catch (e) {}
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

// Micro: costo medio de un tick forzado del minimapa (pintar + texto, vista y marcadores reales de la villa).
// Con --frutos N añade N frutos de prueba alrededor del jugador (estrés de marca(): el Banquete real llega a cientos).
const NFRUTOS = parseInt(arg('--frutos', '0'), 10);
const MICRO_JS = `(async () => { try { return await (async () => {
  const G = AV.G, sleep = ms => new Promise(r => setTimeout(r, ms));
  let M = G.minimapa;
  for (let i = 0; i < 100 && !M; i++) { await sleep(300); M = G.minimapa; }
  if (!M) return 'ERR sin minimapa';
  await sleep(1200); // deja que el relieve/flora se precalculen y el compacto se muestre
  if (${NFRUTOS} > 0) { const P = AV.state.pos, f = []; for (let i = 0; i < ${NFRUTOS}; i++) { const a = i * 0.63; f.push({ x: P.x + Math.cos(a) * (8 + (i % 5) * 6), z: P.z + Math.sin(a) * (8 + (i % 5) * 6) }); } M._dev.ext.frutos = f; }
  M.tick.forzar = true;
  const vis = !document.getElementById('minimapa').hidden;
  const nSpr0 = M._dev && M._dev.sprites ? M._dev.sprites() : -1;
  // calienta 20 ticks (crea los sprites) y mide 5 tandas de 120 para mediana robusta entre repintadas
  let ahora = performance.now();
  for (let i = 0; i < 20; i++) M.tick(ahora += 200);
  const tandas = [];
  for (let r = 0; r < 5; r++) {
    const t0 = performance.now();
    for (let i = 0; i < 120; i++) M.tick(ahora += 200);
    tandas.push(Math.round((performance.now() - t0) / 120 * 100) / 100);
  }
  tandas.sort((a, b) => a - b);
  const ms = tandas[2];
  M.tick.forzar = false;
  if (${NFRUTOS} > 0) M._dev.ext.frutos = undefined;
  const nSpr1 = M._dev && M._dev.sprites ? M._dev.sprites() : -1;
  return JSON.stringify({ msPorTick: ms, tandas, compactoVisible: vis, sprites: [nSpr0, nSpr1], marcas: M.marcadores().length });
})(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

// Perfil: caminar en círculo por la villa (W sintético + giro lento del rumbo) durante ${SECS} s con Profiler CDP.
const CAMINAR_JS = `(async () => { try { return await (async () => {
  const G = AV.G, S = AV.state, sleep = ms => new Promise(r => setTimeout(r, ms));
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', bubbles: true, cancelable: true }));
  const t0 = performance.now(); let gira = 0;
  const drv = setInterval(() => { try { gira += 0.45; S.facing = { x: Math.sin(gira), z: Math.cos(gira) }; } catch (e) {} }, 450);
  const deltas = []; let ult = performance.now(); let vivo = true;
  const marca = () => { if (!vivo) return; const a = performance.now(); deltas.push(a - ult); ult = a; requestAnimationFrame(marca); };
  requestAnimationFrame(marca);
  await sleep(${SECS * 1000});
  vivo = false; clearInterval(drv);
  window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w', bubbles: true, cancelable: true }));
  deltas.shift();
  const porSeg = []; let ac = 0, n = 0;
  for (const d of deltas) { ac += d; n++; if (ac >= 1000) { porSeg.push(Math.round(1000 / (ac / n))); ac = 0; n = 0; } }
  if (n > 5) porSeg.push(Math.round(1000 / (ac / n)));
  return JSON.stringify({ fpsPorSeg: porSeg.slice(0, ${SECS} + 2), fpsMed: porSeg.length ? Math.round(porSeg.reduce((s, x) => s + x, 0) / porSeg.length) : 0 });
})(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

function moduloDe(url, nombre) {
  if (!url) return nombre === '(program)' ? 'nativo' : 'anónima/sin-url';
  const u = String(url);
  if (u.includes('src/game/minimapa.js')) return 'minimapa';
  if (u.includes('src/engine/renderer.js')) return 'renderer';
  if (u.includes('src/engine/streaming.js')) return 'streaming';
  if (u.includes('src/engine/vegetacion.js')) return 'vegetacion';
  if (u.includes('src/engine/solidos.js')) return 'solidos';
  if (u.includes('src/engine/fisica.js')) return 'fisica';
  if (u.includes('src/engine/terreno.js')) return 'terreno';
  if (u.includes('src/engine/agua.js')) return 'agua';
  if (u.includes('src/engine/cielo.js')) return 'cielo';
  if (u.includes('src/engine/mundo.js')) return 'mundo';
  if (u.includes('src/engine/')) return 'engine/otro';
  if (u.includes('src/game/v18/')) return 'v18';
  if (u.includes('src/game/')) return 'game';
  if (u.includes('src/ui/')) return 'ui';
  if (u.includes('src/pruebas/') || u.includes('tests/')) return 'pruebas';
  if (u.includes('content/')) return 'content';
  if (u.includes('boot.js')) return 'boot';
  if (/three/i.test(u)) return 'three.js';
  return 'otro:' + u.split('/').slice(-2).join('/');
}
function atribuir(profile) {
  const nodos = new Map();
  for (const nd of profile.nodes || []) nodos.set(nd.id, nd);
  const porFuncion = {}, porModulo = {};
  const samples = profile.samples || [], deltas = profile.timeDeltas || [];
  for (let i = 0; i < samples.length; i++) {
    const dt = deltas[i] || 0;
    const nd = nodos.get(samples[i]);
    if (!nd) continue;
    const cf = nd.callFrame || {};
    const nombre = cf.functionName || '(anónima)';
    const mod = moduloDe(cf.url, nombre);
    const clave = mod + ' · ' + nombre;
    (porFuncion[clave] || (porFuncion[clave] = { selfUs: 0, hits: 0 })).selfUs += dt;
    (porModulo[mod] || (porModulo[mod] = { selfUs: 0, hits: 0 })).selfUs += dt;
  }
  return { porFuncion, porModulo, totalUs: deltas.reduce((s, x) => s + (x || 0), 0) };
}

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2q181b-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    `--window-size=${PF.w},${PF.h}`, 'about:blank'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 150; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools en 30 s: ' + err.slice(0, 300));
}
function mataPorPerfil() {
  try {
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi2q181b-*' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

async function ronda(res, nombre, usarHead) {
  const { srv, puerto } = await servir(usarHead);
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const out = { fuente: usarHead ? 'HEAD (minimapa.js viejo)' : 'worktree (sprites)' };
  try {
    log(`[${nombre}] lanzando Chrome (${out.fuente})...`);
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable', 'Profiler.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: PF.w, height: PF.h, deviceScaleFactor: PF.dpr, mobile: false }, ses);
    try { await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses); } catch (e) { }
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&v18=0` }, ses);
    const t0 = Date.now(); let listo = false;
    while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
      await cdp.bombear(0.5);
    }
    if (!listo) throw new Error('el juego no arrancó');
    const ent = await evaluar(cdp, ses, ENTRAR_JS, 120);
    if (!/^ok/.test(ent)) throw new Error('entrada: ' + ent);
    log(`[${nombre}] entrada ok; bajando a calidad «bajo» y asentando...`);
    await evaluar(cdp, ses, `(() => { const r = AV.G.renderer.setCalidad('bajo', true); return r && r.nivel; })()`, 30, false);
    await cdp.bombear(4);

    log(`[${nombre}] micro (tick forzado ×120)...`);
    const micro = await evaluar(cdp, ses, MICRO_JS, 90);
    if (/^ERR/.test(micro)) throw new Error('micro: ' + micro);
    out.micro = JSON.parse(micro);
    guardar(res);

    log(`[${nombre}] perfil caminando ${SECS} s (CPU ×${CPU})...`);
    await cdp.call('Profiler.start', {}, ses);
    let cam;
    try { cam = JSON.parse(await evaluar(cdp, ses, CAMINAR_JS, SECS + 60)); }
    catch (e) { cam = { error: String(e && e.message || e).slice(0, 300) }; }
    try {
      const prof = (await cdp.call('Profiler.stop', {}, ses, 90000)).profile;
      const atr = atribuir(prof);
      const top = Object.entries(atr.porFuncion).sort((a, b) => b[1].selfUs - a[1].selfUs).slice(0, 25)
        .map(([k, v]) => ({ funcion: k, selfMs: Math.round(v.selfUs / 1000), pct: Math.round(1000 * v.selfUs / atr.totalUs) / 10, hits: v.hits }));
      const mod = Object.entries(atr.porModulo).sort((a, b) => b[1].selfUs - a[1].selfUs)
        .map(([k, v]) => ({ modulo: k, selfMs: Math.round(v.selfUs / 1000), pct: Math.round(1000 * v.selfUs / atr.totalUs) / 10 }));
      out.perfil = { totalMs: Math.round(atr.totalUs / 1000), porModulo: mod, topFunciones: top };
    } catch (e) { out.perfilError = String(e && e.message || e).slice(0, 200); }
    out.caminar = cam;
    guardar(res);

    log(`[${nombre}] AV.minimapaTest() de regresión...`);
    try { out.minimapaTest = await evaluar(cdp, ses, `AV.minimapaTest().then(r => ({ passed: r.passed, total: r.total }))`, 120); }
    catch (e) { out.minimapaTest = { error: String(e && e.message || e).slice(0, 200) }; }
    try { out.erroresConsola = await evaluar(cdp, ses, `window.__erroresConsola ? window.__erroresConsola.slice(0, 20) : []`, 15); } catch (e) { out.erroresConsola = ['<no se pudo leer>']; }
    guardar(res);
  } catch (e) {
    out.error = String(e && e.stack || e).slice(0, 500);
    log(`[${nombre}] ERROR ${out.error}`);
  } finally {
    try { ws.close(); } catch (e) { }
    try { chrome.kill(); } catch (e) { }
    mataPorPerfil();
    try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
    try { srv.close(); } catch (e) { }
  }
  res.rondas[nombre] = out;
  return out;
}

(async () => {
  const res = { tarea: 'QA-181 palanca minimap marca()', bug: 'QA-181', etiqueta: ETIQUETA, pantalla: `chromebook ${PF.w}x${PF.h}@${PF.dpr} cpuX${CPU}`, calidad: 'bajo', secs: SECS, headBase: MINIMAPA_HEAD != null, rondas: {} };
  const watch = setInterval(() => { try { guardar(res); } catch (e) { } }, 5000);
  try {
    if (SOLO !== 'post') await ronda(res, 'antes', true);
    if (SOLO !== 'antes') await ronda(res, 'despues', false);
    const a = res.rondas.antes, d = res.rondas.despues;
    if (a && d && a.micro && d.micro) {
      res.delta = {
        msPorTick: Math.round((d.micro.msPorTick - a.micro.msPorTick) * 100) / 100,
        pctMicro: a.micro.msPorTick ? Math.round(1000 * (d.micro.msPorTick - a.micro.msPorTick) / a.micro.msPorTick) / 10 : null
      };
      const fA = (a.perfil && a.perfil.topFunciones) || [], fD = (d.perfil && d.perfil.topFunciones) || [];
      const busca = (f, n) => (f.find(x => x.funcion.indexOf(n) >= 0) || { selfMs: 0, pct: 0 });
      res.delta.marcaSelf = { antes: busca(fA, '· marca'), despues: busca(fD, '· marca') };
      res.delta.minimapaMod = { antes: busca(fA, 'minimapa'), despues: busca(fD, 'minimapa') };
    }
  } catch (e) {
    res.fatal = String(e && e.stack || e).slice(0, 600);
    log('FATAL ' + res.fatal);
  } finally {
    clearInterval(watch);
    guardar(res);
  }
  log('fin');
  process.exit(res.fatal ? 1 : 0);
})();
