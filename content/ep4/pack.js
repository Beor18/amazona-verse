/* Content pack EP4 · «El precio del progreso» · jugable de principio a fin: «Lo que hay en la orilla», «Todas las voces» y
   «La maqueta y el acuerdo», el primer cruce y el Aula del episodio: «Iguaca te pregunta» (formativa, opcional, sin puntaje),
   el Modo Maestro (misma puerta y esquema que los ep. 1 y 2: src/game/aula.js con lecciones.js) y el Diario del ep. 4.
   Sale de content/ep2 y reutiliza el motor tal cual (nada de src/ tocado). Diseño: docs/equipo/EP4_GDD.md (AH1).
   Ábrelo con index.html?pack=ep4 (boot.js lo carga solo, con lecciones.js y en.js). Inglés: en.js (se suma a content/cap1/en.js).
   Lo que depende del canon de Kelvin (EP4_GDD.md §10) va con el marcador neutro [KELVIN] y no es canon.
   Regla del capítulo: ninguna opción lo maximiza todo, ni con su cuidado puesto (la prueba lo comprueba con todas las parejas).
   Las hojas de la Balanza son valores del juego, no datos del mundo real; el único dato real es el de los huecos de nido, con su
   fuente. Todo el estado va en S.collected (se guarda solo): observaciones, voces, pruebas de la maqueta, acuerdo y cuidado. */
(function () {
  'use strict';
  const LUMA = { x: -4, z: 2 }, ABUELA = { x: -1, z: -5 }, PAPA = { x: -6, z: -13 }, NAVEGA = { x: 1.2, z: 4.8 }, MESA = { x: -5, z: -2 };
  const RIO = 8; // el río corre de norte a sur por x = 8; Villa Raíz queda al oeste y la otra comunidad al este
  // Los tres tramos del río (M1) y lo que se observa en cada uno (valores del juego)
  const TRAMOS = {
    a: { id: 'a', nombre: 'el estrecho', z: -13, ve: 'El río es estrecho aquí. En la orilla hay un bosquecillo con sombra sobre el agua.' },
    b: { id: 'b', nombre: 'río abajo', z: 13, ve: 'Las orillas son altas y el río es ancho. Aquí cabría un puente alto, pero el camino es largo.' },
    c: { id: 'c', nombre: 'el remanso', z: 2, ve: 'El agua va tranquila. Pasan canoas de una orilla a otra: aquí ya se cruza remando.' },
  };
  const TIDS = Object.keys(TRAMOS);
  const OBS = TIDS.map(i => 'obs_' + i).concat('obs_bosque');
  const BOSQUE = { x: -1, z: -17 }; // el bosquecillo del estrecho: huecos de nido y sombra
  const FUENTE = 'USFWS, Programa interagencial de la cotorra puertorriqueña (2026)';
  const IMG = { Iguaca: 'assets/luma.png', Vittata: 'assets/vittata.png', Abuela: 'assets/agilis.png', 'Papá': 'assets/vittata.png', Navegante: 'assets/agilis.png', 'Guardián': 'assets/guardian.png' };
  const di = (who, text) => ({ who, img: IMG[who], text });
  const Lu = t => di('Iguaca', t);

  // ---------- La Balanza (EP4_GDD.md §5): 3 opciones × 4 ejes, de 1 a 3 hojas; sin suma ni ganador ----------
  const EJES = [
    { id: 'conexion', nombre: 'Conexión', icono: '🤝' }, { id: 'bosque', nombre: 'Bosque', icono: '🌳' },
    { id: 'rio', nombre: 'Río', icono: '🛶' }, { id: 'esfuerzo', nombre: 'Esfuerzo', icono: '🔨' },
  ];
  const OPCIONES = {
    a: { id: 'a', nombre: 'Puente en el estrecho', corto: 'el puente del estrecho', tramo: 'a', hojas: { conexion: 3, bosque: 1, rio: 2, esfuerzo: 2 },
      prueba: ['La abuela de juguete cruza a pie en un momento. ¡Qué rápido!', 'Pero para apoyar las vigas hay que quitar el bosquecillo: los huecos de nido y la sombra se van.', 'Con la crecida de prueba, la canoa de juguete ya no cabe por debajo.'] },
    b: { id: 'b', nombre: 'Puente alto río abajo', corto: 'el puente alto', tramo: 'b', hojas: { conexion: 2, bosque: 3, rio: 3, esfuerzo: 1 },
      prueba: ['La canoa de juguete pasa por debajo siempre, hasta con la crecida.', 'Casi no se corta nada: el bosquecillo se queda.', 'Pero el camino es largo para la abuela y harán falta muchas manos y muchos días.'] },
    c: { id: 'c', nombre: 'Muelles y canoas', corto: 'los muelles y las canoas', tramo: 'c', hojas: { conexion: 1, bosque: 3, rio: 2, esfuerzo: 3 },
      prueba: ['Dos muelles pequeños: se hacen en poco tiempo y no se corta nada.', 'Se cruza remando, y las dos comunidades reman juntas.', 'Pero con la crecida de prueba nadie puede cruzar, y siempre hace falta alguien que reme.'] },
  };
  const OIDS = Object.keys(OPCIONES);
  // Cuidados (mitigaciones): cada uno mejora un eje en una hoja, sin arreglarlo todo; alguno cuesta esfuerzo
  const CUIDADOS = {
    replantar: { nombre: 'Replantar yagrumos junto a los tocones', eje: 'bosque', mas: 1, para: ['a'] },
    cajas: { nombre: 'Poner cajas nido donde estaban los huecos', eje: 'bosque', mas: 1, para: ['a'] },
    paso: { nombre: 'Subir el centro del puente para que pasen las canoas', eje: 'rio', mas: 1, cuesta: 1, para: ['a'] },
    descansos: { nombre: 'Bancos a la sombra en el camino largo', eje: 'conexion', mas: 1, para: ['b'] },
    minga: { nombre: 'Construir por turnos con la otra comunidad', eje: 'esfuerzo', mas: 1, para: ['b'] },
    turnos: { nombre: 'Turnos de remo y una campana para llamar', eje: 'conexion', mas: 1, para: ['c'] },
  };
  const CIDS = Object.keys(CUIDADOS);
  // Hojas de una opción con su cuidado (tope 3; un costo nunca baja de 1)
  function hojasCon(op, cu) {
    const h = Object.assign({}, OPCIONES[op].hojas), c = CUIDADOS[cu];
    if (c && c.para.includes(op)) { h[c.eje] = Math.min(3, h[c.eje] + c.mas); if (c.cuesta) h.esfuerzo = Math.max(1, h.esfuerzo - c.cuesta); }
    return h;
  }
  const puntos = n => '●'.repeat(n) + '○'.repeat(3 - n);
  const fila = h => EJES.map(e => `${e.icono} ${e.nombre} ${puntos(h[e.id])}`).join(' · ');

  // ---------- Misión 2 · «Todas las voces»: cada voz deja una tarjeta con lo que le importa (un eje de la Balanza) ----------
  const VOCES = {
    abuela: { quien: 'Abuela', eje: 'conexion', dice: 'Quiero cruzar a pie para ver a mi familia del otro lado, también cuando llueve.', tarjeta: 'Cruzar a pie, todo el año' },
    papa: { quien: 'Papá', eje: 'bosque', dice: 'En el bosquecillo del estrecho hay huecos de nido y sombra para el río. Si se corta, se pierden.', tarjeta: 'Cuidar el bosquecillo' },
    // La navegante es la del ep. 3 (de Villa Raíz, EP3_NARRATIVA.md): habla por el río y las canoas, no por la otra comunidad. [KELVIN: nombre y especie de quien navega]
    navegante: { quien: 'Navegante', eje: 'rio', dice: 'Las canoas tienen que poder pasar, también con el río crecido. Del río vivimos.', tarjeta: 'Que las canoas pasen' },
    iguaca: { quien: 'Iguaca', eje: 'esfuerzo', dice: 'Somos pocos y tenemos pocas vigas. Lo que hagamos tiene que caber en lo que podemos construir.', tarjeta: 'Que lo podamos construir' },
  };
  const VIDS = Object.keys(VOCES);
  const VOC = VIDS.map(v => 'voz_' + v);
  // Quién nombra el costo de cada opción cuando se dice «esta es la mejor para todos»
  const PIERDE = { a: 'papa', b: 'iguaca', c: 'abuela' };
  const RECLAMO = {
    a: '¿Y los huecos de nido del bosquecillo? Para el puente del estrecho hay que cortarlo.',
    b: '¿Con qué manos y en cuántos días? El puente alto es mucho trabajo para tan pocos.',
    c: '¿Y si hay crecida y nadie rema? Yo sola no puedo cruzar en canoa, mi niña.',
  };
  const FRASES = ['Ninguna lo da todo: decidamos juntos qué cuidar.', 'Cada opción da algo y cuesta algo.'];
  const PALABRAS = ['Esto te cuesta a ti, y así lo vamos a cuidar.', 'Te escuché: lo que pierdes no se nos olvida.'];

  const DIALOGOS = { escenas: [
    // Lo que depende del canon (EP4_GDD.md §10) va en «nota», nunca en «lineas» (regla de los packs; ep4Test lo comprueba)
    { id: 'e_inicio', disparador: 'inicio:ep4', personaje: 'Vittata', emocion: 'feliz', nota: '[KELVIN: quién es la otra comunidad y cómo se llama (EP4_GDD.md §10.1); el plano es el que dio la Vecina al final del ep. 3]',
      lineas: ['La abuela quiere visitar a su familia del otro lado del río. Y el plano que nos dio la Vecina… ¡ya lo redibujé como un puente!', 'Lo pongo en el sitio más corto y listo… ¿no?'] },
    { id: 'e_iguaca', disparador: 'interact:iguaca', personaje: 'Iguaca', emocion: 'idea', lineas: ['Un puente es una gran idea. Pero antes de dibujarlo, mira lo que ya hay en la orilla.', 'Mira los tres tramos del río: el estrecho, el remanso y río abajo. Y posa la vista en el bosquecillo del estrecho.'] },
    { id: 'e_orilla', disparador: 'evento:ShoreSurveyed', personaje: 'Iguaca', emocion: 'pensando', lineas: ['Ya sabes lo que hay en cada orilla. Ahora falta saber a quién le importa cada cosa.', 'Escucha a la abuela, al papá, a la navegante del muelle… y a mí. Cada voz te deja una tarjeta.'] },
    { id: 'e_voces', disparador: 'evento:VoicesHeard', personaje: 'Iguaca', emocion: 'idea', lineas: ['Cuatro voces, cuatro tarjetas. Llévalas a la Balanza de la mesa y mira qué da y qué cuesta cada opción.'] },
    { id: 'e_balanza', disparador: 'evento:TradeoffSeen', personaje: 'Iguaca', emocion: 'feliz', lineas: ['Eso es: aquí no hay una sola respuesta. Cada opción da algo a alguien y le cuesta algo a otro.', 'Pruébalas en la maqueta antes de decidir. Luego hacemos la asamblea.'] },
    { id: 'e_guardian', disparador: 'evento:TradeoffSeen', personaje: 'Guardián', emocion: 'pensando', nota: '[KELVIN: qué recuerda el Guardián de antes de la Gran Ruptura (EP4_GDD.md §10.6); pista para el ep. 5, sin revelar]', lineas: ['Antes también se cruzaba este río… pero no recuerdo cómo.'] },
    { id: 'e_fin_a', disparador: 'evento:Chapter4Completed', personaje: 'Abuela', emocion: 'feliz', lineas: ['¡Otra vez del otro lado! Mi familia me esperaba con café.'] },
    { id: 'e_fin_i', disparador: 'evento:Chapter4Completed', personaje: 'Iguaca', emocion: 'feliz', lineas: ['No elegiste lo perfecto: elegiste con todos y cuidaste lo que costaba. Eso también es construir.', 'Cuando quieras, ven y te hago unas preguntas sobre lo que hicimos. Sin prisa y sin nota.'] },
    // La Voz solo llega por el transmisor y la luz de la niebla (TEMPORADA1_HILO.md §5.10): aquí el Guardián recuerda, no oye; el transmisor solo da estática desde este capítulo (gancho al ep. 5)
    { id: 'e_fin_v', disparador: 'evento:Chapter4Completed', personaje: 'Guardián', emocion: 'idea', nota: '[KELVIN: si la Voz dice algo en el ep. 4 o solo estática (EP4_GDD.md §10.7); gancho al ep. 5]', lineas: ['El transmisor lleva días dando solo estática. Y aun así, al ver cruzar a la abuela, me vino un recuerdo: alguien de antes también cruzó aquí… y nos llamaba por el aparato.'] },
  ] };

  AVE.registerPack({
    id: 'ep4',
    archivos: ['lecciones.js', 'en.js'], // la lección del Aula (window.AV_LECCIONES_EP4) y el inglés del episodio; boot.js los carga después
    meta: {
      titulo: 'El precio del progreso', capitulo: 4, almacen: 'ep4',
      hud: { capitulo: 'Capítulo 4', titulo: 'El precio del progreso', portada: 'Capítulo 4 · El precio del progreso',
        etiqueta: 'Capítulo 4 · El precio del progreso', fin: '¡El primer cruce!',
        nota: 'Capítulo 4: una forma de cruzar el río, con todos. No uses tu nombre real.', inventario: {} },
    },
    jugador: { nombre: 'Vittata', sprite: 'assets/vittata.png', especie: 'vittata', altura: 1.75, aparicion: { x: -6, z: 5 }, camara: 0.6 },
    // edu: aula del episodio (respuestas de «Iguaca te pregunta» y el registro local)
    guardado: { version: 1, claves: ['edu'], estado: () => ({ edu: { inicio: null, fin: null, fichas: [], formativa: {}, registro: null } }) },
    aula: { clave: 'amazonaverse.aula.cap4', estado: 'edu', archivo: 'amazonaverse_cap4', lecciones: () => window.AV_LECCIONES_EP4 },
    // Criadero: el mismo del cap. 1 (la cría sigue a Vittata); el nido entra al cerrar M1 con Iguaca. Ninguna cápsula se compra.
    criadero: { desde: 'ShoreSurveyed', almacen: 'amazonaverse' },

    mundo: {
      tamano: 40, segmentos: 80,
      exposicion: 0.74,
      cielo: { color: '#c3e2f0', cenit: '#2a7fd4', sol: '#fff1cf', niebla: [40, 1000], nieblaAltura: [8, 70] },
      luces: { cielo: '#cfe6ff', suelo: '#45602e', hemi: 0.66, sol: '#fff0d6', solInt: 2.0, solPos: [-42, 70, 46] },
      post: { saturacion: 1.08, contraste: 1.04, bloom: 0.2, vineta: 0.16 },
      mar: { laguna: '#86e3cf', somero: '#1fa9ad', hondo: '#0b4f86' },
      lugares: { inicio: { x: -6, z: 4, r: 5 }, mesa: { x: MESA.x, z: MESA.z, r: 3 } },
      terreno: {
        ondas: [{ fn: 'sin', x: 0.08, amp: 0.4 }, { fn: 'cos', z: 0.06, amp: 0.35 }],
        relieves: [{ tipo: 'cauce', x: RIO, mitad: 6, pendiente: 0.7 }],
        planos: ['inicio', 'mesa'],
      },
      rio: { x: RIO },
      agua: { x: RIO, ancho: 10, color: '#5fe3d6', nivel: { x: RIO, z: 2, sobre: 2.6 } },
      arboles: { cantidad: 34, semilla: 9, copaCada: 2, margenRio: 6, copaColor: '#2f7d43',
        evitar: [LUMA, ABUELA, PAPA, NAVEGA, MESA, { x: BOSQUE.x, z: BOSQUE.z, r: 5 }].concat(TIDS.map(i => ({ x: RIO - 6, z: TRAMOS[i].z }))) },
      oceano: { color: '#0b4f86', y: -2.6 },
    },
    npcs: [
      { id: 'iguaca', nombre: 'Iguaca', sprite: 'assets/luma.png', x: LUMA.x, z: LUMA.z, escala: 2.2, flota: true },
      { id: 'abuela', nombre: 'Abuela', sprite: IMG.Abuela, x: ABUELA.x, z: ABUELA.z, escala: 1.8 },
      { id: 'papa', nombre: 'Papá', sprite: IMG['Papá'], x: PAPA.x, z: PAPA.z, escala: 1.8 },
      { id: 'navegante', nombre: 'Navegante', sprite: IMG.Navegante, x: NAVEGA.x, z: NAVEGA.z, escala: 1.8 },
    ],
    objetos: {}, recursos: [],

    // ---------- Historia: la orilla (M1), las voces y la Balanza (M2), la maqueta, el acuerdo y la obra (M3), el cruce ----------
    historia: {
      pasos: [
        { id: 'hablar', texto: 'Habla con Iguaca', guia: G => G.misiones.at('iguaca') },
        { id: 'orilla', texto: 'Mira los 3 tramos del río y el bosquecillo', progreso: S => ` (${OBS.filter(k => S.collected.includes(k)).length}/4)`,
          hasta: { mision: 'orilla' }, guia: G => { const k = OBS.find(o => !G.S.collected.includes(o)); return G.misiones.at(k === 'obs_bosque' ? 'bosque' : 'tramo_' + (k ? k.slice(4) : 'a')); } },
        { id: 'volver', texto: 'Cuéntale a Iguaca lo que viste', guia: G => G.misiones.at('iguaca') },
        { id: 'voces', texto: 'Escucha todas las voces', progreso: S => ` (${VOC.filter(k => S.collected.includes(k)).length}/4)`,
          hasta: { recogido: VOC }, guia: G => G.misiones.at(VIDS.find(v => !G.S.collected.includes('voz_' + v)) || 'iguaca') },
        { id: 'balanza', texto: 'Pon las tarjetas en la Balanza de la mesa', hasta: { mision: 'voces' }, guia: G => G.misiones.at('mesa') },
        { id: 'maqueta', texto: 'Prueba las 3 opciones en la maqueta', progreso: S => ` (${OIDS.filter(o => S.collected.includes('prueba_' + o)).length}/3)`,
          hasta: { evento: 'ModelTested' }, guia: G => G.misiones.at('mesa') },
        { id: 'acuerdo', texto: 'Haz la asamblea y elige un cuidado', hasta: { evento: 'CareChosen' }, guia: G => G.misiones.at('mesa') },
        { id: 'construir', texto: 'Construye lo acordado', hasta: { evento: 'ProjectBuilt' }, guia: G => G.misiones.at('obra') },
        { id: 'cruce', texto: 'Acompaña a la abuela en el primer cruce', guia: G => G.misiones.at('abuela') },
      ],
      fin: () => 'Miraste la orilla, escuchaste todas las voces y decidiste con todos qué ganar y qué cuidar. La abuela ya cruzó el río. Iguaca tiene unas preguntas para ti, cuando quieras.',
    },
    misiones: [
      { id: 'orilla', titulo: 'Lo que hay en la orilla', hud: 'Observar antes de construir',
        pasos: [{ texto: 'Mira los 3 tramos y el bosquecillo', hasta: { recogido: OBS } }], recompensa: { hito: 'orilla' } },
      { id: 'voces', titulo: 'Todas las voces', hud: 'Beneficios y costos',
        pasos: [{ texto: 'Escucha a los cuatro', hasta: { recogido: VOC } }, { texto: 'Mira la Balanza', hasta: { evento: 'TradeoffSeen' } }], recompensa: { hito: 'voces' } },
      { id: 'acuerdo', titulo: 'La maqueta y el acuerdo', hud: 'Probar, decidir y cuidar',
        pasos: [{ texto: 'Prueba las 3 opciones', hasta: { evento: 'ModelTested' } }, { texto: 'Asamblea', hasta: { evento: 'AgreementMade' } },
          { texto: 'Elige un cuidado', hasta: { evento: 'CareChosen' } }, { texto: 'Construye', hasta: { evento: 'ProjectBuilt' } }], recompensa: { hito: 'acuerdo' } },
    ],
    // Diario del ep. 4: 6 hallazgos, 3 de la ribera y 3 de cómo se cruzan los ríos. El texto del juego describe solo lo que hay en
    // el juego; el dato real de cada uno está en lecciones.js (mismo id) y va «por verificar»: no sale al Diario sin fuente.
    diario: {
      titulo: 'Cuaderno del río', corto: 'Cuaderno', boton: 'Cuaderno',
      categorias: { ribera: { nombre: 'Ribera', desconocido: 'Algo en la orilla', sonido: 'pickup', rafaga: 'feathers' },
        cruces: { nombre: 'Cruces', desconocido: 'Una forma de cruzar', sonido: 'pickup', rafaga: 'gold' } },
      entradas: [
        { id: 'raices', cat: 'ribera', nombre: 'Raíces en la orilla', x: 1.5, z: -9, texto: 'Raíces que bajan hasta el agua y sujetan la tierra de la orilla.',
          modelo: (add) => { for (const dx of [-0.3, 0, 0.3]) { const m = add(new THREE.CylinderGeometry(0.04, 0.07, 0.9, 5), '#6b4a2a', dx, 0.3, 0); m.rotation.z = dx; } } },
        { id: 'sombra', cat: 'ribera', nombre: 'Sombra sobre el agua', x: 1, z: -21, texto: 'Bajo las ramas, el agua está más quieta y se ven pececitos.',
          modelo: (add) => { add(new THREE.CylinderGeometry(0.7, 0.7, 0.03, 14), '#3d6a5a', 0, 0.02, 0); } },
        { id: 'hoja_seca', cat: 'ribera', nombre: 'Hojas en el remanso', x: 1.5, z: 7, texto: 'Hojas caídas que el agua lleva despacio por el remanso.',
          modelo: (add) => { for (const [dx, dz] of [[-0.2, 0], [0.2, 0.15], [0, -0.2]]) add(new THREE.BoxGeometry(0.22, 0.02, 0.12), '#b58a3a', dx, 0.03, dz); } },
        { id: 'soga', cat: 'cruces', nombre: 'Soga vieja de cruce', x: -2, z: 9, texto: 'Una soga gruesa atada a un poste. Alguien la usó para cruzar.',
          modelo: (add) => { add(new THREE.CylinderGeometry(0.06, 0.07, 1.2, 6), '#8a6a3a', 0, 0.6, 0); add(new THREE.TorusGeometry(0.25, 0.05, 6, 12), '#c9a86a', 0, 0.9, 0); } },
        { id: 'remo', cat: 'cruces', nombre: 'Remo de madera', x: -4, z: 12, texto: 'Un remo gastado de tanto ir y venir.',
          modelo: (add) => { const m = add(new THREE.BoxGeometry(0.08, 1.3, 0.05), '#8a5a2a', 0, 0.3, 0); m.rotation.z = 1.3; add(new THREE.BoxGeometry(0.3, 0.04, 0.16), '#8a5a2a', 0.6, 0.12, 0); } },
        { id: 'piedras', cat: 'cruces', nombre: 'Piedras de paso', x: -8, z: -9, texto: 'Piedras planas en fila, como para cruzar un arroyo sin mojarse.',
          modelo: (add) => { for (let i = 0; i < 4; i++) add(new THREE.CylinderGeometry(0.22, 0.25, 0.12, 8), '#8d8a82', i * 0.45 - 0.7, 0.06, 0); } },
      ],
      hitos: [{ id: 'cuaderno', todos: true }],
    },
    ropa: [
      { clave: 'lentes:#2b2b2b:binoculares', hito: 'orilla', nombre: 'Lentes binoculares', pista: 'mirar la orilla', viste: { slot: 'eyes', id: 'lentes', color: '#2b2b2b', style: 'binoculares' } },
      { clave: 'mano:cuaderno', hito: 'voces', nombre: 'Cuaderno de campo', pista: 'escuchar todas las voces', viste: { slot: 'hand', id: 'mano', color: '#2f8f4e', style: 'cuaderno' } },
      { clave: 'casco:constructor', hito: 'acuerdo', nombre: 'Casco de constructor', pista: 'construir lo acordado', viste: { slot: 'head', id: 'casco', color: '#f2c21a', style: 'constructor' } },
      { clave: 'mano:mapa', hito: 'cuaderno', nombre: 'Mapa del río', pista: 'el Cuaderno completo', viste: { slot: 'hand', id: 'mano', color: '#c9a227', style: 'mapa' } },
    ],
    eventos: { defs: {
      PlayerCharacterCreated: { type: 'CharacterCreated', loc: 'villa', chars: ['player'], scene: 'portrait' },
      BridgeIdea: { type: 'QuestAccepted', loc: 'villa', chars: ['vittata', 'abuela'], scene: 'dialogue' },
      ShoreLooked: { type: 'LocationDiscovered', loc: 'villa', chars: ['vittata'], scene: null },
      ShoreSurveyed: { type: 'LocationDiscovered', loc: 'villa', chars: ['vittata', 'iguaca'], scene: 'final' },
      VoicesHeard: { type: 'CharacterMet', loc: 'villa', chars: ['vittata', 'abuela', 'papa', 'navegante', 'iguaca'], scene: 'dialogue' },
      TradeoffSeen: { type: 'DialogueChoiceMade', loc: 'villa', chars: ['vittata', 'iguaca'], scene: 'dialogue' },
      ModelTested: { type: 'BuildingDamaged', loc: 'villa', chars: ['vittata'], scene: 'action' },
      AgreementMade: { type: 'LandDecisionMade', loc: 'villa', chars: ['vittata', 'abuela', 'papa', 'navegante', 'iguaca'], scene: 'final' },
      CareChosen: { type: 'BuildingRepaired', loc: 'villa', chars: ['vittata'], scene: null },
      ProjectBuilt: { type: 'BuildingConstructed', loc: 'villa', chars: ['vittata'], scene: 'action' },
      Chapter4Completed: { type: 'ChapterCompleted', loc: 'villa', chars: ['vittata', 'iguaca', 'abuela'], scene: 'final' },
    } },
    dialogos: { datos: () => DIALOGOS, retratos: IMG, retratoDefecto: 'assets/vittata.png' },
    comic: {
      marca: 'EL PRECIO DEL PROGRESO', tituloDefecto: 'Mi capítulo 4', archivo: 'ep4-mi-comic', pdfTitulo: 'El precio del progreso',
      capturas: ['orilla', 'balanza', 'acuerdo', 'cruce'], portadas: {},
      vinetas: [
        { id: 'intro', img: 'portrait', needs: 'PlayerCharacterCreated', texto: S => `Soy ${S.profile.name} y quería unir las dos orillas del río.` },
        { id: 'orilla', img: 'orilla', needs: 'ShoreSurveyed', texto: 'Antes de dibujar el puente, miré lo que ya vivía en la orilla.' },
        { id: 'balanza', img: 'balanza', needs: 'TradeoffSeen', texto: S => `Escuché todas las voces y lo dije: «${FRASES[S.collected.includes('frase_1') ? 1 : 0]}»` },
        { id: 'acuerdo', img: 'acuerdo', needs: 'AgreementMade', texto: S => { const o = OIDS.find(k => S.collected.includes('opcion_' + k)), c = CIDS.find(k => S.collected.includes('cuidado_' + k));
          return o && c ? `Decidimos juntos: ${OPCIONES[o].corto}, y cuidamos lo que costaba: «${CUIDADOS[c].nombre}».` : 'Decidimos juntos y cuidamos lo que costaba.'; } },
        { id: 'cruce', img: 'cruce', needs: 'Chapter4Completed', texto: 'La abuela cruzó primero. Ninguna opción lo daba todo, pero la elegimos con todos.' },
      ],
    },

    inicio(G) { G.eventos.log('BridgeIdea'); G.dialogo.say(G.dialogo.L('inicio:ep4'), () => G.ui.toast('Habla con Iguaca', 3000)); },

    preparar(G) {
      const S = G.S, H = G.terreno.height, L = G.dialogo.L, scene = G.renderer.scene;
      const tiene = k => S.collected.includes(k), poner = k => { if (!tiene(k)) S.collected.push(k); };
      const elegir = (who, text, opciones, done) => G.dialogo.choose(di(who, text), opciones, done);
      const opcion = () => OIDS.find(o => tiene('opcion_' + o));
      const cuidado = () => CIDS.find(c => tiene('cuidado_' + c));
      const vistas = () => OBS.filter(tiene), oidas = () => VOC.filter(tiene), probadas = () => OIDS.filter(o => tiene('prueba_' + o));
      const mat = c => new THREE.MeshLambertMaterial({ color: c });

      // ---------- Aula del episodio: «Iguaca te pregunta» y el registro local del Modo Maestro (src/game/aula.js) ----------
      const AU = G.aula, LEC = (AU.activo && AU.LEC) || {};
      const E = () => S.edu || (S.edu = { inicio: null, fin: null, fichas: [], formativa: {}, registro: null });
      const idsFormativa = () => ((LEC.formativa && LEC.formativa.seleccion && LEC.formativa.seleccion[AU.aj.grado]) || []).filter(id => AU.preguntaPublicable(AU.pregunta(id)));
      const todasPreguntadas = () => idsFormativa().every(id => (E().formativa || {})[id]);
      // Objetivos E1–E4 con la evidencia del juego (lecciones.js); una pregunta cuenta si se acertó en 2 intentos o menos
      function objetivos() {
        const f = E().formativa || {}, ok = id => f[id] && f[id] <= 2, pre = id => f[id] != null, had = ev => G.eventos.had(ev);
        const res = [];
        if (vistas().length === 4 && (!pre('q1') || ok('q1')) && (!pre('q2') || ok('q2'))) res.push('E1');
        if (oidas().length === 4 && had('TradeoffSeen') && (!pre('q3') || ok('q3')) && (!pre('q4') || ok('q4'))) res.push('E2');
        if (had('CareChosen') && had('ProjectBuilt') && (!pre('q5') || ok('q5'))) res.push('E3');
        if (tiene('obs_bosque') && ok('q6')) res.push('E4');
        return res;
      }
      // Fila del reporte local (sin nombre ni texto libre)
      function registrar() {
        const e = E();
        if (!AU.activo || e.inicio == null) return;
        const pregs = {}; for (const id of idsFormativa()) pregs[id] = (e.formativa || {})[id] || '';
        AU.registrar({
          misiones_completadas: ['orilla', 'voces', 'acuerdo'].filter(m => S.missions[m]),
          tramos_observados: vistas().length, voces_escuchadas: oidas().length, maqueta_probadas: probadas().length,
          opcion_elegida: opcion() ? OPCIONES[opcion()].nombre : '', cuidado_elegido: cuidado() ? CUIDADOS[cuidado()].nombre : '',
          preguntas: pregs, objetivos_logrados: objetivos(),
          minutos_mision: e.fin != null ? Math.max(1, Math.round((e.fin - e.inicio) / 60)) : '',
        });
      }
      function formativa() {
        const ids = idsFormativa(), esc = AU.esc;
        const cab = (i, n) => `<div class="edu-head"><img class="edu-cara" src="${IMG.Iguaca}" alt=""><div><span class="eyebrow">${esc(AU.t(LEC.meta && LEC.meta.titulo))}</span><h2>${esc(AU.t({ es: 'Iguaca te pregunta', en: 'Iguaca asks you' }))}</h2></div></div>` +
          `<div class="edu-dots" aria-hidden="true">${Array.from({ length: n }, (_, k) => `<span class="${k < i ? 'ok' : k === i ? 'now' : ''}"></span>`).join('')}</div>`;
        AU.serie(ids, { cabecera: cab, alResponder: registrar, alTerminar: () => {
          G.ui.hideCard(); registrar();
          G.dialogo.say([Lu('¡Eso es pensar como quien decide con todos! Mirar, escuchar, comparar y cuidar lo que cuesta.')]);
        } });
      }
      if (AU.activo && AU.pestana) AU.pestana({ id: 'ep4', titulo: { es: 'Progreso cap. 4', en: 'Ch. 4 progress' }, html: () => {
        const esc = AU.esc, t = AU.t, P = AU.partidas;
        if (!P.length) return `<p class="note">${esc(t({ es: 'Todavía no hay partidas en este dispositivo.', en: 'No sessions on this device yet.' }))}</p>`;
        const C = t({ es: ['Fecha', 'Estación', 'Misiones', 'Tramos', 'Voces', 'Maqueta', 'Opción', 'Cuidado', 'Preguntas', 'Objetivos', 'Min'], en: ['Date', 'Station', 'Missions', 'Spots', 'Voices', 'Model', 'Option', 'Care', 'Questions', 'Objectives', 'Min'] });
        const n = (v, d) => (v != null ? v + '/' + d : '');
        const filas = P.slice().reverse().map(p => `<tr><td>${esc(p.fecha)}</td><td>${esc(p.estacion || AU.aj.estacion)}</td><td>${(p.misiones_completadas || []).length}/3</td><td>${n(p.tramos_observados, 4)}</td><td>${n(p.voces_escuchadas, 4)}</td><td>${n(p.maqueta_probadas, 3)}</td><td>${esc(p.opcion_elegida || '')}</td><td>${esc(p.cuidado_elegido || '')}</td><td>${esc(p.preguntas ? Object.entries(p.preguntas).filter(([, v]) => v).map(([k, v]) => k + ':' + v).join(' ') : '')}</td><td>${esc((p.objetivos_logrados || []).join(' '))}</td><td>${p.minutos_mision != null ? p.minutos_mision : ''}</td></tr>`).join('');
        return `<p class="note">${esc(t({ es: 'Solo lo guardado en este dispositivo. No se envía nada por la red.', en: 'Only what is stored on this device. Nothing is sent over the network.' }))}</p><div class="maestro-scroll"><table class="maestro-tabla"><thead><tr>${C.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${filas}</tbody></table></div>`;
      } });

      // ---------- Iguaca: da cada misión, su tarjeta (M2) y, en medio, una pista del paso en curso ----------
      function hablar() {
        if (S.step === 0) { G.dialogo.say(L('interact:iguaca'), () => { E().inicio = S.clock; G.misiones.advanceTo(1); }); return; }
        if (S.step === 1) { G.dialogo.say([Lu('Mira los 3 tramos y el bosquecillo. Llevas ' + vistas().length + ' de 4.')]); return; }
        if (S.step === 2) {
          G.eventos.log('ShoreSurveyed'); G.comic.capture('orilla'); G.audio.play('unlock'); registrar();
          G.dialogo.say(L('evento:ShoreSurveyed'), () => { G.misiones.advanceTo(3); G.ui.toast('Escucha todas las voces', 3000); });
          return;
        }
        if (S.step === 3 && !tiene('voz_iguaca')) { voz('iguaca'); return; }
        if (S.complete && AU.activo && !todasPreguntadas()) {
          elegir('Iguaca', '¡Ya se cruza el río! Cuando quieras, te hago unas preguntas sobre lo que hicimos. Sin prisa y sin nota.',
            [{ label: 'Sí, pregúntame', v: 1 }, { label: 'Ahora no', v: 0 }], o => { if (o.v) formativa(); else G.dialogo.say([Lu('Cuando quieras. Aquí estaré.')]); });
          return;
        }
        const pistas = {
          3: 'Te faltan voces: la abuela, el papá y la navegante del muelle.',
          4: 'Las tarjetas te esperan en la Balanza de la mesa.',
          5: 'Prueba las tres opciones en la maqueta. Mira qué pasa con la canoa, los árboles y la crecida.',
          6: 'Es hora de la asamblea, en la mesa. Elige una opción y un cuidado para lo que cuesta.',
          7: 'Ya hay acuerdo. Ve a la orilla y constrúyelo.',
          8: 'La abuela te espera para cruzar por primera vez.',
        };
        G.dialogo.say([Lu(S.complete ? '¡Ya se cruza el río! Puedes seguir explorando.' : pistas[S.step] || 'Sigue así.')]);
      }
      G.interaccion.add({ id: 'iguaca', x: LUMA.x, z: LUMA.z, r: 2.4, label: () => S.step === 2 ? 'Contarle a Iguaca' : S.step === 3 && !tiene('voz_iguaca') ? 'Escuchar a Iguaca' : 'Hablar con Iguaca', use: hablar });

      // ---------- Misión 1 · «Lo que hay en la orilla»: 3 tramos y el bosquecillo ----------
      for (const id of TIDS) {
        const t = TRAMOS[id], x = RIO - 6, y = H(x, t.z);
        const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 6), mat('#8a6a3a'));
        poste.position.set(x, y + 1.1, t.z); scene.add(poste);
        const cinta = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.3), new THREE.MeshLambertMaterial({ color: '#2f8fd6', side: THREE.DoubleSide }));
        cinta.position.set(x + 0.5, y + 2, t.z); scene.add(cinta);
        G.interaccion.add({ id: 'tramo_' + id, x, z: t.z, r: 2.4, visible: () => S.step === 1 && !tiene('obs_' + id),
          label: () => 'Mirar ' + t.nombre,
          use: () => {
            poner('obs_' + id); G.eventos.log('ShoreLooked'); G.audio.play('pickup');
            G.dialogo.say([di('Vittata', t.ve)], () => G.misiones.check());
          } });
      }
      // El bosquecillo: árboles propios (para poder quitarlos o replantarlos según el acuerdo) y una percha para mirar
      const bosque = new THREE.Group(); scene.add(bosque);
      const ARB = [[-2.5, -1.5], [0.5, -2.5], [2, 0.5], [-1, 1.8], [-3, 1.2], [1.2, 2.6]];
      G.interaccion.add({ id: 'bosque', x: BOSQUE.x, z: BOSQUE.z, r: 3, visible: () => S.step === 1 && !tiene('obs_bosque'),
        label: () => 'Posarse y mirar el bosquecillo',
        use: () => {
          poner('obs_bosque'); G.eventos.log('ShoreLooked'); G.audio.play('pickup');
          G.dialogo.say([di('Vittata', 'Desde la rama cuento tres huecos de nido en los troncos viejos, y pececitos en la sombra del agua.'),
            Lu('La cotorra puertorriqueña anida en huecos de los árboles. Fuente: ' + FUENTE + '.')], () => G.misiones.check());
        } });

      // ---------- Misión 2 · «Todas las voces» ----------
      function voz(id) {
        const v = VOCES[id], e = EJES.find(x => x.id === v.eje);
        const nueva = !tiene('voz_' + id);
        poner('voz_' + id); if (nueva) G.audio.play('pickup');
        const lineas = [di(v.quien, v.dice)];
        if (nueva) lineas.push(di('Vittata', `Lo anoto en una tarjeta de ${e.nombre}: «${v.tarjeta}».`));
        G.dialogo.say(lineas, () => {
          G.misiones.check();
          if (nueva && oidas().length === 4) { G.eventos.log('VoicesHeard'); G.dialogo.say(L('evento:VoicesHeard')); }
          else if (nueva) G.ui.toast('Tarjetas: ' + oidas().length + ' de 4', 2500);
        });
      }
      function abuela() {
        if (S.step === 3 && !tiene('voz_abuela')) { voz('abuela'); return; }
        if (S.step === 8) { cruce(); return; }
        G.dialogo.say([di('Abuela', S.complete ? '¡Qué alegría ir y venir otra vez!' : S.step < 3 ? 'Mi familia vive del otro lado del río. Hace tanto que no la veo…' : 'Gracias por preguntarme, mi niña.')]);
      }
      function papa() {
        if (S.step === 3 && !tiene('voz_papa')) { voz('papa'); return; }
        G.dialogo.say([di('Papá', S.complete ? 'Gracias por cuidar lo que costaba.' : S.step < 3 ? 'Este bosquecillo da buena sombra y buenos huecos.' : 'Que no se te olvide el bosquecillo.')]);
      }
      function navegante() {
        if (S.step === 3 && !tiene('voz_navegante')) { voz('navegante'); return; }
        // Quien navega es de Villa Raíz (ep. 3): mira la otra orilla desde este lado. [KELVIN: la otra comunidad]
        G.dialogo.say([di('Navegante', S.complete ? '¡Ahora sí estamos cerca!' : S.step < 3 ? 'Desde el muelle veo la otra orilla cada día. Qué cerca y qué lejos.' : 'Del río vivimos. Que las canoas puedan pasar.')]);
      }
      const itAbuela = G.interaccion.add({ id: 'abuela', x: ABUELA.x, z: ABUELA.z, r: 2.4, label: () => S.step === 3 && !tiene('voz_abuela') ? 'Escuchar a la abuela' : S.step === 8 ? 'Cruzar con la abuela' : 'Hablar con la abuela', use: abuela });
      G.interaccion.add({ id: 'papa', x: PAPA.x, z: PAPA.z, r: 2.4, label: () => S.step === 3 && !tiene('voz_papa') ? 'Escuchar al papá' : 'Hablar con el papá', use: papa });
      G.interaccion.add({ id: 'navegante', x: NAVEGA.x, z: NAVEGA.z, r: 2.4, label: () => S.step === 3 && !tiene('voz_navegante') ? 'Escuchar a quien navega' : 'Hablar con quien navega', use: navegante });

      // La Balanza: para cada voz, ¿qué opción le da más? Luego, ¿hay una mejor para todos? (sin castigo: pista y otra vez)
      const A_QUIEN = { abuela: 'la abuela', papa: 'el papá', navegante: 'quien navega', iguaca: 'esta tarjeta' };
      function balanza() {
        const v = VIDS.find(k => !tiene('bal_' + k));
        if (!v) { mejor(); return; }
        const V = VOCES[v], e = EJES.find(x => x.id === V.eje), max = Math.max(...OIDS.map(o => OPCIONES[o].hojas[e.id]));
        const preguntar = () => elegir('Iguaca', `Tarjeta de ${e.nombre}: «${V.tarjeta}». ¿Qué opción le da más a ${A_QUIEN[v]}?`,
          OIDS.map(o => ({ label: `${OPCIONES[o].nombre} (${e.icono} ${puntos(OPCIONES[o].hojas[e.id])})`, o })), o => {
            if (OPCIONES[o.o].hojas[e.id] < max) {
              G.audio.play('wrong');
              G.dialogo.say([Lu(`Mira las hojas de ${e.nombre}: hay otra opción que tiene más.`)], balanza);
              return;
            }
            poner('bal_' + v); G.audio.play('tick'); balanza();
          });
        // La primera vez, Iguaca lee la Balanza entera: 3 opciones, 4 ejes, hojas con icono y palabra
        if (v === VIDS[0] && !tiene('bal_vista')) { poner('bal_vista'); G.dialogo.say(OIDS.map(o => Lu(`${o.toUpperCase()} · ${OPCIONES[o].nombre}: ${fila(OPCIONES[o].hojas)}`)), preguntar); }
        else preguntar();
      }
      function mejor() {
        elegir('Iguaca', 'Cada tarjeta tiene su opción. Entonces, ¿cuál es la mejor para todos?', [
          { label: OPCIONES.a.nombre, v: 'a' }, { label: OPCIONES.b.nombre, v: 'b' }, { label: OPCIONES.c.nombre, v: 'c' },
          { label: FRASES[0], v: 0 }, { label: FRASES[1], v: 1 },
        ], o => {
          if (typeof o.v === 'string') {
            const q = VOCES[PIERDE[o.v]];
            G.dialogo.say([di(q.quien, RECLAMO[o.v])], mejor);
            return;
          }
          poner('frase_' + o.v); G.eventos.log('TradeoffSeen', { choice: FRASES[o.v] }); G.comic.capture('balanza'); G.audio.play('unlock'); registrar();
          G.dialogo.say([di('Vittata', FRASES[o.v])].concat(L('evento:TradeoffSeen')), () => G.misiones.check());
        });
      }

      // ---------- Misión 3 · «La maqueta y el acuerdo» ----------
      function maqueta() {
        const quedan = OIDS.filter(o => !tiene('prueba_' + o));
        elegir('Vittata', quedan.length ? '¿Qué opción pruebo en la maqueta?' : 'Ya probé las tres. ¿Miro una otra vez?', OIDS.map(o => ({ label: (tiene('prueba_' + o) ? '✓ ' : '') + OPCIONES[o].nombre, o })), x => {
          const op = OPCIONES[x.o], nueva = !tiene('prueba_' + x.o);
          poner('prueba_' + x.o); maquetaVer(x.o); G.audio.play('tick'); G.fx.burst(MESA.x, H(MESA.x, MESA.z) + 1.2, MESA.z, 'feathers', 8);
          G.dialogo.say(op.prueba.map(t => di('Vittata', t)).concat(Lu(fila(op.hojas))), () => {
            if (nueva && probadas().length === 3) {
              G.eventos.log('ModelTested'); G.misiones.check();
              G.dialogo.say([Lu('Las probaste todas. Ninguna sale perfecta en la maqueta. Ahora, la asamblea.')]);
            } else if (probadas().length < 3) maqueta();
          });
        });
      }
      function asamblea() {
        if (!opcion()) {
          elegir('Vittata', 'Asamblea en la mesa. Todos escuchan. ¿Qué opción propones?', OIDS.map(o => ({ label: `${OPCIONES[o].nombre}: ${fila(OPCIONES[o].hojas)}`, o })), x => {
            poner('opcion_' + x.o); G.eventos.log('AgreementMade', { choice: x.o }); G.audio.play('unlock'); maquetaVer(x.o); dibujarObra();
            const gana = VIDS.filter(v => OPCIONES[x.o].hojas[VOCES[v].eje] === 3), pierde = VOCES[PIERDE[x.o]];
            G.dialogo.say(gana.map(v => di(VOCES[v].quien, 'Esto me da lo que pedía. ¡Gracias!')).concat(
              di(pierde.quien, RECLAMO[x.o]), Lu('Nadie lo tiene todo. Elige un cuidado para lo que cuesta.')), asamblea);
          });
          return;
        }
        if (!cuidado()) {
          const op = opcion();
          elegir('Iguaca', '¿Qué cuidado ponemos?', CIDS.map(c => ({ label: CUIDADOS[c].nombre, c })), x => {
            const c = CUIDADOS[x.c];
            if (!c.para.includes(op)) {
              G.audio.play('wrong');
              G.dialogo.say([Lu(`Con ${OPCIONES[op].corto} ese cuidado no ayuda: mira qué es lo que cuesta en la Balanza.`)], asamblea);
              return;
            }
            poner('cuidado_' + x.c); G.audio.play('tick');
            const h = hojasCon(op, x.c);
            G.dialogo.say([di('Vittata', c.nombre + '.'), Lu('Mejora una cosa, pero no lo arregla todo: ' + fila(h) + '.')], asamblea);
          });
          return;
        }
        const pierde = VOCES[PIERDE[opcion()]];
        elegir('Vittata', `¿Qué le dices a ${pierde.quien === 'Iguaca' ? 'Iguaca' : pierde.quien === 'Abuela' ? 'la abuela' : 'el papá'}?`, [
          { label: PALABRAS[0], v: 0 }, { label: 'Es lo mejor para todos.', v: 'todos' }, { label: PALABRAS[1], v: 1 },
        ], o => {
          if (o.v === 'todos') { G.audio.play('wrong'); G.dialogo.say([Lu('¿Para todos? Mira la Balanza: a alguien le cuesta. Díselo con cariño.')], asamblea); return; }
          poner('palabra_' + o.v); G.eventos.log('CareChosen', { choice: cuidado() }); G.comic.capture('acuerdo'); registrar();
          G.dialogo.say([di('Vittata', PALABRAS[o.v]), di(pierde.quien, 'Gracias por decírmelo de frente. Así sí.'), Lu('¡Hay acuerdo! Ve a la orilla y constrúyelo.')], () => G.misiones.check());
        });
      }
      G.interaccion.add({ id: 'mesa', x: MESA.x, z: MESA.z, r: 2.4, visible: () => S.step >= 4,
        label: () => ({ 4: 'Poner las tarjetas en la Balanza', 5: 'Probar en la maqueta', 6: 'Hacer la asamblea' })[S.step] || 'Mirar la Balanza',
        use: () => {
          if (S.step === 4) balanza(); else if (S.step === 5) maqueta(); else if (S.step === 6) asamblea();
          else G.dialogo.say(OIDS.map(o => di('Vittata', `${OPCIONES[o].nombre}: ${fila(o === opcion() ? hojasCon(o, cuidado()) : OPCIONES[o].hojas)}`)));
        } });
      // La mesa de la asamblea: tablero con patas y troncos para sentarse alrededor (BF4: antes era una caja sola)
      { const y = H(MESA.x, MESA.z), tab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 1.4), mat('#8a6a3a')); tab.position.set(MESA.x, y + 0.74, MESA.z); scene.add(tab);
        for (const [dx, dz] of [[-0.95, -0.55], [0.95, -0.55], [-0.95, 0.55], [0.95, 0.55]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), mat('#6b4a2a')); p.position.set(MESA.x + dx, y + 0.35, MESA.z + dz); scene.add(p); }
        for (const [dx, dz] of [[-2.1, -0.4], [-1.6, 1.6], [2.1, -0.4], [0.2, -2.1]]) { const x = MESA.x + dx, z = MESA.z + dz, t = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.42, 9), mat('#7a5634')); t.position.set(x, H(x, z) + 0.21, z); scene.add(t);
          G.fisica.colliders.push({ x, z, r: 0.38, h: 0.42, kind: 'obj' }); }
        G.fisica.colliders.push({ x: MESA.x, z: MESA.z, r: 1.0, h: 0.8, kind: 'obj' }); }

      // ---------- Piezas del kit de edificios (assets/models/edificios, propio): el muelle de quien navega con su canoa en el
      // remanso y el toldo de la asamblea junto a la mesa. Sin el modelo, el sitio queda como estaba (nada depende de ellas) ----------
      const KIT = 'assets/models/edificios/';
      const nivelRio = z => { const n = G.agua && G.agua.levelAt ? G.agua.levelAt(RIO, z) : -Infinity; return isFinite(n) ? n : H(RIO, z); };
      // El modelo con su lado largo en x, centrado y apoyado en y = 0, medido a `largo`
      function kit(nombre, largo) {
        return G.assets.loadGLB(KIT + nombre + '.glb', { b64: () => (window.AV_EDIFICIOS_B64 || {})[nombre], script: KIT + nombre + '_glb.js', base: KIT, error: nombre + ' no disponible' }).then(g => {
          const m = g.scene || (g.scenes && g.scenes[0]); if (!m) throw new Error(nombre);
          const b = new THREE.Box3().setFromObject(m), sz = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()), k = largo / (Math.max(sz.x, sz.z) || 1);
          const w = new THREE.Group(), giro = new THREE.Group(); w.add(giro); giro.add(m);
          m.scale.setScalar(k); m.position.set(-c.x * k, -b.min.y * k, -c.z * k); if (sz.z > sz.x) giro.rotation.y = Math.PI / 2;
          m.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.castShadow = true; } });
          w.userData.alto = sz.y * k; return w;
        });
      }
      const MUELLE = { x: 3.4, z: NAVEGA.z + 0.6 };
      let muelleKit = null, canoaKit = null; // también los muelles y la canoa de la opción C (dibujarObra)
      kit('muelle_troncos', 4.4).then(w => { w.position.set(MUELLE.x, nivelRio(MUELLE.z) + 0.3 - w.userData.alto, MUELLE.z); scene.add(w); muelleKit = w; dibujarObra();
        return kit('canoa', 3.6); }).then(w => { canoaKit = w; dibujarObra(); w.position.set(MUELLE.x + 0.6, nivelRio(MUELLE.z + 1.4) - 0.15, MUELLE.z + 1.4); w.rotation.y = 0.12; scene.add(w); }).catch(() => {});
      kit('toldo_pequeno', 3.6).then(w => { const x = MESA.x - 3.6, z = MESA.z + 0.2; w.position.set(x, H(x, z), z); w.rotation.y = Math.PI / 2; scene.add(w); }).catch(() => {});
      // La maqueta sobre la mesa: un río de juguete y la opción que se está mirando, a escala
      const maq = new THREE.Group(); maq.position.set(MESA.x, H(MESA.x, MESA.z) + 0.81, MESA.z); scene.add(maq);
      const rioMaq = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 1.3), mat('#4a8ab8')); maq.add(rioMaq);
      const piezaMaq = new THREE.Group(); maq.add(piezaMaq);
      function vaciar(g) { while (g.children.length) { const m = g.children.pop(); if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); } }
      function maquetaVer(o) {
        vaciar(piezaMaq);
        const add = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y, z); piezaMaq.add(m); };
        if (o === 'a') { add(0.9, 0.04, 0.12, '#a87c4f', 0, 0.06, -0.3); for (const x of [-0.6, -0.75]) add(0.04, 0.12, 0.04, '#6b4a2a', x, 0.06, -0.45); }
        else if (o === 'b') { add(1.0, 0.04, 0.12, '#a87c4f', 0, 0.2, 0.45); for (const x of [-0.3, 0.3]) add(0.06, 0.2, 0.06, '#8d8a82', x, 0.1, 0.45); }
        else if (o === 'c') { add(0.25, 0.03, 0.1, '#8a5a2a', -0.4, 0.03, 0.05); add(0.25, 0.03, 0.1, '#8a5a2a', 0.4, 0.03, 0.05); add(0.18, 0.04, 0.06, '#c9a86a', 0, 0.03, 0.05); }
      }

      // ---------- La obra en la orilla y el primer cruce ----------
      const obraPos = () => { const t = TRAMOS[(OPCIONES[opcion()] || OPCIONES.a).tramo]; return { x: RIO - 5, z: t.z + 1.5 }; };
      const obra = G.interaccion.add({ id: 'obra', x: RIO - 5, z: 0, r: 3, visible: () => S.step >= 7 && !!opcion(),
        label: () => S.step === 7 ? 'Construir lo acordado' : 'Mirar lo construido',
        use: () => {
          if (S.step !== 7) { G.dialogo.say([di('Vittata', S.complete ? 'Lo construimos entre todos, y cuidamos lo que costaba.' : 'Aquí está lo acordado.')]); return; }
          poner('construido'); dibujarObra(); colocarAbuela(); encuadrar(); G.eventos.log('ProjectBuilt', { choice: opcion() }); G.audio.play('unlock'); registrar();
          const y = H(obra.x, obra.z);
          G.fx.burst(obra.x, y + 2, obra.z, 'gold', 30);
          G.dialogo.say([di('Vittata', '¡Entre todos, ' + OPCIONES[opcion()].corto + ' está listo!'), di('Vittata', 'Y el cuidado también: «' + CUIDADOS[cuidado()].nombre + '».'),
            Lu('Ahora, lo más bonito: la abuela te espera para cruzar.')], () => G.misiones.check());
        } });
      function cruce() {
        const o = opcion(), lineas = {
          a: [di('Abuela', 'A pie y en un momento. ¡Ni me lo creo!'), di('Papá', 'Extraño el bosquecillo, pero lo que se cuidó me da esperanza.')],
          b: [di('Abuela', 'El camino es largo, pero con descansos llego. Y el río sigue igual de bonito.'), di('Navegante', '¡Y las canoas pasan por debajo!')],
          c: [di('Navegante', 'Súbase, abuela: hoy remamos juntos.'), di('Abuela', 'Cuando crezca el río esperaré, pero hoy cruzo en buena compañía.')],
        }[o] || [];
        G.fx.burst(RIO, H(RIO - 5, TRAMOS[OPCIONES[o].tramo].z) + 2, TRAMOS[OPCIONES[o].tramo].z, 'feathers', 30);
        encuadrar(); G.audio.play('unlock'); G.comic.capture('cruce');
        S.complete = true; G.eventos.log('Chapter4Completed', { choice: o }); E().fin = S.clock;
        G.misiones.advanceTo(G.misiones.DONE); registrar();
        G.dialogo.say(lineas.concat(L('evento:Chapter4Completed')), () => { colocarAbuela(); G.misiones.showEnd(); });
      }
      // La abuela espera en la cabecera de lo construido (la flecha del paso 8 lleva allí y el cruce se ve) y, tras cruzar, queda
      // en la otra orilla; antes de la obra, en su sitio de siempre
      function colocarAbuela() {
        const n = G.actores.npc('abuela'), o = opcion(); if (!n) return;
        let x = ABUELA.x, z = ABUELA.z;
        if (o && tiene('construido')) { z = TRAMOS[OPCIONES[o].tramo].z - 1.8; x = S.complete ? RIO + 6 : RIO - 6; }
        n.def.x = x; n.def.z = z; n.sp.position.set(x, H(x, z) + 1.0, z); n.sh.position.set(x, H(x, z) + 0.03, z); n.collider.x = x; n.collider.z = z;
        itAbuela.x = x; itAbuela.z = z;
      }
      // Encuadre de la obra y del cruce: la cámara se abre a un lado del tramo para que lo construido se vea entero, en diagonal
      // (del lado sin el bosquecillo ni el borde del mundo)
      function encuadrar() {
        const o = opcion(); if (!o || !G.camara) return;
        const lado = OPCIONES[o].tramo === 'b' ? -1 : 1;
        G.camara.yaw = Math.atan2(-0.55, 0.85 * lado); G.camara.manual();
      }
      // Lo construido a escala real, por lo que hay en S.collected (se rehace al cargar la partida); los árboles del bosquecillo se
      // quedan, se vuelven tocones (opción A) o tocones con yagrumos replantados
      const obraG = new THREE.Group(); scene.add(obraG);
      function dibujarObra() {
        vaciar(obraG); vaciar(bosque);
        const o = opcion(), c = cuidado(), hecho = tiene('construido');
        if (o) { const p = obraPos(); obra.x = p.x; obra.z = p.z; }
        const cortado = hecho && o === 'a';
        for (const [dx, dz] of ARB) {
          const x = BOSQUE.x + dx, z = BOSQUE.z + dz, y = H(x, z);
          if (cortado) {
            const t = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.4, 7), mat('#6b4a2a')); t.position.set(x, y + 0.2, z); bosque.add(t);
            if (c === 'replantar') { const j = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.2, 6), mat('#6fbf5a')); j.position.set(x + 0.6, y + 0.6, z); bosque.add(j); }
          } else {
            const t = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.32, 3.2, 7), mat('#6b4a2a')); t.position.set(x, y + 1.6, z); bosque.add(t);
            const k = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 6), mat('#3f8f4a')); k.position.set(x, y + 3.8, z); bosque.add(k);
          }
        }
        if (!hecho || !o) return;
        const add = (w, h, d, col, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(col)); m.position.set(x, y, z); obraG.add(m); return m; };
        const zt = TRAMOS[OPCIONES[o].tramo].z, x0 = RIO - 5.5, x1 = RIO + 5.5, y0 = H(x0, zt), y1 = H(x1, zt);
        if (o === 'a') {
          const alto = c === 'paso' ? 1.2 : 0;
          add(x1 - x0, 0.2, 1.6, '#a87c4f', RIO, Math.max(y0, y1) + 0.3 + alto, zt);
          for (const x of [x0, x1]) add(0.6, 0.6, 1.8, '#8d8a82', x, H(x, zt) + 0.3, zt);
          if (c === 'cajas') for (const [dx, dz] of ARB.slice(0, 3)) { add(0.1, 2.4, 0.1, '#6b4a2a', BOSQUE.x + dx + 0.8, H(BOSQUE.x + dx, BOSQUE.z + dz) + 1.2, BOSQUE.z + dz); add(0.4, 0.5, 0.4, '#5a3d22', BOSQUE.x + dx + 0.8, H(BOSQUE.x + dx, BOSQUE.z + dz) + 2.5, BOSQUE.z + dz); }
        } else if (o === 'b') {
          const top = Math.max(y0, y1) + 2.6;
          add(x1 - x0 + 2, 0.22, 1.6, '#a87c4f', RIO, top, zt);
          for (const x of [RIO - 2.5, RIO + 2.5, x0, x1]) { const yb = H(x, zt) - 1; add(0.7, top - yb, 0.7, '#8d8a82', x, yb + (top - yb) / 2, zt); }
          if (c === 'descansos') for (let i = 0; i < 3; i++) add(1.2, 0.4, 0.4, '#8a6a3a', x0 - 2 - i * 3, H(x0 - 2 - i * 3, zt - 2) + 0.2, zt - 2 - i * 4);
          if (c === 'minga') for (const dx of [-1, 1]) add(0.15, 1.6, 0.15, '#d6403a', x0 - 1, H(x0 - 1, zt + dx) + 0.8, zt + dx);
        } else if (o === 'c') {
          for (const [xa, xb, giro] of [[x0 - 1, RIO - 3.2, 0], [RIO + 3.2, x1 + 1, Math.PI]]) {
            if (!muelleKit) { add(xb - xa, 0.15, 1.2, '#8a5a2a', (xa + xb) / 2, H(xa, zt) + 0.35, zt); continue; }
            const d = muelleKit.clone(), k = (xb - xa) / 4.4; d.scale.setScalar(k); d.rotation.y = giro; d.position.set((xa + xb) / 2, nivelRio(zt) + 0.3 - muelleKit.userData.alto * k, zt); obraG.add(d);
          }
          if (canoaKit) { const ca = canoaKit.clone(); ca.position.set(RIO - 2.2, nivelRio(zt) - 0.15, zt + 1.4); ca.rotation.y = 0.1; obraG.add(ca); }
          else { const ca = add(2.4, 0.4, 0.8, '#c9a86a', RIO - 2.2, nivelRio(zt) + 0.2, zt + 1.4); ca.rotation.y = 0.1; }
          if (c === 'turnos') { add(0.12, 2.2, 0.12, '#6b4a2a', x0 - 1.5, H(x0 - 1.5, zt) + 1.1, zt + 1); add(0.4, 0.4, 0.4, '#c9a227', x0 - 1.5, H(x0 - 1.5, zt) + 2.1, zt + 1); }
        }
      }
      G.on('apply', dibujarObra, 75);
      G.on('apply', colocarAbuela, 77);
      G.on('apply', () => { const o = opcion() || OIDS.filter(k => tiene('prueba_' + k)).pop(); vaciar(piezaMaq); if (o) maquetaVer(o); }, 76);
      dibujarObra();
    },

    // Temporada (AV1, src/game/menu_modos.js): al terminar se guarda en el progreso de la temporada qué se acordó y qué se cuidó.
    // Los GDD de los caps. 5 y 6 no lo usan todavía; queda a mano en G.temporada.decision(4).
    temporada: { decision: S => { const t = k => S.collected.includes(k); return { opcion: OIDS.find(o => t('opcion_' + o)) || null, cuidado: CIDS.find(c => t('cuidado_' + c)) || null }; } },

    pruebas: {
      async selfTest(G, T, opts) {
        opts = opts || {};
        const S = G.S, $ = G.util.$, { check, result } = T.runner(), { tick, drain, useAt, teleport } = T;
        const keep = T.keepSave();
        const criaderoRaw = (() => { try { return localStorage.getItem(G.criadero.KEY); } catch (e) { return null; } })();
        const pick = txt => { const b = [...document.querySelectorAll('[id^="ch-"]')].find(x => x.textContent.includes(txt)); if (b) b.click(); drain(); return !!b; };
        const opciones = () => [...document.querySelectorAll('[id^="ch-"]')].map(b => b.textContent);
        const tiene = k => S.collected.includes(k);
        G.quiet = true;
        // Juega el capítulo entero con una opción y un cuidado; devuelve true si llega al final
        function partida(op, cu, conChequeos) {
          G.guardado.reset(true);
          G.creador.saveCharacter({ name: 'Prueba', preset: 'agilis', outfit: 'azul', accessory: 'ninguno' });
          const ck = conChequeos ? check : () => {};
          ck('Empieza en el paso 1 de 9', S.step === 0 && $('steps').children.length === 9);
          useAt('iguaca'); drain();
          ck('Iguaca da la misión', S.step === 1, 'paso ' + S.step);
          for (const t of TIDS) { useAt('tramo_' + t); drain(); }
          ck('3 tramos observados; falta el bosquecillo', TIDS.every(t => tiene('obs_' + t)) && S.step === 1 && !S.missions.orilla);
          useAt('bosque'); drain();
          ck('M1 · El bosquecillo: huecos de nido con su fuente; misión y lentes', S.missions.orilla && S.step === 2 && S.unlocked.includes('lentes:#2b2b2b:binoculares'));
          useAt('iguaca'); drain();
          ck('M1 cerrada con Iguaca: sigue «Todas las voces», sin pantalla de fin', G.eventos.had('ShoreSurveyed') && S.step === 3 && !S.complete && $('end').hidden, 'paso ' + S.step);
          for (const v of ['abuela', 'papa', 'navegante', 'iguaca']) { useAt(v); drain(); }
          ck('M2 · 4 voces, 4 tarjetas (una por eje)', VOC.every(tiene) && G.eventos.had('VoicesHeard') && S.step === 4, 'paso ' + S.step);
          useAt('mesa'); drain();
          if (conChequeos) {
            ck('M2 · La Balanza muestra 3 opciones con iconos y hojas', opciones().length === 3 && opciones().every(x => /●/.test(x) && /🤝/.test(x)), opciones().join(' | '));
            pick('Muelles y canoas');
            ck('M2 · Una opción con menos hojas da pista y se repite, sin castigo', !tiene('bal_abuela') && opciones().length === 3);
          }
          pick('Puente en el estrecho'); pick('Puente alto'); pick('Puente alto'); pick('Muelles y canoas');
          ck('M2 · Las 4 tarjetas puestas: cada una tiene su opción', VIDS.every(v => tiene('bal_' + v)));
          if (conChequeos) {
            pick(OPCIONES.a.nombre);
            ck('M2 · «La mejor para todos» no existe: quien pierde lo dice y se repite', !G.eventos.had('TradeoffSeen') && opciones().length === 5);
          }
          pick(FRASES[0]);
          ck('M2 · Ninguna lo da todo: misión y cuaderno', S.missions.voces && S.step === 5 && S.unlocked.includes('mano:cuaderno') && G.eventos.had('TradeoffSeen'), 'paso ' + S.step);
          useAt('mesa'); drain();
          pick(OPCIONES.a.nombre); pick(OPCIONES.b.nombre); pick(OPCIONES.c.nombre);
          ck('M3 · Las 3 opciones probadas en la maqueta', OIDS.every(o => tiene('prueba_' + o)) && G.eventos.had('ModelTested') && S.step === 6, 'paso ' + S.step);
          useAt('mesa'); drain();
          pick(OPCIONES[op].nombre + ':');
          ck('M3 · Asamblea: la opción propuesta y quien pierde lo dice', tiene('opcion_' + op) && G.eventos.had('AgreementMade') && opciones().length === CIDS.length, opciones().length);
          if (conChequeos) {
            const mal = CIDS.find(c => !CUIDADOS[c].para.includes(op));
            pick(CUIDADOS[mal].nombre);
            ck('M3 · Un cuidado que no ayuda a esa opción: pista y se repite', !CIDS.some(c => tiene('cuidado_' + c)) && opciones().length === CIDS.length);
          }
          pick(CUIDADOS[cu].nombre);
          if (conChequeos) {
            pick('Es lo mejor para todos');
            ck('M3 · «Es lo mejor para todos» no vale: se repite', !G.eventos.had('CareChosen') && opciones().length === 3);
          }
          pick(PALABRAS[0]);
          ck('M3 · Cuidado elegido y acuerdo', tiene('cuidado_' + cu) && G.eventos.had('CareChosen') && S.step === 7, 'paso ' + S.step);
          useAt('obra'); drain();
          ck('M3 · Construido a escala real: misión y casco', G.eventos.had('ProjectBuilt') && S.missions.acuerdo && S.step === 8 && S.unlocked.includes('casco:constructor'), 'paso ' + S.step);
          ck('M3 · La abuela espera en la cabecera de lo construido (allí lleva la flecha)', G.interaccion.find('abuela').x === RIO - 6 && Math.abs(G.misiones.guideTarget().z - (TRAMOS[OPCIONES[op].tramo].z - 1.8)) < 0.01);
          useAt('abuela'); drain();
          return S.complete && S.step === G.misiones.DONE && G.eventos.had('Chapter4Completed') && !$('end').hidden;
        }

        check('Quien navega está en esta orilla, junto al remanso (Villa Raíz)', NAVEGA.x < RIO - 5 && G.interaccion.find('navegante').x === NAVEGA.x);
        const okEsquema = OIDS.every(o => CIDS.filter(c => CUIDADOS[c].para.includes(o)).length > 0);
        check('Cada opción tiene al menos un cuidado', okEsquema);
        check('Ninguna opción lo maximiza todo, con ningún cuidado', OIDS.every(o => [null].concat(CIDS).every(c => !EJES.every(e => hojasCon(o, c)[e.id] === 3))));
        check('Cada opción es la mejor en algún eje', OIDS.every(o => EJES.some(e => OPCIONES[o].hojas[e.id] === Math.max(...OIDS.map(k => OPCIONES[k].hojas[e.id])))));
        check('Lo provisional del canon va marcado [KELVIN] en notas y comentarios, no en el texto del jugador',
          JSON.stringify(DIALOGOS.escenas.map(e => e.nota || '')).includes('[KELVIN') && !JSON.stringify([DIALOGOS.escenas.map(e => e.lineas), VOCES, OPCIONES, CUIDADOS, TRAMOS, RECLAMO, FRASES, PALABRAS, G.pack.historia.pasos.map(s => s.texto), G.pack.diario.entradas]).includes('[KELVIN'));
        // Las otras dos opciones también terminan el capítulo (todas se pueden elegir)
        for (const [op, cu] of [['b', 'descansos'], ['c', 'turnos']]) {
          const fin = partida(op, cu, false);
          check(`Opción ${op.toUpperCase()} con «${CUIDADOS[cu].nombre}» llega al final`, fin, 'paso ' + S.step);
        }
        check('Final completo con la opción A, sus chequeos y cajas nido', partida('a', 'cajas', true));
        check('Tras el cruce, la abuela queda en la otra orilla', G.actores.npc('abuela').def.x === RIO + 6);
        check('El cómic sale de los eventos (5 viñetas)', G.comic.comicPanels().length === 5, G.comic.comicPanels().length);

        // ---------- «Iguaca te pregunta» · Modo Maestro · Diario y criadero ----------
        const AU = G.aula, LEC = AU.LEC || {}, MM = LEC.modo_maestro || {}, QS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];
        const aulaRaw = (() => { try { return localStorage.getItem(AU.KEY); } catch (e) { return null; } })();
        check('Aula del cap. 4 con su propia clave y la misma puerta (multiplicación)', AU.activo && AU.KEY === 'amazonaverse.aula.cap4' && (AU.nuevoReto(), AU.reto() >= 78 && AU.reto() <= 171), AU.KEY);
        const g45 = MM.guia_45_min || {};
        check('Esquema igual al ep. 1: 4 objetivos, 6 preguntas, 6 fichas, guía de 45 min, 3 sin pantalla y rúbrica de 5',
          (LEC.objetivos || []).length === 4 && (LEC.preguntas || []).length === 6 && (LEC.diario || []).length === 6 && g45.antes && g45.antes.minutos + g45.durante.minutos + g45.despues.minutos === 45 &&
          (MM.actividades_sin_pantalla || []).length === 3 && MM.rubrica && MM.rubrica.criterios.length === 5 && MM.reporte_progreso.almacenamiento.clave === AU.KEY);
        check('Ninguna ficha sale al Diario sin fuente verificada', AU.fichas().length === 0 && LEC.diario.every(f => f.verificacion === 'por_verificar' && f.fuente && f.nota_verificacion));
        check('Las 6 preguntas se pueden hacer', QS.every(id => AU.preguntaPublicable(AU.pregunta(id))));
        check('Nunca «grados» en lo que ve el maestro ni el niño', !/grado/i.test(JSON.stringify([g45, (MM.actividades_sin_pantalla || []).map(a => [a.titulo, a.materiales, a.pasos]), MM.rubrica, LEC.objetivos.map(o => o.enunciado), LEC.preguntas.map(q => [q.enunciado, q.opciones, q.retro])])));
        G.misiones.seguirExplorando();
        check('Tras el final, el mundo queda libre para seguir', $('end').hidden && !G.ui.busy());
        useAt('iguaca'); drain();
        check('Al volver con Iguaca, ofrece las preguntas (se pueden dejar para luego)', opciones().length === 2 && opciones().some(x => x.includes('Ahora no')), opciones().join());
        pick('Sí, pregúntame');
        const card = $('card'), opt = i => card.querySelector(`.edu-opt[data-i="${i}"]`), correcta = id => AU.pregunta(id).correcta;
        check('Iguaca te pregunta: tarjeta formativa sin puntaje visible', G.ui.cardOpen && card.querySelector('.edu-q') && !/punt|score|\d+\s*\/\s*\d+|%/i.test(card.textContent), card.textContent.slice(0, 80));
        opt(correcta('q1') === 0 ? 1 : 0).click();
        check('Fallo en q1: pista, sin castigo ni registro', G.ui.cardOpen && card.querySelector('.edu-retro.pista') && S.edu.formativa.q1 == null);
        opt(correcta('q1')).click(); if ($('edu-seguir')) $('edu-seguir').click();
        for (const id of QS.slice(1)) { opt(correcta(id)).click(); const sg = $('edu-seguir'); if (sg) sg.click(); }
        drain();
        check('Las 6 respondidas: la tarjeta se cierra', QS.every(id => S.edu.formativa[id]) && !G.ui.cardOpen, JSON.stringify(S.edu.formativa));
        const p = AU.partida();
        check('Reporte local: 3 misiones, opción, cuidado y los 4 objetivos, sin el nombre del jugador', p && p.misiones_completadas.length === 3 && p.opcion_elegida === OPCIONES.a.nombre && p.cuidado_elegido === CUIDADOS.cajas.nombre && ['E1', 'E2', 'E3', 'E4'].every(o => p.objetivos_logrados.includes(o)) && !JSON.stringify(p).includes('Prueba'), JSON.stringify(p));
        check('Modo Maestro: pestaña del cap. 4', AU.pestanas().includes('ep4') && (AU.abrirMaestro(), AU.maestroAbierto()) && (AU.cerrarMaestro(), !AU.maestroAbierto()));
        for (const f of G.diario.entries) { teleport(f.x + 0.3, f.z); tick(0.1); }
        check('Diario: 6 hallazgos (3 de ribera, 3 de cruces) y el mapa del río', S.field.length === 6 && G.diario.count('ribera') === 3 && G.diario.count('cruces') === 3 && S.unlocked.includes('mano:mapa'), S.field.join(','));
        check('Cada hallazgo tiene su ficha en la lección', G.diario.entries.every(e => LEC.diario.some(f => f.id === e.id)));
        // Inglés: todo texto del episodio que sale en pantalla tiene su entrada (en.js)
        const EN = window.AV_EN_EP4 || {};
        const textos = [].concat(G.pack.historia.pasos.map(s => s.texto), G.pack.misiones.map(m => m.titulo), DIALOGOS.escenas.flatMap(e => e.lineas),
          Object.values(TRAMOS).map(t => t.ve), Object.values(VOCES).map(v => v.dice), Object.values(OPCIONES).flatMap(o => o.prueba.concat(o.nombre)),
          Object.values(CUIDADOS).map(c => c.nombre), FRASES, PALABRAS, Object.values(RECLAMO), G.pack.diario.entradas.flatMap(e => [e.nombre, e.texto]), G.pack.ropa.flatMap(r => [r.nombre, r.pista]));
        const faltan = textos.filter(t => !EN[t]);
        check('Inglés: todos los textos del capítulo tienen traducción', !faltan.length, faltan.slice(0, 3).join(' | '));
        if (G.idioma) {
          await G.idioma.poner('en');
          const tr = G.idioma.tr;
          check('Inglés en el juego: el diccionario del cap. 1 y el del cap. 4 van juntos', tr('Habla con Iguaca') === 'Talk to Iguaca' && tr('Ahora no') === 'Not now' &&
            tr('Lo anoto en una tarjeta de Bosque: «Cuidar el bosquecillo».') === 'I write it on a Forest card: “Look after the grove”.' &&
            tr('A · Puente en el estrecho: ' + fila(OPCIONES.a.hojas)) === 'A · Bridge at the narrows: ' + fila(OPCIONES.a.hojas).replace('Conexión', 'Connection').replace('Bosque', 'Forest').replace('Río', 'River').replace('Esfuerzo', 'Effort') &&
            Object.keys(window.AV_EN || {}).length > Object.keys(EN).length + 100, tr('A · Puente en el estrecho: ' + fila(OPCIONES.a.hojas)));
          await G.idioma.poner('es');
        }
        try { if (criaderoRaw == null) localStorage.removeItem(G.criadero.KEY); else localStorage.setItem(G.criadero.KEY, criaderoRaw); } catch (e) { /* sin almacenamiento */ }
        try { if (aulaRaw == null) localStorage.removeItem(AU.KEY); else localStorage.setItem(AU.KEY, aulaRaw); } catch (e) { /* sin almacenamiento */ }
        G.guardado.save(true); const snap = G.guardado.serialize(); G.guardado.reset(true);
        try { localStorage.setItem(G.guardado.KEY, snap); } catch (e) { /* sin almacenamiento */ }
        check('Guardar y cargar', G.guardado.load(true) && S.complete && tiene('opcion_a') && tiene('cuidado_cajas') && S.edu && S.edu.formativa.q6 && S.field.length === 6);
        G.guardado.reset(true);
        if (AU.recargar) AU.recargar();
        T.restoreSave(keep);
        G.quiet = false;
        return result();
      },
    },
  });
})();
