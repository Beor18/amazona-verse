#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — QA-53 (resto): tormenta de re-enlaces al cambiar las sombras.
   El adaptativo cambia de calidad (~3 s tras el reveal) y todas las familias con luz pedían programa nuevo
   (USE_SHADOWMAP) dentro del primer dibujo: tirón de 100–600 ms. Fix en renderer.js: genLuz entra en la clave
   del precalentado de las familias con luz y el recalentado las re-enlaza por tandas (6/cuadro) fuera del dibujo.
   Esta herramienta: entra con partida sembrada (móvil 375×812 dpr 3, CPU ×4, GPU real), SALTA la apertura del
   cap1 (botón «Saltar»/tecla, como missionTest), espera el asentado REAL (calls>30 + precalentado 0 +
   cola de streaming 0, 8 muestras), asienta el medio (pend 0) y fuerza medio→bajo (sombras OFF, la tormenta),
   midiendo los cuadros siguientes. Control visual: draw calls + píxeles no negros leídos EN el cuadro del
   render (leer el buffer presentado daba negro siempre) + captura CDP qa53_rN_control.png + capa #c1-fade.
   Salida: consola + docs/img/kimi053/qa53.json.
   Uso: node tools/build/kimi2_qa53.js [--rondas 2] [--intentos 4] [--esperaPcMin 12]
   --intentos: rondas máx. hasta juntar las --rondas válidas (entradas flake QA-11 o contención no las tiran).
   --esperaPcMin: al arrancar espera un hueco sin otras sesiones del bucle (node/chrome pesados); si no hay
   hueco en ese plazo, mide igual y lo deja marcado en contencionAlInicio del JSON.
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, spawnSync } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ANCHO = 375, ALTO = 812, DPR = 3, CPU = 4;
const RONDAS = +(arg('--rondas', '2'));
const INTENTOS = +(arg('--intentos', String(RONDAS + 2))); // tope de rondas hasta juntar RONDAS válidas
const ESPERA_PC_MIN = +(arg('--esperaPcMin', '12')); // espera máx. de un hueco sin otras sesiones (bucle)

// Hueco entre turnos del bucle: si otra sesión (Kimi 1/3) tiene node/chrome pesados en la PC, las medidas
// salen techo y la propia herramienta las marca NO válidas. Esperamos: solo nuestro node (≤1) y pocos chrome
// (los del navegador ocioso de Kelvin no pesan; una sesión midiendo suele tener >10).
function conteo(proceso) {
  const r = spawnSync('tasklist', ['/FI', `IMAGENAME eq ${proceso}`, '/FO', 'CSV', '/NH'], { encoding: 'utf8' });
  return (r.stdout || '').split('\n').filter(l => l.toLowerCase().includes(proceso.toLowerCase())).length;
}
async function esperarHueco(res) {
  const t0 = Date.now();
  while (Date.now() - t0 < ESPERA_PC_MIN * 60000) {
    const nodos = conteo('node.exe'), chromes = conteo('chrome.exe');
    res.contencionAlInicio = { node: nodos, chrome: chromes };
    if (nodos <= 1 && chromes <= 8) return true;
    console.log(`  · PC ocupada (node ${nodos} · chrome ${chromes}) — esperando hueco (${Math.round((Date.now() - t0) / 60000)} min)`);
    await new Promise(r => setTimeout(r, 15000));
  }
  console.log('  · AVISO: sin hueco en el límite de espera — se mide igual (techo si sigue la contención)');
  return false;
}
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
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(20000);
  const visible = await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 15000);
  if (!visible) return 'mundo no visible en 15 s (carga atascada o PC contencionada)';
  // QA-111: la entrada sembrada es intermitente — a veces ST.arrancar() se atasca y mundoListo NO llega
  // (decenas de recursos congelados en cola) o el hilo se queda bloqueado. El arnés de baterías reintenta
  // con recarga; este flujo, también (el node recarga y reentra ante este RESCATE o ante un timeout).
  const listoOk = await Promise.race([
    (window.AV.G.mundo && window.AV.G.mundo.listo || Promise.resolve()).then(() => true),
    sleep(60000).then(() => false)
  ]);
  if (!listoOk) return 'RESCATE: mundoListo no llegó en 60 s (entrada atascada, flake QA-111)';
  // QA-53: saltar la apertura del cap1 (AP1: botón «Saltar» o cualquier tecla, mismo final). Sin esto la intro
  // mantiene la cámara fuera de la villa y el streaming nunca asienta; las baterías la saltan y asientan en ~9 s.
  try {
    let salto = false;
    const t0 = performance.now();
    while (performance.now() - t0 < 10000) { const b = $('c1-saltar'); if (b) { b.click(); salto = true; break; } await sleep(200); }
    if (!salto) dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true }));
  } catch (e) {}
  await sleep(600);
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
// Fuerza la tormenta: sombras ON → OFF (medio → bajo) y mide 4 s; control: el mundo se ve (calls y píxeles)
const TORMENTA_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), R = AV.G.renderer;
  const ST = (AV.G.mundo && AV.G.mundo.streaming) || (AV.G.streaming && AV.G.streaming.gestor);
  const cola = () => { try { const s = ST.stats(); return s.trabajos + s.descargando; } catch (e) { return 0; } };
  // 1) Asentado LOCAL: el check viejo (una muestra de calls>30) disparaba en plena carga y la ventana medía el
  //    drenado (inválida). Ahora: calls>30 + precalentado de programas en 0 (programas enlazados), 8 muestras
  //    seguidas (4 s). NO se exige cola de streaming a 0: en la villa (d=228) la ciudad oscila cargando/soltando
  //    por diseño (QA-158) y esos recursos lejanos no contaminan el dibujo local. Timeout 150 s.
  const t0 = performance.now(); let seg = 0, asentado = false, ultima = {};
  while (performance.now() - t0 < 150000) {
    let calls = 0, pend = -1, trab = -1, desc = -1;
    try { calls = R.stats().calls; pend = R.precarga.programas(); } catch (e) {}
    try { const s = ST.stats(); trab = s.trabajos; desc = s.descargando; } catch (e) {}
    ultima = { calls, pend, trabajos: trab, descargando: desc, seg };
    if (calls > 30 && pend === 0) { seg++; if (seg >= 8) { asentado = true; break; } } else seg = 0;
    await sleep(500);
  }
  if (!asentado) return JSON.stringify({ error: 'mundo no asentado en 150 s', ultima });
  const asentadoMs = Math.round(performance.now() - t0);
  // 2) Base CON sombras: dejar que el precalentado del medio drene (pend === 0) antes de la tormenta;
  //    si no, los enlaces del medio contaminan la ventana del bajo.
  R.setCalidad('medio', true);
  const tm = performance.now();
  while (performance.now() - tm < 60000) { try { if (R.precarga.programas() === 0) break; } catch (e) {} await sleep(500); }
  const medioMs = Math.round(performance.now() - tm);
  const antes = R.stats();
  // 3) Tormenta: bajo = sombras OFF → todas las familias con luz piden programa nuevo (fix 849cba57: el
  //    recalentado las re-enlaza por tandas fuera del dibujo; pend>0 al inicio de la ventana es ESPERADO).
  R.setCalidad('bajo', true);
  try { if (window.__fases) window.__fases.length = 0; } catch (e) {} // el log tiene tope de 400 filas: vaciarlo para que cubra la ventana
  const r = JSON.parse(await (${VENTANA_JS}));
  r.fases = (window.__fases || []).slice();
  // 4) Control: píxeles leídos EN EL MISMO cuadro que el render (el buffer WebGL se presenta y se limpia:
  //    leerlo tras un sleep daba negro siempre — artefacto que invalidaba el control viejo).
  await sleep(1000);
  const control = await (async () => { const s = R.stats(); let pix = null;
    try { pix = await new Promise(res => { const cv = R.renderer.domElement;
      requestAnimationFrame(() => { try { const c = document.createElement('canvas'); c.width = 64; c.height = 64;
        const x = c.getContext('2d'); x.drawImage(cv, 0, 0, 64, 64); const d = x.getImageData(0, 0, 64, 64).data; let n = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 24) n++; res(Math.round(100 * n / (d.length / 4)));
      } catch (e) { res(null); } }); }); } catch (e) {}
    let fade = null; try { const f = document.getElementById('c1-fade'); fade = f ? String(f.style.opacity || getComputedStyle(f).opacity) : 'ausente'; } catch (e) {}
    return { calls: s.calls, tris: s.triangulos, fps: s.fps, pixNoNegros: pix, fade, pend: R.precarga.programas(), cola: cola() }; })();
  return JSON.stringify({ asentadoMs, medioMs, antes: { calidad: antes.calidad, calls: antes.calls, fps: antes.fps }, tormenta: r, control }); })()`;

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
  const res = { movil: { ancho: ANCHO, alto: ALTO, dpr: DPR, cpu: CPU }, gpu: null, rondas: [], pedidas: RONDAS, intentos: INTENTOS };
  await esperarHueco(res);
  const chromeL = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${chromeL.puerto}${chromeL.wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  try {
    let validas = 0;
    for (let ronda = 1; ronda <= INTENTOS && validas < RONDAS; ronda++) {
      let tid = null, ses = null;
      const nuevaPagina = async () => {
        if (tid) { try { await cdp.call('Target.closeTarget', { targetId: tid }, undefined, 10000); } catch (e) {} await cdp.bombear(0.5); }
        tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
        ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
        for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
        await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
        await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
        await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS + ' ' + SONDA_JS }, ses);
        await cdp.call('Page.navigate', { url: origen + '/index.html?qa=1&fases=1' }, ses);
        const t0 = Date.now(); let listo = false;
        while (Date.now() - t0 < 90000) { try { if (await ev(cdp, ses, `!!(window.AV && window.AV.G && window.AV.G.actores && (window.AV.G.actores.player3D || window.AV.G.actores.failed3D))`, 10, false)) { listo = true; break; } } catch (e) { /* aún no */ } await cdp.bombear(0.5); }
        if (!listo) throw new Error('el juego no arrancó en 90 s');
      };
      // QA-111: la entrada sembrada es intermitente (mundoListo puede no llegar o el hilo bloquearse);
      // ante RESCATE, timeout o cualquier error de entrada: recargar y reentrar (máx 2), y la ronda se
      // registra como fallida sin matar la corrida.
      let rescates = 0, prepOk = false;
      while (rescates <= 2) {
        try {
          await nuevaPagina();
          const prep = await ev(cdp, ses, PREPARAR_JS, 110);
          if (String(prep).startsWith('ok')) { prepOk = true; break; }
          if (String(prep).startsWith('RESCATE')) { rescates++; console.log(`  · ronda ${ronda}: ${String(prep).slice(0, 56)} — recargando (${rescates}/2)`); continue; }
          throw new Error('preparar: ' + prep);
        } catch (e) {
          rescates++;
          if (rescates > 2) { res.rondas.push({ ronda, error: 'sin entrada: ' + e.message }); console.log(`  · ronda ${ronda} ⚠ SIN ENTRADA tras 2 rescates: ${String(e.message).slice(0, 80)}`); break; }
          console.log(`  · ronda ${ronda}: entrada falló (${String(e.message).slice(0, 56)}) — recargando (${rescates}/2)`);
        }
      }
      if (!prepOk) { await cdp.bombear(1); continue; }
      if (rescates) res['rescates_r' + ronda] = rescates;
      res['preparar_r' + ronda] = 'ok';
      if (ronda === 1) { try { res.gpu = await ev(cdp, ses, `(() => { const gl = AV.G.renderer.renderer.getContext(); const ext = gl.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'sin debug_info'; })()`, 15); } catch (e) { res.gpu = 'n/d'; } }
      const reveal = JSON.parse(await ev(cdp, ses, VENTANA_JS, 30)); // 4 s post-reveal (el adaptativo dispara ~3 s)
      const tormenta = JSON.parse(await ev(cdp, ses, TORMENTA_JS, 240));
      try { const shot = await cdp.call('Page.captureScreenshot', { format: 'png' }, ses); fs.writeFileSync(path.join(SALIDA, `qa53_r${ronda}_control.png`), Buffer.from(shot.data, 'base64')); } catch (e) {}
      if (tormenta.error) {
        res.rondas.push({ reveal, tormenta, valida: false });
        console.log(`  · ronda ${ronda} ⚠ ABORTADA: ${tormenta.error}`);
        try { await cdp.call('Target.closeTarget', { targetId: tid }, ses); } catch (e) {}
        await cdp.bombear(1);
        continue;
      }
      const valida = tormenta.control.calls > 0 && tormenta.control.pixNoNegros > 0;
      if (valida) validas++;
      res.rondas.push({ reveal, tormenta, valida });
      console.log(`  · ronda ${ronda}${valida ? '' : ' ⚠ NO VÁLIDA (mundo sin dibujar)'}: reveal p50 ${reveal.p50} p95 ${reveal.p95} peor ${reveal.peor} ms · asentado ${tormenta.asentadoMs / 1000}s · medio ${tormenta.medioMs / 1000}s · tormenta peor ${tormenta.tormenta.peor} ms p95 ${tormenta.tormenta.p95} (>200: ${tormenta.tormenta.mas200}) · control ${tormenta.control.calls} calls ${tormenta.control.pixNoNegros}% px fade ${tormenta.control.fade} · pend ${tormenta.tormenta.marcas.map(m => m.pend).join('>')}`);
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
  const validasN = res.rondas.filter(r => r.valida).length;
  if (validasN < RONDAS) console.log(`  ⚠ solo ${validasN}/${RONDAS} rondas válidas pedidas: este qa53.json no sirve como validación (reintentar con la PC libre)`);
  const peores = res.rondas.map(r => r.tormenta && r.tormenta.tormenta ? r.tormenta.tormenta.peor : NaN).filter(x => !isNaN(x)),
        peorReveal = Math.max(...res.rondas.map(r => r.reveal ? r.reveal.peor : NaN).filter(x => !isNaN(x)));
  console.log(`RESULTADO ${RONDAS} válidas pedidas · ${res.rondas.length} intentadas · GPU: ${res.gpu}`);
  console.log(`  reveal: peor ${peorReveal} ms · tormenta sombras: peor ${peores.length ? Math.max(...peores) : 'n/d'} ms (rondas: ${peores.join(', ') || 'ninguna válida'})`);
  for (const r of res.rondas) console.log('  top tormenta:', r.tormenta && r.tormenta.tormenta ? r.tormenta.tormenta.top.map(x => x.d + 'ms@' + x.t + 's').join(', ') + ' · marcas pend: ' + r.tormenta.tormenta.marcas.map(m => m.pend).join('>') : '(sin datos: ' + ((r.tormenta && r.tormenta.error) || r.error || 'n/d') + ')');
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
