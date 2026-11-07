#!/usr/bin/env node
/* KIMI-208 sonda 2: ¿splatEf (grid global) devuelve null en tierra? Muestrea puntos y compara
   splatEf vs splatAt (exacto, con el terreno completo cargado). → docs/img/kimi208/splatprobe.json */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi208');
fs.mkdirSync(SALIDA, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
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
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); this.onEvent = null;
    ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); };
    ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } else if (d.method && this.onEvent) this.onEvent(d); }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(m, p, s, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: m, params: p || {}, sessionId: s })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + m)); } }, t); }); }
  bombear(s) { return new Promise(r => setTimeout(r, (s || 0.3) * 1000)); }
}
async function ev(cdp, ses, expr, t) {
  const r = await cdp.call('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, ses, (t || 20) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 300));
  return r.result.value;
}
function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2sp-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-component-update', '--window-size=500,900'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort');
  return new Promise((res, rej) => { let v = 0; const iv = setInterval(() => {
    if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { clearInterval(iv); return res({ chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }); } }
    if (++v > 300) { clearInterval(iv); rej(new Error('Chrome no abrió DevTools: ' + err.slice(0, 200))); } }, 200); });
}
const SEMILLA = `try { localStorage.clear(); localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({ v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-sp', profile: { created: true, name: 'Sonda', look: null },
  pos: { x: 134, z: 182.5, y: 5.24 }, facing: { x: 0, z: -1 }, step: 0, inv: {}, collected: [], complete: false, explorando: false, clock: 0, events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
  comic: { title: 'c', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} }, evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false } })); } catch (e) {}`;

(async () => {
  const res = { head: require('child_process').execSync('git rev-parse --short HEAD', { cwd: RAIZ, encoding: 'utf8' }).trim(), consola: [] };
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const chromeL = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${chromeL.puerto}${chromeL.wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const limpiar = () => { try { chromeL.chrome.kill(); } catch (e) {} try { fs.rmSync(chromeL.perf, { recursive: true, force: true }); } catch (e) {} srv.close(); };
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA }, ses);
    await cdp.call('Page.navigate', { url: origen + '/index.html?qa=1&cap=1&v18=0' }, ses);
    let listo = false;
    for (let i = 0; i < 150 && !listo; i++) { await cdp.bombear(0.5); try { listo = await ev(cdp, ses, `!!(window.AV && AV.G && AV.G.terreno && AV.G.terreno.exacto)`, 8); } catch (e) {} }
    if (!listo) throw new Error('terreno exacto no listo en 75 s');
    // carga todo el terreno para tener splatAt exacto de referencia
    await ev(cdp, ses, `(() => { AV.G.terreno.cargarTodo(); return 1; })()`, 10);
    for (let i = 0; i < 80; i++) { await cdp.bombear(0.5); const n = await ev(cdp, ses, `AV.G.terreno.chunks.length`, 8).catch(() => 0); if (n >= 4) break; }
    await cdp.bombear(1);
    const r = await ev(cdp, ses, `(() => {
      const G = AV.G, T = G.terreno, M = T.mapa.tamano, SPG = window.AV_MAPA_CAP1_SPLAT;
      const b64u8 = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
      const cov = b64u8(SPG.c);
      let s = 999; const rnd = () => (s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296;
      let n = 0, gridNull = 0, exactNull = 0, ambosNull = 0, gridNullExactOk = 0, gridOkExactNull = 0, dif = 0;
      const ejemplos = [];
      for (let i = 0; i < 20000; i++) {
        const x = M.x0 + rnd() * M.ancho, z = M.z0 + rnd() * M.largo;
        // misma consulta que splatGlobal (celda del punto)
        let fx = (x - SPG.x0) / SPG.paso, fz = (z - SPG.z0) / SPG.paso;
        fx = Math.max(0, Math.min(SPG.nx - 1.001, fx)); fz = Math.max(0, Math.min(SPG.nz - 1.001, fz));
        const ix = fx | 0, iz = fz | 0, ci = ix + iz * SPG.nx;
        const gNull = !((cov[ci >> 3] >> (ci & 7)) & 1);
        const e = T.splatAt(x, z);
        const eNull = !e;
        n++;
        if (gNull) gridNull++; if (eNull) exactNull++;
        if (gNull && eNull) ambosNull++;
        if (gNull && !eNull) { gridNullExactOk++; if (ejemplos.length < 6) ejemplos.push({ x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, h: Math.round(T.height(x, z) * 100) / 100 }); }
        if (!gNull && eNull) gridOkExactNull++;
      }
      return { n, gridNull, exactNull, ambosNull, gridNullExactOk, gridOkExactNull, ejemplos };
    })()`, 90);
    Object.assign(res, r);
    res.ok = true;
  } catch (e) { res.fallo = String(e && e.stack || e).slice(0, 400); }
  fs.writeFileSync(path.join(SALIDA, 'splatprobe.json'), JSON.stringify(res, null, 2));
  console.log(JSON.stringify(res, null, 1));
  limpiar();
  process.exit(res.ok ? 0 : 1);
})();
