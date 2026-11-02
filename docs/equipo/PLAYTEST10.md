# Playtest automático de 10 minutos

Prueba: `tests/qa/playtest10.js` (`AV.playtest10()`). Juega como un niño nuevo en un iframe con el almacenamiento vacío (la partida de la pestaña se respalda y se devuelve): menú de modos y creador, vuelo, coquí con neblina, coquí al atardecer, bahía de noche, comer un fruto, lluvia, «Save the Parrot», río y peces, edificios completos, foto para el cómic, paseo hasta completar 10 min y guardar y reabrir.

Cómo correrla: inyectar el archivo (como `e2e.js`) y llamar a `AV.playtest10()`. Si se inyecta, también queda `AV.playtest10Test`. `test.sh` no lo inyecta. El resultado trae `tramos`, `bugs` y `md`.

Corrida de este informe: build `g10-db2716d` (commit `db2716d`), Chrome con SwiftShader en esta VM, 26-oct-2026. **31/31 comprobaciones, 0 errores de consola.** La calidad de arranque salió «bajo»; el tramo de edificios la sube a «alto» para medir el kit completo y la devuelve.

La corrida V1 (sobre `c7603a9`) está superada: C4 y C5 hicieron la pista del coquí, la del visor, el rescate con frutos en las patas y la precarga del río. QA-36 y QA-37 quedaron cerrados en la integración.

## Cómo se mide
- **Tiempo de juego** = el del propio juego (`G.renderer.update(0,05)`, cuadro a cuadro); la **pared** es lo que tardó la máquina.
- **ms/cuadro y FPS sintéticos**: coste de CPU de cada cuadro (el iframe va fuera de pantalla y no se pinta), así que los FPS son un techo, no los FPS que verá un niño en pantalla.
- **Sin acción**: segundos de juego en cuadros de 0,5 s en que la cotorra no se movió y no pasó nada del juego. En el coquí, la lluvia y el menú la prueba espera a propósito. Solo el paseo y el vuelo miden un atasco real.
- Atajos dichos: `teleport` entre tramos, `startFlying` si el doble Espacio no despega, la cotorra se coloca en la rama para «Comer», y si no se puede entregar al nido se vacían las patas a mano. La primera palma abre la tarjeta del dato: la prueba pulsa «¡A comer!» y después Acción, como haría el niño.

## Resultados por tramo
| Tramo | Juego (s) | Pared (s) | ms/cuadro | FPS sint. | Peor cuadro | Sin acción (s) | Racha mayor (s) | Heap MB | Errores |
|---|---|---|---|---|---|---|---|---|---|
| 1 · Menú de modos | 10 | 29,9 | 1,2 | 809 | 32 ms | 9,5 | 8 | 70,2→89,3 | 0 |
| 2 · Vuelo | 27,5 | 0,2 | 0,4 | 2283 | 28 ms | 5 | 2 | 89,3→96,7 | 0 |
| 3 · Coquí | 11 | 4,2 | 0,6 | 1724 | 8 ms | 10,5 | 10,5 | 96,7→89,9 | 0 |
| 3b · Coquí al atardecer | 9 | 7,2 | 0,4 | 2560 | 11 ms | 8,5 | 7,5 | 89,9→92,2 | 0 |
| 3c · Bahía de noche | 3 | 7,6 | 125,9 | 8 | **7453 ms** | 1,5 | 1,5 | 92,2→83,7 | 0 |
| 4 · Comer un fruto | 5 | 0,1 | 1,2 | 833 | 18 ms | 3 | 2,5 | 83,7→92,7 | 0 |
| 5 · Lluvia | 12 | 3,4 | 0,1 | 8054 | 2 ms | 12 | 12 | 92,7→79,4 | 0 |
| 6 · Rescate | 68,5 | 0,6 | 0,3 | 3292 | 21 ms | 67,5 | 66 | 79,4→91,1 | 0 |
| 7 · Río y peces | 19,5 | 0,2 | 0,5 | 1826 | 12 ms | 11,5 | 10,5 | 91,1→93,7 | 0 |
| 7b · Edificios | 11 | 283,2 | 19,9 | 50 | **3843 ms** | 9,5 | 8,5 | 93,7→131,2 | 0 |
| 8 · Foto para el cómic | 3 | 28,3 | 6,3 | 160 | 10 ms | 3 | 3 | 131,2→138,3 | 0 |
| 8b · Paseo hasta los 10 min | 442,5 | 5,4 | 0,6 | 1663 | 34 ms | 140,5 | 41,5 | 138,3→186,3 | 0 |
| 9 · Guardar y reabrir | 1 | 55,7 | 0,1 | 6897 | 1 ms | 1 | 1 | 186,3→196,5 | 0 |

Unos 623 s de juego (10,4 min). 0 errores de consola en todo el recorrido. Look de fábrica `vibrant_toon` sin pedirlo en la URL. Cielo vivo (degradado y nubes) en la escena.

## Qué funciona
- Mundo libre abre el creador corto y, al reabrir, entra directo.
- Coquí con neblina y, con sol y atardecer forzado (hora 18,75), otra vez: peor cuadro 8 ms y 11 ms. Hay luciérnagas junto al arbusto.
- Bahía de noche (−160, 207): 24 chispas azules en calidad baja.
- El fruto se recoge al primer intento volando. La lluvia cuesta 0,1 ms por cuadro. El visor del río se enciende y el sirajo entra al álbum.
- Edificios: en `kelvin_ruinas_yunque` se dibujan 60 instancias `_hd` (35 modelos). El paseo llega a 20 de 24 destinos. La partida (nombre, coquí) sigue al reabrir.

## 5 mejoras concretas
1. **El nido no frena el vuelo (hecha).** Iguaca presentaba el nido en una caja que paraba el juego: la cotorra se quedaba quieta y no llegaba a los frutos ni a los peces. Ahora es un bocadillo (`src/game/criadero.js`, `{ libre: true }`). El criaderoTest pide bocadillo y que el juego no quede ocupado.
2. **Tirón al llegar a la caleta de noche: 7453 ms.** Un solo cuadro al teletransportarse a −160, 207 (24 chispas, calidad baja). Hay que precargar esa zona del terreno a unos 120 m, como ya se hizo con el coquí y el río. Archivos: `src/engine/terreno.js` y, si hace falta, `src/engine/streaming.js`. No los toco: el streaming lo tiene el kit de edificios y G9 los tiene en su lista. Pedido en `PEDIDOS.md`.
3. **Tirón al entrar en las ruinas: 3843 ms.** Calidad alta, zona `kelvin_ruinas_yunque`, 60 instancias `_hd` y 35 modelos en un cuadro (la pared de ese tramo fue 283 s). Hay que repartir la carga en varios cuadros. Mismo pedido: `src/engine/streaming.js` está en curso con el kit de edificios.
4. **El paseo, después de ver los edificios, sube el heap 138→186 MB (+48) y 4 de 24 destinos no se alcanzan en 40 s.** El peor cuadro del paseo es 34 ms: el atasco no es de CPU por cuadro, es de memoria que no se suelta y de cuatro sitios a los que el vuelo no llega a tiempo. Va en el mismo pedido al streaming (soltar el atlas al alejarse).
5. **La primera palma abre el dato y Acción cierra la tarjeta en vez de comer (la prueba, no el juego).** El botón dice «¡A comer!»: el niño lo pulsa y después come. La prueba ahora hace eso (`tests/qa/playtest10.js`) y «Comer» cuenta. No hace falta cambiar `banquete.js`.

El rescate arranca y se puede salir. La primera llamada a agarrar aparta al pichón de un saltito (así está hecho en `rescate.js`); la prueba solo llama una vez, así que no lo lleva al nido. No es un fallo del minijuego.
