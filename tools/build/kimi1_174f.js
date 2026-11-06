#!/usr/bin/env node
/* Amazona Verse · Kimi 1 — KIMI-174(c) aux: extrae 2 fotogramas (JPEG) de un mp4 grabado por
   kimi1_174v.js para verificar en cuadro (Vittata a un lado + línea naranja de puntos de apuntado).
   Uso: node tools/build/kimi1_174f.js --video k174_video-r2.mp4 [--segundos 4,14]
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const VIDEO = arg('--video', 'k174_video-r2.mp4');
const SEGS = (arg('--segundos', '4,14')).split(',').map(Number);
const DIR = path.join(RAIZ, 'docs', 'img', 'kimi174');

function servir() {
  const srv = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': { '.mp4': 'video/mp4', '.html': 'text/html' }[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); });
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
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k174f-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--disable-gpu', '--no-first-run', '--mute-audio', '--window-size=1280,720', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort');
  let ws0 = null;
  for (let i = 0; i < 100 && !ws0; i++) {
    if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) ws0 = { puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    await new Promise(r => setTimeout(r, 200));
  }
  if (!ws0) throw new Error('sin DevTools: ' + err.slice(0, 200));
  const ws = new WebSocket(`ws://127.0.0.1:${ws0.puerto}${ws0.wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  await cdp.call('Page.enable', {}, ses);
  await cdp.call('Page.navigate', { url: `http://127.0.0.1:${puerto}/docs/img/kimi174/${VIDEO}` }, ses);
  const salidas = [];
  for (const s of SEGS) {
    const r = await cdp.call('Runtime.evaluate', {
      expression: `(async()=>{const v=document.querySelector('video');if(!v)return'ERR sin video';v.pause();await new Promise(r=>{if(v.readyState>=1)return r();v.addEventListener('loadedmetadata',r,{once:true})});v.currentTime=${s};await new Promise(r=>{const f=()=>{v.removeEventListener('seeked',f);setTimeout(r,350)};v.addEventListener('seeked',f)});const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);return JSON.stringify({dur:+v.duration.toFixed(1),t:+v.currentTime.toFixed(1),w:v.videoWidth,url:v.currentSrc.slice(0,80),jpg:c.toDataURL('image/jpeg',0.85)})})()`,
      awaitPromise: true, returnByValue: true
    }, ses, 30000);
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300));
    const durl = r.result.value;
    let info = {};
    try { info = JSON.parse(durl); } catch (e) { throw new Error('frame: ' + String(durl).slice(0, 200)); }
    console.log(JSON.stringify({ seg: s, dur: info.dur, t: info.t, w: info.w }));
    if (!/^data:image/.test(info.jpg)) throw new Error('sin jpg');
    const out = path.join(DIR, VIDEO.replace(/\.mp4$/, `_f${s}.jpg`));
    fs.writeFileSync(out, Buffer.from(info.jpg.split(',')[1], 'base64'));
    salidas.push(out);
  }
  console.log(JSON.stringify(salidas));
  try { chrome.kill(); } catch (e) { }
  try { execSync('powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name=\'chrome.exe\'\\" | Where-Object { $_.CommandLine -like \'*kimi1k174f-*\' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"', { timeout: 20000, stdio: 'ignore' }); } catch (e) { }
  srv.close();
  process.exit(0);
})().catch(e => { console.error('FALLO', e); process.exit(1); });
