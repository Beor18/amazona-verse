#!/usr/bin/env node
/* Amazona Verse · Kimi 2 — KIMI-203 smoke: terreno por cercanía.
   Entra con partida sembrada de cap1 (misma semilla que kimi1_062), espera el reveal y vuelca:
   - S.pos en el arranque y qué trozos de terreno quedaron cargados (y cuáles no);
   - errores de consola; captura de la vista de arranque;
   - luego «vuela» hacia la ciudad (S.pos a (-20,-100)): el trozo lejano debe cargar en <3 s.
   Uso: node tools/build/kimi2_k203_smoke.js [--etiqueta r1]  → docs/img/kimi203/smoke_<etiqueta>.json
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ETIQUETA = arg('--etiqueta', 'r1');
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi203');
fs.mkdirSync(SALIDA, { recursive: true });
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.ico': 'image/x-icon' };
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
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2s203-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', '--window-size=500,900'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  return new Promise((res, rej) => {
    let vueltas = 0;
    const iv = setInterval(() => {
      if (fs.existsSync(puertoFile)) {
        const l = fs.readFileSync(puertoFile, 'utf8').split('\n');
        if (l.length > 1 && l[1].trim()) { clearInterval(iv); return res({ chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }); }
      }
      if (++vueltas > 300) { clearInterval(iv); rej(new Error('Chrome no abrió DevTools: ' + err.slice(0, 200))); }
    }, 200);
  });
}

// misma semilla que kimi1_062 (partida cap1 en la villa, sin creador)
const SEMILLA = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi2-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: 134, z: 182.5, y: 5.24 }, facing: { x: 0, z: -1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;

const TERRENO_JS = `(() => { const G = window.AV && AV.G; if (!G || !G.terreno) return { listo: false };
  const trozos = (G.terreno.mapa && G.terreno.mapa.terreno && G.terreno.mapa.terreno.trozos || []).map(t => t.id);
  const cargados = G.terreno.chunks.map(m => m.name);
  return { pos: { x: G.S.pos.x, z: G.S.pos.z }, trozos, cargados,
    exacto: G.terreno.exacto,
    alturas: { centro: G.terreno.height(0, 0), villa: G.terreno.height(134, 182.5), ciudad: G.terreno.height(-4, -127) },
    splatCiudad: !!G.terreno.splatAt(-4, -127), sueloEnCiudad: G.terreno.sueloEn ? G.terreno.sueloEn(-4, -127) : null,
    vegetacion: G.vegetacion && G.vegetacion.listo ? 'lista' : 'pendiente' }; })()`;

(async () => {
  const res = { etiqueta: ETIQUETA, head: require('child_process').execSync('git rev-parse --short HEAD', { cwd: RAIZ, encoding: 'utf8' }).trim(), consola: [], pasos: [] };
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const chromeL = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${chromeL.puerto}${chromeL.wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  cdp.onEvent = d => {
    if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') res.consola.push(d.params.entry.text.slice(0, 200));
    if (d.method === 'Runtime.exceptionThrown') res.consola.push('EXC: ' + JSON.stringify(d.params.exceptionDetails.exception && d.params.exceptionDetails.exception.description || d.params.exceptionDetails.text).slice(0, 300));
  };
  const limpiar = () => { try { chromeL.chrome.kill(); } catch (e) {} try { fs.rmSync(chromeL.perf, { recursive: true, force: true }); } catch (e) {} srv.close(); };
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Network.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: 4 }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA }, ses);
    await cdp.call('Page.navigate', { url: origen + '/index.html?qa=1&cap=1&v18=0' }, ses);

    // espera al reveal (pantalla de carga cerrada) con tope 60 s
    let revelado = false;
    for (let i = 0; i < 150 && !revelado; i++) {
      await cdp.bombear(0.4);
      try { revelado = await ev(cdp, ses, `(() => { const el = document.querySelector('#carga'); const u = AV.carga && AV.carga.ultima; return (el && (el.hidden || el.classList.contains('carga-sale'))) || !!(u && u.motivo); })()`, 8); } catch (e) {}
    }
    res.revelado = revelado;
    await cdp.bombear(1.5);
    try { res.enReveal = await ev(cdp, ses, TERRENO_JS, 15); } catch (e) { res.enReveal = { error: String(e).slice(0, 200) }; }
    const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 80 }, ses, 30000);
    fs.writeFileSync(path.join(SALIDA, `smoke_${ETIQUETA}_reveal.jpg`), Buffer.from(shot.data, 'base64'));

    // espera 8 s quieto: NO debe cargar ningún trozo lejano en la ventana de arranque
    await cdp.bombear(8);
    try { res.tras8s = await ev(cdp, ses, TERRENO_JS, 15); } catch (e) { res.tras8s = { error: String(e).slice(0, 200) }; }

    // vuela hacia la ciudad: el trozo lejano debe cargar solo
    await ev(cdp, ses, `(() => { const G = AV.G; G.S.pos.x = -20; G.S.pos.z = -100; return true; })()`, 10);
    let llego = null;
    for (let i = 0; i < 15; i++) {
      await cdp.bombear(0.6);
      const t = await ev(cdp, ses, TERRENO_JS, 15).catch(() => null);
      if (t && t.cargados.length >= 4) { llego = t; break; }
      llego = t;
    }
    res.enCiudad = llego;
    const shot2 = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 80 }, ses, 30000);
    fs.writeFileSync(path.join(SALIDA, `smoke_${ETIQUETA}_ciudad.jpg`), Buffer.from(shot2.data, 'base64'));
    res.ok = res.revelado && res.enReveal && res.enReveal.cargados && res.enReveal.cargados.length <= 2 && res.tras8s && res.tras8s.cargados && res.tras8s.cargados.length <= 2 && res.enCiudad && res.enCiudad.cargados.length >= 4 && !res.consola.length;
  } catch (e) { res.fallo = String(e && e.stack || e).slice(0, 500); }
  fs.writeFileSync(path.join(SALIDA, `smoke_${ETIQUETA}.json`), JSON.stringify(res, null, 2));
  console.log(JSON.stringify(res, null, 2));
  limpiar();
  process.exit(res.ok ? 0 : 1);
})();
