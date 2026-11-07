#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — QA-200: repro HONESTO de la explosión de la cola de
   streaming: hambruna del hilo inducida (bloqueo síncrono de 20 s = análogo de una interrupción
   de iOS / tormenta de GC en un móvil lento; las descargas en vuelo aterrizan durante el bloqueo
   y sus continuaciones estallan al reanudarse), con la cola y los fps muestreados hasta recuperar.
   A/B del modo recuperación de streaming.js (?colagrande=): base = umbral imposible (desactivado),
   post = CFG.colaGrande normal. Sin ?v18=1 (la bomba es la de la estable).
   Uso: node tools/build/kimi3_qa200.js --etiqueta r1 [--cpu 4] [--bloqueo-s 20] [--tope-s 180] */
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
const CPU = parseInt(arg('--cpu', '4'), 10);
const BLOQUEO_S = parseInt(arg('--bloqueo-s', '20'), 10);
const TOPE_S = parseInt(arg('--tope-s', '180'), 10);
const ANCHO = 390, ALTO = 844, DPR = 3;
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi200'));
fs.mkdirSync(SALIDA, { recursive: true });

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi3q200-/.test(d)) continue;
  try { const st = fs.statSync(path.join(os.tmpdir(), d)); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(path.join(os.tmpdir(), d), { recursive: true, force: true }); } catch (e) { }
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
  if (r.exceptionDetails) { const d = r.exceptionDetails; throw new Error('JS@' + (d.lineNumber != null ? d.lineNumber + ':' + d.columnNumber : '?') + ': ' + JSON.stringify(d.exception && d.exception.description || d.text).slice(0, 600)); }
  return r.result ? r.result.value : undefined;
}

const SEMILLA_SAVE_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi3q200-' + Math.random().toString(36).slice(2, 10),
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
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

// muestreador de cuadros in-page (deltas de rAF); se instala antes del bloqueo y se reinicia justo antes
const INSTALAR_SAMPLer_JS = `(() => { if (window.__qa200) return 'ya'; window.__qa200 = { deltas: [], ult: 0 };
  (function sam() { const a = window.__qa200; const n = performance.now(); if (a.ult) { a.deltas.push(n - a.ult); if (a.deltas.length > 2400) a.deltas.shift(); } a.ult = n; requestAnimationFrame(sam); })();
  return 'ok'; })()`;
const REINICIAR_SAMPLER_JS = `(() => { const a = window.__qa200; if (!a) return 'sin sampler'; a.deltas.length = 0; a.ult = 0; return 'ok'; })()`;
const MUESTRA_JS = `(() => { const AV = window.AV, G = AV.G; const st = G.mundo.streaming.stats();
  const a = window.__qa200; const d = a ? a.deltas.slice(-90) : [];
  const s = [...d].sort((x, y) => x - y);
  return JSON.stringify({ t: Math.round(performance.now()), trabajos: st.trabajos, descargando: st.descargando,
    recuperacion: !!st.recuperacion,
    fps: d.length > 5 ? Math.round(1000 / (s[Math.floor(s.length * 0.5)] || 16)) : null,
    p95ms: d.length > 5 ? Math.round(s[Math.floor(s.length * 0.95)]) : null,
    maxms: d.length ? Math.round(Math.max.apply(null, d)) : null }); })()`;

// ruta de 3 teleports lejanos + cargarTodo en cada uno: amplitud máxima de descargas/trabajos SIN drenar
// (esperas cortas a propósito: lo que complete en la ventana se suma a la cola; el bloqueo congela el resto)
const ARMAR_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
  const ST = G.mundo && G.mundo.streaming;
  for (const [vx, vz] of [[-33, -136], [-91, 84], [150, 222]]) {
    const vy = Math.max(G.terreno.height(vx, vz) + 25, 25);
    S.pos.x = vx; S.pos.z = vz; S.pos.y = vy; S.vy = 0;
    G.fisica.MOVE.flying = true; G.fisica.MOVE.landing = false;
    if (ST && ST.cargarTodo) ST.cargarTodo();
    await sleep(350);
  }
  return 'ok ' + JSON.stringify({ descargando: ST.stats().descargando, trabajos: ST.stats().trabajos }); })()`;

// bloqueo síncrono del hilo principal = análogo de interrupción de iOS / tormenta de GC
const BLOQUEO_JS = `(() => { const t = Date.now(); let x = 0.5; while (Date.now() - t < ${BLOQUEO_S * 1000}) { x = Math.sqrt(x + 1); } return 'desbloqueado ' + (x | 0); })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3q200-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    `--window-size=${ANCHO},${ALTO}`, 'about:blank'];
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi3q200-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

// una pasada completa: navega, entra, asienta, instala sampler, arma descargas, bloquea y muestrea la recuperación
async function pasada(cdp, ses, origen, colagrande, nombre) {
  const r = { colagrande, muestras: [] };
  await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&calidad=bajo&colagrande=${colagrande}` }, ses);
  const t0 = Date.now(); let listo = false;
  while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
    try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
    await cdp.bombear(0.5);
  }
  if (!listo) throw new Error(nombre + ': el juego no arrancó');
  const ent = await evaluar(cdp, ses, ENTRAR_JS, 120);
  if (!/^ok/.test(ent)) throw new Error(nombre + ': entrada: ' + ent);
  // asentado: cola de trabajos calmada (en «bajo» junto a la ciudad la villa chisporrotea siempre:
  // descargando 2-6 perpetuo por diseño QA-158 — no exigimos 0, solo que la bomba haya drenado)
  const asentado = await evaluar(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms));
    const ST = AV.G.mundo.streaming; const t0 = performance.now();
    while (performance.now() - t0 < 90000) { const s = ST.stats(); if (s.trabajos <= 25) return 'ok ' + Math.round(performance.now() - t0) + ' trabajos=' + s.trabajos + ' desc=' + s.descargando; await sleep(400); }
    return 'no asentó en 90 s: trabajos=' + ST.stats().trabajos + ' desc=' + ST.stats().descargando; })()`, 105);
  r.asentado = asentado;
  if (!/^ok/.test(asentado)) throw new Error(nombre + ': ' + asentado);
  await evaluar(cdp, ses, INSTALAR_SAMPLer_JS, 10);
  const armar = await evaluar(cdp, ses, ARMAR_JS, 30);
  r.armar = armar;
  const preBloqueo = JSON.parse(await evaluar(cdp, ses, MUESTRA_JS, 15));
  r.preBloqueo = preBloqueo;
  await evaluar(cdp, ses, REINICIAR_SAMPLER_JS, 10);
  // bloqueo: el eval tarda BLOQUEO_S en devolver (el hilo principal está ocupado; es lo buscado)
  const tb = Date.now();
  const desb = await evaluar(cdp, ses, BLOQUEO_JS, BLOQUEO_S + 60, false);
  r.bloqueo = { duracionRealS: Math.round((Date.now() - tb) / 100) / 10, resultado: String(desb).slice(0, 60) };
  const tFinBloqueo = Date.now();
  // muestreo de la recuperación
  let recuperadoEn = null, cerosSeguidos = 0, ceroEn = null, pico = 0;
  const tM0 = Date.now();
  while (Date.now() - tM0 < TOPE_S * 1000) {
    const m = JSON.parse(await evaluar(cdp, ses, MUESTRA_JS, 20));
    m.seg = Math.round((Date.now() - tFinBloqueo) / 100) / 10;
    r.muestras.push(m);
    if (m.trabajos > pico) pico = m.trabajos;
    if (recuperadoEn === null && m.trabajos < 100) recuperadoEn = m.seg;
    if (m.trabajos <= 25 && m.descargando <= 8) { if (++cerosSeguidos >= 2) { if (ceroEn === null) ceroEn = m.seg; break; } }
    else cerosSeguidos = 0;
    if (m.recuperacion) r.vioRecuperacion = true;
    await cdp.bombear(0.5);
  }
  r.picoTrabajos = pico;
  r.recuperado100EnS = recuperadoEn;
  r.colaVaciaEnS = ceroEn;
  const errores = await evaluar(cdp, ses, `(window.__aveErrores || []).length`, 10, false);
  r.erroresConsola = errores;
  return r;
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const res = { etiqueta: ETIQUETA, pantalla: `${ANCHO}x${ALTO}@${DPR} cpuX${CPU}`, bloqueoS: BLOQUEO_S, topeS: TOPE_S, pasadas: {} };
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
    if (CPU > 1) { try { await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses); } catch (e) { } }
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);

    // dos pasadas: base = palanca imposible; post = umbral de sonda 150 (el burst ~250 lo cruza y dispara la palanca;
    // la inertitud del umbral de producción 2500 con este burst ya quedó medida en r2: post-prod no disparó y fue idéntico a base)
    for (const [nombre, colagrande] of [['base', 999999999], ['post', 150]]) {
      try {
        console.log(`[${nombre}] colagrande=${colagrande} …`);
        const r = await pasada(cdp, ses, origen, colagrande, nombre);
        res.pasadas[nombre] = r;
        console.log(`[${nombre}] picoTrabajos=${r.picoTrabajos} recuperado<100 en ${r.recuperado100EnS}s · cola vacía en ${r.colaVaciaEnS}s · recuperación=${!!r.vioRecuperacion} · errores=${r.erroresConsola}`);
      } catch (e) {
        res.pasadas[nombre] = { error: String(e && e.message || e).slice(0, 300) };
        console.log(`[${nombre}] ERROR ${res.pasadas[nombre].error}`);
      }
    }
  } catch (e) {
    res.error = String(e && e.message || e).slice(0, 400);
    console.error('ERROR: ' + res.error);
  } finally {
    fs.writeFileSync(path.join(SALIDA, `k200_${ETIQUETA}.json`), JSON.stringify(res, null, 1));
    try { ws.close(); } catch (e) { }
    try { chrome.kill(); } catch (e) { }
    mataPorPerfil();
    try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
    srv.close();
  }
  console.log('evidencia en ' + SALIDA);
})();
