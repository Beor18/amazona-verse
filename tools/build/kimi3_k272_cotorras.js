#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-272 / QA-213: legibilidad de las chapas de etapas y
   alianza de «Mis cotorras» (evolucion.js) en teléfono. Ninguna batería cubre estos estilos CSS.
   Sonda: abre el juego real con ?v18=1 en 390×844 @ dpr 1 táctil (el contexto del QA de la nube),
   siembra progreso (vittata nv 22 con alianza desbloqueada + agilis desbloqueada), abre la tarjeta
   «Mis cotorras» real y mide getComputedStyle de .v18-evo-et / .v18-evo-et.no / .v18-evo-m,
   el desbordamiento de la tarjeta y los renderer stats. Captura con el CSS NUEVO y, en la MISMA
   página, inyecta el CSS VIEJO con !important y captura de nuevo (A/B de contenido idéntico).
   Después repite la medición EN inglés (QA-213: «en ES y EN»): cierra la tarjeta, cambia el idioma
   y reabre; solo CSS nuevo (el desborde se juzga con el tamaño mayor).
   Uso: node tools/build/kimi3_k272_cotorras.js [--etiqueta r1]
   Salida: consola + docs/img/kimi272/k272_<etiqueta>.{json,jpg×3} */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn, execSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ETIQUETA = arg('--etiqueta', 'r1');
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi272');
fs.mkdirSync(SALIDA, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(''); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(''); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = () => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); p.re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 60) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result ? r.result.value : undefined; }
(async () => {
  const gpu = (() => { try { return execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_VideoController | Where-Object { $_.AdapterRAM -gt 0 } | Select-Object -First 1).Name"', { timeout: 15000 }).toString().trim(); } catch (e) { return '?'; } })();
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3k272-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--window-size=390,844'], { stdio: ['ignore', 'ignore', 'pipe'] });
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
  // contexto del QA-213: teléfono 390×844, dpr 1, táctil
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }, ses);
  await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
  await cdp.call('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' }, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); } catch(e){}" }, ses);
  const t0 = Date.now();
  await cdp.call('Page.navigate', { url: `${origen}/index.html?v18=1` }, ses);
  let ok = false;
  while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!ok) throw new Error('el juego no expuso window.AV');
  await ev(cdp, ses, CFG.preparar_js, 150);
  // los módulos V18 cargan a demanda al primer gesto (boot.js); se fuerzan como hace kimi1_178
  const mods = JSON.parse(await ev(cdp, ses, `(async () => {
    const G = AV.G, sleep = ms => new Promise(r => setTimeout(r, ms));
    const cargar = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('script ' + src)); document.head.appendChild(s); });
    const asegurar = async (src, fabrica) => {
      if (typeof window[fabrica] !== 'function' && !document.querySelector('script[src="' + src + '"]')) await cargar(src);
      const t0 = performance.now();
      while (typeof window[fabrica] !== 'function' && performance.now() - t0 < 20000) await sleep(200);
      if (typeof window[fabrica] !== 'function') throw new Error('sin fabrica ' + fabrica);
    };
    try {
      await asegurar('src/game/v18/progreso.js', 'AVV18Progreso'); if (!G.v18) window.AVV18Progreso(G);
      await asegurar('src/game/v18/habilidades.js', 'AVV18Habilidades'); if (!G.v18hab) window.AVV18Habilidades(G);
      await asegurar('src/game/v18/fx_poderes.js', 'AVV18Fx'); if (!G.v18fx) window.AVV18Fx(G);
      await asegurar('src/game/v18/combate.js', 'AVV18Combate'); if (!G.v18combate) window.AVV18Combate(G);
      await asegurar('src/game/v18/descubrir.js', 'AVV18Descubrir'); if (!G.v18descubrir) window.AVV18Descubrir(G);
      await asegurar('src/game/v18/evolucion.js', 'AVV18Evolucion'); if (!G.v18evo) window.AVV18Evolucion(G);
    } catch (e) { return JSON.stringify({ ok: false, error: String(e && e.message || e) }); }
    return JSON.stringify({ ok: true, v18: !!G.v18, hab: !!G.v18hab, descubrir: !!G.v18descubrir, evo: !!G.v18evo });
  })()`, 90));
  if (!mods.ok) throw new Error(JSON.stringify(mods));
  // progreso: vittata nv 22 con su alianza desbloqueada (chapa normal) + agilis desbloqueada (etapas ESP);
  // las etapas no alcanzadas (Dirigido 20 / Maestro 30) salen como .v18-evo-et.no (las del QA)
  await ev(cdp, ses, `(async () => {
    const G = AV.G;
    G.v18.desbloquear('agilis');
    G.v18evo.prueba({ especie: 'vittata', nivel: 22, alianza: true });
    G.v18evo.prueba({ especie: 'agilis', nivel: 22 });
    G.v18.seleccionar('agilis');
    return 'ok';
  })()`, 30);
  await ev(cdp, ses, `AV.G.v18descubrir.abrirSeleccion()`, 30);
  await cdp.bombear(0.8);
  const medir = `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    await sleep(150);
    const card = document.getElementById('card');
    if (!card || card.hidden) return JSON.stringify({ ok: false, error: 'sin card' });
    const cs = sel => { const el = card.querySelector(sel); if (!el) return null; const c = getComputedStyle(el); return { fontSize: c.fontSize, opacity: c.opacity, background: c.backgroundColor, color: c.color, padding: c.padding, borderRadius: c.borderRadius, h: Math.round(el.getBoundingClientRect().height) }; };
    const botones = [...card.querySelectorAll('[data-v18sp]')].map(b => { const r = b.getBoundingClientRect(); return { sp: b.getAttribute('data-v18sp'), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), visible: r.width > 0 && r.height > 0 }; });
    const cr = card.getBoundingClientRect();
    const interior = card.querySelector('.card-in') || card.firstElementChild;
    const desborde = interior ? { scrollH: interior.scrollHeight, clientH: interior.clientHeight } : null;
    const chips = [...card.querySelectorAll('.v18-evo-et')].map(e => ({ no: e.classList.contains('no'), texto: e.textContent.trim().slice(0, 40) }));
    const R = window.AV.G.renderer, info = (R && R.info) || { render: { calls: null, triangles: null }, memory: { geometries: null, textures: null } };
    return JSON.stringify({ ok: true, et: cs('.v18-evo-et'), etNo: cs('.v18-evo-et.no'), m: cs('.v18-evo-m'), card: { x: Math.round(cr.x), y: Math.round(cr.y), w: Math.round(cr.width), h: Math.round(cr.height) }, botones, desborde, chips, calls: info.render.calls, tris: info.render.triangles, geo: info.memory.geometries, tex: info.memory.textures });
  })()`;
  const nuevo = JSON.parse(await ev(cdp, ses, medir, 30));
  if (!nuevo.ok) throw new Error(JSON.stringify(nuevo));
  const clip = { x: Math.max(0, nuevo.card.x), y: Math.max(0, nuevo.card.y), width: Math.min(nuevo.card.w, 390), height: Math.min(nuevo.card.h, 844), scale: 1 };
  const shotNuevo = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85, clip, captureBeyondViewport: true }, ses, 30000);
  fs.writeFileSync(path.join(SALIDA, `k272_${ETIQUETA}_nuevo.jpg`), Buffer.from(shotNuevo.data, 'base64'));
  // A/B: mismo contenido, CSS VIEJO (HEAD) forzado — mismo encuadre, solo cambian los estilos
  await ev(cdp, ses, `(() => { const st = document.createElement('style'); st.id = 'k272-old'; st.textContent = '#card .v18-evo-et{font-size:10px !important;padding:1px 5px !important;border-radius:8px !important}#card .v18-evo-et.no{background:#0002 !important;opacity:.6 !important}#card .v18-evo-m{font-size:11px !important}'; document.head.appendChild(st); return 'ok'; })()`, 20);
  await cdp.bombear(0.4);
  const viejo = JSON.parse(await ev(cdp, ses, medir, 30));
  const shotViejo = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85, clip, captureBeyondViewport: true }, ses, 30000);
  fs.writeFileSync(path.join(SALIDA, `k272_${ETIQUETA}_viejo.jpg`), Buffer.from(shotViejo.data, 'base64'));
  // EN (QA-213, «en ES y EN»): quitar el CSS viejo, cerrar la tarjeta, poner inglés y reabrir
  await ev(cdp, ses, `(async () => {
    const G = AV.G, sleep = ms => new Promise(r => setTimeout(r, ms));
    const viejoSt = document.getElementById('k272-old'); if (viejoSt) viejoSt.remove();
    G.ui.hideCard(); await sleep(300);
    if (G.aula && G.aula.setAjuste) G.aula.setAjuste('idioma', 'en'); else G.idioma.poner('en');
    await (G.idioma.listo || Promise.resolve()); await sleep(300);
    G.v18descubrir.abrirSeleccion(); await sleep(800);
    return 'ok';
  })()`, 30);
  const en = JSON.parse(await ev(cdp, ses, medir, 30));
  if (!en.ok) throw new Error(JSON.stringify(en));
  const clipEn = { x: Math.max(0, en.card.x), y: Math.max(0, en.card.y), width: Math.min(en.card.w, 390), height: Math.min(en.card.h, 844), scale: 1 };
  const shotEn = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85, clip: clipEn, captureBeyondViewport: true }, ses, 30000);
  fs.writeFileSync(path.join(SALIDA, `k272_${ETIQUETA}_en.jpg`), Buffer.from(shotEn.data, 'base64'));
  const res = { etiqueta: ETIQUETA, hora: new Date().toISOString(), pantalla: '390x844@1 táctil (QA-213)', gpu, head: 'worktree (HEAD local)', nuevo, viejo, en, erroresConsola };
  fs.writeFileSync(path.join(SALIDA, `k272_${ETIQUETA}.json`), JSON.stringify(res, null, 1));
  console.log(JSON.stringify({ nuevo: { et: nuevo.et, etNo: nuevo.etNo, m: nuevo.m, desborde: nuevo.desborde, chips: nuevo.chips.length, calls: nuevo.calls, tris: nuevo.tris }, viejo: { et: viejo.et, etNo: viejo.etNo, m: viejo.m }, en: { et: en.et, etNo: en.etNo, m: en.m, desborde: en.desborde, card: en.card, chips: en.chips.length }, erroresConsola }, null, 1));
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  try { chrome.kill(); } catch (e) { }
  await new Promise(r => setTimeout(r, 1200));
  try { console.log('· ' + execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(AQUI, 'kimi2_mata_perfil.ps1')}" ${path.basename(perf)}`, { timeout: 30000 }).toString().trim()); } catch (e) { }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
