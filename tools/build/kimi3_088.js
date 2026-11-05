#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-088: verificación del patrón QA-170 muerto en todas partes.
   Tras KIMI-087, cullPequenos respeta frustumCulled===false. Esta herramienta lo DEMUESTRA con píxeles
   (GPU real) en las 3 familias que antes solo llevaban frustumCulled=false (sinCulling se respetaba ya):
     1) FX de poderes (fx_poderes.js: anillos + plumas) en la explanada del duelo (176,175 · ~248 m del origen)
     2) bandada (bandada.js: cerca+lejos) sobre la Ciudad de los 36 (12,-114,8 · ~115 m del origen)
     3) vecinos (vecinos.js) en Villa Raíz (134,182,5 · ~226 m del origen)
   Método por escenario: teleportar a Vittata, esperar a que cullPequenos evalúe con la cámara del juego
   (~1,6 s), y hacer A/B de píxeles con render síncrono: la malla en capa 0 vs capa 31 (ROI alrededor de la
   posición proyectada del sujeto). Si la malla contribuye píxeles (dif ≥ umbral) y layers.mask===1 → VISIBLE.
   Con --antes el servidor sirve src/engine/renderer.js de eab1f18a^ (pre-fix de QA-170): lo normal es que
   las familias con solo frustumCulled=false salgan CULPADAS (dif≈0, capas=2^31) = la demo de hoy habría
   peleado a ciegas en bajo/medio.
   La herramienta NO toca el juego.
   Uso: node tools/build/kimi3_088.js --etiqueta r1 --calidad bajo|medio [--antes]
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ETIQUETA = arg('--etiqueta', 'r1');
const ANTES = process.argv.includes('--antes');
const CALIDAD = arg('--calidad', 'bajo');
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi088'));
fs.mkdirSync(SALIDA, { recursive: true });

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi3k88-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

const RENDERER_PREFIJO = ANTES ? execSync('git show "eab1f18a^:src/engine/renderer.js"', { cwd: RAIZ, maxBuffer: 8e6 }).toString() : null;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    if (ANTES && p === '/src/engine/renderer.js') { res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' }); return res.end(RENDERER_PREFIJO); }
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
  if (r.exceptionDetails) { const d = r.exceptionDetails; throw new Error('JS@' + (d.lineNumber != null ? d.lineNumber + ':' + d.columnNumber : '?') + ': ' + JSON.stringify(d.exception && d.exception.description || d.text).slice(0, 900)); }
  return r.result ? r.result.value : undefined;
}

const SEMILLA_SAVE_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi3k88-' + Math.random().toString(36).slice(2, 10),
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
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 45000);
  const b = document.getElementById('c1-saltar'); if (b) b.click();
  await sleep(800);
  const f = document.getElementById('c1-fade'); if (f) f.remove();
  if (AV.G.ui && AV.G.ui.hideToast) AV.G.ui.hideToast();
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

// Escenarios: FX en la explanada del duelo, bandada en la ciudad, vecinos en la villa.
// A/B de píxeles por escenario (malla en capa 0 vs capa 31, render síncrono, ROI en la posición proyectada).
const ESCENARIOS_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms));
  const AV = window.AV, G = AV.G, S = G.S, sc = G.renderer.scene, R3 = G.renderer.renderer;
  const H = (x, z) => G.terreno.height(x, z);
  const out = { calidad: (G.renderer.calidad && G.renderer.calidad.nivel) || '?', v18: !!G.V18, escenarios: {} };
  const dOrigen = (x, z) => Math.round(Math.hypot(x, z));
  // Los módulos de mundo vivo cargan al primer gesto (boot.js alPrimerGesto): los forzamos como hace aDemanda
  const cargar = (src, fab) => (window.AVE && AVE.assets ? AVE.assets.script(src) : Promise.reject(new Error('sin AVE.assets'))).then(() => window[fab](G));
  try {
    await Promise.all([
      cargar('src/game/v18/fx_poderes.js', 'AVV18Fx'),
      cargar('src/game/bandada.js', 'AVBandada'),
      cargar('src/game/vecinos.js', 'AVVecinos'),
    ]);
    out.modulos = { v18fx: !!G.v18fx, bandada: !!G.bandada, vecinos: !!G.vecinos };
  } catch (e) { out.modulos = { error: String(e && e.message || e).slice(0, 200) }; }
  await sleep(600);

  async function ir(x, z, alto) {
    S.pos.x = x; S.pos.z = z; S.pos.y = H(x, z) + (alto || 1);
    if (S.vel) { S.vel.x = 0; S.vel.z = 0; }
    await sleep(1700); // deja que cullPequenos reevalúe con la cámara del juego aquí (~100 cuadros)
  }

  // Punto de mira: la posición REAL de la instancia 0 (la malla ya la escribió dibujar/paso del juego)
  function posInstancia(m, i) {
    const d = new THREE.Object3D();
    m.getMatrixAt(i || 0, d.matrix);
    return new THREE.Vector3().setFromMatrixPosition(d.matrix);
  }
  // Centro medio de las instancias activas (nube de plumas, bando...)
  function centroInstancias(m) {
    const v = new THREE.Vector3(), s = new THREE.Vector3();
    const n = Math.min(m.count || 0, 8);
    for (let i = 0; i < n; i++) { v.add(posInstancia(m, i)); }
    return n ? v.multiplyScalar(1 / n) : null;
  }

  function ab(meshes, worldPos, opt) {
    opt = opt || {};
    const cam = G.renderer.camera, gl = R3.getContext();
    const roi = opt.roi || 52;
    // Cámara en los ojos de Vittata (garantiza línea de visión abierta; el sitio ya lo validó el juego)
    cam.up.set(0, 1, 0);
    cam.position.set(S.pos.x, S.pos.y + 1.8, S.pos.z);
    cam.lookAt(worldPos.x, worldPos.y, worldPos.z);
    cam.updateMatrixWorld(true);
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const v = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z).project(cam);
    const cx = Math.max(0, Math.min(w - 1, Math.round((v.x * 0.5 + 0.5) * w)));
    const cy = Math.max(0, Math.min(h - 1, Math.round((-v.y * 0.5 + 0.5) * h)));
    const visibles = meshes.filter(Boolean);
    const capas = visibles.map(m => m.layers.mask);
    const leer = () => {
      R3.render(sc, cam);
      const buf = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      return buf;
    };
    const foto = (buf) => {
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const c2 = cv.getContext('2d'), img = c2.createImageData(w, h);
      for (let y = 0; y < h; y++) img.data.set(buf.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
      c2.putImageData(img, 0, 0);
      return cv.toDataURL('image/jpeg', 0.85);
    };
    // «con» = el estado de capas TAL COMO LO DEJÓ EL JUEGO (no forzamos nada): si cullPequenos la mandó a
    // la capa 31, aquí no se dibuja y el A/B da dif≈0 = INVISIBLE. «sin» = la misma escena sin la malla.
    const con = leer();
    const callsCon = R3.info.render.calls;
    visibles.forEach(m => m.layers.set(31));
    const sin = leer();
    const callsSin = R3.info.render.calls;
    visibles.forEach((m, i) => { m.layers.mask = capas[i]; });
    let dif = 0;
    for (let y = Math.max(0, cy - roi); y < Math.min(h, cy + roi); y++)
      for (let x = Math.max(0, cx - roi); x < Math.min(w, cx + roi); x++) {
        const o = (y * w + x) * 4;
        if (Math.abs(con[o] - sin[o]) > 12 || Math.abs(con[o + 1] - sin[o + 1]) > 12 || Math.abs(con[o + 2] - sin[o + 2]) > 12) dif++;
      }
    return { dif, capas, callsCon, callsSin, dibuja: callsCon - callsSin, count: visibles.map(m => m.count), enCuadro: (Math.abs(v.x) < 0.95 && Math.abs(v.y) < 0.95),
      distOrigenCam: dOrigen(cam.position.x, cam.position.z), foto: foto(con) };
  }

  // ---- 1) FX de poderes en la explanada del duelo ----
  try {
    const st = (G.v18combate && G.v18combate.sitio) || { x: 176, z: 175 };
    await ir(st.x, st.z, 1.2);
    const y0 = H(st.x, st.z);
    const FX = (G.v18fx && G.v18fx._interno) || {};
    const pos = { x: st.x + 3, y: y0 + 1.6, z: st.z + 3 };
    const rEsc = G.v18fx.escudo({ id: 'k88', pos: { x: pos.x, y: pos.y, z: pos.z } }, 120);
    for (let i = 0; i < 10; i++) G.v18fx.paso(0.06);
    const rOnda = G.v18fx.onda({ x: pos.x, y: pos.y, z: pos.z }, { x: 0.3, y: 0, z: 1 }, 10);
    for (let i = 0; i < 5; i++) G.v18fx.paso(0.05);
    const plumas = ab([FX.plumas], centroInstancias(FX.plumas) || pos, { roi: 96 });
    const rings = ab([FX.rings], { x: pos.x, y: pos.y + 0.6, z: pos.z + 1.5 }, { roi: 64 });
    out.escenarios.fx = { sitio: [st.x, st.z], distOrigen: dOrigen(st.x, st.z), escudo: rEsc, onda: rOnda,
      plumas: { dif: plumas.dif, capas: plumas.capas, count: plumas.count, dibuja: plumas.dibuja, enCuadro: plumas.enCuadro, distOrigenCam: plumas.distOrigenCam },
      anillos: { dif: rings.dif, capas: rings.capas, count: rings.count, dibuja: rings.dibuja, enCuadro: rings.enCuadro, distOrigenCam: rings.distOrigenCam },
      fotoPlumas: plumas.foto, fotoAnillos: rings.foto };
  } catch (e) { out.escenarios.fx = { error: String(e && e.message || e).slice(0, 300) }; }

    // ---- 2) bandada en un claro lejos del origen (la explanada del duelo: abierta, 248 m del origen;
  //         la plaza de la ciudad queda entre muros y la pared tapaba el bando en el A/B) ----
  try {
    const st2 = (G.v18combate && G.v18combate.sitio) || { x: 176, z: 175 };
    await ir(st2.x - 14, st2.z - 10, 1.2);
    const okB = G.bandada.aparecer('tarde', { forzar: true, n: 5, dist: 45, ang: 1.1 });
    await sleep(400);
    const F = G.bandada.F;
    // bando quieto y extendido de 4 m, 8 m delante de Vittata (el vuelo real sigue tras la medición)
    if (F && F.aves) F.aves.forEach((a, i) => {
      const k = i / Math.max(1, F.aves.length - 1);
      a.x = S.pos.x + 6 - 2 + k * 4; a.z = S.pos.z + 6; a.y = H(S.pos.x + 6, S.pos.z + 6) + 4 + (i % 2) * 0.5;
      a.tx = a.x; a.ty = a.y; a.tz = a.z; a.vx = 0; a.vz = 0;
    });
    if (F && F.lider) { F.lider.x = S.pos.x + 6; F.lider.z = S.pos.z + 6; F.lider.y = H(S.pos.x + 6, S.pos.z + 6) + 4; F.lider.vx = 0; F.lider.vz = 0; }
    await sleep(350);
    const meshes = sc.children.filter(o => o.name === 'bandada' && o.isInstancedMesh);
    // el punto de mira sale de la instancia dibujada (no de la consigna: la formación viva la mueve)
    let wp = null;
    for (const m of meshes) if (!wp && m.count > 0) wp = centroInstancias(m);
    if (!wp) wp = { x: S.pos.x + 6, y: H(S.pos.x + 6, S.pos.z + 6) + 4, z: S.pos.z + 6 };
    const r = ab(meshes, wp, { roi: 72 });
    out.escenarios.bandada = { aparecio: okB, estado: G.bandada.estado && G.bandada.estado(), sitio: [Math.round(st2.x - 14), Math.round(st2.z - 10)], distOrigen: dOrigen(st2.x - 14, st2.z - 10),
      wp: [Math.round(wp.x), Math.round(wp.y * 10) / 10, Math.round(wp.z)],
      dif: r.dif, capas: r.capas, count: r.count, dibuja: r.dibuja, enCuadro: r.enCuadro, distOrigenCam: r.distOrigenCam, foto: r.foto };
  } catch (e) { out.escenarios.bandada = { error: String(e && e.message || e).slice(0, 300) }; }

  // ---- 3) vecinos en Villa Raíz ----
  try {
    await ir(134, 182.5, 1.2);
    const vm = sc.getObjectByName('vecinos');
    const estadoV = G.vecinos && G.vecinos.estado && G.vecinos.estado();
    if (vm && vm.count > 0) {
      // vecino en TIERRA (algunas instancias pueden estar de paso sobre la bahía): elegimos la primera con terreno >1 m
      let w0 = null, i0 = 0;
      for (let i = 0; i < vm.count; i++) {
        const p = posInstancia(vm, i);
        if (H(p.x, p.z) > 1) { w0 = p; i0 = i; break; }
      }
      if (!w0) { w0 = posInstancia(vm, 0); i0 = 0; }
      // Vittata a 1,4 m del bicho (11 cm: hay que acercarse para el A/B de píxeles) y cullPequenos reevalúa
      S.pos.x = w0.x + 1.2; S.pos.z = w0.z + 0.7; S.pos.y = H(S.pos.x, S.pos.z) + 1;
      if (S.vel) { S.vel.x = 0; S.vel.z = 0; }
      await sleep(700);
      const wp = posInstancia(vm, i0);
      const r = ab([vm], wp, { roi: 110 });
      out.escenarios.vecinos = { estado: estadoV, n: vm.count, pos: [Math.round(wp.x), Math.round(wp.z)], terreno: +H(wp.x, wp.z).toFixed(1), distOrigen: dOrigen(wp.x, wp.z),
        dif: r.dif, capas: r.capas, count: r.count, dibuja: r.dibuja, enCuadro: r.enCuadro, distOrigenCam: r.distOrigenCam, foto: r.foto };
    } else out.escenarios.vecinos = { estado: estadoV, n: vm && vm.count, nota: 'sin instancias que medir' };
  } catch (e) { out.escenarios.vecinos = { error: String(e && e.message || e).slice(0, 300) }; }

  out.erroresConsola = (G.consoleErrores || []).slice(0, 10);
  out.heapMB = (performance.memory && performance.memory.usedJSHeapSize) ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
  const s = G.renderer.stats();
  out.calls = s.calls; out.tris = s.triangulos;
  return JSON.stringify(out); })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3k88-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--window-size=1600,900', 'about:blank'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 150; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools en 30 s: ' + err.slice(0, 300));
}
function mataPorPerfil() {
  try {
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi3k88-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const suf = ETIQUETA + (ANTES ? '-antes' : '-despues') + '-' + CALIDAD;
  const res = { etiqueta: suf, head: null };
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&calidad=${CALIDAD}&v18=1` }, ses);
    const t0 = Date.now(); let listo = false;
    while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
      await cdp.bombear(0.5);
    }
    if (!listo) throw new Error('el juego no arrancó');
    const ent = await evaluar(cdp, ses, ENTRAR_JS, 120);
    if (!/^ok/.test(ent)) throw new Error('entrada: ' + ent);
    res.head = await evaluar(cdp, ses, `(() => { try { return (AV.G.build && (AV.G.build.commit || AV.G.build.id)) || 'desconocido'; } catch (e) { return 'desconocido'; } })()`, 10);
    const r = JSON.parse(await evaluar(cdp, ses, ESCENARIOS_JS, 180));
    res.resultado = r;
    // fotos
    const guarda = (foto, nombre) => { if (foto) fs.writeFileSync(path.join(SALIDA, `k088_${suf}_${nombre}.jpg`), Buffer.from(foto.split(',')[1], 'base64')); };
    if (r.escenarios) {
      guarda(r.escenarios.fx && r.escenarios.fx.fotoPlumas, 'fx_plumas');
      guarda(r.escenarios.fx && r.escenarios.fx.fotoAnillos, 'fx_anillos');
      guarda(r.escenarios.bandada && r.escenarios.bandada.foto, 'bandada');
      guarda(r.escenarios.vecinos && r.escenarios.vecinos.foto, 'vecinos');
    }
    if (r.escenarios && r.escenarios.fx) { delete r.escenarios.fx.fotoPlumas; delete r.escenarios.fx.fotoAnillos; }
    if (r.escenarios && r.escenarios.bandada) delete r.escenarios.bandada.foto;
    if (r.escenarios && r.escenarios.vecinos) delete r.escenarios.vecinos.foto;
  } catch (e) {
    res.error = String(e && e.message || e);
  }
  fs.writeFileSync(path.join(SALIDA, `k088_${suf}.json`), JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res, null, 1));
  try { chrome.kill('SIGKILL'); } catch (e) { }
  mataPorPerfil();
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close();
  process.exit(res.error ? 1 : 0);
})();
