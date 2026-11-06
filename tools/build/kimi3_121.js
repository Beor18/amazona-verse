#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-121: videos REALES de la demo V18.1 y del minigolf
   (📣 TAREAS_KIMI.md, 5-nov 23:15 UTC: «con GPU real a 1920×1080, graba una partida del ciclo ?v18=1
   (duelo → puente → cruce a pie → Sombra) y una partida completa del hoyo de minigolf de Villa Raíz
   (de entrar a meter la semilla, con el Grito del Yunque). Solo input real, nada de teletransportes»).
   Esta herramienta graba PRIMERO el del minigolf (--juego golf, el corto y autocontenido):
     · grabación en página: MediaRecorder sobre canvas.captureStream(30) del lienzo del juego
       (mp4/avc1 si el Chrome lo soporta —lo detecta en vivo—, si no vp9/webm; sin ffmpeg en la PC).
     · jugado con input REAL por CDP (Input.dispatchKeyEvent: WASD/Q/R/E/Espacio/flechas/G/Esc);
       solo se lee estado (AV.state / G.camara.yaw / G.v18minigolf.estado()) para decidir la entrada.
     · la semilla de partida (save con perfil creado) es la práctica habitual del arnés; la partida
       grabada empieza a ~10-15 m del hoyo y se juega entera a pie: acercarse → E → 1 jugador →
       apuntar con flechas → cargar Espacio y soltar → Grito del Yunque con G en la primera bola →
       hoyo → medalla → salir con Esc.
   Salida: docs/img/kimi121/kimi121_<juego>_<etiqueta>.<mp4|webm> + .json + captura de referencia .jpg
   Uso: node tools/build/kimi3_121.js [--juego golf] [--etiqueta r1] [--salida <dir>]
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
const JUEGO = arg('--juego', 'golf');
const ETIQUETA = arg('--etiqueta', 'r1');
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi121'));
fs.mkdirSync(SALIDA, { recursive: true });
const LOGF = path.join(SALIDA, `kimi121_${JUEGO}_${ETIQUETA}.log`);
fs.writeFileSync(LOGF, '');
function log(msg) { try { fs.appendFileSync(LOGF, `[${new Date().toISOString().slice(11, 19)}] ${msg}\n`); } catch (e) { } console.log(msg); }
function guardar(res) { try { fs.writeFileSync(path.join(SALIDA, `kimi121_${JUEGO}_${ETIQUETA}.json`), JSON.stringify(res, null, 1)); } catch (e) { } }

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi3k121-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (req.method === 'POST' && u.pathname === '/__kimi121/grabar') {
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

// Semilla: perfil creado, cap1, posición junto a Villa Raíz (a ~10-20 m de los dos anclajes del hoyo de minigolf).
const SEMILLA_SAVE_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  window.__erroresConsola = [];
  addEventListener('error', e => __erroresConsola.push(String(e.message || e)));
  addEventListener('unhandledrejection', e => __erroresConsola.push('rechazo: ' + (e.reason && e.reason.message || e.reason)));
  const cerr = console.error; console.error = function () { try { __erroresConsola.push([].map.call(arguments, String).join(' ').slice(0, 300)); } catch (e) {} return cerr.apply(this, arguments); };
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi3k121-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: 172, z: 190, y: 0 }, facing: { x: 0.7, z: 0.7 }, step: 0,
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
  try { window.dispatchEvent(new PointerEvent('pointerdown')); window.dispatchEvent(new PointerEvent('pointerup')); } catch (e) {}
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

// Grabador en página: MediaRecorder sobre el lienzo del juego. Devuelve el mime elegido.
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
    empieza() { chunks = []; rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2200000 }); rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); }; rec.start(400); },
    async para(nombre) {
      const blob = await new Promise(res => { rec.onstop = () => res(new Blob(chunks, { type: mime })); rec.stop(); });
      const r = await fetch('/__kimi121/grabar?nombre=' + encodeURIComponent(nombre), { method: 'POST', body: blob });
      const j = await r.json();
      return { mime, bytes: blob.size, destino: j.destino };
    }
  };
  return mime;
} catch (e) { return 'ERR ' + (e && e.message || e); } })()`;

const TECLAS = {
  w: { vk: 87, code: 'KeyW', key: 'w' }, a: { vk: 65, code: 'KeyA', key: 'a' }, s: { vk: 83, code: 'KeyS', key: 's' }, d: { vk: 68, code: 'KeyD', key: 'd' },
  q: { vk: 81, code: 'KeyQ', key: 'q' }, r: { vk: 82, code: 'KeyR', key: 'r' },
  e: { vk: 69, code: 'KeyE', key: 'e' }, g: { vk: 71, code: 'KeyG', key: 'g' }, enter: { vk: 13, code: 'Enter', key: 'Enter' },
  izq: { vk: 37, code: 'ArrowLeft', key: 'ArrowLeft' }, der: { vk: 39, code: 'ArrowRight', key: 'ArrowRight' },
  espacio: { vk: 32, code: 'Space', key: ' ' }, esc: { vk: 27, code: 'Escape', key: 'Escape' }
};
async function tecla(cdp, ses, nombre, abajo) {
  const t = TECLAS[nombre];
  await cdp.call('Input.dispatchKeyEvent', { type: abajo ? 'rawKeyDown' : 'keyUp', windowsVirtualKeyCode: t.vk, code: t.code, key: t.key }, ses, 10000);
}
const envolver = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const dormir = s => new Promise(r => setTimeout(r, s * 1000));

// Simula la física del hoyo (1D, misma constantes que minigolf.js) para estimar la carga que recorre d metros.
function cargaPara(d) {
  const dist = c => { let v = c * 13, x = 0, dt = 1 / 120, g = 0; while (v > 0.01 && x < 80 && g++ < 20000) { v -= (1.4 + 0.55 * v) * dt; if (v > 0) x += v * dt; } return x; };
  let lo = 0.05, hi = 0.97;
  for (let i = 0; i < 44; i++) { const m = (lo + hi) / 2; if (dist(m) < d) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3k121-'));
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi3k121-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

async function estadoGolf(cdp, ses) {
  return JSON.parse(await evaluar(cdp, ses, `(() => { try { const G = AV.G, MG = G.v18minigolf, S = AV.state; const A = MG.estado(), B = MG.semilla();
    return JSON.stringify({ fase: A.fase, eligiendo: !!A.eligiendo, golpes: A.golpes, carga: A.carga, cargando: !!A.cargando, grito: !!A.grito,
      bx: B.x, bz: B.z, mov: !!B.mov, x: S.pos.x, z: S.pos.z, yaw: G.camara.yaw, volando: !!G.fisica.MOVE.flying }); } catch (e) { return JSON.stringify({ error: String(e && e.message || e) }); } })()`, 15));
}
async function caminarHasta(cdp, ses, tx, tz, tol, res) {
  let ultD = 1e9, sinProgreso = 0, lado = 0;
  for (let i = 0; i < 200; i++) {
    const st = JSON.parse(await evaluar(cdp, ses, `(() => { const S = AV.state, G = AV.G; return JSON.stringify({ x: S.pos.x, z: S.pos.z, yaw: G.camara.yaw }); })()`, 15));
    const dx = tx - st.x, dz = tz - st.z, d = Math.hypot(dx, dz);
    if (d < tol) { log(`caminar: llegado a ${d.toFixed(1)} m de (${tx.toFixed(1)},${tz.toFixed(1)})`); await tecla(cdp, ses, 'w', false); return true; }
    if (d > ultD - 0.12) sinProgreso++; else sinProgreso = 0;
    ultD = d;
    if (sinProgreso >= 5) { // atascada contra un tronco/roca: esquivar con paso lateral manteniendo W
      lado = 1 - lado;
      const lat = lado ? 'a' : 'd';
      log(`caminar: atascada a ${d.toFixed(1)} m; esquivando con ${lat.toUpperCase()}`);
      await tecla(cdp, ses, 'w', true);
      await tecla(cdp, ses, lat, true);
      await dormir(0.7);
      await tecla(cdp, ses, lat, false);
      sinProgreso = 0;
      continue;
    }
    const deseada = Math.atan2(-dx, -dz);
    const diff = envolver(deseada - st.yaw);
    if (Math.abs(diff) > 0.12) {
      await tecla(cdp, ses, 'w', false);
      const t = diff > 0 ? 'q' : 'r';
      await tecla(cdp, ses, t, true);
      await dormir(Math.min(0.45, Math.abs(diff) / 1.8));
      await tecla(cdp, ses, t, false);
    } else {
      await tecla(cdp, ses, 'w', true);
      await dormir(0.22);
    }
    if (i % 30 === 29) log(`caminar: ${d.toFixed(1)} m, diff=${diff.toFixed(2)}`);
  }
  await tecla(cdp, ses, 'w', false);
  log('caminar: sin llegar (tope de pasos)');
  return false;
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const res = { tarea: 'KIMI-121', juego: JUEGO, etiqueta: ETIQUETA, pantalla: '1920x1080 dpr1 GPU real (RX 5700 XT), escritorio, CPU x1', entrada: 'CDP Input.dispatchKeyEvent (input real)', v18: true };
  const watch = setInterval(() => { try { guardar(res); } catch (e) { } }, 5000);
  const ext = () => (res.mime && res.mime.indexOf('mp4') >= 0) ? 'mp4' : 'webm';
  try {
    log('lanzando Chrome 1920x1080 (GPU real) y entrando con ?v18=1...');
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&v18=1` }, ses);
    const t0 = Date.now(); let listo = false;
    while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
      await cdp.bombear(0.5);
    }
    if (!listo) throw new Error('el juego no arrancó');
    log('juego listo, entrando...');
    const ent = await evaluar(cdp, ses, ENTRAR_JS, 120);
    if (!/^ok/.test(ent)) throw new Error('entrada: ' + ent);
    // Gesto real para que boot.js cargue los módulos v18 perezosos.
    await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: 960, y: 540, button: 'left', clickCount: 1 }, ses);
    await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 960, y: 540, button: 'left', clickCount: 1 }, ses);
    log('esperando G.v18minigolf...');
    let okGolf = false;
    for (let i = 0; i < 60; i++) { try { okGolf = await evaluar(cdp, ses, `!!(window.AV && AV.G && AV.G.v18minigolf && AV.G.v18minigolf.sitio)`, 10, false); } catch (e) { } if (okGolf) break; await dormir(1); }
    if (!okGolf) throw new Error('G.v18minigolf no cargó');
    const meta = JSON.parse(await evaluar(cdp, ses, `(() => { const K = AV.G.v18minigolf.sitio; const w = (u, v) => ({ x: K.x + K.ux * u + K.vx * v, z: K.z + K.uz * u + K.vz * v }); return JSON.stringify({ cx: K.x, cz: K.z, ux: K.ux, uz: K.uz, vx: K.vx, vz: K.vz, a: K.a, tee: w(-7.2, 0), nido: w(6.8, 0) }); })()`, 15));
    res.sitio = meta;
    log(`hoyo en (${meta.cx.toFixed(1)},${meta.cz.toFixed(1)}); tee=(${meta.tee.x.toFixed(1)},${meta.tee.z.toFixed(1)}); nido=(${meta.nido.x.toFixed(1)},${meta.nido.z.toFixed(1)})`);

    // Grabador
    res.mime = await evaluar(cdp, ses, REC_JS, 20, false);
    if (!res.mime || res.mime.indexOf('ERR') === 0) throw new Error('recorder: ' + res.mime);
    log('MediaRecorder mime: ' + res.mime);

    // Grabación: acercarse al hoyo + partida entera.
    await evaluar(cdp, ses, `window.__rec.empieza()`, 15, false);
    res.recStarted = new Date().toISOString();
    log('grabando: caminando hasta el hoyo...');
    res.llego = await caminarHasta(cdp, ses, meta.tee.x, meta.tee.z, 2.2, res);
    // Un gesto de cámara hacia el hoyo para que se vea el nido al entrar.
    await dormir(0.6);

    // Entrar: E (Acción) junto a la semilla → «¿Cuántos juegan?» → Enter = 1 jugador.
    log('pulsando E para abrir el hoyo...');
    await tecla(cdp, ses, 'e', true); await dormir(0.12); await tecla(cdp, ses, 'e', false);
    let st = await estadoGolf(cdp, ses);
    for (let i = 0; i < 20 && (!st.fase || st.fase === 'nada'); i++) { await dormir(0.5); st = await estadoGolf(cdp, ses); }
    if (!st.eligiendo) { // radio de interacción corto: acercarse más y repetir la E
      log('no abrió a 2,2 m: acercando a 1,2 m y repitiendo E');
      await caminarHasta(cdp, ses, meta.tee.x, meta.tee.z, 1.2, res);
      await tecla(cdp, ses, 'e', true); await dormir(0.12); await tecla(cdp, ses, 'e', false);
      for (let i = 0; i < 20 && (!st.fase || st.fase === 'nada'); i++) { await dormir(0.5); st = await estadoGolf(cdp, ses); }
    }
    if (!st.eligiendo) throw new Error('el hoyo no abrió (fase=' + st.fase + ')');
    log('eligiendo jugadores: Enter = 1 jugador');
    await dormir(0.8);
    await tecla(cdp, ses, 'enter', true); await dormir(0.12); await tecla(cdp, ses, 'enter', false);
    for (let i = 0; i < 20; i++) { await dormir(0.4); st = await estadoGolf(cdp, ses); if (st.fase === 'apuntar') break; }
    if (st.fase !== 'apuntar') throw new Error('no llegó a fase apuntar (fase=' + st.fase + ')');
    log('hoyo abierto. Jugando con input real (flechas apuntan, Espacio carga y suelta, G grita)...');

    // Referencia visual a mitad de grabación.
    await cdp.bombear(1.5);
    try {
      const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 80 }, ses, 20000);
      fs.writeFileSync(path.join(SALIDA, `kimi121_${JUEGO}_${ETIQUETA}_ref.jpg`), Buffer.from(shot.data, 'base64'));
    } catch (e) { log('captura ref: ' + e.message); }

    // Partida: golpes hasta que entre en el nido (tope 10).
    let bias = 1.0, gritado = false, hundido = false;
    for (let golpe = 1; golpe <= 10; golpe++) {
      st = await estadoGolf(cdp, ses);
      if (st.fase === 'nido') { hundido = true; break; }
      if (st.fase !== 'apuntar') { await dormir(0.5); continue; }
      // Estrategia del hoyo (zigzag por los huecos de los troncos, como diseña el juego):
      //   local u a lo largo del hoyo; troncos en u=-2.5 (hueco v≈+2) y u=+2.0 (hueco v≈-2).
      const aLocal = (x, z) => { const dx = x - meta.cx, dz = z - meta.cz; return { u: dx * meta.ux + dz * meta.uz, v: dx * meta.vx + dz * meta.vz }; };
      const aMundo = (u, v) => ({ x: meta.cx + meta.ux * u + meta.vx * v, z: meta.cz + meta.uz * u + meta.vz * v });
      const loc = aLocal(st.bx, st.bz);
      const objL = loc.u < -2.9 ? { u: -2.5, v: 2.2 } : loc.u < 1.6 ? { u: 2.0, v: -2.2 } : { u: 6.8, v: 0 };
      const objW = aMundo(objL.u, objL.v);
      // Apuntar: girar la cámara con flechas hasta que dir() mire de la semilla al objetivo.
      for (let i = 0; i < 24; i++) {
        const deseada = Math.atan2(-(objW.x - st.bx), -(objW.z - st.bz));
        const diff = envolver(deseada - st.yaw);
        if (Math.abs(diff) < 0.035) break;
        const t = diff > 0 ? 'izq' : 'der'; // izq: camara.yaw += GIRO*dt
        await tecla(cdp, ses, t, true);
        await dormir(Math.min(0.6, Math.abs(diff) / 1.1));
        await tecla(cdp, ses, t, false);
        st = await estadoGolf(cdp, ses);
        if (st.fase !== 'apuntar') break;
      }
      if (st.fase !== 'apuntar') { continue; }
      const d = Math.hypot(objW.x - st.bx, objW.z - st.bz);
      const objetivo = Math.min(0.62, Math.max(0.1, cargaPara(d) * 0.62 * bias));
      log(`golpe ${golpe}: d=${d.toFixed(1)} m → carga objetivo ${objetivo.toFixed(2)} (bias ${bias.toFixed(2)})`);
      // Cargar: mantener Espacio hasta A.carga ≈ objetivo (subida 0→1 en PERIODO 1.3 s).
      await tecla(cdp, ses, 'espacio', true);
      let s2 = st, tCarga = Date.now();
      while (Date.now() - tCarga < 6000) {
        await dormir(0.045);
        s2 = await estadoGolf(cdp, ses);
        if (s2.fase !== 'apuntar' && s2.fase !== 'rueda') break; // ya soltó por E/otro
        if (s2.fase === 'rueda') break; // soltado (p. ej. por la propia tecla)
        if (s2.carga >= objetivo) break;
      }
      if (s2.fase === 'apuntar' && s2.cargando !== false) { await tecla(cdp, ses, 'espacio', false); }
      // Esperar a que la bola ruede; en la primera larga, Grito del Yunque.
      await dormir(0.55);
      let s3 = await estadoGolf(cdp, ses);
      if (!gritado && s3.fase === 'rueda' && s3.mov) {
        log('Grito del Yunque (G) con la semilla rodando');
        await tecla(cdp, ses, 'g', true); await dormir(0.12); await tecla(cdp, ses, 'g', false);
        gritado = true;
      }
      // Esperar fin del tiro.
      const tEspera = Date.now();
      while (Date.now() - tEspera < 16000) {
        await dormir(0.3);
        s3 = await estadoGolf(cdp, ses);
        if (s3.fase !== 'rueda') break;
      }
      if (s3.fase === 'nido') { hundido = true; log('¡semilla en el nido!'); break; }
      // Ajuste de bias por resultado.
      if (s3.fase === 'apuntar') {
        const d2 = Math.hypot(meta.nido.x - s3.bx, meta.nido.z - s3.bz);
        if (d2 > d - 0.3) bias = Math.min(1.6, bias * 1.12); // se quedó corta
        else if (d2 < 2.0) bias = Math.max(0.6, bias * 0.9);
      }
      if (s3.fase === 'turno' || s3.fase === 'nada') break;
    }
    res.golpes = (await estadoGolf(cdp, ses)).golpes;
    res.gritoUsado = gritado;
    res.hundido = hundido;
    // Veredicto/medalla en pantalla, salir con Esc.
    await dormir(2.6);
    await tecla(cdp, ses, 'esc', true); await dormir(0.12); await tecla(cdp, ses, 'esc', false);
    await dormir(1.2);
    log('parando la grabación y volcando el vídeo...');
    res.video = await evaluar(cdp, ses, `window.__rec.para('kimi121_${JUEGO}_${ETIQUETA}.${ext()}')`, 120);
    log(`vídeo: ${JSON.stringify(res.video)}`);
    res.erroresConsola = await evaluar(cdp, ses, `(window.__erroresConsola || []).slice(0, 30)`, 15);
    await cdp.call('Target.closeTarget', { targetId: tid }).catch(() => { });
  } catch (e) {
    res.fallo = String(e && e.message || e);
    log('FALLO: ' + res.fallo);
    try {
      res.video = await evaluar(cdp, ses, `window.__rec && window.__rec.para('kimi121_${JUEGO}_${ETIQUETA}_parcial.${ext()}')`, 120);
      log(`vídeo parcial: ${JSON.stringify(res.video)}`);
    } catch (e2) { }
  } finally {
    clearInterval(watch);
    guardar(res);
    try { chrome.kill(); } catch (e) { }
    mataPorPerfil();
    srv.close();
    log('evidencia en ' + SALIDA);
    process.exit(res.fallo && !res.video ? 1 : 0);
  }
})();
