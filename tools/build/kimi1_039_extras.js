#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-039: validación con GPU real de las pruebas que la nube no puede correr
   (solo tiene SwiftShader): AV.temporadaMovilTest (temporada móvil con pulgar), AV.ep6Test y AV.controlesTest.
   Réplica en Node + CDP de tests/qa/temporada_movil_correr.js (playwright no está en esta PC): Chrome headless propio
   con GPU real, perfil temporal propio, móvil 390×844 dpr 2 táctil con UA de iPhone. Cada prueba va en carga de página
   propia; las de temporada/ep6 juegan dentro del iframe que prepara tests/qa/ep_caminar.js (mismo comportamiento que
   con playwright: jugador nuevo, portada → creador → guía con pulgar). La partida del juego se respalda y se devuelve
   igual (lo hace el propio test). Sale con código 1 si algo queda en rojo o hay errores de consola nuevos.

   Uso: node tools/build/kimi1_039_extras.js [--pruebas temporada,ep6,controles] [--caps 1,2,3,4,5,6] [--cpu 1]
                                        [--salida DIR] [--log]
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
const PRUEBAS = arg('--pruebas', 'temporada,ep6,controles').split(',');
const CAPS = arg('--caps', '1,2,3,4,5,6').split(',').map(Number);
const CPU = parseFloat(arg('--cpu', '1'));
const LOG = process.argv.includes('--log');
const SALIDA = arg('--salida', path.join(AQUI, 'salida', 'kimi1-039'));
const ANCHO = 390, ALTO = 844, DPR = 2;
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

// ---- CDP mínimo (websocket del navegador; sin librerías) ----
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

// Semilla: jugador «existente» de cap1 en el documento RAÍZ (nunca en los iframes de los recorridos:
// ellos limpian lo del juego y juegan como jugador nuevo; si el seed corriera dentro les borraría el
// progreso de la temporada en cada documento nuevo).
const SEMILLA_SAVE_JS = `try {
  if (window.top === window) {
    localStorage.clear(); sessionStorage.clear();
    localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
    localStorage.setItem('amazonaverse.save', JSON.stringify({
      v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1x039-' + Math.random().toString(36).slice(2, 10),
      profile: { created: true, name: 'Estrella de la Bahía', look: null },
      pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
      inv: {}, collected: [], complete: false, explorando: false, clock: 0,
      events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
      comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
      evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
    }));
  }
} catch (e) {}`;
const PREPARAR_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene el botón Jugar'; b.click();
    if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta tras Jugar'; }
  const cr = $('creator');
  if (cr && !cr.hidden) { await espera(() => $('p-stage-status') && $('p-stage-status').hidden, 30000); const s = $('p-save'); if (!s) return 'el creador no tiene Empezar (#p-save)';
    s.click(); if (!await espera(() => cr.hidden, 8000)) return 'Empezar no cerró el creador'; }
  const S = window.AV && window.AV.state; if (!S || !S.profile || !S.profile.created) return 'sin perfil creado tras entrar';
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(30000);
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 20000);
  return 'ok: partida sembrada → Jugar (' + S.profile.name + ')'; })()`;
// OJO: tiene que devolver un booleano de verdad; `a && b && (obj || obj2)` devuelve el OBJETO (player3D es un Object3D
// enorme) y CDP rechaza serializarlo con «Object reference chain is too long» (bug que dejó la página 90 s «sin arrancar»)
const LISTO_JS = '!!(window.AV && window.AV.G && window.AV.G.actores && (window.AV.G.actores.player3D || window.AV.G.actores.failed3D))';

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1x039-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', '--window-size=500,900'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  chrome.verStderr = () => err.slice(-500);
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
  // red de seguridad: cualquier chrome.exe que haya quedado con este perfil temporal (los zombies roban GPU)
  try {
    const marca = path.basename(perf || '');
    if (marca) spawnSync('powershell', ['-NoProfile', '-Command',
      "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*" + marca + "*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"],
      { stdio: 'ignore', timeout: 30000 });
  } catch (e) {}
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  console.log(`· servidor ${origen} · Chrome DevTools ${puertoDev} (perfil ${perf}) · móvil ${ANCHO}×${ALTO} dpr ${DPR} táctil · CPU ×${CPU} · GPU real`);
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws);
  await cdp.listo();

  const scripts = {};
  for (const f of ['ep_caminar.js', 'ep3_e2e.js', 'ep4_e2e.js', 'ep5_e2e.js', 'ep6_e2e.js', 'temporada_movil.js'])
    scripts[f] = fs.readFileSync(path.join(RAIZ, 'tests', 'qa', f), 'utf8');

  async function nuevaPagina() {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
    await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5, configuration: 'mobile' }, ses);
    await cdp.call('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
    if (CPU > 1) await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
    return { tid, ses };
  }

  async function esperarListo(ses, segs) {
    const t0 = Date.now();
    let ultErr = '', nErr = 0, nPoll = 0;
    while (Date.now() - t0 < segs * 1000) {
      nPoll++;
      try { if (await evaluar(cdp, ses, LISTO_JS, 10, false)) return true; } catch (e) { nErr++; ultErr = e.message.slice(0, 160); }
      await cdp.bombear(0.5);
    }
    console.log(`  · esperarListo: ${nPoll} sondeos, ${nErr} errores; último: ${ultErr}`);
    return false;
  }

  // errores de consola (console.error + excepciones) capturados por CDP en esta sesión, con su contexto (iframe incluido)
  function drenarEventos(ses) {
    const out = [], w17 = [];
    for (const ev of cdp.eventos) {
      if (ev.sessionId !== ses) continue;
      if (ev.method === 'Runtime.exceptionThrown') {
        const d = ev.params.exceptionDetails;
        out.push('EXCEPCIÓN: ' + String((d.exception && (d.exception.description || d.exception.value)) || d.text).slice(0, 300));
      } else if (ev.method === 'Runtime.consoleAPICalled' && ev.params.type === 'error') {
        out.push(ev.params.args.map(a => String(a.value != null ? a.value : (a.description || a.type))).join(' ').slice(0, 300));
      } else if (ev.method === 'Runtime.consoleAPICalled' && LOG) {
        const txt = ev.params.args.map(a => String(a.value != null ? a.value : (a.description || a.type))).join(' ');
        if (/^\[(W17|CG3)\]/.test(txt)) w17.push(txt.slice(0, 400));
      }
    }
    cdp.eventos.length = 0;
    return { errores: out, traza: w17 };
  }

  const informe = { movil: { ancho: ANCHO, alto: ALTO, dpr: DPR, cpu: CPU, ua: 'iPhone', gpu: 'real (ANGLE/D3D11)' }, pruebas: {} };
  let fallos = 0;

  for (const prueba of PRUEBAS) {
    const t0 = Date.now();
    console.log(`· ${prueba}: nueva página móvil…`);
    const { ses } = await nuevaPagina();
    await cdp.call('Page.navigate', { url: `${origen}/index.html` }, ses);
    if (!(await esperarListo(ses, 90))) {
      // diagnóstico: ¿en qué punto del arranque está la página y qué errores hay?
      let diag = {};
      try { diag = JSON.parse(await evaluar(cdp, ses, `JSON.stringify({
        ready: document.readyState, av: typeof window.AV, g: !!(window.AV && window.AV.G),
        actores: !!(window.AV && window.AV.G && window.AV.G.actores),
        player3D: !!(window.AV && window.AV.G && window.AV.G.actores && window.AV.G.actores.player3D),
        failed3D: !!(window.AV && window.AV.G && window.AV.G.actores && window.AV.G.actores.failed3D),
        titleOpen: !!(document.getElementById('title') && document.getElementById('title').open),
        creador: !!(document.getElementById('creator') && !document.getElementById('creator').hidden)
      })`, 20, false) || '{}'); } catch (e) { diag = { evalError: e.message.slice(0, 200) }; }
      const evs = drenarEventos(ses);
      console.log(`  ✗ ${prueba}: el juego no arrancó en la página superior (90 s) · diag=${JSON.stringify(diag)}` +
        (evs.errores.length ? ' · errores=' + JSON.stringify(evs.errores.slice(0, 4)) : ''));
      informe.pruebas[prueba] = Object.assign({ error: 'sin arranque' }, diag, { erroresConsola: evs.errores.slice(0, 8) });
      fallos++; continue;
    }
    const prep = String(await evaluar(cdp, ses, PREPARAR_JS, 120));
    if (!prep.startsWith('ok')) { console.log(`  ✗ ${prueba}: entrada falló — ${prep}`); informe.pruebas[prueba] = { error: prep }; fallos++; continue; }
    // inyectar los recorridos (igual que el corredor playwright)
    for (const f of ['ep_caminar.js', 'ep3_e2e.js', 'ep4_e2e.js', 'ep5_e2e.js', 'ep6_e2e.js', 'temporada_movil.js'])
      await evaluar(cdp, ses, scripts[f], 30, false);

    let exp, timeoutS;
    if (prueba === 'temporada') {
      exp = `(async () => { const r = await AV.temporadaMovilTest({ idioma: 'es', caps: [${CAPS.join(',')}] });
        return JSON.stringify({ passed: r.passed, total: r.total, rojos: r.results.filter(x => !x.ok).map(x => x.name + (x.extra ? ' :: ' + x.extra : '')).slice(0, 30) }); })()`;
      timeoutS = 1800; // temporada completa: ~15 min en la nube; tope holgado
    } else if (prueba === 'ep6') {
      // lo pedido por la coordinadora es AV.ep6Test (templateTest del pack ep6, con su iframe propio);
      // el recorrido completo sin teleport de cap. 6 (ep6e2eTest) ya lo cubre temporadaMovilTest
      exp = `(async () => { const r = await AV.ep6Test({ idioma: 'es' });
        return JSON.stringify({ passed: r.passed, total: r.total, rojos: r.results.filter(x => !x.ok).map(x => x.name + (x.extra ? ' :: ' + x.extra : '')).slice(0, 30) }); })()`;
      timeoutS = 600;
    } else if (prueba === 'controles') {
      exp = `(async () => { const r = await AV.controlesTest();
        return JSON.stringify({ passed: r.passed, total: r.total, rojos: r.results.filter(x => !x.ok).map(x => x.name + (x.extra ? ' :: ' + x.extra : '')).slice(0, 30) }); })()`;
      timeoutS = 300;
    } else { console.log(`  · prueba desconocida '${prueba}': se salta`); continue; }

    let r;
    try { r = JSON.parse(await evaluar(cdp, ses, exp, timeoutS)); }
    catch (e) { r = { error: e.message.slice(0, 300) }; }
    const { errores, traza } = drenarEventos(ses);
    try { const ave = JSON.parse(await evaluar(cdp, ses, 'JSON.stringify((window.__aveErrores || []).slice(-10))', 10, false) || '[]'); for (const e of ave) errores.push('__ave: ' + String(e).slice(0, 250)); } catch (e) {}
    informe.pruebas[prueba] = Object.assign({}, r, { erroresConsola: errores, segundos: Math.round((Date.now() - t0) / 100) / 10 });
    if (r.error) { console.log(`  ✗ ${prueba}: ${r.error}`); fallos++; }
    else {
      console.log(`  · ${prueba}: ${r.passed}/${r.total} · ${informe.pruebas[prueba].segundos} s` + (errores.length ? ` · ${errores.length} errores de consola` : ''));
      for (const rojo of r.rojos || []) console.log('    ✗ ' + rojo);
      if (r.passed !== r.total) fallos++;
    }
    if (errores.length) { for (const e of errores.slice(0, 5)) console.log('    · consola: ' + e); fallos++; }
    if (LOG) for (const t of traza.slice(0, 200)) console.log('    ' + t);
  }

  fs.writeFileSync(path.join(SALIDA, 'extras.json'), JSON.stringify(informe, null, 2));
  console.log(`· informe en ${path.join(SALIDA, 'extras.json')}`);
  matarArbol(chrome, perf);
  await cdp.bombear(1);
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) {}
  srv.close();
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
