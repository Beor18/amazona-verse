# TAREAS_CURSOR_GROK · carril de Cursor + Grok (desde el 2-nov-2026)

**Orden de Kelvin (2-nov):** «Enfoquémonos en terminar el juego completo». Hasta terminar no hay prompt nuevo. Las preguntas de licencias, origen de recursos, legal y monetización **no bloquean** nada técnico; van a `PENDIENTES_KELVIN.md` §0 y Kelvin les dedica un día aparte.

## Cómo se trabaja aquí
1. **Antes de empezar:** `git pull --rebase`. Toma la **primera tarea libre** de la tabla y cámbiala a `EN CURSO · Cursor|Grok · <fecha y hora AST>` en un commit solo de este archivo. No tomes una tarea que esté EN CURSO a nombre de otro.
2. **Archivos:** solo los de tu tarea, que van en la tabla. Para todo lo demás:
   - **No toques nunca:** edificios, terreno, flora, mapa ni `src/engine/streaming.js`. Es el carril de Kimi (`TAREAS_KIMI.md`).
   - **No toques** `content/ep2`–`ep6` (historia), `sitio/` ni el modelo o rig de Vittata.
3. **Pruebas antes de cada commit de código:**
   - Build: `tools/build/build.sh HEAD tools/build/salida/cg-<tarea>-<sha>`.
   - Pruebas: `tools/build/test.sh tools/build/salida/cg-<tarea>-<sha>/ --extra`.
   - Las 12 obligatorias de `tools/build/config.json` tienen que quedar en verde, con 0 errores de consola.
4. **Al terminar:** `hecha · <commit> · <una línea de resultado>` en la tabla, y una línea en `docs/equipo/REGISTRO_TAREAS.md`. **No se publica:** publica la Mac.
5. **Sin gastos nuevos, descargas ni claves.** Nada de canon: si algo lo pide, anótalo en `PENDIENTES_KELVIN.md` y sigue con lo demás.

## Tabla (en orden)

| Id | Estado | Tarea | Archivos | Hecha cuando |
|---|---|---|---|---|
| CG-1 | descartada (Kelvin, 2-nov: la pastilla se queda como está) | **Pastilla honesta y solo técnica.** `progreso.sh` cuenta también las tareas de `TAREAS_KIMI.md` y las de este archivo. Lo que dependa de una decisión de Kelvin (filas marcadas `decisión de Kelvin`, y `PENDIENTES_KELVIN.md`) **no cuenta** como pendiente técnico. | `tools/build/progreso.sh` | La salida da `{total, cap1, tareas, kimi, cg}`. Una fila nueva libre en TAREAS_KIMI baja el total; una fila «decisión de Kelvin» no lo cambia |
| CG-2 | hecha · e008dee · `docs/equipo/ultima_publicacion.json` en cada «Sitio: publica» (`tools/build/ultima_publicacion.py`) | **Informe de pruebas guardado en cada publicación.** `publicar_mac.sh` y `publicar_nube.sh` escriben `docs/equipo/ultima_publicacion.json`, con el commit, el sitio, cada batería con su resultado, los errores de consola y la carga inicial. Va en el mismo commit `Sitio: publica`. | `tools/build/publicar_mac.sh`, `tools/build/publicar_nube.sh` | Con una publicación en seco (sin push), el JSON queda escrito y coincide con `reporte-test.json` |
| CG-3 | hecha · este commit · caps. 3 a 6 jugados de punta a punta sin teleport, en ES y EN (`ep3e2eTest` 54/55, `ep4e2eTest` 46/47, `ep5e2eTest` 48/51 y `ep6e2eTest` 52/53; lo rojo son los bugs QA-86, QA-87 y QA-88); el cap. 6 pide volar a la percha (QA-89); la base es `tests/qa/ep_caminar.js` | **E2E caminando, caps. 2 a 6.** Cada capítulo de punta a punta **sin teleport** (`S.step` ni posiciones forzadas), solo con la entrada del jugador, en ES y en EN. Toma como base `tests/qa/ep2_e2e.js`. Lo que no se pueda hacer a pie es un bug y va a `BUGS.md` | `tests/qa/ep3_e2e.js` … `ep6_e2e.js` (nuevos) | Las 4 pruebas nuevas en verde con `--extra`, o un bug apuntado por cada paso que no se pueda hacer a pie |
| CG-4 | hecha · b6cce7b · móvil 375×812, caps. 1–6, ES y EN: 0 botones < 44 px, sin scroll horizontal ni textos cortados; el aviso ya no tapa diálogo, gestos ni panel final (QA-90/91/92, más BM116 = QA-96); abiertos QA-93/90/91/93 | **Cazar bugs en móvil 375×812 (táctil), caps. 1 a 6:** textos tapados, botones pequeños, diálogos, Diario, misiones, Retos. Arreglar lo que sea de UI. | `src/ui/`, CSS de `src/game/*.js` (solo estilos) | Lista en `BUGS.md` con captura; arreglos con prueba |
| CG-5 | **no es de este carril** | La investigación de los datos educativos la hace Kelvin con ChatGPT o Gemini (`docs/equipo/INVESTIGACION_KELVIN.md`). Grok no la toma. | — | — |
| CG-6 | hecha · 1e7c8d6 · vista de arranque en la nube: 106 draw calls, 130,8 MB (SwiftShader, calidad baja); solo avisos | **Tope de presupuestos en las pruebas (solo avisos).** La carga inicial ya mide el heap. Añade al informe de `test.sh` los draw calls y la memoria de texturas de la vista de arranque, con aviso si pasan de 150 draw calls o de 300 MB de texturas. **No** hacen fallar la build: los topes que fallan los decide Kelvin. | `tools/build/avtest.py` (solo la parte del informe) | El informe muestra las dos cifras y el aviso |
| CG-7 | libre | **La crecida se juega** (DIVERSION_CAP1 §3, mejora 4): el río sube durante 20 s (hoy 8) y se lleva tres cosas (las tablas de Iguaca, el coquí y un hallazgo). Se agarran en vuelo con `agarre.js` y se sueltan en la colina. Lo salvado se conserva; lo demás se recupera después, sin castigo. | `content/cap1/historia.js` (evento de la crecida), `src/engine/agarre.js` (solo lectura si basta) | missionTest y e2eTest en verde, y una prueba nueva que rescata los 3 objetos |
| CG-8 | libre | **Diálogo que no bloquea** (mejora 3): la exposición (Narrador, Guardián, Voz) sale en bocadillos mientras se vuela, y solo bloquean las decisiones. Regla: ninguna escena de más de 2 líneas sin algo que hacer. **No se borra ni se cambia ninguna línea**: solo cómo se muestran. | `src/game/dialogo.js`, `src/engine/ui.js` | e2eTest y missionTest en verde; segundos con `ui.busy()` < 20 % de la partida |
| CG-9 | libre | **La ruta de la gota se vuela** (mejora 8): en p5 el vapor sube en ráfagas y hay que remontar con él; en p6 la gota baja en tramos de rasante. La lección y las fichas no cambian. | `src/game/educativa.js`, `aula.css` | eduTest y e2eTest en verde |

## Ya no son de este carril
- **Modo creador de mundos:** espera a que el juego esté terminado (Kelvin, 2-nov).
- **BM116, BM119 y BM121:** son de la Mac (`tools/agente_api/cola.txt`).
- **Pieles y documentos desfasados:** son del agente web (ronda 10).
