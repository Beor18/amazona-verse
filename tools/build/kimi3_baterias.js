#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — medición del tirón de «Empezar» (QA-53/BM119, KIMI-Task-012).
   Réplica en Node de la parte de medición de tools/build/qa_movil.py (Mac, sin python en esta máquina):
   Chrome headless propio + CDP; móvil 375×812 dpr 3 táctil con UA de iPhone y CPU ×4; jugador nuevo
   (origen limpio): portada → Jugar → creador → Empezar; por escena reporta cuadros p50/p95/peor/>100 ms,
   tareas largas, heap, texturas y draw calls. N rondas (la aceptación de QA-53 es peor < 500 ms en 4 de 4).

   Uso: node tools/build/kimi2_empezar.js [--rondas 4] [--pack cap1] [--cpu 4] [--salida DIR] [--puerto N]
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
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const RONDAS = parseInt(arg('--rondas', '4'), 10);
const PACK = arg('--pack', 'cap1');
const CPU = parseFloat(arg('--cpu', '4'));
const BATERIAS = process.argv.includes('--baterias');
const CAPTURAS = process.argv.includes('--capturas');
const EXTRA_URL = arg('--extra-url', '');
const VISTAS = arg('--vistas', '');   // "x,z,yaw;x,z,yaw" (yaw en radianes; vacío = solo la vista de aparición)
const PREFIJO = arg('--prefijo', PACK);
const DIR_CAPTURAS = arg('--dir', path.join(RAIZ, 'docs', 'img', 'kimi014'));
const LISTA_BATERIAS = ['selfTest', 'missionTest', 'accessoryTest', 'templateTest', 'eduTest', 'maestroTest', 'criaderoTest', 'movementTest', 'saveTest', 'comicTest', 'e2eTest', 'lookCapitulosTest'];
const SOLO = arg('--solo', '');
const ANCHO = parseInt(arg('--ancho', '375'), 10), ALTO = parseInt(arg('--alto', '812'), 10), DPR = parseFloat(arg('--dpr', '3'));
const SALIDA = arg('--salida', path.join(AQUI, 'salida', 'kimi3-baterias'));
const PERFIL = process.argv.includes('--perfil');
const FASES = process.argv.includes('--fases');
fs.mkdirSync(SALIDA, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };

function servir() {
  const QA_TAG = '<script src="tests/qa/qa.js" charset="utf-8"></script>';
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    const qa = /[?&]qa=1(?:&|$)/.test(req.url);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); return res.end('404'); }
      if (qa && /index\.html$/.test(f)) {
        const html = d.toString('utf8').replace(/<meta charset[^>]*>/i, m => m + QA_TAG);
        d = Buffer.from(html, 'utf8');
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(d);
    });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}

// ---- CDP mínimo (websocket del navegador; sin librerías) ----
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
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 400));
  return r.result ? r.result.value : undefined;
}

function perfil(msPorFn, titulo) {
  const p = msPorFn;
  console.log(`  · perfil ${titulo} — top tiempo propio (ms):`);
  for (const [k, ms] of Object.entries(p.propio).sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(`      %8.0f ms  %s`, ms, k);
  console.log(`  · perfil ${titulo} — WebGL nativo: quién llama (ms):`);
  for (const [k, ms] of Object.entries(p.webgl).sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`      %8.0f ms  %s`, ms, k);
}
function analizarPerfil(pr) {
  const nodos = {}; for (const n of pr.nodes) nodos[n.id] = n;
  const dt = pr.timeDeltas || [], propio = {}, webgl = {};
  const padre = {}; for (const n of pr.nodes) for (const c of n.children || []) padre[c] = n.id;
  const samples = pr.samples || [];
  for (let i = 0; i < samples.length; i++) {
    const cf = nodos[samples[i]].callFrame;
    const k = (cf.functionName || '(anónima)') + ' ' + String(cf.url || '').split('/').pop() + ':' + (cf.lineNumber + 1);
    propio[k] = (propio[k] || 0) + (i < dt.length ? dt[i] : 0) / 1000;
    if (cf.url || !['getProgramInfoLog', 'getShaderInfoLog', 'getProgramParameter', 'texImage2D', 'linkProgram', 'getUniformLocation', 'shaderSource', 'compileShader', 'attachShader'].includes(cf.functionName)) continue;
    let n = samples[i]; const pila = [];
    while (n in padre) { n = padre[n]; const f = nodos[n].callFrame, u = f.url || ''; if (u.includes('/src/') || u.includes('/content/')) { pila.push((f.functionName || '(anónima)') + ' ' + u.split('/').pop() + ':' + (f.lineNumber + 1)); if (pila.length === 3) break; } }
    const q = cf.functionName + ' ← ' + (pila.join(' ← ') || '?');
    webgl[q] = (webgl[q] || 0) + (i < dt.length ? dt[i] : 0) / 1000;
  }
  return { propio, webgl };
}

const SONDA_JS = `(() => { const Q = window.__qaM = { dt: [], largas: [], top: [] }; let t = 0, t0 = 0;
  const f = n => { if (!t0) t0 = n; if (t) { const d = n - t; Q.dt.push(d); const e = { d: Math.round(d), t: Math.round((t - t0) / 100) / 10 };
    const i = Q.top.findIndex(x => x.d < e.d); if (i >= 0) Q.top.splice(i, 0, e); else if (Q.top.length < 6) Q.top.push(e); if (Q.top.length > 6) Q.top.pop(); } t = n;
    if (Q.dt.length > 20000) Q.dt.splice(0, 10000); requestAnimationFrame(f); }; requestAnimationFrame(f);
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) Q.largas.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: true }); } catch (e) {} })();`;

const MEDIR_JS = `(() => { const Q = window.__qaM || { dt: [], largas: [], top: [] }; const d = Q.dt.slice().sort((a, b) => a - b), n = d.length;
  const q = p => n ? Math.round(d[Math.min(n - 1, Math.floor(n * p))]) : 0;
  let st = {}; try { const R = window.AV && AV.G && AV.G.renderer; st = Object.assign({}, (R && R.stats && R.stats()) || {}, (AV.look && AV.look.medir && AV.look.medir()) || {}); } catch (e) {}
  const out = { cuadros: n, p50: q(0.5), p95: q(0.95), peor: n ? Math.round(d[n - 1]) : 0, mas50: d.filter(x => x > 50).length, mas100: d.filter(x => x > 100).length,
    top: (Q.top || []).slice(0, 5),
    largas: Q.largas.length, largaPeor: Q.largas.length ? Math.max(...Q.largas) : 0,
    heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
    texMB: st.texturasMB != null ? st.texturasMB : null, calls: st.calls != null ? st.calls : null, calidad: st.calidad || (window.AV && AV.G && AV.G.renderer && AV.G.renderer.calidad) || null };
  Q.dt = []; Q.largas = []; Q.top = []; return JSON.stringify(out); })()`;

const INICIO_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)); const G = window.AV.G; await (G.mundo && G.mundo.listo); await sleep(6000); return 'ok'; })()`;
const ZONA_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)); const R = AV.G.renderer; const out = [];
  for (const nivel of ['medio', 'alto']) { R.setCalidad(nivel); await sleep(4000); const s = R.stats(); out.push(nivel + ' ' + s.fps + ' FPS · ' + s.calls + ' calls · ' + Math.round(s.triangulos / 1000) + ' k tris · dpr ' + s.dpr); }
  return out.join('  |  '); })()`;

async function lanzarChrome() {
  // Copia del lanzador de kimi2_empezar.js con el arreglo del falso «Chrome murió» (kimi3_baterias):
  // Chrome 156 (Win) a veces delega en un proceso hijo y el lanzador sale code 0 con la flota viva.
  // No se mira exitCode: solo DevToolsActivePort (igual que en kimi3_lonas.js); y con reintentos.
  let ultimo = '';
  for (let intento = 0; intento < 3; intento++) {
    try { return await lanzarChromeUnaVez(); } catch (e) { ultimo = e.message; await new Promise(r => setTimeout(r, 2000)); }
  }
  throw new Error(ultimo);
}
async function lanzarChromeUnaVez() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3b-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--enable-logging=stderr', '--v=0', '--window-size=500,900', 'about:blank'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
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

// Limpia huérfanos de vueltas anteriores: solo chrome cuya línea de comandos lleva el prefijo de perfil de este script.
function limpiarHuerfanos() {
  try {
    const ps = "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*kimi3b-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { /* sin powershell o sin huérfanos: seguir */ }
}

(async () => {
  limpiarHuerfanos();
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws);
  await cdp.listo();
  const errores = [];
  const res = { movil: { ancho: ANCHO, alto: ALTO, dpr: DPR, cpu: CPU, pack: PACK }, rondas: [] };
  console.log(`· servidor ${origen} · Chrome en puerto DevTools (perfil ${perf}) · ${ANCHO}×${ALTO} dpr ${DPR} · CPU ×${CPU}`);

  async function escena(ses, nombre, js, timeoutS) {
    await evaluar(cdp, ses, MEDIR_JS, 30, false); // vacía el registro
    let r = 'ok';
    if (js) { try { r = await evaluar(cdp, ses, js, timeoutS || 300); } catch (e) { r = 'excepción: ' + e.message; } }
    await cdp.bombear(0.5);
    const me = JSON.parse(await evaluar(cdp, ses, MEDIR_JS, 30, false));
    const e = { escena: nombre, resultado: String(r).slice(0, 300), medidas: me };
    console.log(`  · ${nombre}: ${e.resultado.slice(0, 70)} · p50 ${me.p50} p95 ${me.p95} peor ${me.peor} ms (>100 ms: ${me.mas100}) · top ${(me.top || []).map(x => x.d + 'ms@' + x.t + 's').join(', ')}`);
    return e;
  }

  async function nuevaPestana(movil) {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: movil ? ANCHO : 1280, height: movil ? ALTO : 800, deviceScaleFactor: movil ? DPR : 1, mobile: movil }, ses);
    if (movil) {
      await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
      await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
      await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
    }
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}" + SONDA_JS }, ses);
    return { tid, ses };
  }
  async function esperarListo(ses) {
    const t0 = Date.now();
    while (Date.now() - t0 < CFG.espera_listo_s * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) return true; } catch (e) { /* aún no */ }
      await cdp.bombear(0.5);
    }
    return false;
  }

  if (BATERIAS) {
    // Baterías del juego (window.AV) sobre la copia de trabajo servida: sustituye a test.sh, que
    // necesita el python de Blender (no hay python real en esta PC).
    const { tid, ses } = await nuevaPestana(false);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1` }, ses);
    if (!(await esperarListo(ses))) { console.log('· el juego no arrancó'); process.exit(1); }
    // Jugador nuevo como test.sh: portada → Jugar → creador → Empezar
    console.log('· jugador nuevo: ' + await evaluar(cdp, ses, CFG.preparar_js, 300));
    const informe = {};
    for (const b of (SOLO ? SOLO.split(',') : LISTA_BATERIAS)) {
      const t0 = Date.now();
      try {
        const r = await evaluar(cdp, ses, `(async () => { const r = await window.AV.${b}(); await new Promise(s => setTimeout(s, 1500)); return JSON.stringify({ p: r && (r.passed != null ? r.passed : r.pasan != null ? r.pasan : r.ok), t: r && r.total, ok: r && r.ok, mal: ((r && r.results) || (r && r.checks) || []).filter(x => x && (x.pass === false || x.ok === false || x.passed === false)).map(x => (x.name || '?') + (x.extra ? ' — ' + String(x.extra).slice(0, 220) : '')).slice(0, 4) }); })()`, 900);
        const j = JSON.parse(r);
        informe[b] = j;
        const falla = (j.t != null && j.p != null && j.p !== j.t) || j.ok === false || (j.mal && j.mal.length);
        console.log(`  · ${b}: ${j.p}/${j.t}${j.mal && j.mal.length ? ' · falla: ' + j.mal.join(' | ') : ''}${falla ? ' <<<' : ''} (${Math.round((Date.now() - t0) / 1000)} s)`);
      } catch (e) { informe[b] = { error: e.message.slice(0, 200) }; console.log(`  · ${b}: ERROR ${e.message.slice(0, 160)}`); }
    }
    const errs = await evaluar(cdp, ses, 'JSON.stringify((window.__aveErrores || []).slice(0, 8))', 10, false);
    console.log('· errores de consola: ' + errs);
    fs.writeFileSync(path.join(SALIDA, 'baterias.json'), JSON.stringify({ informe, errores: JSON.parse(errs || '[]') }, null, 2));
    try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { chrome.kill(); }
    srv.close();
    console.log('· informe en ' + path.join(SALIDA, 'baterias.json'));
    process.exit(0);
    return;
  }

  if (CAPTURAS) {
    // Ronda visual: jugador nuevo en el pack pedido, teletransporte por vistas, captura PNG en DIR_CAPTURAS
    fs.mkdirSync(DIR_CAPTURAS, { recursive: true });
    const relojPerro = setTimeout(() => { console.log('· WATCHDOG: se acabó el tiempo'); process.exit(1); }, 7 * 60 * 1000);
    const { tid, ses } = await nuevaPestana(false);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: DPR, mobile: false }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: 1 }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1${PACK === 'cap1' ? '' : '&pack=' + PACK}${EXTRA_URL ? '&' + EXTRA_URL : ''}` }, ses);
    if (!(await esperarListo(ses))) { console.log('· el juego no arrancó'); process.exit(1); }
    console.log('· jugador nuevo: ' + await evaluar(cdp, ses, CFG.preparar_js, 300));
    console.log('· esperando asentamiento…');
    await cdp.bombear(2.5);
    const vistas = VISTAS ? VISTAS.split(';').map(v => v.split(',').map(Number)) : [[null, null, null]];
    let i = 0;
    for (const [x, z, yaw] of vistas) {
      try {
        console.log(`  · vista ${i}: teletransporte…`);
        if (x != null) await evaluar(cdp, ses, `(AV.teleport(${x}, ${z}), AV.debug.camYaw(${yaw || 0}), 'ok')`, 45, false);
        console.log('  · vista ' + i + ': asentando…');
        await cdp.bombear(2.8); // streaming y precalentado se asientan
        console.log('  · vista ' + i + ': capturando…');
        // Page.captureScreenshot espera al compositor y se cuelga con la GPU saturada; snapshot()
        // dibuja y lee el lienzo dentro de la propia página (mismo mecanismo que el cómic).
        const dataUrl = await evaluar(cdp, ses, "AV.G.renderer.snapshot(1280, 800, 0.92)", 90);
        if (!dataUrl || dataUrl === 'null') { console.log(`  · vista ${i}: snapshot devolvió null`); i++; continue; }
        const ruta = path.join(DIR_CAPTURAS, `${PREFIJO}_${String(i).padStart(2, '0')}.jpg`);
        fs.writeFileSync(ruta, Buffer.from(dataUrl.split(',')[1], 'base64'));
        const stats = JSON.parse(await evaluar(cdp, ses, "JSON.stringify(AV.G.renderer.stats())", 10, false));
        console.log(`  · vista ${i} (${x == null ? 'aparición' : x + ',' + z + ' yaw ' + yaw}): ${stats.fps} FPS · ${stats.calls} calls · ${Math.round(stats.triangulos / 1000)} k tris · ${stats.calidad} → ${ruta}`);
      } catch (e) { console.log(`  · vista ${i}: ERROR ${e.message.slice(0, 200)}`); }
      i++;
    }
    const errs = await evaluar(cdp, ses, 'JSON.stringify((window.__aveErrores || []).slice(0, 8))', 10, false);
    console.log('· errores de consola: ' + errs);
    if (process.argv.includes('--diag-rayos')) {
      const PUNTOS = arg('--diag-puntos', '0.2,0.6;0.1,0.7;0.3,0.5;0,0.75;0.15,0.85');
      const diag = JSON.parse(await evaluar(cdp, ses, `(() => {
        const R = AV.G.renderer, cam = R.camera;
        const rayos = [];
        const mallas = [];
        R.scene.traverse(o => {
          if (!o.isMesh || !o.visible) return;
          let p = o, edificio = false;
          for (; p && p !== R.scene; p = p.parent) { if (p.userData && p.userData.modelo) { edificio = true; break; } }
          const nom = (o.name || '') + (o.parent && o.parent.name ? '/' + o.parent.name : '');
          if (!edificio && /^(flora:|personaje|cielo|mar$|ep5-noche|rocio|niebla)/.test(nom)) return;
          mallas.push(o);
        });
        const rc = new THREE.Raycaster();
        for (const par of ${JSON.stringify(PUNTOS.split(';').map(p => p.split(',').map(Number)))}) {
          rc.setFromCamera({ x: par[0], y: par[1] }, cam);
          const hits = rc.intersectObjects(mallas, false);
          if (hits[0]) {
            const h = hits[0], o = h.object;
            const cadena = [];
            for (let p = o; p && p !== R.scene; p = p.parent) {
              if (p.userData && p.userData.modelo) { cadena.push('modelo:' + p.userData.modelo); break; }
              if (p.name) cadena.push(p.name);
            }
            const ms = Array.isArray(o.material) ? o.material : [o.material];
            const mi = h.face && h.face.materialIndex != null ? h.face.materialIndex : 0;
            const m = ms[mi] || ms[0];
            const img = m && m.map && m.map.image;
            const lista = ms.map((x, i2) => '[' + i2 + ']' + (x && (x.name || x.type)) + '/mapa=' + !!(x && x.map) + '/col=' + (x && x.color ? x.color.getHexString() : '?') + '/vc=' + !!(x && x.vertexColors)).join(' ');
            rayos.push('(' + par[0] + ',' + par[1] + ') → ' + cadena.join('<') + ' :: caraUsa=' + mi + ' de ' + ms.length + ' :: ' + (m && (m.name || m.type)) + ' mapa=' + !!(m && m.map) + (img ? ' img=' + (img.width || '?') + 'x' + (img.height || '?') : ' sin-img') + ' color=' + (m && m.color ? m.color.getHexString() : '?') + ' vc=' + !!(m && m.vertexColors) + ' d=' + h.distance.toFixed(1) + ' || ' + lista + (h.face && o.geometry.attributes.color ? ' || colores=' + [h.face.a, h.face.b, h.face.c].map(ix => { const c = o.geometry.attributes.color; return '(' + c.getX(ix).toFixed(2) + ',' + c.getY(ix).toFixed(2) + ',' + c.getZ(ix).toFixed(2) + ')'; }).join(' ') : ' sin-color0'));
          } else rayos.push('(' + par[0] + ',' + par[1] + ') → nada');
        }
        return JSON.stringify(rayos);
      })()`, 90, false));
      console.log('· rayos a la columna:');
      for (const d of diag) console.log('    ' + d);
    }
    if (process.argv.includes('--diag-zona')) {
      const ZX = parseFloat(arg('--diag-x', '-59')), ZZ = parseFloat(arg('--diag-z', '-102')), ZY = parseFloat(arg('--diag-y', '85')), ZR = parseFloat(arg('--diag-r', '8'));
      const diag = JSON.parse(await evaluar(cdp, ses, `(() => {
        const out = [];
        const c = { x: ${ZX}, y: ${ZY}, z: ${ZZ} };
        AV.G.renderer.scene.traverse(o => {
          if (!(o.isMesh || o.isPoints || o.isSprite || o.isLine)) return;
          if (!o.visible) return;
          if (!o.geometry) return;
          if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
          const bs = o.geometry.boundingSphere;
          if (!bs) return;
          const e = o.matrixWorld.elements;
          const dx = e[12] + bs.center.x - c.x, dy = e[13] + bs.center.y - c.y, dz = e[14] + bs.center.z - c.z;
          if (Math.sqrt(dx * dx + dy * dy + dz * dz) > bs.radius + ${ZR}) return;
          const cadena = [];
          for (let p = o; p && p !== AV.G.renderer.scene; p = p.parent) {
            if (p.userData && p.userData.modelo) { cadena.push('modelo:' + p.userData.modelo); break; }
            if (p.name) cadena.push(p.name);
          }
          const m = Array.isArray(o.material) ? o.material[0] : o.material;
          out.push(o.type + ' capa=' + o.layers.mask + ' :: ' + cadena.join('<') + ' :: ' + (m && (m.name || m.type)) + ' transparente=' + !!(m && m.transparent) + ' opac=' + (m && m.opacity != null ? m.opacity : '?') + ' col=' + (m && m.color ? m.color.getHexString() : '?') + ' radio=' + bs.radius.toFixed(1) + ' @' + [e[12], e[13], e[14]].map(n => Math.round(n)).join(','));
        });
        return JSON.stringify(out.slice(0, 30));
      })()`, 60, false));
      console.log('· objetos cerca de (' + ZX + ',' + ZY + ',' + ZZ + '):');
      for (const d of diag) console.log('    ' + d);
    }
    if (process.argv.includes('--diag-pixels')) {
      const PX = parseFloat(arg('--diag-px', '768')), PY = parseFloat(arg('--diag-py', '260'));
      const diag = JSON.parse(await evaluar(cdp, ses, `(() => {
        const R = AV.G.renderer, gl = R.renderer.getContext();
        const out = [];
        const leer = () => {
          R.drawScene(R.camera);
          const px = new Uint8Array(4);
          const dpr = R.renderer.getPixelRatio();
          gl.readPixels(Math.round(${PX} * dpr), Math.round(gl.drawingBufferHeight - ${PY} * dpr), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
          return [px[0], px[1], px[2]];
        };
        const nomes = ['edificiosZona:global:lejos', 'edificiosZona:global:lejosTex', 'estructura:grutas', 'edificiosZona:global:cerca', 'ep5-noche-suelo'];
        out.push('base=' + leer().join(','));
        for (const n of nomes) {
          let obj = null;
          R.scene.traverse(o => { if (!obj && o.name === n) obj = o; });
          if (!obj) { out.push(n + ': no está'); continue; }
          const v0 = obj.visible; obj.visible = false;
          out.push(n + ' OFF → ' + leer().join(','));
          obj.visible = v0;
        }
        return JSON.stringify(out);
      })()`, 90, false));
      for (const d of diag) console.log('    ' + d);
    }
    if (process.argv.includes('--diag-vertices')) {
      const diag = JSON.parse(await evaluar(cdp, ses, `(() => {
        const out = { blancos: 0, muestra: [], total: 0 };
        AV.G.renderer.scene.traverse(o => {
          if (!o.isMesh || o.name !== 'edificiosZona:global:lejos') return;
          const c = o.geometry.attributes.color, p = o.geometry.attributes.position;
          if (!c || !p) { out.error = 'sin color/pos'; return; }
          out.total = c.count;
          for (let i = 0; i < c.count; i++) {
            if (c.getX(i) > 0.93 && c.getY(i) > 0.93 && c.getZ(i) > 0.93) {
              out.blancos++;
              if (out.muestra.length < 12) out.muestra.push([Math.round(p.getX(i)), Math.round(p.getY(i)), Math.round(p.getZ(i))].join(','));
            }
          }
        });
        return JSON.stringify(out);
      })()`, 60, false));
      console.log('· vértices blancos en edificiosZona:global:lejos: ' + diag.blancos + ' de ' + diag.total + (diag.error ? ' (' + diag.error + ')' : ''));
      for (const m of diag.muestra || []) console.log('    @ ' + m);
    }
    if (process.argv.includes('--diag-lod')) {
      const diag = JSON.parse(await evaluar(cdp, ses, `(() => {
        const out = [];
        AV.G.renderer.scene.traverse(o => {
          if (!(o.isMesh || o.isGroup || o.isInstancedMesh)) return;
          const n = o.name || '';
          if (!/edificio|Inst|lejos|cerca|hd/.test(n)) return;
          if (o.isMesh && !o.geometry) return;
          let p = o;
          const cadena = [];
          for (; p && p !== AV.G.renderer.scene; p = p.parent) { if (p.name) cadena.push(p.name); }
          out.push(o.type + ' ' + (o.name || '?') + ' vis=' + o.visible + (o.isInstancedMesh ? ' n=' + o.count : '') + ' :: ' + cadena.slice(0, 3).join('<'));
        });
        const st = AV.G.mundo && AV.G.mundo.streaming && AV.G.mundo.streaming.stats ? AV.G.mundo.streaming.stats() : null;
        return JSON.stringify({ objs: out.slice(0, 40), streaming: st });
      })()`, 60, false));
      console.log('· objetos de edificios en escena:');
      for (const d of diag.objs) console.log('    ' + d);
      console.log('· streaming stats: ' + JSON.stringify(diag.streaming));
    }
    if (process.argv.includes('--diag-blancos')) {
      const RADIO = parseFloat(arg('--diag-radio', '30'));
      const diag = JSON.parse(await evaluar(cdp, ses, `(() => {
        const out = [], visto = new Set();
        const S = AV.G.S;
        const M = window.THREE ? THREE.Matrix4 : null;
        AV.G.renderer.scene.traverse(o => {
          if (!o.isMesh) return;
          // posiciones de mundo de cada instancia (o del propio objeto)
          const posis = [];
          if (o.isInstancedMesh && o.instanceMatrix && M) {
            const tmp = new M();
            for (let i = 0; i < o.count; i++) { tmp.fromArray(o.instanceMatrix.array, i * 16); posis.push([tmp.elements[12], tmp.elements[13], tmp.elements[14]]); }
          } else {
            const e = o.matrixWorld.elements;
            posis.push([e[12], e[13], e[14]]);
          }
          let cerca = false;
          for (const [px, py, pz] of posis) { const dx = px - S.pos.x, dz = pz - S.pos.z; if (dx * dx + dz * dz <= ${RADIO} * ${RADIO}) { cerca = true; break; } }
          if (!cerca) return;
          for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
            if (!m) continue;
            const cadena = [];
            for (let p = o; p && p !== AV.G.renderer.scene; p = p.parent) {
              if (p.userData && p.userData.modelo) { cadena.push('modelo:' + p.userData.modelo); break; }
              if (p.name) cadena.push(p.name);
            }
            const img = m.map && m.map.image;
            const clave = cadena.join('<') + '|' + (m.name || m.type) + '|' + (m.map ? 'map' : (o.isInstancedMesh ? 'inst' : 'nomap'));
            if (visto.has(clave)) continue;
            visto.add(clave);
            out.push((o.isInstancedMesh ? '[inst x' + o.count + '] ' : '') + cadena.join('<') + ' :: ' + (m.name || m.type) + ' mapa=' + !!(m.map) + (img ? ' img=' + (img.width || '?') + 'x' + (img.height || '?') : ' sin-img') + ' color=' + (m.color ? m.color.getHexString() : '?') + (o.visible ? '' : ' OCULTO'));
          }
        });
        return JSON.stringify(out.slice(0, 60));
      })()`, 90, false));
      console.log('· mallas con instancias en radio ' + RADIO + ' m (' + diag.length + '):');
      for (const d of diag) console.log('    ' + d);
    }
    try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { chrome.kill(); }
    srv.close();
    clearTimeout(relojPerro);
    process.exit(0);
    return;
  }

  for (let ronda = 1; ronda <= RONDAS; ronda++) {
    console.log(`· ronda ${ronda}/${RONDAS}`);
    const n0 = errores.length;
    const { tid, ses } = await nuevaPestana(true);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1${PACK === 'cap1' ? '' : '&pack=' + PACK}${FASES ? '&fases=1' : ''}` }, ses);
    let listo = await esperarListo(ses);
    if (!listo) { console.log('  · el juego no arrancó'); res.rondas.push({ ronda, error: 'no arrancó' }); continue; }
    await cdp.bombear(2.0);
    const escenas = [];
    escenas.push(await escena(ses, 'portada', null));
    if (PERFIL) { await cdp.call('Profiler.enable', {}, ses); await cdp.call('Profiler.setSamplingInterval', { interval: 1000 }, ses); await cdp.call('Profiler.start', {}, ses); }
    if (FASES) await evaluar(cdp, ses, "(window.__fases = [], 'ok')", 10, false);
    escenas.push(await escena(ses, 'jugar(Empezar)', CFG.preparar_js, 300));
    if (PERFIL) { try { perfil(analizarPerfil((await cdp.call('Profiler.stop', {}, ses, 240)).profile), 'jugar'); } catch (e) { console.log('  · perfil falló: ' + e.message); } }
    escenas.push(await escena(ses, 'apertura6s', INICIO_JS, 60));
    if (FASES) {
      const f = JSON.parse(await evaluar(cdp, ses, "JSON.stringify((window.__fases || []).map(x => x.join('/')))", 10, false));
      console.log('  · fases [t, update, ganchos, escaneo, precalentar, dibujo] ms:');
      for (const l of f) console.log('      ' + l.replace(/\//g, '  '));
      const cal = await evaluar(cdp, ses, "JSON.stringify(AV.G.renderer._precalentar)", 10, false);
      console.log('  · precalentado al final: ' + cal);
    }
    escenas.push(await escena(ses, 'zona(media/alta)', ZONA_JS, 60));
    try { await cdp.call('Target.closeTarget', { targetId: tid }, undefined, 10); } catch (e) { /* ya cerrado */ }
    res.rondas.push({ ronda, escenas, errores: errores.slice(n0) });
  }
  res.errores = errores.slice(0, 20);
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { chrome.kill(); }
  srv.close();
  fs.writeFileSync(path.join(SALIDA, 'resultado.json'), JSON.stringify(res, null, 2));
  console.log(`· resultado en ${path.join(SALIDA, 'resultado.json')}`);
})().catch(e => { console.error('FALLO:', e && e.stack || JSON.stringify(e) || String(e)); process.exit(2); });
