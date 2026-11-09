#!/usr/bin/env node
/* QA-221 · reproducción con GPU real: el botón «Saltar intro» (#c1-saltar, z-index 11)
   queda ENCIMA de los paneles que se abren durante la apertura del cap. 1 (#card del
   Diario, z 10). iPhone 13 emulado (UA iPhone · 390×844 · DSF 3), GPU real.
   Flujo: partida nueva → apertura en curso (sin saltar) → abrir Diario (#b-diary) →
   medir el apilamiento (rects, intersección y elementsFromPoint en puntos del botón).
   Uso: node tools/build/kimi2_qa221.js [--etiqueta qa221-r1] [--url https://www.amazonaverse.com/juego] */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const ETIQ = (process.argv.indexOf('--etiqueta') > 0 ? process.argv[process.argv.indexOf('--etiqueta') + 1] : 'qa221-r1');
const URLBASE = (process.argv.indexOf('--url') > 0 ? process.argv[process.argv.indexOf('--url') + 1].replace(/\/$/, '') : '');
const CAPTURAS = path.join(RAIZ, 'docs', 'img', 'qa221'); fs.mkdirSync(CAPTURAS, { recursive: true });
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = () => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } }
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result ? r.result.value : undefined; }
const PREPARAR = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id); const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { if (f()) return true; await sleep(100); } return !!f(); }; const t = $('title'); if (!t || !t.open) return 'no hay portada abierta'; t.querySelector('form[method=dialog] button').click(); if (!await espera(() => !t.open, 3000)) return 'portada'; const cr = $('creator'); if (!cr || !await espera(() => !cr.hidden, 8000)) return 'creador'; await espera(() => $('p-stage-status') && $('p-stage-status').hidden, 30000); const s = $('p-save'); if (!s) return 'sin Empezar'; s.click(); if (!await espera(() => cr.hidden, 8000)) return 'Empezar no cerró'; const C = window.AV && window.AV.cargaEsperar ? await window.AV.cargaEsperar(30000) : null; if (!await espera(() => { const b = $('c1-saltar'); return b && b.isConnected; }, 15000)) return 'sin c1-saltar'; return 'ok' + (C ? ' carga ' + C.ms + ' ms' : ''); })()`;
const APILAR = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id); const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { if (f()) return true; await sleep(100); } return !!f(); };
  const boton = $('c1-saltar');
  if (!boton || !boton.isConnected) return { error: 'sin c1-saltar' };
  const rb = boton.getBoundingClientRect();
  const zBoton = getComputedStyle(boton).zIndex;
  const pre = { visible: rb.width > 0 && rb.height > 0, rect: { x: Math.round(rb.x), y: Math.round(rb.y), w: Math.round(rb.width), h: Math.round(rb.height) }, zIndex: zBoton };
  const bd = $('b-diary'); if (!bd) return { error: 'sin b-diary', pre };
  bd.click();
  if (!await espera(() => { const c = $('card'); return c && !c.hidden; }, 5000)) return { error: 'card no abrió', pre };
  await sleep(600);
  const card = $('card'); const rc = card.getBoundingClientRect();
  const solapa = !(rb.right < rc.left || rc.right < rb.left || rb.bottom < rc.top || rc.bottom < rb.top);
  const puntos = [ [rb.x + rb.width / 2, rb.y + rb.height / 2], [rb.x + 6, rb.y + 6], [rb.x + rb.width - 6, rb.y + rb.height / 2] ];
  const apilado = puntos.map(([x, y]) => { const l = document.elementsFromPoint(x, y); return { x: Math.round(x), y: Math.round(y), orden: l.slice(0, 4).map(e => e.id ? '#' + e.id : (e.className && String(e.className).slice(0, 24)) || e.tagName) }; });
  const ix = Math.max(rb.x, rc.left), iy = Math.max(rb.y, rc.top);
  const dentroCard = ix < Math.min(rb.right, rc.right) && iy < Math.min(rb.bottom, rc.bottom);
  const ganadorInterseccion = dentroCard ? (document.elementsFromPoint(ix + 2, iy + 2)[0] || {}).id || null : null;
  const consola = (window.__aveErrores || []).length;
  return { pre, card: { rect: { x: Math.round(rc.x), y: Math.round(rc.y), w: Math.round(rc.width), h: Math.round(rc.height) }, zIndex: getComputedStyle(card).zIndex, cabecera: (card.querySelector('h2,h3,.card-title') || {}).textContent || null }, solapa, dentroCard, ganadorInterseccion, apilado, erroresConsola: consola }; })()`;
(async () => {
  const srv = URLBASE ? { srv: { close() {} }, puerto: 0 } : await servir();
  const out = { etiqueta: ETIQ, hora_utc: new Date().toISOString(), base: URLBASE || 'local', head: null, ok: true };
  try { out.head = require('child_process').execSync('git rev-parse --short=8 HEAD', { cwd: RAIZ }).toString().trim(); } catch (e) {}
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2q221-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--user-agent=' + IPHONE_UA, '--window-size=390,844', '--force-device-scale-factor=3'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  let puertoDev, wsPath;
  for (let i = 0; i < 100; i++) { try { const s = fs.readFileSync(path.join(perf, 'DevToolsActivePort'), 'utf8').split('\n'); if (s.length > 1) { puertoDev = parseInt(s[0], 10); wsPath = s[1]; break; } } catch (e) {} await new Promise(r => setTimeout(r, 150)); }
  if (!puertoDev) { chrome.kill(); srv.srv.close(); throw new Error('sin DevToolsActivePort: ' + err.slice(-300)); }
  const WebSocket = (() => { try { return require('ws'); } catch (e) { return globalThis.WebSocket; } })();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const { targetId } = await cdp.call('Target.createTarget', { url: 'about:blank' });
  const { sessionId: ses } = await cdp.call('Target.attachToTarget', { targetId, flatten: true });
  await cdp.call('Page.enable', {}, ses); await cdp.call('Runtime.enable', {}, ses);
  let capt = 0;
  try {
    await cdp.call('Page.navigate', { url: URLBASE ? `${URLBASE}/?fps=1` : `http://127.0.0.1:${srv.puerto}/?fps=1` }, ses);
    await new Promise(r => setTimeout(r, 3500));
    out.prep = await ev(cdp, ses, PREPARAR, 90);
    const foto = async (nombre) => { const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 20000); fs.writeFileSync(path.join(CAPTURAS, `${ETIQ}_${nombre}.jpg`), Buffer.from(shot.data, 'base64')); capt++; };
    await foto('apertura');
    out.apilado = await ev(cdp, ses, APILAR, 30);
    await foto('diario_abierto');
    out.checks = {
      boton_visible: !!(out.apilado && out.apilado.pre && out.apilado.pre.visible),
      card_abrio: !!(out.apilado && out.apilado.card),
      panel_encima: !!(out.apilado && out.apilado.ganadorInterseccion !== 'c1-saltar'),
    };
    for (const k in out.checks) if (!out.checks[k]) out.ok = false;
  } catch (e) { out.error = String(e).slice(0, 300); out.ok = false; }
  try { await cdp.call('Browser.close', {}, ses); } catch (e) { chrome.kill(); }
  await new Promise(r => setTimeout(r, 800));
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) {}
  srv.srv.close();
  out.capturas = capt;
  console.log(JSON.stringify(out, null, 1));
})().catch(e => { console.error('FATAL', e); process.exit(1); });
