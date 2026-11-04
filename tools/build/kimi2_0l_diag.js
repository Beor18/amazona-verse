#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-025/0l: diagnostico de por que la ciudad viva no puebla
   en la sesion de medida (aves 0 con quiet false). Mismo arnes que kimi2_vecinos.js: Chrome headless
   propio + CDP; movil 375x812 dpr 3, CPU x4, GPU real. Entra con el flujo de jugador nuevo, fija
   «bajo», teletransporta a la Ciudad de los 36 y vuelca el estado interno de ciudadViva/vecinos
   antes y despues de forzar un paso. Uso: node tools/build/kimi2_0l_diag.js [--cpu 4]
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
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
let CHROME_PROC = null;
const CPU = parseFloat(arg('--cpu', '4'));
const SALIDA = arg('--salida', path.join(AQUI, 'salida', 'kimi2-0l-diag'));
fs.mkdirSync(SALIDA, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };

function servir() {
  const QA_TAG = '<script src="tests/qa/qa.js" charset="utf-8"></script>';
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    const qa = /[?&]qa=1(?:&|$)/.test(req.url);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); return res.end('404'); }
      if (qa && /index\.html$/.test(f)) d = Buffer.from(d.toString('utf8').replace(/<meta charset[^>]*>/i, m => m + QA_TAG), 'utf8');
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(d);
    });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message + ' ' + JSON.stringify(d.error.data || ''))) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(method, params, sessionId, timeoutMs) {
    const id = ++this.id;
    return new Promise((re, re2) => {
      this.pend.set(id, { re, re2 });
      this.ws.send(JSON.stringify({ id, method, params: params || {}, sessionId }));
      if (timeoutMs) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + method)); } }, timeoutMs);
    });
  }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}

async function evaluar(cdp, ses, exp, timeoutS, promesa) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: promesa !== false, returnByValue: true }, ses, (timeoutS || 30) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 400));
  return r.result ? r.result.value : undefined;
}

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2d-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', '--window-size=500,900'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrio DevTools en 60 s: ' + err.slice(0, 300));
}

const SONDA_JS = `(() => { const Q = window.__qaM = { dt: [] }; let t = 0;
  const f = n => { if (t) Q.dt.push(n - t); t = n; if (Q.dt.length > 40000) Q.dt.splice(0, 20000); requestAnimationFrame(f); }; requestAnimationFrame(f); })();`;

const DIAG_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)); const G = AV.G, S = G.S, C = G.ciudadViva, V = G.vecinos;
  const out = {};
  out.quiet = !!G.quiet;
  out.calidad = G.renderer.calidad && G.renderer.calidad.nivel;
  out.perfilCreado = !!(S.profile && S.profile.created);
  out.pos = { x: Math.round(S.pos.x), z: Math.round(S.pos.z) };
  out.cvExiste = !!C; out.vecExiste = !!V;
  if (C) { const s = C.sitio(); out.sitio = s ? { x: Math.round(s.x), z: Math.round(s.z), r: Math.round(s.r), ins: s.ins.length } : null;
    out.avesAntes = C.aves().length; out.pasoRet = C.paso(0.05); out.avesTrasPaso = C.aves().length; }
  if (V) { const e = V.estado(); out.vecEstado = e; }
  return JSON.stringify(out); })()`;

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  let lanzado = null;
  for (let i = 0; i < 3 && !lanzado; i++) {
    try { lanzado = await lanzarChrome(); }
    catch (e) { console.log('· lanzamiento ' + (i + 1) + ' fallo: ' + e.message.slice(0, 160)); await new Promise(r => setTimeout(r, 1500)); }
  }
  if (!lanzado) { console.log('· Chrome no arranco'); process.exit(1); }
  const { chrome, perf, puerto: puertoDev, wsPath } = lanzado;
  CHROME_PROC = chrome;
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws);
  await cdp.listo();
  console.log(`· servidor ${origen} · Chrome headless GPU real · movil 375x812 dpr 3 · CPU x${CPU}`);

  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 3, mobile: true }, ses);
  await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
  await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
  await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}" + SONDA_JS }, ses);

  await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1&mapa=real` }, ses);
  const t0 = Date.now();
  let listo = false;
  while (Date.now() - t0 < CFG.espera_listo_s * 1000) {
    try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { /* aun no */ }
    await cdp.bombear(0.5);
  }
  if (!listo) { console.log('· el juego no arranco'); process.exit(1); }
  await cdp.bombear(2.0);
  console.log('· jugador nuevo: ' + await evaluar(cdp, ses, CFG.preparar_js, 300));
  console.log('· calidad: ' + await evaluar(cdp, ses, `(() => { const R = AV.G.renderer; if (R.calidad) R.calidad.manual = true; if (R.setCalidad) R.setCalidad('bajo'); return R.calidad && R.calidad.nivel; })()`, 15, false));
  await cdp.bombear(3.0);
  console.log('· diagnostico en spawn: ' + await evaluar(cdp, ses, DIAG_JS, 60));
  await evaluar(cdp, ses, `(AV.teleport(-4, -130.8), AV.debug.camYaw(-1.87), (AV.G.mundo.streaming && AV.G.mundo.streaming.alrededor(-4, -130.8).catch(() => {})), 'ok')`, 60, false);
  await cdp.bombear(8.0);
  console.log('· diagnostico en la ciudad (+8 s): ' + await evaluar(cdp, ses, DIAG_JS, 60));
  await cdp.bombear(8.0);
  console.log('· diagnostico en la ciudad (+16 s): ' + await evaluar(cdp, ses, DIAG_JS, 60));
  const errs = await evaluar(cdp, ses, 'JSON.stringify((window.__aveErrores || []).slice(0, 8))', 10, false);
  console.log('· errores de consola: ' + errs);
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { chrome.kill(); }
  srv.close();
  process.exit(0);
})().catch(e => { console.error('FALLO:', e && e.stack || JSON.stringify(e) || String(e)); try { if (CHROME_PROC) CHROME_PROC.kill(); } catch (_) { /* ya muerto */ } process.exit(2); });
