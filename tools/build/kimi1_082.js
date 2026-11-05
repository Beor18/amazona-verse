#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-082: coste real de los FX V18.1 tras el pulido comercial.
   GPU-independiente: (1) micro-banco de paso() con todo activo (CPU pura, 2000 llamadas);
   (2) A/B intercalado corto (8 ventanas de 0,7 s alternando sin/con FX) que cancela la deriva lenta
   de la contención de la PC compartida. El juego no se toca: solo dispara la API pública G.v18fx.
   Uso: node tools/build/kimi1_082.js --etiqueta r1 [--calidad medio] [--pantalla pc|movil] [--cpu 1]
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
const CPU = parseInt(arg('--cpu', '1'), 10);
const PANTALLA = arg('--pantalla', 'pc');
const PERFILES = {
  movil: { w: 390, h: 844, dpr: 3, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
  pc: { w: 1600, h: 900, dpr: 1, ua: '' },
};
const PF = PERFILES[PANTALLA] || PERFILES.pc;
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi082'));
const MODO_FX = arg('--fx', 'todo');     // todo | anillos | plumas: qué FX se dispara en las ventanas A/B
fs.mkdirSync(SALIDA, { recursive: true });

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi1k082-/.test(d)) continue;
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
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1k082-' + Math.random().toString(36).slice(2, 10),
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
  const jugar = Array.from(document.querySelectorAll('button')).find(x => /a jugar/i.test(x.textContent || '')); if (jugar) jugar.click();
  await sleep(300);
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

// Micro-banco CPU de paso() + A/B intercalado corto (8 × 0,7 s alternando)
const MICRO_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G;
  const out = { v18: G.V18, test: null, pasoMs: null, ab: null };
  const t = await AV.v18FxTest();
  out.test = { passed: t.passed, total: t.total };
  const fx = G.v18fx;
  // (1) coste CPU de paso() con TODO activo: 4 gritos (12 anillos) + 2 escudos (32+14/32 plumas)
  for (let k = 0; k < 4; k++) fx.onda({ x: 0, y: 50, z: 0 }, { x: 1, y: 0.1 * k, z: 0.2 * k }, 10);
  fx.escudo(null, 60); fx.escudo('rival', 60);
  for (let i = 0; i < 10; i++) fx.paso(0.016);            // asienta (crea instanceColor etc.)
  let t0 = performance.now();
  for (let i = 0; i < 2000; i++) fx.paso(0.016);
  out.pasoMs = Math.round((performance.now() - t0) / 2000 * 1000) / 1000;
  out.pasoEstado = fx.estado();
  fx.dispersar(null); fx.dispersar('rival');
  for (let i = 0; i < 140; i++) fx.paso(0.05);
  // (2) A/B intercalado: 8 ventanas de 0,7 s, FX encendido/apagado re-disparado en cada ventana FX
  const medir = async s => { const a0 = performance.now(); let n = 0, peor = 0, ant = a0;
    while (performance.now() - a0 < s * 1000) { await new Promise(r => requestAnimationFrame(r)); const a = performance.now(); if (n) peor = Math.max(peor, a - ant); ant = a; n++; }
    return { fps: Math.round((n - 1) / ((performance.now() - a0) / 1000) * 10) / 10, peorMs: Math.round(peor) }; };
  const sinFx = [], conFx = [];
  const dispara = '${MODO_FX}';
  for (let k = 0; k < 8; k++) {
    sinFx.push((await medir(0.7)).fps);
    if (dispara !== 'plumas') fx.onda({ x: 0, y: 50, z: 0 }, { x: 1, y: 0, z: 0 }, 10);
    if (dispara !== 'anillos') fx.escudo(null, 2);
    conFx.push((await medir(0.7)).fps);
    if (dispara !== 'anillos') { fx.dispersar(null); }
    for (let i = 0; i < 100; i++) fx.paso(0.05);
  }
  const med = a => Math.round(a.reduce((s, x) => s + x, 0) / a.length * 10) / 10;
  out.ab = { sinFx, conFx, medSin: med(sinFx), medCon: med(conFx) };
  out.estadoFin = fx.estado();
  return JSON.stringify(out); })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k082-'));
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi1k082-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const res = { etiqueta: ETIQUETA, pantalla: `${PANTALLA} ${PF.w}x${PF.h}@${PF.dpr} cpuX${CPU}`, calidad: CALIDAD, contencion: 'PC compartida (Kimi 3 en QA-160)' };
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

    res.micro = JSON.parse(await evaluar(cdp, ses, MICRO_JS, 120));
    console.log('· v18FxTest: ' + res.micro.test.passed + '/' + res.micro.test.total);
    console.log('· paso() todo activo: ' + res.micro.pasoMs + ' ms/cuadro (' + JSON.stringify(res.micro.pasoEstado) + ')');
    console.log('· A/B intercalado: medSin=' + res.micro.ab.medSin + ' medCon=' + res.micro.ab.medCon + ' fps');
    console.log('· ventanas sinFX: ' + JSON.stringify(res.micro.ab.sinFx));
    console.log('· ventanas conFX: ' + JSON.stringify(res.micro.ab.conFx));
    const errs = await evaluar(cdp, ses, `(window.__erroresConsola || []).length`, 15);
    res.erroresConsola = errs;
    console.log('· errores de consola: ' + JSON.stringify(errs));
    await cdp.call('Target.closeTarget', { targetId: tid }).catch(() => { });
  } finally {
    try { chrome.kill(); } catch (e) { }
    mataPorPerfil();
    srv.close();
  }
  fs.writeFileSync(path.join(SALIDA, `k082_${ETIQUETA}.json`), JSON.stringify(res, null, 1));
  console.log('· JSON: ' + path.join(SALIDA, `k082_${ETIQUETA}.json`));
  process.exit(0);
})().catch(e => { console.error('FALLO:', e.message); try { mataPorPerfil(); } catch (e2) { } process.exit(1); });
