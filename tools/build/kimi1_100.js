#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-100: las 7 pruebas V18 con GPU real en HEAD.
   Cola 1c (5-nov 20:10 UTC, coordinadora): "las 12 baterías + las V18 (v18CicloTest, v18RepararTest,
   v18AmenazaTest, v18NuevasTest, v18Duelo2Test, v18FxTest, v18CombateTest) con GPU real en HEAD".
   Cada prueba carga la página de nuevo con la semilla limpia (localStorage.clear + partida v6 +
   progreso v18 fiel a una partida real: vittata seleccionada — sin eso seleccionables() queda vacío y
   el ciclo falla por artefacto de la semilla, lección de kimi2_k088), entra sin creador, salta la
   intro y dispara la API pública AV.v18*Test. Se miden FPS/calls/tris/heap de contexto y se capturan
   los errores de consola entre carga y carga. La herramienta NO toca el juego.
   Uso: node tools/build/kimi1_100.js --etiqueta r1 [--solo fx|ciclo|reparar|amenaza|nuevas|duelo2|combate]
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
const SOLO = arg('--solo', '');
const ESCRITORIO = process.argv.includes('--escritorio');
const ANCHO = ESCRITORIO ? 1600 : 390, ALTO = ESCRITORIO ? 900 : 844, DPR = ESCRITORIO ? 1 : 3, CPUX = ESCRITORIO ? 1 : 4;
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi100'));
fs.mkdirSync(SALIDA, { recursive: true });

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi1k100-/.test(d)) continue;
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

const SEMILLA_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1k100-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null, species: 'vittata' },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
  localStorage.setItem('amazonaverse.v18', JSON.stringify({ v: 1, sel: 'vittata', especies: { vittata: 'seleccionada' }, inv: {}, otorgados: {}, mundo: {} }));
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

/* cada prueba: fresh page, entrar, asentar, medir base 3 s, correr AV.v18*Test, medir contexto */
const PRUEBAS = [
  { id: 'fx', nombre: 'v18FxTest', fn: 'v18FxTest', tope: 180 },
  { id: 'ciclo', nombre: 'v18CicloTest', fn: 'v18CicloTest', tope: 600 },
  { id: 'reparar', nombre: 'v18RepararTest', fn: 'v18RepararTest', tope: 300 },
  { id: 'amenaza', nombre: 'v18AmenazaTest', fn: 'v18AmenazaTest', tope: 300 },
  { id: 'nuevas', nombre: 'v18NuevasTest', fn: 'v18NuevasTest', tope: 300 },
  { id: 'duelo2', nombre: 'v18Duelo2Test', fn: 'v18Duelo2Test', tope: 300 },
  { id: 'combate', nombre: 'v18CombateTest', fn: 'v18CombateTest', tope: 300 },
];
function jsPrueba(p) {
  return `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
  const stats = () => { try { const s = G.renderer.stats(); const m = G.renderer.renderer.info.memory; return { calls: s.calls, tris: s.triangulos, geo: m.geometries, tex: m.textures, prog: G.renderer.renderer.info.programs.length }; } catch (e) { return { err: String(e && e.message || e) }; } };
  const heap = () => (performance.memory && performance.memory.usedJSHeapSize) ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
  const asentar = async (topeMs) => { const t0 = performance.now(); topeMs = topeMs || 30000;
    while (performance.now() - t0 < topeMs) { try { const s = G.renderer.stats(); if (s.calls > 10) { await new Promise(r => requestAnimationFrame(r)); if (G.renderer.stats().calls > 10) return true; } } catch (e) {} await sleep(250); }
    return false; };
  const medir = async secs => { const marcas = [], cuadros = []; let ant = performance.now(); const t0 = performance.now();
    while (performance.now() - t0 < secs * 1000) { await new Promise(r => requestAnimationFrame(r)); const a = performance.now(); cuadros.push(a - ant); ant = a; marcas.push(stats()); }
    cuadros.shift(); const ord = cuadros.slice().sort((x, y) => x - y);
    const med = ord.length ? ord[Math.floor(ord.length / 2)] : 0, p10 = ord.length ? ord[Math.floor(ord.length * 0.9)] : 0;
    const prom = m => Math.round(m.reduce((s, x) => s + x, 0) / (m.length || 1));
    return { fpsMed: Math.round(1000 / (med || 1) * 10) / 10, peorMs: Math.round(Math.max(0, ...cuadros)), n: cuadros.length,
      callsMed: prom(marcas.map(m => m.calls || 0)), trisMed: prom(marcas.map(m => m.tris || 0)) }; };
  const out = { v18: G.V18, calidad: (G.renderer && G.renderer.calidad) || '?' };
  try {
    try { await G.streaming.terminar(); } catch (e) {}
    await asentar(); await sleep(800);
    out.base = await medir(3); out.base.heap = heap();
    const t0 = performance.now();
    const t = await AV.${p.fn}();
    out.duracionMs = Math.round(performance.now() - t0);
    out.test = { passed: t.passed, total: t.total, fallos: (t.results || []).filter(r => !r.ok).map(r => r.name + ' :: ' + String(r.extra).slice(0, 300)) };
    out.contexto = stats(); out.contexto.heap = heap();
  } catch (e) { out.error = String(e && e.stack || e); }
  return JSON.stringify(out); })()`;
}

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k100-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--window-size=390,844', 'about:blank'];
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi1k100-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

async function cargarPagina(cdp, ses, origen, id) {
  await cdp.call('Page.enable', {}, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&v18=1` }, ses);
  const t0 = Date.now(); let listo = false;
  while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
    try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
    await cdp.bombear(0.5);
  }
  if (!listo) throw new Error('el juego no arrancó (' + id + ')');
  const ent = await evaluar(cdp, ses, ENTRAR_JS, 120);
  if (!/^ok/.test(ent)) throw new Error('entrada (' + id + '): ' + ent);
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const lista = SOLO ? PRUEBAS.filter(p => p.id === SOLO) : PRUEBAS;
  const res = { etiqueta: ETIQUETA, pantalla: ESCRITORIO ? `escritorio ${ANCHO}x${ALTO}@${DPR} cpuX${CPUX}` : `movil ${ANCHO}x${ALTO}@${DPR} cpuX${CPUX} (iPhone emulado)`, head: null, pruebas: {} };  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: !ESCRITORIO }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPUX }, ses);
    if (!ESCRITORIO) await cdp.call('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS }, ses);
    const errores = [];
    cdp.ws.addEventListener('message', m => {
      try { const d = JSON.parse(m.data);
        if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errores.push('console.error: ' + (d.params.args || []).map(a => a.value || a.description || '').join(' ').slice(0, 300));
        if (d.method === 'Log.entryAdded' && d.params.entry && d.params.entry.level === 'error') errores.push('log: ' + String(d.params.entry.text).slice(0, 300));
      } catch (e) { }
    });
    for (const p of lista) {
      const r = { erroresConsola: [] };
      try {
        await cargarPagina(cdp, ses, origen, p.id);
        if (!res.head) res.head = await evaluar(cdp, ses, `(() => { try { return (AV.G.build && (AV.G.build.commit || AV.G.build.id)) || 'desconocido'; } catch (e) { return 'desconocido'; } })()`, 10);
        errores.length = 0;
        r.datos = JSON.parse(await evaluar(cdp, ses, jsPrueba(p), p.tope));
        r.erroresConsola = errores.slice(0, 12);
      } catch (e) { r.error = String(e && e.message || e); }
      res.pruebas[p.id] = r;
      // resumen en línea por prueba para el log
      const d = r.datos || {};
      console.log(`[${p.id}] ${d.test ? (d.test.passed + '/' + d.test.total + (d.test.fallos.length ? ' fallos:' + JSON.stringify(d.test.fallos).slice(0, 200) : '')) : ('ERROR ' + (r.error || d.error || ''))} base=${d.base ? d.base.fpsMed + 'fps' : '-'} err=${r.erroresConsola.length}`);
    }
  } catch (e) { res.error = String(e && e.message || e); }
  fs.writeFileSync(path.join(SALIDA, `k100_${ETIQUETA}.json`), JSON.stringify(res, null, 1));
  try { chrome.kill('SIGKILL'); } catch (e) { }
  mataPorPerfil();
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close();
  const mal = res.error || Object.values(res.pruebas).some(p => p.error || (p.datos && p.datos.error));
  process.exit(mal ? 1 : 0);
})();
