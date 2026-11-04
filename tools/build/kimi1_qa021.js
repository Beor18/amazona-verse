// KIMI-021: captura + stats de la peor vista de streamingTest (kelvin_ruinas_yunque, giro 3.1, calidad alta).
// Uso: node tools/build/kimi1_qa021.js [--sufijo _base|_post] [--yaw 3.1416]
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn } = require('child_process');
const RAIZ = path.resolve(__dirname, '..', '..');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi021');
const ANCHO = 1600, ALTO = 900;
const argv = process.argv.slice(2);
const SUFIJO = (argv[argv.indexOf('--sufijo') + 1] || '').replace(/[^\w-]/g, '');
const YAW = argv.includes('--yaw') ? parseFloat(argv[argv.indexOf('--yaw') + 1]) : Math.PI;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
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
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(m, p, s, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: m, params: p || {}, sessionId: s })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + m)); } }, t); }); }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function ev(cdp, ses, exp, t, aw) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, returnByValue: true, awaitPromise: aw !== false }, ses, (t || 30) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 300));
  return r.result ? r.result.value : undefined;
}
const TOMA_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
  // Réplica de streamingTest: zona con más instancias (kelvin_ruinas_yunque), borde sur
  const ST0 = G.mundo.streaming;
  const ZM = (() => { let z = null, n = -1; for (const id in ST0.zonas) { const zz = ST0.zonas[id]; const inst = zz.inst ? zz.inst.length : 0; if (inst > n) { n = inst; z = zz; } } return z; })();
  if (!ZM) return JSON.stringify({ error: 'sin zonas' });
  const ir = () => { AV.teleport(ZM.cx, ZM.cz + Math.min(ZM.r, 40) + 6, 0, -1); S.vy = 0; if (G.fisica && G.fisica.MOVE) G.fisica.MOVE.flying = true; G.camara.yaw = ${YAW}; if (AV.debug && AV.debug.camYaw) AV.debug.camYaw(${YAW}); };
  ir();
  const ST = G.mundo && G.mundo.streaming;
  if (ST) { if (ST.alrededor) await ST.alrededor(S.pos.x, S.pos.z); if (ST.terminar) await ST.terminar(); }
  for (let i = 0; i < 8; i++) { await sleep(500); ir(); }
  const raf = () => new Promise(r => requestAnimationFrame(r));
  await raf(); await raf();
  const st = G.renderer.stats();
  const png = G.renderer.snapshot(${ANCHO}, ${ALTO}, 0.9);
  return JSON.stringify({ pos: { x: +S.pos.x.toFixed(1), y: +S.pos.y.toFixed(1), z: +S.pos.z.toFixed(1) }, zona: ZM.id, stats: st, png }); })()`;
async function lanzar() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1q-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', `--window-size=${ANCHO},${ALTO}`];
  const c = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let e0 = null; c.on('error', e => { e0 = e; });
  const pf = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { c, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    if (e0) throw new Error('spawn: ' + e0.message);
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('sin DevToolsActivePort');
}
(async () => {
  fs.mkdirSync(SALIDA, { recursive: true });
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const { c, perf, puerto: pd, wsPath } = await lanzar();
  const ws = new WebSocket(`ws://127.0.0.1:${pd}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  console.log(`· KIMI-021 · ${ANCHO}×${ALTO} · calidad alta · yaw ${YAW} · sufijo «${SUFIJO}»`);
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const { sessionId: ses } = await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true });
  await cdp.call('Page.enable', {}, ses);
  await cdp.call('Runtime.enable', {}, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); } catch(e){}" }, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1&mapa=real&calidad=alto` }, ses);
  const CFG = JSON.parse(fs.readFileSync(path.join(RAIZ, 'tools/build/config.json'), 'utf8')).pruebas;
  { const t0 = Date.now(); let ok = false; while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) {} await cdp.bombear(0.5); } console.log('· listo:', ok); }
  console.log('· preparar:', String(await ev(cdp, ses, CFG.preparar_js, 300)).slice(0, 80));
  for (let i = 0; i < 240; i++) { try { if ((await ev(cdp, ses, `!!(window.AV && AV.G && AV.G.mundo && AV.G.mundo.streaming && Object.keys(AV.G.mundo.streaming.zonas).length)`, 10, false)) === true) break; } catch (e) {} await cdp.bombear(1); }
  await ev(cdp, ses, `(async () => { const s = ms => new Promise(r => setTimeout(r, ms)); if (AV.G.mundo.listo) await AV.G.mundo.listo; if (AV.G.mundo.streaming.listo) await AV.G.mundo.streaming.listo; if (AV.G.mundo.streaming.terminar) await AV.G.mundo.streaming.terminar(); await s(1500); return 'ok'; })()`, 300);
  const m = JSON.parse(await ev(cdp, ses, TOMA_JS, 240));
  if (m.error) throw new Error(m.error);
  const png = m.png; delete m.png;
  const b64 = (png || '').includes(',') ? png.split(',')[1] : png;
  const base = `qa021_ruinas_yunque${SUFIJO ? '_' + SUFIJO : ''}`;
  fs.writeFileSync(path.join(SALIDA, base + '.jpg'), Buffer.from(b64, 'base64'));
  fs.writeFileSync(path.join(SALIDA, base + '.json'), JSON.stringify(m, null, 2));
  console.log('· zona:', m.zona, '· pos:', JSON.stringify(m.pos));
  console.log('· stats:', JSON.stringify(m.stats));
  console.log('· captura:', path.relative(RAIZ, path.join(SALIDA, base + '.jpg')));
  const cons = await ev(cdp, ses, `(window.__erroresConsola || []).join(' | ')`, 5).catch(() => '(sin hook)');
  console.log('· consola:', cons || '0 errores');
  try { c.kill('SIGKILL'); } catch (e) {}
  await new Promise(r => setTimeout(r, 800));
  try { spawn('cmd', ['/c', 'rd', '/s', '/q', perf.replace(/\//g, '\\')], { stdio: 'ignore', detached: true }); } catch (e) {}
  srv.close();
  process.exit(0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
