#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-Task-016: ronda visual de agua y orillas
   (caps. 3 a 6 en el mapa real + Villa Raíz/muelle). Una página por pack (la barrera de
   viento limita la zona abierta), vuelo bajo sobre el agua mirando a la orilla; captura
   cada vista en docs/img/kimi016/. Solo audita: no toca terreno.js ni look.js.

   Uso: node tools/build/kimi2_kimi016.js [--calidad media]
*/
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const CALIDAD = arg('--calidad', 'media');
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi016'));
const ANCHO = parseInt(arg('--ancho', '1920'), 10), ALTO = parseInt(arg('--alto', '1080'), 10);
fs.mkdirSync(SALIDA, { recursive: true });

// [pack, id, x, z, alt, tx, tz] — la cámara queda en (x, terreno+alt, z) mirando a (tx, tz)
const VISTAS = [
  ['cap1', 'muelle_villa_norte', 150, 222, 6, 150, 205],
  ['cap1', 'playa_este', 60, 242, 8, 60, 214],
  ['ep3', 'desembocadura_mar', 187, 252, 10, 187, 208],
  ['ep3', 'orilla_oeste_rio', 150, 208, 8, 187, 208],
  ['ep3', 'astillero_este', 222, 208, 8, 187, 208],
  ['ep4', 'rio_sur', 200, 192, 12, 200, 157],
  ['ep4', 'rio_este', 230, 157, 10, 200, 157],
  ['ep5', 'costa_miradores', -52, -100, 25, -52, -132],
  ['ep5', 'puerta_yunque', -28, -58, 20, -28, -80],
  ['ep6', 'rio_muelles', 36, -24, 10, 36, -50],
  ['ep6', 'puente_paso', 11, -56, 12, 11, -76],
  ['ep6', 'ciudad_borde', -38, -108, 15, -38, -128],
];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WS: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function ev(cdp, ses, ex, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: ex, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 400)); return r.result ? r.result.value : undefined; }

const IR_JS = `(async (px, pz, alt, tx, tz) => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
  const yaw = Math.atan2(-(tx - px), -(tz - pz));
  S.pos.x = px; S.pos.z = pz; S.pos.y = G.terreno.height(px, pz) + alt; S.vy = 0;
  G.fisica.MOVE.flying = true; G.camara.yaw = yaw; S.facing = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
  const ST = G.mundo && G.mundo.streaming;
  if (ST) { if (ST.alrededor) await ST.alrededor(px, pz); if (ST.terminar) await ST.terminar(); }
  if (G.solidos && G.solidos.terminar) G.solidos.terminar();
  await sleep(1500);
  G.camara.yaw = yaw; if (G.camara.place) G.camara.place(true);
  return [Math.round(S.pos.x), Math.round(S.pos.y), Math.round(S.pos.z)]; })`;
const CAPTURA_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, R = G.renderer;
  await sleep(700);
  if (R.drawScene) R.drawScene(R.camera);
  const dataUrl = R.canvas.toDataURL('image/jpeg', 0.9);
  const st = R.stats();
  return JSON.stringify({ dataUrl, calls: st.calls, tris: st.triangulos }); })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2w-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', `--window-size=${ANCHO},${ALTO}`];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort');
  // Chrome 156: el chrome.exe inicial sale enseguida y el navegador real sigue detached;
  // se espera al archivo DevToolsActivePort, no a la salida del proceso padre.
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; } await new Promise(r => setTimeout(r, 200)); }
  throw new Error('Chrome no abrió DevTools en 60 s');
}

(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: 1, mobile: false }, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}" }, ses);
  const hechas = [];
  let packActual = null;
  for (const [pack, id, x, z, alt, tx, tz] of VISTAS) {
    try {
      if (pack !== packActual) {
        await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=${pack}&mapa=real&calidad=${CALIDAD}` }, ses);
        const t0 = Date.now(); let ok = false;
        while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
        if (!ok) { console.log(`· ${pack}: no arrancó`); continue; }
        const prep = await ev(cdp, ses, CFG.preparar_js, 300);
        if (!String(prep).startsWith('ok')) { console.log(`· ${pack}: preparar falló: ${prep}`); continue; }
        await ev(cdp, ses, `(async () => { await (window.AV.G.mundo && window.AV.G.mundo.listo); await new Promise(r => setTimeout(r, 3000)); return 1; })()`, 300);
        packActual = pack;
      }
      await ev(cdp, ses, `(${IR_JS})(${x}, ${z}, ${alt}, ${tx}, ${tz})`, 300);
      const c = JSON.parse(await ev(cdp, ses, CAPTURA_JS, 60));
      const f = path.join(SALIDA, `${pack}_${id}.jpg`);
      fs.writeFileSync(f, Buffer.from(c.dataUrl.split(',')[1], 'base64'));
      hechas.push(`${pack}_${id}`);
      console.log(`· ${pack} ${id}: pos ${JSON.stringify(null)} · ${c.calls} calls · ${Math.round((c.tris || 0) / 1000)} k tris`);
    } catch (e) { console.log(`· ${pack} ${id}: ERROR ${e.message}`); }
  }
  console.log(`· ${hechas.length}/${VISTAS.length} capturas en ${SALIDA}`);
  try { chrome.kill(); } catch (e) { }
  srv.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
