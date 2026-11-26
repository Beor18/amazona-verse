/* Juego · CG-43. Escondite con los pichones. Rejugable, 2 minutos, el pío suena más cerca.
   Al encontrarlos se pide un gag de gags.js si ya está cargado (sin cambiar ese archivo) y, si no, el gesto Celebrar.
   Una sola malla, apagada cuando no se juega. Récord en el dispositivo. window.AVEscondite(G). Prueba: AV.esconditeTest(). */
window.AVEscondite = function (G) {
  'use strict';
  if (G.escondite) return G.escondite;
  const S = G.S, M = G.fisica.MOVE;
  const H = (x, z) => G.terreno.height(x, z);
  const CLAVE = ((G.pack && G.pack.meta && G.pack.meta.almacen) || 'amazonaverse') + '.escondite';
  const LIMITE = 120;
  let mejor = null, jugando = false, t = 0, sitios = [], pio = 0;
  const en = () => !!(G.aula && G.aula.aj && G.aula.aj.idioma === 'en');
  try { const d = JSON.parse(localStorage.getItem(CLAVE) || 'null'); if (d && d.mejor) mejor = d.mejor; } catch (e) { /* */ }
  const geo = new THREE.SphereGeometry(0.16, 8, 6);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffe27a });
  const malla = new THREE.InstancedMesh(geo, mat, 3);
  malla.count = 0; malla.visible = false; malla.frustumCulled = false; malla.castShadow = false; malla.name = 'escondite';
  G.renderer.scene.add(malla);
  const dummy = new THREE.Object3D();
  if (G.audio && G.audio.define) {
    try { G.audio.define('pio_escondite', (t0, g, X) => X.tone(1400, t0, 0.08, { type: 'sine', gain: 0.03 + 0.05 * (g || 0) })); } catch (e) { /* */ }
  }
  function armar(ox, oz) {
    const base = [{ id: 'copa', dx: 8, dz: 2, alto: 6 }, { id: 'muelle', dx: -6, dz: 4, alto: 0.35 }, { id: 'tejado', dx: 3, dz: -7, alto: 3.2 }];
    sitios = base.map(b => { const x = ox + b.dx, z = oz + b.dz; return { id: b.id, x, z, y: H(x, z) + b.alto, hallado: false }; });
  }
  function pintar() {
    let n = 0;
    sitios.forEach(s => {
      if (s.hallado) return;
      dummy.position.set(s.x, s.y, s.z); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
      malla.setMatrixAt(n++, dummy.matrix);
    });
    malla.count = n; malla.instanceMatrix.needsUpdate = true; malla.visible = jugando && n > 0 && !(modo && pich.listos);
    ponerPichones();
  }
  // ---------- T56 · Pichones de verdad (la cotorra del juego a tamaño de cría) y el modo de «Más juegos» ----------
  const pich = { chs: [], listos: false, pidiendo: null, t: 0 };
  function crearPichones() {
    if (pich.pidiendo || !window.AVCharacter || !window.AVCharacter.create) return pich.pidiendo || Promise.resolve(false);
    pich.pidiendo = Promise.all([0, 1, 2].map(() => window.AVCharacter.create())).then(chs => {
      chs.forEach(ch => { ch.root.scale.setScalar(0.5 / (ch.height || 1)); ch.root.visible = false; try { ch.applyLook({ species: 'vittata' }); } catch (e) { /* piel */ } try { ch.play('Idle'); } catch (e) { /* */ } G.renderer.scene.add(ch.root); });
      pich.chs = chs; pich.listos = true; pintar(); return true;
    }, () => false);
    return pich.pidiendo;
  }
  function ponerPichones() {
    if (!pich.listos) return;
    pich.chs.forEach((ch, i) => { const st = sitios[i], ver = modo && jugando && !!st && !st.hallado; ch.root.visible = ver; if (ver) ch.root.position.set(st.x, st.y, st.z); });
  }
  let modo = false, hudEl = null, finEl = null, resultado = '', fin = null, logroId = 0; // fin: { todos, t, nuevo, n } del panel final (PULIR 4)
  const PICHON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><ellipse cx="12" cy="14" rx="7" ry="6.5" fill="#5fce5a"/><circle cx="12" cy="8" r="4.6" fill="#6bd965"/><path d="M15.6 8.4l3 1-3 1z" fill="#f2b13a"/><circle cx="13.4" cy="7.4" r="1" fill="#1b2a1a"/><path d="M8 12q-3 2-1 5" stroke="#3f9a3c" stroke-width="1.6" fill="none"/></svg>';
  const finSon = (tipo, sigue) => { const F = window.AVFinJuego; if (!F) return 0; if (tipo === 'record') return F.record(G, 'escondite', sigue); F.sonar(G, 'escondite', tipo); return 0; }; // PULIR 4: tabla común (menu_modos.js)
  const txt = (es, eng) => (en() ? eng : es);
  const reloj = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  function hud() {
    if (!hudEl) {
      const st = document.createElement('style'); st.id = 'esc-css';
      st.textContent = '#esc-hud{position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 12px);z-index:60;display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center;max-width:calc(100vw - 24px);padding:8px 12px;border-radius:18px;background:rgba(16,36,28,.86);color:#fff8e6;font:600 15px Fredoka,system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.35)}#esc-hud[hidden]{display:none}' +
        '#esc-hud b{font-size:16px}#esc-hud .esc-pista{flex:1 1 100%;font-size:13px;font-weight:600;line-height:1.25;text-align:center}#esc-hud .esc-pista:empty{display:none}' +
        '@keyframes esc-pop{40%{transform:scale(1.25)}}#esc-hud [data-k="n"].esc-pop{display:inline-block;animation:esc-pop .4s ease-out}#esc-hud .esc-pista.cerca{color:#ffd27a;animation:esc-pop 1.1s ease-in-out infinite}@media (prefers-reduced-motion:reduce){#esc-hud [data-k="n"].esc-pop,#esc-hud .esc-pista.cerca{animation:none}}' +
        '@media (max-width:420px){#esc-hud{padding:6px 8px;gap:4px 8px}#esc-hud b{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}#esc-hud button.salir{order:-1}}' +
        '#esc-hud button{min-height:44px;padding:4px 16px;border-radius:22px;border:0;font:700 15px Fredoka,system-ui,sans-serif;background:#fff3d6;color:#3b2a14;cursor:pointer}#esc-hud button.salir{background:#ffd0c4}#esc-hud button[hidden]{display:none}' +
        // PULIR 4: panel final como el de los demás minijuegos (tiempo, récord, «Otra vez» y «Salir»; letra y botones de .av-fin, ui.css)
        '#esc-fin{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:61;width:min(400px,calc(100vw - 32px));max-height:calc(100dvh - 32px);overflow:auto;box-sizing:border-box;padding:18px 18px 16px;border-radius:24px;background:rgba(16,36,28,.93);color:#fff8e6;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.45);display:flex;flex-direction:column;align-items:center;gap:8px}#esc-fin[hidden]{display:none}#esc-fin:focus{outline:none}' +
        '#esc-fin h2,#esc-fin p{margin:0}#esc-fin .esc-gran{display:flex;align-items:center;gap:8px}#esc-fin .esc-gran svg{width:44px;height:44px}#esc-fin .av-det{opacity:.85}#esc-fin .av-bots{margin-top:6px}' +
        '@media (orientation:landscape) and (max-height:500px){#esc-fin{padding:12px 16px;gap:4px}#esc-fin .esc-gran svg{width:34px;height:34px}}' +
        'body.escondite-on:has(#esc-fin:not([hidden])) #toast{visibility:hidden!important}' +
        'body.escondite-on :is(#quest,#inv,#modo-salir,#toast,#prompt,#bocadillos,#b-diary,#b-emotes,#b-act,#b-dash){visibility:hidden!important}' +
        '#esc-hud .esc-pista.tibio{color:#ffe7b0}' +
        'body.escondite-on:has(#esc-fin:not([hidden])) :is(#stick,#acts,#minimapa,#marcador){visibility:hidden!important}' + // PULIR 4 (revisión): con el panel final, sin joystick ni botones de vuelo detrás (como los demás)
        // F20 r2: el aviso de inicio va debajo de la barra (se cruzaban); al terminar, el resultado lo dice la barra (sin aviso detrás)
        '@media (orientation:landscape){body.escondite-on #toast{top:calc(env(safe-area-inset-top,0px) + 80px)!important;bottom:auto!important}}' +
        '@media (orientation:landscape) and (max-height:500px){#esc-hud{flex-wrap:nowrap;max-width:min(640px,calc(100vw - 160px));padding:4px 8px;gap:8px}#esc-hud .esc-pista{flex:0 1 auto}}';
      document.head.appendChild(st);
      hudEl = document.createElement('div'); hudEl.id = 'esc-hud'; hudEl.hidden = true; hudEl.setAttribute('role', 'status');
      hudEl.innerHTML = '<b data-k="t"></b><span data-k="n"></span><span data-k="r"></span><span class="esc-pista" data-k="h"></span><button type="button" data-a="otra" hidden></button><button type="button" class="salir" data-a="salir"></button>';
      const clic = e => { const b = e.target.closest && e.target.closest('button[data-a]'); if (!b) return; if (b.dataset.a === 'otra') jugar(); else salir(); };
      hudEl.addEventListener('click', clic);
      finEl = document.createElement('div'); finEl.id = 'esc-fin'; finEl.className = 'av-fin'; finEl.hidden = true; finEl.tabIndex = -1; finEl.setAttribute('role', 'dialog'); finEl.setAttribute('aria-modal', 'true'); finEl.setAttribute('aria-labelledby', 'esc-fin-t');
      finEl.innerHTML = '<h2 id="esc-fin-t" data-k="ft"></h2><div class="esc-gran av-num">' + PICHON + '<span data-k="fn"></span></div><p class="av-msg" data-k="fmsg" aria-live="polite"></p><p class="av-det" data-k="fdet"></p><div class="av-bots"><button type="button" class="av-bot" data-a="otra"></button><button type="button" class="av-bot salir" data-a="salir"></button></div>';
      finEl.addEventListener('click', clic);
      document.body.appendChild(hudEl); document.body.appendChild(finEl);
    }
    return hudEl;
  }
  function pintarHud() {
    if (!hudEl) return;
    const n = sitios.filter(s0 => s0.hallado).length, q = k => hudEl.querySelector('[data-k="' + k + '"]');
    q('t').textContent = txt('Escondite', 'Hide-and-seek');
    const linea = resultado || txt(`Pichones: ${n}/3`, `Chicks: ${n}/3`);
    const nn = q('n');
    if (nn.textContent && nn.textContent !== linea) { nn.classList.remove('esc-pop'); void nn.offsetWidth; nn.classList.add('esc-pop'); }
    nn.textContent = linea;
    q('r').textContent = resultado ? '' : reloj(Math.max(0, LIMITE - t)) + (mejor != null ? txt(' · récord ', ' · best ') + reloj(mejor) : '');
    const pista = !jugando || resultado ? ['', ''] : n > 0 ? ['Quedan ' + (3 - n), (3 - n) + ' still hiding'] : (calor >= 2 ? ['¡Ya casi!', 'Almost there!'] : calor === 1 ? ['Más fuerte', 'Louder'] : ['Sigue el pío', 'Follow the peep']);
    q('h').textContent = txt(pista[0], pista[1]);
    const otra = hudEl.querySelector('[data-a="otra"]'); otra.hidden = jugando || !!fin; otra.textContent = txt('Otra vez', 'Play again'); // con el panel final, «Otra vez» va en el panel
    hudEl.querySelector('[data-a="salir"]').textContent = txt('Salir', 'Exit');
    pintarFin();
  }
  function pintarFin() {
    if (!finEl) return;
    finEl.hidden = !fin; if (!fin) return;
    const qf = k => finEl.querySelector('[data-k="' + k + '"]');
    qf('ft').textContent = fin.todos ? txt('¡Los encontraste!', 'You found them!') : txt('¡Se escondieron!', 'They hid again!');
    qf('fn').textContent = fin.todos ? reloj(fin.t) : fin.n + '/3';
    qf('fmsg').textContent = fin.todos ? (fin.nuevo ? txt('¡Nuevo récord: los 3 en ' + reloj(fin.t) + '!', 'New record: all 3 in ' + reloj(fin.t) + '!') : txt('Los 3 en ' + reloj(fin.t) + '. Récord: ' + reloj(mejor), 'All 3 in ' + reloj(fin.t) + '. Best: ' + reloj(mejor)))
      : txt('¡Casi! Sigue el pío: cuanto más fuerte, más cerca están', 'So close! Follow the peep: the louder it gets, the closer they are');
    qf('fdet').textContent = fin.todos ? '' : (mejor != null ? txt('Récord: ', 'Best: ') + reloj(mejor) : '');
    finEl.querySelector('[data-a="otra"]').textContent = txt('Otra vez', 'Play again');
    finEl.querySelector('[data-a="salir"]').textContent = txt('Salir', 'Exit');
  }
  // PULIR 4: el final del modo de «Más juegos» sale en el panel común. Revisión: modal como los demás paneles F2 (F22): aria-modal, el mundo en
  // pausa detrás y Tab da la vuelta entre «Otra vez» y «Salir»; el foco va al panel, no a «Otra vez»
  function mostrarFin(todos, nuevo) {
    fin = { todos, t, nuevo, n: sitios.filter(s0 => s0.hallado).length };
    finSon(todos ? 'victoria' : 'casi'); if (nuevo) logroId = finSon('record', () => !!fin);
    pintarHud(); if (hudEl) hudEl.hidden = true; // un solo «Salir»: el del panel (como ¡Sígueme! y Foto relámpago)
    try { if (G.pausa && G.pausa.set) G.pausa.set('escondite', true); } catch (e) { /* sin pausa */ }
    setTimeout(() => { try { if (fin && finEl && !finEl.hidden) finEl.focus({ preventScroll: true }); } catch (e) { /* */ } }, 0);
  }
  function quitarFin() { fin = null; if (logroId) { clearTimeout(logroId); logroId = 0; } try { if (G.pausa && G.pausa.set) G.pausa.set('escondite', false); } catch (e) { /* sin pausa */ } if (finEl) { finEl.hidden = true; finEl.querySelectorAll('[data-k]').forEach(e => { e.textContent = ''; }); } }
  function jugar() {
    modo = true; resultado = ''; quitarFin(); crearPichones();
    empezar(S.pos.x, S.pos.z, { reales: true });
    hud().hidden = false; document.body.classList.add('escondite-on'); pintarHud();
    try { G.fx.burst(S.pos.x, S.pos.y + 0.8, S.pos.z, 'feathers', 8); } catch (e) { /* */ }
    try { if (G.menuModos && G.menuModos.encuadrar) G.menuModos.encuadrar(); } catch (e) { /* sin menú */ } // F20 r2: sin ladera ni techo delante de la cámara
    return true;
  }
  function salir() {
    if (!modo) return false;
    modo = false; jugando = false; resultado = ''; quitarFin(); malla.visible = false; ponerPichones();
    if (hudEl) { hudEl.hidden = true; hudEl.querySelectorAll('[data-k]').forEach(e => { e.textContent = ''; }); } // sin texto viejo (ni en otro idioma) mientras no se juega
    document.body.classList.remove('escondite-on');
    return true;
  }
  const activo = () => modo;
  addEventListener('keydown', e => { // PULIR 4 (revisión): con el panel final, Tab no sale de él (da la vuelta entre sus botones)
    if (!modo || !fin || e.key !== 'Tab' || !finEl || finEl.hidden || (G.ui && G.ui.cardOpen)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const bs = [...finEl.querySelectorAll('button')], i = bs.indexOf(document.activeElement), n = bs.length;
    const j = e.shiftKey ? (i <= 0 ? n - 1 : i - 1) : (i < 0 || i >= n - 1 ? 0 : i + 1);
    try { bs[j].focus({ preventScroll: true }); } catch (er) { /* */ }
  }, true);
  function gag() {
    try {
      if (G.gags && G.gags.forzar) { if (G.gags.forzar('imitar', { gesto: 'celebrar', forzado: true })) return 'gag'; }
    } catch (e) { /* sin compañero */ }
    try { if (G.actores && G.actores.playEmote) G.actores.playEmote('celebrar'); } catch (e) { /* sin gesto */ }
    return 'gesto';
  }
  // T56: en el modo de «Más juegos», los pichones se esconden en perchas de verdad cerca (copas, ramas, tejados), separadas;
  // si no hay bastantes, en el suelo alrededor. En Family Quest y en la prueba, los tres sitios de siempre.
  function sitiosReales(ox, oz) {
    const ps = ((G.fisica && G.fisica.perchas) || []).filter(p => (!p.when || p.when()) && isFinite(p.y))
      .map(p => ({ x: p.x, z: p.z, y: p.y + 0.05, d: Math.hypot(p.x - ox, p.z - oz) })).filter(p => p.d > 7 && p.d < 40).sort((a, b) => a.d - b.d);
    const out = [];
    for (const p of ps) { if (out.length >= 3) break; if (out.every(q => Math.hypot(q.x - p.x, q.z - p.z) > 6)) out.push(p); }
    const suelo = [[9, 4], [-8, 6], [4, -10]];
    for (let k = 0; out.length < 3 && k < suelo.length; k++) { const x = ox + suelo[k][0], z = oz + suelo[k][1]; out.push({ x, z, y: H(x, z) + 0.02 }); }
    sitios = out.slice(0, 3).map((p, i) => ({ id: 'pichon' + (i + 1), x: p.x, z: p.z, y: p.y, hallado: false }));
  }
  function empezar(x, z, o) {
    if (o && o.reales) sitiosReales(x == null ? S.pos.x : x, z == null ? S.pos.z : z); else armar(x == null ? S.pos.x : x, z == null ? S.pos.z : z);
    jugando = true; t = 0; calor = 0; calorId = ''; pintar();
    if (G.ui && G.ui.toast) G.ui.toast(en() ? 'Hide-and-seek! Find the chicks. The peep gets louder when you are close.' : '¡Escondite! Encuentra a los pichones. El pío se oye más fuerte cerca.', 2800);
    return sitios;
  }
  let calor = 0, calorId = '';
  function cerca() {
    let mejorD = 1e9, quien = null;
    for (const s of sitios) if (!s.hallado) { const d = Math.hypot(S.pos.x - s.x, S.pos.z - s.z); if (d < mejorD) { mejorD = d; quien = s; } }
    return { d: mejorD, quien };
  }
  function paso(dt) {
    if (modo && pich.listos) { pich.t += dt; pich.chs.forEach((ch, i) => { if (!ch.root.visible) return; try { ch.update(dt); } catch (e) { /* */ } ch.root.rotation.y = Math.atan2(S.pos.x - ch.root.position.x, S.pos.z - ch.root.position.z) + Math.sin(pich.t * 1.3 + i) * 0.5; }); }
    if (modo && hudEl && !hudEl.hidden && Math.floor(t * 4) !== Math.floor((t + dt) * 4)) pintarHud();
    if (!jugando) return;
    t += dt;
    let mejorD = 1e9, quien = null; // cerca() inline: sin objeto por cuadro (CG-67); cerca() sigue exportando un objeto fresco
    for (const s of sitios) if (!s.hallado) { const d = Math.hypot(S.pos.x - s.x, S.pos.z - s.z); if (d < mejorD) { mejorD = d; quien = s; } }
    if (quien && mejorD < 36) { // oyen el pío en toda la zona de búsqueda (los pichones están a menos de 40 m)
      pio = Math.max(0, 1 - mejorD / 36);
      if (G.audio && G.audio.play && Math.floor(t * 2) !== Math.floor((t - dt) * 2)) {
        try { G.audio.play('pio_escondite', pio); } catch (e) { /* */ }
      }
      if (mejorD < 2.4) { quien.hallado = true; gag(); try { G.fx.burst(quien.x, quien.y + 0.5, quien.z, 'gold', 10); G.fx.burst(quien.x, quien.y + 0.8, quien.z, 'leaves', 12); } catch (e) { /* */ } try { if (!G.quiet && G.audio && G.audio.play) G.audio.play('encaje'); } catch (e) { /* el mismo «encaje» de cuando algo encaja */ } pintar(); if (modo) pintarHud(); }
    }
    const c = jugando && quien ? (mejorD < 14 ? 2 : mejorD < 24 ? 1 : 0) : 0;
    if (c !== calor) {
      calor = c;
      if (c === 2 && quien && calorId !== quien.id) {
        calorId = quien.id;
        try { if (G.audio && G.audio.play) G.audio.play('nido_chispa'); } catch (e) { /* */ }
        try { G.fx.burst(S.pos.x, S.pos.y + 0.6, S.pos.z, 'feathers', 8); } catch (e) { /* */ }
      }
    }
    if (modo && pich.listos && quien) pich.chs.forEach((ch, i) => { const s0 = sitios[i]; if (!s0 || !ch.root.visible) return; ch.root.position.y = s0 === quien && mejorD < 16 ? s0.y + Math.sin(t * 8) * 0.16 : s0.y; });
    if (modo && hudEl) { const h = hudEl.querySelector('[data-k="h"]'); if (h) { h.classList.toggle('cerca', c === 2); h.classList.toggle('tibio', c === 1); } }
    let todos = true;
    for (const s of sitios) if (!s.hallado) { todos = false; break; }
    if (todos) {
      jugando = false; malla.visible = false;
      const nuevo = mejor == null || t < mejor;
      if (nuevo) { mejor = t; try { localStorage.setItem(CLAVE, JSON.stringify({ v: 1, mejor })); } catch (e) { /* */ } }
      G.emit('record', { modo: 'escondite', segundos: t });
      if (!modo && G.ui && G.ui.toast) G.ui.toast(en() ? 'You found them!' : '¡Los encontraste!', 2000);
      if (modo) { resultado = txt('¡Los 3 en ' + reloj(t) + '!', 'All 3 in ' + reloj(t) + '!'); ponerPichones(); mostrarFin(true, nuevo); }
    } else if (t >= LIMITE) {
      jugando = false; malla.visible = false;
      if (!modo && G.ui && G.ui.toast) G.ui.toast(en() ? 'They hid again. Another round whenever you want.' : 'Se escondieron otra vez. Cuando quieras, otra ronda.', 2200);
      if (modo) { resultado = txt('Se escondieron otra vez', 'They hid again'); ponerPichones(); mostrarFin(false, false); }
    }
  }
  G.on('update', dt => { if (!G.quiet) paso(Math.min(0.05, dt || 0)); });
  let guiando = false;
  function guiar() {
    if (!G.fx || !G.fx.guide) return;
    if (!(modo && jugando)) { if (guiando) { guiando = false; try { G.fx.guide(null, 0); } catch (e) { /* */ } } return; }
    let mejorD = 1e9, quien = null;
    for (const s of sitios) if (!s.hallado) { const d = Math.hypot(S.pos.x - s.x, S.pos.z - s.z); if (d < mejorD) { mejorD = d; quien = s; } }
    guiando = !!quien;
    try { G.fx.guide(quien ? { x: quien.x, y: quien.y + 2, z: quien.z } : null, performance.now() / 1000); } catch (e) { /* sin flecha */ }
  }
  G.on('render', guiar, 62);
  function test() {
    const results = [], ok = (name, pass, extra) => results.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const q = G.quiet, px = S.pos.x, pz = S.pos.z;
    try {
      G.quiet = true;
      const lista = empezar(100, 100);
      ok('Hay copa, muelle y tejado', lista.map(s => s.id).join() === 'copa,muelle,tejado' && lista.every(s => s.y >= H(s.x, s.z) - 0.05), lista.map(s => s.id + '@' + s.y.toFixed(1)).join(' '));
      const lejos = cerca().d, cercaUno = (S.pos.x = lista[0].x, S.pos.z = lista[0].z, cerca().d);
      ok('El pío corresponde a la distancia: más cerca, menos metros', cercaUno < lejos && cercaUno < 1, lejos.toFixed(1) + ' → ' + cercaUno.toFixed(1));
      paso(0.2);
      ok('Al llegar se encuentra y el gag no rompe', lista[0].hallado === true, String(lista[0].hallado));
      ok('Sigue jugable y la malla es una', jugando && malla.count === 2, 'count ' + malla.count);
      lista[1].hallado = lista[2].hallado = true; paso(0.1);
      ok('Al completar guarda un récord', mejor != null && mejor < LIMITE, String(mejor));
      // T56: el modo de «Más juegos»: 3 pichones en sitios separados, HUD con «Salir»; al salir no queda nada
      const mejor0 = mejor; jugar();
      const sep = sitios.every((a, i) => sitios.every((b, j) => i === j || Math.hypot(a.x - b.x, a.z - b.z) > 5));
      ok('T56 · Escondite en «Más juegos»: 3 pichones en sitios separados, HUD con tiempo, n/3 y «Salir»', modo && jugando && sitios.length === 3 && sep && !!hudEl && !hudEl.hidden && /0\/3/.test(hudEl.textContent) && !!hudEl.querySelector('[data-a="salir"]') && document.body.classList.contains('escondite-on'), hudEl && hudEl.textContent);
      sitios.forEach(s0 => { s0.hallado = true; }); paso(0.1);
      ok('T56 · al encontrarlos, el panel final dice el tiempo (la barra se oculta: un solo «Salir»)', !jugando && hudEl.hidden && !finEl.hidden && /\d:\d\d/.test(finEl.querySelector('[data-k="fn"]').textContent), finEl.textContent);
      { const enPanel = []; finEl.focus(); for (let i = 0; i < 3; i++) { const t2 = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }); dispatchEvent(t2); enPanel.push(t2.defaultPrevented && finEl.contains(document.activeElement) && document.activeElement !== finEl); }
        const tapa = ['stick', 'acts', 'minimapa'].filter(id => { const x = document.getElementById(id); return !!x && x.getClientRects().length > 0 && getComputedStyle(x).visibility !== 'hidden'; });
        ok('PULIR 4 · el panel final es modal: aria-modal, mundo en pausa, Tab no sale de «Otra vez»/«Salir» y sin joystick ni botones detrás', finEl.getAttribute('aria-modal') === 'true' && (!G.pausa || !G.pausa.motivos || G.pausa.motivos.has('escondite')) && enPanel.every(Boolean) && !tapa.length, enPanel.join() + ' · se ve ' + tapa.join()); }
      { const bs = [...finEl.querySelectorAll('.av-bots .av-bot')], lg = (window.AVFinJuego ? window.AVFinJuego.log : []).filter(x => x.juego === 'escondite' && x.tipo !== 'record').slice(-1).map(x => x.tipo).join();
        ok('PULIR 4 · panel final común: tiempo, récord, «Otra vez» y «Salir» de ≥ 44 px (54 px, 18 px) y el sonido de victoria de la tabla común', !finEl.hidden && finEl.classList.contains('av-fin') && /\d:\d\d/.test(finEl.querySelector('[data-k="fn"]').textContent) && /récord/i.test(finEl.querySelector('[data-k="fmsg"]').textContent) && bs.length === 2 && bs.every(b => b.getBoundingClientRect().height >= 54 && getComputedStyle(b).fontSize === '18px') && lg === 'victoria' && hudEl.querySelector('[data-a="otra"]').hidden, finEl.textContent + ' · ' + lg); }
      finEl.querySelector('[data-a="otra"]').click();
      ok('PULIR 4 · «Otra vez» del panel empieza otra ronda (sin panel)', modo && jugando && finEl.hidden && /0\/3/.test(hudEl.textContent));
      t = LIMITE; paso(0.1);
      ok('PULIR 4 · sin encontrarlos a tiempo: «¡Casi!» con pista (sin castigo) y el sonido «casi» de la tabla común', !jugando && !finEl.hidden && /^¡Casi! /.test(finEl.querySelector('[data-k="fmsg"]').textContent) && (window.AVFinJuego ? window.AVFinJuego.log.filter(x => x.juego === 'escondite').slice(-1)[0].tipo === 'casi' : true), finEl.textContent);
      salir();
      ok('T56 · «Salir» lo quita todo (HUD, panel, clase, pichones)', !modo && hudEl.hidden && finEl.hidden && !logroId && !document.body.classList.contains('escondite-on') && pich.chs.every(ch => !ch.root.visible));
      mejor = mejor0;
    } catch (e) { ok('sin excepciones', false, e && e.message); }
    jugando = false; malla.visible = false; malla.count = 0; G.quiet = q; S.pos.x = px; S.pos.z = pz;
    return { passed: results.filter(r => r.ok).length, total: results.length, results };
  }
  const pendientes = () => (jugando ? sitios.filter(s0 => !s0.hallado).map(s0 => ({ x: s0.x, y: s0.y, z: s0.z })) : []); // T60: para el Ojo de cotorra
  G.escondite = { empezar, paso, test, cerca, jugar, salir, activo, pendientes, get mejor() { return mejor; }, _pich: () => ({ listos: pich.listos, n: pich.chs.length, vis: pich.chs.map(c => c.root.visible), pos: pich.chs.map(c => [c.root.position.x, c.root.position.y, c.root.position.z].map(v => +v.toFixed(1))), esc: pich.chs.map(c => +c.root.scale.x.toFixed(3)) }) };
  return G.escondite;
};
