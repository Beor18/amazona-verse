#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — QA-107/108/109 (BUGS.md, hallazgos de KIMI-016):
   identificar y medir las piezas sobre la línea de agua en ep3 (mesa/banca junto al muelle oeste)
   y ep6 (cerca blanca en el río), y la bahía pálida de Villa Raíz (cap. 1).
   Abre el juego con la GPU real, coloca la cámara en el punto de la captura y vuelca
   las mallas anónimas (sin nombre de streaming) de la escena junto a la orilla.

   Uso: node tools/build/kimi2_qa107.js [--pack ep3] [--px 150] [--pz 208] [--mira 189,186] [--salida docs/img/kimi016]
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
const PACK = arg('--pack', 'ep3');
const CALIDAD = arg('--calidad', 'medio');
const PX = parseFloat(arg('--px', '150')), PZ = parseFloat(arg('--pz', '208'));
const ALT = parseFloat(arg('--alt', '8'));
const [MX, MZ] = arg('--mira', '187,208').split(',').map(Number);
const RADIO = parseFloat(arg('--radio', '30'));
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi016'));
const ANCHO = parseInt(arg('--ancho', '1920'), 10), ALTO = parseInt(arg('--alto', '1080'), 10);
fs.mkdirSync(SALIDA, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(method, params, sessionId, timeoutMs) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method, params: params || {}, sessionId })); if (timeoutMs) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + method)); } }, timeoutMs); }); }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function evaluar(cdp, ses, exp, timeoutS, promesa) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: promesa !== false, returnByValue: true }, ses, (timeoutS || 30) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 500));
  return r.result ? r.result.value : undefined;
}

const VOLCADO_JS = `(async (cx, cz, radio) => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, R = G.renderer;
  await sleep(1500);
  const MAR = G.agua && G.agua.levelAt ? G.agua.levelAt(cx, cz) : 0;
  const out = [];
  R.scene.traverse(o => {
    if (!o.isMesh && !o.isGroup) return;
    const p = o.getWorldPosition(new THREE.Vector3());
    const dx = p.x - cx, dz = p.z - cz;
    if (dx * dx + dz * dz > radio * radio) return;
    if (!o.isMesh) return;
    let raiz = o.name; let q = o;
    const nombres = []; while (q) { if (q.name) nombres.push(q.name); q = q.parent; }
    o.geometry.computeBoundingBox && o.geometry.computeBoundingBox();
    const bb = o.geometry.boundingBox;
    const tam = bb ? [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z].map(v => Math.round(v * 100) / 100) : null;
    const col = o.material && o.material.color ? '#' + o.material.color.getHexString() : null;
    out.push({ n: o.name || '(anon)', cadena: nombres.join('<'), pos: [Math.round(p.x * 10) / 10, Math.round(p.y * 100) / 100, Math.round(p.z * 10) / 10],
      tam, col, geo: o.geometry.type, terra: Math.round((G.terreno.height ? G.terreno.height(p.x, p.z) : NaN) * 100) / 100 });
  });
  out.sort((a, b) => a.pos[2] - b.pos[2]);
  return JSON.stringify({ mar: Math.round(MAR * 100) / 100, n: out.length, mallas: out }) })`;

const FOTO_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), R = window.AV.G.renderer;
  const cuadros = n => new Promise(r => { let k = 0; const f = () => { if (++k >= n) r(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
  await sleep(800); await cuadros(3);
  if (R.drawScene) R.drawScene(R.camera);
  await cuadros(2);
  const url = R.canvas.toDataURL('image/jpeg', 0.85);
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
  const cx = cv.getContext('2d'); cx.drawImage(R.canvas, 0, 0, 64, 64);
  const d = cx.getImageData(0, 0, 64, 64).data;
  let sum = 0, mx = 0; for (let i = 0; i < d.length; i += 4) { const l = d[i] + d[i+1] + d[i+2]; sum += l; mx = Math.max(mx, l); }
  return JSON.stringify({ url, media: Math.round(sum / (d.length / 4)), mx: Math.round(mx), cw: R.canvas.width, vis: R.canvas.clientWidth, pos: [Math.round(window.AV.G.S.pos.x), Math.round(window.AV.G.S.pos.y * 10) / 10, Math.round(window.AV.G.S.pos.z)] }) })()`;

const RAY_JS = `(async (puntos) => { const AV = window.AV, G = AV.G, R = G.renderer;
  const visib = o => { let p = o; while (p) { if (!p.visible) return false; p = p.parent; } return true; };
  const ray = new THREE.Raycaster(), out = [];
  for (const [px, py] of puntos) {
    ray.setFromCamera(new THREE.Vector2(px * 2 - 1, -(py * 2 - 1)), R.camera);
    const hits = ray.intersectObjects(R.scene.children, true).filter(h => visib(h.object)).slice(0, 3);
    out.push({ px, py, hits: hits.map(h => { let q = h.object, nombres = []; while (q) { if (q.name) nombres.push(q.name); q = q.parent; }
      const p = h.object.getWorldPosition(new THREE.Vector3());
      return { n: h.object.name || '(anon)', cadena: nombres.join('<'), d: Math.round(h.distance * 10) / 10, pos: [Math.round(p.x*10)/10, Math.round(p.y*100)/100, Math.round(p.z*10)/10], inst: h.instanceId != null ? h.instanceId : null }; }) });
  }
  return JSON.stringify(out) })`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2q-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    `--window-size=${ANCHO},${ALTO}`];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools en 60 s: ' + err.slice(0, 300));
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: 1, mobile: false }, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}" }, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=${PACK}&mapa=real&calidad=${CALIDAD}` }, ses);
  const t0 = Date.now(); let listo = false;
  while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
    try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
    await cdp.bombear(0.5);
  }
  if (!listo) { console.log('· el juego no arrancó'); process.exit(1); }
  console.log('· listo: ' + await evaluar(cdp, ses, CFG.preparar_js, 300));
  // cámara al punto de la captura, mirando al objeto
  await evaluar(cdp, ses, `(async (px, pz, alt, mx, mz) => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
    S.pos.x = px; S.pos.z = pz; S.pos.y = G.terreno.height(px, pz) + alt; S.vy = 0;
    G.fisica.MOVE.flying = true;
    const yaw = Math.atan2(-(mx - px), -(mz - pz));
    G.camara.yaw = yaw; S.facing = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
    const ST = G.mundo && G.mundo.streaming;
    if (ST) { if (ST.alrededor) await ST.alrededor(px, pz); if (ST.terminar) await ST.terminar(); }
    if (G.solidos && G.solidos.terminar) G.solidos.terminar();
    await sleep(1500);
    G.camara.yaw = yaw; if (G.camara.place) G.camara.place(true);
    return [Math.round(S.pos.x * 10) / 10, Math.round(S.pos.y * 10) / 10, Math.round(S.pos.z * 10) / 10]; })(${PX}, ${PZ}, ${ALT}, ${MX}, ${MZ})`, 300);
  const foto = null;
  {
    await cdp.bombear(1.2);
    const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 60000);
    const f = path.join(SALIDA, `qa_tool_${PACK}_${Math.round(PX)}_${Math.round(PZ)}.jpg`);
    fs.writeFileSync(f, Buffer.from(shot.data, 'base64'));
    console.log('· foto ' + f);
  }
  const cx = (PX + MX) / 2, cz = (PZ + MZ) / 2;
  if (arg('--grid', '') !== '') {
    const [gx0, gz0, gx1, gz1, paso] = arg('--grid', '150,202,162,216,2').split(',').map(Number);
    const lineas = [];
    for (let gz = gz0; gz <= gz1; gz += paso) {
      const fila = [];
      for (let gx = gx0; gx <= gx1; gx += paso) fila.push((await evaluar(cdp, ses, `window.AV.G.terreno.height(${gx}, ${gz})`, 30, false)));
      lineas.push('z=' + gz + '  ' + fila.map(v => (v >= 0 ? '+' : '') + (Math.round(v * 100) / 100).toFixed(2)).join(' '));
    }
    console.log('· alturas x=' + gx0 + '..' + gx1 + ' (paso ' + paso + '):');
    for (const l of lineas) console.log('  ' + l);
  }
  if (arg('--ray', '1') === '1') {
    const puntos = [];
    for (const rx of [0.58, 0.62, 0.66, 0.70, 0.74, 0.78]) for (const ry of [0.68, 0.72, 0.76, 0.80]) puntos.push([rx, ry]);
    const rayos = JSON.parse(await evaluar(cdp, ses, `(${RAY_JS})(${JSON.stringify(puntos)})`, 120));
    for (const r of rayos) for (const h of r.hits) console.log(`  ray(${r.px},${r.py}) d=${h.d} ${h.cadena || h.n} @${h.pos.join(',')}${h.inst != null ? ' inst=' + h.inst : ''}`);
  }
  const volcado = JSON.parse(await evaluar(cdp, ses, `(${VOLCADO_JS})(${cx}, ${cz}, ${RADIO})`, 120));
  console.log('· nivel del mar en (' + cx.toFixed(0) + ',' + cz.toFixed(0) + '): ' + volcado.mar + ' · mallas en radio ' + RADIO + ': ' + volcado.n);
  for (const m of volcado.mallas) console.log('  ' + JSON.stringify(m));
  chrome.kill(); srv.close();
  process.exit(0);
})().catch(e => { console.error('ERROR ' + e.message); process.exit(1); });
