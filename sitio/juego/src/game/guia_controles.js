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
      { id: 'camara', k: RATON + o + kbd('Q') + kbd('R'), txt: 'Mover la cámara', sub: 'Arrastra con el ratón; arriba y abajo para mirar al cielo o al suelo (también T y G)', corto: 'arrastra; T/G mira arriba' },
      { id: 'accion', k: kbd(t.accion), txt: 'Acción', sub: 'Hablar, examinar y usar', corto: 'hablar, examinar, usar' },
      { id: 'don', k: kbd('F'), txt: 'Don', sub: 'Mantén Impulso un momento', corto: 'mantenlo' }, // EN en content/cap1/en.js (antes iba mezclado en el texto)
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
#pm-pista { position: fixed; z-index: 7; box-sizing: border-box; width: 96px; height: 96px; margin: 0; pointer-events: none; border-radius: 50%; border: 6px solid #ffe08a; box-shadow: 0 0 0 var(--pm-sombra, 2px) rgba(255, 196, 60, 0.45); background: transparent; }
#pm-pista::before { content: ""; position: absolute; left: 50%; top: -34px; margin-left: -14px; border: 14px solid transparent; border-bottom-color: #ffe08a; }
#pm-pista[hidden] { display: none; }
#pm-pista.pm-atascado { border-color: #7fd3ff; box-shadow: 0 0 0 10px rgba(80, 180, 255, 0.45); }
#pm-pista.pm-atascado::before { border-bottom-color: #7fd3ff; }
#pm-pista[data-paso="truco"] { left: 0; right: 0; top: 22%; margin: auto; }
html.guia-tactil #pm-pista { display: block; }
html.guia-tactil #pm-pista[hidden] { display: none; }
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
  const pm = document.createElement('div');
  pm.id = 'pm-pista'; pm.hidden = true; pm.setAttribute('aria-hidden', 'true');
  document.body.appendChild(pm);
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
    // En inglés se traduce la frase entera con sus teclas («Pulsa {} para volar»): el traductor de la página va nodo a nodo y
    // no reconoce una frase partida por <kbd>
    if (G.idioma && G.idioma.tr) html = G.idioma.tr(html);
    pistaEl.innerHTML = html; pistaEl.hidden = false; pistaT = seg || AJ.pista; pistaId = id; enSesion[id] = (enSesion[id] || 0) + 1;
    return true;
  }
  function ocultarPista() { pistaEl.hidden = true; pistaT = 0; pistaId = ''; }
  function aviso(id, texto, seg) { if (tactil()) { G.ui.toast(texto, (seg || 3.5) * 1000); return; } pista(id, texto, seg || 3.5); }
  let vientoT = -1e9, libreT = -1e9;
  G.on('viento', on => { if (!on || S.clock - vientoT < 15) return; vientoT = S.clock; aviso('viento', '¡Mucho viento allá arriba! Vittata no puede subir más.'); });
  G.on('desatasco', () => { if (S.clock - libreT < 4) return; libreT = S.clock; aviso('desatasco', '¡Listo! Vittata se había atascado y ya está libre.'); });
  G.on('vuelo', on => { if (on) hecho('volar'); });
  // CG-48: los primeros minutos. Una pista visual (anillo), sin ventana de texto. Se apaga al hacerlo.
  const PM_ORDEN = ['mover', 'despegar', 'posar', 'impulso', 'truco'];
  const pmE = { hecho: {}, t: 0, volaba: false };
  let pmForzar = false;
  function pmPuede(k) {
    if (k === 'truco') return true;
    const tactil = [...document.querySelectorAll('#acts .btn, #stick')].some(n => !n.hidden && n.getClientRects().length);
    if (!tactil) return true;
    const el = document.getElementById(PM_BLANCO[k] || '');
    return !!(el && !el.hidden && el.getClientRects().length && el.getBoundingClientRect().width >= 8);
  }
  // pmPuede mira el layout (getClientRects): en móvil eso fuerza un reflow. Se recalcula como mucho cada 250 ms (o al forzar).
  const pmCache = { id: '', t: -1e9 };
  const pmPaso = (forzar) => {
    const ahora = performance.now();
    if (forzar || pmForzar || ahora - pmCache.t > 250) { pmCache.id = PM_ORDEN.find(k => !pmE.hecho[k] && pmPuede(k)) || ''; pmCache.t = ahora; }
    return pmCache.id;
  };
  function pmMarcar(k) {
    if (!k || pmE.hecho[k]) return;
    pmE.hecho[k] = true; pmE.t = 0; pmCache.t = -1e9;
  }
  const PM_BLANCO = { mover: 'stick', despegar: 'b-fly', posar: 'b-fly', impulso: 'b-dash' };
  const PM_BORDE = 6, PM_BORDE_MIN = 2, PM_SOMBRA = 2, PM_AIRE = 6;
  const huecoPm = (a, b) => {
    const dx = Math.max(b.left - a.right, a.left - b.right);
    const dy = Math.max(b.top - a.bottom, a.top - b.bottom);
    if (dx < 0 && dy < 0) return Math.max(dx, dy);
    if (dx < 0) return dy;
    if (dy < 0) return dx;
    return Math.hypot(dx, dy);
  };
  function limpiarPmFijo() {
    pm.style.borderWidth = '';
    pm.style.removeProperty('--pm-sombra');
  }
  function colocarPm() {
    if (pm.dataset.paso === 'truco') {
      pm.style.left = pm.style.top = pm.style.width = pm.style.height = pm.style.right = pm.style.bottom = '';
      limpiarPmFijo();
      return;
    }
    const el = document.getElementById(PM_BLANCO[pm.dataset.paso] || '');
    const caja = el && !el.hidden && el.getClientRects().length ? el.getBoundingClientRect() : null;
    if (!caja || caja.width < 8) {
      pm.style.width = pm.style.height = '96px';
      pm.style.left = '-400px'; pm.style.top = '0px'; pm.style.right = 'auto'; pm.style.bottom = 'auto';
      limpiarPmFijo();
      return;
    }
    const otros = [...document.querySelectorAll('#acts .btn, #stick')].filter(n => n !== el && !n.hidden && n.getClientRects().length);
    let borde = PM_BORDE, sombra = PM_SOMBRA, extra = 8;
    const poner = () => {
      const size = Math.ceil(Math.max(caja.width, caja.height) + borde * 2 + extra * 2);
      pm.style.borderWidth = borde + 'px';
      pm.style.setProperty('--pm-sombra', sombra + 'px');
      pm.style.width = size + 'px'; pm.style.height = size + 'px';
      pm.style.left = Math.round(caja.left + caja.width / 2 - size / 2) + 'px';
      pm.style.top = Math.round(caja.top + caja.height / 2 - size / 2) + 'px';
      pm.style.right = 'auto'; pm.style.bottom = 'auto';
    };
    const peor = () => {
      const r = pm.getBoundingClientRect();
      const inflada = { left: r.left - sombra, right: r.right + sombra, top: r.top - sombra, bottom: r.bottom + sombra };
      let m = Infinity;
      otros.forEach(o => { const g = huecoPm(inflada, o.getBoundingClientRect()); if (g < m) m = g; });
      return m;
    };
    poner();
    let guard = 0;
    while (peor() < PM_AIRE && guard++ < 24) {
      if (extra > 0) extra -= 2;
      else if (borde > PM_BORDE_MIN) borde -= 1;
      else if (sombra > 0) sombra -= 1;
      else break;
      poner();
    }
  }
  let pmColocado = { id: null, t: -1e9 };
  function pintarPm(forzar) {
    const id = pmPaso(forzar);
    pm.hidden = !id;
    if (id) pm.dataset.paso = id;
    pm.classList.toggle('pm-atascado', !!id && pmE.t >= 20);
    const q = document.getElementById('quest');
    if (q) q.classList.toggle('pm-senala', !!id && pmE.t >= 20);
    // colocar el anillo también mide el layout: solo al cambiar de paso o cada 500 ms (el botón no se mueve solo)
    const ahora = performance.now();
    if (id && (forzar || pmForzar || pmColocado.id !== id || ahora - pmColocado.t > 500)) { colocarPm(); pmColocado = { id, t: ahora }; }
  }
  addEventListener('resize', () => { if (!pm.hidden) { colocarPm(); pmColocado.t = performance.now(); } });
  function pmTick(dt) {
    const M = G.fisica.MOVE, jugando = pmForzar || enJuego();
    if (!jugando || (G.quiet && !pmForzar)) {
      pm.hidden = true;
      const q = document.getElementById('quest'); if (q) q.classList.remove('pm-senala');
      return;
    }
    if ((M.speed || 0) > 0.8 || Math.hypot(G.input.stick.x, G.input.stick.y) > 0.35) pmMarcar('mover');
    if (M.flying) { pmMarcar('despegar'); pmE.volaba = true; }
    if (pmE.volaba && !M.flying && M.grounded) pmMarcar('posar');
    if ((M.dashT || 0) > 0 || (G.input.keys && G.input.keys.has('f'))) pmMarcar('impulso');
    const id = pmPaso();
    if (pmE.visto && id !== pmE.visto) pmE.t = 0;
    pmE.visto = id;
    if (id) pmE.t += dt || 0; else pmE.t = 0;
    pintarPm();
  }
  G.on('truco', () => { pmMarcar('truco'); pintarPm(true); });

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
    pmTick(dt || 0);
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

  function primerosMinutosTest() {
    const out = [], ok = (name, pass, extra) => out.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const M = G.fisica.MOVE, K = G.input.keys, st = G.input.stick;
    const guarda = { speed: M.speed, flying: M.flying, grounded: M.grounded, dashT: M.dashT, quiet: G.quiet, sx: st.x, sy: st.y };
    const teclas0 = ['w', 'a', 's', 'd', 'f'];
    const tenia = teclas0.filter(k => K.has(k));
    try {
      pmForzar = true; G.quiet = false;
      pmE.hecho = {}; pmE.t = 0; pmE.volaba = false;
      forzado = 'teclado';
      M.speed = 0; M.flying = false; M.grounded = true; M.dashT = 0; st.x = st.y = 0;
      pmTick(0.1);
      ok('Al empezar la pista visual es moverse, sin ventana de texto', pm.dataset.paso === 'mover' && !pm.hidden && !pm.querySelector('p'), pm.dataset.paso);
      K.add('w'); M.speed = 2; pmTick(0.2);
      ok('Con la tecla de caminar la pista de moverse se apaga', pm.dataset.paso !== 'mover', pm.dataset.paso);
      M.flying = true; M.grounded = false; pmTick(0.1);
      ok('Al despegar la pista pasa a posarse', pm.dataset.paso === 'posar', pm.dataset.paso);
      M.flying = false; M.grounded = true; pmTick(0.1);
      ok('Al posarse la pista pasa al impulso', pm.dataset.paso === 'impulso', pm.dataset.paso);
      M.dashT = 0.1; pmTick(0.05);
      ok('El impulso apaga su pista y queda el truco', pm.dataset.paso === 'truco', pm.dataset.paso);
      pmMarcar('truco'); pintarPm();
      ok('Con el truco hecho no queda pista', pm.hidden, pm.dataset.paso || '');
      pmE.hecho = { mover: true }; pmE.t = 0; M.flying = false; M.dashT = 0; M.speed = 0;
      pmTick(21);
      ok('Si pasan 20 s sin avanzar, la guía señala el objetivo', pm.classList.contains('pm-atascado') && document.getElementById('quest').classList.contains('pm-senala'), String(pmE.t));
      forzado = 'tactil'; pmE.hecho = {}; pmE.t = 0; pmE.volaba = false; st.x = 0.6; st.y = 0;
      pmTick(0.2);
      ok('En táctil, mover el joystick apaga la pista de moverse', pmE.hecho.mover === true && pm.dataset.paso !== 'mover', pm.dataset.paso);
      const acts = document.getElementById('acts'), dash = document.getElementById('b-dash');
      const disp = acts ? acts.style.display : '';
      if (acts) acts.style.display = 'grid';
      pmE.hecho = { mover: true, despegar: true, posar: true }; pmE.t = 0; pmE.volaba = true;
      M.flying = false; M.grounded = true; M.speed = 0; M.dashT = 0; st.x = st.y = 0;
      pmTick(0.05);
      const bordeDe = () => parseFloat(getComputedStyle(pm).borderTopWidth) || 0;
      const sombraDe = () => {
        const px = (getComputedStyle(pm).boxShadow.match(/-?[\d.]+px/g) || []).map(s => Math.abs(parseFloat(s)));
        return px.length >= 4 ? px[3] : 0;
      };
      const rodeaA = (anillo, boton) => {
        const borde = bordeDe();
        return anillo.left + borde <= boton.left + 1 && anillo.top + borde <= boton.top + 1 && anillo.right - borde >= boton.right - 1 && anillo.bottom - borde >= boton.bottom - 1;
      };
      const margenDe = () => {
        const som = sombraDe(), rI = pm.getBoundingClientRect();
        const vecinos = [...document.querySelectorAll('#b-act, #b-jump')].filter(n => !n.hidden && n.getClientRects().length);
        const huecos = vecinos.map(n => ({ id: n.id, px: huecoPm({ left: rI.left - som, right: rI.right + som, top: rI.top - som, bottom: rI.bottom + som }, n.getBoundingClientRect()) }));
        return { som, rodea: rodeaA(rI, dash.getBoundingClientRect()), huecos, peor: huecos.reduce((m, h) => Math.min(m, h.px), Infinity) };
      };
      const b = dash.getBoundingClientRect(), r = pm.getBoundingClientRect();
      const flecha = getComputedStyle(pm, '::before').top;
      ok('El anillo del impulso rodea el botón y la flecha queda fuera', pm.dataset.paso === 'impulso' && b.width >= 44 && rodeaA(r, b) && parseFloat(flecha) < 0,
        'botón ' + Math.round(b.width) + '×' + Math.round(b.height) + ' anillo ' + Math.round(r.width) + ' flecha ' + flecha);
      const raiz = document.documentElement, lg0 = raiz.style.getPropertyValue('--tap-lg'), xl0 = raiz.style.getPropertyValue('--tap-xl');
      const cols0 = acts ? acts.style.gridTemplateColumns : '', rows0 = acts ? acts.style.gridTemplateRows : '', gap0 = acts ? acts.style.gap : '';
      const jump = document.getElementById('b-jump'), sz0 = jump ? jump.style.getPropertyValue('--sz') : '';
      const ponerMandos = (modo) => {
        if (modo === 'vertical') {
          raiz.style.setProperty('--tap-lg', '56px'); raiz.style.setProperty('--tap-xl', '68px');
          if (acts) { acts.style.gridTemplateColumns = '60px var(--tap-xl)'; acts.style.gridTemplateRows = '56px var(--tap-xl)'; acts.style.gap = '8px'; }
          if (jump) jump.style.setProperty('--sz', '60px');
        } else {
          raiz.style.setProperty('--tap-lg', '58px'); raiz.style.setProperty('--tap-xl', '80px');
          if (acts) { acts.style.gridTemplateColumns = ''; acts.style.gridTemplateRows = ''; acts.style.gap = '8px'; }
          if (jump) { if (sz0) jump.style.setProperty('--sz', sz0); else jump.style.removeProperty('--sz'); }
        }
        pmE.hecho = { mover: true, despegar: true, posar: true }; pmE.t = 0; pmTick(0.05);
      };
      ponerMandos('vertical');
      const v = margenDe();
      ok('En vertical la sombra del impulso queda a más de un píxel de Acción y de Saltar', pm.dataset.paso === 'impulso' && v.huecos.length === 2 && v.rodea && v.peor >= PM_AIRE,
        v.huecos.map(h => h.id + ' ' + h.px.toFixed(1)).join(', ') + ' sombra ' + v.som);
      ponerMandos('horizontal');
      const h = margenDe();
      ok('En horizontal la sombra del impulso queda a más de un píxel de Acción y de Saltar', pm.dataset.paso === 'impulso' && h.huecos.length === 2 && h.rodea && h.peor >= PM_AIRE,
        h.huecos.map(x => x.id + ' ' + x.px.toFixed(1)).join(', ') + ' sombra ' + h.som);
      const fly = document.getElementById('b-fly');
      if (fly) fly.hidden = true;
      pmE.hecho = { mover: true, posar: true, impulso: true, truco: true }; pmE.t = 19; pmE.visto = 'despegar'; pmE.volaba = false;
      M.flying = false; M.grounded = true; M.speed = 0; M.dashT = 0; st.x = st.y = 0;
      pmTick(5);
      const qOff = document.getElementById('quest');
      ok('Si despegar no se puede, su contador no señala la misión', pm.hidden && !pm.classList.contains('pm-atascado') && !(qOff && qOff.classList.contains('pm-senala')) && pmE.t < 20,
        't ' + pmE.t + ' paso ' + (pm.dataset.paso || ''));
      pmE.hecho = { mover: true }; pmE.t = 19; pmE.visto = 'despegar'; pmE.volaba = false;
      pmTick(0.05);
      const rOff = pm.getBoundingClientRect();
      ok('Sin el botón de volar, despegar no sigue activo y el anillo no cae sobre Impulso', pm.dataset.paso === 'impulso' && !pm.hidden && pmE.t < 1 && huecoPm(rOff, dash.getBoundingClientRect()) < 0,
        'paso ' + pm.dataset.paso + ' t ' + pmE.t + ' left ' + Math.round(rOff.left));
      if (fly) fly.hidden = false;
      pmTick(0.05);
      ok('Al volver el botón de volar, despegar cuenta de nuevo sin el atasco', pm.dataset.paso === 'despegar' && pmE.t < 1 && !pm.classList.contains('pm-atascado'),
        't ' + pmE.t);
      if (lg0) raiz.style.setProperty('--tap-lg', lg0); else raiz.style.removeProperty('--tap-lg');
      if (xl0) raiz.style.setProperty('--tap-xl', xl0); else raiz.style.removeProperty('--tap-xl');
      if (jump) { if (sz0) jump.style.setProperty('--sz', sz0); else jump.style.removeProperty('--sz'); }
      if (acts) { acts.style.gridTemplateColumns = cols0; acts.style.gridTemplateRows = rows0; acts.style.gap = gap0; acts.style.display = disp; }
    } catch (e) { ok('sin excepciones', false, e && e.message); }
    const flyFin = document.getElementById('b-fly'); if (flyFin) flyFin.hidden = false;
    M.speed = guarda.speed; M.flying = guarda.flying; M.grounded = guarda.grounded; M.dashT = guarda.dashT;
    G.quiet = guarda.quiet; st.x = guarda.sx; st.y = guarda.sy;
    tenia.forEach(k => K.add(k)); teclas0.forEach(k => { if (!tenia.includes(k)) K.delete(k); });
    const q = document.getElementById('quest'); if (q) q.classList.remove('pm-senala');
    pmForzar = false; forzado = null; pmE.hecho = {}; pmE.t = 0; pmE.visto = ''; pintarPm();
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }
  setTimeout(() => { const AV = window.AV; if (AV && AV.G === G && !AV.primerosMinutosTest) AV.primerosMinutosTest = primerosMinutosTest; }, 0);

  return { mostrar, cerrar, leyenda, estado: () => ({ panel: panelAbierto, leyenda: !ley.hidden, pista: pistaId, hecho: Object.assign({}, est.hecho), tactil: tactil(), primeros: pmPaso(true) }), prueba };
});
