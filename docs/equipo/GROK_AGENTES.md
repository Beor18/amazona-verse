# Grok en Cursor: una sola fila de tareas (28-oct)

**Regla nueva (28-oct, tras perder la noche):** no hay tareas a nombre de un Grok concreto. Hay **una fila en orden**. Cualquier agente de Grok que esté abierto toma la **primera tarea libre**, se apunta en `docs/equipo/TRABAJO_SIMULTANEO.md` (quién, hora, «en curso») y la hace. Si hay dos Grok, cada uno toma una distinta y no tocan los mismos archivos. **Nunca se queda parado:** si no queda nada libre, caza bugs (tarea 6). Las secciones de abajo (Grok 1 a 4) son el detalle de cada tarea, no dueños.

## La fila, en orden
1. **QA-53:** que la pantalla no se congele en el móvil al pulsar «Empezar» (detalle: «Grok 3»).
2. **Piezas beige que flotan** en la pared del tepuy, vista `render2022` (detalle: «Grok 3»).
3. **F2.2:** las 10 aldeas con tejados **rojos** (decisión de Kelvin del 28-oct), dentro de `vibrant_toon` (detalle: «Grok 3»).
4. **G18:** la gran ciudad del tepuy como `docs/img/ciudad_tepuy_meta_kelvin.jpg` (detalle: «Grok 1»).
5. **G19, segunda vuelta:** la revisión del 28-oct en `PEDIDOS.md` (pared de roca gris, copas entre los edificios y bosque continuo; detalle: «Grok 2»).
6. **Cazar bugs sin parar:** QA-61 (el zoom que se agranda solo), Vittata contra los edificios y los mini bugs de los juegos (detalle: «Grok 4»).

## Grok 1: la gran ciudad del tepuy (G18)

> Eres Grok 1 de Amazona Verse. Lee AGENTS.md, docs/equipo/RETOMAR.md y el final de docs/equipo/PEDIDOS.md. Tu tarea: G18, que la gran ciudad del tepuy (`kelvin_ruinas_yunque`) se vea como docs/img/ciudad_tepuy_meta_kelvin.jpg: (1) piedra blanca y crema mate, no dorada ni metálica (dentro del look único vibrant_toon); (2) sin las torres con «ganchos»: revisa orientación y escala contra el .max; (3) un conjunto con cúpulas, cornisas y almenas, no torres sueltas; (4) el conjunto de torres de la izquierda sobre la roca. Tus archivos: los edificios de la ciudad del tepuy y sus herramientas. No toques la vegetación (es de Grok 2) ni las aldeas Savage (son de Grok 3). Apúntate como «Grok 1» en docs/equipo/TRABAJO_SIMULTANEO.md. Con cada cambio visual sube su captura: `tools/build/look_capturas.py --vistas-json tools/build/mapa_vistas.json --vistas ciudad_tepuy`, guardada como docs/img/ciudad_tepuy_g18_<fecha>.jpg. Haz commit solo de tus archivos (índice temporal) y `git pull --rebase` antes de cada push. Modo continuo. No publiques sitio/. No la marques hecha: Kelvin la aprueba.

## Grok 2: la selva sobre el tepuy (G19 = BL1)

> Eres Grok 2 de Amazona Verse. Lee AGENTS.md, docs/equipo/RETOMAR.md, el final de docs/equipo/PEDIDOS.md y BL1 en docs/equipo/TAREAS_API.md. Tu tarea: G19, la selva cubriendo la cima y las laderas del tepuy alrededor de la ciudad, como en el render de 2022 (docs/img/mapa_audit_original_2022.jpg), y el bosque como un dosel continuo, no árboles sueltos de tronco blanco. Parte del trabajo a medias de la API: `git fetch origin 'refs/respaldo/*:refs/respaldo/*'` y mira `refs/respaldo/20261027-2119` (dosel_cap1*.js, terreno.js, vegetacion.js, lugares.js, tools/blender/entorno_dosel.py). Tus archivos: vegetación, dosel y terreno. No toques los edificios (Grok 1 y Grok 3). Apúntate como «Grok 2» en docs/equipo/TRABAJO_SIMULTANEO.md. Con cada cambio visual sube su captura (vistas `ciudad_tepuy` y `render2022`) en docs/img/ con la vista y la fecha. Commit solo de tus archivos (índice temporal) y `git pull --rebase` antes de cada push. Modo continuo. No publiques sitio/.

## Grok 3: QA-53 y las aldeas (F2.2)

> Eres Grok 3 de Amazona Verse. Lee AGENTS.md, docs/equipo/RETOMAR.md, el final de docs/equipo/PEDIDOS.md y QA-53 en docs/equipo/BUGS.md. Tu tarea: (1) QA-53, la pantalla que se congela en el móvil al pulsar «Empezar» (el perfil de CPU está en BUGS.md); si necesitas tocar src/boot.js, que sea el cambio mínimo y dilo en el commit; (2) F2.2, que las 10 aldeas Savage se lean con sus tejados rojos desde el aire, como en el render de 2022; (3) las 3 o 4 piezas beige que flotan en la pared del tepuy (QA-28, vista `render2022`). No toques la ciudad del tepuy (Grok 1) ni la vegetación (Grok 2). Apúntate como «Grok 3» en docs/equipo/TRABAJO_SIMULTANEO.md. Con cada cambio visual sube su captura (vista `render2022`) en docs/img/ con la vista y la fecha. Commit solo de tus archivos (índice temporal) y `git pull --rebase` antes de cada push. Modo continuo. No publiques sitio/.

## Avisos
- Cada agente gasta del plan de Cursor.
- No abras dos agentes con la misma tarea.
- La sesión coordinadora de Claude en la web une el trabajo, lo prueba, lo revisa contra las referencias de Kelvin y lo publica. Si algo falla, lo deja en `PEDIDOS.md` para el Grok que corresponda.
- Nada visual se da por hecho sin que Kelvin lo vea.

## Grok 4: cazador de bugs toda la noche (G20)

> Eres Grok 4 de Amazona Verse. Lee AGENTS.md, docs/equipo/RETOMAR.md, el final de docs/equipo/PEDIDOS.md y docs/equipo/BUGS.md. Tu tarea, en modo continuo toda la noche, sin parar: jugar y depurar. (1) QA-61: Kelvin vio que la vista se agrandó sola, como un zoom, y se veía muy grande hacia varios lados; reprodúcelo (escritorio y móvil 375×812; entrar y salir de minijuegos, chocar, cambiar la calidad, girar el móvil, pellizcar) y arréglalo. (2) Vittata con los edificios: vuela, camina y aterriza contra paredes, tejados, puertas, escaleras y cúpulas de la villa, de las aldeas y de la ciudad del tepuy; busca dónde atraviesa, se atasca, tiembla, cae por un hueco o la cámara se mete dentro de una pared. (3) Los mini bugs de los juegos actuales: River Rush, Amazona Flight, Amazona Maze, el Tren de Vittata, los Retos y Mis récords (botones, textos tapados, entrar y salir, pausa, récords, móvil y teclado). Cada bug: apúntalo en BUGS.md (pasos, causa con archivo:línea, estado), arréglalo con su commit y una prueba si se puede, y sigue con el siguiente. No toques los archivos en curso de Grok 1, 2 y 3 (ciudad del tepuy, vegetación y aldeas): si el bug está ahí, déjalo en PEDIDOS.md para ese Grok. Vittata no se cambia (ni modelo ni rig). Apúntate como «Grok 4» en docs/equipo/TRABAJO_SIMULTANEO.md. Las 13 baterías en verde antes de cada commit; commit solo de tus archivos (índice temporal) y `git pull --rebase` antes de cada push. No publiques sitio/.
