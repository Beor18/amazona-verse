#!/usr/bin/env node
/* KIMI-3 · TIRONES-móvil · cola 10:55 UTC 7-nov (coordinadora): «Kimi 3 · tirones en móvil: con la
   traza de rendimiento del iPhone emulado, los 3 tirones más largos de los primeros 10 min del
   cap. 1 (con V18) y su arreglo». Réplica del playtest cap1 (kimi3_playtest_cap1.js) con:
   - ?v18=1 (la V18, como pide el encargo)
   - dpr 3 + CPU ×4 (perfil iPhone estándar de este carril)
   - un registrador de cuadros inyectado ANTES de los scripts de la página: envuelve rAF y anota
     todo cuadro >250 ms con {s desde inicio, ms, heap MB, fase AV} → window.__tirones.
   El juego no se toca: solo corre el bot de QA (temporadaMovilTest caps:[1]) y vuelca la traza.
   KIMI-3 v3: el iframe del juego se PONE EN PANTALLA (ep_caminar.js lo deja en left:-1200px y Chrome
   frena sus timers: artifact de tirones gigantes). Con --pantalla 1 el iframe queda a la vista
   (condición de móvil real) y el latido registra cola (trabajos/descargando) + rect + visibilityState.
   KIMI-3 v4: la página TOP es una shell vacía servida por la herramienta (/k3shell.html): antes el top
   cargaba index.html?v18=1 (una 2.ª instancia del juego bombeando la cola y compartiendo el hilo
   principal con el iframe a CPU ×4 → cuadros de 3 s aun con el iframe visible). Así el juego corre en
   UNA sola instancia (el iframe del bot), la condición del iPhone real.
   KIMI-3 v5: el iframe carga OFF-SCREEN (en pantalla desde t=0 la carga no progresa a ×4: backing store
   1170×2532 renderizando durante el boot) y el latido lo pasa a EN PANTALLA en cuanto AV.G.mundo.listo:
   gameplay medido sin throttling y con la carga rápida.
   Uso: node tools/build/kimi3_tirones.js [--cpu 4] [--dpr 3] [--salida DIR] [--etiqueta r1] [--pantalla 0|1] */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const CPU = parseFloat(arg('--cpu', '4'));
const DPR = parseFloat(arg('--dpr', '3'));
const ETIQUETA = arg('--etiqueta', 'r1');
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi3tirones'));
const UMBRAL = parseFloat(arg('--umbral', '250'));
const PANTALLA = arg('--pantalla', '1') !== '0';
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end('400'); } if (p.endsWith('/')) p += 'index.html'; if (p === '/k3shell.html') { if (/[?&]pack=/.test(req.url)) { p = '/index.html'; } else { res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' }); res.end('<!doctype html><meta charset="utf-8"><title>k3-shell</title><body>shell k3'); return; } } const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end('403'); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'max-age=600' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); this.ev = []; ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } else if (d.method) for (const f of this.ev) { try { f(d); } catch (e) { } } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  on(f) { this.ev.push(f); }
  call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result ? r.result.value : undefined; }
(async () => {
  fs.mkdirSync(SALIDA, { recursive: true });
  const logF = path.join(SALIDA, 'tirones-' + ETIQUETA + '.log');
  const lineas = [];
  const pinta = l => { lineas.push(l); console.log(l); fs.appendFileSync(logF, l + '\n'); };
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3tir-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--window-size=1280,800'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let errC = ''; chrome.stderr.on('data', d => { errC += d; });
  const limpiar = () => { try { chrome.kill(); } catch (e) { } try { srv.close(); } catch (e) { } };
  process.on('SIGINT', () => { limpiar(); process.exit(2); });
  let puertoDev, wsPath;
  const pf = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoDev) { limpiar(); throw new Error('Chrome no abrió DevTools ' + errC.slice(0, 200)); }
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
  // Registrador de cuadros: antes que cualquier script de la página (rápido y sin dependencias).
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: `(function(){
    window.__tirones = []; window.__frames = { n: 0, sumMs: 0, t0: performance.now() }; window.__ultTiron = 0;
    window.__longtasks = []; window.__deltas = [];
    try { new PerformanceObserver(function(list){ for (var e of list.getEntries()) window.__longtasks.push({ s: Math.round((e.startTime - window.__frames.t0) / 100) / 10, d: Math.round(e.duration), n: String(e.name || '').split('/').pop(), a: (e.attribution || []).map(function(x){ return String(x.name || '').split('/').pop(); }).join(',') }); }).observe({ entryTypes: ['longtask'] }); } catch (e) {}
    var orig = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : null;
    if (!orig) return;
    var last = performance.now(); var estadoPrev = '';
    function estado() {
      var f = '';
      try { if (window.AV && AV.G) {
        try { if (AV.G.ui && AV.G.ui.busy && AV.G.ui.busy()) f += 'ui · '; } catch (e) {}
        try { if (AV.G.pausa && AV.G.pausa.activa && AV.G.pausa.activa()) f += 'pausa · '; } catch (e) {}
      } } catch (e) {}
      f += document.hidden ? 'hidden' : 'visible';
      return f;
    }
    estadoPrev = estado();
    // Espejo al frame padre: temporadaMovil BORRA el iframe del juego al terminar y la lectura final
    // cae al shell (enIframe:false, basura). Con el espejo, el padre conserva la traza real aunque el iframe muera.
    // KIMI-3 v3: el espejo se versiona por __k3id de cada documento — temporadaMovil navega el iframe a
    // about:blank antes de borrarlo y EL BLANCO también corre este registrador y sobrescribía el espejo
    // con su traza vacía (visible-r1: lectura final n=6, trabajos 0). Con claves por documento, la traza
    // del juego sobrevive intacta bajo su propia clave y la lectura final elige la entrada con más cuadros.
    window.__k3id = 'k3' + String(Math.random()).slice(2) + Date.now().toString(36);
    setInterval(function(){ try { if (window.parent && window.parent !== window) { var P = window.parent; var T = P.__k3trazas || (P.__k3trazas = {}); T[window.__k3id] = { tirones: window.__tirones, frames: window.__frames, longtasks: window.__longtasks, deltas: window.__deltas }; } } catch (e) {} }, 1000);
    window.requestAnimationFrame = function(cb){
      return orig(function(t){
        var now = performance.now(); var d = now - last; last = now;
        window.__frames.n++; window.__frames.sumMs += d;
        if (window.__deltas.length < 80000) window.__deltas.push(Math.round(d));
        if (d > ${UMBRAL} && now - window.__ultTiron > 150) {
          window.__ultTiron = now;
          var fase = 'ini[' + estadoPrev + '] ';
          try { if (window.AV && AV.G) {
            try { var st = AV.G.mundo && AV.G.mundo.streaming && AV.G.mundo.streaming.stats ? AV.G.mundo.streaming.stats() : null; if (st) fase += 'st {trabajos:' + st.trabajos + ',descargando:' + st.descargando + ',kbG:' + st.kbGeometria + ',zonas:' + st.zonas + ',fundidas:' + st.zonasFundidas + ',colocadas:' + st.colocadas + '} · '; } catch (e) {}
            try { if (AV.G.trabajosLentos) fase += 'lentos:' + JSON.stringify(AV.G.trabajosLentos.slice(-4)).slice(0, 160) + ' · '; } catch (e) {}
          } } catch (e) {}
          fase += 'fin[' + estado() + ']';
          window.__tirones.push({ s: Math.round((now - window.__frames.t0) / 100) / 10, ms: Math.round(d), heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1, fase: fase.slice(0, 300) });
        }
        estadoPrev = estado();
        if (cb) cb(t);
      });
    };
  })();` }, ses);
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: DPR, mobile: true }, ses);
  await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5, configuration: 'mobile' }, ses);
  await cdp.call('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' }, ses);
  await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
  await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
  const errores = [];
  cdp.on(d => {
    if (d.method === 'Runtime.consoleAPICalled') {
      const txt = (d.params.args || []).map(a => a.value !== undefined ? a.value : (a.description || a.type)).join(' ');
      if (d.params.type === 'error') errores.push(txt.slice(0, 300));
    } else if (d.method === 'Runtime.exceptionThrown') {
      errores.push(('EXC ' + JSON.stringify(d.params.exceptionDetails && d.params.exceptionDetails.exception && d.params.exceptionDetails.exception.description || d.params.exceptionDetails.text)).slice(0, 300));
    }
  });
  await cdp.call('Page.navigate', { url: `${origen}/k3shell.html?v18=1` }, ses);
  pinta(`· servidor ${origen} · 390×844 dpr ${DPR} táctil · CPU ×${CPU} · ?v18=1 · umbral ${UMBRAL} ms · etiqueta ${ETIQUETA} · iframe ${PANTALLA ? 'EN PANTALLA' : 'off-screen (artifact esperado)'} · shell vacía (instancia única)`);
  const tShell = Date.now(); let shellLista = false;
  while (Date.now() - tShell < 30000) { try { if (await ev(cdp, ses, `document.readyState === 'complete' && !!document.body`, 5, false)) { shellLista = true; break; } } catch (e) { } await cdp.bombear(0.3); }
  if (!shellLista) { limpiar(); throw new Error('la shell no cargó en 30 s'); }
  pinta('· shell lista; inyectando ep_caminar.js + temporada_movil.js…');
  for (const f of ['ep_caminar.js', 'ep3_e2e.js', 'ep4_e2e.js', 'ep5_e2e.js', 'ep6_e2e.js', 'temporada_movil.js']) {
    const cod = fs.readFileSync(path.join(RAIZ, 'tests', 'qa', f), 'utf8');
    await ev(cdp, ses, 'eval(' + JSON.stringify(cod) + '); "ok"', 60, false);
  }
  const tBot = Date.now();
  while (Date.now() - tBot < 60000) { try { if (await ev(cdp, ses, `!!(window.AV && AV.temporadaMovilTest && AV.epCaminar)`, 5, false)) break; } catch (e) { } await cdp.bombear(0.5); }
  pinta('· bot listo (AV.temporadaMovilTest) · precalentando caché HTTP con un iframe desechable (misma URL que usará el bot)…');
  await ev(cdp, ses, `(() => { const w = document.createElement('iframe'); w.style.cssText = 'position:fixed;left:-2000px;top:0;width:390px;height:844px;border:0'; w.src = 'index.html?pack=cap1&v18=1&calidad=bajo'; window.__k3warm = w; document.body.appendChild(w); return 'warm-up creado'; })()`, 15, false).then(x => pinta('· ' + x));
  const tW = Date.now(); let warmListo = false, ultRec = -1, estabil = 0;
  while (Date.now() - tW < 210000) {
    try {
      const st = await ev(cdp, ses, `(() => { const w = window.__k3warm; if (!w) return null; const x = w.contentWindow; let listo = false; try { listo = !!(x && x.AV && x.AV.G && x.AV.G.actores && (x.AV.G.actores.player3D || x.AV.G.actores.failed3D)); } catch (e) {} let nRec = 0; try { nRec = x && x.performance ? x.performance.getEntriesByType('resource').length : 0; } catch (e) {} return JSON.stringify({ listo, nRec }); })()`, 15, false).then(s => { try { return JSON.parse(s); } catch (e) { return null; } });
      if (st) {
        if (st.listo) { warmListo = true; pinta('· warm-up: juego listo (' + Math.round((Date.now() - tW) / 1000) + ' s, ' + st.nRec + ' recursos)'); break; }
        if (st.nRec === ultRec) estabil++; else { estabil = 0; ultRec = st.nRec; }
        if (estabil >= 8 && ultRec > 40) { pinta('· warm-up: red estable (' + ultRec + ' recursos, ~16 s sin nuevas peticiones)'); break; }
      }
    } catch (e) { }
    await cdp.bombear(2);
  }
  await ev(cdp, ses, `(() => { try { window.__k3warm && window.__k3warm.remove(); window.__k3warm = null; } catch (e) {} return 'warm-up retirado'; })()`, 10, false).then(x => pinta('· ' + x + ' (listo=' + warmListo + ')'));
  pinta('· temporadaMovilTest caps:[1] con el pulgar (los primeros min del cap. 1)…');
  const latido = setInterval(async () => {
    try {
      const d = await ev(cdp, ses, `(() => {
        const frs = [...document.querySelectorAll('iframe')];
        const fr = frs.find(x => { try { const w = x.contentWindow; return w && w.__frames; } catch (e) { return false; } });
        if (!fr) return 'sin-iframe';
        const W = fr.contentWindow;
        let cola = null;
        try { if (W.AV && W.AV.G && W.AV.G.mundo && W.AV.G.mundo.streaming && W.AV.G.mundo.streaming.stats) { const st = W.AV.G.mundo.streaming.stats(); cola = { trabajos: st.trabajos, descargando: st.descargando }; } } catch (e) {}
        ${PANTALLA ? `try { let listo = false; try { listo = !!(W.AV && W.AV.G && W.AV.G.mundo && W.AV.G.mundo.streaming); } catch (e) {} if (listo && !fr.dataset.k3pantalla) { fr.style.cssText = 'position:fixed;left:0;top:0;width:390px;height:844px;border:0;z-index:2147483647;background:#000'; fr.dataset.k3pantalla = '1'; } } catch (e) {}` : ''}
        const rc = fr.getBoundingClientRect();
        return JSON.stringify({ n: W.__frames.n, tir: (W.__tirones || []).length, ult: (W.__tirones || []).slice(-1)[0] || null, vis: W.document.visibilityState, rect: [Math.round(rc.left), Math.round(rc.top), Math.round(rc.width), Math.round(rc.height)], cola });
      })()`, 15, false);
      pinta('· latido: ' + d);
    } catch (e) { pinta('· latido: eval falló (' + String(e.message || e).slice(0, 80) + ')'); }
  }, 30000);
  let r = null, fallo = null;
  const tJuego = Date.now();
  try { r = await ev(cdp, ses, `AV.temporadaMovilTest({ caps: [1], idioma: 'es' })`, 2400); } catch (e) { fallo = e.message; }
  const durJuegoS = Math.round((Date.now() - tJuego) / 1000);
  clearInterval(latido);
  pinta('· temporadaMovilTest devolvió en ' + durJuegoS + ' s' + (fallo ? ' · EXCEPCIÓN: ' + fallo.slice(0, 300) : ''));
  const datos = await ev(cdp, ses, `(() => {
    const frs = [...document.querySelectorAll('iframe')];
    const fr = frs.find(x => { try { const w = x.contentWindow; return w && w.AV && w.AV.pack === 'cap1' && w.__frames; } catch (e) { return false; } });
    const W = fr ? fr.contentWindow : null;
    const mirT = window.__tironesMirror || [], mirF = window.__framesMirror || null, mirL = window.__longtasksMirror || [];
    const wT = W ? (W.__tirones || []) : [], wF = W ? W.__frames : null, wL = W ? (W.__longtasks || []) : [];
    // el espejo (padre) sobrevive a que temporadaMovil borre el iframe: se prefiere si tiene más traza.
    // v3: el espejo viejo fue sustituido por __k3trazas (mapa versionado por documento); se elige la
    // entrada con MÁS cuadros (la del juego; la página en blanco que temporadaMovil carga al final
    // escribe su propia clave sin tocar la del juego).
    let E = null;
    try { const T = window.__k3trazas || {}; let me = null, mn = -1; for (const k in T) { const n = T[k] && T[k].frames ? T[k].frames.n : 0; if (n > mn) { mn = n; me = k; } } if (me) E = T[me]; } catch (e) {}
    const eT = E ? (E.tirones || []) : [], eF = E ? E.frames : null, eL = E ? (E.longtasks || []) : [], eD = E ? (E.deltas || []) : [];
    const mejor = eT.length > 0 ? (eT.length >= wT.length && (!mirT.length || eT.length >= mirT.length)) : (mirT.length >= wT.length);
    const baseT = eT.length ? eT : (mejor ? mirT : wT);
    const baseF = (eT.length && eF) || (mejor && mirF) || wF || window.__frames || { n: 0, sumMs: 0 };
    const out = { enIframe: !!fr, porEspejo: eT.length > 0 || (mejor && mirT.length > 0), tirones: baseT, longtasks: (eL.length ? eL : (mejor ? mirL : wL)).concat(eL.length ? wL.concat(mirL) : (mejor ? wL : mirL)), frames: baseF, deltas: eD.length ? eD : ((window.__deltasMirror && window.__deltasMirror.length >= ((W && W.__deltas) || []).length) ? window.__deltasMirror : (W ? (W.__deltas || []) : [])), heapFin: W && W.performance && W.performance.memory ? Math.round(W.performance.memory.usedJSHeapSize / 1048576) : (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1) };
    out.tironesMain = window.__tirones || []; out.framesMain = window.__frames || null;
    return JSON.stringify(out);
  })()`, 30, false).then(x => { try { return JSON.parse(x); } catch (e) { return null; } }).catch(() => null);
  const tirones = (datos && datos.tirones) || [];
  const frames = (datos && datos.frames) || { n: 0, sumMs: 0 };
  tirones.sort((a, b) => b.ms - a.ms);
  pinta('· registrador en iframe del juego: ' + (datos ? datos.enIframe : '?') + (datos && datos.porEspejo ? ' (datos por espejo del padre)' : '') + ' · cuadros totales: ' + frames.n + ' · ms medios: ' + (frames.n ? Math.round(frames.sumMs / frames.n) : 0) + ' · tirones >' + UMBRAL + ' ms: ' + tirones.length + (datos && datos.framesMain ? ' · (shell principal: ' + datos.framesMain.n + ' cuadros, ' + (datos.tironesMain || []).length + ' tirones)' : ''));
  const dl = (datos && datos.deltas) || [];
  if (dl.length) { const s = dl.slice().sort((a, b) => a - b); const q = p => s[Math.min(s.length - 1, Math.floor(s.length * p))]; pinta('· deltas cuadro (ms): p50 ' + q(0.5) + ' · p90 ' + q(0.9) + ' · p95 ' + q(0.95) + ' · p99 ' + q(0.99) + ' · max ' + s[s.length - 1] + ' · n ' + dl.length); }
  pinta('· TOP 10 tirones (ms):');
  for (const t of tirones.slice(0, 10)) pinta('  #' + (tirones.indexOf(t) + 1) + ' ' + t.ms + ' ms @ ' + t.s + ' s · heap ' + t.heapMB + ' MB · ' + (t.fase || '-'));
  const lts = ((datos && datos.longtasks) || []).slice().sort((a, b) => b.d - a.d);
  pinta('· TOP 10 longtasks (ms):');
  for (const l of lts.slice(0, 10)) pinta('  lt ' + l.d + ' ms @ ' + l.s + ' s · ' + l.n + (l.a ? ' · atrib ' + l.a : ''));
  if (r) pinta('· batería: ' + r.passed + '/' + r.total);
  pinta('· errores de consola: ' + errores.length + (errores.length ? ' · ' + errores.slice(0, 3).join(' | ') : ''));
  fs.writeFileSync(path.join(SALIDA, 'tirones-' + ETIQUETA + '.json'), JSON.stringify({ etiqueta: ETIQUETA, cpu: CPU, dpr: DPR, v18: true, pantalla: PANTALLA, umbralMs: UMBRAL, duracionJuegoS: durJuegoS, enIframe: datos ? !!datos.enIframe : null, cuadros: frames.n, msMedio: frames.n ? Math.round(frames.sumMs / frames.n) : 0, heapFinMB: datos ? datos.heapFin : -1, deltas: dl, shellPrincipal: datos && datos.framesMain ? { cuadros: datos.framesMain.n, nTirones: (datos.tironesMain || []).length } : null, bateria: r ? { passed: r.passed, total: r.total } : null, nTirones: tirones.length, tirones, longtasks: (datos && datos.longtasks) || [], errores }, null, 1));
  try { const errsJuego = await ev(cdp, ses, 'JSON.stringify((window.__aveErrores || []).slice(0, 8))', 10, false); pinta('· __aveErrores de la página: ' + errsJuego); } catch (e) { }
  limpiar();
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { pinta('· aviso: perfil temporal no se pudo borrar (se libera solo): ' + perf); }
})();
