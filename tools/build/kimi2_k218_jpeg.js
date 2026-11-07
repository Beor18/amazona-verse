#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-218: recomprime JPEGs de la carga inicial a IGUAL resolución
   con mejor compresión, sin cambio visible (palanca del 📣 20:45 UTC). Diffs medidos contra el ORIGINAL
   decodificado (misma resolución, sin reescala). Umbrales: difusa media ≤2,5/255 y max ≤14/255 (≈PSNR 40 dB
   del criterio de build); el mapa de normales suelo_musgo_n.jpg es más estricto (media ≤1,5, max ≤10).
   Uso: node tools/build/kimi2_k218_jpeg.js            (mide y, si mejora, reescribe los 3 JPEG)
   Salida: consola + docs/img/kimi218/k218_jpeg.json */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi218');
fs.mkdirSync(SALIDA, { recursive: true });

// [ruta relativa, umbrales {media, max}, esNormalMap]
const BLANCOS = [
  ['assets/models/edificios/tex_hd/hd_savage_lq1024.jpg', { media: 2.5, max: 14 }, false],
  ['assets/models/edificios/tex_hd/hd_ancient_lq1024.jpg', { media: 2.5, max: 14 }, false],
  ['assets/tex/entorno/suelo_musgo_n.jpg', { media: 1.5, max: 10 }, true],
];
const CALIDADES = [0.9, 0.82, 0.75, 0.68];

const MIME = { '.html': 'text/html', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    if (/^\/k218\b/.test(p)) {
      res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
      return res.end(`<!doctype html><meta charset="utf-8"><body><script>
window.__k = { img: null };
window.cargar = url => new Promise((res, rej) => {
  const i = new Image();
  i.onload = () => { window.__k.img = i; res({ ancho: i.naturalWidth, alto: i.naturalHeight }); };
  i.onerror = () => rej(new Error('img load ' + url));
  i.src = url;
});
window.probar = q => { // mismo tamaño, re-encode JPEG q, diff contra el original decodificado
  const i = window.__k.img, w = i.naturalWidth, h = i.naturalHeight;
  const a = document.createElement('canvas'); a.width = w; a.height = h;
  const cx = a.getContext('2d', { willReadFrequently: true });
  cx.drawImage(i, 0, 0);
  const url = a.toDataURL('image/jpeg', q);
  const re = new Image();
  return new Promise((res, rej) => {
    re.onload = () => {
      const b = document.createElement('canvas'); b.width = w; b.height = h;
      b.getContext('2d', { willReadFrequently: true }).drawImage(re, 0, 0);
      const da = cx.getImageData(0, 0, w, h).data, db = b.getContext('2d').getImageData(0, 0, w, h).data;
      let n = 0, suma = 0, max = 0, sobre = 0;
      const paso = 2;
      for (let y = 0; y < h; y += paso) for (let x = 0; x < w; x += paso) {
        const o = (y * w + x) * 4; n++;
        const d0 = Math.abs(da[o] - db[o]), d1 = Math.abs(da[o + 1] - db[o + 1]), d2 = Math.abs(da[o + 2] - db[o + 2]);
        const m = d0 > d1 ? (d0 > d2 ? d0 : d2) : (d1 > d2 ? d1 : d2);
        suma += d0 + d1 + d2; if (m > max) max = m; if (m > 4) sobre++;
      }
      window.__k.url = url;
      res({ bytes: Math.round(url.length * 3 / 4), diffMedia: +(suma / (n * 3)).toFixed(3), diffMax: max, diffPct: +(100 * sobre / n).toFixed(3) });
    };
    re.onerror = rej; re.src = url;
  });
};
window.dame = () => window.__k.url;
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
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2k218-'));
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi2k218-*' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const res = { etiqueta: 'k218-jpeg', que: 'JPEG misma resolución recomprimidos (palanca KIMI-218)', umbrales: {}, archivos: {} };
  let chrome = null;
  try {
    const lanzado = await lanzarChrome(); chrome = lanzado.chrome;
    const ws = new WebSocket('ws://127.0.0.1:' + lanzado.puerto + lanzado.wsPath);
    const cdp = new CDP(ws); await cdp.listo();
    const { targetId } = await cdp.call('Target.createTarget', { url: origen + '/k218' });
    const { sessionId } = await cdp.call('Target.attachToTarget', { targetId, flatten: true });
    for (const [rel, umb, esNormal] of BLANCOS) {
      const abs = path.join(RAIZ, rel);
      const bytesOrig = fs.statSync(abs).size;
      const info = await evaluar(cdp, sessionId, `window.cargar('/${rel.split(path.sep).join('/')}')`, 60);
      const tabla = [];
      for (const q of CALIDADES) {
        const m = await evaluar(cdp, sessionId, `window.probar(${q})`, 120);
        tabla.push({ q, ...m });
      }
      const ok = tabla.filter(t => t.diffMedia <= umb.media && t.diffMax <= umb.max && t.bytes < bytesOrig * 0.9);
      ok.sort((a, b) => a.bytes - b.bytes);
      const elegido = ok[0] || null;
      res.umbrales[rel] = umb;
      res.archivos[rel] = { dim: info.ancho + 'x' + info.alto, bytesOrig, esNormalMap: esNormal, tabla, elegido: elegido ? elegido.q : null };
      if (elegido) {
        await evaluar(cdp, sessionId, `window.probar(${elegido.q})`, 120);
        const dataUrl = await evaluar(cdp, sessionId, 'window.dame()', 30);
        fs.writeFileSync(abs, Buffer.from(dataUrl.split(',')[1], 'base64'));
        const bd = fs.statSync(abs).size;
        res.archivos[rel].bytesNuevos = bd;
        console.log(`[k218] ${path.basename(rel)}: ${info.ancho}x${info.alto} ${(bytesOrig / 1024).toFixed(0)}K -> q${elegido.q} ${(bd / 1024).toFixed(0)}K (-${Math.round(100 * (1 - bd / bytesOrig))} %) · diff media ${elegido.diffMedia} max ${elegido.diffMax} · REESCRITO`);
      } else {
        console.log(`[k218] ${path.basename(rel)}: ${info.ancho}x${info.alto} ${(bytesOrig / 1024).toFixed(0)}K · ninguna calidad pasó los umbrales ${JSON.stringify(umb)} → SIN CAMBIO`);
      }
    }
  } finally {
    if (chrome) try { chrome.kill(); } catch (e) { }
    mataPorPerfil();
    srv.close();
  }
  const f = path.join(SALIDA, 'k218_jpeg.json');
  fs.writeFileSync(f, JSON.stringify(res, null, 1));
  console.log('[k218] JSON: ' + f);
})().catch(e => { console.error('[k218] FALLO:', e.message); process.exit(1); });
