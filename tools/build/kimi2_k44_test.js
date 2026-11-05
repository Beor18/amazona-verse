#!/usr/bin/env node
/* KIMI-044 · ciudadVivaTest aislado en página fresca (iPhone 390x844 dpr 3, CPU x4, GPU real, «bajo» natural).
   Uso: node tools/build/kimi2_k44_test.js [--espera 90] */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ESPERA = parseInt(arg('--espera', '90'), 10);
let PERFIL = null, CHROME_PID = null;
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
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
  async bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function evaluar(cdp, ses, exp, timeoutS, promesa) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: promesa !== false, returnByValue: true }, ses, (timeoutS || 30) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 400));
  return r.result ? r.result.value : undefined;
}
async function lanzarChrome() {
  PERFIL = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2k44t-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + PERFIL, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', '--window-size=500,900'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  CHROME_PID = chrome.pid;
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(PERFIL, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) { if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; } await new Promise(r => setTimeout(r, 200)); }
  throw new Error('Chrome no abrió DevTools: ' + err.slice(0, 300));
}
function matarChrome() { if (!CHROME_PID) return; try { execSync(`taskkill /PID ${CHROME_PID} /T /F 2>NUL`, { stdio: 'ignore' }); } catch (e) { /* ya muerto */ } CHROME_PID = null; }
const SEMILLA_JS = `try { localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({ v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-k44t-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null }, pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 1,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0, events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} }, evaluated: { A: true, B: true }, examined: { maquina: true, transmisor: true } }));
} catch (e) {}`;
(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  let lanzado = null;
  for (let i = 0; i < 3 && !lanzado; i++) { try { lanzado = await lanzarChrome(); } catch (e) { await new Promise(r => setTimeout(r, 1500)); } }
  if (!lanzado) { console.log('· Chrome no arrancó'); process.exit(1); }
  const { chrome, puerto: puertoDev, wsPath } = lanzado;
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws);
  await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }, ses);
  await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
  await cdp.call('Emulation.setCPUThrottlingRate', { rate: 4 }, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS }, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1&mapa=real` }, ses);
  const t0 = Date.now(); let listo = false;
  while (Date.now() - t0 < 150000) { try { if (await evaluar(cdp, ses, `!!(window.AV && AV.G && AV.G.actores && (AV.G.actores.player3D || AV.G.actores.failed3D))`, 10, false)) { listo = true; break; } } catch (e) {} await cdp.bombear(0.5); }
  if (!listo) { console.log('· no arrancó'); matarChrome(); process.exit(1); }
  await cdp.bombear(2);
  await evaluar(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id); const b = $('title').querySelector('form[method=dialog] button'); b.click(); await sleep(2500); if (AV.cargaEsperar) await AV.cargaEsperar(60000); return 'ok'; })()`, 120);
  console.log('· ciudadVivaTest({ espera: ' + ESPERA + ' }) en página fresca…');
  const r = JSON.parse(await evaluar(cdp, ses, `(async () => { const r = await AV.ciudadVivaTest({ espera: ${ESPERA} }); return JSON.stringify({ passed: r.passed, total: r.total, fallos: r.results.filter(x => !x.ok).map(x => x.name + ' :: ' + String(x.extra).slice(0, 200)), solido: r.results.find(x => x.name.indexOf('sólido') >= 0), tejados: r.results.find(x => x.name.indexOf('tejados') >= 0) }); })()`, 900));
  console.log(`· ${r.passed}/${r.total}` + (r.fallos.length ? ' · FALLOS: ' + r.fallos.join(' | ') : ''));
  console.log('· ' + JSON.stringify(r.solido));
  console.log('· ' + JSON.stringify(r.tejados));
  console.log('· errores: ' + await evaluar(cdp, ses, 'JSON.stringify((window.__aveErrores || []).slice(0, 6))', 10, false));
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { matarChrome(); }
  srv.close();
  process.exit(r.fallos.length ? 3 : 0);
})().catch(e => { console.error('FALLO:', e && e.message || String(e)); matarChrome(); process.exit(2); });
