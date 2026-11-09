// KIMI-351 (Kimi 1) · probe IPH-1: perfil iPhone de 710dfbee en HEAD, con GPU real y emulación iPhone
// 📣 IPH-1 (TAREAS_KIMI.md:742): «perfil iPhone — «bajo» de memoria (igual que QA-107) con DPR 1,25–1,75
// (antes 0,75–1,5) y sin Modo Escuela automático». Validación pedida en iPhone REAL (no hay en esta PC):
// esta herramienta cubre la parte emulable — perfilEquipo devuelve perfil 'iphone' con techo 'bajo' y
// escuelaAuto false, el DPR queda siempre en [1,25–1,75] (nunca baja a 0,75 como antes), el modo escuela
// NO se enciende solo, y el juego corre con 0 errores de consola. Emulación: 390×844 dpr 3 táctil,
// UA iPhone, CPU ×4 (mismo perfil que kimi2_empezar.js). El vuelo de 5 min en Safari real queda para
// quien tenga iPhone (palanca de emergencia: DPR_IPHONE.max 1,75→1,5 en src/engine/renderer.js).
// Uso: node tools/build/kimi1_351_iphone.js --etiqueta k351-iphone-r1 [--secs 35]
'use strict';
const fs = require('fs'), http = require('http'), os = require('os'), path = require('path');
const { spawn } = require('child_process');
const WebSocket = (() => { try { return require('ws'); } catch (e) { return global.WebSocket; } })();
const RAIZ = path.resolve(__dirname, '../..');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d; }
const ETIQUETA = arg('--etiqueta', 'k351-iphone-r1');
const CPU = parseFloat(arg('--cpu', '4'));
const SECS = parseInt(arg('--secs', '35'), 10);
const SALIDA = path.join(RAIZ, 'docs/img/kimi351');
fs.mkdirSync(SALIDA, { recursive: true });
const LOG = path.join(SALIDA, `k351_${ETIQUETA}.log`);
const log = m => { const l = `[${new Date().toISOString().slice(11, 19)}] ${m}`; try { fs.appendFileSync(LOG, l + '\n'); } catch (e) { } console.log(l); };
const res = { tarea: 'KIMI-351', etiqueta: ETIQUETA, head: null, emulacion: { ua: 'iPhone', ancho: 390, alto: 844, dpr: 3, cpu: CPU, urlExtra: 'fps=1' }, perfil: null, muestra: null, look: null, errores: null };
function guardar() { try { fs.writeFileSync(path.join(SALIDA, `k351_${ETIQUETA}.json`), JSON.stringify(res, null, 1)); } catch (e) { } }

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.wasm': 'application/wasm' };
function servir() {
  const srv = http.createServer((req, r) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { r.writeHead(400); return r.end(); }
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { r.writeHead(403); return r.end(); }
    fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end('404'); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); r.end(d); });
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

const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function semillaSave() {
  const save = {
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1k351-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  };
  return `try {
  localStorage.clear(); sessionStorage.clear();
  window.__erroresConsola = [];
  addEventListener('error', e => __erroresConsola.push(String(e.message || e)));
  addEventListener('unhandledrejection', e => __erroresConsola.push('rechazo: ' + (e.reason && e.reason.message || e.reason)));
  const cerr = console.error; console.error = function () { try { __erroresConsola.push([].map.call(arguments, String).join(' ').slice(0, 300)); } catch (e) {} return cerr.apply(this, arguments); };
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', ${JSON.stringify(JSON.stringify(save))});
} catch (e) {}`;
}

// entrar al mundo: portada → Jugar (la semilla salta el creador), esperar revelado, saltar intro
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

// perfil del equipo + bandera escuela (no debe haberse encendido sola)
const PERFIL_JS = `(() => { try { const R = AV.G.renderer;
  return JSON.stringify({ equipo: R.equipo, calidad: R.calidad.nivel, escuela: R.calidad.escuela === true,
    escuelaNull: R.calidad.escuela == null, uaTieneIPhone: /iPhone|iPod/.test(navigator.userAgent || ''),
    deviceDPR: window.devicePixelRatio, dpr: R.stats().dpr, stats0: R.stats() });
} catch (e) { return 'ERR ' + e; } })()`;

// muestra de durSec: fps por rAF + stats 1/s con dpr (la clave IPH-1: nunca fuera de [1,25–1,75])
const MUESTRA_JS = `(async (durSec) => { try { return await (async () => {
  const G = AV.G, sleep = ms => new Promise(r => setTimeout(r, ms));
  const deltas = []; let ult = performance.now(); let vivo = true;
  const marca = () => { if (!vivo) return; const a = performance.now(); deltas.push(a - ult); ult = a; requestAnimationFrame(marca); };
  requestAnimationFrame(marca);
  const stats = []; const t0 = performance.now();
  while (performance.now() - t0 < durSec * 1000) {
    await sleep(1000);
    try { const st = G.renderer.stats(); const m = performance.memory;
      stats.push({ calls: st.calls, ktris: st.triangulos != null ? Math.round(st.triangulos / 1000) : null,
        fpsMedidor: st.fps, dpr: st.dpr, escuela: st.escuela === true,
        heapMB: m ? Math.round(m.usedJSHeapSize / 1048576) : null }); } catch (e) { stats.push(null); }
  }
  vivo = false; deltas.shift();
  const porSeg = []; let ac = 0, n = 0;
  for (const d of deltas) { ac += d; n++; if (ac >= 1000) { porSeg.push(Math.round(1000 / (ac / n))); ac = 0; n = 0; } }
  if (n > 5) porSeg.push(Math.round(1000 / (ac / n)));
  const orden = deltas.slice().sort((a, b) => a - b);
  const pct = p => orden.length ? Math.round(orden[Math.min(orden.length - 1, Math.floor(orden.length * p))]) : null;
  let pausas50 = 0; for (const d of deltas) { if (d > 50) pausas50++; }
  const dprs = stats.filter(Boolean).map(s => s.dpr);
  return JSON.stringify({ fpsPorSeg: porSeg, fpsMed: porSeg.length ? Math.round(porSeg.reduce((s, x) => s + x, 0) / porSeg.length) : null,
    fpsMin: porSeg.length ? Math.min.apply(null, porSeg) : null,
    peorMs: deltas.length ? Math.round(Math.max.apply(null, deltas)) : null,
    medianaMs: pct(0.5), p95Ms: pct(0.95), pausas50,
    dprMin: dprs.length ? Math.min.apply(null, dprs) : null, dprMax: dprs.length ? Math.max.apply(null, dprs) : null,
    stats, escuelaFinal: G.renderer.calidad.escuela, medirDPRfinal: G.renderer.stats().dpr,
    errores: (window.__erroresConsola || []).slice(0, 10) }); })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k351-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--window-size=390,844', '--force-device-scale-factor=3', 'about:blank'];
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi1k351-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    require('child_process').execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { execSync } = require('child_process');
  try { res.head = execSync('git rev-parse --short HEAD', { cwd: RAIZ }).toString().trim(); } catch (e) { }
  log(`KIMI-351 · IPH-1 probe · HEAD ${res.head} · ${SECS} s de muestra`);
  const { srv, puerto } = await servir();
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  let limpio = false;
  const fin = (codigo, msg) => { guardar(); try { srv.close(); } catch (e) { } mataPorPerfil(); if (!limpio) { try { chrome.kill(); } catch (e) { } try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { } limpio = true; } log(msg); process.exit(codigo); };
  process.on('SIGINT', () => fin(2, 'abortado'));
  process.on('SIGTERM', () => fin(2, 'abortado'));
  try {
    const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
    const cdp = new CDP(ws); await cdp.listo();
    log('ws listo');
    const { targetId } = await cdp.call('Target.createTarget', { url: 'about:blank' });
    const { sessionId: ses } = await cdp.call('Target.attachToTarget', { targetId, flatten: true });
    await cdp.call('Page.enable', {}, ses); await cdp.call('Runtime.enable', {}, ses);
    log('sesión CDP lista');
    // emulación iPhone: métricas de dispositivo, táctil, UA y CPU ×N (mismo perfil que kimi2_empezar.js)
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }, ses);
    await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA_IPHONE }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
    log('emulación iPhone aplicada');
    const origen = `http://127.0.0.1:${puerto}`;
    // 1ª carga: sembrar la partida (la semilla salta el creador)
    const nav1 = await cdp.call('Page.navigate', { url: `${origen}/index.html?fps=1` }, ses, 20000);
    log('1ª navegación: ' + JSON.stringify(nav1));
    await cdp.bombear(2500);
    await evaluar(cdp, ses, semillaSave(), 15, false);
    log('semilla escrita');
    const nav2 = await cdp.call('Page.navigate', { url: `${origen}/index.html?fps=1` }, ses, 20000);
    log('2ª navegación: ' + JSON.stringify(nav2));
    await cdp.bombear(2500);
    log('entrando al mundo…');
    // entrar al mundo
    const entra = await evaluar(cdp, ses, ENTRAR_JS, 120);
    log('entrar: ' + entra);
    if (String(entra).indexOf('ok') !== 0) return fin(1, 'ERROR al entrar: ' + entra);
    // perfil: debe ser iphone / bajo / techo / sin escuela auto
    const perfil = JSON.parse(await evaluar(cdp, ses, PERFIL_JS, 20));
    res.perfil = perfil;
    log(`perfil: ${JSON.stringify(perfil.equipo)} · calidad ${perfil.calidad} · escuela ${perfil.escuela} · dpr ${perfil.dpr} · deviceDPR ${perfil.deviceDPR}`);
    // asentar un poco y medir
    await cdp.bombear(3000);
    const muestra = JSON.parse(await evaluar(cdp, ses, `(${MUESTRA_JS})(${SECS})`, SECS + 60));
    res.muestra = muestra;
    log(`fpsMed ${muestra.fpsMed} · fpsMin ${muestra.fpsMin} · mediana ${muestra.medianaMs} ms · p95 ${muestra.p95Ms} ms · pausas50 ${muestra.pausas50}`);
    log(`dprMin ${muestra.dprMin} · dprMax ${muestra.dprMax} · escuelaFinal ${JSON.stringify(muestra.escuelaFinal)} · errores ${muestra.errores.length}`);
    try { res.look = JSON.parse(await evaluar(cdp, ses, `(() => { try { const m = AV.look.medir(); return JSON.stringify({ calls: m.calls, ktris: Math.round(m.triangulos / 1000), texturasMB: m.texturasMB, geometrias: m.geometrias, heapMB: m.heapMB }); } catch (e) { return 'ERR ' + e; } })()`, 30)); } catch (e) { res.look = { err: String(e).slice(0, 200) }; }
    log('look.medir: ' + JSON.stringify(res.look));
    res.errores = muestra.errores;
    // captura con el panel fps visible
    try {
      const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 80 }, ses, 30000);
      fs.writeFileSync(path.join(SALIDA, `k351_${ETIQUETA}.jpg`), Buffer.from(shot.data, 'base64'));
      log('captura: ' + `k351_${ETIQUETA}.jpg`);
    } catch (e) { log('captura falló: ' + String(e).slice(0, 120)); }
    const dprOk = muestra.dprMin != null && muestra.dprMin >= 1.25 && muestra.dprMax <= 1.75;
    const perfilOk = perfil.equipo && perfil.equipo.perfil === 'iphone' && perfil.equipo.techo === 'bajo' && perfil.equipo.escuelaAuto === false && perfil.calidad === 'bajo';
    const escuelaOk = muestra.escuelaFinal !== true;
    log(`VEREDICTO parcial: dprEnBanda ${dprOk} · perfilOk ${perfilOk} · sinEscuelaAuto ${escuelaOk} · errores ${res.errores.length}`);
    guardar();
    fin(res.errores.length ? 1 : 0, res.errores.length ? 'FIN con errores de consola' : 'FIN ok');
  } catch (e) {
    log('EXCEPCIÓN: ' + (e && e.stack || e));
    fin(1, 'EXCEPCIÓN');
  }
})();
