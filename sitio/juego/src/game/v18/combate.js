/* Juego · V18.1 frente A · duelo de entrenamiento 1v1 contra una cotorra IA (entregable D7). Kelvin 5-nov, respuestas definitivas.
   - Explanada abierta y plana al este de la plaza de Villa Raíz (se busca en el mapa real; si no cabe, la más plana cerca).
   - La rival, «Campeona de la Explanada», es una cotorra existente con otra piel (sin canon nuevo): si juegas una Isleña, es
     una arausiaca (Escudo de plumas); si juegas una Montañera, una Isleña (Grito del Yunque). Lleva gafas de entreno.
   - Se entra hablando con ella (G.interaccion); sale en el minimapa como cualquier interactuable.
   - Resistencia: 5 plumas visibles por lado; cada impacto normal (ala o semilla) quita 1. La energía de los poderes va en un
     indicador aparte. Sin plumas: mareo breve con estrellitas (nadie se hace daño), fin del duelo y «Otra vez».
   - Básicos de todas: golpe de ala (Acción / E) y semilla (Impulso / F). Poder de la especie elegida (G.v18.seleccionada()):
     mantener Impulso, la tecla G o el botón con su nombre. Vittata: Grito del Yunque (sale hacia donde miras: hay que apuntar).
     A. arausiaca: Escudo de plumas. Mientras dura el duelo se toma Acción con G.interaccion.modo y el «mantener Impulso» de
     los dones (G.dones.sostener) con una envoltura que se quita al salir: dones.js no se toca.
   - Pico y alas: el grito abre el pico (hueso «pico» vía mouth, como al hablar) y el escudo abre las alas (wingMode 'land');
     en Vittata se pone con una envoltura de player3D.update mientras dura el duelo: actores.js y character.js no se tocan.
   - Efectos: G.v18fx.onda(origen, dir, alcance) / escudo(actor, s) / dispersar(actor) si existe (fx_poderes.js); si no, unos
     anillos y plumas propios, baratos.
   - Eventos: G.emit('v18combate', { tipo: 'hit' | 'damage' | 'win' | 'loss', de, a, valor }) y
     G.emit('v18poder', { id: 'grito_yunque' | 'escudo_plumas', de, origen, direccion, alcance }).
   - Recompensa: la primera victoria da 2 maderas y 1 piedra al inventario del juego (S.inv, el mismo del cap. 1);
     G.v18.otorgar('combate_1', 'victoria_duelo', 1) es solo la marca idempotente de que ya pagó. Repetir no da más.
   - V18.2 (evolución, src/game/v18/evolucion.js): solo el jugador trae { nivel, variante, alianza } (G.v18evo.paraDuelo); la
     Campeona no sube. Tecla H (solo en el duelo y con alianza elegida) o el botón .vd-ali: poder de alianza. El fin del duelo
     añade { especie, dura, interrupciones, quitadas } al evento win/loss. Sin evolucion.js todo queda como antes.
   - V18.2 equilibrio (DIFICULTAD): la Campeona entrena a la altura de tu etapa (Aprendiz, Despertar, Guardián, Maestro).
     Cambian sus reflejos (cada cuánto decide y si esquiva o se escuda), cuánto usa su poder y cuántas plumas trae; sus golpes
     quitan lo mismo de siempre. Sin nivel del jugador (pruebas que fuerzan especie) juega la de siempre (CLASICA).
   - Cómo se pelea (Kelvin 8-nov: «no se entiende cómo hacer los movimientos»): el primer duelo empieza con un entreno guiado
     de 3 pasos (aletazo E, semilla F, poder G) que avanza cuando la jugadora lo hace; la Campeona se queda quieta (no se
     llama a pasoIA) y nadie pierde plumas. Se puede saltar; se guarda en G.v18.mundo('entreno_duelo') y luego se abre con el
     botón «¿Cómo se pelea?». Chips de acción con tecla y recarga visual (en táctil, etiquetas sobre Acción e Impulso) y
     pistas breves («¡Cerca! Aletazo (E)»…, una cada 4,5 s como mucho) que dejan de salir al dominarlas
     (G.v18.mundo('pistas_duelo'), máscara de bits); la del primer golpe recibido explica esquivar o cubrirse.
   Solo con la bandera V18. Prueba: AV.v18CombateTest(). */
window.AVV18Combate = function (G) {
  'use strict';
  const alMenu = () => !!(G.menuModos && G.menuModos.desdeMenu && G.menuModos.desdeMenu()); /* se entró desde «¿Cómo quieres jugar?»: el botón del final lleva al menú */
  if (G.v18combate) return G.v18combate;
  const H = G.v18hab, S = G.S, F = G.fisica, M = F.MOVE, R = G.renderer, scene = R.scene;
  const ALTURA = h => G.terreno.height(h.x, h.z);
  const TACTIL = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches); // QA-163: sin tecla G en táctil
  const ARENA_R = 12, SALIDA_R = 24, PLUMAS = 5;
  // La Campeona según la etapa del jugador. pensar: segundos entre decisiones; esquiva y escudo: probabilidad de reaccionar a
  // una semilla (ve: a cuántos metros la ve venir; calma: espera entre reacciones); ala y tiro: espera entre golpes y semillas;
  // poder: probabilidad de usarlo cuando puede; vel: velocidad al acercarse; plumas: las que trae (hoy, las 5 en todas).
  // aparta: se sale del alcance de tu ala mientras la suya espera; rehace: se aparta de un salto al recuperarse de un golpe;
  // leeGrito: se escuda al verte abrir el pico; cerca y tiroMin: distancias del ala y de la semilla. CLASICA es la de siempre.
  // aviso y apunta: segundos que anuncia el golpe de ala y la semilla (telegrafía, 8-nov); el aviso se acorta con la etapa.
  // Números medidos con la jugadora «media» de AV.v18EvolucionTest (36 duelos por etapa, con semilla): gana del 55 al 75 %.
  // 8-nov: con la telegrafía (que la deja comprometida y a tiro) y el rodeo fuera de tu alcance se reajustaron reflejos,
  // semillas, velocidad y poder para volver a esa franja (antes, sin tocarlos, la jugadora media ganaba el 92–100 %).
  const CLASICA = { id: 'clasica', pensar: 0.25, ve: 5.5, calma: 2.4, esquiva: 0.55, escudo: 0.55, ala: 1.15, tiro: 2.4, poder: 0.3, vel: 4.2, plumas: PLUMAS };
  const DIFICULTAD = [
    { id: 'aprendiz', pensar: 0.17, ve: 6.33, calma: 1.074, esquiva: 0.96, escudo: 0.96, ala: 0.9, tiro: 0.898, poder: 0.725, vel: 5.765, aparta: 0.825, rehace: 0.89, cerca: 2.36, leeGrito: 0.81, tiroMin: 4.63, aviso: 0.5, apunta: 0.3, plumas: PLUMAS },
    { id: 'despertar', pensar: 0.14, ve: 6.63, calma: 1.308, esquiva: 0.89, escudo: 0.89, ala: 0.81, tiro: 1.288, poder: 0.625, vel: 5.245, aparta: 0.695, rehace: 0.89, cerca: 2.38, leeGrito: 0.73, tiroMin: 4.13, aviso: 0.45, apunta: 0.3, plumas: PLUMAS },
    { id: 'guardian', pensar: 0.13, ve: 6.7, calma: 1.074, esquiva: 0.95, escudo: 0.95, ala: 0.79, tiro: 1.008, poder: 0.82, vel: 5.74, aparta: 0.86, rehace: 0.96, cerca: 2.38, leeGrito: 0.88, tiroMin: 4, aviso: 0.42, apunta: 0.3, plumas: PLUMAS },
    { id: 'maestro', pensar: 0.11, ve: 6.93, calma: 1.15, esquiva: 0.93, escudo: 0.93, ala: 0.72, tiro: 1.18, poder: 0.76, vel: 5.49, aparta: 0.81, rehace: 0.95, cerca: 2.4, leeGrito: 0.87, tiroMin: 3.63, aviso: 0.38, apunta: 0.3, plumas: PLUMAS }
  ];


  // Telegrafía: segundos que la rival anuncia su golpe de ala (se agacha y abre las alas) y su semilla (apunta). Cada etapa
  // puede traer los suyos (aviso, apunta); si no, estos.
  const AVISO_ALA = 0.45, AVISO_SEMILLA = 0.3, APARTA_ESPERA = 0.9; // y entre dos saltos atrás seguidos, para que no salte sin parar
  function dificultadDe(j) {
    if (!j || !j.nivel) return CLASICA;
    let i = j.nivel >= 30 ? 3 : j.nivel >= 20 ? 2 : j.nivel >= 10 ? 1 : 0;
    try { if (G.v18evo && G.v18evo.etapaIdx) i = G.v18evo.etapaIdx(j.nivel); } catch (e) { /* sin evolución: la cuenta de arriba */ }
    return DIFICULTAD[Math.max(0, Math.min(DIFICULTAD.length - 1, i))];
  }
  const TXT = {
    retar: 'Retar a la Campeona de la Explanada', tu: 'Tú', rival: 'Campeona de la Explanada',
    ala: 'Ala', semilla: 'Semilla', poder: 'Poder', otra: 'Otra vez', salir: 'Salir', menu: 'Volver al menú', energia: 'Energía',
    aviso: 'Ala: E · Semilla: F · Poder: G', avisoTactil: 'Ala: Acción · Semilla: Impulso · Poder: mantén Impulso',
    ya: '¡Ya!', gana: '¡Ganaste 2 maderas y 1 piedra! Con eso se repara el puente colgante: sigue la bandera verde del mapa.',
    ganaGuarda: '¡Ganaste 2 maderas y 1 piedra! El puente ya está reparado: guárdalas para lo que venga.', ganaOtra: '¡Ganaste otra vez! Los materiales ya te los llevaste; busca más por el bosque.',
    pierde: '¡Uy, te mareaste! Sacude las plumas y prueba otra vez.', lejos: 'Te alejaste: el duelo queda para luego.',
    bloquea: '¡Bloqueado!', rompe: '¡Escudo roto!', reduce: '¡El escudo aguantó parte del grito!', interrumpe: '¡Interrumpida!',
    ganaste: '¡Ganaste!', perdiste: '¡Casi!', bienvenida: '¡A jugar! Quítale sus 5 plumas a la Campeona.', apoyo: '¡La cotorra de Dominica te cubre!',
    capa: '¡Capa de palma: semilla devuelta!', rebote: '¡Rebote!', hojas: '¡Las hojas aguantaron el golpe!', avisoSelva: '¡Cuidado, va a atacar!',
    avisoBandada: '¡Ojo de bandada: la rival va a usar su poder!', cuento: '¡La rival se queda escuchando el cuento!',
    // Entreno guiado, chips y pistas (cada texto es su propio nodo: el nombre del poder va aparte y se traduce solo)
    como: '¿Cómo se pelea?', saltarEnt: 'Saltar entreno', entPaso: (n, de) => 'Entreno · paso ' + n + ' de ' + (de || 3),
    // Combate 2.0 (para todos; ?combate2=0 lo apaga): extremidades y combos
    combos: 'Combos', comboRival: 'Campeona', sinPrisa: 'Combos sin prisa: más tiempo entre toque y toque', aPelear: '¡A pelear!',
    unCombo: 'un combo', tuPoder: 'tu poder', e4: 'Combo: ala izquierda y luego ala derecha.', e5: 'Combo: pata izquierda y luego pata derecha.',
    t4: 'Combo: toca Ala izq. y luego Ala der.', t5: 'Combo: toca Pata izq. y luego Pata der.',
    e1: 'Acércate y pulsa E para dar un aletazo.', e2: 'Ahora pulsa F para lanzar una semilla.', e3: 'Pulsa G (o mantén F) para usar tu poder:',
    t1: 'Acércate y toca Acción para dar un aletazo.', t2: 'Ahora toca Impulso para lanzar una semilla.', t3: 'Mantén Impulso para usar tu poder:',
    bien: '¡Bien!', masCerca: '¡Más cerca!', entFin: '¡Ya sabes pelear! Ahora, el duelo de verdad.',
    pCerca: '¡Cerca! Aletazo (E)', pLejos: 'Lejos: semilla (F)', pPoder: '¡Poder listo! (G)',
    pCercaT: '¡Cerca! Aletazo (Acción)', pLejosT: 'Lejos: semilla (Impulso)', pPoderT: '¡Poder listo! (mantén Impulso)',
    dGolpe: '¡Te dieron! Muévete de lado para esquivar.', dEscudo: '¡Te dieron! Para cubrirte, usa tu poder (G):', dEscudoT: '¡Te dieron! Para cubrirte, mantén Impulso:',
    accion: 'Acción', impulso: 'Impulso', tagPoder: 'mantén: poder',
    // V18.1 §9 («entiende por qué ganó»): al terminar, una línea que explica el resultado y, si pierdes, qué probar
    porGana: 'Le quitaste todas sus plumas.', porGanaPoder: 'Le quitaste todas sus plumas y tu poder ayudó:',
    tPoder: 'Consejo: usa tu poder (G):', tPoderT: 'Consejo: usa tu poder (mantén Impulso):',
    tCerca: 'Consejo: de cerca, aletazo; de lejos, semilla.', tEsquiva: 'Consejo: cuando veas «!» sobre la Campeona, apártate de lado.'
  };
  // Generador con semilla: la IA decide igual en cada prueba
  let semilla = 1;
  const azar = () => { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; };
  const emitir = ev => { try { G.emit('v18combate', ev); } catch (e) { /* sin oyentes */ } };

  // ---------- Sitio: la explanada más plana y libre cerca del este de la plaza ----------
  // QA-174: antes miraba los colliders de árbol y los sólidos de flora, que solo existen a 40 m de la jugadora: según dónde
  // cargara la partida, el sitio cambiaba y podía caer con troncos dentro. Ahora mira solo datos fijos del mapa (terreno, agua,
  // colliders que no son de flora y todas las instancias de árboles, rocas y troncos caídos de vegetacion.js), así que sale
  // igual en cada carga; prefiere un sitio sin troncos en el círculo ni en el pasillo de la cámara (x − 5 … x − 14).
  // El bosque no se toca. Se recalcula cuando la vegetación y el mundo terminan de cargar (antes de eso aún no hay troncos).
  const LIBRE_R = ARENA_R + 0.5;
  function flora(cx, cz, R) {
    const V = G.vegetacion, P = V && V.instancias, inf = V && V.info, out = [];
    if (!P || !inf) return out;
    for (const m in P) {
      const I = inf[m], PM = P[m], roca = /roca|piedra|tronco_caido/.test(m); if (!I || !PM || (!roca && !(I.tronco >= 0.08))) continue;
      for (let i = 0; i < PM.n; i++) {
        const x = PM.pos[i * 4], z = PM.pos[i * 4 + 2], sc = PM.pos[i * 4 + 3];
        if (Math.abs(x - cx) < R && Math.abs(z - cz) < R) out.push({ x, z, r: roca ? Math.max(0.5, (I.ancho || 1) * 0.5 * sc) : Math.max(0.2, I.tronco * sc), m });
      }
    }
    return out;
  }
  // Troncos (o rocas) dentro del círculo o del pasillo de la cámara de un sitio; peso: 3 dentro del círculo, 1 en el pasillo
  function estorbos(x, z, lista) {
    const out = []; out.peso = 0;
    for (const o of lista) {
      if (Math.hypot(o.x - x, o.z - z) < LIBRE_R + o.r) { out.push(o); out.peso += 3; continue; }
      const t = Math.max(-14, Math.min(-5, o.x - x)); // pasillo de la cámara al oeste del punto de salida
      if (Math.hypot(o.x - (x + t), o.z - z) < 2 + o.r) { out.push(o); out.peso += 1; }
    }
    return out;
  }
  function plano(x, z, cols) {
    const h0 = G.terreno.height(x, z); let mn = h0, mx = h0;
    for (let a = 0; a < 16; a++) for (const r of [4, 8, ARENA_R]) {
      const px = x + Math.cos(a / 16 * 6.2832) * r, pz = z + Math.sin(a / 16 * 6.2832) * r, h = G.terreno.height(px, pz);
      mn = Math.min(mn, h); mx = Math.max(mx, h);
      if (G.agua && G.agua.levelAt && G.agua.levelAt(px, pz) > h - 0.3) return Infinity;
      for (const c of cols) if (Math.hypot(px - c.x, pz - c.z) < (c.r || 1) + 0.6) return Infinity;
    }
    return mx - mn;
  }
  // Rejilla cada 3 m en ±18 m del punto preferido (al este de la plaza, como pidió Kelvin): plano (≤ 1,6 m), seco, sin
  // edificios; gana el más plano y cercano. En el mapa no hay ningún hueco seco y plano sin árboles a menos de 90 m de la
  // plaza (medido), así que la vegetación ya no cuenta para elegir: el círculo se despeja (despejarSitio, abajo).
  // Solo lo grande y fijo del mapa (edificios, estructuras, taller): los objetos sueltos, bancos, estacas y vecinos entran
  // con el streaming o se mueven, y hacían que el sitio dependiera del momento de la carga. Las estructuras propias del mapa
  // (mapa.estructuras: el refugio) cuentan desde el principio aunque su collider llegue después: (176,175) y (179,172) salían
  // en las cargas en que el refugio aún no tenía collider.
  const FIJOS = new Set(['edificio', 'estructura', 'taller']);
  function candidatos() {
    const pl = G.terreno.places || {}, v = pl.villa || pl.plaza || { x: S.pos.x, z: S.pos.z };
    const pref = pl.villa ? { x: v.x + 26, z: v.z + 5 } : { x: v.x + 10, z: v.z }, A = 18, R = A + ARENA_R + 6;
    const lista = [];
    const cerca = c => c && c.x != null && c.z != null && Math.abs(c.x - pref.x) < R + (c.r || 1) && Math.abs(c.z - pref.z) < R + (c.r || 1);
    const cols = (F.colliders || []).filter(c => c && FIJOS.has(c.kind) && cerca(c))
      .concat(((G.terreno.mapa && G.terreno.mapa.estructuras) || []).filter(e => e && e.pos && !e.mundo).map(e => ({ x: e.pos[0], z: e.pos[2], r: 5 })).filter(cerca));
    const out = [];
    for (let dx = -A; dx <= A; dx += 3) for (let dz = -A; dz <= A; dz += 3) {
      const x = pref.x + dx, z = pref.z + dz, d = plano(x, z, cols); if (!isFinite(d) || d > 1.6) continue;
      const e = estorbos(x, z, lista);
      out.push({ x, z, peso: e.peso, n: e.length, p: d * 20 + Math.hypot(dx, dz) });
    }
    return { pref, out };
  }
  function buscarSitio() {
    const { pref, out } = candidatos(); let mejor = null;
    for (const c of out) if (!mejor || c.p < mejor.p) mejor = c;
    if (!mejor) mejor = { x: pref.x, z: pref.z };
    return { x: mejor.x, z: mejor.z, y: G.terreno.height(mejor.x, mejor.z) };
  }
  const sitio = buscarSitio();
  // QA-174: el círculo despejado (solo existe con la V18.1). Se quitan del bosque, en marcha, las instancias de flora con el pie
  // en el círculo (+1 m), los árboles cuya copa entra más de 2 m en él (al llegar volando se aterrizaba en sus ramas a 10-12 m)
  // y los que tapan la cámara del duelo (pasillo al oeste del punto de salida, x − 4 … x − 18). El resto del bosque no cambia.
  const despeje = { clave: '', n: 0 };
  const enDespeje = (x, z, inf, sc) => {
    const copa = inf && inf.ancho ? 0.4 * inf.ancho * (sc || 1) : 0, d = Math.hypot(x - sitio.x, z - sitio.z);
    return d < ARENA_R + 1 || d - copa < ARENA_R - 2 || (x < sitio.x - 4 && x > sitio.x - 18 && Math.abs(z - sitio.z) - copa < 2.5);
  };
  function despejarSitio() {
    const V = G.vegetacion, k = sitio.x + ',' + sitio.z;
    if (!V || !V.despejar || !V.instancias || despeje.clave === k) return 0;
    const n = V.despejar(sitio.x - ARENA_R - 22, sitio.z - ARENA_R - 8, sitio.x + ARENA_R + 8, sitio.z + ARENA_R + 8, (x, z, m, inf, sc) => enDespeje(x, z, inf, sc));
    if (V.instancias && Object.keys(V.instancias).length) { despeje.clave = k; despeje.n += n; }
    return n;
  }

  // ---------- Escena: círculo de la explanada, semillas ----------
  // Anillo pintado en el suelo (textura canvas en runtime, 0 assets): banda de oro de borde suave con filete toon
  // oscuro y puntadas cremas, más un tinte cálido tenue dentro de la arena.
  const texArena = (() => {
    const S = 512, c = S / 2, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const g = cv.getContext('2d');
    const rOut = c - 4, rIn = rOut * (ARENA_R - 0.7) / (ARENA_R + 0.12), rMed = (rIn + rOut) / 2;
    const tinte = g.createRadialGradient(c, c, 0, c, c, rIn);
    tinte.addColorStop(0, 'rgba(255,214,140,0.07)'); tinte.addColorStop(0.85, 'rgba(255,214,140,0.05)'); tinte.addColorStop(1, 'rgba(255,214,140,0)');
    g.fillStyle = tinte; g.fillRect(0, 0, S, S);
    g.strokeStyle = 'rgba(255,210,122,0.35)'; g.lineWidth = rOut - rIn + 10;
    g.beginPath(); g.arc(c, c, rMed, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(255,210,122,0.95)'; g.lineWidth = rOut - rIn - 6;
    g.beginPath(); g.arc(c, c, rMed, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(138,90,32,0.85)'; g.lineWidth = 3;
    g.beginPath(); g.arc(c, c, rOut - 4, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(c, c, rIn + 4, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(255,243,214,0.9)'; g.lineWidth = 4; g.lineCap = 'round';
    for (let i = 0; i < 48; i++) {
      const a = i / 48 * Math.PI * 2;
      g.beginPath(); g.arc(c, c, rMed, a + 0.02, a + Math.PI * 2 / 48 * 0.45); g.stroke();
    }
    const t = new THREE.CanvasTexture(cv);
    t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; // decal: los mipas lavarían el alpha a rasante
    return t;
  })();
  const marca = new THREE.Mesh(new THREE.RingGeometry(ARENA_R - 0.7, ARENA_R + 0.12, 96),
    new THREE.MeshBasicMaterial({ map: texArena, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  marca.rotation.x = -Math.PI / 2; marca.position.set(sitio.x, sitio.y + 0.06, sitio.z); marca.renderOrder = 3; marca.name = 'v18_arena';
  marca.frustumCulled = false; // decal autogestionado: fuera del cullPequenos
  scene.add(marca);
  const geoSemilla = new THREE.SphereGeometry(0.16, 10, 8), matSemilla = new THREE.MeshStandardMaterial({ color: '#8a5a2b', roughness: 0.8, emissive: '#3a2410' });

  // ---------- Luchadores ----------
  let espForzada = null; // solo las pruebas: iniciar({ especie })
  const especieJugador = () => espForzada || (G.v18 && G.v18.seleccionada && G.v18.seleccionada()) ||
    (S.profile && ((S.profile.look && S.profile.look.species) || S.profile.species)) || 'vittata';
  const especieRival = sp => H.familia(sp) === 'montaneras' ? 'ventralis' : 'arausiaca';
  const nuevasStats = () => ({ movida: 0, ataques: 0, esquivas: 0, poderes: 0, aciertosIA: 0, bloqueos: 0, interrupciones: 0, ondas: 0, escudos: 0, dispersiones: 0, poderesEv: 0, reacciones: 0, intJ: 0, desvios: 0, poderJ: 0 });
  const C = { fase: 'nada', t: 0, cuenta: 0, j: null, r: null, balas: [], timers: [], trampas: [], resultado: null, ch: null, listo: null, stats: nuevasStats() };
  // Recompensa de la primera victoria: materiales del inventario del juego (S.inv), los mismos del cap. 1
  const PREMIO = { madera: 2, piedra: 1 };
  const rivalPos = { x: sitio.x + 4, y: sitio.y, z: sitio.z };
  function nuevoRival(dif) {
    const sp = especieRival(especieJugador()), D = dif || CLASICA, pl = Math.max(1, Math.min(PLUMAS, D.plumas || PLUMAS));
    return H.luchador({ id: 'rival', nombre: TXT.rival, especie: sp, ia: true, pos: rivalPos, plumas: pl, plumasMax: pl, dif: D,
      kb: { x: 0, z: 0, t: 0 }, mov: { x: 0, z: 0, t: 0 }, lift: { alto: 0, t: 0, dura: 0 }, yaw: -Math.PI / 2,
      pensar: 0.4, golpeT: 1, tiroT: 1.5, esquivaT: 0, poderT: 2.5, lado: 1, finMareo: 0,
      v: { x: 0, z: 0 }, ladoT: 3, apartaT: 0, prep: '', prepT: 0, prepDur: 0, avisoUsado: 0, avisoSelva: '', golpeAnim: 0, saltoT: 0, saltoDur: 0, agacha: 0 });
  }
  // V18.2: nivel, variante y alianza del jugador (solo él). Las pruebas que fuerzan especie van sin evolución salvo que la pidan.
  function evoJugador(sp, o) {
    if (o && o.evo !== undefined) return o.evo;
    if (espForzada && !(o && o.evoReal)) return null;
    try { return G.v18evo && G.v18evo.paraDuelo ? G.v18evo.paraDuelo(sp) : null; } catch (e) { return null; }
  }
  function nuevoJugador(o) {
    const sp = especieJugador();
    return H.luchador(Object.assign({ id: 'jugador', nombre: TXT.tu, especie: sp, pos: S.pos, plumas: PLUMAS, plumasMax: PLUMAS,
      kb: { x: 0, z: 0, t: 0 }, finMareo: 0, mira: () => S.facing }, evoJugador(sp, o) || {}));
  }
  C.r = nuevoRival();
  // QA-192: el duelo es de Villa Raíz; fuera del cap. 1 no se crea la rival ni se ofrece (mismo patrón que chispa/moon/guardian)
  const enCap1 = () => !!(G.pack && G.pack.id === 'cap1');
  function crearRival() {
    if (C.listo) return C.listo;
    if (!enCap1()) return (C.listo = Promise.resolve(null));
    if (!window.AVCharacter || !window.AVCharacter.create) return (C.listo = Promise.resolve(null));
    return (C.listo = window.AVCharacter.create().then(ch => {
      ch.applyLook({ species: C.r.especie, accessories: { eyes: { id: 'gafas', color: '#7fd3ff' } } });
      const alto = (G.pack.jugador && G.pack.jugador.altura) || 1.75;
      ch.root.scale.setScalar(alto / ch.height); ch.root.userData.sinCulling = true; ch.root.rotation.order = 'YXZ';
      ch.root.name = 'v18_rival'; ch.play('Idle'); scene.add(ch.root); C.ch = ch; C.chEsp = C.r.especie;
      return ch;
    }).catch(() => null));
  }

  // ---------- Contexto para las habilidades ----------
  function golpear(de, blanco, g) {
    if (C.fase !== 'lucha' || !blanco) return false;
    if (blanco.escudo > 0 && g.rompeEscudo) { quitarEscudo(blanco); flotante(TXT.rompe, 1.2); } // Ala fuerte: rompe el escudo y el golpe entra entero
    // Hojas que envuelven: el siguiente golpe que quitaría una pluma solo marea (el escudo y la inmunidad van antes)
    if (blanco.hojas > 0 && (g.plumas || 0) > 0 && !(blanco.escudo > 0) && !(blanco.inv > 0 && !g.forzar)) {
      blanco.hojas = 0; g = Object.assign({}, g, { plumas: 0, mareo: Math.max(g.mareo || 0, (H.get('hojas_envuelven') || {}).mareo || 0.8) });
      fx('leaves', blanco.pos.x, blanco.pos.y + 1, blanco.pos.z); flotante(TXT.hojas, 1.0); C.stats.hojas = (C.stats.hojas || 0) + 1;
    }
    const rc = H.recibir(de, blanco, g); // regla común (habilidades.js): escudo, invulnerabilidad, plumas, mareo, empujón
    if (rc.escudo) {
      // Escudo de plumas: un golpe normal se para del todo; el grito se reduce, no se anula. En los dos casos se dispersa.
      C.stats.bloqueos++;
      quitarEscudo(blanco);
      if (rc.r === 'bloqueado') {
        fx('feathers', blanco.pos.x, blanco.pos.y + 1, blanco.pos.z); sonar('land');
        if (blanco.ia) flotante(TXT.bloquea);
        if (blanco.bonusBloqueo) blanco.energia = Math.min(blanco.energiaMax, blanco.energia + blanco.bonusBloqueo); // V18.2 Arausiaca nv 20
        emitir({ tipo: 'hit', de: de.id, a: blanco.id, valor: 0, bloqueado: true });
        C2.golpe(de, blanco, { bloqueado: true, directo: de === enUso, camara: de === C.j || blanco === C.j });
        return false;
      }
      if (blanco.ia || !de.ia) flotante(TXT.reduce, 1.2);
    }
    if (rc.r !== 'ok') return false;
    // La Campeona anunciando su golpe de ala aguanta un golpe normal (pierde la pluma, apenas se mueve y el golpe sale igual):
    // ante el «!» hay que apartarse o escudarse; solo lo que interrumpe (el Grito y compañía) la corta.
    if (blanco.ia && blanco.prep === 'golpe_ala' && !g.interrumpe && blanco.plumas > 0) { rc.mareo = 0; blanco.mareo = 0; rc.empuje *= 0.25; blanco.kb.x *= 0.25; blanco.kb.z *= 0.25; C.stats.aguanta = (C.stats.aguanta || 0) + 1; }
    const n = rc.n, empuje = rc.empuje, mareo = rc.mareo, parcial = rc.parcial;
    if (g.interrumpe) interrumpir(blanco, mareo, parcial);
    if (blanco.lift && empuje > 0) { blanco.lift.alto = n > 0 ? 0.45 : 0.25; blanco.lift.t = 0; blanco.lift.dura = 0.32; C.stats.reacciones++; } // saltito de sorpresa
    fx('feathers', blanco.pos.x, blanco.pos.y + 1, blanco.pos.z);
    sonar(n > 0 ? 'land' : 'jump');
    if (de.ia) C.stats.aciertosIA = (C.stats.aciertosIA || 0) + 1;
    emitir({ tipo: 'hit', de: de.id, a: blanco.id, valor: n, reducido: parcial || undefined, interrumpe: !!g.interrumpe || undefined });
    if (n > 0) emitir({ tipo: 'damage', de: de.id, a: blanco.id, valor: blanco.plumas });
    C2.golpe(de, blanco, { n, directo: de === enUso, camara: de === C.j || blanco === C.j }); // Combate 2.0 (solo con la bandera): impacto, hit-stop visual, sacudida
    pintar();
    if (blanco.plumas <= 0) terminar(blanco === C.r ? 'win' : 'loss');
    return true;
  }
  // Interrumpir: corta lo que hacía (acometida, pensar, carga del poder) durante el mareo corto del grito
  function interrumpir(f, s, parcial) {
    C.stats.interrupciones++; if (f.ia) C.stats.intJ++; // intJ: las del jugador a la Campeona (desafío de la alianza)
    f.interrumpida = s;
    if (f.ia) { f.mov.t = 0; f.pensar = Math.max(f.pensar, s); f.golpeT = Math.max(f.golpeT, s); if (!parcial) flotante(TXT.interrumpe); }
    else { sost = 0; M.dashT = 0; M.vx *= 0.3; M.vz *= 0.3; }
  }
  function fx(tipo, x, y, z) {
    if (!G.fx) return;
    try {
      if (tipo === 'ring' && G.fx.ringFx) G.fx.ringFx(x, y, z, 5, 0.6, 0.8);
      else if (G.fx.burst) G.fx.burst(x, y, z, tipo, tipo === 'bubbles' ? 10 : 8);
    } catch (e) { /* sin efectos */ }
  }
  function sonar(n, arg) { try { if (G.audio && G.audio.play) G.audio.play(n, arg); } catch (e) { /* sin audio */ } }
  const v18fx = nombre => G.v18fx && typeof G.v18fx[nombre] === 'function';

  // Ondas del Grito del Yunque: con G.v18fx.onda si existe; si no, tres anillos que avanzan y se abren (una geometría compartida)
  const geoOnda = new THREE.RingGeometry(0.42, 0.6, 40);
  const ondas = [];
  function onda(origen, dir, alcance, vel) {
    C.stats.ondas++;
    if (v18fx('onda')) {
      const lanza = () => { try { G.v18fx.onda(origen, { x: dir.x, y: 0, z: dir.z }, alcance); } catch (e) { /* efecto */ } };
      if (c2On()) C2.despues(0.12, lanza); else lanza(); // Combate 2.0: los anillos salen cuando lanza la cabeza (FAM.grito.imp); el golpe no cambia
      return;
    }
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(geoOnda, new THREE.MeshBasicMaterial({ color: '#dff4ff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      m.position.set(origen.x, origen.y, origen.z); m.rotation.y = Math.atan2(dir.x, dir.z); m.renderOrder = 4; m.name = 'v18_onda';
      scene.add(m); ondas.push({ m, t: -i * 0.09, vida: alcance / (vel || 16), o: origen, dir, alcance }); // vel: más lenta con la Mirada del Pitón
    }
  }
  function pasoOndas(dt) {
    for (let i = ondas.length - 1; i >= 0; i--) {
      const w = ondas[i]; w.t += dt;
      const k = w.t / w.vida;
      if (k >= 1) { scene.remove(w.m); w.m.material.dispose(); ondas.splice(i, 1); continue; }
      if (k < 0) continue;
      const d = k * w.alcance, s = 0.6 + k * 2.6;
      w.m.position.set(w.o.x + w.dir.x * d, w.o.y, w.o.z + w.dir.z * d); w.m.scale.setScalar(s);
      w.m.material.opacity = 0.75 * (1 - k);
    }
  }
  function quitarOndas() { for (const w of ondas) { scene.remove(w.m); w.m.material.dispose(); } ondas.length = 0; }

  // Escudo de plumas: con G.v18fx.escudo/dispersar si existen; si no, 8 plumas de luz que giran y al final se dispersan
  const geoPluma = (() => { // pluma: hoja alargada con el cañón marcado
    const f = new THREE.Shape(); f.moveTo(0, -0.24); f.quadraticCurveTo(0.11, -0.05, 0.035, 0.24); f.lineTo(0, 0.2); f.lineTo(-0.035, 0.24); f.quadraticCurveTo(-0.11, -0.05, 0, -0.24);
    return new THREE.ShapeGeometry(f, 6);
  })();
  const matPluma = new THREE.MeshBasicMaterial({ color: '#9fe6ff', transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const matPluma2 = new THREE.MeshBasicMaterial({ color: '#ffe7a3', transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  function escudo(f, s) {
    C.stats.escudos++;
    if (v18fx('escudo')) { try { G.v18fx.escudo(f, s); f.escudoFx = 'v18fx'; return; } catch (e) { /* cae al propio */ } }
    if (f.escudoFx && f.escudoFx !== 'v18fx') scene.remove(f.escudoFx);
    const g = new THREE.Group(); g.name = 'v18_escudo';
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(geoPluma, i % 2 ? matPluma2 : matPluma), a = i / 10 * Math.PI * 2;
      m.position.set(Math.cos(a) * 0.95, 0.32 * Math.sin(a * 2), Math.sin(a) * 0.95); m.rotation.set(0, -a + Math.PI / 2, 0.9); m.scale.setScalar(i % 2 ? 1.25 : 1.5); g.add(m);
    }
    g.position.set(f.pos.x, f.pos.y + 0.95, f.pos.z); scene.add(g); f.escudoFx = g;
  }
  function quitarEscudo(f, sinFx) {
    f.escudo = 0; f.alasT = 0;
    const e = f.escudoFx; if (!e) return; f.escudoFx = null;
    if (e === 'v18fx') {
      if (!sinFx && v18fx('dispersar')) try { G.v18fx.dispersar(f); } catch (er) { /* efecto */ }
      if (sinFx && v18fx('apagar')) try { G.v18fx.apagar(f); } catch (er) { /* efecto */ }
    }
    else scene.remove(e);
    if (!sinFx) { fx('feathers', f.pos.x, f.pos.y + 1, f.pos.z); C.stats.dispersiones++; }
  }
  function pasoEscudo(f, dt) {
    if (!f || !f.escudoFx) return;
    if (f.escudo <= 0) { quitarEscudo(f); return; } // caducó sin recibir golpe
    if (f.escudoFx !== 'v18fx') { const g = f.escudoFx; g.position.set(f.pos.x, f.pos.y + 0.95, f.pos.z); g.rotation.y += dt * 4.5; }
  }
  function ctxDe(yo) {
    const otro = yo === C.j ? C.r : C.j;
    return {
      otro,
      golpear: (blanco, g) => golpear(yo, blanco, g),
      lanzar: b => lanzar(b),
      despues: (s, fn) => C.timers.push({ t: s, fn }),
      onda, escudo,
      desviar: (o, dir, alc, cono) => desviar(yo, o, dir, alc, cono), apoyo,
      trampa: (x, z, t, de) => C.trampas.push({ x, z, t, de: de || yo }), // Plumas de manglar
      mirar: () => { const d = H.dirA(yo, otro); if (yo.mira) { const f = yo.mira(); if (f) { f.x = d.x; f.z = d.z; } } }, // Vuelta de pino
      poder: ev => { C.stats.poderesEv++; try { G.emit('v18poder', ev); } catch (e) { /* sin oyentes */ } },
      fx, sonar
    };
  }
  // V18.2 Eco Dirigido: las semillas de la otra dentro del cono del grito se deshacen en hojas (no las del que grita)
  function desviar(yo, o, dir, alc, cono) {
    let n = 0;
    for (let i = C.balas.length - 1; i >= 0; i--) {
      const b = C.balas[i], p = b.m.position; if (b.de === yo) continue;
      const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz);
      if (d > alc + 0.6 || (d > 1.2 && (dx * dir.x + dz * dir.z) / d < cono)) continue;
      scene.remove(b.m); C.balas.splice(i, 1); fx('leaves', p.x, p.y, p.z); n++;
    }
    C.stats.desvios += n; return n;
  }
  // V18.2 Eco Protector: la segunda cotorra aporta su apoyo visual (retrato existente y aviso breve); sin modelo nuevo
  let apoyoT = 0; // tiempo de juego (con la pausa se queda quieto)
  function apoyo(quien) {
    if (!hud) return; const el = hud.q('apoyo'); if (!el) return;
    el.hidden = false; apoyoT = 1.2;
    // V18.2: el retrato y el aviso de la compañera de cada alianza
    if (quien && el.dataset.de !== quien) {
      el.dataset.de = quien; const img = el.querySelector('img'), sp = el.querySelector('span');
      if (img) img.src = 'assets/retratos/v18/' + quien + '.png';
      if (sp) sp.textContent = (G.v18evo && G.v18evo.textoApoyo) ? G.v18evo.textoApoyo(quien) : TXT.apoyo;
    }
    fx('feathers', S.pos.x, S.pos.y + 1.3, S.pos.z);
  }
  // Ojo de selva: el siguiente ataque de la vista se anuncia y sale un momento después (las defensas no se retrasan)
  let enUso = null; // Combate 2.0: quién está dentro de usar() (sus golpes cuerpo a cuerpo salen en ese mismo instante)
  const DEFENSAS = new Set(['escudo_plumas', 'quiebro', 'capa_palma', 'pluma_rebote', 'hojas_envuelven', 'remolino']);
  function usar(f, id) {
    if (C.fase !== 'lucha' || !f) return { ok: false, motivo: 'fase' };
    if (f.vista > 0 && !f.avisada && !DEFENSAS.has(id)) {
      const l = H.listo(f, id); if (!l.ok) return l;
      f.avisada = true; flotante(TXT.avisoSelva, 0.9); fx('gold', f.pos.x, f.pos.y + 1.6, f.pos.z); sonar('ring', 1);
      // QA-227: mientras espera el ataque anunciado está comprometida (como en la telegrafía): no se aparta a 2,8 m y el golpe llega
      f.avisoSelva = id;
      C.timers.push({ t: (H.get('ojo_selva') || {}).aviso || 0.6, fn: () => { f.avisoSelva = ''; usar(f, id); } });
      return { ok: true, id, avisada: true };
    }
    if (c2On() && EXM.bloquea(f, id)) return { ok: false, motivo: 'recupera' }; // Combate 2.0: recuperándose de un combo
    enUso = f; let r; try { r = H.usar(f, id, ctxDe(f)); } finally { enUso = null; }
    if (r.ok && !r.avisada) C2.accion(f, id); // Combate 2.0 (solo con la bandera): la pose de la acción, en este mismo cuadro
    if (r.ok && !r.avisada && c2On()) EXM.alPoder(f, id); // el poder justo después de un combo: «¡Bomba Boricua!»
    if (r.ok && !r.avisada && !H.get(id).basico) f.ultPoder = id; // Imitación: cada una recuerda lo último que usó (lo lee la otra)
    if (r.ok && f.ia && C.j && C.j.ojobandada > 0 && !H.get(id).basico) { // Ojo de bandada: la jugadora ve venir el poder de la rival
      C.stats.avisos = (C.stats.avisos || 0) + 1;
      flotante(TXT.avisoBandada, 1.0); fx('ring', f.pos.x, f.pos.y + 1.7, f.pos.z); sonar('ring', 2);
    }
    if (r.ok && id === 'cuento' && !f.ia) flotante(TXT.cuento, 1.0); // Cuento: confirmación de que la rival se distrajo
    if (r.ok && f.ia) { C.stats.ataques++; if (!H.get(id).basico) C.stats.poderes++; }
    // V18.2: desafío de las alianzas (usar el poder propio 2 veces)
    if (r.ok && !r.avisada && !f.ia && id === f.poder) C.stats.poderJ++;
    if (r.ok) pintar();
    else if (!f.ia && r.motivo === 'energia') pulso('en-j');
    if (r.ok && !f.ia) alUsar(id, r); // entreno guiado y pistas dominadas
    return r;
  }
  function lanzar(b) {
    const m = new THREE.Mesh(geoSemilla, matSemilla); m.position.set(b.x, b.y, b.z); m.castShadow = true; scene.add(m);
    C.balas.push(Object.assign({ m, t: 0 }, b));
  }
  function quitarBalas() { for (const b of C.balas) scene.remove(b.m); C.balas.length = 0; quitarOndas(); if (C.j) quitarEscudo(C.j, true); if (C.r) quitarEscudo(C.r, true); }

  // ---------- Entrada del jugador ----------
  // Juego en familia (5-nov): machacando Acción, el último golpe reiniciaba el duelo sin ver el resultado. Tras terminar,
  // «Otra vez» (Acción, el botón grande o el del panel) no responde durante FIN_PAUSA ms.
  const FIN_PAUSA = 1200, finListo = () => performance.now() - (C.finT || 0) >= FIN_PAUSA;
  const otraVezSiListo = () => (finListo() ? otraVez() : false);
  const modo = { activo: () => C.fase === 'lucha' || C.fase === 'cuenta' || C.fase === 'fin', accion: () => { if (C.fase === 'fin') otraVezSiListo(); else usar(C.j, 'golpe_ala'); },
    aviso: () => C.fase === 'fin' ? TXT.otra : controlesALaVista() ? '' : (TACTIL ? TXT.avisoTactil : TXT.aviso), get verbo() { return C.fase === 'fin' ? TXT.otra : TXT.ala; } };
  // du2 (8-nov): con los chips (o, en táctil, las etiquetas de Acción e Impulso) a la vista, el aviso «Ala: E · Semilla: F ·
  // Poder: G» de abajo repetía lo mismo: aviso vacío = interaccion.js no lo enseña. Sin chips ni etiquetas, vuelve el de siempre.
  function controlesALaVista() {
    if (!hud || hud.el.hidden) return false;
    if (!TACTIL) return !hud.q('bot').hidden;
    if (!hud.tags || hud.tags.hidden) return false;
    for (const s of hud.tags.children) if (!s.hidden) return true;
    return false;
  }
  let modo0 = null, sostener0 = null, sost = 0, enganchado = false;
  function sostenerDuelo(on) {
    if (on) { sost = performance.now(); return; }
    if (!sost) return;
    const ms = performance.now() - sost; sost = 0;
    usar(C.j, ms >= 450 ? C.j.poder : 'semilla');
  }
  // QA-173: la G del poder se queda en el duelo (fase de captura, antes que input.js): no llega a G.input.keys y la cámara
  // no se inclina (camara.js usa T/G para mirar arriba/abajo). Fuera del duelo este oyente no existe y G hace lo de siempre.
  // V18.2: la H (poder de alianza) igual, pero solo si hay alianza elegida; si no, H sigue libre.
  function tecla(e) {
    const k = (e.key || '').toLowerCase();
    if (enganchado && c2On() && k.length === 1) { // Combate 2.0: las 4 extremidades (U O J L de fábrica, cambiables en «Teclas»)
      const a = EXT_K.find(x => teclaExt(x) === k);
      if (a && !(e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.nodeName))) {
        e.stopImmediatePropagation(); e.preventDefault();
        if (G.pausa && G.pausa.activa && G.pausa.activa()) return;
        if (!e.repeat) usarExtJ(a);
        return;
      }
    }
    if (!enganchado || (k !== 'g' && k !== 'h') || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.nodeName))) return;
    if (k === 'h' && !(C.j && C.j.alianza)) return;
    e.stopImmediatePropagation();
    if (G.pausa && G.pausa.activa && G.pausa.activa()) return; // con la pausa abierta no se juega
    if (!e.repeat && C.fase === 'lucha') usar(C.j, k === 'g' ? C.j.poder : C.j.alianza);
  }
  // Pico y alas de la protagonista: se ponen justo antes de que el modelo se anime (envoltura de player3D.update mientras dura
  // el duelo; actores.js escribe mouth/wingMode cada cuadro y aquí solo se sobrescriben cuando el poder lo pide)
  function pose(ch, f, dt) {
    if (!ch || !f) return;
    if (f.picoT > 0) { ch.mouth = boca(f); ch.expression = 'fight'; } // con Combate 2.0 el pico lo pone C2 (ch.pico) después
    if (f.alasT > 0 && !ch.flying) ch.wingMode = 'land';
    const root = ch.root, w = f.finMareo > 0 ? Math.sin(performance.now() / 1000 * 13) * 0.24 * Math.min(1, f.finMareo) : 0;
    if (root) { root.rotation.z += w - (f.wob || 0); f.wob = w; }
    if (f.finMareo > 0 || f.mareo > 0) ch.expression = 'surprised';
  }
  // Pico abierto del todo mientras grita y se cierra en los últimos 0,15 s (character.js suaviza la apertura, como al hablar)
  const boca = f => Math.min(1, f.picoT / 0.15);
  let pl3d = null, upd0 = null;
  function envolverJugador() {
    const ch = G.actores && G.actores.player3D; if (!ch || pl3d) return;
    pl3d = ch; upd0 = ch.update;
    ch.update = function (dt) {
      let V2 = null;
      try { pose(this, C.j, dt); if (c2On() && C.j && C.fase !== 'nada') V2 = C2.antes(this, C.j, oJugadora(), dt); } catch (e) { /* pose */ }
      const res = upd0.call(this, V2 ? C2.dtVis(dt) : dt);
      if (V2) try { C2.huesos(this, V2); } catch (e) { /* pose */ }
      return res;
    };
  }
  // Combate 2.0: lo que la capa necesita de Vittata (su raíz la coloca actores.js cada cuadro, escala incluida)
  const oJ = { fin: '', vel: 0, escalaAbs: true };
  function oJugadora() { oJ.fin = C.fase === 'fin' ? (C.resultado === 'win' ? 'gana' : 'pierde') : ''; oJ.vel = Math.hypot(M.vx || 0, M.vz || 0); return oJ; }
  function soltarJugador() {
    if (!pl3d) return;
    if (C.j && C.j.wob && pl3d.root) { pl3d.root.rotation.z -= C.j.wob; C.j.wob = 0; }
    if (C.j) C2.soltar(pl3d, C.j, true);
    delete pl3d.update; if (pl3d.update !== upd0) pl3d.update = upd0; // la de la clase vuelve a mandar
    pl3d = upd0 = null;
  }
  // du3 (8-nov): a distancia de ala, con la cámara de siempre (7,5 m detrás y 4,2 m arriba) Vittata tapaba a la Campeona.
  // Mientras dura el duelo, la cámara se coloca algo más alta y más atrás (mira por encima de Vittata), y si la Campeona
  // queda cerca y justo detrás de Vittata, al dibujar la cámara orbita un poco alrededor de Vittata (hasta ORBITA rad) para
  // verla de lado: solo en el cuadro que se dibuja (camera.position vuelve después: el seguimiento de camara.js no cambia).
  // Al salir vuelve lo que había (si nadie lo cambió entretanto). Solo se tocan dist y height de G.camara.CAM y su draw.
  // Lo de antes se guarda en G (G.camDuelo0, con cuántos duelos la piden): una instancia de prueba del módulo (QA-163) con
  // un duelo ya abierto no toma la cámara del duelo por la de siempre.
  const CAM_DUELO = { dist: 8.6, height: 6.1 };
  let camPedida = false, draw0 = null, miDraw = null, orb = 0, orbLado = 1;
  const ORBITA = 0.2, /* Kelvin: los controles deben entenderse; un giro grande descuadra WASD con lo que se ve (≈11° máx.) */ camGuarda = new THREE.Vector3();
  function orbitar(dt) {
    const cam = R.camera, j = S.pos, rp = C.r && C.r.pos;
    let quiere = 0;
    if (cam && rp && C.fase === 'lucha') {
      const cx = j.x - cam.position.x, cz = j.z - cam.position.z, rx = rp.x - j.x, rz = rp.z - j.z, dr = Math.hypot(rx, rz);
      const a = Math.atan2(cx * rz - cz * rx, cx * rx + cz * rz); // ángulo de la rival vista desde la cámara (sin órbita)
      if (Math.abs(a) > 0.05) orbLado = a > 0 ? 1 : -1; // casi en línea: sigue hacia el lado de antes (sin bailar)
      const cerca = 1 - Math.min(1, Math.max(0, dr - 4.5) / 2.5); // de 4,5 a 7 m se apaga
      if (Math.abs(a) < Math.PI / 2) quiere = (a - orbLado * Math.max(Math.abs(a), ORBITA)) * cerca;
    }
    orb += (quiere - orb) * Math.min(1, (dt || 0.016) * 4);
    return orb;
  }
  // La envoltura guarda su draw de antes: si otra (duelo2.js) la envolvió a su vez y la devuelve más tarde, sigue sirviendo.
  const envolverDraw = orig => Object.assign(function (dt) {
    if (!camPedida) return orig.call(this, dt);
    const cam = R.camera, f = Math.abs(orbitar(dt)) > 0.002 && cam;
    if (f) {
      camGuarda.copy(cam.position);
      const dx = cam.position.x - S.pos.x, dz = cam.position.z - S.pos.z, c = Math.cos(orb), sn = Math.sin(orb);
      cam.position.x = S.pos.x + dx * c - dz * sn; cam.position.z = S.pos.z + dx * sn + dz * c;
    }
    try { return orig.call(this, dt); } finally { if (f) cam.position.copy(camGuarda); }
  }, { orig, duelo: true });
  function alejarCamara() {
    const K = G.camara && G.camara.CAM; if (!K || camPedida) return;
    camPedida = true;
    if (!draw0 && R && R.camera && typeof G.camara.draw === 'function') { const d = G.camara.draw; orb = 0;
      draw0 = d.duelo ? d.orig : d; miDraw = envolverDraw(draw0); G.camara.draw = miDraw; } // una envoltura vieja que se quedó: se quita
    if (G.camDuelo0) { G.camDuelo0.n++; return; }
    G.camDuelo0 = { dist: K.dist, height: K.height, n: 1 }; Object.assign(K, CAM_DUELO);
  }
  function devolverCamara() {
    const K = G.camara && G.camara.CAM, o = G.camDuelo0; if (!camPedida) return;
    camPedida = false;
    if (draw0) { if (G.camara.draw === miDraw) G.camara.draw = draw0; draw0 = miDraw = null; orb = 0; } if (!K || !o || --o.n > 0) return;
    for (const k in CAM_DUELO) if (K[k] === CAM_DUELO[k]) K[k] = o[k]; // si alguien lo cambió entretanto, se respeta
    G.camDuelo0 = null;
  }
  function enganchar() {
    if (enganchado) return; enganchado = true;
    modo0 = G.interaccion.modo; G.interaccion.modo = modo;
    if (G.dones) { sostener0 = G.dones.sostener; G.dones.sostener = sostenerDuelo; }
    addEventListener('keydown', tecla, true); if (G.input && G.input.keys) G.input.keys.delete('g'); envolverJugador(); alejarCamara();
    document.body.classList.add('v18-duelo-on');
  }
  function soltar() {
    if (!enganchado) return; enganchado = false;
    if (G.interaccion.modo === modo) G.interaccion.modo = modo0;
    if (G.dones && G.dones.sostener === sostenerDuelo) G.dones.sostener = sostener0;
    removeEventListener('keydown', tecla, true); sost = 0; soltarJugador(); devolverCamara();
    document.body.classList.remove('v18-duelo-on');
  }

  // ---------- HUD ----------
  let hud = null;
  function estilo() {
    if (document.getElementById('v18-duelo-css')) return;
    const st = document.createElement('style'); st.id = 'v18-duelo-css';
    st.textContent = '#v18-duelo{position:fixed;top:calc(env(safe-area-inset-top,0px) + 92px);left:0;right:0;margin-inline:auto;width:min(380px,calc(100vw - 32px));z-index:40;font-family:Fredoka,system-ui,sans-serif;color:#fff8ea;pointer-events:none;text-shadow:0 1px 2px #0008}' +
      '#v18-duelo .vd-fila{display:flex;gap:8px;justify-content:space-between}' +
      '#v18-duelo .vd-lado{flex:1;background:rgba(30,40,30,.72);border-radius:12px;padding:6px 10px;min-width:0}' +
      '#v18-duelo .vd-lado.r{text-align:right}#v18-duelo .vd-nom{font-weight:600;font-size:14px}#v18-duelo .vd-pod{font-size:12px;opacity:.85}' +
      'body.v18-duelo-on #quest,body.v18-duelo-on #inv{visibility:hidden}' +
      // QA-166/167: en el escritorio el HUD va debajo del aviso (#toast, arriba al centro); en el móvil el minimapa tapaba las
      // plumas de la rival y el panel de fin pisaba el botón Diario (columna derecha): se oculta el minimapa durante el duelo
      // (vuelve al salir) y el panel deja libre esa columna.
      '@media (max-width:760px){#v18-duelo{top:calc(env(safe-area-inset-top,0px) + 66px)}body.v18-duelo-on #minimapa{visibility:hidden}#v18-duelo .vd-fin{margin-right:52px}}' +
      '#v18-duelo .vd-pl{display:flex;gap:3px;margin:3px 0}#v18-duelo .r .vd-pl{justify-content:flex-end}' +
      '#v18-duelo .vd-pl i{width:12px;height:18px;border-radius:12px 0 12px 0;background:#ffd27a;display:block;transform:rotate(20deg);transition:opacity .2s}' +
      '#v18-duelo .r .vd-pl i{background:#7fd3ff}#v18-duelo .vd-pl i.fuera{opacity:.18}' +
      '#v18-duelo .vd-en{height:6px;border-radius:3px;background:#0006;overflow:hidden}#v18-duelo .vd-en b{display:block;height:100%;background:#8fe08a;width:100%}' +
      '#v18-duelo .vd-en.pulso{outline:2px solid #ff9a7a}#v18-duelo .vd-et{font-size:10px;opacity:.75;margin-top:2px;line-height:1.2}' +
      '#v18-duelo .vd-pl i{width:14px;height:20px}' +
      '#v18-duelo .vd-centro{text-align:center;font-size:44px;font-weight:700;min-height:0;margin-top:6px}' +
      '#v18-duelo .vd-bot{display:flex;gap:6px;justify-content:center;margin-top:6px;flex-wrap:wrap}' +
      '#v18-duelo button{pointer-events:auto;font:inherit;font-size:15px;font-weight:600;min-height:44px;padding:6px 14px;border-radius:22px;border:0;background:#fff3d6;color:#3b2a14;box-shadow:0 2px 6px #0005;cursor:pointer}' +
      '#v18-duelo button.cd{opacity:.5}#v18-duelo .vd-fin{text-align:center;background:rgba(30,40,30,.82);border-radius:14px;padding:10px;margin-top:8px}' +
      '#v18-duelo .vd-fin p{margin:0 0 8px;font-size:18px;font-weight:600}' +
      // Juego en familia (5-nov), táctil: panel + fila Ala/Semilla/Escudo ocupaban ~60 % del alto y el Escudo caía sobre el
      // Diario. En táctil ya están los botones grandes (Acción = ala, Impulso = semilla, mantener Impulso = poder): fuera la
      // fila repetida y el panel se compacta; el aviso (#toast) queda por encima del panel si coinciden.
      '#v18-duelo.tactil .vd-bot{display:none}#v18-duelo.tactil .vd-lado{padding:4px 8px}#v18-duelo.tactil .vd-et{display:none}' +
      '#v18-duelo.tactil .vd-en{margin-top:3px}#v18-duelo.tactil .vd-centro{font-size:32px;margin-top:2px}' +
      '#v18-duelo.tactil .vd-fin{padding:8px;margin-top:4px}#v18-duelo.tactil .vd-fin p{font-size:15px;margin-bottom:6px}' +
      'body.v18-duelo-on #toast{z-index:41}' +
      // V18.2: nivel y XP del jugador, botón de la alianza (≥ 56 px en táctil, dentro del panel: no tapa Diario ni botones grandes)
      '#v18-duelo .vd-nv{font-size:11px;opacity:.9;margin-top:1px}#v18-duelo .vd-xp{height:3px;border-radius:2px;background:#0006;overflow:hidden;margin:2px 0 1px}' +
      '#v18-duelo .vd-xp b{display:block;height:100%;background:#ffd27a;width:0}#v18-duelo button.vd-ali{display:block;width:100%;margin-top:5px;padding:4px 8px;font-size:14px;background:#ffe39a}' +
      '#v18-duelo button.vd-ali[hidden]{display:none}#v18-duelo.tactil button.vd-ali{min-height:56px;font-size:15px}' +
      '#v18-duelo .vd-apoyo{display:flex;align-items:center;gap:6px;justify-content:center;margin-top:4px;font-weight:600;font-size:14px}' +
      '#v18-duelo .vd-apoyo[hidden]{display:none}#v18-duelo .vd-apoyo img{width:40px;height:40px;border-radius:50%;background:#fff3;box-shadow:0 0 10px #9fe6ff}' +
      '#v18-duelo .vd-finxp{font-size:15px!important;color:#ffe39a}#v18-duelo .vd-finxp:empty{display:none}' +
      '#v18-duelo .vd-fintip{font-size:14px!important;opacity:.92;margin:.2em 0 .5em}#v18-duelo .vd-fintip b:empty{display:none}' +
      // Cómo se pelea (8-nov): chips de acción (icono + tecla + recarga), entreno guiado, pistas y etiquetas táctiles
      '#v18-duelo [data-icon="semilla"]{--icon:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M12 2c4 3 6 7 6 11a6 6 0 0 1-12 0c0-4 2-8 6-11z\'/%3E%3C/svg%3E")}' +
      '#v18-duelo button.vd-chip{position:relative;overflow:hidden;display:inline-flex;align-items:center;gap:6px;padding:6px 10px 6px 12px;--icon-size:20px;transition:box-shadow .15s,opacity .15s,transform .15s}' +
      '#v18-duelo .vd-chip kbd{font:700 14px/1 Fredoka,system-ui,sans-serif;min-width:24px;padding:4px 6px;border-radius:7px;background:#3b2a14;color:#fff3d6;box-shadow:0 2px 0 #0007;text-align:center}' +
      '#v18-duelo .vd-chip .vd-cdv{position:absolute;left:0;right:0;bottom:0;height:var(--cd,0%);background:rgba(40,30,20,.45);pointer-events:none}' +
      '#v18-duelo .vd-chip.listo{box-shadow:0 0 0 3px #8fe08a,0 0 14px #8fe08a99;transform:translateY(-1px)}#v18-duelo .vd-chip.sin{opacity:.55}#v18-duelo .vd-chip.cd{opacity:.8}' +
      '#v18-duelo .vd-chip[hidden]{display:none}#v18-duelo:not(.tactil) button.vd-ali{display:none}' +
      // Los chips van abajo, encima del aviso de Acción: así no tapan a la cotorra ni a la rival en el centro de la pantalla
      // El entreno, a la izquierda en el escritorio: el centro queda libre para ver a la Campeona y acercarse
      '#v18-duelo:not(.tactil) .vd-ent{position:fixed;left:16px;top:calc(env(safe-area-inset-top,0px) + 270px);width:min(300px,calc(50vw - 210px));min-width:220px;margin:0}' +
      '#v18-duelo:not(.tactil) .vd-bot{position:fixed;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 132px);margin:0;flex-wrap:nowrap;gap:8px}' +
      '#v18-duelo button.vd-como{display:flex;align-items:center;gap:5px;margin:6px 0 0 auto;min-height:36px;padding:4px 10px;font-size:13px;background:#ffe39a;--icon-size:16px}#v18-duelo.tactil button.vd-como{min-height:56px;font-size:14px}' +
      '#v18-duelo button.vd-como[hidden]{display:none!important}' +
      '#v18-duelo .vd-pista{margin:6px auto 0;width:max-content;max-width:100%;background:rgba(255,227,154,.95);color:#3b2a14;text-shadow:none;font-weight:600;font-size:16px;padding:6px 14px;border-radius:18px;box-shadow:0 2px 8px #0005;text-align:center;animation:vdPista .25s ease-out}' +
      '#v18-duelo .vd-pista[hidden]{display:none}#v18-duelo .vd-pista b:empty{display:none}@keyframes vdPista{from{transform:scale(.85);opacity:0}to{transform:none;opacity:1}}' +
      '#v18-duelo .vd-ent{margin-top:8px;background:rgba(255,248,234,.96);color:#3b2a14;text-shadow:none;border-radius:16px;padding:10px 12px;box-shadow:0 4px 14px #0006;text-align:center}' +
      '#v18-duelo .vd-ent[hidden]{display:none}#v18-duelo .vd-ent-cab{display:flex;align-items:center;justify-content:center;gap:8px;font-size:13px;font-weight:600;opacity:.8}' +
      '#v18-duelo .vd-ent-pp{display:flex;gap:4px}#v18-duelo .vd-ent-pp i{width:10px;height:10px;border-radius:50%;background:#3b2a1433}#v18-duelo .vd-ent-pp i.ya{background:#4caf50}#v18-duelo .vd-ent-pp i.ahora{background:#f0a020}' +
      '#v18-duelo .vd-ent-cuerpo{display:flex;align-items:center;gap:10px;justify-content:center;margin:8px 0}' +
      '#v18-duelo .vd-ent kbd{font:700 26px/1 Fredoka,system-ui,sans-serif;min-width:46px;padding:8px 10px;border-radius:10px;background:#3b2a14;color:#fff3d6;box-shadow:0 3px 0 #000a;animation:vdTecla 1s ease-in-out infinite}' +
      '#v18-duelo.tactil .vd-ent kbd{font-size:16px}@keyframes vdTecla{50%{transform:translateY(2px);box-shadow:0 1px 0 #000a}}' +
      '#v18-duelo .vd-ent-txt{font-size:17px;font-weight:600;text-align:left;line-height:1.25}#v18-duelo .vd-ent-txt b{color:#1f6f3a}' +
      '#v18-duelo .vd-ent button{min-height:40px;font-size:14px;background:#3b2a14;color:#fff3d6}#v18-duelo.tactil .vd-ent button{min-height:56px}' +
      '#v18-duelo-tags{position:fixed;inset:0;pointer-events:none;z-index:39}#v18-duelo-tags[hidden]{display:none}' +
      '#v18-duelo-tags span{position:absolute;transform:translate(-50%,-100%);background:#3b2a14;color:#fff3d6;font:700 13px/1.15 Fredoka,system-ui,sans-serif;padding:4px 8px;border-radius:10px;white-space:nowrap;text-align:center;box-shadow:0 2px 6px #0006}' +
      '#v18-duelo-tags span[hidden]{display:none}#v18-duelo-tags small{display:block;font-size:11px;font-weight:600;opacity:.85}';
    document.head.appendChild(st);
  }
  function montarHud() {
    if (hud) return hud;
    estilo();
    const el = document.createElement('div'); el.id = 'v18-duelo'; el.hidden = true; el.classList.toggle('tactil', TACTIL);
    const plumas = () => Array.from({ length: PLUMAS }, () => '<i></i>').join('');
    // Chip de acción: icono + nombre + tecla; .vd-cdv es la recarga (alto = lo que falta) y .listo lo ilumina
    const chip = (a, ico, n, k) => `<button class="vd-chip" data-a="${a}" data-icon="${ico}" type="button"${a === 'alianza' ? ' hidden' : ''}><span data-k="cn-${a}">${n}</span><kbd>${k}</kbd><i class="vd-cdv"></i></button>`;
    el.innerHTML = `<div class="vd-fila"><div class="vd-lado j"><div class="vd-nom">${TXT.tu}</div><div class="vd-pod" data-k="pj"></div><div class="vd-nv" data-k="nv" hidden><span data-k="nvN"></span> · <span data-k="nvE"></span></div><div class="vd-xp" data-k="xp" hidden><b></b></div><div class="vd-pl" data-k="plj">${plumas()}</div><div class="vd-et">${TXT.energia}</div><div class="vd-en" data-k="en-j"><b></b></div><button class="vd-ali" data-a="alianza" type="button" hidden></button></div>` +
      `<div class="vd-lado r"><div class="vd-nom">${TXT.rival}</div><div class="vd-pod" data-k="pr"></div><div class="vd-pl" data-k="plr">${plumas()}</div><div class="vd-et">${TXT.energia}</div><div class="vd-en" data-k="en-r"><b></b></div><button class="vd-como" data-a="como" data-k="como" type="button" data-icon="question">${TXT.como}</button></div></div>` +
      `<div class="vd-centro" data-k="centro"></div><div class="vd-apoyo" data-k="apoyo" hidden><img src="assets/retratos/v18/arausiaca.png" alt=""><span>${TXT.apoyo}</span></div>` +
      `<div class="vd-pista" data-k="pista" hidden><span data-k="pistaTxt"></span> <b data-k="pistaPod"></b></div>` +
      `<div class="vd-ent" data-k="ent" hidden><div class="vd-ent-cab"><span data-k="entPaso"></span><span class="vd-ent-pp" data-k="entPP"><i></i><i></i><i></i></span></div>` +
      `<div class="vd-ent-cuerpo"><kbd data-k="entK"></kbd><div class="vd-ent-txt"><span data-k="entTxt"></span> <b data-k="entPod"></b></div></div><button data-a="saltarEnt" type="button">${TXT.saltarEnt}</button></div>` +
      `<div class="vd-bot" data-k="bot">${chip('golpe_ala', 'wing', TXT.ala, 'E')}${chip('semilla', 'semilla', TXT.semilla, 'F')}${chip('poder', 'bolt', TXT.poder, 'G')}${chip('alianza', 'star', '', 'H')}</div>` +
      `<div class="vd-fin" data-k="fin" hidden><p class="vd-finxp" data-k="finXp"></p><p data-k="finTxt"></p><p class="vd-fintip" data-k="finTip"><span data-k="finTipTxt"></span> <b data-k="finTipPod"></b></p><button data-a="otra">${TXT.otra}</button> <button data-a="salir">${TXT.salir}</button></div>`;
    el.addEventListener('pointerdown', e => {
      const b = e.target.closest && e.target.closest('button[data-a]'); if (!b) return;
      e.preventDefault(); e.stopPropagation();
      const a = b.dataset.a;
      if (a === 'combos') abrirCombos(!cartaC); else if (a === 'cerrarCombos') abrirCombos(false); else if (a === 'como') iniciar({ entreno: true }); else if (a === 'saltarEnt') saltarEntreno(); else if (a === 'otra') otraVezSiListo(); else if (a === 'salir') { if (finListo()) salir(); } else if (a === 'alianza') { if (C.j && C.j.alianza) usar(C.j, C.j.alianza); } else if (C.j) usar(C.j, a === 'poder' ? C.j.poder : a);
    });
    const viejo = document.getElementById('v18-duelo'); if (viejo) viejo.remove(); // una instancia nueva del módulo (QA-163 en v18CombateTest) no deja dos #v18-duelo
    document.body.appendChild(el);
    // Táctil: etiquetas sobre los botones grandes que ya existen (Acción = Ala, Impulso = Semilla y, mantenido, el poder)
    const tg = document.createElement('div'); tg.id = 'v18-duelo-tags'; tg.hidden = true;
    tg.innerHTML = `<span data-t="b-act" hidden>${TXT.ala}</span><span data-t="b-dash" hidden>${TXT.semilla}<small>${TXT.tagPoder}</small></span>`;
    const tv = document.getElementById('v18-duelo-tags'); if (tv) tv.remove();
    document.body.appendChild(tg);
    hud = { el, tags: tg, q: k => el.querySelector('[data-k="' + k + '"]') };
    return hud;
  }
  function pulso(k) { if (!hud) return; const e = hud.q(k); e.classList.add('pulso'); setTimeout(() => e.classList.remove('pulso'), 300); }
  // Aviso del centro del HUD («¡Bloqueado!», «¡Interrumpida!»…). Frente A (5-nov): tras un golpe al escudo se quedaba
  // puesto; solo se borraba desde paso() y en fase de lucha o fin. Ahora también lo borra un reloj real y se limpia al
  // salir o reiniciar: nunca se queda fijo en pantalla.
  let centroT = 0, centroTO = 0;
  function flotante(t, s) {
    if (!hud) return;
    const el = hud.q('centro'); el.textContent = t; centroT = t ? (s || 0.8) : 0;
    clearTimeout(centroTO);
    if (t) centroTO = setTimeout(() => { if (hud && el.textContent === t && C.fase !== 'cuenta') { el.textContent = ''; centroT = 0; } }, (centroT + 0.5) * 1000);
  }
  function pintar() {
    if (!hud || !C.j) return;
    const pl = (k, f) => Array.from(hud.q(k).children).forEach((i, n) => { i.classList.toggle('fuera', n >= f.plumas); i.hidden = n >= (f.plumasMax || PLUMAS); });
    pl('plj', C.j); pl('plr', C.r);
    hud.q('en-j').firstChild.style.width = Math.round(100 * C.j.energia / C.j.energiaMax) + '%';
    hud.q('en-r').firstChild.style.width = Math.round(100 * C.r.energia / C.r.energiaMax) + '%';
    const texto = (k, t) => { const e = hud.q(k); if (e.dataset.t !== t) { e.dataset.t = t; e.textContent = t; } }; // una vez: el traductor no pelea
    texto('pj', (H.get(C.j.poder) || {}).nombre || ''); texto('pr', (H.get(C.r.poder) || {}).nombre || '');
    // V18.2: «Nv 12 · Eco Amplificado», barra de XP y botón de la alianza (solo con evolución)
    const L = C.j.nivel && G.v18evo && G.v18evo.lineaHud ? G.v18evo.lineaHud(C.j) : null;
    hud.q('nv').hidden = hud.q('xp').hidden = !L;
    if (L) { texto('nvN', L.nivel); texto('nvE', L.etapa); hud.q('xp').firstChild.style.width = Math.round(100 * L.frac) + '%'; }
    const ali = hud.q('ali') || hud.el.querySelector('.vd-ali'), aliH = C.j.alianza && H.get(C.j.alianza);
    ali.hidden = !aliH;
    if (aliH) { if (ali.dataset.nom !== aliH.nombre) { ali.dataset.nom = aliH.nombre; ali.textContent = aliH.nombre; } ali.classList.toggle('cd', !H.listo(C.j, C.j.alianza).ok); }
    texto('cn-poder', (H.get(C.j.poder) || {}).nombre || TXT.poder);
    const chA = hud.el.querySelector('.vd-chip[data-a="alianza"]'); chA.hidden = !aliH; if (aliH) texto('cn-alianza', aliH.nombre);
    hud.q('como').hidden = !!ent || C.fase === 'nada';
    pintarChips(); ponerTags(); if (hud.ext || c2On()) pintarExt();
  }
  // Recarga visual de los chips: cada cuadro, pero solo escribe en el DOM cuando cambia (pasos de 5 %)
  function pintarChips() {
    if (!hud || !C.j || TACTIL) return;
    for (const b of hud.q('bot').children) {
      const a = b.dataset.a, id = a === 'poder' ? C.j.poder : a === 'alianza' ? C.j.alianza : a;
      if (!id || b.hidden) continue;
      const h = H.ver(C.j, H.get(id)) || {}, cd = C.j.cd[id] || 0, l = H.listo(C.j, id);
      const pct = Math.round(Math.max(0, Math.min(1, cd / (h.cooldown || 1))) * 20) * 5;
      const st = C.fase === 'lucha' && l.ok ? 'listo' : cd > 0 ? 'cd' : 'sin';
      if (b._pct !== pct) { b._pct = pct; b.style.setProperty('--cd', pct + '%'); }
      if (b._st !== st) { b._st = st; b.classList.toggle('listo', st === 'listo'); b.classList.toggle('cd', st === 'cd'); b.classList.toggle('sin', st === 'sin'); }
    }
  }
  function ponerTags() {
    if (!hud || !hud.tags) return;
    const on = TACTIL && !hud.el.hidden && C.fase !== 'fin' && C.fase !== 'nada'; hud.tags.hidden = !on; if (!on) return;
    for (const s of hud.tags.children) {
      const b = document.getElementById(s.dataset.t), r = b && b.getBoundingClientRect(), ver = !!(r && r.width > 0 && b.offsetParent);
      // QA-221: en el grid #acts el botón Acción vive justo debajo de Impulso (misma columna,
      // ~10 px de hueco): la etiqueta colgada sobre su borde se montaba sobre el texto del botón
      // de arriba. Además es redundante mientras el propio botón lleve el mismo texto
      // (interaccion.js le pone el verbo del modo —en el duelo, «Ala»). Se oculta en ese caso;
      // la de Impulso→Semilla sigue, nunca fuera de pantalla (texto grande a11y).
      const redundante = ver && s.dataset.t === 'b-act' && b.textContent.trim() === TXT.ala;
      s.hidden = !ver || redundante;
      if (ver && !redundante) {
        const w = s.offsetWidth, h = s.offsetHeight, vw = window.innerWidth;
        const L = Math.max(4, Math.min(vw - 4 - w, Math.round(r.left + r.width / 2 - w / 2)));
        s.style.transform = 'none';
        s.style.left = L + 'px';
        s.style.top = Math.round(r.top - 6 - h) + 'px';
      }
    }
  }

  // ---------- Cómo se pelea: entreno guiado de 3 pasos y pistas breves ----------
  // El entreno va en fase 'lucha' (cuentan las recargas y vuelan las semillas) pero paso() no llama a pasoIA: la Campeona
  // se queda quieta. Nadie pierde plumas (se reponen cada cuadro) y no hay fin de duelo. Al acabar o al saltarlo empieza el
  // duelo de verdad con su cuenta atrás.
  const ENT_PASOS = [
    { id: 'golpe_ala', k: 'E', kt: TXT.accion, txt: TXT.e1, txtT: TXT.t1 },
    { id: 'semilla', k: 'F', kt: TXT.impulso, txt: TXT.e2, txtT: TXT.t2 },
    { id: 'poder', k: 'G', kt: TXT.impulso, txt: TXT.e3, txtT: TXT.t3 }];
  // Combate 2.0: dos pasos más, dos combos (¡Abanicazo! y ¡Patita Sabrosa!); sin la bandera, los 3 de siempre
  const ENT_COMBO = [
    { id: 'combo:abanicazo', k: () => teclaExt('alaIzq').toUpperCase() + ' → ' + teclaExt('alaDer').toUpperCase(), kt: 'Ala izq. → Ala der.', txt: TXT.e4, txtT: TXT.t4, nom: '¡Abanicazo!' },
    { id: 'combo:patita', k: () => teclaExt('pataIzq').toUpperCase() + ' → ' + teclaExt('pataDer').toUpperCase(), kt: 'Pata izq. → Pata der.', txt: TXT.e5, txtT: TXT.t5, nom: '¡Patita Sabrosa!' }];
  const pasosEnt = () => (c2On() ? ENT_PASOS.concat(ENT_COMBO) : ENT_PASOS);
  let ent = null; // { paso, fin } mientras dura el entreno
  const PISTA = { cerca: 2, lejos: 4, poder: 8, defensa: 16 }; // bits de G.v18.mundo('pistas_duelo'): pista ya dominada
  const pista = { t: 0, vis: 0, plj: 0, golpeado: false, dom: { cerca: 0, lejos: 0, poder: 0 } };
  const ALA_R = () => ((H.get('golpe_ala') || {}).alcance || 2.4) + 0.3;
  const mundoN = k => { try { return Number(G.v18 && G.v18.mundo && G.v18.mundo(k)) || 0; } catch (e) { return 0; } };
  const ponerMundo = (k, v) => { try { if (G.v18 && G.v18.cambiarMundo) G.v18.cambiarMundo(k, v); } catch (e) { /* sin progreso V18 */ } };
  const entrenoVisto = () => mundoN('entreno_duelo') > 0;
  function dominar(bit) { const m = mundoN('pistas_duelo'); if (!(m & bit)) ponerMundo('pistas_duelo', m | bit); }
  const nombrePoder = () => (H.get(C.j && C.j.poder) || {}).nombre || TXT.poder;
  function pintarEntreno() {
    if (!hud) return;
    const box = hud.q('ent'); box.hidden = !ent;
    if (!ent) return;
    const L = pasosEnt(), i = Math.min(ent.paso, L.length - 1), P = L[i];
    const pon = (k, t) => { const e = hud.q(k); if (e.dataset.t !== t) { e.dataset.t = t; e.textContent = t; } };
    pon('entPaso', TXT.entPaso(i + 1, L.length)); pon('entK', TACTIL ? P.kt : typeof P.k === 'function' ? P.k() : P.k); pon('entTxt', TACTIL ? P.txtT : P.txt); pon('entPod', P.id === 'poder' ? nombrePoder() : P.nom || '');
    const pp = hud.q('entPP'); while (pp.children.length < L.length) pp.appendChild(document.createElement('i')); while (pp.children.length > L.length) pp.lastChild.remove();
    Array.from(pp.children).forEach((d, n) => { d.classList.toggle('ya', n < ent.paso); d.classList.toggle('ahora', n === ent.paso); });
  }
  function avanzarEntreno() {
    ent.paso++; sonar('ring', 1); flotante(TXT.bien, 0.9);
    if (ent.paso >= pasosEnt().length) { ent.fin = 1.3; ponerMundo('entreno_duelo', 1); if (G.ui && G.ui.toast) G.ui.toast(TXT.entFin, 2600); }
    C.j.cd = {}; C.j.energia = C.j.energiaMax; C.j.mareo = 0; C.j.inv = 0;
    pintarEntreno(); pintar();
  }
  function saltarEntreno() { if (!ent) return false; ponerMundo('entreno_duelo', 1); ent = null; return iniciar({ sinEntreno: true }); }
  function pasoEntreno(dt) {
    C.r.plumas = C.r.plumasMax; C.j.plumas = C.j.plumasMax; C.j.energia = C.j.energiaMax;
    C.r.mov.t = 1; C.r.mov.x = C.r.mov.z = 0; // quieta (un «movimiento» de velocidad 0: no se acerca; los empujones sí cuentan) y sin perder nada
    if (ent.fin > 0) { ent.fin -= dt; if (ent.fin <= 0) { ent = null; iniciar({ sinEntreno: true }); } }
  }
  function alUsar(id, r) {
    const d = Math.hypot(S.pos.x - C.r.pos.x, S.pos.z - C.r.pos.z);
    if (id === 'golpe_ala' && r.acierto) pista.dom.cerca++;
    if (id === 'semilla' && d > 4) pista.dom.lejos++;
    if (id === C.j.poder) pista.dom.poder++;
    for (const k in pista.dom) if (pista.dom[k] >= 2) dominar(PISTA[k]); // dos veces bien hecho: esa pista ya no sale
    if (!ent || ent.fin > 0) return;
    const P = pasosEnt()[ent.paso];
    if (!P || id !== (P.id === 'poder' ? C.j.poder : P.id)) return;
    if (P.id === 'golpe_ala' && !r.acierto) { flotante(TXT.masCerca, 1); return; }
    avanzarEntreno();
  }
  function mostrarPista(t, pod) {
    if (!hud) return;
    const e = hud.q('pista'); hud.q('pistaTxt').textContent = t; hud.q('pistaPod').textContent = pod || '';
    e.hidden = false; pista.vis = 2.4;
  }
  function ocultarPista() { pista.vis = 0; if (hud) hud.q('pista').hidden = true; }
  // Una pista como mucho cada 4,5 s; solo las que aún no se dominan. La del primer golpe recibido, una vez por partida.
  function pasoPistas(dt) {
    if (pista.vis > 0) { pista.vis -= dt; if (pista.vis <= 0) ocultarPista(); }
    const m = mundoN('pistas_duelo');
    if (C.j.plumas < pista.plj && !pista.golpeado) {
      pista.golpeado = true;
      if (!(m & PISTA.defensa)) {
        dominar(PISTA.defensa);
        const def = DEFENSAS.has(C.j.poder);
        mostrarPista(def ? (TACTIL ? TXT.dEscudoT : TXT.dEscudo) : TXT.dGolpe, def ? nombrePoder() : ''); pista.vis = 3.2; pista.t = 4.5;
      }
    }
    pista.plj = C.j.plumas;
    if ((pista.t -= dt) > 0) return;
    const d = Math.hypot(S.pos.x - C.r.pos.x, S.pos.z - C.r.pos.z);
    let t = null;
    if (!(m & PISTA.poder) && C.j.energia >= C.j.energiaMax - 0.5 && H.listo(C.j, C.j.poder).ok) t = TACTIL ? TXT.pPoderT : TXT.pPoder;
    else if (!(m & PISTA.cerca) && d <= ALA_R() && H.listo(C.j, 'golpe_ala').ok) t = TACTIL ? TXT.pCercaT : TXT.pCerca;
    else if (!(m & PISTA.lejos) && d > 5.5 && H.listo(C.j, 'semilla').ok) t = TACTIL ? TXT.pLejosT : TXT.pLejos;
    if (t) { mostrarPista(t, ''); pista.t = 4.5; } else pista.t = 0.3;
  }

  // ---------- Ciclo del duelo ----------
  function colocar() {
    const yJ = ALTURA({ x: sitio.x - 5, z: sitio.z });
    S.pos.x = sitio.x - 5; S.pos.z = sitio.z; S.pos.y = yJ + 0.05; S.vy = 0; M.vx = M.vz = 0; M.dashT = 0;
    if (M.flying && F.endFlight) { try { F.endFlight(); } catch (e) { /* ya en el suelo */ } }
    S.facing = { x: 1, z: 0 };
    rivalPos.x = sitio.x + 5; rivalPos.z = sitio.z; rivalPos.y = ALTURA(rivalPos);
    if (G.camara) { G.camara.yaw = Math.atan2(-1, 0); if (G.camara.place) try { G.camara.place(true); } catch (e) { /* cámara */ } }
  }
  function iniciar(o) {
    o = o || {};
    crearRival();
    semilla = o.semilla || 7; espForzada = o.especie || null;
    quitarBalas(); C.trampas.length = 0; if (C.j && C.j.wob && pl3d && pl3d.root) { pl3d.root.rotation.z -= C.j.wob; C.j.wob = 0; }
    C.j = nuevoJugador(o); const ch = C.ch; C.r = nuevoRival(o.dificultad || dificultadDe(C.j)); C.ch = ch; C.tLucha = 0;
    C.j.ultPoder = null; C.r.ultPoder = null; // Imitación: duelo nuevo, nada que copiar todavía
    if (C.ch && C.chEsp !== C.r.especie) { try { C.ch.applyLook({ species: C.r.especie, accessories: { eyes: { id: 'gafas', color: '#7fd3ff' } } }); C.chEsp = C.r.especie; } catch (e) { /* piel */ } }
    C.timers.length = 0; C.resultado = null; C.premio = false; C.sinExtIA = !!o.sinExtIA; cartaC = false; comboVis = 0; if (hud && hud.ext) hud.ext.nom.hidden = true;
    C.stats = nuevasStats();
    const conEntreno = !!o.entreno || (!o.sinCuenta && !o.sinEntreno && !espForzada && !entrenoVisto()); // el primer duelo empieza con el entreno
    ent = null; pista.t = 2.5; pista.plj = C.j.plumas; pista.golpeado = false;
    // du2: con partida nueva desde el menú el duelo empezaba antes de que el sitio definitivo (QA-174) se aplicara y se peleaba
    // entre los árboles del sitio provisional; si está pendiente, se aplica antes de colocar a las dos
    if (recolocar && C.fase === 'nada' && !retirada && enCap1() && !(G.v18duelo2 && G.v18duelo2.estado().fase !== 'nada')) moverSitio();
    colocar();
    montarHud(); hud.el.hidden = false; hud.q('fin').hidden = true; hud.q('bot').hidden = false; hud.q('finXp').textContent = ''; hud.q('apoyo').hidden = true; apoyoT = 0;
    enganchar(); ocultarPista();
    if (conEntreno) { C.fase = 'lucha'; ent = { paso: 0, fin: 0 }; flotante(''); }
    else if (o.sinCuenta) { C.fase = 'lucha'; flotante(''); }
    else { C.fase = 'cuenta'; C.cuenta = 3; flotante('3', 1); if (G.ui && G.ui.toast) G.ui.toast(TXT.bienvenida, 2600); }
    pintarEntreno(); pintar();
    return true;
  }
  function terminar(res) {
    if (C.fase !== 'lucha') return;
    C.fase = 'fin'; C.resultado = res; C.finT = performance.now(); quitarBalas(); C.timers.length = 0;
    const gano = res === 'win';
    // Antes del evento: la XP de esta victoria no cambia la etapa con la que se ganó
    if (gano) sumarEtapa();
    emitir({ tipo: res, de: gano ? 'jugador' : 'rival', a: gano ? 'rival' : 'jugador', valor: gano ? C.j.plumas : C.r.plumas,
      // V18.2: para la XP
      especie: C.j.especie, dura: Math.round((C.tLucha || 0) * 10) / 10, interrupciones: C.stats.intJ, poderJ: C.stats.poderJ, quitadas: (C.r.plumasMax || PLUMAS) - C.r.plumas });
    let txt;
    // La que se queda sin plumas se marea un rato, con estrellitas, y se sacude (nadie se hace daño)
    const perdedora = gano ? C.r : C.j; perdedora.finMareo = 2.2; perdedora.mareo = Math.max(perdedora.mareo, 2.2);
    if (gano) {
      const nueva = !!(G.v18 && G.v18.otorgar && G.v18.otorgar('combate_1', 'victoria_duelo', 1)); // marca idempotente: esta victoria ya pagó
      if (nueva) pagar();
      // el aviso dice para qué sirven: el puente (frente B), si todavía está roto; la guía al puente la pone ciclo.js
      const puenteListo = !!(G.v18 && G.v18.mundo && G.v18.mundo('puente_villa') === 'reparado');
      txt = nueva ? (puenteListo ? TXT.ganaGuarda : TXT.gana) : TXT.ganaOtra; C.premio = nueva;
      sonar('unlock'); fx('gold', C.r.pos.x, C.r.pos.y + 1.2, C.r.pos.z);
    } else { txt = TXT.pierde; C.premio = false; sonar('wrong'); }
    if (G.ui && G.ui.toast) G.ui.toast(txt, 3200);
    if (hud) { hud.q('finTxt').textContent = txt; hud.q('fin').querySelector('[data-a="salir"]').textContent = alMenu() ? TXT.menu : TXT.salir; hud.q('fin').hidden = false; hud.q('bot').hidden = true; flotante(gano ? TXT.ganaste : TXT.perdiste, 1.6);
      try { hud.q('finXp').innerHTML = G.v18evo && G.v18evo.htmlFin ? G.v18evo.htmlFin() : ''; } catch (e) { /* sin evolución */ }
      const c = consejo(gano, C.stats, (C.r.plumasMax || PLUMAS) - C.r.plumas); hud.q('finTipTxt').textContent = c.txt; hud.q('finTipPod').textContent = c.pod; }
  }
  // V18.1 §9: por qué ganaste o qué probar tras perder (cada texto es su nodo; el nombre del poder va aparte y se traduce solo)
  function consejo(gano, st, quitadas) {
    const usoPoder = !!(st && st.poderJ > 0);
    if (gano) return usoPoder ? { id: 'porGanaPoder', txt: TXT.porGanaPoder, pod: nombrePoder() } : { id: 'porGana', txt: TXT.porGana, pod: '' };
    if (!usoPoder) return { id: 'tPoder', txt: TACTIL ? TXT.tPoderT : TXT.tPoder, pod: nombrePoder() };
    if ((quitadas || 0) <= 1) return { id: 'tCerca', txt: TXT.tCerca, pod: '' };
    return { id: 'tEsquiva', txt: TXT.tEsquiva, pod: '' };
  }
  // Duelos ganados por etapa (mundo.duelos_ganados_e0..e3: Aprendiz, Despertar, Guardián, Maestro), con el nivel de la cotorra
  // con la que se gana. Son números: evolucion.js no los cuenta como hitos (solo mira 'recogida' y duelos_ganados).
  function etapaGanadora() {
    let n = Number(C.j.nivel) || 0;
    try { if (!n && G.v18evo && G.v18evo.info && C.j.especie) n = Number(G.v18evo.info(C.j.especie).nivel) || 0; } catch (e) { /* sin evolución */ }
    n = n || 1;
    try { if (G.v18evo && G.v18evo.etapaIdx) return G.v18evo.etapaIdx(n); } catch (e) { /* sin evolución */ }
    return n >= 30 ? 3 : n >= 20 ? 2 : n >= 10 ? 1 : 0;
  }
  function sumarEtapa() {
    const V = G.v18; if (!V || !V.mundo || !V.cambiarMundo) return null;
    const k = 'duelos_ganados_e' + etapaGanadora();
    V.cambiarMundo(k, (Number(V.mundo(k)) || 0) + 1);
    return k;
  }
  function pagar() {
    if (!S.inv) S.inv = {};
    for (const k in PREMIO) S.inv[k] = (S.inv[k] || 0) + PREMIO[k];
    try { if (G.objetos && G.objetos.renderInv) G.objetos.renderInv(); } catch (e) { /* HUD */ }
    try { if (G.guardado && G.guardado.save) G.guardado.save(true); else if (G.guardado && G.guardado.autosave) G.guardado.autosave(); } catch (e) { /* guardado */ } // QA-162: al momento
  }
  function otraVez() { return iniciar({ sinEntreno: true }); }
  function salir(motivo) {
    if (C.fase === 'nada') return false;
    C.fase = 'nada'; quitarBalas(); C.timers.length = 0; soltar(); ent = null; cartaC = false; comboVis = 0;
    if (hud) { flotante(''); hud.el.hidden = true; ocultarPista(); pintarEntreno(); ponerTags(); if (hud.ext) { hud.ext.carta.hidden = true; hud.ext.nom.hidden = true; pintarExt(); } }
    rivalPos.x = sitio.x + 4; rivalPos.z = sitio.z; rivalPos.y = ALTURA(rivalPos);
    if (C.r) { C.r.mareo = 0; C.r.finMareo = 0; C.r.lift.t = C.r.lift.dura = 0; }
    if (motivo && G.ui && G.ui.toast) G.ui.toast(motivo, 2600);
    return true;
  }

  // ---------- IA de la rival ----------
  function pasoIA(dt) {
    const r = C.r, j = C.j, D = r.dif || CLASICA, pp = D.poder;
    if (r.mareo > 0) r.tocada = true;
    // Mareada, deslumbrada (Abanico de colores) o distraída (Cuento): no hace nada, y el ataque que anunciaba se pierde
    if (r.mareo > 0 || r.deslumbrada > 0 || r.distraida > 0) { r.prep = ''; if (r.ext) r.ext.plan.length = 0; return; }
    // Combate 2.0: siguiendo un combo que empezó (cada entrada a su ritmo; el motor la pone en cola si aún no puede)
    if (r.ext && r.ext.plan.length) { const p = r.ext.plan[0]; if ((p.t -= dt) <= 0) { r.ext.plan.shift(); EXM.usar(r, p.k); } return; }
    const d = H.dirA(r, j), dist = d.d;
    r.golpeT -= dt; r.tiroT -= dt; r.esquivaT -= dt; r.poderT -= dt; r.pensar -= dt; r.apartaT -= dt;
    // Telegrafía (Kelvin 8-nov): el golpe de ala y la semilla se anuncian (se agacha y abre las alas, o apunta, con «!»
    // encima) y salen al acabar el aviso. Mientras avisa está comprometida: no esquiva ni cambia de idea.
    if (r.prep) {
      r.vioGrito = j.picoT > 0 ? 1 : 0;
      if ((r.prepT -= dt) > 0) return;
      const id = r.prep; r.prep = ''; r.avisoUsado = r.prepDur;
      if (id.indexOf('ext:') === 0) { // Combate 2.0: una extremidad; si entra, a veces sigue con un combo (según su etapa)
        const k = id.slice(4), u = EXM.usar(r, k); r.avisoUsado = 0;
        if (u.ok) r.golpeAnim = 0.3;
        if (u.ok && u.acierto && azar() < (EXT_IA[D.id] || EXT_IA.clasica).combo) planCombo(r, k);
        return;
      }
      const u = usar(r, id); r.avisoUsado = 0;
      if (id === 'golpe_ala' && u.ok) r.golpeAnim = 0.3;
      return;
    }
    // Reflejo al recuperarse de un golpe: se aparta de un salto en vez de quedarse a tiro (rompe las cadenas de golpes)
    if (r.tocada) { r.tocada = false; if (D.rehace && azar() < D.rehace) { saltoAtras(r, d, 0.3); return; } }
    // Reflejo ante el poder de la jugadora: lo ve venir (abre el pico) y se escuda si puede
    const grita = j.picoT > 0 && !(r.vioGrito > 0);
    r.vioGrito = j.picoT > 0 ? 1 : 0;
    if (grita && D.leeGrito && dist < 12 && r.poder === 'escudo_plumas' && r.escudo <= 0 && H.listo(r, 'escudo_plumas').ok && azar() < D.leeGrito) { usar(r, 'escudo_plumas'); return; }
    // Defensa: una semilla del jugador que viene cerca → escudo (si es arausiaca y lo tiene) o un quiebro de lado
    const viene = C.balas.find(b => b.de === j && Math.hypot(b.m.position.x - r.pos.x, b.m.position.z - r.pos.z) < D.ve);
    if (viene && r.esquivaT <= 0 && !(r.marcada > 0)) {
      r.esquivaT = D.calma;
      if (r.poder === 'escudo_plumas' && r.escudo <= 0 && H.listo(r, 'escudo_plumas').ok && azar() < D.escudo) { usar(r, 'escudo_plumas'); return; }
      if (azar() < D.esquiva) { const q = azar() < 0.5 ? -1 : 1; r.mov.x = -d.z * q * 9; r.mov.z = d.x * q * 9; r.mov.t = 0.28; saltito(r, 0.28); C.stats.esquivas++; return; }
    }
    if (r.pensar > 0) return;
    r.pensar = D.pensar;
    // Poder: el escudo cuando la tienes encima; el grito cuando estás delante y a tiro (sale hacia ti, que es adonde mira)
    if (r.poderT <= 0 && H.listo(r, r.poder).ok) {
      if (r.poder === 'escudo_plumas' && r.escudo <= 0 && dist < 2.8 && azar() < pp) { r.poderT = 3; usar(r, 'escudo_plumas'); return; }
      if (r.poder === 'grito_yunque' && dist > 2 && dist < 6 && azar() < pp) { r.poderT = 4; usar(r, 'grito_yunque'); return; }
      if (r.poder === 'abanico_colores' && dist < 7 && azar() < pp) { r.poderT = 4; usar(r, 'abanico_colores'); return; }
      if (r.poder === 'semilla_rio' && dist > 4 && dist < 14 && azar() < pp) { r.poderT = 4; usar(r, 'semilla_rio'); return; }
      if (r.poder === 'plumas_aliso' && dist > 3 && dist < 14 && azar() < pp) { r.poderT = 4; usar(r, 'plumas_aliso'); return; }
      if (r.poder === 'semilla_pina' && dist > 3 && dist < 12 && azar() < pp) { r.poderT = 4; usar(r, 'semilla_pina'); return; }
      if (r.poder === 'remolino' && dist < 3.2 && azar() < pp) { r.poderT = 4; usar(r, 'remolino'); return; }
      if (r.poder === 'imitacion' && j.ultPoder && dist > 2 && azar() < pp) { r.poderT = 4; usar(r, 'imitacion'); return; }
      if (r.poder === 'vista_cumbre' && dist > 2.2 && dist < 3.6 && azar() < pp) { r.poderT = 4; usar(r, 'vista_cumbre'); return; } // la ventana donde su ala larga alcanza y el de la jugadora no
    }
    // Reflejo cuerpo a cuerpo: con el ala en espera y la jugadora encima, sale de su alcance
    if (D.aparta && dist < 2.6 && r.golpeT > 0 && r.apartaT <= 0 && azar() < D.aparta) { r.apartaT = APARTA_ESPERA; saltoAtras(r, d, 0.24); return; }
    const aviso = D.aviso || AVISO_ALA, apunta = D.apunta || AVISO_SEMILLA;
    if (dist < (D.cerca || 2.3) && r.golpeT <= 0) {
      // Combate 2.0: a veces, en vez del aletazo de siempre, un ala o una pata (también anunciada, algo más corta y sin aguantar golpes)
      const XI = c2On() && !C.sinExtIA ? (EXT_IA[D.id] || EXT_IA.clasica) : null;
      if (XI && dist < 2.2 && azar() < XI.usa) {
        const pata = dist < 1.6 && azar() < 0.5, izq = azar() < 0.5, k = (pata ? 'pata' : 'ala') + (izq ? 'Izq' : 'Der');
        r.golpeT = Math.max(D.ala, XI.aviso + 0.6); preparar(r, 'ext:' + k, XI.aviso); return;
      }
      r.golpeT = Math.max(D.ala, aviso + 0.6); preparar(r, 'golpe_ala', aviso); return;
    }
    if (dist > (D.tiroMin || 6) && dist < 16 && r.tiroT <= 0 && r.energia > 40) { r.tiroT = D.tiro + apunta; preparar(r, 'semilla', apunta); return; }
  }
  // Combate 2.0: la Campeona sigue con un combo que empiece por la extremidad que acaba de entrar (lo elige con azar())
  function planCombo(r, k) {
    const ops = []; for (const c of COMBOS) if (c.sec) for (const q of c.sec) if (q[0] === k) ops.push(q);
    if (!ops.length) return;
    const q = ops[Math.min(ops.length - 1, Math.floor(azar() * ops.length))];
    r.ext.plan = q.slice(1).map(x => ({ k: x, t: 0.24 }));
  }
  function preparar(r, id, t) {
    r.prep = id; r.prepT = r.prepDur = t; C.stats.avisosIA = (C.stats.avisosIA || 0) + 1;
    if (id === 'golpe_ala') fx('gold', r.pos.x, r.pos.y + 1.9, r.pos.z); // brillo sobre la cabeza al empezar el aviso
  }
  // Quiebro o salto atrás: un saltito con aleteo un poco más largo que el empujón (aterriza al acabar)
  function saltito(r, t) { r.saltoT = 0; r.saltoDur = t + 0.08; }
  function saltoAtras(r, d, t) {
    const q = azar() < 0.5 ? -1 : 1;
    r.mov.x = (-d.x * 0.8 - d.z * q * 0.6) * 9; r.mov.z = (-d.z * 0.8 + d.x * q * 0.6) * 9; r.mov.t = t; saltito(r, t); C.stats.esquivas++;
  }
  // Movimiento (Kelvin 8-nov): la IA decide qué quiere (acercarse, rodear a distancia de ala, plantarse para atacar) y el
  // cuerpo lo sigue con aceleración y frenado limitados; el rodeo cambia de sentido cada pocos segundos (o al llegar al borde)
  // y el giro del cuerpo tiene velocidad angular máxima. Los quiebros y los empujones siguen siendo rápidos, pero con saltito.
  const QUIERE = 2.0, LEJOS = 2.8, RODEO = 1.8, ACEL = 10, FRENO = 14, GIRO = 7, GIRO_ATAQUE = 10;
  function moverRival(dt) {
    const r = C.r, j = C.j, d = H.dirA(r, j), V = r.v, D = r.dif || CLASICA;
    let vx = 0, vz = 0;
    if (r.kb.t > 0) { r.kb.t -= dt; vx += r.kb.x; vz += r.kb.z; r.kb.x *= 0.88; r.kb.z *= 0.88; }
    if (r.golpeAnim > 0) r.golpeAnim -= dt;
    if (r.saltoDur > 0) { r.saltoT += dt; if (r.saltoT >= r.saltoDur) r.saltoDur = 0; }
    if (r.mov.t > 0) { r.mov.t -= dt; vx += r.mov.x; vz += r.mov.z; V.x = r.mov.x * 0.25; V.z = r.mov.z * 0.25; } // sale del quiebro con algo de inercia
    else {
      let qx = 0, qz = 0; // velocidad que quiere
      const libre = r.mareo <= 0 && C.fase === 'lucha' && !(r.remolino > 0) && !(r.distraida > 0);
      const selva = r.avisoSelva && C.timers.length ? r.avisoSelva : ''; // Ojo de selva: el ataque anunciado también la compromete
      if (libre && (r.prep === 'golpe_ala' || selva === 'golpe_ala') && d.d > 1.5) { qx = d.x * 1.6; qz = d.z * 1.6; } // agachada, se arrima despacio para el golpe
      else if (libre && !r.prep && !selva) {
        const ve = D.vel * (r.pesada > 0 ? 0.45 : 1); // Plumas de manglar: pisar una pluma la deja más lenta
        const ox = r.pos.x - sitio.x, oz = r.pos.z - sitio.z, od = Math.hypot(ox, oz);
        let tx = -d.z * r.lado, tz = d.x * r.lado;
        r.ladoT -= dt;
        // Cambia el sentido del rodeo de vez en cuando, o si el borde de la explanada le corta el paso
        if (r.ladoT <= 0 || (od > ARENA_R - 2 && (tx * ox + tz * oz) > 0 && r.ladoT < 2.2)) { r.lado = -r.lado; r.ladoT = 2.6 + azar() * 2.4; tx = -tx; tz = -tz; }
        const quiere = r.golpeT > 0.25 ? LEJOS : QUIERE; // con el ala en espera, rodea justo fuera de tu alcance; lista, se arrima
        const rad = Math.max(-1, Math.min(1, (d.d - quiere) / 0.8)), cerca = 1 - Math.min(1, Math.max(0, d.d - quiere) / 3);
        const k = rad * ve * (rad < 0 ? 0.6 : 1), o = RODEO * cerca * (r.pesada > 0 ? 0.45 : 1);
        qx = d.x * k + tx * o; qz = d.z * k + tz * o;
      }
      const ax = qx - V.x, az = qz - V.z, a = Math.hypot(ax, az), paso = (qx * qx + qz * qz < V.x * V.x + V.z * V.z ? FRENO : ACEL) * dt;
      if (a > paso) { V.x += ax / a * paso; V.z += az / a * paso; } else { V.x = qx; V.z = qz; }
      vx += V.x; vz += V.z;
    }
    const x0 = r.pos.x, z0 = r.pos.z;
    r.pos.x += vx * dt; r.pos.z += vz * dt;
    // Dentro de la explanada
    const ox = r.pos.x - sitio.x, oz = r.pos.z - sitio.z, od = Math.hypot(ox, oz);
    if (od > ARENA_R - 0.5) { r.pos.x = sitio.x + ox / od * (ARENA_R - 0.5); r.pos.z = sitio.z + oz / od * (ARENA_R - 0.5); }
    const movida = Math.hypot(r.pos.x - x0, r.pos.z - z0);
    C.stats.movida += movida;
    let lift = 0;
    if (r.lift.dura > 0) { r.lift.t += dt; const k = r.lift.t / r.lift.dura; if (k >= 1) r.lift.dura = 0; else lift = r.lift.alto * Math.sin(Math.PI * k); }
    r.pos.y = ALTURA(r.pos) + lift;
    // Rumbo: mira a la jugadora (de cerca, al atacar y al rodear); de lejos y corriendo, hacia donde va. Giro limitado.
    if (C.fase === 'lucha' || C.fase === 'cuenta') {
      const sp = Math.hypot(V.x, V.z);
      const obj = C.fase === 'lucha' && !r.prep && r.mov.t <= 0 && d.d > 4.5 && sp > 1.5 ? Math.atan2(V.x, V.z) : Math.atan2(d.x, d.z);
      const g = (r.prep ? GIRO_ATAQUE : GIRO) * dt;
      r.yaw += Math.max(-g, Math.min(g, giroPi(obj - r.yaw)));
    }
    return dt > 0 ? movida / dt : 0;
  }
  const giroPi = a => Math.atan2(Math.sin(a), Math.cos(a));
  // «!» sobre la cabeza mientras anuncia un ataque: naranja y grande antes del ala, amarillo y más pequeño antes de la semilla
  let marcaAviso = null;
  function avisoSprite() {
    if (marcaAviso) return marcaAviso;
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const g = cv.getContext('2d');
    g.fillStyle = '#ffffff'; g.strokeStyle = 'rgba(40,24,8,0.9)'; g.lineWidth = 14;
    g.beginPath(); g.arc(128, 128, 104, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#2a1a08'; g.beginPath(); g.moveTo(108, 52); g.lineTo(148, 52); g.lineTo(138, 152); g.lineTo(118, 152); g.closePath(); g.fill();
    g.beginPath(); g.arc(128, 188, 17, 0, Math.PI * 2); g.fill();
    const t = new THREE.CanvasTexture(cv);
    marcaAviso = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false }));
    marcaAviso.renderOrder = 20; marcaAviso.visible = false; marcaAviso.name = 'v18_aviso'; marcaAviso.frustumCulled = false;
    scene.add(marcaAviso); C.marcaAviso = marcaAviso;
    return marcaAviso;
  }
  const mirarA = new THREE.Vector3();
  // ---------- Vida (Kelvin 9-nov: «la otra cotorra tiene poca animación») ----------
  // Capa procedural encima de character.js, solo con lo que ya trae el rig (huesos, clip Celebrate, wingMode, expresiones; el
  // modelo y el rig no se tocan): respira y mira a la jugadora en espera, aletea al moverse, carga el golpe (alas atrás, pecho
  // atrás, cola arriba y un temblor al final del aviso), da el aletazo hacia delante, retrocede al recibir un golpe, se
  // bambolea mareada, celebra al ganar y se queda cabizbaja al perder. Cada estado tiene un peso que entra y sale suave y
  // cada salida tiene una velocidad máxima (VIDA_VEL): sin saltos ni temblores. Solo se ve: no cambia nada del juego.
  // Modo Escuela: sin los extras de espera y de andar (respirar, mirar curiosa, aleteos al andar); las reacciones quedan.
  // También la usa el Jugador 2 del duelo de 2 (duelo2.js, con G.v18combate.vida).
  const VIDA_EST = ['espera', 'mueve', 'esquiva', 'carga', 'apunta', 'ataque', 'golpe', 'mareo', 'gana', 'pierde'];
  const VIDA_SAL = ['pecho', 'pechoZ', 'cabX', 'cabY', 'cabZ', 'alas', 'alasX', 'cola', 'pico', 'alto', 'atras'];
  const VIDA_VEL = 9, VIDA_VEL_M = 2.5, VIDA_GOLPE = 0.42, VIDA_EXTRA = { espera: 1, mueve: 1 };
  // o: { prep, prepK (0..1 del aviso), ataque, salto, vel, fin ('gana' | 'pierde' | '') }
  function vida(ch, f, o, dt) {
    const V = f.anima || (f.anima = { estado: '', t: 0, finT: 0, golpeT: 0, plumas0: f.plumas, kb0: 0, w: {}, s: {}, maxPaso: 0, maxPasoM: 0, celebra: 0, vistos: {} });
    const esc = !!(G.renderer && G.renderer.calidad && G.renderer.calidad.escuela);
    V.t += dt;
    // Golpe recibido: pierde una pluma o le llega un empujón nuevo (no cuenta el de sus propios saltos)
    if (f.plumas < V.plumas0 || (f.kb && f.kb.t > 0 && !(V.kb0 > 0) && Math.hypot(f.kb.x, f.kb.z) > 2)) V.golpeT = VIDA_GOLPE;
    V.plumas0 = f.plumas; V.kb0 = f.kb ? f.kb.t : 0;
    if (V.golpeT > 0) V.golpeT = Math.max(0, V.golpeT - dt);
    const fin = o.fin || '';
    if (fin) V.finT += dt; else V.finT = 0;
    const est = V.golpeT > 0 ? 'golpe' : f.mareo > 0 ? 'mareo' : fin ? fin : o.prep === 'golpe_ala' ? 'carga' : o.prep === 'semilla' ? 'apunta'
      : o.ataque ? 'ataque' : o.salto ? 'esquiva' : o.vel > 0.4 ? 'mueve' : 'espera';
    if (est !== V.estado) { V.estado = est; V.vistos[est] = (V.vistos[est] || 0) + 1; }
    // Al ganar: el clip Celebrate del modelo, una vez por victoria (luego vuelve solo a Idle)
    if (fin === 'gana' && !V.celebra) { V.celebra = 1; try { ch.play('Celebrate', true); } catch (e) { /* sin clip */ } }
    if (!fin) V.celebra = 0;
    const W = V.w, kw = 1 - Math.exp(-dt * 10);
    for (const s of VIDA_EST) {
      const on = s === est && !(esc && VIDA_EXTRA[s]) ? 1 : 0;
      W[s] = s === 'golpe' ? on : (W[s] || 0) + (on - (W[s] || 0)) * kw; // el golpe entra de golpe: su curva ya empieza en 0
    }
    const T = V.t, q = {}; for (const k of VIDA_SAL) q[k] = 0;
    const add = (w, o2) => { if (w < 0.002) return; for (const k in o2) q[k] += o2[k] * w; };
    const b = Math.sin(T * 2.6);
    add(W.espera, { pecho: 0.035 * b, alas: 0.03 * (0.5 + 0.5 * b), cola: 0.05 * Math.sin(T * 2.6 + 1), cabZ: 0.12 * Math.sin(T * 0.7), pechoZ: 0.035 * Math.sin(T * 0.9) });
    add(W.mueve, { alas: 0.12 * Math.max(0, Math.sin(T * 8)), cola: 0.08 * Math.sin(T * 8) });
    add(W.esquiva, { alas: 0.35, cola: 0.3, cabX: -0.1 });
    { const k = Math.min(1, Math.max(0, o.prepK || 0)), tiembla = k > 0.6 ? Math.sin(T * 40) * 0.03 * (k - 0.6) / 0.4 : 0;
      add(W.carga, { alasX: 0.4 * k, alas: 0.15 * k, pecho: -0.1 * k, cabX: 0.12, cola: 0.4 * k, pechoZ: tiembla, pico: 0.06 }); }
    add(W.apunta, { cabZ: 0.18, cabX: -0.06, pico: 0.05 });
    add(W.ataque, { alasX: -0.55, pecho: 0.18, pico: 0.16, cola: -0.15 });
    { const p = 1 - V.golpeT / VIDA_GOLPE, env = V.golpeT > 0 ? (p < 0.18 ? p / 0.18 : (1 - p) / 0.82) : 0;
      add(W.golpe, { pecho: -0.32 * env, cabX: -0.3 * env, alas: 0.5 * env, cola: 0.4 * env, pico: 0.2 * env, atras: 0.16 * env, alto: 0.05 * env }); }
    add(W.mareo, { cabY: 0.25 * Math.sin(T * 5), cabZ: 0.2 * Math.cos(T * 5), alas: 0.3 + 0.08 * Math.sin(T * 7), pecho: 0.08, pico: 0.1 });
    { const tg = V.finT, salta = tg < 1.8 ? Math.abs(Math.sin(Math.PI * tg / 0.6)) * (1 - tg / 2.2) : 0;
      add(W.gana, { alto: 0.2 * salta, alas: 0.25 + (tg < 1.8 ? 0.35 * Math.max(0, Math.sin(T * 16)) : 0.1 * Math.max(0, Math.sin(T * 3))), pecho: -0.12, cabX: -0.15, cola: 0.25 + 0.1 * Math.sin(T * 6), pico: 0.12 * Math.max(0, Math.sin(T * 4)) }); }
    add(W.pierde, { pecho: 0.22 + 0.04 * Math.sin(T * 1.6), cabX: 0.35, cabZ: 0.18, alasX: 0.18, cola: -0.3 });
    // Velocidad máxima por salida (rad/s; alto y atras en m/s): lo que pida un estado nuevo llega en unos cuadros, sin saltos
    const S2 = V.s;
    for (const k of VIDA_SAL) {
      const m = k === 'alto' || k === 'atras', lim = (m ? VIDA_VEL_M : VIDA_VEL) * dt, a = S2[k] || 0, d = Math.max(-lim, Math.min(lim, q[k] - a));
      S2[k] = a + d;
      if (dt > 0) { const v = Math.abs(d) / dt; if (m) V.maxPasoM = Math.max(V.maxPasoM, v); else V.maxPaso = Math.max(V.maxPaso, v); }
    }
    // Lo que va antes de update: expresión, alas y un desplazamiento del cuerpo (atrás al recibir, arriba en los saltitos)
    if (est === 'golpe') ch.expression = 'surprised';
    else if (est === 'gana') ch.expression = 'happy';
    else if (est === 'pierde') ch.expression = 'sad';
    if (est === 'gana' && V.finT < 1.8 && !ch.airborne) ch.wingMode = 'flap';
    else if (est === 'pierde' || est === 'gana') ch.wingMode = 'idle';
    const root = ch.root, yaw = root.rotation.y;
    root.position.x -= Math.sin(yaw) * S2.atras; root.position.z -= Math.cos(yaw) * S2.atras; root.position.y += S2.alto;
    return V;
  }
  // Después de update (los giros con ch.rot se deshacen solos al empezar el cuadro siguiente). Solo huesos del pecho para
  // arriba y la cola: el IK de patas ya está hecho y no se mueve.
  function vidaHuesos(ch, V) {
    const B = ch.bones, s = V && V.s; if (!B || !s) return;
    const ps = (ch.headSign && ch.headSign.pitch) || 1;
    if (B.espalda2) { if (s.pecho) ch.rot(B.espalda2, 'x', s.pecho); if (s.pechoZ) ch.rot(B.espalda2, 'z', s.pechoZ); }
    if (B.cabeza) { if (s.cabX) ch.rot(B.cabeza, 'x', s.cabX * ps); if (s.cabY) ch.rot(B.cabeza, 'y', s.cabY); if (s.cabZ) ch.rot(B.cabeza, 'z', s.cabZ); }
    if (B.armL1 && B.armL1001) {
      if (s.alas) { ch.rot(B.armL1, 'z', s.alas); ch.rot(B.armL1001, 'z', -s.alas); }
      if (s.alasX) { ch.rot(B.armL1, 'x', s.alasX); ch.rot(B.armL1001, 'x', s.alasX); }
    }
    if (B.espalda1001 && s.cola) ch.rot(B.espalda1001, 'x', s.cola);
    if (B.pico && s.pico) ch.rot(B.pico, 'x', -s.pico);
  }
  // ---------- Andar (Kelvin 9-nov: «no me gusta el movimiento del bot de la cotorra del duelo») ----------
  // Cómo se mueve el cuerpo que se ve; la posición de juego (r.pos), la IA, sus tiempos y sus golpes no cambian.
  // - El cuerpo sigue a la posición de juego con un muelle crítico que copia su velocidad (sin retraso en marcha): los
  //   arranques, frenazos y quiebros no saltan de un cuadro a otro.
  // - Pasos de verdad: de frente anda con el clip Walk del modelo y la cadencia que pide su velocidad (como Vittata); el
  //   cuerpo se gira hacia donde va (giro con velocidad y aceleración limitadas) y la cabeza sigue mirando a la rival.
  // - De lado o hacia atrás (rodeando de cerca, apartándose, antes de girarse) no patina: va a saltitos de cotorra, con las
  //   patas juntas y quietas en el suelo y el cuerpo avanzando solo en el aire, con un golpe de alas en cada uno.
  // - Girando en el sitio da pasitos; al caer de un quiebro amortigua con las rodillas y la cola; se inclina al arrancar y
  //   al frenar y se ladea en las curvas. Con el pie, IK contra el suelo real (en Modo Escuela, sin IK: solo cuentas).
  // También la usa el Jugador 2 del duelo de 2 (duelo2.js, con G.v18combate.vida.andar).
  const AND = { w: 25, acel: 90, paso: 0.8, giro: 7, giroAtaque: 10, giroAcel: 60, quieta: 0.35, aire: 0.15, suelo: 0.1, alto: 0.06, corre: 8.5,
    lado: [1.4, 1.75], atras: [1.95, 1.6], girada: [0.4, 0.6], asienta: 0.3, pasoGiro: 1.4 };
  const MOV_PIE = 1.0, MOV_TIRON = 100; // umbrales de las pruebas (m/s de un pie apoyado de media; m/s² del cuerpo que se ve)
  const suave01 = u => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
  // o: { x, z (posición de juego), yaw (rumbo pedido) o mira ({x, z} de la rival) + encara (de frente a ella), aire (en el
  //      aire por el juego: quiebro, empujón, saltito de sorpresa), ataque (giro rápido) }
  function andar(f, o, dt) {
    let A = f.andar;
    if (!A || Math.hypot(o.x - A.px, o.z - A.pz) > 3) { // primera vez o teletransporte: sin muelle ni saltos
      A = f.andar = { px: o.x, pz: o.z, vx: 0, vz: 0, sx: o.x, sz: o.z, svx: 0, svz: 0, yaw: o.yaw != null ? o.yaw : (A ? A.yaw : f.yaw || 0), w: 0,
        modo: 'quieta', modoT: 0, lado: false, atras: false, girada: false, hop: { aire: false, t: 0, ax: o.x, az: o.z, x: o.x, z: o.z, h: 0 },
        aire: false, aireT: 0, asienta: 0, lean: 0, bank: 0, sp: 0, alas: 0, out: { x: o.x, z: o.z, alto: 0, yaw: 0, speed: 0, gait: 0, airborne: false, clip: 'Idle', lean: 0, bank: 0, settle: 0, alas: 0, modo: 'quieta' } };
    }
    const d = Math.max(dt, 1e-4);
    // 1. Velocidad de juego, suavizada (lo que el muelle copia)
    const x0 = A.px, z0 = A.pz, gx = (o.x - x0) / d, gz = (o.z - z0) / d; A.px = o.x; A.pz = o.z;
    const kv = 1 - Math.exp(-dt / 0.05); A.vx += (gx - A.vx) * kv; A.vz += (gz - A.vz) * kv;
    // 2. Muelle crítico (subpasos de 1/100 s, con la posición de juego interpolada dentro del cuadro: estable con cualquier dt)
    const n = Math.min(12, Math.ceil(dt / 0.01)), h = dt / n, W = AND.w, sx0 = A.sx, sz0 = A.sz;
    for (let i = 0; i < n; i++) {
      const u = (i + 1) / n, tx = x0 + (o.x - x0) * u, tz = z0 + (o.z - z0) * u;
      let ax = W * W * (tx - A.sx) + 2 * W * (A.vx - A.svx), az = W * W * (tz - A.sz) + 2 * W * (A.vz - A.svz);
      const am = Math.hypot(ax, az); if (am > AND.acel) { ax *= AND.acel / am; az *= AND.acel / am; } // sin tirones: aceleración máxima
      A.svx += ax * h; A.svz += az * h;
      A.sx += A.svx * h; A.sz += A.svz * h;
    }
    const s = Math.hypot(A.svx, A.svz), viaje = Math.atan2(A.svx, A.svz);
    // 3. Hacia dónde quiere mirar el cuerpo
    const aRival = o.mira ? Math.atan2(o.mira.x - A.sx, o.mira.z - A.sz) : null, dRival = o.mira ? Math.hypot(o.mira.x - A.sx, o.mira.z - A.sz) : 99;
    if (o.aire && !A.aire) A.aireT = 0;
    if (!o.aire && A.aire) A.asienta = AND.asienta; // aterriza de un quiebro o un empujón: amortigua
    A.aire = !!o.aire; if (A.aire) A.aireT += dt;
    let quiere = A.yaw;
    if (o.yaw != null) quiere = o.yaw;
    else if (aRival != null && (o.encara || A.aire)) quiere = aRival;
    else if (s > AND.quieta) {
      const off = aRival == null ? 0 : Math.abs(giroPi(viaje - aRival));
      A.atras = aRival != null && off > (A.atras ? AND.atras[1] : AND.atras[0]); // apartándose: de cara a la rival, a saltitos
      A.lado = aRival != null && dRival < 3.4 && s < (A.lado ? AND.lado[1] : AND.lado[0]); // rodeando de cerca y despacio: de lado
      quiere = A.atras || A.lado ? aRival : viaje;
    } else if (aRival != null) quiere = aRival;
    // 4. Giro con velocidad y aceleración limitadas (en el aire de un quiebro gira menos: no hace trompos)
    const gmax = (o.ataque ? AND.giroAtaque : AND.giro) * (A.aire ? 0.6 : 1), wq = Math.max(-gmax, Math.min(gmax, giroPi(quiere - A.yaw) * 9));
    A.w += Math.max(-AND.giroAcel * dt, Math.min(AND.giroAcel * dt, wq - A.w)); A.yaw = giroPi(A.yaw + A.w * dt);
    // 5. Paso: andar de frente, saltitos de lado/atrás, correr (J2), quieta (pasitos si gira)
    const dif = s > 0.05 ? Math.abs(giroPi(viaje - A.yaw)) : 0;
    A.girada = dif > (A.girada ? AND.girada[0] : AND.girada[1]); // el cuerpo aún no mira hacia donde va
    let modo = A.aire ? 'aire' : s > AND.corre ? 'corre' : s > AND.quieta ? (A.girada ? 'saltos' : 'anda') : 'quieta';
    // Cambiar de paso cuesta un poco (sin parpadeos entre andar y saltar)
    A.modoT += dt;
    if (modo !== A.modo && (A.modoT > 0.25 || modo === 'aire' || A.modo === 'aire')) { A.modo = modo; A.modoT = 0; } else modo = A.modo;
    // 6. Saltitos: el cuerpo que se ve se queda donde cayó mientras toca el suelo y avanza solo en el aire
    const H = A.hop, salta = modo === 'saltos' || (modo === 'quieta' && Math.hypot(H.x - A.sx, H.z - A.sz) > 0.05 && !H.aire);
    if (H.aire) {
      H.t += dt; const u = Math.min(1, H.t / AND.aire), e = suave01(u);
      const bx = A.sx + A.svx * (AND.aire - Math.min(H.t, AND.aire) + AND.suelo * 0.5), bz = A.sz + A.svz * (AND.aire - Math.min(H.t, AND.aire) + AND.suelo * 0.5);
      H.x = H.ax + (bx - H.ax) * e; H.z = H.az + (bz - H.az) * e; H.h = H.alto * Math.sin(Math.PI * u);
      if (u >= 1) { H.aire = false; H.t = 0; H.h = 0; }
    } else if (modo === 'aire' || modo === 'anda' || modo === 'corre') {
      // Fuera de los saltitos el cuerpo vuelve a la posición del muelle (de pie no: allí se da un último saltito)
      const k = Math.exp(-dt / 0.1); H.x = A.sx + (H.x - sx0) * k; H.z = A.sz + (H.z - sz0) * k; H.t = 0; // el desfase se apaga
    } else {
      H.t += dt;
      if (salta && H.t >= AND.suelo) { H.aire = true; H.t = 0; H.ax = H.x; H.az = H.z; H.alto = AND.alto + 0.03 * Math.min(1, s / 2); }
    }
    // Lejos de su sitio (cambió de golpe la velocidad): sin saltos raros, vuelve con el muelle
    { const ox = H.x - A.sx, oz = H.z - A.sz, od = Math.hypot(ox, oz); if (od > 0.45) { H.x = A.sx + ox / od * 0.45; H.z = A.sz + oz / od * 0.45; } }
    // 7. Postura: se inclina al acelerar y se echa atrás al frenar; se ladea en las curvas
    const sp0 = A.sp; A.sp = s; const acel = (s - sp0) / d;
    const leanQ = A.aire ? 0 : Math.max(-0.08, Math.min(0.16, s * 0.02 + acel * 0.012)), bankQ = Math.max(-0.1, Math.min(0.1, -A.w * Math.min(1, s / 3) * 0.04));
    const kp = 1 - Math.exp(-dt * 8); A.lean += (leanQ - A.lean) * kp; A.bank += (bankQ - A.bank) * kp;
    if (A.asienta > 0) A.asienta = Math.max(0, A.asienta - dt);
    A.alas = H.aire ? Math.sin(Math.PI * Math.min(1, H.t / AND.aire)) : Math.max(0, A.alas - dt * 6);
    const O = A.out, enSaltos = H.aire || modo === 'saltos';
    O.x = H.x; O.z = H.z; O.alto = H.h; O.yaw = A.yaw; O.lean = A.lean; O.bank = A.bank; O.modo = modo;
    // Los saltitos son de unos centímetros: las patas no se recogen (si se recogieran y volvieran a estirar con el pie ya en
    // el suelo, el pie patinaría); solo el aire de verdad del juego (quiebro, empujón) las recoge
    O.airborne = modo === 'aire';
    O.gait = modo === 'corre' ? 2 : modo === 'anda' ? 1 : modo === 'quieta' && !enSaltos && Math.abs(A.w) > AND.pasoGiro ? 1 : 0;
    // Cadencia: la del paso de character.js (zancada 1,25 m) escalada por AND.paso, medida para que el pie apoyado no patine
    // con las patas de la cotorra a esta escala; girando en el sitio, pasitos lentos
    O.speed = O.gait === 1 && modo === 'quieta' ? 0.6 : O.gait === 1 ? s * AND.paso : s;
    O.clip = O.gait === 1 ? 'Walk' : 'Idle';
    O.settle = A.asienta / AND.asienta; O.alas = A.alas;
    return O;
  }
  // Aplica lo de andar() a un personaje (antes de update) y cambia de clip solo cuando hace falta
  function andarAplicar(ch, O, f, conClip) {
    if (conClip && f.clipAnda !== O.clip) { try { if (ch.play(O.clip)) f.clipAnda = O.clip; } catch (e) { /* sin clip */ } }
    ch.speed = O.speed; ch.gait = O.gait; ch.landSettle = O.settle > 0 ? O.settle : 0;
  }
  // Después de update: el golpe de alas de cada saltito (como vidaHuesos, se deshace solo en el cuadro siguiente)
  function andarHuesos(ch, O) {
    const B = ch.bones; if (!B || !O || !(O.alas > 0.01) || !B.armL1 || !B.armL1001) return;
    ch.rot(B.armL1, 'z', 0.35 * O.alas); ch.rot(B.armL1001, 'z', -0.35 * O.alas);
  }
  // ---------- Combate 2.0 (Kelvin 10-nov: «las cotorras en los duelos parecen zombis») · para todos desde el 10-nov (?combate2=0 lo apaga) ----------
  // Capa visual nueva para la Campeona, Vittata (jugadora) y el Jugador 2 (duelo2.js), con su propia máquina de estados:
  // espera viva (3 variaciones), anticipación, ataque, impacto, defensa, esquiva, mareo, recuperación, victoria y derrota
  // caricaturesca. Cada estado es una curva de poses clave (anticipa → golpe → seguimiento → asienta) y manda sobre sus
  // huesos con un peso por grupo (pecho, cabeza, alas, cola): quita esa parte de lo procedural de debajo (aleteos de
  // character.js, cabeceo del paso) en vez de sumarse a medias. Entre estados hay fundido; encima, muelles de 2º orden
  // (cola, cabeza, alas) dan el seguimiento. Estirar y aplastar moderado en la escala de la raíz. Pico, abanico de plumas y
  // muelle de la cola con la API de character.js (ch.pico, ch.alas, ch.colaImpulso); sin ella, el hueso del pico a mano.
  // Golpes: pausa visual (hit-stop) de 50–85 ms solo de la animación, sacudida pequeña de cámara (no con «Reducir
  // movimiento») y partículas de fx_poderes.js. SOLO SE VE: no toca posiciones de juego, tiempos, daño ni decisiones de la
  // IA, no usa azar() y la acción de la jugadora sale en el mismo cuadro (la pose de golpe coincide con el efecto).
  // Sin la bandera todo sigue con vida()/vidaHuesos() de siempre. Modo Escuela / calidad baja: muelles a medio ritmo y
  // menos partículas. Prueba: dentro de AV.v18CombateTest («C2: …»); coste en G.v18combate.vida.c2.perf().
  // 10-nov (Kelvin: «no me sigas escondiendo las cosas… ponme todo en el main»): encendido para todos; ?combate2=0 lo apaga
  // (solo para depurar o comparar). G.combate2 = true / false lo fuerza (pruebas).
  const C2_URL = !/[?&]combate2=0\b/.test(location.search);
  const c2On = () => (G.combate2 != null ? !!G.combate2 : C2_URL);
  const C2 = (() => {
    // Extremidades (10-nov, Kelvin: «mover ala izquierda, ala derecha, pierna izquierda, pierna derecha»): piernaL/R gira la
    // cadera (−X adelanta el muslo), rodL/R la rodilla (−X la dobla), pies abre las dos patas (Z, plantada más ancha) y agacha
    // baja el peso con la pose «agachada» de character.js (0..1; se suma a la que ya traiga).
    const K = ['pecho', 'pechoZ', 'pechoY', 'cabX', 'cabY', 'cabZ', 'alaL', 'alaR', 'alaXL', 'alaXR', 'cola', 'colaZ', 'pico', 'abreL', 'abreR', 'sx', 'sy', 'alto', 'adel',
      'piernaL', 'piernaR', 'rodL', 'rodR', 'pies', 'agacha'];
    const N = K.length, I = {}; K.forEach((k, i) => { I[k] = i; });
    const ANG = K.filter(k => !/^(pico|abreL|abreR|sx|sy|alto|adel|agacha)$/.test(k)).map(k => I[k]); // canales en radianes (prueba de saltos)
    const pose = o => { const p = new Float32Array(N); for (const k in o) p[I[k]] = o[k]; return p; };
    // Espejo izquierda ↔ derecha (los aletazos alternan de ala: combos con variación)
    const PAR = [['alaL', 'alaR'], ['alaXL', 'alaXR'], ['abreL', 'abreR'], ['piernaL', 'piernaR'], ['rodL', 'rodR']].map(([a, b]) => [I[a], I[b]]), NEG = ['pechoZ', 'pechoY', 'cabY', 'cabZ', 'colaZ'].map(k => I[k]);
    const espejo = p => { for (const [a, b] of PAR) { const x = p[a]; p[a] = p[b]; p[b] = x; } for (const i of NEG) p[i] = -p[i]; return p; };
    // Curva de poses clave: [t, pose, llegada] ('sale' = rápida al principio, para golpes; 'entra'; por defecto suave)
    const EASE = { sale: x => 1 - (1 - x) * (1 - x) * (1 - x), entra: x => x * x * x, suave: x => x * x * (3 - 2 * x) };
    const curva = (L, imp, dur, extra) => ({ L: L.map(k => [k[0], pose(k[1]), EASE[k[2] || 'suave']]), imp, dur, extra });
    function evalua(c, u, out) {
      const L = c.L; if (u <= L[0][0]) { out.set(L[0][1]); return out; }
      for (let i = 1; i < L.length; i++) if (u <= L[i][0]) {
        const a = L[i - 1], b = L[i], x = b[2]((u - a[0]) / Math.max(1e-4, b[0] - a[0]));
        for (let j = 0; j < N; j++) out[j] = a[1][j] + (b[1][j] - a[1][j]) * x;
        return out;
      }
      out.set(L[L.length - 1][1]); return out;
    }
    // ---- Familias de poder: una base de 4 fases (anticipa → ejecuta/impacto → seguimiento → asienta) con pose propia ----
    // imp: segundo de la pose de impacto. La acción sale en el mismo cuadro que la tecla: la anticipación de la jugadora es
    // de 1–2 cuadros (la de la Campeona es su telegrafía, el estado «anticipa»); si el golpe conecta antes, salta al impacto.
    const FAM = {
      // Golpe de ala: ala atrás y cuerpo torcido → barrido adelante (impacto) → sigue de largo → asienta. Un ala, alterna.
      ala: curva([[0, { alaL: 0.55, alaXL: 0.55, pechoY: 0.28, pecho: -0.1, sy: -0.05, sx: 0.03 }],
        [0.045, { alaL: 0.4, alaXL: -0.85, pechoY: -0.32, pecho: 0.22, cabX: 0.12, pico: 0.65, sy: 0.07, sx: -0.035, adel: 0.12, abreL: 1, cola: -0.1 }, 'sale'],
        [0.17, { alaL: 0.18, alaXL: -1.0, pechoY: -0.4, pecho: 0.26, cabX: 0.06, pico: 0.3, sy: 0.02, adel: 0.09, abreL: 0.6, cola: 0.3 }],
        [0.44, {}]], 0.045, 0.44),
      // PICO · tiro (semillas): cabeza atrás → picotazo adelante con el pico abierto → vuelve
      tiro: curva([[0, { cabX: -0.28, pecho: -0.1, sy: -0.03, pico: 0.15 }],
        [0.05, { cabX: 0.38, pecho: 0.16, pico: 0.95, adel: 0.06, sy: 0.045, sx: -0.02, cola: 0.22, alaL: 0.32, alaR: 0.32, abreL: 0.55, abreR: 0.55 }, 'sale'],
        [0.17, { cabX: 0.2, pico: 0.4, pecho: 0.08, cola: 0.1, alaL: 0.18, alaR: 0.18, abreL: 0.3, abreR: 0.3 }], [0.4, {}]], 0.05, 0.4),
      // PICO · grito (la onda tarda ≥ 0,15 s en llegar: la pose de lanzar va antes del golpe): se echa atrás → lanza la cabeza con el pico abierto del todo y las alas abiertas en abanico (impacto,
      // con la onda) → aguanta con tres empujones al ritmo de los «whoom» del sonido (0,2 / 0,36 / 0,52 s; audio.js) → recupera
      grito: curva([[0, { pecho: -0.3, cabX: -0.5, alaL: 0.15, alaR: 0.15, sy: -0.07, sx: 0.045, pico: 0.35, cola: -0.12 }],
        [0.07, { pecho: -0.32, cabX: -0.55, alaL: 0.2, alaR: 0.2, sy: -0.08, sx: 0.05, pico: 0.4, cola: -0.14 }],
        [0.13, { pecho: 0.3, cabX: 0.12, alaL: 0.95, alaR: 0.95, alaXL: 0.25, alaXR: 0.25, abreL: 1, abreR: 1, pico: 1, sy: 0.075, sx: -0.04, adel: 0.12, cola: 0.45 }, 'sale'],
        [0.62, { pecho: 0.25, cabX: 0.06, alaL: 0.85, alaR: 0.85, alaXL: 0.2, alaXR: 0.2, abreL: 0.9, abreR: 0.9, pico: 0.9, sy: 0.05, adel: 0.09, cola: 0.35 }],
        [0.82, { pecho: 0.05, cabX: 0.08, alaL: 0.2, alaR: 0.2, pico: 0.2, sy: -0.03, sx: 0.02, cola: 0.1 }], [1.05, {}]], 0.13, 1.05,
        (u, p) => { for (const tc of [0.2, 0.36, 0.52]) { const b = Math.exp(-(((u - tc) / 0.035) ** 2)); p[I.cabX] += 0.06 * b; p[I.pecho] += 0.05 * b; p[I.adel] += 0.035 * b; p[I.sy] += 0.025 * b; p[I.pico] = Math.min(1, p[I.pico] + 0.15 * b); } }),
      // PICO · canto: hincha el pecho y canta: cabeza que se mece al compás y el pico que abre y cierra con las notas
      canto: curva([[0, { pecho: -0.05, sy: -0.03, pico: 0.2 }], [0.12, { pecho: -0.2, sx: 0.055, sy: 0.025, cabX: -0.14, alaL: 0.14, alaR: 0.14, cola: 0.22, pico: 0.3 }, 'sale'],
        [1.3, { pecho: -0.2, sx: 0.055, sy: 0.025, cabX: -0.14, alaL: 0.14, alaR: 0.14, cola: 0.22, pico: 0.3 }], [1.6, {}]], 0.12, 1.6,
        (u, p) => { const on = Math.min(1, u / 0.12) * Math.max(0, Math.min(1, (1.45 - u) / 0.25)), w = Math.PI * 2 * 2.2 * u;
          p[I.cabZ] += 0.24 * Math.sin(w) * on; p[I.cabY] += 0.1 * Math.sin(w * 0.5) * on; p[I.pechoZ] += 0.05 * Math.sin(w) * on;
          p[I.pico] += 0.6 * Math.abs(Math.sin(w)) * on; p[I.sy] += 0.015 * Math.abs(Math.sin(w)) * on; }),
      // OJOS: se concentra (cabeza adelante, quieta, alas pegadas) → mirada intensa (cabeza arriba y ladeada, se estira) → asienta
      ojos: curva([[0, { cabX: 0.18, pecho: 0.1, sy: -0.035, sx: 0.02, alaL: -0.05, alaR: -0.05 }],
        [0.08, { cabX: -0.06, cabZ: 0.2, pecho: -0.14, sy: 0.055, sx: -0.025, abreL: 0.5, abreR: 0.5, alaL: 0.32, alaR: 0.32, cola: 0.32 }, 'sale'],
        [0.5, { cabZ: 0.14, cabX: 0, alaL: 0.12, alaR: 0.12, cola: 0.12, pecho: -0.05 }], [0.78, {}]], 0.08, 0.78),
      // PLUMAS: se encoge → se hincha y envuelve con las alas adelante en abanico (impacto) → aguanta → asienta (o defensa)
      plumas: curva([[0, { sy: -0.06, sx: 0.04, pecho: 0.12, alaL: 0.2, alaR: 0.2 }],
        [0.08, { sx: 0.085, sy: -0.02, pecho: -0.1, alaL: 0.58, alaR: 0.58, alaXL: -0.58, alaXR: -0.58, abreL: 1, abreR: 1, cola: 0.38, cabX: 0.1 }, 'sale'],
        [0.36, { sx: 0.06, alaL: 0.46, alaR: 0.46, alaXL: -0.46, alaXR: -0.46, abreL: 0.8, abreR: 0.8, cola: 0.26, cabX: 0.08 }], [0.62, {}]], 0.08, 0.62),
      // ALAS: alas arriba y se agacha → batida hacia abajo (impacto: se estira y sube) → seguimiento → asienta
      alas: curva([[0, { alaL: 1.0, alaR: 1.0, alaXL: 0.22, alaXR: 0.22, sy: -0.08, sx: 0.05, pecho: -0.1, abreL: 1, abreR: 1, cabX: -0.1 }],
        [0.1, { alaL: -0.05, alaR: -0.05, alaXL: -0.36, alaXR: -0.36, sy: 0.09, sx: -0.05, pecho: 0.2, alto: 0.12, abreL: 0.7, abreR: 0.7, cola: 0.42, pico: 0.5 }, 'sale'],
        [0.24, { alaL: 0.6, alaR: 0.6, sy: 0.02, alto: 0.08, abreL: 0.9, abreR: 0.9, cola: 0.2 }], [0.52, {}]], 0.1, 0.52),
      // ---- Extremidades y combos (10-nov). Las poses son del lado IZQUIERDO; el derecho es su espejo (lado −1) ----
      // Ala sola: el ala se abre de lado y barre por delante (aletazo de lado) mientras el cuerpo gira hacia el otro lado
      ext_ala: curva([[0, { alaL: 0.7, alaXL: 0.2, abreL: 0.6, alaR: -0.05, abreR: 0 }],
        [0.035, { alaL: 1.15, alaXL: 0.45, abreL: 1, pechoY: 0.36, pechoZ: -0.1, sy: -0.04, sx: 0.025, cabZ: 0.1, alaR: -0.08, abreR: 0 }, 'sale'],
        [0.08, { alaL: 0.95, alaXL: -1.25, abreL: 1, pechoY: -0.45, pechoZ: 0.1, pecho: 0.12, cabX: 0.08, pico: 0.55, sy: 0.06, sx: -0.03, adel: 0.08, cola: 0.22, colaZ: -0.25, alaR: -0.05, abreR: 0 }, 'sale'],
        [0.22, { alaL: 0.55, alaXL: -1.0, abreL: 0.75, pechoY: -0.42, pecho: 0.14, pico: 0.25, adel: 0.06, cola: 0.3, colaZ: -0.12 }],
        [0.44, {}]], 0.08, 0.44),
      // Pata sola: recoge la pata (rodilla arriba) → patadita/arañazo adelante con las alas abiertas de equilibrio → vuelve
      ext_pata: curva([[0, { piernaL: -0.3, rodL: -0.5, alaL: 0.25, alaR: 0.25, abreL: 0.4, abreR: 0.4 }],
        [0.035, { piernaL: -0.6, rodL: -1.15, pecho: -0.12, alaL: 0.4, alaR: 0.4, abreL: 0.6, abreR: 0.6, sy: -0.03, alto: 0.03, cola: 0.2 }, 'sale'],
        [0.08, { piernaL: -1.3, rodL: -0.1, pecho: -0.26, cabX: 0.06, alaL: 0.6, alaR: 0.6, abreL: 0.85, abreR: 0.85, sy: 0.05, alto: 0.07, adel: 0.1, cola: 0.42, pico: 0.4, pechoZ: 0.06 }, 'sale'],
        [0.18, { piernaL: -0.7, rodL: -0.6, alaL: 0.42, alaR: 0.42, abreL: 0.6, abreR: 0.6, alto: 0.04, adel: 0.06, cola: 0.26, pecho: -0.1 }],
        [0.4, {}]], 0.08, 0.4),
      // ¡Abanicazo! (ala + la otra ala): las dos alas arriba y atrás → palmada adelante con las dos (impacto) → asienta
      combo_abanicazo: curva([[0, { alaL: 1.0, alaR: 1.0, alaXL: 0.5, alaXR: 0.5, abreL: 1, abreR: 1, pecho: -0.25, cabX: -0.3, sy: -0.06, sx: 0.04, cola: 0.3, pico: 0.4 }],
        [0.14, { alaL: 1.12, alaR: 1.12, alaXL: 0.68, alaXR: 0.68, abreL: 1, abreR: 1, pecho: -0.3, cabX: -0.34, sy: -0.08, sx: 0.05, cola: 0.36, pico: 0.5, alto: 0.05 }],
        [0.2, { alaL: 0.42, alaR: 0.42, alaXL: -1.1, alaXR: -1.1, abreL: 1, abreR: 1, pecho: 0.28, cabX: 0.14, sy: 0.08, sx: -0.04, adel: 0.14, cola: 0.45, pico: 0.9, alto: 0.08 }, 'sale'],
        [0.42, { alaL: 0.3, alaR: 0.3, alaXL: -0.8, alaXR: -0.8, abreL: 0.7, abreR: 0.7, pecho: 0.2, adel: 0.1, cola: 0.3, pico: 0.4 }],
        [0.7, {}]], 0.2, 0.7),
      // ¡Patita Sabrosa! (pata + la otra pata): saltito y tijera de patadas, una y otra (impacto con la segunda)
      combo_patita: curva([[0, { agacha: 0.25, sy: -0.08, sx: 0.05, alaL: 0.5, alaR: 0.5, abreL: 0.7, abreR: 0.7, cola: 0.3 }],
        [0.09, { alto: 0.22, piernaL: -1.0, rodL: -0.2, piernaR: -0.2, rodR: -0.9, alaL: 0.9, alaR: 0.9, abreL: 1, abreR: 1, pecho: -0.2, sy: 0.06, cola: 0.45, pico: 0.5 }, 'sale'],
        [0.24, { alto: 0.26, piernaL: -0.2, rodL: -0.9, piernaR: -1.05, rodR: -0.15, alaL: 0.8, alaR: 0.8, abreL: 1, abreR: 1, pecho: -0.22, adel: 0.12, sy: 0.05, cola: 0.5, pico: 0.8 }, 'sale'],
        [0.42, { alto: 0.04, agacha: 0.2, sy: -0.07, sx: 0.04, alaL: 0.4, alaR: 0.4, cola: 0.2 }],
        [0.66, {}]], 0.24, 0.66),
      // ¡Cruzaíto! (ala de un lado + pata del otro): aletazo y patada cruzados a la vez, con el cuerpo torcido
      combo_cruzaito: curva([[0, { alaL: 0.95, alaXL: 0.45, abreL: 1, piernaR: -0.5, rodR: -1.0, pechoY: 0.4, sy: -0.04, cola: 0.2, alaR: 0.3 }],
        [0.16, { alaL: 0.5, alaXL: -1.05, abreL: 1, piernaR: -1.05, rodR: -0.15, pechoY: -0.5, pecho: 0.1, alto: 0.08, adel: 0.12, sy: 0.06, pico: 0.7, cola: 0.4, colaZ: 0.3, alaR: 0.5, abreR: 0.7 }, 'sale'],
        [0.36, { alaL: 0.3, alaXL: -0.7, piernaR: -0.5, rodR: -0.5, pechoY: -0.35, alto: 0.04, adel: 0.08, cola: 0.25, alaR: 0.3 }],
        [0.6, {}]], 0.16, 0.6),
      // ¡Revolú de Plumas! (la misma ala dos veces + pata): molinete de alas con el cuerpo que se retuerce → patada final
      combo_revolu: curva([[0, { alaL: 0.9, alaR: 0.9, abreL: 1, abreR: 1, sy: -0.04, cola: 0.35, pico: 0.5 }],
        [0.34, { alaL: 0.8, alaR: 0.8, abreL: 1, abreR: 1, piernaL: -0.95, rodL: -0.2, alto: 0.12, adel: 0.12, pico: 0.85, cola: 0.45 }, 'sale'],
        [0.56, { alaL: 0.4, alaR: 0.4, abreL: 0.8, abreR: 0.8, piernaL: -0.4, rodL: -0.5, alto: 0.04, adel: 0.06, cola: 0.3 }],
        [0.85, {}]], 0.34, 0.85,
        (u, p) => { const on = Math.max(0, Math.min(1, u / 0.06)) * Math.max(0, Math.min(1, (0.62 - u) / 0.2)), w = Math.PI * 2 * 3 * u, s1 = Math.sin(w);
          p[I.pechoY] += 0.42 * s1 * on; p[I.alaXL] += 0.7 * s1 * on; p[I.alaXR] -= 0.7 * s1 * on; p[I.colaZ] += 0.32 * Math.sin(w + 1) * on; p[I.cabY] -= 0.18 * s1 * on; p[I.alto] += 0.05 * Math.abs(s1) * on; }),
      // ¡Brinco Coquí! (la misma pata dos veces + ala): se agacha, brinca alto con las patas recogidas y cae con un alazo doble
      combo_coqui: curva([[0, { agacha: 0.35, sy: -0.1, sx: 0.06, alaL: 0.3, alaR: 0.3, cola: 0.2, cabX: -0.15 }],
        [0.12, { agacha: 0.4, sy: -0.12, sx: 0.07, alaL: 0.5, alaR: 0.5, abreL: 0.6, abreR: 0.6, cola: 0.25, cabX: -0.2 }],
        [0.24, { alto: 0.42, piernaL: -0.8, piernaR: -0.8, rodL: -1.1, rodR: -1.1, alaL: 1.1, alaR: 1.1, alaXL: 0.3, alaXR: 0.3, abreL: 1, abreR: 1, sy: 0.1, sx: -0.06, pecho: -0.2, cabX: -0.25, pico: 0.7, cola: 0.5 }, 'sale'],
        [0.36, { alto: 0.12, piernaL: -0.3, piernaR: -0.3, rodL: -0.4, rodR: -0.4, alaL: 0.2, alaR: 0.2, alaXL: -0.9, alaXR: -0.9, abreL: 1, abreR: 1, pecho: 0.3, cabX: 0.2, adel: 0.14, sy: -0.04, pico: 0.9, cola: 0.45 }, 'entra'],
        [0.5, { agacha: 0.3, sy: -0.1, sx: 0.06, alaL: 0.3, alaR: 0.3, alaXL: -0.5, alaXR: -0.5, pecho: 0.2, adel: 0.1, cola: 0.3 }],
        [0.9, {}]], 0.36, 0.9),
      // Esquiva (quiebro propio, saltos de la Campeona): se tumba de lado con las alas arriba → cae y amortigua → asienta
      esquiva: curva([[0, { pechoZ: 0.36, alaL: 0.62, alaR: 0.62, abreL: 0.8, abreR: 0.8, sy: 0.05, sx: -0.03, cola: 0.3, colaZ: -0.3, cabZ: -0.15 }],
        [0.28, { pechoZ: 0.2, alaL: 0.4, alaR: 0.4, sy: -0.06, sx: 0.045, cola: 0.15 }], [0.5, {}]], 0, 0.5)
    };
    // Reacciones (sin acción propia)
    const REAC = {
      // Impacto recibido: se dobla hacia atrás con todo abierto (alas, abanico, pico), aplastada → rebota → asienta
      impacto: curva([[0, { pecho: -0.4, cabX: -0.42, alaL: 0.92, alaR: 0.92, alaXL: 0.25, alaXR: 0.25, abreL: 1, abreR: 1, pico: 0.8, sy: -0.12, sx: 0.08, adel: -0.12, cola: 0.5, piernaL: -0.25, rodL: -0.4 }],
        [0.1, { pecho: -0.28, cabX: -0.2, alaL: 0.62, alaR: 0.62, alaXL: 0.12, alaXR: 0.12, abreL: 0.8, abreR: 0.8, pico: 0.5, sy: 0.05, sx: -0.03, adel: -0.18, cola: 0.32, piernaL: -0.1, rodL: -0.15 }],
        [0.45, {}]], 0, 0.45),
      // El escudo para el golpe: se encoge un poco tras las alas y aguanta
      bloquea: curva([[0, { pecho: 0.12, cabX: 0.15, alaL: 0.5, alaR: 0.5, alaXL: -0.5, alaXR: -0.5, abreL: 1, abreR: 1, sy: -0.07, sx: 0.05, adel: -0.05 }],
        [0.32, {}]], 0, 0.32),
      // Asienta al pararse o al aterrizar (10-nov: sin frenazo rígido): baja el peso, abre un poco las alas y la cola sube → vuelve
      asienta: curva([[0, { agacha: 0.16, sy: -0.07, sx: 0.04, pecho: 0.12, cabX: 0.08, alaL: 0.3, alaR: 0.3, abreL: 0.5, abreR: 0.5, cola: 0.28, pies: 0.04 }],
        [0.12, { agacha: 0.05, sy: 0.02, sx: -0.01, pecho: -0.05, cabX: -0.06, alaL: 0.14, alaR: 0.14, abreL: 0.3, abreR: 0.3, cola: 0.06 }], [0.34, {}]], 0, 0.34),
      // Se recupera del mareo: sacude la cabeza y las plumas
      recupera: curva([[0, { sy: 0.035, sx: -0.02, abreL: 0.7, abreR: 0.7, alaL: 0.3, alaR: 0.3 }], [0.42, {}]], 0, 0.42,
        (u, p) => { const e = Math.max(0, 1 - u / 0.42), w = Math.PI * 2 * 6.5 * u; p[I.cabY] += 0.38 * Math.sin(w) * e; p[I.cabZ] += 0.12 * Math.sin(w + 1) * e; p[I.colaZ] += 0.2 * Math.sin(w * 1.08) * e; })
    };
    const ID_FAM = { golpe_ala: 'ala', semilla: 'tiro', lluvia_semillas: 'tiro', semilla_rio: 'tiro', semilla_pina: 'tiro', canto_real: 'canto', cuento: 'canto', imitacion: 'canto', quiebro: 'esquiva' };
    const famDe = id => { if (ID_FAM[id]) return ID_FAM[id]; const h = H.get(id); return ({ pico: 'grito', ojos: 'ojos', plumas: 'plumas', alas: 'alas' })[h && h.tecnica] || 'ala'; };
    // Cuánto manda cada estado en cada grupo de huesos [pecho, cabeza, alas, cola]. La cola manda poco: debajo va su muelle
    // (character.js), que sigue al cuerpo y recibe los colaImpulso de los golpes.
    const MANDA = { espera: [0.3, 0.2, 0.35, 0.1], mueve: [0, 0, 0.25, 0], accion: [0.7, 0.6, 0.92, 0.25], impacto: [0.8, 0.7, 0.92, 0.25], bloquea: [0.6, 0.5, 0.9, 0.2],
      aturdido: [0.6, 0.6, 0.75, 0.2], recupera: [0.5, 0.6, 0.6, 0.2], anticipa: [0.6, 0.5, 0.92, 0.25], defensa: [0.6, 0.4, 0.92, 0.2], esquiva: [0.5, 0.3, 0.85, 0.2],
      gana: [0.55, 0.45, 0.85, 0.25], pierde: [0.9, 0.85, 0.92, 0.3] };
    const FUNDE = { impacto: 0.035, bloquea: 0.05, accion: 0.04, anticipa: 0.1, espera: 0.28, mueve: 0.2, pierde: 0.2, gana: 0.12 };
    const ESTADOS = Object.keys(MANDA);
    // Muelles de seguimiento: [canal, rigidez (rad/s), amortiguación]: rebote pequeño y natural tras cada pose
    const MUELLES = [['cola', 17, 0.32], ['colaZ', 15, 0.3], ['cabX', 32, 0.55], ['cabY', 26, 0.6], ['cabZ', 22, 0.5], ['alaL', 28, 0.45], ['alaR', 28, 0.45], ['alaXL', 28, 0.5], ['alaXR', 28, 0.5], ['pecho', 30, 0.6], ['pechoY', 30, 0.65], ['pechoZ', 26, 0.6]].map(([k, w, z]) => [I[k], w, z]);
    const VMAX = 14; // rad/s
    let paradaT = 0; // hit-stop visual (común a las dos cotorras del duelo)
    const perf = { ms: 0, n: 0, cuadros: 0, ultimo: -1 };
    const barato = () => !!(G.renderer && G.renderer.calidad && (G.renderer.calidad.escuela || G.renderer.calidad.nivel === 'bajo'));
    const reducido = () => !!(G.renderer && G.renderer.REDUCED);
    const fxOk = n => G.v18fx && typeof G.v18fx[n] === 'function';
    const altoDe = ch => (ch.height || 1) * (ch.root ? ch.root.scale.y : 1) * 1.02; // coronilla, en metros sobre los pies
    const TMP = new Float32Array(N);
    function estadoDe(f) {
      return f.anima2 || (f.anima2 = { estado: '', sub: '', t: 0, u: 0, acc: null, golpeT: -1, golpeK: 1, bloqT: -1, recT: -1, mareo0: 0, esqT: -1, finT: 0, fin: '', lado: 1,
        asT: -1, asK: 0, vel0: 0, aire0: false, out: new Float32Array(N), desde: new Float32Array(N), meta: new Float32Array(N), fade: 1, fadeDur: 0.2, manda: new Float32Array(4), mandaDesde: new Float32Array(4),
        sp: new Float32Array(N), spV: new Float32Array(N), spDt: 0, spIni: false, par: false, sx: 1, sy: 1, pend: false, vistos: {}, saltoMax: 0, saltoEsc: 0, historial: [], suspiro: -1, pico: 0, picoMax: 0, prev: null, prevSy: 1 });
    }
    // ---- Eventos (los llama el duelo: usar y golpear) ----
    // o (extremidades y combos): { fam, lado (1 izquierda, −1 derecha: espejo), imp (empieza en la pose de impacto) }
    function accion(f, id, o) {
      if (!c2On() || !f) return;
      const A = estadoDe(f), fam = (o && o.fam && FAM[o.fam]) ? o.fam : famDe(id), c = FAM[fam];
      if (fam === 'ala') A.lado = -A.lado; // alterna de ala
      // Desde la anticipación (telegrafía de la Campeona) o si el golpe ya conectó en esta misma llamada: entra en el impacto
      const u0 = (o && o.imp) || A.pend || A.estado === 'anticipa' ? c.imp : 0; A.pend = false;
      A.acc = { id, fam, u: u0, c, lado: o && o.lado ? o.lado : fam === 'ala' ? A.lado : 1, ext: !!(o && o.fam) };
      const ch = A.ch; if (!ch || !ch.root) return;
      try {
        if (fam === 'grito' && fxOk('anillosPico')) { const y = ch.root.rotation.y; G.v18fx.anillosPico((ch.anchors && ch.anchors.pico) || ch.root, { x: Math.sin(y), z: Math.cos(y) }, [0.12, 0.2, 0.36, 0.52]); }
        if (fam === 'canto' && fxOk('notas')) G.v18fx.notas(ch.root, Math.max(0.9, f.picoT || 0) + 0.2, altoDe(ch) * 0.9);
      } catch (e) { /* efecto */ }
    }
    // El golpe llega (blanco) y quien lo dio lo nota (de): impacto, hit-stop y, si va con la jugadora, sacudida de cámara
    function golpe(de, blanco, o) {
      if (!c2On()) return;
      o = o || {};
      if (blanco) { const B = estadoDe(blanco); if (o.bloqueado) B.bloqT = 0; else { B.golpeT = 0; B.golpeK = o.n > 0 ? 1 : 0.75; } }
      if (de && o.directo) estadoDe(de).pend = true; // el golpe sale dentro de su propio usar: su acción empieza en la pose de impacto
      paradaT = Math.max(paradaT, o.bloqueado ? 0.05 : o.n > 0 ? 0.085 : 0.065);
      if (o.camara && G.camara && G.camara.shake && !reducido()) G.camara.shake(o.n > 0 ? 0.09 : 0.055, 0.16);
    }
    // dt del personaje (mixer y procedural) y de esta capa: casi parado durante el hit-stop. pasoReloj: una vez por cuadro
    const dtVis = dt => (paradaT > 0 ? dt * 0.06 : dt);
    const visT = []; // efectos que esperan a su pose (solo se ven; no van en C.timers, que lee la IA)
    const despues = (s, fn) => { visT.push({ t: s, fn }); if (visT.length > 16) visT.shift().fn(); };
    const pasoReloj = dt => { if (paradaT > 0) paradaT = Math.max(0, paradaT - dt); for (let i = visT.length - 1; i >= 0; i--) { const v = visT[i]; v.t -= dt; if (v.t <= 0) { visT.splice(i, 1); try { v.fn(); } catch (e) { /* efecto */ } } } };
    // ---- Antes de ch.update: estado, pose meta, fundido, muelles, raíz (escala y desplazamiento), cara, pico y abanico ----
    // o: { fin ('gana' | 'pierde' | ''), prep ('golpe_ala' | 'semilla' | ''), prepK (0..1), vel (m/s), salto (esquiva de juego),
    //      escalaAbs (quien la mueve pone la escala de la raíz cada cuadro: Vittata, actores.js) }
    function antes(ch, f, o, dtReal) {
      const t0 = performance.now();
      // Extremidades y combos: la preparación hasta la pose de golpe va a tiempo real aunque haya hit-stop (si no, la pausa del
      // golpe congelaba la pose de antes y la patada no se veía); al llegar al golpe, se congela como todo.
      const A = estadoDe(f), libre = !!(A.acc && A.acc.ext && A.acc.u < A.acc.c.imp), dt = libre ? dtReal : dtVis(dtReal), root = ch.root;
      A.t += dt; A.ch = ch;
      if (A.golpeT >= 0) { A.golpeT += dt; if (A.golpeT > REAC.impacto.dur) A.golpeT = -1; }
      if (A.bloqT >= 0) { A.bloqT += dt; if (A.bloqT > REAC.bloquea.dur) A.bloqT = -1; }
      if (A.mareo0 && !(f.mareo > 0) && !o.fin) A.recT = 0;
      A.mareo0 = f.mareo > 0 ? 1 : 0;
      if (A.recT >= 0) { A.recT += dt; if (A.recT > REAC.recupera.dur) A.recT = -1; }
      // Asienta (10-nov): al pararse de golpe o al tocar suelo tras un salto, un asentarse corto (no un frenazo rígido)
      { const v = o.vel || 0, aire = !!(ch.airborne || o.salto);
        if ((A.vel0 > 1.2 && v < 0.4) || (A.aire0 && !aire)) { A.asT = 0; A.asK = A.aire0 && !aire ? 1 : 0.65; }
        A.vel0 = v; A.aire0 = aire;
        if (A.asT >= 0) { A.asT += dt; if (A.asT > REAC.asienta.dur) A.asT = -1; } }
      if (A.acc) {
        A.acc.u += dt;
        const hold = A.acc.fam === 'canto' && f.picoT > 0.3 ? 1.3 : A.acc.fam === 'grito' && f.picoT > 0.12 ? 0.62 : 0; // aguanta mientras dura el poder
        if (hold && A.acc.u > hold) A.acc.u = hold;
        if (A.acc.u > A.acc.c.dur) A.acc = null;
      }
      const esq = !!o.salto && !A.acc;
      if (esq && A.esqT < 0) A.esqT = 0;
      if (A.esqT >= 0) { A.esqT += dt; if (esq && A.esqT > 0.3) A.esqT = 0.3; else if (A.esqT > FAM.esquiva.dur) A.esqT = -1; }
      const fin = o.fin || ''; if (fin !== A.fin) { A.fin = fin; A.finT = 0; } else if (fin) A.finT += dt;
      const defiende = f.escudo > 0 || f.capa > 0 || f.hojas > 0 || f.remolino > 0;
      // Prioridad: final > impacto > bloqueo > mareo > acción > recuperación > anticipación > defensa > esquiva > mueve > espera
      const est = fin || (A.golpeT >= 0 ? 'impacto' : A.bloqT >= 0 ? 'bloquea' : f.mareo > 0 ? 'aturdido' : A.acc ? 'accion' : A.recT >= 0 ? 'recupera'
        : o.prep ? 'anticipa' : defiende ? 'defensa' : A.esqT >= 0 ? 'esquiva' : (o.vel || 0) > 0.4 ? 'mueve' : 'espera');
      const sub = est === 'accion' ? A.acc.fam : est;
      if (est !== A.estado || sub !== A.sub || (est === 'accion' && A.acc.nuevo !== false)) {
        A.desde.set(A.out); A.mandaDesde.set(A.manda); A.fade = 0; A.fadeDur = FUNDE[est] != null ? FUNDE[est] : 0.14;
        if (est === 'accion') A.acc.nuevo = false;
        if (sub !== A.sub || est !== A.estado) { A.vistos[sub] = (A.vistos[sub] || 0) + 1; A.historial.push(sub); if (A.historial.length > 60) A.historial.shift(); }
        A.estado = est; A.sub = sub; A.u = 0;
        if (est === 'impacto' && ch.colaImpulso) try { ch.colaImpulso(0.9 * A.golpeK); } catch (e) { /* api */ }
        if (est === 'gana') {
          if (ch.colaImpulso) try { ch.colaImpulso(1); } catch (e) { /* api */ }
          try { ch.play('Celebrate', true); } catch (e) { /* sin clip */ }
          fx('gold', f.pos.x, f.pos.y + 1.6, f.pos.z); if (!barato()) fx('stars', f.pos.x, f.pos.y + 1.9, f.pos.z);
        }
        if ((est === 'aturdido' || est === 'pierde') && fxOk('estrellas')) { try { G.v18fx.estrellas(root, est === 'pierde' ? 2.8 : Math.max(0.6, f.mareo || 0.6), altoDe(ch)); } catch (e) { /* efecto */ } }
      } else A.u += dt;
      // Pose meta del estado
      const P = A.meta, manda = MANDA[est]; P.fill(0);
      if (est === 'accion') { evalua(A.acc.c, A.acc.u, P); if (A.acc.c.extra) A.acc.c.extra(A.acc.u, P); if (A.acc.lado < 0) espejo(P); }
      else if (est === 'impacto') { evalua(REAC.impacto, A.golpeT, P); if (A.golpeK !== 1) for (let j = 0; j < N; j++) P[j] *= A.golpeK; }
      else if (est === 'bloquea') evalua(REAC.bloquea, A.bloqT, P);
      else if (est === 'recupera') { evalua(REAC.recupera, A.recT, P); REAC.recupera.extra(A.recT, P); }
      else if (est === 'esquiva') { evalua(FAM.esquiva, A.esqT, P); if ((f.lado || 1) < 0) espejo(P); }
      else poseSuelta(est, A, f, o, P);
      if (A.asT >= 0 && (est === 'espera' || est === 'mueve' || est === 'defensa')) { evalua(REAC.asienta, A.asT, TMP); for (let j = 0; j < N; j++) P[j] += TMP[j] * A.asK; }
      // Fundido entre estados (sin cortes)
      A.fade = Math.min(1, A.fade + dt / Math.max(1e-3, A.fadeDur));
      const x = A.fade * A.fade * (3 - 2 * A.fade), out = A.out;
      for (let j = 0; j < N; j++) out[j] = A.desde[j] + (P[j] - A.desde[j]) * x;
      for (let g = 0; g < 4; g++) A.manda[g] = A.mandaDesde[g] + (manda[g] - A.mandaDesde[g]) * x;
      // Muelles de seguimiento; en Modo Escuela / calidad baja, a medio ritmo (cada dos cuadros, con el dt sumado)
      A.spDt += dt; A.par = !A.par;
      if (!barato() || A.par) {
        const h0 = A.spDt, n = Math.max(1, Math.ceil(h0 / (1 / 45))), h = h0 / n; A.spDt = 0;
        for (const [j, w, z] of MUELLES) {
          let s = A.spIni ? A.sp[j] : out[j], v = A.spIni ? A.spV[j] : 0;
          for (let i = 0; i < n; i++) { v += (w * w * (out[j] - s) - 2 * z * w * v) * h; s += v * h; }
          A.sp[j] = s; A.spV[j] = v;
        }
        A.spIni = true;
      }
      for (const [j] of MUELLES) out[j] = A.sp[j];
      // Velocidad máxima de cada giro (VMAX rad/s): rápido para que los golpes tengan chispa, sin saltos de un cuadro a otro
      if (A.lim) { const lm = VMAX * Math.max(dt, 1e-4); for (const j of ANG) { const d = out[j] - A.lim[j]; if (d > lm) out[j] = A.lim[j] + lm; else if (d < -lm) out[j] = A.lim[j] - lm; } A.lim.set(out); }
      else A.lim = Float32Array.from(out);
      // Peso abajo: la pose «agachada» de character.js (patas flexionadas y el cuerpo algo adelante; el IK de patas la apoya)
      const ag = Math.max(0, Math.min(0.5, out[I.agacha]));
      if (ag > 0.002 && !ch.airborne) { ch.agachada = Math.max(ch.agachada || 0, ag); A.agacho = true; }
      // Raíz: estirar y aplastar (moderado; con «Reducir movimiento», la mitad) y desplazamiento (adelante/atrás, arriba)
      const kr = reducido() ? 0.5 : 1, sx = 1 + Math.max(-0.15, Math.min(0.15, out[I.sx] * kr)), sy = 1 + Math.max(-0.22, Math.min(0.15, out[I.sy] * kr));
      const E = ch._c2esc || (ch._c2esc = { sx: 1, sy: 1 }); // la escala que puso esta capa (en el personaje: el luchador cambia en cada duelo)
      if (o.escalaAbs) { root.scale.x *= sx; root.scale.y *= sy; root.scale.z *= sx; }
      else { root.scale.x *= sx / E.sx; root.scale.y *= sy / E.sy; root.scale.z *= sx / E.sx; }
      E.sx = A.sx = sx; E.sy = A.sy = sy;
      const yaw = root.rotation.y, ad = out[I.adel] * kr;
      root.position.x += Math.sin(yaw) * ad; root.position.z += Math.cos(yaw) * ad; root.position.y += out[I.alto];
      // Cara, pico y abanico
      if (est === 'impacto' || est === 'aturdido') ch.expression = 'surprised';
      else if (est === 'gana' || sub === 'canto') ch.expression = 'happy';
      else if (est === 'pierde') ch.expression = 'sad';
      else if (est === 'accion' || est === 'anticipa') ch.expression = 'fight';
      const pico = Math.max(0, Math.min(1, out[I.pico]));
      A.picoApi = typeof ch.pico === 'function';
      if (A.picoApi) { try { ch.pico(pico, 80); } catch (e) { /* api */ } if (f.picoT > 0) ch.mouth = null; } else ch.mouth = null;
      A.pico = pico; A.picoMax = Math.max(A.picoMax, pico);
      if (typeof ch.alas === 'function') { try { ch.alas(Math.max(0, Math.min(1, out[I.abreL])), Math.max(0, Math.min(1, out[I.abreR]))); } catch (e) { /* api */ } }
      // Para la prueba: el mayor salto de un cuadro (normalizado a 30 cuadros/s) en los canales angulares y en la escala
      if (A.prev) {
        let m = 0, mk = -1; for (const j of ANG) { const d = Math.abs(out[j] - A.prev[j]); if (d > m) { m = d; mk = j; } }
        const k30 = 1 / 30 / Math.max(dtReal, 1e-3); if (m * k30 > A.saltoMax) { A.saltoMax = m * k30; A.saltoK = K[mk] + '@' + A.sub; } A.saltoEsc = Math.max(A.saltoEsc, Math.abs(sy - A.prevSy) * k30); A.prev.set(out);
      } else A.prev = Float32Array.from(out);
      A.prevSy = sy;
      medir(t0);
      return A;
    }
    // Estados sin curva de acción: espera (3 variaciones), mueve, anticipa, defensa, aturdido, gana, pierde
    function poseSuelta(est, A, f, o, p) {
      const T = A.t;
      if (est === 'espera') {
        // Guardia que respira y bota (3,4 s) → curiosa (ladea la cabeza y hace «clic») → guardia → se sacude las plumas. Sin azar.
        const ciclo = [3.4, 2.2, 3.0, 1.7], q = T % 10.3; let v = 0, a = 0;
        for (let i = 0, s = 0; i < 4; i++) { if (q < s + ciclo[i]) { v = i; a = (q - s) / ciclo[i]; break; } s += ciclo[i]; }
        // Guardia (Kelvin 10-nov: «mejorar su posición cuando se pare»): peso bajo y algo adelante (agachada leve), pecho
        // arriba, cabeza alta y atenta, alas algo separadas del cuerpo y un poco abiertas, cola que equilibra, patas más
        // abiertas; bota suave al ritmo de la respiración.
        const b = Math.sin(T * 2.6), bota = Math.abs(Math.sin(T * Math.PI * 1.5)), ab = 0.5 + 0.5 * Math.sin(T * 1.3);
        p[I.agacha] = 0.035 + 0.012 * bota; p[I.pies] = 0.08; p[I.pecho] = -0.1 + 0.035 * b; p[I.cabX] = -0.12;
        p[I.sy] = 0.012 * b - 0.014 * bota; p[I.sx] = 0.006 * bota; p[I.alaL] = p[I.alaR] = 0.17 + 0.06 * (0.5 + 0.5 * b);
        p[I.alaXL] = p[I.alaXR] = -0.1; p[I.abreL] = p[I.abreR] = 0.26 + 0.1 * ab;
        p[I.cola] = 0.1 + 0.06 * Math.sin(T * 2.6 + 1); p[I.cabZ] = 0.1 * Math.sin(T * 0.7); p[I.pechoZ] = 0.035 * Math.sin(T * 0.9);
        const env = Math.sin(Math.PI * a) ** 2; A.idle = v === 1 ? 1 : v === 3 ? 2 : 0;
        if (v === 1) { p[I.cabZ] += 0.32 * env; p[I.cabX] -= 0.1 * env; p[I.pico] = 0.18 * Math.max(0, Math.sin(Math.PI * 4 * a)) * env; }
        if (v === 3) { p[I.abreL] = p[I.abreR] = Math.max(p[I.abreL], 0.85 * env); p[I.alaL] += (0.22 + 0.08 * Math.sin(T * 30)) * env; p[I.alaR] += (0.22 + 0.08 * Math.sin(T * 30 + 0.6)) * env;
          p[I.sx] += 0.045 * env; p[I.colaZ] = 0.22 * Math.sin(T * 18) * env; p[I.cabY] = 0.12 * Math.sin(T * 14) * env; }
      } else if (est === 'mueve') {
        // Al moverse, las alas acompañan cada paso (abiertas un poco, sin pegarse al cuerpo)
        p[I.alaL] = 0.18 + 0.2 * Math.max(0, Math.sin(T * 8)); p[I.alaR] = 0.18 + 0.2 * Math.max(0, Math.sin(T * 8 + 0.5)); p[I.abreL] = p[I.abreR] = 0.38;
        p[I.cola] = 0.08 * Math.sin(T * 8); p[I.pecho] = -0.05; p[I.cabX] = -0.08; p[I.agacha] = 0.02;
      } else if (est === 'anticipa') {
        const k = Math.min(1, Math.max(0, o.prepK || 0)), tiembla = k > 0.6 ? Math.sin(T * 42) * 0.04 * (k - 0.6) / 0.4 : 0;
        if (o.prep === 'golpe_ala') { // el ala del siguiente aletazo (alterna; ver FAM.ala) se carga atrás y el cuerpo se tuerce
          const L = -A.lado, a1 = L > 0 ? I.alaL : I.alaR, x1 = L > 0 ? I.alaXL : I.alaXR, a2 = L > 0 ? I.alaR : I.alaL, x2 = L > 0 ? I.alaXR : I.alaXL;
          p[a1] = 0.62 * k; p[x1] = 0.72 * k; p[a2] = 0.32 * k; p[x2] = 0.35 * k; p[I.abreL] = p[I.abreR] = 0.7 * k;
          p[I.pechoY] = 0.3 * k * L; p[I.pecho] = -0.12 * k + tiembla; p[I.sy] = -0.075 * k; p[I.sx] = 0.045 * k; p[I.cola] = 0.45 * k; p[I.cabX] = 0.12; p[I.pico] = 0.15 + 0.1 * k;
        } else if (o.prep && o.prep.indexOf('ext:') === 0) { // una extremidad (Combate 2.0): el ala se abre atrás, o la pata se recoge
          const q = o.prep.slice(4), izq = /Izq$/.test(q);
          if (/^ala/.test(q)) { p[izq ? I.alaL : I.alaR] = 0.9 * k; p[izq ? I.alaXL : I.alaXR] = 0.45 * k; p[izq ? I.abreL : I.abreR] = k; p[I.pechoY] = (izq ? 0.32 : -0.32) * k; }
          else { p[izq ? I.piernaL : I.piernaR] = -0.5 * k; p[izq ? I.rodL : I.rodR] = -1.0 * k; p[I.alaL] = p[I.alaR] = 0.35 * k; p[I.abreL] = p[I.abreR] = 0.5 * k; p[I.pecho] = -0.12 * k; }
          p[I.sy] = -0.05 * k + tiembla * 0.5; p[I.sx] = 0.03 * k; p[I.cola] = 0.3 * k; p[I.pico] = 0.15; p[I.cabX] = 0.06;
        } else { p[I.cabX] = -0.26 * k; p[I.pecho] = -0.08 * k; p[I.pico] = 0.12; p[I.cabZ] = 0.18; p[I.sy] = -0.03 * k; p[I.cola] = 0.2 * k; }
      } else if (est === 'defensa') {
        const b = Math.sin(T * 3);
        p[I.sx] = 0.05; p[I.sy] = -0.01 + 0.01 * b; p[I.alaL] = p[I.alaR] = 0.45 + 0.03 * b; p[I.alaXL] = p[I.alaXR] = -0.4; p[I.abreL] = p[I.abreR] = 0.8; p[I.cabX] = 0.12; p[I.pecho] = 0.08; p[I.cola] = 0.2;
      } else if (est === 'aturdido') {
        p[I.cabY] = 0.3 * Math.sin(T * 5); p[I.cabZ] = 0.25 * Math.cos(T * 5); p[I.alaL] = 0.45 + 0.18 * Math.sin(T * 7); p[I.alaR] = 0.45 + 0.18 * Math.sin(T * 7 + 1);
        p[I.abreL] = 0.4 + 0.3 * Math.max(0, Math.sin(T * 7)); p[I.abreR] = 0.4 + 0.3 * Math.max(0, Math.sin(T * 7 + 1));
        p[I.pico] = 0.3; p[I.pecho] = 0.12; p[I.sy] = -0.03 + 0.02 * Math.sin(T * 10); p[I.cola] = -0.1;
      } else if (est === 'gana') {
        // Celebra: saltitos con las alas abiertas en abanico y el pico abierto (1,8 s) → orgullosa, pecho fuera, cabeceando
        const tg = A.finT;
        if (tg < 1.8) {
          const ph = (tg / 0.45) % 1, alto = Math.sin(Math.PI * ph), dec = 1 - tg / 2.2;
          p[I.alto] = 0.24 * alto * dec; p[I.sy] = (alto > 0.15 ? 0.06 * alto : -0.09 * (1 - alto / 0.15)) * dec; p[I.sx] = -p[I.sy] * 0.5;
          p[I.alaL] = 0.85 + 0.35 * Math.sin(tg * 16); p[I.alaR] = 0.85 + 0.35 * Math.sin(tg * 16 + 0.3); p[I.abreL] = p[I.abreR] = 1;
          p[I.pico] = 0.55 + 0.4 * Math.abs(Math.sin(tg * 7)); p[I.cola] = 0.4 + 0.12 * Math.sin(tg * 12); p[I.pecho] = -0.15; p[I.cabX] = -0.22;
          const e = Math.min(1, tg / 0.12); if (e < 1) for (const j of [I.alaL, I.alaR, I.abreL, I.abreR, I.pico, I.cola, I.pecho, I.cabX]) p[j] *= e;
        } else {
          const t2 = tg - 1.8, e = Math.min(1, t2 / 0.4), w = 1 - e;
          p[I.pecho] = -0.2 + 0.05 * w; p[I.sx] = 0.04; p[I.cabX] = -0.15 - 0.07 * w; p[I.cabY] = 0.12 * Math.sin(t2 * 2.2) * e; p[I.cabZ] = 0.1 * Math.sin(t2 * 4.4) * e;
          p[I.alaL] = p[I.alaR] = 0.25 + 0.6 * w; p[I.alaXL] = p[I.alaXR] = 0.3 * e; p[I.abreL] = p[I.abreR] = w; p[I.pico] = 0.18 * Math.max(0, Math.sin(t2 * 4)) + 0.5 * w; p[I.cola] = 0.3 + 0.1 * Math.sin(t2 * 6);
        }
      } else if (est === 'pierde') {
        // Derrota caricaturesca: mareo grande con estrellitas → se desploma (rebota) → suspira cada 2,6 s, cabizbaja
        const tg = A.finT;
        const mar = Math.max(0, Math.min(1, (1.45 - tg) / 0.25));
        p[I.cabY] = 0.45 * Math.sin(T * 6) * mar; p[I.cabZ] = 0.35 * Math.cos(T * 6) * mar; p[I.alaL] = (0.45 + 0.15 * Math.sin(T * 7)) * mar; p[I.alaR] = (0.3 + 0.15 * Math.sin(T * 7 + 2)) * mar;
        p[I.pico] = 0.45 * mar; p[I.pecho] = 0.12 * mar; p[I.sy] = (-0.04 + 0.03 * Math.sin(T * 9)) * mar; p[I.cola] = -0.15 * mar;
        if (tg > 1.2) {
          const k = Math.min(1, (tg - 1.2) / 0.25), reb = tg > 1.45 && tg < 1.8 ? Math.sin(Math.PI * (tg - 1.45) / 0.35) : 0;
          const ts = tg - 2.1, cs = ts > 0 ? ts % 2.6 : -1;
          const aire = cs >= 0 && cs < 0.85 ? Math.sin(Math.PI / 2 * cs / 0.85) : cs >= 0.85 && cs < 1.5 ? Math.cos(Math.PI / 2 * (cs - 0.85) / 0.65) : 0;
          if (cs >= 0.85 && A.suspiro < Math.floor(ts / 2.6)) { A.suspiro = Math.floor(ts / 2.6); if (!barato()) fx('bubbles', f.pos.x, f.pos.y + 1.2, f.pos.z); }
          p[I.sy] += (-0.2 + 0.07 * reb + 0.06 * aire) * k; p[I.sx] += (0.12 - 0.04 * reb - 0.03 * aire) * k; p[I.pecho] += (0.5 - 0.15 * aire) * k; p[I.cabX] += 0.5 * k; p[I.cabZ] += 0.2 * k;
          p[I.alaL] += 0.9 * k; p[I.alaR] += 0.85 * k; p[I.alaXL] = p[I.alaXR] = -0.2 * k; p[I.abreL] = p[I.abreR] = 0.9 * k; p[I.cola] += -0.35 * k; p[I.pico] += (0.12 + 0.3 * aire) * k; p[I.alto] = -0.04 * k;
        }
      }
    }
    // ---- Después de ch.update: cada grupo manda sobre sus huesos (quita su parte de lo procedural) y se pone la pose ----
    // [hueso, ejes, grupo, fracción, solo la primera]: de la cabeza, el giro (Y) solo a medias, para que siga mirando a la
    // rival. De los hombros solo se quita la primera entrada (el aleteo de wingMode, lo primero de update()): el abanico de
    // ch.alas() (hombro, codo y plumas) se queda entero.
    const EJES = [['espalda2', ['x', 'y', 'z'], 0], ['cabeza', ['x', 'z'], 1], ['cabeza', ['y'], 1, 0.5], ['armL1', ['x', 'z'], 2, 1, true], ['armL1001', ['x', 'z'], 2, 1, true], ['espalda1001', ['x', 'z'], 3]];
    function huesos(ch, A) {
      const B = ch.bones; if (!B || !A) return;
      const t0 = performance.now(), out = A.out, m = A.manda, ofs = ch.ofs || [], n0 = ofs.length;
      for (const [nb, ejes, g, fr, primera] of EJES) {
        const b = B[nb], w = m[g] * (fr || 1); if (!b || w < 0.01) continue;
        for (const ax of ejes) { let s = 0; for (let i = 0; i < n0; i++) { const e = ofs[i]; if (e[0] === b && e[1] === ax) { s += e[2]; if (primera) break; } } if (s) ch.rot(b, ax, -s * w); }
      }
      const ps = (ch.headSign && ch.headSign.pitch) || 1;
      if (B.espalda2) { if (out[I.pecho]) ch.rot(B.espalda2, 'x', out[I.pecho]); if (out[I.pechoZ]) ch.rot(B.espalda2, 'z', out[I.pechoZ]); if (out[I.pechoY]) ch.rot(B.espalda2, 'y', out[I.pechoY]); }
      if (B.cabeza) { if (out[I.cabX]) ch.rot(B.cabeza, 'x', out[I.cabX] * ps); if (out[I.cabY]) ch.rot(B.cabeza, 'y', out[I.cabY]); if (out[I.cabZ]) ch.rot(B.cabeza, 'z', out[I.cabZ]); }
      if (B.armL1 && B.armL1001) {
        ch.rot(B.armL1, 'z', out[I.alaL]); ch.rot(B.armL1001, 'z', -out[I.alaR]);
        if (out[I.alaXL]) ch.rot(B.armL1, 'x', out[I.alaXL]);
        if (out[I.alaXR]) ch.rot(B.armL1001, 'x', out[I.alaXR]);
      }
      if (B.espalda1001) { if (out[I.cola]) ch.rot(B.espalda1001, 'x', out[I.cola]); if (out[I.colaZ]) ch.rot(B.espalda1001, 'z', out[I.colaZ]); }
      // Patas (extremidades): después del IK, así que la que patea se despega del suelo y la de apoyo sigue plantada. «pies»
      // las abre un poco (Z, como el ajuste de las aletas de character.js): pocos grados, el pie casi no sube.
      if (B.pieL1 && B.pieL1001) {
        if (out[I.piernaL]) ch.rot(B.pieL1, 'x', out[I.piernaL]); if (out[I.piernaR]) ch.rot(B.pieL1001, 'x', out[I.piernaR]);
        if (out[I.rodL] && B.pieL2) ch.rot(B.pieL2, 'x', out[I.rodL]); if (out[I.rodR] && B.pieL2001) ch.rot(B.pieL2001, 'x', out[I.rodR]);
        if (out[I.pies]) { ch.rot(B.pieL1, 'z', out[I.pies]); ch.rot(B.pieL1001, 'z', -out[I.pies]); }
      }
      // Sin la API de character.js: el hueso del pico a mano (−X abre: AUDITORIA_ANIMACION_COMBATE.md §4)
      if (!A.picoApi && B.pico && A.pico > 0.01) ch.rot(B.pico, 'x', -0.55 * A.pico);
      medir(t0);
    }
    // Al salir del duelo: la escala de la raíz vuelve y el pico y las alas se sueltan
    function soltar(ch, f, escalaAbs) {
      const A = f && f.anima2, E = ch && ch._c2esc;
      if (E && ch.root && !escalaAbs) { ch.root.scale.x /= E.sx; ch.root.scale.y /= E.sy; ch.root.scale.z /= E.sx; }
      if (E) E.sx = E.sy = 1;
      if (!A) return;
      if (ch && typeof ch.pico === 'function') try { ch.pico(0); } catch (e) { /* api */ }
      if (ch && typeof ch.alas === 'function') try { ch.alas(null); } catch (e) { /* api */ }
      if (ch && A.agacho) ch.agachada = 0;
      f.anima2 = null;
    }
    function medir(t0) {
      const fr = R && R.renderer && R.renderer.info && R.renderer.info.render ? R.renderer.info.render.frame : -1;
      perf.ms += performance.now() - t0; perf.n++;
      if (fr < 0 || fr !== perf.ultimo) { perf.ultimo = fr; if (fr >= 0) perf.cuadros++; }
    }
    const perfApi = () => ({ ms: +perf.ms.toFixed(3), llamadas: perf.n, cuadros: perf.cuadros, msPorCuadro: perf.cuadros ? +(perf.ms / perf.cuadros).toFixed(4) : null, reiniciar() { perf.ms = perf.n = perf.cuadros = 0; } });
    return { on: c2On, antes, huesos, soltar, accion, golpe, dtVis, pasoReloj, despues, famDe, estadoDe, ESTADOS, FAM, REAC, I, K, perf: perfApi, get parada() { return paradaT; } };
  })();
  // ---------- Combate 2.0 · las 4 extremidades y los combos (Kelvin 10-nov: «añadir más controles para mover ala izquierda,
  // ala derecha, pierna izquierda, pierna derecha y poder crear combos») · para todos (?combate2=0 lo apaga) ----------
  // - Cada extremidad tiene su golpe corto con pose propia: aletazo de lado (el ala izquierda barre hacia la derecha y empuja
  //   a la otra hacia ese lado; la derecha, al revés: alternar sirve para colocarse) y patadita (más corta y más rápida).
  // - Reglas de plumas de siempre (H.recibir de habilidades.js: escudo, invulnerabilidad, mareo y empujón): un golpe que entra
  //   quita 1 pluma y la otra queda mareada e invulnerable un momento. Mientras siga invulnerable, los golpes siguientes (los de
  //   una cadena y el remate de un combo) no quitan plumas: la empujan y la sujetan, pero la sueltan ESCAPE s antes de que deje
  //   de ser invulnerable (el mismo hueco para escapar que deja hoy el aletazo): sin cadenas infinitas.
  // - Combos: entradas seguidas con menos de VENTANA s entre una y otra (con «Combos sin prisa», VENTANA_LENTA). El remate
  //   sale con su animación, efecto, sonido y su nombre grande en pantalla, empuja más y carga energía (+energia, para el
  //   poder); si nada de la cadena había entrado, quita la pluma. Luego quien lo hizo queda RECUPERANDO (rec: no hace nada
  //   salvo su poder): la rival lo puede castigar. Así un combo quita lo mismo que un golpe: lo que da es empuje, sitio y poder.
  // - «¡Bomba Boricua!»: el remate de remates. Justo después de un combo, el poder de la especie (Grito, Canto…) sale como
  //   siempre (su coste, su espera y su efecto) y además con nombre, efecto y sonido de remate.
  // - La IA (combate.js) usa extremidades y combos según su etapa (EXT_IA): Aprendiz casi nunca, Maestro más; telegrafiados.
  // Equilibrio y tiempos medidos en AV.v18CombateTest («C2 · extremidades…»).
  const EXT_K = ['alaIzq', 'alaDer', 'pataIzq', 'pataDer'];
  const EXT = {
    alaIzq: { tipo: 'ala', lado: 1, alcance: 2.3, empuje: 6, mareo: 0.7, cd: 0.5, nombre: 'Ala izquierda', corto: 'Ala izq.' },
    alaDer: { tipo: 'ala', lado: -1, alcance: 2.3, empuje: 6, mareo: 0.7, cd: 0.5, nombre: 'Ala derecha', corto: 'Ala der.' },
    pataIzq: { tipo: 'pata', lado: 1, alcance: 1.75, empuje: 4, mareo: 0.7, cd: 0.42, nombre: 'Pata izquierda', corto: 'Pata izq.' },
    pataDer: { tipo: 'pata', lado: -1, alcance: 1.75, empuje: 4, mareo: 0.7, cd: 0.42, nombre: 'Pata derecha', corto: 'Pata der.' }
  };
  const EXT_BLOQUEO = 0.2, VENTANA = 0.6, VENTANA_LENTA = 1.2, ESCAPE = 0.25; // ESCAPE: el hueco de inv + 0,25 de H.recibir
  // sec: cada forma de hacerlo (la cola de las entradas). imp: segundo del golpe del remate; rec: lo que tarda en poder volver
  // a hacer algo (cuenta desde la entrada); energia: la que carga para el poder.
  const COMBOS = [
    { id: 'abanicazo', nombre: '¡Abanicazo!', sec: [['alaIzq', 'alaDer'], ['alaDer', 'alaIzq']], energia: 15, imp: 0.2, rec: 0.75, empuje: 9, mareo: 0.9, alcance: 2.5, fx: 'abanico', como: 'Las dos alas, una y otra' },
    { id: 'patita', nombre: '¡Patita Sabrosa!', sec: [['pataIzq', 'pataDer'], ['pataDer', 'pataIzq']], energia: 15, imp: 0.24, rec: 0.75, empuje: 7, mareo: 0.9, alcance: 2.0, fx: 'polvo', como: 'Las dos patas, una y otra' },
    { id: 'cruzaito', nombre: '¡Cruzaíto!', sec: [['alaIzq', 'pataDer'], ['alaDer', 'pataIzq']], energia: 15, imp: 0.16, rec: 0.7, empuje: 8, mareo: 0.9, alcance: 2.3, fx: 'chispas', como: 'Un ala y la pata del otro lado' },
    { id: 'revolu', nombre: '¡Revolú de Plumas!', sec: [['alaIzq', 'alaIzq', 'pataIzq'], ['alaIzq', 'alaIzq', 'pataDer'], ['alaDer', 'alaDer', 'pataIzq'], ['alaDer', 'alaDer', 'pataDer']], energia: 20, imp: 0.34, rec: 1.0, empuje: 11, mareo: 1.0, alcance: 2.6, fx: 'remolino', como: 'La misma ala dos veces y una pata' },
    { id: 'coqui', nombre: '¡Brinco Coquí!', sec: [['pataIzq', 'pataIzq', 'alaIzq'], ['pataIzq', 'pataIzq', 'alaDer'], ['pataDer', 'pataDer', 'alaIzq'], ['pataDer', 'pataDer', 'alaDer']], energia: 20, imp: 0.36, rec: 1.05, empuje: 10, mareo: 1.0, alcance: 2.6, fx: 'brinco', como: 'La misma pata dos veces y un ala' },
    { id: 'bomba', nombre: '¡Bomba Boricua!', remate: true, fx: 'bomba', como: 'Después de un combo, ¡tu poder!' }
  ];
  const COMBO = {}; COMBOS.forEach((c, i) => { c.n = i; COMBO[c.id] = c; });
  // Cuánto usa la Campeona sus extremidades según su etapa: usa = en vez del aletazo de siempre; combo = sigue con un combo
  // si la primera entra; aviso = su telegrafía (s). Aprendiz casi nunca; Maestro más.
  const EXT_IA = { aprendiz: { usa: 0.12, combo: 0.08, aviso: 0.4 }, despertar: { usa: 0.22, combo: 0.18, aviso: 0.36 }, guardian: { usa: 0.32, combo: 0.32, aviso: 0.34 },
    maestro: { usa: 0.42, combo: 0.45, aviso: 0.32 }, clasica: { usa: 0.2, combo: 0.15, aviso: 0.4 } };
  const VENTANA_CLAVE = 'av_combos_sin_prisa';
  const sinPrisa = () => { try { return localStorage.getItem(VENTANA_CLAVE) === '1'; } catch (e) { return false; } };
  const ventanaCombo = () => (sinPrisa() ? VENTANA_LENTA : VENTANA);
  function ponerSinPrisa(on) { try { if (on) localStorage.setItem(VENTANA_CLAVE, '1'); else localStorage.removeItem(VENTANA_CLAVE); } catch (e) { /* sin almacenamiento */ } }
  function buscarCombo(cad) {
    let mejor = null;
    for (const c of COMBOS) if (c.sec) for (const q of c.sec) {
      if (q.length > cad.length || (mejor && q.length <= mejor.largo)) continue;
      let ok = true; for (let i = 0; i < q.length; i++) if (cad[cad.length - q.length + i] !== q[i]) { ok = false; break; }
      if (ok) mejor = { c, largo: q.length, q };
    }
    return mejor;
  }
  // Motor de extremidades (uno por duelo: este y el de 2 jugadores). cfg: { lucha(), otro(f), golpear(de, blanco, g),
  // despues(s, fn), t(), anunciar(f, combo), fx, sonar, alUsar(f, k, r) }
  function crearExt(cfg) {
    const st = f => f.ext || (f.ext = { cad: [], ultT: -9, bloq: 0, rec: 0, buf: '', bufT: 0, cd: {}, conecto: -9, combo: null, comboT: -9, usos: 0, combos: {}, remates: 0, plan: [], ultimo: '' });
    const lado = d => ({ x: -d.z, z: d.x }); // la derecha de quien mira hacia d
    // Quien recupera de un combo no hace nada (ni ala, ni semilla), salvo su poder justo después (el remate)
    function bloquea(f, id) { const X = f && f.ext; return !!(X && X.rec > 0 && !(id && id === f.poder && X.combo)); }
    function usar(f, k, o) {
      if (!c2On() || !f || !EXT[k] || !cfg.lucha()) return { ok: false, motivo: 'fase' };
      if (f.mareo > 0 || f.deslumbrada > 0) return { ok: false, motivo: 'mareo' };
      const X = st(f);
      if (X.rec > 0) return { ok: false, motivo: 'recupera' };
      if (X.bloq > 0 || (X.cd[k] || 0) > 0) { X.buf = k; X.bufT = 0.35; return { ok: true, buffer: true, k }; } // en cola: sale en cuanto pueda
      return hacer(f, k, o);
    }
    function hacer(f, k, o) {
      const X = st(f), E = EXT[k], otro = cfg.otro(f), now = cfg.t(), W = cfg.ventana(f);
      if (now - X.ultT > W) X.cad.length = 0;
      X.cad.push(k); if (X.cad.length > 4) X.cad.shift();
      X.ultT = now; X.bloq = EXT_BLOQUEO; X.cd[k] = E.cd; X.usos++; X.ultimo = k;
      const m = buscarCombo(X.cad);
      if (m) return remate(f, k, m.c, otro, m.q);
      C2.accion(f, 'ext_' + E.tipo, { fam: 'ext_' + E.tipo, lado: E.lado });
      cfg.sonar(E.tipo === 'ala' ? 'ext_ala' : 'ext_pata', E.lado);
      const r = { ok: true, k, acierto: false, combo: null };
      if (otro && H.dist(f, otro) <= E.alcance) {
        const d = H.dirA(f, otro), l = lado(d), s = E.tipo === 'ala' ? E.lado : 0; // ala izquierda → empuja a su derecha
        const dir = { x: d.x * 0.55 + l.x * s * 0.85, z: d.z * 0.55 + l.z * s * 0.85 }, n = Math.hypot(dir.x, dir.z) || 1; dir.x /= n; dir.z /= n;
        const g = conInv(otro, { plumas: 1, empuje: E.empuje, mareo: Math.max(E.mareo, f.ia ? 0 : Math.min(1.1, W * 0.9)), dir }, 2.5);
        r.acierto = !!cfg.golpear(f, otro, g); r.sujeta = !g.plumas;
        if (r.acierto) X.conecto = now;
      }
      if (cfg.alUsar) cfg.alUsar(f, k, r);
      return r;
    }
    // Mientras la otra sigue invulnerable por un golpe anterior: sin plumas, empuje propio y sujeta solo hasta ESCAPE s antes
    // de que se le pase la invulnerabilidad (forzar: si no, H.recibir no la empuja). Si no, el golpe tal cual (1 pluma).
    function conInv(otro, g, empuje) {
      if (!(otro.inv > 0)) return g;
      return { plumas: 0, empuje, mareo: Math.max(0, Math.min(g.mareo, otro.inv - ESCAPE)), forzar: true, dir: g.dir, combo: g.combo };
    }
    function remate(f, k, cb, otro, q) {
      const X = st(f), now = cfg.t();
      X.cad.length = 0; X.rec = cb.rec; X.buf = ''; X.combo = cb; X.comboT = now; X.combos[cb.id] = (X.combos[cb.id] || 0) + 1;
      f.energia = Math.min(f.energiaMax || 100, f.energia + (cb.energia || 0)); // el combo carga el poder
      // Hacia qué lado va la pose: el Cruzaíto y el Revolú siguen al ala con que empiezan (la izquierda es la pose; la derecha, su espejo)
      const lado = (cb.id === 'cruzaito' || cb.id === 'revolu') && q ? EXT[q[0]].lado : 1;
      C2.accion(f, 'combo_' + cb.id, { fam: 'combo_' + cb.id, lado });
      cfg.anunciar(f, cb); cfg.sonar('combo', cb.n); cfg.fxCombo(f, cb, 0);
      // Si la tiene a tiro y sin escudo, la sujeta mientras carga el remate (con el mismo hueco para escapar de siempre)
      if (otro && !(otro.escudo > 0) && H.dist(f, otro) <= cb.alcance + 0.4) {
        const quiere = cb.imp + 0.12, m = otro.inv > 0 ? Math.min(quiere, otro.inv - ESCAPE) : quiere;
        if (m > 0) otro.mareo = Math.max(otro.mareo || 0, m);
      }
      cfg.despues(cb.imp, () => {
        if (!cfg.lucha() || f.mareo > 0) return; // la cortaron antes del golpe
        cfg.fxCombo(f, cb, 1);
        if (!otro || H.dist(f, otro) > cb.alcance) return;
        const d = H.dirA(f, otro), g = conInv(otro, { plumas: 1, empuje: cb.empuje, mareo: cb.mareo, dir: { x: d.x, z: d.z }, combo: cb.id }, cb.empuje);
        if (cfg.golpear(f, otro, g)) { X.conecto = cfg.t(); X.remates = (X.remates || 0) + 1; }
      });
      const r = { ok: true, k, acierto: false, combo: cb.id };
      if (cfg.alUsar) cfg.alUsar(f, k, r);
      return r;
    }
    // El poder justo después de un combo: «¡Bomba Boricua!» (el poder es el de siempre; esto es solo el remate que se ve)
    function alPoder(f, id) {
      const X = f && f.ext; if (!c2On() || !X || !X.combo || id !== f.poder) return false;
      if (cfg.t() - X.comboT > X.combo.rec + cfg.ventana(f)) { X.combo = null; return false; }
      const cb = COMBO.bomba; X.combo = null; X.rec = 0; X.combos.bomba = (X.combos.bomba || 0) + 1;
      cfg.anunciar(f, cb); cfg.sonar('combo', cb.n); cfg.fxCombo(f, cb, 1);
      if (cfg.alUsar) cfg.alUsar(f, 'poder', { ok: true, combo: 'bomba' });
      return true;
    }
    function paso(f, dt) {
      const X = f && f.ext; if (!X) return;
      X.bloq = Math.max(0, X.bloq - dt); X.rec = Math.max(0, X.rec - dt); X.bufT = Math.max(0, X.bufT - dt);
      for (const k in X.cd) X.cd[k] = Math.max(0, X.cd[k] - dt);
      if (X.combo && cfg.t() - X.comboT > X.combo.rec + cfg.ventana(f)) X.combo = null;
      if (X.buf && !X.bufT) X.buf = '';
      if (X.buf && X.bloq <= 0 && !((X.cd[X.buf] || 0) > 0) && X.rec <= 0 && !(f.mareo > 0) && cfg.lucha()) { const k = X.buf; X.buf = ''; hacer(f, k); }
    }
    return { usar, paso, bloquea, alPoder, st };
  }
  // ---- Este duelo (contra la Campeona): el motor de extremidades, su HUD, sus sonidos y sus efectos ----
  const EXT_TECLA = { alaIzq: 'u', alaDer: 'o', pataIzq: 'j', pataDer: 'l' }; // de fábrica (input.js las deja cambiar en «Teclas»)
  const teclaExt = a => { try { const m = G.input && G.input.mapa; if (m && m[a]) return m[a]; } catch (e) { /* sin mapa */ } return EXT_TECLA[a]; };
  const EXM = crearExt({
    lucha: () => C.fase === 'lucha' && !combosAbierta(),
    otro: f => (f === C.j ? C.r : C.j),
    golpear: (de, bl, g) => golpear(de, bl, g),
    despues: (s, fn) => C.timers.push({ t: s, fn }),
    t: () => C.tLucha || 0,
    ventana: f => (f && f.ia ? VENTANA : ventanaCombo()),
    anunciar: (f, cb) => anunciarCombo(f, cb),
    fxCombo: (f, cb, fase) => { const o = f === C.j ? C.r : C.j; fxCombo(f, cb, fase, o, f === C.j || o === C.j); },
    sonar,
    alUsar: (f, k, r) => { const s = C.stats; s[f.ia ? 'extIA' : 'extJ'] = (s[f.ia ? 'extIA' : 'extJ'] || 0) + (k === 'poder' ? 0 : 1); if (r.combo) s[f.ia ? 'combosIA' : 'combosJ'] = (s[f.ia ? 'combosIA' : 'combosJ'] || 0) + 1; if (!f.ia) alUsarExt(k, r); }
  });
  // Sonidos procedurales (G.audio.define: audio.js no cambia). ext_ala: soplo de ala; ext_pata: golpecito; combo (n = combo):
  // arpegio que sube y un «¡fiu!»; la Bomba Boricua, tres golpes de barril de bomba y el arpegio arriba.
  if (G.audio && G.audio.define && !(G.audio.has && G.audio.has('combo'))) {
    G.audio.define('ext_ala', (t, l, A) => { A.noise(t, 0.16, { type: 'bandpass', freq: 1500, to: 340, q: 0.9, gain: 0.16 }); A.noise(t + 0.05, 0.09, { type: 'lowpass', freq: 620, gain: 0.08 }); });
    G.audio.define('ext_pata', (t, l, A) => { A.tone(175, t, 0.1, { type: 'triangle', to: 82, gain: 0.17 }); A.noise(t, 0.05, { type: 'bandpass', freq: 2600, q: 1.5, gain: 0.08 }); });
    G.audio.define('combo', (t, n, A) => {
      n = n | 0; const base = 392 * (1 + 0.05 * n);
      if (n === 5) { [0, 0.16, 0.24].forEach((d, k) => { A.tone(k === 1 ? 150 : 104, t + d, 0.2, { type: 'sine', to: 70, gain: 0.2 }); A.noise(t + d, 0.06, { type: 'bandpass', freq: 1800, q: 1.2, gain: 0.12 }); }); t += 0.34; }
      [0, 2, 4, 7].forEach((i, k) => A.tone(A.pent(i + n, base), t + k * 0.055, 0.2, { type: 'square', gain: 0.045 }));
      A.tone(A.pent(9 + n, base), t + 0.24, 0.42, { type: 'triangle', gain: 0.12 }); A.tone(760, t + 0.24, 0.3, { type: 'sine', to: 1520, gain: 0.05 });
      A.noise(t, 0.3, { freq: 700, to: 2800, q: 0.8, gain: 0.1 });
    });
  }
  // Efectos de cada combo: al empezar (fase 0) un brillo; en el golpe (fase 1), su ráfaga (fx.js y fx_poderes.js) y un temblor
  function fxCombo(f, cb, fase, o, cam) {
    const p = f.pos, q = o ? o.pos : p, mx = (p.x + q.x) / 2, mz = (p.z + q.z) / 2, y = p.y + 1;
    const v18 = (t, x, yy, z, n) => { try { if (G.v18fx && G.v18fx.combo) G.v18fx.combo(t, x, yy, z, n); } catch (e) { /* efecto */ } };
    if (fase === 0) { fx('gold', p.x, p.y + 1.7, p.z); v18(cb.fx, p.x, p.y + 0.9, p.z, 5); return; }
    const tipos = { abanico: ['feathers', 'ring'], polvo: ['dust', 'leaves'], chispas: ['gold', 'feathers'], remolino: ['feathers', 'leaves'], brinco: ['dust', 'leaves'], bomba: ['stars', 'gold'] }[cb.fx] || ['feathers'];
    for (const t of tipos) fx(t, t === 'ring' ? mx : q.x, t === 'ring' ? p.y + 0.3 : y, t === 'ring' ? mz : q.z);
    if (cb.fx === 'bomba' || cb.fx === 'brinco') fx('ring', p.x, p.y + 0.2, p.z);
    v18(cb.fx, mx, y, mz, 10);
    if (cam && G.camara && G.camara.shake && !(R && R.REDUCED)) G.camara.shake(0.07, 0.18);
  }
  // Nombre grande del combo en pantalla (1,3 s; el de la Campeona, más pequeño y azul)
  let comboVis = 0;
  function anunciarCombo(f, cb) {
    if (!hud) return; hudExt(); const e = hud.q('combo'); if (!e) return;
    e.textContent = ''; const b = document.createElement('b'); b.textContent = cb.nombre; e.appendChild(b);
    if (f.ia) { const s = document.createElement('small'); s.textContent = TXT.comboRival; e.appendChild(s); }
    e.className = 'vd-combo c-' + cb.id + (f.ia ? ' rival' : ''); e.hidden = false; void e.offsetWidth; e.classList.add('sale');
    e.dataset.id = cb.id; comboVis = 1.3; // se va con el tiempo de juego (paso); al salir o reiniciar, también
  }
  function usarExtJ(k) {
    if (C.fase !== 'lucha' || !C.j || combosAbierta()) return { ok: false, motivo: 'fase' };
    const r = EXM.usar(C.j, k); pintarExt(); return r;
  }
  // HUD de las extremidades (solo con la bandera; se crea la primera vez que hace falta): chips con su tecla en el escritorio,
  // un 2×2 de botones en táctil (arriba las alas, abajo las patas; izquierda y derecha como en la cotorra, ≥ 48 px) que se
  // coloca encima de los botones grandes (Acción, Impulso, Saltar, Volar) sin tapar ninguno, el nombre del combo y la carta
  // «Combos» (lista, «Combos sin prisa» y pausa del duelo mientras está abierta).
  let cartaC = false;
  const combosAbierta = () => cartaC;
  function secHtml(c) {
    const k = a => `<kbd class="vd-k-${EXT[a].tipo}${EXT[a].lado < 0 ? ' der' : ''}">${TACTIL ? EXT[a].corto : teclaExt(a).toUpperCase() + ' · ' + EXT[a].corto}</kbd>`;
    return c.sec ? c.sec[0].map(k).join('<i>→</i>') : `<kbd class="vd-k-combo">${TXT.unCombo}</kbd><i>→</i><kbd class="vd-k-poder">${TXT.tuPoder}</kbd>`;
  }
  // Estilos del HUD de extremidades y combos (también los usa el nombre del combo del duelo de 2: #v18-duelo2)
  function cssExt() {
    if (document.getElementById('v18-duelo-ext-css')) return;
    const st = document.createElement('style'); st.id = 'v18-duelo-ext-css';
    st.textContent = '#v18-duelo .vd-ext{display:inline-flex;gap:6px;margin-left:6px}#v18-duelo .vd-ext[hidden]{display:none}' +
      '#v18-duelo button.vd-x{padding:6px 8px 6px 10px}#v18-duelo .vd-x-der::before,#v18-duelo-ext .der::before{transform:scaleX(-1)}' +
      '#v18-duelo button.vd-combos-b{display:flex;align-items:center;gap:5px;margin:6px 0 0 auto;min-height:36px;padding:4px 10px;font-size:13px;background:#ffd6f0;--icon-size:16px}#v18-duelo.tactil button.vd-combos-b{min-height:48px;font-size:14px}#v18-duelo button.vd-combos-b[hidden]{display:none!important}' +
      ':is(#v18-duelo,#v18-duelo2) .vd-combo{position:fixed;left:0;right:0;top:34%;text-align:center;pointer-events:none;z-index:42}:is(#v18-duelo,#v18-duelo2) .vd-combo[hidden]{display:none}' +
      ':is(#v18-duelo,#v18-duelo2) .vd-combo b{display:inline-block;font:700 clamp(34px,9vw,64px)/1.05 Fredoka,system-ui,sans-serif;color:#fff6c8;-webkit-text-stroke:2px #7a3b00;paint-order:stroke;text-shadow:0 4px 0 #b4560a,0 8px 18px #0008;letter-spacing:.5px;padding:0 12px}' +
      ':is(#v18-duelo,#v18-duelo2) .vd-combo small{display:block;font-size:18px;font-weight:700;color:#cfeeff;text-shadow:0 2px 4px #000a}' +
      ':is(#v18-duelo,#v18-duelo2) .vd-combo.rival b{font-size:clamp(24px,6vw,40px);color:#dff4ff;-webkit-text-stroke:2px #0b3d66;text-shadow:0 3px 0 #1d6fa8,0 6px 14px #0008}' +
      ':is(#v18-duelo,#v18-duelo2) .vd-combo.c-bomba b{color:#ffffff;-webkit-text-stroke:2px #8a1010;text-shadow:0 4px 0 #d6403a,0 8px 0 #0a50a1,0 12px 20px #0008}' +
      ':is(#v18-duelo,#v18-duelo2) .vd-combo.c-revolu b{color:#d9ffe0;-webkit-text-stroke:2px #1f6a37}:is(#v18-duelo,#v18-duelo2) .vd-combo.c-coqui b{color:#e9ffb8;-webkit-text-stroke:2px #3a6a10}' +
      ':is(#v18-duelo,#v18-duelo2) .vd-combo.sale b{animation:vdCombo .5s cubic-bezier(.2,1.6,.4,1)}@keyframes vdCombo{0%{transform:scale(.3) rotate(-6deg);opacity:0}60%{transform:scale(1.12) rotate(2deg);opacity:1}100%{transform:none}}' +
      '@media (prefers-reduced-motion: reduce){:is(#v18-duelo,#v18-duelo2) .vd-combo.sale b{animation:none}}' +
      '#v18-duelo .vd-cc{position:fixed;left:0;right:0;top:calc(env(safe-area-inset-top,0px) + 70px);margin:auto;width:min(440px,calc(100vw - 32px));max-height:calc(100dvh - 120px);overflow:auto;background:rgba(255,248,234,.97);color:#3b2a14;text-shadow:none;border-radius:18px;padding:12px 14px;box-shadow:0 6px 20px #0007;pointer-events:auto;z-index:43}' +
      '#v18-duelo .vd-cc[hidden]{display:none}#v18-duelo .vd-cc h3{margin:0 0 6px;font-size:22px}#v18-duelo .vd-cc ul{list-style:none;margin:0;padding:0;display:grid;gap:6px}' +
      '#v18-duelo .vd-cc li{background:#fff;border-radius:12px;padding:6px 10px;box-shadow:0 1px 3px #0002}#v18-duelo .vd-cc li b{display:block;font-size:17px;color:#7a3b00}' +
      '#v18-duelo .vd-cc li span{display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin:3px 0}#v18-duelo .vd-cc li small{font-size:13px;opacity:.85}' +
      '#v18-duelo .vd-cc kbd{font:700 13px/1 Fredoka,system-ui,sans-serif;padding:5px 8px;border-radius:8px;background:#3b2a14;color:#fff3d6}#v18-duelo .vd-cc kbd.vd-k-pata{background:#6b3f12}#v18-duelo .vd-cc kbd.vd-k-poder,#v18-duelo .vd-cc kbd.vd-k-combo{background:#8a1f6a}' +
      '#v18-duelo .vd-cc i{font-style:normal;font-weight:700}#v18-duelo .vd-cc label{display:flex;gap:8px;align-items:center;margin:8px 0;font-size:15px;font-weight:600;min-height:44px}#v18-duelo .vd-cc input{width:24px;height:24px}' +
      '#v18-duelo .vd-cc button{background:#3b2a14;color:#fff3d6;width:100%}' +
      '#v18-duelo-ext{position:fixed;z-index:39;display:grid;grid-template-columns:repeat(2,60px);grid-template-rows:repeat(2,60px);gap:8px;pointer-events:none}#v18-duelo-ext[hidden]{display:none}' +
      // Kelvin 10-nov («no encontraban los botones»): alto contraste, fondo oscuro semiopaco, borde claro, icono y nombre corto
      '#v18-duelo-ext button{pointer-events:auto;width:60px;height:60px;border-radius:18px;border:3px solid #fff3d6;padding:2px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font:700 12px/1 Fredoka,system-ui,sans-serif;color:#fff;background:rgba(20,70,40,.82);box-shadow:0 3px 0 #0b2a17,0 4px 12px #0007;text-shadow:0 1px 2px #000;--icon-size:26px;touch-action:none;-webkit-user-select:none;user-select:none}' +
      '#v18-duelo-ext button.pata{background:rgba(110,55,10,.85)}#v18-duelo-ext button::before{background:#fff}#v18-duelo-ext button:active,#v18-duelo-ext button.pulsa{transform:translateY(2px);box-shadow:0 1px 0 #0b2a17;background:#2e8b3e}#v18-duelo-ext button.cd{opacity:.65}';
    document.head.appendChild(st);
  }
  function hudExt() {
    if (!hud || hud.ext) return hud && hud.ext;
    cssExt();
    const el = hud.el, bot = hud.q('bot');
    const grupo = document.createElement('span'); grupo.className = 'vd-ext'; grupo.dataset.k = 'ext'; grupo.hidden = true;
    grupo.innerHTML = EXT_K.map(a => `<button class="vd-chip vd-x${EXT[a].lado < 0 ? ' vd-x-der' : ''}" data-x="${a}" data-icon="${EXT[a].tipo === 'ala' ? 'wing' : 'paw'}" type="button"><span>${EXT[a].corto}</span><kbd data-xk="${a}"></kbd><i class="vd-cdv"></i></button>`).join('');
    bot.appendChild(grupo);
    const cb = document.createElement('button'); cb.className = 'vd-combos-b'; cb.type = 'button'; cb.dataset.a = 'combos'; cb.dataset.k = 'combosB'; cb.dataset.icon = 'star'; cb.textContent = TXT.combos; cb.hidden = true;
    const como = hud.q('como'); como.after(cb);
    const nom = document.createElement('div'); nom.className = 'vd-combo'; nom.dataset.k = 'combo'; nom.hidden = true; nom.setAttribute('aria-live', 'polite');
    hud.q('centro').after(nom);
    const carta = document.createElement('div'); carta.className = 'vd-cc'; carta.dataset.k = 'cc'; carta.hidden = true; carta.setAttribute('role', 'dialog'); carta.setAttribute('aria-label', TXT.combos);
    el.appendChild(carta);
    carta.addEventListener('change', e => { if (e.target && e.target.dataset.a === 'sinPrisa') ponerSinPrisa(e.target.checked); });
    const pad = document.createElement('div'); pad.id = 'v18-duelo-ext'; pad.hidden = true;
    pad.innerHTML = EXT_K.map(a => `<button type="button" data-x="${a}" class="${EXT[a].tipo}${EXT[a].lado < 0 ? ' der' : ''}" data-icon="${EXT[a].tipo === 'ala' ? 'wing' : 'paw'}" aria-label="${EXT[a].nombre}">${EXT[a].corto}</button>`).join('');
    pad.addEventListener('pointerdown', e => {
      const b = e.target.closest && e.target.closest('button[data-x]'); if (!b) return;
      e.preventDefault(); e.stopPropagation(); b.classList.add('pulsa'); setTimeout(() => b.classList.remove('pulsa'), 120);
      usarExtJ(b.dataset.x);
    });
    const viejo = document.getElementById('v18-duelo-ext'); if (viejo) viejo.remove();
    document.body.appendChild(pad);
    el.addEventListener('pointerdown', e => { const b = e.target.closest && e.target.closest('button[data-x]'); if (!b || !el.contains(b)) return; e.preventDefault(); e.stopPropagation(); usarExtJ(b.dataset.x); }, true);
    hud.ext = { grupo, combosB: cb, nom, carta, pad };
    return hud.ext;
  }
  function abrirCombos(on) {
    const X = hudExt(); if (!X) return false;
    cartaC = !!on && c2On() && C.fase !== 'nada';
    if (cartaC) {
      X.carta.innerHTML = `<h3>${TXT.combos}</h3><ul>${COMBOS.map(c => `<li class="c-${c.id}"><b>${c.nombre}</b><span>${secHtml(c)}</span><small>${c.como}</small></li>`).join('')}</ul>` +
        `<label><input type="checkbox" data-a="sinPrisa"${sinPrisa() ? ' checked' : ''}> ${TXT.sinPrisa}</label><button type="button" data-a="cerrarCombos">${TXT.aPelear}</button>`;
    }
    X.carta.hidden = !cartaC; return cartaC;
  }
  // Cada cuadro (barato): qué se ve, teclas, recargas y dónde va el 2×2 táctil (encima de los botones grandes)
  function pintarExt() {
    if (!hud || !hud.ext) { if (hud && c2On() && C.fase !== 'nada') hudExt(); if (!hud || !hud.ext) return; }
    const X = hud.ext, on = c2On() && !hud.el.hidden && (C.fase === 'lucha' || C.fase === 'cuenta');
    X.grupo.hidden = !on || TACTIL; X.combosB.hidden = !on || !!ent;
    if (!on && cartaC) abrirCombos(false);
    const verPad = on && TACTIL && !cartaC; X.pad.hidden = !verPad;
    if (!on) { if (comboVis > 0) { comboVis = 0; X.nom.hidden = true; } return; }
    const f = C.j, E = f && f.ext;
    if (!TACTIL) for (const b of X.grupo.children) {
      const a = b.dataset.x, kb = b.querySelector('kbd'), t = teclaExt(a).toUpperCase(); if (kb.textContent !== t) kb.textContent = t;
      const cd = E ? Math.max(E.rec > 0 ? 1 : 0, (E.cd[a] || 0) / EXT[a].cd) : 0, pct = Math.round(Math.min(1, cd) * 20) * 5;
      if (b._pct !== pct) { b._pct = pct; b.style.setProperty('--cd', pct + '%'); b.classList.toggle('cd', pct > 0); }
    }
    if (verPad) {
      for (const b of X.pad.children) { const a = b.dataset.x, c = !!(E && (E.rec > 0 || (E.cd[a] || 0) > 0)); if (b._cd !== c) { b._cd = c; b.classList.toggle('cd', c); } }
      const acts = document.getElementById('acts'), r = acts && acts.getBoundingClientRect();
      if (r && r.width > 0) {
        const tag = hud.tags && hud.tags.querySelector('[data-t="b-dash"]'), tr = tag && !tag.hidden ? tag.getBoundingClientRect() : null;
        const s = sitioPad(r, tr && tr.height ? tr.top : r.top, innerWidth, X.pad.offsetWidth || 124, X.pad.offsetHeight || 124);
        X.pad.style.left = s.left + 'px'; X.pad.style.top = s.top + 'px';
      }
    }
  }
  // Dónde va el 2×2: encima de los botones grandes (#acts) y de la etiqueta de Impulso, pegado al borde de fuera (a la
  // derecha; en modo zurdo, a la izquierda), sin salirse de la pantalla. r: caja de #acts; arriba: lo más alto de lo que hay
  // encima (etiqueta de Impulso o el propio #acts); w, h: tamaño del 2×2.
  function sitioPad(r, arriba, vw, w, h) {
    const zurdo = r.left + r.width / 2 < vw / 2;
    const left = zurdo ? Math.max(8, r.left) : Math.min(vw - 8 - w, r.right - w);
    return { left: Math.round(left), top: Math.round(Math.max(8, Math.min(r.top, arriba) - 12 - h)), zurdo };
  }
  // Entreno (con la bandera): después del poder, dos combos (¡Abanicazo! y ¡Patita Sabrosa!)
  function alUsarExt(k, r) {
    if (!ent || ent.fin > 0) return;
    const P = pasosEnt()[ent.paso]; if (!P || P.id.indexOf('combo:') !== 0) return;
    if (r.combo === P.id.slice(6)) avanzarEntreno();
  }
  const vidaApi = { antes: vida, huesos: vidaHuesos, andar, andarAplicar, andarHuesos, AND, ESTADOS: VIDA_EST, VEL: VIDA_VEL, c2: C2,
    ext: { crear: crearExt, css: cssExt, fxCombo, EXT, EXT_K, COMBOS, COMBO, buscarCombo, VENTANA, VENTANA_LENTA, EXT_TECLA, teclaExt, ventana: ventanaCombo, sinPrisa, ponerSinPrisa, motor: EXM } };
  function dibujarRival(dt, vel, sinAnimar) {
    const ch = C.ch; if (!ch) return;
    const r = C.r, root = ch.root, now = performance.now() / 1000, lucha = C.fase === 'lucha';
    const prep = lucha ? r.prep : '';
    root.visible = true;
    // Saltito de los quiebros (solo se ve: la posición de juego no sube)
    const salto = r.saltoDur > 0 ? 0.32 * Math.sin(Math.PI * Math.min(1, r.saltoT / r.saltoDur)) : 0;
    const fin = C.fase === 'fin' ? (C.resultado === 'win' ? 'pierde' : 'gana') : '';
    // Mira a la jugadora: en la cuenta, en la lucha, al ganar y, esperando en la explanada, a quien se acerca (< 20 m)
    const cerca = C.fase === 'nada' && (S.pos.x - r.pos.x) ** 2 + (S.pos.z - r.pos.z) ** 2 < 400;
    const mira = !(r.mareo > 0) && fin !== 'pierde' && (lucha || C.fase === 'cuenta' || fin === 'gana' || cerca);
    if (mira) { if (C.fase === 'nada' || !C.j) mirarA.set(S.pos.x, S.pos.y + 1.2, S.pos.z); else mirarA.set(C.j.pos.x, C.j.pos.y + 1.2, C.j.pos.z); }
    // Andar: el cuerpo que se ve (ver andar()); en espera y mareada sigue el rumbo de juego (r.yaw)
    const libre = lucha && !(r.mareo > 0) && !fin;
    const enJuegoAire = r.lift.dura > 0 || r.saltoDur > 0 || r.mov.t > 0 || r.kb.t > 0;
    const O = andar(r, { x: r.pos.x, z: r.pos.z, yaw: libre ? null : r.yaw, mira: libre && C.j ? C.j.pos : null,
      encara: !!prep || r.golpeAnim > 0, ataque: !!prep, aire: enJuegoAire }, dt);
    r.yawVis = O.yaw;
    // du3: antes del aletazo retrocede un palmo (carga el golpe) y al soltarlo se lanza adelante (solo se ve)
    const carga = prep === 'golpe_ala' ? -0.16 * Math.min(1, Math.max(0, r.prepDur - r.prepT) / 0.18) : r.golpeAnim > 0 ? 0.22 * Math.sin(Math.PI * Math.min(1, r.golpeAnim / 0.3)) : 0;
    // Empujón sin saltito de juego: un traspié corto en el aire (no se arrastra por el suelo)
    const traspie = r.kb.t > 0 && !salto && !(r.lift.dura > 0) ? 0.1 * Math.sin(Math.PI * Math.min(1, (r.andar.aireT || 0) / 0.3)) : 0;
    root.position.set(O.x + Math.sin(O.yaw) * carga, r.pos.y + salto + traspie + O.alto, O.z + Math.cos(O.yaw) * carga);
    root.rotation.y = O.yaw;
    const kz = Math.min(1, dt * 10);
    root.rotation.z = r.mareo > 0 ? Math.sin(now * (r.finMareo > 0 ? 9 : 14)) * (r.finMareo > 0 ? 0.32 : 0.25) : root.rotation.z + ((prep === 'semilla' ? 0.16 : O.bank) - root.rotation.z) * kz; // tambaleo del mareo; ladea la cabeza al apuntar; en las curvas
    root.rotation.x += ((prep === 'semilla' ? 0.14 : prep ? 0 : O.lean) - root.rotation.x) * kz; // se inclina al arrancar y al apuntar, atrás al frenar
    if (sinAnimar) { ponerAviso(prep, now); return; } // CPU (móvil): colocada, pero sin animar el esqueleto este cuadro (ver dibujarQuieta)
    if (r.finMareo > 0 && azar() < dt * 5) fx('gold', r.pos.x, r.pos.y + 1.8, r.pos.z); // estrellitas del mareo final
    // Se agacha para el golpe. du3: es la pose «agachada bajo un toldo» de character.js (con 1 se tumba a 0,81 m); con 0,62
    // la Campeona quedaba casi tumbada en el suelo. Con 0,1 se inclina ~20° adelante y flexiona las patas (alas abiertas aparte).
    r.agacha += ((prep === 'golpe_ala' ? AGACHA_ALA : prep === 'semilla' ? AGACHA_SEMILLA : 0) - r.agacha) * Math.min(1, dt * 12);
    const enAire = O.airborne || r.lift.dura > 0 || r.saltoDur > 0, grande = r.lift.dura > 0 || r.saltoDur > 0 || r.mov.t > 0;
    const esc = !!(G.renderer && G.renderer.calidad && G.renderer.calidad.escuela);
    andarAplicar(ch, O, r, !fin);
    Object.assign(ch, { airborne: enAire, flying: false, legsDown: 0, swimming: false, diving: false,
      wingMode: r.alasT > 0 ? 'land' : r.golpeAnim > 0 ? 'flap' : prep === 'golpe_ala' ? 'preflare' : grande ? 'flap' : O.gait ? 'walk' : 'idle',
      expression: r.mareo > 0 ? 'surprised' : r.picoT > 0 || prep ? 'fight' : 'happy',
      mouth: r.picoT > 0 ? boca(r) : null, lookAt: mira ? mirarA : null, ikEscuela: esc,
      emote: null, posado: '', agachada: enAire ? 0 : r.agacha, groundY: ALTURA(r.pos), groundAt: esc ? null : sueloRival });
    const oV = { prep, prepK: prep && r.prepDur > 0 ? 1 - r.prepT / r.prepDur : 0, ataque: r.golpeAnim > 0, salto: r.saltoDur > 0 || r.mov.t > 0, vel: O.modo === 'quieta' ? 0 : O.speed, fin };
    if (c2On()) { // Combate 2.0: su máquina de estados en vez de vida()
      const V2 = C2.antes(ch, r, oV, dt);
      try { ch.update(C2.dtVis(dt)); C2.huesos(ch, V2); andarHuesos(ch, O); } catch (e) { /* animación */ }
    } else {
      if (ch._c2esc) C2.soltar(ch, r); // la bandera se apagó (pruebas): la escala vuelve
      const V = vida(ch, r, oV, dt);
      try { ch.update(dt); vidaHuesos(ch, V); andarHuesos(ch, O); } catch (e) { /* animación */ }
    }
    // Altura real de la cabeza sobre los pies (sigue al saltito, a la carga y a la pose), para el «!»
    const cab = ch.bones && ch.bones.cabeza;
    if (cab) { cab.getWorldPosition(cabezaV); C.cabezaAlto = cabezaV.y - r.pos.y; }
    ponerAviso(prep, now);
  }
  const sueloRival = (x, z) => G.terreno.height(x, z);
  // «!» a ~0,4 m sobre la coronilla (el hueso de la cabeza está en su base, ~0,8 m más abajo; du3: antes iba fijo a 2,25 m de los pies, muy por encima de la Campeona, y más aún agachada)
  const AGACHA_ALA = 0.1, AGACHA_SEMILLA = 0.03, AVISO_SOBRE = 0.9, cabezaV = new THREE.Vector3();
  function ponerAviso(prep, now) {
    if (!prep && !marcaAviso) return;
    const m = avisoSprite(), r = C.r; m.visible = !!prep;
    if (!prep) return;
    const ala = prep === 'golpe_ala' || prep.indexOf('ext:') === 0; // las extremidades de la Campeona se anuncian como su aletazo
    const s = (ala ? (prep === 'golpe_ala' ? 0.62 : 0.55) : 0.46) * (1 + 0.12 * Math.sin(now * 18));
    m.scale.set(s, s, 1); m.position.set(r.pos.x, r.pos.y + (C.cabezaAlto || 1.5) + AVISO_SOBRE + s / 2, r.pos.z);
    m.material.color.set(ala ? '#ff9d2e' : '#ffe066');
  }
  function pasoJugador(dt) {
    const j = C.j;
    if (j.remolino > 0) { M.vx = 0; M.vz = 0; } // Remolino: quieta mientras gira
    if (j.kb.t > 0) { j.kb.t -= dt; S.pos.x += j.kb.x * dt; S.pos.z += j.kb.z * dt; j.kb.x *= 0.88; j.kb.z *= 0.88; }
    if (j.mareo > 0) { M.vx *= 0.8; M.vz *= 0.8; if (G.fx && G.fx.burst && azar() < dt * 6) fx('gold', S.pos.x, S.pos.y + 1.7, S.pos.z); }
  }
  function pasoBalas(dt0) {
    for (let i = C.balas.length - 1; i >= 0; i--) {
      const b = C.balas[i], p = b.m.position;
      const blanco = b.de === C.j ? C.r : C.j;
      const dt = b.de && b.de.lenta > 0 ? dt0 * (b.de.lentaK || ((H.get('mirada_piton') || {}).lento || 0.5)) : dt0; // Mirada del Pitón / Ojo de manglar (lentaK: ×0,4): las semillas de la rival frenadas van más lento (también las que ya volaban)
      b.m.scale.setScalar(b.de && b.de.grande > 0 ? ((H.get('ojo_manglar') || {}).grande || 1.8) : (b.gorda || 1)); // Ojo de manglar: la semilla se dibuja grande mientras dura el efecto; Semilla de piña: la grande nace gorda
      if (blanco.marcada > 0 && !b.falla) { const hx = blanco.pos.x - p.x, hz = blanco.pos.z - p.z, hn = Math.hypot(hx, hz) || 1, v = Math.hypot(b.vx, b.vz), k = Math.min(1, dt * 6 * (blanco.marcaK || 1));
        b.vx += (hx / hn * v - b.vx) * k; b.vz += (hz / hn * v - b.vz) * k;
        b.vy += (((blanco.pos.y + 0.9) - p.y) / Math.max(0.15, hn / (v || 1)) - b.vy) * k; } // Ojo del cenote: la semilla busca a la marcada (también en altura: en la explanada en cuesta se iba por debajo)
      if (b.arco) { if (!b.arcoT) { b.arcoT = 1; b.vy = b.arco.vy; } b.vy -= b.arco.g * dt; } // Semilla de río: sale en arco y cae
      b.t += dt; p.x += b.vx * dt; p.y += b.vy * dt; p.z += b.vz * dt;
      const dx = p.x - blanco.pos.x, dy = p.y - (blanco.pos.y + 0.9), dz = p.z - blanco.pos.z, suelo = G.terreno.height(p.x, p.z);
      if (b.arco && b.botes > 0 && p.y < suelo && b.t < b.vida) { p.y = suelo; b.vy = Math.abs(b.vy) * b.arco.rebote; b.botes--; b.boto = (b.boto || 0) + 1; fx('leaves', p.x, suelo + 0.1, p.z); } // ...y bota dos veces
      let fin = b.t >= b.vida || p.y < suelo - 0.1;
      let porGolpe = false;
      if (!fin && dx * dx + dy * dy + dz * dz < b.radio * b.radio) {
        if (devolver(b, blanco)) continue; // Capa de palma / Pluma rebote: la semilla vuelve a quien la tiró
        golpear(b.de, blanco, Object.assign({ dir: { x: b.vx / 16, z: b.vz / 16 } }, b.golpe));
        if (b.drena) blanco.drena = Math.max(blanco.drena || 0, b.drena); // Plumas de aliso: la pluma se pega y roba energía
        fin = true; porGolpe = true;
      }
      if (fin) {
        if (b.pina && !porGolpe && C.fase === 'lucha') { // Semilla de piña: al caer (sin acertar) se abre en tres pequeñas
          const P = b.m.position, a0 = Math.atan2(b.vz, b.vx), abre = (H.get('semilla_pina') || {}).abre || 0.5, sueloP = G.terreno.height(P.x, P.z);
          for (let k = -1; k <= 1; k++) {
            const a = a0 + k * abre;
            lanzar({ de: b.de, x: P.x, y: Math.max(P.y, sueloP + 0.35), z: P.z, vx: Math.cos(a) * 13, vy: 1.6, vz: Math.sin(a) * 13,
              vida: 0.8, radio: 0.9, golpe: { plumas: 1, empuje: 2.5, mareo: 0.4 } });
          }
        }
        scene.remove(b.m); C.balas.splice(i, 1); if (C.fase !== 'lucha') return;
      }
    }
  }
  // Capa de palma (solo por delante, hacia donde mira quien la lleva) y Pluma rebote (de cualquier lado): la semilla cambia de
  // dueña y vuela hacia quien la tiró. Una semilla devuelta no se devuelve otra vez (un solo rebote).
  function devolver(b, f) {
    if (b.devuelta || !b.de || b.de === f || C.fase !== 'lucha') return false;
    const quien = b.de, v = Math.hypot(b.vx, b.vz) || 1;
    let como = null;
    if (f.capa > 0) { const m = H.mira(f, quien); if ((-b.vx * m.x - b.vz * m.z) / v >= ((H.get('capa_palma') || {}).cono || 0.3)) como = 'capa'; }
    if (!como && f.rebote > 0) como = 'rebote';
    if (!como) return false;
    if (como === 'capa') { f.capa = 0; f.alasT = 0; } else f.rebote = 0;
    const p = b.m.position, dx = quien.pos.x - p.x, dz = quien.pos.z - p.z, d = Math.hypot(dx, dz) || 1, vel = Math.max(16, v);
    Object.assign(b, { de: f, devuelta: como, falla: false, arco: null, botes: 0, t: 0, vx: dx / d * vel, vz: dz / d * vel,
      vy: ((quien.pos.y + 0.9) - p.y) / Math.max(0.15, d / vel), vida: d / vel + 0.6 });
    C.stats.devueltas = (C.stats.devueltas || 0) + 1;
    fx(como === 'capa' ? 'leaves' : 'feathers', p.x, p.y, p.z); sonar('ring', 2); flotante(como === 'capa' ? TXT.capa : TXT.rebote, 1.0);
    emitir({ tipo: 'hit', de: quien.id, a: f.id, valor: 0, devuelta: como });
    return true;
  }
  // Plumas de manglar: las plumas sembradas en el suelo esperan un pie (14 s); el primero que pisa (menos quien las
  // plantó) queda más lento 2,8 s y la pluma se gasta. Sin azar(): no cambia las decisiones de la IA en las pruebas.
  function pasoTrampas(dt) {
    for (let i = C.trampas.length - 1; i >= 0; i--) {
      const tr = C.trampas[i];
      tr.t -= dt;
      if (tr.t <= 0) { C.trampas.splice(i, 1); continue; }
      for (const f of [C.j, C.r]) {
        if (!f || f === tr.de || f.pesada > 0) continue; // una pluma basta; no se reaplica por cuadro
        if (Math.hypot(f.pos.x - tr.x, f.pos.z - tr.z) > 0.95) continue;
        f.pesada = (H.get('plumas_manglar') || {}).lenta || 2.8;
        fx('feathers', tr.x, f.pos.y + 0.5, tr.z); sonar('ring', 2);
        C.trampas.splice(i, 1);
        break;
      }
    }
  }
  // Los estados de los poderes de coste M bajan con el tiempo de juego; mientras duran, un brillo de los efectos que ya
  // existen (dorado sobre la rival vista, hojas, plumas). Sin azar(): no cambia las decisiones de la IA en las pruebas.
  function pasoNuevos(f, dt) {
    if (!f) return;
    for (const k of ['capa', 'rebote', 'hojas', 'vista', 'remolino', 'drena', 'vistacumbre']) if (f[k] > 0) f[k] = Math.max(0, f[k] - dt);
    if (f.drena > 0) f.energia = Math.max(0, f.energia - ((H.get('plumas_aliso') || {}).quita || 7) * dt); // Plumas de aliso: robo de energía
    if (!(f.vista > 0 || f.hojas > 0 || f.rebote > 0 || f.capa > 0 || f.remolino > 0 || f.drena > 0 || f.vistacumbre > 0)) { f.fxT = 0; return; }
    f.fxT = (f.fxT || 0) - dt; if (f.fxT > 0) return;
    f.fxT = 0.3; C.stats.brillos = (C.stats.brillos || 0) + 1;
    if (f.vista > 0) { fx('gold', f.pos.x, f.pos.y + 1.2, f.pos.z); fx('gold', f.pos.x, f.pos.y + 2.0, f.pos.z); }
    if (f.vistacumbre > 0) fx('gold', f.pos.x, f.pos.y + 1.6, f.pos.z); // Vista de cumbre: brillo propio mientras dura
    if (f.hojas > 0 || f.capa > 0 || f.remolino > 0) fx('leaves', f.pos.x, f.pos.y + 0.9, f.pos.z);
    if (f.rebote > 0 || f.drena > 0) fx('feathers', f.pos.x, f.pos.y + 1.3, f.pos.z);
  }
  // Un paso del duelo (lo llama el bucle del juego; las pruebas lo llaman con dt fijo)
  function paso(dt) {
    if (!(G.v18duelo2 && G.v18duelo2.estado().fase !== 'nada')) C2.pasoReloj(dt); // hit-stop visual (en el duelo de 2 lo lleva duelo2.js)
    if (C.fase === 'nada') { if (C.ch) dibujarQuieta(dt, moverRivalQuieta(dt)); return; }
    if (apoyoT > 0) { apoyoT -= dt; if (apoyoT <= 0 && hud) hud.q('apoyo').hidden = true; }
    if (centroT > 0) { centroT -= dt; if (centroT <= 0 && hud && C.fase !== 'cuenta') hud.q('centro').textContent = ''; }
    if (C.fase === 'cuenta') {
      C.cuenta -= dt;
      const n = Math.ceil(C.cuenta);
      if (hud) hud.q('centro').textContent = C.cuenta > 0 ? String(n) : TXT.ya;
      if (C.cuenta <= 0) { C.fase = 'lucha'; centroT = 0.7; }
    }
    if (comboVis > 0) { comboVis -= dt; if (comboVis <= 0 && hud && hud.ext) hud.ext.nom.hidden = true; }
    if (C.fase === 'lucha' && cartaC) { pintarExt(); return; } // la carta «Combos» abierta: el duelo espera
    if (C.fase === 'lucha') {
      C.tLucha = (C.tLucha || 0) + dt;
      H.paso(C.j, dt); H.paso(C.r, dt); if (c2On()) { EXM.paso(C.j, dt); EXM.paso(C.r, dt); } pasoNuevos(C.j, dt); pasoNuevos(C.r, dt); pasoTrampas(dt);
      for (let i = C.timers.length - 1; i >= 0; i--) { const t = C.timers[i]; t.t -= dt; if (t.t <= 0) { C.timers.splice(i, 1); t.fn(); if (C.fase !== 'lucha') break; } }
      if (C.fase === 'lucha' && !ent) pasoIA(dt); // en el entreno la Campeona espera quieta
      if (C.fase === 'lucha') pasoBalas(dt);
      pasoEscudo(C.j, dt); pasoEscudo(C.r, dt);
      pasoJugador(dt);
      if (C.fase === 'lucha' && Math.hypot(S.pos.x - sitio.x, S.pos.z - sitio.z) > SALIDA_R) { salir(TXT.lejos); return; }
      if (C.fase === 'lucha' && ent) pasoEntreno(dt);
      else if (C.fase === 'lucha') pasoPistas(dt);
      if (Math.random() < dt * 4) pintar(); else { pintarChips(); if (c2On()) pintarExt(); }
    } else if (C.fase === 'fin') {
      for (const f of [C.j, C.r]) if (f && f.finMareo > 0) { f.finMareo = Math.max(0, f.finMareo - dt); f.mareo = f.finMareo; }
      if (C.j && C.j.finMareo > 0) { M.vx *= 0.8; M.vz *= 0.8; if (azar() < dt * 5) fx('gold', S.pos.x, S.pos.y + 1.8, S.pos.z); }
      if (Math.hypot(S.pos.x - sitio.x, S.pos.z - sitio.z) > SALIDA_R) { salir(); return; }
    }
    pasoOndas(dt);
    dibujarRival(dt, moverRival(dt)); animaFresca = 1.5;
  }
  // CPU (móvil): mientras espera en la explanada, de lejos (> 60 m, el R_VIVO de npc.js) su esqueleto no se anima
  // y a media distancia (> 30 m) se anima un cuadro de cada dos con el dt sumado; de cerca y en el duelo, siempre.
  let animaPar = false, animaDt = 0, animaFresca = 1.5; // animaFresca: tras un duelo, 1,5 s más de animación para que asiente la pose
  function dibujarQuieta(dt, vel) {
    const d = Math.hypot(S.pos.x - C.r.pos.x, S.pos.z - C.r.pos.z);
    if (animaFresca > 0) animaFresca -= dt;
    if (animaFresca <= 0 && (d > 60 || (d > 30 && (animaPar = !animaPar)))) { animaDt = d > 60 ? 0 : animaDt + dt; dibujarRival(dt, vel, true); return; }
    dibujarRival(dt + animaDt, vel); animaDt = 0;
  }
  function moverRivalQuieta(dt) {
    const r = C.r; r.pos.y = ALTURA(r.pos);
    const dx = S.pos.x - r.pos.x, dz = S.pos.z - r.pos.z;
    if (dx * dx + dz * dz < 400) { const g = 4 * dt; r.yaw += Math.max(-g, Math.min(g, giroPi(Math.atan2(dx, dz) - r.yaw))); } // mira a quien se acerca, girando poco a poco
    return 0;
  }

  // ---------- En el mundo: la rival espera en la explanada ----------
  const it = G.interaccion.add({ id: 'v18_rival', x: rivalPos.x, z: rivalPos.z, r: 3.2, visible: () => enCap1() && C.fase === 'nada' && !!C.ch,
    label: () => TXT.retar, use: () => iniciar({}) });
  let retirada = false; // retirar(): una instancia de prueba (QA-163) deja el mundo sin rival, marca ni interacción duplicados
  G.on('update', (dt, busy) => {
    if (retirada) return;
    it.x = rivalPos.x; it.z = rivalPos.z;
    marca.visible = enCap1() && Math.hypot(S.pos.x - sitio.x, S.pos.z - sitio.z) < 90;
    if (busy && C.fase !== 'nada') return;
    paso(Math.min(dt, 0.1));
  }, 70);
  // QA-nuevo-br1-3: fuera del duelo y de lejos (> 60 m, el R_VIVO de npc.js, donde ya no se anima) la rival no se dibuja: sus
  // ~14 mallas sumaban draw calls en toda la isla (p. ej. junto a las ruinas). Solo la visibilidad de su raíz, después de paso()
  // (dibujarRival la enciende cada cuadro); pose, animación e IA no cambian. Se mira cada 0,5 s o si Vittata salta > 20 m.
  const OCULTA_R = 60, ocu = { t: 0, x: 1e9, z: 1e9, lejos: false };
  G.on('update', dt => {
    if (retirada || !C.ch) return;
    if (C.fase !== 'nada') { ocu.lejos = false; return; }
    ocu.t += dt || 0;
    if (ocu.t >= 0.5 || Math.abs(S.pos.x - ocu.x) + Math.abs(S.pos.z - ocu.z) >= 20) {
      ocu.t = 0; ocu.x = S.pos.x; ocu.z = S.pos.z;
      const lejos = Math.hypot(S.pos.x - C.r.pos.x, S.pos.z - C.r.pos.z) > OCULTA_R;
      if (ocu.lejos && !lejos) C.ch.root.visible = true; // al volver, aunque este cuadro no pase por dibujarRival
      ocu.lejos = lejos;
    }
    if (ocu.lejos && C.ch.root.visible) C.ch.root.visible = false;
  }, 70.5);
  // du2 (8-nov): en el duelo no va la guía de la misión (fx.js): su flecha naranja flota sobre Vittata y, vista desde atrás,
  // se leía como un disco color arena junto a la Campeona; el haz también sobra. Después del gancho de misiones (60).
  G.on('render', () => { if (!retirada && C.fase !== 'nada' && G.fx && G.fx.guide) G.fx.guide(null, 0); }, 61);
  G.on('apply', () => { if (!retirada && C.fase !== 'nada') salir(); }, 47);
  // QA-174: cuando ya están la vegetación y el mundo, el sitio definitivo (fijo entre cargas); si hay un duelo abierto, al acabar
  let recolocar = false;
  function moverSitio() {
    recolocar = false;
    const n = buscarSitio(); if (n.x === sitio.x && n.z === sitio.z) { despejarSitio(); return false; }
    Object.assign(sitio, n); despejarSitio(); marca.position.set(sitio.x, sitio.y + 0.06, sitio.z);
    rivalPos.x = sitio.x + 4; rivalPos.z = sitio.z; rivalPos.y = ALTURA(rivalPos); it.x = rivalPos.x; it.z = rivalPos.z;
    if (C.ch) C.ch.root.position.set(rivalPos.x, rivalPos.y, rivalPos.z);
    return true;
  }
  const pedirSitio = () => { recolocar = true; };
  Promise.resolve(G.vegetacion && G.vegetacion.listo).then(pedirSitio, pedirSitio);
  Promise.resolve(G.mundo && G.mundo.listo).then(pedirSitio, () => {});
  G.on('update', () => { if (!retirada && recolocar && enCap1() && C.fase === 'nada' && !(G.v18duelo2 && G.v18duelo2.estado().fase !== 'nada')) moverSitio(); }, 69); // no se recoloca en mitad de un duelo de 2
  crearRival();

  // ---------- Prueba ----------
  async function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    salir(); // la prueba empieza con la rival esperando, aunque hubiera un duelo abierto
    const c2Prueba0 = G.combate2; G.combate2 = false; // lo de siempre se prueba sin Combate 2.0 (para todos; ?combate2=0 lo apaga); su parte va al final
    const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, fac0 = S.facing, fly0 = M.flying, inv0 = Object.assign({}, S.inv);
    const P = G.v18, crudo = (() => { try { return localStorage.getItem(P.clave()); } catch (e) { return null; } })();
    // QA-228: los contadores de pistas dominadas viven en memoria; tras otros duelos (v18NuevasTest) ya pasaban de 2 y las Pistas no
    // salían. La prueba empieza de cero y los deja como estaban
    const dom0 = Object.assign({}, pista.dom); for (const k in pista.dom) pista.dom[k] = 0;
    const evs = [], podEv = [];
    const oyente = e => { if (!oyente.mudo) evs.push(e); }; G.on('v18combate', oyente);
    const oyenteP = e => { if (!oyente.mudo) podEv.push(e); }; G.on('v18poder', oyenteP);
    const toasts = []; const toast0 = G.ui.toast; G.ui.toast = (t, ms) => { toasts.push(String(t)); return toast0.call(G.ui, t, ms); };
    const correr = (s, antes) => { for (let t = 0; t < s && C.fase === 'lucha'; t += 0.05) { if (antes) antes(); paso(0.05); } };
    const quieta = (dx) => { C.r.pos.x = S.pos.x + dx; C.r.pos.z = S.pos.z; C.r.pensar = 99; C.r.esquivaT = 99; C.r.poderT = 99; C.r.mov.t = 0; };
    const cara = (x) => { S.facing = { x, z: 0 }; };
    // Mide cómo se mueve la rival en un duelo de `seg` s contra una jugadora con guion (se acerca, se aleja y la rodea, tira
    // semillas y golpea). Por cuadro: giro del cuerpo (rad/s), cambio de dirección del paso (sin contar empujones ni quiebros),
    // andar de lado sin saltitos, velocidad de la animación frente a la real, y si sus ataques básicos llegan avisados.
    function medirMovimiento(seg) {
      iniciar({ sinCuenta: true, especie: 'vittata', dificultad: DIFICULTAD[DIFICULTAD.length - 1] }); // la más viva: Maestro
      const r = C.r, j = C.j, dt = 0.05, res = { s: seg, giroMax: 0, bruscos: 0, inversiones: 0, lateral: 0, desfase: 0, quiebros: 0, quiebrosSinSalto: 0, alas: 0, alasAvisadas: 0, semillas: 0, semillasAvisadas: 0, marca: false, agacha: false };
      const usar0 = H.usar;
      H.usar = function (f, id) {
        const o = usar0.apply(this, arguments);
        if (f === C.r && o && o.ok && id === 'golpe_ala') { res.alas++; if ((f.avisoUsado || 0) >= 0.35) res.alasAvisadas++; }
        if (f === C.r && o && o.ok && id === 'semilla') { res.semillas++; if ((f.avisoUsado || 0) >= 0.25) res.semillasAvisadas++; }
        return o;
      };
      const yawVis = () => (C.ch ? C.ch.root.rotation.y : r.yaw);
      let n = 0, mov = 0, lat = 0, des = 0, tiro = 0, golpe = 0, yaw0 = yawVis(), hist = [];
      // 9-nov (Kelvin: «no me gusta el movimiento del bot»): lo que se ve, cuadro a cuadro. Pies: cuánto se desliza cada pie
      // apoyado (a menos de 3 cm de su suelo en dos cuadros seguidos); cadencia: zancada que da el paso (velocidad del cuerpo
      // que se ve entre la frecuencia del paso) al andar; cuerpo: el mayor salto de velocidad de un cuadro al siguiente.
      const pieV = new THREE.Vector3(), ch0 = C.ch, pie0 = [null, null], raiz0 = { x: 0, z: 0, v: null };
      let apoyos = 0, desliz = 0, deslizMax = 0, cuerpoMax = 0, andaN = 0, zancadaMal = 0, zancadas = []; const modosV = {}, pisadas = [];
      S.pos.x = sitio.x - 5; S.pos.z = sitio.z;
      try {
        for (let t = 0; t < seg && C.fase === 'lucha'; t += dt) {
          // La jugadora: 0–3,5 s se acerca, 3,5–7 se aleja, 7–14 la rodea a 3 m (cambiando de sentido a los 10,5 s)
          const fase = t < 3.5 ? 0 : t < 7 ? 1 : 2, dx = r.pos.x - S.pos.x, dz = r.pos.z - S.pos.z, d = Math.hypot(dx, dz) || 1;
          let mx = 0, mz = 0;
          if (fase === 0) { if (d > 1.6) { mx = dx / d; mz = dz / d; } } else if (fase === 1) { if (d < 7) { mx = -dx / d; mz = -dz / d; } }
          else { const sg = t < 10.5 ? 1 : -1; mx = -dz / d * sg + (d - 3) / d * dx * 0.5; mz = dx / d * sg + (d - 3) / d * dz * 0.5; }
          const mn = Math.hypot(mx, mz) || 1;
          if (mx || mz) { S.pos.x += mx / mn * 4.2 * dt; S.pos.z += mz / mn * 4.2 * dt; }
          const ox = S.pos.x - sitio.x, oz = S.pos.z - sitio.z, od = Math.hypot(ox, oz); if (od > 10) { S.pos.x = sitio.x + ox / od * 10; S.pos.z = sitio.z + oz / od * 10; }
          S.facing = { x: dx / d, z: dz / d }; M.vx = M.vz = 0;
          j.plumas = PLUMAS; r.plumas = PLUMAS;
          if ((tiro -= dt) <= 0 && d > 3.5 && H.listo(j, 'semilla').ok) { usar(j, 'semilla'); tiro = 1.7; }
          if ((golpe -= dt) <= 0 && d < 2.2 && H.listo(j, 'golpe_ala').ok) { usar(j, 'golpe_ala'); golpe = 1.1; }
          const x0 = r.pos.x, z0 = r.pos.z, quiebro = r.mov.t > 0, sacudida = r.kb.t > 0 || quiebro || r.mareo > 0;
          paso(dt);
          if (C.fase !== 'lucha') break;
          const y1 = yawVis(); if (!(r.mareo > 0)) res.giroMax = Math.max(res.giroMax, Math.abs(giroPi(y1 - yaw0)) / dt); yaw0 = y1;
          if (r.prep && C.marcaAviso && C.marcaAviso.visible) res.marca = true;
          if (C.ch && C.ch.agachada > 0.04) res.agacha = true;
          const vx = (r.pos.x - x0) / dt, vz = (r.pos.z - z0) / dt, v = Math.hypot(vx, vz);
          if ((quiebro || r.mov.t > 0) && !(r.kb.t > 0) && !(r.mareo > 0)) { res.quiebros++; if (C.ch && !C.ch.airborne) res.quiebrosSinSalto++; }
          if (ch0 && ch0.feet && ch0.feet.length === 2) {
            const rx = ch0.root.position.x, rz = ch0.root.position.z, rvx = (rx - raiz0.x) / dt, rvz = (rz - raiz0.z) / dt;
            const An = r.andar; // el cuerpo (sin los saltitos, que van a propósito a golpes): su velocidad no salta de un cuadro a otro
            if (An && raiz0.sv) { const dv = Math.hypot(An.svx - raiz0.sv.x, An.svz - raiz0.sv.z); if (dv < 30) cuerpoMax = Math.max(cuerpoMax, dv / dt); }
            if (An) raiz0.sv = { x: An.svx, z: An.svz };
            const rs = Math.hypot(rvx, rvz);
            // Zancada = velocidad / frecuencia del paso (1,25 m por ciclo en character.js); por debajo de 1,6 m/s la cadencia mínima
            // de character.js (1,2 Hz) acorta el paso a propósito
            if (raiz0.v && ch0.gait === 1 && !ch0.airborne && rs > 1.6 && ch0.hz > 0) { andaN++; const z = rs / ch0.hz * AND.paso; zancadas.push(z); if (Math.abs(z - 1.25) > 0.3) zancadaMal++; }
            raiz0.x = rx; raiz0.z = rz; raiz0.v = { x: rvx, z: rvz };
            if (r.andar) { const m = r.andar.out.modo; modosV[m] = (modosV[m] || 0) + 1; }
            ch0.feet.forEach((f, i) => {
              f.eff.getWorldPosition(pieV); const alto = pieV.y - G.terreno.height(pieV.x, pieV.z), p0 = pie0[i];
              if (!ch0.airborne && p0 && !p0.aire) pisadas.push({ i, a: alto, a0: p0.alto, v: Math.hypot(pieV.x - p0.x, pieV.z - p0.z) / dt });
              pie0[i] = { x: pieV.x, z: pieV.z, alto, aire: ch0.airborne };
            });
          }
          if (sacudida || r.kb.t > 0 || r.mov.t > 0 || r.mareo > 0) { hist.length = 0; continue; }
          n++;
          if (C.ch && C.ch.gait === 1 && v > 0.8 && Math.abs((C.ch.speed || 0) / AND.paso - v) > 0.5) des++; // andando, la cadencia sale de su velocidad real
          const pv = hist.length ? hist[hist.length - 1] : null;
          if (pv && v > 0.6 && pv.v > 0.6 && (vx * pv.x + vz * pv.z) / (v * pv.v) < Math.cos(Math.PI / 4)) res.bruscos++;
          const p3 = hist.length >= 3 ? hist[hist.length - 3] : null;
          if (p3 && v > 0.6 && p3.v > 0.6 && (vx * p3.x + vz * p3.z) / (v * p3.v) < -0.5) res.inversiones++;
          hist.push({ x: vx, z: vz, v }); if (hist.length > 3) hist.shift();
          if (v > 1) { mov++; const fy = y1; if (Math.abs(Math.sin(fy) * vx + Math.cos(fy) * vz) / v < 0.5 && C.ch && C.ch.gait === 1 && !C.ch.airborne) lat++; } // de lado con pasos de andar (los saltitos no cuentan)
        }
      } finally { H.usar = usar0; }
      res.bruscos = Math.round(100 * res.bruscos / seg) / 100; res.inversiones = Math.round(100 * res.inversiones / seg) / 100;
      res.lateral = Math.round(100 * lat / Math.max(1, mov)) / 100; res.desfase = Math.round(100 * des / Math.max(1, n)) / 100; res.giroMax = Math.round(10 * res.giroMax) / 10;
      res.cuadros = n; res.andando = mov;
      zancadas.sort((a, b) => a - b);
      // Pie apoyado: a menos de 2,5 cm de lo más bajo que suele llegar ese pie en el duelo (percentil 5) (la bola del pie no toca el suelo
      // del todo: está unos centímetros por encima de pie), en dos cuadros seguidos
      const bajo = [0, 1].map(i => { const h = pisadas.filter(p => p.i === i).map(p => p.a).sort((x, y) => x - y); return h.length ? h[Math.floor(h.length * 0.05)] : 9; });
      for (const p of pisadas) if (p.a < bajo[p.i] + 0.025 && p.a0 < bajo[p.i] + 0.025 && p.v < 30) { apoyos++; desliz += p.v; deslizMax = Math.max(deslizMax, p.v); }
      Object.assign(res, { apoyos, deslizPie: Math.round(100 * desliz / Math.max(1, apoyos)) / 100, deslizPieMax: Math.round(100 * deslizMax) / 100,
        saltoVelCuerpo: Math.round(cuerpoMax), pasosAndando: andaN, zancadaMed: zancadas.length ? Math.round(100 * zancadas[zancadas.length >> 1]) / 100 : 0,
        zancadaMal: Math.round(100 * zancadaMal / Math.max(1, andaN)) / 100, modos: modosV });
      salir();
      return res;
    }
    try {
      // 1. Poderes por especie y básicos
      const grito = H.get('grito_yunque'), esc = H.get('escudo_plumas');
      check('Vittata tiene Grito del Yunque (PICO) y arausiaca Escudo de plumas (PLUMAS)',
        H.poderDe('vittata') === 'grito_yunque' && H.poderDe('arausiaca') === 'escudo_plumas' && grito.tecnica === 'pico' && esc.tecnica === 'plumas', H.poderDe('vittata') + ' / ' + H.poderDe('arausiaca'));
      const basicos = H.lista().filter(h => h.basico).map(h => h.id).sort().join(',');
      check('Básicos de todas: solo golpe de ala y semilla (el grito ya no es básico)', basicos === 'golpe_ala,semilla' && !H.get('grito'), basicos);
      check('Cada poder es exclusivo y cuesta energía; con poca energía no sale', !H.listo(H.luchador({ especie: 'vittata' }), 'escudo_plumas').ok && grito.coste > 0 && esc.coste > 0 &&
        !H.listo(H.luchador({ especie: 'vittata', energia: 10 }), 'grito_yunque').ok && H.listo(H.luchador({ especie: 'vittata' }), 'grito_yunque').ok);
      const en = H.luchador({ especie: 'vittata', energia: 0 }); H.paso(en, 1);
      check('La energía se recarga sola', en.energia > 10 && en.energia <= en.energiaMax, en.energia);

      // 2. La rival en el mundo; el jugador usa el poder de su especie elegida
      await crearRival();
      // QA-174: sitio fijo entre cargas (no depende de dónde esté la jugadora) y sin troncos en el círculo ni tras la cámara
      {
        if (recolocar) moverSitio();
        const V = G.vegetacion, refresca = () => { try { if (V && V.actualizar) V.actualizar(); } catch (e) { /* flora */ } };
        const cerca = flora(sitio.x, sitio.z, 40), aqui = estorbos(sitio.x, sitio.z, cerca), cands = candidatos().out;
        const px = S.pos.x, pz = S.pos.z;
        S.pos.x = sitio.x - 5; S.pos.z = sitio.z; refresca(); const a = buscarSitio();
        S.pos.x = sitio.x + 400; S.pos.z = sitio.z + 300; refresca(); const b = buscarSitio();
        S.pos.x = px; S.pos.z = pz; refresca();
        const yo = cands.find(c => c.x === sitio.x && c.z === sitio.z), libres = cands.filter(c => !c.peso);
        despejarSitio();
        const dentro = flora(sitio.x, sitio.z, 40).filter(o => Math.hypot(o.x - sitio.x, o.z - sitio.z) < ARENA_R + 0.5);
        // y sin sólidos de flora: ni troncos a la altura del cuerpo ni ramas encima (se aterrizaba en copas a 10-12 m)
        let duros = 0, puntos = 0;
        const SOL = G.solidos, p0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z };
        if (SOL && SOL.terminar) {
          try { S.pos.x = sitio.x; S.pos.z = sitio.z; SOL.terminar(); } finally { Object.assign(S.pos, p0); }
          for (let ox = -11; ox <= 11; ox += 1.5) for (let oz = -11; oz <= 11; oz += 1.5) {
            if (Math.hypot(ox, oz) > 11) continue;
            const x = sitio.x + ox, z = sitio.z + oz, h = G.terreno.height(x, z); puntos++;
            if (SOL.penetra(x, z, h + 0.05) || SOL.altoEn(x, z, h + 30) > h + 1) duros++;
          }
        }
        check('QA-174: el círculo está despejado (ni troncos, ni rocas, ni ramas encima; quitados en marcha solo con la V18.1)', despeje.clave === sitio.x + ',' + sitio.z && despeje.n > 0 && !dentro.length && puntos > 100 && !duros,
          'quitadas ' + despeje.n + ' instancias · troncos dentro: ' + dentro.length + ' · puntos con sólido: ' + duros + '/' + puntos + ' · antes, en el pasillo de la cámara: ' + aqui.length);
        check('QA-174: la explanada es plana, seca, sin edificios y la mejor de la rejilla', !!yo && cands.every(c => c.p >= yo.p),
          JSON.stringify({ sitio: [sitio.x, sitio.z], troncos: aqui.length, peso: aqui.peso, pesoMax: Math.max(0, ...cands.map(c => c.peso)), candidatos: cands.length, libres: libres.length, pref: (() => { const q = candidatos().pref, h = G.terreno.height(q.x, q.z); let mn = h, mx = h, ag = 0; for (let a = 0; a < 16; a++) for (const r of [4, 8, ARENA_R]) { const px = q.x + Math.cos(a / 16 * 6.2832) * r, pz = q.z + Math.sin(a / 16 * 6.2832) * r, hh = G.terreno.height(px, pz); mn = Math.min(mn, hh); mx = Math.max(mx, hh); if (G.agua.levelAt(px, pz) > hh - 0.3) ag++; } return [q.x, q.z, Math.round((mx - mn) * 100) / 100, ag]; })(), flora40m: cerca.length }));
        check('QA-174: el sitio sale igual esté donde esté la jugadora (estable entre cargas)', a.x === sitio.x && a.z === sitio.z && b.x === sitio.x && b.z === sitio.z,
          JSON.stringify({ sitio: [sitio.x, sitio.z], cerca: [a.x, a.z], lejos: [b.x, b.z] }));
      }
      check('La rival es una cotorra con otra piel en la explanada', !!C.ch && C.r.especie !== especieJugador() && C.ch.root.parent === scene, C.r.especie);
      check('Hablar con la Campeona de la Explanada abre el duelo', it.visible() && it.label() === TXT.retar);
      // Cómo se pelea (Kelvin 8-nov): entreno guiado de 3 pasos, chips con tecla y recarga, pistas breves
      {
        const pd = b => b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
        P.borrar(); toasts.length = 0;
        iniciar({});
        check('Entreno: el primer duelo empieza con el paso 1 (aletazo, tecla E) y sin cuenta atrás', !!ent && ent.paso === 0 && C.fase === 'lucha' && !hud.q('ent').hidden &&
          hud.q('entK').textContent === (TACTIL ? TXT.accion : 'E') && hud.q('entTxt').textContent === (TACTIL ? TXT.t1 : TXT.e1) && hud.q('entPaso').textContent === TXT.entPaso(1) && hud.q('como').hidden,
          JSON.stringify({ ent, fase: C.fase, k: hud.q('entK').textContent }));
        salir(); iniciar({ entreno: true, especie: 'vittata' });
        const r0 = { x: C.r.pos.x, z: C.r.pos.z }; correr(2);
        check('Entreno: la Campeona se queda quieta y no ataca; nadie pierde plumas', Math.hypot(C.r.pos.x - r0.x, C.r.pos.z - r0.z) < 0.01 && C.stats.ataques === 0 && C.j.plumas === PLUMAS && C.r.plumas === C.r.plumasMax,
          JSON.stringify({ d: Math.hypot(C.r.pos.x - r0.x, C.r.pos.z - r0.z), at: C.stats.ataques }));
        cara(1); C.r.pos.x = S.pos.x + 7; C.r.pos.z = S.pos.z; usar(C.j, 'golpe_ala');
        const lejosOk = ent.paso === 0 && hud.q('centro').textContent === TXT.masCerca;
        C.j.cd = {}; C.r.inv = 0; C.r.escudo = 0; C.r.pos.x = S.pos.x + 1.5; usar(C.j, 'golpe_ala');
        const p1 = ent.paso === 1 && hud.q('entK').textContent === 'F' && hud.q('entTxt').textContent === TXT.e2 && hud.q('entPP').querySelectorAll('i.ya').length === 1;
        correr(0.1);
        check('Entreno: el aletazo de lejos no cuenta («¡Más cerca!»); de cerca pasa al paso 2 (semilla, F) y la pluma vuelve', lejosOk && p1 && C.r.plumas === C.r.plumasMax, JSON.stringify({ lejosOk, p1, pl: C.r.plumas }));
        usar(C.j, 'semilla');
        const p2 = ent.paso === 2 && hud.q('entK').textContent === 'G' && hud.q('entPod').textContent === nombrePoder() && nombrePoder() === H.get('grito_yunque').nombre;
        check('Entreno: la semilla pasa al paso 3 (poder G, con el nombre del poder de la especie)', p2, JSON.stringify({ paso: ent.paso, pod: hud.q('entPod').textContent }));
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', code: 'KeyG', bubbles: true, cancelable: true }));
        document.body.dispatchEvent(new KeyboardEvent('keyup', { key: 'g', code: 'KeyG', bubbles: true, cancelable: true }));
        const p3 = ent && ent.paso === 3 && ent.fin > 0 && P.mundo('entreno_duelo') === 1 && toasts.includes(TXT.entFin);
        correr(2);
        check('Entreno: el poder (tecla G) lo termina, se guarda que ya se vio y empieza el duelo de verdad con cuenta atrás', p3 && !ent && C.fase === 'cuenta' && hud.q('ent').hidden,
          JSON.stringify({ p3, fase: C.fase, mundo: P.mundo('entreno_duelo') }));
        salir(); iniciar({});
        check('Entreno: no se repite solo (el siguiente duelo va directo a la cuenta atrás)', !ent && C.fase === 'cuenta' && !hud.q('como').hidden);
        pd(hud.q('como'));
        const porBoton = !!ent && ent.paso === 0 && C.fase === 'lucha';
        pd(hud.el.querySelector('[data-a="saltarEnt"]'));
        check('Botón «¿Cómo se pelea?» abre el entreno; «Saltar entreno» va al duelo', porBoton && !ent && C.fase === 'cuenta', JSON.stringify({ porBoton, fase: C.fase }));
        // du2: con partida nueva, la guía «¡Así se juega!» (guia_controles.js) salía en mitad de la cuenta atrás y tapaba el duelo
        {
          const GP = G.guiaControles && G.guiaControles.prueba;
          if (GP) {
            let raw0 = null; try { raw0 = localStorage.getItem(GP.CLAVE); } catch (e) { /* sin almacenamiento */ }
            const est0 = GP.est, forz0 = GP.forzado, ses0 = GP.enSesion.panel;
            GP.forzado = 'teclado'; GP.est = { hecho: {}, vistas: {} }; GP.enSesion.panel = 0; GP.cerrar();
            const enCuenta = C.fase === 'cuenta';
            for (let i = 0; i < 4; i++) GP.actualizar(0.5);
            const durante = GP.panelAbierto;
            salir(); for (let i = 0; i < 4; i++) GP.actualizar(0.5);
            const despues = GP.panelAbierto;
            GP.cerrar(); GP.forzado = forz0; GP.est = est0; GP.enSesion.panel = ses0;
            try { if (raw0 == null) localStorage.removeItem(GP.CLAVE); else localStorage.setItem(GP.CLAVE, raw0); } catch (e) { /* sin almacenamiento */ }
            check('du2: la guía «¡Así se juega!» no se abre durante la cuenta atrás del duelo; sale al terminar', enCuenta && !durante && despues, JSON.stringify({ enCuenta, durante, despues }));
          }
        }
        // Chips: icono + tecla, se iluminan cuando se puede y enseñan la recarga
        iniciar({ sinCuenta: true, especie: 'vittata' }); quieta(7); cara(1);
        const chipDe = a => hud.el.querySelector('.vd-chip[data-a="' + a + '"]');
        const teclas = ['golpe_ala', 'semilla', 'poder'].map(a => chipDe(a) && chipDe(a).querySelector('kbd').textContent).join('');
        usar(C.j, 'semilla'); paso(0.05);
        const cdS = parseFloat(chipDe('semilla').style.getPropertyValue('--cd')) || 0;
        check('Chips: Ala E · Semilla F · Poder G con icono; el listo brilla y el que recarga enseña la recarga', teclas === 'EFG' && !!chipDe('golpe_ala').dataset.icon &&
          (TACTIL || (chipDe('golpe_ala').classList.contains('listo') && chipDe('semilla').classList.contains('cd') && cdS > 50)) && chipDe('poder').textContent.includes(H.get('grito_yunque').nombre) && chipDe('alianza').hidden,
          JSON.stringify({ teclas, cdS, cls: chipDe('semilla').className }));
        // du2: con los chips (táctil: etiquetas) a la vista no sale el aviso repetido «Ala: E · Semilla: F · Poder: G»
        {
          const tagsVis = !!document.querySelector('#v18-duelo-tags:not([hidden]) span:not([hidden])'), avA = modo.aviso();
          hud.q('bot').hidden = true; const avSin = TACTIL ? avA : modo.aviso(); hud.q('bot').hidden = false;
          const tgM = G.misiones && G.misiones.guideTarget ? G.misiones.guideTarget() : null; G.emit('render', 0.016);
          const K = G.camara.CAM;
          check('du3: en el duelo la cámara va más alta y más atrás (se ve a la Campeona por encima de Vittata)', K.dist === CAM_DUELO.dist && K.height === CAM_DUELO.height && !!G.camDuelo0 && G.camara.draw === miDraw, JSON.stringify({ d: K.dist, h: K.height }));
          // Campeona a 2 m justo detrás de Vittata vista desde la cámara: la órbita la saca ~ORBITA rad; a 12 m, nada
          { const cp = R.camera.position.clone(), rp0 = Object.assign({}, C.r.pos), o0 = orb;
            R.camera.position.set(S.pos.x - 8, S.pos.y + 6, S.pos.z); C.r.pos.x = S.pos.x + 2; C.r.pos.z = S.pos.z; orb = 0; orbitar(1); const oCerca = orb;
            C.r.pos.x = S.pos.x + 12; orb = 0; orbitar(1); const oLejos = orb;
            R.camera.position.copy(cp); Object.assign(C.r.pos, rp0); orb = o0;
            check('du3: con la Campeona cerca y tapada por Vittata la cámara orbita para verla (de lejos no)', Math.abs(Math.abs(oCerca) - ORBITA) < 0.02 && Math.abs(oLejos) < 0.01, JSON.stringify({ oCerca: oCerca.toFixed(3), oLejos: oLejos.toFixed(3) })); }
          check('du2: en el duelo no se ven la flecha ni el haz de la guía de la misión', !!G.fx && !G.fx.guideArrow.visible && !G.fx.guideBeam.visible, JSON.stringify({ objetivo: tgM }));
          check('du2: con los chips a la vista el aviso de abajo calla (sin chips vuelve el de siempre)', TACTIL ? avA === (tagsVis ? '' : TXT.avisoTactil) : (avA === '' && avSin === TXT.aviso), JSON.stringify({ avA, avSin, tagsVis }));
        }
        // Pistas: cerca, lejos, poder listo; la del primer golpe; dejan de salir al dominarlas
        for (const k in pista.dom) pista.dom[k] = 0; ponerMundo('pistas_duelo', 0); // sin pistas dominadas antes (el almacén se restaura al final)
        const pistaTras = (prep) => { ocultarPista(); pista.t = 0; prep(); paso(0.05); return hud.q('pista').hidden ? '' : hud.q('pistaTxt').textContent; };
        C.j.cd = {}; C.j.energia = 50;
        const pc = pistaTras(() => quieta(1.5)), pl = pistaTras(() => { quieta(8); C.j.cd = {}; C.j.energia = 50; }), pp = pistaTras(() => { quieta(8); C.j.energia = 100; C.j.cd = {}; });
        const pista0 = pista.t;
        C.j.inv = 0; C.j.plumas = PLUMAS - 1; ocultarPista(); paso(0.05); const pg = hud.q('pistaTxt').textContent;
        check('Pistas: «¡Cerca! Aletazo (E)», «Lejos: semilla (F)», «¡Poder listo! (G)» y, al recibir el primer golpe, cómo esquivar; una cada 4,5 s',
          pc === (TACTIL ? TXT.pCercaT : TXT.pCerca) && pl === (TACTIL ? TXT.pLejosT : TXT.pLejos) && pp === (TACTIL ? TXT.pPoderT : TXT.pPoder) && pista0 >= 4 && pg === TXT.dGolpe && (P.mundo('pistas_duelo') & PISTA.defensa),
          JSON.stringify({ pc, pl, pp, pg }));
        pista.dom.cerca = 0; for (let i = 0; i < 2; i++) { C.j.cd = {}; C.r.inv = 0; C.r.escudo = 0; quieta(1.5); usar(C.j, 'golpe_ala'); }
        C.r.mareo = 0; C.j.energia = 50; const pc2 = pistaTras(() => { quieta(1.5); C.j.cd = {}; C.j.energia = 50; });
        check('Pistas: tras dos aletazos buenos, la de «¡Cerca!» ya no sale (se guarda)', (P.mundo('pistas_duelo') & PISTA.cerca) && pc2 !== TXT.pCerca && pc2 !== TXT.pCercaT, JSON.stringify({ pc2, m: P.mundo('pistas_duelo') }));
        // El panel no tapa el Diario ni el botón de pausa
        iniciar({ entreno: true, especie: 'vittata' });
        const rh = hud.el.getBoundingClientRect(), tapa = ['b-diary', 'b-menu'].filter(id => { const b = document.getElementById(id), r = b && b.getBoundingClientRect(); return r && r.width && b.offsetParent && !(r.right <= rh.left || r.left >= rh.right || r.bottom <= rh.top || r.top >= rh.bottom); });
        check('El panel con el entreno no tapa el Diario ni la pausa', !tapa.length, tapa.join(','));
        salir(); P.borrar();
      }
      iniciar({ sinCuenta: true, especie: 'vittata' });
      check('Con Vittata: poder Grito del Yunque; la rival es arausiaca con Escudo de plumas', C.j.poder === 'grito_yunque' && C.r.especie === 'arausiaca' && C.r.poder === 'escudo_plumas', C.j.poder + ' / ' + C.r.poder);
      check('El duelo toma Acción e Impulso y muestra el HUD con 5 plumas por lado, energía aparte y sin botón de grito',
        G.interaccion.modo === modo && G.dones.sostener === sostenerDuelo && hud && !hud.el.hidden && hud.q('plj').children.length === 5 && hud.q('plr').children.length === 5 &&
        !!hud.q('en-j') && !hud.el.querySelector('[data-a="grito"]'));
      // QA-173: en el duelo la G lanza el poder y no llega a input.js (no inclina la cámara)
      {
        const tk = (tipo, rep) => document.body.dispatchEvent(new KeyboardEvent(tipo, { key: 'g', code: 'KeyG', repeat: !!rep, bubbles: true, cancelable: true }));
        quieta(4); cara(1); C.r.escudo = 0; C.j.cd.grito_yunque = 0; C.j.energia = 100; podEv.length = 0;
        const inc0 = G.camara.inclina;
        tk('keydown'); tk('keydown', true);
        const tieneG = !!(G.input && G.input.keys && G.input.keys.has('g'));
        try { G.camara.follow(0.1); G.camara.follow(0.1); } catch (e) { /* cámara */ }
        const inc1 = G.camara.inclina; tk('keyup');
        check('QA-173: en el duelo G lanza el poder y no inclina la cámara', podEv.some(e => e.id === 'grito_yunque') && !tieneG && Math.abs(inc1 - inc0) < 1e-6,
          JSON.stringify({ poder: podEv.length, tieneG, inc0, inc1 }));
        while (C.timers.length) C.timers.shift().fn(); // la onda de este grito llega ya, no en mitad de las comprobaciones de abajo
        C.j.cd.grito_yunque = 0; C.j.energia = 100; C.r.mareo = 0; C.r.interrumpida = 0; C.r.kb.t = 0; C.j.picoT = 0; podEv.length = 0; evs.length = 0; C.stats.ondas = 0; C.stats.interrupciones = 0;
        for (const b of C.balas.splice(0)) { try { scene.remove(b.m); } catch (e) { /* bala */ } }
      }

      // 3. Grito del Yunque: empuja, interrumpe, sin quitar plumas; hay que apuntar; recuperación
      quieta(4); cara(1); C.r.escudo = 0; evs.length = 0; podEv.length = 0;
      const oidosG = [], play0 = G.audio.play; G.audio.play = (n, x) => { oidosG.push(n); return play0(n, x); }; // Kelvin 9-nov: el Grito suena
      let rg; try { rg = usar(C.j, 'grito_yunque'); } finally { G.audio.play = play0; }
      check('Grito: suena su propio sonido («grito»: graznido + ondas), no el genérico', G.audio.has('grito') && oidosG.includes('grito') && !oidosG.includes('dash') && G.audio.log.slice(-6).includes('grito'), JSON.stringify(oidosG));
      const picoAbierto = C.j.picoT > 0;
      let bocaModelo = null;
      if (pl3d) { try { pl3d.update(0.016); bocaModelo = pl3d.mouth; } catch (e) { bocaModelo = 'error ' + e.message; } }
      correr(0.4, () => { C.r.pensar = Math.max(C.r.pensar, 0); });
      const kb = Math.hypot(C.r.kb.x, C.r.kb.z);
      check('Grito: abre el pico y emite v18poder { id, origen, direccion, alcance }', rg.ok && picoAbierto && (bocaModelo == null || bocaModelo > 0.3) &&
        podEv.some(e => e.id === 'grito_yunque' && e.origen && e.direccion && e.direccion.x > 0.9 && e.alcance === grito.alcance), JSON.stringify({ ok: rg.ok, boca: bocaModelo, ev: podEv[0] }));
      check('Grito: la onda empuja a la rival, la interrumpe y no le quita plumas', C.stats.ondas >= 1 && C.r.plumas === PLUMAS && (C.r.kb.t > 0 || C.r.pos.x - S.pos.x > 4.3) &&
        C.r.interrumpida > 0 && C.r.mareo > 0.5 && C.stats.interrupciones === 1 && !usar(C.r, 'golpe_ala').ok, JSON.stringify({ pl: C.r.plumas, kb, x: C.r.pos.x - S.pos.x, m: C.r.mareo }));
      check('Grito: tiene recuperación (no se repite enseguida)', !H.listo(C.j, 'grito_yunque').ok && H.listo(C.j, 'grito_yunque').motivo === 'espera');
      C.j.cd.grito_yunque = 0; C.j.energia = 100; C.r.mareo = 0; C.r.interrumpida = 0; C.r.kb.t = 0; quieta(4); cara(-1); const n0 = C.stats.interrupciones;
      usar(C.j, 'grito_yunque'); correr(0.5, () => { quieta(4); });
      check('Grito: hay que apuntar (mirando al otro lado no alcanza)', C.stats.interrupciones === n0 && C.r.mareo === 0);
      C.j.cd.grito_yunque = 0; C.j.energia = 100; quieta(11); cara(1);
      usar(C.j, 'grito_yunque'); correr(0.8, () => { quieta(11); });
      check('Grito: alcance limitado (a 11 m no llega)', C.stats.interrupciones === n0 && C.r.mareo === 0);

      // 4. Escudo de plumas (la rival arausiaca): para un golpe, reduce el grito, caduca
      iniciar({ sinCuenta: true, especie: 'vittata' }); quieta(1.5); cara(1); podEv.length = 0;
      const re = usar(C.r, 'escudo_plumas');
      check('Escudo: abre las alas, plumas alrededor y emite v18poder', re.ok && C.r.escudo > 0 && C.r.alasT > 0 && !!C.r.escudoFx && podEv.some(e => e.id === 'escudo_plumas'));
      const ra = usar(C.j, 'golpe_ala');
      check('Escudo: bloquea un golpe de ala (sin quitar plumas) y se dispersa', ra.ok && !ra.acierto && C.r.plumas === PLUMAS && C.r.escudo === 0 && !C.r.escudoFx && C.stats.dispersiones >= 1,
        JSON.stringify({ pl: C.r.plumas, esc: C.r.escudo }));
      C.j.cd.golpe_ala = 0; C.r.inv = 0; quieta(1.5);
      const ra2 = usar(C.j, 'golpe_ala');
      check('Escudo: solo para UN ataque (el siguiente golpe sí quita pluma)', ra2.acierto && C.r.plumas === PLUMAS - 1);
      C.r.cd.escudo_plumas = 0; C.r.energia = 100; C.r.mareo = 0; C.r.inv = 0; C.r.kb.t = 0; quieta(3); C.j.cd.grito_yunque = 0; C.j.energia = 100;
      usar(C.r, 'escudo_plumas'); usar(C.j, 'grito_yunque'); while (C.timers.length) C.timers.shift().fn(); // la onda llega
      const kbR = Math.hypot(C.r.kb.x, C.r.kb.z);
      check('Escudo contra el grito: reduce el empujón y la interrupción sin anularlos', C.r.escudo === 0 && C.r.mareo > 0 && C.r.mareo < grito.interrumpe * 0.5 &&
        kbR > 0.5 && kbR < grito.empuje * 0.6, JSON.stringify({ m: C.r.mareo, kb: kbR.toFixed(2) }));
      C.r.cd.escudo_plumas = 0; C.r.energia = 100; C.r.mareo = 0; usar(C.r, 'escudo_plumas');
      correr(esc.dura + 0.3, () => { quieta(6); S.pos.x = sitio.x - 5; C.j.inv = 9; C.j.plumas = PLUMAS; });
      check('Escudo: caduca solo y se dispersa; nunca permanente (espera > duración)', C.r.escudo === 0 && !C.r.escudoFx && esc.cooldown > esc.dura);

      // 5. Con arausiaca elegida, el jugador tiene el escudo; la rival (ventralis, Isleña) ya trae su poder de
      // especie (Eco de la Cordillera, KIMI-156): antes heredaba el Grito de la familia
      iniciar({ sinCuenta: true, especie: 'arausiaca' });
      check('Con arausiaca: poder Escudo de plumas; la rival (ventralis) usa su poder: Eco de la Cordillera', C.j.poder === 'escudo_plumas' && C.r.poder === 'eco_cordillera' && usar(C.j, 'escudo_plumas').ok && C.j.escudo > 0);

      // 6. La IA se mueve, ataca, se defiende y reacciona a los impactos
      iniciar({ sinCuenta: true, especie: 'vittata' });
      const r0 = { x: C.r.pos.x, z: C.r.pos.z };
      correr(8, () => { S.pos.x = sitio.x - 5; S.pos.z = sitio.z; M.vx = M.vz = 0; C.j.plumas = PLUMAS; C.r.plumas = PLUMAS; C.j.inv = 0.5; if (C.j.cd.semilla <= 0 && C.j.energia > 40) usar(C.j, 'semilla'); });
      check('La IA se mueve hacia ti, ataca y se defiende', C.stats.movida > 2 && C.stats.ataques >= 1 && Math.hypot(C.r.pos.x - r0.x, C.r.pos.z - r0.z) > 1 && (C.stats.escudos + C.stats.esquivas) >= 1,
        JSON.stringify(C.stats));
      iniciar({ sinCuenta: true, especie: 'vittata' }); quieta(1.5); C.r.escudo = 0; evs.length = 0;
      const ru = usar(C.j, 'golpe_ala');
      check('Un golpe de ala quita una pluma, marea, empuja y la rival reacciona', ru.ok && ru.acierto && C.r.plumas === PLUMAS - 1 && C.r.mareo > 0 && C.r.kb.t > 0 && C.r.lift.dura > 0 && C.stats.reacciones >= 1,
        JSON.stringify({ ok: ru.ok, pl: C.r.plumas, mareo: C.r.mareo }));
      check('Emite hit y damage', evs.some(e => e.tipo === 'hit' && e.de === 'jugador' && e.valor === 1) && evs.some(e => e.tipo === 'damage' && e.a === 'rival' && e.valor === PLUMAS - 1));
      check('El HUD muestra las plumas que quedan', hud.q('plr').querySelectorAll('i.fuera').length === 1);
      C.r.mareo = 0; C.r.inv = 0; quieta(7); cara(1);
      const plS = C.r.plumas; usar(C.j, 'semilla');
      correr(1.2, () => { quieta(7); });
      check('La semilla vuela y pega a distancia', C.r.plumas === plS - 1, C.r.plumas);

      // 6b. Movimiento de la rival (Kelvin 8-nov: «no me gustó cómo se mueve el bot»): se mide cuadro a cuadro en un duelo
      // de 14 s contra una jugadora que la rodea, se acerca y se aleja: giro del cuerpo, cambios bruscos de dirección,
      // deslizarse de lado sin saltitos, y que cada golpe de ala y cada semilla vengan avisados.
      {
        const mv = medirMovimiento(14);
        check('Movimiento: gira con velocidad limitada, sin temblores ni cambios bruscos de dirección', mv.giroMax <= 15 && mv.bruscos <= 0.3 && mv.inversiones <= 0.3, JSON.stringify(mv));
        check('Movimiento: no se desliza de lado sin saltitos y anda a la velocidad que se mueve', mv.lateral <= 0.08 && mv.desfase <= 0.05, JSON.stringify(mv));
        // 9-nov (Kelvin: «no me gusta el movimiento del bot de la cotorra del duelo»): lo que se ve se mueve como una cotorra viva
        check('Movimiento: en el duelo anda de frente con el paso a la cadencia de su velocidad y de lado va a saltitos',
          mv.pasosAndando >= 20 && mv.zancadaMal <= 0.15 && (mv.modos.anda || 0) > 20 && (mv.modos.saltos || 0) > 5, JSON.stringify(mv));
        // Pie apoyado, medido a 60 cuadros/s (a 20 el apoyo dura 2 o 3 cuadros y la medida baila): andando de frente a 4 m/s y
        // de lado a 1,4 m/s, cuánto se desliza por el suelo el pie que toca (mediana). AND.paso (cadencia) se midió así: con la
        // de character.js tal cual (1) el pie patina casi el doble.
        let pasoQ = null;
        const pisa = (vel, lado, cad) => {
          const r = C.r, ch = C.ch, p0 = AND.paso, v3 = new THREE.Vector3(), prev = [null, null], hs = [[], []], filas = [];
          AND.paso = cad; S.pos.x = sitio.x - 6; S.pos.z = sitio.z;
          try {
            r.pos.x = sitio.x - 4; r.pos.z = sitio.z + 3; r.yaw = lado ? 0 : Math.PI / 2; pasoQ(0.1); for (let i = 0; i < 30; i++) pasoQ(1 / 60);
            for (let i = 0; i < 150; i++) {
              r.pos.x += vel / 60; r.yaw = lado ? 0 : Math.PI / 2; pasoQ(1 / 60);
              ch.feet.forEach((f, k) => { f.eff.getWorldPosition(v3); const h = v3.y - G.terreno.height(v3.x, v3.z); if (prev[k] && i > 40) filas.push({ k, h, h0: prev[k].h, d: Math.hypot(v3.x - prev[k].x, v3.z - prev[k].z) * 60 }); hs[k].push(h); prev[k] = { x: v3.x, z: v3.z, h }; });
            }
          } finally { AND.paso = p0; }
          const bajo = hs.map(h => h.slice().sort((a, b) => a - b)[Math.floor(h.length * 0.05)]);
          const ap = filas.filter(x => x.h < bajo[x.k] + 0.02 && x.h0 < bajo[x.k] + 0.02).map(x => x.d).sort((a, b) => a - b);
          return { n: ap.length, med: Math.round(100 * (ap[ap.length >> 1] || 0)) / 100, modo: r.andar ? r.andar.out.modo : '' };
        };
        if (C.ch && C.ch.feet && C.ch.feet.length === 2) {
          salir(); pasoQ = dt => { animaFresca = 1.5; dibujarRival(dt, moverRivalQuieta(dt)); };
          const anda = pisa(4, false, AND.paso), anda1 = pisa(4, false, 1), lado = pisa(1.4, true, AND.paso);
          check('Movimiento: el pie apoyado apenas se desliza (andando de frente a 4 m/s, menos que con la cadencia sin ajustar; de lado, a saltitos, casi nada)',
            anda.n >= 10 && anda.med <= MOV_PIE && anda.med < anda1.med && lado.n >= 10 && lado.med <= 0.2 && lado.modo === 'saltos', JSON.stringify({ anda, sinAjustar: anda1, lado }));
        }
        check('Movimiento: el cuerpo que se ve no da tirones (sin saltos de velocidad de un cuadro a otro) y gira a ' + AND.giroAtaque + ' rad/s como mucho',
          mv.saltoVelCuerpo <= MOV_TIRON && mv.giroMax <= AND.giroAtaque + 0.5, JSON.stringify({ saltoVelCuerpo: mv.saltoVelCuerpo, giroMax: mv.giroMax }));
        check('Telegrafía: cada golpe de ala y cada semilla de la rival vienen avisados (se agacha y abre las alas, o apunta, con «!» encima)',
          mv.alas >= 1 && mv.alasAvisadas === mv.alas && mv.semillasAvisadas === mv.semillas && mv.marca && mv.agacha, JSON.stringify(mv));
        // El aviso se puede leer: quieta, el golpe llega al acabar el aviso; apartándose a tiempo, falla; pegarle mientras avisa
        // le quita la pluma pero no la frena; el Grito sí la interrumpe.
        const prepara = () => { iniciar({ sinCuenta: true, especie: 'vittata' }); const r = C.r; r.pos.x = S.pos.x + 1.8; r.pos.z = S.pos.z; r.golpeT = 0; r.pensar = 0; r.poderT = 99; r.esquivaT = 99; r.tiroT = 99; C.j.inv = 0; cara(1); };
        const fija = () => { M.vx = M.vz = 0; C.r.poderT = 99; C.r.tiroT = 99; };
        // du3: postura del aviso medida en el esqueleto: de pie (antes de anunciar) y agachada (en mitad del aviso)
        // incl: inclinación del lomo (de la base de la espalda a la cabeza) respecto de la vertical, en grados
        const postura = () => { const ch = C.ch, B = ch && ch.bones, b = B && B.cabeza, e = B && B.espalda1; if (!b || !e) return null;
          const v = b.getWorldPosition(new THREE.Vector3()), q = e.getWorldPosition(new THREE.Vector3()), p = ch.root.position;
          const dy = v.y - q.y, dh = Math.hypot(v.x - q.x, v.z - q.z); return { alto: v.y - p.y, incl: Math.atan2(dh, dy) * 180 / Math.PI, cabeza: v.y }; };
        prepara(); C.r.golpeT = 99; C.r.pensar = 99; correr(0.6, fija); const dePie = postura();
        prepara(); paso(0.05);
        const avisa = C.r.prep === 'golpe_ala' && C.j.plumas === PLUMAS;
        correr(0.25, fija);
        const enAviso = postura(), marcaY = C.marcaAviso ? C.marcaAviso.position.y : 0;
        if (dePie && enAviso) {
          const di = enAviso.incl - dePie.incl, sobre = marcaY - enAviso.cabeza;
          check('du3: en el aviso se inclina adelante con moderación (8–35°) y no se tumba (la cabeza sigue a más del 75 % de su altura)',
            di >= 8 && di <= 35 && enAviso.alto > dePie.alto * 0.75, JSON.stringify({ dePie, enAviso, di: di.toFixed(1) }));
          check('du3: el «!» va justo sobre la cabeza (su centro, 1,0–1,4 m sobre el hueso de la cabeza: ~0,4 m sobre la coronilla)', sobre >= 1.0 && sobre <= 1.4, sobre.toFixed(2));
        }
        const aunNo = C.j.plumas === PLUMAS && C.r.prep === 'golpe_ala', vis = !!(C.marcaAviso && C.marcaAviso.visible), ag = !C.ch || C.ch.agachada > 0.04, alas = !C.ch || C.ch.wingMode === 'preflare';
        correr(0.4, fija);
        check('Telegrafía: el golpe de ala se anuncia ~0,45 s (agachada, alas abiertas, «!») y luego llega', avisa && aunNo && vis && ag && alas && C.j.plumas === PLUMAS - 1 && !C.marcaAviso.visible,
          JSON.stringify({ avisa, aunNo, vis, ag, alas, plj: C.j.plumas }));
        prepara(); paso(0.05); correr(0.2, fija); S.pos.x = C.r.pos.x - 4.5; correr(0.5, fija);
        check('Telegrafía: si te apartas al ver el «!», el golpe falla', C.j.plumas === PLUMAS, C.j.plumas);
        prepara(); paso(0.05); C.j.cd.golpe_ala = 0; const pg = usar(C.j, 'golpe_ala'); const sigue = C.r.prep === 'golpe_ala' && C.r.plumas === PLUMAS - 1; correr(0.6, fija);
        check('Telegrafía: pegarle mientras avisa le quita una pluma pero el golpe sale igual (hay que apartarse o escudarse)', pg.acierto && sigue && C.j.plumas === PLUMAS - 1, JSON.stringify({ acierto: pg.acierto, sigue, plj: C.j.plumas }));
        prepara(); C.r.pos.x = S.pos.x + 8; C.r.golpeT = 99; C.r.tiroT = 0; C.r.energia = 100; paso(0.05);
        const apunta = C.r.prep === 'semilla' && !C.balas.some(b => b.de === C.r);
        correr(0.15, () => { M.vx = M.vz = 0; C.r.poderT = 99; });
        const ladea = !C.ch || C.ch.root.rotation.z > 0.05, sinBala = !C.balas.some(b => b.de === C.r);
        correr(0.25, () => { M.vx = M.vz = 0; C.r.poderT = 99; });
        check('Telegrafía: antes de la semilla apunta ~0,3 s (ladea la cabeza, «!» pequeño) y luego tira', apunta && ladea && sinBala && C.balas.some(b => b.de === C.r), JSON.stringify({ apunta, ladea, sinBala }));
        prepara(); C.r.golpeT = 99; C.r.pensar = 99; saltoAtras(C.r, H.dirA(C.r, C.j), 0.3); paso(0.05); paso(0.05);
        const yR = C.ch ? C.ch.root.position.y - C.r.pos.y : 1, enAire = !C.ch || C.ch.airborne;
        check('Movimiento: los quiebros y saltos atrás se ven como un saltito con aleteo', yR > 0.1 && enAire, JSON.stringify({ yR, enAire }));
        prepara(); paso(0.05); C.j.cd.grito_yunque = 0; C.j.energia = 100; usar(C.j, 'grito_yunque'); correr(0.8, fija);
        check('Telegrafía: el Grito sí la interrumpe y el golpe anunciado se pierde', !C.r.prep && C.j.plumas === PLUMAS && C.stats.interrupciones >= 1, JSON.stringify({ prep: C.r.prep, plj: C.j.plumas }));
        salir();
      }

      // 6c. Vida (Kelvin 9-nov: «la otra cotorra tiene poca animación»): cada fase del duelo pone su estado de animación
      // (espera, mueve, carga, ataque, golpe, mareo, gana, pierde), cada salida cambia con velocidad limitada por cuadro (sin
      // temblores) y el efecto se acaba (al salir vuelve a la espera, sin desplazamientos). Modo Escuela: sin extras, con reacciones.
      if (C.ch) {
        const A = () => C.r.anima || { estado: '', s: {}, w: {}, vistos: {}, maxPaso: 0, maxPasoM: 0 };
        const fija = () => { M.vx = M.vz = 0; const r = C.r; r.poderT = 99; r.tiroT = 99; r.esquivaT = 99; };
        const vio = (est, s, antes) => { let n = 0; const ests = []; for (let t = 0; t < s; t += 0.05) { if (antes) antes(); paso(0.05); const e = A().estado; ests.push(e); if (e === est) n++; } return { n, ests }; };
        const resumen = () => { const a = A(); return { estado: a.estado, maxPaso: +a.maxPaso.toFixed(2), maxPasoM: +a.maxPasoM.toFixed(2), s: Object.fromEntries(Object.entries(a.s).map(([k, v]) => [k, +v.toFixed(3)])) }; };
        const pasos = [];
        // Espera (cuenta 3-2-1): respira, mira a la jugadora
        iniciar({ especie: 'vittata' }); C.r.anima = null; C.r.pos.x = S.pos.x + 3; C.r.pos.z = S.pos.z;
        let pMin = 9, pMax = -9; const esp = vio('espera', 1.2, () => { M.vx = M.vz = 0; const v = A().s.pecho || 0; pMin = Math.min(pMin, v); pMax = Math.max(pMax, v); });
        const escYa = !!(G.renderer && G.renderer.calidad && G.renderer.calidad.escuela); // con el Modo Escuela puesto no respira (extra)
        check('Vida: en la espera respira (el pecho sube y baja) y mira a la jugadora', esp.n >= 20 && (escYa || pMax - pMin > 0.03) && C.ch.lookAt === mirarA, JSON.stringify({ n: esp.n, resp: +(pMax - pMin).toFixed(3), mira: C.ch.lookAt === mirarA }));
        pasos.push(A().maxPaso);
        // Se mueve: se acerca desde lejos, aleteando
        iniciar({ sinCuenta: true, especie: 'vittata' }); C.r.anima = null; C.r.pos.x = S.pos.x + 9; C.r.pos.z = S.pos.z; C.r.golpeT = 99; C.r.pensar = 99;
        const mv = vio('mueve', 0.8, fija);
        check('Vida: al moverse pasa a «mueve» (aleteos al andar y saltitos)', mv.n >= 5, JSON.stringify({ n: mv.n }));
        pasos.push(A().maxPaso);
        // Carga el golpe (aviso) y lo suelta (ataque)
        iniciar({ sinCuenta: true, especie: 'vittata' }); C.r.anima = null; C.r.pos.x = S.pos.x + 1.8; C.r.pos.z = S.pos.z; C.r.golpeT = 0; C.r.pensar = 0; C.j.inv = 0; cara(1);
        paso(0.05); const alasX0 = A().s.alasX || 0; let alasXMax = 0;
        const cg = vio('carga', 0.3, () => { fija(); alasXMax = Math.max(alasXMax, A().s.alasX || 0); });
        const at = vio('ataque', 0.5, fija);
        check('Vida: el aviso del aletazo es una carga visible (alas atrás que crecen con el aviso) y al soltarlo da el aletazo',
          cg.n >= 4 && alasXMax > alasX0 + 0.15 && at.n >= 2, JSON.stringify({ carga: cg.n, alasX0: +alasX0.toFixed(3), alasXMax: +alasXMax.toFixed(3), ataque: at.n }));
        pasos.push(A().maxPaso);
        // Recibe un golpe: retrocede y se acaba
        iniciar({ sinCuenta: true, especie: 'vittata' }); C.r.anima = null; quieta(1.2); C.r.escudo = 0; C.r.golpeT = 99; cara(1); paso(0.05);
        C.j.cd.golpe_ala = 0; const ug = usar(C.j, 'golpe_ala'); let atrasMax = 0;
        const gp = vio('golpe', 0.3, () => { fija(); C.r.pensar = 99; C.r.mov.t = 0; atrasMax = Math.max(atrasMax, A().s.atras || 0); });
        vio('', 0.6, () => { fija(); C.r.pensar = 99; C.r.mov.t = 0; });
        const trasG = A();
        check('Vida: al recibir un golpe retrocede (pecho y cabeza atrás, alas abiertas) y el efecto se acaba',
          ug.acierto && gp.n >= 3 && atrasMax > 0.06 && trasG.estado !== 'golpe' && Math.abs(trasG.s.atras || 0) < 0.005, JSON.stringify({ acierto: ug.acierto, n: gp.n, atrasMax: +atrasMax.toFixed(3), ...resumen() }));
        pasos.push(A().maxPaso);
        // Mareada: bambolea la cabeza
        C.r.mareo = 1; let cyMin = 9, cyMax = -9;
        const mr = vio('mareo', 0.8, () => { fija(); C.r.mareo = Math.max(C.r.mareo, 0.5); const v = A().s.cabY || 0; cyMin = Math.min(cyMin, v); cyMax = Math.max(cyMax, v); });
        C.r.mareo = 0;
        check('Vida: mareada bambolea la cabeza en círculos', mr.n >= 12 && cyMax - cyMin > 0.2, JSON.stringify({ n: mr.n, cabY: +(cyMax - cyMin).toFixed(3) }));
        pasos.push(A().maxPaso);
        // Gana la Campeona: celebra (clip Celebrate y saltitos con aleteo) y se calma
        iniciar({ sinCuenta: true, especie: 'vittata' }); C.r.anima = null; C.r.pos.x = S.pos.x + 1.3; C.r.pos.z = S.pos.z; C.r.pensar = 99; C.r.golpeT = 99; paso(0.05);
        C.j.plumas = 1; C.j.inv = 0; C.j.escudo = 0; C.r.cd.golpe_ala = 0; C.r.energia = 100; C.r.yaw = Math.atan2(S.pos.x - C.r.pos.x, S.pos.z - C.r.pos.z);
        usar(C.r, 'golpe_ala'); let altoMax = 0, flap = 0;
        const gn = vio('gana', 1.4, () => { altoMax = Math.max(altoMax, A().s.alto || 0); if (C.ch.wingMode === 'flap') flap++; });
        vio('gana', 1.4); const ganaFin = A();
        check('Vida: al ganar la Campeona celebra (clip Celebrate, saltitos con aleteo, contenta) y luego se calma',
          C.fase === 'fin' && C.resultado === 'loss' && gn.n >= 20 && ganaFin.celebra === 1 && altoMax > 0.08 && flap >= 5 && Math.abs(ganaFin.s.alto || 0) < 0.01 && C.ch.expression === 'happy',
          JSON.stringify({ fase: C.fase, res: C.resultado, n: gn.n, altoMax: +altoMax.toFixed(3), flap, alto: ganaFin.s.alto, ex: C.ch.expression }));
        pasos.push(A().maxPaso);
        // Pierde la Campeona: primero mareada y luego cabizbaja y triste
        iniciar({ sinCuenta: true, especie: 'vittata' }); C.r.anima = null; C.r.plumas = 1; quieta(1.2); C.r.escudo = 0; cara(1); paso(0.05); C.j.cd.golpe_ala = 0; usar(C.j, 'golpe_ala');
        const pr = vio('pierde', 3.2);
        check('Vida: al perder se marea y después se queda cabizbaja y triste (cabeza baja, cola abajo)',
          C.fase === 'fin' && C.resultado === 'win' && pr.ests.includes('mareo') && pr.n >= 5 && A().estado === 'pierde' && (A().s.cabX || 0) > 0.2 && (A().s.cola || 0) < -0.15 && C.ch.expression === 'sad',
          JSON.stringify({ ...resumen(), ex: C.ch.expression, mareo: pr.ests.includes('mareo') }));
        pasos.push(A().maxPaso);
        // El efecto se acaba: al salir vuelve a la espera y suelta todo
        salir(); vio('', 1.2); const tras = A();
        const resto = Object.entries(tras.w).filter(([k, w]) => k !== 'espera' && w > 0.02);
        check('Vida: al salir del duelo el efecto se acaba (vuelve a la espera, sin desplazamientos ni pesos de otros estados)',
          tras.estado === 'espera' && !resto.length && Math.abs(tras.s.alto || 0) < 0.005 && Math.abs(tras.s.atras || 0) < 0.005, JSON.stringify({ estado: tras.estado, resto, alto: tras.s.alto, atras: tras.s.atras }));
        check('Vida: sin temblores (cada salida cambia como mucho ' + VIDA_VEL + ' rad/s y ' + VIDA_VEL_M + ' m/s por cuadro)',
          pasos.every(v => v <= VIDA_VEL + 1e-6) && tras.maxPaso <= VIDA_VEL + 1e-6 && tras.maxPasoM <= VIDA_VEL_M + 1e-6, JSON.stringify(pasos.map(v => +v.toFixed(2))));
        // Modo Escuela: sin los extras de la espera, pero el golpe recibido sigue
        const cal = G.renderer && G.renderer.calidad, esc0 = cal ? cal.escuela : undefined;
        if (cal) {
          cal.escuela = true;
          try {
            iniciar({ especie: 'vittata' }); C.r.anima = null; vio('espera', 0.8, () => { M.vx = M.vz = 0; }); const we = A().w.espera || 0;
            C.fase = 'lucha'; quieta(1.2); C.r.escudo = 0; C.r.golpeT = 99; cara(1); C.j.cd.golpe_ala = 0; usar(C.j, 'golpe_ala');
            let am = 0; const ge = vio('golpe', 0.3, () => { fija(); C.r.pensar = 99; C.r.mov.t = 0; am = Math.max(am, A().s.atras || 0); });
            check('Vida, Modo Escuela: sin respirar ni mirar curiosa en la espera, pero el retroceso al recibir un golpe sigue', we < 0.02 && ge.n >= 3 && am > 0.06, JSON.stringify({ we: +we.toFixed(3), golpe: ge.n, am: +am.toFixed(3) }));
          } finally { cal.escuela = esc0; salir(); }
        }
      }

      // 7. Victoria: 2 maderas y 1 piedra del inventario del juego, una sola vez
      P.borrar(); const m0 = S.inv.madera || 0, p0 = S.inv.piedra || 0;
      iniciar({ sinCuenta: true, especie: 'vittata' }); C.r.plumas = 1; quieta(1.2); C.r.escudo = 0; evs.length = 0; toasts.length = 0;
      const qa162 = { n: 0, inm: 0 }, save0 = G.guardado && G.guardado.save;
      if (save0) G.guardado.save = function (f) { qa162.n++; if (f === true) qa162.inm++; return save0.apply(this, arguments); };
      usar(C.j, 'golpe_ala');
      if (save0) G.guardado.save = save0;
      const e0Gana = P.mundo('duelos_ganados_e0'), etapasGana = [1, 2, 3].map(i => P.mundo('duelos_ganados_e' + i));
      check('Sin plumas, la rival se marea: victoria con 2 maderas y 1 piedra', C.fase === 'fin' && C.resultado === 'win' && S.inv.madera === m0 + 2 && S.inv.piedra === p0 + 1 &&
        evs.some(e => e.tipo === 'win') && toasts.includes(TXT.gana) && C.r.finMareo > 0 && P.cuantos('pluma_rival') === 0,
        JSON.stringify({ fase: C.fase, m: S.inv.madera - m0, p: S.inv.piedra - p0, t: toasts }));
      check('QA-162: ganar el duelo guarda la partida al momento (save inmediato, no autosave)', !save0 || (qa162.n >= 1 && qa162.inm >= 1), JSON.stringify(qa162));
      check('Al terminar, Acción dice «Otra vez»', modo.verbo === TXT.otra && !hud.q('fin').hidden);
      modo.accion();
      check('Machacar Acción justo al terminar no reinicia: se ve el resultado', C.fase === 'fin' && C.resultado === 'win');
      C.finT -= FIN_PAUSA; modo.accion();
      check('«Otra vez» reinicia el duelo con 5 plumas', C.fase === 'cuenta' && C.r.plumas === PLUMAS && C.j.plumas === PLUMAS);
      C.fase = 'lucha'; C.r.plumas = 1; quieta(1.2); C.r.escudo = 0; usar(C.j, 'golpe_ala');
      check('Ganar otra vez no da los materiales de nuevo', C.resultado === 'win' && S.inv.madera === m0 + 2 && S.inv.piedra === p0 + 1 && toasts.includes(TXT.ganaOtra), S.inv.madera - m0);
      check('Ganar suma un duelo por etapa (Aprendiz: duelos_ganados_e0 = 1, luego 2) y nada en las otras etapas',
        e0Gana === 1 && etapasGana.every(v => v === null) && P.mundo('duelos_ganados_e0') === 2 && [1, 2, 3].every(i => P.mundo('duelos_ganados_e' + i) === null),
        JSON.stringify({ e0Gana, etapasGana, ahora: P.mundo('duelos_ganados_e0') }));
      if (G.v18evo && G.v18evo.revisarHitos && G.v18evo.info) {
        G.v18evo.revisarHitos(true); const xpE = G.v18evo.info('vittata').xp;
        P.cambiarMundo('duelos_ganados_e3', 7); P.cambiarMundo('duelos_ganados_e1', 3);
        const nHito = G.v18evo.revisarHitos(true), marcasE = Object.keys((P.evo() || {}).marcas || {}).filter(k => /duelos_ganados_e/.test(k));
        check('Los duelos por etapa no dan XP extra ni cuentan como hitos', nHito === 0 && G.v18evo.info('vittata').xp === xpE && !marcasE.length, JSON.stringify({ nHito, xpE, marcasE }));
      }
      P.recargar();
      check('Tras recargar, la victoria sigue marcada como pagada', !P.otorgar('combate_1', 'victoria_duelo', 1));
      check('Tras recargar, los duelos por etapa siguen guardados como números', P.mundo('duelos_ganados_e0') === 2);
      // 8. Derrota: mareo divertido, sin recompensa
      P.borrar(); const m1 = S.inv.madera;
      iniciar({ sinCuenta: true, especie: 'vittata' }); C.j.plumas = 1; C.r.pos.x = S.pos.x + 1.2; C.r.pos.z = S.pos.z; C.r.golpeT = 0; C.r.pensar = 0; C.r.mareo = 0; C.r.poderT = 99; evs.length = 0;
      correr(3, () => { C.r.pos.x = S.pos.x + 1.2; C.r.pos.z = S.pos.z; C.r.poderT = 99; });
      check('Si te quedas sin plumas: mareo breve, fin y sin recompensa', C.resultado === 'loss' && C.j.finMareo > 0 && S.inv.madera === m1 && evs.some(e => e.tipo === 'loss') && !evs.some(e => e.tipo === 'win'),
        JSON.stringify({ res: C.resultado, plj: C.j.plumas, fm: C.j.finMareo }));
      for (let i = 0; i < 60; i++) paso(0.05);
      check('El mareo final se pasa solo', C.j.finMareo === 0 && C.fase === 'fin');
      { // V18.1 §9: el panel final explica el resultado; tras perder sin usar el poder, el consejo es usarlo (con su nombre)
        const tt = hud ? hud.q('finTipTxt').textContent : '', tp = hud ? hud.q('finTipPod').textContent : '';
        const a = consejo(false, { poderJ: 1 }, 0), b = consejo(false, { poderJ: 2 }, 3), w0 = consejo(true, { poderJ: 0 }, 5), w1 = consejo(true, { poderJ: 1 }, 5);
        check('V18.1 §9: al perder, el panel da un consejo (sin usar el poder: «usa tu poder» con su nombre); con poder, acercarse o apartarse del «!»; al ganar, por qué',
          tt === (TACTIL ? TXT.tPoderT : TXT.tPoder) && tp === nombrePoder() && !!tp && a.id === 'tCerca' && b.id === 'tEsquiva' && w0.id === 'porGana' && !w0.pod && w1.id === 'porGanaPoder' && w1.pod === nombrePoder(),
          JSON.stringify({ tt, tp, a: a.id, b: b.id, w0: w0.id, w1: w1.id }));
      }
      salir();
      check('Al salir se devuelven Acción, Impulso y el modelo de Vittata', G.interaccion.modo !== modo && G.dones.sostener !== sostenerDuelo && hud.el.hidden && !pl3d &&
        !(G.actores && G.actores.player3D && Object.prototype.hasOwnProperty.call(G.actores.player3D, 'update')) && !scene.getObjectByName('v18_escudo') && !scene.getObjectByName('v18_onda'));
      {
        const tk = tipo => document.body.dispatchEvent(new KeyboardEvent(tipo, { key: 'g', code: 'KeyG', bubbles: true, cancelable: true }));
        const ex = G.v18explorar; if (ex && ex.soltar) ex.soltar(); // en exploración la G es del poder (explorar.js): aquí se mira solo el duelo
        tk('keydown'); const conG = !!(G.input && G.input.keys && G.input.keys.has('g')); tk('keyup');
        check('QA-173: fuera del duelo G vuelve a llegar a la cámara', conG && !G.input.keys.has('g'), String(conG));
        if (ex && ex.enganchar) ex.enganchar();
      }
      // QA-163: en táctil no hay tecla G: el aviso del duelo nombra los botones de pantalla. Se prueba con una instancia
      // «de puntero grueso» del módulo (matchMedia stub) y al final se restaura la instancia de siempre.
      {
        const mm = window.matchMedia;
        let combT = null; const orig = G.v18combate; // V18 por defecto: los módulos cargados al primer gesto guardan esta instancia
        try {
          window.matchMedia = q => (/pointer:\s*coarse/.test(q)
            ? { matches: true, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, onchange: null }
            : mm(q));
          delete G.v18combate;
          combT = window.AVV18Combate(G);
          combT.iniciar({ sinCuenta: true, especie: 'vittata' });
          const avisoT = (G.interaccion.modo && G.interaccion.modo.aviso) ? G.interaccion.modo.aviso() : null;
          const tagsT = !!document.querySelector('#v18-duelo-tags:not([hidden]) span:not([hidden])'); // du2: con las etiquetas a la vista el aviso calla
          check('QA-163: en táctil el aviso del duelo nombra los botones (o calla si las etiquetas de Acción e Impulso ya lo dicen) y no pide la tecla G',
            avisoT === (tagsT ? '' : TXT.avisoTactil) && avisoT !== TXT.aviso && !/\bG\b/.test(avisoT), JSON.stringify({ avisoT, tagsT }));
          combT.iniciar({ entreno: true, especie: 'vittata' });
          const kT = document.querySelector('#v18-duelo [data-k="entK"]'), tagA = document.querySelector('#v18-duelo-tags [data-t="b-act"]'), tagD = document.querySelector('#v18-duelo-tags [data-t="b-dash"]');
          const comoT = document.querySelector('#v18-duelo [data-a="como"]');
          check('Táctil: el entreno nombra los botones (Acción, Impulso), Acción e Impulso llevan etiqueta Ala / Semilla y «¿Cómo se pelea?» mide ≥ 56 px',
            kT && kT.textContent === TXT.accion && tagA && tagA.textContent === TXT.ala && tagD && tagD.textContent.indexOf(TXT.semilla) === 0 && comoT && parseFloat(getComputedStyle(comoT).minHeight) >= 56,
            JSON.stringify({ k: kT && kT.textContent, a: tagA && tagA.textContent, d: tagD && tagD.textContent, mh: comoT && getComputedStyle(comoT).minHeight }));
        } catch (e) { check('QA-163: en táctil el aviso del duelo nombra los botones y no pide la tecla G', false, e && e.message); }
        try { if (combT) combT.salir(); } catch (e) { /* ya fuera */ }
        window.matchMedia = mm;
        try { if (combT && combT.retirar) combT.retirar(); } catch (e) { /* ya fuera */ }
        if (hud && hud.el && !hud.el.isConnected) document.body.appendChild(hud.el);
        if (hud && hud.tags && !hud.tags.isConnected) document.body.appendChild(hud.tags); // montarHud() de la instancia de prueba quitó este #v18-duelo
        G.v18combate = orig; // deja la instancia de siempre (TACTIL según el dispositivo real), la misma que tienen los demás módulos
      }
    } catch (e) { check('Sin excepciones', false, e && (e.stack || e.message)); }
    // ---------- Combate 2.0 (para todos; ?combate2=0 lo apaga): máquina de estados, pico, impacto, hit-stop y equilibrio intacto ----------
    try {
      const dt = 1 / 30, A2 = f => f.anima2 || {}, ch = C.ch, raiz0 = ch ? ch.root.scale.y : 0;
      const ver = (s, antes, cada) => { for (let t = 0; t < s; t += dt) { if (antes) antes(); paso(dt); if (pl3d) pl3d.update(dt); if (cada) cada(); } };
      const frena = () => { M.vx = M.vz = 0; const r = C.r; r.pensar = 99; r.tiroT = 99; r.esquivaT = 99; r.poderT = 99; r.golpeT = 99; r.mov.t = 0; };
      // Sin la bandera: la capa de siempre (vida) y nada de la nueva
      G.combate2 = false;
      iniciar({ sinCuenta: true, especie: 'vittata' }); quieta(1.2); ver(0.5, frena);
      check('C2: sin la bandera todo sigue con la capa de siempre (vida), sin estados ni escala de Combate 2.0',
        !!C.r.anima && !C.r.anima2 && !(C.j && C.j.anima2) && (!ch || Math.abs(ch.root.scale.y - raiz0) < 1e-6), JSON.stringify({ anima: !!C.r.anima, anima2: !!C.r.anima2 }));
      // Equilibrio: el mismo duelo con guion y semilla, con y sin la bandera, da lo mismo (IA, tiempos, daño y resultado)
      const duelo = on => {
        G.combate2 = on; iniciar({ sinCuenta: true, especie: 'vittata', semilla: 11, dificultad: DIFICULTAD[1], sinExtIA: true }); // la capa visual sola (las extremidades de la IA, en «C2 · …»)
        S.pos.x = sitio.x - 4; S.pos.z = sitio.z; let n = 0;
        for (let t = 0; t < 30 && C.fase === 'lucha'; t += dt, n++) {
          const r = C.r, dx = r.pos.x - S.pos.x, dz = r.pos.z - S.pos.z, d = Math.hypot(dx, dz) || 1; S.facing = { x: dx / d, z: dz / d }; M.vx = M.vz = 0;
          if (d > 1.8) { S.pos.x += dx / d * 3.6 * dt; S.pos.z += dz / d * 3.6 * dt; }
          if (n % 14 === 3 && d < 2.4) usar(C.j, 'golpe_ala');
          if (n % 75 === 40) usar(C.j, C.j.poder);
          if (n % 40 === 20 && d > 3.2) usar(C.j, 'semilla');
          paso(dt); if (pl3d) pl3d.update(dt);
        }
        return JSON.stringify({ fase: C.fase, res: C.resultado, pj: C.j.plumas, pr: C.r.plumas, ej: Math.round(C.j.energia), er: Math.round(C.r.energia), t: +(C.tLucha || 0).toFixed(2), st: C.stats, r: [+C.r.pos.x.toFixed(3), +C.r.pos.z.toFixed(3)] });
      };
      const sin = duelo(false), con = duelo(true);
      check('C2: equilibrio intacto (mismo duelo con semilla y guion: con y sin la bandera, igual IA, tiempos, daño y resultado)', sin === con, sin === con ? sin.slice(0, 160) : sin + ' ≠ ' + con);
      G.combate2 = true; salir();
      // Espera viva: tres variaciones que se turnan (guardia, curiosa, se sacude)
      // (con un luchador de prueba quieto: en la lucha la Campeona casi nunca está quieta tanto tiempo)
      const idles = new Set(), fq = { id: 'quieta', pos: { x: 0, y: 0, z: 0 }, plumas: 5, mareo: 0 };
      if (ch) { for (let t = 0; t < 10.6; t += dt) { C2.pasoReloj(dt); const a = C2.antes(ch, fq, { vel: 0 }, dt); if (a.sub === 'espera') idles.add(a.idle); } C2.soltar(ch, fq); }
      check('C2: en la espera, tres variaciones que se turnan (guardia que bota, curiosa, se sacude las plumas)', idles.size === 3, JSON.stringify([...idles]));
      // Golpe de ala de la jugadora: su pose de impacto sale en el mismo cuadro, la Campeona encaja el golpe (impacto, pico
      // abierto, aplastada), hay hit-stop y todo vuelve a la espera
      iniciar({ sinCuenta: true, especie: 'vittata' }); quieta(1.2); C.r.escudo = 0; C.r.inv = 0; C.j.cd.golpe_ala = 0; cara(1); ver(0.2, frena);
      const ug = usar(C.j, 'golpe_ala'), accJ = A2(C.j).acc, imp = { parada: C2.parada, u: accJ && accJ.u, fam: accJ && accJ.fam };
      let impR = 0, picoR = 0, syMin = 9; const subs = [];
      ver(0.7, frena, () => { const a = A2(C.r); if (a.sub === 'impacto') impR++; picoR = Math.max(picoR, a.pico || 0); syMin = Math.min(syMin, a.sy || 1); if (subs[subs.length - 1] !== a.sub) subs.push(a.sub); });
      check('C2: golpe de ala → la pose de impacto de la jugadora coincide con el golpe (mismo cuadro), la Campeona encaja (impacto, pico abierto, aplastada), hit-stop y vuelve',
        ug.acierto && imp.fam === 'ala' && imp.u >= C2.FAM.ala.imp - 1e-6 && imp.parada >= 0.06 && impR >= 3 && picoR > 0.4 && syMin < 0.95 && subs[0] === 'impacto' && A2(C.r).sub !== 'impacto',
        JSON.stringify({ acierto: ug.acierto, imp, impR, picoR: +picoR.toFixed(2), syMin: +syMin.toFixed(3), subs }));
      // Mareo → aturdido → recupera (sacude la cabeza) → espera
      C.r.mareo = 0.8; const subsM = []; ver(1.5, frena, () => { const s = A2(C.r).sub; if (subsM[subsM.length - 1] !== s) subsM.push(s); });
      check('C2: mareada pasa a «aturdido» (con estrellitas) y al pasarse se recupera (sacude la cabeza) antes de volver', subsM.indexOf('aturdido') >= 0 && subsM.indexOf('recupera') > subsM.indexOf('aturdido'), JSON.stringify(subsM));
      // Telegrafía de la Campeona: anticipación que crece y, al soltar el aletazo, la acción entra directa en su impacto
      quieta(1.8); C.sinExtIA = true; C.j.inv = 0; C.r.golpeT = 0; C.r.pensar = 0; C.r.tiroT = 99; C.r.esquivaT = 99; C.r.poderT = 99; const subsA = []; let alaAnt = 0;
      ver(1.0, () => { M.vx = M.vz = 0; C.r.esquivaT = 99; C.r.poderT = 99; C.r.tiroT = 99; }, () => { const a = A2(C.r); if (subsA[subsA.length - 1] !== a.sub) subsA.push(a.sub); if (a.sub === 'anticipa') alaAnt = Math.max(alaAnt, Math.abs(a.out[C2.I.alaXL]) + Math.abs(a.out[C2.I.alaXR])); });
      check('C2: la Campeona anticipa su aletazo (ala atrás que crece con el aviso) y luego golpea (anticipa → ala)', subsA.indexOf('anticipa') >= 0 && subsA.indexOf('ala') > subsA.indexOf('anticipa') && alaAnt > 0.4, JSON.stringify({ subsA, alaAnt: +alaAnt.toFixed(2) }));
      // Grito: se echa atrás y lanza la cabeza con el pico abierto del todo (el del modelo también: ch.pico) y anillos del pico
      quieta(3); C.j.energia = 100; C.j.cd = {}; C.j.mareo = 0; ver(0.2, frena); if (G.v18fx) for (let i = 0; i < 25; i++) G.v18fx.paso(0.1); const an0 = G.v18fx ? G.v18fx.estado().anillos : 0;
      const ug2 = usar(C.j, 'grito_yunque'); let picoJ = 0, picoM = 0, cabMin = 9, cabMax = -9; const an1 = G.v18fx ? an0 + G.v18fx._interno.ranillos.filter(a => a && a.alcance < 1.5).length : 0; // los del pico (1,1 m)
      ver(0.5, frena, () => { const a = A2(C.j); picoJ = Math.max(picoJ, a.pico || 0); if (a.sub === 'grito') { cabMin = Math.min(cabMin, a.out[C2.I.cabX]); cabMax = Math.max(cabMax, a.out[C2.I.cabX]); }
        if (pl3d && pl3d.estadoCara) picoM = Math.max(picoM, pl3d.estadoCara().pico || 0); else if (pl3d) picoM = Math.max(picoM, pl3d.picoT || 0); });
      check('C2: Grito → se echa atrás y lanza la cabeza (arco), pico abierto del todo en el modelo (ch.pico) y anillos que salen del pico',
        ug2.ok && picoJ > 0.95 && (!pl3d || picoM > 0.9) && cabMin < -0.05 && cabMax - cabMin > 0.3 && (!G.v18fx || an1 - an0 >= 2), JSON.stringify({ picoJ: +picoJ.toFixed(2), picoM: +picoM.toFixed(2), cabX: [+cabMin.toFixed(2), +cabMax.toFixed(2)], anillos: an1 - an0 }));
      // Familias de poder: cada poder registrado cae en una de las 7 familias con cuerpo propio
      const fams = new Set(Object.keys(C2.FAM)), malas = H.lista().filter(h => !fams.has(C2.famDe(h.id))).map(h => h.id);
      const porFam = {}; for (const h of H.lista()) porFam[C2.famDe(h.id)] = (porFam[C2.famDe(h.id)] || 0) + 1;
      check('C2: cada poder tiene familia de cuerpo (grito, canto, tiro, ojos, plumas, alas, esquiva o ala)', !malas.length && porFam.grito && porFam.canto && porFam.ojos && porFam.plumas && porFam.alas, JSON.stringify({ malas, porFam }));
      // Victoria de la jugadora y derrota caricaturesca de la Campeona (mareo con estrellas → se desploma → suspira)
      iniciar({ sinCuenta: true, especie: 'vittata' }); C.r.plumas = 1; quieta(1.2); C.r.escudo = 0; C.r.inv = 0; cara(1); ver(0.1, frena); C.j.cd.golpe_ala = 0; usar(C.j, 'golpe_ala');
      let est = 0, syP = 9; const subsF = []; const subsJ = [];
      ver(3.5, () => { M.vx = M.vz = 0; }, () => { const a = A2(C.r), b = A2(C.j); if (subsF[subsF.length - 1] !== a.sub) subsF.push(a.sub); if (subsJ[subsJ.length - 1] !== b.sub) subsJ.push(b.sub); if (G.v18fx && G.v18fx.estado().efectos) est++; if (a.sub === 'pierde') syP = Math.min(syP, a.sy || 1); });
      check('C2: al ganar la jugadora celebra (gana) y la Campeona pierde caricaturesca (mareo con estrellitas, se desploma y queda triste)',
        C.fase === 'fin' && C.resultado === 'win' && subsF.indexOf('pierde') >= 0 && subsJ.indexOf('gana') >= 0 && syP < 0.92 && (!G.v18fx || est > 10) && C.ch.expression === 'sad',
        JSON.stringify({ subsF, subsJ, syP: +syP.toFixed(3), est, ex: C.ch.expression }));
      // Sin saltos bruscos: el mayor cambio de un cuadro (a 30 cuadros/s) en los giros y en la escala, en todo lo de arriba
      const sm = Math.max(A2(C.r).saltoMax || 0, A2(C.j).saltoMax || 0), se = Math.max(A2(C.r).saltoEsc || 0, A2(C.j).saltoEsc || 0);
      check('C2: sin cortes bruscos (cada cuadro a 30 fps cambia como mucho 0,5 rad por giro y 0,12 de escala)', sm > 0 && sm < 0.5 && se < 0.12, JSON.stringify({ giro: +sm.toFixed(3), escala: +se.toFixed(3), donde: [A2(C.r).saltoK, A2(C.j).saltoK] }));
      // Con «Reducir movimiento», el golpe no sacude la cámara (y el estirar y aplastar va a la mitad)
      const RD = R.REDUCED, J = G.camara && G.camara.juice;
      try {
        R.REDUCED = true; iniciar({ sinCuenta: true, especie: 'vittata' }); quieta(1.2); C.r.escudo = 0; C.r.inv = 0; cara(1); ver(0.1, frena); if (J) { J.shake = 0; J.amp = 0; }
        C.j.cd.golpe_ala = 0; const u3 = usar(C.j, 'golpe_ala');
        check('C2: con «Reducir movimiento» el golpe no sacude la cámara', u3.acierto && (!J || !(J.shake > 0)), JSON.stringify({ acierto: u3.acierto, shake: J && J.shake }));
        R.REDUCED = false; ver(0.6, frena); quieta(1.2); C.r.escudo = 0; C.j.cd.golpe_ala = 0; C.r.inv = 0; C.r.mareo = 0; if (J) { J.shake = 0; J.amp = 0; } const u4 = usar(C.j, 'golpe_ala');
        check('C2: sin «Reducir movimiento» el golpe de la jugadora sacude un poco la cámara', u4.acierto && (!J || J.shake > 0), JSON.stringify({ acierto: u4.acierto, shake: J && J.shake, amp: J && J.amp }));
        if (J) { J.shake = 0; J.amp = 0; }
      } finally { R.REDUCED = RD; }
      // Coste: ms de la capa por luchador y cuadro (sin dibujar)
      const pf = C2.perf(); pf.reiniciar(); ver(2, frena); const pf2 = C2.perf();
      check('C2: la capa cuesta poco (CPU < 0,5 ms por luchador y cuadro)', pf2.llamadas > 0 && pf2.ms / (pf2.llamadas / 2) < 0.5, JSON.stringify({ ms: pf2.ms, llamadas: pf2.llamadas, msPorLuchador: +(pf2.ms / (pf2.llamadas / 2)).toFixed(4) }));
      // Al salir y al apagar la bandera, la escala de la raíz vuelve y la capa de siempre retoma
      salir(); G.combate2 = false; ver(0.3);
      check('C2: al apagar la bandera la escala de la Campeona vuelve y retoma la capa de siempre', !ch || (Math.abs(ch.root.scale.y - raiz0) < 1e-6 && Math.abs(ch.root.scale.x - raiz0) < 1e-6 && !C.r.anima2), JSON.stringify({ sy: ch && ch.root.scale.y, raiz0 }));
    } catch (e) { check('C2: sin excepciones', false, e && (e.stack || e.message)); }
    finally { G.combate2 = c2Prueba0; try { salir(); } catch (e) { /* ya fuera */ } }
    // ---------- Combate 2.0 · extremidades y combos (para todos; Kelvin 10-nov: «controles para ala izquierda, ala derecha,
    // pierna izquierda, pierna derecha y poder crear combos») ----------
    const prisa0 = vidaApi.ext.sinPrisa();
    try {
      const dt = 1 / 30, A2 = f => f.anima2 || {}, X = vidaApi.ext, I2 = C2.I;
      const ver = (s, antes, cada) => { for (let t = 0; t < s; t += dt) { if (antes) antes(); paso(dt); if (pl3d) pl3d.update(dt); if (cada) cada(); } };
      const quieta2 = dx => { const r = C.r; r.pos.x = S.pos.x + (dx || 1.2); r.pos.z = S.pos.z; r.pensar = 99; r.esquivaT = 99; r.poderT = 99; r.golpeT = 99; r.tiroT = 99; r.mov.t = 0; r.kb.t = 0; r.kb.x = r.kb.z = 0; r.prep = ''; M.vx = M.vz = 0; S.facing = { x: 1, z: 0 }; };
      const fresca = () => { C.j.ext = null; C.j.cd = {}; C.j.energia = 100; C.j.mareo = 0; C.j.inv = 0; C.r.inv = 0; C.r.mareo = 0; C.r.escudo = 0; C.r.plumas = C.r.plumasMax; C.j.plumas = C.j.plumasMax; C.timers.length = 0; };
      const tecla = (k, tipo) => { const e = new KeyboardEvent(tipo || 'keydown', { key: k, bubbles: true, cancelable: true }); dispatchEvent(e); return e; };
      // 1. Sin la bandera: ni teclas nuevas, ni botones, ni chips, ni «Combos»
      G.combate2 = false; iniciar({ sinCuenta: true, especie: 'vittata' }); quieta2();
      const evU = tecla('u'); tecla('u', 'keyup');
      const vis = q => !!document.querySelector(q);
      const sinUrl = /[?&]combate2=0\b/.test(location.search), u0 = X.motor.usar(C.j, 'alaIzq'); // el mapa de teclas solo cambia con ?combate2=0 al cargar
      check('C2 · extremidades: apagado (G.combate2 = false o ?combate2=0), U no hace nada, no hay botones táctiles, chips ni «Combos» y el mapa de teclas es el de siempre',
        !C.j.ext && !evU.defaultPrevented && !vis('#v18-duelo-ext:not([hidden])') && !vis('#v18-duelo .vd-ext:not([hidden])') && !vis('#v18-duelo .vd-combos-b:not([hidden])') && u0.ok === false && (!sinUrl || !(G.input && G.input.ACCIONES.includes('alaIzq'))),
        JSON.stringify({ ext: !!C.j.ext, prevenida: evU.defaultPrevented, u0, acciones: G.input && G.input.ACCIONES.length }));
      // 2. Cada extremidad con su tecla (U O J L) sale con su pose (ala de ese lado arriba y barriendo; pata de ese lado adelante)
      G.combate2 = true; iniciar({ sinCuenta: true, especie: 'vittata', sinExtIA: true }); quieta2(); ver(0.3, () => quieta2());
      const poses = {}; let posesOk = true;
      for (const k of X.EXT_K) {
        fresca(); quieta2(); ver(0.6, () => quieta2());
        const ev = tecla(X.teclaExt(k)); tecla(X.teclaExt(k), 'keyup');
        const E = X.EXT[k], izq = E.lado > 0; let ala = 0, barre = 0, pierna = 0, otra = 0; const h0 = (A2(C.j).historial || []).length;
        ver(0.3, () => quieta2(), () => { const o = A2(C.j).out; if (!o) return; ala = Math.max(ala, o[izq ? I2.alaL : I2.alaR]); barre = Math.min(barre, o[izq ? I2.alaXL : I2.alaXR]); pierna = Math.min(pierna, o[izq ? I2.piernaL : I2.piernaR]); otra = Math.min(otra, o[izq ? I2.piernaR : I2.piernaL]); });
        const subs = (A2(C.j).historial || []).slice(h0), fam = 'ext_' + E.tipo;
        const ok = ev.defaultPrevented && C.j.ext && C.j.ext.usos === 1 && subs.indexOf(fam) >= 0 && C.r.plumas === C.r.plumasMax - 1 &&
          (E.tipo === 'ala' ? ala > 0.8 && barre < -0.8 : pierna < -0.9 && otra > -0.4);
        poses[k] = { ok, fam: subs.join('>'), ala: +ala.toFixed(2), barre: +barre.toFixed(2), pierna: +pierna.toFixed(2), otra: +otra.toFixed(2), pl: C.r.plumas };
        posesOk = posesOk && ok;
      }
      check('C2 · extremidades: U, O, J y L dan su golpe con su pose (ala izquierda/derecha arriba y barriendo; pata izquierda/derecha adelante y la otra quieta) y quitan 1 pluma', posesOk, JSON.stringify(poses));
      // 3. Cada combo sale con su secuencia (y su nombre grande), y no con las equivocadas ni fuera de tiempo
      const prueba = (ks, gap) => { fresca(); quieta2(); ver(0.4, () => quieta2()); for (const k of ks) { if (k === 'poder') usar(C.j, C.j.poder); else usarExtJ(k); ver(gap, () => quieta2()); } return Object.keys((C.j.ext && C.j.ext.combos) || {}).join(','); };
      const vistos = {}; let combosOk = true;
      for (const c of X.COMBOS) if (c.sec) for (const q of c.sec) { const r = prueba(q, 0.25), nom = hud.q('combo'); const ok = r === c.id && nom && nom.dataset.id === c.id; vistos[q.join('+')] = r + (ok ? '' : ' ✗'); combosOk = combosOk && ok; ver(1.2, () => quieta2()); }
      check('C2 · combos: cada combo sale de su secuencia (las 14 formas: ¡Abanicazo!, ¡Patita Sabrosa!, ¡Cruzaíto!, ¡Revolú de Plumas! y ¡Brinco Coquí!) con su nombre en pantalla', combosOk, JSON.stringify(vistos));
      const malas = { 'alaIzq+alaIzq': prueba(['alaIzq', 'alaIzq'], 0.25), 'pataIzq+alaDer': prueba(['pataIzq', 'alaDer'], 0.25), 'alaDer+pataDer': prueba(['alaDer', 'pataDer'], 0.25),
        'pataDer+alaDer': prueba(['pataDer', 'alaDer'], 0.25), 'tarde': (fresca(), quieta2(), ver(0.4, () => quieta2()), usarExtJ('alaIzq'), ver(0.85, () => quieta2()), usarExtJ('alaDer'), ver(0.3, () => quieta2()), Object.keys(C.j.ext.combos).join(',')) };
      check('C2 · combos: las secuencias equivocadas no hacen combo, ni las entradas con más de 0,6 s entre una y otra', Object.values(malas).every(v => v === ''), JSON.stringify(malas));
      X.ponerSinPrisa(true); const lento = prueba(['alaIzq', 'alaDer'], 1.0), lento3 = prueba(['pataIzq', 'pataIzq', 'alaIzq'], 1.0); X.ponerSinPrisa(false); const normal = prueba(['alaIzq', 'alaDer'], 1.0);
      check('C2 · combos: con «Combos sin prisa» salen tocando despacio (1 s entre toques); sin la opción, no', lento === 'abanicazo' && lento3 === 'coqui' && normal === '', JSON.stringify({ lento, lento3, normal, ventanas: [X.VENTANA, X.VENTANA_LENTA] }));
      // 4. ¡Bomba Boricua!: el poder justo después de un combo (y no sin combo)
      const bomba = prueba(['alaIzq', 'alaDer', 'poder'], 0.4), nomB = hud.q('combo') && hud.q('combo').dataset.id, bombaSola = prueba(['poder'], 0.3);
      check('C2 · combos: ¡Bomba Boricua! remata con el poder justo después de un combo (con su nombre); el poder solo no la hace', /bomba/.test(bomba) && nomB === 'bomba' && bombaSola === '', JSON.stringify({ bomba, nomB, bombaSola }));
      // 5. Reglas: un combo quita lo mismo que un golpe (1 pluma), suelta a la rival antes de que deje de ser invulnerable y
      // deja a quien lo hizo recuperando (se le puede castigar)
      fresca(); quieta2(); ver(0.3, () => quieta2());
      usarExtJ('alaIzq'); ver(0.2, () => quieta2()); const rc = usarExtJ('alaDer');
      const bloq = { ala: usar(C.j, 'golpe_ala').motivo, ext: X.motor.usar(C.j, 'pataIzq').motivo }; let hueco = 0, libreT = -1;
      ver(1.6, () => quieta2(), () => { if (C.r.mareo <= 0 && C.r.inv > 0) hueco = Math.max(hueco, C.r.inv); if (libreT < 0 && C.j.ext.rec <= 0) libreT = C.tLucha; });
      check('C2 · combos: el combo quita 1 pluma como un golpe, suelta a la rival con su hueco para escapar (≥ 0,2 s antes de que acabe su invulnerabilidad) y deja a Vittata recuperando (ni ala ni extremidades)',
        rc.combo === 'abanicazo' && C.r.plumas === C.r.plumasMax - 1 && hueco >= 0.2 && bloq.ala === 'recupera' && bloq.ext === 'recupera' && libreT > 0,
        JSON.stringify({ combo: rc.combo, plumas: C.r.plumas, hueco: +hueco.toFixed(2), bloq }));
      // 6. Entreno: con la bandera, 5 pasos; los dos últimos enseñan ¡Abanicazo! y ¡Patita Sabrosa!
      iniciar({ entreno: true, especie: 'vittata', sinExtIA: true }); quieta2(); ent.paso = 3; pintarEntreno();
      const e4 = { paso: hud.q('entPaso').textContent, txt: hud.q('entTxt').textContent, k: hud.q('entK').textContent, puntos: hud.q('entPP').children.length };
      C.j.ext = null; usarExtJ('alaIzq'); ver(0.25, () => quieta2()); usarExtJ('alaDer'); const p4 = ent && ent.paso; ver(1.4, () => quieta2());
      usarExtJ('pataIzq'); ver(0.25, () => quieta2()); usarExtJ('pataDer'); const fin5 = !!(ent && ent.fin > 0);
      check('C2 · entreno: 5 pasos con la bandera y los dos últimos enseñan 2 combos (¡Abanicazo! y ¡Patita Sabrosa!)', pasosEnt().length === 5 && e4.paso === TXT.entPaso(4, 5) && e4.txt === (TACTIL ? TXT.t4 : TXT.e4) && e4.puntos === 5 && p4 === 4 && fin5, JSON.stringify({ e4, p4, fin5 }));
      salir();
      // 7. La IA usa extremidades y combos según su etapa (Aprendiz casi nunca; Maestro más)
      const iaUsa = dif => { let ext = 0, cmb = 0, s = 0; for (let k = 0; k < 3; k++) { iniciar({ sinCuenta: true, especie: 'vittata', dificultad: dif, semilla: 5 + k * 13 }); S.pos.x = sitio.x - 2; S.pos.z = sitio.z;
        for (let t = 0; t < 25 && C.fase === 'lucha'; t += 0.05) { const d = H.dirA(C.j, C.r); S.facing = { x: d.x, z: d.z }; if (d.d > 1.7) { S.pos.x += d.x * 4 * 0.05; S.pos.z += d.z * 4 * 0.05; } C.j.plumas = 5; paso(0.05); s += 0.05; }
        ext += C.stats.extIA || 0; cmb += C.stats.combosIA || 0; } return { ext, cmb, s: Math.round(s) }; };
      const iaA = iaUsa(DIFICULTAD[0]), iaM = iaUsa(DIFICULTAD[3]);
      check('C2 · IA: la Campeona también usa alas, patas y combos según su etapa (Aprendiz pocas veces; Maestro más, con combos)', iaM.ext > iaA.ext && iaM.cmb >= 1 && iaA.ext >= 1, JSON.stringify({ aprendiz: iaA, maestro: iaM }));
      // 8. Equilibrio: daño por segundo de la «mejor jugada» (siempre a tiro, sin fallos, esquiva los avisos) con y sin
      // extremidades y combos, contra la misma Campeona (con sus extremidades): dentro de ±10 %
      const SEQS = [['alaIzq', 'alaDer'], ['pataIzq', 'pataDer'], ['alaIzq', 'pataDer'], ['alaDer', 'alaDer', 'pataIzq'], ['pataDer', 'pataDer', 'alaIzq']];
      const mejor = (conExt, dif, sem) => {
        iniciar({ sinCuenta: true, especie: 'vittata', dificultad: dif, semilla: sem }); S.pos.x = sitio.x - 4; S.pos.z = sitio.z;
        let n = 0, plan = [];
        for (let t = 0; t < 120 && C.fase === 'lucha'; t += 0.05) {
          const r = C.r, j = C.j, d = H.dirA(j, r); S.facing = { x: d.x, z: d.z }; let mx = 0, mz = 0;
          if (d.d > 1.6) { mx += d.x; mz += d.z; }
          if (r.prep && (r.prep === 'golpe_ala' || r.prep.indexOf('ext:') === 0) && d.d < 2.7) { mx = -d.x; mz = -d.z; }
          if (C.balas.find(b => b.de === r && Math.hypot(b.m.position.x - S.pos.x, b.m.position.z - S.pos.z) < 4)) { mx = -d.z; mz = d.x; }
          S.pos.x += mx * 5.5 * 0.05; S.pos.z += mz * 5.5 * 0.05;
          const ox = S.pos.x - sitio.x, oz = S.pos.z - sitio.z, od = Math.hypot(ox, oz); if (od > 10.5) { S.pos.x = sitio.x + ox / od * 10.5; S.pos.z = sitio.z + oz / od * 10.5; }
          if (!(j.mareo > 0)) {
            if (plan.length) { if (--plan[0].w <= 0) usarExtJ(plan.shift().k); }
            else if (H.listo(j, j.poder).ok && d.d > 2.2 && d.d < 6) usar(j, j.poder);
            else if (conExt && d.d < 2.15 && !(r.inv > 0) && !(j.ext && j.ext.rec > 0)) { const q = SEQS[n++ % SEQS.length]; usarExtJ(q[0]); plan = q.slice(1).map(k => ({ k, w: 5 })); }
            else if (d.d < 2.3 && !(r.inv > 0) && H.listo(j, 'golpe_ala').ok) usar(j, 'golpe_ala');
            else if (d.d > 3.5 && j.energia >= 30 && H.listo(j, 'semilla').ok) usar(j, 'semilla');
          }
          paso(0.05);
        }
        return { q: (C.r.plumasMax || 5) - C.r.plumas, t: C.tLucha || 0 };
      };
      const dps = conExt => { let q = 0, t = 0; for (const di of [1, 3]) for (let k = 0; k < 4; k++) { const r = mejor(conExt, DIFICULTAD[di], 3 + k * 17); q += r.q; t += r.t; } return q / Math.max(1e-3, t); };
      const dA = dps(false), dB = dps(true), rel = dB / dA - 1;
      check('C2 · equilibrio: con extremidades y combos, la mejor jugada quita plumas al mismo ritmo (±10 %) que con lo de siempre',
        Math.abs(rel) <= 0.1, JSON.stringify({ siempre: +dA.toFixed(3), conCombos: +dB.toFixed(3), cambio: Math.round(rel * 1000) / 10 + ' %' }));
      // 9. Táctil a 390 × 844: el 2×2 cabe, sus botones miden ≥ 48 px y no tapa Acción, Impulso (con su etiqueta), Saltar ni Volar
      {
        const acts = { left: 390 - 20 - 182, right: 370, top: 844 - 28 - 170, bottom: 816, width: 182 }, tagTop = acts.top - 40; // ≥ 56 px (Kelvin)
        const hx = hudExt(), b = hx && hx.pad.querySelector('button'), cs = b && getComputedStyle(b), w = 2 * parseFloat(cs.width) + 8, h = 2 * parseFloat(cs.height) + 8;
        const sp = sitioPad(acts, tagTop, 390, w, h), z = sitioPad(Object.assign({}, acts, { left: 20, right: 202 }), tagTop, 390, w, h);
        const dentro = q => q.left >= 8 && q.left + w <= 382 && q.top >= 8 && q.top + h <= 844;
        const choca = (q, r) => !(q.left + w <= r.left || q.left >= r.right || q.top + h <= r.top || q.top >= r.bottom);
        const ok = parseFloat(cs.width) >= 56 && parseFloat(cs.height) >= 56 && dentro(sp) && dentro(z) && !choca(sp, { left: acts.left, right: acts.right, top: tagTop, bottom: acts.bottom }) && !choca(z, { left: 20, right: 202, top: tagTop, bottom: acts.bottom }) && !sp.zurdo && z.zurdo && sp.top > 66 + 140;
        check('C2 · táctil (390 × 844): el 2×2 de alas y patas cabe, mide ≥ 56 px y va encima de los botones grandes sin taparlos (también en modo zurdo)', ok, JSON.stringify({ boton: [cs.width, cs.height], sp, z }));
      }
      // 10. «Reducir movimiento»: el combo no sacude la cámara ni lanza partículas de fx_poderes; sin cortes bruscos en las poses
      const RD = R.REDUCED, J = G.camara && G.camara.juice;
      try { R.REDUCED = true; iniciar({ sinCuenta: true, especie: 'vittata', sinExtIA: true }); quieta2(); ver(0.2, () => quieta2()); if (J) { J.shake = 0; J.amp = 0; }
        const r1 = prueba(['alaIzq', 'alaDer'], 0.3), sh = J ? J.shake : 0, pf = G.v18fx && G.v18fx.combo ? G.v18fx.combo('abanico', 0, 50, 0, 4).ok : false;
        check('C2 · combos: con «Reducir movimiento» no sacuden la cámara ni lanzan partículas extra', r1 === 'abanicazo' && !(sh > 0) && pf === false, JSON.stringify({ r1, sh, pf })); }
      finally { R.REDUCED = RD; }
      const sm = A2(C.j).saltoMax || 0, se = A2(C.j).saltoEsc || 0;
      check('C2 · extremidades y combos sin cortes bruscos (a 30 fps, ≤ 0,5 rad por giro y ≤ 0,12 de escala por cuadro)', sm > 0 && sm < 0.5 && se < 0.12, JSON.stringify({ giro: +sm.toFixed(3), escala: +se.toFixed(3), donde: A2(C.j).saltoK }));
    } catch (e) { check('C2 · extremidades: sin excepciones', false, e && (e.stack || e.message)); }
    finally { G.combate2 = c2Prueba0; vidaApi.ext.ponerSinPrisa(prisa0); try { salir(); } catch (e) { /* ya fuera */ } }
    // QA-192: fuera del cap. 1 el duelo no se ofrece aunque la rival exista; la marca usa la misma guarda
    try {
      const cap1oferta = C.fase === 'nada' && !!C.ch; // lo que se ofrecería en cap1
      const pack0 = G.pack && G.pack.id; G.pack.id = 'ep4';
      try { check('QA-192: fuera del cap. 1 no se ofrece el duelo', !it.visible()); }
      finally { G.pack.id = pack0; }
      check('QA-192: en el cap. 1 la oferta solo depende del estado del duelo', it.visible() === cap1oferta);
    } catch (e) { check('QA-192: fuera del cap. 1 no se ofrece el duelo', false, e && e.message); }
    try { salir(); } catch (e) { /* ya fuera */ }
    { const K = G.camara.CAM; check('du3: al salir del duelo la cámara vuelve a su distancia, altura y dibujo de siempre', !G.camDuelo0 && K.dist !== CAM_DUELO.dist && K.height !== CAM_DUELO.height && !G.camara.draw.duelo, JSON.stringify({ d: K.dist, h: K.height })); }
    G.ui.toast = toast0;
    oyente.mudo = true; evs.length = 0; podEv.length = 0; // G.on no tiene «off»: los oyentes de la prueba se quedan mudos
    Object.assign(S.pos, pos0); S.facing = fac0; M.flying = fly0; M.vx = M.vz = 0;
    for (const k of Object.keys(S.inv)) if (!(k in inv0)) delete S.inv[k];
    Object.assign(S.inv, inv0); try { if (G.objetos && G.objetos.renderInv) G.objetos.renderInv(); } catch (e) { /* HUD */ }
    try { if (crudo == null) localStorage.removeItem(P.clave()); else localStorage.setItem(P.clave(), crudo); } catch (e) { /* sin almacenamiento */ }
    P.recargar(); Object.assign(pista.dom, dom0);
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }
  // Vista de cumbre: posición de la rival para el minimapa mientras la jugadora la «ve desde la cumbre» (lee minimapa.js)
  function mapa() {
    if (!(C.j && C.j.vistacumbre > 0 && C.r && (C.fase === 'lucha' || C.fase === 'cuenta'))) return null;
    return { x: C.r.pos.x, z: C.r.pos.z, nombre: 'Rival' };
  }
  // Solo para la instancia de prueba de QA-163: quita del mundo su rival, su marca y su interacción, y deja sus oyentes mudos
  function retirar() {
    try { salir(); } catch (e) { /* ya fuera */ }
    retirada = true; const i = G.interaccion.list.indexOf(it); if (i >= 0) G.interaccion.list.splice(i, 1);
    scene.remove(marca); if (marcaAviso) scene.remove(marcaAviso); const quitar = ch => { if (ch && ch.root) scene.remove(ch.root); };
    quitar(C.ch); Promise.resolve(C.listo).then(quitar, () => {});
    if (hud && hud.el) hud.el.remove();
    if (hud && hud.tags) hud.tags.remove();
    if (hud && hud.ext && hud.ext.pad) hud.ext.pad.remove();
  }
  G.v18combate = { sitio, iniciar, salir, otraVez, usar, paso, vida: vidaApi, estado: () => C, entreno: () => ent, saltarEntreno, mapa, test, retirar, DIFICULTAD, CLASICA, dificultadDe };
  return G.v18combate;
};
