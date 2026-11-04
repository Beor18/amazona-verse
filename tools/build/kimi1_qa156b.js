#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — QA-156(b): la marca de la crecida y la gota de p7 (poza_honda)
   alcanzables NADANDO/buceando con física real (sin teleport dentro del agua).

   Chrome headless propio + CDP; escritorio 960×540 (la física no depende del viewport), GPU real.
   1) parte sembrada de cap1 (sin creador), se forja la misión educativa en p7 (hecho p1..p6);
   2) teleport inicial al borde de la poza y NADO real hacia la roca de la marca (198.71, 110.48),
      muestreando pos/swimming/nivel de agua/distancias (igual que empuja el pulgar de ep_caminar);
   3) buceo con C mantenido hasta la gota del fondo (188.78, 116.01) y de vuelta a la roca;
   4) reporta si S.edu.poza.gota / .marca disparan y desde dónde.

   Salida: docs/img/kimi156b/qa156b_resultados.json (+ capturas)
   Uso: node tools/build/kimi1_qa156b.js
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
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi156b');
fs.mkdirSync(SALIDA, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    const qa = /[?&]qa=1(?:&|$)/.test(req.url);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); return res.end('404'); }
      if (qa && /index\.html$/.test(f)) d = Buffer.from(d.toString('utf8').replace(/<meta charset[^>]*>/i, m => m + '<script src="tests/qa/qa.js" charset="utf-8"></script>'), 'utf8');
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(d);
    });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(m, p, s, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: m, params: p || {}, sessionId: s })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + m)); } }, t); }); }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function ev(cdp, ses, exp, t, aw) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, returnByValue: true, awaitPromise: aw !== false }, ses, (t || 30) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 400));
  return r.result ? r.result.value : undefined;
}

// Semilla de partida cap1 (formato de kimi2_empezar; sin creador)
const SEMILLA_SAVE_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1-q156b-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: 134, z: 182.5, y: 5.24 }, facing: { x: 0, z: -1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;

const PREPARAR_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene Jugar'; b.click(); if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta'; }
  const cr = $('creator');
  if (cr && !cr.hidden) return 'el creador se abrió pese a la semilla';
  const S = window.AV && window.AV.state; if (!S || !S.profile || !S.profile.created) return 'sin perfil';
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(30000);
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 30000);
  const b = $('c1-saltar'); if (b && b.isConnected) { b.click(); await sleep(1200); }
  return 'ok'; })()`;

// Forja la misión educativa en p7 y reporta las posiciones que usa el juego
const FORJA_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
  const ST = G.mundo && G.mundo.streaming;
  if (ST && ST.alrededor) await ST.alrededor(187.8, 115.0);
  if (ST && ST.terminar) await ST.terminar();
  await sleep(1500);
  S.step = 3; S.missions.educativa = false;
  S.edu.hecho = { p1: true, p2: true, p3: true, p4: true, p5: true, p6: true, p7: false, p8: false };
  S.edu.poza = { gota: false, marca: false };
  await sleep(800);
  const E = G.c.edu;
  return JSON.stringify({ guia: E.guia(), fondoGota: E.fondo.gota(), fondoRoca: E.fondo.roca(), L: { gota: E.L.gota, roca: E.L.roca, poza: E.L.poza }, estado: E.estado() }); })()`;

// Núcleo: nado real hacia un objetivo con el palo sintético + buceo opcional con C.
// Devuelve la traza muestreada y si dispararon los hallazgos. Sin teleport durante el movimiento.
const NADO_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
  const P = ${'${PAYLOAD}'};
  const H = (x, z) => G.terreno.height(x, z);
  const MV = () => G.fisica.MOVE;
  const fin = performance.now() + P.segs * 1000;
  const muestras = []; let dMin = Infinity, dMinPos = null;
  let teclaC = false;
  const pulsarC = v => { const k = v ? 'keydown' : 'keyup'; window.dispatchEvent(new KeyboardEvent(k, { key: 'c', code: 'KeyC', bubbles: true })); teclaC = v; };
  while (performance.now() < fin) {
    const dx = P.x - S.pos.x, dz = P.z - S.pos.z, d = Math.hypot(dx, dz);
    if (d < dMin) { dMin = d; dMinPos = { x: +S.pos.x.toFixed(2), y: +S.pos.y.toFixed(2), z: +S.pos.z.toFixed(2) }; }
    G.camara.yaw = Math.atan2(-dx, -dz);
    G.input.stick.x = 0; G.input.stick.y = d > 0.6 ? -1 : 0;
    if (P.buceo && !teclaC) pulsarC(true);
    if (!P.buceo && teclaC) pulsarC(false);
    await sleep(250);
    muestras.push({ t: +((fin - performance.now()) / 1000).toFixed(1), x: +S.pos.x.toFixed(2), y: +S.pos.y.toFixed(2), z: +S.pos.z.toFixed(2),
      nada: !!MV().swimming, vuela: !!MV().flying, suelo: H(S.pos.x, S.pos.z).toFixed(2), agua: (G.agua.levelAt(S.pos.x, S.pos.z) || 0).toFixed(2),
      dRoca: +Math.hypot(S.pos.x - 198.71, S.pos.z - 110.48).toFixed(2), dGota: +Math.hypot(S.pos.x - 188.78, S.pos.z - 116.01).toFixed(2),
      gota: S.edu.poza.gota, marca: S.edu.poza.marca, water: +((S.water != null ? S.water : -1)).toFixed(2) });
    if ((P.hastaGota && S.edu.poza.gota) || (P.hastaMarca && S.edu.poza.marca)) break;
  }
  G.input.stick.x = 0; G.input.stick.y = 0; pulsarC(false);
  return JSON.stringify({ dMin: +dMin.toFixed(2), dMinPos, muestras: muestras.filter((_, i) => i % 2 === 0), gota: S.edu.poza.gota, marca: S.edu.poza.marca,
    pos: { x: +S.pos.x.toFixed(2), y: +S.pos.y.toFixed(2), z: +S.pos.z.toFixed(2) }, nada: !!MV().swimming }); })()`;

const TELEPORT_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
  const P = ${'${PAYLOAD}'};
  AV.teleport(P.x, P.z); S.pos.y = P.y; S.vy = 0;
  const ST = G.mundo && G.mundo.streaming;
  if (ST && ST.alrededor) await ST.alrededor(P.x, P.z);
  await sleep(1200);
  return JSON.stringify({ pos: { x: +S.pos.x.toFixed(2), y: +S.pos.y.toFixed(2), z: +S.pos.z.toFixed(2) }, nada: !!G.fisica.MOVE.swimming }); })()`;

const CAPTURA_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G;
  await sleep(400); const raf = () => new Promise(r => requestAnimationFrame(r)); await raf(); await raf();
  return G.renderer.snapshot(960, 540, 0.85); })()`;

async function lanzar() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1b-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', '--window-size=960,540'];
  const c = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let e0 = null; c.on('error', e => { e0 = e; });
  const pf = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { c, puerto: parseInt(l[0], 10), wsPath: l[1].trim(), perf }; }
    if (e0) throw new Error('spawn: ' + e0.message);
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('sin DevToolsActivePort');
}

(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const { c, puerto: pd, wsPath, perf } = await lanzar();
  const ws = new WebSocket(`ws://127.0.0.1:${pd}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const R = { cuando: new Date().toISOString(), maquina: 'PC Windows · Chrome headless GPU real RX 5700 XT · 960×540 dpr 1 · calidad bajo', fases: {} };
  console.log('· QA-156(b) · poza_honda: nado y buceo reales hacia la gota y la marca');
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 960, height: 540, deviceScaleFactor: 1, mobile: false }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1&calidad=bajo` }, ses);
    const t0 = Date.now(); let listo = false;
    while (Date.now() - t0 < CFG.espera_listo_s * 1000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { } await cdp.bombear(0.5); }
    if (!listo) throw new Error('el mundo no arrancó');
    const prep = await ev(cdp, ses, PREPARAR_JS, 120);
    if (!String(prep).startsWith('ok')) throw new Error('preparar falló: ' + prep);
    console.log('  · mundo listo, forjando p7…');
    R.fases.forja = JSON.parse(await ev(cdp, ses, FORJA_JS, 120));
    console.log('  · guía:', JSON.stringify(R.fases.forja.guia), '· gota:', JSON.stringify(R.fases.forja.fondoGota), '· roca:', JSON.stringify(R.fases.forja.fondoRoca));

    // Fase A: teleport al borde del agua y nado real hacia la roca de la marca
    R.fases.llegada = JSON.parse(await ev(cdp, ses, TELEPORT_JS.replace('${PAYLOAD}', JSON.stringify({ x: 187.8, z: 115.0, y: 3.6 })), 60));
    console.log('  · en la poza:', JSON.stringify(R.fases.llegada));
    const png0 = await ev(cdp, ses, CAPTURA_JS, 30);
    fs.writeFileSync(path.join(SALIDA, 'qa156b_en_la_poza.jpg'), Buffer.from(png0.split(',')[1], 'base64'));
    R.fases.nadoRoca = JSON.parse(await ev(cdp, ses, NADO_JS.replace('${PAYLOAD}', JSON.stringify({ x: 198.71, z: 110.48, segs: 75, buceo: false, hastaMarca: true })), 120));
    console.log('  · nado a la roca: dMin', R.fases.nadoRoca.dMin, 'en', JSON.stringify(R.fases.nadoRoca.dMinPos), '· marca:', R.fases.nadoRoca.marca);

    // Fase B: buceo real hasta la gota del fondo (C mantenido)
    R.fases.buceoGota = JSON.parse(await ev(cdp, ses, NADO_JS.replace('${PAYLOAD}', JSON.stringify({ x: 188.78, z: 116.01, segs: 30, buceo: true, hastaGota: true })), 60));
    console.log('  · buceo a la gota: dMin', R.fases.buceoGota.dMin, '· gota:', R.fases.buceoGota.gota);

    // Fase C: de vuelta, flotar/bucear junto a la roca para la marca
    R.fases.marca = JSON.parse(await ev(cdp, ses, NADO_JS.replace('${PAYLOAD}', JSON.stringify({ x: 198.71, z: 110.48, segs: 45, buceo: false, hastaMarca: true })), 90));
    console.log('  · marca tras la gota: dMin', R.fases.marca.dMin, '· marca:', R.fases.marca.marca);
    const png1 = await ev(cdp, ses, CAPTURA_JS, 30);
    fs.writeFileSync(path.join(SALIDA, 'qa156b_final.jpg'), Buffer.from(png1.split(',')[1], 'base64'));

    // Estado final
    R.fases.estadoFinal = JSON.parse(await ev(cdp, ses, `JSON.stringify({ poza: AV.G.S.edu.poza, hecho: AV.G.S.edu.hecho, agua: AV.G.S.water })`, 10));
    console.log('  · estado final:', JSON.stringify(R.fases.estadoFinal));
  } catch (e) { console.log('· ERROR ' + e.message); R.error = e.message; }
  fs.writeFileSync(path.join(SALIDA, 'qa156b_resultados.json'), JSON.stringify(R, null, 1));
  console.log('· listo → ' + SALIDA);
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { try { c.kill(); } catch (e2) { } }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close(); process.exit(0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(2); });
