#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-248: números del menú V18 de inicio con GPU real.
   Partida sembrada (sin creador) → portada (menú de modos): stats del renderer tras el menú abierto,
   fps medidos 4 s, captura; tarjeta «Mis cotorras» (panel encima) → stats + captura; tarjeta «Duelo»
   (arranca la actividad) → stats + captura. Nada toca el juego: solo lectura.
   Uso: node tools/build/kimi3_248_menu.js --etiqueta r1
 */
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
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi248');
fs.mkdirSync(SALIDA, { recursive: true });

const PERFIL = 'kimi3m248-' + Math.random().toString(36).slice(2, 8);
for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi3m248-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
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
  espera(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function evaluar(cdp, ses, exp, timeoutS) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: true, returnByValue: true }, ses, (timeoutS || 30) * 1000);
  if (r.exceptionDetails) { const d = r.exceptionDetails; throw new Error('JS: ' + JSON.stringify(d.exception && d.exception.description || d.text).slice(0, 600)); }
  return r.result ? r.result.value : undefined;
}

const SEMILLA = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi3-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;

async function captura(cdp, ses, archivo) {
  const r = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 30000);
  fs.writeFileSync(path.join(SALIDA, archivo), Buffer.from(r.data, 'base64'));
}
async function statsYFps(cdp, ses, segundos) {
  return await evaluar(cdp, ses, `(async () => {
    const R = window.AV && AV.G && AV.G.renderer; if (!R) return { error: 'sin renderer' };
    const t0 = performance.now(); let cuadros = 0; const marcas = [];
    await new Promise(res => {
      const tick = () => { cuadros++; marcas.push(performance.now()); if (performance.now() - t0 < ${(segundos || 4) * 1000}) requestAnimationFrame(tick); else res(); };
      requestAnimationFrame(tick);
    });
    const d = marcas.map((t, i) => i ? t - marcas[i - 1] : 0).slice(1).sort((a, b) => a - b);
    const st = R.stats ? R.stats() : {};
    const info = (AV.G.renderer && AV.G.renderer.info) || {};
    return { fps: Math.round(cuadros / ((performance.now() - t0) / 1000) * 10) / 10, cuadros,
      p50: d.length ? Math.round(d[Math.floor(d.length * 0.5)]) : 0, peor: d.length ? Math.round(d[d.length - 1]) : 0,
      calls: info.render ? info.render.calls : (st.calls || 0), tris: info.render ? info.render.triangles : (st.tris || 0),
      geo: info.memory ? info.memory.geometries : 0, tex: info.memory ? info.memory.textures : 0 };
  })()`, 30);
}

let CHROME_PROC = null;
(async () => {
  const { srv, puerto } = await servir();
  const perfil = path.join(os.tmpdir(), PERFIL);
  const chrome = CHROME_PROC = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perfil, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--window-size=1280,800', '--noerrdialogs', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let errBuf = '', caido = '';
  chrome.stderr.on('data', d => { errBuf += d; });
  chrome.on('exit', c => { caido = 'exit ' + c; });
  // Chrome 156: el chrome.exe inicial es un lanzador que sale enseguida; el navegador real sigue
  // detached y escribe DevToolsActivePort en el perfil (mismo mecanismo que kimi2_una_bateria.js).
  let puertoDev = 0, wsPath = '';
  const pf = path.join(perfil, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } }
    await new Promise(r => setTimeout(r, 200));
  }
  if (!puertoDev) { try { chrome.kill('SIGKILL'); } catch (e) { } throw new Error('Chrome no abrió DevTools en 60 s (' + caido + ') ' + errBuf.slice(-300)); }
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const { targetId } = await cdp.call('Target.createTarget', { url: 'about:blank' });
  const { sessionId: ses } = await cdp.call('Target.attachToTarget', { targetId, flatten: true });
  await cdp.call('Runtime.enable', {}, ses); await cdp.call('Page.enable', {}, ses);
  const errores = [];
  await cdp.call('Runtime.consoleAPICalled', {}, ses).catch(() => { });
  ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') errores.push(JSON.stringify(d.params.exceptionDetails.exception && d.params.exceptionDetails.exception.description || d.params.exceptionDetails.text).slice(0, 300)); });

  await cdp.call('Page.navigate', { url: `http://127.0.0.1:${puerto}/` }, ses);
  await cdp.espera(1.5);
  await evaluar(cdp, ses, SEMILLA);
  await cdp.call('Page.navigate', { url: `http://127.0.0.1:${puerto}/` }, ses);
  // esperar al menú de modos (portada abierta)
  const hayMenu = await evaluar(cdp, ses, `(async () => {
    const t0 = performance.now();
    while (performance.now() - t0 < 60000) {
      const form = document.querySelector('#modos') || document.querySelector('form[method="dialog"]');
      if (form && !form.hidden) return true;
      await new Promise(r => setTimeout(r, 500));
    }
    return false;
  })()`, 70);
  if (!hayMenu) throw new Error('el menú de modos no apareció en 60 s');
  await cdp.espera(2); // asentar
  const out = { etiqueta: ETIQUETA, head: require('child_process').execSync('git rev-parse --short HEAD').toString().trim(), menu: await statsYFps(cdp, ses, 4) };
  await captura(cdp, ses, `k248_${ETIQUETA}_menu.jpg`);

  // tarjeta «Mis cotorras» (panel encima del menú)
  await evaluar(cdp, ses, `(() => { const b = document.querySelector('[data-modo="cotorras"]'); if (b) b.click(); return true; })()`);
  await cdp.espera(2.5);
  out.cotorras = await statsYFps(cdp, ses, 3);
  await captura(cdp, ses, `k248_${ETIQUETA}_cotorras.jpg`);
  await evaluar(cdp, ses, `(() => { try { AV.G.ui.hideCard(); } catch (e) { } return true; })()`);
  await cdp.espera(1);

  // tarjeta «Duelo» (arranca la actividad: portada se cierra)
  await evaluar(cdp, ses, `(() => { const b = document.querySelector('[data-modo="duelo"]'); if (b) b.click(); return true; })()`);
  await cdp.espera(4); // teleport + arranque
  out.duelo = await statsYFps(cdp, ses, 4);
  await captura(cdp, ses, `k248_${ETIQUETA}_duelo.jpg`);
  out.errores = errores;

  fs.writeFileSync(path.join(SALIDA, `k248_${ETIQUETA}.json`), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  try { await cdp.call('Browser.close', {}, ses); } catch (e) { }
  chrome.kill('SIGKILL');
  await cdp.espera(1);
  spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(AQUI, 'kimi2_mata_perfil.ps1'), '-Perfil', PERFIL], { stdio: 'ignore' });
  srv.close();
  process.exit(0);
})().catch(e => {
  console.error('FATAL', e.message);
  try { if (CHROME_PROC) CHROME_PROC.kill('SIGKILL'); } catch (_) { }
  try { spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(AQUI, 'kimi2_mata_perfil.ps1'), '-Perfil', PERFIL], { stdio: 'ignore' }); } catch (_) { }
  process.exit(1);
});
