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
    if (window.innerWidth <= 560 && !$('toast').hidden && actual) { if (!pendiente) pendiente = actual; hideToast(); }
  }
  function hideCard() { $('card').hidden = true; cardOpen = false; G.emit('cardHidden'); }
  let toastTimer = 0;
  // QA-93 (W3): un aviso que salta con una pantalla que lo taparía (la tarjeta en un teléfono, ≤ 560 px, como el Diario o
  // Retos; o el cómic o el creador, a pantalla completa) espera a que se cierre y sale después. Solo se guarda el último.
  let pendiente = null, actual = null;
  // QA-93: tarjeta en teléfono, cómic o creador. QA-188 (W28): también la apertura del capítulo — el narrador habla en
  // bocadillos libres, no en G.dialogo, así que busy() no lo cubre y el aviso salía pegado a su subtítulo.
  const tapado = () => (cardOpen && window.innerWidth <= 560) || !$('comic').hidden || !$('creator').hidden || !!document.getElementById('c1-saltar');
  function mostrar(p) {
    actual = p;
    if (p.html) $('toast').innerHTML = p.html; else { G.audio.play('tick'); $('toast').textContent = p.text; }
    $('toast').hidden = false; toastTimer = p.ms === 0 ? Infinity : (p.ms || 2200) / 1000;
  }
  function toast(text, ms) { const p = { text, ms }; if (tapado()) { pendiente = p; return; } mostrar(p); }
  function toastHTML(html, ms) { const p = { html, ms }; if (tapado()) { pendiente = p; return; } mostrar(p); }
  function hideToast() { $('toast').hidden = true; toastTimer = 0; }
  G.on('update', () => { if (pendiente && !tapado()) { const p = pendiente; pendiente = null; mostrar(p); } }, 84);
  function overlayOpen() { return !$('end').hidden || !$('comic').hidden || !$('creator').hidden; }
  // Ocupado: diálogo, tarjeta u overlay abiertos (el jugador no se mueve ni recoge)
  function busy() { return G.dialogo.open() || cardOpen || overlayOpen(); }
  // El creador es opaco: mientras está abierto el mundo no se dibuja
  function worldHidden() { return !$('creator').hidden; }
  G.on('update', dt => { if (toastTimer !== Infinity && toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) hideToast(); } }, 85);

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

  return { $, showCard, hideCard, get cardOpen() { return cardOpen; }, get avisoPendiente() { return pendiente; }, toast, toastHTML, hideToast, overlayOpen, busy, worldHidden };
});
