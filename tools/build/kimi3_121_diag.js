#!/usr/bin/env node
/* Diagnóstico KIMI-121: ¿por qué W (CDP) no mueve a Vittata tras entrar? */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');
const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.css': 'text/css', '.webp': 'image/webp' };
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
  call(method, params, sessionId, timeoutMs) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method, params: params || {}, sessionId })); if (timeoutMs) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + method)); } }, timeoutMs); }); }
}
async function evaluar(cdp, ses, exp, timeoutS) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: true, returnByValue: true }, ses, (timeoutS || 30) * 1000);
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 600));
  return r.result ? r.result.value : undefined;
}
const SEMILLA = fs.readFileSync(path.join(AQUI, 'kimi3_121.js'), 'utf8').match(/const SEMILLA_SAVE_JS = `([\s\S]*?)`;/)[1];
const ENTRAR = fs.readFileSync(path.join(AQUI, 'kimi3_121.js'), 'utf8').match(/const ENTRAR_JS = `([\s\S]*?)`;/)[1];
(async () => {
  const { srv, puerto } = await servir();
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3k121d-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--window-size=1920,1080', '--force-device-scale-factor=1', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort');
  let puertoDev = 0, wsPath = '';
  for (let i = 0; i < 150; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA }, ses);
  await cdp.call('Page.navigate', { url: `http://127.0.0.1:${puerto}/index.html?pack=cap1&mapa=real&v18=1` }, ses);
  const t0 = Date.now();
  while (Date.now() - t0 < 120000) { try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10)) break; } catch (e) { } await new Promise(r => setTimeout(r, 500)); }
  console.log('entrada:', await evaluar(cdp, ses, ENTRAR, 120));
  await new Promise(r => setTimeout(r, 1500));
  const antes = await evaluar(cdp, ses, `(() => { const G = AV.G, S = AV.state; return JSON.stringify({
    pos: [S.pos.x.toFixed(1), S.pos.z.toFixed(1)], busy: !!(G.ui.busy && G.ui.busy()), oculto: !!(G.ui.worldHidden && G.ui.worldHidden()),
    pausa: !!(G.pausa && G.pausa.activa && G.pausa.activa()), dialogo: !!(G.dialogo && G.dialogo.open && G.dialogo.open()),
    cardOpen: !!G.ui.cardOpen, tarjetas: Array.from(document.querySelectorAll('[id], .card, dialog')).filter(e => e.offsetWidth > 40 && e.offsetHeight > 40 && !e.hidden && (e.tagName === 'DIALOG' || /card|toast|hud/i.test(e.id || e.className || ''))).map(e => (e.id || e.className || e.tagName)).slice(0, 12),
    flying: !!G.fisica.MOVE.flying, grounded: !!G.fisica.MOVE.grounded }); })()`, 20);
  console.log('estado:', antes);
  // W por CDP 3 s y re-leer
  await cdp.call('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 87, code: 'KeyW', key: 'w' }, ses);
  await new Promise(r => setTimeout(r, 300));
  const mid = await evaluar(cdp, ses, `(() => { const G = AV.G; return JSON.stringify({ keys: Array.from(G.input.keys), vx: G.fisica.MOVE.vx.toFixed(2), vz: G.fisica.MOVE.vz.toFixed(2) }); })()`, 15);
  console.log('con W pulsada:', mid);
  await new Promise(r => setTimeout(r, 2700));
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 87, code: 'KeyW', key: 'w' }, ses);
  const despues = await evaluar(cdp, ses, `(() => { const S = AV.state; return JSON.stringify({ pos: [S.pos.x.toFixed(2), S.pos.z.toFixed(2)] }); })()`, 15);
  console.log('pos tras 3 s de W:', despues);
  // Comparativa: evento DOM sintético
  await evaluar(cdp, ses, `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', bubbles: true, cancelable: true }))`, 10);
  await new Promise(r => setTimeout(r, 300));
  console.log('con keydown DOM:', await evaluar(cdp, ses, `(() => { const G = AV.G; return JSON.stringify({ keys: Array.from(G.input.keys), vx: G.fisica.MOVE.vx.toFixed(2), vz: G.fisica.MOVE.vz.toFixed(2) }); })()`, 15));
  await new Promise(r => setTimeout(r, 2000));
  console.log('pos tras DOM W:', await evaluar(cdp, ses, `(() => { const S = AV.state; return JSON.stringify({ pos: [S.pos.x.toFixed(2), S.pos.z.toFixed(2)] }); })()`, 15));
  await evaluar(cdp, ses, `window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w', bubbles: true, cancelable: true }))`, 10);
  try { chrome.kill(); } catch (e) { }
  try { execSync('powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name=\'chrome.exe\'\\" | Where-Object { $_.CommandLine -like \'*kimi3k121d-*\' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"', { timeout: 30000, stdio: 'ignore' }); } catch (e) { }
  srv.close(); process.exit(0);
})().catch(e => { console.error('FALLO', e); process.exit(1); });
