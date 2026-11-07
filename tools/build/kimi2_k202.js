#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-202: hornea hd_<kit>_lq.jpg (2048²) para el arranque en «bajo».
   Contexto (📣 coordinadora 7-nov 12:10 UTC): bajar la carga inicial sin que se vea peor. El difuso del atlas
   (tex_hd/hd_{ancient,savage}.jpg, 4096², 4,3-5,4 MB) entra en la ventana de arranque porque las zonas-ciudad
   vecinas al spawn se fusionan en 'bajo'. PERO en 'bajo' el motor YA recorta ese atlas a 2048² por canvas
   (streaming.js reducirAtlas/atlasMax: HD.celdas*HD.celda/2). Horneamos ese mismo 2048² a JPEG y lo servimos
   como hd_<kit>_lq.jpg: la vista es la MISMA que ya se veía en 'bajo', con ~1/4 de bytes y sin el pico de
   decodificación del 4096. La calidad alta sigue pidiendo el 4096 (streaming.js, gancho 'calidad').
   Honestidad: el diff se m contra la REFERENCIA del pipeline actual (4096 → canvas 2048), no contra el 4096
   crudo (bajar resolución es la palanca aceptada; el JPEG añade su deriva encima y es lo que se mide).
   Uso: node tools/build/kimi2_k202.js [--calidad 0.85] [--salida assets/models/edificios/tex_hd]
   Salida: consola + docs/img/kimi202/k202_lq.json */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CALIDAD = +(arg('--calidad', '0.85'));
const SALIDA_DIR = arg('--salida', path.join(RAIZ, 'assets', 'models', 'edificios', 'tex_hd'));
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi202');
fs.mkdirSync(SALIDA, { recursive: true });
const KITS = ['savage', 'ancient'];
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? argv_num(i) : d; }
function argv_num(i) { return process.argv[i + 1]; }

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    if (/^\/k202\b/.test(p)) { // página de trabajo: canvas + carga de imágenes del repo
      res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
      return res.end(`<!doctype html><meta charset="utf-8"><body><script>
window.__k = { img: null };
window.cargar = url => new Promise((res, rej) => {
  const i = new Image();
  i.onload = () => { window.__k.img = i; res({ ancho: i.naturalWidth, alto: i.naturalHeight }); };
  i.onerror = () => rej(new Error('img load ' + url));
  i.src = url;
});
window.hornear = async (destinoW, q) => { // 4096 → canvas destinoW (referencia) y → JPEG q (horneado) → diff
  const i = window.__k.img, w = i.naturalWidth, h = i.naturalHeight;
  const ref = document.createElement('canvas'); ref.width = destinoW; ref.height = Math.round(h * destinoW / w);
  const cref = ref.getContext('2d', { willReadFrequently: true });
  cref.drawImage(i, 0, 0, ref.width, ref.height);
  const horn = document.createElement('canvas'); horn.width = ref.width; horn.height = ref.height;
  horn.getContext('2d', { willReadFrequently: true }).drawImage(i, 0, 0, horn.width, horn.height);
  const dataUrl = horn.toDataURL('image/jpeg', q);
  const re = new Image();
  await new Promise((res, rej) => { re.onload = res; re.onerror = rej; re.src = dataUrl; });
  const b = document.createElement('canvas'); b.width = horn.width; b.height = horn.height;
  b.getContext('2d', { willReadFrequently: true }).drawImage(re, 0, 0);
  const da = cref.getImageData(0, 0, ref.width, ref.height).data, db = b.getContext('2d').getImageData(0, 0, b.width, b.height).data;
  let distintos = 0, n = 0, suma = 0, max = 0;
  const paso = 2;
  for (let y = 0; y < ref.height; y += paso) for (let x = 0; x < ref.width; x += paso) {
    const o = (y * ref.width + x) * 4; n++;
    const d0 = Math.abs(da[o] - db[o]), d1 = Math.abs(da[o + 1] - db[o + 1]), d2 = Math.abs(da[o + 2] - db[o + 2]);
    const m = d0 > d1 ? (d0 > d2 ? d0 : d2) : (d1 > d2 ? d1 : d2);
    suma += d0 + d1 + d2; if (m > max) max = m;
    if (m > 4) distintos++;
  }
  window.__k.dataUrl = dataUrl;
  return { bytes: Math.round(dataUrl.length * 3 / 4), diffPct: +(100 * distintos / n).toFixed(3), diffMedia: +(suma / (n * 3)).toFixed(2), diffMax: max };
};
window.dame = () => window.__k.dataUrl;
<\/script></body>`);
    }
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(method, params, sessionId, timeoutMs) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method, params: params || {}, sessionId })); if (timeoutMs) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + method)); } }, timeoutMs); }); }
}
async function evaluar(cdp, ses, exp, timeoutS) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: true, returnByValue: true }, ses, (timeoutS || 60) * 1000);
  if (r.exceptionDetails) { const d = r.exceptionDetails; throw new Error('JS@' + (d.lineNumber != null ? d.lineNumber + ':' + d.columnNumber : '?') + ': ' + JSON.stringify(d.exception && d.exception.description || d.text).slice(0, 900)); }
  return r.result ? r.result.value : undefined;
}
async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2k202-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update',
    '--window-size=800,600', 'about:blank'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 150; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools en 30 s: ' + err.slice(0, 300));
}
function mataPorPerfil() {
  try {
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi2k202-*' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const res = { etiqueta: 'k202-lq', que: 'hd_<kit>_lq.jpg 2048² horneado para arranque «bajo» (KIMI-202)', calidad: CALIDAD,
    referencia: 'pipeline actual: 4096 → canvas 2048 (streaming.js reducirAtlas); el diff mide solo la deriva del JPEG sobre esa referencia',
    muestreoDiff: '1 de cada 4 píxeles, umbral max-canal >4/255', kits: {} };
  let chrome = null;
  try {
    const lanzado = await lanzarChrome(); chrome = lanzado.chrome;
    const ws = new WebSocket('ws://127.0.0.1:' + lanzado.puerto + lanzado.wsPath);
    const cdp = new CDP(ws); await cdp.listo();
    const { targetId } = await cdp.call('Target.createTarget', { url: origen + '/k202' });
    const { sessionId } = await cdp.call('Target.attachToTarget', { targetId, flatten: true });
    for (const kit of KITS) {
      const src = `/assets/models/edificios/tex_hd/hd_${kit}.jpg`;
      const info = await evaluar(cdp, sessionId, `window.cargar('${src}')`, 60);
      const med = await evaluar(cdp, sessionId, `window.hornear(2048, ${CALIDAD})`, 120);
      const dataUrl = await evaluar(cdp, sessionId, 'window.dame()', 30);
      const destino = path.join(SALIDA_DIR, `hd_${kit}_lq.jpg`);
      fs.writeFileSync(destino, Buffer.from(dataUrl.split(',')[1], 'base64'));
      const bytesDisco = fs.statSync(destino).size;
      res.kits[kit] = { fuente: src, fuenteBytes: fs.statSync(path.join(RAIZ, src.replace(/^\//, ''))).size, ...med, bytesDisco, destino: destino.replace(RAIZ + path.sep, '').split(path.sep).join('/') };
      console.log(`[k202] ${kit}: fuente ${(res.kits[kit].fuenteBytes / 1048576).toFixed(2)} MB ${info.ancho}×${info.alto} → lq 2048² q${CALIDAD} = ${(bytesDisco / 1048576).toFixed(2)} MB · diff ${med.diffPct}% (media ${med.diffMedia}, max ${med.diffMax})`);
    }
  } finally {
    if (chrome) try { chrome.kill(); } catch (e) { }
    mataPorPerfil();
    srv.close();
  }
  const f = path.join(SALIDA, 'k202_lq.json');
  fs.writeFileSync(f, JSON.stringify(res, null, 1));
  console.log('[k202] JSON: ' + f);
})().catch(e => { console.error('[k202] FALLO:', e.message); process.exit(1); });
