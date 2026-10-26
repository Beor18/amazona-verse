/* Amazona Verse · capa de presentación de la interfaz (sin lógica de juego)
   1. Máquina de escribir en el diálogo. #d-text conserva SIEMPRE el texto completo (lectores de pantalla y
      AV.selfTest lo leen); una copia aria-hidden (#d-type) lo revela letra a letra con la misma maquetación.
      Mientras escribe, un toque en la caja del diálogo (o Seguir / Acción / E / Enter) completa la frase en vez de saltarla.
   2. Esc o P abren el menú de pausa (#pause) cuando no hay otra ventana abierta.
   3. "Rebote" de los contadores del inventario y del Diario cuando cambian.
   4. Móvil: el objetivo es una sola línea; un toque lo despliega (misiones e indicadores) y se pliega solo a los 8 s.
   5. Portada abierta: lo de atrás es inerte (no recibe el foco con Tab); al cerrarla, el foco va al creador si está abierto.
   Enlazado en index.html con <script src="src/ui/ui.js" defer></script> (ver docs/UI_SYSTEM.md). */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const reduce = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  // ---------- 1. Máquina de escribir ----------
  const dialog = $('dialog'), text = $('d-text');
  if (dialog && text && text.parentNode) {
    const type = document.createElement('span');
    const shown = document.createElement('span'), rest = document.createElement('span');
    type.id = 'd-type'; type.setAttribute('aria-hidden', 'true'); rest.className = 'tw-rest';
    type.append(shown, rest);
    text.parentNode.insertBefore(type, text.nextSibling); // hermano, no hijo: el juego reescribe textContent de #d-text
    dialog.classList.add('tw');
    const cps = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--type-cps')) || 45;
    let full = '', i = 0, raf = 0, last = 0, budget = 0;
    const render = () => { shown.textContent = full.slice(0, i); rest.textContent = full.slice(i); };
    function finish() { cancelAnimationFrame(raf); raf = 0; i = full.length; render(); dialog.classList.remove('is-typing'); }
    function step(now) {
      budget += (now - (last || now)) / 1000 * cps(); last = now;
      while (budget >= 1 && i < full.length) {
        budget -= 1; i++;
        if (/[.,;:!?…]/.test(full[i - 1]) && i < full.length) { budget -= 7; break; } // respiro en la puntuación
      }
      render();
      if (i >= full.length) finish(); else raf = requestAnimationFrame(step);
    }
    function start() {
      full = text.textContent || ''; i = 0; budget = 0; last = 0;
      cancelAnimationFrame(raf); raf = 0;
      if (reduce.matches || !full) { finish(); return; }
      dialog.classList.add('is-typing'); render(); raf = requestAnimationFrame(step);
    }
    new MutationObserver(start).observe(text, { childList: true, characterData: true, subtree: true });
    if (text.textContent) start();
    const typing = () => raf !== 0 && !dialog.hidden;
    document.addEventListener('click', e => {
      if (typing() && e.target.closest && e.target.closest('#dialog, #b-act')) { e.stopPropagation(); e.preventDefault(); finish(); }
    }, true);
    addEventListener('keydown', e => {
      if (!typing() || e.repeat) return;
      const Gj = window.AV && window.AV.G, accion = Gj && Gj.input && Gj.input.es ? Gj.input.es('accion', e) : (e.key === 'e' || e.key === 'E' || e.key === 'Enter'); // tecla remapeable (input.js)
      if (accion) { e.stopImmediatePropagation(); e.preventDefault(); finish(); }
    }, true);
  }

  // ---------- 2. Atajo del menú de pausa ----------
  const pause = $('pause');
  if (pause && pause.showPopover) {
    const isOpen = el => { try { return el.matches(':popover-open'); } catch (e) { return false; } };
    const somethingOpen = () => ['dialog', 'card', 'creator', 'comic', 'end'].some(id => $(id) && !$(id).hidden) ||
      ($('title') && $('title').open) || !!$('t-cancel');
    let atDown = null; // estado ANTES de que el juego procese la tecla (Esc también cierra tarjetas)
    addEventListener('keydown', e => {
      if (e.repeat || (e.target.closest && e.target.closest('input, select, textarea'))) return;
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') atDown = { key: e.key, open: isOpen(pause), busy: somethingOpen() };
    }, true);
    addEventListener('keyup', e => {
      const s = atDown; atDown = null;
      if (!s || s.key !== e.key) return;
      if (s.open) { if (e.key !== 'Escape' && isOpen(pause)) pause.hidePopover(); return; } // Esc ya lo cierra el navegador
      if (!s.busy && !isOpen(pause)) pause.showPopover();
    });
  }

  // ---------- 4. Objetivo compacto en el móvil (QA-06) ----------
  const quest = $('quest');
  if (quest && !$('quest-toggle')) {
    const tg = document.createElement('button');
    tg.type = 'button'; tg.id = 'quest-toggle'; tg.className = 'quest-toggle'; tg.setAttribute('aria-controls', 'quest');
    quest.appendChild(tg);
    let plegar = 0;
    const abrir = on => {
      quest.classList.toggle('abierto', on);
      tg.setAttribute('aria-expanded', String(on));
      tg.setAttribute('aria-label', on ? 'Plegar el objetivo' : 'Ver el objetivo completo');
      clearTimeout(plegar); if (on) plegar = setTimeout(() => abrir(false), 8000);
    };
    tg.addEventListener('click', () => abrir(!quest.classList.contains('abierto')));
    abrir(false);
  }

  // ---------- 5. Portada: fondo inerte y foco al cerrarla (QA-04) ----------
  const portada = $('title');
  if (portada) {
    const atras = ['top', 'sys', 'acts', 'stick', 'creator', 'dialog', 'card', 'toast', 'prompt', 'emotes', 'keyhint', 'end', 'comic'].map($).filter(Boolean);
    let antes = null;
    const sync = () => {
      const ab = !!portada.open;
      if (ab === antes) return; antes = ab;
      for (const el of atras) el.inert = ab;
      if (!ab) { const c = $('creator'), f = $('p-name-a'); if (c && !c.hidden && f) f.focus(); }
    };
    // El atributo open cambia al instante (el evento close puede llegar tarde en una pestaña en segundo plano)
    new MutationObserver(sync).observe(portada, { attributes: true, attributeFilter: ['open'] });
    sync();
  }

  // ---------- 3. Rebote de contadores ----------
  if (!reduce.matches) {
    const bump = el => { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); };
    for (const id of ['i-madera', 'i-piedra', 'i-componente', 'b-diary']) {
      const el = $(id); if (!el) continue;
      let prev = el.textContent;
      new MutationObserver(() => { if (el.textContent !== prev) { prev = el.textContent; bump(el); } })
        .observe(el, { childList: true, characterData: true, subtree: true });
    }
  }
})();
