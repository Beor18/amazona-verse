/* Amazona Verse · V18.3 · personajes históricos del mundo abierto (datos de src/game/v18/npc.js; docs/equipo/V18_3_DISENO.md §1).
   Solo datos: el sistema (npc.js) no lleva ningún personaje dentro. La fase 5 (Tuerca, Chispa, Maestro Moon, Piloto Cotorra)
   añade filas aquí sin tocar código (Chispa: src/game/v18/chispa.js).
   Fila = { id, nombre {es,en}, rol, modelo (ruta literal del .glb, para que la build lo conserve), script (_glb.js), b64 (clave en
   window.AV_PERSONAJES_B64), respaldo (id de otra fila cuyo modelo se usa mientras falte el propio), provisional, alto (escala sobre
   la del .glb), retrato (ruta) o insignia ({ fondo, icono }) si aún no hay retrato, anim { idle, hablar, trabajar, senalar }
   (nombres de las acciones del .glb), mallas (grupos de mallas que se encienden y apagan), accesorios (piezas simples por
   instancia: casco, chaleco…, en el espacio del modelo), apariencias { nombre: { mallas, colores { MATERIAL: '#hex' }, accesorios } },
   estados [orden narrativo; el primero es el de partida], transiciones { de: { a: true } } (solo hacia delante; nunca se cambia de
   bando sin una causa en la misión: directiva V18.3 §8), porEstado { estado: { apariencia, anim, dialogo: [texto…] } }.
   Un modelo, varias apariencias (§8): nada de modelos nuevos por estado.
   Nombres en pantalla: «el Constructor» y «la Ingeniera» (provisionales; los definitivos los decide Kelvin, V18_3_AUDITORIA §0.4).
   El inglés de cada texto está en content/cap1/en.js. */
window.AV_NPC_V18 = [
  {
    id: 'ingeniera', nombre: { es: 'La Ingeniera', en: 'The Engineer' }, rol: 'aliada',
    // BM160 (Mac, 5-nov): modelo propio, colores lisos, sin foto ni marcas; mallas rígidas animadas por nodos (sin skin)
    modelo: 'assets/models/personajes/ingeniera.glb', script: 'assets/models/personajes/ingeniera_glb.js', b64: 'ingeniera',
    alto: 1, retrato: 'assets/retratos/v18/ingeniera.jpg',
    anim: { idle: 'Idle', hablar: 'Hablar', trabajar: 'Reparar', senalar: 'Hablar' },
    mallas: { Guantes: ['GuanteL', 'GuanteR'] },
    accesorios: {
      insignia: { hueso: null, forma: 'insignia', color: '#ffd84a', pos: [0.95, 5.3, 1.5] }
    },
    apariencias: {
      // De aprendiz: mono claro, guantes y cinturón (variante «aprendiz» del .glb), sin chaqueta ni mochila
      aprendiz: { mallas: { Chaqueta: false, Mochila: false, Cinturon: true, Guantes: true }, colores: { MONO: '#6f8fa8', GUANTES: '#c98a3c' }, accesorios: [] },
      // Responsable de la reconstrucción: chaqueta, cinturón, mochila y guantes (variante «ingeniera») e insignia dorada
      responsable: { mallas: { Chaqueta: true, Mochila: true, Cinturon: true, Guantes: true }, colores: { MONO: '#1f3550', CHAQUETA: '#e8622a', GUANTES: '#7a4a1e' }, accesorios: ['insignia'] }
    },
    estados: ['aprendiz', 'responsable'],
    transiciones: { aprendiz: { responsable: true } },
    porEstado: {
      aprendiz: { apariencia: 'aprendiz', anim: 'idle', dialogo: ['Esa máquina no debería estar ahí. Vamos a mirar bien antes de tocar nada.'] },
      responsable: { apariencia: 'responsable', anim: 'idle', dialogo: ['¡Mira la escalera! La hicimos juntas, tabla por tabla.', 'Ahora la máquina riega flores en vez de tapar caminos.'] }
    }
  },
  {
    id: 'constructor', nombre: { es: 'El Constructor', en: 'The Builder' }, rol: 'antagonista',
    // BM159 (Mac, 6-nov): modelo propio (1,75 m, colores lisos, sin foto ni marcas); mallas rígidas animadas por nodos (sin skin).
    // Casco, Chaleco, GuanteL/R, Botas y Mochila son mallas separadas del .glb que se encienden y apagan. Acciones del .glb: Idle,
    // Hablar, Señalar y Enfadado (Reparar llegó con BM164: martilleo en bucle).
    modelo: 'assets/models/personajes/constructor.glb', script: 'assets/models/personajes/constructor_glb.js', b64: 'constructor',
    alto: 1, retrato: 'assets/retratos/v18/constructor.jpg',
    anim: { idle: 'Idle', hablar: 'Hablar', trabajar: 'Reparar', senalar: 'Señalar', enfadado: 'Enfadado' },
    mallas: { Guantes: ['GuanteL', 'GuanteR'] },
    apariencias: {
      // Supervisor industrial: casco amarillo y chaleco naranja de bandas del .glb, camisa oscura, nada de herramientas ni guantes
      supervisor: { mallas: { Casco: true, Chaleco: true, Mochila: false, Guantes: false, Botas: true }, colores: {}, accesorios: [] },
      // El que empieza a reparar: sin chaleco, con mochila de herramientas y guantes del .glb, camisa de trabajo más cálida
      reparador: { mallas: { Casco: true, Chaleco: false, Mochila: true, Guantes: true, Botas: true }, colores: { CAMISA: '#7a5a3a' }, accesorios: [] }
    },
    estados: ['supervisor', 'reparador'],
    transiciones: { supervisor: { reparador: true } },
    porEstado: {
      supervisor: { apariencia: 'supervisor', anim: 'hablar', dialogo: ['¿Las cotorras? Se mudan un ratito y ya. ¡Esta obra no se para!'] },
      reparador: { apariencia: 'reparador', anim: 'trabajar', dialogo: ['Construir rápido no es construir bien… Esta vez miré primero quién vive aquí.'] }
    }
  },
  {
    id: 'chispa', nombre: { es: 'Chispa', en: 'Chispa' }, rol: 'rival',
    // BM167 (Mac, 6-nov): modelo propio (shiba piloto, 1,25 m, colores lisos, sin marcas); acciones del .glb: Idle, Correr y Celebrar
    // (no trae «Hablar»: habla celebrando). Rival amistoso y cómico de la carrera de src/game/v18/chispa.js. Retrato: la captura de
    // frente de BM167 (docs/img/bm167). Si Kelvin no da el visto bueno al .glb, basta cambiar `modelo/script/b64` por
    // `respaldo: 'ingeniera', provisional: true` (sin tocar código).
    modelo: 'assets/models/personajes/chispa.glb', script: 'assets/models/personajes/chispa_glb.js', b64: 'chispa',
    alto: 1, retrato: 'assets/retratos/v18/chispa.jpg',
    anim: { idle: 'Idle', hablar: 'Celebrar', correr: 'Correr', celebrar: 'Celebrar', senalar: 'Celebrar' },
    apariencias: { piloto: { mallas: {}, colores: {}, accesorios: [] } },
    estados: ['rival'],
    transiciones: {},
    porEstado: {
      rival: { apariencia: 'piloto', anim: 'idle', dialogo: ['¡Hola, plumitas! Soy Chispa, la más veloz de los Portales. ¿Una carrerita?'] }
    }
  },
  {
    id: 'maestromoon', nombre: { es: 'Maestro Moon', en: 'Master Moon' }, rol: 'aliado',
    // BM168 (Mac, 6-nov): gato mentor (colores lisos, sin foto ni marcas; SIN armas, directiva V18.3 §6E); acciones del .glb:
    // Idle, Hablar y Señalar. Mentor de precisión y estrategia: su «Entrenamiento de esquiva» está en src/game/v18/moon.js
    // (un claro de las Lomas del Oeste, junto a la casita). Retrato: insignia provisional hasta que haya captura propia.
    modelo: 'assets/models/personajes/maestro_moon.glb', script: 'assets/models/personajes/maestro_moon_glb.js', b64: 'maestro_moon',
    alto: 1, insignia: { fondo: '#232a4d', color: '#f4d67c' },
    anim: { idle: 'Idle', hablar: 'Hablar', senalar: 'Señalar' },
    apariencias: { mentor: { mallas: {}, colores: {}, accesorios: [] } },
    estados: ['mentor'],
    transiciones: {},
    porEstado: {
      mentor: { apariencia: 'mentor', anim: 'idle', dialogo: ['Bienvenida a mi claro, pequeña cotorra. Yo soy Moon: aquí se entrena la esquiva, paso a paso.'] }
    }
  },
  {
    id: 'guardian', nombre: { es: 'Guardián del Primer Vuelo', en: 'Guardian of the First Flight' }, rol: 'aliado',
    // BM169 (Mac, 6-nov): piloto cotorra mentor histórico de vuelo (colores lisos, sin foto ni marcas; acciones del .glb:
    // Idle y Hablar). Su «Circuito del Primer Vuelo» está en src/game/v18/guardian.js, en un claro del suroeste de la isla
    // (docs/DIRECTIVA_V18_3_RESOLUCION.md §F). Retrato: insignia provisional hasta que haya captura propia.
    modelo: 'assets/models/personajes/guardian_vuelo.glb', script: 'assets/models/personajes/guardian_vuelo_glb.js', b64: 'guardian_vuelo',
    alto: 1, insignia: { fondo: '#123f4c', color: '#7ee0d2' },
    anim: { idle: 'Idle', hablar: 'Hablar', senalar: 'Hablar' },
    apariencias: { piloto: { mallas: {}, colores: {}, accesorios: [] } },
    estados: ['mentor'],
    transiciones: {},
    porEstado: {
      mentor: { apariencia: 'piloto', anim: 'idle', dialogo: ['¿Nuevas alas por aquí? Yo soy el Guardián del Primer Vuelo: de mí aprendieron a volar hasta las nubes viejas.'] }
    }
  }
];
