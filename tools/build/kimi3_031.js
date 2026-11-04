#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-031: diagnóstico del peor cuadro (~3,8 s) en el escenario
   V17 de Kimi 1 (kimi1_v17.js --solo vuelo): semilla cap1 → teleport Ciudad de los 36 (-20,-133) +36 m
   → ST.alrededor() + ST.terminar() → vuelo circular. Aquí se entra con ?fases=1 y se devuelve, para los
   peores cuadros, la ventana de fases (update/ganchos/calentado/warm/dibujo) y los trabajos de streaming
   >25 ms (G.trabajosLentos) que caen dentro de ese cuadro.
   Salida: docs/img/kimi031/k031-<etiqueta>.json
   Uso: node tools/build/kimi3_031.js --etiqueta base [--secs 30] [--cpu 4] */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ETIQUETA = (() => { const i = process.argv.indexOf('--etiqueta'); return i > 0 ? process.argv[i + 1] : 'x'; })();
const CPU = parseFloat((() => { const i = process.argv.indexOf('--cpu'); return i > 0 ? process.argv[i + 1] : '4'; })(), 10);
const DUR_VUELO = parseInt((() => { const i = process.argv.indexOf('--secs'); return i > 0 ? process.argv[i + 1] : '30'; })(), 10);
const PERFIL = process.argv.includes('--perfil'); // CPU profile (CDP Profiler) del vuelo: atribuye los huecos entre cuadros
const ANCHO = 390, ALTO = 844, DPR = 3;
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi031');
fs.mkdirSync(SALIDA, { recursive: true });
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

// Misma semilla que kimi1_v17.js / kimi2_empezar.js (partida cap1 válida sin creador)
const SEMILLA_JS = `try {
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi3-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;

// Cuadros como [t, d] para correlacionar con __fases; heap cada 0,5 s; jugable.
const INIT_JS = `window.__k031 = { nav: Math.round(performance.now()), cuadros: [], heap: [], jugable: null, ml: null };
(function () {
  const v = window.__k031;
  try {
    let ult = performance.now();
    function tick(t) { v.cuadros.push([Math.round(t), Math.round(t - ult)]); ult = t; if (v.cuadros.length < 400000) requestAnimationFrame(tick); }
    requestAnimationFrame(tick);
  } catch (e) {}
  try { setInterval(() => { try { const m = performance.memory; v.heap.push([Math.round(performance.now()), m ? Math.round(m.usedJSHeapSize / 1048576 * 10) / 10 : 0]); } catch (e) {} }, 500); } catch (e) {}
  try {
    setInterval(() => {
      try {
        if (v.ml == null && window.AV && AV.G) {
          if (AV.G.mundo && AV.G.mundo.listo) { v.ml = 0; Promise.resolve(AV.G.mundo.listo).then(() => { v.ml = 1; }); }
          else if (AV.G.on) { v.ml = 0; AV.G.on('mundoListo', () => { v.ml = 1; }); }
        }
        if (v.jugable == null && window.AV && AV.G && AV.G.ui && AV.G.ui.worldHidden && !AV.G.ui.worldHidden()) {
          const st = (() => { try { return AV.G.renderer.stats(); } catch (e) { return null; } })();
          if (st && st.calls > 5) v.jugable = Math.round(performance.now());
        }
      } catch (e) {}
    }, 250);
  } catch (e) {}
})();`;

// Vuelo V17 (kimi1_v17.js) + marcas de fase: teleport → +36 m → alrededor → terminar → 1,5 s → círculo.
// Devuelve los peores cuadros con la ventana de fases y los trabajos lentos que caen dentro.
const VUELO_JS = `(async () => {
  const AV = window.AV, G = AV.G, S = G.S, ST = (G.mundo && G.mundo.streaming) || (G.streaming && G.streaming.gestor);
  if (!ST) return JSON.stringify({ error: 'sin streaming' });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const v = window.__k031;
  const tIni = performance.now();
  v.cuadros.length = 0; // ventana limpia: teleport en adelante
  let nLentos = 0; try { nLentos = (AV.G.trabajosLentos || []).length; } catch (e) {}
  AV.teleport(-20, -133);
  S.pos.y += 36; S.vy = 0; G.fisica.MOVE.flying = true;
  try { AV.debug.camYaw(Math.PI); } catch (e) {}
  await ST.alrededor(S.pos.x, S.pos.z);
  const tTer0 = performance.now();
  const valor = await ST.terminar({ topeMs: 30000 });
  const tTer1 = performance.now();
  await sleep(1500);
  const CX = -33, CZ = -136, R = 50, H = 36, T = ${DUR_VUELO};
  const t0 = performance.now();
  await new Promise(res => {
    function paso() {
      const t = (performance.now() - t0) / 1000;
      if (t >= T) return res();
      const a = (t / T) * Math.PI * 2 - Math.PI / 2;
      S.pos.x = CX + Math.cos(a) * R; S.pos.z = CZ + Math.sin(a) * R; S.pos.y = H + Math.sin(t * 0.4) * 3; S.vy = 0;
      G.fisica.MOVE.flying = true;
      try { AV.debug.camYaw(Math.atan2(Math.cos(a), Math.sin(a)) + Math.PI); } catch (e) {}
      requestAnimationFrame(paso);
    }
    paso();
  });
  const marcas = { tIni: Math.round(tIni), teleport: Math.round(tIni), terminar0: Math.round(tTer0), terminar1: Math.round(tTer1), vuelo0: Math.round(t0) };
  const st = (() => { try { return G.renderer.stats(); } catch (e) { return {}; } })();
  const ds = v.cuadros.map(c => c[1]).sort((a, b) => a - b);
  const q = p => (ds.length ? ds[Math.min(ds.length - 1, Math.floor(ds.length * p))] : null);
  // peores cuadros con su ventana de fases y trabajos lentos dentro
  const idx = v.cuadros.map((c, i) => i).sort((a, b) => v.cuadros[b][1] - v.cuadros[a][1]).slice(0, 10);
  const fasesAll = window.__fases || [];
  const lentosAll = (AV.G.trabajosLentos || []).slice(nLentos);
  const top = idx.map(i => {
    const c = v.cuadros[i];
    const tPrev = i > 0 ? v.cuadros[i - 1][0] : c[0] - c[1];
    return { t: c[0], ms: c[1],
      fases: fasesAll.filter(f => f[0] > tPrev - 5 && f[0] <= c[0] + 5).map(f => ({ t: f[0], upd: f[1], ganchos: f[2], calentado: f[3], warm: f[4], dibujo: f[5] })),
      lentos: lentosAll.filter(l => l.t >= tPrev - 5 && l.t <= c[0] + 5) };
  });
  return JSON.stringify({ marcas, nCuadros: ds.length, peorMs: q(1), p95Ms: q(0.95), p50Ms: q(0.5),
    fpsMed: ds.length ? Math.round(ds.length * 100000 / ds.reduce((a, b) => a + b, 0)) / 100 : null,
    calls: st.calls, ktris: st.triangulos != null ? Math.round(st.triangulos / 1000) : null, calidad: st.calidad,
    terminarMs: Math.round(tTer1 - tTer0), terminarTope: !!(valor && valor.tope), top,
    lentos: lentosAll.slice(0, 40), heapMax: v.heap.length ? Math.max.apply(null, v.heap.map(h => h[1])) : null,
    geo: (() => { try { return G.renderer.renderer.info.memory.geometries; } catch (e) { return null; } })(),
    tex: (() => { try { return G.renderer.renderer.info.memory.textures; } catch (e) { return null; } })(),
    prog: (() => { try { return G.renderer.renderer.info.programs.length; } catch (e) { return null; } })() });
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
async function matarChrome(chrome) {
  try { chrome.kill(); } catch (e) {}
  try { execSync(`taskkill /PID ${chrome.pid} /T /F 2>NUL`, { stdio: 'ignore' }); } catch (e) {}
}
// Atribución de self-time por función en una ventana del CPU profile (µs del reloj del propio perfil).
function resumirPerfil(p, desdeUs, hastaUs, tope) {
  const nodos = new Map(); for (const n of p.nodes || []) nodos.set(n.id, n);
  const key = n => { const f = n.callFrame || {}; return (f.functionName || '(anon)') + ' · ' + String(f.url || '').split('/').pop() + ':' + (f.lineNumber + 1); };
  const por = new Map(); let t = p.startTime || 0; let total = 0;
  const S = p.samples || [], D = p.timeDeltas || [];
  for (let i = 1; i < S.length; i++) {
    t += D[i] || 0;
    if (t < desdeUs || t > hastaUs) continue;
    const n = nodos.get(S[i - 1]); if (!n) continue;
    const k = key(n); por.set(k, (por.get(k) || 0) + (D[i] || 0)); total += D[i] || 0;
  }
  const top = [...por.entries()].sort((a, b) => b[1] - a[1]).slice(0, tope || 22)
    .map(([k, us]) => ({ ms: Math.round(us / 100) / 10, fn: k }));
  return { desdeUs, hastaUs, ventanaMs: Math.round(total / 100) / 10, top };
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

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3k031-'));
  const res = { escenario: 'k031-vuelo-ciudad', movil: { ancho: ANCHO, alto: ALTO, dpr: DPR, cpu: CPU, dur: DUR_VUELO, fases: true, flujo: 'semilla cap1 → portada → Aventura → teleport ciudad +36 m → terminar → círculo' } };
  let chromeL = null;
  try {
    chromeL = await lanzarChrome(perf);
    const ws = new WebSocket(`ws://127.0.0.1:${chromeL.puerto}${chromeL.wsPath}`);
    const cdp = new CDP(ws); await cdp.listo();
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
    await cdp.call('Network.enable', {}, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS + '\n' + INIT_JS }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
    // ?fases=1: el renderer anota update/ganchos/calentado/warm/dibujo por render()
    await cdp.call('Page.navigate', { url: origen + '/index.html?fases=1' }, ses);
    for (let i = 0; i < 120; i++) {
      await cdp.bombear(0.5);
      try {
        const hecho = await ev(cdp, ses, `(() => { const b = document.querySelector('[data-modo="aventura"]'); if (!b) return false; b.click(); return true; })()`, 5, false);
        if (hecho) break;
      } catch (e) {}
    }
    // espera jugable (mundoListo + mundo visible dibujando)
    let ok = false;
    const t0 = Date.now();
    while (Date.now() - t0 < 150000) {
      await cdp.bombear(0.5);
      try { const r = await ev(cdp, ses, `(() => { const v = window.__k031; return (v.ml === 1 && v.jugable != null) ? 1 : 0; })()`, 5, false); if (r === 1) { ok = true; break; } } catch (e) {}
    }
    res.okCarga = ok;
    if (ok) {
      await cdp.bombear(2);
      let pn0 = null;
      if (PERFIL) {
        await cdp.call('Profiler.enable', {}, ses);
        await cdp.call('Profiler.start', {}, ses);
        pn0 = await ev(cdp, ses, 'Math.round(performance.now())', 5, false);
      }
      const raw = await ev(cdp, ses, VUELO_JS, 120);
      res.vuelo = JSON.parse(raw);
      if (PERFIL) {
        const p = (await cdp.call('Profiler.stop', {}, ses, 90000)).profile;
        const pn1 = await ev(cdp, ses, 'Math.round(performance.now())', 5, false);
        // ancla: el perfil cubre [pn0, pn1] de performance.now(); el reloj del perfil es monotónico
        // distinto, así que se normaliza por duración total y se atribuye el tramo terminar+primer vuelo
        const durPn = Math.max(1, pn1 - pn0);
        const durP = Math.max(1, (p.endTime || 0) - (p.startTime || 0));
        const v = res.vuelo;
        const desdePn = (v.marcas.terminar0 - pn0), hastaPn = (v.marcas.vuelo0 - pn0) + Math.min(12000, DUR_VUELO * 1000);
        const f = (x) => (p.startTime || 0) + ((x / durPn) * durP);
        res.perfil = {
          pn0, pn1,
          terminar: resumirPerfil(p, f(Math.max(0, desdePn)), f(Math.min(durPn, v.marcas.terminar1 - pn0))),
          primerVuelo: resumirPerfil(p, f(Math.max(0, v.marcas.terminar1 - pn0)), f(Math.min(durPn, hastaPn))),
          total: resumirPerfil(p, p.startTime || 0, p.endTime || 0, 30)
        };
      }
      res.errores = erroresDe(cdp);
    }
  } catch (e) {
    res.error = e.message;
  } finally {
    if (chromeL) { await matarChrome(chromeL.chrome); await new Promise(r => setTimeout(r, 1200)); }
    srv.close();
  }
  fs.writeFileSync(path.join(SALIDA, `k031-${ETIQUETA}.json`), JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res.vuelo ? { peorMs: res.vuelo.peorMs, p95Ms: res.vuelo.p95Ms, p50Ms: res.vuelo.p50Ms, fpsMed: res.vuelo.fpsMed, terminarMs: res.vuelo.terminarMs, terminarTope: res.vuelo.terminarTope, calls: res.vuelo.calls, ktris: res.vuelo.ktris, calidad: res.vuelo.calidad, heapMax: res.vuelo.heapMax, geo: res.vuelo.geo, tex: res.vuelo.tex, prog: res.vuelo.prog, errores: res.errores } : res, null, 1));
  process.exit(res.error ? 1 : 0);
})();
