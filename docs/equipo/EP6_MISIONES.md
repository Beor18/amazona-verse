# EP. 6 · Misiones y lecciones alineadas

Estado: **PROPUESTA** (tarea AI2). Historia en `EP6_NARRATIVA.md`, sistemas en `EP6_GDD.md`. Formato del motor actual: cada misión es datos de `pack.misiones` (`src/game/misiones.js`) y cada lección sigue el esquema de `content/ep2/lecciones.js` (objetivos, pasos, preguntas, rúbrica, fichas `{es,en}`), en `content/ep6/lecciones.js`.

Público: todas las edades. En el Aula hay **Nivel 1** y **Nivel 2**; el Nivel 2 añade un paso o una pregunta, nunca otra misión.

## 1. Objetivos

Estándares NGSS (códigos públicos en nextgenscience.org) y de matemáticas Common Core (corestandards.org). Los indicadores DEPR 2022 equivalentes van **por verificar**: hay que sacarlos del documento oficial (enlace en `docs/equipo/EDUCATIVO.md`), no inventarlos.

| Obj. | El jugador… | Evidencia en el juego | Estándar | DEPR 2022 |
|---|---|---|---|---|
| F1 Vivir en grupo | explica cómo un grupo ayuda a sus miembros (unos vigilan, otros buscan, otros cargan) | M1: tarjetas completas; q1, q2 | NGSS 3-LS2-1 | por verificar |
| F2 Diseñar con criterios y límites | define qué tiene que lograr el plan y con qué límites (quién puede qué, cuánto dura), lo prueba, ve dónde falla y lo mejora | M2: plan → prueba → atasco → arreglo; q3, q4 | NGSS 3-5-ETS1-1, 3-5-ETS1-3 | por verificar |
| F3 Grupos iguales | reparte 36 en filas iguales y compara formas (6×6, 4×9, 3×12) | M3: forma del círculo; q5 | CCSS 3.OA.A.1, 4.OA.B.4 (pares de factores) | por verificar |
| F4 Escuchar y acordar | resume lo que quiere cada parte y busca lo que comparten antes de proponer | M3: mediación; q6 | Habilidades de relación (marco CASEL, referencia) | por verificar |

Nivel 2 añade MS-ETS1-4 (probar un modelo varias veces para mejorarlo: aquí, la simulación del plan) y la pregunta de por qué 36 tiene más formas de repartirse en filas iguales que 35 (pares de factores; dato matemático, no necesita fuente).

## 2. M1 · «Cada quien con lo suyo» (hablar, observar) · ~5 min

**Encaje:** la cadena de señales del ep. 5 sigue encendida. Al amanecer llegan los primeros visitantes por los muelles y por el aire. No se conocen entre ellos y nadie conoce Villa Raíz. Vittata quiere prepararlo todo ella antes de que lleguen los demás.

| Paso | Habilidad | Qué pasa |
|---|---|---|
| v1 Predecir | hablar | Iguaca: «¿Qué es mejor, que cada uno haga de todo o que cada uno haga lo suyo?». Elección sin juicio (se compara al final). |
| v2 Recibir | hablar | En cada muelle o percha hay un visitante [KELVIN: quiénes; propuesta 6, inspirados en especies vivas]. Al hablar, cuenta qué sabe hacer y qué necesita. Ejemplos de tarjeta: «ve lejos / necesita sombra», «carga fuerte / no vuela alto», «conoce el agua / necesita a alguien que le presente». |
| v3 Tarjetas | observar | Cada visitante deja una tarjeta en el Diario con 2 iconos de «sabe hacer» y 1 de «necesita». Algunas cosas no las dice: hay que observar (quién se queda en la sombra, quién mira al río). |
| v4 Parejas | hablar | El jugador presenta a dos visitantes cuya necesidad cubre el otro («ella ve lejos, tú le das sombra»). Tres parejas posibles; cualquier orden. |
| v5 Ficha | observar | Cada visitante abre su ficha de especie con lo que ya tiene fuente en `especies.js` (nombre común, científico, distribución, estado UICN y fuente). Las 13 de `ESPECIES_DISCREPANCIAS.md` salen sin estado UICN. |
| v6 (Nivel 2) | hablar | ¿Qué gana un grupo en el que cada uno hace algo distinto? Elige entre tres razones y explica con una tarjeta. |

Recompensa: `mano_mapa`. Eventos: `GuestsArrived`, `CardsFilled`.

**Ciencia, por verificar antes de usarla como ficha:** que las cotorras del género *Amazona* viven y se alimentan en bandadas, y que en grupo es más fácil ver a un depredador a tiempo (fuente propuesta: USFWS, programa de recuperación de la cotorra puertorriqueña; DRNA; Cornell Lab, Birds of the World). Mientras no haya cita, el juego no afirma conductas reales de las especies: las habilidades de cada visitante son **del personaje**, no de la especie, y se dice así en la ficha.

## 3. M2 · «Nadie lo levanta solo» (volar, agarrar, posarse) · ~6 min

**Encaje:** para recibir a todos hace falta reparar el puente de madera de la plaza [KELVIN: o levantar la piedra del pacto] antes de que caiga la tarde. Vittata ya tiene el plan en la cabeza… y en él solo aparece ella.

| Paso | Qué pasa |
|---|---|
| o1 Qué hay que lograr | Iguaca escribe en el cuaderno el objetivo y los límites: «el puente aguanta a todos», «nadie hace algo que no puede», «se termina antes de la noche». Son los criterios del plan. |
| o2 Tablero | 5 tareas (cargar tablas, sostener, atar, revisar desde arriba, avisar al río) y 4 ayudantes más Vittata y el aprendiz. Se toca un ayudante y luego una tarea. |
| o3 Prueba 1 | El plan se ve en marcha sobre el mapa. Si Vittata tiene todas las tareas, vuela de un lado a otro y la tabla se queda a medio levantar; si alguien tiene una tarea que no puede, se ve dónde se atasca (icono y frase). Nunca hay castigo ni tiempo límite: el plan se para y espera. |
| o4 Reacomodar | El jugador cambia una o dos asignaciones. Se ve qué cambió en la siguiente prueba. |
| o5 Juntos | Con el plan bueno, la obra se hace de verdad: dos puestos que hay que ocupar a la vez para levantar la tabla grande (un ayudante en cada percha, Vittata en la tercera) y una tabla larga que se carga entre dos (Vittata o el aprendiz en una punta, un ayudante en la otra). |
| o6 (Nivel 2) | Comparar dos planes que funcionan (el rápido y el que enseña): ¿cuál elegirías si mañana hubiera otra obra? No hay respuesta única. |

Recompensa: `mano_cuaderno`. Eventos: `PlanMade`, `PlanStuck` (si pasó), `RaisedTogether`.

**Ciencia:** sin datos externos. Lo que se enseña es el proceso de diseño (criterios, límites, prueba, punto de fallo, mejora) y el jugador lo comprueba en la simulación.

## 4. M3 · «El círculo» (hablar, posarse, observar) · ~5 min

**Encaje:** llegan más visitantes en dos grupos que vienen de islas distintas [KELVIN: cuáles] y no se ponen de acuerdo en algo sencillo (propuesta: si reunirse en la plaza o en el mirador, y cuándo volver a casa). Luego hay que sentar a los 36.

| Paso | Qué pasa |
|---|---|
| m1 Escuchar a uno | Rueda de mediación, paso 1: Vittata escucha al primer grupo y repite con sus palabras lo que quiere y por qué. Si lo repite mal, el grupo lo corrige con calma. |
| m2 Escuchar al otro | Paso 2, igual con el segundo grupo. Vittata quiere proponer ya; Iguaca le hace una seña: «Todavía no». |
| m3 Lo que comparten | Paso 3: elegir qué tienen en común (los dos quieren que nadie se quede fuera). Luego, la propuesta: la de uno, la del otro o una mezcla (`EP6_GDD.md` §5). Nadie se va. |
| m4 Sentar a los 36 | En la plaza hay 36 marcas. El jugador elige una forma (6×6, 4×9, 3×12 o anillo) y ve su ventaja y su costo. Todas suman 36. |
| m5 Encender | Vittata no se sienta primero: va de visitante en visitante invitándolos a su asiento. Cada asiento ocupado se enciende; los de quienes no llegaron quedan con una luz tenue, esperando. [KELVIN: los asientos de las dos voces] |
| m6 (Nivel 2) | ¿Por qué 36 se puede repartir en filas iguales de más formas que 35? Elige entre tres explicaciones. |

Recompensa: `pava` o `mano_maracas` [KELVIN]. Eventos: `GroupsListened`, `CircleFormed`, `PactRenewed`, `Chapter6Completed`.

**Matemáticas (no necesitan fuente):** los pares de factores de 36 son 1×36, 2×18, 3×12, 4×9 y 6×6; los de 35 son solo 1×35 y 5×7.

## 5. «Iguaca te pregunta» (formativa, ~3 min, sin puntaje visible)
| Ítem | Objetivo | Pregunta |
|---|---|---|
| q1 | F1 | ¿Qué tarjeta ayudaba a quién? (unir 2 parejas que hizo en M1) |
| q2 | F1 | ¿Por qué un grupo donde cada uno hace algo distinto puede lograr más? |
| q3 | F2 | El plan se atascó en «atar». ¿Qué cambiarías? (lo que vio en su partida) |
| q4 | F2 | ¿Cuál de estos era un límite del plan y no un objetivo? |
| q5 | F3 | Sientas a los 36 en 4 filas iguales: ¿cuántos van en cada fila? (dibujo) |
| q6 | F4 | Antes de proponer, ¿qué hizo Vittata con cada grupo? |

Pista en el segundo intento y respuesta en el tercero, como en los eps. 1, 2 y 5. Momento: opcional, al hablar con Iguaca después del final («Sí, pregúntame» / «Ahora no»); el final no se bloquea. Ninguna pregunta afirma un dato por verificar.

## 6. Modo Maestro (misma puerta y esquema que los eps. 1, 2 y 5)
- **Guía de 45 min:** antes (10) predicción y vocabulario *grupo, criterio, límite, plan, acuerdo*; durante (25) misión en parejas, turnándose quién arma el plan; después (10) boleto de salida: «En mi grupo yo soy bueno en ___ y necesito ___».
- **Sin pantalla:**
  - b1, tarjetas del grupo: cada estudiante escribe una cosa que sabe hacer y una que necesita; se forman parejas que se cubren;
  - b2, la torre de papel: equipos de 4 con roles fijos (cargar, sostener, revisar, avisar) y un límite (sin cinta); se prueba y se reparte de nuevo;
  - b3, sentar a 36: con 36 fichas, la clase busca todas las formas de filas iguales y las compara con 35.
- **Rúbrica** (4 niveles): explicar la ayuda en grupo, criterios y límites, prueba y mejora del plan, filas iguales, escuchar antes de proponer.
- **Reporte:** mismo CSV/JSON local, clave `amazonaverse.aula.ep6`. Campos: misiones, tarjetas, parejas, planes probados, dónde se atascó, plan final (rápido, enseña, descansa u otro), propuesta de la mediación, forma del círculo, preguntas q1–q6 (intento), objetivos F1–F4 y minutos. Sin nombre, sin datos personales y sin red.

## 7. Diario y criadero
- **Diario:** 6 hallazgos nuevos (las tarjetas de los visitantes cuentan como uno, el plan, la tabla levantada entre dos, el acuerdo, la forma del círculo y los asientos que esperan). Las fichas de especie usan solo las fuentes de `especies.js`; lo de conducta en bandada va **por verificar**, con fuente propuesta, y no se publica hasta que el Educativo lo verifique. Hito `cuaderno` (6/6) → «Mapa de las islas que faltan».
- **Criadero:** `pack.criadero = { desde: 'CardsFilled', almacen: 'amazonaverse' }`, como el ep. 2, para que la cría siga a Vittata y tenga su propio asiento entre el público. Propuesta de `obtener.ep6 = { mision: 'circulo' }` en una cápsula de `huevos.js` (pedido al dueño del criadero en `PEDIDOS.md` cuando se implemente). Ninguna cápsula se compra.
- **Cuidado (propuesta):** los visitantes no dan huevos ni crías de su especie como premio; se conocen, no se coleccionan (los guardianes nunca se capturan ni se venden).
