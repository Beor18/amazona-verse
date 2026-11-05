#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — BUG-QA81: traza fina del check «Posarse» de movementTest.
   Réplica exacta del tramo rama/suelo de src/pruebas/movimiento.js (líneas ~384-422) con volcado por cuadro
   (flying/grounded/y/groundY/speed/posa.aire/posa.n/posa.landN/posa.red/hist) para ver cuál condición falla
   cuando la red de apoyo no dispara bajo contención. Mismo perfil que el harness: iPhone 375×812 dpr 3,
   CPU ×4, partida sembrada sin creador.
   Uso: node tools/build/kimi2_posa.js [--rondas 3]
   Salida: consola + tools/build/salida/kimi2-posa/traza-<ronda>.json
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const RONDAS = parseInt(arg('--rondas', '3'), 10);
const TRAS = process.argv.includes('--tras-movement'); // correr movementTest antes (estado previo real de la batería)
const ANCHO = 375, ALTO = 812, DPR = 3, CPU = 4;
const SALIDA = path.join(AQUI, 'salida', 'kimi2-posa');
fs.mkdirSync(SALIDA, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  const QA_TAG = '<script src="tests/qa/qa.js" charset="utf-8"></script>';
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    const qa = /[?&]qa=1(?:&|$)/.test(req.url);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); return res.end('404'); }
      if (qa && /index\.html$/.test(f)) d = Buffer.from(d.toString('utf8').replace(/<meta charset[^>]*>/i, m => m + QA_TAG), 'utf8');
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(d);
    });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onclose = () => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: cerrada')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(m, p, s, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: m, params: p || {}, sessionId: s })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + m)); } }, t); }); }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function ev(cdp, ses, exp, t, aw) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, returnByValue: true, awaitPromise: aw !== false }, ses, (t || 30) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 400));
  return r.result ? r.result.value : undefined;
}

const SEMILLA_SAVE_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi2posa-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;

// Preparar del flujo CON semilla (igual que kimi2_empezar.js): Jugar entra directo; si el creador apareció, se cierra.
const PREPARAR_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene el botón Jugar'; b.click();
    if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta tras Jugar'; }
  const cr = $('creator');
  if (cr && !cr.hidden) { await espera(() => $('p-stage-status') && $('p-stage-status').hidden, 30000); const s = $('p-save'); if (!s) return 'el creador no tiene Empezar (#p-save)';
    s.click(); if (!await espera(() => cr.hidden, 8000)) return 'Empezar no cerró el creador: ' + (($('p-error') && !$('p-error').hidden && $('p-error').textContent) || 'sin mensaje'); }
  const S = window.AV && window.AV.state; if (!S || !S.profile || !S.profile.created) return 'sin perfil creado tras entrar';
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(30000);
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 20000);
  return 'ok: partida sembrada → Jugar (' + S.profile.name + ')'; })()`;

// Traza: replica el tramo rama/suelo con volcado por cuadro. sync3D corre 2× por animV (evento render + llamada
// explícita del test): se registra también cuántas veces corrió sync3D por cuadro para detectar doble evaluación.
const TRAZA_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
  const F = G.fisica, M = F.MOVE, I = G.input, K = I.keys, SO = G.solidos, P3 = G.actores.player3D ? G.actores : null;
  const DT = 1 / 60;
  if (${TRAS}) { try { await AV.movementTest(); } catch (e) {} await sleep(500); }
  const r2 = v => Math.round(v * 100) / 100;
  const frame = (fn, n) => { const out = []; for (let i = 0; i < (n || 1); i++) { if (fn) fn(i); G.renderer.update(DT); out.push({ x: S.pos.x, y: S.pos.y, z: S.pos.z, vy: S.vy, sp: M.speed, g: M.groundY, fly: M.flying, sw: !!M.swimming, gr: M.grounded }); } return out; };
  const animV = n => { for (let i = 0; i < n; i++) { const mv = G.renderer.update(DT); G.actores.sync3D(DT, mv, false); } };
  const reset = (x, z) => { K.clear(); I.stick.x = I.stick.y = 0; I.jumpHeld = false; M.vx = M.vz = 0; M.dashT = 0; M.swimming = false; const y = F.suelo(x, z, G.terreno.height(x, z) + 0.4); S.pos.x = x; S.pos.z = z; S.pos.y = y; S.vy = 0; M.flying = false; M.grounded = true; M.wasAir = false; G.camara.yaw = 0; };
  // contador de corridas de sync3D por cuadro (se instala antes del tramo)
  let syncPorCuadro = 0; const syncOrig = G.actores.sync3D;
  // buscar la rama igual que movementTest
  const ACT = G.mundo && G.mundo.activos; if (!SO || !SO.activo || !ACT || !Object.keys(ACT).length) return JSON.stringify({ error: 'sin solidos/activos' });
  SO.terminar();
  const altoCerca = (x, z, r) => { let b = null; for (let dz = -r; dz <= r; dz += 0.3) for (let dx = -r; dx <= r; dx += 0.3) { const t = SO.altoEn(x + dx, z + dz, 1e4); if (t > -Infinity && (!b || t > b.t)) b = { x: x + dx, z: z + dz, t }; } return b; };
  const L = { x: S.pos.x, z: S.pos.z };
  const V = G.vegetacion, arboles = [];
  for (const m in (V && V.instancias) || {}) {
    if (!/tabonuco|ceiba|flamboyan|yagrumo|arbol_enano/.test(m)) continue;
    const P = V.instancias[m];
    for (let i = 0; i < P.n; i++) arboles.push({ x: P.pos[i * 4], y: P.pos[i * 4 + 1], z: P.pos[i * 4 + 2], d: Math.hypot(P.pos[i * 4] - L.x, P.pos[i * 4 + 2] - L.z), m });
  }
  arboles.sort((a, b) => a.d - b.d);
  let rama = null, arbol = null;
  for (const t of arboles.slice(0, 10)) {
    reset(t.x + 5, t.z); SO.terminar();
    for (let dz = -4; dz <= 4; dz += 0.3) for (let dx = -4; dx <= 4; dx += 0.3) {
      const x = t.x + dx, z = t.z + dz; if (Math.hypot(dx, dz) < 1) continue;
      const g = SO.altoEn(x, z, t.y + 10), hg = g - G.terreno.height(x, z); if (!(hg > 1.5 && hg < 8) || !SO.fino(x, z, g + 0.01)) continue;
      if (!rama || Math.abs(hg - 3.5) < Math.abs(rama.hg - 3.5)) rama = { x, z, g, hg };
    }
    if (rama) { arbol = t; break; }
  }
  if (!rama) return JSON.stringify({ error: 'sin rama' });
  const H = (x, z) => G.terreno.height(x, z);
  // aterrizarEn con traza: guarda el estado de posa TRAS cada cuadro
  const aterrizarEnT = (x, z, y, conAnim) => {
    K.clear(); I.stick.x = I.stick.y = 0; I.jumpHeld = false; M.vx = M.vz = 0; M.dashT = 0; M.swimming = false;
    S.pos.x = x; S.pos.z = z; S.pos.y = y; S.vy = 0; M.wasAir = true; M.flying = true; M.grounded = false; F.land();
    const tr = []; let n = 0;
    while (M.flying && n++ < 900) {
      if (conAnim) animV(1); else frame();
      const ps = G.actores.posa;
      tr.push({ n, fly: M.flying ? 1 : 0, gr: M.grounded ? 1 : 0, sw: M.swimming ? 1 : 0, y: r2(S.pos.y), gy: r2(M.groundY), sp: r2(M.speed || 0), aire: ps.aire ? 1 : 0, pn: ps.n, landN: ps.landN, pt: r2(ps.t), red: ps.red || 0, posado: M.posado || '', que: (SO.que(S.pos.x, S.pos.z, S.pos.y + 0.01) || '') });
    }
    SO.terminar();
    return { cuadros: n, volando: !!M.flying, posado: M.posado || '', que: SO.que(S.pos.x, S.pos.z, S.pos.y + 0.01) || '', altoSobreTerreno: r2(S.pos.y - H(S.pos.x, S.pos.z)), tr: tr.slice(-30) };
  };
  const gestoTrasT = n0 => { const tr = []; for (let i = 0; i < 40; i++) { animV(1); const ps = G.actores.posa; tr.push({ i, gr: M.grounded ? 1 : 0, sp: r2(M.speed || 0), aire: ps.aire ? 1 : 0, pn: ps.n, landN: ps.landN, pt: r2(ps.t), red: ps.red || 0, posado: M.posado || '' }); } const ps = G.actores.posa; return { gestos: ps.n - n0, tipo: ps.tipo, red: ps.red || 0, tr: tr.filter((t, ix) => ix < 6 || t.pn !== tr[ix - 1].pn || t.red !== tr[ix - 1].red || t.landN !== tr[ix - 1].landN).slice(-24) }; };
  const out = { rama: { x: r2(rama.x), z: r2(rama.z), g: r2(rama.g), hg: r2(rama.hg), arbol: arbol.m } };
  // 1) aterrizaje sin anim (como la comprobación «Se posa en una rama»)
  out.atrRama0 = aterrizarEnT(rama.x, rama.z, rama.g + 2, false);
  frame(null, 60);
  // 2) gesto: aterrizaje con anim + 40 cuadros de observación
  let n0 = G.actores.posa.n;
  out.atrRamaAnim = aterrizarEnT(rama.x, rama.z, rama.g + 2, true);
  out.enRama = gestoTrasT(n0);
  out.posadoRama = M.posado;
  // 3) suelo llano
  reset(L.x, L.z); n0 = G.actores.posa.n;
  out.atrSuelo = aterrizarEnT(L.x, L.z, S.pos.y + 3.5, true);
  out.enSuelo = gestoTrasT(n0);
  out.posaFinal = { n: G.actores.posa.n, landN: G.actores.posa.landN, red: G.actores.posa.red || 0, hist: (G.actores.posa.hist || []).slice(-10) };
  return JSON.stringify(out); })()`;

async function lanzar() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2posa-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', `--window-size=${ANCHO},${ALTO}`];
  const c = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let e0 = null; c.on('error', e => { e0 = e; });
  const pf = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { c, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    if (e0) throw new Error('spawn: ' + e0.message);
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('sin DevToolsActivePort');
}

(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const { c, perf, puerto: pd, wsPath } = await lanzar();
  const ws = new WebSocket(`ws://127.0.0.1:${pd}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  console.log(`· kimi2_posa · ${ANCHO}×${ALTO} dpr ${DPR} · CPU ×${CPU} · GPU real · ${RONDAS} rondas`);
  let caidas = 0;
  for (let r = 1; r <= RONDAS; r++) {
    let ses;
    try {
      const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
      ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
      for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
      await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
      await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
      await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true }, ses);
      await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
      await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
      await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1` }, ses);
      const t0 = Date.now(); let listo = false;
      while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { } await cdp.bombear(0.5); }
      if (!listo) { console.log(`· r${r}: no arrancó`); continue; }
      const prep = await ev(cdp, ses, PREPARAR_JS, 240);
      if (!String(prep).startsWith('ok')) { console.log(`· r${r}: preparar falló: ${prep}`); continue; }
      await ev(cdp, ses, `(async () => { const b = document.getElementById('c1-saltar'); if (b && b.isConnected) b.click(); await new Promise(r => setTimeout(r, 1500)); return 1; })()`, 40);
      const raw = await ev(cdp, ses, TRAZA_JS, 300);
      const out = JSON.parse(raw);
      const f = path.join(SALIDA, `traza-r${r}.json`);
      fs.writeFileSync(f, JSON.stringify(out, null, 1));
      const okR = out.enRama && out.enRama.gestos === 1;
      console.log(`· r${r}: atrRamaAnim.cuadros=${out.atrRamaAnim && out.atrRamaAnim.cuadros} enRama.gestos=${out.enRama && out.enRama.gestos} red=${out.posaFinal && out.posaFinal.red} posadoRama=${out.posadoRama} suelo.gestos=${out.enSuelo && out.enSuelo.gestos} → ${out.error || (okR ? 'OK' : 'FALLO')} → ${f}`);
      if (!okR && !out.error) {
        const tr = out.atrRamaAnim.tr || [];
        console.log('   traza aterrizaje rama (últimos cuadros):');
        for (const t of tr.slice(-8)) console.log(`     n=${t.n} fly=${t.fly} gr=${t.gr} y=${t.y} gy=${t.gy} sp=${t.sp} aire=${t.aire} pn=${t.pn} landN=${t.landN} pt=${t.pt} red=${t.red} posado=${t.posado} que=${t.que}`);
        const gt = (out.enRama.tr || []).slice(-14);
        console.log('   gestoTras (cambios):');
        for (const t of gt) console.log(`     i=${t.i} gr=${t.gr} sp=${t.sp} aire=${t.aire} pn=${t.pn} landN=${t.landN} pt=${t.pt} red=${t.red} posado=${t.posado}`);
      }
    } catch (e) { console.log(`· r${r}: ERROR ${e.message}`); caidas++; }
    try { if (ses) await cdp.call('Target.closeTarget', {}, ses, 5000); } catch (e) { }
  }
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { try { c.kill(); } catch (e2) { } }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close(); process.exit(caidas ? 2 : 0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(2); });
