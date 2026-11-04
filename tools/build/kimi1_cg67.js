#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — CG-67: basura por cuadro en los módulos de juego.
   Chrome headless propio + CDP (sin librerías), móvil emulado 390×844 dpr 3 táctil, CPU ×4, GPU real,
   con --js-flags=--expose-gc para GC determinista dentro de la página.

   Dos fases con la partida sembrada (cap1, entra sin creador) en Villa Raíz:
     A · sampler de asignaciones de V8 (HeapProfiler) durante 30 s caminando por Villa Raíz:
         selfSize agregado por archivo de módulo (atribución = marco de módulo más interno de la pila).
     B · medición determinista por módulo: K pasos del `paso()` real entre lecturas de heap con gc()
         → basura/cuadro = (H1−H0−retenido)/K, mediana de R repeticiones. Aislada: todo el barrido
         ocurre dentro de UN evaluate síncrono (el bucle rAF del juego no interviene).

   Módulos (CG-67): trucos, humor, escondite, vecinos, sorpresas, marana, familia, retos_dia,
   comunidades, ciudad_viva.
   Salida: docs/img/kimi067/cg67-<etiqueta>.json
   Uso: node tools/build/kimi1_cg67.js --etiqueta r1 [--secs 30] [--k 2000] [--reps 3] */
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
const SECS = parseInt((() => { const i = process.argv.indexOf('--secs'); return i > 0 ? process.argv[i + 1] : '30'; })(), 10);
const K = parseInt((() => { const i = process.argv.indexOf('--k'); return i > 0 ? process.argv[i + 1] : '2000'; })(), 10);
const REPS = parseInt((() => { const i = process.argv.indexOf('--reps'); return i > 0 ? process.argv[i + 1] : '3'; })(), 10);
const CPU = parseFloat((() => { const i = process.argv.indexOf('--cpu'); return i > 0 ? process.argv[i + 1] : '4'; })(), 10);
const PRUEBAS = process.argv.indexOf('--pruebas') > 0;
const ANCHO = 390, ALTO = 844, DPR = 3;
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi067');
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

const SEMILLA_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.capitulo', '1');
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1cg67-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;

const INIT_JS = `window.__cg67 = { cuadros: 0, listo: false };
(function () {
  try {
    let ult = performance.now();
    function tick(t) { window.__cg67.cuadros++; ult = t; requestAnimationFrame(tick); }
    requestAnimationFrame(tick);
  } catch (e) {}
  try {
    const timer = setInterval(() => {
      try {
        if (window.AV && AV.G) {
          const G = AV.G;
          if (!window.__cg67.listo && G.mundo && G.ui && G.ui.worldHidden && !G.ui.worldHidden()) {
            const st = (() => { try { return G.renderer.stats(); } catch (e) { return null; } })();
            if (st && st.calls > 5) { window.__cg67.listo = true; clearInterval(timer); }
          }
        }
      } catch (e) {}
    }, 300);
  } catch (e) {}
})();`;

// A · paseo en dos zonas con el sampler activo: Villa Raíz (comunidades/vecinos) y Ciudad de los 36 (ciudad_viva).
const PASEO_SETUP_JS = `(async () => {
  const G = AV.G, S = G.S;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  window.__cg67.cuadros = 0;
  const CX = -8, CZ = -2.5, R = 12;
  const t0 = performance.now();
  let fin = null;
  (function paseo() {
    const t = (performance.now() - t0) / 1000;
    if (t >= ${SECS}) { fin = { segs: Math.round(t * 10) / 10, cuadros: window.__cg67.cuadros }; return; }
    if (t < ${SECS} * 0.4) {
      const a = (t / (${SECS} * 0.4)) * Math.PI * 2;
      S.pos.x = CX + Math.cos(a) * R; S.pos.z = CZ + Math.sin(a) * R; S.pos.y = 0; S.vy = 0;
      try { AV.debug.camYaw(Math.atan2(Math.cos(a), Math.sin(a)) + Math.PI); } catch (e) {}
    } else {
      const t2 = t - ${SECS} * 0.4, a = (t2 / (${SECS} * 0.6)) * Math.PI * 2;
      S.pos.x = -33 + Math.cos(a) * 20; S.pos.z = -136 + Math.sin(a) * 20; S.pos.y = 0; S.vy = 0;
      try { AV.debug.camYaw(Math.atan2(Math.cos(a), Math.sin(a)) + Math.PI); } catch (e) {}
    }
    requestAnimationFrame(paseo);
  })();
  while (!fin) await sleep(250);
  return fin;
})()`;

// Agregación del perfil de muestreo (en Node): selfSize por archivo de módulo,
// atribución = marco de módulo más interno de la pila.
const MODS = ['trucos', 'humor', 'escondite', 'vecinos', 'sorpresas', 'marana', 'familia', 'retos_dia', 'comunidades', 'ciudad_viva'];
function agregarPerfil(profile) {
  const por = {}, urlMod = u => { const m = u && u.match(/\/game\/(\w+)\.js/); return m && MODS.indexOf(m[1]) >= 0 ? m[1] : null; };
  let fuera = 0, total = 0;
  (function walk(n, modPila) {
    const mod = urlMod(n.callFrame && n.callFrame.url) || modPila;
    total += n.selfSize || 0;
    if (mod) { por[mod] = (por[mod] || 0) + (n.selfSize || 0); } else fuera += n.selfSize || 0;
    (n.children || []).forEach(c => walk(c, mod));
  })(profile.head, null);
  return { porMod: por, fueraDeMods: fuera, total, samples: (profile.samples || []).length };
}

// B · basura determinista por módulo: un evaluate síncrono con gc() (expuesto con --js-flags).
const MEDIR_MOD_JS = `(cfg => {
  const G = AV.G, S = G.S;
  const out = {};
  const mem = () => performance.memory.usedJSHeapSize;
  const MODS = {
    ciudad_viva: { api: () => G.ciudadViva, tick: a => { const n = a.paso(1 / 60); if (n) a.pintar(); }, antes: a => { try { a.prueba(true); } catch (e) {} }, despues: a => { try { a.prueba(false); } catch (e) {} } },
    comunidades: { api: () => G.comunidades, tick: a => { a.paso(1 / 60); a.pintar(); }, antes: a => { try { a.prueba(true); } catch (e) {} }, despues: a => { try { a.prueba(false); } catch (e) {} } },
    escondite: { api: () => G.escondite, tick: a => a.paso(1 / 60) },
    vecinos: { api: () => G.vecinos, tick: a => a.paso(1 / 60) },
    humor: { api: () => G.humor, tick: a => a.paso(1 / 60) },
    trucos: { api: () => G.trucos, tick: a => a.paso(1 / 60) },
    marana: { api: () => G.marana, tick: a => a.paso() },
    sorpresas: { api: () => G.sorpresas, tick: (a, i) => { S.pos.x += 0.2; S.pos.z += 0.05; a.paso(); } },
    familia: { api: () => G.familia, tick: a => a.paso(), antes: a => a.abrir(), despues: a => a.cerrar() }
  };
  for (const id of cfg.mods) {
    const m = MODS[id]; const o = { reps: [] };
    try {
      const api = m.api();
      if (!api) { o.error = 'sin API en G'; out[id] = o; continue; }
      if (m.antes) m.antes(api);
      for (let r = 0; r < cfg.reps; r++) {
        gc(); gc();
        const h0 = mem();
        const t0 = performance.now();
        for (let i = 0; i < cfg.k; i++) m.tick(api, i);
        const ms = Math.round((performance.now() - t0) / cfg.k * 10000) / 10; // ms/cuadro del tick
        const h1 = mem();
        gc(); gc();
        const h2 = mem();
        o.reps.push({ h0, h1, h2, msCuadro: ms });
      }
      if (m.despues) m.despues(api);
      const bas = o.reps.map(r => Math.max(0, (r.h1 - r.h0) - (r.h2 - r.h0)));
      const ret = o.reps.map(r => Math.max(0, r.h2 - r.h0));
      bas.sort((a, b) => a - b); ret.sort((a, b) => a - b);
      const med = a => a[Math.floor(a.length / 2)];
      o.basuraBporCuadro = Math.round(med(bas) / cfg.k * 100) / 100;
      o.retenidoBporBarrido = med(ret);
      o.msCuadro = Math.round(med(o.reps.map(r => r.msCuadro)) * 100) / 100;
      const abiertos = { ciudad_viva: () => G.ciudadViva.aves().length, vecinos: () => G.vecinos.estado().n };
      if (abiertos[id]) o.activos = abiertos[id]();
    } catch (e) { o.error = String(e && e.message || e).slice(0, 160); }
    out[id] = o;
  }
  return out;
})`;

const GPU_JS = `(() => { try { const gl = AV.G.renderer.renderer.getContext(); const ext = gl.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'sin debug_info'; } catch (e) { return 'n/d'; } })()`;

async function lanzarChrome(perf) {
  fs.mkdirSync(perf, { recursive: true });
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--enable-logging=stderr', '--v=0', '--window-size=500,900',
    '--js-flags=--expose-gc', 'about:blank'];
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
  try {
    const { execSync } = require('child_process');
    execSync(`taskkill /PID ${chrome.pid} /T /F 2>NUL`, { stdio: 'ignore' });
  } catch (e) {}
}

function erroresDe(cdp) {
  const out = [];
  for (const e of cdp.eventos) {
    if (e.method === 'Runtime.exceptionThrown') out.push('EXC ' + JSON.stringify(e.params.exceptionDetails.exception && e.params.exceptionDetails.exception.description || e.params.exceptionDetails.text).slice(0, 300));
    else if (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') out.push('console.error ' + (e.params.args || []).map(a => a.value != null ? String(a.value).slice(0, 200) : (a.description || '').slice(0, 200)).join(' '));
  }
  return out.slice(0, 20);
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const perfBase = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1cg67-'));
  const chromeL = await lanzarChrome(perfBase);
  const ws = new WebSocket(`ws://127.0.0.1:${chromeL.puerto}${chromeL.wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const res = { etiqueta: ETIQUETA, movil: { ancho: ANCHO, alto: ALTO, dpr: DPR, cpu: CPU, cap: 1, secsSampler: SECS, kFaseB: K, reps: REPS, flujo: 'portada → Aventura → Villa Raíz' } };
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'HeapProfiler.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS + '\n' + INIT_JS }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
    // Carga con un reintento: a veces el mundo no llega a jugable a la primera (QA-111, contención)
    let listo = false;
    for (let intento = 1; intento <= 2 && !listo; intento++) {
      res.intentos = intento;
      await cdp.call('Page.navigate', { url: origen + '/index.html' }, ses);
      let clic = false;
      for (let i = 0; i < 160 && !clic; i++) {
        await cdp.bombear(0.5);
        try {
          clic = await ev(cdp, ses, `(() => { const b = document.querySelector('[data-modo="aventura"]'); if (!b) return false; b.click(); return true; })()`, 5, false);
        } catch (e) { /* aún no */ }
      }
      res['clicAventura' + intento] = clic;
      const t0 = Date.now();
      while (Date.now() - t0 < 130000) {
        await cdp.bombear(0.5);
        try { if (await ev(cdp, ses, `window.__cg67 && window.__cg67.listo === true`, 5, false) === true) { listo = true; break; } } catch (e) {}
      }
    }
    res.okCarga = listo;
    if (!listo) throw new Error('el mundo no llegó a jugable en 2 intentos');
    res.gpu = await ev(cdp, ses, GPU_JS, 15);
    // Gesto real: los módulos de juego cargan al primer gesto (boot.js alPrimerGesto)
    await cdp.call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 420, id: 1 }] }, ses);
    await cdp.call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }, ses);
    // Esperar a que existan todas las API en G (ciudad_viva espera a bandada+residentes)
    const faltan = await ev(cdp, ses, `(async () => {
      const necesarios = ['ciudadViva', 'comunidades', 'vecinos', 'sorpresas', 'trucos', 'humor', 'escondite', 'marana', 'familia'];
      const t0 = performance.now();
      while (performance.now() - t0 < 60000) {
        const f = necesarios.filter(k => !(AV.G && AV.G[k]));
        if (!f.length) return [];
        await new Promise(r => setTimeout(r, 500));
      }
      return necesarios.filter(k => !(AV.G && AV.G[k]));
    })()`, 75);
    res.modulosSinCargar = faltan;
    await cdp.bombear(3); // asentar: ciudad_viva/vecinos/impostores activos cerca del spawn

    // ---- Fase A: sampler de asignaciones durante el paseo ----
    console.log('· fase A: sampler de asignaciones (' + SECS + ' s paseando por Villa Raíz)…');
    await cdp.call('HeapProfiler.startSampling', { samplingInterval: 16384 }, ses);
    const paseo = await ev(cdp, ses, PASEO_SETUP_JS, SECS + 30);
    const perfil = await cdp.call('HeapProfiler.stopSampling', {}, ses, 60000);
    res.faseA = { paseo, agg: agregarPerfil(perfil.profile || perfil) };

    // ---- Fase B: basura determinista por módulo (grupos por zona caliente) ----
    console.log('· fase B: ' + K + ' pasos × ' + REPS + ' reps por módulo (gc determinista)…');
    res.faseB = {};
    const TELE = `(x, z) => { try { AV.teleport(x, z); } catch (e) { AV.G.S.pos.x = x; AV.G.S.pos.z = z; } AV.G.S.pos.y = 0; }`;
    // Grupo villa: comunidades (Villa Raíz es sitio), vecinos (bajo=0 por diseño), y los de eventos
    await ev(cdp, ses, '(' + TELE + ')(-8, -2.5)', 15, false);
    await cdp.bombear(1.5);
    const modsVilla = ['comunidades', 'vecinos', 'escondite', 'humor', 'trucos', 'marana', 'sorpresas']; // familia sin paso por cuadro (UI por evento)
    res.faseB.villa = await ev(cdp, ses, '(' + MEDIR_MOD_JS + ')({ k: ' + K + ', reps: ' + REPS + ', mods: ' + JSON.stringify(modsVilla) + ' })', 600);
    // Grupo ciudad: ciudad_viva (las 4 cotorras de «bajo»)
    await ev(cdp, ses, '(' + TELE + ')(-33, -136)', 15, false);
    await cdp.bombear(1.5);
    res.faseB.ciudad = await ev(cdp, ses, '(' + MEDIR_MOD_JS + ')({ k: ' + K + ', reps: ' + REPS + ', mods: ["ciudad_viva"] })', 300);
    await ev(cdp, ses, '(' + TELE + ')(-8, -2.5)', 15, false);
    // ---- Pruebas de los módulos tocados (verificación de comportamiento) ----
    if (PRUEBAS) {
      console.log('· pruebas de módulos…');
      res.pruebas = await ev(cdp, ses, `(async () => {
        const lista = [['vecinosTest', 60], ['humorTest', 60], ['trucosTest', 90], ['esconditeTest', 60], ['maranaTest', 60], ['sorpresasTest', 90], ['comunidadesTest', 180], ['ciudadVivaTest', 300], ['familiaTest', 120]];
        const out = {};
        for (const [nombre, topeS] of lista) {
          try {
            const r = await Promise.race([AV[nombre](), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout ' + topeS + 's')), topeS * 1000))]);
            out[nombre] = r && typeof r.passed === 'number' ? r.passed + '/' + r.total : (r && r.results ? r.results.filter(x => x.ok).length + '/' + r.results.length : 'sin conteo');
          } catch (e) { out[nombre] = 'ERROR ' + String(e && e.message || e).slice(0, 80); }
        }
        return out;
      })()`, 900);
    }
    const st = await ev(cdp, ses, `(() => { const s = AV.G.renderer.stats(); return { calls: s.calls, ktris: s.triangulos != null ? Math.round(s.triangulos / 1000) : null, calidad: s.calidad, heapMB: Math.round(performance.memory.usedJSHeapSize / 1048576 * 10) / 10 }; })()`, 15, false);
    res.snapshotFinal = st;
    res.errores = erroresDe(cdp);
  } catch (e) { res.fallo = String(e.message || e).slice(0, 200); }
  finally {
    await matarChrome(chromeL.chrome);
    await new Promise(r => setTimeout(r, 1200));
    try { ws.close(); } catch (e) {}
    srv.close();
    for (const p of fs.readdirSync(os.tmpdir()).filter(x => x.startsWith('kimi1cg67-'))) { try { fs.rmSync(path.join(os.tmpdir(), p), { recursive: true, force: true }); } catch (e) {} }
  }
  const out = path.join(SALIDA, `cg67-${ETIQUETA}.json`);
  fs.writeFileSync(out, JSON.stringify(res, null, 1));
  console.log('DATOS ' + out);
  console.log(JSON.stringify(res.faseA && res.faseA.agg || {}, null, 1));
  console.log('villa: ' + JSON.stringify(res.faseB && res.faseB.villa || {}));
  console.log('ciudad: ' + JSON.stringify(res.faseB && res.faseB.ciudad || {}));
  console.log('pruebas: ' + JSON.stringify(res.pruebas || {}));
  if (res.fallo) { console.error('AVISO:', res.fallo); process.exit(2); }
  process.exit(0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
