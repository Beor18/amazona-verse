# Coordinación viva — Mac (API) + agente web

Esta hoja la leen y actualizan **los dos equipos** antes y después de cada tarea. Es la única fuente de verdad para no duplicar trabajo y para retomar después de un corte, una desconexión o una recarga de crédito.

## Carriles (no se pisan)
- **Mac (API, GPU real):** gráficos y motor. Archivos: `src/engine/*` de render (`terreno, streaming, vegetacion, dosel, mundo, renderer, solidos`), `src/game/look.js`, `tools/blender/*`, y las pruebas de movimiento/visual. Cola en `tools/agente_api/cola.txt`.
- **Web (cryptochefpr, sin GPU):** todo lo demás — contenido (`content/*`), texto, inglés, datos educativos (con fuente), accesibilidad, bugs no gráficos, pruebas de esos. Tareas en `TAREAS_API.md` «Carril del agente web».

## Regla de oro
**Nadie espera al otro.** Si tu carril se queda sin trabajo real, para y deja nota aquí; NO te metas en el carril del otro. Si el crédito de uno se agota, el otro sigue con lo suyo.

## Protocolo de reanudar (tras corte, reinicio, desconexión o recarga de crédito)
1. `git pull --rebase origin main`.
2. Lee esta hoja y la tabla **Estado** de `TAREAS_API.md`.
3. Toma la primera tarea de TU carril que NO esté «hecha» ni marcada «EN CURSO» por otro aquí abajo.
4. Márcala «EN CURSO · <equipo> · <hora>» en la sección de abajo y haz un commit rápido solo de esta hoja.
5. Trabaja, prueba, haz commit de tu trabajo y súbelo (a `main` o a tu rama `api-*`, que se une sola).
6. Marca la tarea «HECHA · commit» aquí y en la tabla Estado.
Así un corte nunca duplica ni pierde trabajo: el que vuelva toma lo siguiente libre.

## Publicación
La hace la Mac con `tools/build/publicar_mac.sh` (GPU real) o Kelvin; publica `sitio/` cuando las 13 baterías están verdes en `main`. El publicador NO usa crédito de API (es build + git), así que debe seguir aunque la API se quede sin crédito.

## Estado vivo (lo actualizan los equipos)
- 30-oct: backlog BM49–BM75 HECHO y en `main`. Falta PUBLICAR (la web sigue en 09b62ed).
- Mac: cuando haya crédito, retoma el protocolo; si la cola está vacía, abre lote nuevo de `VISUAL_*` solo si hay problema real.
- Web: cuando haya cuota (se reinicia cada 5 h), retoma ronda 2 (BM70–75) o abre lo que quede real; si todo está hecho, para y deja nota aquí.
- 30-oct 18:36 AST · **HECHA · web (este commit)** · cayuco del ep. 3: quitar «de pesca» del dato (DLE; propuesto por BM71), en `content/ep3/lecciones.js`, `pack.js` y `en.js`.
- 30-oct 18:36 AST · **HECHA · web · 93573c6 (D11), e61a8a6 (D32)** · D11 (lo elegido en un capítulo se queda en los siguientes) y D32 completo (en el ep. 6 llegan los guardianes encontrados): resto de BM55, con un registro de temporada compartido entre capítulos (`src/game/` + `content/ep*`). La Mac no lo toma (es contenido).
- 30-oct 19:09 AST · **web sin trabajo real pendiente**: ronda 2 (BM70–75), BM55 completo (con D11 y D32), cayuco y Modo Maestro en EN hechos y en main. Queda para Kelvin: D2 (las voces se ven: arte), revisar las frases nuevas de historia ([DECIDIDO-EQUIPO] y D11/D32) y pasar fichas educativas a «verificado». Para reabrir fuentes educativas hace falta permitir en la red usgs.gov, noaa.gov, fws.gov, rae.es. El web espera tareas nuevas en TAREAS_API.
- 31-oct 15:39 AST · **HECHA · web · b1f3755** (pedido de Kelvin) · cámara: poder mirar hacia arriba (el cielo) al volar y en el suelo; `src/engine/camara.js` (+ input si hace falta). La Mac no lo toma.
- 31-oct 16:20 AST · **Kelvin trae el mapa y los edificios en GLB** en la Mac, fuera del repo: `~/AmazonaVerse/glb_kelvin/mapa/` y `~/AmazonaVerse/glb_kelvin/edificios/` (si cambia la carpeta, se anota aquí). Tareas para la Mac: BM77 (inventario) → BM78 (edificios) → BM79 (Ciudad de los 36) → BM80 (14 asentamientos) → BM81 (terreno y elementos), después de BM76 y antes del backlog visual. Detalle en `TAREAS_API.md`.
- 31-oct 17:12 AST · **Maze congelado (Kelvin):** fuera del menú, de Retos, de la web y de Mis récords (salvo si ya se jugó). Nadie trabaja en Maze hasta nuevo aviso; las pruebas `mazeTest` quedan como estaban (49–51/51, intermitente).

## Tres roles (31-oct noche) — para no chocar
1. **Claude en la Mac** (`~/AmazonaVerse/juego_api`, interactivo): manda en la Mac. Suyo: los trabajadores (lanzar.sh), el subidor, la publicación (`publicar_mac.sh --continuo`, SIN `--igual`), y el trabajo que necesita **GPU real o Blender**: BM76 (vuelo), BM77–BM81 (los GLB de Kelvin y el mapa), y las visuales bloqueadas BM58/BM59/BM63. Gestiona `tools/agente_api/cola.txt`. Usa la suscripción de Kelvin, no API extra.
2. **Claude en la nube** (coordinador, esta sesión): el lado de GitHub — PRs, uniones a `main`, las Actions, esta hoja y la planificación. NO toca la Mac ni `cola.txt`. No puede abrir los GLB (están solo en la Mac).
3. **Agente web** (cryptochefpr): contenido, historia, inglés, accesibilidad y web. Nada de motor, GPU ni Blender.
Regla: antes de cada tarea, marca «EN CURSO» aquí; nadie espera al otro; si uno se queda sin cuota/crédito, los demás siguen.

- 31-oct noche · EN CURSO · nube · e2eTest 4.2 (por qué G.interaccion.list sale vacía en la copa solo en la build de la nube).

## Hallazgo e2e 4.2 (nube) — pista para el Claude de la Mac (necesita GPU para verificar)
Localizado en `content/cap1/historia.js` ~574-613. El fallo «G.interaccion.list vacía en la copa» en la build de la nube es de TIMING, no de lógica de juego:
- La altura de la percha (`percha.y`) se fija dentro de `G.vegetacion.listo.then(...)` (línea ~585), es decir ASÍNCRONO, tras cargar la vegetación.
- El interactuable `luma` se añade en x,z del NPC en el suelo (línea 251, r 2.4); la guía apunta a la percha cuando `lumaArriba()`, pero conviene confirmar que el propio interactuable queda alcanzable desde la percha.
- Hipótesis: bajo SwiftShader la vegetación/streaming va lenta, así que cuando la prueba vuela a la percha y mide, el interactuable de `luma` aún no está colocado/alcanzable → lista < 6 m vacía. En la Mac (GPU rápida) llega a tiempo y pasa 47/47.
- Arreglo a probar CON GPU (no desactivar casos): que el interactuable `luma` siga a la percha cuando `lumaArriba()` sin depender de `G.vegetacion.listo`, o que la prueba/juego garantice la percha lista antes de 4.2. Reproducir en la Mac retrasando `vegetacion.listo` a propósito.

## Prioridad y presupuesto (31-oct noche, decisión del coordinador; Kelvin: $46 de API)
Prioridad de Kelvin: 1º EDIFICIOS Y MAPA (para mejorar gráficas en la web y el movimiento), 2º VUELO Y CÁMARA.
- **Claude de la Mac (Blender, suscripción de Kelvin):** PRIORIDAD 1 = BM78 (edificios por kit), BM79 (ciudad de los 36), BM80 (14 asentamientos), BM81 (terreno). Son los GLB de `~/AmazonaVerse/glb_kelvin/`. Después, las visuales bloqueadas (BM58/59/63/64/65/68/69). Requiere `export AV_PYTHON=~/Applications/Blender.app/Contents/Resources/4.2/python/bin/python3.11`.
- **Trabajadores autónomos del API ($46):** solo BM76 (vuelo, movementTest 49/49 estable con GPU). `cola.txt` reducido a BM76 para no gastar API en tareas bloqueadas.
- **Nube (coordinador):** unir a `main` lo que suban, publicar limpio cuando BM76 quede verde, revisar el inventario BM77 y los resultados de BM78-81.
- Publicación limpia (sin `--igual`) depende de BM76 verde estable.
- 31-oct 18:41 AST · **HECHA · web · e9cf722** · e2eTest 4.2 falla solo en la build de la nube (`G.interaccion.list` vacía en la copa): lo toma el agente web (era el punto 5 del traspaso para la Mac: la Mac NO lo toma). También el guion de prueba manual (P3.1). Causa: la posición de Iguaca iba en 'render' y el iframe oculto no dibuja (QA-82).
- 31-oct 19:11 AST · **EN CURSO · web** · ronda 3: BM82 (pruebas extra intermitentes; QA-78/81 siguen siendo de la Mac; Maze congelado no se toca), BM83 (huecos de accesibilidad), BM84 (datos educativos ep2–ep6), BM85 (e2e ep2–ep6 y guardado entre capítulos).
- 31-Oct 20:02 AST · **HECHA · web · ronda 3**: BM82 (eb5928c: menuModosTest 42/42, recordsTest 47/47, retosTest 115/115; QA-78/81 siguen siendo de la Mac), BM83 (6482a1a: solapes en accesibilidadTest, 40/40, sin fallos reales), BM84 (b8a65f0: 10 verificados, 9 parciales, 10 por verificar), BM85 (238f6f0: ep2–ep6 en verde y temporadaE2eTest 22/22, guardado entre capítulos probado). Aviso para la Mac: BM85 añadió tests/qa/temporada_e2e.js a «inyectar» de tools/build/config.json (no es obligatoria). El web queda sin trabajo pendiente: espera tareas nuevas.
- 31-Oct 21:15 AST · **Aviso para BM87 (cámara, Mac):** el agente web ya hizo que se pueda mirar arriba al cielo (b1f3755: inclinación vertical hasta +70°, la cámara baja y se acerca a Vittata sin meterse bajo el terreno, la recolocación espera 4 s; arrastre vertical, T/G y RePág/AvPág; `AV.camaraTest` 11/11). No lo deshagas: construye encima y mantén camaraTest en verde.
- 31-Oct 22:32 AST · **ROJO NUEVO que frena publicar (para la Mac):** en la build de `16c3fdb` `movementTest` falla «Corriendo cuesta abajo no se despega del suelo» (77 % de cuadros en el suelo, ladera de 26,68°; antes pasaba: build 180601c). El resto de obligatorias en verde (e2eTest 47/47). Desde 180601c solo tocaron el motor BM88 (`7f1c5a4`, terreno.js: islote lejano con manchas) y BM79 (`b01db64`, streaming.js). Sospecha: BM88 cambió el relieve o la ladera que elige la prueba (`src/pruebas/movimiento.js:188-206`, la primera ladera de 18–34° del barrido). Revisar con GPU y arreglar sin desactivar el caso. No se publicó nada; la web sigue en 180601c.
- 31-Oct 22:37 AST · **BM96 cancelada (Kelvin):** no eran tres ríos, era la simulación del río Amazonas = River Rush, que ya existe. Fuera de la cola; no tocar los cauces.
