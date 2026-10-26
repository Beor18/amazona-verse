/* Content pack EP2 · «Un lugar para todos» · PROTOTIPO jugable de las misiones 1 a 3: «Lee la tierra», «Escuchar primero»
   y «Casa que aguanta». Sale de content/plantilla y reutiliza el motor tal cual (nada de src/ tocado). Diseño: docs/equipo/EP2_GDD.md,
   EP2_NARRATIVA.md y EP2_MISIONES.md §2–4. Ábrelo con index.html?pack=ep2 (boot.js lo carga solo).
   Lo que depende del canon de Kelvin (EP2_GDD.md §10) va con el marcador neutro [KELVIN] y no es canon.
   Lo que el jugador observa en cada sitio (pendiente, suelo, viento) y lo que falla en la tormenta son valores del juego, no datos
   del mundo real: la ciencia de suelos y de cajas nido sigue «por verificar» (EP2_MISIONES.md §2 y §4). El único dato real es el de
   la parada del nido, con su fuente. Todo el estado va en S.collected (se guarda solo): tarjetas, decisiones y lo que falló. */
(function () {
  'use strict';
  const LUMA = { x: -2, z: 2 };
  // Tres sitios para la casa: lo que se observa en cada uno (valores del juego). Ninguno es «el malo»: se elige con evidencia
  const SITIOS = {
    a: { id: 'a', nombre: 'el llano', x: -12, z: 10, pendiente: 'plano', suelo: 'se hace charco: el agua tarda mucho en bajar', viento: 'poco' },
    b: { id: 'b', nombre: 'la loma', x: 16, z: -6, pendiente: 'empinado', suelo: 'el agua baja rápido', viento: 'mucho' },
    c: { id: 'c', nombre: 'el claro', x: 0, z: -16, pendiente: 'suave', suelo: 'el agua baja a ritmo medio', viento: 'medio' },
  };
  const IDS = Object.keys(SITIOS);
  const NIDO = { x: -20, z: -4 };
  // Misión 2: los dos residentes y la mesa de las tarjetas. [KELVIN: quiénes son la abuela y el papá y su aspecto]
  const ABUELA = { x: 8, z: 9 }, PAPA = { x: -10, z: -7 }, MESA = { x: 5, z: 1 };
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
    { id: 'e_inicio', disparador: 'inicio:ep2', personaje: 'Vittata', emocion: 'pensando', lineas: ['Otra tormenta en tres días. El refugio no aguanta.', 'Ya sé dónde pondré la casa… ¿o no? [KELVIN: lo que dice la Voz y la luz de la niebla]'] },
    { id: 'e_iguaca', disparador: 'interact:iguaca', personaje: 'Iguaca', emocion: 'idea', lineas: ['Elegiste el sitio a ojo. ¿Y si lo miras como en la ruta de la gota?', 'Hay tres sitios: el llano, la loma y el claro. Mira la pendiente, el suelo y el viento de cada uno. Luego eliges.'] },
    { id: 'e_fin', disparador: 'evento:SiteChosen', personaje: 'Iguaca', emocion: 'feliz', lineas: ['Elegiste con evidencia, no a ojo. Eso es leer la tierra.', 'Ahora falta lo más importante: quienes van a vivir ahí. La abuela y el papá. [KELVIN: quiénes son los dos residentes]', 'Ve a enseñarle tu plano a la abuela.'] },
    { id: 'e_plano_v', disparador: 'evento:ResidentsMet', personaje: 'Vittata', emocion: 'feliz', lineas: ['¡Miren mi plano! Una casa grande, de una planta, con la puerta aquí y el nido aquí al lado.'] },
    { id: 'e_plano_a', disparador: 'evento:ResidentsMet', personaje: 'Abuela', emocion: 'triste', lineas: ['…'] },
    { id: 'e_plano_p', disparador: 'evento:ResidentsMet', personaje: 'Papá', emocion: 'triste', lineas: ['(El papá mira el plano, no dice nada y se va volando a su rama.)'] },
    { id: 'e_plano_g', disparador: 'evento:ResidentsMet', personaje: 'Guardián', emocion: 'idea', lineas: ['¿Les preguntaste… o les contaste? [KELVIN: si el Guardián habla aquí y con qué voz]'] },
    { id: 'e_plano_v2', disparador: 'evento:ResidentsMet', personaje: 'Vittata', emocion: 'pensando', lineas: ['Les conté. Esta vez voy a preguntar primero.'] },
    { id: 'e_choque', disparador: 'evento:NeedsListed', personaje: 'Iguaca', emocion: 'pensando', lineas: ['Mira estas dos: «entrada baja» para la abuela y «nido alto» para el papá. Parece que chocan.'] },
    { id: 'e_escucha', disparador: 'evento:ListenChoice', personaje: 'Iguaca', emocion: 'feliz', lineas: ['Eso es escuchar primero: ahora sabes lo que la casa tiene que lograr y lo que no puedes saltarte.', 'Ve a tu sitio y dibuja la casa.'] },
    { id: 'e_fiesta', disparador: 'evento:Chapter2Completed', personaje: 'Abuela', emocion: 'feliz', lineas: ['Entrada baja, sin viento frío y el agua cerca, pero no encima. Esta casa me escuchó.'] },
    { id: 'e_fiesta_p', disparador: 'evento:Chapter2Completed', personaje: 'Papá', emocion: 'feliz', lineas: ['Alto, oscuro y seco. Aquí el huevo va a estar tranquilo. [KELVIN: si hay huevo en escena]'] },
    { id: 'e_fiesta_i', disparador: 'evento:Chapter2Completed', personaje: 'Iguaca', emocion: 'feliz', lineas: ['Probaste, viste qué falló, lo cambiaste y volviste a probar. ¡Fiesta de techado!'] },
  ] };

  AVE.registerPack({
    id: 'ep2',
    meta: {
      titulo: 'Un lugar para todos', capitulo: 2, almacen: 'ep2',
      hud: { capitulo: 'Episodio 2 · Prototipo', titulo: 'Un lugar para todos', portada: 'Episodio 2 · Un lugar para todos',
        etiqueta: 'Prototipo del episodio 2 · content/ep2/pack.js', fin: '¡La casa aguanta!',
        nota: 'Prototipo: las tres misiones del episodio 2. No uses tu nombre real.', inventario: {} },
    },
    jugador: { nombre: 'Vittata', sprite: 'assets/vittata.png', especie: 'vittata', altura: 1.75, aparicion: { x: -4, z: 6 }, camara: 0.6 },
    guardado: { version: 1 },

    mundo: {
      tamano: 40, segmentos: 80,
      cielo: { color: '#d9c4a8', niebla: [30, 100] },
      luces: { cielo: '#e6dccb', suelo: '#3a4a2a', hemi: 0.85, sol: '#ffcf9a', solInt: 0.7, solPos: [30, 40, -20] },
      lugares: { inicio: { x: -4, z: 4, r: 5 }, nido: { x: NIDO.x, z: NIDO.z, r: 3 } },
      terreno: {
        ondas: [{ fn: 'sin', x: 0.09, amp: 0.5 }, { fn: 'cos', z: 0.07, amp: 0.4 }],
        relieves: [{ tipo: 'colina', x: 16, z: -6, alto: 6, ancho: 40 }], // la loma: el sitio empinado
        planos: ['inicio', 'nido'],
      },
      arboles: { cantidad: 36, semilla: 5, copaCada: 2, margenRio: 5, copaColor: '#3f8f4a',
        evitar: [LUMA, NIDO, ABUELA, PAPA, MESA].concat(IDS.map(i => SITIOS[i]), IDS.map(i => ({ x: SITIOS[i].x - 3, z: SITIOS[i].z }))) },
      oceano: { color: '#4a9ab8', y: -2.6 },
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
          hasta: { mision: 'lee_tierra' }, guia: G => { const S = G.S, i = IDS.find(k => !S.collected.includes(lee(k))); return G.misiones.at('sitio_' + (i || IDS[0])); } },
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
      fin: () => 'Leíste la tierra, escuchaste primero y probaste la casa hasta que aguantó. La abuela ya entró y el nido del papá está seco y en alto.',
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
    // Sin hallazgos propios: la parada del nido es una charla con fuente (abajo)
    diario: { titulo: 'Cuaderno del terreno', corto: 'Cuaderno', boton: 'Cuaderno', categorias: { terreno: { nombre: 'Terreno', desconocido: 'Un sitio', sonido: 'pickup', rafaga: 'feathers' } }, entradas: [], hitos: [] },
    ropa: [
      { clave: 'lentes:#2b2b2b:binoculares', hito: 'tierra', nombre: 'Lentes binoculares', pista: 'leer la tierra', viste: { slot: 'eyes', id: 'lentes', color: '#2b2b2b', style: 'binoculares' } },
      { clave: 'mano:cuaderno', hito: 'escuchar', nombre: 'Cuaderno de campo', pista: 'escuchar primero', viste: { slot: 'hand', id: 'mano', color: '#2f8f4e', style: 'cuaderno' } },
      { clave: 'casco:constructor', hito: 'casa', nombre: 'Casco de constructor', pista: 'una casa que aguanta', viste: { slot: 'head', id: 'casco', color: '#f2c21a', style: 'constructor' } },
      { clave: 'botas:constructor', hito: 'casa', nombre: 'Botas de constructor', viste: { slot: 'feet', id: 'botas', color: '#2b2b2b', style: 'constructor' } },
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
      marca: 'UN LUGAR PARA TODOS', tituloDefecto: 'Mi episodio 2', archivo: 'ep2-mi-comic', pdfTitulo: 'Un lugar para todos',
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

      // ---------- Iguaca: da cada misión y, en medio, una pista del paso en curso ----------
      function hablar() {
        if (S.step === 0) { G.dialogo.say(L('interact:iguaca'), () => G.misiones.advanceTo(1)); return; }
        if (S.step === 1) { G.dialogo.say([Lu('Mira los 3 sitios: el llano, la loma y el claro. Llevas ' + leidos().length + ' de 3.')]); return; }
        if (S.step === 2) {
          G.eventos.log('SiteChosen'); G.comic.capture('sitio'); G.audio.play('unlock');
          G.dialogo.say(L('evento:SiteChosen'), () => { G.misiones.advanceTo(3); G.ui.toast('Enséñale tu plano a la abuela', 3000); });
          return;
        }
        const pistas = {
          3: 'La abuela está junto al agua. Enséñale tu plano.',
          4: 'Pregunta con preguntas abiertas: las que empiezan por «cómo», «qué» o «por qué» dan más respuesta que un sí o un no.',
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
      for (const id of IDS) {
        const s = SITIOS[id], y = H(s.x, s.z);
        const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 6), new THREE.MeshLambertMaterial({ color: '#8a6a3a' }));
        poste.position.set(s.x, y + 1.1, s.z); G.renderer.scene.add(poste);
        const cinta = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.3), new THREE.MeshLambertMaterial({ color: '#d6403a', side: THREE.DoubleSide }));
        cinta.position.set(s.x + 0.5, y + 2, s.z); G.renderer.scene.add(cinta);
        G.interaccion.add({ id: 'sitio_' + id, x: s.x, z: s.z, r: 2.4,
          visible: () => S.step === 1 && !elegido(),
          label: () => leidos().length === 3 ? 'Elegir ' + s.nombre : 'Observar ' + s.nombre,
          use: () => {
            if (!tiene(lee(id))) {
              S.collected.push(lee(id)); G.eventos.log('TerrainRead'); G.misiones.check(); G.audio.play('pickup');
              G.dialogo.say([di('Vittata', `En ${s.nombre}: pendiente ${s.pendiente}; ${s.suelo}; viento ${s.viento}.`)]);
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
        elegir('Vittata', 'Le pregunto a ' + (quien === 'abuela' ? 'la abuela' : 'el papá') + '…', abiertas.map(p => ({ label: p.q, p })), o => {
          const p = o.p, nueva = p.tarjeta && !tiene('nec_' + p.tarjeta);
          if (!p.tarjeta) cerradas.add(p.q);
          if (nueva) { poner('nec_' + p.tarjeta); G.audio.play('pickup'); }
          G.misiones.check();
          const lineas = [di(nombre, p.r)];
          if (nueva) lineas.push(di('Vittata', 'Lo anoto en una tarjeta: «' + TARJETAS[p.tarjeta].texto + '».'));
          else if (!p.tarjeta) lineas.push(di('Vittata', 'Mmm… a esa solo se puede contestar sí o no. Pruebo con otra.'));
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
      G.interaccion.add({ id: 'abuela', x: ABUELA.x, z: ABUELA.z, r: 2.4, label: () => S.step === 3 ? 'Enseñar el plano a la abuela' : S.step === 4 ? 'Preguntar a la abuela' : 'Hablar con la abuela', use: abuela });
      G.interaccion.add({ id: 'papa', x: PAPA.x, z: PAPA.z, r: 2.4, label: () => S.step === 4 ? 'Preguntar al papá' : 'Hablar con el papá', use: papa });

      // La mesa: cada tarjeta, ¿criterio o restricción? Si no acierta, una pista y se vuelve a preguntar (sin castigo)
      function ordenar() {
        const k = ORDEN.find(t => !tiene('ord_' + t));
        if (!k) { choque(); return; }
        const t = TARJETAS[k], quien = t.tipo === 'restriccion' ? 'Iguaca te da' : 'Tarjeta';
        elegir('Iguaca', `${quien}: «${t.texto}». ¿Es un criterio (lo que la casa debe lograr) o una restricción (un límite que no se puede saltar)?`,
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
          poner('frase_' + o.v); G.eventos.log('ListenChoice', { choice: FRASES[o.v] }); G.comic.capture('escuchar'); G.audio.play('unlock');
          G.dialogo.say([di('Vittata', FRASES[o.v] + ' Abajo, la entrada baja para la abuela; arriba, el nido del papá.')].concat(L('evento:ListenChoice')), () => G.misiones.check());
        }));
      }
      G.interaccion.add({ id: 'mesa', x: MESA.x, z: MESA.z, r: 2.4, visible: () => S.step >= 5,
        label: () => S.step === 5 ? 'Ordenar las tarjetas' : 'Mirar las tarjetas',
        use: () => {
          if (S.step === 5) { ordenar(); return; }
          const c = ORDEN.filter(k => TARJETAS[k].tipo === 'criterio').map(k => TARJETAS[k].texto), r = ORDEN.filter(k => TARJETAS[k].tipo === 'restriccion').map(k => TARJETAS[k].texto);
          G.dialogo.say([di('Vittata', 'Criterios: ' + c.join(', ') + '.'), di('Vittata', 'Restricciones: ' + r.join(', ') + '.')]);
        } });
      const mesa = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 1), new THREE.MeshLambertMaterial({ color: '#8a6a3a' }));
      mesa.position.set(MESA.x, H(MESA.x, MESA.z) + 0.4, MESA.z); G.renderer.scene.add(mesa);

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
        const boceto = valor('boceto_', Object.keys(BOCETOS));
        if (!boceto) {
          elegir('Vittata', 'Dos bocetos de dos niveles. ¿Cuál cumple más tarjetas?', Object.keys(BOCETOS).map(k => ({ label: BOCETOS[k].label, k })), o => {
            poner('boceto_' + o.k); G.audio.play('tick'); dibujarCasa();
            G.dialogo.say([di('Vittata', 'Voy con ' + BOCETOS[o.k].corto + '. Uso la madera y la paja que tenemos y el banco de trabajo. [KELVIN: qué materiales pasan del ep. 1]')], construir);
          });
          return;
        }
        const d = DECISIONES.find(x => !valor('dec_' + x.parte + '_', x.opciones.map(o => o[0])));
        if (!d) { poner('dec_base'); poner('dec_paredes'); poner('dec_techo'); poner('dec_anclaje'); G.misiones.check(); G.ui.toast('Falta el nido del papá', 3000); return; }
        elegir('Vittata', d.pregunta, d.opciones.map(o => ({ label: o[1], v: o[0] })), o => {
          poner('dec_' + d.parte + '_' + o.v); G.audio.play('tick'); G.fx.burst(obra.x, H(obra.x, obra.z) + 1, obra.z, 'feathers', 10); dibujarCasa(); construir();
        });
      }
      function armarNido(i) {
        i = i || 0; const p = NIDO_PASOS[i];
        if (!p) {
          poner('nido_listo'); G.eventos.log('HomeBuilt'); G.audio.play('unlock'); dibujarCasa(); G.misiones.check();
          G.dialogo.say([di('Papá', 'Alto, oscuro y seco. Así sí.'), Lu('La casa está hecha. ¿Aguantará? Solo hay una forma de saberlo.')]);
          return;
        }
        const ops = i % 2 ? [{ label: p.mal, ok: false }, { label: p.bien, ok: true }] : [{ label: p.bien, ok: true }, { label: p.mal, ok: false }];
        elegir('Vittata', p.pregunta, ops, o => {
          if (!o.ok) { G.audio.play('wrong'); G.dialogo.say([di('Papá', p.papa)], () => armarNido(i)); return; }
          G.audio.play('tick'); armarNido(i + 1);
        });
      }
      function tormenta(lineas, done) {
        G.fx.rain.visible = true;
        G.dialogo.say(lineas, () => { G.fx.rain.visible = false; done(); });
      }
      function prueba1() {
        const f = falla();
        poner('falla_' + f.parte); dibujarCasa();
        tormenta([di('Guardián', '¡Llega la tormenta! Viento, lluvia… y la casa nueva en medio.'), di('Vittata', '¡Algo cede! ' + f.que),
          Lu('Lo marqué en rojo. No pasa nada: para eso se prueba. Ahora sabes cuál es la parte más débil.')], () => {
          G.eventos.log('StormTested', { outcome: 'falla:' + f.parte }); G.misiones.check();
        });
      }
      function mejorar() {
        const f = falla();
        elegir('Iguaca', 'Cambia solo una parte. ¿Cuál?', Object.keys(ARREGLOS).map(k => ({ label: ARREGLOS[k], k })), o => {
          if (o.k !== f.arreglo) {
            G.audio.play('wrong');
            G.dialogo.say([Lu('Eso no fue lo que falló. Mira lo que marcó la tormenta: ' + f.que)], mejorar);
            return;
          }
          poner('mejora_' + o.k); G.audio.play('unlock'); dibujarCasa();
          G.eventos.log('HomeImproved', { choice: o.k });
          G.dialogo.say([di('Vittata', ARREGLOS[o.k] + '. Listo. ¿Y ahora?'), Lu('Ahora se vuelve a probar. Una sola prueba no basta.')], () => G.misiones.check());
        });
      }
      function prueba2() {
        tormenta([di('Guardián', 'Otra vez el viento y la lluvia…'), di('Vittata', '¡Aguanta! Ni una gota en el nido.')], () => {
          G.eventos.log('StormTested', { outcome: 'aguanta' });
          G.eventos.log('NestPlaced'); poner('fiesta'); dibujarCasa(); G.comic.capture('casa'); G.misiones.check();
          const y = H(obra.x, obra.z);
          G.fx.burst(obra.x, y + 3, obra.z, 'gold', 40); G.fx.burst(obra.x, y + 3, obra.z, 'feathers', 30); G.audio.play('unlock');
          S.complete = true; G.eventos.log('Chapter2Completed');
          G.misiones.advanceTo(G.misiones.DONE);
          G.dialogo.say(L('evento:Chapter2Completed'), () => G.misiones.showEnd());
        });
      }

      // La casa se dibuja con lo que hay en S.collected (se rehace al cargar la partida): boceto, base, paredes, techo, nido y fallo
      const casa = new THREE.Group(); G.renderer.scene.add(casa);
      const mat = c => new THREE.MeshLambertMaterial({ color: c });
      const caja = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y, z); casa.add(m); return m; };
      function dibujarCasa() {
        while (casa.children.length) { const m = casa.children.pop(); m.geometry.dispose(); m.material.dispose(); }
        const s = SITIOS[elegido()];
        if (!s) return;
        obra.x = s.x - 3; obra.z = s.z;
        const boceto = valor('boceto_', Object.keys(BOCETOS));
        casa.position.set(obra.x, H(obra.x, obra.z), obra.z);
        if (!boceto) return;
        const fallo = ['base', 'paredes', 'techo'].find(p => tiene('falla_' + p) && !tiene('mejora_' + falla().arreglo));
        const rojo = p => fallo === p ? '#d6403a' : null;
        const torre = boceto === 'torre', w = torre ? 2 : 3.2, h = torre ? 3.2 : 1.8;
        const base = valor('dec_base_', ['pilotes', 'piedra']), paredes = valor('dec_paredes_', ['tablas', 'trenzado']);
        const techo = valor('dec_techo_', ['dos', 'una']);
        let y = 0;
        if (base === 'pilotes') { const alto = tiene('mejora_base') ? 1.2 : 0.7; for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) caja(0.18, alto, 0.18, rojo('base') || '#6b4a2a', dx * (w / 2 - 0.2), alto / 2, dz * (w / 2 - 0.2)); y = alto; }
        else if (base === 'piedra') { caja(w + 0.3, tiene('mejora_base') ? 0.9 : 0.4, w + 0.3, rojo('base') || '#8d8a82', 0, tiene('mejora_base') ? 0.45 : 0.2, 0); y = tiene('mejora_base') ? 0.9 : 0.4; }
        if (!paredes) return;
        caja(w, h, w, rojo('paredes') || (paredes === 'tablas' ? '#a87c4f' : '#c9a86a'), 0, y + h / 2, 0);
        if (torre) caja(1.6, 1.4, 1.6, paredes === 'tablas' ? '#a87c4f' : '#c9a86a', w / 2 + 0.8, y + 0.7, 0); // el anexo con la entrada baja
        else caja(1.4, 1.1, 1.4, paredes === 'tablas' ? '#a87c4f' : '#c9a86a', 0, y + h + 0.55, -0.4); // el altillo del nido
        caja(0.7, 0.9, 0.05, '#3b2a1a', torre ? w / 2 + 0.8 : 0, y + 0.45, (torre ? 0.8 : w / 2) + 0.03); // la puerta baja
        const top = y + h + (torre ? 0 : 1.1);
        if (techo) {
          const levantado = fallo === 'techo', c = rojo('techo') || '#7a5a2a';
          const t = techo === 'dos' ? new THREE.Mesh(new THREE.ConeGeometry(w * 0.85, 1.2, 4), mat(c)) : new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.15, w + 0.4), mat(c));
          if (techo === 'dos') t.rotation.y = Math.PI / 4; else t.rotation.x = 0.25;
          t.position.set(0, top + (techo === 'dos' ? 0.6 : 0.2) + (levantado ? 0.8 : 0), 0); if (levantado) t.rotation.z = 0.35;
          casa.add(t);
          if (tiene('dec_anclaje_si') || tiene('mejora_anclaje') || tiene('mejora_techo')) for (const dx of [-1, 1]) caja(0.05, top - y, 0.05, '#d9c79a', dx * (w / 2 + 0.03), y + (top - y) / 2, w / 2 + 0.03);
        }
        if (tiene('nido_listo')) caja(0.45, 0.55, 0.45, '#5a3d22', torre ? 0 : 0.3, top - 0.6, torre ? -w / 2 - 0.2 : -0.4 - 0.75);
        if (tiene('fiesta')) for (let i = 0; i < 6; i++) caja(0.3, 0.2, 0.02, ['#d6403a', '#ffffff', '#0a50a1'][i % 3], -w / 2 + i * w / 5, top + 0.1, w / 2 + 0.25);
      }
      G.on('apply', dibujarCasa, 75);
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
        const S = G.S, $ = G.util.$, { check, result } = T.runner(), { tick, drain, useAt } = T;
        const keep = T.keepSave();
        // Pulsa la opción de la tarjeta de elección cuyo texto contiene `txt`; luego pasa los diálogos
        const pick = txt => { const b = [...document.querySelectorAll('[id^="ch-"]')].find(x => x.textContent.includes(txt)); if (b) b.click(); drain(); return !!b; };
        const opciones = () => [...document.querySelectorAll('[id^="ch-"]')].map(b => b.textContent);
        G.quiet = true; G.guardado.reset(true);
        check('Crea el personaje', G.creador.saveCharacter({ name: 'Prueba', preset: 'agilis', outfit: 'azul', accessory: 'ninguno' }) === null);
        check('Empieza en el paso 1 de 11', S.step === 0 && $('steps').children.length === 11);
        check('Los marcadores [KELVIN] no son canon: están en los diálogos', JSON.stringify(G.pack.dialogos.datos()).includes('[KELVIN') );
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
        pick('Reforzar el techo');
        check('M3 · Mejorar otra parte no vale: pista y se repite', !G.eventos.had('HomeImproved') && opciones().length === 4);
        pick('Amarrar el techo');
        check('M3 · Cambia solo lo que falló', G.eventos.had('HomeImproved') && S.step === 10, 'paso ' + S.step);
        useAt('obra'); drain();
        check('M3 · Prueba 2: aguanta, nido, casco y botas', G.eventos.had('NestPlaced') && S.missions.casa && ['casco:constructor', 'botas:constructor'].every(k => S.unlocked.includes(k)));
        check('Final: fiesta y pantalla de fin', S.complete && S.step === G.misiones.DONE && G.eventos.had('Chapter2Completed') && !$('end').hidden);
        check('El cómic sale de los eventos', G.comic.comicPanels().length === 4, G.comic.comicPanels().length);
        G.guardado.save(true); const snap = G.guardado.serialize(); G.guardado.reset(true);
        try { localStorage.setItem(G.guardado.KEY, snap); } catch (e) { /* sin almacenamiento */ }
        check('Guardar y cargar', G.guardado.load(true) && S.complete && S.collected.includes('sitio_c') && S.collected.includes('mejora_anclaje'));
        G.guardado.reset(true);
        T.restoreSave(keep);
        G.quiet = false;
        return result();
      },
    },
  });
})();
