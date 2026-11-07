#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-218 / QA-110 memoria GPU en «bajo» (iPhone emulado):
   línea base y A/B de las palancas «mipmaps solo donde hagan falta» y «generadas a menor
   resolución en bajo» para la vista de arranque (villa) y la Ciudad de los 36.
   Derivada de tools/build/kimi2_qa110.js (QA-110-mem2, Kimi 2) — mismo protocolo de medida
   (villa + ciudad + look.medir() + volcado de texturas sin URL + tomas de cerca), con dos
   añadidos: mbNoMip por textura y totales de escena con/sin mipmaps (para dimensionar la
   palanca de mipmaps antes de tocar código).
   Uso: node tools/build/kimi3_218.js --etiqueta r1 [--salida docs/img/kimi218]
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
const ETIQUETA = arg('--etiqueta', 'r1');
const CALIDAD = arg('--calidad', 'bajo');
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi218'));
const ANCHO = 390, ALTO = 844, DPR = 3;
fs.mkdirSync(SALIDA, { recursive: true });

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi3q218-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

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
  if (r.exceptionDetails) { const d = r.exceptionDetails; console.error('  [exceptionDetails completo] ' + JSON.stringify(d).slice(0, 2000)); throw new Error('JS@' + (d.lineNumber != null ? d.lineNumber + ':' + d.columnNumber : '?') + ': ' + JSON.stringify(d.exception && d.exception.description || d.text).slice(0, 900)); }
  return r.result ? r.result.value : undefined;
}

// partida sembrada (igual que kimi1_qa110.js / kimi2_qa110.js): sin creador
const SEMILLA_SAVE_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi3-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;

const ENTRAR_JS = `(async () => { try { return await (async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene Jugar'; b.click();
    if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta'; }
  const S = window.AV && window.AV.state; if (!S || !S.profile || !S.profile.created) return 'sin perfil';
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(30000);
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 30000);
  const b = document.getElementById('c1-saltar'); if (b) b.click();
  await sleep(800);
  const f = document.getElementById('c1-fade'); if (f) f.remove();
  if (AV.G.ui && AV.G.ui.hideToast) AV.G.ui.hideToast();
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

// teleport + asentado + look.medir() + volcado de generadas + totales con/sin mipmaps
const TOMA_JS = `(async (px, pz, alt, mx, mz) => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
  const cuadro = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  S.pos.x = px; S.pos.z = pz; S.pos.y = G.terreno.height(px, pz) + alt; S.vy = 0;
  G.fisica.MOVE.flying = true;
  const yaw = Math.atan2(-(mx - px), -(mz - pz));
  G.camara.yaw = yaw; S.facing = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
  const ST = G.mundo && G.mundo.streaming;
  if (ST) { if (ST.alrededor) await ST.alrededor(px, pz); if (ST.terminar) await ST.terminar(); }
  if (G.solidos && G.solidos.terminar) G.solidos.terminar();
  await sleep(1500);
  G.camara.yaw = yaw; if (G.camara.place) G.camara.place(true);
  await cuadro(); await cuadro();
  let med = null, medErr = null;
  try { med = (AV.look && typeof AV.look.medir === 'function') ? AV.look.medir() : null; if (!med) medErr = 'AV.look=' + typeof AV.look; } catch (e) { medErr = String(e && e.message || e).slice(0, 200); }
  const R = G.renderer, vistas = new Set(), gen = [];
  let totalMB = 0, totalNoMipMB = 0;
  const SLOTS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'alphaMap', 'aoMap', 'bumpMap'];
  R.scene.traverse(o => { if (!o.material) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      for (const slot of SLOTS) { const t = m[slot]; if (!t || vistas.has(t)) continue; vistas.add(t);
        const img = t.image; const w = img && (img.width || (img.data && img.width)) || 0; const h = img && img.height || 0;
        if (!w) continue;
        const src = (img && (img.src || img.currentSrc)) || ''; 
        const b0 = w * h * 4, b = b0 * (t.generateMipmaps ? 4 / 3 : 1);
        totalMB += b; totalNoMipMB += b0;
        if (!src) { gen.push({ mesh: (o.name || '?').slice(0, 40), mat: (m.name || '?').slice(0, 30), slot, wh: w + 'x' + h, mb: Math.round(b / 104857.6) / 10, mbNoMip: Math.round(b0 / 104857.6) / 10, mip: !!t.generateMipmaps }); }
      }
    }});
  gen.sort((a, b) => b.mb - a.mb);
  return JSON.stringify({ pos: [Math.round(S.pos.x * 10) / 10, Math.round(S.pos.y * 100) / 100, Math.round(S.pos.z * 10) / 10],
    med, medErr, genadas: gen, genadasMB: Math.round(gen.reduce((s, g) => s + g.mb, 0) * 10) / 10,
    totalMB: Math.round(totalMB / 1048576 * 10) / 10, totalNoMipMB: Math.round(totalNoMipMB / 1048576 * 10) / 10 }) })`;

// encuadres de cerca para el criterio «sin que se vea pixelado»: corteza a ~3 m, pasto ~2,5 m y muro del kit ~4 m
const CERCA_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S, R = G.renderer, T = window.THREE;
  const cuadro = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const arbol = (m) => { const V = G.vegetacion, P = V && V.instancias, inf = V && V.info; if (!P || !P[m]) return null;
    let mejor = null, md = 1e9; const px = S.pos.x, pz = S.pos.z;
    for (let i = 0; i < P[m].n; i++) { const x = P[m].pos[i * 4], z = P[m].pos[i * 4 + 2]; const d = Math.hypot(x - px, z - pz); if (d < md) { md = d; mejor = { x, z, sc: P[m].pos[i * 4 + 3] }; } }
    return mejor && Object.assign(mejor, { info: inf[m] }); };
  const mirar = async (px, pz, alt, tx, tz, talt) => { S.pos.x = px; S.pos.z = pz; S.pos.y = G.terreno.height(px, pz) + alt; S.vy = 0; G.fisica.MOVE.flying = true;
    const yaw = Math.atan2(-(tx - px), -(tz - pz)); G.camara.yaw = yaw; S.facing = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
    if (G.camara.place) G.camara.place(true); await cuadro(); await cuadro(); };
  const out = {};
  // muro del kit a ~4 m: instancia más cercana de un lote muro_templo con material KB3D_/AV_Restaurado_ (objetivo fijo
  // para que el par bajo/medio sea el mismo muro; matriz por instancia, no la caja de todo el lote). Se ancla en la plaza.
  try {
    await mirar(-24, -127, 26, -4, -127, 20);
    const elegir = (filtro) => {
      let mejor = null, md = 1e9;
      R.scene.traverse(o => {
        if (!o.name || !/^edificiosInst/.test(o.name) || !o.material) return;
        if (filtro && !filtro.test(o.name)) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        const kit = mats.filter(m => /^(KB3D_|AV_Restaurado_)/.test(m.name || ''));
        if (!kit.length) return;
        const pts = [];
        if (o.isInstancedMesh) { const a = o.instanceMatrix.array; for (let i = 0; i < o.count; i++) pts.push([a[i * 16 + 12], a[i * 16 + 14]]); }
        else pts.push([o.position.x, o.position.z]);
        for (const [ix, iz] of pts) { const d = Math.hypot(ix - S.pos.x, iz - S.pos.z); if (d > 2 && d < md) { md = d; mejor = { x: ix, z: iz, nom: o.name, mats: kit.map(m => m.name).slice(0, 3) }; } }
      });
      return mejor && { m: mejor, md };
    };
    const elegido = elegir(/muro_templo/) || elegir(null);
    if (elegido) { const mejor = elegido.m, md = elegido.md, d = 4, cx = mejor.x, cz = mejor.z;
      const ux = (S.pos.x - cx), uz = (S.pos.z - cz), L = Math.hypot(ux, uz) || 1;
      const px = cx + ux / L * d, pz = cz + uz / L * d;
      await mirar(px, pz, 1.9, cx, cz, 2.2);
      out.muro = { nom: mejor.nom, mats: mejor.mats, d, distReal: Math.round(md * 10) / 10, pos: [Math.round(px * 10) / 10, Math.round(pz * 10) / 10] }; }
  } catch (e) { out.muroErr = String(e && e.message || e).slice(0, 120); }
  const c = arbol('palma_sierra') || arbol('tabonuco') || arbol('flamboyan') || arbol('ceiba');
  if (c) { const d = 3;
    await mirar(c.x + d, c.z, 1.9, c.x, c.z, 2.4);
    out.corteza = { arbol: c.especie, d, pos: [Math.round(c.x * 10) / 10, Math.round(c.z * 10) / 10] }; }
  if (c) { const px = S.pos.x, pz = S.pos.z; S.pos.y = G.terreno.height(px, pz) + 2.3;
    const yaw = G.camara.yaw; const tx = px - Math.sin(yaw) * 3, tz = pz - Math.cos(yaw) * 3;
    G.camara.pitch = -0.9; if (G.camara.place) G.camara.place(true); await cuadro(); await cuadro();
    out.pasto = { pos: [Math.round(tx * 10) / 10, Math.round(tz * 10) / 10] }; }
  return JSON.stringify(out) })`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3q218-'));
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

async function abrirJuego(cdp, origen, calidad) {
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
  try { await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses); } catch (e) { }
  try { await cdp.call('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }, ses); } catch (e) { }
  try { await cdp.call('Emulation.setCPUThrottlingRate', { rate: 4 }, ses); } catch (e) { }
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&calidad=${calidad}` }, ses);
  const t0 = Date.now(); let listo = false;
  while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
    try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
    await cdp.bombear(0.5);
  }
  if (!listo) throw new Error('el juego no arrancó (calidad ' + calidad + ')');
  const r = await evaluar(cdp, ses, ENTRAR_JS, 90);
  if (!/^ok/.test(r)) throw new Error('entrada: ' + r);
  return { ses, tid };
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const res = { etiqueta: ETIQUETA, pantalla: `${ANCHO}x${ALTO}@${DPR} cpuX4`, calidad: CALIDAD, tomas: {} };
  const pref = `kimi3_218_${ETIQUETA}_${CALIDAD}`;
  try {
    console.log(`· calidad=${CALIDAD}:`);
    const { ses, tid } = await abrirJuego(cdp, origen, CALIDAD);
    const ctrl = JSON.parse(await evaluar(cdp, ses, `(${TOMA_JS})(-8, -2.5, 8, -8, -30)`, 240));
    await cdp.bombear(0.3);
    fs.writeFileSync(path.join(SALIDA, `${pref}_villa.jpg`), Buffer.from((await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 60000)).data, 'base64'));
    console.log(`  villa: texturas=${ctrl.med.texturasMB} MB (sinMip=${ctrl.totalNoMipMB}) gen=${ctrl.genadasMB} MB flora=${ctrl.med.texturasPor.flora} MB calls=${ctrl.med.calls} tris=${ctrl.med.triangulos} heap=${ctrl.med.heapMB} MB`);
    const city = JSON.parse(await evaluar(cdp, ses, `(${TOMA_JS})(-33, -136, 30, -4, -127)`, 300));
    await cdp.bombear(0.3);
    fs.writeFileSync(path.join(SALIDA, `${pref}_ciudad.jpg`), Buffer.from((await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 60000)).data, 'base64'));
    console.log(`  ciudad: texturas=${city.med.texturasMB} MB (sinMip=${city.totalNoMipMB}) gen=${city.genadasMB} MB flora=${city.med.texturasPor.flora} MB calls=${city.med.calls} tris=${city.med.triangulos} heap=${city.med.heapMB} MB`);
    const cerca = JSON.parse(await evaluar(cdp, ses, `(${CERCA_JS})()`, 90));
    res.cerca = cerca;
    if (cerca.muro) {
      fs.writeFileSync(path.join(SALIDA, `${pref}_muro.jpg`), Buffer.from((await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 90 }, ses, 60000)).data, 'base64'));
      console.log(`  muro: ${JSON.stringify(cerca.muro)}`);
    }
    if (cerca.corteza) {
      fs.writeFileSync(path.join(SALIDA, `${pref}_corteza.jpg`), Buffer.from((await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 90 }, ses, 60000)).data, 'base64'));
      console.log(`  corteza: ${JSON.stringify(cerca.corteza)}`);
    }
    if (cerca.pasto) {
      await evaluar(cdp, ses, `(async()=>{const sleep=ms=>new Promise(r=>setTimeout(r,ms));await sleep(400);return 1})()`, 10);
      fs.writeFileSync(path.join(SALIDA, `${pref}_pasto.jpg`), Buffer.from((await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 90 }, ses, 60000)).data, 'base64'));
      console.log(`  pasto: ${JSON.stringify(cerca.pasto)}`);
    }
    const errs = await evaluar(cdp, ses, `(window.AV && AV.G && AV.G.logErrores ? AV.G.logErrores() : (window.__erroresConsola || []).length)`, 15);
    res.tomas = { villa: ctrl, ciudad: city };
    res.errores = errs;
    console.log(`  errores de consola: ${errs}`);
    await cdp.call('Target.closeTarget', { targetId: tid }).catch(() => { });
  } finally {
    chrome.kill(); srv.close();
  }
  fs.writeFileSync(path.join(SALIDA, `kimi3_218_${ETIQUETA}.json`), JSON.stringify(res, null, 1));
  console.log('· JSON: ' + path.join(SALIDA, `kimi3_218_${ETIQUETA}.json`));
  process.exit(0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
