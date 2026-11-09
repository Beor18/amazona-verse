#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-374: línea base VERDE con GPU real de la telemetría de
   vanos de QA-nuevo-br1-1 («bohiosTest sin vanos», intermitente SOLO en SwiftShader de la nube).
   Reproduce la tanda del rojo del barrido br1: selfTest → ambienteTest → bohiosTest en la MISMA
   página acumulada, leyendo G.solidos.vanos.get('bohio_redondo') (motivo/radio/rejilla/partes/tri/ms)
   justo antes de bohiosTest, que es lo que la fila de BUGS.md pide comparar con una corrida verde.
   ×N rondas con recarga de página entre rondas. El motor NO se toca.
   Uso: node tools/build/kimi1_374_vanos.js --etiqueta k374-r1 [--rondas 6] [--cpu 1]
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ETIQUETA = arg('--etiqueta', 'k374-r1');
const RONDAS = parseInt(arg('--rondas', '6'), 10);
const CPU = parseInt(arg('--cpu', '1'), 10);
const ANCHO = parseInt(arg('--ancho', '1600'), 10);
const ALTO = parseInt(arg('--alto', '900'), 10);
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi374'));
fs.mkdirSync(SALIDA, { recursive: true });
const LOGF = path.join(SALIDA, `k374_${ETIQUETA}.log`);
fs.writeFileSync(LOGF, '');
function log(msg) { try { fs.appendFileSync(LOGF, `[${new Date().toISOString().slice(11, 19)}] ${msg}\n`); } catch (e) { } }
const res = { tarea: 'KIMI-374', etiqueta: ETIQUETA, pantalla: `escritorio ${ANCHO}x${ALTO}@1 cpuX${CPU}`, rondas: [], head: null };
function guardar() { try { fs.writeFileSync(path.join(SALIDA, `k374_${ETIQUETA}.json`), JSON.stringify(res, null, 1)); } catch (e) { } }

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi1k374-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
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
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onclose = () => { for (const [, p] of this.pend) p.re2(new Error('WebSocket cerrado')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(method, params, sessionId, timeoutMs) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method, params: params || {}, sessionId })); if (timeoutMs) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + method)); } }, timeoutMs); }); }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function evaluar(cdp, ses, exp, timeoutS) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: true, returnByValue: true }, ses, (timeoutS || 30) * 1000);
  if (r.exceptionDetails) { const d = r.exceptionDetails; throw new Error('JS@' + (d.lineNumber != null ? d.lineNumber + ':' + d.columnNumber : '?') + ': ' + JSON.stringify(d.exception && d.exception.description || d.text).slice(0, 900)); }
  return r.result ? r.result.value : undefined;
}

function semillaSave() {
  const save = {
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1k374-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  };
  return `try {
  localStorage.clear(); sessionStorage.clear();
  window.__erroresConsola = [];
  addEventListener('error', e => __erroresConsola.push(String(e.message || e)));
  addEventListener('unhandledrejection', e => __erroresConsola.push('rechazo: ' + (e.reason && e.reason.message || e.reason)));
  const cerr = console.error; console.error = function () { try { __erroresConsola.push([].map.call(arguments, String).join(' ').slice(0, 300)); } catch (e) {} return cerr.apply(this, arguments); };
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', ${JSON.stringify(JSON.stringify(save))});
} catch (e) {}`;
}

const ENTRAR_JS = `(async () => { try { return await (async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene Jugar'; b.click();
    if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta'; }
  const S = window.AV && window.AV.state; if (!S) return 'sin AV.state';
  if (!await espera(() => S.profile && S.profile.created, 45000)) return 'sin perfil';
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(30000);
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 60000);
  const b = document.getElementById('c1-saltar'); if (b) b.click();
  await sleep(800);
  const f = document.getElementById('c1-fade'); if (f) f.remove();
  if (AV.G.ui && AV.G.ui.hideToast) AV.G.ui.hideToast();
  try { window.dispatchEvent(new PointerEvent('pointerdown')); } catch (e) {}
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

// la tanda acumulada del barrido br1: selfTest → ambienteTest → telemetría de vanos → bohiosTest
const RONDA_JS = `(async () => { try { return await (async () => {
  const G = AV.G, sleep = ms => new Promise(r => setTimeout(r, ms));
  const parse = r => ({ p: r && (r.passed != null ? r.passed : r.pasan != null ? r.pasan : r.ok), t: r && r.total,
    mal: ((r && r.results) || (r && r.checks) || []).filter(x => x && (x.pass === false || x.ok === false || x.passed === false)).map(x => (x.name || '?') + (x.extra ? ' — ' + String(x.extra).slice(0, 6000) : '')).slice(0, 4) });
  const out = {};
  out.self = parse(await AV.selfTest());
  await sleep(1500);
  out.amb = parse(await AV.ambienteTest());
  await sleep(1500);
  const t0 = performance.now();
  const listo = () => { const R = G.solidos && G.solidos.vanos && G.solidos.vanos.get('bohio_redondo'); return !!(R && R.listo); };
  if (G.solidos && G.solidos.terminar) G.solidos.terminar(true);
  while (!listo() && performance.now() - t0 < 60000) { if (G.solidos && G.solidos.terminar) G.solidos.terminar(true); await sleep(100); }
  const V = G.solidos && G.solidos.vanos && G.solidos.vanos.get('bohio_redondo');
  out.vanos = V ? { listo: !!V.listo, motivo: V.motivo == null ? null : String(V.motivo), radio: V.radio == null ? null : V.radio,
    rejilla: (V.nx == null || V.nz == null) ? null : V.nx + 'x' + V.nz,
    partes: V.partes ? V.partes.length : null,
    tri: V.partes ? Math.round(V.partes.reduce((a, q) => a + ((q.geo.index ? q.geo.index.count : q.geo.attributes.position.count) / 3), 0)) : null,
    ms: V.ms == null ? null : V.ms, esperaMs: Math.round(performance.now() - t0) } : null;
  out.bohios = parse(await AV.bohiosTest());
  out.errores = (window.__erroresConsola || []).slice(0, 10);
  return JSON.stringify(out); })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k374-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    `--window-size=${ANCHO},${ALTO}`, '--force-device-scale-factor=1', 'about:blank'];
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi1k374-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const watch = setInterval(() => { try { guardar(); } catch (e) { } log('…latido'); }, 5000);
  let tid = null;
  try {
    res.head = execSync('git rev-parse --short HEAD', { cwd: RAIZ }).toString().trim();
    log('HEAD ' + res.head + ' · ' + RONDAS + ' rondas de la tanda selfTest→ambienteTest→vanos→bohiosTest');
    const url = `${origen}/index.html?pack=cap1&mapa=real`;
    for (let ronda = 1; ronda <= RONDAS; ronda++) {
      log(`ronda ${ronda}/${RONDAS}: navegando…`);
      if (tid) { await cdp.call('Target.closeTarget', { targetId: tid }).catch(() => { }); tid = null; }
      tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
      const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
      for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
      await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: 1, mobile: false }, ses);
      try { await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses); } catch (e) { }
      await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: semillaSave() }, ses);
      await cdp.call('Page.navigate', { url }, ses);
      let listo = false;
      for (let i = 0; i < 300 && !listo; i++) {
        await cdp.bombear(1);
        try { listo = await evaluar(cdp, ses, `!!(window.AV && AV.state && AV.state.profile && AV.state.profile.created && !(AV.G && AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()))`, 10) === true; } catch (e) { }
      }
      if (!listo) { log(`ronda ${ronda}: el juego no arrancó en 300 s`); res.rondas.push({ ronda, error: 'no arrancó' }); guardar(); continue; }
      const ent = await evaluar(cdp, ses, ENTRAR_JS, 120);
      log(`ronda ${ronda}: entrada=${ent}`);
      if (ent !== 'ok') { res.rondas.push({ ronda, error: 'entrada: ' + ent }); guardar(); continue; }
      const t0 = Date.now();
      const out = JSON.parse(await evaluar(cdp, ses, RONDA_JS, 420));
      out.ronda = ronda; out.durSec = Math.round((Date.now() - t0) / 1000) ;
      res.rondas.push(out);
      const verde = out.bohios && out.bohios.p === out.bohios.t && (!out.bohios.mal || out.bohios.mal.length === 0);
      log(`ronda ${ronda}: self ${out.self && out.self.p}/${out.self && out.self.t} · amb ${out.amb && out.amb.p}/${out.amb && out.amb.t} · vanos ${JSON.stringify(out.vanos)} · bohios ${out.bohios && out.bohios.p}/${out.bohios && out.bohios.t} ${verde ? 'VERDE' : 'ROJO ' + JSON.stringify(out.bohios && out.bohios.mal)} · errores ${(out.errores || []).length} · ${out.durSec}s`);
      guardar();
    }
    res.resumen = {
      rondas: res.rondas.length,
      bohiosVerde: res.rondas.filter(r => r.bohios && r.bohios.p === r.bohios.t).length,
      bohiosRojo: res.rondas.filter(r => r.bohios && r.bohios.p !== r.bohios.t).length,
      erroresConsola: res.rondas.reduce((a, r) => a + ((r.errores || []).length ? 1 : 0), 0)
    };
    guardar();
    log('RESUMEN ' + JSON.stringify(res.resumen));
  } catch (e) {
    res.error = String(e && e.message || e).slice(0, 500); guardar(); log('ERROR ' + res.error);
  } finally {
    clearInterval(watch);
    try { guardar(); } catch (e) { }
    try { chrome.kill(); } catch (e) { }
    await cdp.bombear(1.5);
    mataPorPerfil();
    srv.close();
    log('fin (perfil ' + path.basename(perf) + ' limpiado)');
  }
})();
