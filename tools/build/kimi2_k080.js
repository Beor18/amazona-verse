#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-080: franja gris en el horizonte del cielo de noche
   (cap. 5, Los Miradores, mapa real). Reproduce en vivo con GPU real: perfil vertical de píxeles
   (luma) cruzando el horizonte para CUANTIFICAR la franja, y ablación por capas (niebla / banda de
   horizonte del shader del cielo / mar) para ATRIBUIRLA. El juego no se toca: solo se leen
   uniformes y se restauran. Capturas JPEG + JSON en docs/img/kimi080/.
   Uso: node tools/build/kimi2_k080.js --etiqueta r1 [--x -63] [--z -146] [--yaw 3.1416] [--cpu 1]
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
const ETIQUETA = arg('--etiqueta', 'r1');
const CPU = parseInt(arg('--cpu', '1'), 10);
const X = parseFloat(arg('--x', '-63')), Z = parseFloat(arg('--z', '-146')), YAW = parseFloat(arg('--yaw', String(Math.PI)));
const W = 1600, H = 900, DPR = 1;
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi080'));
fs.mkdirSync(SALIDA, { recursive: true });

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi2k80-/.test(d)) continue;
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

const SEMILLA_SAVE_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('ep5.save', JSON.stringify({
    v: 1, formato: 2, escrito: Date.now(), saveId: 'qa-kimi2k80-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -46, z: -121, y: 0 }, vy: 0, facing: { x: 0, z: -1 },
    step: 0, inv: {}, collected: [], complete: false, explorando: false,
    water: 0, event: null, clock: 0, events: [], captures: {},
    missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    edu: { inicio: null, fin: null, fichas: [], formativa: {}, registro: null }, lugares: []
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
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

// Perfil vertical de píxeles + ablación por capas. Todo se restaura.
// Dos vistas: (A) la del jugador desde el mirador (a pie) y (B) aérea limpia sobre el mar mirando al norte
// (horizonte puro cielo→mar, sin primero plano). La niebla se queda poniendo near/far enormes (solo uniformes).
const MEDICION_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G;
  const out = {};
  if ('quiet' in G) G.quiet = true;
  const R = G.renderer;
  const quitarUi = async () => { for (let i = 0; i < 8; i++) {
    const j = Array.from(document.querySelectorAll('button')).find(x => /a jugar/i.test(x.textContent || '')); if (!j) break; j.click();
    const f = document.getElementById('c1-fade'); if (f) f.remove(); if (G.ui && G.ui.hideToast) G.ui.hideToast();
    await sleep(250); } };
  await quitarUi();
  const ren = R.renderer, gl = ren.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
  out.pantalla = W + 'x' + H + '@' + (ren.getPixelRatio() || 1);
  const stats = () => { try { const s = R.stats(); return { calls: s.calls, tris: s.triangulos }; } catch (e) { return {}; } };
  const perfil = (fracs) => {
    if (R.drawScene) R.drawScene(R.camera); else ren.render(R.scene, R.camera);
    return fracs.map(fx => {
      const x = Math.min(W - 1, Math.max(0, Math.round(fx * W))), buf = new Uint8Array(4 * H);
      gl.readPixels(x, 0, 1, H, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      const col = []; // de arriba (y=H-1) a abajo (y=0)
      for (let y = H - 1; y >= 0; y -= 4) { const i = y * 4; col.push([buf[i], buf[i + 1], buf[i + 2]]); }
      return col;
    });
  };
  const lumaDe = cols => cols.map(col => col.map(c => Math.round(0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2])));
  const FR = [0.15, 0.32, 0.5, 0.68, 0.85];
  const resumen = (lumas) => lumas.map(l => { const n = l.length, mx = Math.max(...l), mn = Math.min(...l);
    return { min: mn, max: mx, filaMax: l.indexOf(mx), filaMin: l.indexOf(mn) }; });
  // Ablación secuencial sobre la vista activa; devuelve luma por columna para cada caso
  const ablacion = async () => {
    const casos = {};
    casos.base = lumaDe(perfil(FR));
    const fog = R.scene.fog;
    if (fog) { fog.near = 1e9; fog.far = 1e9; }
    casos.sinNiebla = lumaDe(perfil(FR));
    if (fog) { fog.near = -60; fog.far = 900; }
    const skyU = R.sky && R.sky.material.uniforms, h0 = skyU && skyU.uHorizonte.value.clone();
    if (skyU) skyU.uHorizonte.value.copy(skyU.uCenit.value);
    casos.skyHorizOff = lumaDe(perfil(FR));
    if (skyU) skyU.uHorizonte.value.copy(h0);
    const mar = G.agua && G.agua.mar, vMar = mar && mar.visible;
    if (mar) mar.visible = false;
    casos.sinMar = lumaDe(perfil(FR));
    if (mar) mar.visible = vMar;
    let nubes = null; R.scene.traverse(o => { if (o.name === 'cielo-nubes' && !nubes) nubes = o; });
    const vNubes = nubes && nubes.visible;
    if (nubes) nubes.visible = false;
    casos.sinNubes = lumaDe(perfil(FR));
    if (nubes) nubes.visible = vNubes;
    for (const k of Object.keys(casos)) casos[k] = { resumen: resumen(casos[k]), lumas: casos[k] };
    return casos;
  };
  // Vista A: jugador en el mirador, a pie, mirando al mar
  const poner = async (x, z, yExtra, yaw, inclina, espera) => {
    const yr = G.terreno.height(x, z);
    G.S.pos.x = x; G.S.pos.z = z; G.S.pos.y = yr + yExtra;
    G.S.facing.x = Math.sin(yaw); G.S.facing.z = Math.cos(yaw);
    G.camara.yaw = yaw; G.camara.inclina = inclina; G.camara.place(true);
    await sleep(espera);
    G.camara.yaw = yaw; G.camara.inclina = inclina; G.camara.place(true);
  };
  await poner(${X}, ${Z}, 0.9, ${YAW}, 0.45, 5000);
  out.A = { cam: { x: +R.camera.position.x.toFixed(1), y: +R.camera.position.y.toFixed(1), z: +R.camera.position.z.toFixed(1) }, stats: stats(), casos: await ablacion() };
  const skyU = R.sky && R.sky.material.uniforms;
  out.uniformes = { uCenitLin: skyU && '#' + skyU.uCenit.value.getHexString(), uHorizonteLin: skyU && '#' + skyU.uHorizonte.value.getHexString(), uSolColLin: skyU && '#' + skyU.uSolCol.value.getHexString(),
    nieblaLin: R.scene.fog && ('#' + R.scene.fog.color.getHexString()) };
  out.stats2 = stats();
  return JSON.stringify(out); })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2k80-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    `--window-size=${W},${H}`, 'about:blank'];
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi2k80-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const res = { etiqueta: ETIQUETA, vista: { x: X, z: Z, yaw: YAW }, cpu: CPU, head: null };
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: false }, ses);
    try { await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses); } catch (e) { }
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=ep5` }, ses);
    const t0 = Date.now(); let listo = false;
    while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
      await cdp.bombear(0.5);
    }
    if (!listo) throw new Error('el juego no arrancó');
    const ent = await evaluar(cdp, ses, ENTRAR_JS, 120);
    if (!/^ok/.test(ent)) throw new Error('entrada: ' + ent);
    res.head = await evaluar(cdp, ses, `(() => { try { return (AV.G.build && (AV.G.build.commit || AV.G.build.id)) || 'desconocido'; } catch (e) { return 'desconocido'; } })()`, 10);
    // captura: mismo encuadre que la medición (el diálogo tutorial se cierra dentro con reintentos)
    res.medicion = JSON.parse(await evaluar(cdp, ses, MEDICION_JS, 180));
    const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 90 }, ses, 60000);
    fs.writeFileSync(path.join(SALIDA, `k080_${ETIQUETA}_mirador.jpg`), Buffer.from(shot.data, 'base64'));
    res.erroresConsola = await evaluar(cdp, ses, `(window.AV && AV.G && AV.G.consoleErrores) ? AV.G.consoleErrores.slice(0, 10) : []`, 10);
  } catch (e) {
    res.error = String(e && e.message || e);
    try { await cdp.call('Browser.getVersion', {}, null, 5000); } catch (e2) { res.chromeCaido = true; }
  }
  fs.writeFileSync(path.join(SALIDA, `k080_${ETIQUETA}.json`), JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res, null, 1));
  try { chrome.kill('SIGKILL'); } catch (e) { }
  mataPorPerfil();
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close();
  process.exit(res.error && !res.medicion ? 1 : 0);
})();
