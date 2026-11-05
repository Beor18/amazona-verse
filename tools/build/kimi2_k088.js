#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-088: validación funcional INTEGRAL del circuito de
   la demo V18.1 con GPU real, para la demo de esta noche (encargo 📣 5-nov «hoy solo la DEMO V18.1»).
   Tras ae551d24 (Sombra: QA-166..169), el fix de visibilidad QA-170 (eab1f18a) y todo lo aterrizado
   hoy sin validación integrada, corre con GPU real y perfil móvil (390×844 dpr 3, CPU ×4, «bajo»
   natural por UA):
     parte "ciclo":   AV.v18FxTest + AV.v18CicloTest (descubrir arausiaca → reto → elegir → duelo
                      Campeona → 2 maderas+1 piedra → reparar puente → pista reto extra → recarga
                      persistente → revancha y reto de las dos cotorras) + base FPS en la villa.
     parte "amenaza": AV.v18AmenazaTest (la Sombra, de punta a punta) + escena viva: puente reparado,
                      Sombra visible junto al puente, medición FPS/calls/tris/heap y captura.
     parte "misterio":AV.v18MisterioTest (la Maraña vigía el puente roto) + escena viva con los ojos
                      abiertos y captura.
   Cada parte carga la página de nuevo con la semilla limpia (localStorage.clear + partida v6 + el
   progreso v18 fiel a una partida real: vittata seleccionada, porque progreso.js leer() marca la
   especie del perfil como seleccionable; sin eso seleccionables() queda vacío y el ciclo falla por
   artefacto de la semilla), entra sin creador, salta la intro y vacía los errores de consola entre
   parte y parte.
   La herramienta NO toca el juego: solo dispara la API pública AV.v18*Test y mueve a Vittata.
   Uso: node tools/build/kimi2_k088.js --etiqueta r2 [--parte ciclo|amenaza|misterio] [--medir 8]
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
const ETIQUETA = arg('--etiqueta', 'r2');
const PARTE = arg('--parte', 'todas');
const CALIDAD = arg('--calidad', ''); // 'medio'|'alto' fuerza la calidad; '' = natural por UA (bajo en el iPhone)
const MEDIR = parseInt(arg('--medir', '8'), 10);
const ANCHO = 390, ALTO = 844, DPR = 3, CPUX = 4;
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi088'));
fs.mkdirSync(SALIDA, { recursive: true });

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi2k88-/.test(d)) continue;
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
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi2k88-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null, species: 'vittata' },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
  // fiel a una partida real: progreso v18 con la especie del perfil seleccionada (lo que progreso.js
  // leer() haría al arrancar con un perfil de verdad: profile.species → seleccionable + sel).
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

/* utilidades comunes in-page: medir una ventana por rAF, asentar el streaming, stats, heap */
const UTIL = `const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
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
    return { fpsMed: Math.round(1000 / (med || 1) * 10) / 10, fpsP10: Math.round(1000 / (p10 || 1) * 10) / 10, peorMs: Math.round(Math.max(0, ...cuadros)), n: cuadros.length,
      callsMed: prom(marcas.map(m => m.calls || 0)), trisMed: prom(marcas.map(m => m.tris || 0)), callsMax: Math.max(0, ...marcas.map(m => m.calls || 0)), trisMax: Math.max(0, ...marcas.map(m => m.tris || 0)), ult: marcas[marcas.length - 1] || {} }; };
  const tp = (x, z) => { S.pos.x = x; S.pos.z = z; try { S.pos.y = G.terreno.height(x, z) + 0.1; } catch (e) {} };
  const limpiarUi = () => { const j = Array.from(document.querySelectorAll('button')).find(x => /a jugar/i.test(x.textContent || '')); if (j) j.click();
    const f = document.getElementById('c1-fade'); if (f) f.remove(); if (G.ui && G.ui.hideToast) G.ui.hideToast(); };`;

/* ---------- parte CICLO: v18FxTest + v18CicloTest + base en la villa ---------- */
const CICLO_JS = `(async () => { ${UTIL}
  const out = { v18: G.V18, calidad: (G.renderer && G.renderer.calidad) || '?' };
  try { ${''}
    try { await G.streaming.terminar(); } catch (e) {}
    limpiarUi(); await asentar(); await sleep(1200);
    out.base = await medir(5); out.base.heap = heap();
    const fx = await AV.v18FxTest();
    out.fx = { passed: fx.passed, total: fx.total, fallos: fx.results.filter(r => !r.ok).map(r => r.name + ' :: ' + r.extra) };
    const t = await AV.v18CicloTest();
    out.ciclo = { passed: t.passed, total: t.total, fallos: t.results.filter(r => !r.ok).map(r => r.name + ' :: ' + String(r.extra).slice(0, 300)) };
    out.sombraDispersa = G.v18.mundo('sombra_tormenta');
    out.puente = G.v18.mundo('puente_villa');
    // captura del mundo demo: la cabecera del puente (estado restaurado por la prueba: roto)
    try { const p = G.v18Reparar && G.v18Reparar.P; const cab = p && (p.cabecera || p.eje && { x: p.eje.ax, z: p.eje.az });
      if (cab) { tp(cab.x + 8, cab.z + 8); try { await G.streaming.terminar(); } catch (e) {} limpiarUi(); await asentar(); await sleep(1200); } } catch (e) {}
    out.mundo = stats(); out.mundo.heap = heap();
  } catch (e) { out.error = String(e && e.stack || e); }
  return JSON.stringify(out); })()`;

/* ---------- parte AMENAZA: v18AmenazaTest + Sombra viva junto al puente reparado ---------- */
const AMENAZA_JS = `(async () => { ${UTIL}
  const out = { v18: G.V18, calidad: (G.renderer && G.renderer.calidad) || '?' };
  try {
    const t = await AV.v18AmenazaTest();
    out.amenaza = { passed: t.passed, total: t.total, fallos: t.results.filter(r => !r.ok).map(r => r.name + ' :: ' + String(r.extra).slice(0, 300)) };
    // escena viva: progreso limpio (vittata seleccionada), puente reparado → la Sombra aparece junto al puente
    try { G.v18.borrar(); localStorage.setItem('amazonaverse.v18', JSON.stringify({ v: 1, sel: 'vittata', especies: { vittata: 'seleccionada' }, inv: {}, otorgados: {}, mundo: { puente_villa: 'reparado' } })); G.v18.recargar(); } catch (e) {}
    const c = G.v18amenaza.centro;
    out.centro = { x: +c.x.toFixed(1), z: +c.z.toFixed(1) };
    tp(c.x + 11, c.z + 5);
    try { await G.streaming.terminar(); } catch (e) {}
    limpiarUi(); await asentar();
    // esperar a que la pelea arranque sola (R_EMPIEZA=16 m) o forzarla
    let f0 = null; const tEspera = performance.now();
    while (performance.now() - tEspera < 12000) { f0 = G.v18amenaza.estado().fase; if (f0 === 'lucha') break; await sleep(300); }
    if (f0 !== 'lucha') { try { G.v18amenaza.iniciar({ forzar: true, sinEspera: true }); } catch (e) {} await sleep(800); f0 = G.v18amenaza.estado().fase; }
    out.fase = f0;
    await sleep(2500); // deriva, ojos y aviso
    out.sombra = await medir(${MEDIR}); out.sombra.heap = heap();
    out.estadoSombra = { fase: G.v18amenaza.estado().fase, aciertos: G.v18amenaza.estado().aciertos, plumas: G.v18amenaza.estado().j && G.v18amenaza.estado().j.plumas, visible: !!(G.renderer.scene.getObjectByName('v18_sombra') && G.renderer.scene.getObjectByName('v18_sombra').visible) };
  } catch (e) { out.error = String(e && e.stack || e); }
  return JSON.stringify(out); })()`;

/* ---------- parte MISTERIO: v18MisterioTest + la Maraña vigía el puente roto ---------- */
const MISTERIO_JS = `(async () => { ${UTIL}
  const out = { v18: G.V18, calidad: (G.renderer && G.renderer.calidad) || '?' };
  try {
    const t = await AV.v18MisterioTest();
    out.misterio = { passed: t.passed, total: t.total, fallos: t.results.filter(r => !r.ok).map(r => r.name + ' :: ' + String(r.extra).slice(0, 300)) };
    // escena viva: progreso limpio (puente roto) → la Maraña vuelve a vigilar la cabecera
    try { G.v18.borrar(); localStorage.setItem('amazonaverse.v18', JSON.stringify({ v: 1, sel: 'vittata', especies: { vittata: 'seleccionada' }, inv: {}, otorgados: {}, mundo: {} })); G.v18.recargar(); G.v18Misterio.sincronizar(); } catch (e) {}
    const r = G.v18Misterio.rastro();
    out.rastro = r ? { x: +(+r.x).toFixed(1), z: +(+r.z).toFixed(1) } : null;
    if (r && isFinite(+r.x) && isFinite(+r.z)) { const dx = S.pos.x - r.x, dz = S.pos.z - r.z, d = Math.hypot(dx, dz) || 1;
      tp(r.x + dx / d * 13, r.z + dz / d * 13); }
    try { await G.streaming.terminar(); } catch (e) {}
    limpiarUi(); await asentar(); await sleep(2200); // ojos se abren ~1 s a <26 m
    out.marana = await medir(5); out.marana.heap = heap();
    try { const m = G.renderer.scene.getObjectByName('marana_ojos'); out.ojos = m ? m.visible : null; } catch (e) {}
  } catch (e) { out.error = String(e && e.stack || e); }
  return JSON.stringify(out); })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2k88-'));
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi2k88-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}
function chromeAjenos() {
  try {
    const out = execSync('powershell -NoProfile -Command "(Get-Process chrome -ErrorAction SilentlyContinue | Measure-Object).Count"', { timeout: 15000, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return parseInt(out, 10) || 0;
  } catch (e) { return -1; }
}

async function cargarParte(cdp, ses, origen, parte) {
  await cdp.call('Page.enable', {}, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&v18=1${CALIDAD ? '&calidad=' + encodeURIComponent(CALIDAD) : ''}` }, ses);
  const t0 = Date.now(); let listo = false;
  while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
    try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
    await cdp.bombear(0.5);
  }
  if (!listo) throw new Error('el juego no arrancó (' + parte + ')');
  const ent = await evaluar(cdp, ses, ENTRAR_JS, 120);
  if (!/^ok/.test(ent)) throw new Error('entrada (' + parte + '): ' + ent);
  await evaluar(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms));
    const jugar = Array.from(document.querySelectorAll('button')).find(x => /a jugar/i.test(x.textContent || '')); if (jugar) jugar.click();
    await sleep(400);
    const f = document.getElementById('c1-fade'); if (f) f.remove();
    try { if (AV.G.ui && AV.G.ui.hideToast) AV.G.ui.hideToast(); } catch (e) {}
    return 'limpio'; })()`, 30);
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const res = { etiqueta: ETIQUETA, pantalla: `movil ${ANCHO}x${ALTO}@${DPR} cpuX${CPUX} (iPhone emulado)`, parte: PARTE, chromeAjenosAlInicio: chromeAjenos(), head: null, partes: {} };
  const partes = PARTE === 'todas' ? ['ciclo', 'amenaza', 'misterio'] : [PARTE];
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPUX }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS }, ses);
    // capturar errores de consola de la página durante todo el trayecto
    const errores = [];
    cdp.ws.addEventListener('message', m => {
      try { const d = JSON.parse(m.data);
        if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errores.push('console.error: ' + (d.params.args || []).map(a => a.value || a.description || '').join(' ').slice(0, 300));
        if (d.method === 'Log.entryAdded' && d.params.entry && d.params.entry.level === 'error') errores.push('log: ' + String(d.params.entry.text).slice(0, 300));
      } catch (e) { }
    });
    for (const parte of partes) {
      const r = { erroresConsola: [] };
      try {
        await cargarParte(cdp, ses, origen, parte);
        if (!res.head) res.head = await evaluar(cdp, ses, `(() => { try { return (AV.G.build && (AV.G.build.commit || AV.G.build.id)) || 'desconocido'; } catch (e) { return 'desconocido'; } })()`, 10);
        errores.length = 0;
        const js = parte === 'ciclo' ? CICLO_JS : parte === 'amenaza' ? AMENAZA_JS : MISTERIO_JS;
        const tope = parte === 'ciclo' ? 420 : parte === 'amenaza' ? 240 : 180;
        r.datos = JSON.parse(await evaluar(cdp, ses, js, tope));
        await new Promise(rs => setTimeout(rs, 400));
        const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 60000);
        fs.writeFileSync(path.join(SALIDA, `k088_${ETIQUETA}_${parte}.jpg`), Buffer.from(shot.data, 'base64'));
        r.erroresConsola = errores.slice(0, 12);
      } catch (e) { r.error = String(e && e.message || e); }
      res.partes[parte] = r;
    }
  } catch (e) { res.error = String(e && e.message || e); }
  fs.writeFileSync(path.join(SALIDA, `k088_${ETIQUETA}.json`), JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res, null, 1));
  try { chrome.kill('SIGKILL'); } catch (e) { }
  mataPorPerfil();
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close();
  const mal = res.error || Object.values(res.partes).some(p => p.error || (p.datos && p.datos.error));
  process.exit(mal ? 1 : 0);
})();
