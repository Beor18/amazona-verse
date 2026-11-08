#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-226: vigilancia post-KIMI-219 (GLB cuantizados).
   Chrome headless propio + CDP; 1600×900 dpr 1, calidad «media». Tras el flujo real
   (portada → creador → Empezar), captura el spawn (ceiba/flamboyán de entorno) y,
   por teleport absoluto, la Ciudad de los 36 (complejo_ruinas) en 2 encuadres.
   Stats de renderer tras 2 rAF + captura JPG por vista.
   Salida: docs/img/kimi229/k229_<vista>.jpg y k229_stats.json

   Uso: node tools/build/kimi1_226_capturas.js
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

const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi229');
fs.mkdirSync(SALIDA, { recursive: true });
const ANCHO = 1600, ALTO = 900;

// Vistas por teleport absoluto (x, z, alzar, yaw rad — 0 = −z)
const VISTAS = [
  { id: 'ciudad_norte', x: -4, z: -127, alzar: 3, yaw: 0 },
  { id: 'ciudad_sur', x: -4, z: -127, alzar: 3, yaw: Math.PI },
];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p === '/') p = '/index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
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

(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1c226-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', `--window-size=${ANCHO},${ALTO}`, '--hide-scrollbars'], { detached: true, stdio: 'ignore' });
  chrome.unref();
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } }
    await new Promise(r => setTimeout(r, 200));
  }
  if (!puertoDev) throw new Error('Chrome no abrió DevTools');
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
  const consola = [];
  ws.addEventListener('message', m => {
    try { const d = JSON.parse(m.data); if (d.method === 'Log.entryAdded' && d.params && d.params.entry && d.params.entry.level === 'error') consola.push(d.params.entry.text); } catch (e) { }
  });
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); } catch(e){}" }, ses);
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: 1, mobile: false }, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html` }, ses);
  const t0 = Date.now(); let ok = false;
  while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!ok) throw new Error('no arrancó');
  console.log('· preparar: ' + await ev(cdp, ses, CFG.preparar_js, 300));
  // Cerrar la tarjeta «¡Así se juega!» si está abierta (tap en «¡A jugar!»)
  await ev(cdp, ses, `(function(){const b=[...document.querySelectorAll('button')].find(x=>/¡A jugar!/i.test(x.textContent));if(b){b.click();return 'cerrada';}return 'no-estaba';})()`, 15);
  await cdp.bombear(800);
  const stats = {};

  // Vista 0: spawn tal cual (ceiba/flamboyán del entorno)
  await ev(cdp, ses, `new Promise(r=>{let n=0;const f=()=>{if(++n>6)r(1);else requestAnimationFrame(f)};requestAnimationFrame(f)})`, 30);
  let s0 = await ev(cdp, ses, `(function(){const G=window.AV.G;return Object.assign(window.AV.renderer?{}:{},G.renderer.stats(),{px:G.S.pos.x,pz:G.S.pos.z});})()`, 30);
  stats.spawn = s0;
  let foto = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 30000);
  fs.writeFileSync(path.join(SALIDA, 'k229_spawn.jpg'), Buffer.from(foto.data, 'base64'));
  console.log('· spawn:', JSON.stringify(s0));

  for (const v of VISTAS) {
    // cerrar la tarjeta de controles si sigue abierta (se cierra al moverte)
    await ev(cdp, ses, `(function(){const b=[...document.querySelectorAll('button')].find(x=>/A jugar/i.test(x.textContent));if(b){b.click();return 'cerrada';}return 'no-estaba';})()`, 15);
    try { await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyW', key: 'w', windowsVirtualKeyCode: 87 }, ses, 5000); await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyW', key: 'w', windowsVirtualKeyCode: 87 }, ses, 5000); } catch (e) { }
    await cdp.bombear(400);
    await ev(cdp, ses, `(function(){const AV=window.AV,G=AV.G;AV.teleport(${v.x},${v.z});G.S.pos.y+=(${v.alzar});G.S.vy=0;if(${v.yaw}!=null)AV.debug.camYaw(${v.yaw});return 1;})()`, 30);
    for (let i = 0; i < 4; i++) {
      await cdp.bombear(500);
      await ev(cdp, ses, `(function(){const AV=window.AV,G=AV.G;G.S.pos.x=${v.x};G.S.pos.z=${v.z};G.S.vy=0;if(${v.yaw}!=null)AV.debug.camYaw(${v.yaw});return 1;})()`, 15);
    }
    await ev(cdp, ses, `new Promise(r=>{let n=0;const f=()=>{if(++n>2)r(1);else requestAnimationFrame(f)};requestAnimationFrame(f)})`, 30);
    const sv = await ev(cdp, ses, `(function(){const G=window.AV.G;return G.renderer.stats();})()`, 30);
    stats[v.id] = sv;
    foto = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 30000);
    fs.writeFileSync(path.join(SALIDA, `k229_${v.id}.jpg`), Buffer.from(foto.data, 'base64'));
    console.log('· ' + v.id + ':', JSON.stringify(sv));
  }
  fs.writeFileSync(path.join(SALIDA, 'k229_stats.json'), JSON.stringify({ head: (await ev(cdp, ses, `window.AV.G.revision||''`, 10)), consola_errores: consola, stats }, null, 1));
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  try { chrome.kill(); } catch (e) { }
  srv.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e.message || e); process.exit(1); });
