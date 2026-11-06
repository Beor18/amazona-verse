#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-126 (reparto 1d): «iPad en el tepuy del cap. 5»
   (KIMI-Task-011 pendiente: iPad 2-nov 31/16 FPS en el tepuy de la Ciudad de los 36).
   Emulación fiel al iPad de Kelvin (820×1180 CSS @ DPR 1,5, UA iPad, táctil, CPU ×4) con GPU real:
     1) vuelo continuo sobre el tepuy (miradores → cumbre → ciudad → aire) muestreando 1/s
        (fps renderer, draw calls, k tris, heap) → p50/p10/mín;
     2) tomas asentadas (ST.terminar + look.medir) en cumbre/miradores/aérea → tabla;
     3) la medición es por calidad (--calidad bajo por defecto: es el objetivo contractual;
        medio de referencia con --calidad medio). El juego NO se toca: herramienta + evidencia.
   Uso: node tools/build/kimi3_126.js --etiqueta ipad-bajo-r1 [--calidad bajo] [--vuelo-s 60]
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
const ETIQUETA = arg('--etiqueta', 'ipad-bajo-r1');
const CALIDAD = arg('--calidad', 'bajo');
const DPR = parseFloat(arg('--dpr', '1.5'));
const CPU = parseInt(arg('--cpu', '4'), 10);
const VUELO_S = parseInt(arg('--vuelo-s', '60'), 10);
const ANCHO = 820, ALTO = 1180;
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi126'));
fs.mkdirSync(SALIDA, { recursive: true });

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi3q126-/.test(d)) continue;
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
  window.__erroresConsola = [];
  addEventListener('error', e => __erroresConsola.push(String(e.message || e)));
  addEventListener('unhandledrejection', e => __erroresConsola.push('rechazo: ' + (e.reason && e.reason.message || e.reason)));
  const cerr = console.error; console.error = function () { try { __erroresConsola.push([].map.call(arguments, String).join(' ').slice(0, 300)); } catch (e) {} return cerr.apply(this, arguments); };
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  // cap5: el pack tiene meta.almacen 'ep5' → el save vive en 'ep5.save' (guardado.js SAVE_KEY), no en amazonaverse.save
  localStorage.setItem('ep5.save', JSON.stringify({
    v: 1, formato: 2, escrito: Date.now(), saveId: 'qa-kimi3q126-' + Math.random().toString(36).slice(2, 10),
    v2: 0 + Math.random().toString(36).slice(2, 10),
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
  const S = window.AV && window.AV.state; if (!S) return 'sin AV.state';
  // bajo emulación iPad/CPU×4 el arranque tarda: esperar a que la partida sembrada se aplique al perfil
  if (!await espera(() => S.profile && S.profile.created, 45000)) return 'sin perfil: keys=' + Object.keys(localStorage).join(',') + ' perf=' + JSON.stringify(S.profile);
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(30000);
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 60000);
  const b = document.getElementById('c1-saltar'); if (b) b.click();
  await sleep(800);
  const f = document.getElementById('c1-fade'); if (f) f.remove();
  if (AV.G.ui && AV.G.ui.hideToast) AV.G.ui.hideToast();
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

// vuelo continuo sobre el tepuy con muestreo 1/s (villa→cumbre→ciudad→miradores→aire)
const VUELO_JS = `(async () => {
  const AV = window.AV, G = AV.G, S = G.S;
  const ST = (G.mundo && G.mundo.streaming) || (G.streaming && G.streaming.gestor);
  if (!ST) return 'sin streaming';
  const RUTA = [ { n: 'miradores', x: -4, z: -130.8 }, { n: 'cumbre', x: -32, z: -150 }, { n: 'ciudad', x: -4, z: -127 }, { n: 'aire', x: -18, z: -140 } ];
  const v = window.__q126 = { t0: Math.round(performance.now()), muestras: [], ctxPerdidos: 0, listo: false };
  try { const c = G.renderer.renderer && G.renderer.renderer.domElement; if (c) c.addEventListener('webglcontextlost', () => v.ctxPerdidos++); } catch (e) {}
  const altura = (x, z) => { try { const h = AV.debug.height(x, z); return isFinite(h) ? h : 8; } catch (e) { return 8; } };
  G.fisica.MOVE.flying = true;
  let wp = 0;
  v.tick = setInterval(() => {
    try {
      const paso = 17 * 0.25;
      const dx = RUTA[wp].x - S.pos.x, dz = RUTA[wp].z - S.pos.z, d = Math.hypot(dx, dz);
      if (d < Math.max(25, paso)) { wp = (wp + 1) % RUTA.length; return; }
      S.pos.x += dx / d * paso; S.pos.z += dz / d * paso;
      S.pos.y = Math.max(altura(S.pos.x, S.pos.z) + 12, 10); S.vy = 0;
      try { AV.debug.camYaw(Math.atan2(dx, dz)); } catch (e) {}
      G.fisica.MOVE.flying = true;
    } catch (e) {}
  }, 250);
  const muestra = () => {
    try {
      const m = performance.memory, st = (() => { try { return G.renderer.stats(); } catch (e) { return {}; } })();
      v.muestras.push({ t: Math.round((performance.now() - v.t0) / 1000),
        heap: m ? Math.round(m.usedJSHeapSize / 1048576) : null,
        calls: st.calls != null ? st.calls : null, ktris: st.triangulos != null ? Math.round(st.triangulos / 1000) : null,
        fps: st.fps != null ? st.fps : null, calidad: st.calidad != null ? st.calidad : null,
        pos: [Math.round(S.pos.x), Math.round(S.pos.z)], hacia: RUTA[wp].n });
    } catch (e) {}
  };
  muestra();
  v.muestreo = setInterval(muestra, 1000);
  v.listo = true;
  return 'ok: vuelo ' + RUTA.map(r => r.n).join(' → ');
})()`;
const DETENER_JS = `(() => { try { const v = window.__q126; if (!v) return 'sin vuelo';
  clearInterval(v.tick); clearInterval(v.muestreo);
  const ms = v.muestras;
  const fps = ms.map(m => m.fps).filter(x => typeof x === 'number' && x > 0).sort((a, b) => a - b);
  const p = a => fps.length ? fps[Math.min(fps.length - 1, Math.floor(fps.length * a))] : null;
  const ktris = ms.map(m => m.ktris).filter(x => typeof x === 'number');
  const calls = ms.map(m => m.calls).filter(x => typeof x === 'number');
  const heap = ms.map(m => m.heap).filter(x => typeof x === 'number');
  return JSON.stringify({ n: ms.length, ctxPerdidos: v.ctxPerdidos,
    fpsP50: p(0.5), fpsP10: p(0.1), fpsMin: fps.length ? fps[0] : null,
    ktrisMax: ktris.length ? Math.max.apply(null, ktris) : null, ktrisMed: ktris.length ? Math.round(ktris.reduce((s, x) => s + x, 0) / ktris.length) : null,
    callsMax: calls.length ? Math.max.apply(null, calls) : null, callsMed: calls.length ? Math.round(calls.reduce((s, x) => s + x, 0) / calls.length) : null,
    heapMax: heap.length ? Math.max.apply(null, heap) : null, heapFin: heap.length ? heap[heap.length - 1] : null,
    muestras: ms }); } catch (e) { return 'ERR ' + (e && e.message || e); } })()`;

// teleport + asentado + look.medir() (tabla estilo QA-139)
const TOMA_JS = `(async (px, pz, alt, mx, mz) => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
  const cuadro = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  S.pos.x = px; S.pos.z = pz; S.pos.y = G.terreno.height(px, pz) + alt; S.vy = 0;
  G.fisica.MOVE.flying = true;
  const yaw = Math.atan2(-(mx - px), -(mz - pz));
  G.camara.yaw = yaw; S.facing = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
  const ST = G.mundo && G.mundo.streaming;
  if (ST) { if (ST.alrededor) await ST.alrededor(px, pz); if (ST.terminar) await ST.terminar(); }
  if (G.solidos && G.solidos.terminar) G.solidos.terminar();
  await sleep(1500);
  G.camara.yaw = yaw; if (G.camara.place) G.camara.place(true);
  await cuadro(); await cuadro();
  let med = null, medErr = null;
  try { med = (AV.look && typeof AV.look.medir === 'function') ? AV.look.medir() : null; } catch (e) { medErr = String(e && e.message || e).slice(0, 200); }
  return JSON.stringify({ pos: [Math.round(S.pos.x * 10) / 10, Math.round(S.pos.y * 100) / 100, Math.round(S.pos.z * 10) / 10],
    med: med ? { calls: med.calls, triangulos: med.triangulos, texturasMB: med.texturasMB, geometrias: med.geometrias, heapMB: med.heapMB, fps: med.fps } : null, medErr }) })`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3q126-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    `--window-size=${ANCHO},${ALTO}`, '--force-device-scale-factor=1', 'about:blank'];
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi3q126-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

// encuadres del tepuy (coords ep5, las mismas anclas que midió Kimi 1 en kimi1_071.js)
const TOMAS = [
  ['cumbre_N', -32, -150, 1.5, -4, -127],
  ['cumbre_E', -32, -150, 1.5, -60, -150],
  ['miradores_NE', -4, -130.8, 1.5, -40, -150],
  ['aire_ciudad', -18, -140, 42, -4, -127],
];

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const res = { tarea: 'KIMI-126', etiqueta: ETIQUETA, pantalla: `${ANCHO}x${ALTO}@${DPR} cpuX${CPU} ipad-emulado`, calidad: CALIDAD, pack: 'ep5', head: null };
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
    try { await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses); } catch (e) { }
    try { await cdp.call('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }, ses); } catch (e) { }
    try { await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses); } catch (e) { }
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=ep5&mapa=real&calidad=${CALIDAD}` }, ses);
    const t0 = Date.now(); let listo = false;
    while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
      await cdp.bombear(0.5);
    }
    if (!listo) throw new Error('el juego no arrancó');
    const ent = await evaluar(cdp, ses, ENTRAR_JS, 120);
    if (!/^ok/.test(ent)) throw new Error('entrada: ' + ent);
    res.head = await evaluar(cdp, ses, `(() => { try { return (AV.G.build && (AV.G.build.commit || AV.G.build.id)) || 'desconocido'; } catch (e) { return 'desconocido'; } })()`, 10);

    console.log(`· vuelo sobre el tepuy (${VUELO_S} s, calidad ${CALIDAD}):`);
    console.log('  ' + await evaluar(cdp, ses, VUELO_JS, 30));
    await cdp.bombear(VUELO_S);
    const vuelo = JSON.parse(await evaluar(cdp, ses, DETENER_JS, 150));
    res.vuelo = vuelo;
    console.log(`  n=${vuelo.n} fps p50=${vuelo.fpsP50} p10=${vuelo.fpsP10} min=${vuelo.fpsMin} · ktris med=${vuelo.ktrisMed} max=${vuelo.ktrisMax} · calls med=${vuelo.callsMed} max=${vuelo.callsMax} · heap max=${vuelo.heapMax} fin=${vuelo.heapFin} · ctxPerdidos=${vuelo.ctxPerdidos}`);

    console.log('· tomas asentadas en el tepuy:');
    res.tomas = {};
    for (const [n, px, pz, alt, mx, mz] of TOMAS) {
      const toma = JSON.parse(await evaluar(cdp, ses, `(${TOMA_JS})(${px}, ${pz}, ${alt}, ${mx}, ${mz})`, 300));
      await cdp.bombear(0.3);
      const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 60000);
      fs.writeFileSync(path.join(SALIDA, `k126_${ETIQUETA}_${n}.jpg`), Buffer.from(shot.data, 'base64'));
      res.tomas[n] = toma;
      console.log(`  ${n}: ${toma.medErr ? 'MED: ' + toma.medErr : `calls=${toma.med.calls} tris=${(toma.med.triangulos / 1e6).toFixed(2)}M tex=${toma.med.texturasMB} MB geo=${toma.med.geometrias} heap=${toma.med.heapMB} MB fps=${toma.med.fps}`}`);
    }

    const errs = await evaluar(cdp, ses, `(window.__erroresConsola || []).slice(0, 20)`, 15);
    res.erroresConsola = errs;
    console.log('· errores de consola: ' + JSON.stringify(errs));
    await cdp.call('Target.closeTarget', { targetId: tid }).catch(() => { });
  } catch (e) {
    res.fallo = String(e && e.message || e);
    console.log('FALLO: ' + res.fallo);
  } finally {
    try { chrome.kill(); } catch (e) { }
    mataPorPerfil();
    srv.close();
    fs.writeFileSync(path.join(SALIDA, `k126_${ETIQUETA}.json`), JSON.stringify(res, null, 1));
    console.log('· JSON: ' + path.join(SALIDA, `k126_${ETIQUETA}.json`));
    process.exit(res.fallo ? 1 : 0);
  }
})();
