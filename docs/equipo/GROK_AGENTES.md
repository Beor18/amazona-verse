# Grok en Cursor: una sola fila de tareas (28-oct)

## ⚠️ MODO AHORRO (28-oct, 14:15 AST): Grok está al ~90 % de su uso
Kelvin: «estamos en crisis». Hasta nuevo aviso de la coordinadora:
1. **El uso de Grok se reinicia en 5 días (~2 de noviembre) y queda ~10 %.** Solo siguen **2 carriles**: **D** (copas a escala en todo el mapa: es un ajuste de código que vale para todo) y **J** (sombra de la piedra crema y piezas en el aire). **C para también**: los lejanos de la Ciudad de los 36 los rehace la API en la Mac (BM2) y C los integra cuando vuelva el uso. Cada agente: cambios pequeños y seguros, sin repetir pruebas que ya pasaron.
2. **Pausados:** A, B, E, F, G, H, I, K, L, M, N y todo el audiovisual (G29–G32). Si eres uno de ellos, deja tu trabajo con commit y **para**.
3. **Nada de papeleo:** no más `ESTADO_CARRILES.md` cada 20 minutos ni commits solo de tablero. Un commit por cambio real, con su captura, y una línea en el tablero al terminar.
4. **Menos vueltas:** antes de subir, compara tu captura con la meta de Kelvin; sube solo si mejora de verdad.
5. **Grok Imagine** gasta del mismo uso: las pruebas de video esperan a que se reinicie el uso.

**El tablero (`TRABAJO_SIMULTANEO.md`) manda, y la coordinadora lo mantiene al día.** Si un pedido de la coordinadora en `PEDIDOS.md` es más nuevo que el estado del tablero, vale el pedido: actualiza la fila y sigue. «Lista para Kelvin» con una revisión pendiente no es «bloqueado»: se hace la revisión.

**Nadie sustituye las tareas de otro ni se detiene.** Los agentes se reparten el trabajo entre ellos y siguen sin parar hasta terminar el proyecto con la calidad que merece.

**Regla nueva (28-oct, tras perder la noche):** no hay tareas a nombre de un Grok concreto. Hay **una fila en orden**. Cualquier agente de Grok que esté abierto toma la **primera tarea libre**, se apunta en `docs/equipo/TRABAJO_SIMULTANEO.md` (quién, hora, «en curso») y la hace. Si hay dos Grok, cada uno toma una distinta y no tocan los mismos archivos. **Nunca se queda parado:** si no queda nada libre, caza bugs (tarea 6). Las secciones de abajo (Grok 1 a 4) son el detalle de cada tarea, no dueños.

## Carriles: uno por agente, todos a la vez
Para que trabajen **muchos agentes a la vez sin pisarse**, el trabajo va en carriles con sus propios archivos. Cada agente nuevo toma el **primer carril libre** (nadie apuntado «en curso» en `TRABAJO_SIMULTANEO.md` en la última hora), se apunta como «Grok · carril X» y hace sus tareas en orden. Al terminar su carril, toma el siguiente libre; si no queda ninguno, el carril H (cazar bugs) admite a varios.

| Carril | Tareas, en orden | Sus archivos (los demás no los tocan) |
|---|---|---|
| **A · Móvil y arranque** | QA-53 (el congelón al pulsar «Empezar»: repartir la compilación de shaders y trocear terreno y sólidos); QA-41 (la capa negra `#c1-fade` encima de los Retos) | `src/engine/renderer.js`, `src/boot.js` (cambio mínimo), `src/game/retos.js` |
| **B · Aldeas** | F2.2 tejados **rojos** (decisión de Kelvin, `vibrant_toon`); luego F2.1, el `_hd` a más distancia (90 m en medio, 120 m en alto) | edificios Savage, `src/engine/streaming.js`, `tools/blender/` de edificios Savage |
| **C · Ciudad del tepuy** | G18 como `docs/img/ciudad_tepuy_meta_kelvin.jpg` (detalle: «Grok 1»); luego las piezas beige que flotan en la pared del tepuy (vista `render2022`) | edificios Ancient de `kelvin_ruinas_yunque` y sus herramientas |
| **D · Selva y bosque** | G19, segunda vuelta (detalle: «Grok 2» y la revisión del 28-oct en `PEDIDOS.md`) | `src/engine/vegetacion.js`, `src/engine/terreno.js`, `assets/data/dosel_cap1*`, `tools/blender/entorno_dosel.py` |
| **E · Cámara y choques** | QA-61 (la vista que se agranda sola, como un zoom); Vittata contra paredes, tejados, puertas y cúpulas: que no atraviese, no se atasque y que la cámara no se meta en las paredes | `src/engine/camara.js`, la física y los sólidos (`src/engine/`) salvo terreno |
| **F · Minijuegos** | QA-49 (River Rush: la losa oscura que tapa la pantalla a los ~8 s); QA-51 (riverTest y bandadaTest en rojo); QA-50 (el Tren: el botón del desvío no se lee); luego jugar Flight, Maze, el Tren, River Rush y Mis récords en escritorio y móvil, y arreglar lo que salga | `src/game/river_rush.js`, `flight.js`, `maze.js`, `tren.js`, `bandada.js`, `records.js`, `menu_modos.js` |
| **G · Peso y carga** | QA-10: bajar la descarga inicial (hoy 15 MB, meta 8) cargando la ropa y los edificios lejanos solo cuando hacen falta, sin quitar nada gráfico | `src/personaje/` **solo la carga** (el modelo y el rig de Vittata no se tocan), `tools/build/` |
| **H · Cazar bugs (admite a varios)** | Jugar el capítulo 1 y los capítulos 2 a 6 de punta a punta, en escritorio y en móvil 375×812: textos tapados, botones pequeños, diálogos, misiones, Diario, ropero, criadero, pausa, guardado. Cada bug: apuntarlo en `BUGS.md`; si es de un carril con dueño, dejarlo en `PEDIDOS.md` para ese carril; si no, arreglarlo | `src/game/` y `src/ui/` que no sean de otro carril |
| **I · Pruebas** | QA-60 (falso rojo de templateTest y ep2Test); que `movementTest` y `streamingTest` den resultados fiables también sin GPU (en la nube), sin aflojar lo que miden en la Mac | `src/pruebas/`, `tools/build/test.sh`, `tools/build/avtest.py` |

Reglas de todos los carriles: las 13 baterías en verde antes de cada commit; commit solo de tus archivos con índice temporal y `git pull --rebase` antes de cada push; captura en `docs/img/` con cada cambio visual; no publicar `sitio/`; nada visual se da por hecho sin Kelvin; Vittata no se cambia. **Nunca te quedes parado.**

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
