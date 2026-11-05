#!/usr/bin/env node
/* KIMI-101 regresión: corre AV.musicaTest() aislado con GPU real tras el fix de audio.js. */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os');
const { spawn, execSync } = require('child_process');
const AQUI = __dirname; const RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.webp': 'image/webp' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function evaluar(cdp, ses, exp, ts) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: true, returnByValue: true }, ses, (ts || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 400)); return r.result ? r.result.value : undefined; }
(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k101m-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--disable-sync', '--window-size=800,600', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
  for (let i = 0; i < 150; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real` }, ses);
    const t0 = Date.now(); let listo = false;
    while (Date.now() - t0 < 120000) { try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10)) { listo = true; break; } } catch (e) { } await cdp.bombear(0.5); }
    if (!listo) throw new Error('no arrancó');
    const r = await evaluar(cdp, ses, `(async () => { const t = await AV.musicaTest(); return JSON.stringify({ passed: t.passed, total: t.total, fallos: (t.results || []).filter(x => !x.ok).map(x => x.name + ' :: ' + String(x.extra).slice(0, 200)) }); })()`, 180);
    console.log('musicaTest', r);
  } catch (e) { console.log('ERROR', String(e && e.message || e)); }
  try { chrome.kill('SIGKILL'); } catch (e) { }
  try { execSync('powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name=\'chrome.exe\'\\" | Where-Object { $_.CommandLine -like \'*kimi1k101m-*\' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"', { timeout: 30000, stdio: 'ignore' }); } catch (e) { }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close();
  process.exit(0);
})();
