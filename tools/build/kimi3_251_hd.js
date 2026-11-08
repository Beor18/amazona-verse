#!/usr/bin/env node
/* Amazona Verse · Kimi 3 — KIMI-251: ¿cambia la vista de arranque sin los _hd de la ciudad?
   Sonda CDP mínima: flujo de jugador nuevo (preparar_js de config.json), con --bloquear-hd
   aborta en Fetch los .glb *_hd.glb / *_hd400.glb; captura la vista tras asentar y vuelca
   AV.G.streaming.stats() (visiblesHD/drawEdificios). Sin bloqueo = base.
   Uso: node kimi3_251_hd.js --calidad alto|medio [--bloquear-hd] [--etiqueta x]
   Salida: docs/img/kimi251/k251_<calidad>_<etiqueta>.jpg + .json */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn, execSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const CALIDAD = arg('--calidad', 'alto'), ETIQUETA = arg('--etiqueta', 'base'), BLOQUEAR = process.argv.includes('--bloquear-hd');
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi251'); fs.mkdirSync(SALIDA, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = () => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 60) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result ? r.result.value : undefined; }
(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3q251-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--window-size=1600,900'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoDev) { try { chrome.kill(); } catch (e) { } throw new Error('Chrome no abrió DevTools ' + err.slice(0, 200)); }
  let bloqueados = 0;
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  if (BLOQUEAR) ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Fetch.requestPaused') { const u = d.params.request.url; if (/_hd(400)?\.glb/.test(u)) { bloqueados++; cdp.call('Fetch.failRequest', { requestId: d.params.requestId, errorReason: 'BlockedByClient' }, ses).catch(() => { }); } else cdp.call('Fetch.continueRequest', { requestId: d.params.requestId }, ses).catch(() => { }); } });
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
  if (BLOQUEAR) await cdp.call('Fetch.enable', { patterns: [{ urlPattern: '*' }] }, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); } catch(e){}" }, ses);
  const t0 = Date.now();
  await cdp.call('Page.navigate', { url: `${origen}/index.html?calidad=${encodeURIComponent(CALIDAD)}` }, ses);
  let ok = false;
  while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!ok) throw new Error('el juego no expuso AV a tiempo');
  const prep = await ev(cdp, ses, CFG.preparar_js, 120);
  // asentar de verdad: sin descargas en vuelo ni trabajos de fusión (tope 60 s) — a 3 s el _hd de la ciudad aún no había formado
  let asentado = -1;
  for (let i = 0; i < 60; i++) {
    const d = JSON.parse(await ev(cdp, ses, `JSON.stringify(AV.G.mundo.streaming.stats())`, 30));
    if (i % 5 === 0) console.log(`  … asentando ${i}s descargando=${d.descargando} trabajos=${d.trabajos}`);
    if (!d.descargando && !d.trabajos) { asentado = i; break; }
    await cdp.bombear(1);
  }
  console.log(`  · asentado en ~${asentado}s; fase caminata: despertar la cola (como el intro de k244) y drenar TODO`);
  await ev(cdp, ses, `(window.AV.G.S.pos.x += 3, 'ok')`, 10);
  let drenado = -1;
  for (let i = 0; i < 90; i++) {
    const d = JSON.parse(await ev(cdp, ses, `JSON.stringify(AV.G.mundo.streaming.stats())`, 30));
    if (i % 5 === 0) console.log(`  … drenando ${i}s descargando=${d.descargando} trabajos=${d.trabajos}`);
    if (!d.descargando && !d.trabajos) { drenado = i; break; }
    await cdp.bombear(1);
  }
  console.log(`  · drenado en ~${drenado}s; volver al spawn y capturar`);
  await ev(cdp, ses, `(window.AV.G.S.pos.x -= 3, 'ok')`, 10);
  await cdp.bombear(2); // la cámara vuelve; el _hd de la ciudad no se suelta en 2 s (bajada diferida KIMI-038)
  const stats = JSON.parse(await ev(cdp, ses, `JSON.stringify(AV.G.mundo.streaming.stats())`, 30));
  const diag = JSON.parse(await ev(cdp, ses, `JSON.stringify(AV.G.mundo.streaming._diag())`, 30));
  const look = JSON.parse(await ev(cdp, ses, `new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(()=>ok(JSON.stringify(AV.look.medir())))))`, 30));
  const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 30000);
  const jpg = path.join(SALIDA, `k251_${CALIDAD}_${ETIQUETA}.jpg`); fs.writeFileSync(jpg, Buffer.from(shot.data, 'base64'));
  const res = { tarea: 'KIMI-251', cuando: new Date().toISOString(), head: execSync('git rev-parse --short HEAD', { cwd: RAIZ }).toString().trim(), calidad: CALIDAD, bloquear_hd: BLOQUEAR, bloqueados, preparacion: prep, stats, diagResumen: { quieto: diag.quieto, arrancando: diag.arrancando, cola: diag.cola.length, enColaHD: diag.cola.filter(r => r.tipo === 'hd').length }, look, jpg: path.basename(jpg) };
  const f = path.join(SALIDA, `k251_${CALIDAD}_${ETIQUETA}.json`); fs.writeFileSync(f, JSON.stringify(res, null, 1));
  console.log(`· ${CALIDAD} ${ETIQUETA}: bloqueados=${bloqueados} visiblesHD=${stats.visiblesHD} drawEdificios=${stats.drawEdificios} calls=${look.calls} tris=${look.triangulos} texturasMB=${look.texturasMB} colaHD=${res.diagResumen.enColaHD} quieto=${res.diagResumen.quieto}`);
  console.log('· json: ' + f);
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  try { chrome.kill(); } catch (e) { }
  await new Promise(r => setTimeout(r, 1200));
  try { execSync(`taskkill /PID ${chrome.pid} /T /F 2>nul`, { timeout: 10000 }); } catch (e) { }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e.message || e); process.exit(1); });
