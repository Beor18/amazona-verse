/* Datos compartidos entre packs · Criadero de cotorras (huevos, etapas, XP y traits)
   Lo lee src/game/criadero.js; cualquier pack puede reutilizarlo (cap1, cap2, plantilla, forks).
   - No es un pack: asigna window.AV_HUEVOS (convención de ARQUITECTURA.md para datos grandes).
     criadero.js lo carga solo si falta: content/comun/huevos.js.
   - Textos visibles en { es, en }. Claves en español y estables: el guardado del criadero las usa.
   - Rareza = dificultad del reto. Todo se GANA jugando y aprendiendo: no hay azar, no se compra y no hay tiempo límite.
   - Capa real: las fichas 'verificado' se muestran con su fuente; las 'parcial' y 'por_verificar' solo salen en el Modo
     Maestro (lista de pendientes), como las fichas del Diario (EDUCATIVO.md §5).
   Diseño: docs/equipo/HUEVOS_GDD.md · Traits: docs/equipo/TRAITS_V2.md · Bandera: docs/BANDERA_PR_GUIA.md */
(function () {
  'use strict';

  // XP acumulada para llegar al nivel L: 5(L-1)² + 30(L-1). Bebé 1–5, juvenil 6–15, adulto 16–20.
  const NIVELES = [];
  for (let L = 1; L <= 20; L++) NIVELES.push(5 * (L - 1) * (L - 1) + 30 * (L - 1));

  window.AV_HUEVOS = {
    version: 1,
    // Sufijo del almacén: la clave es `${pack.meta.almacen}.criadero` (los capítulos del mismo juego comparten criadero)
    sufijo: 'criadero',

    // ---------- XP ----------
    xp: {
      niveles: NIVELES,            // índice 0 = nivel 1
      nivelMax: 20,
      // Puntos por cada evento 'aprendizaje' (src/game/aula.js, diario.js, misiones.js). Cada tipo:id cuenta una sola vez.
      fuentes: {
        ficha: { xp: 40, grupo: 'aprender', nombre: { es: 'Ficha de ciencia', en: 'Science card' } },
        pregunta: { xp: [20, 15, 10], grupo: 'aprender', nombre: { es: 'Luma te pregunta', en: 'Luma asks' } }, // por intento: el esfuerzo siempre suma
        paso: { xp: 15, grupo: 'aprender', nombre: { es: 'Paso de la misión educativa', en: 'Learning mission step' } },
        hallazgo: { xp: 25, grupo: 'explorar', nombre: { es: 'Hallazgo del Diario', en: 'Field journal find' } },
        mision: { xp: 60, grupo: 'explorar', nombre: { es: 'Misión', en: 'Mission' } },
        liberacion: { xp: 80, grupo: 'aprender', nombre: { es: 'Lección de la liberación', en: 'Release lesson' } },
        cuidado: { xp: 5, grupo: 'cuidar', nombre: { es: 'Cuidado', en: 'Care' } },
      },
    },

    // ---------- Incubación (enseña la duración real) ----------
    // Cada 4 XP de aprender o explorar es "un día" de calor. A los 26 días la cápsula está lista.
    // La XP de la incubación no se pierde: el pichón nace con ella.
    incubacion: { dias: 26, xpPorDia: 4 },

    // ---------- Cuidado (sin castigo) ----------
    // No hay medidores que bajen con el tiempo real. Las cargas de cuidado se recargan aprendiendo:
    // 1 carga por cada 30 XP de aprender o explorar, hasta 4. Sin cargas, el pichón sigue feliz y te invita a explorar.
    cuidado: {
      cargasMax: 4, xpPorCarga: 30,
      acciones: [
        { id: 'comida', icono: 'semilla', postura: 'comiendo', nombre: { es: 'Comida', en: 'Food' }, frase: { es: '¡Ñam! Frutas del bosque.', en: 'Yum! Forest fruit.' } },
        { id: 'agua', icono: 'gota', postura: 'bebiendo', nombre: { es: 'Agua', en: 'Water' }, frase: { es: 'Agua fresca de la quebrada.', en: 'Fresh stream water.' } },
        { id: 'juego', icono: 'pelota', postura: 'jugando', nombre: { es: 'Jugar', en: 'Play' }, frase: { es: '¡A jugar con la semilla!', en: 'Let\'s play with the seed!' } },
        { id: 'descanso', icono: 'luna', postura: 'durmiendo', nombre: { es: 'Descansar', en: 'Rest' }, frase: { es: 'Shh… está soñando con volar.', en: 'Shh… dreaming of flying.' } },
      ],
    },

    // ---------- Etapas ----------
    // Bebé y juvenil se derivan del MISMO modelo de Vittata con escalas uniformes por hueso (API pública: ch.bones).
    // huesos: factor local por hueso (los hijos lo heredan). No se escalan los mount_* ni 'pico' (TA).
    // plumon: cascarones de pelusa sobre la misma malla (shell fur), solo bebé y juvenil. El adulto es el modelo intacto.
    etapas: [
      { id: 'huevo', nombre: { es: 'Huevo', en: 'Egg' }, real: { es: 'Huevo', en: 'Egg' } },
      { id: 'bebe', nombre: { es: 'Bebé', en: 'Baby' }, real: { es: 'pichón', en: 'nestling' }, niveles: [1, 5],
        proporciones: { escala: 0.5, huesos: { cabeza001: 1.42, armL1: 0.72, armL1001: 0.72, pieL1: 0.74, pieL1001: 0.74, pieL4: 1.22, pieL7: 1.22, pieL8: 1.22, pieL4001: 1.22, pieL7001: 1.22, pieL8001: 1.22, espalda1001: 0.42 },
          plumon: { capas: 4, largo: 0.022, color: '#eef0e2', punta: '#cfe6b8' } },
        posturas: ['sentado', 'caminando', 'saltando', 'aleteando', 'durmiendo', 'jugando'] },
      { id: 'juvenil', nombre: { es: 'Juvenil', en: 'Juvenile' }, real: { es: 'volantón', en: 'fledgling' }, niveles: [6, 15],
        proporciones: { escala: 0.76, huesos: { cabeza001: 1.16, armL1: 0.9, armL1001: 0.9, pieL1: 0.9, pieL1001: 0.9, pieL4: 1.06, pieL7: 1.06, pieL8: 1.06, pieL4001: 1.06, pieL7001: 1.06, pieL8001: 1.06, espalda1001: 0.74 },
          plumon: { capas: 2, largo: 0.012, color: '#d9ead0', punta: '#9fcf8a' } },
        posturas: ['sentado', 'caminando', 'saltando', 'aleteando', 'durmiendo', 'jugando'] },
      { id: 'adulto', nombre: { es: 'Adulto', en: 'Adult' }, real: { es: 'adulto', en: 'adult' }, niveles: [16, 20],
        proporciones: { escala: 1, huesos: {}, plumon: null },
        posturas: ['sentado', 'caminando', 'saltando', 'aleteando', 'durmiendo', 'jugando'] },
    ],

    // Posturas y animaciones del bebé (src/game/criadero.js las arma con clips del rig + rot() de la API pública)
    posturas: [
      { id: 'sentado', nombre: { es: 'Sentado', en: 'Sitting' }, base: 'Idle' },
      { id: 'caminando', nombre: { es: 'Caminando', en: 'Walking' }, base: 'Walk' },
      { id: 'saltando', nombre: { es: 'Saltando', en: 'Hopping' }, base: 'Idle' },
      { id: 'aleteando', nombre: { es: 'Aleteando', en: 'Flapping' }, base: 'Idle' },
      { id: 'durmiendo', nombre: { es: 'Durmiendo', en: 'Sleeping' }, base: 'Idle' },
      { id: 'jugando', nombre: { es: 'Jugando', en: 'Playing' }, base: 'Celebrate' },
      // usadas por el cuidado
      { id: 'comiendo', nombre: { es: 'Comiendo', en: 'Eating' }, base: 'Idle', interna: true },
      { id: 'bebiendo', nombre: { es: 'Bebiendo', en: 'Drinking' }, base: 'Idle', interna: true },
    ],

    // ---------- Cápsulas (huevos temáticos) ----------
    // FANTASÍA: la cápsula decorada (pétalos que se abren). REAL: dentro siempre hay un huevo BLANCO, como el de Amazona vittata.
    // cria: nombre de la cotorrita (preestablecido; el niño no escribe texto libre). rareza: nivel del reto (no es probabilidad). obtener: condición por pack; 'defecto' para packs sin mapa propio.
    //   Condiciones: { inicio } · { mision: id } · { hallazgos: { cat?, min } } · { fichas: min } · { preguntas: min }
    //                { misiones: min } · { liberadas: min } · { xpAprender: min } · { todas: [cond, ...] }
    // traits: por etapa, piezas del ropero ({ slot, id, color, style }) y piezas NUEVAS ({ nuevo: 'id_trait' }, ver TRAITS_V2.md),
    //   con 'respaldo' existente para que el prototipo las muestre ya.
    huevos: [
      { id: 'clasico', cria: { es: 'Iguaca', en: 'Iguaca' }, rareza: 'inicial', nombre: { es: 'Cápsula de nido', en: 'Nest capsule' },
        lema: { es: 'Como la cavidad de un palo colorado.', en: 'Like a palo colorado tree cavity.' },
        aspecto: { patron: 'paja', a: '#c9a26b', b: '#8a6a3a', brillo: 0 },
        obtener: { texto: { es: 'Abre el criadero por primera vez.', en: 'Open the hatchery for the first time.' }, defecto: { inicio: true } },
        traits: {
          bebe: [{ nuevo: 'cascaron_gorro' }, { slot: 'neck', id: 'panuelo', color: '#f2a03d', style: 'liso' }],
          juvenil: [{ slot: 'eyes', id: 'gafas', color: '#5a3a22' }],
          adulto: [{ slot: 'head', id: 'sombrero', color: '#8a6a3a' }, { slot: 'chest', id: 'brujula', color: '#c9a227' }, { nuevo: 'anillo_cientifico' }],
        } },
      { id: 'tropical', cria: { es: 'Flor', en: 'Flor' }, rareza: 'exploracion', nombre: { es: 'Cápsula tropical', en: 'Tropical capsule' },
        lema: { es: 'Pétalos de flor de bosque.', en: 'Forest flower petals.' },
        aspecto: { patron: 'flores', a: '#ff5e8a', b: '#ffb347', brillo: 0 },
        obtener: { texto: { es: 'Completa la misión del coro de coquíes.', en: 'Finish the coquí chorus mission.' }, cap1: { mision: 'm3' }, defecto: { xpAprender: 200 } },
        traits: {
          bebe: [{ nuevo: 'cascaron_gorro' }, { slot: 'neck', id: 'panuelo', color: '#ff7a59', style: 'caribe' }],
          juvenil: [{ slot: 'head', id: 'sombrero2', color: '#ff4f8b', style: 'tropical' }],
          adulto: [{ slot: 'torso', id: 'camisa', color: '#2fb5c8', style: 'hawaiana' }, { slot: 'feet', id: 'botas', color: '#2fb5c8', style: 'chancletas' }, { nuevo: 'anillo_cientifico' }],
        } },
      { id: 'playa', cria: { es: 'Ola', en: 'Wave' }, rareza: 'exploracion', nombre: { es: 'Cápsula de playa', en: 'Beach capsule' },
        lema: { es: 'Arena, olas y caracoles.', en: 'Sand, waves and shells.' },
        aspecto: { patron: 'olas', a: '#f2dfb0', b: '#2fb5c8', brillo: 0 },
        obtener: { texto: { es: 'Completa la misión del fondo del río.', en: 'Finish the river bottom mission.' }, cap1: { mision: 'm1' }, defecto: { xpAprender: 150 } },
        traits: {
          bebe: [{ nuevo: 'cascaron_gorro' }, { slot: 'eyes', id: 'lentes', color: '#3d8fb0', style: 'redondas' }],
          juvenil: [{ slot: 'eyes', id: 'lentes', color: '#f2a03d', style: 'buceo' }],
          adulto: [{ slot: 'back', id: 'equipo', color: '#3d8fb0', style: 'tanques' }, { slot: 'feet', id: 'botas', color: '#2f6fd1', style: 'buzo' }, { nuevo: 'tabla_surf', respaldo: null }, { nuevo: 'anillo_cientifico' }],
        } },
      { id: 'bosque', cria: { es: 'Musgo', en: 'Moss' }, rareza: 'diario', nombre: { es: 'Cápsula del bosque', en: 'Forest capsule' },
        lema: { es: 'Musgo y hojas de los cuatro pisos del bosque.', en: 'Moss and leaves from the four forest layers.' },
        aspecto: { patron: 'hojas', a: '#4f8f3a', b: '#a6d46a', brillo: 0 },
        obtener: { texto: { es: 'Completa «La ruta de la gota».', en: 'Finish "The path of the drop".' }, cap1: { mision: 'educativa' }, defecto: { fichas: 3 } },
        traits: {
          bebe: [{ nuevo: 'cascaron_gorro' }, { slot: 'neck', id: 'panuelo', color: '#2f8f4e', style: 'liso' }],
          juvenil: [{ nuevo: 'binoculares', respaldo: { slot: 'eyes', id: 'lentes', color: '#2b2b2b', style: 'redondas' } }],
          adulto: [{ slot: 'torso', id: 'camisa', color: '#8a6a3a', style: 'chaleco' }, { nuevo: 'cuaderno_campo', respaldo: { slot: 'hand', id: 'mano', color: '#2f8f4e', style: 'mapa' } }, { nuevo: 'anillo_cientifico' }],
        } },
      { id: 'pr', cria: { es: 'Boricua', en: 'Boricua' }, rareza: 'cultura', nombre: { es: 'Cápsula boricua', en: 'Boricua capsule' },
        lema: { es: 'Estrellas blancas y una bandera fiel junto al nido.', en: 'White stars and a faithful flag by the nest.' },
        // Bandera: plana, 2:3 y en asta junto al nido (BANDERA_PR_GUIA.md §4). La cáscara solo lleva estrellas sueltas.
        aspecto: { patron: 'estrellas', a: '#f6f6f2', b: '#0044FF', c: '#EE0000', brillo: 0, bandera: true },
        obtener: { texto: { es: 'Encuentra 4 objetos de cultura del Diario.', en: 'Find 4 culture items in the journal.' }, cap1: { hallazgos: { cat: 'cultura', min: 4 } }, defecto: { hallazgos: { min: 4 } } },
        traits: {
          bebe: [{ nuevo: 'cascaron_gorro' }, { slot: 'neck', id: 'panuelo', color: '#2f8f4e', style: 'coqui' }],
          juvenil: [{ slot: 'head', id: 'pava', color: '#d6403a' }],
          // La bandera va en asta junto al nido en todas las etapas (no en la mano: así siempre se ve plana y derecha)
          adulto: [{ slot: 'torso', id: 'camisa', color: '#f4f4f0', style: 'guayabera' }, { slot: 'hand', id: 'mano', color: '#2f8f4e', style: 'coqui' }, { nuevo: 'anillo_cientifico' }],
        } },
      { id: 'espacial', cria: { es: 'Estrella', en: 'Star' }, rareza: 'preguntas', nombre: { es: 'Cápsula espacial', en: 'Space capsule' },
        lema: { es: 'Un cielo de estrellas y nebulosas.', en: 'A sky of stars and nebulae.' },
        aspecto: { patron: 'cosmos', a: '#141a3c', b: '#7cc6ff', brillo: 0.2 },
        obtener: { texto: { es: 'Responde las 7 preguntas de «Luma te pregunta» (cualquier intento cuenta).', en: 'Answer all 7 "Luma asks" questions (any attempt counts).' }, cap1: { preguntas: 7 }, defecto: { preguntas: 5 } },
        traits: {
          bebe: [{ nuevo: 'cascaron_gorro' }, { nuevo: 'casco_espacial', respaldo: { slot: 'eyes', id: 'lentes', color: '#f4f4f0', style: 'deportivas' } }],
          juvenil: [{ slot: 'feet', id: 'botas', color: '#3d8fb0', style: 'espacial' }],
          adulto: [{ slot: 'back', id: 'equipo', color: '#9aa0a3', style: 'jetpack' }, { nuevo: 'visor_espacial', respaldo: null }, { nuevo: 'anillo_cientifico' }],
        } },
      { id: 'dorado', cria: { es: 'Sol', en: 'Sun' }, rareza: 'coleccion', nombre: { es: 'Cápsula dorada', en: 'Golden capsule' },
        lema: { es: 'Para quien completa su Diario de Campo.', en: 'For those who complete their field journal.' },
        aspecto: { patron: 'grabado', a: '#e6b422', b: '#fff1b0', brillo: 1 },
        obtener: { texto: { es: 'Completa el Diario de Campo (12/12) y 3 misiones.', en: 'Complete the field journal (12/12) and 3 missions.' }, cap1: { todas: [{ hallazgos: { min: 12 } }, { misiones: 3 }] }, defecto: { xpAprender: 900 } },
        traits: {
          bebe: [{ nuevo: 'cascaron_gorro' }, { slot: 'chest', id: 'brujula', color: '#c9a227' }],
          juvenil: [{ slot: 'wings', id: 'brazaletes', color: '#c9a227' }],
          adulto: [{ slot: 'eyes', id: 'gafas', color: '#c9a227' }, { nuevo: 'lupa', respaldo: null }, { nuevo: 'anillo_cientifico' }],
        } },
      { id: 'cristal', cria: { es: 'Rocío', en: 'Dew' }, rareza: 'conservacion', nombre: { es: 'Cápsula de cristal', en: 'Crystal capsule' },
        lema: { es: 'Para quien cría una cotorra y aprende cómo se libera.', en: 'For those who raise a parrot and learn how it is released.' },
        aspecto: { patron: 'cristal', a: '#bfefff', b: '#e3c8ff', brillo: 0.6 },
        obtener: { texto: { es: 'Cría una cotorra hasta adulta y completa la lección de la liberación.', en: 'Raise a parrot to adulthood and finish the release lesson.' }, defecto: { liberadas: 1 } },
        traits: {
          bebe: [{ nuevo: 'cascaron_gorro' }, { nuevo: 'cristal_colgante', respaldo: { slot: 'chest', id: 'brujula', color: '#b9c4c9' } }],
          juvenil: [{ nuevo: 'visor_solar', respaldo: { slot: 'eyes', id: 'lentes', color: '#3d8fb0', style: 'deportivas' } }],
          adulto: [{ nuevo: 'kit_cientifico', respaldo: { slot: 'back', id: 'equipo', color: '#3d8fb0', style: 'mochila_pr' } }, { nuevo: 'anillo_cientifico' }],
        } },
    ],
    // Etiquetas del reto: hablan de lo que se aprende, nunca de "raro/épico/legendario" (vocabulario de cajas de botín)
    rarezas: {
      inicial: { es: 'Inicial', en: 'Starter' }, exploracion: { es: 'Exploración', en: 'Exploration' }, diario: { es: 'Diario', en: 'Journal' },
      cultura: { es: 'Cultura', en: 'Culture' }, preguntas: { es: 'Reto de preguntas', en: 'Questions challenge' },
      coleccion: { es: 'Reto del Diario completo', en: 'Full journal challenge' }, conservacion: { es: 'Reto de conservación', en: 'Conservation challenge' },
    },

    // ---------- Capa real: programa de recuperación de la cotorra puertorriqueña ----------
    // momento: cuándo se muestra en el criadero (abrir cápsula, incubar, nacer, juvenil, adulto, liberar).
    real: [
      { id: 'aviarios', momento: 'inicio', estado: 'verificado', fuente: 'USFWS (2026)', url: 'https://www.fws.gov/sites/default/files/documents/2026-02/202602_puerto-rican-parrot-info-doc-spanish.pdf',
        texto: { es: 'Hay dos aviarios de cotorras: Iguaca, en El Yunque (USFWS), y José Vivaldi, en Río Abajo (DRNA). Allí nacen y se crían cotorras para liberarlas en el bosque.', en: 'There are two parrot aviaries: Iguaca in El Yunque (USFWS) and José Vivaldi in Río Abajo (DRNA). Parrots hatch and grow there to be released into the forest.' } },
      { id: 'huevo_blanco', momento: 'abrir', estado: 'parcial', fuente: 'USDA Forest Service (enlace por reconfirmar)', url: '',
        nota: 'Dato general de los loros; pedir la cita al DRNA o al USFWS antes de publicarlo como ficha.',
        texto: { es: 'Los huevos de la cotorra puertorriqueña son blancos. Las cápsulas de colores son fantasía; el huevo de adentro es como el de verdad.', en: 'Puerto Rican parrot eggs are white. The colorful capsules are make-believe; the egg inside is like the real one.' } },
      { id: 'incubacion', momento: 'incubar', estado: 'parcial', fuente: 'USDA Forest Service; Encyclopedia.com', url: 'https://encyclopedia.com/environment/science-magazines/puerto-rican-parrot',
        nota: 'Las fuentes dan de 24 a 28 días (unos 26) y de 2 a 4 huevos. Confirmar con el DRNA.',
        texto: { es: 'La hembra calienta los huevos unos 26 días. Mientras tanto, el macho le trae comida.', en: 'The female keeps the eggs warm for about 26 days while the male brings her food.' } },
      { id: 'pichones', momento: 'nacer', estado: 'verificado', fuente: 'USFWS (2026)', url: 'https://www.fws.gov/sites/default/files/documents/2026-02/202602_puerto-rican-parrot-info-doc-spanish.pdf',
        texto: { es: 'Los aviarios también atienden a pichones silvestres heridos y les dan refugio de emergencia.', en: 'The aviaries also care for injured wild chicks and give them emergency shelter.' } },
      { id: 'cavidades', momento: 'juvenil', estado: 'verificado', fuente: 'USFWS (2026)', url: 'https://www.fws.gov/sites/default/files/documents/2026-02/202602_puerto-rican-parrot-info-doc-spanish.pdf',
        texto: { es: 'Las cotorras anidan en huecos de árboles. Hallar parejas que crían en cavidades naturales en Río Abajo y Maricao fue un gran logro.', en: 'Parrots nest in tree holes. Finding pairs breeding in natural cavities in Río Abajo and Maricao was a big milestone.' } },
      { id: 'liberacion', momento: 'adulto', estado: 'verificado', fuente: 'USFWS (2026)', url: 'https://www.fws.gov/sites/default/files/documents/2026-02/202602_puerto-rican-parrot-info-doc-spanish.pdf',
        texto: { es: 'Desde 2020 se liberan cotorras criadas en los aviarios en El Yunque y Río Abajo; en 2022 empezó la población de Maricao.', en: 'Since 2020, aviary-raised parrots have been released in El Yunque and Río Abajo; the Maricao population began in 2022.' } },
      { id: 'poblacion', momento: 'liberar', estado: 'verificado', fuente: 'USFWS (2026)', url: 'https://www.fws.gov/sites/default/files/documents/2026-02/202602_puerto-rican-parrot-info-doc-spanish.pdf',
        texto: { es: 'Hoy hay más de 900 cotorras entre silvestres y en aviarios, pero la especie sigue en peligro de extinción.', en: 'Today there are over 900 parrots in the wild and in aviaries, but the species is still endangered.' } },
      { id: 'maria', momento: 'liberar', estado: 'verificado', fuente: 'USFWS (2026)', url: 'https://www.fws.gov/sites/default/files/documents/2026-02/202602_puerto-rican-parrot-info-doc-spanish.pdf',
        texto: { es: 'El huracán María (2017) acabó con las cotorras silvestres de El Yunque. Los aviarios permitieron empezar de nuevo.', en: 'Hurricane Maria (2017) wiped out El Yunque\'s wild parrots. The aviaries made a fresh start possible.' } },
      { id: 'aclimatacion', momento: 'liberar', estado: 'por_verificar', fuente: 'Pendiente (DRNA/USFWS)', url: '',
        nota: 'Jaulas de aclimatación, entrenamiento previo y radiotransmisores: pedir el protocolo al programa antes de enseñarlo.',
        texto: { es: 'Antes de volar libres, las cotorras practican en jaulas grandes dentro del bosque.', en: 'Before flying free, parrots practice in large cages inside the forest.' } },
    ],

    // Lección corta de la liberación (desbloquea la cápsula de cristal). Solo usa datos verificados.
    liberacion: {
      preguntas: [
        { id: 'lib1', texto: { es: '¿Dónde se crían cotorras para liberarlas?', en: 'Where are parrots raised to be released?' },
          opciones: [{ es: 'En los aviarios de Iguaca y Río Abajo', en: 'In the Iguaca and Río Abajo aviaries' }, { es: 'En las tiendas de mascotas', en: 'In pet shops' }, { es: 'En la playa', en: 'At the beach' }], correcta: 0 },
        { id: 'lib2', texto: { es: '¿Por qué hicieron falta los aviarios después de María?', en: 'Why were the aviaries needed after Maria?' },
          opciones: [{ es: 'El huracán acabó con las cotorras silvestres de El Yunque', en: 'The hurricane wiped out El Yunque\'s wild parrots' }, { es: 'Las cotorras se mudaron a otra isla', en: 'The parrots moved to another island' }, { es: 'Para venderlas', en: 'To sell them' }], correcta: 0 },
        { id: 'lib3', texto: { es: '¿Sigue en peligro la cotorra puertorriqueña?', en: 'Is the Puerto Rican parrot still endangered?' },
          opciones: [{ es: 'Sí, aunque ya hay más de 900', en: 'Yes, even though there are over 900 now' }, { es: 'No, hay millones', en: 'No, there are millions' }, { es: 'Ya no existe', en: 'It no longer exists' }], correcta: 0 },
      ],
    },
  };
})();
