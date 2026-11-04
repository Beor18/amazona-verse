#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-Task-013: ronda visual de los 6 capítulos en el mapa real.
   Chrome headless propio + CDP; 1600×900 dpr 1, calidad «media». Por capítulo: vista de aparición y 1-2 vistas
   ancla (teleport real + camYaw), con stats de renderer (calls/tris/fps) y captura JPG en docs/img/kimi013/.
   La cap. 1 incluye la bahía de QA-109 a dos horas (mediodía y tarde) para comparar el «pálido».
   Salida: docs/img/kimi013/resultados.json y docs/img/kimi013/<pack>_<vista>.jpg.

   Uso: node tools/build/kimi1_013_ronda.js [--packs cap1,ep3,ep5] [--calidad media]
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
const CALIDAD = arg('--calidad', 'media');
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi013');
const ANCHO = 1600, ALTO = 900;
fs.mkdirSync(SALIDA, { recursive: true });

// Vistas ancla por capítulo (coordenadas del mapa real; yaw en radianes, 0 = −z)
const VISTAS = {
  cap1: [
    { id: 'ciudad_yunque', x: -4, z: -127, yaw: Math.PI, alzar: 1.5 },
    { id: 'ciudad_aerea_vuelo', x: -20, z: -133, yaw: Math.PI, alzar: 30 },
    { id: 'bahia_norte_qa109', x: 150, z: 218, yaw: 0, alzar: 4, horas: [10, 17.8] },
  ],
  ep2: [{ id: 'detras_spawn', rel: [26, 14], yaw: null, alzar: 4 }],
  ep3: [
    { id: 'rio_oeste_qa107', x: 150, z: 208, yaw: Math.PI * 0.5, alzar: 4 },
    { id: 'muelle_llegada', x: 157, z: 221, yaw: 0, alzar: 4 },
  ],
  ep4: [{ id: 'rio_puente', rel: [30, 0], yaw: Math.PI * 0.5, alzar: 4 }],
  ep5: [{ id: 'meseta_ciudad', x: -40, z: -131, yaw: Math.PI, alzar: 8 }],
  ep6: [
    { id: 'campamento_rio', x: 36, z: -50, yaw: Math.PI * 0.75, alzar: 4 },
    { id: 'mina_empalizadas_qa108', x: 92, z: -38, yaw: Math.PI * 1.05, alzar: 4 },
  ],
};

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

const FASE_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
  const ST = G.mundo && G.mundo.streaming;
  if (ST) { if (ST.alrededor) await ST.alrededor(S.pos.x, S.pos.z); if (ST.terminar) await ST.terminar(); }
  if (G.solidos && G.solidos.terminar) G.solidos.terminar();
  if (G.vegetacion && G.vegetacion.listo) await Promise.resolve(G.vegetacion.listo);
  await sleep(1200);
  return 'ok'; })()`;

// teleport + asentar (5 s, re-ancla suave) + stats + captura; hora opcional
const TOMA_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
  const P = ${'${PAYLOAD}'};
  if (P.hora != null) { S.hora = P.hora; if (G.atardecer && G.atardecer.forzar) { P.hora < 12 ? G.atardecer.forzar(false) : G.atardecer.forzar(true); if (G.atardecer.avanzar) G.atardecer.avanzar(9); } }
  AV.teleport(P.x, P.z); AV.G.S.pos.y += (P.alzar || 0.5); AV.G.S.vy = 0; AV.G.fisica.MOVE.flying = true;
  if (P.yaw != null) AV.debug.camYaw(P.yaw);
  const y0 = S.pos.y;
  const ST = G.mundo && G.mundo.streaming;
  if (ST) { if (ST.alrededor) await ST.alrededor(P.x, P.z); if (ST.terminar) await ST.terminar(); }
  for (let i = 0; i < 10; i++) { await sleep(500); AV.G.S.pos.x = P.x; AV.G.S.pos.z = P.z; AV.G.S.pos.y = y0; AV.G.S.vy = 0; if (P.yaw != null) AV.debug.camYaw(P.yaw); }
  await sleep(1000);
  const png = G.renderer.snapshot(${ANCHO}, ${ALTO}, 0.9);
  const st = G.renderer.stats();
  return JSON.stringify({ pos: { x: +S.pos.x.toFixed(1), y: +S.pos.y.toFixed(1), z: +S.pos.z.toFixed(1) }, hora: S.hora, stats: st, png }); })()`;

async function lanzar() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1r-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', `--window-size=${ANCHO},${ALTO}`];
  const c = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let e0 = null; c.on('error', e => { e0 = e; });
  const pf = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { c, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    if (e0) throw new Error('spawn: ' + e0.message);
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('sin DevToolsActivePort');
}

(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const { c, puerto: pd, wsPath } = await lanzar();
  const ws = new WebSocket(`ws://127.0.0.1:${pd}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tomas = [];
  console.log(`· ronda KIMI-013 · ${ANCHO}×${ALTO} · calidad ${CALIDAD} · packs ${PACKS.join(', ')}`);

  async function toma(ses, pack, id, payload) {
    const js = TOMA_JS.replace('${PAYLOAD}', JSON.stringify(payload));
    const m = JSON.parse(await ev(cdp, ses, js, 90));
    const png = m.png; delete m.png;
    const f = path.join(SALIDA, `${pack}_${id}.jpg`);
    fs.writeFileSync(f, Buffer.from(png.split(',')[1], 'base64'));
    m.pack = pack; m.vista = id; m.archivo = path.basename(f);
    tomas.push(m);
    const s = m.stats || {};
    console.log(`  · ${pack}/${id}: pos ${JSON.stringify(m.pos)} hora ${m.hora} · ${s.fps != null ? s.fps + ' fps' : '?'} · ${s.calls != null ? s.calls + ' calls' : '?'} · ${s.triangulos != null ? Math.round(s.triangulos / 1000) + ' k tris' : '?'}`);
  }

  for (const pack of PACKS) {
    try {
      const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
      const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
      for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
      await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: 1, mobile: false }, ses);
      await cdp.call('Emulation.setCPUThrottlingRate', { rate: 1 }, ses);
      await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1&pack=${pack}&mapa=real&calidad=${CALIDAD}` }, ses);
      const t0 = Date.now(); let listo = false;
      while (Date.now() - t0 < CFG.espera_listo_s * 1000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { } await cdp.bombear(0.5); }
      if (!listo) { console.log(`· ${pack}: no arrancó`); continue; }
      const prep = await ev(cdp, ses, CFG.preparar_js, 300);
      if (!String(prep).startsWith('ok')) { console.log(`· ${pack}: preparar falló: ${prep}`); continue; }
      await ev(cdp, ses, `(async () => { const b = document.getElementById('c1-saltar'); if (b && b.isConnected) b.click(); await new Promise(r => setTimeout(r, 1500)); return 1; })()`, 40);
      await ev(cdp, ses, FASE_JS, 300);
      const pos0 = JSON.parse(await ev(cdp, ses, `JSON.stringify({x:+AV.G.S.pos.x.toFixed(1),z:+AV.G.S.pos.z.toFixed(1),yaw:+AV.G.camara.yaw.toFixed(2)})`, 10, false));
      console.log(`· ${pack}: spawn ${JSON.stringify(pos0)}`);
      await toma(ses, pack, 'aparicion', { x: pos0.x, z: pos0.z, yaw: pos0.yaw, alzar: 0.5 });
      for (const v of (VISTAS[pack] || [])) {
        const horas = v.horas || [null];
        for (const h of horas) {
          const id = h != null ? `${v.id}_h${String(h).replace('.', '_')}` : v.id;
          await toma(ses, pack, id, { x: v.x != null ? v.x : pos0.x + v.rel[0], z: v.z != null ? v.z : pos0.z + v.rel[1], yaw: v.yaw, alzar: v.alzar, hora: h });
        }
      }
    } catch (e) { console.log(`· ${pack}: ERROR ${e.message}`); tomas.push({ pack, error: e.message }); }
  }
  fs.writeFileSync(path.join(SALIDA, 'resultados.json'), JSON.stringify({ cuando: new Date().toISOString(), maquina: 'PC Windows · Chrome headless GPU real · ' + ANCHO + '×' + ALTO + ' dpr 1 · calidad ' + CALIDAD, tomas }, null, 1));
  console.log(`· listo: ${tomas.length} tomas → ${SALIDA}`);
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { c.kill(); }
  srv.close(); process.exit(0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(2); });
