#!/usr/bin/env node
/* Sonda KIMI-322 (Kimi 3): retención de heap en «alto» (QA-152, encargo 17:45 UTC).
   Entra en cap4 con ?calidad=alto (escritorio), muestrea heap post-gc + info.memory + stats del
   streaming cada 10 s durante ~140 s de sesión normal (intro incluida) y termina con una
   atribución: qué recursos del streaming retienen `partes`/geometría en JS (estado/refs/soltarEn).
   Uso: node tools/build/kimi3_322_sonda.js [--secs 140] [--etiqueta r1] */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn, execSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const SECS = +(arg('--secs', '140')); const ETIQUETA = arg('--etiqueta', 'r1');
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p === '/') p = '/index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res); }); return new Promise(ok => srv.listen(0, '127.0.0.1', () => ok({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = () => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(JSON.stringify(d.error))) : p.ok(d.result); } }; } call(m, p, s, t) { const id = ++this.id; let rj, rj2; const pr = new Promise((ok2, mal) => { rj = ok2; rj2 = mal; }); const to = setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rj2(new Error('timeout ' + m)); } }, (t || 30) * 1000); this.pend.set(id, { ok: r => { clearTimeout(to); rj(r); }, re2: e => { clearTimeout(to); rj2(e); } }); this.ws.send(JSON.stringify({ id, method: m, params: p || {}, sessionId: s })); return pr; } }
async function ev(cdp, ses, exp, t) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: true, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 300)); return r.result && r.result.value; }
const espera = ms => new Promise(r => setTimeout(r, ms));
const SEMILLA = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi3-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;
const MUESTRA = `(() => { const m = performance.memory || {}; let info = null, st = null, zs = null;
  try { const R = AV.G.renderer; info = { geo: R.renderer.info.memory.geometries, tex: R.renderer.info.memory.textures, prog: R.renderer.info.programs ? R.renderer.info.programs.length : 0 }; st = R.stats(); } catch (e) {}
  try { const s = AV.G.streaming.gestor.stats(); zs = { kbGeo: s.kbGeometria, modCerca: s.modelosCerca, modHD: s.modelosHD, modLejos: s.modelosLejos }; } catch (e) {}
  return { t: Math.round(performance.now()), heap: m.usedJSHeapSize ? Math.round(m.usedJSHeapSize / 1048576) : null,
    total: m.totalJSHeapSize ? Math.round(m.totalJSHeapSize / 1048576) : null,
    geo: info && info.geo, tex: info && info.tex, prog: info && info.prog, calls: st && st.calls, tris: st && st.triangulos,
    calidad: st && st.calidad, zonas: zs }; })()`;
const ATRIB = `(() => { const ST = AV.G.streaming.gestor; const out = { estados: {}, retenedores: {}, partesMB: 0, listoMB: 0, top: [], lotesN: -1 };
  const bytes = g => { if (!g || !g.attributes) return 0; let b = 0; for (const k in g.attributes) { const a = g.attributes[k]; if (a && a.array) b += a.array.byteLength; } if (g.index && g.index.array) b += g.index.array.byteLength; return b; };
  for (const n in ST.recursos) for (const t in ST.recursos[n]) { const r = ST.recursos[n][t];
    const pb = (r.partes ? r.partes.reduce((s, p) => s + bytes(p.geo), 0) : (r.geo ? bytes(r.geo) : 0)) / 1048576;
    out.partesMB += pb;
    const e = r.estado || '?'; if (!out.estados[e]) out.estados[e] = { n: 0, mb: 0 }; out.estados[e].n++; out.estados[e].mb += pb;
    if (e === 'listo') { out.listoMB += pb;
      const k = (r.refs > 0 ? 'refs>0' : 'refs=0') + (r.fijo ? '+fijo' : '') + (r.soltarEn ? (r.soltarEn > performance.now() ? '+soltarEn-futuro' : '+soltarEn-VENCIDO') : '+SIN-soltarEn');
      if (!out.retenedores[k]) out.retenedores[k] = { n: 0, mb: 0 }; out.retenedores[k].n++; out.retenedores[k].mb += pb;
      out.top.push([n + ':' + t, Math.round(pb * 10) / 10, r.refs]); } }
  out.top.sort((a, b) => b[1] - a[1]); out.top = out.top.slice(0, 12);
  try { out.lotesN = ST.lotes.length; } catch (e) {}
  for (const k in out.estados) out.estados[k].mb = Math.round(out.estados[k].mb * 10) / 10;
  for (const k in out.retenedores) out.retenedores[k].mb = Math.round(out.retenedores[k].mb * 10) / 10;
  out.partesMB = Math.round(out.partesMB * 10) / 10; out.listoMB = Math.round(out.listoMB * 10) / 10;
  return out; })()`;
(async () => {
  const srv = await servir(); const origen = `http://127.0.0.1:${srv.puerto}`;
  const salida = { tarea: 'KIMI-322', etiqueta: ETIQUETA, secs: SECS, calidad: 'alto', cap: 4, muestras: [], atribucion: null, head: null };
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3s322-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--enable-precise-memory-info', '--js-flags=--expose-gc', '--window-size=1366,768'], { stdio: 'ignore' });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await espera(200); }
  if (!puertoDev) throw new Error('sin DevTools');
  const ws = new WebSocket('ws://127.0.0.1:' + puertoDev + wsPath); await new Promise((ok, mal) => { ws.onopen = ok; ws.onerror = mal; });
  const cdp = new CDP(ws);
  const { targetId } = await cdp.call('Target.createTarget', { url: 'about:blank' });
  const { sessionId: ses } = await cdp.call('Target.attachToTarget', { targetId, flatten: true });
  await cdp.call('Runtime.enable', {}, ses); await cdp.call('Page.enable', {}, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA }, ses);
  await cdp.call('Page.navigate', { url: origen + '/index.html?qa=1&cap=4&calidad=alto' }, ses);
  for (let i = 0; i < 120; i++) { const listo = await ev(cdp, ses, `!!(window.AV && AV.G && AV.G.actores && (AV.G.actores.player3D || AV.G.actores.failed3D)) && !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden())`, 20).catch(() => false); if (listo) break; await espera(1000); }
  salida.tEntrada = Math.round(performance.now());
  const nM = Math.max(4, Math.round(SECS / 10));
  for (let i = 0; i < nM; i++) {
    await espera(10000);
    try { await cdp.call('HeapProfiler.collectGarbage', {}, ses, 60); } catch (e) { try { await ev(cdp, ses, `window.gc && window.gc()`, 20); } catch (e2) { } }
    await espera(400);
    salida.muestras.push(await ev(cdp, ses, MUESTRA, 30).catch(e => ({ error: String(e && e.message || e).slice(0, 120) })));
  }
  try { await cdp.call('HeapProfiler.collectGarbage', {}, ses, 60); } catch (e) { }
  await espera(400);
  salida.atribucion = await ev(cdp, ses, ATRIB, 60).catch(e => ({ error: String(e && e.message || e).slice(0, 200) }));
  salida.heapFinal = await ev(cdp, ses, MUESTRA, 30).catch(() => null);
  salida.head = await ev(cdp, ses, `(document.querySelector('meta[name=ave\\\\:build]')||{}).content || '?'`, 15).catch(() => '?');
  console.log(JSON.stringify(salida, null, 1));
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  try { chrome.kill(); } catch (e) { }
  await espera(1200);
  try { execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(AQUI, 'kimi2_mata_perfil.ps1')}" ${path.basename(perf)}`, { timeout: 30000 }); } catch (e) { }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.srv.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e && e.message || e); process.exit(1); });
