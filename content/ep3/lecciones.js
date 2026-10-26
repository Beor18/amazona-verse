/* Amazona Verse · Lección del episodio 3 «Más allá de la bahía» (EP3_MISIONES.md §1 y §5–7). PROPUESTA.
   Mismo esquema que content/ep2/lecciones.js (lo lee src/game/aula.js tal cual): meta, objetivos, diario (fichas), preguntas,
   formativa y modo_maestro. Nada de src/ tocado.
   Reglas: el juego es para todas las edades (en el Aula: «Nivel 1» y «Nivel 2»; los valores internos 3-4 / 5-6 son los que
   entiende aula.js y nunca se muestran). Ninguna ficha sale al Diario sin fuente verificada: las 6 van «por_verificar», así que
   aula.js solo las lista en el Modo Maestro. Las preguntas hablan de lo que el jugador vio en el juego: ninguna afirma un dato del
   mundo real (flotabilidad, brisas, corrientes y la herencia de la canoa siguen por verificar, §2–4). [KELVIN] marca lo que es canon. */
window.AV_LECCIONES_EP3 = {
  "meta": {
    "capitulo": 3,
    "titulo": { "es": "Más allá de la bahía", "en": "Beyond the Bay" },
    "version": "0.1-propuesta",
    "fecha": "2026-10-26",
    "grados": "3-6",
    "documento": "docs/equipo/EP3_MISIONES.md",
    "duracion_mision_min": 18,
    "i18n": "Todo texto visible es {es,en}. 'corto' (8 palabras o menos) se usa en el modo sin texto largo.",
    "verificacion_leyenda": {
      "verificado": "Dato leído en la fuente oficial citada.",
      "parcial": "Fuente confiable encontrada, pero hay que reconfirmar el enlace o es fuente secundaria.",
      "por_verificar": "Sin fuente confirmada. NO se publica hasta que lo valide una fuente oficial (USFWS, DRNA, NOAA, NASA, ICP, Smithsonian)."
    },
    "fuentes_estandares": {
      "depr_2022": "https://dedigital.dde.pr/mod/resource/view.php?id=2854",
      "depr_formato": "Los indicadores DEPR 2022 de este episodio van por verificar: sacarlos del documento oficial, no inventarlos (EP3_MISIONES.md §1).",
      "ngss": "https://www.nextgenscience.org/"
    }
  },

  "objetivos": [
    { "id": "E1", "tema": "materiales", "grados": "3-6",
      "enunciado": { "es": "Prueba qué materiales flotan y elige el adecuado para un casco con evidencia.", "en": "Tests which materials float and chooses the right one for a hull with evidence." },
      "evidencia": "M1: tabla de 6 materiales; q1, q2.", "criterio_logro": "Los 6 materiales probados y q1 y q2 correctas en 2 intentos o menos.",
      "depr_2022": ["por verificar"], "ngss": ["2-PS1-2", "5-PS1-3"] },
    { "id": "E2", "tema": "equilibrio", "grados": "3-6",
      "enunciado": { "es": "Explica por qué un bote falla en una prueba, cambia solo esa parte y lo vuelve a probar.", "en": "Explains why a boat fails a test, changes only that part and tests it again." },
      "evidencia": "M1: botadura 1 → cambio → botadura 2; q3.", "criterio_logro": "Cambia la parte que falló y q3 correcta en 2 intentos o menos.",
      "depr_2022": ["por verificar"], "ngss": ["3-PS2-1", "3-5-ETS1-3"] },
    { "id": "E3", "tema": "senales", "grados": "3-6",
      "enunciado": { "es": "Diseña un código de señales para pasar información y lo ajusta cuando una señal falla.", "en": "Designs a signal code to pass on information and adjusts it when a signal fails." },
      "evidencia": "M2: código de 3 señales y su cambio en el chubasco; q4.", "criterio_logro": "Código acordado, señal cambiada y q4 correcta en 2 intentos o menos.",
      "depr_2022": ["por verificar"], "ngss": ["4-PS4-3"] },
    { "id": "E4", "tema": "leer_el_agua", "grados": "3-6",
      "enunciado": { "es": "Usa observaciones del viento, las nubes y la corriente para decidir cuándo y por dónde salir.", "en": "Uses observations of wind, clouds and current to decide when and where to set out." },
      "evidencia": "M2 y M3: postes, nubes, semilla y ruta; q5, q6.", "criterio_logro": "Las 4 observaciones hechas y q5 y q6 correctas en 2 intentos o menos.",
      "depr_2022": ["por verificar"], "ngss": ["3-ESS2-1", "5-ESS2-1"] }
  ],

  // 6 hallazgos del Diario del ep. 3 (§7): 3 de ciencia del agua y 3 de cultura del mar. Todos «por_verificar»: el Educativo tiene
  // que confirmar cada dato en la fuente propuesta antes de que salgan al Diario del niño. El id coincide con la entrada de pack.diario.
  "diario": [
    { "id": "flota_hunde", "titulo": { "es": "Flotar y hundirse", "en": "Floating and sinking" }, "dato": { "es": "Un objeto flota si es menos denso que el agua; la forma del casco cambia cuánta agua aparta.", "en": "An object floats if it is less dense than water; the shape of a hull changes how much water it pushes aside." }, "corto": { "es": "Menos denso que el agua: flota.", "en": "Less dense than water: it floats." }, "fuente": "Pendiente (NOAA Ocean Service / NASA, flotabilidad y principio de Arquímedes)", "fuente_url": null, "grado": "3-6", "verificacion": "por_verificar", "nota_verificacion": "Confirmar el texto con una ficha educativa de NOAA o NASA.", "paso": "diario" },
    { "id": "brisa_mar", "titulo": { "es": "Brisa de mar y de tierra", "en": "Sea and land breeze" }, "dato": { "es": "De día el viento suele soplar del mar hacia la tierra, y de noche de la tierra hacia el mar.", "en": "By day the wind tends to blow from the sea to the land, and at night from the land to the sea." }, "corto": { "es": "De día, del mar; de noche, de tierra.", "en": "Day: from the sea. Night: from land." }, "fuente": "Pendiente (NOAA / NWS, sea breeze)", "fuente_url": null, "grado": "3-6", "verificacion": "por_verificar", "nota_verificacion": "Buscar la página educativa del NWS sobre la brisa marina.", "paso": "diario" },
    { "id": "semilla_viajera", "titulo": { "es": "El coco viajero", "en": "The traveling coconut" }, "dato": { "es": "El coco flota y puede viajar por el mar hasta otra costa, donde a veces germina.", "en": "The coconut floats and can travel by sea to another shore, where it sometimes sprouts." }, "corto": { "es": "El coco cruza el mar flotando.", "en": "Coconuts cross the sea floating." }, "fuente": "Pendiente (Smithsonian)", "fuente_url": null, "grado": "3-6", "verificacion": "por_verificar", "nota_verificacion": "Confirmar con una fuente del Smithsonian sobre la dispersión del coco.", "paso": "diario" },
    { "id": "canoa_taina", "titulo": { "es": "La palabra canoa", "en": "The word canoe" }, "dato": { "es": "La palabra «canoa» viene de las lenguas de las Antillas; los taínos hacían canoas de un solo tronco.", "en": "The word “canoe” comes from the languages of the Antilles; the Taíno made canoes from a single log." }, "corto": { "es": "«Canoa»: palabra de las Antillas.", "en": "“Canoe”: a word from the Antilles." }, "fuente": "Pendiente (RAE, DLE «canoa»; Smithsonian NMAI)", "fuente_url": null, "grado": "3-6", "verificacion": "por_verificar", "nota_verificacion": "[KELVIN: si el canon incluye la herencia taína de la canoa]. Confirmar con el DLE y el NMAI.", "paso": "diario" },
    { "id": "cayuco", "titulo": { "es": "El cayuco", "en": "The cayuco" }, "dato": { "es": "El cayuco es un bote de pesca pequeño, hecho de una sola pieza de madera.", "en": "A cayuco is a small fishing boat made from a single piece of wood." }, "corto": { "es": "Cayuco: bote de una pieza.", "en": "Cayuco: a one-piece boat." }, "fuente": "Pendiente (Instituto de Cultura Puertorriqueña)", "fuente_url": null, "grado": "3-6", "verificacion": "por_verificar", "nota_verificacion": "Confirmar con el ICP.", "paso": "diario" },
    { "id": "nasa", "titulo": { "es": "La nasa", "en": "The fish trap" }, "dato": { "es": "La nasa es una trampa de pesca tejida: el pez entra y no encuentra la salida.", "en": "A nasa is a woven fish trap: the fish swims in and cannot find the way out." }, "corto": { "es": "Nasa: trampa de pesca tejida.", "en": "Nasa: a woven fish trap." }, "fuente": "Pendiente (Instituto de Cultura Puertorriqueña)", "fuente_url": null, "grado": "3-6", "verificacion": "por_verificar", "nota_verificacion": "Confirmar con el ICP.", "paso": "diario" }
  ],

  // «Iguaca te pregunta» (§5): 6 preguntas. Sin puntaje visible; pista en el 2.º intento y respuesta en el 3.º (aula.js).
  // Todas preguntan por lo que el jugador vio en el juego.
  "preguntas": [
    { "id": "q1", "tipo": "opcion_multiple", "objetivo": "E1", "grado": "3-6",
      "enunciado": { "es": "¿Cuáles se hundieron en la poza?", "en": "Which ones sank in the pool?" },
      "opciones": [{ "es": "La piedra y el clavo viejo", "en": "The stone and the old nail" }, { "es": "El tronco y el coco", "en": "The log and the coconut" }, { "es": "El bambú y la tabla", "en": "The bamboo and the plank" }],
      "correcta": 0,
      "retro": { "correcta": { "es": "Sí. Esos dos fuiste a buscarlos buceando; los otros cuatro se quedaron arriba.", "en": "Yes. You had to dive for those two; the other four stayed on top." },
        "incorrecta": { "es": "Pista: ¿a cuáles tuviste que ir a buscar al fondo?", "en": "Hint: which ones did you have to fetch from the bottom?" } },
      "verificacion": "juego (lo que el jugador observó en la poza)" },
    { "id": "q2", "tipo": "opcion_multiple", "objetivo": "E1", "grado": "3-6",
      "enunciado": { "es": "¿Qué casco era el más ligero y rápido?", "en": "Which hull was the lightest and fastest?" },
      "opciones": [{ "es": "El de bambú atado", "en": "The tied bamboo one" }, { "es": "El de tronco", "en": "The log one" }, { "es": "El de piedra", "en": "The stone one" }],
      "correcta": 0,
      "retro": { "correcta": { "es": "Sí. El bambú flotó y pesa poco, pero necesita un buen amarre.", "en": "Yes. Bamboo floated and is light, but it needs a good lashing." },
        "incorrecta": { "es": "Pista: mira lo que decía cada casco cuando armaste el bote.", "en": "Hint: look at what each hull said when you built the boat." } },
      "verificacion": "juego (opciones de la misión 1)" },
    { "id": "q3", "tipo": "opcion_multiple", "objetivo": "E2", "grado": "3-6",
      "enunciado": { "es": "La canoa se inclinó porque la carga iba a un lado. ¿Qué cambias?", "en": "The canoe tilted because the load was on one side. What do you change?" },
      "opciones": [{ "es": "Pongo la carga al centro", "en": "I put the load in the middle" }, { "es": "Cambio todo el casco", "en": "I change the whole hull" }, { "es": "Le pongo más carga", "en": "I add more load" }],
      "correcta": 0,
      "retro": { "correcta": { "es": "Sí. Se cambia solo lo que falló y se vuelve a probar.", "en": "Yes. You change only what failed and test again." },
        "incorrecta": { "es": "Pista: ¿qué parte marcó la primera botadura?", "en": "Hint: which part did the first launch mark?" } },
      "verificacion": "parcial (ciclo de prueba y mejora, NGSS 3-5-ETS1-3; concepto general)" },
    { "id": "q4", "tipo": "opcion_multiple", "objetivo": "E3", "grado": "3-6",
      "enunciado": { "es": "Con lluvia y mucho viento, ¿qué señal falló en la práctica?", "en": "With rain and strong wind, which signal failed during practice?" },
      "opciones": [{ "es": "El silbido", "en": "The whistle" }, { "es": "Levantar el remo", "en": "Raising the paddle" }, { "es": "Ninguna", "en": "None" }],
      "correcta": 0,
      "retro": { "correcta": { "es": "Sí. El viento se llevó el silbido; una señal que se ve sirvió mejor.", "en": "Yes. The wind carried the whistle away; a signal you can see worked better." },
        "incorrecta": { "es": "Pista: ¿cuál no se oyó con el chubasco?", "en": "Hint: which one could not be heard in the squall?" } },
      "verificacion": "juego (lo que pasó en la práctica)" },
    { "id": "q5", "tipo": "opcion_multiple", "objetivo": "E4", "grado": "3-6",
      "enunciado": { "es": "La semilla bajó rápido por el río. ¿Qué te dice del agua?", "en": "The seed went fast down the river. What does it tell you about the water?" },
      "opciones": [{ "es": "Que la corriente va río abajo y con fuerza", "en": "That the current flows downstream, and strongly" }, { "es": "Que el agua está quieta", "en": "That the water is still" }, { "es": "Que va río arriba", "en": "That it flows upstream" }],
      "correcta": 0,
      "retro": { "correcta": { "es": "Sí. Lo que flota va adonde va el agua: la semilla te enseñó la corriente.", "en": "Yes. What floats goes where the water goes: the seed showed you the current." },
        "incorrecta": { "es": "Pista: ¿hacia dónde se fue la semilla y a qué velocidad?", "en": "Hint: where did the seed go, and how fast?" } },
      "verificacion": "juego (lo que el jugador observó)" },
    { "id": "q6", "tipo": "opcion_multiple", "objetivo": "E4", "grado": "3-6",
      "enunciado": { "es": "Las nubes están bajas y oscuras. ¿Qué dijo la navegante?", "en": "The clouds are low and dark. What did the navigator say?" },
      "opciones": [{ "es": "Hoy no: mejor esperar", "en": "Not today: better to wait" }, { "es": "¡Vamos ya!", "en": "Let's go now!" }, { "es": "Que da igual", "en": "That it doesn't matter" }],
      "correcta": 0,
      "retro": { "correcta": { "es": "Sí. Miró el cielo y el agua antes de salir. Al día siguiente, el viento estaba a favor.", "en": "Yes. She looked at the sky and the water before setting out. The next day, the wind was in their favor." },
        "incorrecta": { "es": "Pista: recuerda lo que viste desde el mirador.", "en": "Hint: remember what you saw from the lookout." } },
      "verificacion": "juego (lo que pasó en la misión 2; el dato real de las nubes sigue por verificar: NWS)" }
  ],
  "formativa": {
    "momento": "Después del intercambio (Chapter3Completed), cuando el jugador vuelve a hablar con Iguaca. Es opcional y se puede dejar para luego.",
    "duracion_min": 3,
    "seleccion": { "3-4": ["q1", "q2", "q3", "q4", "q5", "q6"], "5-6": ["q1", "q2", "q3", "q4", "q5", "q6"] },
    "reglas": "Retro inmediata. Segundo intento con pista. Al tercero se muestra la respuesta y se explica. Sin puntaje visible ni castigo. Se registra si acertó en el intento 1, 2 o 3."
  },

  "modo_maestro": {
    "acceso": { "como": "Igual que en el episodio 1: en el menú de pausa, mantener pulsado «Docentes» 1,2 segundos y resolver una multiplicación.", "nota": "No es contraseña ni cuenta. Solo evita que un niño entre por accidente." },
    "guia_45_min": {
      "pregunta_guia": { "es": "¿Cómo se construye un bote que flote y cómo se llega lejos con alguien que sabe leer el agua?", "en": "How do you build a boat that floats, and how do you go far with someone who can read the water?" },
      "materiales": ["1 dispositivo por pareja", "Audífonos (opcional)", "Tabla de flotación impresa (1 por estudiante)", "5 tarjetas de vocabulario con imagen: flotar, hundirse, equilibrio, señal, corriente"],
      "antes": { "minutos": 10, "pasos": [
        "2 min: escribe la pregunta guía en la pizarra.",
        "3 min: cada estudiante predice en la tabla impresa cuáles de 6 materiales flotan (piedra, tronco, bambú, tabla, coco, clavo).",
        "3 min: vocabulario con imágenes: flotar, hundirse, equilibrio, señal, corriente.",
        "2 min: parejas con dos roles: piloto (juega) y navegante (anota y canta las señales). Cambian de rol en la práctica del río (misión 2)." ] },
      "durante": { "minutos": 25, "pasos": [
        "20 min: las parejas juegan las tres misiones: «¿Qué flota?», «Leer el agua» y «Más allá de la bahía».",
        "Circula con 3 preguntas: ¿Qué falló en la primera botadura y qué cambiaste? ¿Qué señal falló con el chubasco? ¿Quién llevó el timón y por qué?",
        "5 min: evaluación formativa dentro del juego («Iguaca te pregunta», al volver a hablar con Iguaca después del intercambio)." ] },
      "despues": { "minutos": 10, "pasos": [
        "5 min: dos parejas comparan su tabla de flotación con su predicción.",
        "3 min: boleto de salida: «Mi bote flota porque ___; en el agua confié en ___ porque ___».",
        "2 min: descarga el reporte de cada dispositivo (Modo Maestro → Reporte)." ] },
      "diferenciacion": {
        "3-4": "Nivel 1: modo de texto corto y lectura en voz alta; el boleto de salida con una sola evidencia.",
        "5-6": "Nivel 2: además, explicar por qué un clavo se hunde y un bote de madera con clavos flota, y por qué su código de señales funciona con lluvia; boleto con dos evidencias.",
        "apoyo_idioma": "Modo bilingüe ES/EN para estudiantes que aprenden español o inglés."
      }
    },
    "actividades_sin_pantalla": [
      { "id": "b1", "titulo": "¿Flota o se hunde?", "grados": "3-6", "minutos": 20, "objetivos": ["E1"],
        "materiales": ["Una palangana con agua", "Objetos de la clase: piedra, lápiz, borra, moneda, corcho, llave", "Tabla impresa", "Toalla"],
        "pasos": ["Predice en la tabla qué pasará con cada objeto.", "Suelta cada objeto con cuidado y anota si flota o se hunde.", "Compara con tu predicción: ¿qué tienen en común los que flotaron?"] },
      { "id": "b2", "titulo": "Barquitos de papel de aluminio", "grados": "3-6", "minutos": 25, "objetivos": ["E2"],
        "materiales": ["Papel de aluminio (un cuadrado por pareja)", "Monedas", "La palangana con agua"],
        "pasos": ["Dobla un barquito y ponlo en el agua.", "Pon las monedas todas a un lado: ¿qué pasa?", "Cambia solo dónde va la carga y vuelve a probar. ¿Cuántas monedas aguanta derecho?"],
        "estandares": ["3-5-ETS1-3"] },
      { "id": "b3", "titulo": "Señales con ruido", "grados": "3-6", "minutos": 15, "objetivos": ["E3"],
        "materiales": ["Cinta adhesiva para marcar un «río» en el piso", "Un pañuelo (bandera)", "Música o ruido de fondo"],
        "pasos": ["En parejas, acuerden 3 señales para «izquierda», «derecha» y «para».", "Uno guía y el otro camina por el río con los ojos en el guía.", "Pongan ruido: ¿qué señal falla? Cámbienla y prueben otra vez."] }
    ],
    "rubrica": {
      "escala": { "4": "Excelente", "3": "Competente", "2": "En desarrollo", "1": "Inicio" },
      "criterios": [
        { "id": "R1", "criterio": "Prueba de materiales", "objetivo": "E1", "evidencia": "M1, tabla de flotación, q1, q2, actividad b1", "niveles": { "4": "Prueba los 6 materiales, compara con su predicción y elige el casco con dos evidencias.", "3": "Prueba los 6 y elige con una evidencia.", "2": "Prueba algunos o elige sin evidencia.", "1": "Elige a ojo." } },
        { "id": "R2", "criterio": "Equilibrio y mejora", "objetivo": "E2", "evidencia": "M1, q3, actividad b2", "niveles": { "4": "Identifica la parte que falló, la cambia, vuelve a probar y explica por qué funcionó.", "3": "Cambia la parte que falló y vuelve a probar.", "2": "Cambia una parte que no falló.", "1": "No prueba o no cambia nada." } },
        { "id": "R3", "criterio": "Diseño de señales", "objetivo": "E3", "evidencia": "M2, q4, actividad b3", "niveles": { "4": "Acuerda un código claro, detecta la señal que falla y explica por qué la nueva funciona mejor.", "3": "Acuerda el código y cambia la señal que falla.", "2": "Acuerda el código pero no lo ajusta.", "1": "No sigue el código." } },
        { "id": "R4", "criterio": "Lectura del tiempo y del agua", "objetivo": "E4", "evidencia": "M2, M3, q5, q6", "niveles": { "4": "Usa el viento, las nubes y la corriente para decidir cuándo y por dónde salir, y lo explica.", "3": "Usa dos de las tres observaciones.", "2": "Observa pero no lo usa para decidir.", "1": "Decide sin mirar." } },
        { "id": "R5", "criterio": "Colaboración y confianza", "objetivo": "E3, E4", "evidencia": "Elección del timón, el bajío y el boleto de salida", "niveles": { "4": "Explica cuándo conviene ceder el timón y cómo se arregla un error entre dos.", "3": "Explica por qué eligió quién lleva el timón.", "2": "Elige sin explicar.", "1": "No colabora con su pareja." } }
      ]
    },
    "reporte_progreso": {
      "principios": [
        "Sin cuentas, nombres reales, correos, fotos, audio ni ubicación. El reporte no lleva nombres ni identificadores.",
        "Sin texto libre: el niño elige de listas.",
        "El juego no envía datos del estudiante por la red: el progreso queda solo en el dispositivo.",
        "El maestro decide qué hacer con el archivo descargado; el juego no lo envía."
      ],
      "almacenamiento": { "donde": "localStorage del dispositivo", "clave": "amazonaverse.aula.ep3", "separado_de": "partida del juego (ep3.save)", "retencion": "Hasta que el maestro pulse «Borrar progreso de este dispositivo»." },
      "identificador": "Estación que el maestro elige de una lista (Estación 1 a 40). Nunca el nombre del estudiante.",
      "campos_por_partida": [
        "estacion", "fecha (día, sin hora)", "idioma", "modo_texto_corto", "lectura_voz",
        "misiones_completadas (flota, agua, bahia)", "materiales_probados (0-6)", "casco", "falla_botadura", "mejora_hecha (sí/no)",
        "codigo_senales", "senal_cambiada", "timon", "ruta", "bajio",
        "preguntas [{id, intento_correcto 1-3}]", "objetivos_logrados [E1..E4]", "minutos_mision (redondeado)"
      ],
      "prohibido": ["nombre", "fecha de nacimiento", "correo", "IP", "identificador de dispositivo", "texto libre", "audio", "imagen"],
      "formatos": ["csv", "json"],
      "nombre_archivo": "amazonaverse_ep3_{estacion}_{AAAA-MM-DD}.csv",
      "cumplimiento": "Mismo criterio que el episodio 1: el juego no recoge información personal de niños. Validar con el abogado de COPPA antes del piloto."
    }
  }
};
