/* Content pack EP3 · «Más allá de la bahía» · jugable de principio a fin: «¿Qué flota?», «Leer el agua» y «Más allá de la bahía»,
   más el Aula del episodio (EP3_MISIONES.md §5–7): «Iguaca te pregunta» (formativa, opcional, sin puntaje), el Modo Maestro
   (src/game/aula.js con lecciones.js) y el Diario y el criadero del ep. 3. Sale de content/plantilla como content/ep2 y reutiliza
   el motor tal cual (nada de src/ tocado): mundo analítico con río (la poza de pruebas y la práctica) y una bahía hacia el mar;
   el bote es el modelo «canoa» del kit de edificios (assets/models/edificios/canoa, propio), con respaldo de primitivas.
   Diseño: docs/equipo/EP3_GDD.md, EP3_NARRATIVA.md y EP3_MISIONES.md. Ábrelo con index.html?pack=ep3 (o desde la portada).
   Lo que depende del canon de Kelvin (EP3_GDD.md §10: la navegante, la otra comunidad, la Voz, qué se intercambia, el gancho)
   es provisional y va marcado [KELVIN] en un comentario o en «nota», nunca en el texto que lee el jugador. El inglés va en
   content/ep3/en.js (pack.idioma, después del de cap1).
   Lo que flota o se hunde, el viento, las nubes, la corriente y lo que falla en la botadura son valores del juego (lo que el
   jugador ve), no datos del mundo real: la ciencia sigue «por verificar» (EP3_MISIONES.md §2–4). Todo el estado va en
   S.collected (se guarda solo). La canoa va sobre raíles (una polilínea por tramo): nadie se cae y nada se hunde. */
(function () {
  'use strict';
  // ---------- Mapa (valores medidos sobre el relieve analítico de abajo; ep3Test comprueba que cada punto de ruta tiene agua) ----------
  const MAR = -2.6, RIO_X = 20, BAHIA = { x: -4, z: 40, r: 26 };
  const IGUACA = { x: -12, z: -14 }, ABUELA = { x: -4, z: -9 }, PAPA = { x: 12, z: -3 }, MESA = { x: 11, z: 2 };
  const ASTILLERO = { x: 13.5, z: 8 }, BOTADURA = { x: 20, z: 8 }, MUELLE = { x: 6, z: 17 }, NAVEGANTE = { x: 7.6, z: 16.4 };
  const POSTES = { poste_muelle: { x: 4.4, z: 16.2 }, poste_punta: { x: -14, z: 13 } }, MIRADOR = { x: -20, z: -20 }, SEMILLA = { x: 15.6, z: -17 };
  const PRACTICA = { x: 15.5, z: -12.5 }, VECINA = { x: -32, z: 28.5 }, ALDEA = { x: -30, z: 30.5 };
  // Rutas de la canoa (x, z): río abajo para practicar; la bahía en tres tramos, con la elección de ruta y la del bajío
  const RUTAS = {
    rio: [[20, -13], [20, -6], [19.2, 2], [20, 11]],
    boca: [[6, 22], [3, 27], [0, 30]],
    atajo: [[0, 30], [-8, 35], [-16, 37]],
    costa: [[0, 30], [-6, 24], [-14, 23], [-19, 28], [-16, 37]],
    atras: [[-16, 37], [-13, 38], [-17, 41], [-23, 37], [-25, 33]],
    otro: [[-16, 37], [-20, 39], [-23, 37], [-25, 33]],
  };
  const SEMILLA_RUTA = [[20, -17], [20, -4]];

  // ---------- Misión 1 · «¿Qué flota?»: 6 materiales (valores del juego: lo que el jugador ve en la poza) ----------
  const MATERIALES = [
    // (cada texto entero, sin armar frases: así el inglés es un diccionario)
    { id: 'piedra', flota: false, color: '#8d8a82', z: -5, soltar: 'Soltar la piedra en la poza', frase: 'Suelto la piedra… ¡al fondo! Se hunde. Luego buceo a buscarla.', bucear: 'Bucear por la piedra', tengo: '¡La tengo! La piedra vuelve a la orilla.' },
    { id: 'tronco', flota: true, color: '#6b4a2a', z: -3, soltar: 'Soltar el tronco en la poza', frase: 'Suelto el tronco… ¡se queda arriba! Flota.' },
    { id: 'bambu', flota: true, color: '#c9b26a', z: -1, soltar: 'Soltar el bambú en la poza', frase: 'Suelto el bambú… ¡se queda arriba! Flota.' },
    { id: 'tabla', flota: true, color: '#a87c4f', z: 1, soltar: 'Soltar la tabla en la poza', frase: 'Suelto la tabla… ¡se queda arriba! Flota.' },
    { id: 'coco', flota: true, color: '#7a5230', z: 3, soltar: 'Soltar el coco en la poza', frase: 'Suelto el coco… ¡se queda arriba! Flota.' },
    { id: 'clavo', flota: false, color: '#6e6a66', z: 5, soltar: 'Soltar el clavo viejo en la poza', frase: 'Suelto el clavo viejo… ¡al fondo! Se hunde. Luego buceo a buscarlo.', bucear: 'Bucear por el clavo viejo', tengo: '¡Lo tengo! El clavo vuelve a la orilla.' },
  ];
  const BANCO_X = 15.2, AGUA_X = 18.6;
  const HUNDEN = MATERIALES.filter(m => !m.flota);
  const PREDICCIONES = [
    ['madera', 'Todo lo de madera flota; la piedra y el metal se hunden'],
    ['grande', 'Lo grande se hunde; lo pequeño flota'],
    ['todo', 'Todo flota si lo suelto con cuidado'],
  ];
  const DECISIONES = [
    { parte: 'casco', pregunta: '¿De qué haces el casco?', opciones: [['tronco', 'Tronco ahuecado: aguanta golpes, pesa y es lento'], ['bambu', 'Bambú atado: ligero y rápido'], ['tablas', 'Tablas: carga más']] },
    { parte: 'amarre', pregunta: '¿Con qué lo amarras?', opciones: [['fibra', 'La fibra trenzada del papá'], ['bejuco', 'Bejuco del monte']] },
    { parte: 'carga', pregunta: '¿Dónde va la carga?', opciones: [['centro', 'Al centro'], ['lado', 'A un lado, para que quepa más']] },
    { parte: 'batanga', pregunta: '¿Le pones batanga (un flotador al costado)?', opciones: [['si', 'Sí: más estable y más lenta'], ['no', 'No: más rápida']] },
  ];
  const ARREGLOS = {
    carga: 'Poner la carga al centro', amarre: 'Cambiar el bejuco por la fibra trenzada', juntas: 'Sellar las juntas con resina',
    batanga: 'Ponerle una batanga', peso: 'Vaciar más el tronco por dentro',
  };

  // ---------- Misión 2 · «Leer el agua»: observaciones y código de señales ----------
  const OBS = ['obs_poste_muelle', 'obs_poste_punta', 'obs_nubes', 'obs_semilla'];
  const ORDENES = [['izquierda', 'Izquierda'], ['derecha', 'Derecha'], ['para', 'Parar']];
  const SENALES = { bandera: 'Levantar la bandera', silbido: 'Un silbido', gesto: 'Un gesto con el ala', remo: 'Levantar el remo' };
  const DESC = { bandera: 'La navegante levanta la bandera.', silbido: 'La navegante silba.', gesto: 'La navegante hace un gesto con el ala.', remo: 'La navegante levanta el remo.' };
  const COD = { // una línea exacta por combinación (así el inglés es un diccionario y no una frase armada)
    bandera: { izquierda: 'La bandera es «izquierda».', derecha: 'La bandera es «derecha».', para: 'La bandera es «parar».' },
    silbido: { izquierda: 'El silbido es «izquierda».', derecha: 'El silbido es «derecha».', para: 'El silbido es «parar».' },
    gesto: { izquierda: 'El gesto es «izquierda».', derecha: 'El gesto es «derecha».', para: 'El gesto es «parar».' },
    remo: { izquierda: 'El remo en alto es «izquierda».', derecha: 'El remo en alto es «derecha».', para: 'El remo en alto es «parar».' },
  };
  const PREG_ORDEN = { izquierda: '¿Qué señal será «izquierda»?', derecha: '¿Qué señal será «derecha»?', para: '¿Qué señal será «parar»?' };

  const IMG = { Iguaca: 'assets/luma.png', Vittata: 'assets/vittata.png', Abuela: 'assets/agilis.png', 'Papá': 'assets/vittata.png', 'Guardián': 'assets/guardian.png',
    Navegante: 'assets/agilis.png', Vecina: 'assets/vittata.png' }; // [KELVIN: especie y render de la navegante y de la gente de la otra orilla]
  const di = (who, text) => ({ who, img: IMG[who], text });
  const Lu = t => di('Iguaca', t), Na = t => di('Navegante', t), Vi = t => di('Vittata', t);

  const DIALOGOS = { escenas: [
    { id: 'e_inicio', disparador: 'inicio:ep3', personaje: 'Vittata', emocion: 'pensando', nota: '[KELVIN: lo que dice la Voz y si la luz de la niebla se ve desde el mar]',
      lineas: ['El plano del bote está en la mesa de todos. La abuela escribió «que no se vire»; el papá, «amarre doble».', 'Y anoche la luz de la niebla parpadeó sobre el agua, más allá de la bahía. Pues vamos a contestar en persona.'] },
    { id: 'e_papa', disparador: 'interact:papa', personaje: 'Papá', emocion: 'pensando', lineas: ['¿El tronco más grande? ¿Y eso flota cargado?', 'Antes de cortar nada, probemos qué flota. Ahí está la poza.'] },
    { id: 'e_papa_v', disparador: 'interact:papa', personaje: 'Vittata', emocion: 'idea', lineas: ['Primero predigo, luego pruebo. Como con la casa.'] },
    { id: 'e_flota', disparador: 'evento:BoatLaunched', personaje: 'Abuela', emocion: 'feliz', lineas: ['¡Derechita! Ahora falta quién la lleve.'] },
    { id: 'e_flota_n', disparador: 'evento:BoatLaunched', personaje: 'Navegante', emocion: 'pensando', nota: '[KELVIN: especie, nombre y de dónde viene la navegante]', lineas: ['(En el muelle, una cotorra mira la canoa de brazos cruzados.)'] },
    { id: 'e_nav', disparador: 'evento:NavigatorMet', personaje: 'Navegante', emocion: 'pensando', lineas: ['Ese bote flota, sí. Pero hoy no sale.'] },
    { id: 'e_nav_v', disparador: 'evento:NavigatorMet', personaje: 'Vittata', emocion: 'triste', lineas: ['¡Pero si está listo! Lo hice yo.'] },
    { id: 'e_nav_g', disparador: 'evento:NavigatorMet', personaje: 'Guardián', emocion: 'idea', nota: '[KELVIN: si el Guardián va en el bote o despide desde el muelle]', lineas: ['Mija, tú hiciste el bote; ella conoce el agua.'] },
    { id: 'e_nav_n2', disparador: 'evento:NavigatorMet', personaje: 'Navegante', emocion: 'idea', lineas: ['Yo los manejo, no los hago. Mira tú misma: las cintas de los dos postes, las nubes desde el mirador y la corriente del río. Luego hablamos.'] },
    { id: 'e_fin', disparador: 'evento:Chapter3Completed', personaje: 'Navegante', emocion: 'feliz', lineas: ['Este bote ya no es tuyo ni mío. Es de las dos.'] },
    { id: 'e_fin_i', disparador: 'evento:Chapter3Completed', personaje: 'Iguaca', emocion: 'feliz', lineas: ['Probaste qué flota, leíste el agua y supiste cuándo dar el timón. Cuando vuelvas a Villa Raíz, ven y te hago unas preguntas. Sin prisa y sin nota.'] },
  ] };

  AVE.registerPack({
    id: 'ep3',
    archivos: ['lecciones.js'], // la lección del Aula (window.AV_LECCIONES_EP3); boot.js la carga después de este archivo
    idioma: ['content/cap1/en.js', 'content/ep3/en.js'], // inglés: el diccionario común y el del episodio (solo si el idioma es EN)
    meta: {
      titulo: 'Más allá de la bahía', capitulo: 3, almacen: 'ep3',
      hud: { capitulo: 'Capítulo 3 · Villa Raíz', titulo: 'Más allá de la bahía', portada: 'Capítulo 3 · Más allá de la bahía',
        etiqueta: 'Capítulo 3 · Más allá de la bahía', fin: '¡Llegamos a la otra orilla!',
        nota: 'Capítulo 3: construye el primer bote y cruza la bahía. No uses tu nombre real.', inventario: {} },
    },
    jugador: { nombre: 'Vittata', sprite: 'assets/vittata.png', especie: 'vittata', altura: 1.75, aparicion: { x: -6, z: -10 }, camara: 0.6 },
    guardado: { version: 1, claves: ['edu'], estado: () => ({ edu: { inicio: null, fin: null, fichas: [], formativa: {}, registro: null } }) },
    aula: { clave: 'amazonaverse.aula.ep3', estado: 'edu', archivo: 'amazonaverse_ep3', lecciones: () => window.AV_LECCIONES_EP3 },
    // Criadero: el mismo del cap. 1 (la cría sigue a Vittata y va en el bote); el nido entra en el mundo con la segunda botadura.
    // Ninguna cápsula se compra. obtener.ep3 en content/comun/huevos.js queda como pedido aparte (EP3_MISIONES.md §7).
    criadero: { desde: 'BoatLaunched', almacen: 'amazonaverse' },

    mundo: {
      tamano: 46, segmentos: 92,
      exposicion: 0.74,
      cielo: { color: '#c3e2f0', cenit: '#2a7fd4', sol: '#fff1cf', niebla: [40, 1000], nieblaAltura: [8, 70] },
      luces: { cielo: '#cfe6ff', suelo: '#45602e', hemi: 0.66, sol: '#fff0d6', solInt: 2.0, solPos: [-42, 70, 46] },
      post: { saturacion: 1.08, contraste: 1.04, bloom: 0.2, vineta: 0.16 },
      mar: { laguna: '#86e3cf', somero: '#1fa9ad', hondo: '#0b4f86' },
      lugares: { inicio: { x: -6, z: -10, r: 6 }, astillero: { x: 12, z: 2, r: 4 }, mirador: { x: MIRADOR.x, z: MIRADOR.z, r: 2.5 }, aldea: { x: -32, z: 29, r: 4 } },
      terreno: {
        ondas: [{ fn: 'sin', x: 0.09, amp: 0.25 }, { fn: 'cos', z: 0.07, amp: 0.2 }],
        relieves: [
          { tipo: 'colina', x: BAHIA.x, z: BAHIA.z, alto: -10, ancho: 420 }, // la bahía: honda en el centro, orilla a ~24 m
          { tipo: 'cauce', x: RIO_X, mitad: 6, pendiente: 0.7 }, // el río que baja a la bahía
          { tipo: 'colina', x: RIO_X, z: 0, alto: -2.5, ancho: 10 }, // la poza de pruebas
          { tipo: 'colina', x: MIRADOR.x, z: MIRADOR.z, alto: 6, ancho: 120 }, // el mirador
          { tipo: 'colina', x: -37, z: 28, alto: 3, ancho: 50 }, // la loma de la otra orilla
        ],
        planos: ['inicio', 'astillero', 'mirador', 'aldea'],
      },
      rio: { x: RIO_X },
      agua: { x: RIO_X, ancho: 8, color: '#5fe3d6', nivel: { x: RIO_X, z: -24, sobre: 1.6 } },
      arboles: { cantidad: 46, semilla: 11, copaCada: 2, margenRio: 6, copaColor: '#2f7d43',
        evitar: [BAHIA, IGUACA, ABUELA, PAPA, MESA, ASTILLERO, MUELLE, NAVEGANTE, SEMILLA, PRACTICA, VECINA, ALDEA, MIRADOR, POSTES.poste_muelle, POSTES.poste_punta,
          { x: -12, z: 12, r: 3 }, { x: -33, z: 26, r: 3 }, { x: -30, z: 25, r: 3 }, { x: 13, z: 12, r: 3 },
          { x: 11.2, z: 6.1, r: 2.6 }, { x: -31.6, z: 34.6, r: 2.6 }, { x: -35, z: 30, r: 2.4 }, { x: -34, z: 33.5, r: 2.4 }] }, // ramada, tendedero y casas
      oceano: { color: '#0b4f86', y: MAR },
    },
    npcs: [
      { id: 'iguaca', nombre: 'Iguaca', sprite: IMG.Iguaca, x: IGUACA.x, z: IGUACA.z, escala: 2.2, flota: true },
      { id: 'abuela', nombre: 'Abuela', sprite: IMG.Abuela, x: ABUELA.x, z: ABUELA.z, escala: 1.8 },
      { id: 'papa', nombre: 'Papá', sprite: IMG['Papá'], x: PAPA.x, z: PAPA.z, escala: 1.8 },
      { id: 'navegante', nombre: 'Navegante', sprite: IMG.Navegante, x: NAVEGANTE.x, z: NAVEGANTE.z, escala: 1.8 },
      { id: 'vecina', nombre: 'Vecina', sprite: IMG.Vecina, x: VECINA.x, z: VECINA.z, escala: 1.8 }, // [KELVIN: quién vive en la otra orilla]
    ],
    objetos: {}, recursos: [],

    historia: {
      pasos: [
        { id: 'hablar', texto: 'Baja al astillero y habla con el papá', guia: G => G.misiones.at('papa') },
        { id: 'predecir', texto: 'Predice qué flota en la mesa del plano', guia: G => G.misiones.at('mesa') },
        { id: 'probar', texto: 'Suelta los 6 materiales en la poza', progreso: S => ` (${MATERIALES.filter(m => S.collected.includes('probado_' + m.id)).length}/6)`,
          hasta: { evento: 'MaterialsTested' }, guia: G => { const S = G.S, m = MATERIALES.find(x => !S.collected.includes('probado_' + x.id)); if (m) return G.misiones.at('mat_' + m.id); const h = HUNDEN.find(x => !S.collected.includes('recuperado_' + x.id)); return G.misiones.at(h ? 'fondo_' + h.id : 'mesa'); } },
        { id: 'construir', texto: 'Arma el bote en el astillero', hasta: { evento: 'BoatBuilt' }, guia: G => G.misiones.at('astillero') },
        { id: 'botar1', texto: 'Bota la canoa en el río', hasta: { evento: 'LaunchTested' }, guia: G => G.misiones.at('astillero') },
        { id: 'ajustar', texto: 'Cambia solo la parte que falló', hasta: { evento: 'BoatImproved' }, guia: G => G.misiones.at('astillero') },
        { id: 'botar2', texto: 'Bótala otra vez', hasta: { evento: 'BoatLaunched' }, guia: G => G.misiones.at('astillero') },
        { id: 'navegante', texto: 'Habla con la navegante en el muelle', hasta: { evento: 'NavigatorMet' }, guia: G => G.misiones.at('navegante') },
        { id: 'leer', texto: 'Lee el agua: los 2 postes, las nubes y la corriente', progreso: S => ` (${OBS.filter(k => S.collected.includes(k)).length}/4)`,
          hasta: { recogido: OBS }, guia: G => { const k = OBS.find(x => !G.S.collected.includes(x)); return G.misiones.at({ obs_poste_muelle: 'poste_muelle', obs_poste_punta: 'poste_punta', obs_nubes: 'mirador', obs_semilla: 'semilla' }[k] || 'navegante'); } },
        { id: 'senales', texto: 'Acuerda 3 señales con la navegante', hasta: { evento: 'SignalsAgreed' }, guia: G => G.misiones.at('navegante') },
        { id: 'practica', texto: 'Practica río abajo en la canoa', hasta: { evento: 'PracticeDone' }, guia: G => (G.ep3 && G.ep3.destino()) || G.misiones.at('practica') },
        { id: 'timon', texto: 'Decide quién lleva el timón', hasta: { evento: 'HelmChosen' }, guia: G => G.misiones.at('navegante') },
        { id: 'travesia', texto: 'Cruza la bahía desde el muelle', hasta: { evento: 'BayCrossed' }, guia: G => (G.ep3 && G.ep3.destino()) || G.misiones.at('muelle') },
        { id: 'llegada', texto: 'Saluda a la gente de la otra orilla', guia: G => G.misiones.at('vecina') },
      ],
      fin: () => 'Probaste qué flota, construiste la canoa, leíste el agua con la navegante y cruzaste la bahía. Iguaca tiene unas preguntas para ti, cuando quieras.',
    },
    misiones: [
      { id: 'flota', titulo: '¿Qué flota?', hud: 'Probar, construir y mejorar',
        pasos: [{ texto: 'Prueba los 6 materiales', hasta: { evento: 'MaterialsTested' } }, { texto: 'Primera botadura', hasta: { evento: 'LaunchTested' } },
          { texto: 'Mejora lo que falló', hasta: { evento: 'BoatImproved' } }, { texto: 'Segunda botadura', hasta: { evento: 'BoatLaunched' } }],
        recompensa: { hito: 'flota' } },
      { id: 'agua', titulo: 'Leer el agua', hud: 'Viento, nubes, corriente y señales',
        pasos: [{ texto: 'Observa el viento, las nubes y la corriente', hasta: { recogido: OBS } }, { texto: 'Acuerda las señales', hasta: { evento: 'SignalsAgreed' } },
          { texto: 'Practica en el río', hasta: { evento: 'PracticeDone' } }, { texto: 'Decide quién lleva el timón', hasta: { evento: 'HelmChosen' } }],
        recompensa: { hito: 'agua' } },
      { id: 'bahia', titulo: 'Más allá de la bahía', hud: 'Remar, seguir señales y hablar',
        pasos: [{ texto: 'Cruza la bahía', hasta: { evento: 'BayCrossed' } }, { texto: 'Llega a la otra orilla', hasta: { evento: 'CommunityReached' } },
          { texto: 'Intercambio', hasta: { evento: 'Chapter3Completed' } }],
        recompensa: { hito: 'bahia' } },
    ],
    // Diario del ep. 3 (§7): 6 hallazgos, 3 del agua y 3 de la gente de mar. Lo que el niño lee aquí describe solo lo que ve; el dato
    // real de cada uno está en lecciones.js (diario, mismo id) y va «por verificar»: no sale al Diario hasta tener fuente.
    diario: {
      titulo: 'Carta de la bahía', corto: 'Carta', boton: 'Carta',
      categorias: { agua: { nombre: 'Agua y viento', desconocido: 'Algo junto al agua', sonido: 'pickup', rafaga: 'feathers' },
        mar: { nombre: 'Gente de mar', desconocido: 'Algo de pescadores', sonido: 'pickup', rafaga: 'gold' } },
      entradas: [
        { id: 'flota_hunde', cat: 'agua', nombre: 'Corcho y piedra', x: 15.5, z: -8.5, texto: 'Un corcho arriba y una piedrita abajo, en el mismo charco.',
          modelo: (add) => { add(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 14), '#5a8aaa', 0, 0.02, 0); add(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 8), '#c9a86a', 0.15, 0.08, 0); } },
        { id: 'brisa_mar', cat: 'agua', nombre: 'Cinta en la baranda', x: 3.6, z: 14.4, texto: 'Una cinta atada a la baranda del muelle, siempre señalando hacia el monte.',
          modelo: (add) => { add(new THREE.CylinderGeometry(0.05, 0.06, 1.1, 6), '#8a6a3a', 0, 0.55, 0); add(new THREE.PlaneGeometry(0.5, 0.16), '#3d8fb0', 0, 1, -0.28); } },
        { id: 'semilla_viajera', cat: 'agua', nombre: 'Coco en la arena', x: -12, z: 12, texto: 'Un coco con un brote verde, varado en la orilla. ¿De dónde vino?',
          modelo: (add) => { add(new THREE.SphereGeometry(0.22, 12, 10), '#7a5230', 0, 0.2, 0); add(new THREE.ConeGeometry(0.06, 0.4, 6), '#4f9a4a', 0, 0.5, 0); } },
        { id: 'canoa_taina', cat: 'mar', nombre: 'Canoa vieja', x: -33, z: 26, texto: 'Una canoa vieja de un solo tronco, boca abajo bajo un techito.',
          modelo: (add) => { const m = add(new THREE.CylinderGeometry(0.35, 0.35, 2.4, 10, 1, false, 0, Math.PI), '#5a3d22', 0, 0.3, 0); m.rotation.z = Math.PI / 2; } },
        { id: 'cayuco', cat: 'mar', nombre: 'Cayuco en la orilla', x: 13, z: 12, texto: 'Un bote pequeñito de pesca, hecho de una sola pieza.',
          modelo: (add) => { const m = add(new THREE.CylinderGeometry(0.28, 0.28, 1.6, 10, 1, false, Math.PI, Math.PI), '#8a5a2a', 0, 0.28, 0); m.rotation.z = Math.PI / 2; } },
        { id: 'nasa', cat: 'mar', nombre: 'Nasa tejida', x: -30, z: 25, texto: 'Una cesta tejida con una boca que entra hacia adentro.',
          modelo: (add) => { const m = add(new THREE.ConeGeometry(0.35, 0.8, 10, 1, true), '#b8955a', 0, 0.35, 0); m.material.side = THREE.DoubleSide; m.rotation.z = Math.PI / 2; } },
      ],
      hitos: [{ id: 'cuaderno', todos: true }],
    },
    ropa: [
      { clave: 'casco:marinero', hito: 'flota', nombre: 'Casco marinero', pista: 'una canoa que flota', viste: { slot: 'head', id: 'casco', color: '#f4f4f0', style: 'marinero' } },
      { clave: 'mano:bandera', hito: 'agua', nombre: 'Bandera de señales', pista: 'leer el agua', viste: { slot: 'hand', id: 'mano', color: '#d6403a', style: 'bandera' } },
      { clave: 'sombrero2:pescador', hito: 'bahia', nombre: 'Sombrero de pescador', pista: 'cruzar la bahía', viste: { slot: 'head', id: 'sombrero2', color: '#8a6a3a', style: 'pescador' } },
      { clave: 'mano:mapa', hito: 'bahia', nombre: 'Carta de la bahía', viste: { slot: 'hand', id: 'mano', color: '#c9a227', style: 'mapa' } },
    ],
    eventos: { defs: {
      PlayerCharacterCreated: { type: 'CharacterCreated', loc: 'villa', chars: ['player'], scene: 'portrait' },
      BlueprintShared: { type: 'QuestAccepted', loc: 'villa', chars: ['vittata', 'papa', 'abuela'], scene: 'dialogue' },
      MaterialsTested: { type: 'LocationDiscovered', loc: 'villa', chars: ['vittata'], scene: null },
      BoatBuilt: { type: 'BuildingConstructed', loc: 'villa', chars: ['vittata', 'papa'], scene: null },
      LaunchTested: { type: 'StormTest', loc: 'villa', chars: ['vittata'], scene: 'action' },
      BoatImproved: { type: 'DesignImproved', loc: 'villa', chars: ['vittata'], scene: null },
      BoatLaunched: { type: 'BuildingRepaired', loc: 'villa', chars: ['vittata', 'papa', 'abuela'], scene: 'final' },
      NavigatorMet: { type: 'CharacterMet', loc: 'villa', chars: ['vittata', 'navegante'], scene: 'dialogue' },
      SignalsAgreed: { type: 'DialogueChoiceMade', loc: 'villa', chars: ['vittata', 'navegante'], scene: 'dialogue' },
      PracticeDone: { type: 'LocationDiscovered', loc: 'rio', chars: ['vittata', 'navegante'], scene: 'action' },
      HelmChosen: { type: 'DialogueChoiceMade', loc: 'villa', chars: ['vittata', 'navegante'], scene: 'dialogue' },
      BayCrossed: { type: 'LocationDiscovered', loc: 'bahia', chars: ['vittata', 'navegante'], scene: 'action' },
      CommunityReached: { type: 'CharacterMet', loc: 'orilla', chars: ['vittata', 'navegante', 'vecina'], scene: 'dialogue' },
      Chapter3Completed: { type: 'ChapterCompleted', loc: 'orilla', chars: ['vittata', 'navegante', 'vecina'], scene: 'final' },
    } },
    dialogos: { datos: () => DIALOGOS, retratos: IMG, retratoDefecto: 'assets/vittata.png' },
    comic: {
      marca: 'MÁS ALLÁ DE LA BAHÍA', tituloDefecto: 'Mi capítulo 3', archivo: 'ep3-mi-comic', pdfTitulo: 'Más allá de la bahía',
      capturas: ['bote', 'senales', 'llegada'], portadas: {},
      vinetas: [
        { id: 'intro', img: 'portrait', needs: 'PlayerCharacterCreated', texto: S => `Soy ${S.profile.name}. El plano del bote estaba en la mesa de todos.` },
        { id: 'bote', img: 'bote', needs: 'BoatLaunched', texto: 'La primera botadura falló en una parte. La cambié… ¡y flotó!' },
        { id: 'senales', img: 'senales', needs: 'HelmChosen', texto: S => S.collected.includes('timon_vittata') ? 'Acordamos señales. Yo llevé el timón y ella me cantó el agua.' : 'Acordamos señales y le di el timón a quien sabe leer el agua.' },
        { id: 'llegada', img: 'llegada', needs: 'Chapter3Completed', texto: 'Cruzamos la bahía. En la otra orilla pregunté antes de contar.' },
      ],
    },

    inicio(G) { G.eventos.log('BlueprintShared'); G.dialogo.say(G.dialogo.L('inicio:ep3'), () => G.ui.toast('Baja al astillero y habla con el papá', 3000)); },

    preparar(G) {
      const S = G.S, H = G.terreno.height, L = G.dialogo.L, scene = G.renderer.scene;
      const tiene = k => S.collected.includes(k), poner = k => { if (!tiene(k)) S.collected.push(k); };
      const valor = (pref, ops) => ops.find(o => tiene(pref + o));
      const elegir = (who, text, opciones, done) => G.dialogo.choose(di(who, text), opciones, done);
      const mat = c => new THREE.MeshLambertMaterial({ color: c });
      const nivelRio = () => { const y = G.agua.levelAt(RIO_X, 0); return isFinite(y) ? y : MAR; };
      const quieto = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
      const probados = () => MATERIALES.filter(m => tiene('probado_' + m.id));
      const casco = () => valor('dec_casco_', ['tronco', 'bambu', 'tablas']);
      const senalDe = orden => valor('sen_' + orden + '_', ['remo', 'bandera', 'silbido', 'gesto']); // el remo primero: es el cambio del chubasco
      const timon = () => valor('timon_', ['vittata', 'navegante']);

      // ---------- Aula del episodio (§5 y §6): «Iguaca te pregunta» y el registro local del Modo Maestro ----------
      const AU = G.aula, LEC = (AU.activo && AU.LEC) || {};
      const E = () => S.edu || (S.edu = { inicio: null, fin: null, fichas: [], formativa: {}, registro: null });
      const idsFormativa = () => ((LEC.formativa && LEC.formativa.seleccion && LEC.formativa.seleccion[AU.aj.grado]) || []).filter(id => AU.preguntaPublicable(AU.pregunta(id)));
      const todasPreguntadas = () => idsFormativa().every(id => (E().formativa || {})[id]);
      function objetivos() {
        const f = E().formativa || {}, ok = id => f[id] && f[id] <= 2, pre = id => f[id] != null, had = ev => G.eventos.had(ev);
        const res = [];
        if (probados().length === 6 && had('MaterialsTested') && (!pre('q1') || ok('q1')) && (!pre('q2') || ok('q2'))) res.push('E1');
        if (had('BoatImproved') && had('BoatLaunched') && (!pre('q3') || ok('q3'))) res.push('E2');
        if (had('SignalsAgreed') && tiene('cambio_silbido') && (!pre('q4') || ok('q4'))) res.push('E3');
        if (OBS.every(tiene) && ok('q5') && ok('q6')) res.push('E4');
        return res;
      }
      function registrar() {
        const e = E();
        if (!AU.activo || e.inicio == null) return;
        const pregs = {}; for (const id of idsFormativa()) pregs[id] = (e.formativa || {})[id] || '';
        const f = tiene('dec_casco') ? falla() : null;
        AU.registrar({
          misiones_completadas: ['flota', 'agua', 'bahia'].filter(m => S.missions[m]),
          materiales_probados: probados().length, casco: casco() || '',
          falla_botadura: f && G.eventos.had('LaunchTested') ? f.parte : '', mejora_hecha: G.eventos.had('BoatImproved'),
          codigo_senales: ORDENES.map(o => o[0] + ':' + (senalDe(o[0]) || '')).join(' '), senal_cambiada: tiene('cambio_silbido'),
          timon: timon() || '', ruta: valor('ruta_', ['atajo', 'costa']) || '', bajio: valor('bajio_', ['atras', 'otro']) || '',
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
          G.dialogo.say([Lu('¡Eso es pensar como gente de mar! Probar, mirar el agua y confiar en quien sabe.')]);
        } });
      }
      if (AU.activo && AU.pestana) AU.pestana({ id: 'ep3', titulo: { es: 'Progreso ep. 3', en: 'Ep. 3 progress' }, html: () => {
        const esc = AU.esc, t = AU.t, P = AU.partidas, yn = v => (v === true ? t({ es: 'sí', en: 'yes' }) : v === false ? t({ es: 'no', en: 'no' }) : '');
        if (!P.length) return `<p class="note">${esc(t({ es: 'Todavía no hay partidas en este dispositivo.', en: 'No sessions on this device yet.' }))}</p>`;
        const C = t({ es: ['Fecha', 'Estación', 'Misiones', 'Materiales', 'Casco', 'Falló', 'Mejoró', 'Señal cambiada', 'Timón', 'Ruta', 'Preguntas', 'Objetivos', 'Min'], en: ['Date', 'Station', 'Missions', 'Materials', 'Hull', 'Failed', 'Improved', 'Signal changed', 'Helm', 'Route', 'Questions', 'Objectives', 'Min'] });
        const filas = P.slice().reverse().map(p => `<tr><td>${esc(p.fecha)}</td><td>${esc(p.estacion || AU.aj.estacion)}</td><td>${(p.misiones_completadas || []).length}/3</td><td>${p.materiales_probados != null ? p.materiales_probados + '/6' : ''}</td><td>${esc(p.casco || '')}</td><td>${esc(p.falla_botadura || '')}</td><td>${yn(p.mejora_hecha)}</td><td>${yn(p.senal_cambiada)}</td><td>${esc(p.timon || '')}</td><td>${esc(p.ruta || '')}</td><td>${esc(p.preguntas ? Object.entries(p.preguntas).filter(([, v]) => v).map(([k, v]) => k + ':' + v).join(' ') : '')}</td><td>${esc((p.objetivos_logrados || []).join(' '))}</td><td>${p.minutos_mision != null ? p.minutos_mision : ''}</td></tr>`).join('');
        return `<p class="note">${esc(t({ es: 'Solo lo guardado en este dispositivo. No se envía nada por la red.', en: 'Only what is stored on this device. Nothing is sent over the network.' }))}</p><div class="maestro-scroll"><table class="maestro-tabla"><thead><tr>${C.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${filas}</tbody></table></div>`;
      } });

      // ---------- La canoa: el modelo del kit (con respaldo de primitivas), sus extras y dónde está según la partida ----------
      const canoa = new THREE.Group(); canoa.name = 'ep3_canoa'; scene.add(canoa);
      const cuerpo = new THREE.Group(); canoa.add(cuerpo);
      const extras = new THREE.Group(); canoa.add(extras);
      const LARGO = 4.2;
      let modelo = null;
      const respaldo = new THREE.Group();
      { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, LARGO * 0.8, 12, 1, false, Math.PI / 2, Math.PI), mat('#8a5a2a')); m.rotation.x = Math.PI / 2; m.rotation.z = Math.PI; m.position.y = 0.45; respaldo.add(m);
        for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.ConeGeometry(0.45, LARGO * 0.12, 12, 1, false, 0, Math.PI), mat('#8a5a2a')); p.rotation.x = s * Math.PI / 2; p.position.set(0, 0.45, s * LARGO * 0.46); respaldo.add(p); } }
      cuerpo.add(respaldo);
      const KIT = 'assets/models/edificios/';
      G.assets.loadGLB(KIT + 'canoa.glb', { b64: () => (window.AV_EDIFICIOS_B64 || {}).canoa, script: 'assets/models/edificios/canoa_glb.js', base: KIT, error: 'canoa no disponible' }).then(g => {
        const m = g.scene || (g.scenes && g.scenes[0]); if (!m) return;
        const b = new THREE.Box3().setFromObject(m), sz = b.getSize(new THREE.Vector3()), largo = Math.max(sz.x, sz.z) || 1, k = LARGO / largo;
        m.scale.setScalar(k); if (sz.x > sz.z) m.rotation.y = Math.PI / 2;
        const c = b.getCenter(new THREE.Vector3());
        m.position.set(sz.x > sz.z ? c.z * k : -c.x * k, -b.min.y * k, sz.x > sz.z ? -c.x * k : -c.z * k);
        m.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.castShadow = true; } });
        modelo = m; cuerpo.remove(respaldo); cuerpo.add(m); dibujarCanoa();
        // Las canoas de la otra orilla (allí ya saben navegar): el mismo modelo, varadas en la arena
        for (const [x, z, ry] of [[-29.5, 27.4, 0.5], [-32, 26.2, 1.0]]) { const c = m.clone(); c.traverse(o => { if (o.isMesh) o.material = o.material.clone(); }); c.position.add(new THREE.Vector3(x, H(x, z) - 0.05, z)); c.rotation.y += ry; scene.add(c); }
      }).catch(() => { /* sin el modelo: queda la canoa de primitivas */ });
      const TINTE = { tronco: '#a07850', bambu: '#e0cf8a', tablas: '#c49a6c' };

      function falla() {
        const c = casco() || 'tronco', bat = tiene('dec_batanga_si');
        if (tiene('dec_carga_lado')) return { parte: 'carga', que: 'Con la carga a un lado, la canoa se inclina y casi se vira.' };
        if (c === 'bambu' && tiene('dec_amarre_bejuco')) return { parte: 'amarre', que: 'El bejuco se afloja y se abre una junta del bambú.' };
        if (c === 'tablas') return { parte: 'juntas', que: 'Entra agua por las juntas de las tablas.' };
        if (c === 'tronco') return bat ? { parte: 'peso', que: 'El tronco pesa tanto que va muy hundido y entra agua por la borda.' } : { parte: 'batanga', que: 'El tronco es redondo: con la carga se ladea hacia un lado.' };
        return bat ? { parte: 'juntas', que: 'Una caña de bambú está rajada y entra un hilito de agua.' } : { parte: 'batanga', que: 'El bambú es tan ligero que, con la carga, se ladea.' };
      }
      const arreglada = () => tiene('dec_casco') && tiene('mejora_' + falla().parte);
      function dibujarCanoa() {
        while (extras.children.length) { const m = extras.children.pop(); m.geometry.dispose(); m.material.dispose(); }
        canoa.visible = tiene('dec_casco') || viaje != null;
        if (!canoa.visible) return;
        const c = casco() || 'tronco', f = falla(), mal = G.eventos.had('LaunchTested') && !arreglada();
        const tinte = new THREE.Color(TINTE[c]);
        if (modelo) modelo.traverse(o => { if (o.isMesh && o.material.color) { if (!o.userData.c0) o.userData.c0 = o.material.color.clone(); o.material.color.copy(o.userData.c0).multiply(tinte); } });
        else respaldo.children.forEach(m => m.material.color.set(TINTE[c]).multiplyScalar(0.8));
        const caja = (w, h, d, col, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(col)); m.position.set(x, y, z); extras.add(m); return m; };
        const lado = tiene('dec_carga_lado') && !tiene('mejora_carga');
        caja(0.5, 0.35, 0.6, mal && f.parte === 'carga' ? '#d6403a' : '#c9a86a', lado ? 0.28 : 0, 0.7, 0.4); // la carga (fibra, semillas y herramientas)
        if (tiene('dec_batanga_si') || tiene('mejora_batanga')) {
          const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, LARGO * 0.6, 8), mat('#8a6a3a')); fl.rotation.x = Math.PI / 2; fl.position.set(-1.3, 0.25, 0); extras.add(fl);
          for (const z of [-0.7, 0.7]) caja(1.4, 0.06, 0.08, '#6b4a2a', -0.65, 0.75, z);
        }
        if (mal && f.parte !== 'carga') caja(0.12, 0.4, 0.12, '#d6403a', 0.45, 0.95, -0.6); // la marca roja de la parte que falló
        // Inclinación y calado según lo que falló (sin balanceo con prefers-reduced-motion)
        cuerpo.rotation.z = mal && (f.parte === 'carga' || f.parte === 'batanga') ? 0.28 : 0;
        cuerpo.position.y = mal && (f.parte === 'peso' || f.parte === 'juntas' || f.parte === 'amarre') ? -0.25 : 0;
        if (viaje) return;
        // Dónde está: en el astillero, en el río (botada), en el muelle (tras la práctica) o en la otra orilla
        let p = ASTILLERO, y = H(ASTILLERO.x, ASTILLERO.z), ry = 0;
        if (tiene('llegada')) { p = { x: -25, z: 33 }; y = MAR; ry = 1.1; }
        else if (G.eventos.had('PracticeDone')) { p = { x: 6, z: 21.5 }; y = MAR; }
        else if (G.eventos.had('SignalsAgreed')) { p = { x: RIO_X, z: -13 }; y = nivelRio(); }
        else if (G.eventos.had('LaunchTested')) { p = BOTADURA; y = nivelRio(); }
        canoa.position.set(p.x, y - 0.3, p.z); canoa.rotation.set(0, ry, 0);
      }

      // ---------- Navegar sobre raíles: la canoa sigue la polilínea; Vittata va posada en ella (una percha que se mueve) ----------
      let viaje = null, lastOk = { x: S.pos.x, z: S.pos.z }, avisoOrilla = 0;
      let rumbo = null; // adónde va la salida en canoa, también entre tramos (la flecha de guía apunta ahí y no al muelle)
      // Encuadre de los momentos clave: la cámara detrás de Vittata, un poco de lado, mirando a (x, z)
      const encuadrar = (x, z) => { G.camara.yaw = Math.atan2(S.pos.x - x, S.pos.z - z) + 0.4; G.camara.manual(); };
      const percha = G.fisica.addPercha({ x: 0, z: 0, y: -99, r: 0.9, when: () => !!viaje });
      const nav = () => G.actores.npc('navegante');
      function ponerNpc(n, x, z, y) { if (!n) return; n.def.x = x; n.def.z = z; n.sp.position.set(x, (y != null ? y : H(x, z)) + 1.0, z); n.sh.position.set(x, (y != null ? y : H(x, z)) + 0.03, z); n.collider.x = x; n.collider.z = z; }
      function colocarNavegante() {
        const n = nav(); if (!n) return;
        n.setVisible(G.eventos.had('BoatLaunched'));
        if (tiene('llegada')) ponerNpc(n, ALDEA.x + 1.4, ALDEA.z - 0.8); else ponerNpc(n, NAVEGANTE.x, NAVEGANTE.z);
      }
      // navegar(ruta, y, hecho, { paradas: { índice de punto: fn(seguir) } }): la canoa avanza y se detiene en cada parada hasta que se llama seguir()
      function navegar(pts, y, hecho, o) {
        o = o || {};
        if (G.fisica.MOVE.flying) G.fisica.endFlight();
        viaje = { pts, y, hecho, seg: 0, t: 0, vel: { tronco: 3, bambu: 4.6, tablas: 3.6 }[casco()] || 3.6, paradas: o.paradas || {}, espera: null, esperaT: 0, hechas: {} };
        const n = nav(); if (n) { n.setVisible(true); n.collider.r = 0; }
        dibujarCanoa(); moverViaje(0);
      }
      function moverViaje(dt) {
        const v = viaje, a = v.pts[v.seg], b = v.pts[Math.min(v.seg + 1, v.pts.length - 1)];
        const largo = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        if (!v.espera && dt) {
          v.t += dt * v.vel / largo;
          if (v.t >= 1) {
            v.t = 0; v.seg++;
            const fin = v.seg >= v.pts.length - 1;
            if (v.paradas[v.seg] && !v.hechas[v.seg]) { v.hechas[v.seg] = true; v.espera = v.paradas[v.seg]; v.esperaT = 0; if (fin) v.seg = v.pts.length - 1; lanzarEspera(); }
            else if (fin) { terminarViaje(); return; }
          }
        }
        const s = Math.min(v.seg, v.pts.length - 2), t = v.seg >= v.pts.length - 1 ? 1 : v.t, p0 = v.pts[s], p1 = v.pts[s + 1];
        const x = p0[0] + (p1[0] - p0[0]) * t, z = p0[1] + (p1[1] - p0[1]) * t, ola = quieto ? 0 : Math.sin(S.clock * 2.2) * 0.05;
        canoa.position.set(x, v.y - 0.3 + ola, z); canoa.rotation.set(0, Math.atan2(p1[0] - p0[0], p1[1] - p0[1]), quieto ? 0 : Math.sin(S.clock * 1.7) * 0.03);
        const fx = Math.sin(canoa.rotation.y), fz = Math.cos(canoa.rotation.y);
        percha.x = x + fx * 0.5; percha.z = z + fz * 0.5; percha.y = v.y + 0.35 + ola;
        S.pos.x = percha.x; S.pos.z = percha.z; S.pos.y = percha.y; S.vy = 0; G.fisica.MOVE.vx = G.fisica.MOVE.vz = 0; S.facing = { x: fx, z: fz };
        ponerNpc(nav(), x - fx * 1.2, z - fz * 1.2, v.y + 0.1 + ola);
        if (dt) { const cam = G.camara, d = Math.atan2(Math.sin(Math.atan2(-fx, -fz) - cam.yaw), Math.cos(Math.atan2(-fx, -fz) - cam.yaw)); cam.yaw += d * Math.min(1, dt * 1.6); } // la cámara se pone detrás de la canoa
        if (dt && !quieto && Math.random() < dt * 2 && G.agua.ripple) G.agua.ripple(x - fx * 2, v.y, z - fz * 2);
      }
      function lanzarEspera() { const v = viaje, f = v.espera; v.esperaT = 0; f(() => { if (viaje === v) { v.espera = null; if (v.seg >= v.pts.length - 1) terminarViaje(); } }); }
      function terminarViaje() {
        const v = viaje; viaje = null;
        const n = nav(); if (n) n.collider.r = 0.6;
        dibujarCanoa(); colocarNavegante();
        v.hecho();
      }
      G.on('update', (dt) => {
        if (viaje) {
          // Si una tarjeta de la travesía se cerró con Escape, vuelve a salir: la canoa no se queda parada sin pregunta
          if (viaje.espera && !G.ui.busy()) { viaje.esperaT += dt; if (viaje.esperaT > 0.6) lanzarEspera(); }
          if (viaje) moverViaje(G.ui.busy() || viaje.espera ? 0 : dt);
          return;
        }
        // La bahía es honda: a pie no se entra (volando sí se cruza). Fuera del río, de vuelta a la orilla con un aviso
        const P = S.pos;
        if (P.y < MAR - 0.3 && Math.abs(P.x - RIO_X) > 4 && H(P.x, P.z) < MAR - 0.3) {
          P.x = lastOk.x; P.z = lastOk.z; P.y = Math.max(P.y, H(P.x, P.z)); S.vy = 0;
          if (S.clock - avisoOrilla > 4) { avisoOrilla = S.clock; G.ui.toast('La bahía es honda: se cruza en canoa (o volando).', 2600); }
        } else lastOk = { x: P.x, z: P.z };
      }, 20);

      // ---------- Escenario: mesa del plano, astillero, muelle, postes, rocas, bajío y la otra orilla ----------
      const pieza = (geo, col, x, y, z) => { const m = new THREE.Mesh(geo, mat(col)); m.position.set(x, y, z); scene.add(m); return m; };
      pieza(new THREE.BoxGeometry(1.8, 0.8, 1.1), '#8a6a3a', MESA.x, H(MESA.x, MESA.z) + 0.4, MESA.z);
      pieza(new THREE.PlaneGeometry(1.3, 0.8), '#f1e6c8', MESA.x, H(MESA.x, MESA.z) + 0.81, MESA.z).rotation.x = -Math.PI / 2; // el plano del bote
      for (const [dx, dz] of [[-1.2, -0.6], [1.2, -0.6]]) pieza(new THREE.BoxGeometry(0.25, 0.8, 0.25), '#6b4a2a', ASTILLERO.x + dx, H(ASTILLERO.x, ASTILLERO.z) + 0.4, ASTILLERO.z + dz);
      // El muelle: tablones sobre pilotes (un piso de una vía, como los del mapa) y el de la otra orilla
      const tablones = (cx, cz, hx, hz, rot) => {
        const top = MAR + 0.8, m = pieza(new THREE.BoxGeometry(hx * 2, 0.16, hz * 2), '#9a7448', cx, top - 0.08, cz); m.rotation.y = rot || 0;
        for (const sx of [-1, 1]) for (const sz of [-1, 0, 1]) { const lx = sx * (hx - 0.15), lz = sz * (hz - 0.2), c = Math.cos(rot || 0), s = Math.sin(rot || 0); pieza(new THREE.CylinderGeometry(0.09, 0.1, 2.4, 6), '#6b4a2a', cx + lx * c + lz * s, top - 1.2, cz - lx * s + lz * c); }
        G.terreno.addPlatform({ tipo: 'rect', x: cx, z: cz, hx, hz, rotY: rot || 0, top, unaVia: true });
      };
      tablones(6, 19.6, 0.9, 2.6, 0);
      tablones(-27.2, 32.2, 0.9, 2.2, -1.1);
      for (const k of Object.keys(POSTES)) { const p = POSTES[k], y = H(p.x, p.z); pieza(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 6), '#8a6a3a', p.x, y + 1.1, p.z); const c = pieza(new THREE.PlaneGeometry(0.9, 0.28), '#d6403a', p.x, y + 2, p.z - 0.5); c.rotation.y = Math.PI / 2; c.material.side = THREE.DoubleSide; }
      for (const [x, z, r] of [[-3, 30.2, 1.3], [3, 30.6, 1.1]]) pieza(new THREE.IcosahedronGeometry(r, 1), '#7a7266', x, MAR + r * 0.35, z).scale.set(1.2, 0.8, 1); // las dos rocas de la boca
      { const b = pieza(new THREE.CylinderGeometry(2.2, 2.6, 0.1, 18), '#e6d29a', -18.5, MAR - 0.12, 38.5); b.material.transparent = true; b.material.opacity = 0.55; } // el bajío
      // Las casas de la otra orilla: primitivas hasta que llega el modelo del kit (bohío y casa de paja), y no se atraviesan
      const casas = [[-35, 30, 'bohio_redondo', 3.6, 0.4], [-34, 33.5, 'casa_paja_a', 3.8, 2.2]].map(([x, z, nombre, largo, ry]) => {
        const y = H(x, z), g = [pieza(new THREE.CylinderGeometry(1.4, 1.4, 1.8, 8), '#c9a86a', x, y + 0.9, z), pieza(new THREE.ConeGeometry(1.8, 1.4, 8), '#a8903a', x, y + 2.5, z)];
        G.fisica.colliders.push({ x, z, r: 1.6, h: 3.2, kind: 'obj' });
        return { x, z, nombre, largo, ry, g };
      });
      // Piezas del kit de edificios (assets/models/edificios, propio), con su lado largo medido a `largo` y apoyadas en el suelo
      function kit(nombre, largo) {
        return G.assets.loadGLB(KIT + nombre + '.glb', { b64: () => (window.AV_EDIFICIOS_B64 || {})[nombre], script: KIT + nombre + '_glb.js', base: KIT, error: nombre + ' no disponible' }).then(g => {
          const m = g.scene || (g.scenes && g.scenes[0]); if (!m) throw new Error(nombre);
          const b = new THREE.Box3().setFromObject(m), sz = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()), k = largo / (Math.max(sz.x, sz.z) || 1);
          const w = new THREE.Group(); w.add(m); m.scale.setScalar(k); m.position.set(-c.x * k, -b.min.y * k, -c.z * k);
          m.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.castShadow = true; } });
          return w;
        });
      }
      const ponerKit = (nombre, largo, x, z, ry) => kit(nombre, largo).then(w => { w.position.set(x, H(x, z) - 0.05, z); w.rotation.y = ry || 0; scene.add(w); return w; });
      for (const c of casas) ponerKit(c.nombre, c.largo, c.x, c.z, c.ry).then(() => c.g.forEach(m => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); })).catch(() => { /* quedan las primitivas */ });
      // La ramada del astillero (4 horcones y techo de palma) sobre la pila de troncos y cañas de bambú con que se arma el casco
      { const x0 = 11.2, z0 = 6.1, y0 = H(x0, z0);
        for (const [dx, dz] of [[-1.1, -1.3], [1.1, -1.3], [-1.1, 1.3], [1.1, 1.3]]) pieza(new THREE.CylinderGeometry(0.07, 0.09, 2.5, 6), '#6b4a2a', x0 + dx, H(x0 + dx, z0 + dz) + 1.25, z0 + dz);
        pieza(new THREE.BoxGeometry(2.8, 0.18, 3.2), '#b8955a', x0, y0 + 2.5, z0).rotation.x = 0.06; }
      // El tendedero de la otra orilla: dos horcones, una vara y la red tendida al sol
      { const x0 = -31.6, z0 = 34.6, y0 = H(x0, z0);
        for (const d of [-1.3, 1.3]) pieza(new THREE.CylinderGeometry(0.06, 0.08, 1.9, 6), '#6b4a2a', x0 + d * Math.cos(0.5), y0 + 0.95, z0 - d * Math.sin(0.5));
        pieza(new THREE.CylinderGeometry(0.04, 0.04, 2.8, 6), '#8a6a3a', x0, y0 + 1.85, z0).rotation.set(0, 0.5, Math.PI / 2);
        const red = pieza(new THREE.PlaneGeometry(2.4, 1.1), '#d8c9a0', x0, y0 + 1.3, z0); red.rotation.y = 0.5; red.material.side = THREE.DoubleSide; red.material.transparent = true; red.material.opacity = 0.7; }
      for (const [i, col, r] of [[0, '#6b4a2a', 0.22], [1, '#6b4a2a', 0.22], [2, '#7a5634', 0.2], [3, '#c9b26a', 0.08], [4, '#c9b26a', 0.08]]) {
        const x = 11.2, z = 5.6 + (i < 2 ? i * 0.46 : i === 2 ? 0.23 : 1.2 + (i - 3) * 0.2), y = H(x, z) + (i === 2 ? 0.58 : r);
        pieza(new THREE.CylinderGeometry(r, r, i < 3 ? 2.2 : 2.6, 8), col, x, y, z).rotation.z = Math.PI / 2;
      }
      G.fisica.colliders.push({ x: 11.2, z: 6.1, r: 0.9, h: 0.8, kind: 'obj' });
      // La semilla de la corriente (se ve bajar por el río)
      const semilla = pieza(new THREE.SphereGeometry(0.14, 8, 6), '#7a5230', SEMILLA_RUTA[0][0], -50, SEMILLA_RUTA[0][1]);
      let semillaT = -1;
      // Los 6 materiales: en la orilla hasta que se sueltan; en el agua, arriba o en el fondo; los recuperados vuelven a la orilla
      const piezas = {};
      for (const m of MATERIALES) {
        const geo = { piedra: new THREE.DodecahedronGeometry(0.28, 0), tronco: new THREE.CylinderGeometry(0.22, 0.22, 1.2, 8), bambu: new THREE.CylinderGeometry(0.08, 0.08, 1.4, 6),
          tabla: new THREE.BoxGeometry(1, 0.08, 0.35), coco: new THREE.SphereGeometry(0.22, 10, 8), clavo: new THREE.CylinderGeometry(0.03, 0.03, 0.5, 5) }[m.id];
        const p = new THREE.Mesh(geo, mat(m.color)); if (m.id === 'tronco' || m.id === 'bambu' || m.id === 'clavo') p.rotation.z = Math.PI / 2;
        scene.add(p); piezas[m.id] = { mesh: p, t: 1 };
      }
      function dibujarMateriales() {
        for (const m of MATERIALES) {
          const P = piezas[m.id], enAgua = tiene('probado_' + m.id) && !tiene('recuperado_' + m.id);
          const x = enAgua ? AGUA_X : BANCO_X - (tiene('recuperado_' + m.id) ? 1.2 : 0);
          const y = enAgua ? (m.flota ? nivelRio() + 0.02 : H(x, m.z) + 0.12) : H(x, m.z) + 0.2;
          P.base = { x, y, z: m.z }; P.mesh.position.set(x, P.t < 1 ? P.mesh.position.y : y, m.z);
        }
      }
      G.on('render', (dt, t) => {
        for (const m of MATERIALES) {
          const P = piezas[m.id]; if (!P.base) continue;
          if (P.t < 1) { P.t = Math.min(1, P.t + dt * 1.2); P.mesh.position.y = P.y0 + (P.base.y - P.y0) * P.t; }
          else if (m.flota && tiene('probado_' + m.id) && !quieto) P.mesh.position.y = P.base.y + Math.sin(t * 2 + m.z) * 0.04;
        }
        if (semillaT >= 0) {
          semillaT = Math.min(1, semillaT + dt / 4);
          const [a, b] = SEMILLA_RUTA; semilla.position.set(a[0], nivelRio() + 0.05, a[1] + (b[1] - a[1]) * semillaT);
          if (semillaT >= 1) { semillaT = -1; semilla.position.y = -50; }
        }
      }, 30);

      // ---------- Misión 1 · «¿Qué flota?» ----------
      function papa() {
        if (S.step === 0) { G.dialogo.say(L('interact:papa'), () => { E().inicio = S.clock; G.misiones.advanceTo(1); G.ui.toast('Predice qué flota en la mesa del plano', 3000); }); return; }
        const fr = { 1: 'La mesa del plano está aquí al lado. Predice primero.', 2: 'Suelta cada cosa en la poza y mira qué pasa.', 3: 'Amarre doble, mija. Ya lo escribí en el plano.' };
        G.dialogo.say([di('Papá', S.complete ? '¡Llegaron! Lo sabía.' : fr[S.step] || 'Ese bote va a llegar lejos.')]);
      }
      G.interaccion.add({ id: 'papa', x: PAPA.x, z: PAPA.z, r: 2.4, label: () => S.step === 0 ? 'Hablar con el papá' : 'Hablar con el papá', use: papa });
      G.interaccion.add({ id: 'abuela', x: ABUELA.x, z: ABUELA.z, r: 2.4, label: () => 'Hablar con la abuela',
        use: () => G.dialogo.say([di('Abuela', S.complete ? 'Me contaron que preguntaste antes de contar. Así se llega lejos.' : G.eventos.had('BoatLaunched') ? 'Que no se vire, ¿eh? Y escucha a quien conoce el agua.' : 'Yo vuelo poco ya, mi niña. Un bote nos llevaría a todos.')]) });
      G.interaccion.add({ id: 'mesa', x: MESA.x, z: MESA.z, r: 2.2, label: () => S.step === 1 ? 'Predecir qué flota' : 'Mirar el plano del bote',
        use: () => {
          if (S.step === 1) {
            elegir('Vittata', '¿Qué flota: la piedra, el tronco, el bambú, la tabla, el coco o el clavo viejo?', PREDICCIONES.map(p => ({ label: p[1], k: p[0] })), o => {
              poner('prediccion_' + o.k); G.audio.play('tick'); G.misiones.advanceTo(2);
              G.dialogo.say([Vi('Lo apunto en el plano. Ahora, a probarlo en la poza.')], () => G.ui.toast('Suelta los 6 materiales en la poza', 3000));
            });
            return;
          }
          G.dialogo.say([Vi(G.eventos.had('MaterialsTested') ? 'En la tabla: flotan el tronco, el bambú, la tabla y el coco; se hunden la piedra y el clavo.' : 'El plano: casco, amarre doble y que no se vire.')]);
        } });
      function terminarPrueba() {
        if (G.eventos.had('MaterialsTested') || probados().length < 6 || HUNDEN.some(m => !tiene('recuperado_' + m.id))) return;
        G.eventos.log('MaterialsTested'); G.audio.play('unlock'); registrar();
        const pred = valor('prediccion_', PREDICCIONES.map(p => p[0]));
        G.dialogo.say([Vi('Flotaron el tronco, el bambú, la tabla y el coco. La piedra y el clavo se hundieron.'),
          di('Papá', pred === 'madera' ? 'Lo predijiste bien. Y fíjate: el tronco grande también flota.' : 'No era lo que pensabas, ¿verdad? Para eso se prueba.'),
          Vi('Ya sé con qué puedo hacer el casco. ¡Al astillero!')], () => { G.misiones.check(); G.ui.toast('Arma el bote en el astillero', 3000); });
      }
      for (const m of MATERIALES) {
        G.interaccion.add({ id: 'mat_' + m.id, x: BANCO_X, z: m.z, r: 1.1, visible: () => S.step >= 2 && !tiene('probado_' + m.id),
          label: () => m.soltar,
          use: () => {
            if (S.step < 2) return;
            encuadrar(AGUA_X, m.z);
            poner('probado_' + m.id); const P = piezas[m.id]; P.y0 = P.mesh.position.y + 1; P.t = 0; dibujarMateriales();
            if (G.agua.splash) G.agua.splash(AGUA_X, nivelRio(), m.z, 0.7);
            G.audio.play('pickup'); G.misiones.check();
            G.dialogo.say([Vi(m.frase)], terminarPrueba);
          } });
        if (!m.flota) G.interaccion.add({ id: 'fondo_' + m.id, x: AGUA_X, z: m.z, r: 1.3, visible: () => tiene('probado_' + m.id) && !tiene('recuperado_' + m.id),
          label: () => m.bucear,
          use: () => { poner('recuperado_' + m.id); dibujarMateriales(); G.audio.play('pickup'); G.misiones.check(); G.dialogo.say([Vi(m.tengo)], terminarPrueba); } });
      }

      // El astillero: construir (4 decisiones), botar, ajustar y botar otra vez
      function astillero() {
        if (S.step === 3) return construir();
        if (S.step === 4) return botadura1();
        if (S.step === 5) return ajustar();
        if (S.step === 6) return botadura2();
        G.dialogo.say([Vi(S.step < 3 ? 'Aquí se arma el bote. Primero, saber qué flota.' : 'La canoa que hicimos entre todos.')]);
      }
      G.interaccion.add({ id: 'astillero', x: ASTILLERO.x, z: ASTILLERO.z, r: 2.6,
        label: () => ({ 3: 'Armar el bote', 4: 'Botar la canoa', 5: 'Arreglar la canoa', 6: 'Botar otra vez' })[S.step] || 'Mirar el astillero', use: astillero });
      function construir() {
        const d = DECISIONES.find(x => !valor('dec_' + x.parte + '_', x.opciones.map(o => o[0])));
        if (!d) {
          poner('dec_casco'); G.eventos.log('BoatBuilt'); G.audio.play('unlock'); dibujarCanoa(); G.misiones.check(); registrar();
          G.dialogo.say([di('Papá', 'Ahí está la canoa. ¿Flotará derecha? Solo hay una forma de saberlo.')], () => G.ui.toast('Bota la canoa en el río', 3000));
          return;
        }
        elegir('Vittata', d.pregunta, d.opciones.map(o => ({ label: o[1], v: o[0] })), o => {
          poner('dec_' + d.parte + '_' + o.v); G.audio.play('tick'); G.fx.burst(ASTILLERO.x, H(ASTILLERO.x, ASTILLERO.z) + 1, ASTILLERO.z, 'feathers', 10); construir();
        });
      }
      function botadura1() {
        const f = falla();
        encuadrar(BOTADURA.x, BOTADURA.z);
        G.eventos.log('LaunchTested', { outcome: 'falla:' + f.parte }); poner('falla_' + f.parte); dibujarCanoa();
        if (G.agua.splash) G.agua.splash(BOTADURA.x, nivelRio(), BOTADURA.z, 1.2);
        G.dialogo.say([Vi('¡Al agua!'), Vi('¡Uy!'), Vi(f.que), di('Abuela', 'No pasa nada, mi niña: para eso se prueba. Ya sabes cuál es la parte más débil.')], () => { G.misiones.check(); registrar(); });
      }
      function ajustar() {
        const f = falla();
        elegir('Papá', 'Cambia solo una parte. ¿Cuál?', Object.keys(ARREGLOS).map(k => ({ label: ARREGLOS[k], k })), o => {
          if (o.k !== f.parte) { G.audio.play('wrong'); G.dialogo.say([di('Papá', 'Eso no fue lo que falló. Mira la marca roja.'), Vi(f.que)], ajustar); return; }
          poner('mejora_' + o.k); G.audio.play('unlock'); dibujarCanoa(); G.eventos.log('BoatImproved', { choice: o.k }); registrar();
          G.dialogo.say([Vi(ARREGLOS[o.k]), Vi('Listo.'), di('Papá', 'Ahora, otra vez al agua. Una sola prueba no basta.')], () => G.misiones.check());
        });
      }
      function botadura2() {
        encuadrar(BOTADURA.x, BOTADURA.z);
        if (G.agua.splash) G.agua.splash(BOTADURA.x, nivelRio(), BOTADURA.z, 1.2);
        G.eventos.log('BoatLaunched'); G.comic.capture('bote'); G.audio.play('unlock'); dibujarCanoa(); colocarNavegante(); registrar();
        const y = nivelRio(); G.fx.burst(BOTADURA.x, y + 1.5, BOTADURA.z, 'gold', 30);
        G.dialogo.say([Vi('Flota… ¡flota derechita!')].concat(L('evento:BoatLaunched')), () => { G.misiones.check(); G.ui.toast('Habla con la navegante en el muelle', 3000); });
      }

      // ---------- Misión 2 · «Leer el agua» ----------
      function observar(k, lineas) { if (tiene(k)) { G.dialogo.say(lineas.slice(0, 1)); return; } poner(k); G.audio.play('pickup'); G.misiones.check(); G.dialogo.say(lineas, finLectura); }
      function finLectura() {
        if (!OBS.every(tiene) || tiene('lectura_hecha')) return;
        poner('lectura_hecha'); registrar();
        G.dialogo.say([Vi('Viento del mar con rachas, nubes bajas y oscuras que crecen y una corriente que baja rápido. Vale: hoy no.')], () => G.ui.toast('Vuelve con la navegante', 3000));
      }
      const OBS_TXT = {
        poste_muelle: ['La cinta del muelle apunta hacia el monte: el viento viene del mar, y fuerte.'],
        poste_punta: ['En la punta, la cinta también apunta hacia tierra y da tirones: viento del mar con rachas.'],
      };
      for (const k of Object.keys(POSTES)) G.interaccion.add({ id: k, x: POSTES[k].x, z: POSTES[k].z, r: 2, visible: () => S.step >= 8,
        label: () => 'Mirar la cinta del poste', use: () => observar('obs_' + k, [Vi(OBS_TXT[k][0])]) });
      G.interaccion.add({ id: 'mirador', x: MIRADOR.x, z: MIRADOR.z, r: 2.4, visible: () => S.step >= 8,
        label: () => 'Mirar las nubes desde el mirador', use: () => { encuadrar(BAHIA.x, BAHIA.z); observar('obs_nubes', [Vi('Sobre la bahía hay nubes bajas y oscuras, y van creciendo.')]); } });
      G.interaccion.add({ id: 'semilla', x: SEMILLA.x, z: SEMILLA.z, r: 2.2, visible: () => S.step >= 8,
        label: () => 'Soltar una semilla en el río', use: () => { semillaT = 0; observar('obs_semilla', [Vi('La semilla se va río abajo, rápido. Así de fuerte va la corriente.')]); } });

      function navegante() {
        if (S.step < 7) { G.dialogo.say([Na('Bonita canoa. ¿Y quién la va a llevar?')]); return; }
        if (S.step === 7) encuadrar(NAVEGANTE.x, NAVEGANTE.z);
        if (S.step === 7) { G.eventos.log('NavigatorMet'); registrar(); G.dialogo.say(L('evento:NavigatorMet'), () => { G.misiones.check(); G.ui.toast('Lee el agua: los 2 postes, las nubes y la corriente', 3200); }); return; }
        if (S.step === 8) { G.dialogo.say([Na('Mira las dos cintas, las nubes desde el mirador y suelta una semilla en el río. Llevas ' + OBS.filter(tiene).length + ' de 4.')]); return; }
        if (S.step === 9) { acordar(); return; }
        if (S.step === 10) { G.dialogo.say([Na('Te espero río arriba, junto a la canoa.')]); return; }
        if (S.step === 11) { elegirTimon(); return; }
        if (S.step === 12) { G.dialogo.say([Na(timon() === 'vittata' ? 'Tú al timón; yo te canto el agua. Sube cuando quieras.' : 'Yo al timón; tú remas a mi señal. Sube cuando quieras.')]); return; }
        if (S.complete && AU.activo && !todasPreguntadas()) { G.dialogo.say([Na('Iguaca te espera en Villa Raíz con unas preguntas. Sin prisa.')]); return; }
        G.dialogo.say([Na(S.complete ? 'Mañana volvemos, con el viento de tierra.' : 'El agua se lee como una vecina: hay que saludarla primero.')]);
      }
      G.interaccion.add({ id: 'navegante', x: NAVEGANTE.x, z: NAVEGANTE.z, r: 2.4, visible: () => G.eventos.had('BoatLaunched') && !viaje,
        label: () => ({ 7: 'Hablar con la navegante', 9: 'Acordar las señales', 11: 'Decidir quién lleva el timón' })[S.step] || 'Hablar con la navegante', use: navegante });
      function acordar() {
        const libres = ['bandera', 'silbido', 'gesto'].filter(s => !ORDENES.some(o => tiene('sen_' + o[0] + '_' + s)));
        const o = ORDENES.find(x => !senalDe(x[0]));
        if (!o) {
          G.eventos.log('SignalsAgreed'); G.audio.play('unlock'); dibujarCanoa(); registrar();
          G.dialogo.say([Na('Hecho. En el agua hay ruido: viento, olas, lluvia. Con señales nos entendemos.'), Na('Mañana sale el viento de tierra. Hoy practicamos en el río: te espero río arriba, junto a la canoa.')],
            () => { G.misiones.check(); G.ui.toast('Practica río abajo en la canoa', 3000); });
          return;
        }
        if (!tiene('senales_intro')) { poner('senales_intro'); G.dialogo.say([Na('En el agua no siempre se oye. Elige una señal para cada orden: izquierda, derecha y parar.')], acordar); return; }
        elegir('Navegante', PREG_ORDEN[o[0]], libres.map(s => ({ label: SENALES[s], s })), r => { poner('sen_' + o[0] + '_' + r.s); G.audio.play('tick'); acordar(); });
      }
      // Una señal en el agua: la navegante la hace y el jugador responde según su código. Si falla: pista con el código, sin castigo
      function senal(orden, seguir, intro) {
        if (intro) { G.dialogo.say([Na(intro)], () => senal(orden, seguir)); return; }
        const s = senalDe(orden), pide = timon() === 'navegante' ? '¿Qué te pide que hagas?' : '¿Qué haces?';
        G.audio.play('tick');
        elegir('Navegante', DESC[s] + ' ' + pide, ORDENES.map(o => ({ label: o[1], v: o[0] })), r => {
          if (r.v !== orden) { G.audio.play('wrong'); G.dialogo.say([Na('¡Atenta! Repasa el código:')].concat(ORDENES.map(o => Na(COD[senalDe(o[0])][o[0]]))), () => senal(orden, seguir)); return; }
          G.audio.play('pickup'); seguir();
        });
      }
      function chubasco(orden, seguir) {
        G.fx.rain.visible = true;
        elegir('Navegante', 'Llueve y sopla fuerte. La navegante silba… pero el viento se lleva el silbido. ¿Qué hacen?', [
          { label: 'Silbar más fuerte', v: 0 }, { label: 'Cambiar el silbido por levantar el remo: se ve de cerca y el viento no lo tapa', v: 1 },
        ], o => {
          if (!o.v) { G.audio.play('wrong'); G.dialogo.say([Vi('¡Más fuerte!… Nada: el viento lo tapa otra vez.')], () => chubasco(orden, seguir)); return; }
          S.collected = S.collected.filter(k => k !== 'sen_' + orden + '_silbido'); poner('sen_' + orden + '_remo'); poner('cambio_silbido'); registrar();
          G.dialogo.say([Na('Buena idea. Desde ahora:'), Na(COD.remo[orden])], () => senal(orden, () => { G.fx.rain.visible = false; seguir(); }));
        });
      }
      // La práctica: tres señales río abajo; la que es el silbido falla con el chubasco y se cambia (una vez)
      function practica() {
        if (S.step !== 10) { G.dialogo.say([Vi(S.step < 10 ? 'La canoa espera aquí para la práctica.' : 'Aquí practicamos las señales.')]); return; }
        const paradas = {};
        ORDENES.forEach((o, i) => { paradas[i + 1] = seguir => (senalDe(o[0]) === 'silbido' && !tiene('cambio_silbido') ? chubasco(o[0], seguir) : senal(o[0], seguir)); });
        G.dialogo.say([Na('Sube. Yo te hago las señales y tú respondes. La canoa no se sale del cauce.')], () => navegar(RUTAS.rio, nivelRio(), finPractica, { paradas }));
      }
      function finPractica() {
        G.fx.rain.visible = false;
        S.pos.x = 15.2; S.pos.z = 11; S.pos.y = H(15.2, 11); lastOk = { x: S.pos.x, z: S.pos.z };
        G.eventos.log('PracticeDone'); dibujarCanoa(); registrar(); G.misiones.check();
        G.dialogo.say([Na('Nos entendemos. Una señal falló y la cambiamos juntas: así se hace.')], elegirTimon);
      }
      G.interaccion.add({ id: 'practica', x: PRACTICA.x, z: PRACTICA.z, r: 2.4, visible: () => S.step >= 10 && !viaje,
        label: () => S.step === 10 ? 'Subir a la canoa con la navegante' : 'Mirar el río', use: practica });
      function elegirTimon() {
        if (S.step !== 11) return;
        elegir('Vittata', 'Mañana cruzamos la bahía. ¿Quién lleva el timón?', [{ label: 'Lo llevo yo, que lo hice', v: 'vittata' }, { label: 'Llévalo tú, que sabes leer el agua', v: 'navegante' }], o => {
          poner('timon_' + o.v); G.eventos.log('HelmChosen', { choice: o.v }); G.comic.capture('senales'); G.audio.play('unlock'); registrar();
          G.dialogo.say(o.v === 'vittata' ? [Vi('Lo llevo yo, que lo hice.'), Na('Pues yo te canto el agua.')] : [Vi('Llévalo tú, que sabes. Gracias por volver a salir.'), Na('Gracias a ti por dejarme.')],
            () => { G.misiones.check(); G.ui.toast('Al día siguiente: el viento está a favor. Ve al muelle.', 3200); });
        });
      }

      // ---------- Misión 3 · «Más allá de la bahía» ----------
      function travesia() {
        if (S.step !== 12) { G.dialogo.say([Vi(S.step < 12 ? 'El muelle. Desde aquí se sale a la bahía.' : 'Por aquí salimos a la bahía.')]); return; }
        rumbo = { x: ALDEA.x, z: ALDEA.z };
        G.dialogo.say([di('Abuela', 'Cargadas van: fibra trenzada, semillas y herramientas. ¡Buen viaje!'), Na('Viento de tierra, a favor. Vamos.')],
          () => navegar(RUTAS.boca, MAR, rutaElegir, { paradas: { 1: s => senal('izquierda', s, 'En la boca de la bahía las olas cruzan entre dos rocas.'), 2: s => senal('derecha', s) } }));
      }
      G.interaccion.add({ id: 'muelle', x: MUELLE.x, z: MUELLE.z, r: 2.4, visible: () => !viaje,
        label: () => S.step === 12 ? 'Subir a la canoa y cruzar la bahía' : 'Mirar la bahía', use: travesia });
      function rutaElegir() {
        G.fx.rain.visible = true;
        elegir('Navegante', 'Viene un chubasco. ¿Por dónde vamos?', [{ label: 'El atajo: corto, con el viento de frente', v: 'atajo' }, { label: 'Por la costa: más largo y más seco', v: 'costa' }], o => {
          poner('ruta_' + o.v); registrar();
          const lin = o.v === 'atajo' ? [Vi('Por el atajo, que es más corto.'), Na('Pues agárrate: la carga se va a mojar.')] : [Vi('Por la costa. Mejor llegar secas, aunque sea al atardecer.'), Na('Buena elección: la costa nos abriga.')];
          G.dialogo.say(lin, () => navegar(RUTAS[o.v], MAR, bajio, { paradas: o.v === 'atajo' ? { 1: achicar } : { 2: s => senal('para', s, 'Unas rocas asoman junto a la costa.') } }));
        });
      }
      function achicar(seguir) {
        elegir('Navegante', 'Las olas entran por la proa y la carga se moja. ¿Qué haces?', [{ label: 'Achicar el agua con la jícara', v: 1 }, { label: 'Remar más rápido sin mirar', v: 0 }], o => {
          if (!o.v) { G.audio.play('wrong'); G.dialogo.say([Na('Así se llena más. Primero saca el agua.')], () => achicar(seguir)); return; }
          poner('carga_mojada'); G.audio.play('pickup'); G.dialogo.say([Vi('¡Fuera agua! La fibra se mojó un poco, pero llegamos.')], seguir);
        });
      }
      function bajio() {
        G.fx.rain.visible = false;
        G.dialogo.say([Na('Por aquí… ¡no! El fondo sube. Me equivoqué de paso.'), Na('Me equivoqué. Atrás.')], () => elegir('Vittata', '¿Qué hacemos?', [
          { label: 'Atrás, pues. Juntas', v: 'atras' }, { label: 'Busquemos otro paso, más hacia afuera', v: 'otro' },
        ], o => {
          poner('bajio_' + o.v); registrar();
          G.dialogo.say(o.v === 'atras' ? [Vi('Atrás, pues. Juntas. A cualquiera le pasa.'), Na('Gracias por no culparme.')] : [Vi('Allí el agua es más oscura: más honda. ¿Probamos?'), Na('Bien visto. Probemos tu paso.')],
            () => navegar(RUTAS[o.v], MAR, llegar));
        }));
      }
      function llegar() {
        rumbo = null;
        poner('llegada'); G.eventos.log('BayCrossed', { outcome: valor('ruta_', ['atajo', 'costa']) }); G.audio.play('unlock');
        S.pos.x = ALDEA.x; S.pos.z = ALDEA.z; S.pos.y = H(ALDEA.x, ALDEA.z); lastOk = { x: S.pos.x, z: S.pos.z };
        encuadrar(VECINA.x, VECINA.z);
        dibujarCanoa(); colocarNavegante(); registrar(); G.misiones.check();
        G.dialogo.say([Vi(tiene('ruta_costa') ? '¡La otra orilla! Y justo al atardecer.' : '¡La otra orilla! Mojadas, pero llegamos.'), Na('Ahí viene alguien. Saluda tú.')], () => G.ui.toast('Saluda a la gente de la otra orilla', 3000));
      }
      // La otra orilla: al principio desconfían; Vittata pregunta antes de contar. Intercambio y gancho al ep. 4 [KELVIN: decisiones 2, 4, 7 y 8]
      function vecina() {
        if (S.step < 13) { G.dialogo.say([di('Vecina', S.complete ? 'Vuelvan cuando quieran. Y piénsenlo.' : '…')]); return; }
        if (!G.eventos.had('CommunityReached')) {
          G.eventos.log('CommunityReached'); registrar(); G.misiones.check();
          G.dialogo.say([di('Vecina', '¿Y ustedes quiénes son? ¿De dónde salieron con ese bote?')], saludar);
          return;
        }
        saludar();
      }
      function saludar() {
        elegir('Vittata', '¿Qué le dices?', [{ label: '¡Miren el bote que hicimos! Lo construimos nosotras', v: 'contar' }, { label: 'Hola. ¿Cómo se llama este sitio y quiénes viven aquí?', v: 'preguntar' }], o => {
          if (o.v === 'contar') { G.dialogo.say([di('Vecina', 'Botes aquí sobran, mija. Mira la orilla.'), Vi('Tiene razón. Perdón: mejor pregunto primero.')], saludar); return; }
          poner('pregunto'); G.audio.play('tick');
          G.dialogo.say([di('Vecina', 'Gracias por preguntar. Aquí vivimos los que salimos adelante después de la Ruptura, como ustedes.'), di('Vecina', 'Sabemos de agua y de redes. Y también tenemos un transmisor: oímos una voz.'),
            Vi('¡Nosotras también! Lo que oímos encaja con lo suyo, como dos mitades.')], intercambio);
        });
      }
      function intercambio() {
        elegir('Vittata', '¿Qué les ofrecemos?', [{ label: 'Cómo hicimos la casa que aguanta la tormenta', v: 'casa' }, { label: 'La fibra trenzada del papá', v: 'fibra' }], o => {
          poner('intercambio_' + o.v); G.audio.play('unlock');
          G.dialogo.say([di('Vecina', o.v === 'casa' ? 'Eso nos sirve: aquí el viento se lleva los techos.' : 'Fibra buena. Con esto tejemos redes nuevas.'), di('Vecina', 'Y nosotros les enseñamos a tejer una nasa, para pescar sin pasar hambre.'),
            di('Vecina', 'Antes de que se vayan: miren este plano. Un camino para unir las dos orillas. Ayudaría a todos… pero hay que cortar mucho bosque.'),
            Vi('…Déjame pensarlo.')], terminar);
        });
      }
      function terminar() {
        if (S.complete) return;
        G.eventos.log('Chapter3Completed'); G.comic.capture('llegada'); G.audio.play('unlock');
        G.fx.burst(ALDEA.x, H(ALDEA.x, ALDEA.z) + 3, ALDEA.z, 'gold', 40); G.fx.burst(ALDEA.x, H(ALDEA.x, ALDEA.z) + 3, ALDEA.z, 'feathers', 30);
        S.complete = true; E().fin = S.clock; G.misiones.check();
        G.misiones.advanceTo(G.misiones.DONE); registrar();
        G.dialogo.say(L('evento:Chapter3Completed'), () => G.misiones.showEnd());
      }
      G.interaccion.add({ id: 'vecina', x: VECINA.x, z: VECINA.z, r: 2.4, label: () => S.step === 13 ? 'Saludar' : 'Hablar con la vecina', use: vecina });

      // ---------- Iguaca: pistas del paso en curso y, al final, las preguntas (opcionales) ----------
      function hablar() {
        if (S.complete && AU.activo && !todasPreguntadas()) {
          elegir('Iguaca', '¡Cruzaste la bahía! Cuando quieras, te hago unas preguntas sobre lo que hicimos. Sin prisa y sin nota.',
            [{ label: 'Sí, pregúntame', v: 1 }, { label: 'Ahora no', v: 0 }], o => { if (o.v) formativa(); else G.dialogo.say([Lu('Cuando quieras. Aquí estaré.')]); });
          return;
        }
        const pistas = {
          0: 'El papá está en el astillero, junto al río.', 1: 'Antes de probar, predice. La mesa del plano está junto al astillero.',
          2: 'Suelta cada material en la poza. Lo que se hunda, búscalo buceando.', 3: 'En el astillero eliges casco, amarre, carga y batanga.',
          4: 'Ya está armada. Ahora, la prueba de verdad: el agua.', 5: 'La botadura te enseñó la parte más débil. Cambia solo esa.',
          6: 'Vuelve a botarla. Si flota derecha, ¡fiesta!', 7: 'Alguien mira la canoa desde el muelle.',
          8: 'Mira las dos cintas, las nubes desde el mirador y la corriente del río.', 9: 'Acuerda las señales con la navegante.',
          10: 'La canoa te espera río arriba.', 11: '¿Quién lleva el timón? Las dos respuestas llegan.', 12: 'Sube a la canoa en el muelle.', 13: 'Saluda a la gente de la otra orilla.',
        };
        G.dialogo.say([Lu(S.complete ? '¡Cruzaste la bahía! Puedes seguir explorando.' : pistas[S.step] || 'Sigue así.')]);
      }
      G.interaccion.add({ id: 'iguaca', x: IGUACA.x, z: IGUACA.z, r: 2.4, label: () => 'Hablar con Iguaca', use: hablar });

      const redibujar = () => { dibujarCanoa(); dibujarMateriales(); colocarNavegante(); };
      G.on('apply', redibujar, 75);
      redibujar();
      // Para la prueba: rutas, nivel del agua y si hay un viaje en marcha
      G.ep3 = { RUTAS, MAR, nivelRio, enViaje: () => !!viaje, canoa, conModelo: () => !!modelo, falla, destino: () => rumbo || (viaje ? { x: viaje.pts[viaje.pts.length - 1][0], z: viaje.pts[viaje.pts.length - 1][1] } : null) };
    },

    pruebas: {
      async selfTest(G, T) {
        const S = G.S, $ = G.util.$, { check, result } = T.runner(), { tick, drain, useAt, teleport } = T;
        const keep = T.keepSave();
        const criaderoRaw = (() => { try { return localStorage.getItem(G.criadero.KEY); } catch (e) { return null; } })();
        // Todo texto que el jugador ve (diálogos, tarjetas, avisos) se apunta para comprobar luego que tiene inglés
        const vistos = new Set(), ver = t => { if (t != null && /\p{L}/u.test(String(t))) vistos.add(String(t).replace(/\s+/g, ' ').trim()); };
        const D = G.dialogo, say0 = D.say, choose0 = D.choose, toast0 = G.ui.toast;
        D.say = function (lines, done, o) { (lines || []).forEach(l => { ver(l.text); ver(l.who); }); return say0.apply(this, arguments); };
        D.choose = function (line, ops, done) { ver(line.text); ver(line.who); (ops || []).forEach(x => ver(x.label)); return choose0.apply(this, arguments); };
        G.ui.toast = function (t) { ver(t); return toast0.apply(this, arguments); };
        let grabando = true; // las etiquetas de los puntos de interacción cambian con el paso: se apuntan en cada cuadro de la prueba
        G.on('update', () => { if (grabando) for (const it of G.interaccion.list) { try { ver(it.label()); } catch (e) { /* */ } } });
        const pick = txt => { const b = [...document.querySelectorAll('[id^="ch-"]')].find(x => x.textContent.includes(txt)); if (b) b.click(); drain(); return !!b; };
        const opciones = () => [...document.querySelectorAll('[id^="ch-"]')].map(b => b.textContent);
        const navegar = (seg) => { for (let i = 0; i < (seg || 60) * 20 && G.ep3.enViaje() && !G.ui.cardOpen; i++) { tick(0.05); drain(); } drain(); };
        // Responde a la señal de la tarjeta según el código guardado
        const responder = () => { const txt = $('card').textContent, s = ['remo', 'bandera', 'silbido', 'gesto'].find(k => txt.includes({ bandera: 'levanta la bandera', silbido: 'navegante silba.', gesto: 'gesto con el ala', remo: 'levanta el remo' }[k])); const o = ['izquierda', 'derecha', 'para'].find(x => S.collected.includes('sen_' + x + '_' + s)); return pick({ izquierda: 'Izquierda', derecha: 'Derecha', para: 'Parar' }[o]); };
        try {
          G.quiet = true; G.guardado.reset(true);
          check('Crea el personaje', G.creador.saveCharacter({ name: 'Prueba', preset: 'agilis', outfit: 'azul', accessory: 'ninguno' }) === null);
          check('Empieza en el paso 1 de 14', S.step === 0 && $('steps').children.length === 14);
          check('Lo provisional del canon va marcado [KELVIN] en notas y comentarios, no en el texto del jugador', JSON.stringify(G.pack.dialogos.datos().escenas.map(e => e.nota || '')).includes('[KELVIN') && !JSON.stringify(G.pack.dialogos.datos().escenas.map(e => e.lineas)).includes('[KELVIN'));
          // Mapa: cada punto de las rutas de la bahía tiene agua (relieve bajo el mar) y los del río, bajo el nivel del río
          const R = G.ep3.RUTAS, hondo = (p, y) => G.terreno.height(p[0], p[1]) < y - 0.4;
          const secos = ['boca', 'atajo', 'costa', 'atras', 'otro'].flatMap(k => R[k].filter(p => !hondo(p, G.ep3.MAR)).map(p => k + ':' + p)).concat(R.rio.filter(p => !hondo(p, G.ep3.nivelRio())).map(p => 'rio:' + p));
          check('Rutas de la canoa: todos los puntos tienen agua (bahía y río)', !secos.length && isFinite(G.ep3.nivelRio()), secos.join(' '));
          useAt('papa'); drain();
          check('M1 · El papá: «¿Y eso flota cargado?» y empieza la misión', S.step === 1, 'paso ' + S.step);
          useAt('mesa'); drain();
          check('M1 · Predecir: 3 predicciones sin juicio', opciones().length === 3, opciones().length);
          pick('Lo grande se hunde');
          check('M1 · Predicción anotada: a probar', S.step === 2 && S.collected.includes('prediccion_grande'), 'paso ' + S.step);
          for (const m of ['piedra', 'tronco', 'bambu', 'tabla', 'coco', 'clavo']) { useAt('mat_' + m); drain(); }
          check('M1 · Los 6 en la poza: flotan 4, se hunden 2 y hay que bucear por ellos', ['piedra', 'clavo'].every(m => G.interaccion.find('fondo_' + m).visible()) && !G.eventos.had('MaterialsTested'));
          useAt('fondo_piedra'); drain(); useAt('fondo_clavo'); drain();
          check('M1 · Recuperados los hundidos: tabla de flotación completa', G.eventos.had('MaterialsTested') && S.step === 3, 'paso ' + S.step);
          useAt('astillero'); drain();
          check('M1 · Armar el bote: 4 decisiones (casco, amarre, carga, batanga)', opciones().length === 3 && /casco/.test($('card').textContent));
          pick('Bambú'); pick('Bejuco'); pick('Al centro'); pick('No: más rápida');
          check('M1 · Bote armado y la canoa se ve', G.eventos.had('BoatBuilt') && S.step === 4 && G.ep3.canoa.visible, 'paso ' + S.step);
          useAt('astillero'); drain();
          check('M1 · Botadura 1: falla solo la parte más débil (bambú con bejuco: el amarre)', G.eventos.had('LaunchTested') && S.collected.includes('falla_amarre') && S.step === 5, 'paso ' + S.step);
          useAt('astillero'); drain();
          pick('Ponerle una batanga');
          check('M1 · Arreglar otra parte no vale: pista y se repite', !G.eventos.had('BoatImproved') && opciones().length === 5);
          pick('Cambiar el bejuco');
          check('M1 · Cambia solo lo que falló', G.eventos.had('BoatImproved') && S.step === 6, 'paso ' + S.step);
          useAt('astillero'); drain();
          check('M1 · Botadura 2: flota derecha; casco marinero y la navegante en el muelle', G.eventos.had('BoatLaunched') && S.missions.flota && S.unlocked.includes('casco:marinero') && G.actores.npc('navegante').visible && S.step === 7, 'paso ' + S.step);
          check('Otras combinaciones también fallan en una sola parte y tienen arreglo', (() => { const c0 = S.collected.slice(), out = []; for (const [cas, car, bat] of [['tronco', 'centro', 'no'], ['tronco', 'centro', 'si'], ['tablas', 'centro', 'si'], ['bambu', 'lado', 'si']]) { S.collected = c0.filter(k => !/^dec_(casco|carga|batanga|amarre)_/.test(k)).concat(['dec_casco_' + cas, 'dec_carga_' + car, 'dec_batanga_' + bat, 'dec_amarre_fibra']); out.push(G.ep3.falla().parte); } S.collected = c0; return out.join(',') === 'batanga,peso,juntas,carga'; })());

          // M2 · Leer el agua
          useAt('navegante'); drain();
          check('M2 · La navegante: «hoy no» y el Guardián pone paz', G.eventos.had('NavigatorMet') && S.step === 8, 'paso ' + S.step);
          useAt('poste_muelle'); drain(); useAt('poste_punta'); drain(); useAt('mirador'); drain(); useAt('semilla'); drain();
          check('M2 · Viento (2 postes), nubes y corriente observados', ['obs_poste_muelle', 'obs_poste_punta', 'obs_nubes', 'obs_semilla'].every(k => S.collected.includes(k)) && S.step === 9, 'paso ' + S.step);
          useAt('navegante'); drain();
          check('M2 · Señales: 3 para elegir para «izquierda»', opciones().length === 3, opciones().join());
          pick('Levantar la bandera'); pick('Un silbido'); pick('Un gesto');
          check('M2 · Código acordado: bandera = izquierda, silbido = derecha, gesto = parar', G.eventos.had('SignalsAgreed') && S.step === 10 && S.collected.includes('sen_derecha_silbido'), 'paso ' + S.step);
          useAt('practica'); drain();
          check('M2 · Sube a la canoa: Vittata va posada en ella', G.ep3.enViaje());
          navegar();
          check('M2 · Primera señal (bandera): la tarjeta pregunta qué hacer', G.ui.cardOpen && /bandera/.test($('card').textContent), $('card').textContent.slice(0, 80));
          pick('Derecha');
          check('M2 · Responder mal: pista con el código, sin castigo, y se repite', G.ui.cardOpen && /bandera/.test($('card').textContent) && G.ep3.enViaje());
          responder(); navegar();
          check('M2 · Chubasco: el silbido no se oye', G.ui.cardOpen && /viento se lleva el silbido/.test($('card').textContent) && G.fx.rain.visible);
          pick('Silbar más fuerte');
          check('M2 · Silbar más fuerte no sirve: se repite', G.ui.cardOpen && /silbido/.test($('card').textContent) && !S.collected.includes('cambio_silbido'));
          pick('Cambiar el silbido');
          check('M2 · Cambian el silbido por el remo', S.collected.includes('cambio_silbido') && S.collected.includes('sen_derecha_remo') && !S.collected.includes('sen_derecha_silbido'));
          responder(); navegar(); responder(); navegar();
          check('M2 · Práctica terminada: elegir quién lleva el timón', G.eventos.had('PracticeDone') && !G.ep3.enViaje() && opciones().length === 2 && !G.fx.rain.visible, opciones().join());
          pick('Llévalo tú');
          check('M2 · Timón a la navegante: misión completa y bandera de señales', G.eventos.had('HelmChosen') && S.missions.agua && S.unlocked.includes('mano:bandera') && S.step === 12, 'paso ' + S.step);

          // M3 · Más allá de la bahía (atajo y otro paso en el bajío)
          useAt('muelle'); drain();
          check('M3 · Salen del muelle', G.ep3.enViaje());
          navegar(); responder(); navegar(); responder(); navegar();
          check('M3 · La boca de la bahía con señales; viene el chubasco: elegir ruta', opciones().length === 2 && opciones().some(x => x.includes('atajo')), opciones().join());
          pick('El atajo'); navegar();
          check('M3 · Atajo: entra agua y hay que achicar', /achicar|jícara/i.test($('card').textContent));
          pick('Remar más rápido'); pick('Achicar');
          navegar();
          check('M3 · El bajío: la navegante se equivoca y lo dice; dos salidas', opciones().length === 2 && opciones().some(x => x.includes('Juntas')), opciones().join());
          pick('otro paso'); navegar();
          check('M3 · Llegan a la otra orilla', G.eventos.had('BayCrossed') && S.step === 13 && !G.ep3.enViaje() && S.collected.includes('llegada') && Math.hypot(S.pos.x + 30, S.pos.z - 30.5) < 1, 'paso ' + S.step);
          useAt('vecina'); drain();
          check('M3 · Desconfían al principio', G.eventos.had('CommunityReached') && opciones().length === 2);
          pick('Miren el bote');
          check('M3 · Contar antes de preguntar no abre la puerta (sin castigo)', opciones().length === 2 && !S.collected.includes('pregunto'));
          pick('¿Cómo se llama');
          pick('fibra trenzada');
          check('M3 · Preguntar, intercambio y gancho: final, sombrero y carta', S.complete && S.step === G.misiones.DONE && G.eventos.had('Chapter3Completed') && S.missions.bahia && ['sombrero2:pescador', 'mano:mapa'].every(k => S.unlocked.includes(k)) && !$('end').hidden);
          check('El cómic sale de los eventos', G.comic.comicPanels().length === 4, G.comic.comicPanels().length);

          // ---------- §5 «Iguaca te pregunta» · §6 Modo Maestro · §7 Diario y criadero ----------
          const AU = G.aula, LEC = AU.LEC || {}, MM = LEC.modo_maestro || {}, QS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];
          const aulaRaw = (() => { try { return localStorage.getItem(AU.KEY); } catch (e) { return null; } })();
          check('Aula del ep. 3 con su propia clave y la misma puerta que el ep. 1', AU.activo && AU.KEY === 'amazonaverse.aula.ep3' && (AU.nuevoReto(), AU.reto() >= 78 && AU.reto() <= 171), AU.KEY);
          const g45 = MM.guia_45_min || {};
          check('Esquema igual al ep. 2: 4 objetivos, 6 preguntas, 6 fichas, guía de 45 min, 3 sin pantalla y rúbrica de 5',
            (LEC.objetivos || []).length === 4 && (LEC.preguntas || []).length === 6 && (LEC.diario || []).length === 6 && g45.antes && g45.antes.minutos + g45.durante.minutos + g45.despues.minutos === 45 &&
            (MM.actividades_sin_pantalla || []).length === 3 && MM.rubrica && MM.rubrica.criterios.length === 5 && MM.reporte_progreso.almacenamiento.clave === AU.KEY);
          check('Ninguna ficha sale al Diario sin fuente verificada: las 6 van por verificar, con fuente propuesta y nota', AU.fichas().length === 0 && LEC.diario.every(f => f.verificacion === 'por_verificar' && f.fuente && f.nota_verificacion));
          check('Las 6 preguntas se pueden hacer: ninguna depende de un dato por verificar', QS.every(id => AU.preguntaPublicable(AU.pregunta(id))));
          check('Nunca «grados» en lo que ve el maestro ni el niño', !/grado/i.test(JSON.stringify([g45, (MM.actividades_sin_pantalla || []).map(a => [a.titulo, a.materiales, a.pasos]), MM.rubrica, LEC.objetivos.map(o => o.enunciado), LEC.preguntas.map(q => [q.enunciado, q.opciones, q.retro])])));
          G.misiones.seguirExplorando();
          check('Tras el final, el mundo queda libre para seguir', $('end').hidden && !G.ui.busy());
          useAt('iguaca'); drain();
          check('Al volver con Iguaca, ofrece las preguntas (se pueden dejar para luego)', opciones().length === 2 && opciones().some(x => x.includes('Ahora no')), opciones().join());
          pick('Ahora no');
          useAt('iguaca'); drain(); pick('Sí, pregúntame');
          const card = $('card'), opt = i => card.querySelector(`.edu-opt[data-i="${i}"]`), correcta = id => AU.pregunta(id).correcta;
          check('Iguaca te pregunta: tarjeta formativa sin puntaje visible', G.ui.cardOpen && card.querySelector('.edu-q') && !/punt|score|\d+\s*\/\s*\d+|%/i.test(card.textContent), card.textContent.slice(0, 80));
          opt(correcta('q1') === 0 ? 1 : 0).click(); opt(correcta('q1')).click(); $('edu-seguir').click();
          for (const id of QS.slice(1)) { opt(correcta(id)).click(); const sg = $('edu-seguir'); if (sg) sg.click(); }
          drain();
          check('Las 6 respondidas: la tarjeta se cierra', QS.every(id => S.edu.formativa[id]) && !G.ui.cardOpen, JSON.stringify(S.edu.formativa));
          const p = AU.partida();
          check('Reporte local: 3 misiones, los 4 objetivos, casco, señal cambiada y timón, sin el nombre', p && p.preguntas.q1 === 2 && p.misiones_completadas.length === 3 && ['E1', 'E2', 'E3', 'E4'].every(o => p.objetivos_logrados.includes(o)) && p.casco === 'bambu' && p.senal_cambiada === true && p.timon === 'navegante' && p.ruta === 'atajo' && !JSON.stringify(p).includes('Prueba'), JSON.stringify(p));
          const csv = AU.reporteCSV();
          check('CSV del Modo Maestro con lo que falló y el código de señales', csv.includes('falla_botadura') && csv.includes('amarre') && csv.includes('derecha:remo'));
          check('Modo Maestro: pestaña del ep. 3', AU.pestanas().includes('ep3') && (AU.abrirMaestro(), AU.maestroAbierto()) && (AU.cerrarMaestro(), !AU.maestroAbierto()));
          for (const f of G.diario.entries) { teleport(f.x + 0.3, f.z); tick(0.1); }
          check('Diario: 6 hallazgos (3 del agua, 3 de gente de mar)', S.field.length === 6 && G.diario.count('agua') === 3 && G.diario.count('mar') === 3, S.field.join(','));
          check('Cada hallazgo tiene su ficha por verificar y el texto del juego no afirma el dato real', G.diario.entries.every(e => LEC.diario.some(f => f.id === e.id)) && !/taín|dens|arquím|antillas/i.test(G.diario.entries.map(e => e.texto).join(' ')));
          const HV = (window.AV_HUEVOS && window.AV_HUEVOS.huevos) || [];
          check('Criadero del juego: el nido entra con la segunda botadura; ninguna cápsula se compra; la cría sigue a Vittata', !!G.criadero && G.pack.criadero.desde === 'BoatLaunched' && G.criadero.KEY === 'amazonaverse.criadero' && G.guardado.KEY.startsWith('ep3.') && HV.every(h => !/precio|price|compra|buy/i.test(JSON.stringify(h.obtener))), G.criadero.KEY + ' · ' + G.guardado.KEY);
          // La bahía honda: a pie no se entra
          teleport(-4, 30); tick(0.2);
          check('A pie no se entra en la bahía honda (vuelve a la orilla)', G.terreno.height(S.pos.x, S.pos.z) > G.ep3.MAR - 0.6 || Math.abs(S.pos.x + 4) > 0.5 || Math.abs(S.pos.z - 30) > 0.5, S.pos.x.toFixed(1) + ',' + S.pos.z.toFixed(1));
          // Guardar y cargar
          try { if (aulaRaw == null) localStorage.removeItem(AU.KEY); else localStorage.setItem(AU.KEY, aulaRaw); } catch (e) { /* sin almacenamiento */ }
          G.guardado.save(true); const snap = G.guardado.serialize(); G.guardado.reset(true);
          try { localStorage.setItem(G.guardado.KEY, snap); } catch (e) { /* sin almacenamiento */ }
          check('Guardar y cargar: la canoa vuelve a la otra orilla', G.guardado.load(true) && S.complete && S.collected.includes('timon_navegante') && S.edu.formativa.q1 === 2 && G.ep3.canoa.visible && Math.abs(G.ep3.canoa.position.x + 25) < 0.5);
          // Inglés: cada texto que se vio tiene su EN (content/ep3/en.js o el común de cap1), igual que los pasos, misiones y Diario
          const datos = G.misiones.steps.map(s => s.texto).concat(G.pack.misiones.flatMap(m => [m.titulo, m.hud].concat(m.pasos.map(x => x.texto))),
            G.diario.entries.flatMap(e => [e.nombre, e.texto]), G.pack.ropa.flatMap(r => [r.nombre, r.pista]), [G.pack.historia.fin()], Object.values(G.pack.meta.hud).filter(v => typeof v === 'string'));
          datos.forEach(ver);
          await G.idioma.poner('en'); await G.idioma.listo;
          const sinEN = G.idioma.faltan([...vistos]);
          check('ES y EN: todo lo que se vio en la partida tiene inglés (' + vistos.size + ' textos)', G.idioma.activo() && vistos.size > 120 && !sinEN.length, sinEN.slice(0, 6).join(' | '));
          check('En inglés, el HUD del episodio sale traducido', $('quest').querySelector('h1').textContent === 'Beyond the Bay', $('quest').querySelector('h1').textContent);
          await G.idioma.poner('es');
          G.guardado.reset(true);
          try { if (criaderoRaw == null) localStorage.removeItem(G.criadero.KEY); else localStorage.setItem(G.criadero.KEY, criaderoRaw); } catch (e) { /* sin almacenamiento */ }
          if (AU.recargar) AU.recargar();
        } catch (e) {
          check('La prueba corre sin excepciones', false, String(e && e.stack || e).slice(0, 300));
        } finally {
          D.say = say0; D.choose = choose0; G.ui.toast = toast0; grabando = false; G.fx.rain.visible = false;
          T.restoreSave(keep);
          G.quiet = false;
        }
        return result();
      },
    },
  });
})();
