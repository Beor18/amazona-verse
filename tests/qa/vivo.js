/* QA · T55 · verificación en vivo del sitio publicado (correr tras cada publicación) · no toca el juego, solo lo juega
   Abre el juego publicado en un navegador limpio (sin cuenta ni datos guardados: contexto nuevo de Playwright) en dos perfiles,
   escritorio 1280×800 (ratón) e iPhone 13 (táctil), y con toques/clics de verdad:
     1. carga      · la página arranca y el mundo 3D queda listo (AV.G.actores.player3D)
     2. mundo      · portada → «Aventura» → creador («¡A jugar!») → el mundo a la vista (sin portada, creador ni pantalla de carga)
     3. menu       · Pausa → «Cambiar de juego» abre «¿Cómo quieres jugar?»
     4. duelo      · tarjeta Duelo → su panel (#v18-duelo) → «Salir» → vuelve al menú
     5. minigolf   · tarjeta Minigolf → su panel (#v18-golf) → «Salir» → vuelve al menú
     6. canto      · «Más juegos» → «Sigue el canto» → su panel (#canto) → «Salir» → vuelve al menú
     7. construir  · tarjeta Construir → su barra (#cl-hud) → «Listo» y el «Salir» del vuelo libre → vuelve al menú
   En todo el recorrido se apuntan los errores de consola, los errores de página y las respuestas HTTP ≥ 400 (404 incluidos).
   Uso: node tests/qa/vivo.js <carpeta de salida> [--url https://www.amazonaverse.com/juego/] [--solo escritorio|movil] [--paralelo]
        [--swiftshader]   (GPU por software: --use-gl=angle --use-angle=swiftshader; también con AV_SWIFTSHADER=1)
   Salida: <carpeta>/<perfil>-NN-<paso>.jpg (captura 1x; en los juegos, con su panel abierto) y <carpeta>/resumen.json
   { ok, url, inicio, ms, perfiles: [{ perfil, ok, ms, pasos: [{ paso, ok, ms, detalle, captura, traza }], consola: [...], http: [...] }] }
   (traza: segundo de cada toque y cada espera del paso). Sale con código 1 si algo falla. Tope: 10 min (se corta y deja el resumen).
   Tiempos: en una máquina sin GPU y cargada (SwiftShader, el mundo a 0,5-2 cuadros/s) la pasada dura 8-10 min; con GPU, bastante menos.
   Si algo tapa un botón (elementFromPoint en su centro), el paso falla diciendo qué lo tapa. */
'use strict';
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');

const a = process.argv.slice(2);
const val = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
const salida = a.find((x, i) => !x.startsWith('--') && !['--url', '--solo'].includes(a[i - 1]));
if (!salida) { console.error('uso: node tests/qa/vivo.js <carpeta de salida> [--url <url del juego>] [--solo escritorio|movil] [--swiftshader]'); process.exit(2); }
const URL = val('--url') || 'https://www.amazonaverse.com/juego/';
const SW = a.includes('--swiftshader') || !!process.env.AV_SWIFTSHADER;
const TOPE = 10 * 60 * 1000, T0 = Date.now();
const PERFILES = [
  { perfil: 'escritorio', ctx: { viewport: { width: 1280, height: 800 } } },
  // iPhone 13 (390×664, táctil, isMobile, su userAgent) a 1x: capturas 1x y el mundo se dibuja con 9 veces menos píxeles
  { perfil: 'movil', ctx: Object.assign({}, devices['iPhone 13'], { deviceScaleFactor: 1 }) }
].filter(p => !val('--solo') || p.perfil === val('--solo'));
fs.mkdirSync(salida, { recursive: true });
const quedan = () => TOPE - (Date.now() - T0);
const log = (...x) => console.log('[vivo] ' + x.join(' '));
// el error en una línea, con la pista de Playwright si la hay (qué tapa el botón, si no está quieto…)
const msj = e => { const l = String(e && e.message || e).split('\n'), pista = l.filter(x => /intercepts|not stable|not visible|outside of the viewport|detached/.test(x)).pop(); return (l[0] + (pista ? ' · ' + pista.trim() : '')).slice(0, 400); };

// ---------- lo que se mira dentro de la página ----------
const SE_VE = sel => { // visible de verdad: en el DOM, sin hidden, con tamaño y sin display:none/visibility:hidden
  const e = document.querySelector(sel); if (!e || e.hidden || e.closest('[hidden]')) return false;
  const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
  return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
};
const MENU_ABIERTO = () => { const t = document.getElementById('title'); return !!(t && t.open); };
const MUNDO_LISTO = () => {
  const G = window.AV && AV.G; if (!G) return false;
  const t = document.getElementById('title'), cr = document.getElementById('creator');
  return !!(G.actores && (G.actores.player3D || G.actores.failed3D)) && !(t && t.open) && !(cr && !cr.hidden) &&
    !(G.carga && G.carga.activa) && !G.cargaPendiente && !!(G.S && G.S.profile && G.S.profile.created);
};

async function perfil(browser, P, R) {
  const t0 = Date.now();
  const ctx = await browser.newContext(P.ctx); // contexto nuevo: sin cookies, sin localStorage, sin cuenta
  const p = await ctx.newPage();
  const movil = !!P.ctx.hasTouch;
  let paso = '-';
  p.on('console', m => { if (m.type() === 'error') R.consola.push({ paso, tipo: 'consola', texto: m.text().slice(0, 500) }); });
  p.on('pageerror', e => R.consola.push({ paso, tipo: 'pagina', texto: String(e && e.message || e).slice(0, 500) }));
  p.on('response', r => { if (r.status() >= 400) R.http.push({ paso, estado: r.status(), url: r.url() }); });
  p.on('requestfailed', r => { const f = r.failure(); const t = f && f.errorText || ''; if (!/ERR_ABORTED/.test(t)) R.http.push({ paso, estado: 'fallo', url: r.url(), error: t }); });
  // traza del paso: cada toque y cada espera con su segundo, para ver dónde se va el tiempo
  const marca = que => { if (r) r.traza.push(((Date.now() - r.t0) / 1000).toFixed(1) + ' ' + que); };
  const espera = (fn, ms, arg) => p.waitForFunction(fn, arg, { timeout: Math.max(1000, Math.min(ms, quedan() - 5000)), polling: 250 })
    .then(v => { marca('listo: ' + (arg || String(fn).slice(0, 40).replace(/\s+/g, ' '))); return v; });
  // un toque (móvil) o un clic (escritorio) de verdad en el centro del botón. La comprobación de «nada encima» se hace aquí con
  // elementFromPoint: la de Playwright espera cuadros de animación y con la GPU por software (y la máquina cargada) se agota
  const toca = async (sel, ms) => {
    const l = p.locator(sel).filter({ visible: true }).first();
    await l.waitFor({ state: 'visible', timeout: ms || 20000 });
    const h = await l.elementHandle({ timeout: 30000 }); // el botón ya visto (si se esconde un momento, se espera a que vuelva)
    const c = await h.evaluate(e => {
      if (!e.isConnected) return { fuera: true };
      let r = e.getBoundingClientRect();
      if (r.bottom > innerHeight || r.top < 0) { e.scrollIntoView({ block: 'center', behavior: 'instant' }); r = e.getBoundingClientRect(); }
      const x = r.left + r.width / 2, y = r.top + r.height / 2, top = document.elementFromPoint(x, y);
      const tapa = top && top !== e && !e.contains(top) ? (top.id ? '#' + top.id : top.tagName.toLowerCase() + (top.className && typeof top.className === 'string' ? '.' + top.className.trim().split(/\s+/).join('.') : '')) : null;
      return { x, y, tapa, dentro: x >= 0 && y >= 0 && x <= innerWidth && y <= innerHeight };
    });
    if (c.fuera) throw new Error(sel + ' desapareció antes del toque');
    if (!c.dentro) throw new Error(sel + ' queda fuera de la pantalla');
    if (c.tapa) throw new Error(sel + ' está tapado por ' + c.tapa);
    if (movil) await p.touchscreen.tap(c.x, c.y); else await p.mouse.click(c.x, c.y);
    marca('toca ' + sel);
  };
  const seVe = sel => p.evaluate(SE_VE, sel);
  let n = 0, r = null;
  // Capturas: con la GPU por software (el mundo a 0,5-2 cuadros/s, máquina cargada) una captura que fuerza un cuadro nuevo tarda
  // 10-50 s o no llega. Se pide una por CDP (JPEG, 1x: la página va a 1x) con 20 s de tope; si no llega, se guarda el último
  // cuadro de la grabación en directo (screencast de CDP), que puede ir hasta un paso atrás: queda dicho en capturaAproximada.
  let grabado = null;
  const cdp = await ctx.newCDPSession(p);
  cdp.on('Page.screencastFrame', fr => { grabado = fr.data; cdp.send('Page.screencastFrameAck', { sessionId: fr.sessionId }).catch(() => {}); });
  const vp = P.ctx.viewport;
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80, maxWidth: vp.width, maxHeight: vp.height, everyNthFrame: 1 }).catch(() => {});
  // captura 1x del paso (la de dentro del juego, si el paso la toma; si no, al terminar el paso)
  async function foto() {
    const f = P.perfil + '-' + String(n).padStart(2, '0') + '-' + paso + '.jpg';
    let data = null;
    try {
      data = (await Promise.race([cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 85, optimizeForSpeed: true }),
        new Promise((_, no) => setTimeout(() => no(new Error('tarda más de 20 s')), 20000))])).data;
    } catch (e) {
      if (grabado) { data = grabado; r.capturaAproximada = 'captura ' + msj(e) + ': último cuadro grabado (puede ir un paso atrás)'; }
      else r.sinCaptura = msj(e);
    }
    if (!data) { r.captura = null; return; }
    fs.writeFileSync(path.join(salida, f), Buffer.from(data, 'base64')); r.captura = f;
    marca('captura');
  }
  async function hacer(nombre, fn) {
    paso = nombre; n++;
    const ti = Date.now(); r = { paso: nombre, ok: false, ms: 0, detalle: 'en curso', traza: [], t0: ti }; R.pasos.push(r);
    if (quedan() < 20000) { r.detalle = 'sin tiempo (tope de 10 min)'; log(P.perfil, '✗', nombre, r.detalle); return false; }
    const errores0 = R.consola.length;
    try { const d = await fn(); r.ok = true; r.detalle = d ? String(d) : ''; }
    catch (e) { r.detalle = msj(e); if (process.env.AV_VIVO_DEBUG) console.error(e); }
    r.ms = Date.now() - ti;
    if (R.consola.length > errores0) r.errores = R.consola.length - errores0;
    if (!r.ok || r.captura === undefined) await foto();
    delete r.t0;
    log(P.perfil, r.ok ? '✓' : '✗', nombre, (r.ms / 1000).toFixed(1) + ' s', r.ok ? r.detalle : ':: ' + r.detalle);
    return r.ok;
  }
  // volver al menú desde un modo: su botón y el menú abierto otra vez
  // (si el primer toque no hace nada y «Salir» sigue a la vista, se toca otra vez y queda dicho en el detalle)
  async function salirA(selSalir, ms) {
    await toca(selSalir, ms || 20000);
    if (await espera(MENU_ABIERTO, 15000).then(() => true, () => false)) return;
    if (!(await seVe(selSalir))) throw new Error('tras tocar «Salir» no vuelve el menú');
    r.salir2 = true; await toca(selSalir, 5000);
    await espera(MENU_ABIERTO, 15000).catch(() => { throw new Error('ni con 2 toques de «Salir» vuelve el menú'); });
  }
  // del menú a un juego: su tarjeta, su panel a la vista y «Salir» devuelve el menú
  async function juego(nombre, abrir, panel, selSalir, extra) {
    const ok = await hacer(nombre, async () => {
      if (!(await p.evaluate(MENU_ABIERTO))) throw new Error('el menú no estaba abierto al empezar');
      // como un niño: si la tarjeta no responde al primer toque (el mundo a 1 cuadro/s) y el menú sigue ahí, se toca otra vez
      await abrir();
      let otraVez = false;
      if (!(await espera(SE_VE, 25000, panel).then(() => true, () => false))) {
        if (await p.evaluate(MENU_ABIERTO)) { otraVez = true; await abrir(); }
        await espera(SE_VE, 30000, panel).catch(() => { throw new Error('no aparece su panel ' + panel + (otraVez ? ' (2 toques)' : '')); });
      }
      await p.waitForTimeout(600);
      await foto();
      if (extra) await extra();
      else await salirA(selSalir).catch(e => { throw new Error('«Salir» no vuelve al menú: ' + msj(e)); });
      if (await seVe(panel)) throw new Error('el panel ' + panel + ' sigue a la vista tras salir');
      return 'panel ' + panel + ' visto; Salir vuelve al menú' + (otraVez ? ' (la tarjeta respondió al 2.º toque)' : '') + (r.salir2 ? ' («Salir» respondió al 2.º toque)' : '');
    });
    // si falló, se vuelve al menú por código (lo que hace «Cambiar de juego») para que el siguiente juego se pruebe igual;
    // el paso queda en rojo de todos modos
    if (!ok) {
      const vuelto = await p.evaluate(() => { try { if (window.AV && AV.G && AV.G.construir && AV.G.construir.salir) AV.G.construir.salir(); } catch (e) { /* no estaba */ } try { return AV.G.menuModos.volver(); } catch (e) { return false; } }).catch(() => false);
      const ult = R.pasos[R.pasos.length - 1]; ult.detalle += vuelto ? ' (se vuelve al menú por código para seguir)' : ' (no se pudo volver al menú)';
    }
    return ok;
  }

  try {
    const okCarga = await hacer('carga', async () => {
      await p.goto(URL, { timeout: 180000, waitUntil: 'domcontentloaded' });
      await espera(() => !!(window.AV && AV.G && AV.G.actores && (AV.G.actores.player3D || AV.G.actores.failed3D)), 300000);
      const f = await p.evaluate(() => !!AV.G.actores.failed3D);
      if (f) throw new Error('el modelo 3D de Vittata no cargó (failed3D)');
      await espera(MENU_ABIERTO, 30000).catch(() => { throw new Error('no aparece la portada «¿Cómo quieres jugar?»'); });
      return 'mundo 3D y portada listos';
    });
    const okMundo = okCarga && await hacer('mundo', async () => {
      await toca('#modos [data-modo="aventura"]');
      await espera(() => { const c = document.getElementById('creator'); return !!(c && !c.hidden); }, 30000).catch(() => { throw new Error('no se abre el creador'); });
      await toca('#p-save');
      await espera(MUNDO_LISTO, 120000).catch(() => { throw new Error('el mundo no queda a la vista tras el creador'); });
      // la apertura del capítulo: «Saltar intro» como lo tocaría un niño
      const saltar = await p.locator('#c1-saltar').waitFor({ state: 'visible', timeout: 20000 }).then(() => true, () => false);
      if (saltar) {
        // la apertura puede acabar sola entre que se ve el botón y el toque: entonces no hay nada que saltar
        await toca('#c1-saltar', 5000).catch(async e => { if (await p.evaluate(() => !!document.getElementById('c1-saltar'))) throw e; });
        await espera(() => !document.getElementById('c1-saltar') && !document.getElementById('c1-fade'), 30000).catch(() => { throw new Error('«Saltar intro» no termina la apertura'); });
      }
      await p.waitForTimeout(2500);
      return 'cotorra creada y mundo a la vista' + (saltar ? ' (intro saltada)' : '');
    });
    const okMenu = okMundo && await hacer('menu', async () => {
      // si la apertura del capítulo pone un diálogo encima, la Pausa sigue a mano
      // como un niño: si el primer toque no abre la Pausa (el mundo aún cargando a 1 cuadro/s), se toca otra vez
      const pausa = () => { try { return document.getElementById('pause').matches(':popover-open'); } catch (e) { return false; } };
      let toques = 0;
      for (; toques < 2 && !(await p.evaluate(pausa)); toques++) { await toca('#b-menu'); await espera(pausa, 10000).catch(() => {}); }
      if (!(await p.evaluate(pausa))) throw new Error('la Pausa no se abre (2 toques)');
      await toca('#b-menu-modos');
      await espera(MENU_ABIERTO, 15000).catch(() => { throw new Error('«Cambiar de juego» no abre el menú'); });
      await espera(SE_VE, 5000, '#modos [data-modo="duelo"]').catch(() => { throw new Error('el menú no enseña el Duelo'); });
      return '«¿Cómo quieres jugar?» abierto' + (toques > 1 ? ' (la Pausa abrió al 2.º toque)' : '');
    });
    if (okMenu) {
      await juego('duelo', () => toca('#modos [data-modo="duelo"]'), '#v18-duelo', '#v18-duelo [data-k="salirB"]');
      await juego('minigolf', () => toca('#modos [data-modo="golf"]'), '#v18-golf', '#v18-golf button[data-a="salir"]');
      await juego('canto', async () => {
        if (!(await p.evaluate(() => document.getElementById('modos').classList.contains('modos-mas-abierto')))) await toca('#modos [data-mas-juegos]');
        await toca('#modos [data-modo="canto"]');
      }, '#canto', '#canto [data-a="salir"]');
      // al volver puede quedar «Más juegos» abierto: se cierra para ver todas las tarjetas
      if (await p.evaluate(() => { const f = document.getElementById('modos'); return !!(f && f.classList.contains('modos-mas-abierto')); })) await toca('#modos [data-mas-juegos]').catch(() => {});
      await juego('construir', () => toca('#b-construir-menu'), '#cl-hud', null, async () => {
        await toca('#cl-hud [data-cl="listo"]').catch(e => { throw new Error('«Listo» de Construir no se puede tocar: ' + msj(e)); });
        await espera(sel => !document.querySelector(sel) || document.querySelector(sel).hidden, 10000, '#cl-hud').catch(() => { throw new Error('«Listo» no cierra Construir'); });
        await salirA('#modo-salir').catch(e => { throw new Error('el «Salir» del vuelo libre no vuelve al menú: ' + msj(e)); });
      });
    }
  } finally {
    R.ms = Date.now() - t0;
    R.ok = R.pasos.length === 7 && R.pasos.every(x => x.ok) && !R.consola.length && !R.http.length;
    await ctx.close().catch(() => {});
  }
}

(async () => {
  const args = SW ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [];
  const browser = args.length ? await chromium.launch({ args }) : await chromium.launch();
  const vigia = setTimeout(() => { console.error('[vivo] tope de 10 min: se corta'); escribir({ ok: false, cortado: true }); process.exit(1); }, TOPE + 15000);
  const res = { ok: false, url: URL, inicio: new Date(T0).toISOString(), swiftshader: SW, ms: 0,
    perfiles: PERFILES.map(P => ({ perfil: P.perfil, ok: false, ms: 0, pasos: [], consola: [], http: [] })) };
  function escribir(extra) { Object.assign(res, extra || {}); res.ms = Date.now() - T0; fs.writeFileSync(path.join(salida, 'resumen.json'), JSON.stringify(res, null, 2)); }
  try {
    // un perfil detrás del otro, cada uno en su contexto limpio (con --paralelo, los dos a la vez: solo en un equipo con GPU)
    if (!a.includes('--paralelo')) for (let i = 0; i < PERFILES.length; i++) { await perfil(browser, PERFILES[i], res.perfiles[i]); escribir(); }
    else await Promise.all(PERFILES.map((P, i) => perfil(browser, P, res.perfiles[i]).then(() => escribir())));
  } finally { await browser.close().catch(() => {}); clearTimeout(vigia); }
  res.ok = res.perfiles.length === PERFILES.length && res.perfiles.every(x => x.ok);
  escribir();
  for (const R of res.perfiles) {
    log(R.perfil + ': ' + (R.ok ? 'PASA' : 'FALLA') + ' · ' + R.pasos.filter(x => x.ok).length + '/7 pasos · ' + R.consola.length + ' errores de consola · ' + R.http.length + ' HTTP fallidas · ' + Math.round(R.ms / 1000) + ' s');
    for (const e of R.consola.slice(0, 5)) log('   consola [' + e.paso + '] ' + e.texto);
    for (const h of R.http.slice(0, 5)) log('   http [' + h.paso + '] ' + h.estado + ' ' + h.url);
  }
  log((res.ok ? 'PASA' : 'FALLA') + ' · ' + Math.round(res.ms / 1000) + ' s · ' + path.join(salida, 'resumen.json'));
  process.exit(res.ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
