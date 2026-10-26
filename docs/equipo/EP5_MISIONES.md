# EP. 5 · Misiones y lecciones alineadas

Estado: **PROPUESTA** (tarea AI1). Historia en `EP5_NARRATIVA.md`, sistemas en `EP5_GDD.md`. Formato del motor actual: cada misión es datos de `pack.misiones` (`src/game/misiones.js`) y cada lección sigue el esquema de `content/ep2/lecciones.js` (objetivos, pasos, preguntas, rúbrica, fichas `{es,en}`), en `content/ep5/lecciones.js`.

Público: todas las edades. En el Aula hay **Nivel 1** y **Nivel 2**; el Nivel 2 añade un paso o una pregunta, nunca otra misión.

## 1. Objetivos

Estándares NGSS (códigos públicos en nextgenscience.org). Los indicadores DEPR 2022 equivalentes van **por verificar**: hay que sacarlos del documento oficial (enlace en `docs/equipo/EDUCATIVO.md`), no inventarlos.

| Obj. | El jugador… | Evidencia en el juego | NGSS | DEPR 2022 |
|---|---|---|---|---|
| E1 Patrones | reconstruye un mensaje a partir de fragmentos y patrones (corto-largo, número de destellos) | M1: mensaje ordenado; q1, q2 | 4-PS4-3 | por verificar |
| E2 Evidencia del pasado | distingue lo que se sabe por evidencia (una marca, un relato escrito) de lo que se supone, y lo aplica a las dos especies extintas | M2: recuerdos clasificados en «sé» y «supongo»; q3, q4 | 3-LS4-1 (evidencia de organismos de hace mucho; aquí relatos históricos en vez de fósiles) | por verificar |
| E3 Diseñar para comunicar a distancia | diseña un relevo con luz, sonido o tela, lo prueba, ve dónde se corta y lo mejora | M3: relevo armado → corte → arreglo; q5 | 1-PS4-4, 4-PS4-3, 3-5-ETS1-2 | por verificar |
| E4 Cooperar | explica por qué un relevo necesita a varios y cómo se reparte el trabajo | M3: estaciones atendidas por otros; q6 | 3-5-ETS1-2 (comparar soluciones) | por verificar |

Nivel 2 añade MS-PS4-3 (por qué una señal codificada en pasos, como corto-largo, se recupera mejor que una que se degrada poco a poco) y MS-LS4-1 (huecos del registro del pasado).

## 2. M1 · «Mensajes en pedazos» (hablar, observar) · ~5 min

**Encaje:** desde el cap. 1 el transmisor tiene la antena doblada y la Voz llega cortada. Ahora llegan **dos** voces que se pisan. Reutiliza el transmisor (`TRX`) y la luz de la niebla (`luzMirador.parpadear(n)`).

| Paso | Habilidad | Qué pasa |
|---|---|---|
| t1 Predecir | hablar | Iguaca: «¿Es una voz con eco o son dos?». Elección sin juicio (se compara al final). |
| t2 Sintonizar | observar | Rueda de 5 posiciones. Cada una da un fragmento con subtítulo y onda: «…el pacto…», «…seguimos aquí…», «…la torre que mira al mar…», «…tres y uno…», «…no lo hagas sola…». Cada fragmento es una tarjeta del Diario. |
| t3 Dos ondas | observar | Dos fragmentos tienen la onda de otro color y otro ritmo: el jugador marca cuáles son de la voz A y cuáles de la B. Iguaca: «Son dos». |
| t4 Patrón | observar | La luz de la niebla parpadea en grupos (3 cortos, 1 largo). El jugador lo copia con el botón del transmisor. La luz responde igual: alguien escucha. |
| t5 Ordenar | hablar | Ordena las tarjetas hasta que el mensaje tiene sentido: «Seguimos aquí. Busquen la torre que mira al mar. No lo hagas sola». Un orden equivocado da una frase graciosa; nunca bloquea. |
| t6 (Nivel 2) | hablar | ¿Por qué el patrón de destellos se entiende aunque la señal llegue débil y la voz no? Elige la razón. |

Recompensa: `mano_linterna`. Eventos: `TwoVoicesHeard`, `FragmentsOrdered`.

**Ciencia:** sin datos externos; el jugador trabaja con los patrones que ve y oye. La idea de que una señal en pasos (encendido-apagado) se recupera mejor que una continua se da como lo que el jugador comprueba en el juego, no como cifra.

## 3. M2 · «Lo que recuerdan las piedras» (volar, posarse, observar) · ~5 min

**Encaje:** el mensaje habla de «la torre que mira al mar». El Guardián reconoce las ruinas pero no recuerda por qué. Reutiliza las ruinas ya colocadas en el mapa (`ruina_torre`, `ruina_mirador`, `ruina_pilar`, `ruina_portal`, `ruina_altar`) y el botón Observar de `educativa.js`.

| Paso | Habilidad | Qué pasa |
|---|---|---|
| r1 La memoria con huecos | hablar | El Guardián dice frases con huecos: «Antes éramos treinta y… Las torres hablaban de isla en isla con…». [KELVIN: qué recuerda] |
| r2 Cinco ruinas | volar, posarse | En cada ruina Vittata se posa y observa una marca. Cada marca llena un hueco: un número (36), un dibujo de dos cotorras, un camino de torres, un fuego en lo alto, una mano que pasa algo a otra. [KELVIN: qué dicen las marcas] |
| r3 Sé o supongo | hablar | Cada hallazgo se clasifica en el Diario: **lo sé** (lo veo en la marca) o **lo supongo** (lo deduzco). Ejemplo: «hay dos cotorras dibujadas» (lo sé) / «son las dos voces» (lo supongo). Iguaca no corrige: pregunta «¿cómo lo sabes?». |
| r4 Las dos que faltan | hablar | El Guardián recuerda a dos guardianas o guardianes que ya no están. Ficha de especie: *Amazona martinicana* y *Amazona violacea*, con lo que dicen `especies.js` y sus fuentes (relatos de Du Tertre, 1654, y Labat, 1742; UICN: extintas). Se subraya que **solo se conocen por relatos escritos, sin restos**: lo que sabemos de ellas también es «sé» y «supongo». |
| r5 (Nivel 2) | hablar | ¿Qué evidencia nueva haría falta para pasar un «supongo» a «sé»? Elige entre tres (un hueso, un dibujo de la época, una pluma en un museo). |

Recompensa: `mano_lupa`. Eventos: `RuinsRead`, `GuardianRemembered`.

**Ciencia verificada que se puede usar:** las dos especies están extintas según la UICN y se conocen por descripciones históricas (fuentes ya citadas en `content/comun/especies.js`: BirdLife/UICN 2021 y 2016, Du Tertre 1654, Labat 1742). **Por verificar:** fechas y causas de su extinción (`especies.js` dice «hacia 1779», sin cita propia); hasta tener fuente, el juego no da causa ni fecha y solo dice «ya no existen».

## 4. M3 · «El relevo» (volar, agarrar, posarse, hablar) · ~6 min

**Encaje:** la señal no llega a la niebla desde el taller: está lejos y hay lomas en medio. Las marcas mostraban «un camino de torres». Vittata quiere subir sola a todas. Reutiliza `agarre.js`, las ruinas como alturas, el mirador del cap. 1 y la antena del transmisor.

| Paso | Qué pasa |
|---|---|
| c1 Enderezar la antena | Vittata endereza la antena doblada del cap. 1 (gesto de agarrar). Mejora un poco: ahora se oye la mitad. |
| c2 Elegir código | Luz (espejo o fuego), sonido (tambor o silbido) o tela (banderas). Cada uno muestra su ventaja y su costo (`EP5_GDD.md` §5). Ninguno es el mejor. |
| c3 Poner estaciones | Lleva las piezas a 3 de 5 alturas marcadas (2 ruinas, el mirador y dos lomas). Entre dos estaciones se dibuja la línea de vista (o el alcance del sonido): si choca con el terreno, se ve dónde. |
| c4 Prueba 1 | Envía el patrón de M1. Siempre se corta en **un** sitio: la estación sin línea de vista o, si todo está bien puesto, la que no tiene a nadie. Vittata no puede estar en tres sitios. |
| c5 Pedir ayuda | Diálogo: Vittata pide a otros que atiendan las estaciones [KELVIN: quiénes]. Si el jugador elige «lo hago yo», Iguaca le recuerda el último fragmento: «No lo hagas sola». Sin castigo, vuelve a la elección. |
| c6 Prueba 2 | El patrón pasa de estación en estación hasta la niebla. Las dos voces responden enteras (revelación, `EP5_NARRATIVA.md`). Nivel 2: el jugador explica en una frase elegida por qué falló la prueba 1. |

Recompensa: `mano_bandera` (bandera de PR fiel). Eventos: `CodeChosen`, `RelayBuilt`, `HelpAsked`, `VoicesRevealed`, `Chapter5Completed`.

**Ciencia, por verificar antes de usarla como ficha:** que la luz viaja en línea recta y la tapan las lomas, y que el sonido rodea obstáculos pero pierde fuerza con la distancia (fuente propuesta: NGSS 1-PS4 y 4-PS4, materiales de NASA o NOAA sobre ondas); relevos históricos de señales con fuego, tambores o banderas (fuente propuesta: Smithsonian o Library of Congress). Mientras no haya cita, el juego describe solo lo que el jugador ve (la línea choca, el sonido no llega).

## 5. «Iguaca te pregunta» (formativa, ~3 min, sin puntaje visible)
| Ítem | Objetivo | Pregunta |
|---|---|---|
| q1 | E1 | ¿Cuántas voces había en el transmisor? (lo que oyó y vio en M1) |
| q2 | E1 | Tres cortos y uno largo: ¿cuál es el patrón? (4 opciones dibujadas) |
| q3 | E2 | «Hay dos cotorras dibujadas en la piedra»: ¿lo sabes o lo supones? |
| q4 | E2 | ¿Cómo sabemos que existieron las cotorras de Martinica y Guadalupe? (por relatos escritos de hace siglos; cita de `especies.js`) |
| q5 | E3 | La luz no pasó de la loma. ¿Qué cambias? |
| q6 | E4 | ¿Por qué un relevo necesita a varios? |

Pista en el segundo intento y respuesta en el tercero, como en los eps. 1 y 2. Momento: opcional, al hablar con Iguaca después del final («Sí, pregúntame» / «Ahora no»); el final no se bloquea. Ninguna pregunta afirma un dato por verificar.

## 6. Modo Maestro (misma puerta y esquema que los eps. 1 y 2)
- **Guía de 45 min:** antes (10) predicción y vocabulario *patrón, señal, evidencia, relevo*; durante (25) misión en parejas; después (10) boleto de salida: «Sé que ___ porque vi ___; supongo que ___».
- **Sin pantalla:**
  - b1, teléfono de patrones: en fila, cada estudiante pasa un patrón de palmadas; comparar con pasar una frase al oído;
  - b2, sé o supongo: tarjetas con frases sobre una foto y la clase las separa;
  - b3, relevo de luz: linternas o espejos de mano entre mesas, con un libro como «loma» que tapa la línea.
- **Rúbrica** (4 niveles): patrones, evidencia frente a suposición, diseño y prueba del relevo, cooperación, cuidado al hablar de especies extintas.
- **Reporte:** mismo CSV/JSON local, clave `amazonaverse.aula.ep5`. Campos: misiones, fragmentos, orden, recuerdos, clasificación sé/supongo, código, estaciones, qué falló, ayuda pedida, preguntas q1–q6 (intento), objetivos E1–E4 y minutos. Sin nombre, sin datos personales y sin red.

## 7. Diario y criadero
- **Diario:** 6 hallazgos nuevos (3 de señales: espejo, tambor, banderas; 3 de memoria: las marcas, las dos especies extintas, el número 36). Los de especies usan las fuentes de `especies.js`; los demás van **por verificar**, con fuente propuesta, y no publican el dato hasta que el Educativo lo verifique. Hito `cuaderno` (6/6) → «Mapa de las torres».
- **Criadero:** `pack.criadero = { desde: 'FragmentsOrdered', almacen: 'amazonaverse' }`, como el ep. 2, para que la cría siga a Vittata. Propuesta de `obtener.ep5 = { mision: 'relevo' }` en una cápsula de `huevos.js` (pedido al dueño del criadero en `PEDIDOS.md` cuando se implemente). Ninguna cápsula se compra.
- **Cuidado (propuesta):** el ep. 5 no da huevos ni crías de las dos especies extintas como premio; se recuerdan, no se coleccionan (los guardianes nunca se capturan ni se venden). [KELVIN: si el criadero, que ya incluye las 2 extintas en su catálogo de especies, debe tratarlas aparte después de la revelación]
