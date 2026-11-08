#!/usr/bin/env node
/* Sonda KIMI-320 (Kimi 3): compara el Modo Escuela ON/OFF en el spawn del cap. 1.
   Misma página, dos cargas (escuela=0 / escuela=1), asentado, y lee stats + vegetación.
   Uso: node tools/build/kimi3_320_sonda.js */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn, execSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p === '/') p = '/index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res); }); return new Promise(ok => srv.listen(0, '127.0.0.1', () => ok({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(JSON.stringify(d.error))) : p.ok(d.result); } }; } call(m, p, s, t) { const id = ++this.id; this.pend.set(id, { ok: r => { clearTimeout(to); rj(r); }, re2: e => { clearTimeout(to); rj2(e); } }); let rj, rj2, to; const pr = new Promise((ok2, mal) => { rj = ok2; rj2 = mal; }); to = setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rj2(new Error('timeout ' + m)); } }, (t || 30) * 1000); this.ws.send(JSON.stringify({ id, method: m, params: p || {}, sessionId: s })); return pr; } }
async function ev(cdp, ses, exp, t) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: true, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 300)); return r.result && r.result.value; }
const espera = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const srv = await servir(); const origen = `http://127.0.0.1:${srv.puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3s320-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--window-size=1366,768'], { stdio: 'ignore' });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await espera(200); }
  if (!puertoDev) throw new Error('sin DevTools');
  const ws = new WebSocket('ws://127.0.0.1:' + puertoDev + wsPath); await new Promise((ok, mal) => { ws.onopen = ok; ws.onerror = mal; });
  const cdp = new CDP(ws);
  const { targetId } = await cdp.call('Target.createTarget', { url: 'about:blank' });
  const { sessionId: ses } = await cdp.call('Target.attachToTarget', { targetId, flatten: true });
  await cdp.call('Runtime.enable', {}, ses); await cdp.call('Page.enable', {}, ses);
  const salida = { tarea: 'KIMI-320', sonda: 'escuela A/B en misma página', head: null, tomas: {} };
  await cdp.call('Page.navigate', { url: origen + '/?escuela=0' }, ses);
  const prep = await ev(cdp, ses, CFG.preparar_js, 120).catch(e => 'prep: ' + (e && e.message || e));
  salida.preparar = typeof prep === 'string' ? prep.slice(0, 120) : 'ok';
  for (let i = 0; i < 60; i++) { const listo = await ev(cdp, ses, `!!(${CFG.listo_js}) && !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden())`).catch(() => false); if (listo) break; await espera(1000); }
  await espera(9000); // asentado: streaming + vegetación + población
  const LEER = `(() => {
      const G = AV.G, R = G.renderer, st = R.stats();
      const veg = G.vegetacion && G.vegetacion.stats ? G.vegetacion.stats() : null;
      const vec = G.vecinos && G.vecinos.estado ? G.vecinos.estado() : null;
      return { escuela: R.calidad.escuela, nivel: st.calidad, calls: st.calls, tris: st.triangulos, dpr: st.dpr,
        veg: veg && { dArbol: Math.round(veg.dArbol * 10) / 10, dLod: Math.round(veg.dLod * 10) / 10, arbolesMalla: veg.arbolesMalla, trisArboles: veg.trisArboles, impostores: veg.impostores, instanciasVisibles: veg.instanciasVisibles },
        vecinos: vec, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null };
    })()`;
  salida.tomas.off = await ev(cdp, ses, LEER, 30);
  await ev(cdp, ses, `AV.G.renderer.setEscuela(true, true) && AV.G.vegetacion.actualizar(), 'on'`, 30);
  await espera(2500);
  salida.tomas.on = await ev(cdp, ses, LEER, 30);
  await ev(cdp, ses, `AV.G.renderer.setEscuela(null, true) && AV.G.vegetacion.actualizar(), 'auto'`, 30);
  await espera(2500);
  salida.tomas.auto = await ev(cdp, ses, LEER, 30);
  salida.head = await ev(cdp, ses, `(document.querySelector('meta[name=ave\\\\:build]')||{}).content || '?'`, 15).catch(() => '?');
  console.log(JSON.stringify(salida, null, 1));
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  try { chrome.kill(); } catch (e) { }
  await espera(1200);
  try { execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(AQUI, 'kimi2_mata_perfil.ps1')}" ${path.basename(perf)}`, { timeout: 30000 }); } catch (e) { }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.srv.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e && e.message || e); process.exit(1); });
