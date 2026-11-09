#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-360: A/B de la palanca del precalentado de PANTALLA
   del QA-220 (saltar InstancedMesh con count===0, que jamás se dibujan). Pedido de decisión de
   Kimi 3 en PEDIDOS (9-nov ~05:20 UTC, cierre de su KIMI-356/357: ~590 geometrías subidas por el
   warm con count 0→1 forzado, ~decenas de MB de GPU).
   Sirve el worktree (con la palanca) o, con --base, el renderer.js de HEAD (sin palanca), siembra
   cap1, asienta (ST.terminar) y censuéa: info.memory + geometrías referenciadas SOLO por
   InstancedMesh con count===0 (nº y bytes estimados de atributos). GPU real RX 5700 XT.
   Uso: node tools/build/kimi2_k360_warm.js --etiqueta r1 [--base] */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn, execSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ETIQUETA = arg('--etiqueta', 'r1');
const BASE = process.argv.includes('--base');
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi360');
fs.mkdirSync(SALIDA, { recursive: true });
const LOGF = path.join(SALIDA, `k360_${ETIQUETA}.log`);
fs.writeFileSync(LOGF, '');
function log(m) { try { fs.appendFileSync(LOGF, `[${new Date().toISOString().slice(11, 19)}] ${m}\n`); } catch (e) { } }

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi2k360-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

let rendererBase = null;
if (BASE) { try { rendererBase = execSync('git show HEAD:src/engine/renderer.js', { cwd: RAIZ, maxBuffer: 8e6 }).toString(); log('A/B base: renderer.js de HEAD (sin palanca KIMI-360)'); } catch (e) { log('no pude leer renderer.js de HEAD: ' + e.message); } }

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.wasm': 'application/wasm' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    if (BASE && p === '/src/engine/renderer.js' && rendererBase) {
      res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' }); return res.end(rendererBase);
    }
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; }
  call(m, p, s, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); const msg = { id, method: m, params: p || {} }; if (s) msg.sessionId = s; this.ws.send(JSON.stringify(msg)); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + m)); } }, t); }); }
}
async function ev(cdp, ses, exp, t, pr) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000);
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result ? r.result.value : undefined;
}

function semillaSave() {
  const save = {
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi2k360-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false },
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
  if (t) { await espera(() => t.open, 30000);
    if (t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene Jugar'; b.click();
      if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta'; } }
  const S = window.AV && window.AV.state; if (!S) return 'sin AV.state';
  if (!await espera(() => S.profile && S.profile.created, 45000)) return 'sin perfil';
  if (!await espera(() => { try { return AV.G.ui && !(AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 90000)) return 'mundo no visible';
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

const ASENTAR_JS = `(async () => { try { const ST = AV.G.mundo.streaming; const t0 = performance.now();
  const r = await ST.terminar({ topeMs: 120000 });
  return { ms: Math.round(performance.now() - t0), tope: !!(r && r.tope), pendientes: r && r.pendientes }; }
  catch (e) { return 'ERR ' + (e && e.message || e); } })()`;

// Censo: info.memory + geometrías referenciadas SOLO por InstancedMesh con count===0 (bytes de atributos).
const CENSO_JS = `(() => { try { const AV = window.AV, G = AV.G;
  const R = G.renderer.renderer, escena = G.renderer.scene;
  const enUso = new Set(), vacios = new Set();
  let objConGeo = 0, instVacio = 0;
  escena.traverse(o => {
    if (!o.geometry) return;
    objConGeo++;
    if (o.isInstancedMesh && o.count === 0) { instVacio++; vacios.add(o.geometry.uuid); }
    else enUso.add(o.geometry.uuid);
  });
  const soloVacio = [...vacios].filter(u => !enUso.has(u));
  let bytes = 0, verts = 0;
  escena.traverse(o => {
    if (!o.geometry || !soloVacio.includes(o.geometry.uuid)) return;
    const g = o.geometry; if (g.__k360contada) return; g.__k360contada = 1;
    for (const k in g.attributes) { const a = g.attributes[k]; if (a && a.array) bytes += a.array.byteLength; }
    if (g.index && g.index.array) bytes += g.index.array.byteLength;
    if (g.attributes.position) verts += g.attributes.position.count;
  });
  const info = R.info.memory;
  return { info: { geo: info.geometries, tex: info.textures }, objetosConGeo: objConGeo, instVacio,
    soloVacio: soloVacio.length, bytesSoloVacio: bytes, vertsSoloVacio: verts,
    heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
    errores: (window.__erroresConsola || []).length };
} catch (e) { return 'ERR ' + (e && e.message || e); } })()`;

(async () => {
  const res = { etiqueta: ETIQUETA, cuando: new Date().toISOString(), base: BASE, gpu: 'PC real (ANGLE/D3D11)', fases: {}, error: null, errores: null };
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  log(`servidor ${origen} base=${BASE}`);
  const perf = path.join(os.tmpdir(), `kimi2k360-${Date.now().toString(36)}`);
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${perf}`, '--enable-gpu', '--ignore-gpu-blocklist', '--window-size=1366,768', '--force-device-scale-factor=1', '--no-first-run', '--mute-audio', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  res.chromePid = chrome.pid;
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  let port = null, wsPath = null;
  for (let i = 0; i < 150 && !port; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { port = parseInt(l[0], 10); wsPath = l[1].trim(); } }
    if (!port) await new Promise(r => setTimeout(r, 200));
  }
  if (!port) { log('Chrome no abrió DevTools: ' + err.slice(0, 200)); throw new Error('devtools'); }
  const ws = new WebSocket(`ws://127.0.0.1:${port}${wsPath}`);
  await new Promise((re, re2) => { ws.onopen = re; ws.onerror = re2; });
  const cdp = new CDP(ws);
  const { targetId } = await cdp.call('Target.createTarget', { url: 'about:blank' }, null, 15000);
  const { sessionId: ses } = await cdp.call('Target.attachToTarget', { targetId, flatten: true }, null, 15000);
  await cdp.call('Page.enable', {}, ses, 15000);
  await cdp.call('Runtime.enable', {}, ses, 15000);
  try {
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: semillaSave() }, ses, 15000);
    const t0 = Date.now();
    await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real` }, ses, 30000);
    let listo = false;
    while (Date.now() - t0 < 240000) {
      try { if (await ev(cdp, ses, `!!(${JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
      await new Promise(r => setTimeout(r, 500));
    }
    if (!listo) { res.error = 'el juego no arrancó en 240 s'; log(res.error); throw new Error('arranque'); }
    const ent = await ev(cdp, ses, ENTRAR_JS, 150);
    log(`entrar='${ent}' en ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    if (ent !== 'ok') { res.error = 'entrar: ' + ent; throw new Error('entrar'); }
    const a = await ev(cdp, ses, ASENTAR_JS, 150);
    res.asentado = a; log(`asentado=${JSON.stringify(a)}`);
    // el pase de pantalla calienta hasta 6 objetos/cuadro: ~600 tardan ~2-5 s de cuadros reales
    await new Promise(r => setTimeout(r, 10000));
    res.fases.base = await ev(cdp, ses, CENSO_JS, 60);
    log(`censo: ${JSON.stringify(res.fases.base)}`);
    res.errores = await ev(cdp, ses, `(window.__erroresConsola || []).slice(0, 8)`, 10, false);
    log(`errores=${JSON.stringify(res.errores)}`);
  } catch (e) {
    if (!res.error) res.error = String(e && e.message || e).slice(0, 300);
    log('ERROR ' + res.error);
  } finally {
    try { ws.close(); } catch (e) { }
    try { chrome.kill('SIGKILL'); } catch (e) { }
    try { execSync(`taskkill /PID ${chrome.pid} /T /F >NUL 2>&1`); } catch (e) { }
    try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  }
  srv.close();
  fs.writeFileSync(path.join(SALIDA, `k360_${ETIQUETA}.json`), JSON.stringify(res, null, 1));
  log('fin');
  console.log(JSON.stringify({ etiqueta: ETIQUETA, base: BASE, info: res.fases.base && res.fases.base.info, instVacio: res.fases.base && res.fases.base.instVacio, soloVacio: res.fases.base && res.fases.base.soloVacio, MBsoloVacio: res.fases.base && +(res.fases.base.bytesSoloVacio / 1048576).toFixed(1), geoSubidas: res.fases.base && res.fases.base.info.geo, heap: res.fases.base && res.fases.base.heap, error: res.error, errores: res.errores }, null, 1));
  process.exit(0);
})();
