#!/usr/bin/env node
/* Amazona Verse · Kimi 2 — KIMI-208 sonda: ¿el rechazo masivo de relleno/BL1 viene de normalAt con
   heightmap fuera del trozo del spawn? Muestrea puntos del mapa, calcula normalAt().y ANTES (mezcla
   TG/heightmap) y DESPUÉS de G.terreno.cargarTodo() (rejilla exacta en todo el mapa) y compara.
   Uso: node tools/build/kimi2_k208_nyprobe.js  → docs/img/kimi208/nyprobe.json */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi208');
fs.mkdirSync(SALIDA, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
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
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); this.onEvent = null;
    ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); };
    ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } else if (d.method && this.onEvent) this.onEvent(d); }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(m, p, s, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: m, params: p || {}, sessionId: s })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + m)); } }, t); }); }
  bombear(s) { return new Promise(r => setTimeout(r, (s || 0.3) * 1000)); }
}
async function ev(cdp, ses, expr, t) {
  const r = await cdp.call('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, ses, (t || 20) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 300));
  return r.result.value;
}
function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2ny-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio', '--disable-sync',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--disable-component-update', '--window-size=500,900'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort');
  return new Promise((res, rej) => {
    let v = 0;
    const iv = setInterval(() => {
      if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { clearInterval(iv); return res({ chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }); } }
      if (++v > 300) { clearInterval(iv); rej(new Error('Chrome no abrió DevTools: ' + err.slice(0, 200))); }
    }, 200);
  });
}
const SEMILLA = `try { localStorage.clear(); localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({ v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-nyprobe', profile: { created: true, name: 'Sonda', look: null },
  pos: { x: 134, z: 182.5, y: 5.24 }, facing: { x: 0, z: -1 }, step: 0, inv: {}, collected: [], complete: false, explorando: false, clock: 0, events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
  comic: { title: 'c', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} }, evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false } })); } catch (e) {}`;

const MUESTRA = `(() => { const G = window.AV && AV.G; if (!G || !G.terreno) return { error: 'sin terreno' };
  const T = G.terreno, M = T.mapa.tamano;
  // mismas zonas que los bucles de relleno: elipse del tepuy + franja montañosa (|pendiente| alta)
  const pts = [];
  let s = 12345;
  const rnd = () => (s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296;
  for (let i = 0; i < 2500; i++) pts.push([ -25 + (rnd() * 2 - 1) * 135, -160 + (rnd() * 2 - 1) * 105 ]); // elipse tepuy
  for (let i = 0; i < 2500; i++) pts.push([ M.x0 + rnd() * M.ancho, M.z0 + rnd() * M.largo ]);            // isla entera
  const mide = () => {
    const r = { ny072: 0, ny: [], h: [] };
    for (const [x, z] of pts) { const ny = T.normalAt(x, z).y; r.ny.push(Math.round(ny * 1000) / 1000); r.h.push(Math.round(T.height(x, z) * 100) / 100); if (ny < 0.72) r.ny072++; }
    return r;
  };
  const antes = mide();
  return { cargadosAntes: T.chunks.length, puntos: pts.length, antes };
})()`;

const DESPUES = `(() => { const G = window.AV && AV.G; const T = G.terreno;
  const M = T.mapa.tamano;
  const pts = [];
  let s = 12345;
  const rnd = () => (s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296;
  for (let i = 0; i < 2500; i++) pts.push([ -25 + (rnd() * 2 - 1) * 135, -160 + (rnd() * 2 - 1) * 105 ]);
  for (let i = 0; i < 2500; i++) pts.push([ M.x0 + rnd() * M.ancho, M.z0 + rnd() * M.largo ]);
  let ny072 = 0; const ny = [];
  for (const [x, z] of pts) { const v = T.normalAt(x, z).y; ny.push(Math.round(v * 1000) / 1000); if (v < 0.72) ny072++; }
  return { cargadosDespues: T.chunks.length, despues: { ny072, ny } };
})()`;

(async () => {
  const res = { head: require('child_process').execSync('git rev-parse --short HEAD', { cwd: RAIZ, encoding: 'utf8' }).trim(), consola: [] };
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const chromeL = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${chromeL.puerto}${chromeL.wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  cdp.onEvent = d => { if (d.method === 'Runtime.exceptionThrown') res.consola.push('EXC: ' + JSON.stringify(d.params.exceptionDetails.exception && d.params.exceptionDetails.exception.description || d.params.exceptionDetails.text).slice(0, 200)); };
  const limpiar = () => { try { chromeL.chrome.kill(); } catch (e) {} try { fs.rmSync(chromeL.perf, { recursive: true, force: true }); } catch (e) {} srv.close(); };
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA }, ses);
    await cdp.call('Page.navigate', { url: origen + '/index.html?qa=1&cap=1&v18=0' }, ses);
    let listo = false;
    for (let i = 0; i < 150 && !listo; i++) { await cdp.bombear(0.5); try { listo = await ev(cdp, ses, `!!(window.AV && AV.G && AV.G.vegetacion && AV.G.vegetacion.listo)`, 8); } catch (e) {} }
    if (!listo) throw new Error('vegetación no lista en 75 s');
    const a = await ev(cdp, ses, MUESTRA, 60);
    Object.assign(res, a);
    // carga el terreno completo y re-mide
    await ev(cdp, ses, `(() => { AV.G.terreno.cargarTodo(); return true; })()`, 10);
    for (let i = 0; i < 60; i++) { await cdp.bombear(0.5); const n = await ev(cdp, ses, `AV.G.terreno.chunks.length`, 8).catch(() => 0); if (n >= 4) break; }
    await cdp.bombear(1);
    const d = await ev(cdp, ses, DESPUES, 60);
    Object.assign(res, d);
    // comparación
    const antes = res.antes, despues = res.despues;
    let flips = 0, peor = [];
    for (let i = 0; i < antes.ny.length; i++) {
      const A = antes.ny[i] < 0.72, B = despues.ny[i] < 0.72;
      if (A !== B) { flips++; if (peor.length < 8) peor.push({ i, nyA: antes.ny[i], nyB: despues.ny[i], hA: antes.h[i] }); }
    }
    res.comp = { rechazadosAntes: antes.ny072, rechazadosDespues: despues.ny072, flips, peor };
    res.ok = true;
  } catch (e) { res.fallo = String(e && e.stack || e).slice(0, 400); }
  fs.writeFileSync(path.join(SALIDA, 'nyprobe.json'), JSON.stringify(res, null, 2));
  console.log(JSON.stringify(res.comp || res, null, 1));
  limpiar();
  process.exit(res.ok ? 0 : 1);
})();
