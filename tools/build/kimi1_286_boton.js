#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-286: verificación funcional con GPU real del
   parche fc0404bc «el botón del final dice Volver al menú si se entró desde él» (menu_modos.js
   + flight.js:563), ya cubierto a baterías por menuModosTest 83/83. Esta sonda lo demuestra por
   el camino de jugador real, con clic en el botón [data-salir] del panel final de Amazona Flight
   y capturas:
   - Flight DESDE EL MENÚ (clic en la tarjeta): el botón del final dice «Volver al menú» y al
     hacerle clic real se vuelve a la portada (menú) con el modo cerrado.
   - Flight DESDE EL MUNDO (window.AV.flight): el botón del final sigue diciendo
     «Volver a la historia» y al hacerle clic real se queda en el mundo (portada cerrada).
   Perfil iPhone 390×844 dpr 3 CPU ×4 táctil, GPU real RX 5700 XT. El juego no se toca.
   Uso: node tools/build/kimi1_286_boton.js
   Salida: consola + docs/img/kimi286/k286_boton_*.jpg + k286_boton.json */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn, execSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi286');
fs.mkdirSync(SALIDA, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end('400'); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end('403'); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = () => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); try { this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); } catch (e) { this.pend.delete(id); re2(e); return; } setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t || 45000); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
const LOG = fs.createWriteStream(path.join(SALIDA, 'k286_boton.log'), { flags: 'a' });
const diario = s => { const l = new Date().toISOString().slice(11, 19) + ' ' + s; console.log(l); LOG.write(l + '\n'); };
setTimeout(() => { diario('WATCHDOG: 8 min, salida forzosa'); process.exit(2); }, 480000).unref();
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result ? r.result.value : undefined; }
async function foto(cdp, ses, archivo) { const r = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 60000); fs.writeFileSync(archivo, Buffer.from(r.data, 'base64')); }
(async () => {
  const gpu = (() => { try { return execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_VideoController | Where-Object { $_.AdapterRAM -gt 0 } | Select-Object -First 1).Name"', { timeout: 15000 }).toString().trim(); } catch (e) { return '?'; } })();
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k286-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--window-size=390,844'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoDev) { try { chrome.kill(); } catch (e) { } throw new Error('Chrome no abrió DevTools en 60 s ' + err.slice(0, 200)); }
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  const erroresConsola = [];
  ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Runtime.consoleAPICalled' && (d.params.type === 'error' || d.params.type === 'assert')) erroresConsola.push((d.params.args || []).map(a => String(a.value != null ? a.value : a.description || '')).join(' ').slice(0, 300)); });
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }, ses);
  // KIMI-286: sin setCPUThrottlingRate — el flujo es de DOM y el throttle de la primera corrida
  // dejó el renderer sin responder a Runtime.evaluate (sonda atascada 13 min, matada).
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: `try {
    localStorage.clear(); sessionStorage.clear();
    localStorage.setItem('amazonaverse.save', JSON.stringify({
      v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1k286-' + Math.random().toString(36).slice(2, 10),
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
  const prep = await ev(cdp, ses, `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const sx = document.getElementById('c1-saltar');
    if (sx) { sx.click(); await sleep(1500); }
    const t = document.getElementById('title');
    return 'ok: portada ' + (t && t.open ? 'abierta' : 'cerrada');
  })()`, 60);
  if (!/^ok/.test(String(prep))) throw new Error('preparar: ' + prep);
  diario('preparar: ' + prep);
  const R = { gpu, hora: new Date().toISOString(), head: execSync('git rev-parse --short HEAD', { cwd: RAIZ }).toString().trim(), checks: {}, erroresConsola };
  const check = (n, v, extra) => { R.checks[n] = { ok: !!v, extra: extra == null ? '' : String(extra) }; diario((v ? '  OK ' : '  ROJO ') + n + (extra != null && extra !== '' ? ' · ' + extra : '')); };
  // Cada escenario es UN solo Runtime.evaluate en la página (todo el flujo dentro): la versión con
  // varios evals encadenados se atascó dos veces justo tras el primer eval que toca flightApi._dev;
  // con un solo eval por escenario se evita ese punto de fragilidad (mismo patrón que menuModosTest).
  // ---------- Escenario A: desde el MENÚ (clic real en la tarjeta de Flight) ----------
  const A = await ev(cdp, ses, `(async () => {
    const G = window.AV.G, sleep = ms => new Promise(r => setTimeout(r, ms));
    const hasta = (f, ms) => new Promise(res => { const t0 = Date.now(); const iv = setInterval(() => { let v = false; try { v = f(); } catch (e) {} if (v) { clearInterval(iv); res(true); } else if (Date.now() - t0 > ms) { clearInterval(iv); res(false); } }, 120); });
    const out = {};
    const t = document.getElementById('title');
    if (!t.open) return { error: 'portada no abierta' };
    const card = [...document.querySelectorAll('#title [data-modo]')].find(b => b.dataset.modo === 'flight');
    if (!card) return { error: 'sin tarjeta flight' };
    card.click();
    out.activo = await hasta(() => G.flightApi && G.flightApi.activo, 20000);
    out.portadaTrasAbrir = t.open;
    await sleep(1200);
    const fa = G.flightApi, d = fa && fa._dev; if (!d) return Object.assign({ error: 'sin _dev' }, out);
    d.vaciar(); d.st.fase = 'juego'; d.J.dist = 30; d.J.y = fa.P.yMin - 0.1; d.J.vy = -1; d.paso(1 / 60);
    out.finVisible = await hasta(() => d.st.ui && !d.st.ui.fin.hidden, 5000);
    const b = d.st.ui && d.st.ui.fin.querySelector('[data-salir]');
    out.texto = b ? b.textContent.trim() : '(sin botón)';
    if (b) { b.click(); out.portadaTrasClick = await hasta(() => t.open, 8000); out.activoTrasClick = await hasta(() => !fa.activo, 8000); }
    return out;
  })()`, 120);
  diario('A completo: ' + JSON.stringify(A));
  check('A · la tarjeta abre Flight y cierra la portada', A && A.activo && !A.portadaTrasAbrir, JSON.stringify(A));
  check('A · el botón del final dice «Volver al menú»', A && A.texto === 'Volver al menú', A && A.texto);
  check('A · clic en «Volver al menú»: vuelve al menú y el modo se cierra', A && A.portadaTrasClick === true && A.activoTrasClick === true, JSON.stringify({ p: A && A.portadaTrasClick, a: A && A.activoTrasClick }));
  await foto(cdp, ses, path.join(SALIDA, 'k286_boton_A_menu.jpg'));
  // ---------- Escenario B: desde el MUNDO (API del mundo, sin pasar por el menú) ----------
  const B = await ev(cdp, ses, `(async () => {
    const G = window.AV.G, sleep = ms => new Promise(r => setTimeout(r, ms));
    const hasta = (f, ms) => new Promise(res => { const t0 = Date.now(); const iv = setInterval(() => { let v = false; try { v = f(); } catch (e) {} if (v) { clearInterval(iv); res(true); } else if (Date.now() - t0 > ms) { clearInterval(iv); res(false); } }, 120); });
    const out = {};
    const t = document.getElementById('title');
    if (t.open) { await G.menuModos.elegir('aventura'); await hasta(() => !t.open, 30000); }
    await sleep(2500);
    window.AV.flight();
    out.activo = await hasta(() => G.flightApi && G.flightApi.activo, 20000);
    out.portadaTrasAbrir = t.open;
    await sleep(1200);
    const fa = G.flightApi, d = fa && fa._dev; if (!d) return Object.assign({ error: 'sin _dev' }, out);
    d.vaciar(); d.st.fase = 'juego'; d.J.dist = 30; d.J.y = fa.P.yMin - 0.1; d.J.vy = -1; d.paso(1 / 60);
    out.finVisible = await hasta(() => d.st.ui && !d.st.ui.fin.hidden, 5000);
    const b = d.st.ui && d.st.ui.fin.querySelector('[data-salir]');
    out.texto = b ? b.textContent.trim() : '(sin botón)';
    if (b) { b.click(); out.portadaTrasClick = await hasta(() => t.open, 3000); out.activoTrasClick = await hasta(() => !fa.activo, 8000); }
    return out;
  })()`, 150);
  diario('B completo: ' + JSON.stringify(B));
  check('B · desde el mundo se abre Flight con la portada cerrada', B && B.activo && !B.portadaTrasAbrir, JSON.stringify(B));
  check('B · el botón del final sigue diciendo «Volver a la historia»', B && B.texto === 'Volver a la historia', B && B.texto);
  check('B · clic en «Volver a la historia»: se queda en el mundo (portada cerrada)', B && B.portadaTrasClick === false && B.activoTrasClick === true, JSON.stringify({ p: B && B.portadaTrasClick, a: B && B.activoTrasClick }));
  await foto(cdp, ses, path.join(SALIDA, 'k286_boton_B_mundo.jpg'));
  // Stats finales
  const stats = await ev(cdp, ses, `(() => { const G = window.AV.G, i = G.renderer.info; return { calls: i.render.calls, tris: i.render.triangles, geo: i.memory.geometries, tex: i.memory.textures, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null }; })()`, 30);
  R.stats = stats;
  diario('stats tras las idas y vueltas: ' + JSON.stringify(stats));
  R.erroresConsola = erroresConsola;
  R.ok = Object.keys(R.checks).every(k => R.checks[k].ok) && erroresConsola.length === 0;
  fs.writeFileSync(path.join(SALIDA, 'k286_boton.json'), JSON.stringify(R, null, 1));
  diario('RESULTADO: ' + (R.ok ? 'OK' : 'FALLO') + ' · errores de consola: ' + erroresConsola.length);
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  try { chrome.kill(); } catch (e) { }
  await new Promise(r => setTimeout(r, 1200));
  try { console.log('· ' + execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(AQUI, 'kimi2_mata_perfil.ps1')}" ${path.basename(perf)}`, { timeout: 30000 }).toString().trim()); } catch (e) { }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.srv.close(); process.exit(R.ok ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
