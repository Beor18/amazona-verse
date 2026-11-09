#!/usr/bin/env node
/* Amazona Verse · Kimi 1 — QA-221: «Saltar intro» (#c1-saltar) no debe tapar paneles modales
   durante la apertura del cap. 1. Entrada REAL de niño nuevo (portada → creador → Empezar,
   firstTime → G.pack.inicio): con el botón vivo se abre el Diario (#b-diary → #card) y se
   comprueba el orden de pintado con elementFromPoint sobre el solape botón∩tarjeta; luego se
   cierra (#d-close) y se comprueba que el botón sigue usable (encima del negro #c1-fade).
   iPhone 13 emulado 390×844 dpr 3 táctil (mismo perfil que la pasada K4-21 que lo reportó).
   Uso: node tools/build/kimi1_qa221.js [--etiqueta r1] */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, spawnSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ETIQUETA = arg('--etiqueta', 'r1');
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi221');
fs.mkdirSync(SALIDA, { recursive: true });
const LOGF = path.join(SALIDA, `qa221_${ETIQUETA}.log`);
fs.writeFileSync(LOGF, '');
function log(m) { try { fs.appendFileSync(LOGF, `[${new Date().toISOString().slice(11, 19)}] ${m}\n`); } catch (e) { } }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.webp': 'image/webp', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); const zas = m => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + m)); this.pend.clear(); }; ws.onerror = e => zas(e.message || 'error'); ws.onclose = () => zas('cerrado'); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(method, params, sessionId, timeoutMs) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method, params: params || {}, sessionId })); if (timeoutMs) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + method)); } }, timeoutMs); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function evaluar(cdp, ses, exp, timeoutS, promesa) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: promesa !== false, returnByValue: true }, ses, (timeoutS || 30) * 1000); if (r.exceptionDetails) { const d = r.exceptionDetails; throw new Error('JS@' + (d.lineNumber != null ? d.lineNumber + ':' + d.columnNumber : '?') + ': ' + JSON.stringify(d.exception && d.exception.description || d.text).slice(0, 400)); } return r.result ? r.result.value : undefined; }
async function espera(cdp, ses, exp, segs) { const t0 = Date.now(); while (Date.now() - t0 < segs * 1000) { try { if (await evaluar(cdp, ses, exp, 8, false)) return true; } catch (e) { } await cdp.bombear(0.4); } return false; }

const SEMILLA = `try {
  localStorage.clear(); sessionStorage.clear();
  window.__erroresConsola = [];
  addEventListener('error', e => __erroresConsola.push(String(e.message || e)));
  addEventListener('unhandledrejection', e => __erroresConsola.push('rechazo: ' + (e.reason && e.reason.message || e.reason)));
  const cerr = console.error; console.error = function () { try { __erroresConsola.push([].map.call(arguments, String).join(' ').slice(0, 300)); } catch (e) {} return cerr.apply(this, arguments); };
} catch (e) {}`;

// Medición completa en página: rects, z-index calculados y elementFromPoint con el Diario abierto y cerrado.
// Devuelve JSON con: fases, solape botón∩tarjeta, puntos de prueba y qué elemento queda arriba en cada uno.
const MEDIR_JS = `(async () => { try { return await (async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } return false; };
  const z = el => { if (!el) return null; const v = getComputedStyle(el).zIndex; const n = parseInt(v, 10); return isNaN(n) ? v : n; };
  const dentro = (el, anc) => { let q = el; while (q) { if (q === anc) return true; q = q.parentElement; } return false; };
  const rectDe = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
  const btn = $('c1-saltar');
  if (!btn) return JSON.stringify({ error: 'sin #c1-saltar (la apertura no está en curso o ya terminó)' });
  const base = {
    boton: rectDe(btn), zBoton: z(btn), zCard: z($('card')), zDialog: z($('dialog')),
    fade: !!$('c1-fade'), botonVisible: !!(btn.offsetWidth && btn.offsetHeight)
  };
  // 1) Con el panel cerrado: el botón debe quedar encima de todo lo que no sea panel (es utilizable).
  const c0 = [base.boton.x + Math.round(base.boton.w / 2), base.boton.y + Math.round(base.boton.h / 2)];
  const c1 = [base.boton.x + Math.round(base.boton.w * 0.25), base.boton.y + Math.round(base.boton.h / 2)];
  const el0 = document.elementFromPoint(c0[0], c0[1]), el1 = document.elementFromPoint(c1[0], c1[1]);
  base.cerrado = {
    p0: { pt: c0, el: el0 ? (el0.id || el0.className || el0.tagName) : null, esBoton: el0 === btn },
    p1: { pt: c1, el: el1 ? (el1.id || el1.className || el1.tagName) : null, esBoton: el1 === btn }
  };
  // 2) Abrir el Diario y medir el solape.
  const bd = $('b-diary');
  if (!bd || bd.hidden) return JSON.stringify({ ...base, error: 'botón #b-diary no disponible para abrir el Diario' });
  bd.click();
  if (!await espera(() => $('card') && !$('card').hidden, 5000)) return JSON.stringify({ ...base, error: 'el Diario (#card) no se abrió' });
  await sleep(400);
  const card = $('card');
  const rc = rectDe(card);
  const ix = Math.max(base.boton.x, rc.x), iy = Math.max(base.boton.y, rc.y);
  const iw = Math.min(base.boton.x + base.boton.w, rc.x + rc.w) - ix, ih = Math.min(base.boton.y + base.boton.h, rc.y + rc.h) - iy;
  const solape = iw > 0 && ih > 0 ? { x: ix, y: iy, w: iw, h: ih } : null;
  const puntos = [];
  if (solape) {
    for (const fx of [0.25, 0.5, 0.75]) for (const fy of [0.25, 0.5, 0.75]) {
      const px = Math.round(solape.x + solape.w * fx), py = Math.round(solape.y + solape.h * fy);
      const el = document.elementFromPoint(px, py);
      puntos.push({ pt: [px, py], el: el ? (el.id || el.className || el.tagName) : null, esBoton: el === btn, enCard: dentro(el, card) });
    }
  }
  const abierto = { card: rc, solape, puntos, botonTapado: puntos.some(p => p.esBoton) };
  await sleep(300);
  return JSON.stringify({ ...base, abierto }); })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

const CERRAR_Y_MEDIR_JS = `(async () => { try { return await (async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } return false; };
  const dc = $('d-close'); if (dc) dc.click();
  if (!await espera(() => $('card').hidden, 5000)) return JSON.stringify({ error: '#card no se cerró' });
  await sleep(300);
  const btn = $('c1-saltar');
  if (!btn) return JSON.stringify({ error: '#c1-saltar desapareció al cerrar el Diario (la apertura terminó)' });
  const r = btn.getBoundingClientRect();
  const pts = [[Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)], [Math.round(r.x + r.width * 0.25), Math.round(r.y + r.height / 2)]];
  const res = pts.map(pt => { const el = document.elementFromPoint(pt[0], pt[1]); return { pt, el: el ? (el.id || el.className || el.tagName) : null, esBoton: el === btn }; });
  return JSON.stringify({ cerrado: { boton: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, puntos: res } }); })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1q221-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-component-update', '--window-size=420,940'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort');
  let puertoD = 0, wsPath = ''; for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoD = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoD) { console.log(JSON.stringify({ ok: false, error: 'sin DevTools: ' + err.slice(0, 200) })); process.exit(1); }
  const ws = new WebSocket(`ws://127.0.0.1:${puertoD}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const fin = cod => { try { spawnSync('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' }); } catch (e) { } try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { } srv.close(); process.exit(cod); };
  const res = { tarea: 'QA-221', etiqueta: ETIQUETA, pantalla: 'iphone 390x844@3 tactil', head: null };
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }, ses);
    await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA }, ses);
    log('navegando a la portada (almacén limpio, niño nuevo)');
    await cdp.call('Page.navigate', { url: origen + '/index.html' }, ses);
    if (!await espera(cdp, ses, `(() => { const t = document.getElementById('title'); return t && t.open; })()`, 120)) throw new Error('la portada no abrió en 120 s');
    const prep = await evaluar(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
      const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } return false; };
      const t = $('title');
      if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene Jugar'; b.click(); if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta'; }
      if (!await espera(() => { const cr = $('creator'); return cr && !cr.hidden; }, 15000)) return 'el creador no apareció';
      const cr = $('creator');
      await espera(() => $('p-stage-status') && $('p-stage-status').hidden, 30000);
      const s = $('p-save'); if (!s) return 'el creador no tiene Empezar';
      s.click(); if (!await espera(() => cr.hidden, 8000)) return 'Empezar no cerró el creador';
      if (!await espera(() => window.AV && AV.state && AV.state.profile && AV.state.profile.created, 10000)) return 'sin perfil creado';
      return 'ok'; })()`, 120);
    log('entrada: ' + prep);
    if (prep !== 'ok') throw new Error('entrada: ' + prep);
    if (!await espera(cdp, ses, `!!document.getElementById('c1-saltar')`, 90)) throw new Error('#c1-saltar no apareció en 90 s (la apertura no arrancó)');
    log('apertura en curso: #c1-saltar visible');
    await cdp.bombear(1.2);
    const m = await evaluar(cdp, ses, MEDIR_JS, 60);
    if (typeof m === 'string' && m.indexOf('ERR') === 0) throw new Error(m);
    res.medida = JSON.parse(m);
    log('medida con Diario: zBoton=' + res.medida.zBoton + ' zCard=' + res.medida.zCard + ' zDialog=' + res.medida.zDialog +
      (res.medida.abierto && res.medida.abierto.solape ? ' solape=' + JSON.stringify(res.medida.abierto.solape) : ' sin-solape') +
      (res.medida.abierto ? ' botonTapado=' + res.medida.abierto.botonTapado : ''));
    const shot1 = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 30000);
    fs.writeFileSync(path.join(SALIDA, `qa221_${ETIQUETA}_diario_abierto.jpg`), Buffer.from(shot1.data, 'base64'));
    const c2 = await evaluar(cdp, ses, CERRAR_Y_MEDIR_JS, 30);
    if (typeof c2 === 'string' && c2.indexOf('ERR') === 0) throw new Error(c2);
    res.cierre = JSON.parse(c2);
    log('tras cerrar: ' + JSON.stringify(res.cierre));
    const shot2 = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 30000);
    fs.writeFileSync(path.join(SALIDA, `qa221_${ETIQUETA}_diario_cerrado.jpg`), Buffer.from(shot2.data, 'base64'));
    res.errores = await evaluar(cdp, ses, `(window.__erroresConsola || []).slice(0, 10)`, 10, false);
    res.head = await new Promise(r => { require('child_process').exec('git -C "' + RAIZ + '" rev-parse --short HEAD', (e, so) => r((so || '').trim())); });
    const okZ = res.medida.zBoton != null && res.medida.zCard != null && res.medida.zBoton < res.medida.zCard && (res.medida.zDialog == null || res.medida.zBoton < res.medida.zDialog);
    const okTapado = res.medida.abierto && !res.medida.abierto.botonTapado;
    const okSolapeInfo = res.medida.abierto ? !!res.medida.abierto.solape : false;
    const okCierra = res.cierre && res.cierre.cerrado && res.cierre.cerrado.puntos.some(p => p.esBoton) && !res.cierre.cerrado.puntos.some(p => /card|dialog/i.test(p.el || ''));
    res.checks = { zBajoPaneles: okZ, sinTaparConDiario: okTapado, haySolapeGeometrico: okSolapeInfo, botonUsableTrasCerrar: okCierra };
    res.ok = okZ && okTapado && okCierra && !(res.errores && res.errores.length);
    log('veredicto: ' + (res.ok ? 'OK' : 'FALLO') + ' ' + JSON.stringify(res.checks));
  } catch (e) {
    res.error = String(e && e.message || e).slice(0, 400); res.ok = false; log('ERROR ' + res.error);
  } finally {
    fs.writeFileSync(path.join(SALIDA, `qa221_${ETIQUETA}.json`), JSON.stringify(res, null, 1));
    log('json: ' + path.join(SALIDA, `qa221_${ETIQUETA}.json`));
    console.log(JSON.stringify({ ok: res.ok, error: res.error || null, checks: res.checks || null, json: `docs/img/kimi221/qa221_${ETIQUETA}.json` }, null, 1));
    fin(res.ok ? 0 : 2);
  }
})();
