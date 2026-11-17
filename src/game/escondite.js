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
  let modo = false, hudEl = null, resultado = '';
  const txt = (es, eng) => (en() ? eng : es);
  const reloj = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  function hud() {
    if (!hudEl) {
      const st = document.createElement('style'); st.id = 'esc-css';
      st.textContent = '#esc-hud{position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 12px);z-index:60;display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center;max-width:calc(100vw - 24px);padding:8px 12px;border-radius:18px;background:rgba(16,36,28,.86);color:#fff8e6;font:600 15px Fredoka,system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.35)}#esc-hud[hidden]{display:none}' +
        '#esc-hud b{font-size:16px}#esc-hud button{min-height:44px;padding:4px 16px;border-radius:22px;border:0;font:700 15px Fredoka,system-ui,sans-serif;background:#fff3d6;color:#3b2a14;cursor:pointer}#esc-hud button.salir{background:#ffd0c4}#esc-hud button[hidden]{display:none}' +
        'body.escondite-on :is(#quest,#inv,#modo-salir){visibility:hidden!important}' +
        // F20 r2: el aviso de inicio va debajo de la barra (se cruzaban); al terminar, el resultado lo dice la barra (sin aviso detrás)
        '@media (orientation:landscape){body.escondite-on #toast{top:calc(env(safe-area-inset-top,0px) + 80px)!important;bottom:auto!important}}';
      document.head.appendChild(st);
      hudEl = document.createElement('div'); hudEl.id = 'esc-hud'; hudEl.hidden = true; hudEl.setAttribute('role', 'status');
      hudEl.innerHTML = '<b data-k="t"></b><span data-k="n"></span><span data-k="r"></span><button type="button" data-a="otra" hidden></button><button type="button" class="salir" data-a="salir"></button>';
      hudEl.addEventListener('click', e => { const b = e.target.closest && e.target.closest('button[data-a]'); if (!b) return; if (b.dataset.a === 'otra') jugar(); else salir(); });
      document.body.appendChild(hudEl);
    }
    return hudEl;
  }
  function pintarHud() {
    if (!hudEl) return;
    const n = sitios.filter(s0 => s0.hallado).length, q = k => hudEl.querySelector('[data-k="' + k + '"]');
    q('t').textContent = txt('Escondite', 'Hide-and-seek');
    q('n').textContent = resultado || txt(`Pichones: ${n}/3`, `Chicks: ${n}/3`);
    q('r').textContent = resultado ? '' : reloj(Math.max(0, LIMITE - t)) + (mejor != null ? txt(' · récord ', ' · best ') + reloj(mejor) : '');
    const otra = hudEl.querySelector('[data-a="otra"]'); otra.hidden = jugando; otra.textContent = txt('Otra vez', 'Play again');
    hudEl.querySelector('[data-a="salir"]').textContent = txt('Salir', 'Exit');
  }
  function jugar() {
    modo = true; resultado = ''; crearPichones();
    empezar(S.pos.x, S.pos.z, { reales: true });
    hud().hidden = false; document.body.classList.add('escondite-on'); pintarHud();
    try { if (G.menuModos && G.menuModos.encuadrar) G.menuModos.encuadrar(); } catch (e) { /* sin menú */ } // F20 r2: sin ladera ni techo delante de la cámara
    return true;
  }
  function salir() {
    if (!modo) return false;
    modo = false; jugando = false; resultado = ''; malla.visible = false; ponerPichones();
    if (hudEl) { hudEl.hidden = true; hudEl.querySelectorAll('[data-k]').forEach(e => { e.textContent = ''; }); } // sin texto viejo (ni en otro idioma) mientras no se juega
    document.body.classList.remove('escondite-on');
    return true;
  }
  const activo = () => modo;
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
    jugando = true; t = 0; pintar();
    if (G.ui && G.ui.toast) G.ui.toast(en() ? 'Hide-and-seek! Find the chicks. The peep gets louder when you are close.' : '¡Escondite! Encuentra a los pichones. El pío se oye más fuerte cerca.', 2800);
    return sitios;
  }
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
    if (quien && mejorD < 22) {
      pio = Math.max(0, 1 - mejorD / 22);
      if (G.audio && G.audio.play && Math.floor(t * 2) !== Math.floor((t - dt) * 2)) {
        try { G.audio.play('pio_escondite', pio); } catch (e) { /* */ }
      }
      if (mejorD < 2.4) { quien.hallado = true; gag(); try { G.fx.burst(quien.x, quien.y + 0.5, quien.z, 'gold', 10); } catch (e) { /* */ } pintar(); if (modo) pintarHud(); }
    }
    let todos = true;
    for (const s of sitios) if (!s.hallado) { todos = false; break; }
    if (todos) {
      jugando = false; malla.visible = false;
      if (mejor == null || t < mejor) { mejor = t; try { localStorage.setItem(CLAVE, JSON.stringify({ v: 1, mejor })); } catch (e) { /* */ } }
      G.emit('record', { modo: 'escondite', segundos: t });
      if (!modo && G.ui && G.ui.toast) G.ui.toast(en() ? 'You found them!' : '¡Los encontraste!', 2000);
      if (modo) { resultado = txt('¡Los 3 en ' + reloj(t) + '!', 'All 3 in ' + reloj(t) + '!'); ponerPichones(); pintarHud(); }
    } else if (t >= LIMITE) {
      jugando = false; malla.visible = false;
      if (!modo && G.ui && G.ui.toast) G.ui.toast(en() ? 'They hid again. Another round whenever you want.' : 'Se escondieron otra vez. Cuando quieras, otra ronda.', 2200);
      if (modo) { resultado = txt('Se escondieron otra vez', 'They hid again'); ponerPichones(); pintarHud(); }
    }
  }
  G.on('update', dt => { if (!G.quiet) paso(Math.min(0.05, dt || 0)); });
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
      ok('T56 · al encontrarlos, el HUD dice el tiempo y ofrece «Otra vez»', !jugando && /¡Los 3 en/.test(hudEl.textContent) && !hudEl.querySelector('[data-a="otra"]').hidden, hudEl.textContent);
      salir();
      ok('T56 · «Salir» lo quita todo (HUD, clase, pichones)', !modo && hudEl.hidden && !document.body.classList.contains('escondite-on') && pich.chs.every(ch => !ch.root.visible));
      mejor = mejor0;
    } catch (e) { ok('sin excepciones', false, e && e.message); }
    jugando = false; malla.visible = false; malla.count = 0; G.quiet = q; S.pos.x = px; S.pos.z = pz;
    return { passed: results.filter(r => r.ok).length, total: results.length, results };
  }
  const pendientes = () => (jugando ? sitios.filter(s0 => !s0.hallado).map(s0 => ({ x: s0.x, y: s0.y, z: s0.z })) : []); // T60: para el Ojo de cotorra
  G.escondite = { empezar, paso, test, cerca, jugar, salir, activo, pendientes, get mejor() { return mejor; }, _pich: () => ({ listos: pich.listos, n: pich.chs.length, vis: pich.chs.map(c => c.root.visible), pos: pich.chs.map(c => [c.root.position.x, c.root.position.y, c.root.position.z].map(v => +v.toFixed(1))), esc: pich.chs.map(c => +c.root.scale.x.toFixed(3)) }) };
  return G.escondite;
};
