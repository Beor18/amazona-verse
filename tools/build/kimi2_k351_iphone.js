#!/usr/bin/env node
/* KIMI-351 · sonda iPhone emulado del perfil IPH-1 (710dfbee) en HEAD actual.
   Chrome headless con UA de iPhone, 390×844 y DSF 3, GPU real. Dos páginas:
     A) sin parámetros de calidad  → auto-detect: esperado calidad 'bajo' (perfil iphone,
        este PC sin iPhone daría 'alto'), dpr en [1,25, 1,75], escuela NO auto.
     B) ?escuela=1                 → el Modo Escuela sí entra por URL (escape hatch IPH-1).
   Mide tras asentar: stats() (fps/calls/tris/calidad/dpr/escuela), devicePixelRatio,
   AV.look.medir() (texturasMB, heapMB) y renderer.info.memory.
   Uso: node tools/build/kimi2_k351_iphone.js [--etiqueta k351-iphone-r1] [--url https://www.amazonaverse.com/juego] */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const ETIQ = (process.argv.indexOf('--etiqueta') > 0 ? process.argv[process.argv.indexOf('--etiqueta') + 1] : 'k351-iphone-r1');
const URLBASE = (process.argv.indexOf('--url') > 0 ? process.argv[process.argv.indexOf('--url') + 1].replace(/\/$/, '') : '');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = () => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } }
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result ? r.result.value : undefined; }
const PREPARAR = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id); const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { if (f()) return true; await sleep(100); } return !!f(); }; const t = $('title'); if (!t || !t.open) return 'no hay portada abierta'; t.querySelector('form[method=dialog] button').click(); if (!await espera(() => !t.open, 3000)) return 'portada'; const cr = $('creator'); if (!cr || !await espera(() => !cr.hidden, 8000)) return 'creador'; await espera(() => $('p-stage-status') && $('p-stage-status').hidden, 30000); const s = $('p-save'); if (!s) return 'sin Empezar'; s.click(); if (!await espera(() => cr.hidden, 8000)) return 'Empezar no cerró'; const C = window.AV && window.AV.cargaEsperar ? await window.AV.cargaEsperar(30000) : null; const sx = $('c1-saltar'); if (sx) sx.click(); return 'ok' + (C ? ' carga ' + C.ms + ' ms' : ''); })()`;
async function pagina(srv, extra) {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2ip-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--user-agent=' + IPHONE_UA, '--window-size=390,844', '--force-device-scale-factor=3'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort');
  let puertoDev, wsPath;
  for (let i = 0; i < 100; i++) { try { const s = fs.readFileSync(pf, 'utf8').split('\n'); if (s.length > 1) { puertoDev = parseInt(s[0], 10); wsPath = s[1]; break; } } catch (e) {} await new Promise(r => setTimeout(r, 150)); }
  if (!puertoDev) { chrome.kill(); throw new Error('sin DevToolsActivePort: ' + err.slice(-300)); }
  const WebSocket = (() => { try { return require('ws'); } catch (e) { return globalThis.WebSocket; } })();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const { targetId } = await cdp.call('Target.createTarget', { url: 'about:blank' });
  const { sessionId: ses } = await cdp.call('Target.attachToTarget', { targetId, flatten: true });
  await cdp.call('Page.enable', {}, ses);
  await cdp.call('Runtime.enable', {}, ses);
  await cdp.call('Page.navigate', { url: URLBASE ? `${URLBASE}/?fps=1${extra}` : `http://127.0.0.1:${srv.puerto}/?fps=1${extra}` }, ses);
  await new Promise(r => setTimeout(r, 3500));
  const prep = await ev(cdp, ses, PREPARAR, 90);
  await new Promise(r => setTimeout(r, 9000)); // asentar: que corra la calidad automática y la resolución dinámica
  const muestra = await ev(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms));
    const fps0 = window.AV && AV.G && AV.G.renderer && AV.G.renderer.stats ? AV.G.renderer.stats() : null;
    let cuadros = 0; const t0 = performance.now(); const conta = () => { cuadros++; if (performance.now() - t0 < 6000) requestAnimationFrame(conta); }; requestAnimationFrame(conta); await sleep(6200);
    const stats = AV.G.renderer.stats ? AV.G.renderer.stats() : null;
    let med = null, medErr = ''; try { med = (AV.look && typeof AV.look.medir === 'function') ? AV.look.medir() : null; } catch (e) { medErr = String(e && e.message || e).slice(0, 160); }
    const info = AV.G.renderer && AV.G.renderer.info ? { geo: AV.G.renderer.info.memory.geometries, tex: AV.G.renderer.info.memory.textures } : null;
    const heap = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
    return { ua: navigator.userAgent.slice(0, 80), nucleos: navigator.hardwareConcurrency, dpr: window.devicePixelRatio, fpsMed: Math.round(cuadros / 6), stats, med: med ? { texturasMB: med.texturasMB, calls: med.calls, triangulos: med.triangulos, heapMB: med.heapMB, texturasPor: med.texturasPor } : null, medErr, info, heapMB: heap }; })()`, 60);
  // vigilar que el Modo Escuela no se encienda solo en los siguientes 20 s
  const escuelaLate = await ev(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)); const v = []; for (let i = 0; i < 5; i++) { await sleep(4000); v.push(AV.G.renderer.stats() ? { escuela: AV.G.renderer.stats().escuela, dpr: AV.G.renderer.stats().dpr, calidad: AV.G.renderer.stats().calidad } : null); } return v; })()`, 60);
  const consola = await ev(cdp, ses, `(window.__aveErrores || (window.AV && AV.G && AV.G.consolaErrores) || []).length`, 10).catch(() => null);
  try { await cdp.call('Browser.close', {}, ses); } catch (e) { chrome.kill(); }
  await new Promise(r => setTimeout(r, 800));
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) {}
  return { prep, muestra, escuelaLate, erroresConsola: consola };
}
(async () => {
  const srv = URLBASE ? { srv: { close() {} }, puerto: 0 } : await servir();
  const out = { etiqueta: ETIQ, hora_utc: new Date().toISOString(), base: URLBASE || 'local', head: null, paginas: {}, ok: true };
  try { out.head = require('child_process').execSync('git rev-parse --short=8 HEAD', { cwd: RAIZ }).toString().trim(); } catch (e) {}
  try { out.paginas.auto = await pagina(srv, ''); } catch (e) { out.paginas.auto = { error: String(e).slice(0, 300) }; out.ok = false; }
  try { out.paginas.escuela = await pagina(srv, '&escuela=1'); } catch (e) { out.paginas.escuela = { error: String(e).slice(0, 300) }; out.ok = false; }
  srv.srv.close();
  const a = out.paginas.auto && out.paginas.auto.muestra;
  if (a) {
    out.chequeos = {
      auto_calidad_bajo: a.stats && a.stats.calidad === 'bajo',
      // el DPR del RENDERER (stats().dpr) es el que importa; window.devicePixelRatio es el del navegador emulado (DSF 3)
      auto_dpr_125_175: a.stats && a.stats.dpr >= 1.25 && a.stats.dpr <= 1.75,
      auto_dpr_subio_solo: (out.paginas.auto.escuelaLate || []).some(x => x && x.dpr === 1.75),
      auto_escuela_nunca: (out.paginas.auto.escuelaLate || []).every(x => !x || x.escuela !== true),
      sin_errores_consola: !out.paginas.auto.erroresConsola,
    };
    const e = out.paginas.escuela && out.paginas.escuela.muestra;
    if (e) out.chequeos.escuela_url_entra = e.stats && e.stats.escuela === true;
    for (const k in out.chequeos) if (!out.chequeos[k]) out.ok = false;
  } else out.ok = false;
  console.log(JSON.stringify(out, null, 1));
})().catch(e => { console.error('FATAL', e); process.exit(1); });
