#!/usr/bin/env node
/* Amazona Verse · Kimi 1 — mini comprobador: entra con semilla a cap1 y corre una prueba AV.*Test,
   devolviendo los casos en rojo. Uso: node tools/build/kimi1_una_prueba.js vecinosTest humorTest … */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PRUEBAS = process.argv.slice(2);
if (!PRUEBAS.length) { console.error('uso: node kimi1_una_prueba.js <test> [test…]'); process.exit(1); }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
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
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(m, p, s, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: m, params: p || {}, sessionId: s })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + m)); } }, t); }); }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function ev(cdp, ses, exp, t) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, returnByValue: true, awaitPromise: true }, ses, (t || 120) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 300));
  return r.result ? r.result.value : undefined;
}
const SEMILLA = `try { localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.capitulo', '1');
  localStorage.setItem('amazonaverse.save', JSON.stringify({ v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-mini-' + Math.random().toString(36).slice(2, 8), profile: { created: true, name: 'QA', look: null }, pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0, inv: {}, collected: [], complete: false, explorando: false, clock: 0, events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {}, comic: { title: 'c', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} }, evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false } }));
} catch (e) {}`;
(async () => {
  const { srv, puerto } = await servir();
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1p-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio', '--enable-precise-memory-info', '--window-size=500,900', 'about:blank'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let listo = false;
  try {
    const pf = path.join(perf, 'DevToolsActivePort');
    let puertoD = 0, wsP = '';
    for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoD = parseInt(l[0], 10); wsP = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
    const ws = new WebSocket(`ws://127.0.0.1:${puertoD}${wsP}`);
    const cdp = new CDP(ws); await cdp.listo();
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: 4 }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA }, ses);
    await cdp.call('Page.navigate', { url: `http://127.0.0.1:${puerto}/index.html` }, ses);
    for (let i = 0; i < 300 && !listo; i++) {
      await cdp.bombear(0.5);
      try { listo = await ev(cdp, ses, `(() => { const b = document.querySelector('[data-modo="aventura"]'); if (!b) return false; b.click(); return true; })()`, 5); } catch (e) {}
    }
    for (let i = 0; i < 240 && listo; i++) {
      await cdp.bombear(0.5);
      try { if (await ev(cdp, ses, `!!(window.AV && AV.G && AV.G.renderer && !AV.G.ui.worldHidden() && AV.G.renderer.stats().calls > 5)`, 5) === true) break; } catch (e) {}
    }
    await cdp.call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 420, id: 1 }] }, ses);
    await cdp.call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }, ses);
    for (const nombre of PRUEBAS) {
      try {
        const r = await ev(cdp, ses, `(async () => { const r = await AV.${nombre}(); return r; })()`, 600);
        const res = (r && r.results) || [];
        const rojos = res.filter(x => !x.ok).map(x => x.name + (x.extra ? ' [' + String(x.extra).slice(0, 90) + ']' : ''));
        console.log(nombre + ': ' + (r && typeof r.passed === 'number' ? r.passed + '/' + r.total : '?') + (rojos.length ? '  ROJOS: ' + JSON.stringify(rojos) : '  todo verde'));
      } catch (e) { console.log(nombre + ': ERROR ' + String(e.message).slice(0, 160)); }
    }
  } finally {
    try { chrome.kill(); } catch (e) {}
    try { require('child_process').execSync(`taskkill /PID ${chrome.pid} /T /F 2>NUL`, { stdio: 'ignore' }); } catch (e) {}
    srv.close();
    for (const p of fs.readdirSync(os.tmpdir()).filter(x => x.startsWith('kimi1p-'))) { try { fs.rmSync(path.join(os.tmpdir(), p), { recursive: true, force: true }); } catch (e) {} }
  }
  process.exit(0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
