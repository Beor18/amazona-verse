#!/usr/bin/env node
/* QA-198: sonda del check de movementTest «La cámara no se mete en la pared del edificio y no se pega
   (sigue a más de 2,5 m)», intermitente en la VM Linux con SwiftShader de la otra cuenta.
   Corre AV.movementTest() N rondas con página fresca y semilla, en GPU real, y vuelca
   metricas.camPared / metricas.pared de cada ronda (aunque pase) para ver si la distancia oscila.
   Uso: node tools/build/kimi2_qa198.js [--rondas 4] [--cpu 4] [--desktop] [--etiqueta r1] */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const RONDAS = parseInt(arg('--rondas', '4'), 10);
const CPU = parseFloat(arg('--cpu', '4'));
const DESKTOP = process.argv.includes('--desktop');
const ETIQUETA = arg('--etiqueta', 'r1');
const ANTES = arg('--antes', ''); // baterías a correr antes en la MISMA página (mimética de corrida acumulada qa.js)
const SALIDA = path.join(AQUI, 'salida', 'kimi2-qa198-' + ETIQUETA);
const EVID = path.resolve(RAIZ, 'docs', 'img', 'kimi198');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.woff2': 'application/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = () => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result ? r.result.value : undefined; }
const SEMILLA_SAVE_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi2-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;
const PREPARAR_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene el botón Jugar'; b.click();
    if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta tras Jugar'; }
  const cr = $('creator');
  if (cr && !cr.hidden) { await espera(() => $('p-stage-status') && $('p-stage-status').hidden, 30000); const s = $('p-save'); if (!s) return 'el creador no tiene Empezar (#p-save)';
    s.click(); if (!await espera(() => cr.hidden, 8000)) return 'Empezar no cerró el creador'; }
  const S = window.AV && window.AV.state; if (!S || !S.profile || !S.profile.created) return 'sin perfil creado tras entrar';
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(30000);
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 20000);
  return 'ok'; })()`;
(async () => {
  fs.mkdirSync(SALIDA, { recursive: true }); fs.mkdirSync(EVID, { recursive: true });
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2q198-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--window-size=1280,800'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoDev) { try { chrome.kill(); } catch (e) { } throw new Error('Chrome no abrió DevTools en 60 s ' + err.slice(0, 200)); }
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const informe = { etiqueta: ETIQUETA, pantalla: DESKTOP ? 'escritorio 1280x800 cpuX1' : `movil 390x844@3 cpuX${CPU} (iPhone emulado)`, head: null, rondas: [] };
  try { informe.head = await ev(cdp, undefined, `fetch('${origen}/.git/HEAD').then(r=>r.text()).catch(()=>null)`, 10); } catch (e) { }
  for (let ronda = 1; ronda <= RONDAS; ronda++) {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    await cdp.call('Page.enable', {}, ses); await cdp.call('Runtime.enable', {}, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: DESKTOP ? 1280 : 390, height: DESKTOP ? 800 : 844, deviceScaleFactor: DESKTOP ? 1 : 3, mobile: !DESKTOP }, ses);
    if (!DESKTOP) await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, configuration: 'mobile' }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: DESKTOP ? 1 : CPU }, ses);
    const t0 = Date.now(); let ok = false;
    await cdp.call('Page.navigate', { url: `${origen}/index.html` }, ses);
    while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
    if (!ok) { informe.rondas.push({ ronda, error: 'no arrancó' }); continue; }
    const prep = await ev(cdp, ses, PREPARAR_JS, 120);
    for (const b of ANTES ? ANTES.split(',') : []) { try { await ev(cdp, ses, `window.AV.${b}()`, 600); console.log(`· (antes) ${b} corrida`); } catch (e) { console.log(`· (antes) ${b} error: ${String(e).slice(0, 120)}`); } }
    const t1 = Date.now();
    let res;
    try { res = await ev(cdp, ses, `window.AV.movementTest()`, 600); } catch (e) { res = { error: String(e).slice(0, 300) }; }
    const m = (res && res.metricas) || {};
    informe.rondas.push({ ronda, prep: String(prep).slice(0, 60), segundos: Math.round((Date.now() - t1) / 1000), passed: res ? (res.passed != null ? res.passed : res.ok) : null, total: res && res.total, error: res && res.error || null, camPared: m.camPared || null, pared: m.pared || null, camEdificios: m.camEdificios || null, falloCamara: res && ((res.results) || (res.checks) || []).filter(x => x && (x.pass === false || x.ok === false || x.passed === false) && /cámara|pared/i.test(x.name || '')).map(x => (x.name || '?') + ' — ' + String(x.extra || '').slice(0, 300)) });
    console.log(`· ronda ${ronda}: passed=${informe.rondas[informe.rondas.length - 1].passed} camPared=${JSON.stringify(m.camPared)} pared=${JSON.stringify(m.pared)} (${informe.rondas[informe.rondas.length - 1].segundos}s)`);
    try { await cdp.call('Target.closeTarget', { targetId: tid }, undefined, 5000); } catch (e) { }
  }
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  try { chrome.kill(); } catch (e) { }
  fs.writeFileSync(path.join(EVID, 'qa198_' + ETIQUETA + '.json'), JSON.stringify(informe, null, 2));
  console.log('· evidencia: ' + path.join('docs', 'img', 'kimi198', 'qa198_' + ETIQUETA + '.json'));
  srv.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
