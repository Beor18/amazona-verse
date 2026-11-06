#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-176: sesión larga (20 min) en el móvil
   con la V18 por defecto (iPhone 390x844 dpr 3, CPU x4, GPU real, ?v18=1) buscando
   FUGAS de memoria: heap JS post-GC, geometrías, texturas y programas del renderer.
   Plan:
     FASE 1 «cap1-larga» (~11 min): asentar en el spawn, 2 vueltas de vuelo
       villa→ciudad→meseta→minas→portales y ENTRAR a cada actividad V18
       (duelo, Sombra, puerto, carrera de Chispa, minigolf), muestreando cada 15 s.
       Núcleo de detección de fugas: regresión lineal del heap.
     FASE 2 «caps» (cap 2…6, ~70 s cada uno): recarga con amazonaverse.capitulo=N,
       asentar, vuelo corto, muestreo; pico de heap y contadores por capítulo.
   El juego NO se toca: usa APIs públicas y la misma semilla que kimi2_k175.
   Chrome se lanza con --js-flags=--expose-gc para lecturas de heap post-GC.
   Uso: node tools/build/kimi2_k176.js --etiqueta r1 [--cpu 4] [--cap1-min 11]
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ETIQUETA = arg('--etiqueta', 'r1');
const CPU = parseInt(arg('--cpu', '4'), 10);
const CAP1_MIN = parseFloat(arg('--cap1-min', '11'));
const CAPS_MIN = parseFloat(arg('--caps-min', '1.1'));
const SOLO_CAPS = process.argv.indexOf('--solo-caps') > 0; // saltar FASE 1 (p. ej. tras una corrida cortada)
const PF = { w: 390, h: 844, dpr: 3, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' };
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi176'));
fs.mkdirSync(SALIDA, { recursive: true });
const LOGF = path.join(SALIDA, `k176_${ETIQUETA}.log`);
fs.writeFileSync(LOGF, '');
function log(msg) { try { fs.appendFileSync(LOGF, `[${new Date().toISOString().slice(11, 19)}] ${msg}\n`); } catch (e) { } console.log(msg); }
function guardar(res) { try { fs.writeFileSync(path.join(SALIDA, `k176_${ETIQUETA}.json`), JSON.stringify(res, null, 1)); } catch (e) { } }

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi2k176-/.test(d)) continue;
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
  async bompear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function evaluar(cdp, ses, exp, timeoutS, promesa) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: promesa !== false, returnByValue: true }, ses, (timeoutS || 30) * 1000);
  if (r.exceptionDetails) { const d = r.exceptionDetails; throw new Error('JS@' + (d.lineNumber != null ? d.lineNumber + ':' + d.columnNumber : '?') + ': ' + JSON.stringify(d.exception && d.exception.description || d.text).slice(0, 900)); }
  return r.result ? r.result.value : undefined;
}

// Semilla: mismo save V18 que kimi2_k175 (cap 1 por defecto: no tocamos capitulo)
const SEMILLA_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  window.__erroresConsola = [];
  addEventListener('error', e => __erroresConsola.push(String(e.message || e)));
  addEventListener('unhandledrejection', e => __erroresConsola.push('rechazo: ' + (e.reason && e.reason.message || e.reason)));
  const cerr = console.error; console.error = function () { try { __erroresConsola.push([].map.call(arguments, String).join(' ').slice(0, 300)); } catch (e) {} return cerr.apply(this, arguments); };
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi2k176-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null, species: 'vittata' },
    pos: { x: 150, z: 170, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
  localStorage.setItem('amazonaverse.v18', JSON.stringify({ v: 1, sel: 'vittata', especies: { vittata: 'seleccionada' }, inv: {}, otorgados: {}, mundo: { puente_villa: 'reparado' } }));
} catch (e) {}`;

// boot.js espera { v: 1, id: 'capN' } (menu_modos.apuntarCapitulo)
const SEMILLA_CAP_JS = n => `try {
  localStorage.setItem('amazonaverse.capitulo', JSON.stringify({ v: 1, id: 'cap${n}' }));
} catch (e) {}`;

const ENTRAR_JS = `(async () => { try { return await (async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene Jugar'; b.click();
    if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta'; }
  const S = window.AV && window.AV.state; if (!S || !S.profile || !S.profile.created) return 'sin perfil';
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(30000);
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 60000);
  const b = document.getElementById('c1-saltar'); if (b) b.click();
  await sleep(800);
  const f = document.getElementById('c1-fade'); if (f) f.remove();
  if (AV.G.ui && AV.G.ui.hideToast) AV.G.ui.hideToast();
  const jugar = Array.from(document.querySelectorAll('button')).find(x => /a jugar/i.test(x.textContent || '')); if (jugar) jugar.click();
  await sleep(300);
  try { window.dispatchEvent(new PointerEvent('pointerdown')); } catch (e) {}
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

// Instala __k176: vuelo por posición directa (sin depender de input), contador de FPS
// persistente y muestra() = heap post-GC + info.memory + info.render + posición.
const PREP_JS = `(async () => { try { return await (async () => {
  const G = AV.G, S = AV.state, F = G.fisica, sleep = ms => new Promise(r => setTimeout(r, ms));
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(120); } return false; };
  if (!await espera(() => G.mundo && G.mundo.listo, 60000)) return 'ERR mundo no listo';
  try { window.dispatchEvent(new PointerEvent('pointerdown')); } catch (e) {}
  window.__k176 = {
    G, S, F, sleep, espera,
    fps: { acMs: 0, n: 0, ult: performance.now() },
    ir(x, z, y) { S.pos.x = x; S.pos.z = z; if (y != null) S.pos.y = y; else S.pos.y = G.terreno.height(x, z) + 0.1; if (F && F.MOVE) { F.MOVE.vx = F.MOVE.vz = 0; } },
    async volarA(x, z, alto, ms) { // vuelo por posición directa hacia (x,z) a 'alto' m del suelo
      const t0 = performance.now();
      while (performance.now() - t0 < ms) {
        try { F.startFlying(); } catch (e) {}
        const dx = x - S.pos.x, dz = z - S.pos.z, d = Math.hypot(dx, dz);
        const ty = G.terreno.height(S.pos.x, S.pos.z) + alto;
        S.pos.y += (ty - S.pos.y) * 0.06;
        if (d > 3) { S.pos.x += dx / d * Math.min(9, d * 0.5); S.pos.z += dz / d * Math.min(9, d * 0.5); }
        G.camara.yaw = Math.atan2(-dx, -dz);
        await sleep(90);
      }
      return [Math.round(S.pos.x), Math.round(S.pos.z)];
    },
    stats() { try { const st = G.renderer.stats(); return { calls: st.calls, tris: st.triangulos }; } catch (e) { return null; } },
    async muestra(seg) {
      try { if (typeof gc === 'function') gc(); } catch (e) {}
      await sleep(1600); // asienta finalizadores tras el GC
      const f = this.fps; const ahora = performance.now();
      const fpsMed = f.n ? Math.round(1000 / ((ahora - f.ult) / f.n)) : null;
      f.ult = ahora; f.n = 0;
      let heap = null, geo = null, tex = null, progs = null, render = null;
      try { heap = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null; } catch (e) {}
      try { const inf = G.renderer.renderer.info; geo = inf.memory.geometries; tex = inf.memory.textures; progs = inf.programs ? inf.programs.length : null; render = { calls: inf.render.calls, tris: inf.render.triangles }; } catch (e) {}
      return { t: Math.round(performance.now()), seg, fpsMed, heapMB: heap, geo, tex, progs, calls: render && render.calls, tris: render && render.tris,
        pos: [Math.round(S.pos.x), Math.round(S.pos.y), Math.round(S.pos.z)],
        errores: (window.__erroresConsola || []).length };
    }
  };
  requestAnimationFrame(function marca() { const f = window.__k176.fps, a = performance.now(); f.acMs = 0; f.n++; f.ultMarca = a; requestAnimationFrame(marca); });
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

// Muestra: gc() + espera + lectura (PREP debe estar instalado)
const MUESTRA_JS = seg => `(async () => { try { return await window.__k176.muestra('${seg}'); } catch (e) { return { error: String(e && e.message || e) }; } })()`;

// Rutas de la fase 1: waypoints (x, z, alto) del circuito cap 1
const CIRCUITO = [
  { n: 'villa', x: 150, z: 170, a: 10 },
  { n: 'camino', x: 60, z: 40, a: 12 },
  { n: 'ciudad', x: -14, z: -100, a: 14 },
  { n: 'plaza', x: -33, z: -136, a: 16 },
  { n: 'meseta', x: -90, z: -60, a: 14 },
  { n: 'minas', x: 73.6, z: -75.2, a: 12 },
  { n: 'portales', x: 40, z: -120, a: 12 }
];

// Entradas cortas a cada actividad V18 (defensivo: try/catch en todo)
const ACTIVIDAD_JS = {
  duelo: `(async () => { const K = window.__k176, G = K.G; try {
      try { G.dialogo.clear(); } catch (e) {}
      const C = G.v18combate; if (!C) return { error: 'sin v18combate' };
      const r = C.iniciar({ forzar: true }); if (r === false) return { error: 'iniciar false' };
      await K.sleep(45000); try { C.salir && C.salir('qa'); } catch (e) {}
      return { ok: 1 }; } catch (e) { return { error: String(e && e.message || e) }; } })()`,
  sombra: `(async () => { const K = window.__k176, G = K.G; try {
      try { G.dialogo.clear(); } catch (e) {}
      const A = G.v18amenaza; if (!A) return { error: 'sin v18amenaza' };
      const r = A.iniciar({ forzar: true }); if (r === false) return { error: 'iniciar false' };
      await K.sleep(45000); try { A.salir && A.salir('qa'); } catch (e) {}
      return { ok: 1 }; } catch (e) { return { error: String(e && e.message || e) }; } })()`,
  puerto: `(async () => { const K = window.__k176, G = K.G; try {
      try { G.dialogo.clear(); } catch (e) {}
      const P = G.v18puerto; if (!P) return { error: 'sin v18puerto' };
      try { P.avanzar('investigado'); P.aplicar(); } catch (e) {}
      K.ir(P.SITIO.plaza.x, P.SITIO.plaza.z);
      await K.sleep(6000);
      const drv = setInterval(() => { try { P.usarPoder(); } catch (e) {} }, 1500);
      await K.sleep(45000); clearInterval(drv);
      return { ok: 1 }; } catch (e) { return { error: String(e && e.message || e) }; } })()`,
  chispa: `(async () => { const K = window.__k176, G = K.G; try {
      try { G.dialogo.clear(); } catch (e) {}
      const C = G.v18chispa; if (!C) return { error: 'sin v18chispa' };
      K.ir(C.SITIO.salida.x, C.SITIO.salida.z);
      await K.sleep(4000);
      if (!C.empezar({ forzar: true })) return { error: 'empezar false' };
      await K.espera(() => C.estado().fase === 'carrera', 9000);
      await K.sleep(25000);
      try { if (C.estado().fase !== 'nada') C.cancelar(); } catch (e) {}
      return { ok: 1 }; } catch (e) { return { error: String(e && e.message || e) }; } })()`,
  golf: `(async () => { const K = window.__k176, G = K.G; try {
      try { G.dialogo.clear(); } catch (e) {}
      const M = G.v18minigolf; if (!M) return { error: 'sin v18minigolf' };
      if (!M.iniciar({ forzar: true })) return { error: 'iniciar false' };
      try { M.elegir(1); } catch (e) {}
      const sitio = M.sitio; if (sitio) K.ir(sitio.x, sitio.z);
      await K.sleep(3000);
      let tiros = 0;
      const t0 = performance.now();
      while (performance.now() - t0 < 40000) {
        const A = M.estado();
        if (A.fase === 'apuntar') { try { M.tirar(0.3 + 0.12 * (tiros % 4)); tiros++; } catch (e) {} }
        if (A.fase === 'nido' || A.fase === 'nada') break;
        await K.sleep(1500);
      }
      try { if (M.estado().fase !== 'nada') M.salir(); } catch (e) {}
      return { ok: 1, tiros }; } catch (e) { return { error: String(e && e.message || e) }; } })()`
};

async function lanzarChromeUnaVez() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2k176-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--js-flags=--expose-gc',
    `--window-size=${PF.w},${PF.h}`, 'about:blank'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
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
  throw new Error('Chrome no abrio DevTools en 30 s: ' + err.slice(0, 300));
}
async function lanzarChrome() {
  let ultimo = '';
  for (let intento = 0; intento < 3; intento++) {
    try { return await lanzarChromeUnaVez(); } catch (e) { ultimo = e.message; await new Promise(r => setTimeout(r, 2500)); }
  }
  throw new Error(ultimo);
}
function mataPorPerfil() {
  try {
    const ps = "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*kimi2k176-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync("powershell -NoProfile -Command '" + ps + "'", { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}
async function foto(cdp, ses, nombre) {
  try {
    const r = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 20000);
    if (r && r.data) { fs.writeFileSync(path.join(SALIDA, nombre), Buffer.from(r.data, 'base64')); return nombre; }
  } catch (e) { }
  return null;
}

// Regresión lineal simple: pendiente (MB por minuto) y R²
function tendencia(puntos) {
  const xs = [], ys = [];
  for (let i = 0; i < puntos.length; i++) { const p = puntos[i]; if (p && p.heapMB != null && p.t != null) { xs.push(p.t / 60000); ys.push(p.heapMB); } }
  const n = xs.length; if (n < 4) return { n, pendienteMBmin: null };
  const mx = xs.reduce((s, x) => s + x, 0) / n, my = ys.reduce((s, y) => s + y, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
  const b = sxx ? sxy / sxx : 0;
  const r2 = (sxx && syy) ? (sxy * sxy) / (sxx * syy) : 0;
  return { n, pendienteMBmin: Math.round(b * 100) / 100, r2: Math.round(r2 * 100) / 100,
    heapIni: ys[0], heapFin: ys[ys.length - 1], deltaMB: Math.round((ys[ys.length - 1] - ys[0])) };
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const { targetId } = await cdp.call('Target.createTarget', { url: 'about:blank' });
  const { sessionId: ses } = await cdp.call('Target.attachToTarget', { targetId, flatten: true });
  await cdp.call('Page.enable', {}, ses);
  await cdp.call('Runtime.enable', {}, ses);
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: PF.w, height: PF.h, deviceScaleFactor: PF.dpr, mobile: true }, ses);
  await cdp.call('Emulation.setUserAgentOverride', { userAgent: PF.ua }, ses);
  await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
  await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);

  const resultado = { etiqueta: ETIQUETA, perfil: { ancho: PF.w, alto: PF.h, dpr: PF.dpr, cpu: CPU },
    inicio: new Date().toISOString(), fases: {}, muestras: [], fotos: {}, erroresConsola: [] };
  let chromeOK = true;

  async function entrarYCargar(url) {
    await cdp.call('Page.navigate', { url }, ses);
    await cdp.bompear(1.5);
    await evaluar(cdp, ses, SEMILLA_JS, 15);
    await cdp.bompear(0.5);
    await cdp.call('Page.navigate', { url }, ses); // recarga con la semilla puesta
    await cdp.bompear(2);
    const r = await evaluar(cdp, ses, ENTRAR_JS, 120);
    const prep = await evaluar(cdp, ses, PREP_JS, 90);
    if (prep !== 'ok') throw new Error('PREP: ' + prep);
    return r;
  }

  const SAMPLE_MS = 15000;
  async function muestrearDurante(seg, durMs, fotoNombre) {
    const t0 = Date.now(); let ult = 0;
    while (Date.now() - t0 < durMs) {
      if (Date.now() - ult >= SAMPLE_MS) {
        ult = Date.now();
        const m = await evaluar(cdp, ses, MUESTRA_JS(seg), 30);
        resultado.muestras.push(m);
        guardar(resultado); // escritura incremental: sobrevive un corte de la corrida
        log(`muestra ${seg}: heap=${m && m.heapMB}MB geo=${m && m.geo} tex=${m && m.tex} fps=${m && m.fpsMed} pos=${m && m.pos}`);
      }
      await new Promise(r => setTimeout(r, 700));
    }
    if (fotoNombre) resultado.fotos[seg] = await foto(cdp, ses, fotoNombre);
  }

  try {
    // ============ FASE 1: cap 1 continuo (salta con --solo-caps) ============
    if (!SOLO_CAPS) {
    log('FASE 1: cap1 larga (' + CAP1_MIN + ' min) con actividades');
    await entrarYCargar(`${origen}/?v18=1`);
    log('entrada cap1 ok');
    const t1 = Date.now();
    // asentado inicial
    await muestrearDurante('cap1-asentado', 30000);
    // circuito 2 vueltas + actividades intercaladas
    const orden = [];
    for (let vuelta = 1; vuelta <= 2; vuelta++) {
      for (const w of CIRCUITO) orden.push({ tipo: 'vuelo', ...w });
      if (vuelta === 1) orden.push({ tipo: 'act', id: 'duelo' }, { tipo: 'act', id: 'sombra' });
      orden.push({ tipo: 'act', id: 'puerto' });
      if (vuelta === 2) orden.push({ tipo: 'act', id: 'chispa' }, { tipo: 'act', id: 'golf' });
    }
    for (const paso of orden) {
      const restante = CAP1_MIN * 60000 - (Date.now() - t1);
      if (restante < 60000) break;
      if (paso.tipo === 'vuelo') {
        // vuelo hasta el waypoint (tope 40 s) y muestreo en ruta
        await evaluar(cdp, ses, `(async () => { try { return await window.__k176.volarA(${paso.x}, ${paso.z}, ${paso.a}, 12000); } catch (e) { return null; } })()`, 30);
        await muestrearDurante('cap1-vuelo-' + paso.n, 12000, paso.n === 'plaza' ? `k176_${ETIQUETA}_ciudad.jpg` : null);
        try { await evaluar(cdp, ses, `(async () => { try { window.__k176.F.endFlight(); } catch (e) {} return 1; })()`, 10); } catch (e) { }
      } else {
        log('actividad: ' + paso.id);
        const r = await evaluar(cdp, ses, ACTIVIDAD_JS[paso.id], 120);
        resultado.fases['act-' + paso.id] = r;
        await muestrearDurante('cap1-' + paso.id, 8000);
      }
    }
    // muestreo final de asentado
    await evaluar(cdp, ses, `(async () => { const K = window.__k176; K.ir(150, 170); return 1; })()`, 10);
    await muestrearDurante('cap1-final', 20000);
    const cap1Muestras = resultado.muestras.filter(m => m && /^cap1/.test(m.seg || ''));
    resultado.fases['cap1-larga'] = {
      durMin: Math.round((Date.now() - t1) / 600) / 100,
      tendenciaHeap: tendencia(cap1Muestras),
      tendenciaGeo: tendencia(cap1Muestras.map(m => ({ t: m.t, heapMB: m.geo }))),
      tendenciaTex: tendencia(cap1Muestras.map(m => ({ t: m.t, heapMB: m.tex })))
    };
    log('FASE 1 fin: ' + JSON.stringify(resultado.fases['cap1-larga'].tendenciaHeap));
    }

    // ============ FASE 2: caps 2…6 ============
    for (let cap = 2; cap <= 6; cap++) {
      const restanteGlobal = (SOLO_CAPS ? 5 * CAPS_MIN + 4 : CAP1_MIN + 5 * CAPS_MIN + 4) * 60000 - (Date.now() - new Date(resultado.inicio).getTime());
      if (restanteGlobal < 0) { log('sin tiempo para cap ' + cap); break; }
      log('FASE 2: cap ' + cap);
      try {
        await cdp.call('Page.navigate', { url: `${origen}/?v18=1` }, ses);
        await cdp.bompear(1.5);
        await evaluar(cdp, ses, SEMILLA_JS, 15);
        await evaluar(cdp, ses, SEMILLA_CAP_JS(cap), 10);
        await cdp.call('Page.navigate', { url: `${origen}/?v18=1` }, ses);
        await cdp.bompear(2);
        const r = await evaluar(cdp, ses, ENTRAR_JS, 120);
        const prep = await evaluar(cdp, ses, PREP_JS, 90);
        if (prep !== 'ok') throw new Error('PREP cap' + cap + ': ' + prep);
        const t0 = Date.now();
        await muestrearDurante('cap' + cap + '-asentado', 20000);
        await evaluar(cdp, ses, `(async () => { try { return await window.__k176.volarA(0, 0, 14, ${Math.round(CAPS_MIN * 60000 * 0.6)}); } catch (e) { return null; } })()`, Math.round(CAPS_MIN * 60 * 0.6) + 30);
        await muestrearDurante('cap' + cap + '-vuelo', Math.round(CAPS_MIN * 60000 * 0.3));
        const caps = resultado.muestras.filter(m => m && m.seg === 'cap' + cap + '-asentado' || m && m.seg === 'cap' + cap + '-vuelo');
        const heaps = caps.map(m => m.heapMB).filter(x => x != null);
        resultado.fases['cap' + cap] = { entrada: r, durMin: Math.round((Date.now() - t0) / 600) / 100,
          heapPico: heaps.length ? Math.max.apply(null, heaps) : null,
          heapFin: heaps.length ? heaps[heaps.length - 1] : null,
          geoFin: caps.length ? caps[caps.length - 1].geo : null, texFin: caps.length ? caps[caps.length - 1].tex : null,
          callsMed: (() => { const v = caps.map(m => m.calls).filter(x => x != null); return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null; })() };
      } catch (e) { resultado.fases['cap' + cap] = { error: String(e.message || e).slice(0, 300) }; log('ERROR cap ' + cap + ': ' + e.message); }
    }

    // errores de consola finales (página actual)
    try {
      const errs = await evaluar(cdp, ses, `(async () => (window.__erroresConsola || []).slice(0, 40))()`, 15);
      resultado.erroresConsola = errs || [];
    } catch (e) { }
  } catch (e) {
    chromeOK = false;
    resultado.error = String(e.message || e).slice(0, 500);
    log('ERROR FATAL: ' + e.message);
    try { resultado.fotos.error = await foto(cdp, ses, `k176_${ETIQUETA}_error.jpg`); } catch (e2) { }
  }

  guardar(resultado);
  log('guardado ' + path.join(SALIDA, `k176_${ETIQUETA}.json`));
  try { chrome.kill(); } catch (e) { }
  try { srv.close(); } catch (e) { }
  setTimeout(() => { mataPorPerfil(); process.exit(chromeOK && !resultado.error ? 0 : 1); }, 1500);
})();
