#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-252: FPS/draw calls/errores en móvil emulado
   de los modos del parche «rendimiento de modos» (TAREAS_WEB 8-nov 05:00 UTC).
   Mide en iPhone 390x844 dpr 3, CPU x4, GPU real RX 5700 XT, uno por página limpia:
     flight (AV.flight), river (AV.riverRush), tren (AV.tren), maze (AV.maze)
   Cada modo: entrar al mundo con semilla → abrir el modo → asentar 3 s → 12 s de muestreo
   rAF (fps med/p10/peor) + renderer.stats() (calls/tris) + heap + errores de consola.
   El juego NO se toca.
   Uso: node tools/build/kimi2_252_modos.js --etiqueta r1
*/
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os');
const { spawn, execSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ETIQUETA = arg('--etiqueta', 'r1');
const CPU = parseInt(arg('--cpu', '4'), 10);
const MODOS = [
  { id: 'flight', abre: 'AV.flight()' },
  { id: 'river', abre: 'AV.riverRush()' },
  { id: 'tren', abre: 'AV.tren()' },
  { id: 'maze', abre: 'AV.maze()' },
];
const PF = { w: 390, h: 844, dpr: 3, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' };
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi252');
fs.mkdirSync(SALIDA, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = () => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result ? r.result.value : undefined; }

const SEMILLA = `try {
  localStorage.clear(); sessionStorage.clear();
  window.__errConsola = [];
  addEventListener('error', e => __errConsola.push(String(e.message || e)));
  addEventListener('unhandledrejection', e => __errConsola.push('rechazo: ' + (e.reason && e.reason.message || e.reason)));
  const cerr = console.error; console.error = function () { try { __errConsola.push([].map.call(arguments, String).join(' ').slice(0, 300)); } catch (e) {} return cerr.apply(this, arguments); };
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi2k252-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Brisa del Norte', look: null, species: 'vittata' },
    pos: { x: 150, z: 170, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;

const MEDIR = `(async () => { try {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const G = AV.G;
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(120); } return false; };
  if (!await espera(() => G.mundo && G.mundo.listo, 90000)) return { err: 'mundo no listo' };
  try { window.dispatchEvent(new PointerEvent('pointerdown')); } catch (e) {}
  const b = document.getElementById('c1-saltar'); if (b) b.click();
  await sleep(600);
  const f = document.getElementById('c1-fade'); if (f) f.remove();
  return 'ok';
} catch (e) { return { err: String(e && e.stack || e).slice(0, 300) }; } })()`;

const MUESTREO = `(async () => { try {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const G = AV.G;
  const heap0 = (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1);
  const mem = () => { try { return { geo: G.renderer.renderer.info.memory.geometries, tex: G.renderer.renderer.info.memory.textures }; } catch (e) { return null; } };
  const deltas = []; let ult = performance.now(); let vivo = true;
  const marca = () => { if (!vivo) return; const a = performance.now(); deltas.push(a - ult); ult = a; requestAnimationFrame(marca); };
  requestAnimationFrame(marca);
  const stats = []; const t0 = performance.now();
  while (performance.now() - t0 < 12000) { await sleep(1000); try { const st = G.renderer.stats(); stats.push({ calls: st.calls, tris: st.triangulos }); } catch (e) { stats.push(null); } }
  vivo = false; deltas.shift();
  const porSeg = []; let ac = 0, n = 0;
  for (const d of deltas) { ac += d; n++; if (ac >= 1000) { porSeg.push(Math.round(1000 / (ac / n))); ac = 0; n = 0; } }
  if (n > 5) porSeg.push(Math.round(1000 / (ac / n)));
  const ordenSeg = porSeg.slice().sort((a, b) => a - b);
  const medSeg = porSeg.length ? Math.round(porSeg.reduce((s, x) => s + x, 0) / porSeg.length) : 0;
  const p10Seg = ordenSeg.length ? ordenSeg[Math.floor(ordenSeg.length * 0.1)] : 0;
  const orden = deltas.slice().sort((a, b) => a - b);
  const peor = orden.length ? Math.round(orden[orden.length - 1]) : 0;
  const calls = stats.filter(Boolean).map(s => s.calls);
  const tris = stats.filter(Boolean).map(s => s.tris);
  const media = a => a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : 0;
  const heap1 = (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1);
  return { fpsMed: medSeg, fpsP10: p10Seg, peorMs: peor, fpsSeg: porSeg, callsMed: media(calls), trisMed: media(tris),
    heapMB: heap1, heapDelta: heap1 - heap0, mem: mem(),
    errConsola: (window.__errConsola || []).slice(0, 10) };
} catch (e) { return { err: String(e && e.stack || e).slice(0, 300) }; } })()`;

(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const resultados = {}; let chrome, perf;
  try {
    for (const modo of MODOS) {
      perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2k252-'));
      chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', `--window-size=${PF.w},${PF.h}`], { stdio: ['ignore', 'ignore', 'pipe'] });
      let err = ''; chrome.stderr.on('data', d => { err += d; });
      const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath, caido = '';
      chrome.on('exit', (c) => { caido = 'exit ' + c; });
      for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
      if (!puertoDev) throw new Error('Chrome no abrió DevTools (' + (caido || 'sin exit') + ') ' + err.slice(0, 200));
      const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
      const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
      const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
      for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
      await cdp.call('Emulation.setDeviceMetricsOverride', { width: PF.w, height: PF.h, deviceScaleFactor: PF.dpr, mobile: true }, ses);
      try { await cdp.call('Emulation.setUserAgentOverride', { userAgent: PF.ua }, ses); } catch (e) { }
      try { await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses); } catch (e) { }
      await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA }, ses);
      await cdp.call('Page.navigate', { url: `${origen}/index.html` }, ses);
      const t0 = Date.now(); let ok = false;
      while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
      if (!ok) { resultados[modo.id] = { err: 'no arrancó' }; continue; }
      const prep = await ev(cdp, ses, CFG.preparar_js, 300);
      const entrar = await ev(cdp, ses, MEDIR, 150);
      if (entrar !== 'ok') { resultados[modo.id] = { err: 'entrar: ' + JSON.stringify(entrar).slice(0, 200) }; }
      else {
        const abrio = await ev(cdp, ses, `(async () => { try { const r = await (${modo.abre}); await new Promise(r2 => setTimeout(r2, 6000)); return r === false ? 'abierto-false' : 'ok'; } catch (e) { return 'ERR ' + String(e && e.message || e).slice(0, 200); } })()`, 90);
        if (abrio !== 'ok' && abrio !== 'abierto-false') resultados[modo.id] = { err: 'abrir: ' + abrio };
        else resultados[modo.id] = await ev(cdp, ses, MUESTREO, 60);
        try { const cap = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 70 }, ses, 15000); fs.writeFileSync(path.join(SALIDA, `k252_${ETIQUETA}_${modo.id}.jpg`), Buffer.from(cap.data, 'base64')); } catch (e) { }
      }
      console.log(modo.id + ':', JSON.stringify(resultados[modo.id]).slice(0, 400));
      try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
      try { chrome.kill(); } catch (e) { }
      await new Promise(r => setTimeout(r, 1200));
      try { execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(AQUI, 'kimi2_mata_perfil.ps1')}" ${path.basename(perf)}`, { timeout: 30000 }); } catch (e) { }
      try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
    }
  } catch (e) {
    console.error('FATAL', e && e.stack || e);
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(path.join(SALIDA, `k252_modos_${ETIQUETA}.json`), JSON.stringify(resultados, null, 1));
    console.log('· JSON:', path.join(SALIDA, `k252_modos_${ETIQUETA}.json`));
    try { srv.close(); } catch (e) { }
    setTimeout(() => process.exit(process.exitCode || 0), 500).unref();
  }
})();
