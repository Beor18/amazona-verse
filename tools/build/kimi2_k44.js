#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-044 (0t): «no veo nadie vivo» en la Ciudad de los 36.
   La nube subio la poblacion (cotorras 12/16/20, vecinos 4/8/12, 10fedb64) pero en SwiftShader «bajo»
   ciudadViva.perchas() ve 0-1 tejados y ciudadVivaTest falla «Hay edificios con sólido…» (0 sólidos):
   en la nube el streaming tarda minutos y los sólidos no llegan. Esta herramienta lo verifica con
   GPU real + perfil iPhone (390x844 dpr 3, CPU x4, «bajo» natural por UA):
     (1) ¿se registran los sólidos de los edificios de la ciudad (G.solidos.altoEn) tras QA-158?
     (2) ¿hay tejados y balcones donde posarse (perchas)?
     (3) memoria y FPS con 12 cotorras + 4 vecinos (A/B con G.quiet), contadores webglcontextlost;
     capturas desde la plaza y desde el aire para Kelvin. Al final, ciudadVivaTest({espera}) como
     prueba de regresión canónica.
   Salida: docs/img/kimi044/k44-<etiqueta>.json + capturas *_plaza.jpg / *_aire.jpg / *_villa.jpg
   Uso: node tools/build/kimi2_k44.js [--etiqueta r1] [--dur 12] [--espera 120] [--sin-test] */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi044');
fs.mkdirSync(SALIDA, { recursive: true });
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ETIQUETA = arg('--etiqueta', 'r1');
const CPU = parseFloat(arg('--cpu', '4'));
const DUR = parseFloat(arg('--dur', '12'));
const ESPERA = parseInt(arg('--espera', '120'), 10);
const SIN_TEST = process.argv.includes('--sin-test');
let PERFIL = null, CHROME_PID = null;
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ANCHO = 390, ALTO = 844, DPR = 3;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
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
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error de conexión'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message + ' ' + JSON.stringify(d.error.data || ''))) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(method, params, sessionId, timeoutMs) {
    const id = ++this.id;
    return new Promise((re, re2) => {
      this.pend.set(id, { re, re2 });
      this.ws.send(JSON.stringify({ id, method, params: params || {}, sessionId }));
      if (timeoutMs) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + method)); } }, timeoutMs);
    });
  }
  async bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function evaluar(cdp, ses, exp, timeoutS, promesa) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: promesa !== false, returnByValue: true }, ses, (timeoutS || 30) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.exception && r.exceptionDetails.exception.value || r.exceptionDetails.text).slice(0, 500));
  return r.result ? r.result.value : undefined;
}

async function lanzarChrome() {
  PERFIL = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2k44-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + PERFIL,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', '--window-size=500,900'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  CHROME_PID = chrome.pid;
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(PERFIL, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools en 60 s: ' + err.slice(0, 300));
}
function matarChrome() {
  if (!CHROME_PID) return;
  try { execSync(`taskkill /PID ${CHROME_PID} /T /F 2>NUL`, { stdio: 'ignore' }); } catch (e) { /* ya muerto */ }
  CHROME_PID = null;
}

// partida sembrada de cap1 (step 1: Jugar entra directo, sin intro ni creador) — misma semilla que kimi2_qa158.js
const SEMILLA_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi2-k44-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 1,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: true, B: true }, examined: { maquina: true, transmisor: true }
  }));
} catch (e) {}`;
const GANCHOS_JS = `try {
  window.__k44 = { errores: [], ctxPerdidas: 0, ctxRestauradas: 0 };
  window.addEventListener('error', e => { __k44.errores.push(String(e.message).slice(0, 200)); }, true);
  window.addEventListener('unhandledrejection', e => { __k44.errores.push('rechazo: ' + String(e.reason && e.reason.message || e.reason).slice(0, 200)); }, true);
  window.addEventListener('webglcontextlost', () => { __k44.ctxPerdidas++; }, true);
  window.addEventListener('webglcontextrestored', () => { __k44.ctxRestauradas++; }, true);
} catch (e) {}`;
// Sonda de cuadros (rAF dt)
const SONDA_JS = `(() => { const Q = window.__qaM = { dt: [], top: [] }; let t = 0, t0 = 0;
  const f = n => { if (!t0) t0 = n; if (t) { const d = n - t; Q.dt.push(d); const e = { d: Math.round(d), t: Math.round((t - t0) / 100) / 10 };
    const i = Q.top.findIndex(x => x.d < e.d); if (i >= 0) Q.top.splice(i, 0, e); else if (Q.top.length < 6) Q.top.push(e); if (Q.top.length > 6) Q.top.pop(); } t = n;
    if (Q.dt.length > 40000) Q.dt.splice(0, 20000); requestAnimationFrame(f); }; requestAnimationFrame(f); })();`;

// Checks (1) y (2): sólidos de los edificios de la ciudad + perchas, en «bajo» natural
const CHECKS_JS = `(async () => {
  const AV = window.AV, G = AV.G, S = G.S;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const CV = G.ciudadViva, V = G.vecinos, SO = G.solidos;
  const H = (x, z) => G.terreno.height(x, z);
  // poblar la ciudad viva ya (forzado) para que sitio/perchas/aves existan aunque el paso natural aun no haya corrido
  CV.paso(0.05, true);
  const s = CV.sitio();
  const P = CV.perchas();
  const conSolido = s && SO && SO.activo ? s.ins.filter(i => SO.altoEn(i.pos[0], i.pos[2], 1e4) > H(i.pos[0], i.pos[2]) + 0.3).length : 0;
  const tejados = P.alto.filter(p => p.tipo === 'tejado').length, balcones = P.alto.filter(p => p.tipo === 'balcon').length,
    copas = P.alto.filter(p => p.tipo === 'copa').length;
  // ¿de dónde salen las perchas altas? (sólidos reales = tejado/balcon; sin sólidos = bandada de copas)
  const ve = V && V.estado ? V.estado() : null;
  const st = (() => { try { return G.renderer.stats() || {}; } catch (e) { return {}; } })();
  const inf = (() => { try { const i = G.renderer.renderer.info; return { geo: i.memory.geometries, tex: i.memory.textures, prog: i.programs.length }; } catch (e) { return {}; } })();
  return JSON.stringify({
    calidad: st.calidad || null, dpr: window.devicePixelRatio,
    solidos: { activo: !!(SO && SO.activo), version: SO ? SO.version : null },
    sitio: s ? { x: Math.round(s.x), z: Math.round(s.z), r: Math.round(s.r), ins: s.ins.length } : null,
    conSolido: conSolido + '/' + (s ? s.ins.length : 0),
    perchas: { alto: P.alto.length, tejados, balcones, copas, suelo: P.suelo.length, farol: P.farol.length },
    aves: CV.aves().length, vecinos: ve,
    heapMB: Math.round(performance.memory.usedJSHeapSize / 1048576),
    texMB: (() => { try { const lk = AV.look.medir(); return Math.round(lk.texturasMB * 10) / 10; } catch (e) { return null; } })(),
    ...inf }); })()`;

// Toma de DUR s: FPS p50/p95/peor + stats + estado de los dos sistemas
const TOMA_JS = dur => `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)); const Q = window.__qaM;
  Q.dt = []; Q.top = [];
  await sleep(${Math.round(dur * 1000)});
  const d = Q.dt.slice().sort((a, b) => a - b), n = d.length;
  const q = p => n ? Math.round(d[Math.min(n - 1, Math.floor(n * p))]) : 0;
  let st = {}; try { st = AV.G.renderer.stats() || {}; } catch (e) {}
  let lk = {}; try { lk = AV.look.medir() || {}; } catch (e) {}
  let cv = null; try { cv = { aves: AV.G.ciudadViva.aves().length, pasos: AV.G.ciudadViva.stats() }; } catch (e) {}
  let ve = null; try { ve = AV.G.vecinos && AV.G.vecinos.estado ? AV.G.vecinos.estado() : null; } catch (e) {}
  const pos = AV.G.S.pos;
  return JSON.stringify({ n, p50: q(0.5), p95: q(0.95), peor: n ? Math.round(d[n - 1]) : 0,
    fps: st.fps != null ? Math.round(st.fps * 10) / 10 : null, calls: st.calls != null ? st.calls : null,
    tris: st.triangulos != null ? Math.round(st.triangulos) : null,
    heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
    texMB: lk.texturasMB != null ? Math.round(lk.texturasMB * 10) / 10 : null, calidad: st.calidad || null,
    ciudadViva: cv, vecinos: ve, ctxPerdidas: window.__k44.ctxPerdidas,
    pos: [Math.round(pos.x), Math.round(pos.y), Math.round(pos.z)], top: (Q.top || []).slice(0, 4) }); })()`;

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  let lanzado = null;
  for (let i = 0; i < 3 && !lanzado; i++) {
    try { lanzado = await lanzarChrome(); }
    catch (e) { console.log('· lanzamiento ' + (i + 1) + ' falló: ' + e.message.slice(0, 160)); await new Promise(r => setTimeout(r, 1500)); }
  }
  if (!lanzado) { console.log('· Chrome no arrancó en 3 intentos'); process.exit(1); }
  const { chrome, puerto: puertoDev, wsPath } = lanzado;
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws);
  await cdp.listo();
  console.log(`· servidor ${origen} · Chrome headless GPU real · iPhone ${ANCHO}x${ALTO} dpr ${DPR} · CPU x${CPU} · tomas de ${DUR} s`);

  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
  await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
  await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
  await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS + GANCHOS_JS + SONDA_JS }, ses);

  await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1&mapa=real` }, ses);
  // Entrada: Jugar directo con la partida sembrada
  const t0 = Date.now(); let listo = false;
  while (Date.now() - t0 < 150 * 1000) {
    try { if (await evaluar(cdp, ses, `!!(window.AV && AV.G && AV.G.actores && (AV.G.actores.player3D || AV.G.actores.failed3D))`, 10, false)) { listo = true; break; } } catch (e) { /* aún no */ }
    await cdp.bombear(0.5);
  }
  if (!listo) { console.log('· el juego no arrancó'); matarChrome(); process.exit(1); }
  await cdp.bombear(2.0);
  console.log('· entrada: ' + await evaluar(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
    const t = $('title'); if (!t || !t.open) return 'no hay portada'; const b = t.querySelector('form[method=dialog] button'); if (!b) return 'sin botón Jugar';
    b.click(); await sleep(2500); const C = window.AV && AV.cargaEsperar ? await AV.cargaEsperar(60000) : null;
    return 'ok' + (C ? ' (carga ' + C.ms + ' ms)' : ''); })()`, 120));

  // Módulos a demanda: el gesto sintético dispara alPrimerGesto (pointerdown/keydown) y carga vecinos + ciudad viva
  console.log('· módulos: ' + await evaluar(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms));
    dispatchEvent(new PointerEvent('pointerdown')); for (let i = 0; i < 60; i++) { await sleep(500); if (AV.G.vecinos && AV.G.ciudadViva) break; }
    return JSON.stringify({ vecinos: !!AV.G.vecinos, ciudadViva: !!AV.G.ciudadViva, calidad: AV.G.renderer.calidad.nivel }); })()`, 60));

  const resultados = { checks: null, tomas: [], prueba: null, errores: null };
  async function estable() {
    let a = null;
    for (let i = 0; i < 40; i++) {
      await cdp.bombear(1.0);
      let s = null;
      try { s = JSON.parse(await evaluar(cdp, ses, `(() => { const st = AV.G.renderer.stats(); return JSON.stringify({ calls: st.calls, fps: st.fps }); })()`, 20, false)); } catch (e) { continue; }
      if (a && Math.abs(s.calls - a.calls) <= 2 && s.fps > 0) return true;
      a = s;
    }
    return false;
  }
  async function irA(x, z, yaw) {
    await evaluar(cdp, ses, `(AV.teleport(${x}, ${z}), AV.debug.camYaw(${yaw}), (AV.G.mundo.streaming && AV.G.mundo.streaming.alrededor(${x}, ${z}).catch(() => {})), 'ok')`, 60, false);
    await evaluar(cdp, ses, `(AV.G.solidos && AV.G.solidos.terminar && AV.G.solidos.terminar(), 'ok')`, 60, false);
    await cdp.bombear(2.0);
    await estable();
    return evaluar(cdp, ses, `JSON.stringify({ x: Math.round(AV.G.S.pos.x), z: Math.round(AV.G.S.pos.z) })`, 20, false);
  }
  async function captura(nombre) {
    const r = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 30000);
    fs.writeFileSync(path.join(SALIDA, nombre), Buffer.from(r.data, 'base64'));
    console.log('  · captura ' + nombre);
  }
  async function toma(nombre) {
    for (let intento = 0; intento < 2; intento++) {
      try {
        const j = JSON.parse(await evaluar(cdp, ses, TOMA_JS(DUR), DUR + 60));
        j.escena = nombre; resultados.tomas.push(j);
        console.log(`  · ${nombre}: p50 ${j.p50} p95 ${j.p95} peor ${j.peor} ms · ${j.fps} FPS · ${j.calls} calls · ${Math.round((j.tris || 0) / 1000)} k tris · heap ${j.heapMB} MB · tex ${j.texMB} MB · aves ${j.ciudadViva ? j.ciudadViva.aves : '-'} · vec ${j.vecinos ? j.vecinos.n + (j.vecinos.visible ? ' vis' : ' oculto') : '-'} · ctxLost ${j.ctxPerdidas}`);
        return j;
      } catch (e) { console.log(`  · ${nombre}: intento ${intento + 1} falló: ${e.message.slice(0, 140)}`); await cdp.bombear(3); }
    }
    return null;
  }

  // --- A la Ciudad de los 36, que asiente el streaming, y checks (1) y (2) en «bajo» natural ---
  const quedo = await irA(12, -114.8, 0.785);
  console.log('· ancla ciudad (pos real ' + quedo + ')');
  resultados.checks = JSON.parse(await evaluar(cdp, ses, CHECKS_JS, 60));
  const c = resultados.checks;
  console.log(`· checks [${c.calidad}]: sólidos activo=${c.solidos.activo} v${c.solidos.version} · conSólido ${c.conSolido} · perchas: ${c.perchas.alto} altas (${c.perchas.tejados} tejados, ${c.perchas.balcones} balcones, ${c.perchas.copas} copas) + ${c.perchas.suelo} suelo · aves ${c.aves} · vecinos ${c.vecinos ? c.vecinos.n + (c.vecinos.visible ? ' visibles' : ' ocultos (lejos)') : '-'} · heap ${c.heapMB} MB · tex ${c.texMB} MB`);
  fs.writeFileSync(path.join(SALIDA, `k44-${ETIQUETA}-checks.json`), JSON.stringify(c, null, 2));

  // --- (3) medidas: plaza (día) y aire, A/B con quiet ---
  console.log('· plaza: ON');
  const on1 = await toma('plaza ON-a');
  await captura(`k44-${ETIQUETA}_plaza.jpg`);
  await evaluar(cdp, ses, `(AV.G.quiet = true, 'ok')`, 20, false);
  await estable();
  await toma('plaza SIN (quiet)');
  await evaluar(cdp, ses, `(AV.G.quiet = false, 'ok')`, 20, false);
  await estable();

  // Aire: vuelo a +26 m sobre el centro de la ciudad, cámara picada (la misma vista de Kelvin: «desde el aire»)
  console.log('· aire: centro ciudad a +26 m');
  await evaluar(cdp, ses, `(() => { const G = AV.G, S = G.S;
    G.fisica.MOVE.flying = true; S.vy = 0;
    S.pos.x = -33; S.pos.z = -136; S.pos.y = AV.debug.height(-33, -136) + 26;
    G.camara.inclina = -6; AV.debug.camYaw(0.8);
    if (G.mundo.streaming && G.mundo.streaming.alrededor) G.mundo.streaming.alrededor(-33, -136).catch(() => {});
    return JSON.stringify({ y: Math.round(S.pos.y) }); })()`, 30, false);
  await evaluar(cdp, ses, `(AV.G.solidos && AV.G.solidos.terminar && AV.G.solidos.terminar(), 'ok')`, 60, false);
  await estable();
  const aireOn = await toma('aire ON');
  await captura(`k44-${ETIQUETA}_aire.jpg`);
  await evaluar(cdp, ses, `(AV.G.quiet = true, 'ok')`, 20, false);
  await estable();
  await toma('aire SIN (quiet)');
  await evaluar(cdp, ses, `(AV.G.quiet = false, 'ok')`, 20, false);

  // Villa Raíz (vecinos): dejar de volar y volver a tierra
  console.log('· villa (vecinos): ' + await irA(125, 140, 0.69));
  await evaluar(cdp, ses, `(() => { const G = AV.G; G.camara.inclina = 0; if (G.fisica.MOVE.flying) { G.fisica.MOVE.flying = false; } return 'ok'; })()`, 20, false);
  await cdp.bombear(1.0);
  const villaOn = await toma('villa ON');
  await captura(`k44-${ETIQUETA}_villa.jpg`);
  await evaluar(cdp, ses, `(AV.G.quiet = true, 'ok')`, 20, false);
  await estable();
  await toma('villa SIN (quiet)');
  await evaluar(cdp, ses, `(AV.G.quiet = false, 'ok')`, 20, false);

  resultados.errores = JSON.parse(await evaluar(cdp, ses, 'JSON.stringify({ errores: (window.__k44.errores || []).slice(0, 10), ctxPerdidas: __k44.ctxPerdidas, ctxRestauradas: __k44.ctxRestauradas })', 10, false));

  // --- Prueba canónica de regresión (la que fallaba en la nube) ---
  if (!SIN_TEST) {
    console.log(`· ciudadVivaTest({ espera: ${ESPERA} })…`);
    try {
      const r = JSON.parse(await evaluar(cdp, ses, `(async () => { const r = await AV.ciudadVivaTest({ espera: ${ESPERA} }); return JSON.stringify({ passed: r.passed, total: r.total, fallos: r.results.filter(x => !x.ok).map(x => x.name + ' :: ' + String(x.extra).slice(0, 220)) }); })()`, 900));
      resultados.prueba = r;
      console.log(`  · ciudadVivaTest ${r.passed}/${r.total}` + (r.fallos.length ? ' · FALLOS: ' + r.fallos.join(' | ') : ''));
    } catch (e) { resultados.prueba = { error: e.message.slice(0, 300) }; console.log('  · ciudadVivaTest falló la corrida: ' + e.message.slice(0, 200)); }
  }

  console.log('· errores de consola: ' + JSON.stringify(resultados.errores));
  const out = { movil: { ancho: ANCHO, alto: ALTO, dpr: DPR, cpu: CPU, gpu: 'real (RX 5700 XT)', calidad: 'bajo natural (UA iPhone)' }, ...resultados };
  fs.writeFileSync(path.join(SALIDA, `k44-${ETIQUETA}.json`), JSON.stringify(out, null, 2));
  console.log('· resultado en ' + path.join(SALIDA, `k44-${ETIQUETA}.json`));
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { matarChrome(); }
  srv.close();
  process.exit(0);
})().catch(e => { console.error('FALLO:', e && e.stack || JSON.stringify(e) || String(e)); matarChrome(); process.exit(2); });
