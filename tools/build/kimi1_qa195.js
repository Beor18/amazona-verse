#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — QA-195: en móvil (≤560px), el aviso de «Descubriste …»
   (#toast) sube a top:118px cuando hay diálogo/bocadillos abiertos (CG-4 QA-86/87, QA-188) y, con
   nombres largos, queda BAJO el minimapa: el nombre se recorta. Sonda de reproducción/verificación
   con GPU real (iPhone emulado 390×844 dpr 3, CPU ×4, sin bandera: toast/minimapa/bocadillos son
   del juego base). Mide las cajas reales (#toast / #rotulo-lugar / #minimapa), el solape, qué
   elemento pinta encima (elementFromPoint) y captura. No toca el juego.
   Uso: node tools/build/kimi1_qa195.js --etiqueta r1 */
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
const ANCHO = 390, ALTO = 844, DPR = 3, CPUX = 4;
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi195');
fs.mkdirSync(SALIDA, { recursive: true });

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi1q195-/.test(d)) continue;
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
async function capturar(cdp, ses, archivo) {
  const r = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 30000);
  fs.writeFileSync(archivo, Buffer.from(r.data, 'base64'));
}

const SEMILLA_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1q195-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null, species: 'vittata' },
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
  await espera(() => { try { const AV = window.AV; return AV && AV.G && AV.G.player3D && AV.G.S && AV.G.S.step != null && AV.G.renderer && AV.G.renderer.stats().calls >= 0; } catch (e) { return false; } }, 90000);
  try { const AV = window.AV; if (AV.G.intro && AV.G.intro.saltar) AV.G.intro.saltar(); } catch (e) {}
  await espera(() => { try { return window.AV.G.renderer.stats().calls > 5; } catch (e) { return false; } }, 60000);
  await sleep(1500);
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

/* QA-195 (fase toast): cajas reales del #toast (aviso de descubrimiento de nombre largo) frente a
   #minimapa en iPhone emulado. Camino real: teleport al POI flamboyan_plaza → la cola de lugares
   muestra el #toast; luego se abre un diálogo (say) y el CSS (:has) lo sube: se mide el solape con
   el minimapa y quién pinta encima. No muta estado persistente (descubrimientos de la semilla). */
const QA195_TOAST_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G;
  const $ = id => document.getElementById(id);
  const caja = el => { const r = el.getBoundingClientRect(); return { l: Math.round(r.left * 10) / 10, t: Math.round(r.top * 10) / 10, r: Math.round(r.right * 10) / 10, b: Math.round(r.bottom * 10) / 10, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 }; };
  const solapan = (a, b) => !(a.r <= b.l || b.r <= a.l || a.b <= b.t || b.b <= a.t);
  const out = { ancho: innerWidth, alto: innerHeight };
  try {
    try { window.dispatchEvent(new PointerEvent('pointerdown')); } catch (e) {} // carga perezosa alPrimerGesto (boot.js)
    void G.minimapa;
    let mm0 = null;
    for (let i = 0; i < 80; i++) { mm0 = $('minimapa'); if (mm0 && !mm0.hidden && caja(mm0).w > 0) break; await sleep(250); }
    if (!mm0) { out.error = 'no existe #minimapa'; return JSON.stringify(out); }
    out.minimapaVisible = !mm0.hidden && caja(mm0).w > 0;
    const L = G.lugares.lista();
    const fl = L.find(p => p.id === 'flamboyan_plaza');
    if (!fl) { out.error = 'no está flamboyan_plaza en la lista'; return JSON.stringify(out); }
    out.poi = { id: fl.id, nombre: G.lugares.nombreDe(fl), x: Math.round(fl.x * 10) / 10, z: Math.round(fl.z * 10) / 10 };
    G.S.pos.x = fl.x; G.S.pos.z = fl.z; G.S.pos.y = G.terreno.height(fl.x, fl.z) + 0.5;
    let tt = null;
    for (let i = 0; i < 50; i++) { tt = $('toast'); if (tt && !tt.hidden && /Descubriste/.test(tt.textContent)) break; await sleep(250); }
    if (!tt || tt.hidden || !/Descubriste/.test(tt.textContent)) { out.error = 'no salió el toast de descubrimiento'; return JSON.stringify(out); }
    await sleep(500);
    out.minimapa = caja(mm0);
    out.mmTopInline = mm0.style.getPropertyValue('--mm-top');
    out.mmTopRoot = getComputedStyle(document.documentElement).getPropertyValue('--mm-top').trim();
    out.texto = tt.textContent.slice(0, 90);

    G.dialogo.say([{ who: 'iguaca', text: '¡Vittata! ¡Necesitamos ayuda!' }]);
    await sleep(800);
    out.dialogoAbierto = G.dialogo.activo();
    const ct = caja(tt), cm = caja(mm0);
    out.conDialogo = { caja: ct, topCSS: getComputedStyle(tt).top, solapaMinimapa: solapan(ct, cm) };
    if (solapan(ct, cm)) {
      const px = Math.max(ct.l, cm.l) + 6, py = Math.max(ct.t, cm.t) + 6;
      const el = document.elementFromPoint(px, py);
      out.conDialogo.punto = { x: Math.round(px), y: Math.round(py) };
      out.conDialogo.encima = el ? (el.id || String(el.className).slice(0, 40) || el.tagName) : null;
    }
    const st = G.renderer.stats(); out.stats = { calls: st.calls, tris: st.triangulos };
  } catch (e) { out.error = String(e && e.stack || e); }
  return JSON.stringify(out); })()`;

/* QA-195 (fase rótulo): tras cerrar el diálogo, teleport al asentamiento de nombre más largo y mide
   el rótulo «Bienvenido a …» frente al minimapa (misma clase de solape en pantallas bajas). */
const QA195_ROTULO_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G;
  const $ = id => document.getElementById(id);
  const caja = el => { const r = el.getBoundingClientRect(); return { l: Math.round(r.left * 10) / 10, t: Math.round(r.top * 10) / 10, r: Math.round(r.right * 10) / 10, b: Math.round(r.bottom * 10) / 10, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 }; };
  const solapan = (a, b) => !(a.r <= b.l || b.r <= a.l || a.b <= b.t || b.b <= a.t);
  const out = {};
  try {
    G.dialogo.clear();
    await sleep(600);
    const L = G.lugares.lista();
    const ASL = L.filter(p => p.asentamiento).sort((a, b) => G.lugares.nombreDe(b).length - G.lugares.nombreDe(a).length);
    const asl = ASL[0];
    out.asentamiento = asl ? { id: asl.id, nombre: G.lugares.nombreDe(asl) } : null;
    if (!asl) { out.error = 'sin asentamientos en la lista'; return JSON.stringify(out); }
    G.S.pos.x = asl.x; G.S.pos.z = asl.z; G.S.pos.y = G.terreno.height(asl.x, asl.z) + 0.5;
    let rt = null;
    for (let i = 0; i < 50; i++) { rt = $('rotulo-lugar'); if (rt && !rt.hidden && /Bienvenido a/.test(rt.textContent)) break; await sleep(250); }
    if (!rt || rt.hidden) { out.error = 'no salió el rótulo'; return JSON.stringify(out); }
    await sleep(300);
    const mm = $('minimapa');
    const cr = caja(rt), cm = mm ? caja(mm) : null;
    out.rotulo = { texto: rt.textContent.slice(0, 90), caja: cr, topCSS: getComputedStyle(rt).top, solapaMinimapa: cm ? solapan(cr, cm) : null };
  } catch (e) { out.error = String(e && e.stack || e); }
  return JSON.stringify(out); })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1q195-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--window-size=390,844', 'about:blank'];
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi1q195-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const res = { etiqueta: ETIQUETA, pantalla: `movil ${ANCHO}x${ALTO}@${DPR} cpuX${CPUX} (iPhone emulado)`, head: null, consola: [] };
  const outJson = path.join(SALIDA, `qa195_${ETIQUETA}.json`);
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  let ses = null;
  const consola = [];
  try {
    res.head = (await cdp.call('Browser.getVersion')).product;
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Runtime.addBinding', { name: '__qa195Consola' }, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPUX }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }, ses);
    await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
    await cdp.call('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: `window.addEventListener('error', e => { try { window.__qa195Consola && window.__qa195Consola('ERROR ' + e.message); } catch (_) {} });
      const _ce = console.error.bind(console); console.error = (...a) => { try { window.__qa195Consola && window.__qa195Consola('CERR ' + a.join(' ')); } catch (_) {} _ce(...a); };` }, ses);
    await cdp.call('Runtime.enable', {}, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real` }, ses);
    res.fase = 'arranque'; fs.writeFileSync(outJson, JSON.stringify(res, null, 1));
    const t0 = Date.now(); let listo = false;
    while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 20, false)) { listo = true; break; } } catch (e) { }
      await cdp.bombear(0.5);
    }
    if (!listo) throw new Error('el juego no arrancó');
    res.fase = 'entrada'; fs.writeFileSync(outJson, JSON.stringify(res, null, 1));
    const ent = await evaluar(cdp, ses, ENTRAR_JS, 300);
    if (!/^ok/.test(ent)) throw new Error('entrada: ' + ent);
    res.fase = 'qa195-toast'; fs.writeFileSync(outJson, JSON.stringify(res, null, 1));
    await evaluar(cdp, ses, `window.__qa195Buf = [];`, 10, false);
    await evaluar(cdp, ses, `window.__qa195Consola = m => { try { window.__qa195Buf.push(m); } catch (e) {} };`, 10, false);
    res.qa195 = JSON.parse(await evaluar(cdp, ses, QA195_TOAST_JS, 150));
    await capturar(cdp, ses, path.join(SALIDA, `qa195_${ETIQUETA}_toast.jpg`));
    res.fase = 'qa195-rotulo'; fs.writeFileSync(outJson, JSON.stringify(res, null, 1));
    res.rotulo = JSON.parse(await evaluar(cdp, ses, QA195_ROTULO_JS, 120));
    await capturar(cdp, ses, path.join(SALIDA, `qa195_${ETIQUETA}_final.jpg`));
    const okToast = !!(res.qa195 && res.qa195.conDialogo && res.qa195.conDialogo.solapaMinimapa === false);
    const okRotulo = !!(res.rotulo && res.rotulo.rotulo && res.rotulo.rotulo.solapaMinimapa === false);
    res.veredicto = { toastSinSolape: okToast, rotuloSinSolape: okRotulo };
    try {
      const r = await evaluar(cdp, ses, `window.__qa195Buf ? JSON.stringify(window.__qa195Buf.splice(0)) : '[]'`, 10, false);
      const arr = JSON.parse(r || '[]'); for (const m of arr) consola.push(String(m).slice(0, 400));
    } catch (e) { }
    res.consola = consola;
    res.ok = !!(res.veredicto && res.veredicto.toastSinSolape && res.veredicto.rotuloSinSolape && consola.filter(m => /^ERROR|^CERR/.test(m)).length === 0);
  } catch (e) {
    res.error = String(e && e.message || e);
    try {
      const r = await cdp.call('Runtime.evaluate', { expression: `window.__qa195Buf ? JSON.stringify(window.__qa195Buf) : '[]'`, returnByValue: true }, ses, 10000);
      const arr = JSON.parse((r.result && r.result.value) || '[]'); for (const m of arr) consola.push(String(m).slice(0, 400));
    } catch (_) { }
    res.consola = consola;
  } finally {
    fs.writeFileSync(outJson, JSON.stringify(res, null, 1));
    try { if (ses) await cdp.call('Browser.close', {}, undefined, 8000); } catch (e) { }
    try { chrome.kill(); } catch (e) { }
    mataPorPerfil();
    try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
    srv.close();
  }
  console.log(JSON.stringify({ ok: res.ok, veredicto: res.veredicto, error: res.error || null, json: outJson }, null, 1));
  process.exit(res.ok ? 0 : 1);
})();
