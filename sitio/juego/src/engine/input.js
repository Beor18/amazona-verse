/* AVE · entrada
   Teclado (WASD/flechas, Espacio, F, V, C, E/Enter, Q/R, T/G mirar arriba/abajo (los lee camara.js), 1–7, Esc), joystick táctil, botones de acción y arrastre para girar la cámara.
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
    if (k === 'f' && !e.repeat) G.fisica.tryDash();
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
  });
  addEventListener('blur', () => { soltarTodo(); jumpHeld = false; });

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
  let stickId = null;
  stickEl.addEventListener('pointerdown', e => { stickId = e.pointerId; stickEl.setPointerCapture(e.pointerId); moveStick(e); });
  stickEl.addEventListener('pointermove', e => { if (e.pointerId === stickId) moveStick(e); });
  const endStick = e => { if (e.pointerId !== stickId) return; stickId = null; stick.x = stick.y = 0; knob.style.transform = ''; };
  stickEl.addEventListener('pointerup', endStick); stickEl.addEventListener('pointercancel', endStick);
  function moveStick(e) {
    const r = stickEl.getBoundingClientRect();
    let dx = (e.clientX - r.left - r.width / 2) / (r.width / 2), dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
    const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    stick.x = dx; stick.y = dy;
    knob.style.transform = `translate(${dx * 35}px, ${dy * 35}px)`;
  }
  const jumpBtn = $('b-jump');
  jumpBtn.addEventListener('pointerdown', e => { e.preventDefault(); if (paused()) return; jumpHeld = true; G.fisica.tryJump(); });
  const jumpUp = () => { if (jumpHeld) G.fisica.releaseJump(); jumpHeld = false; };
  jumpBtn.addEventListener('pointerup', jumpUp);
  jumpBtn.addEventListener('pointerleave', jumpUp);
  jumpBtn.addEventListener('pointercancel', jumpUp);
  $('b-dash').addEventListener('pointerdown', e => { e.preventDefault(); if (!paused()) G.fisica.tryDash(); });
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
  let dragId = null, dragX = 0, dragY = 0;
  canvas.addEventListener('pointerdown', e => { dragId = e.pointerId; dragX = e.clientX; dragY = e.clientY; });
  canvas.addEventListener('pointermove', e => {
    if (e.pointerId !== dragId) return;
    G.camara.yaw -= (e.clientX - dragX) * 0.006; dragX = e.clientX;
    if (G.camara.inclinar) G.camara.inclinar((dragY - e.clientY) * 0.005); dragY = e.clientY;
    if (G.camara.manual) G.camara.manual();
  });
  const endDrag = e => { if (e.pointerId === dragId) dragId = null; };
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);

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

  return { keys, stick, get jumpHeld() { return jumpHeld; }, set jumpHeld(v) { jumpHeld = v; }, actBtn, syncSwimButtons,
    ACCIONES, DEFECTO, get mapa() { return Object.assign({}, mapa); }, asignar, restablecer, es, test };
});
