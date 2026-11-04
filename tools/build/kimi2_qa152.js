#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — QA-152: memoria al arrancar (heap JS y texturas de GPU en el arranque).
   La nube (SwiftShader) midió heap 161,9 MB a los ~9 s (aviso en 120) y texturas de arranque 131 → 194–226 MB
   con la pantalla de carga. Esta herramienta replica el arranque en móvil emulado con la GPU real de la PC
   (375×812 dpr 3, CPU ×4, partida sembrada de cap1, sin tocar el motor) y muestrea cada 500 ms durante 30 s:
   usedJSHeapSize / totalJSHeapSize, renderer.info.memory (geometries/textures), info.programs, draw calls y
   FPS. Salida: consola + docs/img/kimi152/qa152.json. Uso: node tools/build/kimi2_qa152.js [--secs 30]

   Fase 2 (4-nov, post-reveal): el exceso de heap del cap. 4 (nube: 247–285 MB) NO se da en la carga sino
   jugando. La herramienta ahora puede medir largo (p. ej. --secs 150) con: (a) window.gc() cada ~10 s
   (--js-flags=--expose-gc) para separar heap retenido de basura; (b) captura Network por CDP (qué GLB/texturas
   entran y cuántos bytes); (c) stats de streaming por muestra (zonas cerca/lejos, modelos HD, KB de geometría,
   materiales) y posición de cámara para correlacionar con lo que se carga. Uso largo:
   node tools/build/kimi2_qa152.js --cap 4 --secs 150 --etiqueta post1

   Fase 3 (--perfil): si el heap sigue creciendo con geo/tex estables, el grueso es JS retenido.
   Activa HeapProfiler.startSampling (~32 KB) desde el segundo 40 y vuelca las pilas con más
   selfSize: atribuye qué módulo retiene la memoria. Uso:
   node tools/build/kimi2_qa152.js --cap 4 --secs 150 --perfil --etiqueta perf1

   Fase 4 (--snap T1,T2): el sampling apenas capturó MBs → sospecha de ArrayBuffers/binarios o
   estructuras no muestreadas. Toma HeapProfiler.takeHeapSnapshot (self_size agregado por constructor)
   en los segundos pedidos (con window.gc() justo antes) y difiere los dos agregados: el delta
   positivo grande es el constructor que retiene. Uso (Node con old space grande):
   node --max-old-space-size=6144 tools/build/kimi2_qa152.js --cap 4 --secs 150 --snap 50,140 --etiqueta snap1

   Fase 5 (--ab, junto a --snap): el diff de la fase 4 dejó el retenido en 'system / JSArrayBufferData'
   → sub-atribuye cada ArrayBuffer ≥256 KB caminando las aristas inversas del snapshot hasta el primer
   retenedor con nombre específico (con 2 saltos de contexto) y agrupa por esa cadena: atribuye el
   binario a su dueño real en el motor (audio, geometría, fusión/instanciado, parse de GLB...).
   node --max-old-space-size=6144 tools/build/kimi2_qa152.js --cap 4 --secs 160 --snap 60,150 --etiqueta ab1 --ab

  Fase 7 (4-nov): el perfil iPhone cae en 'bajo' (QA-110/158) y ahí el heap se queda sano — para
  reproducir la fuga histórica (fases 2/5/6, medidas en 'alto') hay que forzar calidad:
  node --max-old-space-size=6144 tools/build/kimi2_qa152.js --cap 4 --secs 175 --snap 135,165 --ab --calidad alto --etiqueta ab7rN

   Fase 6 (--ab, 4-nov): las cadenas se cortaban en 'reactions_or_result→Promise' (+16,5 MB en la fase 5)
   → 'Promise' pasa a ser un nodo transparente: el BFS lo atraviesa y sigue hasta el dueño que retiene
   la promesa (context/array/mapa del módulo); firma ampliada a los últimos 4 saltos y diff abDet
   entre los dos snapshots (qué dueños crecen, con delta en MB y nº de buffers). Mismo uso que --ab.
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ANCHO = 375, ALTO = 812, DPR = 3, CPU = 4;
const SECS = +(arg('--secs', '30'));
const CAP = +(arg('--cap', '1'));
const ETIQUETA = arg('--etiqueta', '');
const PERFIL = process.argv.includes('--perfil');
const AB = process.argv.includes('--ab'); // sub-atribuir los ArrayBuffer grandes por retenedor
const SNAP = arg('--snap', ''); // p. ej. "50,140": segundos de snapshot con gc previo
const SNAP_T = SNAP ? SNAP.split(',').map(x => +x).filter(x => x > 0) : [];
const CALIDAD = arg('--calidad', ''); // p. ej. "alto": fuerza ?calidad= (por defecto el perfil móvil cae en 'bajo', QA-110/158)
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi152');
fs.mkdirSync(SALIDA, { recursive: true });
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    const qa = /[?&]qa=1(?:&|$)/.test(req.url);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); return res.end('404'); }
      if (qa && /index\.html$/.test(f)) d = Buffer.from(d.toString('utf8').replace(/<meta charset[^>]*>/i, m => m + '<script src="tests/qa/qa.js" charset="utf-8"></script>'), 'utf8');
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(d);
    });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); this.onEvent = null; ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } else if (d.method && this.onEvent) this.onEvent(d); }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(m, p, s, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: m, params: p || {}, sessionId: s })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + m)); } }, t); }); }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function ev(cdp, ses, exp, t, aw) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, returnByValue: true, awaitPromise: aw !== false }, ses, (t || 30) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 400));
  return r.result ? r.result.value : undefined;
}

// --- Fase 4: snapshots por constructor (self_size) ---
let snapActual = null; // { t, chunks:[], resolver }
function tomarSnap(cdp, ses, t) {
  return new Promise(async (re, re2) => {
    const snap = { t, chunks: [] };
    snapActual = snap; // los chunks van llegando por evento hasta que el comando responde
    const to = setTimeout(() => { if (snapActual === snap) snapActual = null; re2(new Error('timeout snapshot')); }, 285000);
    // OJO: no resolver en reportHeapSnapshotProgress(finished): puede llegar ANTES que los
    // últimos addHeapSnapshotChunk y perderíamos la cola del JSON (fase 4, 1ª corrida).
    try { await cdp.call('HeapProfiler.takeHeapSnapshot', { reportProgress: false }, ses, 280000); clearTimeout(to); re(snap); }
    catch (e) { clearTimeout(to); if (snapActual === snap) snapActual = null; re2(e); }
  });
}
function agregarSnap(snap) {
  const d = JSON.parse(snap.chunks.join(''));
  snap.chunks = null;
  snap.raw = d; // lo usa subAtribuirAB (--ab); se libera tras sub-atribuir
  const meta = d.snapshot.meta, nf = meta.node_fields, str = d.strings;
  const iName = nf.indexOf('name'), iSize = nf.indexOf('self_size');
  const nodos = d.nodes, por = new Map();
  let total = 0;
  for (let i = 0; i < nodos.length; i += nf.length) {
    const sz = nodos[i + iSize];
    if (!sz) continue;
    total += sz;
    const nombre = str[nodos[i + iName]] || '(sin nombre)';
    por.set(nombre, (por.get(nombre) || 0) + sz);
  }
  snap.porCtor = [...por.entries()].sort((a, b) => b[1] - a[1]);
  snap.totalMB = Math.round(total / 1048576 * 10) / 10;
  snap.nodos = Math.round(nodos.length / nf.length);
  return snap;
}
function difSnaps(a, b) {
  const ma = new Map(a.porCtor), mb = new Map(b.porCtor);
  const out = [];
  for (const [ctor, szB] of mb) out.push({ ctor, aMB: Math.round((ma.get(ctor) || 0) / 1048576 * 100) / 100, bMB: Math.round(szB / 1048576 * 100) / 100, deltaMB: Math.round((szB - (ma.get(ctor) || 0)) / 1048576 * 100) / 100 });
  for (const [ctor, szA] of ma) if (!mb.has(ctor)) out.push({ ctor, aMB: Math.round(szA / 1048576 * 100) / 100, bMB: 0, deltaMB: -Math.round(szA / 1048576 * 100) / 100 });
  return out.sort((x, y) => y.deltaMB - x.deltaMB);
}

// --- Fase 5: sub-atribución de los ArrayBuffer grandes (fase 4 dejó el retenido en
// 'system / JSArrayBufferData'; esto camina las aristas inversas del snapshot y agrupa
// cada JSArrayBufferData ≥256 KB por la cadena de retenedores hasta el primer nombre
// específico: atribuye el binario retenido a su dueño real en el motor). ---
function subAtribuirAB(snap) {
  const d = snap.raw; if (!d) return null;
  const meta = d.snapshot.meta, nf = meta.node_fields, ef = meta.edge_fields, str = d.strings;
  const iName = nf.indexOf('name'), iSize = nf.indexOf('self_size'), iNEdges = nf.indexOf('edge_count');
  const iEType = ef.indexOf('type'), iEName = ef.indexOf('name_or_index'), iETo = ef.indexOf('to_node');
  const nodos = d.nodes, aristas = d.edges, nN = Math.floor(nodos.length / nf.length);
  const nE = Math.floor(aristas.length / ef.length);
  // adyacencia inversa compacta: arista e va de -> a; para cada nodo, lista de aristas entrantes
  const cab = new Int32Array(nN).fill(-1), sig = new Int32Array(nE), de = new Int32Array(nE), nomA = new Int32Array(nE);
  let pos = 0;
  for (let o = 0; o < nN; o++) {
    const ne = nodos[o * nf.length + iNEdges];
    for (let k = 0; k < ne; k++) {
      const e = pos++;
      const to = Math.floor(aristas[e * ef.length + iETo] / nf.length);
      de[e] = o; nomA[e] = aristas[e * ef.length + iEName];
      sig[e] = cab[to]; cab[to] = e;
    }
  }
  const nomNodo = o => str[nodos[o * nf.length + iName]] || '';
  const etiqueta = e => {
    const t = meta.edge_types[0][aristas[e * ef.length + iEType]];
    if (t === 'element') return '[' + aristas[e * ef.length + iEName] + ']';
    if (t === 'hidden') return '';
    return str[aristas[e * ef.length + iEName]] || '';
  };
  const GENERICO = new Set(['', 'Object', 'Array', 'JSArrayBufferData', 'ArrayBuffer', 'system', '(anonymous)', 'NativeContext', 'WeakNativeContextSet']);
  // nombres "específicos" que NO paran la cadena: atravesamos el nodo y seguimos hasta el dueño real
  // (fase 5: 9→34 buffers retenidos por 'reactions_or_result→Promise'; la Promise es sólo el eslabón)
  const TRANSPARENTE = new Set(['Promise']);
  const esAB = o => /ArrayBufferData/.test(nomNodo(o));
  const GRANDE = 64 * 1024;
  const grupos = new Map(); let totalAB = 0, nAB = 0, huerfanos = 0;
  const cubetas = { '64-256K': [0, 0], '256K-1M': [0, 0], '1-4M': [0, 0], '>4M': [0, 0] }; // [n, bytes]
  // vistos con marca de generación: un solo array para todos los BFS (un Uint8Array por nodo
  // haría miles de allocaciones de ~1 MB en snapshots de 800 k nodos)
  const vistosGen = new Int32Array(nN); let gen = 0;
  for (let o = 0; o < nN; o++) {
    const sz = nodos[o * nf.length + iSize];
    if (!esAB(o)) continue;
    const cb = sz < 262144 ? '64-256K' : sz < 1048576 ? '256K-1M' : sz < 4194304 ? '1-4M' : '>4M';
    cubetas[cb][0]++; cubetas[cb][1] += sz;
    if (sz < GRANDE) continue;
    totalAB += sz; nAB++;
    // BFS ascendente: primer nombre específico (atravesando Promise; con 3 saltos de contexto más)
    let nivel = [{ o, camino: [] }], firma = null;
    gen++; vistosGen[o] = gen;
    for (let paso = 0; paso < 10 && !firma; paso++) {
      const sigNivel = [];
      for (const { o: actual, camino } of nivel) {
        for (let e = cab[actual]; e !== -1; e = sig[e]) {
          const padre = de[e];
          if (vistosGen[padre] === gen) continue; vistosGen[padre] = gen;
          const nPadre = nomNodo(padre);
          const nBase = nPadre.replace(/^system \/ /, '');
          const c2 = camino.concat((etiqueta(e) || '·') + '→' + nPadre);
          if (paso >= 1 && !GENERICO.has(nBase) && !TRANSPARENTE.has(nBase) && !/^[\d.,]+$/.test(nBase)) { firma = c2.slice(-4); break; }
          sigNivel.push({ o: padre, camino: c2 });
        }
        if (firma) break;
      }
      nivel = sigNivel;
      if (!nivel.length) break;
    }
    if (!firma) { firma = [nivel.length ? 'profundo>10' : 'huérfano']; if (!nivel.length) huerfanos++; }
    const clave = firma.join('  ‹  ');
    const g = grupos.get(clave) || { b: 0, n: 0 }; g.b += sz; g.n++; grupos.set(clave, g);
  }
  const lista = [...grupos.entries()].sort((a, b) => b[1].b - a[1].b);
  return { umbralKB: GRANDE / 1024, totalMB: Math.round(totalAB / 1048576 * 10) / 10, n: nAB, huerfanos,
    cubetas: Object.fromEntries(Object.entries(cubetas).map(([k, [n, b]]) => [k, { n, mb: Math.round(b / 1048576 * 100) / 100 }])),
    grupos: lista.map(([clave, g]) => ({ clave, b: g.b, n: g.n })),
    top: lista.slice(0, 25)
      .map(([clave, g]) => ({ clave, mb: Math.round(g.b / 1048576 * 100) / 100, n: g.n })) };
}
// diff de la sub-atribución entre dos snapshots: qué dueños crecen (clave = cadena de retenedores)
function difAB(a, b) {
  if (!a || !b) return null;
  const ma = new Map(a.grupos.map(g => [g.clave, g])), out = [];
  for (const g of b.grupos) {
    const x = ma.get(g.clave);
    const aMB = x ? x.b / 1048576 : 0, bMB = g.b / 1048576;
    if (Math.abs(bMB - aMB) < 0.3) continue;
    out.push({ clave: g.clave, aMB: Math.round(aMB * 100) / 100, bMB: Math.round(bMB * 100) / 100,
      deltaMB: Math.round((bMB - aMB) * 100) / 100, aN: x ? x.n : 0, bN: g.n });
  }
  return out.sort((x, y) => y.deltaMB - x.deltaMB).slice(0, 30);
}

// Semilla de cap1 (jugador existente: Jugar entra directo, sin creador) — misma que kimi2_qa53.js (QA-111)
const SEMILLA_SAVE_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi2-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;
const MUESTRA_JS = `(() => { const m = performance.memory || {}; let info = null, progs = 0, st = null;
  try { const R = AV.G.renderer; info = { geometries: R.renderer.info.memory.geometries, textures: R.renderer.info.memory.textures };
    progs = R.renderer.info.programs ? R.renderer.info.programs.length : 0; st = R.stats(); } catch (e) {}
  let zonas = null;
  try { const s = AV.G.streaming.gestor.stats(); zonas = { n: s.zonas, cerca: s.zonasCerca, lejos: s.zonasLejos, hd: s.modelosHD,
    kbGeo: s.kbGeometria, mats: s.materiales, inst: s.instancias, descargando: s.descargando }; } catch (e) {}
  let px = null, pz = null;
  try { const c = AV.G.camara; const p = (c && (c.pos || c.p)) || null;
    if (p && 'x' in p) { px = Math.round(p.x); pz = Math.round(p.z); } else if (c && 'x' in c) { px = Math.round(c.x); pz = Math.round(c.z); } } catch (e) {}
  return { t: Math.round(performance.now()), heapUsado: m.usedJSHeapSize || 0, heapTotal: m.totalJSHeapSize || 0,
    geometries: info && info.geometries, textures: info && info.textures, programas: progs,
    calls: st && st.calls, tris: st && st.triangulos, fps: st && st.fps, calidad: st && st.calidad, sombras: st && st.sombras,
    zonas: zonas, px: px, pz: pz }; })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', '--js-flags=--expose-gc', '--window-size=500,900'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools en 60 s: ' + err.slice(0, 300));
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const res = { movil: { ancho: ANCHO, alto: ALTO, dpr: DPR, cpu: CPU, secs: SECS, cap: CAP, etiqueta: ETIQUETA || null, calidad: CALIDAD || 'auto' }, gpu: null, muestras: [], red: null };
  const chromeL = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${chromeL.puerto}${chromeL.wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const net = { urls: {}, total: 0, porExt: {}, fallos: 0, n: 0 };
  cdp.onEvent = d => {
    if (d.method === 'HeapProfiler.addHeapSnapshotChunk') { if (snapActual) snapActual.chunks.push(d.params.chunk); }
    else if (d.method === 'Network.responseReceived') { const r = d.params.response; net.urls[d.params.requestId] = { u: r.url, mb: 0, mime: r.mimeType }; }
    else if (d.method === 'Network.loadingFinished') { const e = net.urls[d.params.requestId]; if (e) { e.mb = (d.params.encodedDataLength || 0) / 1048576; net.total += e.mb; net.n++;
      const ext = (e.u.match(/\.(\w+)(?:[?#]|$)/) || [,'?'])[1].toLowerCase(); net.porExt[ext] = (net.porExt[ext] || 0) + e.mb; } }
    else if (d.method === 'Network.loadingFailed') { net.fallos++; }
  };
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Network.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
    const t0 = Date.now();
    await cdp.call('Page.navigate', { url: origen + '/index.html?qa=1&cap=' + CAP + (CALIDAD ? '&calidad=' + encodeURIComponent(CALIDAD) : '') }, ses);
    const limiteMs = SECS * 1000;
    let nMuestra = 0, perfilando = false, snapIdx = 0;
    const snaps = [];
    while (Date.now() - t0 < limiteMs) {
      await cdp.bombear(0.5);
      // gc cada ~10 s para separar heap retenido de basura (muestra marcada gc=true)
      if (++nMuestra % 20 === 0) { try { await ev(cdp, ses, `window.gc()`, 5, false); } catch (e) {} }
      // muestreo de asignaciones desde el segundo 40 (post-reveal: atribuye el crecimiento, no la carga)
      if (PERFIL && !perfilando && nMuestra >= 80) { try { await cdp.call('HeapProfiler.startSampling', { samplingInterval: 32768 }, ses); perfilando = true; } catch (e) {} }
      // snapshots en los segundos pedidos (gc justo antes para medir retenido)
      if (snapIdx < SNAP_T.length && (Date.now() - t0) / 1000 >= SNAP_T[snapIdx]) {
        const T = SNAP_T[snapIdx]; snapIdx++;
        console.log(`  [snap] #${snapIdx} a los ~${T}s: gc + takeHeapSnapshot...`);
        try { await ev(cdp, ses, `window.gc()`, 15, false); } catch (e) {}
        await cdp.bombear(0.7);
        try {
          const s = agregarSnap(await tomarSnap(cdp, ses, T)); snaps.push(s);
          console.log(`  [snap] #${snapIdx} listo: ${s.nodos} nodos, self_size total ${s.totalMB} MB, ${s.porCtor.length} constructores`);
          if (AB) {
            s.abDet = subAtribuirAB(s); s.raw = null;
            if (s.abDet) console.log(`  [ab] ArrayBuffer ≥${s.abDet.umbralKB} KB: ${s.abDet.totalMB} MB en ${s.abDet.n} buffers` +
              (s.abDet.top.length ? '\n    ' + s.abDet.top.slice(0, 10).map(g => `${g.mb} MB ×${g.n}  ${g.clave}`).join('\n    ') : ''));
          }
        }
        catch (e) { console.log('  [snap] falló: ' + e.message); }
      }
      try { const m = await ev(cdp, ses, MUESTRA_JS, 5, false); if (m) { m.s = Math.round((Date.now() - t0) / 100) / 10; m.gc = nMuestra % 20 === 0; res.muestras.push(m); } } catch (e) { /* aún no hay AV */ }
    }
    if (snaps.length) {
      res.snaps = snaps.map(s => ({ t: s.t, totalMB: s.totalMB, nodos: s.nodos, top: s.porCtor.slice(0, 40).map(([ctor, sz]) => ({ ctor, mb: Math.round(sz / 1048576 * 100) / 100 })), abDet: s.abDet || null }));
      if (snaps.length >= 2) {
        res.snapDiff = difSnaps(snaps[0], snaps[1]).slice(0, 60);
        res.abDiff = difAB(snaps[0].abDet, snaps[1].abDet);
        if (res.abDiff && res.abDiff.length) {
          console.log('\nAB DIFF (dueños de ArrayBuffer que crecen, por cadena de retenedores):');
          for (const d of res.abDiff.filter(x => x.deltaMB > 0).slice(0, 15))
            console.log(`  +${d.deltaMB} MB (${d.aN}→${d.bN} buffers)  ${d.clave}`);
        }
        console.log('\nSNAP DIFF (por constructor, self_size):');
        for (const d of res.snapDiff.filter(x => Math.abs(x.deltaMB) >= 1).slice(0, 30))
          console.log(`  ${d.deltaMB >= 0 ? '+' : ''}${d.deltaMB} MB  ${d.ctor}  (${d.aMB} → ${d.bMB})`);
      }
    }
    if (perfilando) {
      try {
        const p = (await cdp.call('HeapProfiler.stopSampling', {}, ses, 60 * 1000)).profile;
        const nodos = [];
        (function pasear(n, pila) {
          const cf = n.callFrame || {};
          const sitio = (cf.functionName || '(anónima)') + ' @ ' + (cf.url || '').split('/').slice(-1)[0] + ':' + ((cf.lineNumber || 0) + 1);
          if (n.selfSize > 0) nodos.push({ selfSize: n.selfSize, sitio, pila: pila.concat(sitio).slice(-6) });
          for (const c of n.children || []) pasear(c, pila.concat(sitio).slice(-6));
        })(p.head, []);
        nodos.sort((a, b) => b.selfSize - a.selfSize);
        res.perfil = { totalMB: Math.round(nodos.reduce((s, n) => s + n.selfSize, 0) / 1048576 * 10) / 10,
          top: nodos.slice(0, 30).map(n => ({ mb: Math.round(n.selfSize / 1048576 * 100) / 100, sitio: n.sitio, pila: n.pila.join(' ← ') })) };
        console.log('\nPERFIL asignaciones (top 20):\n  ' + res.perfil.top.slice(0, 20).map(n => `${n.mb} MB  ${n.sitio}   [${n.pila}]`).join('\n  '));
      } catch (e) { console.log('perfil falló: ' + e.message); }
    }
    try { res.gpu = await ev(cdp, ses, `(() => { const gl = AV.G.renderer.renderer.getContext(); const ext = gl.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'sin debug_info'; })()`, 15); } catch (e) { res.gpu = 'n/d'; }
    res.red = { totalMB: Math.round(net.total * 10) / 10, n: net.n, fallos: net.fallos, porExt: net.porExt,
      top: Object.values(net.urls).filter(e => e.mb > 0.05).sort((a, b) => b.mb - a.mb).slice(0, 40).map(e => ({ u: e.u.split('/').slice(-2).join('/'), mb: Math.round(e.mb * 100) / 100, mime: e.mime })) };
    const heap = res.muestras.map(m => m.heapUsado || 0), max = Math.max(...heap);
    const heapGC = res.muestras.filter(m => m.gc).map(m => m.heapUsado);
    console.log(`RESULTADO ${res.muestras.length} muestras en ${SECS} s · GPU: ${res.gpu}`);
    for (const m of res.muestras.filter((_, i) => i % 10 === 0 || i === res.muestras.length - 1))
      console.log(`  t=${m.s}s heap=${(m.heapUsado / 1048576).toFixed(1)}${m.gc ? ' (gc)' : ''} MB geo=${m.geometries} tex=${m.textures} prog=${m.programas} calls=${m.calls} zonas=${m.zonas ? m.zonas.n + '/' + m.zonas.cerca + 'c' + m.zonas.lejos + 'l' : '?'} hd=${m.zonas ? m.zonas.hd : '?'} pos=${m.px},${m.pz} cal=${m.calidad}`);
    console.log(`  heap máx: ${(max / 1048576).toFixed(1)} MB · heap tras gc: ${heapGC.length ? (Math.max(...heapGC) / 1048576).toFixed(1) : 'n/d'} MB máx · red: ${res.red.totalMB} MB en ${net.n} recursos (${JSON.stringify(net.porExt)})`);
    if (res.red.top.length) console.log('  top red:\n    ' + res.red.top.slice(0, 15).map(e => `${e.mb} MB  ${e.u}`).join('\n    '));
  } finally {
    try { chromeL.chrome.kill(); } catch (e) {}
    for (const p of fs.readdirSync(os.tmpdir()).filter(x => x.startsWith('kimi2-'))) { try { fs.rmSync(path.join(os.tmpdir(), p), { recursive: true, force: true }); } catch (e) {} }
    srv.close();
    try { ws.close(); } catch (e) {}
  }
  fs.writeFileSync(path.join(SALIDA, `qa152-cap${CAP}${ETIQUETA ? '-' + ETIQUETA : ''}.json`), JSON.stringify(res, null, 1));
  process.exit(0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
