#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-081: cotorras horneadas DENTRO del juego.
   Con lo medido en KIMI-067 (kimi2_k067.js, 12/16/20 caben sin coste propio), esta herramienta
   VERIFICA en juego real, por calidad (bajo/medio/alto), que la población de la Ciudad de los 36
   se dibuja con la malla horneada de verdad (G.bandada.real, geometría con aPleg, no las esferas)
   y que cruzan el cielo en bandada; mide FPS med/p10/min, draw calls, tris, aves en el aire y
   heap; y deja las capturas para Kelvin desde la PLAZA y desde el AIRE (bandada en cuadro).
   Entrada sembrada sin creador (misma semilla que kimi2_k067), perfil iPhone 390×844 dpr 3,
   CPU ×4, GPU real; sin ?qa=1 (qa.js arrancaría la batería sola y contaminaría el FPS — KIMI-052).
   Población por defecto sin cambio (0u: «no subir más la población por defecto»).
   Al final corre AV.ciudadVivaTest() como regresión y vuelca __errs.
   Uso: node tools/build/kimi1_081.js [--ancho N] [--alto N] [--dpr N] [--cpu N] [--etiqueta X]
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
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi081');
fs.mkdirSync(SALIDA, { recursive: true });
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ANCHO = +arg('--ancho', 390), ALTO = +arg('--alto', 844), DPR = +arg('--dpr', 3), CPUX = +arg('--cpu', 4);
const ETIQ = arg('--etiqueta', 'r1');
const SOLO_FOTOS = process.argv.includes('--fotos-solo');

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
}
async function evaluar(cdp, ses, exp, timeoutS, promesa) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: promesa !== false, returnByValue: true }, ses, (timeoutS || 30) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 400));
  return r.result ? r.result.value : undefined;
}
async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k81-'));
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
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-k081-' + Math.random().toString(36).slice(2, 10),
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

// Estado de la malla de la bandada: ¿horneada real o esferas de fallback?
const MALLA_JS = `(async () => {
  const B = AV.G.bandada;
  if (!B || !B.meshes) return JSON.stringify({ error: 'sin G.bandada' });
  const g = m => ({ tri: m.geometry.index ? m.geometry.index.count / 3 : (m.geometry.attributes.position.count / 3),
    vert: m.geometry.attributes.position.count, horneada: !!m.geometry.getAttribute('aPleg'), indexada: !!m.geometry.index });
  return JSON.stringify({ real: !!B.real, cerca: g(B.meshes[0]), lejos: g(B.meshes[1]) });
})()`;

// Ventana de medición por calidad + las dos capturas (plaza y aire). Misma metodología que
// kimi2_k067 (setCalidad manual, asentado 16 s, bandada esperada 45 s y forzada si no sale).
const VENTANA_JS = (cal, solo) => `(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const G = AV.G, CV = G.ciudadViva, Rd = G.renderer;
  if (!CV) return JSON.stringify({ error: 'sin G.ciudadViva' });
  const cal = '${cal}';
  Rd.setCalidad(cal, true);
  await sleep(4000); // ajuste de población por calidad
  await sleep(12000); // asentado tras el flip (QA-53: re-enlace/subida fuera de la ventana)
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
  const malla = JSON.parse(await (${MALLA_JS}));
  const fps = [], calls = [], tris = [], aire = [], bando = [];
  for (let i = 0; i < (${solo} ? 2 : 40); i++) {
    const st = Rd.stats(), av = CV.aves();
    fps.push(st.fps); calls.push(st.calls); tris.push(st.triangulos);
    aire.push(av.filter(a => a.est !== 'posada').length);
    bando.push(av.filter(a => a.bando).length);
    await sleep(500);
  }
  const stF = Rd.stats();
  const ord = [...fps].sort((a, b) => a - b);
  const pct = p => ord[Math.max(0, Math.min(ord.length - 1, Math.floor(p * ord.length)))];
  return JSON.stringify({
    cal, n: CV.aves().length, forzada, mallaReal: malla.real, geoCerca: malla.cerca, geoLejos: malla.lejos,
    dpr: stF.dpr, sombras: stF.sombras,
    fpsMed: pct(0.5), fpsP10: pct(0.1), fpsMin: ord[0],
    aireMed: +(aire.reduce((a, b) => a + b, 0) / aire.length).toFixed(1),
    bandoMed: +(bando.reduce((a, b) => a + b, 0) / bando.length).toFixed(1),
    callsFin: stF.calls, trisFin: Math.round(stF.triangulos / 1000),
    heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
    fpsRaw: fps
  }); })()`;

// Encuadre y captura: desde la plaza (rasante, la bandada cruza el cuadro) y desde el aire.
// La cámara móvil sigue a Vittata a ~9,5 m (CAM.distFly): se ensancha a 20–30 m durante la toma
// y se restaura (KIMI-044: para encuadres de «vida» hay que subir CAM.dist).
const FOTO_JS = (donde) => `(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const G = AV.G, CV = G.ciudadViva, s = CV.sitio(), CAM = G.camara.CAM, H = (x, z) => G.terreno.height(x, z);
  const distFly0 = CAM.distFly, heightFly0 = CAM.heightFly, fovBonus0 = G.camara.fovBonus;
  const enCuadro = () => {
    const cam = G.renderer.camera, v = new THREE.Vector3(); let n = 0;
    for (const a of CV.aves()) if (a.bando) { v.set(a.x, a.y, a.z).project(cam); if (v.z < 1 && Math.abs(v.x) < 0.92 && Math.abs(v.y) < 0.92) n++; }
    return n;
  };
  try {
    // centroide de la bandada en vuelo: encuadre apuntado a ella (de nada sirve una ciudad viva fuera de cuadro)
    const bando = CV.aves().filter(a => a.bando);
    const C = bando.length
      ? { x: bando.reduce((n, a) => n + a.x, 0) / bando.length, z: bando.reduce((n, a) => n + a.z, 0) / bando.length, y: bando.reduce((n, a) => n + a.y, 0) / bando.length, n: bando.length }
      : null;
    G.fisica.MOVE.flying = true; G.S.vy = 0;
    CAM.fovBonus = 12; // el FOV de móvil es ~26°: sin esto la bandada (anillo de 10-25 m) no cabe de cerca
    if ('${donde}' === 'plaza') {
      const px = s.x + 6, pz = s.z + 10;
      G.S.pos.x = px; G.S.pos.z = pz; G.S.pos.y = H(px, pz) + 13;
      CAM.distFly = 20; CAM.heightFly = 9;
      G.camara.inclina = -0.2;
    } else {
      const px = (C ? C.x : s.x) + 2.5, pz = (C ? C.z : s.z) + 1;
      G.S.pos.x = px; G.S.pos.z = pz; G.S.pos.y = (C ? C.y : H(px, pz) + 18) + 0.5;
      CAM.distFly = 14; CAM.heightFly = 6;
      G.camara.inclina = -0.08;
    }
    CV.pausa(true); // congela las aves en el aire: la foto captura la bandada donde está (se reanuda al final)
    await sleep(1400); // el follow camera llega a la nueva distancia
    // elige el yaw que mete más aves de la bandada en cuadro (6 candidatos)
    let mejor = { yaw: null, n: -1 };
    for (let k = 0; k < 6; k++) {
      const yaw = k * Math.PI / 3;
      if (AV.debug && AV.debug.camYaw) AV.debug.camYaw(yaw);
      await sleep(90);
      const n = enCuadro();
      if (n > mejor.n) mejor = { yaw, n };
      if (n >= (C ? Math.min(C.n, 6) : 2)) break;
    }
    if (AV.debug && AV.debug.camYaw) AV.debug.camYaw(mejor.yaw != null ? mejor.yaw : 0.8);
    await sleep(450);
    const nFinal = enCuadro();
    let f = null;
    for (let i = 0; i < 4 && !f; i++) { f = await G.renderer.snapshot(1280, 800, 0.9); if (!f) await sleep(1200); }
    return JSON.stringify({ foto: f || 'sin-foto', enCuadro: nFinal, bando: C ? C.n : 0 });
  } finally { CV.pausa(false); CAM.distFly = distFly0; CAM.heightFly = heightFly0; G.camara.fovBonus = fovBonus0; }
})()`;

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const l = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${l.puerto}${l.wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const fin = codigo => { try { spawnSync('taskkill', ['/PID', String(l.chrome.pid), '/T', '/F'], { stdio: 'ignore' }); } catch (e) {} try { fs.rmSync(l.perf, { recursive: true, force: true }); } catch (e) {} srv.close(); process.exit(codigo); };
  const resultado = { etiqueta: ETIQ, perfil: { ancho: ANCHO, alto: ALTO, dpr: DPR, cpu: CPUX }, ventanas: {}, fotos: {}, ciudadVivaTest: null, errs: null };
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPUX }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?calidad=bajo` }, ses, 30000);
    console.log('entrada: ' + await evaluar(cdp, ses, PREPARAR_JS, 260));
    console.log(`perfil: ${ANCHO}x${ALTO} dpr ${DPR} cpu x${CPUX} (iPhone emulado, GPU real)`);
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
      return JSON.stringify({ ok: true, esperaS: Math.round((performance.now() - t0) / 1000), conSolido: conSolido() + '/' + s.ins.length, aves: CV.aves().length, malla: JSON.parse(await (${MALLA_JS})) });
    })()`, 300));
    console.log('ciudad: ' + JSON.stringify(prep));
    if (prep.error) throw new Error(prep.error);
    for (const cal of ['bajo', 'medio', 'alto']) {
      const v = JSON.parse(await evaluar(cdp, ses, VENTANA_JS(cal, SOLO_FOTOS), 200));
      resultado.ventanas[cal] = v;
      console.log(`${cal}: ` + (v.error ? 'ERROR ' + v.error
        : `n=${v.n} aireMed=${v.aireMed} bandoMed=${v.bandoMed}${v.forzada ? ' (bandada forzada)' : ''} · mallaReal=${v.mallaReal} (cerca ${v.geoCerca.tri | 0} tri horneada=${v.geoCerca.horneada} · lejos ${v.geoLejos.tri | 0} tri horneada=${v.geoLejos.horneada}) · FPS med ${v.fpsMed} / p10 ${v.fpsP10} / min ${v.fpsMin} · ${v.callsFin} calls · ${v.trisFin} k tris · heap ${v.heapMB} MB`));
      for (const donde of ['plaza', 'aire']) {
        const r = JSON.parse(await evaluar(cdp, ses, FOTO_JS(donde), 60));
        if (r.foto && r.foto !== 'sin-foto') {
          const nombre = `k081_${ETIQ}_${cal}_${donde}.jpg`;
          fs.writeFileSync(path.join(SALIDA, nombre), Buffer.from(r.foto.split(',')[1], 'base64'));
          resultado.fotos[`${cal}_${donde}`] = { nombre, enCuadro: r.enCuadro, bando: r.bando };
          console.log(`  captura ${nombre} (aves en cuadro: ${r.enCuadro}/${r.bando} de la bandada)`);
        } else console.log(`  captura ${donde}: ${r.foto} (en cuadro ${r.enCuadro}/${r.bando})`);
      }
    }
    const cvTest = JSON.parse(await evaluar(cdp, ses, `(async () => { const r = await AV.ciudadVivaTest({ espera: 150 }); return JSON.stringify({ passed: r.passed, total: r.total, fallos: r.results.filter(x => !x.ok).map(x => x.name + ' :: ' + String(x.extra).slice(0, 160)) }); })()`, 900));
    resultado.ciudadVivaTest = cvTest;
    console.log('ciudadVivaTest: ' + cvTest.passed + '/' + cvTest.total + (cvTest.fallos.length ? ' · FALLOS: ' + cvTest.fallos.join(' | ') : ''));
    resultado.errs = JSON.parse(await evaluar(cdp, ses, 'JSON.stringify((window.__errs || []).slice(0, 8))', 20));
    console.log('errores consola: ' + JSON.stringify(resultado.errs));
    fs.writeFileSync(path.join(SALIDA, `k081_${ETIQ}.json`), JSON.stringify(resultado, null, 1));
    const okMalla = Object.values(resultado.ventanas).every(v => !v.error && v.mallaReal && v.geoCerca.horneada && v.geoLejos.horneada);
    const ok = Object.values(resultado.ventanas).every(v => !v.error) && okMalla && cvTest.passed === cvTest.total && resultado.errs.length === 0;
    console.log('veredicto: ' + (ok ? 'OK' : 'REVISAR') + ` → docs/img/kimi081/k081_${ETIQ}.json`);
    fin(ok ? 0 : 1);
  } catch (e) {
    console.error('ERROR: ' + e.message);
    try { fs.writeFileSync(path.join(SALIDA, `k081_${ETIQ}_error.json`), JSON.stringify({ error: e.message, parcial: resultado }, null, 1)); } catch (e2) {}
    fin(2);
  }
})();
