#!/usr/bin/env node
/* Sonda de stats del duelo con la Campeona (KIMI-293, validación de c47d759b):
   entra con semilla, teleport a la explanada (182,172), inicia el duelo por la API pública,
   pelea ~10 s (ala + semilla + grito por la API) muestreando rAF, y vuelca FPS/calls/tris/memoria.
   Uso: node tools/build/kimi3_293_duelo.js [--etiqueta r1] */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ETIQ = (process.argv.indexOf('--etiqueta') > 0 ? process.argv[process.argv.indexOf('--etiqueta') + 1] : 'r1');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = () => { for ( const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result ? r.result.value : undefined; }
(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3d293-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--window-size=1600,900'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoDev) throw new Error('Chrome no abrió DevTools en 60 s: ' + err.slice(0, 200));
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html?v18=1` }, ses);
  const t0 = Date.now(); let ok = false;
  while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!ok) throw new Error('el juego no arrancó en 240 s');
  console.log('· preparar:', await ev(cdp, ses, CFG.preparar_js, 300));
  const r = await ev(cdp, ses, `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms)), G = window.AV.G, P = G.pruebas, R = G.renderer, rr = R.renderer, ST = G.mundo.streaming;
    if (G.mundo.listo) await G.mundo.listo; await ST.listo; await ST.terminar();
    if (R.setCalidad) R.setCalidad('alto', true);
    // la cadena V18 carga a demanda (alPrimerGesto): esperar, y si no, cargarla como boot.js
    for (let i = 0; i < 60 && !G.v18combate; i++) await sleep(500);
    if (!G.v18combate) {
      await window.AVE.assets.script('src/game/v18/progreso.js'); window.AVV18Progreso(G);
      await window.AVE.assets.script('src/game/v18/habilidades.js'); window.AVV18Habilidades(G);
      try { await window.AVE.assets.script('src/game/v18/fx_poderes.js'); window.AVV18Fx(G); } catch (e) {}
      await window.AVE.assets.script('src/game/v18/combate.js'); window.AVV18Combate(G);
    }
    P.teleport(182, 172, 0, -1); P.tick(0.1);
    await ST.alrededor(182, 172); await ST.terminar();
    // base quieta antes del duelo
    for (let i = 0; i < 60; i++) { G.camara.place(true); R.render(1 / 60, false); await sleep(16); }
    const medirCuadro = () => { let calls = 0, tris = 0; const orig = rr.render; rr.render = function (a, b) { orig.call(rr, a, b); calls += rr.info.render.calls; tris += rr.info.render.triangles; }; try { G.camara.place(true); R.render(1 / 60, false); } finally { rr.render = orig; } return { calls, tris }; };
    let callsB = 0, trisB = 0;
    for (let i = 0; i < 5; i++) { const m = medirCuadro(); callsB = Math.max(callsB, m.calls); trisB = Math.max(trisB, m.tris); await sleep(100); }
    const muestrear = seg => new Promise(res => { const ts = []; let ant = performance.now(); const fin = ant + seg * 1000; const cb = () => { const a = performance.now(); ts.push(a - ant); ant = a; if (a < fin) requestAnimationFrame(cb); else res(ts); }; requestAnimationFrame(cb); });
    const fpsDe = ts => { ts.sort((a, b) => a - b); const med = ts[Math.floor(ts.length * 0.5)], p95 = ts[Math.floor(ts.length * 0.95)]; return { fpsMed: Math.round(1000 / med * 10) / 10, fpsP95: Math.round(1000 / p95 * 10) / 10, cuadros: ts.length }; };
    let tsB = await muestrear(3); const base = { calls: callsB, tris: trisB, geo: rr.info.memory.geometries, tex: rr.info.memory.textures, prog: rr.info.programs.length }; const fpsBase = fpsDe(tsB);
    G.v18combate.iniciar({ sinCuenta: true, especie: 'vittata' });
    await sleep(500);
    // pelea: acercarse y alternar ala/semilla/grito
    let usos = 0;
    const pelea = setInterval(() => { try { const C = G.v18combate.estado(); if (!C || C.fase !== 'lucha') return; usos++; if (usos % 3 === 0) G.v18combate.usar(C.j, 'grito_yunque'); else if (usos % 3 === 1) { C.j.golpeT = 0; G.v18combate.usar(C.j, 'golpe_ala'); } else G.v18combate.usar(C.j, 'semilla'); } catch (e) {} }, 700);
    let tsD = await muestrear(10); clearInterval(pelea);
    // calls/tris medidos con render explícito tras la pelea (HUD del duelo todavía en escena)
    let calls = 0, tris = 0;
    for (let i = 0; i < 8; i++) { const m = medirCuadro(); calls = Math.max(calls, m.calls); tris = Math.max(tris, m.tris); await sleep(120); }
    const duelo = { calls, tris, geo: rr.info.memory.geometries, tex: rr.info.memory.textures, prog: rr.info.programs.length }; const fpsDuelo = fpsDe(tsD);
    const heap = (performance.memory && performance.memory.usedJSHeapSize / 1048576) || 0;
    const C = G.v18combate.estado();
    return { base: Object.assign({ fps: fpsBase }, base), duelo: Object.assign({ fps: fpsDuelo }, duelo), heapMB: Math.round(heap * 10) / 10, fase: C.fase, plumasRival: C.r.plumas, plumasJ: C.j.plumas, errores: (window.__aveErrores || []).length };
  })()`, 300);
  console.log('· stats:', JSON.stringify(r));
  fs.writeFileSync(path.join(RAIZ, 'docs', 'img', 'kimi293', `k293_duelo_${ETIQ}.json`), JSON.stringify({ head: (() => { try { return require('child_process').execSync('git rev-parse --short HEAD', { cwd: RAIZ }).toString().trim(); } catch (e) { return 'desconocido'; } })(), etiqueta: ETIQ, fecha: new Date().toISOString(), stats: r }, null, 1));
  try { await cdp.call('Browser.close', {}, ses); } catch (e) { }
  chrome.kill();
  srv.close();
  console.log('· fin');
  process.exit(0);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
