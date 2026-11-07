#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-177 (palanca pendiente): RECOMPRIMIR los atlas
   diffuse HD del kit de ciudad (`tex_hd/hd_{ancient,savage}.jpg`, 9,74 MB, se descargan en el
   arranque aun en «bajo», ver KIMI-177) con canvas 2D en Chrome a distintas calidades, midiendo
   bytes ahorrados y DIFF de píxeles contra el original (re-encode sin cambio visual medible).
   Chrome con --disable-gpu (canvas por software): no roba GPU de otras sesiones de la PC.
   NO toca el juego ni los assets: los candidatos quedan en `docs/img/kimi177/stage/` y la
   decisión de aplicarlos (visto bueno de Kelvin) es aparte.
   Uso: node tools/build/kimi1_k177b.js --etiqueta r1
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ATLAS = [
  { id: 'hd_ancient', url: '/assets/models/edificios/tex_hd/hd_ancient.jpg' },
  { id: 'hd_savage', url: '/assets/models/edificios/tex_hd/hd_savage.jpg' }
];
const CALIDADES = [0.92, 0.85, 0.8];

function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ETIQUETA = arg('--etiqueta', 'r1');
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi177');
const STAGE = path.join(SALIDA, 'stage');
fs.mkdirSync(STAGE, { recursive: true });

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi1k177b-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p === '/__k177b') {
      res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
      return res.end(`<!doctype html><meta charset="utf-8"><body><script>
window.__k = {};
window.cargar = url => new Promise((res, rej) => {
  const i = new Image();
  i.onload = () => { window.__k.img = i; res({ ancho: i.naturalWidth, alto: i.naturalHeight }); };
  i.onerror = e => rej(new Error('img load ' + url));
  i.src = url;
});
window.reenc = async q => {
  const i = window.__k.img, w = i.naturalWidth, h = i.naturalHeight;
  const a = document.createElement('canvas'); a.width = w; a.height = h;
  const ca = a.getContext('2d', { willReadFrequently: true });
  ca.drawImage(i, 0, 0);
  const dataUrl = a.toDataURL('image/jpeg', q);
  const re = new Image();
  await new Promise((res, rej) => { re.onload = res; re.onerror = rej; re.src = dataUrl; });
  const b = document.createElement('canvas'); b.width = w; b.height = h;
  b.getContext('2d', { willReadFrequently: true }).drawImage(re, 0, 0);
  const da = ca.getImageData(0, 0, w, h).data, db = b.getContext('2d').getImageData(0, 0, w, h).data;
  let distintos = 0, n = 0, suma = 0, max = 0;
  const paso = 2; // muestreo 1/4 de píxeles (suficiente para el diff)
  for (let y = 0; y < h; y += paso) for (let x = 0; x < w; x += paso) {
    const o = (y * w + x) * 4; n++;
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
    if (p.endsWith('/')) p += 'index.html';
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
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function evaluar(cdp, ses, exp, timeoutS) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: true, returnByValue: true }, ses, (timeoutS || 60) * 1000);
  if (r.exceptionDetails) { const d = r.exceptionDetails; throw new Error('JS@' + (d.lineNumber != null ? d.lineNumber + ':' + d.columnNumber : '?') + ': ' + JSON.stringify(d.exception && d.exception.description || d.text).slice(0, 900)); }
  return r.result ? r.result.value : undefined;
}
async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k177b-'));
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi1k177b-*' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const res = { etiqueta: ETIQUETA, que: 'recomprimir atlas diffuse HD (KIMI-177, pendiente de decision de Kelvin)', canvas: '2D toDataURL, Chrome --disable-gpu (sin GPU real, no contamina otras sesiones)', muestreoDiff: '1 de cada 4 pixeles, umbral max-canal >4/255', atlos: {} };
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    await cdp.call('Page.enable', {}, ses);
    await cdp.call('Page.navigate', { url: `${origen}/__k177b` }, ses);
    await cdp.bombear(1);
    for (const at of ATLAS) {
      const bytes0 = fs.statSync(path.join(RAIZ, at.url.slice(1))).size;
      const info = await evaluar(cdp, ses, `cargar('${at.url}')`, 60);
      const entrada = { originalBytes: bytes0, ancho: info.ancho, alto: info.alto, porQ: {} };
      for (const q of CALIDADES) {
        const m = await evaluar(cdp, ses, `reenc(${q})`, 120);
        const dataUrl = await evaluar(cdp, ses, `dame()`, 60);
        const b64 = dataUrl.split(',')[1];
        const ruta = path.join(STAGE, `${at.id}_q${Math.round(q * 100)}.jpg`);
        fs.writeFileSync(ruta, Buffer.from(b64, 'base64'));
        entrada.porQ['q' + Math.round(q * 100)] = { bytes: m.bytes, ahorroMB: +((bytes0 - m.bytes) / 1048576).toFixed(2), ahorroPct: +(100 * (1 - m.bytes / bytes0)).toFixed(1), diffPctPixGt4: m.diffPct, diffMedia: m.diffMedia, diffMax: m.diffMax, stage: path.relative(RAIZ, ruta).replace(/\\/g, '/') };
      }
      res.atlos[at.id] = entrada;
    }
  } catch (e) { res.error = String(e && e.message || e); }
  fs.writeFileSync(path.join(SALIDA, `k177b_${ETIQUETA}.json`), JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res, null, 1));
  try { chrome.kill('SIGKILL'); } catch (e) { }
  mataPorPerfil();
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close();
  process.exit(res.error ? 1 : 0);
})();
