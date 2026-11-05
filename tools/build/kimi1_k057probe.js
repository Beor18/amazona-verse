#!/usr/bin/env node
/* Amazona Verse · Kimi 1 — KIMI-057: atribución del tiempo del evento setCalidad tras diferir
   la reconstrucción de vegetación. Mide en la MISMA sesión (misma contención):
     t_veg  = G.vegetacion.actualizar()  → exactamente lo que el gancho 'calidad' ejecutaba
             dentro del evento antes de KIMI-057 (pasada síncrona completa).
     t_flip = setCalidad('medio'→'bajo') con KIMI-057 (vegetación diferida; el evento solo marca).
     t_flip2= setCalidad de vuelta (bajo→'medio').
   Así se separa la parte de vegetación (ahora fuera del evento) de lo que queda dentro
   (renderer subirTexturas(8), aplicarSombras/Post, guineo, terreno, agua, look…).

   Uso: node tools/build/kimi1_k057probe.js [--etiqueta r1]
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ETIQUETA = arg('--etiqueta', 'r1');
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi053');
fs.mkdirSync(SALIDA, { recursive: true });
const ANCHO = 375, ALTO = 812, DPR = 3, CPU = 4;
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
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
const SEMILLA_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.capitulo', '1');
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(m, p, s, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: m, params: p || {}, sessionId: s })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + m)); } }, t); }); }
}
async function ev(cdp, ses, exp, t) { const r = await cdp.call('Runtime.evaluate', { expression: exp, returnByValue: true, awaitPromise: true }, ses, (t || 60) * 1000); if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 300)); return r.result ? r.result.value : undefined; }

(async () => {
  const { srv, puerto } = await servir();
  const perfil = path.join(require('os').tmpdir(), 'kimi1k057-' + Math.random().toString(36).slice(2, 8));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perfil,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--enable-logging=stderr', '--v=0', `--window-size=${ANCHO},${ALTO}`, 'about:blank'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perfil, 'DevToolsActivePort');
  let puertoDev = 0, wsPath = '';
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } }
    await new Promise(r => setTimeout(r, 200));
  }
  if (!puertoDev) throw new Error('Chrome no abrió DevTools en 60 s: ' + err.slice(0, 200));
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); await new CDP(ws).listo();
  const cdp = new CDP(ws);
  const { targetId } = await cdp.call('Target.createTarget', { url: 'about:blank' });
  const { sessionId: ses } = await cdp.call('Target.attachToTarget', { targetId, flatten: true });
  await cdp.call('Page.enable', {}, ses);
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
  await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
  await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true }, ses);
  await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
  await ev(cdp, ses, SEMILLA_JS, 10);
  console.log(`· KIMI-057 probe · móvil ${ANCHO}×${ALTO} dpr ${DPR} · CPU ×${CPU} · GPU real · etiqueta ${ETIQUETA}`);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS }, ses);
  await cdp.call('Page.navigate', { url: `http://127.0.0.1:${puerto}/index.html?calidad=medio` }, ses);
  // Entrada como las baterías: tarjeta Aventura → mundo jugable → saltar intro
  let clicado = false;
  for (let i = 0; i < 150 && !clicado; i++) {
    await new Promise(r => setTimeout(r, 500));
    try { clicado = !!(await ev(cdp, ses, `(() => { const b = document.querySelector('[data-modo="aventura"]'); if (!b) return false; b.click(); return true; })()`, 5)); } catch (e) {}
  }
  if (!clicado) throw new Error('no apareció la tarjeta Aventura');
  let jugable = false;
  for (let i = 0; i < 240 && !jugable; i++) {
    await new Promise(r => setTimeout(r, 500));
    try { jugable = !!(await ev(cdp, ses, `(() => { const G = window.AV && AV.G; if (!G || !G.ui || G.ui.worldHidden()) return false; const st = (() => { try { return G.renderer.stats(); } catch (e) { return null; } })(); return st && st.calls > 5; })()`, 5)); } catch (e) {}
  }
  if (!jugable) throw new Error('el mundo no llegó a jugable');
  await ev(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)); for (let i = 0; i < 200; i++) { const b = document.getElementById('c1-saltar'); if (b && b.isConnected) { b.click(); return; } await sleep(100); } })()`, 40);
  await new Promise(r => setTimeout(r, 1500));
  await ev(cdp, ses, `(async () => {
    window.__renderRuns = 0;
    AV.G.on('render', () => { window.__renderRuns++; }, 999);
    await new Promise(r => setTimeout(r, 3000));
    return window.__renderRuns;
  })()`, 30);
  const r = await ev(cdp, ses, `(async () => {
    const R = AV.G.renderer, V = AV.G.vegetacion;
    const out = { nivel0: R.calidad.nivel, ses0: V.stats().ses };
    // 1) coste de la pasada síncrona completa de vegetación (lo que el evento hacía antes)
    let t0 = performance.now(); V.actualizar(); out.t_veg = Math.round(performance.now() - t0);
    out.stats_veg = V.stats();
    // 2) flip medio→bajo con KIMI-057 (vegetación solo marca; la sesión corre en cuadros siguientes)
    t0 = performance.now(); R.setCalidad('bajo', true); out.t_flip = Math.round(performance.now() - t0);
    out.nivel1 = R.calidad.nivel;
    out.ses_tras_flip = V.stats().ses; // ¿el handler marcó la sesión?
    // cuadros durante 3 s tras el flip (la sesión troceada corre aquí)
    const cuadros = []; let ult = performance.now();
    await new Promise(done => {
      function m() { const a = performance.now(); cuadros.push(Math.round(a - ult)); ult = a; if (performance.now() - t0 < 1500) requestAnimationFrame(m); else done(); }
      requestAnimationFrame(m);
    });
    cuadros.shift();
    cuadros.sort((a, b) => a - b);
    out.post_flip = { n: cuadros.length, p50: cuadros[Math.floor(cuadros.length * 0.5)] || 0, p95: cuadros[Math.floor(cuadros.length * 0.95)] || 0, peor: cuadros[cuadros.length - 1] || 0, n200: cuadros.filter(c => c > 200).length };
    out.stats_post = V.stats();
    out.ses_post = V.stats().ses;
    out.renderRuns_post = window.__renderRuns;
    // 3) flip de vuelta bajo→medio
    t0 = performance.now(); R.setCalidad('medio', true); out.t_flip2 = Math.round(performance.now() - t0);
    await new Promise(r2 => setTimeout(r2, 2500));
    out.stats_final = V.stats();
    out.ses_final = V.stats().ses;
    out.nivel2 = R.calidad.nivel;
    return JSON.stringify(out);
  })()`, 150);
  const datos = JSON.parse(r);
  datos.etiqueta = ETIQUETA;
  fs.writeFileSync(path.join(SALIDA, `k057_probe_${ETIQUETA}.json`), JSON.stringify(datos, null, 2));
  console.log(JSON.stringify(datos, null, 2));
  try { execSync(`taskkill /PID ${chrome.pid} /T /F`, { stdio: 'ignore' }); } catch (e) {}
  srv.close();
  process.exit(0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
