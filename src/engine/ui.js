/* AVE · interfaz base
   Widgets del HUD que ya existen en index.html (el markup y el estilo son del rol UI/UX; aquí solo se usan por id):
   tarjeta (#card), aviso (#toast), overlays (#end, #comic, #creator), botón de sonido.
   Gancho 'cardHidden' al cerrar la tarjeta (un pack limpia ahí sus minijuegos).
   Un pack puede retitular el HUD con meta.hud { capitulo, titulo, portada, etiqueta, fin, nota, inventario: { idElemento: etiqueta } }
   (los contadores de inventario que no nombre se ocultan). */
AVE.module('ui', function (G) {
  'use strict';
  const $ = G.util.$;
  let cardOpen = false;
  // Largo A (7-nov): un aviso que ya estaba en pantalla al abrirse la tarjeta (en un teléfono la cubre) le tapaba la
  // pregunta y las opciones; se aparta y vuelve al cerrarla, como los que llegan con la tarjeta abierta (QA-93).
  function showCard(html) {
    $('card').innerHTML = html; $('card').hidden = false; cardOpen = true;
    if (window.innerWidth <= 560) apartar();
  }
  function hideCard() { $('card').hidden = true; cardOpen = false; G.emit('cardHidden'); }
  let toastTimer = 0, visto = 0;
  // QA-93 (W3): un aviso que salta con una pantalla que lo taparía (la tarjeta en un teléfono, ≤ 560 px, como el Diario o
  // Retos; o el cómic o el creador, a pantalla completa) espera a que se cierre y sale después.
  // Revisión T2 (lista «terminado»): UNA cola de avisos. Sale uno cada vez; el siguiente espera a que el de pantalla lleve su
  // tiempo mínimo (MIN_S, o su duración si es más corta), así dos avisos del mismo instante (fin de la intro, Patrulla, pista de la
  // cotorra visitante; «¡Descubriste…!» e «Iguaca te llama») ya no se pisan. Un aviso igual al de pantalla o a uno en cola no se
  // repite. Un aviso dado en las baterías (G.quiet) no reserva tiempo mínimo, salvo que la prueba de la cola lo pida.
  // Ronda 2: un aviso dado FUERA de escena (p.escena false) no sale mientras haya escena (enEscena()): espera, y si ya estaba en
  // pantalla se aparta. Los que da la propia actividad (llegan con la escena en marcha) sí salen. Al acabar la escena todos pasan a
  // «fuera», así uno que quedó en cola no sale encima de la escena siguiente. Tope de cola COLA_MAX: si se pasa, se tira el más viejo
  // que no sea de una sola vez (p.fijo: los aceptados por avisoLibre o los dados con { fijo: true }, que no se repiten).
  // Ronda 3: cada aviso recuerda QUÉ escenas había al darlo (p.escena: lista de claves de escenas()), no solo «había escena». Es de
  // la escena en marcha solo si todas las de ahora ya estaban al darlo: así el de un minijuego no se queda encima del siguiente
  // (rescate → pesca sin un cuadro libre entre medias) ni de una tarjeta que se abre en medio (el Diario). La cola llena tampoco
  // tira los de la actividad en marcha: primero los que se repiten y no son de escena; si todos lo son, el más nuevo.
  const MIN_S = 2.2, COLA_MAX = 8, cola = [];
  let actual = null, colaPrueba = false;
  // QA-93: tarjeta en teléfono, cómic o creador. QA-188 (W28): también la apertura del capítulo — el narrador habla en
  // bocadillos libres, no en G.dialogo, así que busy() no lo cubre y el aviso salía pegado a su subtítulo.
  // T2 (lista «terminado»): el panel final también aparta los avisos; vuelven al cerrarlo.
  // Revisión T2: también un diálogo de caja o un bocadillo (G.dialogo.activo): el aviso no se queda encima.
  const enDialogo = () => { try { return !!(G.dialogo && (G.dialogo.activo ? G.dialogo.activo() : G.dialogo.open())); } catch (e) { return false; } };
  const tapado = () => (cardOpen && window.innerWidth <= 560) || !$('comic').hidden || !$('creator').hidden || !!document.getElementById('c1-saltar') || !$('end').hidden || enDialogo();
  const igual = (p, q) => !!(p && q && p.text === q.text && p.html === q.html);
  const enPantalla = () => !!actual && !$('toast').hidden;
  function mostrar(p) {
    actual = p; visto = 0; p.vivo = !G.quiet || colaPrueba; // en las baterías (G.quiet) el aviso no reserva su tiempo mínimo
    if (p.html) $('toast').innerHTML = p.html; else { G.audio.play('tick'); $('toast').textContent = p.text; }
    $('toast').hidden = false; toastTimer = p.ms === 0 ? Infinity : (p.ms || 2200) / 1000;
  }
  // Saca el siguiente de la cola si no hay pantalla que lo tape y el de pantalla ya cumplió su tiempo mínimo
  function siguiente(esc) {
    if (!cola.length || tapado()) return;
    if (enPantalla() && actual.vivo) { const dur = toastTimer === Infinity ? MIN_S : visto + toastTimer; if (visto < Math.min(MIN_S, dur)) return; }
    const ks = esc == null ? escenas() : esc;
    const i = ks.length ? cola.findIndex(q => deEscena(q, ks)) : 0; // con escena, solo los de la actividad
    if (i >= 0) mostrar(cola.splice(i, 1)[0]);
  }
  function encolar(p) {
    if (enPantalla() && igual(actual, p)) { if (toastTimer !== Infinity) toastTimer = Math.max(toastTimer, p.ms === 0 ? Infinity : (p.ms || 2200) / 1000); if (p.fijo) actual.fijo = true; return; } // el mismo: solo se alarga
    const q0 = cola.find(q => igual(q, p)); if (q0) { if (p.fijo) q0.fijo = true; return; }
    const ks = escenas(); p.escena = ks.length ? ks : null; cola.push(p);
    if (cola.length > COLA_MAX) { // se va el más viejo que se repite y no es de la escena; si todos son de ella, el más nuevo (el de inicio se queda)
      let i = cola.findIndex(q => !q.fijo && !deEscena(q, ks));
      if (i < 0) for (let j = cola.length - 1; j >= 0 && i < 0; j--) if (!cola[j].fijo) i = j;
      cola.splice(i >= 0 ? i : 0, 1);
    }
    siguiente(ks);
  }
  const fijo = o => !!(o && o.fijo);
  function toast(text, ms, o) { encolar({ text, ms, fijo: fijo(o) }); }
  function toastHTML(html, ms, o) { encolar({ html, ms, fijo: fijo(o) }); }
  // QA-207: «ocultar» (interno) quita el aviso de la pantalla y respeta el apartado; los apartados de showCard y del update lo usan.
  // hideToast() (público) además descarta el aviso que estaba en pantalla si quedó apartado, para que no vuelva al cerrarse
  // la tarjeta. Un aviso distinto que llegó con la pantalla tapada y aún no se ha visto (QA-93) sigue esperando.
  function ocultar() { $('toast').hidden = true; toastTimer = 0; }
  // Para las baterías: la cola entera fuera (lo que dejó la partida antes de la prueba no se mezcla con sus avisos)
  function vaciarAvisos() { cola.length = 0; ocultar(); }
  function hideToast() { const i = cola.indexOf(actual); if (i >= 0) cola.splice(i, 1); ocultar(); }
  // El aviso en pantalla se aparta al frente de la cola con lo que le quedaba (mínimo 1,5 s) y vuelve cuando se destapa
  function apartar() {
    if (!enPantalla()) return;
    if (!cola.includes(actual)) { if (toastTimer !== Infinity) actual.ms = Math.max(1500, Math.round(toastTimer * 1000)); cola.unshift(actual); }
    ocultar();
  }
  // QA-188 (en vivo, 7-nov): un aviso que ya estaba en pantalla cuando algo pasa a taparlo (empieza la apertura del cap. 1
  // justo al cerrar el creador, se abre el cómic, empieza un diálogo…) se aparta y vuelve al terminar, como los que llegan después
  G.on('update', () => {
    if (!cola.length && !enPantalla()) return;
    const ks = escenas();
    if (!ks.length) { for (const q of cola) q.escena = null; if (actual) actual.escena = null; }
    if (enPantalla() && (tapado() || (ks.length && !deEscena(actual, ks)))) { apartar(); return; }
    siguiente(ks);
  }, 84);
  // Solo para las baterías: activa el tiempo mínimo aunque G.quiet esté puesto y devuelve el estado de la cola
  function colaTest(on) { if (on != null) colaPrueba = !!on; return { cola: cola.map(p => p.text || p.html), actual: enPantalla() ? (actual.text || actual.html) : null, visto, max: COLA_MAX }; }
  function overlayOpen() { return !$('end').hidden || !$('comic').hidden || !$('creator').hidden; }
  // Ocupado: diálogo, tarjeta u overlay abiertos (el jugador no se mueve ni recoge)
  function busy() { return G.dialogo.open() || cardOpen || overlayOpen(); }
  // T2 (lista «terminado»): LA regla «hay actividad o escena en marcha», la única que consultan los avisos que salen solos (pistas,
  // recordatorios, presentaciones): la apertura del capítulo, un diálogo o bocadillo, una tarjeta, el cómic, el creador, el panel
  // final, la portada o la pausa, y cualquier minijuego o modo (Retos, Flight, Maze, Tren… envuelven G.ui.busy; los de la V18 y la
  // pesca, G.menuModos.ocupado(); el rescate y el banquete, su activo()). Los avisos que da la propia actividad no la consultan.
  // Las escenas en marcha, cada una con su clave (vacía = libre). enEscena() es «hay alguna».
  function escenas() {
    const k = [];
    try {
      const d = document, cuerpo = d.body && d.body.classList, t = $('title'), p = $('pause');
      const fn = (o, n) => { try { return !!(o && typeof o[n] === 'function' && o[n]()); } catch (e) { return false; } };
      const si = (c, n) => { if (c) k.push(n); };
      si(cardOpen, 'tarjeta'); si(!$('comic').hidden, 'comic'); si(!$('creator').hidden, 'creador'); si(!$('end').hidden, 'fin');
      si(d.getElementById('c1-saltar') || d.getElementById('c1-fade'), 'apertura'); si(enDialogo() || fn(G.dialogo, 'open'), 'dialogo');
      si(t && t.open, 'portada'); si((p && p.matches && p.matches(':popover-open')) || fn(G.pausa, 'activa'), 'pausa');
      for (const c of ['retos-on', 'v18-pesca-on', 'v18-golf-on', 'duelo-on']) si(cuerpo && cuerpo.contains(c), c);
      si(fn(G.menuModos, 'ocupado'), 'modos'); si(fn(G.rescate, 'activo'), 'rescate'); si(fn(G.banqueteApi, 'activo'), 'banquete');
      si(!k.length && G.ui && G.ui.busy && G.ui.busy !== busy && G.ui.busy(), 'ocupado'); // un modo que envuelve G.ui.busy (Flight, Tren…)
    } catch (e) { /* sin interfaz */ }
    return k;
  }
  function enEscena() { return escenas().length > 0; }
  // El aviso es de la escena en marcha si la tenía toda al darlo (las escenas que terminaron no cuentan)
  const deEscena = (q, ks) => !!(q && q.escena && ks.every(c => q.escena.includes(c)));
  // Aviso que sale solo: con escena en marcha no sale y devuelve false (quien lo llama no lo da por dado y lo reintenta luego)
  function avisoLibre(text, ms) { if (enEscena()) return false; toast(text, ms, { fijo: true }); return true; }
  // El creador es opaco: mientras está abierto el mundo no se dibuja
  function worldHidden() { return !$('creator').hidden; }
  G.on('update', dt => { if (enPantalla()) visto += dt; if (toastTimer !== Infinity && toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) ocultar(); } }, 85);

  // Botón de sonido
  const soundBtn = $('b-sound'), A = G.audio;
  const soundLabel = () => { soundBtn.textContent = A.vol.muted ? 'Sonido: no' : 'Sonido: sí'; soundBtn.setAttribute('aria-pressed', String(!A.vol.muted)); };
  soundBtn.addEventListener('click', () => { A.vol.muted = !A.vol.muted; A.ensure(); A.apply(); A.save(); soundLabel(); A.play('tick'); });
  soundLabel();

  // Textos del HUD propios del pack (solo si el pack los define; cap1 usa los del markup)
  const H = G.pack.meta && G.pack.meta.hud;
  if (H) {
    const set = (sel, txt) => { const el = document.querySelector(sel); if (el && txt != null) el.textContent = txt; };
    set('#quest .chapter', H.capitulo); set('#quest h1', H.titulo); set('#tag', H.etiqueta); set('#end h2', H.fin); set('#title .title-sub', H.portada);
    set('#creator .creator-side .note', H.nota);
    if (H.inventario) for (const span of document.querySelectorAll('#inv > span')) {
      const b = span.querySelector('b'), lbl = b && H.inventario[b.id];
      span.hidden = !lbl; if (lbl) span.querySelector('small').textContent = lbl;
    }
    if (H.titulo) document.title = H.titulo;
  }

  return { $, showCard, hideCard, get cardOpen() { return cardOpen; }, get avisoPendiente() { return cola[0] || null; }, colaTest, toast, toastHTML, hideToast, vaciarAvisos, overlayOpen, busy, worldHidden, enEscena, avisoLibre };
});
