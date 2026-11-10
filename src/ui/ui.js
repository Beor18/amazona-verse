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
      if (reduce.matches || document.documentElement.classList.contains('mov-reducido') || !full) { finish(); return; }
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
    const somethingOpen = () => ['dialog', 'card', 'creator', 'comic', 'end', 'mapa-grande'].some(id => $(id) && !$(id).hidden) ||
      ($('title') && $('title').open) || !!$('t-cancel');
    let atDown = null; // estado ANTES de que el juego procese la tecla (Esc también cierra tarjetas)
    addEventListener('keydown', e => {
      if (e.repeat || (e.target.closest && e.target.closest('input, select, textarea'))) return;
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') atDown = { key: e.key, open: isOpen(pause), busy: somethingOpen(), ev: e };
    }, true);
    addEventListener('keyup', e => {
      const s = atDown; atDown = null;
      if (!s || s.key !== e.key) return;
      if (s.open) { if (e.key !== 'Escape' && isOpen(pause)) pause.hidePopover(); return; } // Esc ya lo cierra el navegador
      // Si un modo de juego se quedó la tecla (preventDefault en su keydown: Esc sale del minigolf o del duelo 2), no abre la Pausa
      if (!s.busy && !s.ev.defaultPrevented && !isOpen(pause)) pause.showPopover();
    });
  }

  // Los botones que otros módulos añaden a la pausa (Pesca, Mercadito, copia, Minigolf…) vuelven a su grupo.
  if (pause) {
    const COTORRA = new Set(['b-char', 'b-comic-menu', 'b-tienda']);
    const OPCIONES = new Set(['b-save', 'b-load', 'b-copia-guardar', 'b-copia-cargar', 'b-sound', 'b-web', 'b-reset']);
    let ocupado = false;
    function agruparPausa() {
      if (ocupado) return;
      const grid = pause.querySelector('.pause-grid');
      const hJ = $('pause-g-jugar'), hC = $('pause-g-cotorra'), hO = $('pause-g-opciones');
      if (!grid || !hJ || !hC || !hO) return;
      const grupos = { jugar: [], cotorra: [], opciones: [] };
      for (const el of [...grid.children]) {
        if (!el.matches || !el.matches('button, a')) continue;
        const id = el.id;
        const g = COTORRA.has(id) ? 'cotorra'
          : (OPCIONES.has(id) || el.classList.contains('warn') || el.getAttribute('popovertarget') === 'confirm-reset') ? 'opciones'
          : 'jugar';
        grupos[g].push(el);
      }
      const deseado = [hJ, ...grupos.jugar, hC, ...grupos.cotorra, hO, ...grupos.opciones];
      const actual = [...grid.children].filter(el => el.matches('h3.pause-grupo, button, a'));
      if (deseado.length === actual.length && deseado.every((el, i) => el === actual[i])) return;
      ocupado = true;
      for (const el of deseado) grid.appendChild(el);
      ocupado = false;
    }
    agruparPausa();
    new MutationObserver(agruparPausa).observe(pause, { childList: true, subtree: true });
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
      if (!ab) { const c = $('creator'), f = $('p-name-libre') || $('p-name-a'); if (c && !c.hidden && f) f.focus(); }
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
      new MutationObserver(() => { if (document.documentElement.classList.contains('mov-reducido')) return; if (el.textContent !== prev) { prev = el.textContent; bump(el); } })
        .observe(el, { childList: true, characterData: true, subtree: true });
    }
  }

  // ---------- 6. Opciones claras (CG-104): imagen, movimiento, efectos y voces. La música y el ambiente ya están en musica.js. ----------
  const G = window.AV && window.AV.G;
  const sec = $('pause-opciones');
  if (G && sec) {
    const L = (es, en) => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' ? en : es);
    const CLAVE = ((G.pack && G.pack.meta && G.pack.meta.almacen) || 'ave') + '.opciones';
    const FRASE = {
      auto: ['El juego elige solo, según cómo vaya en tu equipo.', 'The game chooses by itself, based on how it runs on your device.'],
      bajo: ['Menos plantas, sin sombras y el agua simple, para que vaya fluido.', 'Fewer plants, no shadows and simple water, so it stays smooth.'],
      medio: ['Sombras suaves y más plantas.', 'Soft shadows and more plants.'],
      alto: ['Sombras grandes, más plantas y el agua con más detalle.', 'Large shadows, more plants and more detailed water.'],
    };
    const leer = () => { try { const v = JSON.parse(localStorage.getItem(CLAVE) || 'null'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } };
    const guardar = p => { try { localStorage.setItem(CLAVE, JSON.stringify(Object.assign(leer(), p))); } catch (e) { /* sin almacenamiento */ } };
    const sistema = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    function ponerMov(on) {
      document.documentElement.classList.toggle('mov-reducido', !!on);
      if (G.audio) G.audio.reducido = !!on;
      if (G.renderer) G.renderer.REDUCED = !!on || sistema();
    }
    function ponerCalidad(id) {
      const R = G.renderer; if (!R || !R.calidad) return;
      if (id === 'auto') R.calidad.manual = false;
      else if (R.setCalidad && R.PRESETS && R.PRESETS[id]) { R.calidad.manual = false; R.setCalidad(id, true); }
    }
    function ponerVol(k, n) {
      const A = G.audio; if (!A || !A.vol) return;
      A.vol[k] = Math.max(0, Math.min(1, n / 100));
      if (A.apply) A.apply();
    }
    function rotular() {
      sec.querySelector('#opt-titulo').textContent = L('Opciones', 'Options');
      sec.querySelector('#opt-lbl-cal').textContent = L('Imagen', 'Picture');
      const nom = { auto: ['Auto', 'Auto'], bajo: ['Baja', 'Low'], medio: ['Media', 'Medium'], alto: ['Alta', 'High'] };
      sec.querySelectorAll('[data-opt-cal]').forEach(b => { const n = nom[b.dataset.optCal]; b.textContent = L(n[0], n[1]); });
      $('opt-mov').textContent = L('Reducir movimiento', 'Reduce motion');
      $('opt-lbl-sfx').textContent = L('Efectos', 'Effects');
      $('opt-lbl-voz').textContent = L('Voces', 'Voices');
      $('opt-son-nota').textContent = L('La música y el ambiente están en su sección.', 'Music and ambience are in their own section.');
      pintar();
    }
    function pintar() {
      const R = G.renderer, id = R && R.calidad && R.calidad.manual ? R.calidad.nivel : 'auto';
      sec.querySelectorAll('[data-opt-cal]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.optCal === id)));
      const f = FRASE[id] || FRASE.auto;
      $('opt-cal-nota').textContent = L(f[0], f[1]);
      const mov = !!(G.audio && G.audio.reducido) || document.documentElement.classList.contains('mov-reducido');
      $('opt-mov').setAttribute('aria-pressed', String(mov));
      if (G.audio && G.audio.vol) {
        const s = Math.round(G.audio.vol.sfx * 100), v = Math.round(G.audio.vol.voice * 100);
        $('opt-sfx').value = s; $('opt-sfx-v').textContent = s; $('opt-sfx').setAttribute('aria-valuetext', s + L(' por ciento', ' percent'));
        $('opt-voz').value = v; $('opt-voz-v').textContent = v; $('opt-voz').setAttribute('aria-valuetext', v + L(' por ciento', ' percent'));
      }
    }
    const guardado = leer();
    if (guardado.calidad) ponerCalidad(guardado.calidad);
    if (typeof guardado.movimiento === 'boolean') ponerMov(guardado.movimiento);
    rotular();
    sec.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('button'); if (!b || !sec.contains(b)) return;
      if (b.dataset.optCal) { ponerCalidad(b.dataset.optCal); guardar({ calidad: b.dataset.optCal }); }
      else if (b.id === 'opt-mov') { const on = b.getAttribute('aria-pressed') !== 'true'; ponerMov(on); guardar({ movimiento: on }); }
      pintar();
    });
    const alSoltar = e => {
      const i = e.target; if (!i || !i.id) return;
      if (i.id === 'opt-sfx') { ponerVol('sfx', +i.value); if (G.audio && G.audio.save) G.audio.save(); }
      if (i.id === 'opt-voz') { ponerVol('voice', +i.value); if (G.audio && G.audio.save) G.audio.save(); }
      pintar();
    };
    sec.addEventListener('input', alSoltar);
    sec.addEventListener('change', alSoltar);
    if (G.on) G.on('aula', k => { if (k === 'idioma') rotular(); });
    window.AV.opcionesTest = function () {
      const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
      const R = G.renderer, A = G.audio, pause = $('pause');
      const cal0 = R && R.calidad ? { nivel: R.calidad.nivel, manual: R.calidad.manual } : null;
      const vol0 = A && A.vol ? { sfx: A.vol.sfx, voice: A.vol.voice } : null;
      const mov0 = document.documentElement.classList.contains('mov-reducido');
      const red0 = A ? A.reducido : null;
      const ls0 = localStorage.getItem(CLAVE);
      const abierto = pause && pause.matches && pause.matches(':popover-open');
      try {
        check('La pausa tiene imagen, movimiento, efectos y voces, y avisa de la música', !!$('opt-cal-nota') && !!$('opt-mov') && !!$('opt-sfx') && !!$('opt-voz') && /música/.test($('opt-son-nota').textContent));
        sec.querySelector('[data-opt-cal="bajo"]').click();
        check('Baja deja la calidad en bajo, a mano, y dice qué cambia', R.calidad.nivel === 'bajo' && R.calidad.manual === true && /plantas/.test($('opt-cal-nota').textContent), $('opt-cal-nota').textContent);
        sec.querySelector('[data-opt-cal="auto"]').click();
        check('Auto vuelve a dejar que el juego elija', R.calidad.manual === false && $('opt-cal-nota').textContent === FRASE.auto[0]);
        $('opt-sfx').value = 40; $('opt-sfx').dispatchEvent(new Event('change', { bubbles: true }));
        $('opt-voz').value = 20; $('opt-voz').dispatchEvent(new Event('change', { bubbles: true }));
        let guard = null;
        for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.endsWith('.audio')) { try { guard = JSON.parse(localStorage.getItem(k)); } catch (e) { /* */ } } }
        check('Efectos y voces se guardan por separado', A.vol.sfx === 0.4 && A.vol.voice === 0.2 && guard && guard.sfx === 0.4 && guard.voice === 0.2, JSON.stringify({ sfx: A.vol.sfx, voice: A.vol.voice, guard }));
        $('opt-mov').click();
        check('Reducir movimiento se enciende, se guarda y se apaga con otro toque', document.documentElement.classList.contains('mov-reducido') && A.reducido === true && leer().movimiento === true);
        $('opt-mov').click();
        check('Apagar reducir movimiento lo deja guardado en no', !document.documentElement.classList.contains('mov-reducido') && A.reducido === false && leer().movimiento === false);
        const idioma0 = G.aula && G.aula.aj ? G.aula.aj.idioma : null;
        if (G.aula && G.aula.aj) G.aula.aj.idioma = 'en';
        rotular();
        check('En inglés los nombres se entienden', $('opt-lbl-sfx').textContent === 'Effects' && $('opt-mov').textContent === 'Reduce motion' && /chooses by itself/.test($('opt-cal-nota').textContent), $('opt-cal-nota').textContent);
        if (G.aula && G.aula.aj) G.aula.aj.idioma = idioma0;
        rotular();
        if (pause && pause.showPopover) pause.showPopover();
        pause.style.width = '390px';
        const caja = sec.getBoundingClientRect();
        const sale = [];
        sec.querySelectorAll('*').forEach(e => { const r = e.getBoundingClientRect(); if (r.width > 0 && (r.right > caja.right + 1 || r.left < caja.left - 1)) sale.push(e.id || e.tagName); });
        check('A 390 px la sección cabe en la pausa', caja.width > 0 && caja.width <= 390 && !sale.length, sale.join(',') || Math.round(caja.width) + ' px');
        $('opt-sfx').focus();
        check('El volumen de efectos se enfoca con teclado', document.activeElement === $('opt-sfx'));
        sec.querySelector('[data-opt-cal="medio"]').focus();
        check('La calidad se elige con teclado', document.activeElement === sec.querySelector('[data-opt-cal="medio"]'));
      } catch (e) {
        check('La prueba termina sin excepciones', false, String(e && e.stack || e).slice(0, 240));
      } finally {
        if (cal0 && R.setCalidad) { R.calidad.manual = false; R.setCalidad(cal0.nivel, !!cal0.manual); }
        if (vol0 && A) { A.vol.sfx = vol0.sfx; A.vol.voice = vol0.voice; if (A.save) A.save(); if (A.apply) A.apply(); }
        ponerMov(mov0); if (A) A.reducido = red0;
        if (ls0 == null) localStorage.removeItem(CLAVE); else localStorage.setItem(CLAVE, ls0);
        if (pause) pause.style.width = '';
        if (pause && !abierto && pause.hidePopover) { try { pause.hidePopover(); } catch (e) { /* ya cerrada */ } }
        rotular();
      }
      return out;
    };
  }
})();
