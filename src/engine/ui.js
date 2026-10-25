/* AVE · interfaz base
   Widgets del HUD que ya existen en index.html (el markup y el estilo son del rol UI/UX; aquí solo se usan por id):
   tarjeta (#card), aviso (#toast), overlays (#end, #comic, #creator), botón de sonido.
   Gancho 'cardHidden' al cerrar la tarjeta (un pack limpia ahí sus minijuegos).
   Un pack puede retitular el HUD con meta.hud { capitulo, titulo, etiqueta, fin, nota, inventario: { idElemento: etiqueta } }. */
AVE.module('ui', function (G) {
  'use strict';
  const $ = G.util.$;
  let cardOpen = false;
  function showCard(html) { $('card').innerHTML = html; $('card').hidden = false; cardOpen = true; }
  function hideCard() { $('card').hidden = true; cardOpen = false; G.emit('cardHidden'); }
  let toastTimer = 0;
  function toast(text, ms) { G.audio.play('tick'); $('toast').textContent = text; $('toast').hidden = false; toastTimer = ms === 0 ? Infinity : (ms || 2200) / 1000; }
  function toastHTML(html, ms) { $('toast').innerHTML = html; $('toast').hidden = false; toastTimer = ms === 0 ? Infinity : (ms || 2200) / 1000; }
  function hideToast() { $('toast').hidden = true; toastTimer = 0; }
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
    set('#quest .chapter', H.capitulo); set('#quest h1', H.titulo); set('#tag', H.etiqueta); set('#end h2', H.fin);
    set('#creator .creator-side .note', H.nota);
    if (H.inventario) for (const span of document.querySelectorAll('#inv > span')) {
      const b = span.querySelector('b'), lbl = b && H.inventario[b.id];
      span.hidden = !lbl; if (lbl) span.querySelector('small').textContent = lbl;
    }
    if (H.titulo) document.title = H.titulo;
  }

  return { $, showCard, hideCard, get cardOpen() { return cardOpen; }, toast, toastHTML, hideToast, overlayOpen, busy, worldHidden };
});
