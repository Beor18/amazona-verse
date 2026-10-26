/* Juego · guía de controles con teclado y ratón (rol Movimiento y controles; docs/equipo/MOVIMIENTO.md § 3)
   Para quien juega con teclado (en pantallas táctiles no sale nada: allí ya están los botones). Lee las teclas reales del
   mapa de G.input (respeta el remapeo de la pausa).
   - Panel inicial grande: mover, volar, subir, bajar, dejar de volar (destacado), cámara con el ratón y acción. Sale al
     empezar a jugar la primera vez en este dispositivo y mientras no haya volado nunca; se cierra solo al moverse (o con
     «¡A jugar!» o Esc) y se vuelve a ver desde la pausa («Ver la guía de controles») o con el icono.
   - Icono fijo «Controles» (abajo a la derecha, lejos del objetivo, los recursos y el Diario): al pasar el ratón o pulsarlo
     muestra la leyenda con las teclas. Volando, una pastilla dorada junto al icono recuerda la tecla para aterrizar.
   - Pistas en contexto, la primera vez que hacen falta: «Pulsa V para volar» si lleva un rato en el suelo sin despegar,
     «Mantén Espacio para subir» al volar la primera vez o al acercarse a algo alto, «Pulsa X para dejar de volar» si vuela
     un rato sin haber aterrizado nunca. Avisos de fisica.js (también en táctil, con el toast): viento fuerte en el techo de
     vuelo ('viento') y «ya está libre» tras la red de seguridad ('desatasco').
   Guarda en este dispositivo, aparte de la partida: localStorage `<almacen>.guia` = { v: 1, hecho: { mover, volar, subir,
   aterrizar }, vistas: { panel } }.
   API: mostrar(), cerrar(), leyenda(on), estado(). PRUEBAS: AV.controlesTest (src/pruebas/controles.js, se carga al pedirla). */
AVE.module('guiaControles', function (G) {
  'use strict';
  const S = G.S, $ = G.util.$;
  const CLAVE = ((G.pack && G.pack.meta && G.pack.meta.almacen) || 'amazonaverse') + '.guia';
  const AJ = { listo: 0.8, cierre: 0.45, gracia: 0.8, suelo: 10, repetirVolar: 75, vueloSinAterrizar: 14, pista: 5.5, alto: 2.5, cerca: 2.6 };

  // ---------- Estado guardado en el dispositivo ----------
  function leer() {
    try { const d = JSON.parse(localStorage.getItem(CLAVE) || 'null'); if (d && d.v === 1) return { hecho: d.hecho || {}, vistas: d.vistas || {} }; } catch (e) { /* sin almacenamiento */ }
    return { hecho: {}, vistas: {} };
  }
  let est = leer();
  function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify({ v: 1, hecho: est.hecho, vistas: est.vistas })); } catch (e) { /* sin almacenamiento */ } }
  function hecho(k) { if (!est.hecho[k]) { est.hecho[k] = true; guardar(); } }

  // ---------- Teclado o táctil ----------
  const mq = window.matchMedia ? matchMedia('(hover: none), (pointer: coarse)') : null;
  let forzado = null; // 'tactil' | 'teclado' (pruebas)
  const tactil = () => (forzado ? forzado === 'tactil' : !!(mq && mq.matches));
  function marcarModo() { document.documentElement.classList.toggle('guia-tactil', tactil()); }
  if (mq && mq.addEventListener) mq.addEventListener('change', () => { marcarModo(); if (tactil()) { cerrar(); leyenda(false); } });

  // ---------- Teclas reales ----------
  const nombre = k => (k === ' ' ? 'Espacio' : String(k || '').length === 1 ? String(k).toUpperCase() : String(k || ''));
  const kbd = t => `<kbd>${t}</kbd>`;
  function teclas() {
    const m = (G.input && G.input.mapa) || {};
    return { mover: ['arriba', 'izquierda', 'abajo', 'derecha'].map(a => nombre(m[a] || { arriba: 'w', izquierda: 'a', abajo: 's', derecha: 'd' }[a])),
      volar: nombre(m.volar || 'v'), aterrizar: nombre(m.aterrizar || 'x'), accion: nombre(m.accion || 'e') };
  }
  const RATON = '<svg class="guia-raton" viewBox="0 0 32 24" aria-hidden="true"><rect x="10" y="2" width="12" height="20" rx="6" fill="none" stroke="currentColor" stroke-width="2.2"/>' +
    '<path d="M16 2.5v7" stroke="currentColor" stroke-width="2.2"/><path d="M1.5 12l4-3.6v7.2zM30.5 12l-4-3.6v7.2z" fill="currentColor"/></svg>';
  function filas() {
    const t = teclas(), o = '<span class="guia-o">o</span>';
    return [
      { id: 'mover', k: '<span class="guia-wasd">' + t.mover.map(kbd).join('') + '</span>', txt: 'Moverte', sub: 'O con las flechas. Shift para correr', corto: 'o flechas · Shift corre' },
      { id: 'volar', k: kbd(t.volar), txt: 'Volar', sub: 'Despega y se queda en el aire', corto: 'despega' },
      { id: 'subir', k: kbd('Espacio'), txt: 'Subir', sub: 'Mantenlo pulsado mientras vuelas. En el suelo, salta', corto: 'mantenlo volando' },
      { id: 'bajar', k: kbd('C'), txt: 'Bajar', sub: 'Mantenlo pulsado mientras vuelas', corto: 'mantenlo volando' },
      { id: 'aterrizar', k: kbd(t.aterrizar) + o + kbd(t.volar), txt: 'Dejar de volar', sub: 'Aterriza suave en el suelo', corto: 'aterriza suave', destacada: true },
      { id: 'camara', k: RATON + o + kbd('Q') + kbd('R'), txt: 'Girar la cámara', sub: 'Arrastra con el ratón', corto: 'arrastra el ratón' },
      { id: 'accion', k: kbd(t.accion), txt: 'Acción', sub: 'Hablar, examinar y usar', corto: 'hablar, examinar, usar' },
    ];
  }
  // corto: la leyenda del icono es compacta (una línea por fila); el panel lleva la explicación entera
  const htmlFilas = corto => filas().map(f => `<div class="guia-fila${f.destacada ? ' destacada' : ''}" data-fila="${f.id}"><dt>${f.k}</dt><dd><b>${f.txt}</b><small>${corto ? f.corto : f.sub}</small></dd></div>`).join('');

  // ---------- Estilos (con los tokens de src/ui/tokens.css) ----------
  const css = document.createElement('style');
  css.id = 'guia-controles-css';
  css.textContent = `
#guia-hud { right: max(var(--sp-3), env(safe-area-inset-right, 0px)); bottom: calc(env(safe-area-inset-bottom, 0px) + var(--sp-3)); display: flex; flex-direction: column; align-items: flex-end; gap: var(--sp-2); z-index: var(--z-controls); }
#guia-btn { min-height: 56px; padding: 0 var(--sp-5) 0 var(--sp-4); border-radius: var(--r-pill); font-size: var(--fs-md); --icon-size: 30px; }
#guia-btn[aria-expanded="true"] { --btn-bg: var(--c-paper); --btn-ink: var(--c-ink); --btn-lip: var(--c-paper-edge); --btn-border: transparent; }
.guia-pastilla { display: inline-flex; align-items: center; gap: var(--sp-2); padding: 6px var(--sp-4) 6px 6px; font: 700 var(--fs-md)/1 var(--font-display); color: var(--c-ink); background: var(--gold); border-radius: var(--r-pill); box-shadow: 0 4px 0 #c9962e, var(--sh-2); animation: guia-latido 1.8s ease-in-out infinite; }
.guia-pastilla kbd { min-width: 36px; height: 36px; font-size: 17px; box-shadow: 0 3px 0 #c9962e; }
.guia-pastilla[hidden], .guia-pista[hidden], .guia-leyenda[hidden], #guia-panel[hidden] { display: none; }
.guia-leyenda { width: min(380px, calc(100vw - 24px)); max-height: calc(100vh - 300px); overflow: auto; padding: var(--sp-4); animation: pop-in var(--dur-2) var(--ease-pop); }
.guia-leyenda h3 { margin: 0 0 var(--sp-3); font: 700 var(--fs-xs)/1.2 var(--font-body); text-transform: uppercase; letter-spacing: var(--tracking-caps); color: var(--c-eyebrow); }
.guia-filas { display: grid; gap: var(--sp-2); margin: 0; }
.guia-fila { display: grid; grid-template-columns: 116px minmax(0, 1fr); align-items: center; gap: var(--sp-3); padding: 6px var(--sp-2); border-radius: var(--r-md); border: 2px solid transparent; }
.guia-fila dt { display: flex; align-items: center; justify-content: flex-end; gap: 3px; flex-wrap: wrap; }
.guia-fila dd { margin: 0; min-width: 0; }
.guia-fila b { display: block; font: 700 var(--fs-md)/1.2 var(--font-display); }
.guia-fila small { display: block; font-size: var(--fs-sm); line-height: 1.3; opacity: 0.85; }
.guia-fila.destacada { background: rgba(255, 210, 122, 0.16); border-color: var(--gold); }
.guia-o { font-size: var(--fs-xs); font-weight: 700; opacity: 0.75; padding: 0 2px; }
.guia-wasd { display: inline-grid; grid-template-columns: repeat(3, auto); gap: 3px; }
.guia-wasd kbd:nth-child(1) { grid-area: 1 / 2; } .guia-wasd kbd:nth-child(2) { grid-area: 2 / 1; } .guia-wasd kbd:nth-child(3) { grid-area: 2 / 2; } .guia-wasd kbd:nth-child(4) { grid-area: 2 / 3; }
.guia-leyenda .guia-fila { padding: 4px var(--sp-2); }
.guia-leyenda .guia-fila dd { display: flex; align-items: baseline; gap: var(--sp-2); flex-wrap: wrap; }
#guia-hud:has(#guia-leyenda:not([hidden])) #guia-pista { display: none; }
.guia-raton { width: 34px; height: 26px; flex: none; }
.guia-pista { position: relative; max-width: min(360px, calc(100vw - 24px)); margin-right: 6px; padding: var(--sp-3) var(--sp-4); font: 600 var(--fs-md)/1.4 var(--font-display); color: var(--c-ink); background: var(--c-paper); border-radius: var(--r-lg); box-shadow: 0 4px 0 var(--c-paper-edge), var(--sh-2); animation: pop-in var(--dur-3) var(--ease-pop); }
.guia-pista::after { content: ""; position: absolute; right: 34px; bottom: -9px; width: 18px; height: 18px; background: var(--c-paper); transform: rotate(45deg); box-shadow: 4px 4px 0 var(--c-paper-edge); border-radius: 0 0 4px 0; }
.guia-pista kbd { vertical-align: middle; }
#guia-panel { position: fixed; inset: 0; z-index: var(--z-card); display: grid; place-items: center; padding: var(--sp-4); pointer-events: none; }
#guia-panel .guia-caja { pointer-events: auto; width: min(760px, 100%); max-height: calc(100vh - 2 * var(--sp-4)); overflow: auto; padding: var(--sp-5) var(--sp-6) var(--sp-5); animation: pop-in var(--dur-3) var(--ease-pop); }
#guia-panel .eyebrow { display: flex; align-items: center; gap: var(--sp-2); color: var(--c-ink-muted); --icon-size: 20px; }
#guia-panel h2 { margin: 2px 0 var(--sp-4); font: 700 var(--fs-2xl)/1.1 var(--font-display); color: var(--c-ink); }
#guia-panel .guia-filas { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--sp-2) var(--sp-3); }
#guia-panel .guia-fila { grid-template-columns: 148px minmax(0, 1fr); padding: var(--sp-2) var(--sp-3); background: rgba(255, 255, 255, 0.55); border-color: rgba(107, 82, 54, 0.16); }
#guia-panel .guia-fila.destacada { background: #fff1c7; border-color: #e0a93a; box-shadow: 0 0 0 3px rgba(224, 169, 58, 0.22); }
#guia-panel kbd { min-width: 38px; height: 38px; font-size: 16px; border-radius: 9px; }
#guia-panel .guia-fila b { font-size: var(--fs-lg); color: var(--c-ink); }
#guia-panel .guia-fila small { color: var(--c-ink-muted); opacity: 1; }
#guia-panel .guia-pie { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); flex-wrap: wrap; margin-top: var(--sp-4); }
#guia-panel .guia-pie p { margin: 0; flex: 1 1 260px; font-size: var(--fs-sm); color: var(--c-ink-muted); }
.pause-guia { margin: 0 0 var(--sp-3); }
@keyframes guia-latido { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
@media (prefers-reduced-motion: reduce) { .guia-pastilla { animation: none; } }
@media (max-width: 560px) { #guia-panel .guia-fila, .guia-fila { grid-template-columns: 96px minmax(0, 1fr); } #guia-panel .guia-filas { grid-template-columns: 1fr; } }
html.guia-tactil :is(#guia-hud, #guia-panel, .pause-guia) { display: none !important; }
body:has(#title[open]) :is(#guia-hud, #guia-panel), body:has(:is(#creator, #comic, #end):not([hidden])) :is(#guia-hud, #guia-panel),
body:has(#dialog:not([hidden])) #guia-hud { visibility: hidden; }
`;
  document.head.appendChild(css);

  // ---------- Marcado ----------
  const hud = document.createElement('div');
  hud.id = 'guia-hud'; hud.className = 'hud guia-hud';
  hud.innerHTML = '<section class="guia-leyenda panel" id="guia-leyenda" aria-labelledby="guia-leyenda-titulo" hidden><h3 id="guia-leyenda-titulo">Controles con teclado</h3><dl class="guia-filas"></dl></section>' +
    '<div class="guia-pista" id="guia-pista" role="status" aria-live="polite" hidden></div>' +
    '<div class="guia-pastilla" id="guia-volando" hidden></div>' +
    '<button class="btn ghost" id="guia-btn" type="button" data-icon="keyboard" aria-expanded="false" aria-controls="guia-leyenda">Controles</button>';
  const panel = document.createElement('div');
  panel.id = 'guia-panel'; panel.className = 'guia-hud'; panel.hidden = true;
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'false'); panel.setAttribute('aria-labelledby', 'guia-titulo');
  panel.innerHTML = '<div class="guia-caja paper"><span class="eyebrow" data-icon="keyboard">Teclado y ratón</span><h2 id="guia-titulo">¡Así se juega!</h2>' +
    '<dl class="guia-filas"></dl><div class="guia-pie"><p>Se cierra solo cuando empiezas a moverte. Vuelve a verlo con el botón «Controles» o en la Pausa.</p>' +
    '<button class="btn xl" type="button" data-guia="cerrar" data-icon="play">¡A jugar!</button></div></div>';
  document.body.append(hud, panel);
  const ley = $('guia-leyenda'), pistaEl = $('guia-pista'), pastilla = $('guia-volando'), boton = $('guia-btn');

  // Botón en la pausa (sección Controles; como .help-keys, no sale en táctil)
  function botonPausa() {
    const sec = document.querySelector('#pause .pause-help');
    if (!sec || sec.querySelector('.pause-guia')) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn ghost sm pause-guia'; b.dataset.icon = 'keyboard'; b.id = 'b-guia-controles';
    b.textContent = 'Ver la guía de controles';
    const h = sec.querySelector('h3'); if (h) h.after(b); else sec.prepend(b);
    b.addEventListener('click', () => {
      const menu = $('pause'); try { if (menu && menu.matches(':popover-open')) menu.hidePopover(); } catch (e) { /* sin popover */ }
      mostrar(true);
    });
  }
  botonPausa();

  // ---------- Panel ----------
  let panelAbierto = false, panelT = 0, panelMov = 0;
  function pintarPanel() { panel.querySelector('.guia-filas').innerHTML = htmlFilas(); }
  function mostrar(manual) {
    if (tactil()) return false;
    pintarPanel(); panel.hidden = false; panelAbierto = true; panelT = 0; panelMov = 0;
    if (!manual) { est.vistas.panel = true; guardar(); }
    return true;
  }
  function cerrar() { panel.hidden = true; panelAbierto = false; }
  panel.addEventListener('click', e => { if (e.target.closest('[data-guia="cerrar"]')) { cerrar(); e.target.blur(); } });

  // ---------- Leyenda del icono ----------
  let fijada = false, salirT = 0;
  function pintarLeyenda() { ley.querySelector('.guia-filas').innerHTML = htmlFilas(true); }
  function leyenda(on) {
    if (on && tactil()) return;
    if (on) pintarLeyenda();
    ley.hidden = !on; boton.setAttribute('aria-expanded', String(!!on));
    if (!on) fijada = false;
  }
  boton.addEventListener('click', () => { fijada = !(fijada && !ley.hidden); leyenda(fijada); });
  hud.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { clearTimeout(salirT); leyenda(true); } });
  hud.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !fijada) salirT = setTimeout(() => { if (!fijada) leyenda(false); }, 250); });
  boton.addEventListener('focus', () => { if (boton.matches(':focus-visible')) leyenda(true); });
  boton.addEventListener('blur', () => { if (!fijada && !hud.matches(':hover')) leyenda(false); });
  G.on('escape', () => { if (panelAbierto) cerrar(); if (!ley.hidden) leyenda(false); });
  // Tras cambiar las teclas en la pausa, todo se repinta con las nuevas
  const menu = $('pause');
  if (menu) menu.addEventListener('toggle', e => { if (e.newState === 'closed') { if (panelAbierto) pintarPanel(); if (!ley.hidden) pintarLeyenda(); volando = null; } });

  // ---------- Pistas y avisos ----------
  let pistaT = 0, pistaId = '';
  const enSesion = {};
  function pista(id, html, seg) {
    if (tactil()) return false;
    pistaEl.innerHTML = html; pistaEl.hidden = false; pistaT = seg || AJ.pista; pistaId = id; enSesion[id] = (enSesion[id] || 0) + 1;
    return true;
  }
  function ocultarPista() { pistaEl.hidden = true; pistaT = 0; pistaId = ''; }
  function aviso(id, texto, seg) { if (tactil()) { G.ui.toast(texto, (seg || 3.5) * 1000); return; } pista(id, texto, seg || 3.5); }
  let vientoT = -1e9, libreT = -1e9;
  G.on('viento', on => { if (!on || S.clock - vientoT < 15) return; vientoT = S.clock; aviso('viento', '¡Mucho viento allá arriba! Vittata no puede subir más.'); });
  G.on('desatasco', () => { if (S.clock - libreT < 4) return; libreT = S.clock; aviso('desatasco', '¡Listo! Vittata se había atascado y ya está libre.'); });
  G.on('vuelo', on => { if (on) hecho('volar'); });

  // ---------- Cada cuadro ----------
  function enJuego() {
    const t = $('title'), c = $('creator'), co = $('comic'), en = $('end');
    return !(t && t.open) && !(c && !c.hidden) && !(co && !co.hidden) && !(en && !en.hidden) && !G.ui.busy() && !(G.pausa && G.pausa.activa());
  }
  function pidiendoMover() {
    const K = G.input.keys, st = G.input.stick;
    return ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].some(k => K.has(k)) || Math.hypot(st.x, st.y) > 0.2 || G.input.jumpHeld;
  }
  // ¿Algo alto delante (más de AJ.alto m sobre los pies, a menos de AJ.cerca m)? Se mira cada 0,25 s
  let altoT = 0, altoDelante = false;
  function mirarAlto() {
    const SO = G.solidos, M = G.fisica.MOVE; altoDelante = false;
    if (!SO || !SO.activo) return;
    const v = Math.hypot(M.vx, M.vz), ux = v > 0.5 ? M.vx / v : S.facing.x, uz = v > 0.5 ? M.vz / v : S.facing.z;
    for (const d of [1, 1.8, AJ.cerca]) { const t = SO.altoEn(S.pos.x + ux * d, S.pos.z + uz * d, S.pos.y + 50); if (t > S.pos.y + AJ.alto) { altoDelante = true; return; } }
  }
  let listoT = 0, sueloT = 0, sinVolarT = 0, vueloT = 0, subirT = 0, movT = 0, volando = null;
  function actualizar(dt) {
    marcarModo();
    const M = G.fisica.MOVE, jugando = enJuego();
    // Lo aprendido (para no repetir lo que ya sabe)
    if (M.flying && G.input.jumpHeld && (subirT += dt) > 0.4) hecho('subir');
    if (M.flying && M.landing) hecho('aterrizar');
    if (!M.flying && M.speed > 1 && (movT += dt) > 0.5) hecho('mover');
    // Panel: sale al empezar a jugar (primera vez en el dispositivo o si nunca ha volado) y se cierra al moverse.
    // Espera a que acaben los bocadillos libres: si no, tapa el gancho del capítulo (la apertura en negro va en bocadillos)
    if (jugando && !(G.dialogo.libre && G.dialogo.libre())) listoT += dt; else listoT = 0;
    if (!panelAbierto && !tactil() && listoT > AJ.listo && !enSesion.panel && (!est.vistas.panel || !est.hecho.volar)) { enSesion.panel = 1; mostrar(false); }
    if (panelAbierto) {
      panelT += dt;
      if (panelT > AJ.gracia && (pidiendoMover() || M.flying) && (panelMov += dt) > AJ.cierre) cerrar();
      if (!jugando && G.ui.busy()) cerrar(); // empieza un diálogo o una tarjeta: el panel no estorba
    }
    // Pastilla de vuelo: la tecla para dejar de volar, mientras vuela
    const t = teclas(), quiere = M.flying && !M.landing && !tactil() ? t.aterrizar : '';
    if (quiere !== volando) {
      volando = quiere;
      pastilla.hidden = !quiere;
      if (quiere) pastilla.innerHTML = `${kbd(quiere)} Dejar de volar`;
      boton.classList.toggle('volando', !!quiere);
    }
    // Pistas (no con el panel abierto ni fuera del juego)
    if (pistaT > 0 && (pistaT -= dt) <= 0) ocultarPista();
    if (!jugando || panelAbierto || tactil()) return;
    if ((altoT -= dt) <= 0) { altoT = 0.25; mirarAlto(); }
    if (M.flying) { vueloT += dt; sueloT = 0; } else { vueloT = 0; if (M.grounded) { sueloT += dt; if (!est.hecho.volar) sinVolarT += dt; } }
    if (pistaT > 0) return;
    if (!est.hecho.volar && sinVolarT > AJ.suelo && (enSesion.volar || 0) < 3) { sinVolarT = -AJ.repetirVolar; pista('volar', `Pulsa ${kbd(t.volar)} para volar`); return; }
    if (M.flying && vueloT > 1.2 && !est.hecho.subir && !enSesion.subir) { pista('subir', `Mantén ${kbd('Espacio')} para subir y ${kbd('C')} para bajar`); return; }
    if (altoDelante && pidiendoMover()) {
      if (M.flying && !enSesion.altoVuelo && !G.input.jumpHeld) { enSesion.altoVuelo = 1; pista('alto', `Mantén ${kbd('Espacio')} para subir`); return; }
      if (!M.flying && M.grounded && !enSesion.altoSuelo) { enSesion.altoSuelo = 1; pista('alto', `¿Quieres subir ahí? Pulsa ${kbd(t.volar)} para volar y mantén ${kbd('Espacio')}`); return; }
    }
    if (M.flying && vueloT > AJ.vueloSinAterrizar && !est.hecho.aterrizar && !enSesion.aterrizar) { pista('aterrizar', `Para dejar de volar, pulsa ${kbd(t.aterrizar)}`); return; }
  }
  G.on('update', dt => actualizar(dt || 0), 90);
  marcarModo();

  // ---------- Pruebas ----------
  // La prueba (src/pruebas/controles.js, AV.controlesTest) se carga al pedirla: no va en la descarga inicial. Usa este acceso.
  const prueba = {
    get forzado() { return forzado; }, set forzado(v) { forzado = v; }, get est() { return est; }, set est(v) { est = v; },
    get panelAbierto() { return panelAbierto; }, get pistaId() { return pistaId; }, enSesion, AJ, CLAVE, nombre,
    actualizar, mostrar, cerrar, leyenda, ocultarPista, enJuego, el: { panel, ley, pista: pistaEl, pastilla, boton },
    reiniciar() { listoT = 0; sinVolarT = 0; vueloT = 0; volando = null; vientoT = libreT = -1e9; },
  };

  return { mostrar, cerrar, leyenda, estado: () => ({ panel: panelAbierto, leyenda: !ley.hidden, pista: pistaId, hecho: Object.assign({}, est.hecho), tactil: tactil() }), prueba };
});
