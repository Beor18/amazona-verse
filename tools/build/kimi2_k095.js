#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-095 · traza del check de movementTest
   «Espacio sube aunque un botón del HUD tenga el foco (tras un clic en el Diario)»,
   el flake «sin dueño» de BUGS.md § «Windows + GPU (3-nov)» (falló una vez en Windows
   con GPU; BM135 no lo reprodujo en Mac; con PC libre ha salido verde siempre).

   Réplica exacta del tramo (movimiento.js §9a: reset → toggleFly → 40 cuadros → focus
   b-diary → keydown Space → {sube, sueltaFoco} → 30 cuadros → {subeM} → keyup), con
   variantes causales que inyectan cada hipótesis y graban la FIRMA (qué sub-condición
   cae) para poder atribuir el fallo histórico cuando vuelva a pasar:
     base   — nada extra (la realidad del test)
     blur   — window blur justo tras el keydown (teoría: el OS roba el foco bajo
              contención; soltarTodo pone jumpHeld=false → subeM≈0)
     tab    — keydown Tab previo (teoría: conTab pegajoso → botonDelHud=falso →
              return temprano: sube=falso y sueltaFoco=falso)
     pausa  — menú de pausa abierto (teoría: paused() corta antes de jumpHeld:
              sueltaFoco=cierto, sube=falso)
   Firma del check: pasa ⇔ sube && sueltaFoco && subeM>0,5 && !jumpHeld tras keyup.

   Mismo perfil que el harness: iPhone 375×812 dpr 3, CPU ×4, GPU real, partida sembrada.
   Uso: node tools/build/kimi2_k095.js [--rondas 2] [--iters 12] [--hogs 0]
   Salida: consola + tools/build/salida/kimi2-k095/sonda-r<ronda>.json
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
const ITERS = parseInt(arg('--iters', '12'), 10);
const NHOGS = parseInt(arg('--hogs', '0'), 10);
const ANCHO = 375, ALTO = 812, DPR = 3, CPU = 4;
const SALIDA = arg('--salida', path.join(AQUI, 'salida', 'kimi2-k095'));
fs.mkdirSync(SALIDA, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  const QA_TAG = '<script>window.AVQA_OPTS=Object.assign(window.AVQA_OPTS||{},{autorun:false});</script><script src="tests/qa/qa.js" charset="utf-8"></script>';
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
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi2k095-' + Math.random().toString(36).slice(2, 10),
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
    s.click(); if (!await espera(() => cr.hidden, 8000)) return 'Empezar no cerró el creador'; }
  const S = window.AV && window.AV.state; if (!S || !S.profile || !S.profile.created) return 'sin perfil creado tras entrar';
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(30000);
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 20000);
  return 'ok'; })()`;

// Réplica del tramo §9a con variantes causales. Cada iteración: reset → toggleFly → 40 cuadros
// → (variante) → focus b-diary → keydown Space → lee {sube, sueltaFoco} → 30 cuadros → keyup →
// {subeM, jumpHeldTras, focoTras}. Devuelve por variante la lista de iteraciones.
const SONDA_JS = `(async () => { const AV = window.AV, G = AV.G, S = G.S;
  const F = G.fisica, M = F.MOVE, I = G.input, K = I.keys, H = G.terreno.height, SO = G.solidos;
  const DT = 1 / 60, r2 = v => Math.round(v * 100) / 100;
  if (G.mundo && G.mundo.listo && G.mundo.listo.then) await G.mundo.listo;
  if (SO && SO.activo) SO.terminar();
  const $ = G.util.$; for (const id of ['creator', 'comic', 'end']) { const e = $(id); if (e && !e.hidden) e.hidden = true; }
  if (G.dialogo.open()) G.dialogo.clear(); if (G.ui.cardOpen) G.ui.hideCard();
  Object.assign(M, { flying: false, landing: false, takeoff: 0, swimming: false, dashT: 0, dashCd: 0, jumping: false, buffer: 0, land: 0, vx: 0, vz: 0 });
  S.vy = 0; G.camara.yaw = G.pack.jugador && G.pack.jugador.camara != null ? G.pack.jugador.camara : 0.35; G.quiet = true;
  G.camara.CAM.lazy = G.camara.CAM.lazyFly = 0;
  const frame = (fn, n) => { for (let i = 0; i < (n || 1); i++) { if (fn) fn(i); G.renderer.update(DT); } };
  const reset = (x, z, y) => { K.clear(); I.stick.x = I.stick.y = 0; I.jumpHeld = false; F.endFlight(); M.flying = false; M.vx = M.vz = 0; M.dashT = M.dashCd = 0; M.buffer = 0; M.swimming = false; S.pos.x = x; S.pos.z = z; S.pos.y = y != null ? y : F.suelo(x, z, H(x, z) + 0.5); S.vy = 0; M.grounded = true; M.wasAir = false; if (SO && SO.activo) SO.terminar(); frame(null, 20); };
  const bd = $('b-diary');
  if (!bd) return JSON.stringify({ error: 'no hay #b-diary' });
  const VARIANTES = ['base', 'blur', 'tab', 'pausa'];
  // Enfoque por iteración: focus real al botón y eventos sintéticos con bubbles como el test.
  const una = (variante) => {
    reset(S.pos.x, S.pos.z);
    F.toggleFly(); frame(null, 40);
    if (variante === 'tab') window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    if (variante === 'pausa') { const bm = $('b-menu'); if (bm) bm.click(); frame(null, 2); }
    bd.focus();
    const focoAntes = document.activeElement === bd;
    bd.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    if (variante === 'blur') window.dispatchEvent(new FocusEvent('blur'));
    const sube = I.jumpHeld, suelta = document.activeElement !== bd, ya = S.pos.y;
    frame(null, 30);
    bd.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
    const o = { sube, sueltaFoco: suelta, subeM: r2(S.pos.y - ya), jumpHeldTras: I.jumpHeld,
      focoAntes, focoTras: (document.activeElement && (document.activeElement.id || document.activeElement.tagName)) || 'none',
      pausaAbierta: !!(G.pausa && G.pausa.activa()) };
    if (variante === 'pausa') { const p = $('pause'); if (p && p.hide) p.hide(); frame(null, 2); }
    if (variante === 'tab') { I.stick.x = I.stick.y = 0; window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); }
    return o;
  };
  const out = {};
  for (const v of VARIANTES) {
    const lista = [];
    for (let i = 0; i < ${ITERS}; i++) { try { lista.push(una(v)); } catch (e) { lista.push({ error: String(e && e.message || e) }); } }
    out[v] = lista;
  }
  // firma de fallo: sube=falso / sueltaFoco=falso / subeM<=0,5 / jumpHeldTras
  const falla = o => !o.error && !(o.sube && o.sueltaFoco && o.subeM > 0.5 && !o.jumpHeldTras);
  const resumen = {};
  for (const v of VARIANTES) resumen[v] = { n: out[v].length, fallos: out[v].filter(falla).length };
  return JSON.stringify({ resumen, out });
})()`;

async function lanzar() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2k095-'));
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

function hogs(n) { const hs = []; for (let i = 0; i < n; i++) hs.push(spawn(process.execPath, ['-e', 'while(true){for(let j=0;j<1e7;j++)Math.sqrt(j)}'], { stdio: 'ignore' })); return hs; }

(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const { c, perf, puerto: pd, wsPath } = await lanzar();
  const ws = new WebSocket(`ws://127.0.0.1:${pd}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  console.log(`· kimi2_k095 · ${ANCHO}×${ALTO} dpr ${DPR} · CPU ×${CPU} · GPU real · ${RONDAS} rondas × ${ITERS} iters × 4 variantes · hogs ${NHOGS}`);
  const hs = hogs(NHOGS);
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
      if (String(prep) !== 'ok') { console.log(`· r${r}: preparar falló: ${prep}`); continue; }
      await ev(cdp, ses, `(async () => { const b = document.getElementById('c1-saltar'); if (b && b.isConnected) b.click(); await new Promise(r => setTimeout(r, 1500)); return 1; })()`, 40);
      const raw = await ev(cdp, ses, SONDA_JS, 600);
      const out = JSON.parse(raw);
      const f = path.join(SALIDA, `sonda-r${r}.json`);
      fs.writeFileSync(f, JSON.stringify(out, null, 1));
      console.log(`· r${r}: ${JSON.stringify(out.resumen)} → ${f}`);
      for (const v of Object.keys(out.out || {})) {
        const fallas = out.out[v].filter(o => !o.error && !(o.sube && o.sueltaFoco && o.subeM > 0.5 && !o.jumpHeldTras));
        const ej = fallas[0];
        if (ej) console.log(`   ${v}: FIRMA ${JSON.stringify(ej)}${fallas.length > 1 ? ` (×${fallas.length})` : ''}`);
        else { const ok0 = out.out[v][0]; console.log(`   ${v}: 0 fallos · ej=${JSON.stringify(ok0)}`); }
      }
    } catch (e) { console.log(`· r${r}: ERROR ${e.message}`); caidas++; }
    try { if (ses) await cdp.call('Target.closeTarget', {}, ses, 5000); } catch (e) { }
  }
  for (const h of hs) { try { h.kill(); } catch (e) { } }
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { try { c.kill(); } catch (e2) { } }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close();
  process.exit(caidas ? 2 : 0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(2); });
