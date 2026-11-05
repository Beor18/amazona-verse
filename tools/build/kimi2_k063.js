#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-063: La Maraña con cara.
   Entra al juego con partida sembrada (sin creador), carga G.marana, posa a Vittata cerca del
   rastro «poza», espera a que los ojos se abran y captura el plano; repite desde otro lado para
   que se vea que los ojos giran; mide el coste (draw calls con y sin la maraña, FPS, calidad);
   verifica que en «bajo» y lejos se apaga; corre AV.maranaTest() en vivo.
   Evidencia en docs/img/kimi063/ + k063.json. Uso: node tools/build/kimi2_k063.js [--puerto N] */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, spawnSync } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi063');
fs.mkdirSync(SALIDA, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' };
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
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2k63-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', '--window-size=1280,800'];
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
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-k063-' + Math.random().toString(36).slice(2, 10),
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

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const l = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${l.puerto}${l.wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const fin = codigo => { try { spawnSync('taskkill', ['/PID', String(l.chrome.pid), '/T', '/F'], { stdio: 'ignore' }); } catch (e) {} srv.close(); process.exit(codigo); };
  const capturar = async (ses, nombre) => {
    const foto = await evaluar(cdp, ses, `(async () => {
      let f = null;
      for (let i = 0; i < 4 && !f; i++) { f = await AV.G.renderer.snapshot(1280, 800, 0.9); if (!f) await new Promise(r => setTimeout(r, 1200)); }
      return f; })()`, 40);
    if (foto) { fs.writeFileSync(path.join(SALIDA, nombre), Buffer.from(foto.split(',')[1], 'base64')); console.log('  captura ' + nombre); return true; }
    console.log('  ' + nombre + ': foto null'); return false;
  };
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1` }, ses, 30000);
    console.log('entrada: ' + await evaluar(cdp, ses, PREPARAR_JS, 260));
    // carga la marana (aDemanda: tras el primer gesto) y espera el módulo
    const cargo = await evaluar(cdp, ses, `(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      try { window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true })); } catch (e) {}
      const t0 = performance.now();
      while (performance.now() - t0 < 90000) { if (window.AV && AV.G && AV.G.marana) break; await sleep(400); }
      return { marana: !!(window.AV && AV.G && AV.G.marana), ms: Math.round(performance.now() - t0) }; })()`, 120);
    console.log('carga marana: ' + JSON.stringify(cargo));
    if (!cargo.marana) throw new Error('G.marana no cargó');
    // (1) estado funcional: ojos abiertos cerca del rastro «poza» (apertura forzada por paso, determinista)
    const estado1 = JSON.parse(await evaluar(cdp, ses, `(() => { const G = AV.G, r = G.marana.rastros[1], H = (x, z) => G.terreno.height(x, z);
      G.quiet = false; G.fisica.MOVE.flying = false;
      G.S.pos.x = r.x + 6; G.S.pos.z = r.z + 1.2; G.S.pos.y = H(G.S.pos.x, G.S.pos.z) + 0.1;
      for (let i = 0; i < 25; i++) G.marana.paso(0.1);
      return JSON.stringify({ apertura: +r.apertura.toFixed(3), ojos: G.marana.ojos.count, ojosVis: G.marana.ojos.visible,
        rastroVis: G.marana.malla.visible, calidad: G.renderer.calidad.nivel }); })()`, 20, false));
    console.log('cerca (poza): ' + JSON.stringify(estado1));
    // capturas de la ficha: snapshot() lee el lienzo 1-2 cuadros después y el bucle del juego repinta
    // con la cámara normal antes de la lectura (una carrera que a veces se pierde). Para las capturas
    // puestas a mano se renderiza y se lee SÍNCRONO en la misma tarea: determinista, sin carrera.
    const capturarAerea = async (nombre, lado) => {
      const foto = await evaluar(cdp, ses, `(() => {
        const G = AV.G, r = G.marana.rastros[1], H = (x, z) => G.terreno.height(x, z);
        G.quiet = false; G.fisica.MOVE.flying = true; G.S.vy = 0;
        G.S.pos.x = r.x + 5.5 * ${lado}; G.S.pos.z = r.z + 5.5; G.S.pos.y = H(G.S.pos.x, G.S.pos.z) + 4.2;
        for (let i = 0; i < 25; i++) G.marana.paso(0.1);
        const c = G.renderer.camera;
        c.up.set(0, 1, 0); c.position.set(r.x + 3.6 * ${lado}, r.y + 2.6, r.z + 3.4); c.lookAt(r.x, r.y + 0.35, r.z);
        c.updateMatrixWorld(true);
        G.renderer.renderer.render(G.renderer.scene, c);
        const gl = G.renderer.renderer.getContext();
        const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
        const buf = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
        const diag = { cal: G.renderer.calidad.nivel, quiet: !!G.quiet, mVis: G.marana.malla.visible, mCount: G.marana.malla.count,
          oVis: G.marana.ojos.visible, oCount: G.marana.ojos.count, ry: +r.y.toFixed(2),
          cam: [+(r.x + 3.6 * ${lado}).toFixed(1), +(r.y + 2.6).toFixed(1), +(r.z + 3.4).toFixed(1)],
          centro: [buf[(h >> 1) * w * 4 + (w >> 1) * 4], buf[(h >> 1) * w * 4 + (w >> 1) * 4 + 1], buf[(h >> 1) * w * 4 + (w >> 1) * 4 + 2]],
          vittata: [+G.S.pos.x.toFixed(1), +G.S.pos.y.toFixed(1), +G.S.pos.z.toFixed(1)] };
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        const cx2 = cv.getContext('2d');
        const img = cx2.createImageData(w, h);
        for (let y = 0; y < h; y++) img.data.set(buf.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
        cx2.putImageData(img, 0, 0);
        return { foto: cv.toDataURL('image/jpeg', 0.9), diag }; })()`, 45);
      if (foto && foto.foto) {
        fs.writeFileSync(path.join(SALIDA, nombre), Buffer.from(foto.foto.split(',')[1], 'base64'));
        console.log('  captura ' + nombre + ' · ' + JSON.stringify(foto.diag));
        return true;
      }
      console.log('  ' + nombre + ': foto null · ' + JSON.stringify(foto && foto.diag));
      return false;
    };
    await capturarAerea('k063_vista_aerea.jpg', 1);   // Vittata al SE, los ojos mirándola
    await capturarAerea('k063_vista_aerea_2.jpg', -1); // Vittata al SO: el par de ojos girado hacia el otro lado
    // (3) coste: draw calls con la cara visible vs maraña apagada (misma cámara)
    const coste = JSON.parse(await evaluar(cdp, ses, `(() => { const G = AV.G, MR = G.marana;
      const render = () => { G.renderer.renderer.render(G.renderer.scene, G.renderer.camera); return G.renderer.renderer.info.render.calls; };
      const vis0 = { m: MR.malla.visible, o: MR.ojos.visible };
      MR.malla.visible = true; MR.ojos.visible = true; const con = render();
      MR.malla.visible = false; MR.ojos.visible = false; const sin = render();
      MR.malla.visible = vis0.m; MR.ojos.visible = vis0.o;
      const st = G.renderer.stats();
      return JSON.stringify({ con, sin, delta: con - sin, fps: st.fps, tris: Math.round(st.triangulos), calidad: st.calidad }); })()`, 30, false));
    console.log('coste: ' + JSON.stringify(coste));
    // (4) se apaga en «bajo» y lejos
    const apagado = JSON.parse(await evaluar(cdp, ses, `(() => { const G = AV.G, MR = G.marana;
      const cal0 = G.renderer.calidad.nivel;
      if (G.renderer.setCalidad) G.renderer.setCalidad('bajo');
      G.emit('update', 0.016); const bajoVis = MR.malla.visible || MR.ojos.visible;
      if (G.renderer.setCalidad) G.renderer.setCalidad(cal0);
      const px = G.S.pos.x, pz = G.S.pos.z;
      G.S.pos.x = 300; G.S.pos.z = -300; G.marana.paso(0.1);
      const lejosVis = MR.malla.visible || MR.ojos.visible;
      G.S.pos.x = px; G.S.pos.z = pz; G.emit('update', 0.016);
      return JSON.stringify({ bajoApagado: !bajoVis, lejosApagado: !lejosVis }); })()`, 30, false));
    console.log('apagado: ' + JSON.stringify(apagado));
    // (5) test en vivo
    const test = JSON.parse(await evaluar(cdp, ses, `(async () => { const r = await AV.maranaTest(); return JSON.stringify(r); })()`, 60));
    console.log(`maranaTest: ${test.passed}/${test.total}` + (test.passed < test.total ? ' · FALLOS: ' + test.results.filter(x => !x.ok).map(x => x.name + ' :: ' + String(x.extra).slice(0, 120)).join(' | ') : ''));
    const errs = JSON.parse(await evaluar(cdp, ses, 'JSON.stringify((window.__errs || []).slice(0, 8))', 10, false));
    console.log('errores consola: ' + JSON.stringify(errs));
    const resumen = { cargo, estado1, coste, apagado, maranaTest: { passed: test.passed, total: test.total }, errores: errs.length };
    fs.writeFileSync(path.join(SALIDA, 'k063.json'), JSON.stringify(resumen, null, 1));
    const ok = estado1.ojos >= 2 && estado1.apertura > 0.8 && coste.delta <= 2 && apagado.bajoApagado && apagado.lejosApagado && test.passed === test.total && errs.length === 0;
    console.log(ok ? 'K063 OK' : 'K063 FALLO');
    fin(ok ? 0 : 1);
  } catch (e) { console.error('ERROR: ' + e.message); fin(2); }
})();
