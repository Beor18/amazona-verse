#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — QA-158: resistencia de vuelo largo en perfil iPhone.
   Chrome headless propio + CDP (sin librerías), iPhone 390×844 dpr 3 táctil con UA de iPhone (arranca en «bajo»
   de verdad, con los topes de textura del perfil), CPU ×4, GPU real.
   Escenario de Kelvin: tras un rato largo volando Safari recarga la pestaña (memoria acumulada en vuelo).
   Recorrido: 30 s quieto (control) + N vueltas al circuito villa → puerta ciudad → centro ciudad → bahía norte →
   villa norte → spawn, volando a ~28 m/s a ~26 m del suelo, con muestreo cada ~5 s (heap JS, info.memory,
   stats del renderer y del streaming, posición); gc entre vueltas (retenido) y atribución final por prefijo.
   Salida: docs/img/kimi158/qa158-<etiqueta>.json
   Uso: node tools/build/kimi2_qa158.js [--etiqueta r1] [--vueltas 2] [--quieto 30] [--gpu 1] */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ETIQUETA = (() => { const i = process.argv.indexOf('--etiqueta'); return i > 0 ? process.argv[i + 1] : 'r1'; })();
const CPU = parseFloat((() => { const i = process.argv.indexOf('--cpu'); return i > 0 ? process.argv[i + 1] : '4'; })(), 10);
const VUELTAS = parseInt((() => { const i = process.argv.indexOf('--vueltas'); return i > 0 ? process.argv[i + 1] : '2'; })(), 10);
const QUIETO_S = parseInt((() => { const i = process.argv.indexOf('--quieto'); return i > 0 ? process.argv[i + 1] : '30'; })(), 10);
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi158');
fs.mkdirSync(SALIDA, { recursive: true });
// Circuito cap1 (anclas usadas por las herramientas kimi1/kimi2/kimi3, zonas conocidas)
const CIRCUITO = [
  { x: 12, z: -114.8, nombre: 'ciudad_puerta' },
  { x: -33, z: -136, nombre: 'ciudad_centro' },
  { x: 150, z: 218, nombre: 'bahia_norte' },
  { x: 134, z: 182, nombre: 'villa_norte' },
  { x: -8, z: -2.5, nombre: 'villa_spawn' },
];
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); return res.end('404'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(d);
    });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error de conexión'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message + ' ' + JSON.stringify(d.error.data || ''))) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(method, params, sessionId, timeoutMs) {
    const id = ++this.id;
    return new Promise((re, re2) => {
      this.pend.set(id, { re, re2 });
      this.ws.send(JSON.stringify({ id, method, params: params || {}, sessionId }));
      if (timeoutMs) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + method)); } }, timeoutMs);
    });
  }
}
async function evaluar(cdp, ses, exp, timeoutS, promesa) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: promesa !== false, returnByValue: true }, ses, (timeoutS || 30) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.exception && r.exceptionDetails.exception.value || r.exceptionDetails.text).slice(0, 500));
  return r.result ? r.result.value : undefined;
}

// QA-111/QM-158 · partida sembrada de cap1 con step 1: Jugar entra directo y la intro no se dispara
// (introPendiente exige step === 0), para ir directo al vuelo de Kelvin. Contadores de errores y de
// webglcontextlost (captura) propios de esta corrida.
const SEMILLA_SAVE_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi2-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 1,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: true, B: true }, examined: { maquina: true, transmisor: true }
  }));
} catch (e) {}`;
const GANCHOS_JS = `try {
  window.__qa158 = { errores: [], ctxPerdidas: 0, ctxRestauradas: 0 };
  window.addEventListener('error', e => { __qa158.errores.push(String(e.message).slice(0, 200)); }, true);
  window.addEventListener('unhandledrejection', e => { __qa158.errores.push('rechazo: ' + String(e.reason && e.reason.message || e.reason).slice(0, 200)); }, true);
  window.addEventListener('webglcontextlost', () => { __qa158.ctxPerdidas++; }, true);
  window.addEventListener('webglcontextrestored', () => { __qa158.ctxRestauradas++; }, true);
} catch (e) {}`;

// Fase quieto: de pie en el spawn muestreando (control sin movimiento)
const QUIETO_JS = `(async (secs) => {
  const AV = window.AV, G = AV.G, S = G.S;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const R = G.renderer, ST = (G.mundo && G.mundo.streaming) || (G.streaming && G.streaming.gestor);
  const muestras = [];
  const t0 = performance.now();
  const gpuMem = () => { try { const inf = (R.renderer || R).info; return { geo: inf.memory.geometries, tex: inf.memory.textures }; } catch (e) { return {}; } };
  const stStats = () => { try { const s = R.stats() || {}; return { calls: s.calls, ktris: s.triangulos != null ? Math.round(s.triangulos / 1000) : null, calidad: s.calidad, fps: s.fps }; } catch (e) { return {}; } };
  const stSt = () => { try { const k = (ST && ST.stats) ? ST.stats() : {}; return { kbGeo: k.kbGeometria, cerca: k.modelosCerca, hd: k.modelosHD, lejos: k.modelosLejos, zonas: k.zonasCerca }; } catch (e) { return {}; } };
  while (performance.now() - t0 < secs * 1000) {
    await sleep(5000);
    muestras.push({ t: Math.round((performance.now() - t0) / 100) / 10, pos: [Math.round(S.pos.x), Math.round(S.pos.y), Math.round(S.pos.z)],
      heap: Math.round(performance.memory.usedJSHeapSize / 1048576), total: Math.round(performance.memory.totalJSHeapSize / 1048576),
      ...gpuMem(), ...stStats(), ...stSt() });
  }
  const sArranque = stStats();
  return JSON.stringify({ muestras, calidad: sArranque.calidad, dpr: sArranque.dpr }); })(${QUIETO_S})`;

// Vuelo continuo hacia un waypoint: avanza ~11 m cada 400 ms (~28 m/s) a ~26 m del terreno, muestreando cada ~5 s;
// al llegar, hovers 12 s en círculo de 12 m (cruces de frontera zona/LOD) y sigue muestreando.
const VUELO_JS = `(async (tx, tz, nombre) => {
  const AV = window.AV, G = AV.G, S = G.S;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const R = G.renderer, ST = (G.mundo && G.mundo.streaming) || (G.streaming && G.streaming.gestor);
  const muestras = [];
  const t0 = performance.now();
  const gpuMem = () => { try { const inf = (R.renderer || R).info; return { geo: inf.memory.geometries, tex: inf.memory.textures }; } catch (e) { return {}; } };
  const stStats = () => { try { const s = R.stats() || {}; return { calls: s.calls, ktris: s.triangulos != null ? Math.round(s.triangulos / 1000) : null, calidad: s.calidad, fps: s.fps }; } catch (e) { return {}; } };
  const stSt = () => { try { const k = (ST && ST.stats) ? ST.stats() : {}; return { kbGeo: k.kbGeometria, cerca: k.modelosCerca, hd: k.modelosHD, lejos: k.modelosLejos, zonas: k.zonasCerca }; } catch (e) { return {}; } };
  const muestra = () => ({ t: Math.round((performance.now() - t0) / 100) / 10, pos: [Math.round(S.pos.x), Math.round(S.pos.y), Math.round(S.pos.z)],
    heap: Math.round(performance.memory.usedJSHeapSize / 1048576), total: Math.round(performance.memory.totalJSHeapSize / 1048576),
    ...gpuMem(), ...stStats(), ...stSt() });
  const altura = () => { try { return (AV.debug.height(S.pos.x, S.pos.z) || 0) + 26; } catch (e) { return S.pos.y; } };
  G.fisica.MOVE.flying = true; S.vy = 0;
  let ultima = 0;
  while (true) {
    const dx = tx - S.pos.x, dz = tz - S.pos.z, d = Math.hypot(dx, dz);
    if (d < 18) break;
    const paso = Math.min(d, 11);
    S.pos.x += dx / d * paso; S.pos.z += dz / d * paso;
    S.pos.y += (altura() - S.pos.y) * 0.35;
    await sleep(400);
    if (performance.now() - ultima > 5000) { ultima = performance.now(); muestras.push(muestra()); }
  }
  // hover: círculo de 12 m durante 12 s
  const cx = S.pos.x, cz = S.pos.z, ang0 = Math.atan2(S.pos.z - cz, S.pos.x - cx);
  for (let i = 1; i <= 3; i++) {
    const a = ang0 + i * (Math.PI / 3);
    S.pos.x = cx + 12 * Math.cos(a); S.pos.z = cz + 12 * Math.sin(a);
    S.pos.y += (altura() - S.pos.y) * 0.5;
    await sleep(4000);
    muestras.push(muestra());
  }
  return JSON.stringify({ muestras, llegada: nombre, pos: [Math.round(S.pos.x), Math.round(S.pos.y), Math.round(S.pos.z)] }); })`;

// Muestra de una vuelta TRAS gc: heap retenido + atribución por prefijo (nº de GEOMETRÍAS distintas por familia,
// no solo MB) — es la que crece en vuelo según la curva de Kimi 3 (geo 98→342); contar objetos separa
// «familia que acumula» de «familia grande pero estable».
const MUESTRA_JS = `(async () => {
  const AV = window.AV, G = AV.G, S = G.S, R = G.renderer;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  await sleep(1500);
  const st = (() => { try { const s = R.stats() || {}; return { calls: s.calls, ktris: s.triangulos != null ? Math.round(s.triangulos / 1000) : null, calidad: s.calidad }; } catch (e) { return {}; } })();
  const inf = (() => { try { const i = (R.renderer || R).info; return { geo: i.memory.geometries, tex: i.memory.textures, prog: i.programs ? i.programs.length : null }; } catch (e) { return {}; } })();
  const grupos = {}; const vistos = new Set();
  (R.scene || G.scene).traverse(o => { if (!(o.isMesh && o.geometry)) return;
    const p = (o.name || '(sin nombre)').split(':').slice(0, 2).join(':');
    const g = grupos[p] || (grupos[p] = { n: 0, geos: 0, mb: 0 });
    g.n++;
    if (!vistos.has(o.geometry.uuid)) { vistos.add(o.geometry.uuid); g.geos++;
      let b = 0; const at = o.geometry.attributes; for (const k in at) if (at[k].array) b += at[k].array.byteLength;
      if (o.geometry.index) b += o.geometry.index.array.byteLength; g.mb += b; } });
  const escena = Object.entries(grupos).map(([p, g]) => ({ p, n: g.n, geos: g.geos, mb: Math.round(g.mb / 1048576) }))
    .sort((a, b) => b.geos - a.geos).slice(0, 30);
  return JSON.stringify({ pos: [Math.round(S.pos.x), Math.round(S.pos.y), Math.round(S.pos.z)],
    heap: Math.round(performance.memory.usedJSHeapSize / 1048576), total: Math.round(performance.memory.totalJSHeapSize / 1048576), ...inf, ...st, escena,
    ctx: window.__qa158 ? { perdidas: __qa158.ctxPerdidas, restauradas: __qa158.ctxRestauradas, errores: __qa158.errores.length } : null }); })()`;

const FINAL_JS = `(async () => {
  const AV = window.AV, G = AV.G, S = G.S, R = G.renderer;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  await sleep(1000);
  const bGeo = g => { let b = 0; if (!g) return 0; const at = g.attributes; for (const k in at) if (at[k].array) b += at[k].array.byteLength; if (g.index) b += g.index.array.byteLength; return b; };
  const grupos = {};
  (R.scene || G.scene).traverse(o => { if (!(o.isMesh && o.geometry)) return;
    const b = bGeo(o.geometry), p = (o.name || '(sin nombre)').split(':').slice(0, 2).join(':');
    const g = grupos[p] || (grupos[p] = { n: 0, mb: 0, vis: 0 }); g.n++; g.mb += b; if (o.visible) g.vis++; });
  const escena = Object.entries(grupos).map(([p, g]) => ({ p, n: g.n, mb: Math.round(g.mb / 1048576), vis: g.vis })).sort((a, b) => b.mb - a.mb).slice(0, 25);
  const ST = (G.mundo && G.mundo.streaming) || (G.streaming && G.streaming.gestor);
  const rec = { porTipo: {}, listosRefs: [] };
  try { for (const n in ST.recursos) for (const t in ST.recursos[n]) {
    const r = ST.recursos[n][t]; if (r.estado === 'nada') continue;
    const k = t + ':' + r.estado, g2 = rec.porTipo[k] || (rec.porTipo[k] = { n: 0 }); g2.n++;
    if (r.estado === 'listo' && r.refs > 0) { let mb = 0; if (r.partes) for (const p of r.partes) mb += bGeo(p.geo); if (r.geo) mb += bGeo(r.geo); rec.listosRefs.push({ n, t, refs: r.refs, mb: Math.round(mb / 1048576) }); } } } catch (e) {}
  rec.listosRefs.sort((a, b) => b.mb - a.mb);
  const stStats = (() => { try { const s = R.stats() || {}; return { calls: s.calls, ktris: s.triangulos != null ? Math.round(s.triangulos / 1000) : null, calidad: s.calidad }; } catch (e) { return {}; } })();
  const stSt = (() => { try { const k = ST.stats ? ST.stats() : {}; return { kbGeo: k.kbGeometria, cerca: k.modelosCerca, hd: k.modelosHD, lejos: k.modelosLejos, zonas: k.zonasCerca }; } catch (e) { return {}; } })();
  const zonas = (() => { try { const z = (ST.zonasCerca || ST.zonas || {}); return Object.keys(z).filter(k => z[k]).length; } catch (e) { return null; } })();
  return JSON.stringify({ pos: [Math.round(S.pos.x), Math.round(S.pos.y), Math.round(S.pos.z)],
    heap: Math.round(performance.memory.usedJSHeapSize / 1048576), total: Math.round(performance.memory.totalJSHeapSize / 1048576),
    inf: (() => { try { const i = (R.renderer || R).info; return { geo: i.memory.geometries, tex: i.memory.textures }; } catch (e) { return {}; } })(),
    ...stStats, st: stSt, zonasCercaN: zonas, escena, rec: { porTipo: rec.porTipo, listosRefs: rec.listosRefs.slice(0, 30) },
    ctx: window.__qa158 ? { perdidas: __qa158.ctxPerdidas, restauradas: __qa158.ctxRestauradas, errores: __qa158.errores.slice(0, 10) } : null }); })()`;

async function lanzarChrome() {
  let ultimo = '';
  for (let intento = 0; intento < 3; intento++) {
    try { return await lanzarChromeUnaVez(); } catch (e) { ultimo = e.message; await new Promise(r => setTimeout(r, 2500)); }
  }
  throw new Error(ultimo);
}
async function lanzarChromeUnaVez() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2q158-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--window-size=500,900', 'about:blank'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('sin DevToolsActivePort: ' + err.slice(-300));
}

(async () => {
  const res = { etiqueta: ETIQUETA, cpu: CPU, vueltas: VUELTAS, circuito: CIRCUITO, curva: [], fases: {} };
  const { srv, puerto } = await servir();
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const mataArbol = () => { try { execSync('taskkill /PID ' + chrome.pid + ' /T /F', { stdio: 'ignore' }); } catch (e) { try { chrome.kill(); } catch (e2) {} } };
  process.on('SIGINT', () => { mataArbol(); process.exit(130); });
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  await new Promise(r => { ws.onopen = r; });
  const cdp = new CDP(ws);
  try {
  const { targetId } = await cdp.call('Target.createTarget', { url: 'about:blank' });
  const { sessionId: ses } = await cdp.call('Target.attachToTarget', { targetId, flatten: true });
  await cdp.call('Runtime.enable', {}, ses);
  await cdp.call('Page.enable', {}, ses);
  try { await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses); } catch (e) {}
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }, ses);
  await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
  await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
  const origen = `http://127.0.0.1:${puerto}`;
  // la semilla y los ganchos van ANTES de navegar: el juego lee el guardado en el arranque
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS + '\n' + GANCHOS_JS }, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html` }, ses);
  // portada → tarjeta Aventura (la partida sembrada entra sin creador)
  let clicado = false;
  for (let i = 0; i < 150 && !clicado; i++) {
    await new Promise(r => setTimeout(r, 500));
    try { clicado = !!(await evaluar(cdp, ses, `(() => { const b = document.querySelector('[data-modo="aventura"]'); if (!b) return false; b.click(); return true; })()`, 5, false)); } catch (e) { /* aún no */ }
  }
  if (!clicado) throw new Error('no apareció la tarjeta Aventura');
  // mundo jugable
  let jugable = false;
  for (let i = 0; i < 240 && !jugable; i++) {
    await new Promise(r => setTimeout(r, 500));
    try { jugable = !!(await evaluar(cdp, ses, `(() => { const G = window.AV && AV.G; if (!G || !G.ui || G.ui.worldHidden()) return false; const st = (() => { try { return G.renderer.stats(); } catch (e) { return null; } })(); return st && st.calls > 5; })()`, 5, false)); } catch (e) { /* aún no */ }
  }
  if (!jugable) throw new Error('el mundo no llegó a jugable');
  // salto de intro si aparece (con step 1 no debería)
  try { console.log('· intro: ' + await evaluar(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)); for (let i = 0; i < 50; i++) { const b = document.getElementById('c1-saltar'); if (b && b.isConnected) { b.click(); return 'saltada'; } await sleep(100); } return 'sin botón'; })()`, 10, true)); } catch (e) {}
  const calArranque = await evaluar(cdp, ses, `(() => { const R = AV.G.renderer; const s = R.stats(); return JSON.stringify({ calidad: s.calidad, dpr: s.dpr, calls: s.calls, fps: s.fps }); })()`, 10, false);
  res.arranque = JSON.parse(calArranque || '{}');
  console.log('· entrada ok — arranque: ' + calArranque);

  // fase control quieto
  const q = JSON.parse(await evaluar(cdp, ses, QUIETO_JS, QUIETO_S + 30));
  res.fases.quieto = q;
  res.curva.push(...q.muestras.map(m => Object.assign({ fase: 'quieto' }, m)));
  console.log(`· quieto ${QUIETO_S}s: calidad=${q.calidad} dpr=${q.dpr} — última: ${JSON.stringify(q.muestras[q.muestras.length - 1])}`);

  const gc = async () => { try { await cdp.call('HeapProfiler.collectGarbage', {}, ses, 30000); } catch (e) {} };
  for (let v = 1; v <= VUELTAS; v++) {
    for (const wp of CIRCUITO) {
      const r = JSON.parse(await evaluar(cdp, ses, `${VUELO_JS}(${wp.x}, ${wp.z}, '${wp.nombre}')`, 180));
      res.curva.push(...r.muestras.map(m => Object.assign({ fase: `v${v}` }, m)));
      const u = r.muestras[r.muestras.length - 1];
      console.log(`· v${v} → ${wp.nombre}: ${r.muestras.length} muestras — última heap=${u.heap}MB geo=${u.geo} tex=${u.tex} calls=${u.calls} ktris=${u.ktris}`);
    }
    await gc();
    const m = JSON.parse(await evaluar(cdp, ses, MUESTRA_JS, 30));
    res.fases['retenido_v' + v] = m;
    res.curva.push(Object.assign({ fase: `retenido_v${v}` }, m));
    console.log(`· retenido tras v${v} (gc): heap=${m.heap}MB total=${m.total}MB geo=${m.geo} tex=${m.tex} calls=${m.calls}`);
  }
  const f = JSON.parse(await evaluar(cdp, ses, FINAL_JS, 40));
  res.final = f;
  console.log(`· final: heap=${f.heap}MB geo=${f.geo} tex=${f.tex} calls=${f.calls} ktris=${f.ktris} zonasCerca=${f.zonasCercaN} ctx=${JSON.stringify(f.ctx)}`);
  if (f.escena && f.escena.length) console.log('  escena top: ' + f.escena.slice(0, 8).map(g => `${g.p} ${g.mb}MB/${g.n}`).join(' · '));
  if (f.rec && f.rec.listosRefs && f.rec.listosRefs.length) console.log('  recursos listos+refs top: ' + f.rec.listosRefs.slice(0, 8).map(r => `${r.n}:${r.t} ${r.mb}MB×${r.refs}`).join(' · '));
  try { await cdp.call('Target.closeTarget', { targetId }, undefined, 10); } catch (e) {}
  } catch (e) {
    res.error = e && e.message || String(e);
    console.log('· FALLO: ' + res.error);
  }
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { mataArbol(); }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) {}
  srv.close();
  const ruta = path.join(SALIDA, `qa158-${ETIQUETA}.json`);
  fs.writeFileSync(ruta, JSON.stringify(res, null, 2));
  console.log(`· resultado en ${ruta}`);
  process.exit(res.error ? 1 : 0);
})().catch(e => { console.error('FALLO:', e && e.stack || JSON.stringify(e) || String(e)); process.exit(2); });
