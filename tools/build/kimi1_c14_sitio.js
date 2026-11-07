#!/usr/bin/env node
/* KIMI-130-c14 (Kimi 1) — sonde de diagnóstico: qué contamina el sitio de Moon (-150.5, 14) tras KIMI-203.
   Réplica del arranque de kimi3_166_sitio.js con un ESCAN que asienta del todo (varias pasadas de
   streaming/sólidos + esperas) y vuelca: trozos de terreno cargados, troncos/rocas <20 m, colliders <20 m
   y el contribuyente exacto del 'libre' mínimo del check 5 de v18MoonTest. Solo diagnóstico. */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result ? r.result.value : undefined; }
const ESCAN = `(async () => {
  const G = window.AV.G, T = G.terreno, F = G.fisica, S = G.S;
  const H = (x, z) => T.height(x, z);
  const SITIO = { x: -150.5, z: 14 };
  try { await G.mundo.listo; } catch (e) {}
  // asentado en serio: 3 pasadas de carga alrededor del sitio + drenado
  const cargas = [[-156, 6], [-156, 18], [-144, 6], [-144, 18], [-134, 6], [-134, 18], [-150, 12]];
  for (let pasada = 0; pasada < 3; pasada++) for (const [lx, lz] of cargas) {
    S.pos.x = lx; S.pos.z = lz; S.pos.y = H(lx, lz) + 0.02;
    await new Promise(r => setTimeout(r, 500));
    try { if (G.streaming && G.streaming.terminar) await G.streaming.terminar(); } catch (e) {}
    try { if (G.solidos && G.solidos.terminar) G.solidos.terminar(); } catch (e) {}
  }
  // estado del terreno en el sitio
  const terreno = { sueloEnSitio: T.sueloEn ? T.sueloEn(SITIO.x, SITIO.z) : 'n/a', h: H(SITIO.x, SITIO.z), exacto: !!T.exacto };
  // troncos/rocas <20 m (mismo criterio que el check 5)
  const VG = G.vegetacion, P = VG && VG.instancias, inf = VG && VG.info, tr = [];
  if (P && inf) for (const m in P) { const I = inf[m], PM = P[m]; if (!I || !PM) continue; const roca = /roca|piedra|tronco/.test(m); if (!roca && !(I.tronco >= 0.05)) continue;
    for (let i = 0; i < PM.n; i++) { const x = PM.pos[i * 4], z = PM.pos[i * 4 + 2], sc = PM.pos[i * 4 + 3]; const d = Math.hypot(x - SITIO.x, z - SITIO.z); if (d < 20) tr.push({ tipo: roca ? 'roca' : 'tronco', modelo: m, x: +x.toFixed(1), z: +z.toFixed(1), dist: +d.toFixed(2), r: +(roca ? Math.max(0.5, (I.ancho || 1) * 0.5 * sc) : Math.max(0.2, I.tronco * sc)).toFixed(2) }); } }
  tr.sort((a, b) => a.dist - b.dist);
  // colliders <20 m
  const cols = (F.colliders || []).filter(c => c && c.x != null && Math.hypot(c.x - SITIO.x, c.z - SITIO.z) < 20 && !/^v18npc/.test(c.id || ''))
    .map(c => ({ id: c.id || '(anon)', x: +c.x.toFixed(1), z: +c.z.toFixed(1), dist: +Math.hypot(c.x - SITIO.x, c.z - SITIO.z).toFixed(2), hx: c.hx, hz: c.hz, r: c.r })).sort((a, b) => a.dist - b.dist);
  // recomputar el mT del check 5 con el contribuyente exacto
  const dCol = (x, z, c) => c.hx ? Math.hypot(Math.max(0, Math.abs(x - c.x) - c.hx), Math.max(0, Math.abs(z - c.z) - c.hz)) : Math.hypot(x - c.x, z - c.z) - (c.r || 0);
  let mT = 99; let culpable = null; let solido = 0;
  for (let a = 0; a < 16; a++) for (const r of [3, 7, 11]) { const x = SITIO.x + Math.cos(a / 16 * 6.2832) * r, z = SITIO.z + Math.sin(a / 16 * 6.2832) * r, h = H(x, z);
    for (const t of tr) { const d = Math.hypot(x - t.x, z - t.z) - t.r; if (d < mT) { mT = d; culpable = t; } }
    for (const c of cols) { const d = dCol(x, z, c); if (d < mT) { mT = d; culpable = { tipo: 'collider', id: c.id, x: c.x, z: c.z }; } }
    if (G.solidos && G.solidos.activo && [0.3, 0.9, 1.5, 2.5].some(y => G.solidos.dentro(x, z, h + y) > -Infinity)) solido++; }
  return { terreno, nTroncos: tr.length, troncos: tr.slice(0, 8), nColliders: cols.length, colliders: cols.slice(0, 8), libreMin: +mT.toFixed(2), culpable, solido };
})()`;
(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1c14s-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--window-size=1280,800'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoDev) { try { chrome.kill(); } catch (e) { } throw new Error('Chrome no abrió DevTools ' + err.slice(0, 200)); }
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); } catch(e){}" }, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html?v18=1` }, ses);
  const t0 = Date.now(); let ok = false;
  while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!ok) { console.log('· no arrancó'); process.exit(1); }
  console.log('· preparar: ' + await ev(cdp, ses, CFG.preparar_js, 300));
  const r = await ev(cdp, ses, ESCAN, 560);
  console.log(JSON.stringify(r, null, 1));
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  try { chrome.kill(); } catch (e) { } srv.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
