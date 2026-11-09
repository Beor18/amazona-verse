#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-367: «¿La ciudad viva frena el juego?» (📣 coordinadora
   8-nov 23:40 UTC) + A/B del parche QA-182 «multitud adaptativa» (f33c7a1e).
   Plaza de la Ciudad de los 36 (POI kelvin_ruinas_yunque, donde hay más gente), perfil Chromebook
   (1366×768@1, CPU ×6, calidad baja, GPU real). Entrada real con save sembrado (sin ?qa=1), teleport
   a la plaza con la cámara al centro (mismo encuadre que la medida de ciudadVivaTest), asentado de
   streaming/sólidos y muestreo largo: rAF por cuadro (mediana/p95/p99, pausas >50 ms, fps por segundo)
   + stats 1/s (calls, ktris, fps del medidor, escuela, heap) + estado de la multitud adaptativa
   (objetivo, visibles, aves, bajadas/subidas) para ver la adaptación en vivo.
   El A/B se hace fuera, con swap de src/game/ciudad_viva.js (método KIMI-326):
     ON  = HEAD (parche QA-182 activo)   ·   OFF = ciudad_viva.js @ f33c7a1e^ (sin adaptación)
   Uso: node tools/build/kimi1_367.js --etiqueta k367-plaza-on-r1 [--cpu 6] [--secs 36]
        [--calidad bajo] [--url-extra escuela=1]
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
const ETIQUETA = arg('--etiqueta', 'k367-r1');
const CPU = parseInt(arg('--cpu', '6'), 10);
const SECS = parseInt(arg('--secs', '36'), 10);
const ANCHO = parseInt(arg('--ancho', '1366'), 10);
const ALTO = parseInt(arg('--alto', '768'), 10);
const DPR = parseFloat(arg('--dpr', '1'));
const CALIDAD = arg('--calidad', 'bajo');
const URL_EXTRA = arg('--url-extra', 'escuela=1');
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi127'));
fs.mkdirSync(SALIDA, { recursive: true });
const LOGF = path.join(SALIDA, `k127_${ETIQUETA}.log`);
fs.writeFileSync(LOGF, '');
function log(msg) { try { fs.appendFileSync(LOGF, `[${new Date().toISOString().slice(11, 19)}] ${msg}\n`); } catch (e) { } }
const res = { tarea: 'KIMI-367', etiqueta: ETIQUETA, pantalla: `chromebook ${ANCHO}x${ALTO}@${DPR} cpuX${CPU}`, calidad: CALIDAD, urlExtra: URL_EXTRA, secs: SECS, head: null };
function guardar() { try { fs.writeFileSync(path.join(SALIDA, `k127_${ETIQUETA}.json`), JSON.stringify(res, null, 1)); } catch (e) { } }

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi1k367-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
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

function semillaSave() {
  const save = {
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1k367-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  };
  return `try {
  localStorage.clear(); sessionStorage.clear();
  window.__erroresConsola = [];
  addEventListener('error', e => __erroresConsola.push(String(e.message || e)));
  addEventListener('unhandledrejection', e => __erroresConsola.push('rechazo: ' + (e.reason && e.reason.message || e.reason)));
  const cerr = console.error; console.error = function () { try { __erroresConsola.push([].map.call(arguments, String).join(' ').slice(0, 300)); } catch (e) {} return cerr.apply(this, arguments); };
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', ${JSON.stringify(JSON.stringify(save))});
} catch (e) {}`;
}

const ENTRAR_JS = `(async () => { try { return await (async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene Jugar'; b.click();
    if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta'; }
  const S = window.AV && window.AV.state; if (!S) return 'sin AV.state';
  if (!await espera(() => S.profile && S.profile.created, 45000)) return 'sin perfil';
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(30000);
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 60000);
  const b = document.getElementById('c1-saltar'); if (b) b.click();
  await sleep(800);
  const f = document.getElementById('c1-fade'); if (f) f.remove();
  if (AV.G.ui && AV.G.ui.hideToast) AV.G.ui.hideToast();
  try { window.dispatchEvent(new PointerEvent('pointerdown')); } catch (e) {}
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

// plaza de la Ciudad de los 36: teleport, asentado y muestreo largo con la multitud en vivo
const PLAZA_JS = `(async (durSec) => { try { return await (async () => {
  const G = AV.G, S = AV.state, sleep = ms => new Promise(r => setTimeout(r, ms));
  const T = G.pruebas;
  const POI = (G.terreno && G.terreno.pois && G.terreno.pois['kelvin_ruinas_yunque']) || null;
  if (!POI) return 'ERR sin POI kelvin_ruinas_yunque';
  const px = POI.x != null ? POI.x : POI.pos[0], pz = POI.z != null ? POI.z : POI.pos[2];
  T.teleport(px + 22, pz + 22); T.tick(0.05);
  if (AV.debug && AV.debug.camYaw) AV.debug.camYaw(Math.atan2(22, 22));
  const ST = G.mundo && G.mundo.streaming;
  if (ST && ST.alrededor) await ST.alrededor(px, pz).catch(() => {});
  if (G.solidos && G.solidos.terminar) { try { G.solidos.terminar(); } catch (e) {} }
  await sleep(3000);
  if (ST && ST.terminar) await ST.terminar().catch(() => {});
  if (G.solidos && G.solidos.terminar) { try { G.solidos.terminar(); } catch (e) {} }
  await sleep(2000);
  const CV = G.ciudadViva || null;
  const mult = () => { try { const m = CV && CV.multitud; return m ? { activa: !!m.activa(), objetivo: m.objetivo(), visibles: m.visibles(), aves: CV.aves().length, cuenta: m.cuenta() } : null; } catch (e) { return null; } };
  const deltas = []; let ult = performance.now(); let vivo = true;
  const marca = () => { if (!vivo) return; const a = performance.now(); deltas.push(a - ult); ult = a; requestAnimationFrame(marca); };
  requestAnimationFrame(marca);
  const stats = []; const t0 = performance.now();
  while (performance.now() - t0 < durSec * 1000) {
    await sleep(1000);
    try { const st = G.renderer.stats(); const m = performance.memory;
      stats.push({ calls: st.calls, ktris: st.triangulos != null ? Math.round(st.triangulos / 1000) : null,
        fpsMedidor: st.fps, calidad: st.calidad, dpr: st.dpr, escuela: st.escuela === true,
        heapMB: m ? Math.round(m.usedJSHeapSize / 1048576) : null, mult: mult() }); } catch (e) { stats.push(null); }
  }
  vivo = false; deltas.shift();
  const porSeg = []; let ac = 0, n = 0;
  for (const d of deltas) { ac += d; n++; if (ac >= 1000) { porSeg.push(Math.round(1000 / (ac / n))); ac = 0; n = 0; } }
  if (n > 5) porSeg.push(Math.round(1000 / (ac / n)));
  const orden = deltas.slice().sort((a, b) => a - b);
  const pct = p => orden.length ? Math.round(orden[Math.min(orden.length - 1, Math.floor(orden.length * p))]) : null;
  let pausas50 = 0; for (const d of deltas) { if (d > 50) pausas50++; }
  let med = null, medErr = null;
  try { med = (AV.look && typeof AV.look.medir === 'function') ? AV.look.medir() : null; } catch (e) { medErr = String(e && e.message || e).slice(0, 200); }
  return JSON.stringify({ poi: [Math.round(px), Math.round(pz)], pos: [Math.round(S.pos.x * 10) / 10, Math.round(S.pos.z * 10) / 10],
    fpsPorSeg: porSeg, fpsMed: porSeg.length ? Math.round(porSeg.reduce((s, x) => s + x, 0) / porSeg.length) : null,
    fpsMin: porSeg.length ? Math.min.apply(null, porSeg) : null,
    peorMs: deltas.length ? Math.round(Math.max.apply(null, deltas)) : null,
    medianaMs: pct(0.5), p95Ms: pct(0.95), p99Ms: pct(0.99), pausas50,
    stats, multFinal: mult(),
    med: med ? { calls: med.calls, triangulos: med.triangulos, texturasMB: med.texturasMB, geometrias: med.geometrias, heapMB: med.heapMB, fps: med.fps } : null, medErr,
    errores: (window.__erroresConsola || []).slice(0, 10) }); })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k367-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    `--window-size=${ANCHO},${ALTO}`, '--force-device-scale-factor=' + DPR, 'about:blank'];
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi1k367-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const watch = setInterval(() => { try { guardar(); } catch (e) { } log('…latido'); }, 5000);
  let tid = null;
  try {
    log('navegando con ?calidad=' + CALIDAD + (URL_EXTRA ? '&' + URL_EXTRA : '') + ' ...');
    const url = `${origen}/index.html?pack=cap1&mapa=real&calidad=${CALIDAD}${URL_EXTRA ? '&' + URL_EXTRA : ''}`;
    if (tid) { await cdp.call('Target.closeTarget', { targetId: tid }).catch(() => { }); tid = null; }
    tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: false }, ses);
    try { await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses); } catch (e) { }
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: semillaSave() }, ses);
    const t0 = Date.now();
    await cdp.call('Page.navigate', { url }, ses);
    let listo = false;
    while (Date.now() - t0 < Math.max(CFG.espera_listo_s || 150, 240) * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
      await cdp.bombear(0.5);
    }
    if (!listo) throw new Error('el juego no arrancó');
    res.cargaListaS = Math.round((Date.now() - t0) / 10) / 100;
    const ent = await evaluar(cdp, ses, ENTRAR_JS, 150);
    if (!/^ok/.test(ent)) throw new Error('entrada: ' + ent);
    res.cargaEntradaS = Math.round((Date.now() - t0) / 10) / 100;
    res.head = await evaluar(cdp, ses, `(() => { try { return (AV.G.build && (AV.G.build.commit || AV.G.build.id)) || 'desconocido'; } catch (e) { return 'desconocido'; } })()`, 10);
    log(`listo en ${res.cargaListaS}s, entrada en ${res.cargaEntradaS}s; plaza: muestreo ${SECS}s`);
    const m = JSON.parse(await evaluar(cdp, ses, `(${PLAZA_JS})(${SECS})`, SECS + 120));
    if (typeof m === 'string' && /^ERR/.test(m)) throw new Error(m);
    res.plaza = m;
    guardar();
    const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 60000);
    fs.writeFileSync(path.join(SALIDA, `k127_${ETIQUETA}_plaza.jpg`), Buffer.from(shot.data, 'base64'));
    const st = (m.stats || []).filter(Boolean);
    const calls = st.map(x => x.calls).filter(x => x != null), kt = st.map(x => x.ktris).filter(x => x != null);
    const mult = st.map(x => x.mult).filter(Boolean);
    const vis = mult.map(x => x.visibles).filter(x => x != null);
    log(`plaza fpsMed=${m.fpsMed} min=${m.fpsMin} peorMs=${m.peorMs} mediana=${m.medianaMs} p95=${m.p95Ms} p99=${m.p99Ms} pausas50=${m.pausas50}` +
      ` calls=${calls.length ? Math.round(calls.reduce((a, b) => a + b, 0) / calls.length) : '?'} ktris=${kt.length ? Math.round(kt.reduce((a, b) => a + b, 0) / kt.length) : '?'}` +
      ` aves=${vis.length ? Math.min.apply(null, vis) + '-' + Math.max.apply(null, vis) : '?'} errores=${JSON.stringify(m.errores || [])}`);
  } catch (e) {
    res.error = String(e && e.message || e).slice(0, 400);
    log('ERROR ' + res.error);
    guardar();
  } finally {
    clearInterval(watch);
    guardar();
    if (tid) await cdp.call('Target.closeTarget', { targetId: tid }).catch(() => { });
    try { chrome.kill(); } catch (e) { }
    mataPorPerfil();
    srv.close();
    log('evidencia: ' + path.join(SALIDA, `k127_${ETIQUETA}.json`));
    console.log('· JSON: ' + path.join(SALIDA, `k127_${ETIQUETA}.json`));
    process.exit(res.error ? 1 : 0);
  }
})().catch(e => { console.error('FALLO:', e.message); try { mataPorPerfil(); } catch (e2) { } process.exit(1); });
