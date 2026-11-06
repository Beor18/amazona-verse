#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-101: cazar el «1 aviso de consola» que el publicador
   de la nube marcó en 0c3d4dc (antes 0). Carga el juego con GPU real (perfil iPhone y escritorio),
   con y sin ?v18=1, y vuelca TODOS los mensajes de consola (error/warning/info) y entradas Log,
   con su texto y stack, para atribuir el aviso. La herramienta NO toca el juego.
   Uso: node tools/build/kimi1_101.js --etiqueta r1 [--v18] [--escritorio]
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
const V18 = process.argv.includes('--v18');
const ESCRITORIO = process.argv.includes('--escritorio');
const ANCHO = ESCRITORIO ? 1600 : 390, ALTO = ESCRITORIO ? 900 : 844, DPR = ESCRITORIO ? 1 : 3, CPUX = ESCRITORIO ? 1 : 4;
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi101'));
fs.mkdirSync(SALIDA, { recursive: true });

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi1k101-/.test(d)) continue;
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

const SEMILLA_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1k101-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null, species: 'vittata' },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
  localStorage.setItem('amazonaverse.v18', JSON.stringify({ v: 1, sel: 'vittata', especies: { vittata: 'seleccionada' }, inv: {}, otorgados: {}, mundo: {} }));
} catch (e) {}`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k101-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    `--window-size=${ANCHO},${ALTO}`, 'about:blank'];
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi1k101-*' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const res = { etiqueta: ETIQUETA, pantalla: `${ESCRITORIO ? 'escritorio' : 'movil'} ${ANCHO}x${ALTO}@${DPR} cpuX${CPUX}`, v18: V18, head: null, mensajes: [], fases: {} };
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: !ESCRITORIO }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPUX }, ses);
    if (!ESCRITORIO) await cdp.call('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS }, ses);
    cdp.ws.addEventListener('message', m => {
      try { const d = JSON.parse(m.data);
        if (d.method === 'Runtime.consoleAPICalled') { const t = d.params.type; if (t === 'error' || t === 'warning') res.mensajes.push({ fase: res.faseActual, tipo: t, texto: (d.params.args || []).map(a => a.value !== undefined ? a.value : (a.description || a.type || '')).join(' ').slice(0, 400) }); }
        if (d.method === 'Log.entryAdded') { const e = d.params.entry; if (e.level === 'error' || e.level === 'warning') res.mensajes.push({ fase: res.faseActual, tipo: 'log:' + e.level, texto: String(e.text).slice(0, 400), url: e.url || '' }); }
      } catch (e) { }
    });
    // fase 1: carga + entrada al mundo
    res.faseActual = 'carga';
    await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real${V18 ? '&v18=1' : '&v18=0'}` }, ses);
    const t0 = Date.now(); let listo = false;
    while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
      await cdp.bombear(0.5);
    }
    res.fases.cargaLista = listo;
    if (listo) {
      res.head = await evaluar(cdp, ses, `(() => { try { return (AV.G.build && (AV.G.build.commit || AV.G.build.id)) || 'desconocido'; } catch (e) { return 'desconocido'; } })()`, 10);
      const ent = await evaluar(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
        const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } return false; };
        const t = $('title'); if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (b) b.click(); }
        await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 45000);
        const b = $('c1-saltar'); if (b) b.click(); await sleep(800);
        const f = $('c1-fade'); if (f) f.remove(); if (AV.G.ui && AV.G.ui.hideToast) AV.G.ui.hideToast();
        return 'ok'; })()`, 120);
      res.fases.entrada = ent;
      // fase 2: mundo vivo un rato (gesto para cargar módulos v18 a demanda)
      res.faseActual = 'mundo';
      await evaluar(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms));
        try { AV.G.renderer && AV.G.renderer.renderer && AV.G.renderer.renderer.render(AV.G.renderer.scene, AV.G.renderer.camara); } catch (e) {}
        await sleep(3000); return 'ok'; })()`, 30);
      res.fases.statsMundo = await evaluar(cdp, ses, `(() => { try { const s = AV.G.renderer.stats(); return { calls: s.calls, tris: s.triangulos }; } catch (e) { return null; } })()`, 10);
      // fase 3: primer gesto (carga perezosa v18) + otro rato
      if (V18) {
        res.faseActual = 'gesto-v18';
        await evaluar(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms));
          try { document.dispatchEvent(new Event('pointerdown')); window.dispatchEvent(new Event('pointerdown')); } catch (e) {}
          try { if (AV.G.input && AV.G.input.gesto) AV.G.input.gesto(); } catch (e) {}
          await sleep(4000); return 'ok'; })()`, 30);
      }
      // fase 4: forzar precalentado/dibujo de todo (el aviso suele salir al enlazar programas)
      res.faseActual = 'dibujo';
      await evaluar(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms));
        try { if (AV.G.streaming && AV.G.streaming.terminar) await AV.G.streaming.terminar(); } catch (e) {}
        await sleep(2000); return 'ok'; })()`, 120);
    }
  } catch (e) { res.error = String(e && e.message || e); }
  res.avisos = res.mensajes.filter(m => m.tipo === 'warning' || m.tipo === 'log:warning');
  res.errores = res.mensajes.filter(m => m.tipo === 'error' || m.tipo === 'log:error');
  delete res.faseActual;
  fs.writeFileSync(path.join(SALIDA, `k101_${ETIQUETA}${V18 ? '_v18' : ''}${ESCRITORIO ? '_pc' : ''}.json`), JSON.stringify(res, null, 1));
  console.log(JSON.stringify({ head: res.head, avisos: res.avisos, errores: res.errores.length, fases: res.fases }, null, 1));
  try { chrome.kill('SIGKILL'); } catch (e) { }
  mataPorPerfil();
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close();
  process.exit(res.error ? 1 : 0);
})();
