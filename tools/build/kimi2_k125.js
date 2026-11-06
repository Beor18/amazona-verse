#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-125: «antes» medido de los 12 edificios graves.
   Para cada edificio: teleport a su instancia real (mapa cap1), asentado de streaming,
   captura + stats (calls/tris/FPS/memoria). El cambio de edificio lo hace la Mac (Blender);
   aquí queda la evidencia comparable y los triángulos reales (kimi2_k125_datos.js).
   Uso: node tools/build/kimi2_k125.js --etiqueta r1 [--calidad medio] [--solo id1,id2] */
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
const CALIDAD = arg('--calidad', 'medio');
const CPU = parseInt(arg('--cpu', '1'), 10);
const ANCHO = 1600, ALTO = 900, DPR = 1;
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi125'));
fs.mkdirSync(SALIDA, { recursive: true });

// instancia real de cada edificio (kimi2_k125_datos.js sobre mapa_cap1.js) + radio/alto del kit
const BLOSQUES = [
  ['templo_grande', 25.426, 93.537, -127.852, 32.23, 22.01],
  ['templo_grande_a', 25.366, 92.434, -154.405, 46.23, 42.72],
  ['templo_grande_d', 175.69, 54.473, -7.425, 26.17, 20.72],
  ['templo_grande_e', -8.35, 91.344, -150.805, 32.01, 25.03],
  ['templo_grande_f', 9.544, 94.236, -140.198, 32.63, 29.93],
  ['templo_mediano', -60.975, 96.3, -137.13, 12.77, 9.8],
  ['templo_mediano_f', -67.114, 94.383, -125.086, 17.29, 14.05],
  ['templo_mediano_g', -74.767, 94.25, -133.695, 11.32, 9.68],
  ['templo_mediano_h', 14.958, 85.662, -113.54, 10.97, 8.99],
  ['monumento_g', 102.205, 10.84, 65.545, 21.12, 15.66],
  ['corral', -4.55, 15.65, 41.05, 9.94, 4.34],
  ['complejo_ruinas', -18.517, 35.7, 177.2, 48.49, 23.8],
];
const solo = arg('--solo', '');
const LISTA = solo ? solo.split(',').map(s => s.trim()) : BLOSQUES.map(b => b[0]);

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi2k125-/.test(d)) continue;
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
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi2k125-' + Math.random().toString(36).slice(2, 10),
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

// teleport con asentado; viewpoint al suroeste del edificio mirando a su centro
const IR_A = `(async (px, py, pz, radio, alto) => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
  const dist = Math.max(24, Math.round(radio * 0.75 + 14));
  const vx = px + dist * 0.7, vz = pz + dist * 0.7;
  const vy = Math.max(G.terreno.height(vx, vz) + 3, py + alto * 0.45);
  S.pos.x = vx; S.pos.z = vz; S.pos.y = vy + 10; S.vy = 0;
  G.fisica.MOVE.flying = true; G.fisica.MOVE.landing = false;
  const yaw = Math.atan2(-(px - vx), -(pz - vz));
  G.camara.yaw = yaw; S.facing = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
  const ST = G.mundo && G.mundo.streaming;
  if (ST) { if (ST.alrededor) await ST.alrededor(vx, vz); if (ST.terminar) await ST.terminar(); }
  if (G.solidos && G.solidos.terminar) G.solidos.terminar();
  await sleep(1200);
  S.pos.x = vx; S.pos.z = vz; S.pos.y = vy; S.vy = 0;
  G.fisica.MOVE.flying = true; G.fisica.MOVE.landing = false;
  G.camara.yaw = yaw; if (G.camara.place) G.camara.place(true);
  await sleep(400);
  S.pos.x = vx; S.pos.z = vz; S.pos.y = vy; S.vy = 0; G.camara.yaw = yaw; if (G.camara.place) G.camara.place(true);
  return 'ok ' + JSON.stringify({ v: [Math.round(vx*10)/10, Math.round(vy*10)/10, Math.round(vz*10)/10], d: Math.round(Math.hypot(px-vx, pz-vz)*10)/10 });
})`;

const STATS_JS = `(() => { const AV = window.AV, G = AV.G; try {
  const st = G.renderer.stats ? G.renderer.stats() : null;
  return JSON.stringify({ calls: st && st.calls, tris: st && st.triangulos, fps: st && st.fps, calidad: st && st.calidad,
    heap: Math.round((performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0)),
    tex: G.renderer.renderer.info.memory.textures, geo: G.renderer.renderer.info.memory.geometries,
    prog: G.renderer.renderer.info.programs.length,
    calidad: G.setCalidad ? undefined : undefined });
} catch (e) { return 'ERR ' + e.message; } })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2k125-'));
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi2k125-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const res = { etiqueta: ETIQUETA, pantalla: `${ANCHO}x${ALTO}@${DPR} cpuX${CPU}`, calidad: CALIDAD, edificios: {} };
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: false }, ses);
    if (CPU > 1) { try { await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses); } catch (e) { } }
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&calidad=${CALIDAD}` }, ses);
    const t0 = Date.now(); let listo = false;
    while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
      await cdp.bombear(0.5);
    }
    if (!listo) throw new Error('el juego no arrancó');
    const ent = await evaluar(cdp, ses, ENTRAR_JS, 120);
    if (!/^ok/.test(ent)) throw new Error('entrada: ' + ent);

    for (const [id, x, y, z, radio, alto] of BLOSQUES) {
      if (!LISTA.includes(id)) continue;
      try {
        const ir = await evaluar(cdp, ses, `(${IR_A})(${x}, ${y}, ${z}, ${radio}, ${alto})`, 240);
        await cdp.bombear(0.6);
        const stats = JSON.parse(await evaluar(cdp, ses, STATS_JS, 30));
        const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 60000);
        fs.writeFileSync(path.join(SALIDA, `k125_${ETIQUETA}_${id}.jpg`), Buffer.from(shot.data, 'base64'));
        res.edificios[id] = { teleport: ir, stats };
        console.log(`  ${id}: ${ir} · calls=${stats.calls} tris=${stats.tris} fps=${stats.fps} heap=${stats.heap} tex=${stats.tex} geo=${stats.geo}`);
      } catch (e) {
        res.edificios[id] = { error: String(e && e.message || e).slice(0, 200) };
        console.log(`  ${id}: ERROR ${res.edificios[id].error}`);
      }
    }
    const errores = await evaluar(cdp, ses, `(window.__aveErrores || []).length`, 10, false);
    res.erroresConsola = errores;
    console.log('· errores de consola: ' + errores);
  } catch (e) {
    res.error = String(e && e.message || e).slice(0, 400);
    console.error('ERROR: ' + res.error);
  } finally {
    fs.writeFileSync(path.join(SALIDA, `k125_${ETIQUETA}.json`), JSON.stringify(res, null, 1));
    try { ws.close(); } catch (e) { }
    try { chrome.kill(); } catch (e) { }
    mataPorPerfil();
    try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
    srv.close();
  }
  console.log('evidencia en ' + SALIDA);
})();
