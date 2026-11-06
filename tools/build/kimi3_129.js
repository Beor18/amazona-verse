#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-129: videos REALES por capítulo para Kelvin
   (📣 TAREAS_KIMI.md 1d, 6-nov 02:00 UTC: «un recorrido de 1 a 2 min por capítulo (caps. 1 a 6)
   con GPU real a 1080p, jugando con teclas (sin teletransportes), para que Kelvin los revise
   antes del playtest con niños» → 6 mp4 de ≤ 25 MB en docs/img/kimi129/).
     · grabación en página: MediaRecorder sobre canvas.captureStream(30) (mp4/avc1 si el Chrome
       lo soporta; detectado en vivo; sin ffmpeg en la PC). ~1,3 Mbps ⇒ ~90 s ≈ 15 MB ≤ 25.
     · jugado con input REAL por CDP (Input.dispatchKeyEvent: WASD/Q/R/Espacio/V/X); solo se lee
       estado (AV.state / G.camara.yaw / G.fisica.MOVE) para decidir la entrada y desatascar.
       Nada de teletransportes: se camina, se vuela y se mira alrededor como un niño.
     · semilla por pack (práctica del arnés, kimi1_127): cap1 → amazonaverse.save v6, los ep* →
       <pack>.save v1 + campos defensivos (lugares/canoa/edu). Entrada ?pack=<pack>&mapa=real.
   Salida: docs/img/kimi129/kimi129_<pack>_<etiqueta>.<mp4|webm> + .json + .jpg de referencia.
   Uso: node tools/build/kimi3_129.js [--packs cap1,ep2,...] [--etiqueta r1] [--secs 90]
        [--salida <dir>] [--solo cap1]
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
const PACKS = (arg('--packs', 'cap1,ep2,ep3,ep4,ep5,ep6') + '').split(',').map(s => s.trim()).filter(Boolean);
const SOLO = arg('--solo', '');
const ETIQUETA = arg('--etiqueta', 'r1');
const SECS = parseInt(arg('--secs', '90'), 10);
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi129'));
fs.mkdirSync(SALIDA, { recursive: true });
const LOGF = path.join(SALIDA, `kimi129_${ETIQUETA}.log`);
fs.writeFileSync(LOGF, '');
function log(msg) { try { fs.appendFileSync(LOGF, `[${new Date().toISOString().slice(11, 19)}] ${msg}\n`); } catch (e) { } console.log(msg); }
function guardar(res) { try { fs.writeFileSync(path.join(SALIDA, `kimi129_${ETIQUETA}.json`), JSON.stringify(res, null, 1)); } catch (e) { } }

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi3k129-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (req.method === 'POST' && u.pathname === '/__kimi129/grabar') {
      const nombre = path.basename(u.searchParams.get('nombre') || 'video.mp4');
      const dest = path.join(SALIDA, nombre);
      const f = fs.createWriteStream(dest);
      req.pipe(f);
      f.on('finish', () => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ destino: nombre })); });
      f.on('error', e => { res.writeHead(500); res.end(JSON.stringify({ error: String(e.message || e) })); });
      return;
    }
    let p = path.normalize(decodeURIComponent(u.pathname)).replace(/^(\.\.[/\\])+/, '');
    if (p === '/' || p === '\\') p = '/index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ)) { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); return res.end('404'); }
      res.writeHead(200, { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(d);
    });
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
function dormir(s) { return new Promise(r => setTimeout(r, s * 1000)); }

// Semilla por pack (kimi1_127, confirmado en vivo para los 6 packs).
function semillaSave(pack) {
  const clave = pack === 'cap1' ? 'amazonaverse.save' : pack + '.save';
  const v = pack === 'cap1' ? 6 : 1;
  const save = {
    v, formato: 2, escrito: Date.now(), saveId: 'qa-kimi3k129-' + Math.random().toString(36).slice(2, 10),
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
  const S = window.AV && window.AV.state; if (!S || !S.profile || !S.profile.created) return 'sin perfil';
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(30000);
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 60000);
  const b = document.getElementById('c1-saltar'); if (b) b.click();
  await sleep(800);
  const f = document.getElementById('c1-fade'); if (f) f.remove();
  if (AV.G.ui && AV.G.ui.hideToast) AV.G.ui.hideToast();
  try { window.dispatchEvent(new PointerEvent('pointerdown')); window.dispatchEvent(new PointerEvent('pointerup')); } catch (e) {}
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

// Grabador en página (mismo contrato que kimi3_121.js, probado en golf/demo/duelo).
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
    empieza() { chunks = []; rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: (window.__recBits || 1300000) }); rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); }; rec.start(400); },
    async para(nombre) {
      const blob = await new Promise(res => { rec.onstop = () => res(new Blob(chunks, { type: mime })); rec.stop(); });
      const r = await fetch('/__kimi129/grabar?nombre=' + encodeURIComponent(nombre), { method: 'POST', body: blob });
      const j = await r.json();
      return { mime, bytes: blob.size, destino: j.destino };
    }
  };
  return mime;
} catch (e) { return 'ERR ' + (e && e.message || e); } })()`;

const TECLAS = {
  w: { vk: 87, code: 'KeyW', key: 'w' }, a: { vk: 65, code: 'KeyA', key: 'a' }, s: { vk: 83, code: 'KeyS', key: 's' }, d: { vk: 68, code: 'KeyD', key: 'd' },
  q: { vk: 81, code: 'KeyQ', key: 'q' }, r: { vk: 82, code: 'KeyR', key: 'r' },
  e: { vk: 69, code: 'KeyE', key: 'e' }, v: { vk: 86, code: 'KeyV', key: 'v' }, x: { vk: 88, code: 'KeyX', key: 'x' },
  espacio: { vk: 32, code: 'Space', key: ' ' }
};
async function tecla(cdp, ses, nombre, abajo) {
  const t = TECLAS[nombre]; if (!t) return;
  await cdp.call('Input.dispatchKeyEvent', { type: abajo ? 'keyDown' : 'keyUp', windowsVirtualKeyCode: t.vk, code: t.code, key: t.key }, ses, 10000);
}
async function toque(cdp, ses, nombre, s) { await tecla(cdp, ses, nombre, true); await dormir(s); await tecla(cdp, ses, nombre, false); }

async function estadoTour(cdp, ses) {
  return JSON.parse(await evaluar(cdp, ses, `(() => { try { const G = AV.G, S = AV.state;
    return JSON.stringify({ x: S.pos.x, z: S.pos.z, y: S.pos.y, yaw: G.camara.yaw,
      volando: !!(G.fisica.MOVE && G.fisica.MOVE.flying) });
  } catch (e) { return JSON.stringify({ error: String(e && e.message || e) }); } })()`, 15));
}

// Recorrido "de niño": caminar con giros suaves y saltos → volar un rato y aterrizar →
// mirar alrededor → volver caminando hacia el spawn → unos saltitos de despedida.
// Todo con input real; la posición solo se LEE (desatasco y rumbo de vuelta).
async function recorrido(cdp, ses, res, log, durSec) {
  const t0 = Date.now();
  const inicio = await estadoTour(cdp, ses);
  if (inicio.error) throw new Error(inicio.error);
  const origen = { x: inicio.x, z: inicio.z };
  const stats = [];
  const muestreo = setInterval(async () => {
    try { const st = await evaluar(cdp, ses, `(() => { try { const s = AV.G.renderer.stats(); return JSON.stringify({ calls: s.calls, ktris: s.triangulos != null ? Math.round(s.triangulos / 1000) : null, fps: s.fps }); } catch (e) { return 'null'; } })()`, 10, false); const j = JSON.parse(st); if (j) stats.push(j); } catch (e) { }
  }, 1000);

  const FASES = [
    { nombre: 'caminar', frac: 0.32 },
    { nombre: 'volar', frac: 0.58 },
    { nombre: 'mirar', frac: 0.68 },
    { nombre: 'volver', frac: 0.92 },
    { nombre: 'saltos', frac: 1.01 }
  ];
  let fase = 0, ultPos = null, quietaDesde = null, ultGiro = 0, giroDir = 'q';
  while ((Date.now() - t0) / 1000 < durSec && fase < FASES.length) {
    const st = await estadoTour(cdp, ses);
    if (st.error) { await dormir(0.5); continue; }
    const fraccion = (Date.now() - t0) / 1000 / durSec;
    while (fase < FASES.length - 1 && fraccion >= FASES[fase].frac) { fase++; log(`fase: ${FASES[fase].nombre}`); await tecla(cdp, ses, 'w', false); }
    const nombre = FASES[fase].nombre;

    if (nombre === 'caminar' || nombre === 'volver') {
      // desatasco: si no avanza ~4 s, retroceder y girar fuerte
      if (ultPos && Math.hypot(st.x - ultPos.x, st.z - ultPos.z) < 0.35) { if (!quietaDesde) quietaDesde = Date.now(); }
      else quietaDesde = null;
      ultPos = { x: st.x, z: st.z };
      if (quietaDesde && Date.now() - quietaDesde > 4000) {
        log(`atasco a (${st.x.toFixed(1)},${st.z.toFixed(1)}); retrocediendo y girando`);
        await tecla(cdp, ses, 'w', false); await toque(cdp, ses, 's', 1.0);
        await toque(cdp, ses, giroDir === 'q' ? 'r' : 'q', 0.9);
        quietaDesde = null; continue;
      }
      let deseada = null;
      if (nombre === 'volver') { // rumbo al spawn (de frente si ya estamos cerca)
        const d = Math.hypot(origen.x - st.x, origen.z - st.z);
        if (d > 5) deseada = Math.atan2(-(origen.x - st.x), -(origen.z - st.z));
      }
      if (deseada == null) { // deambular: girar suave cada ~5 s
        if (Date.now() - ultGiro > 5000) { ultGiro = Date.now(); giroDir = Math.random() < 0.5 ? 'q' : 'r'; }
        await toque(cdp, ses, giroDir, 0.45);
      } else {
        const diff = ((deseada - st.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        if (Math.abs(diff) > 0.18) { await tecla(cdp, ses, 'w', false); await toque(cdp, ses, diff > 0 ? 'q' : 'r', Math.min(0.5, Math.abs(diff) / 2)); continue; }
      }
      if (Math.random() < 0.06) { await tecla(cdp, ses, 'w', false); await toque(cdp, ses, 'espacio', 0.12); }
      await tecla(cdp, ses, 'w', true); await dormir(0.3);
    } else if (nombre === 'volar') {
      await tecla(cdp, ses, 'w', false);
      if (!st.volando) {
        log('despegando (V)'); await toque(cdp, ses, 'v', 0.15); await dormir(2.2);
        await tecla(cdp, ses, 'espacio', true); await dormir(1.6); await tecla(cdp, ses, 'espacio', false);
      } else {
        if (Math.random() < 0.05) await toque(cdp, ses, Math.random() < 0.5 ? 'q' : 'r', 0.4);
        await tecla(cdp, ses, 'w', true); await dormir(0.5);
        if (Math.random() < 0.04) { await tecla(cdp, ses, 'espacio', true); await dormir(0.8); await tecla(cdp, ses, 'espacio', false); }
      }
    } else if (nombre === 'mirar') {
      await tecla(cdp, ses, 'w', false);
      if (st.volando) { log('aterrizando (X)'); await toque(cdp, ses, 'x', 0.15); await dormir(2.0); continue; }
      await toque(cdp, ses, 'q', 0.7); await dormir(0.3); await toque(cdp, ses, 'r', 1.3); await dormir(0.3); await toque(cdp, ses, 'q', 0.6);
      await dormir(0.8);
    } else if (nombre === 'saltos') {
      await tecla(cdp, ses, 'w', false);
      if (st.volando) { await toque(cdp, ses, 'x', 0.15); await dormir(1.8); continue; }
      await toque(cdp, ses, 'espacio', 0.12); await dormir(0.9);
    }
  }
  await tecla(cdp, ses, 'w', false); await tecla(cdp, ses, 'espacio', false);
  // cierre en tierra: si el take acabó en el aire, aterrizar antes de parar la grabación
  let fin = await estadoTour(cdp, ses);
  for (let i = 0; i < 12 && fin.volando; i++) { await toque(cdp, ses, 'x', 0.15); await dormir(1.0); fin = await estadoTour(cdp, ses); }
  clearInterval(muestreo);
  res.stats = stats;
  res.fin = { x: Math.round(fin.x * 10) / 10, z: Math.round(fin.z * 10) / 10, volando: fin.volando };
}

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3k129-'));
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
    await dormir(0.2);
  }
  throw new Error('Chrome no abrió DevTools en 30 s: ' + err.slice(0, 300));
}
function mataPorPerfil() {
  try {
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi3k129-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const res = { tarea: 'KIMI-129', etiqueta: ETIQUETA, pantalla: '1920x1080@DPR1 GPU real', secs: SECS, packs: {}, head: null };
  const watch = setInterval(() => { try { guardar(res); } catch (e) { } log('…latido'); }, 10000);
  let tid = null;
  async function paginaFresca(seedJS, url) {
    if (tid) { await cdp.call('Target.closeTarget', { targetId: tid }).catch(() => { }); tid = null; }
    tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
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
    return ses;
  }
  try {
    for (const pack of PACKS) {
      if (SOLO && pack !== SOLO) continue;
      try {
        log(`pack ${pack}: navegando y entrando...`);
        const ses = await paginaFresca(semillaSave(pack), `${origen}/index.html?pack=${pack}&mapa=real`);
        if (!res.head) res.head = await evaluar(cdp, ses, `(() => { try { return (AV.G.build && (AV.G.build.commit || AV.G.build.id)) || 'desconocido'; } catch (e) { return 'desconocido'; } })()`, 10);
        await dormir(2); // asentar la vista del spawn
        await evaluar(cdp, ses, `window.__recBits = 1300000`, 10, false);
        res.packs[pack] = {};
        res.packs[pack].mime = await evaluar(cdp, ses, REC_JS, 20, false);
        if (!res.packs[pack].mime || res.packs[pack].mime.indexOf('ERR') === 0) throw new Error('recorder: ' + res.packs[pack].mime);
        log(`pack ${pack}: grabando ${SECS} s (${res.packs[pack].mime})...`);
        await evaluar(cdp, ses, `window.__rec.empieza()`, 15, false);
        await recorrido(cdp, ses, res.packs[pack], log, SECS);
        log('parando la grabación y volcando el vídeo...');
        res.packs[pack].video = await evaluar(cdp, ses, `window.__rec.para('kimi129_${pack}_${ETIQUETA}.${res.packs[pack].mime.indexOf('mp4') >= 0 ? 'mp4' : 'webm'}')`, 120);
        const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 60000);
        fs.writeFileSync(path.join(SALIDA, `kimi129_${pack}_${ETIQUETA}.jpg`), Buffer.from(shot.data, 'base64'));
        res.packs[pack].erroresConsola = JSON.parse(await evaluar(cdp, ses, `JSON.stringify((window.__erroresConsola || []).slice(0, 12))`, 10, false));
        const st = (res.packs[pack].stats || []).filter(Boolean);
        const calls = st.map(x => x.calls).filter(x => x != null), kt = st.map(x => x.ktris).filter(x => x != null);
        log(`pack ${pack}: vídeo ${(res.packs[pack].video.bytes / 1048576).toFixed(1)} MB · calls med ${calls.length ? Math.round(calls.reduce((a, b) => a + b, 0) / calls.length) : '?'} · ktris med ${kt.length ? Math.round(kt.reduce((a, b) => a + b, 0) / kt.length) : '?'} · errores ${JSON.stringify(res.packs[pack].erroresConsola)}`);
      } catch (e) {
        res.packs[pack] = res.packs[pack] || {};
        res.packs[pack].error = String(e && e.message || e).slice(0, 300);
        log(`pack ${pack}: ERROR ${res.packs[pack].error}`);
        try { await evaluar(cdp, ses, `window.__rec && window.__rec.para('kimi129_${pack}_${ETIQUETA}.mp4')`, 60); } catch (e2) { }
      }
      guardar(res);
    }
  } finally {
    clearInterval(watch);
    guardar(res);
    log('fin; cerrando Chrome');
    try { chrome.kill(); } catch (e) { }
    mataPorPerfil();
    try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
    srv.close();
    setTimeout(() => process.exit(0), 500);
  }
})();
