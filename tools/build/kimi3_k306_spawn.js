#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-306: sonda de la VISTA DEL SPAWN contra el sitio publicado.
   Lee stats (fps/calls/tris/memoria) + captura del lienzo en «medio» y «alto», con asentado real
   (streaming trabajos 0). Solo lectura: no toca el juego. Uso:
   node tools/build/kimi3_k306_spawn.js --url https://www.amazonaverse.com/juego [--etiqueta r1]
   Salida: docs/img/kimi306/k306_spawn_<etiqueta>.json + k306_spawn_<calidad>_<etiqueta>.jpg */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn, execSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const URLBASE = arg('--url', '').replace(/\/+$/, '');
const ETIQUETA = arg('--etiqueta', 'r1');
const ANCHO = 1600, ALTO = 900;
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi306');
fs.mkdirSync(SALIDA, { recursive: true });
const RES = { url: URLBASE, etiqueta: ETIQUETA, consola: { errores: 0, muestras: [] }, pasadas: {} };
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = () => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 60) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result ? r.result.value : undefined; }
const STATS_JS = `new Promise(ok => requestAnimationFrame(() => requestAnimationFrame(() => { try {
  const G = window.AV.G; const st = G.renderer.stats(); const S = G.S;
  const fis = (G.mundo && G.mundo.streaming) ? G.mundo.streaming.stats() : null;
  ok(JSON.stringify({ fps: st.fps, calls: st.calls, triangulos: st.triangulos, calidad: st.calidad,
    pos: { x: +S.pos.x.toFixed(1), y: +S.pos.y.toFixed(1), z: +S.pos.z.toFixed(1) },
    memoria: G.renderer.renderer.info.memory, heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
    streaming: fis ? { descargando: fis.descargando, trabajos: fis.trabajos, zonasCerca: fis.zonasCerca } : null }));
} catch (e) { ok(JSON.stringify({ error: String(e) })); } })))`;
const ASENTADO_JS = `new Promise(ok => { const t0 = Date.now(); const f = () => { try { const G = window.AV.G; const fis = (G.mundo && G.mundo.streaming) ? G.mundo.streaming.stats() : null; if (fis && fis.trabajos === 0 && fis.descargando === 0) return ok('asentado ' + Math.round(Date.now() - t0) + ' ms'); if (Date.now() - t0 > 90000) return ok('tope ' + Math.round(Date.now() - t0) + ' ms trabajos=' + (fis ? fis.trabajos : '?')); requestAnimationFrame(f); } catch (e) { ok('error ' + e); } }; f(); })`;
function guardar() { try { fs.writeFileSync(path.join(SALIDA, `k306_spawn_${ETIQUETA}.json`), JSON.stringify(RES, null, 1)); } catch (e) { } }
(async () => {
  if (!URLBASE) throw new Error('falta --url');
  try { RES.gpu = execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_VideoController | Where-Object { $_.AdapterRAM -gt 0 } | Select-Object -First 1).Name"', { timeout: 15000 }).toString().trim(); } catch (e) { RES.gpu = '?'; }
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3-k306-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', `--window-size=${ANCHO},${ALTO}`], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoDev) { try { chrome.kill(); } catch (e) { } throw new Error('Chrome no abrió DevTools: ' + err.slice(0, 200)); }
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') { RES.consola.errores++; if (RES.consola.muestras.length < 8) RES.consola.muestras.push('EXC ' + JSON.stringify(d.params.exceptionDetails).slice(0, 300)); } if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') { RES.consola.errores++; if (RES.consola.muestras.length < 8) RES.consola.muestras.push('ERR ' + JSON.stringify(d.params.args).slice(0, 300)); } });
  guardar();
  for (const calidad of ['medio', 'alto']) {
    const P = { calidad };
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); } catch(e){}" }, ses);
    await cdp.call('Page.navigate', { url: `${URLBASE}/index.html?calidad=${calidad}` }, ses);
    const t0 = Date.now(); let okL = false;
    while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { okL = true; break; } } catch (e) { } await cdp.bombear(0.5); }
    if (!okL) { P.error = 'no arrancó'; RES.pasadas[calidad] = P; guardar(); continue; }
    P.preparar = await ev(cdp, ses, CFG.preparar_js, 300);
    P.asentado = await ev(cdp, ses, ASENTADO_JS, 120);
    P.stats = JSON.parse(await ev(cdp, ses, STATS_JS, 30));
    const shot = await ev(cdp, ses, `(window.AV.G.renderer.snapshot ? window.AV.G.renderer.snapshot() : null)`, 30);
    if (shot && shot !== 'null') { const ruta = path.join(SALIDA, `k306_spawn_${calidad}_${ETIQUETA}.jpg`); fs.writeFileSync(ruta, Buffer.from(shot.split(',')[1], 'base64')); P.captura = ruta; } else P.captura = 'null';
    RES.pasadas[calidad] = P; guardar();
    try { await cdp.call('Target.closeTarget', { targetId: tid }, undefined, 5000); } catch (e) { }
  }
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  try { chrome.kill(); } catch (e) { }
  await new Promise(r => setTimeout(r, 1200));
  try { console.log('· ' + execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(AQUI, 'kimi2_mata_perfil.ps1')}" ${path.basename(perf)}`, { timeout: 30000 }).toString().trim()); } catch (e) { }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  guardar();
  console.log(JSON.stringify(RES.pasadas, null, 1));
  process.exit(0);
})().catch(e => { console.error('FATAL', e); guardar(); process.exit(1); });
