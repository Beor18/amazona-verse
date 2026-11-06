#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-174(c): video corto con GPU real del hoyo 1 de minigolf.
   Entra con partida sembrada (?v18=1), carga los módulos v18 como el gesto real, juega el hoyo 1 con
   apuntado real (cámara + HUD con línea naranja y Vittata a un lado) y graba el lienzo con
   MediaRecorder (mp4/avc1) mientras rueda la física en tiempo real. Sin teletransportes: los tiros
   son Mg.tirar(f) en caliente, igual que pulsar Espacio en el juego.
   Salida: docs/img/kimi174/<nombre>.mp4 + k174v_<etiqueta>.json
   Uso: node tools/build/kimi1_174v.js --etiqueta video-r1 [--segs 30]
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
const ETIQUETA = arg('--etiqueta', 'video-r1');
const SEGS = parseInt(arg('--segs', '30'), 10);
const NOMBRE_MP4 = `k174_${ETIQUETA}.mp4`;
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi174');
fs.mkdirSync(SALIDA, { recursive: true });
const LOGF = path.join(SALIDA, `k174v_${ETIQUETA}.log`);
fs.writeFileSync(LOGF, '');
function log(msg) { try { fs.appendFileSync(LOGF, `[${new Date().toISOString().slice(11, 19)}] ${msg}\n`); } catch (e) { } }
function guardar(res) { try { fs.writeFileSync(path.join(SALIDA, `k174v_${ETIQUETA}.json`), JSON.stringify(res, null, 1)); } catch (e) { } }

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi1k174v-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.mp4': 'video/mp4' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (req.method === 'POST' && p === '/__kimi174/grabar') {
      const nombre = path.basename(new URL(req.url, 'http://x').searchParams.get('nombre') || 'video.mp4');
      const destino = path.join(SALIDA, nombre);
      const fd = fs.createWriteStream(destino);
      req.pipe(fd);
      return fd.on('finish', () => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ destino })); });
    }
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

const SEMILLA_SAVE_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  window.__erroresConsola = [];
  addEventListener('error', e => __erroresConsola.push(String(e.message || e)));
  addEventListener('unhandledrejection', e => __erroresConsola.push('rechazo: ' + (e.reason && e.reason.message || e.reason)));
  const cerr = console.error; console.error = function () { try { __erroresConsola.push([].map.call(arguments, String).join(' ').slice(0, 300)); } catch (e) {} return cerr.apply(this, arguments); };
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1k174v-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Golfista de Prueba', look: null },
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
  const G = AV.G, sleep = ms => new Promise(r => setTimeout(r, ms));
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(120); } return false; };
  if (!await espera(() => G.mundo && G.mundo.listo, 60000)) return 'ERR mundo no listo';
  try { window.dispatchEvent(new PointerEvent('pointerdown')); } catch (e) {}
  { const cargarScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('script ' + src)); document.head.appendChild(s); });
    const asegurar = async (src, fabrica) => {
      if (typeof window[fabrica] !== 'function' && !document.querySelector('script[src="' + src + '"]')) { try { await cargarScript(src); } catch (e) { throw e; } }
      const t0 = performance.now();
      while (typeof window[fabrica] !== 'function' && performance.now() - t0 < 20000) await sleep(200);
      if (typeof window[fabrica] !== 'function') throw new Error('sin fábrica ' + fabrica);
    };
    try {
      await asegurar('src/game/v18/progreso.js', 'AVV18Progreso'); window.AVV18Progreso(G);
      await asegurar('src/game/v18/habilidades.js', 'AVV18Habilidades'); window.AVV18Habilidades(G);
      await asegurar('src/game/v18/fx_poderes.js', 'AVV18Fx'); window.AVV18Fx(G);
      await asegurar('src/game/v18/combate.js', 'AVV18Combate'); window.AVV18Combate(G);
      await asegurar('src/game/v18/descubrir.js', 'AVV18Descubrir'); window.AVV18Descubrir(G);
      await asegurar('src/game/v18/minigolf.js', 'AVV18Minigolf'); window.AVV18Minigolf(G);
    } catch (e) { return 'ERR cargando v18: ' + (e && e.message || e); } }
  if (!(G.v18minigolf && G.v18 && G.v18fx)) return 'ERR módulos v18: golf=' + !!G.v18minigolf + ' v18=' + !!G.v18 + ' fx=' + !!G.v18fx;
  try { G.v18.desbloquear('vittata'); } catch (e) {}
  return 'ok golf=' + !!G.v18minigolf; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

// Grabador en página (mismo patrón que kimi1_129.js): MediaRecorder sobre canvas.captureStream(30).
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
      const r = await fetch('/__kimi174/grabar?nombre=' + encodeURIComponent(nombre), { method: 'POST', body: blob });
      const j = await r.json();
      return { mime, bytes: blob.size, destino: j.destino };
    }
  };
  return mime;
} catch (e) { return 'ERR ' + (e && e.message || e); } })()`;

// Juega el hoyo 1 en tiempo real mientras graba: apunta con la cámara (HUD con línea naranja y
// Vittata a un lado, como el jugador), tira con la fuerza del plano llano, deja rodar la física real.
const JUGAR_JS = `(async () => { try { return await (async () => {
  const Mg = AV.G.v18minigolf, G = AV.G, sleep = ms => new Promise(r => setTimeout(r, ms));
  const K = Mg.sitio, L = 18;
  const NIDO = { u: L / 2 - 2.2, v: 0 };
  const mundo = (u, v) => ({ x: K.x + K.ux * u + K.vx * v, z: K.z + K.uz * u + K.vz * v });
  const local = (x, z) => { const dx = x - K.x, dz = z - K.z; return { u: dx * K.ux + dz * K.uz, v: dx * K.vx + dz * K.vz }; };
  const ROCE_A = 1.4, ROCE_B = 0.55, VMIN = 1.5, VMAX = 13;
  const recorre = v0 => v0 / ROCE_B - ROCE_A / (ROCE_B * ROCE_B) * Math.log(1 + ROCE_B * v0 / ROCE_A);
  const fuerzaPara = d => { let lo = 0, hi = 1; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (recorre(VMIN + (VMAX - VMIN) * m) < d) lo = m; else hi = m; } return (lo + hi) / 2; };
  const RUTA = [{ u: 0.8, v: -2.0 }, { u: 3.8, v: -2.0 }];
  const esperaRueda = async ms => { const t0 = performance.now(); while (performance.now() - t0 < ms) { if (Mg.estado().fase === 'rueda') return true; await sleep(100); } return Mg.estado().fase === 'rueda'; };
  Mg.iniciar({ forzar: true });
  if (!await esperaRueda(15000)) return 'ERR fase tras iniciar: ' + Mg.estado().fase;
  const tiros = [];
  let iw = 0;
  const t0v = performance.now();
  while (Mg.estado().fase !== 'nido' && tiros.length < 6 && performance.now() - t0v < ${SEGS * 1000} - 2500) {
    const B = Mg.semilla();
    const q = local(B.x, B.z);
    while (iw < RUTA.length - 1 && (Math.hypot(q.u - RUTA[iw].u, q.v - RUTA[iw].v) < 1.0 || q.u > RUTA[iw].u + 0.5)) iw++;
    const w = (Math.hypot(q.u - NIDO.u, q.v - NIDO.v) < 5.5) ? NIDO : RUTA[iw];
    const wm = mundo(w.u, w.v);
    const ex = wm.x - B.x, ez = wm.z - B.z;
    G.camara.yaw = Math.atan2(-ex, -ez);
    await sleep(900); // la cámara asiente y se lee la línea de apuntado
    const d = Math.hypot(ex, ez);
    const f = Math.max(0.06, Math.min(1, fuerzaPara(d)));
    const r = Mg.tirar(f);
    if (!r || r.ok === false) { await sleep(400); continue; }
    tiros.push({ tiro: tiros.length + 1, fuerza: +f.toFixed(2) });
    await esperaRueda(30000);
  }
  const A = Mg.estado();
  await sleep(1200); // deja ver el nido / la tabla final
  return JSON.stringify({ fase: A.fase, golpes: A.golpes, tiros: tiros.length, medalla: A.fase === 'nido' ? Mg.medalla(A.golpes) : null });
})(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k174v-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--window-size=1280,720', 'about:blank'];
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi1k174v-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const res = { etiqueta: ETIQUETA, tarea: 'KIMI-174(c)', video: NOMBRE_MP4, segs: SEGS, pantalla: '1280x720 GPU real, MediaRecorder 1,6 Mbps' };
  const watch = setInterval(() => { try { guardar(res); } catch (e) { } }, 5000);
  try {
    log('lanzando Chrome y entrando (v18=1)...');
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
    const ent = await evaluar(cdp, ses, ENTRAR_JS, 120);
    if (!/^ok/.test(ent)) throw new Error('entrada: ' + ent);
    const prep = await evaluar(cdp, ses, PREP_JS, 150);
    if (!/^ok/.test(prep)) throw new Error('prep: ' + prep);
    log('prep ok (' + prep + ')');
    const mime = await evaluar(cdp, ses, REC_JS, 20);
    if (!/^video|^audio/.test(mime)) throw new Error('recorder: ' + mime);
    res.mime = mime;
    log('grabador listo (' + mime + '); jugando y grabando ' + SEGS + ' s...');
    await evaluar(cdp, ses, `window.__rec.empieza()`, 10, false);
    const jug = await evaluar(cdp, ses, JUGAR_JS, SEGS + 90);
    if (!/^\{/.test(jug)) throw new Error('jugar: ' + jug);
    res.juego = JSON.parse(jug);
    log('juego: ' + jug);
    await evaluar(cdp, ses, `window.__rec.para(${JSON.stringify(NOMBRE_MP4)})`, 60).then(r => { res.grabacion = r; }).catch(e => { res.falloPara = String(e && e.message || e); });
    log('grabación: ' + JSON.stringify(res.grabacion || res.falloPara));
    res.erroresConsola = await evaluar(cdp, ses, `(window.__erroresConsola || []).slice(0, 30)`, 15);
    log('errores de consola: ' + JSON.stringify(res.erroresConsola));
    const st = fs.statSync(path.join(SALIDA, NOMBRE_MP4));
    const head = Buffer.alloc(12); const fd = fs.openSync(path.join(SALIDA, NOMBRE_MP4), 'r'); fs.readSync(fd, head, 0, 12, 0); fs.closeSync(fd);
    res.mp4 = { bytes: st.size, firma: head.toString('latin1', 4, 8), mb: +(st.size / 1048576).toFixed(1) };
    log('mp4: ' + JSON.stringify(res.mp4));
    await cdp.call('Target.closeTarget', { targetId: tid }).catch(() => { });
  } catch (e) {
    res.fallo = String(e && e.message || e);
    log('FALLO: ' + res.fallo);
  } finally {
    clearInterval(watch);
    guardar(res);
    try { chrome.kill(); } catch (e) { }
    mataPorPerfil();
    srv.close();
    log('evidencia: ' + path.join(SALIDA, `k174v_${ETIQUETA}.json`));
    process.exit(res.fallo ? 1 : 0);
  }
})();
