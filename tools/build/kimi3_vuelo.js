#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-Task-020: repro del cuelgue de ST.terminar() en vuelo.
   Chrome headless propio + CDP (sin librerías), móvil 375×812 dpr 3 táctil con UA de iPhone, CPU ×4, GPU real.
   Escenario de Kimi 1 (kimi1_013_ronda.js): teleport + alzar la cámara + ST.alrededor() + ST.terminar().
   Con alzar ≥ 26 m la cola de streaming no se agota y terminar() no vuelve; con _diag() se ve qué la llena.
   Salida: docs/img/kimi020/repro-<etiqueta>.json   Uso: node tools/build/kimi3_vuelo.js --etiqueta r1 */
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
const ETIQUETA = (() => { const i = process.argv.indexOf('--etiqueta'); return i > 0 ? process.argv[i + 1] : 'r1'; })();
const CPU = parseFloat((() => { const i = process.argv.indexOf('--cpu'); return i > 0 ? process.argv[i + 1] : '4'; })(), 10);
const ALZAR = parseFloat((() => { const i = process.argv.indexOf('--alzar'); return i > 0 ? process.argv[i + 1] : '30'; })(), 10);
const X = parseFloat((() => { const i = process.argv.indexOf('--x'); return i > 0 ? process.argv[i + 1] : '-33'; })(), 10);
const Z = parseFloat((() => { const i = process.argv.indexOf('--z'); return i > 0 ? process.argv[i + 1] : '-136'; })(), 10);
const YAW = parseFloat((() => { const i = process.argv.indexOf('--yaw'); return i > 0 ? process.argv[i + 1] : String(Math.PI * 0.9); })(), 10);
const TOPE_S = parseInt((() => { const i = process.argv.indexOf('--tope'); return i > 0 ? process.argv[i + 1] : '15'; })(), 10);
const HEAP = process.argv.includes('--heap'); // QA-153: performance.memory en base/pico/retenido (gc por CDP)
const ALEJAR = process.argv.includes('--alejar'); // KIMI-030: tras el drenado, volver a la villa, esperar la descarga de zonas y re-medir
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi020');
fs.mkdirSync(SALIDA, { recursive: true });
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); return res.end('404'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(d);
    });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); this.eventos = []; ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error de conexión'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message + ' ' + JSON.stringify(d.error.data || ''))) : p.re(d.result); } else if (d.method) this.eventos.push(d); }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(method, params, sessionId, timeoutMs) {
    const id = ++this.id;
    return new Promise((re, re2) => {
      this.pend.set(id, { re, re2 });
      this.ws.send(JSON.stringify({ id, method, params: params || {}, sessionId }));
      if (timeoutMs) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + method)); } }, timeoutMs);
    });
  }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function evaluar(cdp, ses, exp, timeoutS, promesa) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: promesa !== false, returnByValue: true }, ses, (timeoutS || 30) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.exception && r.exceptionDetails.exception.value || r.exceptionDetails.text).slice(0, 500));
  return r.result ? r.result.value : undefined;
}

// teleport + alzar (escenario de kimi1_013_ronda.js: AV.teleport, S.pos.y += alzar, flying, alrededor, terminar)
// --precalentar: antes del ancla final hace tomas previas (spawn → ciudad_yunque → bahía), como la ronda de Kimi 1,
// para reproducir el cuelgue con el estado que tenía su eval (zonas soltadas con gracia, anillo de precarga de vuelo).
const WARM = process.argv.includes('--precalentar') ? [
  { x: null, z: null, alzar: 0.5, yaw: null }, // el spawn real (donde quedó el jugador nuevo)
  { x: -20, z: -133, alzar: 2, yaw: Math.PI }, // ciudad_yunque
  { x: 150, z: 218, alzar: 4, yaw: 0 },        // bahía norte (QA-109)
] : [];
const PROBAR_JS = `(async () => {
  const AV = window.AV, G = AV.G, S = G.S, ST = (G.mundo && G.mundo.streaming) || (G.streaming && G.streaming.gestor);
  if (!ST) return JSON.stringify({ error: 'sin streaming' });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const asentar = async (x, z, alzar, yaw) => {
    if (x != null) AV.teleport(x, z);
    S.pos.y += alzar; S.vy = 0; G.fisica.MOVE.flying = true;
    if (yaw != null) try { AV.debug.camYaw(yaw); } catch (e) {}
    await ST.alrededor(S.pos.x, S.pos.z);
    await ST.terminar();
  };
  for (const w of ${JSON.stringify(WARM)}) await asentar(w.x, w.z, w.alzar, w.yaw), await sleep(1200);
  AV.teleport(${X}, ${Z});
  S.pos.y += ${ALZAR}; S.vy = 0; G.fisica.MOVE.flying = true;
  try { AV.debug.camYaw(${YAW}); } catch (e) {}
  const mem = () => ({ heap: Math.round(performance.memory.usedJSHeapSize / 1048576), total: Math.round(performance.memory.totalJSHeapSize / 1048576) });
  const heapBase = ${HEAP} ? mem() : null;
  const bGeo = g => { let b = 0; if (!g) return 0; const at = g.attributes; for (const k in at) if (at[k].array) b += at[k].array.byteLength; if (g.index) b += g.index.array.byteLength; return b; };
  const atribEscena = () => { const grupos = {}; (G.renderer.scene || G.scene).traverse(o => { if (!(o.isMesh && o.geometry)) return;
      const b = bGeo(o.geometry), p = (o.name || '(sin nombre)').split(':').slice(0, 2).join(':');
      const g = grupos[p] || (grupos[p] = { n: 0, mb: 0, vis: 0 }); g.n++; g.mb += b; if (o.visible) g.vis++; });
    return Object.entries(grupos).map(([p, g]) => ({ p, n: g.n, mb: Math.round(g.mb / 1048576), vis: g.vis })).sort((a, b) => b.mb - a.mb).slice(0, 30); };
  const atribRecursos = () => { const porTipo = {}, listosRefs = []; for (const n in ST.recursos) for (const t in ST.recursos[n]) {
      const r = ST.recursos[n][t]; if (r.estado === 'nada') continue;
      const k = t + ':' + r.estado, g = porTipo[k] || (porTipo[k] = { n: 0 }); g.n++;
      if (r.estado === 'listo' && r.refs > 0) { let mb = 0; if (r.partes) for (const p of r.partes) mb += bGeo(p.geo); if (r.geo) mb += bGeo(r.geo); listosRefs.push({ n, t, refs: r.refs, mb: Math.round(mb / 1048576) }); } }
    return { porTipo, listosRefs: listosRefs.sort((a, b) => b.mb - a.mb).slice(0, 40) }; };
  const atribBase = ${HEAP} ? { escena: atribEscena(), recursos: atribRecursos() } : null;
  const diag = () => { try { return ST._diag ? ST._diag() : null; } catch (e) { return String(e && e.message || e); } };
  await ST.alrededor(S.pos.x, S.pos.z); // esto resuelve (Kimi 1 cuelga en el paso siguiente)
  await sleep(1500); // deja que la revisión periódica y el bucle de cuadros reactiven la cola
  const snaps = [];
  const t0 = performance.now();
  const timer = setInterval(() => snaps.push({ t: Math.round(performance.now() - t0), d: diag() }), 2500);
  const valor = await ST.terminar({ topeMs: ${TOPE_S * 1000} }); // KIMI-020: acota la espera; null = cola agotada
  const res = valor && valor.tope ? 'TOPE' : 'OK';
  clearInterval(timer);
  snaps.push({ t: Math.round(performance.now() - t0), d: diag() });
  const heapPico = ${HEAP} ? mem() : null;
  const st = (() => { try { return G.renderer.stats(); } catch (e) { return {}; } })();
  return JSON.stringify({ res, valor, ms: Math.round(performance.now() - t0), pos: Math.round(S.pos.x) + ',' + Math.round(S.pos.y) + ',' + Math.round(S.pos.z),
    heapBase, heapPico, atribBase,
    calls: st.calls, ktris: st.triangulos != null ? Math.round(st.triangulos / 1000) : null,
    snaps, lentos: ((G.trabajosLentos || []).slice(-10)) });
})()`;

async function lanzarChrome() {
  let ultimo = '';
  for (let intento = 0; intento < 3; intento++) {
    try { return await lanzarChromeUnaVez(); } catch (e) { ultimo = e.message; await new Promise(r => setTimeout(r, 2500)); }
  }
  throw new Error(ultimo);
}
async function lanzarChromeUnaVez() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3v-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--enable-logging=stderr', '--v=0',
    '--window-size=500,900', 'about:blank'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let err = '';
  chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    if (fs.existsSync(puertoFile)) {
      const l = fs.readFileSync(puertoFile, 'utf8').split('\n');
      const puerto = parseInt(l[0], 10), wsPath = (l[1] || '').trim();
      if (puerto > 0 && wsPath) return { chrome, perf, puerto, wsPath };
    }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('Chrome no abrió DevTools en 30 s: ' + err.slice(0, 300));
}
function limpiarHuerfanos() {
  try {
    const ps = "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*kimi3v-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { /* seguir */ }
}

(async () => {
  limpiarHuerfanos();
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws);
  await cdp.listo();
  const res = { etiqueta: ETIQUETA, cuando: new Date().toISOString(), ancla: { x: X, z: Z, alzar: ALZAR, yaw: YAW },
    movil: { ancho: 375, alto: 812, dpr: 3, cpu: CPU, gpu: 'PC real (ANGLE/D3D11)' }, tope_s: TOPE_S };
  console.log(`· móvil 375×812 dpr 3 · CPU ×${CPU} · ancla (${X},${Z}) alzar ${ALZAR} m · tope ${TOPE_S} s`);
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    if (HEAP) await cdp.call('HeapProfiler.enable', {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 3, mobile: true }, ses);
    await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); sessionStorage.clear(); } catch (e){}" }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1` }, ses);
    const t0 = Date.now();
    let listo = false;
    while (Date.now() - t0 < CFG.espera_listo_s * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { /* aún no */ }
      await cdp.bombear(0.5);
    }
    if (!listo) throw new Error('el juego no arrancó');
    await cdp.bombear(2.0);
    console.log('· jugador nuevo: ' + await evaluar(cdp, ses, CFG.preparar_js, 300));
    const r = JSON.parse(await evaluar(cdp, ses, PROBAR_JS, TOPE_S + 40, true));
    res.repro = r;
    console.log(`· terminar(): ${r.res} en ${r.ms} ms · pos ${r.pos} · ${r.calls} calls · ${r.ktris} k tris`);
    if (HEAP) {
      await cdp.bombear(3); // deja que las liberaciones por gracia y el gc natural pasen
      try { await cdp.call('HeapProfiler.collectGarbage', {}, ses, 30000); } catch (e) { /* si no hay gc, el número queda con basura */ }
      const reten = JSON.parse(await evaluar(cdp, ses, 'JSON.stringify({heap: Math.round(performance.memory.usedJSHeapSize/1048576), total: Math.round(performance.memory.totalJSHeapSize/1048576)})', 10, false));
      res.heap = { base: r.heapBase, pico: r.heapPico, retenido: reten };
      console.log(`· heap MB — base ${r.heapBase && r.heapBase.heap} · pico ${r.heapPico && r.heapPico.heap} · retenido tras gc ${reten.heap}`);
      if (ALEJAR) {
        // KIMI-030: vuelta a la villa → ¿el heap de la ciudad baja o queda retenido? (QA-153)
        await evaluar(cdp, ses, `(async () => { const AV = window.AV, G = AV.G, S = G.S, ST = (G.mundo && G.mundo.streaming) || (G.streaming && G.streaming.gestor);
          AV.teleport(134, 182); S.pos.y += 2; S.vy = 0;
          await ST.alrededor(S.pos.x, S.pos.z); return 'ok'; })()`, 60, true);
        console.log('· de vuelta en la villa; esperando la descarga de zonas de la ciudad (gracia)…');
        await cdp.bombear(28);
        try { await cdp.call('HeapProfiler.collectGarbage', {}, ses, 30000); } catch (e) { /* sin gc el número queda con basura */ }
        const vuelta = await evaluar(cdp, ses, `JSON.stringify((() => { const G = window.AV.G;
          const bytesGeo = () => { let b = 0, n = 0; (G.renderer.scene || G.scene).traverse(o => { if (o.isMesh && o.geometry) { n++;
            const at = o.geometry.attributes; for (const k in at) if (at[k].array) b += at[k].array.byteLength;
            if (o.geometry.index) b += o.geometry.index.array.byteLength; } }); return { mb: Math.round(b / 1048576), mallas: n }; };
          return { pos: [Math.round(G.S.pos.x), Math.round(G.S.pos.y), Math.round(G.S.pos.z)],
            heap: Math.round(performance.memory.usedJSHeapSize / 1048576), total: Math.round(performance.memory.totalJSHeapSize / 1048576),
            geoViva: bytesGeo(), st: (() => { try { return G.renderer.stats(); } catch (e) { return {}; } })() }; })())`, 30, false);
        res.heap.vuelta = JSON.parse(vuelta);
        console.log(`· heap tras volver + gc: ${res.heap.vuelta.heap} MB · pos ${JSON.stringify(res.heap.vuelta.pos)} · geo viva en escena: ${res.heap.vuelta.geoViva.mb} MB en ${res.heap.vuelta.geoViva.mallas} mallas · ${res.heap.vuelta.st.calls} calls`);
        // KIMI-030: atribución — desglose de la geometría retenida por prefijo de nombre + conteo interno de streaming
        const atrib = await evaluar(cdp, ses, `JSON.stringify((() => { const AV = window.AV, G = AV.G;
          const ST = (G.mundo && G.mundo.streaming) || (G.streaming && G.streaming.gestor);
          const bGeo = g => { let b = 0; if (!g) return 0; const at = g.attributes; for (const k in at) if (at[k].array) b += at[k].array.byteLength; if (g.index) b += g.index.array.byteLength; return b; };
          const grupos = {}, sinNombre = { n: 0, mb: 0, vis: 0 };
          (G.renderer.scene || G.scene).traverse(o => { if (!(o.isMesh && o.geometry)) return;
            const b = bGeo(o.geometry);
            const nom = o.name || '(sin nombre)';
            const p = nom.split(':').slice(0, 2).join(':');
            const g = grupos[p] || (grupos[p] = { n: 0, mb: 0, vis: 0, visMb: 0 });
            g.n++; g.mb += b; if (o.visible) { g.vis++; g.visMb += b; } });
          const prefijos = Object.entries(grupos).map(([p, g]) => ({ p, n: g.n, mb: Math.round(g.mb / 1048576), vis: g.vis, visMb: Math.round(g.visMb / 1048576) }))
            .sort((a, b) => b.mb - a.mb).slice(0, 30);
          let stStats = null; try { stStats = ST.stats(); } catch (e) {}
          const porTipo = {}, listosRefs = [];
          for (const n in ST.recursos) for (const t in ST.recursos[n]) {
            const r = ST.recursos[n][t]; if (r.estado === 'nada') continue;
            const kk = t + ':' + r.estado, g = porTipo[kk] || (porTipo[kk] = { n: 0 }); g.n++;
            if (r.estado === 'listo' && r.refs > 0) { let mb = 0; if (r.partes) for (const p of r.partes) mb += bGeo(p.geo); if (r.geo) mb += bGeo(r.geo); listosRefs.push({ n, t, refs: r.refs, mb: Math.round(mb / 1048576) }); } }
          listosRefs.sort((a, b) => b.mb - a.mb);
          const zonas = Object.entries(ST.zonas || {}).map(([id, Z]) => ({ id, nivel: Z.nivel, ciudad: !!Z.ciudad, hd: !!Z.hd, d: Math.round(Z.d || 0),
            hdM: (Z.hdMallas || []).length, cerM: (Z.cercaMallas || []).length, som: !!Z.sombraMalla, mal: !!Z.malla, nInst: Z.inst.length }));
          return { prefijos, stStats, porTipo, listosRefs: listosRefs.slice(0, 40), lotes: Object.keys(ST.lotes || {}), zonas }; })())`, 30, false);
        res.heap.atrib = JSON.parse(atrib);
        console.log('· atribución por prefijo (MB en escena, todas las mallas):');
        for (const g of res.heap.atrib.prefijos) console.log(`    ${String(g.mb).padStart(5)} MB · ${String(g.n).padStart(4)} mallas (${String(g.vis).padStart(4)} vis) · ${g.p}`);
        const ks = res.heap.atrib.stStats && res.heap.atrib.stStats.kbGeometria;
        console.log(`· streaming ST.stats(): kbGeometria=${ks} · modelosCerca=${res.heap.atrib.stStats && res.heap.atrib.stStats.modelosCerca} · modelosHD=${res.heap.atrib.stStats && res.heap.atrib.stStats.modelosHD} · modelosLejos=${res.heap.atrib.stStats && res.heap.atrib.stStats.modelosLejos} · zonasCerca=${res.heap.atrib.stStats && res.heap.atrib.stStats.zonasCerca}`);
        console.log('· recursos con refs > 0 (listos, top por MB): ' + JSON.stringify((res.heap.atrib.listosRefs || []).slice(0, 15)));
        console.log('· recursos por tipo:estado: ' + JSON.stringify(res.heap.atrib.porTipo) + ' · lotes vivos: ' + (res.heap.atrib.lotes || []).length);
        console.log('· zonas: ' + JSON.stringify(res.heap.atrib.zonas));
      }
    }
    for (const s of r.snaps || []) {
      if (!s.d) continue;
      const d = typeof s.d === 'string' ? s.d : `enVuelo=${s.d.enVuelo} quieto=${s.d.quieto} cola=${s.d.cola.length} trabajos=${s.d.trabajos.length}` +
        (s.d.trabajos && s.d.trabajos.length ? ' [' + s.d.trabajos.slice(0, 12).join(', ') + (s.d.trabajos.length > 12 ? '…' : '') + ']' : '') +
        (s.d.cola && s.d.cola.length ? ' · cola: ' + s.d.cola.slice(0, 8).map(c => c.tipo + ':' + c.n + ' ' + c.estado + ' p' + c.prio + ' r' + c.refs).join(', ') + (s.d.cola.length > 8 ? '…' : '') : '');
      console.log(`  · +${s.t / 1000}s ${d}`);
    }
    if (r.lentos && r.lentos.length) console.log('  · trabajos >25 ms: ' + r.lentos.map(l => l.n + ' ' + l.ms + 'ms').join(', '));
    const errores = await evaluar(cdp, ses, 'JSON.stringify((window.__aveErrores || []).slice(0, 8))', 10, false);
    res.errores = JSON.parse(errores || '[]');
    console.log('· errores de consola: ' + errores);
    try { await cdp.call('Target.closeTarget', { targetId: tid }, undefined, 10); } catch (e) { /* ya cerrado */ }
  } catch (e) {
    res.error = e && e.message || String(e);
    console.log('· FALLO: ' + res.error);
  }
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { chrome.kill(); }
  srv.close();
  const ruta = path.join(SALIDA, `repro-${ETIQUETA}.json`);
  fs.writeFileSync(ruta, JSON.stringify(res, null, 2));
  console.log(`· resultado en ${ruta}`);
  process.exit(res.repro && res.repro.res === 'OK' && !res.error ? 0 : 1);
})().catch(e => { console.error('FALLO:', e && e.stack || JSON.stringify(e) || String(e)); process.exit(2); });
