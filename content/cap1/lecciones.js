/* Amazona Verse · Lecciones del capítulo 1 "La ruta de la gota" (generado desde assets/data/lecciones_cap1.json; no editar a mano).
   El artifact no permite fetch de .json en todos los casos: los datos se incrustan como variable global.
   Para regenerarlo: copiar el .json tal cual detrás de "window.AV_LECCIONES_CAP1 = " y cerrar con ";". */
window.AV_LECCIONES_CAP1 = {
  "meta": {
    "capitulo": 1,
    "titulo": { "es": "La ruta de la gota", "en": "The Raindrop's Path" },
    "version": "1.0-propuesta",
    "fecha": "2026-10-24",
    "grados": "3-6",
    "documento": "docs/equipo/EDUCATIVO.md",
    "reemplaza": "GDD_CAP1 §3 M2 'Ojos de guaraguao' (7 anillos). Se conserva: M2 desbloquea 'pava' y marca S.evaluated.",
    "duracion_mision_min": 5,
    "i18n": "Todo texto visible es {es,en}. 'corto' (8 palabras o menos) se usa en el modo sin texto largo.",
    "verificacion_leyenda": {
      "verificado": "Dato leído en la fuente oficial citada.",
      "parcial": "Fuente confiable encontrada, pero hay que reconfirmar el enlace o es fuente secundaria (no USFWS, DRNA, USDA FS ni Smithsonian).",
      "por_verificar": "Sin fuente confirmada. NO se publica hasta que lo valide DRNA, USFWS o USDA FS (ROADMAP_CEO §2.2)."
    },
    "fuentes_estandares": {
      "depr_2022": "https://dedigital.dde.pr/mod/resource/view.php?id=2854",
      "depr_formato": "grado.EstándarExpectativa.indicador (p. ej. 5.CT2.10). 6.º a 8.º no tiene estándar CT en DEPR 2022.",
      "ngss": "https://www.nextgenscience.org/"
    }
  },

  "objetivos": [
    {
      "id": "O1",
      "tema": "capas_del_bosque",
      "grados": "3-6",
      "enunciado": { "es": "Nombra las 4 capas del bosque y ubica en cada una un organismo que observó.", "en": "Names the 4 forest layers and places an organism they observed in each one." },
      "evidencia": "4/4 perchas observadas (paso p2) y pregunta q3 correcta.",
      "criterio_logro": "4 de 4 capas correctas en 2 intentos o menos.",
      "depr_2022": ["3.CB2.3", "3.CB2.6", "4.CT2.5", "6.CB2.5"],
      "ngss": ["3-LS4-3"]
    },
    {
      "id": "O2",
      "tema": "cadena_alimentaria",
      "grados": "3-6 (3-4: 3 eslabones; 5-6: 5 eslabones con descomponedor)",
      "enunciado": { "es": "Ordena una cadena alimentaria de El Yunque desde el Sol y explica de dónde viene la energía.", "en": "Orders an El Yunque food chain starting with the Sun and explains where the energy comes from." },
      "evidencia": "Cadena del paso p3 correcta y pregunta q4 correcta.",
      "criterio_logro": "Cadena correcta en 2 intentos o menos.",
      "depr_2022": ["5.CB2.3", "5.CB2.4", "6.CB2.7", "6.CB2.8", "6.CB2.9", "6.CB2.10"],
      "ngss": ["5-LS2-1", "5-PS3-1", "MS-LS2-3"]
    },
    {
      "id": "O3",
      "tema": "ciclo_del_agua",
      "grados": "3-6",
      "enunciado": { "es": "Ordena 5 procesos del ciclo del agua y usa ese modelo para explicar por qué crece el río.", "en": "Orders 5 water cycle processes and uses that model to explain why the river rises." },
      "evidencia": "Explicación a Iguaca (paso p8) y preguntas q1 y q2 correctas.",
      "criterio_logro": "Secuencia completa y q2 correcta en 2 intentos o menos.",
      "depr_2022": ["3.CT1.2", "5.CT2.2", "5.CT2.9", "5.CT2.10"],
      "ngss": ["5-ESS2-1", "MS-ESS2-4"],
      "nota": "6.º grado: DEPR 2022 no tiene indicador del ciclo del agua; usar MS-ESS2-4."
    },
    {
      "id": "O4",
      "tema": "adaptaciones",
      "grados": "3-6",
      "enunciado": { "es": "Explica cómo dos rasgos o conductas ayudan a un ser vivo a sobrevivir en El Yunque.", "en": "Explains how two traits or behaviors help a living thing survive in El Yunque." },
      "evidencia": "Pregunta q5 correcta y 2 fichas de adaptación en el Diario (yagrumo, cotorra_nidos).",
      "criterio_logro": "q5 correcta y 2 fichas registradas.",
      "depr_2022": ["3.CB2.5", "4.CB2.1", "4.CB2.2", "4.CB2.3", "6.CB2.13"],
      "ngss": ["4-LS1-1", "3-LS4-3"]
    },
    {
      "id": "O5",
      "tema": "especies_en_peligro_y_conservacion",
      "grados": "3-6",
      "enunciado": { "es": "Usa datos de población de la cotorra para explicar por qué sigue en peligro y nombra dos acciones de conservación.", "en": "Uses parrot population data to explain why it is still endangered and names two conservation actions." },
      "evidencia": "Pregunta q6 correcta y criterio R5 de la rúbrica.",
      "criterio_logro": "q6 correcta y R5 en nivel 3 o más.",
      "depr_2022": ["3.CA1.4", "5.CB4.4", "6.CB2.16", "6.CB2.19"],
      "ngss": ["3-LS4-4", "5-ESS3-1", "MS-LS2-5"]
    },
    {
      "id": "O6",
      "tema": "huracanes",
      "grados": "3-6",
      "enunciado": { "es": "Describe qué le hace un huracán al bosque y elige con evidencia dónde construir un refugio.", "en": "Describes what a hurricane does to the forest and uses evidence to choose where to build a shelter." },
      "evidencia": "Predicción contrastada con evidencia (p1 frente a p8) y elección de terreno justificada (boleto de salida).",
      "criterio_logro": "Nombra al menos 1 evidencia del juego al justificar el terreno.",
      "depr_2022": ["3.CT2.4", "3.CA1.2", "4.CA1.6", "6.CB2.20"],
      "ngss": ["3-ESS3-1", "4-ESS3-2", "MS-LS2-4"]
    }
  ],

  "mision_educativa": {
    "id": "m2_ruta_gota",
    "reemplaza": "m2 (anillos)",
    "titulo": { "es": "M2 · La ruta de la gota", "en": "M2 · The Raindrop's Path" },
    "pregunta_guia": { "es": "¿De dónde salió el agua que inundó el río?", "en": "Where did the water that flooded the river come from?" },
    "habilidades": ["hablar", "volar", "nadar"],
    "encaje_narrativo": "Misión 2 'Tierra firme': Iguaca lee las marcas de agua y Vittata no escucha. Vittata aprende a observar: sigue el agua y vuelve con evidencia. La crecida ocurre siempre (canon); la ciencia informa la elección de terreno, no la impone.",
    "desbloquea": "pava",
    "evento_final": "MissionCompleted",
    "sin_castigo": "Sin tiempo, sin oxígeno, sin fallar. La gota espera si el jugador se aleja.",
    "pasos": [
      {
        "id": "p1",
        "nombre": "Predecir",
        "habilidad": "hablar",
        "lugar": "marcas_agua (terreno A, junto al río)",
        "disparador": "interact:marcas_agua",
        "linea": { "personaje": "Iguaca", "es": "Mira esas marcas, nena. El río llegó hasta aquí. ¿De dónde salió tanta agua?", "en": "Look at those marks. The river reached this high. Where did all that water come from?" },
        "interaccion": {
          "tipo": "eleccion_dialogo",
          "guarda": "prediccion_agua",
          "opciones": [
            { "id": "mar", "es": "Subió del mar.", "en": "It came up from the sea." },
            { "id": "lluvia_montana", "es": "Llovió mucho en la montaña.", "en": "It rained a lot on the mountain." },
            { "id": "subsuelo", "es": "Salió de debajo de la tierra.", "en": "It came out of the ground." }
          ],
          "retro": "Ninguna todavía. Toda predicción es válida."
        },
        "respuesta": { "personaje": "Vittata", "es": "No sé… ¡pero lo voy a averiguar desde arriba! ¡Dale!", "en": "I don't know… but I'll find out from up high! Let's go!" },
        "corto": { "es": "Predice: ¿de dónde vino el agua?", "en": "Predict: where did the water come from?" },
        "objetivos": ["O3", "O6"],
        "criterio_exito": "Predicción guardada."
      },
      {
        "id": "p2",
        "nombre": "Subir por las capas",
        "habilidad": "volar",
        "lugar": "Bosque junto al terreno A. Usa las coordenadas de RINGS como PERCHAS.",
        "instruccion": { "es": "Vuela de rama en rama. Pósate en cada percha brillante y pulsa Observar.", "en": "Fly from branch to branch. Land on each glowing perch and press Observe." },
        "corto": { "es": "Pósate y observa las 4 capas.", "en": "Land and observe the 4 layers." },
        "perchas": [
          {
            "capa": "suelo",
            "modelo_3d": ["tabonuco"],
            "observa": { "es": "¿Hay mucha o poca luz aquí abajo?", "en": "Is there a lot or a little light down here?" },
            "opciones": [{ "es": "Poca luz", "en": "Little light" }, { "es": "Mucha luz", "en": "Lots of light" }, { "es": "Nieve", "en": "Snow" }],
            "correcta": 0,
            "extra": "Hojarasca y hongos (primitivas) junto a las raíces del tabonuco.",
            "diario": ["capas_bosque"]
          },
          {
            "capa": "sotobosque",
            "modelo_3d": ["helecho_gigante", "heliconia"],
            "observa": { "es": "¿Qué planta es más alta que tú pero más baja que los árboles?", "en": "Which plant is taller than you but shorter than the trees?" },
            "opciones": [{ "es": "Helecho gigante", "en": "Giant tree fern" }, { "es": "Hongo", "en": "Mushroom" }, { "es": "Nube", "en": "Cloud" }],
            "correcta": 0,
            "diario": ["helecho_gigante", "heliconia"]
          },
          {
            "capa": "dosel",
            "modelo_3d": ["tabonuco", "yagrumo", "palma_sierra", "bromelia"],
            "observa": { "es": "¿Qué plantas crecen encima de las ramas?", "en": "Which plants grow on top of the branches?" },
            "opciones": [{ "es": "Bromelias", "en": "Bromeliads" }, { "es": "Bambú", "en": "Bamboo" }, { "es": "Ninguna", "en": "None" }],
            "correcta": 0,
            "diario": ["tabonuco", "yagrumo", "bromelia"]
          },
          {
            "capa": "emergente",
            "modelo_3d": ["ceiba"],
            "observa": { "es": "Desde lo más alto, ¿qué ves?", "en": "From the very top, what do you see?" },
            "opciones": [{ "es": "El río y los dos terrenos", "en": "The river and both building sites" }, { "es": "Solo hojas", "en": "Only leaves" }, { "es": "La ciudad", "en": "The city" }],
            "correcta": 0,
            "nota": "La ceiba es el árbol más alto del mapa (decisión de diseño). Que sea emergente en El Yunque: POR VERIFICAR.",
            "diario": ["ceiba"]
          }
        ],
        "retro_incorrecta": { "es": "Mira otra vez a tu alrededor.", "en": "Look around again." },
        "objetivos": ["O1"],
        "criterio_exito": "4/4 perchas observadas."
      },
      {
        "id": "p3",
        "nombre": "Cadena en la palma",
        "habilidad": "hablar",
        "lugar": "Percha de dosel, en la palma de sierra",
        "linea": { "personaje": "Vittata", "es": "¡Wepa, frutitas! ¿Y de dónde saca la palma su energía?", "en": "Woo, little fruits! And where does the palm get its energy?" },
        "interaccion": {
          "tipo": "ordenar_tarjetas",
          "grados_3_4": ["sol", "palma_sierra", "cotorra"],
          "grados_5_6": ["sol", "palma_sierra", "cotorra", "frutos_caidos", "hongos"],
          "etiquetas": {
            "sol": { "es": "Sol", "en": "Sun" },
            "palma_sierra": { "es": "Palma de sierra (productor)", "en": "Sierra palm (producer)" },
            "cotorra": { "es": "Cotorra (consumidor)", "en": "Parrot (consumer)" },
            "frutos_caidos": { "es": "Frutos y hojas que caen", "en": "Fallen fruit and leaves" },
            "hongos": { "es": "Hongos (descomponedores)", "en": "Fungi (decomposers)" }
          },
          "retro_correcta": { "es": "La energía empezó en el Sol. La palma la guardó en sus frutos.", "en": "The energy started in the Sun. The palm stored it in its fruit." },
          "retro_incorrecta": { "es": "Pista: ¿quién no come a nadie y usa la luz?", "en": "Hint: who eats no one and uses light?" }
        },
        "requiere_validacion": "Que la cotorra coma frutos de palma de sierra está verificado (ficha cotorra_alimento, USFWS, 2026-11-07). Si la ficha vuelve a por_verificar, usar 'frutos del bosque'.",
        "corto": { "es": "Ordena: ¿quién come a quién?", "en": "Order it: who eats whom?" },
        "diario": ["palma_sierra", "cotorra_alimento"],
        "objetivos": ["O2"],
        "criterio_exito": "Cadena correcta (máximo 2 intentos; al tercero se muestra resuelta)."
      },
      {
        "id": "p4",
        "nombre": "Ojos de cotorra",
        "habilidad": "volar",
        "lugar": "Sobre el dosel, encima de ambos terrenos",
        "instruccion": { "es": "Vuela sobre los dos terrenos y míralos desde arriba.", "en": "Fly over both building sites and look at them from above." },
        "interaccion": {
          "tipo": "observar_y_elegir",
          "pregunta": { "es": "¿Qué terreno está más bajo y cerca del agua?", "en": "Which site is lower and closer to the water?" },
          "opciones": [{ "es": "El del río (A)", "en": "The river site (A)" }, { "es": "La colina (B)", "en": "The hill (B)" }],
          "correcta": 0
        },
        "programador": "Llama a openParcelCard para A y B: mantiene S.evaluated como hacía el último anillo.",
        "corto": { "es": "Mira los terrenos desde arriba.", "en": "Look at the sites from above." },
        "diario": ["bosque_tipos"],
        "objetivos": ["O1", "O6"],
        "criterio_exito": "Ambos terrenos evaluados."
      },
      {
        "id": "p5",
        "nombre": "Nace la gota",
        "habilidad": "volar",
        "lugar": "De la poza (POOL) a la cumbre con nubes (bosque enano)",
        "instruccion": { "es": "El Sol calienta la poza. Sigue el vapor que sube hasta la nube de la montaña.", "en": "The Sun warms the pool. Follow the rising vapor up to the mountain cloud." },
        "procesos": ["evaporacion", "condensacion"],
        "interaccion": {
          "tipo": "prediccion",
          "guarda": "prediccion_nube",
          "pregunta": { "es": "El vapor sube y allá arriba hace más frío. ¿Qué va a pasar?", "en": "The vapor rises and it is colder up there. What will happen?" },
          "opciones": [{ "es": "Se forma una nube y llueve.", "en": "A cloud forms and it rains." }, { "es": "El vapor desaparece.", "en": "The vapor disappears." }, { "es": "Se vuelve piedra.", "en": "It turns into stone." }],
          "correcta": 0,
          "retro": "Se comprueba en p6 cuando cae la gota."
        },
        "corto": { "es": "Sigue el vapor hasta la nube.", "en": "Follow the vapor to the cloud." },
        "diario": ["ciclo_agua", "lluvia_bosque_enano"],
        "objetivos": ["O3"],
        "criterio_exito": "El jugador entra en la nube y nace la gota."
      },
      {
        "id": "p6",
        "nombre": "Sigue la gota",
        "habilidad": "volar",
        "lugar": "Cumbre → dosel → colina (B) y quebrada → río (A)",
        "instruccion": { "es": "¡Llueve! Acompaña a la gota. ¿A dónde va el agua?", "en": "It's raining! Stay with the raindrop. Where does the water go?" },
        "procesos": ["precipitacion", "infiltracion", "escorrentia"],
        "secuencia": [
          "La gota cae en una bromelia del dosel y una parte se queda allí.",
          "En la colina, el agua se mete en el suelo entre las raíces (infiltración).",
          "Lo demás corre cuesta abajo por la quebrada hasta el río, que sube junto al terreno A (escorrentía)."
        ],
        "interaccion": {
          "tipo": "observar_y_elegir",
          "pregunta": { "es": "¿Dónde se juntó más agua?", "en": "Where did more water collect?" },
          "opciones": [{ "es": "En el río, abajo", "en": "In the river, down low" }, { "es": "En la colina, arriba", "en": "On the hill, up high" }],
          "correcta": 0
        },
        "corto": { "es": "Acompaña a la gota.", "en": "Follow the raindrop." },
        "diario": ["bromelia"],
        "objetivos": ["O3", "O6"],
        "criterio_exito": "La gota llega al río con el jugador cerca."
      },
      {
        "id": "p7",
        "nombre": "La poza",
        "habilidad": "nadar",
        "lugar": "POOL (x 30, z -18)",
        "instruccion": { "es": "Bucea en la poza. Encuentra la gota y la marca de la crecida en la roca.", "en": "Dive into the pool. Find the raindrop and the flood mark on the rock." },
        "interaccion": {
          "tipo": "bucear_y_observar",
          "objetivos_bajo_agua": ["gota", "marca_crecida_roca"],
          "al_terminar": "La gota brilla, sube como vapor y el ciclo se cierra (vuelve a p5)."
        },
        "linea": { "personaje": "Vittata", "es": "¡La gota dio la vuelta completa! Sale de la poza y vuelve a la nube.", "en": "The raindrop went all the way around! It leaves the pool and goes back to the cloud." },
        "corto": { "es": "Bucea y encuentra la gota.", "en": "Dive and find the raindrop." },
        "nota": "El dajao (FIELD) puede aparecer aquí; su ficha sigue pendiente de validar (GDD §4).",
        "objetivos": ["O3"],
        "criterio_exito": "Gota y marca encontradas."
      },
      {
        "id": "p8",
        "nombre": "Explícale a Iguaca",
        "habilidad": "hablar",
        "lugar": "marcas_agua",
        "disparador": "interact:marcas_agua (segunda visita)",
        "interaccion": {
          "tipo": "explicar_en_orden",
          "instruccion": { "es": "Cuéntale a Iguaca el viaje de la gota. Elige la frase que sigue.", "en": "Tell Iguaca about the raindrop's trip. Choose the next sentence." },
          "frases": [
            { "es": "El Sol calentó el agua y subió como vapor.", "en": "The Sun warmed the water and it rose as vapor." },
            { "es": "Arriba, en el frío, el vapor formó una nube.", "en": "Up in the cold, the vapor formed a cloud." },
            { "es": "La nube dejó caer lluvia en la montaña.", "en": "The cloud dropped rain on the mountain." },
            { "es": "El agua corrió cuesta abajo hasta el río.", "en": "The water ran downhill into the river." },
            { "es": "El río creció y llenó la poza.", "en": "The river rose and filled the pool." }
          ],
          "correcta": [0, 1, 2, 3, 4],
          "contraste_prediccion": {
            "si_acerto": { "personaje": "Iguaca", "es": "¡Lo predijiste! Y ahora tienes la evidencia.", "en": "You predicted it! And now you have the evidence." },
            "si_no": { "personaje": "Iguaca", "es": "Pensaste otra cosa, y está bien. La gota nos dio la evidencia. Así trabajan los científicos.", "en": "You thought something else, and that's okay. The raindrop gave us the evidence. That's how scientists work." }
          }
        },
        "cierre": { "personaje": "Iguaca", "es": "Si llueve fuerte en la montaña, el río crece aquí abajo. Entonces… ¿dónde construimos?", "en": "If it rains hard on the mountain, the river rises down here. So… where do we build?" },
        "siguiente": "Paso existente 'Elige un terreno y construye el refugio' (LandSelected). La elección sigue libre.",
        "corto": { "es": "Explica el ciclo a Iguaca.", "en": "Explain the cycle to Iguaca." },
        "objetivos": ["O3", "O6"],
        "criterio_exito": "5 frases en orden (con pista tras 2 fallos)."
      }
    ],
    "nativas_o_introducidas": {
      "descripcion": "Hallazgos opcionales fuera de la misión que abren la pregunta q7.",
      "flamboyan": "Plaza de Villa Raíz",
      "bambu": "Orilla del río junto al terreno A"
    }
  },

  "diario": [
    { "id": "cotorra_estatus", "titulo": { "es": "Cotorra puertorriqueña", "en": "Puerto Rican Parrot" }, "dato": { "es": "Es el único loro nativo de Estados Unidos y está protegida como especie en peligro desde 1967.", "en": "It is the only native parrot in the United States and has been protected as an endangered species since 1967." }, "corto": { "es": "Único loro nativo de EE. UU.", "en": "Only native U.S. parrot." }, "fuente": "USFWS", "fuente_url": "https://www.fws.gov/sites/default/files/documents/2026-02/20240402_puerto-rican-parrot-inter-agency-program-english.pdf", "grado": "3-6", "verificacion": "verificado", "paso": "inicio" },
    { "id": "cotorra_1975", "titulo": { "es": "Solo 13", "en": "Only 13" }, "dato": { "es": "A mediados de los años 70 llegaron a quedar solo 13 cotorras silvestres.", "en": "By the mid-1970s, only 13 wild parrots were left." }, "corto": { "es": "Años 70: quedaban 13.", "en": "1970s: 13 left." }, "fuente": "USFWS (historia de 2001 y comunicado de 1975)", "fuente_url": "https://www.fws.gov/story/2001-07/nine-ten-captive-bred-puerto-rican-parrots-released-caribbean-national-forest-still", "grado": "3-6", "verificacion": "verificado", "nota_verificacion": "Fuentes oficiales abiertas el 2026-11-07. USFWS, historia de 2001 (https://www.fws.gov/story/2001-07/nine-ten-captive-bred-puerto-rican-parrots-released-caribbean-national-forest-still): «only 24 individuals remained in the wild and, by 1975, the population had reached an alarming low of only 13 birds». USFWS, comunicado de 22-sep-1975 (https://www.fws.gov/sites/default/files/documents/historic-news-releases/1975/19750922A.PDF): «Last year, a research team led by Dr. Snyder counted only 13 birds, an all time low». USDA FS, El Yunque National Forest Atlas (2018), p. 40: «Only an estimated 13 individuals were living in the wild by 1976». Como no coinciden en el año, el texto dice «a mediados de los años 70», la alternativa propuesta que encaja con las tres. Ajuste de texto de docs/equipo/K4_FUENTES.md, aplicado por delegación de Kelvin (7-nov).", "paso": "p8" },
    { "id": "cotorra_nidos", "titulo": { "es": "Nidos en huecos", "en": "Nests in holes" }, "dato": { "es": "La cotorra anida en huecos de los árboles. En El Yunque también usa huecos artificiales que ponen los biólogos.", "en": "The parrot nests in tree holes. In El Yunque it also uses artificial cavities set up by biologists." }, "corto": { "es": "Anida en huecos de árboles.", "en": "Nests in tree holes." }, "fuente": "USFWS", "fuente_url": "https://www.fws.gov/sites/default/files/documents/2026-02/20240402_puerto-rican-parrot-inter-agency-program-english.pdf", "grado": "3-6", "verificacion": "verificado", "paso": "construir refugio" },
    { "id": "cotorra_maria", "titulo": { "es": "Después de María", "en": "After María" }, "dato": { "es": "El huracán María (2017) acabó con todas las cotorras silvestres de El Yunque, y Río Abajo perdió el 40 %. En 2020 volvieron a liberarse cotorras criadas en aviarios.", "en": "Hurricane María (2017) wiped out all the wild parrots in El Yunque, and Río Abajo lost 40%. In 2020, aviary-raised parrots were released again." }, "corto": { "es": "María 2017: El Yunque perdió sus cotorras.", "en": "María 2017: El Yunque lost its parrots." }, "fuente": "USFWS", "fuente_url": "https://www.fws.gov/sites/default/files/documents/2026-02/20240402_puerto-rican-parrot-inter-agency-program-english.pdf", "grado": "3-6", "verificacion": "verificado", "paso": "crecida" },
    { "id": "cotorra_hoy", "titulo": { "es": "Tres bosques", "en": "Three forests" }, "dato": { "es": "Hoy hay más de 900 cotorras entre silvestres y de aviario, en El Yunque, Río Abajo y Maricao. Tenerlas en tres lugares las protege de enfermedades y desastres. Siguen en peligro.", "en": "Today there are more than 900 parrots, wild and in aviaries, in El Yunque, Río Abajo and Maricao. Keeping them in three places protects them from disease and disasters. They are still endangered." }, "corto": { "es": "Más de 900, en 3 bosques.", "en": "900+, in 3 forests." }, "fuente": "USFWS (feb. 2026)", "fuente_url": "https://www.fws.gov/sites/default/files/documents/2026-02/20240402_puerto-rican-parrot-inter-agency-program-english.pdf", "grado": "3-6", "verificacion": "verificado", "datos_aula": { "silvestres_rio_abajo": "320-340", "silvestres_el_yunque": "100-105", "silvestres_maricao": "100-105" }, "paso": "mirador" },
    { "id": "aviarios", "titulo": { "es": "Aviarios", "en": "Aviaries" }, "dato": { "es": "USFWS maneja el aviario Iguaca en El Yunque y el DRNA el aviario José L. Vivaldi en Río Abajo. Allí crían cotorras para liberarlas.", "en": "USFWS runs the Iguaca Aviary in El Yunque and the DNER runs the José L. Vivaldi Aviary in Río Abajo. They raise parrots there for release." }, "corto": { "es": "Dos aviarios crían cotorras.", "en": "Two aviaries raise parrots." }, "fuente": "USFWS", "fuente_url": "https://www.fws.gov/sites/default/files/documents/2026-02/20240402_puerto-rican-parrot-inter-agency-program-english.pdf", "grado": "5-6", "verificacion": "verificado", "paso": "mirador" },
    { "id": "zorzal_pardo", "titulo": { "es": "Competencia por el nido", "en": "Competing for nests" }, "dato": { "es": "El zorzal pardo compite con la cotorra por los huecos para anidar.", "en": "The pearly-eyed thrasher competes with the parrot for nesting holes." }, "corto": { "es": "El zorzal pardo le quita nidos.", "en": "Thrashers compete for nests." }, "fuente": "USFWS (comunicado de 1975)", "fuente_url": "https://www.fws.gov/sites/default/files/documents/historic-news-releases/1975/19750922A.PDF", "grado": "5-6", "verificacion": "verificado", "nota_verificacion": "PDF oficial abierto el 2026-11-07 (comunicado del USFWS, 22-sep-1975): «Vicious competition for nest space with the pearly-eyed thrasher…», «they prefer nesting cavities in the same trees used by parrots» y «thrashers merely wish to take over the nest cavity». Ver docs/equipo/K4_FUENTES.md.", "paso": "construir refugio" },
    { "id": "cotorra_alimento", "titulo": { "es": "¿Qué come?", "en": "What does it eat?" }, "dato": { "es": "La cotorra come sobre todo frutos silvestres, en especial los de la palma de sierra. También come flores y brotes tiernos.", "en": "The parrot feeds mainly on wild fruits, especially those of the sierra palm. It also eats flowers and tender shoots." }, "corto": { "es": "Come frutos del bosque.", "en": "Eats forest fruit." }, "fuente": "USFWS (ficha de la especie)", "fuente_url": "https://www.fws.gov/species/puerto-rican-amazon-amazona-vittata", "grado": "3-6", "verificacion": "verificado", "nota_verificacion": "Página oficial abierta el 2026-11-07: «feeds chiefly on wild fruits, particularly the sierra palm (Prestoria montana), but may also consume flowers and tender shoots». El Atlas de El Yunque (USDA FS, 2018) añade: «Palm fruits are part of the basic diet of the Puerto Rican parrot». Ajuste de texto de docs/equipo/K4_FUENTES.md, aplicado por delegación de Kelvin (7-nov).", "paso": "p3" },
    { "id": "capas_bosque", "titulo": { "es": "Capas del bosque", "en": "Forest layers" }, "dato": { "es": "Un bosque tropical lluvioso tiene capas: suelo, sotobosque, dosel y emergentes. Cada capa recibe distinta luz.", "en": "A tropical rainforest has layers: floor, understory, canopy and emergents. Each layer gets different light." }, "corto": { "es": "4 capas, distinta luz.", "en": "4 layers, different light." }, "fuente": "Smithsonian Tropical Research Institute (STRI), Rainforest Layers", "fuente_url": "https://striresearch.si.edu/rainforest/home/rainforest-layers/", "grado": "3-6", "verificacion": "verificado", "nota_verificacion": "Verificado el 2026-11-07 (tercera pasada): STRI nombra «the emergent layer, the canopy, the understory, and the forest floor» y dice del suelo «No more than a fiftieth of light from above penetrates this far down». Modelo general de bosque tropical lluvioso, no específico de El Yunque. Cita leída en el índice del buscador (el proxy de la nube da 403 a si.edu). Ver docs/equipo/K4_FUENTES.md.", "paso": "p2" },
    { "id": "bosque_tipos", "titulo": { "es": "Bosques por altura", "en": "Forests by elevation" }, "dato": { "es": "El Yunque tiene cuatro tipos de bosque según la altura y el terreno: tabonuco, palo colorado, palma de sierra y bosque enano en las cumbres.", "en": "El Yunque has four forest types, depending on elevation and terrain: tabonuco, palo colorado, sierra palm and dwarf forest on the peaks." }, "corto": { "es": "4 bosques según altura y terreno.", "en": "4 forests by elevation and terrain." }, "fuente": "USDA Forest Service (Evaluación del Plan Forestal de El Yunque)", "fuente_url": "https://www.fs.usda.gov/sites/nfs/files/legacy-media/elyunque/Draft%20Assessment%20-%20Assessing%20Eco%20Sustainability_0.pdf", "grado": "4-6", "verificacion": "verificado", "nota_verificacion": "PDF oficial abierto el 2026-11-07 (p. 32): «Four forest types—Tabonuco, Colorado, Dwarf (Elfin), and Palm—are recognized locally»; el de palma «is found on steep slopes and in ravines mainly above 500 meters». Ajuste de texto de docs/equipo/K4_FUENTES.md, aplicado por delegación de Kelvin (7-nov).", "paso": "p4" },
    { "id": "lluvia_bosque_enano", "titulo": { "es": "Donde más llueve", "en": "Where it rains most" }, "dato": { "es": "En las partes más altas del bosque enano caen más de 200 pulgadas de lluvia al año.", "en": "The highest parts of the dwarf forest get more than 200 inches of rain a year." }, "corto": { "es": "Cumbres: más de 200 pulgadas al año.", "en": "Peaks: 200+ inches a year." }, "fuente": "USDA Forest Service (Evaluación del Plan Forestal y Atlas de El Yunque)", "fuente_url": "https://www.fs.usda.gov/sites/nfs/files/legacy-media/elyunque/Draft%20Assessment%20-%20Assessing%20Eco%20Sustainability_0.pdf", "grado": "5-6", "verificacion": "verificado", "nota_verificacion": "PDF oficiales abiertos el 2026-11-07. Evaluación, p. 40: «more than 200 inches (381 centimeters) at the highest elevations of the Cloud (Dwarf) Forest» (381 cm es una errata: 200 pulgadas son 508 cm). Atlas (https://www.fs.usda.gov/sites/nfs/files/legacy-media/elyunque/Atlas%20ENGLISH.pdf), p. 31: «Some areas in the uppermost cloud forest receive more than 5000 mm (200 inches) annually». Ajuste de texto de docs/equipo/K4_FUENTES.md, aplicado por delegación de Kelvin (7-nov).", "paso": "p5" },
    { "id": "tabonuco", "titulo": { "es": "Tabonuco", "en": "Tabonuco" }, "dato": { "es": "El tabonuco da nombre al bosque de las partes más bajas de El Yunque, donde es el árbol dominante.", "en": "The tabonuco gives its name to the forest on El Yunque's lowest slopes, where it is the dominant tree." }, "corto": { "es": "Árbol del bosque bajo.", "en": "Tree of the low forest." }, "fuente": "USDA Forest Service (Evaluación del Plan Forestal de El Yunque)", "fuente_url": "https://www.fs.usda.gov/sites/nfs/files/legacy-media/elyunque/Draft%20Assessment%20-%20Assessing%20Eco%20Sustainability_0.pdf", "grado": "3-6", "verificacion": "verificado", "nota_verificacion": "PDF oficial abierto el 2026-11-07 (p. 32): «The Tabonuco Forest, dominated by the tabonuco tree […] lies between 120 and 600 meters elevation». El Atlas (https://www.fs.usda.gov/sites/nfs/files/legacy-media/elyunque/Atlas%20ENGLISH.pdf, p. 36) da «between 150 m and 700 m»; como no coinciden en el límite, el texto no da cifra. Ajuste de texto de docs/equipo/K4_FUENTES.md, aplicado por delegación de Kelvin (7-nov).", "modelo_3d": "tabonuco", "paso": "p2" },
    { "id": "palma_sierra", "titulo": { "es": "Palma de sierra", "en": "Sierra palm" }, "dato": { "es": "Después de los huracanes Hugo y Georges, la palma de sierra pasó a ser la especie más abundante en un estudio de El Yunque (2005).", "en": "After hurricanes Hugo and Georges, the sierra palm became the most abundant species in an El Yunque study (2005)." }, "corto": { "es": "Se recupera tras huracanes.", "en": "Bounces back after hurricanes." }, "fuente": "USDA Forest Service (Drew et al. 2009, El Verde)", "fuente_url": "https://research.fs.usda.gov/treesearch/35359", "grado": "4-6", "verificacion": "verificado", "modelo_3d": "palma_sierra", "paso": "p3" },
    { "id": "yagrumo", "titulo": { "es": "Yagrumo", "en": "Yagrumo (trumpet tree)" }, "dato": { "es": "El yagrumo es un árbol pionero: después de un huracán crece en abundancia en los claros del bosque.", "en": "The yagrumo is a pioneer tree: after a hurricane it grows abundantly in forest gaps." }, "corto": { "es": "Pionero: llena los claros.", "en": "Pioneer: fills the gaps." }, "fuente": "USDA Forest Service (Drew et al. 2009)", "fuente_url": "https://research.fs.usda.gov/treesearch/35359", "grado": "3-6", "verificacion": "verificado", "modelo_3d": "yagrumo", "paso": "p2" },
    { "id": "helecho_gigante", "titulo": { "es": "Helecho gigante", "en": "Giant tree fern" }, "dato": { "es": "En El Yunque hay más de 150 especies de helechos. Algunos, como el helecho gigante, son tan grandes que parecen árboles.", "en": "El Yunque has more than 150 species of ferns. Some, like the giant tree fern, are so big they look like trees." }, "corto": { "es": "Helecho del tamaño de un árbol.", "en": "A fern as big as a tree." }, "fuente": "USDA Forest Service (El Yunque, animales y plantas)", "fuente_url": "https://www.fs.usda.gov/r08/elyunque/animals-plants", "grado": "3-6", "verificacion": "verificado", "nota_verificacion": "Página oficial abierta el 2026-11-07: «more than 150 species of ferns». Evaluación del Plan Forestal (https://www.fs.usda.gov/sites/nfs/files/legacy-media/elyunque/Draft%20Assessment%20-%20Assessing%20Eco%20Sustainability_0.pdf), p. 20: «abundant stems of the tree fern Cyathea bryophylla». Ajuste de texto de docs/equipo/K4_FUENTES.md, aplicado por delegación de Kelvin (7-nov).", "modelo_3d": "helecho_gigante", "paso": "p2" },
    { "id": "arboles_nativos", "titulo": { "es": "Árboles de aquí", "en": "Trees from here" }, "dato": { "es": "El Yunque tiene 225 especies de árboles nativos; 8 solo crecen en la sierra de Luquillo.", "en": "El Yunque has 225 native tree species; 8 grow only in the Luquillo Mountains." }, "corto": { "es": "225 árboles nativos; 8 únicos.", "en": "225 native trees; 8 unique." }, "fuente": "USDA Forest Service (El Yunque National Forest Atlas, 2018)", "fuente_url": "https://www.fs.usda.gov/sites/nfs/files/legacy-media/elyunque/Atlas%20ENGLISH.pdf", "grado": "5-6", "verificacion": "verificado", "nota_verificacion": "PDF oficial abierto el 2026-11-07 (p. 16-17): «225 native tree species» y «8 are endemic to the Luquillo Mountains». La cifra anterior (240 y 23) no aparece en ninguna fuente oficial que abra. Ajuste de texto de docs/equipo/K4_FUENTES.md, aplicado por delegación de Kelvin (7-nov).", "paso": "mirador" },
    { "id": "bromelia", "titulo": { "es": "Bromelia", "en": "Bromeliad" }, "dato": { "es": "Muchas bromelias crecen sobre los árboles, y algunas forman un tanque que guarda agua.", "en": "Many bromeliads grow on trees, and some form a tank that holds water." }, "corto": { "es": "Algunas guardan agua.", "en": "Some hold water." }, "fuente": "USDA Forest Service (Evaluación del Plan Forestal de El Yunque)", "fuente_url": "https://www.fs.usda.gov/sites/nfs/files/legacy-media/elyunque/Draft%20Assessment%20-%20Assessing%20Eco%20Sustainability_0.pdf", "grado": "3-6", "verificacion": "verificado", "nota_verificacion": "PDF oficial abierto el 2026-11-07 (p. 5, 6 y 22): «epiphytic ferns, bromeliads, orchids»; «aquatic systems in tank bromeliads»; Guzmania berteriana «is found more commonly along canopy tree trunks than on the forest floor». Ajuste de texto de docs/equipo/K4_FUENTES.md, aplicado por delegación de Kelvin (7-nov).", "modelo_3d": "bromelia", "paso": "p6" },
    { "id": "coqui_bromelia", "titulo": { "es": "Coquí sin renacuajo", "en": "Coquí without tadpoles" }, "dato": { "es": "Del huevo del coquí sale un coquí chiquitito, sin etapa de renacuajo. Los huevos quedan en lugares protegidos, como hojas secas enrolladas, y el macho los cuida.", "en": "A tiny coquí hatches from the egg, with no tadpole stage. The eggs are kept in sheltered spots, like curled dead leaves, and the male guards them." }, "corto": { "es": "Sin renacuajo; el macho cuida los huevos.", "en": "No tadpole; the male guards the eggs." }, "fuente": "IUCN GISD; USDA Forest Service (Atlas de El Yunque)", "fuente_url": "https://www.iucngisd.org/gisd/species.php?sc=105", "grado": "4-6", "verificacion": "verificado", "nota_verificacion": "Fuentes abiertas el 2026-11-07. IUCN GISD (sc=105): «the fertilised egg undergoes direct development, rather than passing through a free-living larval (tadpole) stage». Atlas (https://www.fs.usda.gov/sites/nfs/files/legacy-media/elyunque/Atlas%20ENGLISH.pdf), p. 40: «Male frogs nest in protected cavities near the ground, such as dead, curled leaves or rolled palm frond petioles». Las bromelias no aparecen en estas fuentes y salen del texto. Ajuste de texto de docs/equipo/K4_FUENTES.md, aplicado por delegación de Kelvin (7-nov).", "paso": "M3" },
    { "id": "heliconia", "titulo": { "es": "Heliconia", "en": "Heliconia" }, "dato": { "es": "La heliconia tiene flores vistosas con forma de pico. Los colibríes son polinizadores principales de muchas heliconias.", "en": "Heliconia has bright, beak-shaped flowers. Hummingbirds are primary pollinators of many heliconias." }, "corto": { "es": "Flor de colibríes.", "en": "Hummingbird flower." }, "fuente": "Smithsonian Institution, nota de prensa del NMNH sobre Heliconia (2025)", "fuente_url": "https://www.si.edu/newsdesk/releases/nearly-half-popular-tropical-plant-group-related-birds-paradise-and-bananas-are", "grado": "3-6", "verificacion": "verificado", "nota_verificacion": "Verificado el 2026-11-07 (tercera pasada): «bright, beak-shaped flowers»; «bats and hummingbirds, which are the primary pollinators for many Heliconia species». Se quitó «brácteas rojas»: ninguna fuente oficial lo respalda (en Puerto Rico H. caribaea puede ser amarilla). Cita leída en el índice del buscador (el proxy de la nube da 403 a si.edu). Ver docs/equipo/K4_FUENTES.md.", "modelo_3d": "heliconia", "paso": "p2" },
    { "id": "ceiba", "titulo": { "es": "Ceiba", "en": "Ceiba (kapok)" }, "dato": { "es": "La ceiba puede pasar de 50 metros de altura. Su tronco forma grandes contrafuertes, como tablas.", "en": "The ceiba can grow taller than 50 meters. Its trunk forms big buttresses, like boards." }, "corto": { "es": "Árbol gigante con contrafuertes.", "en": "Giant tree with buttresses." }, "fuente": "USDA Forest Service (Chinea-Rivera 1990, SO-ITF-SM-29)", "fuente_url": "https://research.fs.usda.gov/treesearch/30402", "grado": "3-6", "verificacion": "verificado", "nota_verificacion": "PDF oficial abierto el 2026-11-07 (p. 1): «one of the largest and fastest growing trees of tropical America. Ceiba can attain a height of more than 50 m […] the stem develops stout spines and prominent buttresses». La fuente no dice que los contrafuertes la sostengan. Ajuste de texto de docs/equipo/K4_FUENTES.md, aplicado por delegación de Kelvin (7-nov).", "modelo_3d": "ceiba", "paso": "p2" },
    { "id": "flamboyan", "titulo": { "es": "Flamboyán", "en": "Flamboyant tree" }, "dato": { "es": "El flamboyán no es nativo de Puerto Rico: es originario de Madagascar.", "en": "The flamboyant tree is not native to Puerto Rico: it comes from Madagascar." }, "corto": { "es": "Viene de Madagascar.", "en": "From Madagascar." }, "fuente": "USDA Forest Service (manual de semillas)", "fuente_url": "https://www.fs.usda.gov/nsl/Wpsm/Delonix.pdf", "grado": "3-6", "verificacion": "verificado", "modelo_3d": "flamboyan", "paso": "opcional" },
    { "id": "bambu", "titulo": { "es": "Bambú", "en": "Bamboo" }, "dato": { "es": "El bambú común (Bambusa vulgaris) es una planta introducida en Puerto Rico.", "en": "Common bamboo (Bambusa vulgaris) is an introduced plant in Puerto Rico." }, "corto": { "es": "Planta traída de fuera.", "en": "Brought from elsewhere." }, "fuente": "USDA Forest Service (Francis 1993, SO-ITF-SM-65)", "fuente_url": "https://research.fs.usda.gov/treesearch/30351", "grado": "4-6", "verificacion": "verificado", "nota_verificacion": "PDF oficial abierto el 2026-11-07 (https://research.fs.usda.gov/download/treesearch/30351.pdf, p. 1): «known as common bamboo or bambú (Spanish)» y «It was introduced to Puerto Rico at least 150 years ago». Sigue pendiente (arte, no dato): confirmar con el artista que el modelo es Bambusa vulgaris.", "modelo_3d": "bambu", "paso": "opcional" },
    { "id": "ciclo_agua", "titulo": { "es": "Ciclo del agua", "en": "Water cycle" }, "dato": { "es": "El Sol evapora el agua; el vapor se enfría y forma nubes; llueve; el agua se mete en el suelo o corre a los ríos y al mar.", "en": "The Sun evaporates water; vapor cools into clouds; it rains; water soaks into soil or runs to rivers and the sea." }, "corto": { "es": "Sube, se enfría, cae, corre.", "en": "Rises, cools, falls, flows." }, "fuente": "USGS Water Science School", "fuente_url": "https://www.usgs.gov/special-topics/water-science-school/science/water-cycle", "grado": "3-6", "verificacion": "verificado", "nota_verificacion": "URL abierta el 2026-11-07 (K4-15): «The sun’s energy causes liquid water to evaporate into water vapor»; «Clouds are formed by water condensing in the atmosphere… we experience precipitation»; «Water moves into the ground through infiltration… across the surface through snowmelt, runoff, and streamflow… into rivers, the ocean». Ver docs/equipo/K4_FUENTES.md.", "paso": "p5" }
  ],

  "preguntas": [
    {
      "id": "q1", "tipo": "ordenar", "objetivo": "O3", "grado": "3-6",
      "enunciado": { "es": "Ordena el viaje de la gota.", "en": "Put the raindrop's trip in order." },
      "opciones": [
        { "es": "Llueve en la montaña (precipitación)", "en": "It rains on the mountain (precipitation)" },
        { "es": "El Sol calienta el agua y sube vapor (evaporación)", "en": "The Sun warms water and vapor rises (evaporation)" },
        { "es": "El agua corre al río (escorrentía)", "en": "Water runs to the river (runoff)" },
        { "es": "El vapor se enfría y forma una nube (condensación)", "en": "Vapor cools and forms a cloud (condensation)" },
        { "es": "El agua se junta en la poza (acumulación)", "en": "Water collects in the pool (collection)" }
      ],
      "correcta": [1, 3, 0, 2, 4],
      "retro": {
        "correcta": { "es": "¡Exacto! Y el ciclo vuelve a empezar.", "en": "Exactly! And the cycle starts again." },
        "incorrecta": { "es": "Pista: primero el Sol calienta el agua.", "en": "Hint: first, the Sun warms the water." }
      },
      "verificacion": "parcial (concepto general)"
    },
    {
      "id": "q2", "tipo": "opcion_multiple", "objetivo": "O3", "grado": "3-6",
      "enunciado": { "es": "No llovió en el valle, pero el río creció. ¿Por qué?", "en": "It didn't rain in the valley, but the river rose. Why?" },
      "opciones": [
        { "es": "Llovió mucho en la montaña y el agua bajó.", "en": "It rained a lot on the mountain and the water came down." },
        { "es": "El mar empujó el agua río arriba.", "en": "The sea pushed water upriver." },
        { "es": "Los peces movieron el agua.", "en": "The fish moved the water." }
      ],
      "correcta": 0,
      "retro": {
        "correcta": { "es": "Sí. Lo que llueve arriba, baja por el río.", "en": "Yes. What rains up high flows down the river." },
        "incorrecta": { "es": "Recuerda a la gota: ¿dónde cayó y hacia dónde corrió?", "en": "Remember the raindrop: where did it fall and where did it run?" }
      },
      "verificacion": "parcial (concepto general)"
    },
    {
      "id": "q3", "tipo": "emparejar", "objetivo": "O1", "grado": "3-6",
      "enunciado": { "es": "Une cada capa con lo que viste allí.", "en": "Match each layer with what you saw there." },
      "opciones": {
        "izquierda": [{ "es": "Suelo", "en": "Floor" }, { "es": "Sotobosque", "en": "Understory" }, { "es": "Dosel", "en": "Canopy" }, { "es": "Emergente", "en": "Emergent" }],
        "derecha": [{ "es": "Bromelias sobre ramas", "en": "Bromeliads on branches" }, { "es": "Hongos y hojarasca", "en": "Fungi and leaf litter" }, { "es": "La ceiba, la más alta", "en": "The ceiba, the tallest" }, { "es": "Helecho gigante", "en": "Giant tree fern" }]
      },
      "correcta": [[0, 1], [1, 3], [2, 0], [3, 2]],
      "retro": {
        "correcta": { "es": "¡Buen ojo de cotorra!", "en": "Great parrot eyes!" },
        "incorrecta": { "es": "Pista: abajo hay poca luz y muchas hojas caídas.", "en": "Hint: down low there's little light and lots of fallen leaves." }
      },
      "verificacion": "por_verificar (depende de capas_bosque)"
    },
    {
      "id": "q4", "tipo": "opcion_multiple", "objetivo": "O2", "grado": "3-6",
      "enunciado": { "es": "Completa la cadena: Sol → palma de sierra → ___", "en": "Complete the chain: Sun → sierra palm → ___" },
      "opciones": [{ "es": "Cotorra", "en": "Parrot" }, { "es": "Piedra", "en": "Rock" }, { "es": "Nube", "en": "Cloud" }],
      "correcta": 0,
      "retro": {
        "correcta": { "es": "Sí: la energía del Sol pasa a la palma y luego a la cotorra.", "en": "Yes: the Sun's energy goes to the palm and then to the parrot." },
        "incorrecta": { "es": "Pista: ¿quién está vivo y come frutos?", "en": "Hint: which one is alive and eats fruit?" }
      },
      "requiere_validacion": "cotorra_alimento",
      "verificacion": "verificado (USFWS, ficha cotorra_alimento)"
    },
    {
      "id": "q5", "tipo": "opcion_multiple", "objetivo": "O4", "grado": "3-6",
      "enunciado": { "es": "Un huracán tumbó árboles y abrió un claro. ¿Qué árbol crece rápido allí?", "en": "A hurricane knocked down trees and opened a gap. Which tree grows fast there?" },
      "opciones": [{ "es": "Yagrumo", "en": "Yagrumo" }, { "es": "Flamboyán", "en": "Flamboyant tree" }, { "es": "Bambú", "en": "Bamboo" }],
      "correcta": 0,
      "retro": {
        "correcta": { "es": "Sí. El yagrumo es pionero: aprovecha la luz del claro.", "en": "Yes. The yagrumo is a pioneer: it uses the light in the gap." },
        "incorrecta": { "es": "Pista: busca el árbol pionero en tu Diario.", "en": "Hint: look for the pioneer tree in your Journal." }
      },
      "verificacion": "verificado (Drew et al. 2009)"
    },
    {
      "id": "q6", "tipo": "opcion_multiple", "objetivo": "O5", "grado": "3-6",
      "enunciado": { "es": "En 1975 quedaban 13 cotorras. Hoy hay más de 900. ¿Por qué todavía está en peligro?", "en": "In 1975 there were 13 parrots. Today there are more than 900. Why is it still endangered?" },
      "opciones": [
        { "es": "Un solo huracán puede afectar a muchas; por eso las protegen en tres bosques.", "en": "One hurricane can hurt many of them; that's why they are protected in three forests." },
        { "es": "Porque ya no comen.", "en": "Because they don't eat anymore." },
        { "es": "Porque no saben volar.", "en": "Because they can't fly." }
      ],
      "correcta": 0,
      "retro": {
        "correcta": { "es": "Sí. Después de María, El Yunque se quedó sin cotorras silvestres. Por eso hay aviarios y tres poblaciones.", "en": "Yes. After María, El Yunque had no wild parrots left. That's why there are aviaries and three populations." },
        "incorrecta": { "es": "Pista: lee la ficha 'Después de María'.", "en": "Hint: read the 'After María' card." }
      },
      "verificacion": "verificado (USFWS)"
    },
    {
      "id": "q7", "tipo": "opcion_multiple", "objetivo": "O5", "grado": "4-6",
      "enunciado": { "es": "¿Cuál de estas plantas NO es nativa de Puerto Rico?", "en": "Which of these plants is NOT native to Puerto Rico?" },
      "opciones": [{ "es": "Flamboyán", "en": "Flamboyant tree" }, { "es": "Yagrumo", "en": "Yagrumo" }, { "es": "Palma de sierra", "en": "Sierra palm" }],
      "correcta": 0,
      "retro": {
        "correcta": { "es": "Sí. El flamboyán vino de Madagascar.", "en": "Yes. The flamboyant tree came from Madagascar." },
        "incorrecta": { "es": "Pista: uno de estos viajó desde África.", "en": "Hint: one of these traveled from Africa." }
      },
      "verificacion": "parcial (flamboyán verificado; confirmar estatus nativo de yagrumo y palma de sierra)"
    }
  ],
  "formativa": {
    "momento": "Al terminar M2, antes de elegir terreno: 'Iguaca te pregunta'.",
    "duracion_min": 3,
    "seleccion": { "3-4": ["q1", "q2", "q4", "q5", "q6"], "5-6": ["q1", "q2", "q3", "q4", "q5", "q6", "q7"] },
    "reglas": "Retro inmediata. Segundo intento con pista. Al tercero se muestra la respuesta y se explica. Sin puntaje visible ni castigo. Se registra si acertó en el intento 1, 2 o 3."
  },

  "modo_maestro": {
    "acceso": {
      "como": "En el menú de pausa, mantener pulsado 'Docentes' 1,2 segundos y resolver una multiplicación (p. ej. 14 × 7).",
      "nota": "No es contraseña ni cuenta. Solo evita que un niño entre por accidente."
    },
    "guia_45_min": {
      "pregunta_guia": { "es": "¿De dónde viene el agua que hace crecer el río?", "en": "Where does the water that makes the river rise come from?" },
      "materiales": ["1 dispositivo por pareja", "Audífonos (opcional)", "Diario de Campo impreso (1 por estudiante)", "6 tarjetas de vocabulario con imagen"],
      "antes": {
        "minutos": 10,
        "pasos": [
          "2 min: escribe la pregunta guía en la pizarra y muestra una foto de un río crecido.",
          "3 min: cada estudiante escribe o dibuja su predicción en el Diario impreso.",
          "3 min: vocabulario con imágenes: dosel, sotobosque, evaporación, condensación, escorrentía, especie en peligro.",
          "2 min: forma parejas con dos roles: piloto (juega) y científico/a (anota). Cambian de rol en la poza (paso p7)."
        ]
      },
      "durante": {
        "minutos": 25,
        "pasos": [
          "20 min: las parejas juegan M2 'La ruta de la gota'.",
          "Circula con 3 preguntas: ¿Qué capa tiene menos luz y cómo lo sabes? ¿A dónde va el agua que cae en la colina? ¿Cambió tu predicción? ¿Qué evidencia viste?",
          "5 min: evaluación formativa dentro del juego (Iguaca pregunta)."
        ]
      },
      "despues": {
        "minutos": 10,
        "pasos": [
          "5 min: dos parejas dibujan el ciclo en la pizarra con lo que observaron; la clase compara predicción y evidencia.",
          "3 min: boleto de salida: 'Construiría el refugio en ___ porque ___ (evidencia del juego)'.",
          "2 min: descarga el reporte de cada dispositivo (Modo Maestro > Reporte)."
        ]
      },
      "diferenciacion": {
        "3-4": "Cadena de 3 tarjetas, modo sin texto largo y lectura en voz alta activados.",
        "5-6": "Cadena de 5 con descomponedores, preguntas q3 y q7, boleto de salida con dos evidencias.",
        "apoyo_idioma": "Modo bilingüe ES/EN para estudiantes que aprenden español o inglés."
      }
    },
    "actividades_sin_pantalla": [
      {
        "id": "a1", "titulo": "Bosque en cuatro pisos", "grados": "3-6", "minutos": 20, "objetivos": ["O1"],
        "materiales": ["Papel de estraza", "Tarjetas con dibujos de la flora del juego", "Cinta adhesiva"],
        "pasos": ["Divide un mural en 4 franjas: suelo, sotobosque, dosel, emergente.", "Cada estudiante coloca su tarjeta en la capa correcta.", "Explica en una oración cuánta luz recibe esa capa."]
      },
      {
        "id": "a2", "titulo": "Ciclo del agua en una bolsa", "grados": "3-5", "minutos": 15, "seguimiento": "Observar 2 días", "objetivos": ["O3"],
        "materiales": ["Bolsa plástica con cierre", "1/4 de taza de agua", "Marcador permanente", "Cinta adhesiva"],
        "pasos": ["Dibuja en la bolsa un sol, una nube, una montaña y una poza.", "Echa el agua, cierra y pega la bolsa en una ventana soleada.", "Anota en el Diario dónde aparecen gotas y cuándo resbalan."]
      },
      {
        "id": "a3", "titulo": "Red de estambre", "grados": "5-6", "minutos": 20, "objetivos": ["O2", "O6"],
        "materiales": ["Ovillo de estambre", "Tarjetas: Sol, palma de sierra, yagrumo, insecto, coquí, cotorra, hongos"],
        "pasos": ["Cada estudiante es una tarjeta y se pasan el estambre según quién da energía a quién.", "'Llega un huracán': quien es la palma suelta el hilo.", "Comenten quién sintió el tirón y por qué."],
        "nota": "Usar solo relaciones validadas (ver ficha cotorra_alimento)."
      },
      {
        "id": "a4", "titulo": "Nido a prueba de tormenta", "grados": "3-6", "minutos": 30, "objetivos": ["O6", "O5"],
        "materiales": ["Caja de zapatos", "Cartón para hacer una colina", "Bandeja con agua (río)", "Materiales reciclados", "Abanico", "Regadera"],
        "pasos": ["Construye un refugio o nido pequeño con materiales reciclados.", "Decide si va en la colina o junto al río.", "Prueba con viento (abanico) y lluvia (regadera); mejora y vuelve a probar.", "Explica qué cambiaste y por qué."],
        "estandares": ["3-ESS3-1", "4-ESS3-2", "3.CT2.4"]
      },
      {
        "id": "a5", "titulo": "Contamos cotorras", "grados": "4-6", "minutos": 20, "objetivos": ["O5"],
        "materiales": ["Papel cuadriculado", "Datos de USFWS (feb. 2026)"],
        "datos": { "Río Abajo": "320-340", "El Yunque": "100-105", "Maricao": "100-105", "fuente_url": "https://www.fws.gov/sites/default/files/documents/2026-02/20240402_puerto-rican-parrot-inter-agency-program-english.pdf" },
        "pasos": ["Haz una gráfica de barras con las cotorras silvestres de cada bosque.", "Compara con las 13 cotorras silvestres de mediados de los años 70.", "Discute por qué tener tres poblaciones las protege de huracanes y enfermedades."]
      }
    ],
    "rubrica": {
      "escala": { "4": "Excelente", "3": "Competente", "2": "En desarrollo", "1": "Inicio" },
      "criterios": [
        { "id": "R1", "criterio": "Observación y registro", "objetivo": "O1", "evidencia": "Diario (juego e impreso)", "niveles": { "4": "Registra las 4 capas con un organismo y un rasgo observado, y nombra la fuente de una ficha.", "3": "Registra las 4 capas con un organismo cada una.", "2": "Registra 2 o 3 capas.", "1": "Registra 0 o 1 capa, o las confunde." } },
        { "id": "R2", "criterio": "Modelo del ciclo del agua", "objetivo": "O3", "evidencia": "p8, q1, q2, actividad a2", "niveles": { "4": "Ordena los 5 procesos, explica el papel del Sol y de la montaña, y lo usa para explicar la crecida.", "3": "Ordena los 5 procesos y explica la crecida.", "2": "Ordena con 1 o 2 errores.", "1": "Nombra procesos sin orden." } },
        { "id": "R3", "criterio": "Cadena alimentaria", "objetivo": "O2", "evidencia": "p3, q4, actividad a3", "niveles": { "4": "Cadena completa con descomponedor; explica que la energía viene del Sol.", "3": "Cadena completa.", "2": "Un eslabón fuera de lugar.", "1": "No relaciona los organismos." } },
        { "id": "R4", "criterio": "Argumento con evidencia", "objetivo": "O4, O6", "evidencia": "Boleto de salida, contraste de predicción", "niveles": { "4": "Afirmación, dos evidencias del juego y razonamiento; explica si cambió su predicción.", "3": "Afirmación y una evidencia.", "2": "Afirmación sin evidencia.", "1": "Sin afirmación clara." } },
        { "id": "R5", "criterio": "Conservación", "objetivo": "O5", "evidencia": "q6, actividad a5", "niveles": { "4": "Usa datos de población y propone dos acciones viables explicando por qué ayudan.", "3": "Propone dos acciones de conservación.", "2": "Propone una acción.", "1": "No propone acciones." } }
      ]
    },
    "reporte_progreso": {
      "principios": [
        "Sin cuentas, nombres reales, correos, fotos, audio ni ubicación. El reporte no lleva nombres ni identificadores.",
        "Sin texto libre: el niño elige de listas su nombre de aventurero, el título y el texto de su cómic.",
        "El juego no envía datos del estudiante por la red (sin fetch, analítica ni anuncios): el progreso queda solo en el dispositivo. El motor 3D (Three.js) y las fuentes vienen con el juego: no se piden a servidores de terceros.",
        "La lectura en voz alta usa solo voces del dispositivo.",
        "El maestro decide qué hacer con el archivo descargado; el juego no lo envía."
      ],
      "almacenamiento": { "donde": "localStorage del dispositivo", "clave": "amazonaverse.aula.cap1", "separado_de": "partida del juego (SAVE_KEY)", "retencion": "Hasta que el maestro pulse 'Borrar progreso de este dispositivo'." },
      "identificador": "Estación que el maestro elige de una lista (Estación 1 a 40). Nunca el nombre del estudiante.",
      "campos_por_partida": [
        "estacion", "fecha (día, sin hora)", "idioma", "modo_texto_corto", "lectura_voz",
        "pasos_completados (p1 a p8)", "perchas_observadas (0-4)", "cadena_correcta_intento (1-3)",
        "prediccion_registrada (sí/no)", "prediccion_coincidio (sí/no)", "explicacion_ciclo_intento (1-3)",
        "preguntas [{id, intento_correcto 1-3}]", "objetivos_logrados [O1..O6]", "minutos_mision (redondeado)"
      ],
      "prohibido": ["nombre", "fecha de nacimiento", "correo", "IP", "identificador de dispositivo", "texto libre", "audio", "imagen"],
      "formatos": ["csv", "json"],
      "descarga": "Archivo generado en el navegador y ofrecido con la capacidad downloads del artifact; si no está, se copia al portapapeles.",
      "nombre_archivo": "amazonaverse_cap1_{estacion}_{AAAA-MM-DD}.csv",
      "ejemplo_csv": "estacion,fecha,idioma,perchas,cadena_intento,prediccion_coincidio,q1,q2,q3,q4,q5,q6,q7,objetivos\nEstación 4,2026-11-03,es,4,1,no,1,2,1,1,1,1,2,O1|O2|O3|O4|O5|O6",
      "cumplimiento": "COPPA: el juego no recoge información personal de niños. FERPA: el juego no guarda expedientes; si el maestro anota nombres en el archivo, el registro queda bajo control de la escuela. Validar con el abogado de COPPA antes del piloto (ROADMAP §6)."
    },
    "funciones_aula": {
      "texto_corto": "Muestra 'corto' e iconos en lugar de 'dato' e 'instruccion'. El texto largo sigue disponible con el botón Escuchar.",
      "lectura_voz": "Botón Escuchar en cada ficha, paso y pregunta. Usa speechSynthesis del navegador (lang es-PR, luego es-US; en-US) y solo voces del dispositivo (localService = true): si no hay, no se lee. Solo lee texto del juego; nunca datos del estudiante. Velocidad 0.9 por defecto.",
      "idioma": "ES, EN o bilingüe (ES arriba, EN abajo). El maestro fija el predeterminado.",
      "sin_tienda": "Modo escuela: oculta tienda y compras (MODELO_NEGOCIO §4.2).",
      "sin_enlaces_externos": "El niño ve solo la etiqueta de la fuente (p. ej. 'Fuente: USFWS'); las URL aparecen solo en Modo Maestro.",
      "accesibilidad": "Hereda GDD §9: reducir movimiento, subtítulos de sonido, texto grande y modo relajado (perchas grandes, flecha siempre).",
      "pausa_maestro": "Pausa rápida en cada dispositivo (botón grande o tecla P) para hablar con la clase. Sin red, no hay pausa remota."
    }
  }
};
