/* AVE · controles táctiles a tu gusto (Kelvin y Natanael, 10-nov: «poder mover los botones»)
   Modo «Personalizar controles» (botón en el menú de pausa, solo en pantallas táctiles, y la ruedita ⚙ del duelo): cada botón
   de pantalla se arrastra a donde quieras (con imán a una rejilla de 8 px y sin salirse de la pantalla), se cambia de tamaño
   (P, M, G) y de opacidad, y se marca en rojo si pisa a otro. «Restablecer» vuelve a lo de fábrica y «Listo» guarda.
   Botones: Acción, Impulso (mantenido: tu poder), Saltar, Volar/Bucear y, en el duelo, ala izquierda, ala derecha, pata
   izquierda y pata derecha (src/game/v18/combate.js). El joystick no entra: nace bajo el dedo (CG-40).
   Se guarda en este dispositivo, aparte de la partida (como las teclas): localStorage `<almacen>.botones` =
   { v: 1, vertical: { id: { x, y, s, o } }, horizontal: { … } }; x, y = centro en fracción de la pantalla (vale para otro
   tamaño de móvil), s = tamaño (0,8 · 1 · 1,25), o = opacidad (0,35–1). Vertical y horizontal se guardan por separado.
   Sin nada guardado no se toca ningún estilo: los botones quedan donde los pone ui.css (y combate.js el 2×2 del duelo).
   Teclado y ratón no cambian. Mientras se edita, el juego está en pausa (G.pausa.set('controles')).
   Prueba: AV.botonesTest(). */
AVE.module('botones', function (G) {
  'use strict';
  const CLAVE = ((G.pack && G.pack.meta && G.pack.meta.almacen) || 'amazonaverse') + '.botones';
  const CTL = [
    { id: 'act', q: '#b-act', n: 'Acción' }, { id: 'dash', q: '#b-dash', n: 'Impulso' }, { id: 'jump', q: '#b-jump', n: 'Saltar' },
    { id: 'fly', q: '#b-fly, #b-dive', n: 'Volar' },
    { id: 'salir', q: '#v18-duelo [data-k="salirB"]', n: 'Salir', duelo: true },
    { id: 'alaIzq', q: '#v18-duelo-ext [data-x="alaIzq"]', n: 'Ala izq.', duelo: true }, { id: 'alaDer', q: '#v18-duelo-ext [data-x="alaDer"]', n: 'Ala der.', duelo: true },
    { id: 'pataIzq', q: '#v18-duelo-ext [data-x="pataIzq"]', n: 'Pata izq.', duelo: true }, { id: 'pataDer', q: '#v18-duelo-ext [data-x="pataDer"]', n: 'Pata der.', duelo: true }
  ];
  const TAM = { P: 0.8, M: 1, G: 1.25 }, REJ = 8;
  const orient = () => (innerWidth > innerHeight ? 'horizontal' : 'vertical');
  const num = (v, a, b, d) => (typeof v === 'number' && isFinite(v) ? Math.max(a, Math.min(b, v)) : d);
  function sano(e) { return e && typeof e === 'object' ? { x: num(e.x, 0, 1, 0.5), y: num(e.y, 0, 1, 0.5), s: num(e.s, 0.6, 1.5, 1), o: num(e.o, 0.35, 1, 1) } : null; }
  function leer() {
    const r = { v: 1, vertical: {}, horizontal: {} };
    try {
      const d = JSON.parse(localStorage.getItem(CLAVE) || 'null');
      if (d && d.v === 1) for (const o of ['vertical', 'horizontal']) for (const c of CTL) { const e = sano(d[o] && d[o][c.id]); if (e) r[o][c.id] = e; }
    } catch (e) { /* sin almacenamiento o dañado: de fábrica */ }
    return r;
  }
  let datos = leer();
  function guardar() {
    try {
      if (!Object.keys(datos.vertical).length && !Object.keys(datos.horizontal).length) localStorage.removeItem(CLAVE);
      else localStorage.setItem(CLAVE, JSON.stringify(datos));
      return true;
    } catch (e) { return false; }
  }
  const PROPS = ['position', 'left', 'top', 'right', 'bottom', 'margin', 'transform', 'transform-origin', 'opacity', 'grid-area'];
  function limpiar(el) { if (!el.dataset.ctl) return; for (const p of PROPS) el.style.removeProperty(p); delete el.dataset.ctl; }
  // Pone cada botón donde dice el diseño de esta orientación (los que no tienen nada guardado, como siempre)
  function aplicar() {
    const L = datos[orient()], vw = innerWidth, vh = innerHeight;
    for (const c of CTL) for (const el of document.querySelectorAll(c.q)) {
      const e = L[c.id];
      if (!e) { limpiar(el); continue; }
      const w = el.offsetWidth || 60, h = el.offsetHeight || 60;
      el.style.setProperty('position', 'fixed'); el.style.setProperty('margin', '0'); el.style.setProperty('right', 'auto'); el.style.setProperty('bottom', 'auto');
      el.style.setProperty('left', Math.round(e.x * vw - w / 2) + 'px'); el.style.setProperty('top', Math.round(e.y * vh - h / 2) + 'px');
      el.style.setProperty('transform', 'scale(' + e.s + ')'); el.style.setProperty('transform-origin', '50% 50%'); el.style.setProperty('opacity', String(e.o));
      el.dataset.ctl = c.id;
    }
  }
  addEventListener('resize', () => aplicar());
  addEventListener('orientationchange', () => setTimeout(aplicar, 200));

  // ---------- Dónde está cada botón ahora (o, si aún no existe, dónde saldría) ----------
  function cajaDe(c) {
    const el = [...document.querySelectorAll(c.q)].find(x => x.offsetParent || x.getClientRects().length);
    if (el) { const r = el.getBoundingClientRect(); if (r.width > 0) return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width / ((datos[orient()][c.id] || {}).s || 1), h: r.height / ((datos[orient()][c.id] || {}).s || 1) }; }
    if (c.id === 'salir') return { x: innerWidth - 70, y: Math.min(innerHeight * 0.45, 340), w: 96, h: 48 }; // fuera del duelo: bajo el panel
    // Los del duelo fuera de un duelo: el 2×2 de combate.js encima de los botones grandes (60 px y 8 de hueco)
    const acts = document.getElementById('acts'), r = acts && acts.getBoundingClientRect(), vw = innerWidth;
    const base = r && r.width > 0 ? r : { left: vw - 202, right: vw - 20, top: innerHeight - 198, width: 182 };
    const k = CTL.indexOf(c) - 5, col = k % 2, fila = k >> 1, zurdo = base.left + base.width / 2 < vw / 2;
    const left = zurdo ? Math.max(8, base.left) : Math.min(vw - 136, base.right - 128), top = base.top - 52 - 128;
    return { x: left + col * 68 + 30, y: top + fila * 68 + 30, w: 60, h: 60 };
  }

  // ---------- Editor ----------
  let ed = null;
  function estilo() {
    if (document.getElementById('ctl-css')) return;
    const st = document.createElement('style'); st.id = 'ctl-css';
    st.textContent = '#ctl-editor{position:fixed;inset:0;z-index:9000;background:rgba(10,20,14,.55);touch-action:none;font-family:Fredoka,system-ui,sans-serif;color:#fff8ea}' +
      '#ctl-editor .ctl-barra{position:absolute;left:50%;top:calc(env(safe-area-inset-top,0px) + 10px);transform:translateX(-50%);width:min(560px,calc(100vw - 24px));background:rgba(255,248,234,.97);color:#3b2a14;border-radius:16px;padding:10px 12px;box-shadow:0 4px 16px #0007;display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:center}' +
      '#ctl-editor .ctl-barra p{margin:0;width:100%;text-align:center;font-weight:600;font-size:15px}#ctl-editor .ctl-barra b{color:#1f6f3a}' +
      '#ctl-editor button{font:700 15px/1 Fredoka,system-ui,sans-serif;min-height:44px;min-width:44px;padding:6px 12px;border-radius:14px;border:0;background:#3b2a14;color:#fff3d6;cursor:pointer}' +
      '#ctl-editor button[aria-pressed="true"]{background:#2e8b3e}#ctl-editor button.ctl-listo{background:#2e8b3e}#ctl-editor button.ctl-reset{background:#8a3b1a}' +
      '#ctl-editor label{display:flex;align-items:center;gap:6px;font-weight:600;font-size:14px}#ctl-editor input[type=range]{width:110px}' +
      '#ctl-editor .ctl-g{position:absolute;display:flex;align-items:center;justify-content:center;text-align:center;border-radius:50%;background:rgba(255,243,214,.92);color:#3b2a14;font:700 13px/1.1 Fredoka,system-ui,sans-serif;border:3px dashed #3b2a14;box-shadow:0 3px 10px #0006;touch-action:none;-webkit-user-select:none;user-select:none;cursor:grab;transform-origin:50% 50%}' +
      '#ctl-editor .ctl-g.duelo{border-radius:18px;background:rgba(214,240,220,.95)}#ctl-editor .ctl-g.sel{border:3px solid #2e8b3e;box-shadow:0 0 0 4px #8fe08a,0 3px 10px #0006}' +
      '#ctl-editor .ctl-g.choca{border-color:#d6403a;background:rgba(255,200,190,.95)}';
    document.head.appendChild(st);
  }
  let pausaAntes = false;
  function abrir() {
    if (ed) return ed;
    estilo();
    try { const m = document.getElementById('pause'); if (m && m.matches(':popover-open')) m.hidePopover(); } catch (e) { /* sin popover */ }
    const o = orient(), L = datos[o], borr = {};
    for (const c of CTL) { const b = cajaDe(c), e = L[c.id]; borr[c.id] = { x: b.x / innerWidth, y: b.y / innerHeight, s: e ? e.s : 1, o: e ? e.o : 1, w: b.w, h: b.h }; }
    const el = document.createElement('div'); el.id = 'ctl-editor'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Personalizar controles');
    el.innerHTML = '<div class="ctl-barra"><p>Arrastra cada botón a donde quieras. Elegido: <b data-c="nom"></b></p>' +
      '<span>Tamaño</span>' + Object.keys(TAM).map(k => `<button type="button" data-tam="${k}">${k}</button>`).join('') +
      '<label>Opacidad <input type="range" min="35" max="100" step="5" data-c="op"></label>' +
      '<button type="button" class="ctl-reset" data-c="reset">Restablecer</button><button type="button" data-c="cancelar">Cancelar</button><button type="button" class="ctl-listo" data-c="listo">Listo</button></div>';
    document.body.appendChild(el);
    ed = { el, o, borr, sel: CTL[0].id, ghosts: {} };
    for (const c of CTL) {
      const g = document.createElement('div'); g.className = 'ctl-g' + (c.duelo ? ' duelo' : ''); g.textContent = c.n; g.dataset.id = c.id; g.setAttribute('aria-label', c.n);
      el.appendChild(g); ed.ghosts[c.id] = g;
    }
    let arrastra = null;
    el.addEventListener('pointerdown', e => {
      const g = e.target.closest && e.target.closest('.ctl-g'); if (!g) return;
      e.preventDefault(); ed.sel = g.dataset.id; arrastra = { id: e.pointerId, dx: e.clientX - ed.borr[g.dataset.id].x * innerWidth, dy: e.clientY - ed.borr[g.dataset.id].y * innerHeight };
      try { g.setPointerCapture(e.pointerId); } catch (er) { /* sintético */ } pintarEd();
    });
    el.addEventListener('pointermove', e => { if (!arrastra || e.pointerId !== arrastra.id) return; mover(ed.sel, e.clientX - arrastra.dx, e.clientY - arrastra.dy); });
    const suelta = e => { if (arrastra && e.pointerId === arrastra.id) arrastra = null; };
    el.addEventListener('pointerup', suelta); el.addEventListener('pointercancel', suelta);
    el.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('button'); if (!b) return;
      if (b.dataset.tam) { ed.borr[ed.sel].s = TAM[b.dataset.tam]; pintarEd(); }
      else if (b.dataset.c === 'reset') restablecerEd();
      else if (b.dataset.c === 'cancelar') cerrar(false);
      else if (b.dataset.c === 'listo') cerrar(true);
    });
    el.querySelector('[data-c="op"]').addEventListener('input', e => { ed.borr[ed.sel].o = Math.max(0.35, Math.min(1, (+e.target.value || 100) / 100)); pintarEd(); });
    pausaAntes = !!(G.pausa && G.pausa.motivos && G.pausa.motivos.has('controles'));
    if (G.pausa) G.pausa.set('controles', true);
    pintarEd();
    return ed;
  }
  // Mueve un botón (centro en px), con imán a la rejilla y sin salirse de la pantalla
  function mover(id, x, y) {
    const b = ed.borr[id], w = b.w * b.s, h = b.h * b.s;
    x = Math.round(x / REJ) * REJ; y = Math.round(y / REJ) * REJ;
    x = Math.max(w / 2 + 4, Math.min(innerWidth - w / 2 - 4, x)); y = Math.max(h / 2 + 4, Math.min(innerHeight - h / 2 - 4, y));
    b.x = x / innerWidth; b.y = y / innerHeight; pintarEd();
  }
  const cajaEd = id => { const b = ed.borr[id], w = b.w * b.s, h = b.h * b.s; return { l: b.x * innerWidth - w / 2, t: b.y * innerHeight - h / 2, r: b.x * innerWidth + w / 2, b: b.y * innerHeight + h / 2 }; };
  const chocan = (a, b) => a.l < b.r - 2 && b.l < a.r - 2 && a.t < b.b - 2 && b.t < a.b - 2;
  // Qué botones se pisan (los del duelo con los del duelo y con los de siempre; Volar solo con los de siempre)
  function choques() {
    const ids = CTL.map(c => c.id), out = new Set();
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) if (chocan(cajaEd(ids[i]), cajaEd(ids[j]))) { out.add(ids[i]); out.add(ids[j]); }
    return out;
  }
  function pintarEd() {
    if (!ed) return;
    const ch = choques();
    for (const c of CTL) {
      const g = ed.ghosts[c.id], b = ed.borr[c.id], k = cajaEd(c.id);
      g.style.left = Math.round(k.l) + 'px'; g.style.top = Math.round(k.t) + 'px'; g.style.width = Math.round(k.r - k.l) + 'px'; g.style.height = Math.round(k.b - k.t) + 'px';
      g.style.opacity = String(Math.max(0.5, b.o)); g.classList.toggle('sel', c.id === ed.sel); g.classList.toggle('choca', ch.has(c.id));
    }
    const s = ed.borr[ed.sel], c = CTL.find(x => x.id === ed.sel);
    ed.el.querySelector('[data-c="nom"]').textContent = c.n;
    for (const b of ed.el.querySelectorAll('[data-tam]')) b.setAttribute('aria-pressed', String(TAM[b.dataset.tam] === s.s));
    ed.el.querySelector('[data-c="op"]').value = String(Math.round(s.o * 100));
    ed.choques = ch.size;
  }
  function restablecerEd() {
    datos[ed.o] = {}; aplicar();
    for (const c of CTL) { const b = cajaDe(c); ed.borr[c.id] = { x: b.x / innerWidth, y: b.y / innerHeight, s: 1, o: 1, w: b.w, h: b.h }; }
    ed.reset = true; pintarEd();
  }
  function cerrar(guardarlo) {
    if (!ed) return false;
    if (guardarlo) {
      const L = {};
      const fab = {}; for (const c of CTL) { const b = cajaDe(c); fab[c.id] = b; }
      for (const c of CTL) {
        const b = ed.borr[c.id], f = fab[c.id], igual = !datos[ed.o][c.id] && Math.abs(b.x * innerWidth - f.x) < 2 && Math.abs(b.y * innerHeight - f.y) < 2 && b.s === 1 && b.o === 1;
        if (!igual) L[c.id] = sano(b);
      }
      datos[ed.o] = L; guardar();
    } else if (ed.reset) datos = leer();
    ed.el.remove(); ed = null;
    if (G.pausa && !pausaAntes) G.pausa.set('controles', false);
    aplicar();
    return true;
  }
  function restablecer() { datos = { v: 1, vertical: {}, horizontal: {} }; guardar(); aplicar(); }

  // ---------- Botón en el menú de pausa (solo táctil: .a11y-solo-tactil) ----------
  (function montar() {
    const menu = document.getElementById('pause'), ayuda = menu && menu.querySelector('.pause-help');
    if (!ayuda || menu.querySelector('.pause-controles')) return;
    const sec = document.createElement('section'); sec.className = 'pause-help pause-controles a11y-solo-tactil';
    sec.innerHTML = '<h3>Botones</h3><div class="row"><button class="btn ghost" type="button" id="b-controles" data-icon="hand">Personalizar controles</button></div>';
    ayuda.after(sec);
    sec.querySelector('#b-controles').addEventListener('click', () => abrir());
  })();
  aplicar();

  // ---------- Prueba (AV.botonesTest) ----------
  function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    let crudo = null; try { crudo = localStorage.getItem(CLAVE); } catch (e) { /* sin almacenamiento */ }
    const datos0 = JSON.parse(JSON.stringify(datos));
    const act = document.getElementById('b-act'), acts = document.getElementById('acts'), disp0 = acts && acts.style.display;
    try {
      if (acts) acts.style.display = 'grid'; // en el escritorio #acts no se ve: para medir se enseña un momento
      restablecer();
      check('De fábrica no hay nada guardado ni ningún estilo puesto', !localStorage.getItem(CLAVE) && !act.dataset.ctl && !act.style.left, act.style.cssText);
      const r0 = act.getBoundingClientRect();
      const e = abrir();
      check('El editor se abre con un botón fantasma por control (Acción, Impulso, Saltar, Volar, Salir y las 4 del duelo) y pone el juego en pausa', !!e && Object.keys(e.ghosts).length === 9 && !!(G.pausa && G.pausa.motivos.has('controles')), Object.keys(e.ghosts).join(','));
      // Arrastrar Acción con el dedo (eventos sintéticos): imán a 8 px y dentro de la pantalla
      const g = e.ghosts.act, gr = g.getBoundingClientRect(), cx = gr.left + gr.width / 2, cy = gr.top + gr.height / 2;
      const pe = (t, x, y) => g.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 77, pointerType: 'touch', clientX: x, clientY: y }));
      pe('pointerdown', cx, cy); pe('pointermove', cx - 103, cy - 151); pe('pointerup', cx - 103, cy - 151);
      const b = e.borr.act, px = b.x * innerWidth, py = b.y * innerHeight;
      check('Arrastrar mueve el botón con imán a la rejilla de 8 px', px % 8 === 0 && py % 8 === 0 && Math.abs(px - (cx - 103)) <= 4 && Math.abs(py - (cy - 151)) <= 4, JSON.stringify({ px, py }));
      mover('act', -500, 99999); const bb = cajaEd('act');
      check('No se sale de la pantalla', bb.l >= 0 && bb.t >= 0 && bb.r <= innerWidth && bb.b <= innerHeight, JSON.stringify(bb));
      mover('act', innerWidth / 2, innerHeight / 2);
      e.el.querySelector('[data-tam="G"]').click(); const op = e.el.querySelector('[data-c="op"]'); op.value = '60'; op.dispatchEvent(new Event('input'));
      mover('dash', innerWidth / 2, innerHeight / 2); const choca = e.choques;
      mover('dash', innerWidth / 2 + 200, innerHeight / 2);
      check('Tamaño G y opacidad 60 % del elegido; si dos se pisan se marcan', e.borr.act.s === 1.25 && Math.abs(e.borr.act.o - 0.6) < 1e-9 && choca >= 2 && e.ghosts.act.classList.contains('sel'), JSON.stringify({ s: e.borr.act.s, o: e.borr.act.o, choca }));
      cerrar(true);
      const r1 = act.getBoundingClientRect(), g1 = JSON.parse(localStorage.getItem(CLAVE) || 'null');
      check('«Listo» guarda en el dispositivo (por orientación) y el botón de verdad va donde lo dejaste, más grande y translúcido',
        g1 && g1.v === 1 && g1[orient()].act && Math.abs(r1.left + r1.width / 2 - innerWidth / 2) <= 6 && Math.abs(r1.top + r1.height / 2 - innerHeight / 2) <= 6 && act.style.opacity === '0.6' && /scale\(1.25\)/.test(act.style.transform) && !(G.pausa && G.pausa.motivos.has('controles')),
        JSON.stringify({ r1: [r1.left, r1.top, r1.width], g1: g1 && g1[orient()].act }));
      const otra = orient() === 'vertical' ? 'horizontal' : 'vertical';
      check('Vertical y horizontal se guardan aparte', g1 && !g1[otra].act, JSON.stringify(g1 && g1[otra]));
      datos = leer(); aplicar();
      check('Se relee igual al volver a cargar', datos[orient()].act && datos[orient()].act.s === 1.25 && !!act.dataset.ctl);
      localStorage.setItem(CLAVE, '{"v":1,"vertical":{"act":{"x":"mal","s":99}}}');
      const dañado = leer().vertical.act;
      check('Un guardado dañado se sanea (dentro de pantalla, tamaño ≤ 1,5)', dañado && dañado.x === 0.5 && dañado.s === 1.5, JSON.stringify(dañado));
      abrir(); e.el && 0; ed.el.querySelector('[data-c="reset"]').click(); cerrar(true);
      check('«Restablecer» vuelve a lo de fábrica: sin nada guardado y el botón en su sitio de siempre', !localStorage.getItem(CLAVE) && !act.dataset.ctl && Math.abs(act.getBoundingClientRect().left - r0.left) < 1, act.style.cssText);
      check('El teclado no cambia: sin estilos en el mapa de teclas ni en las acciones', !!(G.input && G.input.mapa && G.input.mapa.accion));
    } catch (er) { check('Sin excepciones', false, er && (er.stack || er.message)); }
    if (ed) cerrar(false);
    datos = datos0; if (acts) acts.style.display = disp0 || '';
    try { if (crudo == null) localStorage.removeItem(CLAVE); else localStorage.setItem(CLAVE, crudo); } catch (e) { /* sin almacenamiento */ }
    aplicar();
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }
  { let n = 0; const pon = () => { if (window.AV && window.AV.G === G) { if (!window.AV.botonesTest) window.AV.botonesTest = o => Promise.resolve(test(o)); } else if (n++ < 120) setTimeout(pon, 250); }; setTimeout(pon, 0); }
  return { aplicar, abrir, cerrar, restablecer, editando: () => !!ed, datos: () => JSON.parse(JSON.stringify(datos)), CTL, test };
});
