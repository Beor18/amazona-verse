#!/usr/bin/env node
/* KIMI-3 · PLAYTEST-cap1-paso4 · repro instrumentado en vivo del paso 4 «Pósate y observa las 4 capas»
   (BUGS.md PLAYTEST-cap1-paso4, abierto desde el 4-nov: el playtest CG-58 se queda en el paso 4 con 6 intentos).
   Réplica de tests/qa/temporada_movil_correr.js (Playwright no está en esta PC) con Chrome headless propio + CDP:
   página del juego, inyección de ep_caminar.js + temporada_movil.js, AV.temporadaMovilTest({caps:[1]}) con el pulgar,
   capturando la traza [CG3]/[W17] (AV_E2E_LOG) con los logs nuevos de percha (posado/nb/card).

   Uso: node tools/build/kimi3_playtest_cap1.js [--cpu N] [--salida DIR] [--etiqueta r1]
   El juego no se toca: solo corre el bot de QA y vuelca la traza. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const CPU = parseFloat(arg('--cpu', '1'));
const ETIQUETA = arg('--etiqueta', 'r1');
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi3playtest4'));
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); this.ev = []; ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } else if (d.method) for (const f of this.ev) { try { f(d); } catch (e) { } } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  on(f) { this.ev.push(f); }
  call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result ? r.result.value : undefined; }
(async () => {
  fs.mkdirSync(SALIDA, { recursive: true });
  const logF = path.join(SALIDA, 'playtest-cap1-' + ETIQUETA + '.log');
  const lineas = [];
  const pinta = l => { lineas.push(l); console.log(l); fs.appendFileSync(logF, l + '\n'); };
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3pt4-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--window-size=1280,800'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let errC = ''; chrome.stderr.on('data', d => { errC += d; });
  const limpiar = () => { try { chrome.kill(); } catch (e) { } try { srv.close(); } catch (e) { } };
  process.on('SIGINT', () => { limpiar(); process.exit(2); });
  let puertoDev, wsPath;
  const pf = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoDev) { limpiar(); throw new Error('Chrome no abrió DevTools ' + errC.slice(0, 200)); }
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
  // móvil táctil como temporada_movil_correr.js (390×844, iPhone, toques) + CPU opcional
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, ses);
  await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
  await cdp.call('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' }, ses);
  await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
  await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
  const errores = [];
  cdp.on(d => {
    if (d.method === 'Runtime.consoleAPICalled') {
      const txt = (d.params.args || []).map(a => a.value !== undefined ? a.value : (a.description || a.type)).join(' ');
      if (/^\[(CG3|W17)\]/.test(txt)) pinta(txt.slice(0, 500));
      if (d.params.type === 'error') errores.push(txt.slice(0, 300));
    } else if (d.method === 'Runtime.exceptionThrown') {
      errores.push(('EXC ' + JSON.stringify(d.params.exceptionDetails && d.params.exceptionDetails.exception && d.params.exceptionDetails.exception.description || d.params.exceptionDetails.text)).slice(0, 300));
    }
  });
  await cdp.call('Page.navigate', { url: `${origen}/index.html` }, ses);
  pinta(`· servidor ${origen} · 390×844 dpr 2 táctil · CPU ×${CPU} · etiqueta ${ETIQUETA}`);
  const t0 = Date.now(); let listo = false;
  while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(window.AV && AV.G && AV.G.actores && (AV.G.actores.player3D || AV.G.actores.failed3D))`, 10, false)) { listo = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!listo) { limpiar(); throw new Error('el juego no arrancó en 240 s'); }
  await ev(cdp, ses, 'window.AV_E2E_LOG = true; "ok"', 10, false);
  pinta('· juego listo, AV_E2E_LOG activado; inyectando ep_caminar.js + temporada_movil.js…');
  for (const f of ['ep_caminar.js', 'ep3_e2e.js', 'ep4_e2e.js', 'ep5_e2e.js', 'ep6_e2e.js', 'temporada_movil.js']) {
    const cod = fs.readFileSync(path.join(RAIZ, 'tests', 'qa', f), 'utf8');
    await ev(cdp, ses, 'eval(' + JSON.stringify(cod) + '); "ok"', 60, false);
  }
  pinta('· scripts listos · arranca temporadaMovilTest caps:[1] con el pulgar…');
  await ev(cdp, ses, `(() => { const o = AV.epCaminar; window.__ultimoEp = null; AV.epCaminar = async (c, op) => { const r = await o(c, op); window.__ultimoEp = r; return r; }; return 'ok'; })()`, 30, false);
  let r = null, fallo = null;
  try { r = await ev(cdp, ses, `AV.temporadaMovilTest({ caps: [1], idioma: 'es' })`, 2400); } catch (e) { fallo = e.message; }
  pinta('· temporadaMovilTest devolvió en ' + Math.round((Date.now() - t0) / 60000) + ' min' + (fallo ? ' · EXCEPCIÓN: ' + fallo.slice(0, 300) : ''));
  const ep = await ev(cdp, ses, 'JSON.stringify(window.__ultimoEp || null)', 60, false).then(x => { try { return JSON.parse(x); } catch (e) { return null; } }).catch(() => null);
  if (r) {
    pinta('· resultado: ' + r.passed + '/' + r.total);
    const rojos = (r.results || []).filter(x => !x.ok);
    for (const x of rojos.slice(0, 30)) pinta('  ✗ ' + x.name + (x.extra ? ' :: ' + String(x.extra).slice(0, 220) : ''));
    if (ep) for (const m of (ep.md || '').split('\n')) if (m.startsWith('|') || m.startsWith('###') || m.indexOf('s de juego') === 0) pinta('  ' + m);
    fs.writeFileSync(path.join(SALIDA, 'playtest-cap1-' + ETIQUETA + '.json'), JSON.stringify({ cpu: CPU, etiqueta: ETIQUETA, passed: r.passed, total: r.total, rojos: rojos.map(x => ({ name: x.name, extra: String(x.extra || '').slice(0, 300) })), resultados: r.results, tramos: ep && ep.tramos && ep.tramos.es ? ep.tramos.es.tramos : null, atascos: ep && ep.tramos && ep.tramos.es ? ep.tramos.es.atascos : null, errores }, null, 1));
  }
  pinta('· errores de consola capturados por el runner: ' + errores.length + (errores.length ? ' · ' + errores.slice(0, 3).join(' | ') : ''));
  try { const errsJuego = await ev(cdp, ses, 'JSON.stringify((window.__aveErrores || []).slice(0, 8))', 10, false); pinta('· __aveErrores de la página: ' + errsJuego); } catch (e) { }
  limpiar();
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { pinta('· aviso: perfil temporal no se pudo borrar (se libera solo): ' + perf); }
  process.exit(0);
})().catch(e => { console.error('FALLO: ' + (e && e.message || e)); process.exit(1); });
