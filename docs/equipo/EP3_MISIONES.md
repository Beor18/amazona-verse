# EP. 3 · Misiones y lecciones alineadas

Estado: **PROPUESTA**. Historia en `EP3_NARRATIVA.md`, sistemas en `EP3_GDD.md`. Formato pensado para el motor actual: cada misión es datos de `pack.misiones` (`src/game/misiones.js`) y cada lección sigue el esquema de `content/ep2/lecciones.js` (objetivos, pasos, preguntas, rúbrica, fichas `{es,en}`), en `content/ep3/lecciones.js`.

Público: todas las edades. En el Aula hay **Nivel 1** y **Nivel 2**; el Nivel 2 añade un paso o una pregunta, nunca otra misión.

## 1. Objetivos

Estándares NGSS (códigos públicos en nextgenscience.org). Los indicadores DEPR 2022 equivalentes van **por verificar**: hay que sacarlos del documento oficial (enlace en `EDUCATIVO.md`), no inventarlos.

| Obj. | El jugador… | Evidencia en el juego | NGSS | DEPR 2022 |
|---|---|---|---|---|
| E1 Materiales | prueba qué materiales flotan y elige el adecuado para un casco con evidencia | M1: tabla de 6 materiales; q1, q2 | 2-PS1-2, 5-PS1-3 | por verificar |
| E2 Equilibrio | explica por qué un bote con la carga a un lado se inclina y lo corrige | M1: botadura 1 → cambio → botadura 2; q3 | 3-PS2-1, 3-5-ETS1-3 | por verificar |
| E3 Señales | diseña y compara códigos para pasar información y los ajusta cuando fallan | M2: código de 3 señales; q4 | 4-PS4-3 | por verificar |
| E4 Leer el agua | usa observaciones del viento, las nubes y la corriente para decidir cuándo y por dónde salir | M2 y M3: postes, semilla en la corriente, ruta; q5, q6 | 3-ESS2-1, 5-ESS2-1 | por verificar |

Nivel 2 añade MS-ETS1-2 (evaluar soluciones de diseño con criterios) y MS-PS4-3 (las señales digitales y codificadas son una forma fiable de pasar información; aquí, con bandera y silbido).

## 2. M1 · «¿Qué flota?» (agarrar, bucear, construir) · ~5 min

**Encaje:** el plano del bote ya está en la mesa de todos (final del ep. 2). Vittata quiere cortar el tronco más grande; el papá pregunta: «¿Y eso flota cargado?». Reutiliza el agarre, el buceo del ep. 1 y la construcción por decisiones del ep. 2.

| Paso | Habilidad | Qué pasa |
|---|---|---|
| t1 Predecir | hablar | «¿Qué flota: la piedra, el tronco, el bambú, la tabla, el coco o el clavo viejo?» Elección sin juicio (se compara al final). |
| t2 Probar | agarrar | Vittata suelta cada material en la poza junto al muelle. Los que flotan se quedan arriba; los que se hunden se recogen buceando. La tabla del Diario se llena sola con lo observado. |
| t3 El bote | construir | 3 decisiones: casco (tronco, bambú atado o tablas), amarre (fibra trenzada del papá o bejuco) y dónde va la carga (al centro o a un lado). Opcional: batanga (más estable, más lenta). Los materiales salen del ep. 2 si hay partida. |
| t4 Botadura 1 | — | La canoa entra al agua en el muelle. Siempre falla **una** parte, la más débil según las decisiones (ej.: carga a un lado, se inclina; bambú con bejuco, se abre una junta; tablas sin sellar, entra agua). El juego la marca. |
| t5 Ajustar | construir | Cambia solo esa parte. Botadura 2: flota derecha. Vittata: «Flota… ¡flota!». |
| t6 (Nivel 2) | hablar | ¿Por qué un clavo se hunde y un bote de madera con clavos flota? Elige la explicación (el bote entero desplaza mucha agua; por verificar el texto exacto). |

Recompensa: `casco_marinero` (ropero). Eventos: `BlueprintShared`, `MaterialsTested`, `BoatBuilt`, `BoatLaunched`.

**Ciencia, por verificar antes de publicar:** que un objeto flota si es menos denso que el agua y que la forma del casco cambia cuánta agua desplaza (fuente propuesta: NOAA Ocean Service y NASA, flotabilidad y principio de Arquímedes); que el coco flota y viaja por el mar (fuente propuesta: Smithsonian). Mientras no haya cita, las fichas no salen y el texto del juego describe solo lo que el jugador ve.

## 3. M2 · «Leer el agua» (hablar, posarse, remar) · ~5 min

**Encaje:** Vittata quiere salir ya. La navegante dice que hoy no y le enseña por qué. El error de Vittata es fiarse de su plano y no del agua. Reutiliza los postes con cintas del ep. 2 y la ruta del río de Retos.

| Paso | Qué pasa |
|---|---|
| n1 Hoy no | La navegante mira el cielo y dice «hoy no». Vittata insiste. El Guardián: «Mija, tú hiciste el bote; ella conoce el agua». |
| n2 Viento y nubes | Vittata se posa en dos postes con cintas (muelle y punta) y mira las nubes desde el mirador. Anota: viento de tierra o de mar, fuerte o suave; nubes altas o bajas y oscuras. |
| n3 La corriente | Suelta una semilla en el río y la sigue volando: hacia dónde va y si va rápido o lento. Se marca en el Diario. |
| n4 Las señales | Hay que entenderse en el agua, con ruido. El jugador asigna una señal (bandera, silbido o gesto) a cada orden: «izquierda», «derecha» y «para». |
| n5 Práctica | Un tramo corto río abajo en la canoa, con la navegante cantando las señales. Llega un chubasco de prueba: la señal que dependa del oído (o de la vista, con niebla) falla una vez; el jugador la cambia. Sin castigo: la canoa no se sale del cauce. |
| n6 El timón | Elección: «Lo llevo yo, que lo hice» o «Llévalo tú, que sabes». Las dos avanzan y cambian el diálogo de M3. Nivel 2: el jugador explica en una frase elegida por qué su código de señales funciona mejor con lluvia. |

Recompensa: `mano_bandera`. Eventos: `NavigatorMet`, `SignalsAgreed`, `HelmChosen` (viñeta con el código elegido).

**Ciencia, por verificar:** brisa de mar de día y brisa de tierra de noche (fuente propuesta: NOAA/NWS, *sea breeze*); las nubes bajas y oscuras que crecen anuncian chubascos (NWS, guía de nubes). El juego enseña lo que el jugador ve en los postes y en el cielo; la explicación sale cuando haya cita.

## 4. M3 · «Más allá de la bahía» (remar, seguir señales, hablar) · ~6 min

**Encaje:** al día siguiente el viento está a favor. La travesía va del muelle a la otra comunidad por una ruta de datos (`EP3_GDD.md` §4) con tres paradas. La lluvia reutiliza `fx` y la tormenta del ep. 2, sin castigo.

| Paso | Qué pasa |
|---|---|
| c1 Salida | Desde el muelle, a la hora que eligió la navegante. Se carga el bote (lo que lleva Villa Raíz para intercambiar). |
| c2 La boca de la bahía | Olas cruzadas: hay que seguir las señales para pasar entre dos rocas. Si Vittata lleva el timón, la navegante canta; si no, Vittata rema al ritmo. |
| c3 La elección de ruta | Aparece un chubasco. Atajo de Vittata (corto, viento de frente: la carga se moja y hay que achicar agua) o ruta de la costa (larga y seca: se llega al atardecer). Las dos siguen. |
| c4 El bajío | La navegante se equivoca de paso una vez y lo dice: «Me equivoqué, atrás». El jugador elige: retroceder con ella o buscar otro paso solo. Los dos funcionan; confiar no es obedecer siempre, es seguir hablando. |
| c5 Llegada | La canoa atraca en la otra comunidad. Al principio desconfían («¿y ustedes quiénes son?»). Vittata, que ya aprendió en el ep. 2, pregunta antes de contar. |
| c6 Intercambio | Villa Raíz da lo que trajo; la otra comunidad enseña algo propio `[KELVIN]`. Gancho al ep. 4. |

Recompensa: `sombrero_pescador` y `mano_mapa`. Eventos: `BayCrossed`, `CommunityReached`, `Chapter3Completed`.

**Ciencia verificada que se puede usar:** la cotorra puertorriqueña vive hoy en tres bosques y dos aviarios (USFWS 2026, ya citado en `EDUCATIVO.md` y `content/comun/huevos.js`): sirve para que la otra comunidad diga que «hay cotorras en otros bosques». **Por verificar:** cualquier dato de corrientes, mareas o distancias reales de Puerto Rico.

## 5. «Iguaca te pregunta» (formativa, ~3 min, sin puntaje visible)
| Ítem | Objetivo | Pregunta |
|---|---|---|
| q1 | E1 | ¿Cuáles flotaron en la poza? (imagen de los 6 materiales) |
| q2 | E1 | ¿Qué material elegirías para un casco ligero? (según lo que viste) |
| q3 | E2 | La canoa se inclinó. ¿Qué cambias? |
| q4 | E3 | Con mucho viento, ¿qué señal se entiende mejor: el silbido o la bandera? |
| q5 | E4 | La semilla bajó rápido por el río. ¿Qué te dice del agua? |
| q6 | E4 | Las nubes están bajas y oscuras. ¿Sales ahora o esperas? |

Pista en el segundo intento y respuesta en el tercero, como en el ep. 1 y el ep. 2. Todas preguntan por lo que el jugador vio en el juego, así que ninguna afirma un dato por verificar. Momento: opcional, al volver a hablar con Iguaca después del intercambio («Sí, pregúntame» / «Ahora no»); el final no se bloquea.

## 6. Modo Maestro (misma puerta y esquema que el ep. 1 y el ep. 2)
- **Guía de 45 min:** antes (10) predicción y vocabulario *flotar, hundirse, equilibrio, señal, corriente*; durante (25) misión en parejas; después (10) boleto de salida: «Mi bote flota porque ___; en el agua confié en ___ porque ___».
- **Sin pantalla:** prueba de flota/se hunde con objetos de la clase y una palangana; barquitos de papel de aluminio cargados con monedas (¿dónde va la carga?); juego de señales en parejas con ruido de fondo (uno guía, el otro camina por un «río» de cinta adhesiva).
- **Rúbrica** (4 niveles): prueba de materiales, equilibrio y mejora, diseño de señales, lectura del tiempo y del agua, colaboración y confianza.
- **Reporte:** mismo CSV/JSON local, clave `amazonaverse.aula.ep3`, sin datos personales ni red. Campos por partida: misiones, materiales probados, casco, qué falló, mejora, código de señales, cuál falló, quién llevó el timón, ruta, paso del bajío, q1–q6 (intento), objetivos E1–E4 y minutos; nunca el nombre.

## 7. Diario y criadero
- **Diario:** 6 hallazgos nuevos, todos **por verificar** con fuente propuesta; lo que el niño lee en el mundo describe solo lo que ve.
  - Ciencia: `flota_hunde` (NOAA/NASA), `brisa_mar` (NOAA/NWS), `semilla_viajera` (el coco que cruza el mar; Smithsonian).
  - Cultura: `canoa_taina` (la palabra «canoa» viene de las Antillas; fuente propuesta: RAE, DLE, y Smithsonian NMAI), `cayuco` (bote de pesca de una pieza; ICP), `nasa` (trampa de pesca tejida; ICP).
  - `[KELVIN]`: si el canon incluye la herencia taína de la canoa (como el bohío del ep. 2).
  - Hito `cuaderno` (6/6): «Carta de la bahía».
- **Criadero:** como el ep. 2, `pack.criadero = { desde: 'BoatLaunched', almacen: 'amazonaverse.criadero' }`: la cría del cap. 1 sigue a Vittata y va en el bote. Propuesta para `PEDIDOS.md`: `obtener.ep3 = { mision: 'bahia' }` en la cápsula ligada al mar de `content/comun/huevos.js` (pedido aparte, no lo toca el pack). Ninguna cápsula se compra.
