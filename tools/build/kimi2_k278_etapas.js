#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-278: sonda visual del parche «duelos por etapa»
   8-nov 09:35 UTC (13c26272 combate.js/records.js/progreso.js + c8eba666 evolucion.js test):
   los récords nuevos enseñan «Por etapa:» (ES) / «By stage:» (EN) en la tarjeta de duelos con
   mundo.duelos_ganados_e0..e3 (solo las etapas con victorias), y las partidas viejas sin esos
   campos enseñan «Aún sin duelos por etapa» / «No duels by stage yet». La lógica la cubren
   recordsTest/v18CombateTest/v18Test (nube, VM); esta sonda lo mide en el panel REAL con GPU real
   (iPhone 390×844 dpr 3 CPU ×4): 3 estados (lleno con etapas ES/EN · partida vieja v1 sin e*),
   filas .rec-etapas, textos ES/EN, desborde, draw calls del mundo y errores de consola.
   El juego no se toca: sonda de solo lectura.
   Uso: node tools/build/kimi2_k278_etapas.js [--etiqueta r1]
   Salida: consola + docs/img/kimi278/k278_<estado>.jpg + k278_etapas_<etiqueta>.json */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn, execSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ETIQUETA = arg('--etiqueta', 'r1');
const P = { w: 390, h: 844, dpr: 3, cpu: 4, tactil: true };
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi278');
fs.mkdirSync(SALIDA, { recursive: true });
// Mismo juego de datos que recordsTest (13c26272): e0=Aprendiz 3 · e2=Guardián 1 (e1/e3 ausentes)
const V18_ETAPAS = { v: 2, especies: { arausiaca: 'seleccionable' }, inv: {}, otorgados: { combate_1: true, duelo_gana_vittata: true, duelo_gana_arausiaca: true }, sel: 'vittata',
  mundo: { minigolf_villa: { mejor: 3, medalla: 'oro' }, carrera_chispa: { mejor: 41300, ganadas: 2, jugadas: 5, xp: true }, entreno_moon: { mejor: 0, victorias: 1, jugadas: 4, xp: true }, circuito_guardian: { mejor: 75250, vueltas: 3, jugadas: 3, xp: true }, duelos_ganados: 4, duelos_ganados_e0: 3, duelos_ganados_e2: 1, puente_villa: 'reparado' },
  evo: { esp: { vittata: { xp: 553, nivel: 12, mejoras: {}, variante: null }, arausiaca: { xp: 1540, nivel: 21, mejoras: {}, variante: null }, agilis: { xp: 0, nivel: 1, mejoras: {}, variante: null } }, alianzas: { eco_protector: 'desbloqueada', lluvia_guiada: 'disponible' }, alianzaSel: 'eco_protector', marcas: {}, dia: { fecha: '', por: {} }, retro: true } };
const V18_VIEJA = { v: 1, otorgados: { combate_1: true }, mundo: {}, especies: {}, inv: {}, sel: null };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = () => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 60) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result ? r.result.value : undefined; }
async function foto(cdp, ses, archivo) { const r = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 60000); fs.writeFileSync(archivo, Buffer.from(r.data, 'base64')); }
(async () => {
  const gpu = (() => { try { return execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_VideoController | Where-Object { $_.AdapterRAM -gt 0 } | Select-Object -First 1).Name"', { timeout: 15000 }).toString().trim(); } catch (e) { return '?'; } })();
  const erroresConsola = [];
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2u-k278-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', `--window-size=${P.w},${P.h}`, '--renderer-process-limit=1'];
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
  await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: P.w, height: P.h, deviceScaleFactor: P.dpr, mobile: true }, ses);
  await cdp.call('Emulation.setCPUThrottlingRate', { rate: P.cpu }, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); } catch(e){}" }, ses);
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const t0 = Date.now();
  await cdp.call('Page.navigate', { url: `${origen}/index.html?v18=1` }, ses);
  let ok = false;
  while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!ok) { srv.close(); throw new Error('el juego no quedó listo en ' + CFG.espera_listo_s + ' s'); }
  const prep = await ev(cdp, ses, CFG.preparar_js, 150);
  if (!/^ok/.test(String(prep))) { srv.close(); throw new Error('preparar: ' + prep); }
  const estados = [['es_etapas', V18_ETAPAS, 'es'], ['en_etapas', V18_ETAPAS, 'en'], ['es_vieja', V18_VIEJA, 'es']];
  const salidas = { etiqueta: ETIQUETA, gpu, hora: new Date().toISOString(), estados: {} };
  // La API del panel es lazy (boot.js cargarRecords): abrir una vez y esperar a que el módulo quede registrado
  const base = JSON.parse(await ev(cdp, ses, `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    let toast = null;
    for (let i = 0; i < 4 && typeof window.AVRecords !== 'function'; i++) {
      try { await AV.records({ desde: 'portada' }); } catch (e) { toast = String(e); }
      await sleep(600);
      const t = document.getElementById('toast'); if (t && t.textContent) toast = t.textContent;
    }
    const net = (performance.getEntriesByType('resource') || []).filter(r => /records\\.js/.test(r.name)).map(r => r.name + ' st=' + (r.responseStatus || '?'));
    return JSON.stringify({ tipo: typeof window.AVRecords, toast, net });
  })()`, 60));
  salidas.base = base;
  if (base.tipo !== 'function') throw new Error('AVRecords no quedó registrado: ' + JSON.stringify(base));
  for (const [nom, datos, idioma] of estados) {
    const r = JSON.parse(await ev(cdp, ses, `(async () => {
      const G = window.AV.G, sleep = ms => new Promise(r => setTimeout(r, ms));
      const api = window.AVRecords(G); const $ = id => document.getElementById(id);
      try { localStorage.setItem(api.CLAVE.v18, ${JSON.stringify(JSON.stringify(datos))}); } catch (e) { }
      if (${idioma === 'en'} && !window.AV_EN) { await new Promise(res => { const sc = document.createElement('script'); sc.src = 'content/cap1/en.js'; sc.onload = res; sc.onerror = res; document.head.appendChild(sc); }); await sleep(200); }
      if (G.aula && G.aula.aj) G.aula.aj.idioma = '${idioma}';
      api.cerrar(); await sleep(250);
      await AV.records({ desde: 'portada' }); await sleep(400);
      const tarjeta = $('rec-v18').querySelector('[data-v18="duelos"]');
      const filasEt = tarjeta ? [...tarjeta.querySelectorAll('.rec-etapas > div')].map(d => d.textContent.replace(/\\s+/g, ' ').trim()) : [];
      const txt = tarjeta ? tarjeta.textContent.replace(/\\s+/g, ' ') : '';
      const numero = tarjeta ? (tarjeta.querySelector('.rec-num') || {}).textContent : null;
      const grande = [...$('records').querySelectorAll('button')].filter(b => b.getClientRects().length && b.offsetHeight < 44).length;
      const rb = document.querySelector('#records .rec-box'), cuerpo = document.querySelector('#records .rec-body');
      const st1 = G.renderer.stats(); const t1 = performance.now(); let frames = 0;
      await new Promise(r => { const loop = () => { frames++; if (performance.now() - t1 < 2000) requestAnimationFrame(loop); else r(); }; requestAnimationFrame(loop); });
      const st2 = G.renderer.stats();
      return JSON.stringify({ porEtapa: /Por etapa:|By stage:/.test(txt), filasEt, numero, aunSinEtapa: /Aún sin duelos por etapa|No duels by stage yet/.test(txt), grande, desborde: rb.scrollWidth > rb.clientWidth + 1 || cuerpo.scrollWidth > cuerpo.clientWidth + 1, calls1: st1.calls, calls2: st2.calls, tris: st1.triangulos, fps: Math.round(frames / 2), duelosTxt: txt.slice(0, 220) });
    })()`, 90));
    salidas.estados[nom] = r;
    await ev(cdp, ses, `(() => { const t = document.querySelector('#rec-v18 [data-v18="duelos"]'); if (t) { t.scrollIntoView({ block: 'start' }); const c = document.querySelector('#records .rec-body'); if (c) c.scrollTop = Math.max(0, t.offsetTop - 12); } return true; })()`, 20, false);
    await cdp.bombear(0.3);
    await foto(cdp, ses, path.join(SALIDA, `k278_${nom}.jpg`));
  }
  salidas.erroresConsola = erroresConsola;
  srv.close();
  try { execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(AQUI, 'kimi2_mata_perfil.ps1')}" -Perfil "${perf}"`, { timeout: 30000 }); } catch (e) { try { chrome.kill(); } catch (e2) { } }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  fs.writeFileSync(path.join(SALIDA, `k278_etapas_${ETIQUETA}.json`), JSON.stringify(salidas, null, 1));
  console.log(JSON.stringify(salidas.estados, null, 1));
  console.log('· errores de consola:', erroresConsola.length ? erroresConsola : 0);
  console.log('· JSON: docs/img/kimi278/k278_etapas_' + ETIQUETA + '.json');
  process.exit(0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
