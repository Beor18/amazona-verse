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
