# NARRATIVA CAP. 1 · El día que el cielo se rompió

Estado: PROPUESTA sobre canon PROVISIONAL (`CHAPTER_01_SCRIPT.md`). Líneas listas en `assets/data/dialogos_cap1.json`.

## Gancho (30 s, antes del control)
Pantalla negra, solo viento. Corte a un taller lleno de luz. Vittata hace despegar su mecanismo: "¡Lo sabía! ¡Solo era ajustar el equilibrio!" Las nubes brillan, todo hace ZZZT, el invento se descontrola y una onda cruza el cielo. Silencio. Vittata despierta entre vigas rotas, y una voz grita: "¡Vittata! ¡Necesitamos ayuda!" Primera decisión del jugador: levantarse.

## Conflicto
La Gran Ruptura dejó el cielo inestable: tormentas y crecidas llegan una tras otra, como un huracán que no termina de irse. Vittata, la inventora de Villa Raíz, quiere salvar su máquina. Iguaca necesita techo hoy. Para las cotorras un árbol partido es un nido perdido: sin hueco donde criar, la especie se debilita. Proteger el hogar es proteger la especie.

**Esperanza:** las cotorras han sobrevivido vientos antes porque se cuidan entre sí. Cada refugio bien puesto es un nido que vuelve.

**Pregunta:** ¿salvar lo que construiste o usar lo que sabes para ayudar?

## Misiones

**1. Lo que queda** (taller, Iguaca, materiales)
- Beat: Vittata examina su máquina y el transmisor; todavía quiere arreglarlo sola. Iguaca insiste. Ella cede: "¿Me ayudas?" Primer paso de su cambio.
- Cierre: recoge madera, piedras y metal. "Lo que otros ven como restos, yo lo veo como posibilidades."

**2. Tierra firme** (dos terrenos, refugio)
- Beat: el río es rápido; la colina, segura. Iguaca lee las marcas de agua; Vittata, impaciente, casi no escucha.
- Si elige el río: la crecida inunda el refugio. Es un error con salida: desarmar y mudarse sin perder materiales.
- Si elige la colina: aguanta la lluvia que llega apenas terminan.
- Cierre: Vittata monta el techo con el engranaje de su máquina rota. Sacrifica lo suyo para cuidar a otros.

**3. La señal** (Guardián, banco, transmisor)
- Beat: un anciano llega al refugio. Perdió muchas obras y no presume. Escucha antes de opinar. Le regala su banco de trabajo.
- Cierre: Vittata repara el transmisor.

## Giro
El transmisor no repite un mensaje viejo: es una voz en vivo. Alguien del pacto de los 36 sigue despierto al otro lado de la niebla y avisa: "…viene otra tormenta…" Además, el Guardián reconoce el símbolo y no lo dice todo: una pieza del emblema es igual a la medalla que guarda. Vittata deja de verlo como un anciano cualquiera.

## Final y cliffhanger al cap. 2
En el mirador, Vittata dibuja un bote. Desde la niebla, una luz parpadea tres veces, como respuesta a la señal. Iguaca pregunta quién es. El Guardián calla. Luego dice: "Antes de buscarlos, hay que tener dónde esperar la tormenta." Cap. 2, Un lugar para todos: hogar permanente antes de la próxima tormenta.

## Voz de cada personaje
- **Vittata:** rápida, segura, con humor. "¡Wepa!", "¡Dale!", "ay, bendito". Pasa de "yo puedo sola" a "ayúdame". Frases cortas, imperativas.
- **Iguaca:** observadora, directa, cálida. Habla en preguntas y detalles: "Mira esas marcas". "Nena", "mi gente". No se rinde.
- **Guardián:** pausado, sabio sin dar sermón. Trata de "mija" o "mijo" a los jóvenes. Habla con refranes boricuas: "Más vale paso firme que carrera ciega". Casi nunca da órdenes: pregunta.
- **La Voz:** entrecortada, urgente, sin nombre. Nunca termina la frase.
- **Narrador:** sencillo, de cuento, esperanzador.

## Reglas de tono
- Sin villano: la Ruptura es una catástrofe, no una venganza.
- Los errores enseñan; nadie se burla.
- Español boricua suave, sin groserías, sin jerga que un niño no entienda.
- Datos reales (cavidades de nido, vientos fuertes) en una frase, nunca en conferencia.

## Para el programador
`disparador`: clave de `EVENT_DEFS` con prefijo `evento:`; el resto usa `inicio:` o `interact:`. Cada escena tiene un solo hablante (`personaje`); los intercambios se encadenan en escenas consecutivas con el mismo disparador, en orden del archivo.
