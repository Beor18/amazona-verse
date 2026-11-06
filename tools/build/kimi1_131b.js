#!/usr/bin/env node
/* Amazona Verse · Kimi 1 — KIMI-131/QA-179 (2ª parte): mide draw calls en el INSTANTE del arranque
   (mundoListo y los 20 s siguientes, sin asentar) con y sin ?v18=1, escritorio. Si la subida 131→195
   de la nube existe, es transitoria en ese tramo. El juego no se toca.
   Uso: node tools/build/kimi1_131b.js --etiqueta r1 */
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
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi131'));
fs.mkdirSync(SALIDA, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.webp': 'image/webp', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(method, params, sessionId, timeoutMs) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method, params: params || {}, sessionId })); if (timeoutMs) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + method)); } }, timeoutMs); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function evaluar(cdp, ses, exp, timeoutS, promesa) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: promesa !== false, returnByValue: true }, ses, (timeoutS || 30) * 1000); if (r.exceptionDetails) { const d = r.exceptionDetails; throw new Error('JS@' + JSON.stringify(d.exception && d.exception.description || d.text).slice(0, 300)); } return r.result ? r.result.value : undefined; }

const SEMILLA_JS = `try { localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({ v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-k131b-' + Math.random().toString(36).slice(2, 8), profile: { created: true, name: 'Estrella de la Bahía', look: null, species: 'vittata' }, pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0, inv: {}, collected: [], complete: false, explorando: false, clock: 0, events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {}, comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} }, evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false } }));
  localStorage.setItem('amazonaverse.v18', JSON.stringify({ v: 1, sel: 'vittata', especies: { vittata: 'seleccionada' }, inv: {}, otorgados: {}, mundo: {} }));
} catch (e) {}`;

/* tras mundoListo: muestra calls cada ~1 s durante 25 s SIN asentar; luego salta la intro y otras 2 muestras */
const TRANSIENTE_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G;
  const stats = () => { try { const s = G.renderer.stats(); return s.calls; } catch (e) { return -1; } };
  const muestras = [];
  const t0 = performance.now();
  while (performance.now() - t0 < 25000) { muestras.push({ t: Math.round(performance.now() - t0), calls: stats(), pend: (G.streaming && G.streaming.pendientes) || (G.streaming && G.streaming.pend) || null }); await sleep(1000); }
  try { if (G.intro && G.intro.saltar) G.intro.saltar(); } catch (e) {}
  await sleep(2500);
  const trasSalto = stats();
  return JSON.stringify({ muestras, trasSalto }); })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k131b-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', '--window-size=1600,900', 'about:blank'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 150; i++) { if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; } await new Promise(r => setTimeout(r, 200)); }
  throw new Error('Chrome no abrió DevTools: ' + err.slice(0, 200));
}
function mataPorPerfil() { try { const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi1k131b-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"; execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' }); } catch (e) { } }

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const res = { etiqueta: ETIQUETA, pantalla: 'escritorio 1600x900@1', head: null, rondas: [], error: null };
  const outJson = path.join(SALIDA, `k131b_${ETIQUETA}.json`);
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS }, ses);
    let ronda = 0;
    for (const carga of [{ id: 'sinbandera', q: '' }, { id: 'v18', q: '&v18=1' }, { id: 'sinbandera2', q: '' }, { id: 'v18b', q: '&v18=1' }]) {
      await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real${carga.q}` }, ses);
      const t0 = Date.now(); let listo = false;
      while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) { try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { } await cdp.bombear(0.5); }
      if (!listo) throw new Error('no arrancó (' + carga.id + ')');
      if (!res.head) res.head = await evaluar(cdp, ses, `(() => { try { return (AV.G.build && (AV.G.build.commit || AV.G.build.id)) || 'desconocido'; } catch (e) { return 'desconocido'; } })()`, 10);
      const r = JSON.parse(await evaluar(cdp, ses, TRANSIENTE_JS, 120));
      r.ronda = ++ronda; r.carga = carga.id;
      res.rondas.push(r);
      fs.writeFileSync(outJson, JSON.stringify(res, null, 1));
      const max = Math.max(...r.muestras.map(m => m.calls));
      console.log(`[${carga.id}] mundoListo→25s: max=${max} al inicio=${r.muestras[0].calls} trasSalto=${r.trasSalto}`);
    }
  } catch (e) { res.error = String(e && e.message || e); }
  fs.writeFileSync(outJson, JSON.stringify(res, null, 1));
  try { chrome.kill('SIGKILL'); } catch (e) { }
  mataPorPerfil();
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close();
  process.exit(res.error ? 1 : 0);
})();
