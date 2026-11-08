#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — verificación POST-LANZAMIENTO del SITIO PUBLICADO.
   Tras el lanzamiento ea6d42c (7-nov 23:47 UTC, «no hay más publicaciones hoy») nadie había
   vuelto a mirar el despliegue real con GPU real (las dos revisiones pre-lanzamiento miraron
   14881101). Esta herramienta carga https://www.amazonaverse.com/juego/ en Chrome headless
   con la GPU real de la PC y comprueba que el juego publicado:
     - arranca y entra al cap. 1 (partida sembrada, sin creador) sin errores de consola;
     - no tiene peticiones fallidas (p. ej. los 404 de tex_hd/*_lq1024.jpg corregidos en el
       lanzamiento deben responder 200 en «bajo» móvil);
     - mide carga (s + bytes por cable con compresión), FPS, draw calls, tris y heap asentados;
     - identifica la build publicada (AV.G.build) para comparar con el commit de lanzamiento.
   Perfiles: --perfil escritorio (1600x900@1, CPU x1) | movil (390x844@3, CPU x4, touch, UA iOS).
   El juego NO se toca: solo lectura y API pública. Sin ?qa=1.
   Uso: node tools/build/kimi1_lanzamiento.js --etiqueta r1 [--perfil escritorio|movil|ambos]
        [--secs 12] [--url https://www.amazonaverse.com/juego/]
*/
'use strict';
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
const PERFILES = (arg('--perfil', 'ambos') === 'ambos' ? 'escritorio,movil' : arg('--perfil', 'ambos')).split(',');
const SECS = parseInt(arg('--secs', '12'), 10);
const URL_JUEGO = arg('--url', 'https://www.amazonaverse.com/juego/');
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi1lanz'));
fs.mkdirSync(SALIDA, { recursive: true });
const LOGF = path.join(SALIDA, `klanz_${ETIQUETA}.log`);
fs.writeFileSync(LOGF, '');
function log(msg) { try { fs.appendFileSync(LOGF, `[${new Date().toISOString().slice(11, 19)}] ${msg}\n`); } catch (e) { } console.log(msg); }
const res = { tarea: 'kimi1_lanzamiento', etiqueta: ETIQUETA, url: URL_JUEGO, perfiles: PERFILES, secs: SECS, head: null, perfilesRes: {} };
function guardar() { try { fs.writeFileSync(path.join(SALIDA, `klanz_${ETIQUETA}.json`), JSON.stringify(res, null, 1)); } catch (e) { } }

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi1klanz-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
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

// Semilla cap1 (mismo formato que kimi1_127): salta el creador y entra directo.
function semillaSave() {
  const save = {
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1klanz-' + Math.random().toString(36).slice(2, 10),
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

const MUESTRA_JS = `(async (durSec) => { try { return await (async () => {
  const G = AV.G, S = AV.state, sleep = ms => new Promise(r => setTimeout(r, ms));
  const ST = G.mundo && G.mundo.streaming;
  if (ST) { try { if (ST.alrededor) await ST.alrededor(S.pos.x, S.pos.z); } catch (e) {} try { if (ST.terminar) await ST.terminar(); } catch (e) {} }
  if (G.solidos && G.solidos.terminar) { try { G.solidos.terminar(); } catch (e) {} }
  await sleep(2000);
  const deltas = []; let ult = performance.now(); let vivo = true;
  const marca = () => { if (!vivo) return; const a = performance.now(); deltas.push(a - ult); ult = a; requestAnimationFrame(marca); };
  requestAnimationFrame(marca);
  const stats = []; const t0 = performance.now();
  while (performance.now() - t0 < durSec * 1000) {
    await sleep(1000);
    try { const st = G.renderer.stats(); const m = performance.memory;
      stats.push({ calls: st.calls, ktris: st.triangulos != null ? Math.round(st.triangulos / 1000) : null,
        fpsMedidor: st.fps, calidad: st.calidad, dpr: st.dpr,
        heapMB: m ? Math.round(m.usedJSHeapSize / 1048576) : null }); } catch (e) { stats.push(null); }
  }
  vivo = false; deltas.shift();
  const porSeg = []; let ac = 0, n = 0;
  for (const d of deltas) { ac += d; n++; if (ac >= 1000) { porSeg.push(Math.round(1000 / (ac / n))); ac = 0; n = 0; } }
  if (n > 5) porSeg.push(Math.round(1000 / (ac / n)));
  let med = null, medErr = null;
  try { med = (AV.look && typeof AV.look.medir === 'function') ? AV.look.medir() : null; } catch (e) { medErr = String(e && e.message || e).slice(0, 200); }
  const build = (() => { try { return (AV.G.build && (AV.G.build.commit || AV.G.build.id)) || null; } catch (e) { return null; } })();
  return JSON.stringify({ pos: [Math.round(S.pos.x * 10) / 10, Math.round(S.pos.z * 10) / 10], build,
    fpsPorSeg: porSeg, fpsMed: porSeg.length ? Math.round(porSeg.reduce((s, x) => s + x, 0) / porSeg.length) : null,
    fpsMin: porSeg.length ? Math.min.apply(null, porSeg) : null,
    peorMs: deltas.length ? Math.round(Math.max.apply(null, deltas)) : null,
    stats, med: med ? { calls: med.calls, triangulos: med.triangulos, texturasMB: med.texturasMB, geometrias: med.geometrias, heapMB: med.heapMB, fps: med.fps } : null, medErr,
    errores: (window.__erroresConsola || []).slice(0, 10) }); })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })`;

async function lanzarChrome(perfil) {
  const movil = perfil === 'movil';
  const ancho = movil ? 390 : 1600, alto = movil ? 844 : 900, dpr = movil ? 3 : 1;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1klanz-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    `--window-size=${ancho},${alto}`, '--force-device-scale-factor=' + dpr, 'about:blank'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 150; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim(), movil, ancho, alto, dpr }; }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools en 30 s: ' + err.slice(0, 300));
}
function mataPorPerfil() {
  try {
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi1klanz-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

async function perfilar(perfil) {
  const { chrome, perf, puerto, wsPath, movil, ancho, alto, dpr } = await lanzarChrome(perfil);
  const cpu = movil ? 4 : 1;
  const r = { pantalla: `${perfil} ${ancho}x${alto}@${dpr} cpuX${cpu}`, erroresConsola: [], fallosRed: [], texHd: { pedidos: 0, ok: 0, fallos: 0 }, bytesCable: 0 };
  try {
    const ws = new WebSocket(`ws://127.0.0.1:${puerto}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Network.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    // red: fallos (>=400 o carga fallida) + bytes por cable + conteo tex_hd
    cdp.ws.addEventListener('message', m => {
      let d; try { d = JSON.parse(m.data); } catch (e) { return; }
      if (d.method === 'Network.responseReceived') {
        const u = d.params.response.url, st = d.params.response.status;
        if (/tex_hd\//.test(u)) { r.texHd.pedidos++; if (st >= 400) { r.texHd.fallos++; r.fallosRed.push(st + ' ' + u.slice(0, 160)); } else r.texHd.ok++; }
        else if (st >= 400) r.fallosRed.push(st + ' ' + u.slice(0, 160));
      } else if (d.method === 'Network.loadingFailed') {
        const u = (d.params && d.params.errorText) || 'fallo';
        if (!/favicon/.test(u)) r.fallosRed.push('FAIL ' + u);
      } else if (d.method === 'Network.loadingFinished') {
        r.bytesCable += (d.params.encodedDataLength || 0);
      }
    });
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ancho, height: alto, deviceScaleFactor: dpr, mobile: movil }, ses);
    if (movil) {
      try { await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses); } catch (e) { }
      try { await cdp.call('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }, ses); } catch (e) { }
    }
    try { await cdp.call('Emulation.setCPUThrottlingRate', { rate: cpu }, ses); } catch (e) { }
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: semillaSave() }, ses);
    const t0 = Date.now();
    await cdp.call('Page.navigate', { url: URL_JUEGO }, ses);
    let listo = false;
    while (Date.now() - t0 < 240000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
      await cdp.bombear(0.5);
    }
    if (!listo) throw new Error('el juego no arrancó en 240 s');
    r.cargaListaS = Math.round((Date.now() - t0) / 100) / 10;
    const ent = await evaluar(cdp, ses, ENTRAR_JS, 150);
    if (!/^ok/.test(ent)) throw new Error('entrada: ' + ent);
    r.cargaEntradaS = Math.round((Date.now() - t0) / 100) / 10;
    log(`${perfil}: listo ${r.cargaListaS}s, entrada ${r.cargaEntradaS}s; muestreo ${SECS}s`);
    const m = JSON.parse(await evaluar(cdp, ses, `(${MUESTRA_JS})(${SECS})`, 120));
    r.muestra = m;
    if (!res.head && m.build) res.head = m.build;
    const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 60000);
    fs.writeFileSync(path.join(SALIDA, `klanz_${ETIQUETA}_${perfil}.jpg`), Buffer.from(shot.data, 'base64'));
    r.erroresConsola = (m.errores || []).slice(0, 10);
    r.bytesCableMB = Math.round(r.bytesCable / 1048576 * 10) / 10;
    delete r.bytesCable;
    log(`${perfil}: fpsMed ${m.fpsMed}, peor ${m.peorMs}ms, calls ${m.med ? m.med.calls : '?'}, errores ${r.erroresConsola.length}, fallosRed ${r.fallosRed.length}, texHd ${r.texHd.ok}/${r.texHd.pedidos} ok, ${r.bytesCableMB} MB por cable`);
    try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  } finally {
    try { chrome.kill(); } catch (e) { }
    try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  }
  return r;
}

(async () => {
  for (const perfil of PERFILES) {
    try { res.perfilesRes[perfil] = await perfilar(perfil); }
    catch (e) { res.perfilesRes[perfil] = { error: String(e && e.message || e).slice(0, 300) }; log(perfil + ' ERROR: ' + res.perfilesRes[perfil].error); }
    guardar();
  }
  guardar();
  const fallos = Object.values(res.perfilesRes).some(p => p.error || (p.fallosRed && p.fallosRed.length) || (p.erroresConsola && p.erroresConsola.length));
  console.log(fallos ? '· HAY FALLOS — revisar el JSON' : '· TODO LIMPIO en el sitio publicado');
  process.exit(0);
})().catch(e => { log('FATAL ' + (e && e.stack || e)); guardar(); process.exit(1); });
