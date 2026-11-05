#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — QA-159 (cara b): maestroTest 25/26 vía entrada por creador
   (kimi2_una_bateria.js, sin semilla). El único rojo es «Esc cierra el Modo Maestro y el juego sigue»
   también en HEAD puro (BUGS.md QA-159). Esta herramienta entra como ese arnés (portada → Jugar →
   creador → Empezar), replica los pasos de maestroTest hasta el Esc y vuelca el estado exacto
   (maestroAbierto / motivos de pausa / hitStop / popover) antes y después del Escape, para nombrar
   la condición que falla. GPU real, perfil propio, mata su árbol de Chrome al salir.

   Uso: node tools/build/kimi1_qa159b.js [--cpu 4] [--salida DIR]
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
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const CPU = parseFloat(arg('--cpu', '4'));
const DESKTOP = process.argv.includes('--desktop'); // kimi2_una_bateria.js: escritorio 1280×800, sin emulación táctil
const REAL = process.argv.includes('--real'); // corre el maestroTest real (AV.maestroTest) en vez de la réplica
const SALIDA = arg('--salida', path.join(AQUI, 'salida', 'kimi1-qa159b'));
const ANCHO = 375, ALTO = 812, DPR = 3;
fs.mkdirSync(SALIDA, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };

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
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); this.eventos = []; ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error de conexión'))); this.pend.clear(); }; ws.onclose = () => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: conexión cerrada')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message + ' ' + JSON.stringify(d.error.data || ''))) : p.re(d.result); } else if (d.method) this.eventos.push(d); }; }
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
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 400));
  return r.result ? r.result.value : undefined;
}

const LISTO_JS = `(() => { try { return !!(window.AV && window.AV.G && window.AV.G.mundo && window.AV.G.ui); } catch (e) { return false; } })()`;
// Entrada como kimi2_empezar.js --sin-semilla / kimi2_una_bateria.js: portada → Jugar → creador → Empezar.
const PREPARAR_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene el botón Jugar'; b.click();
    if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta tras Jugar'; }
  const cr = $('creator');
  if (cr && !cr.hidden) { await espera(() => $('p-stage-status') && $('p-stage-status').hidden, 30000); const s = $('p-save'); if (!s) return 'el creador no tiene Empezar (#p-save)';
    s.click(); if (!await espera(() => cr.hidden, 8000)) return 'Empezar no cerró el creador: ' + (($('p-error') && !$('p-error').hidden && $('p-error').textContent) || 'sin mensaje'); }
  const S = window.AV && window.AV.state; if (!S || !S.profile || !S.profile.created) return 'sin perfil creado tras entrar';
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(30000);
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 20000);
  return 'ok'; })()`;
// Fase de un keydown 'q' por las fases de propagación + estado de sospechosos (records/input capturando no son
// legibles: se infieren por el comportamiento). Devuelve también si el Esc real cerró.
const PROBA_JS = `(async () => {
  const G = AV.G, AU = G.aula, S = AV.state, $ = id => document.getElementById(id);
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const menu = $('pause');
  const log = [];
  // Trazar quién toca la pausa (sincronizar interno no pasa por aquí: solo callers externos)
  const traza = [];
  const set0 = G.pausa.set.bind(G.pausa);
  G.pausa.set = (m, on) => { try { traza.push({ t: Math.round(performance.now()), m: on }); } catch (x) {} return set0(m, on); };
  const snap = etiqueta => { try { log.push({ etiqueta, abierto: AU.maestroAbierto(), motivos: Array.from(G.pausa.motivos), hitStop: String(G.camara.juice.hitStop), pausaActiva: G.pausa.activa(), popover: menu.matches(':popover-open') }); } catch (e) { log.push({ etiqueta, error: String(e).slice(0, 120) }); } };
  AU.borrarProgreso(); S.edu.registro = null;
  AU.registrar({ pasos_completados: ['p1', 'p2'], perchas_observadas: 2, preguntas: { q1: 1, q2: '' }, objetivos_logrados: ['O1'] });
  menu.showPopover(); await espera(60);
  const link = menu.querySelector('.maestro-link');
  link.click();
  link.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await espera(1350);
  const form = menu.querySelector('.maestro-reto'), inp = $('maestro-resp');
  inp.value = String(AU.reto() + 1); form.requestSubmit(); await espera(60); // respuesta equivocada (el test real la hace)
  inp.value = String(AU.reto()); form.requestSubmit(); await espera(60);
  snap('maestro-abierto');
  // Réplica de los pasos intermedios del test real (entre abrir y el Esc): ¿cuál mata el dispatch de Esc?
  $('m-tab-progreso') && $('m-tab-progreso').click(); await espera(30);
  $('m-tab-fuentes') && $('m-tab-fuentes').click(); await espera(30);
  $('m-tab-reporte') && $('m-tab-reporte').click(); await espera(30);
  const est2 = $('m-estacion'); if (est2) { est2.value = 'Estación 4'; est2.dispatchEvent(new Event('change')); }
  try { Object.defineProperty(window, 'claude', { value: { use: async n => (n === 'downloads' ? { save: async o => ({ status: 'saved' }) } : null) }, configurable: true, writable: true }); } catch (e) {}
  $('m-csv') && $('m-csv').click(); await espera(60);
  $('m-json') && $('m-json').click(); await espera(60);
  try { Object.defineProperty(window, 'claude', { value: { use: async () => ({ save: async () => { throw { code: 'declined' }; } }) }, configurable: true, writable: true }); } catch (e) {}
  $('m-csv') && $('m-csv').click(); await espera(60);
  try { Object.defineProperty(window, 'claude', { value: { use: async () => null }, configurable: true, writable: true }); } catch (e) {}
  $('m-csv') && $('m-csv').click(); await espera(150);
  for (let k = 0; k < 30 && /Preparando|Preparing/.test(($('m-estado') || { textContent: '' }).textContent); k++) await espera(100);
  $('m-nuevo') && $('m-nuevo').click(); $('m-nuevo-no') && $('m-nuevo-no').click();
  $('m-nuevo') && $('m-nuevo').click(); $('m-nuevo-si') && $('m-nuevo-si').click(); await espera(60);
  $('m-borrar') && $('m-borrar').click(); $('m-borrar-si') && $('m-borrar-si').click(); await espera(60);
  snap('pre-Esc');
  // Plomería de eventos: ¿llega un keydown 'q' del panel a cada fase?
  const panelEl = $('maestro');
  const fases = [];
  const anotar = n => e => { try { fases.push(n); } catch (x) {} };
  window.addEventListener('keydown', anotar('win-c'), true);
  document.addEventListener('keydown', anotar('doc-c'), true);
  document.documentElement.addEventListener('keydown', anotar('html-c'), true);
  document.body.addEventListener('keydown', anotar('body-c'), true);
  panelEl.addEventListener('keydown', anotar('panel-objetivo'));
  document.body.addEventListener('keydown', anotar('body-b'));
  document.addEventListener('keydown', anotar('doc-b'));
  window.addEventListener('keydown', anotar('win-b'));
  panelEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', bubbles: true }));
  const tuberiaQ = fases.slice();
  fases.length = 0;
  // El Esc real (el de la prueba)
  $('maestro').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  const tuberiaEsc = fases.slice();
  snap('tras-Esc');
  await espera(300);
  snap('tras-Esc+300ms');
  const hip = {
    tuberiaQ, tuberiaEsc,
    recordsAbierto: G.recordsApi && G.recordsApi.abierto ? G.recordsApi.abierto() : 'sin-api',
    activo: (document.activeElement || {}).id || (document.activeElement || {}).tagName,
    panelRects: panelEl.getClientRects().length,
    display: getComputedStyle(panelEl).display, visibility: getComputedStyle(panelEl).visibility,
    panelInert: panelEl.inert, bodyInert: document.body.inert, htmlInert: document.documentElement.inert,
    cuantosMaestro: document.querySelectorAll('[id="maestro"]').length,
    carga: AV.carga ? { activa: !!AV.carga.activa, hecha: !!AV.carga.hecha, corridas: (AV.carga.corridas || []).length, motivo: AV.carga.ultima && AV.carga.ultima.motivo, ms: AV.carga.ultima && AV.carga.ultima.ms } : 'sin-carga',
    elCarga: (() => { const e = $('carga'); return e ? { hidden: e.hidden, sale: e.classList.contains('carga-sale'), vis: e.classList.contains('carga-vis'), busy: e.getAttribute('aria-busy') } : null; })(),
    trazaPausa: traza.slice(-40)
  };
  try { AU.cerrarMaestro(); } catch (e) { hip.cerrarDirectoError = String(e).slice(0, 120); }
  snap('cerrar-directo');
  return JSON.stringify({ log, hip });
})()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1q159b-'));
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

function matarArbol(chrome, perf) {
  try { if (chrome.pid) spawnSync('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { stdio: 'ignore', timeout: 15000 }); } catch (e) {}
  try { chrome.kill(); } catch (e) {}
  try {
    const marca = path.basename(perf || '');
    if (marca) spawnSync('powershell', ['-NoProfile', '-Command',
      "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*" + marca + "*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"],
      { stdio: 'ignore', timeout: 30000 });
  } catch (e) {}
}

function drenarErrores(cdp, ses) {
  const out = [];
  for (const ev of cdp.eventos) {
    if (ev.sessionId !== ses) continue;
    if (ev.method === 'Runtime.exceptionThrown') {
      const d = ev.params.exceptionDetails;
      out.push('EXCEPCIÓN: ' + String((d.exception && (d.exception.description || d.exception.value)) || d.text).slice(0, 300));
    } else if (ev.method === 'Runtime.consoleAPICalled' && ev.params.type === 'error') {
      out.push(ev.params.args.map(a => String(a.value != null ? a.value : (a.description || a.type))).join(' ').slice(0, 300));
    }
  }
  cdp.eventos.length = 0;
  return out;
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  console.log(`· servidor ${origen} · Chrome DevTools ${puertoDev} · móvil ${ANCHO}×${ALTO} dpr ${DPR} · CPU ×${CPU} · GPU real · entrada por creador`);
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws);
  await cdp.listo();

  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable', 'Debugger.enable']) await cdp.call(m, {}, ses);
  if (!DESKTOP) {
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
    await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
    if (CPU > 1) await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
  } else {
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }, ses);
  }
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: `try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}` }, ses);
  // Registro global de addEventListener('keydown') con pila: quién registró cada oyente, dónde y en qué fase
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__kdReg = [];
    const __origAE = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, fn, opts) {
      if (type === 'keydown') {
        try { window.__kdReg.push({ t: this === window ? 'window' : (this.id || this.tagName || '?'), cap: !!(opts && (opts === true || opts.capture)), pila: (new Error('x').stack || '').split('\\n').slice(2, 6).map(s => s.trim()).join(' <- ') }); } catch (e) {}
      }
      return __origAE.call(this, type, fn, opts);
    };
  ` }, ses);

  async function esperarListo(segs) {
    const t0 = Date.now();
    while (Date.now() - t0 < segs * 1000) {
      try { if (await evaluar(cdp, ses, LISTO_JS, 10, false)) return true; } catch (e) {}
      await cdp.bombear(0.5);
    }
    return false;
  }

  console.log('· cargando el juego (sin semilla, flujo real)…');
  await cdp.call('Page.navigate', { url: `${origen}/index.html` }, ses);
  if (!(await esperarListo(90))) { console.log('✗ el juego no arrancó'); matarArbol(chrome, perf); process.exit(2); }

  const RONDAS = parseInt(arg('--rondas', '6'), 10);
  const informe = { cpu: CPU, movil: { ancho: ANCHO, alto: ALTO, dpr: DPR }, entrada: 'creador', rondas: [], erroresConsola: [] };
  let chromeCaido = false;
  for (let r = 1; r <= RONDAS && !chromeCaido; r++) {
    // Cada ronda: almacenamiento limpio y flujo creador completo (ronda 1 ya arrancó en frío con el perfil nuevo).
    if (r > 1) {
      try {
        // ronda nueva = documento nuevo (nada de recargas con estado raro)
        await cdp.call('Page.navigate', { url: 'about:blank' }, ses);
        await cdp.bombear(0.5);
        await cdp.call('Page.navigate', { url: `${origen}/index.html` }, ses);
        if (!(await esperarListo(90))) { informe.rondas.push({ ronda: r, error: 'no arrancó tras navegación' }); continue; }
        const t0p = Date.now();
        while (Date.now() - t0p < 30000) {
          try { if (await evaluar(cdp, ses, `(() => { const t = document.getElementById('title'); return !!(t && t.open); })()`, 10, false)) break; } catch (e) {}
          await cdp.bombear(0.5);
        }
      } catch (e) { informe.rondas.push({ ronda: r, error: 'navegación: ' + e.message.slice(0, 120) }); chromeCaido = true; continue; }
    }
    let entrada = null;
    try { entrada = await evaluar(cdp, ses, PREPARAR_JS, 120); } catch (e) { informe.rondas.push({ ronda: r, error: 'entrada: ' + e.message.slice(0, 150) }); chromeCaido = true; continue; }
    const ronda = { ronda: r, entrada };
    try {
      if (REAL) {
        const res = JSON.parse(await evaluar(cdp, ses, `(async () => { const r = await window.AV.maestroTest(); return JSON.stringify({ p: r.passed, t: r.total, mal: (r.results || []).filter(x => !x.ok).map(x => ({ n: x.name, e: String(x.extra).slice(0, 900) })) }); })()`, 300));
        ronda.real = res;
        ronda.escOk = !(res.mal || []).some(x => /Esc/.test(x.n));
      } else {
        const j = JSON.parse(await evaluar(cdp, ses, PROBA_JS, 60));
        ronda.log = j.log; ronda.hip = j.hip;
        const esc = (j.log || []).find(p => p.etiqueta === 'tras-Esc');
        ronda.escOk = !!(esc && esc.abierto === false && esc.pausaActiva === false && esc.hitStop === '0');
      }
    } catch (e) { ronda.error = e.message.slice(0, 200); }
    informe.rondas.push(ronda);
    if (REAL) console.log(`  · r${r}: entrada=${entrada} escOk=${ronda.escOk}` + (ronda.real ? ` · ${ronda.real.p}/${ronda.real.t}` : '') + (ronda.error ? ' · ' + ronda.error : ''));
    else console.log(`  · r${r}: entrada=${entrada} escOk=${ronda.escOk}` +
      (h.carga ? ` · carga=${JSON.stringify(h.carga)} el=${JSON.stringify(h.elCarga)}` : ''));
    if (!ronda.escOk) {
      console.log('    ✗ FALLÓ: ' + JSON.stringify(ronda.real || { log: ronda.log, hip: ronda.hip }).slice(0, 2200));
      if (REAL) {
        try {
          const reg = JSON.parse(await evaluar(cdp, ses, `JSON.stringify({ maestro: (window.__kdReg || []).filter(r => r.t === 'maestro'), winCap: (window.__kdReg || []).filter(r => r.t === 'window' && r.cap) })`, 20, false) || '{}');
          console.log('    oyentes keydown registrados en #maestro: ' + JSON.stringify(reg.maestro));
          console.log('    oyentes keydown window-captura: ' + JSON.stringify(reg.winCap));
          ronda.kdReg = reg;
        } catch (e) { console.log('    kdReg falló: ' + e.message.slice(0, 120)); }
      }
    }
  }
  informe.erroresConsola = drenarErrores(cdp, ses).slice(0, 10);
  fs.writeFileSync(path.join(SALIDA, 'probe-creador.json'), JSON.stringify(informe, null, 2));
  console.log('· informe en ' + path.join(SALIDA, 'probe-creador.json'));
  matarArbol(chrome, perf);
  await cdp.bombear(1);
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) {}
  srv.close();
  const fallos = informe.rondas.filter(x => x.escOk === false).length;
  console.log(`· ${fallos}/${informe.rondas.length} rondas con Esc roto`);
  process.exit(fallos > 0 ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
