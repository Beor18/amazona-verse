#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-175 (quedante 6-nov): rendimiento en el
   móvil de las 4 actividades V18 NUEVAS con GPU real (iPhone 390x844 dpr 3, CPU x4):
     - «puerto»:  plaza de La Mina (73,6;-75,2), misión en 'investigado' (máquina GLB
       con engranaje girando + usarPoder cada 1,5 s: bocanada de vapor/fuego),
     - «chispa»:  carrera real contra Chispa (banderines + NPC shiba + HUD; Mayús+W
       hacia cada banderín en tiempo real),
     - «golf»:    hoyo 1 del minigolf (iniciar + elegir(1) + tiros sucesivos tirar()),
     - «ciudad»:  vuelo rasante sobre la Ciudad de los 36 (~14 m, circuito 22 s),
   más «base» (cap1 spawn asentado) de referencia de la MISMA corrida.
   El juego NO se toca: semilla real con amazonaverse.v18 (puente reparado, vittata)
   como kimi2_k110 y APIs públicas. Criterio: nada < 30 FPS en «bajo».
   Uso: node tools/build/kimi2_k175.js --etiqueta r1 [--cpu 4] [--solo bajo|medio]
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
const PERFIL = process.argv.indexOf('--perfil') > 0;   // perfil CDP 6 s en puerto/chispa
const ESC = arg('--esc', '');                // lista csv de escenarios (defecto todos)
const PF = { w: 390, h: 844, dpr: 3, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' };
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi175'));
fs.mkdirSync(SALIDA, { recursive: true });
const LOGF = path.join(SALIDA, `k175_${ETIQUETA}.log`);
fs.writeFileSync(LOGF, '');
function log(msg) { try { fs.appendFileSync(LOGF, `[${new Date().toISOString().slice(11, 19)}] ${msg}\n`); } catch (e) { } }
function guardar(res) { try { fs.writeFileSync(path.join(SALIDA, `k175_${ETIQUETA}.json`), JSON.stringify(res, null, 1)); } catch (e) { } }

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi2k175-/.test(d)) continue;
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
  window.__erroresConsola = [];
  addEventListener('error', e => __erroresConsola.push(String(e.message || e)));
  addEventListener('unhandledrejection', e => __erroresConsola.push('rechazo: ' + (e.reason && e.reason.message || e.reason)));
  const cerr = console.error; console.error = function () { try { __erroresConsola.push([].map.call(arguments, String).join(' ').slice(0, 300)); } catch (e) {} return cerr.apply(this, arguments); };
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi2k175-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null, species: 'vittata' },
    pos: { x: 150, z: 170, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
  localStorage.setItem('amazonaverse.v18', JSON.stringify({ v: 1, sel: 'vittata', especies: { vittata: 'seleccionada' }, inv: {}, otorgados: {}, mundo: { puente_villa: 'reparado' } }));
} catch (e) {}`;

const ENTRAR_JS = `(async () => { try { return await (async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene Jugar'; b.click();
    if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta'; }
  const S = window.AV && window.AV.state; if (!S || !S.profile || !S.profile.created) return 'sin perfil';
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(30000);
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 60000);
  const b = document.getElementById('c1-saltar'); if (b) b.click();
  await sleep(800);
  const f = document.getElementById('c1-fade'); if (f) f.remove();
  if (AV.G.ui && AV.G.ui.hideToast) AV.G.ui.hideToast();
  const jugar = Array.from(document.querySelectorAll('button')).find(x => /a jugar/i.test(x.textContent || '')); if (jugar) jugar.click();
  await sleep(300);
  try { window.dispatchEvent(new PointerEvent('pointerdown')); } catch (e) {}
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

const PREP_JS = `(async () => { try { return await (async () => {
  const G = AV.G, S = AV.state, sleep = ms => new Promise(r => setTimeout(r, ms));
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(120); } return false; };
  if (!await espera(() => G.mundo && G.mundo.listo, 60000)) return 'ERR mundo no listo';
  try { window.dispatchEvent(new PointerEvent('pointerdown')); } catch (e) {}
  if (!await espera(() => G.v18combate && G.v18puerto && G.v18chispa && G.v18minigolf && G.v18amenaza, 60000)) return 'ERR modulos v18 sin cargar';
  window.__k175 = {
    G, S, sleep, espera,
    ir(x, z) { S.pos.x = x; S.pos.z = z; if (G.fisica && G.fisica.MOVE) { G.fisica.MOVE.vx = G.fisica.MOVE.vz = 0; } },
    stats() { try { const st = G.renderer.stats(); return { calls: st.calls, tris: st.triangulos, sombras: st.sombras, dpr: st.dpr }; } catch (e) { return null; } },
    async medir(durSec) {
      const deltas = []; let ult = performance.now(); let vivo = true;
      const marca = () => { if (!vivo) return; const a = performance.now(); deltas.push(a - ult); ult = a; requestAnimationFrame(marca); };
      requestAnimationFrame(marca);
      const stats = []; const t0 = performance.now();
      while (performance.now() - t0 < durSec * 1000) {
        await sleep(1000);
        try { stats.push(this.stats() || null); } catch (e) { stats.push(null); }
      }
      vivo = false; deltas.shift();
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

const ESCENARIOS_JS = `(() => {
  const K = window.__k175, G = K.G, S = K.S, F = G.fisica, M = F.MOVE, I = G.input;
  const r2 = v => Math.round(v * 100) / 100;
  const cerrarDlg = () => { try { G.dialogo.clear(); } catch (e) {} try { G.dialogo.cancelarLibre && G.dialogo.cancelarLibre(); } catch (e) {} try { if (G.ui.hideToast) G.ui.hideToast(); } catch (e) {} };
  return {
    async base() { cerrarDlg(); K.ir(150, 170); await K.sleep(6000); return K.medir(8); },
    async puerto() {
      const P = G.v18puerto;
      cerrarDlg();
      try { P.avanzar('investigado'); P.aplicar(); } catch (e) {}
      K.ir(P.SITIO.plaza.x, P.SITIO.plaza.z);
      await K.sleep(10000); // zona + streaming + GLB máquina + drenado de la cola de raster
      const drv = setInterval(() => { try { P.usarPoder(); } catch (e) {} }, 1500);
      const r = await K.medir(14);
      clearInterval(drv);
      r.estadoPuerto = (() => { try { return P.estado(); } catch (e) { return '?'; } })();
      r.maq = (() => { try { const m = P.maq; return m ? { x: r2(m.pos.x), z: r2(m.pos.z) } : null; } catch (e) { return null; } })();
      return r;
    },
    async chispa() {
      const C = G.v18chispa;
      cerrarDlg();
      K.ir(C.SITIO.salida.x, C.SITIO.salida.z);
      await K.sleep(8000); // drena la cola de raster de Los Portales antes de correr
      if (!C.empezar({ forzar: true })) return { error: 'empezar devolvió false' };
      const okCarrera = await K.espera(() => C.estado().fase === 'carrera', 9000);
      if (!okCarrera) { try { C.cancelar(); } catch (e) {} return { error: 'la carrera no pasó de «cuenta»' }; }
      const t0 = performance.now();
      while (performance.now() - t0 < 500) await K.sleep(100); // estabiliza tras la cuenta
      const deltas = []; let ult = performance.now(); let vivo = true;
      const marca = () => { if (!vivo) return; const a = performance.now(); deltas.push(a - ult); ult = a; requestAnimationFrame(marca); };
      requestAnimationFrame(marca);
      const stats = [];
      I.keys.add('w'); // 'andar' (sin Mayús): la carrera dura ~15-20 s y mide más ventana que sprintando
      const t1 = performance.now();
      while (performance.now() - t1 < 32000) {
        const A = C.estado();
        if (A.fase === 'nada') break;
        const p = C.RUTA[A.sig] || C.RUTA[C.RUTA.length - 1];
        G.camara.yaw = Math.atan2(-(p.x - S.pos.x), -(p.z - S.pos.z));
        await K.sleep(400);
        try { stats.push(K.stats() || null); } catch (e) { stats.push(null); }
      }
      vivo = false; I.keys.delete('w');
      try { if (C.estado().fase !== 'nada') C.cancelar(); } catch (e) {}
      deltas.shift();
      const porSeg = []; let ac = 0, n = 0;
      for (const d of deltas) { ac += d; n++; if (ac >= 1000) { porSeg.push(Math.round(1000 / (ac / n))); ac = 0; n = 0; } }
      if (n > 5) porSeg.push(Math.round(1000 / (ac / n)));
      const orden = deltas.slice().sort((a, b) => a - b);
      const med = a => a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : 0;
      const cv = v => v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null;
      return { durSec: r2((performance.now() - t1) / 1000), faseFin: (() => { try { return C.estado().fase; } catch (e) { return '?'; } })(),
        ultimo: (() => { try { return C.estado().ultimo; } catch (e) { return null; } })(),
        fpsPorSeg: porSeg, fpsMed: med(porSeg), fpsMin: porSeg.length ? Math.min.apply(null, porSeg) : 0,
        peorMs: deltas.length ? Math.round(Math.max.apply(null, deltas)) : 0,
        p95Ms: orden.length ? Math.round(orden[Math.min(orden.length - 1, Math.floor(orden.length * 0.95))]) : 0,
        callsMed: cv(stats.map(s => s && s.calls)), trisMed: cv(stats.map(s => s && s.tris)),
        heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null };
    },
    async golf() {
      const Mg = G.v18minigolf;
      cerrarDlg();
      if (!Mg.iniciar({ forzar: true })) return { error: 'iniciar devolvió false' };
      try { Mg.elegir(1); } catch (e) {}
      const sitio = (() => { try { const k = Mg.sitio; return k ? { x: k.x, z: k.z } : null; } catch (e) { return null; } })();
      if (sitio) { K.ir(sitio.x, sitio.z); }
      await K.sleep(3000); // asienta el curso + flora alrededor
      const deltas = []; let ult = performance.now(); let vivo = true;
      const marca = () => { if (!vivo) return; const a = performance.now(); deltas.push(a - ult); ult = a; requestAnimationFrame(marca); };
      requestAnimationFrame(marca);
      const stats = []; let tiros = 0;
      const t1 = performance.now();
      let ultTiro = 0;
      while (performance.now() - t1 < 30000) {
        const A = Mg.estado();
        if (A.fase === 'apuntar' && performance.now() - ultTiro > 1200) {
          try { Mg.tirar(0.3 + 0.12 * (tiros % 4)); tiros++; ultTiro = performance.now(); } catch (e) {}
        }
        if (A.fase === 'nido' || A.fase === 'nada') break;
        await K.sleep(500);
        try { stats.push(K.stats() || null); } catch (e) { stats.push(null); }
      }
      vivo = false;
      try { if (Mg.estado().fase !== 'nada') Mg.salir(); } catch (e) {}
      deltas.shift();
      const porSeg = []; let ac = 0, n = 0;
      for (const d of deltas) { ac += d; n++; if (ac >= 1000) { porSeg.push(Math.round(1000 / (ac / n))); ac = 0; n = 0; } }
      if (n > 5) porSeg.push(Math.round(1000 / (ac / n)));
      const orden = deltas.slice().sort((a, b) => a - b);
      const med = a => a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : 0;
      const cv = v => v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null;
      return { tiros, durSec: r2((performance.now() - t1) / 1000), sitio,
        faseFin: (() => { try { return Mg.estado().fase; } catch (e) { return '?'; } })(),
        fpsPorSeg: porSeg, fpsMed: med(porSeg), fpsMin: porSeg.length ? Math.min.apply(null, porSeg) : 0,
        peorMs: deltas.length ? Math.round(Math.max.apply(null, deltas)) : 0,
        p95Ms: orden.length ? Math.round(orden[Math.min(orden.length - 1, Math.floor(orden.length * 0.95))]) : 0,
        callsMed: cv(stats.map(s => s && s.calls)), trisMed: cv(stats.map(s => s && s.tris)),
        heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null };
    },
    async ciudad() {
      const CEN = { x: -33, z: -136 };
      cerrarDlg();
      // acercamiento: aparecemos junto a la ciudad ya en el aire (el teleport al
      // centro redirige por zonas.js — KIMI-013; el borde no)
      K.ir(-14, -100);
      S.pos.y = G.terreno.height(S.pos.x, S.pos.z) + 12;
      await K.sleep(2500);
      try { F.endFlight(); } catch (e) {}
      try { F.startFlying(); } catch (e) {}
      const kd = (t, key, code) => { try { window.dispatchEvent(new KeyboardEvent(t, { key, code, bubbles: true })); } catch (e) {} };
      kd('keydown', 'w', 'KeyW');
      const deltas = []; let ult = performance.now(); let vivo = true;
      const marca = () => { if (!vivo) return; const a = performance.now(); deltas.push(a - ult); ult = a; requestAnimationFrame(marca); };
      requestAnimationFrame(marca);
      const stats = []; const t1 = performance.now();
      while (performance.now() - t1 < 22000) {
        const a = (performance.now() - t1) / 9000;
        const tx = CEN.x + Math.cos(a) * 24, tz = CEN.z + Math.sin(a) * 24;
        G.camara.yaw = Math.atan2(-(tx - S.pos.x), -(tz - S.pos.z));
        const sobre = S.pos.y - G.terreno.height(S.pos.x, S.pos.z);
        if (sobre < 12) kd('keydown', ' ', 'Space'); else kd('keyup', ' ', 'Space');
        // perro guardián: si el diálogo/«busy» bloqueó el vuelo, volar por posición directa
        if (performance.now() - t1 > 8000 && Math.hypot(S.pos.x - CEN.x, S.pos.z - CEN.z) > 55) {
          S.pos.x = tx; S.pos.z = tz; S.pos.y = G.terreno.height(tx, tz) + 13; S.vy = 0;
        }
        await K.sleep(120);
        try { stats.push(K.stats() || null); } catch (e) { stats.push(null); }
      }
      vivo = false; kd('keyup', 'w', 'KeyW'); kd('keyup', ' ', 'Space');
      try { F.endFlight(); } catch (e) {}
      deltas.shift();
      const porSeg = []; let ac = 0, n = 0;
      for (const d of deltas) { ac += d; n++; if (ac >= 1000) { porSeg.push(Math.round(1000 / (ac / n))); ac = 0; n = 0; } }
      if (n > 5) porSeg.push(Math.round(1000 / (ac / n)));
      const orden = deltas.slice().sort((a, b) => a - b);
      const med = a => a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : 0;
      const cv = v => v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null;
      return { durSec: r2((performance.now() - t1) / 1000), fin: [r2(S.pos.x), r2(S.pos.y), r2(S.pos.z)],
        fpsPorSeg: porSeg, fpsMed: med(porSeg), fpsMin: porSeg.length ? Math.min.apply(null, porSeg) : 0,
        peorMs: deltas.length ? Math.round(Math.max.apply(null, deltas)) : 0,
        p95Ms: orden.length ? Math.round(orden[Math.min(orden.length - 1, Math.floor(orden.length * 0.95))]) : 0,
        callsMed: cv(stats.map(s => s && s.calls)), trisMed: cv(stats.map(s => s && s.tris)),
        heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null };
    }
  };
})()`;

async function lanzarChromeUnaVez() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2k175-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    `--window-size=${PF.w},${PF.h}`, 'about:blank'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    if (fs.existsSync(puertoFile)) {
      const l = fs.readFileSync(puertoFile, 'utf8').split('\n');
      const puerto = parseInt(l[0], 10), wsPath = (l[1] || '').trim();
      if (puerto > 0 && wsPath) return { chrome, perf, puerto, wsPath };
    }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('Chrome no abrio DevTools en 30 s: ' + err.slice(0, 300));
}
async function lanzarChrome() {
  let ultimo = '';
  for (let intento = 0; intento < 3; intento++) {
    try { return await lanzarChromeUnaVez(); } catch (e) { ultimo = e.message; await new Promise(r => setTimeout(r, 2500)); }
  }
  throw new Error(ultimo);
}
function mataPorPerfil() {
  try {
    const ps = "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*kimi2k175-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync("powershell -NoProfile -Command '" + ps + "'", { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}
async function foto(cdp, ses, nombre) {
  try {
    const r = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 20000);
    if (r && r.data) { fs.writeFileSync(path.join(SALIDA, nombre), Buffer.from(r.data, 'base64')); return nombre; }
  } catch (e) { }
  return null;
}
// self-time por función de un perfil CDP (método de lento_movil.py, en JS)
function atribuirPerfil(profile, N) {
  try {
    const nodos = new Map(); for (const n of profile.nodes) nodos.set(n.id, n);
    const padre = new Map(); for (const n of profile.nodes) for (const c of (n.children || [])) padre.set(c, n.id);
    let t = profile.startTime; const S = profile.samples, D = profile.timeDeltas;
    const propio = new Map();
    for (let i = 1; i < S.length; i++) {
      t += D[i]; if (t == null) continue;
      const sid = S[i - 1], nd = nodos.get(sid); if (!nd) continue;
      const cf = nd.callFrame || {}; const us = D[i] || 0;
      const url = (cf.url || '').split('/').pop();
      const k = (cf.functionName || '(anon)') + ' ' + url + ':' + ((cf.lineNumber || -1) + 1);
      propio.set(k, (propio.get(k) || 0) + us);
    }
    const top = [...propio.entries()].sort((a, b) => b[1] - a[1]).slice(0, N || 8)
      .map(([k, v]) => [Math.round(v / 100) / 10, k]);
    return { cuadros: S.length, msTotal: Math.round((profile.endTime - profile.startTime) / 100) / 10, top };
  } catch (e) { return { error: String(e && e.message || e).slice(0, 200) }; }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const res = { etiqueta: ETIQUETA, cuando: new Date().toISOString(), pantalla: `movil ${PF.w}x${PF.h}@${PF.dpr} cpuX${CPU}`, v18: true, seed: 'amazonaverse.v18 puente_villa:reparado + vittata (misma semilla que k110)', contencion: 'PC compartida con otras sesiones Kimi (numeros techo si hay otras corridas)' };
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
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&v18=1` }, ses);
    const t0 = Date.now(); let listo = false;
    while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
      await cdp.bombear(0.5);
    }
    if (!listo) throw new Error('el juego no arranco');
    log('juego listo, entrando...');
    const ent = await evaluar(cdp, ses, ENTRAR_JS, 120);
    if (!/^ok/.test(ent)) throw new Error('entrada: ' + ent);
    log('entrada ok, preparando modulos v18...');
    const prep = await evaluar(cdp, ses, PREP_JS, 150);
    if (!/^ok/.test(prep)) throw new Error('prep: ' + prep);
    log('prep ok');

    const calidades = SOLO ? [SOLO] : ['bajo', 'medio'];
    const listaEsc = ESC ? ESC.split(',') : ['base', 'puerto', 'chispa', 'golf', 'ciudad'];
    res.escenarios = {};
    for (const cal of calidades) {
      const nivel = await evaluar(cdp, ses, `(() => { const r = AV.G.renderer.setCalidad('${cal}', true); return r && r.nivel; })()`, 30, false);
      log(`calidad ${cal} (=${nivel})`);
      await cdp.bombear(3);
      const esc = {};
      for (const nombre of listaEsc) {
        log(`midiendo ${cal}/${nombre}...`);
        let r;
        const quierePerfil = PERFIL && (nombre === 'puerto' || nombre === 'chispa');
        if (quierePerfil) { try { await cdp.call('Profiler.enable', {}, ses); await cdp.call('Profiler.start', {}, ses); } catch (e) { } }
        try { r = JSON.parse(await evaluar(cdp, ses, `(async () => { const E = ${ESCENARIOS_JS}; return JSON.stringify(await E['${nombre}']()); })()`, 200)); }
        catch (e) { r = { error: String(e && e.message || e).slice(0, 300) }; }
        if (quierePerfil) {
          try {
            const pr = await cdp.call('Profiler.stop', {}, ses, 30000);
            r.perfil = atribuirPerfil(pr.profile, 8);
            try { await cdp.call('Profiler.disable', {}, ses); } catch (e) { }
          } catch (e) { r.perfilError = String(e && e.message || e).slice(0, 160); }
        }
        esc[nombre] = r;
        guardar(res);
        const cap = await foto(cdp, ses, `k175_${ETIQUETA}_${cal}_${nombre}.jpg`);
        if (cap) (res.capturas = res.capturas || {})[cal + '_' + nombre] = cap;
        const med = (a, k) => { const v = (a || []).map(x => x && x[k]).filter(x => x != null); return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null; };
        log(`[${cal}/${nombre}] fpsMed=${r.fpsMed} min=${r.fpsMin} peorMs=${r.peorMs} calls=${r.callsMed != null ? r.callsMed : med(r.stats, 'calls')} tris=${r.trisMed != null ? r.trisMed : med(r.stats, 'tris')}${r.error ? ' ERROR ' + r.error : ''}`);
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
    try { execSync(`taskkill /F /T /PID ${chrome.pid}`, { timeout: 15000, stdio: 'ignore' }); } catch (e) { }
    try { chrome.kill(); } catch (e) { }
    await cdp.bombear(0.8);
    mataPorPerfil();
    try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
    srv.close();
    log('evidencia: ' + path.join(SALIDA, `k175_${ETIQUETA}.json`));
    process.exit(res.fallo ? 1 : 0);
  }
})();
