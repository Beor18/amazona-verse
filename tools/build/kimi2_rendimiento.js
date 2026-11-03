#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-Task-015: FPS y draw calls con GPU real en los 6 capítulos.
   Chrome headless propio + CDP; escritorio 1920×1080 dpr 1 (calidad «alto» sube el piso a 1,5 con DPR_MAX, como el juego);
   jugador nuevo por toma (origen limpio): portada → Jugar → creador → Empezar; se mide en la villa/zona de aparición de
   cada capítulo con ?mapa=real, en calidad alta y media, dos fases: «aparicion» (vista quieta del spawn) y «giro»
   (rotación de 360° de cámara). Por toma: FPS medio/peor, p95, draw calls y triángulos (renderer.info.render), captura.
   Salida: docs/img/kimi015/resultados.json y docs/img/kimi015/<pack>_<calidad>_<fase>.jpg.

   Uso: node tools/build/kimi2_rendimiento.js [--packs cap1,ep3] [--calidades alta,media] [--salida docs/img/kimi015]
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const PACKS = arg('--packs', 'cap1,ep2,ep3,ep4,ep5,ep6').split(',');
const CALIDADES = arg('--calidades', 'alto,medio').split(',');
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi015'));
const SEGUNDOS = parseFloat(arg('--segundos', '12'));
const ANCHO = parseInt(arg('--ancho', '1920'), 10), ALTO = parseInt(arg('--alto', '1080'), 10);
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

// ---- CDP mínimo (sin librerías) ----
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message + ' ' + JSON.stringify(d.error.data || ''))) : p.re(d.result); } }; }
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

// Sonda de cuadros (rAF) y lectura de medidas + renderer.info + captura
const SONDA_JS = `(() => { const Q = window.__qaM = { dt: [] }; let t = 0;
  const f = n => { if (t) Q.dt.push(n - t); t = n; if (Q.dt.length > 40000) Q.dt.splice(0, 20000); requestAnimationFrame(f); }; requestAnimationFrame(f); })();`;

const MEDIR_JS = `(() => { const Q = window.__qaM || { dt: [] }; const d = Q.dt.slice(), n = d.length;
  const orden = d.slice().sort((a, b) => a - b);
  const media = n ? orden.reduce((a, b) => a + b, 0) / n : 0;
  const q = p => n ? orden[Math.min(n - 1, Math.floor(n * p))] : 0;
  let st = {}; try { const R = window.AV && AV.G && AV.G.renderer; st = (R && R.stats && R.stats()) || {}; } catch (e) {}
  const info = (st.calls != null) ? { calls: st.calls, triangulos: st.triangulos } : null;
  let pos = null; try { const S = AV.G.S; pos = [Math.round(S.pos.x), Math.round(S.pos.y), Math.round(S.pos.z)]; } catch (e) {}
  const png = (() => { try { const R2 = AV.G.renderer; if (R2.drawScene) R2.drawScene(R2.camera); return R2.canvas.toDataURL('image/jpeg', 0.85); } catch (e) { return null; } })();
  Q.dt = [];
  return JSON.stringify({ cuadros: n, fps: n ? Math.round(10000 / media) / 10 : 0, p50: Math.round(q(0.5) * 10) / 10, p95: Math.round(q(0.95) * 10) / 10, peor: Math.round((n ? orden[n - 1] : 0) * 10) / 10,
    info, stats: { fps: st.fps, calls: st.calls, calidad: st.calidad, dpr: st.dpr, triangulos: st.triangulos }, pos, png }); })()`;

// Asentar streaming/flora alrededor del jugador y medir una fase
const FASE_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
  const ST = G.mundo && G.mundo.streaming;
  if (ST) { if (ST.alrededor) await ST.alrededor(S.pos.x, S.pos.z); if (ST.terminar) await ST.terminar(); }
  if (G.solidos && G.solidos.terminar) G.solidos.terminar();
  if (G.vegetacion && G.vegetacion.listo) await Promise.resolve(G.vegetacion.listo);
  await sleep(1500);
  return 'ok'; })()`;

const GIRO_JS = `(async () => { const AV = window.AV, G = AV.G; const cuadros = n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  const paso = 2 * Math.PI / (${SEGUNDOS} * 60);
  for (let i = 0; i < ${SEGUNDOS} * 60; i++) { G.camara.yaw += paso; G.camara.place(true); await cuadros(1); }
  return 'ok'; })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2r-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    `--window-size=${ANCHO},${ALTO}`];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 100; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); return { chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    if (chrome.exitCode != null) throw new Error('Chrome murió: ' + err.slice(0, 300));
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools en 20 s: ' + err.slice(0, 300));
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws);
  await cdp.listo();
  const errores = [];
  const tomas = [];
  console.log(`· servidor ${origen} · ${ANCHO}×${ALTO} · packs ${PACKS.join(', ')} · calidades ${CALIDADES.join(', ')}`);

  async function nuevaPestana() {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: 1, mobile: false }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}" + SONDA_JS }, ses);
    return { tid, ses };
  }
  async function esperarListo(ses) {
    const t0 = Date.now();
    while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) return true; } catch (e) { /* aún no */ }
      await cdp.bombear(0.5);
    }
    return false;
  }
  async function medirFase(ses, pack, calidad, fase) {
    const m = JSON.parse(await evaluar(cdp, ses, MEDIR_JS, 30, false));
    const png = m.png; delete m.png;
    if (png) { const f = path.join(SALIDA, `${pack}_${calidad}_${fase}.jpg`); fs.writeFileSync(f, Buffer.from(png.split(',')[1], 'base64')); m.captura = path.basename(f); }
    m.pack = pack; m.calidad = calidad; m.fase = fase;
    tomas.push(m);
    console.log(`  · ${pack} ${calidad} ${fase}: ${m.fps} FPS (p95 ${m.p95} ms, peor ${m.peor} ms) · ${m.info ? m.info.calls + ' calls · ' + Math.round((m.info.triangulos || 0) / 1000) + ' k tris' : 'sin info'} · pos ${JSON.stringify(m.pos)}`);
    return m;
  }

  for (const pack of PACKS) {
    for (const calidad of CALIDADES) {
      try {
        const { ses } = await nuevaPestana();
        await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=${pack}&mapa=real&calidad=${calidad}` }, ses);
        if (!(await esperarListo(ses))) { console.log(`· ${pack} ${calidad}: el juego no arrancó`); continue; }
        const prep = await evaluar(cdp, ses, CFG.preparar_js, 300);
        if (!String(prep).startsWith('ok')) { console.log(`· ${pack} ${calidad}: preparar falló: ${prep}`); continue; }
        await evaluar(cdp, ses, `(async () => { await (window.AV.G.mundo && window.AV.G.mundo.listo); await new Promise(r => setTimeout(r, 5000)); return 1; })()`, 300);
        await evaluar(cdp, ses, FASE_JS, 300);
        await evaluar(cdp, ses, MEDIR_JS, 30, false); // reset de la sonda
        await cdp.bombear(SEGUNDOS);                  // fase aparicion: vista quieta
        await medirFase(ses, pack, calidad, 'aparicion');
        await evaluar(cdp, ses, GIRO_JS, SEGUNDOS + 30); // fase giro: 360°
        await medirFase(ses, pack, calidad, 'giro');
      } catch (e) {
        console.log(`· ${pack} ${calidad}: ERROR ${e.message}`);
        tomas.push({ pack, calidad, error: e.message });
      }
    }
  }

  fs.writeFileSync(path.join(SALIDA, 'resultados.json'), JSON.stringify({ cuando: new Date().toISOString(), maquina: 'PC Windows · Chrome headless GPU (ANGLE/D3D11) · ' + ANCHO + '×' + ALTO + ' dpr 1', tomas }, null, 1));
  console.log(`· listo: ${tomas.length} tomas → ${path.join(SALIDA, 'resultados.json')}`);
  try { chrome.kill(); } catch (e) { /* ya murió */ }
  srv.close();
  process.exit(0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
