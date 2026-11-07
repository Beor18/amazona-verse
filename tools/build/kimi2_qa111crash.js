#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — QA-111: repro acotado del «crash de navegador entero» en corridas
   acumuladas (familia QA-111; visto en KIMI-130 corridas 6/8/9 al navegar entre las ~16-18 pruebas V18 en
   UN MISMO proceso de Chrome headless).

   Hipótesis: la suite reutiliza un solo navegador y recarga la página del juego (~muy pesada: mundo + GLB +
   GPU dpr 3) una vez por prueba; tras ~16 cargas algo a nivel de PROCESO (GPU process / browser process)
   se agota y el navegador entero muere (WebSocket error, la recarga no revivió). En un dispositivo real la
   página se carga UNA vez, así que si la hipótesis se confirma es artefacto del arnés, no del juego.

   Esta sonda reproduce el PATRÓN de navegación de la suite con cargas baratas: mismo navegador, un solo
   target, N navegaciones seguidas al juego (semilla + entrada + asentado corto), muestreando tras cada carga
   heap del renderer, info.memory (geo/tex/prog) y calls. Escucha Inspector.targetCrashed (razón: oom/gpu/…)
   y detecta la muerte del navegador con ping Browser.getVersion. Escribe JSON incremental (sobrevive a cortes).

   Uso: node tools/build/kimi2_qa111crash.js --etiqueta r1 [--cargas 20] [--asentado 4]
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
const LISTO_JS = CFG.listo_js || 'window.AV && window.AV.G';
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? parseInt(process.argv[i + 1], 10) : d; }
const ETIQUETA = (process.argv.indexOf('--etiqueta') > 0 ? process.argv[process.argv.indexOf('--etiqueta') + 1] : 'r1');
const CARGAS = arg('--cargas', 20);
const ASENTADO = arg('--asentado', 4);
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi111');
fs.mkdirSync(SALIDA, { recursive: true });

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi2q111-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
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
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); this.eventos = []; ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } else if (d.method) this.eventos.push(d); }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(method, params, sessionId, timeoutMs) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method, params: params || {}, sessionId })); if (timeoutMs) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + method)); } }, timeoutMs); }); }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function evaluar(cdp, ses, exp, timeoutS, promesa) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: promesa !== false, returnByValue: true }, ses, (timeoutS || 30) * 1000);
  if (r.exceptionDetails) { const d = r.exceptionDetails; throw new Error('JS@' + (d.lineNumber != null ? d.lineNumber + ':' + d.columnNumber : '?') + ': ' + JSON.stringify(d.exception && d.exception.description || d.text).slice(0, 600)); }
  return r.result ? r.result.value : undefined;
}

const SEMILLA_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi2q111-' + Math.random().toString(36).slice(2, 10),
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

const MUESTRA_JS = `(() => { try { const G = window.AV.G, m = G.renderer.renderer.info.memory;
  return { heap: (performance.memory && performance.memory.usedJSHeapSize) ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
    geo: m.geometries, tex: m.textures, prog: G.renderer.renderer.info.programs.length,
    calls: G.renderer.stats().calls, tris: G.renderer.stats().triangulos }; } catch (e) { return { err: String(e && e.message || e) }; } })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2q111-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--window-size=390,844', 'about:blank'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 150; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools en 30 s: ' + err.slice(0, 300));
}
async function memProcesosChrome() {
  // memoria de LOS PROCESOS de ESTE navegador (el perfil kimi2q111-* va en la línea de comandos de todos):
  // WorkingSet de browser + renderer(s) + GPU process, en MB. Filtra por perfil para no contar Chrome ajenos.
  // (script .ps1 temporal: la cadena de comillas cmd→powershell con comillas anidadas devolvía null)
  let ps1 = null;
  try {
    ps1 = path.join(os.tmpdir(), 'kimi2q111_mem.ps1');
    fs.writeFileSync(ps1, "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*kimi2q111-*' } | Group-Object { if ($_.CommandLine -like '*--type=gpu-process*') { 'gpu' } elseif ($_.CommandLine -like '*--type=*') { 'hijo' } else { 'browser' } } | ForEach-Object { $_.Name + ':' + [math]::Round((($_.Group | Measure-Object WorkingSetSize -Sum).Sum)/1MB)) }");
    const out = execSync('powershell -NoProfile -ExecutionPolicy Bypass -File "' + ps1 + '"', { timeout: 20000, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const r = { totalMB: 0 };
    for (const parte of out.split('\n')) { const m = parte.trim().match(/^(browser|hijo|gpu):(\d+)$/); if (m) { r[m[1] + 'MB'] = parseInt(m[2], 10); r.totalMB += parseInt(m[2], 10); } }
    return out ? r : null;
  } catch (e) { return null; }
  finally { try { if (ps1) fs.rmSync(ps1, { force: true }); } catch (e) { } }
}
function mataPorPerfil() {
  try {
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi2q111-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const res = { etiqueta: ETIQUETA, patron: `${CARGAS} cargas del juego en UN navegador (mismo target, Page.navigate por carga, como la suite V18)`, pantalla: 'movil 390x844@3 cpuX4 (iPhone emulado)', url: 'index.html?pack=cap1&mapa=real&v18=1', head: null, cargas: [], crash: null };
  const outJson = path.join(SALIDA, `qa111crash_${ETIQUETA}.json`);
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  let stderr = '';
  chrome.stderr.on('data', d => { stderr += d; if (stderr.length > 20000) stderr = stderr.slice(-20000); });
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const t0all = Date.now();
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Inspector.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: 4 }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS }, ses);

    for (let i = 1; i <= CARGAS; i++) {
      const carga = { n: i };
      try {
        const nav = await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&v18=1` }, ses);
        carga.nav = nav && nav.loaderId ? 'ok' : JSON.stringify(nav).slice(0, 120);
        // esperar el MOTOR (mismo criterio que la suite: engine listo en portada; ENTRAR_JS pulsa Jugar después)
        let listo = false; const t0 = Date.now();
        while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
          try { if (await evaluar(cdp, ses, `!!(${LISTO_JS})`, 10, false)) { listo = true; break; } } catch (e) { }
          await cdp.bombear(0.5);
        }
        if (!listo) { carga.error = 'no listo en ' + (CFG.espera_listo_s || 150) + ' s'; res.cargas.push(carga); fs.writeFileSync(outJson, JSON.stringify(res, null, 1)); continue; }
        const ent = await evaluar(cdp, ses, ENTRAR_JS, 120);
        carga.entrar = String(ent).slice(0, 80);
        await cdp.bombear(ASENTADO);
        carga.fin = await evaluar(cdp, ses, MUESTRA_JS, 20, false);
        carga.procesos = await memProcesosChrome();
        if (!res.head) res.head = await evaluar(cdp, ses, `(() => { try { return (AV.G.build && (AV.G.build.commit || AV.G.build.id)) || 'desconocido'; } catch (e) { return 'desconocido'; } })()`, 10, false);
      } catch (e) {
        carga.error = String(e && e.message || e);
        // ¿crasheó la pestaña o el navegador entero?
        const ev = cdp.eventos.filter(d => d.method === 'Inspector.targetCrashed').pop();
        if (ev) { res.crash = { enCarga: i, metodo: 'Inspector.targetCrashed', razon: ev.params && ev.params.reason, status: ev.params && ev.params.status, exitCode: ev.params && ev.params.exitCode }; }
        try { await cdp.call('Browser.getVersion', {}, undefined, 8000); res.navegadorVivoTrasCrash = true; }
        catch (e2) { res.navegadorVivoTrasCrash = false; }
      }
      res.cargas.push(carga);
      fs.writeFileSync(outJson, JSON.stringify(res, null, 1)); // incremental
      const m = carga.fin || {}, pr = carga.procesos || {};
      console.log(`[carga ${i}/${CARGAS}] ${carga.error ? 'ERROR ' + carga.error.slice(0, 90) : 'heap=' + m.heap + ' geo=' + m.geo + ' tex=' + m.tex + ' prog=' + m.prog + ' calls=' + m.calls} | chrome browser=${pr.browserMB ?? '-'} hijo=${pr.hijoMB ?? '-'} gpu=${pr.gpuMB ?? '-'} total=${pr.totalMB ?? '-'} MB`);
      if (res.crash) { console.log('CRASH capturado: ' + JSON.stringify(res.crash)); break; }
      // si el navegador murió sin evento (ws roto), el próximo evaluar fallará y se reporta arriba
    }
    try { await cdp.call('Browser.getVersion', {}, undefined, 8000); res.navegadorVivoFinal = true; } catch (e) { res.navegadorVivoFinal = false; }
  } catch (e) { res.error = String(e && e.message || e); }
  res.duracionS = Math.round((Date.now() - t0all) / 1000);
  res.stderrChrome = stderr.replace(/\s+/g, ' ').slice(-800);
  fs.writeFileSync(outJson, JSON.stringify(res, null, 1));
  try { chrome.kill('SIGKILL'); } catch (e) { }
  mataPorPerfil();
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close();
  console.log('OK -> ' + outJson + (res.crash ? ' (con crash)' : ' (sin crash)'));
  process.exit(0);
})();
