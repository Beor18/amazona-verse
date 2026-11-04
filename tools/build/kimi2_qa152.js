#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — QA-152: memoria al arrancar (heap JS y texturas de GPU en el arranque).
   La nube (SwiftShader) midió heap 161,9 MB a los ~9 s (aviso en 120) y texturas de arranque 131 → 194–226 MB
   con la pantalla de carga. Esta herramienta replica el arranque en móvil emulado con la GPU real de la PC
   (375×812 dpr 3, CPU ×4, partida sembrada de cap1, sin tocar el motor) y muestrea cada 500 ms durante 30 s:
   usedJSHeapSize / totalJSHeapSize, renderer.info.memory (geometries/textures), info.programs, draw calls y
   FPS. Salida: consola + docs/img/kimi152/qa152.json. Uso: node tools/build/kimi2_qa152.js [--secs 30]
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ANCHO = 375, ALTO = 812, DPR = 3, CPU = 4;
const SECS = +(arg('--secs', '30'));
const CAP = +(arg('--cap', '1'));
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi152');
fs.mkdirSync(SALIDA, { recursive: true });
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    const qa = /[?&]qa=1(?:&|$)/.test(req.url);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); return res.end('404'); }
      if (qa && /index\.html$/.test(f)) d = Buffer.from(d.toString('utf8').replace(/<meta charset[^>]*>/i, m => m + '<script src="tests/qa/qa.js" charset="utf-8"></script>'), 'utf8');
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(d);
    });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(m, p, s, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: m, params: p || {}, sessionId: s })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + m)); } }, t); }); }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function ev(cdp, ses, exp, t, aw) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, returnByValue: true, awaitPromise: aw !== false }, ses, (t || 30) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 400));
  return r.result ? r.result.value : undefined;
}

// Semilla de cap1 (jugador existente: Jugar entra directo, sin creador) — misma que kimi2_qa53.js (QA-111)
const SEMILLA_SAVE_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi2-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;
const MUESTRA_JS = `(() => { const m = performance.memory || {}; let info = null, progs = 0, st = null;
  try { const R = AV.G.renderer; info = { geometries: R.renderer.info.memory.geometries, textures: R.renderer.info.memory.textures };
    progs = R.renderer.info.programs ? R.renderer.info.programs.length : 0; st = R.stats(); } catch (e) {}
  return { t: Math.round(performance.now()), heapUsado: m.usedJSHeapSize || 0, heapTotal: m.totalJSHeapSize || 0,
    geometries: info && info.geometries, textures: info && info.textures, programas: progs,
    calls: st && st.calls, tris: st && st.triangulos, fps: st && st.fps, calidad: st && st.calidad, sombras: st && st.sombras }; })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', '--window-size=500,900'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools en 60 s: ' + err.slice(0, 300));
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const res = { movil: { ancho: ANCHO, alto: ALTO, dpr: DPR, cpu: CPU, secs: SECS, cap: CAP }, gpu: null, muestras: [] };
  const chromeL = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${chromeL.puerto}${chromeL.wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
    const t0 = Date.now();
    await cdp.call('Page.navigate', { url: origen + '/index.html?qa=1&cap=' + CAP }, ses);
    const limiteMs = SECS * 1000;
    while (Date.now() - t0 < limiteMs) {
      await cdp.bombear(0.5);
      try { const m = await ev(cdp, ses, MUESTRA_JS, 5, false); if (m) { m.s = Math.round((Date.now() - t0) / 100) / 10; res.muestras.push(m); } } catch (e) { /* aún no hay AV */ }
    }
    try { res.gpu = await ev(cdp, ses, `(() => { const gl = AV.G.renderer.renderer.getContext(); const ext = gl.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'sin debug_info'; })()`, 15); } catch (e) { res.gpu = 'n/d'; }
    const heap = res.muestras.map(m => m.heapUsado || 0), max = Math.max(...heap);
    console.log(`RESULTADO ${res.muestras.length} muestras en ${SECS} s · GPU: ${res.gpu}`);
    for (const m of res.muestras.filter((_, i) => i % 4 === 0 || i === res.muestras.length - 1))
      console.log(`  t=${m.s}s heap=${(m.heapUsado / 1048576).toFixed(1)} MB geo=${m.geometries} tex=${m.textures} prog=${m.programas} calls=${m.calls} cal=${m.calidad}`);
    console.log(`  heap máx: ${(max / 1048576).toFixed(1)} MB`);
  } finally {
    try { chromeL.chrome.kill(); } catch (e) {}
    for (const p of fs.readdirSync(os.tmpdir()).filter(x => x.startsWith('kimi2-'))) { try { fs.rmSync(path.join(os.tmpdir(), p), { recursive: true, force: true }); } catch (e) {} }
    srv.close();
    try { ws.close(); } catch (e) {}
  }
  fs.writeFileSync(path.join(SALIDA, `qa152-cap${CAP}.json`), JSON.stringify(res, null, 1));
  process.exit(0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
