#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-131 / QA-179: con ?v18=1 la vista de arranque en escritorio
   sube de ~131 a ~195 draw calls (nube, SwiftShader). Esta sonda atribuye la subida con GPU real:
   carga el arranque (cap1, escritorio 1600×900) con y sin bandera, cuenta renderer.stats() y hace un
   censo de los hijos de primer nivel de la escena; los que solo aparecen con la bandera son los
   añadidos V18, y su coste se mide ocultándolos de uno en uno (calls con/sin).
   La entrada en escritorio pasa por el menú de modos: Jugar → #modos → [data-modo="aventura"].
   El juego no se toca.
   Uso: node tools/build/kimi1_131.js --etiqueta r1
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
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ETIQUETA = arg('--etiqueta', 'r1');
const ANCHO = 1600, ALTO = 900, DPR = 1;
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi131'));
fs.mkdirSync(SALIDA, { recursive: true });

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi1k131-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
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
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function evaluar(cdp, ses, exp, timeoutS, promesa) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: promesa !== false, returnByValue: true }, ses, (timeoutS || 30) * 1000);
  if (r.exceptionDetails) { const d = r.exceptionDetails; throw new Error('JS@' + (d.lineNumber != null ? d.lineNumber + ':' + d.columnNumber : '?') + ': ' + JSON.stringify(d.exception && d.exception.description || d.text).slice(0, 900)); }
  return r.result ? r.result.value : undefined;
}

const SEMILLA_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1k131-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null, species: 'vittata' },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
  localStorage.setItem('amazonaverse.v18', JSON.stringify({ v: 1, sel: 'vittata', especies: { vittata: 'seleccionada' }, inv: {}, otorgados: {}, mundo: {} }));
} catch (e) {}`;

const ENTRAR_JS = `(async () => { try { return await (async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene Jugar'; b.click();
    if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta'; }
  const m = $('modos');
  if (m && m.open) { const a = m.querySelector('[data-modo="aventura"]'); if (!a) return 'el menu de modos no tiene Aventura'; a.click();
    if (!await espera(() => !m.open, 5000)) return 'el menu de modos sigue abierto'; }
  await espera(() => { try { const AV = window.AV; return AV && AV.G && AV.G.player3D && AV.G.S && AV.G.S.step != null && AV.G.renderer && AV.G.renderer.stats().calls >= 0; } catch (e) { return false; } }, 90000);
  // gesto real de puntero: dispara alPrimerGesto (boot.js:70) y carga los 14 módulos AVV18* SIN saltar la intro
  // (la intro solo salta con keydown o el botón; QA-179 midió la vista de arranque con los módulos cargados)
  try { window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); } catch (e) {}
  await sleep(1200);
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

/* medición en la vista de arranque: calls/tris + censo de hijos de primer nivel con coste por ocultación.
   Con MODO_TRANSIENTO: sin asentar — muestras cada 1 s durante 30 s tras la entrada (el arranque real). */
const MODO_TRANSIENTO = process.argv.includes('--transitorio');
const MEDIR_JS = MODO_TRANSIENTO ? `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G;
  const stats = () => { try { const s = G.renderer.stats(); return s.calls; } catch (e) { return -1; } };
  const muestras = [];
  const t0 = performance.now();
  while (performance.now() - t0 < 30000) { muestras.push({ t: Math.round(performance.now() - t0), calls: stats() }); await sleep(1000); }
  return JSON.stringify({ calidad: (G.renderer && G.renderer.calidad && G.renderer.calidad.nivel) || '?', transitorio: true, muestras, final: stats() }); })()` : `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G;
  const stats = () => { const s = G.renderer.stats(); const m = G.renderer.renderer.info.memory; return { calls: s.calls, tris: s.triangulos, geo: m.geometries, tex: m.textures, prog: G.renderer.renderer.info.programs.length }; };
  const asentar = async () => { const t0 = performance.now();
    while (performance.now() - t0 < 45000) { try { if (G.renderer.stats().calls > 10) { await new Promise(r => requestAnimationFrame(r)); if (G.renderer.stats().calls > 10) return true; } } catch (e) {} await sleep(250); }
    return false; };
  await asentar(); await sleep(600);
  const out = { calidad: (G.renderer && G.renderer.calidad && G.renderer.calidad.nivel) || '?', arranque: null, hijos: [] };
  out.arranque = stats();
  const escena = G.renderer.scene || G.scene;
  let idx = 0;
  for (const c of escena.children) {
    const nombre = c.name || '(sin nombre ' + (c.type || '?') + ')';
    let nHijos = 0; c.traverse(o => { nHijos++; });
    let callsSiOculto = null;
    if (c.visible) {
      c.visible = false;
      await new Promise(r => requestAnimationFrame(r)); await new Promise(r => requestAnimationFrame(r));
      callsSiOculto = stats().calls;
      c.visible = true;
      await new Promise(r => requestAnimationFrame(r));
    }
    out.hijos.push({ i: idx++, nombre, tipo: c.type, hijos: nHijos, callsSiOculto: callsSiOculto, delta: callsSiOculto != null ? out.arranque.calls - callsSiOculto : 0 });
  }
  out.arranque2 = stats();
  return JSON.stringify(out); })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k131-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--window-size=' + ANCHO + ',' + ALTO, 'about:blank'];
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi1k131-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const res = { etiqueta: ETIQUETA, pantalla: `escritorio ${ANCHO}x${ALTO}@${DPR} cpuX1`, head: null, cargas: {}, error: null };
  const outJson = path.join(SALIDA, `k131_${ETIQUETA}.json`);
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: false }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS }, ses);
    const soloCargas = (arg('--cargas', '') || '').split(',').filter(Boolean);
    for (const carga of [{ id: 'sinbandera', q: '' }, { id: 'v18', q: '&v18=1' }].filter(c => !soloCargas.length || soloCargas.includes(c.id))) {
      await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real${carga.q}` }, ses);
      const t0 = Date.now(); let listo = false;
      while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
        try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
        await cdp.bombear(0.5);
      }
      if (!listo) throw new Error('el juego no arrancó (' + carga.id + ')');
      const ent = await evaluar(cdp, ses, ENTRAR_JS, 600);
      if (!/^ok/.test(ent)) throw new Error('entrada (' + carga.id + '): ' + ent);
      if (!res.head) res.head = await evaluar(cdp, ses, `(() => { try { return (AV.G.build && (AV.G.build.commit || AV.G.build.id)) || 'desconocido'; } catch (e) { return 'desconocido'; } })()`, 10);
      res.cargas[carga.id] = JSON.parse(await evaluar(cdp, ses, MEDIR_JS, 600));
      fs.writeFileSync(outJson, JSON.stringify(res, null, 1));
      const info = res.cargas[carga.id];
      console.log(`[${carga.id}] ` + (info.arranque ? `calls=${info.arranque.calls} tris=${info.arranque.tris} tex=${info.arranque.tex} hijos=${info.hijos.length}` : `transitorio: serie=${info.muestras.map(m => m.calls).join(',')} final=${info.final}`));
    }
  } catch (e) { res.error = String(e && e.message || e); }
  fs.writeFileSync(outJson, JSON.stringify(res, null, 1));
  try { chrome.kill('SIGKILL'); } catch (e) { }
  mataPorPerfil();
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close();
  process.exit(res.error ? 1 : 0);
})();
