/* Content pack EP6 · «El pacto de los 36» · jugable de principio a fin: «Cada quien con lo suyo», «Nadie lo levanta solo» y
   «El círculo», más el Aula del episodio (EP6_MISIONES.md §5–7): «Iguaca te pregunta» (formativa, opcional, sin puntaje), el
   Modo Maestro (src/game/aula.js con lecciones.js) y el Diario y el criadero del ep. 6. Sale de content/plantilla como los eps. 2–4
   y reutiliza el motor tal cual (nada de src/ tocado): mundo analítico con la plaza de Villa Raíz, el río con sus muelles y el
   puente de madera (la obra de M2), el mirador y su luz. Las canoas de quien llega son el modelo «canoa» del kit (ep. 3).
   Diseño: docs/equipo/EP6_GDD.md, EP6_NARRATIVA.md y EP6_MISIONES.md (tarea AL1). Ábrelo con index.html?pack=ep6 (o desde la portada).
   Lo que depende del canon de Kelvin (EP6_GDD.md §10) queda con la opción por defecto del GDD y marcado [KELVIN] en un
   comentario o en «nota», nunca en el texto que lee el jugador:
     [KELVIN-1] Llegan 6 guardianes con tarjeta y voz, inspirados en 6 especies vivas del catálogo (Mira · versicolor, Roca · guildingii,
                Marea · arausiaca, Nudo · ventralis, Eco · collaria, Brote · barbadensis) y dos grupos más (isla alta e isla baja).
                Sus habilidades son del personaje, no de la especie. Retratos sustitutos (agilis/vittata) hasta tener los renders.
     [KELVIN-2] El pacto no tiene objeto: es una promesa que se dice entre todos al final (frase provisional de EP6_NARRATIVA.md).
     [KELVIN-3] Las dos voces extintas hablan desde el transmisor y no tienen asiento propio: quedan entre los que esperan.
     [KELVIN-4] El encuentro es en la plaza de Villa Raíz. [KELVIN-5] Los grupos: isla alta (mirador, volver mañana) e isla baja
                (plaza, volver hoy); nadie tiene la culpa. [KELVIN-6] El Guardián recuerda a medias y deja que lo cuenten entre todos.
     [KELVIN-7] Vittata no queda con título. [KELVIN-8] Quedan 14 asientos esperando (36 − 22 llegados); gancho «La tripulación».
     [KELVIN-9] Martinicana y violacea no se formalizan como consejeras aquí. [KELVIN-10] Recompensa final: la pava; sin música concreta.
     [KELVIN-11] El cómic de cierre de temporada no se hace aquí (se deja para la temporada 6).
   La simulación del plan es determinista (valores del juego, sin azar): cada tarea dura lo que dice su tarjeta. El inglés va en
   content/ep6/en.js (pack.idioma, después del de cap1). Todo el estado va en S.collected (se guarda solo). */
(function () {
  'use strict';
  // ---------- Mapa (relieve analítico de abajo) ----------
  const MAR = -2.6, RIO_X = 20;
  const PLAZA = { x: 0, z: 0 }, TALLER = { x: -7, z: 7 }, MESA = { x: -6, z: 4.5 }, IGUACA = { x: -3, z: -5 }, GUARDIAN = { x: 3.5, z: -6 };
  const MIRADOR = { x: -20, z: -20 }, TRANSMISOR = { x: 6, z: 5 };
  const MUELLE_N = { x: 15.2, z: -8 }, MUELLE_S = { x: 15.2, z: 8 }, PUENTE = { x: 20, z: 0 }, PUENTE_W = { x: 15.5, z: 0 };
  const TABLA_LARGA = { x: 11, z: -3 };
  // [KELVIN-1] Los 6 visitantes: lo que saben hacer (2) y lo que necesitan (1) son del personaje; la especie solo da la ficha (especies.js)
  const VISITANTES = [
    { id: 'mira', nombre: 'Mira', especie: 'versicolor', sprite: 'assets/agilis.png', x: 13.5, z: -10.5, sabe: ['ver lejos', 'volar alto'], necesita: 'sombra', dice: false, observa: 'Se queda en la sombra del árbol y no se mueve de ahí.',
      presenta: 'Soy Mira. Desde arriba veo las islas, una por una. Lo que necesito… ya lo verás.' },
    { id: 'roca', nombre: 'Roca', especie: 'guildingii', sprite: 'assets/vittata.png', x: 16.5, z: -11, sabe: ['cargar fuerte', 'explicar con calma'], necesita: 'alguien que mire desde arriba', dice: true,
      presenta: 'Roca. Cargo lo que haga falta y explico despacio. Pero no vuelo alto: necesito a alguien que mire desde arriba.' },
    { id: 'marea', nombre: 'Marea', especie: 'arausiaca', sprite: 'assets/agilis.png', x: 13.5, z: 10.5, sabe: ['conocer el agua', 'remar'], necesita: 'un nudo que aguante', dice: false, observa: 'Mira al río todo el tiempo y sujeta la soga de su canoa con el pico.',
      presenta: 'Me llaman Marea. Conozco el agua y remo contra la corriente. Lo demás… ya se verá.' },
    { id: 'nudo', nombre: 'Nudo', especie: 'ventralis', sprite: 'assets/vittata.png', x: 16.5, z: 11, sabe: ['atar nudos', 'tejer redes'], necesita: 'saber cómo va el agua', dice: true,
      presenta: 'Nudo. Ato y tejo. Pero para tejer una red buena necesito saber cómo va el agua, y de eso no sé.' },
    { id: 'eco', nombre: 'Eco', especie: 'collaria', sprite: 'assets/agilis.png', x: 6, z: -9, sabe: ['avisar fuerte', 'volar alto'], necesita: 'que le expliquen con calma', dice: true,
      presenta: '¿Tú eres Vittata? ¿Y ese puente? ¿Y la luz de allá? Soy Eco: aviso fuerte y vuelo alto. Pero necesito que me expliquen las cosas con calma.' },
    { id: 'brote', nombre: 'Brote', especie: 'barbadensis', sprite: 'assets/vittata.png', x: -6, z: -9, sabe: ['aprender rápido', 'dar sombra con su hoja'], necesita: 'que le enseñen', dice: true,
      presenta: 'Soy Brote, el más nuevo. Aprendo rápido y traigo una hoja grande que da sombra. Necesito que me enseñen.' },
  ];
  const PAREJAS = [['mira', 'brote'], ['roca', 'eco'], ['marea', 'nudo']]; // las tres parejas que se cubren una a la otra
  const PAREJA_TXT = { 'mira+brote': 'Mira ve lejos y le enseña a Brote; Brote le da sombra con su hoja.', 'roca+eco': 'Eco mira desde arriba por Roca; Roca le explica las cosas con calma.', 'marea+nudo': 'Marea le cuenta a Nudo cómo va el agua; Nudo le ata un nudo que aguanta.' };
  const OBSERVAR = { mira: 'obs_sombra', marea: 'obs_rio' };
  const ICONO = { 'ver lejos': '👁', 'volar alto': '☁', 'cargar fuerte': '💪', 'explicar con calma': '💬', 'conocer el agua': '🌊', 'remar': '🛶', 'atar nudos': '🪢', 'tejer redes': '🕸', 'avisar fuerte': '📣', 'aprender rápido': '🌱', 'dar sombra con su hoja': '🍃',
    'sombra': '🍃', 'alguien que mire desde arriba': '👁', 'un nudo que aguante': '🪢', 'saber cómo va el agua': '🌊', 'que le expliquen con calma': '💬', 'que le enseñen': '🌱' };

  // ---------- Misión 2 · el plan (valores del juego; simulación determinista) ----------
  const PERSONAS = [
    { id: 'vittata', nombre: 'Vittata' }, { id: 'aprendiz', nombre: 'Aprendiz' },
    { id: 'roca', nombre: 'Roca' }, { id: 'mira', nombre: 'Mira' }, { id: 'nudo', nombre: 'Nudo' }, { id: 'brote', nombre: 'Brote' },
  ];
  const TAREAS = [
    { id: 'cargar', titulo: 'Cargar las tablas', dura: 2, puede: ['roca'], atasco: 'Las tablas no se mueven: hace falta alguien que cargue fuerte.' },
    { id: 'sostener', titulo: 'Sostener la tabla grande', dura: 2, puede: ['vittata', 'aprendiz', 'roca', 'nudo'], atasco: 'La tabla grande se tambalea: hace falta alguien que sostenga.' },
    { id: 'atar', titulo: 'Atar los nudos', dura: 2, puede: ['nudo', 'vittata'], atasco: 'Los nudos se sueltan: hace falta alguien que sepa atar (o que aprenda junto a quien sabe).' },
    { id: 'revisar', titulo: 'Revisar desde arriba', dura: 2, puede: ['mira', 'vittata'], atasco: 'Nadie ve el puente entero: hace falta alguien que vuele alto.' },
    { id: 'avisar', titulo: 'Avisar al río cuando esté listo', dura: 1, puede: ['vittata', 'aprendiz', 'mira', 'brote'], atasco: 'En el río nadie se entera: hace falta alguien que avise.' },
  ];
  const PLAN_TXT = {
    rapido: { nombre: 'El plan rápido', que: 'Cada uno en lo que mejor sabe hacer. Es el más corto, pero el más nuevo se queda mirando.' },
    ensena: { nombre: 'El plan que enseña', que: 'El más nuevo trabaja junto a quien sabe. Tarda un poco más y mañana ya sabrá hacerlo.' },
    descansa: { nombre: 'El plan que descansa', que: 'Nadie hace dos cosas seguidas. Hace falta una persona más: tu aprendiz entra en la obra, y va a su paso.' },
  };
  const CRITERIOS = [['objetivo', 'El puente aguanta a todos'], ['limite1', 'Nadie hace algo que no puede'], ['limite2', 'Se termina antes de la noche']];

  // ---------- Misión 3 · la mediación y el círculo ----------
  // [KELVIN-5] Dos grupos de dos islas; los dos tienen razones buenas
  const GRUPOS = {
    alta: { who: 'Vocera de la isla alta', quiere: 'Reunirnos en el mirador y volver mañana. Desde arriba, quien llegue tarde nos ve y nos encuentra.',
      opciones: [['bien', 'Quieren el mirador para que quien llegue tarde los vea, y volver mañana.'], ['mal1', 'Quieren el mirador porque es más bonito.'], ['mal2', 'No quieren reunirse con los de la isla baja.']],
      corrige: 'No es eso. Es que desde arriba nos ven los que todavía faltan.', bien: 'Eso es. Gracias por escucharlo bien.' },
    baja: { who: 'Vocero de la isla baja', quiere: 'Reunirnos en la plaza y volver hoy al atardecer. Los mayores no suben la cuesta, y en casa quedaron algunos solos.',
      opciones: [['bien', 'Quieren la plaza para que los mayores lleguen, y volver hoy por los que quedaron solos.'], ['mal1', 'Quieren la plaza porque tienen prisa.'], ['mal2', 'No quieren subir al mirador por pereza.']],
      corrige: 'No es eso. Es que abajo llegan todos, y en casa nos esperan.', bien: 'Así mismo. Gracias por decirlo con tus palabras.' },
  };
  const COMPARTEN = [['bien', 'Los dos quieren que nadie se quede fuera.'], ['mal1', 'Los dos quieren mandar.'], ['mal2', 'Los dos quieren irse ya.']];
  const PROPUESTAS = [
    ['alta', 'La de la isla alta: el mirador, y volver mañana', 'La isla alta queda contenta; la isla baja, paciente. Nadie se va.'],
    ['baja', 'La de la isla baja: la plaza, y volver hoy', 'La isla baja queda contenta; la isla alta, paciente. Nadie se va.'],
    ['mezcla', 'Una mezcla: la plaza hoy, y una luz desde el mirador para quien falte', 'Tarda más y todos quedan un poco incómodos. Pero nadie se queda fuera y nadie se va.'],
  ];
  const FORMAS = [
    ['6x6', '6 filas de 6', 'Cabe justa en la plaza.', 'Los de atrás no ven a los de adelante.'],
    ['4x9', '4 filas de 9', 'Cabe junto al río.', 'Los de las puntas quedan lejos.'],
    ['3x12', '3 filas de 12', 'Cabe junto al río, bien pegada.', 'Los de las puntas quedan todavía más lejos.'],
    ['anillo', 'Un anillo de 36', 'Todos se ven las caras.', 'Ocupa toda la plaza y no queda sitio para el público.'],
  ];
  // Quién se sienta: 6 visitantes, 2 voceros (cada uno con 5 más de su isla), Vittata, Iguaca, el Guardián y el aprendiz = 22 [KELVIN-8]
  const ASIENTOS = { mira: 1, roca: 1, marea: 1, nudo: 1, eco: 1, brote: 1, alta: 6, baja: 6 };
  const SENTABLES = Object.keys(ASIENTOS), FIJOS = 4;

  const svgURI = cuerpo => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' + cuerpo + '</svg>');
  // Retrato neutro de las dos voces (como el del cap. 1): hablan desde el transmisor [KELVIN-3]
  const RETRATO_VOCES = svgURI('<circle cx="55" cy="30" r="27" fill="#10241c"/><circle cx="55" cy="30" r="27" fill="none" stroke="#7fd3c8" stroke-width="1.2" opacity=".6"/><circle cx="47" cy="30" r="5" fill="#ffd27a"/><circle cx="63" cy="30" r="5" fill="#ffd27a"/><circle cx="55" cy="30" r="20" fill="none" stroke="#ffd27a" stroke-width="1.5" opacity=".5"/>');
  const IMG = { Iguaca: 'assets/luma.png', Vittata: 'assets/vittata.png', 'Guardián': 'assets/guardian.png', Voces: RETRATO_VOCES, Aprendiz: 'assets/vittata.png',
    'Vocera de la isla alta': 'assets/agilis.png', 'Vocero de la isla baja': 'assets/vittata.png' };
  for (const v of VISITANTES) IMG[v.nombre] = v.sprite;
  const di = (who, text) => ({ who, img: IMG[who], text });
  const Lu = t => di('Iguaca', t), Vi = t => di('Vittata', t), Gu = t => di('Guardián', t);

  const DIALOGOS = { escenas: [
    { id: 'e_inicio', disparador: 'inicio:ep6', personaje: 'Iguaca', emocion: 'pensando', nota: '[KELVIN-1: cuántos llegan y de dónde]',
      lineas: ['… once, doce… La cadena de señales sigue encendida hasta la niebla, y hay luces nuevas en el horizonte.', 'Una canoa asoma por el río. Y detrás, alguien volando bajo.'] },
    { id: 'e_inicio_v', disparador: 'inicio:ep6', personaje: 'Vittata', emocion: 'idea', lineas: ['Llegan hoy. Yo preparo el puente, la comida, los sitios…', 'Es más rápido si lo hago yo. ¡A los muelles!'] },
    { id: 'e_tarjetas', disparador: 'evento:CardsFilled', personaje: 'Vittata', emocion: 'pensando', lineas: ['Se quedaron hablando sin mí. No me necesitaron para eso.'] },
    { id: 'e_tarjetas_i', disparador: 'evento:CardsFilled', personaje: 'Iguaca', emocion: 'feliz', lineas: ['Sí te necesitaron. Para presentarlos.', 'Ahora el puente. Te espero allí con el cuaderno.'] },
    { id: 'e_atasco', disparador: 'evento:PlanStuck', personaje: 'Roca', emocion: 'pensando', lineas: ['¿Puedo?'] },
    { id: 'e_levantada', disparador: 'evento:RaisedTogether', personaje: 'Vittata', emocion: 'feliz', lineas: ['Subió. Entre todos subió.', 'Mañana te toca a ti revisar desde arriba, Brote.'] },
    { id: 'e_grupos', disparador: 'evento:GroupsListened', personaje: 'Iguaca', emocion: 'feliz', lineas: ['Los dos querían lo mismo y lo decían distinto. Ahora, a sentar a los 36.'] },
    { id: 'e_fin', disparador: 'evento:Chapter6Completed', personaje: 'Iguaca', emocion: 'feliz', lineas: ['Conociste a cada uno, armaste un plan que funcionó y escuchaste antes de proponer. Cuando quieras, te hago unas preguntas. Sin prisa y sin nota.'] },
  ] };

  AVE.registerPack({
    id: 'ep6',
    archivos: ['lecciones.js'], // la lección del Aula (window.AV_LECCIONES_EP6); boot.js la carga después de este archivo
    idioma: ['content/cap1/en.js', 'content/ep6/en.js'], // inglés: el diccionario común y el del episodio (solo si el idioma es EN)
    meta: {
      titulo: 'El pacto de los 36', capitulo: 6, almacen: 'ep6',
      hud: { capitulo: 'Capítulo 6 · Villa Raíz', titulo: 'El pacto de los 36', portada: 'Capítulo 6 · El pacto de los 36',
        etiqueta: 'Capítulo 6 · content/ep6/pack.js', fin: '¡El pacto, renovado!',
        nota: 'Capítulo 6: recibe a los guardianes que llegan y ayúdalos a trabajar juntos. No uses tu nombre real.', inventario: {} },
    },
    jugador: { nombre: 'Vittata', sprite: 'assets/vittata.png', especie: 'vittata', altura: 1.75, aparicion: { x: -16, z: -16 }, camara: 0.6 },
    guardado: { version: 1, claves: ['edu', 'plan'], estado: () => ({ edu: { inicio: null, fin: null, fichas: [], formativa: {}, registro: null }, plan: null }) },
    aula: { clave: 'amazonaverse.aula.ep6', estado: 'edu', archivo: 'amazonaverse_ep6', lecciones: () => window.AV_LECCIONES_EP6 },
    // Criadero: el mismo del cap. 1 (la cría sigue a Vittata); el nido entra con las tarjetas llenas. Ninguna cápsula se compra.
    // obtener.ep6 = { mision: 'circulo' } en content/comun/huevos.js queda como pedido aparte (EP6_MISIONES.md §7).
    criadero: { desde: 'CardsFilled', almacen: 'amazonaverse' },

    mundo: {
      tamano: 46, segmentos: 92,
      exposicion: 0.74,
      cielo: { color: '#c3e2f0', cenit: '#2a7fd4', sol: '#fff1cf', niebla: [40, 1000], nieblaAltura: [8, 70] },
      luces: { cielo: '#cfe6ff', suelo: '#45602e', hemi: 0.66, sol: '#fff0d6', solInt: 2.0, solPos: [-42, 70, 46] },
      post: { saturacion: 1.08, contraste: 1.04, bloom: 0.2, vineta: 0.16 },
      mar: { laguna: '#86e3cf', somero: '#1fa9ad', hondo: '#0b4f86' },
      lugares: { inicio: { x: -16, z: -16, r: 5 }, plaza: { x: PLAZA.x, z: PLAZA.z, r: 11 }, taller: { x: TALLER.x, z: TALLER.z, r: 4 }, mirador: { x: MIRADOR.x, z: MIRADOR.z, r: 2.5 },
        muelleN: { x: 14.5, z: -9.5, r: 3.5 }, muelleS: { x: 14.5, z: 9.5, r: 3.5 }, orillaE: { x: 27, z: 0, r: 3 } },
      terreno: {
        ondas: [{ fn: 'sin', x: 0.09, amp: 0.25 }, { fn: 'cos', z: 0.07, amp: 0.2 }],
        relieves: [
          { tipo: 'cauce', x: RIO_X, mitad: 6, pendiente: 0.7 }, // el río, con los muelles y el puente
          { tipo: 'colina', x: MIRADOR.x, z: MIRADOR.z, alto: 6, ancho: 120 }, // el mirador
          { tipo: 'colina', x: 30, z: -22, alto: 2.5, ancho: 60 },
        ],
        planos: ['inicio', 'plaza', 'taller', 'mirador', 'muelleN', 'muelleS', 'orillaE'],
      },
      rio: { x: RIO_X },
      agua: { x: RIO_X, ancho: 8, color: '#5fe3d6', nivel: { x: RIO_X, z: -24, sobre: 1.6 } },
      arboles: { cantidad: 44, semilla: 23, copaCada: 2, margenRio: 6, copaColor: '#2f7d43',
        evitar: [{ x: PLAZA.x, z: PLAZA.z, r: 12 }, TALLER, MESA, IGUACA, GUARDIAN, MIRADOR, TRANSMISOR, MUELLE_N, MUELLE_S, PUENTE_W, TABLA_LARGA, { x: 27, z: 0, r: 4 }].concat(VISITANTES.map(v => ({ x: v.x, z: v.z, r: 3 }))) },
      oceano: { color: '#0b4f86', y: MAR },
    },
    npcs: [
      { id: 'iguaca', nombre: 'Iguaca', sprite: IMG.Iguaca, x: IGUACA.x, z: IGUACA.z, escala: 2.2, flota: true },
      { id: 'guardian', nombre: 'Guardián', sprite: IMG['Guardián'], x: GUARDIAN.x, z: GUARDIAN.z, escala: 2.4 }, // [KELVIN-6: qué forma tiene]
      { id: 'alta', nombre: 'Vocera de la isla alta', sprite: IMG['Vocera de la isla alta'], x: -4, z: 9, escala: 1.8 },
      { id: 'baja', nombre: 'Vocero de la isla baja', sprite: IMG['Vocero de la isla baja'], x: 4, z: 9, escala: 1.8 },
    ].concat(VISITANTES.map(v => ({ id: v.id, nombre: v.nombre, sprite: v.sprite, x: v.x, z: v.z, escala: 1.8 }))),
    objetos: {}, recursos: [],

    historia: {
      pasos: [
        { id: 'muelles', texto: 'Baja a los muelles y recibe a quien llega', guia: G => G.misiones.at('v_mira') },
        { id: 'conocer', texto: 'Conoce a los 6 visitantes', progreso: S => ` (${VISITANTES.filter(v => S.collected.includes('conocido_' + v.id)).length}/6)`,
          hasta: { recogido: VISITANTES.map(v => 'conocido_' + v.id) }, guia: G => { const v = VISITANTES.find(x => !G.S.collected.includes('conocido_' + x.id)); return G.misiones.at('v_' + (v ? v.id : 'mira')); } },
        { id: 'observar', texto: 'Dos no dijeron qué necesitan: obsérvalos', progreso: S => ` (${Object.values(OBSERVAR).filter(k => S.collected.includes(k)).length}/2)`,
          hasta: { recogido: Object.values(OBSERVAR) }, guia: G => G.misiones.at(G.S.collected.includes('obs_sombra') ? 'o_marea' : 'o_mira') },
        { id: 'parejas', texto: 'Presenta en la mesa a los que se cubren uno al otro', progreso: S => ` (${PAREJAS.filter(p => S.collected.includes('pareja_' + p.join('+'))).length}/3)`,
          hasta: { evento: 'CardsFilled' }, guia: G => G.misiones.at('mesa') },
        { id: 'criterios', texto: 'Ve al puente: Iguaca escribe el objetivo y los límites', hasta: { recogido: 'criterios' }, guia: G => G.misiones.at('cuaderno') },
        { id: 'plan', texto: 'Arma el plan en el tablero y pruébalo', hasta: { evento: 'PlanMade' }, guia: G => G.misiones.at('cuaderno') },
        { id: 'levantar', texto: 'Pósate en la percha vacía y da la señal', hasta: { recogido: 'levantada' }, guia: G => G.misiones.at('percha_v') },
        { id: 'tabla', texto: 'Lleva la tabla larga al puente entre dos', hasta: { evento: 'RaisedTogether' }, guia: G => G.misiones.at(G.ep6 && G.ep6.llevando() ? 'colocar' : 'tabla_larga') },
        { id: 'grupos', texto: 'Llegan dos grupos: escucha a los dos antes de proponer', hasta: { evento: 'GroupsListened' }, guia: G => G.misiones.at('grupos') },
        { id: 'forma', texto: 'Elige cómo sentar a los 36 en la plaza', hasta: { evento: 'CircleFormed' }, guia: G => G.misiones.at('marcas') },
        { id: 'sentar', texto: 'Invita a cada uno a su asiento', progreso: S => ` (${SENTABLES.filter(k => S.collected.includes('sentado_' + k)).length}/8)`,
          hasta: { recogido: SENTABLES.map(k => 'sentado_' + k) }, guia: G => { const k = SENTABLES.find(x => !G.S.collected.includes('sentado_' + x)); return G.misiones.at(k === 'alta' || k === 'baja' ? 's_' + k : 'v_' + (k || 'mira')); } },
        { id: 'pacto', texto: 'Habla con el Guardián en el centro', guia: G => G.misiones.at('guardian') },
      ],
      fin: () => 'Conociste a cada uno, armaste un plan que funcionó, escuchaste antes de proponer y sentaste a los 36. Iguaca tiene unas preguntas para ti, cuando quieras.',
    },
    misiones: [
      { id: 'conocer', titulo: 'Cada quien con lo suyo', hud: 'Hablar, observar y presentar',
        pasos: [{ texto: 'Conoce a los 6 visitantes', hasta: { recogido: VISITANTES.map(v => 'conocido_' + v.id) } }, { texto: 'Observa a los que no lo dijeron', hasta: { recogido: Object.values(OBSERVAR) } },
          { texto: 'Presenta las 3 parejas', hasta: { evento: 'CardsFilled' } }],
        recompensa: { hito: 'conocer' } },
      { id: 'obra', titulo: 'Nadie lo levanta solo', hud: 'Plan, prueba y obra',
        pasos: [{ texto: 'Objetivo y límites', hasta: { recogido: 'criterios' } }, { texto: 'Un plan que funcione', hasta: { evento: 'PlanMade' } },
          { texto: 'La tabla grande, entre tres', hasta: { recogido: 'levantada' } }, { texto: 'La tabla larga, entre dos', hasta: { evento: 'RaisedTogether' } }],
        recompensa: { hito: 'obra' } },
      { id: 'circulo', titulo: 'El círculo', hud: 'Escuchar, acordar y sentar',
        pasos: [{ texto: 'Escucha a los dos grupos', hasta: { evento: 'GroupsListened' } }, { texto: 'La forma del círculo', hasta: { evento: 'CircleFormed' } },
          { texto: 'El pacto renovado', hasta: { evento: 'PactRenewed' } }],
        recompensa: { hito: 'circulo' } },
    ],
    // Diario del ep. 6 (§7): 6 hallazgos. Lo que el niño lee aquí describe solo lo que ve; el dato de cada uno está en lecciones.js
    // (diario, mismo id): la conducta en bandada va «por verificar»; los pares de factores de 36 son aritmética y no necesitan fuente.
    diario: {
      titulo: 'Cuaderno del pacto', corto: 'Cuaderno', boton: 'Cuaderno',
      categorias: { pacto: { nombre: 'El pacto', desconocido: 'Algo del encuentro', sonido: 'pickup', rafaga: 'gold' } },
      entradas: [
        { id: 'tarjetas', cat: 'pacto', nombre: 'Tarjetas de visitante', x: MESA.x - 2, z: MESA.z - 1.5, texto: 'Seis tarjetas en la mesa: dos cosas que cada uno sabe hacer y una que necesita.',
          modelo: (add) => { for (let i = 0; i < 3; i++) add(new THREE.PlaneGeometry(0.4, 0.26), i ? '#f1e6c8' : '#ffd27a', i * 0.45 - 0.45, 0.02, 0).rotation.x = -Math.PI / 2; } },
        { id: 'plan', cat: 'pacto', nombre: 'El tablero del plan', x: PUENTE_W.x - 2, z: PUENTE_W.z + 3, texto: 'Una tabla con dos columnas: las tareas y quién las hace.',
          modelo: (add) => { add(new THREE.BoxGeometry(0.9, 0.6, 0.06), '#8a6a3a', 0, 0.5, 0); add(new THREE.BoxGeometry(0.06, 0.5, 0.06), '#6b4a2a', 0, 0.2, 0); } },
        { id: 'tabla', cat: 'pacto', nombre: 'La tabla que subió', x: 26.5, z: 2.5, texto: 'Una tabla grande con tres marcas de patas: una en cada punta y otra en el medio.',
          modelo: (add) => { add(new THREE.BoxGeometry(1.4, 0.08, 0.4), '#a87c4f', 0, 0.3, 0); for (const x of [-0.5, 0, 0.5]) add(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 6), '#6b4a2a', x, 0.15, 0); } },
        { id: 'acuerdo', cat: 'pacto', nombre: 'Dos piedras juntas', x: 0, z: 10.5, texto: 'Dos piedras de islas distintas, puestas una junto a la otra en la plaza.',
          modelo: (add) => { add(new THREE.DodecahedronGeometry(0.28, 0), '#8d8a82', -0.25, 0.25, 0); add(new THREE.DodecahedronGeometry(0.24, 0), '#b8955a', 0.25, 0.22, 0); } },
        { id: 'forma', cat: 'pacto', nombre: 'Marca de asiento', x: -9.5, z: 2, texto: 'Un círculo de cal en el suelo. Hay 36 iguales, y caben de varias formas.',
          modelo: (add) => { add(new THREE.RingGeometry(0.25, 0.36, 18), '#f4f0e0', 0, 0.02, 0).rotation.x = -Math.PI / 2; } },
        { id: 'esperan', cat: 'pacto', nombre: 'La luz que espera', x: MIRADOR.x + 2.2, z: MIRADOR.z + 1.5, texto: 'Un farolito con la llama baja. No está apagado: espera.',
          modelo: (add) => { add(new THREE.CylinderGeometry(0.08, 0.1, 0.9, 6), '#6b4a2a', 0, 0.45, 0); add(new THREE.SphereGeometry(0.14, 10, 8), '#ffd27a', 0, 1.0, 0); } },
      ],
      hitos: [{ id: 'cuaderno', todos: true }],
    },
    ropa: [
      { clave: 'mano:mapa', hito: 'conocer', nombre: 'Mapa de las tarjetas', pista: 'conocer a los que llegan', viste: { slot: 'hand', id: 'mano', color: '#c9a227', style: 'mapa' } },
      { clave: 'mano:cuaderno', hito: 'obra', nombre: 'Cuaderno del plan', pista: 'un plan que funcione', viste: { slot: 'hand', id: 'mano', color: '#2f8f4e', style: 'cuaderno' } },
      { clave: 'pava', hito: 'circulo', nombre: 'Pava de la fiesta', pista: 'el pacto renovado', viste: { slot: 'head', id: 'pava', color: '#d6403a' } }, // [KELVIN-10]
      { clave: 'mano:mapa_islas', hito: 'cuaderno', nombre: 'Mapa de las islas que faltan', pista: 'el Cuaderno completo', viste: { slot: 'hand', id: 'mano', color: '#3d8fb0', style: 'mapa' } },
    ],
    eventos: { defs: {
      PlayerCharacterCreated: { type: 'CharacterCreated', loc: 'villa', chars: ['player'], scene: 'portrait' },
      GuestsArrived: { type: 'QuestAccepted', loc: 'muelles', chars: ['vittata', 'luma'], scene: 'dialogue' },
      CardsFilled: { type: 'CharacterMet', loc: 'taller', chars: ['vittata', 'luma'], scene: 'dialogue' },
      PlanMade: { type: 'DialogueChoiceMade', loc: 'puente', chars: ['vittata'], scene: null },
      PlanStuck: { type: 'DialogueChoiceMade', loc: 'puente', chars: ['vittata'], scene: 'action' }, // solo si pasó (CharacterMoment no existe en el motor: genérico más cercano)
      RaisedTogether: { type: 'BuildingConstructed', loc: 'puente', chars: ['vittata', 'player'], scene: 'final' },
      GroupsListened: { type: 'DialogueChoiceMade', loc: 'plaza', chars: ['vittata', 'luma'], scene: 'dialogue' },
      CircleFormed: { type: 'DialogueChoiceMade', loc: 'plaza', chars: ['vittata'], scene: null }, // (PuzzleSolved no existe: genérico más cercano)
      PactRenewed: { type: 'DialogueChoiceMade', loc: 'plaza', chars: ['vittata', 'guardian', 'luma'], scene: 'final' }, // (StoryRevealed no existe)
      Chapter6Completed: { type: 'ChapterCompleted', loc: 'mirador', chars: ['vittata', 'luma', 'guardian'], scene: 'final' },
    } },
    dialogos: { datos: () => DIALOGOS, retratos: IMG, retratoDefecto: 'assets/vittata.png' },
    comic: {
      marca: 'EL PACTO DE LOS 36', tituloDefecto: 'Mi capítulo 6', archivo: 'ep6-mi-comic', pdfTitulo: 'El pacto de los 36',
      capturas: ['tarjetas', 'atasco', 'levantada', 'circulo', 'pacto'], portadas: {},
      vinetas: [
        { id: 'intro', img: 'portrait', needs: 'PlayerCharacterCreated', texto: S => `Soy ${S.profile.name}. Al amanecer llegaron los primeros por la cadena de señales.` },
        { id: 'tarjetas', img: 'tarjetas', needs: 'CardsFilled', texto: 'Cada uno trajo algo que sabe hacer y algo que necesita. Los presenté y se quedaron hablando.' },
        { id: 'atasco', img: 'atasco', needs: 'PlanStuck', texto: 'En mi primer plan solo estaba yo. La tabla se quedó a medio levantar.' },
        { id: 'levantada', img: 'levantada', needs: 'RaisedTogether', texto: S => S.collected.includes('plan_ensena') ? 'Repartimos el trabajo y el más nuevo ató el último nudo. La tabla subió.' : S.collected.includes('plan_descansa') ? 'Repartimos el trabajo sin que nadie hiciera dos cosas. La tabla subió.' : 'Cada uno en lo suyo. La tabla subió rápido.' },
        { id: 'circulo', img: 'circulo', needs: 'CircleFormed', texto: 'Escuché a los dos grupos antes de proponer. Luego elegí cómo sentar a los 36.' },
        { id: 'pacto', img: 'pacto', needs: 'Chapter6Completed', texto: 'Los asientos ocupados se encendieron. Los vacíos esperan. Anoté la tripulación.' },
      ],
    },

    inicio(G) { G.eventos.log('GuestsArrived'); G.dialogo.say(G.dialogo.L('inicio:ep6'), () => G.ui.toast('Baja a los muelles y recibe a quien llega', 3000)); },

    preparar(G) {
      const S = G.S, H = G.terreno.height, L = G.dialogo.L, scene = G.renderer.scene;
      const tiene = k => S.collected.includes(k), poner = k => { if (!tiene(k)) S.collected.push(k); };
      const elegir = (who, text, opciones, done) => G.dialogo.choose(di(who, text), opciones, done);
      const mat = c => new THREE.MeshLambertMaterial({ color: c });
      const quieto = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
      const nivelRio = () => { const y = G.agua.levelAt(RIO_X, 0); return isFinite(y) ? y : MAR; };
      const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      const conocidos = () => VISITANTES.filter(v => tiene('conocido_' + v.id));
      const parejasHechas = () => PAREJAS.filter(p => tiene('pareja_' + p.join('+')));
      const ESP = (window.AV_ESPECIES && window.AV_ESPECIES.especies) || [];
      const especieDe = v => ESP.find(e => e.id === v.especie);
      const idioma = () => (G.idioma && G.idioma.actual && G.idioma.actual()) || 'es';
      const visitante = id => VISITANTES.find(v => v.id === id);
      const nombre = id => (PERSONAS.find(p => p.id === id) || visitante(id) || { nombre: id }).nombre;

      // ---------- Aula del episodio (§5 y §6): «Iguaca te pregunta» y el registro local del Modo Maestro ----------
      const AU = G.aula, LEC = (AU.activo && AU.LEC) || {};
      const E = () => S.edu || (S.edu = { inicio: null, fin: null, fichas: [], formativa: {}, registro: null });
      const idsFormativa = () => ((LEC.formativa && LEC.formativa.seleccion && LEC.formativa.seleccion[AU.aj.grado]) || []).filter(id => AU.preguntaPublicable(AU.pregunta(id)));
      const todasPreguntadas = () => idsFormativa().every(id => (E().formativa || {})[id]);
      const planFinal = () => ['rapido', 'ensena', 'descansa'].find(k => tiene('plan_' + k)) || '';
      function objetivos() {
        const f = E().formativa || {}, ok = id => f[id] && f[id] <= 2, pre = id => f[id] != null, had = ev => G.eventos.had(ev);
        const res = [];
        if (had('CardsFilled') && (!pre('q1') || ok('q1')) && (!pre('q2') || ok('q2'))) res.push('F1');
        if (had('PlanMade') && tiene('criterios') && (!pre('q3') || ok('q3')) && (!pre('q4') || ok('q4'))) res.push('F2');
        if (had('CircleFormed') && ok('q5')) res.push('F3');
        if (had('GroupsListened') && ok('q6')) res.push('F4');
        return res;
      }
      function registrar() {
        const e = E();
        if (!AU.activo || e.inicio == null) return;
        const pregs = {}; for (const id of idsFormativa()) pregs[id] = (e.formativa || {})[id] || '';
        AU.registrar({
          misiones_completadas: ['conocer', 'obra', 'circulo'].filter(m => S.missions[m]),
          tarjetas: conocidos().length, parejas: parejasHechas().length,
          planes_probados: (S.plan && S.plan.pruebas) || 0, atasco: (S.plan && S.plan.atasco) || '', plan_final: planFinal(),
          propuesta: ['alta', 'baja', 'mezcla'].find(k => tiene('propuesta_' + k)) || '', forma: FORMAS.map(f => f[0]).find(k => tiene('forma_' + k)) || '',
          preguntas: pregs, objetivos_logrados: objetivos(),
          minutos_mision: e.fin != null ? Math.max(1, Math.round((e.fin - e.inicio) / 60)) : '',
        });
      }
      function formativa() {
        const ids = idsFormativa();
        const cab = (i, n) => `<div class="edu-head"><img class="edu-cara" src="${IMG.Iguaca}" alt=""><div><span class="eyebrow">${esc(AU.t(LEC.meta && LEC.meta.titulo))}</span><h2>${esc(AU.t({ es: 'Iguaca te pregunta', en: 'Iguaca asks you' }))}</h2></div></div>` +
          `<div class="edu-dots" aria-hidden="true">${Array.from({ length: n }, (_, k) => `<span class="${k < i ? 'ok' : k === i ? 'now' : ''}"></span>`).join('')}</div>`;
        AU.serie(ids, { cabecera: cab, alResponder: registrar, alTerminar: () => {
          G.ui.hideCard(); registrar();
          G.dialogo.say([Lu('¡Eso es pensar en grupo! Conocer, repartir y escuchar antes de proponer.')]);
        } });
      }
      if (AU.activo && AU.pestana) AU.pestana({ id: 'ep6', titulo: { es: 'Progreso cap. 6', en: 'Ch. 6 progress' }, html: () => {
        const t = AU.t, P = AU.partidas;
        if (!P.length) return `<p class="note">${esc(t({ es: 'Todavía no hay partidas en este dispositivo.', en: 'No sessions on this device yet.' }))}</p>`;
        const C = t({ es: ['Fecha', 'Estación', 'Misiones', 'Tarjetas', 'Parejas', 'Planes', 'Atasco', 'Plan final', 'Propuesta', 'Forma', 'Preguntas', 'Objetivos', 'Min'], en: ['Date', 'Station', 'Missions', 'Cards', 'Pairs', 'Plans', 'Stuck at', 'Final plan', 'Proposal', 'Shape', 'Questions', 'Objectives', 'Min'] });
        const filas = P.slice().reverse().map(p => `<tr><td>${esc(p.fecha)}</td><td>${esc(p.estacion || AU.aj.estacion)}</td><td>${(p.misiones_completadas || []).length}/3</td><td>${p.tarjetas != null ? p.tarjetas + '/6' : ''}</td><td>${p.parejas != null ? p.parejas + '/3' : ''}</td><td>${p.planes_probados != null ? p.planes_probados : ''}</td><td>${esc(p.atasco || '')}</td><td>${esc(p.plan_final || '')}</td><td>${esc(p.propuesta || '')}</td><td>${esc(p.forma || '')}</td><td>${esc(p.preguntas ? Object.entries(p.preguntas).filter(([, v]) => v).map(([k, v]) => k + ':' + v).join(' ') : '')}</td><td>${esc((p.objetivos_logrados || []).join(' '))}</td><td>${p.minutos_mision != null ? p.minutos_mision : ''}</td></tr>`).join('');
        return `<p class="note">${esc(t({ es: 'Solo lo guardado en este dispositivo. No se envía nada por la red.', en: 'Only what is stored on this device. Nothing is sent over the network.' }))}</p><div class="maestro-scroll"><table class="maestro-tabla"><thead><tr>${C.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${filas}</tbody></table></div>`;
      } });

      // ---------- Escenario: taller y mesa, muelles con canoas, puente, perchas, tabla larga, transmisor, mirador ----------
      const pieza = (geo, col, x, y, z) => { const m = new THREE.Mesh(geo, mat(col)); m.position.set(x, y, z); scene.add(m); return m; };
      pieza(new THREE.BoxGeometry(2, 0.8, 1.1), '#8a6a3a', MESA.x, H(MESA.x, MESA.z) + 0.4, MESA.z);
      const tarjetasMesa = new THREE.Group(); scene.add(tarjetasMesa);
      for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.28), mat('#f1e6c8')); c.rotation.x = -Math.PI / 2; c.position.set(MESA.x - 0.75 + (i % 3) * 0.55, H(MESA.x, MESA.z) + 0.82, MESA.z - 0.25 + Math.floor(i / 3) * 0.4); c.visible = false; tarjetasMesa.add(c); }
      for (const [dx, dz] of [[-1.6, -1.2], [1.6, -1.2], [0, 1.6]]) pieza(new THREE.CylinderGeometry(0.12, 0.14, 2.6, 6), '#6b4a2a', TALLER.x + dx, H(TALLER.x, TALLER.z) + 1.3, TALLER.z + dz);
      pieza(new THREE.ConeGeometry(2.6, 1.2, 6), '#a8903a', TALLER.x, H(TALLER.x, TALLER.z) + 3.1, TALLER.z); // el techo del taller
      const tablones = (cx, cz, hx, hz, rot) => {
        const top = H(cx - hx, cz) + 0.1, m = pieza(new THREE.BoxGeometry(hx * 2, 0.16, hz * 2), '#9a7448', cx, top - 0.08, cz); m.rotation.y = rot || 0;
        for (const sx of [-1, 1]) for (const sz of [-1, 0, 1]) { const lx = sx * (hx - 0.15), lz = sz * (hz - 0.2), c = Math.cos(rot || 0), s = Math.sin(rot || 0); pieza(new THREE.CylinderGeometry(0.09, 0.1, 2.4, 6), '#6b4a2a', cx + lx * c + lz * s, top - 1.2, cz - lx * s + lz * c); }
        G.terreno.addPlatform({ tipo: 'rect', x: cx, z: cz, hx, hz, rotY: rot || 0, top, unaVia: true });
        return top;
      };
      tablones(MUELLE_N.x + 1.2, MUELLE_N.z, 2.2, 0.9, 0); tablones(MUELLE_S.x + 1.2, MUELLE_S.z, 2.2, 0.9, 0);
      // El puente de madera: la mitad oeste está; la tabla grande (centro) y la tabla larga (este) faltan hasta la obra de M2
      const topPuente = Math.max(H(13.5, 0), H(26.5, 0)) + 0.25;
      const tramo = (x0, x1, col) => { const m = pieza(new THREE.BoxGeometry(x1 - x0, 0.18, 2.2), col, (x0 + x1) / 2, topPuente - 0.09, 0); return m; };
      tramo(13.5, 18, '#9a7448');
      const tablaGrande = tramo(18, 22, '#b8864f'), tablaLargaPuente = tramo(22, 26.5, '#a87c4f');
      for (const x of [14, 18, 22, 26]) for (const s of [-1, 1]) pieza(new THREE.CylinderGeometry(0.1, 0.12, 3, 6), '#6b4a2a', x, topPuente - 1.5, s * 0.95);
      G.terreno.addPlatform({ tipo: 'rect', x: 20, z: 0, hx: 6.5, hz: 1.1, top: topPuente, unaVia: true, when: () => tiene('levantada') && G.eventos.had('RaisedTogether') });
      G.terreno.addPlatform({ tipo: 'rect', x: 15.75, z: 0, hx: 2.25, hz: 1.1, top: topPuente, unaVia: true });
      // Las tres perchas de la obra (postes): dos ayudantes y la de Vittata, que da la señal
      const PERCHAS = { a: { x: 18.2, z: -1.6 }, b: { x: 18.2, z: 1.6 }, v: { x: 21.8, z: 0 } };
      const perchaV = G.fisica.addPercha({ x: PERCHAS.v.x, z: PERCHAS.v.z, y: topPuente + 1.6, r: 0.8 });
      for (const k of Object.keys(PERCHAS)) { const p = PERCHAS[k]; pieza(new THREE.CylinderGeometry(0.09, 0.11, 1.6, 6), '#8a6a3a', p.x, topPuente + 0.8, p.z); pieza(new THREE.BoxGeometry(0.5, 0.06, 0.5), '#c9a86a', p.x, topPuente + 1.6, p.z); }
      // La tabla larga, en la orilla hasta que se carga entre dos
      const tablaLarga = pieza(new THREE.BoxGeometry(3.6, 0.14, 0.5), '#a87c4f', TABLA_LARGA.x, H(TABLA_LARGA.x, TABLA_LARGA.z) + 0.2, TABLA_LARGA.z);
      // El transmisor de las voces (cap. 1) y la luz del mirador
      pieza(new THREE.CylinderGeometry(0.25, 0.3, 1.2, 8), '#5a6a7a', TRANSMISOR.x, H(TRANSMISOR.x, TRANSMISOR.z) + 0.6, TRANSMISOR.z);
      const luzTx = pieza(new THREE.SphereGeometry(0.16, 10, 8), '#7fd3c8', TRANSMISOR.x, H(TRANSMISOR.x, TRANSMISOR.z) + 1.4, TRANSMISOR.z);
      const luzMirador = pieza(new THREE.SphereGeometry(0.3, 12, 10), '#ffd27a', MIRADOR.x, H(MIRADOR.x, MIRADOR.z) + 2.6, MIRADOR.z);
      pieza(new THREE.CylinderGeometry(0.12, 0.16, 2.4, 6), '#6b4a2a', MIRADOR.x, H(MIRADOR.x, MIRADOR.z) + 1.2, MIRADOR.z);
      // Las canoas de quien llega: el modelo del kit (ep. 3), varadas en los muelles; sin el modelo, una canoa de primitivas
      const KIT = 'assets/models/edificios/';
      const canoaPrimitiva = () => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 3.4, 12, 1, false, Math.PI / 2, Math.PI), mat('#8a5a2a')); m.rotation.x = Math.PI / 2; m.rotation.z = Math.PI; m.position.y = 0.45; g.add(m); return g; };
      const CANOAS = [[17.2, -12.2, 0.4], [17.6, 12.4, -0.6]];
      const canoas = CANOAS.map(([x, z, ry]) => { const c = canoaPrimitiva(); c.position.set(x, nivelRio() - 0.3, z); c.rotation.y = ry; scene.add(c); return c; });
      G.assets.loadGLB(KIT + 'canoa.glb', { b64: () => (window.AV_EDIFICIOS_B64 || {}).canoa, script: 'assets/models/edificios/canoa_glb.js', base: KIT, error: 'canoa no disponible' }).then(g => {
        const m = g.scene || (g.scenes && g.scenes[0]); if (!m) return;
        const b = new THREE.Box3().setFromObject(m), sz = b.getSize(new THREE.Vector3()), largo = Math.max(sz.x, sz.z) || 1, k = 4.2 / largo;
        m.scale.setScalar(k); if (sz.x > sz.z) m.rotation.y = Math.PI / 2;
        const c = b.getCenter(new THREE.Vector3()); m.position.set(sz.x > sz.z ? c.z * k : -c.x * k, -b.min.y * k, sz.x > sz.z ? -c.x * k : -c.z * k);
        canoas.forEach((old, i) => { const cl = m.clone(); cl.traverse(o => { if (o.isMesh) o.material = o.material.clone(); }); const w = new THREE.Group(); w.add(cl); w.position.copy(old.position); w.rotation.copy(old.rotation); scene.remove(old); scene.add(w); canoas[i] = w; });
      }).catch(() => { /* sin el modelo: quedan las canoas de primitivas */ });

      // Las 36 marcas de asiento en la plaza: se dibujan con la forma elegida; se encienden al sentarse
      const asientos = new THREE.Group(); scene.add(asientos);
      const geoAsiento = new THREE.CylinderGeometry(0.34, 0.34, 0.08, 16);
      const COL_ESPERA = new THREE.Color('#9c8a5a'), COL_ON = new THREE.Color('#ffd27a');
      function dibujarAsientos() {
        while (asientos.children.length) { const m = asientos.children.pop(); m.material.dispose(); }
        const forma = FORMAS.map(f => f[0]).find(k => tiene('forma_' + k));
        if (!forma) return;
        const pts = [];
        if (forma === 'anillo') for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2; pts.push([PLAZA.x + Math.cos(a) * 8.5, PLAZA.z + Math.sin(a) * 8.5]); }
        else { const [f, c] = forma.split('x').map(Number), sx = c > 6 ? 1.3 : 1.6; for (let i = 0; i < f; i++) for (let j = 0; j < c; j++) pts.push([PLAZA.x + (j - (c - 1) / 2) * sx, PLAZA.z + (i - (f - 1) / 2) * 1.8]); }
        const ocupados = sentados();
        pts.forEach((p, i) => { const m = new THREE.Mesh(geoAsiento, new THREE.MeshLambertMaterial({ color: i < ocupados ? COL_ON : COL_ESPERA, emissive: i < ocupados ? COL_ON : COL_ESPERA, emissiveIntensity: i < ocupados ? 0.6 : 0.12 })); m.position.set(p[0], H(p[0], p[1]) + 0.05, p[1]); asientos.add(m); });
      }
      const sentados = () => FIJOS + SENTABLES.reduce((n, k) => n + (tiene('sentado_' + k) ? ASIENTOS[k] : 0), 0);

      // ---------- NPC: dónde está cada uno según la partida ----------
      const npc = id => G.actores.npc(id);
      function ponerNpc(n, x, z, y) { if (!n) return; n.def.x = x; n.def.z = z; n.sp.position.set(x, (y != null ? y : H(x, z)) + 1.0, z); n.sh.position.set(x, (y != null ? y : H(x, z)) + 0.03, z); n.collider.x = x; n.collider.z = z; }
      const PUESTO_NPC = { cargar: { x: 12.5, z: -2 }, sostener: PERCHAS.a, atar: PERCHAS.b, revisar: { x: 20, z: -3.5 }, avisar: { x: 16, z: -5 } };
      const ASIENTO_NPC = { mira: [-5, -2], roca: [-3, -2], marea: [-1, -2], nudo: [1, -2], eco: [3, -2], brote: [5, -2], alta: [-4, 2], baja: [4, 2] };
      function colocarNpcs() {
        for (const v of VISITANTES) {
          const n = npc(v.id); if (!n) continue;
          if (tiene('sentado_' + v.id)) ponerNpc(n, PLAZA.x + ASIENTO_NPC[v.id][0], PLAZA.z + ASIENTO_NPC[v.id][1]);
          else if (G.eventos.had('PlanMade') && !G.eventos.had('RaisedTogether') && S.plan && S.plan.asig) { const t = TAREAS.find(x => S.plan.asig[x.id] === v.id); if (t) { const p = PUESTO_NPC[t.id]; ponerNpc(n, p.x, p.z, t.id === 'sostener' || t.id === 'atar' ? topPuente + 1.6 : null); } else ponerNpc(n, v.x, v.z); }
          else if (G.eventos.had('CardsFilled')) { const i = VISITANTES.indexOf(v); ponerNpc(n, -8 + i * 3, 12); } // tras las tarjetas, todos cerca de la plaza
          else ponerNpc(n, v.x, v.z);
        }
        for (const k of ['alta', 'baja']) { const n = npc(k); if (!n) continue; n.setVisible(S.step >= 8); if (tiene('sentado_' + k)) ponerNpc(n, PLAZA.x + ASIENTO_NPC[k][0], PLAZA.z + ASIENTO_NPC[k][1]); }
        const ig = npc('iguaca'); if (ig) { if (S.step >= 4 && S.step <= 7) ponerNpc(ig, PUENTE_W.x - 4.5, PUENTE_W.z - 2.5); else if (S.complete) ponerNpc(ig, MIRADOR.x + 1.5, MIRADOR.z + 1); else ponerNpc(ig, IGUACA.x, IGUACA.z); }
        const gu = npc('guardian'); if (gu) { if (S.step >= 11 && !S.complete) ponerNpc(gu, PLAZA.x, PLAZA.z + 0.5); else if (S.complete) ponerNpc(gu, MIRADOR.x - 1.5, MIRADOR.z + 1); else ponerNpc(gu, GUARDIAN.x, GUARDIAN.z); }
        for (let i = 0; i < 6; i++) tarjetasMesa.children[i].visible = i < conocidos().length;
        tablaGrande.visible = tiene('levantada'); tablaLargaPuente.visible = G.eventos.had('RaisedTogether');
        tablaLarga.visible = !G.eventos.had('RaisedTogether');
        luzMirador.material.emissive = new THREE.Color(S.complete ? '#ffd27a' : '#664d1a');
        if (G.interaccion.find('iguaca')) seguir();
      }

      // ---------- Misión 1 · «Cada quien con lo suyo» ----------
      const SI_NO_DICE = 'Lo que necesito… no lo voy a decir. Fíjate.';
      function fichaEspecie(v) {
        const e = especieDe(v), l = idioma();
        if (!e) { G.dialogo.say([di(v.nombre, 'De mi especie, mejor pregunta en el Cuaderno de las especies.')]); return; }
        const cat = e.uicn && e.uicn.categoria && window.AV_ESPECIES.categorias[e.uicn.categoria];
        const dato = t => Object.assign(di(v.nombre, t), { datos: true }); // datos de especies.js, ya en ES/EN
        const lineas = [di(v.nombre, 'Mi personaje está inspirado en una especie viva. Lo que sé hacer es mío, no de la especie.'),
          dato((e.comun && e.comun[l]) ? `${e.comun[l]} (${e.cientifico})` : e.cientifico),
          dato((e.distribucion && e.distribucion[l]) || e.cientifico)];
        if (cat) lineas.push(dato(`${cat[l]} · ${e.uicn.evaluacion}`)); // sin estado si la UICN no está verificada (ESPECIES_DISCREPANCIAS.md)
        G.dialogo.say(lineas);
      }
      function hablarVisitante(v) {
        if (S.step === 10 && !tiene('sentado_' + v.id)) { sentar(v.id); return; }
        if (!tiene('conocido_' + v.id)) {
          if (S.step === 0) { E().inicio = S.clock; if (!G.eventos.had('GuestsArrived')) G.eventos.log('GuestsArrived'); G.misiones.advanceTo(1); }
          poner('conocido_' + v.id); G.audio.play('pickup'); colocarNpcs(); G.misiones.check();
          const ls = [di(v.nombre, v.presenta)];
          if (!v.dice) ls.push(di(v.nombre, SI_NO_DICE));
          ls.push(Lu(v.dice ? 'Lo apunto en su tarjeta: dos cosas que sabe hacer y una que necesita.' : 'Apunto lo que sabe hacer. Lo que necesita, lo tendrás que observar.'));
          G.dialogo.say(ls, () => { if (conocidos().length === 6) G.ui.toast('Dos no dijeron qué necesitan: obsérvalos', 3200); });
          return;
        }
        elegir(v.nombre, '¿Qué quieres?', [{ label: 'Ver su tarjeta', v: 'tarjeta' }, { label: 'Ver su ficha de especie', v: 'ficha' }, { label: 'Nada, gracias', v: 'nada' }], o => {
          if (o.v === 'ficha') { poner('ficha_vista'); fichaEspecie(v); return; }
          if (o.v === 'tarjeta') tarjeta(v);
        });
      }
      function tarjeta(v) {
        const sabe = v.sabe.map(s => `<li><span aria-hidden="true">${ICONO[s]}</span> ${esc(s)}</li>`).join('');
        const nec = v.dice || tiene(OBSERVAR[v.id]) ? `<li><span aria-hidden="true">${ICONO[v.necesita]}</span> ${esc(v.necesita)}</li>` : `<li><span aria-hidden="true">?</span> ${esc('Todavía no lo sé: hay que observar')}</li>`;
        G.ui.showCard(`<h2>${esc(v.nombre)}</h2><p>${esc('Sabe hacer')}</p><ul class="ep6-lista">${sabe}</ul><p>${esc('Necesita')}</p><ul class="ep6-lista">${nec}</ul><div class="row"><button class="btn" id="ch-0" type="button">${esc('Cerrar')}</button></div>`);
        G.util.$('ch-0').onclick = () => G.ui.hideCard(); G.util.$('ch-0').focus();
      }
      for (const v of VISITANTES) G.interaccion.add({ id: 'v_' + v.id, x: v.x, z: v.z, r: 2.4, label: () => S.step === 10 && !tiene('sentado_' + v.id) ? 'Invitar a ' + v.nombre + ' a su asiento' : tiene('conocido_' + v.id) ? 'Hablar con ' + v.nombre : 'Recibir a quien llega',
        use: () => hablarVisitante(v) });
      // Observar: lo que no dijeron (Mira en la sombra, Marea mirando al río)
      G.interaccion.add({ id: 'o_mira', x: 12.2, z: -12.5, r: 2, visible: () => S.step >= 2 && !tiene('obs_sombra'), label: () => 'Observar a Mira',
        use: () => { poner('obs_sombra'); G.audio.play('pickup'); G.misiones.check(); G.dialogo.say([Vi(visitante('mira').observa), Lu('Ya lo tengo: necesita sombra.')], finObservar); } });
      G.interaccion.add({ id: 'o_marea', x: 12.2, z: 12.5, r: 2, visible: () => S.step >= 2 && !tiene('obs_rio'), label: () => 'Observar a Marea',
        use: () => { poner('obs_rio'); G.audio.play('pickup'); G.misiones.check(); G.dialogo.say([Vi(visitante('marea').observa), Lu('La soga se le suelta. Necesita un nudo que aguante.')], finObservar); } });
      function finObservar() { if (Object.values(OBSERVAR).every(tiene) && S.step === 3) G.ui.toast('Presenta en la mesa a los que se cubren uno al otro', 3200); }
      // La mesa: presentar parejas (tocar uno y luego otro; una pareja que no se cubre solo saluda, sin castigo)
      function mesa() {
        if (S.step < 3) { G.dialogo.say([Lu(S.step < 1 ? 'Aquí pondré las tarjetas de cada uno.' : `Llevo ${conocidos().length} tarjetas de 6. Faltan por conocer u observar.`)]); return; }
        if (G.eventos.had('CardsFilled')) { G.dialogo.say([Lu('Las seis tarjetas, llenas. Y tres parejas que se cubren.')]); return; }
        const libres = VISITANTES.filter(v => !PAREJAS.some(p => p.includes(v.id) && tiene('pareja_' + p.join('+'))));
        elegir('Vittata', '¿A quién presento primero?', libres.map(v => ({ label: v.nombre, v: v.id })), a => {
          elegir('Vittata', '¿Con quién?', libres.filter(v => v.id !== a.v).map(v => ({ label: v.nombre, v: v.id })), b => {
            const p = PAREJAS.find(x => x.includes(a.v) && x.includes(b.v));
            if (!p) { G.audio.play('wrong'); G.dialogo.say([Vi(`${nombre(a.v)}, te presento a ${nombre(b.v)}.`), Lu('Se saludan, pero ninguno tiene lo que el otro necesita. Mira las tarjetas y prueba otra pareja.')]); return; }
            poner('pareja_' + p.join('+')); G.audio.play('unlock'); G.fx.burst(MESA.x, H(MESA.x, MESA.z) + 1.5, MESA.z, 'feathers', 14); registrar();
            G.dialogo.say([Vi(`${nombre(a.v)}, te presento a ${nombre(b.v)}.`), Lu(PAREJA_TXT[p.join('+')])], () => {
              if (parejasHechas().length < 3) return;
              G.eventos.log('CardsFilled'); G.comic.capture('tarjetas'); G.audio.play('unlock'); colocarNpcs(); G.misiones.check(); registrar();
              G.dialogo.say(L('evento:CardsFilled'), () => G.ui.toast('Ve al puente: Iguaca escribe el objetivo y los límites', 3200));
            });
          });
        });
      }
      G.interaccion.add({ id: 'mesa', x: MESA.x, z: MESA.z, r: 2.4, label: () => S.step === 3 ? 'Presentar a dos visitantes' : 'Mirar la mesa de las tarjetas', use: mesa });

      // ---------- Misión 2 · «Nadie lo levanta solo» ----------
      const PL = () => S.plan || (S.plan = { asig: null, pruebas: 0, atasco: '' });
      const asigInicial = () => { const a = {}; for (const t of TAREAS) a[t.id] = 'vittata'; return a; }; // el plan «de la cabeza de Vittata»: solo ella
      function cuaderno() {
        if (S.step < 4) { G.dialogo.say([Lu('El puente de madera. Le faltan dos tablas para que pasen todos.')]); return; }
        if (S.step === 4) return criterios();
        if (S.step === 5) return tablero();
        G.dialogo.say([Lu(G.eventos.had('RaisedTogether') ? 'El puente aguanta a todos. Y lo hicieron entre todos.' : 'El plan ya funciona. Ahora, la obra de verdad.')]);
      }
      function criterios() {
        if (!tiene('criterios_intro')) { poner('criterios_intro'); G.dialogo.say([Lu('Antes del plan, el cuaderno: qué hay que lograr y con qué límites.'), Lu('«El puente aguanta a todos». «Nadie hace algo que no puede». «Se termina antes de la noche».')], criterios); return; }
        elegir('Iguaca', 'De las tres, ¿cuál es el objetivo (lo que hay que lograr)? Las otras dos son límites.', CRITERIOS.map(c => ({ label: c[1], v: c[0] })), o => {
          if (o.v !== 'objetivo') { G.audio.play('wrong'); G.dialogo.say([Lu('Esa es un límite: dice lo que no se puede o hasta cuándo. El objetivo dice lo que tiene que lograr el puente.')], criterios); return; }
          poner('criterios'); G.audio.play('unlock'); G.misiones.check(); registrar();
          G.dialogo.say([Lu('Eso es. Objetivo: que aguante a todos. Límites: nadie hace lo que no puede, y antes de la noche.'), Vi('Ya tengo el plan en la cabeza. Mira el tablero.')], () => G.ui.toast('Arma el plan en el tablero y pruébalo', 3000));
        });
      }
      // El tablero: tareas en una columna y ayudantes en otra; se toca un ayudante y luego una tarea (botones de 56 px)
      let sel = null;
      function simular(asig) {
        const pasos = []; let t = 0, prev = null, atasco = null;
        for (const ta of TAREAS) {
          const p = asig[ta.id];
          if (!p) { pasos.push({ tarea: ta.id, quien: '', ok: false, que: 'Nadie tiene esta tarea.' }); atasco = atasco || ta.id; continue; }
          const aprende = p === 'brote' && ta.id === 'atar' && asig.sostener === 'nudo';
          const puede = ta.puede.includes(p) || aprende;
          if (!puede) { pasos.push({ tarea: ta.id, quien: p, ok: false, que: ta.atasco }); atasco = atasco || ta.id; prev = p; continue; }
          const espera = prev === p ? 1 : 0, dura = ta.dura + (p === 'brote' ? 3 : p === 'aprendiz' ? 2 : 0) + espera; t += dura;
          pasos.push({ tarea: ta.id, quien: p, ok: true, dura, espera: !!espera, aprende, que: aprende ? 'Brote ata junto a Nudo: tarda más, y aprende.' : p === 'brote' ? 'Brote lo hace por primera vez: tarda más.' : p === 'aprendiz' ? 'Tu aprendiz lo hace sin prisa.' : espera ? 'Viene de la otra tarea: espera un momento.' : 'Hecho.' });
          prev = p;
        }
        const todas = TAREAS.every(ta => asig[ta.id] === 'vittata');
        let tipo = null;
        if (!atasco) { const n = {}; Object.values(asig).forEach(p => { n[p] = (n[p] || 0) + 1; }); tipo = Object.values(asig).includes('brote') ? 'ensena' : Object.values(n).every(c => c === 1) ? 'descansa' : 'rapido'; }
        return { pasos, total: t, atasco, sola: todas, tipo };
      }
      function tablero() {
        const P = PL(); if (!P.asig) P.asig = asigInicial();
        const $ = G.util.$;
        const fila = ta => { const q = P.asig[ta.id]; return `<li><button class="btn ep6-tarea${sel ? ' ep6-dest' : ''}" type="button" data-tarea="${ta.id}"><span>${esc(ta.titulo)}</span><b>${esc(q ? nombre(q) : '—')}</b></button></li>`; };
        const ayud = p => `<li><button class="btn ep6-ayud${sel === p.id ? ' ep6-sel' : ''}" type="button" data-ayud="${p.id}" aria-pressed="${sel === p.id}">${esc(p.nombre)}</button></li>`;
        G.ui.showCard(`<h2>${esc('El tablero del plan')}</h2><p>${esc(sel ? 'Ahora toca la tarea que hará ' + nombre(sel) + '.' : 'Toca un ayudante y luego una tarea.')}</p>` +
          `<div class="ep6-tablero"><div><h3>${esc('Tareas')}</h3><ul class="ep6-lista">${TAREAS.map(fila).join('')}</ul></div><div><h3>${esc('Ayudantes')}</h3><ul class="ep6-lista">${PERSONAS.map(ayud).join('')}</ul></div></div>` +
          `<div class="row"><button class="btn" id="ch-0" type="button">${esc('Probar el plan')}</button><button class="btn" id="ch-1" type="button">${esc('Quitar a alguien de una tarea')}</button><button class="btn" id="ch-2" type="button">${esc('Cerrar')}</button></div>`);
        for (const b of document.querySelectorAll('#card [data-ayud]')) b.onclick = () => { sel = sel === b.dataset.ayud ? null : b.dataset.ayud; tablero(); };
        for (const b of document.querySelectorAll('#card [data-tarea]')) b.onclick = () => { if (sel) { P.asig[b.dataset.tarea] = sel; sel = null; G.audio.play('tick'); } else if (quitar) { P.asig[b.dataset.tarea] = null; quitar = false; G.audio.play('tick'); } tablero(); };
        $('ch-0').onclick = () => probar();
        $('ch-1').onclick = () => { quitar = !quitar; sel = null; G.ui.toast(quitar ? 'Toca la tarea que quieres dejar sin nadie' : 'Toca un ayudante y luego una tarea', 2200); };
        $('ch-2').onclick = () => { sel = null; quitar = false; G.ui.hideCard(); };
        $('ch-0').focus();
      }
      let quitar = false;
      let sim = null;
      function probar() {
        const P = PL(), r = simular(P.asig); P.pruebas++; sim = { r, i: 0 }; G.audio.play('tick'); colocarNpcs();
        if (r.atasco) P.atasco = r.atasco;
        if (r.sola && !G.eventos.had('PlanStuck')) { G.eventos.log('PlanStuck'); G.comic.capture('atasco'); }
        registrar(); verSimulacion();
      }
      const TAREA_T = id => TAREAS.find(t => t.id === id).titulo;
      function verSimulacion() {
        const { r, i } = sim, $ = G.util.$, p = r.pasos[i], fin = i >= r.pasos.length - 1;
        const linea = (q, k) => `<li class="${q.ok ? 'ok' : 'mal'}${k === i ? ' now' : ''}${k > i ? ' luego' : ''}"><span aria-hidden="true">${k > i ? '·' : q.ok ? '✔' : '⏸'}</span> <span>${esc(TAREA_T(q.tarea))}</span> · <b>${esc(q.quien ? nombre(q.quien) : '—')}</b>${k <= i || !q.ok ? `<small>${esc(q.que)}</small>` : ''}</li>`;
        const fraseFin = !r.atasco ? `${esc(PLAN_TXT[r.tipo].nombre)}. ${esc(PLAN_TXT[r.tipo].que)}` : r.sola ? esc('Vittata vuela de un lado a otro. La tabla grande se queda a medio levantar.') : esc('El plan se para aquí y espera. Cambia una o dos asignaciones.');
        G.ui.showCard(`<h2>${esc('Probando el plan')}</h2><ol class="ep6-sim">${r.pasos.map(linea).join('')}</ol>` +
          (fin || !p.ok ? `<p class="ep6-fin">${fraseFin}</p>` : '') +
          `<div class="row">${!fin && p.ok ? `<button class="btn" id="ch-0" type="button">${esc('Siguiente paso')}</button>` : ''}<button class="btn" id="ch-1" type="button">${esc('Repetir desde el inicio')}</button><button class="btn" id="ch-2" type="button">${esc(r.atasco ? 'Volver al tablero' : 'Cerrar')}</button></div>`);
        if ($('ch-0')) $('ch-0').onclick = () => { sim.i++; G.audio.play('tick'); verSimulacion(); };
        $('ch-1').onclick = () => { sim.i = 0; verSimulacion(); };
        $('ch-2').onclick = () => { G.ui.hideCard(); if (r.atasco) { if (r.sola) G.dialogo.say(L('evento:PlanStuck').concat([Vi('…Sí. Borra mi nombre de tres tareas.')]), tablero); else tablero(); } else planListo(r); };
        ($('ch-0') || $('ch-2')).focus();
      }
      function planListo(r) {
        if (G.eventos.had('PlanMade')) return;
        for (const k of ['rapido', 'ensena', 'descansa']) S.collected = S.collected.filter(x => x !== 'plan_' + k);
        poner('plan_' + r.tipo); G.eventos.log('PlanMade', { choice: r.tipo }); G.audio.play('unlock'); colocarNpcs(); G.misiones.check(); registrar();
        G.dialogo.say([Vi('Funciona. Cada uno en lo suyo… y yo en la tercera percha, para dar la señal.'), Lu('Ahora de verdad: la tabla grande se levanta entre tres.')], () => G.ui.toast('Pósate en la percha vacía y da la señal', 3200));
      }
      G.interaccion.add({ id: 'cuaderno', x: PUENTE_W.x - 1.5, z: PUENTE_W.z - 2.5, r: 2.6, label: () => ({ 4: 'Escribir el objetivo y los límites', 5: 'Abrir el tablero del plan' })[S.step] || 'Hablar con Iguaca', use: cuaderno });
      // La tabla grande: dos ayudantes en sus perchas (por el plan) y Vittata posada en la tercera, que da la señal
      let subiendo = -1;
      G.interaccion.add({ id: 'percha_v', x: PERCHAS.v.x, z: PERCHAS.v.z, r: 1.6, visible: () => S.step === 6, label: () => 'Dar la señal desde la percha',
        use: () => {
          if (Math.abs(S.pos.y - perchaV.y) > 0.5) { G.ui.toast('Pósate en la percha vacía (vuela hasta el poste) y da la señal', 2600); return; }
          poner('levantada'); subiendo = 0; G.audio.play('unlock'); G.misiones.check(); registrar();
          G.dialogo.say([Vi('¡Ahora!'), Vi('Sube. Entre tres, sube.')], () => G.ui.toast('Lleva la tabla larga al puente entre dos', 3000));
        } });
      // La tabla larga: solo se mueve si hay alguien en cada punta (Vittata y quien carga fuerte por el plan)
      let llevando = false;
      const cargador = () => (S.plan && S.plan.asig && S.plan.asig.cargar) || 'roca';
      G.interaccion.add({ id: 'tabla_larga', x: TABLA_LARGA.x, z: TABLA_LARGA.z, r: 2.4, visible: () => S.step === 7 && !llevando, label: () => 'Cargar la tabla larga',
        use: () => {
          elegir('Vittata', 'La tabla larga pesa. ¿Cómo la llevo?', [{ label: 'Yo sola, de una punta', v: 'sola' }, { label: `Pedirle a ${nombre(cargador())} que agarre la otra punta`, v: 'dos' }], o => {
            if (o.v === 'sola') { G.audio.play('wrong'); G.dialogo.say([Vi('…No se mueve. Una punta sube y la otra se queda en el suelo.')]); return; }
            llevando = true; poner('tabla_dos'); G.audio.play('pickup'); const n = npc(cargador()); if (n) n.collider.r = 0;
            G.dialogo.say([di(nombre(cargador()), 'Yo de esta punta. Tú marcas el paso.')], () => G.ui.toast('Llévala al puente y colócala', 2600));
          });
        } });
      G.interaccion.add({ id: 'colocar', x: 24.2, z: 0, r: 2.6, visible: () => S.step === 7 && llevando, label: () => 'Colocar la tabla larga en el puente',
        use: () => {
          llevando = false; G.eventos.log('RaisedTogether'); G.comic.capture('levantada'); G.audio.play('unlock'); const n = npc(cargador()); if (n) n.collider.r = 0.6;
          G.fx.burst(24, topPuente + 1.5, 0, 'gold', 30); G.misiones.check(); colocarNpcs(); registrar();
          const ultimo = tiene('plan_ensena') ? [di('Brote', 'El último nudo lo ato yo. Me lo enseñó Nudo.')] : [di('Brote', '¡Bravo! Desde aquí se ve bien.')];
          G.dialogo.say(ultimo.concat(L('evento:RaisedTogether')), () => G.ui.toast('Llegan dos grupos a la plaza', 3000));
        } });
      G.on('update', (dt) => {
        if (subiendo >= 0) { subiendo = Math.min(1, subiendo + dt / 2); tablaGrande.visible = true; tablaGrande.position.y = topPuente - 0.09 - (1 - subiendo) * 2.2; if (subiendo >= 1) subiendo = -1; }
        if (llevando) {
          const f = S.facing || { x: 1, z: 0 }, x = S.pos.x + f.x * 1.4, z = S.pos.z + f.z * 1.4;
          tablaLarga.position.set(x, S.pos.y + 0.9, z); tablaLarga.rotation.y = Math.atan2(f.x, f.z) + Math.PI / 2;
          ponerNpc(npc(cargador()), S.pos.x + f.x * 2.8, S.pos.z + f.z * 2.8, S.pos.y);
        }
      }, 20);

      // ---------- Misión 3 · «El círculo» ----------
      function grupos() {
        if (S.step < 8) { G.dialogo.say([Lu('La plaza. Aquí cabremos todos… de alguna forma.')]); return; }
        if (G.eventos.had('GroupsListened')) { G.dialogo.say([Lu('Ya se escucharon. Ahora, los asientos.')]); return; }
        if (!tiene('grupos_intro')) { poner('grupos_intro'); G.dialogo.say([di(GRUPOS.alta.who, 'Nosotros decimos el mirador.'), di(GRUPOS.baja.who, 'Y nosotros la plaza. Y no es lo mismo.'), Vi('Yo decido: lo mejor es…'), Lu('(Le toca el ala.) Todavía no. Escucha a uno, luego al otro, y repite lo que oíste.')], escucharA); return; }
        if (!tiene('escucha_alta')) return escucharA();
        if (!tiene('escucha_baja')) return escucharB();
        comparten();
      }
      function escuchar(k, seguir) {
        const g = GRUPOS[k];
        G.dialogo.say([di(g.who, g.quiere)], () => elegir('Vittata', 'Lo repito con mis palabras:', g.opciones.map(o => ({ label: o[1], v: o[0] })), o => {
          if (o.v !== 'bien') { G.audio.play('wrong'); G.dialogo.say([di(g.who, g.corrige)], () => escuchar(k, seguir)); return; }
          poner('escucha_' + k); G.audio.play('pickup'); G.dialogo.say([di(g.who, g.bien)], seguir);
        }));
      }
      function escucharA() { escuchar('alta', () => elegir('Vittata', 'Ya sé qué proponer…', [{ label: 'Proponer ya', v: 'ya' }, { label: 'Escuchar al otro grupo primero', v: 'otro' }], o => {
        if (o.v === 'ya') { poner('propuso_antes'); G.dialogo.say([Lu('(Seña con el ala.) Todavía no. Falta el otro grupo.')], escucharB); return; }
        escucharB();
      })); }
      function escucharB() { escuchar('baja', comparten); }
      function comparten() {
        elegir('Vittata', '¿Qué tienen en común los dos grupos?', COMPARTEN.map(c => ({ label: c[1], v: c[0] })), o => {
          if (o.v !== 'bien') { G.audio.play('wrong'); G.dialogo.say([Lu('Vuelve a oír lo que dijo cada uno: ¿por qué quieren lo que quieren?')], comparten); return; }
          poner('comparten'); G.audio.play('pickup');
          elegir('Vittata', 'Los dos quieren que nadie se quede fuera. ¿Qué propongo?', PROPUESTAS.map(p => ({ label: p[1], v: p[0] })), r => {
            poner('propuesta_' + r.v); G.eventos.log('GroupsListened', { choice: r.v }); G.audio.play('unlock'); registrar(); G.misiones.check();
            const p = PROPUESTAS.find(x => x[0] === r.v);
            G.dialogo.say([Lu(p[2])].concat(L('evento:GroupsListened')), () => G.ui.toast('Elige cómo sentar a los 36 en la plaza', 3000));
          });
        });
      }
      G.interaccion.add({ id: 'grupos', x: 0, z: 9, r: 3, visible: () => S.step >= 8, label: () => S.step === 8 ? 'Escuchar a los dos grupos' : 'Hablar con los grupos', use: grupos });
      function marcas() {
        if (S.step < 9) { G.dialogo.say([Lu('Treinta y seis marcas de cal. Caben de varias formas.')]); return; }
        if (G.eventos.had('CircleFormed')) { const f = FORMAS.find(x => tiene('forma_' + x[0])); G.dialogo.say([Lu(f[2]), Lu(f[3])]); return; }
        elegir('Iguaca', 'Somos 36 asientos. ¿Cómo los pongo? Todas las formas suman 36.', FORMAS.map(f => ({ label: f[1], v: f[0] })), o => {
          const f = FORMAS.find(x => x[0] === o.v);
          poner('forma_' + o.v); G.eventos.log('CircleFormed', { choice: o.v }); G.comic.capture('circulo'); G.audio.play('unlock'); dibujarAsientos(); registrar(); G.misiones.check();
          G.dialogo.say([Lu(f[2]), Lu(f[3]), Vi('Vale. Y yo no me siento primera: voy a invitar a cada uno a su sitio.')], () => G.ui.toast('Invita a cada uno a su asiento', 3000));
        });
      }
      G.interaccion.add({ id: 'marcas', x: PLAZA.x, z: PLAZA.z - 4, r: 3, visible: () => S.step >= 9, label: () => S.step === 9 ? 'Elegir la forma del círculo' : 'Mirar las marcas', use: marcas });
      function sentar(k) {
        if (tiene('sentado_' + k)) return;
        poner('sentado_' + k); G.audio.play('pickup'); dibujarAsientos(); colocarNpcs(); G.misiones.check();
        const quien = k === 'alta' ? GRUPOS.alta.who : k === 'baja' ? GRUPOS.baja.who : nombre(k);
        const l = k === 'alta' || k === 'baja' ? di(quien, 'Venimos todos. Gracias por invitarnos.') : di(quien, 'Voy. Gracias por venir a buscarme.');
        G.dialogo.say([Vi('Este es tu sitio. Siéntate cuando quieras.'), l], () => { if (SENTABLES.every(x => tiene('sentado_' + x))) G.ui.toast('Habla con el Guardián en el centro', 3000); });
      }
      for (const k of ['alta', 'baja']) G.interaccion.add({ id: 's_' + k, x: k === 'alta' ? -4 : 4, z: 9, r: 2.2, visible: () => S.step === 10 && !tiene('sentado_' + k), label: () => 'Invitar a su asiento', use: () => sentar(k) });
      // El pacto renovado y el final de temporada [KELVIN-2, 3, 6, 7, 8]
      function guardian() {
        if (S.step < 11) { G.dialogo.say([Gu(S.step < 8 ? 'El pacto antiguo… lo recuerdo a pedazos. Con los que llegan, quizá se complete.' : 'Cuando estén todos sentados, hablamos.')]); return; }
        if (S.complete) { G.dialogo.say([Gu('Las islas olvidadas no oyen el relevo. Pero ya no vas sola.')]); return; }
        G.eventos.log('PactRenewed'); G.comic.capture('pacto'); G.audio.play('unlock'); dibujarAsientos(); registrar(); G.misiones.check();
        luzTx.material.emissive = new THREE.Color('#7fd3c8'); G.fx.burst(PLAZA.x, H(PLAZA.x, PLAZA.z) + 2, PLAZA.z, 'gold', 40);
        G.dialogo.say([
          Gu('El pacto antiguo decía… Lo recuerdo a pedazos. Mejor así: ahora lo recordamos entre todos.'),
          di('Voces', 'Treinta y seis no es un número. Es una forma de sentarse.'),
          di('Eco', '¿Y quién manda?'),
          Vi('Nadie lo hace todo. Yo ayudo a que nos encontremos.'),
          Lu(`Veintidós asientos encendidos. ${36 - sentados()} esperan: no están apagados.`),
          Gu('Entonces, entre todos: nos conocemos, nos ayudamos y nos seguimos buscando.'),
        ], terminar);
      }
      function terminar() {
        if (S.complete) return;
        S.complete = true; E().fin = S.clock; G.eventos.log('Chapter6Completed'); G.audio.play('unlock');
        G.misiones.check(); G.misiones.advanceTo(G.misiones.DONE); colocarNpcs(); registrar();
        G.fx.burst(MIRADOR.x, H(MIRADOR.x, MIRADOR.z) + 3, MIRADOR.z, 'feathers', 30);
        G.dialogo.say([Lu('De noche, desde el mirador, contamos los asientos que esperan. De la niebla no responde ninguna luz nueva.'),
          Gu('Las islas olvidadas no oyen el relevo.'), Vi('(Saca el cuaderno y, por primera vez, no dibuja un plan para ella sola: escribe una columna de nombres.)'),
          Lu('¿Y eso?'), Vi('La tripulación.')].concat(L('evento:Chapter6Completed')), () => G.misiones.showEnd());
      }
      G.interaccion.add({ id: 'guardian', x: GUARDIAN.x, z: GUARDIAN.z, r: 2.6, label: () => S.step === 11 ? 'Renovar el pacto' : 'Hablar con el Guardián', use: guardian });

      // ---------- Iguaca: pistas del paso en curso y, al final, las preguntas (opcionales) ----------
      function hablar() {
        if (S.complete && AU.activo && !todasPreguntadas()) {
          elegir('Iguaca', '¡Renovaron el pacto! Cuando quieras, te hago unas preguntas sobre lo que hicimos. Sin prisa y sin nota.',
            [{ label: 'Sí, pregúntame', v: 1 }, { label: 'Ahora no', v: 0 }], o => { if (o.v) formativa(); else G.dialogo.say([Lu('Cuando quieras. Aquí estaré.')]); });
          return;
        }
        if (S.step === 4 || S.step === 5) return cuaderno();
        const pistas = {
          0: 'Los muelles están junto al río. Recibe a quien llega.', 1: 'Habla con cada visitante: cuenta qué sabe hacer y qué necesita.',
          2: 'Mira se quedó en la sombra y Marea no deja de mirar el río. Obsérvalas.', 3: 'En la mesa del taller, presenta a dos que se cubran uno al otro.',
          6: 'Dos ayudantes ya están en sus perchas. Vuela a la percha vacía y da la señal.', 7: 'La tabla larga está en la orilla. Pídele a alguien que agarre la otra punta.',
          8: 'Escucha a un grupo, luego al otro, y repite lo que oíste antes de proponer.', 9: 'Elige una forma para los 36: todas suman 36 y cada una tiene su costo.',
          10: 'Invita a cada uno a su asiento. Tú te sientas al final.', 11: 'El Guardián espera en el centro.',
        };
        G.dialogo.say([Lu(S.complete ? '¡Renovaron el pacto! Puedes seguir explorando.' : pistas[S.step] || 'Sigue así.')]);
      }
      G.interaccion.add({ id: 'iguaca', x: IGUACA.x, z: IGUACA.z, r: 2.4, label: () => 'Hablar con Iguaca', use: hablar });
      // Las interacciones de quien se mueve (Iguaca, el Guardián y los visitantes) siguen a su NPC
      function seguir() { for (const id of ['iguaca', 'guardian'].concat(VISITANTES.map(v => 'v_' + v.id))) { const it = G.interaccion.find(id), n = npc(id.replace(/^v_/, '')); if (it && n) { it.x = n.def.x; it.z = n.def.z; } } }
      G.on('update', seguir, 21);

      // Estilo del tablero y las tarjetas (botones de 56 px; icono y texto, nunca solo color)
      const css = document.createElement('style');
      css.textContent = '.ep6-lista{list-style:none;margin:0 0 .5em;padding:0}.ep6-lista li{margin:.2em 0}.ep6-tablero{display:grid;grid-template-columns:1fr 1fr;gap:.6em;text-align:left}.ep6-tablero h3{font-size:1em;margin:.2em 0}' +
        '.ep6-tarea,.ep6-ayud{min-height:56px;width:100%;display:flex;justify-content:space-between;align-items:center;gap:.5em}.ep6-sel{outline:3px solid var(--gold,#ffd27a)}.ep6-dest{outline:2px dashed var(--gold,#ffd27a)}' +
        '.ep6-sim{text-align:left;padding-left:1.2em}.ep6-sim li{margin:.25em 0}.ep6-sim li.luego{opacity:.45}.ep6-sim li.now{font-weight:700}.ep6-sim li.mal{color:var(--crest,#d6403a)}.ep6-sim small{display:block;font-weight:400}.ep6-fin{font-weight:700}' +
        '@media (max-width:520px){.ep6-tablero{grid-template-columns:1fr}}';
      document.head.appendChild(css);

      const redibujar = () => { colocarNpcs(); dibujarAsientos(); };
      G.on('apply', redibujar, 75);
      redibujar();
      // Para la prueba
      G.ep6 = { VISITANTES, PAREJAS, TAREAS, PERSONAS, FORMAS, simular, PL, perchaV, topPuente, llevando: () => llevando, sentados, asientos, tablero, probar };
    },

    pruebas: {
      async selfTest(G, T) {
        const S = G.S, $ = G.util.$, { check, result } = T.runner(), { tick, drain, useAt, teleport } = T;
        const keep = T.keepSave();
        const criaderoRaw = (() => { try { return localStorage.getItem(G.criadero.KEY); } catch (e) { return null; } })();
        // Todo texto que el jugador ve (diálogos, tarjetas, avisos) se apunta para comprobar luego que tiene inglés
        const vistos = new Set(), ver = t => { if (t != null && /\p{L}/u.test(String(t))) vistos.add(String(t).replace(/\s+/g, ' ').trim()); };
        const D = G.dialogo, say0 = D.say, choose0 = D.choose, toast0 = G.ui.toast, show0 = G.ui.showCard;
        D.say = function (lines) { (lines || []).forEach(l => { if (!l.datos) ver(l.text); ver(l.who); }); return say0.apply(this, arguments); };
        D.choose = function (line, ops) { ver(line.text); ver(line.who); (ops || []).forEach(x => ver(x.label)); return choose0.apply(this, arguments); };
        G.ui.toast = function (t) { ver(t); return toast0.apply(this, arguments); };
        G.ui.showCard = function (html) { const r = show0.apply(this, arguments); for (const el of $('card').querySelectorAll('h2,h3,p,li,button,small,b,span')) { if (!el.children.length || el.tagName === 'LI' || el.tagName === 'P') for (const n of el.childNodes) if (n.nodeType === 3) ver(n.textContent.replace(/^[·\s]+|[·\s]+$/g, '')); } return r; };
        let grabando = true;
        G.on('update', () => { if (grabando) for (const it of G.interaccion.list) { try { ver(it.label()); } catch (e) { /* */ } } });
        const pick = txt => { const b = [...document.querySelectorAll('#card button')].find(x => x.textContent.includes(txt)); if (b) b.click(); drain(); return !!b; };
        const opciones = () => [...document.querySelectorAll('[id^="ch-"]')].map(b => b.textContent);
        const asignar = (ayud, tarea) => { const a = document.querySelector(`#card [data-ayud="${ayud}"]`); if (a) a.click(); const b = document.querySelector(`#card [data-tarea="${tarea}"]`); if (b) b.click(); };
        const sim = () => G.ep6.simular;
        try {
          G.quiet = true; G.guardado.reset(true);
          check('Crea el personaje', G.creador.saveCharacter({ name: 'Prueba', preset: 'agilis', outfit: 'azul', accessory: 'ninguno' }) === null);
          check('Empieza en el paso 1 de 12', S.step === 0 && $('steps').children.length === 12);
          check('Lo provisional del canon va marcado [KELVIN] en notas y comentarios, no en el texto del jugador', JSON.stringify(G.pack.dialogos.datos().escenas.map(e => e.nota || '')).includes('[KELVIN') && !JSON.stringify(G.pack.dialogos.datos().escenas.map(e => e.lineas)).includes('[KELVIN'));
          check('6 visitantes inspirados en especies vivas con ficha en especies.js; sus habilidades son del personaje', G.ep6.VISITANTES.length === 6 && G.ep6.VISITANTES.every(v => (window.AV_ESPECIES.especies || []).some(e => e.id === v.especie && e.uicn && e.uicn.categoria !== 'EX') && v.sabe.length === 2 && v.necesita));
          // M1 · Cada quien con lo suyo
          useAt('v_mira'); drain();
          check('M1 · Recibir a la primera: empieza la misión (GuestsArrived); Mira no dice qué necesita', S.step === 1 && G.eventos.had('GuestsArrived') && S.collected.includes('conocido_mira') && !G.interaccion.find('o_mira').visible(), 'paso ' + S.step);
          for (const v of ['roca', 'marea', 'nudo', 'eco', 'brote']) { useAt('v_' + v); drain(); }
          check('M1 · Los 6 conocidos: 6 tarjetas; hay que observar a dos', S.step === 2 && G.interaccion.find('o_mira').visible() && G.interaccion.find('o_marea').visible(), 'paso ' + S.step);
          useAt('v_roca'); drain();
          check('M1 · Al volver a hablar: tarjeta o ficha de especie', opciones().length === 3 && opciones().some(x => x.includes('ficha')), opciones().join());
          pick('Ver su tarjeta');
          check('M1 · Tarjeta de Roca: 2 «sabe hacer» con icono y texto y 1 «necesita»', G.ui.cardOpen && $('card').querySelectorAll('.ep6-lista li').length === 3 && /cargar fuerte/.test($('card').textContent) && /mire desde arriba/.test($('card').textContent), $('card').textContent.slice(0, 80));
          pick('Cerrar');
          useAt('v_mira'); drain(); pick('Ver su ficha');
          check('M1 · Ficha de especie de Mira: nombre científico de especies.js (sin inventar nada)', S.collected.includes('ficha_vista') && /Amazona versicolor|BirdLife/.test($('d-text').textContent), $('d-text').textContent.slice(0, 60));
          drain();
          useAt('o_mira'); drain(); useAt('o_marea'); drain();
          check('M1 · Observadas las dos: ahora las parejas', S.step === 3 && S.collected.includes('obs_sombra') && S.collected.includes('obs_rio'), 'paso ' + S.step);
          useAt('mesa'); drain();
          check('M1 · La mesa: elegir a quién presentar (6 libres)', opciones().length === 6, opciones().join());
          pick('Mira'); pick('Roca');
          check('M1 · Una pareja que no se cubre solo saluda (sin castigo)', !S.collected.some(k => k.startsWith('pareja_')) && !G.ui.cardOpen);
          useAt('mesa'); drain(); pick('Mira'); pick('Brote');
          useAt('mesa'); drain(); pick('Roca'); pick('Eco');
          check('M1 · Dos parejas hechas; quedan 2 libres en la mesa', G.ep6.PAREJAS.filter(p => S.collected.includes('pareja_' + p.join('+'))).length === 2 && (useAt('mesa'), drain(), opciones().length === 2), opciones().join());
          pick('Marea'); pick('Nudo');
          check('M1 · Tres parejas: tarjetas llenas, misión 1 y el mapa', G.eventos.had('CardsFilled') && S.step === 4 && S.missions.conocer && S.unlocked.includes('mano:mapa'), 'paso ' + S.step);

          // M2 · Nadie lo levanta solo
          useAt('cuaderno'); drain();
          check('M2 · Iguaca: objetivo y límites (3 para elegir)', opciones().length === 3, opciones().join());
          pick('Nadie hace algo');
          check('M2 · Un límite no es el objetivo: se explica y se repite', !S.collected.includes('criterios') && opciones().length === 3);
          pick('aguanta a todos');
          check('M2 · Criterios escritos', S.collected.includes('criterios') && S.step === 5, 'paso ' + S.step);
          useAt('cuaderno'); drain();
          check('M2 · El tablero: 5 tareas, 6 ayudantes y Vittata en todas (el plan de su cabeza)', G.ui.cardOpen && document.querySelectorAll('#card [data-tarea]').length === 5 && document.querySelectorAll('#card [data-ayud]').length === 6 && G.ep6.TAREAS.every(t => G.ep6.PL().asig[t.id] === 'vittata'));
          check('Tablero y tarjetas con botones de 56 px', [...document.querySelectorAll('#card .ep6-tarea, #card .ep6-ayud')].every(b => parseFloat(getComputedStyle(b).minHeight) >= 56));
          pick('Probar el plan');
          check('M2 · Prueba 1, Vittata sola: se atasca en «cargar», sin castigo, y pasa PlanStuck', G.eventos.had('PlanStuck') && G.ep6.PL().atasco === 'cargar' && G.ui.cardOpen && /medio levantar/.test($('card').textContent) && !G.eventos.had('PlanMade'), $('card').textContent.slice(0, 80));
          pick('Volver al tablero'); drain();
          check('M2 · Roca se ofrece («¿Puedo?») y el tablero vuelve', G.ui.cardOpen && document.querySelectorAll('#card [data-tarea]').length === 5);
          asignar('roca', 'cargar'); asignar('roca', 'revisar'); asignar('nudo', 'atar'); asignar('mira', 'avisar');
          pick('Probar el plan');
          check('M2 · Prueba 2: Roca no vuela alto; se ve dónde se atasca (revisar) con icono y frase', G.ep6.PL().atasco === 'revisar' && G.ep6.PL().pruebas === 2 && /vuele alto/.test($('card').textContent) && !G.eventos.had('PlanMade'));
          pick('Siguiente paso'); pick('Siguiente paso');
          check('M2 · La simulación se puede ver paso a paso', $('card').querySelectorAll('.ep6-sim li small').length >= 3);
          pick('Volver al tablero');
          asignar('mira', 'revisar'); asignar('nudo', 'sostener'); asignar('brote', 'atar'); asignar('aprendiz', 'avisar');
          pick('Probar el plan');
          check('M2 · Prueba 3, el plan que enseña: Brote ata junto a Nudo y funciona', G.ui.cardOpen && /Probando el plan/.test($('card').textContent) && !G.ep6.simular(G.ep6.PL().asig).atasco && G.ep6.simular(G.ep6.PL().asig).tipo === 'ensena', JSON.stringify(G.ep6.PL().asig));
          pick('Cerrar'); drain();
          check('M2 · PlanMade (enseña), 3 pruebas registradas y Vittata a la tercera percha', G.eventos.had('PlanMade') && S.collected.includes('plan_ensena') && S.step === 6 && G.ep6.PL().pruebas === 3, 'paso ' + S.step);
          check('Ninguna asignación lo maximiza todo: rápido, enseña y descansa son los tres planes que funcionan y cada uno tiene su costo', (() => {
            const s = sim(), base = { cargar: 'roca', sostener: 'vittata', atar: 'nudo', revisar: 'mira', avisar: 'mira' };
            const rap = s(base), des = s(Object.assign({}, base, { avisar: 'aprendiz' })), ens = s(Object.assign({}, base, { avisar: 'brote' }));
            return rap.tipo === 'rapido' && des.tipo === 'descansa' && ens.tipo === 'ensena' && des.total > rap.total && ens.total > des.total && s(Object.assign({}, base, { atar: 'brote' })).atasco === 'atar';
          })());
          // La tabla grande entre tres: dos ayudantes en sus perchas, Vittata posada en la tercera
          const p = G.ep6.perchaV; teleport(p.x, p.z); tick(0.1);
          G.interaccion.action(); drain();
          check('M2 · Sin posarse en la percha no hay señal (aviso, sin castigo)', !S.collected.includes('levantada'));
          S.pos.y = p.y; tick(0.1); G.interaccion.action(); drain();
          check('M2 · Posada en la tercera percha: la tabla grande sube', S.collected.includes('levantada') && S.step === 7, 'paso ' + S.step);
          useAt('tabla_larga'); drain(); pick('Yo sola');
          check('M2 · La tabla larga no se mueve con una sola punta', !G.ep6.llevando());
          useAt('tabla_larga'); drain(); pick('agarre la otra punta');
          check('M2 · Entre dos sí: la tabla sigue a Vittata y Roca va en la otra punta', G.ep6.llevando() && S.collected.includes('tabla_dos'));
          useAt('colocar'); drain();
          check('M2 · Colocada: RaisedTogether, misión 2 y el cuaderno; Brote ata el último nudo', G.eventos.had('RaisedTogether') && S.missions.obra && S.unlocked.includes('mano:cuaderno') && S.step === 8, 'paso ' + S.step);

          // M3 · El círculo
          useAt('grupos'); drain();
          check('M3 · Mediación, paso 1: repetir con tus palabras lo de la isla alta (3 opciones)', opciones().length === 3 && G.actores.npc('alta').visible, opciones().join());
          pick('más bonito');
          check('M3 · Repetido mal: el grupo corrige con calma y se repite', !S.collected.includes('escucha_alta') && opciones().length === 3);
          pick('quien llegue tarde');
          check('M3 · Vittata quiere proponer ya: Iguaca la frena', opciones().length === 2 && opciones().some(x => x.includes('Proponer ya')));
          pick('Proponer ya');
          check('M3 · «Todavía no»: se escucha al otro grupo (sin castigo)', S.collected.includes('propuso_antes') && opciones().length === 3 && !S.collected.includes('escucha_baja'));
          pick('los mayores lleguen');
          check('M3 · Paso 3: qué comparten', S.collected.includes('escucha_baja') && opciones().length === 3 && opciones().some(x => x.includes('nadie se quede fuera')), opciones().join());
          pick('quieren mandar'); pick('nadie se quede fuera');
          check('M3 · Las tres propuestas: nadie se va', opciones().length === 3, opciones().join());
          pick('Una mezcla');
          check('M3 · GroupsListened con la mezcla', G.eventos.had('GroupsListened') && S.collected.includes('propuesta_mezcla') && S.step === 9, 'paso ' + S.step);
          useAt('marcas'); drain();
          check('M3 · 4 formas para los 36', opciones().length === 4, opciones().join());
          pick('4 filas de 9');
          check('M3 · Forma 4×9: 36 marcas en la plaza, 4 encendidas (Vittata, Iguaca, el Guardián y el aprendiz)', G.eventos.had('CircleFormed') && G.ep6.asientos.children.length === 36 && G.ep6.sentados() === 4 && S.step === 10, 'paso ' + S.step);
          for (const k of ['mira', 'roca', 'marea', 'nudo', 'eco', 'brote']) { useAt('v_' + k); drain(); } useAt('s_alta'); drain(); useAt('s_baja'); drain();
          check('M3 · Los 8 invitados: 22 asientos encendidos y 14 esperando', G.ep6.sentados() === 22 && S.step === 11 && G.ep6.asientos.children.filter(m => m.material.emissiveIntensity > 0.5).length === 22, G.ep6.sentados());
          useAt('guardian'); drain();
          check('M3 · El pacto renovado y el final de temporada: pava, cuaderno y pantalla de fin', G.eventos.had('PactRenewed') && G.eventos.had('Chapter6Completed') && S.complete && S.step === G.misiones.DONE && S.missions.circulo && S.unlocked.includes('pava') && !$('end').hidden);
          check('El cómic sale de los eventos (con la viñeta del atasco, que sí pasó)', G.comic.comicPanels().length === 6, G.comic.comicPanels().length);

          // ---------- §5 «Iguaca te pregunta» · §6 Modo Maestro · §7 Diario y criadero ----------
          G.ui.showCard = show0; // las tarjetas del Aula traen su EN en lecciones.js: no se apuntan
          const AU = G.aula, LEC = AU.LEC || {}, MM = LEC.modo_maestro || {}, QS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];
          const aulaRaw = (() => { try { return localStorage.getItem(AU.KEY); } catch (e) { return null; } })();
          check('Aula del cap. 6 con su propia clave y la misma puerta que el cap. 1', AU.activo && AU.KEY === 'amazonaverse.aula.ep6' && (AU.nuevoReto(), AU.reto() >= 78 && AU.reto() <= 171), AU.KEY);
          const g45 = MM.guia_45_min || {};
          check('Esquema igual a los eps. 2–5: 4 objetivos, 6 preguntas, 6 fichas, guía de 45 min, 3 sin pantalla y rúbrica de 5',
            (LEC.objetivos || []).length === 4 && (LEC.preguntas || []).length === 6 && (LEC.diario || []).length === 6 && g45.antes && g45.antes.minutos + g45.durante.minutos + g45.despues.minutos === 45 &&
            (MM.actividades_sin_pantalla || []).length === 3 && MM.rubrica && MM.rubrica.criterios.length === 5 && MM.reporte_progreso.almacenamiento.clave === AU.KEY);
          check('Ninguna ficha sale sin fuente: la conducta en bandada va por verificar; solo la aritmética de 36 está verificada', AU.fichas().every(f => f.id === 'forma') && LEC.diario.filter(f => f.verificacion === 'por_verificar').every(f => f.fuente && f.nota_verificacion));
          check('Las 6 preguntas se pueden hacer: ninguna depende de un dato por verificar', QS.every(id => AU.preguntaPublicable(AU.pregunta(id))));
          check('Nunca «grados» en lo que ve el maestro ni el niño', !/grado/i.test(JSON.stringify([g45, (MM.actividades_sin_pantalla || []).map(a => [a.titulo, a.materiales, a.pasos]), MM.rubrica, LEC.objetivos.map(o => o.enunciado), LEC.preguntas.map(q => [q.enunciado, q.opciones, q.retro])])));
          G.misiones.seguirExplorando();
          check('Tras el final, el mundo queda libre para seguir', $('end').hidden && !G.ui.busy());
          useAt('iguaca'); drain();
          check('Al volver con Iguaca, ofrece las preguntas (se pueden dejar para luego)', opciones().length === 2 && opciones().some(x => x.includes('Ahora no')), opciones().join() + ' · paso ' + S.step + ' · cerca ' + (G.interaccion.nearest() || {}).id + ' · ' + ($('card').querySelector('h2') || {}).textContent);
          pick('Ahora no');
          useAt('iguaca'); drain(); pick('Sí, pregúntame');
          const card = $('card'), opt = i => card.querySelector(`.edu-opt[data-i="${i}"]`), correcta = id => AU.pregunta(id).correcta;
          check('Iguaca te pregunta: tarjeta formativa sin puntaje visible', G.ui.cardOpen && card.querySelector('.edu-q') && !/punt|score|\d+\s*\/\s*\d+|%/i.test(card.textContent), card.textContent.slice(0, 80));
          opt(correcta('q1') === 0 ? 1 : 0).click(); opt(correcta('q1')).click(); $('edu-seguir').click();
          for (const id of QS.slice(1)) { opt(correcta(id)).click(); const sg = $('edu-seguir'); if (sg) sg.click(); }
          drain();
          check('Las 6 respondidas: la tarjeta se cierra', QS.every(id => S.edu.formativa[id]) && !G.ui.cardOpen, JSON.stringify(S.edu.formativa));
          const pr = AU.partida();
          check('Reporte local: 3 misiones, los 4 objetivos, 3 planes probados, atasco, plan final, propuesta y forma, sin el nombre', pr && pr.preguntas.q1 === 2 && pr.misiones_completadas.length === 3 && ['F1', 'F2', 'F3', 'F4'].every(o => pr.objetivos_logrados.includes(o)) && pr.planes_probados === 3 && pr.atasco === 'revisar' && pr.plan_final === 'ensena' && pr.propuesta === 'mezcla' && pr.forma === '4x9' && !JSON.stringify(pr).includes('Prueba'), JSON.stringify(pr));
          const csv = AU.reporteCSV();
          check('CSV del Modo Maestro con el plan final y la forma', csv.includes('plan_final') && csv.includes('ensena') && csv.includes('4x9'));
          check('Modo Maestro: pestaña del cap. 6', AU.pestanas().includes('ep6') && (AU.abrirMaestro(), AU.maestroAbierto()) && (AU.cerrarMaestro(), !AU.maestroAbierto()));
          for (const f of G.diario.entries) { teleport(f.x + 0.3, f.z); tick(0.1); }
          check('Diario: 6 hallazgos del pacto y el mapa de las islas que faltan', S.field.length === 6 && G.diario.count('pacto') === 6 && S.unlocked.includes('mano:mapa_islas'), S.field.join(','));
          check('Cada hallazgo tiene su ficha y el texto del juego no afirma conductas reales de las especies', G.diario.entries.every(e => LEC.diario.some(f => f.id === e.id)) && !/bandada|depredador|especie/i.test(G.diario.entries.map(e => e.texto).join(' ')));
          const HV = (window.AV_HUEVOS && window.AV_HUEVOS.huevos) || [];
          check('Criadero del juego: el nido entra con las tarjetas; ninguna cápsula se compra; los visitantes no son premios', !!G.criadero && G.pack.criadero.desde === 'CardsFilled' && G.criadero.KEY === 'amazonaverse.criadero' && G.guardado.KEY.startsWith('ep6.') && HV.every(h => !/precio|price|compra|buy/i.test(JSON.stringify(h.obtener))) && !G.pack.recursos.length, G.criadero.KEY + ' · ' + G.guardado.KEY);
          check('Sin violencia, villanos, chat ni compras en el texto del capítulo', !/matar|pelea|golpe|\barmas\b|espada|villano|comprar|\bchat\b/i.test(JSON.stringify(G.pack.dialogos.datos()) + JSON.stringify(G.misiones.steps.map(s => s.texto))));
          // Guardar y cargar
          try { if (aulaRaw == null) localStorage.removeItem(AU.KEY); else localStorage.setItem(AU.KEY, aulaRaw); } catch (e) { /* sin almacenamiento */ }
          G.guardado.save(true); const snap = G.guardado.serialize(); G.guardado.reset(true);
          try { localStorage.setItem(G.guardado.KEY, snap); } catch (e) { /* sin almacenamiento */ }
          check('Guardar y cargar: el plan, la forma y los asientos vuelven', G.guardado.load(true) && S.complete && S.plan && S.plan.pruebas === 3 && S.collected.includes('forma_4x9') && G.ep6.asientos.children.length === 36 && G.ep6.sentados() === 22 && S.edu.formativa.q1 === 2);
          // Inglés: cada texto que se vio tiene su EN (content/ep6/en.js o el común de cap1), igual que los pasos, misiones y Diario
          const datos = G.misiones.steps.map(s => s.texto).concat(G.pack.misiones.flatMap(m => [m.titulo, m.hud].concat(m.pasos.map(x => x.texto))),
            G.diario.entries.flatMap(e => [e.nombre, e.texto]), G.pack.ropa.flatMap(r => [r.nombre, r.pista]), [G.pack.historia.fin()], Object.values(G.pack.meta.hud).filter(v => typeof v === 'string'),
            G.ep6.TAREAS.flatMap(t => [t.titulo, t.atasco]), Object.values(G.ep6.PERSONAS).map(p => p.nombre), G.ep6.VISITANTES.flatMap(v => [v.presenta, v.observa || '', v.necesita].concat(v.sabe)));
          datos.forEach(ver);
          await G.idioma.poner('en'); await G.idioma.listo;
          const sinEN = G.idioma.faltan([...vistos]);
          check('ES y EN: todo lo que se vio en la partida tiene inglés (' + vistos.size + ' textos)', G.idioma.activo() && vistos.size > 120 && !sinEN.length, sinEN.slice(0, 8).join(' | '));
          check('En inglés, el HUD del capítulo sale traducido', $('quest').querySelector('h1').textContent === 'The Pact of the 36', $('quest').querySelector('h1').textContent);
          await G.idioma.poner('es');
          G.guardado.reset(true);
          try { if (criaderoRaw == null) localStorage.removeItem(G.criadero.KEY); else localStorage.setItem(G.criadero.KEY, criaderoRaw); } catch (e) { /* sin almacenamiento */ }
          if (AU.recargar) AU.recargar();
        } catch (e) {
          check('La prueba corre sin excepciones', false, String(e && e.stack || e).slice(0, 300));
        } finally {
          D.say = say0; D.choose = choose0; G.ui.toast = toast0; G.ui.showCard = show0; grabando = false;
          T.restoreSave(keep);
          G.quiet = false;
        }
        return result();
      },
    },
  });
})();
