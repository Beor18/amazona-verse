#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-225: seguimiento del «Detalle sin atribuir» de
   KIMI-219 (4× DOMException «The source image could not be decoded» en la sesión larga del A/B
   pre-push de la cuantización e9ebf753). ¿Reproducen en HEAD? Dos páginas (mimética de la
   sesión larga del A/B): circuito villa → plaza ciudad → complejo aéreo (−33,−136 +30) →
   vuelta a villa → plaza oeste, y una segunda página corta. Captura rechazos no atendidos,
   console.error/warn y excepciones CDP con texto completo.
   Uso: node tools/build/kimi2_k225_domex.js --etiqueta r1
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ETIQUETA = arg('--etiqueta', 'r1');
const SWAP_PRE = arg('--swap-pre', '0') === '1'; // sirve los 7 GLB de e9ebf753^ (pre-cuantización) sin tocar el worktree
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi225');
fs.mkdirSync(SALIDA, { recursive: true });

const SWAP_ARCHIVOS = ['assets/models/mapa/terreno_ne.glb', 'assets/models/mapa/terreno_no.glb', 'assets/models/mapa/terreno_se.glb', 'assets/models/mapa/terreno_so.glb', 'assets/models/edificios/complejo_ruinas.glb', 'assets/models/entorno/ceiba.glb', 'assets/models/entorno/flamboyan.glb'];
const OVERRIDES = {};
if (SWAP_PRE) {
  for (const f of SWAP_ARCHIVOS) {
    try { OVERRIDES['/' + f.replace(/\\/g, '/')] = execSync('git show e9ebf753~1:"' + f.replace(/\\/g, '/') + '"', { cwd: RAIZ, maxBuffer: 64 * 1048576 }); console.log('· swap-pre: ' + f + ' ← e9ebf753~1 (' + OVERRIDES['/' + f.replace(/\\/g, '/')].length + ' B)'); }
    catch (e) { console.log('· swap-pre FALLÓ ' + f + ': ' + String(e.message).slice(0, 120)); }
  }
}

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi2k225-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    if (OVERRIDES[p]) { res.writeHead(200, { 'Content-Type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); return res.end(OVERRIDES[p]); }
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
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: promesa !== false, returnByValue: true }, ses, (timeoutS || 60) * 1000);
  if (r.exceptionDetails) { const d = r.exceptionDetails; throw new Error('JS@' + (d.lineNumber != null ? d.lineNumber + ':' + d.columnNumber : '?') + ': ' + JSON.stringify(d.exception && d.exception.description || d.text).slice(0, 900)); }
  return r.result ? r.result.value : undefined;
}

const GANCHO_JS = `window.__k225 = { domex: [], consola: [] };
addEventListener('unhandledrejection', e => { const r = e.reason; __k225.domex.push({ t: Date.now(), msg: String(r && r.message || r), nombre: r && r.name, stack: String(r && r.stack || '').slice(0, 1500) }); });
const __ce = console.error.bind(console), __cw = console.warn.bind(console);
console.error = function () { __k225.consola.push({ t: Date.now(), tipo: 'error', txt: [].map.call(arguments, String).join(' ').slice(0, 1200) }); return __ce.apply(console, arguments); };
console.warn  = function () { __k225.consola.push({ t: Date.now(), tipo: 'warn',  txt: [].map.call(arguments, String).join(' ').slice(0, 1200) }); return __cw.apply(console, arguments); };`;

const SEMILLA_SAVE_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-k225-' + Math.random().toString(36).slice(2, 10),
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
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 30000);
  const b = document.getElementById('c1-saltar'); if (b) b.click();
  await espera(() => { try { return AV.G.mundo && AV.G.mundo.listo; } catch (e) { return false; } }, 60000);
  return 'ok'; })(); } catch (e) { return 'EXC ' + (e && e.message || e); } })()`;

const PARADA_JS = `async (px, pz, alzar) => { const sleep = ms => new Promise(r => setTimeout(r, ms));
  const S = AV.state;
  S.pos.x = px; S.pos.z = pz;
  if (alzar) S.pos.y = alzar; else { try { S.pos.y = (AV.G.terreno.height(px, pz) || 0) + 0.2; } catch (e) { S.pos.y = 3; } }
  try { if (AV.G.camara && AV.G.camara.yaw !== undefined) AV.G.camara.yaw = 0.8; } catch (e) {}
  await sleep(7000);
  try { const s = AV.G.renderer.stats(); return { calls: s.calls, tris: s.triangulos }; } catch (e) { return null; } }`;

const LECTURA_JS = `(() => { const k = window.__k225 || { domex: [], consola: [] };
  const filtra = a => a.filter(x => /decod|decode|image|textura|texture/i.test(x.msg || x.txt || ''));
  return { domexTotal: k.domex.length, domex: k.domex, consolaErrTotal: (k.consola || []).filter(c => c.tipo === 'error').length,
    consolaErr: (k.consola || []).filter(c => c.tipo === 'error'), consolaImg: filtra(k.consola || []),
    aveErrores: window.__aveErrores || [] }; })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2k225-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--window-size=390,844'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, puerto: parseInt(l[0], 10), wsPath: l[1].trim(), perf }; }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools en 60 s: ' + err.slice(0, 300));
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, puerto: puertoDev, wsPath, perf } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const RES = { etiqueta: ETIQUETA, modo: SWAP_PRE ? 'swap-pre(e9ebf753^)' : 'head', head: execSync('git rev-parse --short HEAD', { cwd: RAIZ }).toString().trim(), url: origen + '/index.html?pack=cap1&mapa=real&calidad=bajo&v18=1', paginas: [], cdpImg: [] };
  cdp.ws.addEventListener('message', m => {
    const d = JSON.parse(m.data);
    if (d.method === 'Runtime.exceptionThrown') { const ed = d.params.exceptionDetails; const txt = String(ed && (ed.exception && ed.exception.description || ed.text)); if (/decod|decode|image|textura|texture/i.test(txt)) RES.cdpImg.push({ t: Date.now(), ex: JSON.stringify(ed).slice(0, 3500) }); }
    if (d.method === 'Runtime.consoleAPICalled' && (d.params.type === 'error' || d.params.type === 'warning')) { const txt = d.params.args.map(a => a.value !== undefined ? String(a.value) : (a.description || a.type)).join(' '); if (/decod|decode|image|textura|texture/i.test(txt)) RES.cdpImg.push({ t: Date.now(), cc: d.params.type + ' ' + txt.slice(0, 1500) }); }
  });

  async function pagina(nombre, paradas) {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }, ses);
    try { await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses); } catch (e) { }
    try { await cdp.call('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }, ses); } catch (e) { }
    try { await cdp.call('Emulation.setCPUThrottlingRate', { rate: 4 }, ses); } catch (e) { }
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: GANCHO_JS + '\n' + SEMILLA_SAVE_JS }, ses);
    await cdp.call('Page.navigate', { url: RES.url }, ses);
    const t0 = Date.now(); let listo = false;
    while (Date.now() - t0 < 150 * 1000) {
      try { if (await evaluar(cdp, ses, '!!(window.AV && AV.G && AV.G.mundo && AV.G.mundo.listo)', 10, false)) { listo = true; break; } } catch (e) { }
      await cdp.bombear(0.5);
    }
    const P = { nombre, listo, entrada: null, tramos: [] };
    if (listo) {
      P.entrada = await evaluar(cdp, ses, ENTRAR_JS, 120);
      for (const p of paradas) {
        const stats = await evaluar(cdp, ses, `(${PARADA_JS})(${p.x}, ${p.z}, ${p.alzar || 0})`, 40);
        const lec = await evaluar(cdp, ses, LECTURA_JS, 20);
        P.tramos.push({ parada: p.nombre, stats, domexAcum: lec.domexTotal, errAcum: lec.consolaErrTotal, aveAcum: lec.aveErrores.length });
      }
      const lec = await evaluar(cdp, ses, LECTURA_JS, 20);
      P.domex = lec.domex; P.consolaErr = lec.consolaErr; P.consolaImg = lec.consolaImg; P.aveErrores = lec.aveErrores;
    }
    RES.paginas.push(P);
    console.log(`· ${nombre}: listo=${listo} entrada=${P.entrada} domex=${(P.domex || []).length} consolaErr=${(P.consolaErr || []).length} ave=${(P.aveErrores || []).length}`);
    await cdp.call('Target.closeTarget', { targetId: tid }).catch(() => { });
  }

  try {
    await pagina('larga', [
      { nombre: 'villa-spawn', x: -8, z: -2.5 },
      { nombre: 'ciudad-plaza', x: 12, z: -114.8 },
      { nombre: 'complejo-aereo', x: -33, z: -136, alzar: 30 },
      { nombre: 'vuelta-villa', x: 134, z: 182 },
      { nombre: 'plaza-oeste', x: -4, z: -130 },
    ]);
    await pagina('corta', [
      { nombre: 'villa-spawn', x: -8, z: -2.5 },
      { nombre: 'ciudad-plaza', x: 12, z: -114.8 },
    ]);
  } catch (e) { RES.fatal = String(e && e.message || e); }

  const ruta = path.join(SALIDA, `k225_${ETIQUETA}.json`);
  fs.writeFileSync(ruta, JSON.stringify(RES, null, 1));
  console.log('· evidencia → ' + ruta + (RES.fatal ? ' · FATAL: ' + RES.fatal : ''));
  try { spawn('taskkill', ['/F', '/T', '/PID', String(chrome.pid)], { stdio: 'ignore' }); } catch (e) { }
  await cdp.bombear(1);
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close();
  process.exit(RES.fatal ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
