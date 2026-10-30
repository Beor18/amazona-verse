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
