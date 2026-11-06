#!/usr/bin/env node
/* KIMI-172 · capturas para Kelvin del Circuito del Primer Vuelo (Guardián en su salida + puertas en marcha). */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result ? r.result.value : undefined; }
const PREP = `(async () => {
  const G = window.AV.G, T = G.terreno, S = G.S, AV = window.AV, AVE = window.AVE;
  try { await G.mundo.listo; } catch (e) {}
  try { if (G.guia && G.guia.cerrar) G.guia.cerrar(); } catch (e) {} // cerrar «¡Así se juega!» (se reabre con el movimiento: se cierra otra vez al final)
  await new Promise(r => setTimeout(r, 400));
  // el módulo carga a demanda tras el primer gesto: si no llegó, la misma cadena que boot.js, explícita
  if (!G.v18guardian) {
    const cargar = a => AVE.assets.script(a).catch(() => {});
    await cargar('src/game/v18/progreso.js'); if (!G.v18 && window.AVV18Progreso) window.AVV18Progreso(G);
    await cargar('content/comun/personajes_v18.js');
    await cargar('src/game/v18/npc.js'); if (!G.v18npc && window.AVV18Npc) window.AVV18Npc(G);
    await cargar('src/game/v18/guardian.js'); if (!G.v18guardian && window.AVV18Guardian) window.AVV18Guardian(G);
  }
  const sx = -63, sz = -37;
  S.pos.x = sx + 6; S.pos.z = sz + 6; S.pos.y = T.height(sx + 6, sz + 6) + 0.02;
  for (let i = 0; i < 70 && !(G.v18npc && G.v18npc.instancia && G.v18npc.instancia('guardian')); i++) await new Promise(r => setTimeout(r, 200));
  try { if (G.streaming && G.streaming.terminar) await G.streaming.terminar(); } catch (e) {}
  await new Promise(r => setTimeout(r, 1500));
  G.camara.yaw = Math.atan2(-(sx - S.pos.x), -(sz - S.pos.z));
  try { G.camara.place(true); } catch (e) {}
  await new Promise(r => setTimeout(r, 900));
  try { if (G.guia && G.guia.cerrar) G.guia.cerrar(); } catch (e) {}
  await new Promise(r => setTimeout(r, 500));
  try { const gp = document.getElementById('guia-panel'); if (gp) gp.style.display = 'none'; } catch (e) {}
  await new Promise(r => setTimeout(r, 500));
  return !!(G.v18npc && G.v18npc.instancia && G.v18npc.instancia('guardian'));
})()`;
(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3f172-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--window-size=1280,800', '--hide-scrollbars'], { stdio: ['ignore', 'ignore', 'pipe'] });
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
  console.log('· NPC listo: ' + await ev(cdp, ses, PREP, 120));
  fs.mkdirSync(path.join(RAIZ, 'docs', 'img', 'kimi172'), { recursive: true });
  const foto = async (f) => { const r = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 30000); fs.writeFileSync(path.join(RAIZ, 'docs', 'img', 'kimi172', f), Buffer.from(r.data, 'base64')); console.log('· ' + f); };
  await foto('k172_guardian_salida.jpg');
  // encender el circuito y capturar las columnas
  console.log('· circuito: ' + await ev(cdp, ses, `(async () => {
    const G = window.AV.G, S = G.S, T = G.terreno;
    const g = G.v18guardian; if (!g) return 'sin modulo';
    if (!g.empezar()) return 'no empezo';
    const A = g.estado();
    for (let i = 0; i < 20; i++) { g.paso(0.2); try { G.v18npc.paso(0.2, false); } catch (e) {} }
    // a mitad del primer tramo, mirando la puerta 1
    const p = g.SITIO.puertas[0];
    S.pos.x = (g.SITIO.salida.x + p.x) / 2; S.pos.z = (g.SITIO.salida.z + p.z) / 2; S.pos.y = T.height(S.pos.x, S.pos.z) + 6;
    G.camara.yaw = Math.atan2(-(p.x - S.pos.x), -(p.z - S.pos.z));
    try { G.camara.place(true); } catch (e) {}
    g.paso(0.1);
    try { const gp = document.getElementById('guia-panel'); if (gp) gp.style.display = 'none'; } catch (e) {}
    await new Promise(r => setTimeout(r, 900));
    return A.fase;
  })()`, 60));
  await foto('k172_circuito_puertas.jpg');
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  try { chrome.kill(); } catch (e) { } srv.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
