#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-034: basura por cuadro del MOTOR en vuelo sostenido
   (CG-67 cubrió los módulos de juego; el motor —streaming.js/renderer.js en el bucle de cuadros y la
   cola— no se midió). Chrome headless propio + CDP (sin librerías), móvil 375×812 dpr 3 táctil con UA
   de iPhone, CPU ×4, GPU real, gc() determinista (--expose-gc).
   Escenario: asentar la Ciudad de los 36 ((-33,-136), +8 m — ST.terminar con tope), y volar un círculo
   de 55 m a +12 m durante SEGS s. Cada VENTANA_MS: gc,gc → h0 → volar → h1 → gc,gc → h2.
   basura = h1 − h2 (lo que el GC recoge), retenido = h2 − h0. Además HeapProfiler.startSampling durante
   todo el vuelo (selfSize por función; atribución a src/engine, src/game y resto).
   Salida: docs/img/kimi034/basura-<etiqueta>.json
   Uso: node tools/build/kimi3_basura.js --etiqueta r1 [--cpu 4] [--segundos 60] [--ventana 10] */
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
const ARG = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const ETIQUETA = ARG('etiqueta', 'r1');
const CPU = parseFloat(ARG('cpu', '4'), 10);
const SEGS = parseFloat(ARG('segundos', '60'), 10);
const VENTANA = parseFloat(ARG('ventana', '10'), 10);
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi034');
fs.mkdirSync(SALIDA, { recursive: true });
const QUIETO = process.argv.includes('--quieto'); // A/B: quedarse en el ancla sin volar (¿la basura es del movimiento?)
const CX = parseFloat(ARG('cx', '-33'), 10), CZ = parseFloat(ARG('cz', '-136'), 10); // centro del círculo de vuelo
const RADIO = parseFloat(ARG('radio', '55'), 10), ALT = parseFloat(ARG('altura', '12'), 10);
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
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.exception && r.exceptionDetails.exception.value || r.exceptionDetails.text).slice(0, 500));
  return r.result ? r.result.value : undefined;
}

// Volar el círculo (la ciudad ya está asentida en la fase 1); ventanas con gc determinista.
const PROBAR_JS = `(async () => {
  const AV = window.AV, G = AV.G, S = G.S, ST = (G.mundo && G.mundo.streaming) || (G.streaming && G.streaming.gestor);
  if (!ST) return JSON.stringify({ error: 'sin streaming' });
  if (typeof gc !== 'function') return JSON.stringify({ error: 'sin gc() — falta --expose-gc' });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const mem = () => performance.memory.usedJSHeapSize;
  const gc2 = () => { gc(); gc(); };
  const stats0 = (() => { try { return G.renderer.stats(); } catch (e) { return {}; } })();
  window.__frames = 0;
  const contar = () => { window.__frames++; requestAnimationFrame(contar); };
  requestAnimationFrame(contar);
  // paseo: círculo de RADIO m alrededor del centro a +ALT m, ~0,25 rad/s (--quieto: no se mueve)
  const t0 = performance.now();
  let volando = true;
  if (${QUIETO ? 'true' : 'false'}) {
    setTimeout(() => { volando = false; }, ${SEGS * 1000});
  } else {
  const paseo = () => {
    if (!volando) return;
    const t = (performance.now() - t0) / 1000;
    const a = t * 0.25;
    S.pos.x = ${CX} + Math.cos(a) * ${RADIO}; S.pos.z = ${CZ} + Math.sin(a) * ${RADIO}; S.pos.y = ${ALT}; S.vy = 0;
    try { AV.debug.camYaw(Math.atan2(Math.cos(a), Math.sin(a)) + Math.PI); } catch (e) {}
    requestAnimationFrame(paseo);
  };
  requestAnimationFrame(paseo);
  }
  const ventanas = [];
  const nV = Math.floor(${SEGS} / ${VENTANA});
  const solidosT = [];
  const muestreo = setInterval(() => {
    let st = null, escena = 0, edi = 0;
    try { st = G.solidos.stats(); } catch (e) {}
    try { (G.renderer.scene || G.scene).traverse(o => { if (o.isMesh) { escena++; if (/^edificios:/.test(o.name || '')) edi++; } }); } catch (e) {}
    solidosT.push({ t: Math.round((performance.now() - t0) / 1000), solidos: st, mallasEscena: escena, mallasEdificios: edi });
  }, 1000);
  for (let v = 0; v < nV; v++) {
    gc2();
    const h0 = mem(), f0 = window.__frames;
    await sleep(${VENTANA * 1000});
    const h1 = mem(), f1 = window.__frames;
    gc2();
    const h2 = mem();
    ventanas.push({ v, h0MB: +(h0 / 1048576).toFixed(1), basuraKB: Math.round((h1 - h2) / 1024),
      retenidoKB: Math.round((h2 - h0) / 1024), cuadros: f1 - f0 });
  }
  volando = false;
  clearInterval(muestreo);
  const st = (() => { try { return G.renderer.stats(); } catch (e) { return {}; } })();
  const heapFin = mem();
  return JSON.stringify({ ventanas, solidosT,
    cuadrosTotal: window.__frames, heapFinMB: +(heapFin / 1048576).toFixed(1),
    calls: st.calls, ktris: st.triangulos != null ? Math.round(st.triangulos / 1000) : null, calidad: st.calidad,
    stats0: { calls: stats0.calls, ktris: stats0.triangulos != null ? Math.round(stats0.triangulos / 1000) : null } });
})()`;

async function lanzarChrome() {
  let ultimo = '';
  for (let intento = 0; intento < 3; intento++) {
    try { return await lanzarChromeUnaVez(); } catch (e) { ultimo = e.message; await new Promise(r => setTimeout(r, 2500)); }
  }
  throw new Error(ultimo);
}
async function lanzarChromeUnaVez() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3b-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--js-flags=--expose-gc', '--window-size=500,900', 'about:blank'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'pipe', 'pipe'] });
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
  throw new Error('Chrome no abrió DevTools en 30 s');
}
function limpiarHuerfanos() {
  try {
    const ps = "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*kimi3b-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { /* seguir */ }
}
// Agregación del perfil de muestreo de asignaciones: selfSize por función y por archivo.
function agregarPerfil(profile) {
  const por = new Map(), porArch = new Map(); let total = 0;
  (function walk(n) {
    const f = (n.callFrame || {});
    const url = String(f.url || '').split('/').pop();
    const k = (f.functionName || '(anon)') + ' · ' + url + ':' + (f.lineNumber + 1);
    const b = n.selfSize || 0;
    if (b > 0) {
      por.set(k, (por.get(k) || 0) + b); total += b;
      const esMotor = /streaming|solidos|renderer|fisica|vegetacion|camara|assets|mundo|terreno|agua|fx|eventos|three\.min/.test(url);
      if (esMotor) porArch.set(url, (porArch.get(url) || 0) + b);
    }
    (n.children || []).forEach(walk);
  })(profile.head || { children: [] });
  const top = [...por.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([fn, b]) => ({ kb: Math.round(b / 1024), fn }));
  const porArchivo = [...porArch.entries()].sort((a, b) => b[1] - a[1]).map(([a, b]) => ({ kb: Math.round(b / 1024), arch: a }));
  return { totalKB: Math.round(total / 1024), top, porArchivo };
}

(async () => {
  limpiarHuerfanos();
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws);
  await cdp.listo();
  const res = { etiqueta: ETIQUETA, cuando: new Date().toISOString(), commit: execSync('git rev-parse --short HEAD', { cwd: RAIZ }).toString().trim(),
    movil: { ancho: 375, alto: 812, dpr: 3, cpu: CPU, gpu: 'PC real (ANGLE/D3D11)' }, escenario: { ancla: `(${CX},${CZ})`, vuelo: QUIETO ? 'quieto' : `círculo r=${RADIO} m a +${ALT} m, 0,25 rad/s`, segundos: SEGS, ventanaS: VENTANA } };
  console.log(`· móvil 375×812 dpr 3 · CPU ×${CPU} · vuelo ${SEGS} s (ventanas de ${VENTANA} s con gc) · KIMI-034 basura motor`);
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable', 'HeapProfiler.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 3, mobile: true }, ses);
    await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); sessionStorage.clear(); } catch (e){}" }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1` }, ses);
    const t0 = Date.now();
    let listo = false;
    while (Date.now() - t0 < CFG.espera_listo_s * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { /* aún no */ }
      await cdp.bombear(0.5);
    }
    if (!listo) throw new Error('el juego no arrancó');
    await cdp.bombear(2.0);
    console.log('· jugador nuevo: ' + await evaluar(cdp, ses, CFG.preparar_js, 300));
    // Fase 1: asentar la ciudad SIN sampler (el asentado domina el perfil y oculta el vuelo)
    const asiento = JSON.parse(await evaluar(cdp, ses, `(async () => {
      const AV = window.AV, G = AV.G, S = G.S, ST = (G.mundo && G.mundo.streaming) || (G.streaming && G.streaming.gestor);
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      AV.teleport(${CX}, ${CZ});
      S.pos.y += 8; S.vy = 0; G.fisica.MOVE.flying = true;
      try { AV.debug.camYaw(Math.PI); } catch (e) {}
      await ST.alrededor(S.pos.x, S.pos.z);
      await sleep(1500);
      const v = await ST.terminar({ topeMs: 25000 });
      await sleep(1200);
      return JSON.stringify({ tope: !!(v && v.tope), pos: Math.round(S.pos.x) + ',' + Math.round(S.pos.y) + ',' + Math.round(S.pos.z) });
    })()`, 90, true));
    console.log('· asiento: ' + JSON.stringify(asiento));
    // Sampler SOLO durante el vuelo (resolución fina)
    await cdp.call('HeapProfiler.startSampling', { samplingInterval: 8192 }, ses);
    const r = JSON.parse(await evaluar(cdp, ses, PROBAR_JS, SEGS + 60, true));
    const perfilM = agregarPerfil((await cdp.call('HeapProfiler.stopSampling', {}, ses, 90000)).profile);
    res.repro = r;
    res.perfilAsign = perfilM;
    const basuraTotal = r.ventanas.reduce((s, v) => s + v.basuraKB, 0);
    const cuadrosTotal = r.ventanas.reduce((s, v) => s + v.cuadros, 0);
    const retTotal = r.ventanas.reduce((s, v) => s + v.retenidoKB, 0);
    console.log(`· asentar: ${asiento.tope ? 'TOPE' : 'OK'} · ${r.calls} calls · ${r.ktris} k tris (asentado ${r.stats0.calls}/${r.stats0.ktris})`);
    for (const v of r.ventanas) console.log(`  · ventana ${v.v}: basura ${v.basuraKB} KB · retenido ${v.retenidoKB} KB · ${v.cuadros} cuadros (${v.cuadros ? Math.round(v.basuraKB / v.cuadros * 10) / 10 : 0} KB/cuadro)`);
    console.log(`· TOTAL: basura ${Math.round(basuraTotal)} KB en ${cuadrosTotal} cuadros = ${cuadrosTotal ? Math.round(basuraTotal / cuadrosTotal * 100) / 100 : 0} KB/cuadro · retenido neto ${Math.round(retTotal)} KB · heap fin ${r.heapFinMB} MB`);
    console.log(`· perfil de asignaciones del vuelo (selfSize, ${perfilM.totalKB} KB muestreados) — por archivo (motor):`);
    for (const a of (perfilM.porArchivo || []).slice(0, 12)) console.log(`    ${a.kb} KB · ${a.arch}`);
    console.log(`· top de funciones:`);
    for (const f of perfilM.top.slice(0, 15)) console.log(`    ${f.kb} KB · ${f.fn}`);
    const errores = await evaluar(cdp, ses, 'JSON.stringify((window.__aveErrores || []).slice(0, 8))', 10, false);
    res.errores = JSON.parse(errores || '[]');
    console.log('· errores de consola: ' + errores);
    try { await cdp.call('Target.closeTarget', { targetId: tid }, undefined, 10); } catch (e) { /* ya cerrado */ }
  } catch (e) {
    res.error = e && e.message || String(e);
    console.log('· FALLO: ' + res.error);
  }
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { chrome.kill(); }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { /* lo recoge el SO */ }
  srv.close();
  const ruta = path.join(SALIDA, `basura-${ETIQUETA}.json`);
  fs.writeFileSync(ruta, JSON.stringify(res, null, 2));
  console.log(`· resultado en ${ruta}`);
  process.exit(res.repro && !res.error ? 0 : 1);
})().catch(e => { console.error('FALLO:', e && e.stack || JSON.stringify(e) || String(e)); process.exit(2); });
