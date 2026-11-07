#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — QA-197: el rótulo «Descubriste» (#fx-descubre, fx.js, z 40)
   tiene que ESPERAR a que la pantalla esté libre (mismo criterio que QA-188/193: !G.ui.busy(),
   sin bocadillo del narrador, fuera de la apertura en negro) en vez de tapar la historia en el teléfono.

   Casos (una sola página, GPU real, iPhone 390x844@3 CPU×4, pack cap1 mapa real):
     A libre        → el rótulo sale enseguida
     B tarjeta      → con la tarjeta abierta espera oculto; al cerrarla sale
     C bocadillo    → con G.dialogo.activo() (narrador, que busy() no cubre) espera; al liberar sale
     D tope (--tope)→ con la tarjeta abierta 22 s se descarta (no salta muy tarde)
   Mide calls/tris/heap y fps base/final (el cambio es DOM: no debe mover nada) y guarda capturas
   de los momentos clave en docs/img/kimi197/.

   Uso: node tools/build/kimi2_qa197.js --etiqueta r1 [--tope]
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const LISTO_JS = CFG.listo_js || 'window.AV && window.AV.G';
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CON_TOPE = process.argv.indexOf('--tope') > 0;
const ETIQUETA = (process.argv.indexOf('--etiqueta') > 0 ? process.argv[process.argv.indexOf('--etiqueta') + 1] : 'r1');
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi197');
fs.mkdirSync(SALIDA, { recursive: true });

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi2q197-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
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
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); this.eventos = []; ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } else if (d.method) this.eventos.push(d); }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(method, params, sessionId, timeoutMs) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method, params: params || {}, sessionId })); if (timeoutMs) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + method)); } }, timeoutMs); }); }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function evaluar(cdp, ses, exp, timeoutS, promesa) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: promesa !== false, returnByValue: true }, ses, (timeoutS || 30) * 1000);
  if (r.exceptionDetails) { const d = r.exceptionDetails; throw new Error('JS@' + (d.lineNumber != null ? d.lineNumber + ':' + d.columnNumber : '?') + ': ' + JSON.stringify(d.exception && d.exception.description || d.text).slice(0, 600)); }
  return r.result ? r.result.value : undefined;
}

const SEMILLA_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi2q197-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null, species: 'vittata' },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;

const ENTRAR_JS = `(async () => { try { return await (async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene Jugar'; b.click();
    if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta'; }
  await espera(() => { try { const AV = window.AV; return AV && AV.G && AV.G.player3D && AV.G.S && AV.G.S.step != null && AV.G.renderer && AV.G.renderer.stats().calls >= 0; } catch (e) { return false; } }, 90000);
  try { const AV = window.AV; if (AV.G.intro && AV.G.intro.saltar) AV.G.intro.saltar(); } catch (e) {}
  await espera(() => { try { return window.AV.G.renderer.stats().calls > 5; } catch (e) { return false; } }, 60000);
  await sleep(1500);
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

const MUESTRA_JS = `(async () => { try {
  const G = window.AV.G, m = G.renderer.renderer.info.memory;
  const fps = await new Promise(res => { let n = 0; const t0 = performance.now(); const ciclo = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(ciclo); else res(Math.round(n / 2)); }; requestAnimationFrame(ciclo); });
  return { heapMB: (performance.memory && performance.memory.usedJSHeapSize) ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
    geo: m.geometries, tex: m.textures, prog: G.renderer.renderer.info.programs.length,
    calls: G.renderer.stats().calls, tris: G.renderer.stats().triangulos, fps }; } catch (e) { return { err: String(e && e.message || e) }; } })()`;

const LEE_JS = `(() => { try { const c = document.getElementById('fx-descubre');
  return { existe: !!c, visible: !!c && c.style.display !== 'none' && getComputedStyle(c).display !== 'none' && getComputedStyle(c).opacity !== '0',
    texto: c ? (c.querySelector('.fx-d2') || {}).textContent || '' : '',
    cardAbierta: !!(window.AV && window.AV.G && window.AV.G.ui && window.AV.G.ui.cardOpen),
    busy: (() => { try { return window.AV.G.ui.busy(); } catch (e) { return null; } })() }; } catch (e) { return { err: String(e && e.message || e) }; } })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2q197-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--window-size=390,844', 'about:blank'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 150; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools en 30 s: ' + err.slice(0, 300));
}
function mataPorPerfil() {
  try {
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi2q197-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const res = { etiqueta: ETIQUETA, bug: 'QA-197 · #fx-descubre espera a pantalla libre (QA-188/193)', pantalla: 'movil 390x844@3 cpuX4 (iPhone emulado)', url: 'index.html?pack=cap1&mapa=real', head: null, casos: {}, base: null, final: null, erroresConsola: [] };
  const outJson = path.join(SALIDA, `qa197_${ETIQUETA}.json`);
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const t0all = Date.now();
  async function foto(nombre) {
    try { const r = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 70 }, ses); if (r && r.data) { fs.writeFileSync(path.join(SALIDA, `qa197_${ETIQUETA}_${nombre}.jpg`), Buffer.from(r.data, 'base64')); return true; } } catch (e) { }
    return false;
  }
  let ses;
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: 4 }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real` }, ses);
    let listo = false; const t0 = Date.now();
    while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${LISTO_JS})`, 10, false)) { listo = true; break; } } catch (e) { }
      await cdp.bombear(0.5);
    }
    if (!listo) throw new Error('motor no listo en ' + (CFG.espera_listo_s || 150) + ' s');
    const ent = await evaluar(cdp, ses, ENTRAR_JS, 120);
    if (String(ent) !== 'ok') throw new Error('entrar: ' + String(ent).slice(0, 120));
    res.head = await evaluar(cdp, ses, `(() => { try { return (AV.G.build && (AV.G.build.commit || AV.G.build.id)) || 'desconocido'; } catch (e) { return 'desconocido'; } })()`, 10, false);
    res.base = await evaluar(cdp, ses, MUESTRA_JS, 20);

    // A · libre → sale enseguida
    await evaluar(cdp, ses, `(() => { window.AV.G.emit('lugar', { id: 'qa197a', nombre: 'Punto QA-197 A' }); return 1; })()`, 10, false);
    await cdp.bombear(0.8);
    res.casos.A_libre = await evaluar(cdp, ses, LEE_JS, 10, false);
    await cdp.bombear(2.2); // que termine el fundido de 1,5 s

    // B · tarjeta abierta → espera; al cerrar sale
    await evaluar(cdp, ses, `(() => { window.AV.G.ui.showCard('<div style="padding:20px">QA-197 tarjeta de prueba</div>'); window.AV.G.emit('lugar', { id: 'qa197b', nombre: 'Punto QA-197 B' }); return 1; })()`, 10, false);
    await cdp.bombear(1.2);
    res.casos.B_tarjeta_espera = await evaluar(cdp, ses, LEE_JS, 10, false);
    await foto('b_tarjeta_abierta');
    await evaluar(cdp, ses, `(() => { window.AV.G.ui.hideCard(); return 1; })()`, 10, false);
    await cdp.bombear(1.0);
    res.casos.B_tras_cerrar = await evaluar(cdp, ses, LEE_JS, 10, false);
    await foto('b_tras_cerrar');
    await cdp.bombear(2.2);

    // C · bocadillo del narrador (G.dialogo.activo, que busy() no cubre) → espera; al liberar sale
    await evaluar(cdp, ses, `(() => { const G = window.AV.G; G.dialogo._qa197activo0 = G.dialogo.activo; G.dialogo.activo = () => true; G.emit('lugar', { id: 'qa197c', nombre: 'Punto QA-197 C' }); return 1; })()`, 10, false);
    await cdp.bombear(1.2);
    res.casos.C_bocadillo_espera = await evaluar(cdp, ses, LEE_JS, 10, false);
    await evaluar(cdp, ses, `(() => { const G = window.AV.G; G.dialogo.activo = G.dialogo._qa197activo0; delete G.dialogo._qa197activo0; return 1; })()`, 10, false);
    await cdp.bombear(1.0);
    res.casos.C_tras_liberar = await evaluar(cdp, ses, LEE_JS, 10, false);
    await cdp.bombear(2.2);

    // D · tope (~20 s retenido → se descarta; el cambio es deliberado: mejor perderlo que tapar la historia tarde)
    if (CON_TOPE) {
      await evaluar(cdp, ses, `(() => { window.AV.G.ui.showCard('<div style="padding:20px">QA-197 tope</div>'); window.AV.G.emit('lugar', { id: 'qa197d', nombre: 'Punto QA-197 D' }); return 1; })()`, 10, false);
      await cdp.bombear(22);
      res.casos.D_tope_durante = await evaluar(cdp, ses, LEE_JS, 10, false);
      await evaluar(cdp, ses, `(() => { window.AV.G.ui.hideCard(); return 1; })()`, 10, false);
      await cdp.bombear(1.5);
      res.casos.D_tras_tope = await evaluar(cdp, ses, LEE_JS, 10, false);
    }

    res.final = await evaluar(cdp, ses, MUESTRA_JS, 20);
    for (const ev of cdp.eventos) {
      if (ev.method === 'Log.entryAdded' && ev.params && ev.params.entry && ev.params.entry.level === 'error') res.erroresConsola.push(String(ev.params.entry.text).slice(0, 200));
      if (ev.method === 'Runtime.exceptionThrown') res.erroresConsola.push('EXCEPCION ' + JSON.stringify(ev.params.exceptionDetails && ev.params.exceptionDetails.exception && ev.params.exceptionDetails.exception.description || ev.params.exceptionDetails.text).slice(0, 200));
    }
  } catch (e) { res.error = String(e && e.message || e); }
  res.duracionS = Math.round((Date.now() - t0all) / 1000);
  fs.writeFileSync(outJson, JSON.stringify(res, null, 1));
  try { chrome.kill('SIGKILL'); } catch (e) { }
  mataPorPerfil();
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close();
  console.log('OK -> ' + outJson + (res.error ? ' · ERROR: ' + res.error : ''));
  process.exit(0);
})();
