#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-129: recorridos REALES por capítulo para Kelvin
   (📣 TAREAS_KIMI.md, tanda 1d: «un recorrido de 1 a 2 min por capítulo (caps. 1 a 6) con GPU real
   a 1080p, jugando con teclas (sin teletransportes), para que Kelvin los revise antes del playtest
   con niños»).
     · un vídeo por pack (cap1..ep6): semilla fiel por almacén (kimi1_127), entrada real por la
       portada, grabación en página con MediaRecorder sobre canvas.captureStream(30) del lienzo
       (mp4/avc1 si el Chrome lo soporta; sin ffmpeg en la PC), 1920×1080 GPU real.
     · jugado SOLO con input real por CDP (Input.dispatchKeyEvent: W/Q/R/A/S/D/Espacio/V/X);
       solo se lee estado (AV.state / AV.G.camara.yaw) para decidir la entrada. Sin teletransportes:
       las patas son caminatas con esquiva (caminarHasta de kimi3_121) y el tramo aéreo despega
       con V, vuela con W y aterriza con X, como un niño.
     · recorrido por patas en estrella desde el spawn (4 bearings, ~15-18 m cada uno, barridos de
       cámara con Q/R entre patas, un salto y un tramo de vuelo corto). Cada pata tiene tope de
       pasos: si un obstáculo/ el agua la bloquea, se pasa a la siguiente (el vídeo sigue).
   Salida: docs/img/kimi129/kimi129_<pack>_<etiqueta>.mp4 + .json por pack.
   Uso: node tools/build/kimi1_129.js [--packs cap1,ep2,ep3,ep4,ep5,ep6] [--etiqueta r1]
        [--segs 90] [--salida <dir>] [--sin-vuelo]
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
const PACKS = arg('--packs', 'cap1,ep2,ep3,ep4,ep5,ep6').split(',');
const ETIQUETA = arg('--etiqueta', 'r1');
const SEGS = parseInt(arg('--segs', '90'), 10);           // duración objetivo del take grabado
const CON_VUELO = !process.argv.includes('--sin-vuelo');
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi129'));
fs.mkdirSync(SALIDA, { recursive: true });
const LOGF = path.join(SALIDA, `k129_${ETIQUETA}.log`);
fs.writeFileSync(LOGF, '');
function log(msg) { try { fs.appendFileSync(LOGF, `[${new Date().toISOString().slice(11, 19)}] ${msg}\n`); } catch (e) { } console.log(msg); }
function jlog(res) { try { fs.writeFileSync(path.join(SALIDA, `kimi129_${res.pack}_${ETIQUETA}.json`), JSON.stringify(res, null, 1)); } catch (e) { } }

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi1k129-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff-2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
MIME['.woff2'] = 'font/woff2';
function servir() {
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (req.method === 'POST' && u.pathname === '/__kimi129/grabar') {
      const nombre = path.basename(u.searchParams.get('nombre') || 'video.bin');
      const dest = path.join(SALIDA, nombre);
      const f = fs.createWriteStream(dest);
      req.pipe(f);
      f.on('finish', () => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true, destino: nombre, bytes: f.bytesWritten })); });
      f.on('error', e => { res.writeHead(500); res.end(String(e)); });
      return;
    }
    let p; try { p = decodeURIComponent(u.pathname); } catch (e) { res.writeHead(400); return res.end(); }
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

// Semilla por pack (kimi1_127, probada en las 6 villas): clave y versión del guardado del pack.
function semillaSave(pack) {
  const clave = pack === 'cap1' ? 'amazonaverse.save' : pack + '.save';
  const v = pack === 'cap1' ? 6 : 1;
  const save = {
    v, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1k129-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  };
  if (pack !== 'cap1') { save.lugares = []; save.canoa = null; save.edu = { inicio: null, fin: null, fichas: [], formativa: {}, registro: null }; }
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

// Grabador en página (kimi3_121): MediaRecorder sobre el lienzo; vuelca el blob por POST.
const REC_JS = `(() => { try {
  if (window.__rec) return window.__rec.mime;
  const cv = document.querySelector('canvas');
  if (!cv) return 'ERR sin canvas';
  const stream = cv.captureStream(30);
  const mimos = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  const mime = mimos.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
  if (!mime) return 'ERR sin MediaRecorder';
  let rec = null, chunks = [];
  window.__rec = {
    mime,
    empieza() { chunks = []; rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: (window.__recBits || 1600000) }); rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); }; rec.start(400); },
    async para(nombre) {
      const blob = await new Promise(res => { rec.onstop = () => res(new Blob(chunks, { type: mime })); rec.stop(); });
      const r = await fetch('/__kimi129/grabar?nombre=' + encodeURIComponent(nombre), { method: 'POST', body: blob });
      const j = await r.json();
      return { mime, bytes: blob.size, destino: j.destino };
    }
  };
  return mime;
} catch (e) { return 'ERR ' + (e && e.message || e); } })()`;

// Muestreador de cuadros en página (para FPS real del take).
const FPS_START_JS = `(() => { try {
  window.__fpsFin = false; window.__fps129 = []; window.__fpsUlt = performance.now();
  const mar = () => { if (window.__fpsFin) return; const a = performance.now(); window.__fps129.push(Math.round(a - window.__fpsUlt)); window.__fpsUlt = a; requestAnimationFrame(mar); };
  requestAnimationFrame(mar);
  return window.__fps129.length;
} catch (e) { return 'ERR ' + e; } })()`;
const FPS_STOP_JS = `(() => { try {
  window.__fpsFin = true;
  const d = (window.__fps129 || []).slice(3); // quita los 3 primeros (arranque)
  if (!d.length) return JSON.stringify({ med: null, min: null, n: 0 });
  const porSeg = []; let ac = 0, n = 0;
  for (const x of d) { ac += x; n++; if (ac >= 1000) { porSeg.push(Math.round(1000 / (ac / n))); ac = 0; n = 0; } }
  if (n > 5) porSeg.push(Math.round(1000 / (ac / n)));
  const sum = (a) => a.reduce((s, v) => s + v, 0);
  return JSON.stringify({ med: porSeg.length ? Math.round(sum(porSeg) / porSeg.length) : null,
    min: porSeg.length ? Math.min.apply(null, porSeg) : null, peorMs: d.length ? Math.max.apply(null, d) : null, n: d.length });
} catch (e) { return JSON.stringify({ error: String(e) }); } })()`;

const TECLAS = {
  w: { vk: 87, code: 'KeyW', key: 'w' }, a: { vk: 65, code: 'KeyA', key: 'a' }, s: { vk: 83, code: 'KeyS', key: 's' }, d: { vk: 68, code: 'KeyD', key: 'd' },
  q: { vk: 81, code: 'KeyQ', key: 'q' }, r: { vk: 82, code: 'KeyR', key: 'r' },
  v: { vk: 86, code: 'KeyV', key: 'v' }, x: { vk: 88, code: 'KeyX', key: 'x' },
  espacio: { vk: 32, code: 'Space', key: ' ' }
};
async function tecla(cdp, ses, nombre, abajo) {
  const t = TECLAS[nombre];
  await cdp.call('Input.dispatchKeyEvent', { type: abajo ? 'rawKeyDown' : 'keyUp', windowsVirtualKeyCode: t.vk, code: t.code, key: t.key }, ses, 10000);
}
const envolver = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const dormir = s => new Promise(r => setTimeout(r, s * 1000));

async function estado(cdp, ses) {
  return JSON.parse(await evaluar(cdp, ses, `(() => { const S = AV.state, G = AV.G; return JSON.stringify({ x: S.pos.x, z: S.pos.z, y: S.pos.y, yaw: G.camara.yaw, volando: !!(G.fisica.MOVE && G.fisica.MOVE.flying) }); })()`, 15));
}

// Caminata con esquiva lateral y retroceso de carrerilla (adaptado de kimi3_121.caminarHasta,
// tope de pasos propio para que una pata bloqueada no se coma el take).
async function pasearHasta(cdp, ses, tx, tz, tol, maxPasos, log) {
  let ultD = 1e9, sinProgreso = 0, lado = 0, esquivas = 0;
  for (let i = 0; i < maxPasos; i++) {
    const st = await estado(cdp, ses);
    const d = Math.hypot(tx - st.x, tz - st.z);
    if (d < tol) { await tecla(cdp, ses, 'w', false); return { ok: true, d }; }
    if (d > ultD - 0.12) sinProgreso++; else sinProgreso = 0;
    ultD = d;
    if (sinProgreso >= 5) {
      lado = 1 - lado;
      const lat = lado ? 'a' : 'd';
      await tecla(cdp, ses, 'w', true);
      await tecla(cdp, ses, lat, true);
      await dormir(1.0);
      await tecla(cdp, ses, lat, false);
      sinProgreso = 0; esquivas++;
      if (esquivas % 4 === 0) {
        await tecla(cdp, ses, 'w', false);
        await tecla(cdp, ses, 's', true); await dormir(1.1); await tecla(cdp, ses, 's', false);
        await tecla(cdp, ses, 'w', true);
      }
      continue;
    }
    const deseada = Math.atan2(-(tx - st.x), -(tz - st.z));
    const diff = envolver(deseada - st.yaw);
    if (Math.abs(diff) > 0.1) {
      await tecla(cdp, ses, 'w', false);
      const t = diff > 0 ? 'q' : 'r';
      await tecla(cdp, ses, t, true); await dormir(Math.min(0.4, Math.abs(diff) / 1.9)); await tecla(cdp, ses, t, false);
    } else {
      await tecla(cdp, ses, 'w', true); await dormir(0.22);
    }
  }
  await tecla(cdp, ses, 'w', false);
  const st = await estado(cdp, ses);
  return { ok: false, d: Math.hypot(tx - st.x, tz - st.z) };
}

// Barrido de cámara con Q/R (input real): gira `rad` radianes aprox. hacia la derecha (r) o izquierda (q).
async function giraCam(cdp, ses, rad) {
  const t = rad > 0 ? 'r' : 'q';
  await tecla(cdp, ses, t, true);
  await dormir(Math.min(1.4, Math.abs(rad) / 1.9));
  await tecla(cdp, ses, t, false);
}

async function salta(cdp, ses) {
  await tecla(cdp, ses, 'espacio', true); await dormir(0.08); await tecla(cdp, ses, 'espacio', false);
}

async function despegar(cdp, ses, log) {
  const volando = async () => (await estado(cdp, ses)).volando;
  if (await volando()) return true;
  await tecla(cdp, ses, 'v', true); await dormir(0.1); await tecla(cdp, ses, 'v', false);
  for (let i = 0; i < 16; i++) { await dormir(0.25); if (await volando()) { log('vuelo: despegada'); return true; } }
  log('vuelo: V no respondió');
  return false;
}
async function aterrizar(cdp, ses, log) {
  await tecla(cdp, ses, 'x', true); await dormir(0.1); await tecla(cdp, ses, 'x', false);
  for (let i = 0; i < 20; i++) { await dormir(0.25); if (!(await estado(cdp, ses)).volando) { log('vuelo: aterrizada'); return true; } }
  return false;
}

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k129-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--window-size=1920,1080', '--force-device-scale-factor=1', 'about:blank'];
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi1k129-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  let tid = null;
  async function paginaFresca(seedJS, url) {
    if (tid) { await cdp.call('Target.closeTarget', { targetId: tid }).catch(() => { }); tid = null; }
    tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: seedJS }, ses);
    const t0 = Date.now();
    await cdp.call('Page.navigate', { url }, ses);
    let listo = false;
    while (Date.now() - t0 < Math.max(CFG.espera_listo_s || 150, 240) * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
      await cdp.bombear(0.5);
    }
    if (!listo) throw new Error('el juego no arrancó');
    const ent = await evaluar(cdp, ses, ENTRAR_JS, 150);
    if (!/^ok/.test(ent)) throw new Error('entrada: ' + ent);
    // asentar el spawn con cuadros reales (sin forzar drenado: es una partida de verdad)
    await evaluar(cdp, ses, `(async () => { const espera = ms => new Promise(r => setTimeout(r, ms));
      await espera(6000); if (AV.G.ui && AV.G.ui.hideToast) AV.G.ui.hideToast();
      const f = document.getElementById('c1-fade'); if (f) f.remove(); return 'ok'; })()`, 30);
    return { ses };
  }

  const resumen = [];
  try {
    for (const pack of PACKS) {
      const res = { tarea: 'KIMI-129', pack, etiqueta: ETIQUETA, pantalla: '1920x1080 dpr1 GPU real (RX 5700 XT), escritorio, calidad por defecto', entrada: 'CDP Input.dispatchKeyEvent (input real)', head: null };
      try {
        log(`\n=== ${pack}: navegando...`);
        const { ses } = await paginaFresca(semillaSave(pack), `${origen}/index.html?pack=${pack}&mapa=real`);
        res.head = await evaluar(cdp, ses, `(() => { try { return (AV.G.build && (AV.G.build.commit || AV.G.build.id)) || 'desconocido'; } catch (e) { return 'desconocido'; } })()`, 10);

        const st0 = await estado(cdp, ses);
        res.spawn = { x: Math.round(st0.x * 10) / 10, z: Math.round(st0.z * 10) / 10 };
        log(`${pack}: spawn en (${res.spawn.x}, ${res.spawn.z}); armando grabador...`);

        await evaluar(cdp, ses, `window.__recBits = 1600000`, 10, false);
        res.mime = await evaluar(cdp, ses, REC_JS, 20, false);
        if (!res.mime || res.mime.indexOf('ERR') === 0) throw new Error('recorder: ' + res.mime);
        await evaluar(cdp, ses, FPS_START_JS, 10, false);
        await evaluar(cdp, ses, `window.__rec.empieza()`, 15, false);
        await dormir(2.5); // deja que el arranque del recorder no abra el vídeo con un cuadro largo
        const tGrab = Date.now();
        log(`${pack}: grabando (mime ${res.mime})...`);

        // Recorrido en estrella: 4 bearings desde el spawn + barridos de cámara + salto + vuelo corto.
        const D = 22; // metros por pata
        const bearings = [0.5, 2.0, 3.6, 5.1];
        res.patas = [];
        for (let i = 0; i < bearings.length; i++) {
          const b = bearings[i];
          const base = i === 0 ? res.spawn : { x: res.patas[i - 1].llego[0], z: res.patas[i - 1].llego[1] };
          const tx = base.x + Math.sin(b) * D, tz = base.z + Math.cos(b) * D;
          await giraCam(cdp, ses, b > Math.PI ? b - 2 * Math.PI : b); // mira hacia la pata (input real)
          const r = await pasearHasta(cdp, ses, tx, tz, 2.4, 60, log);
          const stA = await estado(cdp, ses);
          res.patas.push({ hasta: [Math.round(tx * 10) / 10, Math.round(tz * 10) / 10], ok: r.ok, dFinal: Math.round(r.d * 10) / 10, llego: [stA.x, stA.z] });
          log(`${pack}: pata ${i + 1}/4 → ${r.ok ? 'llegó' : 'bloqueada a ' + r.d.toFixed(1) + ' m'} (${res.patas[i].hasta})`);
          await giraCam(cdp, ses, 1.3); // mira a la derecha...
          await giraCam(cdp, ses, -2.6); // ...y a la izquierda: barrido del entorno
          if (i === 1) await salta(cdp, ses);
          if (CON_VUELO && i === 2) { // tramo aéreo corto: despegar, volar, aterrizar
            if (await despegar(cdp, ses, log)) {
              await tecla(cdp, ses, 'w', true); await dormir(5.5);
              await tecla(cdp, ses, 'r', true); await dormir(0.9); await tecla(cdp, ses, 'r', false);
              await dormir(2.0);
              await tecla(cdp, ses, 'w', false);
              res.vuelo = { aterrizo: await aterrizar(cdp, ses, log) };
            } else res.vuelo = { despegue: false };
          }
        }
        // vuelta al vecindario del spawn y cierre mirando a la villa
        const stF = await estado(cdp, ses);
        const dSpawn = Math.hypot(res.spawn.x - stF.x, res.spawn.z - stF.z);
        if (dSpawn > 12) {
          const r = await pasearHasta(cdp, ses, res.spawn.x + 2, res.spawn.z + 2, 3.0, 50, log);
          res.regreso = { ok: r.ok, d: Math.round(r.d * 10) / 10 };
        }
        await giraCam(cdp, ses, 2.4);
        await salta(cdp, ses);
        res.segsGrabados = Math.round((Date.now() - tGrab) / 100) / 10;

        res.fps = JSON.parse(await evaluar(cdp, ses, FPS_STOP_JS, 15));
        log(`${pack}: take de ${res.segsGrabados}s · fps med=${res.fps.med} min=${res.fps.min} peor=${res.fps.peorMs}ms · volcando vídeo...`);
        res.video = await evaluar(cdp, ses, `window.__rec.para('kimi129_${pack}_${ETIQUETA}.${res.mime.indexOf('mp4') !== -1 ? 'mp4' : 'webm'}')`, 120);
        log(`${pack}: vídeo ${JSON.stringify(res.video)}`);
        try {
          const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 20000);
          fs.writeFileSync(path.join(SALIDA, `kimi129_${pack}_${ETIQUETA}_ref.jpg`), Buffer.from(shot.data, 'base64'));
        } catch (e) { log('captura ref: ' + e.message); }
        res.erroresConsola = await evaluar(cdp, ses, `(window.__erroresConsola || []).slice(0, 20)`, 15);
        if (res.video && res.video.bytes > 25 * 1048576) res.aviso = 'vídeo > 25 MB: bajar __recBits o acortar --segs';
        jlog(res);
        resumen.push(`${pack}: ${res.segsGrabados}s ${(res.video ? Math.round(res.video.bytes / 1048576) + 'MB' : 'SIN VIDEO')} fpsMed=${res.fps.med} errores=${(res.erroresConsola || []).length}`);
      } catch (e) {
        res.error = String(e && e.message || e).slice(0, 400);
        try { if (res.mime && !res.video) await evaluar(cdp, ses, `window.__rec && window.__rec.para('kimi129_${pack}_${ETIQUETA}.abortado.bin')`, 60); } catch (e2) { }
        jlog(res);
        resumen.push(`${pack}: ERROR ${res.error}`);
        log(`${pack}: ERROR ${res.error}`);
      }
    }
  } finally {
    if (tid) await cdp.call('Target.closeTarget', { targetId: tid }).catch(() => { });
    try { chrome.kill(); } catch (e) { }
    mataPorPerfil();
    srv.close();
    log('resumen: ' + JSON.stringify(resumen, null, 1));
    const mal = resumen.some(s => /ERROR|SIN VIDEO/.test(s));
    process.exit(mal ? 1 : 0);
  }
})().catch(e => { console.error('FALLO:', e.message); try { mataPorPerfil(); } catch (e2) { } process.exit(1); });
