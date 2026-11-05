#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-087: pulido visual de la Sombra de Tormenta (V18.1).
   Mide con GPU real: AV.v18AmenazaTest en vivo, números FPS/draw calls/tris/heap con la nube en
   lucha, y capturas deterministas (render síncrono + readPixels) de los 3 estados: base, aviso
   y rayo (flash de acierto). A/B contra HEAD: con --antes el servidor sirve src/game/v18/amenaza.js
   tal como está en HEAD (git show) y todo lo demás igual.
   La herramienta NO toca el juego.
   Uso: node tools/build/kimi3_087.js --etiqueta r1 [--antes] [--pantalla pc|movil] [--cpu 1|4]
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
const CPU = parseInt(arg('--cpu', '1'), 10);
const PANTALLA = arg('--pantalla', 'pc');
const PERFILES = {
  movil: { w: 390, h: 844, dpr: 3, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
  pc: { w: 1600, h: 900, dpr: 1, ua: '' },
};
const PF = PERFILES[PANTALLA] || PERFILES.pc;
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi087'));
fs.mkdirSync(SALIDA, { recursive: true });

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi3k87-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

const AMENAZA_HEAD = ANTES ? execSync('git show HEAD:src/game/v18/amenaza.js', { cwd: RAIZ, maxBuffer: 4e6 }).toString() : null;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    if (ANTES && p === '/src/game/v18/amenaza.js') { res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' }); return res.end(AMENAZA_HEAD); }
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
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi3k87-' + Math.random().toString(36).slice(2, 10),
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

// Prueba oficial + medición con la nube en lucha (FPS/calls/tris/heap)
const MEDICION_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G;
  const out = { v18: G.V18 };
  const asentado = async () => { const t0 = performance.now();
    while (performance.now() - t0 < 20000) { try { const s = G.renderer.stats(); if (s.calls > 10) { await new Promise(r => requestAnimationFrame(r)); if (G.renderer.stats().calls > 10) return true; } } catch (e) {} await sleep(250); }
    return false; };
  out.asentado = await asentado();
  const test = await AV.v18AmenazaTest();
  out.amenaza = { passed: test.passed, total: test.total, fallos: test.results.filter(r => !r.ok).map(r => r.name + ' :: ' + r.extra) };
  // lucha real para medir
  const AM = G.v18amenaza, V = G.v18;
  try { V.borrar(); V.recargar(); } catch (e) {}
  const ok = AM.iniciar({ especie: 'vittata', forzar: true, sinEspera: true });
  out.inicio = ok && AM.estado().fase === 'lucha';
  const c = AM.centro, H = (x, z) => G.terreno.height(x, z);
  G.quiet = false;
  G.S.pos.x = c.x + 7; G.S.pos.z = c.z + 2; G.S.pos.y = H(G.S.pos.x, G.S.pos.z) + 1;
  for (let i = 0; i < 20; i++) AM.paso(1 / 30);
  const stats = () => { try { const s = G.renderer.stats(); return { calls: s.calls, tris: s.triangulos }; } catch (e) { return {}; } };
  const medir = async s => { const t0 = performance.now(); let n = 0, peor = 0, ant = t0;
    while (performance.now() - t0 < s * 1000) { await new Promise(r => requestAnimationFrame(r)); const a = performance.now(); if (n) peor = Math.max(peor, a - ant); ant = a; n++; }
    return { fps: Math.round((n - 1) / ((performance.now() - t0) / 1000) * 10) / 10, peorMs: Math.round(peor) }; };
  out.statsLucha = stats();
  out.fpsLucha = await medir(3);
  out.heapLucha = (performance.memory && performance.memory.usedJSHeapSize) ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
  return JSON.stringify(out); })()`;

// Captura de un estado: cámara fija mirando al centro de la nube, render síncrono + readPixels (sin carrera de lienzo)
const FOTO_JS = (prep) => `(function () {
  const G = AV.G, AM = G.v18amenaza, S = G.S;
  const c = AM.centro, H = (x, z) => G.terreno.height(x, z);
  S.pos.x = c.x + 7; S.pos.z = c.z + 2; S.pos.y = H(S.pos.x, S.pos.z) + 1;
  AM.estado().pos.x = c.x; AM.estado().pos.z = c.z; AM.estado().pos.y = H(c.x, c.z) + 5.5; // encuadre determinista: la nube no deriva entre estados
  for (let i = 0; i < 6; i++) AM.paso(1 / 30);
  ${prep}
  for (let i = 0; i < 2; i++) AM.paso(1 / 60);
  const cy = H(c.x, c.z) + 5.5;
  const cam = G.renderer.camera;
  cam.up.set(0, 1, 0); cam.position.set(c.x + 9.5, cy + 2.2, c.z + 9.5); cam.lookAt(c.x, cy, c.z);
  cam.updateMatrixWorld(true);
  G.renderer.renderer.render(G.renderer.scene, cam);
  const gl = G.renderer.renderer.getContext();
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
  const buf = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const cx2 = cv.getContext('2d'); const img = cx2.createImageData(w, h);
  for (let y = 0; y < h; y++) img.data.set(buf.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
  cx2.putImageData(img, 0, 0);
  const A = AM.estado();
  const info = G.renderer.renderer.info;
  const niebla = G.renderer.scene.getObjectByName('v18_sombra'), ojos = G.renderer.scene.getObjectByName('v18_sombra_ojos');
  const v = new THREE.Vector3(A.pos.x, A.pos.y, A.pos.z).project(cam);
  const px = Math.max(0, Math.min(w - 1, Math.round((v.x * 0.5 + 0.5) * w))), py = Math.max(0, Math.min(h - 1, Math.round((-v.y * 0.5 + 0.5) * h)));
  const off = (py * w + px) * 4;
  return JSON.stringify({ foto: cv.toDataURL('image/jpeg', 0.9), diag: { fase: A.fase, aviso: +A.avisoT.toFixed(2), flash: +A.flash.toFixed(2),
    calls: info.render.calls, tris: info.render.triangles,
    nVis: niebla && niebla.visible, oVis: ojos && ojos.visible, nCount: niebla && niebla.count,
    nPos: [+A.pos.x.toFixed(1), +A.pos.y.toFixed(1), +A.pos.z.toFixed(1)], centro: [+c.x.toFixed(1), +c.z.toFixed(1)],
    ndc: [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(3)], altura: +H(c.x, c.z).toFixed(1),
    pxColor: [buf[off], buf[off + 1], buf[off + 2]], matTipo: niebla && niebla.material && niebla.material.type, matColor: niebla && niebla.material && niebla.material.color && niebla.material.color.getHexString() } });
})()`;
const ESTADOS = [
  ['base', ''],
  ['aviso', 'AM.estado().avisoT = 1; AM.estado().pendientes = 1;'],
  ['rayo', 'AM.estado().flash = 0.3;'],
];

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3k87-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    `--window-size=${PF.w},${PF.h}`, 'about:blank'];
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi3k87-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const res = { etiqueta: ETIQUETA + (ANTES ? '-antes' : '-despues'), pantalla: `${PANTALLA} ${PF.w}x${PF.h}@${PF.dpr} cpuX${CPU}`, head: null, fotos: {} };
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: PF.w, height: PF.h, deviceScaleFactor: PF.dpr, mobile: PANTALLA !== 'pc' }, ses);
    if (PANTALLA !== 'pc') { try { await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses); } catch (e) { } }
    if (PF.ua) { try { await cdp.call('Emulation.setUserAgentOverride', { userAgent: PF.ua }, ses); } catch (e) { } }
    try { await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses); } catch (e) { }
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&calidad=medio&v18=1` }, ses);
    const t0 = Date.now(); let listo = false;
    while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
      await cdp.bombear(0.5);
    }
    if (!listo) throw new Error('el juego no arrancó');
    const ent = await evaluar(cdp, ses, ENTRAR_JS, 120);
    if (!/^ok/.test(ent)) throw new Error('entrada: ' + ent);
    res.head = await evaluar(cdp, ses, `(() => { try { return (AV.G.build && (AV.G.build.commit || AV.G.build.id)) || 'desconocido'; } catch (e) { return 'desconocido'; } })()`, 10);
    res.medicion = JSON.parse(await evaluar(cdp, ses, MEDICION_JS, 240));
    if (process.argv.includes('--diag')) {
      res.diag = JSON.parse(await evaluar(cdp, ses, `(function () {
        const G = AV.G, AM = G.v18amenaza, sc = G.renderer.scene, cam = G.renderer.camera;
        const n = sc.getObjectByName('v18_sombra');
        const A = AM.estado();
        const m = n.instanceMatrix.array.slice(0, 16).map(x => +x.toFixed(2));
        let cadena = [], p = n; while (p) { cadena.push((p.name || p.type) + ':' + (p.visible ? 'v' : 'X')); p = p.parent; }
        // cubo de control opaco rojo exactamente en A.pos
        const cubo = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
        cubo.position.set(A.pos.x, A.pos.y, A.pos.z); sc.add(cubo);
        cam.up.set(0, 1, 0); cam.position.set(A.pos.x + 9, A.pos.y + 2, A.pos.z + 9); cam.lookAt(A.pos.x, A.pos.y, A.pos.z);
        cam.updateMatrixWorld(true);
        G.renderer.renderer.render(sc, cam);
        const gl = G.renderer.renderer.getContext(); const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
        const buf = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
        const v = new THREE.Vector3(A.pos.x, A.pos.y, A.pos.z).project(cam);
        const px = Math.round((v.x * 0.5 + 0.5) * w), py = Math.round((-v.y * 0.5 + 0.5) * h), off = (py * w + px) * 4;
        const info = G.renderer.renderer.info;
        return JSON.stringify({ mismaEscena: n.parent === sc, mat16: m, cadenaVisibles: cadena.join(' < '),
          layersN: n.layers.mask, layersCam: cam.layers.mask, geoTipo: n.geometry.type,
          drawRange: n.geometry.drawRange.count, pxCubo: [buf[off], buf[off + 1], buf[off + 2]],
          calls: info.render.calls, tris: info.render.triangles, version: info.render.frame,
          countProp: n.count, matrixWorldOk: n.matrixWorld.elements.slice(12, 15).map(x => +x.toFixed(1)) });
      })()`, 60));
    }
    for (const [nombre, prep] of ESTADOS) {
      try {
        const r = JSON.parse(await evaluar(cdp, ses, FOTO_JS(prep), 60));
        if (r && r.foto) {
          fs.writeFileSync(path.join(SALIDA, `k087_${ETIQUETA}${ANTES ? '_antes' : ''}_${nombre}.jpg`), Buffer.from(r.foto.split(',')[1], 'base64'));
          res.fotos[nombre] = r.diag;
        } else res.fotos[nombre] = { error: 'sin foto' };
      } catch (e) { res.fotos[nombre] = { error: String(e && e.message || e).slice(0, 200) }; }
    }
    res.erroresConsola = await evaluar(cdp, ses, `(window.AV && AV.G && AV.G.consoleErrores) ? AV.G.consoleErrores.slice(0, 10) : []`, 10);
  } catch (e) {
    res.error = String(e && e.message || e);
  }
  fs.writeFileSync(path.join(SALIDA, `k087_${ETIQUETA}${ANTES ? '_antes' : ''}.json`), JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res, null, 1));
  try { chrome.kill('SIGKILL'); } catch (e) { }
  mataPorPerfil();
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close();
  const m = res.medicion || {};
  process.exit(res.error && !(m.amenaza && m.amenaza.passed === m.amenaza.total) ? 1 : 0);
})();
