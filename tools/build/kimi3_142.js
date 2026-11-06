#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-142: diagnóstico de la palanca 2/3 del «Queda» de
   QA-181 (layout thrash del HUD · getClientRects ~8 % del hilo en la pelea de la Sombra, KIMI-140).
   Entra en cap. 1 con ?v18=1 (Chromebook 1366×768 CPU ×6, «bajo», GPU real), asienta el área del
   río/puente, perfila 12 s quieto y 12 s de pelea con la Sombra y reconstruye el ÁRBOL de llamadas
   del perfil CDP: para cada nodo getClientRects/getBoundingClientRect reporta la cadena de
   ancestros (módulo · función) y el tiempo propio y total del subárbol. Así se sabe QUIÉN fuerza
   el reflow por cuadro. No toca el juego.
   Uso: node tools/build/kimi3_142.js --etiqueta r1 [--cpu 6] [--secs 12]
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ETIQUETA = arg('--etiqueta', 'r1');
const CPU = parseInt(arg('--cpu', '6'), 10);
const SECS = parseInt(arg('--secs', '12'), 10);
const PF = { w: 1366, h: 768, dpr: 1 }; // Chromebook escolar (KIMI-127/136)
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi142'));
fs.mkdirSync(SALIDA, { recursive: true });
const LOGF = path.join(SALIDA, `k142_${ETIQUETA}.log`);
fs.writeFileSync(LOGF, '');
function log(msg) { try { fs.appendFileSync(LOGF, `[${new Date().toISOString().slice(11, 19)}] ${msg}\n`); } catch (e) { } }
const res = { tarea: 'KIMI-142', bug: 'QA-181', etiqueta: ETIQUETA, chromebook: Object.assign({ cpu: CPU }, PF), secs: SECS, escenarios: {}, consola: null };
function guardar() { try { fs.writeFileSync(path.join(SALIDA, `k142_${ETIQUETA}.json`), JSON.stringify(res, null, 1)); } catch (e) { } }
guardar();

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi3k142-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res2) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res2.writeHead(400); return res2.end(); }
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res2.writeHead(403); return res2.end(); }
    fs.readFile(f, (e, d) => { if (e) { res2.writeHead(404); return res2.end('404'); } res2.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res2.end(d); });
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
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi3k142-' + Math.random().toString(36).slice(2, 10),
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
  const S = window.AV && window.AV.state; if (!S || !S.profile || !S.profile.created) return 'sin perfil';
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(30000);
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 45000);
  const b = document.getElementById('c1-saltar'); if (b) b.click();
  await sleep(800);
  const f = document.getElementById('c1-fade'); if (f) f.remove();
  if (AV.G.ui && AV.G.ui.hideToast) AV.G.ui.hideToast();
  const jugar = Array.from(document.querySelectorAll('button')).find(x => /a jugar/i.test(x.textContent || '')); if (jugar) jugar.click();
  await sleep(300);
  try { window.dispatchEvent(new PointerEvent('pointerdown')); } catch (e) {}
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

// Prep + escenarios: mismo driver que kimi3_140.js (KIMI-140)
const PREP_JS = `(async () => { try { return await (async () => {
  const G = AV.G, S = AV.state, sleep = ms => new Promise(r => setTimeout(r, ms));
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(120); } return false; };
  if (!await espera(() => G.mundo && G.mundo.listo, 90000)) return 'ERR mundo no listo';
  try { window.dispatchEvent(new PointerEvent('pointerdown')); } catch (e) {}
  if (!await espera(() => G.v18combate && G.v18amenaza && G.v18Reparar && G.v18fx, 90000)) return 'ERR módulos v18 sin cargar';
  if (!await espera(() => G.v18combate.estado().ch, 30000)) return 'ERR rival sin modelo';
  window.__k85 = {
    G, S, sleep, espera,
    ir(x, z) { S.pos.x = x; S.pos.z = z; if (G.fisica && G.fisica.MOVE) { G.fisica.MOVE.vx = G.fisica.MOVE.vz = 0; } },
    statsST() { try { const ST = G.mundo && G.mundo.streaming; return ST && ST.stats ? ST.stats() : null; } catch (e) { return null; } },
    async asentar(msMax) {
      const t0 = performance.now(); let quietas = 0, visto = 0;
      while (performance.now() - t0 < (msMax || 30000)) {
        const st = this.statsST(); const t = st ? st.trabajos : -1, d = st ? st.descargando : -1;
        if (st) visto++;
        if (t === 0 && d === 0) { if (++quietas >= 2) break; } else quietas = 0;
        await sleep(1000);
      }
      await sleep(1000);
      const fin = this.statsST();
      return { trabajos: fin ? fin.trabajos : null, descargando: fin ? fin.descargando : null, vistoST: visto };
    },
    async muestra(durSec) {
      const deltas = []; let ult = performance.now(); let vivo = true;
      const marca = () => { if (!vivo) return; const a = performance.now(); deltas.push(a - ult); ult = a; requestAnimationFrame(marca); };
      requestAnimationFrame(marca);
      const stats = []; const t0 = performance.now();
      while (performance.now() - t0 < durSec * 1000) {
        await sleep(1000);
        try { const st = G.renderer.stats(); stats.push({ calls: st.calls, tris: st.triangulos, fpsMedidor: st.fps, dpr: st.dpr }); } catch (e) { stats.push(null); }
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

const ESCENARIOS_JS = `(() => {
  const K = window.__k85, G = K.G, S = K.S, Cb = G.v18combate, Am = G.v18amenaza;
  return {
    async quietoPrep() { try { Cb.salir(); } catch (e) {} try { Am.salir(); } catch (e) {} const c = Am.centro; K.ir(c.x + 5, c.z); const asent = await K.asentar(45000); return { asentado: asent, fase: Am.estado().fase }; },
    async quietoMide() { return await K.muestra(${SECS}); },
    async sombraPrep() {
      try { Cb.salir(); } catch (e) {}
      const c = Am.centro; K.ir(c.x + 5, c.z); const asent = await K.asentar(45000);
      if (Am.estado().fase === 'nada') Am.iniciar({ forzar: true, sinEspera: true });
      await K.sleep(1500);
      return { asentado: asent, fase: Am.estado().fase };
    },
    async sombraMide() {
      const drv = setInterval(() => { try { Am.usarPoder(); } catch (e) {} }, 900);
      const r = await K.muestra(${SECS});
      clearInterval(drv);
      try { Am.salir(); } catch (e) {}
      return r;
    }
  };
})()`;

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
  if (u.includes('src/engine/input.js')) return 'input';
  if (u.includes('src/engine/')) return 'engine/otro';
  if (u.includes('src/game/v18/amenaza.js')) return 'v18/amenaza';
  if (u.includes('src/game/v18/fx_poderes.js')) return 'v18/fx';
  if (u.includes('src/game/v18/combate.js')) return 'v18/combate';
  if (u.includes('src/game/v18/duelo2.js')) return 'v18/duelo2';
  if (u.includes('src/game/v18/')) return 'v18/otro';
  if (u.includes('src/game/minimapa.js')) return 'minimapa';
  if (u.includes('src/game/guia_controles.js')) return 'guia';
  if (u.includes('src/game/')) return 'game';
  if (u.includes('src/ui/')) return 'ui';
  if (u.includes('src/pruebas/') || u.includes('tests/')) return 'pruebas';
  if (u.includes('content/')) return 'content';
  if (u.includes('boot.js')) return 'boot';
  if (/three/i.test(u)) return 'three.js';
  return 'otro:' + u.split('/').slice(-2).join('/');
}

// self-time por función + ÁRBOL: tiempo propio y total de cada nodo, y cadena de ancestros.
function analizar(profile) {
  const nodos = new Map();
  for (const nd of profile.nodes || []) nodos.set(nd.id, nd);
  const padre = new Map();
  for (const nd of profile.nodes || []) for (const c of nd.children || []) padre.set(c, nd.id);
  const selfPorNodo = new Map(), hitsPorNodo = new Map();
  const samples = profile.samples || [], deltas = profile.timeDeltas || [];
  for (let i = 0; i < samples.length; i++) {
    const dt = deltas[i] || 0, id = samples[i];
    selfPorNodo.set(id, (selfPorNodo.get(id) || 0) + dt);
    hitsPorNodo.set(id, (hitsPorNodo.get(id) || 0) + 1);
  }
  const porFuncion = {}, porModulo = {};
  for (const nd of profile.nodes || []) {
    const cf = nd.callFrame || {}, nombre = cf.functionName || '(anónima)', mod = moduloDe(cf.url, nombre);
    const clave = mod + ' · ' + nombre;
    const self = selfPorNodo.get(nd.id) || 0;
    (porFuncion[clave] || (porFuncion[clave] = { selfUs: 0, hits: 0 })).selfUs += self;
    porFuncion[clave].hits += hitsPorNodo.get(nd.id) || 0;
    (porModulo[mod] || (porModulo[mod] = { selfUs: 0, hits: 0 })).selfUs += self;
  }
  // cadenas de llamadas de layout: nodos cuya función es un getter de layout
  const LAYOUT = /^(getClientRects|getBoundingClientRect|getComputedTextLength)$/;
  const cadenas = [];
  for (const nd of profile.nodes || []) {
    const cf = nd.callFrame || {};
    if (!LAYOUT.test(cf.functionName || '')) continue;
    // sube por los padres hasta la raíz y anota la firma del primer ancestro con URL
    let p = padre.get(nd.id), pasos = 0, llamador = null, raiz = null;
    const cadena = [];
    while (p != null && pasos++ < 40) {
      const pn = nodos.get(p); if (!pn) break;
      const pcf = pn.callFrame || {}, pnom = pcf.functionName || '(anónima)';
      cadena.push(moduloDe(pcf.url, pnom) + ' · ' + pnom);
      if (!llamador && pcf.url) llamador = moduloDe(pcf.url, pnom) + ' · ' + pnom + ' @' + String(pcf.url).split('/').pop() + ':' + (pcf.lineNumber != null ? pcf.lineNumber + 1 : '?');
      if (!padre.get(p)) raiz = moduloDe(pcf.url, pnom) + ' · ' + pnom;
      p = padre.get(p);
    }
    cadenas.push({
      funcion: cf.functionName, selfMs: Math.round((selfPorNodo.get(nd.id) || 0) / 100) / 10,
      hits: hitsPorNodo.get(nd.id) || 0,
      llamador: llamador || '(sin url)', raiz: raiz || '', cadena: cadena.slice(0, 8)
    });
  }
  const totalUs = deltas.reduce((s, x) => s + (x || 0), 0);
  return { porFuncion, porModulo, totalUs, cadenas };
}

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3k142-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    `--window-size=${PF.w},${PF.h}`, 'about:blank'];
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi3k142-*' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

async function perfilarEscenario(cdp, ses, nombre, prepJs) {
  if (prepJs) {
    const p = JSON.parse(await evaluar(cdp, ses, `(async () => { const E = ${ESCENARIOS_JS}; return JSON.stringify(await E.${prepJs}()); })()`, 120));
    res.escenarios[nombre + 'Prep'] = p;
    guardar();
    log(nombre + ' prep: ' + JSON.stringify(p.asentado || p.fase || p));
  }
  await cdp.call('Profiler.setSamplingInterval', { interval: 200 }, ses);
  await cdp.call('Profiler.start', {}, ses);
  const mide = JSON.parse(await evaluar(cdp, ses, `(async () => { const E = ${ESCENARIOS_JS}; return JSON.stringify(await E.${nombre === 'quieto' ? 'quietoMide' : 'sombraMide'}()); })()`, 180));
  const prof = (await cdp.call('Profiler.stop', {}, ses, 90000)).profile;
  const atr = analizar(prof);
  const top = Object.entries(atr.porFuncion).sort((a, b) => b[1].selfUs - a[1].selfUs).slice(0, 20)
    .map(([k, v]) => ({ fn: k, selfMs: Math.round(v.selfUs / 100) / 10, pct: Math.round(v.selfUs / atr.totalUs * 1000) / 10, hits: v.hits }));
  const layout = atr.cadenas
    .map(c => Object.assign(c, { pct: Math.round(c.selfMs / (atr.totalUs / 100) * 10) / 10 }))
    .sort((a, b) => b.selfMs - a.selfMs).slice(0, 12);
  res.escenarios[nombre] = Object.assign(mide, { perfilTotalMs: Math.round(atr.totalUs / 100) / 10, top, layout });
  guardar();
  const gl = layout.find(l => /getClientRects|getBoundingClientRect/.test(l.funcion));
  log(nombre + ': fpsMed=' + mide.fpsMed + ' · perfil ' + res.escenarios[nombre].perfilTotalMs + ' ms · layout: ' + (gl ? gl.selfMs + ' ms ' + gl.pct + '% llamador=' + gl.llamador : 'sin getClientRects en top'));
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  log('chrome listo; servidor :' + puerto);
  const watch = setInterval(() => { try { guardar(); } catch (e) { } }, 5000);
  let cerrado = false;
  const cierra = async (motivo) => {
    if (cerrado) return; cerrado = true; clearInterval(watch);
    try { mataPorPerfil(); } catch (e) { }
    try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
    try { srv.close(); } catch (e) { }
    log('cerrado: ' + motivo);
  };
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Profiler.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: PF.w, height: PF.h, deviceScaleFactor: PF.dpr, mobile: false }, ses);
    try { await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses); } catch (e) { }
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&v18=1` }, ses);
    await cdp.bombear(2.5);
    const ent = await evaluar(cdp, ses, ENTRAR_JS, 120);
    log('entrar: ' + ent);
    if (String(ent) !== 'ok') throw new Error('entrada: ' + ent);
    try { await evaluar(cdp, ses, `(() => { const r = AV.G.renderer.setCalidad('bajo', true); return r && r.nivel; })()`, 30, false); } catch (e) { }
    const prep = await evaluar(cdp, ses, PREP_JS, 300);
    if (String(prep) !== 'ok') throw new Error('prep: ' + prep);
    log('prep ok');
    await perfilarEscenario(cdp, ses, 'quieto', 'quietoPrep');
    await perfilarEscenario(cdp, ses, 'sombra', 'sombraPrep');
    try { res.consola = await evaluar(cdp, ses, 'window.__erroresConsola || []', 20); guardar(); } catch (e) { }
    log('consola ' + (res.consola ? res.consola.length + ' errores' : '?'));
    await cierra('ok');
    process.exit(0);
  } catch (e) {
    res.error = String(e && e.stack || e).slice(0, 800); guardar();
    log('ERROR ' + res.error);
    await cierra('error');
    process.exit(1);
  }
})();
