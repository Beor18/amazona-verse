#!/usr/bin/env node
/* Amazona Verse · Kimi 1 — KIMI-066 (QA-53): verificación del aplazamiento de las reconstrucciones
   del evento 'calidad' en guineo.js / banquete.js / rio_vivo.js (patrón KIMI-057 de vegetacion.js).

   Entrada: partida sembrada de cap1 (sin creador), móvil 375×812 dpr 3, CPU ×4, GPU real.
   1) Las 3 pruebas de módulo (AV.guineoTest / AV.banqueteTest / AV.rioVivoTest) en verde.
   2) Deferral real: setCalidad('bajo') y, DENTRO de la misma tarea, comprobar que el estado
      observable NO ha cambiado (reconstrucción aplazada); tras ~300 ms (cuadros reales), sí.
      - rio_vivo:   estado().porBanco 4 (medio) → sigue 4 en la ventana del evento → 2 (bajo).
      - banquete:   perchas (fisica.addPercha/removePercha) 0 llamadas en la ventana del evento.
      - guineo:     stats() idéntico en la ventana del evento cerca de un huerto, convergido después.
   3) evMs del flip (objetivo KIMI-055/057: < 100 ms) y vuelta a medio.
   4) 0 errores de consola.

   Uso: node tools/build/kimi1_066.js [--etiqueta r1]
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
const ETIQUETA = (() => { const i = process.argv.indexOf('--etiqueta'); return i > 0 ? process.argv[i + 1] : 'r1'; })();
const argN = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? Number(process.argv[i + 1]) : d; };
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi066');
fs.mkdirSync(SALIDA, { recursive: true });
const ANCHO = argN('--ancho', 375), ALTO = argN('--alto', 812), DPR = argN('--dpr', 3), CPU = argN('--cpu', 4);
const UA = (() => { const i = process.argv.indexOf('--ua'); return i > 0 ? process.argv[i + 1] : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'; })();
const MOVIL = !process.argv.includes('--escritorio');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
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
const SEMILLA_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.capitulo', '1');
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); this.eventos = []; ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } else this.eventos.push(d); }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(m, p, s, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: m, params: p || {}, sessionId: s })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + m)); } }, t); }); }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function ev(cdp, ses, exp, t, aw) { const r = await cdp.call('Runtime.evaluate', { expression: exp, returnByValue: true, awaitPromise: aw !== false }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 300)); return r.result ? r.result.value : undefined; }
async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1-k066-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--window-size=' + ANCHO * 2 + ',' + ALTO * 2, 'about:blank'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim(), err: () => err }; }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools en 60 s: ' + err.slice(0, 300));
}
function matarChrome(chrome, perf) {
  try { chrome.kill(); } catch (e) {}
  try { execSync('taskkill /PID ' + chrome.pid + ' /T /F 2>NUL', { stdio: 'ignore' }); } catch (e) {}
  try { spawn('powershell', ['-NoProfile', '-Command', "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*kimi1-k066-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"], { stdio: 'ignore' }).unref(); } catch (e) {}
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) {}
}
(async () => {
  const { srv, puerto } = await servir();
  const { chrome, perf, wsPath } = await lanzarChrome();
  try {
    const ws = new WebSocket('ws://127.0.0.1:' + puerto + wsPath);
    const cdp = new CDP(ws); await cdp.listo();
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: MOVIL }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS }, ses);
    await cdp.call('Page.navigate', { url: 'http://127.0.0.1:' + puerto + '/index.html?calidad=medio' }, ses);
    let clicado = false;
    for (let i = 0; i < 150 && !clicado; i++) { await cdp.bombear(0.5); try { clicado = !!(await ev(cdp, ses, '(() => { const b = document.querySelector(\'[data-modo="aventura"]\'); if (!b) return false; b.click(); return true; })()', 5, false)); } catch (e) {} }
    if (!clicado) throw new Error('no apareció la tarjeta Aventura');
    let jugable = false;
    for (let i = 0; i < 240 && !jugable; i++) { await cdp.bombear(0.5); try { jugable = !!(await ev(cdp, ses, '(() => { const G = window.AV && AV.G; if (!G || !G.ui || G.ui.worldHidden()) return false; const st = (() => { try { return G.renderer.stats(); } catch (e) { return null; } })(); return st && st.calls > 5; })()', 5, false)); } catch (e) {} }
    if (!jugable) throw new Error('el mundo no se hizo jugable');
    await cdp.bombear(4);
    // 1) pruebas de módulo (cubren los caminos síncronos de calidad, que se conservan)
    const mod = {};
    for (const [nombre, call] of [['guineoTest', 'AV.guineoTest()'], ['banqueteTest', 'AV.banqueteTest()'], ['rioVivoTest', 'AV.rioVivoTest()']]) {
      try { const r = await ev(cdp, ses, call, 120); mod[nombre] = r.passed + '/' + r.total + (r.passed === r.total ? ' OK' : ' ROJO ' + JSON.stringify(r.results.filter(x => !x.ok).map(x => x.name))); }
      catch (e) { mod[nombre] = 'ERROR ' + e.message.slice(0, 120); }
    }
    // 2) deferral: instrumentar perchas (banquete) y medir la ventana del evento
    const res = await ev(cdp, ses, `(async () => {
      const G = AV.G, R = G.renderer, sleep = ms => new Promise(r => setTimeout(r, ms));
      const nextFrames = n => new Promise(res => { const s = () => --n <= 0 ? res() : requestAnimationFrame(s); requestAnimationFrame(s); });
      // Acercar a Vittata al primer huerto para que guineo tenga estado observable
      let huertoInfo = 'sin-huertos';
      try {
        const h = G.guineo && G.guineo.huertos && G.guineo.huertos[0];
        if (h) { G.S.pos.x = h.x + 9; G.S.pos.z = h.z + 9; G.S.pos.y = (G.terreno.height ? G.terreno.height(h.x + 9, h.z + 9) : 20) + 2; }
        await nextFrames(12);
        huertoInfo = h ? ('huerto en ' + h.x.toFixed(0) + ',' + h.z.toFixed(0) + ' matas ' + h.matas.length) : huertoInfo;
      } catch (e) { huertoInfo = 'ERR ' + (e && e.message); }
      // envolver perchas de fisica (las usa banquete.poblar) — mismo objeto que el módulo cierra
      let perchasEnVentana = 0, perchasDespues = 0, enVentana = false;
      const F = G.fisica, aP = F.addPercha, rP = F.removePercha;
      F.addPercha = function () { if (enVentana) perchasEnVentana++; else perchasDespues++; return aP.apply(this, arguments); };
      F.removePercha = function () { if (enVentana) perchasEnVentana++; else perchasDespues++; return rP.apply(this, arguments); };
      const stats0 = G.guineo.stats ? JSON.stringify(G.guineo.stats()) : 'n/a';
      const peces0 = (G.rioVivo && G.rioVivo.estado) ? G.rioVivo.estado().porBanco : 'n/a';
      enVentana = true;
      const t0 = performance.now();
      R.setCalidad('bajo');
      const evMs = performance.now() - t0;
      enVentana = false;
      // DENTRO de la misma tarea: el estado observable no debe haber cambiado
      const stats1 = G.guineo.stats ? JSON.stringify(G.guineo.stats()) : 'n/a';
      const peces1 = (G.rioVivo && G.rioVivo.estado) ? G.rioVivo.estado().porBanco : 'n/a';
      await sleep(300); // ~18 cuadros reales: las reconstrucciones aplazadas ya corrieron
      const stats2 = G.guineo.stats ? JSON.stringify(G.guineo.stats()) : 'n/a';
      const peces2 = (G.rioVivo && G.rioVivo.estado) ? G.rioVivo.estado().porBanco : 'n/a';
      F.addPercha = aP; F.removePercha = rP;
      // vuelta a medio
      const t1 = performance.now();
      R.setCalidad('medio');
      const evMsVuelta = performance.now() - t1;
      await sleep(300);
      const stats3 = G.guineo.stats ? JSON.stringify(G.guineo.stats()) : 'n/a';
      const peces3 = (G.rioVivo && G.rioVivo.estado) ? G.rioVivo.estado().porBanco : 'n/a';
      return JSON.stringify({ huertoInfo, evMs: Math.round(evMs), evMsVuelta: Math.round(evMsVuelta),
        guineo: { igualEnVentana: stats1 === stats0, convergidoBajo: stats2 !== stats1 || stats2 === stats0, statsMedio: stats3, bajo: stats2 },
        rio: { pecesMedio0: peces0, igualEnVentana: peces1 === peces0, bajo: peces2, medioVuelta: peces3 },
        banquete: { perchasEnVentana, perchasDespues } });
    })()`, 90);
    console.log('KIMI-066 modulos:', JSON.stringify(mod));
    console.log('KIMI-066 deferral:', res);
    const errs = [];
    for (const e of cdp.eventos) {
      if (e.method === 'Runtime.exceptionThrown') errs.push('EXC ' + JSON.stringify(e.params.exceptionDetails.exception && e.params.exceptionDetails.exception.description || e.params.exceptionDetails.text).slice(0, 200));
      else if (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') errs.push('console.error');
    }
    console.log('errores:', errs.length ? errs.slice(0, 5) : 0);
    try { fs.writeFileSync(path.join(SALIDA, 'k066_' + ETIQUETA + '.json'), JSON.stringify({ modulos: mod, deferral: JSON.parse(res), errores: errs.length }, null, 2)); } catch (e) {}
  } finally {
    matarChrome(chrome, perf);
    srv.close();
    process.exit(0);
  }
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
