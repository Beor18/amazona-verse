#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-203: medición de la carga inicial con la contabilidad de avtest.py (W19).
   La coordinadora (7-nov 14:25 UTC): "Mide con avtest.py (ya cuenta lo que sirve sw.js)". No hay Python real en esta
   PC (solo el stub de la Store), así que esta herramienta replica EXACTAMENTE la contabilidad de bytes de avtest.py:
   - Network CDP desde antes de la navegación; por petición: bytes = encodedDataLength,
     PERO si la respuesta viene del service worker (fromServiceWorker con serviceWorkerResponseSource
     network/fallback-code/None), encodedDataLength es 0 y se acumula Network.dataReceived en sw_red (fix W19);
   - fase 'arranque' = desde la navegación hasta red quieta (>=2 s sin peticiones pendientes, tope espera_red_s),
     igual que medir() de avtest.py; cada archivo cuenta una vez (el máximo por ruta);
   - taxonomía por tipo igual que avtest.py (_glb.js · .glb · imágenes · .js · externas · otros) y lista de mayores;
   - flujo: partida sembrada cap1 (sin creador) → portada → tap Aventura → intro saltada → espera red quieta.
   Sirve una carpeta tipo build (--raiz; por defecto nada: hay que pasarla) con Cache-Control no-store (igual que avtest).

   Uso: node tools/build/kimi3_carga.js --raiz <carpeta> [--etiqueta r1] [--espera-red 45] [--url-extra "v18=1"] [--sin-semilla]
        [--escritorio] [--calidad bajo|medio|alto]   (KIMI-206/QA-201: A/B de la carga inicial en medio/alto vs bajo con perfil Mac)
   Salida: consola + docs/img/kimi3carga/k3carga_<etiqueta>.json (+ captura _final.jpg)
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
const ESCRITORIO = process.argv.includes('--escritorio'); // KIMI-206/QA-201: perfil Mac (ventana grande, UA desktop, CPU x1)
const ANCHO = ESCRITORIO ? 1600 : 390, ALTO = ESCRITORIO ? 900 : 844, DPR = ESCRITORIO ? 1 : 3, CPU = ESCRITORIO ? 1 : 4;
const ETIQUETA = arg('--etiqueta', 'r1');
const RAIZ_SRV = path.resolve(arg('--raiz', ''));
const ESPERA_RED_S = +(arg('--espera-red', '45'));
const URL_EXTRA = arg('--url-extra', '');
const CALIDAD = arg('--calidad', ''); // bajo|medio|alto forzada vía ?calidad= (A/B QA-201)
const SIN_SEMILLA = process.argv.includes('--sin-semilla');
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi3carga');
fs.mkdirSync(SALIDA, { recursive: true });
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ_SRV, p);
    if (!f.startsWith(RAIZ_SRV) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); return res.end('404'); }
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
const UA_DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const UA = ESCRITORIO ? UA_DESKTOP : UA_IPHONE;
// Misma semilla que kimi1_062.js (jugador existente: Jugar entra directo, sin creador)
const SEMILLA_SAVE_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi3-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: 134, z: 182.5, y: 5.24 }, facing: { x: 0, z: -1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;
const MUESTRA_JS = `(() => { const m = performance.memory || {};
  let listo = false, calls = null, tris = null, calidad = null, v18 = false;
  try { listo = !!(window.AV && AV.G && AV.G.mundo && AV.G.mundo.listo); } catch (e) {}
  try { const st = AV.G.renderer.stats(); calls = st.calls; tris = st.triangulos; calidad = st.calidad; } catch (e) {}
  try { v18 = !!(AV.G && AV.G.v18fx); } catch (e) {}
  let revelado = false, motivo = null, msCarga = null;
  try { const el = document.querySelector('#carga'); if (el) revelado = el.hidden || el.classList.contains('carga-sale'); } catch (e) {}
  try { const u = AV.carga && AV.carga.ultima; if (u && u.motivo) { motivo = u.motivo; msCarga = u.ms; revelado = revelado || true; } } catch (e) {}
  return { listo, calls, tris, calidad, v18, revelado, motivo, msCarga,
    heap: m.usedJSHeapSize || 0, t: Math.round(performance.now()) }; })()`;

function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3c-'));
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
  const limpia = url.split('?')[0];
  if (/_glb\.js$/i.test(limpia)) return '_glb.js';
  if (/\.glb$/i.test(limpia)) return '.glb';
  if (/\.(jpe?g|png|webp|gif)$/i.test(limpia)) return 'imágenes';
  if (/\.m?js$/i.test(limpia)) return '.js';
  if (/^https?:/i.test(url)) return 'externas';
  return 'otros';
}

(async () => {
  if (!RAIZ_SRV) { console.error('FALLO: pasa --raiz <carpeta a servir> (p. ej. sitio/juego o una build)'); process.exit(2); }
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const head = execSync('git rev-parse --short HEAD', { cwd: RAIZ, encoding: 'utf8' }).trim();
  const res = { etiqueta: ETIQUETA, herramienta: 'kimi3_carga.js (contabilidad W19 de avtest.py)', head,
    raiz: RAIZ_SRV, pantalla: ESCRITORIO ? 'escritorio 1600x900@1 cpuX1' : 'movil 390x844@3 cpuX4',
    ua: ESCRITORIO ? 'desktop Mac-like' + (CALIDAD ? ' (calidad forzada ' + CALIDAD + ')' : '') : 'iPhone (bajo natural)' + (CALIDAD ? ' (calidad forzada ' + CALIDAD + ')' : ''), inicio: new Date().toISOString(),
    muestras: [], red: null };
  const chromeL = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${chromeL.puerto}${chromeL.wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  // requestId -> {u, bytes, sw_red, msFin, tipo}; bytes finales = encodedDataLength || sw_red (igual que avtest)
  const reqs = new Map();
  let bytesTotal = 0;
  cdp.onEvent = d => {
    if (d.method === 'Network.requestWillBeSent') {
      const p = d.params;
      if (!reqs.has(p.requestId)) reqs.set(p.requestId, { id: p.requestId, u: p.request.url, bytes: 0, sw: null, msFin: null, fromSW: false });
    } else if (d.method === 'Network.responseReceived') {
      const p = d.params, r = reqs.get(p.requestId);
      if (r) {
        r.u = p.response.url || r.u;
        // fix W19: respuesta servida por el SW (su target descarga aparte): contar dataReceived
        if (p.response.fromServiceWorker && (p.response.serviceWorkerResponseSource == null || p.response.serviceWorkerResponseSource === 'network' || p.response.serviceWorkerResponseSource === 'fallback-code')) {
          r.sw = 0; r.fromSW = true;
        }
      }
    } else if (d.method === 'Network.dataReceived') {
      const r = reqs.get(d.params.requestId);
      if (r && r.sw !== null) r.sw += d.params.dataLength || 0;
    } else if (d.method === 'Network.loadingFailed') {
      const r = reqs.get(d.params.requestId);
      if (r && r.msFin === null) { r.msFin = Date.now() - t0; r.fallo = d.params.errorText; r.cancelado = d.params.canceled; }
    } else if (d.method === 'Network.loadingFinished') {
      const r = reqs.get(d.params.requestId);
      if (r && r.msFin === null) {
        r.bytes = d.params.encodedDataLength || r.sw || 0;
        r.msFin = Date.now() - t0;
        bytesTotal += r.bytes;
      }
    } else if (d.method === 'Runtime.exceptionThrown') {
      res.excepciones = res.excepciones || [];
      const dd = d.params.exceptionDetails || {};
      res.excepciones.push(((dd.exception || {}).description || dd.text || '').slice(0, 400));
    } else if (d.method === 'Runtime.consoleAPICalled' && (d.params.type === 'error' || d.params.type === 'assert')) {
      res.consolaErr = res.consolaErr || [];
      res.consolaErr.push(d.params.args.map(a => String(a.value != null ? a.value : a.description || '')).join(' ').slice(0, 400));
    }
  };
  let t0 = Date.now();
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Network.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Network.setCacheDisabled', { cacheDisabled: true }, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: !ESCRITORIO }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
    if (!ESCRITORIO) await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
    if (!SIN_SEMILLA) await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
    t0 = Date.now();
    const url0 = origen + '/index.html?cap=1' + (CALIDAD ? '&calidad=' + CALIDAD : '') + (URL_EXTRA ? '&' + URL_EXTRA : '');
    await cdp.call('Page.navigate', { url: url0 }, ses);

    // Fase arranque: hasta reveal y luego red quieta (>=2 s sin peticiones nuevas/pendientes, tope ESPERA_RED_S tras reveal)
    let tReveal = null, motivoCarga = null, msCarga = null, ultimoTap = 0, nTaps = 0, tArranqueFin = null, ultimaRed = Date.now();
    const TAP_JS = `(() => {
      const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
        return r.width > 4 && r.height > 4 && s.visibility !== 'hidden' && s.display !== 'none'; };
      const btns = [...document.querySelectorAll('button, [role="button"], a')].filter(vis);
      const b = btns.find(x => /aventura|empezar la historia|jugar/i.test((x.textContent || '')));
      if (b) { b.click(); return 'tap:' + (b.textContent || '').trim().slice(0, 30); }
      try { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); } catch (e) {}
      return 'tecla'; })()`;
    const limite = Date.now() + (ESPERA_RED_S + 120) * 1000;
    while (Date.now() < limite) {
      await cdp.bombear(0.5);
      const ms = Date.now() - t0;
      const nReqs = reqs.size;
      let m = null;
      try { m = await ev(cdp, ses, MUESTRA_JS, 8, false); } catch (e) {}
      if (m) {
        m.s = Math.round(ms / 100) / 10;
        m.nReqs = nReqs;
        res.muestras.push(m);
        if (tReveal === null && m.revelado) { tReveal = ms; motivoCarga = m.motivo; msCarga = m.msCarga; }
        else if (tReveal === null && ms - ultimoTap > 6000 && nTaps < 12) {
          ultimoTap = ms; nTaps++;
          try { const r = await ev(cdp, ses, TAP_JS, 6, false); res.taps = res.taps || []; res.taps.push({ s: Math.round(ms / 100) / 10, r }); } catch (e) {}
        }
      }
      // red quieta: sin peticiones en los últimos 2 s y ninguna pendiente (todas con msFin)
      const algunaViva = [...reqs.values()].some(r => r.msFin === null);
      if (nReqs > 0 && !algunaViva && Date.now() - ultimaRed > 2000) {
        if (tReveal !== null && ms - Math.max(tReveal, ultimaRed) > 2000) { tArranqueFin = ms; break; }
        if (tReveal === null && Date.now() - t0 > 90000) { tArranqueFin = ms; break; }
      }
      if (nReqs > 0) ultimaRed = Date.now();
      if (tReveal !== null && ms - tReveal > ESPERA_RED_S * 1000) { tArranqueFin = ms; break; }
    }
    if (tArranqueFin === null) tArranqueFin = Date.now() - t0;
    try {
      const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 30000);
      fs.writeFileSync(path.join(SALIDA, `k3carga_${ETIQUETA}_final.jpg`), Buffer.from(shot.data, 'base64'));
    } catch (e) {}

    // Contabilidad avtest.py: fase arranque = reqs con msFin <= tArranqueFin; cada archivo (ruta sin query) cuenta una vez, el máximo
    const enArranque = [...reqs.values()].filter(r => r.msFin !== null && r.msFin <= tArranqueFin && r.u && !r.u.startsWith('data:') && !r.u.startsWith('blob:') && !r.u.startsWith('about:'));
    const porArchivo = {};
    for (const r of enArranque) {
      const rel = decodeURIComponent(r.u.replace(origen, '').split('?')[0]).replace(/^\//, '') || 'index.html';
      if (!porArchivo[rel] || r.bytes > porArchivo[rel]) porArchivo[rel] = r.bytes;
    }
    const porTipo = {}; let total = 0;
    for (const [rel, b] of Object.entries(porArchivo)) { const t = tipoDe(rel); porTipo[t] = (porTipo[t] || 0) + b; total += b; }
    for (const k in porTipo) porTipo[k] = Math.round(porTipo[k] / 1048576 * 100) / 100;
    res.red = {
      bytesTotalMB: Math.round(bytesTotal / 1048576 * 100) / 100,
      nPeticiones: enArranque.length,
      archivosN: Object.keys(porArchivo).length,
      mb: Math.round(total / 1048576 * 100) / 100,
      porTipo,
      tRevealMs: tReveal, motivoCarga, msCargaJuego: msCarga, tArranqueFinMs: tArranqueFin,
      swServidos: enArranque.filter(r => r.fromSW).length,
      fallos: [...reqs.values()].filter(r => r.fallo).map(r => ({ u: r.u.replace(origen, ''), fallo: r.fallo, cancelado: r.cancelado })).slice(0, 30),
      mayores: Object.entries(porArchivo).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => [k, Math.round(v / 1024)]),
    };
    const f = path.join(SALIDA, `k3carga_${ETIQUETA}.json`);
    fs.writeFileSync(f, JSON.stringify(res, null, 1));
    console.log(`[k3carga] HEAD ${head} · raiz ${RAIZ_SRV}`);
    console.log(`[k3carga] reveal ${tReveal === null ? 'NO' : (tReveal / 1000).toFixed(1) + ' s'} (${motivoCarga || '?'}${msCarga ? ' ' + msCarga + ' ms' : ''}) · arranque fin ${(tArranqueFin / 1000).toFixed(1)} s · SW sirvió ${res.red.swServidos} peticiones`);
    console.log(`[k3carga] CARGA INICIAL: ${res.red.mb} MB en ${res.red.archivosN} archivos ${JSON.stringify(porTipo)} (total peticiones ${res.red.bytesTotalMB} MB)`);
    console.log('[k3carga] mayores (KB):\n  ' + res.red.mayores.slice(0, 25).map(([k, v]) => `${v}\t${k}`).join('\n  '));
    console.log('[k3carga] JSON: ' + f);
  } finally {
    try { cdp.call('Browser.close', {}, undefined, 3000); } catch (e) {}
    await new Promise(r => setTimeout(r, 1200));
    try { spawn('taskkill', ['/PID', String(chromeL.chrome.pid), '/T', '/F'], { stdio: 'ignore' }); } catch (e) {}
    try { fs.rmSync(chromeL.perf, { recursive: true, force: true }); } catch (e) {}
    srv.close();
  }
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
