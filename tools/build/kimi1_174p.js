#!/usr/bin/env node
/* Valida un mp4 de kimi1_174v jugándolo en Chrome con ventana real y capturando pantallas a
   intervalos de pared (los fMP4 grabados no tienen índice de seek: hay que validar en reproducción).
   Uso: node tools/build/kimi1_174p.js --video k174_video-r6.mp4 [--muestras 2,7,12]
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');
const RAIZ = path.resolve(__dirname, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const VIDEO = arg('--video', 'k174_video-r6.mp4');
const MUESTRAS = (arg('--muestras', '2,7,12')).split(',').map(Number);
const DIR = path.join(RAIZ, 'docs', 'img', 'kimi174');

function servir() {
  const srv = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': { '.mp4': 'video/mp4' }[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(method, params, sessionId, timeoutMs) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method, params: params || {}, sessionId })); if (timeoutMs) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + method)); } }, timeoutMs); }); }
}

(async () => {
  const { srv, puerto } = await servir();
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k174p-'));
  const chrome = spawn(CHROME, ['--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--no-first-run', '--mute-audio', '--autoplay-policy=no-user-gesture-required',
    '--window-size=1300,800', '--window-position=40,40', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort');
  let w = null;
  for (let i = 0; i < 100 && !w; i++) {
    if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) w = { puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    await new Promise(r => setTimeout(r, 200));
  }
  if (!w) throw new Error('sin DevTools ' + err.slice(0, 200));
  const ws = new WebSocket(`ws://127.0.0.1:${w.puerto}${w.wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  await cdp.call('Page.enable', {}, ses);
  await cdp.call('Page.navigate', { url: `http://127.0.0.1:${puerto}/docs/img/kimi174/${VIDEO}` }, ses);
  await new Promise(r => setTimeout(r, 1200));
  const info = await cdp.call('Runtime.evaluate', { expression: `(async()=>{const v=document.querySelector('video');if(!v)return 'ERR';v.play();await new Promise(r=>{if(v.readyState>=1)r();else v.onloadedmetadata=r});return JSON.stringify({dur:+v.duration.toFixed(1),seekable:v.seekable.length?+v.seekable.end(0).toFixed(1):null,w:v.videoWidth})})()`, awaitPromise: true, returnByValue: true }, ses, 20000);
  console.log('info:', info.result.value);
  let ant = 0;
  for (const m of MUESTRAS) {
    await new Promise(r => setTimeout(r, Math.max(0, (m - ant) * 1000))); ant = m;
    const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses);
    const out = path.join(DIR, VIDEO.replace(/\.mp4$/, `_p${m}s.jpg`));
    fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
    const st = await cdp.call('Runtime.evaluate', { expression: `(()=>{const v=document.querySelector('video');return JSON.stringify({t:+v.currentTime.toFixed(1),fin:v.ended})})()`, returnByValue: true }, ses);
    console.log('muestra', m, 's de pared → video t=', st.result.value, '→', out);
  }
  try { chrome.kill(); } catch (e) { }
  try { execSync('powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name=\'chrome.exe\'\\" | Where-Object { $_.CommandLine -like \'*kimi1k174p-*\' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"', { timeout: 20000, stdio: 'ignore' }); } catch (e) { }
  srv.close();
  process.exit(0);
})().catch(e => { console.error('FALLO', e); process.exit(1); });
