#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-219 (prep post-lanzamiento): menú medido de re-encode JPEG
   de las imágenes que más pesan en la carga inicial (📣 coordinadora 7-nov 22:50 UTC: «lo que más pesa
   ahora son las imágenes: hd_savage_lq.jpg 1,6 MB y suelo_musgo_n.jpg 0,28 MB»).
   NO toca los activos del repo: hornea CANDIDATOS en tools/build/salida/kimi219-img/ y mide, por cada
   calidad q, la deriva del JPEG contra el archivo ACTUAL (lo que el jugador ve ahora): % píxeles con
   max-canal >4/255, delta media y máxima (muestreo 1/4 px). La palanca es solo «mismo JPEG más comprimido
   de igual resolución» (encargo original de Kimi 2); cambiar resolución toca la vista y lo decide Kelvin.
   Uso: node tools/build/kimi2_k219_imagenes.js
   Salida: consola + docs/img/kimi219/k219_img.json + candidatos en tools/build/salida/kimi219-img/ */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CANDIDATOS_DIR = path.join(RAIZ, 'tools', 'build', 'salida', 'kimi219-img');
const EVIDENCIA_DIR = path.join(RAIZ, 'docs', 'img', 'kimi219');
fs.mkdirSync(CANDIDATOS_DIR, { recursive: true });
fs.mkdirSync(EVIDENCIA_DIR, { recursive: true });

// las 2 imágenes que cita el 📣 + hd_ancient_lq (gemelo de savage, mismo mecanismo KIMI-202)
const IMGS = [
  { id: 'hd_savage_lq', src: '/assets/models/edificios/tex_hd/hd_savage_lq.jpg' },
  { id: 'hd_ancient_lq', src: '/assets/models/edificios/tex_hd/hd_ancient_lq.jpg' },
  { id: 'suelo_musgo_n', src: '/assets/tex/entorno/suelo_musgo_n.jpg' },
];
const CALIDADES = [0.92, 0.88, 0.85, 0.80, 0.75];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    if (/^\/k219img\b/.test(p)) { // página de trabajo: canvas + carga de imágenes del repo
      res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
      return res.end(`<!doctype html><meta charset="utf-8"><body><script>
window.__k = { img: null, dataUrl: null };
window.cargar = url => new Promise((res, rej) => {
  const i = new Image();
  i.onload = () => { window.__k.img = i; res({ ancho: i.naturalWidth, alto: i.naturalHeight }); };
  i.onerror = () => rej(new Error('img load ' + url));
  i.src = url;
});
window.reenc = async q => { // imagen actual → canvas NATIVO → JPEG q → decodificar → diff vs original
  const i = window.__k.img, w = i.naturalWidth, h = i.naturalHeight;
  const ref = document.createElement('canvas'); ref.width = w; ref.height = h;
  const cref = ref.getContext('2d', { willReadFrequently: true });
  cref.drawImage(i, 0, 0);
  const dataUrl = ref.toDataURL('image/jpeg', q);
  const re = new Image();
  await new Promise((res, rej) => { re.onload = res; re.onerror = rej; re.src = dataUrl; });
  const b = document.createElement('canvas'); b.width = w; b.height = h;
  b.getContext('2d', { willReadFrequently: true }).drawImage(re, 0, 0);
  const da = cref.getImageData(0, 0, w, h).data, db = b.getContext('2d').getImageData(0, 0, w, h).data;
  let distintos = 0, n = 0, suma = 0, max = 0;
  const paso = 2;
  for (let y = 0; y < h; y += paso) for (let x = 0; x < w; x += paso) {
    const o = (y * w + x) * 4; n++;
    const d0 = Math.abs(da[o] - db[o]), d1 = Math.abs(da[o + 1] - db[o + 1]), d2 = Math.abs(da[o + 2] - db[o + 2]);
    const m = d0 > d1 ? (d0 > d2 ? d0 : d2) : (d1 > d2 ? d1 : d2);
    suma += d0 + d1 + d2; if (m > max) max = m;
    if (m > 4) distintos++;
  }
  window.__k.dataUrl = dataUrl;
  return { ancho: w, alto: h, bytes: Math.round(dataUrl.length * 3 / 4), diffPct: +(100 * distintos / n).toFixed(3), diffMedia: +(suma / (n * 3)).toFixed(2), diffMax: max };
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
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2k219i-'));
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi2k219i-*' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const res = { when: new Date().toISOString(), etiqueta: 'k219-img-r1',
    que: 'menú de re-encode JPEG (misma resolución) de las imágenes más pesadas de la carga inicial; diff contra el archivo actual (lo que se ve hoy); muestreo 1/4 px, umbral max-canal >4/255',
    imagenes: {} };
  let chrome = null;
  try {
    const lanzado = await lanzarChrome(); chrome = lanzado.chrome;
    const ws = new WebSocket('ws://127.0.0.1:' + lanzado.puerto + lanzado.wsPath);
    const cdp = new CDP(ws); await cdp.listo();
    const { targetId } = await cdp.call('Target.createTarget', { url: origen + '/k219img' });
    const { sessionId } = await cdp.call('Target.attachToTarget', { targetId, flatten: true });
    for (let i = 0; i < 50; i++) { // la página tarda en parsear el inline script: esperar a que cargar exista
      const t = await evaluar(cdp, sessionId, 'typeof window.cargar', 10).catch(() => 'error');
      if (t === 'function') break;
      await new Promise(r => setTimeout(r, 200));
      if (i === 49) throw new Error('la página de trabajo no expuso window.cargar');
    }
    for (const im of IMGS) {
      const bytesActual = fs.statSync(path.join(RAIZ, im.src.replace(/^\//, ''))).size;
      const info = await evaluar(cdp, sessionId, `window.cargar('${im.src}')`, 60);
      res.imagenes[im.id] = { src: im.src, bytesActual, ancho: info.ancho, alto: info.alto, calidades: {} };
      for (const q of CALIDADES) {
        const med = await evaluar(cdp, sessionId, `window.reenc(${q})`, 180);
        const dataUrl = await evaluar(cdp, sessionId, 'window.dame()', 30);
        const destino = path.join(CANDIDATOS_DIR, `${im.id}_q${Math.round(q * 100)}.jpg`);
        fs.writeFileSync(destino, Buffer.from(dataUrl.split(',')[1], 'base64'));
        const bytesDisco = fs.statSync(destino).size;
        res.imagenes[im.id].calidades['q' + Math.round(q * 100)] = {
          bytes: bytesDisco, ahorroKb: +((bytesActual - bytesDisco) / 1024).toFixed(1), ahorroPct: +((1 - bytesDisco / bytesActual) * 100).toFixed(1),
          diffPct: med.diffPct, diffMedia: med.diffMedia, diffMax: med.diffMax, candidato: destino.replace(RAIZ + path.sep, '').split(path.sep).join('/'),
        };
        console.log(`[k219img] ${im.id} ${info.ancho}x${info.alto} actual ${(bytesActual / 1048576).toFixed(2)} MB → q${Math.round(q * 100)} = ${(bytesDisco / 1048576).toFixed(3)} MB (−${res.imagenes[im.id].calidades['q' + Math.round(q * 100)].ahorroPct} %) · diff ${med.diffPct}% (media ${med.diffMedia}, max ${med.diffMax})`);
      }
    }
  } finally {
    if (chrome) try { chrome.kill(); } catch (e) { }
    mataPorPerfil();
    srv.close();
  }
  const f = path.join(EVIDENCIA_DIR, 'k219_img.json');
  fs.writeFileSync(f, JSON.stringify(res, null, 1));
  console.log('[k219img] JSON: ' + f);
})().catch(e => { console.error('[k219img] FALLO:', e.message); process.exit(1); });
