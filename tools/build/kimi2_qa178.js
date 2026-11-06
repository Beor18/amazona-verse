#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — QA-178: bandadaTest con la Ciudad de los 36 viva activa.
   Antes del fix medía 64 instancias (20 bandada + 44 EXTRA de residentes/ciudad) y dejaba 2 checks rojos;
   el fix resta las instancias EXTRA compartidas. Esta sonda pone la página EN la ciudad, espera a que
   ciudad viva/residentes poblen las 2 mallas compartidas y corre AV.bandadaTest().
   Uso: node tools/build/kimi2_qa178.js [--etiqueta r1] [--px 12] [--pz -114.8] */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ETIQUETA = arg('--etiqueta', 'r1');
const PX = parseFloat(arg('--px', '12')), PZ = parseFloat(arg('--pz', '-114.8'));
const ESPERA_CV_S = parseFloat(arg('--cv', '10'));

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map();
    ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && this.pend.has(m.id)) { const p = this.pend.get(m.id); this.pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } }; }
  call(m, p, s, t) { const id = ++this.id; return new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method: m, params: p || {}, sessionId: s })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rej(new Error('CDP timeout ' + m)); } }, t); }); }
  listo() { return new Promise(r => { this.ws.onopen = () => r(); }); }
  async bombear(segs) { const t0 = Date.now(); while (Date.now() - t0 < segs * 1000) { try { await this.call('Browser.getVersion', {}, undefined, 5000); } catch (e) { } await new Promise(r => setTimeout(r, 250)); } }
}
async function evaluar(cdp, ses, expr, topeS) {
  const r = await cdp.call('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }, ses, (topeS || 30) * 1000);
  if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 500));
  return r.result && r.result.value;
}

const SEMILLA_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  window.__erroresConsola = [];
  addEventListener('error', e => __erroresConsola.push(String(e.message || e)));
  addEventListener('unhandledrejection', e => __erroresConsola.push('rechazo: ' + (e.reason && e.reason.message || e.reason)));
  const cerr = console.error; console.error = function () { try { __erroresConsola.push([].map.call(arguments, String).join(' ').slice(0, 300)); } catch (e) {} return cerr.apply(this, arguments); };
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi2qa178-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null, species: 'vittata' },
    pos: { x: 150, z: 170, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;

const ENTRAR_JS = `(async () => { try { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene Jugar'; b.click();
    if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta'; }
  const S = window.AV && window.AV.state; if (!S || !S.profile || !S.profile.created) return 'sin perfil';
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(30000);
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 90000);
  const b = document.getElementById('c1-saltar'); if (b) b.click();
  await sleep(800);
  const f = document.getElementById('c1-fade'); if (f) f.remove();
  if (AV.G.ui && AV.G.ui.hideToast) AV.G.ui.hideToast();
  try { window.dispatchEvent(new PointerEvent('pointerdown')); } catch (e) {}
  return 'ok'; } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

(async () => {
  const srv = await servir();
  const puerto = srv.address().port;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2qa178-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--window-size=390,844', '--force-device-scale-factor=3'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  let puertoDev = 0, wsPath = '';
  for (let i = 0; i < 300 && !wsPath; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); } }
    await new Promise(r => setTimeout(r, 200));
  }
  if (!wsPath) { console.log('· no DevTools: ' + err.slice(0, 200)); process.exit(1); }
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS }, ses);
  await cdp.call('Page.navigate', { url: `http://127.0.0.1:${puerto}/index.html?pack=cap1&mapa=real` }, ses);
  const t1 = Date.now(); let listo = false;
  while (Date.now() - t1 < 150 * 1000) {
    try { if (await evaluar(cdp, ses, `!!(window.AV && window.AV.G && window.AV.G.mundo && window.AV.G.mundo.listo)`, 10)) { listo = true; break; } } catch (e) { }
    await cdp.bombear(0.5);
  }
  if (!listo) { console.log('· el juego no arrancó'); process.exit(1); }
  console.log('· entrada: ' + await evaluar(cdp, ses, ENTRAR_JS, 150));
  // teleport a la ciudad y drenar la zona; luego dejar que la ciudad viva/residentes poblen las mallas compartidas
  console.log('· teleport: ' + await evaluar(cdp, ses, `(async (px, pz) => { const sleep = ms => new Promise(r => setTimeout(r, ms)), G = window.AV.G, S = G.S;
    S.pos.x = px; S.pos.z = pz; S.pos.y = G.terreno.height(px, pz) + 2; S.vy = 0;
    const ST = G.streaming; if (ST && ST.alrededor) await ST.alrededor(px, pz); if (ST && ST.terminar) await ST.terminar();
    if (G.solidos && G.solidos.terminar) G.solidos.terminar();
    await sleep(1200); S.pos.x = px; S.pos.z = pz; S.pos.y = G.terreno.height(px, pz) + 2;
    return [Math.round(S.pos.x*10)/10, Math.round(S.pos.z*10)/10]; })(${PX}, ${PZ})`, 240));
  await cdp.bombear(ESPERA_CV_S);
  const antes = await evaluar(cdp, ses, `(() => { const G = window.AV.G, B = G.bandada;
    return { EXTRA: (B.EXTRA || []).length, calidad: G.renderer.calidad.nivel, quiet: !!G.quiet,
      pos: [Math.round(G.S.pos.x), Math.round(G.S.pos.z)],
      meshes: B.meshes.map(m => ({ n: m.count, visible: m.visible })) }; })()`, 30);
  console.log('· antes (ciudad viva): ' + JSON.stringify(antes));
  const test = await evaluar(cdp, ses, `(async () => { const t0 = performance.now(); const r = await window.AV.bandadaTest(); return { segs: Math.round((performance.now()-t0)/100)/10, passed: r.passed, total: r.total, fallos: r.results.filter(x => !x.ok).map(x => ({ name: x.name, extra: x.extra })) }; })()`, 420);
  console.log('· bandadaTest: ' + JSON.stringify(test));
  const errores = await evaluar(cdp, ses, `(window.__erroresConsola || []).slice(0, 10)`, 15);
  console.log('· errores consola: ' + JSON.stringify(errores));
  const res = { etiqueta: ETIQUETA, cuando: new Date().toISOString(), ancla: [PX, PZ], antes, bandadaTest: test, erroresConsola: errores, head: 'local (worktree)' };
  fs.mkdirSync(path.join(RAIZ, 'docs', 'img', 'kimi178'), { recursive: true });
  fs.writeFileSync(path.join(RAIZ, 'docs', 'img', 'kimi178', 'qa178-' + ETIQUETA + '.json'), JSON.stringify(res, null, 2));
  console.log('· evidencia: docs/img/kimi178/qa178-' + ETIQUETA + '.json');
  chrome.kill('SIGKILL');
  srv.close();
  process.exit(0);
})().catch(e => { console.error('FALLO', e); process.exit(1); });
