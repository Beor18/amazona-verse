#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-019: coste en movil de los vecinos (CG-44) y la
   ciudad viva (N17). Chrome headless propio + CDP; movil 375x812 dpr 3 con UA de iPhone y CPU x4;
   GPU real de la PC. Una sola sesion: se teletransporta por Villa Raiz y la Ciudad de los 36, de
   dia y de noche, y mide FPS (p50/p95/peor), draw calls, triangulos, heap y texturas CON y SIN
   los sistemas. No hay ?vecinos=0: el A/B se hace en pagina con los hooks publicos
   (G.quiet apaga los dos; G.ciudadViva.pausa + limpiar G.bandada.EXTRA aísla la ciudad viva;
   la malla instanciada 'vecinos' se apaga con count=0 y se restaura con estado().n).

   Uso: node tools/build/kimi2_vecinos.js [--cpu 4] [--dur 8] [--salida DIR] [--puerto N]
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
let CHROME_PROC = null; // para matar el headless si el script falla a mitad (evita fugas que bloquean el GPU)
const CPU = parseFloat(arg('--cpu', '4'));
const DUR = parseFloat(arg('--dur', '8'));          // s de cada toma
const SIMPLE = process.argv.includes('--simple');    // dia solo, Villa+Ciudad, sin aislados ni noche
const MICRO = process.argv.includes('--micro');      // micro-benchmark CPU de paso()+pintar() (inmune al GPU)
const SALIDA = arg('--salida', path.join(AQUI, 'salida', 'kimi2-vecinos'));
fs.mkdirSync(SALIDA, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };

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
      if (qa && /index\.html$/.test(f)) d = Buffer.from(d.toString('utf8').replace(/<meta charset[^>]*>/i, m => m + QA_TAG), 'utf8');
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(d);
    });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message + ' ' + JSON.stringify(d.error.data || ''))) : p.re(d.result); } }; }
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

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2v-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', '--window-size=500,900'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = '', codigo = null; chrome.stderr.on('data', d => { err += d; });
  chrome.on('exit', c => { codigo = c; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  // Chrome 156: el chrome.exe inicial sale enseguida y el navegador real sigue detached;
  // se espera al archivo DevToolsActivePort, no a la salida del proceso padre.
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools en 60 s: ' + err.slice(0, 300));
}

// Sonda de cuadros (misma idea que kimi2_empezar.js): rAF dt acumulado en ventana, se vacia por toma.
const SONDA_JS = `(() => { const Q = window.__qaM = { dt: [], top: [] }; let t = 0, t0 = 0;
  const f = n => { if (!t0) t0 = n; if (t) { const d = n - t; Q.dt.push(d); const e = { d: Math.round(d), t: Math.round((t - t0) / 100) / 10 };
    const i = Q.top.findIndex(x => x.d < e.d); if (i >= 0) Q.top.splice(i, 0, e); else if (Q.top.length < 6) Q.top.push(e); if (Q.top.length > 6) Q.top.pop(); } t = n;
    if (Q.dt.length > 40000) Q.dt.splice(0, 20000); requestAnimationFrame(f); }; requestAnimationFrame(f); })();`;

// Toma: vacia la sonda, espera DUR s midiendo, y junta stats del renderer + los dos sistemas.
const TOMA_JS = dur => `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)); const Q = window.__qaM;
  Q.dt = []; Q.top = [];
  await sleep(${Math.round(dur * 1000)});
  const d = Q.dt.slice().sort((a, b) => a - b), n = d.length;
  const q = p => n ? Math.round(d[Math.min(n - 1, Math.floor(n * p))]) : 0;
  let st = {}; try { const R = window.AV && AV.G && AV.G.renderer; st = (R && R.stats && R.stats()) || {}; } catch (e) {}
  let lk = {}; try { lk = (AV.look && AV.look.medir && AV.look.medir()) || {}; } catch (e) {}
  let cv = null; try { cv = AV.G.ciudadViva ? { aves: AV.G.ciudadViva.aves().length, pasos: AV.G.ciudadViva.stats() } : null; } catch (e) {}
  let ve = null; try { ve = AV.G.vecinos && AV.G.vecinos.estado ? AV.G.vecinos.estado() : null; } catch (e) {}
  return JSON.stringify({ n, p50: q(0.5), p95: q(0.95), peor: n ? Math.round(d[n - 1]) : 0, mas100: d.filter(x => x > 100).length,
    fps: st.fps != null ? Math.round(st.fps * 10) / 10 : null, calls: st.calls != null ? st.calls : null, tris: st.triangulos != null ? Math.round(st.triangulos) : null,
    heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
    texMB: lk.texturasMB != null ? Math.round(lk.texturasMB * 10) / 10 : null, calidad: st.calidad || null, quiet: !!(AV.G && AV.G.quiet),
    ciudadViva: cv, vecinos: ve, top: (Q.top || []).slice(0, 4) }); })()`;

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  let lanzado = null;
  for (let i = 0; i < 3 && !lanzado; i++) {
    try { lanzado = await lanzarChrome(); }
    catch (e) { console.log('· lanzamiento ' + (i + 1) + ' fallo: ' + e.message.slice(0, 160)); await new Promise(r => setTimeout(r, 1500)); }
  }
  if (!lanzado) { console.log('· Chrome no arranco en 3 intentos'); process.exit(1); }
  const { chrome, perf, puerto: puertoDev, wsPath } = lanzado;
  CHROME_PROC = chrome;
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws);
  await cdp.listo();
  console.log(`· servidor ${origen} · Chrome headless GPU real · movil 375x812 dpr 3 · CPU x${CPU} · tomas de ${DUR} s`);

  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 3, mobile: true }, ses);
  await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
  await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
  await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}" + SONDA_JS }, ses);

  await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1&mapa=real` }, ses);
  const t0 = Date.now();
  let listo = false;
  while (Date.now() - t0 < CFG.espera_listo_s * 1000) {
    try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { /* aun no */ }
    await cdp.bombear(0.5);
  }
  if (!listo) { console.log('· el juego no arranco'); process.exit(1); }
  await cdp.bombear(2.0);
  console.log('· jugador nuevo: ' + await evaluar(cdp, ses, CFG.preparar_js, 300));

  // Calidad media fija (en el iPhone el juego arranca en bajo: vecinos 0 / ciudad viva 4) y sin rebaje automatico.
  console.log('· calidad: ' + await evaluar(cdp, ses, `(() => { const R = AV.G.renderer; if (R.calidad) R.calidad.manual = true; if (R.setCalidad) R.setCalidad('medio'); return R.calidad && R.calidad.nivel; })()`, 15, false));
  // Que los dos sistemas esten cargados (cargan al primer gesto; si no, sus pruebas los cargan).
  console.log('· sistemas: ' + await evaluar(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms));
    if (!AV.G.vecinos) try { await AV.vecinosTest(); } catch (e) {}
    if (!AV.G.ciudadViva) try { await AV.ciudadVivaTest({ espera: 90 }); } catch (e) {}
    await sleep(500);
    return JSON.stringify({ vecinos: !!AV.G.vecinos, ciudadViva: !!AV.G.ciudadViva, mallaVecinos: !!AV.G.renderer.scene.getObjectByName('vecinos'), bandadaExtra: !!(AV.G.bandada && AV.G.bandada.EXTRA) }); })()`, 420));

  // Precalienta la ciudad mientras se mide Villa; luego una pasada de calentamiento por cada vista
  // (la primera llegada a una zona trae stalls de streaming de varios segundos que envenenarian la toma).
  await evaluar(cdp, ses, `(AV.G.mundo.streaming && AV.G.mundo.streaming.alrededor(-4, -130.8).catch(() => {}), 'ok')`, 10, false);

  const resultados = [];
  async function toma(nombre) {
    for (let intento = 0; intento < 2; intento++) {
      try {
        const j = JSON.parse(await evaluar(cdp, ses, TOMA_JS(DUR), DUR + 100));
        j.escena = nombre; resultados.push(j);
        console.log(`  · ${nombre}: p50 ${j.p50} p95 ${j.p95} peor ${j.peor} ms · ${j.fps} FPS · ${j.calls} calls · ${Math.round((j.tris || 0) / 1000)} k tris · heap ${j.heapMB} MB · tex ${j.texMB} MB · cv ${j.ciudadViva ? j.ciudadViva.aves + ' aves/' + j.ciudadViva.pasos.pasos + ' pasos' : '-'} · vec ${j.vecinos ? j.vecinos.n + ' n/' + (j.vecinos.visible ? 'vis' : 'oculto') : '-'}`);
        return j;
      } catch (e) { console.log(`  · ${nombre}: intento ${intento + 1} fallo: ${e.message.slice(0, 120)}`); await cdp.bombear(3); }
    }
    return null;
  }
  async function estable(ses2) {
    // espera a que el mundo se asiente en esta vista: draw calls casi iguales entre dos sondeos y rAF fluyendo
    let a = null;
    for (let i = 0; i < 30; i++) {
      await cdp.bombear(1.0);
      let s = null;
      try { s = JSON.parse(await evaluar(cdp, ses2, `(() => { const R = AV.G.renderer; const st = R.stats(); return JSON.stringify({ calls: st.calls, fps: st.fps }); })()`, 20, false)); } catch (e) { continue; }
      if (a && Math.abs(s.calls - a.calls) <= 2 && s.fps > 0) return true;
      a = s;
    }
    return false;
  }
  async function irA(x, z, yaw) {
    await evaluar(cdp, ses, `(AV.teleport(${x}, ${z}), AV.debug.camYaw(${yaw}), (AV.G.mundo.streaming && AV.G.mundo.streaming.alrededor(${x}, ${z}).catch(() => {})), 'ok')`, 60, false);
    await evaluar(cdp, ses, `(AV.G.solidos && AV.G.solidos.terminar && AV.G.solidos.terminar(), 'ok')`, 60, false);
    await estable(ses);
  }
  // A/B: quiet apaga vecinos + ciudad viva y al quitarlo se repueblan solos. ON se mide antes y despues.
  async function ab(nombre, x, z, yaw, noche) {
    await evaluar(cdp, ses, `(() => { ${noche ? 'AV.G.S.hora = 22; if (AV.G.ciudadViva) AV.G.ciudadViva.hora(22);' : 'delete AV.G.S.hora; if (AV.G.ciudadViva) AV.G.ciudadViva.hora(null);'} return 'ok'; })()`, 20, false);
    await irA(x, z, yaw);
    const on1 = await toma(nombre + ' · ON-a');
    await evaluar(cdp, ses, `(AV.G.quiet = true, 'ok')`, 20, false);
    await estable(ses);
    const off = await toma(nombre + ' · SIN (quiet)');
    await evaluar(cdp, ses, `(AV.G.quiet = false, 'ok')`, 20, false);
    await estable(ses);
    const on2 = await toma(nombre + ' · ON-b');
    return { on1, off, on2 };
  }

  if (MICRO) {
    console.log('· micro · CPU x' + CPU + ' por cuadro de cada sistema (mediana de 5 lotes x 200 llamadas)');
    for (const nivel of ['medio', 'alto']) {
      await evaluar(cdp, ses, `(AV.G.renderer.setCalidad('${nivel}'), 'ok')`, 20, false);
      await cdp.bombear(1.0);
      const j = JSON.parse(await evaluar(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)); const C = AV.G.ciudadViva, V = AV.G.vecinos;
        C.prueba(true); C.pausa(false);
        for (let i = 0; i < 60; i++) { C.paso(0.016, 'todo'); C.pintar(); V.paso(0.016); }
        await sleep(300);
        const medir = (fn, n) => { const t = []; for (let i = 0; i < 5; i++) { const t0 = performance.now(); for (let k = 0; k < n; k++) fn(); t.push((performance.now() - t0) / n); } t.sort((a, b) => a - b); return Math.round(t[2] * 1000) / 1000; };
        const cv = medir(() => { C.paso(0.016, 'todo'); C.pintar(); }, 200);
        const vp = medir(() => V.paso(0.016), 200);
        const out = { calidad: AV.G.renderer.calidad.nivel, ciudadVivaMS: cv, vecinosMS: vp, aves: C.aves().length, vecinos: V.estado().n, quiet: !!AV.G.quiet };
        C.prueba(false); return JSON.stringify(out); })()`, 180));
      resultados.push({ escena: 'micro-' + nivel, ...j });
      console.log(`  · ${nivel}: ciudad viva ${j.ciudadVivaMS} ms/cuadro (${j.aves} aves, forzar=todo) · vecinos ${j.vecinosMS} ms/cuadro (${j.vecinos} vecinos)`);
    }
  } else if (SIMPLE) {
    console.log('· dia SIMPLE · Villa Raiz (sitio vecinos 125,140)');
    await ab('dia-villa', 125, 140, 0.69, false);
    console.log('· dia SIMPLE · Ciudad de los 36 (POI -4,-130.8)');
    await ab('dia-ciudad', -4, -130.8, -1.87, false);
  } else {
  console.log('· calentamiento: Villa y Ciudad (sin medir)');
  await irA(125, 140, 0.69, false);
  await irA(-4, -130.8, -1.87, false);
  await irA(125, 140, 0.69, false);

  console.log('· dia · Villa Raiz (sitio vecinos 125,140)');
  const vDia = await ab('dia-villa', 125, 140, 0.69, false);
  console.log('· dia · Ciudad de los 36 (POI -4,-130.8)');
  const cDia = await ab('dia-ciudad', -4, -130.8, -1.87, false);
  // ciudad viva aislada en la ciudad (pausa + limpiar EXTRA); vecinos intactos.
  await evaluar(cdp, ses, `(() => { if (!AV.G.ciudadViva) return 'no'; AV.G.ciudadViva.pausa(true); const E = AV.G.bandada.EXTRA; if (E) for (let i = E.length - 1; i >= 0; i--) if (E[i].ciudad) E.splice(i, 1); return 'ok'; })()`, 20, false);
  await estable(ses);
  const cDiaSinCV = await toma('dia-ciudad · SIN ciudad viva');
  await evaluar(cdp, ses, `(AV.G.ciudadViva && AV.G.ciudadViva.pausa(false), 'ok')`, 20, false);
  await estable(ses);
  // vecinos aislados en Villa (count=0; se restaura con estado().n)
  await irA(125, 140, 0.69);
  await evaluar(cdp, ses, `(() => { const m = AV.G.renderer.scene.getObjectByName('vecinos'); if (!m) return 'no'; m.count = 0; return 'ok'; })()`, 20, false);
  await cdp.bombear(0.8);
  const vDiaSinVe = await toma('dia-villa · SIN vecinos');
  await evaluar(cdp, ses, `(() => { const m = AV.G.renderer.scene.getObjectByName('vecinos'); const v = AV.G.vecinos && AV.G.vecinos.estado(); if (m && v) m.count = v.n; return 'ok'; })()`, 20, false);

  console.log('· noche (S.hora=22) · Ciudad de los 36');
  const cNoche = await ab('noche-ciudad', -4, -130.8, -1.87, true);
  await evaluar(cdp, ses, `(() => { if (!AV.G.ciudadViva) return 'no'; AV.G.ciudadViva.pausa(true); const E = AV.G.bandada.EXTRA; if (E) for (let i = E.length - 1; i >= 0; i--) if (E[i].ciudad) E.splice(i, 1); return 'ok'; })()`, 20, false);
  await estable(ses);
  const cNocheSinCV = await toma('noche-ciudad · SIN ciudad viva');
  await evaluar(cdp, ses, `(AV.G.ciudadViva && AV.G.ciudadViva.pausa(false), delete AV.G.S.hora, AV.G.ciudadViva && AV.G.ciudadViva.hora(null), 'ok')`, 20, false);
  console.log('· noche (S.hora=22) · Villa Raiz');
  const vNoche = await ab('noche-villa', 125, 140, 0.69, true);
  await evaluar(cdp, ses, `(delete AV.G.S.hora, AV.G.ciudadViva && AV.G.ciudadViva.hora(null), 'ok')`, 20, false);
  }
  const errs = await evaluar(cdp, ses, 'JSON.stringify((window.__aveErrores || []).slice(0, 8))', 10, false);
  console.log('· errores de consola: ' + errs);
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { chrome.kill(); }
  srv.close();
  const out = { movil: { ancho: 375, alto: 812, dpr: 3, cpu: CPU, gpu: 'real (RX 5700 XT)', nota: 'contencion: otros Chrome del sistema corriendo' }, resultados, errores: JSON.parse(errs || '[]') };
  fs.writeFileSync(path.join(SALIDA, 'resultado.json'), JSON.stringify(out, null, 2));
  console.log('· resultado en ' + path.join(SALIDA, 'resultado.json'));
  process.exit(0);
})().catch(e => { console.error('FALLO:', e && e.stack || JSON.stringify(e) || String(e)); try { if (CHROME_PROC) CHROME_PROC.kill(); } catch (_) { /* ya muerto */ } process.exit(2); });
