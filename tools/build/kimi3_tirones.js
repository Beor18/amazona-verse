#!/usr/bin/env node
/* KIMI-3 · TIRONES-móvil · cola 10:55 UTC 7-nov (coordinadora): «Kimi 3 · tirones en móvil: con la
   traza de rendimiento del iPhone emulado, los 3 tirones más largos de los primeros 10 min del
   cap. 1 (con V18) y su arreglo». Réplica del playtest cap1 (kimi3_playtest_cap1.js) con:
   - ?v18=1 (la V18, como pide el encargo)
   - dpr 3 + CPU ×4 (perfil iPhone estándar de este carril)
   - un registrador de cuadros inyectado ANTES de los scripts de la página: envuelve rAF y anota
     todo cuadro >250 ms con {s desde inicio, ms, heap MB, fase AV} → window.__tirones.
   El juego no se toca: solo corre el bot de QA (temporadaMovilTest caps:[1]) y vuelca la traza.
   Uso: node tools/build/kimi3_tirones.js [--cpu 4] [--dpr 3] [--salida DIR] [--etiqueta r1] */
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
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end('400'); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end('403'); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
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
    window.__longtasks = [];
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
    setInterval(function(){ try { if (window.parent && window.parent !== window) { window.parent.__tironesMirror = window.__tirones; window.parent.__framesMirror = window.__frames; window.parent.__longtasksMirror = window.__longtasks; } } catch (e) {} }, 1000);
    window.requestAnimationFrame = function(cb){
      return orig(function(t){
        var now = performance.now(); var d = now - last; last = now;
        window.__frames.n++; window.__frames.sumMs += d;
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
  await cdp.call('Page.navigate', { url: `${origen}/index.html?v18=1` }, ses);
  pinta(`· servidor ${origen} · 390×844 dpr ${DPR} táctil · CPU ×${CPU} · ?v18=1 · umbral ${UMBRAL} ms · etiqueta ${ETIQUETA}`);
  const t0 = Date.now(); let listo = false;
  while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(window.AV && AV.G && AV.G.actores && (AV.G.actores.player3D || AV.G.actores.failed3D))`, 10, false)) { listo = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!listo) { limpiar(); throw new Error('el juego no arrancó en 240 s'); }
  pinta('· juego listo; inyectando ep_caminar.js + temporada_movil.js…');
  for (const f of ['ep_caminar.js', 'ep3_e2e.js', 'ep4_e2e.js', 'ep5_e2e.js', 'ep6_e2e.js', 'temporada_movil.js']) {
    const cod = fs.readFileSync(path.join(RAIZ, 'tests', 'qa', f), 'utf8');
    await ev(cdp, ses, 'eval(' + JSON.stringify(cod) + '); "ok"', 60, false);
  }
  pinta('· scripts listos · temporadaMovilTest caps:[1] con el pulgar (los primeros min del cap. 1)…');
  const latido = setInterval(async () => {
    try {
      const d = await ev(cdp, ses, `(() => { const frs = [...document.querySelectorAll('iframe')]; const fr = frs.find(x => { try { const w = x.contentWindow; return w && w.__frames; } catch (e) { return false; } }); const W = fr ? fr.contentWindow : null; return W ? JSON.stringify({ n: W.__frames.n, tir: (W.__tirones || []).length, ult: (W.__tirones || []).slice(-1)[0] || null }) : 'sin-iframe'; })()`, 15, false);
      pinta('· latido: ' + d);
    } catch (e) { pinta('· latido: eval falló (' + String(e.message || e).slice(0, 80) + ')'); }
  }, 60000);
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
    // el espejo (padre) sobrevive a que temporadaMovil borre el iframe: se prefiere si tiene más traza
    const mejor = mirT.length >= wT.length;
    const out = { enIframe: !!fr, porEspejo: mejor && mirT.length > 0, tirones: mejor ? mirT : wT, longtasks: (mejor ? mirL : wL).concat(mejor ? wL : mirL), frames: (mejor && mirF) || wF || window.__frames || { n: 0, sumMs: 0 }, heapFin: W && W.performance && W.performance.memory ? Math.round(W.performance.memory.usedJSHeapSize / 1048576) : (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1) };
    out.tironesMain = window.__tirones || []; out.framesMain = window.__frames || null;
    return JSON.stringify(out);
  })()`, 30, false).then(x => { try { return JSON.parse(x); } catch (e) { return null; } }).catch(() => null);
  const tirones = (datos && datos.tirones) || [];
  const frames = (datos && datos.frames) || { n: 0, sumMs: 0 };
  tirones.sort((a, b) => b.ms - a.ms);
  pinta('· registrador en iframe del juego: ' + (datos ? datos.enIframe : '?') + (datos && datos.porEspejo ? ' (datos por espejo del padre)' : '') + ' · cuadros totales: ' + frames.n + ' · ms medios: ' + (frames.n ? Math.round(frames.sumMs / frames.n) : 0) + ' · tirones >' + UMBRAL + ' ms: ' + tirones.length + (datos && datos.framesMain ? ' · (shell principal: ' + datos.framesMain.n + ' cuadros, ' + (datos.tironesMain || []).length + ' tirones)' : ''));
  pinta('· TOP 10 tirones (ms):');
  for (const t of tirones.slice(0, 10)) pinta('  #' + (tirones.indexOf(t) + 1) + ' ' + t.ms + ' ms @ ' + t.s + ' s · heap ' + t.heapMB + ' MB · ' + (t.fase || '-'));
  const lts = ((datos && datos.longtasks) || []).slice().sort((a, b) => b.d - a.d);
  pinta('· TOP 10 longtasks (ms):');
  for (const l of lts.slice(0, 10)) pinta('  lt ' + l.d + ' ms @ ' + l.s + ' s · ' + l.n + (l.a ? ' · atrib ' + l.a : ''));
  if (r) pinta('· batería: ' + r.passed + '/' + r.total);
  pinta('· errores de consola: ' + errores.length + (errores.length ? ' · ' + errores.slice(0, 3).join(' | ') : ''));
  fs.writeFileSync(path.join(SALIDA, 'tirones-' + ETIQUETA + '.json'), JSON.stringify({ etiqueta: ETIQUETA, cpu: CPU, dpr: DPR, v18: true, umbralMs: UMBRAL, duracionJuegoS: durJuegoS, enIframe: datos ? !!datos.enIframe : null, cuadros: frames.n, msMedio: frames.n ? Math.round(frames.sumMs / frames.n) : 0, heapFinMB: datos ? datos.heapFin : -1, shellPrincipal: datos && datos.framesMain ? { cuadros: datos.framesMain.n, nTirones: (datos.tironesMain || []).length } : null, bateria: r ? { passed: r.passed, total: r.total } : null, nTirones: tirones.length, tirones, longtasks: (datos && datos.longtasks) || [], errores }, null, 1));
  try { const errsJuego = await ev(cdp, ses, 'JSON.stringify((window.__aveErrores || []).slice(0, 8))', 10, false); pinta('· __aveErrores de la página: ' + errsJuego); } catch (e) { }
  limpiar();
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { pinta('· aviso: perfil temporal no se pudo borrar (se libera solo): ' + perf); }
})();
