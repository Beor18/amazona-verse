# Estado de los carriles

Miércoles 28 de octubre de 2026, 06:05 AST (America/Puerto_Rico, UTC−4).

No había adjunto `ESTADO_CARRILES.md` en el entorno (ni en el workspace, ni en `/tmp`, ni en `/home/ubuntu`). Este texto sale de `docs/equipo/GROK_AGENTES.md`, el final de `docs/equipo/PEDIDOS.md`, `docs/equipo/TRABAJO_SIMULTANEO.md` y `git log`. No se inventan SHAs. No se marca hecha ninguna tarea que siga abierta.

Horas en AST. Un dato del tablero viene en ART (Buenos Aires, UTC−3): 06:40 ART son las 05:40 AST.

## Quién se queda A, B y C

La tabla de `GROK_AGENTES.md` (commit `f2089c7`, 28-oct 05:43 AST) dice:

- **A · Móvil y arranque:** QA-53 (el congelón al pulsar «Empezar») y después QA-41.
- **B · Aldeas:** F2.2, tejados rojos, y después F2.1.
- **C · Ciudad del tepuy:** G18 (la meta de Kelvin) y después las piezas beige que flotan.

Eso coincide con el pedido: A es el congelón, B los tejados rojos y C las piezas que flotan (C empieza por G18, que sigue «lista para Kelvin»). El final de `PEDIDOS.md` deja elegir: apuntarse solo en A, o quedarse con los tres y decirlo. Kelvin ordenó las tres en secuencia y ya están en curso en esta copia. **Esta sesión de Grok (Cursor) toma A y también B y C.** No se dejan B ni C libres.

La fila G21 del tablero es la misma tanda, con el nombre viejo «Grok 3». No se borra. Otro agente de esta copia ya está programando el QA-53: no se toca su código desde este alta.

## Por carril

| Carril | Quién | Qué hace | Último commit | Situación |
|---|---|---|---|---|
| **A** | Grok · carril A (Cursor), 28-oct 06:05 AST. Misma tanda que G21 (Grok 3, tablero «28-oct 06:40 ART» = 05:40 AST; el alta es `3a2a0a3`, 05:43 AST). | QA-53: que «Empezar» no congele. QA-41 queda en cola (capa negra `#c1-fade`). | En esta copia, solo `src/engine/renderer.js`, todavía no estaban en `origin/main` al escribir esto: `cbe5258` (05:52 AST), `c76bd31` (05:57), `f41e26b` (06:01), `a1870de` (06:05, el último). | **En curso.** QA-53 sigue abierto en `BUGS.md`. No está hecha. |
| **B** | La misma sesión. | F2.2: tejados rojos teja, cálidos y mates, dentro de `vibrant_toon`. Luego F2.1 (`_hd` a 90 m en medio y 120 m en alto). | Sin commit de tejados. Decisión de Kelvin: `992cd77`, 28-oct 05:34 AST. Último toque de `src/engine/streaming.js`: `96ebd0f`, 27-oct 17:07 AST (atlas en el móvil, no tejados). | **En curso, sin commit de tejados.** No está hecha. |
| **C** | La misma sesión, por las piezas. G18 no se reabre. | Primero la ciudad (G18). Después, las 3 o 4 piezas beige que flotan en la pared del tepuy (vista `render2022`). | G18: `5425820`, 27-oct 15:34 AST. Piezas: sin commit. | **En curso las piezas, sin commit.** G18 sigue «lista para Kelvin», no hecha. |
| **D** | Nadie en la última hora. | G19, segunda vuelta (selva del tepuy). | `8dcf5fb`, 27-oct 23:00 AST (03:00 UTC del 28). Revisión de la coordinadora: `de3ae0f`, 28-oct 05:29 AST. | **Libre.** El tablero dice G19 «hecha». `PEDIDOS.md` (28-oct por la mañana) pide «lista para Kelvin», no hecha. No se cambia esa fila aquí. |
| **E** | Nadie. | QA-61 (la vista que se agranda) y choques de Vittata con edificios. | `src/engine/camara.js`: `5ae4751`, 26-oct 16:27 AST. | **Libre.** QA-61 abierto. No hay fila G20 «en curso». |
| **F** | Nadie en la última hora. | QA-49 (losa de River Rush), QA-51 (riverTest y bandadaTest), QA-50 (botón del desvío del Tren) y jugar los minijuegos. | `410349e` (27-oct 14:43, River), `24caa6c` (27-oct 16:41, Flight), `6d72ab6` (27-oct 14:19, Tren), `e8c8377` (27-oct 17:09, Maze, récords y menú). `bandada.js`: `5b7a512`, 26-oct 13:45 AST. | **Libre** por la regla de la última hora. QA-49, QA-51 y QA-50 siguen abiertos. El tablero aún dice G12 «en curso» (Claude Sonnet · ahora, fila duplicada, desde el 26-oct). No se toca. |
| **G** | Nadie. | QA-10: bajar la descarga inicial. | Carga de `src/personaje/`: `521097d`, 25-oct 18:12 AST. `tools/build/`: `96ebd0f`, 27-oct 17:07 AST. | **Libre.** QA-10 abierto a medias (descarga inicial 15,25 MB en `BUGS.md`). |
| **H** | Nadie apuntado. Admite a varios. | Cazar bugs de los capítulos 1 a 6. | — | **Libre.** |
| **I** | Nadie. | QA-60 (templateTest y ep2Test en falso rojo) y pruebas sin GPU. | `ba2f6f9`, 27-oct 14:43 AST (`src/pruebas/`, `test.sh`, `avtest.py`). | **Libre.** QA-60 abierto. |

## Libres ahora

**D, E, F, G, H e I.** El primero libre para un Grok nuevo es el **D**.

## Tomados

**A, B y C**, por esta sesión (Grok · carril A). La única fila «en curso» de hoy en el tablero, aparte de esta alta, es G21: es la misma tanda, no un segundo dueño.

## Desfases vistos (no se reescriben filas ajenas)

- `origin/main` tiene `107cf14` (28-oct 05:56 AST): deja libres AB1, AC1, AH1, AH2, AJ1, C12 y C13. Esta copia aún no lo tenía al redactar; entra con el rebase. G21 sigue diciendo que AJ1 tiene `renderer.js` «en curso». Tras `107cf14`, AJ1 ya no lo bloquea.
- G19 está «hecha» en el tablero y la coordinadora pidió volver a «lista para Kelvin». Se anota; no se cambia la fila.
- G12 sigue «en curso» desde el 26-oct, duplicada. No cuenta como carril tomado hoy.
- Los commits de QA-53 estaban solo en esta copia de `main`, no en `origin`, al escribir este archivo: cuatro, el último `a1870de` (06:05 AST). Si el rebase les cambia el SHA, el que queda en `main` es el que vale.
