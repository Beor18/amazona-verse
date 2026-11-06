#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-144: QA-181 palanca 2/3 «layout thrash del HUD (getClientRects)».
   La atribución de KIMI-140 (área río/puente, Chromebook ×6) midió getClientRects ~8 % del hilo. Esta sonda
   atribuye el caller EXACTO: perfil CDP 12 s quieto en el área río/puente (sin bandera, cap1) y reconstruye
   las PILAS que llegan a getClientRects/getBoundingClientRect/getComputedStyle (no basta el self-time).
   Chromebook 1366×768 @ DPR 1, CPU ×6, calidad «bajo», GPU real. El juego no se toca.
   Uso: node tools/build/kimi2_k144.js --etiqueta r1 [--cpu 6] [--secs 12]
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
const SECS = parseInt(arg('--secs', '12'), 10);
const PX = parseFloat(arg('--x', '165')), PZ = parseFloat(arg('--z', '131'));
const ANTES = process.argv.indexOf('--antes') > 0;
// --antes: sirve src/game/guia_controles.js TAL CUAL en HEAD (A/B contra el worktree en la misma sesión)
let GUIA_HEAD = null;
if (ANTES) { try { GUIA_HEAD = execSync('git show HEAD:src/game/guia_controles.js', { cwd: RAIZ, maxBuffer: 4e6 }).toString(); } catch (e) { GUIA_HEAD = null; } }
const PF = { w: 1366, h: 768, dpr: 1 };
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi144'));
fs.mkdirSync(SALIDA, { recursive: true });
const LOGF = path.join(SALIDA, `k144_${ETIQUETA}.log`);
fs.writeFileSync(LOGF, '');
function log(msg) { try { fs.appendFileSync(LOGF, `[${new Date().toISOString().slice(11, 19)}] ${msg}\n`); } catch (e) { } }
function guardar(res) { try { fs.writeFileSync(path.join(SALIDA, `k144_${ETIQUETA}.json`), JSON.stringify(res, null, 1)); } catch (e) { } }

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi2k144-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    if (ANTES && GUIA_HEAD && p === '/src/game/guia_controles.js') { res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' }); return res.end(GUIA_HEAD); }
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
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
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi2k144-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
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

const PREP_JS = `(async () => { try { return await (async () => {
  const G = AV.G, S = AV.state, sleep = ms => new Promise(r => setTimeout(r, ms));
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(120); } return false; };
  if (!await espera(() => G.mundo && G.mundo.listo, 90000)) return 'ERR mundo no listo';
  try { window.dispatchEvent(new PointerEvent('pointerdown')); } catch (e) {}
  window.__k144 = {
    G, S, sleep, espera,
    ir(x, z) { S.pos.x = x; S.pos.z = z; try { S.pos.y = G.terreno.height(x, z) + 0.6; } catch (e) {} if (G.fisica && G.fisica.MOVE) { G.fisica.MOVE.vx = G.fisica.MOVE.vz = 0; } },
    statsST() { try { const ST = G.mundo && G.mundo.streaming; return ST && ST.stats ? ST.stats() : null; } catch (e) { return null; } },
    async asentar(msMax) {
      const t0 = performance.now(); let quietas = 0, visto = 0;
      while (performance.now() - t0 < (msMax || 30000)) {
        const st = this.statsST(); const t = st ? st.trabajos : -1, d = st ? st.descargando : -1;
        if (st) visto++;
        if (t === 0 && d === 0) { if (++quietas >= 2) break; } else quietas = 0;
        await sleep(1000);
      }
      await sleep(1000);
      const fin = this.statsST();
      return { trabajos: fin ? fin.trabajos : null, descargando: fin ? fin.descargando : null, vistoST: visto };
    },
    async muestra(durSec) {
      const deltas = []; let ult = performance.now(); let vivo = true;
      const marca = () => { if (!vivo) return; const a = performance.now(); deltas.push(a - ult); ult = a; requestAnimationFrame(marca); };
      requestAnimationFrame(marca);
      const stats = []; const t0 = performance.now();
      while (performance.now() - t0 < durSec * 1000) {
        await sleep(1000);
        try { const st = G.renderer.stats(); stats.push({ calls: st.calls, tris: st.triangulos, fpsMedidor: st.fps, dpr: st.dpr }); } catch (e) { stats.push(null); }
      }
      vivo = false;
      deltas.shift();
      const porSeg = []; let ac = 0, n = 0;
      for (const d of deltas) { ac += d; n++; if (ac >= 1000) { porSeg.push(Math.round(1000 / (ac / n))); ac = 0; n = 0; } }
      if (n > 5) porSeg.push(Math.round(1000 / (ac / n)));
      const orden = deltas.slice().sort((a, b) => a - b);
      const med = a => a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : 0;
      return { fpsPorSeg: porSeg, fpsMed: med(porSeg), fpsMin: porSeg.length ? Math.min.apply(null, porSeg) : 0,
        peorMs: deltas.length ? Math.round(Math.max.apply(null, deltas)) : 0,
        p95Ms: orden.length ? Math.round(orden[Math.min(orden.length - 1, Math.floor(orden.length * 0.95))]) : 0,
        stats, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null };
    }
  };
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

function moduloDe(url, nombre) {
  if (!url) return nombre === '(program)' ? 'nativo' : 'anónima/sin-url';
  const u = String(url);
  if (u.includes('src/engine/renderer.js')) return 'renderer';
  if (u.includes('src/engine/streaming.js')) return 'streaming';
  if (u.includes('src/engine/vegetacion.js')) return 'vegetacion';
  if (u.includes('src/engine/solidos.js')) return 'solidos';
  if (u.includes('src/engine/fisica.js')) return 'fisica';
  if (u.includes('src/engine/terreno.js')) return 'terreno';
  if (u.includes('src/engine/agua.js')) return 'agua';
  if (u.includes('src/engine/cielo.js')) return 'cielo';
  if (u.includes('src/engine/assets.js')) return 'assets';
  if (u.includes('src/engine/mundo.js')) return 'mundo';
  if (u.includes('src/engine/ui.js')) return 'ui';
  if (u.includes('src/engine/')) return 'engine/otro';
  if (u.includes('src/game/minimapa.js')) return 'minimapa';
  if (u.includes('src/game/dialogo.js')) return 'dialogo';
  if (u.includes('src/game/guia_controles.js')) return 'guia_controles';
  if (u.includes('src/game/juice.js')) return 'juice';
  if (u.includes('src/game/')) return 'game';
  if (u.includes('src/ui/')) return 'ui';
  if (u.includes('src/pruebas/') || u.includes('tests/')) return 'pruebas';
  if (u.includes('content/')) return 'content';
  if (u.includes('boot.js')) return 'boot';
  if (/three/i.test(u)) return 'three.js';
  return 'otro:' + u.split('/').slice(-2).join('/');
}

// self-time por función y por módulo reconstruido desde samples + timeDeltas (método kimi3_calor.js)
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
  return { porFuncion, porModulo, totalUs: deltas.reduce((s, x) => s + (x || 0), 0), nodos };
}

// Pilas (rutas raíz→nodo) que contienen funciones de layout: reconstruye padres desde children.
function pilasALayout(profile, nodos) {
  const padre = new Map();
  for (const nd of profile.nodes || []) for (const c of nd.children || []) padre.set(c, nd.id);
  const esLayout = n => {
    const f = ((n.callFrame && n.callFrame.functionName) || '').toLowerCase();
    return f.includes('clientrect') || f.includes('clientwidth') || f.includes('clientheight') ||
      f.includes('offsetwidth') || f.includes('offsetheight') || f.includes('getcomputedstyle');
  };
  const rutas = [];
  for (const nd of profile.nodes || []) {
    if (!esLayout(nd)) continue;
    // sube hasta la raíz y baja anotando los frames JS (máx 14)
    const ids = []; let cur = nd.id, guard = 0;
    while (cur != null && guard++ < 40) { ids.unshift(cur); const p = padre.get(cur); if (p == null) break; cur = p; }
    const frames = ids.map(id => {
      const n = nodos.get(id); if (!n) return '?';
      const cf = n.callFrame || {};
      const nom = cf.functionName || '(anónima)';
      const url = String(cf.url || '');
      const linea = cf.lineNumber != null ? ':' + (cf.lineNumber + 1) : '';
      return moduloDe(url, nom) + ' · ' + nom + (url && !url.includes('native') ? linea : '');
    });
    rutas.push({ hoja: ((nd.callFrame || {}).functionName || '?'), profundidad: ids.length, pila: frames });
    if (rutas.length >= 40) break;
  }
  // frecuencia por par (llamador→layout): el frame justo encima de la hoja es el que invoca
  const porPar = {};
  for (const r of rutas) {
    const invoca = r.pila.length >= 2 ? r.pila[r.pila.length - 2] : '(raíz)';
    const k = invoca + ' → ' + r.hoja;
    porPar[k] = (porPar[k] || 0) + 1;
  }
  return { rutas: rutas.slice(0, 20), porPar };
}

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2k144-'));
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi2k144-*' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const res = { tarea: 'KIMI-144', bug: 'QA-181', etiqueta: ETIQUETA, antes: ANTES, pantalla: `chromebook ${PF.w}x${PF.h}@${PF.dpr} cpuX${CPU}`, calidad: 'bajo', v18: false, area: [PX, PZ], secs: SECS, head: null };
  const watch = setInterval(() => { try { guardar(res); } catch (e) { } log('…latido'); }, 5000);
  try {
    log('lanzando Chrome y entrando al juego (cap1, sin bandera)...');
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable', 'Profiler.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: PF.w, height: PF.h, deviceScaleFactor: PF.dpr, mobile: false }, ses);
    try { await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses); } catch (e) { }
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real` }, ses);
    const t0 = Date.now(); let listo = false;
    while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
      await cdp.bombear(0.5);
    }
    if (!listo) throw new Error('el juego no arrancó');
    log('juego listo, entrando...');
    const ent = await evaluar(cdp, ses, ENTRAR_JS, 120);
    if (!/^ok/.test(ent)) throw new Error('entrada: ' + ent);
    const prep = await evaluar(cdp, ses, PREP_JS, 180);
    if (!/^ok/.test(prep)) throw new Error('prep: ' + prep);
    log('prep ok');
    try { res.head = await evaluar(cdp, ses, `fetch('sw.js?v=' + Date.now(), {cache:'no-store'}).then(r=>r.status).catch(()=>0)`, 15); } catch (e) { }

    await evaluar(cdp, ses, `(() => { const r = AV.G.renderer.setCalidad('bajo', true); return r && r.nivel; })()`, 30, false);
    log(`teleport al área río/puente (${PX},${PZ}) y asentando...`);
    const asent = JSON.parse(await evaluar(cdp, ses, `(async () => { const K = window.__k144; K.ir(${PX}, ${PZ}); return JSON.stringify(await K.asentar(60000)); })()`, 120));
    res.asentado = asent;
    log('asentado ' + JSON.stringify(asent));

    log(`perfilando ${SECS} s quieto...`);
    await cdp.call('Profiler.start', {}, ses);
    let r;
    try { r = JSON.parse(await evaluar(cdp, ses, `(async () => { const K = window.__k144; return JSON.stringify(await K.muestra(${SECS})); })()`, 180)); }
    catch (e) { r = { error: String(e && e.message || e).slice(0, 300) }; }
    try {
      const prof = (await cdp.call('Profiler.stop', {}, ses, 90000)).profile;
      const atr = atribuir(prof);
      const top = Object.entries(atr.porFuncion).sort((a, b) => b[1].selfUs - a[1].selfUs).slice(0, 30)
        .map(([k, v]) => ({ funcion: k, selfMs: Math.round(v.selfUs / 1000), hits: v.hits }));
      const mod = Object.entries(atr.porModulo).sort((a, b) => b[1].selfUs - a[1].selfUs)
        .map(([k, v]) => ({ modulo: k, selfMs: Math.round(v.selfUs / 1000), pct: Math.round(1000 * v.selfUs / atr.totalUs) / 10 }));
      r.perfil = { totalMs: Math.round(atr.totalUs / 1000), porModulo: mod, topFunciones: top };
      // ¿cuánto self-time hay en funciones de layout?
      let layoutUs = 0; const detalle = [];
      for (const [k, v] of Object.entries(atr.porFuncion)) {
        if (/clientrect|clientwidth|clientheight|offsetwidth|offsetheight|getcomputedstyle/i.test(k)) { layoutUs += v.selfUs; detalle.push({ funcion: k, selfMs: Math.round(v.selfUs / 1000), hits: v.hits }); }
      }
      r.layout = { selfMs: Math.round(layoutUs / 1000), pct: Math.round(1000 * layoutUs / atr.totalUs) / 10, detalle };
      r.pilasLayout = pilasALayout(prof, atr.nodos);
    } catch (e) { r.perfilError = String(e && e.message || e).slice(0, 200); }
    res.medicion = r;
    guardar(res);
    log(`fpsMed=${r.fpsMed} calls=${r.stats && r.stats.length && r.stats[r.stats.length - 1] && r.stats[r.stats.length - 1].calls} layout=${r.layout && r.layout.selfMs} ms (${r.layout && r.layout.pct} %)`);
    try { res.erroresConsola = await evaluar(cdp, ses, `window.__erroresConsola ? window.__erroresConsola.slice(0, 20) : []`, 15); } catch (e) { res.erroresConsola = ['<no se pudo leer>']; }
    guardar(res);
  } catch (e) {
    res.fatal = String(e && e.stack || e).slice(0, 600);
    log('FATAL ' + res.fatal);
    guardar(res);
  } finally {
    clearInterval(watch);
    try { ws.close(); } catch (e) { }
    try { chrome.kill(); } catch (e) { }
    mataPorPerfil();
    try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
    try { srv.close(); } catch (e) { }
  }
  log('fin');
  process.exit(res.fatal ? 1 : 0);
})();
