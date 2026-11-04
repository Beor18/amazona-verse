#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-027: hueco sin suelo bajo el borde de la malla en los riscos de la costa.
   Chrome headless propio + CDP; 1600×900 dpr 1, calidad «media». La cámara vuela SOBRE EL MAR rasante (y 2,5) y a lo alto
   (y 25) mirando la pared de los acantilados en las 4 costas del cap. 1, buscando el hueco/fondo transparente bajo el
   borde de la malla (quedante de KIMI-006). Capturas JPG + stats en docs/img/kimi027/.

   Uso: node tools/build/kimi1_027.js [--sufijo pre]
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
const SUFIJO = arg('--sufijo', '');
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi027');
const ANCHO = 1600, ALTO = 900;
fs.mkdirSync(SALIDA, { recursive: true });

// yaw: forward = (−sin yaw, −cos yaw): 0 = −z (norte), PI/2 = −x (oeste), PI = +z (sur), −PI/2 = +x (este)
const VISTAS = [
  { id: 'costa_este_rasante', x: 248, z: -152, y: 2.5, yaw: Math.PI / 2, pitch: 0.05 },
  { id: 'costa_este_aerea', x: 248, z: -152, y: 25, yaw: Math.PI / 2, pitch: 0.25 },
  { id: 'costa_oeste_rasante', x: -248, z: -136, y: 2.5, yaw: -Math.PI / 2, pitch: 0.05 },
  { id: 'costa_oeste_aerea', x: -248, z: -136, y: 25, yaw: -Math.PI / 2, pitch: 0.25 },
  { id: 'costa_norte_rasante', x: -84, z: -247, y: 2.5, yaw: Math.PI, pitch: 0.05 },
  { id: 'costa_sur_rasante', x: 208, z: 238, y: 2.5, yaw: 0, pitch: 0.05 },
  { id: 'costa_sur_aerea', x: 208, z: 238, y: 25, yaw: 0, pitch: 0.25 },
];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    const qa = /[?&]qa=1(?:&|$)/.test(req.url);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); return res.end('404'); }
      if (qa && /index\.html$/.test(f)) d = Buffer.from(d.toString('utf8').replace(/<meta charset[^>]*>/i, m => m + '<script src="tests/qa/qa.js" charset="utf-8"></script>'), 'utf8');
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(d);
    });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(m, p, s, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: m, params: p || {}, sessionId: s })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + m)); } }, t); }); }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function ev(cdp, ses, exp, t, aw) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, returnByValue: true, awaitPromise: aw !== false }, ses, (t || 30) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 300));
  return r.result ? r.result.value : undefined;
}

// teleport absoluto con altura fija (vuelo), asentado, stats + captura
const TOMA_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
  const P = ${'${PAYLOAD}'};
  AV.teleport(P.x, P.z); S.pos.y = P.y; S.vy = 0; G.fisica.MOVE.flying = true;
  if (P.yaw != null) AV.debug.camYaw(P.yaw);
  const ST = G.mundo && G.mundo.streaming;
  if (ST) { if (ST.alrededor) await ST.alrededor(P.x, P.z); if (ST.terminar) await ST.terminar(); }
  for (let i = 0; i < 6; i++) { await sleep(500); S.pos.x = P.x; S.pos.z = P.z; S.pos.y = P.y; S.vy = 0; if (P.yaw != null) AV.debug.camYaw(P.yaw); }
  const raf = () => new Promise(r => requestAnimationFrame(r));
  await raf(); await raf();
  const st = G.renderer.stats();
  const png = await G.renderer.snapshot(${ANCHO}, ${ALTO}, 0.9);
  return JSON.stringify({ pos: { x: +S.pos.x.toFixed(1), y: +S.pos.y.toFixed(1), z: +S.pos.z.toFixed(1) }, stats: st, png }); })()`;

async function lanzar() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1c27-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', `--window-size=${ANCHO},${ALTO}`];
  const c = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let e0 = null; c.on('error', e => { e0 = e; });
  const pf = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { c, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    if (e0) throw new Error('spawn: ' + e0.message);
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('sin DevToolsActivePort');
}

(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const { c, perf, puerto: pd, wsPath } = await lanzar();
  const ws = new WebSocket(`ws://127.0.0.1:${pd}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tomas = [];
  console.log(`· KIMI-027 · ${ANCHO}×${ALTO} · calidad media · sufijo «${SUFIJO}»`);

  async function toma(ses, id, payload) {
    const js = TOMA_JS.replace('${PAYLOAD}', JSON.stringify(payload));
    const m = JSON.parse(await ev(cdp, ses, js, 240));
    const png = m.png; delete m.png;
    const f = path.join(SALIDA, `k027_${id}${SUFIJO ? '_' + SUFIJO : ''}.jpg`);
    fs.writeFileSync(f, Buffer.from(png.split(',')[1], 'base64'));
    m.vista = id; m.archivo = path.basename(f);
    tomas.push(m);
    const s = m.stats || {};
    console.log(`  · ${id}: pos ${JSON.stringify(m.pos)} · ${s.fps != null ? Math.round(s.fps) + ' fps' : '?'} · ${s.calls != null ? s.calls + ' calls' : '?'} · ${s.triangulos != null ? Math.round(s.triangulos / 1000) + ' k tris' : '?'}`);
  }

  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: 1, mobile: false }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: 1 }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1&pack=cap1&mapa=real&calidad=media` }, ses);
    const t0 = Date.now(); let listo = false;
    while (Date.now() - t0 < CFG.espera_listo_s * 1000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { } await cdp.bombear(0.5); }
    if (!listo) throw new Error('cap1 no arrancó');
    const prep = await ev(cdp, ses, CFG.preparar_js, 300);
    if (!String(prep).startsWith('ok')) throw new Error('preparar falló: ' + prep);
    await ev(cdp, ses, `(async () => { const b = document.getElementById('c1-saltar'); if (b && b.isConnected) b.click(); await new Promise(r => setTimeout(r, 1500)); return 1; })()`, 40);
    for (const v of VISTAS) await toma(ses, v.id, v);
  } catch (e) { console.log(`· ERROR ${e.message}`); tomas.push({ error: e.message }); }
  fs.writeFileSync(path.join(SALIDA, `k027_resultados${SUFIJO ? '_' + SUFIJO : ''}.json`), JSON.stringify({ cuando: new Date().toISOString(), maquina: 'PC Windows · Chrome headless GPU real · ' + ANCHO + '×' + ALTO + ' dpr 1 · calidad media', tomas }, null, 1));
  console.log(`· listo: ${tomas.length} tomas → ${SALIDA}`);
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { c.kill(); }
  srv.close();
  try { fs.rmSync(perf, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 }); } catch (e) { }
  process.exit(0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(2); });
