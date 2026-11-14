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
    if (window.innerWidth <= 560 && !$('toast').hidden && actual) { if (!pendiente) pendiente = actual; ocultar(); }
  }
  function hideCard() { $('card').hidden = true; cardOpen = false; G.emit('cardHidden'); }
  let toastTimer = 0;
  // QA-93 (W3): un aviso que salta con una pantalla que lo taparía (la tarjeta en un teléfono, ≤ 560 px, como el Diario o
  // Retos; o el cómic o el creador, a pantalla completa) espera a que se cierre y sale después. Solo se guarda el último.
  let pendiente = null, actual = null;
  // QA-93: tarjeta en teléfono, cómic o creador. QA-188 (W28): también la apertura del capítulo — el narrador habla en
  // bocadillos libres, no en G.dialogo, así que busy() no lo cubre y el aviso salía pegado a su subtítulo.
  // T2 (lista «terminado»): el panel final también aparta los avisos; vuelven al cerrarlo.
  const tapado = () => (cardOpen && window.innerWidth <= 560) || !$('comic').hidden || !$('creator').hidden || !!document.getElementById('c1-saltar') || !$('end').hidden;
  function mostrar(p) {
    actual = p;
    if (p.html) $('toast').innerHTML = p.html; else { G.audio.play('tick'); $('toast').textContent = p.text; }
    $('toast').hidden = false; toastTimer = p.ms === 0 ? Infinity : (p.ms || 2200) / 1000;
  }
  function toast(text, ms) { const p = { text, ms }; if (tapado()) { pendiente = p; return; } mostrar(p); }
  function toastHTML(html, ms) { const p = { html, ms }; if (tapado()) { pendiente = p; return; } mostrar(p); }
  // QA-207: «ocultar» (interno) quita el aviso de la pantalla y respeta el apartado; los apartados de showCard y del update lo usan.
  // hideToast() (público) además descarta el aviso que estaba en pantalla si quedó apartado, para que no vuelva al cerrarse
  // la tarjeta. Un aviso distinto que llegó con la pantalla tapada y aún no se ha visto (QA-93) sigue esperando.
  function ocultar() { $('toast').hidden = true; toastTimer = 0; }
  function hideToast() { if (pendiente && pendiente === actual) pendiente = null; ocultar(); }
  // QA-188 (en vivo, 7-nov): un aviso que ya estaba en pantalla cuando algo pasa a taparlo (empieza la apertura del cap. 1
  // justo al cerrar el creador, se abre el cómic…) se aparta y vuelve al terminar, como los que llegan después
  G.on('update', () => {
    if (!pendiente && actual && !$('toast').hidden && tapado()) { pendiente = actual; ocultar(); return; }
    if (pendiente && !tapado()) { const p = pendiente; pendiente = null; mostrar(p); }
  }, 84);
  function overlayOpen() { return !$('end').hidden || !$('comic').hidden || !$('creator').hidden; }
  // Ocupado: diálogo, tarjeta u overlay abiertos (el jugador no se mueve ni recoge)
  function busy() { return G.dialogo.open() || cardOpen || overlayOpen(); }
  // T2 (lista «terminado»): LA regla «hay actividad o escena en marcha», la única que consultan los avisos que salen solos (pistas,
  // recordatorios, presentaciones): la apertura del capítulo, un diálogo o bocadillo, una tarjeta, el cómic, el creador, el panel
  // final, la portada o la pausa, y cualquier minijuego o modo (Retos, Flight, Maze, Tren… envuelven G.ui.busy; los de la V18 y la
  // pesca, G.menuModos.ocupado(); el rescate y el banquete, su activo()). Los avisos que da la propia actividad no la consultan.
  function enEscena() {
    try {
      const d = document, cuerpo = d.body && d.body.classList, t = $('title'), p = $('pause');
      const fn = (o, k) => !!(o && typeof o[k] === 'function' && o[k]());
      return !!((G.ui && G.ui.busy ? G.ui.busy() : busy()) || tapado() || d.getElementById('c1-fade') || fn(G.dialogo, 'activo') ||
        (t && t.open) || (p && p.matches && p.matches(':popover-open')) || fn(G.pausa, 'activa') ||
        (cuerpo && (cuerpo.contains('retos-on') || cuerpo.contains('v18-pesca-on') || cuerpo.contains('v18-golf-on') || cuerpo.contains('duelo-on'))) ||
        fn(G.menuModos, 'ocupado') || fn(G.rescate, 'activo') || fn(G.banqueteApi, 'activo'));
    } catch (e) { return false; }
  }
  // Aviso que sale solo: con escena en marcha no sale y devuelve false (quien lo llama no lo da por dado y lo reintenta luego)
  function avisoLibre(text, ms) { if (enEscena()) return false; toast(text, ms); return true; }
  // El creador es opaco: mientras está abierto el mundo no se dibuja
  function worldHidden() { return !$('creator').hidden; }
  G.on('update', dt => { if (toastTimer !== Infinity && toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) ocultar(); } }, 85);

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

  return { $, showCard, hideCard, get cardOpen() { return cardOpen; }, get avisoPendiente() { return pendiente; }, toast, toastHTML, hideToast, overlayOpen, busy, worldHidden, enEscena, avisoLibre };
});
