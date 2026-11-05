# BM143 · Look de la «Campeona de la Explanada» (propuesta para Kelvin)

Solo ropa y accesorios que ya existen (`src/personaje/character.js` y `wardrobe.js`); ni modelos ni canon nuevos y el duelo no se toca
(`src/game/v18/combate.js` hoy le pone solo unas gafas de entreno). La rival es una arausiaca cuando juegas Vittata. Capturas con
`tools/build/bm143_campeona.py` (aplica el look en vivo a la rival, 1440×900, calidad alto, `?v18=1`).

| Opción | Captura | Piezas | Idea |
|---|---|---|---|
| **A · La jíbara campeona** (recomendada) | `docs/img/bm143_campeona_a.jpg` | pava jíbara roja, pañuelo bandera PR azul, lentes deportivas rojas, brazaletes dorados | Se lee de lejos por la silueta (el sombrero ancho) y es de Puerto Rico. |
| B · La entrenadora | `docs/img/bm143_campeona_b.jpg` | gorra trucker negra, lentes de sol doradas, camisa roja, brazaletes negros, botas militares | Aire deportivo de gimnasio; más sobria. |
| C · La capitana | `docs/img/bm143_campeona_c.jpg` | casco pirata negro, pañuelo camuflaje verde, brújula dorada, brazaletes dorados | Más fantasiosa; el pañuelo se pierde sobre el verde del plumaje. |

Para aplicarla (pendiente de que Kelvin elija): cambiar el `accessories` de las dos llamadas a `applyLook` en `combate.js` (líneas ~99 y ~370)
por el bloque de `LOOKS` de `tools/build/bm143_campeona.py`. Es una tarea de código con las 13 baterías; no se ha hecho.
Nota: en la explanada hay árboles y plantas entre la cámara y la rival; las capturas ocultan al jugador y la cámara queda a ~7,5 m.
