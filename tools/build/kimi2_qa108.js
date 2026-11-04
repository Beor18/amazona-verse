#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — QA-108 (BUGS.md, hallazgo de KIMI-016):
   localizar la cerca/verja blanca parcialmente dentro del río en el campamento del ep6 (~(36, −50))
   y medir la orilla para recolocarla. Igual que kimi2_qa107.js pero el volcado recorre también las
   instancias de las InstancedMesh (los edificios del streaming no salían en el volcado viejo).

   Uso: node tools/build/kimi2_qa108.js [--pack ep6] [--px 36] [--pz -50] [--mira 36,-58] [--radio 40]
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
const PACK = arg('--pack', 'ep6');
const CALIDAD = arg('--calidad', 'medio');
const PX = parseFloat(arg('--px', '36')), PZ = parseFloat(arg('--pz', '-50'));
const ALT = parseFloat(arg('--alt', '10'));
const [MX, MZ] = arg('--mira', '36,-58').split(',').map(Number);
const RADIO = parseFloat(arg('--radio', '40'));
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

// volcado instanciado: cada instancia de cada InstancedMesh en el radio, con su posición mundo
const VOLCADO_JS = `(async (cx, cz, radio) => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, R = G.renderer;
  await sleep(1500);
  const MAR = G.agua && G.agua.levelAt ? G.agua.levelAt(cx, cz) : 0;
  const out = [];
  const M = new THREE.Matrix4(), V = new THREE.Vector3(), Q = new THREE.Quaternion(), SC = new THREE.Vector3();
  R.scene.traverse(o => {
    if (!o.isMesh) return;
    let raiz = o.name; let q = o;
    const nombres = []; while (q) { if (q.name) nombres.push(q.name); q = q.parent; }
    if (o.isInstancedMesh) {
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, M); M.decompose(V, Q, SC);
        const wp = o.localToWorld(V.clone());
        const dx = wp.x - cx, dz = wp.z - cz;
        if (dx * dx + dz * dz > radio * radio) continue;
        out.push({ n: (o.name || '(inst)') + '#' + i, cadena: nombres.join('<'), pos: [Math.round(wp.x * 10) / 10, Math.round(wp.y * 100) / 100, Math.round(wp.z * 10) / 10],
          escala: Math.round(SC.x * 100) / 100, terra: Math.round((G.terreno.height ? G.terreno.height(wp.x, wp.z) : NaN) * 100) / 100 });
      }
      return;
    }
    const p = o.getWorldPosition(new THREE.Vector3());
    const dx = p.x - cx, dz = p.z - cz;
    if (dx * dx + dz * dz > radio * radio) return;
    o.geometry.computeBoundingBox && o.geometry.computeBoundingBox();
    const bb = o.geometry.boundingBox;
    const tam = bb ? [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z].map(v => Math.round(v * 100) / 100) : null;
    const col = o.material && o.material.color ? '#' + o.material.color.getHexString() : null;
    out.push({ n: o.name || '(anon)', cadena: nombres.join('<'), pos: [Math.round(p.x * 10) / 10, Math.round(p.y * 100) / 100, Math.round(p.z * 10) / 10],
      tam, col, terra: Math.round((G.terreno.height ? G.terreno.height(p.x, p.z) : NaN) * 100) / 100 });
  });
  out.sort((a, b) => (a.n < b.n ? -1 : a.n > b.n ? 1 : a.pos[2] - b.pos[2]));
  return JSON.stringify({ mar: Math.round(MAR * 100) / 100, n: out.length, mallas: out }) })`;

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
  if (arg('--limpio', '0') === '1') await evaluar(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), G = window.AV.G;
    if (G.c && G.c.apertura && G.c.apertura.fin) G.c.apertura.fin();
    if (G.dialogo && G.dialogo.cancelarLibre) G.dialogo.cancelarLibre();
    document.querySelectorAll('#c1-fade,#bocadillos,#dialog,#card,#toast,.av-toast').forEach(e => { e.style.display = 'none'; });
    await sleep(400); return 'ok'; })()`, 30);
  await cdp.bombear(1.2);
  const FOTO_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), R = window.AV.G.renderer;
    const cuadros = n => new Promise(r => { let k = 0; const f = () => { if (++k >= n) r(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
    await sleep(500); await cuadros(3);
    if (R.drawScene) R.drawScene(R.camera);
    await cuadros(2);
    return R.canvas.toDataURL('image/jpeg', 0.85); })()`;
  const dataUrl = await evaluar(cdp, ses, FOTO_JS, 60);
  const f = path.join(SALIDA, `qa_tool_${PACK}_${Math.round(PX)}_${Math.round(Math.abs(PZ))}.jpg`);
  fs.writeFileSync(f, Buffer.from(String(dataUrl).split(',')[1], 'base64'));
  console.log('· foto ' + f);
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
  const volcado = JSON.parse(await evaluar(cdp, ses, `(${VOLCADO_JS})(${cx}, ${cz}, ${RADIO})`, 120));
  console.log('· nivel del mar en (' + cx.toFixed(0) + ',' + cz.toFixed(0) + '): ' + volcado.mar + ' · piezas en radio ' + RADIO + ': ' + volcado.n);
  for (const m of volcado.mallas) console.log('  ' + JSON.stringify(m));
  if (arg('--blanco', '') !== '') {
    const [bx0, bz0, bx1, bz1] = arg('--blanco', '40,-90,110,-15').split(',').map(Number);
    const BLANCO_JS = `(async (x0, z0, x1, z1) => { const AV = window.AV, G = AV.G, R = G.renderer, T = window.THREE;
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, span = Math.max(x1 - x0, z1 - z0);
      const cam = new T.PerspectiveCamera(50, R.canvas.width / R.canvas.height, 1, 600);
      cam.position.set(cx, span * 1.4, cz); cam.up.set(0, 0, -1); cam.lookAt(cx, 0, cz); cam.updateMatrixWorld();
      const cuadros = n => new Promise(r => { let k = 0; const f = () => { if (++k >= n) r(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
      await cuadros(2);
      R.renderer.render(R.scene, cam); R.renderer.render(R.scene, cam); // directo: el composer de drawScene ignora la cámara extraña
      const cv = document.createElement('canvas'); cv.width = 640; cv.height = 360;
      const cx2 = cv.getContext('2d'); cx2.drawImage(R.canvas, 0, 0, 640, 360);
      const cvS = document.createElement('canvas'); cvS.width = 320; cvS.height = 180;
      const cxS = cvS.getContext('2d'); cxS.drawImage(R.canvas, 0, 0, 320, 180);
      const d = cxS.getImageData(0, 0, 320, 180).data;
      const blancos = [];
      for (let py = 0; py < 180; py++) for (let px = 0; px < 320; px++) {
        const i = (py * 320 + px) * 4, r = d[i], g = d[i + 1], b = d[i + 2];
        if (r > 175 && g > 180 && b > 175 && Math.abs(r - g) < 30 && Math.abs(g - b) < 40) blancos.push([px, py, r, g, b]);
      }
      // agrupar en gruesos (vecindad 6 px) y quedarse con grupos >= 4 px
      const grupos = [];
      for (const p of blancos) { let g0 = null;
        for (const gr of grupos) if (Math.abs(gr.x - p[0]) < 7 && Math.abs(gr.y - p[1]) < 7) { g0 = gr; break; }
        if (g0) { g0.x = (g0.x * g0.n + p[0]) / (g0.n + 1); g0.y = (g0.y * g0.n + p[1]) / (g0.n + 1); g0.n++; }
        else grupos.push({ x: p[0], y: p[1], n: 1 });
      }
      const ok = grupos.filter(g => g.n >= 4);
      const ray = new T.Raycaster(), out = [];
      const visib = o => { let p = o; while (p) { if (!p.visible) return false; p = p.parent; } return true; };
      for (const g of ok) {
        const ndc = new T.Vector2(g.x / 320 * 2 - 1, -(g.y / 180 * 2 - 1));
        ray.setFromCamera(ndc, cam);
        const hits = ray.intersectObjects(R.scene.children, true).filter(h => visib(h.object)).slice(0, 2);
        const w = new T.Vector3(); ray.ray.at(ray.ray.direction.y < -0.001 ? (0 - ray.ray.origin.y) / ray.ray.direction.y : 50, w);
        for (const h of hits) { let q = h.object, nombres = []; while (q) { if (q.name) nombres.push(q.name); q = q.parent; }
          const p = h.object.getWorldPosition(new T.Vector3());
          out.push({ px: [Math.round(g.x), Math.round(g.y)], n: g.n, hit: h.object.name || '(anon)', cadena: nombres.join('<'), d: Math.round(h.distance), hpos: [Math.round(h.point.x * 10) / 10, Math.round(h.point.y * 10) / 10, Math.round(h.point.z * 10) / 10] });
        }
        if (!hits.length) out.push({ px: [Math.round(g.x), Math.round(g.y)], n: g.n, hit: '(ninguno)', suelo: [Math.round(w.x * 10) / 10, Math.round(w.z * 10) / 10] });
      }
      return JSON.stringify({ blancos: blancos.length, grupos: ok.length, out, foto: cv.toDataURL('image/jpeg', 0.85) }) })`;
    const r = JSON.parse(await evaluar(cdp, ses, `(${BLANCO_JS})(${bx0}, ${bz0}, ${bx1}, ${bz1})`, 120));
    if (r.foto) { const fb = path.join(SALIDA, `qa_blanco_${bx0}_${Math.abs(bz0)}_${bx1}_${Math.abs(bz1)}.jpg`); fs.writeFileSync(fb, Buffer.from(String(r.foto).split(',')[1], 'base64')); console.log('· foto cenital ' + fb); }
    console.log('· blancos ' + r.blancos + ' px en ' + r.grupos + ' grupos (rect ' + bx0 + ',' + bz0 + '..' + bx1 + ',' + bz1 + ')');
    for (const o of r.out) console.log('  ' + JSON.stringify(o));
  }
  if (arg('--bb', '') !== '') {
    const [bx0, bz0, bx1, bz1] = arg('--bb', '50,-70,100,-25').split(',').map(Number);
    const BB_JS = `(async (x0, z0, x1, z1) => { const AV = window.AV, G = AV.G, R = G.renderer, B = new THREE.Box3(), S = new THREE.Vector3();
      const out = [];
      R.scene.traverse(o => {
        if (!o.isMesh || o.isInstancedMesh) return;
        let q = o; const nombres = []; while (q) { if (q.name) nombres.push(q.name); q = q.parent; }
        B.setFromObject(o); if (!isFinite(B.min.x)) return;
        if (B.max.x < x0 || B.min.x > x1 || B.max.z < z0 || B.min.z > z1) return;
        const c = B.getCenter(new THREE.Vector3());
        out.push({ n: o.name || '(anon)', cadena: nombres.join('<'), caja: [B.min.x, B.min.y, B.min.z, B.max.x, B.max.y, B.max.z].map(v => Math.round(v * 10) / 10), centro: [Math.round(c.x * 10) / 10, Math.round(c.y * 10) / 10, Math.round(c.z * 10) / 10] });
      });
      out.sort((a, b) => (a.n < b.n ? -1 : 1));
      return JSON.stringify(out) })`;
    const cajas = JSON.parse(await evaluar(cdp, ses, `(${BB_JS})(${bx0}, ${bz0}, ${bx1}, ${bz1})`, 120));
    console.log('· mallas con caja en x ' + bx0 + '..' + bx1 + ' z ' + bz0 + '..' + bz1 + ': ' + cajas.length);
    for (const m of cajas) console.log('  ' + JSON.stringify(m));
  }
  chrome.kill(); srv.close();
  process.exit(0);
})().catch(e => { console.error('ERROR ' + e.message); process.exit(1); });
