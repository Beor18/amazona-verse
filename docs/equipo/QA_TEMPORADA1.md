# QA de la temporada 1 · escritorio (BC1, 27-oct-2026)

Ronda de jugador nuevo en escritorio (1366×768, DPR 1, Chrome 156 sin interfaz con GPU Metal) sobre la build de `HEAD` **2fdfb60** (`tools/build/salida/bc1-head`). La parte móvil es BC2.

## Cómo se jugó
- `tools/build/qa_temporada1.py <build>/site --modos` (nuevo): origen limpio por capítulo, portada, creador y «Empezar», la apertura a los 6 s y a los 40 s, la pausa y el capítulo de punta a punta con su prueba (cap1: `missionTest`; caps. 2–6: `AV.epNTest`). En el capítulo 1, además: Diario, Retos y sus 4 retos (carrera, tormenta, banquete, contrarreloj del río), Flight, Maze, River Rush, Tren, criadero, Mis récords, «Cambiar de juego», y la pausa y Retos en inglés. Cada escena deja captura, auditoría del DOM (fuera de pantalla, botones que se pisan, texto cortado, «undefined»/«NaN»/«[KELVIN]» a la vista) y errores de consola.
- `tools/build/test.sh <build>/ --extra` (todas las baterías) sobre la misma build.
- Capturas revisadas a mano una por una. Evidencia en `docs/img/bc1_*.jpg`.

## Resultado
- **Se puede jugar de principio a fin**: los 6 capítulos arrancan, la historia avanza y llegan al final (missionTest 70/70, e2eTest 45/45, ep2e2eTest 71/71, ep2–ep6Test en verde en la batería). Todos los modos abren y se cierran sin errores de consola.
- **Consola**: 0 errores de JS en toda la ronda. El único error era el 404 de `/favicon.ico` (QA-43), ya arreglado.
- **Baterías de HEAD**: obligatorias en verde salvo `maestroTest` 25/26 (el caso del portapapeles, ya conocido y que oscila con la carga). Extras: `bandadaTest` 14/15 y `riverTest` 66/67 (QA-51). En la build con los arreglos (`bc1-arreglos`) pasan las dos, y también `maestroTest` 26/26: oscilan.

## Bugs (detalle en `BUGS.md`)
| id | sev. | qué | estado |
|---|---|---|---|
| QA-43 | baja | 404 de `/favicon.ico` en cada carga | **arreglado** en 8427b0d (icono en `index.html`) |
| QA-44 | baja (accesibilidad) | El nombre de quien habla en los bocadillos (NARRADOR…) va en dorado sobre papel: contraste 1,2:1 | **arreglado** en 42cdb37 (`dialogo.js`, marrón 5,7:1) |
| QA-45 | media | En inglés, la pausa deja «Seguir jugando», «Guardar» y «Cargar» en español | abierto (`content/cap1/en.js` tiene cambios sin commit de otro carril) |
| QA-46 | media | El capítulo 2 empieza con la cámara metida en una palma: no se ve a Vittata | abierto (`content/ep2/pack.js` y `vegetacion.js` con cambios ajenos) |
| QA-47 | baja | «Episodio 2/3» frente a «Capítulo 1/4/5/6» en la portada y en el HUD; el HUD del cap. 2 dice «Prototipo» | abierto (canon: decide Kelvin; `en.js` y `ep2/pack.js` con cambios ajenos) |
| QA-48 | baja | Portada a 1366×768: el enlace «Capítulo 6» queda bajo el pliegue | abierto |
| QA-49 | baja | River Rush: al salir, una losa oscura tapa el tercio de arriba de la pantalla | abierto (por confirmar la pieza) |
| QA-50 | baja | Tren: el desvío no elegido («Faro ▶») tiene texto naranja claro sobre crema, casi ilegible | abierto (`tren.js` con cambios ajenos) |
| QA-51 | baja | Extras en rojo en HEAD: `bandadaTest` (85→89 draw calls) y `riverTest` (geometrías 345→347 al salir) | abierto |

## No son bugs
- **Amazona Maze** no sale en ningún menú, ni en Retos ni en Mis récords; solo se abre con `?mini=maze`. El código lo marca «oculto» a propósito (AB1). Sacarlo es decisión de producto.
- Al correr `AV.epNTest` desde una página que ya es ese mismo pack, falla «Guarda aparte de cap1» porque compara la clave del iframe con la de la página padre. En la batería corre desde el cap1 y pasa. Es un artefacto de la prueba.
- Capítulo 5: el cielo azul marino de arriba es el de la escena del taller.

## Para BC2 (móvil)
`--ancho 375 --alto 812` solo cambia el tamaño: hay que añadir al guion la emulación táctil y la CPU 4× de `movil_modos.py`. Mirar QA-42 (salida de Retos al final de la lista) y si la fila de capítulos de la portada se desborda.

# QA de la temporada 1 · móvil (BC2, 27-oct-2026)

Misma ronda de jugador nuevo, emulando un iPhone: 375×812, DPR 3, táctil (`pointer: coarse`), UA de iPhone y **CPU frenada ×4**, en Chrome 156 sin interfaz con GPU Metal. Builds de `HEAD` d4596d5 (`salida/bc2-head`) y de los arreglos (`bc2-a8bdab8`, `bc2-a834183`). La Mac tenía carga 8–16 por otros carriles: los tiempos valen para comparar escenas, no como FPS de un teléfono.

## Cómo se jugó
- `tools/build/qa_movil.py <build>/site [--modos]` (nuevo, aparte de `qa_temporada1.py`): por capítulo, portada, «Empezar», apertura a los 6 y 30 s, **paseo de 12 s** con el streaming, pausa y el capítulo de punta a punta con su prueba; en el cap. 1 con `--modos`, Diario, Retos y la carrera, Flight, Maze, River Rush, Tren, criadero, récords y la pausa en inglés.
- Por escena, además de la auditoría de BC1: **botones de menos de 44 px**, **textos tapados** por un botón o el HUD (sin contar lo que queda detrás de un panel modal), **tirones** (p50, p95 y peor cuadro, cuadros de más de 100 ms, tareas largas) y **memoria** (heap JS tras recoger basura, MB de texturas en GPU, draw calls, calidad elegida). Informe en `qa_movil.json`.
- Capturas revisadas a mano. Evidencia en `docs/img/bc2_*.jpg`.

## Resultado
- **Se juega de principio a fin en el móvil**: los 6 capítulos arrancan y llegan al final (missionTest 70/70; ep2–ep6Test con un solo caso rojo, «Guarda aparte de cap1», que es el artefacto de la prueba ya descrito arriba). Todos los modos abren y se cierran.
- **Consola**: con los arreglos, 0 errores en toda la ronda (antes, 4 por capítulo de `navigator.vibrate`, QA-56).
- **Calidad automática**: arranca en «medio» y baja sola a «bajo» a los ~10 s en todos los capítulos (A3 funciona).
- **Memoria**: heap JS de 14 a 78 MB (presupuesto 150). Texturas: caps. 2–6, 13–24 MB; **cap. 1, 264 MB en «bajo»** (presupuesto 160) y hasta 440 MB tras recorrer el mapa (QA-52).
- **Tirones** (CPU 4×, con la Mac cargada): ya en marcha, p50 de 17 a 150 ms; el peor momento es al pulsar «Empezar» (congelado intermitente de hasta 3,7 s, QA-53). Draw calls de 16 a 80, dentro del presupuesto.
- **Textos y botones**: el HUD a 375 px no se pisa (objetivo, chips, minimapa, joystick y botones de acción). Botones de 40 px en River Rush (arreglado), Tren y mapa grande (QA-54).

## Bugs (detalle en `BUGS.md`)
| id | sev. | qué | estado |
|---|---|---|---|
| QA-42 | baja | Retos en móvil: la única salida está bajo 7 tarjetas | **arreglado** (✕ fija arriba, `retos.js`) |
| QA-52 | alta | Cap. 1 en móvil: 264–440 MB de texturas en «bajo» (presupuesto 160) | abierto (AW1; `look.js`/`renderer.js` con cambios ajenos) |
| QA-53 | media | Congelado intermitente (hasta 3,7 s) al pulsar «Empezar» (CPU 4×) | abierto (`renderer.js` con cambios ajenos) |
| QA-54 | baja | Botones de 40 px en el desvío del Tren y en el mapa grande | abierto (`tren.js` y `minimapa.js` con cambios ajenos) |
| QA-55 | baja | Botones de 40 px en las modalidades de River Rush | **arreglado** (44 px) |
| QA-56 | baja | `navigator.vibrate` sin gesto previo: error de consola en móvil | **arreglado** (`misiones.js`) |

## No son bugs (móvil)
- En la portada a 375 px, el pie «Prototipo · Villa Raíz» queda detrás de las tarjetas: está puesto así a propósito (`menu_modos.css:13`, `z-index: 0`).
- La pausa del cap. 1 trae un botón «Capítulo 5» (G14, `index.html:151`). Es la entrada provisional; lo sustituye la pantalla «Capítulos» de AV1.
- La fila de capítulos de la portada a 375 px: la auditoría no marca scroll horizontal ni enlaces fuera de la portada (queda bajo las tarjetas y se llega desplazando).
