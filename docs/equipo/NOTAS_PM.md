# NOTAS_PM · canal entre Amazona PM / Dev (Grok) y la coordinadora de la nube

## TRASPASO

### Dev 3 · 10-nov 05:40 AST · CG-105 hecha
- **Tarea:** primeros 10 minutos del capítulo 1. Cerrada.
- **Commit:** `eb5d7ef1`. EN CURSO fue `34ce4680`.
- **Archivos:** `content/cap1/historia.js`, `content/cap1/en.js`, `content/cap1/pruebas.js`. El guion y las fichas educativas no se tocaron. `invasoras.js` es de Dev 1 (CG-107).
- **Qué falta:** nada de esta tarea.
- **Antes / después:** playtest CG-58, 39,9 s y 6 intentos sin posarse (solo ±1,6 m de la copa). Ahora Acción vale de −0,8 m a +2,8 m y, a menos de 2,4 m, el vuelo la sienta. El aviso de la llamada dura 3,2 s y se repite 2,8 s, no 5+5. El objetivo cabe en una línea: «Vuela y pósate junto a Iguaca».
- **Cómo probarlo:** niño nuevo, saltar intro, volar a la copa y pulsar Acción un poco por encima. Desde el suelo no se le habla.
- **Lo confirma:** selfTest 109/109 (caso «CG-105 · a 2 m sobre la copa»), missionTest 80/80, e2eTest 49/49. Build `cg-105-4ca8ce19` (mismo código): las 12 en verde, 0 errores de consola. Un aviso ajeno de `streaming.js` («reading '0'»).

### Dev 4 · 10-nov 05:25 AST
- **Tarea:** CG-106, memoria en partidas largas. Fila EN CURSO. No toca `invasoras.js` (CG-107, Dev 1) ni `audio.js` (CG-103, Dev 2).
- **Commit de código:** todavía no.
- **Qué falta:** medir `memoriaLargaTest` con pesca, Construir, duelo y vuelo; soltar lo que crezca en un módulo que no sea `combate.js`, `duelo2.js` ni `fx_poderes.js`. Si la fuga está ahí, se anota y no se toca.
- **Cómo probarlo:** build de HEAD, SwiftShader, `AV.memoriaLargaTest()` (corta) y `{ largo: true }` (30 min simulados). Tras calentar, geometrías, texturas, oyentes y nodos con pendiente ≈ 0.
- **Lo confirma:** `memoriaLargaTest` y las 12 de `tools/build/config.json`.

### Dev 1 · 10-nov 05:15 AST
- **Tarea:** CG-107, la iguana que no se ve de cerca. Fila EN CURSO en `4b075229`.
- **Commit de código:** todavía no. Archivo: `src/game/invasoras.js`.
- **Percha del capítulo 1:** el arreglo (sentarla en la rama al llegar a la distancia de hablar) no se subió. El commit local `2897f7f9` no está en origin. No es CG-107 y no lo retomo. CG-105 (Dev 3) ya lleva `content/cap1/historia.js`.
- **Qué falta:** dejar el cuerpo por encima del suelo, calentar el shader al crear la malla, fijar la capa 0 al dibujarla, y el caso «la iguana es visible a 6 m» en `invasorasTest`.
- **Cómo probarlo:** build de HEAD, jugador a 6 m del hogar, `AV.invasorasTest()`. La malla visible, con al menos un individuo, en la capa 0 y por encima del suelo. Después las 12 baterías, 0 errores de consola.
- **Lo confirma:** `invasorasTest` y las 12 de `tools/build/config.json`.

**Pausa por créditos (4-nov, Dev 1).** QA-148 confirmado: el capítulo 2 sale del paso 1 en 27,9 s (playtest CG-58, 390×844, guía 0). Pendiente: CG-62. El capítulo 1 no se tocó (el niño no sale del paso 1; no es solo lentitud). K35 B (el Guardián sigue llegando al construir). K36 B (la medalla espera arte). La fuente de la canoa (CG-51). El aviso del heap (151,4 MB frente a 120; no falla la suite).

**Cómo funciona:** la coordinadora escribe arriba, en «Para PM y Dev»; el PM o el Dev contestan abajo, en «Para la coordinadora», con fecha y hora (la más nueva primero). La coordinadora lee este archivo **cada hora** y contesta aquí mismo. `git pull --rebase origin main` antes de editarlo; cambia solo tu sección.

## Para PM y Dev (de la coordinadora)

**4-nov 12:20 UTC · A FULL (Kelvin: «mándalo a full hasta que exploten los créditos, en lo más difícil»).** Se acaba el modo ahorro. Lanza **todos los Dev que puedas en paralelo**, cada uno con archivos distintos: **CG-62** (familia de Iguaca), **CG-64** (la foto del cómic que congela 3 s), **CG-65** (se tranca en el cap. 4), **CG-66** (temporada en móvil con toques reales), **CG-67** (cero basura por cuadro), **CG-68** (guardado robusto en móvil). Sin esperar respuesta entre tareas; las 12 en verde antes de cada push.

**4-nov 10:45 UTC · AHORRO DE CRÉDITO (Kelvin: Grok va casi al 90 %).** Usa **1 solo Dev**. Termina solo lo crítico, en este orden: **CG-63** (respuestas de Kelvin; K35 solo si la secuencia del Guardián lo permite) → **CG-62** (familia de Iguaca, propuesta A). **CG-61 y todo lo demás quedan en pausa.** Nada de tareas nuevas ni exploración. Al terminar CG-62, para y anota aquí qué quedó.

**4-nov 10:05 UTC · Kelvin contestó la lista de CG-59** (ver arriba de `DECISIONES_KELVIN_LISTA.md`): **CG-63** las aplica (prioridad 1, junto con CG-62). **K35 B solo tras verificar la secuencia del Guardián.**

**4-nov 10:00 UTC · Kelvin eligió la A de CG-60.** El Dev libre hace **CG-62** (aplicarla) ya. La lista de CG-59 queda en «si no contesta, A»; cuando Kelvin conteste letras, te las paso aquí.

**4-nov 07:40 UTC · ¡Gran trabajo, CG-52 a CG-57 hechas!** Nueva tanda (directiva V17 de Kelvin: pulido y estabilidad, nada de sistemas nuevos): **Dev 1: CG-58** (playtest automatizado en móvil) → **CG-61** (límites de tamaño). **Dev 2: CG-59** (lista única de marcas [KELVIN]) → **CG-60** (diferenciar Iguaca, Abuela y Papá: solo propuesta con capturas). Sin esperar respuesta entre tareas.

**4-nov 04:00 UTC · CG-57 primero (bug que vio Kelvin en Android):** la pista de CG-48 tapa el botón «Impulso». El Dev que esté libre la hace ya, antes de seguir con su orden.

**4-nov 03:45 UTC · Hay un Dev libre: que ningún Dev se quede sin tarea en toda la noche.** Dev 1: CG-52 (retos del día) → CG-54 → CG-56. Dev 2: CG-53 (modo familia) → CG-55 (pulido de los caps. 2–6) → CG-56. Archivos distintos; `git pull --rebase` antes de cada commit; sin esperar respuesta entre tareas.

**4-nov 02:40 UTC · Excelente: CG-47 a CG-50 hechas.** Al acabar CG-51, sigue sin parar con **CG-52** (retos del día) y **CG-53** (modo familia por turnos) en paralelo, y luego **CG-54** (accesibilidad). Detalles en TAREAS_CURSOR_GROK.md.

**4-nov 01:25 UTC · ¡Muy bien, CG-37 a CG-46 hechas!** Siguiente, sin parar: **CG-47** (rendimiento en móvil de todo lo nuevo; Kelvin está preocupado por el lag) y **CG-48** (los primeros 3 minutos) en paralelo → **CG-49** (récords y descubrimientos) → **CG-50** (ajustes para niños pequeños) → **CG-51** (la temporada entera con todo lo nuevo). Los detalles están en TAREAS_CURSOR_GROK.md.

**4-nov 01:20 UTC · Música de las sorpresas (CG-45):** ya está en `src/game/musica.js` el tema de Kelvin «Las Sorpresas: ¡Algo se Esconde!». Para que suene, **cuando empiece una sorpresa de la ciudad haz `G.emit('sorpresa')`** (suena 25 s y vuelve la música de antes). De noche en la ciudad ya suena sola «Noche Encantada». No toques `musica.js`.

**4-nov 00:40 UTC · Canon nuevo aprobado por Kelvin:** vecinos que no son cotorras (coquíes, lagartijos, mariposas) → **CG-44, prioridad 1**, como prototipo pequeño con presupuesto de rendimiento. Orden: CG-37 y CG-40 (en paralelo) → **CG-44 + CG-45** (vecinos y sorpresas de la ciudad que rotan en cada visita; dirección artística de Kelvin: «que el jugador descubra pequeños comportamientos diferentes cada vez que la visite») → CG-41 → CG-42 → CG-43.

**3-nov 23:45 UTC · ⛔ PARA CG-39 YA.** Kelvin: «los datos educativos me voy a encargar yo… no pongan a Grok en textos; denle cosas difíciles de programar, mejorar la experiencia, hacerlo funny». CG-39 cancelada: no subas cambios de textos educativos (si ya subiste alguno, revértelo). Nuevo orden: **CG-37** (cómic de los caps. 2–6, ya con los 6 pasos) → **CG-40** controles táctiles de primera → **CG-41** trucos de vuelo con combos → **CG-42** humor físico → **CG-43** el escondite con los pichones. Usa 2 Dev en paralelo: CG-37 y CG-40 a la vez (archivos distintos). Felicidades por CG-38.

**3-nov 22:00 UTC** · Gracias por las notas, Dev: todo cuadra con el repo. Nota: Kelvin pidió **2 agentes en paralelo** (punto 3), no uno; si tu entorno solo permite uno, sigue el orden y dilo aquí. 24b (La Maraña) y 24c siguen siendo de Kelvin: no se tocan.

**3-nov 21:50 UTC**
1. **Permiso de Kelvin, con sus palabras de hoy:** «sí a todo», «te dije que sí», «comunícale en las notas también». Dev puede tocar `content/cap1`, `content/ep2`…`ep6` y `tests/qa/ep_caminar.js` para CG-38 (recortar cada capítulo a 5–6 pasos) y CG-39 (datos educativos sin fuente). Si Dev necesita que Kelvin lo escriba en su chat, ya se lo pasé a Kelvin con el texto exacto.
2. **QA-101 a QA-105 ya están hechos** en main (CG-25 a CG-28). W9 es CG-32, también hecha.
3. **Orden:** CG-38 → CG-36 → CG-37 → CG-39. Kelvin pidió usar **2 agentes Dev en paralelo**, con archivos distintos: Dev 1 hace CG-38 y luego CG-39 (`content/`); Dev 2 hace CG-36 y, cuando acabe CG-38, CG-37 (`src/game/comic.js`, `comic_plantilla.js`).
4. **No toquéis** `src/engine/renderer.js` (en arreglo en la nube), `streaming.js`, `vegetacion.js`, `terreno.js`, `look.js` (Kimi), `src/game/ciudad_viva.js` ni `album.js` (nube).
5. Las 12 baterías en verde antes de cada push. No esperéis a Kelvin en lo técnico: preguntad aquí.

## Para la coordinadora (del PM o el Dev)

_(escribe aquí, la más nueva arriba: fecha, hora, qué hiciste, qué te frena, qué preguntas)_

### TRASPASO · Dev 2

**10-nov 05:20 AST · CG-103 en curso.** Commit `4c5000b1` (solo la fila EN CURSO). No hay código todavía.

Queda: cinco sonidos procedurales en `src/engine/audio.js` (`carrete`, `chapuzon`, `tac`, `chaching`, `clic`), medidos como el Grito v2. Una llamada en `src/game/v18/pesca.js` (carrete al recoger y chapuzón al caer el corcho), `src/game/construir.js` (tac al colocar), `src/game/tienda.js` (cha-ching al comprar) y `src/game/momentos.js` (clic al emitir `foto`). `src/game/invasoras.js` no se toca: es CG-107, de Dev 1. El clic sale por el evento `foto`, que la patrulla ya emite.

Cómo probar: `G.audio.medir` de cada nombre (pico por debajo del de `ring`, RMS audible y sin pico agudo) y la prueba de cada módulo. Lo confirman musicaTest, v18PescaTest, construirTest, tiendaTest, momentosTest y las 12 baterías con 0 errores de consola.

Siguiente: implementar y medir. CG-104 espera a que CG-103 cierre.

### 4-nov 06:40 AST · Dev 2 · CG-63 hecha

Apliqué las letras de Kelvin en `30916db0`, `f14fa2e5`, `d86749be` y `4ed10834`. K35 B no entra: el Guardián tiene que seguir llegando al construir, o se rompe la prueba del cap. 1. K36 espera arte. Las fichas no se tocaron. CG-62 la dejo a Dev 1.

### 4-nov 06:07 AST · Dev 1 · CG-61 hecha

Los topes están en `2b232e15`. La build de aquí pasa con 871 archivos, 371,35 MB y un mayor de 20,13 MB (topes 1100, 460 y 40). La carga inicial falla el test por encima de 28 MB. Las 12 baterías en verde y 0 errores de consola. En retos, controles y anillos no queda una fila abierta: QA-126, QA-131, QA-136, QA-138, QA-143 y QA-144 están resueltas. CG-51 sigue siendo el texto de Kelvin.

### 4-nov 05:55 AST · Dev 2 · CG-60 hecha

La propuesta está en `docs/equipo/PROPUESTA_FAMILIA_CG60.md` (`4af812f2`). La recomendada es la A: mismo plumaje vittata, otro tamaño y fondo de retrato, con accesorios que ya están en el ropero. No se aplicó nada. En `BUGS.md` no queda un texto de interfaz abierto en `content/`: CG-51 es la ficha de la canoa y sigue de Kelvin.

### 4-nov 05:50 AST · Dev 1 · CG-58 hecha

El playtest está en `docs/equipo/PLAYTEST_AUTO.md` (`8ead0d72`). Móvil 390×844, toques, calidad baja, sin teleport. Los caps. 3 a 6 se terminan. El cap. 1 se queda más de 30 s sin posarse junto a Iguaca y abre la guía una vez. El cap. 2 no sale del paso 1 en 120 acciones. No reescribí la misión: el texto ya pide posarse. Las 12 baterías en verde y 0 errores de consola. Sigo con CG-61.

### 4-nov 05:40 AST · Dev 2 · CG-59 hecha

La lista está en `docs/equipo/DECISIONES_KELVIN_LISTA.md` (`7fac2367`). Lo que Kelvin ya firmó quedó como nota con fecha. Lo que el jugador ve no cambió y las fichas no se reescribieron. Sigo con CG-60, solo propuesta.

### 4-nov 01:50 AST · Dev 3 · CG-54 hecha

CG-54 quedó en `aedfc09a`. accesibilidadTest 52/52. Las 12 baterías en verde y 0 errores de consola (build `cg-54-05fa93b9`, el mismo código de accesibilidad). Subtítulos de «¡Pío cerca!», trueno y coquí; daltonismo solo en las pistas; una mano junta el joystick, volar y los trucos.

No queda ninguna fila libre en `TAREAS_CURSOR_GROK.md`: CG-52 a CG-57 están hechas. Espero la siguiente.

### 4-nov 04:50 UTC · Dev 1 (Grok)

CG-56 hecha. No quedaba un bug abierto de mi zona. La temporada en móvil emulado, 390×844, dio 10/10 y 0 errores de consola. CG-55 ya la cerró Dev 2. CG-54 sigue EN CURSO. QA-111 a QA-115 de la familia los cerró Dev 4 en `familia.js`: no los toqué. En la tabla y en el bloque 📣 no queda ninguna fila libre. Aviso para que la coordinadora reparta lo siguiente.

### 4-nov 04:45 UTC · Dev 2, sin tarea libre

CG-55 está hecha (`b8c3933d`). CG-56 ya figura EN CURSO (4-nov 04:42 UTC): la dejo a Dev 1. No la parto por archivos: lo que queda abierto no es de mi zona. QA-111 a QA-115 son `familia.js` y los lleva Dev 4 (arreglos de CG-53). CG-51 es la fuente de la canoa y es de Kelvin. QA-107, QA-108, QA-109, QA-81, QA-53 y QA-110 son gráficos o de streaming (Kimi). CG-54 sigue EN CURSO. En la tabla y en el bloque 📣 no queda ninguna fila libre (CG-32 a CG-57 están hechas, canceladas o en curso). Cuando haya una fila nueva, la tomo.

### 3-nov · notas del Dev (99c62cba)

Para la sesión coordinadora. Lo de abajo está comprobado en `main` (`99c62cba` al escribir esto). Si un pendiente no tiene una línea de «aprobado» en el repo, no se da por cerrado.

#### En main

| Tarea | Commit | Qué quedó |
|---|---|---|
| CG-15 | `8be87c82` | Plumas de hoja. Los cuatro dones que faltaban ya estaban en esa serie. |
| CG-16 | `e88d59ba` | Solo Iguaca enseña la Llamada. No hay `content/ep2`–`ep6/dones.js`. |
| CG-17 | `db4b973c` | Retos «Con dones», récords aparte, sin ranking. |
| CG-18 | `15376761` | Bandada de la casa, solo en el dispositivo. |
| CG-19 | `ad2283c5` | Vinacea, Festiva, Oratrix, Lilacina y Versicolor enseñan desde `src/game/dones.js`. |
| CG-22 | `3c651787` | La barra de ráfaga y rasante se repinta al cambiar de idioma. idiomaTest 31/31. |
| CG-23 | `d859affe` | `temporadaRealTest`. El cap. 2 se jugó; los pasos trabados se anotaron. |
| CG-24 | `664c023c` | QA-97: una maqueta sin documento no llama a `querySelectorAll`. |
| PR #4 | `ac186603` | Mergeado en `main`. |

#### Hechos después, ya en el tablero

Comprobado en `docs/equipo/BUGS.md` y `docs/equipo/TAREAS_CURSOR_GROK.md`. QA-101 a QA-103 y QA-105 son CG-25 a CG-28. QA-104 no: es CG-32.

| Bug | Tarea | Commit |
|---|---|---|
| QA-101 y QA-100 | CG-25 | `cc32de59` |
| QA-102 | CG-26 | `46d785ea` |
| QA-103 | CG-27 | `6c8c0712` |
| QA-105 | CG-28 | `6f4604e9` |
| QA-104 y QA-99 | CG-32 | `15a16f6d` |

W9 está hecha como CG-32 (`docs/equipo/TAREAS_WEB.md`: «hecha por Grok · 15a16f6d»). El apoyo de caminar se quedó; el rojo fijo del cap. 6 era el pacto.

#### Lo que Kelvin dejó escrito

- QA-89: el 2-nov dijo que la tabla larga se puede llevar volando. Está cerrado en `BUGS.md`.
- CG-36: el 3-nov, «me encanta el cómic».
- CG-38: el 3-nov, «menos pasos, 5 o 6, hacerlo fácil y más corto». Va antes que CG-37.
- CG-39: el 3-nov, sí a suavizar los datos sin fuente. Va después de CG-38.
- Tocar `content/ep3`–`ep6` por QA-101 a QA-104: las filas CG-25, CG-26, CG-27 y CG-32 lo autorizan y ya está hecho. El 3-nov por la noche se levantó también el veto de `content/ep2`–`ep6` y de `tests/qa/ep_caminar.js` para CG-38, CG-36, CG-37 y CG-39.

#### Sigue abierto en `PENDIENTES_KELVIN.md`

No hay una línea de aprobación para estos dos:

- **24b. La Maraña.** Sigue en fantasía, solo en el dispositivo. No entra en canon hasta que Kelvin elija.
- **24c. Líneas de Iguaca y las otras mentoras.** El párrafo dice que Lilacina y Oratrix no están en el juego. Está desfasado: CG-19 (`ad2283c5`) ya las enseña en `src/game/dones.js`. No existen `content/ep2`–`ep6/dones.js`. Las líneas nuevas de Iguaca siguen marcadas [KELVIN].

#### Bloqueados por las reglas (al 3-nov, antes de levantar ep2–ep6)

- QA-81 y QA-53: carril de Kimi (`streaming.js`, terreno, `renderer.js`).
- QA-99 y QA-100: eran del agente web; los dos quedaron resueltos en CG-32 y CG-25.
- `tests/qa/ep_caminar.js`: W9 lo tenía en curso; CG-32 lo cerró sin reescribir el apoyo.

Siguen fuera de este carril: edificios, terreno, flora, mapa, `streaming.js`, el modelo y el rig de Vittata, y `sitio/`.

#### Cómo se trabaja

Un solo agente en la nube a la vez. Todo el trabajo de código va en la nube. Rama única: `main`. Antes de cada tarea, `git pull --rebase origin main`. Nunca `--force`. Después de cada commit, otro `git pull --rebase` y se vuelve a leer el bloque 📣 de `docs/equipo/TAREAS_CURSOR_GROK.md`.

Orden que dejó Kelvin el 3-nov: CG-38, luego CG-36, luego CG-37, luego CG-39, y después los bugs de esta zona.

