/* Amazona Verse · Lección del capítulo 4 «El precio del progreso» (EP4_GDD.md). PROPUESTA.
   Mismo esquema que content/cap1/lecciones.js y content/ep2/lecciones.js (lo lee src/game/aula.js tal cual): meta, objetivos,
   diario (fichas), preguntas, formativa y modo_maestro. Nada de src/ tocado.
   Reglas: el juego es para todas las edades (en el Aula: «Nivel 1» y «Nivel 2»; los valores internos 3-4 / 5-6 son los que
   entiende aula.js y nunca se muestran). Ninguna ficha sale al Diario sin fuente verificada: hoy las 6 van «por_verificar».
   Las preguntas hablan de lo que el jugador vio en el juego; la única con dato real (q6, huecos de nido) cita al USFWS, ya
   verificado en el ep. 2. [KELVIN] marca lo que es canon. */
window.AV_LECCIONES_EP4 = {
  "meta": {
    "capitulo": 4,
    "titulo": { "es": "El precio del progreso", "en": "The Price of Progress" },
    "version": "0.1-propuesta",
    "fecha": "2026-10-26",
    "grados": "3-6",
    "documento": "docs/equipo/EP4_GDD.md",
    "duracion_mision_min": 18,
    "i18n": "Todo texto visible es {es,en}. 'corto' (8 palabras o menos) se usa en el modo sin texto largo.",
    "verificacion_leyenda": {
      "verificado": "Dato leído en la fuente oficial citada.",
      "parcial": "Fuente confiable encontrada, pero hay que reconfirmar el enlace o es fuente secundaria.",
      "por_verificar": "Sin fuente confirmada. NO se publica hasta que lo valide una fuente oficial (USFWS, DRNA, USDA, USGS, NOAA, ICP)."
    },
    "fuentes_estandares": {
      "depr_2022": "https://dedigital.dde.pr/mod/resource/view.php?id=2854",
      "depr_formato": "Los indicadores DEPR 2022 de este capítulo van por verificar: sacarlos del documento oficial, no inventarlos.",
      "ngss": "https://www.nextgenscience.org/"
    }
  },

  "objetivos": [
    { "id": "E1", "tema": "observar", "grados": "3-6",
      "enunciado": { "es": "Observa un lugar antes de cambiarlo y describe lo que ya vive y se usa allí.", "en": "Observes a place before changing it and describes what already lives and is used there." },
      "evidencia": "M1: 3 tramos y el bosquecillo observados; q1, q2.", "criterio_logro": "Las 4 observaciones y q1 y q2 correctas en 2 intentos o menos.",
      "depr_2022": ["por verificar"], "ngss": ["3-LS4-3"] },
    { "id": "E2", "tema": "beneficios_y_costos", "grados": "3-6",
      "enunciado": { "es": "Compara varias soluciones por lo que dan y lo que cuestan a cada persona, y reconoce que ninguna lo da todo.", "en": "Compares several solutions by what they give and cost each person, and recognizes that none gives everything." },
      "evidencia": "M2: 4 voces y la Balanza; q3, q4.", "criterio_logro": "Las 4 tarjetas en la Balanza y q3 y q4 correctas en 2 intentos o menos.",
      "depr_2022": ["por verificar"], "ngss": ["3-5-ETS1-2"] },
    { "id": "E3", "tema": "decidir_y_cuidar", "grados": "3-6",
      "enunciado": { "es": "Prueba las opciones en un modelo, decide con otros y elige una medida que reduzca un costo.", "en": "Tests the options on a model, decides with others and chooses a measure that reduces a cost." },
      "evidencia": "M3: maqueta, asamblea y cuidado; q5.", "criterio_logro": "Las 3 opciones probadas, un cuidado que ayuda a la opción elegida y q5 correcta en 2 intentos o menos.",
      "depr_2022": ["por verificar"], "ngss": ["3-5-ETS1-3", "3-ESS3-1"] },
    { "id": "E4", "tema": "habitat", "grados": "3-6",
      "enunciado": { "es": "Explica por qué cortar árboles con huecos afecta a la cotorra y nombra una forma de cuidarla.", "en": "Explains why cutting trees with cavities affects the parrot and names a way to protect it." },
      "evidencia": "M1: el bosquecillo; q6.", "criterio_logro": "Bosquecillo observado y q6 correcta en 2 intentos o menos.",
      "depr_2022": ["por verificar"], "ngss": ["3-LS4-4"] }
  ],

  // 6 hallazgos del Diario del capítulo 4: 3 de la ribera y 3 de cómo se cruzan los ríos. Todos «por_verificar». El id coincide con
  // la entrada de pack.diario (lo que el jugador ve en el mundo describe solo lo que hay en el juego).
  "diario": [
    { "id": "raices", "titulo": { "es": "Raíces que sujetan", "en": "Roots that hold" }, "dato": { "es": "Las raíces de los árboles de la orilla sujetan la tierra y ayudan a que el río no se la lleve.", "en": "The roots of riverside trees hold the soil and help keep the river from carrying it away." }, "corto": { "es": "Raíces: la orilla se queda.", "en": "Roots: the bank stays." }, "fuente": "Pendiente (USDA NRCS, bosques ribereños)", "fuente_url": null, "grado": "3-6", "verificacion": "por_verificar", "nota_verificacion": "Confirmar el enunciado en una ficha del USDA sobre bosques ribereños antes de publicar.", "paso": "diario:raices" },
    { "id": "sombra", "titulo": { "es": "Sombra y agua fresca", "en": "Shade and cool water" }, "dato": { "es": "La sombra de los árboles mantiene más fresca el agua del río, y muchos peces la buscan.", "en": "Tree shade keeps river water cooler, and many fish look for it." }, "corto": { "es": "Sombra: agua fresca.", "en": "Shade: cool water." }, "fuente": "Pendiente (USGS / NOAA, temperatura del agua)", "fuente_url": null, "grado": "3-6", "verificacion": "por_verificar", "nota_verificacion": "Buscar una ficha educativa del USGS o NOAA; si no, dejar fuera.", "paso": "diario:sombra" },
    { "id": "hoja_seca", "titulo": { "es": "Hojas que alimentan", "en": "Leaves that feed" }, "dato": { "es": "Las hojas que caen al río son alimento para pequeños animales del agua.", "en": "Leaves that fall into the river are food for small water animals." }, "corto": { "es": "Hojas: comida en el río.", "en": "Leaves: food in the river." }, "fuente": "Pendiente (USGS / EPA, ecología de ríos)", "fuente_url": null, "grado": "3-6", "verificacion": "por_verificar", "nota_verificacion": "Confirmar con una fuente oficial de ecología de ríos.", "paso": "diario:hoja_seca" },
    { "id": "soga", "titulo": { "es": "Cruzar con soga", "en": "Crossing with a rope" }, "dato": { "es": "En lugares sin puente, se tendían sogas o cables de orilla a orilla para cruzar o guiar una balsa.", "en": "Where there was no bridge, ropes or cables were stretched from bank to bank to cross or guide a raft." }, "corto": { "es": "Soga de orilla a orilla.", "en": "Rope from bank to bank." }, "fuente": "Pendiente (ICP / Archivo General de Puerto Rico)", "fuente_url": null, "grado": "3-6", "verificacion": "por_verificar", "nota_verificacion": "[KELVIN: si el capítulo nombra un cruce real de Puerto Rico]. Confirmar con una fuente histórica.", "paso": "diario:soga" },
    { "id": "remo", "titulo": { "es": "Canoas y cayucos", "en": "Canoes and cayucos" }, "dato": { "es": "Los taínos navegaban ríos y costas en canoas hechas de un solo tronco.", "en": "The Taíno travelled rivers and coasts in canoes carved from a single trunk." }, "corto": { "es": "Canoa de un tronco.", "en": "Single-trunk canoe." }, "fuente": "Pendiente (ICP / Smithsonian NMAI)", "fuente_url": null, "grado": "3-6", "verificacion": "por_verificar", "nota_verificacion": "Confirmar con el ICP o el Smithsonian antes de publicar.", "paso": "diario:remo" },
    { "id": "piedras", "titulo": { "es": "Piedras de paso", "en": "Stepping stones" }, "dato": { "es": "En arroyos poco hondos, una fila de piedras planas permite cruzar sin construir un puente.", "en": "In shallow streams, a row of flat stones lets people cross without building a bridge." }, "corto": { "es": "Piedras en fila: se cruza.", "en": "Stones in a row: you cross." }, "fuente": "Pendiente (fuente por decidir)", "fuente_url": null, "grado": "3-6", "verificacion": "por_verificar", "nota_verificacion": "Concepto general; buscar una fuente o dejarlo solo como lo que se ve en el juego.", "paso": "diario:piedras" }
  ],

  // «Iguaca te pregunta»: 6 preguntas. Sin puntaje visible; pista en el 2.º intento y respuesta explicada en el 3.º (aula.js).
  "preguntas": [
    { "id": "q1", "tipo": "opcion_multiple", "objetivo": "E1", "grado": "3-6",
      "enunciado": { "es": "¿Qué había en la orilla del estrecho, donde el río es más corto de cruzar?", "en": "What was on the bank at the narrows, where the river is shortest to cross?" },
      "opciones": [{ "es": "Un bosquecillo con huecos de nido y sombra", "en": "A small grove with nest holes and shade" }, { "es": "Nada: solo tierra", "en": "Nothing: just dirt" }, { "es": "Un muelle viejo", "en": "An old dock" }],
      "correcta": 0,
      "retro": { "correcta": { "es": "Sí. El sitio más corto no estaba vacío: ahí vivía y se usaba algo.", "en": "Yes. The shortest spot wasn't empty: something lived and was used there." },
        "incorrecta": { "es": "Pista: recuerda lo que contaste desde la rama.", "en": "Hint: remember what you counted from the branch." } },
      "verificacion": "juego (lo que el jugador observó; sin dato del mundo real)" },
    { "id": "q2", "tipo": "opcion_multiple", "objetivo": "E1", "grado": "3-6",
      "enunciado": { "es": "¿Qué viste en el remanso?", "en": "What did you see at the still water?" },
      "opciones": [{ "es": "Canoas cruzando de una orilla a otra", "en": "Canoes crossing from one bank to the other" }, { "es": "Un puente alto", "en": "A tall bridge" }, { "es": "Un bosquecillo", "en": "A small grove" }],
      "correcta": 0,
      "retro": { "correcta": { "es": "Sí. Allí ya se cruzaba remando: eso también es una forma de unir.", "en": "Yes. People already crossed there by paddling: that is also a way to connect." },
        "incorrecta": { "es": "Pista: el agua iba tranquila y había gente remando.", "en": "Hint: the water was calm and people were paddling." } },
      "verificacion": "juego (lo que el jugador observó)" },
    { "id": "q3", "tipo": "opcion_multiple", "objetivo": "E2", "grado": "3-6",
      "enunciado": { "es": "¿Qué opción le daba más a la abuela, que quería cruzar a pie todo el año?", "en": "Which option gave the most to Grandma, who wanted to cross on foot all year?" },
      "opciones": [{ "es": "El puente en el estrecho", "en": "The bridge at the narrows" }, { "es": "Los muelles y las canoas", "en": "The docks and canoes" }, { "es": "Ninguna", "en": "None" }],
      "correcta": 0,
      "retro": { "correcta": { "es": "Sí. Tenía tres hojas de Conexión. Pero costaba el bosquecillo.", "en": "Yes. It had three Connection leaves. But it cost the grove." },
        "incorrecta": { "es": "Pista: mira las hojas de Conexión en la Balanza.", "en": "Hint: look at the Connection leaves on the Scale." } },
      "verificacion": "juego (valores de la Balanza)" },
    { "id": "q4", "tipo": "opcion_multiple", "objetivo": "E2", "grado": "3-6",
      "enunciado": { "es": "¿Había una opción que lo daba todo a todos?", "en": "Was there an option that gave everything to everyone?" },
      "opciones": [{ "es": "No: cada una daba algo y costaba algo", "en": "No: each one gave something and cost something" }, { "es": "Sí, el puente alto", "en": "Yes, the tall bridge" }, { "es": "Sí, la más rápida", "en": "Yes, the fastest one" }],
      "correcta": 0,
      "retro": { "correcta": { "es": "Así es. Por eso se decide con todos y se cuida lo que cuesta.", "en": "That's right. That's why you decide with everyone and look after what it costs." },
        "incorrecta": { "es": "Pista: cuando dijiste «la mejor para todos», alguien te contestó.", "en": "Hint: when you said “the best for everyone”, someone answered you." } },
      "verificacion": "juego" },
    { "id": "q5", "tipo": "opcion_multiple", "objetivo": "E3", "grado": "3-6",
      "enunciado": { "es": "¿Para qué sirve un cuidado como replantar o poner cajas nido?", "en": "What is a measure like replanting or putting up nest boxes for?" },
      "opciones": [{ "es": "Para hacer más pequeño un costo, aunque no lo borra del todo", "en": "To make a cost smaller, even if it doesn't erase it completely" }, { "es": "Para que la opción salga perfecta", "en": "To make the option perfect" }, { "es": "Para no tener que preguntar a nadie", "en": "So you don't have to ask anyone" }],
      "correcta": 0,
      "retro": { "correcta": { "es": "Sí. El cuidado mejora una hoja, pero la Balanza nunca queda llena.", "en": "Yes. The measure improves one leaf, but the Scale is never full." },
        "incorrecta": { "es": "Pista: mira cómo cambió la Balanza con el cuidado puesto.", "en": "Hint: look at how the Scale changed with the measure in place." } },
      "verificacion": "juego" },
    { "id": "q6", "tipo": "opcion_multiple", "objetivo": "E4", "grado": "3-6",
      "enunciado": { "es": "¿Por qué importa no cortar los árboles viejos con huecos?", "en": "Why does it matter not to cut old trees with holes?" },
      "opciones": [{ "es": "Porque la cotorra anida en huecos de los árboles", "en": "Because the parrot nests in tree cavities" }, { "es": "Porque los huecos guardan agua de lluvia", "en": "Because the holes store rainwater" }, { "es": "Porque son más bonitos", "en": "Because they are prettier" }],
      "correcta": 0,
      "retro": { "correcta": { "es": "Sí. La cotorra anida en cavidades, naturales y artificiales. Fuente: USFWS.", "en": "Yes. The parrot nests in natural and artificial cavities. Source: USFWS." },
        "incorrecta": { "es": "Pista: recuerda lo que dijo Iguaca en el bosquecillo.", "en": "Hint: remember what Iguaca said at the grove." } },
      "verificacion": "verificado (USFWS 2026, programa interagencial de la cotorra; ya citado en EDUCATIVO.md y en el ep. 2)" }
  ],
  "formativa": {
    "momento": "Después del primer cruce (Chapter4Completed), cuando el jugador vuelve a hablar con Iguaca. Es opcional y se puede dejar para luego: la diversión manda.",
    "duracion_min": 3,
    "seleccion": { "3-4": ["q1", "q2", "q3", "q4", "q5", "q6"], "5-6": ["q1", "q2", "q3", "q4", "q5", "q6"] },
    "reglas": "Retro inmediata. Segundo intento con pista. Al tercero se muestra la respuesta y se explica. Sin puntaje visible ni castigo. Se registra si acertó en el intento 1, 2 o 3."
  },

  "modo_maestro": {
    "acceso": { "como": "Igual que en el episodio 1: en el menú de pausa, mantener pulsado «Docentes» 1,2 segundos y resolver una multiplicación.", "nota": "No es contraseña ni cuenta. Solo evita que un niño entre por accidente." },
    "guia_45_min": {
      "pregunta_guia": { "es": "¿Cómo se decide un proyecto cuando cada opción da algo y cuesta algo?", "en": "How do you decide on a project when each option gives something and costs something?" },
      "materiales": ["1 dispositivo por pareja", "Audífonos (opcional)", "Una Balanza impresa (3 opciones × 4 ejes) por pareja", "4 tarjetas de vocabulario con imagen: beneficio, costo, opción, cuidado"],
      "antes": { "minutos": 10, "pasos": [
        "2 min: escribe la pregunta guía y muestra una foto de un río con un puente y otra de un río con canoas.",
        "3 min: cada pareja escribe qué ganaría y qué perdería su escuela si construyeran algo nuevo en el patio.",
        "3 min: vocabulario con imágenes: beneficio, costo, opción, cuidado.",
        "2 min: parejas con dos roles: piloto (juega) y secretario/a (anota la Balanza). Cambian de rol en la maqueta (misión 3)." ] },
      "durante": { "minutos": 25, "pasos": [
        "20 min: las parejas juegan las tres misiones: «Lo que hay en la orilla», «Todas las voces» y «La maqueta y el acuerdo».",
        "Circula con 3 preguntas: ¿Qué viste en la orilla antes de construir? ¿A quién le cuesta la opción que te gusta? ¿Qué cuidado elegiste y qué mejora?",
        "5 min: evaluación formativa dentro del juego («Iguaca te pregunta», al volver a hablar con Iguaca después del cruce)." ] },
      "despues": { "minutos": 10, "pasos": [
        "5 min: tres parejas que eligieron opciones distintas cuentan por qué; la clase ve que ninguna era «la buena».",
        "3 min: boleto de salida: «Elegimos ___ porque ___; le costó a ___ y lo cuidamos con ___».",
        "2 min: descarga el reporte de cada dispositivo (Modo Maestro → Reporte)." ] },
      "diferenciacion": {
        "3-4": "Nivel 1: modo de texto corto y lectura en voz alta; el boleto con una sola razón.",
        "5-6": "Nivel 2: además, comparar dos opciones eje por eje y proponer un segundo cuidado (y qué esfuerzo añade); boleto con dos razones.",
        "apoyo_idioma": "Modo bilingüe ES/EN para estudiantes que aprenden español o inglés."
      }
    },
    "actividades_sin_pantalla": [
      { "id": "b1", "titulo": "Mapa de la orilla", "grados": "3-6", "minutos": 20, "objetivos": ["E1"],
        "materiales": ["Papel grande", "Lápices de colores", "Un rincón del patio o una foto de un río"],
        "pasos": ["Dibuja todo lo que vive o se usa en el lugar: árboles, animales, caminos, personas.", "Marca con un color lo que se perdería si se construyera algo allí.", "Compara tu mapa con el de otra pareja."] },
      { "id": "b2", "titulo": "La Balanza en la pizarra", "grados": "3-6", "minutos": 15, "objetivos": ["E2"],
        "materiales": ["Pizarra", "Fichas o papelitos con forma de hoja", "Tarjetas de rol: abuela, papá, quien navega, Iguaca"],
        "pasos": ["Dibuja la tabla de 3 opciones × 4 ejes.", "Cada rol dice qué le importa y pone sus hojas.", "Busquen una opción que lo dé todo. ¿La encontraron?"] },
      { "id": "b3", "titulo": "Asamblea con un cuidado", "grados": "3-6", "minutos": 25, "objetivos": ["E3", "E4"],
        "materiales": ["Tarjetas de rol", "Tarjetas de cuidados: replantar, cajas nido, paso de canoas, bancos de descanso, turnos de remo"],
        "pasos": ["Por grupos, cada uno defiende lo que le importa con calma.", "El grupo elige una opción y un cuidado para quien pierde.", "Cuentan a la clase qué ganan, qué cuesta y cómo lo cuidan."],
        "estandares": ["3-5-ETS1-2", "3-LS4-4"] }
    ],
    "rubrica": {
      "escala": { "4": "Excelente", "3": "Competente", "2": "En desarrollo", "1": "Inicio" },
      "criterios": [
        { "id": "R1", "criterio": "Observar antes de cambiar", "objetivo": "E1", "evidencia": "M1, q1, q2, actividad b1", "niveles": { "4": "Describe lo que vive y se usa en los 3 tramos y en el bosquecillo, con detalles.", "3": "Describe los 3 tramos y el bosquecillo.", "2": "Observa 1 o 2 lugares.", "1": "Elige sin mirar." } },
        { "id": "R2", "criterio": "Beneficios y costos", "objetivo": "E2", "evidencia": "M2, q3, q4, actividad b2", "niveles": { "4": "Dice qué da y qué cuesta cada opción y a quién, y explica por qué ninguna lo da todo.", "3": "Dice qué da y qué cuesta cada opción.", "2": "Ve solo los beneficios o solo los costos.", "1": "Busca «la respuesta correcta»." } },
        { "id": "R3", "criterio": "Decidir y cuidar", "objetivo": "E3", "evidencia": "M3, q5, actividad b3", "niveles": { "4": "Prueba las opciones, elige con razones y propone un cuidado que ayuda a quien pierde.", "3": "Elige una opción y un cuidado que ayuda.", "2": "Elige un cuidado que no ayuda a esa opción.", "1": "No propone ningún cuidado." } },
        { "id": "R4", "criterio": "Escuchar a todos", "objetivo": "E2, E3", "evidencia": "M2, asamblea, boleto de salida", "niveles": { "4": "Nombra a las 4 voces, lo que les importa y a quién le costó la decisión.", "3": "Nombra a quien gana y a quien pierde.", "2": "Nombra solo a quien gana.", "1": "No menciona a nadie." } },
        { "id": "R5", "criterio": "Hábitat y conservación", "objetivo": "E4", "evidencia": "Bosquecillo, q6", "niveles": { "4": "Explica por qué la cotorra necesita huecos de árbol y nombra un cuidado, con la fuente.", "3": "Explica el problema y nombra un cuidado.", "2": "Nombra el problema o el cuidado.", "1": "No relaciona los árboles con la cotorra." } }
      ]
    },
    "reporte_progreso": {
      "principios": [
        "Sin cuentas, nombres reales, correos, fotos, audio ni ubicación. El reporte no lleva nombres ni identificadores.",
        "Sin texto libre: el niño elige de listas su nombre de aventurero y los textos de su cómic.",
        "El juego no envía datos del estudiante por la red: el progreso queda solo en el dispositivo.",
        "El maestro decide qué hacer con el archivo descargado; el juego no lo envía."
      ],
      "almacenamiento": { "donde": "localStorage del dispositivo", "clave": "amazonaverse.aula.cap4", "separado_de": "partida del juego (ep4.save)", "retencion": "Hasta que el maestro pulse «Borrar progreso de este dispositivo»." },
      "identificador": "Estación que el maestro elige de una lista (Estación 1 a 40). Nunca el nombre del estudiante.",
      "campos_por_partida": [
        "estacion", "fecha (día, sin hora)", "idioma", "modo_texto_corto", "lectura_voz",
        "misiones_completadas (orilla, voces, acuerdo)", "tramos_observados (0-4)", "voces_escuchadas (0-4)", "maqueta_probadas (0-3)",
        "opcion_elegida", "cuidado_elegido", "preguntas [{id, intento_correcto 1-3}]", "objetivos_logrados [E1..E4]", "minutos_mision (redondeado)"
      ],
      "prohibido": ["nombre", "fecha de nacimiento", "correo", "IP", "identificador de dispositivo", "texto libre", "audio", "imagen"],
      "formatos": ["csv", "json"],
      "nombre_archivo": "amazonaverse_cap4_{estacion}_{AAAA-MM-DD}.csv",
      "cumplimiento": "Mismo criterio que el episodio 1: el juego no recoge información personal de niños. Validar con el abogado de COPPA antes del piloto."
    }
  }
};
