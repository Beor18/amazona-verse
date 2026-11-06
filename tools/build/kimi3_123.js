#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-123: validación GPU real de las cotorras vivas
   nuevas (KIMI-122, forma hecha por la otra cuenta): bandada y Ciudad de los 36 viva de DÍA y
   NOCHE, en calidad baja/media/alta. Capturas para Kelvin en docs/img/kimi123/ (antes/después:
   el «antes» son docs/img/kelvin_6nov/cotorras_vivas_{feas,antes}.*).
   Escritorio 1600×900, GPU real RX 5700 XT:
     - DÍA (CV.hora 12): la bandada horneada real cruzando el cielo; capturas desde la plaza y
       desde el aire, encuadre con yaw que mete más aves en cuadro.
     - NOCHE (atardecer forzado + S.hora 20 + CV.hora 22): faroles encendidos y aves dormidas en
       perchas altas; mismos encuadres.
     - Verificación por calidad: G.bandada.real + geometría horneada (aPleg), números
       FPS/calls/tris/heap por captura, ciudadVivaTest + bandadaTest + vivoTest y 0 errores consola.
   El juego no se toca: solo dispara API pública y teleports.
   Uso: node tools/build/kimi3_123.js [--etiqueta r1] --calidad bajo|medio|alto
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ETIQUETA = arg('--etiqueta', 'r1');
const CALIDAD = String(arg('--calidad', 'medio')).toLowerCase();
if (!/^(bajo|medio|alto)$/.test(CALIDAD)) { console.error('--calidad debe ser bajo|medio|alto'); process.exit(2); }
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi123');
fs.mkdirSync(SALIDA, { recursive: true });
const LOGF = path.join(SALIDA, `k123_${ETIQUETA}.log`);
fs.writeFileSync(LOGF, '');
function log(msg) { try { fs.appendFileSync(LOGF, `[${new Date().toISOString().slice(11, 19)}] ${msg}\n`); } catch (e) { } }
function guardar(res) { try { fs.writeFileSync(path.join(SALIDA, `k123_${ETIQUETA}.json`), JSON.stringify(res, null, 1)); } catch (e) { } }

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi3k123-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || (req.method !== 'GET' && req.method !== 'HEAD')) { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(req.method === 'HEAD' ? undefined : d); });
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
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi3k123-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Brisa del Yunque', look: null },
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

// Ciudad de los 36: teleport al ancla buena (12,-114.8; KIMI-044: el centro redirige), drenado del
// streaming del sitio y espera de sólidos; carga ciudad_viva con gesto sintético si hace falta.
const PREP_JS = `(async () => { try { return await (async () => {
  const G = AV.G, S = AV.state, sleep = ms => new Promise(r => setTimeout(r, ms));
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(150); } return false; };
  if (!await espera(() => G.mundo && G.mundo.listo, 60000)) return 'ERR mundo no listo';
  try { window.dispatchEvent(new PointerEvent('pointerdown')); } catch (e) {}
  if (!G.ciudadViva) {
    try { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true })); } catch (e) {}
    if (!await espera(() => G.ciudadViva, 90000)) return 'ERR ciudad_viva sin cargar';
  }
  const CV = G.ciudadViva, T = G.pruebas;
  T.teleport(12, -114.8); T.tick(0.1);
  if (Math.hypot(G.S.pos.x - 12, G.S.pos.z + 114.8) > 8) { G.S.pos.x = 12; G.S.pos.z = -114.8; G.S.pos.y = G.terreno.height(12, -114.8) + 0.1; }
  const s = CV.sitio();
  if (!s) return 'ERR sin sitio de la ciudad';
  const ST = G.mundo && G.mundo.streaming;
  if (ST && ST.alrededor) ST.alrededor(s.x, s.z).catch(() => {});
  const H = (x, z) => G.terreno.height(x, z);
  const conSolido = () => { const so = G.solidos; return so && so.activo ? s.ins.filter(i => so.altoEn(i.pos[0], i.pos[2], 1e4) > H(i.pos[0], i.pos[2]) + 0.3).length : 0; };
  const t0 = performance.now();
  while (performance.now() - t0 < 120000 && conSolido() < s.ins.length * 0.5) { await sleep(2500); if (G.solidos.terminar) G.solidos.terminar(); }
  if (G.solidos.terminar) G.solidos.terminar();
  const B = G.bandada, malla = B && B.meshes ? {
    real: !!B.real,
    cerca: { tri: (B.meshes[0].geometry.index ? B.meshes[0].geometry.index.count : B.meshes[0].geometry.attributes.position.count) / 3, horneada: !!B.meshes[0].geometry.getAttribute('aPleg') },
    lejos: { tri: (B.meshes[1].geometry.index ? B.meshes[1].geometry.index.count : B.meshes[1].geometry.attributes.position.count) / 3, horneada: !!B.meshes[1].geometry.getAttribute('aPleg') }
  } : { error: 'sin G.bandada' };
  window.__k121 = {
    G, S, CV, sleep, espera, H, sitio: s,
    malla,
    async limpiarUi() {
      const j = Array.from(document.querySelectorAll('button')).find(x => /a jugar/i.test(x.textContent || ''));
      if (j) j.click();
      const f = document.getElementById('c1-fade'); if (f) f.remove();
      const d = document.getElementById('dialog'); if (d && !d.hidden) d.hidden = true;
      try { if (AV.G.ui && AV.G.ui.hideCard) AV.G.ui.hideCard(); } catch (e) {}
      try { if (AV.G.ui && AV.G.ui.hideToast) AV.G.ui.hideToast(); } catch (e) {}
      await sleep(280);
    },
    async statsFoto() {
      const st = G.renderer.stats();
      return { calls: st.calls, tris: st.triangulos, fps: st.fps,
        tex: G.renderer.renderer.info.memory.textures, geo: G.renderer.renderer.info.memory.geometries,
        heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
        hora: S.hora != null ? S.hora : null, enc: (G.ambiente && G.ambiente.faroles) ? (G.ambiente.faroles().enc || 0) : null };
    }
  };
  return JSON.stringify({ ok: true, esperaS: Math.round((performance.now() - t0) / 1000), conSolido: conSolido() + '/' + s.ins.length, aves: CV.aves().length, malla });
})(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

// Encuadre y captura en RAFAGA: se posiciona la cámara, se dejan las aves VIVAS (sin pausa: una
// bandada congelada se lee peor) y se toman varias capturas seguidas; se conserva la que mete más
// aves en cuadro. 'dia' cuenta la bandada; 'noche' (dormidas) cuenta todas las posadas.
const FOTO_JS = (fase, donde) => `(async () => { try { return await (async () => {
  const K = window.__k121, G = K.G, CV = K.CV, S = K.S, CAM = G.camara.CAM, sleep = K.sleep;
  const distFly0 = CAM.distFly, heightFly0 = CAM.heightFly, fovBonus0 = G.camara.fovBonus, incl0 = G.camara.inclina;
  const cuentan = a => ('${fase}' === 'dia') ? a.bando : (a.est === 'posada' || a.accion === 'duerme');
  const enCuadro = () => {
    const cam = G.renderer.camera, v = new THREE.Vector3(); let n = 0;
    for (const a of CV.aves()) if (cuentan(a)) { v.set(a.x, a.y, a.z).project(cam); if (v.z < 1 && Math.abs(v.x) < 0.92 && Math.abs(v.y) < 0.92) n++; }
    return n;
  };
  try {
    G.fisica.MOVE.flying = true; S.vy = 0;
    CAM.fovBonus = 12; // ensancha el FOV: el anillo de la bandada (r 13-24 m) cabe en cuadro
    const s = K.sitio;
    if ('${donde}' === 'plaza') {
      // rasante desde la plaza: Vittata bajo sobre el borde de la plaza mirando a las torres;
      // la bandada cruza el cielo del encuadre en alguna toma de la ráfaga
      const px = s.x + 8, pz = s.z + 16;
      S.pos.x = px; S.pos.z = pz; S.pos.y = K.H(px, pz) + 7;
      CAM.distFly = 12; CAM.heightFly = 4; G.camara.inclina = -0.12;
    } else {
      // aire: sobre el centro de la ciudad a +17 m (encuadre probado en kimi2_k056: el anillo cruza el cuadro)
      const px = s.x + 6, pz = s.z + 16;
      S.pos.x = px; S.pos.z = pz; S.pos.y = K.H(px, pz) + ('${fase}' === 'dia' ? 17 : 24);
      CAM.distFly = 16; CAM.heightFly = 8; G.camara.inclina = -0.22;
    }
    if (AV.debug && AV.debug.camYaw) AV.debug.camYaw('${donde}' === 'plaza' ? Math.PI * 0.9 : 0.8);
    await sleep(1600); // el follow camera llega a la nueva posición
    try { // encuadre al centroide de las aves que cuentan: yaw = atan2(C−T) (convención de
      // ciudad_vivaTest) y Vittata a la altura del centroide +1,5 m: la bandada vuela alta
      // (topeCamino+3,5-6,5) y con la cámara rasante quedaba fuera de cuadro por arriba.
      const list = CV.aves().filter(cuentan);
      if (list.length && AV.debug && AV.debug.camYaw) {
        const cam = G.renderer.camera; let mx = 0, my = 0, mz = 0;
        for (const a of list) { mx += a.x; my += a.y; mz += a.z; }
        mx /= list.length; my /= list.length; mz /= list.length;
        AV.debug.camYaw(Math.atan2(cam.position.x - mx, cam.position.z - mz));
        S.pos.y = my + 1.5;
        await sleep(900); // la cámara sigue el cambio de altura y asienta el yaw
      }
    } catch (e) {}
    const N = '${fase}' === 'dia' ? 5 : 2;
    let mejor = { f: null, n: -1, intento: 0 };
    for (let i = 0; i < N; i++) {
      let f = null;
      for (let j = 0; j < 3 && !f; j++) { f = await G.renderer.snapshot(1280, 800, 0.9); if (!f) await sleep(1200); }
      const n = enCuadro();
      if (f && n > mejor.n) mejor = { f, n, intento: i };
      await sleep(850); // la bandada avanza: otra parte del anillo entra en cuadro
    }
    return JSON.stringify({ foto: mejor.f || 'sin-foto', enCuadro: mejor.n, intento: mejor.intento, stats: await K.statsFoto() });
  } finally { CAM.distFly = distFly0; CAM.heightFly = heightFly0; G.camara.fovBonus = fovBonus0; G.camara.inclina = incl0; }
})(); } catch (e) { return JSON.stringify({ foto: 'ERR', error: String(e && e.stack || e).slice(0, 400) }); } })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3k123-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--window-size=1600,900', 'about:blank'];
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi3k123-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}
function guardarFoto(nombre, dataUrl) {
  fs.writeFileSync(path.join(SALIDA, nombre), Buffer.from(dataUrl.split(',')[1], 'base64'));
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const res = { etiqueta: ETIQUETA, calidad: CALIDAD, pantalla: 'escritorio 1600x900 cpuX1 calidad ' + CALIDAD + ' GPU real', capturas: {}, notas: [] };
  const watch = setInterval(() => { try { guardar(res); } catch (e) { } log('…latido'); }, 5000);
  try {
    log('lanzando Chrome y entrando al juego (cap1, calidad ' + CALIDAD + ')...');
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&calidad=${CALIDAD}` }, ses);
    await cdp.bombear(2);
    const ent = await evaluar(cdp, ses, ENTRAR_JS, 150);
    if (!/^ok/.test(ent)) throw new Error('entrada: ' + ent);
    // bandadaTest en la villa recién entrada: las 2 mallas instanciadas están limpias (sin
    // residentes/ciudad viva en EXTRA); en la ciudad comparten mallas y el check «20» no aplica.
    log('corriendo bandadaTest (villa, mallas limpias)...');
    res.bandadaTest = JSON.parse(await evaluar(cdp, ses, `(async () => { try { const r = await AV.bandadaTest({}); return JSON.stringify({ passed: r.passed, total: r.total, fallos: (r.results || []).filter(x => !x.ok).map(x => x.name + ' :: ' + String(x.extra).slice(0, 120)) }); } catch (e) { return JSON.stringify({ error: String(e && e.message || e).slice(0, 200) }); } })()`, 300));
    log('bandadaTest: ' + JSON.stringify(res.bandadaTest));
    const prep = JSON.parse(await evaluar(cdp, ses, PREP_JS, 200));
    if (!prep.ok) throw new Error('prep: ' + JSON.stringify(prep).slice(0, 300));
    res.prep = prep;
    log('ciudad preparada: ' + JSON.stringify(prep));
    if (!prep.malla.real || !prep.malla.cerca.horneada) res.notas.push('OJO: bandada NO horneada (fallback esferas)');

    // ---------- DÍA: bandada horneada cruzando el cielo ----------
    log('fase día: esperando bandada...');
    const dia = JSON.parse(await evaluar(cdp, ses, `(async () => { const K = window.__k121, CV = K.CV;
      CV.hora(12);
      let hay = CV.aves().some(a => a.bando), forzada = false;
      const t0 = performance.now();
      while (!hay && performance.now() - t0 < 45000) { if (CV.aves().some(a => a.bando)) { hay = true; break; } await K.sleep(400); }
      if (!hay) { forzada = true; CV.prueba(true); CV.hora(12); CV.pausa(true);
        for (let i = 0; i < 6000 && !hay; i++) { CV.paso(0.05, 'todo'); if (CV.aves().some(a => a.bando)) hay = true; }
        CV.pausa(false); }
      await K.sleep(1500);
      const n = CV.aves().length, bando = CV.aves().filter(a => a.bando).length;
      return JSON.stringify({ hay, forzada, aves: n, bando }); })()`, 120));
    res.dia = dia;
    log('día: ' + JSON.stringify(dia));
    if (!dia.hay) res.notas.push('día: sin bandada (aves posadas)');

    for (const vista of ['plaza', 'aire']) {
      const r = JSON.parse(await evaluar(cdp, ses, FOTO_JS('dia', vista), 60));
      if (r.foto && r.foto !== 'sin-foto' && r.foto !== 'ERR') {
        const nombre = `k123_${ETIQUETA}_dia_${vista}.jpg`;
        guardarFoto(nombre, r.foto);
        res.capturas[`dia_${vista}`] = { nombre, enCuadro: r.enCuadro, stats: r.stats };
        log(`captura día/${vista}: ${nombre} (aves en cuadro ${r.enCuadro})`);
      } else { res.capturas[`dia_${vista}`] = { error: r.foto, detalle: r.error || null }; log('captura día/' + vista + ': ' + r.foto + (r.error ? ' ' + r.error : '')); }
      await evaluar(cdp, ses, `(async () => { const K = window.__k121; await K.limpiarUi(); return 'ok'; })()`, 20);
    }

    // ---------- NOCHE: atardecer + faroles + aves dormidas ----------
    log('fase noche: atardecer forzado + S.hora 20 + CV.hora 22...');
    const noche = JSON.parse(await evaluar(cdp, ses, `(async () => { const K = window.__k121, G = K.G, S = K.S, CV = K.CV;
      if (G.atardecer) { G.atardecer.forzar(true); G.atardecer.avanzar(9); }
      S.hora = 20; CV.hora(22); CV.prueba(false); CV.pausa(false);
      await K.sleep(2500); // el fundido avanza con los cuadros
      // faroles: rampa de encendido objetiva (KIMI-018/KIMI-032)
      const estFar = () => (G.ambiente && G.ambiente.faroles) ? G.ambiente.faroles() : null;
      for (let i = 0; i < 30; i++) { const f0 = estFar(); if (!f0 || f0.enc > 0.95) break; await K.sleep(400); }
      await K.sleep(9000); // las aves vuelan a las perchas altas a dormir
      const av = CV.aves();
      return JSON.stringify({ hora: S.hora != null ? S.hora : null, enc: estFar() ? estFar().enc : null,
        aves: av.length, dormidas: av.filter(a => a.accion === 'duerme' || a.est === 'posada').length,
        atardecer: G.atardecer ? G.atardecer.estado() : null }); })()`, 90));
    res.noche = noche;
    log('noche: ' + JSON.stringify(noche));

    for (const vista of ['plaza', 'aire']) {
      const r = JSON.parse(await evaluar(cdp, ses, FOTO_JS('noche', vista), 60));
      if (r.foto && r.foto !== 'sin-foto' && r.foto !== 'ERR') {
        const nombre = `k123_${ETIQUETA}_noche_${vista}.jpg`;
        guardarFoto(nombre, r.foto);
        res.capturas[`noche_${vista}`] = { nombre, enCuadro: r.enCuadro, stats: r.stats };
        log(`captura noche/${vista}: ${nombre} (aves en cuadro ${r.enCuadro})`);
      } else { res.capturas[`noche_${vista}`] = { error: r.foto, detalle: r.error || null }; log('captura noche/' + vista + ': ' + r.foto + (r.error ? ' ' + r.error : '')); }
      await evaluar(cdp, ses, `(async () => { const K = window.__k121; await K.limpiarUi(); return 'ok'; })()`, 20);
    }

    // ---------- regresión ----------
    log('corriendo ciudadVivaTest...');
    res.ciudadVivaTest = JSON.parse(await evaluar(cdp, ses, `(async () => { const r = await AV.ciudadVivaTest({ espera: 150 }); return JSON.stringify({ passed: r.passed, total: r.total, fallos: r.results.filter(x => !x.ok).map(x => x.name + ' :: ' + String(x.extra).slice(0, 120)) }); })()`, 400));
    log('ciudadVivaTest: ' + JSON.stringify(res.ciudadVivaTest));
    log('corriendo vivoTest...');
    res.vivoTest = JSON.parse(await evaluar(cdp, ses, `(async () => { try { const r = await AV.vivoTest({}); return JSON.stringify({ passed: r && r.passed, total: r && r.total, claves: r ? Object.keys(r).slice(0, 12) : null, fallos: r && r.results ? r.results.filter(x => !x.ok).map(x => (x.name || x.id || 'check') + ' :: ' + String(x.extra || x.msg || '').slice(0, 120)) : (r && r.fallos) || null }); } catch (e) { return JSON.stringify({ error: String(e && e.message || e).slice(0, 200) }); } })()`, 300));
    log('vivoTest: ' + JSON.stringify(res.vivoTest));

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
    log('evidencia: ' + path.join(SALIDA, `k123_${ETIQUETA}.json`));
    process.exit(res.fallo ? 1 : 0);
  }
})();
