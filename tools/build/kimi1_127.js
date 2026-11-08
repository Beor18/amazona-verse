#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-127 (reparto 1d): «Chromebook escolar simulado».
   Nunca medido: Chrome con CPU ×6 y ventana 1366×768, calidad baja, GPU real:
     A) las 6 villas: para cada capítulo (cap1..ep6) partida sembrada sin creador en su almacén
        (amazonaverse.save v6 / <pack>.save v1), entrada real, y en el SPAWN natural:
        carga (s hasta listo y hasta entrar), FPS por segundo (rAF) 12 s quieta, draw calls,
        triángulos, heap, look.medir() y captura;
     B) la demo ?v18=1 (cap1, progreso v18 fiel con vittata seleccionada): escenarios
        base explanada / duelo con la Campeana (API pública) / Sombra de Tormenta (API pública,
        poderes cada 0,9 s) / puente colgante, 10 s cada uno, FPS + calls/tris + capturas.
   El juego NO se toca: solo lectura y API pública. Sin ?qa=1 (la batería concurrente
   contamina el FPS, KIMI-052). Veredicto: propuesta de calidad «escuela» si algo < 25 FPS.
   Uso: node tools/build/kimi1_127.js --etiqueta cb-r1 [--cpu 6] [--secs 12] [--packs cap1,ep2,...]
        [--sin-demo] [--calidad bajo] [--iphone] (KIMI-165: iPhone emulado 390×844 dpr 3,
        CPU ×4, touch + UA iOS; pack cap1 solo; la demo en --calidad bajo|medio)
       [--url-extra escuela=1] (KIMI-318: extra de URL en villas y demo, p. ej. Modo Escuela)
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
const IPHONE = process.argv.includes('--iphone'); // KIMI-165: perfil iPhone emulado (390×844 dpr 3, CPU ×4, touch + UA iOS)
const ETIQUETA = arg('--etiqueta', 'cb-r1');
const CPU = parseInt(arg('--cpu', IPHONE ? '4' : '6'), 10);
const SECS = parseInt(arg('--secs', '12'), 10);
const ANCHO = parseInt(arg('--ancho', IPHONE ? '390' : '1366'), 10);
const ALTO = parseInt(arg('--alto', IPHONE ? '844' : '768'), 10);
const DPR = parseFloat(arg('--dpr', IPHONE ? '3' : '1'));
const PACKS = arg('--packs', IPHONE ? 'cap1' : 'cap1,ep2,ep3,ep4,ep5,ep6').split(',');
const CON_DEMO = !process.argv.includes('--sin-demo');
const CALIDAD = arg('--calidad', 'bajo'); // KIMI-165: la demo se pidió en «bajo» y «medio»
const URL_EXTRA = arg('--url-extra', ''); // KIMI-318: p. ej. el parámetro del Modo Escuela cuando Kimi 3 lo aterrice
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi127'));
fs.mkdirSync(SALIDA, { recursive: true });
const LOGF = path.join(SALIDA, `k127_${ETIQUETA}.log`);
fs.writeFileSync(LOGF, '');
function log(msg) { try { fs.appendFileSync(LOGF, `[${new Date().toISOString().slice(11, 19)}] ${msg}\n`); } catch (e) { } }
const res = { tarea: 'KIMI-127', etiqueta: ETIQUETA, pantalla: `${IPHONE ? 'iphone' : 'chromebook'} ${ANCHO}x${ALTO}@${DPR} cpuX${CPU}`, calidad: CALIDAD, packs: PACKS, demo: CON_DEMO, head: null };
function guardar() { try { fs.writeFileSync(path.join(SALIDA, `k127_${ETIQUETA}.json`), JSON.stringify(res, null, 1)); } catch (e) { } }

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi1k127-/.test(d)) continue;
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

// Semilla por pack: clave y versión del guardado del pack (ep5 confirmado en KIMI-126;
// ep2/ep3 declaran almacen/version en su pack.js) + campos defensivos de su estado.
function semillaSave(pack) {
  const clave = pack === 'cap1' ? 'amazonaverse.save' : pack + '.save';
  const v = pack === 'cap1' ? 6 : 1;
  const save = {
    v, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1k127-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  };
  // campos del estado propios de los packs ep* (su guardado.version=1 los espera; cap1 NO:
  // con el save «lleno» la validación de cap1 rechaza y el mundo no carga — visto en vivo cb-r1/r2)
  if (pack !== 'cap1') {
    save.lugares = []; save.canoa = null;
    save.edu = { inicio: null, fin: null, fichas: [], formativa: {}, registro: null };
  }
  return `try {
  localStorage.clear(); sessionStorage.clear();
  window.__erroresConsola = [];
  addEventListener('error', e => __erroresConsola.push(String(e.message || e)));
  addEventListener('unhandledrejection', e => __erroresConsola.push('rechazo: ' + (e.reason && e.reason.message || e.reason)));
  const cerr = console.error; console.error = function () { try { __erroresConsola.push([].map.call(arguments, String).join(' ').slice(0, 300)); } catch (e) {} return cerr.apply(this, arguments); };
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem(${JSON.stringify(clave)}, ${JSON.stringify(JSON.stringify(save))});
} catch (e) {}`;
}
const SEMILLA_V18_EXTRA = `try { localStorage.setItem('amazonaverse.v18', JSON.stringify({ v: 1, sel: 'vittata', especies: { vittata: 'seleccionada' }, inv: {}, otorgados: {}, mundo: {} })); } catch (e) {}`;

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

// asentado en el spawn natural + ventana de muestreo (fps por rAF + stats 1/s)
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
        fpsMedidor: st.fps, calidad: st.calidad, dpr: st.dpr, escuela: st.escuela === true,
        heapMB: m ? Math.round(m.usedJSHeapSize / 1048576) : null }); } catch (e) { stats.push(null); }
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
  return JSON.stringify({ pos: [Math.round(S.pos.x * 10) / 10, Math.round(S.pos.z * 10) / 10],
    fpsPorSeg: porSeg, fpsMed: porSeg.length ? Math.round(porSeg.reduce((s, x) => s + x, 0) / porSeg.length) : null,
    fpsMin: porSeg.length ? Math.min.apply(null, porSeg) : null,
    peorMs: deltas.length ? Math.round(Math.max.apply(null, deltas)) : null,
    medianaMs: pct(0.5), p95Ms: pct(0.95), p99Ms: pct(0.99), pausas50,
    stats, med: med ? { calls: med.calls, triangulos: med.triangulos, texturasMB: med.texturasMB, geometrias: med.geometrias, heapMB: med.heapMB, fps: med.fps } : null, medErr,
    errores: (window.__erroresConsola || []).slice(0, 10) }); })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })`;

// ---- demo v18: ayudantes y escenarios por API pública (mismo contrato que kimi1_085) ----
const PREP_JS = `(async () => { try { return await (async () => {
  const G = AV.G, S = AV.state, sleep = ms => new Promise(r => setTimeout(r, ms));
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(120); } return false; };
  if (!await espera(() => G.mundo && G.mundo.listo, 60000)) return 'ERR mundo no listo';
  try { window.dispatchEvent(new PointerEvent('pointerdown')); } catch (e) {}
  if (!await espera(() => G.v18combate && G.v18amenaza && G.v18Reparar && G.v18fx, 60000)) return 'ERR módulos v18 sin cargar';
  if (!await espera(() => G.v18combate.estado().ch, 30000)) return 'ERR rival sin modelo';
  window.__k127 = {
    G, S, sleep, espera,
    ir(x, z) { S.pos.x = x; S.pos.z = z; if (G.fisica && G.fisica.MOVE) { G.fisica.MOVE.vx = G.fisica.MOVE.vz = 0; } },
    async muestra(durSec) {
      const deltas = []; let ult = performance.now(); let vivo = true;
      const marca = () => { if (!vivo) return; const a = performance.now(); deltas.push(a - ult); ult = a; requestAnimationFrame(marca); };
      requestAnimationFrame(marca);
      const stats = []; const t0 = performance.now();
      while (performance.now() - t0 < durSec * 1000) {
        await sleep(1000);
        try { const st = G.renderer.stats(); const m = performance.memory;
          stats.push({ calls: st.calls, ktris: st.triangulos != null ? Math.round(st.triangulos / 1000) : null,
            fpsMedidor: st.fps, calidad: st.calidad, dpr: st.dpr, escuela: st.escuela === true,
            heapMB: m ? Math.round(m.usedJSHeapSize / 1048576) : null }); } catch (e) { stats.push(null); }
      }
      vivo = false; deltas.shift();
      const porSeg = []; let ac = 0, n = 0;
      for (const d of deltas) { ac += d; n++; if (ac >= 1000) { porSeg.push(Math.round(1000 / (ac / n))); ac = 0; n = 0; } }
      if (n > 5) porSeg.push(Math.round(1000 / (ac / n)));
      const orden = deltas.slice().sort((a, b) => a - b);
      const med = a => a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : 0;
      const pct = p => orden.length ? Math.round(orden[Math.min(orden.length - 1, Math.floor(orden.length * p))]) : 0;
      let pausas50 = 0; for (const d of deltas) { if (d > 50) pausas50++; }
      return { fpsPorSeg: porSeg, fpsMed: med(porSeg), fpsMin: porSeg.length ? Math.min.apply(null, porSeg) : 0,
        peorMs: deltas.length ? Math.round(Math.max.apply(null, deltas)) : 0,
        medianaMs: pct(0.5), p95Ms: pct(0.95), p99Ms: pct(0.99), pausas50,
        stats, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null };
    }
  };
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

const ESCENARIOS_JS = `(() => {
  const K = window.__k127, G = K.G, S = K.S, Cb = G.v18combate, Am = G.v18amenaza;
  return {
    async base() { const s = Cb.sitio; K.ir(s.x - 6, s.z); await K.sleep(3500); return K.muestra(8); },
    async duelo() {
      const s = Cb.sitio; K.ir(s.x - 4, s.z); await K.sleep(1200);
      if (Cb.estado().fase === 'nada') Cb.iniciar({ sinCuenta: true });
      let poderT = 0;
      const drv = setInterval(() => { try {
        const C = Cb.estado();
        if (C.fase === 'fin') { Cb.otraVez(); return; }
        if (C.fase !== 'lucha' || !C.r) return;
        const d = Math.hypot(C.r.pos.x - S.pos.x, C.r.pos.z - S.pos.z);
        S.facing = { x: (C.r.pos.x - S.pos.x) / (d || 1), z: (C.r.pos.z - S.pos.z) / (d || 1) };
        poderT -= 0.15;
        if (d < 2.4) Cb.usar(C.j, 'golpe_ala');
        else if (poderT <= 0 && C.j.energia > 55) { if (Cb.usar(C.j, C.j.poder).ok) poderT = 2.0; }
      } catch (e) {} }, 150);
      const r = await K.muestra(10);
      clearInterval(drv);
      try { Cb.salir(); } catch (e) {}
      return r;
    },
    async sombra() {
      try { Cb.salir(); } catch (e) {}
      const c = Am.centro; K.ir(c.x + 5, c.z); await K.sleep(3500);
      if (Am.estado().fase === 'nada') Am.iniciar({ forzar: true, sinEspera: true });
      const drv = setInterval(() => { try { Am.usarPoder(); } catch (e) {} }, 900);
      const r = await K.muestra(10);
      clearInterval(drv);
      try { Am.salir(); } catch (e) {}
      return r;
    },
    async puente() {
      try { Am.salir(); } catch (e) {}
      const E = G.v18Reparar.P.eje;
      if (!E) return { error: 'sin eje del puente' };
      K.ir(E.ax - E.ux * 3, E.az - E.uz * 3); await K.sleep(3500);
      return K.muestra(10);
    }
  };
})()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k127-'));
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi1k127-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
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
  async function paginaFresca(seedJS, url) {
    if (tid) { await cdp.call('Target.closeTarget', { targetId: tid }).catch(() => { }); tid = null; }
    tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    // Chromebook: desktop (sin mobile/touch/UA); iPhone (KIMI-165): touch + UA iOS para el perfil de texturas real
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: IPHONE }, ses);
    if (IPHONE) {
      try { await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses); } catch (e) { }
      try { await cdp.call('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }, ses); } catch (e) { }
    }
    try { await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses); } catch (e) { }
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: seedJS }, ses);
    const t0 = Date.now();
    await cdp.call('Page.navigate', { url }, ses);
    let listo = false;
    while (Date.now() - t0 < Math.max(CFG.espera_listo_s || 150, 240) * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
      await cdp.bombear(0.5);
    }
    if (!listo) throw new Error('el juego no arrancó');
    const cargaListaS = (Date.now() - t0) / 1000;
    const ent = await evaluar(cdp, ses, ENTRAR_JS, 150);
    if (!/^ok/.test(ent)) throw new Error('entrada: ' + ent);
    const cargaEntrarS = (Date.now() - t0) / 1000;
    return { ses, cargaListaS, cargaEntrarS };
  }
  try {
    // ---------- A) las 6 villas ----------
    res.capas = {};
    for (const pack of PACKS) {
      try {
        log(`pack ${pack}: navegando...`);
        const { ses, cargaListaS, cargaEntrarS } = await paginaFresca(semillaSave(pack), `${origen}/index.html?pack=${pack}&mapa=real&calidad=${CALIDAD}${URL_EXTRA ? '&' + URL_EXTRA : ''}`);
        if (!res.head) res.head = await evaluar(cdp, ses, `(() => { try { return (AV.G.build && (AV.G.build.commit || AV.G.build.id)) || 'desconocido'; } catch (e) { return 'desconocido'; } })()`, 10);
        log(`pack ${pack}: listo en ${cargaListaS}s, entrada en ${cargaEntrarS}s; muestreo ${SECS}s en el spawn`);
        const m = JSON.parse(await evaluar(cdp, ses, `(${MUESTRA_JS})(${SECS})`, 120));
        const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 60000);
        fs.writeFileSync(path.join(SALIDA, `k127_${ETIQUETA}_${pack}_villa.jpg`), Buffer.from(shot.data, 'base64'));
        res.capas[pack] = { cargaListaS: Math.round(cargaListaS * 10) / 10, cargaEntradaS: Math.round(cargaEntrarS * 10) / 10, ...m };
        guardar();
        const st = (m.stats || []).filter(Boolean);
        const calls = st.map(x => x.calls).filter(x => x != null), kt = st.map(x => x.ktris).filter(x => x != null);
        log(`pack ${pack}: fpsMed=${m.fpsMed} min=${m.fpsMin} peorMs=${m.peorMs} calls=${calls.length ? Math.round(calls.reduce((a, b) => a + b, 0) / calls.length) : '?'} ktris=${kt.length ? Math.round(kt.reduce((a, b) => a + b, 0) / kt.length) : '?'} medL=${m.med ? m.med.calls + ' calls/' + (m.med.triangulos / 1e6).toFixed(2) + 'M' : m.medErr || 'sin med'} errores=${JSON.stringify(m.errores || [])}`);
      } catch (e) {
        res.capas[pack] = { error: String(e && e.message || e).slice(0, 300) };
        log(`pack ${pack}: ERROR ${res.capas[pack].error}`);
        guardar();
      }
    }

    // ---------- B) la demo ?v18=1 ----------
    if (CON_DEMO) {
      try {
        log('demo: navegando con ?v18=1...');
        const seedDemo = semillaSave('cap1') + '\n' + SEMILLA_V18_EXTRA;
        const { ses } = await paginaFresca(seedDemo, `${origen}/index.html?pack=cap1&mapa=real&v18=1&calidad=${CALIDAD}${URL_EXTRA ? '&' + URL_EXTRA : ''}`);
        const prep = await evaluar(cdp, ses, PREP_JS, 150);
        if (!/^ok/.test(prep)) throw new Error('prep: ' + prep);
        res.demo = {};
        for (const nombre of ['base', 'duelo', 'sombra', 'puente']) {
          log(`demo: midiendo ${nombre}...`);
          let r;
          try { r = JSON.parse(await evaluar(cdp, ses, `(async () => { const E = ${ESCENARIOS_JS}; return JSON.stringify(await E['${nombre}']()); })()`, 150)); }
          catch (e) { r = { error: String(e && e.message || e).slice(0, 300) }; }
          const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 60000);
          fs.writeFileSync(path.join(SALIDA, `k127_${ETIQUETA}_demo_${nombre}.jpg`), Buffer.from(shot.data, 'base64'));
          res.demo[nombre] = r;
          guardar();
          const st = (r.stats || []).filter(Boolean);
          const med = (k) => { const v = st.map(x => x[k]).filter(x => x != null); return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null; };
          log(`demo/${nombre}: fpsMed=${r.fpsMed} min=${r.fpsMin} peorMs=${r.peorMs} calls=${med('calls')} ktris=${med('ktris')}${r.error ? ' ERROR ' + r.error : ''}`);
          await cdp.bombear(0.5);
        }
        res.demo.erroresConsola = await evaluar(cdp, ses, `(window.__erroresConsola || []).slice(0, 30)`, 15);
        log('demo: errores de consola: ' + JSON.stringify(res.demo.erroresConsola));
      } catch (e) {
        res.demo = res.demo || {};
        res.demo.error = String(e && e.message || e).slice(0, 300);
        log('demo: ERROR ' + res.demo.error);
      }
    }
  } finally {
    clearInterval(watch);
    guardar();
    if (tid) await cdp.call('Target.closeTarget', { targetId: tid }).catch(() => { });
    try { chrome.kill(); } catch (e) { }
    mataPorPerfil();
    srv.close();
    log('evidencia: ' + path.join(SALIDA, `k127_${ETIQUETA}.json`));
    console.log('· JSON: ' + path.join(SALIDA, `k127_${ETIQUETA}.json`));
    const hayError = Object.values(res.capas || {}).some(c => c.error) || (res.demo && res.demo.error);
    process.exit(hayError ? 1 : 0);
  }
})().catch(e => { console.error('FALLO:', e.message); try { mataPorPerfil(); } catch (e2) { } process.exit(1); });
