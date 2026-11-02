# EP. 4 · Misiones y lecciones alineadas

Estado: **PROPUESTA** (AH1), ya producida en AH2 (`content/ep4/pack.js`, `lecciones.js`, `en.js`; `ep4Test`). Historia en `EP4_NARRATIVA.md`, sistemas en `EP4_GDD.md`. Mismo formato que el ep. 2: cada misión es datos de `pack.misiones` (`src/game/misiones.js`) y la lección sigue el esquema de `content/ep2/lecciones.js` (objetivos, preguntas, rúbrica, fichas `{es,en}`), en `content/ep4/lecciones.js`.

Público: todas las edades. En el Aula hay **Nivel 1** y **Nivel 2**; el Nivel 2 añade un paso o una pregunta, nunca otra misión.

## 1. Objetivos

Estándares NGSS (códigos públicos en nextgenscience.org). Los indicadores DEPR 2022 equivalentes van **por verificar**: hay que sacarlos del documento oficial (enlace en `EDUCATIVO.md`), no inventarlos.

| Obj. | El jugador… | Evidencia en el juego | NGSS | DEPR 2022 |
|---|---|---|---|---|
| E1 Observar | observa un lugar antes de cambiarlo y describe lo que ya vive y se usa allí | M1: 3 tramos y el bosquecillo; q1, q2 | 3-LS4-3 | por verificar |
| E2 Beneficios y costos | compara varias soluciones por lo que dan y cuestan a cada persona, y reconoce que ninguna lo da todo | M2: 4 tarjetas en la Balanza; q3, q4 | 3-5-ETS1-2 | por verificar |
| E3 Decidir y cuidar | prueba las opciones en un modelo, decide con otros y elige una medida que reduzca un costo | M3: maqueta → asamblea → cuidado; q5 | 3-5-ETS1-3, 3-ESS3-1 | por verificar |
| E4 Hábitat | explica por qué cortar árboles con huecos afecta a la cotorra y nombra una forma de cuidarla | M1: el bosquecillo; q6 | 3-LS4-4 | por verificar |

Nivel 2 añade comparar dos opciones eje por eje y proponer un segundo cuidado (y qué esfuerzo añade).

## 2. M1 · «Lo que hay en la orilla» (volar, posarse, observar) · ~5 min

**Encaje:** Vittata ya redibujó el plano de la Vecina como un puente «en el sitio más corto». Iguaca: antes de dibujar, mira lo que ya hay. Reutiliza las perchas y el río del motor.

| Paso | Habilidad | Qué pasa |
|---|---|---|
| o1 El estrecho | volar | Un poste con cinta marca el tramo. Vittata ve: río corto de cruzar y un bosquecillo con sombra sobre el agua. |
| o2 Río abajo | volar | Orillas altas y río ancho: cabría un puente alto, pero el camino es largo. |
| o3 El remanso | volar | Agua tranquila; aquí ya se cruza remando. |
| o4 El bosquecillo | posarse | Desde la rama cuenta tres huecos de nido y pececitos en la sombra. Iguaca da el único dato real del capítulo (la cotorra anida en huecos; fuente USFWS). |
| o5 Contar | hablar | Vuelve con Iguaca: «ya sabes lo que hay; falta saber a quién le importa». |
| o6 (Nivel 2) | hablar | ¿Qué tramo cambiaría más si se construye allí? Justifica. |

Recompensa: `lentes_binoculares`. Eventos: `ShoreLooked` (×4), `ShoreSurveyed`.

**Ciencia:** solo el dato de los huecos de nido está verificado (USFWS 2026, ya citado en `EDUCATIVO.md`). Lo demás (sombra, raíces, hojas) son fichas del Diario **por verificar**.

## 3. M2 · «Todas las voces» (hablar) · ~5 min

**Encaje:** el error de Vittata (ep. 2) era contar antes de preguntar; aquí es decidir sola «lo mejor para todos». Reutiliza `dialogo.js`.

| Paso | Qué pasa |
|---|---|
| v1 Cuatro voces | La abuela (Conexión: cruzar a pie todo el año), el papá (Bosque: cuidar el bosquecillo), la navegante del ep. 3 (Río: que las canoas pasen) e Iguaca (Esfuerzo: que lo podamos construir). Cada una deja una **tarjeta** con un eje de la Balanza. |
| v2 La Balanza | En la mesa, Iguaca lee las 3 opciones × 4 ejes con hojas (●●●). Por cada tarjeta, el jugador dice qué opción le da más a esa voz; si elige una con menos hojas, pista y otra vez, sin castigo. |
| v3 ¿La mejor para todos? | Si el jugador elige una opción como «la mejor para todos», quien pierde lo dice (el papá, Iguaca o la abuela) y se repite. Avanza con «Ninguna lo da todo» o «Cada opción da algo y cuesta algo». |

Recompensa: `mano_cuaderno`. Eventos: `VoicesHeard`, `TradeoffSeen` (viñeta con la frase elegida).

## 4. M3 · «La maqueta y el acuerdo» (probar, decidir, cuidar, construir) · ~7 min

| Paso | Qué pasa |
|---|---|
| m1 Maqueta | Sobre la mesa, un río de juguete. Cada opción se prueba y se ve qué gana y qué pierde (la abuela de juguete cruza, la canoa cabe o no, el bosquecillo se queda o se va). Hay que probar las tres. |
| m2 Asamblea | El jugador propone una opción. Quien gana lo agradece; quien pierde nombra el costo. |
| m3 Cuidado | Un cuidado por opción elegida (replantar, cajas nido, subir el centro del puente; bancos a la sombra, construir por turnos; turnos de remo y campana). Un cuidado que no ayuda a esa opción da pista y se repite. Mejora una hoja, nunca lo arregla todo. |
| m4 Palabras | Qué decirle a quien pierde. «Es lo mejor para todos» no vale: se repite con pista. |
| m5 Construir | La obra a escala real en el tramo elegido, con el cuidado visible (tocones y yagrumos, cajas nido, puente alto, bancos, muelles y canoa). |
| m6 El cruce | La abuela cruza primero. Final del capítulo. |

Recompensa: `casco_constructor`. Eventos: `ModelTested`, `AgreementMade`, `CareChosen`, `ProjectBuilt`, `Chapter4Completed`.

**Regla del capítulo:** ninguna opción lo maximiza todo, ni con su cuidado puesto; `ep4Test` lo comprueba con todas las parejas opción × cuidado, y juega las tres opciones hasta el final.

## 5. «Iguaca te pregunta» (formativa, ~3 min, sin puntaje visible)
| Ítem | Objetivo | Pregunta |
|---|---|---|
| q1 | E1 | ¿Qué había en la orilla del estrecho? |
| q2 | E1 | ¿Qué viste en el remanso? |
| q3 | E2 | ¿Qué opción le daba más a la abuela? |
| q4 | E2 | ¿Había una opción que lo daba todo a todos? |
| q5 | E3 | ¿Para qué sirve un cuidado como replantar o poner cajas nido? |
| q6 | E4 | ¿Por qué importa no cortar los árboles viejos con huecos? |

Pista en el segundo intento, respuesta en el tercero, como en los eps. 1–3. Momento: opcional, al volver a hablar con Iguaca después del cruce («Sí, pregúntame» / «Ahora no»). Hecho en `content/ep4/lecciones.js` (`preguntas` + `formativa`); ninguna pregunta afirma un dato por verificar (q6 cita USFWS).

## 6. Modo Maestro (misma puerta y esquema que los eps. 1–3)
- **Guía de 45 min:** antes (10) pregunta guía, «qué ganaría y perdería la escuela», vocabulario *beneficio, costo, opción, cuidado*; durante (25) las tres misiones en parejas y la formativa; después (10) tres parejas con opciones distintas cuentan por qué, boleto de salida «Elegimos ___ porque ___; le costó a ___ y lo cuidamos con ___».
- **Sin pantalla:** b1 Mapa de la orilla (E1), b2 La Balanza en la pizarra (E2), b3 Asamblea con un cuidado (E3, E4).
- **Rúbrica** (4 niveles): R1 observar antes de cambiar, R2 beneficios y costos, R3 decidir y cuidar, R4 escuchar a todos, R5 hábitat y conservación.
- **Reporte:** mismo CSV/JSON local, clave `amazonaverse.aula.cap4`, sin datos personales ni red. Campos: misiones, tramos, voces, maqueta, opción, cuidado, preguntas q1–q6 (intento), objetivos E1–E4 y minutos; nunca el nombre. Pestaña «Progreso cap. 4» con `G.aula.pestana`.

Los indicadores DEPR 2022 siguen **por verificar**.

## 7. Diario y criadero
- **Diario «Cuaderno del río»:** 6 hallazgos (`raices`, `sombra`, `hoja_seca` · `soga`, `remo`, `piedras`), con ficha del mismo id en `lecciones.js`, todas **por_verificar** con fuente propuesta (USDA/USFS, DRNA, ICP, Archivo General, Smithsonian) y nota. El texto del mundo describe solo lo que el jugador ve. Hito `cuaderno` (6/6) → «Mapa del río». `[KELVIN]`: si el capítulo nombra un cruce real de Puerto Rico (ficha `soga`) y si la herencia taína (ficha `remo`) entra en el canon.
- **Criadero:** `pack.criadero = { desde: 'ShoreSurveyed', almacen: 'amazonaverse' }`: el mismo del cap. 1, la cría sigue a Vittata y la partida queda aparte (`ep4.save`). Ninguna cápsula se compra. `obtener.ep4` en `content/comun/huevos.js` queda como pedido aparte (propuesta del GDD: la cápsula del bosque, ligada a replantar).
