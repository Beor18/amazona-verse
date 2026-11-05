#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-120: pulido visual de la demo V18.1
   (marca «Duelo de 2 jugadores» + círculo de la explanada, src/game/v18/duelo2.js y combate.js).
   Escritorio (el duelo 2 es de computadora), GPU real:
     - capturas deterministas de la marca del sitio y del círculo de la explanada (cámara del juego asentada),
     - medición base junto a la explanada (FPS/calls/tris/heap),
     - regresión: AV.v18Duelo2Test() y AV.v18CombateTest() con sus passed/total.
   El juego no se toca: solo dispara API pública y teleports.
   Uso: node tools/build/kimi3_120.js --etiqueta antes|despues [--salida docs/img/kimi120]
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
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi120'));
fs.mkdirSync(SALIDA, { recursive: true });
const LOGF = path.join(SALIDA, `k120_${ETIQUETA}.log`);
fs.writeFileSync(LOGF, '');
function log(msg) { try { fs.appendFileSync(LOGF, `[${new Date().toISOString().slice(11, 19)}] ${msg}\n`); } catch (e) { } }
function guardar(res) { try { fs.writeFileSync(path.join(SALIDA, `k120_${ETIQUETA}.json`), JSON.stringify(res, null, 1)); } catch (e) { } }

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi3k120-/.test(d)) continue;
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
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi3k120-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Brisa del Yunque', look: null },
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
  const G = AV.G, S = AV.state, sleep = ms => new Promise(r => setTimeout(r, ms));
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(120); } return false; };
  if (!await espera(() => G.mundo && G.mundo.listo, 60000)) return 'ERR mundo no listo';
  try { window.dispatchEvent(new PointerEvent('pointerdown')); } catch (e) {}
  if (!await espera(() => G.v18combate && G.v18duelo2 && G.v18fx, 60000)) return 'ERR módulos v18 sin cargar';
  window.__k120 = {
    G, S, sitio: G.v18combate.sitio, sleep, espera,
    ir(x, z, yaw) { S.pos.x = x; S.pos.z = z; if (G.fisica && G.fisica.MOVE) { G.fisica.MOVE.vx = G.fisica.MOVE.vz = 0; } if (yaw != null && G.camara) G.camara.yaw = yaw; },
    async asentar(secs) { await sleep((secs || 3.5) * 1000); try { if (AV.G.ui && AV.G.ui.hideToast) AV.G.ui.hideToast(); } catch (e) {} },
    async limpiarUi() { // tarjeta «¡Así se juega!», diálogos y bocadillos se reabren solos: fuera justo antes de cada captura (kimi2_k083)
      const j = Array.from(document.querySelectorAll('button')).find(x => /a jugar/i.test(x.textContent || ''));
      if (j) j.click();
      const f = document.getElementById('c1-fade'); if (f) f.remove();
      const d = document.getElementById('dialog'); if (d && !d.hidden) d.hidden = true;
      for (const s of ['.bocadillo', '.bubble', '.speech', '[class*="bocadillo"]']) {
        try { document.querySelectorAll(s).forEach(b => { b.style.visibility = 'hidden'; }); } catch (e) {}
      }
      try { if (AV.G.ui && AV.G.ui.hideCard) AV.G.ui.hideCard(); } catch (e) {}
      try { if (AV.G.ui && AV.G.ui.hideToast) AV.G.ui.hideToast(); } catch (e) {}
      await sleep(280);
    },
    async muestra(durSec) {
      const deltas = []; let ult = performance.now(); let vivo = true;
      const marca = () => { if (!vivo) return; const a = performance.now(); deltas.push(a - ult); ult = a; requestAnimationFrame(marca); };
      requestAnimationFrame(marca);
      const stats = []; const t0 = performance.now();
      while (performance.now() - t0 < durSec * 1000) {
        await sleep(1000);
        try { const st = G.renderer.stats(); stats.push({ calls: st.calls, tris: st.triangulos, fpsMedidor: st.fps }); } catch (e) { stats.push(null); }
      }
      vivo = false;
      deltas.shift();
      const porSeg = []; let ac = 0, n = 0;
      for (const d of deltas) { ac += d; n++; if (ac >= 1000) { porSeg.push(Math.round(1000 / (ac / n))); ac = 0; n = 0; } }
      if (n > 5) porSeg.push(Math.round(1000 / (ac / n)));
      const orden = deltas.slice().sort((a, b) => a - b);
      const med = a => a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : 0;
      return { fpsPorSeg: porSeg, fpsMed: med(porSeg), fpsMin: porSeg.length ? Math.min.apply(null, porSeg) : 0,
        peorMs: deltas.length ? Math.round(Math.max.apply(null, deltas)) : 0,
        p95Ms: orden.length ? Math.round(orden[Math.min(orden.length - 1, Math.floor(orden.length * 0.95))]) : 0,
        stats, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null };
    }
  };
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3k120-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--window-size=1600,900', 'about:blank'];
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi3k120-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}
async function foto(cdp, ses, nombre) {
  const r = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 30000);
  fs.writeFileSync(path.join(SALIDA, `k120_${ETIQUETA}_${nombre}.jpg`), Buffer.from(r.data, 'base64'));
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const res = { etiqueta: ETIQUETA, pantalla: 'escritorio 1600x900 cpuX1 GPU real', v18: true };
  const watch = setInterval(() => { try { guardar(res); } catch (e) { } log('…latido'); }, 5000);
  try {
    log('lanzando Chrome y entrando al juego (?v18=1)...');
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
    log('entrada ok');
    // la tarjeta «¡Así se juega!» reaparece tras la entrada: intento de cierre temprano (además se quita antes de cada foto)
    const tarjeta = await evaluar(cdp, ses, `(() => { try { AV.G.ui.hideCard(); } catch (e) {} return 'ok'; })()`, 20, false);
    log('cierre de tarjeta tutorial: ' + tarjeta);
    await cdp.bombear(1);

    // 1) captura de la marca del sitio «Duelo de 2 jugadores» (cámara al oeste mirando al este)
    log('capturando marca del sitio...');
    await evaluar(cdp, ses, `(() => { const K = window.__k120, s = K.sitio; K.ir(s.x - 6, s.z + 0.001, -Math.PI/2); K.S.facing = { x: 1, z: 0 }; return 'ok'; })()`, 20, false);
    await evaluar(cdp, ses, `(async () => { const K = window.__k120; await K.asentar(2.2); await K.limpiarUi(); return 'ok'; })()`, 30);
    await foto(cdp, ses, 'marca');
    // 2) captura del círculo de la explanada: a pie dentro del círculo mirando al otro lado (el anillo cruza el cuadro)
    log('capturando círculo de la explanada...');
    await evaluar(cdp, ses, `(() => { const K = window.__k120, s = K.sitio; K.ir(s.x - 10.5, s.z + 0.001, -Math.PI/2); K.S.facing = { x: 1, z: 0 }; return 'ok'; })()`, 20, false);
    await evaluar(cdp, ses, `(async () => { const K = window.__k120; await K.asentar(2.2); await K.limpiarUi(); return 'ok'; })()`, 30);
    await foto(cdp, ses, 'arena');

    // 3) números base junto a la explanada
    log('midiendo base...');
    res.base = JSON.parse(await evaluar(cdp, ses, `(async () => { const K = window.__k120, s = K.sitio; K.ir(s.x - 14, s.z, -Math.PI/2); await K.asentar(2.5); return JSON.stringify(await K.muestra(6)); })()`, 60));

    // 4) regresión: página FRESCA (los checks QA-174 dependen del estado de la flora rasterizada;
    //    con el jugador junto a la explanada un tronco puede caer en el círculo y teñir el veredicto)
    log('recargando página fresca para las pruebas...');
    await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&v18=1` }, ses);
    const t1 = Date.now(); listo = false;
    while (Date.now() - t1 < (CFG.espera_listo_s || 150) * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
      await cdp.bombear(0.5);
    }
    if (!listo) throw new Error('la recarga no arrancó');
    const ent2 = await evaluar(cdp, ses, ENTRAR_JS, 120);
    if (!/^ok/.test(ent2)) throw new Error('entrada 2: ' + ent2);
    log('corriendo v18Duelo2Test...');
    res.duelo2Test = JSON.parse(await evaluar(cdp, ses, `(async () => { const r = await AV.v18Duelo2Test(); return JSON.stringify({ passed: r.passed, total: r.total, fallos: r.results.filter(x => !x.ok).map(x => x.name).slice(0, 6) }); })()`, 150));
    log('duelo2Test: ' + JSON.stringify(res.duelo2Test));
    log('corriendo v18CombateTest...');
    res.combateTest = JSON.parse(await evaluar(cdp, ses, `(async () => { const r = await AV.v18CombateTest(); return JSON.stringify({ passed: r.passed, total: r.total, fallos: r.results.filter(x => !x.ok).map(x => x.name).slice(0, 6) }); })()`, 200));
    log('combateTest: ' + JSON.stringify(res.combateTest));

    res.erroresConsola = await evaluar(cdp, ses, `(window.__erroresConsola || []).slice(0, 30)`, 15);
    log('errores de consola: ' + JSON.stringify(res.erroresConsola));
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
    log('evidencia: ' + path.join(SALIDA, `k120_${ETIQUETA}.json`));
    process.exit(res.fallo ? 1 : 0);
  }
})();
