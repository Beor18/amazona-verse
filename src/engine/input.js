/* AVE · entrada
   Teclado (WASD/flechas, Espacio, F, V, C, E/Enter, Q/R, T/G mirar arriba/abajo (los lee camara.js), 1–7, Esc), joystick táctil, botones de acción y arrastre para girar la cámara.
   CG-40: en el móvil el joystick nace bajo el dedo (mitad del pulgar; a la derecha si el modo es zurdo), con zona muerta y una curva que acelera al empujar más. El otro dedo gira la cámara y no suelta el palo. Un latigazo vertical en el lado de los botones despega (arriba) o pide aterrizar (abajo). Al tocar suelo o recoger una cosa, una vibración corta.
   Solo traduce entrada a llamadas: G.fisica (saltar, soltar el salto, impulso, volar/aterrizar), G.actores (gestos), G.interaccion (acción).
   Volar y dejar de volar: V (o el botón Volar) despega; volando, V (o el botón, que pasa a decir "Aterrizar") baja suave hasta el
   suelo; otra vez V o Saltar sigue volando. Volando sin tocar nada se queda cernida en el sitio; Espacio sube y C baja.
   Esc emite el gancho 'escape' (un pack cancela ahí sus modos, p. ej. construir) y cierra la tarjeta abierta.
   Con el juego en pausa (G.pausa) se ignoran las acciones: saltar, impulso, volar, gestos, Acción y los botones táctiles.
   Remapeo (sección «Teclas» del menú de pausa, solo con teclado): mover (W A S D), volar (V, alterna como siempre),
   aterrizar (X, solo baja) y acción (E) se pueden cambiar; asignar una tecla que ya usa otra acción las intercambia.
   Las flechas, Enter (acción) y las demás teclas quedan fijas y no se pueden asignar. Se guarda en este dispositivo,
   aparte de la partida: localStorage `<almacen>.teclas` = { v: 1, mapa: { arriba, abajo, izquierda, derecha, volar,
   aterrizar, accion } } (sin la clave = teclas de fábrica). `keys` sigue usando las teclas canónicas ('w' 'a' 's' 'd'
   para mover), así fisica.js no cambia.
   PRUEBAS: G.input.test() (AV.teclasTest) comprueba remapeo, intercambio, reservadas, guardado y restablecer. */
AVE.module('input', function (G) {
  'use strict';
  const $ = G.util.$;
  const keys = new Set();
  const stick = { x: 0, y: 0 };
  let jumpHeld = false, diveHeld = false;
  const paused = () => !!(G.pausa && G.pausa.activa());

  // ---------- Mapa de teclas ----------
  const ACCIONES = ['arriba', 'abajo', 'izquierda', 'derecha', 'volar', 'aterrizar', 'accion'];
  const DEFECTO = { arriba: 'w', abajo: 's', izquierda: 'a', derecha: 'd', volar: 'v', aterrizar: 'x', accion: 'e' };
  const CANON = { arriba: 'w', abajo: 's', izquierda: 'a', derecha: 'd' }; // lo que fisica.js lee en `keys`
  const NOMBRES = { arriba: 'Avanzar', abajo: 'Retroceder', izquierda: 'Izquierda', derecha: 'Derecha',
    volar: 'Volar (otra vez: aterrizar)', aterrizar: 'Aterrizar', accion: 'Acción: hablar, examinar, usar' };
  // Fijas: Espacio, C, F, Q, R y los gestos 1–7 ya tienen función; las teclas con nombre (flechas, Enter, Shift, Esc…) tampoco
  const RESERVADAS = new Set([' ', 'c', 'f', 'q', 'r', '1', '2', '3', '4', '5', '6', '7']);
  const asignable = k => typeof k === 'string' && [...k].length === 1 && k.trim() !== '' && !RESERVADAS.has(k);
  const CLAVE = ((G.pack && G.pack.meta && G.pack.meta.almacen) || 'amazonaverse') + '.teclas';
  function valido(m) {
    if (!m || typeof m !== 'object') return false;
    const vistas = new Set();
    for (const a of ACCIONES) { const k = m[a]; if (!asignable(k) || vistas.has(k)) return false; vistas.add(k); }
    return true;
  }
  function leerMapa() {
    try { const d = JSON.parse(localStorage.getItem(CLAVE) || 'null'); if (d && valido(d.mapa)) return Object.assign({}, d.mapa); } catch (e) { /* sin almacenamiento o dañado */ }
    return Object.assign({}, DEFECTO);
  }
  function guardarMapa() {
    try {
      if (ACCIONES.every(a => mapa[a] === DEFECTO[a])) localStorage.removeItem(CLAVE);
      else localStorage.setItem(CLAVE, JSON.stringify({ v: 1, mapa: Object.fromEntries(ACCIONES.map(a => [a, mapa[a]])) }));
      return true;
    } catch (e) { return false; }
  }
  let mapa = leerMapa();
  const accionDe = k => ACCIONES.find(a => mapa[a] === k) || null;
  // ¿La tecla del evento hace esta acción? (Enter siempre es Acción; ui.js lo usa también para saltar el texto)
  const es = (accion, e) => mapa[accion] === e.key.toLowerCase() || (accion === 'accion' && e.key === 'Enter');
  // Asigna una tecla; si otra acción la usaba, se intercambian. false si la tecla no se puede asignar.
  function asignar(accion, tecla) {
    const k = String(tecla || '').toLowerCase();
    if (!ACCIONES.includes(accion) || !asignable(k)) return false;
    const otra = accionDe(k);
    if (otra && otra !== accion) mapa[otra] = mapa[accion];
    mapa[accion] = k;
    soltarTodo(); guardarMapa(); pintar();
    return true;
  }
  function restablecer() { mapa = Object.assign({}, DEFECTO); soltarTodo(); guardarMapa(); pintar(); }

  // Qué metió cada tecla física en `keys`, para sacar justo eso al soltarla
  const pulsadas = new Map();
  function soltarTodo() { keys.clear(); pulsadas.clear(); }
  function tokenDe(k) {
    const a = accionDe(k);
    if (a) return CANON[a] || null; // volar, aterrizar y acción son pulsaciones, no se mantienen
    return Object.values(CANON).includes(k) ? null : k; // una W que ya no mueve no cuenta como W
  }

  // Foco con el ratón en un botón del HUD (Diario, Gestos, Pausa, Controles): tras un clic el botón se queda con el foco y el
  // Espacio lo volvía a pulsar en lugar de saltar o subir volando («a veces no eleva más»). Ahora el Espacio va al juego y el
  // botón suelta el foco. Navegando con Tab, Espacio y Enter activan el botón como siempre.
  let conTab = false;
  addEventListener('keydown', e => { if (e.key === 'Tab') conTab = true; }, true);
  addEventListener('pointerdown', () => { conTab = false; }, true);
  const botonDelHud = b => !conTab && !b.closest('#pause, #card, #dialog, #creator, #comic, #end') && !!b.closest('#sys, #acts, #emotes, .guia-hud');
  addEventListener('keydown', e => {
    if (capturando) return; // la sección Teclas está esperando una tecla
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.target && e.target.tagName === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) {
      if (e.key !== ' ' || !botonDelHud(e.target)) return;
      e.target.blur();
    }
    const k = e.key.toLowerCase(), t = tokenDe(k);
    if (t != null) { keys.add(t); pulsadas.set(k, t); }
    if (paused()) { if (e.key === ' ') e.preventDefault(); return; }
    if (e.key === ' ') { jumpHeld = true; if (!e.repeat) G.fisica.tryJump(); e.preventDefault(); }
    if (k === 'f' && !e.repeat) { G.fisica.tryDash(); if (G.dones && G.dones.sostener) G.dones.sostener(true); }
    if (es('volar', e) && !e.repeat) G.fisica.toggleFly();
    if (es('aterrizar', e) && !e.repeat) G.fisica.land();
    if (/^[1-7]$/.test(e.key) && !e.repeat) G.actores.playEmote(G.actores.EMOTE_KEYS[+e.key - 1]);
    if (es('accion', e)) G.interaccion.action();
    if (e.key === 'Escape') { G.emit('escape'); G.ui.hideCard(); }
  });
  addEventListener('keyup', e => {
    const k = e.key.toLowerCase();
    if (pulsadas.has(k)) { keys.delete(pulsadas.get(k)); pulsadas.delete(k); } else keys.delete(k);
    if (e.key === ' ') { jumpHeld = false; G.fisica.releaseJump(); }
    if (k === 'f' && G.dones && G.dones.sostener) G.dones.sostener(false);
  });
  addEventListener('blur', () => { soltarTodo(); jumpHeld = false; if (G.dones && G.dones.sostener) G.dones.sostener(false); });

  // ---------- Sección «Teclas» del menú de pausa ----------
  // Reusa los estilos de la ayuda (.pause-help, .keys, .chip, kbd) y, como .help-keys, se oculta en pantallas táctiles.
  const etiqueta = k => (k.length === 1 ? k.toUpperCase() : k);
  let capturando = null, sec = null;
  function montar() {
    const menu = $('pause'), ayuda = menu && menu.querySelector('.pause-help');
    if (!ayuda) return;
    sec = document.createElement('section');
    sec.className = 'pause-help pause-teclas help-keys'; sec.setAttribute('aria-labelledby', 'teclas-titulo');
    sec.innerHTML = '<h3 id="teclas-titulo">Teclas</h3><dl class="keys">' + ACCIONES.map(a =>
      `<div><dt><button class="chip" type="button" data-tecla="${a}"></button></dt><dd>${NOMBRES[a]}</dd></div>`).join('') +
      '</dl><p class="note" id="teclas-nota" aria-live="polite"></p>' +
      '<div class="row"><button class="btn ghost" type="button" id="b-teclas-reset" data-icon="reset">Restablecer teclas</button></div>';
    ayuda.after(sec);
    sec.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.id === 'b-teclas-reset') { capturando = null; restablecer(); nota('Teclas de fábrica restablecidas.'); }
      else if (b.dataset.tecla) { capturando = capturando === b.dataset.tecla ? null : b.dataset.tecla; pintar(); nota(capturando ? 'Pulsa la tecla nueva (Esc cancela).' : ''); }
    });
    menu.addEventListener('toggle', () => { if (capturando) { capturando = null; pintar(); nota(''); } });
  }
  function nota(t) { const n = sec && sec.querySelector('#teclas-nota'); if (n) n.textContent = t; }
  // Fase de captura: la tecla elegida no llega al juego ni a los botones (ni Esc cierra el menú mientras se elige)
  addEventListener('keydown', e => {
    if (!capturando) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.repeat || ['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
    const a = capturando;
    if (e.key === 'Escape') { capturando = null; pintar(); nota(''); return; }
    const antes = accionDe(e.key.toLowerCase());
    capturando = null;
    if (!asignar(a, e.key)) { capturando = a; nota(`«${etiqueta(e.key)}» no se puede usar: ya tiene otra función. Prueba otra tecla.`); return; }
    nota(antes && antes !== a ? `Hecho. ${NOMBRES[antes]} pasa a ${etiqueta(mapa[antes])}.` : 'Hecho.');
  }, true);
  // Pinta los botones de la sección, la ayuda de controles y la pista del HUD con las teclas actuales
  function pintar() {
    if (sec) sec.querySelectorAll('[data-tecla]').forEach(b => {
      const a = b.dataset.tecla, esperando = capturando === a;
      b.innerHTML = esperando ? 'Pulsa una tecla…' : `<kbd>${etiqueta(mapa[a])}</kbd>`;
      b.setAttribute('aria-pressed', String(esperando));
      b.setAttribute('aria-label', `${NOMBRES[a]}: ${etiqueta(mapa[a])}. Pulsa para cambiarla`);
    });
    const mover = ['arriba', 'izquierda', 'abajo', 'derecha'].map(a => `<kbd>${etiqueta(mapa[a])}</kbd>`).join('');
    const ayuda = document.querySelectorAll('#pause .help-keys:not(.pause-teclas) > div');
    for (const fila of ayuda) {
      const dd = fila.querySelector('dd'), dt = fila.querySelector('dt'), txt = dd ? dd.textContent : '';
      if (/^Moverte/.test(txt)) dt.innerHTML = mover;
      else if (/^Volar/.test(txt)) dt.innerHTML = `<kbd>${etiqueta(mapa.volar)}</kbd>`;
      else if (/^Acción/.test(txt)) dt.innerHTML = `<kbd>${etiqueta(mapa.accion)}</kbd>`;
    }
    const pista = document.querySelectorAll('#keyhint kbd');
    if (pista[0]) pista[0].textContent = ['arriba', 'izquierda', 'abajo', 'derecha'].map(a => etiqueta(mapa[a])).join('');
    if (pista[2]) pista[2].textContent = etiqueta(mapa.accion);
  }
  montar(); pintar();

  const stickEl = $('stick'), knob = $('knob');
  let stickId = null, gesto = null, vibrarPrueba = false, nRec = -1, ultimaVibra = 0;
  const MUERTA = 0.2, CURVA = 1.45; // por debajo no hay marcha; a partir de ahí la salida crece más rápido que el dedo
  const ladoPalo = () => { const n = parseFloat(getComputedStyle(stickEl).width); return n > 20 ? n : 136; };
  const zurdo = () => document.documentElement.classList.contains('a11y-zurdo');
  const unaMano = () => document.documentElement.classList.contains('a11y-unamano');
  // Con una mano el palo se queda en su esquina: solo lo agarra un toque encima de él. El resto de la pantalla gira la cámara.
  const zonaPalo = (x, y) => {
    if (unaMano()) {
      const r = stickEl.getBoundingClientRect();
      if (r.width < 8) return false;
      const dentroX = x >= r.left - 12 && x <= r.right + 12;
      if (y == null) return dentroX;
      return dentroX && y >= r.top - 12 && y <= r.bottom + 12;
    }
    return zurdo() ? x > innerWidth * 0.55 : x < innerWidth * 0.45;
  };
  function colocarPalo(x, y) {
    const lado = ladoPalo();
    stickEl.style.left = Math.max(8, Math.min(innerWidth - lado - 8, x - lado / 2)) + 'px';
    stickEl.style.top = Math.max(8, Math.min(innerHeight - lado - 8, y - lado / 2)) + 'px';
    stickEl.style.right = 'auto'; stickEl.style.bottom = 'auto';
    stickEl.classList.add('flotando');
  }
  function soltarPalo() { stickId = null; stick.x = stick.y = 0; knob.style.transform = ''; }
  function moveStick(e) {
    const r = stickEl.getBoundingClientRect();
    const radio = Math.max(24, (r.width > 2 ? r.width : ladoPalo()) / 2);
    const cx = r.width > 2 ? r.left + radio : e.clientX, cy = r.height > 2 ? r.top + radio : e.clientY;
    let dx = (e.clientX - cx) / radio, dy = (e.clientY - cy) / radio;
    const mag = Math.hypot(dx, dy) || 1, vis = Math.min(1, mag);
    knob.style.transform = `translate(${dx / mag * vis * 35}px, ${dy / mag * vis * 35}px)`;
    if (mag < MUERTA) { stick.x = stick.y = 0; return; }
    const n = Math.min(1, (mag - MUERTA) / (1 - MUERTA)), a = Math.pow(n, CURVA);
    stick.x = dx / mag * a; stick.y = dy / mag * a;
  }
  function tomarPalo(e) {
    if (paused() || stickId != null) return false;
    const toque = !e.pointerType || e.pointerType === 'touch' || e.pointerType === 'pen';
    if (!toque) return false;
    if (unaMano()) stickEl.classList.remove('flotando');
    else colocarPalo(e.clientX, e.clientY);
    stickId = e.pointerId;
    try { stickEl.setPointerCapture(e.pointerId); } catch (err) { /* el dedo sigue en el lienzo */ }
    moveStick(e);
    return true;
  }
  stickEl.addEventListener('pointerdown', e => { e.preventDefault(); tomarPalo(e); });
  addEventListener('pointermove', e => { if (e.pointerId === stickId) moveStick(e); }, true);
  addEventListener('pointerup', e => { if (e.pointerId === stickId) soltarPalo(); }, true);
  addEventListener('pointercancel', e => { if (e.pointerId === stickId) soltarPalo(); }, true);
  // Vibración corta al posarse y al recoger. En el escritorio no se llama: Chrome lo anota si no hubo un toque.
  function zumba(ms) {
    if (!vibrarPrueba && !(G.renderer && G.renderer.MOBILE)) return;
    ultimaVibra = ms;
    if (!navigator.vibrate) return;
    if (navigator.userActivation && navigator.userActivation.hasBeenActive === false) return;
    try { navigator.vibrate(ms); } catch (e) { /* este aparato no vibra */ }
  }
  function mirarRecogido() {
    const n = (G.S && G.S.collected && G.S.collected.length) || 0;
    if (nRec < 0) { nRec = n; return; }
    if (n === nRec + 1) zumba(14);
    nRec = n;
  }
  G.on('update', mirarRecogido);
  G.on('vuelo', on => { if (!on) zumba(20); });
  const jumpBtn = $('b-jump');
  jumpBtn.addEventListener('pointerdown', e => { e.preventDefault(); if (paused()) return; jumpHeld = true; G.fisica.tryJump(); });
  const jumpUp = () => { if (jumpHeld) G.fisica.releaseJump(); jumpHeld = false; };
  jumpBtn.addEventListener('pointerup', jumpUp);
  jumpBtn.addEventListener('pointerleave', jumpUp);
  jumpBtn.addEventListener('pointercancel', jumpUp);
  const dashBtn = $('b-dash');
  dashBtn.addEventListener('pointerdown', e => { e.preventDefault(); if (paused()) return; G.fisica.tryDash(); if (G.dones && G.dones.sostener) G.dones.sostener(true); });
  const dashUp = () => { if (G.dones && G.dones.sostener) G.dones.sostener(false); };
  dashBtn.addEventListener('pointerup', dashUp);
  dashBtn.addEventListener('pointerleave', dashUp);
  dashBtn.addEventListener('pointercancel', dashUp);
  $('b-fly').addEventListener('pointerdown', e => { e.preventDefault(); if (!paused()) G.fisica.toggleFly(); });
  const actBtn = $('b-act');
  // pointerdown como los demás botones: en iOS el 'click' de un segundo dedo (con el joystick agarrado) no llega
  actBtn.addEventListener('pointerdown', e => { e.preventDefault(); if (!paused()) G.interaccion.action(); });
  // Bucear en táctil: mantener el botón equivale a mantener C
  // (en el agua ocupa el lugar de Volar, así caben los botones en un teléfono)
  const diveBtn = $('b-dive'), flyBtn = $('b-fly');
  diveBtn.addEventListener('pointerdown', e => { e.preventDefault(); diveHeld = true; keys.add('c'); });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) diveBtn.addEventListener(ev, () => { if (diveHeld) keys.delete('c'); diveHeld = false; });
  // Muestra Bucear en lugar de Volar mientras se nada; volando, el botón Volar dice "Aterrizar" (y al revés mientras aterriza)
  function syncSwimButtons(swimming) {
    if (diveBtn.hidden === !!swimming) {
      diveBtn.hidden = !swimming; flyBtn.hidden = !!swimming;
      if (!swimming && diveHeld) { keys.delete('c'); diveHeld = false; }
    }
    const M = G.fisica.MOVE, land = M.flying && !M.landing, label = land ? 'Aterrizar' : 'Volar';
    if (flyBtn.textContent !== label) {
      flyBtn.textContent = label; flyBtn.dataset.icon = land ? 'dive' : 'wing';
      flyBtn.setAttribute('aria-label', land ? 'Aterrizar: bajar suave hasta el suelo' : 'Volar');
    }
  }

  // Arrastrar en el lienzo gira la cámara; en vertical inclina la vista (hacia arriba mira al cielo)
  const canvas = G.renderer.canvas;
  // Bug del iPad de Kelvin (2-nov, «se me va en un zoom»): un toque con el dedo temblaba unos píxeles e inclinaba la vista (la
  // cámara orbitaba y se acercaba al suelo o al acantilado), y un pellizco con dos dedos se leía como arrastre. Ahora un toque
  // no mueve la cámara hasta pasar ZONA_MUERTA px, y con dos dedos en el lienzo no se gira (se espera a levantarlos todos).
  const ZONA_MUERTA = { touch: 10, pen: 6 }, enLienzo = new Set();
  let dragId = null, dragX = 0, dragY = 0, dragVivo = false, dosDedos = false;
  canvas.addEventListener('pointerdown', e => {
    enLienzo.add(e.pointerId);
    if (e.pointerId === stickId) return;
    const toque = e.pointerType === 'touch' || e.pointerType === 'pen';
    if (toque && stickId == null && zonaPalo(e.clientX, e.clientY) && tomarPalo(e)) return;
    // Dos dedos en el lienzo, y ninguno es el joystick: es un pellizco, no un giro. Si uno ya es el palo, el otro sí gira.
    if (enLienzo.size > 1 && stickId == null) { dosDedos = true; dragId = null; return; }
    dragId = e.pointerId; dragX = e.clientX; dragY = e.clientY; dragVivo = !(ZONA_MUERTA[e.pointerType] > 0);
    gesto = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), yaw: G.camara.yaw, pitch: 0, derecha: !zonaPalo(e.clientX, e.clientY) };
  });
  canvas.addEventListener('pointermove', e => {
    if (e.pointerId === stickId || e.pointerId !== dragId || dosDedos) return;
    if (!dragVivo) { if (Math.hypot(e.clientX - dragX, e.clientY - dragY) < ZONA_MUERTA[e.pointerType]) return; dragVivo = true; dragX = e.clientX; dragY = e.clientY; return; }
    const ninosCam = (G.ninos && G.ninos.camara) || { sensibilidad: 1, invertir: 1 };
    G.camara.yaw -= (e.clientX - dragX) * 0.006 * ninosCam.sensibilidad; dragX = e.clientX;
    const dPitch = (dragY - e.clientY) * 0.005 * ninosCam.sensibilidad * ninosCam.invertir;
    if (gesto && gesto.id === e.pointerId) gesto.pitch += dPitch;
    if (G.camara.inclinar) G.camara.inclinar(dPitch); dragY = e.clientY;
    if (G.camara.manual) G.camara.manual();
  });
  const endDrag = e => {
    enLienzo.delete(e.pointerId);
    if (gesto && gesto.id === e.pointerId) {
      const dt = performance.now() - gesto.t, dy = e.clientY - gesto.y, dx = e.clientX - gesto.x;
      const toque = e.pointerType === 'touch' || e.pointerType === 'pen';
      if (toque && gesto.derecha && dt < 340 && Math.abs(dy) > 70 && Math.abs(dy) > Math.abs(dx) * 1.6 && !paused()) {
        G.camara.yaw = gesto.yaw;
        if (gesto.pitch && G.camara.inclinar) G.camara.inclinar(-gesto.pitch);
        if (dy < 0 && !G.fisica.MOVE.flying) G.fisica.startFlying();
        else if (dy > 0 && G.fisica.MOVE.flying) G.fisica.land();
      }
      gesto = null;
    }
    if (e.pointerId === dragId) dragId = null;
    if (!enLienzo.size) dosDedos = false;
  };
  addEventListener('pointerup', endDrag, true); addEventListener('pointercancel', endDrag, true); // en window: el dedo puede levantarse sobre un botón del HUD

  // ---------- Pruebas (AV.teclasTest) ----------
  // Deja el mapa y el almacén como estaban. Los eventos sintéticos solo usan teclas de mover (no disparan acciones).
  function test() {
    const results = [], ok = (name, pass, extra) => results.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    let crudo = null; try { crudo = localStorage.getItem(CLAVE); } catch (e) { /* sin almacenamiento */ }
    const previo = Object.assign({}, mapa);
    const tecla = (tipo, key) => dispatchEvent(new KeyboardEvent(tipo, { key }));
    try {
      restablecer();
      ok('de fábrica: WASD, V, X, E', ACCIONES.every(a => mapa[a] === DEFECTO[a]), JSON.stringify(mapa));
      ok('de fábrica no deja nada guardado', (() => { try { return localStorage.getItem(CLAVE) === null; } catch (e) { return true; } })());
      ok('asignar avanzar a I', asignar('arriba', 'I') && mapa.arriba === 'i', mapa.arriba);
      tecla('keydown', 'i'); const mueve = keys.has('w'); tecla('keyup', 'i');
      ok('I mueve (keys recibe la «w» canónica) y se suelta', mueve && !keys.has('w'));
      tecla('keydown', 'w'); const viejaW = keys.has('w'); tecla('keyup', 'w');
      ok('la W ya no mueve', !viejaW);
      ok('flechas siguen fijas', (tecla('keydown', 'ArrowUp'), keys.has('arrowup')) && (tecla('keyup', 'ArrowUp'), !keys.has('arrowup')));
      ok('tecla ocupada: se intercambian', asignar('accion', 'i') && mapa.accion === 'i' && mapa.arriba === 'e', `${mapa.accion}/${mapa.arriba}`);
      ok('reservadas rechazadas (Espacio, C, 1, Enter, flecha)', ![' ', 'c', '1', 'Enter', 'ArrowUp'].some(k => asignar('volar', k)) && mapa.volar === 'v');
      const accionReal = G.interaccion.action; let toques = 0;
      G.interaccion.action = () => { toques++; };
      try { actBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch' })); } finally { G.interaccion.action = accionReal; }
      ok('botón Acción táctil responde al tocar (pointerdown)', toques === (paused() ? 0 : 1), String(toques));
      ok('sin teclas repetidas', new Set(ACCIONES.map(a => mapa[a])).size === ACCIONES.length);
      asignar('aterrizar', 'b');
      ok('es(): aterrizar con B, acción con I y con Enter', es('aterrizar', { key: 'B' }) && es('accion', { key: 'I' }) && es('accion', { key: 'Enter' }) && !es('accion', { key: 'e' }));
      let g = null; try { g = JSON.parse(localStorage.getItem(CLAVE)); } catch (e) { /* sin almacenamiento */ }
      ok('se guarda en el dispositivo', g && g.v === 1 && g.mapa.accion === 'i' && g.mapa.aterrizar === 'b', JSON.stringify(g));
      const relee = leerMapa();
      ok('se relee igual', ACCIONES.every(a => relee[a] === mapa[a]));
      try { localStorage.setItem(CLAVE, JSON.stringify({ v: 1, mapa: { arriba: 'w', abajo: 'w' } })); } catch (e) { /* sin almacenamiento */ }
      ok('un guardado dañado vuelve a fábrica', ACCIONES.every(a => leerMapa()[a] === DEFECTO[a]));
      ok('la sección pinta las teclas', !!sec && sec.querySelectorAll('[data-tecla]').length === ACCIONES.length &&
        sec.querySelector('[data-tecla="accion"] kbd').textContent === 'I' && !!sec.querySelector('#b-teclas-reset'));
      const pista = document.querySelector('#keyhint kbd');
      ok('la pista del HUD sigue el mapa', !pista || pista.textContent === 'EASD', pista && pista.textContent);
      sec.querySelector('#b-teclas-reset').click();
      ok('Restablecer vuelve a fábrica y borra lo guardado', ACCIONES.every(a => mapa[a] === DEFECTO[a]) &&
        (() => { try { return localStorage.getItem(CLAVE) === null; } catch (e) { return true; } })());
      ok('la pista vuelve a WASD', !pista || pista.textContent === 'WASD');
    } catch (e) { ok('sin excepciones', false, e && e.message); }
    mapa = previo; soltarTodo(); pintar(); nota(''); capturando = null;
    try { if (crudo == null) localStorage.removeItem(CLAVE); else localStorage.setItem(CLAVE, crudo); } catch (e) { /* sin almacenamiento */ }
    return { passed: results.filter(r => r.ok).length, total: results.length, results };
  }

  // Toques sintéticos (AV.tactilTest). Deja la cámara, el vuelo y el palo como estaban.
  function tactil() {
    const results = [], ok = (name, pass, extra) => results.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const canvas = G.renderer.canvas;
    const ev = (tipo, o) => canvas.dispatchEvent(new PointerEvent(tipo, Object.assign({ bubbles: true, cancelable: true, pointerType: 'touch', clientX: 0, clientY: 0 }, o)));
    const estilo = ['left', 'top', 'right', 'bottom', 'display'].reduce((a, k) => (a[k] = stickEl.style[k], a), {});
    const yaw0 = G.camara.yaw, fly = G.fisica.startFlying, aterr = G.fisica.land, vibra = navigator.vibrate;
    let despegues = 0, bajadas = 0;
    G.fisica.startFlying = () => { despegues++; };
    G.fisica.land = () => { bajadas++; };
    vibrarPrueba = true;
    try { navigator.vibrate = n => { ms = n; return true; }; } catch (e) { /* vibrate es de solo lectura en algún navegador */ }
    try {
      stickEl.style.display = 'block';
      const y = Math.round(innerHeight * 0.72), x = 72;
      ev('pointerdown', { pointerId: 11, clientX: x, clientY: y });
      ok('el joystick aparece bajo el dedo', stickEl.classList.contains('flotando') && stickId === 11, stickEl.style.left);
      ev('pointermove', { pointerId: 11, clientX: x + 6, clientY: y });
      ok('zona muerta: un temblor no mueve', stick.x === 0 && stick.y === 0, stick.x + ',' + stick.y);
      ev('pointermove', { pointerId: 11, clientX: x + 52, clientY: y });
      ok('a media caña la marcha es suave', stick.x > 0.05 && stick.x < 0.85, String(stick.x));
      const sx = stick.x, y1 = Math.round(innerHeight * 0.42);
      ev('pointerdown', { pointerId: 12, clientX: innerWidth - 80, clientY: y1 });
      ev('pointermove', { pointerId: 12, clientX: innerWidth - 60, clientY: y1 }); // cruza la zona muerta de la cámara
      ev('pointermove', { pointerId: 12, clientX: innerWidth - 20, clientY: y1 });
      ok('el otro dedo gira la cámara y el joystick sigue', G.camara.yaw !== yaw0 && stickId === 11 && Math.abs(stick.x - sx) < 0.08, 'yaw ' + G.camara.yaw + ' palo ' + stick.x);
      ev('pointerup', { pointerId: 12, clientX: innerWidth - 30, clientY: y1 });
      ev('pointerup', { pointerId: 11, clientX: x + 52, clientY: y });
      ok('al soltar, el joystick vuelve a cero', stickId == null && stick.x === 0 && stick.y === 0);
      G.camara.yaw = yaw0;
      const xr = innerWidth - 90, yr = Math.round(innerHeight * 0.5);
      ev('pointerdown', { pointerId: 13, clientX: xr, clientY: yr });
      ev('pointerup', { pointerId: 13, clientX: xr + 4, clientY: yr - 96 });
      ok('latigazo hacia arriba: despegar', despegues === 1 && bajadas === 0, despegues + '/' + bajadas);
      G.fisica.MOVE.flying = true;
      ev('pointerdown', { pointerId: 14, clientX: xr, clientY: yr - 40 });
      ev('pointerup', { pointerId: 14, clientX: xr - 4, clientY: yr + 50 });
      ok('latigazo hacia abajo: aterrizar', bajadas === 1, String(bajadas));
      G.fisica.MOVE.flying = false; G.fisica.MOVE.landing = false;
      G.emit('vuelo', false);
      ok('al posarse vibra un momento', ultimaVibra === 20, String(ultimaVibra));
      ultimaVibra = 0;
      const col = G.S.collected;
      col.push('__tactil'); mirarRecogido();
      ok('al recoger una cosa vibra', ultimaVibra === 14, String(ultimaVibra));
      col.pop(); mirarRecogido();
    } catch (e) { ok('sin excepciones', false, e && e.message); }
    G.fisica.startFlying = fly; G.fisica.land = aterr;
    G.fisica.MOVE.flying = false; G.fisica.MOVE.landing = false;
    const marca = G.S.collected.indexOf('__tactil'); if (marca >= 0) G.S.collected.splice(marca, 1);
    try { navigator.vibrate = vibra; } catch (e) { /* igual */ }
    vibrarPrueba = false; mirarRecogido();
    soltarPalo(); gesto = null; dragId = null; dosDedos = false; enLienzo.clear();
    stickEl.classList.remove('flotando');
    for (const k of Object.keys(estilo)) stickEl.style[k] = estilo[k];
    G.camara.yaw = yaw0;
    return { passed: results.filter(r => r.ok).length, total: results.length, results };
  }

  return { keys, stick, get jumpHeld() { return jumpHeld; }, set jumpHeld(v) { jumpHeld = v; }, actBtn, syncSwimButtons,
    ACCIONES, DEFECTO, get mapa() { return Object.assign({}, mapa); }, asignar, restablecer, es, test, tactil, mirarRecogido };
});
