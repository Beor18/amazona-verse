#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — QA-140 verificación A/B del haz guía (fx.js guideBeam).
   Fija el objetivo a distancias conocidas (14 / 5 / 2 m) y captura el haz en cada una.
   Salida: metadatos por consola + docs/img/kimi140/qa140_demo_fix.jpg (haz nuevo) y qa140_demo_viejo.jpg
   (mismo encuadre con la escala vieja forzada), más las opacidades de proximidad.
   Uso: node tools/build/kimi2_qa140_demo.js
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
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi140');
const ANCHO = 1600, ALTO = 900;
fs.mkdirSync(SALIDA, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
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
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 400));
  return r.result ? r.result.value : undefined;
}

const DEMO_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
  const P = ${'${PAYLOAD}'};
  AV.teleport(P.x, P.z); AV.G.S.pos.y += 1.2; AV.G.S.vy = 0; AV.G.fisica.MOVE.flying = true;
  AV.debug.camYaw(P.yaw);
  if (G.camara && G.camara.place) G.camara.place(true);
  const ST = G.mundo && G.mundo.streaming;
  if (ST) { if (ST.alrededor) await ST.alrededor(P.x, P.z); if (ST.terminar) await ST.terminar(); }
  for (let i = 0; i < 6; i++) { await sleep(400); AV.G.S.pos.x = P.x; AV.G.S.pos.z = P.z; AV.G.S.pos.y = P.y + 1.2; AV.G.S.vy = 0; AV.debug.camYaw(P.yaw); if (G.camara && G.camara.place) G.camara.place(true); }
  const g0 = G.fx.guide; G.fx.guide = () => { }; // congela la pista real: g0 fija el haz sincronizado y nadie lo sobrescribe
  // esperar a que la cámara acompañe (el follow lento tarda tras un teleport)
  for (let i = 0; i < 40; i++) { const cp = G.renderer.camera.position; if (Math.hypot(cp.x - P.x, cp.z - P.z) < 12) break; await sleep(250); if (G.camara && G.camara.place) G.camara.place(true); AV.G.S.pos.x = P.x; AV.G.S.pos.z = P.z; AV.G.S.pos.y = P.y + 1.2; AV.G.S.vy = 0; }
  const salida = {};
  const d = 25;
  const tg = { x: P.x + Math.sin(P.yaw) * d, z: P.z + Math.cos(P.yaw) * d };
  for (const modo of ['fix', 'viejo']) {
    g0(tg, 1.0); // fase seno alta: opacidad máxima
    if (modo === 'viejo') G.fx.guideBeam.scale.set(1, 1, 1); // look anterior: radio fijo 0.35–0.7
    await sleep(150);
    const b = G.fx.guideBeam;
    salida[modo] = { visible: b.visible, opacidad: +b.material.opacity.toFixed(3), escala: +b.scale.x.toFixed(3) };
    const png = G.renderer.snapshot(${ANCHO}, ${ALTO}, 0.9);
    salida[modo].png = png;
  }
  // fundido de proximidad (QA-22) con la cámara en su sitio
  for (const dd of [6, 3]) {
    const tg2 = { x: P.x + Math.sin(P.yaw) * dd, z: P.z + Math.cos(P.yaw) * dd };
    g0(tg2, 1.0);
    await sleep(150);
    salida['f' + dd] = { visible: G.fx.guideBeam.visible, opacidad: +G.fx.guideBeam.material.opacity.toFixed(3) };
  }
  g0(null, 0); G.fx.guide = g0;
  return JSON.stringify(Object.fromEntries(Object.entries(salida).map(([k, v]) => [k, { visible: v.visible, opacidad: v.opacidad, escala: v.escala }])) ) + '|PNGS|' + JSON.stringify(Object.fromEntries(Object.entries(salida).filter(([k, v]) => v.png).map(([k, v]) => [k, v.png]))) ; })()`;

async function lanzar() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2q140d-'));
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
  console.log('· QA-140 demo A/B del haz guía');
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: 1, mobile: false }, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1&pack=cap1&mapa=real&calidad=media` }, ses);
  const t0 = Date.now(); let listo = false;
  while (Date.now() - t0 < CFG.espera_listo_s * 1000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!listo) throw new Error('no arrancó');
  const prep = await ev(cdp, ses, CFG.preparar_js, 300);
  if (!String(prep).startsWith('ok')) throw new Error('preparar: ' + prep);
  await ev(cdp, ses, `(async () => { const b = document.getElementById('c1-saltar'); if (b && b.isConnected) b.click(); await new Promise(r => setTimeout(r, 1500)); return 1; })()`, 40);
  // meseta del tepuy: vista abierta hacia el bosque (mismo encuadre que la ronda KIMI-013)
  const payload = { x: -40, z: -131, yaw: Math.PI, y: 97 };
  const raw = await ev(cdp, ses, DEMO_JS.replace('${PAYLOAD}', JSON.stringify(payload)), 120);
  const sep = raw.lastIndexOf('|PNGS|');
  const metas = JSON.parse(raw.slice(0, sep)), pngs = JSON.parse(raw.slice(sep + 6));
  for (const [d, m] of Object.entries(metas)) console.log(`  ${d}: visible=${m.visible} op=${m.opacidad} escalaX=${m.escala} inmediato=${JSON.stringify(m.inmediato)} cam=${JSON.stringify(m.cam)} bp=${JSON.stringify(m.bp)}`);
  for (const [d, png] of Object.entries(pngs)) { const f = path.join(SALIDA, `qa140_demo_${d}.jpg`); fs.writeFileSync(f, Buffer.from(png.split(',')[1], 'base64')); console.log('  → ' + f); }
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { try { c.kill(); } catch (e2) { } }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close(); process.exit(0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(2); });
