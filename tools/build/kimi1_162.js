#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-162: conectar la máquina nueva del puerto (BM165, maquina_puerto.glb)
   en src/game/v18/puerto.js si se ve mejor que la de primitivas. Esta herramienta:
   1) Página con ?v18=1 (semilla cap1): puente reparado, teleport junto a la máquina, carga diferida del GLB y
      capturas de los 3 estados (bloqueando «trabada», apagada, reconvertida) con stats (FPS/draw calls/tris).
   2) Página fresca: AV.v18PuertoTest() completo.
   Evidencia en docs/img/kimi162/. Uso: node tools/build/kimi1_162.js --etiqueta r1 */
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
const PF = { w: 1366, h: 768, dpr: 1 };
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi162'));
fs.mkdirSync(SALIDA, { recursive: true });
const LOGF = path.join(SALIDA, `k162_${ETIQUETA}.log`);
fs.writeFileSync(LOGF, '');
function log(msg) { try { fs.appendFileSync(LOGF, `[${new Date().toISOString().slice(11, 19)}] ${msg}\n`); } catch (e) { } }
const res = { tarea: 'KIMI-162', etiqueta: ETIQUETA, estados: {}, pruebas: {}, capturas: [], consola: null };
function guardar() { try { fs.writeFileSync(path.join(SALIDA, `k162_${ETIQUETA}.json`), JSON.stringify(res, null, 1)); } catch (e) { } }
guardar();

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi1k162-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res2) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res2.writeHead(400); return res2.end(); }
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res2.writeHead(403); return res2.end(); }
    fs.readFile(f, (e, d) => { if (e) { res2.writeHead(404); return res2.end('404'); } res2.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res2.end(d); });
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
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1k162-' + Math.random().toString(36).slice(2, 10),
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
  const jugar = Array.from(document.querySelectorAll('button')).find(x => /a jugar/i.test(x.textContent || '')); if (jugar) jugar.click();
  await sleep(300);
  try { window.dispatchEvent(new PointerEvent('pointerdown')); } catch (e) {}
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

// Sitio: la máquina «encendida» (bloqueando), apagada y reconvertida; stats y firma del modelo en cada estado.
const ESTADOS_JS = `(async () => { try { return await (async () => {
  const G = AV.G, sleep = ms => new Promise(r => setTimeout(r, ms));
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(120); } return false; };
  if (!await espera(() => G.mundo && G.mundo.listo, 90000)) return 'ERR mundo no listo';
  // la cadena v18 (progreso, npc, puerto) carga «al primer gesto»: esperarla antes de tocar el mundo
  if (!await espera(() => G.v18puerto && G.v18puerto.valido, 60000)) return 'ERR el módulo del puerto no cargó';
  G.quiet = true;
  try { G.v18.cambiarMundo('puente_villa', 'reparado'); } catch (e) { return 'ERR cambiarMundo puente: ' + e.message; }
  const ST = () => { try { const st = G.mundo && G.mundo.streaming && G.mundo.streaming.stats(); return st || null; } catch (e) { return null; } };
  const asentar = async (msMax) => { const t0 = performance.now(); let q = 0; while (performance.now() - t0 < msMax) { const st = ST(); if (st && st.trabajos === 0 && st.descargando === 0) { if (++q >= 2) break; } else q = 0; await sleep(1000); } await sleep(800); return ST(); };
  await asentar(60000);
  // Vittata a ~9 m de la máquina (en el eje de la escalera, mirándola); la cámara se asienta detrás
  const P = G.v18puerto.SITIO, a = P.a, b = P.b, L = Math.hypot(b.x - a.x, b.z - a.z), U = { x: (b.x - a.x) / L, z: (b.z - a.z) / L };
  const mx = a.x + U.x * 2.7, mz = a.z + U.z * 2.7;            // posición de la máquina (MAQ.on)
  const px = a.x - U.x * 6.4, pz = a.z - U.z * 6.4;           // ~9 m al otro lado
  const mirar = () => { const dx = mx - G.S.pos.x, dz = mz - G.S.pos.z, d = Math.hypot(dx, dz) || 1; G.S.facing.x = dx / d; G.S.facing.z = dz / d; G.camara.yaw = Math.atan2(-dx, -dz); };
  const ir = () => { G.S.pos.x = px; G.S.pos.z = pz; G.S.pos.y = G.terreno.height(px, pz) + 0.02; G.S.vy = 0; mirar(); };
  ir();
  // oculta el HUD para las capturas (el modelo es lo que se evalúa)
  for (const id of ['quest', 'minimapa', 'toast', 'v18-puerto']) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
  document.body.classList.remove('v18-puerto-on');
  // la carga diferida dispara al estar a < 110 m: espera a que el GLB esté montado
  const modelo = () => { try { return !!G.renderer.scene.getObjectByName('v18-puerto-maquina-glb'); } catch (e) { return false; } };
  if (!await espera(modelo, 45000)) {
    const diag = { err: window.__erroresConsola || [], mapa: null, pos: null, maq: null, manual: null };
    try { diag.mapa = G.v18puerto.mapa(); } catch (e) { diag.mapa = 'EX ' + e.message; }
    try { diag.pos = { x: Math.round(G.S.pos.x * 10) / 10, z: Math.round(G.S.pos.z * 10) / 10 }; } catch (e) { }
    try { const mq = G.v18puerto.maq(); diag.maq = { cargando: mq.cargando, pintada: mq.pintada, nodos: !!mq.nodos }; } catch (e) { diag.maq = 'EX ' + e.message; }
    try {
      const g = await G.assets.loadGLB('assets/models/personajes/maquina_puerto.glb', { b64: () => (window.AV_PERSONAJES_B64 || {}).maquina_puerto, script: 'assets/models/personajes/maquina_puerto_glb.js', base: '', error: 'x' });
      diag.manual = g ? 'OK' : 'null';
    } catch (e) { diag.manual = 'ERR ' + (e && e.message || e); }
    return 'ERR el modelo de la máquina no cargó: ' + JSON.stringify(diag);
  }
  await sleep(1500); // cámara asentada y primer pintado
  const out = { maquina: { x: Math.round(mx * 10) / 10, z: Math.round(mz * 10) / 10 }, modeloCargado: true };
  out.recursosMaquina = performance.getEntriesByType('resource').map(r => r.name).filter(n => /maquina_puerto/.test(n));
  const stats = () => { const s = G.renderer.stats(); return { fps: s.fps, calls: s.calls, triangulos: s.triangulos, calidad: s.calidad }; };
  const pintar = async (estado) => {
    try { G.v18.cambiarMundo('puerto_mina', estado); } catch (e) {}
    G.emit('apply'); await sleep(1600);
    ir(); await sleep(900);
    return { estado, stats: stats(), modo: (G.v18puerto.sesion(), G.v18puerto.estado()) };
  };
  out.bloqueando = await pintar('descubierto');   // «trabada»: amarilla, humo, alarma
  out.apagada = await pintar('desactivado');
  out.reconvertida = await pintar('reparado');
  const g = G.renderer.scene.getObjectByName('v18-puerto-maquina-glb');
  let vis = 0, tot = 0; g.traverse(o => { if (o.isMesh) { tot++; if (o.visible) vis++; } });
  out.mallas = { total: tot, visiblesReconvertida: vis };
  return out; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k162-'));
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi1k162-*' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}
async function foto(cdp, ses, nombre) {
  const r = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 78 }, ses, 30000);
  const f = path.join(SALIDA, nombre);
  fs.writeFileSync(f, Buffer.from(r.data, 'base64'));
  res.capturas.push(nombre);
  log('captura ' + nombre + ' ' + Math.round(fs.statSync(f).size / 1024) + ' KB');
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  log('chrome listo; servidor :' + puerto);
  const watch = setInterval(() => { try { guardar(); } catch (e) { } }, 5000);
  let cerrado = false;
  const cierra = async (motivo) => {
    if (cerrado) return; cerrado = true; clearInterval(watch);
    try { mataPorPerfil(); } catch (e) { }
    try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
    try { srv.close(); } catch (e) { }
    log('cerrado: ' + motivo);
  };
  let ses = null;
  const nuevaPagina = async (url) => {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: PF.w, height: PF.h, deviceScaleFactor: PF.dpr, mobile: false }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
    await cdp.call('Page.navigate', { url }, ses);
    await cdp.bombear(2.5);
  };
  try {
    // 1) Capturas de los estados con GPU real
    await nuevaPagina(`${origen}/index.html?pack=cap1&mapa=real&v18=1`);
    const ent = await evaluar(cdp, ses, ENTRAR_JS, 120);
    log('entrar: ' + ent);
    if (String(ent) !== 'ok') throw new Error('entrada: ' + ent);
    const est = await evaluar(cdp, ses, ESTADOS_JS, 240);
    if (typeof est === 'string') throw new Error(est);
    res.estados = est; guardar();
    log('estados: ' + JSON.stringify(est));
    // recorre de nuevo para las fotos (el orden de pintar ya quedó en reconvertida: se repinta por foto)
    const fotoDe = async (estado, nombre) => {
      await evaluar(cdp, ses, `(() => { try { AV.G.v18.cambiarMundo('puerto_mina', '${estado}'); } catch (e) {} AV.G.emit('apply'); return true; })()`, 20, false);
      await cdp.bombear(2.2);
      await foto(cdp, ses, nombre);
    };
    await fotoDe('descubierto', `k162_${ETIQUETA}_bloqueando.jpg`);
    await fotoDe('desactivado', `k162_${ETIQUETA}_apagada.jpg`);
    await fotoDe('reparado', `k162_${ETIQUETA}_reconvertida.jpg`);
    try { res.consola = await evaluar(cdp, ses, 'window.__erroresConsola || []', 20); guardar(); } catch (e) { }
    log('consola capturas: ' + JSON.stringify(res.consola));
    // 2) Página fresca: v18PuertoTest completo
    await nuevaPagina(`${origen}/index.html?pack=cap1&mapa=real&v18=1`);
    const ent2 = await evaluar(cdp, ses, ENTRAR_JS, 120);
    if (String(ent2) !== 'ok') throw new Error('entrada 2: ' + ent2);
    const pt = await evaluar(cdp, ses, `(async () => { const r = await AV.v18PuertoTest(); return { passed: r.passed, total: r.total, fallos: r.results.filter(x => !x.ok).map(x => x.name + ' :: ' + x.extra) }; })()`, 420);
    res.pruebas.v18PuertoTest = pt; guardar();
    log('v18PuertoTest ' + pt.passed + '/' + pt.total + (pt.fallos.length ? ' fallos: ' + pt.fallos.join(' | ') : ''));
    try { const c2 = await evaluar(cdp, ses, 'window.__erroresConsola || []', 20); res.consola = (res.consola || []).concat(c2 || []); guardar(); } catch (e) { }
    log('consola total: ' + JSON.stringify(res.consola));
    await cierra('ok');
    process.exit(0);
  } catch (e) {
    res.error = String(e && e.stack || e).slice(0, 800); guardar();
    log('ERROR ' + res.error);
    try { res.consola = ses ? await evaluar(cdp, ses, 'window.__erroresConsola || []', 20) : null; guardar(); } catch (e2) { }
    await cierra('error');
    process.exit(1);
  }
})();
