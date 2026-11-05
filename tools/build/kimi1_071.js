#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-071: franja gris en el horizonte de noche
   (cap. 5, Los Miradores). Reproducción con GPU real:
     1) entrada sembrada sin creador, ?cap=5 (mapa real de noche, permiso 'noche');
     2) encuadres desde la cumbre del tepuy / Los Miradores / aire, barrido de yaw;
     3) captura CDP + análisis por filas de píxeles (bandas grisáceas continuas)
        + volcado del estado del cielo (uniformes del domo, niebla, far, escala).
   Uso: node tools/build/kimi1_071.js --etiqueta r1 [--yaw 0] [--vista cumbre|miradores|aire|todas]
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
const VISTA = arg('--vista', 'todas');
const PACK = arg('--pack', 'ep5');
const SOLO_YAW = arg('--yaw', null);
const ANCHO = 1600, ALTO = 900;
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi071'));
fs.mkdirSync(SALIDA, { recursive: true });

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi1p-/.test(d)) continue;
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
  if (r.exceptionDetails) { const d = r.exceptionDetails; throw new Error('JS@' + (d.lineNumber != null ? d.lineNumber + ':' + d.columnNumber : '?') + ': ' + JSON.stringify(d.exception && d.exception.description || d.text).slice(0, 900)); }
  return r.result ? r.result.value : undefined;
}

const SEMILLA_SAVE_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1p-' + Math.random().toString(36).slice(2, 10),
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
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 60000);
  const b = document.getElementById('c1-saltar'); if (b) b.click();
  await sleep(800);
  const f = document.getElementById('c1-fade'); if (f) f.remove();
  if (AV.G.ui && AV.G.ui.hideToast) AV.G.ui.hideToast();
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

// fija posición/cámara, asienta el streaming y vuelca el estado del cielo
const MIRAR_JS = `(async (px, pz, alt, yaw) => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
  const cuadro = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const fijar = () => { S.pos.x = px; S.pos.z = pz; S.pos.y = G.terreno.height(px, pz) + alt; S.vy = 0; G.fisica.MOVE.flying = true;
    G.camara.yaw = yaw; S.facing = { x: -Math.sin(yaw), z: -Math.cos(yaw) }; };
  fijar();
  const ST = G.mundo && G.mundo.streaming;
  if (ST) { if (ST.alrededor) await ST.alrededor(px, pz); if (ST.terminar) await ST.terminar(); }
  if (G.solidos && G.solidos.terminar) G.solidos.terminar();
  await sleep(1800);
  fijar();
  if (G.camara.place) G.camara.place(true);
  await cuadro(); await cuadro(); await cuadro();
  const st = (() => { try { return G.renderer.stats(); } catch (e) { return {}; } })();
  const R = G.renderer;
  const fog = R.scene && R.scene.fog;
  const skyMesh = R.sky || null;
  const sky = skyMesh && skyMesh.material && skyMesh.material.uniforms ? skyMesh.material.uniforms : null;
  const cielo = {
    uCenit: sky && sky.uCenit ? '#' + sky.uCenit.value.getHexString() : null,
    uHorizonte: sky && sky.uHorizonte ? '#' + sky.uHorizonte.value.getHexString() : null,
    uSolCol: sky && sky.uSolCol ? '#' + sky.uSolCol.value.getHexString() : null,
    uSolDir: sky && sky.uSolDir ? [Math.round(sky.uSolDir.value.x * 100) / 100, Math.round(sky.uSolDir.value.y * 100) / 100, Math.round(sky.uSolDir.value.z * 100) / 100] : null,
  };
  return JSON.stringify({ pos: [Math.round(S.pos.x * 10) / 10, Math.round(S.pos.y * 100) / 100, Math.round(S.pos.z * 10) / 10], yaw: Math.round(yaw * 1000) / 1000,
    calls: st.calls != null ? st.calls : null, ktris: st.triangulos != null ? Math.round(st.triangulos / 1000) : null, fps: st.fps != null ? st.fps : null,
    cielo, niebla: fog ? { near: fog.near, far: fog.far, color: '#' + fog.color.getHexString() } : null,
    farCam: R.camera ? R.camera.far : null, cieloEscala: skyMesh ? Math.round(skyMesh.scale.x) : null,
    hora: S.hora != null ? S.hora : null, permiso: (G.mundo && G.mundo.datos && G.mundo.datos.cielo && G.mundo.datos.cielo.permiso) || null }); })`;

// análisis por filas de la captura (PNG en data URL, decodificado en la propia página)
const ANALIZA_JS = `(async (b64) => { try {
  const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
  const w = img.width, h = img.height;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, w, h).data;
  const filas = [];
  for (let y = 0; y < h; y += 2) {
    let r = 0, gg = 0, b = 0;
    const i0 = y * w * 4;
    for (let x = 0; x < w; x += 2) { const i = i0 + x * 4; r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
    const n = Math.ceil(w / 2);
    filas.push([Math.round(r / n), Math.round(gg / n), Math.round(b / n)]);
  }
  const bandas = [];
  for (let k = 0; k < filas.length; k++) { const [r, gg, b] = filas[k]; const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
    if (mx - mn < 14 && mx > 40 && mx < 220) bandas.push(k * 2); }
  const grupos = [];
  for (const y of bandas) { const u = grupos[grupos.length - 1]; if (u && y - u.fin === 2) u.fin = y; else grupos.push({ ini: y, fin: y }); }
  const conDatos = grupos.filter(u => u.fin - u.ini >= 6).map(u => ({ ini: u.ini, fin: u.fin, alto: u.fin - u.ini + 1, media: filas[Math.round((u.ini + u.fin) / 4)] }));
  return JSON.stringify({ w, h, nGrupos: grupos.length, bandas: conDatos.slice(0, 30),
    perfil: filas.map((f, k) => (k % 10 === 0 ? k * 2 + ':' + f.join(',') : null)).filter(Boolean) });
} catch (e) { return 'ERR ' + (e && e.message || e); } })`;

// raycast de píxeles para identificar qué objeto forma una franja del encuadre
const RAYO_JS = `(async (pixels) => { const AV = window.AV, G = AV.G, R = G.renderer, THREE = window.THREE;
  const cam = R.camera, escena = R.scene;
  const rc = new THREE.Raycaster(); rc.far = cam.far * 1.2;
  const out = [];
  const W = window.innerWidth || 1600, H = window.innerHeight || 900;
  for (const [px, py] of pixels) {
    const ndc = new THREE.Vector2(px / W * 2 - 1, -(py / H * 2 - 1));
    rc.setFromCamera(ndc, cam);
    const hits = rc.intersectObjects(escena.children, true).slice(0, 4).map(h => ({ n: h.object.name || h.object.type, d: Math.round(h.distance), mat: h.object.material && (h.object.material.name || h.object.material.type), fog: h.object.material ? h.object.material.fog !== false : null, ro: h.object.renderOrder }));
    out.push({ px, py, hits });
  }
  return JSON.stringify(out); })`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1p-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    `--window-size=${ANCHO},${ALTO}`, 'about:blank'];
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi1p-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

const VISTAS = [
  { n: 'cumbre', px: -32, pz: -150, alt: 1.5, yaws: { 'N': 0, 'E': Math.PI / 2, 'S': Math.PI, 'O': -Math.PI / 2 } },
  { n: 'miradores', px: -4, pz: -130.8, alt: 1.5, yaws: { 'N': 0, 'NO': -Math.PI / 4, 'NE': Math.PI / 4 } },
  { n: 'aire', px: -18, pz: -140, alt: 42, yaws: { 'N': 0, 'O': -Math.PI / 2 } },
];

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const resultado = { etiqueta: ETIQUETA, inicio: new Date().toISOString(), vistas: {}, erroresConsola: [] };
  const WebSocket = globalThis.WebSocket;
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const { targetId } = await cdp.call('Target.createTarget', { url: 'about:blank' });
  const { sessionId: ses } = await cdp.call('Target.attachToTarget', { targetId, flatten: true });
  await cdp.call('Runtime.enable', {}, ses);
  await cdp.call('Page.enable', {}, ses);
  await cdp.call('Log.enable', {}, ses);
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: 1, mobile: false }, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}" }, ses);
  await cdp.call('Page.navigate', { url: origen + '/index.html?pack=ep5&mapa=real' }, ses);
  const t0 = Date.now(); let listo = false;
  while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
    try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
    await cdp.bombear(0.5);
  }
  if (!listo) throw new Error('el juego no arrancó (listo_js)');
  const prep = await evaluar(cdp, ses, CFG.preparar_js, 120);
  resultado.entrada = prep;
  if (String(prep).indexOf('ok') !== 0) throw new Error('entrada falló: ' + prep);

  for (const V of VISTAS) {
    if (VISTA !== 'todas' && VISTA !== V.n) continue;
    resultado.vistas[V.n] = {};
    for (const [yn, yaw] of Object.entries(V.yaws)) {
      if (SOLO_YAW !== null && SOLO_YAW !== yn && !(SOLO_YAW === '0' && yn === 'N')) continue;
      let infoRaw;
      try { infoRaw = await evaluar(cdp, ses, MIRAR_JS + `(${V.px}, ${V.pz}, ${V.alt}, ${yaw})`, 90); }
      catch (e) { throw new Error('MIRAR ' + V.n + '/' + yn + ': ' + e.message + ' | exp=' + (MIRAR_JS + `(${V.px}, ${V.pz}, ${V.alt}, ${yaw})`).slice(0, 200)); }
      const info = JSON.parse(infoRaw);
      const shot = await cdp.call('Page.captureScreenshot', { format: 'png' }, ses, 30000);
      const b64 = shot.data;
      const nombre = `${ETIQUETA}_${V.n}_${yn}`;
      fs.writeFileSync(path.join(SALIDA, nombre + '.png'), Buffer.from(b64, 'base64'));
      const ana = JSON.parse(await evaluar(cdp, ses, ANALIZA_JS + `("${b64}")`, 60));
      // raycast sobre la primera banda gris detectada (y cielo/mar de referencia arriba/abajo)
      let rayos = null;
      try {
        const b0 = ana.bandas && ana.bandas[0];
        const filasRay = b0 ? [[400, b0.ini - 30], [800, b0.ini - 30], [400, (b0.ini + b0.fin) >> 1], [800, (b0.ini + b0.fin) >> 1], [1200, (b0.ini + b0.fin) >> 1], [800, b0.fin + 30]] : [[800, 200], [800, 400]];
        const rayExp = RAYO_JS + '(' + JSON.stringify(filasRay) + ')';
        rayos = JSON.parse(await evaluar(cdp, ses, rayExp, 60));
      } catch (e) { rayos = { error: String(e && e.message || e).slice(0, 200) }; }
      resultado.vistas[V.n][yn] = { info, analisis: { nGrupos: ana.nGrupos, bandas: ana.bandas, perfil: ana.perfil }, rayos };
      console.log(`[${nombre}] pos=${info.pos} calls=${info.calls} ktris=${info.ktris} fps=${info.fps} | cielo=${JSON.stringify(info.cielo)} niebla=${JSON.stringify(info.niebla)} | bandas=${ana.nGrupos}`, ana.bandas.slice(0, 6).map(b => `${b.ini}-${b.fin} h${b.alto} rgb${b.media}`).join(' ; '));
      if (rayos && !rayos.error) for (const r of rayos.slice(0, 6)) console.log('   rayo', r.px + ',' + r.py, '→', (r.hits || []).map(h => `${h.n}@${h.d}m ${h.mat} fog=${h.fog} ro=${h.ro}`).join(' | ') || 'sin golpe');
    }
  }
  resultado.fin = new Date().toISOString();
  fs.writeFileSync(path.join(SALIDA, ETIQUETA + '.json'), JSON.stringify(resultado, null, 1));
  console.log('OK → ' + path.join(SALIDA, ETIQUETA + '.json'));
})().catch(e => { console.error('FALLO:', e && e.message || e); process.exitCode = 1; }).finally(() => { mataPorPerfil(); setTimeout(() => process.exit(process.exitCode || 0), 1500); });
