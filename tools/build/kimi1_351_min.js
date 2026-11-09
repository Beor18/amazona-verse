// KIMI-351 (Kimi 1) · probe IPH-1 mínimo: patrón diag probado (poll-retry de evals, como kimi2_empezar).
// Sirve el worktree, emula iPhone (390×844 dpr 3 táctil UA iPhone CPU ×4), siembra partida cap1,
// entra al mundo y muestrea 35 s: FPS, draw calls, tris, DPR (la clave: siempre [1,25–1,75]),
// bandera escuela (no debe encenderse sola) y errores de consola. Captura con el panel ?fps=1.
'use strict';
const fs = require('fs'), http = require('http'), os = require('os'), path = require('path');
const { spawn, execSync } = require('child_process');
const WebSocket = (() => { try { return require('ws'); } catch (e) { return global.WebSocket; } })();
const RAIZ = path.resolve(__dirname, '../..');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ETIQUETA = process.argv[2] || 'k351-min-r1';
const SECS = parseInt(process.argv[3] || '35', 10);
const SALIDA = path.join(RAIZ, 'docs/img/kimi351');
fs.mkdirSync(SALIDA, { recursive: true });
const LOG = path.join(SALIDA, `k351_${ETIQUETA}.log`);
const log = m => { const l = `[${new Date().toISOString().slice(11, 19)}] ${m}`; try { fs.appendFileSync(LOG, l + '\n'); } catch (e) { } console.log(l); };
const res = { tarea: 'KIMI-351', etiqueta: ETIQUETA, head: null, emulacion: { ua: 'iPhone', ancho: 390, alto: 844, dpr: 3, cpu: 4, urlExtra: 'fps=1' }, perfil: null, muestra: null, look: null, captura: null, errores: null };
function guardar() { try { fs.writeFileSync(path.join(SALIDA, `k351_${ETIQUETA}.json`), JSON.stringify(res, null, 1)); } catch (e) { } }

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.wasm': 'application/wasm' };
function servir() { const srv = http.createServer((req, r) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { r.writeHead(400); return r.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { r.writeHead(403); return r.end(); } fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end('404'); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); r.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { let d; try { d = JSON.parse(m.data); } catch (e) { return; } if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(JSON.stringify(d.error).slice(0, 200))) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(method, params, sessionId, timeoutMs) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); try { this.ws.send(JSON.stringify({ id, method, params: params || {}, sessionId })); } catch (e) { this.pend.delete(id); return re2(e); } if (timeoutMs) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + method)); } }, timeoutMs); }); }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
// eval con reintentos: el hilo principal a ×4 puede tardar; cada intento con timeout corto y catch
async function evR(cdp, ses, exp, t) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: true, returnByValue: true }, ses, (t || 8) * 1000); if (r.exceptionDetails) { const d = r.exceptionDetails; throw new Error('JS: ' + JSON.stringify(d.exception && d.exception.description || d.text).slice(0, 400)); } return r.result ? r.result.value : undefined; }
async function evalPoll(cdp, ses, exp, timeoutS, pasoS) { const t0 = Date.now(); let ultErr = null; while (Date.now() - t0 < timeoutS * 1000) { try { return await evR(cdp, ses, exp, pasoS || 8); } catch (e) { ultErr = e; await cdp.bombear(0.5); } } throw (ultErr || new Error('evalPoll agotado')); }

const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const SEMILLA = `try {
  localStorage.clear(); sessionStorage.clear();
  window.__err = [];
  addEventListener('error', e => __err.push(String(e.message || e)));
  addEventListener('unhandledrejection', e => __err.push('rechazo: ' + (e.reason && e.reason.message || e.reason)));
  const ce = console.error; console.error = function () { try { __err.push([].map.call(arguments, String).join(' ').slice(0, 300)); } catch (e) {} return ce.apply(this, arguments); };
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', '{"v":6,"formato":2,"escrito":${Date.now()},"saveId":"qa-k351min","profile":{"created":true,"name":"Estrella de la Bahía","look":null},"pos":{"x":-8,"z":-2.5,"y":0},"facing":{"x":0,"z":1},"step":0,"inv":{},"collected":[],"complete":false,"explorando":false,"clock":0,"events":[],"captures":{},"missions":{},"field":[],"unlocked":[],"wear":{},"comic":{"title":"Mi cómic","cover":"vittata","layout":"grid","order":[0,1,2,3],"captions":{},"vinetas":{}},"evaluated":{"A":false,"B":false},"examined":{"maquina":false,"transmisor":false}}');
  'semilla ok';
} catch (e) { 'semilla ERR ' + e; }`;

const LISTO = `(() => { try { const S = window.AV && window.AV.state; if (!S) return ''; if (!(S.profile && S.profile.created)) return 'perfil'; if (window.AV.cargaEsperar) {} return 'listo'; } catch (e) { return ''; } })()`;

const ENTRAR = `(async () => { try { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(150); } return false; };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (b) { b.click(); await espera(() => !t.open, 8000); } }
  if (window.AV.cargaEsperar) { try { await window.AV.cargaEsperar(60000); } catch (e) {} }
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 90000);
  const b = document.getElementById('c1-saltar'); if (b) b.click();
  await sleep(800);
  const f = document.getElementById('c1-fade'); if (f) f.remove();
  if (AV.G.ui && AV.G.ui.hideToast) AV.G.ui.hideToast();
  try { window.dispatchEvent(new PointerEvent('pointerdown')); } catch (e) {}
  const vis = !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden());
  return vis ? 'ok mundo visible' : 'ERR mundo oculto'; } catch (e) { return 'ERR ' + (e && e.message || e); } })()`;

const PERFIL = `(() => { try { const R = AV.G.renderer;
  return JSON.stringify({ equipo: R.equipo, calidad: R.calidad.nivel, escuela: R.calidad.escuela, deviceDPR: window.devicePixelRatio, dpr: R.stats().dpr, gpu: R.stats().gpu });
} catch (e) { return 'ERR ' + e; } })()`;

const MUESTRA = `(async (durSec) => { try {
  const G = AV.G, sleep = ms => new Promise(r => setTimeout(r, ms));
  const deltas = []; let ult = performance.now(); let vivo = true;
  const marca = () => { if (!vivo) return; const a = performance.now(); deltas.push(a - ult); ult = a; requestAnimationFrame(marca); };
  requestAnimationFrame(marca);
  const stats = []; const t0 = performance.now();
  while (performance.now() - t0 < durSec * 1000) {
    await sleep(1000);
    try { const st = G.renderer.stats(); const m = performance.memory;
      stats.push({ calls: st.calls, ktris: st.triangulos != null ? Math.round(st.triangulos / 1000) : null, fpsMedidor: st.fps, dpr: st.dpr, escuela: st.escuela === true, heapMB: m ? Math.round(m.usedJSHeapSize / 1048576) : null }); } catch (e) { stats.push(null); }
  }
  vivo = false; deltas.shift();
  const porSeg = []; let ac = 0, n = 0;
  for (const d of deltas) { ac += d; n++; if (ac >= 1000) { porSeg.push(Math.round(1000 / (ac / n))); ac = 0; n = 0; } }
  if (n > 5) porSeg.push(Math.round(1000 / (ac / n)));
  const orden = deltas.slice().sort((a, b) => a - b);
  const pct = p => orden.length ? Math.round(orden[Math.min(orden.length - 1, Math.floor(orden.length * p))]) : null;
  let pausas50 = 0; for (const d of deltas) { if (d > 50) pausas50++; }
  const dprs = stats.filter(Boolean).map(s => s.dpr);
  return JSON.stringify({ fpsPorSeg: porSeg, fpsMed: porSeg.length ? Math.round(porSeg.reduce((s, x) => s + x, 0) / porSeg.length) : null,
    fpsMin: porSeg.length ? Math.min.apply(null, porSeg) : null, peorMs: deltas.length ? Math.round(Math.max.apply(null, deltas)) : null,
    medianaMs: pct(0.5), p95Ms: pct(0.95), pausas50,
    dprMin: dprs.length ? Math.min.apply(null, dprs) : null, dprMax: dprs.length ? Math.max.apply(null, dprs) : null,
    stats, escuelaFinal: String(G.renderer.calidad.escuela), errores: (window.__err || []).slice(0, 10) });
} catch (e) { return 'ERR ' + (e && e.stack || e); } })`;

(async () => {
  try { res.head = execSync('git rev-parse --short HEAD', { cwd: RAIZ }).toString().trim(); } catch (e) { }
  log(`KIMI-351 mínimo · IPH-1 · HEAD ${res.head} · ${SECS} s`);
  const { srv, puerto } = await servir();
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k351m-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', '--window-size=390,844', '--force-device-scale-factor=3', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const fin = (cod, msg) => { guardar(); try { srv.close(); } catch (e) { } try { execSync(`powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name='chrome.exe'\\" | Where-Object { \\$_.CommandLine -like '*kimi1k351m-*' } | ForEach-Object { Stop-Process -Id \\$_.ProcessId -Force -ErrorAction SilentlyContinue }"`, { timeout: 30000, stdio: 'ignore' }); } catch (e) { } try { chrome.kill(); } catch (e) { } try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { } log(msg); process.exit(cod); };
  process.on('SIGTERM', () => fin(2, 'abortado'));
  let puertoDev, wsPath; const pf = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 150; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoDev) return fin(1, 'sin DevTools: ' + err.slice(0, 200));
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const { targetId } = await cdp.call('Target.createTarget', { url: 'about:blank' });
  const { sessionId: ses } = await cdp.call('Target.attachToTarget', { targetId, flatten: true });
  await cdp.call('Page.enable', {}, ses); await cdp.call('Runtime.enable', {}, ses);
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }, ses);
  await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
  await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA_IPHONE }, ses);
  await cdp.call('Emulation.setCPUThrottlingRate', { rate: 4 }, ses);
  log('emulación aplicada');
  const origen = `http://127.0.0.1:${puerto}`;
  await cdp.call('Page.navigate', { url: `${origen}/index.html?fps=1` }, ses, 20000);
  await cdp.bombear(3000);
  const sem = await evalPoll(cdp, ses, SEMILLA, 120, 8); log('semilla: ' + sem);
  await cdp.call('Page.navigate', { url: `${origen}/index.html?fps=1` }, ses, 20000);
  log('2ª navegación hecha, esperando mundo…');
  const listo = await evalPoll(cdp, ses, LISTO, 240, 8); log('listo: ' + listo);
  const entra = await evalPoll(cdp, ses, ENTRAR, 180, 10); log('entrar: ' + entra);
  if (String(entra).indexOf('ok') !== 0) return fin(1, 'ERROR entrar: ' + entra);
  res.perfil = JSON.parse(await evalPoll(cdp, ses, PERFIL, 60, 8));
  log('perfil: ' + JSON.stringify(res.perfil));
  await cdp.bombear(3000);
  res.muestra = JSON.parse(await evalPoll(cdp, ses, `(${MUESTRA})(${SECS})`, SECS + 90, SECS + 30));
  log(`fpsMed ${res.muestra.fpsMed} · fpsMin ${res.muestra.fpsMin} · mediana ${res.muestra.medianaMs} · p95 ${res.muestra.p95Ms} · pausas50 ${res.muestra.pausas50}`);
  log(`dpr ${res.muestra.dprMin}–${res.muestra.dprMax} · escuelaFinal ${res.muestra.escuelaFinal} · errores ${res.muestra.errores.length}`);
  try { res.look = JSON.parse(await evalPoll(cdp, ses, `(() => { try { const m = AV.look.medir(); return JSON.stringify({ calls: m.calls, ktris: Math.round(m.triangulos / 1000), texturasMB: m.texturasMB, geometrias: m.geometrias, heapMB: m.heapMB }); } catch (e) { return 'ERR ' + e; } })()`, 60, 15)); } catch (e) { res.look = { err: String(e).slice(0, 200) }; }
  log('look: ' + JSON.stringify(res.look));
  res.errores = res.muestra.errores;
  try { const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 80 }, ses, 30000); fs.writeFileSync(path.join(SALIDA, `k351_${ETIQUETA}.jpg`), Buffer.from(shot.data, 'base64')); res.captura = `k351_${ETIQUETA}.jpg`; log('captura ok'); } catch (e) { log('captura: ' + String(e).slice(0, 120)); }
  guardar();
  fin(res.errores.length ? 1 : 0, res.errores.length ? 'FIN con errores' : 'FIN ok');
})().catch(e => { log('EXCEPCIÓN: ' + (e && e.stack || e)); guardar(); process.exit(1); });
