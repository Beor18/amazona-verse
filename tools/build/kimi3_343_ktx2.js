#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-343: spot-check GPU real del camino KTX2
   (925101b5, «texturas optimizadas» Modo Escuela/QA-110). La build publicadora lista los JPEG
   con .ktx2 en <meta name="ave:ktx2"> de index.html; en el worktree servido en crudo esa marca
   no existe, así que este servidor la inyecta (mismo formato que avbuild paso_ktx2) para
   ejercitar el camino real: KTX2Loader + transcoder Basis → CompressedTexture en la GPU.
   No toca ningún archivo del repo: la inyección va en el HTML servido.
   Uso: node tools/build/kimi3_343_ktx2.js [--url-extra "calidad=bajo"] [--etiqueta r1] */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn, execSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const KTX2CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).ktx2;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const URL_EXTRA = arg('--url-extra', 'calidad=bajo');
const ETIQUETA = arg('--etiqueta', 'r1');
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi343');
fs.mkdirSync(SALIDA, { recursive: true });
const LOGF = path.join(SALIDA, `k343_ktx2_${ETIQUETA}.log`);
fs.writeFileSync(LOGF, '');
function log(m) { try { fs.appendFileSync(LOGF, `[${new Date().toISOString().slice(11, 19)}] ${m}\n`); } catch (e) { } console.log(m); }

// Lo que avbuild paso_ktx2 lista: los JPEG de config con su .ktx2 presente en el repo.
const LISTA = (KTX2CFG.texturas || []).map(t => t.ruta).filter(r => fs.existsSync(path.join(RAIZ, r)) && fs.existsSync(path.join(RAIZ, r.replace(/\.(jpe?g|png|webp)$/i, '.ktx2'))));
log('· ave:ktx2 = ' + JSON.stringify(LISTA));

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.wasm': 'application/wasm', '.ktx2': 'image/ktx2' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); return res.end('404'); }
      if (p === '/index.html' || p.endsWith('/index.html')) {
        let txt = d.toString('utf8');
        if (!/name="ave:ktx2"/.test(txt)) {
          const m = txt.match(/<meta\s+charset=[^>]*>\s*/i) || txt.match(/<head[^>]*>\s*/i);
          if (m) txt = txt.slice(0, m.index + m[0].length) + `<meta name="ave:ktx2" content="${LISTA.join(' ')}">\n` + txt.slice(m.index + m[0].length);
        }
        d = Buffer.from(txt, 'utf8');
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(d);
    });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(m, p, s, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); const msg = { id, method: m, params: p || {} }; if (s) msg.sessionId = s; this.ws.send(JSON.stringify(msg)); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + m)); } }, t); }); }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function ev(cdp, ses, exp, t, pr) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000);
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result ? r.result.value : undefined;
}
(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3k343-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--window-size=1280,800'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath, caido = '';
  chrome.on('exit', (c, s) => { caido = 'exit ' + c; });
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } }
    await new Promise(r => setTimeout(r, 200));
  }
  if (!puertoDev) { try { chrome.kill(); } catch (e) { } throw new Error('Chrome no abrió DevTools en 60 s ' + err.slice(0, 200)); }
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); } catch(e){}; window.__k343err = []; window.addEventListener('error', e => __k343err.push(String(e.message || e.error || 'error'))); window.addEventListener('unhandledrejection', e => __k343err.push('rechazo: ' + String(e.reason && e.reason.message || e.reason))); const _ce = console.error.bind(console); console.error = (...a) => { __k343err.push('console.error: ' + a.map(x => { try { return typeof x === 'string' ? x : JSON.stringify(x); } catch (e) { return String(x); } }).join(' ').slice(0, 300)); _ce(...a); };" }, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html${URL_EXTRA ? '?' + URL_EXTRA.replace(/^&/, '') : ''}` }, ses);
  const t0 = Date.now(); let ok = false;
  while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!ok) { log('· no arrancó'); process.exit(1); }
  log('· preparar: ' + await ev(cdp, ses, CFG.preparar_js, 300));
  // asentar: ST.terminar() con tope
  try { log('· asentar: ' + await ev(cdp, ses, `(async () => { const ST = AV.G.mundo.streaming; const t0 = performance.now(); const r = await ST.terminar({ topeMs: 120000 }); return 'ok ' + Math.round(performance.now() - t0) + ' ms · tope ' + !!(r && r.tope); })()`, 150)); } catch (e) { log('· asentar (fallo suave): ' + e.message); }
  await cdp.bombear(2);
  const MEDIR = `(async () => {
    const G = AV.G, R = G.renderer, r = R.renderer;
    const vistos = new Set(); let texN = 0, bytes = 0, comprN = 0, comprBytes = 0;
    R.scene.traverse(o => {
      if (!o.material) return;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of ms) for (const k of ['map', 'alphaMap', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap']) {
        const t = m[k]; if (!t || vistos.has(t.uuid)) continue; vistos.add(t.uuid); texN++;
        const img = t.image || {};
        if (t.isCompressedTexture) { comprN++; let w = (t.mipmaps && t.mipmaps[0] && t.mipmaps[0].width) || img.width || 0, h = (t.mipmaps && t.mipmaps[0] && t.mipmaps[0].height) || img.height || 0; const b = w * h * 0.5 * 1.33; comprBytes += b; bytes += b; }
        else { const w = img.width || (img.naturalWidth) || 0, h = img.height || (img.naturalHeight) || 0; const b = (t.isCubeTexture ? 6 : 1) * w * h * 4 * 1.333; bytes += b; }
      }
    });
    // ¿el atlas LQ (difuso del kit en bajo) llegó como KTX2?
    const atlas = [];
    R.scene.traverse(o => { if (!o.material) return; const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) { const t = m.map; if (!t) continue; const nom = (t.source && t.source.data && t.source.data.src || '') + '|' + (m.name || ''); if (/lq(_1024)?\\.(jpg|jpeg)/i.test(nom) || /lq1024/i.test(nom)) atlas.push({ material: m.name, ktx2: !!t.isCompressedTexture, w: (t.mipmaps && t.mipmaps[0] && t.mipmaps[0].width) || (t.image && t.image.width) || 0 }); } });
    return { calidad: G.nivelCal ? G.nivelCal() : '?', escuela: !!(G.calidad && G.calidad.escuela), info: { geo: r.info.memory.geometries, tex: r.info.memory.textures, prog: r.info.programs.length, calls: r.info.render.calls, tris: r.info.render.triangles }, texturas: { n: texN, mb: Math.round(bytes / 1048576 * 10) / 10, comprimidas: comprN, comprimidasMb: Math.round(comprBytes / 1048576 * 10) / 10 }, atlasLQ: atlas.slice(0, 6), heapMb: Math.round((performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0) * 10) / 10, errores: (window.__k343err || []).slice(0, 12) };
  })()`;
  const res = await ev(cdp, ses, MEDIR, 60);
  const png = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses);
  if (png && png.data) fs.writeFileSync(path.join(SALIDA, `k343_ktx2_${ETIQUETA}.jpg`), Buffer.from(png.data, 'base64'));
  fs.writeFileSync(path.join(SALIDA, `k343_ktx2_${ETIQUETA}.json`), JSON.stringify({ head: execSync('git rev-parse --short=8 HEAD').toString().trim(), url_extra: URL_EXTRA, cuando: new Date().toISOString(), ...res }, null, 2));
  log('· medida: ' + JSON.stringify(res));
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  try { chrome.kill(); } catch (e) { }
  await new Promise(r => setTimeout(r, 1200));
  try { console.log('· ' + execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(AQUI, 'kimi2_mata_perfil.ps1')}" ${path.basename(perf)}`, { timeout: 30000 }).toString().trim()); } catch (e) { }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
