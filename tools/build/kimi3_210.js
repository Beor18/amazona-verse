#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-210: cierre medido del encargo 📣 7-nov 14:40
   «agua_glb.js, bohio_redondo y toldo_pequeno cuando estén cerca».
   Desde la pose de spawn REAL (sin teleport): ¿el río (malla 'rio'), las instancias de
   bohio_redondo y toldo_pequeno caen en el frustum de la cámara inicial? (NDC + distancia)
   + captura de la vista de arranque + estado de la descarga del agua.
   Veredicto para decidir qué se puede diferir sin cambiar la vista de arranque.
   Uso: node tools/build/kimi3_210.js --etiqueta r1 [--calidades bajo,medio] */
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
const CALIDADES = arg('--calidades', 'bajo,medio').split(',').map(s => s.trim());
const CPU = parseInt(arg('--cpu', '1'), 10);
const ANCHO = 1600, ALTO = 900, DPR = 1;
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi210'));
fs.mkdirSync(SALIDA, { recursive: true });

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi3q210-/.test(d)) continue;
  try { const st = fs.statSync(path.join(os.tmpdir(), d)); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(path.join(os.tmpdir(), d), { recursive: true, force: true }); } catch (e) { }
}

// objetos del encargo (posiciones de assets/data/mapa_cap1.js; el spawn se mide en vivo)
const OBJETIVOS = [
  { id: 'toldo_pequeno', puntos: [[-138.498, 20.599, -46.125]] },
  { id: 'bohio_redondo', puntos: [[90.563, 8.11, 124.481], [-99.566, 14.652, 24.303], [123.334, 22.955, 32.084], [-25.064, 12.257, 13.121]] },
];

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
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi3q210-' + Math.random().toString(36).slice(2, 10),
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

// visibilidad desde la pose actual de cámara (sin teleport): NDC + distancia + enFrustum
const VISIBILIDAD_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G;
  try {
    await sleep(500); // deja asentar la cámara
    const cam = G.renderer.camera, S = G.S;
    cam.updateMatrixWorld(true);
    const spawn = [S.pos.x, S.pos.y, S.pos.z];
    const proj = (x, y, z) => { const v = new (Object.getPrototypeOf(cam.position).constructor)(x, y, z); v.project(cam); return { x: +v.x.toFixed(3), y: +v.y.toFixed(3), z: +v.z.toFixed(4), en: Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1 && v.z > -1 && v.z < 1 }; };
    const out = { spawn: spawn.map(v => +v.toFixed(1)), yaw: +(G.camara.yaw || 0).toFixed(3), objetos: {} };
    const rio = G.renderer.scene.getObjectByName('rio');
    out.rio = rio ? (() => { const b = rio.geometry.boundingSphere || (rio.geometry.computeBoundingSphere(), rio.geometry.boundingSphere);
        const c = b.center, r = b.radius;
        const ocho = []; let en = 0;
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const p = proj(c.x + Math.cos(a) * r, c.y, c.z + Math.sin(a) * r); ocho.push(p); if (p.en) en++; }
        return { centro: proj(c.x, c.y, c.z), radio: +r.toFixed(1), extremosEnFrustum: en, extremos: ocho, dCam: +cam.position.distanceTo(c).toFixed(1) }; })()
      : { cargado: false };
    for (const o of ${JSON.stringify(OBJETIVOS)}) {
      out.objetos[o.id] = o.puntos.map(p => { const q = proj(p[0], p[1], p[2]); q.d = +Math.hypot(p[0] - spawn[0], p[2] - spawn[2]).toFixed(1); q.pos = p; return q; });
    }
    // ¿instancias reales en el streaming y están cargadas (partes) ya?
    const STR = G.mundo && G.mundo.streaming;
    out.streaming = { instancias: (STR.instancias || []).filter(i => /bohio_redondo|toldo_pequeno/.test(i.modelo || '')).map(i => ({ m: i.modelo, x: i.pos && i.pos.x, z: i.pos && i.pos.z, listo: !!(i.partes || i.listo) })) };
    return JSON.stringify(out);
  } catch (e) { return 'ERR ' + (e && e.message || e); }
})()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3q210-'));
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi3q210-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf } = await lanzarChrome();
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  const l = fs.readFileSync(puertoFile, 'utf8').split('\n');
  const ws = new WebSocket(`ws://127.0.0.1:${parseInt(l[0], 10)}${l[1].trim()}`);
  const cdp = new CDP(ws); await cdp.listo();
  const res = { etiqueta: ETIQUETA, pantalla: `${ANCHO}x${ALTO}@${DPR} cpuX${CPU}`, calidades: {} };
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: false }, ses);
    if (CPU > 1) { try { await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses); } catch (e) { } }
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);

    for (const calidad of CALIDADES) {
      const rCal = {};
      try {
        await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&calidad=${calidad}` }, ses);
        const t0 = Date.now(); let listo = false;
        while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
          try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
          await cdp.bombear(0.5);
        }
        if (!listo) throw new Error('el juego no arrancó');
        const ent = await evaluar(cdp, ses, ENTRAR_JS, 120);
        if (!/^ok/.test(ent)) throw new Error('entrada: ' + ent);
        // ¿llegó el rio ya? (carga async durante la ventana inicial)
        rCal.visibilidadInmediata = await evaluar(cdp, ses, VISIBILIDAD_JS, 60);
        const foto = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 88 }, ses, 30000);
        fs.writeFileSync(path.join(SALIDA, `k210_${ETIQUETA}_${calidad}_spawn.jpg`), Buffer.from(foto.data, 'base64'));
        await cdp.bombear(4); // unos segundos de juego: el agua ya debería haber llegado
        rCal.visibilidadAsentada = await evaluar(cdp, ses, VISIBILIDAD_JS, 60);
        rCal.ok = true;
      } catch (e) { rCal.ok = false; rCal.error = String(e && e.message || e).slice(0, 400); }
      res.calidades[calidad] = rCal;
    }
  } catch (e) { res.fallo = String(e && e.message || e).slice(0, 400); }
  try { mataPorPerfil(); } catch (e) { }
  try { chrome.kill(); } catch (e) { }
  try { srv.close(); } catch (e) { }
  fs.writeFileSync(path.join(SALIDA, `k210_${ETIQUETA}.json`), JSON.stringify(res, null, 2));
  console.log(JSON.stringify(res, null, 2));
  process.exit(res.fallo ? 1 : 0);
})();
