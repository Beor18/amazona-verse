#!/usr/bin/env node
/* Sonda KIMI-331 (Kimi 3): mide el coste real de streaming.cuadro() por cuadro in vivo.
   Sándwich de ganchos 'render': prio 21 (antes) / 23 (después); cuadro() va a prio 22 y no hay
   otro gancho entre 21 y 23 (por defecto 50; fx a 30/40) → el delta es cuadro() exacto.
   Perfil Chromebook (1366×768, CPU ×6, calidad 'bajo', GPU real). Dos vistas: spawn asentado y
   vuelo +35 m (más instancias a la vista). Sin cambios de código: solo lectura.
   Uso: node tools/build/kimi3_331_cuadro.js --etiqueta base-r1 */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn, execSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const ETIQUETA = arg('--etiqueta', 'base-r1');
const MEDIR_S = parseFloat(arg('--segs', '20'));
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi331');
fs.mkdirSync(SALIDA, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = () => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result ? r.result.value : undefined; }
const RES = { tarea: 'KIMI-331', sonda: 'streaming.cuadro ms/cuadro (sandwich render 21/23)', etiqueta: ETIQUETA, head: '', gpu: '', cuandos: new Date().toISOString(), vistas: {}, consola: { errores: 0, muestras: [] } };
const SPY_JS = `(() => { const G = window.AV.G;
  if (window.__k331spy) return 'ya';
  const est = { n: 0, suma: 0, max: 0, hist: [] }; let t0 = 0;
  G.on('render', () => { t0 = performance.now(); }, 21);
  G.on('render', () => { const d = performance.now() - t0; est.n++; est.suma += d; if (d > est.max) est.max = d; est.hist.push(d); if (est.hist.length > 6000) est.hist.shift(); }, 23);
  window.__k331spy = est; return 'ok'; })()`;
const RESET_JS = `(() => { const e = window.__k331spy; if (!e) return 'sin spy'; e.n = 0; e.suma = 0; e.max = 0; e.hist.length = 0; return 'reset'; })()`;
const LEER_JS = `(() => { const e = window.__k331spy; if (!e || !e.n) return null; const h = e.hist.slice().sort((a, b) => a - b);
  const pct = p => h.length ? +h[Math.min(h.length - 1, Math.floor(h.length * p))].toFixed(4) : 0;
  const G = window.AV.G, ST = G.mundo && G.mundo.streaming, st = G.renderer.stats();
  let nActivas = null, nZonas = null, nLotes = null;
  try { nActivas = ST.instancias ? ST.instancias.length : null; nZonas = ST.zonas ? Object.keys(ST.zonas).length : null; nLotes = ST.lotes ? Object.keys(ST.lotes).length : null; } catch (err) {}
  return { cuadros: e.n, avgMs: +(e.suma / e.n).toFixed(4), p50Ms: pct(0.5), p95Ms: pct(0.95), maxMs: +e.max.toFixed(4),
    fps: st.fps, calls: st.calls, tris: st.triangulos, calidad: st.calidad, escuela: G.renderer.calidad && G.renderer.calidad.escuela,
    nActivas, nZonas, nLotes, heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null }; })()`;
const ASENTADO_JS = `new Promise(ok => { const t0 = Date.now(); const mira = () => { try { const ST = window.AV.G.mundo && window.AV.G.mundo.streaming; const s = ST && ST.stats(); if (s && s.descargando === 0 && s.trabajos === 0) return ok('asentado'); } catch (e) {} if (Date.now() - t0 > 15000) return ok('tope'); setTimeout(mira, 500); }; mira(); })`;
(async () => {
  RES.head = execSync('git rev-parse --short HEAD', { cwd: RAIZ }).toString().trim();
  try { RES.gpu = execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_VideoController | Where-Object { $_.AdapterRAM -gt 0 } | Select-Object -First 1).Name"', { timeout: 15000 }).toString().trim(); } catch (e) { RES.gpu = '?'; }
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3c331-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--window-size=1366,768'], { stdio: 'ignore' });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoDev) { try { chrome.kill(); } catch (e) { } throw new Error('Chrome no abrió DevTools'); }
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') { RES.consola.errores++; if (RES.consola.muestras.length < 8) RES.consola.muestras.push('EXC ' + JSON.stringify(d.params.exceptionDetails).slice(0, 300)); } if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') { RES.consola.errores++; if (RES.consola.muestras.length < 8) RES.consola.muestras.push('ERR ' + JSON.stringify(d.params.args).slice(0, 300)); } });
  const { targetId } = await cdp.call('Target.createTarget', { url: 'about:blank' });
  const { sessionId: ses } = await cdp.call('Target.attachToTarget', { targetId, flatten: true });
  await cdp.call('Page.enable', {}, ses); await cdp.call('Runtime.enable', {}, ses);
  await cdp.call('Emulation.setCPUThrottlingRate', { rate: 6 }, ses);
  await cdp.call('Page.navigate', { url: origen + '/index.html?calidad=bajo' }, ses);
  let listo = false; const tL = Date.now();
  while (Date.now() - tL < 150000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!listo) throw new Error('el juego no arrancó');
  RES.preparar = String(await ev(cdp, ses, CFG.preparar_js, 300)).slice(0, 160);
  RES.asentarSpawn = await ev(cdp, ses, ASENTADO_JS, 25);
  await cdp.bombear(3);
  // VISTA 1: spawn asentado
  RES.spy = await ev(cdp, ses, SPY_JS, 10, false);
  await ev(cdp, ses, RESET_JS, 5, false);
  await cdp.bombear(MEDIR_S);
  RES.vistas.spawn = await ev(cdp, ses, LEER_JS, 15);
  // VISTA 2: vuelo +35 m (más instancias a la vista)
  RES.vuelo = await ev(cdp, ses, `(() => { const AV = window.AV, G = AV.G, S = G.S, ST = G.mundo && G.mundo.streaming;
    if (!ST) return 'sin streaming'; S.pos.y += 35; S.vy = 0; G.fisica.MOVE.flying = true; ST.alrededor(S.pos.x, S.pos.z);
    return 'volando y=' + Math.round(S.pos.y * 10) / 10; })()`, 10, false);
  RES.asentarVuelo = await ev(cdp, ses, ASENTADO_JS, 25);
  await cdp.bombear(2);
  await ev(cdp, ses, RESET_JS, 5, false);
  await cdp.bombear(MEDIR_S);
  RES.vistas.vuelo = await ev(cdp, ses, LEER_JS, 15);
  RES.baja = await ev(cdp, ses, `(() => { const G = window.AV.G, S = G.S; S.pos.y = Math.max(2, S.pos.y - 35); G.fisica.MOVE.flying = false; G.fisica.MOVE.landing = true; return 'bajando'; })()`, 8, false);
  fs.writeFileSync(path.join(SALIDA, `k331_${ETIQUETA}.json`), JSON.stringify(RES, null, 1));
  console.log(JSON.stringify(RES, null, 1));
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  try { chrome.kill(); } catch (e) { }
  await cdp.bombear(1.2);
  try { execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(AQUI, 'kimi2_mata_perfil.ps1')}" ${path.basename(perf)}`, { timeout: 30000 }); } catch (e) { }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e && e.message || e); process.exit(1); });
