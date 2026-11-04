#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — QA-53 (resto): tormenta de re-enlaces al cambiar las sombras.
   El adaptativo cambia de calidad (~3 s tras el reveal) y todas las familias con luz pedían programa nuevo
   (USE_SHADOWMAP) dentro del primer dibujo: tirón de 100–600 ms. Fix en renderer.js: genLuz entra en la clave
   del precalentado de las familias con luz y el recalentado las re-enlaza por tandas (6/cuadro) fuera del dibujo.
   Esta herramienta: entra con partida sembrada (móvil 375×812 dpr 3, CPU ×4, GPU real), deja pasar el reveal,
   fuerza setCalidad medio→bajo (sombras OFF, la tormenta) y mide los cuadros siguientes. Control visual:
   draw calls y píxeles no negros a los 5 s (nada queda oculto). Salida: consola + docs/img/kimi053/qa53.json.
   Uso: node tools/build/kimi2_qa53.js [--rondas 2]
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
const ANCHO = 375, ALTO = 812, DPR = 3, CPU = 4;
const RONDAS = +(arg('--rondas', '2'));
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi053');
fs.mkdirSync(SALIDA, { recursive: true });
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    const qa = /[?&]qa=1(?:&|$)/.test(req.url);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || (req.method !== 'GET' && req.method !== 'HEAD')) { res.writeHead(403); return res.end(); }
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

// Semilla de cap1 (jugador existente: Jugar entra directo, sin creador) — misma que kimi2_empezar.js (QA-111)
const SEMILLA_SAVE_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi2-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;
const SONDA_JS = `(() => { const Q = window.__qaM = { dt: [], top: [] }; let t = 0, t0 = 0;
  const f = n => { if (!t0) t0 = n; if (t) { const d = n - t; Q.dt.push(d); const e = { d: Math.round(d), t: Math.round((t - t0) / 100) / 10 };
    const i = Q.top.findIndex(x => x.d < e.d); if (i >= 0) Q.top.splice(i, 0, e); else if (Q.top.length < 8) Q.top.push(e); if (Q.top.length > 8) Q.top.pop(); } t = n;
    if (Q.dt.length > 30000) Q.dt.splice(0, 15000); requestAnimationFrame(f); }; requestAnimationFrame(f); })()`;
const PREPARAR_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene el botón Jugar'; b.click();
    if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta tras Jugar'; }
  const cr = $('creator');
  if (cr && !cr.hidden) { await espera(() => $('p-stage-status') && $('p-stage-status').hidden, 30000); const s = $('p-save'); if (!s) return 'sin Empezar';
    s.click(); if (!await espera(() => cr.hidden, 8000)) return 'Empezar no cerró el creador'; }
  const S = window.AV && window.AV.state; if (!S || !S.profile || !S.profile.created) return 'sin perfil creado tras entrar';
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(30000);
  const visible = await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 20000);
  if (!visible) return 'mundo no visible en 20 s (carga atascada o PC contencionada)';
  return 'ok'; })()`;
// Mide la ventana [t0,t1] s desde el arranque de la sonda: cuadros largos + estado del renderer
const VENTANA_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), Q = window.__qaM;
  const base = Q.dt.length;
  await sleep(1000);
  const marcas = [];
  for (let i = 0; i < 10; i++) { await sleep(300); try { const R = AV.G.renderer; marcas.push({ n: Q.dt.length - base, pend: R.precarga.programas(), cal: R.calidad.nivel, calls: R.stats().calls, progs: R.renderer.info.programs.length }); } catch (e) { marcas.push({ error: String(e && e.message || e).slice(0, 80) }); } }
  const d = Q.dt.slice(base).sort((a, b) => a - b), n = d.length, q = p => n ? Math.round(d[Math.min(n - 1, Math.floor(n * p))]) : 0;
  const out = { n, p50: q(0.5), p95: q(0.95), peor: n ? Math.round(d[n - 1]) : 0, mas100: d.filter(x => x > 100).length, mas200: d.filter(x => x > 200).length, top: Q.top.slice(0, 6), marcas };
  Q.dt = []; Q.top = [];
  return JSON.stringify(out); })()`;
// Fuerza la tormenta: sombras ON → OFF (medio → bajo) y mide 4 s; control a los 5 s: el mundo se ve (calls y píxeles)
const TORMENTA_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), R = AV.G.renderer;
  // QA-157: esperar a que la carga asiente (evento mundoListo → precarga activa) y el mundo dibuje de verdad
  // antes de forzar la tormenta; si no, las ventanas miden la pantalla de carga y la ronda no vale.
  const t0 = performance.now(); let ok = false;
  while (performance.now() - t0 < 120000) { try { if (R.precarga.programas() >= 0 && R.stats().calls > 30) { ok = true; break; } } catch (e) {} await sleep(500); }
  if (!ok) return JSON.stringify({ error: 'mundo no asentado en 120 s (CPU ×4 + calidad alta: carga lenta; sospechar QA-157 solo si hay fotos sync con GPU real — con el fix v3 sync solo dispara en GPU de software)' });
  R.setCalidad('medio', true); await sleep(2500);   // base asentada CON sombras
  const antes = R.stats();
  R.setCalidad('bajo', true);                        // ← tormenta: todas las familias con luz piden programa nuevo
  const r = JSON.parse(await (${VENTANA_JS}));
  await sleep(1000);
  const control = await (async () => { const s = R.stats(); let pix = null;
    try { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d');
      x.drawImage(R.renderer.domElement, 0, 0, 64, 64); const d = x.getImageData(0, 0, 64, 64).data; let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 24) n++; pix = Math.round(100 * n / (d.length / 4)); } catch (e) {}
    return { calls: s.calls, tris: s.triangulos, fps: s.fps, pixNoNegros: pix, pend: R.precarga.programas() }; })();
  return JSON.stringify({ antes: { calidad: antes.calidad, calls: antes.calls, fps: antes.fps }, tormenta: r, control }); })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', '--window-size=500,900'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools en 60 s: ' + err.slice(0, 300));
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const res = { movil: { ancho: ANCHO, alto: ALTO, dpr: DPR, cpu: CPU }, gpu: null, rondas: [] };
  const chromeL = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${chromeL.puerto}${chromeL.wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  try {
    for (let ronda = 1; ronda <= RONDAS; ronda++) {
      const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
      const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
      for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
      await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
      await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
      await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS + ' ' + SONDA_JS }, ses);
      await cdp.call('Page.navigate', { url: origen + '/index.html?qa=1&fases=1' }, ses);
      { // esperar a que el juego arranque (actores listos) antes de reentrar
        const t0 = Date.now(); let listo = false;
        while (Date.now() - t0 < 90000) { try { if (await ev(cdp, ses, `!!(window.AV && window.AV.G && window.AV.G.actores && (window.AV.G.actores.player3D || window.AV.G.actores.failed3D))`, 10, false)) { listo = true; break; } } catch (e) { /* aún no */ } await cdp.bombear(0.5); }
        if (!listo) throw new Error('el juego no arrancó en 90 s');
      }
      const prep = await ev(cdp, ses, PREPARAR_JS, 90);
      if (!String(prep).startsWith('ok')) throw new Error('preparar: ' + prep);
      if (ronda === 1) { try { res.gpu = await ev(cdp, ses, `(() => { const gl = AV.G.renderer.renderer.getContext(); const ext = gl.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'sin debug_info'; })()`, 15); } catch (e) { res.gpu = 'n/d'; } }
      const reveal = JSON.parse(await ev(cdp, ses, VENTANA_JS, 30)); // 4 s post-reveal (el adaptativo dispara ~3 s)
      const tormenta = JSON.parse(await ev(cdp, ses, TORMENTA_JS, 150));
      if (tormenta.error) {
        res.rondas.push({ reveal, tormenta, valida: false });
        console.log(`  · ronda ${ronda} ⚠ ABORTADA: ${tormenta.error}`);
        try { await cdp.call('Target.closeTarget', { targetId: tid }, ses); } catch (e) {}
        await cdp.bombear(1);
        continue;
      }
      const valida = tormenta.control.calls > 0 && tormenta.control.pixNoNegros > 0;
      res.rondas.push({ reveal, tormenta, valida });
      console.log(`  · ronda ${ronda}${valida ? '' : ' ⚠ NO VÁLIDA (mundo sin dibujar: carga atascada o contención)'}: reveal p50 ${reveal.p50} p95 ${reveal.p95} peor ${reveal.peor} ms (>200: ${reveal.mas200}) · tormenta peor ${tormenta.tormenta.peor} ms p95 ${tormenta.tormenta.p95} (>200: ${tormenta.tormenta.mas200}) · control ${tormenta.control.calls} calls ${tormenta.control.pixNoNegros}% px · cal ${tormenta.control.calls > 0 ? tormenta.tormenta.marcas.map(m => m.cal).join('>') : '??'}`);
      try { await cdp.call('Target.closeTarget', { targetId: tid }, ses); } catch (e) {}
      await cdp.bombear(1);
    }
  } finally {
    try { ws.close(); } catch (e) {}
    try { chromeL.chrome.kill(); } catch (e) {}
    for (const p of fs.readdirSync(os.tmpdir()).filter(x => x.startsWith('kimi2-'))) { try { fs.rmSync(path.join(os.tmpdir(), p), { recursive: true, force: true }); } catch (e) {} }
    srv.close();
  }
  fs.writeFileSync(path.join(SALIDA, 'qa53.json'), JSON.stringify(res, null, 1));
  const validas = res.rondas.filter(r => r.valida).length;
  if (validas < res.rondas.length) console.log(`  ⚠ ${res.rondas.length - validas}/${res.rondas.length} rondas NO válidas: este qa53.json no sirve como validación (reintentar con la PC libre)`);
  const peores = res.rondas.map(r => r.tormenta.tormenta ? r.tormenta.tormenta.peor : NaN).filter(x => !isNaN(x)), peorReveal = Math.max(...res.rondas.map(r => r.reveal.peor));
  console.log(`RESULTADO ${RONDAS} rondas · GPU: ${res.gpu}`);
  console.log(`  reveal: peor ${peorReveal} ms · tormenta sombras: peor ${peores.length ? Math.max(...peores) : 'n/d'} ms (rondas: ${peores.join(', ') || 'ninguna válida'})`);
  for (const r of res.rondas) console.log('  top tormenta:', r.tormenta.tormenta ? r.tormenta.tormenta.top.map(x => x.d + 'ms@' + x.t + 's').join(', ') + ' · marcas pend: ' + r.tormenta.tormenta.marcas.map(m => m.pend).join('>') : '(abortada: ' + (r.tormenta.error || 'sin datos') + ')');
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
