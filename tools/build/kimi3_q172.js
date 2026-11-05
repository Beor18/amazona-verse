#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-096: QA-172 VERIFICADO post-fix (0c3d4dcc, rampas de
   cabecera + recorte de sólidos + rodeo en reparar.js). Historial: con el enfoque anterior (dos rampas
   largas, r1) el paseo propio se atascaba en la cuesta; la nube lo rehízo mejor y el test oficial
   quedó en 27/27. Esta herramienta NO toca el juego: fase 1) siembra cap1 con ?v18=1 y 'puente_villa:
   reparado' y corre AV.v18RepararTest() oficial (incluye el paseo sin saltos del test); fase 2) en una
   PÁGINA RECIÉN CARGADA (el test oficial deja tarjetas/toasts que congelan el input del harness)
   reproduce el CRUCE ENTERO a pie SIN saltos en ambos sentidos con la física síncrona real
   (F.step a 60 Hz, palo hacia la meta, sin jump), midiendo trayectoria, fija máxima y superficie.
   Uso: node tools/build/kimi3_q172.js --etiqueta r3
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
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi093'));
fs.mkdirSync(SALIDA, { recursive: true });

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi3q172-/.test(d)) continue;
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
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi3q172-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null, species: 'vittata' },
    pos: { x: 150, z: 170, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
  localStorage.setItem('amazonaverse.v18', JSON.stringify({ v: 1, sel: 'vittata', especies: { vittata: 'seleccionada' }, inv: {}, otorgados: {}, mundo: { puente_villa: 'reparado' } }));
} catch (e) {}`;

const ENTRAR_JS = `(async () => { try { return await (async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene Jugar'; b.click();
    if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta'; }
  const S = window.AV && window.AV.state; if (!S || !S.profile || !S.profile.created) return 'sin perfil';
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(30000);
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 60000);
  const b = document.getElementById('c1-saltar'); if (b) b.click();
  await sleep(800);
  const f = document.getElementById('c1-fade'); if (f) f.remove();
  if (AV.G.ui && AV.G.ui.hideToast) AV.G.ui.hideToast();
  const jugar = Array.from(document.querySelectorAll('button')).find(x => /a jugar/i.test(x.textContent || '')); if (jugar) jugar.click();
  await sleep(300);
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

/* ---------- la medición, en la página (2 fases: el test oficial deja tarjetas/toasts abiertos que
   congelan el input del harness; los cruces van en una página recién cargada, estado limpio) ---------- */
const PROBAR_JS = `(async () => {
  const AV = window.AV, G = AV.G, S = G.S, F = G.fisica, M = F.MOVE, I = G.input, T = G.terreno, H = T.height, DT = 1 / 60;
  const r2 = v => Math.round(v * 100) / 100;
  if (G.mundo && G.mundo.listo && G.mundo.listo.then) await G.mundo.listo;
  const SOL = G.solidos && G.solidos.activo ? G.solidos : null;
  if (!SOL) return JSON.stringify({ error: 'sin solidos' });
  // test oficial del módulo (incluye los checks QA-172 nuevos: geometría de rampas + paseo sin saltos)
  const testOficial = await AV.v18RepararTest();
  const R = G.v18Reparar;
  const rampas = (R && R.cabeceras && R.cabeceras.rampas || []).map(R2 => ({ a: [r2(R2.ax), r2(R2.ay), r2(R2.az)], b: [r2(R2.bx), r2(R2.by), r2(R2.bz)], ancho: R2.ancho, when: R2.when ? !!R2.when() : null }));
  return JSON.stringify({ fase: 'test', testOficial: { passed: testOficial.passed, total: testOficial.total, fallos: testOficial.results.filter(x => !x.ok) }, rampas, ocupado: { busy: !!(G.ui && G.ui.busy && G.ui.busy()), card: !!G.ui.cardOpen, dialogo: !!(G.dialogo && G.dialogo.open && G.dialogo.open()) } });
})()`;

const CRUCES_JS = `(async () => {
  const AV = window.AV, G = AV.G, S = G.S, F = G.fisica, M = F.MOVE, I = G.input, T = G.terreno, H = T.height, DT = 1 / 60;
  const r2 = v => Math.round(v * 100) / 100;
  if (G.mundo && G.mundo.listo && G.mundo.listo.then) await G.mundo.listo;
  const SOL = G.solidos && G.solidos.activo ? G.solidos : null;
  if (!SOL) return JSON.stringify({ error: 'sin solidos' });
  // perfil de la superficie (con y, cuenta rampas) a lo largo del eje de aproximación desde Villa Raíz
  const E = { a: [167.04, 144.8], b: [148.71, 128.25] };
  const perfil = [];
  for (let k = 0; k <= 30; k++) {
    const s = k * 0.4;
    const ux = (E.a[0] - 174) / Math.hypot(E.a[0] - 174, E.a[1] - 152), uz = (E.a[1] - 152) / Math.hypot(E.a[0] - 174, E.a[1] - 152);
    const x = 174 + ux * s, z = 152 + uz * s;
    perfil.push({ s: r2(s), x: r2(x), z: r2(z), H: r2(H(x, z)), supConY: r2(T.surfaceY(x, z, 12)) });
  }
  // cruce ENTERO a pie SIN saltos. Canal de entrada: 'w' (como AV.v18RepararTest/cruzarAPie; el
  // palo síncrono quedó inerte en el harness tras los cambios de cámara/duelo de esta noche — se
  // mide aparte como diagnóstico vPalo vs vTecla).
  async function cruce(inicio, meta, etiqueta, frames) {
    try { F.endFlight(); } catch (e) {}
    Object.assign(M, { flying: false, landing: false, takeoff: 0, swimming: false, vx: 0, vz: 0, vy: 0, grounded: true });
    AV.teleport(inicio[0], inicio[1]);
    SOL.terminar();
    for (let i = 0; i < 30; i++) F.step(DT, false);
    const keys = G.input.keys;
    let vPalo = 0;
    I.stick.x = 0; I.stick.y = -1;
    for (let i = 0; i < 30; i++) { F.step(DT, false); vPalo = Math.max(vPalo, Math.hypot(M.vx, M.vz)); }
    I.stick.x = I.stick.y = 0;
    let vTecla = 0;
    keys.add('w');
    for (let i = 0; i < 30; i++) { F.step(DT, false); vTecla = Math.max(vTecla, Math.hypot(M.vx, M.vz)); }
    const tray = [];
    let fija = 0, fijaMax = 0, nado = 0, maxSup = 0, minD = 99;
    for (let i = 0; i < frames; i++) {
      const dx = meta[0] - S.pos.x, dz = meta[1] - S.pos.z, d = Math.hypot(dx, dz);
      minD = Math.min(minD, d);
      G.camara.yaw = Math.atan2(-dx, -dz);
      F.step(DT, false);
      if (M.swimming) nado++;
      const sup = T.surfaceY(S.pos.x, S.pos.z, S.pos.y);
      if (sup > maxSup) maxSup = sup;
      const vel = Math.hypot(M.vx, M.vz);
      fija = vel < 0.05 && M.grounded ? fija + 1 : 0;
      if (fija > fijaMax) fijaMax = fija;
      if (i % 60 === 0) tray.push([r2(S.pos.x), r2(S.pos.y), r2(S.pos.z), r2(sup)]);
      if (d < 1.2 && maxSup > 11 && sup < 9.5) { keys.delete('w'); return { etiqueta, inicio, meta, fin: [r2(S.pos.x), r2(S.pos.y), r2(S.pos.z)], minD: r2(minD), cruzo: true, fijaMax, nado, maxSup: r2(maxSup), vPalo: r2(vPalo), vTecla: r2(vTecla), tray: tray.slice(-10) } };
    }
    keys.delete('w');
    return { etiqueta, inicio, meta, fin: [r2(S.pos.x), r2(S.pos.y), r2(S.pos.z)], minD: r2(minD), cruzo: false, fijaMax, nado, maxSup: r2(maxSup), vPalo: r2(vPalo), vTecla: r2(vTecla), tray: tray.slice(-10) };
  }
  // orilla villa -> orilla contraria (pie de la rampa B ≈ (142,5; 122,6)); y el regreso
  const cA = await cruce([174, 152], [141.5, 121.7], 'villa->B sin saltos', 1800);
  const cB = await cruce([141.5, 121.7], [174, 152], 'B->villa sin saltos', 1800);
  I.jumpHeld = false;
  return JSON.stringify({ fase: 'cruces', ocupado: { busy: !!(G.ui && G.ui.busy && G.ui.busy()), card: !!G.ui.cardOpen, dialogo: !!(G.dialogo && G.dialogo.open && G.dialogo.open()) }, perfil, cA, cB });
})()`;

async function lanzarChromeUnaVez() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3q172-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--window-size=500,900', 'about:blank'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let err = '';
  chrome.stderr.on('data', d => { err += d; });
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
async function lanzarChrome() {
  let ultimo = '';
  for (let intento = 0; intento < 3; intento++) {
    try { return await lanzarChromeUnaVez(); } catch (e) { ultimo = e.message; await new Promise(r => setTimeout(r, 2500)); }
  }
  throw new Error(ultimo);
}
function limpiarHuerfanos() {
  try {
    const ps = "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*kimi3q172-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { /* seguir */ }
}

async function entrar(cdp, ses, origen) {
  await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&v18=1` }, ses);
  const t0 = Date.now();
  let listo = false;
  while (Date.now() - t0 < CFG.espera_listo_s * 1000) {
    try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { /* aún no */ }
    await cdp.bombear(0.5);
  }
  if (!listo) throw new Error('el juego no arrancó');
  await cdp.bombear(2.0);
  console.log('· entrada: ' + await evaluar(cdp, ses, ENTRAR_JS, 240));
}

(async () => {
  limpiarHuerfanos();
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws);
  await cdp.listo();
  console.log('· KIMI-096 · QA-172: cruce del puente reparado a pie SIN saltos (GPU real, física síncrona, página limpia por fase)');
  const res = { etiqueta: ETIQUETA, cuando: new Date().toISOString() };
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS }, ses);
    await entrar(cdp, ses, origen);
    const r1 = JSON.parse(await evaluar(cdp, ses, PROBAR_JS, 420, true));
    console.log('· test oficial v18RepararTest: ' + r1.testOficial.passed + '/' + r1.testOficial.total + (r1.testOficial.fallos.length ? ' · FALLOS: ' + JSON.stringify(r1.testOficial.fallos) : ''));
    console.log('· estado tras el test: ' + JSON.stringify(r1.ocupado));
    console.log('· rampas: ' + JSON.stringify(r1.rampas));
    await entrar(cdp, ses, origen); // página fresca: el input del harness no debe heredar tarjetas/toasts del test
    const r2 = JSON.parse(await evaluar(cdp, ses, CRUCES_JS, 420, true));
    console.log('· estado página limpia: ' + JSON.stringify(r2.ocupado));
    const perfil = r2.perfil;
    console.log('· perfil villa->A (s · x,z · H · sup(y=12)):');
    for (const p of perfil) console.log('   s=' + String(p.s).padStart(4) + '  (' + p.x + ', ' + p.z + ')  H=' + String(p.H).padStart(6) + '  sup=' + String(p.supConY).padStart(6));
    for (const c of [r2.cA, r2.cB]) {
      console.log('· cruce ' + c.etiqueta + ': cruzo=' + c.cruzo + ' minD=' + c.minD + ' maxSup=' + c.maxSup + ' fijaMax=' + c.fijaMax + ' nado=' + c.nado + ' vPalo=' + c.vPalo + ' vTecla=' + c.vTecla + ' fin=(' + c.fin + ')');
      console.log('   trayectoria: ' + JSON.stringify(c.tray));
    }
    res.medicion = { testOficial: r1.testOficial, rampas: r1.rampas, ocupadoTrasTest: r1.ocupado, perfil, cA: r2.cA, cB: r2.cB };
    const f = path.join(SALIDA, `k095-${ETIQUETA}.json`);
    fs.writeFileSync(f, JSON.stringify(res, null, 1));
    console.log('· escrito ' + f);
  } catch (e) {
    res.error = String(e && e.message || e);
    console.error('· ERROR: ' + res.error);
    try { fs.writeFileSync(path.join(SALIDA, `k095-${ETIQUETA}.json`), JSON.stringify(res, null, 1)); } catch (e2) { /* */ }
  } finally {
    try { chrome.kill('SIGKILL'); } catch (e) { /* */ }
    await cdp.bombear(0.8);
    limpiarHuerfanos();
    try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { /* */ }
    srv.close();
    process.exit(res.error ? 1 : 0); // el ws CDP mantiene vivo el bucle de node tras terminar
  }
})();
