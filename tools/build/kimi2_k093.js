#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-093: QA-172 (BUGS.md) medido con GPU real:
   «reparar el puente colgante y cruzarlo a pie desde Villa Raíz» — el aviso promete cruzar a pie,
   pero en la cabecera A (167.04, 144.8) Vittata se queda atascada a y ≈ 10.6-10.8 (la pasarela
   está a 11.67). El bug es del frente B (reparar.js / mapa), pero la medición con GPU real y
   física real es de Kimi (0s). Esta herramienta NO toca el juego: siembra una partida cap1 con el
   progreso v18 'puente_villa: reparado' (fiel a una partida real, como kimi2_k088), entra sin
   creador y reproduce el paseo del niño con la física síncrona real (F.step a 60 Hz, palo hacia
   la cabecera y saltos como los del informe), midiendo:
     - perfil de terreno/superficie a lo largo del eje de aproximación (¿dónde está el escalón?),
     - el paseo real con palo + saltos: ¿llega al tablero? ¿dónde se fija? (trayectoria + pen/que),
     - lo mismo desde la cabecera B (simetría).
   Uso: node tools/build/kimi2_k093.js --etiqueta r1
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
  if (!/^kimi2q93-/.test(d)) continue;
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
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi2q93-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null, species: 'vittata' },
    pos: { x: 150, z: 170, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
  // puente ya reparado: el caso del aviso «Ya se cruza a pie» (QA-172)
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

/* ---------- la medición, en la página ---------- */
const PROBAR_JS = `(async () => {
  const AV = window.AV, G = AV.G, S = G.S, F = G.fisica, M = F.MOVE, I = G.input, T = G.terreno, H = T.height, DT = 1 / 60;
  const r2 = v => Math.round(v * 100) / 100;
  if (G.mundo && G.mundo.listo && G.mundo.listo.then) await G.mundo.listo;
  const SOL = G.solidos && G.solidos.activo ? G.solidos : null;
  if (!SOL) return JSON.stringify({ error: 'sin solidos' });
  const pl0 = T.plataformas.find(p => p.id === 'puente' && p.tipo === 'puente');
  const E = { a: [167.04, 144.8], b: [148.71, 128.25] };
  const deckYat = pl0 ? (x, z) => { const ux = pl0.bx - pl0.ax, uz = pl0.bz - pl0.az, L2 = ux * ux + uz * uz; const t = ((x - pl0.ax) * ux + (z - pl0.az) * uz) / L2; const tc = Math.min(1, Math.max(0, t)); return r2(pl0.ay + (pl0.by - pl0.ay) * tc - pl0.comba * 4 * tc * (1 - tc)) + ' (t=' + r2(t) + ')'; } : null;
  const puente = {
    reparadoWhen: pl0 ? (pl0.when ? !!pl0.when() : null) : null,
    eje: pl0 ? { a: [pl0.ax, pl0.ay, pl0.az], b: [pl0.bx, pl0.by, pl0.bz], ancho: pl0.ancho, comba: pl0.comba } : null
  };
  // Perfil del terreno a lo largo del eje de aproximación desde Villa Raíz hacia la cabecera A
  const perfil = [];
  for (let k = 0; k <= 26; k++) {
    const s = k * 0.4, ux = (E.a[0] - 174) / Math.hypot(E.a[0] - 174, E.a[1] - 152), uz = (E.a[1] - 152) / Math.hypot(E.a[0] - 174, E.a[1] - 152);
    const x = 174 + ux * s, z = 152 + uz * s;
    perfil.push({ s: r2(s), x: r2(x), z: r2(z), H: r2(H(x, z)), sup0: r2(T.surfaceY(x, z, null)), sup12: r2(T.surfaceY(x, z, 12.6)), deck: deckYat ? deckYat(x, z) : null });
  }
  // estado de la superficie con el y real de Vittata en el punto donde el informe se atascó
  SOL.terminar();
  const reporte = { atascada: { x: 170.2, z: 147.0 } };
  reporte.atascada.H = r2(H(reporte.atascada.x, reporte.atascada.z));
  reporte.atascada.sup0 = r2(T.surfaceY(reporte.atascada.x, reporte.atascada.z, null));
  // paseo real: palo hacia la cabecera con saltos periódicos, como el niño
  async function paseo(inicio, meta, etiqueta, frames) {
    try { F.endFlight(); } catch (e) {}
    Object.assign(M, { flying: false, landing: false, takeoff: 0, swimming: false, vx: 0, vz: 0, vy: 0, grounded: true });
    AV.teleport(inicio[0], inicio[1]);
    SOL.terminar();
    for (let i = 0; i < 30; i++) F.step(DT, G.ui.busy());
    const y0 = S.pos.y;
    const tray = [];
    let fija = 0, fijaMax = 0, saltos = 0, enTablero = false, minD = 99;
    for (let i = 0; i < frames; i++) {
      const dx = meta[0] - S.pos.x, dz = meta[1] - S.pos.z, d = Math.hypot(dx, dz);
      minD = Math.min(minD, d);
      G.camara.yaw = Math.atan2(-dx, -dz);
      I.stick.x = 0; I.stick.y = -1;
      // cada 2 s, un salto como el del niño (toque corto)
      if (i % 120 === 60) { F.tryJump(); I.jumpHeld = true; saltos++; }
      if (i % 120 === 75) { F.releaseJump(); I.jumpHeld = false; }
      F.step(DT, G.ui.busy());
      const vel = Math.hypot(M.vx, M.vz);
      fija = vel < 0.05 && M.grounded ? fija + 1 : 0;
      if (fija > fijaMax) fijaMax = fija;
      if (i % 15 === 0) tray.push([r2(S.pos.x), r2(S.pos.y), r2(S.pos.z), r2(F.suelo(S.pos.x, S.pos.z, S.pos.y)), r2(SOL.penetra(S.pos.x, S.pos.z, S.pos.y, SOL.SO.cuerpo))]);
      const top = T.surfaceY(S.pos.x, S.pos.z, null);
      if (d < 0.9 && Math.abs(S.pos.y - top) < 0.4 && top > 11.2) { enTablero = true; break; }
    }
    I.stick.x = I.stick.y = 0; I.jumpHeld = false;
    const q = SOL.que ? SOL.que(S.pos.x, S.pos.z, S.pos.y + 0.3) : null;
    return { etiqueta, inicio, meta, y0: r2(y0), fin: [r2(S.pos.x), r2(S.pos.y), r2(S.pos.z)], minD: r2(minD), enTablero, fijaMax, saltos,
      sueloFin: r2(F.suelo(S.pos.x, S.pos.z, S.pos.y)), sup0Fin: r2(T.surfaceY(S.pos.x, S.pos.z, null)), que: q,
      deckFin: deckYat ? deckYat(S.pos.x, S.pos.z) : null, penFin: r2(SOL.penetra(S.pos.x, S.pos.z, S.pos.y, SOL.SO.cuerpo)),
      techoFin: (() => { const t = SOL.techo(S.pos.x, S.pos.z, S.pos.y + 0.2, S.pos.y + 3, SOL.SO.cuerpo); return t === Infinity ? null : r2(t); })(),
      tray: tray.slice(-14) };
  }
  const paseoA = await paseo([172.5, 150.8], E.a, 'villa->cabeceraA', 720);
  const paseoB = await paseo([146.2, 125.6], E.b, 'otrolado->cabeceraB', 600);
  return JSON.stringify({ puente, reporte, perfil, paseoA, paseoB });
})()`;

async function lanzarChromeUnaVez() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2q93-'));
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
    const ps = "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*kimi2q93-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { /* seguir */ }
}

(async () => {
  limpiarHuerfanos();
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws);
  await cdp.listo();
  console.log('· KIMI-092 · QA-172: cruzar el puente reparado a pie (GPU real, física síncrona)');
  const res = { etiqueta: ETIQUETA, cuando: new Date().toISOString() };
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS }, ses);
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
    const r = JSON.parse(await evaluar(cdp, ses, PROBAR_JS, 300, true));
    res.medicion = r;
    console.log('· puente reparado (when): ' + r.puente.reparadoWhen + ' · eje: ' + JSON.stringify(r.puente.eje));
    console.log('· perfil del terreno hacia cabecera A (s · x,z · H · sup(y=0) · sup(y=12.6) · deck):');
    for (const p of r.perfil) console.log('   s=' + String(p.s).padStart(4) + '  (' + p.x + ', ' + p.z + ')  H=' + String(p.H).padStart(6) + '  sup0=' + String(p.sup0).padStart(6) + '  sup12=' + String(p.sup12).padStart(6) + '  deck=' + p.deck);
    for (const p of [r.paseoA, r.paseoB]) {
      console.log('· paseo ' + p.etiqueta + ': y0=' + p.y0 + ' → fin=(' + p.fin + ') minD=' + p.minD + ' enTablero=' + p.enTablero + ' fijaMax=' + p.fijaMax + ' saltos=' + p.saltos + ' que=' + p.que + ' pen=' + p.penFin + ' techo=' + p.techoFin);
      console.log('   trayectoria (final): ' + JSON.stringify(p.tray));
    }
    const f = path.join(SALIDA, `k093-${ETIQUETA}.json`);
    fs.writeFileSync(f, JSON.stringify(res, null, 1));
    console.log('· escrito ' + f);
  } catch (e) {
    res.error = String(e && e.message || e);
    console.error('· ERROR: ' + res.error);
    try { fs.writeFileSync(path.join(SALIDA, `k093-${ETIQUETA}.json`), JSON.stringify(res, null, 1)); } catch (e2) { /* */ }
  } finally {
    try { chrome.kill('SIGKILL'); } catch (e) { /* */ }
    await cdp.bombear(0.8);
    limpiarHuerfanos();
    try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { /* */ }
    srv.close();
  }
})();
