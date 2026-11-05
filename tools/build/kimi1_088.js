#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-088: A/B del coste de la SOMBRA DE TORMENTA en «medio»
   (quedante de KIMI-085: en la re-medición libre, medio/sombra quedó a 27 fps med frente a 35 de base
   y 40 del puente en el mismo sitio; en «bajo» la sombra cuesta 0). Atribuye el Δ entre:
     a) quieto junto al centro de la amenaza (sin iniciarla),
     b) sombra iniciada + poderes (uso normal),
     c) sombra iniciada + poderes con la niebla y los ojos OCULTOS (scene v18_sombra/v18_sombra_ojos).
   El Δ(b−c) = coste de la niebla; el Δ(c−a) = coste de la pelea/poderes/partículas.
   Perf. iPhone 390×844 dpr 3 CPU ×4, GPU real. El juego no se toca (solo visible y API pública).
   Uso: node tools/build/kimi1_088.js --etiqueta ab1 [--cpu 4] [--secs 8]
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
const CPU = parseInt(arg('--cpu', '4'), 10);
const SOLO = arg('--solo', '');              // '' | bajo | medio
const SECS = parseInt(arg('--secs', '14'), 10);
const PF = { w: 390, h: 844, dpr: 3, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' };
const SALIDA = arg("--salida", path.join(RAIZ, "docs", "img", "kimi088"));
fs.mkdirSync(SALIDA, { recursive: true });
const LOGF = path.join(SALIDA, `k088_${ETIQUETA}.log`);
fs.writeFileSync(LOGF, '');
function log(msg) { try { fs.appendFileSync(LOGF, `[${new Date().toISOString().slice(11, 19)}] ${msg}\n`); } catch (e) { } }
function guardar(res) { try { fs.writeFileSync(path.join(SALIDA, `k088_${ETIQUETA}.json`), JSON.stringify(res, null, 1)); } catch (e) { } }

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi1k088-/.test(d)) continue;
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
  window.__erroresConsola = [];
  addEventListener('error', e => __erroresConsola.push(String(e.message || e)));
  addEventListener('unhandledrejection', e => __erroresConsola.push('rechazo: ' + (e.reason && e.reason.message || e.reason)));
  const cerr = console.error; console.error = function () { try { __erroresConsola.push([].map.call(arguments, String).join(' ').slice(0, 300)); } catch (e) {} return cerr.apply(this, arguments); };
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1k088-' + Math.random().toString(36).slice(2, 10),
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
  try { window.dispatchEvent(new PointerEvent('pointerdown')); } catch (e) {}
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

// Ayudantes en página: espera de módulos v18, teleport, muestreo FPS por segundo con stats.
const PREP_JS = `(async () => { try { return await (async () => {
  const G = AV.G, S = AV.state, sleep = ms => new Promise(r => setTimeout(r, ms));
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(120); } return false; };
  if (!await espera(() => G.mundo && G.mundo.listo, 60000)) return 'ERR mundo no listo';
  try { window.dispatchEvent(new PointerEvent('pointerdown')); } catch (e) {}
  if (!await espera(() => G.v18combate && G.v18amenaza && G.v18Reparar && G.v18fx, 60000)) return 'ERR módulos v18 sin cargar';
  if (!await espera(() => G.v18combate.estado().ch, 30000)) return 'ERR rival sin modelo';
  window.__k85 = {
    G, S,
    sleep, espera,
    ir(x, z) { S.pos.x = x; S.pos.z = z; if (G.fisica && G.fisica.MOVE) { G.fisica.MOVE.vx = G.fisica.MOVE.vz = 0; } },
    async muestra(durSec) {
      const deltas = []; let ult = performance.now(); let vivo = true;
      const marca = () => { if (!vivo) return; const a = performance.now(); deltas.push(a - ult); ult = a; requestAnimationFrame(marca); };
      requestAnimationFrame(marca);
      const stats = []; const t0 = performance.now();
      while (performance.now() - t0 < durSec * 1000) {
        await sleep(1000);
        try { const st = G.renderer.stats(); stats.push({ calls: st.calls, tris: st.triangulos, fpsMedidor: st.fps, sombras: st.sombras, dpr: st.dpr }); } catch (e) { stats.push(null); }
      }
      vivo = false;
      deltas.shift();
      const porSeg = []; let ac = 0, n = 0;
      for (const d of deltas) { ac += d; n++; if (ac >= 1000) { porSeg.push(Math.round(1000 / (ac / n))); ac = 0; n = 0; } }
      if (n > 5) porSeg.push(Math.round(1000 / (ac / n)));
      const orden = deltas.slice().sort((a, b) => a - b);
      const med = a => a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : 0;
      return { fpsPorSeg: porSeg, fpsMed: med(porSeg), fpsMin: porSeg.length ? Math.min.apply(null, porSeg) : 0,
        peorMs: deltas.length ? Math.round(Math.max.apply(null, deltas)) : 0,
        p95Ms: orden.length ? Math.round(orden[Math.min(orden.length - 1, Math.floor(orden.length * 0.95))]) : 0,
        stats, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null };
    }
  };
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

// Un escenario: nombre, setup (inicia la acción), driver (intervalo durante la muestra), duración.
const ESCENARIOS_JS = `(() => {
  const K = window.__k85, G = K.G, S = K.S, Cb = G.v18combate, Am = G.v18amenaza;
  return {
    async quieto() { try { Cb.salir(); } catch (e) {} try { Am.salir(); } catch (e) {} const c = Am.centro; K.ir(c.x + 5, c.z); await K.sleep(3500); return K.muestra(${SECS}); },
    async sombra() {
      try { Cb.salir(); } catch (e) {}
      const c = Am.centro; K.ir(c.x + 5, c.z); await K.sleep(2500);
      if (Am.estado().fase === 'nada') Am.iniciar({ forzar: true, sinEspera: true });
      const drv = setInterval(() => { try { Am.usarPoder(); } catch (e) {} }, 900);
      const r = await K.muestra(${SECS});
      clearInterval(drv);
      try { Am.salir(); } catch (e) {}
      return r;
    },
    async sombraSinNiebla() {
      try { Cb.salir(); } catch (e) {}
      const c = Am.centro; K.ir(c.x + 5, c.z); await K.sleep(2500);
      if (Am.estado().fase === 'nada') Am.iniciar({ forzar: true, sinEspera: true });
      const n = G.renderer.scene.getObjectByName('v18_sombra'), o = G.renderer.scene.getObjectByName('v18_sombra_ojos');
      if (n) n.visible = false; if (o) o.visible = false;
      const drv = setInterval(() => { try { Am.usarPoder(); } catch (e) {} }, 900);
      const r = await K.muestra(${SECS});
      clearInterval(drv);
      if (n) n.visible = true; if (o) o.visible = true;
      try { Am.salir(); } catch (e) {}
      return r;
    }
  };
})()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k088-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    `--window-size=${PF.w},${PF.h}`, 'about:blank'];
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi1k088-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const res = { etiqueta: ETIQUETA, pantalla: `movil ${PF.w}x${PF.h}@${PF.dpr} cpuX${CPU}`, v18: true, secs: SECS, contencion: 'PC libre al medir (0 chrome/node ajenos)' };
  const watch = setInterval(() => { try { guardar(res); } catch (e) { } log('…latido'); }, 5000);
  try {
    log('lanzando Chrome y entrando al juego (v18=1)...');
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: PF.w, height: PF.h, deviceScaleFactor: PF.dpr, mobile: true }, ses);
    try { await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses); } catch (e) { }
    try { await cdp.call('Emulation.setUserAgentOverride', { userAgent: PF.ua }, ses); } catch (e) { }
    try { await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses); } catch (e) { }
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&v18=1` }, ses);
    const t0 = Date.now(); let listo = false;
    while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
      await cdp.bombear(0.5);
    }
    if (!listo) throw new Error('el juego no arrancó');
    log('juego listo, entrando...');
    const ent = await evaluar(cdp, ses, ENTRAR_JS, 120);
    if (!/^ok/.test(ent)) throw new Error('entrada: ' + ent);
    log('entrada ok, preparando módulos v18...');
    const prep = await evaluar(cdp, ses, PREP_JS, 150);
    if (!/^ok/.test(prep)) throw new Error('prep: ' + prep);
    log('prep ok');

    const calidades = ['medio']; // KIMI-088: solo «medio», donde la sombra bajó de 30
    res.escenarios = {};
    for (const cal of calidades) {
      const nivel = await evaluar(cdp, ses, `(() => { const r = AV.G.renderer.setCalidad('${cal}', true); return r && r.nivel; })()`, 30, false);
      log(`calidad ${cal} (=${nivel})`);
      log('esperando asentado...');
      await cdp.bombear(3); // asienta el cambio de look/sombras antes de medir
      log('asentado');
      const esc = {};
      for (const nombre of ['quieto', 'sombra', 'sombraSinNiebla']) {
        log(`midiendo ${cal}/${nombre}...`);
        let r;
        try { r = JSON.parse(await evaluar(cdp, ses, `(async () => { const E = ${ESCENARIOS_JS}; return JSON.stringify(await E['${nombre}']()); })()`, 150)); }
        catch (e) { r = { error: String(e && e.message || e).slice(0, 300) }; }
        esc[nombre] = r;
        guardar(res);
        const st = (r.stats || []).filter(Boolean);
        const med = (a, k) => { const v = a.map(x => x[k]).filter(x => x != null); return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null; };
        log(`[${cal}/${nombre}] fpsPorSeg=${JSON.stringify(r.fpsPorSeg)} fpsMed=${r.fpsMed} min=${r.fpsMin} peorMs=${r.peorMs} calls=${med(st, 'calls')} tris=${med(st, 'tris')}${r.error ? ' ERROR ' + r.error : ''}`);
        await cdp.bombear(0.5);
      }
      res.escenarios[cal] = esc;
    }
    res.erroresConsola = await evaluar(cdp, ses, `(window.__erroresConsola || []).slice(0, 30)`, 15);
    log('errores de consola: ' + JSON.stringify(res.erroresConsola));
    await cdp.call('Target.closeTarget', { targetId: tid }).catch(() => { });
  } catch (e) {
    res.fallo = String(e && e.message || e);
    log('FALLO: ' + res.fallo);
  } finally {
    clearInterval(watch);
    guardar(res);
    try { chrome.kill(); } catch (e) { }
    mataPorPerfil();
    srv.close();
    log('evidencia: ' + path.join(SALIDA, `k088_${ETIQUETA}.json`));
    process.exit(res.fallo ? 1 : 0);
  }
})();
