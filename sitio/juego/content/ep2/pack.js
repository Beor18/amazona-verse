/* Content pack EP2 · «Un lugar para todos» · PROTOTIPO jugable de las misiones 1 a 3: «Lee la tierra», «Escuchar primero»
   y «Casa que aguanta», más el Aula del episodio (EP2_MISIONES.md §5–7): «Iguaca te pregunta» (formativa, opcional, sin puntaje),
   el Modo Maestro (misma puerta y esquema que el ep. 1: src/game/aula.js con lecciones.js) y el Diario y el criadero del ep. 2.
   Sale de content/plantilla y reutiliza el motor tal cual (nada de src/ tocado). Diseño: docs/equipo/EP2_GDD.md,
   EP2_NARRATIVA.md y EP2_MISIONES.md §2–7. Ábrelo con index.html?pack=ep2 (boot.js lo carga solo, con lecciones.js).
   Lo que depende del canon de Kelvin (EP2_GDD.md §10) va con el marcador neutro [KELVIN] y no es canon: en la nota de la escena o en
   un comentario, nunca en el texto que lee el jugador (AD1). El inglés va en content/ep2/en.js (pack.idioma, después del de cap1).
   Lo que el jugador observa en cada sitio (pendiente, suelo, viento) y lo que falla en la tormenta son valores del juego, no datos
   del mundo real: la ciencia de suelos y de cajas nido sigue «por verificar» (EP2_MISIONES.md §2 y §4). El único dato real es el de
   la parada del nido, con su fuente. Todo el estado va en S.collected (se guarda solo): tarjetas, decisiones y lo que falló. */
(function () {
  'use strict';
  const LUMA = { x: -2, z: 2 };
  // Tres sitios para la casa: lo que se observa en cada uno (valores del juego). Ninguno es «el malo»: se elige con evidencia
  const SITIOS = {
    a: { id: 'a', nombre: 'el llano', x: -12, z: 10, pendiente: 'plana', suelo: 'se hace charco: el agua tarda mucho en bajar', viento: 'poco viento' },
    b: { id: 'b', nombre: 'la loma', x: 16, z: -6, pendiente: 'empinada', suelo: 'el agua baja rápido', viento: 'mucho viento' },
    c: { id: 'c', nombre: 'el claro', x: 0, z: -16, pendiente: 'suave', suelo: 'el agua baja a ritmo medio', viento: 'algo de viento' },
  };
  const IDS = Object.keys(SITIOS);
  const NIDO = { x: -20, z: -4 };
  // Misión 2: los dos residentes y la mesa de las tarjetas. [KELVIN: quiénes son la abuela y el papá y su aspecto]
  const ABUELA = { x: 8, z: 9 }, PAPA = { x: -10, z: -7 }, MESA = { x: 5, z: 1 };
  // Lo que rodea a los residentes: la charca junto a la abuela, su refugio viejo y la rama del papá
  const CHARCA = { x: 10.6, z: 11.2, r: 1.5 }, REFUGIO = { x: 10.6, z: 6.4, r: 2 }, RAMA = { x: -11.8, z: -8.4, r: 1.6 };
  const FUENTE = 'USFWS, Programa interagencial de la cotorra puertorriqueña (2026)';
  const lee = id => 'lee_' + id, elige = id => 'sitio_' + id;
  const IMG = { Iguaca: 'assets/luma.png', Vittata: 'assets/vittata.png', Abuela: 'assets/agilis.png', 'Papá': 'assets/vittata.png', 'Guardián': 'assets/guardian.png' };
  const di = (who, text) => ({ who, img: IMG[who], text });
  const Lu = t => di('Iguaca', t);

  // ---------- Misión 2 · «Escuchar primero»: preguntas (abiertas dan tarjeta; cerradas, respuesta corta y sin castigo) ----------
  const PREGUNTAS = {
    abuela: [
      { q: '¿Cómo entras a tu casa cada día?', r: 'Con estas alas cansadas, mejor a pie. Que la entrada sea baja.', tarjeta: 'entrada_baja' },
      { q: '¿Qué no te gusta del refugio de ahora?', r: 'El viento frío de la noche se cuela y no me deja dormir.', tarjeta: 'sin_viento' },
      { q: '¿Dónde te gusta estar?', r: 'Cerca del agua, para oírla. Pero no encima: con la tormenta, el agua sube.', tarjeta: 'agua' },
      { q: '¿Te gusta el verde?', r: 'Sí.' },
      { q: '¿Verdad que mi plano es bonito?', r: 'Ajá.' },
    ],
    papa: [
      { q: '¿Dónde pondrías el nido?', r: 'En un hueco oscuro, como el de un tronco viejo.', tarjeta: 'hueco_oscuro' },
      { q: '¿Qué le pasa a un nido con la lluvia?', r: 'Si se moja, el huevo se enfría. Tiene que estar seco.', tarjeta: 'seco' },
      { q: '¿Por qué te fuiste cuando viste el plano?', r: 'Todo estaba a ras del suelo. Un nido abajo queda a la vista de todos. Lo quiero alto.', tarjeta: 'alto' },
      { q: '¿Qué necesita el huevo para estar tranquilo?', r: 'Que nadie pase por al lado ni lo moleste.', tarjeta: 'tranquilo' },
      { q: '¿Te gusta mi plano?', r: 'No.' },
    ],
  };
  // Tarjetas: lo que dicen los residentes son criterios (lo que la casa debe lograr); las de Iguaca, restricciones (límites)
  const TARJETAS = {
    entrada_baja: { texto: 'Entrada baja', tipo: 'criterio' }, sin_viento: { texto: 'Sin viento frío', tipo: 'criterio' },
    agua: { texto: 'Cerca del agua, pero no encima', tipo: 'criterio' }, hueco_oscuro: { texto: 'Hueco oscuro para el nido', tipo: 'criterio' },
    seco: { texto: 'Nido seco', tipo: 'criterio' }, alto: { texto: 'Nido alto', tipo: 'criterio' }, tranquilo: { texto: 'Que nadie moleste el nido', tipo: 'criterio' },
    materiales: { texto: 'Solo los materiales que ya tenemos y el banco de trabajo', tipo: 'restriccion' },
    tres_dias: { texto: 'Hay que terminar en 3 días, antes de la tormenta', tipo: 'restriccion' },
  };
  const NEC = Object.keys(PREGUNTAS).flatMap(k => PREGUNTAS[k].filter(p => p.tarjeta).map(p => 'nec_' + p.tarjeta));
  const ORDEN = ['entrada_baja', 'materiales', 'hueco_oscuro', 'sin_viento', 'seco', 'tres_dias', 'agua', 'alto', 'tranquilo'];
  const FRASES = ['¿Y si la casa tiene dos niveles?', 'Busquemos un diseño que sirva a los dos.'];

  // ---------- Misión 3 · «Casa que aguanta»: boceto, 4 decisiones, nido, prueba, mejora y prueba otra vez ----------
  const BOCETOS = {
    ancha: { label: 'Planta baja ancha con altillo (cumple 7 de 7)', corto: 'la planta baja ancha' },
    torre: { label: 'Torre con anexo (cumple 6 de 7: más viento arriba)', corto: 'la torre con anexo' },
  };
  const DECISIONES = [
    { parte: 'base', pregunta: '¿Sobre qué va la casa?', opciones: [['pilotes', 'Pilotes de madera: la casa queda en alto'], ['piedra', 'Base de piedra a ras del suelo']] },
    { parte: 'paredes', pregunta: '¿Con qué haces las paredes?', opciones: [['tablas', 'Tablas clavadas'], ['trenzado', 'Ramas trenzadas']] },
    { parte: 'techo', pregunta: '¿Qué techo le pones?', opciones: [['dos', 'Techo de dos aguas'], ['una', 'Techo de una sola agua']] },
    { parte: 'anclaje', pregunta: '¿Amarras el techo a los postes?', opciones: [['si', 'Sí: amarras de soga en cada poste'], ['no', 'No: así terminas antes']] },
  ];
  const NIDO_PASOS = [
    { pregunta: '¿Dónde va la caja del nido?', bien: 'Arriba, en el altillo', mal: 'Abajo, junto a la puerta', papa: 'Abajo no: todos pasarían por al lado. Lo quiero alto.' },
    { pregunta: '¿Cómo es por dentro?', bien: 'Oscura, con un hueco de entrada pequeño', mal: 'Abierta, con mucha luz', papa: 'Con tanta luz no parece un hueco. Oscura, como un tronco.' },
    { pregunta: '¿Y con la lluvia?', bien: 'Con su propio techito, seca', mal: 'Sin techo: ya tiene el de la casa', papa: 'Si gotea el techo grande, el huevo se moja. Que tenga el suyo.' },
  ];
  // Qué parte se cambia para arreglar cada falla y cómo se dice
  const ARREGLOS = {
    base: 'Subir la base: pilotes más altos', paredes: 'Cerrar las paredes: tapar las juntas con barro',
    techo: 'Reforzar el techo: más amarras', anclaje: 'Amarrar el techo a los postes',
  };

  const DIALOGOS = { escenas: [
    { id: 'e_inicio', disparador: 'inicio:ep2', personaje: 'Vittata', emocion: 'pensando', lineas: ['Otra tormenta en tres días. El refugio no aguanta.', 'Ya sé dónde pondré la casa… ¿o no?'], nota: '[KELVIN: lo que dice la Voz y la luz de la niebla]' },
    { id: 'e_iguaca', disparador: 'interact:iguaca', personaje: 'Iguaca', emocion: 'idea', lineas: ['Elegiste el sitio a ojo. ¿Y si lo miras como en la ruta de la gota?', 'Hay tres sitios: el llano, la loma y el claro. Mira la pendiente, el suelo y el viento de cada uno. Luego eliges.'] },
    { id: 'e_fin', disparador: 'evento:SiteChosen', personaje: 'Iguaca', emocion: 'feliz', lineas: ['Elegiste con evidencia, no a ojo. Eso es leer la tierra.', 'Ahora falta lo más importante: quienes van a vivir ahí. La abuela y el papá.', 'Ve a enseñarle tu plano a la abuela.'], nota: '[KELVIN: quiénes son los dos residentes]' },
    { id: 'e_plano_v', disparador: 'evento:ResidentsMet', personaje: 'Vittata', emocion: 'feliz', lineas: ['¡Miren mi plano! Una casa grande, de una planta, con la puerta aquí y el nido aquí al lado.'] },
    { id: 'e_plano_a', disparador: 'evento:ResidentsMet', personaje: 'Abuela', emocion: 'triste', lineas: ['…'] },
    { id: 'e_plano_p', disparador: 'evento:ResidentsMet', personaje: 'Papá', emocion: 'triste', lineas: ['(El papá mira el plano, no dice nada y se va volando a su rama.)'] },
    { id: 'e_plano_g', disparador: 'evento:ResidentsMet', personaje: 'Guardián', emocion: 'idea', lineas: ['¿Les preguntaste… o les contaste?'], nota: '[KELVIN: si el Guardián habla aquí y con qué voz]' },
    { id: 'e_plano_v2', disparador: 'evento:ResidentsMet', personaje: 'Vittata', emocion: 'pensando', lineas: ['Les conté. Esta vez voy a preguntar primero.'] },
    { id: 'e_choque', disparador: 'evento:NeedsListed', personaje: 'Iguaca', emocion: 'pensando', lineas: ['Mira estas dos: «entrada baja» para la abuela y «nido alto» para el papá. Parece que chocan.'] },
    { id: 'e_escucha', disparador: 'evento:ListenChoice', personaje: 'Iguaca', emocion: 'feliz', lineas: ['Eso es escuchar primero: ahora sabes lo que la casa tiene que lograr y lo que no puedes saltarte.', 'Ve a tu sitio y dibuja la casa.'] },
    { id: 'e_fiesta', disparador: 'evento:Chapter2Completed', personaje: 'Abuela', emocion: 'feliz', lineas: ['Entrada baja, sin viento frío y el agua cerca, pero no encima. Esta casa me escuchó.'] },
    { id: 'e_fiesta_p', disparador: 'evento:Chapter2Completed', personaje: 'Papá', emocion: 'feliz', lineas: ['Alto, oscuro y seco. Aquí el huevo va a estar tranquilo.'], nota: '[KELVIN: si hay huevo en escena]' },
    { id: 'e_fiesta_g', disparador: 'evento:Chapter2Completed', personaje: 'Guardián', emocion: 'pensando', lineas: ['(Se toca la medalla.) Una casa que escucha… Esto ya lo vi antes. No recuerdo dónde.'], nota: 'D5 (DECIDIDO-EQUIPO 30-oct): la medalla del Guardián asoma en el ep. 2 y se explica en el ep. 5.' },
    { id: 'e_fiesta_i', disparador: 'evento:Chapter2Completed', personaje: 'Iguaca', emocion: 'feliz', lineas: ['Probaste, viste qué falló, lo cambiaste y volviste a probar. ¡Fiesta de techado!', 'Cuando quieras, ven y te hago unas preguntas sobre lo que hicimos. Sin prisa y sin nota.'] },
  ] };

  AVE.registerPack({
    id: 'ep2',
    archivos: ['lecciones.js'], // la lección del Aula (window.AV_LECCIONES_EP2); boot.js la carga después de este archivo
    idioma: ['content/cap1/en.js', 'content/ep2/en.js'], // inglés: el diccionario común y el del episodio (solo si el idioma es EN)
    meta: {
      titulo: 'Un lugar para todos', capitulo: 2, almacen: 'ep2',
      hud: { capitulo: 'Capítulo 2 · Un lugar nuevo', titulo: 'Un lugar para todos', portada: 'Capítulo 2 · Un lugar para todos',
        etiqueta: 'Capítulo 2 · Un lugar para todos', fin: '¡La casa aguanta!',
        nota: 'Capítulo 2: elige dónde vivir, escucha a todos y construye una casa que aguante. No uses tu nombre real.', inventario: {} },
    },
    jugador: { nombre: 'Vittata', sprite: 'assets/vittata.png', especie: 'vittata', altura: 1.75, aparicion: { x: -4, z: 6 }, camara: 0.6 },
    // edu: aula del episodio (fichas, respuestas de «Iguaca te pregunta» y el registro local). Las partidas del prototipo sin la
    // clave la reciben vacía (aula.js la crea si falta).
    guardado: { version: 1, claves: ['edu'], estado: () => ({ edu: { inicio: null, fin: null, fichas: [], formativa: {}, registro: null } }) },
    // Aula (src/game/aula.js): misma puerta («Docentes» + multiplicación) y mismo esquema que el ep. 1; clave propia del dispositivo
    aula: { clave: 'amazonaverse.aula.cap2', estado: 'edu', archivo: 'amazonaverse_cap2', lecciones: () => window.AV_LECCIONES_EP2 },
    // Criadero (src/game/criadero.js, content/comun/huevos.js): el nido entra en el mundo al cerrar M1 con Iguaca (SiteChosen).
    // Las cápsulas se ganan con lo de siempre (condiciones 'defecto' de huevos.js: preguntas, hallazgos, XP); ninguna se compra.
    // La cápsula del bosque llega con el nido de M3 (obtener.ep2 en huevos.js) y el criadero es el mismo del cap. 1
    // (almacen 'amazonaverse': la cría del ep. 1 sigue a Vittata). La partida del ep. 2 sigue aparte (ep2.save).
    criadero: { desde: 'SiteChosen', almacen: 'amazonaverse' },

    mundo: {
      tamano: 40, segmentos: 80,
      exposicion: 0.74,
      cielo: { color: '#c3e2f0', cenit: '#2a7fd4', sol: '#fff1cf', niebla: [40, 1000], nieblaAltura: [8, 70] },
      luces: { cielo: '#cfe6ff', suelo: '#45602e', hemi: 0.66, sol: '#fff0d6', solInt: 2.0, solPos: [-42, 70, 46] },
      post: { saturacion: 1.08, contraste: 1.04, bloom: 0.2, vineta: 0.16 },
      mar: { laguna: '#86e3cf', somero: '#1fa9ad', hondo: '#0b4f86' },
      lugares: { inicio: { x: -4, z: 4, r: 5 }, nido: { x: NIDO.x, z: NIDO.z, r: 3 } },
      terreno: {
        ondas: [{ fn: 'sin', x: 0.09, amp: 0.5 }, { fn: 'cos', z: 0.07, amp: 0.4 }],
        relieves: [{ tipo: 'colina', x: 16, z: -6, alto: 6, ancho: 40 }], // la loma: el sitio empinado
        planos: ['inicio', 'nido'],
      },
      arboles: { cantidad: 36, semilla: 5, copaCada: 2, margenRio: 5, copaColor: '#2f7d43',
        // { x: -1.5, z: 11 }: donde arranca la cámara detrás de Vittata (una palma ahí tapaba la pantalla al empezar)
        evitar: [LUMA, NIDO, ABUELA, PAPA, MESA, CHARCA, REFUGIO, RAMA, { x: -1.5, z: 11, r: 4.5 }].concat(IDS.map(i => SITIOS[i]), IDS.map(i => ({ x: SITIOS[i].x - 3, z: SITIOS[i].z }))) },
      oceano: { color: '#0b4f86', y: -2.6 },
    },
    // el personaje es Iguaca (su id no es «luma»: esa es la de cap1)
    npcs: [
      { id: 'iguaca', nombre: 'Iguaca', sprite: 'assets/luma.png', x: LUMA.x, z: LUMA.z, escala: 2.2, flota: true },
      { id: 'abuela', nombre: 'Abuela', sprite: IMG.Abuela, x: ABUELA.x, z: ABUELA.z, escala: 1.8 },
      { id: 'papa', nombre: 'Papá', sprite: IMG['Papá'], x: PAPA.x, z: PAPA.z, escala: 1.8 },
    ],
    objetos: {}, recursos: [],

    // ---------- Historia: leer la tierra (M1), escuchar (M2) y construir, probar y mejorar (M3) ----------
    historia: {
      pasos: [
        { id: 'hablar', texto: 'Habla con Iguaca', guia: G => G.misiones.at('iguaca') },
        { id: 'tierra', texto: 'Lee la tierra: observa los 3 sitios y elige uno', progreso: S => ` (${IDS.filter(i => S.collected.includes(lee(i))).length}/3)`,
          hasta: { mision: 'lee_tierra' }, guia: G => { // con los 3 leídos, la flecha va al sitio más cercano: no empuja hacia ninguno (se elige con evidencia)
            const S = G.S, i = IDS.find(k => !S.collected.includes(lee(k))), d = k => Math.hypot(SITIOS[k].x - S.pos.x, SITIOS[k].z - S.pos.z);
            return G.misiones.at('sitio_' + (i || IDS.slice().sort((a, b) => d(a) - d(b))[0])); } },
        { id: 'volver', texto: 'Cuéntale a Iguaca lo que elegiste', guia: G => G.misiones.at('iguaca') },
        { id: 'plano', texto: 'Enséñale tu plano a la abuela', hasta: { evento: 'ResidentsMet' }, guia: G => G.misiones.at('abuela') },
        { id: 'preguntar', texto: 'Pregunta a la abuela y al papá qué necesitan', progreso: S => ` (${NEC.filter(k => S.collected.includes(k)).length}/${NEC.length})`,
          hasta: { recogido: NEC }, guia: G => G.misiones.at(PREGUNTAS.abuela.some(p => p.tarjeta && !G.S.collected.includes('nec_' + p.tarjeta)) ? 'abuela' : 'papa') },
        { id: 'ordenar', texto: 'Ordena las tarjetas en la mesa', hasta: { mision: 'escuchar' }, guia: G => G.misiones.at('mesa') },
        { id: 'construir', texto: 'Dibuja y construye la casa en tu sitio', hasta: { recogido: ['base', 'paredes', 'techo', 'anclaje'].map(p => 'dec_' + p) }, guia: G => G.misiones.at('obra') },
        { id: 'nido', texto: 'Arma el nido del papá', hasta: { evento: 'HomeBuilt' }, guia: G => G.misiones.at('obra') },
        { id: 'prueba1', texto: 'Prueba la casa: espera la tormenta', hasta: { evento: 'StormTested' }, guia: G => G.misiones.at('obra') },
        { id: 'mejorar', texto: 'Cambia solo lo que falló', hasta: { evento: 'HomeImproved' }, guia: G => G.misiones.at('obra') },
        { id: 'prueba2', texto: 'Prueba otra vez', guia: G => G.misiones.at('obra') },
      ],
      fin: () => 'Leíste la tierra, escuchaste primero y probaste la casa hasta que aguantó. La abuela ya entró y el nido del papá está seco y en alto. Iguaca tiene unas preguntas para ti, cuando quieras.',
    },
    misiones: [
      { id: 'lee_tierra', titulo: 'Lee la tierra', hud: 'Pendiente, suelo y viento',
        pasos: [{ texto: 'Observa los 3 sitios', hasta: { recogido: IDS.map(lee) } }, { texto: 'Elige un sitio', hasta: { alguno: IDS.map(i => ({ recogido: elige(i) })) } }],
        recompensa: { hito: 'tierra' } },
      { id: 'escuchar', titulo: 'Escuchar primero', hud: 'Criterios y restricciones',
        pasos: [{ texto: 'Pregunta a los dos', hasta: { recogido: NEC } }, { texto: 'Ordena las tarjetas', hasta: { evento: 'NeedsListed' } },
          { texto: 'Resuelve el choque', hasta: { evento: 'ListenChoice' } }],
        recompensa: { hito: 'escuchar' } },
      { id: 'casa', titulo: 'Casa que aguanta', hud: 'Construir, probar y mejorar',
        pasos: [{ texto: 'Construye la casa y el nido', hasta: { evento: 'HomeBuilt' } }, { texto: 'Primera prueba', hasta: { evento: 'StormTested' } },
          { texto: 'Mejora lo que falló', hasta: { evento: 'HomeImproved' } }, { texto: 'Segunda prueba', hasta: { evento: 'NestPlaced' } }],
        recompensa: { hito: 'casa' } },
    ],
    // Diario del ep. 2 (§7): 6 hallazgos, 3 de ciencia del terreno y 3 de cultura de la construcción en PR. Lo que el niño lee aquí
    // describe solo lo que hay en el juego; el dato real de cada uno está en lecciones.js (diario, mismo id) y va «por verificar»:
    // no sale al Diario hasta tener fuente. La parada del nido es la única charla con dato y fuente (abajo).
    diario: {
      titulo: 'Cuaderno del terreno', corto: 'Cuaderno', boton: 'Cuaderno',
      categorias: { terreno: { nombre: 'Terreno', desconocido: 'Una marca del terreno', sonido: 'pickup', rafaga: 'feathers' },
        cultura: { nombre: 'Casas de aquí', desconocido: 'Un trozo de casa vieja', sonido: 'pickup', rafaga: 'gold' } },
      entradas: [
        { id: 'charco', cat: 'terreno', nombre: 'Charco del llano', x: -12, z: 15, texto: 'El agua del cubo se quedó aquí un buen rato. La abuela lo sabía.',
          modelo: (add, S1) => { add(new THREE.CylinderGeometry(0.6, 0.6, 0.04, 14), '#5a7a9a', 0, 0.02, 0); } },
        { id: 'cinta_lluvia', cat: 'terreno', nombre: 'Cinta de lluvia', x: 19, z: -1, texto: 'Un hilo de agua bajando por la loma, cada vez más rápido.',
          modelo: (add) => { add(new THREE.BoxGeometry(0.12, 0.04, 1.6), '#7ab8e0', 0, 0.05, 0); } },
        { id: 'poste_viento', cat: 'terreno', nombre: 'Poste con cinta', x: -5, z: -18, texto: 'En la loma la cinta se agita; en el claro, apenas.',
          modelo: (add) => { add(new THREE.CylinderGeometry(0.05, 0.06, 1.2, 6), '#8a6a3a', 0, 0.6, 0); add(new THREE.PlaneGeometry(0.5, 0.18), '#d6403a', 0.3, 1.05, 0); } },
        { id: 'zocos', cat: 'cultura', nombre: 'Zocos viejos', x: 13, z: 12, texto: 'Cuatro postes de madera que una vez levantaron una casa del suelo.',
          modelo: (add) => { for (const [dx, dz] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) add(new THREE.CylinderGeometry(0.07, 0.08, 0.7, 6), '#6b4a2a', dx, 0.35, dz); } },
        { id: 'techo_zinc', cat: 'cultura', nombre: 'Plancha de techo', x: -14, z: -12, texto: 'Una plancha ondulada, puesta inclinada para que el agua corra.',
          modelo: (add) => { const m = add(new THREE.BoxGeometry(1.2, 0.04, 0.8), '#9aa0a6', 0, 0.35, 0); m.rotation.z = 0.5; } },
        { id: 'bohio', cat: 'cultura', nombre: 'Hojas de palma trenzadas', x: -16, z: 2, texto: 'Un trozo de techo hecho de hojas de palma, como los de las casas de hace mucho.',
          modelo: (add) => { const m = add(new THREE.ConeGeometry(0.6, 0.5, 8, 1, true), '#a8903a', 0, 0.3, 0); m.material.side = THREE.DoubleSide; } },
      ],
      hitos: [{ id: 'cuaderno', todos: true }],
    },
    ropa: [
      { clave: 'lentes:#2b2b2b:binoculares', hito: 'tierra', nombre: 'Lentes binoculares', pista: 'leer la tierra', viste: { slot: 'eyes', id: 'lentes', color: '#2b2b2b', style: 'binoculares' } },
      { clave: 'mano:cuaderno', hito: 'escuchar', nombre: 'Cuaderno de campo', pista: 'escuchar primero', viste: { slot: 'hand', id: 'mano', color: '#2f8f4e', style: 'cuaderno' } },
      { clave: 'casco:constructor', hito: 'casa', nombre: 'Casco de constructor', pista: 'una casa que aguanta', viste: { slot: 'head', id: 'casco', color: '#f2c21a', style: 'constructor' } },
      { clave: 'botas:constructor', hito: 'casa', nombre: 'Botas de constructor', viste: { slot: 'feet', id: 'botas', color: '#2b2b2b', style: 'constructor' } },
      { clave: 'mano:mapa', hito: 'cuaderno', nombre: 'Mapa del terreno', pista: 'el Cuaderno completo', viste: { slot: 'hand', id: 'mano', color: '#c9a227', style: 'mapa' } },
    ],
    eventos: { defs: {
      PlayerCharacterCreated: { type: 'CharacterCreated', loc: 'villa', chars: ['player'], scene: 'portrait' },
      StormWarning: { type: 'QuestAccepted', loc: 'villa', chars: ['vittata', 'iguaca'], scene: 'dialogue' },
      TerrainRead: { type: 'LocationDiscovered', loc: 'villa', chars: ['vittata'], scene: null },
      SiteChosen: { type: 'LandDecisionMade', loc: 'villa', chars: ['vittata', 'iguaca'], scene: 'final' },
      ResidentsMet: { type: 'CharacterMet', loc: 'villa', chars: ['vittata', 'abuela', 'papa'], scene: 'dialogue' },
      NeedsListed: { type: 'NeedsListed', loc: 'villa', chars: ['vittata', 'iguaca'], scene: null },
      ListenChoice: { type: 'DialogueChoice', loc: 'villa', chars: ['vittata', 'abuela', 'papa'], scene: 'dialogue' },
      HomeBuilt: { type: 'ConstructionCompleted', loc: 'villa', chars: ['vittata'], scene: null },
      StormTested: { type: 'StormTest', loc: 'villa', chars: ['vittata'], scene: 'action' },
      HomeImproved: { type: 'DesignImproved', loc: 'villa', chars: ['vittata'], scene: null },
      NestPlaced: { type: 'NestPlaced', loc: 'villa', chars: ['papa'], scene: 'final' },
      Chapter2Completed: { type: 'ChapterCompleted', loc: 'villa', chars: ['vittata', 'iguaca', 'abuela', 'papa'], scene: 'final' },
    } },
    dialogos: { datos: () => DIALOGOS, retratos: IMG, retratoDefecto: 'assets/vittata.png' },
    comic: {
      marca: 'UN LUGAR PARA TODOS', tituloDefecto: 'Mi capítulo 2', archivo: 'ep2-mi-comic', pdfTitulo: 'Un lugar para todos',
      capturas: ['sitio', 'escuchar', 'casa'], portadas: {},
      vinetas: [
        { id: 'intro', img: 'portrait', needs: 'PlayerCharacterCreated', texto: S => `Soy ${S.profile.name} y vi venir otra tormenta.` },
        { id: 'sitio', img: 'sitio', needs: 'SiteChosen', texto: 'Miré la pendiente, el suelo y el viento antes de elegir dónde construir.' },
        { id: 'escuchar', img: 'escuchar', needs: 'ListenChoice', texto: S => `Pregunté antes de construir. Y dije: «${FRASES[S.collected.includes('frase_1') ? 1 : 0]}»` },
        { id: 'casa', img: 'casa', needs: 'NestPlaced', texto: 'La primera tormenta encontró un fallo. Lo cambié, probé otra vez… ¡y la casa aguantó!' },
      ],
    },

    inicio(G) { G.eventos.log('StormWarning'); G.dialogo.say(G.dialogo.L('inicio:ep2'), () => G.ui.toast('Habla con Iguaca', 3000)); },

    preparar(G) {
      const S = G.S, H = G.terreno.height, L = G.dialogo.L;
      const tiene = k => S.collected.includes(k), poner = k => { if (!tiene(k)) S.collected.push(k); };
      const leidos = () => IDS.filter(i => tiene(lee(i)));
      const elegido = () => IDS.find(i => tiene(elige(i)));
      const valor = (pref, ops) => ops.find(o => tiene(pref + o));
      const elegir = (who, text, opciones, done) => G.dialogo.choose(di(who, text), opciones, done);

      // ---------- Aula del episodio (§5 y §6): «Iguaca te pregunta» y el registro local del Modo Maestro (src/game/aula.js) ----------
      const AU = G.aula, LEC = (AU.activo && AU.LEC) || {};
      const E = () => S.edu || (S.edu = { inicio: null, fin: null, fichas: [], formativa: {}, registro: null });
      const idsFormativa = () => ((LEC.formativa && LEC.formativa.seleccion && LEC.formativa.seleccion[AU.aj.grado]) || []).filter(id => AU.preguntaPublicable(AU.pregunta(id)));
      const todasPreguntadas = () => idsFormativa().every(id => (E().formativa || {})[id]);
      // Objetivos E1–E4 con la evidencia del juego (lecciones.js, objetivos); una pregunta cuenta si se acertó en 2 intentos o menos
      function objetivos() {
        const f = E().formativa || {}, ok = id => f[id] && f[id] <= 2, pre = id => f[id] != null, had = ev => G.eventos.had(ev);
        const res = [];
        if (leidos().length === 3 && elegido() && (!pre('q1') || ok('q1')) && (!pre('q2') || ok('q2'))) res.push('E1');
        if (NEC.every(tiene) && had('NeedsListed') && (!pre('q3') || ok('q3'))) res.push('E2');
        if (had('HomeImproved') && had('NestPlaced') && (!pre('q4') || ok('q4')) && (!pre('q5') || ok('q5'))) res.push('E3');
        if (tiene('nido_listo') && ok('q6')) res.push('E4');
        return res;
      }
      // Fila del reporte local (sin nombre ni texto libre): lo que el maestro ve en Progreso y descarga en CSV/JSON
      function registrar() {
        const e = E();
        if (!AU.activo || e.inicio == null) return;
        const pregs = {}; for (const id of idsFormativa()) pregs[id] = (e.formativa || {})[id] || '';
        AU.registrar({
          misiones_completadas: ['lee_tierra', 'escuchar', 'casa'].filter(m => S.missions[m]),
          sitios_observados: leidos().length, sitio_elegido: elegido() ? SITIOS[elegido()].nombre : '',
          tarjetas_necesidades: NEC.filter(tiene).length, choque_resuelto: G.eventos.had('ListenChoice'),
          falla_tormenta: ['base', 'paredes', 'techo'].find(p => tiene('falla_' + p)) || '', mejora_hecha: G.eventos.had('HomeImproved'), nido_listo: tiene('nido_listo'),
          preguntas: pregs, objetivos_logrados: objetivos(),
          minutos_mision: e.fin != null ? Math.max(1, Math.round((e.fin - e.inicio) / 60)) : '',
        });
      }
      // «Iguaca te pregunta»: 6 preguntas seguidas en la tarjeta del aula (pista en el 2.º intento, respuesta en el 3.º, sin puntaje)
      function formativa() {
        const ids = idsFormativa(), esc = AU.esc;
        const cab = (i, n) => `<div class="edu-head"><img class="edu-cara" src="${IMG.Iguaca}" alt=""><div><span class="eyebrow">${esc(AU.t(LEC.meta && LEC.meta.titulo))}</span><h2>${esc(AU.t({ es: 'Iguaca te pregunta', en: 'Iguaca asks you' }))}</h2></div></div>` +
          `<div class="edu-dots" aria-hidden="true">${Array.from({ length: n }, (_, k) => `<span class="${k < i ? 'ok' : k === i ? 'now' : ''}"></span>`).join('')}</div>`;
        AU.serie(ids, { cabecera: cab, alResponder: registrar, alTerminar: () => {
          G.ui.hideCard(); registrar();
          G.dialogo.say([Lu('¡Eso es pensar como quien construye! Ya sabes leer la tierra, escuchar primero y probar hasta que aguante.')]);
        } });
      }
      // Pestaña del Modo Maestro con las columnas del episodio (la pestaña «Progreso» de aula.js lleva las del ep. 1)
      if (AU.activo && AU.pestana) AU.pestana({ id: 'ep2', titulo: { es: 'Progreso ep. 2', en: 'Ep. 2 progress' }, html: () => {
        const esc = AU.esc, t = AU.t, P = AU.partidas, yn = v => (v === true ? t({ es: 'sí', en: 'yes' }) : v === false ? t({ es: 'no', en: 'no' }) : '');
        if (!P.length) return `<p class="note">${esc(t({ es: 'Todavía no hay partidas en este dispositivo.', en: 'No sessions on this device yet.' }))}</p>`;
        const C = t({ es: ['Fecha', 'Estación', 'Misiones', 'Sitios', 'Sitio', 'Tarjetas', 'Falló', 'Mejoró', 'Preguntas', 'Objetivos', 'Min'], en: ['Date', 'Station', 'Missions', 'Sites', 'Site', 'Cards', 'Failed', 'Improved', 'Questions', 'Objectives', 'Min'] });
        const filas = P.slice().reverse().map(p => `<tr><td>${esc(p.fecha)}</td><td>${esc(p.estacion || AU.aj.estacion)}</td><td>${(p.misiones_completadas || []).length}/3</td><td>${p.sitios_observados != null ? p.sitios_observados + '/3' : ''}</td><td>${esc(p.sitio_elegido || '')}</td><td>${p.tarjetas_necesidades != null ? p.tarjetas_necesidades + '/7' : ''}</td><td>${esc(p.falla_tormenta || '')}</td><td>${yn(p.mejora_hecha)}</td><td>${esc(p.preguntas ? Object.entries(p.preguntas).filter(([, v]) => v).map(([k, v]) => k + ':' + v).join(' ') : '')}</td><td>${esc((p.objetivos_logrados || []).join(' '))}</td><td>${p.minutos_mision != null ? p.minutos_mision : ''}</td></tr>`).join('');
        return `<p class="note">${esc(t({ es: 'Solo lo guardado en este dispositivo. No se envía nada por la red.', en: 'Only what is stored on this device. Nothing is sent over the network.' }))}</p><div class="maestro-scroll"><table class="maestro-tabla"><thead><tr>${C.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${filas}</tbody></table></div>`;
      } });

      // ---------- Iguaca: da cada misión y, en medio, una pista del paso en curso; al final, las preguntas (opcionales) ----------
      function hablar() {
        if (S.step === 0) { G.dialogo.say(L('interact:iguaca'), () => { E().inicio = S.clock; G.misiones.advanceTo(1); }); return; }
        if (S.step === 1) { G.dialogo.say([Lu('Mira los 3 sitios: el llano, la loma y el claro. Llevas ' + leidos().length + ' de 3.')]); return; }
        if (S.step === 2) {
          G.eventos.log('SiteChosen'); G.comic.capture('sitio'); G.audio.play('unlock'); registrar();
          if (window.AVTemporada) window.AVTemporada.apuntar(2, { sitio: elegido() }); // D11: el ep. 3 nombra la casa en este sitio
          G.dialogo.say(L('evento:SiteChosen'), () => { G.misiones.advanceTo(3); G.ui.toast('Enséñale tu plano a la abuela', 3000); });
          return;
        }
        if (S.complete && AU.activo && !todasPreguntadas()) {
          elegir('Iguaca', '¡La casa aguanta! Cuando quieras, te hago unas preguntas sobre lo que hicimos. Sin prisa y sin nota.',
            [{ label: 'Sí, pregúntame', v: 1 }, { label: 'Ahora no', v: 0 }], o => { if (o.v) formativa(); else G.dialogo.say([Lu('Cuando quieras. Aquí estaré.')]); });
          return;
        }
        const pistas = {
          3: 'La abuela está junto al agua. Enséñale tu plano.',
          4: 'Haz preguntas abiertas: las que empiezan por «cómo», «qué» o «por qué» dan más respuesta que un sí o un no.',
          5: 'Las tarjetas te esperan en la mesa.',
          6: 'Ve a tu sitio, ' + (SITIOS[elegido()] || SITIOS.a).nombre + ', y dibuja la casa.',
          7: 'Falta el nido del papá: alto, oscuro y seco.',
          8: 'Ya está construida. Ahora, la prueba de verdad: la tormenta.',
          9: 'La tormenta te enseñó qué parte es la más débil. Cambia solo esa.',
          10: 'Vuelve a probarla. Si aguanta, ¡hay fiesta!',
        };
        G.dialogo.say([Lu(S.complete ? '¡La casa aguanta! Puedes seguir explorando.' : pistas[S.step] || 'Sigue así.')]);
      }
      G.interaccion.add({ id: 'iguaca', x: LUMA.x, z: LUMA.z, r: 2.4, label: () => S.step === 2 ? 'Contarle a Iguaca' : 'Hablar con Iguaca', use: hablar });

      // Cada sitio: primero se observa (pendiente, suelo, viento); con los 3 leídos, se puede elegir
      const cintas = [];
      for (const id of IDS) {
        const s = SITIOS[id], y = H(s.x, s.z);
        const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 6), new THREE.MeshLambertMaterial({ color: '#8a6a3a' }));
        poste.position.set(s.x, y + 1.1, s.z); G.renderer.scene.add(poste);
        const cinta = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.3).translate(0.45, 0, 0), new THREE.MeshLambertMaterial({ color: '#d6403a', side: THREE.DoubleSide }));
        cinta.position.set(s.x + 0.06, y + 2, s.z); G.renderer.scene.add(cinta);
        cintas.push([cinta, s.x, { a: 0.12, b: 0.75, c: 0.35 }[id]]); // la cinta se agita con el viento de cada sitio: se lee a la vista
        G.interaccion.add({ id: 'sitio_' + id, x: s.x, z: s.z, r: 2.4,
          visible: () => S.step === 1 && !elegido(),
          label: () => leidos().length === 3 ? 'Elegir ' + s.nombre : 'Observar ' + s.nombre,
          use: () => {
            if (!tiene(lee(id))) {
              S.collected.push(lee(id)); G.eventos.log('TerrainRead'); G.misiones.check(); G.audio.play('pickup');
              const lineas = [di('Vittata', `En ${s.nombre}: pendiente ${s.pendiente}; ${s.suelo}; ${s.viento}.`)];
              if (leidos().length === 3) lineas.push(di('Vittata', 'Ya miré los tres sitios. Ahora elijo uno: voy al que me convenza y pulso Acción.'));
              G.dialogo.say(lineas);
              return;
            }
            if (leidos().length < 3) { G.ui.toast('Observa los 3 sitios antes de elegir', 2500); return; }
            S.collected.push(elige(id)); G.misiones.check(); G.audio.play('unlock');
            G.dialogo.say([di('Vittata', `Elijo ${s.nombre}. Aquí voy a construir.`)]);
            G.fx.burst(s.x, y + 1.5, s.z, 'gold', 20);
            dibujarCasa();
          } });
      }

      // ---------- Misión 2 · «Escuchar primero» ----------
      const cerradas = new Set(); // preguntas de sí o no ya hechas (no se repiten en esta sesión)
      function preguntar(quien) {
        const nombre = quien === 'abuela' ? 'Abuela' : 'Papá', lista = PREGUNTAS[quien];
        const faltan = () => lista.filter(p => p.tarjeta && !tiene('nec_' + p.tarjeta));
        if (!faltan().length) { G.dialogo.say([di(nombre, quien === 'abuela' ? 'Ya te dije lo que necesito, mi niña.' : 'Ya sabes lo que pide el nido.')]); return; }
        const abiertas = lista.filter(p => p.tarjeta ? !tiene('nec_' + p.tarjeta) : !cerradas.has(p.q));
        elegir('Vittata', quien === 'abuela' ? 'Le pregunto a la abuela…' : 'Le pregunto al papá…', abiertas.map(p => ({ label: p.q, p })), o => {
          const p = o.p, nueva = p.tarjeta && !tiene('nec_' + p.tarjeta);
          if (!p.tarjeta) cerradas.add(p.q);
          if (nueva) { poner('nec_' + p.tarjeta); G.audio.play('pickup'); G.ui.toast('Nueva tarjeta: «' + TARJETAS[p.tarjeta].texto + '»', 2500); } // la tarjeta va en un aviso: una línea menos que leer por respuesta
          G.misiones.check();
          const lineas = [di(nombre, p.r)];
          if (!p.tarjeta) lineas.push(di('Vittata', 'Mmm… a esa solo se puede contestar sí o no. Pruebo con otra.'));
          G.dialogo.say(lineas, () => { if (faltan().length) preguntar(quien); else G.ui.toast(NEC.every(tiene) ? 'Tarjetas completas: ve a la mesa' : 'Pregunta también ' + (quien === 'abuela' ? 'al papá' : 'a la abuela'), 3000); });
        });
      }
      function abuela() {
        if (S.step < 3) { G.dialogo.say([di('Abuela', 'Dicen que viene otra tormenta. Este refugio no aguanta otra.')]); return; }
        if (S.step === 3) {
          G.eventos.log('ResidentsMet');
          G.dialogo.say(L('evento:ResidentsMet'), () => { G.misiones.check(); G.ui.toast('Pregúntales qué necesitan', 3000); });
          return;
        }
        if (S.step === 4) { preguntar('abuela'); return; }
        G.dialogo.say([di('Abuela', S.complete ? '¡Qué bien se está en la casa nueva!' : 'Gracias por preguntarme, mi niña.')]);
      }
      function papa() {
        if (S.step < 4) { G.dialogo.say([di('Papá', S.step === 3 ? '…' : 'Busco un hueco para el nido antes de la tormenta.')]); return; }
        if (S.step === 4) { preguntar('papa'); return; }
        G.dialogo.say([di('Papá', S.complete ? 'El nido está seco y en alto. Gracias.' : 'Alto, oscuro y seco. No se te olvide.')]);
      }
      const itAbuela = G.interaccion.add({ id: 'abuela', x: ABUELA.x, z: ABUELA.z, r: 2.4, label: () => S.step === 3 ? 'Enseñar el plano a la abuela' : S.step === 4 ? 'Preguntar a la abuela' : 'Hablar con la abuela', use: abuela });
      const itPapa = G.interaccion.add({ id: 'papa', x: PAPA.x, z: PAPA.z, r: 2.4, label: () => S.step === 4 ? 'Preguntar al papá' : 'Hablar con el papá', use: papa });

      // La mesa: cada tarjeta, ¿criterio o restricción? Si no acierta, una pista y se vuelve a preguntar (sin castigo)
      function ordenar() {
        const k = ORDEN.find(t => !tiene('ord_' + t));
        if (!k) { choque(); return; }
        const t = TARJETAS[k], quien = t.tipo === 'restriccion' ? 'Iguaca te da' : 'Tarjeta';
        elegir('Iguaca', // la definición completa en las 2 primeras tarjetas; luego, la pregunta corta (9 tarjetas: no se repite lo mismo 9 veces)
          ORDEN.filter(x => tiene('ord_' + x)).length < 2 ? `${quien}: «${t.texto}». ¿Es un criterio (lo que la casa debe lograr) o una restricción (un límite que no se puede saltar)?` : `${quien}: «${t.texto}». ¿Criterio o restricción?`,
          [{ label: 'Criterio', v: 'criterio' }, { label: 'Restricción', v: 'restriccion' }], o => {
            if (o.v !== t.tipo) {
              G.audio.play('wrong');
              G.dialogo.say([Lu(t.tipo === 'criterio' ? 'Piénsalo otra vez: eso es algo que la casa tiene que lograr para quien vive en ella.' : 'Piénsalo otra vez: eso no lo pide nadie; es un límite que no podemos cambiar.')], ordenar);
              return;
            }
            poner('ord_' + k); G.audio.play('tick'); ordenar();
          });
      }
      function choque() {
        if (!G.eventos.had('NeedsListed')) { G.eventos.log('NeedsListed'); G.misiones.check(); }
        G.dialogo.say(L('evento:NeedsListed'), () => elegir('Iguaca', '¿Qué haces con las dos?', [
          { label: 'Elegir a la abuela: entrada baja', v: 'abuela' }, { label: 'Elegir al papá: nido alto', v: 'papa' },
          { label: FRASES[0], v: 0 }, { label: FRASES[1], v: 1 },
        ], o => {
          if (o.v === 'abuela' || o.v === 'papa') {
            G.dialogo.say([o.v === 'abuela' ? di('Papá', '¿Y el nido? Si queda abajo, no me sirve. ¿No hay forma de que sirva a los dos?') : di('Abuela', '¿Y yo cómo subo, mi niña? ¿No hay forma de que sirva a los dos?')], choque);
            return;
          }
          poner('frase_' + o.v); G.eventos.log('ListenChoice', { choice: FRASES[o.v] }); G.comic.capture('escuchar'); G.audio.play('unlock'); registrar();
          G.dialogo.say([di('Vittata', FRASES[o.v] + ' Abajo, la entrada baja para la abuela; arriba, el nido del papá.')].concat(L('evento:ListenChoice')), () => G.misiones.check());
        }));
      }
      G.interaccion.add({ id: 'mesa', x: MESA.x, z: MESA.z, r: 2.4, visible: () => S.step >= 5,
        label: () => S.step === 5 ? 'Ordenar las tarjetas' : 'Mirar las tarjetas',
        use: () => {
          if (S.step === 5) { encuadrar(MESA.x, MESA.z, PLANO_MESA); ordenar(); return; }
          const c = ORDEN.filter(k => TARJETAS[k].tipo === 'criterio').map(k => TARJETAS[k].texto), r = ORDEN.filter(k => TARJETAS[k].tipo === 'restriccion').map(k => TARJETAS[k].texto);
          G.dialogo.say([di('Vittata', 'Criterios: ' + c.join(', ') + '.'), di('Vittata', 'Restricciones: ' + r.join(', ') + '.')]);
        } });
      const mesa = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 1), new THREE.MeshLambertMaterial({ color: '#8a6a3a' }));
      mesa.position.set(MESA.x, H(MESA.x, MESA.z) + 0.4, MESA.z); G.renderer.scene.add(mesa);

      // ---------- Escenario alrededor de las misiones (primitivas en el estilo del resto del capítulo) ----------
      const pieza = (geo, c, x, y, z) => { const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: c })); m.position.set(x, y, z); m.castShadow = true; G.renderer.scene.add(m); return m; };
      const alto = (x, z, r) => Math.max(...[[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]].map(([dx, dz]) => H(x + dx, z + dz))); // lo más alto bajo un disco
      // Un charco o charca: agua translúcida sobre el suelo, con piedras en el borde para que no se vea flotar
      function charca(x, z, r, piedras) {
        const a = pieza(new THREE.CylinderGeometry(r, r * 0.92, 0.06, 20), '#3d7e9e', x, (H(x, z) + alto(x, z, r)) / 2 + 0.01, z);
        a.material.transparent = true; a.material.opacity = 0.78; a.castShadow = false; a.receiveShadow = true;
        for (let i = 0; i < piedras; i++) { const t = i / piedras * Math.PI * 2 + 0.3, px = x + Math.cos(t) * r, pz = z + Math.sin(t) * r; pieza(new THREE.DodecahedronGeometry(0.16 + 0.07 * (i % 3), 0), '#8d8a82', px, H(px, pz) + 0.08, pz).scale.y = 0.6; }
      }
      charca(CHARCA.x, CHARCA.z, CHARCA.r, 11); // «La abuela está junto al agua»
      charca(SITIOS.a.x + 1.6, SITIOS.a.z + 1.4, 1.1, 7); // el llano se encharca: se ve antes de leerlo
      for (const [dx, dz, r] of [[1.4, 1.2, 0.35], [-1.2, 1.8, 0.25], [2, -0.6, 0.3]]) { const x = SITIOS.b.x + dx, z = SITIOS.b.z + dz; pieza(new THREE.DodecahedronGeometry(r, 0), '#8d8a82', x, H(x, z) + r * 0.4, z); } // piedras sueltas de la loma
      // El refugio de ahora, el que no aguanta: cuatro horcones torcidos y un techo de palma que se cae de un lado
      { const { x, z } = REFUGIO, y = H(x, z);
        for (const [dx, dz, h] of [[-0.9, -0.7, 1.6], [0.9, -0.7, 1.5], [-0.9, 0.7, 1.1], [0.9, 0.7, 0.9]]) pieza(new THREE.CylinderGeometry(0.06, 0.08, h, 6), '#6b4a2a', x + dx, H(x + dx, z + dz) + h / 2, z + dz).rotation.z = dx * 0.06;
        const t = pieza(new THREE.BoxGeometry(2.2, 0.12, 1.9), '#8f7a3e', x, y + 1.3, z); t.rotation.set(0.32, 0.6, 0.1);
        pieza(new THREE.BoxGeometry(0.9, 0.08, 0.7), '#8f7a3e', x + 1.1, y + 0.05, z + 1).rotation.y = 0.9; // un trozo de techo ya caído
        G.fisica.colliders.push({ x, z, r: 1, h: 1.4, kind: 'obj' }); }
      // La rama del papá: un tronco seco con una rama larga, donde se va volando al ver el plano
      { const { x, z } = RAMA, y = H(x, z);
        pieza(new THREE.CylinderGeometry(0.22, 0.32, 3.4, 8), '#6b4a2a', x, y + 1.7, z);
        const r = pieza(new THREE.CylinderGeometry(0.07, 0.11, 1.8, 6), '#6b4a2a', x + 0.75, y + 2.75, z + 0.2); r.rotation.z = -1.1;
        pieza(new THREE.CylinderGeometry(0.05, 0.07, 0.9, 6), '#6b4a2a', x - 0.35, y + 3.1, z - 0.1).rotation.z = 0.7;
        G.fisica.colliders.push({ x, z, r: 0.4, h: 3.4, kind: 'obj' }); }
      // Dos banquitos junto a la mesa y las tarjetas encima: salen al conseguirlas y van a su columna al ordenarlas
      for (const dx of [-1.3, 1.3]) pieza(new THREE.CylinderGeometry(0.25, 0.28, 0.45, 10), '#7a5634', MESA.x + dx, H(MESA.x + dx, MESA.z + 0.2) + 0.22, MESA.z + 0.2);
      const yMesa = H(MESA.x, MESA.z) + 0.81;
      const fichas = ORDEN.map((k, i) => { const m = pieza(new THREE.BoxGeometry(0.26, 0.012, 0.18), TARJETAS[k].tipo === 'criterio' ? '#f4ecd2' : '#f2c9b0', MESA.x, yMesa, MESA.z); m.castShadow = false; m.userData = { k, i }; return m; });
      function mesaFichas() {
        let nc = 0, nr = 0;
        for (const m of fichas) {
          const { k, i } = m.userData, t = TARJETAS[k];
          m.visible = tiene('nec_' + k) || (t.tipo === 'restriccion' && S.step >= 5);
          if (tiene('ord_' + k)) { const c = t.tipo === 'criterio' ? nc++ : nr++; m.position.set(MESA.x + (t.tipo === 'criterio' ? -0.5 + (c % 2) * 0.3 : 0.6), yMesa, MESA.z - 0.36 + Math.floor(c / (t.tipo === 'criterio' ? 2 : 1)) * 0.2); m.rotation.y = 0; }
          else { m.position.set(MESA.x - 0.55 + (i % 5) * 0.27, yMesa, MESA.z - 0.1 + Math.floor(i / 5) * 0.24); m.rotation.y = ((i * 37) % 9 - 4) * 0.06; }
        }
      }
      // El taller de la obra (el banco de trabajo y los materiales que ya tenemos): se pone junto a la casa en el sitio elegido
      const taller = new THREE.Group(); G.renderer.scene.add(taller); taller.visible = false;
      { const tp = (geo, c, x, y, z) => { const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: c })); m.position.set(x, y, z); m.castShadow = true; taller.add(m); return m; };
        tp(new THREE.BoxGeometry(1.5, 0.1, 0.7), '#8a6a3a', 0, 0.75, 0);
        for (const [dx, dz] of [[-0.65, -0.28], [0.65, -0.28], [-0.65, 0.28], [0.65, 0.28]]) tp(new THREE.BoxGeometry(0.08, 0.72, 0.08), '#6b4a2a', dx, 0.36, dz);
        for (let i = 0; i < 4; i++) tp(new THREE.BoxGeometry(1.8, 0.07, 0.22), '#a87c4f', 0.1, 0.04 + i * 0.075, 0.95 + (i % 2) * 0.05);
        for (const dx of [-1.25, -1.6]) tp(new THREE.CylinderGeometry(0.28, 0.3, 0.6, 10), '#d8bb5e', dx, 0.3, 0.2 + (dx + 1.25) * 1.2);
        tp(new THREE.BoxGeometry(0.3, 0.06, 0.12), '#5a5f66', 0.3, 0.83, 0.05); }
      G.fisica.colliders.push(Object.assign(taller.userData, { x: 0, z: -99, r: 0.9, h: 0.9, kind: 'obj' }));
      // Desde «Dibuja la casa», la abuela y el papá van a mirar la obra: a los lados de la casa, dentro del plano y nunca entre la
      // cámara y la casa (antes el papá se quedaba en su sitio, justo al lado de la cámara de la obra en el claro)
      const npc = id => G.actores.npc && G.actores.npc(id);
      function ponerNpc(n, it, x, z) { if (!n) return; n.def.x = x; n.def.z = z; n.sp.position.set(x, H(x, z) + 1.0, z); n.sh.position.set(x, H(x, z) + 0.03, z); if (n.collider) { n.collider.x = x; n.collider.z = z; } if (it) { it.x = x; it.z = z; } }
      let enObra = null;
      function residentes() {
        const k = S.step >= 6 && elegido() ? elegido() : '';
        if (k === enObra) return; enObra = k;
        const s = SITIOS[k];
        ponerNpc(npc('abuela'), itAbuela, s ? s.x - 3 - 2.3 : ABUELA.x, s ? s.z + 2.8 : ABUELA.z);
        ponerNpc(npc('papa'), itPapa, s ? s.x - 3 + 2.7 : PAPA.x, s ? s.z + 2.4 : PAPA.z);
      }

      // ---------- Misión 3 · «Casa que aguanta» ----------
      // La parte más débil según las decisiones y el sitio de la M1 (valores del juego): siempre falla una, con salida
      function falla() {
        const sitio = elegido() || 'a';
        if (tiene('dec_anclaje_no')) return { parte: 'techo', arreglo: 'anclaje', que: 'Sin amarras, el viento levantó el techo.' };
        if (sitio === 'a' && tiene('dec_base_piedra')) return { parte: 'base', arreglo: 'base', que: 'En el llano se hizo charco y la base de piedra quedó en el agua.' };
        if (sitio === 'b' && tiene('dec_paredes_trenzado')) return { parte: 'paredes', arreglo: 'paredes', que: 'En la loma sopla mucho: el viento entró por el trenzado.' };
        return { a: { parte: 'base', arreglo: 'base', que: 'En el llano el charco subió más de lo pensado y mojó la base.' },
          b: { parte: 'techo', arreglo: 'techo', que: 'En la loma el viento tiró tanto que aflojó una esquina del techo.' },
          c: { parte: 'paredes', arreglo: 'paredes', que: 'En el claro la lluvia vino de lado y entró por las juntas de las paredes.' } }[sitio];
      }
      const obra = G.interaccion.add({ id: 'obra', x: 0, z: 0, r: 3, visible: () => S.step >= 6 && !!elegido(),
        label: () => ({ 6: 'Dibujar y construir la casa', 7: 'Armar el nido', 8: 'Esperar la tormenta', 9: 'Mejorar la casa', 10: 'Probar otra vez' })[S.step] || 'Mirar la casa',
        use: () => {
          if (S.step === 6) construir(); else if (S.step === 7) armarNido(); else if (S.step === 8) prueba1(); else if (S.step === 9) mejorar(); else if (S.step === 10) prueba2();
          else G.dialogo.say([di('Vittata', S.complete ? 'Mi casa. La probé dos veces.' : 'Aquí va la casa.')]);
        } });
      function construir() {
        encuadrar();
        const boceto = valor('boceto_', Object.keys(BOCETOS));
        if (!boceto) {
          elegir('Vittata', 'Dos bocetos de dos niveles. ¿Cuál cumple más tarjetas?', Object.keys(BOCETOS).map(k => ({ label: BOCETOS[k].label, k })), o => {
            poner('boceto_' + o.k); G.audio.play('tick'); dibujarCasa(true);
            G.dialogo.say([di('Vittata', 'Voy con ' + BOCETOS[o.k].corto + '. Uso la madera y la paja que tenemos y el banco de trabajo.')], construir); // [KELVIN: qué materiales pasan del ep. 1]
          });
          return;
        }
        const d = DECISIONES.find(x => !valor('dec_' + x.parte + '_', x.opciones.map(o => o[0])));
        if (!d) { poner('dec_base'); poner('dec_paredes'); poner('dec_techo'); poner('dec_anclaje'); G.misiones.check(); G.ui.toast('Falta el nido del papá', 3000); return; }
        elegir('Vittata', d.pregunta, d.opciones.map(o => ({ label: o[1], v: o[0] })), o => {
          poner('dec_' + d.parte + '_' + o.v); G.audio.play('tick'); G.fx.burst(obra.x, H(obra.x, obra.z) + 1, obra.z, 'feathers', 10); dibujarCasa(true); construir();
        });
      }
      function armarNido(i) {
        i = i || 0; const p = NIDO_PASOS[i];
        encuadrar();
        if (!p) {
          poner('nido_listo'); G.eventos.log('HomeBuilt'); G.audio.play('unlock'); dibujarCasa(true); G.misiones.check(); registrar();
          G.dialogo.say([di('Papá', 'Alto, oscuro y seco. Así sí.'), Lu('La casa está hecha. ¿Aguantará? Solo hay una forma de saberlo.')]);
          return;
        }
        const ops = i % 2 ? [{ label: p.mal, ok: false }, { label: p.bien, ok: true }] : [{ label: p.bien, ok: true }, { label: p.mal, ok: false }];
        elegir('Vittata', p.pregunta, ops, o => {
          if (!o.ok) { G.audio.play('wrong'); G.dialogo.say([di('Papá', p.papa)], () => armarNido(i)); return; }
          G.audio.play('tick'); armarNido(i + 1);
        });
      }
      // ---------- Plano de la obra: Vittata se pone delante de la puerta y la cámara encuadra la casa entera ----------
      // (al construir, armar el nido, en la tormenta y al mejorar). Se suelta solo al cerrar el diálogo (ver 'update').
      // En escritorio la casa queda a la derecha de Vittata, fuera de la tarjeta de elección (que va centrada)
      const CAM = G.camara.CAM;
      let plano = null, libreT = 0; // lo de la cámara de antes
      // En el móvil la tarjeta va en el centro: la cámara sube y mira más abajo para que la casa quede en la franja de arriba.
      // encuadrar(x, z, v) sirve también para la mesa: v = { escritorio, movil } con [dx, dz de Vittata, dist, alto, mira]
      const PLANO_OBRA = { escritorio: [-4.2, 5.5, 7, 3, 2.4], movil: [0.9, 6.5, 10, 6.5, 0.4] };
      const PLANO_MESA = { escritorio: [-2.4, 2.6, 5, 3.5, 0.8], movil: [0.5, 3.2, 6, 5, 0.3] };
      function encuadrar(x, z, v) {
        if (x == null) { if (!elegido()) return; x = obra.x; z = obra.z; }
        const movil = G.renderer.camera.aspect < 1, [dx, dz, dist, height, look] = (v || PLANO_OBRA)[movil ? 'movil' : 'escritorio'], vx = x + dx, vz = z + dz;
        S.pos.x = vx; S.pos.z = vz; S.pos.y = H(vx, vz); S.vy = 0; S.facing = { x: 0, z: -1 }; G.fisica.MOVE.flying = false;
        if (!plano) plano = { dist: CAM.dist, height: CAM.height, look: CAM.look };
        Object.assign(CAM, { dist, height, look });
        G.camara.yaw = 0; G.camara.place(true); libreT = 0;
      }
      function soltarPlano() { if (plano) Object.assign(CAM, plano); plano = null; }

      // ---------- La tormenta: el cielo se cierra, llueve de lado con viento, truena y la parte débil se sacude ----------
      const NUBLADO = new THREE.Color('#46525e');
      let temporal = null; // lo de antes (luces, cielo, niebla, lluvia), k de 0 a 1 y la parte que falla
      function tormenta(lineas, done, parte) {
        encuadrar();
        if (G.clima && G.clima.fijar) G.clima.fijar('sol', { inmediato: true }); // el clima de El Yunque no pisa la prueba
        const sc = G.renderer.scene, rain = G.fx.rain, luces = [];
        sc.traverse(o => { if (o.isHemisphereLight || o.isDirectionalLight) luces.push([o, o.intensity]); });
        const skyU = G.renderer.sky && G.renderer.sky.material.uniforms;
        temporal = { k: 0, on: true, t: 0, parte, mostrado: !parte, luces, rafagaT: 0.4, truenoT: 1,
          fondo: sc.background && sc.background.isColor ? sc.background.clone() : null,
          sky: skyU ? { cenit: skyU.uCenit.value.clone(), hor: skyU.uHorizonte.value.clone(), sol: skyU.uSolCol.value.clone() } : null,
          niebla: sc.fog ? [sc.fog.color.clone(), sc.fog.near, sc.fog.far] : null,
          lluvia: [rain.material.opacity, rain.material.size, rain.rotation.z] };
        if (G.look && G.look.pausarAmbiente) G.look.pausarAmbiente(true);
        rain.visible = true; rain.material.opacity = 1; rain.material.size = 0.18; rain.rotation.z = 0.35;
        if (G.audio.has('lluvia')) G.audio.play('lluvia');
        G.dialogo.say(lineas, () => { if (!temporal.mostrado) mostrarFallo(); calma(); done(); });
      }
      function calma() {
        const T = temporal; if (!T) return;
        const sc = G.renderer.scene, rain = G.fx.rain;
        for (const [l, i] of T.luces) l.intensity = i;
        if (T.fondo) sc.background.copy(T.fondo);
        if (T.sky && G.renderer.sky) {
          const u = G.renderer.sky.material.uniforms;
          u.uCenit.value.copy(T.sky.cenit); u.uHorizonte.value.copy(T.sky.hor); u.uSolCol.value.copy(T.sky.sol);
        }
        if (T.niebla) { sc.fog.color.copy(T.niebla[0]); sc.fog.near = T.niebla[1]; sc.fog.far = T.niebla[2]; }
        if (G.look && G.look.pausarAmbiente) G.look.pausarAmbiente(false);
        rain.visible = false; [rain.material.opacity, rain.material.size, rain.rotation.z] = T.lluvia;
        casa.rotation.set(0, 0, 0); for (const m of casa.children) if (m.userData.parte) m.rotation.z = m.userData.rz || 0;
        temporal = null;
        if (G.clima && G.clima.fijar) G.clima.fijar(null);
      }
      // A 1,2 s de empezar, cede la parte débil: se pinta de rojo, salen astillas y la cámara se sacude
      function mostrarFallo() {
        temporal.mostrado = true; dibujarCasa();
        const y = H(obra.x, obra.z);
        G.fx.burst(obra.x, y + (temporal.parte === 'base' ? 0.5 : temporal.parte === 'paredes' ? 1.8 : 3.5), obra.z, 'feathers', 24);
        G.camara.shake(0.12, 0.4); G.audio.play('wrong');
      }
      G.on('update', (dt, busy) => {
        if (plano) { libreT = busy ? 0 : libreT + dt; if (libreT > 0.4) soltarPlano(); }
        residentes(); mesaFichas();
        const tt = performance.now() / 1000;
        for (const [c, x0, a] of cintas) { c.rotation.y = a * Math.sin(tt * (2 + a * 7) + x0) - a * 0.4; c.rotation.x = a * 0.5 * Math.sin(tt * (5 + a * 9)); }
        const T = temporal; if (!T || !dt) return;
        T.t += dt; T.k = Math.min(1, T.k + dt / 1.2);
        const k = T.k * (1 - 0.3 * Math.max(0, Math.sin(T.t * 1.7)) ** 8), sc = G.renderer.scene; // con rachas de más oscuridad
        let flash = 0;
        if ((T.truenoT -= dt) <= 0) { T.truenoT = 3.5 + Math.random() * 2; if (!G.renderer.REDUCED) T.flashT = 0.15; if (G.audio.has('trueno')) G.audio.play('trueno'); }
        if (T.flashT > 0) { T.flashT -= dt; flash = 1.4; }
        for (const [l, i] of T.luces) l.intensity = i * (1 - 0.55 * k + flash);
        if (T.fondo) sc.background.copy(T.fondo).lerp(NUBLADO, 0.8 * k);
        if (T.sky && G.renderer.sky) {
          const u = G.renderer.sky.material.uniforms, n = NUBLADO.clone().convertSRGBToLinear();
          u.uCenit.value.copy(T.sky.cenit).lerp(n, 0.55 * k);
          u.uHorizonte.value.copy(T.sky.hor).lerp(n, 0.75 * k);
          u.uSolCol.value.copy(T.sky.sol).lerp(n, 0.45 * k);
        }
        if (T.niebla) { sc.fog.color.copy(T.niebla[0]).lerp(NUBLADO, 0.8 * k); sc.fog.near = T.niebla[1] * (1 - 0.6 * k); sc.fog.far = T.niebla[2] * (1 - 0.55 * k); }
        G.fx.rain.rotation.z = 0.35 + 0.12 * Math.sin(T.t * 2.3);
        if ((T.rafagaT -= dt) <= 0) { T.rafagaT = 1.3 + Math.random(); G.camara.shake(0.035, 0.3); }
        if (!T.mostrado && T.t > 1.2) mostrarFallo();
        // el viento empuja la casa entera un poco y mucho más la parte que cede
        const v = Math.sin(T.t * 9) * 0.5 + Math.sin(T.t * 23) * 0.5;
        casa.rotation.z = 0.012 * v * k;
        for (const m of casa.children) if (m.userData.parte && m.userData.parte === T.parte && T.mostrado) m.rotation.z = (m.userData.rz || 0) + 0.06 * v;
      });
      function prueba1() {
        const f = falla();
        poner('falla_' + f.parte);
        tormenta([di('Guardián', '¡Llega la tormenta! Viento, lluvia… y la casa nueva en medio.'), di('Vittata', '¡Algo cede! ' + f.que),
          Lu('Lo marqué en rojo. No pasa nada: para eso se prueba. Ahora sabes cuál es la parte más débil.')], () => {
          G.eventos.log('StormTested', { outcome: 'falla:' + f.parte }); G.misiones.check(); registrar();
        }, f.parte);
      }
      // Si falló el techo, sirven las dos opciones del techo (más amarras o amarrarlo a los postes): el niño lee «techo» en las dos
      const arregla = (f, k) => k === f.arreglo || (f.parte === 'techo' && (k === 'techo' || k === 'anclaje'));
      const mejorado = () => Object.keys(ARREGLOS).some(k => tiene('mejora_' + k) && arregla(falla(), k));
      function mejorar() {
        encuadrar();
        const f = falla();
        elegir('Iguaca', 'Cambia solo una parte. ¿Cuál?', Object.keys(ARREGLOS).map(k => ({ label: ARREGLOS[k], k })), o => {
          if (!arregla(f, o.k)) {
            G.audio.play('wrong');
            G.dialogo.say([Lu('Eso no fue lo que falló. Mira lo que marcó la tormenta: ' + f.que)], mejorar);
            return;
          }
          poner('mejora_' + o.k); G.audio.play('unlock'); dibujarCasa(true);
          G.eventos.log('HomeImproved', { choice: o.k }); registrar();
          G.dialogo.say([di('Vittata', ARREGLOS[o.k] + '. Listo. ¿Y ahora?'), Lu('Ahora se vuelve a probar. Una sola prueba no basta.')], () => G.misiones.check());
        });
      }
      function prueba2() {
        tormenta([di('Guardián', 'Otra vez el viento y la lluvia…'), di('Vittata', '¡Aguanta! Ni una gota en el nido.')], () => {
          G.eventos.log('StormTested', { outcome: 'aguanta' });
          G.eventos.log('NestPlaced'); poner('fiesta'); dibujarCasa(true); G.comic.capture('casa'); G.misiones.check();
          const y = H(obra.x, obra.z);
          G.fx.burst(obra.x, y + 3, obra.z, 'gold', 40); G.fx.burst(obra.x, y + 3, obra.z, 'feathers', 30); G.audio.play('unlock');
          S.complete = true; G.eventos.log('Chapter2Completed'); E().fin = S.clock;
          G.misiones.advanceTo(G.misiones.DONE); registrar();
          G.dialogo.say(L('evento:Chapter2Completed'), () => G.misiones.showEnd());
        });
      }

      // La casa se dibuja con lo que hay en S.collected (se rehace al cargar la partida): boceto, base, paredes, techo, nido y fallo.
      // Con anim (cada decisión del jugador), lo nuevo se monta a la vista: crece desde el suelo, una pieza tras otra, y el techo baja.
      const casa = new THREE.Group(); G.renderer.scene.add(casa);
      const mat = c => new THREE.MeshLambertMaterial({ color: c });
      let parteAct = null;
      const caja = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y, z); m.userData.parte = parteAct; casa.add(m); return m; };
      const clave = m => [m.geometry.type, ...Object.values(m.geometry.parameters).map(v => typeof v === 'number' ? +v.toFixed(2) : v), ...m.position.toArray().map(v => +v.toFixed(2))].join(':');
      let vistas = new Set();
      function dibujarCasa(anim) {
        while (casa.children.length) { const m = casa.children.pop(); m.geometry.dispose(); m.material.dispose(); }
        dibujarPiezas();
        const nuevas = new Set(casa.children.map(clave));
        if (anim) { let i = 0; for (const m of casa.children) if (!vistas.has(clave(m))) { m.userData.crece = -0.12 * i++; m.userData.y0 = m.position.y; m.userData.h = m.geometry.parameters.height || 0; m.userData.cae = m.userData.parte === 'techo' || m.userData.parte === 'fiesta'; } }
        vistas = nuevas;
        for (const m of casa.children) if (m.userData.crece != null) montar(m, 0);
      }
      function montar(m, dt) {
        const u = m.userData; u.crece = Math.min(1, u.crece + dt / 0.45);
        const s = Math.max(0, u.crece), e = 1 - (1 - s) ** 3;
        m.visible = u.crece > 0;
        if (u.cae) m.position.y = u.y0 + 1.6 * (1 - e);
        else { m.scale.y = Math.max(0.001, e); m.position.y = u.y0 - u.h * (1 - e) / 2; }
        if (u.crece >= 1) { m.scale.y = 1; m.position.y = u.y0; u.crece = null; }
      }
      G.on('update', dt => { if (dt) for (const m of casa.children) if (m.userData.crece != null) montar(m, dt); });
      function dibujarPiezas() {
        const s = SITIOS[elegido()];
        if (!s) return;
        obra.x = s.x - 3; obra.z = s.z;
        const boceto = valor('boceto_', Object.keys(BOCETOS));
        casa.position.set(obra.x, H(obra.x, obra.z), obra.z);
        { const tx = obra.x - 3.1, tz = obra.z - 1.3; taller.position.set(tx, H(tx, tz), tz); taller.rotation.y = 0.35; taller.visible = true; Object.assign(taller.userData, { x: tx, z: tz }); }
        if (!boceto) return;
        // la parte que falla no se ve hasta que la tormenta la encuentra (mostrarFallo)
        const fallo = temporal && !temporal.mostrado ? null : ['base', 'paredes', 'techo'].find(p => tiene('falla_' + p) && !mejorado());
        const rojo = p => fallo === p ? '#d6403a' : null;
        const torre = boceto === 'torre', w = torre ? 2 : 3.2, h = torre ? 3.2 : 1.8;
        const base = valor('dec_base_', ['pilotes', 'piedra']), paredes = valor('dec_paredes_', ['tablas', 'trenzado']);
        const techo = valor('dec_techo_', ['dos', 'una']);
        // el boceto, marcado en el suelo con estacas y cuerda: el contorno de la casa (y del anexo de la torre)
        parteAct = 'boceto';
        for (const [a, b, ex] of torre ? [[w, w, 0], [1.6, 1.6, w / 2 + 0.8]] : [[w, w, 0]]) {
          for (const sg of [-1, 1]) { caja(a, 0.05, 0.05, '#efe4c8', ex, 0.04, sg * b / 2); caja(0.05, 0.05, b, '#efe4c8', ex + sg * a / 2, 0.04, 0); }
          for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) caja(0.07, 0.4, 0.07, '#8a6a3a', ex + dx * a / 2, 0.2, dz * b / 2);
        }
        let y = 0;
        parteAct = 'base';
        if (base === 'pilotes') { const alto = tiene('mejora_base') ? 1.2 : 0.7; for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) caja(0.18, alto, 0.18, rojo('base') || '#6b4a2a', dx * (w / 2 - 0.2), alto / 2, dz * (w / 2 - 0.2)); y = alto; }
        else if (base === 'piedra') { caja(w + 0.3, tiene('mejora_base') ? 0.9 : 0.4, w + 0.3, rojo('base') || '#8d8a82', 0, tiene('mejora_base') ? 0.45 : 0.2, 0); y = tiene('mejora_base') ? 0.9 : 0.4; }
        if (!paredes) return;
        parteAct = 'paredes';
        caja(w, h, w, rojo('paredes') || (paredes === 'tablas' ? '#a87c4f' : '#c9a86a'), 0, y + h / 2, 0);
        if (torre) caja(1.6, 1.4, 1.6, paredes === 'tablas' ? '#a87c4f' : '#c9a86a', w / 2 + 0.8, y + 0.7, 0); // el anexo con la entrada baja
        else caja(1.4, 1.1, 1.4, paredes === 'tablas' ? '#a87c4f' : '#c9a86a', 0, y + h + 0.55, -0.4); // el altillo del nido
        caja(0.7, 0.9, 0.05, '#3b2a1a', torre ? w / 2 + 0.8 : 0, y + 0.45, (torre ? 0.8 : w / 2) + 0.03); // la puerta baja
        const top = y + h + (torre ? 0 : 1.1);
        if (techo) {
          parteAct = 'techo';
          const levantado = fallo === 'techo', c = rojo('techo') || '#7a5a2a';
          const t = techo === 'dos' ? new THREE.Mesh(new THREE.ConeGeometry(w * 0.85, 1.2, 4), mat(c)) : new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.15, w + 0.4), mat(c));
          if (techo === 'dos') t.rotation.y = Math.PI / 4; else t.rotation.x = 0.25;
          t.position.set(0, top + (techo === 'dos' ? 0.6 : 0.2) + (levantado ? 0.8 : 0), 0); if (levantado) t.rotation.z = 0.35;
          t.userData.parte = 'techo'; t.userData.rz = t.rotation.z;
          casa.add(t);
          parteAct = 'anclaje';
          if (tiene('dec_anclaje_si') || tiene('mejora_anclaje') || tiene('mejora_techo')) for (const dx of [-1, 1]) caja(0.05, top - y, 0.05, '#d9c79a', dx * (w / 2 + 0.03), y + (top - y) / 2, w / 2 + 0.03);
        }
        parteAct = 'nido';
        if (tiene('nido_listo')) caja(0.45, 0.55, 0.45, '#5a3d22', torre ? 0 : 0.3, top - 0.6, torre ? -w / 2 - 0.2 : -0.4 - 0.75);
        parteAct = 'fiesta';
        if (tiene('fiesta')) for (let i = 0; i < 6; i++) caja(0.3, 0.2, 0.02, ['#d6403a', '#ffffff', '#0a50a1'][i % 3], -w / 2 + i * w / 5, top + 0.1, w / 2 + 0.25);
        parteAct = null;
      }
      G.on('apply', () => { calma(); soltarPlano(); vistas = new Set(); dibujarCasa(); }, 75);
      dibujarCasa();

      // Parada de aprendizaje: dato real con fuente (opcional)
      G.interaccion.add({ id: 'parada_nido', x: NIDO.x, z: NIDO.z, r: 2.4, label: () => 'Mirar el hueco del árbol',
        use: () => G.dialogo.say([
          di('Vittata', 'Este tronco tiene un hueco. La cotorra puertorriqueña anida en cavidades, naturales y artificiales.'),
          Lu('Por eso las cajas nido ayudan. Fuente: ' + FUENTE + '.'),
        ], () => G.eventos.log('DatoNido')) });
      const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 3, 8), new THREE.MeshLambertMaterial({ color: '#6b4a2a' }));
      poste.position.set(NIDO.x, H(NIDO.x, NIDO.z) + 1.5, NIDO.z); G.renderer.scene.add(poste);
      G.fisica.colliders.push({ x: NIDO.x, z: NIDO.z, r: 0.6, h: 3, kind: 'obj' });
    },

    pruebas: {
      async selfTest(G, T) {
        const S = G.S, $ = G.util.$, { check, result } = T.runner(), { tick, drain, useAt, teleport } = T;
        const keep = T.keepSave();
        const criaderoRaw = (() => { try { return localStorage.getItem(G.criadero.KEY); } catch (e) { return null; } })(); // el criadero es el del cap. 1: se devuelve intacto
        const TP = window.AVTemporada, tempRaw = (() => { try { return localStorage.getItem(TP.KEY); } catch (e) { return null; } })(); // el registro de temporada (D11): se devuelve intacto
        try { localStorage.removeItem(TP.KEY); } catch (e) { /* sin almacenamiento */ }
        // Pulsa la opción de la tarjeta de elección cuyo texto contiene `txt`; luego pasa los diálogos
        const pick = txt => { const b = [...document.querySelectorAll('[id^="ch-"]')].find(x => x.textContent.includes(txt)); if (b) b.click(); drain(); return !!b; };
        const opciones = () => [...document.querySelectorAll('[id^="ch-"]')].map(b => b.textContent);
        G.quiet = true; G.guardado.reset(true);
        check('Crea el personaje', G.creador.saveCharacter({ name: 'Prueba', preset: 'agilis', outfit: 'azul', accessory: 'ninguno' }) === null);
        check('Empieza en el paso 1 de 11', S.step === 0 && $('steps').children.length === 11);
        check('Los marcadores [KELVIN] no son canon: van en la nota de la escena, nunca en lo que lee el jugador', G.pack.dialogos.datos().escenas.some(e => /\[KELVIN/.test(e.nota)) && !G.pack.dialogos.datos().escenas.some(e => /\[KELVIN/.test(e.lineas.join(' '))));
        useAt('iguaca'); drain();
        check('Iguaca da la misión', S.step === 1, 'paso ' + S.step);
        check('Antes de leer los 3 sitios no se puede elegir', (useAt('sitio_a'), drain(), useAt('sitio_a'), drain(), !S.collected.includes('sitio_a')) && S.collected.includes('lee_a'));
        useAt('sitio_b'); drain(); useAt('sitio_c'); drain();
        check('Los 3 sitios observados', ['lee_a', 'lee_b', 'lee_c'].every(k => S.collected.includes(k)) && S.step === 1);
        useAt('sitio_c'); drain();
        check('Elige un sitio: la misión se completa y llegan los lentes', S.missions.lee_tierra && S.step === 2 && S.unlocked.includes('lentes:#2b2b2b:binoculares'), JSON.stringify(S.missions));
        useAt('parada_nido'); drain();
        check('Parada del nido: dato con su fuente y evento', G.eventos.had('DatoNido'));
        useAt('iguaca'); drain();
        check('M1 cerrada con Iguaca: sigue «Escuchar primero», sin pantalla de fin', G.eventos.had('SiteChosen') && S.step === 3 && !S.complete && $('end').hidden, 'paso ' + S.step);
        check('D11 · El sitio elegido queda en el registro de temporada (el ep. 3 lo nombra)', TP.dato(2, 'sitio') === 'c', JSON.stringify(TP.decision(2)));

        // M2 · Escuchar primero
        useAt('abuela'); drain();
        check('M2 · El plano: la abuela calla, el Guardián pregunta', G.eventos.had('ResidentsMet') && S.step === 4, 'paso ' + S.step);
        useAt('abuela'); drain();
        check('M2 · Hay 5 preguntas para la abuela', opciones().length === 5, opciones().length);
        pick('verde');
        check('M2 · Una pregunta cerrada no da tarjeta ni castiga', S.step === 4 && !NEC.some(k => S.collected.includes(k)) && opciones().length === 4, opciones().length);
        pick('Cómo entras'); pick('refugio'); pick('Dónde te gusta');
        useAt('papa'); drain();
        pick('Dónde pondrías'); pick('lluvia'); pick('Por qué te fuiste'); pick('tranquilo');
        check('M2 · 7 tarjetas de las necesidades', NEC.every(k => S.collected.includes(k)) && S.step === 5, 'paso ' + S.step);
        useAt('mesa'); drain();
        pick('Restricción');
        check('M2 · Ordenar: un error da pista y se repite la tarjeta', !S.collected.includes('ord_entrada_baja') && opciones().join() === 'Criterio,Restricción');
        for (const k of ORDEN) pick(TARJETAS[k].tipo === 'criterio' ? 'Criterio' : 'Restricción');
        check('M2 · Tarjetas en criterios y restricciones', ORDEN.every(k => S.collected.includes('ord_' + k)) && G.eventos.had('NeedsListed'));
        pick('Elegir a la abuela');
        check('M2 · Elegir a uno: el papá lo devuelve, sin castigo', !G.eventos.had('ListenChoice') && opciones().length === 4);
        pick(FRASES[0]);
        check('M2 · Un diseño para los dos: misión completa y cuaderno', S.missions.escuchar && S.step === 6 && S.unlocked.includes('mano:cuaderno'), 'paso ' + S.step);

        // M3 · Casa que aguanta (en el claro, con techo sin amarrar: falla el techo)
        useAt('obra'); drain();
        pick('Planta baja ancha'); pick('Pilotes'); pick('Tablas'); pick('dos aguas'); pick('No: así');
        check('M3 · Boceto y 4 decisiones: la casa se ve', S.step === 7 && ['boceto_ancha', 'dec_base_pilotes', 'dec_anclaje_no'].every(k => S.collected.includes(k)), 'paso ' + S.step);
        useAt('obra'); drain();
        pick('Abajo');
        check('M3 · Nido: una respuesta mala da la pista del papá', !S.collected.includes('nido_listo') && opciones().length === 2);
        pick('Arriba'); pick('Oscura'); pick('techito');
        check('M3 · Nido alto, oscuro y seco: casa construida', G.eventos.had('HomeBuilt') && S.step === 8, 'paso ' + S.step);
        useAt('obra'); drain();
        check('M3 · Prueba 1: falla la parte más débil (sin amarras, el techo)', G.eventos.had('StormTested') && S.collected.includes('falla_techo') && S.step === 9 && !G.fx.rain.visible, 'paso ' + S.step);
        useAt('obra'); drain();
        pick('Subir la base');
        check('M3 · Mejorar otra parte no vale: pista y se repite', !G.eventos.had('HomeImproved') && opciones().length === 4);
        pick('Reforzar el techo');
        check('M3 · Si falló el techo, reforzarlo también vale (las dos opciones dicen «techo»)', G.eventos.had('HomeImproved') && S.collected.includes('mejora_techo'));
        check('M3 · Cambia solo lo que falló', G.eventos.had('HomeImproved') && S.step === 10, 'paso ' + S.step);
        useAt('obra'); drain();
        check('M3 · Prueba 2: aguanta, nido, casco y botas', G.eventos.had('NestPlaced') && S.missions.casa && ['casco:constructor', 'botas:constructor'].every(k => S.unlocked.includes(k)));
        check('Final: fiesta y pantalla de fin', S.complete && S.step === G.misiones.DONE && G.eventos.had('Chapter2Completed') && !$('end').hidden);
        check('El cómic sale de los eventos', G.comic.comicPanels().length === 4, G.comic.comicPanels().length);

        // ---------- §5 «Iguaca te pregunta» · §6 Modo Maestro · §7 Diario y criadero ----------
        const AU = G.aula, LEC = AU.LEC || {}, MM = LEC.modo_maestro || {}, QS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];
        const aulaRaw = (() => { try { return localStorage.getItem(AU.KEY); } catch (e) { return null; } })();
        check('Aula del ep. 2 con su propia clave y la misma puerta que el ep. 1 (multiplicación)', AU.activo && AU.KEY === 'amazonaverse.aula.cap2' && (AU.nuevoReto(), AU.reto() >= 78 && AU.reto() <= 171), AU.KEY);
        const g45 = MM.guia_45_min || {};
        check('Esquema igual al ep. 1: 4 objetivos, 6 preguntas, 6 fichas, guía de 45 min, 3 sin pantalla y rúbrica de 5',
          (LEC.objetivos || []).length === 4 && (LEC.preguntas || []).length === 6 && (LEC.diario || []).length === 6 && g45.antes && g45.antes.minutos + g45.durante.minutos + g45.despues.minutos === 45 &&
          (MM.actividades_sin_pantalla || []).length === 3 && MM.rubrica && MM.rubrica.criterios.length === 5 && MM.reporte_progreso.almacenamiento.clave === AU.KEY);
        check('Ninguna ficha sale al Diario sin fuente verificada: las 6 van por verificar, con fuente propuesta y nota', AU.fichas().length === 0 && LEC.diario.every(f => f.verificacion === 'por_verificar' && f.fuente && f.nota_verificacion));
        check('Las 6 preguntas se pueden hacer: ninguna depende de un dato por verificar', QS.every(id => AU.preguntaPublicable(AU.pregunta(id))));
        check('Nunca «grados» en lo que ve el maestro ni el niño', !/grado/i.test(JSON.stringify([g45, (MM.actividades_sin_pantalla || []).map(a => [a.titulo, a.materiales, a.pasos]), MM.rubrica, LEC.objetivos.map(o => o.enunciado), LEC.preguntas.map(q => [q.enunciado, q.opciones, q.retro])])));
        check('Antes de contestar, el reporte no lleva preguntas ni E4', AU.partida() && !AU.partida().preguntas.q1 && !AU.partida().objetivos_logrados.includes('E4'), JSON.stringify(AU.partida() && AU.partida().objetivos_logrados));
        G.misiones.seguirExplorando(); // «Seguir explorando»: cierra la pantalla de fin y deja el mundo libre (como el jugador)
        check('Tras el final, el mundo queda libre para seguir', $('end').hidden && !G.ui.busy());
        useAt('iguaca'); drain();
        check('Al volver con Iguaca, ofrece las preguntas (se pueden dejar para luego)', opciones().length === 2 && opciones().some(x => x.includes('Ahora no')), opciones().join());
        pick('Ahora no');
        check('«Ahora no»: ni tarjeta ni castigo', !G.ui.cardOpen && !Object.keys(S.edu.formativa).length);
        useAt('iguaca'); drain(); pick('Sí, pregúntame');
        const card = $('card'), opt = i => card.querySelector(`.edu-opt[data-i="${i}"]`), correcta = id => AU.pregunta(id).correcta;
        check('Iguaca te pregunta: tarjeta formativa con cara y sin puntaje visible', G.ui.cardOpen && card.querySelector('.edu-q') && card.querySelector('.edu-cara') && !/punt|score|\d+\s*\/\s*\d+|%/i.test(card.textContent), card.textContent.slice(0, 80));
        opt(correcta('q1') === 0 ? 1 : 0).click();
        check('Fallo en q1: pista en el segundo intento, sin castigo ni registro', G.ui.cardOpen && card.querySelector('.edu-retro.pista') && S.edu.formativa.q1 == null);
        opt(correcta('q1')).click();
        check('Acierta en el 2.º intento: retroalimentación y botón Seguir', card.querySelector('.edu-retro.ok') && $('edu-seguir'));
        $('edu-seguir').click();
        check('Se registra el intento (2) y sigue la q2', S.edu.formativa.q1 === 2 && /cinta de lluvia/i.test(card.textContent), card.textContent.slice(0, 60));
        for (const id of QS.slice(1)) { opt(correcta(id)).click(); const sg = $('edu-seguir'); if (sg) sg.click(); }
        drain();
        check('Las 6 respondidas: la tarjeta se cierra e Iguaca cierra', QS.every(id => S.edu.formativa[id]) && !G.ui.cardOpen, JSON.stringify(S.edu.formativa));
        const p = AU.partida();
        check('Reporte local del aula: preguntas, 3 misiones y los 4 objetivos, sin el nombre del jugador', p && p.preguntas.q1 === 2 && p.preguntas.q6 === 1 && p.misiones_completadas.length === 3 && ['E1', 'E2', 'E3', 'E4'].every(o => p.objetivos_logrados.includes(o)) && !JSON.stringify(p).includes('Prueba'), JSON.stringify(p));
        const csv = AU.reporteCSV();
        check('CSV del Modo Maestro con el sitio elegido y lo que falló', csv.includes('sitio_elegido') && csv.includes('el claro') && csv.includes('techo'));
        check('Modo Maestro: pestaña del ep. 2 y guía con el vocabulario', AU.pestanas().includes('ep2') && (AU.abrirMaestro(), AU.maestroAbierto()) && /criterio/i.test($('maestro').textContent) && /restricci/i.test($('maestro').textContent) && (AU.cerrarMaestro(), !AU.maestroAbierto()));
        useAt('iguaca'); drain();
        check('Iguaca no repite las preguntas', !G.ui.cardOpen && $('card').hidden && !G.dialogo.open());
        // §7 Diario
        for (const f of G.diario.entries) { teleport(f.x + 0.3, f.z); tick(0.1); }
        check('Diario: 6 hallazgos (3 del terreno, 3 de casas de aquí) y el mapa del terreno', S.field.length === 6 && G.diario.count('terreno') === 3 && G.diario.count('cultura') === 3 && S.unlocked.includes('mano:mapa'), S.field.join(','));
        check('Cada hallazgo tiene su ficha por verificar en la lección y el texto del juego no afirma el dato real', G.diario.entries.every(e => LEC.diario.some(f => f.id === e.id)) && !/arcill|taíno|zinc|pilote/i.test(G.diario.entries.map(e => e.texto).join(' ')));
        // §7 Criadero (compartido con todos los packs: content/comun/huevos.js)
        const H = (window.AV_HUEVOS && window.AV_HUEVOS.huevos) || [], cond = id => { const h = H.find(x => x.id === id); return (h && h.obtener && h.obtener.defecto) || {}; };
        check('Criadero del juego: el nido entra al elegir sitio (SiteChosen) y ninguna cápsula se compra', !!G.criadero && G.pack.criadero.desde === 'SiteChosen' && G.eventos.had('SiteChosen') && H.length > 0 && H.every(h => !/precio|price|compra|buy/i.test(JSON.stringify(h.obtener))));
        check('Cápsulas alcanzables en el ep. 2: la espacial con las preguntas y la boricua con el Diario', cond('espacial').preguntas <= 6 && cond('pr').hallazgos && cond('pr').hallazgos.min <= 6);
        const bosque = H.find(h => h.id === 'bosque');
        check('La cápsula del bosque llega con el nido de M3 y el criadero es el mismo del cap. 1 (la cría sigue a Vittata)', bosque && bosque.obtener.ep2 && bosque.obtener.ep2.mision === 'casa' && G.criadero.KEY === 'amazonaverse.criadero' && G.guardado.KEY.startsWith('ep2.'), G.criadero.KEY + ' · ' + G.guardado.KEY);
        try { if (criaderoRaw == null) localStorage.removeItem(G.criadero.KEY); else localStorage.setItem(G.criadero.KEY, criaderoRaw); } catch (e) { /* sin almacenamiento */ }
        try { if (aulaRaw == null) localStorage.removeItem(AU.KEY); else localStorage.setItem(AU.KEY, aulaRaw); } catch (e) { /* sin almacenamiento */ }
        try { if (tempRaw == null) localStorage.removeItem(TP.KEY); else localStorage.setItem(TP.KEY, tempRaw); } catch (e) { /* sin almacenamiento */ }
        G.guardado.save(true); const snap = G.guardado.serialize(); G.guardado.reset(true);
        try { localStorage.setItem(G.guardado.KEY, snap); } catch (e) { /* sin almacenamiento */ }
        check('Guardar y cargar', G.guardado.load(true) && S.complete && S.collected.includes('sitio_c') && S.collected.includes('mejora_techo') && S.edu && S.edu.formativa.q1 === 2 && S.field.length === 6, JSON.stringify(S.edu));
        G.guardado.reset(true);
        if (AU.recargar) AU.recargar();
        T.restoreSave(keep);
        G.quiet = false;
        return result();
      },
    },
  });
})();
