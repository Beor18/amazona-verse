// KIMI-343 (Kimi 1) · coste de DIBUJO de la ciudad viva en Modo Escuela (📣 coordinadora 8-nov ~23:40 UTC)
// «Kelvin pregunta si la ciudad viva frena el juego»: plaza de la Ciudad de los 36 (kelvin_ruinas_yunque,
// el sitio de la ciudad viva), perfil Chromebook ×6 con ?calidad=bajo&escuela=1, ciudad viva ENCENDIDA y
// APAGADA. Métricas (📣): draw calls · triángulos · FPS · mediana y p95 de cuadro · pausas >50 ms.
// OFF = pausa(true) del módulo + quitar sus entradas de G.bandada.EXTRA (mismo mecanismo que quitar()
// de ciudad_viva.js y que el propio ciudadVivaTest); el resto del mundo intacto. A/B en la misma página.
// Uso: node tools/build/kimi1_343_ciudadviva.js --etiqueta k343-r1 [--secs 12]
'use strict';
const fs = require('fs'), http = require('http'), os = require('os'), path = require('path');
const { spawn } = require('child_process');
const WebSocket = (() => { try { return require('ws'); } catch (e) { return global.WebSocket; } })();
const RAIZ = path.resolve(__dirname, '../..');
const SALIDA = path.join(RAIZ, 'docs/img/kimi345');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d; }
const ETIQUETA = arg('--etiqueta', 'k343-r1');
const CPU = parseInt(arg('--cpu', '6'), 10);
const SECS = parseInt(arg('--secs', '12'), 10);
const ANCHO = 1366, ALTO = 768, DPR = 1, CALIDAD = 'bajo', URL_EXTRA = 'escuela=1';
fs.mkdirSync(SALIDA, { recursive: true });
const LOG = path.join(SALIDA, `k345_${ETIQUETA}.log`);
const log = m => { const l = `[${new Date().toISOString().slice(11, 19)}] ${m}`; try { fs.appendFileSync(LOG, l + '\n'); } catch (e) { } console.log(l); };
const res = { tarea: 'KIMI-343', etiqueta: ETIQUETA, pantalla: `chromebook ${ANCHO}x${ALTO}@${DPR} cpuX${CPU}`, calidad: CALIDAD, urlExtra: URL_EXTRA, packs: ['cap1'], head: null };
function guardar() { try { fs.writeFileSync(path.join(SALIDA, `k345_${ETIQUETA}.json`), JSON.stringify(res, null, 1)); } catch (e) { } }

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

function semillaSave() {
  const save = {
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1k345-' + Math.random().toString(36).slice(2, 10),
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

// Ir a la plaza de la ciudad, encender la ciudad viva y dejar el mundo asentado
const PREP_JS = `(async () => { try { return await (async () => {
  const G = AV.G, S = AV.state, sleep = ms => new Promise(r => setTimeout(r, ms));
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(150); } return false; };
  if (!G.ciudadViva) { // alPrimerGesto no dispara en headless (lección KIMI-124): carga manual, misma cadena que boot.js
    try { await AVE.assets.script('src/game/ciudad_viva.js'); window.AVCiudadViva(G); } catch (e) { return 'ERR cargando ciudad_viva.js: ' + e; }
  }
  if (!await espera(() => G.ciudadViva && G.bandada && G.bandada.EXTRA, 30000)) return 'ERR ciudadViva/bandada sin cargar';
  const s = G.ciudadViva.sitio();
  if (!s) return 'ERR sin sitio de la ciudad (POI kelvin_ruinas_yunque)';
  const ST = G.mundo && G.mundo.streaming;
  try { ST.alrededor(s.x, s.z); } catch (e) {}
  G.pruebas.teleport(s.x + 18, s.z + 18); G.pruebas.tick(0.1);
  if (AV.debug && AV.debug.camYaw) AV.debug.camYaw(Math.atan2(-18, -18)); // mirando al centro de la plaza
  if (ST && ST.terminar) { try { await ST.terminar(); } catch (e) {} }
  if (G.solidos && G.solidos.terminar) { try { G.solidos.terminar(); } catch (e) {} }
  await sleep(2500);
  const esperadas = Math.ceil((G.ciudadViva.N.bajo || 20) / 2); // escuela: mitad (ciudad_viva.js cuantas())
  if (!await espera(() => G.ciudadViva.aves().length >= esperadas, 30000)) return 'ERR las aves no salieron: ' + G.ciudadViva.aves().length;
  await sleep(2000); // primer pintar + asentar
  return JSON.stringify({ sitio: { x: Math.round(s.x), z: Math.round(s.z), r: Math.round(s.r) }, esperadas, aves: G.ciudadViva.aves().length, extra: G.bandada.EXTRA.length });
})(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

const ESTADO_JS = `(() => { try { const G = AV.G;
  return JSON.stringify({ aves: G.ciudadViva.aves().length, extra: G.bandada.EXTRA.length,
    statsCV: G.ciudadViva.stats(), calidad: G.renderer.calidad.nivel, escuela: !!(G.renderer.calidad && G.renderer.calidad.escuela) });
} catch (e) { return 'ERR ' + e; } })()`;

// muestra de durSec: fps por rAF + stats 1/s + look.medir() + conteo de instancias de la ciudad viva
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
  let med = null, medErr = null;
  try { med = (AV.look && typeof AV.look.medir === 'function') ? AV.look.medir() : null; } catch (e) { medErr = String(e && e.message || e).slice(0, 200); }
  return JSON.stringify({ fpsPorSeg: porSeg, fpsMed: porSeg.length ? Math.round(porSeg.reduce((s, x) => s + x, 0) / porSeg.length) : null,
    fpsMin: porSeg.length ? Math.min.apply(null, porSeg) : null,
    peorMs: deltas.length ? Math.round(Math.max.apply(null, deltas)) : null,
    medianaMs: pct(0.5), p95Ms: pct(0.95), p99Ms: pct(0.99), pausas50,
    stats, aves: G.ciudadViva.aves().length, extra: G.bandada.EXTRA.length, statsCV: G.ciudadViva.stats(),
    med: med ? { calls: med.calls, triangulos: med.triangulos, texturasMB: med.texturasMB, geometrias: med.geometrias, heapMB: med.heapMB } : null, medErr,
    errores: (window.__erroresConsola || []).slice(0, 10) }); })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })`;

// OFF: pausa del módulo + quitar sus entradas de bandada.EXTRA (idéntico a quitar() de ciudad_viva.js)
const OFF_JS = `(() => { try { const G = AV.G;
  G.ciudadViva.pausa(true);
  const E = G.bandada.EXTRA;
  for (let i = E.length - 1; i >= 0; i--) if (E[i].ciudad) E.splice(i, 1);
  if (G.bandada.dibujar) G.bandada.dibujar();
  return JSON.stringify({ aves: G.ciudadViva.aves().length, extra: G.bandada.EXTRA.length });
} catch (e) { return 'ERR ' + e; } })()`;

const ON_JS = `(() => { try { const G = AV.G;
  G.ciudadViva.pausa(false);
  return JSON.stringify({ aves: G.ciudadViva.aves().length, extra: G.bandada.EXTRA.length });
} catch (e) { return 'ERR ' + e; } })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k345-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    `--window-size=${ANCHO},${ALTO}`, '--force-device-scale-factor=' + DPR, 'about:blank'];
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi1k345-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    require('child_process').execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const watch = setInterval(() => { try { guardar(); } catch (e) { } }, 5000);
  let tid = null; let ses = null;
  async function shot(nombre) {
    const s = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 60000);
    fs.writeFileSync(path.join(SALIDA, `k345_${ETIQUETA}_${nombre}.jpg`), Buffer.from(s.data, 'base64'));
  }
  async function medir(nombre, durSec) {
    log(`midiendo ${nombre} (${durSec}s)...`);
    const m = JSON.parse(await evaluar(cdp, ses, `(${MUESTRA_JS})(${durSec})`, durSec + 90));
    await shot(nombre);
    res[fases[nombre]] = m;
    guardar();
    log(`${nombre}: fpsMed=${m.fpsMed} min=${m.fpsMin} peorMs=${m.peorMs} mediana=${m.medianaMs} p95=${m.p95Ms} p99=${m.p99Ms} pausas50=${m.pausas50} aves=${m.aves} extra=${m.extra} med=${m.med ? m.med.calls + ' calls/' + (m.med.triangulos / 1e6).toFixed(2) + 'M/' + m.med.texturasMB + ' MB' : m.medErr || 'sin med'} errores=${JSON.stringify(m.errores || [])}`);
    return m;
  }
  const fases = { on: 'on', off: 'off', on2: 'on2' };
  try {
    log('navegando cap1 con ?calidad=bajo&escuela=1...');
    tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const mth of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(mth, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: false }, ses);
    try { await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses); } catch (e) { }
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: semillaSave() }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&calidad=${CALIDAD}&${URL_EXTRA}` }, ses);
    const t0 = Date.now(); let listo = false;
    while (Date.now() - t0 < 240000) {
      try { if (await evaluar(cdp, ses, `!!(window.AV && window.AV.G && window.AV.G.mundo && window.AV.G.mundo.listo)`, 10, false)) { listo = true; break; } } catch (e) { }
      await cdp.bombear(0.5);
    }
    if (!listo) throw new Error('el juego no arrancó');
    const ent = await evaluar(cdp, ses, ENTRAR_JS, 150);
    if (!/^ok/.test(ent)) throw new Error('entrada: ' + ent);
    res.head = await evaluar(cdp, ses, `(() => { try { return (AV.G.build && (AV.G.build.commit || AV.G.build.id)) || 'desconocido'; } catch (e) { return 'desconocido'; } })()`, 10);
    log('entrada ok; preparando la plaza de la ciudad...');
    const prep = JSON.parse(await evaluar(cdp, ses, PREP_JS, 180));
    if (prep.sitio) { res.prep = prep; log(`plaza: sitio=${prep.sitio.x},${prep.sitio.z} r${prep.sitio.r} aves=${prep.aves} extra=${prep.extra} (esperadas ${prep.esperadas})`); }
    else throw new Error('prep: ' + JSON.stringify(prep));

    const on = await medir('on', SECS);
    const off0 = await evaluar(cdp, ses, OFF_JS, 20);
    log('OFF aplicado: ' + off0);
    await cdp.bombear(1.5);
    res.estadoOff = await evaluar(cdp, ses, ESTADO_JS, 15);
    const off = await medir('off', SECS);
    const on0 = await evaluar(cdp, ses, ON_JS, 20);
    log('ON reaplicado: ' + on0);
    await cdp.bombear(2.5);
    res.estadoOn2 = await evaluar(cdp, ses, ESTADO_JS, 15);
    const on2 = await medir('on2', Math.max(6, Math.round(SECS / 2)));

    res.resumen = {
      aves: on.aves, extraOn: on.extra, extraOff: off.extra,
      callsMed: { on: on.med && on.med.calls, off: off.med && off.med.calls, on2: on2.med && on2.med.calls },
      trisMed: { on: on.med && on.med.triangulos, off: off.med && off.med.triangulos, on2: on2.med && on2.med.triangulos },
      fpsMed: { on: on.fpsMed, off: off.fpsMed, on2: on2.fpsMed },
      medianaMs: { on: on.medianaMs, off: off.medianaMs, on2: on2.medianaMs },
      p95Ms: { on: on.p95Ms, off: off.p95Ms, on2: on2.p95Ms },
      pausas50: { on: on.pausas50, off: off.pausas50, on2: on2.pausas50 }
    };
    res.erroresConsola = await evaluar(cdp, ses, `(window.__erroresConsola || []).slice(0, 30)`, 15);
    log('errores de consola: ' + JSON.stringify(res.erroresConsola));
    guardar();
  } catch (e) {
    res.error = String(e && e.message || e).slice(0, 400);
    log('ERROR ' + res.error);
    guardar();
  } finally {
    clearInterval(watch);
    guardar();
    if (tid) await cdp.call('Target.closeTarget', { targetId: tid }).catch(() => { });
    try { chrome.kill(); } catch (e) { }
    mataPorPerfil();
    srv.close();
    console.log('· JSON: ' + path.join(SALIDA, `k345_${ETIQUETA}.json`));
    process.exit(res.error ? 1 : 0);
  }
})().catch(e => { console.error('FALLO:', e.message); try { mataPorPerfil(); } catch (e2) { } process.exit(1); });
