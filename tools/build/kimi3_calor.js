#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-025: medición local del parche calor-por-material
   (0j.2, c8fbbb7f) con GPU real. Móvil 375×812 dpr 3, CPU ×N (defecto 4). Entra con jugador nuevo,
   se asienta en la Ciudad de los 36 ((-33,-136), +8 m, yaw π — miles de dibujables), y mide SEGS
   segundos de juego asentado:
     - FPS (p50/p95/peor), draw calls, triángulos, memoria GPU (geo/tex/programas) y heap JS.
     - CPU profile (CDP) de la misma ventana con self-time por función: atribuye cacheDe/objPendiente/
       idCalor/siguienteCalor/ocultarPendientes/texturasPendientes (el escaneo que trocea el parche).
   Salida: docs/img/kimi025/calor-<etiqueta>.json
   Uso: node tools/build/kimi3_calor.js --etiqueta despues-x4 [--cpu 4] [--segundos 8] [--rondas 1] */
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
const ETIQUETA = ARG('etiqueta', 'x');
const CPU = parseFloat(ARG('cpu', '4'), 10);
const SEGS = parseFloat(ARG('segundos', '8'), 10);
const RONDAS = parseInt(ARG('rondas', '1'), 10);
const X = parseFloat(ARG('x', '-33'), 10);
const Z = parseFloat(ARG('z', '-136'), 10);
const ALZAR = parseFloat(ARG('alzar', '8'), 10);
const YAW = parseFloat(ARG('yaw', String(Math.PI)), 10);
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi025');
fs.mkdirSync(SALIDA, { recursive: true });
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
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function evaluar(cdp, ses, exp, timeoutS, promesa) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: promesa !== false, returnByValue: true }, ses, (timeoutS || 30) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 400));
  return r.result ? r.result.value : undefined;
}
// Self-time por función en una ventana del CPU profile (µs del reloj del propio perfil).
// timeDeltas[i] = µs entre la muestra i-1 y la i: se atribuyen a samples[i-1] (convención de DevTools).
function resumirPerfil(p, desdeUs, hastaUs, filtro) {
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
  const top = [...por.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([k, us]) => ({ ms: Math.round(us / 100) / 10, fn: k }));
  const interesa = filtro ? [...por.entries()].filter(([k]) => filtro.test(k)).sort((a, b) => b[1] - a[1]).map(([k, us]) => ({ ms: Math.round(us / 100) / 10, fn: k })) : [];
  return { desdeMs: Math.round(desdeUs / 1000), hastaMs: Math.round(hastaUs / 1000), ventanaMs: Math.round(total / 100) / 10, top, interesa };
}
function limpiarHuerfanos() {
  try {
    const ps = "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*kimi3calor-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { /* seguir */ }
}
async function lanzarChrome() {
  for (let intento = 0; intento < 3; intento++) {
    try { return await lanzarChromeUnaVez(); } catch (e) { await new Promise(r => setTimeout(r, 2500)); }
  }
  throw new Error('Chrome no arrancó');
}
async function lanzarChromeUnaVez() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3calor-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--window-size=500,900', 'about:blank'];
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
// Asentarse en la ciudad y medir SEGS s de juego: FPS por cuadro + stats + memoria + nº de dibujables.
const MEDIR_JS = `(async () => {
  const AV = window.AV, G = AV.G, R = G.renderer, S = AV.state;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let dibujables = 0, pendCalor = null, texPend = null;
  try { R.scene.traverse(o => { if (o.isMesh || o.isPoints || o.isSprite || o.isLine) dibujables++; }); } catch (e) {}
  try { pendCalor = R.precarga.programas(); } catch (e) {}
  try { texPend = R.precarga.texturas(); } catch (e) {}
  window.__fpsQ = [];
  let t = 0; const f = n => { if (t) window.__fpsQ.push(Math.round((n - t) * 100) / 100); t = n; if (window.__fpsOn) requestAnimationFrame(f); };
  window.__fpsOn = true; requestAnimationFrame(f);
  await sleep(${SEGS * 1000});
  window.__fpsOn = false;
  const q = window.__fpsQ.slice(5);
  const ord = q.slice().sort((a, b) => a - b);
  const pct = p => ord.length ? ord[Math.min(ord.length - 1, Math.floor(ord.length * p))] : null;
  const info = R.renderer.info, st = R.stats();
  let gpu = null;
  try { const gl = R.renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'); gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'sin debug_info'; } catch (e) {}
  return JSON.stringify({ cuadros: q.length, dt_p50: pct(0.5), dt_p95: pct(0.95), dt_max: ord.length ? ord[ord.length - 1] : null,
    fps_p50: pct(0.5) ? Math.round(1000 / pct(0.5) * 10) / 10 : null,
    calls: st.calls, ktris: st.triangulos != null ? Math.round(st.triangulos / 1000) : null,
    geo: info.memory.geometries, tex: info.memory.textures, progs: info.programs ? info.programs.length : 0,
    heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576 * 10) / 10 : null,
    dibujables, pendCalor, texPend, calidad: st.calidad, dpr: st.dpr, post: st.post, gpuReal: gpu });
})()`;
(async () => {
  limpiarHuerfanos();
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws);
  await cdp.listo();
  const res = { etiqueta: ETIQUETA, cuando: new Date().toISOString(), commit: execSync('git rev-parse --short HEAD', { cwd: RAIZ }).toString().trim(),
    ancla: { x: X, z: Z, alzar: ALZAR, yaw: YAW }, movil: { ancho: 375, alto: 812, dpr: 3, cpu: CPU, gpu: 'PC real (ANGLE/D3D11)' }, rondas: [] };
  console.log(`· móvil 375×812 dpr 3 · CPU ×${CPU} · ancla (${X},${Z}) +${ALZAR} m · ventana ${SEGS} s · KIMI-025 calor-por-material`);
  async function esperarListo(ses) {
    const t0 = Date.now();
    while (Date.now() - t0 < CFG.espera_listo_s * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) return true; } catch (e) { /* aún no */ }
      await cdp.bombear(0.5);
    }
    return false;
  }
  for (let ronda = 1; ronda <= RONDAS; ronda++) {
    console.log(`· ronda ${ronda}/${RONDAS}`);
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 3, mobile: true }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}" }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1` }, ses);
    if (!(await esperarListo(ses))) { console.log('  · el juego no arrancó'); res.rondas.push({ ronda, error: 'no arrancó' }); continue; }
    await cdp.bombear(2.0);
    console.log('  · jugador nuevo: ' + await evaluar(cdp, ses, CFG.preparar_js, 300));
    // Asentar la ciudad: teleport + alzar + cola de streaming agotada (tope 25 s; KIMI-020)
    console.log('  · asentando la ciudad…');
    const asiento = await evaluar(cdp, ses, `(async () => {
      const AV = window.AV, G = AV.G, S = G.S, ST = (G.mundo && G.mundo.streaming) || (G.streaming && G.streaming.gestor);
      if (!ST) return JSON.stringify({ error: 'sin streaming' });
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      AV.teleport(${X}, ${Z});
      S.pos.y += ${ALZAR}; S.vy = 0; G.fisica.MOVE.flying = true;
      try { AV.debug.camYaw(${YAW}); } catch (e) {}
      await ST.alrededor(S.pos.x, S.pos.z);
      await sleep(1500);
      const v = await ST.terminar({ topeMs: 25000 });
      await sleep(1200);
      return JSON.stringify({ tope: !!(v && v.tope), pos: Math.round(S.pos.x) + ',' + Math.round(S.pos.y) + ',' + Math.round(S.pos.z) });
    })()`, 90);
    console.log('  · asiento: ' + asiento);
    await cdp.call('Profiler.enable', {}, ses);
    await cdp.call('Profiler.start', {}, ses);
    const medida = JSON.parse(await evaluar(cdp, ses, MEDIR_JS, SEGS + 40));
    const p = (await cdp.call('Profiler.stop', {}, ses, 90000)).profile;
    const filtro = /cacheDe|objPendiente|idCalor|claveDe|siguienteCalor|ocultarPendientes|texturasPendientes|dibujables|matsDe|rasgos/;
    const perfil = resumirPerfil(p, p.startTime || 0, p.endTime || 0, filtro);
    console.log(`  · cuadros ${medida.cuadros} · p50 ${medida.dt_p50} ms (${medida.fps_p50} FPS) · p95 ${medida.dt_p95} ms · peor ${medida.dt_max} ms`);
    console.log(`  · ${medida.calls} calls · ${medida.ktris} k tris · geo ${medida.geo} · tex ${medida.tex} · progs ${medida.progs} · heap ${medida.heapMB} MB · dibujables ${medida.dibujables} · ${medida.gpuReal}`);
    console.log(`  · perfil (${perfil.ventanaMs} ms de self-time): funciones del escaneo:`);
    for (const f of perfil.interesa) console.log(`    ${f.ms} ms · ${f.fn}`);
    console.log('  · top del perfil:');
    for (const f of perfil.top.slice(0, 8)) console.log(`    ${f.ms} ms · ${f.fn}`);
    const errores = await evaluar(cdp, ses, 'JSON.stringify((window.__aveErrores || []).slice(0, 8))', 10, false);
    console.log('  · errores: ' + errores);
    res.rondas.push({ ronda, asiento: JSON.parse(asiento || '{}'), medida, perfil, errores: JSON.parse(errores || '[]') });
    try { await cdp.call('Target.closeTarget', { targetId: tid }, undefined, 10); } catch (e) { /* ya cerrado */ }
  }
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { chrome.kill(); }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { /* lo recoge el SO */ }
  srv.close();
  const ruta = path.join(SALIDA, `calor-${ETIQUETA}.json`);
  fs.writeFileSync(ruta, JSON.stringify(res, null, 2));
  console.log(`· resultado en ${ruta}`);
})().catch(e => { console.error('FALLO:', e && e.stack || JSON.stringify(e) || String(e)); process.exit(2); });
