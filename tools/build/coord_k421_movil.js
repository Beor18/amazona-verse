#!/usr/bin/env node
/* Amazona Verse · coordinadora — K4-21: pasada final «listo para jugar» en MÓVIL TÁCTIL sobre el sitio publicado.
   Sustituye a Kimi 4 (sin actividad). Misma ruta que KIMI-339 (escritorio, tools/build/kimi2_k339_listo.js) pero con
   toques reales (CDP Input.dispatchTouchEvent → pointer events «touch»): joystick, Volar/Saltar/Acción, botones de los paneles.
   Dos perfiles de Playwright: iPhone 13 (390×844, dpr 3, UA iOS) y Pixel 7 (412×839, dpr 2,625, UA Android).
   Sin GPU: SwiftShader (los FPS son solo informativos).
   Uso (Linux de la nube, 1 Chrome a la vez): flock /tmp/av_chrome1.lock node tools/build/coord_k421_movil.js \
          [--url https://www.amazonaverse.com/juego] [--out <carpeta de capturas>] [--perfiles iphone,pixel]
   Sale 0 si LISTO en todos los perfiles; 2 si hay errores de consola o bloqueos. */
'use strict';
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const URLJ = String(arg('--url', 'https://www.amazonaverse.com/juego')).replace(/\/+$/, '');
const OUT = arg('--out', path.join(require('os').tmpdir(), 'k421_movil'));
const PERFILES = String(arg('--perfiles', 'iphone,pixel')).split(',');
fs.mkdirSync(OUT, { recursive: true });
const dormir = ms => new Promise(r => setTimeout(r, ms));

const DISP = {
  iphone: Object.assign({}, devices['iPhone 13'], { viewport: { width: 390, height: 844 } }), // pantalla completa 390×844 (lo pedido)
  pixel: Object.assign({}, devices['Pixel 7']),
};

async function correr(nombre) {
  const d = DISP[nombre];
  const R = { perfil: nombre, viewport: d.viewport, dpr: d.deviceScaleFactor, beats: [], bloqueos: [], avisos: [], consola: [], encaje: [] };
  const bloqueo = (b, t) => { R.bloqueos.push({ beat: b, txt: t }); console.log(`  [${nombre}] BLOQUEO ${b}: ${t}`); };
  const aviso = (b, t) => { R.avisos.push({ beat: b, txt: t }); console.log(`  [${nombre}] aviso ${b}: ${t}`); };
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext(Object.assign({}, d, { acceptDownloads: true }));
  const p = await ctx.newPage();
  p.on('pageerror', e => R.consola.push('EXCEPCIÓN: ' + String(e.message).slice(0, 240)));
  p.on('console', m => { if (m.type() === 'error') R.consola.push('error: ' + m.text().slice(0, 240)); });
  const popups = [];
  ctx.on('page', np => popups.push(np));
  const cdp = await ctx.newCDPSession(p);
  const VW = d.viewport.width, VH = d.viewport.height;
  const ev = (f, a) => p.evaluate(f, a);
  const foto = async n => { const f = path.join(OUT, `${nombre}_${n}.png`); try { await p.screenshot({ path: f, timeout: 60000 }); } catch (e) { aviso('foto', n + ': ' + e.message.slice(0, 80)); } return f; };
  const toque = (tipo, pts) => cdp.send('Input.dispatchTouchEvent', { type: tipo, touchPoints: pts.map((q, i) => ({ x: Math.round(q.x), y: Math.round(q.y), id: q.id != null ? q.id : i, radiusX: 6, radiusY: 6, force: 1 })) });
  const tocar = async (x, y, ms) => { await toque('touchStart', [{ x, y }]); await dormir(ms || 80); await toque('touchEnd', []); };
  const centro = sel => ev(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); if (!r.width || !r.height) return null; return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; }, sel);
  const tocarSel = async (sel, ms) => { const c = await centro(sel); if (!c) return false; await tocar(c.x, c.y, ms); return c; };
  const espera = async (expr, s) => { try { await p.waitForFunction(expr, null, { timeout: s * 1000, polling: 250 }); return true; } catch (e) { return false; } };
  // encaje de un panel en la pantalla: sin desbordar a lo ancho; si es más alto que la pantalla, que se pueda desplazar.
  // Botones visibles más pequeños de 32 px (informativo) y de 24 px (problema de toque).
  const encaje = async (beat, sel) => {
    const r = await ev(([s, vw, vh]) => {
      const e = document.querySelector(s); if (!e) return { sel: s, hay: false };
      const b = e.getBoundingClientRect();
      const ov = el => { let x = el; while (x && x !== document.body) { const cs = getComputedStyle(x); if (/(auto|scroll)/.test(cs.overflowY) && x.scrollHeight > x.clientHeight + 2) return true; x = x.parentElement; } return false; };
      const scrollInterno = (() => { const all = [e, ...e.querySelectorAll('*')]; return all.some(x => { const cs = getComputedStyle(x); return /(auto|scroll)/.test(cs.overflowY) && x.scrollHeight > x.clientHeight + 2; }); })() || ov(e);
      const btns = [...e.querySelectorAll('button, [role=button], a.btn')].filter(x => x.getClientRects().length && getComputedStyle(x).visibility !== 'hidden');
      const peq = btns.map(x => { const q = x.getBoundingClientRect(); return { t: (x.getAttribute('aria-label') || x.textContent || x.id || '').trim().slice(0, 24), w: Math.round(q.width), h: Math.round(q.height), dentro: q.right <= vw + 1 && q.left >= -1 }; });
      const fueraX = peq.filter(x => !x.dentro);
      return { sel: s, hay: true, rect: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)],
        desbordaX: b.left < -1 || b.right > vw + 1, docAncho: document.documentElement.scrollWidth, altoMayor: b.height > vh + 1, scrollInterno,
        nBotones: btns.length, menos32: peq.filter(x => Math.min(x.w, x.h) < 32 && Math.min(x.w, x.h) > 0), menos24: peq.filter(x => Math.min(x.w, x.h) < 24 && Math.min(x.w, x.h) > 0), fueraX };
    }, [sel, VW, VH]);
    r.beat = beat; R.encaje.push(r);
    if (r.hay) {
      if (r.desbordaX || r.docAncho > VW + 1) bloqueo(beat, `panel ${sel} desborda a lo ancho (rect ${r.rect}, doc ${r.docAncho} > ${VW})`);
      if (r.fueraX.length) bloqueo(beat, `botones fuera de pantalla en ${sel}: ${JSON.stringify(r.fueraX.slice(0, 4))}`);
      if (r.altoMayor && !r.scrollInterno) aviso(beat, `panel ${sel} más alto que la pantalla (${r.rect[3]} > ${VH}) sin desplazamiento interno detectado`);
      if (r.menos24.length) aviso(beat, `botones < 24 px en ${sel}: ${JSON.stringify(r.menos24.slice(0, 4))}`);
    }
    return r;
  };
  const fps = segs => ev(s => new Promise(res => { const t0 = performance.now(); let n = 0, peor = 0, ant = t0; const f = t => { n++; peor = Math.max(peor, t - ant); ant = t; if (t - t0 < s * 1000) requestAnimationFrame(f); else res({ med: Math.round(n / ((performance.now() - t0) / 1000) * 10) / 10, peorMs: Math.round(peor) }); }; requestAnimationFrame(f); }), segs);
  const pos = () => ev(() => ({ x: AV.G.S.pos.x, y: AV.G.S.pos.y, z: AV.G.S.pos.z, vuela: !!(AV.G.fisica && AV.G.fisica.MOVE && AV.G.fisica.MOVE.flying) }));
  const apunta = b => { R.beats.push(b); console.log(`  [${nombre}] ${b.beat}: ${JSON.stringify(b).slice(0, 300)}`); };
  const SOLO = arg('--beats', null); const quiero = n => !SOLO || SOLO.split(',').includes(n);
  const paso = async (n, f) => { if (!quiero(n)) return; try { await f(); } catch (e) { bloqueo(n, 'excepción del recorrido: ' + String(e && e.message || e).slice(0, 200)); await foto('error_' + n); } };

  // ---------- 0 · portada (partida nueva: contexto limpio) ----------
  await paso('portada', async () => {
    await p.goto(URLJ + '/?v18=1', { timeout: 120000, waitUntil: 'domcontentloaded' });
    await espera(`!!(document.getElementById('title') || document.getElementById('creator'))`, 120);
    await espera(`(() => { const t = document.getElementById('title'); return t && t.open; })()`, 120);
    await dormir(2500);
    R.build = await ev(() => { const m = document.querySelector('meta[name="ave:build"]'); return m ? m.content : null; });
    const tarj = await ev(() => [...document.querySelectorAll('#modos [data-modo]')].filter(b => !b.hidden && b.getClientRects().length).map(b => b.dataset.modo));
    await foto('b0_portada');
    await encaje('portada', '#title');
    apunta({ beat: 'portada', build: R.build, tarjetas: tarj });
    if (!tarj.includes('duelo') || !tarj.includes('golf')) bloqueo('portada', 'faltan tarjetas V18: ' + tarj);
  });

  // ---------- 1 · Aventura (toque) → creador por defecto → Empezar (toque) ----------
  await paso('creador', async () => {
    await p.$eval('[data-modo="aventura"]', e => e.scrollIntoView({ block: 'center' }));
    await tocarSel('[data-modo="aventura"]');
    const hay = await espera(`(() => { const c = document.getElementById('creator'); return c && !c.hidden && c.getClientRects().length; })()`, 45);
    await dormir(1200);
    await foto('b1_creador');
    await encaje('creador', '#creator');
    await p.$eval('#p-save', e => e.scrollIntoView({ block: 'center' })).catch(() => {});
    const t = await tocarSel('#p-save');
    apunta({ beat: 'creador', abierto: hay, empezar: !!t });
    if (!hay) bloqueo('creador', 'tras tocar Aventura no apareció el creador');
    if (!t) bloqueo('creador', 'no se pudo tocar «Empezar» (#p-save)');
  });

  // ---------- 2 · cap. 1: spawn, caminar con el joystick, volar con los botones ----------
  await paso('cap1', async () => {
    const ok = await espera(`!!(window.AV && AV.G && AV.G.mundo && AV.G.mundo.listo && AV.G.actores && (AV.G.actores.player3D || AV.G.actores.failed3D))`, 420);
    if (!ok) { bloqueo('cap1', 'el mundo no quedó listo en 7 min'); return; }
    await dormir(3000);
    // diálogos / cinemática de apertura: tocar «Saltar» o avanzar el diálogo tocando hasta que no haya
    for (let i = 0; i < 25; i++) {
      const st = await ev(() => { const sk = [...document.querySelectorAll('button')].find(x => /^\s*saltar\b/i.test(x.textContent) && x.getClientRects().length && x.id !== 'b-jump'); if (sk) { const r = sk.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, t: 'saltar' }; } const dl = AV.G.dialogo && AV.G.dialogo.open && AV.G.dialogo.open(); if (dl) { const b = document.querySelector('#dialog button, #dialogo button, .dlg button'); if (b && b.getClientRects().length) { const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, t: 'dlg-boton' }; } return { x: innerWidth / 2, y: innerHeight * 0.8, t: 'dlg' }; } const card = document.getElementById('card'); if (card && !card.hidden) { const b = card.querySelector('button'); if (b) { const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, t: 'card' }; } } return null; });
      if (!st) break;
      await tocar(st.x, st.y); await dormir(900);
    }
    await dormir(1500);
    await foto('b2_spawn');
    const cal = await ev(() => { try { return AV.G.renderer.stats().calidad; } catch (e) { return '?'; } });
    const f0 = await fps(4);
    const hudTactil = await ev(() => ['stick', 'b-fly', 'b-jump', 'b-act', 'b-dash'].map(id => { const e = document.getElementById(id); if (!e) return id + ':no'; const r = e.getBoundingClientRect(); return id + ':' + (r.width ? Math.round(r.width) + '×' + Math.round(r.height) : 'oculto'); }));
    const touchHud = await encaje('hud-tactil', '#acts, .acts, #b-act');
    // caminar: dedo en la mitad izquierda (el joystick nace bajo el dedo) y empujar hacia arriba 3 s
    const p0 = await pos();
    const sx = VW * 0.22, sy = VH * 0.72;
    await toque('touchStart', [{ x: sx, y: sy, id: 1 }]); await dormir(120);
    for (let k = 1; k <= 6; k++) { await toque('touchMove', [{ x: sx, y: sy - k * 9, id: 1 }]); await dormir(40); }
    const durante = await ev(() => { const k = document.getElementById('knob'); return { knob: k && k.style.transform, flot: document.getElementById('stick').classList.contains('flotando') }; });
    await dormir(3000);
    await toque('touchEnd', []);
    await dormir(500);
    const p1 = await pos();
    const andado = Math.hypot(p1.x - p0.x, p1.z - p0.z);
    await foto('b2_caminar');
    // volar: tocar «Volar», mantener «Saltar» para subir
    await tocarSel('#b-fly'); await dormir(1500);
    const vuela = (await pos()).vuela;
    const cj = await centro('#b-jump');
    if (cj) { await toque('touchStart', [{ x: cj.x, y: cj.y, id: 2 }]); await dormir(1500); await toque('touchEnd', []); }
    await dormir(800);
    const p2 = await pos();
    await foto('b2_vuelo');
    apunta({ beat: 'cap1-mover-volar', calidad: cal, fps: f0, hudTactil, joystick: durante, andadoM: Math.round(andado * 100) / 100, volando: vuela, subioM: Math.round((p2.y - p1.y) * 10) / 10 });
    if (andado < 0.5) bloqueo('cap1', 'el joystick táctil no movió a Vittata (' + andado.toFixed(2) + ' m)');
    if (!vuela) bloqueo('cap1', 'el botón Volar no despegó');
    // aterrizar
    await tocarSel('#b-fly'); await dormir(2500);
  });

  // ---------- 3 · menú V18 por toques: Pausa → «Cambiar de juego» ----------
  const abrirMenu = async () => {
    await ev(() => { try { AV.G.ui.hideCard && AV.G.ui.hideCard(); } catch (e) {} });
    const yaAbierto = await ev(() => { const t = document.getElementById('title'); return !!(t && t.open); });
    if (yaAbierto) return 'ya';
    const b = await tocarSel('#b-menu'); await dormir(700);
    const b2 = await tocarSel('#b-menu-modos'); await dormir(1500);
    let ok = await ev(() => { const t = document.getElementById('title'); return !!(t && t.open); });
    if (!ok) { await ev(() => { try { AV.G.menuModos.volver(); } catch (e) {} }); await dormir(1200); ok = await ev(() => { const t = document.getElementById('title'); return !!(t && t.open); }); return ok ? 'api' : false; }
    return b && b2 ? 'toque' : 'mixto';
  };
  // tarjeta del menú: desplazar sin animación, esperar a que se asiente y comprobar con elementFromPoint que el dedo cae en ESA tarjeta
  const tile = async modo => {
    await p.$eval(`[data-modo="${modo}"]`, e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await dormir(900);
    const c = await centro(`[data-modo="${modo}"]`); if (!c) return false;
    const hit = await ev(([x, y]) => { const e = document.elementFromPoint(x, y); const t = e && e.closest('[data-modo]'); return t ? t.dataset.modo : (e ? e.tagName + '#' + e.id : null); }, [c.x, c.y]);
    R.tiles = (R.tiles || []).concat([{ modo, hit, c }]);
    if (hit !== modo) aviso('menu', `el toque para «${modo}» caería en «${hit}» (${Math.round(c.x)},${Math.round(c.y)})`);
    await tocar(c.x, c.y); return c;
  };
  await paso('menu-v18', async () => {
    const via = await abrirMenu();
    await foto('b3_menu_v18');
    await encaje('menu-v18', '#modos');
    apunta({ beat: 'menu-v18', via });
    if (!via) bloqueo('menu-v18', 'no se abrió el menú de modos');
    else if (via === 'api') aviso('menu-v18', 'Pausa → «Cambiar de juego» por toque no abrió el menú; se abrió por API');
  });

  // ---------- 4 · duelo: tarjeta → entreno con «Acción» (= Ala) → lucha ----------
  await paso('duelo', async () => {
    await tile('duelo');
    const arr = await espera(`AV.G.v18combate && AV.G.v18combate.estado && ['entreno','cuenta','lucha'].includes(AV.G.v18combate.estado().fase)`, 90);
    await dormir(2500);
    await foto('b4_duelo_entreno');
    await encaje('duelo', '#v18-duelo');
    const etiquetas = await ev(() => { const t = document.getElementById('v18-duelo-tags'); return t ? !t.hidden : null; });
    let fase = '?';
    for (let i = 0; i < 16; i++) {
      fase = await ev(() => AV.G.v18combate.estado().fase);
      if (fase === 'lucha') break;
      // el entreno pide Ala (Acción), Semilla (Impulso) o Poder (Impulso mantenido): se toca lo que pida la tecla mostrada
      const k = await ev(() => { const e = document.querySelector('#v18-duelo [data-k="entK"]'); return e ? e.textContent.trim() : ''; });
      if (/F/i.test(k)) await tocarSel('#b-dash');
      else if (/G/i.test(k)) await tocarSel('#b-dash', 1200);
      else await tocarSel('#b-act');
      await dormir(1300);
    }
    for (let i = 0; i < 3; i++) { await tocarSel('#b-act'); await dormir(700); }
    fase = await ev(() => AV.G.v18combate.estado().fase);
    await foto('b4_duelo_lucha');
    apunta({ beat: 'duelo', arranco: arr, etiquetasTactiles: etiquetas, fase });
    if (!arr) bloqueo('duelo', 'el duelo no arrancó desde la tarjeta');
    else if (!['lucha', 'fin'].includes(fase)) bloqueo('duelo', 'con toques no se pasó del entreno a la lucha (fase ' + fase + ')');
    await ev(() => { try { AV.G.v18combate.salir && AV.G.v18combate.salir(); } catch (e) {} });
    await dormir(1500);
  });

  // ---------- 5 · minigolf de 6 hoyos: un golpe real con «Golpear» mantenido ----------
  await paso('minigolf', async () => {
    await abrirMenu();
    await tile('golf');
    await espera(`!!(AV.G.v18minigolf && document.getElementById('v18-golf') && !document.getElementById('v18-golf').hidden)`, 90);
    await dormir(2000);
    const hoyos = await ev(() => AV.G.v18minigolf && AV.G.v18minigolf.HOYOS ? AV.G.v18minigolf.HOYOS.length : null);
    await foto('b5_minigolf_elige');
    await encaje('minigolf-elige', '#v18-golf');
    // pantalla de elegir jugadores / hoyo: 1 jugador
    if (await centro('#v18-golf [data-a="j1"]')) { await tocarSel('#v18-golf [data-a="j1"]'); await dormir(1500); }
    if (await centro('#v18-golf [data-a="h1"]')) { await tocarSel('#v18-golf [data-a="h1"]'); await dormir(1500); }
    await espera(`AV.G.v18minigolf.estado && ['apuntar'].includes(AV.G.v18minigolf.estado().fase)`, 30);
    const g0 = await ev(() => AV.G.v18minigolf.estado().golpes);
    const cg = await centro('#v18-golf [data-a="golpe"]');
    let carga = null;
    if (cg) { await toque('touchStart', [{ x: cg.x, y: cg.y, id: 3 }]); await dormir(900); carga = await ev(() => Math.round((AV.G.v18minigolf.estado().carga || 0) * 100) / 100); await toque('touchEnd', []); }
    await dormir(3500);
    const g1 = await ev(() => AV.G.v18minigolf.estado().golpes);
    await foto('b5_minigolf_golpe');
    await encaje('minigolf-juego', '#v18-golf');
    apunta({ beat: 'minigolf', hoyos, golpes: [g0, g1], carga, botonGolpe: cg });
    if (hoyos !== 6) bloqueo('minigolf', 'se esperaban 6 hoyos y hay ' + hoyos);
    if (!(g1 > g0)) bloqueo('minigolf', 'mantener «Golpear» no golpeó (golpes ' + g0 + '→' + g1 + ', carga ' + carga + ')');
    // salir por toque si hay botón; si no, API
    const s = await centro('#v18-golf [data-a="salir"]');
    if (s) await tocar(s.x, s.y); else await ev(() => { try { AV.G.v18minigolf.salir(); } catch (e) {} });
    await dormir(1500);
  });

  // ---------- 6 · Mis cotorras ----------
  await paso('mis-cotorras', async () => {
    await abrirMenu();
    await tile('cotorras');
    const ab = await espera(`!document.getElementById('card').hidden`, 30);
    await dormir(1500);
    await foto('b6_mis_cotorras');
    await encaje('mis-cotorras', '#card');
    const txt = await ev(() => document.getElementById('card').innerText.slice(0, 160).replace(/\s+/g, ' '));
    apunta({ beat: 'mis-cotorras', abierto: ab, txt });
    if (!ab) bloqueo('mis-cotorras', 'el panel no abrió');
    await dormir(500);
    await ev(() => { try { if (!document.getElementById('card').hidden) AV.G.ui.hideCard(); } catch (e) {} });
  });

  // ---------- 7 · Álbum ----------
  await paso('album', async () => {
    await abrirMenu();
    await tile('album');
    const ab = await espera(`!document.getElementById('card').hidden`, 30);
    await dormir(1500);
    await foto('b7_album');
    await encaje('album', '#card');
    const txt = await ev(() => document.getElementById('card').innerText.slice(0, 160).replace(/\s+/g, ' '));
    apunta({ beat: 'album', abierto: ab, txt });
    if (!ab) bloqueo('album', 'el Álbum no abrió');
    const ok = await centro('#mm-album-ok');
    if (ok) await tocar(ok.x, ok.y); else await ev(() => { try { AV.G.ui.hideCard(); } catch (e) {} });
    await dormir(1000);
    // volver al juego: cerrar la portada con «Aventura» (tarjeta)
    const t = await ev(() => { const t = document.getElementById('title'); return !!(t && t.open); });
    if (t) { await tile('aventura'); await dormir(2500); }
  });

  // ---------- 8 · arco del Constructor (Atalayas): elenco despierto + diálogo con «Acción» ----------
  await paso('arco', async () => {
    const arco = await ev(async () => { try {
      const G = AV.G, AVE = window.AVE;
      if (!G.v18) await AVE.assets.script('src/game/v18/progreso.js').then(() => window.AVV18Progreso(G));
      if (!G.v18hab) await AVE.assets.script('src/game/v18/habilidades.js').then(() => window.AVV18Habilidades(G));
      if (!G.v18fx) await AVE.assets.script('src/game/v18/fx_poderes.js').then(() => window.AVV18Fx(G));
      await AVE.assets.script('content/comun/personajes_v18.js');
      if (!G.v18npc) await AVE.assets.script('src/game/v18/npc.js').then(() => window.AVV18Npc(G));
      if (!G.v18puerto) await AVE.assets.script('src/game/v18/puerto.js').then(() => window.AVV18Puerto(G));
      if (!G.v18arco) await AVE.assets.script('src/game/v18/arco.js').then(() => window.AVV18Arco(G));
      const A = G.v18arco; if (!A) return 'sin-api';
      try { G.v18.cambiarMundo('puerto_mina', 'reparado'); } catch (e) {}
      try { A.avanzar('reunion'); } catch (e) {}
      A.aplicar(); if (G.v18puerto && G.v18puerto.aplicar) G.v18puerto.aplicar();
      const s = A.SITIO && (A.SITIO.plaza || A.SITIO.maq) || null;
      if (s) { G.S.pos.x = s.x; G.S.pos.z = s.z; G.S.pos.y = 2; }
      return { estado: A.estado(), sitio: s };
    } catch (e) { return 'err:' + (e && e.message || e); } });
    await dormir(8000);
    const elenco = await espera(`(AV.G.v18arco && AV.G.v18arco.elenco && AV.G.v18arco.elenco()) === true`, 40);
    await espera(`AV.G.v18npc && AV.G.v18npc.activos && AV.G.v18npc.activos().length > 0`, 40);
    const npcs = await ev(() => { try { return AV.G.v18npc.activos(); } catch (e) { return 'err'; } });
    await foto('b8_arco_atalayas');
    let dlg = false, inter = null;
    const pts = [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3], [6, 6], [-6, -6]];
    for (let i = 0; i < pts.length && !dlg; i++) {
      if (i) { await ev(([dx, dz]) => { const s = AV.G.v18arco.SITIO.plaza || AV.G.v18arco.SITIO.maq; AV.G.S.pos.x = s.x + dx; AV.G.S.pos.z = s.z + dz; AV.G.S.pos.y = 2; }, pts[i]); await dormir(1500); }
      const hay = await espera(`(() => { try { const n = AV.G.interaccion.nearest(); return !!(n && (n.usar || n.id)); } catch (e) { return false; } })()`, 6);
      if (!hay) continue;
      inter = await ev(() => { const n = AV.G.interaccion.nearest(); return n ? (n.id || 'ok') : null; });
      await tocarSel('#b-act'); await dormir(2500);
      dlg = await ev(() => !!(AV.G.dialogo && AV.G.dialogo.open && AV.G.dialogo.open()));
    }
    await foto('b8_arco_dialogo');
    if (dlg) await encaje('arco-dialogo', '#dialog, #dialogo, .dlg');
    apunta({ beat: 'arco-constructor', arco, elenco, npcs, interaccion: inter, dialogoConAccion: dlg });
    if (typeof arco === 'string') bloqueo('arco', 'el arco no cargó: ' + arco);
    if (!elenco) bloqueo('arco', 'el elenco no se despertó en las Atalayas');
    if (!dlg) aviso('arco', 'sin diálogo con «Acción» tras teleport de sonda (interacción ' + inter + '); el de llegada se dispara al entrar en la zona — mismo matiz que KIMI-339, cubierto por v18ArcoTest');
    if (dlg) { await ev(() => { try { AV.G.dialogo.cerrar && AV.G.dialogo.cerrar(); } catch (e) {} }); }
  });

  // ---------- 9 · Family Quest con la descarga (toques; blob PNG verificado) ----------
  await paso('family', async () => {
    await ev(() => {
      try { AV.G.ui.hideCard && AV.G.ui.hideCard(); } catch (e) {}
      window.__blobs = [];
      const c0 = URL.createObjectURL;
      URL.createObjectURL = function (b) { const u = c0.call(URL, b); try { if (b && b.type) { const rec = { url: u, type: b.type, size: b.size }; window.__blobs.push(rec); b.slice(0, 4).arrayBuffer().then(a => { rec.sig = Array.from(new Uint8Array(a)); }); } } catch (e) {} return u; };
    });
    if (!(await ev(() => !!AV.G.familyQuest))) await ev(async () => { await window.AVE.assets.script('src/game/familia_aventuras.js').then(() => window.AVFamiliaAventuras(AV.G)); });
    await tocarSel('#b-diary'); await dormir(1800);
    await p.$eval('[data-fq-abrir]', e => e.scrollIntoView({ block: 'center' })).catch(() => {});
    await dormir(400);
    const abrio = await tocarSel('[data-fq-abrir]'); await dormir(1500);
    await foto('b9_family_menu');
    await encaje('family-menu', '#fq');
    await p.$eval('#fq-av-cuento', e => e.scrollIntoView({ block: 'center' })).catch(() => {});
    await tocarSel('#fq-av-cuento'); await dormir(1000);
    for (let r = 0; r < 10; r++) {
      if (!(await espera(`!!document.getElementById('fq-cuento-0')`, 12))) break;
      await p.$eval('#fq-cuento-0', e => e.scrollIntoView({ block: 'center' })).catch(() => {});
      await tocarSel('#fq-cuento-0'); await dormir(1000);
      if (r >= 3 && await ev(() => !!(document.getElementById('fq-otra') || document.getElementById('fq-descargar') || [...document.querySelectorAll('#fq button')].some(b => /nuestra p[áa]gina/i.test(b.textContent))))) break;
    }
    await dormir(1200);
    await foto('b9_family_vineta');
    const pag = await ev(() => { const b = [...document.querySelectorAll('#fq button')].find(x => /nuestra p[áa]gina/i.test(x.textContent)); if (!b) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    if (pag) { await tocar(pag.x, pag.y); await dormir(3000); }
    await foto('b9_family_pagina');
    await encaje('family-pagina', '#fq');
    await p.$eval('#fq-descargar', e => e.scrollIntoView({ block: 'center' })).catch(() => {});
    const npop0 = popups.length;
    const dsc = await tocarSel('#fq-descargar');
    await espera(`(() => { const m = document.getElementById('fq-descarga-msg'); return !!(m && m.textContent.trim()); })()`, 90);
    await dormir(1500);
    const blobs = await ev(() => window.__blobs);
    const msg = await ev(() => { const m = document.getElementById('fq-descarga-msg'); return m ? m.textContent : null; });
    const pop = popups.slice(npop0).map(x => x.url());
    const hechas = await ev(() => { try { const d = JSON.parse(localStorage.getItem('amazonaverse.familyquest') || 'null'); return d && d.hechas && Object.keys(d.hechas); } catch (e) { return 'err'; } });
    await foto('b9_family_descarga');
    const png = (blobs || []).find(b => b.type === 'image/png');
    apunta({ beat: 'family-quest-descarga', abrio: !!abrio, paginaBoton: !!pag, descargarBoton: !!dsc, blobs, popups: pop, mensaje: msg, hechas });
    if (!hechas || !hechas.length) bloqueo('family', 'el cuento en cadena no quedó guardado');
    if (!png) bloqueo('descarga', 'la descarga no produjo un blob PNG (blobs ' + JSON.stringify(blobs) + ', msg ' + msg + ')');
    else if (!(png.sig && png.sig[0] === 137 && png.sig[1] === 80 && png.sig[2] === 78 && png.sig[3] === 71)) bloqueo('descarga', 'el blob no tiene firma PNG: ' + JSON.stringify(png));
    for (const x of popups.slice(npop0)) await x.close().catch(() => {});
    // «Cerrar» de la página familiar no lleva id (familia_aventuras.js: boton('Cerrar', cerrar, 'ghost')): se busca por texto
    const cerrarVis = () => ev(() => { const b = [...document.querySelectorAll('#fq button')].find(x => /^\s*(Cerrar|Close)\s*$/.test(x.textContent) && x.getClientRects().length); if (!b) return null; b.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    const c = await cerrarVis(); if (c) { await dormir(400); await tocar(c.x, c.y); } await dormir(2500);
    const fqSigue = await ev(() => { const f = document.getElementById('fq'); return !!(f && !f.hidden && f.getClientRects().length && getComputedStyle(f).display !== 'none'); });
    if (fqSigue) aviso('family', '«Cerrar» (toque) no cerró el panel de Family Quest');
    R.fqCerradoConToque = !fqSigue;
    await foto('b9_family_cerrado');
    await ev(() => { try { AV.G.diario && AV.G.diario.close && AV.G.diario.close(); } catch (e) {} try { AV.G.ui.hideCard(); } catch (e) {} });
  });

  // ---------- 10 · accesibilidad: texto «Muy grande» por toques en la pausa ----------
  await paso('accesibilidad', async () => {
    const px0 = await ev(() => Math.round(parseFloat(getComputedStyle(document.body).fontSize)));
    await tocarSel('#b-menu'); await dormir(900);
    const abierta = await ev(() => { try { return document.getElementById('pause').matches(':popover-open'); } catch (e) { return null; } });
    await p.$eval('.pause-a11y [data-a11y-texto="2"]', e => e.scrollIntoView({ block: 'center' })).catch(() => {});
    await dormir(300);
    const t = await tocarSel('.pause-a11y [data-a11y-texto="2"]'); await dormir(1200);
    const cls = await ev(() => document.documentElement.className);
    const px1 = await ev(() => Math.round(parseFloat(getComputedStyle(document.body).fontSize)));
    await foto('b10_accesibilidad_pausa');
    await encaje('a11y-pausa', '#pause');
    // con texto grande: cerrar la pausa y mirar el HUD y el Diario
    const cp = await ev(() => { const p = document.getElementById('pause'); if (p && p.hidePopover) p.hidePopover(); return 1; });
    await dormir(600);
    await foto('b10_accesibilidad_hud');
    await encaje('a11y-hud', '#top');
    await tocarSel('#b-diary'); await dormir(1500);
    await foto('b10_accesibilidad_diario');
    await encaje('a11y-diario', '#card');
    await ev(() => { try { AV.G.ui.hideCard(); } catch (e) {} });
    apunta({ beat: 'accesibilidad', pausaAbierta: abierta, toque: !!t, cls, px: [px0, px1] });
    if (!/a11y-t2/.test(cls)) bloqueo('accesibilidad', 'texto «Muy grande» no se aplicó con un toque');
    else if (!(px1 > px0)) bloqueo('accesibilidad', 'el texto no creció (' + px0 + '→' + px1 + ')');
    // restaurar
    await ev(() => { const b = document.querySelector('.pause-a11y [data-a11y-texto="0"]'); if (b) b.click(); });
  });

  R.fpsFinal = await fps(3).catch(() => null);
  await foto('b11_final');
  R.veredicto = (R.consola.length || R.bloqueos.length) ? 'NO LISTO' : 'LISTO';
  fs.writeFileSync(path.join(OUT, `k421_${nombre}.json`), JSON.stringify(R, null, 1));
  await browser.close();
  return R;
}

(async () => {
  const todos = [];
  for (const n of PERFILES) { console.log('== perfil ' + n); const t0 = Date.now(); const r = await correr(n); r.minutos = Math.round((Date.now() - t0) / 6000) / 10; todos.push(r); console.log(`== ${n}: ${r.veredicto} · bloqueos ${r.bloqueos.length} · consola ${r.consola.length} · avisos ${r.avisos.length} · ${r.minutos} min`); }
  const res = todos.map(r => ({ perfil: r.perfil, build: r.build, veredicto: r.veredicto, bloqueos: r.bloqueos, consola: r.consola.slice(0, 20), avisos: r.avisos }));
  fs.writeFileSync(path.join(OUT, 'k421_resumen.json'), JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res, null, 1));
  process.exit(todos.every(r => r.veredicto === 'LISTO') ? 0 : 2);
})().catch(e => { console.error(e); process.exit(1); });
