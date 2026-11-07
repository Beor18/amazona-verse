/* Juego · V18.3 fase 5 · Guardián del Primer Vuelo, piloto cotorra mentor histórico de vuelo: «Circuito del Primer Vuelo» (G.v18guardian).
   Directiva docs/DIRECTIVA_V18_3_RESOLUCION.md §F y §12; sistema de personajes docs/equipo/V18_3_DISENO.md §1 (src/game/v18/npc.js,
   fila de datos 'guardian' en content/comun/personajes_v18.js). Contenido opcional del mundo abierto: no toca los capítulos ni sus misiones.
   - Dónde: un claro llano al suroeste de la isla (entre Toldos y Ladera4), lejos del Puerto de La Mina, del minigolf, de la
     explanada del duelo, de la carrera con Chispa, del claro de Moon y del misterio. Sitio fijo medido en el mapa y en el juego
     (terreno, agua, colisiones, troncos y sólidos): SITIO más abajo. La prueba vuelve a medirlo.
   - El Guardián sale con el sistema único de NPC: carga diferida (el .glb no se pide hasta que Vittata está a < 90 m), máx. 2 a la vez.
   - El circuito: Acción junto al Guardián → reto → cuenta 3-2-1 → cronómetro y 5 columnas de viento marcadas con humo de colores,
     en orden, volando (cada una a 3-6 m sobre su suelo; se cuenta hasta 12 m por encima del terreno). Pasar una suelta su humo
     de color. Al pasar la 5.ª hay que volver a la salida: ahí para el cronómetro. No hay perder: solo completar y mejorar la marca.
     Alejarse > 80 m de la puerta actual lo cancela. Nada de presión: «¿Otra vuelta?» y ya.
   - Progreso V18 (G.v18.mundo('circuito_guardian') = { mejor (ms de la mejor vuelta), vueltas, jugadas, xp }).
     30 XP de G.v18evo una sola vez, al completar la primera (también si evolucion.js llega después). «Comenzar de cero» lo borra con el resto de la V18.
   - Minimapa: marcador propio (ala celeste, con nombre) en el Guardián; durante el circuito, en la puerta siguiente (minimapa.js, mapa()).
   Solo con la bandera V18 (src/boot.js). Prueba: AV.v18GuardianTest(). */
window.AVV18Guardian = function (G) {
  'use strict';
  if (G.v18guardian) return G.v18guardian;
  const V = G.v18 || window.AVV18Progreso(G);
  const N = G.v18npc || window.AVV18Npc(G);
  const S = G.S, T = G.terreno, F = G.fisica, scene = G.renderer.scene;
  const ID = 'circuito_guardian', NPC = 'guardian', XP_GANAR = 30;
  const CUENTA_S = 3, R_PUERTA = 4.2, R_Y = 3.2, ALTO_MAX = 12, R_SALE = 80;
  // Medido en el mapa real y en el juego con la medición del propio test (drenado incluido; herramientas
  // tools/build/kimi3_172_sitio.js y kimi3_172_scan2.js). Salida en una ladera interior al sur de Ladera4
  // (asentamiento a ~34 m: «en una ciudad existente», KIMI-172): la isla está sembrada de monumentos/carpas/
  // murallas de aldeas con colisiones enormes, y este es el único punto verificado SIN sólidos ni agua en su
  // cerco y a ≥ 105 m de toda actividad V18 (v18min 105; Moon a 105). La ladera es empinada (pendiente ~1,2):
  // se justifica porque TODO el circuito es aéreo (puertas a 8-11 m) y la salida solo aloja al NPC, que se
  // apoya en el terreno como cualquier NPC de ladera; el juego de suelo no ocurre aquí (a diferencia del
  // entreno de Moon, que por eso exigía plano). El check 5 de la prueba mide el cerco real de la salida.
  const SITIO = {
    salida: { x: -63, z: -37, rotY: -2.45 },
    puertas: [
      { x: -70, z: -48, alt: 11, color: '#5ac8fa' },
      { x: -69, z: -27, alt: 14, color: '#ffd23f' },
      { x: -52, z: -30, alt: 11, color: '#7ee08a' },
      { x: -47, z: -42, alt: 14, color: '#ff9ad5' },
      { x: -58, z: -59, alt: 11, color: '#b9a7ff' }
    ]
  };
  const gy = p => H(p.x, p.z) + p.alt; // altura del centro de la puerta
  const TXT = {
    nombre: 'Circuito del Primer Vuelo', label: 'Volar el circuito con el Guardián',
    reto: ['¿Nuevas alas por aquí? Yo soy el Guardián del Primer Vuelo: de mí aprendieron a volar hasta las nubes viejas.', 'Cinco columnas de viento marcadas con humo de colores. Pásalas en orden, vuelve a la salida y cronometramos tu vuelo. ¿Vamos?'],
    revancha: ['¿Otra vuelta? El viento ya te conoce. A ver si mejoras tu marca.'],
    cuenta: '¡Vuela por las 5 columnas en orden y vuelve a la salida!',
    ya: '¡Ya!', puerta: 'Puerta {}/5', meta: '¡A la meta!', siguiente: 'Siguiente puerta', tiempo: 'Tiempo', record: 'Récord',
    gana: ['¡Eso es! Cinco puertas y una vuelta entera. Tu primer vuelo ya tiene historia.', 'El cielo se aprende volándolo. Vuelve cuando quieras a mejorar tu marca.'],
    nuevo: '¡Nuevo récord: {}!',
    xp: 'Tu aventura cuenta: +{} XP para tu cotorra.',
    lejos: 'Te alejaste del circuito: el vuelo con el Guardián queda para otro rato.',
    sale: 'Saliste del circuito: el vuelo con el Guardián queda para otro rato.'
  };
  const sonar = (n, a) => { try { G.audio.play(n, a); } catch (e) { /* sin audio */ } };
  const toast = (t, ms) => { try { G.ui.toast(t, ms || 2600); } catch (e) { /* sin interfaz */ } };
  const fx = (k, x, y, z, n) => { try { G.fx.burst(x, y, z, k, n || 8); } catch (e) { /* sin fx */ } };
  const emitir = ev => { try { G.emit('v18guardian', ev); } catch (e) { /* sin oyentes */ } };
  const H = (x, z) => T.height(x, z);
  const reloj = s => (Math.max(0, s)).toFixed(1).replace('.', ',') + ' s';

  const A = { fase: 'nada', t: 0, cuenta: 0, sig: 0, forzar: false, manual: false, ultimo: null, xpT: 0 };
  const activa = () => !!((G.V18 && G.pack && G.pack.id === 'cap1') || A.forzar); // QA-192: la actividad es de Villa Raíz; la prueba la fuerza con A.forzar

  // ---------- Progreso ----------
  function record() { const r = V.mundo(ID); return r && typeof r === 'object' ? r : null; }
  function pagarXP() {
    const r = record();
    if (!r || !(r.vueltas > 0) || r.xp || !G.v18evo || !G.v18evo.dar) return 0;
    V.cambiarMundo(ID, Object.assign({}, r, { xp: true })); // primero se marca: nunca dos veces
    const n = G.v18evo.dar(V.seleccionada ? V.seleccionada() || 'vittata' : 'vittata', XP_GANAR, 'guardian') || 0;
    if (n) toast(TXT.xp.replace('{}', n), 2800);
    return n;
  }

  // ---------- Puertas: columnas de viento + nubes girando (canvas, 0 assets) ----------
  let gPuertas = null;
  const matsP = [];
  const nubeCv = document.createElement('canvas'); nubeCv.width = nubeCv.height = 64;
  (() => { const g = nubeCv.getContext('2d'), gr = g.createRadialGradient(32, 30, 6, 32, 30, 30);
    gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.6, 'rgba(255,255,255,.38)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); })();
  const nubeTex = new THREE.CanvasTexture(nubeCv);
  function montarPuertas() {
    if (gPuertas) return;
    gPuertas = new THREE.Group(); gPuertas.name = 'v18guardian:puertas'; gPuertas.visible = false;
    const gCol = new THREE.CylinderGeometry(2.6, 3.1, 7, 18, 1, true);
    const gAnillo = new THREE.TorusGeometry(3.1, 0.16, 8, 28);
    SITIO.puertas.forEach((p, i) => {
      const lin = new THREE.Color(p.color).convertSRGBToLinear();
      const mCol = new THREE.MeshBasicMaterial({ color: lin, transparent: true, opacity: 0.26, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
      const mAni = new THREE.MeshBasicMaterial({ color: lin, transparent: true, opacity: 0.8, depthWrite: false });
      matsP[i] = { mCol, mAni };
      const b = new THREE.Group(); b.position.set(p.x, gy(p), p.z);
      const col = new THREE.Mesh(gCol, mCol);
      const ani = new THREE.Mesh(gAnillo, mAni); ani.rotation.x = Math.PI / 2; ani.position.y = -p.alt + 0.5; // anillo en el suelo, bajo la columna
      b.add(col, ani);
      const nubes = [];
      for (let k = 0; k < 3; k++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: nubeTex, color: lin, transparent: true, opacity: 0.85, depthWrite: false }));
        sp.scale.set(2.2, 2.2, 1); b.add(sp); nubes.push(sp);
      }
      b.userData = { col, ani, nubes, i };
      gPuertas.add(b);
    });
    scene.add(gPuertas);
  }
  function pintarPuertas(t) {
    if (!gPuertas) return;
    gPuertas.visible = A.fase === 'cuenta' || A.fase === 'circuito';
    for (const b of gPuertas.children) {
      const u = b.userData, es = u.i === A.sig, pasada = u.i < A.sig;
      b.visible = A.fase === 'cuenta' ? true : !pasada || es;
      u.col.material.opacity = es ? 0.42 + Math.sin(t * 5) * 0.1 : 0.2;
      u.col.rotation.y = t * (es ? 1.6 : 0.5) + u.i;
      const s = es ? 1 + Math.sin(t * 5) * 0.06 : 1; u.col.scale.set(s, 1, s);
      u.ani.material.opacity = es ? 0.95 : 0.4;
      for (let k = 0; k < u.nubes.length; k++) {
        const a = t * (es ? 1.3 : 0.5) + u.i * 2.1 + k * 2.094;
        u.nubes[k].position.set(Math.cos(a) * 3.4, Math.sin(t * 1.7 + k * 2.1) * 1.4, Math.sin(a) * 3.4);
      }
    }
  }

  // ---------- Humo de colores al pasar (pool de sprites compartido) ----------
  const gHumo = new THREE.Group(); gHumo.name = 'v18guardian:humo'; gHumo.visible = false; scene.add(gHumo);
  const humos = [];
  for (let i = 0; i < 30; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: nubeTex, transparent: true, opacity: 0, depthWrite: false }));
    sp.visible = false; gHumo.add(sp); humos.push({ sp, t: 0, vida: 0, vx: 0, vy: 0, vz: 0 });
  }
  function puff(x, y, z, color) {
    const lin = new THREE.Color(color).convertSRGBToLinear();
    let n = 0;
    for (const h of humos) {
      if (h.vida > 0) continue;
      h.vida = 0.7 + Math.random() * 0.4; h.t = 0;
      h.sp.position.set(x + (Math.random() - 0.5) * 1.6, y + (Math.random() - 0.5) * 2.4, z + (Math.random() - 0.5) * 1.6);
      h.vx = (Math.random() - 0.5) * 2.4; h.vy = 0.8 + Math.random() * 1.6; h.vz = (Math.random() - 0.5) * 2.4;
      h.sp.material.color.copy(lin); h.sp.visible = true;
      if (++n >= 7) break;
    }
    gHumo.visible = true;
  }
  function pasoHumo(dt) {
    let vivos = 0;
    for (const h of humos) {
      if (h.vida <= 0) continue;
      h.t += dt; h.vida -= dt;
      if (h.vida <= 0) { h.sp.visible = false; continue; }
      vivos++;
      h.sp.position.x += h.vx * dt; h.sp.position.y += h.vy * dt; h.sp.position.z += h.vz * dt;
      const k = h.t / 0.4; h.sp.scale.set(1.4 + k * 2.2, 1.4 + k * 2.2, 1);
      h.sp.material.opacity = Math.min(0.9, h.vida * 1.6);
    }
    if (!vivos) gHumo.visible = false;
  }

  // ---------- HUD ----------
  let hud = null;
  function montarHud() {
    if (hud) return hud;
    if (!document.getElementById('v18-guardian-css')) {
      const st = document.createElement('style'); st.id = 'v18-guardian-css';
      st.textContent = '#v18-guardian{position:fixed;top:calc(env(safe-area-inset-top,0px) + 92px);left:0;right:0;margin-inline:auto;width:min(300px,calc(100vw - 32px));z-index:40;' +
        'pointer-events:none;text-align:center;color:#fff;font:inherit;background:rgba(14,38,48,.8);border:2px solid #4fc3d8;border-radius:16px;padding:8px 12px;box-shadow:0 3px 12px rgba(0,0,0,.35)}' +
        '#v18-guardian .vg-h{display:flex;align-items:center;justify-content:center;gap:8px}#v18-guardian .vg-x{pointer-events:auto;flex:none;min-width:44px;min-height:44px;padding:0 12px;border:0;border-radius:22px;background:#fff3d6;color:#3b2a14;font:inherit;font-size:14px;font-weight:700}' +
        '#v18-guardian .vg-t{font-size:calc(13px * var(--fs-k,1));opacity:.9;letter-spacing:.02em}#v18-guardian .vg-l{display:flex;justify-content:space-between;gap:10px;font-size:calc(17px * var(--fs-k,1));font-weight:700;margin-top:2px}' +
        '#v18-guardian .vg-n{font-size:calc(46px * var(--fs-k,1));font-weight:800;line-height:1.1;color:#7ee0d2;text-shadow:0 2px 0 #123f4c}#v18-guardian .vg-r{font-size:calc(12px * var(--fs-k,1));opacity:.85;margin-top:2px}' +
        'body:has(#v18-guardian:not([hidden])) #toast{z-index:41}' + // auditoría de la otra cuenta (7-nov): el aviso, encima del panel, como en el puerto (W29: la regla estaba dentro de la del panel y no valía)
        // W29 (móvil): a 64 px el panel tapaba la línea de misión, el inventario y el minimapa. Va en la columna izquierda libre, bajo la fila de fichas (92-130 px) y a la izquierda del minimapa
        '@media (max-width:560px){#v18-guardian{top:calc(env(safe-area-inset-top,0px) + 132px);left:12px;right:auto;margin-inline:0;width:min(220px,calc(100vw - 190px));min-width:150px;padding:6px 10px}' +
        '#v18-guardian .vg-n{font-size:calc(34px * var(--fs-k,1))}#v18-guardian .vg-l{font-size:calc(15px * var(--fs-k,1))}}';
      document.head.appendChild(st);
    }
    const el = document.createElement('div'); el.id = 'v18-guardian'; el.hidden = true; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    // W35 · lector de pantalla: el panel se nombra con su título; el reloj (cada décima) y el récord no se anuncian solos
    el.setAttribute('aria-labelledby', 'vgd-t');
    el.innerHTML = '<div class="vg-h"><div class="vg-t" id="vgd-t"></div><button type="button" class="vg-x">Salir</button></div><div class="vg-n" hidden></div><div class="vg-l"><span class="vg-p"></span><span class="vg-s" aria-live="off"></span></div><div class="vg-r" aria-live="off"></div>';
    // W29: sin teclado no había cómo dejar el circuito a medias (solo alejarse > 80 m): botón «Salir» ≥ 44 px, con pointerdown como los demás del juego
    el.querySelector('.vg-x').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); cancelar('sale'); });
    // W35: con el teclado (Tab hasta «Salir» y Enter o Espacio) llega un click sin puntero (detail 0); con el ratón ya salió en pointerdown
    el.querySelector('.vg-x').addEventListener('click', e => { if (e.detail !== 0) return; e.preventDefault(); cancelar('sale'); });
    document.body.appendChild(el);
    const q = c => el.querySelector(c);
    hud = { el, t: q('.vg-t'), n: q('.vg-n'), p: q('.vg-p'), s: q('.vg-s'), r: q('.vg-r'), cache: {} };
    hud.t.textContent = TXT.nombre;
    return hud;
  }
  const pon = (k, txt) => { if (hud.cache[k] !== txt) { hud.cache[k] = txt; hud[k].textContent = txt; } };
  function pintarHud() {
    if (!hud) return;
    const on = A.fase === 'cuenta' || A.fase === 'circuito';
    hud.el.hidden = !on; if (!on) return;
    const n = A.fase === 'cuenta' ? String(Math.max(1, Math.ceil(A.cuenta))) : A.fase === 'circuito' && A.t < 0.8 ? TXT.ya : '';
    hud.n.hidden = !n; pon('n', n);
    pon('p', A.sig >= SITIO.puertas.length ? TXT.meta : TXT.puerta.replace('{}', A.sig + 1));
    pon('s', reloj(A.fase === 'circuito' ? A.t : 0));
    const r = record(); pon('r', r && r.mejor ? TXT.record + ': ' + reloj(r.mejor / 1000) : '');
  }

  // ---------- Guardián (instancia del sistema de NPC) ----------
  function colocarEnSitio() {
    N.colocar(NPC, { x: SITIO.salida.x, z: SITIO.salida.z, rotY: SITIO.salida.rotY, aparece: activa, comenta: true });
    N.alUsar(NPC, { label: () => TXT.label, use: invitar, visible: () => A.fase === 'nada' && activa() });
  }
  const ponerGuardian = () => {
    const inst = N.instancia(NPC); if (!inst) return;
    inst.x = SITIO.salida.x; inst.z = SITIO.salida.z; inst.giro = SITIO.salida.rotY; inst.meta = null;
    inst.raiz.position.set(SITIO.salida.x, H(SITIO.salida.x, SITIO.salida.z), SITIO.salida.z); inst.raiz.rotation.y = SITIO.salida.rotY;
  };

  // ---------- Circuito ----------
  function invitar() {
    if (A.fase !== 'nada') return false;
    const r = record();
    return N.decir(NPC, r && r.jugadas ? TXT.revancha : TXT.reto, () => empezar());
  }
  function empezar(o) {
    o = o || {};
    if (A.fase !== 'nada' || (!activa() && !o.forzar)) return false;
    montarPuertas(); montarHud();
    const s = SITIO.salida, p = SITIO.puertas[0], dx = p.x - s.x, dz = p.z - s.z, d = Math.hypot(dx, dz) || 1, nx = -dz / d, nz = dx / d;
    Object.assign(A, { fase: 'cuenta', t: 0, cuenta: CUENTA_S, sig: 0, ultimo: null });
    A.salidaJ = { x: s.x + nx * 1.6, z: s.z + nz * 1.6 };
    N.colocar(NPC, { comenta: false, anim: 'idle' });
    ponerGuardian();
    sujetar();
    if (S.facing) { S.facing.x = dx / d; S.facing.z = dz / d; }
    try { G.camara.yaw = Math.atan2(-dx, -dz); if (G.camara.place) G.camara.place(true); } catch (e) { /* sin cámara */ }
    toast(TXT.cuenta, 2800); sonar('tick');
    emitir({ tipo: 'empieza' });
    pintarHud();
    return true;
  }
  function sujetar() { // durante la cuenta, Vittata espera en la línea de salida
    const p = A.salidaJ, M = F.MOVE;
    S.pos.x = p.x; S.pos.z = p.z; S.pos.y = H(p.x, p.z) + 0.02; S.vy = 0; M.vx = M.vz = 0; M.flying = false; M.swimming = false; M.grounded = true;
  }
  function puertaActual() { return A.sig < SITIO.puertas.length ? SITIO.puertas[A.sig] : SITIO.salida; }
  function pasarPuerta() {
    const p = SITIO.puertas[A.sig];
    puff(p.x, gy(p), p.z, p.color);
    fx('stars', p.x, gy(p), p.z, 8); sonar('pickup');
    N.animar(NPC, 'hablar');
    A.sig++;
    emitir({ tipo: 'puerta', n: A.sig });
    if (A.sig >= SITIO.puertas.length) toast(TXT.meta, 2000);
  }
  function terminar() {
    const ms = Math.round(A.t * 1000), r0 = record() || {}, r = { mejor: r0.mejor || 0, vueltas: r0.vueltas || 0, jugadas: (r0.jugadas || 0) + 1, xp: !!r0.xp };
    let nuevo = false;
    r.vueltas++; if (!r.mejor || ms < r.mejor) { r.mejor = ms; nuevo = true; }
    V.cambiarMundo(ID, r);
    A.fase = 'nada'; A.ultimo = { gana: true, ms, nuevo };
    pintarHud(); pintarPuertas(0);
    ponerGuardian();
    N.colocar(NPC, { x: SITIO.salida.x, z: SITIO.salida.z, rotY: SITIO.salida.rotY, comenta: true, anim: undefined });
    sonar('unlock'); fx('gold', S.pos.x, S.pos.y + 1.2, S.pos.z, 14);
    if (nuevo) toast(TXT.nuevo.replace('{}', reloj(ms / 1000)), 3000);
    pagarXP();
    emitir({ tipo: 'fin', gana: true, ms, nuevo });
    N.decir(NPC, TXT.gana);
    return A.ultimo;
  }
  function cancelar(motivo) {
    if (A.fase === 'nada') return false;
    A.fase = 'nada'; pintarHud(); pintarPuertas(0);
    ponerGuardian();
    N.colocar(NPC, { x: SITIO.salida.x, z: SITIO.salida.z, rotY: SITIO.salida.rotY, comenta: true, anim: undefined });
    toast(motivo === 'sale' ? TXT.sale : TXT.lejos, 2600); emitir({ tipo: 'cancela' });
    return true;
  }
  // W35 · teclado: Esc lo deja (como alejarse, sin contar partida) y no abre además la Pausa (ui.js mira defaultPrevented)
  function teclaEsc(e) {
    if (e.key !== 'Escape' || e.repeat || !(A.fase === 'cuenta' || A.fase === 'circuito')) return;
    if ((e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.nodeName)) || (G.pausa && G.pausa.activa && G.pausa.activa()) || G.ui.cardOpen) return;
    e.preventDefault(); e.stopImmediatePropagation(); cancelar('sale');
  }
  addEventListener('keydown', teclaEsc, true);
  let reloj3d = 0;
  function paso(dt) {
    reloj3d += dt;
    pasoHumo(dt);
    if (A.fase === 'nada') {
      if ((A.xpT -= dt) <= 0) { A.xpT = 2; if (activa()) pagarXP(); }
      return;
    }
    if (A.fase === 'cuenta') {
      sujetar(); ponerGuardian();
      if ((A.cuenta -= dt) <= 0) { A.fase = 'circuito'; A.t = 0; sonar('dash'); }
    } else if (A.fase === 'circuito') {
      A.t += dt;
      const p = puertaActual();
      if (A.sig < SITIO.puertas.length) {
        const gp = SITIO.puertas[A.sig];
        if (Math.hypot(S.pos.x - gp.x, S.pos.z - gp.z) < R_PUERTA && Math.abs(S.pos.y + 0.6 - gy(gp)) < R_Y && S.pos.y - H(S.pos.x, S.pos.z) < ALTO_MAX + gp.alt) pasarPuerta();
      } else if (Math.hypot(S.pos.x - SITIO.salida.x, S.pos.z - SITIO.salida.z) < R_PUERTA + 1 && S.pos.y - H(S.pos.x, S.pos.z) < ALTO_MAX) { terminar(); return; }
      if (Math.hypot(S.pos.x - p.x, S.pos.z - p.z) > R_SALE) { cancelar(); return; }
    }
    pintarPuertas(reloj3d); pintarHud();
  }
  G.on('update', (dt, busy) => { if (A.manual) return; if (busy && A.fase === 'nada') return; paso(Math.min(dt, 0.1)); }, 48);
  G.on('apply', () => { if (A.fase !== 'nada') { A.fase = 'nada'; pintarHud(); pintarPuertas(0); colocarEnSitio(); } }, 52);
  colocarEnSitio();

  const mapa = () => {
    if (!activa()) return null;
    if (A.fase === 'cuenta' || A.fase === 'circuito') { const p = puertaActual(); return { x: p.x, z: p.z, nombre: TXT.siguiente }; }
    return { x: SITIO.salida.x, z: SITIO.salida.z, nombre: TXT.nombre };
  };
  const textos = () => { const d = N.def(NPC) || {}, l = [TXT.nombre, TXT.label, TXT.cuenta, TXT.ya, TXT.puerta, TXT.meta, TXT.siguiente, TXT.tiempo, TXT.record, TXT.nuevo, TXT.xp, TXT.lejos].concat(TXT.reto, TXT.revancha, TXT.gana);
    for (const e in d.porEstado || {}) l.push(...(d.porEstado[e].dialogo || []));
    if (d.nombre) l.push(d.nombre.es); return l; };

  // ---------- W35 · teclado y lector de pantalla (lo llaman esta prueba y AV.accesibilidadTest) ----------
  function teclado() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    if (A.fase !== 'nada') return out;
    const nombre = el => (el.getAttribute('aria-labelledby') || '').split(/\s+/).map(id => document.getElementById(id)).filter(Boolean).map(x => x.textContent.trim()).join(' ') || el.getAttribute('aria-label') || '';
    const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, fac0 = S.facing && { x: S.facing.x, z: S.facing.z }, yaw0 = G.camara.yaw, man0 = A.manual, toast0 = G.ui.toast, r0 = JSON.stringify(record());
    const foco0 = document.activeElement;
    const esc = () => {
      const kd = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }); document.body.dispatchEvent(kd);
      document.body.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true, cancelable: true }));
      const pz = document.getElementById('pause'); let pausa = false; try { pausa = !!(pz && pz.matches(':popover-open')); if (pausa) pz.hidePopover(); } catch (e) { /* sin popover */ }
      return { prev: kd.defaultPrevented, pausa };
    };
    G.ui.toast = () => {}; A.manual = true;
    try {
      empezar({ forzar: true });
      const el = hud.el;
      check('W35 · Guardián: el panel se anuncia (role=status, aria-live) con nombre; el reloj no se lee a cada décima',
        !el.hidden && el.getAttribute('role') === 'status' && el.getAttribute('aria-live') === 'polite' && !!nombre(el) && hud.s.getAttribute('aria-live') === 'off' && hud.r.getAttribute('aria-live') === 'off', nombre(el));
      const bx = el.querySelector('.vg-x');
      check('W35 · Guardián: el panel no roba el foco; «Salir» es un <button> con nombre que se alcanza con Tab', document.activeElement === foco0 && bx.tagName === 'BUTTON' && bx.type === 'button' && !!bx.textContent.trim() && bx.tabIndex === 0);
      bx.focus(); bx.click(); // un clic sin puntero (detail 0), como Enter o Espacio sobre el botón
      check('W35 · Guardián: Enter o Espacio sobre «Salir» deja el circuito (antes solo respondía al toque)', A.fase === 'nada' && el.hidden, A.fase);
      if (document.activeElement === bx) bx.blur();
      empezar({ forzar: true });
      const r = esc();
      check('W35 · Guardián: Esc lo deja (sin contar partida) y no abre la Pausa', A.fase === 'nada' && r.prev && el.hidden && !r.pausa && JSON.stringify(record()) === r0, JSON.stringify({ fase: A.fase, esc: r.prev, pausa: r.pausa }));
    } catch (e) { check('W35 · Guardián: teclado sin excepciones', false, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e); }
    finally {
      if (A.fase !== 'nada') { A.fase = 'nada'; pintarHud(); pintarPuertas(0); }
      A.manual = man0; G.ui.toast = toast0;
      S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z; if (fac0 && S.facing) { S.facing.x = fac0.x; S.facing.z = fac0.z; } G.camara.yaw = yaw0;
      colocarEnSitio();
    }
    return out;
  }

  // ---------- Prueba ----------
  async function test(o) {
    o = o || {};
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const esperar = ms => new Promise(r => setTimeout(r, ms));
    const antes = o.antes || {};
    try { await G.mundo.listo; } catch (e) { /* sin mundo */ }
    const tit = document.getElementById('title'), titAbierta = !!(tit && tit.open), cre = document.getElementById('creator'), creOculto = cre ? cre.hidden : true;
    if (titAbierta) tit.open = false; if (cre) cre.hidden = true; try { G.pausa.sincronizar(); } catch (e) { /* sin pausa */ }
    let crudo = null; try { crudo = localStorage.getItem(V.clave()); } catch (e) { /* */ }
    const MV = F.MOVE;
    const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, fac0 = S.facing && { x: S.facing.x, z: S.facing.z }, yaw0 = G.camara.yaw, inv0 = JSON.stringify(S.inv || {});
    const toast0 = G.ui.toast, toasts = []; G.ui.toast = t => { toasts.push(String(t)); };
    const susp = G.guardado.suspender; if (susp) susp(true);
    const evo0 = G.v18evo, xpDado = [];
    G.v18evo = { dar: (sp, n, f) => { xpDado.push([sp, n, f]); return n; } }; // espía: no toca la XP de la partida
    A.manual = true;
    const correr = (s, h) => { h = h || 1 / 30; for (let t = 0; t < s; t += h) { N.paso(h, false); paso(h); } };
    const ir = (x, z) => { S.pos.x = x; S.pos.z = z; S.pos.y = H(x, z) + 0.02; S.vy = 0; MV.flying = false; MV.swimming = false; MV.grounded = true; MV.vx = MV.vz = 0; };
    const volarA = (p) => { S.pos.x = p.x; S.pos.z = p.z; S.pos.y = gy(p) - 0.6; S.vy = 0; MV.flying = true; MV.grounded = false; MV.vx = MV.vz = 0; };
    const recursos = () => (performance.getEntriesByType('resource') || []).map(r => r.name).filter(n => /models\/personajes\/guardian_vuelo/.test(n));
    const cerrar = () => { try { G.dialogo.clear(); } catch (e) { /* */ } try { G.dialogo.cancelarLibre && G.dialogo.cancelarLibre(); } catch (e) { /* */ } };
    // vuela el circuito entero pasando por las puertas en orden («orden=false» salta a la 2ª primero a propósito)
    const circuito = (orden) => {
      const r = { pasos: 0, sig: [] };
      if (!empezar({ forzar: true })) return null;
      const h = 1 / 30;
      for (let k = 0; k < 2400 && A.fase !== 'nada'; k++) {
        if (A.fase === 'circuito') {
          const idx = (!orden && A.t < 0.7) ? 1 : A.sig; // fuera de orden: los primeros 0,7 s se está EN la puerta 2 sin contar
          if (!orden && A.t >= 0.7 && r.visto2 == null) r.visto2 = A.sig;
          if (idx < SITIO.puertas.length) volarA(SITIO.puertas[idx]);
          else { S.pos.x = SITIO.salida.x; S.pos.z = SITIO.salida.z; S.pos.y = H(SITIO.salida.x, SITIO.salida.z) + 1.2; S.vy = 0; MV.flying = true; MV.grounded = false; MV.vx = MV.vz = 0; }
        }
        paso(h); r.pasos++;
        if (r.sig[r.sig.length - 1] !== A.sig) r.sig.push(A.sig);
      }
      r.ultimo = A.ultimo; return r;
    };
    try {
      check('1 · Con la bandera apagada (?v18=0) no se cargó nada: ni guardian.js ni el modelo del Guardián', antes.v18 ? true : (!antes.guardian && !antes.glb), antes.v18 ? 'bandera puesta en esta sesión (por defecto; la carga se comprueba con ?v18=0)' : JSON.stringify(antes));
      cancelar(); A.forzar = false; V.cambiarMundo(ID, null);
      // 2 · sin bandera (y sin forzar), aunque Vittata esté al lado, no aparece nada
      // (la V18 va encendida por defecto desde el 6-nov: se apaga G.V18 solo durante este bloque, como con ?v18=0, y se deja como estaba)
      const v18bk = G.V18; let sinBandera = false;
      G.V18 = false;
      try { ir(SITIO.salida.x + 4, SITIO.salida.z + 4); correr(0.3); await esperar(200); correr(0.1);
        sinBandera = !N.instancia(NPC) && N.activos().indexOf(NPC) < 0 && mapa() === null && !empezar(); } finally { G.V18 = v18bk; }
      check('2 · Sin la bandera V18 no aparece el Guardián, ni su marcador, ni se puede empezar el circuito', sinBandera, N.activos().join(','));
      // 2b · QA-192: con la V18 encendida pero fuera del cap. 1 (packs 2-6) tampoco aparece
      const packBk = G.pack && G.pack.id; let fueraPack = false;
      if (packBk) { G.pack.id = 'ep4';
        try { ir(SITIO.salida.x + 4, SITIO.salida.z + 4); correr(0.3); await esperar(200); correr(0.1);
          fueraPack = !N.instancia(NPC) && N.activos().indexOf(NPC) < 0 && mapa() === null && !empezar(); } finally { G.pack.id = packBk; } }
      check('2b · Con la V18 encendida fuera del cap. 1 (pack ep4) no aparece el Guardián ni su marcador ni el circuito (QA-192)', packBk ? fueraPack : true, 'pack ' + packBk + ' · activos ' + N.activos().join(','));
      A.forzar = true;
      // 3 · lejos: carga diferida
      const villa = (T.mapa && T.mapa.lugares && T.mapa.lugares.villa) || { x: 150, z: 170 };
      for (const id of N.activos()) N.liberar(id);
      const rec0 = recursos().length, ped0 = N.stats().pedidos.filter(p => /guardian_vuelo/.test(p)).length;
      ir(villa.x, villa.z); correr(0.3); await esperar(300); correr(0.1);
      check('3 · Carga diferida: lejos (> 150 m) no está el Guardián ni se pidió su modelo', Math.hypot(villa.x - SITIO.salida.x, villa.z - SITIO.salida.z) > 150 && !N.instancia(NPC) && recursos().length === rec0 && N.stats().pedidos.filter(p => /guardian_vuelo/.test(p)).length === ped0,
        'dist ' + Math.hypot(villa.x - SITIO.salida.x, villa.z - SITIO.salida.z).toFixed(0) + ' m · Δrecursos ' + (recursos().length - rec0));
      // 4 · cerca: aparece con su modelo (guardian_vuelo.glb), máximo 2 personajes a la vez
      ir(SITIO.salida.x + 10, SITIO.salida.z + 10); correr(0.2);
      for (let i = 0; i < 100 && !N.instancia(NPC); i++) { await esperar(100); correr(0.05); }
      const inst = N.instancia(NPC);
      check('4 · Cerca (< 90 m) aparece el Guardián con su modelo propio y sus acciones (Idle, Hablar); máx. 2 personajes', !!inst && !inst.provisional && ['Idle', 'Hablar'].every(n => inst.acciones[n]) && N.activos().length <= N.MAX_ACTIVOS && N.stats().pedidos.some(p => /guardian_vuelo\.glb/.test(p)),
        inst ? Object.keys(inst.acciones).join(',') + ' · activos ' + N.activos().join(',') : 'sin instancia');
      // 5 · el sitio: salida en seco y llana; cada puerta con suelo sano debajo y el pasillo entre puertas ≥ 2,2 m sobre el terreno; lejos de las demás actividades V18 (> 100 m)
      const puntos = [SITIO.salida].concat(SITIO.puertas);
      for (const p of puntos) { ir(p.x, p.z); correr(0.05); await esperar(400);
        try { if (G.streaming && G.streaming.terminar) await G.streaming.terminar(); } catch (e) { /* */ }
        try { if (G.solidos && G.solidos.terminar) G.solidos.terminar(); } catch (e) { /* */ } } // drenar como la sonda: sólidos completos de todo el circuito
      try { if (G.solidos && G.solidos.terminar) G.solidos.terminar(); } catch (e) { /* */ }
      const VG = G.vegetacion, P = VG && VG.instancias, inf = VG && VG.info, tr = [];
      if (P && inf) for (const m in P) { const I = inf[m], PM = P[m]; if (!I || !PM) continue; const roca = /roca|piedra|tronco/.test(m); if (!roca && !(I.tronco >= 0.05)) continue;
        for (let i = 0; i < PM.n; i++) { const x = PM.pos[i * 4], z = PM.pos[i * 4 + 2], sc = PM.pos[i * 4 + 3]; if (Math.hypot(x - SITIO.salida.x, z - SITIO.salida.z) < 60) tr.push({ x, z, r: roca ? Math.max(0.5, (I.ancho || 1) * 0.5 * sc) : Math.max(0.2, I.tronco * sc), m }); } }
      const cols = (F.colliders || []).filter(c => c && c.x != null && Math.hypot(c.x - SITIO.salida.x, c.z - SITIO.salida.z) < 65 && !/^v18npc/.test(c.id || ''));
      const dCol = (x, z, c) => c.hx ? Math.hypot(Math.max(0, Math.abs(x - c.x) - c.hx), Math.max(0, Math.abs(z - c.z) - c.hz)) : Math.hypot(x - c.x, z - c.z) - (c.r || 0);
      let mT = 99, mojado = 0, solido = 0, pend = 0, peorC = null, peorT = null;
      // cerco de la salida: solo aloja al NPC (~1,4 m de ancho), porque TODO el circuito es aéreo. Basta con
      // su centro: ≥ 0,7 m de colisiones y troncos, sin sólidos bajo sus pies ni agua en su apoyo, y
      // pendiente acotada en su entorno inmediato (anillo de 3 m). La ladera es empinada (≤ 1,3): aceptado
      // y documentado arriba (circuito 100 % aéreo; el NPC se apoya como cualquier NPC de ladera).
      const h0 = H(SITIO.salida.x, SITIO.salida.z);
      const alrededor = [[SITIO.salida.x, SITIO.salida.z]];
      for (let a = 0; a < 8; a++) alrededor.push([SITIO.salida.x + Math.cos(a / 8 * 6.2832) * 3, SITIO.salida.z + Math.sin(a / 8 * 6.2832) * 3]);
      for (const pt of alrededor) { const x = pt[0], z = pt[1], h = H(x, z), esCentro = pt === alrededor[0];
        pend = Math.max(pend, Math.abs(h - h0) / 3);
        if (G.agua && G.agua.levelAt && G.agua.levelAt(x, z) > h - 0.3) mojado++;
        if (!esCentro) continue; // colisiones, troncos y sólidos: solo el centro (donde se apoya el NPC)
        for (const t of tr) { const d = Math.hypot(x - t.x, z - t.z) - t.r; if (d < mT) mT = d; if (d < (peorT ? peorT.d : 99)) peorT = { m: t.m || 'tronco', x: Math.round(t.x), z: Math.round(t.z), d: Math.round(d * 100) / 100 }; }
        for (const c of cols) { const d = dCol(x, z, c); if (d < mT) mT = d; if (d < (peorC ? peorC.d : 99)) peorC = { id: c.id || '?', x: Math.round(c.x), z: Math.round(c.z), d: Math.round(d * 100) / 100 }; }
        if (G.solidos && G.solidos.activo && [0.3, 0.9, 1.5, 2.5].some(y => G.solidos.dentro(x, z, h + y) > -Infinity)) solido++; }
      let pasillo = 99, solPuerta = 0, largo = 0, mTg = 99, peorG = null;
      const tray = SITIO.puertas.concat([SITIO.salida]);
      let ant = SITIO.salida, gi = -1;
      for (const p of tray) {
        gi++;
        if (G.agua && G.agua.levelAt && G.agua.levelAt(p.x, p.z) > H(p.x, p.z) - 0.3) mojado++;
        if (G.solidos && G.solidos.activo && [0.5, 1.2, 2.2].some(y => G.solidos.dentro(p.x, p.z, H(p.x, p.z) + y) > -Infinity)) solPuerta++;
        for (const t of tr) { const d = Math.hypot(p.x - t.x, p.z - t.z) - t.r; if (d < mTg) mTg = d; if (d < (peorG ? peorG.d : 99)) peorG = { puerta: gi, m: t.m, d: Math.round(d * 100) / 100 }; }
        for (const c of cols) { const d = dCol(p.x, p.z, c); if (d < mTg) mTg = d; if (d < (peorG ? peorG.d : 99)) peorG = { puerta: gi, id: c.id || '?', d: Math.round(d * 100) / 100 }; }
        const L = Math.hypot(p.x - ant.x, p.z - ant.z); largo += L;
        // el tramo final entra a la meta rasante a 1,2 m (diseño: se termina volando bajo); el pasillo se mide
        // solo hasta 3 m antes de la salida para no contar esa bajada intencionada
        const hasta = p === SITIO.salida ? Math.max(0, L - 3) : L;
        for (let s2 = 2; s2 <= hasta; s2 += 2) { const x = ant.x + (p.x - ant.x) * s2 / L, z = ant.z + (p.z - ant.z) * s2 / L;
          const yv = (ant.alt != null ? gy(ant) : H(ant.x, ant.z) + 1.2) + (p.alt != null ? gy(p) - (ant.alt != null ? gy(ant) : H(ant.x, ant.z) + 1.2) : H(p.x, p.z) + 1.2 - (ant.alt != null ? gy(ant) : H(ant.x, ant.z) + 1.2)) * s2 / L;
          pasillo = Math.min(pasillo, yv - H(x, z)); }
        ant = p; }
      const puerto = { x: 73.6, z: -75.2 }, golf = G.v18minigolf && G.v18minigolf.sitio, duelo = G.v18combate && G.v18combate.sitio, chispa = G.v18chispa && G.v18chispa.SITIO && (G.v18chispa.SITIO.salida || G.v18chispa.SITIO), /* el SITIO de Chispa es { salida, puntos } */ moon = G.v18moon && G.v18moon.SITIO, misterio = G.v18Misterio && G.v18Misterio.sitio && G.v18Misterio.sitio();
      const dist = q => q ? Math.hypot(q.x - SITIO.salida.x, q.z - SITIO.salida.z) : Infinity;
      const lejos = { puerto: dist(puerto), villa: dist(villa), golf: dist(golf), duelo: dist(duelo), chispa: dist(chispa), moon: dist(moon), misterio: dist(misterio) };
      check('5 · Sitio abierto: salida en seco (centro con ≥ 0,7 m de colisiones y troncos (solo aloja al NPC), pendiente ≤ 1,3 (ladera interior: circuito 100 % aéreo)); ' + tray.length + ' tramos con pasillo ≥ 2,2 m sobre el terreno, puertas sin sólidos y ≥ 1,5 m de troncos; actividades V18 a ≥ 80 m sin solapamiento',
        !mojado && !solido && mT >= 0.7 && pend < 1.3 && solPuerta === 0 && pasillo >= 2.2 && mTg >= 1.5 && [lejos.puerto, lejos.golf, lejos.duelo, lejos.chispa, lejos.moon, lejos.misterio].every(d => d > 80),
        'largo ' + largo.toFixed(0) + ' m · libre ' + mT.toFixed(2) + ' m · pendiente ' + pend.toFixed(2) + ' · mojado ' + mojado + ' · sólidos ' + solido + '/' + solPuerta + ' · pasillo ' + pasillo.toFixed(1) + ' m · puertas-troncos ' + mTg.toFixed(1) + ' m · peorPuerta ' + JSON.stringify(peorG) + ' · peorCol ' + JSON.stringify(peorC) + ' · peorTronco ' + JSON.stringify(peorT) + ' · ' + Object.keys(lejos).map(k => k + ' ' + (isFinite(lejos[k]) ? lejos[k].toFixed(0) : '—')).join(' '));
      // 6 · minimapa
      const mm = mapa();
      check('6 · Marcador del minimapa en el Guardián, con nombre', mm && mm.nombre === TXT.nombre && Math.hypot(mm.x - SITIO.salida.x, mm.z - SITIO.salida.z) < 0.1);
      // 7 · Acción ofrece el circuito; completarlo en orden cronometra la vuelta
      ir(SITIO.salida.x, SITIO.salida.z);
      const it = N.instancia(NPC) && G.interaccion.nearest && G.interaccion.nearest();
      check('7a · Junto al Guardián, Acción ofrece el circuito', it && it.id === 'v18npc_' + NPC && it.label() === TXT.label, it && it.id);
      const g1 = circuito(true); cerrar();
      check('7 · Volando las 5 puertas en orden y volviendo a la salida se completa el circuito, cronometrado', g1 && g1.ultimo && g1.ultimo.gana && g1.sig.join('') === '012345' && g1.ultimo.ms > 0,
        g1 ? JSON.stringify({ ms: g1.ultimo && g1.ultimo.ms, orden: g1.sig.join(''), pasos: g1.pasos }) : 'no empezó');
      const r1 = record();
      check('8 · Resultado y récord en el progreso V18 (mundo.circuito_guardian)', r1 && r1.vueltas === 1 && r1.jugadas === 1 && r1.mejor === g1.ultimo.ms && r1.ultimo !== false && g1.ultimo.nuevo, JSON.stringify(r1));
      check('9 · 30 XP al completar la primera vez', xpDado.length === 1 && xpDado[0][1] === XP_GANAR && r1.xp === true, JSON.stringify(xpDado));
      // 10 · las puertas cuentan EN ORDEN: ir primero a la 2ª no la cuenta
      correr(1); ir(SITIO.salida.x, SITIO.salida.z);
      const p1 = circuito(false); cerrar();
      const r2 = record();
      check('10 · El orden importa: estar 0,7 s en la puerta 2 no la cuenta (sigue en la 1); el circuito solo acaba en la salida tras la 5', p1 && p1.ultimo && p1.ultimo.gana && p1.visto2 === 0 && p1.sig.join('') === '012345' && p1.ultimo.ms > g1.ultimo.ms,
        p1 ? JSON.stringify({ ms: p1.ultimo && p1.ultimo.ms, orden: p1.sig.join(''), visto2: p1.visto2 }) : 'no empezó');
      check('11 · Completar de nuevo no quita el récord mejor ni repite la XP', r2.mejor === r1.mejor && r2.vueltas === 2 && r2.jugadas === 2 && xpDado.length === 1, JSON.stringify(r2));
      // 12 · persiste tras recargar; la XP no se repite (ni con otra vuelta)
      V.recargar(); G.emit('apply'); await esperar(50);
      const r3 = record();
      check('12 · Tras recargar siguen el récord, las vueltas y las jugadas', r3 && r3.mejor === r1.mejor && r3.vueltas === 2 && r3.jugadas === 2 && r3.xp === true, JSON.stringify(r3));
      correr(1); ir(SITIO.salida.x, SITIO.salida.z);
      const g2 = circuito(true); cerrar();
      check('13 · Otra vuelta completada no repite la XP: pagarXP tras recargar no da nada', g2 && g2.ultimo && g2.ultimo.gana && pagarXP() === 0 && xpDado.length === 1 && record().vueltas === 3, JSON.stringify(xpDado));
      // 14 · alejarse cancela; durante el circuito el minimapa marca la puerta siguiente
      ir(SITIO.salida.x, SITIO.salida.z); empezar({ forzar: true }); correr(CUENTA_S + 0.2);
      const mmC = mapa();
      volarA({ x: SITIO.puertas[0].x + R_SALE + 12, z: SITIO.puertas[0].z, alt: 4 }); correr(0.1);
      check('14 · En circuito el minimapa marca la puerta siguiente; alejarse > 80 m cancela sin contar la vuelta', mmC && mmC.nombre === TXT.siguiente && Math.hypot(mmC.x - SITIO.puertas[0].x, mmC.z - SITIO.puertas[0].z) < 0.1 && A.fase === 'nada' && record().jugadas === 3 && toasts.includes(TXT.lejos));
      cerrar();
      for (const r of teclado()) out.push(r); // W35
      // 15 · textos
      if (!window.AV_EN) { try { await AVE.assets.script('content/cap1/en.js'); } catch (e) { /* sin diccionario */ } }
      const D = window.AV_EN || {}, pats = Object.keys(D).filter(k => k.indexOf('{}') >= 0).map(k => new RegExp('^' + k.split('{}').map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('(.+?)') + '$'));
      const tx = textos(), faltan = tx.filter(t => !D[t] && !pats.some(re => re.test(t)));
      check('15 · Todos los textos del Guardián tienen inglés en content/cap1/en.js', !faltan.length, faltan.slice(0, 6).join(' | '));
      check('15b · Ningún texto ni dato menciona el nombre del modelador (directiva V18.3 §1)', !/\x66eix/i.test(tx.join(' ') + JSON.stringify(N.def(NPC))));
      check('16 · No toca el inventario del capítulo', JSON.stringify(S.inv || {}) === inv0);
    } catch (e) { check('Sin excepciones', false, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e); }
    // restaurar
    cerrar(); if (A.fase !== 'nada') { A.fase = 'nada'; pintarHud(); pintarPuertas(0); }
    A.manual = false; A.forzar = false; A.ultimo = null;
    if (evo0 === undefined) delete G.v18evo; else G.v18evo = evo0;
    G.ui.toast = toast0;
    S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z; if (fac0 && S.facing) { S.facing.x = fac0.x; S.facing.z = fac0.z; } G.camara.yaw = yaw0;
    try { if (crudo == null) localStorage.removeItem(V.clave()); else localStorage.setItem(V.clave(), crudo); } catch (e) { /* */ }
    V.recargar(); colocarEnSitio(); N.paso(0.01, false);
    if (titAbierta) tit.open = true; if (cre) cre.hidden = creOculto; try { G.pausa.sincronizar(); } catch (e) { /* sin pausa */ }
    if (susp) susp(false);
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }

  G.v18guardian = { ID, SITIO, RUTA: SITIO.puertas, XP_GANAR, empezar, cancelar, invitar, paso, record, pagarXP, mapa, textos, teclado, estado: () => A, test };
  return G.v18guardian;
};
