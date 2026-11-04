#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — QA-140: identificar los «paneles translúcidos» de la ronda KIMI-013.
   Por cada vista sospechosa (ep2/ep4 aparición, ep5 meseta): teleport igual que la ronda, raycast en los píxeles
   del panel y volcado de todas las mallas translúcidas que proyectan en pantalla. Captura JPG de referencia.
   Salida: consola + docs/img/kimi140/qa140_<pack>.jpg + docs/img/kimi140/qa140.json.
   Uso: node tools/build/kimi2_qa140.js [--packs ep2,ep4,ep5]
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
const PACKS = arg('--packs', 'ep2,ep4,ep5').split(',');
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi140');
const ANCHO = 1600, ALTO = 900;
fs.mkdirSync(SALIDA, { recursive: true });

// Vistas iguales que la ronda KIMI-013 (kimi1_013_ronda.js). Píxeles a sondear: coords de las capturas originales.
const VISTAS = {
  ep2: { x: null, z: null, yaw: null, alzar: 0.5, id: 'aparicion', pix: [[985, 300], [985, 340], [960, 300]] },
  ep4: { x: null, z: null, yaw: null, alzar: 0.5, id: 'aparicion', pix: [[1055, 430], [1055, 470], [1030, 430]] },
  ep5: { x: -40, z: -131, yaw: Math.PI, alzar: 8, id: 'meseta_ciudad', pix: [[985, 470], [1010, 100], [1010, 140], [960, 470]] },
};

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

const FASE_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
  const ST = G.mundo && G.mundo.streaming;
  if (ST) { if (ST.alrededor) await ST.alrededor(S.pos.x, S.pos.z); if (ST.terminar) await ST.terminar(); }
  if (G.solidos && G.solidos.terminar) G.solidos.terminar();
  if (G.vegetacion && G.vegetacion.listo) await Promise.resolve(G.vegetacion.listo);
  await sleep(1200);
  return 'ok'; })()`;

const DIAG_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S, T = window.THREE;
  const P = ${'${PAYLOAD}'};
  AV.teleport(P.x, P.z); AV.G.S.pos.y += (P.alzar || 0.5); AV.G.S.vy = 0; AV.G.fisica.MOVE.flying = true;
  if (P.yaw != null) AV.debug.camYaw(P.yaw);
  const y0 = S.pos.y;
  const ST = G.mundo && G.mundo.streaming;
  if (ST) { if (ST.alrededor) await ST.alrededor(P.x, P.z); if (ST.terminar) await ST.terminar(); }
  for (let i = 0; i < 10; i++) { await sleep(500); AV.G.S.pos.x = P.x; AV.G.S.pos.z = P.z; AV.G.S.pos.y = y0; AV.G.S.vy = 0; if (P.yaw != null) AV.debug.camYaw(P.yaw); }
  await sleep(1000);
  const cam = G.renderer.camera, scene = G.renderer.scene;
  cam.updateMatrixWorld(true);
  const ray = new T.Raycaster(), v2 = new T.Vector2(), out = { hits: [], candidatos: [] };
  const matInfo = m => m ? { tipo: m.type, color: m.color ? '#' + m.color.getHexString() : null, opacity: m.opacity, transparent: !!m.transparent, blending: m.blending, lado: m.side, depthWrite: m.depthWrite } : null;
  const nombre = o => { let n = o.name || '(sin nombre)', p = o.parent; while (p && p !== scene) { if (p.name) n = p.name + '/' + n; p = p.parent; } return n; };
  // 1) raycast en los píxeles del panel
  for (const px of P.pix) {
    v2.set((px[0] / ${ANCHO}) * 2 - 1, -((px[1] / ${ALTO}) * 2 - 1));
    ray.setFromCamera(v2, cam);
    const inter = [];
    for (const o of scene.children) {
      if (!o.visible) continue;
      if (o.isInstancedMesh && o.count > 4000) continue; // flora densa: demasiado cara para el rayo
      try { const h = ray.intersectObject(o, true); for (let i = 0; i < Math.min(4, h.length); i++) inter.push(h[i]); } catch (e) { }
    }
    inter.sort((a, b) => a.distance - b.distance);
    out.hits.push({ px, golpes: inter.slice(0, 5).map(h => ({ nombre: nombre(h.object), tipo: h.object.type, geo: h.object.geometry && h.object.geometry.type, d: +h.distance.toFixed(1), punto: { x: +h.point.x.toFixed(1), y: +h.point.y.toFixed(1), z: +h.point.z.toFixed(1) }, mat: matInfo(h.object.material) })) });
  }
  // 2) barrido: mallas translúcidas visibles que proyectan en pantalla
  const bb = new T.Box3(), c = new T.Vector3();
  scene.traverse(o => {
    if (!o.isMesh && !o.isSprite) return;
    if (!o.visible) return;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    const trans = ms.some(m => m && m.transparent && m.opacity < 0.95);
    if (!trans) return;
    if (o.isSprite) { c.setFromMatrixPosition(o.matrixWorld); }
    else { if (!o.geometry) return; if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); bb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); bb.getCenter(c); }
    c.project(cam);
    if (c.z < -1 || c.z > 1 || Math.abs(c.x) > 1.05 || Math.abs(c.y) > 1.05) return;
    let alto = 0, ancho = 0;
    if (!o.isSprite) { const s = new T.Vector3(); bb.getSize(s); alto = +s.y.toFixed(1); ancho = +s.x.toFixed(1); }
    const d = o.isSprite ? c.distanceTo(cam.position) : bb.distanceToPoint(cam.position);
    out.candidatos.push({ nombre: nombre(o), tipo: o.type, geo: o.geometry ? o.geometry.type : 'sprite', pantalla: { x: Math.round((c.x * 0.5 + 0.5) * ${ANCHO}), y: Math.round((-c.y * 0.5 + 0.5) * ${ALTO}) }, d: +d.toFixed(1), tam: { ancho, alto }, mat: matInfo(ms[0]) });
  });
  out.candidatos.sort((a, b) => a.d - b.d);
  const png = G.renderer.snapshot(${ANCHO}, ${ALTO}, 0.9);
  const st = G.renderer.stats();
  out.stats = st; out.pos = { x: +S.pos.x.toFixed(1), y: +S.pos.y.toFixed(1), z: +S.pos.z.toFixed(1) }; out.yaw = +G.camara.yaw.toFixed(2);
  return JSON.stringify(out).replace(/[\\n\\r]/g, ' ') + '|PNG|' + png; })()`;

async function lanzar() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2q140-'));
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
  const informe = { cuando: new Date().toISOString(), vistas: {} };
  console.log(`· QA-140 · ${ANCHO}×${ALTO} · GPU real · packs ${PACKS.join(', ')}`);

  for (const pack of PACKS) {
    const V = VISTAS[pack]; if (!V) continue;
    try {
      const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
      const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
      for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
      await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: 1, mobile: false }, ses);
      await cdp.call('Emulation.setCPUThrottlingRate', { rate: 1 }, ses);
      await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1&pack=${pack}&mapa=real&calidad=media` }, ses);
      const t0 = Date.now(); let listo = false;
      while (Date.now() - t0 < CFG.espera_listo_s * 1000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { } await cdp.bombear(0.5); }
      if (!listo) { console.log(`· ${pack}: no arrancó`); informe.vistas[pack] = { error: 'no arrancó' }; continue; }
      const prep = await ev(cdp, ses, CFG.preparar_js, 300);
      if (!String(prep).startsWith('ok')) { console.log(`· ${pack}: preparar falló: ${prep}`); informe.vistas[pack] = { error: 'preparar: ' + prep }; continue; }
      await ev(cdp, ses, `(async () => { const b = document.getElementById('c1-saltar'); if (b && b.isConnected) b.click(); await new Promise(r => setTimeout(r, 1500)); return 1; })()`, 40);
      await ev(cdp, ses, FASE_JS, 300);
      const pos0 = JSON.parse(await ev(cdp, ses, `JSON.stringify({x:+AV.G.S.pos.x.toFixed(1),z:+AV.G.S.pos.z.toFixed(1),yaw:+AV.G.camara.yaw.toFixed(2)})`, 10, false));
      const payload = { x: V.x != null ? V.x : pos0.x, z: V.z != null ? V.z : pos0.z, yaw: V.yaw != null ? V.yaw : pos0.yaw, alzar: V.alzar, pix: V.pix };
      const raw = await ev(cdp, ses, DIAG_JS.replace('${PAYLOAD}', JSON.stringify(payload)), 180);
      const sep = raw.lastIndexOf('|PNG|');
      const out = JSON.parse(raw.slice(0, sep));
      const f = path.join(SALIDA, `qa140_${pack}_${V.id}.jpg`);
      fs.writeFileSync(f, Buffer.from(raw.slice(sep + 5).split(',')[1], 'base64'));
      informe.vistas[pack] = out;
      const s = out.stats || {};
      console.log(`· ${pack}/${V.id}: pos ${JSON.stringify(out.pos)} yaw ${out.yaw} · ${s.calls != null ? s.calls + ' calls' : '?'} · candidatos translúcidos: ${out.candidatos.length}`);
      for (const h of out.hits) console.log(`   px ${h.px}: ` + (h.golpes.length ? h.golpes.map(g => `${g.nombre} [${g.tipo}/${g.geo}] d=${g.d} op=${g.mat && g.mat.opacity}`).join(' → ') : 'sin golpes'));
      for (const cn of out.candidatos.slice(0, 12)) console.log(`   candidato: ${cn.nombre} [${cn.tipo}/${cn.geo}] pantalla ${cn.pantalla.x},${cn.pantalla.y} d=${cn.d} tam ${cn.tam.ancho}×${cn.tam.alto} op=${cn.mat && cn.mat.opacity} ${cn.mat && cn.mat.color}`);
    } catch (e) { console.log(`· ${pack}: ERROR ${e.message}`); informe.vistas[pack] = { error: e.message }; }
  }
  fs.writeFileSync(path.join(SALIDA, 'qa140.json'), JSON.stringify(informe, null, 1));
  console.log(`· listo → ${SALIDA}`);
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { try { c.kill(); } catch (e2) { } }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close(); process.exit(0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(2); });
