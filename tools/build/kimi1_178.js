#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-178: video del HITO 1 para Kelvin.
   Recorrido real de ~3,5-4 min con GPU real a 1920x1080 por el enlace principal (index.html):
   entrar (portada→Jugar→mundo), paseo por Villa Raíz, minigolf (E → «¿Cuántos juegan?» → 1 → 2 tiros),
   vuelo al duelo de la explanada (hablar con la Campeona, pelear un poco: ala E / semilla F / poder G),
   vuelo sobre el puente reparado, misión del puerto (diálogo junto a la máquina), carrera de Chispa
   (2-3 puertas) y cierre. Input REAL por CDP (teclas); la posición solo se LEE para gobernar la entrada
   y desatascar. Nada de teletransportes: se camina y se vuela como un jugador.
   La V18 va por localStorage amazonaverse.v18on='1' (en HEAD boot.js:100 aún es por bandera; el
   contenido es el mismo que cuando la coordinadora la encienda por defecto).
   Salida: docs/img/kimi178/k178_hito1_<etiqueta>.mp4 + k178_<etiqueta>.json/.log + _ref.jpg
   Uso: node tools/build/kimi1_178.js [--etiqueta r1] [--tope-segs 260]
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
const TOPE_SEGS = parseInt(arg('--tope-segs', '260'), 10);
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi178');
fs.mkdirSync(SALIDA, { recursive: true });
const NOMBRE = `k178_hito1_${ETIQUETA}`;
const LOGF = path.join(SALIDA, `k178_${ETIQUETA}.log`);
fs.writeFileSync(LOGF, '');
function log(msg) { try { fs.appendFileSync(LOGF, `[${new Date().toISOString().slice(11, 19)}] ${msg}\n`); } catch (e) { } console.log(msg); }
function guardar(res) { try { fs.writeFileSync(path.join(SALIDA, `k178_${ETIQUETA}.json`), JSON.stringify(res, null, 1)); } catch (e) { } }

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi1k178-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.mp4': 'video/mp4' };
function servir() {
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (req.method === 'POST' && u.pathname === '/__kimi178/grabar') {
      const nombre = path.basename(u.searchParams.get('nombre') || 'video.mp4');
      const dest = path.join(SALIDA, nombre);
      const f = fs.createWriteStream(dest);
      req.pipe(f);
      f.on('finish', () => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ destino: nombre })); });
      f.on('error', e => { res.writeHead(500); res.end(JSON.stringify({ error: String(e.message || e) })); });
      return;
    }
    let p = path.normalize(decodeURIComponent(u.pathname)).replace(/^(\.\.[/\\])+/, '');
    if (p === '/' || p === '\\') p = '/index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ)) { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); res.end('404'); }
      else { res.writeHead(200, { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(d); }
    });
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
  if (r.exceptionDetails) { const d = r.exceptionDetails; throw new Error('JS@' + (d.lineNumber != null ? d.lineNumber + ':' + d.columnNumber : '?') + ': ' + JSON.stringify(d.exception && d.exception.description || d.text).slice(0, 700)); }
  return r.result ? r.result.value : undefined;
}
function dormir(s) { return new Promise(r => setTimeout(r, s * 1000)); }

const RAF_LIMIT_JS = `try {
  window.__rafOri = window.requestAnimationFrame.bind(window);
  window.__rafUlt = 0;
  window.requestAnimationFrame = function (cb) {
    return window.__rafOri(function (ts) {
      const ahora = performance.now(), ult = window.__rafUlt;
      const falta = 31 - (ahora - ult);
      if (!ult || falta <= 0) { window.__rafUlt = ahora; try { cb(ts); } catch (e) { } }
      else setTimeout(function () { window.requestAnimationFrame(cb); }, falta);
    });
  };
} catch (e) {}`;

const SEMILLA_SAVE_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  window.__erroresConsola = [];
  addEventListener('error', e => __erroresConsola.push(String(e.message || e)));
  addEventListener('unhandledrejection', e => __erroresConsola.push('rechazo: ' + (e.reason && e.reason.message || e.reason)));
  const cerr = console.error; console.error = function () { try { __erroresConsola.push([].map.call(arguments, String).join(' ').slice(0, 300)); } catch (e) {} return cerr.apply(this, arguments); };
  localStorage.setItem('amazonaverse.v18on', '1');
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1k178-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Viajera del Hito', look: null },
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
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 60000);
  const b = document.getElementById('c1-saltar'); if (b) b.click();
  await sleep(800);
  const f = document.getElementById('c1-fade'); if (f) f.remove();
  if (AV.G.ui && AV.G.ui.hideToast) AV.G.ui.hideToast();
  try { window.dispatchEvent(new PointerEvent('pointerdown')); window.dispatchEvent(new PointerEvent('pointerup')); } catch (e) {}
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

// Espera el mundo y asegura los módulos V18 (con v18on el boot los carga al primer gesto; se fuerzan
// por si el gesto sintético no bastó). El puente queda 'reparado' para el hito (mundo V18 ya pagado).
const PREP_JS = `(async () => { try { return await (async () => {
  const G = AV.G, sleep = ms => new Promise(r => setTimeout(r, ms));
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(150); } return false; };
  if (!await espera(() => G.mundo && G.mundo.listo, 90000)) return 'ERR mundo no listo';
  try { window.dispatchEvent(new PointerEvent('pointerdown')); window.dispatchEvent(new PointerEvent('pointerup')); } catch (e) {}
  { const cargar = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('script ' + src)); document.head.appendChild(s); });
    const asegurar = async (src, fabrica) => {
      if (typeof window[fabrica] !== 'function' && !document.querySelector('script[src="' + src + '"]')) { try { await cargar(src); } catch (e) { throw e; } }
      const t0 = performance.now();
      while (typeof window[fabrica] !== 'function' && performance.now() - t0 < 20000) await sleep(200);
      if (typeof window[fabrica] !== 'function') throw new Error('sin fábrica ' + fabrica);
    };
    try {
      await asegurar('src/game/v18/progreso.js', 'AVV18Progreso'); if (!G.v18) window.AVV18Progreso(G);
      await asegurar('src/game/v18/habilidades.js', 'AVV18Habilidades'); if (!G.v18hab) window.AVV18Habilidades(G);
      await asegurar('src/game/v18/fx_poderes.js', 'AVV18Fx'); if (!G.v18fx) window.AVV18Fx(G);
      await asegurar('src/game/v18/combate.js', 'AVV18Combate'); if (!G.v18combate) window.AVV18Combate(G);
      await asegurar('src/game/v18/descubrir.js', 'AVV18Descubrir'); if (!G.v18descubrir) window.AVV18Descubrir(G);
      await asegurar('src/game/v18/minigolf.js', 'AVV18Minigolf'); if (!G.v18minigolf) window.AVV18Minigolf(G);
      await asegurar('src/game/v18/reparar.js', 'AVV18Reparar'); if (!G.v18reparar) window.AVV18Reparar(G);
    } catch (e) { return 'ERR cargando v18: ' + (e && e.message || e); } }
  if (!(G.v18 && G.v18fx && G.v18minigolf && G.v18combate)) return 'ERR módulos: v18=' + !!G.v18 + ' fx=' + !!G.v18fx + ' golf=' + !!G.v18minigolf + ' combate=' + !!G.v18combate;
  try { G.v18.desbloquear('vittata'); G.v18.seleccionar('vittata'); } catch (e) {}
  try { G.v18.mundo('puente_villa', 'reparado'); } catch (e) {}
  let puente = null;
  try { const pl = (G.terreno.plataformas || []).find(p => p.id === 'puente' && p.tipo === 'puente');
    if (pl) { const c = pl.caja || pl; puente = { x: (c.x0 + c.x1) / 2 || pl.x, z: (c.z0 + c.z1) / 2 || pl.z }; if (pl.x != null && pl.z != null) puente = { x: pl.x, z: pl.z }; }
  } catch (e) {}
  return JSON.stringify({ ok: true, golf: { x: G.v18minigolf.sitio.x, z: G.v18minigolf.sitio.z },
    duelo: { x: G.v18combate.sitio.x, z: G.v18combate.sitio.z },
    puerto: { x: G.v18puerto && G.v18puerto.SITIO ? G.v18puerto.SITIO.plaza.x : null, z: G.v18puerto && G.v18puerto.SITIO ? G.v18puerto.SITIO.plaza.z : null },
    maq: (() => { try { const m = G.v18puerto && G.v18puerto.maq; return m && m.position ? { x: m.position.x, z: m.position.z } : null; } catch (e) { return null; } })(),
    chispa: (() => { try { return G.v18chispa ? { x: G.v18chispa.SITIO.salida.x, z: G.v18chispa.SITIO.salida.z } : null; } catch (e) { return null; } })(),
    puente });
})(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

const REC_JS = `(() => { try {
  if (window.__rec) return window.__rec.mime;
  const cv = document.querySelector('canvas');
  if (!cv) return 'ERR sin canvas';
  const stream = cv.captureStream(30);
  const mimos = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  const mime = mimos.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
  if (!mime) return 'ERR sin MediaRecorder';
  let rec = null, chunks = [];
  window.__recLog = [];
  const anota = m => { try { window.__recLog.push(performance.now().toFixed(0) + ' ' + m); } catch (e) { } };
  window.__rec = {
    mime,
    empieza() { chunks = []; rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: (window.__recBits || 1200000) }); rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); }; rec.onerror = ev => anota('rec.error ' + (ev && ev.error && ev.error.name || ev)); rec.onstop = () => anota('rec.stop state=' + (rec && rec.state)); rec.start(400); anota('rec.start'); },
    async para(nombre) {
      anota('rec.para state=' + (rec && rec.state));
      const blob = await new Promise(res => { rec.onstop = () => res(new Blob(chunks, { type: mime })); rec.stop(); });
      const r = await fetch('/__kimi178/grabar?nombre=' + encodeURIComponent(nombre), { method: 'POST', body: blob });
      const j = await r.json();
      return { mime, bytes: blob.size, destino: j.destino };
    }
  };
  return mime;
} catch (e) { return 'ERR ' + (e && e.message || e); } })()`;

const TECLAS = {
  w: { vk: 87, code: 'KeyW', key: 'w' }, a: { vk: 65, code: 'KeyA', key: 'a' }, s: { vk: 83, code: 'KeyS', key: 's' }, d: { vk: 68, code: 'KeyD', key: 'd' },
  q: { vk: 81, code: 'KeyQ', key: 'q' }, r: { vk: 82, code: 'KeyR', key: 'r' },
  e: { vk: 69, code: 'KeyE', key: 'e' }, f: { vk: 70, code: 'KeyF', key: 'f' }, g: { vk: 71, code: 'KeyG', key: 'g' },
  v: { vk: 86, code: 'KeyV', key: 'v' }, x: { vk: 88, code: 'KeyX', key: 'x' },
  espacio: { vk: 32, code: 'Space', key: ' ' }, esc: { vk: 27, code: 'Escape', key: 'Escape' }
};
async function tecla(cdp, ses, nombre, abajo) {
  const t = TECLAS[nombre]; if (!t) return;
  await cdp.call('Input.dispatchKeyEvent', { type: abajo ? 'keyDown' : 'keyUp', windowsVirtualKeyCode: t.vk, code: t.code, key: t.key }, ses, 10000);
}
async function toque(cdp, ses, nombre, s) { await tecla(cdp, ses, nombre, true); await dormir(s); await tecla(cdp, ses, nombre, false); }

async function estado(cdp, ses) {
  return JSON.parse(await evaluar(cdp, ses, `(() => { try { const G = AV.G, S = AV.state;
    return JSON.stringify({ x: S.pos.x, y: S.pos.y, z: S.pos.z, yaw: G.camara.yaw,
      volando: !!(G.fisica.MOVE && G.fisica.MOVE.flying),
      golf: G.v18minigolf ? G.v18minigolf.estado().fase : null,
      duelo: G.v18combate ? G.v18combate.estado().fase : null,
      chispa: G.v18chispa ? G.v18chispa.estado().fase : null,
      rival: (() => { try { const C = G.v18combate.estado(); return C.r ? { x: C.r.pos.x, z: C.r.pos.z } : null; } catch (e) { return null; } })() });
  } catch (e) { return JSON.stringify({ error: String(e && e.message || e) }); } })()`, 12));
}

// Gira la cámara hacia el rumbo deseado (q izquierda / r derecha) como haría un jugador.
async function mirar(cdp, ses, deseada) {
  for (let i = 0; i < 14; i++) {
    const st = await estado(cdp, ses);
    if (st.error) return;
    const diff = ((deseada - st.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    if (Math.abs(diff) < 0.12) return;
    await tecla(cdp, ses, 'w', false);
    await toque(cdp, ses, diff > 0 ? 'q' : 'r', Math.min(0.45, Math.abs(diff) / 2.2));
  }
}
// Camina con W hasta (tx,tz); desatasco: retrocede y gira. Devuelve {llego, segs}.
async function caminarHasta(cdp, ses, tx, tz, tol, topeS) {
  const t0 = Date.now(); let ult = null, quieta = 0;
  await tecla(cdp, ses, 'w', false);
  while ((Date.now() - t0) / 1000 < topeS) {
    const st = await estado(cdp, ses);
    if (st.error) { await dormir(0.5); continue; }
    const d = Math.hypot(tx - st.x, tz - st.z);
    if (d < tol) { await tecla(cdp, ses, 'w', false); return { llego: true, segs: (Date.now() - t0) / 1000 }; }
    if (ult && Math.hypot(st.x - ult.x, st.z - ult.z) < 0.3) quieta += 0.35; else quieta = 0;
    ult = { x: st.x, z: st.z };
    if (quieta > 3.5) {
      await tecla(cdp, ses, 'w', false); await toque(cdp, ses, 's', 0.9); await toque(cdp, ses, 'r', 0.7); quieta = 0; continue;
    }
    await mirar(cdp, ses, Math.atan2(-(tx - st.x), -(tz - st.z)));
    await tecla(cdp, ses, 'w', true); await dormir(0.35);
  }
  await tecla(cdp, ses, 'w', false);
  return { llego: false, segs: (Date.now() - t0) / 1000 };
}
// Vuela hasta (tx,tz) a la altura dada y aterriza con X. Devuelve {llego, segs}.
async function volarHasta(cdp, ses, tx, tz, altura, topeS) {
  const t0 = Date.now();
  await tecla(cdp, ses, 'w', false);
  const st0 = await estado(cdp, ses);
  if (st0.error) return { llego: false, segs: 0 };
  if (!st0.volando) {
    await toque(cdp, ses, 'v', 0.15); await dormir(2.2);
    await tecla(cdp, ses, 'espacio', true); await dormir(1.8); await tecla(cdp, ses, 'espacio', false);
  }
  let ult = null, quieta = 0;
  while ((Date.now() - t0) / 1000 < topeS) {
    const st = await estado(cdp, ses);
    if (st.error) { await dormir(0.5); continue; }
    const d = Math.hypot(tx - st.x, tz - st.z);
    if (d < 6) break;
    if (!st.volando) { await toque(cdp, ses, 'v', 0.15); await dormir(2.0); continue; }
    if (ult && Math.hypot(st.x - ult.x, st.z - ult.z) < 0.5) quieta += 0.4; else quieta = 0;
    ult = { x: st.x, z: st.z };
    if (quieta > 4) { await tecla(cdp, ses, 'espacio', true); await dormir(1.2); await tecla(cdp, ses, 'espacio', false); quieta = 0; }
    await mirar(cdp, ses, Math.atan2(-(tx - st.x), -(tz - st.z)));
    if (st.y < altura) { await tecla(cdp, ses, 'espacio', true); await dormir(0.5); await tecla(cdp, ses, 'espacio', false); }
    await tecla(cdp, ses, 'w', true); await dormir(0.45);
  }
  await tecla(cdp, ses, 'w', false); await tecla(cdp, ses, 'espacio', false);
  // aterrizaje cerca del objetivo
  for (let i = 0; i < 10; i++) {
    const st = await estado(cdp, ses);
    if (st.error || !st.volando) break;
    const d = Math.hypot(tx - st.x, tz - st.z);
    if (d > 7 && d < 40) { await mirar(cdp, ses, Math.atan2(-(tx - st.x), -(tz - st.z))); await tecla(cdp, ses, 'w', true); await dormir(0.6); await tecla(cdp, ses, 'w', false); }
    await toque(cdp, ses, 'x', 0.15); await dormir(1.4);
  }
  const fin = await estado(cdp, ses);
  return { llego: !fin.error && Math.hypot(tx - fin.x, tz - fin.z) < 14, segs: (Date.now() - t0) / 1000 };
}

// ---------- Segmentos del recorrido (todo en tiempo real, con la grabación encendida) ----------
async function segVilla(cdp, ses, res) {
  log('[villa] paseo por Villa Raíz');
  await toque(cdp, ses, 'r', 0.8); // mira a la derecha: la villa
  await caminarHasta(cdp, ses, -8, 8, 3, 12);
  await toque(cdp, ses, 'espacio', 0.12); await dormir(0.8);
  await toque(cdp, ses, 'q', 1.0);
  res.villa = 'ok';
}
async function segGolf(cdp, ses, res, sitios) {
  log('[golf] volando a la entrada del minigolf');
  const mapa = JSON.parse(await evaluar(cdp, ses, `JSON.stringify(AV.G.v18minigolf.mapa() || null)`, 10));
  const dest = mapa || sitios.golf;
  const vuelo = await volarHasta(cdp, ses, dest.x, dest.z, 10, 70);
  const cam = await caminarHasta(cdp, ses, dest.x, dest.z, 2.6, 12);
  log('[golf] llegada (vuelo ' + vuelo.segs.toFixed(0) + 's, andando ' + cam.segs.toFixed(0) + 's, cerca=' + cam.llego + '); E para jugar');
  await toque(cdp, ses, 'e', 0.12); await dormir(1.2);
  // «¿Cuántos juegan?» → 1 (botón real del panel)
  const eligio = await evaluar(cdp, ses, `(async()=>{ const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    for (let i=0;i<20;i++){ const b=document.querySelector('#v18-golf [data-k="elige"] button[data-a="j1"]'); if (b){ b.click(); return 'panel'; } await sleep(300); }
    try { AV.G.v18minigolf.iniciar({forzar:true}); return 'forzar'; } catch(e){ return 'ERR '+e; } })()`, 15, true);
  log('[golf] entrada al hoyo: ' + eligio);
  await evaluar(cdp, ses, `(async()=>{ const sleep=ms=>new Promise(r=>setTimeout(r,ms)), Mg=AV.G.v18minigolf;
    for (let i=0;i<60;i++){ const f=Mg.estado().fase; if (f==='apuntar'||f==='carga'||f==='rueda') return f; await sleep(250); } return Mg.estado().fase; })()`, 25, true);
  // dos tiros: apuntar la cámara como el jugador y tirar con la física real (mismo camino que soltar la carga)
  const tiros = await evaluar(cdp, ses, `(async () => { try { return await (async () => {
    const Mg = AV.G.v18minigolf, G = AV.G, sleep = ms => new Promise(r => setTimeout(r, ms));
    const K = Mg.sitio;
    const RUTA = [{ u: -1.2, v: 2.0 }, { u: 0.8, v: -2.0 }, { u: 3.8, v: -2.0 }, { u: 6.9, v: 0 }];
    const local = (x, z) => { const dx = x - K.x, dz = z - K.z; return { u: dx * K.ux + dz * K.uz, v: dx * K.vx + dz * K.vz }; };
    const mundo = (u, v) => ({ x: K.x + K.ux * u + K.vx * v, z: K.z + K.uz * u + K.vz * v });
    const esperaQuieta = async () => { const t0 = performance.now(); let px = null, pz = null;
      while (performance.now() - t0 < 16000) { const B = Mg.semilla(); if (B) { if (px != null && Math.hypot(B.x - px, B.z - pz) < 0.05 && Mg.estado().fase !== 'nido') return; px = B.x; pz = B.z; } await sleep(200); } };
    const n0 = 2;
    for (let t = 0; t < n0; t++) {
      const fase = Mg.estado().fase;
      if (fase === 'nido' || fase === 'nada') break;
      const B = Mg.semilla(); if (!B) break;
      const q = local(B.x, B.z);
      let w = RUTA[0]; for (const p of RUTA) { if (Math.hypot(q.u - p.u, q.v - p.v) < Math.hypot(q.u - w.u, q.v - w.v)) w = p; }
      const wm = mundo(w.u, w.v), ex = wm.x - B.x, ez = wm.z - B.z;
      G.camara.yaw = Math.atan2(-ex, -ez);
      await sleep(1400);
      const d = Math.hypot(ex, ez);
      const f = Math.max(0.08, Math.min(1, d / 13));
      if (Mg.tirar(f) !== true) { await sleep(500); t--; continue; }
      await esperaQuieta();
    }
    return JSON.stringify({ fase: Mg.estado().fase, golpes: Mg.estado().golpes });
  })(); } catch (e) { return 'ERR ' + (e && e.message || e); } })()`, 60, true);
  log('[golf] tiros: ' + tiros);
  await dormir(1.0);
  await toque(cdp, ses, 'esc', 0.15); await dormir(1.2); // Salir del hoyo (QA-189)
  await evaluar(cdp, ses, `(async()=>{ const sleep=ms=>new Promise(r=>setTimeout(r,ms)); for (let i=0;i<30;i++){ if (AV.G.v18minigolf.estado().fase==='nada') return 'nada'; await sleep(200);} return AV.G.v18minigolf.estado().fase; })()`, 12, true);
  res.golf = { entrada: eligio, tiros };
}
async function segDuelo(cdp, ses, res, sitios) {
  const rival = { x: sitios.duelo.x + 4, z: sitios.duelo.z };
  log('[duelo] volando a la explanada (rival en ' + JSON.stringify(rival) + ')');
  const vuelo = await volarHasta(cdp, ses, rival.x - 2, rival.z, 11, 60);
  await caminarHasta(cdp, ses, rival.x, rival.z, 2.6, 14);
  log('[duelo] vuelo ' + vuelo.segs.toFixed(0) + 's (llego=' + vuelo.llego + '); hablo con la Campeona');
  await dormir(0.8);
  await toque(cdp, ses, 'e', 0.12); await dormir(1.0);
  const fase0 = await evaluar(cdp, ses, `(async()=>{ const sleep=ms=>new Promise(r=>setTimeout(r,ms)); for (let i=0;i<50;i++){ const f=AV.G.v18combate.estado().fase; if (f==='cuenta'||f==='lucha') return f; await sleep(200);} return AV.G.v18combate.estado().fase; })()`, 15, true);
  log('[duelo] fase tras hablar: ' + fase0);
  if (fase0 !== 'cuenta' && fase0 !== 'lucha') {
    await evaluar(cdp, ses, `AV.G.v18combate.iniciar({ forzar: true, especie: 'vittata' }) && 'iniciado'`, 10, false);
    await dormir(2.5);
  }
  // pelea ~34 s: acercarse, ala (E), semilla (F) y una vez el poder G (Grito del Yunque, ~al 6 s)
  const t0 = Date.now(); let poderHecho = false;
  while ((Date.now() - t0) / 1000 < 34) {
    const st = await estado(cdp, ses);
    if (st.error) break;
    if (st.duelo === 'nada' || st.duelo === 'fin') break;
    if (st.duelo === 'cuenta') { await dormir(0.8); continue; }
    if (st.rival) {
      const d = Math.hypot(st.rival.x - st.x, st.rival.z - st.z);
      await mirar(cdp, ses, Math.atan2(-(st.rival.x - st.x), -(st.rival.z - st.z)));
      if (d > 2.6) { await tecla(cdp, ses, 'w', true); await dormir(0.5); await tecla(cdp, ses, 'w', false); }
      else { await toque(cdp, ses, 'e', 0.12); await dormir(0.7); }
      if (d > 3.5) await toque(cdp, ses, 'f', 0.12);
      if (!poderHecho && (Date.now() - t0) / 1000 > 6) { await toque(cdp, ses, 'g', 0.12); poderHecho = true; }
    }
    await dormir(0.4);
  }
  const faseFin = await evaluar(cdp, ses, `AV.G.v18combate.estado().fase`, 8, false);
  log('[duelo] fase fin: ' + faseFin + ' (poder=' + poderHecho + ')');
  if (faseFin === 'lucha' || faseFin === 'cuenta') {
    await tecla(cdp, ses, 's', true); await dormir(2.6); await tecla(cdp, ses, 's', false);
    const f2 = await evaluar(cdp, ses, `AV.G.v18combate.estado().fase`, 8, false);
    if (f2 === 'lucha' || f2 === 'cuenta') { await evaluar(cdp, ses, `AV.G.v18combate.salir() && 'salir'`, 8, false); }
  }
  res.duelo = { vuelo: +vuelo.segs.toFixed(0), fase: faseFin, poder: poderHecho };
}
async function segPuente(cdp, ses, res, sitios) {
  if (!sitios.puente) { res.puente = 'sin coordenadas'; return; }
  log('[puente] volando al puente ' + JSON.stringify(sitios.puente));
  const v = await volarHasta(cdp, ses, sitios.puente.x, sitios.puente.z, 9, 60);
  // cruce lento sobre el río (baja y avanza un poco más para enseñar la otra orilla)
  log('[puente] cruzando (vuelo ' + v.segs.toFixed(0) + 's, llego=' + v.llego + ')');
  await evaluar(cdp, ses, `(async()=>{ const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const G=AV.G;
    const pl=(G.terreno.plataformas||[]).find(p=>p.id==='puente'&&p.tipo==='puente'); if(!pl) return 'no';
    const c=pl.caja||pl; const x1=(c.x1!=null?c.x1:c.x)+0, x0=(c.x0!=null?c.x0:c.x)+0, z0=(c.z0!=null?c.z0:c.z)+0, z1=(c.z1!=null?c.z1:c.z)+0;
    const mx=(x0+x1)/2, mz=(z0+z1)/2; G.camara.yaw=Math.atan2(-(x1-x0),-(z1-z0)); return JSON.stringify({mx,mz,x1,z1}); })()`, 10, true);
  await tecla(cdp, ses, 'w', true); await dormir(3.2); await tecla(cdp, ses, 'w', false);
  res.puente = { vuelo: +v.segs.toFixed(0), llego: v.llego };
}
async function segPuerto(cdp, ses, res, sitios) {
  const plaza = sitios.puerto && sitios.puerto.x != null ? sitios.puerto : { x: 73.6, z: -75.2 };
  log('[puerto] volando a la plaza ' + JSON.stringify(plaza));
  const v = await volarHasta(cdp, ses, plaza.x, plaza.z, 12, 70);
  // el módulo del puerto carga en proximidad: esperar a que la máquina exista
  const maq = JSON.parse(await evaluar(cdp, ses, `(async()=>{ const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    for (let i=0;i<50;i++){ try { const m=AV.G.v18puerto && AV.G.v18puerto.maq; if (m && m.position) return JSON.stringify({x:m.position.x,z:m.position.z}); } catch(e){} await sleep(300); } return 'null'; })()`, 20, true));
  if (maq) {
    await caminarHasta(cdp, ses, maq.x, maq.z, 4.5, 18);
    await toque(cdp, ses, 'e', 0.12); await dormir(2.5);
    await toque(cdp, ses, 'e', 0.12); await dormir(2.0);
    await evaluar(cdp, ses, `(()=>{ try { AV.G.dialogo.clear(); } catch(e){} return 'ok'; })()`, 8, false);
  }
  log('[puerto] visitado (vuelo ' + v.segs.toFixed(0) + 's, llego=' + v.llego + ')');
  res.puerto = { vuelo: +v.segs.toFixed(0), llego: v.llego, maq: !!maq };
}
async function segChispa(cdp, ses, res, sitios) {
  const dest = sitios.chispa || { x: 49.8, z: 54.3 }; // SITIO.salida de chispa.js (constante del mapa)
  log('[chispa] volando a la salida ' + JSON.stringify(dest));
  const v = await volarHasta(cdp, ses, dest.x, dest.z, 11, 70);
  // hablar con Chispa → carrera (entrada real por interacción; si no, forzar)
  await dormir(0.8);
  await toque(cdp, ses, 'e', 0.12); await dormir(1.2);
  let fase = await evaluar(cdp, ses, `(async()=>{ const sleep=ms=>new Promise(r=>setTimeout(r,ms)); for (let i=0;i<40;i++){ const f=AV.G.v18chispa.estado().fase; if (f==='cuenta'||f==='carrera') return f; await sleep(250);} return AV.G.v18chispa.estado().fase; })()`, 15, true);
  log('[chispa] fase tras hablar: ' + fase);
  if (fase !== 'cuenta' && fase !== 'carrera') {
    await evaluar(cdp, ses, `AV.G.v18chispa.empezar({ forzar: true }) && 'empezado'`, 10, false);
    await dormir(2.0);
    fase = 'forzada';
  }
  // volar por 2-3 puertas siguiendo el punto actual de la carrera
  const t0 = Date.now(); let puertas = 0, ultima = null;
  while ((Date.now() - t0) / 1000 < 34) {
    const st = await evaluar(cdp, ses, `(()=>{ try { const G=AV.G, S=AV.state, A=G.v18chispa.estado();
      return JSON.stringify({ x:S.pos.x, y:S.pos.y, z:S.pos.z, yaw:G.camara.yaw, volando:!!(G.fisica.MOVE&&G.fisica.MOVE.flying), fase:A.fase, cx:A.cx, cz:A.cz, sig:A.sig }); } catch(e){ return '{"error":"'+e+'"}'; } })()`, 12);
    const A = JSON.parse(st);
    if (A.error || !A.fase || A.fase === 'nada') break;
    if (A.fase === 'carrera' && A.cx != null) {
      if (ultima !== A.sig) { ultima = A.sig; puertas++; log('[chispa] puerta ' + A.sig); }
      if (!A.volando) { await toque(cdp, ses, 'v', 0.15); await dormir(2.0); }
      const d = Math.hypot(A.cx - A.x, A.cz - A.z);
      await mirar(cdp, ses, Math.atan2(-(A.cx - A.x), -(A.cz - A.z)));
      if (A.y < 8) { await tecla(cdp, ses, 'espacio', true); await dormir(0.6); await tecla(cdp, ses, 'espacio', false); }
      await tecla(cdp, ses, 'w', true); await dormir(0.45);
      if (d < 2.2) await tecla(cdp, ses, 'w', false);
    } else { await tecla(cdp, ses, 'w', false); await dormir(0.7); }
  }
  await tecla(cdp, ses, 'w', false); await tecla(cdp, ses, 'espacio', false);
  // alejarse para cerrar la carrera (cancela por distancia, como un jugador que se va)
  await mirar(cdp, ses, (await estado(cdp, ses)).yaw + Math.PI);
  await tecla(cdp, ses, 'w', true); await dormir(5); await tecla(cdp, ses, 'w', false);
  const fFin = await evaluar(cdp, ses, `AV.G.v18chispa.estado().fase`, 8, false);
  if (fFin === 'carrera' || fFin === 'cuenta') await evaluar(cdp, ses, `AV.G.v18chispa.cancelar() && 'cancelado'`, 8, false);
  log('[chispa] fin (puertas=' + puertas + ')');
  res.chispa = { vuelo: +v.segs.toFixed(0), fase, puertas };
}
async function segOutro(cdp, ses, res) {
  log('[outro] cierre: aterrizar y mirar el mundo');
  for (let i = 0; i < 8; i++) { const st = await estado(cdp, ses); if (!st.error && !st.volando) break; await toque(cdp, ses, 'x', 0.15); await dormir(1.2); }
  await toque(cdp, ses, 'q', 1.4); await dormir(0.5); await toque(cdp, ses, 'r', 2.2);
  res.outro = 'ok';
}

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k178-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--window-size=1920,1080', '--force-device-scale-factor=1', 'about:blank'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 150; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    await dormir(0.2);
  }
  throw new Error('Chrome no abrió DevTools en 30 s: ' + err.slice(0, 300));
}
function mataPorPerfil() {
  try {
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi1k178-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}
// Duración real del fMP4: Chrome headless escribe mvhd=0; la verdad está en las muestras (tfdt/trun).
function mp4Info(ruta) {
  try {
    const b = fs.readFileSync(ruta);
    let minCTS = Infinity, maxFin = -Infinity, timescale = 0, muestras = 0;
    const cajas = (desde, hasta) => {
      let off = desde; const out = [];
      while (off < hasta - 8) {
        let size = b.readUInt32BE(off); const tipo = b.toString('latin1', off + 4, off + 8); let hdr = 8;
        if (size === 1) { size = Number(b.readBigUInt64BE(off + 8)); hdr = 16; }
        if (size === 0) size = hasta - off;
        if (size < 8) break;
        out.push({ tipo, off, size, hdr }); off += size;
      }
      return out;
    };
    const walk = (off, hasta) => {
      for (const c of cajas(off, hasta)) {
        if (c.tipo === 'mdhd') { const v = b.readUInt8(c.off + 8); timescale = v === 0 ? b.readUInt32BE(c.off + 20) : b.readUInt32BE(c.off + 28); }
        if (c.tipo === 'moof') {
          let base = 0;
          for (const t of cajas(c.off + c.hdr, c.off + c.size)) {
            if (t.tipo !== 'traf') continue;
            for (const s of cajas(t.off + t.hdr, t.off + t.size)) {
              if (s.tipo === 'tfdt') { const v = b.readUInt8(s.off + 8); base = v === 0 ? b.readUInt32BE(s.off + 12) : Number(b.readBigUInt64BE(s.off + 12)); }
              if (s.tipo === 'trun') {
                const flags = b.readUInt32BE(s.off + 8) & 0xffffff, n = b.readUInt32BE(s.off + 12);
                let p = s.off + 16, cts = base;
                if (flags & 0x1) p += 4; if (flags & 0x4) p += 4;
                for (let i = 0; i < n; i++) {
                  let dur = 0; if (flags & 0x100) { dur = b.readUInt32BE(p); p += 4; }
                  let cto = 0; if (flags & 0x200) { cto = b.readInt32BE(p); p += 4; }
                  const m = cts + cto; minCTS = Math.min(minCTS, m); maxFin = Math.max(maxFin, m + dur); cts += dur; muestras++;
                }
              }
            }
          }
        }
        if (['moov', 'trak', 'mdia', 'minf', 'stbl'].indexOf(c.tipo) >= 0) walk(c.off + c.hdr, c.off + c.size);
      }
    };
    walk(0, b.length);
    return { bytes: b.length, mb: +(b.length / 1048576).toFixed(1), muestras, durSegs: timescale ? +((maxFin - minCTS) / timescale).toFixed(1) : null };
  } catch (e) { return { error: String(e && e.message || e) }; }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const res = { tarea: 'KIMI-178', etiqueta: ETIQUETA, video: NOMBRE + '.mp4', pantalla: '1920x1080@DPR1 GPU real', topeSegs: TOPE_SEGS };
  const watch = setInterval(() => { try { guardar(res); } catch (e) { } }, 5000);
  let ses = null;
  try {
    log('navegando al juego (v18on en semilla, enlace principal)...');
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: RAF_LIMIT_JS }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real` }, ses);
    const t0 = Date.now(); let listo = false;
    while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
      await cdp.bombear(0.5);
    }
    if (!listo) throw new Error('el juego no arrancó');
    const ent = await evaluar(cdp, ses, ENTRAR_JS, 150);
    if (!/^ok/.test(ent)) throw new Error('entrada: ' + ent);
    const prep = await evaluar(cdp, ses, PREP_JS, 180);
    if (!/^\{/.test(prep)) throw new Error('prep: ' + prep);
    res.sitios = JSON.parse(prep);
    log('sitios: ' + prep);
    res.head = await evaluar(cdp, ses, `(() => { try { return (AV.G.build && (AV.G.build.commit || AV.G.build.id)) || 'desconocido'; } catch (e) { return 'desconocido'; } })()`, 10, false);

    await dormir(2);
    await evaluar(cdp, ses, `window.__recBits = 1200000`, 10, false);
    res.mime = await evaluar(cdp, ses, REC_JS, 20, false);
    if (!res.mime || res.mime.indexOf('ERR') === 0) throw new Error('recorder: ' + res.mime);
    log('grabando (' + res.mime + ')...');

    const tRec0 = Date.now();
    await evaluar(cdp, ses, `window.__rec.empieza()`, 15, false);
    await segVilla(cdp, ses, res);
    await segGolf(cdp, ses, res, res.sitios);
    await segDuelo(cdp, ses, res, res.sitios);
    await segPuente(cdp, ses, res, res.sitios);
    await segPuerto(cdp, ses, res, res.sitios);
    await segChispa(cdp, ses, res, res.sitios);
    await segOutro(cdp, ses, res);
    res.recorridoSegs = +((Date.now() - tRec0) / 1000).toFixed(1);

    res.grabacion = await evaluar(cdp, ses, `window.__rec.para(${JSON.stringify(NOMBRE + '.mp4')})`, 90);
    log('grabación: ' + JSON.stringify(res.grabacion));
    res.recLog = await evaluar(cdp, ses, `(window.__recLog || []).slice(0, 40)`, 15);
    res.erroresConsola = await evaluar(cdp, ses, `(window.__erroresConsola || []).slice(0, 30)`, 15);
    log('errores de consola: ' + JSON.stringify(res.erroresConsola));
    const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 60000);
    fs.writeFileSync(path.join(SALIDA, NOMBRE + '_ref.jpg'), Buffer.from(shot.data, 'base64'));

    // verificación de la línea de tiempo: los bytes del fMP4 (Chrome escribe mvhd=0 en headless;
    // la duración real está en los trun: se parsea aquí en vez de fiarse de un <video> por http,
    // que sin soporte de Range en el servidor reporta una duración falsa)
    const ruta = path.join(SALIDA, NOMBRE + '.mp4');
    res.mp4 = mp4Info(ruta);
  } catch (e) {
    res.fallo = String(e && e.message || e);
    log('FALLO: ' + res.fallo);
    try { if (ses) await evaluar(cdp, ses, `window.__rec && window.__rec.para(${JSON.stringify(NOMBRE + '.mp4')})`, 60); } catch (e2) { }
  } finally {
    clearInterval(watch);
    guardar(res);
    try { chrome.kill(); } catch (e) { }
    mataPorPerfil();
    try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
    srv.close();
    setTimeout(() => process.exit(res.fallo ? 1 : 0), 500);
  }
})();
