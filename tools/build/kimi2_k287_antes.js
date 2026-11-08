#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-287: capturas «antes» de la compresión meshopt de los _hd.
   Encargo coordinadora 8-nov ~10:45/11:00 UTC: «Kimi 2 y 3: en cuanto lo anuncie en TAREAS_WEB.md, valídenlo
   con GPU. Capturas antes/después del spawn en medio y en alto (tienen que ser idénticas), la carga medida con
   kimi2_k244_carga.js, streamingTest y FPS. Mientras tanto, preparen las capturas «antes» en el HEAD actual.»

   Esta herramienta deja el juego EXACTAMENTE como está (solo lectura + capturas). Por calidad (medio/alto,
   escritorio 1600×900, GPU real) corre DOS pasadas con la misma semilla y encuadre: captura del spawn rasante
   y captura aérea (+35 m, el anillo de templos que serán comprimidos) + stats (calls/tris/FPS/memoria/heap/
   calidad/posición) + control de ruido de escena viva (diff píxel r1↔r2, mismo criterio que KIMI-271).

   Uso: node tools/build/kimi2_k287_antes.js [--etiqueta antes-r1] [--solo medio|alto]
   Salida: docs/img/kimi287/k287_antes_<calidad>_r<n>_{spawn,aerea}.jpg + k287_antes_<etiqueta>.json */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn, execSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ETIQUETA = arg('--etiqueta', 'antes-r1');
const SOLO = arg('--solo', '');
const SOLO_CONTROL = process.argv.includes('--solo-control');
const ANCHO = 1600, ALTO = 900, VUELA = 35;
const CALIDADES = (SOLO ? [SOLO] : ['medio', 'alto']);
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi287');
fs.mkdirSync(SALIDA, { recursive: true });
const RES = { tarea: 'KIMI-287', para: 'meshopt _hd (antes)', etiqueta: ETIQUETA, head: '', gpu: '', cuandos: new Date().toISOString(), pasadas: [], control: {}, consola: { errores: 0, muestras: [] } };
// --solo-control: conservar las pasadas ya volcadas en el JSON (no re-correrlas)
if (SOLO_CONTROL) { try { const prev = JSON.parse(fs.readFileSync(path.join(SALIDA, `k287_antes_${ETIQUETA}.json`), 'utf8')); if (Array.isArray(prev.pasadas) && prev.pasadas.length) { RES.pasadas = prev.pasadas; RES.head = prev.head; RES.gpu = prev.gpu; RES.cuandos = prev.cuandos; RES.consola = prev.consola || RES.consola; } } catch (e) { } }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = () => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result ? r.result.value : undefined; }
function guardar() { try { fs.writeFileSync(path.join(SALIDA, `k287_antes_${ETIQUETA}.json`), JSON.stringify(RES, null, 1)); } catch (e) { } }
const STATS_JS = `new Promise(ok => requestAnimationFrame(() => requestAnimationFrame(() => { try {
  const G = window.AV.G; const st = G.renderer.stats(); const S = G.S;
  const fis = (G.mundo && G.mundo.streaming) ? G.mundo.streaming.stats() : null;
  ok(JSON.stringify({ fps: st.fps, calls: st.calls, triangulos: st.triangulos, calidad: st.calidad,
    pos: { x: +S.pos.x.toFixed(1), y: +S.pos.y.toFixed(1), z: +S.pos.z.toFixed(1) },
    memoria: G.renderer.renderer.info.memory, heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
    streaming: fis ? { descargando: fis.descargando, trabajos: fis.trabajos, zonasCerca: fis.zonasCerca } : null }));
} catch (e) { ok(JSON.stringify({ error: String(e) })); } })))`;
(async () => {
  RES.head = execSync('git rev-parse --short HEAD', { cwd: RAIZ }).toString().trim();
  try { RES.gpu = execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_VideoController | Where-Object { $_.AdapterRAM -gt 0 } | Select-Object -First 1).Name"', { timeout: 15000 }).toString().trim(); } catch (e) { RES.gpu = '?'; }
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2u-k287-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', `--window-size=${ANCHO},${ALTO}`], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoDev) { try { chrome.kill(); } catch (e) { } throw new Error('Chrome no abrió DevTools: ' + err.slice(0, 200)); }
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') { RES.consola.errores++; if (RES.consola.muestras.length < 8) RES.consola.muestras.push('EXC ' + JSON.stringify(d.params.exceptionDetails).slice(0, 300)); } if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') { RES.consola.errores++; if (RES.consola.muestras.length < 8) RES.consola.muestras.push('ERR ' + JSON.stringify(d.params.args).slice(0, 300)); } });
  guardar();
  async function pasada(calidad, n) {
    const P = { calidad, run: n, consola_errores_ini: RES.consola.errores };
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    await cdp.call('Page.enable', {}, ses); await cdp.call('Runtime.enable', {}, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: 'try { localStorage.clear(); } catch(e){}' }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?calidad=${calidad}` }, ses);
    const t0 = Date.now(); let ok = false;
    while (Date.now() - t0 < 150000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
    if (!ok) { P.error = 'no arrancó'; RES.pasadas.push(P); try { await cdp.call('Target.closeTarget', { targetId: tid }); } catch (e) { } return; }
    P.preparar = await ev(cdp, ses, CFG.preparar_js, 300);
    // asentado: streaming sin descargas ni trabajos, tope 120 s
    const ta = Date.now();
    while (Date.now() - ta < 120000) {
      const s = JSON.parse(await ev(cdp, ses, STATS_JS, 20));
      if (s.streaming && s.streaming.descargando === 0 && s.streaming.trabajos === 0) { P.statsAsentado = s; break; }
      await cdp.bombear(1);
    }
    if (!P.statsAsentado) P.statsAsentado = JSON.parse(await ev(cdp, ses, STATS_JS, 20));
    await cdp.bombear(3);
    P.statsSpawn = JSON.parse(await ev(cdp, ses, STATS_JS, 20));
    let shot = await ev(cdp, ses, `AV.G.renderer.snapshot(${ANCHO}, ${ALTO}, 0.92)`, 90);
    if (shot && shot !== 'null') { const ruta = path.join(SALIDA, `k287_antes_${calidad}_r${n}_spawn.jpg`); fs.writeFileSync(ruta, Buffer.from(shot.split(',')[1], 'base64')); P.capturaSpawn = ruta; } else P.capturaSpawn = 'null';
    // aérea +35 m sobre el spawn (mismo patrón que kimi3_244 --vuelo)
    P.vuelo = await ev(cdp, ses, `(() => { const G = window.AV.G; const S = G.S; const ST = (G.mundo && G.mundo.streaming) || (G.streaming && G.streaming.gestor);
      if (!ST) return 'sin streaming'; S.pos.y += ${VUELA}; S.vy = 0; G.fisica.MOVE.flying = true; ST.alrededor(S.pos.x, S.pos.z);
      return 'y=' + Math.round(S.pos.y * 10) / 10; })()`, 10, false);
    const tv = Date.now();
    while (Date.now() - tv < 30000) {
      const s = JSON.parse(await ev(cdp, ses, STATS_JS, 20));
      if (s.streaming && s.streaming.descargando === 0 && s.streaming.trabajos === 0) break;
      await cdp.bombear(1);
    }
    await cdp.bombear(2);
    P.statsAerea = JSON.parse(await ev(cdp, ses, STATS_JS, 20));
    shot = await ev(cdp, ses, `AV.G.renderer.snapshot(${ANCHO}, ${ALTO}, 0.92)`, 90);
    if (shot && shot !== 'null') { const ruta = path.join(SALIDA, `k287_antes_${calidad}_r${n}_aerea.jpg`); fs.writeFileSync(ruta, Buffer.from(shot.split(',')[1], 'base64')); P.capturaAerea = ruta; } else P.capturaAerea = 'null';
    P.consola_errores = RES.consola.errores - P.consola_errores_ini;
    RES.pasadas.push(P);
    guardar();
    console.log(`· ${calidad} r${n}: asentado ${P.statsSpawn.calls} calls / ${Math.round(P.statsSpawn.triangulos / 1000)} k tris / fps ${P.statsSpawn.fps} · aérea ${P.statsAerea.calls} calls / ${Math.round(P.statsAerea.triangulos / 1000)} k tris · heap ${P.statsSpawn.heapMB} MB`);
    try { await cdp.call('Target.closeTarget', { targetId: tid }); } catch (e) { }
  }
  for (const calidad of CALIDADES) for (const n of [1, 2]) { if (!SOLO_CONTROL) await pasada(calidad, n); }
  // control de ruido de escena viva: diff píxel r1↔r2 (misma calidad, umbral 4/255), en página neutra
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    await cdp.call('Runtime.enable', {}, ses);
    for (const calidad of CALIDADES) for (const vista of ['spawn', 'aerea']) {
      try {
        const d = JSON.parse(await ev(cdp, ses, `(async () => { const carga = u => fetch(u).then(r => r.blob()).then(b => createImageBitmap(b));
          const a = await carga('${origen}/docs/img/kimi287/k287_antes_${calidad}_r1_${vista}.jpg'), b = await carga('${origen}/docs/img/kimi287/k287_antes_${calidad}_r2_${vista}.jpg');
          const cv = document.createElement('canvas'); cv.width = ${ANCHO}; cv.height = ${ALTO};
          const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(a, 0, 0, ${ANCHO}, ${ALTO});
          const A = cx.getImageData(0, 0, ${ANCHO}, ${ALTO}).data; cx.drawImage(b, 0, 0, ${ANCHO}, ${ALTO}); const B = cx.getImageData(0, 0, ${ANCHO}, ${ALTO}).data;
          let distintos = 0, suma = 0; for (let i = 0; i < A.length; i += 4) { const dd = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2])); suma += dd; if (dd > 4) distintos++; }
          return JSON.stringify({ px: distintos, pct: +(100 * distintos / (${ANCHO} * ${ALTO})).toFixed(3), media: +(suma / (${ANCHO} * ${ALTO})).toFixed(3) }); })()`, 90));
        RES.control[`${calidad}_${vista}`] = d;
        console.log(`· control ${calidad} ${vista}: ${d.pct} % px>4/255 (media ${d.media})`);
      } catch (e) { RES.control[`${calidad}_${vista}`] = { error: e.message.slice(0, 200) }; }
    }
    try { await cdp.call('Target.closeTarget', { targetId: tid }); } catch (e) { }
  } catch (e) { RES.controlError = String(e).slice(0, 200); }
  guardar();
  console.log(`· consola: ${RES.consola.errores} errores · head ${RES.head} · json: docs/img/kimi287/k287_antes_${ETIQUETA}.json`);
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  try { chrome.kill(); } catch (e) { }
  await new Promise(r => setTimeout(r, 1500));
  try { execSync(`taskkill /PID ${chrome.pid} /T /F 2>nul`, { timeout: 10000 }); } catch (e) { }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e.message || e); guardar(); process.exit(1); });
