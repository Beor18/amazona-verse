#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-040 / QA-158: prueba de resistencia de vuelo largo en perfil iPhone.
   Chrome headless propio + CDP (sin librerías), 390×844 dpr 3 táctil con UA de iPhone, CPU ×4, GPU real, calidad «bajo».
   Entrada: partida sembrada de cap1 (sin creador) → portada → Aventura → salto de intro → vuelo continuo de --mins min
   (villa ⇄ plaza ⇄ Ciudad de los 36) a ~17 m/s, con heap de JS y memoria del renderer (geometrías/texturas/programas)
   cada 30 s. Falla (exit 1) si el heap o las texturas crecen sin parar (tendencia por mínimos cuadrados, no picos):
   es la herramienta con la que Kimi 2 demostrará el arreglo de QA-158 (la curva de HEAD se sube a BUGS.md).
   Salida: docs/img/kimi158/qa158-<etiqueta>.json
   Uso: node tools/build/kimi3_qa158.js --etiqueta head-r1 [--mins 10] [--vel 17] [--cpu 4] */
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
const MINS = parseFloat((() => { const i = process.argv.indexOf('--mins'); return i > 0 ? process.argv[i + 1] : '10'; })(), 10);
const VEL = parseFloat((() => { const i = process.argv.indexOf('--vel'); return i > 0 ? process.argv[i + 1] : '17'; })(), 10);
const CPU = parseFloat((() => { const i = process.argv.indexOf('--cpu'); return i > 0 ? process.argv[i + 1] : '4'; })(), 10);
const MUESTRA_S = 30, ALTURA = 26; // vuelo a height(terreno)+ALTURA m (KIMI-023: a 22–30 m la cámara acababa en copas de palma)
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi158');
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
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.exception && r.exceptionDetails.exception.value || r.exceptionDetails.text).slice(0, 500));
  return r.result ? r.result.value : undefined;
}

// Semilla de cap1 (jugador existente: entra sin creador) — misma base que kimi1_032.js
const SEMILLA_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.capitulo', '1');
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

// Arranque del vuelo largo + muestreo cada 30 s. Todo en try/catch: un throw no debe tumbar la instrumentación.
// window.__qa158 queda vivo en la página; el nodo lo releva por polling (si la pestaña muere, el poll lo detecta).
const VUELO_JS = `(async () => {
  const AV = window.AV, G = AV.G, S = G.S;
  const ST = (G.mundo && G.mundo.streaming) || (G.streaming && G.streaming.gestor);
  if (!ST) return 'sin streaming';
  const RUTA = [ { n: 'villa', x: 150, z: 203 }, { n: 'plaza', x: 145.5, z: 178.5 }, { n: 'ciudad', x: -33, z: -136 } ];
  const v = window.__qa158 = { t0: Math.round(performance.now()), muestras: [], ctxPerdidos: 0, ctxRecuperados: 0, errores: [], listo: false };
  try { G.on('contexto', ok => { if (ok) v.ctxRecuperados++; else v.ctxPerdidos++; }); } catch (e) {}
  try { const c = G.renderer.renderer && G.renderer.renderer.domElement; if (c) c.addEventListener('webglcontextlost', () => v.ctxPerdidos++); } catch (e) {}
  const altura = (x, z) => { try { const h = AV.debug.height(x, z); return isFinite(h) ? h : 8; } catch (e) { return 8; } };
  G.fisica.MOVE.flying = true;
  let wp = 0;
  v.tick = setInterval(() => {
    try {
      const paso = ${VEL} * 0.25; // tick de 250 ms
      const dx = RUTA[wp].x - S.pos.x, dz = RUTA[wp].z - S.pos.z, d = Math.hypot(dx, dz);
      if (d < Math.max(25, paso)) { wp = (wp + 1) % RUTA.length; return; }
      S.pos.x += dx / d * paso; S.pos.z += dz / d * paso;
      S.pos.y = Math.max(altura(S.pos.x, S.pos.z) + ${ALTURA}, 8); S.vy = 0;
      try { AV.debug.camYaw(Math.atan2(dx, dz)); } catch (e) {}
      G.fisica.MOVE.flying = true;
    } catch (e) {}
  }, 250);
  const memRend = () => { try { const i = G.renderer.renderer.info; return { geo: i.memory.geometries, tex: i.memory.textures, prog: i.programs ? i.programs.length : 0 }; } catch (e) { return { geo: null, tex: null, prog: null }; } };
  const muestra = () => {
    try {
      const m = performance.memory, st = (() => { try { return G.renderer.stats(); } catch (e) { return {}; } })();
      let trans = null; try { trans = G.streaming && G.streaming.transiciones ? G.streaming.transiciones() : null; } catch (e) {}
      v.muestras.push({ t: Math.round((performance.now() - v.t0) / 1000),
        heap: m ? Math.round(m.usedJSHeapSize / 1048576) : null, heapTotal: m ? Math.round(m.totalJSHeapSize / 1048576) : null,
        rend: memRend(), calls: st.calls != null ? st.calls : null, ktris: st.triangulos != null ? Math.round(st.triangulos / 1000) : null,
        fps: st.fps != null ? st.fps : null, calidad: st.calidad != null ? st.calidad : null,
        pos: [Math.round(S.pos.x), Math.round(S.pos.y), Math.round(S.pos.z)], hacia: RUTA[wp].n, trans });
    } catch (e) {}
  };
  muestra(); // t=0
  v.muestreo = setInterval(muestra, ${MUESTRA_S * 1000});
  v.listo = true;
  return 'ok: vuelo largo arrancado (' + RUTA.map(r => r.n).join(' → ') + ')';
})()`;

async function lanzarChrome() {
  let ultimo = '';
  for (let intento = 0; intento < 3; intento++) {
    try { return await lanzarChromeUnaVez(); } catch (e) { ultimo = e.message; await new Promise(r => setTimeout(r, 2500)); }
  }
  throw new Error(ultimo);
}
async function lanzarChromeUnaVez() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3q158-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--enable-logging=stderr', '--v=0',
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
function limpiarHuerfanos() {
  try {
    const ps = "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*kimi3q158-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { /* seguir */ }
}
function matarChrome(chrome) {
  try { chrome.kill(); } catch (e) {}
  try { execSync(`taskkill /PID ${chrome.pid} /T /F 2>NUL`, { stdio: 'ignore' }); } catch (e) {}
}
// pendiente (MB/min) por mínimos cuadrados sobre las muestras con dato; falla por tendencia, no por picos
function pendiente(pts) {
  const p = pts.filter(q => q != null);
  const n = p.length; if (n < 3) return null;
  const xs = pts.map((q, i) => q != null ? i * MUESTRA_S / 60 : null).filter(x => x != null);
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = p.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (p[i] - my); den += (xs[i] - mx) * (xs[i] - mx); }
  return den ? +(num / den).toFixed(2) : null;
}

(async () => {
  limpiarHuerfanos();
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws);
  await cdp.listo();
  const res = { etiqueta: ETIQUETA, cuando: new Date().toISOString(), mins: MINS, vel: VEL,
    movil: { ancho: 390, alto: 844, dpr: 3, cpu: CPU, gpu: 'PC real (ANGLE/D3D11)', calidad: 'bajo' }, muestra_s: MUESTRA_S };
  console.log(`· KIMI-040/QA-158 · móvil 390×844 dpr 3 · CPU ×${CPU} · calidad bajo · vuelo ${MINS} min a ${VEL} m/s · muestra cada ${MUESTRA_S} s`);
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }, ses);
    await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1&calidad=bajo` }, ses);
    // portada → tarjeta Aventura (la partida sembrada entra sin creador)
    let clicado = false;
    for (let i = 0; i < 150 && !clicado; i++) {
      await cdp.bombear(0.5);
      try { clicado = !!(await evaluar(cdp, ses, `(() => { const b = document.querySelector('[data-modo="aventura"]'); if (!b) return false; b.click(); return true; })()`, 5, false)); } catch (e) { /* aún no */ }
    }
    if (!clicado) throw new Error('no apareció la tarjeta Aventura');
    let jugable = false;
    for (let i = 0; i < 240 && !jugable; i++) {
      await cdp.bombear(0.5);
      try { jugable = !!(await evaluar(cdp, ses, `(() => { const G = window.AV && AV.G; if (!G || !G.ui || G.ui.worldHidden()) return false; const st = (() => { try { return G.renderer.stats(); } catch (e) { return null; } })(); return st && st.calls > 5; })()`, 5, false)); } catch (e) { /* aún no */ }
    }
    if (!jugable) throw new Error('el mundo no llegó a jugable');
    console.log('· entrada: Aventura pulsada y mundo jugable');
    console.log('· intro: ' + await evaluar(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)); for (let i = 0; i < 200; i++) { const b = document.getElementById('c1-saltar'); if (b && b.isConnected) { b.click(); return 'saltada (botón)'; } await sleep(100); } return 'sin botón (¿ya terminó?)'; })()`, 40, true));
    await cdp.bombear(1.5);
    // la intro también se salta con cualquier tecla (content/cap1/pruebas.js): por si el botón aún no salió
    console.log('· tecla: ' + await evaluar(cdp, ses, `(() => { try { for (const t of ['keydown', 'keyup']) window.dispatchEvent(new KeyboardEvent(t, { key: ' ', bubbles: true })); return 'enviada'; } catch (e) { return 'no: ' + e.message; } })()`, 10, false));
    await cdp.bombear(1.0);
    console.log('· calidad: ' + await evaluar(cdp, ses, `(() => { const R = AV.G.renderer; if (R.calidad) R.calidad.manual = true; if (R.setCalidad) R.setCalidad('bajo'); return R.calidad && R.calidad.nivel; })()`, 15, false));
    console.log('· arranque: ' + await evaluar(cdp, ses, VUELO_JS, 30, true));

    // vuelo largo: el nodo solo vigila por polling; la página mueve a Vittata y muestrea sola
    const totalS = MINS * 60, t0 = Date.now();
    let caidas = 0, maxMuestras = 0, ultima = null;
    while (Date.now() - t0 < totalS * 1000) {
      await cdp.bombear(5);
      let vivo = null;
      try { vivo = JSON.parse(await evaluar(cdp, ses, `JSON.stringify((() => { const v = window.__qa158; if (!v) return null; return { n: v.muestras.length, ultima: v.muestras[v.muestras.length - 1] || null, ctx: [v.ctxPerdidos, v.ctxRecuperados], listo: v.listo }; })())`, 10, false)); } catch (e) { vivo = null; }
      if (!vivo) { caidas++; if (caidas >= 3) { res.caidaPagina = true; console.log('· la página dejó de responder (3 polls fallidos) — ¿contexto perdido sin recuperación o recarga?'); break; } continue; }
      caidas = 0;
      if (vivo.ultima && (!ultima || vivo.ultima.t !== ultima.t)) {
        ultima = vivo.ultima;
        console.log(`  · t=${String(ultima.t).padStart(4)}s heap ${String(ultima.heap).padStart(5)} MB · geo ${String(ultima.rend.geo).padStart(4)} · tex ${String(ultima.rend.tex).padStart(4)} · prog ${String(ultima.rend.prog).padStart(3)} · ${String(ultima.calls).padStart(3)} calls · ${String(ultima.ktris).padStart(4)} k tris · fps ${String(ultima.fps).padStart(3)} · pos ${ultima.pos} → ${ultima.hacia} · ctx ${vivo.ctx[0]}/${vivo.ctx[1]}${ultima.trans ? ' · trans n' + ultima.trans.nivel + '/hd' + ultima.trans.hd : ''}`);
      }
      maxMuestras = Math.max(maxMuestras, vivo.n);
    }
    // curva completa + errores de consola
    const curva = await evaluar(cdp, ses, `JSON.stringify((() => { const v = window.__qa158; if (!v) return null; clearInterval(v.tick); clearInterval(v.muestreo); return { muestras: v.muestras, ctxPerdidos: v.ctxPerdidos, ctxRecuperados: v.ctxRecuperados }; })())`, 15, false).then(s => s ? JSON.parse(s) : null).catch(() => null);
    if (curva) { res.curva = curva; res.muestras = curva.muestras.length; }
    const errores = await evaluar(cdp, ses, 'JSON.stringify((window.__aveErrores || []).slice(0, 8))', 10, false).catch(() => '[]');
    res.errores = JSON.parse(errores || '[]');
    console.log('· errores de consola: ' + errores);

    if (curva && curva.muestras.length >= 3) {
      const hs = pendiente(curva.muestras.map(m => m.heap));
      const ts = pendiente(curva.muestras.map(m => m.rend && m.rend.tex));
      const gs = pendiente(curva.muestras.map(m => m.rend && m.rend.geo));
      const primero = curva.muestras[0], ultimo = curva.muestras[curva.muestras.length - 1];
      res.tendencia = { heapMBmin: hs, texMin: ts, geoMin: gs };
      res.veredicto = { creceSinParar: !!(hs != null && hs > 5) || !!(ts != null && ts > 10), heapPrimero: primero.heap, heapUltimo: ultimo.heap, texPrimero: primero.rend.tex, texUltimo: ultimo.rend.tex };
      console.log(`· tendencia — heap ${hs != null ? (hs > 0 ? '+' : '') + hs + ' MB/min' : 'n/d'} · texturas ${ts != null ? (ts > 0 ? '+' : '') + ts + '/min' : 'n/d'} · geometrías ${gs != null ? (gs > 0 ? '+' : '') + gs + '/min' : 'n/d'}`);
      console.log(`· heap ${primero.heap} → ${ultimo.heap} MB · tex ${primero.rend.tex} → ${ultimo.rend.tex} · geo ${primero.rend.geo} → ${ultimo.rend.geo} · ctx perdidos ${curva.ctxPerdidos} / recuperados ${curva.ctxRecuperados}`);
    }
    try { await cdp.call('Target.closeTarget', { targetId: tid }, undefined, 10); } catch (e) { /* ya cerrado */ }
  } catch (e) {
    res.error = e && e.message || String(e);
    console.log('· FALLO: ' + res.error);
  }
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { matarChrome(chrome); }
  srv.close();
  const ruta = path.join(SALIDA, `qa158-${ETIQUETA}.json`);
  fs.writeFileSync(ruta, JSON.stringify(res, null, 2));
  console.log(`· resultado en ${ruta}`);
  const crece = res.veredicto && res.veredicto.creceSinParar;
  process.exit(res.error || res.caidaPagina ? 2 : crece ? 1 : 0);
})().catch(e => { console.error('FALLO:', e && e.stack || JSON.stringify(e) || String(e)); process.exit(2); });
