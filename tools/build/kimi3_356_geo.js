#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-356: atribuir el crecimiento de geometrías vivas de
   renderer.info.memory.geometries en la villa asentada (hallazgo de KIMI-355: 123 geo en 4fb6f8ac →
   ~350 en KIMI-350 → ~590 en dfa5d85a con los mismos 69 calls / ~322 k tris, a partir de los commits
   de precarga 5141d2ae (pie) / b4c72446 (vuelo)). Censo de la escena por uuid (qué objetos poseen
   cada geometría, visibilidad incluida) + censo de recursos del streaming (estado/refs) en tres
   fases: base asentada → paseo a 6,5 m/s con precarga activa → vuelta al spawn + gracia de
   liberación. Con --sin-precarga sirve un streaming.js en memoria con precargaVueloMin/precargaPieMin
   altos (A/B sin tocar el disco). GPU real RX 5700 XT.
   Uso: node tools/build/kimi3_356_geo.js --etiqueta r1 [--sin-precarga] [--pasos N] */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn, execSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ETIQUETA = arg('--etiqueta', 'r1');
const SIN_PRECARGA = process.argv.includes('--sin-precarga');
const PASOS = parseInt(arg('--pasos', '120'), 10);
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi356');
fs.mkdirSync(SALIDA, { recursive: true });
const LOGF = path.join(SALIDA, `k356_${ETIQUETA}.log`);
fs.writeFileSync(LOGF, '');
function log(m) { try { fs.appendFileSync(LOGF, `[${new Date().toISOString().slice(11, 19)}] ${m}\n`); } catch (e) { } }

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi3k356-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.wasm': 'application/wasm' };
let streamingPatch = null;
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    if (SIN_PRECARGA && p === '/src/engine/streaming.js') {
      if (!streamingPatch) {
        streamingPatch = fs.readFileSync(f, 'utf8')
          .replace('precargaVueloMin: 15', 'precargaVueloMin: 9999')
          .replace('precargaPieMin: 5', 'precargaPieMin: 9999');
        log('A/B: precarga desactivada en memoria (precargaVueloMin/precargaPieMin=9999)');
      }
      res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' }); return res.end(streamingPatch);
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
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi3k356-' + Math.random().toString(36).slice(2, 10),
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

// Censo: lista plana [dueño, uuidGeo, verts, visible, countInst] + recursos del streaming por estado/refs.
const CENSO_JS = `(() => { try { const AV = window.AV, G = AV.G, ST = G.mundo.streaming;
  const R = G.renderer.renderer, escena = G.renderer.scene;
  const lista = [];
  escena.traverse(o => {
    if (!o.geometry) return;
    const g = o.geometry;
    lista.push([o.name || o.type, g.uuid, g.attributes && g.attributes.position ? g.attributes.position.count : 0, o.visible ? 1 : 0, o.isInstancedMesh ? o.count : -1]);
  });
  const recursos = [];
  for (const n in ST.recursos) for (const t in ST.recursos[n]) {
    const r = ST.recursos[n][t];
    if (r.estado !== 'nada') recursos.push([n + ':' + t, r.estado, r.refs, r.soltarEn ? 1 : 0]);
  }
  const info = R.info.memory;
  return { info: { geo: info.geometries, tex: info.textures }, objetosConGeo: lista.length, lista, recursos,
    st: ST.stats(), heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null };
} catch (e) { return 'ERR ' + (e && e.message || e); } })()`;

// Paseo a pie: PASOS pasos de 2,0 m en cuadrado alrededor del spawn (6,5 m/s con las muestras de 300 ms),
// teleportando S.pos con cuadros reales entre paso y paso para que vueloAnticipo vea velocidad.
const PASEO_INI_JS = `(async () => { try { const AV = window.AV, S = AV.state;
  window.__paseo = { x0: S.pos.x, z0: S.pos.z, ang: 0 };
  return 'ok ' + Math.round(S.pos.x) + ',' + Math.round(S.pos.z); } catch (e) { return 'ERR ' + (e && e.message || e); } })()`;
const PASEO_PASO_JS = `(async () => { try { const AV = window.AV, S = AV.state, f = window.__paseo;
  if (!f) return -1;
  f.ang += Math.PI / 34; // girando: circuito cerrado ~17 pasos por vuelta
  S.pos.x += Math.sin(f.ang) * 2.0; S.pos.z += Math.cos(f.ang) * 2.0;
  return Math.round(Math.hypot(S.pos.x - f.x0, S.pos.z - f.z0)); } catch (e) { return -1; } })()`;

(async () => {
  const res = { etiqueta: ETIQUETA, cuando: new Date().toISOString(), sinPrecarga: SIN_PRECARGA, pasos: PASOS, pantalla: '1366x768 dpr1 cpuX6 (Chromebook)', urlExtra: 'escuela=1&calidad=bajo', gpu: 'PC real (ANGLE/D3D11)', fases: {}, errores: null };
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  log(`servidor ${origen}`);
  const perf = path.join(os.tmpdir(), `kimi3k356-${Date.now().toString(36)}`);
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
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: 6 }, ses, 15000).catch(() => { });
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: semillaSave() }, ses, 15000);
    const t0 = Date.now();
    await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&escuela=1&calidad=bajo` }, ses, 30000);
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
    await new Promise(r => setTimeout(r, 6000)); // gracia 3 s + cola de liberación
    res.fases.base = await ev(cdp, ses, CENSO_JS, 60);
    log(`base: info=${JSON.stringify(res.fases.base.info)} objetos=${res.fases.base.objetosConGeo} recursos=${res.fases.base.recursos.length}`);
    // Fase paseo
    const ini = await ev(cdp, ses, PASEO_INI_JS, 15);
    log(`paseo ini '${ini}'`);
    for (let i = 0; i < PASOS; i++) {
      await ev(cdp, ses, PASEO_PASO_JS, 10, false);
      await new Promise(r => setTimeout(r, 300));
      if (i % 30 === 29) { const m = await ev(cdp, ses, `AV.G.renderer.renderer.info.memory.geometries`, 10, false); log(`paso ${i + 1}: info.geometries=${m}`); }
    }
    res.fases.paseoFin = await ev(cdp, ses, CENSO_JS, 60);
    log(`paseoFin: info=${JSON.stringify(res.fases.paseoFin.info)} recursos=${res.fases.paseoFin.recursos.length}`);
    // Vuelta al spawn + asentado + gracia: ¿se liberan los precargados?
    const volver = await ev(cdp, ses, `(async () => { const AV = window.AV, S = AV.state, f = window.__paseo; S.pos.x = f.x0; S.pos.z = f.z0; S.pos.y = 0; return 'ok'; })()`, 15);
    const a2 = await ev(cdp, ses, ASENTAR_JS, 150);
    res.asentado2 = a2; log(`vuelta '${volver}' asentado2=${JSON.stringify(a2)}`);
    await new Promise(r => setTimeout(r, 15000)); // gracia de liberación de lo precargado fuera de banda
    res.fases.liberar = await ev(cdp, ses, CENSO_JS, 60);
    log(`liberar: info=${JSON.stringify(res.fases.liberar.info)} recursos=${res.fases.liberar.recursos.length}`);
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
  fs.writeFileSync(path.join(SALIDA, `k356_${ETIQUETA}.json`), JSON.stringify(res, null, 1));
  log('fin');
  console.log(JSON.stringify({ etiqueta: ETIQUETA, sinPrecarga: SIN_PRECARGA, info: res.fases && { base: res.fases.base && res.fases.base.info, paseoFin: res.fases.paseoFin && res.fases.paseoFin.info, liberar: res.fases.liberar && res.fases.liberar.info }, recursos: res.fases && { base: res.fases.base && res.fases.base.recursos.length, paseoFin: res.fases.paseoFin && res.fases.paseoFin.recursos.length, liberar: res.fases.liberar && res.fases.liberar.recursos.length }, error: res.error, errores: res.errores }, null, 1));
  process.exit(0);
})().catch(e => { log('FATAL ' + (e && e.stack || e)); console.error(e); process.exit(1); });
