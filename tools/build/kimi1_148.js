// KIMI-148 · medición GPU real de los 3 poderes de tanda A (gota_lluvia, chillido_bandada, rafaga) en el duelo:
// cuántos draw calls y triángulos añade cada poder y a cuántos FPS va la explanada durante el efecto.
// Uso: node tools/build/kimi1_148.js
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn } = require('child_process');
const RAIZ = path.resolve(__dirname, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
const CFG = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8')).pruebas;
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = () => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); }
}
const ev = async (cdp, ses, exp, t) => { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: true, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result ? r.result.value : undefined; };
(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi148-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--window-size=1600,900'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoDev) throw new Error('Chrome no abrió DevTools ' + err.slice(0, 200));
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.clear()}catch(e){}" }, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html?v18=1` }, ses);
  const t0 = Date.now(); let ok = false;
  while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await new Promise(r => setTimeout(r, 500)); }
  if (!ok) throw new Error('no arrancó');
  console.log('· preparar: ' + await ev(cdp, ses, CFG.preparar_js, 300));
  // abre el duelo a paso natural con cada especie nueva, usa el poder y mide info + FPS real del bucle
  const res = await ev(cdp, ses, `(async () => {
    const G = AV.G;
    const cargarScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('script ' + src)); document.head.appendChild(s); });
    const asegurar = async (src, fabrica) => { if (typeof window[fabrica] !== 'function' && !document.querySelector('script[src="' + src + '"]')) await cargarScript(src); };
    await asegurar('src/game/v18/progreso.js', 'AVV18Progreso'); window.AVV18Progreso(G);
    await asegurar('src/game/v18/habilidades.js', 'AVV18Habilidades'); window.AVV18Habilidades(G);
    await asegurar('src/game/v18/fx_poderes.js', 'AVV18Fx'); window.AVV18Fx(G);
    await asegurar('src/game/v18/combate.js', 'AVV18Combate'); window.AVV18Combate(G);
    if (!G.v18combate) return 'ERR: combate no cargado';
    const H = G.v18hab, B = G.v18combate, S = G.S;
    const muestra = () => { const s = G.renderer.stats(); return { calls: s.calls, tris: s.triangulos, fps: s.fps }; };
    const out = {};
    for (const sp of ['dufresniana', 'viridigenalis', 'finschi']) {
      B.iniciar({ sinCuenta: true, especie: sp });
      const C = B.estado();
      C.r.pensar = 99; C.r.golpeT = 99; C.r.tiroT = 99; C.r.poderT = 99; C.r.esquivaT = 99;
      await new Promise(r => setTimeout(r, 1500)); // asienta a tiempo real (el bucle del juego conduce el duelo)
      const base = muestra();
      const id = H.poderDe(sp);
      C.j.cd = {}; C.j.energia = 100; B.usar(C.j, id);
      let peor = null;
      for (let m = 0; m < 5; m++) { const s = muestra(); if (!peor || s.calls > peor.calls) peor = s; await new Promise(r => setTimeout(r, 200)); } // ventana del efecto
      B.salir();
      await new Promise(r => setTimeout(r, 400));
      out[sp] = { poder: id, base, fx: peor, dcalls: peor.calls - base.calls, dtris: peor.tris - base.tris };
    }
    const errs = (window.__aveErrores || []).length;
    return JSON.stringify({ out, errs });
  })()`, 120);
  console.log(res);
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  try { chrome.kill(); } catch (e) { } srv.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e.message || e); process.exit(1); });
