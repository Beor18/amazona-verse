#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-244: «edificios lejanos como ruinas al llegar» (carril streaming).
   Encargo 📣 nube/coordinadora 8-nov 03:15 UTC: medir con GPU real cuánto tarda la zona del spawn en pasar de
   `_lejos` a detallado tras la pantalla de carga, y la memoria antes/después, para proponer la mejora (precarga
   de la zona cercana antes del reveal o fundido de LOD) sin cambiar la vista final.

   Qué hace: partida sembrada cap1 (Villa Raíz) → portada → Aventura → reveal de la pantalla de carga; desde el
   reveal muestrea cada 300 ms los niveles de zona (0 = nada, 1 = `_lejos` fundido, 2 = modelo completo), las
   instancias colocadas, draw calls, triángulos, memoria del renderer y heap. Fases:
     1. QUIETO  (quieto-s, por defecto 12 s): el jugador no se mueve — el estado de «llegada» tal cual se ve.
     2. PASEO   (paseo-m, por defecto 66 m): caminata simulada en pasos de 2 m hacia la plaza (Iguaca):
        cuánto tarda cada anillo de distancia en pasar a detallado y cuántos «pops» hay (transiciones de nivel).
   Capturas en reveal / +2 s / fin quieto / mitad y fin del paseo (las «ruinas» se ven en las primeras).
   Salida: docs/img/kimi244/k244_<etiqueta>.json + capturas _*.jpg

   Uso: node tools/build/kimi3_244.js --etiqueta base-r1 [--escritorio] [--calidad bajo|medio|alto]
        [--quieto-s 12] [--paseo-m 66] [--sin-paseo] [--url-extra "v18=1"]
        [--url https://www.amazonaverse.com/juego/]  (sirve el sitio publicado en vez del worktree) */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ESCRITORIO = process.argv.includes('--escritorio');
const ANCHO = ESCRITORIO ? 1600 : 390, ALTO = ESCRITORIO ? 900 : 844, DPR = ESCRITORIO ? 1 : 3, CPU = ESCRITORIO ? 1 : 4;
const ETIQUETA = arg('--etiqueta', 'r1');
const CALIDAD = arg('--calidad', '');
const QUIETO_S = +arg('--quieto-s', '12');
const PASEO_M = +arg('--paseo-m', '66');
const SIN_PASEO = process.argv.includes('--sin-paseo');
const VUELO = +arg('--vuelo', '0');
const VUELO_S = +arg('--vuelo-s', '14');
const ANTES = arg('--antes', '');
const URL_EXTRA = arg('--url-extra', '');
const URLBASE = arg('--url', '').replace(/\/+$/, '');
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi244');
fs.mkdirSync(SALIDA, { recursive: true });
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  let streamingViejo = null;
  if (ANTES) {
    try { streamingViejo = execSync(`git show ${ANTES}:src/engine/streaming.js`, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); }
    catch (e) { console.error('FALLO git show ' + ANTES + ': ' + e.message); process.exit(1); }
  }
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    if (streamingViejo && p === '/src/engine/streaming.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store' });
      return res.end(streamingViejo);
    }
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

const UA = ESCRITORIO
  ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
  : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
// Misma semilla que kimi3_carga.js: jugador existente (Jugar entra directo, sin creador), spawn Villa Raíz
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

const REVELADO_JS = `(() => {
  const el = document.querySelector('#carga');
  return { existe: !!el, revelado: !!el && (el.hidden || el.classList.contains('carga-sale')),
    hecha: !!(AV.carga && AV.carga.hecha),
    motivo: (AV.carga && AV.carga.ultima && AV.carga.ultima.motivo) || null,
    msCarga: (AV.carga && AV.carga.ultima && AV.carga.ultima.ms) || null,
    zonaCarga: (AV.carga && AV.carga.ultima && AV.carga.ultima.zona) || null,
    listo: !!(window.AV && AV.G && AV.G.mundo && AV.G.mundo.listo) }; })()`;

const ZONAS_JS = `(() => {
  const out = { t: Math.round(performance.now()) };
  const G = window.AV && AV.G;
  if (!G || !G.mundo || !G.mundo.streaming) { out.sinStreaming = true; return out; }
  const ST = G.mundo.streaming;
  try { out.stats = ST.stats(); } catch (e) { out.e1 = String(e); }
  try { const st = G.renderer.stats(); out.calls = st.calls; out.ktris = st.triangulos != null ? Math.round(st.triangulos / 1000) : null; } catch (e) {}
  try { const m = G.renderer.info.memory; out.mem = { geo: m.geometries, tex: m.textures }; } catch (e) {}
  try { out.heap = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0; } catch (e) {}
  try { if (ST.transiciones) out.trans = ST.transiciones(); } catch (e) {}
  try { out.cfgLlegada = (ST.CFG && ST.CFG.llegada) || null; } catch (e) {}
  try { out.hdCiudadLimite = typeof ST.hdCiudadLimite === 'function' ? ST.hdCiudadLimite() : null; } catch (e) {}
  out.zonas = [];
  try {
    for (const Z of Object.values(ST.zonas)) {
      let col = 0; for (const I of Z.inst) if (I.colocado) col++;
      out.zonas.push({ id: Z.id, d: Math.round(Z.d), r: Math.round(Z.r), nivel: Z.nivel, mod: Z.modelos.length, col, inst: Z.inst.length, hd: !!Z.hd, ciu: !!Z.ciudad });
    }
  } catch (e) { out.e2 = String(e); }
  try { const S = G.S; out.pos = [Math.round(S.pos.x * 10) / 10, Math.round(S.pos.z * 10) / 10]; } catch (e) {}
  return out; })()`;

// caminata: pasos de 2 m hacia el objetivo desde la posición actual (streaming reacciona igual que caminando de verdad)
function PASO_JS(x, z) {
  return `(() => { const G = window.AV && AV.G, S = G && G.S;
    if (!S || !S.pos) return 'sin-S';
    const dx = ${x} - S.pos.x, dz = ${z} - S.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.5) return 'llegado';
    const paso = Math.min(2, d);
    S.pos.x += dx / d * paso; S.pos.z += dz / d * paso;
    return 'paso ' + Math.round(d - paso); })()`;
}

function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3k244-'));
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

(async () => {
  const srvP = URLBASE ? null : await servir();
  const origen = URLBASE || `http://127.0.0.1:${srvP.puerto}`;
  const head = execSync('git rev-parse --short HEAD', { cwd: RAIZ, encoding: 'utf8' }).trim();
  const res = { etiqueta: ETIQUETA, tarea: 'KIMI-244 ruinas al llegar', herramienta: 'kimi3_244.js', head,
    url: URLBASE || 'worktree-local',
    pantalla: ESCRITORIO ? 'escritorio 1600x900@1 cpuX1' : 'movil 390x844@3 cpuX4',
    calidadForzada: CALIDAD || null, inicio: new Date().toISOString(), fases: { quieto: [], paseo: [], vuelo: [] }, capturas: [], consolaErr: [],
    vueloM: VUELO, streamingServido: ANTES || 'HEAD' };
  const chromeL = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${chromeL.puerto}${chromeL.wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  cdp.onEvent = d => {
    if (d.method === 'Runtime.consoleAPICalled' && (d.params.type === 'error' || d.params.type === 'assert'))
      res.consolaErr.push(d.params.args.map(a => String(a.value != null ? a.value : a.description || '')).join(' ').slice(0, 300));
    else if (d.method === 'Runtime.exceptionThrown') {
      const dd = d.params.exceptionDetails || {};
      res.consolaErr.push('EXC ' + ((dd.exception || {}).description || dd.text || '').slice(0, 300));
    }
  };
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: !ESCRITORIO }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
    if (!ESCRITORIO) await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
    await cdp.call('Page.navigate', { url: origen + '/index.html?cap=1' + (CALIDAD ? '&calidad=' + CALIDAD : '') + (URL_EXTRA ? '&' + URL_EXTRA : '') }, ses);

    // Hasta el reveal (tope 90 s), con taps por si la portada pide confirmación
    const TAP_JS = `(() => {
      const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
        return r.width > 4 && r.height > 4 && s.visibility !== 'hidden' && s.display !== 'none'; };
      const btns = [...document.querySelectorAll('button, [role="button"], a')].filter(vis);
      const b = btns.find(x => /aventura|empezar la historia|jugar/i.test((x.textContent || '')));
      if (b) { b.click(); return 'tap:' + (b.textContent || '').trim().slice(0, 30); }
      try { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); } catch (e) {}
      return 'tecla'; })()`;
    let revelado = null, ultimoTap = 0, nTaps = 0;
    const tNav = Date.now();
    while (Date.now() - tNav < 90000) {
      await cdp.bombear(0.5);
      let m = null; try { m = await ev(cdp, ses, REVELADO_JS, 8, false); } catch (e) {}
      if (m && (m.revelado || m.hecha)) { revelado = m; break; }
      if (Date.now() - tNav - ultimoTap > 6000 && nTaps < 12) { ultimoTap = Date.now() - tNav; nTaps++; try { await ev(cdp, ses, TAP_JS, 6, false); } catch (e) {} }
    }
    if (!revelado) throw new Error('no hubo reveal en 90 s');
    res.reveal = revelado;
    const tReveal = Date.now();
    const shot = async nombre => {
      try { const s = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 30000);
        fs.writeFileSync(path.join(SALIDA, `k244_${ETIQUETA}_${nombre}.jpg`), Buffer.from(s.data, 'base64'));
        res.capturas.push(nombre + '@' + Math.round((Date.now() - tReveal) / 100) / 10 + 's');
      } catch (e) {}
    };
    await shot('reveal');
    const muestra = async fase => {
      let m = null; try { m = await ev(cdp, ses, ZONAS_JS, 10, false); } catch (e) {}
      if (m) { m.s = Math.round((Date.now() - tReveal) / 100) / 10; res.fases[fase].push(m); }
      return m;
    };
    await cdp.bombear(2); await shot('reveal+2s');

    // 1. QUIETO: sin mover al jugador, lo que se ve «al llegar»
    const tQ = Date.now();
    while (Date.now() - tQ < QUIETO_S * 1000) { await muestra('quieto'); await cdp.bombear(0.3); }
    await shot('fin-quieto');

    // 2. VUELO (opcional): alzar al jugador en el spawn y mirar el anillo de llegada desde el aire
    if (VUELO > 0) {
      const VUELA_JS = `(() => {
        const AV = window.AV, G = AV.G, S = G.S, ST = (G.mundo && G.mundo.streaming) || (G.streaming && G.streaming.gestor);
        if (!ST) return 'sin streaming';
        S.pos.y += ${VUELO}; S.vy = 0; G.fisica.MOVE.flying = true;
        ST.alrededor(S.pos.x, S.pos.z);
        return 'volando y=' + Math.round(S.pos.y * 10) / 10; })()`;
      console.log('[k244] vuelo: ' + await ev(cdp, ses, VUELA_JS, 10, false));
      const tV = Date.now();
      await cdp.bombear(2.5); await shot('vuelo-temprano');
      while (Date.now() - tV < VUELO_S * 1000) { await muestra('vuelo'); await cdp.bombear(0.5); }
      await shot('vuelo-asentado');
      const BAJA_JS = `(() => { const AV = window.AV, G = AV.G, S = G.S;
        S.pos.y = Math.max(2, S.pos.y - ${VUELO}); G.fisica.MOVE.flying = false; G.fisica.MOVE.landing = true;
        return 'bajando'; })()`;
      await ev(cdp, ses, BAJA_JS, 8, false);
    }

    // 3. PASEO: 2 m por paso hacia la plaza (Iguaca, ~66 m)
    if (!SIN_PASEO && !VUELO) {
      const DEST = { x: 181, z: 136 };
      let total = 0, pasos = 0;
      const tP = Date.now();
      while (total < PASEO_M && Date.now() - tP < 120000) {
        const r = await ev(cdp, ses, PASO_JS(DEST.x, DEST.z), 6, false);
        if (r === 'llegado' || r === 'sin-S') break;
        pasos++; total += 2;
        await muestra('paseo');
        if (pasos % 8 === 0) await shot('paseo-' + pasos * 2 + 'm');
        await cdp.bombear(0.25);
      }
      res.paseo = { destino: DEST, pasos, totalM: total };
      await shot('fin-paseo');
      await cdp.bombear(2.5); // asentar
      await muestra('paseo');
      await shot('asentado');
    }

    // Resumen por anillos de distancia al spawn (distancias del reveal; el anillo 0-90 es el de «llegada»)
    const anillos = (muestras, ref) => {
      const an = [{ n: '0-60', lo: 0, hi: 60 }, { n: '60-120', lo: 60, hi: 120 }, { n: '120-250', lo: 120, hi: 250 }, { n: '250-450', lo: 250, hi: 450 }, { n: '450+', lo: 450, hi: 1e9 }];
      for (const a of an) { a.det = 0; a.lejos = 0; a.nada = 0; a.porVer = null; }
      if (!ref || !ref.zonas) return an;
      for (const Z of ref.zonas) {
        const a = an.find(a => Z.d >= a.lo && Z.d < a.hi);
        if (!a) continue;
        if (Z.nivel === 2) a.det++; else if (Z.nivel === 1) a.lejos++; else a.nada++;
      }
      return an;
    };
    const f0 = res.fases.quieto[0], fN = res.fases.quieto[res.fases.quieto.length - 1];
    const fV0 = res.fases.vuelo[0], fVN = res.fases.vuelo[res.fases.vuelo.length - 1];
    res.resumen = {
      anillosReveal: anillos(null, f0),
      anillosFinQuieto: anillos(null, fN),
      anillosVuelo: fV0 ? anillos(null, fVN || fV0) : null,
      statsReveal: f0 && f0.stats, statsFinQuieto: fN && fN.stats,
      statsVueloTemprano: fV0 && fV0.stats, statsVueloAsentado: fVN && fVN.stats,
      statsAsentado: res.fases.paseo.length ? res.fases.paseo[res.fases.paseo.length - 1].stats : null,
      zonasReveal: f0 && f0.zonas ? f0.zonas.length : 0,
    };
    const f = path.join(SALIDA, `k244_${ETIQUETA}.json`);
    fs.writeFileSync(f, JSON.stringify(res, null, 1));
    console.log(`[k244] HEAD ${head} · ${res.pantalla}${CALIDAD ? ' (calidad ' + CALIDAD + ')' : ''}`);
    console.log(`[k244] reveal a los ${Math.round((tReveal - tNav) / 100) / 10} s de navegar (${revelado.motivo}, ${revelado.msCarga} ms; zona ${JSON.stringify(revelado.zonaCarga)})`);
    console.log('[k244] anillos al reveal:   ' + JSON.stringify(res.resumen.anillosReveal));
    console.log('[k244] anillos fin quieto:  ' + JSON.stringify(res.resumen.anillosFinQuieto));
    if (res.resumen.anillosVuelo) console.log('[k244] anillos vuelo:       ' + JSON.stringify(res.resumen.anillosVuelo));
    if (res.resumen.statsVueloAsentado) console.log('[k244] stats vuelo asentado: ' + JSON.stringify(res.resumen.statsVueloAsentado));
    if (res.resumen.statsReveal) console.log('[k244] stats reveal: ' + JSON.stringify(res.resumen.statsReveal));
    if (res.resumen.statsAsentado) console.log('[k244] stats asentado: ' + JSON.stringify(res.resumen.statsAsentado));
    console.log('[k244] errores consola: ' + res.consolaErr.length);
    console.log('[k244] JSON: ' + f);
  } finally {
    try { cdp.call('Browser.close', {}, undefined, 3000); } catch (e) {}
    await new Promise(r => setTimeout(r, 1200));
    try { spawn('taskkill', ['/PID', String(chromeL.chrome.pid), '/T', '/F'], { stdio: 'ignore' }); } catch (e) {}
    try { fs.rmSync(chromeL.perf, { recursive: true, force: true }); } catch (e) {}
    if (srvP) srvP.srv.close();
  }
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
