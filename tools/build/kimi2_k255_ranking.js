#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-255: verificación en vivo del parche de la nube
   8-nov 06:00 UTC (f71480f8): los chips Apodo/Iniciales del Ranking de la clase (:root.a11y-contraste
   .rc-tipo .chip) se leen en alto contraste (21:1). Ninguna batería cubre esas 2 líneas CSS,
   así que esta sonda abre el Modo Maestro REAL (G.aula.abrirMaestro), entra a la pestaña
   «Ranking de la clase», lee getComputedStyle de .rc-tipo .chip (normal y [aria-pressed="true"])
   con y sin la clase a11y-contraste (la pinta accesibilidad.js en <html>), calcula las
   relaciones de contraste y captura las dos vistas. GPU real, escritorio 1280×800.
   Uso: node tools/build/kimi2_k255_ranking.js [--etiqueta r1]
   Salida: consola + docs/img/kimi255/k255_ranking_<etiqueta>.{json,jpg×2} */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn, execSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ETIQUETA = arg('--etiqueta', 'r1');
const ANCHO = +(arg('--ancho', '1280')), ALTO = +(arg('--alto', '800'));
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi255');
fs.mkdirSync(SALIDA, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = () => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 60) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result ? r.result.value : undefined; }
function luminancia(rgb) { const c = rgb.match(/\d+(\.\d+)?/g); if (!c || c.length < 3) return null; const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; const [r, g, b] = c.map(Number); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); }
function relacion(frente, fondo) { const l1 = luminancia(frente), l2 = luminancia(fondo); if (l1 == null || l2 == null) return null; const [a, b] = l1 >= l2 ? [l1, l2] : [l2, l1]; return +(((a + 0.05) / (b + 0.05)).toFixed(2)); }
(async () => {
  const gpu = (() => { try { return execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_VideoController | Where-Object { \$_.AdapterRAM -gt 0 } | Select-Object -First 1).Name"', { timeout: 15000 }).toString().trim(); } catch (e) { return '?'; } })();
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2u-k255-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', `--window-size=${ANCHO},${ALTO}`], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoDev) { try { chrome.kill(); } catch (e) { } throw new Error('Chrome no abrió DevTools ' + err.slice(0, 200)); }
  const erroresConsola = [];
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Runtime.consoleAPICalled' && (d.params.type === 'error' || d.params.type === 'assert')) erroresConsola.push((d.params.args || []).map(a => String(a.value != null ? a.value : a.description || '')).join(' ').slice(0, 300)); });
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); } catch(e){}" }, ses);
  const t0 = Date.now();
  await cdp.call('Page.navigate', { url: `${origen}/index.html` }, ses);
  let ok = false;
  while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!ok) throw new Error('el juego no expuso window.AV en ' + CFG.espera_listo_s + ' s');
  await ev(cdp, ses, CFG.preparar_js, 150);
  // abrir Modo Maestro y entrar a la pestaña Ranking de la clase
  const abrio = JSON.parse(await ev(cdp, ses, `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const G = window.AV.G, $ = id => document.getElementById(id);
    G.aula.abrirMaestro();
    const t0 = performance.now();
    while (performance.now() - t0 < 15000) { if ($('m-tab-ranking')) break; await sleep(150); }
    if (!$('m-tab-ranking')) return JSON.stringify({ ok: false, error: 'sin pestaña ranking tras 15 s' });
    $('m-tab-ranking').click();
    await sleep(400);
    return JSON.stringify({ ok: true });
  })()`, 40));
  if (!abrio.ok) throw new Error(JSON.stringify(abrio));
  // vista base (sin contraste): computed styles + captura
  const base = JSON.parse(await ev(cdp, ses, `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const lee = () => {
      const normal = document.querySelector('.rc-tipo .chip:not([aria-pressed="true"])');
      const pressed = document.querySelector('.rc-tipo .chip[aria-pressed="true"]');
      const cs = el => { if (!el) return null; const c = getComputedStyle(el); return { bg: c.backgroundColor, color: c.color, border: c.borderColor }; };
      return { normal: cs(normal), pressed: cs(pressed), htmlContraste: document.documentElement.classList.contains('a11y-contraste') };
    };
    await sleep(100);
    return JSON.stringify(lee());
  })()`, 30));
  const shotBase = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 30000);
  fs.writeFileSync(path.join(SALIDA, `k255_ranking_${ETIQUETA}_base.jpg`), Buffer.from(shotBase.data, 'base64'));
  // activar alto contraste (la clase la pinta accesibilidad.js en <html>; aquí se añade directo,
  // es el mismo mecanismo) y releer + captura
  const alto = JSON.parse(await ev(cdp, ses, `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const lee = () => {
      const normal = document.querySelector('.rc-tipo .chip:not([aria-pressed="true"])');
      const pressed = document.querySelector('.rc-tipo .chip[aria-pressed="true"]');
      const cs = el => { if (!el) return null; const c = getComputedStyle(el); return { bg: c.backgroundColor, color: c.color, border: c.borderColor }; };
      return { normal: cs(normal), pressed: cs(pressed), htmlContraste: document.documentElement.classList.contains('a11y-contraste') };
    };
    document.documentElement.classList.add('a11y-contraste');
    await sleep(200);
    return JSON.stringify(lee());
  })()`, 30));
  const shotAlto = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 30000);
  fs.writeFileSync(path.join(SALIDA, `k255_ranking_${ETIQUETA}_contraste.jpg`), Buffer.from(shotAlto.data, 'base64'));
  const stats = JSON.parse(await ev(cdp, ses, `new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const G = window.AV.G; const s = (()=>{try{return G.renderer.stats()}catch(e){return null}})(); const info=(()=>{try{return G.renderer.renderer.info.memory}catch(e){return null}})();
    ok(JSON.stringify({ stats: s, memoria: info, heap: (performance.memory ? Math.round(performance.memory.usedJSHeapSize/1048576) : null) }));
  })))`, 30));
  const resultado = {
    etiqueta: ETIQUETA, gpu, head: (() => { try { return execSync('git rev-parse --short HEAD', { cwd: RAIZ }).toString().trim(); } catch (e) { return '?'; } })(),
    pantalla: `${ANCHO}x${ALTO}`, base, alto,
    contraste: {
      baseNormal: base.normal && base.normal.color && base.normal.bg ? relacion(base.normal.color, base.normal.bg) : null,
      basePressed: base.pressed && base.pressed.color && base.pressed.bg ? relacion(base.pressed.color, base.pressed.bg) : null,
      altoNormal: alto.normal && alto.normal.color && alto.normal.bg ? relacion(alto.normal.color, alto.normal.bg) : null,
      altoPressed: alto.pressed && alto.pressed.color && alto.pressed.bg ? relacion(alto.pressed.color, alto.pressed.bg) : null,
    },
    esperado: { altoNormal: '21.00 (texto #fff sobre fondo #000)', altoPressed: '21.00 (texto #000 sobre fondo #fff)' },
    render: stats, erroresConsola, capturas: [`k255_ranking_${ETIQUETA}_base.jpg`, `k255_ranking_${ETIQUETA}_contraste.jpg`],
  };
  fs.writeFileSync(path.join(SALIDA, `k255_ranking_${ETIQUETA}.json`), JSON.stringify(resultado, null, 1));
  console.log(JSON.stringify(resultado, null, 1));
  // limpieza del árbol de Chrome (Chrome 156: chrome.kill() no alcanza al navegador detached)
  try { const pi = await cdp.call('SystemInfo.getProcessInfo', {}, undefined, 10000); const proc = (pi.processInfo || []).find(p => p.type === 'browser'); if (proc) { try { execSync(`taskkill /F /T /PID ${proc.id} 2>nul`, { timeout: 15000 }); } catch (e) { } } } catch (e) { }
  try { chrome.kill(); } catch (e) { }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close();
  process.exit(resultado.erroresConsola.length ? 1 : 0);
})().catch(e => { console.error('FALLO', e && e.message || e); process.exit(2); });
