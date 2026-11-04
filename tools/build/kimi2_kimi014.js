#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — diagnóstico v2 de KIMI-014 (BUGS.md):
   parches blancos/pálidos a 10–20 m en la Ciudad de los 36 (cap. 5, ?pack=ep5&mapa=real).
   Recorre un anillo de puntos alrededor de la zona kelvin_ruinas_yunque, captura con raycast
   FILTRADO A OBJETOS VISIBLES, y en el primer punto con píxeles pálidos que den en AV_Lejos
   visible a < 60 m, vuelca las instancias de la zona (modelo, distancia, lod, hd, colocado,
   estado cerca/hd/lejos) para ver por qué esa pieza no lleva su modelo texturizado.

   Uso: node tools/build/kimi2_kimi014.js [--pack ep5] [--calidad medio] [--radio 25,45,65] [--salida docs/img/kimi014]
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
const PACK = arg('--pack', 'ep5');
const CALIDAD = arg('--calidad', 'medio');
const RADIOS = arg('--radio', '25,45,65').split(',').map(Number);
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi014'));
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
const SONDA_JS = `window.__qaM = { dt: [] }; (() => { let t = 0; const f = n => { if (t) window.__qaM.dt.push(n - t); t = n; requestAnimationFrame(f); }; requestAnimationFrame(f); })();`;

const IR_JS = `(async (px, pz, yaw) => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
  S.pos.x = px; S.pos.z = pz; S.pos.y = G.terreno.height(px, pz) + 1.2; S.vy = 0;
  G.fisica.MOVE.flying = true; G.camara.yaw = yaw; S.facing = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
  const ST = G.mundo && G.mundo.streaming;
  if (ST) { if (ST.alrededor) await ST.alrededor(px, pz); if (ST.terminar) await ST.terminar(); }
  if (G.solidos && G.solidos.terminar) G.solidos.terminar();
  await sleep(1200);
  G.camara.yaw = yaw; if (G.camara.place) G.camara.place(true);
  return [Math.round(S.pos.x), Math.round(S.pos.y), Math.round(S.pos.z)]; })`;

const PROBE_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, R = G.renderer;
  await sleep(800);
  if (R.drawScene) R.drawScene(R.camera);
  const dataUrl = R.canvas.toDataURL('image/jpeg', 0.9);
  const cv = document.createElement('canvas'); cv.width = R.canvas.width; cv.height = R.canvas.height;
  const cx2 = cv.getContext('2d'); cx2.drawImage(R.canvas, 0, 0);
  const img = cx2.getImageData(0, 0, cv.width, cv.height).data;
  const W = cv.width, H = cv.height, pts = [];
  for (let y = Math.floor(H * 0.2); y < H * 0.85; y += 5) for (let x = Math.floor(W * 0.08); x < W * 0.92; x += 5) {
    const i = (y * W + x) * 4, r = img[i], g = img[i + 1], b = img[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx > 165 && mx - mn < 50) pts.push([Math.round(x * 100 / W) / 100, Math.round(y * 100 / H) / 100]);
  }
  const cel = new Map(); for (const [px, py] of pts) { const k = Math.round(px / 0.05) + ',' + Math.round(py / 0.05); if (!cel.has(k)) cel.set(k, [px, py, 1]); else { const c = cel.get(k); c[0] += px; c[1] += py; c[2]++; } }
  const grupos = [...cel.values()].map(([x, y, n]) => [Math.round(x / n * 1000) / 1000, Math.round(y / n * 1000) / 1000, n]).filter(g => g[2] >= 4).slice(0, 10);
  const visib = o => { let p = o; while (p) { if (!p.visible) return false; p = p.parent; } return true; };
  const ray = new THREE.Raycaster(), golpes = [];
  for (const [px, py] of grupos) {
    ray.setFromCamera(new THREE.Vector2(px * 2 - 1, -(py * 2 - 1)), R.camera);
    const hits = ray.intersectObjects(R.scene.children, true).filter(h => visib(h.object) && h.object.name && !/^(cielo|nubes|niebla)/i.test(h.object.name)).slice(0, 2);
    golpes.push({ px, py, objs: hits.map(h => ({ n: h.object.name, d: Math.round(h.distance * 10) / 10, mat: (h.object.material && (Array.isArray(h.object.material) ? h.object.material[0].name : h.object.material.name)) || null })) });
  }
  return JSON.stringify({ dataUrl, pale: pts.length, grupos, golpes }); })()`;

const VOLCADO_JS = `(async (zid) => { const AV = window.AV, G = AV.G, S = G.S, ST = G.mundo && G.mundo.streaming;
  const Z = ST.zonas[zid]; if (!Z) return JSON.stringify({ error: 'sin zona ' + zid });
  const out = [];
  for (const I of Z.inst) {
    const d = Math.round(Math.hypot(I.cx - S.pos.x, I.cy - S.pos.y, I.cz - S.pos.z) - I.r);
    const rc = ST.recursos[I.modelo] || {};
    out.push({ id: I.id, m: I.modelo, d, lod: I.lod, hd: !!I.hd, col: !!I.colocado, erg: !!I.erguido,
      cerca: rc.cerca && rc.cerca.estado, hdR: rc.hd && rc.hd.estado, lejos: rc.lejos && rc.lejos.estado });
  }
  return JSON.stringify({ zona: zid, nivel: Z.nivel, ciudad: !!Z.ciudad, usaMalla: !!Z.usaMalla, lejosVe: !!Z.lejosVe, usaCercaFusion: !!Z.usaCercaFusion, usaHDFusion: !!Z.usaHDFusion, nInst: Z.inst.length, inst: out.sort((a, b) => a.d - b.d) })`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2d-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    `--window-size=${ANCHO},${ALTO}`];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  // Chrome 156: el chrome.exe inicial sale enseguida y el navegador real sigue detached;
  // se espera al archivo DevToolsActivePort, no a la salida del proceso padre.
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools en 60 s');
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
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}" + SONDA_JS }, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=${PACK}&mapa=real&calidad=${CALIDAD}` }, ses);
  const t0 = Date.now(); let listo = false;
  while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
    try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
    await cdp.bombear(0.5);
  }
  if (!listo) { console.log('· el juego no arrancó'); process.exit(1); }
  console.log('· jugador nuevo: ' + await evaluar(cdp, ses, CFG.preparar_js, 300));
  // la zona se crea al registrar sus instancias: esperarla con un primer asentamiento
  const zc = JSON.parse(await evaluar(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), G = window.AV.G, S = G.S, ST = G.mundo.streaming;
    if (ST.alrededor) await ST.alrededor(S.pos.x, S.pos.z);
    for (let i = 0; i < 120 && !ST.zonas.kelvin_ruinas_yunque; i++) { ST.revisar(S.pos.x, S.pos.z); await sleep(500); }
    const Z = ST.zonas.kelvin_ruinas_yunque;
    return JSON.stringify(Z ? { cx: Z.cx, cz: Z.cz, r: Math.round(Z.r) } : {}); })()`, 180));
  console.log('· ciudad en', JSON.stringify(zc));
  let hallado = null;
  for (const radio of RADIOS) {
    for (let k = 0; k < 8 && !hallado; k++) {
      const a = k * Math.PI / 4, px = zc.cx + Math.cos(a) * radio, pz = zc.cz + Math.sin(a) * radio;
      const yaw = Math.atan2(-(zc.cx - px), -(zc.cz - pz));
      await evaluar(cdp, ses, `(${IR_JS})(${px}, ${pz}, ${yaw})`, 300);
      const p = JSON.parse(await evaluar(cdp, ses, PROBE_JS, 120));
      const mal = p.golpes.some(g => (g.objs || []).some(o => /AV_Lejos/.test(o.mat || '') && o.d < 60));
      console.log(`· radio ${radio} dir ${k}: pálidos ${p.pale}${mal ? '  ← LEJOS VISIBLE < 60 m' : ''}`);
      if (mal) {
        hallado = { radio, k, px: Math.round(px), pz: Math.round(pz), ...p };
        fs.writeFileSync(path.join(SALIDA, `${PACK}_diag_r${radio}_k${k}.jpg`), Buffer.from(p.dataUrl.split(',')[1], 'base64'));
      } else if (p.pale > 250) {
        fs.writeFileSync(path.join(SALIDA, `${PACK}_r${radio}_k${k}_p${p.pale}.jpg`), Buffer.from(p.dataUrl.split(',')[1], 'base64'));
      }
    }
  }
  if (!hallado) { console.log('· no se vio AV_Lejos visible < 60 m en ningún punto del anillo'); }
  else {
    delete hallado.dataUrl;
    fs.writeFileSync(path.join(SALIDA, `${PACK}_diag.json`), JSON.stringify(hallado, null, 1));
    for (const g of hallado.golpes) console.log('  · rayo @', g.px, g.py, '→', (g.objs || []).map(o => `${o.n} [${o.mat}] ${o.d}m`).join(' | ') || 'sin golpe visible');
    const zonasMal = [...new Set(hallado.golpes.flatMap(g => (g.objs || []).filter(o => /AV_Lejos|edificiosZona/.test(o.n + ' ' + o.mat)).map(o => (o.n.match(/edificiosZona:([^:]+)/) || [])[1]).filter(Boolean)))];
    for (const zid of zonasMal.length ? zonasMal : ['kelvin_ruinas_yunque', 'kelvin_ruinas_yunque_2']) {
      const v = JSON.parse(await evaluar(cdp, ses, `(${VOLCADO_JS})('${zid}')`, 120));
      fs.writeFileSync(path.join(SALIDA, `${PACK}_volcado_${zid}.json`), JSON.stringify(v, null, 1));
      console.log(`· volcado ${zid}: nivel ${v.nivel} ciudad ${v.ciudad} usaMalla ${v.usaMalla} inst ${v.nInst}`);
      for (const i of v.inst.filter(i => i.d < 80)) console.log(`    ${i.id} ${i.m} d=${i.d} lod=${i.lod} hd=${i.hd} col=${i.col} erg=${i.erg} | cerca=${i.cerca} hd=${i.hdR} lejos=${i.lejos}`);
    }
  }
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { chrome.kill(); }
  srv.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
