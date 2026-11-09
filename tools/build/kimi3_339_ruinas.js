#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-339: «edificios lejanos como ruinas» al llegar (📣 nube
   8-nov 03:15, carril streaming). Mide con GPU real, en escritorio (1600×900, DPR 1, calidad AUTO sin
   flags — la condición de Kelvin), cuánto tarda la vista del spawn del cap. 1 en pasar de `_lejos`/siluetas
   a detalle (modelos cerca/_hd colocados y fusiones hechas): serie de muestras cada 300 ms desde que el
   mundo se hace visible + capturas + muestra final asentada con ST.terminar(). Deja los números para la
   propuesta (precargar más ancha antes de quitar la pantalla o fundido de LOD) sin cambiar el juego.
   Uso: node tools/build/kimi3_339_ruinas.js --etiqueta r1 */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn, execSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ETIQUETA = arg('--etiqueta', 'r1');
const MODO = arg('--modo', 'teleport'); // teleport | vuelo | pie — vuelo: acercarse volando a 17 m/s; pie: misma trayectoria a 6,5 m/s (la puerta del anticipo es la velocidad, no la altura)
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi339');
fs.mkdirSync(SALIDA, { recursive: true });
const LOGF = path.join(SALIDA, `k339_${ETIQUETA}.log`);
fs.writeFileSync(LOGF, '');
function log(m) { try { fs.appendFileSync(LOGF, `[${new Date().toISOString().slice(11, 19)}] ${m}\n`); } catch (e) { } }

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi3k339-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
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
  call(m, p, s, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); const msg = { id, method: m, params: p || {} }; if (s) msg.sessionId = s; this.ws.send(JSON.stringify(msg)); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + m)); } }, t); }); }
}
async function ev(cdp, ses, exp, t, pr) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000);
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result ? r.result.value : undefined;
}

function semillaSave() {
  const save = {
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi3k339-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false },
  };
  return `try {
  localStorage.clear(); sessionStorage.clear();
  window.__erroresConsola = [];
  addEventListener('error', e => __erroresConsola.push(String(e.message || e)));
  addEventListener('unhandledrejection', e => __erroresConsola.push('rechazo: ' + (e.reason && e.reason.message || e.reason)));
  const cerr = console.error; console.error = function () { try { __erroresConsola.push([].map.call(arguments, String).join(' ').slice(0, 300)); } catch (e) {} return cerr.apply(this, arguments); };
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', ${JSON.stringify(JSON.stringify(save))});
} catch (e) {}`;
}

// Entra y devuelve en cuanto el mundo es visible (sin esperar el precalentado completo): captura la llegada.
const ENTRAR_JS = `(async () => { try { return await (async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t) { await espera(() => t.open, 30000);
    if (t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene Jugar'; b.click();
      if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta'; } }
  const S = window.AV && window.AV.state; if (!S) return 'sin AV.state';
  if (!await espera(() => S.profile && S.profile.created, 45000)) return 'sin perfil: AV=' + (!!window.AV) + ' G=' + (!!window.AV && !!AV.G) + ' hash=' + location.hash + ' psave=' + !!$('p-save') + ' creador=' + !!document.querySelector('#creator, [id*=creat], [id*=creador]') + ' dialogos=' + document.querySelectorAll('dialog').length + ' guardado=' + (localStorage.getItem('amazonaverse.save') || '').slice(0, 60);
  if (!await espera(() => { try { return AV.G.ui && !(AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 90000)) return 'mundo no visible';
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

const MUESTRA_JS = `(() => { const AV = window.AV, G = AV.G;
  const st = G.renderer.stats(), s = G.mundo.streaming.stats();
  const info = G.renderer.renderer.info, m = info.memory;
  return { calls: st.calls, ktris: Math.round((st.triangulos || 0) / 1000), calidad: st.calidad, dpr: st.dpr, sombras: st.sombras,
    mem: { geo: m.geometries, tex: m.textures, prog: info.programs.length },
    heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
    st: { vCerca: s.visiblesCerca, vLejos: s.visiblesLejos, vHD: s.visiblesHD, drawEd: s.drawEdificios,
          modCerca: s.modelosCerca, modLejos: s.modelosLejos, modHD: s.modelosHD, cola: s.descargando, trabajos: s.trabajos, kbGeo: s.kbGeometria } };
})()`;

const ASENTAR_JS = `(async () => { try { const ST = AV.G.mundo.streaming; const t0 = performance.now();
  const r = await ST.terminar({ topeMs: 120000 });
  return { ms: Math.round(performance.now() - t0), tope: !!(r && r.tope), pendientes: r && r.pendientes }; }
  catch (e) { return 'ERR ' + (e && e.message || e); } })()`;

// Acercarse a la zona con edificios más cercana (100 m +) y quedarse en el aire: mide el pop `_lejos` → `cerca` al llegar.
const TELEPORT_JS = `(async () => { try { const AV = window.AV, G = AV.G, S = AV.state, ST = G.mundo.streaming;
  const zonas = ST.zonas, px = S.pos.x, pz = S.pos.z;
  let best = null, bd = 1e9;
  for (const id in zonas) { const Z = zonas[id]; if (!Z.modelos || !Z.modelos.size) continue; const d = Math.hypot(Z.cx - px, Z.cz - pz); if (d > 100 && d < bd) { bd = d; best = Z; } }
  if (!best) return 'sin zona';
  S.pos.x = best.cx; S.pos.z = best.cz; S.pos.y = 30;
  return best.id + ' @' + Math.round(bd) + 'm'; } catch (e) { return 'ERR ' + (e && e.message || e); } })()`;

// Fase 2 en modo vuelo: colocarse a 420 m de la zona NO-ciudad con edificios más cercana (a 150 m +) y
// acercarse en línea recta a 17 m/s a y=35: mide el pop `_lejos` → `cerca` al cruzar la frontera, que es
// el escenario real de «edificios lejanos como ruinas» (la precarga hacia adelante solo dispara en vuelo).
const CIUDADES = `['kelvin_ruinas_yunque','kelvin_ruinas_yunque_2','kelvin_aldea_rio_este_2','kelvin_aldea_colina']`;
const FLY_JS = `(async () => { try { const AV = window.AV, G = AV.G, S = AV.state, ST = G.mundo.streaming;
  const ciudades = new Set(${CIUDADES});
  const zonas = ST.zonas, px = S.pos.x, pz = S.pos.z;
  const cands = [];
  for (const id in zonas) { const Z = zonas[id]; if (!Z.modelos || !Z.modelos.size || ciudades.has(id)) continue; const d = Math.hypot(Z.cx - px, Z.cz - pz); cands.push([Math.round(d), id]); }
  cands.sort((a, b) => b[0] - a[0]);
  let best = null, bd = 1e9;
  for (const c of cands) if (c[0] > 300 && c[0] < bd) { bd = c[0]; best = zonas[c[1]]; }
  if (!best && cands.length) { best = zonas[cands[0][1]]; bd = cands[0][0]; } // fuera del boost no hay zona: usar la más lejana
  window.__cands = cands.slice(0, 5);
  if (!best) return 'sin zona top5=' + JSON.stringify(cands.slice(0, 5));
  if (!best) return 'sin zona';
  const dx = (best.cx - px) / bd, dz = (best.cz - pz) / bd;
  S.pos.x = best.cx - dx * 420; S.pos.z = best.cz - dz * 420; S.pos.y = 35;
  if (G.fisica && G.fisica.MOVE) G.fisica.MOVE.flying = true;
  window.__fly = { id: best.id, dx, dz, t0: performance.now() };
  return best.id + ' @' + Math.round(bd) + 'm'; } catch (e) { return 'ERR ' + (e && e.message || e); } })()`;
const FLY_PASO_JS = `(() => { try { const AV = window.AV, S = AV.state, f = window.__fly;
  if (!f) return -1;
  S.pos.x += f.dx * 5.1; S.pos.z += f.dz * 5.1; S.pos.y = 35;
  if (AV.G.fisica && AV.G.fisica.MOVE) AV.G.fisica.MOVE.flying = true;
  const Z = AV.G.mundo.streaming.zonas[f.id];
  return Math.round(Math.hypot(Z.cx - S.pos.x, Z.cz - S.pos.z)); } catch (e) { return -1; } })()`;
// KIMI-348: paso a pie — 2,0 m por muestra de 300 ms ≈ 6,5 m/s (velocidad de caminar; bajo el mínimo de vuelo 15 m/s)
const PIE_PASO_JS = `(() => { try { const AV = window.AV, S = AV.state, f = window.__fly;
  if (!f) return -1;
  S.pos.x += f.dx * 2.0; S.pos.z += f.dz * 2.0; S.pos.y = 35;
  if (AV.G.fisica && AV.G.fisica.MOVE) AV.G.fisica.MOVE.flying = true;
  const Z = AV.G.mundo.streaming.zonas[f.id];
  return Math.round(Math.hypot(Z.cx - S.pos.x, Z.cz - S.pos.z)); } catch (e) { return -1; } })()`;
// KIMI-348: estado de la zona destino en cada muestra (nivel, d real al borde, refs de precarga pedidas,
// velocidad aproximada vista desde la página y si la zona está forzada a nivel 2)
const ZONA_JS = `(() => { try { const AV = window.AV, f = window.__fly; if (!f) return null; const Z = AV.G.mundo.streaming.zonas[f.id];
  const t = performance.now(), px = AV.state.pos.x, pz = AV.state.pos.z;
  if (!window.__spd) window.__spd = { t, px, pz, v: 0 };
  const s = window.__spd, dt = (t - s.t) / 1000;
  if (dt > 0.1) { s.v = Math.hypot(px - s.px, pz - s.pz) / dt; s.t = t; s.px = px; s.pz = pz; }
  return { nivel: Z.nivel, d: Math.round(Z.d), pre: Z.pre ? Object.keys(Z.pre).length : 0, v: Math.round(s.v * 10) / 10, fz: !!Z.forzada };
} catch (e) { return null; } })()`;

(async () => {
  const res = { etiqueta: ETIQUETA, cuando: new Date().toISOString(), pantalla: '1600x900 dpr1', calidad: 'auto (sin flags)', cpu: 'x1', gpu: 'PC real (ANGLE/D3D11)', muestras: [], llegada: null, asentado: null, errores: null };
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  log(`servidor ${origen}`);
  const perf = path.join(os.tmpdir(), `kimi3k339-${Date.now().toString(36)}`);
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${perf}`, '--enable-gpu', '--ignore-gpu-blocklist', '--window-size=1600,900', '--force-device-scale-factor=1', '--no-first-run', '--mute-audio', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  res.chromePid = chrome.pid;
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  let port = null, wsPath = null;
  for (let i = 0; i < 150 && !port; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { port = parseInt(l[0], 10); wsPath = l[1].trim(); } }
    if (!port) await new Promise(r => setTimeout(r, 200));
  }
  if (!port) { log('Chrome no abrió DevTools: ' + err.slice(0, 200)); throw new Error('devtools'); }
  const ws = new WebSocket(`ws://127.0.0.1:${port}${wsPath}`);
  await new Promise((re, re2) => { ws.onopen = re; ws.onerror = re2; });
  const cdp = new CDP(ws);
  const { targetId } = await cdp.call('Target.createTarget', { url: 'about:blank' }, null, 15000);
  const { sessionId: ses } = await cdp.call('Target.attachToTarget', { targetId, flatten: true }, null, 15000);
  await cdp.call('Page.enable', {}, ses, 15000);
  await cdp.call('Runtime.enable', {}, ses, 15000);
  try {
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: semillaSave() }, ses, 15000);
    const t0 = Date.now();
    await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real` }, ses, 30000);
    // Espera a que el juego esté listo (mismo criterio que las demás herramientas) y entra hasta el mundo visible.
    let listo = false;
    while (Date.now() - t0 < 240000) {
      try { if (await ev(cdp, ses, `!!(${JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
      await new Promise(r => setTimeout(r, 500));
    }
    if (!listo) { res.llegada = { error: 'el juego no arrancó en 240 s' }; log('no arrancó'); throw new Error('arranque'); }
    const ent = await ev(cdp, ses, ENTRAR_JS, 150);
    log(`entrar='${ent}' en ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    if (ent !== 'ok') { res.llegada = { error: 'entrar: ' + ent }; throw new Error('entrar'); }
    // Serie de llegada: cada 300 ms durante 10 s + capturas puntuales.
    const tiros = [200, 1000, 2000, 4000, 8000];
    const tReveal = Date.now();
    let prox = 0;
    while (Date.now() - tReveal < 10000) {
      const m = await ev(cdp, ses, MUESTRA_JS, 15);
      m.t = Date.now() - tReveal;
      res.muestras.push(m);
      while (prox < tiros.length && m.t >= tiros[prox]) {
        const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 30000);
        fs.writeFileSync(path.join(SALIDA, `k339_${ETIQUETA}_t${tiros[prox]}.jpg`), Buffer.from(shot.data, 'base64'));
        log(`captura t=${tiros[prox]}`);
        prox++;
      }
      await new Promise(r => setTimeout(r, 300));
    }
    // Fase 2: acercarse a una zona edificada y medir el swap _lejos → cerca (el pop de «ruinas»).
    if (MODO === 'vuelo' || MODO === 'pie') {
      const pasoJs = MODO === 'pie' ? PIE_PASO_JS : FLY_PASO_JS;
      const maxPasos = MODO === 'pie' ? 240 : 90; // pie: 420 m a 2,0 m/paso ≈ 210 pasos
      const clave = MODO; // prefijo de las capturas
      const tz = await ev(cdp, ses, FLY_JS, 30);
      log(`${MODO} destino='${tz}'`);
      res.acercamiento = { destino: tz, modo: MODO === 'pie' ? 'pie 6,5 m/s desde 420 m a y=35 (la puerta del anticipo es la velocidad, no la altura)' : 'vuelo 17 m/s desde 420 m a y=35', muestras: [] };
      const tZ = Date.now();
      let shotZ = false;
      for (let paso = 0; paso < maxPasos; paso++) {
        const d = await ev(cdp, ses, pasoJs, 15);
        const m = await ev(cdp, ses, MUESTRA_JS, 15);
        m.t = Date.now() - tZ; m.d = d; m.z = await ev(cdp, ses, ZONA_JS, 10, false);
        res.acercamiento.muestras.push(m);
        if (!shotZ && m.d >= 0 && m.d <= 130) {
          const s2 = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 30000);
          fs.writeFileSync(path.join(SALIDA, `k339_${ETIQUETA}_${clave}_cruseRc.jpg`), Buffer.from(s2.data, 'base64'));
          log(`captura ${MODO} al cruzar Rc (d=${m.d})`);
          shotZ = true;
        }
        if (d >= 0 && d < 35) break;
        await new Promise(r => setTimeout(r, 300));
      }
    } else {
    const tz = await ev(cdp, ses, TELEPORT_JS, 30);
    log(`teleport='${tz}'`);
    res.acercamiento = { destino: tz, modo: 'teleport', muestras: [] };
    const tZ = Date.now();
    let shotZ = false;
    while (Date.now() - tZ < 9000) {
      const m = await ev(cdp, ses, MUESTRA_JS, 15);
      m.t = Date.now() - tZ;
      res.acercamiento.muestras.push(m);
      if (!shotZ && m.t >= 4000) {
        const s2 = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 30000);
        fs.writeFileSync(path.join(SALIDA, `k339_${ETIQUETA}_acercamiento_t4s.jpg`), Buffer.from(s2.data, 'base64'));
        log('captura acercamiento t=4s');
        shotZ = true;
      }
      await new Promise(r => setTimeout(r, 300));
    }
    }
    // Asentado completo (cola vacía): cuánto tarda el detalle total.
    const a = await ev(cdp, ses, ASENTAR_JS, 150);
    res.asentado = a;
    log(`asentado=${JSON.stringify(a)}`);
    const mFin = await ev(cdp, ses, MUESTRA_JS, 15);
    mFin.t = 'final';
    res.muestras.push(mFin);
    const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 30000);
    fs.writeFileSync(path.join(SALIDA, `k339_${ETIQUETA}_final.jpg`), Buffer.from(shot.data, 'base64'));
    res.errores = await ev(cdp, ses, `(window.__erroresConsola || []).slice(0, 8)`, 10, false);
    log(`errores=${JSON.stringify(res.errores)}`);
  } catch (e) {
    if (!res.llegada) res.llegada = { error: String(e && e.message || e).slice(0, 300) };
    log('ERROR ' + res.llegada.error);
  } finally {
    try { ws.close(); } catch (e) { }
    try { chrome.kill('SIGKILL'); } catch (e) { }
    try { execSync(`taskkill /PID ${chrome.pid} /T /F >NUL 2>&1`); } catch (e) { }
    try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  }
  srv.close();
  fs.writeFileSync(path.join(SALIDA, `k339_${ETIQUETA}.json`), JSON.stringify(res, null, 1));
  log('fin');
  console.log(JSON.stringify(res, null, 1));
  process.exit(0);
})().catch(e => { log('FATAL ' + (e && e.stack || e)); console.error(e); process.exit(1); });
