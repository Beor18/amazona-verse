#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-018: capturas y medición de los faroles del cap. 1.
   Réplica del flujo CAPTURAS de tools/build/kimi2_empezar.js (Chrome headless propio + CDP, sirve la copia de trabajo),
   con dos extras: (1) por vista se toma captura de DÍA y de NOCHE (AV.G.S.hora = 20) y (2) reporta por vista y por fase
   FPS, draw calls, triángulos y memoria de texturas (renderer.stats()). Escritorio 1280×800 para las capturas; la medición
   en móvil simulado va con tools/build/kimi2_empezar.js (375×812, CPU ×4), antes y después.

   Uso: node tools/build/kimi1_faroles.js [--salida docs/img/kimi018] [--solo villa|ciudad] [--pack cap1]
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const PACK = arg('--pack', 'cap1');
const SOLO = arg('--solo', '');
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi018'));
fs.mkdirSync(SALIDA, { recursive: true });

// vistas: [x, z, yaw, id] (yaw según AV.debug.camYaw; π = mirar al norte, 0 = al sur, π/2 = oeste, -π/2 = este)
const VISTAS = [
  { id: 'villa_muelle', x: 150, z: 203, yaw: Math.PI, nota: 'desde el muelle hacia la plaza' },
  { id: 'villa_plaza', x: 145.5, z: 178.5, yaw: Math.PI * 0.82, nota: 'entrada de la plaza' },
  { id: 'ciudad_este', x: -4, z: -127, yaw: Math.PI, nota: 'Ciudad de los 36 · tepuy este' },
  { id: 'ciudad_oeste', x: -74.1, z: -131.9, yaw: Math.PI * 0.9, nota: 'Ciudad de los 36 · tepuy oeste' },
].filter(v => !SOLO || v.id.includes(SOLO));

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };

function servir() {
  const QA_TAG = '<script src="tests/qa/qa.js" charset="utf-8"></script>';
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    const qa = /[?&]qa=1(?:&|$)/.test(req.url);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); return res.end('404'); }
      if (qa && /index\.html$/.test(f)) d = Buffer.from(d.toString('utf8').replace(/<meta charset[^>]*>/i, m => m + QA_TAG), 'utf8');
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(d);
    });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; }
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
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 300));
  return r.result ? r.result.value : undefined;
}

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', '--window-size=1400,900'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = '', spawnErr = null; chrome.stderr.on('data', d => { err += d; });
  chrome.on('error', e => { spawnErr = e; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  // KIMI-1: en Windows el proceso lanzador de Chrome sale con código 0 enseguida mientras el navegador real sigue vivo
  // y escribe DevToolsActivePort al cabo de unos cientos de ms: se espera al archivo, no al exitCode del lanzador.
  for (let i = 0; i < 125; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); return { chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    if (spawnErr) throw new Error('Chrome no arrancó: ' + spawnErr.message + ' ' + err.slice(0, 300));
    await new Promise(r => setTimeout(r, 200));
  }
  try { chrome.kill(); } catch (e) {}
  throw new Error('Chrome no abrió DevTools en 25 s: ' + err.slice(0, 300));
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws);
  await cdp.listo();
  const relojPerro = setTimeout(() => { console.log('· WATCHDOG: se acabó el tiempo'); process.exit(1); }, 8 * 60 * 1000);
  console.log(`· servidor ${origen} · capturas en ${SALIDA}`);
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }, ses);
  await cdp.call('Emulation.setCPUThrottlingRate', { rate: 1 }, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1&atardecer=1${PACK === 'cap1' ? '' : '&pack=' + PACK}` }, ses);
  const t0 = Date.now();
  let listo = false;
  while (Date.now() - t0 < CFG.espera_listo_s * 1000) {
    try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { /* aún no */ }
    await cdp.bombear(0.5);
  }
  if (!listo) { console.log('· el juego no arrancó'); process.exit(1); }
  console.log('· jugador nuevo: ' + await evaluar(cdp, ses, CFG.preparar_js, 300));
  await cdp.bombear(2.5);
  // La intro del cap. 1 corta al taller y pasea la cámara por los POIs: se salta siempre para capturar el mundo en calma
  console.log('· intro: ' + await evaluar(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)); for (let i = 0; i < 200; i++) { const b = document.getElementById('c1-saltar'); if (b && b.isConnected) { b.click(); return 'saltada'; } await sleep(100); } return 'sin botón (¿ya terminó?)'; })()`, 40, true));
  await cdp.bombear(1.5);

  const FASES = [
    { suf: 'dia', js: `(() => { const A = AV.G.atardecer; if (A) { A.forzar(false); A.avanzar(9); } delete AV.G.S.hora; return 'ok'; })()`, espera: 1.6 },
    { suf: 'atardecer', js: `(() => { const A = AV.G.atardecer; A.forzar(true); A.avanzar(9); return 'ok: k=' + A.k(); })()`, espera: 2.0 },
    { suf: 'noche_faroles', js: `(() => { AV.G.atardecer.forzar(false); AV.G.atardecer.avanzar(9); AV.G.S.hora = 20; return 'ok'; })()`, espera: 3.0 },
  ];
  const resultados = [];
  for (const v of VISTAS) {
    await evaluar(cdp, ses, `(AV.teleport(${v.x}, ${v.z}), AV.G.S.pos.y += 0.4, AV.G.S.vy = 0, AV.G.fisica.MOVE.flying = true, AV.debug.camYaw(${v.yaw}), 'ok')`, 45, false);
    for (const f of FASES) {
      await evaluar(cdp, ses, f.js, 20, true);
      await cdp.bombear(f.espera + 1.6); // encendido/apagado con lerp + streaming
      const stats = JSON.parse(await evaluar(cdp, ses, "JSON.stringify(Object.assign({}, AV.G.renderer.stats(), { memoria: AV.G.renderer.renderer.info.memory }))", 10, false));
      const dataUrl = await evaluar(cdp, ses, "AV.G.renderer.snapshot(1280, 800, 0.92)", 90);
      const ruta = path.join(SALIDA, `${v.id}_${f.suf}.jpg`);
      if (dataUrl && dataUrl !== 'null') fs.writeFileSync(ruta, Buffer.from(dataUrl.split(',')[1], 'base64'));
      const pos = JSON.parse(await evaluar(cdp, ses, "JSON.stringify({x: Math.round(AV.G.S.pos.x), y: Math.round(AV.G.S.pos.y), z: Math.round(AV.G.S.pos.z)})", 10, false));
      console.log(`  · ${v.id} [${f.suf}] @(${pos.x},${pos.y},${pos.z}): ${stats.fps} FPS · ${stats.calls} calls · ${Math.round(stats.triangulos / 1000)} k tris`);
      resultados.push({ vista: v.id, fase: f.suf, pos, stats });
    }
  }
  await evaluar(cdp, ses, `(async () => { const A = AV.G.atardecer; if (A) { A.forzar(null); A.avanzar(9); } AV.G.fisica.MOVE.flying = false; delete AV.G.S.hora; return 'ok'; })()`, 20, true);
  // estado interno de los faroles para el informe
  const far = await evaluar(cdp, ses, `(() => { const f = AV.G.ambiente && AV.G.ambiente.faroles && AV.G.ambiente.faroles(); return JSON.stringify(f ? { postes: f.posts.count, puntos: f.pts.geometry.attributes.position.count, enc: +f.enc.toFixed(2), activos: f.spots.filter(s => s.activo).length, visible: f.pts.visible } : null); })()`, 10, false);
  console.log('· faroles: ' + far);
  const errs = await evaluar(cdp, ses, 'JSON.stringify((window.__aveErrores || []).slice(0, 8))', 10, false);
  console.log('· errores de consola: ' + errs);
  fs.writeFileSync(path.join(SALIDA, 'medidas.json'), JSON.stringify({ vistas: resultados, faroles: JSON.parse(far || 'null'), errores: JSON.parse(errs || '[]') }, null, 2));
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { chrome.kill(); }
  srv.close();
  clearTimeout(relojPerro);
  process.exit(0);
})().catch(e => { console.error('FALLO:', e && e.stack || String(e)); process.exit(2); });
