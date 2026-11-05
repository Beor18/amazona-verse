#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — QA-111: repro instrumentado de «el creador reaparece tras Empezar».
   Diagnóstico: tras «Empezar» el perfil queda created=true y el autoguardado se programa con 0,5 s de DEBOUNCE de
   juego (guardado.js: autosave() → saveDebounce, se consume en el gancho 'update'). Las baterías capturan su save
   de cabecera con T.keepSave() (src/pruebas/motor.js) que solo lee localStorage: si la batería arranca dentro de
   esa ventana, keep=null; al acabar (selfTest termina con SV.reset(true): created=false) hacen
   restoreSave(null) → G.creador.open(true): creador abierto + created=false + worldHidden() → renderer no dibuja
   (0 draw calls) y el eval de la batería siguiente no vuelve (timeout de 900 s del arnés) = «cuelga ~50 %».

   La herramienta hace el flujo REAL (portada → Jugar → creador → Empezar) en móvil emulado con CPU ×4 y:
     1. mide la ventana Empezar→ escritura del save (tSave − tCreadorCerrado);
     2. BRAZO MECANISMO: reset(true)+restoreSave(null) → espera creador abierto + created=false (estado QA-111);
        brazo de control: restoreSave(save real) → creador cerrado + created=true;
     3. --selftest: repro EXTREMO A EXTREMO — clic en Empezar y AV.selfTest() en la MISMA tarea: el keepSave()
        interno de selfTest (síncrono, antes de su primer await) ve localStorage vacío → keep=null con total
        determinismo; al terminar selfTest se inspecciona el estado. Con el fix en motor.js.keepSave
        (flushea el autoguardado pendiente) el mismo repro debe acabar con creador CERRADO y created=true.

   Uso: node tools/build/kimi2_qa111.js [--rondas 2] [--cpu 4] [--selftest] [--salida DIR]
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, spawnSync } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const RONDAS = parseInt(arg('--rondas', '2'), 10);
const CPU = parseFloat(arg('--cpu', '4'));
const CON_SELFTEST = process.argv.includes('--selftest');
const SALIDA = arg('--salida', path.join(AQUI, 'salida', 'kimi2-qa111'));
fs.mkdirSync(SALIDA, { recursive: true });

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
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error de conexión'))); this.pend.clear(); }; ws.onclose = () => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: conexión cerrada')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; }
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
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2q111-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', '--window-size=420,860'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  chrome.verStderr = () => err.slice(-400);
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools en 60 s: ' + err.slice(0, 200));
}

// Llega hasta el creador con el taller cargado (listo para pulsar Empezar). Flujo real de jugador nuevo.
const PREPARAR_JS = `(async () => { const $ = id => document.getElementById(id), sleep = ms => new Promise(r => setTimeout(r, ms));
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(50); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'sin botón Jugar'; b.click(); if (!await espera(() => !t.open, 8000)) return 'la portada no cerró'; }
  const cr = $('creator');
  if (!cr || cr.hidden) return 'el creador no quedó abierto tras Jugar';
  if (!await espera(() => $('p-stage-status') && $('p-stage-status').hidden, 30000)) return 'el taller no cargó (p-stage-status)';
  return 'listo'; })()`;

// Clica Empezar cronometrando el cierre del creador; la escritura del save se detecta sondeando localStorage
// (el debounce del autoguardado consume save() desde el gancho 'update' con la referencia interna, no G.guardado.save).
const EMPEZAR_JS = `(() => { window.__qa111 = { t0: performance.now(), tCerrado: 0, tSave: 0 };
  document.getElementById('p-save').click();
  return 'clic'; })()`;

// Espera en la página: creador cerrado (tCerrado) y save escrito (tSave, sondeando localStorage).
const ESPERA_SAVE_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms));
  const haySave = () => { try { return !!localStorage.getItem(window.AV.G.guardado.KEY); } catch (e) { return false; } };
  const t0 = performance.now();
  while (performance.now() - t0 < 25000) {
    const Q = window.__qa111 || {};
    if (!Q.tCerrado && document.getElementById('creator').hidden) Q.tCerrado = performance.now();
    if (!Q.tSave && haySave()) Q.tSave = performance.now();
    if (Q.tSave) break;
    await sleep(100);
  }
  const Q = window.__qa111 || {};
  return JSON.stringify({ tCerradoMs: Math.round(Q.tCerrado || 0), tSaveMs: Math.round(Q.tSave || 0),
    ventanaMs: Q.tCerrado && Q.tSave ? Math.max(0, Math.round(Q.tSave - Q.tCerrado)) : -1,
    created: !!(window.AV.state.profile && window.AV.state.profile.created) }); })()`;

// keepSave() en el instante pedido: fiel a lo que vería selfTest al arrancar.
const KEEP_JS = `(() => { let k = null; try { k = localStorage.getItem(window.AV.G.guardado.KEY); } catch (e) {} return JSON.stringify({ hay: k != null, len: k ? k.length : 0 }); })()`;

// Los dos brazos del mecanismo (lo que hace selfTest al acabar: reset(true) y restoreSave(keep)).
const BRAZO_JS = `(keepJson => { const G = window.AV.G, T = G.pruebas;
  G.guardado.reset(true);
  T.restoreSave(keepJson);
  return JSON.stringify({ keep: keepJson != null, creadorAbierto: !document.getElementById('creator').hidden,
    created: !!(G.S.profile && G.S.profile.created), worldHidden: G.ui.worldHidden() }); })($ARG)`;

// Repro extremo a extremo con el selfTest real: clic en Empezar y selfTest() en la MISMA tarea → su keepSave()
// interno (síncrono, línea 65 de content/cap1/pruebas.js) captura antes de que el autoguardado escriba.
// restoreSave y creador.open quedan envueltos: el log dice qué keep vio selfTest y quién abrió el creador.
const SELFTEST_JS = `(async () => { const $ = id => document.getElementById(id), sleep = ms => new Promise(r => setTimeout(r, ms));
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(50); } return false; };
  const G = window.AV.G, LOG = window.__qa111log = [];
  const T = G.pruebas, rs0 = T.restoreSave.bind(T), op0 = G.creador.open.bind(G.creador), ks0 = T.keepSave.bind(T);
  T.keepSave = () => { const k = ks0(); LOG.push('keepSave -> ' + (k == null ? 'NULL' : k.length + 'B') + ' @' + Math.round(performance.now())); return k; };
  T.restoreSave = k => { LOG.push('restoreSave keep=' + (k == null ? 'NULL' : k.length + 'B') + ' created=' + !!(G.S.profile && G.S.profile.created) + ' @' + Math.round(performance.now())); return rs0(k); };
  G.creador.open = f => { LOG.push('creador.open(' + f + ') created=' + !!(G.S.profile && G.S.profile.created) + ' @' + Math.round(performance.now()) + ' st=' + String(new Error().stack).split('\\n')[2]); return op0(f); };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (b) { b.click(); await espera(() => !t.open, 8000); } }
  await espera(() => $('p-stage-status') && $('p-stage-status').hidden, 30000);
  $('p-save').click(); const prom = window.AV.selfTest();   // orden: el clic pone created=true y programa el autoguardado; selfTest captura keep=null (localStorage aún vacío)
  const r = await prom;
  const cr = document.getElementById('creator');
  return JSON.stringify({ selfTest: (r && r.passed) + '/' + (r && r.total), creadorOculto1: cr && cr.hidden, creadorOculto2: G.util.$('creator').hidden,
    nCreators: document.querySelectorAll('[id=creator]').length, created: !!(window.AV.state.profile && window.AV.state.profile.created), worldHidden: G.ui.worldHidden(),
    saveAlFinal: (() => { try { return localStorage.getItem(G.guardado.KEY) != null; } catch (e) { return false; } })(), log: LOG.slice(0, 14), writes: (window.__qa111w || []).slice(0, 10) }); })()`;

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const l = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${l.puerto}${l.wsPath}`);
  const cdp = new CDP(ws);
  await cdp.listo();
  console.log(`· servidor ${origen} · Chrome DevTools ${l.puerto} · CPU ×${CPU} · ${RONDAS} ronda(s)${CON_SELFTEST ? ' + repro real con selfTest' : ''}`);
  const informe = { movil: { ancho: 375, alto: 812, dpr: 3, cpu: CPU }, rondas: [] };

  async function nuevaPagina() {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 3, mobile: true }, ses);
    await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}\n" +
      // QA-111: pesca quién escribe la partida (setItem con pila) y los errores de consola
      "try { window.__qa111w = []; const s0 = Storage.prototype.setItem, r0 = Storage.prototype.removeItem;\n" +
      "Storage.prototype.setItem = function (k, v) { try { if (String(k).indexOf('.save') >= 0 && window.__qa111w.length < 20) window.__qa111w.push('set ' + k + ' ' + String(v).length + 'B @' + Math.round(performance.now()) + ' | ' + String(new Error().stack).split('\\n').slice(2, 4).join(' <- ')); } catch (e) {} return s0.apply(this, arguments); };\n" +
      "Storage.prototype.removeItem = function (k) { try { if (String(k).indexOf('.save') >= 0 && window.__qa111w.length < 20) window.__qa111w.push('del ' + k + ' @' + Math.round(performance.now()) + ' | ' + String(new Error().stack).split('\\n').slice(2, 4).join(' <- ')); } catch (e) {} return r0.apply(this, arguments); }; } catch (e) {}" }, ses);
    return { tid, ses };
  }
  async function esperarListo(ses) {
    const t0 = Date.now();
    while (Date.now() - t0 < CFG.espera_listo_s * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) return true; } catch (e) { /* aún no */ }
      await cdp.bombear(0.5);
    }
    return false;
  }

  for (let ronda = 1; ronda <= RONDAS; ronda++) {
    const rec = { ronda };
    const { tid, ses } = await nuevaPagina();
    await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1` }, ses);
    if (!(await esperarListo(ses))) { rec.error = 'la página no arrancó'; informe.rondas.push(rec); continue; }
    rec.preparar = String(await evaluar(cdp, ses, PREPARAR_JS, 60));
    if (rec.preparar !== 'listo') { informe.rondas.push(rec); try { await cdp.call('Target.closeTarget', { targetId: tid }); } catch (e) {} continue; }

    // Empezar cronometrado: keep capturado EN LA VENTANA (justo tras el clic, antes de esperar al save)
    await evaluar(cdp, ses, EMPEZAR_JS, 10, false);
    const keepRapido = JSON.parse(await evaluar(cdp, ses, KEEP_JS, 10, false));
    const esp = JSON.parse(await evaluar(cdp, ses, ESPERA_SAVE_JS, 30));
    rec.ventana = { tCerradoMs: esp.tCerradoMs, tSaveMs: esp.tSaveMs, ventanaMs: esp.ventanaMs, keepDentroDeLaVentana: !keepRapido.hay && esp.tSaveMs > 0 };

    // Guard real para el brazo de control
    const keepReal = await evaluar(cdp, ses, `(() => { try { return localStorage.getItem(window.AV.G.guardado.KEY); } catch (e) { return null; } })()`, 10, false);

    // Brazo mecanismo: keep=null (lo que vio selfTest) → estado QA-111 esperado
    rec.brazoBug = JSON.parse(await evaluar(cdp, ses, BRAZO_JS.replace('$ARG', 'null'), 10, false));
    // Brazo control: keep real → creador cerrado, created=true
    rec.brazoControl = JSON.parse(await evaluar(cdp, ses, BRAZO_JS.replace('$ARG', JSON.stringify(keepReal).replace(/</g, '\\u003c')), 10, false));
    console.log(`· ronda ${ronda}: ventana Empezar→save ${rec.ventana.ventanaMs} ms (cerrado a los ${rec.ventana.tCerradoMs} ms) · keepRapido=${keepRapido.hay}` +
      ` · brazoBug creador=${rec.brazoBug.creadorAbierto} created=${rec.brazoBug.created} · control creador=${rec.brazoControl.creadorAbierto} created=${rec.brazoControl.created}`);
    informe.rondas.push(rec);
    try { await cdp.call('Target.closeTarget', { targetId: tid }); } catch (e) { /* ya cerrada */ }
  }

  if (CON_SELFTEST) {
    console.log('· repro extremo a extremo: Empezar + AV.selfTest() en la misma tarea (keep interno = null garantizado)…');
    const { tid, ses } = await nuevaPagina();
    await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1` }, ses);
    const rec = { selftest: true };
    if (!(await esperarListo(ses))) rec.error = 'la página no arrancó';
    else {
      try { rec.resultado = JSON.parse(await evaluar(cdp, ses, SELFTEST_JS, 420)); }
      catch (e) { rec.error = e.message.slice(0, 200); }
    }
    console.log('  · resultado: ' + JSON.stringify(rec.resultado || rec.error));
    informe.rondas.push(rec);
    try { await cdp.call('Target.closeTarget', { targetId: tid }); } catch (e) { /* ya cerrada */ }
  }

  const arch = path.join(SALIDA, 'qa111.json');
  fs.writeFileSync(arch, JSON.stringify(informe, null, 2));
  console.log('· informe: ' + arch);
  try { console.log('· stderr chrome: ' + String(l.chrome.verStderr()).replace(/\s+/g, ' ').slice(-120)); } catch (e) {}
  try { spawnSync('taskkill', ['/PID', String(l.chrome.pid), '/T', '/F'], { stdio: 'ignore' }); } catch (e) {}
  try { fs.rmSync(l.perf, { recursive: true, force: true }); } catch (e) { /* perfil en uso; se limpia otro día */ }
  srv.close();
  process.exit(0);
})().catch(e => { console.error('ERROR', e); process.exit(1); });
