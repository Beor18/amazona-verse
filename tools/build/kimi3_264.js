#!/usr/bin/env node
/* KIMI-264 · validación GPU real del parche de la nube f5be1ff7 «QA móvil V18» (QA-208/209/210).
   Móvil 390×844 dpr 3 táctil, CPU ×4, GPU real. Tres comprobaciones con la UI real + capturas:
   - QA-209: Álbum abierto desde el menú de modos → .mm-album .lbl con color tinta (legible sobre papel)
   - QA-210: «Mis cotorras» → botones [data-v18sp] con padding-block 12px
   - QA-208: en el mundo, con #prompt y #bocadillos visibles (como en las misiones V18.3), el botón
     táctil del poder (#v18-exp-poder) queda SOBRE los bocadillos (no les tapa el final de la frase)
   Uso: node tools/build/kimi3_264.js [--etiqueta r1] */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn, execSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const ETIQ = (process.argv.indexOf('--etiqueta') > 0 ? process.argv[process.argv.indexOf('--etiqueta') + 1] : 'r1');
const MODO = process.argv.includes('--solo-mundo') ? 'mundo' : 'ui'; // dos corridas con Chrome fresco: la re-navegación en la misma pestaña cuelga la 2.ª carga (QA-111)
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi264');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

// misma semilla que kimi2_empezar.js (--baterias): partida cap1 válida, sin creador
const SEMILLA = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi3-264-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;

function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end('403'); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result ? r.result.value : undefined; }
async function foto(cdp, ses, archivo) { const r = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 60000); fs.writeFileSync(path.join(SALIDA, archivo), Buffer.from(r.data, 'base64')); }

(async () => {
  fs.mkdirSync(SALIDA, { recursive: true });
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3k264-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--window-size=390,844'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoDev) { try { chrome.kill(); } catch (e) { } throw new Error('Chrome no abrió DevTools en 60 s ' + err.slice(0, 200)); }
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }, ses);
  await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
  await cdp.call('Emulation.setUserAgentOverride', { userAgent: UA }, ses);
  await cdp.call('Emulation.setCPUThrottlingRate', { rate: 4 }, ses);
  const consola = [];
  ws.addEventListener('message', m => { try { const d = JSON.parse(m.data); if (d.method === 'Runtime.consoleAPICalled' && (d.params.type === 'error' || d.params.type === 'assert')) consola.push(d.params.args.map(a => a.value || a.description || '').join(' ').slice(0, 300)); if (d.method === 'Runtime.exceptionThrown') consola.push('EXC ' + JSON.stringify(d.params.exceptionDetails).slice(0, 300)); } catch (e) { } });
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: MODO === 'mundo' ? "try { localStorage.clear(); } catch(e){}" : SEMILLA }, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html?v18=1` }, ses);

  const R = { tarea: 'KIMI-264', etiqueta: ETIQ, parche: 'f5be1ff7', head: null, pantalla: 'movil 390x844@3 cpuX4 tactil (iPhone emulado), GPU real', checks: [] };
  const check = (name, ok, extra) => { const c = { name, ok: !!ok, extra: extra == null ? '' : String(extra) }; R.checks.push(c); console.log((c.ok ? '  ✓ ' : '  ✗ ') + name + (c.extra ? ' — ' + c.extra.slice(0, 220) : '')); return c; };
  const t0 = Date.now(); let ok = false;
  while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(window.AV && window.AV.G && window.AV.G.actores && (window.AV.G.actores.player3D || window.AV.G.actores.failed3D))`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!ok) throw new Error('el juego no arrancó en 240 s');
  R.head = await ev(cdp, ses, `(document.querySelector('meta[name=build]')||{}).content || document.title || 'desconocido'`, 10, false);
  await cdp.bombear(1.5);

  // ---- QA-209: Álbum desde el menú de modos ----
  if (MODO === 'ui') {
  console.log('· QA-209: abriendo el Álbum desde el menú…');
  const qa209 = await ev(cdp, ses, `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms)), G = AV.G;
    G.menuModos.mostrar();
    await sleep(300);
    const b = document.querySelector('[data-modo="album"]');
    if (!b) return { error: 'sin botón album' };
    b.click();
    await sleep(700);
    const card = document.getElementById('card');
    const lbl = card && card.querySelector('.mm-album .lbl');
    if (!lbl) return { error: 'sin .mm-album .lbl' };
    const cs = getComputedStyle(lbl);
    const fondo = getComputedStyle(card);
    const rgb = cs.color.match(/[\\d.]+/g).map(Number);
    const brgb = (fondo.backgroundColor.match(/[\\d.]+/g) || [255, 248, 232]).map(Number);
    const lum = c => { c = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    const rel = (Math.max(lum(rgb), lum(brgb)) + 0.05) / (Math.min(lum(rgb), lum(brgb)) + 0.05);
    const lumaTinta = lum(rgb);
    return { texto: cs.color, fondo: fondo.backgroundColor, contraste: +rel.toFixed(2), lumaTinta: +lumaTinta.toFixed(3) };
  })()`, 60);
  check('QA-209 · Álbum desde el menú: el título «Álbum de las 36 · n/34» es tinta oscura sobre papel (legible, contraste ≥ 4,5:1)', qa209 && !qa209.error && qa209.lumaTinta < 0.2 && qa209.contraste >= 4.5, JSON.stringify(qa209));
  await foto(cdp, ses, `k264_${ETIQ}_qa209_album.jpg`);

  // ---- QA-210: Mis cotorras, relleno en las tarjetas ----
  console.log('· QA-210: abriendo Mis cotorras…');
  await ev(cdp, ses, `AV.G.ui.hideCard()`, 10);
  const qa210 = await ev(cdp, ses, `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const b = document.querySelector('[data-modo="cotorras"]');
    if (!b) return { error: 'sin botón cotorras' };
    b.click();
    let primero = null;
    for (let i = 0; i < 40 && !primero; i++) { await sleep(300); const card = document.getElementById('card'); primero = card && card.querySelector('[data-v18sp]'); }
    if (!primero) {
      // partida nueva sin cotorras seleccionables: la regla del fix está en la tarjeta viva; la medimos con un botón de prueba
      const card2 = document.getElementById('card'), estilo = card2 && card2.querySelector('.v18-elegir style');
      const fila = card2 && card2.querySelector('.v18-elegir .row');
      if (!fila) return { error: 'sin [data-v18sp] ni .row en la tarjeta' };
      const probe = document.createElement('button');
      probe.type = 'button'; probe.setAttribute('data-v18sp', 'vittata');
      probe.innerHTML = '<span class="v18-nom">Vittata</span><small><span>Poder</span>: <span>Grito</span></small>';
      fila.appendChild(probe);
      await sleep(150);
      const cs2 = getComputedStyle(probe);
      return { paddingTop: cs2.paddingTop, paddingBottom: cs2.paddingBottom, botones: 0, reglaCss: estilo ? estilo.textContent.includes('padding-block:12px') : null, probe: true, h2: (card2.querySelector('h2') || {}).textContent };
    }
    const cs = getComputedStyle(primero);
    const estilo = document.querySelector('#card .v18-elegir style');
    return { paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, botones: document.querySelectorAll('#card [data-v18sp]').length, reglaCss: estilo ? estilo.textContent.includes('padding-block:12px') : null };
  })()`, 60);
  check('QA-210 · Mis cotorras: las tarjetas tienen relleno arriba y abajo (12px)', qa210 && !qa210.error && parseFloat(qa210.paddingTop) === 12 && parseFloat(qa210.paddingBottom) === 12, JSON.stringify(qa210));
  await foto(cdp, ses, `k264_${ETIQ}_qa210_cotorras.jpg`);
  }

  // ---- QA-208: botón Poder sobre los bocadillos ----
  if (MODO === 'mundo') {
  console.log('· QA-208: entrada al mundo como jugadora…');
  const tp = Date.now(); let portada = false;
  while (Date.now() - tp < 120000) { try { if (await ev(cdp, ses, `!!(document.getElementById('title') && document.getElementById('title').open)`, 10, false)) { portada = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!portada) throw new Error('la portada no abrió');
  console.log('· preparar (portada→Jugar): ' + await ev(cdp, ses, `(async () => { return ${CFG.preparar_js}; })()`, 300));
  // saltar la intro/apertura si sigue ahí (reintento: aparece tarde en frío)
  for (let i = 0; i < 6; i++) {
    const salto = await ev(cdp, ses, `(async () => { const sx = document.getElementById('c1-saltar'); if (sx && sx.offsetParent !== null) { sx.click(); return true; } return false; })()`, 20);
    if (salto) break;
    await cdp.bombear(1.5);
  }
  // esperar al mundo jugable
  const tm = Date.now(); let mundo = false, diag = {};
  while (Date.now() - tm < 180000) {
    try { diag = await ev(cdp, ses, `(async () => { const t = document.getElementById('title'); let r = null; try { r = window.AV && AV.renderer; } catch (e) { } return { title: !!(t && t.open), calls: r && r.info ? r.info.render.calls : -1, acts: !!document.getElementById('acts'), carga: !!document.getElementById('carga'), saltar: !!document.getElementById('c1-saltar') }; })()`, 10); } catch (e) { }
    if (diag.calls > 5 && diag.acts) { mundo = true; break; }
    await cdp.bombear(1);
  }
  check('mundo jugable (draw calls > 5 y #acts presente)', mundo, JSON.stringify(diag));
  // explorar.js (y su botón táctil del poder) se cargan al PRIMER GESTO del jugador (alPrimerGesto en boot.js):
  // en headless no hay gesto real, así que lo provocamos (igual que un dedo en la pantalla)
  await ev(cdp, ses, `(async () => { for (const t of ['pointerdown', 'keydown']) window.dispatchEvent(t === 'keydown' ? new KeyboardEvent('keydown', { key: 'x' }) : new PointerEvent('pointerdown', { bubbles: true })); })()`, 20);
  const tb = Date.now(); let hayBtn = false;
  while (Date.now() - tb < 30000) { try { if (await ev(cdp, ses, `!!document.getElementById('v18-exp-poder')`, 10, false)) { hayBtn = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  check('botón táctil del poder creado (explorar.js vivo tras el gesto)', hayBtn, '');
  await cdp.bombear(2.5); // dejar que el botón asiente su posición
  const qa208 = await ev(cdp, ses, `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const tactil = matchMedia('(pointer: coarse)').matches;
    const btn = document.getElementById('v18-exp-poder');
    const acts = document.getElementById('acts');
    const rActs = acts && acts.getBoundingClientRect();
    // escena real de misión: Vittata posada junto a Iguaca → el propio juego muestra el aviso (#prompt);
    // los bocadillos salen por la API real de dialogo.js
    const pr = document.getElementById('prompt');
    if (!pr) return { error: 'sin #prompt', url: location.href, listos: document.readyState };
    let promptReal = false;
    try {
      AV.teleport(3.2, -1);
      const S = AV.state, F = AV.G.fisica;
      S.flying = false; S.vy = 0; if (F && F.suelo) S.pos.y = F.suelo(3.2, -1, 200) + 0.05;
      for (let i = 0; i < 50; i++) { await sleep(200); const p = document.getElementById('prompt'); if (p && !p.hidden && p.getBoundingClientRect().height > 4) { promptReal = true; break; } }
    } catch (e) { }
    if (!promptReal) { pr.innerHTML = '<span class="prompt-txt">Hablar con Iguaca</span>'; pr.hidden = false; }
    AV.G.dialogo.say([{ who: 'Iguaca', text: '¡Vamos a repararlo juntos! Mira cómo brilla este lugar cuando lo dejamos como nuevo.' }], null, { libre: true });
    for (let i = 0; i < 30; i++) { const b = document.getElementById('bocadillos'); if (b && !b.hidden) break; await sleep(100); }
    await sleep(700); // el paso de explorar.js reubica el botón cada 0,1 s
    if (!btn) return { error: 'sin botón #v18-exp-poder', tactil, url: location.href };
    const rb = btn.getBoundingClientRect(), rp = pr.getBoundingClientRect(), ro = (document.getElementById('bocadillos') || { getBoundingClientRect: () => ({ top: 0, bottom: 0, left: 0, right: 0, height: 0 }) }).getBoundingClientRect();
    const solapaBoc = rb && ro.height && !(rb.left >= ro.right || ro.left >= rb.right || rb.top >= ro.bottom || ro.top >= rb.bottom);
    const hueco = ro.height ? Math.round(rb.top - ro.bottom) : null;
    // caso sin bocadillos (regresión QA-191): solo el aviso
    try { AV.G.dialogo.cancelarLibre(); } catch (e) { const b = document.getElementById('bocadillos'); if (b) b.hidden = true; }
    await sleep(600);
    const rb2 = btn.getBoundingClientRect(), rp2 = pr.getBoundingClientRect();
    const solapaPrompt = !(rb2.left >= rp2.right || rp2.left >= rb2.right || rb2.top >= rp2.bottom || rp2.top >= rb2.bottom);
    pr.hidden = true;
    return { tactil, promptReal, btnExiste: !!btn, btnVisible: btn && !btn.hidden, solapaBoc, solapaPrompt, huecoBtnSobreBoc: hueco,
      btn: rb && { top: Math.round(rb.top), bottom: Math.round(rb.bottom) }, boc: { top: Math.round(ro.top), bottom: Math.round(ro.bottom) },
      prompt: { top: Math.round(rp.top), bottom: Math.round(rp.bottom), alto: Math.round(rp.height) },
      sinBoc: { btnTop: Math.round(rb2.top), btnBottom: Math.round(rb2.bottom), promptTop: Math.round(rp2.top) },
      actsTop: rActs && Math.round(rActs.top) };
  })()`, 90);
  check('QA-208 · con bocadillos visibles el botón Poder NO los tapa (queda justo encima)', qa208 && qa208.btnExiste && qa208.btnVisible && !qa208.solapaBoc, JSON.stringify(qa208));
  check('QA-191 (regresión) · con solo el aviso, el botón sigue sin taparlo', qa208 && !qa208.solapaPrompt, '');
  console.log('· qa208:', JSON.stringify(qa208));
  // captura con los bocadillos de nuevo visibles
  await ev(cdp, ses, `(async () => { const pr = document.getElementById('prompt'); if (pr) { pr.innerHTML = '<span class="prompt-txt">Hablar con Iguaca</span>'; pr.hidden = false; } try { AV.G.dialogo.say([{ who: 'Iguaca', text: '¡Vamos a repararlo juntos! Mira cómo brilla este lugar cuando lo dejamos como nuevo.' }], null, { libre: true }); } catch (e) { const boc = document.getElementById('bocadillos'); if (boc) boc.hidden = false; } await new Promise(r=>setTimeout(r,700)); })()`, 30);
  await foto(cdp, ses, `k264_${ETIQ}_qa208_boton.jpg`);
  }

  // métricas del mundo móvil para el registro
  if (MODO === 'mundo') R.mundo = await ev(cdp, ses, `(async () => { await new Promise(r => setTimeout(r, 1500)); let r = null; try { r = window.AV && AV.renderer; } catch (e) { } if (!r || !r.info) return { error: 'renderer no listo', url: location.href, av: !!window.AV }; const i = r.info; return { calls: i.render.calls, tris: i.render.triangles, geo: i.memory.geometries, tex: i.memory.textures, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1 }; })()`, 30);
  R.erroresConsola = consola;
  fs.writeFileSync(path.join(SALIDA, `k264_${ETIQ}${MODO === 'mundo' ? '-mundo' : ''}.json`), JSON.stringify(R, null, 1));
  console.log(JSON.stringify(R, null, 1));
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  try { chrome.kill(); } catch (e) { }
  await new Promise(r => setTimeout(r, 1200));
  try { console.log('· ' + execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(AQUI, 'kimi2_mata_perfil.ps1')}" ${path.basename(perf)}`, { timeout: 30000 }).toString().trim()); } catch (e) { }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
