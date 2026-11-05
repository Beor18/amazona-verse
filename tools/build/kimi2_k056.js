#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-056: cotorras de verdad en la bandada.
   Fase --hornea (default): abre un visor con three.js, lee assets/models/vittata_base_lod1.glb
   (solo lectura; ni el modelo ni su rig se tocan), clasifica cada vértice (cuerpo/cabeza/pico/ala/cola),
   despliega las alas, normaliza la escala y decima por celdas a dos LOD; guarda:
     - docs/img/kimi056/horneado.jpg (vista de las 6 poses con el shader real)
     - assets/data/cotorra_horneada.js (datos estáticos: window.AV_COTORRA_HORNEADA)
   Fase --valida: entra al juego con partida sembrada, espera la bandada, corre AV.bandadaTest(),
   fuerza una salida, captura el plano y los stats, y verifica que bandada.js haya cogido la malla horneada.

   Uso: node tools/build/kimi2_k056.js [--hornea] [--valida] [--ala R] [--girar R] [--cellN m] [--cellF m] [--puerto N]
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
const HORNEA = !process.argv.includes('--valida');
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi056');
const DATA_JS = path.join(RAIZ, 'assets', 'data', 'cotorra_horneada.js');
fs.mkdirSync(SALIDA, { recursive: true });

function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const EXTRAS = ['ala', 'girar', 'cellN', 'cellF'].filter(k => process.argv.includes('--' + k)).map(k => `${k}=${arg('--' + k)}`).join('&');

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
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2k56-'));
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

const SEMILLA_JS = `(() => { try {
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-k056-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {} })()`;
const PREPARAR_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene Jugar'; b.click();
    if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta'; }
  const cr = $('creator');
  if (cr && !cr.hidden) { await espera(() => $('p-stage-status') && $('p-stage-status').hidden, 30000); const s = $('p-save'); if (!s) return 'sin Empezar';
    s.click(); if (!await espera(() => cr.hidden, 8000)) return 'Empezar no cerró el creador'; }
  const S = window.AV && window.AV.state; if (!S || !S.profile || !S.profile.created) return 'sin perfil creado';
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(30000);
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 20000);
  await AV.bandadaTest ? 'ok' : 'ok'; return 'ok'; })()`;

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const l = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${l.puerto}${l.wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const fin = codigo => { try { spawnSync('taskkill', ['/PID', String(l.chrome.pid), '/T', '/F'], { stdio: 'ignore' }); } catch (e) {} srv.close(); process.exit(codigo); };
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    if (HORNEA) {
      await cdp.call('Page.navigate', { url: `${origen}/tools/build/k056_viewer.html${EXTRAS ? '?' + EXTRAS : ''}` }, ses);
      let r = null;
      for (let i = 0; i < 90; i++) { await cdp.bombear(1); r = await evaluar(cdp, ses, 'window.__k056 || null', 5, false); if (r) break; }
      if (!r) throw new Error('el visor no produjo __k056 en 90 s');
      if (r.error) throw new Error('visor: ' + r.error);
      fs.writeFileSync(path.join(SALIDA, 'horneado.jpg'), Buffer.from(r.foto.split(',')[1], 'base64'));
      for (const [k, v] of Object.entries(r.diag || {})) fs.writeFileSync(path.join(SALIDA, `diag_${k}.jpg`), Buffer.from(v.split(',')[1], 'base64'));
      const data = { ala: r.ala, cuello: r.cuello, largo: r.largo, near: r.near, far: r.far };
      fs.writeFileSync(DATA_JS, '/* KIMI-056 · cotorra horneada desde assets/models/vittata_base_lod1.glb (solo lectura).\n' +
        '   Generado por tools/build/kimi2_k056.js --hornea; no editar a mano. */\n' +
        'window.AV_COTORRA_HORNEADA = ' + JSON.stringify(data) + ';\n');
      const kb = Math.round(fs.statSync(DATA_JS).size / 1024);
      console.log(JSON.stringify({ ok: true, analisis: r.analisis, ala: r.ala, cuello: r.cuello, dataKB: kb, foto: 'docs/img/kimi056/horneado.jpg' }, null, 1));
      fin(0);
    }
    // ---- valida ----
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS });
    await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1` }, ses, 30000);
    console.log('entrada: ' + await evaluar(cdp, ses, PREPARAR_JS, 90));
    // espera a que la bandada exista y use la malla horneada
    const bandada = await evaluar(cdp, ses, `(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const t0 = performance.now();
      while (performance.now() - t0 < 60000) { if (window.AV && AV.G && AV.G.bandada) break; await sleep(250); }
      if (!(window.AV && AV.G && AV.G.bandada)) return { error: 'sin G.bandada' };
      const B = AV.G.bandada;
      await sleep(1500);
      const usoReal = !!B.real;
      const vertsCerca = B.meshes[0].geometry.attributes.position.count;
      const t0b = performance.now();
      let test = null; try { test = await (window.AV.bandadaTest ? AV.bandadaTest() : B.test()); } catch (e) { test = { error: String(e && e.message || e) }; }
      const dur = Math.round(performance.now() - t0b);
      return { usoReal, vertsCerca, test, durMs: dur }; })()`, 180);
    console.log('bandada: ' + JSON.stringify(bandada));
    if (bandada && bandada.test && !bandada.test.error) {
      const p = bandada.test.passed, t = bandada.test.total;
      console.log(`bandadaTest: ${p}/${t}` + (p < t ? ' · FALLAN: ' + bandada.test.results.filter(x => !x.ok).map(x => x.name).join(' | ') : ''));
    }
    // salida forzada + captura + stats
    const escena = await evaluar(cdp, ses, `(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const B = AV.G.bandada; B.aparecer('prueba', { forzar: true, n: 12, dist: 26, ang: 2.4 });
      await sleep(2500);
      const foto = AV.G.renderer.snapshot(1280, 800, 0.9);
      const st = AV.G.renderer.stats();
      return JSON.stringify({ foto, calls: st.calls, tris: Math.round(st.triangulos), fps: st.fps, calidad: st.calidad }); })()`, 60);
    const sc = JSON.parse(escena);
    fs.writeFileSync(path.join(SALIDA, 'valida_bandada.jpg'), Buffer.from(sc.foto.split(',')[1], 'base64'));
    console.log(`escena: ${sc.fps} FPS · ${sc.calls} calls · ${Math.round(sc.tris / 1000)} k tris · ${sc.calidad} → docs/img/kimi056/valida_bandada.jpg`);
    fin(bandada && bandada.test && bandada.test.passed === bandada.test.total && bandada.usoReal ? 0 : 1);
  } catch (e) { console.error('ERROR: ' + e.message); fin(2); }
})();
