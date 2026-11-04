#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — QA-156a2: repro de «Vittata fija en el aire con Aterrizar puesto»
   en la escorrentía de «La ruta de la gota» (cap. 1), (74,7; 46,4; −155,3), palo empujado (2 de 5 vueltas
   de la temporada móvil). Tercera causa en el mismo sitio (6f4e6a82/2e8dd3f5 cubrieron dos).
   Chrome headless propio + CDP (sin librerías), partida sembrada sin creador (config.json preparar_js).
   La física corre síncrona con G.renderer.update(1/60) (sin dibujar), palo empujado hacia 16 direcciones
   de mundo y 3 alturas de salida; se detectan rachas de cuadros sin moverse y se vuelca el estado
   (penetración, techo, percha, suelo, atasco) en el momento de quedarse fija.
   Salida: docs/img/kimi156a2/qa156a2-<etiqueta>.json   Uso: node tools/build/kimi3_qa156a2.js --etiqueta r1 */
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
const DIR = (() => { const i = process.argv.indexOf('--dir'); return i > 0 ? parseInt(process.argv[i + 1], 10) : null; })();
const FRAMES = parseInt((() => { const i = process.argv.indexOf('--frames'); return i > 0 ? process.argv[i + 1] : '300'; })(), 10);
const PX = parseFloat((() => { const i = process.argv.indexOf('--x'); return i > 0 ? process.argv[i + 1] : '74.7'; })(), 10);
const PZ = parseFloat((() => { const i = process.argv.indexOf('--z'); return i > 0 ? process.argv[i + 1] : '-155.3'; })(), 10);
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

// Barrido: 16 direcciones de mundo × 3 alturas de salida; palo a fondo; 900 cuadros síncronos por intento.
const PROBAR_JS = `(async () => {
  const AV = window.AV, G = AV.G, S = G.S, F = G.fisica, M = F.MOVE, I = G.input, H = G.terreno.height, DT = 1 / 60;
  const r2 = v => Math.round(v * 100) / 100;
  if (G.mundo && G.mundo.listo && G.mundo.listo.then) await G.mundo.listo;
  G.quiet = true;
  const SOL0 = G.solidos && G.solidos.activo ? G.solidos : null;
  if (!SOL0) return JSON.stringify({ error: 'sin solidos' });
  AV.teleport(${PX}, ${PZ});
  SOL0.terminar();
  F.step(DT, G.ui.busy()); F.step(DT, G.ui.busy());
  const SOL = G.solidos && G.solidos.activo ? G.solidos : null;
  const h0 = H(S.pos.x, S.pos.z);
  const ANILLO5 = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
  // réplica de fisica.js techoCuerpo (privada): techo del cuerpo en 5 puntos del anillo a r=radio*0,7
  const techoCuerpo = (x, z, y0, y1, h) => { const r = SOL.SO.radio * 0.7; let t = Infinity;
    for (const k of ANILLO5) t = Math.min(t, SOL.techo(x + k[0] * r, z + k[1] * r, y0, y1, h)); return t; };
  // Perfil del sitio: penetración/techo/suelo en el punto y hacia 16 direcciones (radios 0,5…3 m)
  const perfil = [];
  for (let k = 0; k < 16; k++) {
    const a = k / 16 * Math.PI * 2, ux = Math.cos(a), uz = Math.sin(a);
    const fila = { ang: r2(a), muestras: [] };
    for (const r of [0, 0.5, 1, 1.5, 2, 2.5, 3]) {
      const x = S.pos.x + ux * r, z = S.pos.z + uz * r;
      const y = h0 + 2.4;
      const pie = SOL.SO.stepUp - 0.05, hP = SOL.SO.cuerpo + pie;
      const pen = SOL.penetra(x, z, y - pie, hP);
      const tc = techoCuerpo(x, z, y, y + 30, SOL.SO.cuerpo);
      fila.muestras.push({ r, pen: r2(pen), techo: tc === Infinity ? null : r2(tc), suelo: r2(F.suelo(x, z, y)) });
    }
    perfil.push(fila);
  }
  // una percha cerca manda: ¿qué ve percha() desde la posición de la foto del bug?
  const perchas = SOL.percha(S.pos.x, S.pos.z, h0 + 2.4, 2.2, 2.8) || null;
  const base = { x: r2(S.pos.x), z: r2(S.pos.z), h0: r2(h0), percha: perchas ? { x: r2(perchas.x), y: r2(perchas.y), z: r2(perchas.z) } : null,
    solidos: SOL.stats ? SOL.stats() : null, pos: [r2(S.pos.x), r2(S.pos.y), r2(S.pos.z)] };
  const runs = [];
  const dirs = ${DIR} !== null ? [${DIR}] : Array.from({ length: 16 }, (_, k) => k);
  for (const k of dirs) {
    const a = k / 16 * Math.PI * 2;
    // cámara: adelante del palo (−y) = dirección de mundo (cos a, sin a) → yaw = atan2(−cos a, −sin a)
    G.camara.yaw = Math.atan2(-Math.cos(a), -Math.sin(a));
    for (const dy of [1.2, 2.4, 4]) {
      I.stick.x = I.stick.y = 0; I.jumpHeld = false;
      try { F.endFlight(); } catch (e) {}
      Object.assign(M, { flying: false, landing: false, takeoff: 0, swimming: false, vx: 0, vz: 0, grounded: true, wasAir: false });
      S.pos.x = ${PX}; S.pos.z = ${PZ}; S.pos.y = h0 + dy; S.vy = 0;
      SOL.terminar();
      for (let i = 0; i < 20; i++) F.step(DT, G.ui.busy());
      Object.assign(M, { flying: true, landing: true, takeoff: 0, grounded: false, vx: 0, vz: 0 });
      const desat0 = M.desatascos || 0;
      let fija = 0, fijaMax = 0, px = S.pos.x, py = S.pos.y, pz = S.pos.z;
      const snaps = [];
      for (let i = 0; i < ${FRAMES}; i++) {
        I.stick.x = 0; I.stick.y = -1;
        F.step(DT, G.ui.busy());
        const dd = Math.hypot(S.pos.x - px, S.pos.y - py, S.pos.z - pz);
        if (M.flying && dd < 1e-4) fija++; else fija = 0;
        if (fija > fijaMax) fijaMax = fija;
        const interes = fija === 30 || fija === 90 || fija === 300 || i === ${FRAMES} - 1;
        if (interes) {
          const pie = SOL.SO.stepUp - 0.05, hP = SOL.SO.cuerpo + pie;
          const pen = SOL.penetra(S.pos.x, S.pos.z, S.pos.y - pie, hP);
          const tc = techoCuerpo(S.pos.x, S.pos.z, S.pos.y, S.pos.y + 30, SOL.SO.cuerpo);
          snaps.push({ i, x: r2(S.pos.x), y: r2(S.pos.y), z: r2(S.pos.z), vy: r2(S.vy), sp: r2(M.speed), at: r2(M.atasco || 0),
            pen: r2(pen), techo: tc === Infinity ? null : r2(tc), perchY: M.perchY === -Infinity ? null : r2(M.perchY),
            suelo: r2(F.suelo(S.pos.x, S.pos.z, S.pos.y)), h: r2(H(S.pos.x, S.pos.z)), land: !!M.landing, fly: !!M.flying, gr: !!M.grounded });
        }
        px = S.pos.x; py = S.pos.y; pz = S.pos.z;
        if (fijaMax > 240) break;
      }
      I.stick.x = I.stick.y = 0;
      runs.push({ dir: k, angDeg: Math.round(a * 180 / Math.PI), dy, fijaMax, segFija: r2(fijaMax * DT),
        desatascos: (M.desatascos || 0) - desat0, aterrizo: !M.flying, fin: snaps.length ? snaps[snaps.length - 1] : null,
        snaps: fijaMax >= 90 ? snaps : undefined });
    }
    // Llegada con crucero (como quien sigue la gota y pulsa Aterrizar junto a la percha): 1 s a 12 m/s y luego aterrizar
    for (const dy of [1.2, 2.4, 4]) {
      I.stick.x = I.stick.y = 0; I.jumpHeld = false;
      try { F.endFlight(); } catch (e) {}
      Object.assign(M, { flying: false, landing: false, takeoff: 0, swimming: false, vx: 0, vz: 0, grounded: true, wasAir: false });
      const bx = ${PX} - Math.cos(a) * 12, bz = ${PZ} - Math.sin(a) * 12;
      S.pos.x = bx; S.pos.z = bz; S.pos.y = H(bx, bz) + dy; S.vy = 0;
      SOL.terminar();
      for (let i = 0; i < 20; i++) F.step(DT, G.ui.busy());
      Object.assign(M, { flying: true, landing: false, takeoff: 0, grounded: false, vx: 0, vz: 0 });
      for (let i = 0; i < 60; i++) { I.stick.x = 0; I.stick.y = -1; F.step(DT, G.ui.busy()); } // crucero hacia el punto
      M.landing = ${process.argv.includes('--sin-aterrizar') ? 'false' : 'true'}; // pulsa Aterrizar con momentum (o sigue en crucero, según la bandera)
      const desat0 = M.desatascos || 0;
      let fija = 0, fijaMax = 0, px = S.pos.x, py = S.pos.y, pz = S.pos.z;
      const snaps = [];
      for (let i = 0; i < 780; i++) {
        I.stick.x = 0; I.stick.y = -1;
        F.step(DT, G.ui.busy());
        const dd = Math.hypot(S.pos.x - px, S.pos.y - py, S.pos.z - pz);
        if (M.flying && dd < 1e-4) fija++; else fija = 0;
        if (fija > fijaMax) fijaMax = fija;
        const interes = fija === 30 || fija === 90 || fija === 300 || i === 779;
        if (interes) {
          const pie = SOL.SO.stepUp - 0.05, hP = SOL.SO.cuerpo + pie;
          const pen = SOL.penetra(S.pos.x, S.pos.z, S.pos.y - pie, hP);
          const tc = techoCuerpo(S.pos.x, S.pos.z, S.pos.y, S.pos.y + 30, SOL.SO.cuerpo);
          snaps.push({ i, x: r2(S.pos.x), y: r2(S.pos.y), z: r2(S.pos.z), vy: r2(S.vy), sp: r2(M.speed), at: r2(M.atasco || 0),
            pen: r2(pen), techo: tc === Infinity ? null : r2(tc), perchY: M.perchY === -Infinity ? null : r2(M.perchY),
            suelo: r2(F.suelo(S.pos.x, S.pos.z, S.pos.y)), h: r2(H(S.pos.x, S.pos.z)), land: !!M.landing, fly: !!M.flying, gr: !!M.grounded });
        }
        px = S.pos.x; py = S.pos.y; pz = S.pos.z;
        if (fijaMax > 240) break;
      }
      I.stick.x = I.stick.y = 0;
      runs.push({ dir: k, angDeg: Math.round(a * 180 / Math.PI), dy, llegada: true, fijaMax, segFija: r2(fijaMax * DT),
        desatascos: (M.desatascos || 0) - desat0, aterrizo: !M.flying, fin: snaps.length ? snaps[snaps.length - 1] : null,
        snaps: fijaMax >= 90 ? snaps : undefined });
    }
  }
  return JSON.stringify({ base, perfil, runs });
})()`;

async function lanzarChromeUnaVez() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3q-'));
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
    const ps = "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*kimi3q-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
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
  console.log(`· QA-156a2 · punto (${PX},${PZ}) · ${FRAMES} cuadros por intento${DIR !== null ? ' · solo dir ' + DIR : ''}`);
  const res = { etiqueta: ETIQUETA, cuando: new Date().toISOString(), punto: { x: PX, z: PZ }, frames: FRAMES };
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
    res.repro = r;
    const atascados = (r.runs || []).filter(x => x.fijaMax >= 90);
    console.log(`· sitio: h0=${r.base.h0} percha=${JSON.stringify(r.base.percha)} pos tras teleport=${JSON.stringify(r.base.pos)}`);
    console.log(`· intentos: ${(r.runs || []).length} · atascados (≥1,5 s fija): ${atascados.length}`);
    for (const a of atascados.slice(0, 8)) console.log(`  dir=${a.dir} (${a.angDeg}°) dy=${a.dy} · fija ${a.segFija} s · desatascos=${a.desatascos} · aterrizo=${a.aterrizo} · fin=${JSON.stringify(a.fin)}`);
    const f = path.join(SALIDA, `qa156a2-${ETIQUETA}.json`);
    fs.writeFileSync(f, JSON.stringify(res, null, 1));
    console.log('· escrito ' + f);
  } catch (e) {
    res.error = String(e && e.message || e);
    console.error('· ERROR: ' + res.error);
    try { fs.writeFileSync(path.join(SALIDA, `qa156a2-${ETIQUETA}.json`), JSON.stringify(res, null, 1)); } catch (e2) { /* */ }
  } finally {
    try { chrome.kill('SIGKILL'); } catch (e) { /* */ }
    await cdp.bombear(0.8);
    limpiarHuerfanos();
    try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { /* */ }
    srv.close();
  }
})();
