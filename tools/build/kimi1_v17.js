#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-023: medidas reales V17 con GPU real.
   Chrome headless propio + CDP (sin librerías), móvil emulado 390×844 dpr 3 táctil, CPU ×4, GPU real.
   Tres escenarios sobre la copia de trabajo servida en local:
     carga-frio   · perfil nuevo: pantalla de carga (t a mundoListo, t a revelar, peor cuadro, p95,
                  heap máx, bytes transferidos, geo/tex/programas al llegar)
     carga-cache  · MISMO perfil relanzado y servidor con caché HTTP: lo mismo (qué mejora un jugador que vuelve)
     vuelo        · perfil nuevo: semilla cap1 → teleport a la Ciudad de los 36 → vuelo circular 45 s a ~22 m
                  → FPS p50/p10, peor cuadro, draw calls, triángulos, memoria cada 5 s
   Salida: docs/img/kimi023/v17-<etiqueta>.json + vuelo_ciudad.jpg
   Uso: node tools/build/kimi1_v17.js --etiqueta r1 [--solo carga-frio|carga-cache|vuelo] */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ETIQUETA = (() => { const i = process.argv.indexOf('--etiqueta'); return i > 0 ? process.argv[i + 1] : 'r1'; })();
const SOLO = (() => { const i = process.argv.indexOf('--solo'); return i > 0 ? process.argv[i + 1] : null; })();
const CPU = parseFloat((() => { const i = process.argv.indexOf('--cpu'); return i > 0 ? process.argv[i + 1] : '4'; })(), 10);
const CAP = (() => { const i = process.argv.indexOf('--cap'); return i > 0 ? process.argv[i + 1] : '1'; })();
const DUR_VUELO = parseInt((() => { const i = process.argv.indexOf('--secs'); return i > 0 ? process.argv[i + 1] : '45'; })(), 10);
const ANCHO = 390, ALTO = 844, DPR = 3;
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi023');
fs.mkdirSync(SALIDA, { recursive: true });
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
let CACHEABLE = false; // el escenario carga-cache lo pone a true (modela un jugador que vuelve)
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); return res.end('404'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': CACHEABLE ? 'max-age=86400' : 'no-store' });
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

// Semilla de cap1 (jugador existente: entra sin creador) — misma base que kimi2_qa152.js (QA-111/QA-152)
const SEMILLA_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.capitulo', '${CAP}');
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

// Instrumentación en la página: cuadros (rAF), heap, mundoListo, jugable (mundo visible dibujando), bytes.
// Ojo: addScriptToEvaluateOnNewDocument corre en documento nuevo; registrar TODO dentro de try/catch
// (un throw aquí mata el resto de la instrumentación: pasó con un MutationObserver en documentElement).
const INIT_JS = `window.__v17 = { nav: Math.round(performance.now()), cuadros: [], heap: [], jugable: null, barra: null, barraFin: null, ml: null, mlT: null, bytes: 0, clickT: null };
(function () {
  const v = window.__v17;
  try {
    let ult = performance.now();
    function tick(t) { v.cuadros.push(Math.round(t - ult)); ult = t; if (v.cuadros.length < 400000) requestAnimationFrame(tick); }
    requestAnimationFrame(tick);
  } catch (e) {}
  try {
    setInterval(() => { try { const m = performance.memory; v.heap.push([Math.round(performance.now()), m ? m.usedJSHeapSize : 0]); } catch (e) {} }, 500);
  } catch (e) {}
  try {
    setInterval(() => {
      try {
        if (v.ml == null && window.AV && AV.G) {
          if (AV.G.mundo && AV.G.mundo.listo) {
            v.ml = 0;
            Promise.resolve(AV.G.mundo.listo).then(() => { v.mlT = Math.round(performance.now()); v.ml = 1; });
          } else if (AV.G.on) {
            v.ml = 0;
            AV.G.on('mundoListo', () => { v.mlT = Math.round(performance.now()); v.ml = 1; });
          }
        }
      } catch (e) {}
      try {
        if (v.jugable == null && window.AV && AV.G && AV.G.ui && AV.G.ui.worldHidden && !AV.G.ui.worldHidden()) {
          const st = (() => { try { return AV.G.renderer.stats(); } catch (e) { return null; } })();
          if (st && st.calls > 5) v.jugable = Math.round(performance.now());
        }
        const c = document.getElementById('carga');
        if (c) { if (v.barra == null && !c.hidden) v.barra = Math.round(performance.now()); if (v.barra != null && v.barraFin == null && c.hidden) v.barraFin = Math.round(performance.now()); }
      } catch (e) {}
      try { v.bytes = Math.round(performance.getEntriesByType('resource').reduce((a, r) => a + (r.transferSize || 0), 0)); } catch (e) {}
    }, 250);
  } catch (e) {}
})();`;

const RESUMEN_CARGA_JS = `(() => {
  const v = window.__v17;
  const orden = [...v.cuadros].sort((a, b) => a - b);
  const p = q => (orden.length ? orden[Math.min(orden.length - 1, Math.floor(orden.length * q))] : null);
  let info = null, progs = null, st = null;
  try { const R = AV.G.renderer; info = { geo: R.renderer.info.memory.geometries, tex: R.renderer.info.memory.textures }; progs = R.renderer.info.programs.length; st = R.stats(); } catch (e) {}
  return { ml: v.ml === 1 ? v.mlT : null, jugable: v.jugable, barra: v.barra, barraFin: v.barraFin, clickT: v.clickT,
    nCuadros: orden.length, peorMs: p(1), p95Ms: p(0.95), medMs: p(0.5),
    heapMax: v.heap.length ? Math.max(...v.heap.map(h => h[1])) : null, heapFin: v.heap.length ? v.heap[v.heap.length - 1][1] : null,
    bytes: v.bytes, geo: info && info.geo, tex: info && info.tex, prog: progs,
    calls: st && st.calls, ktris: st && st.triangulos != null ? Math.round(st.triangulos / 1000) : null, calidad: st && st.calidad };
})()`;

const GPU_JS = `(() => { try { const gl = AV.G.renderer.renderer.getContext(); const ext = gl.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'sin debug_info'; } catch (e) { return 'n/d'; } })()`;

// Vuelo circular sobre la Ciudad de los 36 (ancla de la ronda 013 / repro 020: centro (-33,-136))
const VUELO_JS = `(async () => {
  const AV = window.AV, G = AV.G, S = G.S, ST = (G.mundo && G.mundo.streaming) || (G.streaming && G.streaming.gestor);
  if (!ST) return JSON.stringify({ error: 'sin streaming' });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  window.__v17.cuadros.length = 0; // ventana limpia: solo el vuelo
  AV.teleport(-20, -133);
  S.pos.y += 22; S.vy = 0; G.fisica.MOVE.flying = true;
  try { AV.debug.camYaw(Math.PI); } catch (e) {}
  await ST.alrededor(S.pos.x, S.pos.z);
  const valor = await ST.terminar({ topeMs: 30000 });
  await sleep(1500);
  const CX = -33, CZ = -136, R = 55, H = 22, T = ${DUR_VUELO};
  const t0 = performance.now();
  const mem = [];
  const mTimer = setInterval(() => { try { const R2 = G.renderer; mem.push({ t: Math.round((performance.now() - t0) / 100) / 10, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576 * 10) / 10 : null, geo: R2.renderer.info.memory.geometries, tex: R2.renderer.info.memory.textures, prog: R2.renderer.info.programs.length }); } catch (e) {} }, 5000);
  await new Promise(res => {
    function paso() {
      const t = (performance.now() - t0) / 1000;
      if (t >= T) return res();
      const a = (t / T) * Math.PI * 2 - Math.PI / 2;
      S.pos.x = CX + Math.cos(a) * R; S.pos.z = CZ + Math.sin(a) * R; S.pos.y = H + Math.sin(t * 0.4) * 4; S.vy = 0;
      G.fisica.MOVE.flying = true;
      try { AV.debug.camYaw(Math.atan2(Math.cos(a), Math.sin(a)) + Math.PI); } catch (e) {}
      requestAnimationFrame(paso);
    }
    paso();
  });
  clearInterval(mTimer);
  const st = (() => { try { return G.renderer.stats(); } catch (e) { return {}; } })();
  const v = window.__v17; const orden = [...v.cuadros].sort((a, b) => a - b);
  const p = q => (orden.length ? orden[Math.min(orden.length - 1, Math.floor(orden.length * q))] : null);
  const suma = orden.reduce((a, b) => a + b, 0);
  return JSON.stringify({ durReal: Math.round(suma / 100) / 10, nCuadros: orden.length,
    fpsMed: orden.length ? Math.round(orden.length * 100000 / suma) / 100 : null,
    fpsP50: p(0.5) ? Math.round(100000 / p(0.5)) / 100 : null, fpsP10: p(0.9) ? Math.round(100000 / p(0.9)) / 100 : null,
    peorMs: p(1), p95Ms: p(0.95), calls: st.calls, ktris: st.triangulos != null ? Math.round(st.triangulos / 1000) : null,
    calidad: st.calidad, terminarTope: !!(valor && valor.tope), mem });
})()`;

async function lanzarChrome(perf) {
  fs.mkdirSync(perf, { recursive: true });
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--enable-logging=stderr', '--v=0', '--window-size=500,900', 'about:blank'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim(), err: () => err }; }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools en 60 s: ' + err.slice(0, 300));
}

async function conectar(cdp, origen, conSemilla) {
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
  await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
  await cdp.call('Network.enable', {}, ses);
  await cdp.call('Network.setCacheDisabled', { cacheDisabled: false }, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: (conSemilla ? SEMILLA_JS + '\n' : '') + INIT_JS }, ses);
  await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
  return ses;
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

async function esperarJugable(cdp, ses, topeS) {
  const t0 = Date.now();
  while (Date.now() - t0 < topeS * 1000) {
    await cdp.bombear(0.5);
    try {
      const r = await ev(cdp, ses, `(() => { const v = window.__v17; return (v.ml === 1 && v.jugable != null) ? 1 : 0; })()`, 5, false);
      if (r === 1) { await cdp.bombear(2); return true; }
    } catch (e) { /* página aún cargando */ }
  }
  return false;
}

// Flujo con la pantalla de carga real: portada (partida sembrada) → clic en la tarjeta Aventura → barra de carga → mundo.
async function matarChrome(chrome) {
  try { chrome.kill(); } catch (e) {}
  try {
    const { execSync } = require('child_process');
    execSync(`taskkill /PID ${chrome.pid} /T /F 2>NUL`, { stdio: 'ignore' });
  } catch (e) {}
}

async function escenarioCarga(srvPuerto, perf, etiqueta, cacheable) {
  CACHEABLE = cacheable;
  const origen = `http://127.0.0.1:${srvPuerto}`;
  const chromeL = await lanzarChrome(perf);
  const ws = new WebSocket(`ws://127.0.0.1:${chromeL.puerto}${chromeL.wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const res = { escenario: etiqueta, cacheable, movil: { ancho: ANCHO, alto: ALTO, dpr: DPR, cpu: CPU, cap: CAP, flujo: 'portada → Aventura → barra de carga' } };
  try {
    const ses = await conectar(cdp, origen, true);
    const t0 = Date.now();
    await cdp.call('Page.navigate', { url: origen + '/index.html' }, ses);
    // espera la portada y pulsa la tarjeta Aventura (la partida sembrada entra sin creador)
    const pulsarAventura = async () => {
      for (let i = 0; i < 120; i++) {
        await cdp.bombear(0.5);
        try {
          const hecho = await ev(cdp, ses, `(() => {
            const b = document.querySelector('[data-modo="aventura"]');
            if (!b) return false;
            b.click();
            window.__v17.clickT = Math.round(performance.now());
            return true;
          })()`, 5, false);
          if (hecho) return true;
        } catch (e) { /* aún no */ }
      }
      return false;
    };
    const clicado = await pulsarAventura();
    if (etiqueta === 'carga-cache' && cacheable) {
      // pasada de cebo: este mismo perfil bajó todo con no-store (no guardó nada);
      // con cabeceras cacheables la primera pasada llena la caché HTTP y la segunda la MIDE de verdad.
      await esperarJugable(cdp, ses, 150);
      await cdp.bombear(1);
      await cdp.call('Page.navigate', { url: origen + '/index.html' }, ses);
      res.cebo = true;
      await pulsarAventura();
    }
    res.clicAventura = clicado ? Math.round(Date.now() - t0) : null;
    res.okCarga = await esperarJugable(cdp, ses, 150);
    res.durTotal = Math.round(Date.now() - t0);
    res.resumen = await ev(cdp, ses, RESUMEN_CARGA_JS, 20);
    res.gpu = await ev(cdp, ses, GPU_JS, 15);
    res.errores = erroresDe(cdp);
  } finally {
    await matarChrome(chromeL.chrome);
    await new Promise(r => setTimeout(r, 1200));
    try { ws.close(); } catch (e) {}
  }
  return res;
}

async function escenarioVuelo(srvPuerto, perf) {
  CACHEABLE = false;
  const origen = `http://127.0.0.1:${srvPuerto}`;
  const chromeL = await lanzarChrome(perf);
  const ws = new WebSocket(`ws://127.0.0.1:${chromeL.puerto}${chromeL.wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const res = { escenario: 'vuelo-ciudad', movil: { ancho: ANCHO, alto: ALTO, dpr: DPR, cpu: CPU, cap: CAP, dur: DUR_VUELO, flujo: 'portada → Aventura → vuelo circular sobre la Ciudad de los 36' } };
  try {
    const ses = await conectar(cdp, origen, true);
    await cdp.call('Page.navigate', { url: origen + '/index.html' }, ses);
    // con UA de iPhone la entrada ?cap= NO entra sola: va al menú de modos → hay que pulsar Aventura
    for (let i = 0; i < 120; i++) {
      await cdp.bombear(0.5);
      try {
        const hecho = await ev(cdp, ses, `(() => { const b = document.querySelector('[data-modo="aventura"]'); if (!b) return false; b.click(); window.__v17.clickT = Math.round(performance.now()); return true; })()`, 5, false);
        if (hecho) break;
      } catch (e) { /* aún no */ }
    }
    res.okCarga = await esperarJugable(cdp, ses, 150);
    if (!res.okCarga) { res.error = 'el mundo no llegó a jugable; vuelo no medido'; return res; }
    res.gpu = await ev(cdp, ses, GPU_JS, 15);
    const raw = await ev(cdp, ses, VUELO_JS, DUR_VUELO + 90);
    res.vuelo = JSON.parse(raw);
    try {
      const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 30000);
      fs.writeFileSync(path.join(SALIDA, `v17-${ETIQUETA}-vuelo_ciudad.jpg`), Buffer.from(shot.data, 'base64'));
    } catch (e) { res.shotError = String(e.message).slice(0, 120); }
    res.errores = erroresDe(cdp);
  } finally {
    await matarChrome(chromeL.chrome);
    await new Promise(r => setTimeout(r, 1200));
    try { ws.close(); } catch (e) {}
  }
  return res;
}

(async () => {
  const { srv, puerto } = await servir();
  const resultados = { etiqueta: ETIQUETA, chrome: path.basename(CHROME), escenarios: [] };
  const perfBase = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1v17-'));
  try {
    if (!SOLO || SOLO === 'carga-frio') {
      console.log('· carga-frio (perfil nuevo, sin caché)…');
      resultados.escenarios.push(await escenarioCarga(puerto, perfBase + '-frio', 'carga-frio', false));
      console.log('  ok=' + resultados.escenarios[resultados.escenarios.length - 1].okCarga + ' ' + JSON.stringify(resultados.escenarios[resultados.escenarios.length - 1].resumen || {}));
    }
    if (!SOLO || SOLO === 'carga-cache') {
      console.log('· carga-cache (mismo perfil, HTTP caché)…');
      const r = await escenarioCarga(puerto, perfBase + '-frio', 'carga-cache', true);
      resultados.escenarios.push(r);
      console.log('  ok=' + r.okCarga + ' ' + JSON.stringify(r.resumen || {}));
    }
    if (!SOLO || SOLO === 'vuelo') {
      console.log(`· vuelo Ciudad de los 36 (${DUR_VUELO} s)…`);
      const r = await escenarioVuelo(puerto, perfBase + '-vuelo');
      resultados.escenarios.push(r);
      console.log('  ' + JSON.stringify(r.vuelo || {}));
    }
  } finally {
    srv.close();
    for (const p of fs.readdirSync(os.tmpdir()).filter(x => x.startsWith('kimi1v17-'))) { try { fs.rmSync(path.join(os.tmpdir(), p), { recursive: true, force: true }); } catch (e) {} }
  }
  const out = path.join(SALIDA, `v17-${ETIQUETA}.json`);
  fs.writeFileSync(out, JSON.stringify(resultados, null, 1));
  console.log('DATOS ' + out);
  process.exit(0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
