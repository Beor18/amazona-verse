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
   Solo con la bandera V18 (boot.js lo carga tras explorar.js). Prueba: AV.v18PoderesExtraTest(). */
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
  const est = { empuje: null, planeoT: 0, sink0: null, n: { rafaga: 0, ojo: 0, planeo: 0 }, ultimoOjo: 0 };
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
      sonar('aleteo');
      return true;
    },
    ojo() {
      const cosas = [];
      try { for (const it of G.interaccion.list) { if (it.visible && !it.visible()) continue; const dd = Math.hypot(it.x - S.pos.x, it.z - S.pos.z); if (dd < 25) cosas.push({ it, dd }); } } catch (e) { /* sin interacción */ }
      cosas.sort((a, b) => a.dd - b.dd);
      const sel = cosas.slice(0, 6);
      for (const c of sel) { const y = H(c.it.x, c.it.z) + 1.1; pulsos.push({ x: c.it.x, y, z: c.it.z, k: 0, veces: 4, t: 0 }); G.fx.ringFx(c.it.x, y, c.it.z, 1.4, 0.8, 0.6); }
      G.fx.ringFx(S.pos.x, S.pos.y + 0.4, S.pos.z, 3, 1, 0.5);
      est.ultimoOjo = sel.length;
      if (!sel.length) toast(L('El Ojo de cotorra no ve nada cerca.', 'The Parrot eye sees nothing nearby.'), 2400);
      sonar('ring');
      return true;
    },
    planeo() {
      const T = G.fisica.TUNING;
      if (!G.fisica.MOVE.flying) { toast(L('El Planeo largo se usa volando.', 'Use the Long glide while flying.'), 2400); return false; }
      if (est.sink0 == null) est.sink0 = T.glideSink;
      T.glideSink = est.sink0 * 0.3; est.planeoT = P.planeo.dura;
      G.fx.burst(S.pos.x, S.pos.y + 1, S.pos.z, 'feathers', 12);
      sonar('unlock');
      return true;
    }
  };
  const pulsos = [];
  function usar(id, forzar) {
    if (!P[id] || (!forzar && (!tiene(id) || !libre() || cd[id] > 0))) return false;
    const r = FX[id]();
    if (r) { cd[id] = P[id].cd; est.n[id]++; try { G.emit('v18poder', { id: 'extra_' + id, de: 'jugador', explorando: true }); } catch (e) { /* */ } }
    pintar(true);
    return r;
  }
  function terminarPlaneo() { if (est.sink0 != null) { G.fisica.TUNING.glideSink = est.sink0; est.sink0 = null; } est.planeoT = 0; }

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
      '#v18-extra button{--icon-size:22px}#v18-extra button.cd{opacity:.5}#v18-extra button.activo{box-shadow:0 0 0 3px #ffd27a,0 2px 8px rgba(0,0,0,.35)}';
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
          for (const b of caja.children) { const id = b.dataset.extra; b.classList.toggle('cd', cd[id] > 0); b.classList.toggle('activo', id === 'planeo' && est.planeoT > 0); }
        }
      }
    }
  }
  G.on('update', dt => paso(dt || 0));

  // ---------- Prueba ----------
  async function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const V = G.v18, M = G.fisica.MOVE, T = G.fisica.TUNING;
    const guard = { pos: { x: S.pos.x, y: S.pos.y, z: S.pos.z }, facing: S.facing, flying: M.flying, sink: T.glideSink, quiet: G.quiet, field: S.field, mundo: IDS.map(id => mundo(P[id].clave)), juice: G.juice };
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
      // Teclas
      check('Teclas H, Y y N (solo si no están asignadas a otra acción)', ['h', 'y', 'n'].every(k => IDS.some(i => P[i].tecla === k)) && !ocupada('h'));
      // Táctil: un botón por poder ganado, con nombre
      if (TACTIL) { pintar(true); check('Táctil: un botón con nombre por poder ganado', !!caja && caja.querySelectorAll('button[data-extra]').length === 3 && [...caja.querySelectorAll('button')].every(b => b.textContent.trim().length > 1)); }
      check('Nada se compra: sin precio ni tienda en los poderes', IDS.every(id => !('precio' in P[id])));
    } catch (e) { check('Sin errores', false, e && e.message); }
    finally {
      terminarPlaneo(); est.empuje = null; pulsos.length = 0;
      S.pos.x = guard.pos.x; S.pos.y = guard.pos.y; S.pos.z = guard.pos.z; S.facing = guard.facing; M.flying = guard.flying; T.glideSink = guard.sink;
      S.field = guard.field; G.juice = guard.juice; G.quiet = guard.quiet;
      if (V && V.cambiarMundo) IDS.forEach((id, i) => V.cambiarMundo(P[id].clave, guard.mundo[i]));
      for (const id of IDS) cd[id] = 0;
      if (caja) { caja.remove(); caja = null; }
    }
    return { results: out, passed: out.filter(x => x.ok).length, total: out.length };
  }

  G.v18extra = { usar, tiene, ganar, revisar, P, cd, test };
  return G.v18extra;
};
