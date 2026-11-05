#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — QA-53: diagnóstico fino del cuadro de apertura con la pantalla
   de carga (src/ui/carga.js). Móvil 375×812 dpr 3, CPU ×4, GPU real. Entra con jugador nuevo y vuelca:
     - AV.carga.corridas[0]: ms de carga, motivo, cuadroRevelar (peor cuadro del 1er s de juego), tCargado,
       msGPU y las etapas (mundo/zona/texturas/programas).
     - Los cuadros >150 ms con su reparto (update / ganchos render / dibujo-sin-warm / warm / dibujo).
     - Los 8 cuadros más largos de la sonda (tiempo desde el arranque de la página).
   Salida: docs/img/kimi017/apertura-<etiqueta>.json   Uso: node tools/build/kimi3_apertura.js --etiqueta x [--rondas 2] */
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
const PERFIL = process.argv.includes('--perfil'); // CPU profile (CDP Profiler) del reveal: atribuye cuadroRevelar
const BOMBA = parseInt((() => { const i = process.argv.indexOf('--bomba'); return i > 0 ? process.argv[i + 1] : '8'; })(), 10); // segundos de juego bombeados tras preparar (el ancla del perfil)
const REVELAR_AT = parseFloat((() => { const i = process.argv.indexOf('--revelarAt'); return i > 0 ? process.argv[i + 1] : String(Math.max(0.5, BOMBA - 11)); })(), 10); // segundos antes del fin del perfil donde cae el reveal (la carga dura ~10-12 s)
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi017');
fs.mkdirSync(SALIDA, { recursive: true });
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
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
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error de conexión'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message + ' ' + JSON.stringify(d.error.data || ''))) : p.re(d.result); } }; }
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
const SONDA_JS = `(() => { const Q = window.__qaM = { dt: [], top: [], t0: 0 }; let t = 0;
  const f = n => { if (!Q.t0) Q.t0 = n; if (t) { const d = n - t; Q.dt.push(d); const e = { d: Math.round(d), t: Math.round((t - Q.t0) / 100) / 10 };
    const i = Q.top.findIndex(x => x.d < e.d); if (i >= 0) Q.top.splice(i, 0, e); else if (Q.top.length < 8) Q.top.push(e); if (Q.top.length > 8) Q.top.pop(); } t = n;
    if (Q.dt.length > 60000) Q.dt.splice(0, 30000); requestAnimationFrame(f); }; requestAnimationFrame(f); })()`;
// cuadros largos con reparto de fases + el estado de la carga en el momento de cada uno
const LARGAS_JS = `(() => {
  const F = (window.__fases || []).slice();
  const C = (window.AV && AV.carga && AV.carga.corridas || []).map(c => ({ ms: c.ms, motivo: c.motivo,
    cuadroRevelar: c.cuadroRevelar, tCargado: c.tCargado, msGPU: c.msGPU, texSubidas: c.texSubidas,
    maxProg: c.maxProg, etapas: c.etapas, zona: c.zona && { radio: c.zona.radio, total: c.zona.total, faltan: c.zona.faltan }, ligero: c.ligero }));
  const largas = F.filter(e => (e[1] + e[2] + e[3] + e[4] + e[5]) > 120)
    .map(e => ({ t: e[0], update: e[1], ganchos: e[2], dibujo: e[3], warm: e[4], postYDibujo: e[5], total: e[1] + e[2] + e[3] + e[4] + e[5] }));
  return JSON.stringify({ carga: C, largas, top: (window.__qaM && window.__qaM.top) || [], nFases: F.length }); })()`;
function limpiarHuerfanos() {
  try {
    const ps = "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*kimi3a-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { /* sin powershell o sin huérfanos: seguir */ }
}
// Atribución de self-time por función dentro de una ventana del CPU profile (CDP), en µs del reloj del propio perfil.
// timeDeltas[i] = µs entre la muestra i-1 y la i: se atribuyen a samples[i-1] (convención de DevTools).
function resumirPerfil(p, desdeUs, hastaUs) {
  const nodos = new Map(); for (const n of p.nodes || []) nodos.set(n.id, n);
  const key = n => { const f = n.callFrame || {}; return (f.functionName || '(anon)') + ' · ' + String(f.url || '').split('/').pop() + ':' + (f.lineNumber + 1); };
  const por = new Map(); let t = p.startTime || 0; let total = 0;
  const S = p.samples || [], D = p.timeDeltas || [];
  for (let i = 1; i < S.length; i++) {
    t += D[i] || 0;
    if (t < desdeUs || t > hastaUs) continue;
    const n = nodos.get(S[i - 1]); if (!n) continue;
    const k = key(n); por.set(k, (por.get(k) || 0) + (D[i] || 0)); total += D[i] || 0;
  }
  const top = [...por.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18)
    .map(([k, us]) => ({ ms: Math.round(us / 100) / 10, fn: k }));
  return { desdeMs: Math.round(desdeUs / 1000), hastaMs: Math.round(hastaUs / 1000), ventanaMs: Math.round(total / 100) / 10, top };
}
async function lanzarChrome() {
  for (let intento = 0; intento < 3; intento++) {
    try { return await lanzarChromeUnaVez(); } catch (e) { await new Promise(r => setTimeout(r, 2500)); }
  }
  throw new Error('Chrome no arrancó');
}
async function lanzarChromeUnaVez() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3a-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--window-size=500,900', 'about:blank'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'pipe', 'pipe'] });
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
  throw new Error('Chrome no abrió DevTools en 30 s');
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
  console.log(`· móvil 375×812 dpr 3 · CPU ×${CPU} · apertura con carga (QA-53)`);
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
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}" + SONDA_JS }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1&fases=1` }, ses);
    if (!(await esperarListo(ses))) { console.log('  · el juego no arrancó'); res.rondas.push({ ronda, error: 'no arrancó' }); continue; }
    await cdp.bombear(2.0);
    if (PERFIL) { await cdp.call('Profiler.enable', {}, ses); await cdp.call('Profiler.start', {}, ses); }
    console.log('  · jugador nuevo: ' + await evaluar(cdp, ses, CFG.preparar_js, 300));
    await cdp.bombear(BOMBA); // primeros segundos de juego con el revelado hecho
    let perfil = null;
    if (PERFIL) {
      const p = (await cdp.call('Profiler.stop', {}, ses, 60000)).profile;
      // El reveal cae ~REVELAR_AT s antes del fin del perfil (carga ~10-12 s tras preparar, luego bombear(BOMBA)).
      const ancla = (p.endTime || 0) - REVELAR_AT * 1000000;
      const A = resumirPerfil(p, ancla - 1600000, ancla + 1600000); // reveal ±1,6 s (cuadroRevelar)
      const B = resumirPerfil(p, ancla + 3000000, ancla + 7000000); // +3…7 s: el warm-link post-reveal
      perfil = { revelar: A, despues: B };
      for (const [nombre, w] of [['reveal ±1,6 s', A], ['+3…7 s', B]]) {
        console.log(`  · perfil ${nombre}: ${w.ventanaMs} ms de self-time en la ventana (${w.desdeMs}…${w.hastaMs} µs)`);
        for (const f of w.top) console.log(`    ${f.ms} ms · ${f.fn}`);
      }
    }
    const diag = JSON.parse(await evaluar(cdp, ses, LARGAS_JS, 30, false));
    const errores = await evaluar(cdp, ses, 'JSON.stringify((window.__aveErrores || []).slice(0, 8))', 10, false);
    console.log('  · carga: ' + JSON.stringify(diag.carga));
    console.log('  · cuadros >120 ms (reparto update/ganchos/dibujo/warm/post):');
    for (const l of diag.largas) console.log(`    t=${l.t} total=${l.total} (u=${l.update} g=${l.ganchos} d=${l.dibujo} w=${l.warm} p=${l.postYDibujo})`);
    console.log('  · top sonda: ' + JSON.stringify(diag.top));
    console.log('  · errores: ' + errores);
    res.rondas.push({ ronda, ...diag, perfil, errores: JSON.parse(errores || '[]') });
    try { await cdp.call('Target.closeTarget', { targetId: tid }, undefined, 10); } catch (e) { /* ya cerrado */ }
  }
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { chrome.kill(); }
  srv.close();
  const ruta = path.join(SALIDA, `apertura-${ETIQUETA}.json`);
  fs.writeFileSync(ruta, JSON.stringify(res, null, 2));
  console.log(`· resultado en ${ruta}`);
})().catch(e => { console.error('FALLO:', e && e.stack || JSON.stringify(e) || String(e)); process.exit(2); });
