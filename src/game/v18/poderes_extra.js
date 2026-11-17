/* Juego · T42 · Más poderes de Vittata para explorar (Kelvin 15-nov: «2 o 3 nuevos además del Grito del Yunque; cada uno se
   gana jugando, tiene su efecto visual y su botón claro en el teléfono, y no se compra»).
   Tres poderes de exploración, solo animación y efectos que ya existen (G.fx), sin modelos nuevos ni personajes:
   - Ráfaga de viento: volando, un empujón de viento hacia delante (0,6 s); en el suelo, sopla hojas y polvo delante.
     Se gana con el primer «¡Remonte!» (juice.js: nivelar tras un picado).
   - Ojo de cotorra: lo que se puede usar o recoger cerca (25 m, hasta 6 cosas) brilla con pulsos dorados.
     Se gana con 3 hallazgos del Diario (S.field).
   - Planeo largo: 8 s planeando sin apenas perder altura (glideSink × 0,3 de fisica.js; vuelve sola).
     Se gana con 2 «¡Aterrizaje perfecto!» (juice.js).
   Lo ganado se guarda en el progreso V18 (G.v18.mundo('poder_rafaga' | 'poder_ojo' | 'poder_planeo') = 1).
   Entrada: teclado H (Ráfaga), Y (Ojo) y N (Planeo), solo explorando y si esa tecla no está asignada a otra acción
   (src/engine/input.js); táctil: un botón redondo por poder ganado, encima del botón «Tu poder» (explorar.js).
   No es canon nuevo: son poderes de juego de Vittata; los dones de mentora (Lilacina, Oratrix) siguen siendo de Kelvin.
   Solo con la bandera V18 (boot.js lo carga tras explorar.js). Prueba: AV.v18PoderesExtraTest().
   E18 · Súper planeo (combinar poderes, TAREAS_WEB E18): la Ráfaga durante un Planeo largo (o el Planeo justo en el empujón de
   una Ráfaga) da un súper planeo: empujón más largo (14 m/s durante 1,2 s), el hundimiento baja al 12 % durante 6 s, el planeo
   dura 4 s más (tope 12 s) y deja una estela de chispas doradas y plumas. Sin poderes nuevos: son los dos que ya existen, con sus
   sonidos (poder_rafaga / poder_planeo). La primera vez que se usa el Planeo teniendo la Ráfaga sale una pista corta («Ahora,
   Ráfaga…», mundo.superplaneo_pista) y el primer súper planeo lo explica (mundo.superplaneo = veces). En el teléfono, el botón de
   la Ráfaga brilla mientras dura un Planeo largo. Con «Reducir movimiento», la estela es más rala y sin onda. Textos EN en en.js. */
window.AVV18PoderesExtra = function (G) {
  'use strict';
  if (G.v18extra) return G.v18extra;
  const S = G.S, TACTIL = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  const H = (x, z) => G.terreno.height(x, z);
  const en = () => !!(G.idioma && G.idioma.activo && G.idioma.activo());
  const L = (es, eng) => (en() ? eng : es);
  const P = {
    rafaga: { clave: 'poder_rafaga', tecla: 'h', cd: 6, nombre: ['Ráfaga de viento', 'Wind gust'], corto: ['Ráfaga', 'Gust'], icono: 'dash',
      gana: ['¡Nuevo poder: Ráfaga de viento! Volando te empuja hacia delante; en el suelo sopla las hojas.', 'New power: Wind gust! Flying, it pushes you forward; on the ground, it blows the leaves.'] },
    ojo: { clave: 'poder_ojo', tecla: 'y', cd: 12, nombre: ['Ojo de cotorra', 'Parrot eye'], corto: ['Ojo', 'Eye'], icono: 'sparkle',
      gana: ['¡Nuevo poder: Ojo de cotorra! Hace brillar lo que puedes usar o recoger cerca.', 'New power: Parrot eye! It makes what you can use or pick up nearby shine.'] },
    planeo: { clave: 'poder_planeo', tecla: 'n', cd: 20, dura: 8, nombre: ['Planeo largo', 'Long glide'], corto: ['Planeo', 'Glide'], icono: 'feather',
      gana: ['¡Nuevo poder: Planeo largo! Volando, planeas mucho rato sin bajar.', 'New power: Long glide! While flying, you glide a long time without dropping.'] }
  };
  const IDS = Object.keys(P);
  const cd = { rafaga: 0, ojo: 0, planeo: 0 };
  const est = { empuje: null, planeoT: 0, sink0: null, n: { rafaga: 0, ojo: 0, planeo: 0 }, ultimoOjo: 0, superT: 0, estelaT: 0, nSuper: 0 };
  // E18: el súper planeo (Ráfaga + Planeo largo)
  const SUPER = { dura: 6, sink: 0.12, empuje: 14, empujeT: 1.2, extra: 4, tope: 12, estela: 0.12, estelaRed: 0.35 };
  const T = s => { try { return G.idioma && G.idioma.tr ? G.idioma.tr(s) : s; } catch (e) { return s; } }; // inglés en content/cap1/en.js
  const reducido = () => !!(G.renderer && G.renderer.REDUCED);
  const sonar = n => { try { if (!G.quiet && G.audio && G.audio.has && G.audio.has(n)) G.audio.play(n); } catch (e) { /* sin audio */ } };
  const toast = (t, ms) => { try { if (!G.quiet && G.ui && G.ui.toast) G.ui.toast(t, ms || 3600); } catch (e) { /* sin ui */ } };
  const mundo = k => { try { return Number(G.v18 && G.v18.mundo && G.v18.mundo(k)) || 0; } catch (e) { return 0; } };
  const tiene = id => mundo(P[id].clave) > 0;
  function ganar(id, callado) {
    if (tiene(id) || !G.v18 || !G.v18.cambiarMundo) return false;
    G.v18.cambiarMundo(P[id].clave, 1);
    if (!callado) { toast(L(P[id].gana[0], P[id].gana[1]) + (TACTIL ? '' : ' (' + P[id].tecla.toUpperCase() + ')'), 5200); sonar('unlock'); try { G.fx.burst(S.pos.x, S.pos.y + 1.4, S.pos.z, 'gold', 12); } catch (e) { /* sin fx */ } }
    pintar(true);
    return true;
  }
  // Explorando de verdad: sin encuentro (duelo, minijuego…), sin tarjeta ni diálogo, sin portada
  function libre() {
    try {
      if (G.ui && G.ui.busy && G.ui.busy()) return false;
      const m = G.interaccion && G.interaccion.modo; if (m && m.activo && m.activo()) return false;
      if (G.pausa && G.pausa.activa && G.pausa.activa()) return false;
      const tp = document.getElementById('title'); if (tp && tp.open) return false;
      return true;
    } catch (e) { return false; }
  }
  const mirada = () => { const f = S.facing || { x: 0, z: 1 }, n = Math.hypot(f.x, f.z) || 1; return { x: f.x / n, z: f.z / n }; };

  // ---------- Efectos ----------
  const FX = {
    rafaga() {
      const d = mirada(), M = G.fisica.MOVE;
      for (let k = 1; k <= 3; k++) { const x = S.pos.x + d.x * k * 2, z = S.pos.z + d.z * k * 2, y = M.flying ? S.pos.y + 0.6 : H(x, z) + 0.4; G.fx.burst(x, y, z, 'leaves', 6); G.fx.burst(x, y, z, 'dust', 4); }
      G.fx.ringFx(S.pos.x, S.pos.y + 0.6, S.pos.z, 2.2, 0.4, 0.5);
      if (M.flying) est.empuje = { x: d.x * 10, z: d.z * 10, t: 0.6 };
      sonar('poder_rafaga');
      if (M.flying && est.planeoT > 0 && est.superT <= 0) superPlaneo(); // E18: Ráfaga durante un Planeo largo
      return true;
    },
    ojo() {
      const cosas = [];
      try { for (const it of G.interaccion.list) { if (it.visible && !it.visible()) continue; const dd = Math.hypot(it.x - S.pos.x, it.z - S.pos.z); if (dd < 25) cosas.push({ it, dd }); } } catch (e) { /* sin interacción */ }
      cosas.sort((a, b) => a.dd - b.dd);
      // T60: jugando al Escondite, los pichones que faltan van primero (hasta 40 m): el Ojo los hace brillar
      try { const E = G.escondite; if (E && E.activo && E.activo() && E.pendientes) E.pendientes().filter(p => Math.hypot(p.x - S.pos.x, p.z - S.pos.z) < 40).reverse().forEach(p => cosas.unshift({ it: { x: p.x, z: p.z, y: p.y }, dd: 0, pichon: true })); } catch (e) { /* sin escondite */ }
      const sel = cosas.slice(0, 6);
      for (const c of sel) { const y = c.pichon ? c.it.y + 0.6 : H(c.it.x, c.it.z) + 1.1; pulsos.push({ x: c.it.x, y, z: c.it.z, k: 0, veces: 4, t: 0 }); G.fx.ringFx(c.it.x, y, c.it.z, 1.4, 0.8, 0.6); }
      G.fx.ringFx(S.pos.x, S.pos.y + 0.4, S.pos.z, 3, 1, 0.5);
      est.ultimoOjo = sel.length;
      if (!sel.length) toast(L('El Ojo de cotorra no ve nada cerca.', 'The Parrot eye sees nothing nearby.'), 2400);
      sonar('poder_ojo');
      return true;
    },
    planeo() {
      const T = G.fisica.TUNING;
      if (!G.fisica.MOVE.flying) { toast(L('El Planeo largo se usa volando.', 'Use the Long glide while flying.'), 2400); return false; }
      if (est.sink0 == null) est.sink0 = T.glideSink;
      T.glideSink = est.sink0 * 0.3; est.planeoT = P.planeo.dura;
      G.fx.burst(S.pos.x, S.pos.y + 1, S.pos.z, 'feathers', 12);
      sonar('poder_planeo');
      if (est.empuje && est.empuje.t > 0 && est.superT <= 0) superPlaneo(); // E18: el Planeo justo en el empujón de una Ráfaga
      else pista();
      return true;
    }
  };
  const pulsos = [];
  // E18 · Súper planeo: los dos poderes juntos (no es un poder nuevo). Más alcance, estela y su aviso la primera vez
  function superPlaneo() {
    const TU = G.fisica.TUNING, d = mirada(), red = reducido();
    if (est.sink0 == null) est.sink0 = TU.glideSink;
    TU.glideSink = est.sink0 * SUPER.sink;
    est.planeoT = Math.min(Math.max(est.planeoT, 0) + SUPER.extra, SUPER.tope);
    est.superT = SUPER.dura; est.estelaT = 0; est.nSuper++;
    if (est.empuje) { est.empuje.x = d.x * SUPER.empuje; est.empuje.z = d.z * SUPER.empuje; est.empuje.t = SUPER.empujeT; }
    else est.empuje = { x: d.x * SUPER.empuje, z: d.z * SUPER.empuje, t: SUPER.empujeT };
    try { G.fx.burst(S.pos.x, S.pos.y + 1, S.pos.z, 'gold', red ? 6 : 16); if (!red) G.fx.ringFx(S.pos.x, S.pos.y + 0.8, S.pos.z, 3.2, 0.6, 0.6); } catch (e) { /* sin fx */ }
    const veces = mundo('superplaneo');
    try { if (G.v18 && G.v18.cambiarMundo) G.v18.cambiarMundo('superplaneo', Math.min(veces + 1, 9999)); } catch (e) { /* sin progreso */ }
    toast(veces ? T('¡Súper planeo!') : T('¡Súper planeo! Ráfaga + Planeo largo: vuelas mucho más lejos.'), veces ? 1800 : 5200);
    try { G.emit('v18superplaneo', { veces: veces + 1 }); } catch (e) { /* */ }
    return true;
  }
  // La pista, una sola vez: el primer Planeo largo teniendo la Ráfaga, si aún no se ha hecho ningún súper planeo
  function pista() {
    if (!tiene('rafaga') || mundo('superplaneo') > 0 || mundo('superplaneo_pista') > 0 || !G.v18 || !G.v18.cambiarMundo) return false;
    G.v18.cambiarMundo('superplaneo_pista', 1);
    toast(TACTIL ? T('Ahora pulsa Ráfaga: ¡súper planeo!') : T('Ahora pulsa Ráfaga (H): ¡súper planeo!'), 3600);
    return true;
  }
  function usar(id, forzar) {
    if (!P[id] || (!forzar && (!tiene(id) || !libre() || cd[id] > 0))) return false;
    const r = FX[id]();
    if (r) { cd[id] = P[id].cd; est.n[id]++; try { G.emit('v18poder', { id: 'extra_' + id, de: 'jugador', explorando: true }); } catch (e) { /* */ } }
    pintar(true);
    return r;
  }
  function terminarPlaneo() { if (est.sink0 != null) { G.fisica.TUNING.glideSink = est.sink0; est.sink0 = null; } est.planeoT = 0; est.superT = 0; }

  // ---------- Se ganan jugando ----------
  function revisar() {
    const J = G.juice && G.juice.stats;
    if (!tiene('rafaga') && J && J.remontes > 0) ganar('rafaga');
    if (!tiene('ojo') && Array.isArray(S.field) && S.field.length >= 3) ganar('ojo');
    if (!tiene('planeo') && J && J.perfectos >= 2) ganar('planeo');
  }

  // ---------- Entrada ----------
  const ocupada = k => { try { const m = G.input && G.input.mapa; return !!m && Object.keys(m).some(a => m[a] === k); } catch (e) { return false; } };
  function tecla(e) {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.nodeName))) return;
    const k = (e.key || '').toLowerCase(), id = IDS.find(i => P[i].tecla === k);
    if (!id || ocupada(k) || !tiene(id) || !libre()) return;
    if (G.construir && G.construir.activo && G.construir.activo()) return;
    usar(id);
  }
  addEventListener('keydown', tecla);

  // ---------- Botones táctiles: uno por poder ganado, en columna encima de «Tu poder» ----------
  let caja = null;
  function css() {
    if (document.getElementById('v18-extra-css')) return;
    const st = document.createElement('style'); st.id = 'v18-extra-css';
    // En fila, a la izquierda de «Tu poder» y a su altura: en columna tapaban Diario, Gestos y la Pausa
    st.textContent = '#v18-extra{position:fixed;z-index:70;display:flex;flex-direction:row-reverse;gap:6px;align-items:flex-end;pointer-events:none}#v18-extra[hidden]{display:none}' +
      '#v18-extra button{pointer-events:auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;width:56px;height:56px;padding:2px;border-radius:18px;border:2px solid #fff3d6;background:rgba(18,44,32,.82);color:#fff;font:700 11px/1 Fredoka,system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.35);touch-action:none}' +
      '#v18-extra button{--icon-size:22px}#v18-extra button.cd{opacity:.5}#v18-extra button.activo{box-shadow:0 0 0 3px #ffd27a,0 2px 8px rgba(0,0,0,.35)}' +
      '#v18-extra button.combo{opacity:1;box-shadow:0 0 0 3px #8fe3ff,0 0 14px #8fe3ff;animation:v18-combo 0.9s ease-in-out infinite alternate}' + // E18: «¡ahora, Ráfaga!»
      '@keyframes v18-combo{to{box-shadow:0 0 0 3px #8fe3ff,0 0 4px #8fe3ff}}@media (prefers-reduced-motion: reduce){#v18-extra button.combo{animation:none}}';
    document.head.appendChild(st);
  }
  function pintar(forzar) {
    if (!TACTIL) return;
    const ganados = IDS.filter(tiene);
    if (!caja && !ganados.length) return;
    if (!caja) {
      css(); caja = document.createElement('div'); caja.id = 'v18-extra'; caja.hidden = true;
      caja.addEventListener('pointerdown', e => { const b = e.target.closest && e.target.closest('button[data-extra]'); if (!b) return; e.preventDefault(); e.stopPropagation(); usar(b.dataset.extra); });
      document.body.appendChild(caja);
    }
    const clave = ganados.join(',') + (en() ? '|en' : '|es');
    if (forzar || caja.dataset.k !== clave) {
      caja.dataset.k = clave;
      caja.innerHTML = ganados.map(id => `<button type="button" data-extra="${id}" data-icon="${P[id].icono}" aria-label="${L(P[id].nombre[0], P[id].nombre[1])}"><span></span></button>`).join('');
      caja.querySelectorAll('button').forEach(b => { b.lastChild.textContent = L(P[b.dataset.extra].corto[0], P[b.dataset.extra].corto[1]); });
    }
  }
  let pintT = 0, revT = 0;
  function paso(dt) {
    for (const id of IDS) if (cd[id] > 0) cd[id] = Math.max(0, cd[id] - dt);
    if (est.empuje && est.empuje.t > 0) { S.pos.x += est.empuje.x * dt; S.pos.z += est.empuje.z * dt; est.empuje.t -= dt; if (est.empuje.t <= 0) est.empuje = null; }
    if (est.planeoT > 0) {
      est.planeoT -= dt;
      if (Math.random() < dt * 6) try { G.fx.burst(S.pos.x, S.pos.y + 0.8, S.pos.z, 'feathers', 1); } catch (e) { /* */ }
      if (est.superT > 0) { // E18: estela del súper planeo (a ritmo fijo, no por cuadro); al acabar, vuelve al Planeo largo normal
        est.superT -= dt; est.estelaT -= dt;
        if (est.estelaT <= 0) {
          const red = reducido(); est.estelaT = red ? SUPER.estelaRed : SUPER.estela;
          const f = mirada(), x = S.pos.x - f.x * 0.8, z = S.pos.z - f.z * 0.8;
          try { G.fx.burst(x, S.pos.y + 0.7, z, 'gold', red ? 1 : 3); if (!red) G.fx.burst(x, S.pos.y + 0.7, z, 'feathers', 1); } catch (e) { /* */ }
        }
        if (est.superT <= 0) { est.superT = 0; if (est.sink0 != null) G.fisica.TUNING.glideSink = est.sink0 * 0.3; }
      }
      if (est.planeoT <= 0 || !G.fisica.MOVE.flying) terminarPlaneo();
    }
    for (let i = pulsos.length - 1; i >= 0; i--) {
      const p = pulsos[i]; p.t += dt;
      if (p.t >= p.k * 0.7 && p.k < p.veces) { try { G.fx.burst(p.x, p.y, p.z, 'gold', 8); } catch (e) { /* */ } p.k++; }
      if (p.k >= p.veces) pulsos.splice(i, 1);
    }
    if ((revT -= dt) <= 0) { revT = 1; revisar(); }
    if (TACTIL && (pintT -= dt) <= 0) {
      pintT = 0.15; pintar(false);
      if (caja) {
        const pod = document.getElementById('v18-exp-poder'), rp = pod && !pod.hidden && pod.getBoundingClientRect();
        const ver = !!(rp && rp.height) && libre();
        if (caja.hidden === ver) caja.hidden = !ver;
        if (ver) {
          const bo = Math.round(window.innerHeight - rp.bottom) + 'px', de = Math.round(window.innerWidth - rp.left + 8) + 'px';
          if (caja.style.bottom !== bo) caja.style.bottom = bo; if (caja.style.right !== de) caja.style.right = de;
          const combo = est.planeoT > 0 && est.superT <= 0 && cd.rafaga <= 0; // E18: la Ráfaga brilla mientras dura un Planeo largo
          for (const b of caja.children) { const id = b.dataset.extra; b.classList.toggle('cd', cd[id] > 0); b.classList.toggle('activo', id === 'planeo' && est.planeoT > 0); b.classList.toggle('combo', id === 'rafaga' && combo); }
        }
      }
    }
  }
  G.on('update', dt => paso(dt || 0));

  // ---------- Prueba ----------
  async function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const V = G.v18, M = G.fisica.MOVE, T = G.fisica.TUNING;
    const guard = { pos: { x: S.pos.x, y: S.pos.y, z: S.pos.z }, facing: S.facing, flying: M.flying, sink: T.glideSink, quiet: G.quiet, field: S.field, mundo: IDS.map(id => mundo(P[id].clave)), juice: G.juice,
      superMundo: [mundo('superplaneo'), mundo('superplaneo_pista')], reducido: G.renderer ? G.renderer.REDUCED : null };
    G.quiet = true;
    try {
      if (!V || !V.cambiarMundo) { check('Sin progreso V18 no hay poderes extra (se cargan con la bandera)', true); return { results: out }; }
      for (const id of IDS) V.cambiarMundo(P[id].clave, 0);
      check('Al empezar no se tiene ninguno y no se pueden usar', IDS.every(id => !tiene(id) && !usar(id)));
      // Se ganan jugando
      G.juice = { stats: { remontes: 1, perfectos: 0 } }; S.field = []; revisar();
      check('Ráfaga: se gana con el primer «¡Remonte!»', tiene('rafaga') && !tiene('ojo') && !tiene('planeo'));
      S.field = ['a', 'b', 'c']; revisar();
      check('Ojo de cotorra: se gana con 3 hallazgos del Diario', tiene('ojo') && !tiene('planeo'));
      G.juice = { stats: { remontes: 1, perfectos: 2 } }; revisar();
      check('Planeo largo: se gana con 2 aterrizajes perfectos', tiene('planeo'));
      // Ráfaga
      S.facing = { x: 1, z: 0 }; M.flying = true; cd.rafaga = 0; const x0 = S.pos.x;
      const r1 = usar('rafaga', true); for (let i = 0; i < 10; i++) paso(0.1);
      check('Ráfaga volando: empuja hacia delante (unos 6 m) y luego espera su recarga', r1 && S.pos.x - x0 > 4 && S.pos.x - x0 < 8 && !est.empuje && cd.rafaga > 0, (S.pos.x - x0).toFixed(2));
      S.pos.x = guard.pos.x; S.pos.z = guard.pos.z;
      // Ojo
      const it = G.interaccion.add({ id: 't42_ojo', x: S.pos.x + 5, z: S.pos.z, r: 1, label: () => 'prueba', action: () => {} });
      pulsos.length = 0; const r2 = usar('ojo', true);
      check('Ojo de cotorra: lo usable cercano brilla con pulsos dorados (hasta 6)', r2 && est.ultimoOjo >= 1 && est.ultimoOjo <= 6 && pulsos.some(p => Math.abs(p.x - (S.pos.x + 5)) < 0.01), est.ultimoOjo);
      try { if (G.interaccion.remove) G.interaccion.remove('t42_ojo'); else { const i = G.interaccion.list.indexOf(it); if (i >= 0) G.interaccion.list.splice(i, 1); } } catch (e) { /* */ }
      // Planeo largo
      M.flying = false; const sinVolar = usar('planeo', true);
      M.flying = true; const r3 = usar('planeo', true), bajo = T.glideSink;
      for (let i = 0; i < 90; i++) paso(0.1);
      check('Planeo largo: solo volando; baja el hundimiento al 30 % y a los 8 s vuelve solo', !sinVolar && r3 && Math.abs(bajo - guard.sink * 0.3) < 1e-9 && T.glideSink === guard.sink && est.planeoT <= 0, bajo + ' → ' + T.glideSink);
      // T52: cada poder suena su efecto de Suno al usarse (espía de G.audio.play; sin doblar con el aleteo, ring o unlock de antes)
      if (G.audio && G.audio.play) {
        const play0 = G.audio.play, oidos = [], ui0 = G.ui && G.ui.toast;
        G.audio.play = function (n) { oidos.push(n); };
        try {
          G.quiet = false; if (ui0) G.ui.toast = () => {};
          M.flying = true; for (const id of IDS) { cd[id] = 0; usar(id, true); }
        } finally { G.audio.play = play0; if (ui0) G.ui.toast = ui0; G.quiet = true; terminarPlaneo(); est.empuje = null; pulsos.length = 0; }
        const has = n => !G.audio.has || G.audio.has(n);
        check('T52: usar Ráfaga, Ojo y Planeo suena poder_rafaga, poder_ojo y poder_planeo (uno cada uno, sin otro sonido encima)',
          oidos.join() === ['poder_rafaga', 'poder_ojo', 'poder_planeo'].filter(has).join() && ['poder_rafaga', 'poder_ojo', 'poder_planeo'].every(has), oidos.join());
      }
      { // E18 · Súper planeo: Ráfaga + Planeo largo (con la pista y el aviso de la primera vez, alcance, estela y «Reducir movimiento»)
        const avisos = [], ui0 = G.ui && G.ui.toast, burst0 = G.fx.burst, ring0 = G.fx.ringFx, play0 = G.audio && G.audio.play, R = G.renderer;
        let chispas = 0, ondas = 0;
        const limpio = () => { terminarPlaneo(); est.empuje = null; for (const id of IDS) cd[id] = 0; };
        const correr = sg => { for (let i = 0; i < Math.round(sg * 10); i++) paso(0.1); };
        try {
          G.quiet = false; if (G.ui) G.ui.toast = t => { avisos.push(String(t)); }; if (play0) G.audio.play = () => {};
          G.fx.burst = function (x, y, z, k, n) { if (k === 'gold') chispas += n || 0; return burst0.apply(this, arguments); };
          G.fx.ringFx = function (x, y, z, size) { if (size === 3.2) ondas++; return ring0.apply(this, arguments); };
          if (R) R.REDUCED = false;
          V.cambiarMundo('superplaneo', 0); V.cambiarMundo('superplaneo_pista', 0); limpio();
          S.facing = { x: 1, z: 0 }; M.flying = true; S.pos.x = guard.pos.x; S.pos.z = guard.pos.z;
          // La pista: el primer Planeo largo teniendo la Ráfaga, una sola vez
          usar('planeo', true); const pista1 = avisos.slice(); limpio(); usar('planeo', true); const pista2 = avisos.length;
          check('E18 · La primera vez que planeas teniendo la Ráfaga sale una pista corta, y solo esa vez', pista1.length === 1 && /Ráfaga/.test(pista1[0]) && /súper planeo/.test(pista1[0]) && pista1[0].length < 60 && pista2 === 1 && mundo('superplaneo_pista') === 1, pista1.join(' | '));
          // Ráfaga durante un Planeo largo → súper planeo
          avisos.length = 0; const x0 = S.pos.x, pt0 = est.planeoT, sinkPlaneo = T.glideSink;
          const ok1 = usar('rafaga', true);
          const enSuper = { superT: est.superT, sink: T.glideSink, planeoT: est.planeoT, veces: mundo('superplaneo'), onda: ondas };
          check('E18 · Ráfaga durante un Planeo largo da un súper planeo: hunde menos (12 %), dura 4 s más y se apunta', ok1 && enSuper.superT > 5.9 && Math.abs(enSuper.sink - guard.sink * 0.12) < 1e-9 && enSuper.sink < sinkPlaneo && enSuper.planeoT > pt0 + 3.9 && enSuper.veces === 1 && enSuper.onda === 1, JSON.stringify(enSuper));
          check('E18 · El primer súper planeo lo explica con un aviso', avisos.length === 1 && /¡Súper planeo! Ráfaga \+ Planeo largo/.test(avisos[0]), avisos.join(' | '));
          correr(1.5); const avance = S.pos.x - x0;
          check('E18 · Más alcance: el empujón del súper planeo lleva mucho más lejos que la Ráfaga sola (unos 6 m)', avance > 14 && avance < 20, avance.toFixed(2));
          chispas = 0; correr(1); const estela = chispas;
          check('E18 · Deja una estela de chispas mientras dura (a ritmo fijo, no por cuadro)', estela >= 12 && estela <= 20, estela);
          correr(4); const fin = { superT: est.superT, sink: T.glideSink, planeoT: est.planeoT };
          check('E18 · Al acabar el súper planeo sigue el Planeo largo normal (30 %) hasta su final, y luego todo vuelve', fin.superT === 0 && Math.abs(fin.sink - guard.sink * 0.3) < 1e-9 && fin.planeoT > 0 && (correr(7), T.glideSink === guard.sink && est.planeoT <= 0), JSON.stringify(fin));
          // Las siguientes veces: aviso corto, sin pista
          limpio(); avisos.length = 0; usar('planeo', true); usar('rafaga', true);
          check('E18 · Las siguientes veces el aviso es corto y no vuelve la pista', mundo('superplaneo') === 2 && avisos.join('|') === '¡Súper planeo!', avisos.join(' | '));
          // El Planeo justo en el empujón de una Ráfaga también vale (los dos a la vez)
          limpio(); usar('rafaga', true); usar('planeo', true);
          check('E18 · Activarlos juntos (Planeo en el empujón de la Ráfaga) también da el súper planeo', est.superT > 5.9 && mundo('superplaneo') === 3 && Math.abs(T.glideSink - guard.sink * 0.12) < 1e-9, est.superT);
          limpio(); usar('rafaga', true); correr(1); usar('planeo', true);
          check('E18 · Sin la Ráfaga reciente, el Planeo largo es el normal', est.superT === 0 && Math.abs(T.glideSink - guard.sink * 0.3) < 1e-9 && mundo('superplaneo') === 3);
          // Reducir movimiento: estela rala y sin onda
          limpio(); if (R) R.REDUCED = true; ondas = 0; usar('planeo', true); usar('rafaga', true); chispas = 0; correr(1); const rala = chispas;
          check('E18 · Con «Reducir movimiento»: sin onda y la estela es más rala', !R || (ondas === 0 && rala < estela && rala >= 1 && est.superT > 0), 'onda ' + ondas + ' · chispas ' + rala + ' (normal ' + estela + ')');
          // En el teléfono, la Ráfaga brilla mientras dura el Planeo largo
          if (TACTIL) {
            limpio(); usar('planeo', true); pintar(true); const pod = document.getElementById('v18-exp-poder');
            if (caja && pod && !pod.hidden) { pintT = 0; paso(0.01); const br = caja.querySelector('[data-extra="rafaga"]'); check('E18 · Táctil: el botón de la Ráfaga brilla durante el Planeo largo', !!br && br.classList.contains('combo')); }
          }
        } finally {
          limpio(); G.fx.burst = burst0; G.fx.ringFx = ring0; if (play0) G.audio.play = play0; if (ui0) G.ui.toast = ui0; G.quiet = true;
          if (R) R.REDUCED = guard.reducido; S.pos.x = guard.pos.x; S.pos.z = guard.pos.z;
        }
      }
      // Teclas
      { // T60: con el Escondite en marcha, el Ojo hace brillar primero a los pichones que faltan
        const E0 = G.escondite, px = S.pos.x + 12, pz = S.pos.z + 3;
        G.escondite = { activo: () => true, pendientes: () => [{ x: px, y: 5, z: pz }] }; pulsos.length = 0;
        try { usar('ojo', true); } finally { G.escondite = E0; }
        check('T60 · Escondite: el Ojo de cotorra hace brillar al pichón escondido (primero, a su altura)', pulsos.length >= 1 && Math.abs(pulsos[0].x - px) < 0.01 && Math.abs(pulsos[0].y - 5.6) < 0.01, JSON.stringify(pulsos[0]));
      }
      check('Teclas H, Y y N (solo si no están asignadas a otra acción)', ['h', 'y', 'n'].every(k => IDS.some(i => P[i].tecla === k)) && !ocupada('h'));
      // Táctil: un botón por poder ganado, con nombre
      if (TACTIL) { pintar(true); check('Táctil: un botón con nombre por poder ganado', !!caja && caja.querySelectorAll('button[data-extra]').length === 3 && [...caja.querySelectorAll('button')].every(b => b.textContent.trim().length > 1)); }
      check('Nada se compra: sin precio ni tienda en los poderes', IDS.every(id => !('precio' in P[id])));
    } catch (e) { check('Sin errores', false, e && e.message); }
    finally {
      terminarPlaneo(); est.empuje = null; pulsos.length = 0;
      S.pos.x = guard.pos.x; S.pos.y = guard.pos.y; S.pos.z = guard.pos.z; S.facing = guard.facing; M.flying = guard.flying; T.glideSink = guard.sink;
      S.field = guard.field; G.juice = guard.juice; G.quiet = guard.quiet;
      if (V && V.cambiarMundo) { IDS.forEach((id, i) => V.cambiarMundo(P[id].clave, guard.mundo[i])); V.cambiarMundo('superplaneo', guard.superMundo[0]); V.cambiarMundo('superplaneo_pista', guard.superMundo[1]); }
      if (G.renderer && guard.reducido != null) G.renderer.REDUCED = guard.reducido;
      for (const id of IDS) cd[id] = 0;
      if (caja) { caja.remove(); caja = null; }
    }
    return { results: out, passed: out.filter(x => x.ok).length, total: out.length };
  }

  G.v18extra = { usar, tiene, ganar, revisar, P, cd, test };
  return G.v18extra;
};
