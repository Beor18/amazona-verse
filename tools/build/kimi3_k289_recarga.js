#!/usr/bin/env node
/* KIMI-289: diagnóstico del check «El tamaño de texto sobrevive a recargar» —
   instrumenta restaurar() con oyentes-testigo en la prioridad 1 y 100 del gancho 'apply'. */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn, execSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result ? r.result.value : undefined; }
(async () => {
  const srv = await servir(); const origen = `http://127.0.0.1:${srv.puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3k289d-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--window-size=1280,800'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoDev) { try { chrome.kill(); } catch (e) { } throw new Error('Chrome no abrió DevTools en 60 s ' + err.slice(0, 200)); }
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
  const EXP = `(async () => {
    const G = window.AV.G, raiz = document.documentElement;
    const vistos = [];
    G.on('apply', () => { try { vistos.push(['p1', JSON.stringify((G.S.profile || {}).a11y || null)]); } catch (e) {} }, 1);
    G.on('apply', () => { try { vistos.push(['p100', JSON.stringify((G.S.profile || {}).a11y || null)]); } catch (e) {} }, 100);
    G.accesibilidad.set('texto', 2);
    const t2puesta = raiz.classList.contains('a11y-t2'), leer2 = G.accesibilidad.leer().texto;
    const crudo = G.guardado.serialize(true);
    const crudoA11y = JSON.parse(crudo).profile.a11y;
    const dR = G.guardado.migrate(JSON.parse(crudo));
    const valida = G.guardado.validSave(dR);
    const dRa11y = dR.profile && dR.profile.a11y;
    vistos.length = 0;
    G.guardado.restaurar(dR);
    const tras = { a11yEnS: JSON.stringify((G.S.profile || {}).a11y || null), leer: G.accesibilidad.leer().texto, t2: raiz.classList.contains('a11y-t2'), vistos: vistos.slice() };
    // y el camino real de producto: recarga de página con la partida guardada (a11y texto 2 ya guardada por set)
    return { t2puesta, leer2, crudoA11y, valida, dRa11y, tras };
  })()`;
  const salida = await ev(cdp, ses, EXP, 60);
  const out = { head: execSync('git rev-parse --short HEAD').toString().trim(), salida };
  fs.mkdirSync(path.join(AQUI, '..', '..', 'docs', 'img', 'kimi289'), { recursive: true });
  fs.writeFileSync(path.join(AQUI, '..', '..', 'docs', 'img', 'kimi289', 'k289_recarga_diag.json'), JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1));
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  try { chrome.kill(); } catch (e) { }
  await new Promise(r => setTimeout(r, 1200));
  try { console.log('· ' + execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(AQUI, 'kimi2_mata_perfil.ps1')}" ${path.basename(perf)}`, { timeout: 30000 }).toString().trim()); } catch (e) { }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.srv.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
