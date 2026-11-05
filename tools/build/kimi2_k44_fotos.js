#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-044: capturas para Kelvin de la Ciudad viva en «bajo».
   iPhone 390x844 dpr 3 CPU x4 GPU real. La camara del juego sigue a Vittata: se apunta a un ave REAL
   posada en un tejado (desde AV.G.ciudadViva.aves()) para que la cotorra salga en el encuadre.
   - plaza: Vittata a ~9 m de un ave posada en tejado, camara hacia ella (la torre con cotorras al fondo).
   - aire: Vittata volando a +22 m sobre la plaza, camara picada (las ruinas + las posadas de abajo).
   - villa: Vittata de pie en el cesped de Villa Raiz (sin volar), vecinos cerca del sitio (125,140).
   Salida: docs/img/kimi044/k44-fotos-<etiqueta>_*.jpg
   Uso: node tools/build/kimi2_k44_fotos.js [--etiqueta f1] */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi044');
fs.mkdirSync(SALIDA, { recursive: true });
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ETIQUETA = arg('--etiqueta', 'f1');
let PERFIL = null, CHROME_PID = null;
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ANCHO = 390, ALTO = 844, DPR = 3, CPU = 4;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
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
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(method, params, sessionId, timeoutMs) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method, params: params || {}, sessionId })); if (timeoutMs) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + method)); } }, timeoutMs); }); }
  async bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function evaluar(cdp, ses, exp, timeoutS, promesa) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: promesa !== false, returnByValue: true }, ses, (timeoutS || 30) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 400));
  return r.result ? r.result.value : undefined;
}
async function lanzarChrome() {
  PERFIL = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2k44f-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + PERFIL, '--enable-gpu', '--ignore-gpu-blocklist',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio', '--disable-sync',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--disable-component-update', '--enable-precise-memory-info', '--window-size=500,900'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  CHROME_PID = chrome.pid;
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(PERFIL, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools: ' + err.slice(0, 300));
}
function matarChrome() { if (!CHROME_PID) return; try { execSync(`taskkill /PID ${CHROME_PID} /T /F 2>NUL`, { stdio: 'ignore' }); } catch (e) { /* ya muerto */ } CHROME_PID = null; }

const SEMILLA_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi2-k44f-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 1,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: true, B: true }, examined: { maquina: true, transmisor: true }
  }));
} catch (e) {}`;

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  let lanzado = null;
  for (let i = 0; i < 3 && !lanzado; i++) { try { lanzado = await lanzarChrome(); } catch (e) { console.log('· intento ' + (i + 1) + ': ' + e.message.slice(0, 120)); await new Promise(r => setTimeout(r, 1500)); } }
  if (!lanzado) { console.log('· Chrome no arrancó'); process.exit(1); }
  const { chrome, puerto: puertoDev, wsPath } = lanzado;
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws);
  await cdp.listo();
  console.log(`· iPhone ${ANCHO}x${ALTO} dpr ${DPR} CPU x${CPU} GPU real · calidad «bajo» natural`);
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
  await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
  await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
  await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS }, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1&mapa=real` }, ses);
  const t0 = Date.now(); let listo = false;
  while (Date.now() - t0 < 150000) {
    try { if (await evaluar(cdp, ses, `!!(window.AV && AV.G && AV.G.actores && (AV.G.actores.player3D || AV.G.actores.failed3D))`, 10, false)) { listo = true; break; } } catch (e) {}
    await cdp.bombear(0.5);
  }
  if (!listo) { console.log('· no arrancó'); matarChrome(); process.exit(1); }
  await cdp.bombear(2);
  console.log('· entrada: ' + await evaluar(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
    const t = $('title'); const b = t.querySelector('form[method=dialog] button'); b.click(); await sleep(2500);
    const C = AV.cargaEsperar ? await AV.cargaEsperar(60000) : null; return 'ok' + (C ? ' (' + C.ms + ' ms)' : ''); })()`, 120));
  // cargar los módulos con un gesto sintético y dejar que las aves hagan rutinas un rato
  await evaluar(cdp, ses, `(dispatchEvent(new PointerEvent('pointerdown')), 'ok')`, 10, false);
  await evaluar(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms));
    for (let i = 0; i < 60; i++) { await sleep(500); if (AV.G.vecinos && AV.G.ciudadViva) break; } return 'ok'; })()`, 60);
  await evaluar(cdp, ses, `(AV.teleport(12, -114.8), (AV.G.mundo.streaming && AV.G.mundo.streaming.alrededor(12, -114.8).catch(() => {})), 'ok')`, 60, false);
  await evaluar(cdp, ses, `(AV.G.solidos.terminar(), 'ok')`, 60, false);
  await cdp.bombear(4);
  // asentar y poblar: dejar corriendo las rutinas ~20 s para que se posen en tejados
  await evaluar(cdp, ses, `(AV.G.ciudadViva.paso(0.05, true), 'ok')`, 20, false);
  await cdp.bombear(20);

  async function captura(nombre) {
    await cdp.bombear(1.2);
    const r = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 30000);
    fs.writeFileSync(path.join(SALIDA, nombre), Buffer.from(r.data, 'base64'));
    console.log('  · ' + nombre);
  }
  const infoAve = JSON.parse(await evaluar(cdp, ses, `(() => {
    const aves = AV.G.ciudadViva.aves();
    const posadas = aves.filter(a => a.est === 'posada' && a.perch && a.perch.tipo !== 'suelo');
    const p = posadas.length ? posadas[Math.floor(posadas.length / 2)] : aves[0];
    const suelo = (AV.G.ciudadViva.perchas().suelo || [])[0] || null;
    return JSON.stringify({ x: p.x, y: p.y, z: p.z, est: p.est, accion: p.accion, tipo: p.perch ? p.perch.tipo : '-',
      posadas: posadas.length, total: aves.length, suelo }); })()`, 20, false));
  console.log('· ave objetivo: ' + JSON.stringify(infoAve));

  // PLAZA: Vittata EN el tejado del grupo de aves que conversan (las cotorras del grupo entran en el encuadre)
  const grp = JSON.parse(await evaluar(cdp, ses, `(() => {
    const aves = AV.G.ciudadViva.aves();
    const posadas = aves.filter(a => a.est === 'posada' && a.perch && a.perch.tipo !== 'suelo');
    let mejor = null, mejorN = 0;
    for (const a of posadas) { const n = posadas.filter(b => Math.hypot(b.x - a.x, b.z - a.z) < 6 && Math.abs(b.y - a.y) < 3).length;
      if (n > mejorN) { mejorN = n; mejor = a; } }
    const p = mejor || posadas[0] || aves[0];
    return JSON.stringify({ x: p.x, y: p.y, z: p.z, n: mejorN, companeras: posadas.filter(b => Math.hypot(b.x - p.x, b.z - p.z) < 6 && Math.abs(b.y - p.y) < 3).length }); })()`, 20, false));
  console.log('· grupo: ' + JSON.stringify(grp));
  await evaluar(cdp, ses, `(() => { const G = AV.G, S = G.S;
    if (G.fisica.MOVE.flying) { G.fisica.MOVE.flying = false; S.vy = 0; }
    G.camara.CAM.dist = 9; G.camara.inclina = 0;
    return 'ok'; })()`, 20, false);
  await evaluar(cdp, ses, `(AV.teleport(${grp.x.toFixed(2)}, ${grp.z.toFixed(2)}), 'ok')`, 60, false);
  await evaluar(cdp, ses, `(() => { const S = AV.G.S; S.pos.y = ${(grp.y + 0.1).toFixed(2)}; S.vy = 0; return 'ok'; })()`, 20, false);
  await evaluar(cdp, ses, `(AV.G.mundo.streaming && AV.G.mundo.streaming.alrededor(${grp.x.toFixed(2)}, ${grp.z.toFixed(2)}).catch(() => {}), AV.G.solidos.terminar(), 'ok')`, 60, false);
  await evaluar(cdp, ses, `(AV.G.ciudadViva.paso(0.05, true), 'ok')`, 20, false);
  await cdp.bombear(4);
  await captura(`k44-fotos-${ETIQUETA}_plaza.jpg`);

  // AIRE: volar a +18 m sobre el grupo, cámara alejada (CAM.distFly=22) y picada: el tejado con cotorras abajo
  await evaluar(cdp, ses, `(() => { const G = AV.G, S = G.S;
    G.fisica.MOVE.flying = true; S.vy = 0;
    S.pos.x = ${grp.x.toFixed(2)} + 10; S.pos.z = ${grp.z.toFixed(2)} + 10;
    S.pos.y = AV.debug.height(S.pos.x, S.pos.z) + 18;
    G.camara.CAM.distFly = 22; G.camara.inclina = -8; AV.debug.camYaw(Math.atan2(-10, -10));
    if (G.mundo.streaming && G.mundo.streaming.alrededor) G.mundo.streaming.alrededor(S.pos.x, S.pos.z).catch(() => {});
    return JSON.stringify({ x: Math.round(S.pos.x), y: Math.round(S.pos.y), z: Math.round(S.pos.z) }); })()`, 30, false);
  await evaluar(cdp, ses, `(AV.G.solidos.terminar(), AV.G.ciudadViva.paso(0.05, true), 'ok')`, 60, false);
  await cdp.bombear(5);
  await captura(`k44-fotos-${ETIQUETA}_aire.jpg`);

  // VILLA: de pie en tierra firme junto al sitio (125,140): se elige el candidato con altura > 3 m entre los cercanos
  await evaluar(cdp, ses, `(() => { const G = AV.G, S = G.S;
    G.fisica.MOVE.flying = false; S.vy = 0; G.camara.inclina = 0; G.camara.CAM.dist = 12; return 'ok'; })()`, 20, false);
  const villaSpot = JSON.parse(await evaluar(cdp, ses, `(() => {
    const H = AV.debug.height; const cands = [];
    for (const [x, z] of [[125, 140], [120, 133], [129, 134], [118, 141], [124, 128], [131, 142], [115, 130], [126, 148]]) cands.push({ x, z, h: H(x, z) });
    cands.sort((a, b) => b.h - a.h);
    const mejor = cands.find(c => c.h > 3) || cands[0];
    return JSON.stringify({ mejor, cands: cands.map(c => c.h) }); })()`, 20, false));
  console.log('· villa spot: ' + JSON.stringify(villaSpot));
  await evaluar(cdp, ses, `(AV.teleport(${villaSpot.mejor.x}, ${villaSpot.mejor.z}), AV.debug.camYaw(0.7), (AV.G.mundo.streaming && AV.G.mundo.streaming.alrededor(${villaSpot.mejor.x}, ${villaSpot.mejor.z}).catch(() => {})), 'ok')`, 60, false);
  await evaluar(cdp, ses, `(AV.G.solidos.terminar(), 'ok')`, 60, false);
  await cdp.bombear(5);
  const donde = await evaluar(cdp, ses, `JSON.stringify({ pos: [Math.round(AV.G.S.pos.x), Math.round(AV.G.S.pos.y), Math.round(AV.G.S.pos.z)], nadando: AV.G.fisica.MOVE.swimming || false, vecinos: AV.G.vecinos.estado() })`, 20, false);
  console.log('· villa: ' + donde);
  await captura(`k44-fotos-${ETIQUETA}_villa.jpg`);
  await evaluar(cdp, ses, `(() => { const C = AV.G.camara.CAM; C.dist = 7.5; C.distFly = 9.5; return 'ok'; })()`, 20, false);

  console.log('· errores: ' + await evaluar(cdp, ses, 'JSON.stringify((window.__aveErrores || []).slice(0, 6))', 10, false));
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { matarChrome(); }
  srv.close();
  process.exit(0);
})().catch(e => { console.error('FALLO:', e && e.message || String(e)); matarChrome(); process.exit(2); });
