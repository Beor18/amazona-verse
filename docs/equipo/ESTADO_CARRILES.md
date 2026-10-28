# Estado de los carriles

Miércoles 28 de octubre de 2026, 06:48 AST (America/Puerto_Rico, UTC−4).

Lectura cerrada sobre `f66bf77` (06:45 AST). El informe anterior en origin era `cff5e6b` (06:17 AST). Fuentes: la tabla de `docs/equipo/GROK_AGENTES.md`, `docs/equipo/TRABAJO_SIMULTANEO.md`, el final de `docs/equipo/PEDIDOS.md` y el `git log` de `origin/main`. Si el encargo y el tablero no coinciden, manda el tablero. No se reescriben filas ajenas. La fila «Grok · carril A» ya está; no se añade otra.

Horas en AST. ART es Buenos Aires (UTC−3), una hora por delante: 06:40 ART son las 05:40 AST; 07:12 ART son las 06:12 AST; 06:15 ART son las 05:15 AST. 10:06 UTC son las 06:06 AST; 10:12 UTC son las 06:12 AST; 10:20 UTC son las 06:20 AST; 10:45 UTC son las 06:45 AST.

## Por carril

| Carril | Quién | Tarea en curso | Último commit | Parado o bloqueado |
|---|---|---|---|---|
| **A · Móvil y arranque** | Grok · carril A (Cursor), fila A, 28-oct 06:05 AST. Esta sesión. La fila G21 (Grok 3, 06:40 ART = 05:40 AST) es la misma tanda y sigue «en curso»; el resultado se reescribió en `c54832e` (06:43 AST). | QA-53: el congelón al pulsar «Empezar». QA-41 (capa negra `#c1-fade`) queda en cola. | Código en main: `407745e` (06:07 AST, solo `renderer.js`). `c54832e` solo anota la medida. No hay SHA de cierre. | No está parado. AJ1 está libre desde `107cf14` (05:56 AST); Grok 3 lo confirma en PEDIDOS. BUGS sigue «Abierto»: faltan terreno y sólidos, y esos archivos son del carril D. |
| **B · Aldeas** | No libre. Lo tiene G21, «en curso». El resultado de las 06:43 AST dice que piezas y tejados siguen. Esta sesión no lo reclama. | F2.2, tejados rojos; después F2.1 (`_hd` a 90 m en medio y 120 m en alto). Las piezas beige siguen en esta fila, no en C. | `2cca2d4` (autor 06:43 AST, solo `streaming.js`): rojo teja cálido y mate en el `_lejos` y en la celda Savage, sin tocar la piedra Ancient. Al leer, ese commit estaba en el clon y no en origin. El tablero no lo marca hecho. | No. Kelvin ya decidió el rojo (`992cd77`, 05:34 AST). |
| **C · Ciudad del tepuy** | Grok · carril C, tablero «28-oct 07:12 ART» (06:12 AST). Alta `4d3f960` (06:14 AST). Las piezas beige siguen en G21. Esta sesión no las reclama. | G18: piedra crema mate, sin torres con ganchos, cúpulas y el conjunto de la izquierda. No toca vegetación (D) ni tejados Savage (B / G21). | `5425820` (27-oct 15:34 AST): el kit Ancient en la vista aérea. Esta vuelta no tiene SHA. | No. La fila G18 está «en curso». La fila A, más vieja, todavía dice «lista para Kelvin». |
| **D · Selva y bosque** | Grok · carril D, 28-oct 10:06 UTC (06:06 AST). Alta `961083f` (06:10 AST). | G19, segunda vuelta: pared de roca gris, copas en la cima, dosel continuo abajo. | Primera vuelta `8dcf5fb` (27-oct 23:00 AST). La segunda no tiene SHA. | No. La coordinadora pidió no marcarla hecha. Sigue en curso. |
| **E · Cámara y choques** | Grok · carril E, 28-oct 10:12 UTC (06:12 AST). Alta `40385a1` (06:13 AST). Desde `7da99b2` (06:44 AST) la fila está «hecha». | QA-61 y Vittata contra paredes, tejados, puertas y cúpulas. El resultado da las dos por hechas. | `9098859` (06:30 AST, `camara.js`). El cierre con capturas es `7da99b2`. Antes: `3708a47` (06:24), `a0fd44b` y `4c6fc5f` (06:16; este toca `index.html`). | No. No está en curso. BUGS sigue «Abierto» en QA-61: el carril E pidió al H que lo marque cerrado. Posada, QA-27 (2,6 m), queda anotado en ese pedido. |
| **F · Minijuegos** | Grok · carril F. La fila dice «28-oct 06:15» y no pone zona. Alta `30d0f4e` (06:15 AST). G12 sigue «en curso» desde el 26-oct (Claude Sonnet · ahora, duplicada). No se reescribe G12. | QA-49, QA-51, QA-50 y después jugar los minijuegos. | Sin SHA de código. | No. Sigue en curso. |
| **G · Peso y carga** | Grok · carril G. La fila pone «28-oct 11:20 UTC»; el alta `7e103de` es 06:45 AST (10:45 UTC). Estado: **hecha**. | QA-10: bajar la descarga inicial. Ya no está en curso. | `7e103de` (06:45 AST), solo el tablero. Medido en la build `e-qa61c-9098859`: 6,33 MB en 159 archivos (meta 8). | No. No está libre: la fila lo da por hecho. No publicó `sitio/`. |
| **H · Cazar bugs** | Grok · carril H. El tablero dice 28-oct 06:15 ART (05:15 AST). Alta `f2671ea` (06:10 AST). Admite a varios; ahora hay uno en curso. | Capítulos 1 a 6. Encima, dos pedidos: la charla de Iguaca (`a423384`, commit 06:15 AST; la línea dice 10:20 UTC) y marcar QA-61 cerrado en `BUGS.md` (`7da99b2`). | Sin SHA de arreglo. | No para seguir. El pedido de Iguaca dice que esa falla bloquea publicar. No bloquea a los demás carriles. |
| **I · Pruebas** | Grok · carril I. La fila pone «28-oct 11:20 UTC»; el alta `7e103de` es 06:45 AST. Estado: **en curso**. A las 06:17 estaba libre. | QA-60: que `templateTest` y `ep2Test` no salgan en falso rojo si el iframe tarda. La fila no se apunta la otra parte de GROK (pruebas fiables sin GPU). | `f66bf77` (06:45 AST, `src/pruebas/motor.js`): la plantilla espera 90 s. | No. Sigue en curso. BUGS todavía dice QA-60 abierto y habla de `motor.js` sin commit; el código ya está en `f66bf77`. No es un cierre. |

## Libres ahora

**Ninguno con tarea pendiente sin dueño.**

A las 06:17 estaban libres G e I. G quedó hecha e I está en curso. E también quedó hecha. No están libres: **A, B, C, D, F, H e I**. E y G no se retoman: el tablero los da por hechos. H admite a varios; ahora hay uno.

## Notas para la coordinadora

- Sigue en pie `64b7259`: nadie sustituye la tarea de otro ni se detiene.
- Esta sesión es «Grok · carril A». QA-53 sigue en curso. `407745e` midió el peor cuadro de «Empezar» de 6016 ms a 833 ms (SwiftShader, 375×812, dpr 3, CPU ×4; `contextTest` 28/28, `streamingTest` 16/16, 0 errores de consola). `c54832e` solo lo anota. No es un SHA de cierre.
- B y las piezas que flotan no se reclaman. G21 los tiene «en curso» (`c54832e`, 06:43 AST). Grok 3 avisó al carril C: F2.2 toca `streaming.js` solo en el tejado Savage (`avTeja`, `techar`) y no en la piedra Ancient.
- En la nube, `8703a3c` pasó missionTest 70/70 y eduTest 79/79. PEDIDOS (`a423384`), sobre `24efee2` (mismo código), mide 65/70 y 8/39. G21, el registro de QA-53 y el cierre de E anotan los mismos 65/70 y 8/39 «en Iguaca»: sale el bocadillo libre del coro y no la caja que bloquea. EduTest de esa corrida es 8/39; el 79/79 es la pasada de la nube. `content/cap1/pruebas.js`, `content/cap1/historia.js` y `src/game/dialogo.js` no tienen diff desde `8703a3c` hasta `f66bf77`. No es un bloqueo de `main` para los otros carriles. El carril H sí lo tiene como bloqueo de publicar, porque el tablero lo dice.
- Esta sesión no publica `sitio/`. Publicar es solo de la coordinadora.
