#!/usr/bin/env node
/* Sonda para BUGS.md «la ciudad suelta el kit» (streamingTest 22/23).
   Mide la zona kelvin_ruinas_yunque en el spawn (alto y bajo) y la ida/vuelta aérea en bajo,
   para decidir el arreglo del check «Al volver al inicio, la ciudad del tepuy suelta el kit».
   Uso: node tools/build/kimi3_ciudad.js */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 600)); return r.result ? r.result.value : undefined; }
(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3ciu-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--window-size=1280,800'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } }
    await new Promise(r => setTimeout(r, 200));
  }
  if (!puertoDev) { try { chrome.kill(); } catch (e) { } throw new Error('Chrome no abrió DevTools'); }
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); } catch(e){}" }, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html` }, ses);
  const t0 = Date.now(); let ok = false;
  while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!ok) { console.log('· no arrancó'); process.exit(1); }
  console.log('· preparar: ' + await ev(cdp, ses, CFG.preparar_js, 300));
  const SONDA = `(async () => {
    const AV = window.AV, G = AV.G, ST = G.streaming.gestor, R = G.renderer;
    const S = G.S, sp = (G.terreno.mapa || {}).spawn || { x: S.pos.x, z: S.pos.z };
    const ZC = ST.zonas.kelvin_ruinas_yunque;
    if (!ZC) return { error: 'sin zona kelvin_ruinas_yunque' };
    const medir = async (cal) => {
      if (R.setCalidad) R.setCalidad(cal, true);
      ST.revisar(sp.x, sp.z); await ST.terminar();
      return { cal, ciudad: !!ZC.ciudad, nivel: ZC.nivel, d: Math.round(ZC.d), r: Math.round(ZC.r), cx: Math.round(ZC.cx), cz: Math.round(ZC.cz) };
    };
    const spawnA = await medir('alto');
    const spawnB = await medir('bajo');
    // ida aérea (como la prueba: 150 m al borde) y vuelta, en bajo
    if (R.setCalidad) R.setCalidad('bajo', true);
    G.pruebas.teleport(ZC.cx, ZC.cz + ZC.r + 150, 0, -1); G.pruebas.tick(0.1);
    await ST.alrededor(ZC.cx, ZC.cz + ZC.r + 150); await ST.terminar();
    const aerea = { ciudad: !!ZC.ciudad, nivel: ZC.nivel, d: Math.round(ZC.d) };
    G.pruebas.teleport(sp.x, sp.z, 0, -1); G.pruebas.tick(0.1);
    await ST.alrededor(sp.x, sp.z); await ST.terminar(); ST.liberarYa();
    G.camara.place(true); R.render(1/60, false);
    const vueltaB = { ciudad: !!ZC.ciudad, nivel: ZC.nivel, d: Math.round(ZC.d) };
    // y lo mismo en alto para comparar
    if (R.setCalidad) R.setCalidad('alto', true);
    ST.revisar(sp.x, sp.z); await ST.terminar();
    const vueltaA = { ciudad: !!ZC.ciudad, nivel: ZC.nivel, d: Math.round(ZC.d) };
    const CFGS = ST.CFG;
    return { spawn: sp, alto: spawnA, bajo: spawnB, aereaBajo: aerea, vueltaBajo: vueltaB, vueltaAlto: vueltaA,
      ciudadVista: CFGS.ciudadVista, zonaLejos: CFGS.zonaLejos, histeresis: CFGS.histeresis };
  })()`;
  const r = await ev(cdp, ses, SONDA, 240);
  console.log('· sonda:', JSON.stringify(r, null, 1));
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  try { chrome.kill(); } catch (e) { } srv.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
