#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-060: fallas gráficas del iPad de Kelvin
   (0w; capturas de referencia docs/img/kelvin_ipad_5nov/ipad{1,2}.jpg):
     (2) el sol como un disco beige plano de borde duro;
     (3) discos/hojas planas color crema flotando entre los árboles (identificar con raycast);
     (4) la isla/arrecife lejano como mancha blanca plana;
   Reproducción: iPad emulado (820×1180 CSS @ DPR 1,5, UA iPad, táctil, CPU ×4), calidad media,
   GPU real. La herramienta NO toca el juego: tomas + barrido de raycast + diagnósticos.
   Uso: node tools/build/kimi1_060.js --etiqueta r1 [--calidad medio] [--cpu 4] [--solo poza,sol]
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
const CALIDAD = arg('--calidad', 'medio');
const CPU = parseInt(arg('--cpu', '4'), 10);
const SOLO = (arg('--solo', '') || '').split(',').map(s => s.trim()).filter(Boolean);
const ANCHO = 820, ALTO = 1180, DPR = 1.5;
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi060'));
fs.mkdirSync(SALIDA, { recursive: true });

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi1s-/.test(d)) continue;
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
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1s-' + Math.random().toString(36).slice(2, 10),
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

// teleport + asentado + captura; devuelve posición real y diagnósticos pedidos
const TOMA_JS = `(async (px, pz, alt, mx, mz, extras) => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
  const cuadro = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  S.pos.x = px; S.pos.z = pz; S.pos.y = G.terreno.height(px, pz) + alt; S.vy = 0;
  G.fisica.MOVE.flying = true;
  const yaw = Math.atan2(-(mx - px), -(mz - pz));
  G.camara.yaw = yaw; S.facing = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
  const ST = G.mundo && G.mundo.streaming;
  if (ST) { if (ST.alrededor) await ST.alrededor(px, pz); if (ST.terminar) await ST.terminar(); }
  if (G.solidos && G.solidos.terminar) G.solidos.terminar();
  await sleep(1200);
  G.camara.yaw = yaw; if (extras && extras.inclina && G.camara.inclinar) { G.camara.inclinar(extras.inclina); }
  if (G.camara.place) G.camara.place(true);
  await cuadro(); await cuadro();
  const out = { pos: [Math.round(S.pos.x * 10) / 10, Math.round(S.pos.y * 100) / 100, Math.round(S.pos.z * 10) / 10] };
  try { out.stats = G.renderer.stats(); } catch (e) { out.statsErr = String(e && e.message || e).slice(0, 120); }
  if (extras && extras.barrido) {
    const T = window.THREE, R = G.renderer, cam = R.camera, scene = R.scene;
    const rc = new T.Raycaster(); const v2 = new T.Vector2(); const agg = new Map();
    const NX = 12, NY = 16;
    for (let iy = 0; iy < NY; iy++) for (let ix = 0; ix < NX; ix++) {
      v2.set((ix + 0.5) / NX * 2 - 1, -((iy + 0.5) / NY * 2 - 1));
      rc.setFromCamera(v2, cam);
      let hits; try { hits = rc.intersectObjects(scene.children, true); } catch (e) { continue; }
      const h = hits && hits[0]; if (!h || !h.object) continue;
      let o = h.object, cadena = o.name || '';
      for (let p = o.parent; p && p !== scene; p = p.parent) { if (p.name) cadena += '<' + p.name; }
      const g = o.geometry || {};
      const clave = cadena + '|' + (g.type || '?') + '|' + (o.material && o.material.type || '?');
      const e = agg.get(clave) || { n: 0, ej: null };
      e.n++; if (e.n === 1) e.ej = { d: Math.round(h.distance), inst: h.instanceId != null ? h.instanceId : undefined, col: o.material && o.material.color ? o.material.color.getHexString() : undefined, map: !!(o.material && o.material.map) };
      agg.set(clave, e);
    }
    out.barrido = [...agg.entries()].map(([k, e]) => ({ obj: k, n: e.n, ej: e.ej })).sort((a, b) => b.n - a.n).slice(0, 40);
  }
  if (extras && extras.picks) {
    const T = window.THREE, R = G.renderer, cam = R.camera, scene = R.scene;
    const rc = new T.Raycaster(); const v2 = new T.Vector2(); out.picks = [];
    for (const [fx, fy] of extras.picks) {
      v2.set(fx * 2 - 1, -(fy * 2 - 1)); rc.setFromCamera(v2, cam);
      let hits; try { hits = rc.intersectObjects(scene.children, true); } catch (e) { out.picks.push({ fx, fy, err: String(e && e.message || e).slice(0, 80) }); continue; }
      const lst = (hits || []).slice(0, 3).map(h => { let o = h.object, cadena = o.name || ''; for (let p = o.parent; p && p !== scene; p = p.parent) { if (p.name) cadena += '<' + p.name; }
        return { n: cadena, d: Math.round(h.distance * 10) / 10, inst: h.instanceId != null ? h.instanceId : undefined, geo: (o.geometry || {}).type, mat: o.material && o.material.type, col: o.material && o.material.color ? o.material.color.getHexString() : undefined, map: !!(o.material && o.material.map), y: h.point ? Math.round(h.point.y * 10) / 10 : undefined }; });
      out.picks.push({ fx, fy, hits: lst });
    }
  }
  return JSON.stringify(out); })`;

// diagnósticos globales: impostores de flora, islas, cielo/sol, cámara
const DIAG_JS = `(() => { const AV = window.AV, G = AV.G; const out = {};
  try { out.flora = G.vegetacion.stats(); } catch (e) { out.floraErr = String(e && e.message || e).slice(0, 120); }
  try { const R = G.renderer, sc = R.scene; const imp = sc.getObjectByName('flora:impostores');
    out.impostores = imp ? { visible: imp.visible, count: imp.geometry && imp.geometry.instanceCount, tAtlas: !!(imp.material && imp.material.uniforms && imp.material.uniforms.tAtlas && imp.material.uniforms.tAtlas.value) } : 'no en escena';
  } catch (e) { out.impErr = String(e && e.message || e).slice(0, 120); }
  try { out.islas = G.terreno.islas || null; } catch (e) { }
  try { out.solDir = (G.renderer.scene && (() => { let u = null; G.renderer.scene.traverse(o => { if (!u && o.material && o.material.uniforms && o.material.uniforms.uSolDir) u = { dir: o.material.uniforms.uSolDir.value.toArray().map(v => Math.round(v * 100) / 100), col: o.material.uniforms.uSolCol ? '#' + o.material.uniforms.uSolCol.value.getHexString() : null }; }); return u; })()) || null; } catch (e) { }
  try { out.camaraClaves = Object.keys(G.camara || {}); } catch (e) { }
  try { out.dpr = G.renderer.renderer.getPixelRatio(); } catch (e) { }
  return JSON.stringify(out); })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1s-'));
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi1s-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const res = { etiqueta: ETIQUETA, pantalla: `${ANCHO}x${ALTO}@${DPR} cpuX${CPU} ipad-emulado`, calidad: CALIDAD, head: null, tomas: {} };
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
    try { await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses); } catch (e) { }
    try { await cdp.call('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }, ses); } catch (e) { }
    try { await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses); } catch (e) { }
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&calidad=${CALIDAD}` }, ses);
    const t0 = Date.now(); let listo = false;
    while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
      await cdp.bombear(0.5);
    }
    if (!listo) throw new Error('el juego no arrancó');
    const ent = await evaluar(cdp, ses, ENTRAR_JS, 120);
    if (!/^ok/.test(ent)) throw new Error('entrada: ' + ent);
    res.head = await evaluar(cdp, ses, `(() => { try { return (AV.G.build && (AV.G.build.commit || AV.G.build.id)) || document.querySelector('meta[name=build]') && document.querySelector('meta[name=build]').content || 'desconocido'; } catch (e) { return 'desconocido'; } })()`, 10);
    res.diag = JSON.parse(await evaluar(cdp, ses, DIAG_JS, 30));
    console.log('· diag: ' + JSON.stringify(res.diag).slice(0, 1200));

    const islas = res.diag.islas || [];
    const I0 = islas[0] || { x: 0, z: -1500, r: 100 };
    const rejilla = (cx, cy) => { const p = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) p.push([cx + dx * 0.02, cy + dy * 0.014]); return p; };
    // tomas: [nombre, px, pz, alt, mx, mz, extras]
    const TOMAS = [
      ['poza', 196, 118, 26, 150, 66, null],
      ['poza_baja', 190, 104, 12, 165, 84, null],
      ['tepuy_norte', 40, 10, 48, -33, -136, null],
      ['sol', 145.5, 178.5, 60, 145.5 - 675, 178.5 + 738, { inclina: 1.05 }],
      ['isla', I0.x * 0.45, I0.z * 0.45, 55, I0.x, I0.z, null],
    ];
    for (const [n, px, pz, alt, mx, mz, extras] of TOMAS) {
      if (SOLO.length && !SOLO.includes(n)) continue;
      const toma = JSON.parse(await evaluar(cdp, ses, `(${TOMA_JS})(${px}, ${pz}, ${alt}, ${mx}, ${mz}, ${JSON.stringify(extras || null)})`, 300));
      await cdp.bombear(0.3);
      const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 60000);
      fs.writeFileSync(path.join(SALIDA, `k060_${ETIQUETA}_${n}.jpg`), Buffer.from(shot.data, 'base64'));
      res.tomas[n] = toma;
      const st = toma.stats || {};
      console.log(`  ${n}: pos=${JSON.stringify(toma.pos)} calls=${st.calls} tris=${st.triangulos} fps=${st.fps}` + (toma.barrido ? ' · barrido ' + toma.barrido.length + ' claves' : ''));
    }
    const errs = await evaluar(cdp, ses, `(window.AV && AV.G && AV.G.logErrores ? AV.G.logErrores() : (window.__erroresConsola || []).length)`, 15);
    res.erroresConsola = errs;
    console.log('· errores de consola: ' + JSON.stringify(errs));
    await cdp.call('Target.closeTarget', { targetId: tid }).catch(() => { });
  } finally {
    try { chrome.kill(); } catch (e) { }
    mataPorPerfil();
    srv.close();
  }
  fs.writeFileSync(path.join(SALIDA, `k060_${ETIQUETA}.json`), JSON.stringify(res, null, 1));
  console.log('· JSON: ' + path.join(SALIDA, `k060_${ETIQUETA}.json`));
  process.exit(0);
})().catch(e => { console.error('FALLO:', e.message); try { mataPorPerfil(); } catch (e2) { } process.exit(1); });
