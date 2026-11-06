#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-145 (QA-181 «Queda» palanca 3/3): «coste de grafo
   de escena en three.js». KIMI-132 midió en cap1 a ×6: three.js 35,2 % del hilo con
   updateMatrixWorld 5,9 % + multiplyMatrices 3,1 %. Esta sonda atribuye DE DÓNDE viene:
     - cap1 y ep3 (extensible con --packs): partida sembrada sin creador, entrada real,
       spawn asentado (ST.terminar + 2 s);
     - CENSO del grafo: N de Object3D vivos por tipo, matrixAutoUpdate=true/false, subárboles
       con más nodos dinámicos (quien mantiene vivo el coste), envoltorio de
       Object3D.prototype.updateMatrixWorld/updateMatrix/Matrix4.multiplyMatrices durante 40
       cuadros: llamadas por cuadro, recomposiciones de matrix y de matrixWorld;
     - ventana de perfil CDP Profiler (default 12 s) quieta pero viva, self-time por módulo y
       top de funciones (mismo método que kimi1_132/kimi3_calor.js).
   El juego NO se toca: solo lectura y API pública. Sin ?qa=1 (batería concurrente, KIMI-052).
   Uso: node tools/build/kimi1_145.js --etiqueta r1 [--packs cap1,ep3] [--ventana 12] [--cuadros 40]
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
const CPU = parseInt(arg('--cpu', '6'), 10);
const VENTANA_S = parseInt(arg('--ventana', '15'), 10);
const CUADROS = parseInt(arg('--cuadros', '40'), 10);
const ANCHO = parseInt(arg('--ancho', '1366'), 10);
const ALTO = parseInt(arg('--alto', '768'), 10);
const DPR = parseFloat(arg('--dpr', '1'));
const PACKS = arg('--packs', 'cap1,ep3').split(',');
const CALIDAD = 'bajo';
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi145'));
fs.mkdirSync(SALIDA, { recursive: true });
const LOGF = path.join(SALIDA, `k145_${ETIQUETA}.log`);
fs.writeFileSync(LOGF, '');
function log(msg) { try { fs.appendFileSync(LOGF, `[${new Date().toISOString().slice(11, 19)}] ${msg}\n`); } catch (e) { } }
const res = { tarea: 'KIMI-145', bug: 'QA-181', etiqueta: ETIQUETA, pantalla: `chromebook ${ANCHO}x${ALTO}@${DPR} cpuX${CPU}`, calidad: CALIDAD, packs: PACKS, ventanaPerfilS: VENTANA_S, head: null, nota: 'PC compartida con otra sesion Kimi durante la medicion: self-time % (throttling por proceso) valido; tiempos absolutos = techo' };
function guardar() { try { fs.writeFileSync(path.join(SALIDA, `k145_${ETIQUETA}.json`), JSON.stringify(res, null, 1)); } catch (e) { } }

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi1k145-/.test(d)) continue;
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

function semillaSave(pack) {
  const clave = pack === 'cap1' ? 'amazonaverse.save' : pack + '.save';
  const v = pack === 'cap1' ? 6 : 1;
  const save = {
    v, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1k145-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  };
  if (pack !== 'cap1') {
    save.lugares = []; save.canoa = null;
    save.edu = { inicio: null, fin: null, fichas: [], formativa: {}, registro: null };
  }
  return `try {
  localStorage.clear(); sessionStorage.clear();
  window.__erroresConsola = [];
  addEventListener('error', e => __erroresConsola.push(String(e.message || e)));
  addEventListener('unhandledrejection', e => __erroresConsola.push('rechazo: ' + (e.reason && e.reason.message || e.reason)));
  const cerr = console.error; console.error = function () { try { __erroresConsola.push([].map.call(arguments, String).join(' ').slice(0, 300)); } catch (e) {} return cerr.apply(this, arguments); };
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem(${JSON.stringify(clave)}, ${JSON.stringify(JSON.stringify(save))});
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

// asentar el spawn (mismo criterio que KIMI-127) y preparar el colector de rAF
const ASENTAR_JS = `(async () => { try { return await (async () => {
  const G = AV.G, S = AV.state, sleep = ms => new Promise(r => setTimeout(r, ms));
  const ST = G.mundo && G.mundo.streaming;
  if (ST) { try { if (ST.alrededor) await ST.alrededor(S.pos.x, S.pos.z); } catch (e) {} try { if (ST.terminar) await ST.terminar(); } catch (e) {} }
  if (G.solidos && G.solidos.terminar) { try { G.solidos.terminar(); } catch (e) {} }
  await sleep(2000);
  window.__k132raf = { deltas: [], ult: performance.now(), vivo: true };
  window.__k132marca = () => { const k = window.__k132raf; if (!k || !k.vivo) return; const a = performance.now(); k.deltas.push(a - k.ult); k.ult = a; requestAnimationFrame(window.__k132marca); };
  requestAnimationFrame(window.__k132marca);
  const st = G.renderer.stats(); const m = performance.memory;
  return JSON.stringify({ pos: [Math.round(S.pos.x * 10) / 10, Math.round(S.pos.z * 10) / 10], calls: st.calls,
    ktris: st.triangulos != null ? Math.round(st.triangulos / 1000) : null, fpsMedidor: st.fps, dpr: st.dpr,
    heapMB: m ? Math.round(m.usedJSHeapSize / 1048576) : null }); })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

const CIERRE_RAF_JS = `(() => { try {
  const k = window.__k132raf || { deltas: [] }; k.vivo = false;
  const deltas = k.deltas.slice(); if (deltas.length) deltas.shift();
  const porSeg = []; let ac = 0, n = 0;
  for (const d of deltas) { ac += d; n++; if (ac >= 1000) { porSeg.push(Math.round(1000 / (ac / n))); ac = 0; n = 0; } }
  if (n > 5) porSeg.push(Math.round(1000 / (ac / n)));
  const orden = deltas.slice().sort((a, b) => a - b);
  return JSON.stringify({ cuadros: deltas.length, fpsPorSeg: porSeg,
    fpsMed: porSeg.length ? Math.round(porSeg.reduce((s, x) => s + x, 0) / porSeg.length) : null,
    fpsMin: porSeg.length ? Math.min.apply(null, porSeg) : null,
    peorMs: deltas.length ? Math.round(Math.max.apply(null, deltas)) : null,
    p95Ms: orden.length ? Math.round(orden[Math.min(orden.length - 1, Math.floor(orden.length * 0.95))]) : null }); } catch (e) { return '{"error":"' + String(e && e.message || e).slice(0, 120) + '"}'; } })()`;

// CENSO del grafo de escena: quién mantiene vivo el coste de updateMatrixWorld/multiplyMatrices.
// Envuelve los prototipos de three durante N cuadros y cuenta llamadas/recomposiciones por cuadro,
// más el inventario estático del grafo (N por tipo, matrixAutoUpdate, subárboles dinámicos).
const CENSO_JS = `(async () => { try { return await (async () => {
  const G = AV.G, sleep = ms => new Promise(r => setTimeout(r, ms));
  const R = G.renderer && G.renderer.renderer ? G.renderer.renderer : (G.renderer.render ? G.renderer : null);
  const scene = R && R.scene ? R.scene : (G.renderer.scene || (G.mundo && G.mundo.escena));
  if (!scene) return 'ERR sin escena';
  // 1) inventario estático
  const porTipo = {}, autoTrue = [], porHijo = [];
  let N = 0, Nvis = 0;
  const dinamicoCercaDe = (o) => { let p = o; while (p) { if (p.name) return p.name; p = p.parent; } return '(raíz)'; };
  scene.traverse(o => {
    N++; const t = o.type || 'Object3D'; porTipo[t] = (porTipo[t] || 0) + 1;
    if (o.visible) Nvis++;
  });
  let Nauto = 0; scene.traverse(o => { if (o.matrixAutoUpdate) Nauto++; });
  const dinPorAncestro = {};
  scene.traverse(o => { if (o.matrixAutoUpdate) { const k = dinamicoCercaDe(o); dinPorAncestro[k] = (dinPorAncestro[k] || 0) + 1; } });
  for (const h of scene.children) { let n = 0; h.traverse(() => n++); porHijo.push({ nombre: h.name || h.type, n }); }
  porHijo.sort((a, b) => b.n - a.n);
  // 2) envoltorio por cuadros (prototipos sacados de la propia escena: THREE no es global)
  const CUADROS = window.__k145cuadros || 40;
  let P = Object.getPrototypeOf(scene);
  while (P && !(P.hasOwnProperty && P.hasOwnProperty('updateMatrixWorld'))) P = Object.getPrototypeOf(P);
  if (!P || typeof P.updateMatrixWorld !== 'function') return 'ERR prototipo Object3D no hallado';
  const M = scene.matrix.constructor.prototype;
  if (!M || typeof M.multiplyMatrices !== 'function') return 'ERR prototipo Matrix4 no hallado';
  const st = { umw: 0, um: 0, mm: 0, umwFuerza: 0 };
  const umw0 = P.updateMatrixWorld, um0 = P.updateMatrix, mm0 = M.multiplyMatrices;
  P.updateMatrixWorld = function (fuerza) { st.umw++; if (fuerza) st.umwFuerza++; return umw0.call(this, fuerza); };
  P.updateMatrix = function () { st.um++; return um0.call(this); };
  M.multiplyMatrices = function (a, b) { st.mm++; return mm0.call(this, a, b); };
  // cuenta de nodos marcados matrixWorldNeedsUpdate justo antes de cada render (5 pistas)
  const antes = [];
  let pista = 0;
  const cuentaMarca = () => { if (pista >= 5) return; let n = 0; try { scene.traverse(o => { if (o.matrixWorldNeedsUpdate) n++; }); } catch (e) {} antes[pista++] = n; };
  const timer = setInterval(cuentaMarca, 400);
  await new Promise(re => { let f = 0; const paso = () => { if (++f >= CUADROS) return re(); requestAnimationFrame(paso); }; requestAnimationFrame(paso); });
  clearInterval(timer);
  P.updateMatrixWorld = umw0; P.updateMatrix = um0; M.multiplyMatrices = mm0;
  return JSON.stringify({ N, Nvis, Nauto, porTipoTop: Object.entries(porTipo).sort((a, b) => b[1] - a[1]).slice(0, 14).map(e => e[0] + ' ' + e[1]),
    dinamicosPorAncestro: Object.entries(dinPorAncestro).sort((a, b) => b[1] - a[1]).slice(0, 12),
    hijosTop: porHijo.slice(0, 12), porCuadro: { umw: +(st.umw / CUADROS).toFixed(0), umwFuerza: +(st.umwFuerza / CUADROS).toFixed(0), um: +(st.um / CUADROS).toFixed(0), mm: +(st.mm / CUADROS).toFixed(0) },
    marcasMWNporPista: antes }); })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

// bucket de módulo por URL del callFrame (lo que pide QA-181: renderer vs streaming vs vegetación)
function moduloDe(url, nombre) {
  if (!url) return nombre === '(program)' ? 'nativo' : 'anónima/sin-url';
  const u = String(url);
  if (u.includes('src/engine/renderer.js')) return 'renderer';
  if (u.includes('src/engine/streaming.js')) return 'streaming';
  if (u.includes('src/engine/vegetacion.js')) return 'vegetacion';
  if (u.includes('src/engine/solidos.js')) return 'solidos';
  if (u.includes('src/engine/fisica.js')) return 'fisica';
  if (u.includes('src/engine/terreno.js')) return 'terreno';
  if (u.includes('src/engine/agua.js')) return 'agua';
  if (u.includes('src/engine/cielo.js')) return 'cielo';
  if (u.includes('src/engine/assets.js')) return 'assets';
  if (u.includes('src/engine/mundo.js')) return 'mundo';
  if (u.includes('src/engine/')) return 'engine/otro';
  if (u.includes('src/game/')) return 'game';
  if (u.includes('src/ui/')) return 'ui';
  if (u.includes('src/pruebas/') || u.includes('tests/')) return 'pruebas';
  if (u.includes('content/')) return 'content';
  if (u.includes('boot.js')) return 'boot';
  if (/three/i.test(u)) return 'three.js';
  return 'otro:' + u.split('/').slice(-2).join('/');
}

// self-time por función y por módulo reconstruido desde samples + timeDeltas (método de kimi3_calor.js)
function atribuir(profile) {
  const nodos = new Map();
  for (const nd of profile.nodes || []) nodos.set(nd.id, nd);
  const porFuncion = {}, porModulo = {};
  const samples = profile.samples || [], deltas = profile.timeDeltas || [];
  let totalUs = 0;
  for (let i = 0; i < samples.length; i++) {
    const dt = deltas[i] || 0; totalUs += dt;
    const nd = nodos.get(samples[i]);
    if (!nd) continue;
    const cf = nd.callFrame || {};
    const nombre = cf.functionName || '(anónima)';
    const mod = moduloDe(cf.url, nombre);
    const clave = mod + ' · ' + nombre;
    (porFuncion[clave] || (porFuncion[clave] = { selfUs: 0, hits: 0 })).selfUs += dt;
    (porModulo[mod] || (porModulo[mod] = { selfUs: 0, hits: 0 })).selfUs += dt;
  }
  for (const nd of profile.nodes || []) {
    if (!nd.hitCount) continue;
    const cf = nd.callFrame || {};
    const nombre = cf.functionName || '(anónima)';
    const mod = moduloDe(cf.url, nombre);
    const clave = mod + ' · ' + nombre;
    (porFuncion[clave] || (porFuncion[clave] = { selfUs: 0, hits: 0 })).hits += nd.hitCount;
    (porModulo[mod] || (porModulo[mod] = { selfUs: 0, hits: 0 })).hits += nd.hitCount;
  }
  return { porFuncion, porModulo, totalUs };
}

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k145-'));
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi1k145-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const watch = setInterval(() => { try { guardar(); } catch (e) { } log('…latido'); }, 5000);
  let tid = null;
  async function paginaFresca(seedJS, url) {
    if (tid) { await cdp.call('Target.closeTarget', { targetId: tid }).catch(() => { }); tid = null; }
    tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable', 'Profiler.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: false }, ses);
    try { await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses); } catch (e) { }
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: seedJS }, ses);
    const t0 = Date.now();
    await cdp.call('Page.navigate', { url }, ses);
    let listo = false;
    while (Date.now() - t0 < Math.max(CFG.espera_listo_s || 150, 240) * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
      await cdp.bombear(0.5);
    }
    if (!listo) throw new Error('el juego no arrancó');
    const cargaListaS = (Date.now() - t0) / 1000;
    const ent = await evaluar(cdp, ses, ENTRAR_JS, 150);
    if (!/^ok/.test(ent)) throw new Error('entrada: ' + ent);
    const cargaEntrarS = (Date.now() - t0) / 1000;
    return { ses, cargaListaS, cargaEntrarS };
  }
  try {
    res.packs = {};
    for (const pack of PACKS) {
      try {
        log(`pack ${pack}: navegando...`);
        const { ses, cargaListaS, cargaEntrarS } = await paginaFresca(semillaSave(pack), `${origen}/index.html?pack=${pack}&mapa=real&calidad=${CALIDAD}`);
        if (!res.head) res.head = await evaluar(cdp, ses, `(() => { try { return (AV.G.build && (AV.G.build.commit || AV.G.build.id)) || 'desconocido'; } catch (e) { return 'desconocido'; } })()`, 10);
        log(`pack ${pack}: listo en ${cargaListaS}s, entrada en ${cargaEntrarS}s; asentando y perfilando ${VENTANA_S}s`);
        const asentado = JSON.parse(await evaluar(cdp, ses, ASENTAR_JS, 120));
        res.packs[pack] = res.packs[pack] || {};
        await evaluar(cdp, ses, `window.__k145cuadros = ${CUADROS}; 'ok'`, 5, false);
        const censo = await evaluar(cdp, ses, CENSO_JS, 90);
        res.packs[pack].censo = /^ERR/.test(censo) ? censo : JSON.parse(censo);
        log(`pack ${pack}: censo ${typeof res.packs[pack].censo === 'string' ? res.packs[pack].censo : 'N=' + res.packs[pack].censo.N + ' auto=' + res.packs[pack].censo.Nauto + ' mm/cuadro=' + res.packs[pack].censo.porCuadro.mm}`);
        // ventana de perfil con la vista quieta (sigue dibujando cuadros; rAF corre en paralelo)
        await cdp.call('Profiler.start', {}, ses);
        await cdp.bombear(VENTANA_S);
        const prof = (await cdp.call('Profiler.stop', {}, ses, 90000)).profile;
        const raf = JSON.parse(await evaluar(cdp, ses, CIERRE_RAF_JS, 15, false));
        const fin = JSON.parse(await evaluar(cdp, ses, `JSON.stringify((() => { try { const st = AV.G.renderer.stats(); const m = performance.memory; return { calls: st.calls, ktris: st.triangulos != null ? Math.round(st.triangulos / 1000) : null, fpsMedidor: st.fps, dpr: st.dpr, heapMB: m ? Math.round(m.usedJSHeapSize / 1048576) : null }; } catch (e) { return {}; } })())`, 10, false));
        const { porFuncion, porModulo, totalUs } = atribuir(prof);
        const modulo = Object.entries(porModulo).map(([nombre, t]) => ({ modulo: nombre, selfMs: +(t.selfUs / 1000).toFixed(1), pct: totalUs ? +(100 * t.selfUs / totalUs).toFixed(2) : 0 })).sort((a, b) => b.selfMs - a.selfMs);
        const funciones = Object.entries(porFuncion).map(([nombre, t]) => ({ funcion: nombre, selfMs: +(t.selfUs / 1000).toFixed(1), hits: t.hits, pct: totalUs ? +(100 * t.selfUs / totalUs).toFixed(2) : 0 })).sort((a, b) => b.selfMs - a.selfMs).slice(0, 45);
        const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 60000);
        fs.writeFileSync(path.join(SALIDA, `k145_${ETIQUETA}_${pack}.jpg`), Buffer.from(shot.data, 'base64'));
        res.packs[pack] = { ...res.packs[pack], cargaListaS: Math.round(cargaListaS * 10) / 10, cargaEntradaS: Math.round(cargaEntrarS * 10) / 10, asentado, raf, fin,
          perfil: { duracionMs: Math.round(totalUs / 1000), muestras: (prof.samples || []).length, modulo, funciones },
          errores: await evaluar(cdp, ses, `(window.__erroresConsola || []).slice(0, 10)`, 10, false) };
        guardar();
        const top = modulo.slice(0, 6).map(m => `${m.modulo} ${m.pct}%`).join(' · ');
        log(`pack ${pack}: fpsMed=${raf.fpsMed} min=${raf.fpsMin} p95=${raf.p95Ms}ms calls=${fin.calls} ktris=${fin.ktris} heap=${fin.heapMB}MB | perfil ${Math.round(totalUs / 1000)}ms | top: ${top} | errores=${JSON.stringify(res.packs[pack].errores || [])}`);
      } catch (e) {
        res.packs[pack] = { error: String(e && e.message || e).slice(0, 300) };
        log(`pack ${pack}: ERROR ${res.packs[pack].error}`);
        guardar();
      }
    }
  } finally {
    clearInterval(watch);
    guardar();
    if (tid) await cdp.call('Target.closeTarget', { targetId: tid }).catch(() => { });
    try { chrome.kill(); } catch (e) { }
    mataPorPerfil();
    srv.close();
    log('evidencia: ' + path.join(SALIDA, `k145_${ETIQUETA}.json`));
    console.log('· JSON: ' + path.join(SALIDA, `k145_${ETIQUETA}.json`));
    const hayError = Object.values(res.packs || {}).some(c => c.error);
    process.exit(hayError ? 1 : 0);
  }
})().catch(e => { console.error('FALLO:', e.message); try { mataPorPerfil(); } catch (e2) { } process.exit(1); });
