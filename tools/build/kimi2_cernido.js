#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — BUG-QA81 · quedante «Cernido»: traza fina del check
   «Cernido: sin tocar nada se queda en el sitio (no cae)» de src/pruebas/movimiento.js.
   Réplica exacta del tramo (sitio → reset → despegue 60 cuadros → cernido 120 cuadros) con volcado
   por cuadro (y/vy/techoVuelo/groundY/perchY/landing/takeoff/speed/keys/jumpHeld/busy) para ver QUÉ
   fuerza la deriva (≥0,3 m roja; los fallos reales dieron 4,96–5,11 m en 2 s con M.flying cierto).
   Hipótesis a discriminar: viento de techo (y>lim → want=-vientoV), landing stuck (want=-landV),
   tecla/palo stuck (planeo con hSpeed), o paso de física con dt anómalo bajo contención.
   Mismo perfil que el harness: iPhone 375×812 dpr 3, CPU ×4, partida sembrada sin creador.
   Uso: node tools/build/kimi2_cernido.js [--rondas 2] [--iters 10] [--hogs 2] [--tras-movement]
   Salida: consola + tools/build/salida/kimi2-cernido/traza-r<ronda>.json
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
const RONDAS = parseInt(arg('--rondas', '2'), 10);
const ITERS = parseInt(arg('--iters', '10'), 10);
const NHOGS = parseInt(arg('--hogs', '2'), 10);
const TRAS = process.argv.includes('--tras-movement');
const REAL = process.argv.includes('--real'); // correr movementTest de verdad: si cae «Cernido», traza la réplica en caliente
const ANCHO = 375, ALTO = 812, DPR = 3, CPU = 4;
const SALIDA = path.join(AQUI, 'salida', 'kimi2-cernido');
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
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi2cernido-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;

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

// Traza: réplica exacta del tramo cernido de src/pruebas/movimiento.js (sitio → reset → despegue → 120 cuadros)
// con volcado por cuadro. ITERS iteraciones por página (cada una en el sitio del test; el sitio depende del
// estado de rasterización, que es lo que varía bajo contención).
const TRAZA_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
  const F = G.fisica, M = F.MOVE, I = G.input, K = I.keys, H = G.terreno.height, SO = G.solidos;
  const DT = 1 / 60, r2 = v => Math.round(v * 100) / 100;
  if (${TRAS}) { try { await AV.movementTest(); } catch (e) {} await sleep(500); }
  if (G.mundo && G.mundo.listo && G.mundo.listo.then) await G.mundo.listo;
  if (SO && SO.activo) SO.terminar();
  const $ = G.util.$; for (const id of ['creator', 'comic', 'end']) { const e = $(id); if (e && !e.hidden) e.hidden = true; }
  if (G.dialogo.open()) G.dialogo.clear(); if (G.ui.cardOpen) G.ui.hideCard();
  Object.assign(M, { flying: false, landing: false, takeoff: 0, swimming: false, dashT: 0, dashCd: 0, jumping: false, buffer: 0, land: 0, vx: 0, vz: 0 });
  S.vy = 0; G.camara.yaw = G.pack.jugador && G.pack.jugador.camara != null ? G.pack.jugador.camara : 0.35; G.quiet = true;
  G.camara.CAM.lazy = G.camara.CAM.lazyFly = 0;
  const frame = (fn, n) => { const out = []; for (let i = 0; i < (n || 1); i++) { if (fn) fn(i); G.renderer.update(DT); out.push({ x: S.pos.x, y: S.pos.y, z: S.pos.z, vy: S.vy, sp: M.speed, g: M.groundY, fly: M.flying, sw: !!M.swimming, gr: M.grounded }); } return out; };
  const reset = (x, z, y) => { K.clear(); I.stick.x = I.stick.y = 0; I.jumpHeld = false; F.endFlight(); M.flying = false; M.vx = M.vz = 0; M.dashT = M.dashCd = 0; M.buffer = 0; M.swimming = false; S.pos.x = x; S.pos.z = z; S.pos.y = y != null ? y : F.suelo(x, z, H(x, z) + 0.5); S.vy = 0; M.grounded = true; M.wasAir = false; if (SO && SO.activo) SO.terminar(); frame(null, 20); };
  // sitio: réplica de movementTest.sitio (mismos rechazos: agua, colliders, perchas, troncos, techo bajo)
  const troncos = (() => { const t = []; const V = G.vegetacion, P = V && V.instancias, inf = V && V.info;
    if (P && inf) for (const m in P) { const q = P[m], d = inf[m]; if (!q || !d || !(d.tronco >= 0.08)) continue; for (let i = 0; i < q.n; i++) t.push([q.pos[i * 4], q.pos[i * 4 + 2]]); }
    return t; })();
  function sitio() {
    const c = G.pack.jugador && G.pack.jugador.aparicion || S.pos;
    let best = null;
    for (let rr = 0; rr <= 120; rr += 6) for (let a = 0; a < (rr ? 16 : 1); a++) {
      const x = c.x + Math.cos(a / 16 * Math.PI * 2) * rr, z = c.z + Math.sin(a / 16 * Math.PI * 2) * rr;
      if (Math.abs(x) > G.terreno.WORLD - 14 || Math.abs(z) > G.terreno.WORLD - 14) continue;
      let mx = -1e9, mn = 1e9;
      for (let b = 0; b < 8; b++) for (const d of [3, 7, 11]) { const h = H(x + Math.cos(b) * d, z + Math.sin(b) * d); mx = Math.max(mx, h); mn = Math.min(mn, h); }
      if (G.agua.levelAt(x, z) > H(x, z) - 0.5) continue;
      if ([10, 20, 30].some(d => [0, 1, 2, 3, 4, 5, 6, 7].some(b => { const ax = x + Math.cos(b * Math.PI / 4) * d, az = z + Math.sin(b * Math.PI / 4) * d; return G.agua.levelAt(ax, az) > H(ax, az) - 0.3; }))) continue;
      if (F.colliders.some(k => k.r > 0 && (!k.when || k.when()) && Math.hypot(k.x - x, k.z - z) < 12 + (k.r || 0) + Math.max(k.hx || 0, k.hz || 0))) continue;
      if (F.perchas.some(p => Math.hypot(p.x - x, p.z - z) < 12 + p.r)) continue;
      if (troncos.some(t => Math.abs(t[0] - x) < 8 && Math.abs(t[1] - z) < 8 && Math.hypot(t[0] - x, t[1] - z) < 8)) continue;
      if (SO && SO.activo && SO.libre(x, z, H(x, z) + 0.5, 3) < 14) continue;
      if (!best || mx - mn < best.d) best = { x, z, d: mx - mn };
      if (best.d < 0.6) return best;
    }
    return best || { x: c.x, z: c.z };
  }
  if (SO && SO.activo) SO.terminar();
  const replica = async () => {
    if (SO && SO.activo) SO.terminar();
    const L = sitio();
    const outs = [];
    for (let it = 0; it < ${ITERS}; it++) {
      reset(L.x, L.z);
      const y0 = S.pos.y;
      F.toggleFly();
      frame(null, 60); // despegue (impulso takeoffTime 0,45 s ya consumido)
      const tr = [];
      for (let i = 0; i < 120; i++) {
        G.renderer.update(DT);
        tr.push({ i, y: r2(S.pos.y), vy: r2(S.vy), lim: r2(M.techoVuelo || 0), gy: r2(M.groundY), percha: M.perchY > -1e8 ? r2(M.perchY) : null, land: M.landing ? 1 : 0, take: r2(M.takeoff || 0), sp: r2(M.speed), fly: M.flying ? 1 : 0, gr: M.grounded ? 1 : 0, sw: M.swimming ? 1 : 0, nk: K ? K.size : 0, jh: I.jumpHeld ? 1 : 0, busy: G.ui.busy() ? 1 : 0 });
      }
      const deriva = r2(Math.abs(tr[tr.length - 1].y - tr[0].y));
      outs.push({ it, alto: r2(S.pos.y - y0), deriva, fly: tr[tr.length - 1].fly, vyMin: Math.min(...tr.map(t => t.vy)), vyMax: Math.max(...tr.map(t => t.vy)), lim: tr[tr.length - 1].lim, gy: tr[tr.length - 1].gy, land: tr.some(t => t.land), tr: deriva >= 0.3 ? tr : null });
    }
    return { L: { x: r2(L.x), z: r2(L.z) }, outs };
  };
  if (${REAL}) {
    let res;
    try { res = await AV.movementTest(); } catch (e) { return JSON.stringify({ real: true, error: 'movementTest: ' + (e && e.message || e) }); }
    const cer = (res.results || []).find(r => /Cernido/.test(r.name || '')) || null;
    const out = { real: true, passed: res.passed, total: res.total, mal: (res.results || []).filter(r => !r.ok).map(r => (r.name || '').slice(0, 90)), cernido: cer, met: (res.metricas || {}).cernido || null, deriva: (res.metricas || {}).cernidoDeriva };
    if (cer && !cer.ok) out.replica = await replica(); // traza en caliente tras el fallo real
    return JSON.stringify(out);
  }
  const rep = await replica();
  return JSON.stringify({ L: rep.L, tras: ${TRAS}, outs: rep.outs });
})()`;

async function lanzar() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2cernido-'));
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

// Hogs CPU: procesos node ocupados (contención acotada, igual que la repro de «Posarse»)
function hogs(n) { const hs = []; for (let i = 0; i < n; i++) hs.push(spawn(process.execPath, ['-e', 'while(true){for(let j=0;j<1e7;j++)Math.sqrt(j)}'], { stdio: 'ignore' })); return hs; }

(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const { c, perf, puerto: pd, wsPath } = await lanzar();
  const ws = new WebSocket(`ws://127.0.0.1:${pd}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  console.log(`· kimi2_cernido · ${ANCHO}×${ALTO} dpr ${DPR} · CPU ×${CPU} · GPU real · ${RONDAS} rondas × ${ITERS} iters · hogs ${NHOGS} · tras ${TRAS}`);
  let fallos = 0, caidas = 0; const hs = hogs(NHOGS);
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
      const raw = await ev(cdp, ses, TRAZA_JS, 900);
      const out = JSON.parse(raw);
      const f = path.join(SALIDA, `traza-r${r}.json`);
      fs.writeFileSync(f, JSON.stringify(out, null, 1));
      if (out.real) {
        const cerFallo = out.cernido && !out.cernido.ok;
        if (cerFallo) fallos++;
        console.log(`· r${r}: REAL movementTest ${out.passed}/${out.total} · cernido ok=${out.cernido && out.cernido.ok} deriva=${out.deriva} m · met=${JSON.stringify(out.met)}${out.error ? ' · error=' + out.error : ''} → ${f}`);
        if (cerFallo && out.replica) {
          const malas = out.replica.outs.filter(o => o.deriva >= 0.3);
          console.log(`   réplica en caliente: L=(${out.replica.L.x},${out.replica.L.z}) fallos=${malas.length}/${out.replica.outs.length}`);
          for (const m of malas.slice(0, 2)) {
            console.log(`   FALLO it=${m.it} deriva=${m.deriva} m alto=${m.alto} vyMin=${m.vyMin} vyMax=${m.vyMax} lim=${m.lim} gy=${m.gy} land=${m.land} fly=${m.fly}`);
            for (const t of (m.tr || []).filter((t, ix) => ix < 4 || ix % 10 === 0 || Math.abs(t.vy) > 0.2)) console.log(`     i=${t.i} y=${t.y} vy=${t.vy} lim=${t.lim} gy=${t.gy} percha=${t.percha} land=${t.land} take=${t.take} sp=${t.sp} fly=${t.fly} gr=${t.gr} sw=${t.sw} nk=${t.nk} jh=${t.jh} busy=${t.busy}`);
          }
        }
      } else {
        const malas = out.outs.filter(o => o.deriva >= 0.3);
        fallos += malas.length;
        console.log(`· r${r}: L=(${out.L.x},${out.L.z}) iters=${out.outs.length} fallos=${malas.length} deriva max=${Math.max(...out.outs.map(o => o.deriva))} m → ${f}`);
        for (const m of malas.slice(0, 2)) {
          console.log(`   FALLO it=${m.it} deriva=${m.deriva} m alto=${m.alto} vyMin=${m.vyMin} vyMax=${m.vyMax} lim=${m.lim} gy=${m.gy} land=${m.land} fly=${m.fly}`);
          for (const t of (m.tr || []).filter((t, ix) => ix < 4 || ix % 10 === 0 || Math.abs(t.vy) > 0.2)) console.log(`     i=${t.i} y=${t.y} vy=${t.vy} lim=${t.lim} gy=${t.gy} percha=${t.percha} land=${t.land} take=${t.take} sp=${t.sp} fly=${t.fly} gr=${t.gr} sw=${t.sw} nk=${t.nk} jh=${t.jh} busy=${t.busy}`);
        }
      }
    } catch (e) { console.log(`· r${r}: ERROR ${e.message}`); caidas++; }
    try { if (ses) await cdp.call('Target.closeTarget', {}, ses, 5000); } catch (e) { }
  }
  for (const h of hs) { try { h.kill(); } catch (e) { } }
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { try { c.kill(); } catch (e2) { } }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close();
  console.log(`· resumen: fallos=${fallos} caidas=${caidas} → ${fallos ? 'REPRODUCIDO' : 'no reprodujo'}`);
  process.exit(caidas ? 2 : 0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(2); });
