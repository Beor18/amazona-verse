/* Juego · V18.1 · Amazona Mini Golf, «La Ruta de las Semillas» · prototipo de UN hoyo (directiva de Kelvin del 5-nov,
   docs/DIRECTIVA_MINIGOLF_V18_1.md). Opcional y repetible: nunca bloquea la historia. Sin monedas, tienda ni ranking.
   - Dónde: hoyo 1 de iniciación en Villa Raíz (sección 3B). El sitio se busca en datos fijos del mapa (terreno, agua, colisiones
     que no son de flora y todas las instancias de árboles, rocas y troncos de vegetacion.js, como combate.js tras QA-174): un
     rectángulo de 18 × 7 m, seco, sin edificios, lejos de la plaza, de los senderos y de la explanada del duelo. En Villa Raíz
     casi no hay claros sin árboles (medido: 3 sitios libres en 70 m, junto al Terreno A o encima del camino al muelle), así
     que se admiten hasta 2 árboles o rocas dentro: se quedan como obstáculos que chocan (círculos), nunca en la salida, el
     nido ni los huecos. No se toca nada del mundo: solo se añaden unas piezas propias (una draw call para los troncos).
   - Cómo se ve: semilla gigante con su franja (rueda de verdad), nido de ramitas con banderín, borde y 2 troncos bajos
     (InstancedMesh, flatShading), una alfombra de salida (zona de activación) y una línea de puntos corta para apuntar.
   - Cómo se juega: Acción junto a la semilla abre el hoyo. Mientras se juega, Vittata no camina: se queda detrás de la semilla
     y la cámara de siempre mira hacia donde apuntas.
       Computadora: ← → (o A D) o arrastrar con el ratón: apuntar · mantener Espacio (o el botón Golpear): fuerza; soltar: golpe
                    · E / Acción: un toque carga, otro golpea · G: Grito del Yunque · R: reiniciar · Esc: salir.
       Táctil: arrastrar o ◀ ▶ para apuntar · mantener Golpear y soltar · Grito · Reiniciar · Salir (botones grandes).
   - Física 2D propia sobre el suelo (paso fijo de 1/120 s: no depende de los FPS): roce, pendiente suave del terreno, rebotes
     círculo-segmento con el borde y los troncos, límite de velocidad, reposo, embudo del nido (entra si va despacio).
     Si sale del área (o cae al agua) vuelve a su último sitio y suma 1 golpe.
   - Grito del Yunque (el poder de Vittata, G.v18hab, sin sistema nuevo): con la semilla rodando, una vez por hoyo; la onda sale
     hacia donde apuntas y, si alcanza la semilla, la empuja en esa dirección (empuje extra y corregir la trayectoria).
   - Puntuación: golpes, par 3, récord local y medalla (oro = par o mejor, plata = par + 1, bronce = completar). Se guarda en el
     progreso V18 (G.v18.mundo('minigolf_villa') = { mejor, medalla }); «Comenzar de cero» lo borra (guardado.js borrarV18).
   - Por turnos (directiva, sección 12): al empezar, «1 jugador» / «2» / «3» / «4 jugadores» (teclas 1–4; Enter, Acción o
     Golpear = 1 jugador). Mismo aparato, sin cuentas ni servidores. Cada jugador tiene su color (franja y aro de su semilla,
     nombre en el HUD), su sitio y sus golpes; el turno pasa cuando la semilla se para, sale o entra; el que ya está en el
     nido se salta. Solo la semilla del turno es física: las demás son marcas fantasma sin choque. Grito: uno por jugador.
     Acaba cuando todos entran (o con 10 golpes: cuenta como terminado con 10). Récord y premios solo con 1 jugador.
   Solo con la bandera V18. Prueba: AV.v18MinigolfTest(). */
window.AVV18Minigolf = function (G) {
  'use strict';
  if (G.v18minigolf) return G.v18minigolf;
  const S = G.S, V = G.v18, HAB = G.v18hab, F = G.fisica, M = F.MOVE, scene = G.renderer.scene;
  const ID = 'minigolf_villa', PAR = 3;
  // Medidas del hoyo (metros, ejes locales: u a lo largo, de la salida al nido; v de lado)
  const L = 18, HW = 3.5, R = 0.36, TRONCO = 0.2, MARGEN = 0.8;
  const TEE = { u: -L / 2 + 1.8, v: 0 }, NIDO = { u: L / 2 - 2.2, v: 0 }, NIDO_R = 0.62;
  const TRONCOS = [{ u: -2.5, v0: -HW, v1: 0.3 }, { u: 2.0, v0: -0.3, v1: HW }]; // dejan un hueco a cada lado: zigzag o rebote
  // Puntos que tienen que quedar libres (salida, nido, huecos y el camino de iniciación entre ellos)
  const CLAVES = [TEE, NIDO, { u: -2.5, v: 1.9 }, { u: 2.0, v: -1.9 }, { u: -1.2, v: 2.0 }, { u: 0.8, v: -2.0 }, { u: 3.8, v: -2.0 }, { u: -5, v: 0.8 }, { u: 5.3, v: -1 }];
  // Física
  const PASO = 1 / 120, VMIN = 1.5, VMAX = 13, ROCE_A = 1.4, ROCE_B = 0.55, PEND = 0.6, REBOTE = 0.62, ROCE_PARED = 0.9,
    REPOSO = 0.12, CAIDA = 3.2, EMBUDO = 3.5, T_MAX = 25, PERIODO = 1.3, GIRO = 1.1;
  const TXT = {
    label: 'Jugar al minigolf', nombre: 'Minigolf de Villa Raíz', invita: 'Minigolf de Villa Raíz: lleva la semilla gigante hasta el nido. Pulsa Acción junto a ella.',
    empieza: '¡Hoyo 1, par 3! Lleva la semilla gigante al nido con los menos golpes.',
    empiezaPar: '¡Hoyo 1, par 3! Par 3 quiere decir que lo ideal es meterla en el nido en 3 golpes.',
    guia: '← → o arrastra: apuntar · Mantén Espacio: fuerza · G: Grito · R: reiniciar · Esc: salir',
    guiaT: 'Arrastra o usa ◀ ▶ para apuntar · Mantén Golpear y suelta',
    fuera: '¡La semilla se salió! Vuelve a su sitio (+1 golpe).', gritoYa: 'El Grito del Yunque ya se usó en este hoyo.',
    gritoQuieta: 'El Grito empuja la semilla mientras rueda.', grito: '¡Grito del Yunque!', otra: 'Otra vez', seguir: 'Seguir explorando',
    sale: '¡Hasta luego! El minigolf te espera en Villa Raíz.', hoyo: 'Hoyo 1 · Villa Raíz', par: 'Par 3', golpe: 'Golpear', soltar: 'Soltar',
    poder: 'Grito', reiniciar: 'Reiniciar', salir: 'Salir', fuerza: 'Fuerza', izq: 'Apuntar a la izquierda', der: 'Apuntar a la derecha',
    nuevo: '¡Nuevo récord!', sinRecord: 'Récord: —', usado: 'Grito usado',
    oro: 'Medalla de oro', plata: 'Medalla de plata', bronce: 'Medalla de bronce',
    elige: '¿Cuántos juegan?', eligeSub: 'Por turnos, en este mismo aparato', j1: '1 jugador', j2: '2 jugadores', j3: '3 jugadores', j4: '4 jugadores',
    empate: '¡Empate!', sinPremios: 'En partidas por turnos no hay premios ni récord', tope: '¡10 golpes! Cuenta como terminado.',
    oroC: 'Oro', plataC: 'Plata', bronceC: 'Bronce',
    premio1: '¡Primer hoyo completado! Ganaste 3 fibras: sirven igual que la madera para reparar.', premioOro: '¡Primera medalla de oro! Ganaste 2 maderas.'
  };
  // Premios (Kelvin 5-nov), una sola vez por logro, al inventario de siempre: la fibra cuenta como madera (reparar.js, BM148)
  const PREMIOS = [
    { clave: 'minigolf_villa_completo', marca: 'minigolf_completo', madera: 3, txt: 'premio1', cuando: () => true },
    { clave: 'minigolf_villa_oro', marca: 'minigolf_oro', madera: 2, txt: 'premioOro', cuando: med => med === 'oro' }
  ];
  function premiar(med) {
    const dados = [];
    for (const p of PREMIOS) {
      if (!V || !p.cuando(med) || !V.otorgar(p.clave, p.marca, 1)) continue;
      if (!S.inv) S.inv = {};
      S.inv.madera = (S.inv.madera || 0) + p.madera; dados.push(p);
    }
    if (dados.length) {
      try { G.objetos.renderInv(); } catch (e) { /* HUD */ }
      try { if (G.guardado.save) G.guardado.save(true); else G.guardado.autosave(); } catch (e) { /* guardado */ } // QA-162
    }
    return dados;
  }
  // Por turnos (2–4 jugadores en el mismo aparato)
  const MAX_J = 4, TOPE = 10, ESPERA = 1.0, COLORES = ['#ff6b5a', '#4fb3ff', '#6fdc6a', '#c58cff'];
  const nombre = i => 'Jugador ' + (i + 1), turnoTxt = i => 'Turno: ' + nombre(i), ganaTxt = i => '¡Gana ' + nombre(i) + '!';
  const jugTxt = (i, n) => nombre(i) + ': ' + n, nidoJTxt = (i, n) => nombre(i) + (n === 1 ? ': ¡Al nido en 1 golpe!' : ': ¡Al nido en ' + n + ' golpes!');
  const golpesTxt = n => 'Golpes: ' + n, recordTxt = n => 'Récord: ' + n, nidoTxt = n => n === 1 ? '¡Al nido en 1 golpe!' : '¡Al nido en ' + n + ' golpes!';
  const TACTIL = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  const sonar = (n, a) => { try { G.audio.play(n, a); } catch (e) { /* sin audio */ } };
  const toast = (t, ms) => { try { G.ui.toast(t, ms || 2400); } catch (e) { /* sin interfaz */ } };
  const fx = (k, x, y, z, n) => { try { G.fx.burst(x, y, z, k, n || 8); } catch (e) { /* sin fx */ } };
  const emitir = ev => { try { G.emit('v18minigolf', ev); } catch (e) { /* sin oyentes */ } };
  // QA: «¡Descubriste…!» tapaba la invitación; espera a que no haya otro aviso en pantalla
  const avisoLibre = () => { const t = document.getElementById('toast'); return !t || t.hidden; };
  const H = (x, z) => G.terreno.height(x, z);
  const agua = (x, z) => { try { return G.agua && G.agua.levelAt ? G.agua.levelAt(x, z) : -Infinity; } catch (e) { return -Infinity; } };

  // ---------- Sitio ----------
  // Solo datos fijos (como combate.js tras QA-174): sale igual en cada carga. Dos zonas abiertas y bastante planas de Villa Raíz
  // medidas en el mapa (la orilla seca al sureste de la plaza y el llano al este, camino del Terreno A); se prueban ±8 m y doce
  // giros alrededor de cada una y gana la de menos árboles dentro (≤ 2), luego la más plana y la más cercana a su ancla.
  const GIROS = Array.from({ length: 12 }, (_, i) => i * Math.PI / 12), ANCLAS = [{ x: 184, z: 204, a: GIROS }, { x: 185, z: 157, a: GIROS }];
  const FIJOS = new Set(['edificio', 'estructura', 'taller']);
  function flora(cx, cz, Rr) {
    const VG = G.vegetacion, P = VG && VG.instancias, inf = VG && VG.info, out = [];
    if (!P || !inf) return out;
    for (const m in P) {
      const I = inf[m], PM = P[m], roca = /roca|piedra|tronco_caido/.test(m); if (!I || !PM || (!roca && !(I.tronco >= 0.08))) continue;
      for (let i = 0; i < PM.n; i++) {
        const x = PM.pos[i * 4], z = PM.pos[i * 4 + 2], sc = PM.pos[i * 4 + 3];
        if (Math.abs(x - cx) < Rr && Math.abs(z - cz) < Rr) out.push({ x, z, r: roca ? Math.max(0.5, (I.ancho || 1) * 0.5 * sc) : Math.max(0.2, I.tronco * sc) });
      }
    }
    return out;
  }
  function marco(cx, cz, a) {
    const ux = Math.cos(a), uz = Math.sin(a);
    return { x: cx, z: cz, a, ux, uz, vx: -uz, vz: ux };
  }
  const aMundo = (K, u, v) => ({ x: K.x + K.ux * u + K.vx * v, z: K.z + K.uz * u + K.vz * v });
  const aLocal = (K, x, z) => { const dx = x - K.x, dz = z - K.z; return { u: dx * K.ux + dz * K.uz, v: dx * K.vx + dz * K.vz }; };
  function evaluar(K, lista, cols, evitar, tope) {
    for (const e of evitar) if (Math.hypot(K.x - e.x, K.z - e.z) < e.r + L / 2) return null;
    for (const c of cols) { const q = aLocal(K, c.x, c.z), r = (c.r || Math.hypot(c.hx || 1, c.hz || 1)) + MARGEN; if (Math.abs(q.u) < L / 2 + r && Math.abs(q.v) < HW + r) return null; }
    // Árboles o rocas dentro: se quedan como obstáculos del hoyo (no se toca el bosque), pero nunca en la salida, el nido o
    // los huecos de los troncos; lo barato primero
    const arboles = [];
    for (const o of lista) {
      const q = aLocal(K, o.x, o.z); if (Math.abs(q.u) >= L / 2 + o.r || Math.abs(q.v) >= HW + o.r) continue;
      if (arboles.length >= tope || CLAVES.some(c => Math.hypot(q.u - c.u, q.v - c.v) < 1.7 + o.r)) return null;
      arboles.push(o);
    }
    const troncos = arboles.length;
    let mn = Infinity, mx = -Infinity;
    for (let u = -L / 2 - MARGEN; u <= L / 2 + MARGEN + 1e-6; u += 0.5) for (let v = -HW - MARGEN; v <= HW + MARGEN + 1e-6; v += 0.5) {
      const p = aMundo(K, u, v), h = H(p.x, p.z);
      if (agua(p.x, p.z) > h - 0.3) return null; // ni gota de agua dentro (ni en el margen)
      mn = Math.min(mn, h); mx = Math.max(mx, h);
    }
    return { troncos, arboles, rango: mx - mn };
  }
  // Solo para la prueba (diagnóstico): rejilla amplia alrededor de la plaza, sitios sin troncos ni agua
  function explorar(radio, paso) {
    const pl = G.terreno.places || {}, v0 = pl.villa || { x: S.pos.x, z: S.pos.z }, out = [];
    const lista = flora(v0.x, v0.z, radio + L), cols = (F.colliders || []).filter(k => k && FIJOS.has(k.kind) && k.x != null && k.z != null);
    const evitar = [{ x: v0.x, z: v0.z, r: 4 }]; if (G.v18combate && G.v18combate.sitio) evitar.push({ x: G.v18combate.sitio.x, z: G.v18combate.sitio.z, r: 14 });
    for (let dx = -radio; dx <= radio; dx += paso) for (let dz = -radio; dz <= radio; dz += paso) {
      if (Math.hypot(dx, dz) > radio) continue;
      for (const a of GIROS) { const K = marco(v0.x + dx, v0.z + dz, a), e = evaluar(K, lista, cols, evitar, 0); if (e && e.rango < 2.6) out.push([K.x, K.z, +a.toFixed(2), +e.rango.toFixed(2)]); }
    }
    return out.sort((p, q) => p[3] - q[3]);
  }
  function buscarSitio() {
    const pl = G.terreno.places || {}, villa = pl.villa || pl.plaza || null;
    const c = G.v18combate && G.v18combate.sitio, evitar = [];
    if (villa) evitar.push({ x: villa.x, z: villa.z, r: 4 });
    if (c) evitar.push({ x: c.x, z: c.z, r: 12 + 2 });
    let mejor = null;
    const anclas = villa && Math.hypot(villa.x - 150, villa.z - 170) < 30 ? ANCLAS : [{ x: (villa || S.pos).x + 24, z: (villa || S.pos).z + 20, a: [0, 0.52, 1.05] }];
    for (const A of anclas) {
      const lista = flora(A.x, A.z, L / 2 + HW + 18);
      const cols = (F.colliders || []).filter(k => k && FIJOS.has(k.kind) && k.x != null && k.z != null && Math.hypot(k.x - A.x, k.z - A.z) < L + 12);
      for (let dx = -8; dx <= 8; dx += 1) for (let dz = -8; dz <= 8; dz += 1) for (const a of A.a) {
        const K = marco(A.x + dx, A.z + dz, a), e = evaluar(K, lista, cols, evitar, mejor ? Math.min(2, mejor.troncos) : 2); if (!e || e.rango > 2.6) continue;
        const p = e.troncos * 30 + e.rango * 10 + Math.hypot(dx, dz) * 0.3;
        if (!mejor || p < mejor.p) mejor = { K, p, troncos: e.troncos, arboles: e.arboles, rango: e.rango };
      }
      if (mejor && mejor.troncos === 0) break; // la primera zona limpia gana (la orilla, más cerca de la plaza)
    }
    if (!mejor) { const A = anclas[0]; mejor = { K: marco(A.x, A.z, A.a[0]), troncos: -1, arboles: [], rango: -1 }; }
    // La salida queda en el extremo más cercano a la plaza
    let K = mejor.K;
    if (villa) { const a = aMundo(K, -L / 2, 0), b = aMundo(K, L / 2, 0); if (Math.hypot(b.x - villa.x, b.z - villa.z) < Math.hypot(a.x - villa.x, a.z - villa.z)) K = marco(K.x, K.z, K.a + Math.PI); }
    return Object.assign(K, { troncos: mejor.troncos, arboles: mejor.arboles.map(o => ({ x: o.x, z: o.z, r: o.r })), rango: mejor.rango });
  }

  // ---------- Escena ----------
  const matMadera = new THREE.MeshStandardMaterial({ color: '#7a5230', roughness: 0.95, metalness: 0, flatShading: true });
  const geoTronco = new THREE.CylinderGeometry(TRONCO, TRONCO, 1, 7);
  const troncos = new THREE.InstancedMesh(geoTronco, matMadera, 40);
  const nido = new THREE.Group(); nido.name = 'v18_golf_nido';
  {
    const aro = new THREE.Mesh(new THREE.TorusGeometry(NIDO_R + 0.12, 0.2, 6, 18), new THREE.MeshStandardMaterial({ color: '#9a7443', roughness: 1, flatShading: true }));
    aro.rotation.x = Math.PI / 2; nido.add(aro);
    const fondo = new THREE.Mesh(new THREE.CircleGeometry(NIDO_R + 0.02, 18), new THREE.MeshStandardMaterial({ color: '#3b2a17', roughness: 1 }));
    fondo.rotation.x = -Math.PI / 2; fondo.position.y = 0.03; nido.add(fondo);
    const palo = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.2, 6), matMadera); palo.position.set(NIDO_R + 0.3, 1.1, 0); nido.add(palo);
    const ban = new THREE.Shape(); ban.moveTo(0, 0); ban.lineTo(0.75, -0.22); ban.lineTo(0, -0.45);
    const banderin = new THREE.Mesh(new THREE.ShapeGeometry(ban), new THREE.MeshStandardMaterial({ color: '#f2a03d', roughness: 0.8, side: THREE.DoubleSide, flatShading: true }));
    banderin.position.set(NIDO_R + 0.32, 2.15, 0); nido.add(banderin); nido.userData.banderin = banderin;
  }
  const semilla = new THREE.Group(); semilla.name = 'v18_golf_semilla';
  {
    const cuerpo = new THREE.Mesh(new THREE.SphereGeometry(R, 18, 14), new THREE.MeshStandardMaterial({ color: '#c98f45', roughness: 0.7, flatShading: true }));
    const franja = new THREE.Mesh(new THREE.TorusGeometry(R * 0.98, 0.045, 6, 22), new THREE.MeshStandardMaterial({ color: '#6b4220', roughness: 0.8 }));
    semilla.add(cuerpo, franja); semilla.userData.franja = franja;
  }
  const FRANJA0 = '#6b4220';
  // Aro de color bajo la semilla del turno y marcas fantasma (sin choque) de los demás jugadores
  const geoAro = new THREE.RingGeometry(R + 0.06, R + 0.2, 28);
  const aroTurno = new THREE.Mesh(geoAro, new THREE.MeshBasicMaterial({ color: COLORES[0], transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
  aroTurno.rotation.x = -Math.PI / 2; aroTurno.renderOrder = 3; aroTurno.name = 'v18_golf_aro';
  const fantasmas = COLORES.map((c, i) => {
    const g = new THREE.Group(); g.name = 'v18_golf_fantasma' + (i + 1);
    const bola = new THREE.Mesh(new THREE.SphereGeometry(R, 14, 10), new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, transparent: true, opacity: 0.45, depthWrite: false, flatShading: true }));
    const aro = new THREE.Mesh(geoAro, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide }));
    aro.rotation.x = -Math.PI / 2; aro.position.y = -R * 0.9; aro.renderOrder = 3; g.add(bola, aro); return g;
  });
  const salida = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.25, 40), new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }));
  salida.rotation.x = -Math.PI / 2; salida.renderOrder = 3; salida.name = 'v18_golf_salida';
  // Mira: naranja vivo y algo más grande (QA con input real: crema sobre la arena no se distinguía)
  const N_PUNTOS = 8, puntos = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff6a2b', transparent: true, opacity: 0.95, depthWrite: false }), N_PUNTOS);
  puntos.name = 'v18_golf_mira';
  troncos.name = 'v18_golf_troncos';
  for (const m of [troncos, nido, semilla, salida, puntos, aroTurno, ...fantasmas]) { m.frustumCulled = false; m.visible = false; scene.add(m); }
  troncos.castShadow = false; puntos.renderOrder = 4;
  const _o = new THREE.Object3D(), _q = new THREE.Quaternion(), _ax = new THREE.Vector3(), _y = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3();

  // Segmentos de colisión (mundo) y piezas de tronco que los dibujan
  let K = null, SEGS = [], OBST = [], P_NIDO = null, P_TEE = null, P_ENTRADA = null;
  function montar(k) {
    K = k; SEGS = []; OBST = (K.arboles || []).slice(); troncos.count = 40;
    const seg = (u0, v0, u1, v1) => { const a = aMundo(K, u0, v0), b = aMundo(K, u1, v1); SEGS.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z, r: TRONCO }); };
    seg(-L / 2, -HW, L / 2, -HW); seg(-L / 2, HW, L / 2, HW); seg(-L / 2, -HW, -L / 2, HW); seg(L / 2, -HW, L / 2, HW);
    for (const t of TRONCOS) seg(t.u, t.v0, t.u, t.v1);
    let n = 0;
    for (const s of SEGS) {
      const len = Math.hypot(s.bx - s.ax, s.bz - s.az), piezas = Math.max(1, Math.ceil(len / 3));
      for (let i = 0; i < piezas && n < troncos.count; i++) {
        const x0 = s.ax + (s.bx - s.ax) * i / piezas, z0 = s.az + (s.bz - s.az) * i / piezas, x1 = s.ax + (s.bx - s.ax) * (i + 1) / piezas, z1 = s.az + (s.bz - s.az) * (i + 1) / piezas;
        const y0 = H(x0, z0) + TRONCO * 0.75, y1 = H(x1, z1) + TRONCO * 0.75;
        _d.set(x1 - x0, y1 - y0, z1 - z0); const l = _d.length() + TRONCO * 0.6; _d.normalize();
        _o.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); _o.quaternion.setFromUnitVectors(_y, _d); _o.scale.set(1, l, 1); _o.updateMatrix();
        troncos.setMatrixAt(n++, _o.matrix);
      }
    }
    troncos.count = n; troncos.instanceMatrix.needsUpdate = true;
    P_NIDO = aMundo(K, NIDO.u, NIDO.v); P_TEE = aMundo(K, TEE.u, TEE.v); P_ENTRADA = aMundo(K, -L / 2 - 1.3, 0);
    nido.position.set(P_NIDO.x, H(P_NIDO.x, P_NIDO.z) + 0.02, P_NIDO.z); nido.rotation.y = -K.a;
    salida.position.set(P_TEE.x, H(P_TEE.x, P_TEE.z) + 0.06, P_TEE.z);
    if (it) { it.x = P_TEE.x; it.z = P_TEE.z; }
    if (A.fase === 'nada') ponerSemilla(P_TEE.x, P_TEE.z);
  }

  // ---------- Estado ----------
  const A = { fase: 'nada', golpes: 0, carga: 0, cargaT: 0, cargando: false, grito: false, giro: 0, manual: false, acc: 0, t: 0, nidoT: 0, timers: [],
    rebotes: 0, fueras: 0, ultimo: null, invitado: false, resultado: null, eligiendo: false, njug: 1, turno: 0, esperaT: 0, hundir: false };
  let J = []; // jugadores de la partida: { golpes, x, z, ultimo, grito, f, dentro, tope }
  const multi = () => A.njug > 1;
  const B = { x: 0, y: 0, z: 0, vx: 0, vz: 0, mov: false, t: 0 };
  const pos = { x: 0, y: 0, z: 0 }; // la semilla como blanco del Grito (habilidades.js lee .pos)
  function ponerSemilla(x, z) { B.x = x; B.z = z; B.vx = B.vz = 0; B.mov = false; B.t = 0; B.y = H(x, z) + R * 0.95; semilla.position.set(B.x, B.y, B.z); }
  const record = () => { const r = V && V.mundo(ID); return r && typeof r === 'object' && r.mejor > 0 ? r : null; };
  const medalla = n => n <= PAR ? 'oro' : n === PAR + 1 ? 'plata' : 'bronce';
  const RANGO_M = { oro: 3, plata: 2, bronce: 1 };
  // Hacia dónde se apunta: hacia donde mira la cámara de siempre (arrastrar ya la gira)
  const dir = () => { const y = G.camara.yaw; return { x: -Math.sin(y), z: -Math.cos(y) }; };
  function apuntarA(x, z) { const dx = x - B.x, dz = z - B.z; G.camara.yaw = Math.atan2(-dx, -dz); }
  function otroActivo() {
    for (const o of [G.v18combate, G.v18amenaza, G.v18serpiente, G.v18sapo, G.v18duelo2]) {
      try { const f = o && o.estado && o.estado().fase; if (f && f !== 'nada' && f !== 'disuelve' && f !== 'deshace' && f !== 'despierta') return true; } catch (e) { /* */ }
    }
    return false;
  }
  function libre() {
    const $ = id => document.getElementById(id), oculto = id => !$(id) || $(id).hidden;
    try {
      if ($('c1-fade') || (G.dialogo && G.dialogo.open && G.dialogo.open()) || G.ui.cardOpen || (G.ui.busy && G.ui.busy())) return false;
      return oculto('end') && oculto('comic') && oculto('creator');
    } catch (e) { return false; }
  }
  // QA-189 (coordinadora 6-nov): la estación solo se ofrece en Villa Raíz (cap. 1). En los demás packs no hay hoyo que
  // ofrecer: sin invitación, sin piezas, sin interacción, sin inicio (en ep4 el jugador nacía junto al hoyo y Acción
  // abría «¿Cuántos juegan?» en vez de seguir la historia). La comprobación es dinámica (lee G.pack.id en cada uso).
  const ofrecible = () => !!(G.pack && G.pack.id === 'cap1');
  // Su interacción es la de menor prioridad: si cualquier otra interacción está al alcance (la de la historia, p. ej.
  // «Hablar con Iguaca», u otra estación v18), el hoyo cede y no compite con ella: la historia manda.
  function otraCerca() {
    for (const o of G.interaccion.list) {
      if (o === it) continue;
      if (o.visible) { let v; try { v = o.visible(); } catch (e) { v = false; } if (!v) continue; }
      if (Math.hypot(S.pos.x - o.x, S.pos.z - o.z) < o.r) return true;
    }
    return false;
  }

  // ---------- Partida ----------
  let parVisto = false; // «par 3» se explica una vez por sesión
  let f = null; // luchador del Grito (habilidades.js): energía y espera propias del hoyo
  function iniciar(o) {
    o = o || {};
    if (A.fase !== 'nada' || !K) return false;
    if (!ofrecible()) return false; // QA-189: fuera de Villa Raíz el hoyo no se ofrece ni siquiera forzado
    if (!o.forzar && (!libre() || otroActivo())) return false;
    if (M.flying) { try { F.endFlight(); } catch (e) { /* ya en el suelo */ } }
    A.fase = 'apuntar'; A.njug = 1; A.eligiendo = true;
    enganchar(); empezarHoyo(); montarHud(); hud.el.hidden = false; paneles(); pintar(true);
    toast(parVisto ? TXT.empieza : TXT.empiezaPar, parVisto ? 3000 : 4200); parVisto = true; emitir({ tipo: 'empieza' });
    return true;
  }
  function empezarHoyo() {
    Object.assign(A, { golpes: 0, carga: 0, cargaT: 0, cargando: false, grito: false, acc: 0, nidoT: 0, rebotes: 0, fueras: 0, resultado: null, turno: 0, esperaT: 0, hundir: false });
    A.timers.length = 0; A.fase = 'apuntar';
    ponerSemilla(P_TEE.x, P_TEE.z); A.ultimo = { x: B.x, z: B.z }; semilla.scale.setScalar(1);
    const luchador = i => HAB ? HAB.luchador({ id: i ? 'golf' + (i + 1) : 'golf', especie: 'vittata', poder: 'grito_yunque', pos: S.pos, mira: dir }) : null;
    J = Array.from({ length: A.njug }, (_, i) => ({ golpes: 0, x: P_TEE.x, z: P_TEE.z, ultimo: { x: P_TEE.x, z: P_TEE.z }, grito: false, f: luchador(i), dentro: false, tope: false }));
    f = J[0].f; colorTurno();
    apuntarA(P_NIDO.x, P_NIDO.z); seguir(0, true);
    try { G.camara.place(true); } catch (e) { /* cámara */ }
    paneles();
  }
  // Elegir cuántos juegan (solo al empezar; 1 jugador deja la partida tal cual)
  function elegir(n) {
    n = Math.max(1, Math.min(MAX_J, n | 0 || 1));
    if (!A.eligiendo || A.fase !== 'apuntar') return false;
    A.eligiendo = false;
    if (n !== A.njug) { A.njug = n; empezarHoyo(); }
    if (n > 1) toast(turnoTxt(0), 2000);
    paneles(); pintar(true); emitir({ tipo: 'jugadores', n });
    return true;
  }
  function colorTurno() {
    semilla.userData.franja.material.color.set(multi() ? COLORES[A.turno] : FRANJA0);
    aroTurno.material.color.set(COLORES[A.turno] || COLORES[0]);
  }
  // Turnos: guarda al que acaba de tirar y, tras una pausa corta, pasa al siguiente que no esté en el nido
  function guardarJ() { const j = J[A.turno]; if (!j) return; Object.assign(j, { golpes: A.golpes, x: B.x, z: B.z, ultimo: A.ultimo, grito: A.grito, f }); }
  function cargarJ(i) {
    const j = J[i]; A.turno = i; A.golpes = j.golpes; A.grito = j.grito; A.ultimo = j.ultimo; f = j.f;
    A.timers.length = 0; A.cargando = false; A.carga = 0; A.hundir = false; A.nidoT = 0; semilla.scale.setScalar(1);
    ponerSemilla(j.x, j.z); colorTurno(); apuntarA(P_NIDO.x, P_NIDO.z); seguir(0, true);
    A.fase = 'apuntar'; toast(turnoTxt(i), 1800); emitir({ tipo: 'turno', jugador: i }); pintar(true);
  }
  function siguiente() {
    for (let k = 1; k <= J.length; k++) { const i = (A.turno + k) % J.length; if (!J[i].dentro && !J[i].tope) return i; }
    return -1;
  }
  function finTurno() {
    guardarJ(); const j = J[A.turno];
    if (!j.dentro && j.golpes >= TOPE) { j.golpes = A.golpes = TOPE; j.tope = true; toast(TXT.tope, 2000); }
    A.timers.length = 0; A.cargando = false; B.mov = false; B.vx = B.vz = 0;
    A.fase = 'turno'; A.esperaT = ESPERA; pintar();
  }
  // Tabla final: por golpes (empate = mismo puesto), medalla de cada uno y quién gana
  function clasificar(js) {
    const filas = js.map((j, i) => ({ i, golpes: j.golpes, tope: !!j.tope, medalla: medalla(j.golpes) })).sort((a, b) => a.golpes - b.golpes || a.i - b.i);
    filas.forEach((r, k) => { r.puesto = k && filas[k - 1].golpes === r.golpes ? filas[k - 1].puesto : k + 1; });
    const empate = filas.length > 1 && filas[1].golpes === filas[0].golpes;
    return { filas, ganador: empate ? -1 : filas[0].i, empate, txt: empate ? TXT.empate : ganaTxt(filas[0].i) };
  }
  function resultados() {
    A.fase = 'nido'; A.cargando = false; B.mov = false;
    const c = clasificar(J);
    A.resultado = { multi: true, jugadores: c.filas.map(r => Object.assign({}, r)), ganador: c.ganador, empate: c.empate, premios: [], nuevo: false };
    const y = H(P_NIDO.x, P_NIDO.z); fx('gold', P_NIDO.x, y + 0.6, P_NIDO.z, 18); sonar('unlock'); toast(c.txt, 3200);
    if (hud) {
      const f1 = hud.q('fin1'); f1.textContent = c.txt; f1.style.color = c.empate ? '' : COLORES[c.ganador];
      hud.q('tabla').innerHTML = c.filas.map(r => `<div class="vg-fila"><b>${r.puesto}.</b><span style="color:${COLORES[r.i]}">${nombre(r.i)}</span>` +
        `<span>${golpesTxt(r.golpes)}</span><span class="vg-m" data-m="${r.medalla}">${TXT[r.medalla + 'C']}</span></div>`).join('');
      hud.q('fin3').textContent = TXT.sinPremios;
    }
    paneles(); emitir({ tipo: 'final', ganador: c.ganador, empate: c.empate }); pintar(true);
  }
  // Qué panel del HUD se ve: elegir jugadores, controles o resultado
  function paneles() {
    if (!hud) return;
    const fin = A.fase === 'nido', m = !!(A.resultado && A.resultado.multi);
    hud.el.classList.toggle('vg-lado', A.eligiendo || (fin && m)); // W29a: paneles altos (elegir jugadores, tabla de varios): no llegan a la columna de botones de la derecha
    hud.q('elige').hidden = !A.eligiendo || fin; hud.q('bot').hidden = A.eligiendo || fin; hud.q('fin').hidden = !fin;
    hud.q('tabla').hidden = !m; hud.q('fin2').hidden = m; hud.q('jugs').hidden = !multi() || fin;
    hud.q('barraW').hidden = hud.q('fuerzaEt').hidden = fin || A.eligiendo; // la barra de fuerza vacía no pinta nada en el resultado
    if (!m) { hud.q('fin1').style.color = ''; }
  }
  function reiniciar() { if (A.fase === 'nada') return false; empezarHoyo(); pintar(true); emitir({ tipo: 'reinicia' }); return true; }
  function salir(motivo) {
    if (A.fase === 'nada') return false;
    A.fase = 'nada'; A.cargando = false; A.timers.length = 0; soltar();
    A.eligiendo = false; A.njug = 1; A.turno = 0; A.hundir = false; J = []; colorTurno(); aroTurno.visible = false; for (const g of fantasmas) g.visible = false;
    if (hud) hud.el.hidden = true;
    ponerSemilla(P_TEE.x, P_TEE.z); semilla.scale.setScalar(1); puntos.visible = false;
    S.pos.x = P_ENTRADA.x; S.pos.z = P_ENTRADA.z; S.pos.y = H(S.pos.x, S.pos.z) + 0.05; S.vy = 0; M.vx = M.vz = 0;
    if (motivo) toast(motivo, 2600);
    emitir({ tipo: 'sale' });
    return true;
  }
  function empezarCarga() {
    if (A.fase !== 'apuntar' || A.cargando) return false;
    if (A.eligiendo) elegir(1); // golpear sin elegir = 1 jugador
    A.cargando = true; A.cargaT = 0; A.carga = 0; return true;
  }
  function soltarCarga() {
    if (!A.cargando) return false;
    A.cargando = false; return tirar(Math.max(0.06, A.carga));
  }
  // Golpe: p de 0 a 1 (la fuerza), hacia donde se apunta
  function tirar(p) {
    if (A.fase !== 'apuntar') return false;
    if (A.eligiendo) elegir(1);
    const d = dir(), v0 = VMIN + (VMAX - VMIN) * Math.max(0, Math.min(1, p));
    A.ultimo = { x: B.x, z: B.z };
    B.vx = d.x * v0; B.vz = d.z * v0; B.mov = true; B.t = 0;
    A.golpes++; A.fase = 'rueda'; A.carga = 0;
    sonar('dash'); fx('dust', B.x, B.y - R * 0.6, B.z, 6);
    emitir({ tipo: 'golpe', n: A.golpes, p }); pintar();
    return true;
  }
  function grito() {
    if (A.fase !== 'rueda') { if (A.fase === 'apuntar') toast(TXT.gritoQuieta, 1800); return { ok: false, motivo: 'quieta' }; }
    if (A.grito) { toast(TXT.gritoYa, 1800); return { ok: false, motivo: 'usado' }; }
    if (!HAB || !f) return { ok: false, motivo: 'sin poderes' };
    pos.x = B.x; pos.y = B.y; pos.z = B.z;
    const blanco = { id: 'semilla', pos };
    const r = HAB.usar(f, 'grito_yunque', {
      otro: blanco, golpear: (b, g) => empujar(g), despues: (s, fn) => A.timers.push({ t: s, fn }),
      onda: (o, d, al) => { try { if (G.v18fx && G.v18fx.onda) G.v18fx.onda(o, { x: d.x, y: 0, z: d.z }, al); } catch (e) { /* efecto */ } },
      poder: ev => { try { G.emit('v18poder', ev); } catch (e) { /* sin oyentes */ } }, sonar, fx: (k, x, y, z) => fx(k, x, y, z)
    });
    if (!r.ok) return r;
    A.grito = true; toast(TXT.grito, 1200); emitir({ tipo: 'grito' }); pintar();
    return r;
  }
  // La onda alcanza la semilla: la lleva hacia donde apuntas (empuje extra y corrige la trayectoria), sin pasar del límite
  function empujar(g) {
    if (A.fase !== 'rueda') return false;
    const d = g && g.dir ? g.dir : dir(), sp = Math.hypot(B.vx, B.vz), v = Math.min(VMAX, sp * 0.45 + (g && g.empuje ? g.empuje : 15) * 0.45);
    B.vx = d.x * v; B.vz = d.z * v; B.mov = true; B.t = Math.min(B.t, T_MAX - 6);
    fx('feathers', B.x, B.y + 0.3, B.z, 6); emitir({ tipo: 'empuje', v });
    return true;
  }
  function fuera() {
    A.fueras++; A.golpes++;
    ponerSemilla(A.ultimo.x, A.ultimo.z); A.fase = 'apuntar';
    toast(TXT.fuera, 2200); sonar('wrong'); emitir({ tipo: 'fuera', n: A.golpes }); pintar();
    if (multi()) finTurno();
  }
  function alNido() {
    B.mov = false; B.vx = B.vz = 0; A.nidoT = 0; A.cargando = false; A.hundir = true;
    if (multi()) { // por turnos: sin récord ni premios; entra y pasa el turno
      const i = A.turno, n = A.golpes; J[i].dentro = true;
      const y = H(P_NIDO.x, P_NIDO.z); fx('gold', P_NIDO.x, y + 0.6, P_NIDO.z, 12); fx('feathers', P_NIDO.x, y + 0.8, P_NIDO.z, 8); sonar('unlock');
      toast(nidoJTxt(i, n), 2600); emitir({ tipo: 'nido', jugador: i, golpes: n, medalla: medalla(n), nuevo: false });
      finTurno(); return;
    }
    A.fase = 'nido';
    const n = A.golpes, med = medalla(n), r0 = record(), nuevo = !r0 || n < r0.mejor;
    if (nuevo && V) V.cambiarMundo(ID, { mejor: n, medalla: med });
    const r = record() || { mejor: n, medalla: med };
    const dados = premiar(med);
    A.resultado = { golpes: n, medalla: med, nuevo, mejor: r.mejor, premios: dados.map(p => p.clave) };
    const y = H(P_NIDO.x, P_NIDO.z);
    fx('gold', P_NIDO.x, y + 0.6, P_NIDO.z, 14); fx('feathers', P_NIDO.x, y + 0.8, P_NIDO.z, 10); sonar('unlock');
    toast(nidoTxt(n), 3200);
    dados.forEach((p, i) => setTimeout(() => toast(TXT[p.txt], 3600), G.quiet ? 0 : 1600 * (i + 1)));
    if (hud) {
      hud.q('fin1').textContent = nidoTxt(n); hud.q('fin2').textContent = TXT[med]; hud.q('fin2').dataset.m = med;
      hud.q('fin3').textContent = nuevo ? TXT.nuevo : recordTxt(r.mejor);
      hud.q('fin').hidden = false; hud.q('bot').hidden = true;
    }
    paneles();
    emitir({ tipo: 'nido', golpes: n, medalla: med, nuevo });
    pintar(true);
  }

  // ---------- Física (paso fijo) ----------
  function sub(h) {
    for (let i = A.timers.length - 1; i >= 0; i--) { const t = A.timers[i]; t.t -= h; if (t.t <= 0) { A.timers.splice(i, 1); pos.x = B.x; pos.y = B.y; pos.z = B.z; t.fn(); } }
    if (!B.mov) return;
    B.t += h;
    // pendiente del terreno (suave: la semilla rueda cuesta abajo, pero el roce la para)
    const gx = (H(B.x + 0.3, B.z) - H(B.x - 0.3, B.z)) / 0.6, gz = (H(B.x, B.z + 0.3) - H(B.x, B.z - 0.3)) / 0.6;
    B.vx -= 9.8 * PEND * gx * h; B.vz -= 9.8 * PEND * gz * h;
    // embudo del nido: cerca y despacio, se va hacia el centro
    const nx = P_NIDO.x - B.x, nz = P_NIDO.z - B.z, dn = Math.hypot(nx, nz);
    let sp = Math.hypot(B.vx, B.vz);
    if (dn < NIDO_R * 1.9 && dn > 1e-3 && sp < CAIDA * 1.4) { B.vx += nx / dn * EMBUDO * h; B.vz += nz / dn * EMBUDO * h; }
    // roce
    sp = Math.hypot(B.vx, B.vz);
    if (sp > 0) { const k = Math.max(0, sp - (ROCE_A + ROCE_B * sp) * h) / sp; B.vx *= k; B.vz *= k; sp *= k; }
    if (sp > VMAX) { B.vx *= VMAX / sp; B.vz *= VMAX / sp; sp = VMAX; }
    const x0 = B.x, z0 = B.z;
    B.x += B.vx * h; B.z += B.vz * h;
    // choques círculo-segmento (borde y troncos): saca la semilla y rebota
    for (const s of SEGS) {
      const ex = s.bx - s.ax, ez = s.bz - s.az, l2 = ex * ex + ez * ez || 1;
      const t = Math.max(0, Math.min(1, ((B.x - s.ax) * ex + (B.z - s.az) * ez) / l2));
      const cx = s.ax + ex * t, cz = s.az + ez * t; let dx = B.x - cx, dz = B.z - cz, d = Math.hypot(dx, dz);
      const lim = R + s.r; if (d >= lim) continue;
      if (d < 1e-6) { dx = x0 - cx; dz = z0 - cz; d = Math.hypot(dx, dz) || 1; }
      const ux = dx / d, uz = dz / d;
      B.x = cx + ux * lim; B.z = cz + uz * lim;
      const vn = B.vx * ux + B.vz * uz;
      if (vn < 0) {
        const tx = B.vx - vn * ux, tz = B.vz - vn * uz;
        B.vx = tx * ROCE_PARED - vn * REBOTE * ux; B.vz = tz * ROCE_PARED - vn * REBOTE * uz;
        if (-vn > 1) { A.rebotes++; sonar('tick'); emitir({ tipo: 'rebote' }); }
      }
    }
    // árboles o rocas del sitio que quedan dentro (círculos)
    for (const o of OBST) {
      let dx = B.x - o.x, dz = B.z - o.z, d = Math.hypot(dx, dz); const lim = R + o.r; if (d >= lim) continue;
      if (d < 1e-6) { dx = x0 - o.x; dz = z0 - o.z; d = Math.hypot(dx, dz) || 1; }
      const ux = dx / d, uz = dz / d; B.x = o.x + ux * lim; B.z = o.z + uz * lim;
      const vn = B.vx * ux + B.vz * uz;
      if (vn < 0) { const tx = B.vx - vn * ux, tz = B.vz - vn * uz; B.vx = tx * ROCE_PARED - vn * REBOTE * ux; B.vz = tz * ROCE_PARED - vn * REBOTE * uz; if (-vn > 1) { A.rebotes++; sonar('tick'); } }
    }
    B.y = H(B.x, B.z) + R * 0.95;
    // rodar de verdad (gira sobre el eje perpendicular al avance)
    const mx = B.x - x0, mz = B.z - z0, md = Math.hypot(mx, mz);
    if (md > 1e-5) { _ax.set(mz / md, 0, -mx / md); _q.setFromAxisAngle(_ax, md / R); semilla.quaternion.premultiply(_q); }
    // fuera del área o al agua: vuelve a su sitio con 1 golpe más
    const q = aLocal(K, B.x, B.z);
    if (Math.abs(q.u) > L / 2 + 0.4 || Math.abs(q.v) > HW + 0.4 || agua(B.x, B.z) > B.y - R) { fuera(); return; }
    // al nido
    const dn2 = Math.hypot(P_NIDO.x - B.x, P_NIDO.z - B.z), sp2 = Math.hypot(B.vx, B.vz);
    if (dn2 < NIDO_R * 0.75 && sp2 < CAIDA) { alNido(); return; }
    // reposo (o tope de tiempo: nunca se queda rodando para siempre)
    if ((sp2 < REPOSO) || B.t > T_MAX) {
      B.vx = B.vz = 0; B.mov = false;
      if (A.fase === 'rueda') { A.fase = 'apuntar'; emitir({ tipo: 'reposo', x: B.x, z: B.z }); pintar(); if (multi()) finTurno(); }
    }
  }

  // Vittata a un lado de la semilla, como un golfista, mirando hacia donde apunta (la cámara de siempre la sigue).
  // QA con input real: justo detrás, en la línea de puntería, tapaba la semilla y la línea de puntos desde la cámara.
  // Va a la izquierda de la pantalla (LADO m) y un poco atrás (ATRAS m): la semilla y la mira quedan libres a su derecha.
  // (ancla propia: lo que la física haya movido a la jugadora en este cuadro, p. ej. con el joystick oculto, no se acumula)
  const ancla = { x: 0, z: 0 }, LADO = 1.3, ATRAS = 0.7;
  const sitioVittata = () => { const d = dir(), atras = A.fase === 'rueda' ? 2.2 : ATRAS; return { x: B.x - d.x * atras + d.z * LADO, z: B.z - d.z * atras - d.x * LADO }; };
  function seguir(dt, snap) {
    const d = dir(), t = sitioVittata();
    const tx = t.x, tz = t.z, k = snap ? 1 : 1 - Math.exp(-6 * dt);
    ancla.x += (tx - ancla.x) * k; ancla.z += (tz - ancla.z) * k;
    S.pos.x = ancla.x; S.pos.z = ancla.z; S.pos.y = H(S.pos.x, S.pos.z) + 0.05;
    S.vy = 0; M.vx = M.vz = 0; M.dashT = 0; S.facing = { x: d.x, z: d.z };
    if (M.flying) { try { F.endFlight(); } catch (e) { /* ya en el suelo */ } } // el gesto de deslizar arriba (volar) no saca del hoyo
  }

  function dibujarMira() {
    const ver = A.fase === 'apuntar';
    puntos.visible = ver; if (!ver) return;
    const d = dir(), largo = 1.2 + (A.cargando ? A.carga : 0.3) * 5;
    for (let i = 0; i < N_PUNTOS; i++) {
      const s = R + 0.3 + largo * (i + 1) / N_PUNTOS, x = B.x + d.x * s, z = B.z + d.z * s;
      _o.position.set(x, H(x, z) + 0.12, z); _o.quaternion.identity(); _o.scale.setScalar(A.cargando ? 1.25 : 1); _o.updateMatrix(); puntos.setMatrixAt(i, _o.matrix);
    }
    puntos.instanceMatrix.needsUpdate = true;
  }

  // Aro del turno y fantasmas de los demás (en su sitio; los que ya entraron no se ven)
  function marcas() {
    const m = multi() && A.fase !== 'nada';
    aroTurno.visible = m && !A.hundir && A.fase !== 'nido';
    if (aroTurno.visible) aroTurno.position.set(B.x, H(B.x, B.z) + 0.05, B.z);
    fantasmas.forEach((g, i) => {
      const j = m && i !== A.turno ? J[i] : null;
      g.visible = !!j && !j.dentro && Math.hypot(j.x - B.x, j.z - B.z) > R * 1.5;
      if (g.visible) g.position.set(j.x, H(j.x, j.z) + R * 0.95, j.z);
    });
  }
  function paso(dt) {
    if (!K) return;
    const lejos = Math.hypot(S.pos.x - K.x, S.pos.z - K.z) > 90;
    const on = ofrecible(); // QA-189: fuera de Villa Raíz la estación no existe (ni piezas ni invitación)
    troncos.visible = nido.visible = semilla.visible = on && (!lejos || A.fase !== 'nada');
    salida.visible = on && A.fase === 'nada' && !lejos;
    nido.userData.banderin.rotation.y = Math.sin(performance.now() / 600) * 0.25;
    if (A.fase === 'nada') {
      puntos.visible = false;
      if (on && !A.invitado && !A.manual && Math.hypot(S.pos.x - P_TEE.x, S.pos.z - P_TEE.z) < 10 && it.visible() && avisoLibre()) { A.invitado = true; toast(TXT.invita, 3600); }
      return;
    }
    if (A.giro) { G.camara.yaw += A.giro * GIRO * dt; if (G.camara.manual) try { G.camara.manual(); } catch (e) { /* */ } }
    if (A.cargando) { A.cargaT += dt; const k = (A.cargaT / PERIODO) % 2; A.carga = k <= 1 ? k : 2 - k; }
    if (A.fase === 'rueda' || A.timers.length) {
      A.acc += Math.min(dt, 0.25);
      while (A.acc >= PASO) { A.acc -= PASO; sub(PASO); if (A.fase !== 'rueda' && !A.timers.length) { A.acc = 0; break; } }
    } else A.acc = 0;
    if (f && HAB) HAB.paso(f, dt);
    if (A.fase === 'turno') { A.esperaT -= dt; if (A.esperaT <= 0) { const i = siguiente(); if (i < 0) resultados(); else cargarJ(i); } }
    if (A.hundir) { A.nidoT += dt; const k = Math.min(1, A.nidoT / 0.5); semilla.position.set(P_NIDO.x, H(P_NIDO.x, P_NIDO.z) + R * 0.95 - k * R * 0.9, P_NIDO.z); semilla.scale.setScalar(1 - 0.25 * k); }
    else semilla.position.set(B.x, B.y, B.z);
    marcas();
    seguir(dt, false);
    dibujarMira();
    if (hud && !hud.el.hidden) pintar();
  }

  // ---------- Entrada ----------
  const modo = {
    activo: () => A.fase !== 'nada',
    accion: () => { if (A.eligiendo) elegir(1); else if (A.fase === 'nido') salir(TXT.sale); else if (A.cargando) soltarCarga(); else empezarCarga(); },
    aviso: () => (TACTIL ? TXT.guiaT : TXT.guia),
    get verbo() { return A.fase === 'nido' ? TXT.seguir : A.cargando ? TXT.soltar : TXT.golpe; }
  };
  const TRAGAR = new Set(['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's', ' ', 'g', 'r', 'escape', 'e', 'enter', 'f', 'v', 'x', 'c', '1', '2', '3', '4', '5', '6', '7']);
  const pausa = () => !!(G.pausa && G.pausa.activa && G.pausa.activa());
  let enganchado = false, modo0 = null, girosTecla = { izq: false, der: false };
  const giroTeclas = () => { A.giro = (girosTecla.izq ? 1 : 0) - (girosTecla.der ? 1 : 0); };
  function teclaAbajo(e) {
    if (!enganchado || pausa() || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.nodeName))) return;
    const k = (e.key || '').toLowerCase(); if (!TRAGAR.has(k)) return;
    e.stopImmediatePropagation(); e.preventDefault();
    if (k === 'arrowleft' || k === 'a') { girosTecla.izq = true; giroTeclas(); }
    else if (k === 'arrowright' || k === 'd') { girosTecla.der = true; giroTeclas(); }
    if (e.repeat) return;
    if (A.eligiendo && k.length === 1 && k >= '1' && k <= String(MAX_J)) elegir(+k);
    else if (k === ' ') empezarCarga();
    else if (k === 'e' || k === 'enter') modo.accion();
    else if (k === 'g') grito();
    else if (k === 'r') reiniciar();
    else if (k === 'escape') salir(TXT.sale);
  }
  // keyup no se traga: input.js suelta lo que tuviera apretado de antes de empezar
  function teclaArriba(e) {
    if (!enganchado) return;
    const k = (e.key || '').toLowerCase();
    if (k === 'arrowleft' || k === 'a') { girosTecla.izq = false; giroTeclas(); }
    else if (k === 'arrowright' || k === 'd') { girosTecla.der = false; giroTeclas(); }
    else if (k === ' ') soltarCarga();
  }
  function enganchar() {
    if (enganchado) return; enganchado = true;
    modo0 = G.interaccion.modo; G.interaccion.modo = modo;
    addEventListener('keydown', teclaAbajo, true); addEventListener('keyup', teclaArriba, true);
    const keys = G.input && G.input.keys; if (keys) for (const k of ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'c', 'q', 'r', 'g']) keys.delete(k);
    document.body.classList.add('v18-golf-on');
    camaraHoyo(true);
  }
  // Cámara del hoyo: un poco más alta y más lejos que la de explorar (semilla, mira y Vittata en el cuadro, por encima del HUD).
  // Solo cambia el ajuste de la cámara de siempre (G.camara.CAM, como los retos): su seguimiento suave lleva la transición.
  const CAM_HOYO = { height: 5.6, dist: 8.2 };
  let cam0 = null;
  function camaraHoyo(on) {
    const C = G.camara && G.camara.CAM; if (!C) return;
    if (on) { if (cam0) return; cam0 = {}; for (const k in CAM_HOYO) cam0[k] = C[k]; Object.assign(C, CAM_HOYO); return; }
    if (!cam0) return;
    for (const k in cam0) if (C[k] === CAM_HOYO[k]) C[k] = cam0[k]; // si otro lo cambió mientras tanto, no se pisa
    cam0 = null;
  }
  function soltar() {
    if (!enganchado) return; enganchado = false;
    if (G.interaccion.modo === modo) G.interaccion.modo = modo0;
    removeEventListener('keydown', teclaAbajo, true); removeEventListener('keyup', teclaArriba, true);
    girosTecla = { izq: false, der: false }; A.giro = 0; A.cargando = false;
    document.body.classList.remove('v18-golf-on');
    camaraHoyo(false);
  }

  // ---------- HUD ----------
  let hud = null;
  function estilo() {
    if (document.getElementById('v18-golf-css')) return;
    const st = document.createElement('style'); st.id = 'v18-golf-css';
    st.textContent = '#v18-golf{position:fixed;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);margin-inline:auto;width:min(520px,calc(100vw - 32px));z-index:40;' +
      'font-family:Fredoka,system-ui,sans-serif;color:#fff8ea;text-shadow:0 1px 2px #0008;pointer-events:none}' +
      'body.v18-golf-on #acts,body.v18-golf-on #stick,body.v18-golf-on #quest,body.v18-golf-on #inv{visibility:hidden}' +
      '#v18-golf .vg-caja{background:rgba(30,40,30,.78);border-radius:16px;padding:8px 12px}' +
      '#v18-golf .vg-info{display:flex;flex-wrap:wrap;gap:4px 14px;justify-content:space-between;font-size:15px;font-weight:600}' +
      '#v18-golf .vg-barra{height:10px;border-radius:5px;background:#0006;overflow:hidden;margin:6px 0 2px}#v18-golf .vg-barra b{display:block;height:100%;width:0;background:linear-gradient(90deg,#8fe08a,#ffd27a,#ff9a5a)}' +
      '#v18-golf .vg-et{font-size:11px;opacity:.8}' +
      '#v18-golf .vg-bot{display:grid;grid-template-columns:1fr 2fr 1fr;gap:8px;margin-top:8px}#v18-golf .vg-bot2{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px}' +
      '#v18-golf button{pointer-events:auto;font:inherit;font-size:16px;font-weight:600;min-height:52px;padding:6px 10px;border-radius:26px;border:0;background:#fff3d6;color:#3b2a14;box-shadow:0 2px 6px #0005;cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none}' +
      '#v18-golf button.vg-golpe{background:#ffd27a;font-size:18px}#v18-golf button.cd{opacity:.45}#v18-golf button.on{outline:3px solid #8fe08a}' +
      '#v18-golf .vg-fin{text-align:center}#v18-golf .vg-fin p{margin:2px 0;font-size:18px;font-weight:600}#v18-golf .vg-fin .vg-m{font-size:22px}' +
      '#v18-golf .vg-m[data-m="oro"]{color:#ffd84a}#v18-golf .vg-m[data-m="plata"]{color:#dfe7ee}#v18-golf .vg-m[data-m="bronce"]{color:#e0a36a}' +
      '#v18-golf .vg-fin .vg-bot2{grid-template-columns:1fr 1fr}' +
      '#v18-golf .vg-elige{text-align:center}#v18-golf .vg-elige p{margin:2px 0;font-size:18px;font-weight:600}#v18-golf .vg-elige .vg-et{font-size:13px}' +
      '#v18-golf .vg-elige-salir{margin-top:8px}#v18-golf .vg-elige-salir button{min-height:44px;padding:4px 22px;border-radius:22px;font-size:15px;background:#e9e2d2}' +
      '#v18-golf .vg-bot4{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:8px}#v18-golf .vg-bot4 button{min-height:60px;font-size:18px}' +
      '#v18-golf .vg-jugs{display:flex;flex-wrap:wrap;gap:2px 12px;justify-content:center;font-size:14px;font-weight:600;margin-top:4px}#v18-golf .vg-jugs .on{text-decoration:underline}#v18-golf .vg-jugs .ya{opacity:.7}' +
      '#v18-golf .vg-tabla{margin:4px auto 2px;max-width:360px}#v18-golf .vg-fila{display:grid;grid-template-columns:2em 1fr auto 4.5em;gap:8px;align-items:center;font-size:17px;font-weight:600;text-align:left}' +
      '#v18-golf .vg-tabla .vg-m{font-size:17px;text-align:right}' +
      '#v18-golf .vg-guia{font-size:12px;opacity:.85;text-align:center;margin-top:6px}' +
      // QA: la guía #prompt se veía a través del panel y la pista «Pulsa V para volar» seguía en el hoyo; la guía va en el panel
      'body.v18-golf-on #prompt,body.v18-golf-on #guia-pista,body.v18-golf-on #guia-panel{display:none!important}' +
      // En el móvil los avisos suben arriba durante el hoyo: abajo tapaban a Vittata y la semilla
      // Los bocadillos libres del capítulo (dialogo.js, #bocadillos) van arriba, bajo los avisos: abajo quedaban tras el panel
      // (escritorio) o en medio, encima de la mira (móvil)
      'body.v18-golf-on #bocadillos{top:calc(env(safe-area-inset-top,0px) + 96px);bottom:auto}' +
      '@media (max-width:760px){body.v18-golf-on #toast{top:calc(env(safe-area-inset-top,0px) + 12px);bottom:auto}body.v18-golf-on #bocadillos{top:calc(env(safe-area-inset-top,0px) + 116px)}body.v18-golf-on #minimapa{visibility:hidden}}' +
      // W29a: en el móvil el panel alto (elegir jugadores) subía hasta los botones de Diario/Emociones/Pausa y el botón tapaba «Récord»: el panel se estrecha y deja libre esa columna
      '@media (max-width:760px){#v18-golf.vg-lado{margin-inline:16px auto;width:calc(100vw - 96px)}#v18-golf.vg-lado .vg-bot4 button{padding:6px 4px}}' +
      '@media (min-width:761px) and (pointer:fine){#v18-golf{bottom:16px}}';
    document.head.appendChild(st);
  }
  function montarHud() {
    if (hud) return hud;
    estilo();
    const el = document.createElement('div'); el.id = 'v18-golf'; el.hidden = true;
    el.innerHTML = `<div class="vg-caja"><div class="vg-info"><span>${TXT.hoyo}</span><span>${TXT.par}</span><span data-k="golpes"></span><span data-k="record"></span><span data-k="turno"></span></div><div class="vg-jugs" data-k="jugs" hidden></div>` +
      `<div class="vg-barra" data-k="barraW"><b data-k="barra"></b></div><div class="vg-et" data-k="fuerzaEt">${TXT.fuerza}</div>` +
      `<div class="vg-elige" data-k="elige" hidden><p>${TXT.elige}</p><div class="vg-et">${TXT.eligeSub}</div><div class="vg-bot4">` +
      [1, 2, 3, 4].map(n => `<button data-a="j${n}">${TXT['j' + n]}</button>`).join('') + `</div>` +
      `<div class="vg-elige-salir"><button data-a="salir">${TXT.salir}</button></div></div>` +
      `<div data-k="bot"><div class="vg-bot"><button data-a="izq" aria-label="${TXT.izq}">◀</button><button class="vg-golpe" data-a="golpe">${TXT.golpe}</button><button data-a="der" aria-label="${TXT.der}">▶</button></div>` +
      `<div class="vg-bot2"><button data-a="grito" data-k="bgrito">${TXT.poder}</button><button data-a="reiniciar">${TXT.reiniciar}</button><button data-a="salir">${TXT.salir}</button></div><div class="vg-guia" data-k="guia">${TACTIL ? TXT.guiaT : TXT.guia}</div></div>` +
      `<div class="vg-fin" data-k="fin" hidden><p data-k="fin1"></p><p class="vg-m" data-k="fin2"></p><div class="vg-tabla" data-k="tabla" hidden></div><p data-k="fin3"></p>` +
      `<div class="vg-bot2"><button data-a="otra">${TXT.otra}</button><button data-a="seguir">${TXT.seguir}</button></div></div></div>`;
    const boton = e => e.target.closest && e.target.closest('button[data-a]');
    el.addEventListener('pointerdown', e => {
      const b = boton(e); if (!b) return;
      e.preventDefault(); e.stopPropagation();
      try { b.setPointerCapture(e.pointerId); } catch (er) { /* sin captura */ }
      const a = b.dataset.a; b.classList.add('on');
      if (a === 'izq') A.giro = 1; else if (a === 'der') A.giro = -1;
      else if (a === 'golpe') empezarCarga(); else if (a === 'grito') grito(); else if (a === 'reiniciar') reiniciar();
      else if (a === 'salir' || a === 'seguir') salir(TXT.sale); else if (a === 'otra') reiniciar();
      else if (/^j[1-4]$/.test(a)) elegir(+a[1]);
    });
    const suelta = e => {
      const b = boton(e); if (!b) return; b.classList.remove('on');
      const a = b.dataset.a;
      if (a === 'izq' || a === 'der') giroTeclas();
      else if (a === 'golpe') { if (e.type === 'pointercancel') A.cargando = false; else soltarCarga(); }
    };
    for (const t of ['pointerup', 'pointercancel']) el.addEventListener(t, suelta);
    el.addEventListener('contextmenu', e => e.preventDefault());
    document.body.appendChild(el);
    hud = { el, q: k => el.querySelector('[data-k="' + k + '"]') };
    return hud;
  }
  const texto = (k, t) => { const e = hud.q(k); if (e.dataset.t !== t) { e.dataset.t = t; e.textContent = t; } }; // una vez: el traductor no pelea
  function pintar() {
    if (!hud) return;
    texto('golpes', golpesTxt(A.golpes));
    const r = record(), m = multi(); texto('record', m ? '' : r ? recordTxt(r.mejor) : TXT.sinRecord);
    const tu = hud.q('turno'); texto('turno', m && A.fase !== 'nido' ? turnoTxt(A.turno) : ''); tu.style.color = m ? COLORES[A.turno] : '';
    if (m) { // golpes de cada uno (se rehace solo si cambia)
      const firma = J.map((j, i) => (i === A.turno ? A.golpes : j.golpes) + (j.dentro ? 'd' : j.tope ? 't' : '')).join(',') + '|' + A.turno, js = hud.q('jugs');
      if (js.dataset.f !== firma) {
        js.dataset.f = firma;
        js.innerHTML = J.map((j, i) => `<span class="${i === A.turno ? 'on' : ''}${j.dentro || j.tope ? ' ya' : ''}" style="color:${COLORES[i]}">${jugTxt(i, i === A.turno ? A.golpes : j.golpes)}</span>${j.dentro ? '<b> ✓</b>' : ''}`).join('');
      }
    }
    hud.q('barra').style.width = Math.round(100 * (A.cargando ? A.carga : 0)) + '%';
    const bg = hud.q('bgrito'); bg.classList.toggle('cd', A.grito || A.fase !== 'rueda');
    const t = A.grito ? TXT.usado : TXT.poder; if (bg.dataset.t !== t) { bg.dataset.t = t; bg.textContent = t; }
    const bgol = hud.el.querySelector('[data-a="golpe"]'); bgol.classList.toggle('cd', A.fase !== 'apuntar');
  }

  // ---------- En el mundo ----------
  const it = G.interaccion.add({ id: 'v18_minigolf', x: 0, z: 0, r: 3.4, visible: () => A.fase === 'nada' && !!K && ofrecible() && !otraCerca() && libre() && !otroActivo(),
    label: () => TXT.label, use: () => iniciar({}) });
  montar(buscarSitio());
  G.on('update', (dt, busy) => { if (A.manual || (busy && A.fase !== 'nada')) return; paso(Math.min(dt, 0.25)); }, 75);
  G.on('apply', () => { if (A.fase !== 'nada') salir(); }, 51);
  // El sitio definitivo, cuando ya están la vegetación, el mundo y la explanada del duelo (antes no hay troncos que esquivar)
  let recolocar = false;
  const pedirSitio = () => { recolocar = true; };
  Promise.resolve(G.vegetacion && G.vegetacion.listo).then(pedirSitio, pedirSitio);
  Promise.resolve(G.mundo && G.mundo.listo).then(pedirSitio, () => {});
  setTimeout(pedirSitio, 5000);
  G.on('update', () => { if (recolocar && A.fase === 'nada') { recolocar = false; const n = buscarSitio(); if (!K || n.x !== K.x || n.z !== K.z || n.a !== K.a) montar(n); else Object.assign(K, { troncos: n.troncos, rango: n.rango }); } }, 76);

  // =====================================================================================================================
  async function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    let crudo = null; try { crudo = localStorage.getItem(V.clave()); } catch (e) { /* */ }
    const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, fac0 = S.facing, fly0 = M.flying, yaw0 = G.camara.yaw, inv0 = Object.assign({}, S.inv || {});
    const mad = () => (S.inv && S.inv.madera || 0) - (inv0.madera || 0);
    const toasts = [], toast0 = G.ui.toast; G.ui.toast = t => { toasts.push(String(t)); };
    const susp = G.guardado && G.guardado.suspender; if (susp) susp(true);
    if (A.fase !== 'nada') salir();
    A.manual = true;
    const correr = (s, dt) => { dt = dt || 1 / 60; for (let t = 0; t < s; t += dt) paso(dt); };
    const hastaQuieta = (s, dt) => { dt = dt || 1 / 60; for (let t = 0; t < (s || 30) && A.fase === 'rueda'; t += dt) paso(dt); };
    const enLocal = () => aLocal(K, B.x, B.z);
    const colocar = (u, v) => { const p = aMundo(K, u, v); ponerSemilla(p.x, p.z); A.fase = 'apuntar'; seguir(0, true); };
    const apuntaLocal = (u, v) => { const p = aMundo(K, u, v); apuntarA(p.x, p.z); };
    // fuerza para recorrer d metros en llano (roce a + b·v): d(v0) = v0/b − a/b² · ln(1 + b·v0/a)
    const recorre = v0 => v0 / ROCE_B - ROCE_A / (ROCE_B * ROCE_B) * Math.log(1 + ROCE_B * v0 / ROCE_A);
    const fuerzaPara = d => { let lo = 0, hi = 1; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (recorre(VMIN + (VMAX - VMIN) * m) < d) lo = m; else hi = m; } return (lo + hi) / 2; };
    const camOk = () => G.camara.CAM.height === CAM_HOYO.height && G.camara.CAM.dist === CAM_HOYO.dist;
    const tecla = (tipo, key) => { const ev = new KeyboardEvent(tipo, { key, bubbles: true, cancelable: true }); document.body.dispatchEvent(ev); return ev; };
    try {
      V.borrar(); V.recargar();
      // 0. Bandera y sitio
      if (recolocar) { recolocar = false; montar(buscarSitio()); }
      const k2 = buscarSitio(), bajo = (() => { let m = 0; for (let u = -L / 2; u <= L / 2; u += 1) for (let v = -HW; v <= HW; v += 1) { const p = aMundo(K, u, v); if (agua(p.x, p.z) > H(p.x, p.z) - 0.3) m++; } return m; })();
      const pl = G.terreno.places || {}, villa = pl.villa || { x: 0, z: 0 };
      check('Sitio en Villa Raíz: seco, sin edificios, a lo sumo 2 árboles dentro (son obstáculos que chocan) y estable entre búsquedas',
        bajo === 0 && K.troncos >= 0 && K.troncos <= 2 && OBST.length === K.troncos && k2.x === K.x && k2.z === K.z && Math.hypot(K.x - villa.x, K.z - villa.z) < 70,
        JSON.stringify({ centro: [K.x, K.z], giro: +K.a.toFixed(3), salida: [+P_TEE.x.toFixed(1), +P_TEE.z.toFixed(1)], nido: [+P_NIDO.x.toFixed(1), +P_NIDO.z.toFixed(1)], troncos: K.troncos, agua: bajo, estable: k2.x === K.x && k2.z === K.z && k2.a === K.a, desnivel: +(K.rango || 0).toFixed(2), aPlaza: +Math.hypot(K.x - villa.x, K.z - villa.z).toFixed(1), combate: G.v18combate && G.v18combate.sitio ? [G.v18combate.sitio.x, G.v18combate.sitio.z] : null, arboles: OBST.map(o => [+o.x.toFixed(1), +o.z.toFixed(1), +o.r.toFixed(2)]), libres: K.troncos < 0 ? (() => { const t0 = performance.now(), l = explorar(70, 3); return { n: l.length, ms: Math.round(performance.now() - t0), mejores: l.slice(0, 30) }; })() : null }));
      S.pos.x = P_ENTRADA.x; S.pos.z = P_ENTRADA.z; S.pos.y = H(S.pos.x, S.pos.z);
      correr(0.05);
      check('Zona de activación, semilla gigante y nido se ven al llegar; «Jugar al minigolf» en Acción', salida.visible && semilla.visible && nido.visible && troncos.visible && troncos.count >= 8 &&
        it.visible() === (ofrecible() && !otraCerca() && libre() && !otroActivo()) && it.label() === TXT.label && Math.hypot(it.x - P_TEE.x, it.z - P_TEE.z) < 0.01, JSON.stringify({ troncos: troncos.count, libre: libre(), otro: otroActivo(), dialogo: !!(G.dialogo && G.dialogo.open && G.dialogo.open()), tarjeta: !!G.ui.cardOpen, ocupado: !!(G.ui.busy && G.ui.busy()), fade: !!document.getElementById('c1-fade'), capas: ['end', 'comic', 'creator'].filter(i => document.getElementById(i) && !document.getElementById(i).hidden) }));
      const forzar = !libre() || otroActivo(); // la prueba puede correr con un diálogo del capítulo abierto: entonces se fuerza (y se dice)
      check('No se abre durante la apertura del capítulo (ni con otra actividad V18 en marcha)', (() => { const fd = document.createElement('div'); fd.id = 'c1-fade'; document.body.appendChild(fd); const r = !it.visible() && iniciar({}) === false; fd.remove(); return r && A.fase === 'nada'; })());
      // QA-189 (coordinadora 6-nov): la estación solo se ofrece en Villa Raíz; fuera del cap. 1 no hay hoyo que ofrecer
      {
        const pack0 = G.pack.id; G.pack.id = 'ep4';
        const inv0 = A.invitado; A.invitado = false; toasts.length = 0;
        correr(0.1);
        const fuera = { interaccion: it.visible(), salida: salida.visible, semilla: semilla.visible, nido: nido.visible, troncos: troncos.visible, mapa: G.v18minigolf.mapa(), invita: A.invitado || toasts.includes(TXT.invita), inicia: G.v18minigolf.iniciar({ forzar: true }) };
        A.invitado = inv0; G.pack.id = pack0; toasts.length = 0;
        check('QA-189: fuera de Villa Raíz no hay estación (sin interacción, piezas, marcador, invitación ni inicio; en ep4 se nacía junto al hoyo)',
          !fuera.interaccion && !fuera.salida && !fuera.semilla && !fuera.nido && !fuera.troncos && fuera.mapa === null && !fuera.invita && fuera.inicia === false, JSON.stringify(fuera));
        correr(0.05);
        check('QA-189: al volver a Villa Raíz la estación se ofrece otra vez (piezas y «Jugar al minigolf»)',
          salida.visible && semilla.visible && nido.visible && troncos.visible && it.visible() === (ofrecible() && !otraCerca() && libre() && !otroActivo()));
      }
      // QA-189: la historia manda; con otra interacción al alcance (la de la historia), la del hoyo cede
      {
        S.pos.x = P_TEE.x; S.pos.z = P_TEE.z; correr(0.02); // junto a la semilla: el hoyo es lo más cercano que hay
        const antes = it.visible();
        const fake = G.interaccion.add({ id: 'qa189_historia', x: S.pos.x + 1.5, z: S.pos.z, r: 2.5, label: () => 'Hablar con Iguaca', use: () => {} });
        const cede = !it.visible() && G.interaccion.nearest().id === 'qa189_historia';
        G.interaccion.list.splice(G.interaccion.list.indexOf(fake), 1);
        check('QA-189: con una interacción de historia al alcance, la del hoyo cede (Acción ofrece la historia, no «Jugar al minigolf»)',
          antes && cede && it.visible(), JSON.stringify({ antes, cede, otraCerca: otraCerca(), libre: libre(), otro: otroActivo() }));
        S.pos.x = P_ENTRADA.x; S.pos.z = P_ENTRADA.z; correr(0.02);
      }
      // 1. Empezar
      check('Empezar: hoyo 1 par 3 (se explica qué es el par la primera vez), 0 golpes, semilla en la salida, HUD y controles del hoyo', iniciar({ forzar }) && A.fase === 'apuntar' && A.golpes === 0 && (toasts.includes(TXT.empieza) || toasts.includes(TXT.empiezaPar)) &&
        G.interaccion.modo === modo && hud && !hud.el.hidden && document.body.classList.contains('v18-golf-on') && Math.hypot(B.x - P_TEE.x, B.z - P_TEE.z) < 0.01, forzar ? 'forzado (había un diálogo o tarjeta abiertos)' : '');
      const ev = tecla('keydown', 'w'); const tieneW = !!(G.input && G.input.keys && G.input.keys.has('w')); tecla('keyup', 'w');
      const sx = S.pos.x; correr(0.3);
      check('Mientras se juega, Vittata no camina: las teclas de mover no llegan al juego y se queda junto a la semilla', !tieneW && ev.defaultPrevented && Math.abs(S.pos.x - sx) < 0.05 &&
        Math.hypot(S.pos.x - sitioVittata().x, S.pos.z - sitioVittata().z) < 0.05);
      // QA con input real: Vittata tapaba la semilla y la mira. Ahora está a un lado: lejos de la recta cámara → semilla (en planta)
      {
        // El «plano de descubrimiento» (órbita de 1,2 s al descubrir un lugar, p. ej. la playa al llegar aquí) no avanza en la
        // prueba (no hay follow): se termina para medir la cámara del hoyo tal como queda
        const plano0 = G.camara.vida && G.camara.vida.plano; if (G.camara.vida) G.camara.vida.plano = 0;
        try { G.camara.place(true); } catch (e) { /* cámara */ }
        const c = G.renderer.camera.position, ex = B.x - c.x, ez = B.z - c.z, l2 = ex * ex + ez * ez || 1;
        const t = Math.max(0, Math.min(1, ((S.pos.x - c.x) * ex + (S.pos.z - c.z) * ez) / l2)), lat = Math.hypot(S.pos.x - (c.x + ex * t), S.pos.z - (c.z + ez * t));
        correr(0.05); try { G.camara.place(true); } catch (e) { /* cámara */ }
        const aSem = Math.hypot(S.pos.x - B.x, S.pos.z - B.z), mira = Array.from({ length: N_PUNTOS }, (_, i) => { const m = new THREE.Matrix4(); puntos.getMatrixAt(i, m); return new THREE.Vector3().setFromMatrixPosition(m); });
        G.renderer.camera.updateMatrixWorld(); const enCuadro = [semilla.position, ...mira.slice(0, 4)].every(q => { const v = q.clone().project(G.renderer.camera); return Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && v.z < 1; });
        check('Vittata se pone a un lado de la semilla (como un golfista): no tapa la semilla ni la línea de puntos (≥ 0,6 m de la recta cámara → semilla) y las dos salen en el cuadro',
          lat >= 0.6 && aSem > R + 0.6 && aSem < 2.2 && puntos.visible && enCuadro, JSON.stringify({ lateral: +lat.toFixed(2), aSemilla: +aSem.toFixed(2), enCuadro, alto: G.camara.CAM.height, camD: +Math.hypot(c.x - S.pos.x, c.z - S.pos.z).toFixed(2), camAng: +(Math.atan2(c.x - S.pos.x, c.z - S.pos.z) - G.camara.yaw).toFixed(3), plano0 }));
      }
      const d0 = dir(), haciaNido = Math.atan2(P_NIDO.z - B.z, P_NIDO.x - B.x);
      check('Al empezar apunta hacia el nido (la cámara de siempre mira por ahí)', Math.abs(Math.atan2(d0.z, d0.x) - haciaNido) < 0.01);
      const y0 = G.camara.yaw; A.giro = 1; correr(0.5); A.giro = 0;
      check('← → giran la puntería (y la cámara)', Math.abs(G.camara.yaw - y0 - GIRO * 0.5) < 0.05, (G.camara.yaw - y0).toFixed(3));
      // 2. Apuntar, fuerza y golpe
      colocar(TEE.u, TEE.v); apuntaLocal(TEE.u + 4, -1.2);
      empezarCarga(); correr(PERIODO * 0.5); const c1 = A.carga; let cMax = c1;
      for (let t = 0; t < PERIODO * 1.1; t += 1 / 60) { paso(1 / 60); cMax = Math.max(cMax, A.carga); }
      const c2 = A.carga;
      check('Mantener carga la fuerza, que sube y baja (fácil de medir)', c1 > 0.4 && c1 < 0.6 && cMax > 0.95 && c2 < cMax - 0.3 && A.cargando, c1.toFixed(2) + ' → ' + cMax.toFixed(2) + ' → ' + c2.toFixed(2));
      A.cargando = false; A.carga = 0;
      const ini = enLocal(); tirar(0.35); const enRueda = A.fase === 'rueda'; hastaQuieta();
      const fin = enLocal();
      check('Golpear mueve la semilla hacia donde apuntas y se para sola (1 golpe)', enRueda && A.fase === 'apuntar' && A.golpes === 1 && fin.u - ini.u > 2 && !B.mov, JSON.stringify({ du: +(fin.u - ini.u).toFixed(2), dv: +(fin.v - ini.v).toFixed(2) }));
      // 3. Choques
      colocar(-5, 0); apuntaLocal(-5, 5); const reb0 = A.rebotes; let vmax = 0, volvio = false;
      tirar(0.7); for (let t = 0; t < 20 && A.fase === 'rueda'; t += 1 / 60) { paso(1 / 60); const q = enLocal(); vmax = Math.max(vmax, q.v); if (q.v < vmax - 0.5) volvio = true; }
      check('Rebota en el borde y no lo atraviesa', A.rebotes > reb0 && volvio && vmax < HW - TRONCO - R + 0.02 && A.fase === 'apuntar', JSON.stringify({ vmax: +vmax.toFixed(2), rebotes: A.rebotes - reb0 }));
      colocar(-5, -2); apuntaLocal(5, -2); let umax = -99;
      tirar(1); for (let t = 0; t < 20 && A.fase === 'rueda'; t += 1 / 60) { paso(1 / 60); umax = Math.max(umax, enLocal().u); }
      check('A toda fuerza contra un tronco tampoco lo atraviesa: rebota', umax < TRONCOS[0].u - TRONCO - R + 0.02 && enLocal().u < umax - 0.5, JSON.stringify({ umax: +umax.toFixed(2), tronco: TRONCOS[0].u }));
      const g0 = A.golpes;
      check('El contador suma un golpe por tiro', g0 === 3 && hud.q('golpes').textContent === golpesTxt(3), hud.q('golpes').textContent);
      // 4. Fuera del área: vuelve a su sitio con 1 golpe más
      colocar(0, 1.5); const ult = { x: B.x, z: B.z }; apuntaLocal(0, 9); tirar(0.4);
      { const p = aMundo(K, 0, HW + 1.5); B.x = p.x; B.z = p.z; } correr(0.1);
      check('Si sale del área vuelve a su último sitio y suma 1 golpe', A.fase === 'apuntar' && A.golpes === g0 + 2 && Math.hypot(B.x - ult.x, B.z - ult.z) < 0.01 && toasts.includes(TXT.fuera), A.golpes);
      // 5. Independiente de los FPS
      const mismo = dt => { colocar(TEE.u, 0.5); apuntaLocal(TEE.u + 5, 2.0); tirar(0.5); hastaQuieta(30, dt); return enLocal(); };
      const a30 = mismo(1 / 30), a144 = mismo(1 / 144);
      check('El mismo golpe acaba en el mismo sitio a 30 y a 144 FPS', Math.hypot(a30.u - a144.u, a30.v - a144.v) < 0.1, JSON.stringify({ a30: [+a30.u.toFixed(2), +a30.v.toFixed(2)], a144: [+a144.u.toFixed(2), +a144.v.toFixed(2)] }));
      // 6. Grito del Yunque: con la semilla rodando, una vez por hoyo
      reiniciar();
      check('Reiniciar: 0 golpes, semilla en la salida y el Grito disponible', A.golpes === 0 && A.fase === 'apuntar' && !A.grito && Math.hypot(B.x - P_TEE.x, B.z - P_TEE.z) < 0.01);
      check('Con la semilla quieta el Grito no sale', grito().motivo === 'quieta' && !A.grito);
      colocar(TEE.u, 0); apuntaLocal(TEE.u + 5, 0); tirar(0.15); correr(0.4);
      const sp0 = Math.hypot(B.vx, B.vz), poderes = []; const oy = e => { if (!oy.mudo) poderes.push(e); }; G.on('v18poder', oy);
      apuntaLocal(enLocal().u + 4, enLocal().v + 1.2); const dG = dir(); seguir(0, true);
      const rg = grito(); correr(0.3); oy.mudo = true;
      const sp1 = Math.hypot(B.vx, B.vz), al = (B.vx * dG.x + B.vz * dG.z) / (sp1 || 1);
      check('Grito del Yunque (el poder de Vittata): empuja la semilla hacia donde apuntas', rg.ok && A.grito && sp1 > sp0 + 2 && al > 0.95 && poderes.some(e => e.id === 'grito_yunque'),
        JSON.stringify({ antes: +sp0.toFixed(2), despues: +sp1.toFixed(2), alineado: +al.toFixed(3) }));
      const rg2 = grito();
      check('Solo un Grito por hoyo', !rg2.ok && rg2.motivo === 'usado' && hud.q('bgrito').textContent === TXT.usado);
      hastaQuieta();
      // 7. Completar el hoyo: con un plan sencillo entra en pocos golpes (el nido registra la llegada)
      reiniciar(); toasts.length = 0;
      const RUTA = [{ u: -1.2, v: 2.0 }, { u: 0.8, v: -2.0 }, { u: 3.8, v: -2.0 }, NIDO];
      let iw = 0, n = 0;
      while (A.fase === 'apuntar' && n < 12) {
        const q = enLocal();
        while (iw < RUTA.length - 1 && (Math.hypot(q.u - RUTA[iw].u, q.v - RUTA[iw].v) < 1.0 || q.u > RUTA[iw].u + 0.5)) iw++;
        const w = RUTA[iw], d = Math.hypot(w.u - q.u, w.v - q.v);
        apuntaLocal(w.u, w.v); seguir(0, true); tirar(fuerzaPara(iw === RUTA.length - 1 ? d + 0.4 : d)); hastaQuieta(); n++;
      }
      check('El hoyo se completa: la semilla entra en el nido (en pocos golpes)', A.fase === 'nido' && A.resultado && A.resultado.golpes === A.golpes && A.golpes <= 7 && toasts.includes(nidoTxt(A.golpes)),
        JSON.stringify({ fase: A.fase, golpes: A.golpes, ruta: iw }));
      const res1 = A.resultado;
      check('Pantalla final sin la barra «Fuerza» vacía (ni su etiqueta)', hud.q('barraW').hidden && hud.q('fuerzaEt').hidden && !hud.q('fin').hidden);
      check('Victoria: golpes, medalla y récord en pantalla; se guarda en el progreso local', res1 && res1.nuevo && record() && record().mejor === res1.golpes && record().medalla === medalla(res1.golpes) &&
        !hud.q('fin').hidden && hud.q('fin2').textContent === TXT[res1.medalla] && hud.q('fin3').textContent === TXT.nuevo && (V.recargar(), record() && record().mejor === res1.golpes),
        JSON.stringify({ r: record() }));
      check('Medallas: oro = par o mejor, plata = par + 1, bronce = completar', medalla(2) === 'oro' && medalla(PAR) === 'oro' && medalla(PAR + 1) === 'plata' && medalla(PAR + 3) === 'bronce' && RANGO_M.oro > RANGO_M.plata);
      // Un resultado peor no pisa el récord; uno mejor, sí
      reiniciar(); colocar(NIDO.u - 3, 0.3); A.golpes = res1.golpes + 2; apuntaLocal(NIDO.u, NIDO.v); tirar(fuerzaPara(3.3)); hastaQuieta();
      const peor = A.fase === 'nido' && !A.resultado.nuevo && record().mejor === res1.golpes && hud.q('fin3').textContent === recordTxt(res1.golpes);
      reiniciar(); colocar(NIDO.u - 3, -0.3); apuntaLocal(NIDO.u, NIDO.v); tirar(fuerzaPara(3.3)); hastaQuieta();
      check('Un resultado peor no pisa el récord; uno mejor sí (y su medalla)', peor && A.fase === 'nido' && A.resultado.nuevo && record().mejor === 1 && record().medalla === 'oro', JSON.stringify(record()));
      check('Premios una vez: 3 fibras (madera) al primer hoyo y 2 maderas al primer oro; 5 en total', mad() === 5 && V.otorgado('minigolf_villa_completo') && V.otorgado('minigolf_villa_oro') &&
        res1.premios.includes('minigolf_villa_completo') && A.resultado.premios.length === (res1.medalla === 'oro' ? 0 : 1), 'madera +' + mad());
      reiniciar(); colocar(NIDO.u - 3, 0); apuntaLocal(NIDO.u, NIDO.v); tirar(fuerzaPara(3.3)); hastaQuieta();
      const m1 = mad(); G.guardado.save && G.guardado.save(true); V.recargar();
      check('Repetir el hoyo (otro oro) no da más materiales, y sigue así tras guardar y recargar', A.fase === 'nido' && A.resultado.premios.length === 0 && m1 === 5 &&
        V.otorgado('minigolf_villa_completo') && V.otorgado('minigolf_villa_oro') && !V.otorgar('minigolf_villa_oro', 'minigolf_oro', 1), 'madera +' + m1);
      // Los 2 árboles del hoyo: no tapan el nido ni atrapan la semilla (pegada a cada uno, sale con un golpe)
      const libresArb = OBST.map(o => {
        const q = aLocal(K, o.x, o.z), dn = Math.hypot(q.u - NIDO.u, q.v - NIDO.v) - o.r - NIDO_R;
        const du = q.u - (NIDO.u + TEE.u) / 2, lado = q.v >= 0 ? -1 : 1, pu = q.u - 0.05 * Math.sign(du || 1), pv = q.v + lado * (o.r + R + 0.05);
        reiniciar(); colocar(pu, pv); const a0 = enLocal(); apuntaLocal(NIDO.u, NIDO.v); tirar(0.6); hastaQuieta(); const a1 = enLocal();
        return { u: +q.u.toFixed(1), v: +q.v.toFixed(1), aNido: +dn.toFixed(2), sale: +Math.hypot(a1.u - a0.u, a1.v - a0.v).toFixed(2) };
      });
      check('Los árboles del hoyo no tapan el nido (≥ 1 m) ni atrapan la semilla (sale ≥ 1 m de un golpe)', libresArb.every(a => a.aNido >= 1 && a.sale >= 1), JSON.stringify(libresArb));
      // Rápido sobre el nido no entra (tiene que llegar despacio)
      reiniciar(); colocar(NIDO.u - 4, 0); apuntaLocal(NIDO.u, NIDO.v); tirar(1); let pasa = false;
      for (let t = 0; t < 0.6 && A.fase === 'rueda'; t += 1 / 60) { paso(1 / 60); if (enLocal().u > NIDO.u + NIDO_R) pasa = true; }
      check('A toda velocidad la semilla pasa por encima del nido (hay que medir la fuerza)', pasa);
      hastaQuieta();
      // 8. Salir devuelve el control
      salir();
      tecla('keydown', 'a'); const conA = !!(G.input && G.input.keys && G.input.keys.has('a')); tecla('keyup', 'a');
      check('Salir devuelve el control: Acción, teclas, botones del juego; el HUD se va y la semilla vuelve a la salida', A.fase === 'nada' && G.interaccion.modo !== modo && conA && hud.el.hidden &&
        !document.body.classList.contains('v18-golf-on') && Math.hypot(B.x - P_TEE.x, B.z - P_TEE.z) < 0.01 && Math.hypot(S.pos.x - P_ENTRADA.x, S.pos.z - P_ENTRADA.z) < 0.01);
      // Esc sale del hoyo y no abre además la Pausa (ui.js abre la Pausa al soltar Esc si nadie se quedó la tecla)
      {
        const pausaAbierta = () => { const pz = document.getElementById('pause'); try { return !!(pz && pz.matches(':popover-open')) || pausa(); } catch (e) { return pausa(); } };
        iniciar({ forzar }); const dentro = A.fase !== 'nada' && camOk();
        const kd = tecla('keydown', 'Escape'); const fuera = A.fase === 'nada'; tecla('keyup', 'Escape');
        const abierta = pausaAbierta(); if (abierta) { try { document.getElementById('pause').hidePopover(); } catch (e) { /* */ } }
        check('Esc sale del hoyo y no abre la Pausa; la cámara vuelve a la de explorar', dentro && fuera && kd.defaultPrevented && !abierta && !camOk(),
          JSON.stringify({ dentro, fuera, pausa: abierta, cam: [G.camara.CAM.height, G.camara.CAM.dist] }));
      }
      check('Opcional: no da monedas, ni tienda, ni ranking; el récord solo vive en este aparato', !('monedas' in A) && !document.querySelector('#v18-golf [data-k="ranking"]'));
      // 9. «Comenzar de cero» borra el récord (vive en el progreso V18)
      V.borrar(); V.recargar();
      check('«Comenzar de cero» (borra el progreso V18) también borra el récord del minigolf', record() === null);
      // 10. Por turnos (2–4 jugadores en el mismo aparato): sin récord ni premios
      toasts.length = 0; const mad0 = mad(), hex = i => '#' + semilla.userData.franja.material.color.getHexString() === COLORES[i];
      const espera = () => correr(ESPERA + 0.1), meter = () => { colocar(NIDO.u - 3, 0); apuntaLocal(NIDO.u, NIDO.v); tirar(fuerzaPara(3.3)); hastaQuieta(); };
      iniciar({ forzar });
      check('Al empezar se elige cuántos juegan (4 botones grandes y «Salir»); por defecto 1 jugador', A.eligiendo && A.njug === 1 && !hud.q('elige').hidden && hud.q('bot').hidden &&
        hud.el.querySelectorAll('[data-k="elige"] button').length === 5 && hud.q('jugs').hidden);
      { const bs = hud.el.querySelector('[data-k="elige"] [data-a="salir"]'); bs.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })); bs.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true })); }
      check('QA-189: «Salir» en el selector (táctil) abandona sin elegir jugadores: HUD fuera y control devuelto', A.fase === 'nada' && A.eligiendo === false && hud.el.hidden && !document.body.classList.contains('v18-golf-on'));
      iniciar({ forzar });
      tecla('keydown', 'Enter');
      check('Enter = 1 jugador: la partida de siempre (controles, récord, sin turnos ni marcas)', !A.eligiendo && A.njug === 1 && J.length === 1 && !hud.q('bot').hidden && hud.q('elige').hidden &&
        hud.q('turno').textContent === '' && hud.q('record').textContent === TXT.sinRecord && hex(0) === false && !aroTurno.visible);
      salir(); iniciar({ forzar }); tecla('keydown', '2'); correr(0.05);
      check('Tecla 2 = 2 jugadores: «Turno: Jugador 1», golpes de cada uno y su color', A.njug === 2 && J.length === 2 && A.turno === 0 && hud.q('turno').textContent === turnoTxt(0) &&
        hud.q('turno').style.color !== '' && hud.q('jugs').children.length === 2 && !hud.q('jugs').hidden && hud.q('record').textContent === '' && hex(0) && aroTurno.visible, hud.q('jugs').textContent);
      apuntaLocal(TEE.u + 4, 0); seguir(0, true); tirar(0.3); hastaQuieta(); const enEspera = A.fase === 'turno'; espera();
      check('El turno pasa al otro cuando la semilla se para; cada uno con su sitio, sus golpes y su color', enEspera && A.turno === 1 && A.fase === 'apuntar' && A.golpes === 0 && J[0].golpes === 1 &&
        Math.hypot(B.x - P_TEE.x, B.z - P_TEE.z) < 0.01 && fantasmas[0].visible && !fantasmas[1].visible && toasts.includes(turnoTxt(1)) && hud.q('turno').textContent === turnoTxt(1) && hex(1) &&
        hud.q('jugs').textContent.includes(jugTxt(0, 1)), JSON.stringify({ fase: A.fase, turno: A.turno, golpes: J.map(j => j.golpes), jugs: hud.q('jugs').textContent }));
      // Grito: uno por jugador
      const gritar = () => { colocar(TEE.u, 0); apuntaLocal(TEE.u + 5, 0); tirar(0.15); correr(0.4); apuntaLocal(enLocal().u + 4, enLocal().v); const r = grito(); correr(0.3); return r; };
      const gB1 = gritar(), gB2 = grito(); hastaQuieta(); espera();
      const gA1 = A.turno === 0 && !A.grito ? gritar() : { ok: false }; hastaQuieta(); espera();
      const gB3 = A.turno === 1 && A.grito ? gritar() : { ok: true };
      check('Grito del Yunque: uno por jugador y por hoyo', gB1.ok && gB2.motivo === 'usado' && gA1.ok && !gB3.ok && gB3.motivo === 'usado', JSON.stringify([gB1.ok, gB2.motivo, gA1.ok, gB3.motivo]));
      hastaQuieta(); espera();
      // Fuera del área: +1 solo para ese jugador
      const gA = J[0].golpes, gBb = J[1].golpes, t0 = A.turno;
      colocar(0, 1.5); apuntaLocal(0, 9); tirar(0.4); { const p = aMundo(K, 0, HW + 1.5); B.x = p.x; B.z = p.z; } correr(0.1); espera();
      check('Si sale del área suma 1 golpe solo a quien tiró, y pasa el turno', t0 === 0 && J[0].golpes === gA + 2 && J[1].golpes === gBb && A.turno === 1, JSON.stringify({ t0, antes: [gA, gBb], ahora: J.map(j => j.golpes) }));
      // Quien entra en el nido se salta
      meter(); const dentroB = J[1].dentro && A.fase === 'turno' && toasts.includes(nidoJTxt(1, J[1].golpes)); espera();
      colocar(TEE.u, 0); apuntaLocal(TEE.u + 4, 0); tirar(0.2); hastaQuieta(); espera();
      check('Quien ya está en el nido se salta: vuelve a tirar el que falta (y su marca no se ve)', dentroB && A.turno === 0 && A.fase === 'apuntar' && !fantasmas[1].visible && /✓/.test(hud.q('jugs').textContent), JSON.stringify({ turno: A.turno, fase: A.fase }));
      meter(); espera();
      const esp = clasificar(J), res = A.resultado || {};
      check('Todos en el nido: tabla por golpes con medalla de cada uno y quién gana', A.fase === 'nido' && res.multi && !hud.q('fin').hidden && !hud.q('tabla').hidden && hud.q('fin2').hidden &&
        hud.q('tabla').children.length === 2 && hud.q('fin1').textContent === esp.txt && hud.q('tabla').children[0].textContent.includes(nombre(esp.filas[0].i)) && esp.filas[0].golpes <= esp.filas[1].golpes,
        JSON.stringify({ fin1: hud.q('fin1').textContent, filas: esp.filas }));
      check('Por turnos no hay récord ni premios (y se dice)', record() === null && mad() === mad0 && !V.otorgado('minigolf_villa_completo') && !V.otorgado('minigolf_villa_oro') && res.premios.length === 0 &&
        hud.q('fin3').textContent === TXT.sinPremios, 'madera ' + (mad() - mad0));
      reiniciar();
      check('«Otra vez» repite con los mismos jugadores, todo a 0', A.njug === 2 && J.length === 2 && J.every(j => !j.golpes && !j.dentro) && A.turno === 0 && A.fase === 'apuntar' && !A.eligiendo && hud.q('fin').hidden && !hud.q('bot').hidden);
      // Tope de 10 golpes: cuenta como terminado con 10; los dos igual = empate
      const alTope = () => { A.golpes = TOPE - 1; colocar(TEE.u, 0); apuntaLocal(TEE.u + 3, 0); tirar(0.15); hastaQuieta(); espera(); };
      alTope(); const tope1 = J[0].tope && J[0].golpes === TOPE && A.turno === 1; alTope();
      check('Con 10 golpes cuenta como terminado; si empatan: «¡Empate!»', tope1 && A.fase === 'nido' && A.resultado.empate && hud.q('fin1').textContent === TXT.empate &&
        A.resultado.jugadores.every(r => r.golpes === TOPE && r.puesto === 1 && r.medalla === 'bronce'), JSON.stringify(A.resultado.jugadores));
      const c4 = clasificar([{ golpes: 5 }, { golpes: 2 }, { golpes: 4 }, { golpes: 2 }]), c3 = clasificar([{ golpes: 4 }, { golpes: 3 }, { golpes: 6 }]);
      check('Orden de la tabla y ganador (empates comparten puesto)', c4.empate && c4.filas.map(r => r.i).join() === '1,3,2,0' && c4.filas.map(r => r.puesto).join() === '1,1,3,4' &&
        !c3.empate && c3.ganador === 1 && c3.txt === '¡Gana Jugador 2!' && c3.filas.map(r => r.medalla).join() === 'oro,plata,bronce');
      salir(); iniciar({ forzar });
      { const b4 = hud.el.querySelector('[data-a="j4"]'); b4.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })); b4.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); }
      check('Botón «4 jugadores» (táctil): 4 jugadores, cada uno con su color', A.njug === 4 && J.length === 4 && hud.q('jugs').children.length === 4 && new Set(COLORES).size === 4 && hud.q('elige').hidden);
      salir();
      check('Salir de una partida por turnos vuelve a 1 jugador y quita las marcas', A.njug === 1 && J.length === 0 && !aroTurno.visible && fantasmas.every(g => !g.visible) && hex(0) === false && record() === null);
    } catch (e) { check('Sin excepciones', false, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e); }
    try { if (A.fase !== 'nada') salir(); } catch (e) { /* ya fuera */ }
    A.manual = false; A.invitado = true; puntos.visible = false;
    G.ui.toast = toast0;
    S.inv = inv0; try { G.objetos.renderInv(); } catch (e) { /* HUD */ }
    S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z; S.facing = fac0; M.flying = fly0; M.vx = M.vz = 0; G.camara.yaw = yaw0;
    try { G.camara.place(true); } catch (e) { /* cámara */ }
    try { if (crudo == null) localStorage.removeItem(V.clave()); else localStorage.setItem(V.clave(), crudo); } catch (e) { /* */ }
    V.recargar(); if (susp) susp(false);
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }
  // Acceso directo (Kelvin 7-nov: «no lo veo publicado para probarlo»): botón «Minigolf» en el menú de pausa del cap. 1
  // y enlace ?mini=golf. Lleva a Vittata a la entrada del hoyo de Villa Raíz y empieza la partida.
  function irYJugar() {
    if (!K || !ofrecible() || A.fase !== 'nada') return false;
    if (M.flying) { try { F.endFlight(); } catch (e) { /* ya en el suelo */ } }
    S.pos.x = P_ENTRADA.x; S.pos.z = P_ENTRADA.z; S.pos.y = H(S.pos.x, S.pos.z) + 0.05; S.vy = 0; M.vx = M.vz = 0;
    return iniciar({ forzar: true });
  }
  {
    let tile = null;
    const menu = G.ui.$ && G.ui.$('pause');
    if (menu) menu.addEventListener('beforetoggle', e => {
      if (e.newState !== 'open') return;
      const grid = menu.querySelector('.pause-grid'); if (!grid) return;
      if (!tile) {
        tile = document.createElement('button');
        tile.className = 'btn tile'; tile.id = 'b-v18-minigolf'; tile.type = 'button';
        tile.setAttribute('data-icon', 'star'); tile.setAttribute('popovertarget', 'pause'); tile.setAttribute('popovertargetaction', 'hide');
        tile.textContent = 'Minigolf';
        tile.addEventListener('click', () => setTimeout(irYJugar, 0));
        grid.appendChild(tile);
      }
      tile.hidden = !(K && ofrecible() && A.fase === 'nada');
    });
    if (/[?&]mini=golf\b/.test(location.search)) {
      let n = 0;
      const probar = () => { if (libre() && !otroActivo() && irYJugar()) return; if (++n < 180) setTimeout(probar, 1000); };
      setTimeout(probar, 1500);
    }
  }
  G.v18minigolf = { ID, PAR, irYJugar, iniciar, salir, reiniciar, tirar, grito, empezarCarga, soltarCarga, paso, medalla, record, elegir, clasificar, jugadores: () => J, estado: () => A, semilla: () => B, get sitio() { return K; }, mapa: () => (K && ofrecible() && A.fase === 'nada' ? { x: P_ENTRADA.x, z: P_ENTRADA.z, nombre: TXT.nombre } : null), test };
  return G.v18minigolf;
};
