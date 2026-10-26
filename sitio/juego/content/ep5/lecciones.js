/* Amazona Verse · Lección del episodio 5 «Las voces olvidadas» (EP5_MISIONES §1 y §5–7). PROPUESTA.
   Mismo esquema que content/ep2/lecciones.js. Nada de src/ tocado.
   En el Aula: «Nivel 1» y «Nivel 2». Los valores internos 3-4 / 5-6 los entiende aula.js y no se muestran.
   La ficha de las dos especies usa solo lo que dice content/comun/especies.js. El resto va por verificar. */
window.AV_LECCIONES_EP5 = {
  "meta": {
    "capitulo": 5,
    "titulo": { "es": "Las voces olvidadas", "en": "The forgotten voices" },
    "version": "0.1-propuesta",
    "fecha": "2026-10-26",
    "grados": "3-6",
    "documento": "docs/equipo/EP5_MISIONES.md",
    "duracion_mision_min": 18,
    "i18n": "Todo texto visible de la lección es {es,en}.",
    "verificacion_leyenda": {
      "verificado": "Dato leído en la fuente citada.",
      "parcial": "Fuente confiable encontrada, pero hay que reconfirmar el enlace.",
      "por_verificar": "Sin fuente confirmada. NO se publica hasta que lo valide una fuente oficial."
    },
    "fuentes_estandares": {
      "depr_2022": "https://dedigital.dde.pr/mod/resource/view.php?id=2854",
      "depr_formato": "Los indicadores DEPR 2022 de este episodio van por verificar: sacarlos del documento oficial, no inventarlos (EP5_MISIONES §1).",
      "ngss": "https://www.nextgenscience.org/"
    }
  },
  "objetivos": [
    { "id": "E1", "tema": "patrones", "grados": "3-6",
      "enunciado": { "es": "Reconstruye un mensaje a partir de fragmentos y de un patrón de destellos.", "en": "Rebuilds a message from fragments and a pattern of flashes." },
      "evidencia": "M1: mensaje ordenado; q1, q2.", "criterio_logro": "Mensaje ordenado y q1 y q2 correctas en 2 intentos o menos.",
      "depr_2022": ["por verificar"], "ngss": ["4-PS4-3"] },
    { "id": "E2", "tema": "evidencia", "grados": "3-6",
      "enunciado": { "es": "Distingue lo que se sabe porque se ve o está escrito de lo que se supone, y lo aplica a dos especies extintas.", "en": "Tells what is known because it is seen or written from what is supposed, and applies it to two extinct species." },
      "evidencia": "M2: marcas clasificadas; q3, q4.", "criterio_logro": "Cinco marcas clasificadas y q3 y q4 correctas en 2 intentos o menos.",
      "depr_2022": ["por verificar"], "ngss": ["3-LS4-1"] },
    { "id": "E3", "tema": "senal", "grados": "3-6",
      "enunciado": { "es": "Diseña un relevo con luz, sonido o tela, lo prueba, ve dónde se corta y lo cambia.", "en": "Designs a relay with light, sound or cloth, tests it, sees where it stops and changes it." },
      "evidencia": "M3: relevo armado, corte y arreglo; q5.", "criterio_logro": "Segunda prueba llega a la niebla y q5 correcta en 2 intentos o menos.",
      "depr_2022": ["por verificar"], "ngss": ["1-PS4-4", "4-PS4-3", "3-5-ETS1-2"] },
    { "id": "E4", "tema": "cooperar", "grados": "3-6",
      "enunciado": { "es": "Explica por qué un relevo necesita a varios y cómo se reparte el trabajo.", "en": "Explains why a relay needs several people and how the work is shared." },
      "evidencia": "M3: estaciones atendidas por otros; q6.", "criterio_logro": "Ayuda pedida y q6 correcta en 2 intentos o menos.",
      "depr_2022": ["por verificar"], "ngss": ["3-5-ETS1-2"] }
  ],
  "diario": [
    { "id": "espejo", "titulo": { "es": "Espejo de señales", "en": "Signal mirror" }, "dato": { "es": "Un espejo puede mandar un destello lejos si no hay nada en medio.", "en": "A mirror can send a flash a long way if nothing stands in between." }, "corto": { "es": "El espejo manda un destello.", "en": "The mirror sends a flash." }, "fuente": "Pendiente (NGSS 1-PS4, materiales de aula)", "fuente_url": null, "grado": "3-6", "verificacion": "por_verificar", "nota_verificacion": "Confirmar un enunciado de aula sobre luz en línea recta antes de publicar.", "paso": "diario:espejo" },
    { "id": "tambor", "titulo": { "es": "Tambor", "en": "Drum" }, "dato": { "es": "Un golpe de tambor se oye detrás de una loma, pero se apaga si uno se aleja.", "en": "A drumbeat is heard behind a hill, but it fades as you move away." }, "corto": { "es": "El tambor pasa la loma y llega corto.", "en": "The drum crosses the hill and does not travel far." }, "fuente": "Pendiente (NGSS 1-PS4 y 4-PS4)", "fuente_url": null, "grado": "3-6", "verificacion": "por_verificar", "nota_verificacion": "Buscar una ficha de NASA o NOAA sobre sonido y distancia; si no, dejar fuera.", "paso": "diario:tambor" },
    { "id": "banderas", "titulo": { "es": "Banderas", "en": "Flags" }, "dato": { "es": "Una bandera se ve de día y no se pierde con el ruido. De noche hace falta luz.", "en": "A flag is seen by day and is not lost in noise. At night it needs light." }, "corto": { "es": "La bandera se ve de día.", "en": "The flag is seen by day." }, "fuente": "Pendiente (Smithsonian o Library of Congress, señales con banderas)", "fuente_url": null, "grado": "3-6", "verificacion": "por_verificar", "nota_verificacion": "No publicar el dato histórico hasta tener la cita.", "paso": "diario:banderas" },
    { "id": "marcas", "titulo": { "es": "Marcas en la piedra", "en": "Marks on the stone" }, "dato": { "es": "En el juego, las piedras muestran un 36, dos cotorras, un camino, un fuego y una mano.", "en": "In the game, the stones show a 36, two parrots, a path, a fire and a hand." }, "corto": { "es": "Cinco marcas en las piedras.", "en": "Five marks on the stones." }, "fuente": "Pendiente (el propio episodio; no es un dato del mundo real)", "fuente_url": null, "grado": "3-6", "verificacion": "por_verificar", "nota_verificacion": "Es contenido del juego. No afirmar quién hizo las marcas.", "paso": "diario:marcas" },
    { "id": "especies", "titulo": { "es": "Dos cotorras de las islas del sur", "en": "Two parrots of the southern islands" }, "dato": { "es": "Amazona martinicana (loro de Martinica) y Amazona violacea (amazona de Guadalupe) están extintas según la UICN. Se conocen por relatos: Labat, 1742, y Du Tertre, 1654. No hay restos. El juego no dice cuándo ni por qué dejaron de existir.", "en": "Amazona martinicana (Martinique amazon) and Amazona violacea (Guadeloupe amazon) are extinct according to the IUCN. They are known from accounts: Labat, 1742, and Du Tertre, 1654. There are no remains. The game does not say when or why they ceased to exist." }, "corto": { "es": "Extintas. Solo relatos. Sin restos.", "en": "Extinct. Only accounts. No remains." }, "fuente": "BirdLife International (2021), Amazona martinicana, IUCN Red List; BirdLife International (2016), Amazona violacea, IUCN Red List; Labat 1742 y Du Tertre 1654, citados en content/comun/especies.js", "fuente_url": "https://www.iucnredlist.org/species/22728705/194903850", "grado": "3-6", "verificacion": "verificado", "nota_verificacion": "La nota «hacia 1779» de especies.js no tiene cita propia: el juego no la usa.", "paso": "diario:especies" },
    { "id": "treinta", "titulo": { "es": "El número 36", "en": "The number 36" }, "dato": { "es": "En la piedra del juego está el 36. En esta historia el pacto se llama de los 36.", "en": "The stone in the game shows 36. In this story the pact is called the pact of the 36." }, "corto": { "es": "En la piedra: 36.", "en": "On the stone: 36." }, "fuente": "Pendiente (canon de la historia; no es un dato del mundo real)", "fuente_url": null, "grado": "3-6", "verificacion": "por_verificar", "nota_verificacion": "No publicar un significado histórico del número.", "paso": "diario:treinta" }
  ],
  "preguntas": [
    { "id": "q1", "tipo": "opcion_multiple", "objetivo": "E1", "grado": "3-6",
      "enunciado": { "es": "¿Cuántas voces había en el transmisor?", "en": "How many voices were on the transmitter?" },
      "opciones": [{ "es": "Dos", "en": "Two" }, { "es": "Una, con eco", "en": "One, with an echo" }, { "es": "Ninguna", "en": "None" }],
      "correcta": 0,
      "retro": { "correcta": { "es": "Sí. Había dos ondas, de dos colores.", "en": "Yes. There were two waves, in two colors." },
        "incorrecta": { "es": "Pista: Iguaca dijo «son dos» al ver la otra onda.", "en": "Hint: Iguaca said “there are two” when she saw the other wave." } },
      "verificacion": "juego (lo que el jugador vio y oyó en M1)" },
    { "id": "q2", "tipo": "opcion_multiple", "objetivo": "E1", "grado": "3-6",
      "enunciado": { "es": "Tres cortos y uno largo: ¿cuál es el patrón?", "en": "Three short and one long: which pattern is it?" },
      "opciones": [{ "es": "···—", "en": "···—" }, { "es": "—···", "en": "—···" }, { "es": "····", "en": "····" }, { "es": "——", "en": "——" }],
      "correcta": 0,
      "retro": { "correcta": { "es": "Sí. Tres cortos y después uno largo.", "en": "Yes. Three short, then one long." },
        "incorrecta": { "es": "Pista: primero los cortos. El largo va al final.", "en": "Hint: the short ones come first. The long one is last." } },
      "verificacion": "juego (el patrón que el jugador copió)" },
    { "id": "q3", "tipo": "opcion_multiple", "objetivo": "E2", "grado": "3-6",
      "enunciado": { "es": "«Hay dos cotorras dibujadas en la piedra.» ¿Lo sabes o lo supones?", "en": "“There are two parrots drawn on the stone.” Do you know it or suppose it?" },
      "opciones": [{ "es": "Lo sé: lo veo en la marca", "en": "I know it: I see it on the mark" }, { "es": "Lo supongo", "en": "I suppose it" }, { "es": "No se puede saber nunca", "en": "It can never be known" }],
      "correcta": 0,
      "retro": { "correcta": { "es": "Sí. Está dibujado. Eso se ve. Decir que son las dos voces ya sería un supongo.", "en": "Yes. It is drawn. You can see that. Saying they are the two voices would be a supposition." },
        "incorrecta": { "es": "Pista: si está en la piedra, lo estás viendo.", "en": "Hint: if it is on the stone, you are seeing it." } },
      "verificacion": "juego (la marca del mirador)" },
    { "id": "q4", "tipo": "opcion_multiple", "objetivo": "E2", "grado": "3-6",
      "enunciado": { "es": "¿Cómo sabemos que existieron el loro de Martinica y la amazona de Guadalupe?", "en": "How do we know the Martinique amazon and the Guadeloupe amazon existed?" },
      "opciones": [{ "es": "Por relatos escritos de hace siglos", "en": "From written accounts centuries old" }, { "es": "Porque hay huesos en un museo", "en": "Because there are bones in a museum" }, { "es": "Porque todavía vuelan en esas islas", "en": "Because they still fly on those islands" }],
      "correcta": 0,
      "retro": { "correcta": { "es": "Sí. Du Tertre (1654) y Labat (1742) las describieron. La UICN las lista extintas y no hay restos.", "en": "Yes. Du Tertre (1654) and Labat (1742) described them. The IUCN lists them as extinct and there are no remains." },
        "incorrecta": { "es": "Pista: Iguaca leyó la ficha. Solo hay relatos, sin restos.", "en": "Hint: Iguaca read the card. There are only accounts, no remains." } },
      "verificacion": "verificado (BirdLife/UICN 2021 y 2016; Du Tertre 1654; Labat 1742; content/comun/especies.js)" },
    { "id": "q5", "tipo": "opcion_multiple", "objetivo": "E3", "grado": "3-6",
      "enunciado": { "es": "La luz no pasó de la loma. ¿Qué cambias?", "en": "The light did not get past the hill. What do you change?" },
      "opciones": [{ "es": "Muevo la estación a un sitio que se vea", "en": "I move the station to a place that can be seen" }, { "es": "Grito más fuerte", "en": "I shout louder" }, { "es": "Apago la señal", "en": "I turn the signal off" }],
      "correcta": 0,
      "retro": { "correcta": { "es": "Sí. Si la línea choca, se mueve el puesto. Luego se vuelve a probar.", "en": "Yes. If the line hits something, you move the post. Then you test again." },
        "incorrecta": { "es": "Pista: la luz no rodea la loma. Hay que cambiar el sitio.", "en": "Hint: light does not go around the hill. The place has to change." } },
      "verificacion": "juego (lo que el jugador vio en el rayo)" },
    { "id": "q6", "tipo": "opcion_multiple", "objetivo": "E4", "grado": "3-6",
      "enunciado": { "es": "¿Por qué un relevo necesita a varios?", "en": "Why does a relay need several people?" },
      "opciones": [{ "es": "Porque una sola persona no puede estar en tres sitios a la vez", "en": "Because one person cannot be in three places at once" }, { "es": "Porque así la señal se oye más fuerte", "en": "Because then the signal sounds louder" }, { "es": "Porque si no, no hay fiesta", "en": "Because otherwise there is no party" }],
      "correcta": 0,
      "retro": { "correcta": { "es": "Sí. Cada estación necesita a alguien. Vittata pide ayuda.", "en": "Yes. Each station needs someone. Vittata asks for help." },
        "incorrecta": { "es": "Pista: la primera prueba se cortó en la estación vacía.", "en": "Hint: the first test stopped at the empty station." } },
      "verificacion": "juego (la prueba 1 del relevo)" }
  ],
  "formativa": {
    "momento": "Después del final, al volver a hablar con Iguaca. Es opcional.",
    "duracion_min": 3,
    "seleccion": { "3-4": ["q1", "q2", "q3", "q4", "q5", "q6"], "5-6": ["q1", "q2", "q3", "q4", "q5", "q6"] },
    "reglas": "Retro inmediata. Segundo intento con pista. Al tercero se muestra la respuesta. Sin puntaje visible ni castigo."
  },
  "modo_maestro": {
    "acceso": { "como": "Igual que en el episodio 1: en el menú de pausa, mantener pulsado «Docentes» 1,2 segundos y resolver una multiplicación.", "nota": "No es contraseña ni cuenta." },
    "guia_45_min": {
      "pregunta_guia": { "es": "¿Cómo se manda un mensaje lejos cuando una sola persona no llega?", "en": "How do you send a message far when one person cannot reach?" },
      "materiales": ["1 dispositivo por pareja", "Tarjetas con las palabras patrón, señal, evidencia y relevo"],
      "antes": { "minutos": 10, "pasos": [
        "2 min: escribe la pregunta guía.",
        "3 min: cada estudiante predice si en el transmisor hay una voz o dos.",
        "3 min: vocabulario con imágenes: patrón, señal, evidencia, relevo.",
        "2 min: parejas. Cambian de rol al leer las piedras." ] },
      "durante": { "minutos": 25, "pasos": [
        "20 min: las parejas juegan las tres misiones.",
        "Circula con 3 preguntas: ¿cuántas voces había? ¿qué viste en la piedra y qué supusiste? ¿dónde se cortó el relevo?",
        "5 min: «Iguaca te pregunta», si quieren." ] },
      "despues": { "minutos": 10, "pasos": [
        "5 min: dos parejas cuentan dónde se cortó su señal y a quién le pidieron ayuda.",
        "3 min: boleto de salida: «Sé que ___ porque vi ___; supongo que ___.»",
        "2 min: descarga el reporte (Modo Maestro → Reporte)." ] },
      "diferenciacion": {
        "3-4": "Nivel 1: texto corto y el boleto con una sola evidencia.",
        "5-6": "Nivel 2: además, por qué un patrón en pasos se entiende aunque la señal llegue débil, qué evidencia faltaría para pasar un supongo a sé, y por qué falló la primera prueba."
      }
    },
    "actividades_sin_pantalla": [
      { "id": "b1", "titulo": "Teléfono de patrones", "grados": "3-6", "minutos": 15, "objetivos": ["E1"],
        "materiales": ["La clase en fila", "Un patrón de tres palmadas cortas y una larga"],
        "pasos": ["Pasen el patrón de palmadas por la fila.", "Después pasen una frase al oído.", "Comparen cuál llegó más entera."] },
      { "id": "b2", "titulo": "Sé o supongo", "grados": "3-6", "minutos": 15, "objetivos": ["E2"],
        "materiales": ["Una foto", "Tarjetas en blanco"],
        "pasos": ["Escriban frases sobre la foto.", "Sepárenlas en «lo veo» y «lo supongo».", "Pregunten «¿cómo lo sabes?» antes de mover una tarjeta."] },
      { "id": "b3", "titulo": "Relevo de luz", "grados": "3-6", "minutos": 20, "objetivos": ["E3", "E4"],
        "materiales": ["Linternas o espejos de mano", "Un libro que haga de loma"],
        "pasos": ["Mandan un destello de mesa a mesa.", "Pongan el libro en medio y miren dónde se corta.", "Hace falta una persona por mesa. Prueben otra vez."] }
    ],
    "rubrica": {
      "escala": { "4": "Excelente", "3": "Competente", "2": "En desarrollo", "1": "Inicio" },
      "criterios": [
        { "id": "R1", "criterio": "Patrones", "objetivo": "E1", "evidencia": "M1, q1, q2, b1", "niveles": { "4": "Ordena el mensaje, copia el patrón y explica por qué un orden no se entendía.", "3": "Ordena el mensaje y copia el patrón.", "2": "Copia el patrón o ordena el mensaje.", "1": "No separa los pedazos." } },
        { "id": "R2", "criterio": "Evidencia y suposición", "objetivo": "E2", "evidencia": "M2, q3, q4, b2", "niveles": { "4": "Separa lo que ve de lo que supone y lo aplica a las dos especies sin inventar causas.", "3": "Separa lo que ve de lo que supone.", "2": "Confunde un sé con un supongo.", "1": "Afirma sin mirar la marca." } },
        { "id": "R3", "criterio": "Diseño y prueba del relevo", "objetivo": "E3", "evidencia": "M3, q5, b3", "niveles": { "4": "Elige un código, ve dónde se corta, cambia eso y vuelve a probar.", "3": "Prueba, ve el corte y cambia el puesto.", "2": "Prueba una vez y no cambia nada.", "1": "No prueba." } },
        { "id": "R4", "criterio": "Cooperación", "objetivo": "E4", "evidencia": "Ayuda pedida, q6", "niveles": { "4": "Pide ayuda, reparte las estaciones y explica por qué una persona no basta.", "3": "Pide ayuda y reparte las estaciones.", "2": "Pide ayuda sin decir por qué.", "1": "Insiste en hacerlo todo sola." } },
        { "id": "R5", "criterio": "Cuidado al hablar de especies extintas", "objetivo": "E2", "evidencia": "Ficha de especies, q4", "niveles": { "4": "Dice que se conocen por relatos, que hoy no existen y que no sabemos la causa.", "3": "Dice que ya no existen y que lo sabemos por relatos.", "2": "Dice que ya no existen.", "1": "Inventa una causa o una fecha." } }
      ]
    },
    "reporte_progreso": {
      "principios": [
        "Sin cuentas, nombres reales, correos, fotos, audio ni ubicación.",
        "El juego no envía datos del estudiante por la red."
      ],
      "almacenamiento": { "donde": "localStorage del dispositivo", "clave": "amazonaverse.aula.ep5", "separado_de": "partida del juego (ep5.save)", "retencion": "Hasta que el maestro pulse «Borrar progreso de este dispositivo»." },
      "identificador": "Estación que el maestro elige de una lista. Nunca el nombre del estudiante.",
      "campos_por_partida": [
        "estacion", "fecha (día, sin hora)", "idioma", "modo_texto_corto", "lectura_voz",
        "misiones_completadas", "fragmentos", "orden", "recuerdos", "clasificacion",
        "codigo", "estaciones", "que_fallo", "ayuda_pedida",
        "preguntas", "objetivos_logrados", "minutos_mision"
      ],
      "prohibido": ["nombre", "fecha de nacimiento", "correo", "IP", "identificador de dispositivo", "texto libre", "audio", "imagen"],
      "formatos": ["csv", "json"],
      "nombre_archivo": "amazonaverse_ep5_{estacion}_{AAAA-MM-DD}.csv",
      "cumplimiento": "Mismo criterio que el episodio 1: el juego no recoge información personal de niños. Validar con el abogado de COPPA antes del piloto."
    }
  }
};
