#!/usr/bin/env node
/* KIMI-356 · sonda de atribución del heap JS retenido (quedante de KIMI-354/KIMI-350:
   +~83-90 MB entre 9ca12739 (baseline 121 MB) y HEAD, sin coste de FPS medible).
   Toma un V8 heap snapshot por CDP en cap. 1 asentado (perfil Chromebook 1366×768
   DPR 1, CPU ×6, calidad «bajo», misma ventana que el canónico KIMI-329) y lo analiza:
     (1) self_size y count por nombre de nodo (className / tipo V8);
     (2) los top ArrayBuffers/typed arrays con su retentor directo y el del retentor
         (pista del módulo: caches de streaming, parse de GLB, atlas, módulos);
     (3) heap performance.memory natural y tras HeapProfiler.collectGarbage (×2),
         renderer.info.memory y stats() para cruzar con renderer.info (geo 123→~590).
   Uso: node tools/build/kimi1_356_heap.js [--etiqueta k356-heap-r1] [--ref 9ca12739]
        --ref exporta el commit a tmp con `git archive` y sirve ese árbol (no toca el
        worktree); sin --ref sirve el worktree actual. */
'use strict';
if (!process.execArgv.some(a => a.startsWith('--max-old-space-size'))) {
  const r = require('child_process').spawnSync(process.execPath, ['--max-old-space-size=6144', __filename, ...process.argv.slice(2)], { stdio: 'inherit' });
  process.exit(r.status == null ? 1 : r.status);
}
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn, spawnSync, execFileSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const ETIQ = (process.argv.indexOf('--etiqueta') > 0 ? process.argv[process.argv.indexOf('--etiqueta') + 1] : 'k356-heap-r1');
const REF = (process.argv.indexOf('--ref') > 0 ? process.argv[process.argv.indexOf('--ref') + 1] : '');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ktx2': 'image/ktx2' };
function servir(dirRaiz) { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(dirRaiz, p); if (!f.startsWith(dirRaiz) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); this.onevt = null; ws.onerror = () => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } else if (d.method && this.onevt) this.onevt(d); }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } }
async function ev(cdp, ses, exp, t) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: true, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result ? r.result.value : undefined; }
const MODO_PORTADA = process.argv.includes('--portada'); // KIMI-356 r1: la ruta ?pack=cap1&mapa=real+semilla mata este Chrome headless a los ~1-2 s de navegar (sin stderr); la entrada por portada sobrevive. El análisis es idéntico; la comparabilidad 1:1 con el baseline KIMI-329 queda para la próxima vuelta (--ref + modo semilla, pendiente de aislar el crash).
const LISTO_JS = `window.AV && window.AV.G && window.AV.G.actores && (window.AV.G.actores.player3D || window.AV.G.actores.failed3D)`;
// Entrada canónica KIMI-329 (misma que kimi1_127.js): semilla de guardado del cap. 1
// (partida sembrada, sin creador) + ?pack=cap1&mapa=real — la portada/creador deja un
// mundo más pobre (heap 81 MB) que no es comparable con el baseline 121/204-228.
const SEMILLA = `try {
  localStorage.clear(); sessionStorage.clear();
  window.__erroresConsola = [];
  addEventListener('error', e => __erroresConsola.push(String(e.message || e)));
  addEventListener('unhandledrejection', e => __erroresConsola.push('rechazo: ' + (e.reason && e.reason.message || e.reason)));
  const cerr = console.error; console.error = function () { try { __erroresConsola.push([].map.call(arguments, String).join(' ').slice(0, 300)); } catch (e) {} return cerr.apply(this, arguments); };
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({"v":6,"formato":2,"escrito":0,"saveId":"qa-kimi1k356","profile":{"created":true,"name":"Estrella de la Bahía","look":null},"pos":{"x":-8,"z":-2.5,"y":0},"facing":{"x":0,"z":1},"step":0,"inv":{},"collected":[],"complete":false,"explorando":false,"clock":0,"events":[],"captures":{},"missions":{},"field":[],"unlocked":[],"wear":{},"comic":{"title":"Mi cómic","cover":"vittata","layout":"grid","order":[0,1,2,3],"captions":{},"vinetas":{}},"evaluated":{"A":false,"B":false},"examined":{"maquina":false,"transmisor":false}}));
} catch (e) {}`;
const ENTRAR_PORTADA = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id); const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { if (f()) return true; await sleep(100); } return !!f(); }; const t = $('title'); if (!t || !t.open) return 'no hay portada abierta'; t.querySelector('form[method=dialog] button').click(); if (!await espera(() => !t.open, 3000)) return 'portada'; const cr = $('creator'); if (!cr || !await espera(() => !cr.hidden, 8000)) return 'creador'; await espera(() => $('p-stage-status') && $('p-stage-status').hidden, 30000); const s = $('p-save'); if (!s) return 'sin Empezar'; s.click(); if (!await espera(() => cr.hidden, 8000)) return 'Empezar no cerró'; const C = window.AV && window.AV.cargaEsperar ? await window.AV.cargaEsperar(30000) : null; const sx = $('c1-saltar'); if (sx) sx.click(); return 'ok' + (C ? ' carga ' + C.ms + ' ms' : ''); })()`;
const ENTRAR = `(async () => { try { return await (async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene Jugar'; b.click();
    if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta'; }
  const S = window.AV && window.AV.state; if (!S) return 'sin AV.state';
  if (!await espera(() => S.profile && S.profile.created, 45000)) return 'sin perfil';
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(30000);
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 60000);
  const b = document.getElementById('c1-saltar'); if (b) b.click();
  await sleep(800);
  const f = document.getElementById('c1-fade'); if (f) f.remove();
  if (AV.G.ui && AV.G.ui.hideToast) AV.G.ui.hideToast();
  try { window.dispatchEvent(new PointerEvent('pointerdown')); } catch (e) {}
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

// Análisis del snapshot: self_size por nombre, por tipo V8, y retentores de los top buffers.
function analiza(snap) {
  const meta = snap.snapshot.meta, nodes = snap.nodes, edges = snap.edges, strings = snap.strings;
  const NF = meta.node_fields.length, EF = meta.edge_fields.length;
  const TI = meta.node_fields.indexOf('type'), NI = meta.node_fields.indexOf('name'), SI = meta.node_fields.indexOf('self_size'), ECI = meta.node_fields.indexOf('edge_count');
  const ET = meta.edge_fields.indexOf('type'), EN = meta.edge_fields.indexOf('name_or_index'), EO = meta.edge_fields.indexOf('to_node');
  const nN = Math.floor(nodes.length / NF);
  const tipoV8 = i => meta.node_types[0][nodes[i * NF + TI]] || String(nodes[i * NF + TI]);
  const nombre = i => strings[nodes[i * NF + NI]] || '';
  const porNombre = new Map(), porTipo = new Map();
  for (let i = 0; i < nN; i++) {
    const s = nodes[i * NF + SI]; if (!s) continue;
    const nm = nombre(i) || ('<' + tipoV8(i) + '>');
    let e = porNombre.get(nm); if (!e) { e = { n: 0, bytes: 0 }; porNombre.set(nm, e); }
    e.n++; e.bytes += s;
    const tv = tipoV8(i); let t = porTipo.get(tv); if (!t) { t = { n: 0, bytes: 0 }; porTipo.set(tv, t); }
    t.n++; t.bytes += s;
  }
  const top = (map, k) => [...map.entries()].sort((a, b) => b[1].bytes - a[1].bytes).slice(0, k).map(([k2, v]) => ({ nombre: k2, n: v.n, MB: +(v.bytes / 1048576).toFixed(2) }));
  // Primer retentor de cada nodo (origen de la primera edge entrante).
  const retDe = new Int32Array(nN).fill(-1); const retEdge = new Int32Array(nN).fill(-1);
  for (let i = 0, e = 0; i < nN; i++) {
    const ec = nodes[i * NF + ECI];
    for (let k = 0; k < ec; k++, e += EF) {
      const to = edges[e + EO] / NF | 0;
      if (to >= 0 && to < nN && retDe[to] === -1) { retDe[to] = i; retEdge[to] = e; }
    }
  }
  const nombreEdge = e2 => { const ty = edges[e2 + ET]; if (meta.edge_types[0][ty] === 'element' || typeof edges[e2 + EN] === 'number') { const s = strings[edges[e2 + EN]]; if (s) return s; } return meta.edge_types[0][ty]; };
  const esBuffer = nm => /ArrayBuffer|Uint8Array|Uint16Array|Uint32Array|Int8Array|Int16Array|Int32Array|Float32Array|Float64Array|DataView|SharedArrayBuffer/.test(nm);
  const grandes = [];
  for (let i = 0; i < nN; i++) { const nm = nombre(i); if (esBuffer(nm) && nodes[i * NF + SI] >= 262144) grandes.push(i); }
  grandes.sort((a, b) => nodes[b * NF + SI] - nodes[a * NF + SI]);
  const topRet = grandes.slice(0, 25).map(i => {
    const r = retDe[i], r2 = r >= 0 ? retDe[r] : -1;
    return { clase: nombre(i) || '<' + tipoV8(i) + '>', MB: +(nodes[i * NF + SI] / 1048576).toFixed(2), retentor: r >= 0 ? (nombre(r) || '<' + tipoV8(r) + '>') + (retEdge[r] >= 0 ? ' · ' + nombreEdge(retEdge[r]) : '') : '(raíz)', retentor2: r2 >= 0 ? (nombre(r2) || '<' + tipoV8(r2) + '>') : null };
  });
  // Sintéticos: todo el subárbol retenido (dominadores no; usamos tamaño acumulado de los
  // top nodos por nombre como proxy de «quién pesa» en la escena del juego).
  return { nodos: nN, edges: Math.floor(edges.length / EF), porTipo: top(porTipo, 20), porNombre: top(porNombre, 45), topRetenidos: topRet, traceVacio: !snap.trace_function_infos || snap.trace_function_infos.length === 0 };
}

(async () => {
  const log = [];
  const tIni = Date.now();
  const L = s => { const l = '+' + Math.round((Date.now() - tIni) / 1000) + 's ' + s; log.push(l); console.log(l); };
  let dirRaiz = RAIZ, tmpRef = null;
  if (REF) { tmpRef = fs.mkdtempSync(path.join(os.tmpdir(), 'k356ref-')); const tarPath = path.join(tmpRef, 'ref.tar'); const arch = spawnSync('git', ['archive', '-o', tarPath, REF, '--', 'index.html', 'sw.js', 'src', 'content', 'assets'], { cwd: RAIZ, maxBuffer: 1 << 24 }); if (arch.status) throw new Error('git archive falló: ' + String(arch.stderr).slice(0, 200)); const tar = spawnSync('tar', ['--force-local', '-xf', tarPath, '-C', tmpRef], { maxBuffer: 1 << 24 }); if (tar.status) throw new Error('tar falló: ' + String(tar.stderr).slice(0, 200)); fs.rmSync(tarPath, { force: true }); dirRaiz = tmpRef; L('sirviendo --ref ' + REF + ' desde ' + tmpRef); }
  const srv = await servir(dirRaiz);
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'k1heap-')); // sin «kimi» en la ruta: el mata-zombis ajeno (Temp.kimi) lo fusilaba a mitad de corrida
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--window-size=1366,768', '--force-device-scale-factor=1', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let chromeVivo = true; chrome.on('exit', () => { chromeVivo = false; });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort');
  let puertoDev, wsPath;
  for (let i = 0; i < 100; i++) { try { const s = fs.readFileSync(pf, 'utf8').split('\n'); if (s.length > 1) { puertoDev = parseInt(s[0], 10); wsPath = s[1]; break; } } catch (e) {} await new Promise(r => setTimeout(r, 150)); }
  if (!puertoDev) { chrome.kill(); throw new Error('sin DevToolsActivePort: ' + err.slice(-300)); }
  const WebSocket = (() => { try { return require('ws'); } catch (e) { return globalThis.WebSocket; } })();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const { targetId } = await cdp.call('Target.createTarget', { url: 'about:blank' });
  const { sessionId: ses } = await cdp.call('Target.attachToTarget', { targetId, flatten: true });
  L('DevTools puerto ' + puertoDev + ' · target listo');
  await cdp.call('Page.enable', {}, ses); await cdp.call('Runtime.enable', {}, ses);
  const out = { tarea: 'KIMI-356', etiqueta: ETIQ, hora_utc: new Date().toISOString(), pantalla: 'chromebook 1366x768@1 cpuX6', calidad: 'bajo', pack: 'cap1', modo: MODO_PORTADA ? 'portada' : 'semilla-pack', ref: REF || null, head: null, heap: {}, juego: null, analisis: null, ok: true };
  try { out.head = execFileSync('git', ['rev-parse', '--short=8', 'HEAD'], { cwd: RAIZ }).toString().trim(); } catch (e) {}
  try {
    if (MODO_PORTADA) {
      await cdp.call('Page.navigate', { url: `http://127.0.0.1:${srv.puerto}/?fps=1&calidad=bajo` }, ses);
      await new Promise(r => setTimeout(r, 3500));
      const prepP = await ev(cdp, ses, ENTRAR_PORTADA, 120);
      L('entrar (portada): ' + prepP);
      if (!chromeVivo) throw new Error('chrome matado externamente durante la entrada (mata-zombis ajeno)');
      if (!/^ok/.test(prepP)) throw new Error('entrada portada: ' + prepP);
    } else {
      await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA }, ses);
      await cdp.call('Page.navigate', { url: `http://127.0.0.1:${srv.puerto}/index.html?pack=cap1&mapa=real&calidad=bajo&fps=1` }, ses);
      let listo = false;
      for (let i = 0; i < 240; i++) { if (!chromeVivo) throw new Error('chrome murió durante la carga; stderr: ' + err.slice(-300)); try { if (await ev(cdp, ses, LISTO_JS, 8)) { listo = true; break; } } catch (e) {} await new Promise(r => setTimeout(r, 1000)); }
      if (!listo) throw new Error('el juego no arrancó (listo_js en 240 s)');
      try { await cdp.call('Emulation.setCPUThrottlingRate', { rate: 6 }, ses); } catch (e) {} // tras la carga: el throttle ×6 en la fase más pesada colgaba/mataba el headless nuevo
      const prep = await ev(cdp, ses, ENTRAR, 150);
      L('entrar (semilla): ' + prep);
      if (!/^ok/.test(prep)) throw new Error('entrada: ' + prep);
    }
    await new Promise(r => setTimeout(r, 15000)); // asentar como en KIMI-329 (spawn quieto tras el salto del cómic)
    const heap0 = await ev(cdp, ses, `performance.memory ? Math.round(performance.memory.usedJSHeapSize/1048576) : null`, 10);
    await cdp.call('HeapProfiler.enable', {}, ses);
    await cdp.call('HeapProfiler.collectGarbage', {}, ses); await new Promise(r => setTimeout(r, 1000));
    await cdp.call('HeapProfiler.collectGarbage', {}, ses); await new Promise(r => setTimeout(r, 1000));
    const heapGC = await ev(cdp, ses, `performance.memory ? Math.round(performance.memory.usedJSHeapSize/1048576) : null`, 10);
    out.heap = { naturalMB: heap0, trasGC_MB: heapGC };
    L('heap natural ' + heap0 + ' MB · tras GC ' + heapGC + ' MB');
    out.juego = await ev(cdp, ses, `(() => { const o = {}; try { const r = AV.G.renderer; o.stats = r.stats ? r.stats() : null; o.geo = r.info && r.info.memory ? r.info.memory.geometries : null; o.tex = r.info && r.info.memory ? r.info.memory.textures : null; o.programas = r.info && r.info.programs ? r.info.programs.length : null; } catch (e) { o.errStats = String(e).slice(0, 160); } try { const m = AV.look && AV.look.medir ? AV.look.medir() : null; if (m) { o.texturasMB = m.texturasMB; o.heapMB = m.heapMB; o.calls = m.calls; o.triangulos = m.triangulos; } } catch (e) { o.errMed = String(e).slice(0, 160); } return o; })()`, 45).catch(e => ({ error: String(e).slice(0, 200) }));
    L('juego: ' + JSON.stringify(out.juego));
    const chunks = [];
    cdp.onevt = d => { if (d.method === 'HeapProfiler.addHeapSnapshotChunk') chunks.push(d.params.chunk); };
    const t0 = Date.now();
    if (!chromeVivo) throw new Error('chrome matado externamente antes del snapshot (mata-zombis ajeno)');
    await cdp.call('HeapProfiler.takeHeapSnapshot', { reportProgress: false }, ses, 420000);
    cdp.onevt = null;
    L('snapshot recibido en ' + Math.round((Date.now() - t0) / 1000) + ' s · ' + chunks.length + ' chunks · ' + (chunks.reduce((a, c) => a + c.length, 0) / 1048576).toFixed(1) + ' MB de JSON');
    const snap = JSON.parse(chunks.join(''));
    chunks.length = 0;
    out.analisis = analiza(snap);
    const consola = await ev(cdp, ses, `(window.__aveErrores || (window.AV && AV.G && AV.G.consolaErrores) || []).length`, 10).catch(() => null);
    out.erroresConsola = consola;
    L('nodos ' + out.analisis.nodos + ' · edges ' + out.analisis.edges + ' · trace vacío ' + out.analisis.traceVacio);
    L('top porNombre: ' + out.analisis.porNombre.slice(0, 12).map(x => x.nombre + ' ' + x.MB + ' MB (' + x.n + ')').join(' · '));
  } catch (e) { out.ok = false; out.error = String(e && e.message || e).slice(0, 400); L('ERROR: ' + out.error); }
  try { await cdp.call('Browser.close', {}, ses, 8000); } catch (e) { chrome.kill(); }
  await new Promise(r => setTimeout(r, 800));
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) {}
  if (tmpRef) try { fs.rmSync(tmpRef, { recursive: true, force: true }); } catch (e) {}
  srv.srv.close();
  fs.mkdirSync(path.join(RAIZ, 'docs', 'img', 'kimi127'), { recursive: true });
  fs.writeFileSync(path.join(RAIZ, 'docs', 'img', 'kimi127', 'k127_' + ETIQ + '.json'), JSON.stringify(out, null, 1));
  fs.writeFileSync(path.join(RAIZ, 'docs', 'img', 'kimi127', 'k127_' + ETIQ + '.log'), log.join('\n') + '\n');
  console.log('evidencia: docs/img/kimi127/k127_' + ETIQ + '.json/.log');
  process.exit(out.ok ? 0 : 1);
})();
