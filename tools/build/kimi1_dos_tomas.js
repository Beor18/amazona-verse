// Dos tomas KIMI-018: ciudad al atardecer (mundo fundido + faroles) y villa con faroles de noche.
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn } = require('child_process');
const RAIZ = path.resolve(__dirname, '..', '..'); // barras invertidas: servir() compara con path.join (win32)
const CFG = JSON.parse(fs.readFileSync(path.join(RAIZ, 'tools/build/config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi018');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    const qa = /[?&]qa=1(?:&|$)/.test(req.url);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); return res.end('404'); }
      if (qa && /index\.html$/.test(f)) d = Buffer.from(d.toString('utf8').replace(/<meta charset[^>]*>/i, m => m + '<script src="tests/qa/qa.js" charset="utf-8"></script>'), 'utf8');
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(d);
    });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('ws')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(m, p, s, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: m, params: p || {}, sessionId: s })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + m)); } }, t); }); }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
const ev = async (cdp, ses, exp, t, aw) => {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, returnByValue: true, awaitPromise: aw !== false }, ses, (t || 30) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 300));
  return r.result ? r.result.value : undefined;
};
async function lanzar() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', '--window-size=1400,900'];
  const c = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let e0 = null; c.on('error', e => { e0 = e; });
  const pf = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 125; i++) {
    if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); return { c, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    if (e0) throw new Error('spawn: ' + e0.message);
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('sin DevToolsActivePort');
}
const ANCLA = `AV.teleport(X, Z); AV.G.S.pos.y += 0.4; AV.G.S.vy = 0; AV.G.fisica.MOVE.flying = true; AV.debug.camYaw(YAW);`;
(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const { c, puerto: pd, wsPath } = await lanzar();
  const ws = new WebSocket(`ws://127.0.0.1:${pd}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }, ses);
  await cdp.call('Emulation.setCPUThrottlingRate', { rate: 1 }, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1&atardecer=1` }, ses);
  const t0 = Date.now(); let listo = false;
  while (Date.now() - t0 < CFG.espera_listo_s * 1000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!listo) throw new Error('no arrancó');
  console.log('· jugador nuevo: ' + await ev(cdp, ses, CFG.preparar_js, 300));
  console.log('· intro: ' + await ev(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)); for (let i = 0; i < 200; i++) { const b = document.getElementById('c1-saltar'); if (b && b.isConnected) { b.click(); return 'saltada'; } await sleep(100); } return 'sin botón'; })()`, 40));
  await cdp.bombear(1.5);
  // Toma 1: ciudad al atardecer (mundo fundido + faroles en rampa alta)
  const ancla1 = ANCLA.replace('X', '-4').replace('Z', '-127').replace('YAW', 'Math.PI');
  console.log('· ciudad atardecer: ' + await ev(cdp, ses, `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    ${ancla1}
    AV.G.atardecer.forzar(true); AV.G.atardecer.avanzar(9);
    for (let i = 0; i < 28; i++) { await sleep(250); ${ancla1} }
    return JSON.stringify({ pos: { x: Math.round(AV.G.S.pos.x), y: Math.round(AV.G.S.pos.y), z: Math.round(AV.G.S.pos.z) }, k: AV.G.atardecer.k(), hora: AV.G.S.hora });
  })()`, 60));
  await cdp.bombear(1.2);
  let dataUrl = await ev(cdp, ses, "AV.G.renderer.snapshot(1280, 800, 0.92)", 90);
  fs.writeFileSync(path.join(SALIDA, 'ciudad_este_atardecer.jpg'), Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('  stats: ' + await ev(cdp, ses, "JSON.stringify(AV.G.renderer.stats())", 10, false));
  // Toma 2: villa con faroles de noche (postes + luces encendidas, mundo de día)
  const ancla2 = ANCLA.replace('X', '150').replace('Z', '203').replace('YAW', 'Math.PI');
  console.log('· villa noche-faroles: ' + await ev(cdp, ses, `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    AV.G.atardecer.forzar(false); AV.G.atardecer.avanzar(9); delete AV.G.S.hora;
    await sleep(2500);
    ${ancla2}
    AV.G.S.hora = 20;
    for (let i = 0; i < 20; i++) { await sleep(250); ${ancla2} }
    const f = AV.G.ambiente.faroles();
    return JSON.stringify({ pos: { x: Math.round(AV.G.S.pos.x), y: Math.round(AV.G.S.pos.y), z: Math.round(AV.G.S.pos.z) }, enc: f ? +f.enc.toFixed(2) : null, hora: AV.G.S.hora });
  })()`, 60));
  await cdp.bombear(1.0);
  dataUrl = await ev(cdp, ses, "AV.G.renderer.snapshot(1280, 800, 0.92)", 90);
  fs.writeFileSync(path.join(SALIDA, 'villa_muelle_noche.jpg'), Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('  stats: ' + await ev(cdp, ses, "JSON.stringify(AV.G.renderer.stats())", 10, false));
  console.log('· errores: ' + await ev(cdp, ses, 'JSON.stringify((window.__aveErrores || []).slice(0, 6))', 10, false));
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { c.kill(); }
  srv.close(); process.exit(0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(2); });
