# Playtest automático de 10 minutos (V1)

Prueba: `tests/qa/playtest10.js` (`AV.playtest10()`), sin tocar el juego. Juega como un niño nuevo en un iframe con el almacenamiento vacío (la partida de la pestaña se respalda y se devuelve): menú de modos y creador, vuelo, coquí, comer un fruto, lluvia, «Save the Parrot», río y peces con el visor, foto para el cómic, paseo hasta completar 10 min de juego y guardar y reabrir.
Cómo correrla: inyectarla como `tests/qa/e2e.js` (`inyectar` de `tools/build/config.json`) y llamar a `AV.playtest10()`; el resultado trae `tramos`, `bugs` y `md`. Corrida de este informe: copia de trabajo sobre `c7603a9`, porque `clima`, `rescate` y `rio_vivo` aún no están en `HEAD`. 21 de 23 comprobaciones en verde; las 2 rojas son bugs del juego (QA-36 y QA-37 en `BUGS.md`).

## Cómo se mide
- **Tiempo de juego** = el del propio juego (`G.renderer.update(0,05)`, cuadro a cuadro); la **pared** es lo que tardó la máquina.
- **ms/cuadro y FPS sintéticos**: coste de CPU de cada cuadro (el iframe va fuera de pantalla y no se pinta), así que los FPS son un techo, no los FPS que verá un niño en pantalla.
- **Sin acción**: segundos de juego en cuadros de 0,5 s en que la cotorra no se movió y no pasó nada del juego. Ojo: en el coquí, la lluvia y el menú la prueba **espera a propósito** (hay que quedarse quieta); ahí la cifra es la espera mínima del diseño, no aburrimiento medido. Solo el paseo y el vuelo miden un atasco real.
- Se mueve con las teclas de verdad (W, Mayús, Espacio, X) y la cámara girada hacia el destino. Atajos dichos: `teleport` entre tramos, `startFlying` en vez del doble Espacio (el doble Espacio no despegó en la prueba), la cotorra se coloca en la rama para «Comer», se vacían las patas a mano antes del rescate (no se logró entregar los frutos al nido en la prueba).

## Resultados por tramo
| Tramo | Juego (s) | Pared (s) | ms/cuadro | FPS sint. | Peor cuadro | Sin acción (s) | Racha mayor (s) | Heap MB | Errores |
|---|---|---|---|---|---|---|---|---|---|
| 1 · Menú de modos | 10 | 2,3 | 2,2 | 449 | 34 ms | 9,5 | 8 | 72,2→73,1 | 0 |
| 2 · Vuelo | 27,5 | 0,7 | 1,2 | 803 | 18 ms | 5 | 2 | 73,1→75,4 | 0 |
| 3 · Coquí | 11 | 1 | 2,8 | 359 | 23 ms | 10,5 | 10,5 | 75,4→71 | 0 |
| 4 · Comer un fruto | 8 | 0,4 | 2,3 | 443 | 36 ms | 2,5 | 2,5 | 71→79 | 0 |
| 5 · Lluvia | 12 | 0,4 | 0,7 | 1392 | 12 ms | 12 | 12 | 79→83,2 | 0 |
| 6 · Rescate | 0 | 0 | — | — | — | 0 | 0 | 83,2→83,3 | 0 (excepción, QA-36) |
| 7 · Río y peces | 19,5 | 2 | 5,1 | 197 | **1079 ms** | 11,5 | 10,5 | 83,3→82,4 | 0 |
| 8 · Foto para el cómic | 3 | 2,4 | 6,8 | 146 | 21 ms | 3 | 3 | 82,4→84,5 | 0 |
| 8b · Paseo (29 destinos en vuelo) | 514 | 16,9 | 1,6 | 612 | 71 ms | 11 | 0,5 | 84,5→83,7 | 0 |
| 9 · Guardar y reabrir | 1 | 5,5 | 0,3 | — | — | 1 | 1 | 83,7→140,2 | 0 |

Total: **606 s de juego (10,1 min)**; 29 destinos del paseo, todos alcanzados en menos de 40 s. En los 10 minutos la memoria no crece (84,5→83,7 MB en el paseo). Los 140 MB del último tramo son el iframe nuevo mientras se cierra el viejo.

## Qué funciona
- «Mundo libre» en la primera vez abre el creador corto, y al guardar se juega sin pasar por la historia; al reabrir sale la portada y el modo entra directo.
- Clima, rescate, río y banquete llegan 1,5 s (pared) después del primer gesto.
- El coquí se observa quieto a menos de 4 m con neblina; el fruto se recoge volando y, posada, la Acción dice «Comer»; la lluvia (aguacero) entra y cuesta 0,7 ms por cuadro; el visor y los peces funcionan; el cómic exporta un PNG.

## Dónde se atasca o se aburre
- **Coquí (10,5 s sin acción)**: hay que estar a menos de 4 m y quieta 2 s, solo con neblina. A 4,3 m del arbusto (de un empujón de teclas colgadas en la prueba) no pasó nada en 10 s, y el niño no recibe ninguna pista de la distancia.
- **Peces**: la primera vez, volando a 2,5 m sobre un banco, no se observó ningún pez en 12 s; se vio al aterrizar en la orilla y quedarse quieta. El visor depende de volar a menos de 4 m del agua o de estar quieta junto a la orilla, y nada lo cuenta.
- **Rescate**: no se puede jugar (QA-36). Además, con frutos en las patas el juego avisa «ocupado»; en la prueba, ya junto al nido, `entregar()` no los entregó (`llevo=3`), así que el rescate quedó bloqueado hasta vaciar las patas a mano.
- **Lluvia (12 s sin acción)**: llega sin que el niño tenga algo que hacer con ella.
- **Peor cuadro de 1,08 s en el río** (también 1,4 y 1,6 s en el coquí en corridas anteriores): se nota como un tirón al entrar a esa zona.

## 5 mejoras concretas
1. **Pista del coquí**: con neblina y a menos de 8 m de un coquí, mostrar «quédate quieta» y un anillo en el suelo de 4 m (`src/game/fauna.js:294`, `OBS_R = 4`).
2. **Pista del visor de peces**: la primera vez que se vuela a menos de 8 m del agua, un aviso corto «baja a 4 m del agua o quédate quieta en la orilla» (`src/game/rio_vivo.js:149`, `visorPosible`); subir `OBS_R` de 7 m o `OBS_T` si en niños se ve duro.
3. **Rescate sin bloqueo**: permitir «Save the Parrot» con frutos en las patas (soltarlos o dejarlos en el sitio) en vez de negarlo (`src/game/rescate.js:253`), y arreglar QA-36 antes.
4. **Quitar el tirón del río y del coquí**: precargar la zona del río (modelos y peces) al volar a menos de ~120 m, en vez de crear mallas al llegar (`src/game/rio_vivo.js`, `src/game/fauna.js`); medir con `playtest10` (peor cuadro < 100 ms).
5. **Guardar los peces** (QA-37, `'peces'` en `claves` de `content/cap1/pack.js:76`) y pedir a `playtest10` que lo compruebe en cada corrida; así el álbum del río no se pierde al reabrir.

## Qué falta
- Medir con niños reales y en pantalla: los FPS de aquí son de CPU y el tiempo sin acción es el de un guion.
- La corrida usa la copia de trabajo (otros carriles la tienen a medias): la consola da 6 `SyntaxError` de `content/comun/huevos.js:175` (QA-38) fuera del iframe del juego.
