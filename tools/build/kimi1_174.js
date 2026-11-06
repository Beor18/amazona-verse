#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-174(b): minigolf hoyo 1 probado POR DENTRO.
   30 partidas con input simulado de jugador (apuntado aproximado con error angular y fuerza variable)
   sobre la física real del hoyo (terreno, troncos, borde, nido). Mide por partida: golpes, medalla,
   salidas del área, rebotes, tiros sin progreso, anomalías (tunelado/fuera sin aviso, tope) y distancia mínima.
   Sin Grito del Yunque (palanca aparte). El juego no se toca: solo API pública (iniciar/reiniciar/tirar/paso/estado/semilla/sitio).
   Salida: docs/img/kimi174/k174_<etiqueta>.json
   Uso: node tools/build/kimi1_174.js --etiqueta r1 [--partidas 30] [--sigma 3] [--fuerza-jitter 0.10]
        [--pifias 0.12] [--ruta zigzag|corta]   (corta = 2 waypoints: 3 tiros si no hay obstáculo)
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
const N_PARTIDAS = parseInt(arg('--partidas', '30'), 10);
const SIGMA_DEG = parseFloat(arg('--sigma', '3'));
const JITTER = parseFloat(arg('--fuerza-jitter', '0.10'));
const PIFIAS = parseFloat(arg('--pifias', '0.12'));
const RUTA_NOMBRE = arg('--ruta', 'zigzag');
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi174');
fs.mkdirSync(SALIDA, { recursive: true });
const LOGF = path.join(SALIDA, `k174_${ETIQUETA}.log`);
fs.writeFileSync(LOGF, '');
function log(msg) { try { fs.appendFileSync(LOGF, `[${new Date().toISOString().slice(11, 19)}] ${msg}\n`); } catch (e) { } }
function guardar(res) { try { fs.writeFileSync(path.join(SALIDA, `k174_${ETIQUETA}.json`), JSON.stringify(res, null, 1)); } catch (e) { } }

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi1k174-/.test(d)) continue;
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
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1k174-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Golfista de Prueba', look: null },
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
  try { window.dispatchEvent(new PointerEvent('pointerdown')); } catch (e) {}
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

const PREP_JS = `(async () => { try { return await (async () => {
  const G = AV.G, S = AV.state, sleep = ms => new Promise(r => setTimeout(r, ms));
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(120); } return false; };
  if (!await espera(() => G.mundo && G.mundo.listo, 60000)) return 'ERR mundo no listo';
  try { window.dispatchEvent(new PointerEvent('pointerdown')); } catch (e) {}
  { const cargarScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('script ' + src)); document.head.appendChild(s); });
    const asegurar = async (src, fabrica) => {
      if (typeof window[fabrica] !== 'function' && !document.querySelector('script[src="' + src + '"]')) { try { await cargarScript(src); } catch (e) { throw e; } }
      const t0 = performance.now();
      while (typeof window[fabrica] !== 'function' && performance.now() - t0 < 20000) await sleep(200);
      if (typeof window[fabrica] !== 'function') throw new Error('sin fábrica ' + fabrica);
    };
    try {
      await asegurar('src/game/v18/progreso.js', 'AVV18Progreso'); window.AVV18Progreso(G);
      await asegurar('src/game/v18/habilidades.js', 'AVV18Habilidades'); window.AVV18Habilidades(G);
      await asegurar('src/game/v18/fx_poderes.js', 'AVV18Fx'); window.AVV18Fx(G);
      await asegurar('src/game/v18/combate.js', 'AVV18Combate'); window.AVV18Combate(G);
      await asegurar('src/game/v18/descubrir.js', 'AVV18Descubrir'); window.AVV18Descubrir(G);
      await asegurar('src/game/v18/minigolf.js', 'AVV18Minigolf'); window.AVV18Minigolf(G);
    } catch (e) { return 'ERR cargando v18: ' + (e && e.message || e); } }
  if (!(G.v18minigolf && G.v18 && G.v18fx)) return 'ERR módulos v18: golf=' + !!G.v18minigolf + ' v18=' + !!G.v18 + ' fx=' + !!G.v18fx;
  try { G.v18.desbloquear('vittata'); } catch (e) {}
  return 'ok golf=' + !!G.v18minigolf; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

// El bot jugador humano: ruta zigzag como aprende un niño (por los huecos de los troncos), apuntado con error
// gaussiano y fuerza con jitter proporcional. Sin Grito. Tope propio de 12 tiros (en 1 jugador el juego no topea).
const SIM_JS = `(() => {
  const Mg = AV.G.v18minigolf, G = AV.G;
  const K = Mg.sitio;
  const L = 18, HW = 3.5, PAR = Mg.PAR;
  const TEE = { u: -L / 2 + 1.8, v: 0 }, NIDO = { u: L / 2 - 2.2, v: 0 };
  const mundo = (u, v) => ({ x: K.x + K.ux * u + K.vx * v, z: K.z + K.uz * u + K.vz * v });
  const local = (x, z) => { const dx = x - K.x, dz = z - K.z; return { u: dx * K.ux + dz * K.uz, v: dx * K.vx + dz * K.vz }; };
  const PN = mundo(NIDO.u, NIDO.v);
  // fuerza para recorrer d metros en llano (misma fórmula que la prueba interna del módulo)
  const ROCE_A = 1.4, ROCE_B = 0.55, VMIN = 1.5, VMAX = 13;
  const recorre = v0 => v0 / ROCE_B - ROCE_A / (ROCE_B * ROCE_B) * Math.log(1 + ROCE_B * v0 / ROCE_A);
  const fuerzaPara = d => { let lo = 0, hi = 1; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (recorre(VMIN + (VMAX - VMIN) * m) < d) lo = m; else hi = m; } return (lo + hi) / 2; };
  let rnd = 12345;
  const alea = () => { rnd = (rnd * 1103515245 + 12345) & 0x7fffffff; return rnd / 0x7fffffff; }; // determinista por corrida
  const gauss = () => (alea() + alea() + alea() + alea() - 2) / 0.577; // ~N(0,1)
  const RUTAS = {
    zigzag: [{ u: -1.2, v: 2.0 }, { u: 0.8, v: -2.0 }, { u: 3.8, v: -2.0 }],
    corta: [{ u: 0.8, v: -2.0 }, { u: 3.8, v: -2.0 }]
  };
  const RUTA = RUTAS['${RUTA_NOMBRE}'] || RUTAS.zigzag;
  const partidas = [], anomalias = [];
  const hastaQuieta = () => { let n = 0; while (Mg.estado().fase === 'rueda' && n < 4200) { Mg.paso(1 / 60); n++; } return n; };
  const t0total = performance.now();
  for (let p = 0; p < ${N_PARTIDAS}; p++) {
    Mg.iniciar({ forzar: true });
    const A = Mg.estado();
    const B = Mg.semilla();
    let iw = 0, minD = Infinity, sinProgreso = 0, tiros = 0, largos = 0;
    const fueras0 = A.fueras, reb0 = A.rebotes;
    let pasosTotal = 0;
    while (A.fase !== 'nido' && tiros < 12) {
      const q = local(B.x, B.z);
      while (iw < RUTA.length - 1 && (Math.hypot(q.u - RUTA[iw].u, q.v - RUTA[iw].v) < 1.0 || q.u > RUTA[iw].u + 0.5)) iw++;
      const w = (Math.hypot(q.u - NIDO.u, q.v - NIDO.v) < 5.5) ? NIDO : RUTA[iw];
      const dAntes = Math.hypot(q.u - NIDO.u, q.v - NIDO.v);
      // apuntado aproximado: yaw exacto + error gaussiano (sigma en rad)
      const wm = mundo(w.u, w.v);
      const ex = wm.x - B.x, ez = wm.z - B.z;
      const sigma = ${SIGMA_DEG} * Math.PI / 180;
      const err = gauss() * sigma;
      G.camara.yaw = Math.atan2(-ex, -ez) + err;
      // fuerza variable: la del plano llano × (1 ± jitter) y un 12 % de «pifias» con el doble de error
      const d = Math.hypot(ex, ez);
      let f = fuerzaPara(d) * (1 + (alea() * 2 - 1) * ${JITTER});
      if (alea() < ${PIFIAS}) f *= 0.82; // pifiá: corto
      f = Math.max(0.06, Math.min(1, f));
      const d0u = q.u, d0v = q.v;
      Mg.tirar(f);
      const nPasos = hastaQuieta();
      pasosTotal += nPasos;
      if (nPasos >= 4200) largos++;
      tiros++;
      const q2 = local(B.x, B.z);
      const dDespues = Math.hypot(q2.u - NIDO.u, q2.v - NIDO.v);
      minD = Math.min(minD, dDespues);
      if (dDespues > dAntes + 0.4) sinProgreso++;
      // anomalía: quedarse fuera de los límites en rueda sin que saltara «fuera»
      if (Math.abs(q2.u) > L / 2 + 0.45 || Math.abs(q2.v) > HW + 0.45) anomalias.push({ p, tiro: tiros, u: +q2.u.toFixed(2), v: +q2.v.toFixed(2) });
    }
    const Afin = Mg.estado();
    partidas.push({
      n: p + 1, golpes: Afin.golpes, completa: Afin.fase === 'nido',
      medalla: Afin.fase === 'nido' ? Mg.medalla(Afin.golpes) : 'sin-completar',
      fueras: Afin.fueras - fueras0, rebotes: Afin.rebotes - reb0,
      sinProgreso, minD: +minD.toFixed(2), tirosSim: tiros, rolloLargo: largos, pasosSim: pasosTotal
    });
    Mg.salir();
  }
  const med = a => a.length ? +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(2) : 0;
  const completas = partidas.filter(x => x.completa);
  const oros = completas.filter(x => x.medalla === 'oro').length;
  const platas = completas.filter(x => x.medalla === 'plata').length;
  const bronces = completas.filter(x => x.medalla === 'bronce').length;
  const hist = {};
  for (const x of partidas) hist[x.golpes] = (hist[x.golpes] || 0) + 1;
  return {
    ok: true, n: partidas.length, partidas,
    resumen: {
      completas: completas.length, sinCompletar: partidas.length - completas.length,
      oro: oros, plata: platas, bronce: bronces,
      oroPct: +(100 * oros / partidas.length).toFixed(1),
      golpesMed: med(partidas.map(x => x.golpes)),
      golpesMedCompletas: med(completas.map(x => x.golpes)),
      fuerasTot: partidas.reduce((s, x) => s + x.fueras, 0),
      fuerasMed: med(partidas.map(x => x.fueras)),
      rebotesMed: med(partidas.map(x => x.rebotes)),
      sinProgresoMed: med(partidas.map(x => x.sinProgreso)),
      minDMed: med(partidas.map(x => x.minD)),
      rolloLargo: partidas.reduce((s, x) => s + x.rolloLargo, 0),
      histogramaGolpes: hist
    },
    anomalias, msTotal: Math.round(performance.now() - t0total),
    sitio: { x: +K.x.toFixed(1), z: +K.z.toFixed(1), a: +K.a.toFixed(3), troncos: K.troncos, arboles: (K.arboles || []).length }
  };
})()`;

// Búsqueda del mínimo de tiros posible (física real, sin error de puntería): beam search por
// ángulo×fuerza. Responde si el oro (≤ PAR) es alcanzable y con qué secuencia.
const BUSCA_JS = `(() => {
  const Mg = AV.G.v18minigolf, G = AV.G;
  const K = Mg.sitio;
  const L = 18, HW = 3.5, PAR = Mg.PAR;
  const NIDO = { u: L / 2 - 2.2, v: 0 };
  const mundo = (u, v) => ({ x: K.x + K.ux * u + K.vx * v, z: K.z + K.uz * u + K.vz * v });
  const local = (x, z) => { const dx = x - K.x, dz = z - K.z; return { u: dx * K.ux + dz * K.uz, v: dx * K.vx + dz * K.vz }; };
  const PN = mundo(NIDO.u, NIDO.v);
  const ROCE_A = 1.4, ROCE_B = 0.55, VMIN = 1.5, VMAX = 13;
  const recorre = v0 => v0 / ROCE_B - ROCE_A / (ROCE_B * ROCE_B) * Math.log(1 + ROCE_B * v0 / ROCE_A);
  const fuerzaPara = d => { let lo = 0, hi = 1; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (recorre(VMIN + (VMAX - VMIN) * m) < d) lo = m; else hi = m; } return (lo + hi) / 2; };
  const t0 = performance.now();
  const tiraDesde = (u0, v0, yaw, f) => {
    Mg.iniciar({ forzar: true });
    // la física solo lee la semilla (posición/velocidad): la reescribimos para «teleportar» la bola
    const B = Mg.semilla();
    const m0 = mundo(u0, v0);
    B.x = m0.x; B.z = m0.z; B.vx = 0; B.vz = 0;
    G.camara.yaw = yaw;
    Mg.tirar(f);
    let n = 0; while (Mg.estado().fase === 'rueda' && n < 4200) { Mg.paso(1 / 60); n++; }
    const q = local(B.x, B.z);
    return { u: q.u, v: q.v, fuera: Mg.estado().fase === 'fuera', nido: Mg.estado().fase === 'nido' };
  };
  const distNido = p => Math.hypot(p.u - NIDO.u, p.v - NIDO.v);
  const ANG = 60, FUE = 9, BEAM = 25, PROF = 5;
  let nivel = [{ u: -L / 2 + 1.8, v: 0, seq: [] }];
  const hallado = [];
  let minTiros = null;
  for (let prof = 1; prof <= PROF; prof++) {
    const cand = [];
    for (const est of nivel) {
      for (let a = 0; a < ANG; a++) {
        for (let fi = 0; fi < FUE; fi++) {
          const f = 0.12 + (1 - 0.12) * fi / (FUE - 1);
          // fuerza en dirección al nido ± ángulo: el yaw 0 apunta a -z local; usamos la convención
          // del bot: yaw = atan2(-ex,-ez) con (ex,ez) hacia el objetivo; aquí variamos el offset
          const obj = mundo(est.u, est.v);
          const dLocal = Math.atan2(-(PN.x - obj.x), -(PN.z - obj.z));
          const r = tiraDesde(est.u, est.v, dLocal + (a / (ANG - 1) - 0.5) * Math.PI, f);
          if (r.nido) { hallado.push({ tiros: prof, seq: est.seq.concat([{ f: +f.toFixed(2), off: +((a / (ANG - 1) - 0.5) * 180).toFixed(0) }]), desde: { u: +est.u.toFixed(1), v: +est.v.toFixed(1) } }); }
          else if (!r.fuera && Math.abs(r.u) < L / 2 + 0.3 && Math.abs(r.v) < HW + 0.3) cand.push({ u: r.u, v: r.v, seq: est.seq.concat([{ f: +f.toFixed(2), off: +((a / (ANG - 1) - 0.5) * 180).toFixed(0) }]) });
        }
      }
    }
    if (hallado.length) { minTiros = prof; break; }
    cand.sort((x, y) => distNido(x) - distNido(y));
    nivel = cand.slice(0, BEAM);
    if (!nivel.length) break;
  }
  return { ok: true, par: PAR, minTirosHallado: minTiros, oroPosible: !!minTiros && minTiros <= PAR,
    soluciones: hallado.slice(0, 5), ms: Math.round(performance.now() - t0),
    sitio: { x: +K.x.toFixed(1), z: +K.z.toFixed(1), a: +K.a.toFixed(3), troncos: K.troncos } };
})()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k174-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--window-size=1280,800', 'about:blank'];
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi1k174-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const res = { etiqueta: ETIQUETA, tarea: 'KIMI-174(b)', pantalla: 'fisica sincrona (CPU), sin GPU dependence', partidas: N_PARTIDAS, sigmaDeg: SIGMA_DEG, fuerzaJitter: JITTER, pifias: PIFIAS, ruta: RUTA_NOMBRE, bot: 'ruta ' + RUTA_NOMBRE + ' + aim gaussiano + fuerza x(1±jitter), pifia corta x' + PIFIAS + ', sin grito, tope propio 12 tiros' };
  const watch = setInterval(() => { try { guardar(res); } catch (e) { } }, 5000);
  try {
    log('lanzando Chrome y entrando (v18=1)...');
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&v18=1` }, ses);
    const t0 = Date.now(); let listo = false;
    while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
      await cdp.bombear(0.5);
    }
    if (!listo) throw new Error('el juego no arrancó');
    const ent = await evaluar(cdp, ses, ENTRAR_JS, 120);
    if (!/^ok/.test(ent)) throw new Error('entrada: ' + ent);
    const prep = await evaluar(cdp, ses, PREP_JS, 150);
    if (!/^ok/.test(prep)) throw new Error('prep: ' + prep);
    log('prep ok (' + prep + ')');

    log(`simulando ${N_PARTIDAS} partidas (sigma=${SIGMA_DEG}°, jitter=${JITTER})...`);
    const BUSCA = process.argv.indexOf('--busca') > 0;
    const sim = await evaluar(cdp, ses, BUSCA ? BUSCA_JS : SIM_JS, BUSCA ? 240 : 300, false);
    if (!sim || sim.ok !== true) throw new Error('sim: ' + JSON.stringify(sim).slice(0, 300));
    Object.assign(res, sim);
    const s = res.resumen || {};
    log(`resumen: ${JSON.stringify(s)}`);
    log(`anomalías: ${JSON.stringify(res.anomalias)}`);
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
    log('evidencia: ' + path.join(SALIDA, `k174_${ETIQUETA}.json`));
    process.exit(res.fallo ? 1 : 0);
  }
})();
