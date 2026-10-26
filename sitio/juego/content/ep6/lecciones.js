/* Amazona Verse · Lección del capítulo 6 «El pacto de los 36» (EP6_MISIONES.md §1 y §5–7). PROPUESTA (tarea AL1).
   Mismo esquema que content/ep2/lecciones.js (lo lee src/game/aula.js tal cual): meta, objetivos, diario (fichas), preguntas,
   formativa y modo_maestro. Nada de src/ tocado.
   Reglas: el juego es para todas las edades (en el Aula: «Nivel 1» y «Nivel 2»; los valores internos 3-4 / 5-6 son los que
   entiende aula.js y nunca se muestran). Ninguna ficha sale al Diario sin fuente verificada: la conducta en bandada va
   «por_verificar» (fuente propuesta: USFWS, DRNA, Cornell Lab); solo la ficha de los pares de factores de 36 es aritmética y
   no necesita fuente externa. Las preguntas hablan de lo que el jugador vio en el juego. Los indicadores DEPR 2022 van por
   verificar: hay que sacarlos del documento oficial. [KELVIN] marca lo que es canon. */
window.AV_LECCIONES_EP6 = {
  "meta": {
    "capitulo": 6,
    "titulo": { "es": "El pacto de los 36", "en": "The Pact of the 36" },
    "version": "0.1-propuesta",
    "fecha": "2026-10-26",
    "grados": "3-6",
    "documento": "docs/equipo/EP6_MISIONES.md",
    "duracion_mision_min": 18,
    "i18n": "Todo texto visible es {es,en}. 'corto' (8 palabras o menos) se usa en el modo sin texto largo.",
    "verificacion_leyenda": {
      "verificado": "Dato leído en la fuente oficial citada (o aritmética que no necesita fuente).",
      "parcial": "Fuente confiable encontrada, pero hay que reconfirmar el enlace o es fuente secundaria.",
      "por_verificar": "Sin fuente confirmada. NO se publica hasta que lo valide una fuente oficial (USFWS, DRNA, Cornell Lab)."
    },
    "fuentes_estandares": {
      "depr_2022": "https://dedigital.dde.pr/mod/resource/view.php?id=2854",
      "depr_formato": "Los indicadores DEPR 2022 de este capítulo van por verificar: sacarlos del documento oficial, no inventarlos (EP6_MISIONES.md §1).",
      "ngss": "https://www.nextgenscience.org/",
      "ccss": "https://www.thecorestandards.org/Math/"
    }
  },

  "objetivos": [
    { "id": "F1", "tema": "vivir_en_grupo", "grados": "3-6",
      "enunciado": { "es": "Explica cómo un grupo ayuda a sus miembros: cada uno aporta algo que otro necesita.", "en": "Explains how a group helps its members: each one brings something another one needs." },
      "evidencia": "M1: 6 tarjetas y 3 parejas; q1, q2.", "criterio_logro": "Tarjetas llenas y q1 y q2 correctas en 2 intentos o menos.",
      "depr_2022": ["por verificar"], "ngss": ["3-LS2-1"] },
    { "id": "F2", "tema": "disenar_con_criterios", "grados": "3-6",
      "enunciado": { "es": "Define el objetivo y los límites de un plan, lo prueba, ve dónde falla y lo mejora.", "en": "Defines a plan's goal and limits, tests it, sees where it fails and improves it." },
      "evidencia": "M2: criterios → plan → prueba → atasco → arreglo; q3, q4.", "criterio_logro": "Plan que funciona tras al menos una prueba fallida y q3 y q4 correctas en 2 intentos o menos.",
      "depr_2022": ["por verificar"], "ngss": ["3-5-ETS1-1", "3-5-ETS1-3", "MS-ETS1-4"] },
    { "id": "F3", "tema": "grupos_iguales", "grados": "3-6",
      "enunciado": { "es": "Reparte 36 en filas iguales y compara las formas posibles.", "en": "Splits 36 into equal rows and compares the possible shapes." },
      "evidencia": "M3: forma del círculo; q5.", "criterio_logro": "Forma elegida y q5 correcta en 2 intentos o menos.",
      "depr_2022": ["por verificar"], "ccss": ["3.OA.A.1", "4.OA.B.4"] },
    { "id": "F4", "tema": "escuchar_y_acordar", "grados": "3-6",
      "enunciado": { "es": "Resume lo que quiere cada parte y busca lo que comparten antes de proponer.", "en": "Sums up what each side wants and looks for what they share before proposing." },
      "evidencia": "M3: mediación en 3 pasos; q6.", "criterio_logro": "Los dos grupos escuchados y q6 correcta en 2 intentos o menos.",
      "depr_2022": ["por verificar"], "marco": ["CASEL (habilidades de relación, referencia)"] }
  ],

  // 6 hallazgos del Diario del cap. 6 (§7). El id coincide con la entrada de pack.diario. Lo que afirma conductas reales de las
  // especies va «por_verificar» y no sale al Diario del niño; el dato de 36 es aritmética.
  "diario": [
    { "id": "tarjetas", "titulo": { "es": "Cada uno trae algo", "en": "Everyone brings something" }, "dato": { "es": "Las cotorras del género Amazona viven y se alimentan en bandadas; en grupo es más fácil ver un peligro a tiempo.", "en": "Amazona parrots live and feed in flocks; in a group it is easier to spot danger in time." }, "corto": { "es": "En bandada se cuidan entre todos.", "en": "In a flock, they look out for each other." }, "fuente": "Pendiente (USFWS, programa de recuperación de la cotorra puertorriqueña; DRNA; Cornell Lab, Birds of the World)", "fuente_url": null, "grado": "3-6", "verificacion": "por_verificar", "nota_verificacion": "Confirmar la conducta en bandada en USFWS o Birds of the World antes de publicar. Mientras tanto, las habilidades de los visitantes son del personaje, no de la especie.", "paso": "diario" },
    { "id": "plan", "titulo": { "es": "Objetivo y límites", "en": "Goal and limits" }, "dato": { "es": "Un plan de diseño dice qué tiene que lograr (objetivo) y con qué no puede contar (límites); después se prueba y se mejora.", "en": "A design plan says what it must achieve (goal) and what it cannot count on (limits); then it is tested and improved." }, "corto": { "es": "Objetivo, límites, prueba, mejora.", "en": "Goal, limits, test, improve." }, "fuente": "Pendiente (NGSS 3-5-ETS1-1, nextgenscience.org)", "fuente_url": null, "grado": "3-6", "verificacion": "por_verificar", "nota_verificacion": "Confirmar la redacción con el texto del estándar 3-5-ETS1-1.", "paso": "diario" },
    { "id": "tabla", "titulo": { "es": "Entre varios", "en": "Between several" }, "dato": { "es": "Una pieza larga se levanta mejor con alguien en cada punta: el peso se reparte.", "en": "A long piece is lifted better with someone at each end: the weight is shared." }, "corto": { "es": "Alguien en cada punta.", "en": "Someone at each end." }, "fuente": "Pendiente (ficha de seguridad para levantar cargas entre dos personas, p. ej. NIOSH)", "fuente_url": null, "grado": "3-6", "verificacion": "por_verificar", "nota_verificacion": "Buscar una ficha educativa de NIOSH u OSHA sobre levantar en equipo.", "paso": "diario" },
    { "id": "acuerdo", "titulo": { "es": "Escuchar antes de proponer", "en": "Listen before proposing" }, "dato": { "es": "Repetir con tus palabras lo que quiere la otra persona ayuda a encontrar lo que comparten.", "en": "Repeating in your own words what the other person wants helps find what you share." }, "corto": { "es": "Repite lo que oíste; luego propón.", "en": "Repeat what you heard; then propose." }, "fuente": "Pendiente (CASEL, habilidades de relación)", "fuente_url": null, "grado": "3-6", "verificacion": "por_verificar", "nota_verificacion": "Confirmar con el marco CASEL (casel.org).", "paso": "diario" },
    { "id": "forma", "titulo": { "es": "Las formas de 36", "en": "The shapes of 36" }, "dato": { "es": "36 se reparte en filas iguales de cinco formas: 1×36, 2×18, 3×12, 4×9 y 6×6. 35 solo de dos: 1×35 y 5×7.", "en": "36 splits into equal rows in five ways: 1×36, 2×18, 3×12, 4×9 and 6×6. 35 only in two: 1×35 and 5×7." }, "corto": { "es": "36: cinco formas; 35: dos.", "en": "36: five shapes; 35: two." }, "fuente": "Aritmética (pares de factores); no necesita fuente externa", "fuente_url": null, "grado": "3-6", "verificacion": "verificado", "nota_verificacion": "Dato matemático comprobable a mano.", "paso": "diario" },
    { "id": "esperan", "titulo": { "es": "Los que faltan", "en": "The ones missing" }, "dato": { "es": "El género Amazona tiene 36 especies en el catálogo del juego: 34 vivas y 2 extintas (martinicana y violacea).", "en": "The genus Amazona has 36 species in the game's catalog: 34 living and 2 extinct (martinicana and violacea)." }, "corto": { "es": "34 vivas y 2 extintas.", "en": "34 living and 2 extinct." }, "fuente": "Pendiente (UICN, Lista Roja; content/comun/especies.js)", "fuente_url": null, "grado": "3-6", "verificacion": "por_verificar", "nota_verificacion": "[KELVIN: canon de los 36]. Confirmar el conteo de especies con la Lista Roja antes de publicar.", "paso": "diario" }
  ],

  // «Iguaca te pregunta» (§5): 6 preguntas. Sin puntaje visible; pista en el 2.º intento y respuesta en el 3.º (aula.js).
  // Todas preguntan por lo que el jugador vio en el juego.
  "preguntas": [
    { "id": "q1", "tipo": "opcion_multiple", "objetivo": "F1", "grado": "3-6",
      "enunciado": { "es": "Mira necesitaba sombra. ¿Quién se la dio?", "en": "Mira needed shade. Who gave it to her?" },
      "opciones": [{ "es": "Brote, con su hoja grande", "en": "Brote, with his big leaf" }, { "es": "Roca, cargando fuerte", "en": "Roca, by carrying" }, { "es": "Nadie: se quedó sin sombra", "en": "No one: she stayed without shade" }],
      "correcta": 0,
      "retro": { "correcta": { "es": "Sí. Y Mira le enseñó a Brote a ver lejos: se cubrieron uno al otro.", "en": "Yes. And Mira taught Brote to see far: they covered for each other." },
        "incorrecta": { "es": "Pista: ¿quién traía una hoja grande?", "en": "Hint: who was carrying a big leaf?" } },
      "verificacion": "juego (las parejas de la misión 1)" },
    { "id": "q2", "tipo": "opcion_multiple", "objetivo": "F1", "grado": "3-6",
      "enunciado": { "es": "¿Por qué un grupo donde cada uno hace algo distinto puede lograr más?", "en": "Why can a group where everyone does something different achieve more?" },
      "opciones": [{ "es": "Porque lo que uno necesita, otro lo sabe hacer", "en": "Because what one needs, another knows how to do" }, { "es": "Porque así nadie tiene que hablar", "en": "Because that way no one has to talk" }, { "es": "Porque el más fuerte decide", "en": "Because the strongest one decides" }],
      "correcta": 0,
      "retro": { "correcta": { "es": "Sí. Por eso las tarjetas tenían «sabe hacer» y «necesita».", "en": "Yes. That is why the cards had “can do” and “needs”." },
        "incorrecta": { "es": "Pista: piensa en las tarjetas de los visitantes.", "en": "Hint: think about the visitors' cards." } },
      "verificacion": "juego (lo que el jugador vio en la misión 1)" },
    { "id": "q3", "tipo": "opcion_multiple", "objetivo": "F2", "grado": "3-6",
      "enunciado": { "es": "El plan se atascó en una tarea. ¿Qué hiciste?", "en": "The plan got stuck on a task. What did you do?" },
      "opciones": [{ "es": "Cambié quién hacía esa tarea y volví a probar", "en": "I changed who did that task and tested again" }, { "es": "Empecé un plan nuevo desde cero", "en": "I started a brand-new plan from scratch" }, { "es": "Dejé la tarea sin nadie", "en": "I left the task with no one" }],
      "correcta": 0,
      "retro": { "correcta": { "es": "Sí. Se cambia solo lo que falló y se prueba otra vez.", "en": "Yes. You change only what failed and test again." },
        "incorrecta": { "es": "Pista: ¿qué pasó en el tablero después del atasco?", "en": "Hint: what happened on the board after it got stuck?" } },
      "verificacion": "juego (lo que pasó en la misión 2)" },
    { "id": "q4", "tipo": "opcion_multiple", "objetivo": "F2", "grado": "3-6",
      "enunciado": { "es": "¿Cuál de estos era un límite del plan y no el objetivo?", "en": "Which of these was a limit of the plan, not the goal?" },
      "opciones": [{ "es": "Se termina antes de la noche", "en": "It is finished before night" }, { "es": "El puente aguanta a todos", "en": "The bridge holds everyone" }, { "es": "Levantar la tabla grande", "en": "Lifting the big plank" }],
      "correcta": 0,
      "retro": { "correcta": { "es": "Sí. Un límite dice hasta cuándo o con qué; el objetivo dice qué hay que lograr.", "en": "Yes. A limit says until when or with what; the goal says what must be achieved." },
        "incorrecta": { "es": "Pista: el objetivo era lo que tenía que lograr el puente.", "en": "Hint: the goal was what the bridge had to achieve." } },
      "verificacion": "parcial (criterios y límites, NGSS 3-5-ETS1-1; concepto general)" },
    { "id": "q5", "tipo": "opcion_multiple", "objetivo": "F3", "grado": "3-6",
      "enunciado": { "es": "Sientas a los 36 en 4 filas iguales. ¿Cuántos van en cada fila?", "en": "You seat the 36 in 4 equal rows. How many go in each row?" },
      "opciones": [{ "es": "9", "en": "9" }, { "es": "6", "en": "6" }, { "es": "12", "en": "12" }],
      "correcta": 0,
      "retro": { "correcta": { "es": "Sí: 4 × 9 = 36. También caben 6 × 6 y 3 × 12.", "en": "Yes: 4 × 9 = 36. 6 × 6 and 3 × 12 also fit." },
        "incorrecta": { "es": "Pista: 4 filas, y entre todas suman 36.", "en": "Hint: 4 rows, and all together they add up to 36." } },
      "verificacion": "verificado (aritmética)" },
    { "id": "q6", "tipo": "opcion_multiple", "objetivo": "F4", "grado": "3-6",
      "enunciado": { "es": "Antes de proponer, ¿qué hizo Vittata con cada grupo?", "en": "Before proposing, what did Vittata do with each group?" },
      "opciones": [{ "es": "Los escuchó y repitió con sus palabras lo que querían", "en": "She listened and repeated in her own words what they wanted" }, { "es": "Les dijo quién tenía razón", "en": "She told them who was right" }, { "es": "Los mandó a casa", "en": "She sent them home" }],
      "correcta": 0,
      "retro": { "correcta": { "es": "Sí. Y así encontró lo que los dos compartían: que nadie se quedara fuera.", "en": "Yes. And that is how she found what both shared: that no one be left out." },
        "incorrecta": { "es": "Pista: Iguaca le tocó el ala y le dijo «todavía no».", "en": "Hint: Iguaca touched her wing and said “not yet”." } },
      "verificacion": "juego (la mediación de la misión 3)" }
  ],
  "formativa": {
    "momento": "Después del pacto renovado (Chapter6Completed), cuando el jugador vuelve a hablar con Iguaca. Es opcional y se puede dejar para luego.",
    "duracion_min": 3,
    "seleccion": { "3-4": ["q1", "q2", "q3", "q4", "q5", "q6"], "5-6": ["q1", "q2", "q3", "q4", "q5", "q6"] },
    "reglas": "Retro inmediata. Segundo intento con pista. Al tercero se muestra la respuesta y se explica. Sin puntaje visible ni castigo. Se registra si acertó en el intento 1, 2 o 3."
  },

  "modo_maestro": {
    "acceso": { "como": "Igual que en el episodio 1: en el menú de pausa, mantener pulsado «Docentes» 1,2 segundos y resolver una multiplicación.", "nota": "No es contraseña ni cuenta. Solo evita que un niño entre por error." },
    "guia_45_min": {
      "pregunta_guia": { "es": "¿Qué hace una líder cuando el trabajo es más grande que ella?", "en": "What does a leader do when the job is bigger than her?" },
      "materiales": ["1 dispositivo por pareja", "Audífonos (opcional)", "Tarjeta «sé hacer / necesito» impresa (1 por estudiante)", "5 tarjetas de vocabulario con imagen: grupo, criterio, límite, plan, acuerdo"],
      "antes": { "minutos": 10, "pasos": [
        "2 min: escribe la pregunta guía en la pizarra.",
        "3 min: cada estudiante predice: ¿es mejor que cada uno haga de todo o que cada uno haga lo suyo? (sin juicio; se compara al final).",
        "3 min: vocabulario con imágenes: grupo, criterio, límite, plan, acuerdo.",
        "2 min: parejas con dos roles: quien arma el plan y quien lo prueba. Cambian de rol en cada prueba del tablero (misión 2)." ] },
      "durante": { "minutos": 25, "pasos": [
        "20 min: las parejas juegan las tres misiones: «Cada quien con lo suyo», «Nadie lo levanta solo» y «El círculo».",
        "Circula con 3 preguntas: ¿Qué necesita cada visitante? ¿Dónde se atascó tu plan y qué cambiaste? ¿Qué compartían los dos grupos?",
        "5 min: evaluación formativa dentro del juego («Iguaca te pregunta», al volver a hablar con Iguaca después del pacto)." ] },
      "despues": { "minutos": 10, "pasos": [
        "5 min: dos parejas comparan su plan final (rápido, que enseña o que descansa) y su forma del círculo.",
        "3 min: boleto de salida: «En mi grupo yo soy bueno en ___ y necesito ___».",
        "2 min: descarga el reporte de cada dispositivo (Modo Maestro → Reporte)." ] },
      "diferenciacion": {
        "3-4": "Nivel 1: modo de texto corto y lectura en voz alta; el tablero empieza con una asignación sugerida; boleto de salida con una sola evidencia.",
        "5-6": "Nivel 2: además, comparar dos planes que funcionan (el rápido y el que enseña) y explicar por qué 36 tiene más formas de filas iguales que 35; boleto con dos evidencias.",
        "apoyo_idioma": "Modo bilingüe ES/EN para estudiantes que aprenden español o inglés."
      }
    },
    "actividades_sin_pantalla": [
      { "id": "b1", "titulo": "Tarjetas del grupo", "grados": "3-6", "minutos": 15, "objetivos": ["F1"],
        "materiales": ["Una tarjeta por estudiante", "Lápices"],
        "pasos": ["Cada estudiante escribe una cosa que sabe hacer y una que necesita.", "La clase busca parejas que se cubran una a la otra.", "Cada pareja se presenta: «ella sabe ___ y yo necesito ___»."] },
      { "id": "b2", "titulo": "La torre de papel", "grados": "3-6", "minutos": 25, "objetivos": ["F2"],
        "materiales": ["20 hojas de papel por equipo", "Un cronómetro", "Sin cinta ni pegamento (ese es el límite)"],
        "pasos": ["Equipos de 4 con roles fijos: cargar, sostener, revisar y avisar.", "Objetivo: la torre más alta que se sostenga sola; límite: sin cinta y en 5 minutos.", "Prueba, mira dónde falla, reparte de nuevo los roles y vuelve a probar."],
        "estandares": ["3-5-ETS1-3"] },
      { "id": "b3", "titulo": "Sentar a 36", "grados": "3-6", "minutos": 15, "objetivos": ["F3"],
        "materiales": ["36 fichas o tapitas por equipo", "35 fichas para comparar"],
        "pasos": ["Busca todas las formas de poner las 36 fichas en filas iguales.", "Haz lo mismo con 35. ¿Cuántas formas salen?", "Compara: ¿qué número se reparte de más formas y por qué?"],
        "estandares": ["4.OA.B.4"] }
    ],
    "rubrica": {
      "escala": { "4": "Excelente", "3": "Competente", "2": "En desarrollo", "1": "Inicio" },
      "criterios": [
        { "id": "R1", "criterio": "Explicar la ayuda en grupo", "objetivo": "F1", "evidencia": "M1, tarjetas y parejas, q1, q2, actividad b1", "niveles": { "4": "Explica con ejemplos cómo lo que uno necesita lo cubre otro.", "3": "Nombra al menos una pareja que se cubre y por qué.", "2": "Nombra habilidades, pero no las relaciona.", "1": "No identifica qué sabe hacer ni qué necesita cada uno." } },
        { "id": "R2", "criterio": "Criterios y límites", "objetivo": "F2", "evidencia": "M2, q4", "niveles": { "4": "Distingue objetivo de límites y los usa para juzgar un plan.", "3": "Distingue objetivo de límites.", "2": "Confunde a veces objetivo y límite.", "1": "No distingue objetivo de límite." } },
        { "id": "R3", "criterio": "Prueba y mejora del plan", "objetivo": "F2", "evidencia": "M2, q3, actividad b2", "niveles": { "4": "Encuentra el atasco, cambia solo eso, vuelve a probar y explica por qué funcionó.", "3": "Encuentra el atasco y lo arregla.", "2": "Cambia cosas al azar hasta que funciona.", "1": "No prueba el plan o no lo cambia tras el atasco." } },
        { "id": "R4", "criterio": "Filas iguales", "objetivo": "F3", "evidencia": "M3, q5, actividad b3", "niveles": { "4": "Encuentra las cinco formas de 36 y explica por qué 35 tiene menos.", "3": "Encuentra tres formas o más de 36.", "2": "Encuentra una forma.", "1": "No reparte 36 en filas iguales." } },
        { "id": "R5", "criterio": "Escuchar antes de proponer", "objetivo": "F4", "evidencia": "M3, q6, boleto de salida", "niveles": { "4": "Repite lo que quiere cada parte, encuentra lo que comparten y propone algo que nadie rechaza.", "3": "Repite lo que quiere cada parte antes de proponer.", "2": "Escucha a una parte y propone.", "1": "Propone sin escuchar." } }
      ]
    },
    "reporte_progreso": {
      "principios": [
        "Sin cuentas, nombres reales, correos, fotos, audio ni ubicación. El reporte no lleva nombres ni identificadores.",
        "Sin texto libre: el niño elige de listas.",
        "El juego no envía datos del estudiante por la red: el progreso queda solo en el dispositivo.",
        "El maestro decide qué hacer con el archivo descargado; el juego no lo envía."
      ],
      "almacenamiento": { "donde": "localStorage del dispositivo", "clave": "amazonaverse.aula.ep6", "separado_de": "partida del juego (ep6.save)", "retencion": "Hasta que el maestro pulse «Borrar progreso de este dispositivo»." },
      "identificador": "Estación que el maestro elige de una lista (Estación 1 a 40). Nunca el nombre del estudiante.",
      "campos_por_partida": [
        "estacion", "fecha (día, sin hora)", "idioma", "modo_texto_corto", "lectura_voz",
        "misiones_completadas (conocer, obra, circulo)", "tarjetas (0-6)", "parejas (0-3)", "planes_probados", "atasco (tarea donde se paró)", "plan_final (rapido, ensena, descansa)",
        "propuesta (alta, baja, mezcla)", "forma (6x6, 4x9, 3x12, anillo)",
        "preguntas [{id, intento_correcto 1-3}]", "objetivos_logrados [F1..F4]", "minutos_mision (redondeado)"
      ],
      "prohibido": ["nombre", "fecha de nacimiento", "correo", "IP", "identificador de dispositivo", "texto libre", "audio", "imagen"],
      "formatos": ["csv", "json"],
      "nombre_archivo": "amazonaverse_ep6_{estacion}_{AAAA-MM-DD}.csv",
      "cumplimiento": "Mismo criterio que el episodio 1: el juego no recoge información personal de niños. Validar con el abogado de COPPA antes del piloto."
    }
  }
};
