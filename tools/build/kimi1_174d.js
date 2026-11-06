#!/usr/bin/env node
/* Diagnóstico mínimo: graba 8 s de un canvas 2D con rAF a 30 fps en headless y reporta la
   duración real del blob (metadata) para aislar si el fallo de duración es del entorno o del juego.
   No toca el repo: sin salidas. Uso: node tools/build/kimi1_174d.js */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(method, params, sessionId, timeoutMs) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method, params: params || {}, sessionId })); if (timeoutMs) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + method)); } }, timeoutMs); }); }
}

(async () => {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k174d-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--no-first-run', '--mute-audio', '--window-size=1280,720', '--force-device-scale-factor=1', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort');
  let w = null;
  for (let i = 0; i < 100 && !w; i++) {
    if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) w = { puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    await new Promise(r => setTimeout(r, 200));
  }
  const ws = new WebSocket(`ws://127.0.0.1:${w.puerto}${w.wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  await cdp.call('Page.enable', {}, ses);
  await cdp.call('Page.navigate', { url: 'about:blank' }, ses);
  const r = await cdp.call('Runtime.evaluate', {
    expression: `(async()=>{
      const resultados=[];
      for (const esquema of ['2d','webgl']) {
        const cv=document.createElement('canvas');cv.width=640;cv.height=360;document.body.appendChild(cv);
        if(esquema==='2d'){const x=cv.getContext('2d');const f=()=>{x.fillStyle='#224';x.fillRect(0,0,640,360);x.fillStyle='#fd5';x.fillRect((performance.now()/10)%560,80,80,80);requestAnimationFrame(f)};requestAnimationFrame(f);}
        else{const g=cv.getContext('webgl');const f=()=>{g.clearColor(Math.random(),0.3,0.3,1);g.clear(g.COLOR_BUFFER_BIT);requestAnimationFrame(f)};requestAnimationFrame(f);}
        for (const mime of ['video/mp4;codecs=avc1.42E01E','video/webm;codecs=vp9','video/webm;codecs=vp8']) {
          if(!MediaRecorder.isTypeSupported(mime))continue;
          const rec=new MediaRecorder(cv.captureStream(30),{mimeType:mime,videoBitsPerSecond:1600000});const ch=[];
          rec.ondataavailable=e=>{if(e.data&&e.data.size)ch.push(e.data)};rec.start(400);
          await new Promise(r=>setTimeout(r,8000));rec.stop();
          await new Promise(r=>{rec.onstop=r});
          const blob=new Blob(ch,{type:mime});const v=document.createElement('video');
          v.src=URL.createObjectURL(blob);await new Promise(r=>{v.onloadedmetadata=r});
          resultados.push({esquema,mime:mime.split(';')[0]+';'+mime.split(';codecs=')[1].slice(0,4),bytes:blob.size,dur:+v.duration.toFixed(1)});
        }
        cv.remove();
      }
      return JSON.stringify(resultados)
    })()`, awaitPromise: true, returnByValue: true
  }, ses, 90000);
  console.log('REPRO 8s x6:', r.result.value, r.exceptionDetails ? JSON.stringify(r.exceptionDetails).slice(0, 200) : '');
  try { chrome.kill(); } catch (e) { }
  process.exit(0);
})().catch(e => { console.error('FALLO', e); process.exit(1); });
