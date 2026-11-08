#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-275: verificación funcional con GPU real del
   parche f307d71a (+1e8b0eab) «humo iPhone» (QA-214/215/212), ya validado a baterías:
   - QA-215: en Álbum (34 fichas) y Mis cotorras («Por conseguir» abierto) abiertos desde el
     menú, la fila «Cerrar»/«Listo» queda pegada abajo (position: sticky) y visible SIN scroll.
   - QA-214: en Amazona Flight la capa de toque tapaba el botón de Pausa (#sys) y la pausa
     escondía «Cambiar de juego» (#b-menu-modos).
   Perfil iPhone 390×844 dpr 3 CPU ×4 táctil, GPU real. El juego no se toca: sonda de solo
   lectura (clics en botones reales del DOM, igual que un jugador).
   Uso: node tools/build/kimi2_k275_humo.js
   Salida: consola + docs/img/kimi275/k275_humo_*.jpg + k275_humo.json */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn, execSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi275');
fs.mkdirSync(SALIDA, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end('403'); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = () => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result ? r.result.value : undefined; }
async function foto(cdp, ses, archivo) { const r = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 60000); fs.writeFileSync(archivo, Buffer.from(r.data, 'base64')); }
(async () => {
  const gpu = (() => { try { return execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_VideoController | Where-Object { $_.AdapterRAM -gt 0 } | Select-Object -First 1).Name"', { timeout: 15000 }).toString().trim(); } catch (e) { return '?'; } })();
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2k275-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--window-size=390,844', '--renderer-process-limit=1'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoDev) throw new Error('sin DevTools');
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  const erroresConsola = [];
  ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Runtime.consoleAPICalled' && (d.params.type === 'error' || d.params.type === 'assert')) erroresConsola.push((d.params.args || []).map(a => String(a.value != null ? a.value : a.description || '')).join(' ').slice(0, 300)); });
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }, ses);
  await cdp.call('Emulation.setCPUThrottlingRate', { rate: 4 }, ses);
  // Semilla: jugador existente (sin creador) para ir directo al mundo y poder abrir el menú
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: `try {
    localStorage.clear(); sessionStorage.clear();
    localStorage.setItem('amazonaverse.save', JSON.stringify({
      v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi2k275-' + Math.random().toString(36).slice(2, 10),
      profile: { created: true, name: 'Brisa del Valle', look: null },
      pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
      inv: {}, collected: [], complete: false, explorando: false, clock: 0,
      events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
      comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
      evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
    }));
  } catch (e) {}` }, ses);
  const t0 = Date.now(); let ok = false;
  await cdp.call('Page.navigate', { url: `${origen}/index.html?v18=1` }, ses);
  while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!ok) throw new Error('el juego no arrancó');
  // Semilla con partida existente: la portada da directo al mundo; solo saltar la intro si sigue
  const prep = await ev(cdp, ses, `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const sx = document.getElementById('c1-saltar');
    if (sx) { sx.click(); await sleep(1500); }
    const t = document.getElementById('title');
    return 'ok: en el mundo (portada ' + (t && t.open ? 'abierta' : 'cerrada') + ')';
  })()`, 60);
  if (!/^ok/.test(String(prep))) throw new Error('preparar: ' + prep);
  console.log('· preparar:', prep);
  const R = { gpu, hora: new Date().toISOString(), innerW: 390, innerH: 844, checks: {} };

  // — QA-215a: Álbum desde el menú — la fila «Cerrar» visible sin scroll (sticky) —
  R.checks.album = JSON.parse(await ev(cdp, ses, `(async () => {
    const G = window.AV.G, sleep = ms => new Promise(r => setTimeout(r, ms));
    await G.menuModos.elegir('album'); await sleep(500);
    const okBtn = document.getElementById('mm-album-ok');
    if (!okBtn) return JSON.stringify({ ok: false, det: 'no abrió el Álbum' });
    const fila = okBtn.closest('.row'), r = fila.getBoundingClientRect();
    const card = document.getElementById('card');
    const pegado = getComputedStyle(fila).position === 'sticky';
    const visible = r.bottom <= window.innerHeight + 1 && r.top >= 0;
    return JSON.stringify({ ok: pegado && visible, pegado, visible, rect: { top: Math.round(r.top), bottom: Math.round(r.bottom) }, innerH: window.innerHeight, fichas: card.querySelectorAll('.album36 li').length, scrollable: card.scrollHeight > card.clientHeight + 50 });
  })()`, 40));
  await foto(cdp, ses, path.join(SALIDA, 'k275_humo_album.jpg'));
  await ev(cdp, ses, `(() => { const b = document.getElementById('mm-album-ok'); if (b) b.click(); return true; })()`, 10, false);
  await cdp.bombear(0.4);

  // — QA-215b: Mis cotorras desde el menú — «Por conseguir» abierto y «Listo» visible —
  R.checks.cotorras = JSON.parse(await ev(cdp, ses, `(async () => {
    const G = window.AV.G, sleep = ms => new Promise(r => setTimeout(r, ms));
    await G.menuModos.elegir('cotorras'); await sleep(500);
    const okBtn = document.getElementById('v18-elegir-ok');
    if (!okBtn) return JSON.stringify({ ok: false, det: 'no abrió Mis cotorras (sin #v18-elegir-ok)' });
    // abrir «Por conseguir (33)» si hay summary
    const sum = [...document.querySelectorAll('#card summary')].find(s => /conseguir/.test(s.textContent));
    if (sum && !sum.parentElement.open) { sum.click(); await sleep(300); }
    const fila = okBtn.closest('.row'), r = fila.getBoundingClientRect();
    const pegado = getComputedStyle(fila).position === 'sticky';
    const visible = r.bottom <= window.innerHeight + 1 && r.top >= 0;
    return JSON.stringify({ ok: pegado && visible, pegado, visible, porConseguir: !!sum, rect: { top: Math.round(r.top), bottom: Math.round(r.bottom) }, innerH: window.innerHeight });
  })()`, 40));
  await foto(cdp, ses, path.join(SALIDA, 'k275_humo_cotorras.jpg'));
  await ev(cdp, ses, `(() => { const b = document.getElementById('v18-elegir-ok'); if (b) b.click(); return true; })()`, 10, false);
  await cdp.bombear(0.4);

  // — QA-214: en Flight, la Pausa queda sobre la capa de toque y trae «Cambiar de juego» —
  R.checks.flight = JSON.parse(await ev(cdp, ses, `(async () => {
    const G = window.AV.G, sleep = ms => new Promise(r => setTimeout(r, ms));
    await G.menuModos.elegir('flight'); await sleep(9000); // dejar que el mini arranque
    const activo = !!(G.flightApi && G.flightApi._dev && G.flightApi._dev.st.activo);
    const bMenu = document.getElementById('b-menu');
    if (!bMenu) return JSON.stringify({ ok: false, det: 'sin botón de pausa', activo });
    bMenu.click(); await sleep(500);
    const pause = document.getElementById('pause');
    const abierta = pause && pause.matches(':popover-open');
    const bm = document.getElementById('b-menu-modos');
    const bmVisible = bm && getComputedStyle(bm).display !== 'none' && bm.getClientRects().length > 0;
    // ¿el botón de pausa responde por encima de la capa de toque? elementFromPoint en su centro
    const rb = bMenu.getBoundingClientRect();
    const centro = rb.width ? document.elementFromPoint(rb.left + rb.width / 2, rb.top + rb.height / 2) : null;
    const libre = !!(centro && (centro === bMenu || bMenu.contains(centro) || centro.closest('#sys')));
    const zSys = getComputedStyle(document.getElementById('sys')).zIndex;
    return JSON.stringify({ ok: !!(activo && abierta && bmVisible && libre), activo, abierta, bmVisible, botonLibre: libre, zSys, apunta: centro ? (centro.id || centro.className || centro.tagName) : null });
  })()`, 60));
  await foto(cdp, ses, path.join(SALIDA, 'k275_humo_flight.jpg'));

  R.erroresConsola = erroresConsola;
  fs.writeFileSync(path.join(SALIDA, 'k275_humo.json'), JSON.stringify(R, null, 1));
  console.log(JSON.stringify(R, null, 1));
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  try { chrome.kill(); } catch (e) { }
  await new Promise(r => setTimeout(r, 1200));
  try { console.log('· ' + execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(AQUI, 'kimi2_mata_perfil.ps1')}" ${path.basename(perf)}`, { timeout: 30000 }).toString().trim()); } catch (e) { }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
