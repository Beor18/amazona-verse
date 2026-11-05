#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — QA-160: atribución de la retención intermitente de streaming
   («Sin fugas tras ir y volver dos veces» de streamingTest, BUGS.md QA-160).
   Enfoque: envolver ST.stats() para capturar un volcado completo del estado de streaming en CADA
   llamada (el test lo llama en m1 y m2 de la sección de fugas, y en los checks previos), correr el
   test REAL (AV.streamingTest) y comparar las dos últimas capturas (m1, m2): qué recursos quedan
   'listo' en m2, con cuántos refs y QUIÉN los retiene (zona n2 / ciudad / hd / Z.pre de prePedir).
   Chrome headless propio + CDP (sin librerías), móvil 375×812 dpr 3 táctil con UA de iPhone, CPU ×4, GPU real.
   Salida: docs/img/kimi160/qa160-<etiqueta>.json   Uso: node tools/build/kimi3_qa160.js --etiqueta r1 --rondas 4 */
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
const ETIQUETA = (() => { const i = process.argv.indexOf('--etiqueta'); return i > 0 ? process.argv[i + 1] : 'r1'; })();
const CPU = parseFloat((() => { const i = process.argv.indexOf('--cpu'); return i > 0 ? process.argv[i + 1] : '4'; })(), 10);
const RONDAS = parseInt((() => { const i = process.argv.indexOf('--rondas'); return i > 0 ? process.argv[i + 1] : '4'; })(), 10);
const FRESCO = process.argv.includes('--fresco'); // misma historia que el arnés oficial: sin asentado previo extra
const TRAZAR = process.argv.includes('--trazar'); // tracer entrada/salida (solo depuración de cuelgues; perturba el timing)
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi160');
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
  call(method, params, sessionId, timeoutMs) {
    const id = ++this.id;
    return new Promise((re, re2) => {
      this.pend.set(id, { re, re2 });
      this.ws.send(JSON.stringify({ id, method, params: params || {}, sessionId }));
      if (timeoutMs) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + method)); } }, timeoutMs);
    });
  }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function evaluar(cdp, ses, exp, timeoutS, promesa) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: promesa !== false, returnByValue: true }, ses, (timeoutS || 30) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.exception && r.exceptionDetails.exception.value || r.exceptionDetails.text).slice(0, 600));
  return r.result ? r.result.value : undefined;
}

// QA-160: envuelve ST.stats para capturar el volcado en cada llamada; corre AV.streamingTest() (el test real);
// las capturas m1/m2 de «Sin fugas» son snaps[-3]/snaps[-2] (la última es la ciudad aérea, que también llama stats).
// El MB por recurso se calcula UNA vez y se cachea (bGeo es caro a CPU ×4; la geometría no cambia en la vida del recurso).
const PROBAR_JS = `(async () => {
  const AV = window.AV, G = AV.G;
  const ST = (G.mundo && G.mundo.streaming) || (G.streaming && G.streaming.gestor);
  if (!ST) return JSON.stringify({ error: 'sin streaming' });
  window.__qa160p = ['inicio'];
  ${FRESCO ? '' : `const tZonas = performance.now();
  while (!Object.keys(ST.zonas).length && performance.now() - tZonas < 120000) await new Promise(r => setTimeout(r, 250));
  window.__qa160p.push('zonas ' + Object.keys(ST.zonas).length);
  if (G.mundo && G.mundo.listo) await G.mundo.listo;
  window.__qa160p.push('mundo.listo');
  await ST.listo; await ST.terminar();
  window.__qa160p.push('previo listo+terminar');`}
  const bGeo = g => { let b = 0; if (!g) return 0; const at = g.attributes; for (const k in at) if (at[k].array) b += at[k].array.byteLength; if (g.index) b += g.index.array.byteLength; return b; };
  const mbCache = {};
  const mbDe = r => { const k = r.n + ':' + r.t; if (!(k in mbCache)) { let mb = 0; if (r.partes) for (const p of r.partes) mb += bGeo(p.geo); if (r.geo) mb += bGeo(r.geo); mbCache[k] = Math.round(mb / 1024); } return mbCache[k]; };
  const snap = () => {
    const recursos = [];
    for (const n in ST.recursos) for (const t in ST.recursos[n]) {
      const r = ST.recursos[n][t]; if (r.estado === 'nada') continue;
      recursos.push({ n, t, e: r.estado, refs: r.refs, fijo: !!r.fijo, soltarEn: r.soltarEn ? 1 : 0, mb: mbDe(r) });
    }
    const zonas = [];
    for (const id in ST.zonas) { const Z = ST.zonas[id];
      zonas.push({ id, nivel: Z.nivel, ciudad: !!Z.ciudad, hd: !!Z.hd, d: Math.round(Z.d || 0), bajarPide: Z.bajarPide ? 1 : 0, hdBajar: Z.hdBajar ? 1 : 0, pre: Z.pre ? Object.keys(Z.pre) : [] }); }
    // Censo de geometrías de la ESCENA por nombre de malla (fusiones/lotes: la retención roja es +N geo GPU
    // fuera de kbGeometria: qa160-r12 three geo 332→345 con recursos/listos idénticos). Suma de bytes de atributos.
    const censo = {};
    try {
      G.renderer.scene.traverse(o => {
        if (!o.geometry) return;
        const nom = o.name || 'sinNombre';
        const e = censo[nom] = censo[nom] || { n: 0, kb: 0 };
        e.n++; e.kb += Math.round(bGeo(o.geometry) / 1024);
      });
    } catch (e) {}
    const info = G.renderer.renderer && G.renderer.renderer.info && G.renderer.renderer.info.memory ? { geo: G.renderer.renderer.info.memory.geometries, tex: G.renderer.renderer.info.memory.textures } : null;
    return { t: Math.round(performance.now()), heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576 * 10) / 10 : NaN, recursos, zonas, censo, info };
  };
  window.__qa160 = [];
  const origStats = ST.stats;
  ST.stats = function () { try { window.__qa160.push(snap()); } catch (e) {} return origStats.apply(this, arguments); };
  window.__qa160p.push('wrapper puesto');
  // trazador de funciones (opcional: perturba el timing, solo para depurar cuelgues)
  ${TRAZAR ? `const marca = m => { const p = window.__qa160p; if (p.length > 60) p.splice(0, 20); p.push(m); };
  const trazar = (obj, nom) => {
    const orig = obj[nom];
    if (typeof orig !== 'function') return;
    obj[nom] = function () {
      marca('→' + nom + ' ' + Math.round(performance.now()));
      let r;
      try { r = orig.apply(this, arguments); }
      catch (e) { marca('←' + nom + ' THROW'); throw e; }
      if (r && typeof r.then === 'function') return r.then(v => { marca('←' + nom); return v; },
        e => { marca('←' + nom + ' REJ'); throw e; });
      marca('←' + nom);
      return r;
    };
  };
  try {
    trazar(ST, 'terminar'); trazar(ST, 'alrededor'); trazar(ST, 'revisar'); trazar(ST, 'liberarYa'); trazar(ST, 'soltarTodo');
    trazar(G.renderer, 'render'); trazar(G.renderer, 'update'); trazar(G.camara, 'place');
  } catch (e) { marca('trazar err ' + e); }` : ''}
  let resTest = null, errorTest = null;
  try { resTest = await AV.streamingTest(); } catch (e) { errorTest = String(e && e.message || e); }
  window.__qa160p.push('test devuelto ' + (resTest ? resTest.passed + '/' + resTest.total : 'null') + (errorTest ? ' err:' + errorTest : ''));
  try { ST.stats = origStats; } catch (e) {}
  const snaps = window.__qa160 || [];
  const sinFugas = resTest && resTest.results ? resTest.results.filter(c => /Sin fugas/.test(c.name)).map(c => ({ ok: c.ok, extra: c.extra })) : null;
  if (snaps.length < 3) return JSON.stringify({ error: 'pocas capturas: ' + snaps.length, errorTest, sinFugas, passed: resTest && resTest.passed, total: resTest && resTest.total });
  // OJO: tras la sección de fugas (foto m1/m2) el test sigue y llama ST.stats() una vez más en la ciudad aérea
  // (seC). Las dos últimas capturas serían m2 y seC: m1/m2 de «Sin fugas» son snaps[-3] y snaps[-2].
  const m1 = snaps[snaps.length - 3], m2 = snaps[snaps.length - 2], seC = snaps[snaps.length - 1];
  // dueños estructurales en m2 (las zonas vivas se leen ahora; nivel/ciudad/hd/pre congelados en el snap)
  const dueños = {};
  for (const z of m2.zonas) {
    const Z2 = ST.zonas[z.id];
    if (!Z2) continue;
    for (const n of Z2.modelos) {
      if (z.nivel === 2 || z.ciudad) { const k = n + ':cerca'; (dueños[k] = dueños[k] || []).push(z.id + (z.ciudad ? '(ciudad)' : '(n2)')); }
      if (z.hd) { const k = n + ':hd'; (dueños[k] = dueños[k] || []).push(z.id + '(hd)'); }
      if (z.nivel >= 1) { const k = n + ':lejos'; (dueños[k] = dueños[k] || []).push(z.id + '(n1)'); }
    }
    if (z.pre) for (const k of z.pre) { const i = k.indexOf(':'), tipo = k.slice(0, i), nn = k.slice(i + 1); const kk = nn + ':' + tipo; (dueños[kk] = dueños[kk] || []).push(z.id + '(pre)'); }
  }
  const listosM1 = {}, listosM2 = [];
  for (const r of m1.recursos) if (r.e === 'listo') listosM1[r.n + ':' + r.t] = r;
  for (const r of m2.recursos) if (r.e === 'listo') listosM2.push(r);
  const nuevos = listosM2.filter(r => !listosM1[r.n + ':' + r.t])
    .map(r => ({ n: r.n, t: r.t, refs: r.refs, mb: r.mb, soltarEn: r.soltarEn, fijo: r.fijo, dueños: dueños[r.n + ':' + r.t] || [] }))
    .sort((a, b) => b.mb - a.mb);
  const kb = s => { let b = 0; for (const r of s.recursos) if (r.e === 'listo') b += r.mb; return b; };
  // diff de censo de escena m1→m2: qué mallas de fusión/lote NUEVAS quedaron vivas (nombre → Δn/Δkb)
  const nuevasGeo = [];
  { const c1 = m1.censo || {}, c2 = m2.censo || {};
    for (const nom in c2) {
      const a = c1[nom] || { n: 0, kb: 0 };
      if (c2[nom].n > a.n || c2[nom].kb > a.kb) nuevasGeo.push({ nom, dn: c2[nom].n - a.n, dkb: c2[nom].kb - a.kb, n2: c2[nom].n, kb2: c2[nom].kb });
    }
    nuevasGeo.sort((a, b) => b.dkb - a.dkb); }
  return JSON.stringify({
    errorTest, sinFugas, passed: resTest && resTest.passed, total: resTest && resTest.total,
    hitos: window.__qa160p,
    heapM1: m1.heap, heapM2: m2.heap, kbM1: kb(m1), kbM2: kb(m2),
    nListosM1: Object.keys(listosM1).length, nListosM2: listosM2.length,
    nuevos: nuevos.slice(0, 50), nuevasGeo: nuevasGeo.slice(0, 60),
    infoM1: m1.info, infoM2: m2.info,
    zonasM2: m2.zonas,
    m1: { t: m1.t, heap: m1.heap, recursos: m1.recursos, zonas: m1.zonas },
    m2: { t: m2.t, heap: m2.heap, recursos: m2.recursos, zonas: m2.zonas },
    snaps: snaps.length,
    ultimas3: [m1, m2, seC].map(s => ({ t: s.t, heap: s.heap, n: s.recursos.length, kb: kb(s), info: s.info })),
  });
})()`;

// QA-111 · semilla de partida válida de cap1 (la misma que kimi2_empezar.js): Jugar entra directo al mundo,
// sin creador — más rápido y con la misma historia de estado que el repro original de QA-160.
const SEMILLA_SAVE_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  window.__qa160err = [];
  window.addEventListener('error', e => { try { window.__qa160err.push('err: ' + String((e.error && e.error.stack) || e.message || e)); } catch (_) {} });
  window.addEventListener('unhandledrejection', e => { try { window.__qa160err.push('rej: ' + String((e.reason && e.reason.stack) || e.reason)); } catch (_) {} });
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi3q160-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;
const PREPARAR_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene el botón Jugar'; b.click();
    if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta tras Jugar'; }
  const cr = $('creator');
  if (cr && !cr.hidden) { await espera(() => $('p-stage-status') && $('p-stage-status').hidden, 30000); const s = $('p-save'); if (!s) return 'el creador no tiene Empezar (#p-save)';
    s.click(); if (!await espera(() => cr.hidden, 8000)) return 'Empezar no cerró el creador: ' + (($('p-error') && !$('p-error').hidden && $('p-error').textContent) || 'sin mensaje'); }
  const S = window.AV && window.AV.state; if (!S || !S.profile || !S.profile.created) return 'sin perfil creado tras entrar';
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(30000);
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 20000);
  return 'ok: partida sembrada → Jugar (' + S.profile.name + ')'; })()`;

async function lanzarChromeUnaVez() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3q160-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--enable-logging=stderr', '--v=0', '--js-flags=--expose-gc',
    '--window-size=500,900', 'about:blank'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let err = '';
  chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    if (fs.existsSync(puertoFile)) {
      const l = fs.readFileSync(puertoFile, 'utf8').split('\n');
      const puerto = parseInt(l[0], 10), wsPath = (l[1] || '').trim();
      if (puerto > 0 && wsPath) return { chrome, perf, puerto, wsPath };
    }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('Chrome no abrió DevTools en 30 s: ' + err.slice(0, 300));
}
async function lanzarChrome() {
  let ultimo = '';
  for (let intento = 0; intento < 3; intento++) {
    try { return await lanzarChromeUnaVez(); } catch (e) { ultimo = e.message; await new Promise(r => setTimeout(r, 2500)); }
  }
  throw new Error(ultimo);
}
function limpiarHuerfanos() {
  try {
    const ps = "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*kimi3q160-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { /* seguir */ }
}

(async () => {
  limpiarHuerfanos();
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const res = { etiqueta: ETIQUETA, cuando: new Date().toISOString(), cpu: CPU, rondas: RONDAS, movil: { ancho: 375, alto: 812, dpr: 3, gpu: 'PC real (ANGLE/D3D11)' }, corridas: [] };
  for (let ronda = 0; ronda < RONDAS; ronda++) {
    const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
    const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
    const cdp = new CDP(ws);
    await cdp.listo();
    console.log(`— corrida ${ronda + 1}/${RONDAS} · móvil 375×812 dpr 3 · CPU ×${CPU}`);
    try {
      const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
      const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
      for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
      await cdp.call('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 3, mobile: true }, ses);
      await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
      await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
      await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
      await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
      await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1` }, ses);
      const t0 = Date.now();
      let listo = false;
      while (Date.now() - t0 < CFG.espera_listo_s * 1000) {
        try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { /* aún no */ }
        await cdp.bombear(0.5);
      }
      if (!listo) throw new Error('el juego no arrancó');
      await cdp.bombear(2.0);
      console.log('  · entrada: ' + await evaluar(cdp, ses, PREPARAR_JS, 300));
      // progreso: el wrapper acumula una captura por cada ST.stats() del test (11 en total: 4 yaw, 2 medio,
      // 2 bajo, m1, m2, ciudad aérea). Si el test se atasca, esto dice en qué stats-call quedó.
      const progreso = setInterval(async () => {
        try {
          const p = await evaluar(cdp, ses, `JSON.stringify({p: (window.__qa160p || []).slice(-3), n: (window.__qa160 || []).length, err: (window.__qa160err || []).slice(-3),
            sinColocar: (() => { try { const G = window.AV.G, ST = (G.mundo && G.mundo.streaming) || (G.streaming && G.streaming.gestor);
              const out = { nadaConPromesa: [], colaRefs0: [] };
              for (const n in ST.recursos) for (const t in ST.recursos[n]) {
                const r = ST.recursos[n][t];
                if (r.estado === 'nada' && r.promesa) out.nadaConPromesa.push(n + ':' + t);
                if (r.estado === 'cola' && !r.refs && !r.fijo) out.colaRefs0.push(n + ':' + t);
              }
              out.nadaConPromesa = out.nadaConPromesa.slice(0, 10); out.colaRefs0 = out.colaRefs0.slice(0, 10); return out; } catch (e) { return String(e && e.message || e); } })(),
            diag: (() => { try { const G = window.AV.G, ST = (G.mundo && G.mundo.streaming) || (G.streaming && G.streaming.gestor);
              const d = ST._diag ? ST._diag() : null; if (!d) return null;
              return { enVuelo: d.enVuelo, quieto: d.quieto, cola: d.cola.length, trabajos: d.trabajos.length,
                colaPrimeras: d.cola.slice(0, 5).map(c => c.tipo + ':' + c.n + ' ' + c.estado + ' p' + c.prio + ' r' + c.refs),
                trabPrimeros: d.trabajos.slice(0, 6) }; } catch (e) { return String(e && e.message || e); } })() })`, 20, false);
          console.log(`  · …progreso ${p}`);
        } catch (e) { /* la página ocupada */ }
      }, 25000);
      let r;
      try { r = JSON.parse(await evaluar(cdp, ses, PROBAR_JS, 900, true)); }
      finally { clearInterval(progreso); }
      res.corridas.push(r);
      if (r.error) console.log('  · ERROR: ' + r.error + (r.errorTest ? ' · test: ' + r.errorTest : ''));
      else {
        const sf = (r.sinFugas || [])[0];
        console.log(`  · test ${r.passed}/${r.total} · Sin fugas: ${sf ? (sf.ok ? 'VERDE' : 'ROJO') + ' — ' + sf.extra : 'no encontrado'}` +
          ` · listos ${r.nListosM1}→${r.nListosM2} · heap ${r.heapM1}→${r.heapM2} MB · snaps=${r.snaps}`);
        if (r.nuevos && r.nuevos.length) {
          console.log('  · NUEVOS listos en m2 (top MB):');
          for (const x of r.nuevos.slice(0, 15)) console.log(`      ${x.n}:${x.t} r${x.refs} ${x.mb}KB soltarEn=${x.soltarEn} dueños=[${(x.dueños || []).join('|')}]`);
        } else console.log('  · sin recursos nuevos en m2');
        if (r.nuevasGeo && r.nuevasGeo.length) {
          console.log('  · GEOMETRÍAS NUEVAS en escena m2 (top KB):');
          for (const x of r.nuevasGeo.slice(0, 15)) console.log(`      ${x.nom} Δn=${x.dn} Δkb=${x.dkb} (n=${x.n2} kb=${x.kb2})`);
        } else console.log('  · sin geometrías nuevas en escena m2');
      }
      try { await cdp.call('Target.closeTarget', { targetId: tid }, undefined, 10); } catch (e) { /* ya cerrado */ }
    } catch (e) {
      res.corridas.push({ error: e && e.message || String(e) });
      console.log('  · ERROR: ' + (e && e.message || e));
    }
    try { chrome.kill(); } catch (e) { /* seguir */ }
    await cdp.bombear(1.5);
  }
  srv.close();
  const out = path.join(SALIDA, `qa160-${ETIQUETA}.json`);
  fs.writeFileSync(out, JSON.stringify(res, null, 1));
  console.log('· evidencia: ' + out);
  const rojas = res.corridas.filter(c => c.sinFugas && c.sinFugas.length && !c.sinFugas[0].ok).length;
  console.log(`· veredicto: ${rojas}/${res.corridas.length} corridas con Sin fugas en rojo`);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
