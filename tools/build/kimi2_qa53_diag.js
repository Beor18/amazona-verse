#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — QA-53 diagnóstico: la validación limpia dejó de dibujar el mundo
   (calls 0, lienzo negro) ~1 s tras el reveal, antes de la tormenta. Esta herramienta reproduce la entrada
   (semilla cap1, móvil 375×812 dpr 3, CPU ×4, GPU real) y muestrea 25 s: calls/fps/calidad/programas por
   segundo + errores de consola + excepciones + webglcontextlost. Salida: consola + docs/img/kimi053/diag.json.
   Uso: node tools/build/kimi2_qa53_diag.js
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
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi053');
fs.mkdirSync(SALIDA, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    const qa = /[?&]qa=1(?:&|$)/.test(req.url);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || (req.method !== 'GET' && req.method !== 'HEAD')) { console.log('  [403]', req.method, req.url.slice(0, 120)); res.writeHead(403); return res.end(); }
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

const SEMILLA_SAVE_JS = fs.readFileSync(path.join(AQUI, 'kimi2_qa53_diag_seed.js'), 'utf8');
const PREP_JS = fs.readFileSync(path.join(AQUI, 'kimi2_qa53_diag_prep.js'), 'utf8');
const MUESTRA_JS = fs.readFileSync(path.join(AQUI, 'kimi2_qa53_diag_muestra.js'), 'utf8');

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
  const res = { erroresConsola: [], excepciones: [], contextLost: 0, muestras: [], gpu: null };
  const chromeL = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${chromeL.puerto}${chromeL.wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    // capturar errores de consola y excepciones
    ws.addEventListener('message', m => {
      let d; try { d = JSON.parse(m.data); } catch (e) { return; }
      if (d.method === 'Runtime.exceptionThrown' && d.sessionId === ses) {
        const x = d.params.exceptionDetails;
        res.excepciones.push({ texto: (x.exception && x.exception.description || x.text || '').slice(0, 500), url: (x.url || '').split('/').pop() + ':' + (x.lineNumber || 0), t: Date.now() });
      }
      if (d.method === 'Runtime.consoleAPICalled' && d.sessionId === ses && (d.params.type === 'error' || d.params.type === 'warning')) {
        const txt = (d.params.args || []).map(a => a.value !== undefined ? String(a.value) : (a.description || a.type)).join(' ').slice(0, 300);
        if (d.params.type === 'error') res.erroresConsola.push({ texto: txt, t: Date.now() });
      }
      if (d.method === 'Log.entryAdded' && d.sessionId === ses && d.params.entry.level === 'error') {
        res.erroresConsola.push({ texto: String(d.params.entry.text).slice(0, 300), t: Date.now() });
      }
    });
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS + `; document.addEventListener('webglcontextlost', e => { window.__ctxLost = (window.__ctxLost || 0) + 1; }); document.addEventListener('webglcontextrestored', () => { window.__ctxRestored = (window.__ctxRestored || 0) + 1; });` }, ses);
    await cdp.call('Page.navigate', { url: origen + '/index.html?qa=1&fases=1' }, ses);
    { const t0 = Date.now(); let listo = false;
      while (Date.now() - t0 < 90000) { try { if (await ev(cdp, ses, `!!(window.AV && window.AV.G && window.AV.G.actores && (window.AV.G.actores.player3D || window.AV.G.actores.failed3D))`, 10, false)) { listo = true; break; } } catch (e) {} await cdp.bombear(0.5); }
      if (!listo) throw new Error('el juego no arrancó en 90 s');
    }
    const prep = await ev(cdp, ses, PREP_JS, 60);
    const t0 = Date.now();
    for (let i = 0; i < 25; i++) {
      await cdp.bombear(1);
      const s = await ev(cdp, ses, MUESTRA_JS, 10);
      res.muestras.push(JSON.parse(s));
    }
    try { res.gpu = await ev(cdp, ses, `(() => { const gl = AV.G.renderer.renderer.getContext(); const ext = gl.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'sin debug_info'; })()`, 15); } catch (e) { res.gpu = 'n/d'; }
    console.log('t+' + Math.round((Date.now() - t0) / 1000) + 's de muestreo');
    for (const [i, m] of res.muestras.entries()) console.log(`  s${i + 1}: calls ${m.calls} tris ${m.tris} fps ${m.fps} cal ${m.cal} progs ${m.progs} lost ${m.lost}/${m.restored} listo ${m.mundoListo} hidden ${m.hidden}`);
    console.log('excepciones:', res.excepciones.length ? JSON.stringify(res.excepciones.slice(0, 6), null, 1) : 'ninguna');
    console.log('errores consola:', res.erroresConsola.length ? JSON.stringify(res.erroresConsola.slice(0, 8), null, 1) : 'ninguno');
    try { await cdp.call('Target.closeTarget', { targetId: tid }, ses); } catch (e) {}
  } finally {
    try { chromeL.chrome.kill(); } catch (e) {}
    for (const p of fs.readdirSync(os.tmpdir()).filter(x => x.startsWith('kimi2-'))) { try { fs.rmSync(path.join(os.tmpdir(), p), { recursive: true, force: true }); } catch (e) {} }
    srv.close();
  }
  fs.writeFileSync(path.join(SALIDA, 'diag.json'), JSON.stringify(res, null, 1));
  process.exit(0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
