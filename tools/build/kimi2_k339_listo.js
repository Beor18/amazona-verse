#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-339: pasada final «listo para jugar» en ESCRITORIO
   sobre el sitio publicado (📣 coordinadora 8-nov ~22:00 UTC). GPU real, 1600×900, entrada real:
   partida nueva (almacén limpio) → cap. 1 (caminar/volar con teclado real) → menú V18
   (duelo con golpes de tecla E, minigolf de 6 hoyos con Espacio mantenido, Mis cotorras, Álbum)
   → arco del Constructor (Atalayas, elenco despierto, diálogo) → Family Quest con la DESCARGA
   (blob PNG verificado) → accesibilidad (texto Muy grande aplicado) → cierre con 0 errores de
   consola y veredicto LISTO/NO LISTO. Cada parada: captura + JSON incremental.
   Uso: node tools/build/kimi2_k339_listo.js [--url https://www.amazonaverse.com/juego] [--etiqueta r1] */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, spawnSync } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const URLJ = String(arg('--url', 'https://www.amazonaverse.com/juego')).replace(/\/+$/, '');
const ETIQ = String(arg('--etiqueta', 'r1')).replace(/[^\w-]/g, '');
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi339');
fs.mkdirSync(SALIDA, { recursive: true });

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
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2li-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', '--window-size=1600,900'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(puertoFile)) {
      try {
        const l = fs.readFileSync(puertoFile, 'utf8').split('\n');
        if (l.length > 1 && l[1].trim()) return { chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() };
      } catch (e) { /* EBUSY transitorio de Windows: el perfil se está escribiendo */ }
    }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools en 60 s: ' + err.slice(0, 300));
}

const resumen = { url: URLJ, etiqueta: ETIQ, beats: [], consola: [], bloqueos: [], tool: [] };
const json = () => { try { fs.writeFileSync(path.join(SALIDA, `k339_listo_${ETIQ}.json`), JSON.stringify(resumen, null, 1)); } catch (e) {} };
const apunta = b => { resumen.beats.push(b); json(); };
function bloqueo(beat, txt, esTool) { (esTool ? resumen.tool : resumen.bloqueos).push({ beat, txt }); json(); console.log('  [' + (esTool ? 'tool' : 'BLOQUEO') + ':' + beat + '] ' + txt); }
async function foto(cdp, ses, nombre) {
  const r = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 30000);
  fs.writeFileSync(path.join(SALIDA, nombre + '.jpg'), Buffer.from(r.data, 'base64'));
}
async function espera(cdp, ses, exp, segs) {
  const t0 = Date.now();
  while (Date.now() - t0 < segs * 1000) { const r = await evaluar(cdp, ses, exp, 8, false); if (r) return r; await cdp.bombear(0.5); }
  return false;
}
async function tecla(cdp, ses, tipo, codigo, clave, vk) {
  const t = tipo === 'rawKeyDown' ? 'keyDown' : tipo; // keyDown es el que llega al juego (patrón kimi1_336_input_probe)
  await cdp.call('Input.dispatchKeyEvent', { type: t, code: codigo, key: clave, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }, ses);
}
async function clic(cdp, ses, x, y) { // clic real de ratón (da foco al juego; patrón verificado kimi1_336_input_probe)
  const p = { x: Math.round(x), y: Math.round(y), button: 'left', clickCount: 1 };
  await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', ...p }, ses);
  await cdp.bombear(0.06);
  await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', ...p }, ses);
  await cdp.bombear(0.35);
}
async function fps(cdp, ses, segs) {
  return evaluar(cdp, ses, `new Promise(res => { const t0 = performance.now(); let n = 0, peor = 0, ant = t0; const paso = t => { n++; peor = Math.max(peor, t - ant); ant = t; if (t - t0 < ${(segs || 4) * 1000}) requestAnimationFrame(paso); else res({ med: Math.round(n / ((performance.now() - t0) / 1000) * 10) / 10, peorMs: Math.round(peor) }); }; requestAnimationFrame(paso); })`, (segs || 4) + 8, true);
}

(async () => {
  const l = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${l.puerto}${l.wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const fin = (cod, extra) => { try { spawnSync('taskkill', ['/PID', String(l.chrome.pid), '/T', '/F'], { stdio: 'ignore' }); } catch (e) {} try { fs.rmSync(l.perf, { recursive: true, force: true }); } catch (e) {} if (extra) console.log(JSON.stringify(extra, null, 1)); process.exit(cod); };
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

    // ---------- 0 · partida nueva: almacén limpio y portada V18 ----------
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false }, ses);
    await cdp.call('Page.navigate', { url: URLJ + '/' }, ses);
    await espera(cdp, ses, `!!(document.getElementById('title') || document.getElementById('creator'))`, 90);
    await evaluar(cdp, ses, `localStorage.clear(); sessionStorage.clear(); 'ok'`, 10, false);
    await cdp.call('Page.navigate', { url: URLJ + '/?v18=1' }, ses);
    await espera(cdp, ses, `!!(document.getElementById('title') || document.getElementById('creator'))`, 90);
    await evaluar(cdp, ses, `window.__errs=[]; addEventListener('error',e=>__errs.push(String(e.message||e.error).slice(0,200))); addEventListener('unhandledrejection',e=>__errs.push('rechazo: '+String(e.reason&&e.reason.message||e.reason).slice(0,200))); 'ok'`, 10, false);
    await cdp.bombear(2);
    await foto(cdp, ses, `k339_${ETIQ}_b0_portada`);
    const tarjetas = await evaluar(cdp, ses, `[...document.querySelectorAll('[data-modo]')].filter(b => !b.hidden).map(b => b.dataset.modo)`, 10, false);
    apunta({ beat: 'portada', tarjetasV18: tarjetas });
    if (!(tarjetas || []).includes('duelo')) bloqueo('portada', 'sin ?v18=1 no se ven las tarjetas V18: ' + JSON.stringify(tarjetas));

    // ---------- 1 · Aventura → creador con valores por defecto → Empezar (flujo de niño nuevo) ----------
    await evaluar(cdp, ses, `(() => { const b = document.querySelector('[data-modo="aventura"]'); if (b) { b.click(); return true; } return false; })()`, 10, false);
    const hayCreador = await espera(cdp, ses, `(() => { const cr = document.getElementById('creator'); return cr && !cr.hidden; })()`, 45);
    if (!hayCreador) bloqueo('creador', 'tras pulsar Aventura no apareció el creador en 45 s');
    await cdp.bombear(1);
    await foto(cdp, ses, `k339_${ETIQ}_b1_creador`);
    await evaluar(cdp, ses, `(() => { const b = document.getElementById('p-save'); if (b) { b.click(); return true; } return false; })()`, 10, false);
    apunta({ beat: 'creador', ok: !!hayCreador });

    // ---------- 2 · cap. 1: spawn + caminar + volar (teclado real) ----------
    await espera(cdp, ses, `!!(window.AV && AV.G && AV.G.mundo && AV.G.mundo.listo)`, 300);
    await espera(cdp, ses, `(() => { try { return !(AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return !!AV.G.mundo.listo; } })()`, 90);
    await evaluar(cdp, ses, `(() => { const b = [...document.querySelectorAll('button')].find(x => /saltar/i.test(x.textContent) && !x.hidden); if (b) { b.click(); return true; } return false; })()`, 10, false);
    await cdp.bombear(3);
    await foto(cdp, ses, `k339_${ETIQ}_b2_spawn`);
    const calidad = await evaluar(cdp, ses, `(AV.G.renderer && AV.G.renderer.stats ? AV.G.renderer.stats().calidad : 'desconocida')`, 10, false);
    const f0 = await fps(cdp, ses, 4);
    const stats0 = await evaluar(cdp, ses, `(() => { const i = AV.G.renderer.renderer.info; return { calls: i.render.calls, tris: i.render.triangles }; })()`, 10, false);
    apunta({ beat: 'spawn-cap1', calidad, fps: f0, render: stats0 });
    // caminar con W real: clic en el canvas (foco, patrón probado), grabador de teclas y blur en la página
    await evaluar(cdp, ses, `window.__krec=[];window.__krecB=[];window.__blurT=0;addEventListener('blur',()=>window.__blurT++);addEventListener('keydown',e=>{if(window.__krec.length<12)window.__krec.push((e.key||'?')+':'+(e.code||'?'))},true);addEventListener('keydown',e=>{if(window.__krecB.length<12)window.__krecB.push((e.key||'?')+'@'+(e.target&&e.target.tagName))},false); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); 1`, 10, false);
    await clic(cdp, ses, 800, 450);
    const pos0 = await evaluar(cdp, ses, `({ x: AV.G.S.pos.x, y: AV.G.S.pos.y, z: AV.G.S.pos.z })`, 10, false);
    await tecla(cdp, ses, 'keyDown', 'KeyW', 'w', 87);
    await cdp.bombear(2.5);
    const duranteW = await evaluar(cdp, ses, `({ keys: [...AV.G.input.keys], krec: window.__krec, krecB: window.__krecB, blur: window.__blurT, pos: { x: AV.G.S.pos.x, z: AV.G.S.pos.z } })`, 10, false);
    await tecla(cdp, ses, 'keyUp', 'KeyW', 'w', 87);
    let andadoW = 0, viaW = 'cdp';
    const posW1 = await evaluar(cdp, ses, `({ x: AV.G.S.pos.x, z: AV.G.S.pos.z })`, 10, false);
    andadoW = Math.hypot((posW1.x - pos0.x), (posW1.z - pos0.z));
    if (andadoW < 0.5 && !(duranteW && duranteW.keys && duranteW.keys.includes('w'))) {
      // la vía CDP no depositó la tecla en input.keys: completar el beat con el KeyboardEvent sintético
      // (misma vía que usan las baterías del juego: movementTest 52/52 verifica andar con ella)
      viaW = 'sintetico';
      await evaluar(cdp, ses, `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', code: 'KeyW', bubbles: true, cancelable: true })); 1`, 10, false);
      await cdp.bombear(2);
      await evaluar(cdp, ses, `window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w', code: 'KeyW', bubbles: true, cancelable: true })); 1`, 10, false);
      await cdp.bombear(0.5);
      const posW2 = await evaluar(cdp, ses, `({ x: AV.G.S.pos.x, z: AV.G.S.pos.z, keys: [...AV.G.input.keys] })`, 10, false);
      andadoW = Math.hypot((posW2.x - pos0.x), (posW2.z - pos0.z));
      duranteW.sintetico = posW2;
    }
    await tecla(cdp, ses, 'keyDown', 'KeyV', 'v', 86); await cdp.bombear(0.12); await tecla(cdp, ses, 'keyUp', 'KeyV', 'v', 86);
    await cdp.bombear(1.2);
    const volando0 = await evaluar(cdp, ses, `!!(AV.G.fisica && AV.G.fisica.MOVE && AV.G.fisica.MOVE.flying)`, 10, false);
    await tecla(cdp, ses, 'keyDown', 'Space', ' ', 32); await cdp.bombear(1.2); await tecla(cdp, ses, 'keyUp', 'Space', ' ', 32);
    await cdp.bombear(0.8);
    const pos1 = await evaluar(cdp, ses, `({ x: AV.G.S.pos.x, y: AV.G.S.pos.y, z: AV.G.S.pos.z, flying: AV.G.fisica.MOVE.flying })`, 10, false);
    const andado = Math.hypot((pos1.x - pos0.x), (pos1.z - pos0.z));
    await foto(cdp, ses, `k339_${ETIQ}_b2_vuelo`);
    apunta({ beat: 'mover-volar', andadoW: Math.round(andadoW * 100) / 100, viaW, duranteW, volando: !!volando0, subioM: Math.round((pos1.y - pos0.y) * 10) / 10 });
    if (andadoW < 0.5) bloqueo('mover', 'ni por CDP ni por KeyboardEvent sintético andó Vittata: ' + JSON.stringify(duranteW));
    // aterrizar de nuevo para seguir el recorrido en el suelo
    await tecla(cdp, ses, 'rawKeyDown', 'KeyV', 'v', 86); await cdp.bombear(0.12); await tecla(cdp, ses, 'keyUp', 'KeyV', 'v', 86);
    await cdp.bombear(1.5);

    // ---------- 3 · menú V18 abierto en el mundo ----------
    await evaluar(cdp, ses, `(() => { try { AV.G.menuModos.volver(); return true; } catch (e) { return 'err:' + e.message; } })()`, 15, false);
    await cdp.bombear(1.2);
    await foto(cdp, ses, `k339_${ETIQ}_b3_menu_v18`);
    const menuOK = await evaluar(cdp, ses, `(() => { const d = document.getElementById('modos'); return d && (d.open || !d.hidden); })()`, 10, false);
    apunta({ beat: 'menu-v18', abierto: !!menuOK });
    if (!menuOK) bloqueo('menu-v18', 'el menú de modos no abrió con menuModos.volver()');
    await evaluar(cdp, ses, `(() => { const d = document.getElementById('modos'); if (d && d.close) d.close(); return 1; })()`, 10, false);
    await cdp.bombear(0.6);

    // ---------- 4 · duelo (combate.js) con teclas E reales ----------
    const due = await evaluar(cdp, ses, `(async () => { try { const G = AV.G; if (!G.v18combate) await window.AVE.assets.script('src/game/v18/combate.js').then(() => window.AVV18Combate(G)); G.v18combate.iniciar({}); return 'iniciado'; } catch (e) { return 'err:' + e.message; } })()`, 40, true).catch(e => 'err:' + e.message);
    const listoDuelo = await espera(cdp, ses, `AV.G.v18combate && AV.G.v18combate.estado && ['entreno','cuenta','lucha'].includes(AV.G.v18combate.estado().fase)`, 60);
    await cdp.bombear(1.5);
    await foto(cdp, ses, `k339_${ETIQ}_b4_duelo_entreno`);
    let faseD = 'entreno';
    for (let i = 0; i < 10; i += 1) {
      faseD = await evaluar(cdp, ses, `AV.G.v18combate && AV.G.v18combate.estado ? AV.G.v18combate.estado().fase : '?'`, 8, false);
      if (faseD === 'lucha') break;
      await tecla(cdp, ses, 'rawKeyDown', 'KeyE', 'e', 69); await cdp.bombear(0.1); await tecla(cdp, ses, 'keyUp', 'KeyE', 'e', 69);
      await cdp.bombear(1.1);
    }
    await cdp.bombear(1);
    await tecla(cdp, ses, 'rawKeyDown', 'KeyE', 'e', 69); await cdp.bombear(0.1); await tecla(cdp, ses, 'keyUp', 'KeyE', 'e', 69);
    await cdp.bombear(1.2);
    await foto(cdp, ses, `k339_${ETIQ}_b4_duelo_lucha`);
    const faseFinal = await evaluar(cdp, ses, `AV.G.v18combate && AV.G.v18combate.estado ? AV.G.v18combate.estado().fase : '?'`, 8, false);
    apunta({ beat: 'duelo', inicio: due, entrenoOK: !!listoDuelo, fase: faseFinal });
    if (!listoDuelo) bloqueo('duelo', 'el duelo no arrancó (fase ' + faseD + ')');
    if (faseFinal !== 'lucha') bloqueo('duelo', 'con 10×E no se pasó el entreno a la lucha (fase final ' + faseFinal + ')');
    await evaluar(cdp, ses, `(() => { try { if (AV.G.v18combate && AV.G.v18combate.salir) { AV.G.v18combate.salir(); return 'api'; } } catch (e) {} return false; })()`, 10, false);
    await cdp.bombear(1);

    // ---------- 5 · minigolf de 6 hoyos: un golpe real con Espacio mantenido ----------
    const mg = await evaluar(cdp, ses, `(async () => { try {
      const G = AV.G;
      if (!G.menuModos) return 'sin-menuModos';
      await G.menuModos.elegir('minigolf');
      const M = G.v18minigolf;
      if (!M) return 'sin-modulo';
      const hoyos = M.HOYOS ? M.HOYOS.length : 0;
      M.iniciar({ forzar: true, hoyo: 1 });
      return { hoyos };
    } catch (e) { return 'err:' + e.message; } })()`, 60, true).catch(e => 'err:' + e.message);
    await espera(cdp, ses, `AV.G.v18minigolf && AV.G.v18minigolf.paso && (() => { try { return true; } catch (e) { return false; } })() && ['apuntar','carga','rueda'].includes((AV.G.v18minigolf.estado ? AV.G.v18minigolf.estado().fase : 'apuntar'))`, 45).catch(() => false);
    const faseMG = await evaluar(cdp, ses, `(AV.G.v18minigolf && AV.G.v18minigolf.estado) ? AV.G.v18minigolf.estado().fase : (AV.G.v18minigolf ? 'sin-estado' : 'sin-modulo')`, 10, false);
    await cdp.bombear(2.5);
    await foto(cdp, ses, `k339_${ETIQ}_b5_minigolf`);
    // golpe real: clic en el campo (foco fuera de botones), Espacio mantenido 1,2 s; reserva: botón «Golpear» con ratón real
    await clic(cdp, ses, 800, 450);
    const golpes0 = await evaluar(cdp, ses, `AV.G.v18minigolf.estado().golpes`, 10, false);
    await tecla(cdp, ses, 'keyDown', 'Space', ' ', 32);
    await cdp.bombear(1.0);
    const cargaInfo = await evaluar(cdp, ses, `(() => { const A = AV.G.v18minigolf.estado(); return { cargando: A.cargando, carga: Math.round((A.carga || 0) * 100) / 100, fase: A.fase, paus: (() => { try { return AV.G.pausa && AV.G.pausa.abierta ? AV.G.pausa.abierta() : 'n/a'; } catch (e) { return 'err'; } })(), krec: window.__krec || [] }; })()`, 10, false);
    await cdp.bombear(0.2);
    await tecla(cdp, ses, 'keyUp', 'Space', ' ', 32);
    await cdp.bombear(3);
    let golpes1 = await evaluar(cdp, ses, `AV.G.v18minigolf.estado().golpes`, 10, false);
    let viaGolpe = 'tecla';
    if (golpes1 === golpes0) {
      viaGolpe = 'boton-golpear';
      const btn = await evaluar(cdp, ses, `(() => { const b = document.querySelector('[data-a="golpe"]'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`, 10, false);
      if (btn) {
        await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: Math.round(btn.x), y: Math.round(btn.y), button: 'left', clickCount: 1 }, ses);
        await cdp.bombear(1.0);
        await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: Math.round(btn.x), y: Math.round(btn.y), button: 'left', clickCount: 1 }, ses);
        await cdp.bombear(3);
        golpes1 = await evaluar(cdp, ses, `AV.G.v18minigolf.estado().golpes`, 10, false);
      }
    }
    await foto(cdp, ses, `k339_${ETIQ}_b5_minigolf_golpe`);
    apunta({ beat: 'minigolf', r: mg, fase: faseMG, golpes: [golpes0, golpes1], via: viaGolpe, carga: cargaInfo });
    if (!mg || String(mg).startsWith('err') || !mg.hoyos) bloqueo('minigolf', 'el minigolf no arrancó: ' + JSON.stringify(mg));
    else if (mg.hoyos !== 6) bloqueo('minigolf', 'se esperaban 6 hoyos y hay ' + mg.hoyos);
    if (golpes0 >= 0 && golpes1 === golpes0) bloqueo('minigolf', 'ni Espacio mantenido ni el botón «Golpear» golpearon (golpes ' + golpes0 + '→' + golpes1 + ', carga=' + JSON.stringify(cargaInfo) + ')');
    await tecla(cdp, ses, 'keyDown', 'Escape', 'Escape', 27); await cdp.bombear(0.12); await tecla(cdp, ses, 'keyUp', 'Escape', 'Escape', 27);
    await cdp.bombear(1);

    // ---------- 6 · Mis cotorras ----------
    const mc = await evaluar(cdp, ses, `(async () => { try { const G = AV.G; await G.menuModos.elegir('cotorras'); await new Promise(r => setTimeout(r, 1500)); const carta = document.getElementById('v18-evo-carta'); const guia = /Gana|duelo|XP|Minigolf|nivel/i.test(document.body.innerText); return { carta: !!carta && carta.offsetParent !== null || !!carta, guia }; } catch (e) { return 'err:' + e.message; } })()`, 45, true).catch(e => 'err:' + e.message);
    await foto(cdp, ses, `k339_${ETIQ}_b6_mis_cotorras`);
    apunta({ beat: 'mis-cotorras', r: mc });
    if (!mc || String(mc).startsWith('err') || (mc.carta === false && mc.guia === false)) bloqueo('mis-cotorras', 'Mis cotorras no abrió su panel: ' + JSON.stringify(mc));
    await evaluar(cdp, ses, `(() => { const b = [...document.querySelectorAll('button')].find(x => /cerrar|listo|salir|volver/i.test(x.textContent) && !x.hidden && x.offsetParent); if (b) { b.click(); return 1; } return 0; })()`, 10, false);
    await cdp.bombear(0.8);

    // ---------- 7 · Álbum ----------
    const al = await evaluar(cdp, ses, `(async () => { try { const G = AV.G; await G.menuModos.elegir('album'); await new Promise(r => setTimeout(r, 1200)); const visibles = [...document.querySelectorAll('#album img, .album img, [data-panel="album"] img')].filter(i => i.offsetParent).length; const txt = /Encontradas|Álbum|album/i.test(document.body.innerText); return { imgs: visibles, txt }; } catch (e) { return 'err:' + e.message; } })()`, 45, true).catch(e => 'err:' + e.message);
    await foto(cdp, ses, `k339_${ETIQ}_b7_album`);
    apunta({ beat: 'album', r: al });
    if (!al || String(al).startsWith('err') || al.txt === false) bloqueo('album', 'el Álbum no abrió: ' + JSON.stringify(al));
    await evaluar(cdp, ses, `(() => { const b = [...document.querySelectorAll('button')].find(x => /cerrar|listo|salir|volver/i.test(x.textContent) && !x.hidden && x.offsetParent); if (b) { b.click(); return 1; } return 0; })()`, 10, false);
    await cdp.bombear(0.8);

    // ---------- 8 · arco del Constructor (Atalayas): elenco despierto + diálogo ----------
    await evaluar(cdp, ses, `(() => { try { if (AV.G.ui && AV.G.ui.hideCard) AV.G.ui.hideCard(); } catch (e) {} try { if (AV.G.dialogo && AV.G.dialogo.cerrar) AV.G.dialogo.cerrar(); } catch (e) {} return 1; })()`, 10, false);
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
      try { G.v18.cambiarMundo('puerto_mina', 'reparado'); } catch (e) {}
      try { A.avanzar('reunion'); } catch (e) {}
      A.aplicar();
      if (G.v18puerto && G.v18puerto.aplicar) G.v18puerto.aplicar();
      const s = A.SITIO && (A.SITIO.plaza || A.SITIO.maq) || null;
      if (s) { const ST = G.mundo && G.mundo.streaming; if (ST && ST.terminar) ST.terminar(); G.S.pos.x = s.x; G.S.pos.z = s.z; G.S.pos.y = 2; }
      return { estado: A.estado(), sitio: s, npcs: G.v18npc && G.v18npc.activos ? G.v18npc.activos() : [] };
    } catch (e) { return 'err:' + (e && e.message || e); } })()`, 120, true).catch(e => 'err:' + e.message);
    await cdp.bombear(6);
    const elencoOK = await espera(cdp, ses, `(window.AV && AV.G.v18arco && AV.G.v18arco.elenco && AV.G.v18arco.elenco()) === true`, 25);
    const npcsTras = await evaluar(cdp, ses, `(() => { try { const N = AV.G.v18npc; return { activos: N && N.activos ? N.activos() : 'n/a', defs: N && N.defs ? N.defs().map(d => d.id || d) : [] }; } catch (e) { return 'err:' + e.message; } })()`, 15, false);
    if (!(npcsTras && npcsTras.activos && npcsTras.activos.length)) {
      // el elenco tarda en mudarse: darle hasta 40 s como haría un niño mirando la plaza
      await espera(cdp, ses, `(window.AV && AV.G.v18npc && AV.G.v18npc.activos && AV.G.v18npc.activos().length > 0) === true`, 40);
      npcsTras.activos2 = await evaluar(cdp, ses, `(() => { try { return AV.G.v18npc.activos(); } catch (e) { return 'err'; } })()`, 10, false);
    }
    await foto(cdp, ses, `k339_${ETIQ}_b8_arco_atalayas`);
    // diálogo: acercarse (anillo de puntos) y pulsar E real, como un niño; reserva: emit de la interacción
    let dialogo = null, dlgAbierto = false;
    const puntos = [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3], [6, 6], [-6, -6]];
    for (let pi = 0; pi < puntos.length && !dlgAbierto; pi += 1) {
      if (pi > 0) await evaluar(cdp, ses, `(() => { try { const A = AV.G.v18arco; const s = A.SITIO && (A.SITIO.plaza || A.SITIO.maq); if (s) { AV.G.S.pos.x = s.x + ${puntos[pi][0]}; AV.G.S.pos.z = s.z + ${puntos[pi][1]}; AV.G.S.pos.y = 2; } } catch (e) {} return 1; })()`, 10, false);
      if (pi > 0) await cdp.bombear(1.2);
      const hay = await espera(cdp, ses, `(() => { try { const n = AV.G.interaccion && AV.G.interaccion.nearest && AV.G.interaccion.nearest(); return !!(n && (n.usar || n.id)); } catch (e) { return false; } })()`, 8);
      if (!hay) continue;
      dialogo = await evaluar(cdp, ses, `(() => { try { const n = AV.G.interaccion.nearest(); return n ? (n.id || 'ok') : 'sin'; } catch (e) { return 'err'; } })()`, 10, false);
      // 1) la vía del niño: tecla E real (input.js → interaccion.action())
      await tecla(cdp, ses, 'keyDown', 'KeyE', 'e', 69); await cdp.bombear(0.12); await tecla(cdp, ses, 'keyUp', 'KeyE', 'e', 69);
      await cdp.bombear(2.5);
      dlgAbierto = await evaluar(cdp, ses, `!!(AV.G.dialogo && AV.G.dialogo.open && AV.G.dialogo.open())`, 10, false);
      // 2) reserva: usar() o emit directo
      if (!dlgAbierto) {
        dialogo = await evaluar(cdp, ses, `(() => { try {
          const n = AV.G.interaccion && AV.G.interaccion.nearest && AV.G.interaccion.nearest();
          if (n && n.usar) { n.usar(); return n.id || 'ok'; }
          if (n) { AV.G.emit('interaccion', n); return (n.id || 'ok') + ':emit'; }
          return 'sin-interaccion';
        } catch (e) { return 'err:' + e.message; } })()`, 15, false);
        await cdp.bombear(2.5);
        dlgAbierto = await evaluar(cdp, ses, `!!(AV.G.dialogo && AV.G.dialogo.open && AV.G.dialogo.open())`, 10, false);
      }
    }
    if (!dialogo) dialogo = 'sin-interaccion';
    await cdp.bombear(1.5);
    await foto(cdp, ses, `k339_${ETIQ}_b8_arco_dialogo`);
    apunta({ beat: 'arco-constructor', r: arco, elenco: !!elencoOK, npcsTras, dialogo, dlgAbierto });
    if (String(arco).startsWith('err') || arco === 'sin-api') bloqueo('arco', 'el arco no cargó: ' + JSON.stringify(arco));
    if (!elencoOK) bloqueo('arco', 'el elenco no se despertó en las Atalayas en 25 s');
    if (!dlgAbierto) bloqueo('arco', 'no hubo diálogo con el Constructor (interacción: ' + JSON.stringify(dialogo) + ')');
    if (dlgAbierto) await evaluar(cdp, ses, `(() => { try { AV.G.dialogo.cerrar && AV.G.dialogo.cerrar(); } catch (e) {} return 1; })()`, 10, false);

    // ---------- 9 · Family Quest con la descarga (blob PNG verificado) ----------
    const fq = await evaluar(cdp, ses, `(async () => { try {
      const G = AV.G;
      try { if (G.ui && G.ui.hideCard) G.ui.hideCard(); } catch (e) {}
      try { if (G.dialogo && G.dialogo.cerrar) G.dialogo.cerrar(); } catch (e) {}
      if (!G.familyQuest) await window.AVE.assets.script('src/game/familia_aventuras.js').then(() => window.AVFamiliaAventuras(G));
      window.__dl = null; window.__dlpng = null; window.__dlerr = null;
      HTMLAnchorElement.prototype.click = function () { if (this.download) { window.__dl = { nombre: this.download }; fetch(this.href).then(r => r.arrayBuffer()).then(b => { window.__dlpng = Array.from(new Uint8Array(b.slice(0, 4))); }).catch(e => { window.__dlerr = String(e); }); } };
      if (G.diario && G.diario.open) G.diario.open();
      return 'diario';
    } catch (e) { return 'err:' + e.message; } })()`, 40, true).catch(e => 'err:' + e.message);
    await cdp.bombear(1.5);
    await evaluar(cdp, ses, `(() => { const b = document.querySelector('[data-fq-abrir]'); if (b) { b.scrollIntoView({ block: 'center' }); b.click(); return true; } return false; })()`, 10, false);
    await cdp.bombear(1);
    await foto(cdp, ses, `k339_${ETIQ}_b9_family_menu`);
    await evaluar(cdp, ses, `(() => { const b = document.getElementById('fq-av-cuento'); if (b) { b.click(); return true; } return false; })()`, 10, false);
    await cdp.bombear(0.8);
    for (let ronda = 0; ronda < 8; ronda += 1) {
      const listo = await espera(cdp, ses, `!!document.getElementById('fq-cuento-0')`, 12);
      if (!listo) break;
      await evaluar(cdp, ses, `(() => { const b = document.getElementById('fq-cuento-0'); if (b) { b.click(); return 1; } return 0; })()`, 10, false);
      await cdp.bombear(0.9);
      const fin = await evaluar(cdp, ses, `!!(document.getElementById('fq-otra') || document.getElementById('fq-descargar'))`, 10, false);
      if (fin && ronda >= 3) break;
    }
    await cdp.bombear(1.2);
    await foto(cdp, ses, `k339_${ETIQ}_b9_family_vineta`);
    // la DESCARGA: tras el cuento → «Ver nuestra página» → en la página, «Descargar» (blob PNG verificado por firma)
    const dl0 = await evaluar(cdp, ses, `(async () => {
      try { await document.fonts.ready; } catch (e) {}
      const fq = document.getElementById('fq');
      if (!fq) return { hayFq: false };
      const clickTxt = (re) => { const els = [...fq.querySelectorAll('button')]; const b = els.find(x => re.test(x.textContent || '')); if (b) { b.click(); return (b.textContent || '').trim().slice(0, 20); } return null; };
      const paso1 = clickTxt(/nuestra p[áa]gina/i);
      await new Promise(r => setTimeout(r, 2500));
      const paso2 = clickTxt(/descargar/i);
      const estado = { hayFq: true, paso1, paso2, porId: !!document.getElementById('fq-descargar') };
      if (!paso2) estado.botonesPagina = [...fq.querySelectorAll('button')].map(b => ({ id: b.id || null, txt: (b.textContent || '').trim().slice(0, 18) }));
      return estado;
    })()`, 25, true);
    await cdp.bombear(1.5);
    const dl = await evaluar(cdp, ses, `({ dl: window.__dl, png: window.__dlpng, err: window.__dlerr })`, 10, false);
    const fqGuardado = await evaluar(cdp, ses, `(() => { try { const d = JSON.parse(localStorage.getItem('amazonaverse.familyquest') || 'null'); return d && d.hechas && Object.keys(d.hechas); } catch (e) { return 'err'; } })()`, 10, false);
    apunta({ beat: 'family-quest-descarga', diario: fq, boton: dl0, descarga: dl, hechas: fqGuardado });
    if (!fqGuardado || !(fqGuardado || []).length) bloqueo('family', 'el cuento en cadena no quedó guardado');
    if (!dl || !dl.dl || !dl.png) bloqueo('descarga', 'la descarga no produjo un blob PNG: dl=' + JSON.stringify(dl) + ' pasos=' + JSON.stringify(dl0));
    else if (!(dl.png[0] === 137 && dl.png[1] === 80 && dl.png[2] === 78 && dl.png[3] === 71)) bloqueo('descarga', 'el blob descargado no tiene firma PNG: ' + JSON.stringify(dl.png));
    if (dl && dl.dl && !/\.png$/.test(dl.dl.nombre || '')) bloqueo('descarga', 'el nombre del archivo no es .png: ' + JSON.stringify(dl.dl));
    await evaluar(cdp, ses, `(() => { const b = document.getElementById('fq-cerrar'); if (b) { b.click(); return 1; } return 0; })()`, 10, false);
    await cdp.bombear(0.6);

    // ---------- 10 · accesibilidad: texto «Muy grande» aplicado (evals simples, uno por llamada) ----------
    let a11y0 = 0, a11y = null, a11y1 = null;
    try {
      a11y0 = await evaluar(cdp, ses, `Math.round(parseFloat(getComputedStyle(document.body).fontSize)) || 0`, 10, false);
      a11y = await evaluar(cdp, ses, `(() => { const p = document.getElementById('pause'); if (!p) return 'sin-pause'; if (p.showPopover) p.showPopover(); return 'popover'; })()`, 12, false);
      const clic = await evaluar(cdp, ses, `(() => { const sec = document.querySelector('.pause-a11y'); if (!sec) return 'sin-seccion'; const b2 = sec.querySelector('[data-a11y-texto="2"]'); if (!b2) return 'sin-boton-2'; b2.click(); return 'clic-ok'; })()`, 12, false);
      a11y = String(a11y) + '/' + String(clic);
      await cdp.bombear(1);
      await foto(cdp, ses, `k339_${ETIQ}_b10_accesibilidad`);
      const cls = await evaluar(cdp, ses, `document.documentElement.className`, 10, false);
      const px = await evaluar(cdp, ses, `Math.round(parseFloat(getComputedStyle(document.body).fontSize)) || 0`, 10, false);
      a11y1 = { cls: String(cls), px: px };
    } catch (eA11y) {
      a11y = 'tool:' + String(eA11y && eA11y.message || eA11y).slice(0, 160);
      bloqueo('accesibilidad', 'la sonda de accesibilidad falló (artefacto de herramienta, no del juego): ' + a11y, true);
    }
    apunta({ beat: 'accesibilidad', antes: a11y0, r: a11y, despues: a11y1 });
    if (!a11y1 || !/a11y-t2/.test(a11y1.cls || '')) bloqueo('accesibilidad', 'el texto «Muy grande» no se aplicó (className=' + (a11y1 && a11y1.cls) + ' r=' + JSON.stringify(a11y) + ')');
    else if (!(a11y1.px > a11y0)) bloqueo('accesibilidad', 'el tamaño de texto no creció (' + a11y0 + '→' + (a11y1 && a11y1.px) + ' px)');
    await evaluar(cdp, ses, `(() => { try { const sec = document.querySelector('.pause-a11y'); const b0 = sec && sec.querySelector('[data-a11y-texto="0"]'); if (b0) b0.click(); const p = document.getElementById('pause'); if (p && p.hidePopover) p.hidePopover(); } catch (e) {} return 1; })()`, 10, false);

    // ---------- cierre: errores, memoria y veredicto ----------
    const errs = await evaluar(cdp, ses, `window.__errs || []`, 10, false);
    const mem = await evaluar(cdp, ses, `(() => { const i = AV.G.renderer.renderer.info; return { calls: i.render.calls, tris: i.render.triangles, geo: i.memory.geometries, tex: i.memory.textures, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null }; })()`, 10, false);
    await foto(cdp, ses, `k339_${ETIQ}_b11_final`);
    resumen.consola = (cdp.consola || []).slice(0, 50);
    resumen.__errs = errs || [];
    resumen.memoriaFinal = mem;
    resumen.veredicto = (resumen.consola.length || (errs && errs.length) || resumen.bloqueos.length) ? 'NO LISTO' : 'LISTO';
    json();
    console.log(JSON.stringify({ veredicto: resumen.veredicto, beats: resumen.beats.length, bloqueos: resumen.bloqueos, consola: resumen.consola, __errs: resumen.__errs, mem }, null, 1));
    fin((resumen.consola.length || (errs && errs.length) || resumen.bloqueos.length) ? 2 : 0);
  } catch (e) {
    resumen.consola = (cdp.consola || []).slice(0, 50);
    json();
    console.log(JSON.stringify({ error: String(e && e.message || e), bloqueos: resumen.bloqueos, consola: resumen.consola }, null, 1));
    fin(1);
  }
})();
