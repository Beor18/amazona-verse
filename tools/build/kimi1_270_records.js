#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-270: verificación en vivo del parche de la nube
   8-nov 07:50 UTC (9b2b3033+1d78c745+333707a7): la sección V18 «Aventuras con mi bandada» del
   panel «Mis récords» (records.js, solo lectura de <almacen>.v18). Ninguna batería saca captura
   de la sección con datos reales, así que esta sonda siembra un progreso V18 completo en el
   almacén, abre el panel REAL desde la portada (AV.records({desde:'portada'})), verifica las 7
   tarjetas (sin desborde, con h4 y aria-labelledby), captura ES, cambia a EN con G.idioma.poner
   y captura EN. GPU real, escritorio 1280×800.
   Uso: node tools/build/kimi1_270_records.js [--etiqueta r1]
   Salida: consola + docs/img/kimi270/k270_records_<etiqueta>.{json,jpg×2} */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn, execSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ETIQUETA = arg('--etiqueta', 'r1');
const ANCHO = +(arg('--ancho', '1280')), ALTO = +(arg('--alto', '800'));
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi270');
fs.mkdirSync(SALIDA, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = () => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 60) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result ? r.result.value : undefined; }
(async () => {
  const gpu = (() => { try { return execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_VideoController | Where-Object { \$_.AdapterRAM -gt 0 } | Select-Object -First 1).Name"', { timeout: 15000 }).toString().trim(); } catch (e) { return '?'; } })();
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1c270-'));
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
  // sembrar progreso V18 real (formato progreso.js v2, solo lectura aquí)
  const siembra = JSON.parse(await ev(cdp, ses, `(async () => {
    const G = window.AV.G;
    const ALM = (G.pack.meta && G.pack.meta.almacen) || G.pack.id;
    const datos = { v: 2, especies: { arausiaca: 'seleccionable' }, inv: {}, sel: 'vittata',
      otorgados: { combate_1: true, duelo_gana_vittata: true, duelo_gana_arausiaca: true },
      mundo: { minigolf_villa: { mejor: 3, medalla: 'oro' }, carrera_chispa: { mejor: -4, ganadas: 2, jugadas: 5 },
        entreno_moon: { mejor: 1, victorias: 4, jugadas: 6 }, circuito_guardian: { mejor: 78, vueltas: 3, jugadas: 4 },
        duelos_ganados: 4 },
      evo: { esp: { vittata: { xp: 470, nivel: 5 }, arausiaca: { xp: 1230, nivel: 12 } }, alianzas: { eco_protector: 'desbloqueada' } } };
    localStorage.setItem(ALM + '.v18', JSON.stringify(datos));
    return JSON.stringify({ alm: ALM, sembrado: true });
  })()`, 30));
  // abrir el panel REAL desde la portada y esperar a que la sección V18 pinte
  const abrio = JSON.parse(await ev(cdp, ses, `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    await window.AV.records({ desde: 'portada' });
    const t0 = performance.now();
    while (performance.now() - t0 < 20000) {
      const r = document.getElementById('records');
      if (r && !r.hidden && r.querySelector('#rec-v18')) break;
      await sleep(150);
    }
    const root = document.getElementById('records');
    if (!root || root.hidden) return JSON.stringify({ ok: false, error: 'panel sin abrir' });
    const sec = root.querySelector('#rec-v18');
    if (!sec) return JSON.stringify({ ok: false, error: 'sección V18 ausente' });
    await sleep(300);
    return JSON.stringify({ ok: true });
  })()`, 40));
  if (!abrio.ok) throw new Error(JSON.stringify(abrio));
  const leeSeccion = `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    await sleep(150);
    const root = document.getElementById('records');
    const sec = root.querySelector('#rec-v18');
    const tarjetas = [...sec.querySelectorAll('.rec-card')];
    const numeros = [...sec.querySelectorAll('.rec-card .rec-num')].map(e => e.textContent.trim());
    const titulos = tarjetas.map(c => (c.querySelector('h4') || {}).textContent || null);
    const desborde = tarjetas.filter(c => c.scrollWidth > c.clientWidth + 1).length;
    const chips = sec.querySelectorAll('[data-v18="duelos"] .rec-chips li').length;
    const filasNiv = sec.querySelectorAll('.rec-v18-niv li').length;
    return JSON.stringify({ idioma: document.documentElement.lang, tarjetas: tarjetas.length, titulos, numeros,
      desborde, chipsDuelos: chips, filasNiveles: filasNiv,
      aria: sec.getAttribute('aria-labelledby'), visible: !!sec.offsetParent });
  })()`;
  const es = JSON.parse(await ev(cdp, ses, `(async () => {
    const sec = document.getElementById('rec-v18');
    if (sec && sec.scrollIntoView) sec.scrollIntoView({ block: 'start' });
    await new Promise(r => setTimeout(r, 350));
    return ${leeSeccion};
  })()`, 30));
  const shotEs = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 30000);
  fs.writeFileSync(path.join(SALIDA, `k270_records_${ETIQUETA}_es.jpg`), Buffer.from(shotEs.data, 'base64'));
  // EN: cerrar, poner inglés y reabrir (el panel se monta con el idioma de ese momento)
  const en = JSON.parse(await ev(cdp, ses, `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const api = window.AV.G.recordsApi;
    if (api && api.cerrar) api.cerrar();
    await sleep(400);
    const G = window.AV.G;
    if (G.aula && G.aula.setAjuste) G.aula.setAjuste('idioma', 'en'); else G.idioma.poner('en');
    await (G.idioma.listo || Promise.resolve());
    await sleep(400);
    await window.AV.records({ desde: 'portada' });
    const t0 = performance.now();
    while (performance.now() - t0 < 20000) {
      const r = document.getElementById('records');
      if (r && !r.hidden && r.querySelector('#rec-v18')) break;
      await sleep(150);
    }
    await sleep(300);
    const sec2 = document.getElementById('rec-v18');
    if (sec2 && sec2.scrollIntoView) sec2.scrollIntoView({ block: 'start' });
    await sleep(350);
    return ${leeSeccion};
  })()`, 60));
  const shotEn = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 30000);
  fs.writeFileSync(path.join(SALIDA, `k270_records_${ETIQUETA}_en.jpg`), Buffer.from(shotEn.data, 'base64'));
  const stats = JSON.parse(await ev(cdp, ses, `new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const G = window.AV.G; const s = (()=>{try{return G.renderer.stats()}catch(e){return null}})();
    ok(JSON.stringify({ stats: s, heap: (performance.memory ? Math.round(performance.memory.usedJSHeapSize/1048576) : null) }));
  })))`, 30));
  const resultado = {
    etiqueta: ETIQUETA, gpu, head: (() => { try { return execSync('git rev-parse --short HEAD', { cwd: RAIZ }).toString().trim(); } catch (e) { return '?'; } })(),
    pantalla: `${ANCHO}x${ALTO}`, siembra, es, en,
    esperado: { tarjetas: 7, desborde: 0, chipsDuelos: 2, filasNiveles: 2 },
    render: stats, erroresConsola,
    capturas: [`k270_records_${ETIQUETA}_es.jpg`, `k270_records_${ETIQUETA}_en.jpg`],
  };
  fs.writeFileSync(path.join(SALIDA, `k270_records_${ETIQUETA}.json`), JSON.stringify(resultado, null, 1));
  console.log(JSON.stringify(resultado, null, 1));
  try { const pi = await cdp.call('SystemInfo.getProcessInfo', {}, undefined, 10000); const proc = (pi.processInfo || []).find(p => p.type === 'browser'); if (proc) { try { execSync(`taskkill /F /T /PID ${proc.id} 2>nul`, { timeout: 15000 }); } catch (e) { } } } catch (e) { }
  try { chrome.kill(); } catch (e) { }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close();
  process.exit(resultado.erroresConsola.length ? 1 : 0);
})().catch(e => { console.error('FALLO', e && e.message || e); process.exit(2); });
