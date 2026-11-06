#!/usr/bin/env node
/* Amazona Verse · Kimi 3 — KIMI-135: captura de la peor vista (ciudad, yaw 4.7) post-fix fusión HD global solo-ciudad. */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result ? r.result.value : undefined; }
(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3k135-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--window-size=1600,900'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); } catch(e){}" }, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1&mapa=real&calidad=alto` }, ses);
  const t0 = Date.now();
  while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) break; } catch (e) { } await cdp.bombear(0.5); }
  await ev(cdp, ses, CFG.preparar_js, 300);
  const out = await ev(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, R = G.renderer, ST = G.mundo.streaming, P = G.pruebas;
    while (!Object.keys(ST.zonas).length) await sleep(250);
    if (G.mundo.listo) await G.mundo.listo; await ST.listo; await ST.terminar();
    R.setCalidad('alto', true);
    const zs = Object.values(ST.zonas);
    const ZM = zs.slice().sort((a, b) => b.inst.length - a.inst.length)[0];
    ST.soltarTodo(); await sleep(300);
    P.teleport(ZM.cx, ZM.cz + Math.min(ZM.r, 40) + 6, 0, -1); P.tick(0.1);
    await ST.alrededor(ZM.cx, ZM.cz + Math.min(ZM.r, 40) + 6); await ST.terminar();
    if (G.solidos && G.solidos.terminar) G.solidos.terminar();
    try { const b = Array.from(document.querySelectorAll('button')).find(x => /a jugar/i.test(x.textContent || '')); if (b) b.click(); } catch (e) {}
    await sleep(400);
    G.camara.yaw = 4.71238898038469; G.camara.place(true); R.render(1/60, false);
    const glob = []; R.scene.traverse(o => { if (o.name && o.name.indexOf('edificiosZonaHDGlobal:') === 0) glob.push({ n: o.name, runs: o.geometry.groups.length, castShadow: o.castShadow, tris: Math.round((o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3) }); });
    return JSON.stringify({ zona: ZM.id, global: glob }); })()`, 300);
  console.log(out);
  const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 30000);
  fs.mkdirSync(path.join(RAIZ, 'docs', 'img', 'kimi135'), { recursive: true });
  fs.writeFileSync(path.join(RAIZ, 'docs', 'img', 'kimi135', 'k135-post.jpg'), Buffer.from(shot.data, 'base64'));
  console.log('captura: docs/img/kimi135/k135-post.jpg');
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  try { chrome.kill(); } catch (e) { } srv.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
