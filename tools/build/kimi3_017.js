#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-Task-017: medición del lag en móvil al moverse por el mundo.
   Chrome headless propio + CDP (sin librerías), móvil 375×812 dpr 3 táctil con UA de iPhone, CPU ×4, GPU real.
   Jugador nuevo (cap1): portada → Jugar → creador → Empezar; se mide la apertura y luego un «vuelo» por
   tramos con teleports espaciados (sin drenar el streaming: reacciona como en el juego), midiendo los
   cuadros de cada tramo. Meta de la tarea: ningún cuadro > 200 ms tras «Empezar», p95 < 50 ms.
   Salida: docs/img/kimi017/mediciones-<etiqueta>.json   Uso: node tools/build/kimi3_017.js --etiqueta antes */
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
const ETIQUETA = (() => { const i = process.argv.indexOf('--etiqueta'); return i > 0 ? process.argv[i + 1] : 'x'; })();
const RONDAS = parseInt((() => { const i = process.argv.indexOf('--rondas'); return i > 0 ? process.argv[i + 1] : '1'; })(), 10);
const CPU = parseFloat((() => { const i = process.argv.indexOf('--cpu'); return i > 0 ? process.argv[i + 1] : '4'; })(), 10);
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi017');
fs.mkdirSync(SALIDA, { recursive: true });
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

// vuelo del cap. 1: Villa Raíz → lomas → río oeste → ciudad del tepuy → meseta (posiciones del mundo real)
const TRAMOS = [
  { id: 'villa_raiz', x: 134, z: 183 },
  { id: 'camino_oeste', x: 60, z: 150 },
  { id: 'colina_lonas', x: -10, z: 112 },
  { id: 'lomas', x: -85, z: 95 },
  { id: 'rio_oeste', x: -133, z: -42 },
  { id: 'ciudad_tepuy', x: -59, z: -102 },
  { id: 'meseta', x: -46, z: -121 },
];
const NTRAMOS = parseInt((() => { const i = process.argv.indexOf('--tramos'); return i > 0 ? process.argv[i + 1] : String(TRAMOS.length - 1); })(), 10);
const SEG_TRAMO = 3.5;
const FASES = process.argv.includes('--fases'); // KIMI-017: reparte los cuadros largos (update/ganchos/calentado/dibujo) + trabajos de streaming >25 ms

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); return res.end('404'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(d);
    });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); this.eventos = []; ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error de conexión'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message + ' ' + JSON.stringify(d.error.data || ''))) : p.re(d.result); } else if (d.method) this.eventos.push(d); }; }
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
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.exception && r.exceptionDetails.exception.value || r.exceptionDetails.text).slice(0, 400));
  return r.result ? r.result.value : undefined;
}

const SONDA_JS = `(() => { const Q = window.__qaM = { dt: [], top: [] }; let t = 0, t0 = 0;
  const f = n => { if (!t0) t0 = n; if (t) { const d = n - t; Q.dt.push(d); const e = { d: Math.round(d), t: Math.round((t - t0) / 100) / 10 };
    const i = Q.top.findIndex(x => x.d < e.d); if (i >= 0) Q.top.splice(i, 0, e); else if (Q.top.length < 8) Q.top.push(e); if (Q.top.length > 8) Q.top.pop(); } t = n;
    if (Q.dt.length > 40000) Q.dt.splice(0, 20000); requestAnimationFrame(f); }; requestAnimationFrame(f); })()`;
const MEDIR_JS = `(() => { const Q = window.__qaM || { dt: [], top: [] }; const d = Q.dt.slice(), n = d.length;
  const orden = d.slice().sort((a, b) => a - b);
  const q = p => n ? Math.round(orden[Math.min(n - 1, Math.floor(n * p))]) : 0;
  let st = {}; try { const R = window.AV && AV.G && AV.G.renderer; st = (R && R.stats && R.stats()) || {}; } catch (e) {}
  Q.dt = []; Q.top = [];
  return JSON.stringify({ cuadros: n, p50: q(0.5), p95: q(0.95), peor: n ? Math.round(orden[n - 1]) : 0, mas50: d.filter(x => x > 50).length, mas100: d.filter(x => x > 100).length, mas200: d.filter(x => x > 200).length, top: (Q.top || []).slice(0, 5), calls: st.calls != null ? st.calls : null, ktris: st.triangulos != null ? Math.round(st.triangulos / 1000) : null }); })()`;
// mueve a Vittata a un tramo mirando al siguiente (sin drenar el streaming: reacciona como en el juego)
const TRAMO_JS = (v, sig, nLentos) => `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
  const t0 = performance.now();
  let y = 30; try { y = (G.terreno.height ? G.terreno.height(${v.x}, ${v.z}) : 30) + 2; } catch (e) {}
  S.pos.x = ${v.x}; S.pos.y = y + 12; S.pos.z = ${v.z}; // 12 m de altura: vuelo rasante, la zona entra por el borde
  try { const M = G.fisica.MOVE; M.flying = true; M.posado = ''; M.grounded = false; M.speed = 30; } catch (e) {}
  try { const dx = ${sig.x} - ${v.x}, dz = ${sig.z} - ${v.z}; G.camara.yaw = Math.atan2(dx, dz); G.camara.place(true); } catch (e) {}
  await sleep(${Math.round(SEG_TRAMO * 1000)});
  const st = (() => { try { return AV.G.renderer.stats(); } catch (e) { return {}; } })();
  return JSON.stringify({ pos: Math.round(S.pos.x) + ',' + Math.round(S.pos.z), calls: st.calls, ktris: st.triangulos != null ? Math.round(st.triangulos / 1000) : null,
    fases: (window.__fases || []).filter(e => e[0] >= t0),
    lentos: (((window.AV && AV.G && AV.G.trabajosLentos) || []).slice(${nLentos})) }); })()`;

async function lanzarChrome(intentos) {
  let ultimo = '';
  for (let intento = 0; intento < (intentos || 3); intento++) {
    try { return await lanzarChromeUnaVez(); } catch (e) { ultimo = e.message; await new Promise(r => setTimeout(r, 2500)); }
  }
  throw new Error(ultimo);
}
async function lanzarChromeUnaVez() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3v-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--enable-logging=stderr', '--v=0',
    '--window-size=500,900', 'about:blank'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let err = '';
  chrome.stderr.on('data', d => { err += d; });
  // Chrome 156 (Win) a veces delega en un proceso hijo y el lanzador sale code 0: no mirar exitCode,
  // solo esperar a que la flota escriba DevToolsActivePort en el perfil.
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    if (fs.existsSync(puertoFile)) {
      const l = fs.readFileSync(puertoFile, 'utf8').split('\n');
      const puerto = parseInt(l[0], 10), wsPath = (l[1] || '').trim();
      if (puerto > 0 && wsPath) return { chrome, perf, puerto, wsPath };
    }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('Chrome no abrió DevTools en 30 s: ' + err.slice(0, 300));
}
// Limpia huérfanos de vueltas anteriores: solo chrome cuya línea de comandos lleva el prefijo de perfil de este script.
function limpiarHuerfanos() {
  try {
    const ps = "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*kimi3v-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { /* sin powershell o sin huérfanos: seguir */ }
}

(async () => {
  limpiarHuerfanos();
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws);
  await cdp.listo();
  const res = { etiqueta: ETIQUETA, cuando: new Date().toISOString(), movil: { ancho: 375, alto: 812, dpr: 3, cpu: CPU, gpu: 'PC real (ANGLE/D3D11)' }, rondas: [] };
  console.log(`· móvil 375×812 dpr 3 · CPU ×${CPU} · vuelo cap1: ${TRAMOS.map(t => t.id).join(' → ')}`);

  async function esperarListo(ses) {
    const t0 = Date.now();
    while (Date.now() - t0 < CFG.espera_listo_s * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) return true; } catch (e) { /* aún no */ }
      await cdp.bombear(0.5);
    }
    return false;
  }

  for (let ronda = 1; ronda <= RONDAS; ronda++) {
    console.log(`· ronda ${ronda}/${RONDAS}`);
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 3, mobile: true }, ses);
    await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}" + SONDA_JS }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1${FASES ? '&fases=1' : ''}` }, ses);
    if (!(await esperarListo(ses))) { console.log('  · el juego no arrancó'); res.rondas.push({ ronda, error: 'no arrancó' }); continue; }
    await cdp.bombear(2.0);
    await evaluar(cdp, ses, MEDIR_JS, 30, false); // vacía el registro
    console.log('  · jugador nuevo: ' + await evaluar(cdp, ses, CFG.preparar_js, 300));
    await cdp.bombear(0.5);
    const apertura = JSON.parse(await evaluar(cdp, ses, MEDIR_JS, 30, false));
    console.log(`  · apertura tras «Empezar»: p50 ${apertura.p50} p95 ${apertura.p95} peor ${apertura.peor} ms (>100: ${apertura.mas100} · >200: ${apertura.mas200})`);
    const tramos = [];
    for (let i = 1; i < TRAMOS.length && i <= NTRAMOS; i++) {
      const v = TRAMOS[i], sig = TRAMOS[Math.min(i + 1, TRAMOS.length - 1)];
      await evaluar(cdp, ses, MEDIR_JS, 30, false); // vacía: solo este tramo
      const nLentos = await evaluar(cdp, ses, '((window.AV && AV.G && AV.G.trabajosLentos) || []).length', 10, false);
      const stats = JSON.parse(await evaluar(cdp, ses, TRAMO_JS(v, sig, nLentos || 0), 60));
      const me = JSON.parse(await evaluar(cdp, ses, MEDIR_JS, 30, false));
      tramos.push({ id: v.id, ...me, fases: FASES ? stats.fases : undefined, lentos: stats.lentos && stats.lentos.length ? stats.lentos : undefined });
      console.log(`  · vuelo ${v.id}: p50 ${me.p50} p95 ${me.p95} peor ${me.peor} ms (>100: ${me.mas100} · >200: ${me.mas200}) · ${stats.calls} calls · ${stats.ktris} k tris` +
        (stats.lentos && stats.lentos.length ? ` · trabajos >25 ms: ${stats.lentos.map(l => l.n + ' ' + l.ms + 'ms').join(', ')}` : ''));
    }
    const errores = await evaluar(cdp, ses, 'JSON.stringify((window.__aveErrores || []).slice(0, 8))', 10, false);
    console.log('  · errores de consola: ' + errores);
    res.rondas.push({ ronda, apertura, tramos, errores: JSON.parse(errores || '[]') });
    try { await cdp.call('Target.closeTarget', { targetId: tid }, undefined, 10); } catch (e) { /* ya cerrado */ }
  }
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { chrome.kill(); }
  srv.close();
  const ruta = path.join(SALIDA, `mediciones-${ETIQUETA}.json`);
  fs.writeFileSync(ruta, JSON.stringify(res, null, 2));
  console.log(`· resultado en ${ruta}`);
})().catch(e => { console.error('FALLO:', e && e.stack || JSON.stringify(e) || String(e)); process.exit(2); });
