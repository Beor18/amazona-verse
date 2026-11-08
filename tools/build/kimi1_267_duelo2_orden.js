#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-267: validación GPU real del parche f58e48e1
   «duelo2: la prueba toma la cámara y volar de antes de entrar, no al cargar».

   v18Duelo2Test fallaba 24/25 POR ORDEN tras flightTest→riverTest→mazeTest→trenTest→retosTest:
   el módulo v18duelo2 se carga a demanda y en esa secuencia cargó con un minijuego abierto
   (follow = camFollow del minijuego); FOLLOW_ORIG/FLY_ORIG (capturados al cargar el módulo)
   guardaban esas envolturas y la comparación al salir daba falso. El fix (test-only) toma las
   referencias al empezar la prueba. La nube lo probó solo en VM/SwiftShader; aquí se valida con
   GPU real y, con --antes, sirviendo src/game/v18/duelo2.js de f58e48e1^ para demostrar que la
   repro acumulada detecta el rojo viejo (par A/B de la misma secuencia).

   Partes (cada una en página recién cargada, MISMA página dentro de cada parte, sin recargas
   entre pruebas — la repro es de estado acumulado):
     A) duelo2 aislado (baseline de la secuencia)
     B) flight→river→maze→tren→retos→duelo2 (orden que fallaba; con el fix de f58e48e1)
     C) igual que B sirviendo duel2.js viejo (solo con --antes; se espera el rojo 'devuelven…')

   Uso: node tools/build/kimi1_267_duelo2_orden.js --etiqueta r1 [--antes] [--salida dir]
   Salida: JSON incremental <salida>/k267_<etiqueta>[_antes].json; exit 1 si error de
   herramienta, error de consola en alguna prueba, o duelo2 por debajo del mínimo.
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
const ANTES = process.argv.includes('--antes'); // sirve duel2.js de f58e48e1^ (rojo viejo esperado)
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi267'));
const ANCHO = 375, ALTO = 812, DPR = 3, CPUX = 4; // mismo perfil móvil de las corridas acumuladas
fs.mkdirSync(SALIDA, { recursive: true });

// contenido viejo de duel2.js para el A/B (--antes)
let DUEL2_VIEJO = null;
if (ANTES) {
  try { DUEL2_VIEJO = execSync('git show "f58e48e1^:src/game/v18/duelo2.js"', { cwd: RAIZ, maxBuffer: 8 << 20 }).toString('utf8'); }
  catch (e) { console.error('no pude extraer duel2.js de f58e48e1^: ' + e.message); process.exit(2); }
  if (!/FOLLOW_ORIG/.test(DUEL2_VIEJO)) { console.error('duelo2.js extraído sin FOLLOW_ORIG: el revspec no es el padre (cmd.exe se comió el ^?)'); process.exit(2); }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-model', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    // A/B: src/game/v18/duelo2.js viejo (f58e48e1^) bajo el mismo URL (cache no-store)
    if (ANTES && p === '/src/game/v18/duelo2.js') { res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' }); return res.end(DUEL2_VIEJO); }
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
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1k267-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null, species: 'vittata' },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
  localStorage.setItem('amazonaverse.v18', JSON.stringify({ v: 1, sel: 'vittata', especies: { vittata: 'seleccionada' }, inv: {}, otorgados: {}, mundo: {} }));
} catch (e) {}`;

const ENTRAR_JS = `(async () => { try { return await (async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene Jugar'; b.click();
    if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta'; }
  await espera(() => { try { const AV = window.AV; return AV && AV.G && AV.G.player3D && AV.G.S && AV.G.S.step != null && AV.G.renderer && AV.G.renderer.stats().calls >= 0; } catch (e) { return false; } }, 90000);
  try { const AV = window.AV; if (AV.G.intro && AV.G.intro.saltar) AV.G.intro.saltar(); } catch (e) {}
  await espera(() => { try { return window.AV.G.renderer.stats().calls > 5; } catch (e) { return false; } }, 60000);
  await sleep(1500);
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

const ORDEN = ['flightTest', 'riverTest', 'mazeTest', 'trenTest', 'retosTest', 'v18Duelo2Test'];
const TOPE_S = { flightTest: 300, riverTest: 300, mazeTest: 300, trenTest: 300, retosTest: 420, v18Duelo2Test: 300 };

function jsPrueba(fn) {
  return `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G;
  const out = { fn: '${fn}' };
  try {
    if (!AV.${fn}) { out.sinTest = true; return JSON.stringify(out); }
    const t0 = performance.now();
    const t = await AV.${fn}();
    out.duracionMs = Math.round(performance.now() - t0);
    out.test = { passed: t.passed, total: t.total, fallos: (t.results || []).filter(r => !r.ok).map(r => r.name + ' :: ' + String(r.extra).slice(0, 300)) };
    try { out.calls = G.renderer.stats().calls; out.heap = (performance.memory && performance.memory.usedJSHeapSize) ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null; } catch (e) {}
  } catch (e) { out.error = String(e && e.stack || e).slice(0, 600); }
  return JSON.stringify(out); })()`;
}

/* Repro fiel del mecanismo de f58e48e1: el módulo v18duelo2 CARGA mientras un minijuego está abierto
   (G.camara.follow = envoltura tipo camFollow W). El código viejo capturaba FOLLOW_ORIG/FLY_ORIG al
   cargar el módulo (= W); al salir del duelo la cámara vuelve a la normal N → N !== W → rojo 24/25.
   El código nuevo (followAntes al empezar la prueba) pasa. Se carga el script a mano (la fábrica es
   idempotente: guarda si G.v18duelo2 ya existe) para elegir el momento de la carga respecto al wrapper. */
const JS_INTERCALADO = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G;
  const out = { parte: 'intercalado' };
  try {
    const cargarScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.charset = 'utf-8'; s.onload = () => res(true); s.onerror = () => rej(new Error('fallo al cargar ' + src)); document.head.appendChild(s); });
    if (!G.v18combate) { await cargarScript('src/game/v18/habilidades.js'); window.AVV18Habilidades(G); await cargarScript('src/game/v18/combate.js'); window.AVV18Combate(G); }
    if (!G.v18fx) { await cargarScript('src/game/v18/fx_poderes.js'); window.AVV18Fx(G); }
    if (G.v18duelo2) { out.error = 'el módulo v18duelo2 ya estaba cargado: la repro no aplica'; return JSON.stringify(out); }
    const N = G.camara.follow;
    let llamadas = 0; const W = dt => { llamadas++; return N(dt); };
    G.camara.follow = W; // minijuego abierto
    out.wInstalado = G.camara.follow === W;
    await cargarScript('src/game/v18/duelo2.js');
    out.wEnFactory = G.camara.follow === W; // diagnóstico: ¿sobrevivió el wrapper hasta la carga?
    window.AVV18Duelo2(G); // el módulo carga AHORA: el código viejo fijaría FOLLOW_ORIG = W
    out.factoryVieja = /FOLLOW_ORIG/.test(String(window.AVV18Duelo2)); // ¿sirvió el archivo viejo con --antes?
    G.camara.follow = N; // cierra el minijuego: la cámara vuelve a la normal antes de la prueba
    out.nRestaurado = G.camara.follow === N;
    out.followNormal = out.wInstalado && out.wEnFactory && out.nRestaurado;
    const t0 = performance.now();
    const t = await AV.v18Duelo2Test();
    out.duracionMs = Math.round(performance.now() - t0);
    out.test = { passed: t.passed, total: t.total, fallos: (t.results || []).filter(r => !r.ok).map(r => r.name + ' :: ' + String(r.extra).slice(0, 300)) };
    try { out.calls = G.renderer.stats().calls; out.heap = (performance.memory && performance.memory.usedJSHeapSize) ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null; } catch (e) {}
  } catch (e) { out.error = String(e && e.stack || e).slice(0, 600); }
  return JSON.stringify(out); })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k267-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--window-size=' + ANCHO + ',' + ALTO, 'about:blank'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  chrome.verStderr = () => err;
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 150; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools en 30 s: ' + err.slice(0, 300));
}
function mataPorPerfil() {
  try {
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi1k267-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const res = { etiqueta: ETIQUETA, parche: ANTES ? 'f58e48e1^ (duelo2.js viejo)' : 'HEAD (con f58e48e1)', pantalla: `movil ${ANCHO}x${ALTO}@${DPR} cpuX${CPUX} (iPhone emulado)`, head: null, partes: {} };
  const outJson = path.join(SALIDA, `k267_${ETIQUETA}${ANTES ? '_antes' : ''}.json`);
  let navegador = await lanzarChrome();
  let ws = new WebSocket(`ws://127.0.0.1:${navegador.puerto}${navegador.wsPath}`);
  let cdp = new CDP(ws); await cdp.listo();
  let ses = null;
  const errores = [];
  function engancharErrores() {
    cdp.ws.addEventListener('message', m => {
      try { const d = JSON.parse(m.data);
        if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errores.push('console.error: ' + (d.params.args || []).map(a => a.value || a.description || '').join(' ').slice(0, 300));
        if (d.method === 'Log.entryAdded' && d.params.entry && d.params.entry.level === 'error') errores.push('log: ' + String(d.params.entry.text).slice(0, 300));
      } catch (e) { }
    });
  }
  async function prepararSesion() {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPUX }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS }, ses);
  }
  async function cargarPagina(id) {
    await cdp.call('Page.enable', {}, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&v18=1` }, ses);
    const t0 = Date.now(); let listo = false;
    while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
      await cdp.bombear(0.5);
    }
    if (!listo) throw new Error('el juego no arrancó (' + id + ')');
    const ent = await evaluar(cdp, ses, ENTRAR_JS, 120);
    if (!/^ok/.test(ent)) throw new Error('entrada (' + id + '): ' + ent);
  }
  async function correrParte(nombre, fns, jsCustom, topeS) {
    res.partes[nombre] = { pruebas: [] };
    await cargarPagina(nombre);
    if (!res.head) res.head = await evaluar(cdp, ses, `(() => { try { return (AV.G.build && (AV.G.build.commit || AV.G.build.id)) || 'desconocido'; } catch (e) { return 'desconocido'; } })()`, 10);
    const lista = jsCustom ? [{ fn: 'intercalado' }] : fns.map(fn => ({ fn }));
    for (const it of lista) {
      const fn = it.fn;
      errores.length = 0;
      let r = {};
      for (let intento = 0; intento < 2 && !r.datos; intento++) {
        try {
          r.datos = JSON.parse(await evaluar(cdp, ses, jsCustom || jsPrueba(fn), topeS || TOPE_S[fn] || 300));
          r.erroresConsola = errores.slice(0, 12);
        } catch (e) {
          const msg = String(e && e.message || e);
          if (intento === 0 && /websocket|target|session|no such|disconnected/i.test(msg)) { await reiniciarChrome('rescate QA-111 en ' + fn); await cargarPagina(nombre); continue; }
          r.error = msg;
        }
      }
      res.partes[nombre].pruebas.push({ fn, ...r });
      fs.writeFileSync(outJson, JSON.stringify(res, null, 1));
      const d = r.datos || {};
      console.log(`[${nombre}/${fn}] ${d.sinTest ? 'SIN TEST' : (d.test ? (d.test.passed + '/' + d.test.total + (d.test.fallos.length ? ' fallos:' + JSON.stringify(d.test.fallos).slice(0, 220) : ' OK')) : ('ERROR ' + (r.error || d.error || '')))} ${d.duracionMs ? d.duracionMs + 'ms' : ''} calls=${d.calls != null ? d.calls : '-'} heap=${d.heap != null ? d.heap + 'MB' : '-'} err=${(r.erroresConsola || []).length}`);
    }
  }
  async function reiniciarChrome(motivo) {
    console.log('  · rearranque del navegador (' + (motivo || 'caído') + ')…');
    try {
      const info = await cdp.call('SystemInfo.getProcessInfo', {}, undefined, 5000);
      const br = (info.processInfo || []).find(p => p.type === 'browser');
      if (br && br.id) spawn('taskkill', ['/F', '/T', '/PID', String(br.id)], { stdio: 'ignore' });
      else try { navegador.chrome.kill(); } catch (e) {}
    } catch (e) { try { navegador.chrome.kill(); } catch (e2) {} }
    const viejo = navegador.perf;
    navegador = await lanzarChrome();
    try { ws.close(); } catch (e) {}
    ws = new WebSocket(`ws://127.0.0.1:${navegador.puerto}${navegador.wsPath}`);
    cdp = new CDP(ws); await cdp.listo();
    engancharErrores();
    await prepararSesion();
    try { fs.rmSync(viejo, { recursive: true, force: true }); } catch (e) { }
  }
  try {
    engancharErrores();
    await prepararSesion();
    if (process.argv.includes('--solo-intercalado')) {
      await correrParte('intercalado', null, JS_INTERCALADO, 300);
    } else {
      await correrParte('aislado', ['v18Duelo2Test']);
      await correrParte('orden', ORDEN);
      await correrParte('intercalado', null, JS_INTERCALADO, 300);
    }
  } catch (e) { res.error = String(e && e.message || e); }
  fs.writeFileSync(outJson, JSON.stringify(res, null, 1));
  try { navegador.chrome.kill('SIGKILL'); } catch (e) { }
  mataPorPerfil();
  try { fs.rmSync(navegador.perf, { recursive: true, force: true }); } catch (e) { }
  srv.close();
  // fallos aceptables: «Cámara compartida» = diseño documentado (FOV portrait, duelo 2 de escritorio);
  // con --antes también «Al salir se devuelven…» = la firma ESPERADA del bug viejo (la repro funciona).
  const okFallos = f => !f.length || f.every(x => /Cámara compartida/i.test(x) || (ANTES && /Al salir se devuelven/i.test(x)));
  const mal = res.error || Object.entries(res.partes).some(([n, p]) => p.pruebas.some(r => r.error || (r.datos && r.datos.error) || (r.erroresConsola && r.erroresConsola.length) || (r.datos && r.datos.test && !okFallos(r.datos.test.fallos))));
  process.exit(mal ? 1 : 0);
})();
