#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-204 (copia de k062 con volcado completo de recursos): regresión de la carga inicial SIN bandera ?v18.
   La coordinadora midió en la nube: publicación 0b21742 = 10,02 MB (_glb.js 3,44 · .js 3,37 ·
   imágenes 2,98) frente a 6,58 MB en e0dfc12 (esta mañana) y 20,03 MB en la Mac (ea79b84).
   Esta herramienta reproduce la carga inicial en perfil iPhone «bajo» con la GPU real de la PC
   (390×844 dpr 3, UA iOS, táctil, CPU ×4 → cae en 'bajo' natural, QA-110/158), con partida
   sembrada de cap1 (sin creador) y Network CDP desde antes de la navegación:
   - bytes por recurso con timestamp de fin → ventanas: hasta mundo.listo / hasta reveal+5 s / total;
   - clasificación _glb.js · .js · imágenes · otro (misma taxonomía que la nube);
   - línea de tiempo de muestras (listo, calls, heap) para ver el tope de 26 s;
   - assert: nada de src/game/v18/ entra sin la bandera.
   Atribución del delta: cada recurso de la ventana se fecha con `git log --diff-filter=A`
   entre e0dfc12..HEAD (qué se añadió después de la línea base de la nube).
   Uso: node tools/build/kimi1_062.js [--etiqueta r1] [--secs 90]
   Salida: consola + docs/img/kimi062/k062_<etiqueta>.json (+ captura _final.jpg)
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ANCHO = 390, ALTO = 844, DPR = 3, CPU = 4;
const SECS = +(arg('--secs', '150'));
const ETIQUETA = arg('--etiqueta', 'r1');
const RAIZ_SRV = arg('--raiz', ''); // servir otro árbol (p. ej. archive de la línea base e0dfc12)
const SIN_GIT = process.argv.includes('--sin-git');
const URL_EXTRA = arg('--url-extra', ''); // p. ej. "v18=1" para medir con la V18 por defecto (KIMI-177)
const BASE_NUBE = 'e0dfc12'; // línea base de la medición de la nube (6,58 MB)
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi062');
fs.mkdirSync(SALIDA, { recursive: true });
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    const qa = /[?&]qa=1(?:&|$)/.test(req.url);
    if (p.endsWith('/')) p += 'index.html';
    const raizSrv = RAIZ_SRV || RAIZ;
    const f = path.join(raizSrv, p);
    if (!f.startsWith(raizSrv) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); return res.end('404'); }
      if (qa && /index\.html$/.test(f) && fs.existsSync(path.join(raizSrv, 'tests', 'qa', 'qa.js'))) d = Buffer.from(d.toString('utf8').replace(/<meta charset[^>]*>/i, m => m + '<script src="tests/qa/qa.js" charset="utf-8"></script>'), 'utf8');
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
async function ev(cdp, ses, exp, t, aw) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, returnByValue: true, awaitPromise: aw !== false }, ses, (t || 30) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 400));
  return r.result ? r.result.value : undefined;
}

const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
// Semilla de cap1 (jugador existente: Jugar entra directo, sin creador) — misma familia que kimi2_qa152.js
const SEMILLA_SAVE_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: 134, z: 182.5, y: 5.24 }, facing: { x: 0, z: -1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;
const MUESTRA_JS = `(() => { const m = performance.memory || {};
  let listo = false, calls = null, tris = null, fps = null, calidad = null, v18 = false;
  try { listo = !!(window.AV && AV.G && AV.G.mundo && AV.G.mundo.listo); } catch (e) {}
  try { const st = AV.G.renderer.stats(); calls = st.calls; tris = st.triangulos; fps = st.fps; calidad = st.calidad; } catch (e) {}
  try { v18 = !!(AV.G && AV.G.v18fx); } catch (e) {}
  // reveal real de la pantalla de carga: #carga cerrada (hidden o carga-sale) o AV.carga.ultima con motivo
  let revelado = false, motivo = null, msCarga = null;
  try { const el = document.querySelector('#carga'); if (el) revelado = el.hidden || el.classList.contains('carga-sale'); } catch (e) {}
  try { const u = AV.carga && AV.carga.ultima; if (u && u.motivo) { motivo = u.motivo; msCarga = u.ms; revelado = revelado || true; } } catch (e) {}
  return { listo, calls, tris, fps, calidad, v18, revelado, motivo, msCarga,
    heap: m.usedJSHeapSize || 0, t: Math.round(performance.now()) }; })()`;

function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1-'));
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
      if (++vueltas > 300) { clearInterval(iv); rej(new Error('Chrome no abrió DevTools en 60 s: ' + err.slice(0, 300))); }
    }, 200);
  });
}

function tipoDe(url) {
  if (/\/v18\//.test(url)) return 'v18!';
  const limpia = url.split('?')[0];
  if (/(_glb|_hd|_lejos|_cerca)?\.glb$/i.test(limpia) || /\.glb\.js$/i.test(limpia)) return /\.glb\.js$/i.test(limpia) ? '_glb.js' : 'glb';
  if (/\.m?js$/i.test(limpia)) return '.js';
  if (/\.(jpe?g|png|webp|gif|svg)$/i.test(limpia)) return 'imagen';
  if (/\.(json)$/i.test(limpia)) return '.json';
  return 'otro';
}
function fechaAlta(rel) {
  // commit que añadió el archivo entre BASE_NUBE..HEAD ('' si existía ya en la base)
  try {
    const out = execSync(`git log --diff-filter=A --format=%h -1 ${BASE_NUBE}..HEAD -- "${rel}"`, { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return out || null;
  } catch (e) { return null; }
}

(async () => {
  const head = arg('--head-label', '') || execSync('git rev-parse --short HEAD', { cwd: RAIZ, encoding: 'utf8' }).trim();
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const res = { etiqueta: ETIQUETA, pantalla: 'movil 390x844@3 cpuX4', ua: 'iPhone (bajo natural)',
    head, baseNube: BASE_NUBE, inicio: new Date().toISOString(), muestras: [], red: null, asserts: {} };
  const chromeL = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${chromeL.puerto}${chromeL.wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const recs = []; // {u, b (bytes), msFin, mime}
  let bytesTotal = 0;
  cdp.onEvent = d => {
    if (d.method === 'Network.responseReceived') {
      const p = d.params; if (!recs.find(r => r.id === p.requestId)) recs.push({ id: p.requestId, u: p.response.url, b: 0, msFin: null, mime: p.response.mimeType });
    } else if (d.method === 'Network.loadingFinished') {
      const r = recs.find(x => x.id === d.params.requestId);
      if (r) { r.b = d.params.encodedDataLength || 0; r.msFin = Date.now() - t0; bytesTotal += r.b; }
    }
  };
  let t0 = Date.now();
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Network.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA_IPHONE }, ses);
    await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
    t0 = Date.now();
    await cdp.call('Page.navigate', { url: origen + '/index.html?qa=1&cap=1' + (URL_EXTRA ? '&' + URL_EXTRA : '&v18=0') }, ses); // sin URL_EXTRA: la versión estable (?v18=0)

    let tReveal = null, motivoCarga = null, msCarga = null, ultimoTap = 0, nTaps = 0;
    const TAP_JS = `(() => {
      const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
        return r.width > 4 && r.height > 4 && s.visibility !== 'hidden' && s.display !== 'none'; };
      const btns = [...document.querySelectorAll('button, [role="button"], a')].filter(vis);
      const b = btns.find(x => /aventura|empezar la historia|jugar/i.test((x.textContent || '')));
      if (b) { b.click(); return 'tap:' + (b.textContent || '').trim().slice(0, 30); }
      // intro del cap. 1: cualquier tecla salta (QA-159)
      try { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); } catch (e) {}
      return 'tecla'; })()`;
    const limite = Date.now() + SECS * 1000;
    while (Date.now() < limite) {
      await cdp.bombear(0.4);
      const ms = Date.now() - t0;
      let m = null;
      try { m = await ev(cdp, ses, MUESTRA_JS, 8, false); } catch (e) {}
      if (m) {
        m.s = Math.round(ms / 100) / 10;
        res.muestras.push(m);
        if (tReveal === null && m.revelado) { tReveal = ms; motivoCarga = m.motivo; msCarga = m.msCarga; }
        else if (tReveal === null && ms - ultimoTap > 6000 && nTaps < 12) {
          ultimoTap = ms; nTaps++;
          try { const r = await ev(cdp, ses, TAP_JS, 6, false); res.taps = res.taps || []; res.taps.push({ s: Math.round(ms / 100) / 10, r }); } catch (e) {}
        }
        if (tReveal !== null && ms > tReveal + 15000) break; // 15 s post-reveal basta
      }
    }
    try {
      const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 30000);
      fs.writeFileSync(path.join(SALIDA, `k062_${ETIQUETA}_final.jpg`), Buffer.from(shot.data, 'base64'));
    } catch (e) {}

    // ventanas de bytes
    const ventanaHasta = msLim => recs.filter(r => r.msFin !== null && r.msFin <= msLim);
    const suma = lista => {
      const porTipo = {}; let total = 0;
      for (const r of lista) { const t = tipoDe(r.u); porTipo[t] = (porTipo[t] || 0) + r.b; total += r.b; }
      for (const k in porTipo) porTipo[k] = Math.round(porTipo[k] / 1048576 * 100) / 100;
      return { totalMB: Math.round(total / 1048576 * 100) / 100, porTipo, n: lista.length };
    };
    const topDe = (lista, n) => lista.slice().sort((a, b) => b.b - a.b).slice(0, n)
      .map(r => ({ mb: Math.round(r.b / 1048576 * 1000) / 1000, t: Math.round(r.msFin / 100) / 10, tipo: tipoDe(r.u), u: r.u.replace(origen, '') }));

    const tRevealFin = tReveal !== null ? tReveal : SECS * 1000;
    res.red = {
      bytesTotalMB: Math.round(bytesTotal / 1048576 * 100) / 100,
      nRecursos: recs.filter(r => r.msFin !== null).length,
      tRevealMs: tReveal, motivoCarga, msCargaJuego: msCarga,
      hastaReveal: suma(ventanaHasta(tRevealFin)),
      hastaRevealMas5: suma(ventanaHasta(tRevealFin + 5000)),
      total: suma(recs.filter(r => r.msFin !== null)),
      topEnReveal: topDe(ventanaHasta(tRevealFin + 5000), 20),
      topTotal: topDe(recs.filter(r => r.msFin !== null), 15),
      todasVentana: ventanaHasta(tRevealFin).map(r => ({ kb: Math.round(r.b / 1024), tipo: tipoDe(r.u), u: r.u.replace(origen, '') })),
      v18Urls: recs.filter(r => /\/v18\//.test(r.u)).map(r => r.u.replace(origen, '')),
    };
    res.asserts.sinBanderaNadaDeV18 = URL_EXTRA ? null : res.red.v18Urls.length === 0;
    res.asserts.calidadBaja = (res.muestras.find(m => m.calidad) || {}).calidad || null;

    // atribución: qué recursos de la ventana de carga se añadieron después de BASE_NUBE
    const enVentana = ventanaHasta(tRevealFin + 5000).filter(r => r.b > 20000);
    const altas = {};
    if (!SIN_GIT && !RAIZ_SRV) for (const r of enVentana) {
      const rel = decodeURIComponent(r.u.replace(origen, '').split('?')[0]).replace(/^\//, '');
      const alta = fechaAlta(rel);
      if (alta) {
        if (!altas[alta]) altas[alta] = { mb: 0, n: 0, ejemplos: [] };
        altas[alta].mb = Math.round((altas[alta].mb * 1048576 + r.b) / 1048576 * 100) / 100;
        altas[alta].n++;
        if (altas[alta].ejemplos.length < 6) altas[alta].ejemplos.push(rel);
      }
    }
    res.altasDesdeBase = altas;

    const f = path.join(SALIDA, `k062_${ETIQUETA}.json`);
    fs.writeFileSync(f, JSON.stringify(res, null, 1));
    console.log(`[k062] HEAD ${head} · calidad ${res.asserts.calidadBaja} · reveal ${tReveal === null ? 'NO' : (tReveal / 1000).toFixed(1) + ' s'} (${motivoCarga || '?'}${msCarga ? ' ' + msCarga + ' ms' : ''})`);
    console.log(`[k062] hasta reveal:      ${JSON.stringify(res.red.hastaReveal)}`);
    console.log(`[k062] hasta reveal+5 s: ${JSON.stringify(res.red.hastaRevealMas5)}`);
    console.log(`[k062] total corrida:    ${JSON.stringify(res.red.total)} (${res.red.bytesTotalMB} MB en ${res.red.nRecursos} recursos)`);
    console.log(`[k062] assert sin bandera (0 URLs /v18/): ${res.asserts.sinBanderaNadaDeV18} · v18fx cargado: ${(res.muestras.find(m => m.v18) || {}).v18}`);
    if (Object.keys(altas).length) console.log('[k062] recursos añadidos desde ' + BASE_NUBE + ' que entran en la ventana:\n  ' +
      Object.entries(altas).map(([c, a]) => `${c}: ${a.mb} MB ×${a.n} (${a.ejemplos.join(', ')})`).join('\n  '));
    console.log('[k062] top en ventana:\n  ' + res.red.topEnReveal.map(t => `${t.mb} MB @${t.t}s ${t.tipo} ${t.u}`).join('\n  '));
    console.log('[k062] JSON: ' + f);
  } finally {
    try { cdp.call('Browser.close', {}, undefined, 3000); } catch (e) {}
    await new Promise(r => setTimeout(r, 1200));
    try { spawn('taskkill', ['/PID', String(chromeL.chrome.pid), '/T', '/F'], { stdio: 'ignore' }); } catch (e) {}
    try { fs.rmSync(chromeL.perf, { recursive: true, force: true }); } catch (e) {}
    srv.close();
  }
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
