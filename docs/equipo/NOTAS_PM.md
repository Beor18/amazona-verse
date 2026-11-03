# Notas para Claude · 3-nov-2026

Para la sesión coordinadora. Lo de abajo está comprobado en `main` (`99c62cba` al escribir esto). Si un pendiente no tiene una línea de «aprobado» en el repo, no se da por cerrado.

## En main

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

## Hechos después, ya en el tablero

Comprobado en `docs/equipo/BUGS.md` y `docs/equipo/TAREAS_CURSOR_GROK.md`. QA-101 a QA-103 y QA-105 son CG-25 a CG-28. QA-104 no: es CG-32.

| Bug | Tarea | Commit |
|---|---|---|
| QA-101 y QA-100 | CG-25 | `cc32de59` |
| QA-102 | CG-26 | `46d785ea` |
| QA-103 | CG-27 | `6c8c0712` |
| QA-105 | CG-28 | `6f4604e9` |
| QA-104 y QA-99 | CG-32 | `15a16f6d` |

W9 está hecha como CG-32 (`docs/equipo/TAREAS_WEB.md`: «hecha por Grok · 15a16f6d»). El apoyo de caminar se quedó; el rojo fijo del cap. 6 era el pacto.

## Lo que Kelvin dejó escrito

- QA-89: el 2-nov dijo que la tabla larga se puede llevar volando. Está cerrado en `BUGS.md`.
- CG-36: el 3-nov, «me encanta el cómic».
- CG-38: el 3-nov, «menos pasos, 5 o 6, hacerlo fácil y más corto». Va antes que CG-37.
- CG-39: el 3-nov, sí a suavizar los datos sin fuente. Va después de CG-38.
- Tocar `content/ep3`–`ep6` por QA-101 a QA-104: las filas CG-25, CG-26, CG-27 y CG-32 lo autorizan y ya está hecho. El 3-nov por la noche se levantó también el veto de `content/ep2`–`ep6` y de `tests/qa/ep_caminar.js` para CG-38, CG-36, CG-37 y CG-39.

## Sigue abierto en `PENDIENTES_KELVIN.md`

No hay una línea de aprobación para estos dos:

- **24b. La Maraña.** Sigue en fantasía, solo en el dispositivo. No entra en canon hasta que Kelvin elija.
- **24c. Líneas de Iguaca y las otras mentoras.** El párrafo dice que Lilacina y Oratrix no están en el juego. Está desfasado: CG-19 (`ad2283c5`) ya las enseña en `src/game/dones.js`. No existen `content/ep2`–`ep6/dones.js`. Las líneas nuevas de Iguaca siguen marcadas [KELVIN].

## Bloqueados por las reglas (al 3-nov, antes de levantar ep2–ep6)

- QA-81 y QA-53: carril de Kimi (`streaming.js`, terreno, `renderer.js`).
- QA-99 y QA-100: eran del agente web; los dos quedaron resueltos en CG-32 y CG-25.
- `tests/qa/ep_caminar.js`: W9 lo tenía en curso; CG-32 lo cerró sin reescribir el apoyo.

Siguen fuera de este carril: edificios, terreno, flora, mapa, `streaming.js`, el modelo y el rig de Vittata, y `sitio/`.

## Cómo se trabaja

Un solo agente en la nube a la vez. Todo el trabajo de código va en la nube. Rama única: `main`. Antes de cada tarea, `git pull --rebase origin main`. Nunca `--force`. Después de cada commit, otro `git pull --rebase` y se vuelve a leer el bloque 📣 de `docs/equipo/TAREAS_CURSOR_GROK.md`.

Orden que dejó Kelvin el 3-nov: CG-38, luego CG-36, luego CG-37, luego CG-39, y después los bugs de esta zona.
