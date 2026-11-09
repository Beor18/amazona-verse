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
   - Hoyos 2 a 6 (Kelvin 8-nov, DECISION_LOG: «terminar los hoyos 2 a 6 reutilizando las mecánicas que existen»; tabla §10 de la
     directiva): las mismas piezas (borde y troncos bajos, nido, semilla, alfombra de salida), la misma física y el Grito como
     único poder (uno por hoyo). Cada uno en una zona que ya existe, en un sitio fijo medido en el juego con el streaming cargado
     (seco, sin edificios ni sólidos dentro, a ≥ 1,5 m de los senderos, lejos de las misiones): 2 · Templos de la Colina (rebotes;
     en la Ciudad de los 36 solo cabe un hoyo), 3 · Puerto de La Mina (cuestas del terreno), 4 · río de Villa Raíz (calle
     estrecha junto al agua), 5 · bosque nublado (niebla y árboles del bosque como obstáculos; el mapa no tiene una zona
     nocturna) y 6 · Ciudad de los 36 (circuito final, par 4). Los árboles que caerían en la salida, el nido o los huecos se quitan del bosque (despejar, como combate.js).
     Par, récord y medalla por hoyo (G.v18.mundo('minigolf_h<n>')); premios una sola vez por logro y hoyo, con el esquema del
     hoyo 1 (3 fibras al completarlo, 2 maderas con el primer oro). El hoyo n se abre al completar el n − 1 (también por turnos).
     En el mundo cada hoyo tiene su estación (piezas, invitación, Acción y marcador del minimapa si está abierto); desde el
     menú «¿Cómo quieres jugar?» o la Pausa, con más de un hoyo abierto, primero «¿Qué hoyo quieres jugar?». Al terminar,
     «Siguiente hoyo» (con los mismos jugadores) y «Elegir hoyo».
   Solo con la bandera V18. Prueba: AV.v18MinigolfTest(). */
window.AVV18Minigolf = function (G) {
  'use strict';
  const alMenu = () => !!(G.menuModos && G.menuModos.desdeMenu && G.menuModos.desdeMenu()); /* se entró desde «¿Cómo quieres jugar?»: el botón del final lleva al menú */
  if (G.v18minigolf) return G.v18minigolf;
  const S = G.S, V = G.v18, HAB = G.v18hab, F = G.fisica, M = F.MOVE, scene = G.renderer.scene;
  // Medidas del hoyo (metros, ejes locales: u a lo largo, de la salida al nido; v de lado). Las del hoyo en juego (L, HW,
  // TEE, NIDO, TRONCOS, CLAVES, PAR, ID) cambian con usar(): cada hoyo trae las suyas en HOYOS.
  const R = 0.36, TRONCO = 0.2, MARGEN = 0.8, NIDO_R = 0.62;
  // Troncos: segmentos { u0, v0, u1, v1 }. Claves: puntos que tienen que quedar libres (salida, nido, huecos y el camino
  // de iniciación). sitio: fijo (medido en el juego con el streaming cargado) o null (hoyo 1: se busca, ver buscarSitio).
  // arboles: cuántos árboles o rocas del bosque pueden quedarse dentro como obstáculos (los de las claves se quitan).
  const TR = (u, v0, v1) => ({ u0: u, v0, u1: u, v1 });
  const HOYOS = [
    { n: 1, id: 'minigolf_villa', zona: 'Villa Raíz', par: 3, L: 18, HW: 3.5, sitio: null, arboles: 2,
      troncos: [TR(-2.5, -3.5, 0.3), TR(2.0, -0.3, 3.5)], // dejan un hueco a cada lado: zigzag o rebote
      claves: [[-2.5, 1.9], [2.0, -1.9], [-1.2, 2.0], [0.8, -2.0], [3.8, -2.0], [-5, 0.8], [5.3, -1]] },
    // 2 · Rebotes y obstáculos de pueblo: un tronco en medio tapa la línea recta; se pasa por un lado o rebotando en el borde.
    // Dos troncos cortos en diagonal cierran las esquinas del nido. En los Templos de la Colina (ruinas de piedra como las de la
    // Ciudad): en la Ciudad de los 36 solo cabe un hoyo (medido: un único llano sin ruinas, el del hoyo 6).
    { n: 2, id: 'minigolf_h2', zona: 'Templos de la Colina', par: 3, L: 16, HW: 3.5, sitio: { x: -8, z: 186, a: 4.9742 }, arboles: 0,
      troncos: [TR(0, -1.5, 1.5), { u0: 3.6, v0: 2.3, u1: 4.6, v1: 3.5 }, { u0: 3.6, v0: -2.3, u1: 4.6, v1: -3.5 }],
      claves: [[0, 2.6], [0, -2.6], [-1.5, 2.5], [1.8, 2.4], [-1.5, -2.5], [1.8, -2.4], [3, 0], [-3.5, 0.8]] },
    // 3 · Cuestas: el terreno del sitio baja o sube (la pendiente de siempre hace rodar la semilla) y un tronco deja un hueco
    // (en la terraza alta del sur del puerto, lejos de la plaza, la escalera de la misión, la poza y la gruta)
    { n: 3, id: 'minigolf_h3', zona: 'Puerto de La Mina', par: 3, L: 18, HW: 3.5, sitio: { x: 98, z: -154, a: 2.3562 }, arboles: 0,
      troncos: [TR(1, -3.5, 1.2)],
      claves: [[-2, 2.3], [2.5, 2.3], [1, 2.4], [4, 1], [-4.5, 1]] },
    // 4 · Precisión: calle estrecha junto al agua (si se sale o cae al agua, vuelve a su sitio con +1) y un tronco
    // (en la orilla este, frente a Villa Raíz: lejos de la explanada del duelo y del Terreno A)
    { n: 4, id: 'minigolf_h4', zona: 'Río de Villa Raíz', par: 3, L: 16, HW: 2.4, sitio: { x: 223, z: 162, a: 1.8326 }, arboles: 0,
      troncos: [TR(0.5, -2.4, 0.5)],
      claves: [[-0.8, 1.5], [1.8, 1.4], [0.5, 1.5], [3.5, 0.8]] },
    // 5 · Bosque nublado (el mapa no tiene zona nocturna: aquí hay niebla y luciérnagas): los árboles del bosque (hasta 4
    // dentro, como obstáculos) tapan el nido; la flecha guía. Al oeste de la Ciudad de los 36, en el bosque enano.
    { n: 5, id: 'minigolf_h5', zona: 'Bosque nublado', par: 3, L: 18, HW: 3.5, sitio: { x: -107, z: -184, a: 0.2618 }, arboles: 4,
      troncos: [TR(-3, -3.5, 0.4)],
      claves: [[-3, 2.2], [0, -2], [3, 2], [-5, 0.8]] },
    // 6 · Circuito final: más largo, tres troncos en zigzag; el Grito (uno por hoyo) ayuda a recortar. En el único llano sin
    // ruinas de la Ciudad de los 36 (medido: 20 m es lo más largo que cabe)
    { n: 6, id: 'minigolf_h6', zona: 'Ciudad de los 36', par: 4, L: 20, HW: 3.5, sitio: { x: -35, z: -121, a: 5.7596 }, arboles: 0,
      troncos: [TR(-4, -3.5, 1.0), TR(0, -1.0, 3.5), TR(4, -3.5, 1.0)],
      claves: [[-4, 2.3], [0, -2.3], [4, 2.3], [-2, 0], [2, 0], [6, 0.6]] }
  ];
  for (const h of HOYOS) {
    h.tee = { u: -h.L / 2 + 1.8, v: 0 }; h.nido = { u: h.L / 2 - 2.2, v: 0 };
    // salida, nido y (hoyos 2–6) la entrada recta al nido (3 m) siempre libres; el hoyo 1 se queda con las suyas (su sitio no cambia)
    h.CL = [h.tee, h.nido].concat(h.n > 1 ? [{ u: h.nido.u - 1.5, v: 0 }, { u: h.nido.u - 3, v: 0 }] : [], h.claves.map(c => ({ u: c[0], v: c[1] })));
  }
  let HOYO = HOYOS[0], ID = HOYO.id, PAR = HOYO.par, L = HOYO.L, HW = HOYO.HW, TEE = HOYO.tee, NIDO = HOYO.nido, TRONCOS = HOYO.troncos, CLAVES = HOYO.CL;
  // Física
  const PASO = 1 / 120, VMIN = 1.5, VMAX = 13, ROCE_A = 1.4, ROCE_B = 0.55, PEND = 0.6, REBOTE = 0.62, ROCE_PARED = 0.9,
    REPOSO = 0.12, CAIDA = 3.2, EMBUDO = 3.5, T_MAX = 25, PERIODO = 1.3, GIRO = 1.1;
  const TXT = {
    label: 'Jugar al minigolf', nombre: 'Minigolf de Villa Raíz', invita: 'Minigolf de Villa Raíz: lleva la semilla gigante hasta el nido. Pulsa Acción junto a ella.',
    empieza: '¡Hoyo 1, par 3! Lleva la semilla gigante al nido en los menos golpes que puedas.',
    empiezaPar: '¡Hoyo 1! Mete la semilla en el nido. Par 3: lo ideal son 3 golpes.',
    // Cómo se juega (Kelvin 8-nov, «que se entienda solo»): meta siempre a la vista, teclas en los botones y una pista corta
    guia: 'Apunta con ← → y mantén Espacio para golpear',
    guiaT: 'Apunta con ◀ ▶ y mantén Golpear',
    meta: 'Mete la semilla en el nido', metaOro: 'Oro con 3 golpes o menos',
    pSuelta: '¡Suelta para golpear!', pGrito: '¡Pulsa G: el Grito la empuja!', pGritoT: '¡Toca Grito: la empuja!',
    pSuave: 'Mantén pulsado más rato: más fuerza', pFuerte: '¡Muy fuerte! Cerca del nido, golpea suave',
    pCerca: '¡Casi! Ahora un golpe suave', pFlecha: 'Apunta hacia la flecha del nido',
    medOro: '¡Oro: lo lograste en 3 golpes o menos!', medOtra: 'Para el oro: 3 golpes o menos',
    fuera: '¡La semilla se salió! Vuelve a su sitio (+1 golpe).', gritoYa: 'El Grito del Yunque ya se usó en este hoyo.',
    gritoQuieta: 'El Grito empuja la semilla mientras rueda.', grito: '¡Grito del Yunque!', otra: 'Otra vez', seguir: 'Seguir explorando', menu: 'Volver al menú',
    sale: '¡Hasta luego! El minigolf te espera en Villa Raíz.', hoyo: 'Hoyo 1 · Villa Raíz', par: 'Par 3', golpe: 'Golpear', soltar: 'Soltar',
    poder: 'Grito', reiniciar: 'Reiniciar', salir: 'Salir', fuerza: 'Fuerza', izq: 'Apuntar a la izquierda', der: 'Apuntar a la derecha',
    nuevo: '¡Nuevo récord!', sinRecord: 'Récord: —', usado: 'Grito usado',
    oro: 'Medalla de oro', plata: 'Medalla de plata', bronce: 'Medalla de bronce',
    elige: '¿Cuántos juegan?', eligeSub: 'Por turnos, en este mismo aparato', j1: '1 jugador', j2: '2 jugadores', j3: '3 jugadores', j4: '4 jugadores',
    empate: '¡Empate!', sinPremios: 'En partidas por turnos no hay premios ni récord', tope: '¡10 golpes! Cuenta como terminado.',
    oroC: 'Oro', plataC: 'Plata', bronceC: 'Bronce',
    premio1: '¡Primer hoyo completado! Ganaste 3 fibras: sirven igual que la madera para reparar.', premioOro: '¡Primera medalla de oro! Ganaste 2 maderas.',
    // Hoyos 2 a 6 (inglés en content/cap1/en.js, bloque «en7»)
    eligeHoyo: '¿Qué hoyo quieres jugar?', eligeHoyoSub: 'Completa un hoyo para abrir el siguiente', siguiente: 'Siguiente hoyo', hoyos: 'Elegir hoyo',
    cerradoC: 'Cerrado', sinJugar: 'Sin jugar'
  };
  // Textos que dependen del hoyo. El 1 se queda con los de siempre (ya traducidos en content/cap1/en.js)
  const EN = { 1: 'Villa Raíz', 2: 'los Templos de la Colina', 3: 'Puerto de La Mina', 4: 'el río de Villa Raíz', 5: 'el bosque nublado', 6: 'la Ciudad de los 36' }; // «está en …»
  const PISTA = { 2: 'Usa los bordes: la semilla rebota.', 3: 'Ojo con las cuestas: la semilla rueda cuesta abajo.', 4: 'Golpea con cuidado: si cae al agua, vuelve (+1 golpe).',
    5: 'Los árboles tapan el nido: sigue la flecha.', 6: 'El gran final: guarda el Grito para el mejor momento.' };
  function tx(k, h) {
    h = h || HOYO; if (h.n === 1) return TXT[k];
    const n = h.n, p = h.par;
    switch (k) {
      case 'label': return 'Jugar al minigolf (hoyo ' + n + ')';
      case 'nombre': return 'Minigolf, hoyo ' + n;
      case 'invita': return 'Minigolf, hoyo ' + n + ': lleva la semilla gigante hasta el nido. Pulsa Acción junto a ella.';
      case 'empieza': case 'empiezaPar': return '¡Hoyo ' + n + ', par ' + p + '! ' + PISTA[n];
      case 'hoyo': return 'Hoyo ' + n + ' · ' + h.zona;
      case 'par': return 'Par ' + p;
      case 'metaOro': return 'Oro con ' + p + ' golpes o menos';
      case 'medOro': return '¡Oro: lo lograste en ' + p + ' golpes o menos!';
      case 'medOtra': return 'Para el oro: ' + p + ' golpes o menos';
      case 'sale': return '¡Hasta luego! El minigolf te espera en ' + EN[n] + '.';
      case 'premio1': return '¡Hoyo ' + n + ' completado por primera vez! Ganaste 3 fibras: sirven igual que la madera para reparar.';
      case 'premioOro': return '¡Primera medalla de oro en el hoyo ' + n + '! Ganaste 2 maderas.';
      default: return TXT[k];
    }
  }
  const cerradoTxt = n => 'El hoyo ' + n + ' se abre al completar el hoyo ' + (n - 1) + '.';
  const abreTxt = h => '¡Hoyo ' + h.n + ' abierto! Está en ' + EN[h.n] + '.';
  const etHoyo = n => 'Hoyo ' + n;
  // Premios (Kelvin 5-nov), una sola vez por logro y por hoyo, al inventario de siempre: la fibra cuenta como madera (reparar.js,
  // BM148). Hoyo 1 con sus claves de siempre; los demás, el mismo esquema (Kelvin 8-nov: sin premios mayores)
  const premiosDe = h => {
    const c = h.n === 1 ? 'minigolf_villa' : 'minigolf_h' + h.n;
    return [{ clave: c + '_completo', marca: 'minigolf_completo', madera: 3, txt: 'premio1', cuando: () => true },
      { clave: c + '_oro', marca: 'minigolf_oro', madera: 2, txt: 'premioOro', cuando: med => med === 'oro' }];
  };
  for (const h of HOYOS) h.premios = premiosDe(h);
  function premiar(med) {
    const dados = [];
    for (const p of HOYO.premios) {
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
  // Se lee en cada uso (como duelo2.js): la prueba simula un aparato táctil cambiando matchMedia
  let _mmF = null, _mm = null; // la consulta se guarda (su .matches está vivo); se rehace si cambian window.matchMedia (las pruebas lo simulan)
  const tactil = () => { const f = window.matchMedia; if (!f) return false; if (f !== _mmF) { _mmF = f; _mm = matchMedia('(pointer: coarse)'); } return !!(_mm && _mm.matches); };
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
  const H1 = HOYOS[0];
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
    const L = H1.L, HW = H1.HW, CLAVES = H1.CL; // solo el hoyo 1 busca su sitio
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
    const L = H1.L;
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
    const L = H1.L, HW = H1.HW;
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
  // Cada hoyo tiene su estación con sus piezas (borde y troncos en una InstancedMesh, nido, alfombra de salida y una semilla
  // quieta en la salida); comparten geometrías y materiales. La semilla que rueda, la mira, el aro, los fantasmas y la flecha
  // son una sola (los del hoyo en juego).
  const matMadera = new THREE.MeshStandardMaterial({ color: '#7a5230', roughness: 0.95, metalness: 0, flatShading: true });
  const geoTronco = new THREE.CylinderGeometry(TRONCO, TRONCO, 1, 7);
  const MAX_PIEZAS = 48;
  const nidoBase = new THREE.Group();
  {
    const aro = new THREE.Mesh(new THREE.TorusGeometry(NIDO_R + 0.12, 0.2, 6, 18), new THREE.MeshStandardMaterial({ color: '#9a7443', roughness: 1, flatShading: true }));
    aro.rotation.x = Math.PI / 2; nidoBase.add(aro);
    const fondo = new THREE.Mesh(new THREE.CircleGeometry(NIDO_R + 0.02, 18), new THREE.MeshStandardMaterial({ color: '#3b2a17', roughness: 1 }));
    fondo.rotation.x = -Math.PI / 2; fondo.position.y = 0.03; nidoBase.add(fondo);
    const palo = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.2, 6), matMadera); palo.position.set(NIDO_R + 0.3, 1.1, 0); nidoBase.add(palo);
    const ban = new THREE.Shape(); ban.moveTo(0, 0); ban.lineTo(0.75, -0.22); ban.lineTo(0, -0.45);
    const banderin = new THREE.Mesh(new THREE.ShapeGeometry(ban), new THREE.MeshStandardMaterial({ color: '#f2a03d', roughness: 0.8, side: THREE.DoubleSide, flatShading: true }));
    banderin.position.set(NIDO_R + 0.32, 2.15, 0); banderin.name = 'banderin'; nidoBase.add(banderin);
  }
  const FRANJA0 = '#6b4220';
  const geoCuerpo = new THREE.SphereGeometry(R, 18, 14), matCuerpo = new THREE.MeshStandardMaterial({ color: '#c98f45', roughness: 0.7, flatShading: true });
  const geoFranja = new THREE.TorusGeometry(R * 0.98, 0.045, 6, 22), matFranja0 = new THREE.MeshStandardMaterial({ color: FRANJA0, roughness: 0.8 });
  const nuevaSemilla = matF => { const g = new THREE.Group(), franja = new THREE.Mesh(geoFranja, matF); g.add(new THREE.Mesh(geoCuerpo, matCuerpo), franja); g.userData.franja = franja; return g; };
  const semilla = nuevaSemilla(new THREE.MeshStandardMaterial({ color: FRANJA0, roughness: 0.8 })); semilla.name = 'v18_golf_semilla'; // la del turno cambia de color
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
  const geoSalida = new THREE.RingGeometry(1.0, 1.25, 40), matSalida = new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide });
  // Mira: naranja vivo y algo más grande (QA con input real: crema sobre la arena no se distinguía)
  const N_PUNTOS = 8, puntos = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff6a2b', transparent: true, opacity: 0.95, depthWrite: false }), N_PUNTOS);
  puntos.name = 'v18_golf_mira';
  // Flecha sobre el nido mientras se juega (8-nov): el nido queda lejos y pequeño; así se ve a dónde hay que llevar la semilla
  const flecha = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.7, 14), new THREE.MeshStandardMaterial({ color: '#ff6a2b', emissive: '#ff6a2b', emissiveIntensity: 0.45, roughness: 0.5, flatShading: true }));
  flecha.rotation.x = Math.PI; flecha.name = 'v18_golf_flecha';
  const anadir = m => { m.frustumCulled = false; m.visible = false; scene.add(m); };
  for (const m of [semilla, puntos, aroTurno, flecha, ...fantasmas]) anadir(m);
  puntos.renderOrder = 4;
  const _o = new THREE.Object3D(), _q = new THREE.Quaternion(), _ax = new THREE.Vector3(), _y = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3();
  // Estaciones: una por hoyo (piezas propias, segmentos de choque y puntos clave en el mundo)
  const EST = HOYOS.map(h => {
    const sufijo = h.n === 1 ? '' : '_' + h.n;
    const troncos = new THREE.InstancedMesh(geoTronco, matMadera, MAX_PIEZAS); troncos.name = 'v18_golf_troncos' + sufijo; troncos.castShadow = false;
    const nido = nidoBase.clone(); nido.name = 'v18_golf_nido' + sufijo; nido.userData.banderin = nido.getObjectByName('banderin');
    const salida = new THREE.Mesh(geoSalida, matSalida); salida.rotation.x = -Math.PI / 2; salida.renderOrder = 3; salida.name = 'v18_golf_salida' + sufijo;
    const quieta = nuevaSemilla(matFranja0); quieta.name = 'v18_golf_semilla_quieta' + sufijo; // la semilla en su salida cuando el hoyo no se juega
    for (const m of [troncos, nido, salida, quieta]) anadir(m);
    return { h, i: h.n - 1, K: null, SEGS: [], OBST: [], P_NIDO: null, P_TEE: null, P_ENTRADA: null, troncos, nido, salida, quieta, it: null, despejados: 0 };
  });
  let cur = 0; // la estación del hoyo en juego (o la más cercana, sin jugar)
  let troncos = EST[0].troncos, nido = EST[0].nido, salida = EST[0].salida;

  // Segmentos de colisión (mundo) y piezas de tronco que los dibujan
  let K = null, SEGS = [], OBST = [], P_NIDO = null, P_TEE = null, P_ENTRADA = null, it = null;
  function montarEst(e, k) {
    const h = e.h, tr = e.troncos;
    e.K = k; e.SEGS = []; e.OBST = (k.arboles || []).slice(); tr.count = MAX_PIEZAS;
    const seg = (u0, v0, u1, v1) => { const a = aMundo(k, u0, v0), b = aMundo(k, u1, v1); e.SEGS.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z, r: TRONCO }); };
    seg(-h.L / 2, -h.HW, h.L / 2, -h.HW); seg(-h.L / 2, h.HW, h.L / 2, h.HW); seg(-h.L / 2, -h.HW, -h.L / 2, h.HW); seg(h.L / 2, -h.HW, h.L / 2, h.HW);
    for (const t of h.troncos) seg(t.u0, t.v0, t.u1, t.v1);
    let n = 0;
    for (const s of e.SEGS) {
      const len = Math.hypot(s.bx - s.ax, s.bz - s.az), piezas = Math.max(1, Math.ceil(len / 3));
      for (let i = 0; i < piezas && n < MAX_PIEZAS; i++) {
        const x0 = s.ax + (s.bx - s.ax) * i / piezas, z0 = s.az + (s.bz - s.az) * i / piezas, x1 = s.ax + (s.bx - s.ax) * (i + 1) / piezas, z1 = s.az + (s.bz - s.az) * (i + 1) / piezas;
        const y0 = H(x0, z0) + TRONCO * 0.75, y1 = H(x1, z1) + TRONCO * 0.75;
        _d.set(x1 - x0, y1 - y0, z1 - z0); const l = _d.length() + TRONCO * 0.6; _d.normalize();
        _o.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); _o.quaternion.setFromUnitVectors(_y, _d); _o.scale.set(1, l, 1); _o.updateMatrix();
        tr.setMatrixAt(n++, _o.matrix);
      }
    }
    tr.count = n; tr.instanceMatrix.needsUpdate = true;
    e.P_NIDO = aMundo(k, h.nido.u, h.nido.v); e.P_TEE = aMundo(k, h.tee.u, h.tee.v); e.P_ENTRADA = aMundo(k, -h.L / 2 - 1.3, 0);
    e.nido.position.set(e.P_NIDO.x, H(e.P_NIDO.x, e.P_NIDO.z) + 0.02, e.P_NIDO.z); e.nido.rotation.y = -k.a;
    e.salida.position.set(e.P_TEE.x, H(e.P_TEE.x, e.P_TEE.z) + 0.06, e.P_TEE.z);
    e.quieta.position.set(e.P_TEE.x, H(e.P_TEE.x, e.P_TEE.z) + R * 0.95, e.P_TEE.z);
    if (e.it) { e.it.x = e.P_TEE.x; e.it.z = e.P_TEE.z; }
    if (e.i === cur) usar(cur);
  }
  // El hoyo en juego: sus medidas, su estación y sus puntos pasan a las variables de siempre (la física y el HUD las leen)
  function usar(i) {
    const e = EST[i]; cur = i; HOYO = e.h;
    ID = HOYO.id; PAR = HOYO.par; L = HOYO.L; HW = HOYO.HW; TEE = HOYO.tee; NIDO = HOYO.nido; TRONCOS = HOYO.troncos; CLAVES = HOYO.CL;
    troncos = e.troncos; nido = e.nido; salida = e.salida; it = e.it;
    K = e.K; SEGS = e.SEGS; OBST = e.OBST; P_NIDO = e.P_NIDO; P_TEE = e.P_TEE; P_ENTRADA = e.P_ENTRADA;
    if (K && A.fase === 'nada') ponerSemilla(P_TEE.x, P_TEE.z);
  }
  const montar = k => montarEst(EST[0], k); // el hoyo 1 (su sitio se busca)

  // ---------- Estado ----------
  const A = { fase: 'nada', golpes: 0, carga: 0, cargaT: 0, cargando: false, grito: false, giro: 0, manual: false, acc: 0, t: 0, nidoT: 0, timers: [],
    rebotes: 0, fueras: 0, ultimo: null, invitado: false, resultado: null, eligiendo: false, njug: 1, turno: 0, esperaT: 0, hundir: false,
    aviso: '', rapido: false, tiroP: 1, eligeHoyo: false }; // eligeHoyo: «¿Qué hoyo quieres jugar?» en pantalla; aviso: pista tras el último tiro ('cerca', 'fuerte', 'suave', 'flecha'); rapido: pasó por el nido demasiado deprisa
  let J = []; // jugadores de la partida: { golpes, x, z, ultimo, grito, f, dentro, tope }
  const multi = () => A.njug > 1;
  const B = { x: 0, y: 0, z: 0, vx: 0, vz: 0, mov: false, t: 0 };
  const pos = { x: 0, y: 0, z: 0 }; // la semilla como blanco del Grito (habilidades.js lee .pos)
  function ponerSemilla(x, z) { B.x = x; B.z = z; B.vx = B.vz = 0; B.mov = false; B.t = 0; B.y = H(x, z) + R * 0.95; semilla.position.set(B.x, B.y, B.z); }
  const recordDe = h => { const r = V && V.mundo(h.id); return r && typeof r === 'object' && r.mejor > 0 ? r : null; };
  const record = () => recordDe(HOYO);
  // El hoyo n se abre al completar el n − 1: con récord (1 jugador) o con una partida por turnos terminada ('minigolf_abierto')
  const ABIERTO = 'minigolf_abierto';
  function abierto(n) {
    if (n <= 1) return true;
    if (n > HOYOS.length) return false;
    const a = V ? V.mundo(ABIERTO) : 0;
    return !!recordDe(HOYOS[n - 2]) || (typeof a === 'number' && a >= n);
  }
  function abrir(n) { // → true si estaba cerrado
    if (n > HOYOS.length || !V) return false;
    const ya = abierto(n), a = V.mundo(ABIERTO);
    if (!(typeof a === 'number' && a >= n)) V.cambiarMundo(ABIERTO, n);
    return !ya;
  }
  const abiertos = () => { let n = 0; for (const h of HOYOS) if (abierto(h.n)) n++; return n; };
  const medalla = n => n <= PAR ? 'oro' : n === PAR + 1 ? 'plata' : 'bronce';
  const RANGO_M = { oro: 3, plata: 2, bronce: 1 };
  // Hacia dónde se apunta: hacia donde mira la cámara de siempre (arrastrar ya la gira)
  const dir = () => { const y = G.camara.yaw; return { x: -Math.sin(y), z: -Math.cos(y) }; };
  const _dir = { x: 0, z: 0 }; // la misma dirección para el cuadro (paso, seguir, mira): sin objeto nuevo; quien la guarde usa dir()
  const dirF = () => { const y = G.camara.yaw; _dir.x = -Math.sin(y); _dir.z = -Math.cos(y); return _dir; };
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
      if (o === it || /^v18_minigolf/.test(o.id || '')) continue; // las demás estaciones del minigolf no cuentan
      if (o.visible) { let v; try { v = o.visible(); } catch (e) { v = false; } if (!v) continue; }
      if (Math.hypot(S.pos.x - o.x, S.pos.z - o.z) < o.r) return true;
    }
    return false;
  }

  // ---------- Partida ----------
  let parVisto = false; // «par 3» se explica una vez por sesión
  let f = null; // luchador del Grito (habilidades.js): energía y espera propias del hoyo
  // o: { forzar, hoyo: n (si no, el de la estación más cercana), elegirHoyo: primero «¿Qué hoyo quieres jugar?» }
  function iniciar(o) {
    o = o || {};
    if (A.fase !== 'nada') return false;
    if (!ofrecible()) return false; // QA-189: fuera de Villa Raíz el hoyo no se ofrece ni siquiera forzado
    const hn = o.hoyo || HOYO.n;
    if (!EST[hn - 1] || !EST[hn - 1].K || !abierto(hn)) return false;
    if (!o.forzar && (!libre() || otroActivo())) return false;
    if (hn !== HOYO.n) usar(hn - 1);
    if (M.flying) { try { F.endFlight(); } catch (e) { /* ya en el suelo */ } }
    A.fase = 'apuntar'; A.njug = 1; A.eligeHoyo = !!o.elegirHoyo; A.eligiendo = !A.eligeHoyo;
    focoPrevio = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
    enganchar(); empezarHoyo(); montarHud(); llenarHud(); hud.el.hidden = false; hud.vista = null; if (A.eligeHoyo) pintarHoyos(); paneles(); pintar(true);
    if (!A.eligeHoyo) avisoEmpieza();
    emitir({ tipo: 'empieza', hoyo: HOYO.n });
    return true;
  }
  function avisoEmpieza() { toast(parVisto ? tx('empieza') : tx('empiezaPar'), parVisto ? 3000 : 4200); parVisto = true; }
  // Cambiar de hoyo sin salir (la pantalla de elegir hoyo o «Siguiente hoyo»): Vittata va a la nueva salida, el HUD y los
  // controles siguen. mismos: los mismos jugadores (sin volver a preguntar cuántos juegan)
  function irHoyo(n, mismos) {
    const e = EST[n - 1];
    if (A.fase === 'nada' || A.fase === 'rueda' || !e || !e.K || !abierto(n)) return false;
    A.eligeHoyo = false; A.resultado = null;
    if (n !== HOYO.n) usar(n - 1);
    if (!mismos) { A.njug = 1; A.eligiendo = true; } else A.eligiendo = false;
    empezarHoyo(); hud.vista = null; paneles(); pintar(true);
    avisoEmpieza(); if (mismos && multi()) setTimeout(() => toast(turnoTxt(0), 2000), G.quiet ? 0 : 3100);
    emitir({ tipo: 'hoyo', hoyo: n });
    return true;
  }
  function elegirHoyo(n) {
    if (!A.eligeHoyo) return false;
    if (!abierto(n)) { toast(cerradoTxt(n), 2200); return false; }
    return irHoyo(n, false);
  }
  // «Elegir hoyo» desde el final: la pantalla de hoyos sin salir del minigolf
  function verHoyos() {
    if (A.fase === 'nada' || A.fase === 'rueda' || abiertos() < 2) return false;
    A.eligeHoyo = true; A.eligiendo = false; A.resultado = null; A.fase = 'apuntar'; A.timers.length = 0; A.cargando = false; A.hundir = false;
    ponerSemilla(P_TEE.x, P_TEE.z); semilla.scale.setScalar(1);
    pintarHoyos(); hud.vista = null; paneles(); pintar(true);
    return true;
  }
  const siguienteHoyo = () => (HOYO.n < HOYOS.length && abierto(HOYO.n + 1) ? HOYO.n + 1 : 0);
  function empezarHoyo() {
    Object.assign(A, { golpes: 0, carga: 0, cargaT: 0, cargando: false, grito: false, acc: 0, nidoT: 0, rebotes: 0, fueras: 0, resultado: null, turno: 0, esperaT: 0, hundir: false, aviso: '', rapido: false, tiroP: 1 });
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
    if (n !== A.njug || J.length !== n) { A.njug = n; empezarHoyo(); }
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
    A.timers.length = 0; A.cargando = false; A.carga = 0; A.hundir = false; A.nidoT = 0; A.aviso = ''; semilla.scale.setScalar(1);
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
    const c = clasificar(J), sig = HOYO.n + 1;
    // por turnos tampoco hay récord ni premios, pero si alguien llegó al nido se abre el hoyo siguiente (jugar en familia también avanza)
    const seAbre = J.some(j => j.dentro) && sig <= HOYOS.length && !abierto(sig) && abrir(sig);
    A.resultado = { multi: true, hoyo: HOYO.n, jugadores: c.filas.map(r => Object.assign({}, r)), ganador: c.ganador, empate: c.empate, premios: [], nuevo: false, abre: seAbre ? sig : 0 };
    if (seAbre) setTimeout(() => toast(abreTxt(HOYOS[sig - 1]), 3600), G.quiet ? 0 : 1600);
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
    if (!hud || !hud.lleno) return;
    const fin = A.fase === 'nido', m = !!(A.resultado && A.resultado.multi), eh = A.eligeHoyo && !fin, sig = fin ? siguienteHoyo() : 0;
    hud.el.classList.toggle('vg-lado', A.eligiendo || eh || (fin && m)); // W29a: paneles altos (elegir jugadores u hoyo, tabla de varios): no llegan a la columna de botones de la derecha
    hud.q('hoyos').hidden = !eh;
    hud.q('elige').hidden = !A.eligiendo || fin || eh; hud.q('bot').hidden = A.eligiendo || fin || eh; hud.q('fin').hidden = !fin;
    hud.q('tabla').hidden = !m; hud.q('fin2').hidden = hud.q('fin4').hidden = m; hud.q('meta').hidden = fin || eh; hud.q('jugs').hidden = !multi() || fin || eh; // meta: en el final ya se dice cómo fue
    hud.q('barraW').hidden = hud.q('fuerzaEt').hidden = fin || A.eligiendo || eh; // la barra de fuerza vacía no pinta nada en el resultado
    hud.q('bsig').hidden = !sig; hud.q('bhoyos').hidden = !fin || abiertos() < 2; // «Siguiente hoyo» y «Elegir hoyo» en el final
    if (!m) { hud.q('fin1').style.color = ''; }
    enfocar(eh ? 'h' + HOYO.n : A.eligiendo && !fin ? 'j1' : fin ? (sig ? 'siguiente' : 'otra') : 'golpe');
  }
  // W35 · teclado: al cambiar de panel, el foco va a su primer botón (elegir: «1 jugador»; jugando: «Golpear»; resultado:
  // «Otra vez»), solo si el foco estaba en el juego o dentro del panel (no se le quita a otra ventana). Al salir vuelve a donde estaba.
  let focoPrevio = null;
  function enfocar(a) {
    if (!hud || hud.el.hidden || hud.vista === a) return;
    hud.vista = a;
    const act = document.activeElement, enJuego = !act || act === document.body || hud.el.contains(act) || (focoPrevio && act === focoPrevio);
    if (!enJuego) return;
    const b = hud.el.querySelector('button[data-a="' + a + '"]'); if (b && b.getClientRects().length) try { b.focus({ preventScroll: true }); } catch (e) { /* sin foco */ }
  }
  function reiniciar() { if (A.fase === 'nada' || A.eligeHoyo) return false; empezarHoyo(); pintar(true); emitir({ tipo: 'reinicia' }); return true; }
  function salir(motivo) {
    if (A.fase === 'nada') return false;
    A.fase = 'nada'; A.cargando = false; A.timers.length = 0; soltar();
    A.eligiendo = false; A.eligeHoyo = false; A.njug = 1; A.turno = 0; A.hundir = false; J = []; colorTurno(); aroTurno.visible = false; for (const g of fantasmas) g.visible = false;
    if (hud) {
      const dentro = hud.el.contains(document.activeElement); hud.el.hidden = true; hud.vista = null;
      if (dentro) { const f = focoPrevio; if (f && document.contains(f) && f.getClientRects().length && !hud.el.contains(f)) try { f.focus({ preventScroll: true }); } catch (e) { /* */ } else try { document.activeElement.blur(); } catch (e) { /* */ } }
      vaciarHud();
    }
    focoPrevio = null;
    ponerSemilla(P_TEE.x, P_TEE.z); semilla.scale.setScalar(1); puntos.visible = false; flecha.visible = false;
    S.pos.x = P_ENTRADA.x; S.pos.z = P_ENTRADA.z; S.pos.y = H(S.pos.x, S.pos.z) + 0.05; S.vy = 0; M.vx = M.vz = 0;
    if (motivo) toast(motivo, 2600);
    emitir({ tipo: 'sale' });
    return true;
  }
  function empezarCarga() {
    if (A.fase !== 'apuntar' || A.cargando || A.eligeHoyo) return false;
    if (A.eligiendo) elegir(1); // golpear sin elegir = 1 jugador
    A.cargando = true; A.cargaT = 0; A.carga = 0; return true;
  }
  function soltarCarga() {
    if (!A.cargando) return false;
    A.cargando = false; return tirar(Math.max(0.06, A.carga));
  }
  // Golpe: p de 0 a 1 (la fuerza), hacia donde se apunta
  function tirar(p) {
    if (A.fase !== 'apuntar' || A.eligeHoyo) return false;
    if (A.eligiendo) elegir(1);
    const d = dir(), v0 = VMIN + (VMAX - VMIN) * Math.max(0, Math.min(1, p));
    A.ultimo = { x: B.x, z: B.z };
    B.vx = d.x * v0; B.vz = d.z * v0; B.mov = true; B.t = 0;
    A.golpes++; A.fase = 'rueda'; A.carga = 0; A.aviso = ''; A.rapido = false; A.tiroP = p;
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
    ponerSemilla(A.ultimo.x, A.ultimo.z); A.fase = 'apuntar'; A.aviso = 'flecha';
    toast(TXT.fuera, 2200); sonar('wrong'); emitir({ tipo: 'fuera', n: A.golpes }); pintar();
    if (multi()) finTurno();
  }
  function alNido() {
    B.mov = false; B.vx = B.vz = 0; A.nidoT = 0; A.cargando = false; A.hundir = true; flecha.visible = false;
    if (multi()) { // por turnos: sin récord ni premios; entra y pasa el turno
      const i = A.turno, n = A.golpes; J[i].dentro = true;
      const y = H(P_NIDO.x, P_NIDO.z); fx('gold', P_NIDO.x, y + 0.6, P_NIDO.z, 12); fx('feathers', P_NIDO.x, y + 0.8, P_NIDO.z, 8); sonar('unlock');
      toast(nidoJTxt(i, n), 2600); emitir({ tipo: 'nido', jugador: i, golpes: n, medalla: medalla(n), nuevo: false });
      finTurno(); return;
    }
    A.fase = 'nido';
    const n = A.golpes, med = medalla(n), r0 = record(), nuevo = !r0 || n < r0.mejor, sig = HOYO.n + 1, cerrado = sig <= HOYOS.length && !abierto(sig);
    if (nuevo && V) V.cambiarMundo(ID, { mejor: n, medalla: med });
    if (cerrado) abrir(sig);
    const seAbre = cerrado;
    const r = record() || { mejor: n, medalla: med };
    const dados = premiar(med);
    A.resultado = { hoyo: HOYO.n, golpes: n, medalla: med, nuevo, mejor: r.mejor, premios: dados.map(p => p.clave), abre: seAbre ? sig : 0 };
    const y = H(P_NIDO.x, P_NIDO.z);
    fx('gold', P_NIDO.x, y + 0.6, P_NIDO.z, 14); fx('feathers', P_NIDO.x, y + 0.8, P_NIDO.z, 10); sonar('unlock');
    toast(nidoTxt(n), 3200);
    const avisos = dados.map(p => tx(p.txt)); if (seAbre) avisos.push(abreTxt(HOYOS[sig - 1]));
    avisos.forEach((t, i) => setTimeout(() => toast(t, 3600), G.quiet ? 0 : 1600 * (i + 1)));
    if (hud) {
      hud.q('fin1').textContent = nidoTxt(n); hud.q('fin2').textContent = TXT[med]; hud.q('fin2').dataset.m = med;
      hud.q('fin3').textContent = nuevo ? TXT.nuevo : recordTxt(r.mejor);
      hud.q('t-seguir').textContent = alMenu() ? TXT.menu : TXT.seguir;
      hud.q('fin4').textContent = med === 'oro' ? tx('medOro') : tx('medOtra');
      hud.q('fin').hidden = false; hud.q('bot').hidden = true;
    }
    paneles();
    emitir({ tipo: 'nido', hoyo: HOYO.n, golpes: n, medalla: med, nuevo });
    pintar(true);
  }

  // Pista tras un tiro que se para fuera del nido: lo más útil primero (se pasó de fuerza, quedó cerca, tiro flojo de un toque)
  const queAviso = dn => A.rapido ? 'fuerte' : dn < 3 ? 'cerca' : A.tiroP < 0.15 ? 'suave' : 'flecha';
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
    const qx = B.x - K.x, qz = B.z - K.z, qu = qx * K.ux + qz * K.uz, qv = qx * K.vx + qz * K.vz; // aLocal() sin objeto
    if (Math.abs(qu) > L / 2 + 0.4 || Math.abs(qv) > HW + 0.4 || agua(B.x, B.z) > B.y - R) { fuera(); return; }
    // al nido
    const dn2 = Math.hypot(P_NIDO.x - B.x, P_NIDO.z - B.z), sp2 = Math.hypot(B.vx, B.vz);
    if (dn2 < NIDO_R * 0.75 && sp2 < CAIDA) { alNido(); return; }
    if (dn2 < NIDO_R) A.rapido = true; // por encima del nido sin caer: iba demasiado deprisa
    // reposo (o tope de tiempo: nunca se queda rodando para siempre)
    if ((sp2 < REPOSO) || B.t > T_MAX) {
      B.vx = B.vz = 0; B.mov = false;
      if (A.fase === 'rueda') { A.fase = 'apuntar'; A.aviso = queAviso(dn2); emitir({ tipo: 'reposo', x: B.x, z: B.z, aviso: A.aviso }); pintar(); if (multi()) finTurno(); }
    }
  }

  // Vittata a un lado de la semilla, como un golfista, mirando hacia donde apunta (la cámara de siempre la sigue).
  // QA con input real: justo detrás, en la línea de puntería, tapaba la semilla y la línea de puntos desde la cámara.
  // Va a la izquierda de la pantalla (LADO m) y un poco atrás (ATRAS m): la semilla y la mira quedan libres a su derecha.
  // (ancla propia: lo que la física haya movido a la jugadora en este cuadro, p. ej. con el joystick oculto, no se acumula)
  const ancla = { x: 0, z: 0 }, LADO = 1.3, ATRAS = 0.7;
  const _sv = { x: 0, z: 0 }, _fac = { x: 0, z: 1 };
  const sitioVittata = () => { const d = dirF(), atras = A.fase === 'rueda' ? 2.2 : ATRAS; _sv.x = B.x - d.x * atras + d.z * LADO; _sv.z = B.z - d.z * atras - d.x * LADO; return _sv; };
  function seguir(dt, snap) {
    const t = sitioVittata(), d = dirF();
    const tx = t.x, tz = t.z, k = snap ? 1 : 1 - Math.exp(-6 * dt);
    ancla.x += (tx - ancla.x) * k; ancla.z += (tz - ancla.z) * k;
    S.pos.x = ancla.x; S.pos.z = ancla.z; S.pos.y = H(S.pos.x, S.pos.z) + 0.05;
    S.vy = 0; M.vx = M.vz = 0; M.dashT = 0; _fac.x = d.x; _fac.z = d.z; S.facing = _fac; // vector propio (como tren.js y flight.js): sin objeto por cuadro
    if (M.flying) { try { F.endFlight(); } catch (e) { /* ya en el suelo */ } } // el gesto de deslizar arriba (volar) no saca del hoyo
  }

  function dibujarMira() {
    const ver = A.fase === 'apuntar';
    puntos.visible = ver; if (!ver) return;
    const d = dirF(), largo = 1.2 + (A.cargando ? A.carga : 0.3) * 5;
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
    for (let i = 0; i < fantasmas.length; i++) { // bucle: sin closure por cuadro
      const g = fantasmas[i], j = m && i !== A.turno ? J[i] : null;
      g.visible = !!j && !j.dentro && Math.hypot(j.x - B.x, j.z - B.z) > R * 1.5;
      if (g.visible) g.position.set(j.x, H(j.x, j.z) + R * 0.95, j.z);
    }
  }
  // Sin jugar, el hoyo «en juego» es la estación más cercana (su semilla, su invitación); jugando no cambia
  function cercana() {
    let mejor = cur, dm = Infinity;
    for (let i = 0; i < EST.length; i++) { const k = EST[i].K; if (!k) continue; const d = Math.hypot(S.pos.x - k.x, S.pos.z - k.z); if (d < dm - 1e-6) { dm = d; mejor = i; } }
    return mejor;
  }
  function paso(dt) {
    if (!K) return;
    if (A.fase === 'nada') { const c = cercana(); if (c !== cur) { usar(c); A.invitado = false; } }
    const on = ofrecible(); // QA-189: fuera del cap. 1 las estaciones no existen (ni piezas ni invitación)
    for (let i = 0; i < EST.length; i++) { // cada estación se ve de cerca (< 90 m); la del hoyo en juego, siempre mientras se juega
      const e = EST[i]; if (!e.K) continue;
      const cerca = Math.hypot(S.pos.x - e.K.x, S.pos.z - e.K.z) <= 90, jugando = i === cur && A.fase !== 'nada';
      e.troncos.visible = e.nido.visible = on && (cerca || jugando);
      e.salida.visible = on && cerca && !jugando;
      e.quieta.visible = on && cerca && i !== cur;
    }
    const lejos = Math.hypot(S.pos.x - K.x, S.pos.z - K.z) > 90;
    semilla.visible = on && (!lejos || A.fase !== 'nada');
    flecha.visible = on && A.fase !== 'nada' && A.fase !== 'nido' && !A.hundir;
    if (flecha.visible) flecha.position.set(P_NIDO.x, nido.position.y + 3.1 + Math.sin(performance.now() / 260) * 0.18, P_NIDO.z);
    nido.userData.banderin.rotation.y = Math.sin(performance.now() / 600) * 0.25;
    if (A.fase === 'nada') {
      puntos.visible = false;
      if (on && !A.invitado && !A.manual && Math.hypot(S.pos.x - P_TEE.x, S.pos.z - P_TEE.z) < 10 && it.visible() && avisoLibre()) { A.invitado = true; toast(abierto(HOYO.n) ? tx('invita') : cerradoTxt(HOYO.n), 3600); }
      return;
    }
    // Táctil: arrastrar en la mitad izquierda de la pantalla agarra el joystick (input.js; oculto en el hoyo) en vez de girar la
    // cámara; sin esto ese arrastre no apuntaba. El joystick a los lados apunta como ◀ ▶ (Vittata no se mueve: seguir() la ancla).
    const giro = A.giro || -((G.input && G.input.stick && G.input.stick.x) || 0);
    if (giro) { G.camara.yaw += giro * GIRO * dt; if (G.camara.manual) try { G.camara.manual(); } catch (e) { /* */ } }
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
    accion: () => { if (A.eligeHoyo) elegirHoyo(HOYO.n); else if (A.eligiendo) elegir(1); else if (A.fase === 'nido') salir(tx('sale')); else if (A.cargando) soltarCarga(); else empezarCarga(); },
    aviso: () => (tactil() ? TXT.guiaT : TXT.guia),
    get verbo() { return A.fase === 'nido' ? TXT.seguir : A.cargando ? TXT.soltar : TXT.golpe; }
  };
  const TRAGAR = new Set(['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's', ' ', 'g', 'r', 'escape', 'e', 'enter', 'f', 'v', 'x', 'c', 'n', 'h', '1', '2', '3', '4', '5', '6', '7']);
  const pausa = () => !!(G.pausa && G.pausa.activa && G.pausa.activa());
  let enganchado = false, modo0 = null, girosTecla = { izq: false, der: false };
  const giroTeclas = () => { A.giro = (girosTecla.izq ? 1 : 0) - (girosTecla.der ? 1 : 0); };
  function teclaAbajo(e) {
    if (!enganchado || pausa() || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.nodeName))) return;
    const k = (e.key || '').toLowerCase(); if (!TRAGAR.has(k)) return;
    // W35: Enter o Espacio sobre un botón del panel con el foco (elegir jugadores, Grito, Reiniciar, Salir, Otra vez…) lo pulsa,
    // como cualquier botón; «Golpear» y ◀ ▶ siguen con las teclas del hoyo (Espacio mantenido = fuerza)
    const bf = e.target && e.target.closest && hud && hud.el.contains(e.target) ? e.target.closest('button[data-a]') : null;
    if (bf && (k === 'enter' || k === ' ') && !/^(golpe|izq|der)$/.test(bf.dataset.a)) { e.stopImmediatePropagation(); return; }
    e.stopImmediatePropagation(); e.preventDefault();
    if (k === 'arrowleft' || k === 'a') { girosTecla.izq = true; giroTeclas(); }
    else if (k === 'arrowright' || k === 'd') { girosTecla.der = true; giroTeclas(); }
    if (e.repeat) return;
    if (A.eligeHoyo && k.length === 1 && k >= '1' && k <= String(HOYOS.length)) elegirHoyo(+k);
    else if (A.eligiendo && k.length === 1 && k >= '1' && k <= String(MAX_J)) elegir(+k);
    else if (k === 'n' && A.fase === 'nido') { const n = siguienteHoyo(); if (n) irHoyo(n, true); }
    else if (k === 'h' && A.fase === 'nido') verHoyos();
    else if (k === ' ') empezarCarga();
    else if (k === 'e' || k === 'enter') modo.accion();
    else if (k === 'g') grito();
    else if (k === 'r') reiniciar();
    else if (k === 'escape') salir(tx('sale'));
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
      '#v18-golf button:focus-visible{outline:4px solid var(--c-focus,#ffe066);outline-offset:2px;box-shadow:0 0 0 9px rgba(8,20,14,.7)}' +
      '#v18-golf button.vg-golpe{background:#ffd27a;font-size:18px}#v18-golf button.cd{opacity:.45}#v18-golf button.on{outline:3px solid #8fe08a}' +
      '#v18-golf .vg-fin{text-align:center}#v18-golf .vg-fin p{margin:2px 0;font-size:18px;font-weight:600}#v18-golf .vg-fin .vg-m{font-size:22px}' +
      '#v18-golf .vg-m[data-m="oro"]{color:#ffd84a}#v18-golf .vg-m[data-m="plata"]{color:#dfe7ee}#v18-golf .vg-m[data-m="bronce"]{color:#e0a36a}' +
      '#v18-golf .vg-fin .vg-bot2{grid-template-columns:1fr 1fr}' +
      '#v18-golf .vg-elige{text-align:center}#v18-golf .vg-elige p{margin:2px 0;font-size:18px;font-weight:600}#v18-golf .vg-elige .vg-et{font-size:13px}' +
      '#v18-golf .vg-elige-salir{margin-top:8px}#v18-golf .vg-elige-salir button{min-height:44px;padding:4px 22px;border-radius:22px;font-size:15px;background:#e9e2d2}' +
      '#v18-golf .vg-bot6{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:8px}#v18-golf .vg-bot6 button{min-height:60px;padding:6px 8px;font-size:16px}' +
      '#v18-golf .vg-h{display:flex;flex-direction:column;align-items:center;line-height:1.15}#v18-golf .vg-h small{font-size:12px;font-weight:500}#v18-golf .vg-h small:empty{display:none}' +
      '#v18-golf .vg-bot6 button[aria-disabled="true"]{opacity:.55}#v18-golf .vg-bot6 button.act{outline:3px solid #ff6a2b}' +
      '#v18-golf .vg-bot4{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:8px}#v18-golf .vg-bot4 button{min-height:60px;font-size:18px}' +
      '#v18-golf .vg-jugs{display:flex;flex-wrap:wrap;gap:2px 12px;justify-content:center;font-size:14px;font-weight:600;margin-top:4px}#v18-golf .vg-jugs .on{text-decoration:underline}#v18-golf .vg-jugs .ya{opacity:.7}' +
      '#v18-golf .vg-tabla{margin:4px auto 2px;max-width:360px}#v18-golf .vg-fila{display:grid;grid-template-columns:2em 1fr auto 4.5em;gap:8px;align-items:center;font-size:17px;font-weight:600;text-align:left}' +
      '#v18-golf .vg-tabla .vg-m{font-size:17px;text-align:right}' +
      // Cómo se juega (8-nov): meta a la vista, tecla en cada botón (como los chips del duelo) y una pista corta y grande
      '#v18-golf .vg-meta{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:2px 10px;margin:4px 0 0;font-size:15px;font-weight:600;text-align:center}' +
      '#v18-golf .vg-meta b{color:#ffe39a}#v18-golf .vg-meta b::before{content:"";display:inline-block;width:0;height:0;margin-right:6px;border:7px solid transparent;border-top:11px solid #ff6a2b;border-bottom:0;vertical-align:middle}' +
      '#v18-golf .vg-meta span{opacity:.85;font-size:13px}' +
      '#v18-golf button{display:inline-flex;align-items:center;justify-content:center}#v18-golf button[hidden]{display:none}' +
      '#v18-golf button kbd{display:inline-block;margin-left:8px;font:700 13px/1 Fredoka,system-ui,sans-serif;min-width:22px;padding:4px 6px;border-radius:7px;background:#3b2a14;color:#fff3d6;box-shadow:0 2px 0 #0007;text-align:center;vertical-align:middle}' +
      '#v18-golf.tactil button kbd{display:none}' +
      '#v18-golf .vg-guia{margin:8px auto 0;width:max-content;max-width:100%;min-height:1.4em;background:rgba(255,227,154,.95);color:#3b2a14;text-shadow:none;font-weight:600;font-size:15px;padding:5px 14px;border-radius:16px;box-shadow:0 2px 8px #0005;text-align:center;box-sizing:border-box}' +
      '#v18-golf .vg-guia:empty{visibility:hidden}#v18-golf .vg-guia.nueva{animation:vgPista .25s ease-out}@keyframes vgPista{from{transform:scale(.88);opacity:0}to{transform:none;opacity:1}}' +
      '#v18-golf .vg-fin [data-k="fin4"]{font-size:14px;opacity:.9}' +
      'body.v18-golf-on #keyhint{visibility:hidden}' + // los controles de explorar (Espacio: saltar · V: volar) contradecían los del hoyo
      '@media (prefers-reduced-motion:reduce){#v18-golf .vg-guia.nueva{animation:none}}' +
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
    el.setAttribute('role', 'region'); el.setAttribute('aria-labelledby', 'vg-hoyo'); // W35: zona con nombre para el lector de pantalla
    const boton = e => e.target.closest && e.target.closest('button[data-a]');
    el.addEventListener('pointerdown', e => {
      const b = boton(e); if (!b) return;
      e.preventDefault(); e.stopPropagation();
      try { b.setPointerCapture(e.pointerId); } catch (er) { /* sin captura */ }
      const a = b.dataset.a; b.classList.add('on');
      if (a === 'izq') A.giro = 1; else if (a === 'der') A.giro = -1;
      else if (a === 'golpe') empezarCarga(); else if (a === 'grito') grito(); else if (a === 'reiniciar') reiniciar();
      else accion(a);
    });
    const accion = a => {
      if (a === 'grito') grito(); else if (a === 'reiniciar' || a === 'otra') reiniciar();
      else if (a === 'salir' || a === 'seguir') salir(tx('sale'));
      else if (/^j[1-4]$/.test(a)) elegir(+a[1]);
      else if (/^h[1-9]$/.test(a)) elegirHoyo(+a[1]);
      else if (a === 'siguiente') { const n = siguienteHoyo(); if (n) irHoyo(n, true); }
      else if (a === 'hoyos') verHoyos();
    };
    // W35: con el teclado (Enter o Espacio sobre el botón con el foco) llega un click sin puntero (detail 0)
    el.addEventListener('click', e => { const b = boton(e); if (!b || e.detail !== 0) return; e.preventDefault(); accion(b.dataset.a); });
    const suelta = e => {
      const b = boton(e); if (!b) return; b.classList.remove('on');
      const a = b.dataset.a;
      if (a === 'izq' || a === 'der') giroTeclas();
      else if (a === 'golpe') { if (e.type === 'pointercancel') A.cargando = false; else soltarCarga(); }
    };
    for (const t of ['pointerup', 'pointercancel']) el.addEventListener(t, suelta);
    el.addEventListener('contextmenu', e => e.preventDefault());
    document.body.appendChild(el);
    const qs = {}; // las piezas del HUD son fijas mientras está lleno: se buscan una vez (pintar() las pide cada cuadro)
    hud = { el, qs, lleno: false, q: k => qs[k] || (qs[k] = el.querySelector('[data-k="' + k + '"]')), golpe: null };
    return hud;
  }
  // El contenido del HUD se crea al abrir el minigolf y se vacía al salir: un panel oculto no guarda texto en español
  // (idiomaTest lee también lo oculto; mismo caso que QA-218). Los oyentes están en el contenedor y siguen valiendo.
  function llenarHud() {
    if (!hud || hud.lleno) return;
    const k = t => `<kbd aria-hidden="true">${t}</kbd>`; // tecla del botón (se oculta en táctil); el nombre del botón no la incluye
    const b = (a, txt, tecla, extra) => `<button type="button" data-a="${a}"${extra || ''}><span data-k="t-${a}">${txt}</span>${tecla ? k(tecla) : ''}</button>`;
    const bh = h => `<button type="button" data-a="h${h.n}"><span class="vg-h"><b data-k="t-h${h.n}">${etHoyo(h.n)}</b><small>${h.zona}</small><small data-k="m-h${h.n}"></small></span>${k(String(h.n))}</button>`;
    hud.el.innerHTML = `<div class="vg-caja"><div class="vg-info"><span id="vg-hoyo" data-k="hoyoT">${tx('hoyo')}</span><span data-k="parT">${tx('par')}</span><span data-k="golpes"></span><span data-k="record"></span><span data-k="turno"></span></div>` +
      `<div class="vg-meta" data-k="meta"><b>${TXT.meta}</b><span data-k="metaS">${tx('metaOro')}</span></div><div class="vg-jugs" data-k="jugs" hidden></div>` +
      `<div class="vg-barra" data-k="barraW"><b data-k="barra"></b></div><div class="vg-et" data-k="fuerzaEt">${TXT.fuerza}</div>` +
      `<div class="vg-elige" data-k="elige" role="group" aria-labelledby="vg-elige-t" aria-describedby="vg-elige-sub" hidden><p id="vg-elige-t">${TXT.elige}</p><div class="vg-et" id="vg-elige-sub">${TXT.eligeSub}</div><div class="vg-bot4">` +
      [1, 2, 3, 4].map(n => b('j' + n, TXT['j' + n], String(n))).join('') + `</div>` +
      `<div class="vg-elige-salir">${b('salir', TXT.salir, 'Esc')}</div></div>` +
      `<div class="vg-elige" data-k="hoyos" role="group" aria-labelledby="vg-hoyos-t" aria-describedby="vg-hoyos-sub" hidden><p id="vg-hoyos-t">${TXT.eligeHoyo}</p><div class="vg-et" id="vg-hoyos-sub">${TXT.eligeHoyoSub}</div>` +
      `<div class="vg-bot6">${HOYOS.map(bh).join('')}</div><div class="vg-elige-salir">${b('salir', TXT.salir, 'Esc')}</div></div>` +
      `<div data-k="bot"><div class="vg-bot">${b('izq', '◀', '←', ` aria-label="${TXT.izq}"`)}${b('golpe', TXT.golpe, 'Espacio', ' class="vg-golpe"')}${b('der', '▶', '→', ` aria-label="${TXT.der}"`)}</div>` +
      `<div class="vg-bot2">${b('grito', TXT.poder, 'G', ' data-k="bgrito"')}${b('reiniciar', TXT.reiniciar, 'R')}${b('salir', TXT.salir, 'Esc')}</div><div class="vg-guia" data-k="guia" role="status">${tactil() ? TXT.guiaT : TXT.guia}</div></div>` +
      `<div class="vg-fin" data-k="fin" role="status" hidden><p data-k="fin1"></p><p class="vg-m" data-k="fin2"></p><p data-k="fin4"></p><div class="vg-tabla" data-k="tabla" hidden></div><p data-k="fin3"></p>` +
      `<div class="vg-bot2">${b('siguiente', TXT.siguiente, 'N', ' data-k="bsig"')}${b('hoyos', TXT.hoyos, 'H', ' data-k="bhoyos"')}${b('otra', TXT.otra, 'R')}${b('seguir', TXT.seguir, 'E')}</div></div></div>`;
    for (const kq in hud.qs) delete hud.qs[kq];
    hud.golpe = hud.el.querySelector('[data-a="golpe"]'); hud.lleno = true;
    Object.assign(PK, { hoyo: 0, golpes: -1, guia: null, tactil: null, record: NaN, turno: NaN, color: NaN, barra: -1, cd: null, grito: null, golpeCd: null }); PK.firma.length = 0;
  }
  function vaciarHud() {
    if (!hud || !hud.lleno) return;
    hud.el.textContent = ''; hud.lleno = false; hud.golpe = null;
    for (const kq in hud.qs) delete hud.qs[kq];
  }
  // La pantalla «¿Qué hoyo quieres jugar?»: cada hoyo con su zona y su medalla, récord o «Cerrado» (se pinta al abrirla)
  function pintarHoyos() {
    if (!hud || !hud.lleno) return;
    for (const h of HOYOS) {
      const b = hud.el.querySelector('[data-a="h' + h.n + '"]'), ab = abierto(h.n), r = recordDe(h);
      hud.q('m-h' + h.n).textContent = !ab ? TXT.cerradoC : r ? TXT[r.medalla + 'C'] + ' · ' + recordTxt(r.mejor) : TXT.sinJugar;
      if (ab) b.removeAttribute('aria-disabled'); else b.setAttribute('aria-disabled', 'true');
      b.classList.toggle('act', h.n === HOYO.n);
    }
  }
  const texto = (k, t) => { const e = hud.q(k); if (e.dataset.t !== t) { e.dataset.t = t; e.textContent = t; } }; // una vez: el traductor no pelea
  // Lo último que se pintó: cada cuadro solo se comparan números; el texto y el estilo se escriben solo si cambian.
  // Pista corta de la parte de abajo (clave de TXT o ''): qué hacer ahora mismo. Solo constantes: sin texto nuevo por cuadro.
  function pistaK(tt) {
    if (A.eligiendo || A.eligeHoyo || A.fase === 'nido' || A.fase === 'nada') return '';
    if (A.cargando) return 'pSuelta';
    if (A.fase === 'rueda') return !A.grito && HAB && f ? (tt ? 'pGritoT' : 'pGrito') : '';
    if (A.fase === 'turno') return '';
    return A.aviso === 'fuerte' ? 'pFuerte' : A.aviso === 'cerca' ? 'pCerca' : A.aviso === 'suave' ? 'pSuave' : A.aviso === 'flecha' ? 'pFlecha' : tt ? 'guiaT' : 'guia';
  }
  const PK = { hoyo: 0, golpes: -1, guia: null, tactil: null, record: NaN, turno: NaN, color: NaN, barra: -1, cd: null, grito: null, golpeCd: null, firma: [] };
  function firmaCambia() { // golpes, dentro/tope y turno de cada jugador, sin map/join por cuadro
    const f = PK.firma; let cambia = f.length !== J.length + 1;
    if (cambia) f.length = J.length + 1;
    for (let i = 0; i < J.length; i++) { const j = J[i], v = (i === A.turno ? A.golpes : j.golpes) * 4 + (j.dentro ? 1 : j.tope ? 2 : 0); if (f[i] !== v) { f[i] = v; cambia = true; } }
    if (f[J.length] !== A.turno) { f[J.length] = A.turno; cambia = true; }
    return cambia;
  }
  function pintar() {
    if (!hud || !hud.lleno) return;
    if (PK.hoyo !== HOYO.n) { PK.hoyo = HOYO.n; texto('hoyoT', tx('hoyo')); texto('parT', tx('par')); texto('metaS', tx('metaOro')); }
    if (PK.golpes !== A.golpes) { PK.golpes = A.golpes; texto('golpes', golpesTxt(A.golpes)); }
    const tt = tactil(); if (PK.tactil !== tt) { PK.tactil = tt; hud.el.classList.toggle('tactil', tt); }
    const pk = pistaK(tt); if (PK.guia !== pk) { const g = hud.q('guia'); PK.guia = pk; texto('guia', TXT[pk] || ''); g.classList.remove('nueva'); if (pk) { void g.offsetWidth; g.classList.add('nueva'); } }
    const r = record(), m = multi(), kr = m ? -1 : r ? r.mejor : 0;
    if (PK.record !== kr) { PK.record = kr; texto('record', m ? '' : r ? recordTxt(r.mejor) : TXT.sinRecord); }
    const kt = m && A.fase !== 'nido' ? A.turno : -1; if (PK.turno !== kt) { PK.turno = kt; texto('turno', kt >= 0 ? turnoTxt(kt) : ''); }
    const kc = m ? A.turno : -1; if (PK.color !== kc) { PK.color = kc; hud.q('turno').style.color = m ? COLORES[A.turno] : ''; }
    if (m && firmaCambia()) { // golpes de cada uno (se rehace solo si cambia)
      const js = hud.q('jugs');
      js.dataset.f = J.map((j, i) => (i === A.turno ? A.golpes : j.golpes) + (j.dentro ? 'd' : j.tope ? 't' : '')).join(',') + '|' + A.turno;
      js.innerHTML = J.map((j, i) => `<span class="${i === A.turno ? 'on' : ''}${j.dentro || j.tope ? ' ya' : ''}" style="color:${COLORES[i]}">${jugTxt(i, i === A.turno ? A.golpes : j.golpes)}</span>${j.dentro ? '<b> ✓</b>' : ''}`).join('');
    }
    const kb = Math.round(100 * (A.cargando ? A.carga : 0)); if (PK.barra !== kb) { PK.barra = kb; hud.q('barra').style.width = kb + '%'; }
    const bg = hud.q('bgrito'), cd = A.grito || A.fase !== 'rueda'; if (PK.cd !== cd) { PK.cd = cd; bg.classList.toggle('cd', cd); }
    if (PK.grito !== A.grito) { PK.grito = A.grito; const t = A.grito ? TXT.usado : TXT.poder; const bt = hud.q('t-grito'); if (bt.dataset.t !== t) { bt.dataset.t = t; bt.textContent = t; } }
    const gc = A.fase !== 'apuntar'; if (PK.golpeCd !== gc) { PK.golpeCd = gc; hud.golpe.classList.toggle('cd', gc); }
  }

  // ---------- En el mundo ----------
  // Una interacción por estación. Un hoyo cerrado se ve y dice cómo se abre; Acción no lo empieza
  for (const e of EST) {
    e.it = G.interaccion.add({ id: e.h.n === 1 ? 'v18_minigolf' : 'v18_minigolf_' + e.h.n, x: 0, z: 0, r: 3.4,
      visible: () => A.fase === 'nada' && !!e.K && ofrecible() && !otraCerca() && libre() && !otroActivo(),
      label: () => (abierto(e.h.n) ? tx('label', e.h) : cerradoTxt(e.h.n)),
      use: () => { if (!abierto(e.h.n)) { toast(cerradoTxt(e.h.n), 2600); return false; } return iniciar({ hoyo: e.h.n }); } });
  }
  // Hoyos 2 a 6: sitio fijo (medido). Dentro quedan como obstáculos hasta h.arboles árboles o rocas del bosque; se quitan
  // (despejar de vegetacion.js, como la explanada del duelo, QA-174) los que caerían en la salida, el nido, los huecos o pegados
  // al borde, las plantas con el pie en la calle y lo que tapa la cámara detrás de la salida (capturas: troncos y palmas
  // delante de la semilla). El hoyo 1 no quita nada (se queda como lo aprobó Kelvin).
  function sitioFijo(h) {
    const k = marco(h.sitio.x, h.sitio.z, h.sitio.a), lista = flora(k.x, k.z, h.L / 2 + h.HW + 2), quedan = [];
    for (const o of lista) {
      const q = aLocal(k, o.x, o.z); if (Math.abs(q.u) >= h.L / 2 + o.r || Math.abs(q.v) >= h.HW + o.r) continue;
      const estorba = Math.abs(q.u) > h.L / 2 - 0.7 - o.r || Math.abs(q.v) > h.HW - 0.7 - o.r || h.CL.some(c => Math.hypot(q.u - c.u, q.v - c.v) < 1.7 + o.r) ||
        h.troncos.some(t => Math.hypot(q.u - (t.u0 + t.u1) / 2, q.v - (t.v0 + t.v1) / 2) < Math.hypot(t.u1 - t.u0, t.v1 - t.v0) / 2 + o.r + 0.8);
      if (!estorba && quedan.length < h.arboles) quedan.push(o);
    }
    return Object.assign(k, { troncos: quedan.length, arboles: quedan.map(o => ({ x: o.x, z: o.z, r: o.r })), rango: -1 });
  }
  function despejarEst(e, k) {
    const VG = G.vegetacion, h = e.h; if (!VG || !VG.despejar) return 0;
    const keep = k.arboles || [], R0 = h.L / 2 + 10;
    const n = VG.despejar(k.x - R0, k.z - R0, k.x + R0, k.z + R0, (x, z) => {
      if (keep.some(o => Math.abs(o.x - x) < 1e-3 && Math.abs(o.z - z) < 1e-3)) return false;
      const q = aLocal(k, x, z);
      if (Math.abs(q.u) <= h.L / 2 + 0.6 && Math.abs(q.v) <= h.HW + 0.6) return true; // en la calle o pegado al borde
      return q.u < -h.L / 2 && q.u > -h.L / 2 - 9 && Math.abs(q.v) < h.HW + 1.5; // detrás de la salida: la cámara
    });
    e.despejados += n; return n;
  }
  function colocarFijos() {
    for (const e of EST) if (e.h.sitio) { const k = sitioFijo(e.h); despejarEst(e, k); montarEst(e, k); }
  }
  montar(buscarSitio()); colocarFijos(); usar(0);
  G.on('update', (dt, busy) => { if (A.manual || (busy && A.fase !== 'nada')) return; paso(Math.min(dt, 0.25)); }, 75);
  G.on('apply', () => { if (A.fase !== 'nada') salir(); }, 51);
  // mg27 (8-nov): mientras se juega un hoyo o está «¿Qué hoyo quieres jugar?», la guía de la misión (fx.js) no va: su flecha
  // se veía como un triángulo color arena en medio del recorrido. Como en el duelo (combate.js): después del gancho de
  // misiones (60) se apaga cada cuadro; al salir (fase 'nada') el gancho calla y la guía vuelve sola.
  G.on('render', () => { if (A.fase !== 'nada' && G.fx && G.fx.guide) G.fx.guide(null, 0); }, 61);
  // El sitio definitivo, cuando ya están la vegetación, el mundo y la explanada del duelo (antes no hay troncos que esquivar)
  let recolocar = false;
  const pedirSitio = () => { recolocar = true; };
  Promise.resolve(G.vegetacion && G.vegetacion.listo).then(pedirSitio, pedirSitio);
  Promise.resolve(G.mundo && G.mundo.listo).then(pedirSitio, () => {});
  setTimeout(pedirSitio, 5000);
  function recolocarYa() {
    recolocar = false;
    const n = buscarSitio(), k1 = EST[0].K;
    if (!k1 || n.x !== k1.x || n.z !== k1.z || n.a !== k1.a) montar(n); else Object.assign(k1, { troncos: n.troncos, rango: n.rango });
    colocarFijos();
  }
  G.on('update', () => { if (recolocar && A.fase === 'nada') recolocarYa(); }, 76);

  // ---------- W35 · teclado y lector de pantalla (lo llaman esta prueba y AV.accesibilidadTest) ----------
  // Abrir → foco en «1 jugador» de «¿Cuántos juegan?» (grupo con nombre); todos los botones con nombre; Enter sobre un botón lo
  // pulsa (no lo traga el hoyo); el foco pasa a «Golpear»; Esc sale sin abrir la Pausa y el foco vuelve a donde estaba.
  function teclado() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    if (A.fase !== 'nada' || !K || !ofrecible()) return out;
    const nombre = el => (el.getAttribute('aria-labelledby') || '').split(/\s+/).map(id => document.getElementById(id)).filter(Boolean).map(x => x.textContent.trim()).join(' ') || el.getAttribute('aria-label') || el.textContent.trim();
    const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, fac0 = S.facing, fly0 = M.flying, yaw0 = G.camara.yaw, man0 = A.manual, toast0 = G.ui.toast, r0 = JSON.stringify(record());
    const foco0 = document.activeElement, ancla = document.createElement('button');
    ancla.type = 'button'; ancla.textContent = 'W35'; ancla.style.cssText = 'position:fixed;left:0;top:0;opacity:0;pointer-events:none'; document.body.appendChild(ancla); ancla.focus();
    const tecla = (el, key, tipo) => { const ev = new KeyboardEvent(tipo || 'keydown', { key, bubbles: true, cancelable: true }); el.dispatchEvent(ev); return ev; };
    G.ui.toast = () => {}; A.manual = true;
    try {
      iniciar({ forzar: true });
      const el = hud.el, eli = hud.q('elige'), j1 = el.querySelector('[data-a="j1"]'), j2 = el.querySelector('[data-a="j2"]');
      check('W35 · Minigolf «¿Cuántos juegan?»: al abrir, el foco va a «1 jugador»; el panel y el grupo tienen nombre',
        document.activeElement === j1 && el.getAttribute('role') === 'region' && !!nombre(el) && eli.getAttribute('role') === 'group' && !!nombre(eli), (document.activeElement && (document.activeElement.dataset.a || document.activeElement.id)) + ' · ' + nombre(eli));
      const sinNombre = [...el.querySelectorAll('button')].filter(b => !nombre(b)).map(b => b.dataset.a);
      check('W35 · Minigolf: todos los botones del panel son <button> con nombre', !sinNombre.length, sinNombre.join(', '));
      j2.focus(); const ev = tecla(j2, 'Enter'); const nativo = !ev.defaultPrevented; if (nativo) j2.click(); // el navegador hace el clic (detail 0) si nadie lo impidió
      const golpe = el.querySelector('[data-a="golpe"]');
      check('W35 · Minigolf: Enter sobre «2 jugadores» lo pulsa (el hoyo no se traga la tecla) y el foco pasa a «Golpear»', nativo && A.njug === 2 && !A.eligiendo && document.activeElement === golpe, JSON.stringify({ nativo, n: A.njug, foco: document.activeElement && document.activeElement.dataset.a }));
      const ev2 = tecla(golpe, ' '); tecla(golpe, ' ', 'keyup'); A.cargando = false;
      check('W35 · Minigolf: con el foco en «Golpear», Espacio sigue cargando la fuerza (no hace clic)', ev2.defaultPrevented);
      const kd = tecla(document.activeElement, 'Escape'); tecla(document.activeElement || document.body, 'Escape', 'keyup');
      const pz = document.getElementById('pause'); let pausa = false; try { pausa = !!(pz && pz.matches(':popover-open')); if (pausa) pz.hidePopover(); } catch (e) { /* sin popover */ }
      check('W35 · Minigolf: Esc sale del hoyo sin abrir la Pausa y el foco vuelve a donde estaba', A.fase === 'nada' && kd.defaultPrevented && !pausa && el.hidden && document.activeElement === ancla && JSON.stringify(record()) === r0,
        JSON.stringify({ fase: A.fase, pausa, foco: document.activeElement && (document.activeElement.textContent || document.activeElement.id) }));
    } catch (e) { check('W35 · Minigolf: teclado sin excepciones', false, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e); }
    finally {
      try { if (A.fase !== 'nada') salir(); } catch (e) { /* ya fuera */ }
      A.manual = man0; G.ui.toast = toast0; puntos.visible = false;
      S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z; S.facing = fac0; M.flying = fly0; M.vx = M.vz = 0; G.camara.yaw = yaw0;
      ancla.remove(); try { if (foco0 && foco0 !== document.body && document.contains(foco0)) foco0.focus({ preventScroll: true }); } catch (e) { /* */ }
    }
    return out;
  }

  // ---------- Prueba de los hoyos 2 a 6 (la llama test()) ----------
  const FIJOS_T = new Set(['edificio', 'estructura', 'taller', 'post', 'bench', 'obj']);
  const esperarMs = ms => new Promise(r => setTimeout(r, ms));
  // Lo que ve el jugador allí: el streaming de la zona cargado del todo y sus sólidos rasterizados (como chispa.js)
  async function cargarZona(x, z) {
    const ST = G.mundo && G.mundo.streaming;
    if (ST && ST.alrededor) { try { await Promise.race([ST.alrededor(x, z), esperarMs(60000)]); if (ST.terminar) await ST.terminar({ topeMs: 60000 }); } catch (e) { /* */ } }
    await esperarMs(1500); try { if (G.solidos && G.solidos.terminar) G.solidos.terminar(); } catch (e) { /* */ }
  }
  // El sitio de un hoyo: seco, sin edificios ni sólidos que no sean del bosque dentro, sin colliders fijos, lejos de los senderos
  function revisarSitio(e) {
    const h = e.h, k = e.K, send = Object.values((G.terreno.mapa && G.terreno.mapa.senderos) || {});
    let dS = 99;
    for (const s of send) for (let i = 1; i < s.length; i++) {
      const a = s[i - 1], b = s[i], l = Math.hypot(b[0] - a[0], b[2] - a[2]) || 1;
      for (let t = 0; t <= l; t += 0.5) { const q = aLocal(k, a[0] + (b[0] - a[0]) * t / l, a[2] + (b[2] - a[2]) * t / l); dS = Math.min(dS, Math.hypot(Math.max(0, Math.abs(q.u) - h.L / 2), Math.max(0, Math.abs(q.v) - h.HW))); }
    }
    let mojado = 0, solido = 0, grad = 0, cols = 0, mn = Infinity, mx = -Infinity, aguaLado = 99;
    const SO = G.solidos && G.solidos.activo ? G.solidos : null;
    for (let u = -h.L / 2; u <= h.L / 2 + 1e-6; u += 0.5) for (let v = -h.HW; v <= h.HW + 1e-6; v += 0.5) {
      const p = aMundo(k, u, v), y = H(p.x, p.z); mn = Math.min(mn, y); mx = Math.max(mx, y);
      if (agua(p.x, p.z) > y - 0.3) mojado++;
      if (u < h.L / 2 && v < h.HW) { const p2 = aMundo(k, u + 0.5, v), p3 = aMundo(k, u, v + 0.5); grad = Math.max(grad, Math.abs(H(p2.x, p2.z) - y) * 2, Math.abs(H(p3.x, p3.z) - y) * 2); }
      // (los árboles que quedan como obstáculo no cuentan)
      if (SO && !e.OBST.some(o => Math.hypot(o.x - p.x, o.z - p.z) < o.r + 0.8)) for (const dy of [0.4, 1.0, 1.6]) { const tp = SO.dentro(p.x, p.z, y + dy); if (tp > -Infinity) { const w = SO.que(p.x, p.z, tp); if (w !== 'rama' && w !== 'roca') { solido++; break; } } }
    }
    for (const c of F.colliders || []) {
      if (!c || !FIJOS_T.has(c.kind) || c.x == null) continue;
      const q = aLocal(k, c.x, c.z), r = c.r || Math.hypot(c.hx || 1, c.hz || 1); if (Math.abs(q.u) < h.L / 2 + r && Math.abs(q.v) < h.HW + r) cols++;
    }
    for (let u = -h.L / 2 + 2; u <= h.L / 2 - 2; u += 1) for (const sg of [-1, 1]) for (let d = 0.6; d <= 6; d += 0.4) { const p = aMundo(k, u, sg * (h.HW + d)); if (agua(p.x, p.z) > H(p.x, p.z) - 0.1) { aguaLado = Math.min(aguaLado, d); break; } }
    return { senderos: +dS.toFixed(1), mojado, solido, cols, pendiente: +grad.toFixed(2), desnivel: +(mx - mn).toFixed(2), aguaLado: +aguaLado.toFixed(1), arboles: e.OBST.length, quitados: e.despejados };
  }
  // Un jugador que planea: camino más corto por una rejilla de 0,5 m libre de borde, troncos y árboles, y tiro al punto más
  // lejano de ese camino que se ve desde la semilla (o al nido si se ve). Solo la prueba.
  function planTiro() {
    const hol = R + 0.12, pasoR = 0.5;
    const libreW = (x, z) => {
      const q = aLocal(K, x, z); if (Math.abs(q.u) > L / 2 - hol - TRONCO || Math.abs(q.v) > HW - hol - TRONCO) return false;
      for (const s of SEGS) { const ex = s.bx - s.ax, ez = s.bz - s.az, l2 = ex * ex + ez * ez || 1, t = Math.max(0, Math.min(1, ((x - s.ax) * ex + (z - s.az) * ez) / l2)); if (Math.hypot(x - s.ax - ex * t, z - s.az - ez * t) < hol + s.r) return false; }
      for (const o of OBST) if (Math.hypot(x - o.x, z - o.z) < hol + o.r) return false;
      return true;
    };
    const vista = (a, b) => { const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(d / 0.2); for (let i = 2; i <= n; i++) if (!libreW(a.x + (b.x - a.x) * i / n, a.z + (b.z - a.z) * i / n)) return false; return true; };
    const nodos = [{ x: P_NIDO.x, z: P_NIDO.z }];
    for (let u = -L / 2; u <= L / 2; u += pasoR) for (let v = -HW; v <= HW; v += pasoR) { const p = aMundo(K, u, v); if (libreW(p.x, p.z)) nodos.push(p); }
    const N = nodos.length, dist = new Float64Array(N).fill(Infinity), hecho = new Uint8Array(N); dist[0] = 0;
    for (let it2 = 0; it2 < N; it2++) {
      let i = -1; for (let j = 0; j < N; j++) if (!hecho[j] && (i < 0 || dist[j] < dist[i])) i = j;
      if (i < 0 || dist[i] === Infinity) break; hecho[i] = 1;
      for (let j = 0; j < N; j++) { if (hecho[j]) continue; const d = Math.hypot(nodos[j].x - nodos[i].x, nodos[j].z - nodos[i].z); if (d < pasoR * 1.5 + (i === 0 ? 0.6 : 0) && dist[i] + d < dist[j]) dist[j] = dist[i] + d; }
    }
    const b = { x: B.x, z: B.z };
    if (vista(b, nodos[0])) return { x: P_NIDO.x, z: P_NIDO.z, d: Math.hypot(P_NIDO.x - b.x, P_NIDO.z - b.z), nido: true };
    let mejor = null, mc = Infinity;
    for (let j = 1; j < N; j++) { if (dist[j] === Infinity) continue; const d = Math.hypot(nodos[j].x - b.x, nodos[j].z - b.z), c = dist[j] + d - d * 0.02; if (c < mc && d > 0.8 && vista(b, nodos[j])) { mc = c; mejor = { x: nodos[j].x, z: nodos[j].z, d, nido: false }; } }
    return mejor;
  }
  async function pruebaHoyos(check, T) {
    const q0 = G.quiet; G.quiet = true; // los avisos del final (premios, hoyo abierto) salen sin esperar
    try { await pruebaHoyos2(check, T); } finally { G.quiet = q0; }
  }
  async function pruebaHoyos2(check, T) {
    const { correr, hastaQuieta, colocar, apuntaLocal, fuerzaPara, tecla, toasts, mad, forzar } = T;
    if (A.fase !== 'nada') salir();
    V.borrar(); V.recargar(); toasts.length = 0;
    const m0 = mad(), pulsar = a => { const b = hud.el.querySelector('[data-a="' + a + '"]'); b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })); b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true })); };
    // Mecánicas: las mismas piezas y la misma física; solo troncos rectos, bordes y árboles del bosque; un Grito por hoyo
    check('Hoyos 2 a 6: seis hoyos con su zona, par y estación (troncos, nido, salida e interacción propios); solo las piezas del hoyo 1',
      HOYOS.length === 6 && EST.every(e => e.K && e.it && e.troncos.geometry === geoTronco && e.nido.children.length === nidoBase.children.length && e.salida.geometry === geoSalida) &&
      HOYOS.map(h => h.zona).join('|') === 'Villa Raíz|Templos de la Colina|Puerto de La Mina|Río de Villa Raíz|Bosque nublado|Ciudad de los 36' &&
      HOYOS.every(h => h.par >= 3 && h.par <= 4 && h.troncos.length <= 3) && new Set(EST.map(e => e.it.id)).size === 6,
      JSON.stringify(EST.map(e => ({ n: e.h.n, par: e.h.par, sitio: [+e.K.x.toFixed(1), +e.K.z.toFixed(1), +e.K.a.toFixed(3)], piezas: e.troncos.count, arboles: e.OBST.length, quitados: e.despejados }))));
    // Cerrados al empezar: solo el 1 abierto; el 2 no empieza y su estación dice cómo se abre
    usar(1);
    const cerr = { inicia: iniciar({ forzar: true, hoyo: 2 }), etiqueta: EST[1].it.label(), mapa: mapas().length, abiertos: abiertos() };
    usar(0);
    check('Al principio solo el hoyo 1 está abierto: el 2 no empieza, su estación dice «se abre al completar el hoyo 1» y el minimapa solo marca el 1',
      cerr.inicia === false && A.fase === 'nada' && cerr.etiqueta === cerradoTxt(2) && cerr.mapa === 1 && cerr.abiertos === 1, JSON.stringify(cerr));
    // Desde el menú (irYJugar sin hoyo) con un solo hoyo abierto: el hoyo 1, como antes
    const ir1 = irYJugar(); const sinElegir = ir1 && HOYO.n === 1 && !A.eligeHoyo && A.eligiendo && hud.q('hoyos').hidden && !hud.q('elige').hidden; salir();
    check('Con un solo hoyo abierto, «Minigolf» del menú lleva al hoyo 1 y pregunta cuántos juegan (sin pantalla de hoyos)', sinElegir);
    // Completar los seis seguidos con «Siguiente hoyo»: cada uno se completa, guarda par/récord/medalla y abre el siguiente
    const filas = [];
    const jugarHoyo = () => {
      let n = 0;
      while (A.fase === 'apuntar' && n < 14) {
        const p = planTiro(); if (!p) break;
        apuntarA(p.x, p.z); seguir(0, true); tirar(fuerzaPara(p.nido ? p.d + 0.4 : p.d)); hastaQuieta(); n++;
      }
      return n;
    };
    iniciar({ forzar, hoyo: 1 }); elegir(1);
    for (let n = 1; n <= 6; n++) {
      const e = EST[n - 1], h = e.h;
      await cargarZona(P_TEE.x, P_TEE.z);
      const sit = revisarSitio(e), madA = mad(), tiros = jugarHoyo(); await esperarMs(40);
      const res = A.resultado || {}, r = recordDe(h);
      const fila = { n, zona: h.zona, par: h.par, tiros, golpes: A.golpes, fase: A.fase, medalla: res.medalla, record: r, abre: res.abre, madera: mad() - madA, sitio: sit };
      filas.push(fila);
      check('Hoyo ' + n + ' (' + h.zona + '): el sitio está en seco, sin edificios ni sólidos dentro, sin colliders fijos y a ≥ 1,5 m de los senderos' +
        (n === 3 ? '; con cuesta (desnivel ≥ 0,6 m)' : '') + (n === 4 ? '; con agua a ≤ 5 m de un lado' : '') + (n === 5 ? '; con árboles del bosque como obstáculos' : '') + (n > 1 ? '; pendiente que deja parar la semilla' : ''),
        !sit.mojado && !sit.solido && !sit.cols && sit.senderos >= 1.5 && (n === 1 || sit.pendiente <= 0.22) && (n !== 3 || sit.desnivel >= 0.6) && (n !== 4 || sit.aguaLado <= 5) && (n !== 5 || sit.arboles >= 1),
        JSON.stringify(sit));
      const fin4 = hud.q('fin4').textContent, sig = n < 6 ? HOYOS[n] : null;
      check('Hoyo ' + n + ': se completa jugando (' + fila.golpes + ' golpes, par ' + h.par + '); récord y medalla según su par; ' + (n === 1 ? '' : 'premios del esquema del hoyo 1 (3 fibras' + (res.medalla === 'oro' ? ' + 2 maderas' : '') + ')'),
        A.fase === 'nido' && fila.golpes <= 10 && r && r.mejor === A.golpes && r.medalla === medalla(A.golpes) && res.medalla === (A.golpes <= h.par ? 'oro' : A.golpes === h.par + 1 ? 'plata' : 'bronce') &&
        fila.madera === 3 + (res.medalla === 'oro' ? 2 : 0) && V.otorgado(h.premios[0].clave) && fin4 === (res.medalla === 'oro' ? tx('medOro') : tx('medOtra')) && fin4.includes(String(h.par)) &&
        hud.q('hoyoT').textContent === tx('hoyo') && hud.q('parT').textContent === 'Par ' + h.par,
        JSON.stringify({ tiros, golpes: A.golpes, fase: A.fase, record: r, madera: fila.madera, fin4, hoyo: hud.q('hoyoT').textContent }));
      if (A.fase !== 'nido') break;
      // Oro asegurado (un golpe desde 3 m del nido) para probar el premio del oro una vez; luego otro oro no da nada
      const oro = () => { for (let i = 0; i < 6; i++) { reiniciar(); colocar(NIDO.u - 3, 0); apuntaLocal(NIDO.u, NIDO.v); tirar(fuerzaPara(3.3 + Math.ceil(i / 2) * 0.3 * (i % 2 ? 1 : -1))); hastaQuieta(); if (A.fase === 'nido') break; } return A.fase === 'nido' ? A.resultado : null; };
      const madB = mad(), o1 = oro(), madC = mad(), o2 = oro(), madD = mad();
      check('Hoyo ' + n + ': un resultado mejor guarda el récord (1 golpe, oro); el premio del oro se da una sola vez y repetir no da más',
        o1 && o1.golpes === 1 && o1.nuevo && recordDe(h).mejor === 1 && recordDe(h).medalla === 'oro' && madC - madB === (res.medalla === 'oro' ? 0 : 2) && o2 && !o2.premios.length && madD === madC && V.otorgado(h.premios[1].clave),
        JSON.stringify({ o1: o1 && o1.premios, o2: o2 && o2.premios, madera: [madB, madC, madD] }));
      if (sig) {
        const bs = hud.q('bsig');
        check('Hoyo ' + n + ': al terminar se abre el hoyo ' + (n + 1) + ' (con aviso) y sale «Siguiente hoyo» (tecla N) y «Elegir hoyo»',
          abierto(n + 1) && fila.abre === n + 1 && toasts.includes(abreTxt(sig)) && !bs.hidden && bs.getClientRects().length && bs.querySelector('kbd').textContent === 'N' && !hud.q('bhoyos').hidden,
          JSON.stringify({ abre: fila.abre, abierto: abierto(n + 1) }));
        // «Siguiente hoyo»: Vittata va a la salida del hoyo siguiente, con los mismos jugadores, sin salir del minigolf
        if (n === 2) tecla('keydown', 'n'); else pulsar('siguiente');
        const e2 = EST[n];
        check('«Siguiente hoyo» (' + (n === 2 ? 'tecla N' : 'botón') + '): hoyo ' + (n + 1) + ' en su sitio, semilla en su salida, Vittata al lado, 0 golpes, Grito disponible, sin volver a preguntar jugadores',
          HOYO.n === n + 1 && K === e2.K && A.fase === 'apuntar' && A.golpes === 0 && !A.grito && !A.eligiendo && !A.eligeHoyo && Math.hypot(B.x - e2.P_TEE.x, B.z - e2.P_TEE.z) < 0.01 &&
          Math.hypot(S.pos.x - B.x, S.pos.z - B.z) < 2.5 && hud.q('hoyoT').textContent === tx('hoyo', e2.h) && !hud.el.hidden && G.interaccion.modo === modo && toasts.includes(tx('empieza', e2.h)),
          JSON.stringify({ hoyo: HOYO.n, fase: A.fase, aVittata: +Math.hypot(S.pos.x - B.x, S.pos.z - B.z).toFixed(2) }));
      } else {
        check('Hoyo 6 (el último): sin «Siguiente hoyo»; «Elegir hoyo» sí', hud.q('bsig').hidden && !hud.q('bhoyos').hidden);
      }
    }
    check('Premios de los seis hoyos: 5 por hoyo (3 + 2), una sola vez; 30 en total y sin monedas', mad() - m0 === 30 && HOYOS.every(h => h.premios.every(p => V.otorgado(p.clave))) && !('monedas' in A), 'madera +' + (mad() - m0));
    // Sin asignaciones por cuadro jugando en otro hoyo (el 6, rodando con el Grito): mismos espías que en el hoyo 1
    {
      reiniciar(); colocar(TEE.u, 0); apuntaLocal(TEE.u + 4, 0); correr(0.1);
      const cuenta = { three: 0, arr: 0, dom: 0 }, sp = { on: false }, origT = {}, origA = {}, qs0 = Element.prototype.querySelector, qsa0 = Element.prototype.querySelectorAll, gid0 = document.getElementById;
      let rodando = false;
      try {
        for (const kk of ['Vector3', 'Vector2', 'Quaternion', 'Matrix4', 'Color', 'Euler', 'Object3D']) { origT[kk] = THREE[kk]; THREE[kk] = new Proxy(origT[kk], { construct(t, a, nt) { if (sp.on) cuenta.three++; return Reflect.construct(t, a, nt); } }); }
        for (const kk of ['map', 'filter', 'forEach']) { const o = origA[kk] = Array.prototype[kk]; Array.prototype[kk] = function () { if (sp.on) cuenta.arr++; return o.apply(this, arguments); }; }
        Element.prototype.querySelector = function () { if (sp.on) cuenta.dom++; return qs0.apply(this, arguments); };
        Element.prototype.querySelectorAll = function () { if (sp.on) cuenta.dom++; return qsa0.apply(this, arguments); };
        document.getElementById = function () { if (sp.on) cuenta.dom++; return gid0.apply(this, arguments); };
        sp.on = true; for (let i = 0; i < 60; i++) paso(1 / 60); sp.on = false;
        tirar(0.5); rodando = A.fase === 'rueda'; sp.on = true; for (let i = 0; i < 60 && A.fase === 'rueda'; i++) paso(1 / 60); sp.on = false;
      } finally {
        sp.on = false;
        for (const kk in origT) THREE[kk] = origT[kk];
        for (const kk in origA) Array.prototype[kk] = origA[kk];
        Element.prototype.querySelector = qs0; Element.prototype.querySelectorAll = qsa0; document.getElementById = gid0;
      }
      hastaQuieta();
      check('Hoyo 6 · sin asignaciones por cuadro (las seis estaciones se revisan cada cuadro): 0 objetos de THREE, 0 map/filter/forEach, 0 búsquedas en el DOM', rodando && !cuenta.three && !cuenta.arr && !cuenta.dom, JSON.stringify(cuenta));
    }
    // «Elegir hoyo» (tecla H) desde el final → «¿Qué hoyo quieres jugar?»; tecla 3 → hoyo 3 y se pregunta cuántos juegan
    reiniciar(); colocar(NIDO.u - 3, 0); apuntaLocal(NIDO.u, NIDO.v); tirar(fuerzaPara(3.3)); hastaQuieta();
    const enFin = A.fase === 'nido'; tecla('keydown', 'h');
    const panelH = !hud.q('hoyos').hidden && hud.q('bot').hidden && hud.q('fin').hidden && hud.el.querySelectorAll('[data-k="hoyos"] .vg-bot6 button').length === 6 &&
      !hud.el.querySelector('[data-k="hoyos"] [aria-disabled]') && hud.q('m-h6').textContent === TXT.oroC + ' · ' + recordTxt(1) && hud.el.classList.contains('vg-lado');
    const golpeNo = tirar(0.5) === false && empezarCarga() === false;
    tecla('keydown', '3');
    check('«Elegir hoyo» (tecla H): pantalla con los 6 hoyos (zona y medalla), sin golpear mientras se elige; la tecla 3 lleva al hoyo 3 y pregunta cuántos juegan',
      enFin && panelH && golpeNo && HOYO.n === 3 && A.eligiendo && !A.eligeHoyo && !hud.q('elige').hidden && hud.q('hoyos').hidden && Math.hypot(B.x - P_TEE.x, B.z - P_TEE.z) < 0.01, JSON.stringify({ enFin, panelH, golpeNo, hoyo: HOYO.n }));
    salir();
    // Guardado: récords por hoyo tras guardar y recargar; el minimapa marca los seis
    try { if (G.guardado.save) G.guardado.save(true); } catch (e) { /* */ }
    V.recargar();
    check('Récord y medalla de cada hoyo se guardan aparte (minigolf_villa, minigolf_h2…h6) y siguen tras recargar; el minimapa marca los 6 hoyos con su nombre',
      HOYOS.every(h => recordDe(h) && recordDe(h).mejor === 1 && recordDe(h).medalla === 'oro') && mapas().length === 6 && new Set(mapas().map(m => m.nombre)).size === 6, JSON.stringify(mapas().map(m => m.nombre)));
    // Desde el menú con varios hoyos abiertos: primero «¿Qué hoyo quieres jugar?»; uno cerrado no se elige (y lo dice)
    V.borrar(); V.recargar(); V.cambiarMundo(HOYOS[0].id, { mejor: 4, medalla: 'plata' }); toasts.length = 0;
    const guiaVis = () => !!G.fx && (G.fx.guideArrow.visible || G.fx.guideBeam.visible);
    G.emit('render', 0.016); const guiaAntes = guiaVis();
    const irM = irYJugar();
    const guiaG = { elige: null, hoyo: null, fuera: null };
    if (G.fx && G.fx.guide) { G.fx.guide({ x: S.pos.x + 14, z: S.pos.z + 6 }, 0); G.emit('render', 0.016); guiaG.elige = A.eligeHoyo && !guiaVis(); }
    const pant = { ok: irM, hoyo: HOYO.n, elige: A.eligeHoyo, panel: !hud.q('hoyos').hidden, cerrados: [...hud.el.querySelectorAll('[data-k="hoyos"] [aria-disabled="true"]')].map(b => b.dataset.a).join(','),
      h1: hud.q('m-h1').textContent, foco: document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.a : '' };
    pulsar('h4'); const cerradoNo = A.eligeHoyo && HOYO.n === 2 && toasts.includes(cerradoTxt(4));
    pulsar('h2');
    if (G.fx && G.fx.guide) { G.fx.guide({ x: S.pos.x + 14, z: S.pos.z + 6 }, 0); G.emit('render', 0.016); guiaG.hoyo = HOYO.n === 2 && A.fase !== 'nada' && !guiaVis(); }
    check('Con más de un hoyo abierto, «Minigolf» del menú abre «¿Qué hoyo quieres jugar?» en el primer hoyo sin completar; los cerrados se ven y dicen cómo se abren; elegir el 2 empieza el 2',
      pant.ok && pant.hoyo === 2 && pant.elige && pant.panel && pant.cerrados === 'h3,h4,h5,h6' && pant.h1 === TXT.plataC + ' · ' + recordTxt(4) && cerradoNo && HOYO.n === 2 && A.eligiendo && !A.eligeHoyo,
      JSON.stringify(Object.assign(pant, { cerradoNo })));
    salir();
    if (G.fx && G.fx.guide) { G.emit('render', 0.016); guiaG.fuera = A.fase === 'nada' && guiaVis() === guiaAntes; }
    check('mg27: en «¿Qué hoyo quieres jugar?» y jugando un hoyo no se ven la flecha ni el haz de la guía de la misión; al salir, la guía vuelve como estaba',
      !!G.fx && guiaG.elige === true && guiaG.hoyo === true && guiaG.fuera === true, JSON.stringify(Object.assign(guiaG, { antes: guiaAntes })));
    { // mg28 (QA-218): al cerrar «¿Qué hoyo quieres jugar?» el panel oculto no deja texto; al volver se rellena
      const ir2 = irYJugar(), eligeV = ir2 && A.eligeHoyo && /\p{L}/u.test(hud.q('hoyos').textContent); salir();
      const vacio = A.fase === 'nada' && hud.el.hidden && !/\p{L}/u.test(hud.el.textContent);
      const ir3 = irYJugar(), otraVez = ir3 && A.eligeHoyo && !hud.q('hoyos').hidden && hud.q('hoyos').textContent.includes(TXT.eligeHoyo) && hud.el.querySelectorAll('[data-k="hoyos"] .vg-bot6 button').length === 6 && hud.q('m-h1').textContent === TXT.plataC + ' · ' + recordTxt(4);
      salir();
      check('mg28: al salir del selector de hoyos el panel oculto se vacía (sin texto en español) y al volver sale completo', eligeV && vacio && otraVez && !/\p{L}/u.test(hud.el.textContent), JSON.stringify({ eligeV, vacio, otraVez, txt: hud.el.textContent.slice(0, 80) }));
    }
    // Por turnos: sin récord ni premios, pero si alguien llega al nido se abre el hoyo siguiente
    V.borrar(); V.recargar(); const m1 = mad();
    iniciar({ forzar, hoyo: 1 }); elegir(2);
    const meter = () => { colocar(NIDO.u - 3, 0); apuntaLocal(NIDO.u, NIDO.v); tirar(fuerzaPara(3.3)); hastaQuieta(); correr(ESPERA + 0.1); };
    meter(); meter();
    check('Por turnos: al terminar se abre el hoyo siguiente (sin récord ni premios) y «Siguiente hoyo» sigue con los mismos jugadores',
      A.fase === 'nido' && A.resultado.multi && A.resultado.abre === 2 && abierto(2) && !recordDe(HOYOS[0]) && mad() === m1 && !hud.q('bsig').hidden &&
      (pulsar('siguiente'), HOYO.n === 2 && A.njug === 2 && J.length === 2 && !A.eligiendo), JSON.stringify({ abre: A.resultado && A.resultado.abre, hoyo: HOYO.n, njug: A.njug }));
    salir();
    // Las estaciones de los otros hoyos se ven de cerca (< 90 m) y la del hoyo 1 lejos no; fuera del cap. 1, ninguna
    {
      V.cambiarMundo(ABIERTO, 6); const e3 = EST[2]; S.pos.x = e3.P_ENTRADA.x; S.pos.z = e3.P_ENTRADA.z; correr(0.05);
      const cerca = HOYO.n === 3 && e3.troncos.visible && e3.nido.visible && e3.salida.visible && semilla.visible && !e3.quieta.visible && !EST[0].troncos.visible && it === e3.it && it.label() === tx('label', e3.h);
      const pack0 = G.pack.id; G.pack.id = 'ep4'; correr(0.05); const fuera = EST.every(e => !e.troncos.visible && !e.nido.visible && !e.salida.visible && !e.quieta.visible) && !semilla.visible && !mapas().length; G.pack.id = pack0; correr(0.05);
      check('En el mundo: cerca de un hoyo se ven sus piezas, su semilla y su «Jugar al minigolf (hoyo 3)»; lejos no; fuera del cap. 1 ninguna estación', cerca && fuera, JSON.stringify({ hoyo: HOYO.n, cerca, fuera }));
    }
    usar(0);
    V.borrar(); V.recargar();
  }

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
      if (recolocar) recolocarYa();
      usar(0); // las pruebas de siempre, en el hoyo 1
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
          (antes || !libre()) && cede && (it.visible() || !libre()), JSON.stringify({ antes, cede, otraCerca: otraCerca(), libre: libre(), otro: otroActivo() })); // con un diálogo del capítulo abierto el hoyo tampoco se ofrece (libre)
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
      check('A toda fuerza contra un tronco tampoco lo atraviesa: rebota', umax < TRONCOS[0].u0 - TRONCO - R + 0.02 && enLocal().u < umax - 0.5, JSON.stringify({ umax: +umax.toFixed(2), tronco: TRONCOS[0].u0 }));
      const g0 = A.golpes;
      check('El contador suma un golpe por tiro', g0 === 3 && hud.q('golpes').textContent === golpesTxt(3), hud.q('golpes').textContent);
      // Rendimiento: el paso de cada cuadro no crea objetos de THREE, no usa map/filter/forEach, no busca en el DOM, no cambia
      // S.facing de objeto y el HUD no se reescribe si nada cambia (espías durante 120 cuadros apuntando y 60 rodando)
      {
        colocar(TEE.u, 0); apuntaLocal(TEE.u + 5, 0); correr(0.1);
        const cuenta = { three: 0, arr: 0, dom: 0 }, sp = { on: false }, origT = {}, origA = {}, qs0 = Element.prototype.querySelector, qsa0 = Element.prototype.querySelectorAll, gid0 = document.getElementById;
        const mo = new MutationObserver(() => {}); let mut = 0, fac = true, rodando = false;
        try {
          for (const k of ['Vector3', 'Vector2', 'Quaternion', 'Matrix4', 'Color', 'Euler', 'Object3D']) { origT[k] = THREE[k]; THREE[k] = new Proxy(origT[k], { construct(t, a, nt) { if (sp.on) cuenta.three++; return Reflect.construct(t, a, nt); } }); }
          for (const k of ['map', 'filter', 'forEach']) { const o = origA[k] = Array.prototype[k]; Array.prototype[k] = function () { if (sp.on) cuenta.arr++; return o.apply(this, arguments); }; }
          Element.prototype.querySelector = function () { if (sp.on) cuenta.dom++; return qs0.apply(this, arguments); };
          Element.prototype.querySelectorAll = function () { if (sp.on) cuenta.dom++; return qsa0.apply(this, arguments); };
          document.getElementById = function () { if (sp.on) cuenta.dom++; return gid0.apply(this, arguments); };
          mo.observe(hud.el, { subtree: true, childList: true, attributes: true, characterData: true });
          const f0 = S.facing; sp.on = true; for (let i = 0; i < 120; i++) paso(1 / 60); sp.on = false; fac = S.facing === f0;
          mut = mo.takeRecords().length;
          tirar(0.5); rodando = A.fase === 'rueda'; sp.on = true; for (let i = 0; i < 60 && A.fase === 'rueda'; i++) paso(1 / 60); sp.on = false;
        } finally {
          sp.on = false; mo.disconnect();
          for (const k in origT) THREE[k] = origT[k];
          for (const k in origA) Array.prototype[k] = origA[k];
          Element.prototype.querySelector = qs0; Element.prototype.querySelectorAll = qsa0; document.getElementById = gid0;
        }
        hastaQuieta();
        check('Sin asignaciones por cuadro: 0 objetos de THREE, 0 map/filter/forEach, 0 búsquedas en el DOM, S.facing fijo y HUD sin repintar', rodando &&
          !cuenta.three && !cuenta.arr && !cuenta.dom && fac && !mut, JSON.stringify(Object.assign({ mutaciones: mut, facing: fac, rodando }, cuenta)));
        A.golpes = g0; pintar();
      }
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
      const oidosG = [], play0 = G.audio.play; G.audio.play = (n, x) => { oidosG.push(n); return play0(n, x); }; // Kelvin 9-nov: el Grito suena
      let rg; try { rg = grito(); } finally { G.audio.play = play0; }
      correr(0.3); oy.mudo = true;
      check('Grito del Yunque: suena su propio sonido («grito»: graznido + ondas)', oidosG.includes('grito') && G.audio.log.slice(-6).includes('grito'), JSON.stringify(oidosG));
      const sp1 = Math.hypot(B.vx, B.vz), al = (B.vx * dG.x + B.vz * dG.z) / (sp1 || 1);
      check('Grito del Yunque (el poder de Vittata): empuja la semilla hacia donde apuntas', rg.ok && A.grito && sp1 > sp0 + 2 && al > 0.95 && poderes.some(e => e.id === 'grito_yunque'),
        JSON.stringify({ antes: +sp0.toFixed(2), despues: +sp1.toFixed(2), alineado: +al.toFixed(3) }));
      const rg2 = grito();
      check('Solo un Grito por hoyo', !rg2.ok && rg2.motivo === 'usado' && hud.q('t-grito').textContent === TXT.usado);
      hastaQuieta();
      // 6b. Cómo se juega (Kelvin 8-nov: que un niño lo entienda en 20 s sin leer párrafos): meta, teclas, pistas y flecha
      {
        reiniciar(); correr(0.05);
        const tt = tactil(), kbd = a => { const e = hud.el.querySelector('[data-k="bot"] [data-a="' + a + '"] kbd, [data-k="fin"] [data-a="' + a + '"] kbd'); return e ? e.textContent : ''; };
        const teclas = ['izq', 'golpe', 'der', 'grito', 'reiniciar', 'salir', 'otra', 'seguir'].map(kbd).join(' '), kh = document.getElementById('keyhint');
        const kVis = !!hud.el.querySelector('[data-a="golpe"] kbd').getClientRects().length;
        check('Cómo se juega · la meta se ve siempre en el panel («Mete la semilla en el nido» · «Oro con 3 golpes o menos») y una flecha marca el nido',
          !hud.q('meta').hidden && hud.q('meta').getClientRects().length && hud.q('meta').textContent.includes(TXT.meta) && hud.q('meta').textContent.includes(TXT.metaOro) &&
          flecha.visible && Math.hypot(flecha.position.x - P_NIDO.x, flecha.position.z - P_NIDO.z) < 0.01 && flecha.position.y > nido.position.y + 2.5 && TXT.empiezaPar.includes('nido'),
          JSON.stringify({ meta: hud.q('meta').textContent, flecha: flecha.visible, alto: +(flecha.position.y - nido.position.y).toFixed(2) }));
        check('Cómo se juega · cada botón lleva su tecla (← Espacio → G R Esc · R E · 1–4), visible en escritorio y oculta en táctil; sin la guía de explorar (Espacio: saltar) debajo',
          teclas === '← Espacio → G R Esc R E' && [1, 2, 3, 4].every(n => hud.el.querySelector('[data-a="j' + n + '"] kbd').textContent === String(n)) && kVis === !tt &&
          hud.el.querySelector('[data-a="izq"]').getAttribute('aria-label') === TXT.izq && hud.q('t-golpe').textContent === TXT.golpe && (!kh || getComputedStyle(kh).visibility === 'hidden' || getComputedStyle(kh).display === 'none'),
          JSON.stringify({ teclas, kVis, tt }));
        const pista = () => hud.q('guia').textContent;
        const p0 = pista(); empezarCarga(); paso(1 / 60); const p1 = pista(); soltarCarga(); const tiro = A.tiroP; paso(1 / 60); const p2 = pista(); hastaQuieta(); const p3 = pista(), av3 = A.aviso;
        check('Cómo se juega · pista corta de lo que toca: apuntar y mantener → «¡Suelta para golpear!» → Grito mientras rueda → «más fuerza» tras un toque flojo',
          p0 === (tt ? TXT.guiaT : TXT.guia) && p1 === TXT.pSuelta && p2 === (tt ? TXT.pGritoT : TXT.pGrito) && tiro < 0.15 && av3 === 'suave' && p3 === TXT.pSuave && [p0, p1, p2, p3].every(t => t.length <= 48),
          JSON.stringify({ p0, p1, p2, p3, tiro: +tiro.toFixed(2) }));
        colocar(NIDO.u - 3, 0); apuntaLocal(NIDO.u, 0); tirar(1); // a tope por encima del nido; pasado el nido se frena a mano (el rebote podría volver y entrar)
        for (let t = 0; t < 8 && A.fase === 'rueda'; t += 1 / 60) { paso(1 / 60); if (A.rapido && Math.hypot(B.x - P_NIDO.x, B.z - P_NIDO.z) > 1.25) B.vx = B.vz = 0; }
        hastaQuieta(); const pf = A.fase === 'apuntar' ? pista() : 'fase ' + A.fase;
        colocar(NIDO.u - 4, 0.3); apuntaLocal(NIDO.u, 0.3); tirar(fuerzaPara(2)); hastaQuieta(); const pc = A.fase === 'apuntar' ? pista() : 'fase ' + A.fase;
        colocar(TEE.u, 0); apuntaLocal(TEE.u + 5, 0); tirar(fuerzaPara(3)); hastaQuieta(); const pl = pista();
        check('Cómo se juega · tras cada tiro dice qué pasó: «¡Muy fuerte!» si pasó por encima del nido, «¡Casi!» si quedó cerca, «la flecha» si quedó lejos',
          pf === TXT.pFuerte && pc === TXT.pCerca && pl === TXT.pFlecha, JSON.stringify({ pf, pc, pl }));
        if (!window.AV_EN) { try { await AVE.assets.script('content/cap1/en.js'); } catch (e) { /* sin diccionario */ } }
        const D = window.AV_EN || {}, faltan = ['empiezaPar', 'guia', 'guiaT', 'meta', 'metaOro', 'pSuelta', 'pGrito', 'pGritoT', 'pSuave', 'pFuerte', 'pCerca', 'pFlecha', 'medOro', 'medOtra'].filter(k => !D[TXT[k]]);
        check('Cómo se juega · los textos nuevos tienen inglés en content/cap1/en.js', !faltan.length, faltan.join(', '));
        { // en7 (QA-219): los textos de los hoyos 2 a 6 y del selector también tienen inglés
          const h6 = HOYOS.slice(1), falt = ['eligeHoyo', 'eligeHoyoSub', 'siguiente', 'hoyos', 'cerradoC', 'sinJugar'].map(k => TXT[k])
            .concat(h6.map(h => h.zona), h6.map(h => PISTA[h.n]), h6.map(h => tx('empieza', h)), h6.map(h => tx('hoyo', h)), h6.map(h => tx('sale', h)), h6.map(abreTxt),
              ['Hoyo {}', 'Jugar al minigolf (hoyo {})', 'Minigolf, hoyo {}', 'Oro con {} golpes o menos', 'El hoyo {} se abre al completar el hoyo {}.', 'Oro · Récord: {}'])
            .filter(t => typeof D[t] !== 'string');
          check('en7 · los hoyos 2 a 6 y «¿Qué hoyo quieres jugar?» tienen inglés en content/cap1/en.js', !falt.length, falt.slice(0, 4).join(' | '));
        }
        reiniciar();
      }
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
      check('Cómo se juega · el final explica la medalla («Oro: … 3 golpes o menos» o «Para el oro: …») y la flecha del nido ya no se ve',
        hud.q('fin4').textContent === (res1.medalla === 'oro' ? TXT.medOro : TXT.medOtra) && !hud.q('fin4').hidden && !flecha.visible && hud.q('guia').textContent === '', hud.q('fin4').textContent);
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
      check('mg28 (QA-218): tras salir, el HUD oculto del minigolf no tiene texto (idiomaTest lee lo oculto)', hud.el.hidden && !/\p{L}/u.test(hud.el.textContent), hud.el.textContent.slice(0, 80));
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
      // 14 (§5). Controles en móvil: aparato táctil simulado (matchMedia de puntero grueso, como duelo2.js y combate.js) y toques
      // sintéticos (PointerEvent pointerType 'touch', como AV.tactilTest) en el lienzo y en los botones del HUD
      {
        const mm0 = window.matchMedia, cv = G.renderer && G.renderer.canvas, stEl = document.getElementById('stick'), st = (G.input && G.input.stick) || { x: 0, y: 0 };
        const estSt = stEl ? stEl.style.cssText : '', raiz = document.documentElement.classList;
        const toque = (el, tipo, o) => el.dispatchEvent(new PointerEvent(tipo, Object.assign({ bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true, clientX: 0, clientY: 0 }, o)));
        const pulsa = (sel, id) => { const b = hud.el.querySelector(sel), r = b.getBoundingClientRect(), o = { pointerId: id, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }; toque(b, 'pointerdown', o); return { b, o }; };
        const suelta = (p, tipo) => toque(p.b, tipo || 'pointerup', p.o);
        const bot = a => '[data-k="bot"] [data-a="' + a + '"]';
        const alineado = d => { const sp = Math.hypot(B.vx, B.vz); return sp > 0 ? (B.vx * d.x + B.vz * d.z) / sp : 0; };
        let fr = null;
        try {
          window.matchMedia = q => (/pointer:\s*coarse/.test(q) ? { matches: true, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, onchange: null } : mm0.call(window, q));
          if (A.fase !== 'nada') salir();
          iniciar({ forzar }); suelta(pulsa('[data-k="elige"] [data-a="j1"]', 30)); correr(0.05);
          check('Móvil: en táctil la guía del hoyo y el aviso de Acción nombran los botones, no las teclas', tactil() && A.njug === 1 && !A.eligiendo && !hud.q('bot').hidden &&
            hud.q('guia').textContent === TXT.guiaT && G.interaccion.modo.aviso() === TXT.guiaT && !/Espacio|\bG:|Esc/.test(TXT.guiaT), hud.q('guia').textContent);
          check('Móvil: en táctil los botones no enseñan teclas (sin <kbd> visibles)', hud.el.classList.contains('tactil') && [...hud.el.querySelectorAll('kbd')].every(e => !e.getClientRects().length));
          // Apuntar arrastrando: en el lado de la cámara el lienzo gira la vista; en el lado del joystick (oculto en el hoyo) también apunta
          const zurdo = raiz.contains('a11y-zurdo'), W = window.innerWidth, y = Math.round(window.innerHeight * 0.35);
          const xCam = Math.round(W * (zurdo ? 0.2 : 0.8)), xPalo = Math.round(W * (zurdo ? 0.8 : 0.2)), sgn = zurdo ? -1 : 1;
          const yaw0 = G.camara.yaw;
          toque(cv, 'pointerdown', { pointerId: 32, clientX: xCam, clientY: y });
          toque(cv, 'pointermove', { pointerId: 32, clientX: xCam - 14, clientY: y }); // pasa la zona muerta
          toque(cv, 'pointermove', { pointerId: 32, clientX: xCam - 64, clientY: y });
          toque(cv, 'pointerup', { pointerId: 32, clientX: xCam - 64, clientY: y });
          correr(0.05);
          const yaw1 = G.camara.yaw, ancla1 = sitioVittata();
          check('Móvil: arrastrar el dedo por la pantalla gira la mira (sin golpear ni mover a Vittata)', yaw1 > yaw0 + 0.1 && A.fase === 'apuntar' && A.golpes === 0 && puntos.visible &&
            Math.hypot(S.pos.x - ancla1.x, S.pos.z - ancla1.z) < 0.6, JSON.stringify({ yaw0: +yaw0.toFixed(3), yaw1: +yaw1.toFixed(3) }));
          if (stEl) stEl.style.display = 'block'; // en la ventana de escritorio de la prueba el joystick está con display:none
          toque(cv, 'pointerdown', { pointerId: 33, clientX: xPalo, clientY: y });
          toque(cv, 'pointermove', { pointerId: 33, clientX: xPalo + 60 * sgn, clientY: y });
          const empuja = st.x; correr(0.4); const yaw2 = G.camara.yaw, anc2 = sitioVittata(), quieta = Math.hypot(S.pos.x - anc2.x, S.pos.z - anc2.z);
          toque(cv, 'pointerup', { pointerId: 33, clientX: xPalo + 60 * sgn, clientY: y });
          check('Móvil: arrastrar en el lado del joystick (oculto en el hoyo) también apunta y Vittata no se va', raiz.contains('a11y-unamano') ||
            (Math.abs(empuja) > 0.2 && Math.abs(yaw2 - yaw1) > 0.2 && Math.sign(yaw1 - yaw2) === Math.sign(empuja) && quieta < 0.6 && st.x === 0 && A.fase === 'apuntar'),
            JSON.stringify({ palo: +empuja.toFixed(2), yaw: [+yaw1.toFixed(3), +yaw2.toFixed(3)], quieta: +quieta.toFixed(2) }));
          // ◀ ▶ mientras se mantienen
          const yaw3 = G.camara.yaw, pi = pulsa(bot('izq'), 34); correr(0.3); const yawI = G.camara.yaw, onI = pi.b.classList.contains('on'); suelta(pi);
          const pd = pulsa(bot('der'), 35); correr(0.3); const yawD = G.camara.yaw; suelta(pd); correr(0.05);
          check('Móvil: ◀ ▶ apuntan mientras se mantienen y paran al soltar', yawI > yaw3 + 0.2 && onI && yawD < yawI - 0.2 && A.giro === 0 && !pi.b.classList.contains('on') && Math.abs(G.camara.yaw - yawD) < 1e-9,
            JSON.stringify([+yaw3.toFixed(3), +yawI.toFixed(3), +yawD.toFixed(3)]));
          // Cargar manteniendo Golpear y soltar: golpe hacia donde apunta la mira
          const pg = pulsa(bot('golpe'), 36); correr(0.45);
          const carga = { cargando: A.cargando, carga: +A.carga.toFixed(2), barra: hud.q('barra').style.width }, dGol = dir(); suelta(pg);
          check('Móvil: mantener «Golpear» carga la fuerza (barra) y al soltar la semilla sale hacia la mira', carga.cargando && carga.carga > 0.15 && carga.barra !== '0%' &&
            A.fase === 'rueda' && A.golpes === 1 && !A.cargando && alineado(dGol) > 0.99, JSON.stringify(Object.assign(carga, { fase: A.fase, golpes: A.golpes, alineado: +alineado(dGol).toFixed(3) })));
          // Grito con su botón (con la semilla rodando)
          correr(0.1); const pgr = pulsa(bot('grito'), 37); suelta(pgr);
          check('Móvil: el botón «Grito» lanza el Grito del Yunque con la semilla rodando', A.grito && hud.q('t-grito').textContent === TXT.usado, hud.q('t-grito').textContent);
          hastaQuieta();
          // Un dedo que el sistema cancela (pointercancel) no golpea
          if (A.fase !== 'apuntar') reiniciar();
          const g0 = A.golpes, pc = pulsa(bot('golpe'), 38); correr(0.3); const cargaba = A.cargando; suelta(pc, 'pointercancel');
          check('Móvil: si el sistema cancela el toque (pointercancel), «Golpear» no golpea', cargaba && !A.cargando && A.fase === 'apuntar' && A.golpes === g0);
          // Botones grandes (≥ 44 px) y dentro de la pantalla en un teléfono de 390 px: maqueta con las hojas de estilo reales
          fr = document.createElement('iframe'); fr.setAttribute('aria-hidden', 'true'); fr.tabIndex = -1;
          fr.style.cssText = 'position:fixed;left:-10000px;top:0;width:390px;height:844px;border:0';
          const hojas = [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => `<link rel="stylesheet" href="${l.href}">`).join('');
          const css = document.getElementById('v18-golf-css');
          fr.srcdoc = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${hojas}${css ? css.outerHTML : ''}</head><body class="v18-golf-on">${hud.el.outerHTML}</body></html>`;
          document.body.appendChild(fr);
          await new Promise(r => { fr.addEventListener('load', r, { once: true }); setTimeout(r, 4000); });
          const md = fr.contentDocument, mal = [];
          const panel = (nombreP, lado, vis) => {
            const e = md.getElementById('v18-golf'); e.hidden = false; e.classList.toggle('vg-lado', lado);
            for (const k of ['elige', 'hoyos', 'bot', 'fin']) e.querySelector('[data-k="' + k + '"]').hidden = k !== vis;
            const bs = [...e.querySelectorAll('[data-k="' + vis + '"] button')]; for (const b of bs) b.hidden = false; // también «Siguiente hoyo» y «Elegir hoyo»
            if (!bs.length) mal.push(nombreP + ': sin botones');
            for (const b of bs) {
              const r = b.getBoundingClientRect();
              if (r.width < 44 || r.height < 44 || r.left < 0 || r.right > 390 || r.bottom > 844 || r.top < 0) mal.push(`${nombreP} «${b.textContent.trim()}» ${Math.round(r.width)}×${Math.round(r.height)} en ${Math.round(r.left)}–${Math.round(r.right)}`);
            }
            if (md.documentElement.scrollWidth > 390) mal.push(nombreP + ': scroll horizontal ' + md.documentElement.scrollWidth);
          };
          if (!md || !md.getElementById('v18-golf')) mal.push('la maqueta no cargó');
          else { panel('hoyo', false, 'bot'); panel('elegir', true, 'elige'); panel('elegir hoyo', true, 'hoyos'); panel('final', false, 'fin'); }
          check('Móvil: a 390 px todos los botones del hoyo (jugar, elegir jugadores, elegir hoyo, final) miden ≥ 44 px y no se salen de la pantalla', !mal.length, mal.join(' · '));
          // Salir con su botón
          const ps = pulsa(bot('salir'), 39); suelta(ps);
          check('Móvil: el botón «Salir» deja el hoyo y devuelve el control', A.fase === 'nada' && hud.el.hidden && G.interaccion.modo !== modo && !document.body.classList.contains('v18-golf-on'));
        } catch (e) { check('Móvil: controles táctiles sin excepciones', false, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e); }
        window.matchMedia = mm0;
        try { if (cv) for (const id of [32, 33]) toque(cv, 'pointerup', { pointerId: id }); } catch (e) { /* ya sueltos */ }
        if (stEl) { stEl.style.cssText = estSt; stEl.classList.remove('flotando'); }
        if (fr) fr.remove();
        if (A.fase !== 'nada') salir();
      }
      // 15. Hoyos 2 a 6 (Kelvin 8-nov: «terminar los hoyos 2 a 6 reutilizando las mecánicas que existen»; tabla §10 de la directiva)
      await pruebaHoyos(check, { correr, hastaQuieta, colocar, apuntaLocal, fuerzaPara, tecla, toasts, mad, forzar });
      for (const r of teclado()) out.push(r); // W35
    } catch (e) { check('Sin excepciones', false, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e); }
    try { if (A.fase !== 'nada') salir(); } catch (e) { /* ya fuera */ }
    A.manual = false; A.invitado = true; puntos.visible = false; flecha.visible = false;
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
  // irYJugar(n): al hoyo n. Sin n (menú, Pausa, ?mini=golf): con un solo hoyo abierto, el 1 como siempre; con más, primero
  // «¿Qué hoyo quieres jugar?», en la salida del primer hoyo abierto sin completar (o del último)
  function irYJugar(n) {
    if (!ofrecible() || A.fase !== 'nada' || otroActivo()) return false; // no en medio de un encuentro V18 (revisión 7-nov)
    const elegirH = !n && abiertos() > 1;
    if (!n) { n = 1; if (elegirH) { n = HOYOS.length; for (const h of HOYOS) if (abierto(h.n) && !recordDe(h)) { n = h.n; break; } while (n > 1 && !abierto(n)) n--; } }
    const e = EST[n - 1]; if (!e || !e.K || !abierto(n)) return false;
    usar(n - 1);
    if (M.flying) { try { F.endFlight(); } catch (e2) { /* ya en el suelo */ } }
    S.pos.x = P_ENTRADA.x; S.pos.z = P_ENTRADA.z; S.pos.y = H(S.pos.x, S.pos.z) + 0.05; S.vy = 0; M.vx = M.vz = 0;
    return iniciar({ forzar: true, hoyo: n, elegirHoyo: elegirH });
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
      tile.hidden = !(EST[0].K && ofrecible() && A.fase === 'nada' && !otroActivo());
    });
    if (/[?&]mini=golf\b/.test(location.search)) {
      let n = 0;
      const probar = () => { const portada = document.getElementById('title'); if (!(portada && portada.open) && libre() && !otroActivo() && irYJugar()) return; /* espera a que se cierre la portada, como los demás ?mini= */ if (++n < 180) setTimeout(probar, 1000); };
      setTimeout(probar, 1500);
    }
  }
  // Marcadores del minimapa: uno por hoyo abierto (mapa(): el del hoyo más cercano, como antes)
  const marcaDe = e => ({ x: e.P_ENTRADA.x, z: e.P_ENTRADA.z, nombre: tx('nombre', e.h), hoyo: e.h.n });
  const mapas = () => (ofrecible() && A.fase === 'nada' ? EST.filter(e => e.K && abierto(e.h.n)).map(marcaDe) : []);
  G.v18minigolf = { get ID() { return ID; }, get PAR() { return PAR; }, HOYOS, irYJugar, iniciar, salir, reiniciar, tirar, grito, empezarCarga, soltarCarga, paso, medalla, record, recordDe, abierto, irHoyo, elegirHoyo, elegir, clasificar, teclado,
    hoyo: () => HOYO.n, jugadores: () => J, estado: () => A, semilla: () => B, get sitio() { return EST[0].K; }, sitioDe: n => (EST[n - 1] ? EST[n - 1].K : null),
    mapa: () => (K && ofrecible() && A.fase === 'nada' && abierto(HOYO.n) ? marcaDe(EST[cur]) : null), mapas, test };
  return G.v18minigolf;
};
