#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-291: validación A/B de la compresión meshopt de los _hd.
   (Nació como KIMI-290 y quedó renumerada al colisionar con la KIMI-290 de Kimi 3 ya en origin, 8-nov;
   la evidencia aa-r1 y los nombres k290_* conservan el ID original, patrón documentado del tablero.)
   Encargo coordinadora 8-nov ~10:45 UTC: «Kimi 2 y 3: en cuanto lo anuncie en TAREAS_WEB.md, valídenlo con
   GPU. Capturas antes/después del spawn en medio y en alto (tienen que ser idénticas), la carga medida con
   kimi2_k244_carga.js (local y, tras publicar, con --url), streamingTest y FPS.»

   KIMI-287 dejó la línea base commiteada (docs/img/kimi287/, 2 pasadas por calidad). Esta herramienta corre
   UNA pasada sobre el HEAD vigente (worktree servido = el «después»; con el parche meshopt aplicado o no) y
   compara contra esa base:

   · Estructura (determinista, debe cuadrar casi exacto): draw calls, triángulos, texturas/geometrías, posición.
   · Píxeles: diff multi-umbral (4/16/32/64 de 255) contra las 2 pasadas base, y EN LA MISMA PASADA el suelo de
     ruido A/A base↔base con el mismo cómputo (la escena viva —aves, agua, viento— hace imposible el diff a
     umbral 4: el A/A de KIMI-287 ya daba 40–66 % de px distintos; por eso el veredicto se da a umbrales 16/32/64
     relativos al suelo A/A). Se guarda un mapa de calor por vista para revisión humana.
   · FPS/memoria/heap del spawn asentado, para el encargo de «FPS».

   Veredicto por vista: IDENTICA si la estructura cuadra (|Δcalls| ≤ 2, Δtris ≤ 1 %, mismas texturas/geo ±2 %)
   y pct_AB(u) ≤ pct_AA(u) × 1,5 + 1,0 pt para u ∈ {16, 32, 64}. Si no, REVISAR con los mapas de calor.
   La carga (MB) se valida aparte con tools/build/kimi2_k244_carga.js y las baterías con
   tools/build/kimi2_una_bateria.js, tal como pide el encargo.

   Uso: node tools/build/kimi2_k290_valida_meshopt.js [--etiqueta despues-r1] [--solo medio|alto]
   Salida: docs/img/kimi290/k290_<calidad>_r1_{spawn,aerea}.jpg + k290_diff_<calidad>_<vista>.jpg +
           k290_<etiqueta>.json */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn, execSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ETIQUETA = arg('--etiqueta', 'despues-r1');
const SOLO = arg('--solo', '');
const ANCHO = 1600, ALTO = 900, VUELA = 35;
const CALIDADES = (SOLO ? [SOLO] : ['medio', 'alto']);
const BASE = path.join(RAIZ, 'docs', 'img', 'kimi287');
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi290');
fs.mkdirSync(SALIDA, { recursive: true });
const UMBRALES = [4, 16, 32, 64];
const RES = { tarea: 'KIMI-291', para: 'meshopt _hd (validación A/B)', etiqueta: ETIQUETA, head: '', gpu: '', cuandos: new Date().toISOString(), base: 'docs/img/kimi287 (KIMI-287)', pasadas: [], aa: {}, veredicto: {}, consola: { errores: 0, muestras: [] } };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = () => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result ? r.result.value : undefined; }
function guardar() { try { fs.writeFileSync(path.join(SALIDA, `k290_${ETIQUETA}.json`), JSON.stringify(RES, null, 1)); } catch (e) { } }
const STATS_JS = `new Promise(ok => requestAnimationFrame(() => requestAnimationFrame(() => { try {
  const G = window.AV.G; const st = G.renderer.stats(); const S = G.S;
  const fis = (G.mundo && G.mundo.streaming) ? G.mundo.streaming.stats() : null;
  ok(JSON.stringify({ fps: st.fps, calls: st.calls, triangulos: st.triangulos, calidad: st.calidad,
    pos: { x: +S.pos.x.toFixed(1), y: +S.pos.y.toFixed(1), z: +S.pos.z.toFixed(1) },
    memoria: G.renderer.renderer.info.memory, heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
    streaming: fis ? { descargando: fis.descargando, trabajos: fis.trabajos, zonasCerca: fis.zonasCerca } : null }));
} catch (e) { ok(JSON.stringify({ error: String(e) })); } })))`;
// diff multi-umbral de dos JPG servidos; devuelve pct de px por encima de cada umbral, delta media/máx y mapa de calor
const DIFF_JS = (ua, ub, umbralHeat) => `(async () => { const carga = u => fetch(u).then(r => r.blob()).then(b => createImageBitmap(b));
  const a = await carga('${ua}'), b = await carga('${ub}');
  const cv = document.createElement('canvas'); cv.width = ${ANCHO}; cv.height = ${ALTO};
  const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(a, 0, 0, ${ANCHO}, ${ALTO});
  const A = cx.getImageData(0, 0, ${ANCHO}, ${ALTO}).data; cx.drawImage(b, 0, 0, ${ANCHO}, ${ALTO}); const B = cx.getImageData(0, 0, ${ANCHO}, ${ALTO}).data;
  const conteos = [0, 0, 0, 0]; let suma = 0, max = 0;
  const heat = cx.createImageData(${ANCHO}, ${ALTO});
  for (let i = 0; i < A.length; i += 4) {
    const dd = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2]));
    suma += dd; if (dd > max) max = dd;
    for (let u = 0; u < 4; u++) if (dd > ${JSON.stringify(UMBRALES)}[u]) conteos[u]++;
    const h = dd > ${umbralHeat} ? 255 : 0;
    heat.data[i] = h; heat.data[i + 1] = dd > ${umbralHeat} ? (255 - Math.min(255, dd * 2)) : 0; heat.data[i + 2] = 0; heat.data[i + 3] = 255;
  }
  cx.putImageData(heat, 0, 0);
  return JSON.stringify({ pct: conteos.map(c => +(100 * c / (${ANCHO} * ${ALTO})).toFixed(3)),
    media: +(suma / (${ANCHO} * ${ALTO})).toFixed(3), max,
    heat: cv.toDataURL('image/jpeg', 0.85) }); })()`;
(async () => {
  RES.head = execSync('git rev-parse --short HEAD', { cwd: RAIZ }).toString().trim();
  try { RES.gpu = execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_VideoController | Where-Object { $_.AdapterRAM -gt 0 } | Select-Object -First 1).Name"', { timeout: 15000 }).toString().trim(); } catch (e) { RES.gpu = '?'; }
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2u-k290-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', `--window-size=${ANCHO},${ALTO}`], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoDev) { try { chrome.kill(); } catch (e) { } throw new Error('Chrome no abrió DevTools: ' + err.slice(0, 200)); }
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') { RES.consola.errores++; if (RES.consola.muestras.length < 8) RES.consola.muestras.push('EXC ' + JSON.stringify(d.params.exceptionDetails).slice(0, 300)); } if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') { RES.consola.errores++; if (RES.consola.muestras.length < 8) RES.consola.muestras.push('ERR ' + JSON.stringify(d.params.args).slice(0, 300)); } });
  guardar();
  async function pasada(calidad) {
    const P = { calidad, run: 1, consola_errores_ini: RES.consola.errores };
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    await cdp.call('Page.enable', {}, ses); await cdp.call('Runtime.enable', {}, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: 'try { localStorage.clear(); } catch(e){}' }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?calidad=${calidad}` }, ses);
    const t0 = Date.now(); let ok = false;
    while (Date.now() - t0 < 150000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
    if (!ok) { P.error = 'no arrancó'; RES.pasadas.push(P); try { await cdp.call('Target.closeTarget', { targetId: tid }); } catch (e) { } return; }
    P.preparar = await ev(cdp, ses, CFG.preparar_js, 300);
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
    if (shot && shot !== 'null') { const ruta = path.join(SALIDA, `k290_${calidad}_r1_spawn.jpg`); fs.writeFileSync(ruta, Buffer.from(shot.split(',')[1], 'base64')); P.capturaSpawn = ruta; } else P.capturaSpawn = 'null';
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
    if (shot && shot !== 'null') { const ruta = path.join(SALIDA, `k290_${calidad}_r1_aerea.jpg`); fs.writeFileSync(ruta, Buffer.from(shot.split(',')[1], 'base64')); P.capturaAerea = ruta; } else P.capturaAerea = 'null';
    P.consola_errores = RES.consola.errores - P.consola_errores_ini;
    RES.pasadas.push(P);
    guardar();
    console.log(`· ${calidad}: spawn ${P.statsSpawn.calls} calls / ${Math.round(P.statsSpawn.triangulos / 1000)} k tris / fps ${P.statsSpawn.fps} · aérea ${P.statsAerea.calls} calls / ${Math.round(P.statsAerea.triangulos / 1000)} k tris · heap ${P.statsSpawn.heapMB} MB`);
    try { await cdp.call('Target.closeTarget', { targetId: tid }); } catch (e) { }
  }
  for (const calidad of CALIDADES) await pasada(calidad);
  // diffs en página neutra: A/A base↔base (suelo) y A/B HEAD↔base, mismo cómputo
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    await cdp.call('Runtime.enable', {}, ses);
    for (const calidad of CALIDADES) for (const vista of ['spawn', 'aerea']) {
      const base1 = `${origen}/docs/img/kimi287/k287_antes_${calidad}_r1_${vista}.jpg`;
      const base2 = `${origen}/docs/img/kimi287/k287_antes_${calidad}_r2_${vista}.jpg`;
      const desp = `${origen}/docs/img/kimi290/k290_${calidad}_r1_${vista}.jpg`;
      try {
        const aa = JSON.parse(await ev(cdp, ses, DIFF_JS(base1, base2, 16), 120));
        RES.aa[`${calidad}_${vista}`] = { pct: aa.pct, media: aa.media, max: aa.max };
        console.log(`· A/A base ${calidad} ${vista}: umbral16 ${aa.pct[1]} % · umbral32 ${aa.pct[2]} % · umbral64 ${aa.pct[3]} %`);
      } catch (e) { RES.aa[`${calidad}_${vista}`] = { error: e.message.slice(0, 200) }; }
      for (const rb of ['r1', 'r2']) {
        try {
          const ab = JSON.parse(await ev(cdp, ses, DIFF_JS(`${origen}/docs/img/kimi287/k287_antes_${calidad}_${rb}_${vista}.jpg`, desp, 16), 120));
          if (ab.heat && ab.heat !== 'null') { const rh = path.join(SALIDA, `k290_diff_${calidad}_${vista}_vs${rb}.jpg`); fs.writeFileSync(rh, Buffer.from(ab.heat.split(',')[1], 'base64')); }
          RES.veredicto[`${calidad}_${vista}_vs${rb}`] = { pct: ab.pct, media: ab.media, max: ab.max, heat: `k290_diff_${calidad}_${vista}_vs${rb}.jpg` };
          console.log(`· A/B ${calidad} ${vista} vs ${rb}: umbral16 ${ab.pct[1]} % · umbral32 ${ab.pct[2]} % · umbral64 ${ab.pct[3]} % (max Δ${ab.max})`);
        } catch (e) { RES.veredicto[`${calidad}_${vista}_vs${rb}`] = { error: e.message.slice(0, 200) }; }
      }
    }
    try { await cdp.call('Target.closeTarget', { targetId: tid }); } catch (e) { }
  } catch (e) { RES.diffError = String(e).slice(0, 200); }
  // veredicto final por calidad (contra la base más cercana); estructura vs stats base r1 de KIMI-287
  let baseStats = {};
  try { baseStats = JSON.parse(fs.readFileSync(path.join(BASE, 'k287_antes_antes-r1.json'), 'utf8')); } catch (e) { }
  for (const calidad of CALIDADES) {
    const P = RES.pasadas.find(p => p.calidad === calidad && !p.error);
    const B = (baseStats.pasadas || []).find(p => p.calidad === calidad && p.run === 1);
    if (!P || !B) { RES[`veredicto_${calidad}`] = 'SIN_DATOS'; continue; }
    const dCalls = P.statsSpawn.calls - B.statsSpawn.calls;
    const dTrisPct = +(100 * (P.statsSpawn.triangulos - B.statsSpawn.triangulos) / B.statsSpawn.triangulos).toFixed(2);
    const dTex = P.statsSpawn.memoria.textures - B.statsSpawn.memoria.textures;
    const estructura = Math.abs(dCalls) <= 4 && Math.abs(dTrisPct) <= 1 && Math.abs(dTex) <= 6;
    let mejor = null;
    for (const vista of ['spawn', 'aerea']) {
      const aa = RES.aa[`${calidad}_${vista}`];
      if (!aa || aa.error) continue;
      for (const rb of ['r1', 'r2']) {
        const ab = RES.veredicto[`${calidad}_${vista}_vs${rb}`];
        if (!ab || ab.error) continue;
        const pxOk = [1, 2, 3].every(u => ab.pct[u] <= aa.pct[u] * 1.5 + 1.0);
        const v = { vista, base: rb, pxOk, pct16: ab.pct[1], pct32: ab.pct[2], pct64: ab.pct[3], aa16: aa.pct[1], aa32: aa.pct[2], aa64: aa.pct[3] };
        if (!mejor || (pxOk && !mejor.pxOk) || (pxOk === mejor.pxOk && ab.pct[2] < mejor.pct32)) mejor = v;
      }
    }
    RES[`veredicto_${calidad}`] = mejor ? ((mejor.pxOk && estructura) ? 'IDENTICA' : 'REVISAR') : 'SIN_DATOS';
    RES[`detalle_${calidad}`] = Object.assign({ dCalls, dTrisPct, dTex, calls: P.statsSpawn.calls, tris: P.statsSpawn.triangulos, fps: P.statsSpawn.fps, heapMB: P.statsSpawn.heapMB }, mejor || {});
  }
  guardar();
  console.log(`· veredicto: ${CALIDADES.map(c => `${c}=${RES[`veredicto_${c}`]}`).join(' · ')} · consola: ${RES.consola.errores} errores · head ${RES.head} · json: docs/img/kimi290/k290_${ETIQUETA}.json`);
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  try { chrome.kill(); } catch (e) { }
  await new Promise(r => setTimeout(r, 1500));
  try { execSync(`taskkill /PID ${chrome.pid} /T /F 2>nul`, { timeout: 10000 }); } catch (e) { }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e.message || e); guardar(); process.exit(1); });
