#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-131 / QA-179 (3ª parte): la r4t de la otra instancia
   descartó el tramo transitorio (sin bandera: 87-88 calls planos 30 s) y crasheó en la carga v18;
   el hueco sin medir es la VISTA DE LA INTRO (cámara del cine sobre la bahía/explanada, módulos
   V18 cargados por el gesto de puntero — QA-179 midió «la vista de arranque» tras ese gesto).
   Esta sonda: entra con gesto real (carga los 14 AVV18* sin saltar la intro), espera los módulos,
   muestrea calls/tris DURANTE la intro, ocluye uno a uno los hijos `v18*` de la escena (atribución
   por módulo: reparar/combate/descubrir/…), salta la intro y repite censo robusto (base re-medida
   por hijo) en la vista de spawn. Con y sin ?v18=1. El juego no se toca.
   Uso: node tools/build/kimi1_131c.js --etiqueta r5
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
const ETIQUETA = arg('--etiqueta', 'r5');
const ANCHO = 1600, ALTO = 900, DPR = 1;
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi131'));
fs.mkdirSync(SALIDA, { recursive: true });

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi1k131c-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
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

const SEMILLA_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1k131c-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null, species: 'vittata' },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
  localStorage.setItem('amazonaverse.v18', JSON.stringify({ v: 1, sel: 'vittata', especies: { vittata: 'seleccionada' }, inv: {}, otorgados: {}, mundo: {} }));
} catch (e) {}`;

const ENTRAR_JS = `(async () => { try { return await (async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene Jugar'; b.click();
    if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta'; }
  const m = $('modos');
  if (m && m.open) { const a = m.querySelector('[data-modo="aventura"]'); if (!a) return 'el menu de modos no tiene Aventura'; a.click();
    if (!await espera(() => !m.open, 5000)) return 'el menu de modos sigue abierto'; }
  await espera(() => { try { const AV = window.AV; return AV && AV.G && AV.G.player3D && AV.G.S && AV.G.S.step != null && AV.G.renderer && AV.G.renderer.stats().calls >= 0; } catch (e) { return false; } }, 90000);
  // gesto real de puntero: dispara alPrimerGesto (boot.js:70) y carga los módulos V18 SIN saltar la intro
  try { window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); } catch (e) {}
  await sleep(1200);
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

/* muestrea la INTRO con los módulos cargados, ocluye los hijos v18* uno a uno (atribución por módulo),
   salta y censa la escena de spawn con base re-medida por hijo (robusto ante el drift). */
const MEDIR_JS = (ESV18) => `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G;
  const stats = () => { try { const s = G.renderer.stats(); const m = G.renderer.renderer.info.memory; return { calls: s.calls, tris: s.triangulos, geo: m.geometries, tex: m.textures, prog: G.renderer.renderer.info.programs.length }; } catch (e) { return null; } };
  const mods = () => Object.keys(window).filter(k => /^AVV18/.test(k)).length;
  const esperarMods = async () => { const t0 = performance.now(); let n = 0;
    while (performance.now() - t0 < ${ESV18 ? '120000' : '5000'}) { n = mods(); await sleep(700); if (mods() === n && n > 0) { await sleep(1800); if (mods() === n) return n; } }
    return mods(); };
  const asentar = async () => { const t0 = performance.now();
    while (performance.now() - t0 < 45000) { try { if (G.renderer.stats().calls > 10) { await new Promise(r => requestAnimationFrame(r)); if (G.renderer.stats().calls > 10) break; } } catch (e) {} await sleep(250); }
    let a = -1, iguales = 0; const t1 = performance.now();
    while (performance.now() - t1 < 30000 && iguales < 3) { const c = stats(); const v = c ? c.calls : -1; if (v === a) iguales++; else { a = v; iguales = 1; } await sleep(450); }
    return a; };
  const introViva = () => { try { return !!document.getElementById('c1-saltar'); } catch (e) { return false; } };
  const out = { calidad: (G.renderer && G.renderer.calidad && G.renderer.calidad.nivel) || '?', mods0: mods() };
  await esperarMods(); out.mods = mods();
  // 1) vista de la intro (la que QA-179 muestreó)
  const m1 = []; for (let i = 0; i < 6; i++) { m1.push(stats()); await sleep(400); }
  out.vistaIntro = { viva0: out.introViva0 = introViva(), viva1: introViva(), muestras: m1 };
  // 2) oclusión dirigida de raíces v18* durante la intro
  const escena = G.renderer.scene || G.scene;
  const raices = escena.children.filter(c => c.visible && /^v18/i.test(c.name || ''));
  const oc = [];
  for (const c of raices) { const b = stats(); if (!b) continue;
    c.visible = false; await sleep(120); await new Promise(r => requestAnimationFrame(r)); await new Promise(r => requestAnimationFrame(r));
    const s2 = stats(); c.visible = true; await new Promise(r => requestAnimationFrame(r));
    let nh = 0; c.traverse(o => { nh++; });
    oc.push({ nombre: c.name, tipo: c.type, hijos: nh, callsBase: b.calls, delta: s2 ? b.calls - s2.calls : null }); }
  out.oclusionV18 = oc; out.nV18 = raices.length;
  out.vistaIntro.viva2 = introViva();
  // 3) spawn: saltar la intro, asentar y censo completo con base por hijo
  try { if (AV.G.intro && AV.G.intro.saltar) AV.G.intro.saltar(); } catch (e) {}
  await asentar(); await sleep(500);
  out.arranque = stats();
  const hijos = []; let idx = 0;
  for (const c of escena.children) { const nombre = c.name || '(anon ' + (c.type || '?') + ')';
    if (!c.visible) { hijos.push({ i: idx++, nombre, tipo: c.type, delta: null }); continue; }
    await sleep(80); const b = stats(); if (!b) { hijos.push({ i: idx++, nombre, tipo: c.type, delta: null }); continue; }
    c.visible = false; await new Promise(r => requestAnimationFrame(r)); await new Promise(r => requestAnimationFrame(r));
    const s2 = stats(); c.visible = true; await new Promise(r => requestAnimationFrame(r));
    hijos.push({ i: idx++, nombre, tipo: c.type, delta: s2 ? b.calls - s2.calls : null }); }
  out.hijos = hijos;
  out.arranque2 = stats();
  return JSON.stringify(out); })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k131c-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--window-size=' + ANCHO + ',' + ALTO, 'about:blank'];
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi1k131c-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const res = { etiqueta: ETIQUETA, pantalla: `escritorio ${ANCHO}x${ALTO}@${DPR} cpuX1`, head: null, cargas: {}, error: null };
  const outJson = path.join(SALIDA, `k131c_${ETIQUETA}.json`);
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: false }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS }, ses);
    for (const carga of [{ id: 'sinbandera', q: '', censo: false }, { id: 'v18', q: '&v18=1', censo: true }]) {
      await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real${carga.q}` }, ses);
      const t0 = Date.now(); let listo = false;
      while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
        try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
        await cdp.bombear(0.5);
      }
      if (!listo) throw new Error('el juego no arrancó (' + carga.id + ')');
      const ent = await evaluar(cdp, ses, ENTRAR_JS, 600);
      if (!/^ok/.test(ent)) throw new Error('entrada (' + carga.id + '): ' + ent);
      if (!res.head) res.head = await evaluar(cdp, ses, `(() => { try { return (AV.G.build && (AV.G.build.commit || AV.G.build.id)) || AV.build || 'desconocido'; } catch (e) { return 'desconocido'; } })()`, 10);
      res.cargas[carga.id] = JSON.parse(await evaluar(cdp, ses, MEDIR_JS(carga.censo), 900));
      fs.writeFileSync(outJson, JSON.stringify(res, null, 1));
      const vi = res.cargas[carga.id].vistaIntro, arr = res.cargas[carga.id].arranque;
      console.log(`[${carga.id}] intro(viva=${vi && vi.viva1}) calls=${vi && vi.muestras.map(m => m && m.calls).join(',')} | spawn calls=${arr && arr.calls} tris=${arr && arr.tris} tex=${arr && arr.tex} mods=${res.cargas[carga.id].mods} v18roots=${res.cargas[carga.id].nV18}`);
    }
  } catch (e) { res.error = String(e && e.message || e); }
  fs.writeFileSync(outJson, JSON.stringify(res, null, 1));
  try { chrome.kill('SIGKILL'); } catch (e) { }
  mataPorPerfil();
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close();
  process.exit(res.error ? 1 : 0);
})();
