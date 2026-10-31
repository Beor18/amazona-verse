# Playtest e2e de los 6 capítulos (BM70, 30-oct-2026)

Lanzador oficial (`avtest_solo.py`, Chrome con SwiftShader, jugador nuevo: portada → creador → Empezar), sobre `main` con los merges del día. 0 errores y 0 avisos de consola, 0 rutas rotas, 0 hosts prohibidos.

| Capítulo | Batería | Resultado | Fallos y arreglos |
|---|---|---|---|
| 1 | selfTest | 101/101 | — |
| 1 | missionTest | 76/76 | — |
| 1 | e2eTest (recorrido completo) | 47/47 | — |
| 1 | saveTest | 45/45 | — |
| 2 | ep2Test / ep2e2eTest | 59/59 / 71/71 | — |
| 3 | ep3Test | 68/68 | — |
| 4 | ep4Test | 59/59 | — |
| 5 | ep5Test | 72/72 | — |
| 6 | ep6Test | 74/74 | — |
| Idioma | idiomaTest | 15/26 → 26/26 | Falso positivo REAL de la prueba: en la tarjeta del «Coquí escondido» (cap. 1) el botón «Quí (high)» se contaba como español porque `NOMBRES` solo traía «quí» en minúscula. Arreglo: `Quí` en `NOMBRES` de `src/game/idioma.js`. Repetida: 26/26. |

## Guardado entre capítulos
Cada pack guarda en su propia clave (`amazonaverse` cap. 1, `ep2.`…`ep6.`); solo el criadero y el aula se comparten (`amazonaverse.criadero`, aula). `saveTest` (45/45) cubre guardar, recargar, corrupción, corte a mitad y migración con claves aisladas. Los `epNTest` de ep2, ep3, ep5 y ep6 comprueban que la clave de guardado del pack empieza por su prefijo y que el criadero es el del cap. 1; los de ep2 y ep4 guardan y restauran la partida, el criadero y el aula del jugador al terminar (sin pisar la partida del cap. 1). Abrir `?pack=epN` con una partida del cap. 1 no la toca ni la lee. No se encontró ningún fallo. Límite: no hay una prueba única que abra los 6 packs seguidos en una sola sesión de Chrome; ep4 no comprueba el prefijo de su clave.

# Recorrido e2e de ep2–ep6 y guardado entre capítulos (BM85, 31-oct-2026)

Lanzador oficial (Chrome con SwiftShader, jugador nuevo), sobre `main` del 31-oct (con cámara nueva, D11/D32, BM26). 0 errores y 0 avisos de consola, 0 rutas rotas.

| Capítulo | Batería | Resultado |
|---|---|---|
| 1 | selfTest / missionTest / e2eTest / saveTest | 101/101, 76/76, 47/47, 45/45 |
| 2 | ep2Test / ep2e2eTest | 60/60 / 71/71 |
| 3 | ep3Test | 71/71 |
| 4 | ep4Test | 63/63 |
| 5 | ep5Test | 74/74 |
| 6 | ep6Test | 79/79 |
| Temporada | registroTemporadaTest / temporadaTest | 6/6 / 28/28 |
| Idioma | idiomaTest | 31/31 |
| **Entre capítulos** | **temporadaE2eTest (nueva)** | **22/22** |

## Guardado entre capítulos, en una misma sesión
Nueva `tests/qa/temporada_e2e.js` (`AV.temporadaE2eTest()`, inyectada como `ep2_e2e.js`, ya en `tools/build/config.json`): abre `?pack=ep2` → `ep3` → `ep4` → `ep5` → `ep6` en iframes seguidos con el mismo almacenamiento, que se respalda y se devuelve intacto. Juega con las interacciones reales (`useAt`, diálogos, tarjetas); solo fuerza el paso (`S.step`) donde el recorrido largo ya lo cubre `ep2e2eTest`. Comprueba:
- ep2: lee los 3 sitios, **recarga a mitad**, elige el sitio y cierra con Iguaca → queda en la temporada.
- ep3: nombra la casa elegida (y cada sitio da una casa distinta); recarga a mitad; conoce a quien navega; bautiza «Ceiba» (también tras recargar).
- ep4: nombra «Ceiba»; recarga a mitad (sigue lo observado); bosquecillo y navegante sin repetirse; decide opción y cuidado.
- ep5: nombra lo decidido en el ep. 4; el Guardián queda entre los encontrados.
- ep6: llegan quien navega y el del bosquecillo, y Iguaca los nombra.

## Fallos reales
Ninguno de contenido ni de lógica. Dos precisiones de la prueba al escribirla: la casa del ep. 2 se apunta al cerrar la elección con Iguaca (paso 2→3), no al pulsar el sitio; y quien navega del ep. 3 exige `BoatLaunched`. Ambas son el diseño del juego. Límite: ep3/ep4/ep5 se juegan con atajo de paso, no caminando; el recorrido largo a pie es `ep2e2eTest` (solo ep2).
