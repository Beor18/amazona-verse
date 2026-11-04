#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — QA-159: repro instrumentada de maestroTest 24/26 en corrida acumulada.
   Una 2.ª partida del aula se crea «en caliente» durante maestroTest cuando antes corrieron selfTest, missionTest,
   accessoryTest y templateTest (BUGS.md QA-159). Esta herramienta replica el orden del arnés (kimi2_empezar.js
   --baterias, misma página, 1,5 s entre baterías) con un gancho sobre AV.G.aula.registrar que anota fecha, stack,
   nº de partidas y S.edu.registro en cada llamada, para nombrar al que crea la entrada extra. GPU real, perfil propio.

   Uso: node tools/build/kimi1_qa159.js [--baterias selfTest,missionTest,accessoryTest,templateTest,eduTest,maestroTest]
                                        [--cpu 4] [--salida DIR]
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
const BATERIAS = arg('--baterias', 'selfTest,missionTest,accessoryTest,templateTest,eduTest,maestroTest').split(',');
const CPU = parseFloat(arg('--cpu', '4'));
const SALIDA = arg('--salida', path.join(AQUI, 'salida', 'kimi1-qa159'));
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

const SEMILLA_SAVE_JS = `try {
  if (window.top === window) {
    localStorage.clear(); sessionStorage.clear();
    localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
    localStorage.setItem('amazonaverse.save', JSON.stringify({
      v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1q159-' + Math.random().toString(36).slice(2, 10),
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
const LISTO_JS = '!!(window.AV && window.AV.G && window.AV.G.actores && (window.AV.G.actores.player3D || window.AV.G.actores.failed3D))';
// Gancho QA-159: anota cada llamada a aula.registrar con stack y estado; también snapshot de partidas tras cada batería
const GANCHO_JS = `(() => { const AU = window.AV && window.AV.G && window.AV.G.aula; if (!AU) return 'sin aula';
  window.__qa159 = [];
  const r0 = AU.registrar;
  AU.registrar = function(cambios) {
    const edu = (window.AV.state && window.AV.state.edu) || {};
    window.__qa159.push({ t: Date.now(), clock: Math.round((window.AV.state.clock || 0) * 10) / 10,
      partidas: AU.partidas.length, registro: edu.registro || null,
      pila: (new Error('x').stack || '').split('\\n').slice(1, 6).map(s => s.trim()).join(' <- ') });
    return r0.call(AU, cambios);
  };
  return 'gancho instalado'; })()`;
const SNAPSHOT_JS = `(() => { const AU = window.AV.G.aula, edu = (window.AV.state && window.AV.state.edu) || {};
  return { partidas: AU.partidas.length, registro: edu.registro || null,
    clave: (window.AV.G.pack.aula || {}).clave || null,
    lsaula: (() => { try { const d = JSON.parse(localStorage.getItem((window.AV.G.pack.aula || {}).clave || '') || 'null'); return d && d.partidas ? d.partidas.length : null; } catch (e) { return 'err'; } })() }; })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1q159-'));
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

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  console.log(`· servidor ${origen} · Chrome DevTools ${puertoDev} · móvil ${ANCHO}×${ALTO} dpr ${DPR} · CPU ×${CPU} · GPU real`);
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws);
  await cdp.listo();

  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
  await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
  await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
  if (CPU > 1) await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);

  async function esperarListo(segs) {
    const t0 = Date.now();
    while (Date.now() - t0 < segs * 1000) {
      try { if (await evaluar(cdp, ses, LISTO_JS, 10, false)) return true; } catch (e) {}
      await cdp.bombear(0.5);
    }
    return false;
  }

  function drenarErrores() {
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

  console.log('· cargando el juego (semilla sin creador)…');
  await cdp.call('Page.navigate', { url: `${origen}/index.html` }, ses);
  if (!(await esperarListo(90))) { console.log('✗ el juego no arrancó'); process.exit(2); }
  console.log('· entrada: ' + await evaluar(cdp, ses, PREPARAR_JS, 120));
  console.log('· ' + await evaluar(cdp, ses, GANCHO_JS, 10, false));

  const informe = { orden: BATERIAS, cpu: CPU, movil: { ancho: ANCHO, alto: ALTO, dpr: DPR }, baterias: {}, llamadasRegistrar: [], snapshots: {}, erroresConsola: [] };
  for (const b of BATERIAS) {
    const t0 = Date.now();
    let j;
    try {
      const r = await evaluar(cdp, ses, `(async () => { const r = await window.AV.${b}(); return JSON.stringify({ p: r && (r.passed != null ? r.passed : r.pasan != null ? r.pasan : r.ok), t: r && r.total, mal: ((r && r.results) || (r && r.checks) || []).filter(x => x && (x.pass === false || x.ok === false || x.passed === false)).map(x => (x.name || '?') + (x.extra ? ' — ' + String(x.extra).slice(0, 160) : '')).slice(0, 6) }); })()`, 900);
      j = JSON.parse(r);
    } catch (e) { j = { error: e.message.slice(0, 200) }; }
    j.segundos = Math.round((Date.now() - t0) / 100) / 10;
    informe.baterias[b] = j;
    try { informe.snapshots[b] = JSON.parse(await evaluar(cdp, ses, `JSON.stringify(${SNAPSHOT_JS})`, 10, false) || '{}'); } catch (e) { informe.snapshots[b] = { error: e.message.slice(0, 100) }; }
    try { informe.llamadasRegistrar = JSON.parse(await evaluar(cdp, ses, 'JSON.stringify(window.__qa159 || [])', 20, false) || '[]'); } catch (e) {}
    console.log(`  · ${b}: ${j.error ? 'ERROR ' + j.error : j.p + '/' + j.t}${j.mal && j.mal.length ? ' · rojos: ' + j.mal.join(' | ') : ''} (${j.segundos} s · partidas=${informe.snapshots[b].partidas} registro=${String(informe.snapshots[b].registro).slice(0, 12)} ls=${informe.snapshots[b].lsaula})`);
    await cdp.bombear(1.5); // igual que el arnés entre baterías
  }
  informe.erroresConsola = drenarErrores().slice(0, 10);
  const n = informe.llamadasRegistrar.length;
  console.log(`· ${n} llamadas a aula.registrar registradas; últimas 12:`);
  for (const c of informe.llamadasRegistrar.slice(-12)) console.log(`    [${c.t} clock=${c.clock} partidas=${c.partidas} reg=${String(c.registro).slice(0, 10)}] ${c.pila}`);
  fs.writeFileSync(path.join(SALIDA, 'qa159-repro.json'), JSON.stringify(informe, null, 2));
  console.log('· informe en ' + path.join(SALIDA, 'qa159-repro.json'));
  matarArbol(chrome, perf);
  await cdp.bombear(1);
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) {}
  srv.close();
  const m = informe.baterias.maestroTest;
  process.exit(m && !m.error && m.p === m.t ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
