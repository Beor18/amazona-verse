#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-150: poderes en exploración con GPU real.
   Corre AV.v18ExplorarTest() (los 10 poderes: los 8 nuevos + Grito y Escudo) en móvil emulado
   390×844 dpr 3 CPU ×4 con ?v18=1, y después ejercita cada poder por su especie real en el
   mundo (sel en localStorage + G real) midiendo FPS/draw calls/tris/heap antes y después.
   Basada en tools/build/kimi1_106.js. Escribe JSON incremental en docs/img/kimi150/.
   Uso: node tools/build/kimi3_150.js --etiqueta r1 [--escritorio]
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
const ETIQUETA = arg('--etiqueta', 'r1');
const ESCRITORIO = process.argv.includes('--escritorio');
const ANCHO = ESCRITORIO ? 1600 : 390, ALTO = ESCRITORIO ? 900 : 844, DPR = ESCRITORIO ? 1 : 3, CPUX = ESCRITORIO ? 1 : 4;
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi150'));
fs.mkdirSync(SALIDA, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };
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
async function evaluar(cdp, ses, exp, timeoutS) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: true, returnByValue: true }, ses, (timeoutS || 30) * 1000);
  if (r.exceptionDetails) { const d = r.exceptionDetails; throw new Error('JS@' + (d.lineNumber != null ? d.lineNumber + ':' + d.columnNumber : '?') + ': ' + JSON.stringify(d.exception && d.exception.description || d.text).slice(0, 900)); }
  return r.result ? r.result.value : undefined;
}
const SEMILLA_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi3k150-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null, species: 'vittata' },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
  localStorage.setItem('amazonaverse.v18', JSON.stringify({ v: 1, sel: 'vittata', especies: { vittata: 'seleccionada', agilis: 'seleccionable', barbadensis: 'seleccionable', xantholora: 'seleccionable', farinosa: 'seleccionable', guildingii: 'seleccionable', diadema: 'seleccionable', versicolor: 'seleccionable', collaria: 'seleccionable', arausiaca: 'seleccionable' }, inv: {}, otorgados: {}, mundo: {} }));
} catch (e) {}`;
const ENTRAR_JS = `(async () => { try { return await (async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene Jugar'; b.click();
    if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta'; }
  await espera(() => { try { const AV = window.AV; return AV && AV.G && AV.G.player3D && AV.G.S && AV.G.S.step != null && AV.G.renderer && AV.G.renderer.stats().calls >= 0; } catch (e) { return false; } }, 150000);
  try { const AV = window.AV; if (AV.G.intro && AV.G.intro.saltar) AV.G.intro.saltar(); } catch (e) {}
  await espera(() => { try { return window.AV.G.renderer.stats().calls > 5; } catch (e) { return false; } }, 90000);
  await sleep(1500);
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;
// Prueba oficial + campo: cada poder por su especie real (sel + tecla G real), con medición.
const BATERIA_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G;
  const stats = () => { try { const s = G.renderer.stats(); const m = G.renderer.renderer.info.memory; return { calls: s.calls, tris: s.triangulos, tex: m.textures, geo: m.geometries }; } catch (e) { return { err: String(e && e.message || e) }; } };
  const heap = () => (performance.memory && performance.memory.usedJSHeapSize) ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
  const medir = async secs => { const marcas = [], cuadros = []; let ant = performance.now(); const t0 = performance.now();
    while (performance.now() - t0 < secs * 1000) { await new Promise(r => requestAnimationFrame(r)); const a = performance.now(); cuadros.push(a - ant); ant = a; marcas.push(stats()); }
    cuadros.shift(); const ord = cuadros.slice().sort((x, y) => x - y); const med = ord.length ? ord[Math.floor(ord.length / 2)] : 0;
    const prom = m => Math.round(m.reduce((s, x) => s + x, 0) / (m.length || 1));
    return { fpsMed: Math.round(1000 / (med || 1) * 10) / 10, peorMs: Math.round(Math.max(0, ...cuadros)), callsMed: prom(marcas.map(m => m.calls || 0)), trisMed: prom(marcas.map(m => m.tris || 0)) }; };
  const out = { v18: G.V18 };
  try {
    try { await G.streaming.terminar(); } catch (e) {}
    await sleep(1500);
    out.base = await medir(3); out.base.heap = heap(); out.base.stats = stats();
    const t0 = performance.now();
    const t = await AV.v18ExplorarTest();
    out.duracionTestMs = Math.round(performance.now() - t0);
    out.test = { passed: t.passed, total: t.total, fallos: (t.results || []).filter(r => !r.ok).map(r => r.name + ' :: ' + String(r.extra).slice(0, 300)) };
    // Campo: cada poder por su especie real, disparado con la tecla G (input real)
    const ESPECIES = ['vittata', 'agilis', 'barbadensis', 'xantholora', 'farinosa', 'guildingii', 'diadema', 'versicolor', 'collaria', 'arausiaca'];
    const CLAVE = (G.pack && G.pack.meta && G.pack.meta.almacen || 'amazonaverse') + '.v18';
    out.campo = [];
    for (const sp of ESPECIES) {
      try {
        const d0 = JSON.parse(localStorage.getItem(CLAVE) || '{}');
        d0.sel = sp; d0.especies = d0.especies || {}; d0.especies[sp] = 'seleccionada';
        localStorage.setItem(CLAVE, JSON.stringify(d0));
        try { G.v18.recargar(); } catch (e) {}
        const id = G.v18hab.poderDe(sp);
        const b0 = await medir(1.2);
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', code: 'KeyG', bubbles: true, cancelable: true }));
        document.body.dispatchEvent(new KeyboardEvent('keyup', { key: 'g', code: 'KeyG', bubbles: true, cancelable: true }));
        await sleep(900);
        const b1 = await medir(1.2);
        out.campo.push({ sp, poder: id, fpsBase: b0.fpsMed, fpsCon: b1.fpsMed, callsBase: b0.callsMed, callsCon: b1.callsMed, trisCon: b1.trisMed });
      } catch (e) { out.campo.push({ sp, error: String(e && e.message || e) }); }
    }
    out.contexto = stats(); out.contexto.heap = heap();
    // Regresión de la versión estable (sin bandera los cambios son inertes; selfTest corre siempre)
    try { const st = await AV.selfTest(); out.selfTest = { passed: st.passed, total: st.total }; } catch (e) { out.selfTest = { error: String(e && e.message || e) }; }
  } catch (e) { out.error = String(e && e.stack || e); }
  return JSON.stringify(out); })()`;
async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3k150-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    `--window-size=${ANCHO},${ALTO}`, 'about:blank'];
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi3k150-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}
(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const res = { etiqueta: ETIQUETA, pantalla: ESCRITORIO ? `escritorio ${ANCHO}x${ALTO}@${DPR} cpuX${CPUX}` : `movil ${ANCHO}x${ALTO}@${DPR} cpuX${CPUX} (iPhone emulado)`, head: null };
  const outJson = path.join(SALIDA, `k150_${ETIQUETA}.json`);
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const errores = [];
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: !ESCRITORIO }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPUX }, ses);
    if (!ESCRITORIO) await cdp.call('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS }, ses);
    cdp.ws.addEventListener('message', m => {
      try { const d = JSON.parse(m.data);
        if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errores.push('console.error: ' + (d.params.args || []).map(a => a.value || a.description || '').join(' ').slice(0, 300));
        if (d.method === 'Log.entryAdded' && d.params.entry && d.params.entry.level === 'error') errores.push('log: ' + String(d.params.entry.text).slice(0, 300));
      } catch (e) { }
    });
    await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&v18=1` }, ses);
    const t0 = Date.now(); let listo = false;
    while (Date.now() - t0 < 480000) {
      try { if (await evaluar(cdp, ses, `!!(window.AV && AV.G && AV.G.S && AV.G.S.step != null && AV.G.renderer)`, 10)) { listo = true; break; } } catch (e) { }
      await cdp.bombear(0.5);
    }
    if (!listo) throw new Error('el juego no arrancó');
    const ent = await evaluar(cdp, ses, ENTRAR_JS, 240);
    if (!/^ok/.test(ent)) throw new Error('entrada: ' + ent);
    res.head = await evaluar(cdp, ses, `(() => { try { return (AV.G.build && (AV.G.build.commit || AV.G.build.id)) || 'desconocido'; } catch (e) { return 'desconocido'; } })()`, 10);
    errores.length = 0;
    res.datos = JSON.parse(await evaluar(cdp, ses, BATERIA_JS, 300));
    res.erroresConsola = errores.slice(0, 12);
  } catch (e) { res.error = String(e && e.message || e); }
  fs.writeFileSync(outJson, JSON.stringify(res, null, 1));
  console.log(JSON.stringify({ test: res.datos && res.datos.test, base: res.datos && res.datos.base, campo: (res.datos && res.datos.campo || []).map(c => c.sp + ':' + c.poder + ' ' + c.fpsBase + '->' + c.fpsCon + 'fps ' + c.callsCon + 'calls'), error: res.error, errConsola: res.erroresConsola }, null, 1));
  try { chrome.kill('SIGKILL'); } catch (e) { }
  mataPorPerfil();
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close();
  const d = res.datos || {};
  const mal = res.error || d.error || (d.test && d.test.passed < d.test.total) || (res.erroresConsola && res.erroresConsola.length);
  process.exit(mal ? 1 : 0);
})();
