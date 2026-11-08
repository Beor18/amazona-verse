#!/usr/bin/env node
/* Amazona Verse · Kimi 1 — sonda mínima KIMI-336: ¿por qué la A sostenida no registra tecla
   en el camino real (portada→creador→Empezar) cuando V sí despega? Muestrea G.input.keys
   cada 150 ms durante la pulsación y cuenta eventos blur. Uso: node tools/build/kimi1_336_input_probe.js */
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

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p === '/') p = '/index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = () => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(JSON.stringify(d.error))) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(m, p, s, t) { const id = ++this.id; const msg = { id, method: m, params: p || {} }; if (s) msg.sessionId = s; this.ws.send(JSON.stringify(msg)); return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + m)); } }, t); }); }
  bombear(ms) { return new Promise(r => setTimeout(r, ms)); }
}
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception || r.exceptionDetails.text).slice(0, 400)); return r.result ? r.result.value : undefined; }
const tecla = (cdp, ses, tipo, codigo, clave, vk) => cdp.call('Input.dispatchKeyEvent', { type: tipo, code: codigo, key: clave, windowsVirtualKeyCode: vk }, ses);
async function raton(cdp, ses, tipo, x, y) { await cdp.call('Input.dispatchMouseEvent', { type: tipo, x, y, button: 'left', clickCount: tipo === 'mousePressed' || tipo === 'mouseReleased' ? 1 : 0 }, ses); }
async function clic(cdp, ses, x, y) { await raton(cdp, ses, 'mouseMoved', x, y); await raton(cdp, ses, 'mousePressed', x, y); await cdp.bombear(60); await raton(cdp, ses, 'mouseReleased', x, y); }

(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1c336p-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--window-size=1600,900', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'], { detached: true, stdio: 'ignore' });
  chrome.unref();
  let puertoDev, wsPath; const pf = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoDev) throw new Error('Chrome no abrió DevTools');
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  await cdp.call('Page.enable', {}, ses); await cdp.call('Runtime.enable', {}, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); } catch(e){}" }, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html?v18=1` }, ses);
  const t0 = Date.now(); let ok = false;
  while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!ok) throw new Error('no arrancó');
  await ev(cdp, ses, `(function(){const t=document.getElementById('title');if(t&&t.open){const b=t.querySelector('form[method=dialog] button');if(b)b.click();}return 1;})()`, 15);
  await cdp.bombear(1500);
  await ev(cdp, ses, `(function(){const s=document.getElementById('p-save');if(s)s.click();return 1;})()`, 15);
  const tm = Date.now();
  while (Date.now() - tm < 180000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) break; } catch (e) { } await cdp.bombear(0.5); }
  // esperar a que la pantalla de carga se oculte de verdad y saltar la intro como un niño
  const tc = Date.now();
  while (Date.now() - tc < 90000) { try { if (await ev(cdp, ses, `(function(){const c=document.getElementById('carga');return !c||!c.classList.contains('carga-vis');})()`, 10, false)) break; } catch (e) { } await cdp.bombear(0.5); }
  const ts = Date.now();
  while (Date.now() - ts < 30000) { try { if (await ev(cdp, ses, `(function(){const b=[...document.querySelectorAll('button')].find(x=>/saltar intro/i.test(x.textContent));if(b&&b.offsetParent!==null){b.click();return true;}return false;})()`, 10)) break; } catch (e) { } await cdp.bombear(0.5); }
  await cdp.bombear(3000);
  // contador de blur/focus ANTES de la captura (hipótesis: captureScreenshot quita el foco y soltarTodo() vacía keys)
  await ev(cdp, ses, `window.__blurT=0;window.__focusT=0;addEventListener('blur',()=>window.__blurT++);addEventListener('focus',()=>window.__focusT++);1`, 15);
  const pre = await ev(cdp, ses, `(function(){const a=document.activeElement;return {tag:a&&a.tagName,id:a&&a.id,cls:a&&a.className};})()`, 15);
  const foto0 = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 70 }, ses, 30000);
  const trasFoto = await ev(cdp, ses, `(function(){const a=document.activeElement;return {tag:a&&a.tagName,id:a&&a.id,cls:a&&a.className,blur:window.__blurT,focus:window.__focusT};})()`, 15);
  console.log('foco pre-foto:', JSON.stringify(pre));
  console.log('tras captureScreenshot:', JSON.stringify(trasFoto));
  await clic(cdp, ses, 800, 450);
  const post = await ev(cdp, ses, `(function(){const a=document.activeElement;return {tag:a&&a.tagName,id:a&&a.id,cls:a&&a.className};})()`, 15);
  await tecla(cdp, ses, 'keyDown', 'KeyA', 'a', 65);
  const m = [];
  for (let i = 0; i < 8; i++) { await cdp.bombear(150); m.push(await ev(cdp, ses, `(function(){const G=window.AV.G;return {k:[...G.input.keys],x:+G.S.pos.x.toFixed(2),z:+G.S.pos.z.toFixed(2),blur:window.__blurT,focus:window.__focusT,lastF:window.__lastF||null};})()`, 10)); }
  await tecla(cdp, ses, 'keyUp', 'KeyA', 'a', 65);
  console.log('foco post-clic:', JSON.stringify(post));
  console.log('muestras A:', JSON.stringify(m, null, 0));
  await tecla(cdp, ses, 'keyDown', 'KeyV', 'v', 86); await cdp.bombear(80); await tecla(cdp, ses, 'keyUp', 'KeyV', 'v', 86);
  await cdp.bombear(400);
  console.log('volar tras V:', JSON.stringify(await ev(cdp, ses, `(function(){const G=window.AV.G;return {flying:G.fisica.MOVE.flying,blur:window.__blurT};})()`, 10)));
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  await new Promise(r => setTimeout(r, 1000));
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  try { srv.close(); } catch (e) { }
  process.exit(0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
