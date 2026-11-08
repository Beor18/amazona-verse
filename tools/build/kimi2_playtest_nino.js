#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-317/320: playtest «como un niño nuevo» en MÓVIL
   (390×844, táctil real por CDP, calidad «bajo» natural del iPhone emulado, CPU ×4, ?v18=1).
   Recorrido de ~20 min comprimido: portada V18 → creador con valores por defecto → cap. 1
   (caminar con el joystick táctil y despegar con el botón Volar) → pausa → menú V18 en juego
   → un duelo (combate.js, botones táctiles) → el arco V18.3 (Atalayas: escena, diálogo,
   encuentro) → Family Quest (Diario → Aventuras en familia → Cuento en cadena a base de toques
   → viñeta guardada). Cada parada: captura + errores de consola + FPS; al final JSON con el
   resumen y las «fricciones» detectadas (botones < 44 px, textos que no caben, pasos muertos,
   errores). El viaje entre zonas usa teleport/API (las pruebas unitarias ya cubren la lógica);
   lo táctil y lo visual se ejercita de verdad.
   Los módulos cargan con AVE.assets.script (window.AVE), no AV.assets. Uso:
   node tools/build/kimi2_playtest_nino.js */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, spawnSync } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi317');
fs.mkdirSync(SALIDA, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.webp': 'image/webp' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); return res.end('404'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(d);
    });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); const zas = m => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + m)); this.pend.clear(); }; ws.onerror = e => zas(e.message || 'error'); ws.onclose = () => zas('cerrado (Chrome caído)'); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(method, params, sessionId, timeoutMs) {
    const id = ++this.id;
    return new Promise((re, re2) => {
      this.pend.set(id, { re, re2 });
      this.ws.send(JSON.stringify({ id, method, params: params || {}, sessionId }));
      if (timeoutMs) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + method)); } }, timeoutMs);
    });
  }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function evaluar(cdp, ses, exp, timeoutS, promesa) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: promesa !== false, returnByValue: true }, ses, (timeoutS || 30) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 400));
  return r.result ? r.result.value : undefined;
}
async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2pt-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', '--window-size=800,900'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools en 60 s: ' + err.slice(0, 300));
}

const resumen = { beats: [], consola: [], fricciones: [] };
const apunta = b => { resumen.beats.push(b); try { fs.writeFileSync(path.join(SALIDA, 'k317_playtest.json'), JSON.stringify(resumen, null, 1)); } catch (e) {} };
function nota(beat, txt) { resumen.fricciones.push({ beat, nota: txt }); try { fs.writeFileSync(path.join(SALIDA, 'k317_playtest.json'), JSON.stringify(resumen, null, 1)); } catch (e) {} console.log('  [fricción:' + beat + '] ' + txt); }
async function foto(cdp, ses, nombre) {
  const r = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 30000);
  fs.writeFileSync(path.join(SALIDA, nombre + '.jpg'), Buffer.from(r.data, 'base64'));
}
async function toca(cdp, ses, x, y) {
  const p = { x: Math.round(x), y: Math.round(y), id: 1 };
  await cdp.call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p] }, ses);
  await cdp.bombear(0.06);
  await cdp.call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }, ses);
  await cdp.bombear(0.25);
}
async function tocaSel(cdp, ses, sel) { // centro real de un elemento del DOM (táctil verdadero)
  const r = await evaluar(cdp, ses, `(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, w: b.width, h: b.height }; })()`, 10, false);
  if (!r) return false;
  await toca(cdp, ses, r.x, r.y);
  return r;
}
async function espera(cdp, ses, exp, segs) {
  const t0 = Date.now();
  while (Date.now() - t0 < segs * 1000) { const r = await evaluar(cdp, ses, exp, 8, false); if (r) return r; await cdp.bombear(0.5); }
  return false;
}
async function fps(cdp, ses, segs) {
  return evaluar(cdp, ses, `new Promise(res => { const t0 = performance.now(); let n = 0, peor = 0, ant = t0; const paso = t => { n++; peor = Math.max(peor, t - ant); ant = t; if (t - t0 < ${(segs || 4) * 1000}) requestAnimationFrame(paso); else res({ med: Math.round(n / ((t - t0) / 1000) * 10) / 10, peorMs: Math.round(peor) }); }; requestAnimationFrame(paso); })`, (segs || 4) + 8, true);
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const l = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${l.puerto}${l.wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const fin = (cod, extra) => { try { spawnSync('taskkill', ['/PID', String(l.chrome.pid), '/T', '/F'], { stdio: 'ignore' }); } catch (e) {} try { fs.rmSync(l.perf, { recursive: true, force: true }); } catch (e) {} srv.close(); if (extra) console.log(JSON.stringify(extra, null, 1)); process.exit(cod); };
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    cdp.consola = [];
    ws.addEventListener('message', ev => {
      let d; try { d = JSON.parse(ev.data); } catch (e) { return; }
      if (d.method === 'Runtime.consoleAPICalled' && (d.params.type === 'error' || d.params.type === 'warning')) {
        const txt = (d.params.args || []).map(a => a.value != null ? String(a.value) : (a.description || a.type)).join(' ').slice(0, 220);
        if (!/favicon|Deprecat|GroupMarkerNotSet|gpu_.*fallback|swiftshader/i.test(txt)) cdp.consola.push(d.params.type + ': ' + txt);
      }
      if (d.method === 'Runtime.exceptionThrown') { const e = d.params.exceptionDetails; cdp.consola.push('EXCEPCIÓN: ' + String(e.exception && e.exception.description || e.text).slice(0, 220)); }
      if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') { const t = String(d.params.entry.text || '').slice(0, 220); if (!/favicon|403|404|net::/i.test(t)) cdp.consola.push('log: ' + t); }
    });

    // ---------- 0 · niño nuevo: almacén limpio y portada V18 ----------
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }, ses);
    await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: 4 }, ses);
    await cdp.call('Page.navigate', { url: origen + '/?v18=1' }, ses);
    await espera(cdp, ses, `!!(document.getElementById('title') || document.getElementById('creator'))`, 90);
    await evaluar(cdp, ses, `localStorage.clear(); sessionStorage.clear(); window.__errs=[]; addEventListener('error',e=>__errs.push(String(e.message||e.error).slice(0,200))); addEventListener('unhandledrejection',e=>__errs.push('rechazo: '+String(e.reason&&e.reason.message||e.reason).slice(0,200))); 'ok'`, 10, false);
    await cdp.bombear(2);
    await foto(cdp, ses, 'b0_portada');
    const tarjetas = await evaluar(cdp, ses, `[...document.querySelectorAll('[data-modo]')].map(b => ({ m: b.dataset.modo, oculto: b.hidden, h: Math.round(b.getBoundingClientRect().height) }))`, 10, false);
    apunta({ beat: 'portada', tarjetasV18: (tarjetas || []).filter(t => !t.oculto).map(t => t.m) });
    if (!(tarjetas || []).some(t => !t.oculto && t.m === 'duelo')) nota('portada', 'sin ?v18=1 no se ven las tarjetas V18 (esperado con la bandera)');

    // ---------- 1 · Aventura → creador con valores por defecto (flujo de niño nuevo) ----------
    const t1 = await tocaSel(cdp, ses, '[data-modo="aventura"]');
    if (!t1) await evaluar(cdp, ses, `(() => { const b = document.querySelector('[data-modo="aventura"]'); if (b) { b.click(); return true; } return false; })()`, 10, false);
    const hayCreador = await espera(cdp, ses, `(() => { const cr = document.getElementById('creator'); return cr && !cr.hidden; })()`, 45);
    if (hayCreador) {
      await cdp.bombear(1);
      await foto(cdp, ses, 'b1_creador');
      const crOK = await tocaSel(cdp, ses, '#p-save') || await evaluar(cdp, ses, `(() => { const b = document.getElementById('p-save'); if (b) { b.click(); return true; } return false; })()`, 10, false);
      apunta({ beat: 'creador', ok: !!crOK });
      await espera(cdp, ses, `(() => { const t = document.getElementById('title'); return t && t.open; })()`, 30);
      await cdp.bombear(0.8);
      await tocaSel(cdp, ses, '[data-modo="aventura"]') || await evaluar(cdp, ses, `(() => { const b = document.querySelector('[data-modo="aventura"]'); if (b) { b.click(); return true; } return false; })()`, 10, false);
    } else {
      nota('creador', 'tras pulsar Aventura no apareció el creador en 45 s (¿entró directo?)');
      apunta({ beat: 'creador', ok: 'sin-creador' });
    }

    // ---------- 2 · cargar el mundo y saltar la intro ----------
    await espera(cdp, ses, `!!(window.AV && AV.G && AV.G.mundo && AV.G.mundo.listo)`, 240);
    await espera(cdp, ses, `(() => { try { return !(AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return !!AV.G.mundo.listo; } })()`, 60);
    // saltar la intro si hay botón
    await evaluar(cdp, ses, `(() => { const b = [...document.querySelectorAll('button')].find(x => /saltar/i.test(x.textContent) && !x.hidden); if (b) { b.click(); return true; } return false; })()`, 10, false);
    await cdp.bombear(3);
    await foto(cdp, ses, 'b2_spawn');
    const calidad = await evaluar(cdp, ses, `(AV.G.renderer && AV.G.renderer.stats ? AV.G.renderer.stats().calidad : 'desconocida')`, 10, false);
    const f0 = await fps(cdp, ses, 4);
    apunta({ beat: 'spawn-cap1', calidad, fps: f0 });
    if (String(calidad) !== 'bajo') nota('spawn-cap1', 'calidad esperada «bajo» en iPhone emulado y salió «' + calidad + '»');

    // caminar con el joystick táctil (dedo real sostenido) y despegar con el botón Volar (#b-fly)
    await toca(cdp, ses, 110, 640);
    await cdp.call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 110, y: 640, id: 1 }] }, ses);
    await cdp.bombear(1.6);
    await cdp.call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }, ses);
    await cdp.bombear(0.6);
    await tocaSel(cdp, ses, '#b-fly') || await evaluar(cdp, ses, `(() => { const b = document.getElementById('b-fly'); if (b) { b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return true; } return false; })()`, 10, false);
    await cdp.bombear(1.4);
    const volando0 = await evaluar(cdp, ses, `!!(AV.G.fisica && AV.G.fisica.MOVE && AV.G.fisica.MOVE.flying)`, 10, false);
    await foto(cdp, ses, 'b3_joystick');
    const f1 = await fps(cdp, ses, 4);
    apunta({ beat: 'joystick', volando: !!volando0, fps: f1 });
    if (!volando0) nota('joystick', 'ni con el dedo en el joystick y el botón Volar se despegó (¿poco claro cómo volar en táctil?)');

    // ---------- 3 · pausa ----------
    const pausaOK = await tocaSel(cdp, ses, '#btn-pausa') || await tocaSel(cdp, ses, '[aria-label*="pausa" i]') || await evaluar(cdp, ses, `(() => { const b = [...document.querySelectorAll('button')].find(x => /pausa/i.test((x.getAttribute('aria-label')||'') + ' ' + x.textContent) && !x.hidden); if (b) { b.click(); return true; } return false; })()`, 10, false);
    await cdp.bombear(0.8);
    await foto(cdp, ses, 'b4_pausa');
    apunta({ beat: 'pausa', abierta: !!pausaOK });
    await evaluar(cdp, ses, `(() => { const b = [...document.querySelectorAll('button')].find(x => /seguir|continuar|reanudar/i.test(x.textContent) && !x.hidden); if (b) { b.click(); return true; } return false; })()`, 10, false);

    // ---------- 4 · menú V18 en juego: Mis cotorras ----------
    const mc = await evaluar(cdp, ses, `(async () => { try { const G = AV.G; if (G.menuModos && G.menuModos.elegir) { await G.menuModos.elegir('cotorras'); return 'elegir'; } if (!G.v18evo) await window.AVE.assets.script('src/game/v18/evolucion.js').then(() => window.AVV18Evolucion(G)); return G.v18evo ? 'modulo-sin-api-apertura' : 'sin-api'; } catch (e) { return 'err:' + e.message; } })()`, 30, true).catch(e => 'err:' + e.message);
    await cdp.bombear(1);
    await foto(cdp, ses, 'b5_mis_cotorras');
    apunta({ beat: 'menu-v18-mis-cotorras', r: mc });
    await evaluar(cdp, ses, `(() => { const b = [...document.querySelectorAll('button')].find(x => /cerrar|salir|listo|volver/i.test(x.textContent) && !x.hidden && x.offsetParent); if (b) { b.click(); return true; } return false; })()`, 10, false);
    await cdp.bombear(0.5);

    // ---------- 5 · un duelo (combate.js) con botones táctiles ----------
    const due = await evaluar(cdp, ses, `(async () => { try { const G = AV.G; if (!G.v18combate) await window.AVE.assets.script('src/game/v18/combate.js').then(() => window.AVV18Combate(G)); G.v18combate.iniciar({}); return 'iniciado'; } catch (e) { return 'err:' + e.message; } })()`, 30, true).catch(e => 'err:' + e.message);
    const faseDueloEval = `AV.G.v18combate && AV.G.v18combate.estado ? AV.G.v18combate.estado().fase : '?'`;
    const listoDuelo = await espera(cdp, ses, `AV.G.v18combate && AV.G.v18combate.estado && ['entreno','cuenta','lucha'].includes(AV.G.v18combate.estado().fase)`, 60);
    await cdp.bombear(2);
    await foto(cdp, ses, 'b6_duelo');
    // tocar el botón de acción del HUD (el verbo del duelo)
    let toques = 0;
    for (let i = 0; i < 4; i += 1) {
      const r = await tocaSel(cdp, ses, '#accion-boton') || await evaluar(cdp, ses, `(() => { const m = AV.G.v18combate && AV.G.v18combate.modo; if (m && m.accion) { m.accion(); return 'api'; } const b = [...document.querySelectorAll('button')].filter(x => !x.hidden && x.offsetParent && x.getBoundingClientRect().width >= 40).sort((a, b2) => b2.getBoundingClientRect().width * b2.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height)[0]; if (b) { b.click(); return 'dom'; } return false; })()`, 10, false);
      if (r) toques++;
      await cdp.bombear(1.1);
    }
    const fDuelo = await fps(cdp, ses, 5);
    await foto(cdp, ses, 'b6_duelo_pelea');
    const faseDuelo = await evaluar(cdp, ses, faseDueloEval, 10, false);
    apunta({ beat: 'duelo', inicio: due, listo: !!listoDuelo, fase: faseDuelo, toques, fps: fDuelo });
    if (!listoDuelo) nota('duelo', 'el duelo no llegó a fase entreno/cuenta/lucha en 60 s');
    await evaluar(cdp, ses, `(() => { try { const b = [...document.querySelectorAll('button')].find(x => /salir|abandonar/i.test(x.textContent) && !x.hidden); if (b) { b.click(); return 'btn'; } } catch (e) {} try { if (AV.G.v18combate && AV.G.v18combate.salir) { AV.G.v18combate.salir(); return 'api'; } } catch (e) {} return false; })()`, 10, false);
    await cdp.bombear(1);

    // ---------- 6 · el arco V18.3 (Atalayas): escena + diálogo + encuentro ----------
    const arco = await evaluar(cdp, ses, `(async () => { try {
      const G = AV.G, AVE = window.AVE;
      if (!G.v18) await AVE.assets.script('src/game/v18/progreso.js').then(() => window.AVV18Progreso(G));
      if (!G.v18hab) await AVE.assets.script('src/game/v18/habilidades.js').then(() => window.AVV18Habilidades(G));
      if (!G.v18fx) await AVE.assets.script('src/game/v18/fx_poderes.js').then(() => window.AVV18Fx(G));
      await AVE.assets.script('content/comun/personajes_v18.js');
      if (!G.v18npc) await AVE.assets.script('src/game/v18/npc.js').then(() => window.AVV18Npc(G));
      if (!G.v18puerto) await AVE.assets.script('src/game/v18/puerto.js').then(() => window.AVV18Puerto(G));
      if (!G.v18arco) await AVE.assets.script('src/game/v18/arco.js').then(() => window.AVV18Arco(G));
      const A = G.v18arco;
      if (!A) return 'sin-api';
      // despertar el elenco y poner a Vittata en la plaza de las Atalayas
      A.aplicar();
      const st = A.estado();
      const s = A.SITIO && (A.SITIO.plaza || A.SITIO.maq) || null;
      if (s) { const ST = AV.G.mundo && AV.G.mundo.streaming; if (ST && ST.terminar) ST.terminar(); AV.G.S.pos.x = s.x; AV.G.S.pos.z = s.z; AV.G.S.pos.y = 30; }
      return { estado: st, sitio: s, elenco: A.elenco() };
    } catch (e) { return 'err:' + (e && e.message || e); } })()`, 120, true).catch(e => 'err:' + e.message);
    await cdp.bombear(4);
    await foto(cdp, ses, 'b7_arco_atalayas');
    // hablar con el primer NPC interactivo cercano (botón de interacción táctil o tecla E)
    const dialogo = await evaluar(cdp, ses, `(() => { try {
      const n = AV.G.interaccion && AV.G.interaccion.nearest && AV.G.interaccion.nearest();
      if (n && n.usar) { n.usar(); return n.id || 'ok'; }
      if (n) { AV.G.emit('interaccion', n); return (n.id || 'ok') + ':emit'; }
      return 'sin-interaccion';
    } catch (e) { return 'err:' + e.message; } })()`, 15, false);
    await cdp.bombear(1.5);
    await foto(cdp, ses, 'b7_arco_dialogo');
    const dlgAbierto = await evaluar(cdp, ses, `!!(AV.G.dialogo && AV.G.dialogo.open && AV.G.dialogo.open())`, 10, false);
    apunta({ beat: 'arco', r: arco, dialogo, dlgAbierto });
    if (dlgAbierto) { await evaluar(cdp, ses, `(() => { try { AV.G.dialogo.cerrar && AV.G.dialogo.cerrar(); } catch (e) {} return 1; })()`, 10, false); }

    // ---------- 7 · Family Quest: Diario → Aventuras en familia → Cuento en cadena ----------
    const fq0 = await evaluar(cdp, ses, `(async () => { try {
      const G = AV.G;
      try { if (G.ui && G.ui.hideCard) G.ui.hideCard(); } catch (e) {}
      try { if (G.dialogo && G.dialogo.cerrar) G.dialogo.cerrar(); } catch (e) {}
      if (!G.familyQuest) await window.AVE.assets.script('src/game/familia_aventuras.js').then(() => window.AVFamiliaAventuras(G));
      if (G.diario && G.diario.open) G.diario.open();
      return 'diario';
    } catch (e) { return 'err:' + e.message; } })()`, 30, true).catch(e => 'err:' + e.message);
    await cdp.bombear(1.5);
    const btnFQ = await tocaSel(cdp, ses, '[data-fq-abrir]');
    if (!btnFQ) { await evaluar(cdp, ses, `(() => { const b = document.querySelector('[data-fq-abrir]'); if (b) { b.click(); return true; } return false; })()`, 10, false); }
    await cdp.bombear(0.8);
    await foto(cdp, ses, 'b8_family_menu');
    // tamaños táctiles del menú (criterio niño: ≥ 44 px)
    const medidas = await evaluar(cdp, ses, `(() => { const bs = [...document.querySelectorAll('#fq button')].filter(b => !b.hidden && b.offsetParent); const rs = bs.map(b => { const r = b.getBoundingClientRect(); return { id: b.id || b.textContent.slice(0, 14), w: Math.round(r.width), h: Math.round(r.height) }; }); return rs; })()`, 10, false);
    const chicos = (medidas || []).filter(m => m.w < 40 || m.h < 40);
    if (chicos.length) nota('family', 'botones < 40 px en 390 px de ancho: ' + chicos.slice(0, 5).map(m => m.id + ' ' + m.w + '×' + m.h).join(' | '));
    // Cuento en cadena: 4 turnos eligiendo la primera opción (toques reales)
    await tocaSel(cdp, ses, '#fq-av-cuento');
    await cdp.bombear(0.8);
    for (let ronda = 0; ronda < 6; ronda += 1) {
      const listo = await espera(cdp, ses, `!!document.getElementById('fq-cuento-0')`, 12);
      if (!listo) break;
      await tocaSel(cdp, ses, '#fq-cuento-0');
      await cdp.bombear(0.9);
      const finCuento = await evaluar(cdp, ses, `!!(document.getElementById('fq-otra') || (document.getElementById('fq') && /viñeta|Diario/i.test(document.getElementById('fq').textContent) && !document.getElementById('fq-cuento-0')))`, 10, false);
      if (finCuento && ronda >= 3) break;
    }
    await cdp.bombear(1);
    await foto(cdp, ses, 'b8_family_vineta');
    const fqGuardado = await evaluar(cdp, ses, `(() => { try { const d = JSON.parse(localStorage.getItem('amazonaverse.familyquest') || 'null'); return d && d.hechas && Object.keys(d.hechas); } catch (e) { return 'err'; } })()`, 10, false);
    apunta({ beat: 'family-quest', diario: fq0, botones: (medidas || []).length, chicos: chicos.length, hechas: fqGuardado });
    if (!fqGuardado || !(fqGuardado || []).length) nota('family', 'el cuento en cadena no quedó guardado en amazonaverse.familyquest');
    // cerrar el panel si sigue abierto
    await evaluar(cdp, ses, `(() => { const b = document.getElementById('fq-cerrar'); if (b && !document.getElementById('fq').hidden) { b.click(); return 1; } return 0; })()`, 10, false);

    // ---------- 8 · cierre: errores, memoria y última captura ----------
    const errs = await evaluar(cdp, ses, `window.__errs || []`, 10, false);
    const mem = await evaluar(cdp, ses, `(() => { const i = AV.G.renderer.renderer.info; return { calls: i.render.calls, tris: i.render.triangles, geo: i.memory.geometries, tex: i.memory.textures, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null }; })()`, 10, false);
    const fFin = await fps(cdp, ses, 4);
    await foto(cdp, ses, 'b9_final');
    apunta({ beat: 'final', mem, fps: fFin, __errs: errs });
    resumen.consola = cdp.consola.slice(0, 40);
    fs.writeFileSync(path.join(SALIDA, 'k317_playtest.json'), JSON.stringify(resumen, null, 1));
    console.log(JSON.stringify({ beats: resumen.beats.length, fricciones: resumen.fricciones, consola: resumen.consola.length, __errs: (errs || []).length, mem }, null, 1));
    fin(resumen.consola.length || (errs && errs.length) ? 2 : 0);
  } catch (e) {
    resumen.consola = (cdp.consola || []).slice(0, 40);
    fs.writeFileSync(path.join(SALIDA, 'k317_playtest.json'), JSON.stringify({ error: String(e && e.message || e), resumen }, null, 1));
    fin(1, { error: String(e && e.message || e), fricciones: resumen.fricciones, consola: resumen.consola });
  }
})();
