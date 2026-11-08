#!/usr/bin/env node
/* Sonda KIMI-323 (Kimi 3) — ¿cuesta hilo el Modo Escuela en la demo? (hallazgo de KIMI-318)
   Chromebook 1366×768 dpr 1 CPU ×6, GPU real, ?v18=1&calidad=bajo&escuela=0.
   Demo (mismo contrato que kimi1_127): base/duelo/sombra/puente, y en CADA escenario
   A/B intercalado en la misma sesión: OFF 8 s → ON 8 s → OFF 8 s → ON 8 s (setEscuela manual).
   Segunda pasada: arranque fresco con ?escuela=1 (encendido desde el boot) para descartar
   un efecto de la activación inicial. Solo lectura + API pública; el juego no se toca.
   Uso: node tools/build/kimi3_323_demoab.js [--etiqueta r1] [--solo-intercalado] */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn, execSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ETIQUETA = arg('--etiqueta', 'r1');
const SOLO_INTERCALADO = process.argv.includes('--solo-intercalado');
const SOLO = arg('--solo', 'base,duelo,sombra,puente').split(',');
const CPU = 6, ANCHO = 1366, ALTO = 768, DPR = 1;
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi323');
fs.mkdirSync(SALIDA, { recursive: true });
const LOGF = path.join(SALIDA, `k323_${ETIQUETA}.log`);
fs.writeFileSync(LOGF, '');
function log(m) { try { fs.appendFileSync(LOGF, `[${new Date().toISOString().slice(11, 19)}] ${m}\n`); } catch (e) { } console.log(m); }
const res = { tarea: 'KIMI-323', etiqueta: ETIQUETA, pantalla: `chromebook ${ANCHO}x${ALTO}@${DPR} cpuX${CPU}`, v18: true, calidad: 'bajo', head: null, intercalado: {}, boot: {} };
function guardar() { try { fs.writeFileSync(path.join(SALIDA, `k323_${ETIQUETA}.json`), JSON.stringify(res, null, 1)); } catch (e) { } }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg' };
function servir() { const srv = http.createServer((req, r) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { r.writeHead(400); return r.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { r.writeHead(403); return r.end(); } fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end('404'); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); r.end(d); }); }); return new Promise(ok => srv.listen(0, '127.0.0.1', () => ok({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WS: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(JSON.stringify(d.error))) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(m, p, s, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: m, params: p || {}, sessionId: s })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + m)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function ev(cdp, ses, exp, t) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: true, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 500)); return r.result ? r.result.value : undefined; }
// Semilla por pack (patrón kimi1_127)
function semillaSave(pack) {
  const clave = pack === 'cap1' ? 'amazonaverse.save' : pack + '.save';
  const v = pack === 'cap1' ? 6 : 1;
  const save = { v, formato: 2, escrito: Date.now(), saveId: 'qa-kimi3k323-' + Math.random().toString(36).slice(2, 10), profile: { created: true, name: 'Estrella de la Bahía', look: null }, pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0, inv: {}, collected: [], complete: false, explorando: false, clock: 0, events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {}, comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} }, evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false } };
  return `try {
  localStorage.clear(); sessionStorage.clear();
  window.__erroresConsola = [];
  addEventListener('error', e => __erroresConsola.push(String(e.message || e)));
  addEventListener('unhandledrejection', e => __erroresConsola.push('rechazo: ' + (e.reason && e.reason.message || e.reason)));
  const cerr = console.error; console.error = function () { try { __erroresConsola.push([].map.call(arguments, String).join(' ').slice(0, 300)); } catch (e) {} return cerr.apply(this, arguments); };
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem(${JSON.stringify(clave)}, ${JSON.stringify(JSON.stringify(save))});
  localStorage.setItem('amazonaverse.v18', JSON.stringify({ v: 1, sel: 'vittata', especies: { vittata: 'seleccionada' }, inv: {}, otorgados: {}, mundo: {} }));
} catch (e) {}`;
}
const ENTRAR_JS = `(async () => { try { return await (async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene Jugar'; b.click();
    if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta'; }
  const S = window.AV && window.AV.state; if (!S) return 'sin AV.state';
  if (!await espera(() => S.profile && S.profile.created, 45000)) return 'sin perfil';
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(30000);
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 60000);
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
  if (!await espera(() => G.v18combate && G.v18amenaza && G.v18Reparar && G.v18fx, 60000)) return 'ERR módulos v18 sin cargar';
  if (!await espera(() => G.v18combate.estado().ch, 30000)) return 'ERR rival sin modelo';
  window.__k323 = {
    G, S, sleep, espera,
    ir(x, z) { S.pos.x = x; S.pos.z = z; if (G.fisica && G.fisica.MOVE) { G.fisica.MOVE.vx = G.fisica.MOVE.vz = 0; } },
    esc(on) { const R = G.renderer; R.setEscuela(on, true); if (G.vegetacion && G.vegetacion.actualizar) { try { G.vegetacion.actualizar(); } catch (e) {} } return R.calidad.escuela; },
    async muestra(durSec) {
      const deltas = []; let ult = performance.now(); let vivo = true;
      const marca = () => { if (!vivo) return; const a = performance.now(); deltas.push(a - ult); ult = a; requestAnimationFrame(marca); };
      requestAnimationFrame(marca);
      const stats = []; const t0 = performance.now();
      while (performance.now() - t0 < durSec * 1000) {
        await sleep(1000);
        try { const st = G.renderer.stats(); const m = performance.memory;
          stats.push({ calls: st.calls, ktris: st.triangulos != null ? Math.round(st.triangulos / 1000) : null,
            dpr: st.dpr, escuela: st.escuela === true, heapMB: m ? Math.round(m.usedJSHeapSize / 1048576) : null }); } catch (e) { stats.push(null); }
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
        stats };
    }
  };
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;
// Escenarios por API pública (mismo contrato que kimi1_127) + A/B intercalado por escenario.
// orden: A(off) → B(on) → A2(off) → B2(on), 3 s de asentado tras cada conmutación.
const AB_JS = `(async (nombre) => { try { return await (async () => {
  const K = window.__k323, G = K.G, S = K.S, Cb = G.v18combate, Am = G.v18amenaza;
  const drv = { i: null, limpiar() { if (this.i) { clearInterval(this.i); this.i = null; } } };
  const irA = async () => {
    if (nombre === 'base') { const s = Cb.sitio; K.ir(s.x - 6, s.z); }
    else if (nombre === 'duelo') { const s = Cb.sitio; K.ir(s.x - 4, s.z); }
    else if (nombre === 'sombra') { const c = Am.centro; K.ir(c.x + 5, c.z); }
    else { const E = G.v18Reparar.P.eje; if (!E) throw new Error('sin eje del puente'); K.ir(E.ax - E.ux * 3, E.az - E.uz * 3); }
    await K.sleep(3500);
  };
  await irA();
  let poderT = 0;
  if (nombre === 'duelo') {
    if (Cb.estado().fase === 'nada') Cb.iniciar({ sinCuenta: true });
    drv.i = setInterval(() => { try {
      const C = Cb.estado();
      if (C.fase === 'fin') { Cb.otraVez(); return; }
      if (C.fase !== 'lucha' || !C.r) return;
      const d = Math.hypot(C.r.pos.x - S.pos.x, C.r.pos.z - S.pos.z);
      S.facing = { x: (C.r.pos.x - S.pos.x) / (d || 1), z: (C.r.pos.z - S.pos.z) / (d || 1) };
      poderT -= 0.15;
      if (d < 2.4) Cb.usar(C.j, 'golpe_ala');
      else if (poderT <= 0 && C.j.energia > 55) { if (Cb.usar(C.j, C.j.poder).ok) poderT = 2.0; }
    } catch (e) {} }, 150);
  } else if (nombre === 'sombra') {
    if (Am.estado().fase === 'nada') Am.iniciar({ forzar: true, sinEspera: true });
    drv.i = setInterval(() => { try { Am.usarPoder(); } catch (e) {} }, 900);
  }
  const tomas = {};
  try {
    for (const fase of ['A', 'B', 'A2', 'B2']) {
      const on = fase[0] === 'B';
      const quedo = K.esc(on);
      await K.sleep(3000);
      const m = await K.muestra(8);
      m.escuelaAlMedir = quedo === true;
      tomas[fase] = m;
    }
  } finally { drv.limpiar(); try { Cb.salir(); } catch (e) {} try { Am.salir(); } catch (e) {} }
  const med = k => { const v = ['A', 'B', 'A2', 'B2'].map(f => tomas[f] && tomas[f][k]).filter(x => x != null); return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null; };
  return JSON.stringify({ nombre,
    fps: { A: tomas.A.fpsMed, B: tomas.B.fpsMed, A2: tomas.A2.fpsMed, B2: tomas.B2.fpsMed },
    fpsMin: { A: tomas.A.fpsMin, B: tomas.B.fpsMin, A2: tomas.A2.fpsMin, B2: tomas.B2.fpsMin },
    p95Ms: { A: tomas.A.p95Ms, B: tomas.B.p95Ms, A2: tomas.A2.p95Ms, B2: tomas.B2.p95Ms },
    calls: med('calls'), ktris: med('ktris'), dpr: med('dpr'),
    escuela: { A: tomas.A.escuelaAlMedir, B: tomas.B.escuelaAlMedir, A2: tomas.A2.escuelaAlMedir, B2: tomas.B2.escuelaAlMedir },
    series: { A: tomas.A.fpsPorSeg, B: tomas.B.fpsPorSeg, A2: tomas.A2.fpsPorSeg, B2: tomas.B2.fpsPorSeg },
    errores: (window.__erroresConsola || []).slice(0, 10) });
})(); } catch (e) { return JSON.stringify({ error: String(e && e.stack || e).slice(0, 300) }); } })`;
// Pasa única de un escenario (para la pasada de arranque con ?escuela=1)
const UNA_JS = `(async (nombre) => { try { return await (async () => {
  const K = window.__k323, G = K.G, S = K.S, Cb = G.v18combate, Am = G.v18amenaza;
  if (nombre === 'base') { const s = Cb.sitio; K.ir(s.x - 6, s.z); }
  else if (nombre === 'duelo') { const s = Cb.sitio; K.ir(s.x - 4, s.z); }
  else if (nombre === 'sombra') { const c = Am.centro; K.ir(c.x + 5, c.z); }
  else { const E = G.v18Reparar.P.eje; if (!E) throw new Error('sin eje del puente'); K.ir(E.ax - E.ux * 3, E.az - E.uz * 3); }
  await K.sleep(3500);
  let poderT = 0; const drv = { i: null };
  if (nombre === 'duelo') {
    if (Cb.estado().fase === 'nada') Cb.iniciar({ sinCuenta: true });
    drv.i = setInterval(() => { try {
      const C = Cb.estado();
      if (C.fase === 'fin') { Cb.otraVez(); return; }
      if (C.fase !== 'lucha' || !C.r) return;
      const d = Math.hypot(C.r.pos.x - S.pos.x, C.r.pos.z - S.pos.z);
      S.facing = { x: (C.r.pos.x - S.pos.x) / (d || 1), z: (C.r.pos.z - S.pos.z) / (d || 1) };
      poderT -= 0.15;
      if (d < 2.4) Cb.usar(C.j, 'golpe_ala');
      else if (poderT <= 0 && C.j.energia > 55) { if (Cb.usar(C.j, C.j.poder).ok) poderT = 2.0; }
    } catch (e) {} }, 150);
  } else if (nombre === 'sombra') {
    if (Am.estado().fase === 'nada') Am.iniciar({ forzar: true, sinEspera: true });
    drv.i = setInterval(() => { try { Am.usarPoder(); } catch (e) {} }, 900);
  }
  let m;
  try { m = await K.muestra(10); } finally { if (drv.i) clearInterval(drv.i); try { Cb.salir(); } catch (e) {} try { Am.salir(); } catch (e) {} }
  m.escuelaAlMedir = K.G.renderer.calidad.escuela === true;
  return JSON.stringify(m);
})(); } catch (e) { return JSON.stringify({ error: String(e && e.stack || e).slice(0, 300) }); } })`;
process.on('uncaughtException', e => { try { fs.appendFileSync(LOGF, `[${new Date().toISOString().slice(11, 19)}] UNCAUGHT ${e && e.stack || e}\n`); } catch (x) { } console.error('UNCAUGHT', e && e.stack || e); });
process.on('unhandledRejection', e => { try { fs.appendFileSync(LOGF, `[${new Date().toISOString().slice(11, 19)}] UNHANDLED ${e && e.stack || e}\n`); } catch (x) { } console.error('UNHANDLED', e && e.stack || e); });
process.on('exit', c => { try { fs.appendFileSync(LOGF, `[${new Date().toISOString().slice(11, 19)}] exit code=${c}\n`); } catch (x) { } });
(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3k323-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', `--window-size=${ANCHO},${ALTO}`, '--force-device-scale-factor=' + DPR, 'about:blank'], { stdio: 'ignore' });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
  for (let i = 0; i < 150; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoDev) throw new Error('Chrome no abrió DevTools');
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  async function pagina(url, seed) {
    const { targetId } = await cdp.call('Target.createTarget', { url: 'about:blank' });
    const { sessionId: ses } = await cdp.call('Target.attachToTarget', { targetId, flatten: true });
    for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: false }, ses);
    try { await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses); } catch (e) { }
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: seed }, ses);
    await cdp.call('Page.navigate', { url }, ses);
    const t0 = Date.now(); let listo = false;
    while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10)) { listo = true; break; } } catch (e) { } await cdp.bombear(0.5); }
    if (!listo) throw new Error('el juego no arrancó');
    const ent = await ev(cdp, ses, ENTRAR_JS, 150);
    if (!/^ok/.test(ent)) throw new Error('entrada: ' + ent);
    return { ses, targetId };
  }
  try {
    // ---------- Pasada 1: A/B intercalado con escuela=0 (manual OFF desde el boot) ----------
    log('intercalado: navegando ?v18=1&escuela=0...');
    let p = await pagina(`${origen}/index.html?pack=cap1&mapa=real&v18=1&calidad=bajo&escuela=0`, semillaSave('cap1'));
    let ses = p.ses;
    res.head = await ev(cdp, ses, `(() => { try { return (AV.G.build && (AV.G.build.commit || AV.G.build.id)) || 'desconocido'; } catch (e) { return 'desconocido'; } })()`, 10);
    const prep = await ev(cdp, ses, PREP_JS, 150);
    if (!/^ok/.test(prep)) throw new Error('prep: ' + prep);
    log('intercalado: listo, head=' + res.head);
    for (const nombre of SOLO) {
      const raw = await ev(cdp, ses, `(${AB_JS})('${nombre}')`, 150);
      let r;
      try { r = JSON.parse(raw); } catch (e2) { throw new Error('ab/' + nombre + ' parse: ' + String(e2 && e2.message || e2) + ' | raw=' + String(raw).slice(0, 300)); }
      res.intercalado[nombre] = r;
      guardar();
      const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 60000);
      fs.writeFileSync(path.join(SALIDA, `k323_${ETIQUETA}_ab_${nombre}.jpg`), Buffer.from(shot.data, 'base64'));
      log(`ab/${nombre}: fps A=${r.fps && r.fps.A} B=${r.fps && r.fps.B} A2=${r.fps && r.fps.A2} B2=${r.fps && r.fps.B2} | calls=${r.calls} ktris=${r.ktris} esc=${JSON.stringify(r.escuela)}${r.error ? ' ERROR ' + r.error : ''}`);
    }
    res.intercalado.erroresConsola = await ev(cdp, ses, `(window.__erroresConsola || []).slice(0, 30)`, 15);
    await cdp.call('Target.closeTarget', { targetId: p.targetId }).catch(() => { });
    // ---------- Pasada 2: arranque fresco con ?escuela=1 (encendido desde el boot) ----------
    if (!SOLO_INTERCALADO) {
      log('boot: navegando ?v18=1&escuela=1...');
      p = await pagina(`${origen}/index.html?pack=cap1&mapa=real&v18=1&calidad=bajo&escuela=1`, semillaSave('cap1'));
      ses = p.ses;
      const prep2 = await ev(cdp, ses, PREP_JS, 150);
      if (!/^ok/.test(prep2)) throw new Error('prep2: ' + prep2);
      for (const nombre of SOLO) {
        const r = JSON.parse(await ev(cdp, ses, `(${UNA_JS})('${nombre}')`, 150));
        res.boot[nombre] = r;
        guardar();
        const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 60000);
        fs.writeFileSync(path.join(SALIDA, `k323_${ETIQUETA}_boot_${nombre}.jpg`), Buffer.from(shot.data, 'base64'));
        log(`boot/${nombre}: fpsMed=${r.fpsMed} min=${r.fpsMin} p95=${r.p95Ms} calls=${r.calls} ktris=${r.ktris} esc=${r.escuelaAlMedir}${r.error ? ' ERROR ' + r.error : ''}`);
      }
      res.boot.erroresConsola = await ev(cdp, ses, `(window.__erroresConsola || []).slice(0, 30)`, 15);
      await cdp.call('Target.closeTarget', { targetId: p.targetId }).catch(() => { });
    }
    guardar();
    res.ok = true;
  } catch (e) {
    res.fatal = String(e && e.stack || e).slice(0, 1200);
    log('FATAL ' + res.fatal);
  } finally {
    try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
    try { chrome.kill(); } catch (e) { }
    await new Promise(r => setTimeout(r, 1200));
    try { execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(AQUI, 'kimi2_mata_perfil.ps1')}" ${path.basename(perf)}`, { timeout: 30000, stdio: 'ignore' }); } catch (e) { }
    try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
    try { srv.close(); } catch (e) { }
  }
  guardar();
  process.exit(res.ok ? 0 : 1);
})()
