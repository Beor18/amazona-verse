#!/usr/bin/env node
/* Amazona Verse · Kimi 1 — KIMI-178 diagnóstico: ¿el límite de rAF (~31 ms) fija la línea de
   tiempo del fMP4 del juego en headless? Graba 12 s del mundo con RAF_LIMIT y reporta la
   duración que Chrome deriva (video.duration) + el mvhd. No toca el repo: sin salidas.
   Uso: node tools/build/kimi1_178d.js */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');
const RAIZ = path.resolve(__dirname, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.mp4': 'video/mp4', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (req.method === 'POST' && u.pathname === '/__k178d/grabar') {
      const dest = path.join(RAIZ, 'docs', 'img', 'kimi178', path.basename(u.searchParams.get('nombre') || 'probe.mp4'));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      const f = fs.createWriteStream(dest);
      req.pipe(f);
      f.on('finish', () => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ bytes: fs.statSync(dest).size })); });
      return;
    }
    let p = path.normalize(decodeURIComponent(u.pathname)).replace(/^(\.\.[/\\])+/, '');
    if (p === '/' || p === '\\') p = '/index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end('404'); } else { res.writeHead(200, { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(d); } });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(method, params, sessionId, timeoutMs) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method, params: params || {}, sessionId })); if (timeoutMs) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + method)); } }, timeoutMs); }); }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function evaluar(cdp, ses, exp, timeoutS, promesa) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: promesa !== false, returnByValue: true }, ses, (timeoutS || 30) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 400));
  return r.result ? r.result.value : undefined;
}
const RAF_LIMIT_JS = `try {
  window.__rafOri = window.requestAnimationFrame.bind(window);
  window.__rafUlt = 0;
  window.requestAnimationFrame = function (cb) {
    return window.__rafOri(function (ts) {
      const ahora = performance.now(), ult = window.__rafUlt;
      const falta = 31 - (ahora - ult);
      if (!ult || falta <= 0) { window.__rafUlt = ahora; try { cb(ts); } catch (e) { } }
      else setTimeout(function () { window.requestAnimationFrame(cb); }, falta);
    });
  };
} catch (e) {}`;
const SEMILLA = `try { localStorage.clear(); localStorage.setItem('amazonaverse.v18on','1');
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({ v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-k178d',
    profile: { created: true, name: 'Diagnóstico', look: null }, pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0, events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0,1,2,3], captions: {}, vinetas: {} }, evaluated: { A:false,B:false }, examined: { maquina:false, transmisor:false } }));
} catch (e) {}`;
const ENTRAR = `(async()=>{ const sleep=ms=>new Promise(r=>setTimeout(r,ms)),$=id=>document.getElementById(id);
  const espera=async(f,ms)=>{const t0=performance.now();while(performance.now()-t0<ms){try{if(f())return true;}catch(e){}await sleep(100);}return false;};
  const t=$('title'); if(t&&t.open){const b=t.querySelector('form[method=dialog] button'); if(!b)return 'sin Jugar'; b.click(); await espera(()=>!t.open,5000);}
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(30000);
  await espera(()=>{try{return !(AV.G.ui&&AV.G.ui.worldHidden&&AV.G.ui.worldHidden());}catch(e){return false;}},60000);
  const b=$('c1-saltar'); if(b)b.click(); await sleep(800); const f=$('c1-fade'); if(f)f.remove();
  try{window.dispatchEvent(new PointerEvent('pointerdown'));}catch(e){} return 'ok'; })()`;

(async () => {
  const { srv, puerto } = await servir();
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k178d-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--window-size=1920,1080',
    '--force-device-scale-factor=1', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const pf = path.join(perf, 'DevToolsActivePort');
  let w = null;
  for (let i = 0; i < 150 && !w; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) w = { puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; } await new Promise(r => setTimeout(r, 200)); }
  const ws = new WebSocket(`ws://127.0.0.1:${w.puerto}${w.wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: RAF_LIMIT_JS }, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA }, ses);
  await cdp.call('Page.navigate', { url: `http://127.0.0.1:${puerto}/index.html?pack=cap1&mapa=real` }, ses);
  const t0 = Date.now(); let listo = false;
  while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) { try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!listo) throw new Error('no arrancó');
  console.log('entrada:', await evaluar(cdp, ses, ENTRAR, 120));
  const r = await evaluar(cdp, ses, `(async()=>{ const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    const cv=document.querySelector('canvas'); const stream=cv.captureStream(0);
    const pista=stream.getVideoTracks()[0];
    const mime=(['video/mp4;codecs=avc1.42E01E','video/mp4'].find(m=>MediaRecorder.isTypeSupported(m)));
    const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:1200000}); const ch=[];
    rec.ondataavailable=e=>{if(e.data&&e.data.size)ch.push(e.data)}; rec.start(400);
    let bombea=true; const bombeo=()=>{ if(!bombea) return; try{ pista.requestFrame(); }catch(e){} setTimeout(bombeo, 33); }; bombeo();
    await sleep(12000); bombea=false; rec.stop(); await new Promise(r=>{rec.onstop=r});
    const blob=new Blob(ch,{type:mime}); const v=document.createElement('video');
    v.src=URL.createObjectURL(blob); await new Promise(r=>{v.onloadedmetadata=r});
    const enPagina=+v.duration.toFixed(1);
    const fd=await fetch('/__k178d/grabar?nombre=probe.mp4',{method:'POST',body:blob}).then(r=>r.json());
    return JSON.stringify({bytes:blob.size, durEnPagina:enPagina, fd}); })()`, 60, true);
  console.log('REPRO 12s captureStream(0)+requestFrame:', r);
  // lectura del archivo guardado en pestaña nueva
  const tid2 = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses2 = (await cdp.call('Target.attachToTarget', { targetId: tid2, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses2);
  await cdp.call('Page.navigate', { url: `http://127.0.0.1:${puerto}/docs/img/kimi178/probe.mp4` }, ses2);
  console.log('desde archivo:', await evaluar(cdp, ses2, `(async()=>{ const v=document.querySelector('video'); if(!v) return 'sin video';
    try { await new Promise((res,re)=>{ v.onloadedmetadata=res; v.onerror=()=>re(new Error('carga')); setTimeout(()=>re(new Error('timeout')),20000); }); } catch(e){ return String(e.message||e); }
    return JSON.stringify({dur:+v.duration.toFixed(1), w:v.videoWidth, h:v.videoHeight}); })()`, 40, true));
  try { chrome.kill(); } catch (e) { }
  try { execSync('powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name=\'chrome.exe\'\\" | Where-Object { $_.CommandLine -like \'*kimi1k178d-*\' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"', { timeout: 30000, stdio: 'ignore' }); } catch (e) { }
  srv.close(); process.exit(0);
})().catch(e => { console.error('FALLO', e && e.message || e); process.exit(1); });
