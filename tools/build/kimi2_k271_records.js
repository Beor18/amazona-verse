#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-271: complemento visual móvil del parche «Mis récords V18»
   8-nov 08:05 UTC (9b2b3033+1d78c745 `records.js`/`en.js`): la sección nueva «Aventuras con mi bandada»
   (#rec-v18, 7 tarjetas) validada a baterías por Kimi 1 en KIMI-270 (recordsTest 64/64, escritorio 1264 px).
   Esta sonda abre el panel REAL en un perfil móvil 390×844 dpr 3 CPU ×4 con GPU real, siembra el mismo
   juego de datos realista que recordsTest (v18Datos), y mide/captura: ES lleno · EN lleno · ES vacío
   («Aún sin…»), desbordes a 390 px, altura de botones, draw calls del mundo con el panel abierto (DOM)
   y errores de consola. El juego no se toca: sonda de solo lectura.
   Uso: node tools/build/kimi2_k271_records.js [--perfil movil|escritorio|ambos] [--etiqueta r1]
   Salida: consola + docs/img/kimi271/k271_<perfil>_<estado>.jpg + k271_records_<etiqueta>.json */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn, execSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ETIQUETA = arg('--etiqueta', 'r1');
const PERFILES = { movil: { w: 390, h: 844, dpr: 3, cpu: 4, tactil: true }, escritorio: { w: 1280, h: 800, dpr: 1, cpu: 1, tactil: false } };
const ELEGIDOS = (arg('--perfil', 'movil') === 'ambos') ? ['movil', 'escritorio'] : [arg('--perfil', 'movil')];
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi271');
fs.mkdirSync(SALIDA, { recursive: true });
// Mismo juego de datos realista que siembra recordsTest (records.js ~1168)
const V18_LLENO = { v: 2, especies: { arausiaca: 'seleccionable' }, inv: {}, otorgados: { combate_1: true, duelo_gana_vittata: true, duelo_gana_arausiaca: true }, sel: 'vittata',
  mundo: { minigolf_villa: { mejor: 3, medalla: 'oro' }, carrera_chispa: { mejor: 41300, ganadas: 2, jugadas: 5, xp: true }, entreno_moon: { mejor: 0, victorias: 1, jugadas: 4, xp: true }, circuito_guardian: { mejor: 75250, vueltas: 3, jugadas: 3, xp: true }, duelos_ganados: 4, puente_villa: 'reparado' },
  evo: { esp: { vittata: { xp: 553, nivel: 12, mejoras: {}, variante: null }, arausiaca: { xp: 1540, nivel: 21, mejoras: {}, variante: null }, agilis: { xp: 0, nivel: 1, mejoras: {}, variante: null } }, alianzas: { eco_protector: 'desbloqueada', lluvia_guiada: 'disponible' }, alianzaSel: 'eco_protector', marcas: {}, dia: { fecha: '', por: {} }, retro: true } };
const V18_VACIO = { v: 1, otorgados: { combate_1: true }, mundo: {}, especies: {}, inv: {}, sel: null };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = () => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 60) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result ? r.result.value : undefined; }
async function foto(cdp, ses, archivo) { const r = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 60000); fs.writeFileSync(archivo, Buffer.from(r.data, 'base64')); }
async function perfilRun(nombre, P, origen, gpu) {
  const erroresConsola = [];
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2u-k271' + nombre + '-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', `--window-size=${P.w},${P.h}`];
  if (P.cpu > 1) args.push(`--renderer-process-limit=1`);
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoDev) { try { chrome.kill(); } catch (e) { } throw new Error('Chrome no abrió DevTools ' + err.slice(0, 200)); }
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Runtime.consoleAPICalled' && (d.params.type === 'error' || d.params.type === 'assert')) erroresConsola.push((d.params.args || []).map(a => String(a.value != null ? a.value : a.description || '')).join(' ').slice(0, 300)); });
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
  if (P.tactil) await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
  if (P.dpr !== 1) await cdp.call('Emulation.setDeviceMetricsOverride', { width: P.w, height: P.h, deviceScaleFactor: P.dpr, mobile: true }, ses);
  if (P.cpu > 1) await cdp.call('Emulation.setCPUThrottlingRate', { rate: P.cpu }, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); } catch(e){}" }, ses);
  const t0 = Date.now();
  await cdp.call('Page.navigate', { url: `${origen}/index.html?v18=1` }, ses);
  let ok = false;
  while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!ok) throw new Error('el juego no quedó listo en ' + CFG.espera_listo_s + ' s');
  const prep = await ev(cdp, ses, CFG.preparar_js, 150);
  if (!/^ok/.test(String(prep))) throw new Error('preparar: ' + prep);
  // Siembra + apertura del panel real (API pública; CLAVE real en perfil temporal)
  const base = JSON.parse(await ev(cdp, ses, `(async () => {
    const G = window.AV.G, sleep = ms => new Promise(r => setTimeout(r, ms));
    await AV.records({ desde: 'portada' }); await sleep(300);
    const api = window.AVRecords(G); const $ = id => document.getElementById(id);
    const claveV18 = api.CLAVE.v18, abierto0 = api.abierto();
    const st0 = G.renderer.stats(); const mem0 = G.renderer.renderer.info.memory;
    return JSON.stringify({ claveV18, abierto0, callsCerrado: st0.calls, trisCerrado: st0.triangulos, geo: mem0.geometries, tex: mem0.textures });
  })()`, 60));
  const estados = [['es_lleno', V18_LLENO, 'es'], ['en_lleno', V18_LLENO, 'en'], ['es_vacio', V18_VACIO, 'es']];
  const salidas = { perfil: nombre, gpu, base, estados: {} };
  for (const [nom, datos, idioma] of estados) {
    const r = JSON.parse(await ev(cdp, ses, `(async () => {
      const G = window.AV.G, sleep = ms => new Promise(r => setTimeout(r, ms));
      const api = window.AVRecords(G); const $ = id => document.getElementById(id);
      try { localStorage.setItem(api.CLAVE.v18, ${JSON.stringify(JSON.stringify(datos))}); } catch (e) { }
      if (${idioma === 'en'} && !window.AV_EN) { await new Promise(res => { const sc = document.createElement('script'); sc.src = 'content/cap1/en.js'; sc.onload = res; sc.onerror = res; document.head.appendChild(sc); }); await sleep(200); }
      if (G.aula && G.aula.aj) G.aula.aj.idioma = '${idioma}';
      api.cerrar(); await sleep(250);
      await AV.records({ desde: 'portada' }); await sleep(400);
      const root = $('records'); const sec = $('rec-v18');
      const tarjetas = sec ? sec.querySelectorAll('.rec-card').length : -1;
      const txt = sec ? sec.textContent : '';
      const aunSin = (txt.match(/Aún sin|No [a-z]+ yet/g) || []).length;
      const grande = [...root.querySelectorAll('button')].filter(b => b.getClientRects().length && b.offsetHeight < 44).length;
      const rb = root.querySelector('.rec-box'), cuerpo = root.querySelector('.rec-body');
      const st1 = G.renderer.stats(); const t1 = performance.now(); let frames = 0;
      await new Promise(r => { const loop = () => { frames++; if (performance.now() - t1 < 2000) requestAnimationFrame(loop); else r(); }; requestAnimationFrame(loop); });
      const st2 = G.renderer.stats();
      return JSON.stringify({ abierto: api.abierto(), tarjetas, aunSin, grande, desborde: rb.scrollWidth > rb.clientWidth + 1 || cuerpo.scrollWidth > cuerpo.clientWidth + 1, scrollW: cuerpo.scrollWidth, clientW: cuerpo.clientWidth, innerW: window.innerWidth, calls1: st1.calls, calls2: st2.calls, tris: st1.triangulos, fps: Math.round(frames / 2), titulo: sec ? (sec.querySelector('h3') || {}).textContent : null });
    })()`, 90));
    salidas.estados[nom] = r;
    await ev(cdp, ses, `(() => { const s = document.getElementById('rec-v18'); if (s) s.scrollIntoView({ block: 'start' }); const c = document.querySelector('#records .rec-body'); if (c && s) c.scrollTop = Math.max(0, s.offsetTop - 12); return true; })()`, 20, false);
    await cdp.bombear(0.3);
    await foto(cdp, ses, path.join(SALIDA, `k271_${nombre}_${nom}.jpg`));
  }
  salidas.erroresConsola = erroresConsola;
  // limpieza del árbol de Chrome (taskkill /T por perfil, como el arnés)
  try { execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(AQUI, 'kimi2_mata_perfil.ps1')}" -Perfil "${perf}"`, { timeout: 30000 }); } catch (e) { try { chrome.kill(); } catch (e2) { } }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  return salidas;
}
(async () => {
  const gpu = (() => { try { return execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_VideoController | Where-Object { $_.AdapterRAM -gt 0 } | Select-Object -First 1).Name"', { timeout: 15000 }).toString().trim(); } catch (e) { return '?'; } })();
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const todo = { etiqueta: ETIQUETA, gpu, hora: new Date().toISOString(), perfiles: {} };
  for (const nombre of ELEGIDOS) { console.log(`· perfil ${nombre} …`); todo.perfiles[nombre] = await perfilRun(nombre, PERFILES[nombre], origen, gpu); console.log(`  ${nombre}: ` + JSON.stringify(todo.perfiles[nombre].estados)); }
  srv.close();
  fs.writeFileSync(path.join(SALIDA, `k271_records_${ETIQUETA}.json`), JSON.stringify(todo, null, 1));
  const mal = Object.values(todo.perfiles).flatMap(p => p.erroresConsola || []);
  console.log('· errores de consola:', mal.length ? mal : 0);
  console.log('· JSON: docs/img/kimi271/k271_records_' + ETIQUETA + '.json');
  process.exit(0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
