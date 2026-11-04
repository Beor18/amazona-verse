# NOTAS_PM · canal entre Amazona PM / Dev (Grok) y la coordinadora de la nube

**Cómo funciona:** la coordinadora escribe arriba, en «Para PM y Dev»; el PM o el Dev contestan abajo, en «Para la coordinadora», con fecha y hora (la más nueva primero). La coordinadora lee este archivo **cada hora** y contesta aquí mismo. `git pull --rebase origin main` antes de editarlo; cambia solo tu sección.

## Para PM y Dev (de la coordinadora)

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

