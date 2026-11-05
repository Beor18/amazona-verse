#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-083: rendimiento del «Duelo de 2 jugadores»
   (src/game/v18/duelo2.js) en ESCRITORIO con GPU real.
   Mide con GPU real: regresión AV.v18Duelo2Test(), base sin duelo en la explanada, duelo activo
   (J1 grito del Yunque + semillas · J2 escudo de plumas + ala, movimiento continuo de las dos) y
   salida del duelo; FPS med/p10/peor, draw calls, triángulos, heap y renderer.info.memory por fase,
   con capturas. La herramienta NO toca el juego: solo dispara la API pública.
   Uso: node tools/build/kimi2_k083.js --etiqueta r1 [--calidad medio|alto] [--ventana 15]
*/
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
const CALIDAD = arg('--calidad', 'medio');
const VENTANA = parseInt(arg('--ventana', '15'), 10);
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi083'));
fs.mkdirSync(SALIDA, { recursive: true });

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi2k83-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
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

const SEMILLA_SAVE_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi2k83-' + Math.random().toString(36).slice(2, 10),
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
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 45000);
  const b = document.getElementById('c1-saltar'); if (b) b.click();
  await sleep(800);
  const f = document.getElementById('c1-fade'); if (f) f.remove();
  if (AV.G.ui && AV.G.ui.hideToast) AV.G.ui.hideToast();
  const jugar = Array.from(document.querySelectorAll('button')).find(x => /a jugar/i.test(x.textContent || '')); if (jugar) jugar.click();
  await sleep(300);
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

/* Medición por fases. La lucha se simula con eventos de teclado sintéticos (mismo camino que la
   prueba oficial) sobre el bucle real del juego: el J1 mueve/pica/semilla/grita y el J2 se mueve,
   ala, semilla y escudo. Muestreo por rAF. */
const MEDICION_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
  const out = { v18: G.V18, calidad: (G.renderer && G.renderer.calidad) || '?' };
  // 1) la prueba oficial carga el módulo (combate + fx + personaje) y es la regresión funcional
  const t = await AV.v18Duelo2Test();
  out.test = { passed: t.passed, total: t.total, fallos: t.results.filter(r => !r.ok).map(r => r.name + ' :: ' + r.extra) };
  const sitio = G.v18combate.sitio;
  out.sitio = { x: +sitio.x.toFixed(1), z: +sitio.z.toFixed(1) };
  // teletransportar junto a la explanada y asentar el streaming
  S.pos.x = sitio.x; S.pos.z = sitio.z + 16; S.pos.y = G.terreno.height(S.pos.x, S.pos.z) + 0.1;
  // quitar tarjetas del tutorial que estorban la captura y la vista
  const quitarUi = () => { const j = Array.from(document.querySelectorAll('button')).find(x => /a jugar/i.test(x.textContent || '')); if (j) j.click();
    const f = document.getElementById('c1-fade'); if (f) f.remove(); if (G.ui && G.ui.hideToast) G.ui.hideToast(); };
  quitarUi();
  try { if (G.streaming && G.streaming.terminar) await G.streaming.terminar(); } catch (e) {}
  const asentar = async () => { const t0 = performance.now();
    while (performance.now() - t0 < 30000) { try { const s = G.renderer.stats(); if (s.calls > 10) { await new Promise(r => requestAnimationFrame(r)); if (G.renderer.stats().calls > 10) return true; } } catch (e) {} await sleep(250); }
    return false; };
  out.asentado = await asentar();
  await sleep(1500);
  const stats = () => { try { const s = G.renderer.stats(); const m = G.renderer.renderer.info.memory; return { calls: s.calls, tris: s.triangulos, geo: m.geometries, tex: m.textures, prog: G.renderer.renderer.info.programs.length }; } catch (e) { return { err: String(e && e.message || e) }; } };
  const heap = () => (performance.memory && performance.memory.usedJSHeapSize) ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
  const muestra = async (secs, teatro) => {
    const marcas = [], cuadros = []; let ant = performance.now(); const t0 = performance.now();
    while (performance.now() - t0 < secs * 1000) {
      await new Promise(r => requestAnimationFrame(r));
      const a = performance.now(); cuadros.push(a - ant); ant = a;
      if (teatro) try { teatro(a - t0); } catch (e) {}
      marcas.push(stats());
    }
    cuadros.shift();
    const ord = cuadros.slice().sort((x, y) => x - y);
    const med = ord.length ? ord[Math.floor(ord.length / 2)] : 0, p10 = ord.length ? ord[Math.floor(ord.length * 0.9)] : 0;
    const prom = m => Math.round(m.reduce((s, x) => s + x, 0) / (m.length || 1));
    return { fpsMed: Math.round(1000 / (med || 1) * 10) / 10, fpsP10: Math.round(1000 / (p10 || 1) * 10) / 10,
      peorMs: Math.round(Math.max(0, ...cuadros)), n: cuadros.length,
      callsMed: prom(marcas.map(m => m.calls || 0)), trisMed: prom(marcas.map(m => m.tris || 0)),
      callsMax: Math.max(0, ...marcas.map(m => m.calls || 0)), trisMax: Math.max(0, ...marcas.map(m => m.tris || 0)),
      ult: marcas[marcas.length - 1] || {} };
  };
  out.base = await muestra(6);
  out.base.heap = heap();

  // duelo activo: J1 vittata (grito_yunque) · J2 arausiaca (escudo_plumas)
  const D2 = G.v18duelo2;
  const okIni = D2.iniciar({ sinCuenta: true, especie2: 'arausiaca' });
  out.iniciado = okIni && D2.estado().fase === 'lucha';
  const tecla = (tipo, key, code) => { const e = new KeyboardEvent(tipo, { key, code, bubbles: true, cancelable: true }); document.body.dispatchEvent(e); return e; };
  const KEYS1 = ['w', 'a', 's', 'd'], KEYS2 = ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];
  let i1 = 0, i2 = 0, fase = 0;
  const teatro = ms => {
    const paso = Math.floor(ms / 350);
    if (paso !== fase) { // cambio de paso: mover dirección
      fase = paso;
      tecla('keyup', KEYS1[(i1 - 1 + 4) % 4], 'Key' + KEYS1[(i1 - 1 + 4) % 4].toUpperCase());
      tecla('keydown', KEYS1[i1 % 4], 'Key' + KEYS1[i1 % 4].toUpperCase()); i1++;
      tecla('keyup', KEYS2[(i2 - 1 + 4) % 4], KEYS2[(i2 - 1 + 4) % 4]);
      tecla('keydown', KEYS2[i2 % 4], KEYS2[i2 % 4]); i2++;
    }
    const sub = Math.floor(ms / 800);
    if (sub !== teatro.sub) { teatro.sub = sub;
      if (sub % 4 === 1) { tecla('keydown', '-', 'Slash'); tecla('keyup', '-', 'Slash'); }         // J2 escudo
      else if (sub % 4 === 2) { tecla('keydown', 'e', 'KeyE'); tecla('keyup', 'e', 'KeyE'); }      // J1 ala
      else if (sub % 4 === 3) { tecla('keydown', '.', 'Period'); tecla('keyup', '.', 'Period'); }  // J2 ala
      else { tecla('keydown', 'g', 'KeyG'); tecla('keyup', 'g', 'KeyG'); }                         // J1 grito
    }
    // semilla del J1 a mitad de cada segundo par
    const semi = Math.floor(ms / 1600);
    if (semi !== teatro.semi) { teatro.semi = semi; tecla('keydown', 'f', 'KeyF'); setTimeout(() => tecla('keyup', 'f', 'KeyF'), 120); }
  };
  out.duelo = await muestra(${VENTANA}, teatro);
  out.duelo.heap = heap();
  out.estadoLucha = { fase: D2.estado().fase, pl1: D2.estado().j1 && D2.estado().j1.plumas, pl2: D2.estado().j2 && D2.estado().j2.plumas,
    usos1: D2.estado().stats.usos1, usos2: D2.estado().stats.usos2, golpes: D2.estado().stats.golpes, balas: D2.estado().balas.length };
  // captura con el duelo encima
  await sleep(300);
  out.duelo2stats = stats();
  // salir y medir la limpieza
  tecla('keydown', 'Escape', 'Escape'); tecla('keyup', 'Escape', 'Escape');
  await sleep(1200);
  out.salido = D2.estado().fase === 'nada';
  out.despues = await muestra(4);
  out.despues.heap = heap();
  out.j2creado = !!D2.estado().ch;
  // el Escape también abre el menú de pausa del juego (lo escucha antes que el duelo): cerrarlo
  const sj = Array.from(document.querySelectorAll('button')).find(b => /seguir jugando/i.test(b.textContent || ''));
  if (sj) sj.click();
  await sleep(400);
  quitarUi();
  // dejar un duelo fresco encima para la captura final (HUD + las dos cotorras)
  if (D2.iniciar({ sinCuenta: true, especie2: 'arausiaca' })) {
    tecla('keydown', '-', 'Slash'); tecla('keyup', '-', 'Slash'); // escudo del J2 visible
    tecla('keydown', 'g', 'KeyG'); tecla('keyup', 'g', 'KeyG');   // grito del J1
    await sleep(900);
  }
  return JSON.stringify(out); })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2k83-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--window-size=1600,900', 'about:blank'];
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi2k83-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}
function chromeAjenos() {
  try {
    const out = execSync('powershell -NoProfile -Command "(Get-Process chrome -ErrorAction SilentlyContinue | Measure-Object).Count"', { timeout: 15000, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return parseInt(out, 10) || 0;
  } catch (e) { return -1; }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const res = { etiqueta: ETIQUETA, pantalla: 'escritorio 1600x900@1 cpuX1', calidad: CALIDAD, chromeAjenosAlInicio: chromeAjenos(), head: null };
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  let chromeCaido = false;
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&calidad=${encodeURIComponent(CALIDAD)}&v18=1` }, ses);
    const t0 = Date.now(); let listo = false;
    while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
      await cdp.bombear(0.5);
    }
    if (!listo) throw new Error('el juego no arrancó');
    const ent = await evaluar(cdp, ses, ENTRAR_JS, 120);
    if (!/^ok/.test(ent)) throw new Error('entrada: ' + ent);
    await evaluar(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms));
      const jugar = Array.from(document.querySelectorAll('button')).find(x => /a jugar/i.test(x.textContent || '')); if (jugar) jugar.click();
      await sleep(400);
      const jugar2 = Array.from(document.querySelectorAll('button')).find(x => /a jugar/i.test(x.textContent || '')); if (jugar2) jugar2.click();
      const f = document.getElementById('c1-fade'); if (f) f.remove();
      try { if (AV.G.ui && AV.G.ui.hideToast) AV.G.ui.hideToast(); } catch (e) {}
      return 'limpio'; })()`, 30);
    res.head = await evaluar(cdp, ses, `(() => { try { return (AV.G.build && (AV.G.build.commit || AV.G.build.id)) || 'desconocido'; } catch (e) { return 'desconocido'; } })()`, 10);

    // captura 0: explanada sin duelo
    let shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 88 }, ses, 60000);
    fs.writeFileSync(path.join(SALIDA, `k083_${ETIQUETA}_base.jpg`), Buffer.from(shot.data, 'base64'));
    // medición completa (test + base + duelo + salida)
    res.medicion = JSON.parse(await evaluar(cdp, ses, MEDICION_JS, 240));
    // captura 1: duelo activo (HUD + las dos cotorras)
    shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 88 }, ses, 60000);
    fs.writeFileSync(path.join(SALIDA, `k083_${ETIQUETA}_duelo.jpg`), Buffer.from(shot.data, 'base64'));
    res.erroresConsola = await evaluar(cdp, ses, `(window.AV && AV.G && AV.G.consoleErrores) ? AV.G.consoleErrores.slice(0, 10) : []`, 10);
  } catch (e) {
    res.error = String(e && e.message || e);
    try { await cdp.call('Browser.getVersion', {}, null, 5000); } catch (e2) { chromeCaido = true; }
  }
  fs.writeFileSync(path.join(SALIDA, `k083_${ETIQUETA}.json`), JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res, null, 1));
  try { chrome.kill('SIGKILL'); } catch (e) { }
  mataPorPerfil();
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close();
  process.exit(res.error && !res.medicion ? 1 : 0);
})();
