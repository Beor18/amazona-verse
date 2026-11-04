#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-032: ronda visual en calidad «bajo» (móvil 390×844).
   Chrome headless propio + CDP (sin librerías), móvil emulado 390×844 dpr 3 táctil, CPU ×4, GPU real.
   Entrada real de jugador: partida sembrada de cap1 (sin creador) → portada → tarjeta Aventura → salto de intro.
   En «bajo» se verifican: faroles de KIMI-018 (de noche; ojo: en bajo hay watchdog que los apaga si FPS < 30
   durante 4 s — si la contención de la PC lo dispara, la vista se repite a CPU ×1 con el mismo comportamiento
   del juego y se anota), vecinos mínimos (2) y ciudad viva mínima (6 cotorras, KIMI-028) y los riscos con el
   fondo marino de KIMI-027. Por vista: FPS (ventana de cuadros), draw calls, triángulos, memoria (heap JS +
   texturas/geometrías GPU), estado de los sistemas y captura JPEG.

   Uso: node tools/build/kimi1_032.js [--etiqueta r1] [--salida docs/img/kimi032] [--solo id] */
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
const SOLO = arg('--solo', '');
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi032'));
fs.mkdirSync(SALIDA, { recursive: true });
const ANCHO = 390, ALTO = 844, DPR = 3, CPU = 4;
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
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
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); this.eventos = []; ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error de conexión'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message + ' ' + JSON.stringify(d.error.data || ''))) : p.re(d.result); } else if (d.method) this.eventos.push(d); }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(m, p, s, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: m, params: p || {}, sessionId: s })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + m)); } }, t); }); }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function ev(cdp, ses, exp, t, aw) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, returnByValue: true, awaitPromise: aw !== false }, ses, (t || 30) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 400));
  return r.result ? r.result.value : undefined;
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

// Semilla de cap1 (jugador existente: entra sin creador) — misma base que kimi1_v17.js
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

// Instrumentación: cuadros (rAF) + heap. Todo en try/catch (un throw mata el resto de la instrumentación).
const INIT_JS = `window.__k32 = { cuadros: [], heap: [], t0: Math.round(performance.now()) };
(function () {
  const v = window.__k32;
  try { let ult = performance.now(); function tick(t) { v.cuadros.push(Math.round(t - ult)); ult = t; if (v.cuadros.length < 400000) requestAnimationFrame(tick); } requestAnimationFrame(tick); } catch (e) {}
  try { setInterval(() => { try { const m = performance.memory; v.heap.push([Math.round(performance.now()), m ? m.usedJSHeapSize : 0]); } catch (e) {} }, 500); } catch (e) {}
})();`;

// Vista: teleport (con y opcional = vuelo sobre el agua), asentado, fase, stats de sistemas y captura.
const TOMA_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S, v = window.__k32;
  const P = ${'${PAYLOAD}'};
  const marco0 = v.cuadros.length, t0 = performance.now();
  const ST = G.mundo && G.mundo.streaming;
  AV.teleport(P.x, P.z); if (P.y != null) { S.pos.y = P.y; } S.vy = 0; G.fisica.MOVE.flying = true;
  if (P.yaw != null) AV.debug.camYaw(P.yaw);
  if (P.y == null && ST && ST.alrededor) { try { await ST.alrededor(P.x, P.z); } catch (e) {} }
  // Segundo teleport con la zona ya cargada: el snap incluye los sólidos (cubierta del muelle, casas) y
  // no el terreno desnudo; y0 se fija y se mantiene durante el asentado (evita caer bajo la cubierta).
  AV.teleport(P.x, P.z); if (P.y != null) { S.pos.y = P.y; } else if (P.alzar) { S.pos.y += P.alzar; } S.vy = 0;
  const y0 = S.pos.y;
  for (let i = 0; i < 5; i++) { await sleep(400); S.pos.x = P.x; S.pos.z = P.z; S.pos.y = y0; S.vy = 0; if (P.yaw != null) AV.debug.camYaw(P.yaw); }
  // fase día/noche con estabilización del encendido de los faroles (rampa ~2 s; a FPS bajos tarda más)
  const A = G.atardecer, estFar = () => (G.ambiente && G.ambiente.faroles) ? G.ambiente.faroles() : null;
  if (P.fase === 'noche') { if (A) { A.forzar(false); A.avanzar(9); } S.hora = 20; }
  else { if (A) { A.forzar(false); A.avanzar(9); } delete S.hora; }
  await sleep(1600);
  for (let i = 0; i < 25; i++) { const f0 = estFar(); const e0 = f0 ? f0.enc : 0; if (P.fase === 'noche' ? e0 > 0.95 : e0 < 0.05) break; await sleep(400); }
  await sleep(800);
  const marco1 = v.cuadros.length, t1 = performance.now();
  const ventana = v.cuadros.slice(marco0, marco1).sort((a, b) => a - b);
  const pq = q => (ventana.length ? ventana[Math.min(ventana.length - 1, Math.floor(ventana.length * q))] : null);
  const st = G.renderer.stats();
  let memGPU = null; try { memGPU = G.renderer.renderer.info.memory; } catch (e) {}
  let heap = null; try { const m = performance.memory; heap = m ? Math.round(m.usedJSHeapSize / 1048576) : null; } catch (e) {}
  let far = null; try { const f = G.ambiente && G.ambiente.faroles && G.ambiente.faroles(); far = f ? { postes: f.posts.count, visible: !!f.pts.visible, enc: +f.enc.toFixed(2), activos: f.spots.filter(s => s.activo).length, uTam: f.U.uTam.value } : null; } catch (e) {}
  let ve = null; try { ve = G.vecinos && G.vecinos.estado ? G.vecinos.estado() : null; } catch (e) {}
  let cv = null; try { cv = G.ciudadViva ? { aves: G.ciudadViva.aves().length, pasos: G.ciudadViva.stats() } : null; } catch (e) {}
  const png = await G.renderer.snapshot(${ANCHO}, ${ALTO}, 0.9);
  return JSON.stringify({ pos: { x: +S.pos.x.toFixed(1), y: +S.pos.y.toFixed(1), z: +S.pos.z.toFixed(1) }, desvio_m: +Math.hypot(S.pos.x - P.x, S.pos.z - P.z).toFixed(1), hora: S.hora != null ? S.hora : null, fase: P.fase,
    fps: ventana.length && t1 > t0 ? +(ventana.length / ((t1 - t0) / 1000)).toFixed(1) : null, peorMs: pq(1), p95Ms: pq(0.95), p10Ms: pq(0.1),
    calls: st.calls, ktris: st.triangulos != null ? Math.round(st.triangulos / 1000) : null, calidad: st.calidad, dpr: st.dpr,
    heapMB: heap, gpu: memGPU, faroles: far, vecinos: ve, ciudadViva: cv, png }); })()`;

// yaw: 0 = sur (+z), π = norte (−z), π/2 = oeste (−x), −π/2 = este (+x)
const VISTAS = [
  { id: 'villa_muelle', x: 150, z: 203, yaw: Math.PI, alzar: 1.3, fase: 'dia', nota: 'base de día desde la cubierta del muelle' },
  { id: 'vecinos_villa', x: 125, z: 140, yaw: 0.58, fase: 'dia', nota: 'sitio vecinos: 2 vecinos en bajo (KIMI-028)' },
  { id: 'ciudad_viva', x: -20, z: -133, yaw: Math.PI, alzar: 2, fase: 'dia', nota: 'puerta oeste (ancla kimi013): ciudad + 6 cotorras' },
  { id: 'villa_muelle', x: 150, z: 203, yaw: Math.PI, alzar: 1.3, fase: 'noche', nota: 'faroles de noche (KIMI-018)' },
  { id: 'villa_plaza', x: 145.5, z: 178.5, yaw: Math.PI * 0.82, fase: 'noche', nota: 'faroles plaza de noche' },
  { id: 'ciudad_oeste', x: -20, z: -133, yaw: Math.PI, alzar: 2, fase: 'noche', nota: 'faroles Ciudad de los 36 de noche (puerta oeste)' },
  { id: 'costa_norte', x: -84, z: -247, y: 2.5, yaw: Math.PI, fase: 'dia', nota: 'riscos norte + fondo marino (KIMI-027)' },
  { id: 'costa_este', x: 248, z: -152, y: 2.5, yaw: Math.PI / 2, fase: 'dia', nota: 'riscos este + fondo marino (KIMI-027)' },
].filter(v => !SOLO || v.id.includes(SOLO));

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1-032-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--enable-logging=stderr', '--v=0', `--window-size=${ANCHO + 100},${ALTO + 100}`, 'about:blank'];
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

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const chromeL = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${chromeL.puerto}${chromeL.wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const relojPerro = setTimeout(() => { console.log('· WATCHDOG: se acabó el tiempo'); process.exit(1); }, 10 * 60 * 1000);
  console.log(`· KIMI-032 · móvil ${ANCHO}×${ALTO} dpr ${DPR} · CPU ×${CPU} · calidad BAJO · capturas en ${SALIDA}`);
  const tomas = [];
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
    await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS + '\n' + INIT_JS }, ses);
    await cdp.call('Page.navigate', { url: origen + '/index.html' }, ses);

    // portada → tarjeta Aventura (la partida sembrada entra sin creador)
    let clicado = false;
    for (let i = 0; i < 150 && !clicado; i++) {
      await cdp.bombear(0.5);
      try { clicado = !!(await ev(cdp, ses, `(() => { const b = document.querySelector('[data-modo="aventura"]'); if (!b) return false; b.click(); return true; })()`, 5, false)); } catch (e) { /* aún no */ }
    }
    if (!clicado) throw new Error('no apareció la tarjeta Aventura');
    // mundo jugable
    let jugable = false;
    for (let i = 0; i < 240 && !jugable; i++) {
      await cdp.bombear(0.5);
      try { jugable = !!(await ev(cdp, ses, `(() => { const G = window.AV && AV.G; if (!G || !G.ui || G.ui.worldHidden()) return false; const st = (() => { try { return G.renderer.stats(); } catch (e) { return null; } })(); return st && st.calls > 5; })()`, 5, false)); } catch (e) { /* aún no */ }
    }
    if (!jugable) throw new Error('el mundo no llegó a jugable');
    console.log('· entrada: Aventura pulsada y mundo jugable');
    // salto de intro (botón normal del juego)
    console.log('· intro: ' + await ev(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)); for (let i = 0; i < 200; i++) { const b = document.getElementById('c1-saltar'); if (b && b.isConnected) { b.click(); return 'saltada'; } await sleep(100); } return 'sin botón (¿ya terminó?)'; })()`, 40, true));
    await cdp.bombear(1.5);
    // calidad BAJO fija (sin rebaje automático): el iPhone arranca así
    console.log('· calidad: ' + await ev(cdp, ses, `(() => { const R = AV.G.renderer; if (R.calidad) R.calidad.manual = true; if (R.setCalidad) R.setCalidad('bajo'); return R.calidad && R.calidad.nivel; })()`, 15, false));
    // primer gesto sintético: carga vecinos/ciudad viva/bandada como en un móvil de verdad
    console.log('· sistemas: ' + await ev(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms));
      try { window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); } catch (e) {}
      const t0 = performance.now();
      while (performance.now() - t0 < 40000) { if (AV.G.vecinos && AV.G.ciudadViva) break; await sleep(300); }
      return JSON.stringify({ vecinos: !!AV.G.vecinos, ciudadViva: !!AV.G.ciudadViva, mallaVecinos: !!AV.G.renderer.scene.getObjectByName('vecinos'), bandadaExtra: !!(AV.G.bandada && AV.G.bandada.EXTRA) }); })()`, 90, true));
    console.log('· GPU: ' + await ev(cdp, ses, `(() => { try { const gl = AV.G.renderer.renderer.getContext(); const ext = gl.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'sin debug_info'; } catch (e) { return 'n/d'; } })()`, 15, false));

    const apagadas = [];
    for (const v of VISTAS) {
      const js = TOMA_JS.replace('${PAYLOAD}', JSON.stringify(v));
      const m = JSON.parse(await ev(cdp, ses, js, 240));
      const png = m.png; delete m.png;
      const f = path.join(SALIDA, `k032_${v.id}_${v.fase}.jpg`);
      fs.writeFileSync(f, Buffer.from(png.split(',')[1], 'base64'));
      m.vista = v.id; m.archivo = path.basename(f); m.nota = v.nota;
      tomas.push(m);
      console.log(`  · ${v.id} [${v.fase}] pos ${JSON.stringify(m.pos)}${m.desvio_m > 5 ? ' DESVIO ' + m.desvio_m + ' m' : ''}: ${m.fps} fps · peor ${m.peorMs} ms · ${m.calls} calls · ${m.ktris} k tris · heap ${m.heapMB} MB · tex ${m.gpu ? m.gpu.textures : '?'} · faroles ${m.faroles ? (m.faroles.visible ? 'ON enc ' + m.faroles.enc : 'OFF') : '-'} · vec ${m.vecinos ? m.vecinos.n + '/' + (m.vecinos.visible ? 'vis' : 'oculto') : '-'} · cv ${m.ciudadViva ? m.ciudadViva.aves + ' aves' : '-'}`);
      if (v.fase === 'noche' && m.faroles && !m.faroles.visible) apagadas.push(v);
    }

    // Repetición de vistas con faroles apagados por el watchdog (FPS < 30 × 4 s): mismo juego, CPU ×1 para que
    // el propio sistema los reactive (≥ 45 fps × 8 s) y verificar el aspecto del halo/postes en «bajo».
    for (const v of apagadas) {
      console.log(`  · reintento SIN contención (CPU ×1) tras watchdog: ${v.id}`);
      await cdp.call('Emulation.setCPUThrottlingRate', { rate: 1 }, ses);
      await cdp.bombear(10); // ventana del watchdog: ≥ 45 fps durante 8 s
      const js = TOMA_JS.replace('${PAYLOAD}', JSON.stringify(v));
      const m = JSON.parse(await ev(cdp, ses, js, 240));
      const png = m.png; delete m.png;
      const f = path.join(SALIDA, `k032_${v.id}_${v.fase}_cpu1.jpg`);
      fs.writeFileSync(f, Buffer.from(png.split(',')[1], 'base64'));
      m.vista = v.id; m.archivo = path.basename(f); m.nota = v.nota + ' (reintento CPU ×1 tras watchdog)';
      tomas.push(m);
      console.log(`  · ${v.id} [${v.fase} cpu1] pos ${JSON.stringify(m.pos)}: ${m.fps} fps · ${m.calls} calls · faroles ${m.faroles ? (m.faroles.visible ? 'ON enc ' + m.faroles.enc : 'OFF') : '-'}`);
      await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
    }

    const errs = erroresDe(cdp);
    console.log('· errores de consola: ' + JSON.stringify(errs));
    const heapSerie = await ev(cdp, ses, 'JSON.stringify(window.__k32.heap)', 10, false);
    fs.writeFileSync(path.join(SALIDA, `k032_${ETIQUETA}.json`), JSON.stringify({ cuando: new Date().toISOString(), maquina: 'PC Windows · Chrome headless GPU real · ' + ANCHO + '×' + ALTO + ' dpr ' + DPR + ' · CPU ×' + CPU + ' · calidad bajo (manual)', gpu: await ev(cdp, ses, `(() => { try { const gl = AV.G.renderer.renderer.getContext(); const ext = gl.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'sin debug_info'; } catch (e) { return 'n/d'; } })()`, 15, false), tomas, heap: JSON.parse(heapSerie || '[]'), errores: errs }, null, 1));
  } finally {
    clearTimeout(relojPerro);
    matarChrome(chromeL.chrome);
    srv.close();
    for (const p of fs.readdirSync(os.tmpdir()).filter(x => x.startsWith('kimi1-032-'))) { try { fs.rmSync(path.join(os.tmpdir(), p), { recursive: true, force: true }); } catch (e) {} }
  }
  console.log('DATOS ' + path.join(SALIDA, `k032_${ETIQUETA}.json`));
  process.exit(0);
})().catch(e => { console.error('FALLO:', e && e.stack || String(e)); process.exit(2); });
