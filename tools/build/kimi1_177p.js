#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-177 avance 2: prueba del enganche de la normal al subir calidad.
   En «bajo» los GLB del kit de la ciudad cargan una normal plana 2×2 (assets.js, URL modifier) en vez de la
   JPEG gigante embebida; al subir la calidad, el gancho 'calidad' de streaming.js debe enganchar la normal
   verdadera (G.assets.tex) al mismo material AV_HD_*. Esta herramienta: carga en móvil «bajo» natural,
   espera el mundo listo, verifica normal plana/ausente, sube a «alto», espera la descarga y verifica que la
   normal del atlas ya no es plana. Sale 1 si el enganche no funciona o hay errores de consola nuevos.
   Uso: node tools/build/kimi1_177p.js [--etiqueta r1]
   Salida: consola + docs/img/kimi177/k177p_<etiqueta>.json
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
const ETIQUETA = (() => { const i = process.argv.indexOf('--etiqueta'); return i > 0 ? process.argv[i + 1] : 'r1'; })();
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi177');
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
      if (qa && /index\.html$/.test(f) && fs.existsSync(path.join(RAIZ, 'tests', 'qa', 'qa.js'))) d = Buffer.from(d.toString('utf8').replace(/<meta charset[^>]*>/i, m => m + '<script src="tests/qa/qa.js" charset="utf-8"></script>'), 'utf8');
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(d);
    });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); this.onEvent = null; ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } else if (d.method && this.onEvent) this.onEvent(d); }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(m, p, s, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: m, params: p || {}, sessionId: s })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + m)); } }, t); }); }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function ev(cdp, ses, exp, t) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, returnByValue: true, awaitPromise: true }, ses, (t || 30) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 400));
  return r.result ? r.result.value : undefined;
}
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const SEMILLA_SAVE_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;
// Estado de las normales: recorre TODOS los materiales de la escena (los AV_HD_* son los del atlas del kit de ciudad)
const NORMALES_JS = `(() => {
  const out = {}, nombres = {};
  try {
    const R = AV.G.renderer; const escena = R.scene; const visto = new Set();
    escena.traverse(o => {
      if (!o.isMesh) return;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of ms) {
        if (!m || visto.has(m)) continue;
        visto.add(m);
        const nom = m.name || m.uuid;
        nombres[nom] = (nombres[nom] || 0) + 1;
        if (!/^AV_HD_/.test(nom)) continue;
        const n = m.normalMap, img = n && n.image;
        out[nom] = { tieneNormal: !!n, plana: !!(img && img.width === 2 && img.height === 2),
          w: img ? img.width : 0, h: img ? img.height : 0 };
      }
    });
  } catch (e) { out.error = String(e && e.message || e); }
  out._nombres = nombres;
  return out; })()`;

function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k177p-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--window-size=500,900'];
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
      if (++vueltas > 300) { clearInterval(iv); rej(new Error('Chrome no abrió DevTools en 60 s: ' + err.slice(0, 300))); }
    }, 200);
  });
}

(async () => {
  const res = { etiqueta: ETIQUETA, inicio: new Date().toISOString(), pasos: [], ok: false };
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const chromeL = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${chromeL.puerto}${chromeL.wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const erroresConsola = [];
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Network.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    cdp.onEvent = d => {
      if (d.method === 'Log.entryAdded' && d.params.entry && d.params.entry.level === 'error') erroresConsola.push(d.params.entry.text);
      if (d.method === 'Runtime.exceptionThrown') erroresConsola.push('EXC: ' + JSON.stringify(d.params.exceptionDetails && d.params.exceptionDetails.text || '').slice(0, 200));
      if (d.method === 'Network.responseReceived' && d.params.response && d.params.response.status >= 400) (res.http4xx = res.http4xx || []).push(d.params.response.status + ' ' + d.params.response.url);
    };
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA_IPHONE }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: 4 }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
    await cdp.call('Page.navigate', { url: origen + '/index.html?qa=1&cap=1&v18=1' }, ses);
    // 1) esperar mundo listo (máx 60 s)
    let listo = false;
    for (let i = 0; i < 150 && !listo; i++) {
      await cdp.bombear(0.4);
      try { listo = !!(await ev(cdp, ses, `!!(window.AV && AV.G && AV.G.mundo && AV.G.mundo.listo)`, 8)); } catch (e) {}
    }
    if (!listo) throw new Error('mundo no listo en 60 s');
    // 1b) esperar a que el kit de la ciudad (materiales AV_HD_*) entre en escena: los _lejos tardan 15-25 s
    let bajo = null, cal0 = '?';
    for (let i = 0; i < 100; i++) {
      await cdp.bombear(1);
      bajo = await ev(cdp, ses, NORMALES_JS);
      if (Object.keys(bajo).some(k => /^AV_HD_/.test(k))) break;
      if (i % 10 === 0) cal0 = await ev(cdp, ses, `(AV.G.renderer.calidad||{}).nivel || '?'`);
    }
    cal0 = await ev(cdp, ses, `(AV.G.renderer.calidad||{}).nivel || '?'`);
    res.pasos.push({ fase: 'bajo', calidad: cal0, normales: bajo });
    // 2) subir a «alto» manual y esperar la descarga de la normal verdadera
    await ev(cdp, ses, `AV.G.renderer.setCalidad('alto', true) && 'ok'`, 10);
    await cdp.bombear(6);
    const alto = await ev(cdp, ses, NORMALES_JS);
    const cal1 = await ev(cdp, ses, `(AV.G.renderer.calidad||{}).nivel || '?'`);
    res.pasos.push({ fase: 'alto', calidad: cal1, normales: alto });
    // 3) veredicto
    const nombres = Object.keys(bajo).filter(k => /^AV_HD_/.test(k));
    const sinNormalesAlta = nombres.filter(k => !alto[k] || !alto[k].tieneNormal || alto[k].plana);
    const planasEnBajo = nombres.filter(k => bajo[k].tieneNormal && bajo[k].plana).length;
    const enganchada = nombres.length > 0 && sinNormalesAlta.length === 0;
    res.ok = enganchada && nombres.length > 0;
    res.veredicto = {
      materialesAV_HD: nombres.length,
      planasEnBajo: planasEnBajo,
      sinNormalRealEnAlto: sinNormalesAlta,
      engancheOk: enganchada,
      nombresEnEscena: bajo._nombres,
      errorEscena: bajo.error || alto.error || null
    };
  } catch (e) {
    res.error = String(e && e.message || e);
  }
  res.erroresConsola = erroresConsola.slice(0, 20);
  try { const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 30000); fs.writeFileSync(path.join(SALIDA, `k177p_${ETIQUETA}_final.jpg`), Buffer.from(shot.data, 'base64')); } catch (e) {}
  fs.writeFileSync(path.join(SALIDA, `k177p_${ETIQUETA}.json`), JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res.veredicto || res, null, 1));
  console.log('errores de consola:', erroresConsola.length, erroresConsola.slice(0, 5));
  console.log('JSON:', path.join(SALIDA, `k177p_${ETIQUETA}.json`));
  try { chromeL.chrome.kill(); } catch (e) {}
  srv.close();
  process.exit(res.ok && erroresConsola.length === 0 ? 0 : 1);
})();
