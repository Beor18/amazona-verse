#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-061: FX de los dos poderes V18.1 (fx_poderes.js)
   Mide con GPU real: AV.v18FxTest en vivo, coste de onda()+escudo() (FPS/calls/tris) y capturas
   de los dos FX. Perfiles: iPhone emulado 390×844@dpr3 CPU×4 en «bajo» (requisito: no bajar de
   45 FPS) y «medio». La herramienta NO toca el juego: solo dispara la API pública G.v18fx.
   Uso: node tools/build/kimi1_061.js --etiqueta r1 [--calidad bajo] [--pantalla movil] [--cpu 4]
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
const CALIDAD = arg('--calidad', 'bajo');
const CPU = parseInt(arg('--cpu', '4'), 10);
const PANTALLA = arg('--pantalla', 'movil');
const PERFILES = {
  movil: { w: 390, h: 844, dpr: 3, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
  ipad: { w: 820, h: 1180, dpr: 1.5, ua: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
  pc: { w: 1600, h: 900, dpr: 1, ua: '' },
};
const PF = PERFILES[PANTALLA] || PERFILES.movil;
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi061'));
fs.mkdirSync(SALIDA, { recursive: true });

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi1fx-/.test(d)) continue;
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
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1fx-' + Math.random().toString(36).slice(2, 10),
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
  const jugar = Array.from(document.querySelectorAll('button')).find(x => /a jugar/i.test(x.textContent || '')); if (jugar) jugar.click(); // tutorial «¡Así se juega!» (escritorio)
  await sleep(300);
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

// Prueba v18FxTest + medición A/B de los FX en vivo (2.5 s base / 3 s con FX) y capturas en dos momentos
const FX_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G;
  const out = { v18: G.V18 };
  const test = await AV.v18FxTest();
  out.test = { passed: test.passed, total: test.total, fallos: test.results.filter(r => !r.ok).map(r => r.name + ' :: ' + r.extra) };
  const fx = G.v18fx;
  const stats = () => { try { const s = G.renderer.stats(); return { calls: s.calls, tris: s.triangulos }; } catch (e) { return {}; } };
  const asentado = async () => { const t0 = performance.now();                        // el mundo dibuja de verdad antes de medir
    while (performance.now() - t0 < 20000) {
      const s = stats();
      if (s.calls > 10) { await new Promise(r => requestAnimationFrame(r)); if (stats().calls > 10) return true; }
      await new Promise(r => setTimeout(r, 250));
    }
    return false; };
  out.asentado = await asentado();
  const medir = async s => { const t0 = performance.now(); let n = 0, peor = 0, ant = t0;
    while (performance.now() - t0 < s * 1000) { await new Promise(r => requestAnimationFrame(r)); const a = performance.now(); if (n) peor = Math.max(peor, a - ant); ant = a; n++; }
    return { fps: Math.round((n - 1) / ((performance.now() - t0) / 1000) * 10) / 10, peorMs: Math.round(peor) }; };
  out.base = await medir(2.5);
  out.statsBase = stats();
  out.onda = fx.onda(null, null, 10);
  out.gritoEn = fx.estado();
  out.escudo = fx.escudo(null, 8);
  out.statsFx = stats();
  out.conFx = await medir(3);
  out.dispersar = fx.dispersar(null);
  await sleep(1300);
  out.statsFin = stats();
  out.estadoFin = fx.estado();
  return JSON.stringify(out); })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1fx-'));
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi1fx-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const res = { etiqueta: ETIQUETA, pantalla: `${PANTALLA} ${PF.w}x${PF.h}@${PF.dpr} cpuX${CPU}`, calidad: CALIDAD, head: null };
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: PF.w, height: PF.h, deviceScaleFactor: PF.dpr, mobile: PANTALLA !== 'pc' }, ses);
    if (PANTALLA !== 'pc') { try { await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses); } catch (e) { } }
    if (PF.ua) { try { await cdp.call('Emulation.setUserAgentOverride', { userAgent: PF.ua }, ses); } catch (e) { } }
    try { await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses); } catch (e) { }
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

    // captura 0: control sin FX (artefactos del mundo vs FX propios)
    let shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 88 }, ses, 60000);
    fs.writeFileSync(path.join(SALIDA, `k061_${ETIQUETA}_control.jpg`), Buffer.from(shot.data, 'base64'));
    // captura 1: anillos del grito (~0,35 s tras disparar); facing lateral a la cámara para que crucen la vista
    await evaluar(cdp, ses, `(async () => { await AV.v18FxTest(); AV.G.S.facing.x = 1; AV.G.S.facing.z = 0; AV.G.v18fx.onda(null, null, 10); return 1; })()`, 30);
    await cdp.bombear(0.35);
    shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 88 }, ses, 60000);
    fs.writeFileSync(path.join(SALIDA, `k061_${ETIQUETA}_grito.jpg`), Buffer.from(shot.data, 'base64'));
    res.diagGrito = JSON.parse(await evaluar(cdp, ses, `(() => { const fx = AV.G.v18fx, I = fx._interno, cam = AV.G.renderer.camera, W = innerWidth, H = innerHeight;
      const proy = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(cam); return [Math.round((v.x * 0.5 + 0.5) * W), Math.round((-v.y * 0.5 + 0.5) * H)]; };
      const anillos = [];
      for (let i = 0; i < I.ranillos.length; i++) { const a = I.ranillos[i]; if (!a) continue; const m = I.rings.instanceMatrix.array; anillos.push({ i, mundo: [+m[i * 16 + 12].toFixed(2), +m[i * 16 + 13].toFixed(2), +m[i * 16 + 14].toFixed(2)], px: proy(m[i * 16 + 12], m[i * 16 + 13], m[i * 16 + 14]) }); }
      const sp = AV.G.S.pos;
      return JSON.stringify({ anillos, vittataPx: proy(sp.x, sp.y + 1.35, sp.z), camara: { x: +cam.position.x.toFixed(1), y: +cam.position.y.toFixed(1), z: +cam.position.z.toFixed(1) } }); })()`, 30));
    await cdp.bombear(1.2);                           // los anillos mueren antes del escudo (vida 0,95 s + escalonado)
    // captura 2: escudo de plumas girando (solo plumas en pantalla)
    await evaluar(cdp, ses, `(async () => { await AV.v18FxTest(); AV.G.v18fx.escudo(null, 30); return 1; })()`, 30);
    await cdp.bombear(0.6);
    shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 88 }, ses, 60000);
    fs.writeFileSync(path.join(SALIDA, `k061_${ETIQUETA}_escudo.jpg`), Buffer.from(shot.data, 'base64'));
    res.diagEscudo = JSON.parse(await evaluar(cdp, ses, `(() => { const fx = AV.G.v18fx, I = fx._interno, cam = AV.G.renderer.camera, W = innerWidth, H = innerHeight;
      const proy = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(cam); return [Math.round((v.x * 0.5 + 0.5) * W), Math.round((-v.y * 0.5 + 0.5) * H), +v.z.toFixed(3)]; };
      const pts = []; for (let i = 0; i < 6; i++) pts.push(proy(I.pPos[i * 3], I.pPos[i * 3 + 1], I.pPos[i * 3 + 2]));
      const sp = AV.G.S.pos, c = proy(sp.x, sp.y + 1.35, sp.z);
      return JSON.stringify({ plumaPx: pts, vittataPx: c, spos: { x: +sp.x.toFixed(2), y: +sp.y.toFixed(2), z: +sp.z.toFixed(2) }, nivel: fx.estado().nivel, escudos: fx.estado().escudos, plumasVis: I.plumas.visible, plumasEnEscena: (() => { let p = I.plumas; while (p.parent) p = p.parent; return p === AV.G.renderer.scene || p.type === 'Scene'; })() }); })()`, 30));
    // depuración: mismo InstancedMesh con material magenta gigante (sin map): si aparece, el objeto dibuja y el fallo es el material/textura
    await evaluar(cdp, ses, `(() => { const I = AV.G.v18fx._interno; I.plumas.material = new THREE.MeshBasicMaterial({ color: 0xff00ff, depthTest: false, depthWrite: false, side: THREE.DoubleSide }); return 1; })()`, 30);
    await cdp.bombear(0.3);
    shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 88 }, ses, 60000);
    fs.writeFileSync(path.join(SALIDA, `k061_${ETIQUETA}_debugplumas.jpg`), Buffer.from(shot.data, 'base64'));
    // referencia: una ráfaga de puntos del propio G.fx (engine) en las mismas condiciones
    await evaluar(cdp, ses, `(() => { const G = AV.G, p = G.S.pos; if (G.fx && G.fx.burst) G.fx.burst(p.x, p.y + 1.2, p.z, 'feathers', 20); return 1; })()`, 30);
    await cdp.bombear(0.3);
    shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 88 }, ses, 60000);
    fs.writeFileSync(path.join(SALIDA, `k061_${ETIQUETA}_fxburst.jpg`), Buffer.from(shot.data, 'base64'));
    await evaluar(cdp, ses, `(async () => { await AV.v18FxTest(); AV.G.v18fx.dispersar(null); return 1; })()`, 30);
    await cdp.bombear(1.2);

    res.fx = JSON.parse(await evaluar(cdp, ses, FX_JS, 90));
    console.log('· v18FxTest: ' + res.fx.test.passed + '/' + res.fx.test.total + (res.fx.test.fallos.length ? ' FALLOS: ' + JSON.stringify(res.fx.test.fallos) : ''));
    console.log('· mundo asentado antes de medir: ' + res.fx.asentado);
    console.log(`· base: ${JSON.stringify(res.fx.base)} stats=${JSON.stringify(res.fx.statsBase)}`);
    console.log(`· con FX: ${JSON.stringify(res.fx.conFx)} stats=${JSON.stringify(res.fx.statsFx)} (llamadas FX=${res.fx.gritoEn.llamadas}, anillos=${res.fx.gritoEn.anillos}, plumas=${res.fx.escudo.n})`);
    console.log(`· fin: ${JSON.stringify(res.fx.statsFin)} ${JSON.stringify(res.fx.estadoFin)}`);
    const errs = await evaluar(cdp, ses, `(window.__erroresConsola || []).length`, 15);
    res.erroresConsola = errs;
    console.log('· errores de consola: ' + JSON.stringify(errs));
    await cdp.call('Target.closeTarget', { targetId: tid }).catch(() => { });
  } finally {
    try { chrome.kill(); } catch (e) { }
    mataPorPerfil();
    srv.close();
  }
  fs.writeFileSync(path.join(SALIDA, `k061_${ETIQUETA}.json`), JSON.stringify(res, null, 1));
  console.log('· JSON: ' + path.join(SALIDA, `k061_${ETIQUETA}.json`));
  process.exit(0);
})().catch(e => { console.error('FALLO:', e.message); try { mataPorPerfil(); } catch (e2) { } process.exit(1); });
