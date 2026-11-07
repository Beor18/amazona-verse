#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-106: regresión V18.1 con GPU real (parte GPU del reparto 1d).
   Corre las 14 pruebas V18 (las 7 originales de KIMI-100 + v18Test, v18DescubrirTest, v18EvolucionTest,
   v18SapoTest, v18SerpienteTest, v18MisterioTest, v18MinigolfTest — lo nuevo de V18.2/V18.3) en móvil
   emulado 390×844 dpr 3 CPU ×4 con ?v18=1 y bandera apagada (misma lista: con la bandera apagada los
   módulos no cargan y AV.v18*Test no existe → lo reporta como 'sin bandera: módulo ausente (OK, inerte)').
   Basada en tools/build/kimi1_100.js (misma semilla fiel: partida v6 + progreso .v18 con vittata).
   Casos documentados como de diseño (no cuentan como rojo): v18MisterioTest 6/7 en móvil «bajo» (la cara
   de la Maraña se apaga en «bajo», contrato KIMI-063) y v18Duelo2Test 22/23 en iPhone (el duelo 2 es de
   escritorio por diseño: duelo2.js disponible() = !tactil(), KIMI-100). Escribe el JSON incrementalmente
   tras cada prueba (sobrevive a cortes) y sale 1 si hay error de herramienta o de consola nueva.

   Uso: node tools/build/kimi1_106.js --etiqueta r1 [--bandera 0|1] [--solo fx|ciclo|...]
                                        [--reinicia-cada N] ( QA-111 residual: rearranque preventivo del navegador cada N pruebas )
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
const BANDERA = arg('--bandera', '1') !== '0'; // 1 = ?v18=1 (default), 0 = regresión sin bandera
const ESCRITORIO = process.argv.includes('--escritorio');
const TACTIL = process.argv.includes('--tactil'); // emula puntero grueso (botones táctiles del HUD; QA-185/187)
// QA-111 residual (palanca de KIMI-199 portada de kimi2_empezar.js): rearranque preventivo del navegador
// cada N pruebas (0 = apagado: comportamiento actual). La suite monolítica de 18 pruebas se comía 1-2
// crashes del proceso de GPU en Chrome 156 (carga acumulada de teleports+GLB entre navegaciones); cada
// prueba recarga la página, pero el PROCESO del navegador envejece igual: reiniciarlo cada N pruebas
// sale por ~10-20 s de reentrada y lo deja fresco.
const REINICIA_CADA = parseInt(arg('--reinicia-cada', '0'), 10) || 0;
const ANCHO = ESCRITORIO ? 1600 : 390, ALTO = ESCRITORIO ? 900 : 844, DPR = ESCRITORIO ? 1 : 3, CPUX = ESCRITORIO ? 1 : 4;
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi106r'));
fs.mkdirSync(SALIDA, { recursive: true });

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi1k106-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
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
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1k106-' + Math.random().toString(36).slice(2, 10),
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
  await espera(() => { try { const AV = window.AV; return AV && AV.G && AV.G.player3D && AV.G.S && AV.G.S.step != null && AV.G.renderer && AV.G.renderer.stats().calls >= 0; } catch (e) { return false; } }, 90000);
  try { const AV = window.AV; if (AV.G.intro && AV.G.intro.saltar) AV.G.intro.saltar(); } catch (e) {}
  await espera(() => { try { return window.AV.G.renderer.stats().calls > 5; } catch (e) { return false; } }, 60000);
  await sleep(1500);
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

/* las 18 pruebas V18. min = mínimo esperado en este perfil (documentado como diseño, no es rojo) */
const PRUEBAS = [
  { id: 'progreso', nombre: 'v18Test', fn: 'v18Test', tope: 240, min: 1 },
  { id: 'explorar', nombre: 'v18ExplorarTest', fn: 'v18ExplorarTest', tope: 300, min: 1 },
  { id: 'fx', nombre: 'v18FxTest', fn: 'v18FxTest', tope: 180, min: 1 },
  { id: 'descubrir', nombre: 'v18DescubrirTest', fn: 'v18DescubrirTest', tope: 300, min: 1 },
  { id: 'ciclo', nombre: 'v18CicloTest', fn: 'v18CicloTest', tope: 600, min: 1 },
  { id: 'reparar', nombre: 'v18RepararTest', fn: 'v18RepararTest', tope: 300, min: 1 },
  { id: 'amenaza', nombre: 'v18AmenazaTest', fn: 'v18AmenazaTest', tope: 300, min: 1 },
  { id: 'nuevas', nombre: 'v18NuevasTest', fn: 'v18NuevasTest', tope: 300, min: 1 },
  { id: 'combate', nombre: 'v18CombateTest', fn: 'v18CombateTest', tope: 300, min: 1 },
  { id: 'duelo2', nombre: 'v18Duelo2Test', fn: 'v18Duelo2Test', tope: 300, min: 22 }, // iPhone: 22/23 documentado (cámara compartida FOV portrait; el duelo 2 es de escritorio por diseño)
  { id: 'misterio', nombre: 'v18MisterioTest', fn: 'v18MisterioTest', tope: 300, min: 6 }, // móvil «bajo»: 6/7 documentado (cara apagada en «bajo», contrato KIMI-063)
  { id: 'minigolf', nombre: 'v18MinigolfTest', fn: 'v18MinigolfTest', tope: 300, min: 1 },
  { id: 'evolucion', nombre: 'v18EvolucionTest', fn: 'v18EvolucionTest', tope: 600, min: 1 },
  { id: 'sapo', nombre: 'v18SapoTest', fn: 'v18SapoTest', tope: 300, min: 1 },
  { id: 'serpiente', nombre: 'v18SerpienteTest', fn: 'v18SerpienteTest', tope: 300, min: 1 },
  { id: 'puerto', nombre: 'v18PuertoTest', fn: 'v18PuertoTest', tope: 300, min: 1 }, // V18.3 «El puerto que volvió a vivir» (KIMI-130 corrida 2)
  { id: 'moon', nombre: 'v18MoonTest', fn: 'v18MoonTest', tope: 300, min: 1 }, // V18.2 Maestro Moon (KIMI-130 corrida 7 lo corría fuera de la suite)
  { id: 'guardian', nombre: 'v18GuardianTest', fn: 'v18GuardianTest', tope: 300, min: 1 }, // V18.2 Guardián del Primer Vuelo (idem)
  { id: 'chispa', nombre: 'v18ChispaTest', fn: 'v18ChispaTest', tope: 300, min: 1 }, // V18.3 carrera de Chispa (anotado en KIMI-169: «la suite aún no incluye la 16ª prueba»)
];
function jsPrueba(p) {
  return `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G;
  const stats = () => { try { const s = G.renderer.stats(); const m = G.renderer.renderer.info.memory; return { calls: s.calls, tris: s.triangulos, geo: m.geometries, tex: m.textures, prog: G.renderer.renderer.info.programs.length }; } catch (e) { return { err: String(e && e.message || e) }; } };
  const heap = () => (performance.memory && performance.memory.usedJSHeapSize) ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
  const asentar = async (topeMs) => { const t0 = performance.now(); topeMs = topeMs || 30000;
    while (performance.now() - t0 < topeMs) { try { const s = G.renderer.stats(); if (s.calls > 10) { await new Promise(r => requestAnimationFrame(r)); if (G.renderer.stats().calls > 10) return true; } } catch (e) {} await sleep(250); }
    return false; };
  const medir = async secs => { const marcas = [], cuadros = []; let ant = performance.now(); const t0 = performance.now();
    while (performance.now() - t0 < secs * 1000) { await new Promise(r => requestAnimationFrame(r)); const a = performance.now(); cuadros.push(a - ant); ant = a; marcas.push(stats()); }
    cuadros.shift(); const ord = cuadros.slice().sort((x, y) => x - y);
    const med = ord.length ? ord[Math.floor(ord.length / 2)] : 0;
    const prom = m => Math.round(m.reduce((s, x) => s + x, 0) / (m.length || 1));
    return { fpsMed: Math.round(1000 / (med || 1) * 10) / 10, peorMs: Math.round(Math.max(0, ...cuadros)), n: cuadros.length,
      callsMed: prom(marcas.map(m => m.calls || 0)), trisMed: prom(marcas.map(m => m.tris || 0)) }; };
  const out = { v18: G.V18, calidad: (G.renderer && G.renderer.calidad) || '?' };
  try {
    if (!AV.${p.fn}) { out.sinTest = true; return JSON.stringify(out); }
    try { await G.streaming.terminar(); } catch (e) {}
    await asentar(); await sleep(800);
    out.base = await medir(3); out.base.heap = heap();
    const t0 = performance.now();
    const t = await AV.${p.fn}();
    out.duracionMs = Math.round(performance.now() - t0);
    out.test = { passed: t.passed, total: t.total, fallos: (t.results || []).filter(r => !r.ok).map(r => r.name + ' :: ' + String(r.extra).slice(0, 300)) };
    out.contexto = stats(); out.contexto.heap = heap(); out.contexto.tactil = matchMedia('(pointer: coarse)').matches;
  } catch (e) { out.error = String(e && e.stack || e); }
  return JSON.stringify(out); })()`;
}

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k106-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--window-size=390,844', 'about:blank'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  chrome.verStderr = () => err;
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 150; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools en 30 s: ' + err.slice(0, 300));
}
function mataPorPerfil() {
  try {
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi1k106-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

async function cargarPagina(cdp, ses, origen, id) {
  await cdp.call('Page.enable', {}, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real${BANDERA ? '&v18=1' : '&v18=0'}` }, ses);
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
  const lista = SOLO ? PRUEBAS.filter(p => SOLO.split(',').includes(p.id)) : PRUEBAS;
  const res = { etiqueta: ETIQUETA, bandera: BANDERA ? 'v18=1' : 'sin bandera', pantalla: ESCRITORIO ? `escritorio ${ANCHO}x${ALTO}@${DPR} cpuX${CPUX}` : `movil ${ANCHO}x${ALTO}@${DPR} cpuX${CPUX} (iPhone emulado)`, head: null, pruebas: {} };
  const outJson = path.join(SALIDA, `k106_${ETIQUETA}${BANDERA ? '' : '_sinbandera'}.json`);
  let navegador = await lanzarChrome();
  let ws = new WebSocket(`ws://127.0.0.1:${navegador.puerto}${navegador.wsPath}`);
  let cdp = new CDP(ws); await cdp.listo();
  let ses = null;
  const errores = [];
  // El listener va sobre el ws vigente: tras un reinicio hay que reengancharlo (reiniciarChrome lo hace).
  function engancharErrores() {
    cdp.ws.addEventListener('message', m => {
      try { const d = JSON.parse(m.data);
        if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errores.push('console.error: ' + (d.params.args || []).map(a => a.value || a.description || '').join(' ').slice(0, 300));
        if (d.method === 'Log.entryAdded' && d.params.entry && d.params.entry.level === 'error') errores.push('log: ' + String(d.params.entry.text).slice(0, 300));
      } catch (e) { }
    });
  }
  async function prepararSesion() {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: !ESCRITORIO }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPUX }, ses);
    if (!ESCRITORIO) await cdp.call('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }, ses);
    if (TACTIL) { await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses); await cdp.call('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' }, ses); }
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS }, ses);
  }
  // QA-111 residual (KIMI-199): mata el proceso real del navegador (Chrome 156 va detached del spawn y
  // chrome.kill() no basta: dejaría chrome.exe huérfanos robando GPU) y rearranca con sesión y emulación nuevas.
  async function reiniciarChrome(motivo) {
    console.log('  · rearranque del navegador (' + (motivo || 'caído') + ')…');
    try { console.log('  · stderr del navegador (' + (motivo || 'caído') + '): ' + String(navegador.chrome.verStderr && navegador.chrome.verStderr()).replace(/\s+/g, ' ').slice(-220)); } catch (e) {}
    try {
      const info = await cdp.call('SystemInfo.getProcessInfo', {}, undefined, 5000);
      const br = (info.processInfo || []).find(p => p.type === 'browser');
      if (br && br.id) spawn('taskkill', ['/F', '/T', '/PID', String(br.id)], { stdio: 'ignore' });
      else try { navegador.chrome.kill(); } catch (e) {}
    } catch (e) { try { navegador.chrome.kill(); } catch (e2) {} }
    const viejo = navegador.perf;
    navegador = await lanzarChrome();
    try { ws.close(); } catch (e) {}
    ws = new WebSocket(`ws://127.0.0.1:${navegador.puerto}${navegador.wsPath}`);
    cdp = new CDP(ws); await cdp.listo();
    engancharErrores();
    await prepararSesion();
    try { fs.rmSync(viejo, { recursive: true, force: true }); } catch (e) { /* perfil en uso; lo recoge mataPorPerfil/limpieza */ }
  }
  try {
    engancharErrores();
    await prepararSesion();
    let desdeArranque = 0;
    for (const p of lista) {
      // QA-111 residual (KIMI-199): rearranque preventivo cada N pruebas (con --reinicia-cada N).
      if (REINICIA_CADA > 0 && desdeArranque >= REINICIA_CADA) {
        await reiniciarChrome('rearranque preventivo --reinicia-cada ' + REINICIA_CADA);
        desdeArranque = 0;
      }
      const r = { esperadoMin: p.min, erroresConsola: [] };
      try {
        await cargarPagina(cdp, ses, origen, p.id);
        if (!res.head) res.head = await evaluar(cdp, ses, `(() => { try { return (AV.G.build && (AV.G.build.commit || AV.G.build.id)) || 'desconocido'; } catch (e) { return 'desconocido'; } })()`, 10);
        errores.length = 0;
        r.datos = JSON.parse(await evaluar(cdp, ses, jsPrueba(p), p.tope));
        r.erroresConsola = errores.slice(0, 12);
      } catch (e) { r.error = String(e && e.message || e); }
      desdeArranque++;
      res.pruebas[p.id] = r;
      fs.writeFileSync(outJson, JSON.stringify(res, null, 1)); // incremental: sobrevive a cortes
      const d = r.datos || {};
      console.log(`[${p.id}] ${d.sinTest ? 'SIN TEST (inerte sin bandera)' : (d.test ? (d.test.passed + '/' + d.test.total + (d.test.passed >= p.min ? ' OK' : ' *** ROJO') + (d.test.fallos.length ? ' fallos:' + JSON.stringify(d.test.fallos).slice(0, 200) : '')) : ('ERROR ' + (r.error || d.error || '')))} base=${d.base ? d.base.fpsMed + 'fps' : '-'} err=${r.erroresConsola.length}`);
    }
  } catch (e) { res.error = String(e && e.message || e); }
  fs.writeFileSync(outJson, JSON.stringify(res, null, 1));
  try { navegador.chrome.kill('SIGKILL'); } catch (e) { }
  mataPorPerfil();
  try { fs.rmSync(navegador.perf, { recursive: true, force: true }); } catch (e) { }
  srv.close();
  const mal = res.error || Object.entries(res.pruebas).some(([id, p]) => p.error || (p.datos && p.datos.error) || (p.datos && p.datos.test && p.datos.test.passed < (p.esperadoMin || 1)) || (p.erroresConsola && p.erroresConsola.length));
  process.exit(mal ? 1 : 0);
})();
