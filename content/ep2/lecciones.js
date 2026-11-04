/* Amazona Verse · Lección del episodio 2 «Un lugar para todos» (EP2_MISIONES.md §1 y §5–7). PROPUESTA.
   Mismo esquema que content/cap1/lecciones.js (lo lee src/game/aula.js tal cual): meta, objetivos, diario (fichas), preguntas,
   formativa y modo_maestro. Nada de src/ tocado.
   Reglas: el juego es para todas las edades (en el Aula: «Nivel 1» y «Nivel 2»; los valores internos 3-4 / 5-6 son los que
   entiende aula.js y nunca se muestran). Ninguna ficha sale al Diario sin fuente verificada: tras la verificación de Kelvin del 2-nov (VERIFICACION_EDUCATIVA_EP2_EP6_02NOV.md, BM126)
   charco, cinta_lluvia, poste_viento y bohio van «verificado»; techo_zinc también (2-nov, con la fuente de EDUCATIVO_EP2_EP6.md);
   zocos va «narrativo» (Kelvin: sin fuente histórica, se cuenta dentro del juego y no como hecho). Cada ficha se gana con su hallazgo o
   con un momento de la misión (pack.js, G.aula.enlazar). Las preguntas hablan de lo que el jugador
   vio en el juego o de vocabulario de diseño; los datos reales siguen por verificar (§2 y §4). [KELVIN] marca lo que es canon. */
window.AV_LECCIONES_EP2 = {
  "meta": {
    "capitulo": 2,
    "titulo": { "es": "Un lugar para todos", "en": "A Place for Everyone" },
    "version": "0.1-propuesta",
    "fecha": "2026-10-26",
    "grados": "3-6",
    "documento": "docs/equipo/EP2_MISIONES.md",
    "duracion_mision_min": 15,
    "i18n": "Todo texto visible es {es,en}. 'corto' (8 palabras o menos) se usa en el modo sin texto largo.",
    "verificacion_leyenda": {
      "verificado": "Dato leído en la fuente oficial citada.",
      "parcial": "Fuente confiable encontrada, pero hay que reconfirmar el enlace o es fuente secundaria.",
      "por_verificar": "Sin fuente confirmada. NO se publica hasta que lo valide una fuente oficial (USFWS, DRNA, USDA, USGS, NOAA, ICP)."
    },
    "fuentes_estandares": {
      "depr_2022": "https://dedigital.dde.pr/mod/resource/view.php?id=2854",
      "depr_formato": "Códigos sacados del PDF oficial del DEPR (Estándares de Contenido y Expectativas de Grado, Programa de Ciencias, julio 2022, 119 págs.; abierto el 4-nov-2026 en https://dedigital.dde.pr/pluginfile.php/145100/mod_resource/content/4/Est%C3%A1ndares%20y%20Expectativas%20Programa%20de%20Ciencias.pdf). La correspondencia de cada objetivo con su indicador es una propuesta para que la revise un maestro; los objetivos que siguen «por verificar» no tienen un indicador de Ciencias claro.",
      "ngss": "https://www.nextgenscience.org/"
    }
  },

  "objetivos": [
    { "id": "E1", "tema": "terreno", "grados": "3-6",
      "enunciado": { "es": "Compara tres sitios por pendiente, drenaje del suelo y exposición al viento, y elige uno con evidencia.", "en": "Compares three sites by slope, soil drainage and wind exposure, and chooses one with evidence." },
      "evidencia": "M1: 3 sitios observados y sitio elegido; q1, q2.", "criterio_logro": "Los 3 sitios observados y q1 y q2 correctas en 2 intentos o menos.",
      "depr_2022": ["4.CT2.2", "4.CT2.6"], "ngss": ["4-ESS2-1", "4-ESS3-2"] },
    { "id": "E2", "tema": "necesidades", "grados": "3-6",
      "enunciado": { "es": "Convierte lo que dicen dos usuarios en criterios y restricciones de un diseño.", "en": "Turns what two users say into design criteria and constraints." },
      "evidencia": "M2: 7 tarjetas y mesa ordenada; q3.", "criterio_logro": "Tarjetas ordenadas y q3 correcta en 2 intentos o menos.",
      "depr_2022": ["3.IT1.7", "4.IT1.6"], "ngss": ["3-5-ETS1-1"] },
    { "id": "E3", "tema": "diseno_y_prueba", "grados": "3-6",
      "enunciado": { "es": "Compara dos diseños, prueba uno, identifica qué falló y lo mejora.", "en": "Compares two designs, tests one, identifies what failed and improves it." },
      "evidencia": "M3: prueba 1 → cambio → prueba 2; q4, q5.", "criterio_logro": "Mejora la parte que falló y q4 y q5 correctas en 2 intentos o menos.",
      "depr_2022": ["3.IT1.7", "4.IT1.6", "4.IT1.7", "3.CT2.4"], "ngss": ["3-5-ETS1-2", "3-5-ETS1-3", "3-ESS3-1"] },
    { "id": "E4", "tema": "habitat", "grados": "3-6",
      "enunciado": { "es": "Explica por qué perder cavidades de nido afecta a la cotorra y nombra una solución humana.", "en": "Explains why losing nest cavities affects the parrot and names a human solution." },
      "evidencia": "M3: nido del papá; q6.", "criterio_logro": "Nido alto, oscuro y seco armado y q6 correcta en 2 intentos o menos.",
      "depr_2022": ["3.CB2.6", "3.CB2.8"], "ngss": ["3-LS4-3", "3-LS4-4"] }
  ],

  // 6 hallazgos del Diario del ep. 2 (§7): 3 de ciencia del terreno y 3 de cultura de la construcción en Puerto Rico. Cuatro
  // «verificado» (Kelvin 2-nov); techo_zinc «verificado» y zocos «narrativo» (2-nov): las 6 salen al Diario.
  // El id coincide con la entrada de pack.diario (lo que el jugador ve en el mundo describe solo lo que hay en el juego).
  "diario": [
    { "id": "charco", "titulo": { "es": "Arena y arcilla", "en": "Sand and clay" }, "dato": { "es": "Por lo general, el agua se filtra más rápido en suelos arenosos que en suelos arcillosos. Si el agua no logra entrar al suelo, puede formar charcos.", "en": "Water usually soaks in faster through sandy soil than through clay soil. If the water cannot get into the ground, it can form puddles." }, "corto": { "es": "Arena: entra rápido. Arcilla: más lento.", "en": "Sand: soaks in fast. Clay: slower." }, "fuente": "USDA NRCS, Rangeland Processes Handbook (textura y drenaje del suelo)", "fuente_url": "https://directives.nrcs.usda.gov/sites/default/files2/1712930328/33930.pdf", "grado": "3-6", "verificacion": "verificado", "nota_verificacion": "Kelvin 2-nov-2026 (docs/equipo/VERIFICACION_EDUCATIVA_EP2_EP6_02NOV.md, ítem 1, correcta con matiz). Extracto comprobado en la fuente el 2-nov (BM126). La compactación, la humedad y las capas de abajo también influyen: por eso «por lo general» y «puede».", "paso": "diario:charco" },
    { "id": "cinta_lluvia", "titulo": { "es": "Pendiente y escorrentía", "en": "Slope and runoff" }, "dato": { "es": "En pendientes más empinadas, el agua de lluvia puede correr con más fuerza y arrastrar más suelo.", "en": "On steeper slopes, rainwater can run with more force and carry away more soil." }, "corto": { "es": "Más pendiente, más escorrentía.", "en": "Steeper slope, more runoff." }, "fuente": "USGS, Sediment characteristics of North Carolina streams, 1970–79", "fuente_url": "https://pubs.usgs.gov/of/1987/0701/report.pdf", "grado": "3-6", "verificacion": "verificado", "nota_verificacion": "Kelvin 2-nov-2026 (docs/equipo/VERIFICACION_EDUCATIVA_EP2_EP6_02NOV.md, ítem 2, correcta). Extracto comprobado en la fuente el 2-nov (BM126). «Puede»: no es una regla absoluta.", "paso": "diario:cinta_lluvia" },
    { "id": "poste_viento", "titulo": { "es": "Viento en la loma", "en": "Wind on the hill" }, "dato": { "es": "El viento suele sentirse más fuerte en lugares expuestos; detrás de árboles que sirven de barrera puede soplar más suave.", "en": "Wind usually feels stronger in exposed places; behind trees that act as a windbreak, it can blow more gently." }, "corto": { "es": "Al descubierto, más viento.", "en": "Out in the open: more wind." }, "fuente": "USDA Forest Service, National Agroforestry Center, Windbreaks; NWS Amarillo, herramienta de viento (zonas expuestas)", "fuente_url": "https://research.fs.usda.gov/centers/nac/windbreaks", "grado": "3-6", "verificacion": "verificado", "nota_verificacion": "Kelvin 2-nov-2026 (docs/equipo/VERIFICACION_EDUCATIVA_EP2_EP6_02NOV.md, ítem 3, correcta con matiz). Extracto comprobado en la fuente el 2-nov (BM126). También se leyó la página del NWS (https://www.weather.gov/ama/fire_weather_wind_tool). No afirmar que toda cima tiene más viento que todo claro.", "paso": "diario:poste_viento" },
    { "id": "zocos", "titulo": { "es": "Casa en alto", "en": "House up high" }, "dato": { "es": "En esta historia, cuatro postes levantaron una casa del suelo. Al levantar el piso, queda un espacio entre la vivienda y el terreno.", "en": "In this story, four posts once lifted a house off the ground. When the floor is raised, a space is left between the home and the ground." }, "corto": { "es": "Piso en alto: espacio debajo.", "en": "Raised floor: space underneath." }, "fuente": "Relato del juego (no es un dato histórico)", "fuente_url": null, "grado": "3-6", "verificacion": "narrativo", "nota_verificacion": "Kelvin 2-nov-2026: «no detenerse; si no hay fuente, no presentarlo como hecho científico; usar texto neutro o narrativo». Sale al Diario como ficha narrativa (verificacion «narrativo»): cuenta lo que hay en el mundo (los «Postes viejos») y la mecánica neutra de Kelvin, sin afirmar una tradición de Puerto Rico. SIN FUENTE histórica para «zocos» (VERIFICACION_EDUCATIVA_EP2_EP6_02NOV.md, ítem 4; Ortiz Colom, La casa criolla de Puerto Rico, no los menciona). [KELVIN: si aparece una fuente histórica, pasarla a «verificado»].", "paso": "diario:zocos" },
    { "id": "techo_zinc", "titulo": { "es": "Techo de dos aguas", "en": "Gable roof" }, "dato": { "es": "El techo de dos aguas deja correr la lluvia hacia los dos lados. En la casa criolla de Puerto Rico, el techo solía ser de teja o de planchas de zinc.", "en": "A gable roof sheds rain to both sides. In Puerto Rico's criollo house, the roof was usually made of tile or zinc sheets." }, "corto": { "es": "Dos aguas: la lluvia corre.", "en": "Two slopes: rain runs off." }, "fuente": "National Park Service, Registro Nacional de Lugares Históricos, n.º 90000767 (casa criolla de Puerto Rico: techo a dos o cuatro aguas, de teja o zinc corrugado)", "fuente_url": "https://npgallery.nps.gov/NRHP/GetAsset/NRHP/90000767_text", "grado": "3-6", "verificacion": "verificado", "nota_verificacion": "Publicada 2-nov-2026 con la fuente que ya daba por verificada docs/equipo/EDUCATIVO_EP2_EP6.md (tabla, fila «Techo de dos aguas»; no estaba en la lista de Kelvin del 2-nov). Extracto comprobado el 2-nov: «hipped or side-gabled, usually high-pitched roof of ceramic tile or corrugated zinc» (tipología criolla vernácula). La ficha decía «en muchas casas del campo»: el registro describe la casa criolla urbana, así que el texto dice «la casa criolla» [KELVIN: revisar]. Que la lluvia corra hacia los dos lados es geometría. Complemento sin abrir desde la nube: UPRM https://scholar.uprm.edu/entities/publication/cd0da037-f4b9-47b3-a8ca-afbcad32b461.", "paso": "diario:techo_zinc" },
    { "id": "bohio", "titulo": { "es": "El bohío", "en": "The bohío" }, "dato": { "es": "Los taínos construían bohíos con materiales del entorno, como palmas y bejucos.", "en": "The Taíno built bohíos with materials from their surroundings, such as palms and bejucos (climbing vines)." }, "corto": { "es": "Bohío taíno: palmas y bejucos.", "en": "Taíno bohío: palms and vines." }, "fuente": "Smithsonian, Museo Nacional del Indígena Americano (NMAI), guía «Taíno: herencia e identidad indígena en el Caribe»", "fuente_url": "https://americanindian.si.edu/nk360/pdf/Taino-Gallery-Guide-Spanish.pdf", "grado": "3-6", "verificacion": "verificado", "nota_verificacion": "Kelvin 2-nov-2026 (docs/equipo/VERIFICACION_EDUCATIVA_EP2_EP6_02NOV.md, ítem 5, correcta con matiz). Extracto comprobado en la fuente el 2-nov (BM126). La cita no habla de postes de madera: no añadirlos sin otra fuente.", "paso": "diario:bohio" }
  ],

  // «Iguaca te pregunta» (§5): 6 preguntas, una por fila de la tabla. Sin puntaje visible; pista en el 2.º intento y respuesta
  // explicada en el 3.º (lo hace aula.js). Las de terreno preguntan por lo que el jugador vio en el juego, no por datos reales.
  "preguntas": [
    { "id": "q1", "tipo": "opcion_multiple", "objetivo": "E1", "grado": "3-6",
      "enunciado": { "es": "Echaste agua en los tres hoyos. ¿En qué sitio se hizo charco?", "en": "You poured water into the three holes. Which site puddled?" },
      "opciones": [{ "es": "En el llano", "en": "On the flat ground" }, { "es": "En la loma", "en": "On the hill" }, { "es": "En el claro", "en": "In the clearing" }],
      "correcta": 0,
      "retro": { "correcta": { "es": "Sí. En el llano el agua tardó mucho en bajar: ahí la base se moja.", "en": "Yes. On the flat ground the water took a long time to drain: a base gets wet there." },
        "incorrecta": { "es": "Pista: la abuela dijo «aquí siempre se hizo charco».", "en": "Hint: Grandma said “it always puddled here”." } },
      "verificacion": "juego (lo que el jugador observó; sin dato del mundo real)" },
    { "id": "q2", "tipo": "opcion_multiple", "objetivo": "E1", "grado": "3-6",
      "enunciado": { "es": "La cinta de lluvia corrió más rápido en el sitio…", "en": "The rain ribbon ran fastest on the site that was…" },
      "opciones": [{ "es": "Empinado", "en": "Steep" }, { "es": "Plano", "en": "Flat" }, { "es": "Con más árboles", "en": "With more trees" }],
      "correcta": 0,
      "retro": { "correcta": { "es": "Sí. Cuesta abajo el agua corre más rápido y no se queda.", "en": "Yes. Downhill, water runs faster and does not stay." },
        "incorrecta": { "es": "Pista: ¿hacia dónde corre el agua en la loma?", "en": "Hint: which way does water run on the hill?" } },
      "verificacion": "parcial (lo que el jugador vio en el juego; el dato real de pendiente y escorrentía sigue por verificar: USGS)" },
    { "id": "q3", "tipo": "opcion_multiple", "objetivo": "E2", "grado": "3-6",
      "enunciado": { "es": "«Hay que terminar en 3 días, antes de la tormenta.» ¿Qué tarjeta es?", "en": "“It must be finished in 3 days, before the storm.” Which card is it?" },
      "opciones": [{ "es": "Una restricción: un límite que no se puede saltar", "en": "A constraint: a limit you cannot skip" }, { "es": "Un criterio: algo que la casa debe lograr", "en": "A criterion: something the house must achieve" }, { "es": "Un deseo de la abuela", "en": "One of Grandma's wishes" }],
      "correcta": 0,
      "retro": { "correcta": { "es": "Sí. Nadie la pidió: es un límite. «Entrada baja» sí es un criterio.", "en": "Yes. Nobody asked for it: it is a limit. “Low entrance” is a criterion." },
        "incorrecta": { "es": "Pista: los criterios los piden la abuela y el papá; los límites los pone el tiempo o el material.", "en": "Hint: criteria come from Grandma and Dad; limits come from time or materials." } },
      "verificacion": "parcial (vocabulario de criterios y restricciones, NGSS 3-5-ETS1-1; concepto general)" },
    { "id": "q4", "tipo": "opcion_multiple", "objetivo": "E3", "grado": "3-6",
      "enunciado": { "es": "En la tormenta el techo se levantó. ¿Qué cambias?", "en": "In the storm the roof lifted. What do you change?" },
      "opciones": [{ "es": "Amarro el techo a los postes", "en": "I tie the roof to the posts" }, { "es": "Cambio las paredes", "en": "I change the walls" }, { "es": "Hago la casa más grande", "en": "I make the house bigger" }],
      "correcta": 0,
      "retro": { "correcta": { "es": "Sí. Se cambia solo la parte que falló, y luego se vuelve a probar.", "en": "Yes. You change only the part that failed, then test again." },
        "incorrecta": { "es": "Pista: mira lo que marcó la tormenta en rojo.", "en": "Hint: look at what the storm marked in red." } },
      "verificacion": "juego (lógica de la misión 3; sin dato del mundo real)" },
    { "id": "q5", "tipo": "opcion_multiple", "objetivo": "E3", "grado": "3-6",
      "enunciado": { "es": "¿Por qué probamos la casa dos veces?", "en": "Why did we test the house twice?" },
      "opciones": [{ "es": "Para ver si el cambio arregló lo que falló", "en": "To see if the change fixed what failed" }, { "es": "Porque la primera tormenta no contó", "en": "Because the first storm did not count" }, { "es": "Para que la fiesta dure más", "en": "So the party lasts longer" }],
      "correcta": 0,
      "retro": { "correcta": { "es": "Sí. Probar, cambiar y volver a probar: así se mejora un diseño.", "en": "Yes. Test, change and test again: that is how a design improves." },
        "incorrecta": { "es": "Pista: después de cambiar una parte, ¿cómo sabes que funcionó?", "en": "Hint: after changing a part, how do you know it worked?" } },
      "verificacion": "parcial (ciclo de prueba y mejora, NGSS 3-5-ETS1-3; concepto general)" },
    { "id": "q6", "tipo": "opcion_multiple", "objetivo": "E4", "grado": "3-6",
      "enunciado": { "es": "¿Por qué ayudan las cajas nido a la cotorra puertorriqueña?", "en": "Why do nest boxes help the Puerto Rican parrot?" },
      "opciones": [{ "es": "Porque anida en huecos y las cajas le dan un hueco seguro cuando faltan", "en": "Because it nests in cavities and boxes give it a safe one when there are few" }, { "es": "Porque le gustan los colores", "en": "Because it likes the colors" }, { "es": "Porque ahí guarda comida", "en": "Because it stores food there" }],
      "correcta": 0,
      "retro": { "correcta": { "es": "Sí. La cotorra anida en cavidades, naturales y artificiales. Fuente: USFWS.", "en": "Yes. The parrot nests in natural and artificial cavities. Source: USFWS." },
        "incorrecta": { "es": "Pista: recuerda el hueco del tronco viejo y lo que pidió el papá.", "en": "Hint: remember the old tree hole and what Dad asked for." } },
      "verificacion": "verificado (USFWS 2026, programa interagencial de la cotorra; ya citado en EDUCATIVO.md y huevos.js)" }
  ],
  "formativa": {
    "momento": "Después de la fiesta de techado (Chapter2Completed), cuando el jugador vuelve a hablar con Iguaca. Es opcional y se puede dejar para luego: la diversión manda.",
    "duracion_min": 3,
    "seleccion": { "3-4": ["q1", "q2", "q3", "q4", "q5", "q6"], "5-6": ["q1", "q2", "q3", "q4", "q5", "q6"] },
    "reglas": "Retro inmediata. Segundo intento con pista. Al tercero se muestra la respuesta y se explica. Sin puntaje visible ni castigo. Se registra si acertó en el intento 1, 2 o 3."
  },

  "modo_maestro": {
    "acceso": { "como": "Igual que en el episodio 1: en el menú de pausa, mantener pulsado «Docentes» 1,2 segundos y resolver una multiplicación.", "nota": "No es contraseña ni cuenta. Solo evita que un niño entre por accidente." },
    "guia_45_min": {
      "pregunta_guia": { "es": "¿Cómo se diseña una casa que aguante y que sirva a todos los que viven en ella?", "en": "How do you design a house that holds up and works for everyone who lives in it?" },
      "materiales": ["1 dispositivo por pareja", "Audífonos (opcional)", "Cuaderno del terreno impreso (1 por estudiante)", "4 tarjetas de vocabulario con imagen: criterio, restricción, drenaje, pendiente"],
      "antes": { "minutos": 10, "pasos": [
        "2 min: escribe la pregunta guía en la pizarra y muestra una foto de una casa después de una tormenta.",
        "3 min: cada estudiante predice en el cuaderno impreso cuál de tres sitios (llano, loma, claro) aguanta mejor una casa, y por qué.",
        "3 min: vocabulario con imágenes: criterio, restricción, drenaje, pendiente.",
        "2 min: parejas con dos roles: piloto (juega) y científico/a (anota). Cambian de rol en la mesa de las tarjetas (misión 2)." ] },
      "durante": { "minutos": 25, "pasos": [
        "20 min: las parejas juegan las tres misiones: «Lee la tierra», «Escuchar primero» y «Casa que aguanta».",
        "Circula con 3 preguntas: ¿Qué sitio elegiste y qué evidencia viste? ¿Qué tarjeta es un criterio y cuál una restricción? ¿Qué falló en la primera tormenta y qué cambiaste?",
        "5 min: evaluación formativa dentro del juego («Iguaca te pregunta», al volver a hablar con Iguaca después de la fiesta)." ] },
      "despues": { "minutos": 10, "pasos": [
        "5 min: dos parejas cuentan qué falló en su primera tormenta y qué cambiaron; la clase compara con su predicción.",
        "3 min: boleto de salida: «Mi casa aguanta porque ___; si la hiciera otra vez cambiaría ___».",
        "2 min: descarga el reporte de cada dispositivo (Modo Maestro → Reporte)." ] },
      "diferenciacion": {
        "3-4": "Nivel 1: modo de texto corto y lectura en voz alta; el boleto de salida con una sola evidencia.",
        "5-6": "Nivel 2: además, ¿qué característica pesa más para una casa y cuál para un nido? (M1 t6) y explicar en una frase por qué se cambió esa parte (M3 c5); boleto con dos evidencias.",
        "apoyo_idioma": "Modo bilingüe ES/EN para estudiantes que aprenden español o inglés."
      }
    },
    "actividades_sin_pantalla": [
      { "id": "b1", "titulo": "Tres vasos: ¿cuál drena?", "grados": "3-6", "minutos": 20, "objetivos": ["E1"],
        "materiales": ["3 vasos con un agujero en el fondo", "Arena, tierra de jardín y barro", "Agua y una taza de medir", "Cronómetro", "Bandeja"],
        "pasos": ["Llena cada vaso con un material distinto.", "Echa la misma cantidad de agua en cada uno y cronometra cuánto tarda en salir.", "Anota en el cuaderno: rápido, medio o charco. ¿A qué sitio del juego se parece cada vaso?"] },
      { "id": "b2", "titulo": "Entrevista con tarjetas", "grados": "3-6", "minutos": 15, "objetivos": ["E2"],
        "materiales": ["Tarjetas en blanco", "Dos tarjetas de rol: «abuela» y «papá cotorra»"],
        "pasos": ["En parejas, uno es el residente y otro pregunta. Solo valen preguntas abiertas (cómo, qué, por qué).", "Cada respuesta útil se escribe en una tarjeta.", "Separen las tarjetas en criterios y restricciones y busquen dos que choquen."] },
      { "id": "b3", "titulo": "Casa de cartón frente al abanico", "grados": "3-6", "minutos": 30, "objetivos": ["E3", "E4"],
        "materiales": ["Cartón y cajas pequeñas", "Cinta adhesiva y soga", "Abanico", "Regadera y bandeja", "Una caja chiquita para el nido"],
        "pasos": ["Construye una casa con un hueco alto, oscuro y seco para el nido.", "Prueba con viento (abanico) y lluvia (regadera). Marca la parte que falló.", "Cambia solo esa parte y vuelve a probar.", "Explica qué cambiaste y por qué, y dónde quedó el nido."],
        "estandares": ["3-5-ETS1-3", "3-ESS3-1"] }
    ],
    "rubrica": {
      "escala": { "4": "Excelente", "3": "Competente", "2": "En desarrollo", "1": "Inicio" },
      "criterios": [
        { "id": "R1", "criterio": "Lectura del terreno", "objetivo": "E1", "evidencia": "M1, cuaderno, q1, q2, actividad b1", "niveles": { "4": "Compara los 3 sitios por pendiente, drenaje y viento y elige con dos evidencias.", "3": "Compara los 3 sitios y elige con una evidencia.", "2": "Observa 1 o 2 sitios o elige sin evidencia.", "1": "Elige a ojo." } },
        { "id": "R2", "criterio": "Criterios y restricciones", "objetivo": "E2", "evidencia": "M2, q3, actividad b2", "niveles": { "4": "Ordena todas las tarjetas, explica la diferencia y resuelve el choque con un diseño para los dos.", "3": "Ordena las tarjetas y resuelve el choque.", "2": "Confunde 1 o 2 tarjetas.", "1": "No distingue criterio de restricción." } },
        { "id": "R3", "criterio": "Ciclo probar-mejorar", "objetivo": "E3", "evidencia": "M3, q4, q5, actividad b3", "niveles": { "4": "Identifica la parte que falló, la cambia, vuelve a probar y explica por qué funcionó.", "3": "Cambia la parte que falló y vuelve a probar.", "2": "Cambia una parte que no falló.", "1": "No prueba o no cambia nada." } },
        { "id": "R4", "criterio": "Argumento con evidencia", "objetivo": "E1, E3", "evidencia": "Boleto de salida", "niveles": { "4": "Afirmación, dos evidencias del juego y razonamiento; dice qué cambiaría.", "3": "Afirmación y una evidencia.", "2": "Afirmación sin evidencia.", "1": "Sin afirmación clara." } },
        { "id": "R5", "criterio": "Hábitat y conservación", "objetivo": "E4", "evidencia": "Nido del papá, q6, parada del tronco", "niveles": { "4": "Explica por qué la cotorra necesita cavidades y nombra las cajas nido como solución humana, con la fuente.", "3": "Explica el problema y nombra una solución.", "2": "Nombra el problema o la solución.", "1": "No relaciona el nido con la cotorra." } }
      ]
    },
    "reporte_progreso": {
      "principios": [
        "Sin cuentas, nombres reales, correos, fotos, audio ni ubicación. El reporte no lleva nombres ni identificadores.",
        "Sin texto libre: el niño elige de listas su nombre de aventurero y los textos de su cómic.",
        "El juego no envía datos del estudiante por la red: el progreso queda solo en el dispositivo.",
        "El maestro decide qué hacer con el archivo descargado; el juego no lo envía."
      ],
      "almacenamiento": { "donde": "localStorage del dispositivo", "clave": "amazonaverse.aula.cap2", "separado_de": "partida del juego (ep2.save)", "retencion": "Hasta que el maestro pulse «Borrar progreso de este dispositivo»." },
      "identificador": "Estación que el maestro elige de una lista (Estación 1 a 40). Nunca el nombre del estudiante.",
      "campos_por_partida": [
        "estacion", "fecha (día, sin hora)", "idioma", "modo_texto_corto", "lectura_voz",
        "misiones_completadas (lee_tierra, escuchar, casa)", "sitios_observados (0-3)", "sitio_elegido", "tarjetas_necesidades (0-7)",
        "choque_resuelto (sí/no)", "falla_tormenta (base, paredes, techo)", "mejora_hecha (sí/no)", "nido_listo (sí/no)",
        "preguntas [{id, intento_correcto 1-3}]", "objetivos_logrados [E1..E4]", "minutos_mision (redondeado)"
      ],
      "prohibido": ["nombre", "fecha de nacimiento", "correo", "IP", "identificador de dispositivo", "texto libre", "audio", "imagen"],
      "formatos": ["csv", "json"],
      "nombre_archivo": "amazonaverse_cap2_{estacion}_{AAAA-MM-DD}.csv",
      "cumplimiento": "Mismo criterio que el episodio 1: el juego no recoge información personal de niños. Validar con el abogado de COPPA antes del piloto."
    }
  }
};
