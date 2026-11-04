#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — QA-152: memoria al arrancar (heap JS y texturas de GPU en el arranque).
   La nube (SwiftShader) midió heap 161,9 MB a los ~9 s (aviso en 120) y texturas de arranque 131 → 194–226 MB
   con la pantalla de carga. Esta herramienta replica el arranque en móvil emulado con la GPU real de la PC
   (375×812 dpr 3, CPU ×4, partida sembrada de cap1, sin tocar el motor) y muestrea cada 500 ms durante 30 s:
   usedJSHeapSize / totalJSHeapSize, renderer.info.memory (geometries/textures), info.programs, draw calls y
   FPS. Salida: consola + docs/img/kimi152/qa152.json. Uso: node tools/build/kimi2_qa152.js [--secs 30]

   Fase 2 (4-nov, post-reveal): el exceso de heap del cap. 4 (nube: 247–285 MB) NO se da en la carga sino
   jugando. La herramienta ahora puede medir largo (p. ej. --secs 150) con: (a) window.gc() cada ~10 s
   (--js-flags=--expose-gc) para separar heap retenido de basura; (b) captura Network por CDP (qué GLB/texturas
   entran y cuántos bytes); (c) stats de streaming por muestra (zonas cerca/lejos, modelos HD, KB de geometría,
   materiales) y posición de cámara para correlacionar con lo que se carga. Uso largo:
   node tools/build/kimi2_qa152.js --cap 4 --secs 150 --etiqueta post1

   Fase 3 (--perfil): si el heap sigue creciendo con geo/tex estables, el grueso es JS retenido.
   Activa HeapProfiler.startSampling (~32 KB) desde el segundo 40 y vuelca las pilas con más
   selfSize: atribuye qué módulo retiene la memoria. Uso:
   node tools/build/kimi2_qa152.js --cap 4 --secs 150 --perfil --etiqueta perf1
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
const ETIQUETA = arg('--etiqueta', '');
const PERFIL = process.argv.includes('--perfil');
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
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); this.onEvent = null; ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } else if (d.method && this.onEvent) this.onEvent(d); }; }
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
  let zonas = null;
  try { const s = AV.G.streaming.gestor.stats(); zonas = { n: s.zonas, cerca: s.zonasCerca, lejos: s.zonasLejos, hd: s.modelosHD,
    kbGeo: s.kbGeometria, mats: s.materiales, inst: s.instancias, descargando: s.descargando }; } catch (e) {}
  let px = null, pz = null;
  try { const c = AV.G.camara; const p = (c && (c.pos || c.p)) || null;
    if (p && 'x' in p) { px = Math.round(p.x); pz = Math.round(p.z); } else if (c && 'x' in c) { px = Math.round(c.x); pz = Math.round(c.z); } } catch (e) {}
  return { t: Math.round(performance.now()), heapUsado: m.usedJSHeapSize || 0, heapTotal: m.totalJSHeapSize || 0,
    geometries: info && info.geometries, textures: info && info.textures, programas: progs,
    calls: st && st.calls, tris: st && st.triangulos, fps: st && st.fps, calidad: st && st.calidad, sombras: st && st.sombras,
    zonas: zonas, px: px, pz: pz }; })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', '--js-flags=--expose-gc', '--window-size=500,900'];
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
  const res = { movil: { ancho: ANCHO, alto: ALTO, dpr: DPR, cpu: CPU, secs: SECS, cap: CAP, etiqueta: ETIQUETA || null }, gpu: null, muestras: [], red: null };
  const chromeL = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${chromeL.puerto}${chromeL.wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const net = { urls: {}, total: 0, porExt: {}, fallos: 0, n: 0 };
  cdp.onEvent = d => {
    if (d.method === 'Network.responseReceived') { const r = d.params.response; net.urls[d.params.requestId] = { u: r.url, mb: 0, mime: r.mimeType }; }
    else if (d.method === 'Network.loadingFinished') { const e = net.urls[d.params.requestId]; if (e) { e.mb = (d.params.encodedDataLength || 0) / 1048576; net.total += e.mb; net.n++;
      const ext = (e.u.match(/\.(\w+)(?:[?#]|$)/) || [,'?'])[1].toLowerCase(); net.porExt[ext] = (net.porExt[ext] || 0) + e.mb; } }
    else if (d.method === 'Network.loadingFailed') { net.fallos++; }
  };
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Network.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
    const t0 = Date.now();
    await cdp.call('Page.navigate', { url: origen + '/index.html?qa=1&cap=' + CAP }, ses);
    const limiteMs = SECS * 1000;
    let nMuestra = 0, perfilando = false;
    while (Date.now() - t0 < limiteMs) {
      await cdp.bombear(0.5);
      // gc cada ~10 s para separar heap retenido de basura (muestra marcada gc=true)
      if (++nMuestra % 20 === 0) { try { await ev(cdp, ses, `window.gc()`, 5, false); } catch (e) {} }
      // muestreo de asignaciones desde el segundo 40 (post-reveal: atribuye el crecimiento, no la carga)
      if (PERFIL && !perfilando && nMuestra >= 80) { try { await cdp.call('HeapProfiler.startSampling', { samplingInterval: 32768 }, ses); perfilando = true; } catch (e) {} }
      try { const m = await ev(cdp, ses, MUESTRA_JS, 5, false); if (m) { m.s = Math.round((Date.now() - t0) / 100) / 10; m.gc = nMuestra % 20 === 0; res.muestras.push(m); } } catch (e) { /* aún no hay AV */ }
    }
    if (perfilando) {
      try {
        const p = (await cdp.call('HeapProfiler.stopSampling', {}, ses, 60 * 1000)).profile;
        const nodos = [];
        (function pasear(n, pila) {
          const cf = n.callFrame || {};
          const sitio = (cf.functionName || '(anónima)') + ' @ ' + (cf.url || '').split('/').slice(-1)[0] + ':' + ((cf.lineNumber || 0) + 1);
          if (n.selfSize > 0) nodos.push({ selfSize: n.selfSize, sitio, pila: pila.concat(sitio).slice(-6) });
          for (const c of n.children || []) pasear(c, pila.concat(sitio).slice(-6));
        })(p.head, []);
        nodos.sort((a, b) => b.selfSize - a.selfSize);
        res.perfil = { totalMB: Math.round(nodos.reduce((s, n) => s + n.selfSize, 0) / 1048576 * 10) / 10,
          top: nodos.slice(0, 30).map(n => ({ mb: Math.round(n.selfSize / 1048576 * 100) / 100, sitio: n.sitio, pila: n.pila.join(' ← ') })) };
        console.log('\nPERFIL asignaciones (top 20):\n  ' + res.perfil.top.slice(0, 20).map(n => `${n.mb} MB  ${n.sitio}   [${n.pila}]`).join('\n  '));
      } catch (e) { console.log('perfil falló: ' + e.message); }
    }
    try { res.gpu = await ev(cdp, ses, `(() => { const gl = AV.G.renderer.renderer.getContext(); const ext = gl.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'sin debug_info'; })()`, 15); } catch (e) { res.gpu = 'n/d'; }
    res.red = { totalMB: Math.round(net.total * 10) / 10, n: net.n, fallos: net.fallos, porExt: net.porExt,
      top: Object.values(net.urls).filter(e => e.mb > 0.05).sort((a, b) => b.mb - a.mb).slice(0, 40).map(e => ({ u: e.u.split('/').slice(-2).join('/'), mb: Math.round(e.mb * 100) / 100, mime: e.mime })) };
    const heap = res.muestras.map(m => m.heapUsado || 0), max = Math.max(...heap);
    const heapGC = res.muestras.filter(m => m.gc).map(m => m.heapUsado);
    console.log(`RESULTADO ${res.muestras.length} muestras en ${SECS} s · GPU: ${res.gpu}`);
    for (const m of res.muestras.filter((_, i) => i % 10 === 0 || i === res.muestras.length - 1))
      console.log(`  t=${m.s}s heap=${(m.heapUsado / 1048576).toFixed(1)}${m.gc ? ' (gc)' : ''} MB geo=${m.geometries} tex=${m.textures} prog=${m.programas} calls=${m.calls} zonas=${m.zonas ? m.zonas.n + '/' + m.zonas.cerca + 'c' + m.zonas.lejos + 'l' : '?'} hd=${m.zonas ? m.zonas.hd : '?'} pos=${m.px},${m.pz} cal=${m.calidad}`);
    console.log(`  heap máx: ${(max / 1048576).toFixed(1)} MB · heap tras gc: ${heapGC.length ? (Math.max(...heapGC) / 1048576).toFixed(1) : 'n/d'} MB máx · red: ${res.red.totalMB} MB en ${net.n} recursos (${JSON.stringify(net.porExt)})`);
    if (res.red.top.length) console.log('  top red:\n    ' + res.red.top.slice(0, 15).map(e => `${e.mb} MB  ${e.u}`).join('\n    '));
  } finally {
    try { chromeL.chrome.kill(); } catch (e) {}
    for (const p of fs.readdirSync(os.tmpdir()).filter(x => x.startsWith('kimi2-'))) { try { fs.rmSync(path.join(os.tmpdir(), p), { recursive: true, force: true }); } catch (e) {} }
    srv.close();
    try { ws.close(); } catch (e) {}
  }
  fs.writeFileSync(path.join(SALIDA, `qa152-cap${CAP}${ETIQUETA ? '-' + ETIQUETA : ''}.json`), JSON.stringify(res, null, 1));
  process.exit(0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
