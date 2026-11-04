#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — CG-65: «se tranca en el 4». Corre AV.ep4GuardadoTest() (tests/qa/ep4_guardado.js)
   en Chrome headless propio + CDP: móvil emulado 390×844 dpr 3, CPU ×4, calidad bajo, GPU real. Juega el paso 1 del cap. 4
   con Acción real, guarda a mitad del paso 2, recarga, verifica la reanudación, la guía de los 6 pasos y el viento.
   Salida: docs/img/kimi065/cg65_resultados.json

   Uso: node tools/build/kimi1_cg65.js [--idioma es|en]
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const IDIOMAS = arg('--idioma', '') ? [arg('--idioma', '')] : ['es', 'en'];
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi065');
const ANCHO = 390, ALTO = 844;
fs.mkdirSync(SALIDA, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
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
async function lanzar() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1cg65-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', `--window-size=${ANCHO},${ALTO}`];
  const c = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let e0 = null; c.on('error', e => { e0 = e; });
  const pf = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { c, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    if (e0) throw new Error('spawn: ' + e0.message);
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('sin DevToolsActivePort');
}

(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const { c, puerto: pd, wsPath } = await lanzar();
  const ws = new WebSocket(`ws://127.0.0.1:${pd}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const resultados = { cuando: new Date().toISOString(), maquina: `PC Windows · Chrome headless GPU real · ${ANCHO}×${ALTO} dpr 3 · CPU ×4 · calidad bajo`, idiomas: {} };
  console.log(`· CG-65 · ep4GuardadoTest · ${ANCHO}×${ALTO} dpr 3 · CPU ×4 · ${IDIOMAS.join('+')}`);
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: 3, mobile: true }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: 4 }, ses);
    await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1` }, ses);
    const t0 = Date.now(); let listo = false;
    while (Date.now() - t0 < 120000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { } await cdp.bombear(0.5); }
    if (!listo) throw new Error('el juego no arrancó');
    await ev(cdp, ses, `(s => { s.src = 'tests/qa/ep4_guardado.js?'+Date.now(); document.head.appendChild(s); return 1; })(document.createElement('script'))`, 10, false);
    { const t1 = Date.now(); let hay = false; while (Date.now() - t1 < 15000) { try { if (await ev(cdp, ses, `typeof (window.AV && AV.ep4GuardadoTest)`, 5, false) === 'function') { hay = true; break; } } catch (e) { } await cdp.bombear(0.3); } if (!hay) throw new Error('ep4_guardado.js no cargó'); }
    for (const idioma of IDIOMAS) {
      console.log(`  · vuelta ${idioma}…`);
      const r = await ev(cdp, ses, `window.AV.ep4GuardadoTest({ idioma: '${idioma}' })`, 600);
      resultados.idiomas[idioma] = r;
      for (const o of (r.results || [])) console.log(`    ${o.ok ? '✓' : '✗'} ${o.name}${o.extra ? ' · ' + o.extra : ''}`);
      console.log(`  · ${idioma}: ${r.passed}/${r.total}${r.ok ? ' · OK' : ' · ROJO'}`);
    }
  } catch (e) { console.log(`· ERROR ${e.message}`); resultados.error = e.message; }
  fs.writeFileSync(path.join(SALIDA, 'cg65_resultados.json'), JSON.stringify(resultados, null, 1));
  console.log(`· listo → ${path.join(SALIDA, 'cg65_resultados.json')}`);
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { c.kill(); }
  srv.close(); process.exit(0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(2); });
