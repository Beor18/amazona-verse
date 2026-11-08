#!/usr/bin/env node
/* Amazona Verse · Kimi 2 — KIMI-321: re-computa las stats QA-109 (misma fórmula que
   kimi2_qa109.js: luma media, % pálidos luma>180, % agua, % teal sobre 96×54) a partir
   de los JPG ya capturados en docs/img/kimi321 (la corrida original perdió el stdout
   por un tail). Chrome headless SIN GPU (--disable-gpu): no contamina mediciones FPS
   de otros carriles. Uso: node tools/build/kimi2_k321_stats.js */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const DIR = arg('--dir', path.join(RAIZ, 'docs', 'img', 'kimi321'));
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }

const TOMAS = fs.readdirSync(DIR).filter(f => /^qa109_.*\.jpg$/.test(f)).sort();
if (!TOMAS.length) { console.error('sin JPG en ' + DIR); process.exit(1); }

// limpieza de perfiles temporales míos de corridas cortadas (zombis Chrome 156)
for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi2s-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 1800e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

// Chrome 156: chrome.kill() no alcanza los hijos y el padre puede morir antes — matar por nombre de perfil
function mataArbol(perfil) { try { require('child_process').execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(AQUI, 'kimi2_mata_perfil.ps1')}" ${perfil}`, { stdio: 'ignore' }); } catch (e) { } }

const HTML = `<!doctype html><meta charset=utf8><body><script>
(async () => {
  const out = {};
  for (const f of ${JSON.stringify(TOMAS)}) {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('img ' + f)); img.src = '/img/' + f; });
    const cv = document.createElement('canvas'); cv.width = 96; cv.height = 54;
    const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, 96, 54);
    const d = cx.getImageData(0, 0, 96, 54).data;
    let pale = 0, teal = 0, sum = 0, aguaN = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2], l = 0.299 * r + 0.587 * g + 0.114 * b;
      sum += l; if (l > 180) pale++;
      if (b > 90 && b >= r + 12 && g >= r) { aguaN++; if (g > 140 && b > 140 && l > 150) teal++; }
    }
    const n = d.length / 4;
    out[f.replace(/^qa109_/, '').replace(/\.jpg$/, '')] = { luma: Math.round(sum / n), palePc: Math.round(pale / n * 100), aguaPc: Math.round(aguaN / n * 100), tealPc: Math.round(teal / Math.max(1, aguaN) * 100) };
  }
  window.__R = JSON.stringify(out);
})().catch(e => { window.__R = 'ERROR ' + e.message; });
</script></body>`;

function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p === '/' || p === '/index.html') { res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' }); return res.end(HTML); }
    const m = p.match(/^\/img\/(.+)$/);
    if (m) {
      const f = path.join(DIR, m[1]);
      if (!f.startsWith(DIR) || req.method !== 'GET' || !fs.existsSync(f)) { res.writeHead(404); return res.end('404'); }
      return res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' }), res.end(fs.readFileSync(f));
    }
    res.writeHead(404); res.end('404');
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}

(async () => {
  const { srv, puerto } = await servir();
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2s-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--mute-audio', '--window-size=320,200'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  chrome.on('error', e => { console.error('SPAWN ERROR: ' + e.message); process.exit(1); });
  const pf = path.join(perf, 'DevToolsActivePort');
  let puertoDev = 0, wsPath = '';
  for (let i = 0; i < 150; i++) {
    if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } }
    await new Promise(r => setTimeout(r, 200));
  }
  if (!puertoDev) { mataArbol(path.basename(perf)); srv.close(); console.error('Chrome no abrió: ' + err.slice(0, 300)); process.exit(1); }
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  await new Promise(r => { ws.onopen = r; });
  let id = 0; const pend = new Map();
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  const call = (method, params, sessionId) => { const i = ++id; ws.send(JSON.stringify({ id: i, method, params: params || {}, sessionId })); return new Promise(r => pend.set(i, r)); };
  const tid = (await call('Target.createTarget', { url: 'about:blank' })).result.targetId;
  const ses = (await call('Target.attachToTarget', { targetId: tid, flatten: true })).result.sessionId;
  await call('Page.enable', {}, ses);
  const nav = await call('Page.navigate', { url: `http://127.0.0.1:${puerto}/` }, ses);
  const val = r => (r && r.result && r.result.result) ? r.result.result.value : undefined;
  let txt = '';
  for (let i = 0; i < 20; i++) {
    const r = await call('Runtime.evaluate', { expression: 'window.__R || ""', returnByValue: true }, ses);
    txt = val(r) || '';
    if (txt) break;
    await new Promise(r2 => setTimeout(r2, 400));
  }
  console.log(txt);
  const salida = path.join(DIR, 'qa109_k321_stats.json');
  if (txt.startsWith('{')) { fs.writeFileSync(salida, JSON.stringify(JSON.parse(txt), null, 1)); console.log('JSON -> ' + salida); }
  mataArbol(path.basename(perf));
  srv.close();
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  process.exit(0);
})().catch(e => { console.error('ERROR ' + e.message); process.exit(1); });
