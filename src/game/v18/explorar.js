/* Juego · V18.1 frente D · poderes en exploración (KIMI-150, reparto 1e de la coordinadora).
   Hoy solo el Grito y el Escudo hacen algo fuera del duelo: este módulo implementa la columna «Explorando» de la matriz
   (docs/equipo/V18_MATRIZ_36.md) para los 8 poderes que ya funcionan en el duelo (Quiebro, Lluvia de semillas,
   Ojo del cenote, Ala fuerte, Abanico de colores, Semilla de río, Mirada del Pitón y Ojo de sol) y da salida de
   exploración al Grito y al Escudo. Algo pequeño y visible en el mundo, con efectos que ya existen (G.fx, G.v18fx)
   y sin modelos nuevos. Cada poder se activa explorando con la tecla G o con el botón Poder en táctil.
   - Solo se carga con la bandera V18 (boot.js); sin ella la versión estable no cambia.
   - Respeta a los encuentros: los duelos/peleas consumen la G en fase de captura y este oyente va en burbuja, así que
     solo dispara en exploración libre. Además comprueba el estado de los módulos v18 antes de actuar.
   - Las esperas (cooldown) son las de la matriz (las mismas que en el duelo, vía G.v18hab).
   Prueba: AV.v18ExplorarTest(). */
window.AVV18Explorar = function (G) {
  'use strict';
  if (G.v18explorar) return G.v18explorar;
  const S = G.S, scene = G.renderer.scene, TACTIL = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  const H = (x, z) => G.terreno.height(x, z);
  const cd = {};                 // espera por poder (segundos que quedan), la misma que en el duelo
  let impulso = null;            // Quiebro: esquiva lateral corta
  let lado = 1;                  // alterna el lado del quiebro
  const semillas = [];           // proyectiles visuales (lluvia / semilla de río)
  const pulsos = [];             // ráfagas de fx programadas (ojo del cenote / mirada del pitón)
  let sol = null;                // marca temporal del Ojo de sol para el minimapa
  let sapoLlamado = false;       // la semilla de río llama al sapo una sola vez por lanzamiento
  let enganchado = false;

  // Semilla visual: esfera pequeña compartida (sin modelos nuevos; mismo criterio que combate.js)
  const geoSemilla = new THREE.SphereGeometry(0.15, 8, 6);
  const matSemilla = new THREE.MeshLambertMaterial({ color: new THREE.Color('#7a4a22').convertSRGBToLinear() });

  const sonar = n => { try { if (G.audio && G.audio.has && G.audio.has(n)) G.audio.play(n); } catch (e) { /* sin audio */ } };
  const toast = t => { try { G.ui.toast(t); } catch (e) { /* sin ui */ } };

  // ¿Algún encuentro v18 activo? En ellos la G la consume el propio encuentro (captura) y los fx los mueve su paso().
  const ENCUENTROS = ['v18combate', 'v18duelo2', 'v18amenaza', 'v18sapo', 'v18serpiente', 'v18puerto', 'v18minigolf'];
  function encuentro() {
    try { for (const k of ENCUENTROS) { const m = G[k]; if (m && m.estado && ((m.estado().fase) || 'nada') !== 'nada') return true; } return false; } catch (e) { return false; }
  }
  function libre() {
    if (!G.V18 || encuentro()) return false;
    try { if (G.pausa && G.pausa.activa && G.pausa.activa()) return false; } catch (e) { /* */ }
    try { if (G.ui.overlayOpen() || G.ui.cardOpen || (G.dialogo && G.dialogo.open())) return false; } catch (e) { /* */ }
    return true;
  }
  function especie() {
    try { const v = G.v18 && G.v18.seleccionada && G.v18.seleccionada(); if (v) return v; } catch (e) { /* */ }
    return (S.profile && ((S.profile.look && S.profile.look.species) || S.profile.species)) || 'vittata';
  }

  function lanzarSemilla(vx, vy, vz, vida, botes) {
    const m = new THREE.Mesh(geoSemilla, matSemilla);
    m.position.set(S.pos.x + vx * 0.06, S.pos.y + 1.0, S.pos.z + vz * 0.06); m.castShadow = false; scene.add(m);
    semillas.push({ m, vx, vy, vz, t: 0, vida, botes });
  }
  function pulso(x, y, z, kind, n, veces, intervalo) { pulsos.push({ x, y, z, kind, n, k: 0, veces, t: 0, intervalo: intervalo || 0.7 }); }
  function mirada() { const f = S.facing || { x: 0, z: 1 }; const n = Math.hypot(f.x, f.z) || 1; return { x: f.x / n, z: f.z / n }; }

  // ---------- Efectos de exploración (la columna «Explorando» de la matriz) ----------
  const FX = {
    // Grito del Yunque: la onda sale del pico hacia donde se mira (mismo FX que en el duelo); asusta a la Sombra si está cerca
    grito_yunque(h) {
      try { if (G.v18fx) G.v18fx.onda(null, null, h.alcance || 9); } catch (e) { /* sin fx */ }
      sonar('dash');
      return true;
    },
    // Escudo de plumas: círculo de luz alrededor de Vittata unos segundos
    escudo_plumas(h) {
      try { if (G.v18fx) G.v18fx.escudo(null, h.dura || 4); } catch (e) { /* sin fx */ }
      sonar('unlock');
      return true;
    },
    // Quiebro: esquiva rápida de lado (una ráfaga de impulso), útil para esquivar ramas en el vuelo rasante
    quiebro() {
      lado = -lado; const d = mirada();
      impulso = { x: -d.z * lado * 7.5, z: d.x * lado * 7.5, t: 0.26 };
      G.fx.burst(S.pos.x, S.pos.y + 0.9, S.pos.z, 'feathers', 8);
      sonar('dash');
      return true;
    },
    // Lluvia de semillas: tres semillas en abanico que caen y rebotan (tumba frutas si las tocan)
    lluvia_semillas() {
      const d = mirada(), a0 = Math.atan2(d.z, d.x);
      for (const k of [-1, 0, 1]) { const a = a0 + k * 0.3; lanzarSemilla(Math.cos(a) * 11, 3.2, Math.sin(a) * 11, 2.2, 1); }
      G.fx.burst(S.pos.x, S.pos.y + 1, S.pos.z, 'leaves', 6);
      sonar('dash');
      return true;
    },
    // Ojo del cenote: encuentra lo interactivo más cercano y lo señala con pulsos dorados (agua o secreto bajo tierra)
    ojo_cenote() {
      let best = null, bd = 30;
      try { for (const it of G.interaccion.list) { if (it.visible && !it.visible()) continue; const dx = it.x - S.pos.x, dz = it.z - S.pos.z, d = Math.hypot(dx, dz); if (d < bd) { bd = d; best = it; } } } catch (e) { /* */ }
      if (best) { const y = H(best.x, best.z) + 1; pulso(best.x, y, best.z, 'gold', 10, 3, 0.8); G.fx.ringFx(best.x, y, best.z, 2, 0.9, 0.6); }
      else G.fx.ringFx(S.pos.x, S.pos.y + 0.4, S.pos.z, 3, 1, 0.5);
      sonar('ring');
      return true;
    },
    // Ala fuerte: batida que sopla hojas y polvo a su alrededor (rompe ramas secas que tapan un paso)
    ala_fuerte() {
      G.fx.burst(S.pos.x, S.pos.y + 0.9, S.pos.z, 'feathers', 14);
      G.fx.burst(S.pos.x, S.pos.y + 0.4, S.pos.z, 'leaves', 12);
      G.fx.burst(S.pos.x, S.pos.y + 0.1, S.pos.z, 'dust', 10);
      G.fx.ringFx(S.pos.x, S.pos.y + 0.4, S.pos.z, 2.6, 0.5, 0.5);
      sonar('aleteo');
      return true;
    },
    // Abanico de colores: destellos que asustan a la Maraña cercana (un nodo se suelta solo: cierra los ojos y se encoge)
    abanico_colores() {
      G.fx.burst(S.pos.x, S.pos.y + 1.1, S.pos.z, 'stars', 16);
      G.fx.burst(S.pos.x, S.pos.y + 0.7, S.pos.z, 'gold', 10);
      sonar('unlock');
      try {
        const rs = (G.marana && G.marana.rastros) || []; let best = null, bd = 25;
        for (const r of rs) { if (r.limpio) continue; const d = Math.hypot(r.x - S.pos.x, r.z - S.pos.z); if (d < bd) { bd = d; best = r; } }
        if (best) { best.apertura = 0; best.despierto = false; best.brillo = 0; G.fx.burst(best.x, H(best.x, best.z) + 1, best.z, 'stars', 10); }
      } catch (e) { /* sin maraña */ }
      return true;
    },
    // Semilla de río: una semilla que bota hacia delante; si llega cerca del Sapo Encantado, lo despierta (bota hasta su boca)
    semilla_rio() {
      const d = mirada(); sapoLlamado = false;
      lanzarSemilla(d.x * 9, 3.4, d.z * 9, 3.2, 2);
      G.fx.burst(S.pos.x, S.pos.y + 1, S.pos.z, 'leaves', 5);
      sonar('dash');
      return true;
    },
    // Mirada del Pitón: ve los rastros de la Maraña de lejos (los señala con pulsos aunque estén más allá de su vista normal)
    mirada_piton() {
      let n = 0;
      try {
        const rs = (G.marana && G.marana.rastros) || [];
        for (const r of rs) { if (r.limpio) continue; if (Math.hypot(r.x - S.pos.x, r.z - S.pos.z) > 80) continue; pulso(r.x, H(r.x, r.z) + 1.2, r.z, 'gold', 8, 3, 0.9); n++; }
      } catch (e) { /* sin maraña */ }
      sonar('ring');
      return true;
    },
    // Ojo de sol: marca en el minimapa la cotorra o el objeto más cercano durante unos segundos
    ojo_sol() {
      let best = null, bd = 45;
      try { for (const it of G.interaccion.list) { if (it.visible && !it.visible()) continue; const d = Math.hypot(it.x - S.pos.x, it.z - S.pos.z); if (d < bd) { bd = d; best = it; } } } catch (e) { /* */ }
      if (best) {
        let nombre = 'Algo brilla cerca';
        try { nombre = String(best.label()).replace(/^Acción:\s*/, ''); } catch (e) { /* */ }
        sol = { x: best.x, z: best.z, nombre, hasta: performance.now() + 9000 };
      } else toast('El Ojo de sol no ve nada cercano que marcar.');
      sonar('ring');
      return true;
    }
  };

  // ---------- Disparo ----------
  function disparar(forzarId) {
    if (!forzarId && !libre()) return false;
    const Hx = G.v18hab; if (!Hx) return false;
    const id = forzarId || Hx.poderDe(especie());
    const h = Hx.get(id); if (!h) return false;
    if (!forzarId && (cd[id] || 0) > 0) return false;
    cd[id] = h.cooldown || 5;
    try { G.emit('v18poder', { id, de: 'jugador', explorando: true, origen: { x: S.pos.x, y: S.pos.y, z: S.pos.z } }); } catch (e) { /* sin oyentes */ }
    const fn = FX[id];
    return fn ? !!fn(h) : true;
  }

  // ---------- Entrada: G en exploración (burbuja: los encuentros la consumen antes en captura) ----------
  function tecla(e) {
    if (!enganchado || e.repeat || (e.key || '').toLowerCase() !== 'g' || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.nodeName))) return;
    if (!libre()) return;
    if (G.input && G.input.keys) G.input.keys.delete('g'); // la G es del poder: no inclina la cámara (mismo criterio que QA-173)
    disparar();
  }

  // ---------- Botón Poder en táctil ----------
  let btn = null;
  function boton(crear) {
    if (!TACTIL) return null;
    if (!btn && crear) {
      btn = document.createElement('button');
      btn.id = 'v18-exp-poder'; btn.type = 'button';
      btn.setAttribute('aria-label', 'Poder');
      btn.style.cssText = 'position:fixed;right:14px;bottom:150px;z-index:70;min-height:44px;min-width:44px;padding:8px 13px;border-radius:23px;border:0;background:rgba(18,44,32,.78);color:#fff;font:inherit;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,.35);pointer-events:auto;';
      btn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); disparar(); });
      document.body.appendChild(btn);
    }
    return btn;
  }

  // ---------- Paso ----------
  let accFx = 0, btnT = 0; // segundos durante los que este módulo mueve los fx compartidos tras el último uso
  G.on('update', dt => {
    for (const k in cd) if (cd[k] > 0) cd[k] = Math.max(0, cd[k] - dt);
    if (impulso && impulso.t > 0) { S.pos.x += impulso.x * dt; S.pos.z += impulso.z * dt; impulso.t -= dt; }
    for (let i = semillas.length - 1; i >= 0; i--) {
      const b = semillas[i]; b.t += dt; b.vy -= 14 * dt;
      b.m.position.x += b.vx * dt; b.m.position.y += b.vy * dt; b.m.position.z += b.vz * dt;
      const suelo = G.fisica.suelo(b.m.position.x, b.m.position.z, b.m.position.y + 0.5);
      if (b.m.position.y < suelo + 0.14 && b.vy < 0) {
        if (b.botes > 0) { b.botes--; b.vy = -b.vy * 0.55; b.m.position.y = suelo + 0.15; G.fx.burst(b.m.position.x, suelo + 0.2, b.m.position.z, 'dust', 5); }
        else { scene.remove(b.m); semillas.splice(i, 1); continue; }
      }
      try { // ¿llegó al Sapo Encantado? (semilla de río)
        if (!sapoLlamado && G.v18sapo && G.v18sapo.sitio && G.v18sapo.estado().fase === 'nada') {
          const st = G.v18sapo.sitio;
          if (Math.hypot(b.m.position.x - st.x, b.m.position.z - st.z) < 5) { sapoLlamado = true; G.v18sapo.iniciar({}); }
        }
      } catch (e) { /* sin sapo */ }
      if (b.t > b.vida) { scene.remove(b.m); semillas.splice(i, 1); }
    }
    for (let i = pulsos.length - 1; i >= 0; i--) {
      const p = pulsos[i]; p.t += dt;
      if (p.t >= p.k * p.intervalo && p.k < p.veces) { G.fx.burst(p.x, p.y, p.z, p.kind, p.n); p.k++; }
      if (p.k >= p.veces) pulsos.splice(i, 1);
    }
    if (sol && performance.now() > sol.hasta) sol = null;
    // fx compartidos: solo los movemos en exploración libre (en los encuentros los mueve su propio paso)
    if (accFx > 0) { accFx -= dt; try { if (G.v18fx && !encuentro()) G.v18fx.paso(dt); } catch (e) { /* */ } }
    // botón táctil (CPU, móvil: se revisa cada 0,1 s, no en cada cuadro)
    const b = TACTIL && (btnT -= dt) <= 0 ? boton(G.V18) : null;
    if (b) {
      btnT = 0.1;
      // QA-185 (móvil): encima del grupo de botones (#acts) y oculto cuando el HUD táctil está oculto (intro, diálogos, cómic); antes tapaba Impulso
      const acts = document.getElementById('acts'), ra = acts && acts.getBoundingClientRect();
      const hud = !!(ra && ra.height && getComputedStyle(acts).visibility !== 'hidden');
      const ver = libre() && hud;
      if (b.hidden === ver) b.hidden = !ver;
      if (ver) { const bo = Math.round(innerHeight - ra.top + 10) + 'px', de = Math.max(8, Math.round(innerWidth - ra.right)) + 'px'; if (b.style.bottom !== bo) b.style.bottom = bo; if (b.style.right !== de) b.style.right = de; }
      if (ver) { const nombre = (G.v18hab && G.v18hab.get(G.v18hab.poderDe(especie())) || {}).nombre || 'Poder'; if (b.textContent !== nombre) b.textContent = nombre; }
    }
  });

  function enganchar() { if (enganchado) return; enganchado = true; addEventListener('keydown', tecla); }
  function soltar() { if (!enganchado) return; enganchado = false; removeEventListener('keydown', tecla); }
  enganchar();
  const marcaFx = () => { accFx = 4; };
  for (const k in FX) { const f = FX[k]; FX[k] = h => { const r = f(h); marcaFx(); return r; }; }

  // Marca temporal para el minimapa (lo lee minimapa.js cuando hay bandera)
  const mapa = () => (sol && performance.now() <= sol.hasta ? { x: sol.x, z: sol.z, nombre: sol.nombre } : null);

  // ---------- Prueba ----------
  function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const px = S.pos.x, py = S.pos.y, pz = S.pos.z, q = G.quiet;
    try {
      G.quiet = false;
      // Disparo de cada poder: sin excepciones, con espera puesta
      const ids = ['grito_yunque', 'escudo_plumas', 'quiebro', 'lluvia_semillas', 'ojo_cenote', 'ala_fuerte', 'abanico_colores', 'semilla_rio', 'mirada_piton', 'ojo_sol'];
      for (const id of ids) { cd[id] = 0; const ok = disparar(id); check('Explorando · ' + id + ' dispara y pone su espera', ok && (cd[id] || 0) > 0, 'cd ' + (cd[id] || 0).toFixed(1)); }
      // Quiebro: impulso lateral que mueve a Vittata
      cd.quiebro = 0; disparar('quiebro');
      const movido = impulso && (Math.abs(impulso.x) > 0 || Math.abs(impulso.z) > 0);
      check('Quiebro da impulso de esquiva', movido, impulso && (impulso.x.toFixed(1) + ',' + impulso.z.toFixed(1)));
      impulso = null; S.pos.x = px; S.pos.z = pz;
      // Lluvia: tres semillas en abanico (se limpian las del barrido anterior: la propia prueba las cuenta de nuevo)
      for (const b of semillas) scene.remove(b.m); semillas.length = 0;
      cd.lluvia_semillas = 0; disparar('lluvia_semillas');
      check('Lluvia de semillas lanza 3 semillas', semillas.length === 3, semillas.length);
      for (const b of semillas) scene.remove(b.m); semillas.length = 0;
      // Ojo del cenote: señala lo interactivo más cercano con pulsos
      const it = G.interaccion.add({ id: 'v18exp_test', x: px + 6, z: pz, r: 2, label: () => 'cosa de prueba', use: () => {} });
      cd.ojo_cenote = 0; const np0 = pulsos.length; disparar('ojo_cenote');
      check('Ojo del cenote programa pulsos dorados', pulsos.length > np0, pulsos.length - np0);
      pulsos.length = 0; const i2 = G.interaccion.list.indexOf(it); if (i2 >= 0) G.interaccion.list.splice(i2, 1);
      // Abanico: asusta a la Maraña (cierra el nodo cercano)
      let asusta = true;
      if (G.marana && G.marana.aparecer) {
        const r = G.marana.aparecer({ id: 'v18exp_abanico', x: px + 8, z: pz, inliminable: true, visto: true });
        if (r) { r.despierto = true; r.apertura = 1; cd.abanico_colores = 0; disparar('abanico_colores'); asusta = !r.despierto && r.apertura === 0; G.marana.retirar('v18exp_abanico'); }
      }
      check('Abanico de colores asusta a la Maraña cercana', asusta, '');
      // Semilla de río: bota y, cerca del sapo, lo despierta
      let sapoOk = true;
      if (G.v18sapo && G.v18sapo.sitio) { cd.semilla_rio = 0; disparar('semilla_rio'); sapoOk = semillas.length === 1 && semillas[0].botes === 2; for (const b of semillas) scene.remove(b.m); semillas.length = 0; }
      check('Semilla de río bota hacia delante (2 botes)', sapoOk, '');
      // Mirada del Pitón: señala los rastros de la Maraña en 80 m
      cd.mirada_piton = 0; const nr = (G.marana && G.marana.rastros || []).filter(r => !r.limpio && Math.hypot(r.x - S.pos.x, r.z - S.pos.z) <= 80).length;
      disparar('mirada_piton');
      check('Mirada del Pitón señala los rastros de lejos', nr === 0 ? pulsos.length === 0 : pulsos.length >= Math.min(1, nr), pulsos.length + ' pulsos, ' + nr + ' rastros');
      pulsos.length = 0;
      // Ojo de sol: marca en el minimapa lo más cercano (y caduca)
      const it2 = G.interaccion.add({ id: 'v18exp_test2', x: px + 5, z: pz, r: 2, label: () => 'fruta de prueba', use: () => {} });
      cd.ojo_sol = 0; disparar('ojo_sol');
      const m = mapa();
      check('Ojo de sol marca lo más cercano en el minimapa', !!m && Math.abs(m.x - (px + 5)) < 0.01, m && m.x.toFixed(1));
      if (sol) sol.hasta = 0; sol = null;
      const i3 = G.interaccion.list.indexOf(it2); if (i3 >= 0) G.interaccion.list.splice(i3, 1);
      // Disparo libre: respeta la puerta de encuentro (no dispara dentro de un encuentro v18)
      const stub = G.v18combate, f0 = stub && stub.estado && stub.estado().fase;
      let gateOk = true;
      if (stub && stub.estado) { G.v18combate = { estado: () => ({ fase: 'lucha' }) }; cd.grito_yunque = 0; gateOk = disparar('grito_yunque') === false; G.v18combate = stub; }
      check('En un encuentro v18 no dispara (la G es del encuentro)', gateOk, f0);
      // La G se queda en exploración: el oyente consume la tecla y la quita del set de la cámara
      cd.grito_yunque = 0;
      const ev = new KeyboardEvent('keydown', { key: 'g', code: 'KeyG', bubbles: true, cancelable: true });
      document.body.dispatchEvent(ev);
      check('La G dispara el poder en exploración y no llega a la cámara', (G.input.keys ? !G.input.keys.has('g') : true) && cd.grito_yunque > 0, 'cd ' + cd.grito_yunque.toFixed(1));
    } catch (e) { check('sin excepciones', false, e && e.message); }
    S.pos.x = px; S.pos.y = py; S.pos.z = pz; G.quiet = q; impulso = null; semillas.length = 0; pulsos.length = 0; sol = null;
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }

  G.v18explorar = { disparar, mapa, test, enganchar, soltar, _cd: cd };
  return G.v18explorar;
};
