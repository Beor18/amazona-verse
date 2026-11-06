#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-153: pruebas de capítulo de punta a punta con GPU real,
   con y sin la bandera ?v18=1 (las que la nube no llegó a correr): AV.ep2e2eTest…AV.ep6e2eTest,
   AV.ep4GuardadoTest y AV.zonas56Test. Réplica en Node + CDP del corredor playwright de la nube
   (temporada_movil_correr.js): Chrome headless propio con GPU real, cada prueba en carga de página
   propia; los recorridos crean sus iflames (?pack=epN) y respaldan/devuelven el almacenamiento solos.
   La bandera se propaga a los iframes desde la página superior (edición test-only en los 4 tests:
   ep2_e2e.js, ep_caminar.js, ep4_guardado.js, zonas56.js). Sale 1 si algo queda rojo o hay errores
   de consola nuevos.

   Uso: node tools/build/kimi2_k153.js [--pruebas ep2,ep3,ep4,ep5,ep6,ep4guardado,zonas56]
                                  [--bandera 0|1] [--idioma es|en] [--cpu 1] [--salida DIR] [--log]
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

function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const PRUEBAS = arg('--pruebas', 'ep2,ep3,ep4,ep5,ep6,ep4guardado,zonas56').split(',');
const BANDERA = arg('--bandera', '1');
const IDIOMA = arg('--idioma', '');
const CPU = parseFloat(arg('--cpu', '1'));
const LOG = process.argv.includes('--log');
const SALIDA = arg('--salida', path.join(AQUI, 'salida', 'kimi2-k153'));
const ANCHO = 1280, ALTO = 800, DPR = 1;
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

// La página superior solo hospeda los tests: no hace falta entrar al juego en ella (los recorridos
// abren sus propios iframes ?pack=epN y juegan como jugador nuevo). Esperamos a que el motor exista.
const LISTO_JS = '!!(window.AV && window.AV.G && window.AV.G.actores && window.AV.G.renderer)';

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2k153-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', '--window-size=1400,900'];
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
  console.log(`· servidor ${origen} · Chrome DevTools ${puertoDev} · ${ANCHO}×${ALTO} dpr ${DPR} · CPU ×${CPU} · GPU real · bandera v18=${BANDERA}`);
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws);
  await cdp.listo();

  const scripts = {};
  for (const f of ['ep_caminar.js', 'ep2_e2e.js', 'ep3_e2e.js', 'ep4_e2e.js', 'ep5_e2e.js', 'ep6_e2e.js', 'ep4_guardado.js', 'zonas56.js'])
    scripts[f] = fs.readFileSync(path.join(RAIZ, 'tests', 'qa', f), 'utf8');

  async function nuevaPagina() {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: false }, ses);
    if (CPU > 1) await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
    return { tid, ses };
  }

  async function esperarListo(ses, segs) {
    const t0 = Date.now();
    let ultErr = '', nErr = 0;
    while (Date.now() - t0 < segs * 1000) {
      try { if (await evaluar(cdp, ses, LISTO_JS, 10, false)) return true; } catch (e) { nErr++; ultErr = e.message.slice(0, 160); }
      await cdp.bombear(0.5);
    }
    console.log(`  · esperarListo: ${nErr} errores; último: ${ultErr}`);
    return false;
  }

  function drenarEventos(ses) {
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

  const informe = { maquina: { ancho: ANCHO, alto: ALTO, dpr: DPR, cpu: CPU, gpu: 'real (ANGLE/D3D11)', banderaV18: BANDERA === '1' }, pruebas: {} };
  let fallos = 0;
  const urlTop = `${origen}/index.html${BANDERA === '1' ? '?v18=1' : ''}`;

  for (const prueba of PRUEBAS) {
    const t0 = Date.now();
    console.log(`· ${prueba}: nueva página (${urlTop})…`);
    const { ses } = await nuevaPagina();
    await cdp.call('Page.navigate', { url: urlTop }, ses);
    if (!(await esperarListo(ses, 90))) {
      const evs = drenarEventos(ses);
      console.log(`  ✗ ${prueba}: el motor no arrancó en la página superior (90 s)` + (evs.length ? ' · errores=' + JSON.stringify(evs.slice(0, 4)) : ''));
      informe.pruebas[prueba] = { error: 'sin arranque', erroresConsola: evs.slice(0, 8) };
      fallos++; continue;
    }
    for (const f of Object.keys(scripts)) await evaluar(cdp, ses, scripts[f], 30, false);

    let exp, timeoutS;
    const idiomaArg = IDIOMA ? `idioma: '${IDIOMA}'` : '';
    if (/^ep[2-6]$/.test(prueba)) {
      const fn = 'AV.ep' + prueba.slice(2) + 'e2eTest';
      exp = `(async () => { const r = await ${fn}({ ${idiomaArg} });
        return JSON.stringify({ passed: r.passed, total: r.total, rojos: r.results.filter(x => !x.ok).map(x => x.name + (x.extra ? ' :: ' + x.extra : '')).slice(0, 30) }); })()`;
      timeoutS = 1500;
    } else if (prueba === 'ep4guardado') {
      exp = `(async () => { const r = await AV.ep4GuardadoTest();
        return JSON.stringify({ passed: r.passed, total: r.total, rojos: r.results.filter(x => !x.ok).map(x => x.name + (x.extra ? ' :: ' + x.extra : '')).slice(0, 30) }); })()`;
      timeoutS = 1200;
    } else if (prueba === 'zonas56') {
      exp = `(async () => { const r = await AV.zonas56Test();
        return JSON.stringify({ passed: r.passed, total: r.total, rojos: r.results.filter(x => !x.ok).map(x => x.name + (x.extra ? ' :: ' + x.extra : '')).slice(0, 30) }); })()`;
      timeoutS = 900;
    } else { console.log(`  · prueba desconocida '${prueba}': se salta`); continue; }

    let r;
    try { r = JSON.parse(await evaluar(cdp, ses, exp, timeoutS)); }
    catch (e) { r = { error: e.message.slice(0, 300) }; }
    const errores = drenarEventos(ses);
    try { const ave = JSON.parse(await evaluar(cdp, ses, 'JSON.stringify((window.__aveErrores || []).slice(-10))', 10, false) || '[]'); for (const e of ave) errores.push('__ave: ' + String(e).slice(0, 250)); } catch (e) {}
    informe.pruebas[prueba] = Object.assign({}, r, { erroresConsola: errores, segundos: Math.round((Date.now() - t0) / 100) / 10 });
    fs.writeFileSync(path.join(SALIDA, 'k153.json'), JSON.stringify(informe, null, 2)); // incremental
    if (r.error) { console.log(`  ✗ ${prueba}: ${r.error}`); fallos++; }
    else {
      console.log(`  · ${prueba}: ${r.passed}/${r.total} · ${informe.pruebas[prueba].segundos} s` + (errores.length ? ` · ${errores.length} errores de consola` : ''));
      for (const rojo of r.rojos || []) console.log('    ✗ ' + rojo);
      if (r.passed !== r.total) fallos++;
    }
    if (errores.length) { for (const e of errores.slice(0, 5)) console.log('    · consola: ' + e); fallos++; }
  }

  console.log(`· informe en ${path.join(SALIDA, 'k153.json')}`);
  matarArbol(chrome, perf);
  await cdp.bombear(1);
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) {}
  srv.close();
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
