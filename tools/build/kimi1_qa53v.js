#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — QA-53 (resto): A/B del precalentado en reposo de la variante
   contraria de sombras (USE_SHADOWMAP on/off) de renderer.js.

   Escenario: partida sembrada de cap1 (sin creador), móvil 375×812 dpr 3, CPU ×4, GPU real.
   Asentado en 'medio' → conmutación manual medio→bajo (tormenta de variantes) → 5 s de muestreo de
   cuadros → conmutación de vuelta bajo→medio → 5 s más. Dos sesiones: BASE con ?otra=0 (sin
   precalentado) y POST normal. Mide: programas de three por fase, pendientes del precalentado,
   cuadros >200/>500 ms, p50/p95/peor, capturas de sanity por fase.

   Uso: node tools/build/kimi1_qa53v.js [--etiqueta r1]
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
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi053');
fs.mkdirSync(SALIDA, { recursive: true });
const ANCHO = 375, ALTO = 812, DPR = 3, CPU = 4;
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
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
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); this.eventos = []; ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } else this.eventos.push(d); }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(m, p, s, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: m, params: p || {}, sessionId: s })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + m)); } }, t); }); }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function ev(cdp, ses, exp, t, aw) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, returnByValue: true, awaitPromise: aw !== false }, ses, (t || 30) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 300));
  return r.result ? r.result.value : undefined;
}
// El snapshot del harness puede devolver null (la foto diferida se rinde a los ~4 s si la cerca no
// señala; QA-157): no es del juego, es de la herramienta. Se anota y se sigue.
function guardaPng(png, file) {
  if (!png || png.indexOf(',') < 0) return false;
  fs.writeFileSync(file, Buffer.from(png.split(',')[1], 'base64'));
  return true;
}
function erroresDe(cdp) {
  const out = [];
  for (const e of cdp.eventos) {
    if (e.method === 'Runtime.exceptionThrown') out.push('EXC ' + JSON.stringify(e.params.exceptionDetails.exception && e.params.exceptionDetails.exception.description || e.params.exceptionDetails.text).slice(0, 300));
    else if (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') out.push('console.error ' + (e.params.args || []).map(a => a.value != null ? String(a.value).slice(0, 200) : (a.description || '').slice(0, 200)).join(' '));
    else if (e.method === 'Log.entryAdded' && e.params.entry.level === 'error') out.push('log ' + String(e.params.entry.text).slice(0, 300));
  }
  return out.slice(0, 20);
}

// Semilla de cap1 (jugador existente: entra sin creador)
const SEMILLA_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.capitulo', '1');
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;

// Muestreo de cuadros (rAF)
const INIT_JS = `window.__k53v = { cuadros: [], marcas: [] };
(function () {
  const v = window.__k53v;
  try { let ult = performance.now(); function tick(t) { v.cuadros.push(Math.round(t - ult)); ult = t; if (v.cuadros.length < 400000) requestAnimationFrame(tick); } requestAnimationFrame(tick); } catch (e) {}
})();`;

// Estado del precalentado/programas
const ESTADO_JS = `(() => { const G = AV.G, r = G.renderer, R = r.renderer;
  let pend = null; try { pend = r.precarga ? r.precarga.programas() : null; } catch (e) {}
  return JSON.stringify({ nivel: r.calidad.nivel, sombras: !!R ? r.stats().sombras : null,
    progs: R.info.programs.length, tex: R.info.memory.textures, geo: R.info.memory.geometries,
    prec: { hechos: r._precalentar.hechos, otra: r._precalentar.otra }, pend }); })()`;

// Conmutación + muestreo de 5 s: devuelve métricas de la ventana
const FLIP_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), v = window.__k53v, G = AV.G, r = G.renderer;
  const P = ${'${PAYLOAD}'};
  const marco0 = v.cuadros.length, t0 = performance.now();
  r.setCalidad(P.nivel); // manual ya puesto: el adaptativo no interviene
  await sleep(5000);
  const marco1 = v.cuadros.length, t1 = performance.now();
  const w = v.cuadros.slice(marco0, marco1).sort((a, b) => a - b);
  const pq = q => (w.length ? w[Math.min(w.length - 1, Math.floor(w.length * q))] : null);
  const png = await r.snapshot(${ANCHO * 2}, ${ALTO * 2}, 0.85);
  return JSON.stringify({ a: P.a, fps: w.length && t1 > t0 ? +(w.length / ((t1 - t0) / 1000)).toFixed(1) : null,
    p50: pq(0.5), p95: pq(0.95), peor: pq(1), n200: w.filter(x => x > 200).length, n500: w.filter(x => x > 500).length, png }); })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1-q53v-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--enable-logging=stderr', '--v=0', `--window-size=${ANCHO * 2},${ALTO * 2}`, 'about:blank'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim(), err: () => err }; }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools en 60 s: ' + err.slice(0, 300));
}
function matarChrome(chrome) {
  try { chrome.kill(); } catch (e) {}
  try { execSync(`taskkill /PID ${chrome.pid} /T /F 2>NUL`, { stdio: 'ignore' }); } catch (e) {}
}

async function sesion(cdp, srv, origen, urlExtra, nombre) {
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
  await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
  await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS + '\n' + INIT_JS }, ses);
  // ?calidad=medio: arranque directo en medio (manual), SIN el flip alto→bajo del arranque adaptativo
  // que ensuciaba el A/B (compilaba la variante apagada en el arranque). ?otra=0 = línea base.
  await cdp.call('Page.navigate', { url: origen + '/index.html' + urlExtra }, ses);

  let clicado = false;
  for (let i = 0; i < 150 && !clicado; i++) {
    await cdp.bombear(0.5);
    try { clicado = !!(await ev(cdp, ses, `(() => { const b = document.querySelector('[data-modo="aventura"]'); if (!b) return false; b.click(); return true; })()`, 5, false)); } catch (e) {}
  }
  if (!clicado) throw new Error(nombre + ': no apareció la tarjeta Aventura');
  let jugable = false;
  for (let i = 0; i < 240 && !jugable; i++) {
    await cdp.bombear(0.5);
    try { jugable = !!(await ev(cdp, ses, `(() => { const G = window.AV && AV.G; if (!G || !G.ui || G.ui.worldHidden()) return false; const st = (() => { try { return G.renderer.stats(); } catch (e) { return null; } })(); return st && st.calls > 5; })()`, 5, false)); } catch (e) {}
  }
  if (!jugable) throw new Error(nombre + ': el mundo no llegó a jugable');
  await ev(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)); for (let i = 0; i < 200; i++) { const b = document.getElementById('c1-saltar'); if (b && b.isConnected) { b.click(); return; } await sleep(100); } })()`, 40, true);
  await cdp.bombear(1);
  // asentar: lado actual drenado Y variante contraria estabilizada (min 5 s, max 45 s)
  await ev(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms));
    const t0 = performance.now(); let o0 = -1, estable = 0;
    while (performance.now() - t0 < 45000) {
      const p = AV.G.renderer.precarga.programas(), o = AV.G.renderer._precalentar.otra;
      if (p === 0 && o === o0) { estable++; if (estable >= 2 && performance.now() - t0 > 5000) break; } else estable = 0;
      o0 = o; await sleep(2500);
    } })()`, 120, true);
  const est1 = JSON.parse(await ev(cdp, ses, ESTADO_JS, 15, false));
  const png1 = await ev(cdp, ses, `(async () => AV.G.renderer.snapshot(${ANCHO * 2}, ${ALTO * 2}, 0.85))()`, 30, true);
  const fotoAsentado = guardaPng(png1, path.join(SALIDA, `qa53v_${ETIQUETA}_${nombre}_asentado.jpg`));

  // conmutación medio→bajo (tormenta de variantes)
  const f1 = JSON.parse(await ev(cdp, ses, FLIP_JS.replace('${PAYLOAD}', JSON.stringify({ nivel: 'bajo', a: 'medio→bajo' })), 60, true));
  const pngf1 = f1.png; delete f1.png;
  f1.foto = guardaPng(pngf1, path.join(SALIDA, `qa53v_${ETIQUETA}_${nombre}_flip1.jpg`));
  const est2 = JSON.parse(await ev(cdp, ses, ESTADO_JS, 15, false));

  // asentar el lado 'bajo' y re-precalentar la variante contraria (ahora la de sombras ON) hasta estabilizar
  await ev(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms));
    const t0 = performance.now(); let o0 = -1, estable = 0;
    while (performance.now() - t0 < 45000) {
      const p = AV.G.renderer.precarga.programas(), o = AV.G.renderer._precalentar.otra;
      if (p === 0 && o === o0) { estable++; if (estable >= 2 && performance.now() - t0 > 6000) break; } else estable = 0;
      o0 = o; await sleep(2500);
    } })()`, 120, true);
  const est3 = JSON.parse(await ev(cdp, ses, ESTADO_JS, 15, false));

  // conmutación de vuelta bajo→medio
  const f2 = JSON.parse(await ev(cdp, ses, FLIP_JS.replace('${PAYLOAD}', JSON.stringify({ nivel: 'medio', a: 'bajo→medio' })), 60, true));
  const pngf2 = f2.png; delete f2.png;
  f2.foto = guardaPng(pngf2, path.join(SALIDA, `qa53v_${ETIQUETA}_${nombre}_flip2.jpg`));
  const est4 = JSON.parse(await ev(cdp, ses, ESTADO_JS, 15, false));

  await cdp.call('Target.closeTarget', { targetId: tid });
  return { asentado: est1, flip1: f1, trasFlip1: est2, asentadoBajo: est3, flip2: f2, trasFlip2: est4 };
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const chromeL = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${chromeL.puerto}${chromeL.wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const relojPerro = setTimeout(() => { console.log('· WATCHDOG: se acabó el tiempo'); process.exit(1); }, 14 * 60 * 1000);
  console.log(`· QA-53-variantes · móvil ${ANCHO}×${ALTO} dpr ${DPR} · CPU ×${CPU} · GPU real · etiqueta ${ETIQUETA}`);
  const resultado = { cuando: new Date().toISOString(), maquina: `PC Windows · Chrome headless GPU real · ${ANCHO}×${ALTO} dpr ${DPR} · CPU ×${CPU}`, escenarios: {} };
  try {
    resultado.gpu = await (async () => {
      const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
      const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
      await cdp.call('Runtime.enable', {}, ses);
      const g = await ev(cdp, ses, `(() => { try { const c = document.createElement('canvas'); const gl = c.getContext('webgl2'); const ext = gl.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'sin debug_info'; } catch (e) { return 'n/d'; } })()`, 15, false);
      await cdp.call('Target.closeTarget', { targetId: tid });
      return g;
    })();
    console.log('· GPU: ' + resultado.gpu);
    resultado.escenarios.base = await sesion(cdp, srv, origen, '?calidad=medio&otra=0', 'base');
    console.log('· BASE (?calidad=medio&otra=0) listo: ' + JSON.stringify({ asentado: resultado.escenarios.base.asentado, flip1: resultado.escenarios.base.flip1 }));
    resultado.escenarios.post = await sesion(cdp, srv, origen, '?calidad=medio', 'post');
    console.log('· POST listo: ' + JSON.stringify({ asentado: resultado.escenarios.post.asentado, flip1: resultado.escenarios.post.flip1 }));
    resultado.errores = erroresDe(cdp);
    console.log('· errores de consola: ' + JSON.stringify(resultado.errores));
  } finally {
    clearTimeout(relojPerro);
    matarChrome(chromeL.chrome);
    srv.close();
    for (const p of fs.readdirSync(os.tmpdir()).filter(x => x.startsWith('kimi1-q53v-'))) { try { fs.rmSync(path.join(os.tmpdir(), p), { recursive: true, force: true }); } catch (e) {} }
  }
  const out = path.join(SALIDA, `qa53v_${ETIQUETA}.json`);
  fs.writeFileSync(out, JSON.stringify(resultado, null, 1));
  console.log('DATOS ' + out);
  process.exit(0);
})().catch(e => { console.error('FALLO:', e && e.stack || String(e)); process.exit(2); });
