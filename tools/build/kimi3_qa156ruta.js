#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-046: verificación de QA-156(a) en HEAD.
   La temporada móvil se trancaba en «La ruta de la gota» siguiendo el vapor/gota en vuelo
   (Vittata fija en el aire, palo empujado, Saltar mantenido). La corrida de KIMI-039 que lo
   vio (604d05c0) es ANTERIOR al fix QA-156a2 (dcf9f5d5). Este probe vuela la RUTA REAL de la
   misión con física síncrona y sólidos reales: p5 vapor (poza→nube), lluvia y p6 escorrentía
   completa hasta la poza (waypoints de AV_MAPA_CAP1.misiones.rutaGota, escorrentía y+0,4 como
   en educativa.js). En cada tramo: teleport al inicio, drenado de sólidos (SOL.terminar()),
   vuelo continuo salto a salto con el palo hacia el waypoint y Saltar mantenido al subir o al
   notar atasco (como el pulgar del informe). Se detectan rachas fijas ≥1,5 s en el aire y se
   vuelca estado (penetración, techo, suelo, atasco) en los snaps.
   Salida: docs/img/kimi156a2/qa156ruta-<etiqueta>.json   Uso: node tools/build/kimi3_qa156ruta.js --etiqueta r1 */
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
const ETIQUETA = (() => { const i = process.argv.indexOf('--etiqueta'); return i > 0 ? process.argv[i + 1] : 'r1'; })();
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi156a2');
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
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.exception && r.exceptionDetails.exception.value || r.exceptionDetails.text).slice(0, 600));
  return r.result ? r.result.value : undefined;
}

// Vuelo de la ruta de la gota por secciones. El estado de cada snapshot es el mismo del probe
// qa156a2 (pen/techo/perchY/suelo/h/land/fly/gr) para comparar con las repros anteriores.
const PROBAR_JS = `(async () => {
  const AV = window.AV, G = AV.G, S = G.S, F = G.fisica, M = F.MOVE, I = G.input, H = G.terreno.height, DT = 1 / 60;
  const r2 = v => Math.round(v * 100) / 100;
  if (G.mundo && G.mundo.listo && G.mundo.listo.then) await G.mundo.listo;
  G.quiet = true;
  const SOL0 = G.solidos && G.solidos.activo ? G.solidos : null;
  if (!SOL0) return JSON.stringify({ error: 'sin solidos' });
  const RG = (window.AV_MAPA_CAP1 && window.AV_MAPA_CAP1.misiones && window.AV_MAPA_CAP1.misiones.rutaGota) || null;
  if (!RG) return JSON.stringify({ error: 'sin rutaGota' });
  const esc = RG.escorrentia.map(p => ({ x: p[0], y: p[1] + 0.4, z: p[2] }));
  const SECCIONES = [
    { nombre: 'p5-vapor', cap: 2100, pts: RG.vapor.map(p => ({ x: p[0], y: p[1], z: p[2] })) },
    { nombre: 'lluvia', cap: 1200, pts: RG.lluvia.map(p => ({ x: p[0], y: p[1], z: p[2] })) },
    { nombre: 'p6-escorrentia', cap: 1000, pts: esc },
  ];
  const SOL = () => (G.solidos && G.solidos.activo ? G.solidos : null);
  const ANILLO5 = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const techoCuerpo = (x, z, y0, y1, h) => { const r = SOL().SO.radio * 0.7; let t = Infinity;
    for (const k of ANILLO5) t = Math.min(t, SOL().techo(x + k[0] * r, z + k[1] * r, y0, y1, h)); return t; };
  const snap = (i) => { const so = SOL(); const pie = so.SO.stepUp - 0.05, hP = so.SO.cuerpo + pie;
    const pen = so.penetra(S.pos.x, S.pos.z, S.pos.y - pie, hP);
    const tc = techoCuerpo(S.pos.x, S.pos.z, S.pos.y, S.pos.y + 30, so.SO.cuerpo);
    return { i, x: r2(S.pos.x), y: r2(S.pos.y), z: r2(S.pos.z), vy: r2(S.vy), sp: r2(M.speed), at: r2(M.atasco || 0),
      pen: r2(pen), techo: tc === Infinity ? null : r2(tc), perchY: M.perchY === -Infinity ? null : r2(M.perchY),
      suelo: r2(F.suelo(S.pos.x, S.pos.z, S.pos.y)), h: r2(H(S.pos.x, S.pos.z)), land: !!M.landing, fly: !!M.flying, gr: !!M.grounded }; };
  const resultado = { secciones: [] };
  for (const sec of SECCIONES) {
    const inicio = sec.pts[0];
    AV.teleport(inicio.x, inicio.z);
    const so0 = SOL(); if (so0) so0.terminar();
    F.step(DT, G.ui.busy()); F.step(DT, G.ui.busy());
    // despegar limpio desde el sitio
    try { F.endFlight(); } catch (e) {}
    Object.assign(M, { flying: false, landing: false, takeoff: 0, swimming: false, vx: 0, vz: 0, grounded: true, wasAir: false });
    S.pos.y = Math.max(S.pos.y, H(S.pos.x, S.pos.z)) + 2.4; S.vy = 0;
    const so1 = SOL(); if (so1) so1.terminar();
    for (let i = 0; i < 20; i++) F.step(DT, G.ui.busy());
    Object.assign(M, { flying: true, landing: false, takeoff: 0, grounded: false, vx: 0, vz: 0 });
    const desat0 = M.desatascos || 0;
    const tramos = [];
    let fijaSec = 0, fijaSecMax = 0;
    for (let w = 1; w < sec.pts.length; w++) {
      const tgt = sec.pts[w];
      let px = S.pos.x, py = S.pos.y, pz = S.pos.z, fija = 0, fijaMax = 0;
      const snaps = [];
      let llego = false, motivo = 'cap';
      for (let i = 0; i < sec.cap; i++) {
        const dx = tgt.x - S.pos.x, dz = tgt.z - S.pos.z;
        const dh = Math.hypot(dx, dz);
        if (dh < 3.5) { llego = true; motivo = 'llego'; break; }
        G.camara.yaw = Math.atan2(-dx, -dz);
        I.stick.x = 0; I.stick.y = -1;
        I.jumpHeld = (tgt.y > S.pos.y + 0.8) || fija > 30; // remontar / desatascar, como el pulgar
        F.step(DT, G.ui.busy());
        const dd = Math.hypot(S.pos.x - px, S.pos.y - py, S.pos.z - pz);
        if (M.flying && dd < 1e-4) fija++; else fija = 0;
        if (fija > fijaMax) fijaMax = fija;
        if (fija === 30 || fija === 90 || fija === 300) snaps.push(snap(i));
        px = S.pos.x; py = S.pos.y; pz = S.pos.z;
      }
      I.stick.x = I.stick.y = 0; I.jumpHeld = false;
      tramos.push({ de: [r2(sec.pts[w-1].x), r2(sec.pts[w-1].y), r2(sec.pts[w-1].z)], a: [r2(tgt.x), r2(tgt.y), r2(tgt.z)],
        llego, motivo, fijaMax, segFija: r2(fijaMax * DT), fin: snap(-1), snaps: fijaMax >= 90 ? snaps : undefined });
      fijaSec += fijaMax; if (fijaMax > fijaSecMax) fijaSecMax = fijaMax;
      if (motivo !== 'llego') break; // si no llegó, la sección no continúa de forma fiel
    }
    resultado.secciones.push({ nombre: sec.nombre, tramos, fijaSecMax, desatascos: (M.desatascos || 0) - desat0 });
  }
  resultado.resumen = {
    tramos: resultado.secciones.reduce((n, s) => n + s.tramos.length, 0),
    congelados: resultado.secciones.map(s => ({ sec: s.nombre, fijaSecMax: s.fijaSecMax, desatascos: s.desatascos })),
  };
  return JSON.stringify(resultado);
})()`;

async function lanzarChromeUnaVez() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3r-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--enable-logging=stderr', '--v=0',
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
    const ps = "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*kimi3r-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
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
  console.log(`· KIMI-046 · ruta completa de la gota · etiqueta ${ETIQUETA}`);
  const res = { etiqueta: ETIQUETA, cuando: new Date().toISOString() };
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); sessionStorage.clear(); } catch (e){}" }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1` }, ses);
    const t0 = Date.now();
    let listo = false;
    while (Date.now() - t0 < CFG.espera_listo_s * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { /* aún no */ }
      await cdp.bombear(0.5);
    }
    if (!listo) throw new Error('el juego no arrancó');
    await cdp.bombear(2.0);
    console.log('· jugador nuevo: ' + await evaluar(cdp, ses, CFG.preparar_js, 300));
    const r = JSON.parse(await evaluar(cdp, ses, PROBAR_JS, 300, true));
    res.ruta = r;
    console.log(`· secciones: ${(r.secciones || []).map(s => s.nombre).join(' · ')}`);
    for (const s of r.secciones || []) {
      console.log(`  ${s.nombre}: ${s.tramos.length} tramos · fijaMax ${s.fijaSecMax} cuadros (${r2s(s.fijaSecMax)}) · desatascos ${s.desatascos}`);
      for (const t of s.tramos) console.log(`    -> (${t.a.join(', ')}) ${t.motivo}${t.llego ? '' : ' ✗'} fijaMax ${t.fijaMax} pos_fin=(${t.fin.x},${t.fin.y},${t.fin.z}) fly=${t.fin.fly} gr=${t.fin.gr}`);
    }
    const malos = (r.secciones || []).filter(s => s.fijaSecMax >= 90);
    console.log(malos.length ? `· CONGELAMIENTOS: ${malos.map(s => s.nombre).join(', ')}` : '· sin congelamientos (fija ≥1,5 s) en ninguna sección');
    const f = path.join(SALIDA, `qa156ruta-${ETIQUETA}.json`);
    fs.writeFileSync(f, JSON.stringify(res, null, 1));
    console.log('· escrito ' + f);
  } catch (e) {
    res.error = String(e && e.message || e);
    console.error('· ERROR: ' + res.error);
    try { fs.writeFileSync(path.join(SALIDA, `qa156ruta-${ETIQUETA}.json`), JSON.stringify(res, null, 1)); } catch (e2) { /* */ }
  } finally {
    try { chrome.kill('SIGKILL'); } catch (e) { /* */ }
    await cdp.bombear(0.8);
    limpiarHuerfanos();
    try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { /* */ }
    srv.close();
  }
  function r2s(c) { return (Math.round(c / 60 * 100) / 100) + ' s'; }
})();
