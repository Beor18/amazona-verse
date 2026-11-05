#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-067: medir 12/16/20 cotorras volando en la
   Ciudad de los 36 en «bajo», «medio» y «alto» (cola 1a). Las cotorras horneadas y las
   bandadas ya están integradas (KIMI-056, 2d305cd2): aquí solo se mide.
   Entrada sembrada sin creador (misma semilla que kimi2_k056), perfil iPhone 390×844 dpr 3,
   CPU ×4, GPU real; sin ?qa=1 (qa.js arrancaría la batería completa sola y contaminaría el
   FPS — KIMI-052). Por calidad: setCalidad(nivel, manual) para que el adaptativo no conmute
   a mitad de la ventana, se fuerza/espera una bandada volando y se muestrea
   renderer.stats() 40×/500 ms (20 s): FPS med/p10/min, calls, tris, aves en el aire,
   heap JS y renderer.info.memory; captura por calidad.
   Al final corre AV.ciudadVivaTest() como regresión y vuelca __errs.
   Uso: node tools/build/kimi2_k067.js [--ancho N] [--alto N] [--dpr N] [--cpu N] [--etiqueta X]
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
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi067');
fs.mkdirSync(SALIDA, { recursive: true });
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ANCHO = +arg('--ancho', 390), ALTO = +arg('--alto', 844), DPR = +arg('--dpr', 3), CPUX = +arg('--cpu', 4);
const ETIQ = arg('--etiqueta', 'r1');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
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
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; }
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
async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2k67-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', '--window-size=800,900'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools en 60 s: ' + err.slice(0, 300));
}

const SEMILLA_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  window.__errs = []; window.addEventListener('error', e => __errs.push(String(e.message || e.error).slice(0, 200)));
  window.addEventListener('unhandledrejection', e => __errs.push('rechazo: ' + String(e.reason && e.reason.message || e.reason).slice(0, 200)));
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-k067-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;
const PREPARAR_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(200); } try { return !!f(); } catch (e) { return false; } };
  const listo = () => !!(window.AV && AV.state && AV.state.profile && AV.state.profile.created);
  const t0 = performance.now();
  while (performance.now() - t0 < 240000) {
    if (listo()) break;
    const t = $('title');
    if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (b) b.click(); }
    else { const cr = $('creator'); if (cr && !cr.hidden) { const s = $('p-save'); if (s) s.click(); } }
    await sleep(1000);
  }
  if (!listo()) return 'sin perfil creado tras esperar 240 s';
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(60000);
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 30000);
  return 'ok'; })()`;

// Ventana de medición por calidad. Devuelve JSON con FPS med/p10/min, calls, tris, aves en el
// aire, bandada, heap y memoria del renderer. La bandada se espera 45 s en tiempo real y, si no
// sale, se fuerza con pasos simulados (luego vive y se mueve en tiempo real, como en k056).
const VENTANA_JS = cal => `(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const G = AV.G, CV = G.ciudadViva, Rd = G.renderer;
  if (!CV) return JSON.stringify({ error: 'sin G.ciudadViva' });
  const cal = '${cal}';
  Rd.setCalidad(cal, true);
  await sleep(4000); // ajuste de población por calidad
  await sleep(12000); // asentado tras el flip: el evento calidad re-enlaza/re-sube (QA-53) y contamina las primeras muestras
  const st0 = Rd.stats();
  if (Rd.calidad.nivel !== cal) return JSON.stringify({ error: 'calidad no aplicada: ' + Rd.calidad.nivel });
  for (let i = 0; i < 30 && Rd.stats().calls <= 30; i++) await sleep(500);
  CV.hora(12); // de día: la bandada vuela (de noche se dispersa a dormir)
  let hay = CV.aves().some(a => a.bando), forzada = false;
  const t0 = performance.now();
  while (!hay && performance.now() - t0 < 45000) { if (CV.aves().some(a => a.bando)) { hay = true; break; } await sleep(400); }
  if (!hay) {
    forzada = true;
    CV.prueba(true); CV.pausa(true);
    for (let i = 0; i < 6000 && !hay; i++) { CV.paso(0.05, 'todo'); if (CV.aves().some(a => a.bando)) hay = true; }
    CV.pausa(false);
  }
  if (!CV.aves().some(a => a.bando)) return JSON.stringify({ error: 'sin bandada tras espera+force', cal });
  const fps = [], calls = [], tris = [], aire = [], bando = [];
  for (let i = 0; i < 40; i++) {
    const st = Rd.stats(), av = CV.aves();
    fps.push(st.fps); calls.push(st.calls); tris.push(st.triangulos);
    aire.push(av.filter(a => a.est !== 'posada').length);
    bando.push(av.filter(a => a.bando).length);
    await sleep(500);
  }
  const stF = Rd.stats();
  const ord = [...fps].sort((a, b) => a - b);
  const pct = p => ord[Math.max(0, Math.min(ord.length - 1, Math.floor(p * ord.length)))];
  const mem = (() => { try { const r = Rd.renderer || Rd; return { geo: r.info.memory.geometries, tex: r.info.memory.textures }; } catch (e) { return null; } })();
  return JSON.stringify({
    cal, n: CV.aves().length, forzada, dpr: stF.dpr, sombras: stF.sombras, post: stF.post,
    fpsMed: pct(0.5), fpsP10: pct(0.1), fpsMin: ord[0],
    aireMed: +(aire.reduce((a, b) => a + b, 0) / aire.length).toFixed(1),
    bandoMed: +(bando.reduce((a, b) => a + b, 0) / bando.length).toFixed(1),
    callsFin: stF.calls, trisFin: Math.round(stF.triangulos / 1000),
    heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
    mem, fpsRaw: fps
  }); })()`;

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const l = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${l.puerto}${l.wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const fin = codigo => { try { spawnSync('taskkill', ['/PID', String(l.chrome.pid), '/T', '/F'], { stdio: 'ignore' }); } catch (e) {} try { fs.rmSync(l.perf, { recursive: true, force: true }); } catch (e) {} srv.close(); process.exit(codigo); };
  const resultado = { etiqueta: ETIQ, perfil: { ancho: ANCHO, alto: ALTO, dpr: DPR, cpu: CPUX }, ventanas: {}, ciudadVivaTest: null, errs: null };
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPUX }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS }, ses);
    // sin ?qa=1: qa.js auto-correría la batería entera y contaminaría el FPS (KIMI-052)
    await cdp.call('Page.navigate', { url: `${origen}/index.html?calidad=bajo` }, ses, 30000);
    console.log('entrada: ' + await evaluar(cdp, ses, PREPARAR_JS, 260));
    console.log(`perfil: ${ANCHO}x${ALTO} dpr ${DPR} cpu x${CPUX} (iPhone emulado, GPU real)`);
    // ciudad viva cargada + sólidos + ancla buena (fuera de la redirección de teleport, KIMI-013/044)
    const prep = JSON.parse(await evaluar(cdp, ses, `(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const G = AV.G;
      if (!G.ciudadViva) {
        try { window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true })); } catch (e) {}
        const tg = performance.now();
        while (performance.now() - tg < 90000) { if (G.ciudadViva) break; await sleep(400); }
      }
      const CV = G.ciudadViva;
      if (!CV) return JSON.stringify({ error: 'sin G.ciudadViva' });
      const T = G.pruebas, s = CV.sitio();
      if (!s) return JSON.stringify({ error: 'sin sitio' });
      T.teleport(12, -114.8); T.tick(0.1);
      if (Math.hypot(G.S.pos.x - 12, G.S.pos.z + 114.8) > 8) { G.S.pos.x = 12; G.S.pos.z = -114.8; G.S.pos.y = G.terreno.height(12, -114.8) + 0.1; }
      const ST = G.mundo && G.mundo.streaming;
      if (ST && ST.alrededor) ST.alrededor(s.x, s.z).catch(() => {});
      const H = (x, z) => G.terreno.height(x, z);
      const conSolido = () => { const so = G.solidos; return so && so.activo ? s.ins.filter(i => so.altoEn(i.pos[0], i.pos[2], 1e4) > H(i.pos[0], i.pos[2]) + 0.3).length : 0; };
      const t0 = performance.now();
      while (performance.now() - t0 < 150000 && conSolido() < s.ins.length * 0.5) { await sleep(2500); if (G.solidos.terminar) G.solidos.terminar(); }
      if (G.solidos.terminar) G.solidos.terminar();
      // encuadre: Vittata volando sobre la plaza mirando al centro (la bandada cruza el cuadro)
      G.fisica.MOVE.flying = true; G.S.vy = 0;
      G.S.pos.x = s.x + 6; G.S.pos.z = s.z + 16;
      G.S.pos.y = H(s.x, s.z) + 14;
      if (AV.debug && AV.debug.camYaw) AV.debug.camYaw(0.8);
      G.camara.inclina = -0.2;
      return JSON.stringify({ ok: true, esperaS: Math.round((performance.now() - t0) / 1000), conSolido: conSolido() + '/' + s.ins.length, aves: CV.aves().length });
    })()`, 300));
    console.log('ciudad: ' + JSON.stringify(prep));
    if (prep.error) throw new Error(prep.error);
    for (const cal of ['bajo', 'medio', 'alto']) {
      const v = JSON.parse(await evaluar(cdp, ses, VENTANA_JS(cal), 200));
      resultado.ventanas[cal] = v;
      console.log(`${cal}: ` + (v.error ? 'ERROR ' + v.error : `n=${v.n} aireMed=${v.aireMed} bandoMed=${v.bandoMed}${v.forzada ? ' (bandada forzada)' : ''} · FPS med ${v.fpsMed} / p10 ${v.fpsP10} / min ${v.fpsMin} · ${v.callsFin} calls · ${v.trisFin} k tris · dpr ${v.dpr} sombras ${v.sombras} · heap ${v.heapMB} MB · geo ${v.mem && v.mem.geo} tex ${v.mem && v.mem.tex}`));
      let foto = null;
      for (let i = 0; i < 4 && !foto; i++) { foto = await evaluar(cdp, ses, `(async () => { let f = null; for (let i = 0; i < 3 && !f; i++) { f = await AV.G.renderer.snapshot(1280, 800, 0.9); if (!f) await new Promise(r => setTimeout(r, 1200)); } return f; })()`, 40); }
      if (foto) { fs.writeFileSync(path.join(SALIDA, `k067_${ETIQ}_${cal}.jpg`), Buffer.from(foto.split(',')[1], 'base64')); console.log(`  captura k067_${ETIQ}_${cal}.jpg`); }
      // KIMI-081: captura desde la plaza (a pie, entre los edificios) para Kelvin; luego se restaura el encuadre aéreo
      let fotoPlaza = null;
      for (let i = 0; i < 4 && !fotoPlaza; i++) {
        fotoPlaza = await evaluar(cdp, ses, `(async () => {
          const G = AV.G, s = G.ciudadViva.sitio(), H = (x, z) => G.terreno.height(x, z);
          const CAM = G.camara.CAM, d0 = CAM.dist, df0 = CAM.distFly;
          CAM.dist = 22; CAM.distFly = 22; // la cámara móvil sigue a Vittata a 7,5 m: para ver la plaza hace falta alejarla
          G.fisica.MOVE.flying = false; G.S.vy = 0;
          G.S.pos.x = s.x + 4; G.S.pos.z = s.z + 15; G.S.pos.y = H(G.S.pos.x, G.S.pos.z) + 0.1;
          if (AV.debug && AV.debug.camYaw) AV.debug.camYaw(0.6);
          G.camara.inclina = 0.12;
          await new Promise(r => setTimeout(r, 2500));
          let f = null; for (let i = 0; i < 3 && !f; i++) { f = await G.renderer.snapshot(1280, 800, 0.9); if (!f) await new Promise(r => setTimeout(r, 1200)); }
          CAM.dist = d0; CAM.distFly = df0;
          return f; })()`, 40);
      }
      if (fotoPlaza) { fs.writeFileSync(path.join(SALIDA, `k067_${ETIQ}_${cal}_plaza.jpg`), Buffer.from(fotoPlaza.split(',')[1], 'base64')); console.log(`  captura k067_${ETIQ}_${cal}_plaza.jpg`); }
      await evaluar(cdp, ses, `(async () => { const G = AV.G, s = G.ciudadViva.sitio(), H = (x, z) => G.terreno.height(x, z);
        G.fisica.MOVE.flying = true; G.S.vy = 0;
        G.S.pos.x = s.x + 6; G.S.pos.z = s.z + 16; G.S.pos.y = H(s.x, s.z) + 14;
        if (AV.debug && AV.debug.camYaw) AV.debug.camYaw(0.8); G.camara.inclina = -0.2;
        return 1; })()`, 20);
    }
    const cvTest = JSON.parse(await evaluar(cdp, ses, `(async () => { const r = await AV.ciudadVivaTest({ espera: 150 }); return JSON.stringify({ passed: r.passed, total: r.total, fallos: r.results.filter(x => !x.ok).map(x => x.name + ' :: ' + String(x.extra).slice(0, 160)) }); })()`, 900));
    resultado.ciudadVivaTest = cvTest;
    console.log('ciudadVivaTest: ' + cvTest.passed + '/' + cvTest.total + (cvTest.fallos.length ? ' · FALLOS: ' + cvTest.fallos.join(' | ') : ''));
    resultado.errs = JSON.parse(await evaluar(cdp, ses, 'JSON.stringify((window.__errs || []).slice(0, 8))', 20));
    console.log('errores consola: ' + JSON.stringify(resultado.errs));
    fs.writeFileSync(path.join(SALIDA, `k067_${ETIQ}.json`), JSON.stringify(resultado, null, 1));
    const ok = Object.values(resultado.ventanas).every(v => !v.error) && cvTest.passed === cvTest.total && resultado.errs.length === 0;
    console.log('veredicto: ' + (ok ? 'OK' : 'REVISAR') + ` → docs/img/kimi067/k067_${ETIQ}.json`);
    fin(ok ? 0 : 1);
  } catch (e) {
    console.error('ERROR: ' + e.message);
    try { fs.writeFileSync(path.join(SALIDA, `k067_${ETIQ}_error.json`), JSON.stringify({ error: e.message, parcial: resultado }, null, 1)); } catch (e2) {}
    fin(2);
  }
})();
