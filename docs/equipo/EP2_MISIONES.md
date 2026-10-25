# EP. 2 · Misiones y lecciones alineadas

Estado: **PROPUESTA**. Historia en `EP2_NARRATIVA.md`, sistemas en `EP2_GDD.md`. Formato pensado para el motor actual: cada misión es datos de `pack.misiones` (`src/game/misiones.js`) y cada lección sigue el esquema de `content/cap1/lecciones.js` (objetivos, pasos, preguntas, rúbrica, fichas `{es,en}`), en `content/cap2/lecciones.js`.

Público: todas las edades. En el Aula hay **Nivel 1** y **Nivel 2**; el Nivel 2 añade un paso o una pregunta, nunca otra misión.

## 1. Objetivos

Estándares NGSS (códigos públicos en nextgenscience.org). Los indicadores DEPR 2022 equivalentes van **por verificar**: hay que sacarlos del documento oficial (enlace en `EDUCATIVO.md`), no inventarlos.

| Obj. | El jugador… | Evidencia en el juego | NGSS | DEPR 2022 |
|---|---|---|---|---|
| E1 Terreno | compara tres sitios por pendiente, drenaje del suelo y exposición al viento, y elige con evidencia | M1: tabla de 3×3 completa; q1, q2 | 4-ESS2-1, 4-ESS3-2 | por verificar |
| E2 Necesidades | convierte lo que dicen dos usuarios en criterios y restricciones de un diseño | M2: lista de necesidades; q3 | 3-5-ETS1-1 | por verificar |
| E3 Diseño y prueba | compara dos diseños, prueba uno, identifica qué falló y lo mejora | M3: prueba 1 → cambio → prueba 2; q4, q5 | 3-5-ETS1-2, 3-5-ETS1-3, 3-ESS3-1 | por verificar |
| E4 Hábitat | explica por qué perder cavidades de nido afecta a la cotorra y nombra una solución humana | M3: nido del papá; q6 | 3-LS4-3, 3-LS4-4 | por verificar |

Nivel 2 añade MS-ETS1-1 y MS-ETS1-3 (precisar criterios y combinar las mejores partes de varios diseños).

## 2. M1 · «Lee la tierra» (volar, posarse, observar) · ~5 min

**Encaje:** Vittata eligió sitio a ojo; Luma le pide mirarlo como en «La ruta de la gota». Reutiliza las perchas y el botón Observar de `educativa.js`.

| Paso | Habilidad | Qué pasa |
|---|---|---|
| t1 Predecir | hablar | "¿Cuál de los tres sitios aguanta mejor?" Elección sin juicio (se compara al final). |
| t2 Pendiente | volar | Desde el aire, una cinta de lluvia muestra hacia dónde corre el agua en cada sitio. Se marca: plano, suave, empinado. |
| t3 Suelo | agarrar | En cada sitio Vittata echa un cubo de agua (objeto agarrable de `agarre.js`) en un hoyo y mira cuánto tarda en bajar. Rápido, medio, charco. La abuela confirma uno: "Aquí siempre se hizo charco". |
| t4 Viento | posarse | Cintas de tela en postes (reutiliza la tela de B4 si existe): se posa y observa cuánto se mueven. Poco, medio, mucho. |
| t5 Elegir | hablar | Tabla 3×3 en el Diario. Elige sitio y una razón. Cualquier sitio se puede elegir; la M3 mostrará su consecuencia, con salida (como el río del ep. 1). |
| t6 (Nivel 2) | hablar | ¿Qué característica pesa más para una casa y cuál para un nido? Justifica. |

Recompensa: `lentes_binoculares` (ropero). Evento: `TerrainRead`, `SiteChosen`.

**Ciencia, por verificar antes de publicar:** que la arena drena más rápido que el barro arcilloso (fuente propuesta: USDA NRCS, *Soil Texture* / infiltración) y que la pendiente fuerte aumenta la escorrentía y la erosión (USGS, ciclo del agua). Mientras no haya cita, las fichas no salen y el texto del juego describe solo lo que el jugador ve.

## 3. M2 · «Escuchar primero» (hablar) · ~4 min

**Encaje:** el error de Vittata es enseñar el plano antes de preguntar. Reutiliza `dialogo.js` (escenas con un solo hablante, elecciones que cambian la frase y no el desenlace).

| Paso | Qué pasa |
|---|---|
| n1 El plano | Vittata enseña su plano. La abuela calla, el papá se va. El Guardián: "¿Les preguntaste o les contaste?" |
| n2 Preguntar a la abuela | 3 preguntas a elegir entre 5 (algunas son "cerradas" y la abuela responde corto, sin castigo). Cada respuesta útil se vuelve una tarjeta: *entrada baja*, *sin viento frío*, *cerca del agua, pero no encima*. |
| n3 Preguntar al papá | Igual: *hueco oscuro*, *seco*, *alto*, *que nadie lo moleste*. |
| n4 Ordenar | El jugador separa las tarjetas en **criterios** (lo que debe lograr) y **restricciones** (lo que no se puede: solo materiales del ep. 1 y del banco de trabajo; 3 días). |
| n5 El choque | Dos tarjetas se contradicen (bajo / alto). Elección: "elegir a uno" o "buscar un diseño para los dos". La primera abre una línea del papá que la devuelve, sin castigo; la segunda avanza. |

Recompensa: `mano_cuaderno`. Eventos: `ResidentsMet`, `NeedsListed`, `ListenChoice` (viñeta de cómic con la frase elegida).

## 4. M3 · «Casa que aguanta» (construir, probar, mejorar) · ~6 min

**Encaje:** construcción simple del ep. 1 ampliada con piezas elegibles. La tormenta reutiliza la crecida y las partículas (`fx`) del ep. 1, sin castigo.

| Paso | Qué pasa |
|---|---|
| c1 Dos bocetos | Elige entre dos diseños de dos niveles (planta baja ancha / torre con anexo). Ve cuántos criterios cumple cada uno. |
| c2 Construir | 4 decisiones: base (pilotes o piedra), paredes (tablas o trenzado), techo (una o dos aguas) y anclaje (sí o no). Los materiales salen del inventario del ep. 1. |
| c3 Nido | Arma el hueco del nido para el papá: caja de madera alta, oscura y seca. |
| c4 Prueba 1 | Llega la tormenta. Siempre falla **una** parte, la más débil según las decisiones y el sitio de M1 (ej.: sin anclaje, el techo se levanta; sitio con charco, la base se moja). El juego la marca. |
| c5 Mejorar | Cambia solo esa parte. Nivel 2: además explica por qué en una frase elegida. |
| c6 Prueba 2 | Aguanta. El papá coloca el huevo; la abuela entra. Fiesta de techado. |

Recompensa: `casco_constructor` y `botas_constructor`. Eventos: `HomeBuilt`, `StormTested`, `HomeImproved`, `NestPlaced`, `Chapter2Completed`.

**Ciencia verificada que se puede usar:** la cotorra anida en cavidades naturales y artificiales; hoy hay más de 900 en tres bosques y dos aviarios; María acabó con la población silvestre de El Yunque (USFWS 2026, ya citado en `EDUCATIVO.md` y `content/comun/huevos.js`). **Por verificar:** medidas y orientación de las cajas nido usadas en PR; no se dan medidas hasta tener la cita.

## 5. «Luma te pregunta» (formativa, ~3 min, sin puntaje visible)
| Ítem | Objetivo | Pregunta |
|---|---|---|
| q1 | E1 | ¿Qué sitio se encharca? (imagen de los tres hoyos) |
| q2 | E1 | La lluvia corre más rápido en… (plano / empinado) |
| q3 | E2 | ¿Cuál es un criterio y cuál una restricción? (2 tarjetas) |
| q4 | E3 | El techo se levantó. ¿Qué cambias? |
| q5 | E3 | ¿Por qué probamos dos veces? |
| q6 | E4 | ¿Por qué ayudan las cajas nido a la cotorra? |

Pista en el segundo intento, como en el ep. 1.

## 6. Modo Maestro (misma puerta y esquema que el ep. 1)
- **Guía de 45 min:** antes (10) predicción y vocabulario *criterio, restricción, drenaje, pendiente*; durante (25) misión en parejas; después (10) boleto de salida: "Mi casa aguanta porque ___; si la hiciera otra vez cambiaría ___".
- **Sin pantalla:** prueba de drenaje con tres vasos (arena, tierra, barro) y cronómetro; entrevista en parejas con tarjetas de necesidades; casa de cartón frente a un abanico, prueba y mejora.
- **Rúbrica** (4 niveles): lectura del terreno, criterios y restricciones, ciclo probar-mejorar, argumento con evidencia, hábitat y conservación.
- **Reporte:** mismo CSV/JSON local, clave `amazonaverse.aula.cap2`, sin datos personales ni red.

## 7. Diario y criadero
- **Diario:** 6 hallazgos nuevos (3 de ciencia del terreno, 3 de cultura de la construcción en PR). Todos **por verificar**: no se publican sin fuente; la lista concreta la propone el Educativo con fuentes.
- **Criadero:** las cápsulas existentes se mapean con `obtener.cap2` (`content/comun/huevos.js`): la misión de nido (M3) es buen hito para la cápsula ligada a cavidades. El criadero es del juego (`<almacen>.criadero`), así que la cría del ep. 1 sigue a Vittata. Ninguna cápsula se compra.
