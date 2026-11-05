/* Juego · V18.1 · primera amenaza de fantasía: la Sombra de Tormenta (KIMI-064; Kelvin 5-nov, docs/DECISION_LOG.md).
   Ficha en docs/equipo/V18_AMENAZAS.md. Es fantasía: un nubarrón que se cree dueño del cielo, no un hecho del clima real.
   - Dónde: sobre el camino de Villa Raíz al puente colgante (G.v18Reparar.P.eje; si no hay puente, junto a la explanada).
   - Cómo se ve (sin modelos nuevos): 1 InstancedMesh de bolas de niebla oscura que giran, 2 ojos amarillos (otro InstancedMesh)
     y destellos de rayo (cambia el color de la niebla). Partículas de fx.js (leaves, dust, stars, gold). 2 draw calls.
   - Comportamiento: flota y deriva; cada pocos segundos AVISA (brilla) y suelta una ráfaga: si Vittata está cerca y sin
     escudo, pierde una pluma de resistencia (5, las del duelo), se marea un momento y sale empujada. Su viento empuja suave.
     Kelvin: «después de recibir un impacto debe moverse o cambiar su patrón; evitar que sea un objetivo inmóvil»:
     cada acierto la manda a otro punto (el más lejos de la jugadora) y cambia de patrón: lenta → rodea → doble ráfaga.
   - Cómo se gana: 3 aciertos bien hechos. Cada especie la juega distinto:
       Vittata (PICO): Grito del Yunque APUNTADO al centro (cono y alcance del motor de habilidades) = 1 acierto.
       Arausiaca (PLUMAS): Escudo de plumas abierto JUSTO cuando suelta la ráfaga = la ráfaga rebota contra ella = 1 acierto.
       Golpe de ala y semilla no le hacen nada (la atraviesan).
   - Premio (una vez): 1 madera + 1 piedra al inventario de siempre (S.inv), el mundo recuerda que se dispersó (G.v18.mundo).
   - Controles: Acción o G = poder; botón en pantalla para táctil. Se sale alejándose (vuelve a empezar llena).
   Solo con la bandera V18. Prueba: AV.v18AmenazaTest(). */
window.AVV18Amenaza = function (G) {
  'use strict';
  if (G.v18amenaza) return G.v18amenaza;
  const S = G.S, H = G.v18hab, V = G.v18, scene = G.renderer.scene;
  const ID = 'sombra_tormenta', ACIERTOS = 3, PLUMAS = 5, PREMIO = { madera: 1, piedra: 1 };
  const R_EMPIEZA = 16, R_SALE = 34, R_RAFAGA = 9, R_VIENTO = 11, ALTO = 5.5; // sobre el agua o el suelo: por encima de las matas, a la altura de vuelo
  const TACTIL = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  const PATRONES = [
    { id: 'lenta', aviso: 1.1, cada: 6.5, rafagas: 1, giro: 0 },
    { id: 'rodea', aviso: 0.95, cada: 5.2, rafagas: 1, giro: 0.45 },
    { id: 'doble', aviso: 0.85, cada: 5.6, rafagas: 2, giro: 0.25 }
  ];
  const TXT = {
    nombre: 'Sombra de Tormenta', empieza: '¡Este cielo es mío!', fin: 'Bueno… el sol también tiene derecho.',
    gana: '¡La Sombra de Tormenta se fue! Ganaste 1 madera y 1 piedra.', ganaOtra: '¡Se fue otra vez! Ya te llevaste sus materiales.',
    acierto: '¡Le diste!', rebota: '¡La ráfaga rebotó en tu escudo!', falla: 'Apunta al centro de la nube.',
    pierde: '¡Uy, te mareaste! Prueba otra vez, o aléjate volando para dejarla.', lejos: 'Te alejaste: la Sombra de Tormenta se queda esperando.',
    cuidado: '¡Cuidado, va a soplar!', atraviesa: 'Eso la atraviesa. ¡Usa tu poder!',
    guiaV: 'Grito: apunta a la nube (Acción o G)', guiaA: 'Escudo: ábrelo cuando sople (Acción o G)', guiaT: 'Toca Poder',
    poder: 'Poder', tu: 'Tú'
  };
  const sonar = (n, a) => { try { G.audio.play(n, a); } catch (e) { /* sin audio */ } };
  const toast = (t, ms) => { try { if (!G.quiet) G.ui.toast(t, ms || 2400); } catch (e) { /* sin interfaz */ } };
  const fx = (k, x, y, z, n) => { try { G.fx.burst(x, y, z, k, n || 8); } catch (e) { /* sin fx */ } };
  const altura = (x, z) => { const h = G.terreno.height(x, z); try { const w = G.agua && G.agua.levelAt ? G.agua.levelAt(x, z) : -Infinity; return Math.max(h, w); } catch (e) { return h; } };
  const emitir = ev => { try { G.emit('v18amenaza', ev); } catch (e) { /* sin oyentes */ } };

  // ---------- Sitio: sobre el camino del lado de Villa Raíz, antes del puente ----------
  function buscarSitio() {
    const R = G.v18Reparar, E = R && R.P && R.P.eje;
    if (E) { // sobre el río, al lado del puente: cielo abierto, se ve y se pelea volando
      const mx = E.ax + E.ux * E.L * 0.5, mz = E.az + E.uz * E.L * 0.5;
      return { x: mx - E.uz * 14, z: mz + E.ux * 14 };
    }
    const c = G.v18combate && G.v18combate.sitio; const pl = G.terreno.places || {}, v = pl.villa || pl.plaza || { x: S.pos.x, z: S.pos.z };
    return c ? { x: c.x - 18, z: c.z + 10 } : { x: v.x + 10, z: v.z + 20 };
  }
  let centro = buscarSitio();
  const ANCLAS = a => [0, 1, 2, 3].map(i => ({ x: centro.x + Math.cos(a + i * Math.PI / 2) * 6, z: centro.z + Math.sin(a + i * Math.PI / 2) * 6 }));

  // ---------- Escena: niebla + ojos (2 InstancedMesh) ----------
  // KIMI-094 (era KIMI-093 en mi rama; ese ID lo tomó Kimi 1 para QA-106 en el mismo rebase): la nube
  // completa (14) costaba ~5 fps en «medio» a CPU ×4 (pedido de Kimi 1, KIMI-088/PEDIDOS);
  // «medio» dibuja la misma densidad que «bajo» (9) y «alto» (escritorio) conserva la nube entera.
  const NIVEL0 = G.renderer.nivel && G.renderer.nivel();
  const NB = G.renderer.REDUCED || NIVEL0 === 'bajo' || NIVEL0 === 'medio' ? 9 : 14;
  // KIMI-087 (pulido visual, sin tocar la lógica): el tono va por instanceColor por bola y el borde es suave
  // con un degradado radial pintado en runtime (0 assets nuevos, ~16 KB en GPU).
  const matNiebla = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.72, depthWrite: false });
  matNiebla.map = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), rg = g.createRadialGradient(32, 32, 2, 32, 32, 31);
    rg.addColorStop(0, 'rgba(255,255,255,0.95)');
    rg.addColorStop(0.45, 'rgba(255,255,255,0.62)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const niebla = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 7), matNiebla, NB);
  const ojos = new THREE.InstancedMesh(new THREE.SphereGeometry(0.32, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffd84a' }), 2);
  for (const m of [niebla, ojos]) { m.frustumCulled = false; m.userData.sinCulling = true; m.castShadow = m.receiveShadow = false; m.visible = false; scene.add(m); }
  niebla.name = 'v18_sombra'; ojos.name = 'v18_sombra_ojos'; niebla.renderOrder = 4;
  const PUFF = Array.from({ length: NB }, (_, i) => ({ a: i / NB * Math.PI * 2, r: 1.2 + (i % 3) * 0.8, y: ((i * 37) % 10) / 10 * 1.6 - 0.6, s: 1.3 + ((i * 53) % 10) / 10 * 1.1, l: 0.62 + ((i * 29) % 10) / 10 * 0.58 }));
  const _o = new THREE.Object3D(), _c = new THREE.Color(), _c2 = new THREE.Color();
  const colBase = new THREE.Color('#2e3552'), colAviso = new THREE.Color('#8fa0d0'), colRayo = new THREE.Color('#fff3b0'), colHaz = new THREE.Color('#fffbe6');

  // ---------- Estado ----------
  const A = { fase: 'nada', t: 0, pos: { x: centro.x, y: altura(centro.x, centro.z) + ALTO, z: centro.z }, ancla: 0, giro: 0, patron: 0,
    aciertos: 0, avisoT: 0, cadaT: 3, pendientes: 0, flash: 0, escala: 1, manual: false, j: null, premio: false, rafagas: 0, ultimo: null };
  const dispersa = () => !!(V && V.mundo(ID) === 'dispersa');
  const especie = () => (V && V.seleccionada && V.seleccionada()) || (S.profile && ((S.profile.look && S.profile.look.species) || S.profile.species)) || 'vittata';
  function nuevoJugador(sp) {
    const j = H.luchador({ id: 'jugador', nombre: TXT.tu, especie: sp || especie(), pos: S.pos, plumas: PLUMAS, plumasMax: PLUMAS, mira: () => S.facing });
    // A la Sombra solo le hacen algo el Grito y el Escudo: con las cotorras nuevas (Quiebro, Lluvia, Ojo, Ala fuerte) se usa el Grito
    if (j.poder !== 'escudo_plumas' && j.poder !== 'grito_yunque') j.poder = 'grito_yunque';
    return j;
  }
  const sombra = { id: 'sombra', pos: A.pos }; // «otro» para el motor de habilidades
  function anclaLejos() {
    const L = ANCLAS(A.giro); let mejor = 0, dm = -1;
    L.forEach((p, i) => { const d = Math.hypot(p.x - S.pos.x, p.z - S.pos.z); if (i !== A.ancla && d > dm) { dm = d; mejor = i; } });
    return mejor;
  }

  // ---------- Contexto para el motor de habilidades (onda, escudo, golpear…) ----------
  const timers = [];
  function ctx() {
    return {
      otro: sombra,
      onda: (o, d, al) => { try { if (G.v18fx) G.v18fx.onda(o, d, al); } catch (e) { /* fx */ } },
      escudo: (f, s) => { try { if (G.v18fx) G.v18fx.escudo(S.pos, s); } catch (e) { /* fx */ } },
      despues: (s, fn) => timers.push({ t: s, fn }),
      fx: (k, x, y, z) => fx(k, x, y, z),
      sonar,
      poder: ev => { try { G.emit('v18poder', Object.assign({ contra: ID }, ev)); } catch (e) { /* */ } },
      lanzar: () => {},
      // El Grito llega a la nube: es un acierto (la nube no tiene plumas que quitar)
      golpear: (blanco, g) => { if (blanco === sombra && g && g.interrumpe) acertar('grito'); return true; }
    };
  }
  function usarPoder() {
    if (A.fase !== 'lucha' || !A.j) return { ok: false, motivo: 'fase' };
    const r = H.usar(A.j, A.j.poder, ctx());
    if (r.ok) { A.j.ultimoPoder = A.j.poder; emitir({ tipo: 'poder', id: A.j.poder }); }
    return r;
  }
  function usarBasico(id) { // golpe de ala o semilla: la atraviesan (pista una vez por encuentro)
    if (A.fase !== 'lucha') return false;
    if (!A.pistaBasico) { A.pistaBasico = true; toast(TXT.atraviesa); }
    fx('leaves', A.pos.x, A.pos.y, A.pos.z, 4); return false;
  }

  // ---------- Aciertos, ráfagas y fin ----------
  // La siguiente ráfaga espera a que el poder vuelva a estar listo (con el Escudo, 7 s de espera, si no era imposible)
  const trasPoder = s => Math.max(s, ((A.j && A.j.cd && A.j.cd[A.j.poder]) || 0) + 0.3);
  function acertar(como) {
    if (A.fase !== 'lucha') return false;
    A.aciertos++; A.flash = 0.35; A.ultimo = como;
    sonar('unlock'); fx('stars', A.pos.x, A.pos.y, A.pos.z, 14);
    emitir({ tipo: 'acierto', como, n: A.aciertos });
    if (A.aciertos >= ACIERTOS) { terminar(true); return true; }
    // Se mueve y cambia de patrón: nunca es un blanco quieto
    A.ancla = anclaLejos(); A.patron = (A.patron + 1) % PATRONES.length;
    A.cadaT = trasPoder(PATRONES[A.patron].cada * 0.8); A.avisoT = 0; A.pendientes = 0;
    flotante((como === 'escudo' ? TXT.rebota : TXT.acierto) + ' ' + A.aciertos + '/' + ACIERTOS);
    return true;
  }
  function rafaga() {
    A.rafagas++;
    const j = A.j, d = Math.hypot(S.pos.x - A.pos.x, S.pos.z - A.pos.z);
    fx('leaves', A.pos.x, A.pos.y - 1, A.pos.z, 16); fx('dust', A.pos.x, A.pos.y - 2, A.pos.z, 10); sonar('viento');
    emitir({ tipo: 'rafaga', d });
    if (!j || d > R_RAFAGA) return 'lejos';
    if (j.escudo > 0) { // el escudo la para; con el Escudo de plumas, la devuelve (acierto)
      try { if (G.v18fx && G.v18fx.dispersar) G.v18fx.dispersar(S.pos); } catch (e) { /* fx */ }
      j.escudo = 0; acertar('escudo'); return 'rebota';
    }
    j.plumas = Math.max(0, j.plumas - 1); j.mareo = Math.max(j.mareo, 0.7);
    const ux = (S.pos.x - A.pos.x) / (d || 1), uz = (S.pos.z - A.pos.z) / (d || 1);
    A.empuje = { x: ux * 9, z: uz * 9, t: 0.35 };
    sonar('wrong'); pintar();
    if (j.plumas <= 0) perder();
    return 'golpe';
  }
  function perder() {
    toast(TXT.pierde, 3600); emitir({ tipo: 'pierde' });
    A.aciertos = 0; A.patron = 0; A.j = nuevoJugador(A.j && A.j.especie); A.j.mareo = 1.2; A.cadaT = 3; A.avisoT = 0; A.pendientes = 0;
    pintar();
  }
  function terminar(gano) {
    A.fase = gano ? 'disuelve' : 'nada'; A.t = 0;
    if (gano) {
      const nueva = !!(V && V.otorgar('amenaza_sombra', 'victoria_sombra', 1));
      if (V) V.cambiarMundo(ID, 'dispersa');
      if (nueva) pagar();
      A.premio = nueva;
      toast(TXT.fin, 2600); setTimeout(() => toast(nueva ? TXT.gana : TXT.ganaOtra, 3600), G.quiet ? 0 : 1800);
      fx('gold', A.pos.x, A.pos.y, A.pos.z, 24); fx('stars', A.pos.x, A.pos.y + 1, A.pos.z, 18); sonar('unlock');
      emitir({ tipo: 'win', premio: nueva });
    }
    soltar();
  }
  function pagar() {
    if (!S.inv) S.inv = {};
    for (const k in PREMIO) S.inv[k] = (S.inv[k] || 0) + PREMIO[k];
    try { G.objetos.renderInv(); } catch (e) { /* HUD */ }
    try { if (G.guardado.save) G.guardado.save(true); else G.guardado.autosave(); } catch (e) { /* guardado */ } // QA-162
  }
  function iniciar(o) {
    o = o || {};
    if (dispersa() && !o.forzar) return false;
    if (G.v18combate && G.v18combate.estado && G.v18combate.estado().fase !== 'nada') return false;
    Object.assign(A, { fase: 'lucha', t: 0, aciertos: 0, patron: 0, ancla: anclaLejos(), giro: 0, avisoT: 0, cadaT: o.sinEspera ? 0.01 : 2.5,
      pendientes: 0, flash: 0, escala: 1, pistaBasico: false, rafagas: 0, ultimo: null, empuje: null });
    A.j = nuevoJugador(o.especie);
    niebla.visible = ojos.visible = true;
    enganchar(); montarHud(); hud.el.hidden = false; pintar();
    toast(TXT.empieza, 2400); sonar('viento');
    emitir({ tipo: 'empieza', especie: A.j.especie });
    return true;
  }
  function salir(motivo) {
    if (A.fase !== 'lucha') return false;
    A.fase = 'nada'; soltar(); if (motivo) toast(motivo, 2600);
    emitir({ tipo: 'sale' }); return true;
  }

  // ---------- Entrada: Acción / G / botón; pose de la protagonista (pico y alas) ----------
  let enganchado = false, modo0 = null, pl3d = null, upd0 = null;
  const modo = { activo: () => A.fase === 'lucha', accion: () => usarPoder(), aviso: () => guia(), get verbo() { return TXT.poder; } };
  const guia = () => TACTIL ? TXT.guiaT : (A.j && A.j.poder === 'escudo_plumas' ? TXT.guiaA : TXT.guiaV);
  // QA-173: en fase de captura y consumida: la G del poder no inclina la cámara mientras dura el encuentro
  function tecla(e) {
    if ((e.key || '').toLowerCase() !== 'g' || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.nodeName))) return;
    e.stopImmediatePropagation();
    if (G.pausa && G.pausa.activa && G.pausa.activa()) return; // con la pausa abierta no se juega
    if (!e.repeat && A.fase === 'lucha') usarPoder();
  }
  function enganchar() {
    if (enganchado) return; enganchado = true;
    modo0 = G.interaccion.modo; G.interaccion.modo = modo; addEventListener('keydown', tecla, true); if (G.input && G.input.keys) G.input.keys.delete('g');
    const ch = G.actores && G.actores.player3D;
    if (ch && !pl3d) {
      pl3d = ch; upd0 = ch.update;
      ch.update = function (dt) {
        try { const f = A.j; if (f) { if (f.picoT > 0) { this.mouth = Math.min(1, f.picoT / 0.15); this.expression = 'fight'; } if (f.alasT > 0 && !this.flying) this.wingMode = 'land'; if (f.mareo > 0) this.expression = 'surprised'; } } catch (e) { /* pose */ }
        return upd0.call(this, dt);
      };
    }
    document.body.classList.add('v18-amenaza-on');
  }
  function soltar() {
    if (hud) hud.el.hidden = true;
    if (!enganchado) return; enganchado = false;
    if (G.interaccion.modo === modo) G.interaccion.modo = modo0;
    removeEventListener('keydown', tecla, true);
    if (pl3d) { delete pl3d.update; if (pl3d.update !== upd0) pl3d.update = upd0; pl3d = upd0 = null; }
    document.body.classList.remove('v18-amenaza-on');
  }

  // ---------- HUD pequeño (mismo estilo que el duelo) ----------
  let hud = null, centroT = 0;
  function montarHud() {
    if (hud) return hud;
    const st = document.createElement('style'); st.id = 'v18-amenaza-css';
    st.textContent = '#v18-amenaza{position:fixed;top:calc(env(safe-area-inset-top,0px) + 92px);left:0;right:0;margin-inline:auto;width:min(340px,calc(100vw - 32px));z-index:40;' +
      'font-family:inherit;color:#fff;background:rgba(28,32,44,.78);border-radius:16px;padding:8px 12px;text-align:center;pointer-events:none}' +
      '#v18-amenaza .va-n{font-weight:700;font-size:15px}#v18-amenaza .va-f{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:4px;font-size:14px}' +
      '#v18-amenaza i{display:inline-block;width:12px;height:12px;border-radius:50%;margin:0 2px;background:#ffd84a}#v18-amenaza i.off{background:rgba(255,255,255,.22)}' +
      '#v18-amenaza .va-c{min-height:20px;font-weight:700;color:#ffe28a}#v18-amenaza button{pointer-events:auto;font:inherit;font-size:15px;font-weight:700;min-height:44px;' +
      'padding:6px 18px;border-radius:22px;border:0;background:#fff3d6;color:#3b2a14;margin-top:6px}#v18-amenaza button.no{opacity:.45}' +
      'body.v18-amenaza-on #quest{visibility:hidden}' +
      // Juego en familia (5-nov): en el escritorio va bajo el aviso (#toast), como el duelo; en el teléfono tapaba los contadores de madera y piedra (#inv, arriba a la derecha):
      // el objetivo (ya oculto) deja de ocupar su fila, los contadores suben arriba y el panel va debajo. El aviso (#toast) queda
      // por encima del panel si coinciden.
      '@media (max-width:760px){body.v18-amenaza-on #quest{display:none}#v18-amenaza{top:calc(env(safe-area-inset-top,0px) + 64px)}}body.v18-amenaza-on #toast{z-index:41}';
    document.head.appendChild(st);
    const el = document.createElement('div'); el.id = 'v18-amenaza'; el.hidden = true;
    el.innerHTML = '<div class="va-n">' + TXT.nombre + ' <span data-k="nubes"></span></div>' +
      '<div class="va-f"><span>' + TXT.tu + ' <span data-k="plumas"></span></span><button data-k="poder"></button></div><div class="va-c" data-k="centro"></div>';
    el.addEventListener('pointerdown', e => { const b = e.target.closest && e.target.closest('button'); if (!b) return; e.preventDefault(); e.stopPropagation(); usarPoder(); pintar(); });
    document.body.appendChild(el);
    hud = { el, q: k => el.querySelector('[data-k="' + k + '"]') };
    return hud;
  }
  function flotante(t) { if (hud) { hud.q('centro').textContent = t; centroT = 1.4; } }
  function pintar() {
    if (!hud || !A.j) return;
    const bolas = (n, max) => Array.from({ length: max }, (_, i) => '<i class="' + (i < n ? '' : 'off') + '"></i>').join('');
    const nubes = bolas(ACIERTOS - A.aciertos, ACIERTOS), plumas = bolas(A.j.plumas, PLUMAS);
    if (hud.q('nubes').dataset.v !== nubes) { hud.q('nubes').dataset.v = nubes; hud.q('nubes').innerHTML = nubes; }
    if (hud.q('plumas').dataset.v !== plumas) { hud.q('plumas').dataset.v = plumas; hud.q('plumas').innerHTML = plumas; }
    const b = hud.q('poder'), nom = (H.get(A.j.poder) || {}).nombre || TXT.poder;
    if (b.dataset.t !== nom) { b.dataset.t = nom; b.textContent = nom; }
    b.classList.toggle('no', !H.listo(A.j, A.j.poder).ok);
  }

  // Solo con el mundo libre: ni la apertura del capítulo (pantalla negra #c1-fade), ni diálogo, tarjeta, cómic, panel final o creador
  function libre() {
    const $ = id => document.getElementById(id), oculto = id => !$(id) || $(id).hidden;
    try {
      if ($('c1-fade') || (G.dialogo && G.dialogo.open && G.dialogo.open()) || G.ui.cardOpen || (G.ui.busy && G.ui.busy())) return false;
      return oculto('end') && oculto('comic') && oculto('creator');
    } catch (e) { return false; }
  }
  // ---------- Paso ----------
  function dibujar(dt) {
    if (!ojos.material.transparent) { // ojos al frente de la niebla: se leen sobre la nube, sin calls extra
      ojos.material.transparent = true; ojos.material.depthWrite = false; ojos.renderOrder = 5;
    }
    const p = A.pos, now = performance.now() / 1000, avisa = A.avisoT > 0;
    A.flash = Math.max(0, A.flash - dt);
    const k = A.escala * (avisa ? 1 + 0.12 * Math.sin(now * 30) : 1);
    // Rayo al acertar: un haz blanco-amarillo zigzaguea cruzando la nube y el resto se apaga (contraste)
    const rayo = A.flash > 0;
    const seg = rayo ? Math.floor(now * 22) : 0; // parpadeo de la descarga
    _c.copy(rayo ? colRayo : avisa ? colAviso : colBase);
    PUFF.forEach((f, i) => {
      const a = f.a + now * (0.5 + (i % 3) * 0.2);
      let x = p.x + Math.cos(a) * f.r * k, y = p.y + f.y * k + Math.sin(now * 1.3 + i) * 0.2, z = p.z + Math.sin(a) * f.r * k, s = f.s * k;
      _c2.copy(_c).multiplyScalar(f.l);
      if (rayo) { // descarga: toda la nube destella con trémolo por bola (zigzag de brillo, sin calls extra)
        _c2.copy(colHaz).lerp(colRayo, ((i + seg) % 3) * 0.4).multiplyScalar(0.85 + ((i * 11 + seg) % 3) * 0.15);
        y += ((i * 7 + seg) % 3 - 1) * 0.3; x += ((i * 5 + seg) % 3 - 1) * 0.15;
        s *= 1.06;
      }
      _o.position.set(x, y, z); _o.scale.setScalar(s); _o.updateMatrix();
      niebla.setMatrixAt(i, _o.matrix); niebla.setColorAt(i, _c2);
    });
    niebla.instanceMatrix.needsUpdate = true;
    if (niebla.instanceColor) niebla.instanceColor.needsUpdate = true;
    const dx = S.pos.x - p.x, dz = S.pos.z - p.z, dn = Math.hypot(dx, dz) || 1, fx0 = dx / dn, fz0 = dz / dn; // los ojos miran a la jugadora
    const ek = (A.fase === 'disuelve' ? Math.max(0.01, 1 - A.t) : (A.j && A.j.mareo > 0 ? 1.25 : 1)) * (avisa ? 1.12 : 1) * (rayo ? 0.85 : 1);
    [-1, 1].forEach((s, i) => {
      _o.position.set(p.x + fx0 * 2.6 * k - fz0 * 0.62 * s, p.y + 0.35 + 0.3 * k, p.z + fz0 * 2.6 * k + fx0 * 0.62 * s);
      _o.scale.setScalar(ek); _o.updateMatrix(); ojos.setMatrixAt(i, _o.matrix);
    });
    ojos.instanceMatrix.needsUpdate = true;
  }
  function mover(dt) {
    const P = PATRONES[A.patron];
    A.giro += P.giro * dt;
    const L = ANCLAS(A.giro), meta = L[A.ancla], now = performance.now() / 1000;
    const tx = meta.x + Math.sin(now * 0.7) * 2.2, tz = meta.z + Math.cos(now * 0.55) * 1.8;
    const v = 1 - Math.exp(-dt * 1.6);
    A.pos.x += (tx - A.pos.x) * v; A.pos.z += (tz - A.pos.z) * v;
    A.pos.y += (altura(A.pos.x, A.pos.z) + ALTO - A.pos.y) * v;
  }
  function paso(dt) {
    for (let i = timers.length - 1; i >= 0; i--) { timers[i].t -= dt; if (timers[i].t <= 0) { const f = timers[i].fn; timers.splice(i, 1); f(); } }
    if (centroT > 0 && (centroT -= dt) <= 0 && hud) hud.q('centro').textContent = '';
    if (A.fase === 'disuelve') {
      A.t += dt; A.escala = 1 + A.t * 1.6; matNiebla.opacity = Math.max(0, 0.72 * (1 - A.t / 1.4));
      dibujar(dt);
      if (A.t > 1.4) { A.fase = 'nada'; niebla.visible = ojos.visible = false; matNiebla.opacity = 0.72; A.escala = 1; }
      return;
    }
    const d = Math.hypot(S.pos.x - A.pos.x, S.pos.z - A.pos.z);
    if (A.fase === 'nada') {
      const cerca = !dispersa() && (A.forzarSale || (V && V.mundo('puente_villa') === 'reparado')) && Math.hypot(S.pos.x - centro.x, S.pos.z - centro.z) < 60;
      niebla.visible = ojos.visible = cerca;
      if (cerca) { mover(dt); dibujar(dt); }
      if (!A.manual && cerca && Math.hypot(S.pos.x - centro.x, S.pos.z - centro.z) < R_EMPIEZA && libre()) iniciar();
      return;
    }
    // lucha
    H.paso(A.j, dt);
    mover(dt);
    if (A.empuje && A.empuje.t > 0) { S.pos.x += A.empuje.x * dt; S.pos.z += A.empuje.z * dt; A.empuje.t -= dt; }
    else if (d < R_VIENTO && d > 0.5 && !(A.j.escudo > 0)) { const f = 1.6 * (1 - d / R_VIENTO); S.pos.x += (S.pos.x - A.pos.x) / d * f * dt; S.pos.z += (S.pos.z - A.pos.z) / d * f * dt; }
    const P = PATRONES[A.patron];
    if (A.avisoT > 0) {
      if ((A.avisoT -= dt) <= 0) {
        rafaga(); if (A.fase !== 'lucha') return;
        if (--A.pendientes > 0) A.avisoT = 0.55; else A.cadaT = trasPoder(P.cada);
      }
    } else if ((A.cadaT -= dt) <= 0) {
      A.avisoT = P.aviso; A.pendientes = A.j.poder === 'escudo_plumas' ? 1 : P.rafagas; // con el escudo, una ráfaga cada vez
      if (!A.avisoDicho) { A.avisoDicho = true; flotante(TXT.cuidado); }
    }
    if (d > R_SALE) { salir(TXT.lejos); return; }
    dibujar(dt); pintar();
  }
  G.on('update', (dt, busy) => { if (A.manual) return; if (busy && A.fase === 'lucha') return; paso(Math.min(dt, 0.1)); }, 72);
  G.on('apply', () => { if (A.fase === 'lucha') salir(); }, 48);

  // =====================================================================================================================
  // AV.v18AmenazaTest(): Vittata y Arausiaca contra la Sombra, de punta a punta, a paso fijo y sin depender del ratón.
  // =====================================================================================================================
  let evTest = null; G.on('v18amenaza', e => { if (evTest) evTest.push(e); }); // sin G.off: un solo oyente, mudo fuera de la prueba
  async function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    let crudo = null; try { crudo = localStorage.getItem(V.clave()); } catch (e) { /* */ }
    const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, fac0 = S.facing && { x: S.facing.x, z: S.facing.z };
    const inv0 = Object.assign({}, S.inv || {}), quiet0 = G.quiet, susp = G.guardado.suspender;
    const toasts = [], toast0 = G.ui.toast; G.ui.toast = (t, ms) => { toasts.push(String(t)); };
    const evs = []; evTest = evs;
    if (susp) susp(true);
    A.manual = true;
    const correr = (s, h) => { for (let t = 0; t < s; t += (h || 1 / 30)) paso(h || 1 / 30); };
    const ponerJugadora = (dist, mirando) => {
      const dx = S.pos.x - A.pos.x, dz = S.pos.z - A.pos.z, n = Math.hypot(dx, dz) || 1;
      const ux = n > 0.01 ? dx / n : 1, uz = n > 0.01 ? dz / n : 0;
      S.pos.x = A.pos.x + ux * dist; S.pos.z = A.pos.z + uz * dist; S.pos.y = altura(S.pos.x, S.pos.z);
      if (S.facing) { S.facing.x = mirando ? -ux : uz; S.facing.z = mirando ? -uz : -ux; }
    };
    const esperarRafaga = () => { for (let i = 0; i < 400 && A.avisoT <= 0; i++) paso(1 / 30); return A.avisoT > 0; };
    try {
      V.borrar(); V.recargar();
      check('Con el puente sin reparar no sale (no tapa la reparación)', (S.pos.x = centro.x + 5, S.pos.z = centro.z, S.pos.y = altura(S.pos.x, S.pos.z), correr(0.2), !niebla.visible && A.fase === 'nada'));
      A.forzarSale = true;
      // ----- Vittata -----
      S.pos.x = centro.x + 5; S.pos.z = centro.z; S.pos.y = altura(S.pos.x, S.pos.z);
      check('Aparece cerca del camino y se ve (niebla y ojos: 2 draw calls)', (correr(0.2), niebla.visible && ojos.visible && niebla.count <= 14));
      check('No empieza sola durante la apertura del capítulo (pantalla negra)', (() => { const f = document.createElement('div'); f.id = 'c1-fade'; document.body.appendChild(f); const r = libre(); f.remove(); return r === false; })());
      check('Empieza con Vittata, dice «¡Este cielo es mío!» y muestra 3 nubes', iniciar({ especie: 'vittata' }) && A.fase === 'lucha' && toasts.includes(TXT.empieza) && !hud.el.hidden && A.j.poder === 'grito_yunque');
      correr(0.5); ponerJugadora(5, false); A.j.energia = 100; A.j.cd = {};
      const r0 = usarPoder(); correr(0.6);
      check('Grito sin apuntar: falla (no cuenta)', r0.ok && A.aciertos === 0, 'aciertos ' + A.aciertos);
      check('Golpe de ala o semilla la atraviesan, con pista', usarBasico('semilla') === false && toasts.includes(TXT.atraviesa) && A.aciertos === 0);
      const p0 = { x: A.pos.x, z: A.pos.z }, patron0 = A.patron;
      ponerJugadora(5, true); A.j.energia = 100; A.j.cd = {}; usarPoder(); correr(0.6);
      correr(1.5);
      const movida = Math.hypot(A.pos.x - p0.x, A.pos.z - p0.z);
      check('Grito apuntado: 1 acierto y la Sombra se mueve y cambia de patrón', A.aciertos === 1 && A.patron !== patron0 && movida > 1.5, 'aciertos ' + A.aciertos + ', movida ' + movida.toFixed(1) + ' m, patrón ' + PATRONES[A.patron].id);
      // Ráfaga: avisa antes, y si estás cerca sin escudo quita una pluma
      ponerJugadora(5, true); const avisa = esperarRafaga(), plumas0 = A.j.plumas; ponerJugadora(4, true); correr(1.2);
      check('La ráfaga avisa (brillo) antes de soplar y quita 1 pluma si estás cerca', avisa && A.j.plumas < plumas0, plumas0 + ' → ' + A.j.plumas);
      ponerJugadora(R_RAFAGA + 6, true); const pl1 = A.j.plumas; esperarRafaga(); ponerJugadora(R_RAFAGA + 6, true); correr(1.2);
      check('Lejos, la ráfaga no te alcanza', A.j.plumas === pl1);
      for (let k = 0; k < 2 && A.fase === 'lucha'; k++) { correr(1.5); ponerJugadora(5, true); A.j.plumas = PLUMAS; A.j.energia = 100; A.j.cd = {}; A.j.mareo = 0; usarPoder(); correr(0.6); }
      check('Tres aciertos la dispersan: «Bueno… el sol también tiene derecho.»', A.aciertos === 3 && A.fase === 'disuelve' && toasts.includes(TXT.fin), 'aciertos ' + A.aciertos + ', fase ' + A.fase);
      check('Premio una vez: 1 madera y 1 piedra al inventario de siempre', (S.inv.madera || 0) === (inv0.madera || 0) + 1 && (S.inv.piedra || 0) === (inv0.piedra || 0) + 1 && A.premio);
      correr(1.6);
      check('Se disuelve y el mundo lo recuerda (no vuelve a salir)', !niebla.visible && dispersa() && iniciar({}) === false);
      V.recargar();
      check('Tras recargar sigue dispersa y el premio no se repite', dispersa() && !V.otorgar('amenaza_sombra', 'victoria_sombra', 1));
      // ----- Arausiaca: se gana con el escudo a tiempo -----
      iniciar({ especie: 'arausiaca', forzar: true });
      check('Con arausiaca su poder es el Escudo de plumas', A.fase === 'lucha' && A.j.poder === 'escudo_plumas');
      check('Con una cotorra nueva (agilis, Quiebro) contra la Sombra se usa el Grito: se le puede ganar', nuevoJugador('agilis').poder === 'grito_yunque' && nuevoJugador('arausiaca').poder === 'escudo_plumas');
      A.cadaT = 10; ponerJugadora(5, true); A.j.energia = 100; A.j.cd = {}; usarPoder(); correr(3);
      check('Escudo a destiempo (sin ráfaga): no cuenta', A.aciertos === 0, 'aciertos ' + A.aciertos);
      for (let k = 0; k < 3 && A.fase === 'lucha'; k++) {
        ponerJugadora(5, true); esperarRafaga(); ponerJugadora(5, true); A.j.plumas = PLUMAS; A.j.energia = 100; A.j.cd = {}; A.j.mareo = 0;
        A.avisoT = 0.2; usarPoder(); correr(0.4); correr(1.5);
      }
      check('Escudo abierto justo cuando sopla: la ráfaga rebota (3 rebotes la dispersan)', A.aciertos === 3 && evs.filter(e => e.tipo === 'acierto' && e.como === 'escudo').length === 3, 'aciertos ' + A.aciertos);
      check('Repetirla no da el premio otra vez', !A.premio && (S.inv.madera || 0) === (inv0.madera || 0) + 1);
      correr(1.6);
      // ----- Perder y alejarse -----
      iniciar({ especie: 'vittata', forzar: true }); A.j.plumas = 1; ponerJugadora(4, true); esperarRafaga(); ponerJugadora(4, true); correr(1.2);
      check('Sin plumas: se marea, vuelve a empezar con 5 plumas y la Sombra llena', A.fase === 'lucha' && A.j.plumas === PLUMAS && A.aciertos === 0 && toasts.includes(TXT.pierde));
      ponerJugadora(R_SALE + 5, false); correr(0.1);
      check('Al alejarse se sale del encuentro y suelta los controles', A.fase === 'nada' && G.interaccion.modo !== modo && hud.el.hidden);
      check('Táctil: el aviso dice «Toca Poder» y hay botón en pantalla', !!hud.q('poder') && (TACTIL ? guia() === TXT.guiaT : guia() !== TXT.guiaT));
    } catch (e) { check('Sin excepciones', false, e && e.stack ? e.stack.split('\n').slice(0, 2).join(' ') : e); }
    if (A.fase === 'lucha') salir();
    A.fase = 'nada'; A.manual = false; A.forzarSale = false; niebla.visible = ojos.visible = false; timers.length = 0;
    evTest = null;
    G.ui.toast = toast0; G.quiet = quiet0;
    S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z; if (fac0 && S.facing) { S.facing.x = fac0.x; S.facing.z = fac0.z; }
    S.inv = inv0; try { G.objetos.renderInv(); } catch (e) { /* */ }
    try { if (crudo == null) localStorage.removeItem(V.clave()); else localStorage.setItem(V.clave(), crudo); } catch (e) { /* */ }
    V.recargar();
    if (susp) susp(false);
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }

  G.v18amenaza = { ID, iniciar, salir, usarPoder, usarBasico, paso, estado: () => A, get centro() { return centro; }, test,
    recolocar() { centro = buscarSitio(); A.pos.x = centro.x; A.pos.z = centro.z; } };
  // el puente se encuentra cuando el mundo está listo: recoloca entonces (una vez)
  (function esperarPuente(n) { // reintenta hasta que el puente exista (en móviles lentos tarda más de 4 s)
    if (G.v18Reparar && G.v18Reparar.P && G.v18Reparar.P.eje) { if (A.fase === 'nada') G.v18amenaza.recolocar(); return; }
    if (n < 120) setTimeout(() => esperarPuente(n + 1), 1000);
  })(0);
  return G.v18amenaza;
};
