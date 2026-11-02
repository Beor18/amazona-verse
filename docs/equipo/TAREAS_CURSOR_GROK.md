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
| CG-1 | hecha en parche, sin integrar: Kelvin elige el cálculo (65 % por tablero o 82 % por fila) | **Pastilla honesta y solo técnica.** `progreso.sh` cuenta también las tareas de `TAREAS_KIMI.md` y las de este archivo. Lo que dependa de una decisión de Kelvin (filas marcadas `decisión de Kelvin`, y `PENDIENTES_KELVIN.md`) **no cuenta** como pendiente técnico. | `tools/build/progreso.sh` | La salida da `{total, cap1, tareas, kimi, cg}`. Una fila nueva libre en TAREAS_KIMI baja el total; una fila «decisión de Kelvin» no lo cambia |
| CG-2 | hecha · e008dee · `docs/equipo/ultima_publicacion.json` en cada «Sitio: publica» (`tools/build/ultima_publicacion.py`) | **Informe de pruebas guardado en cada publicación.** `publicar_mac.sh` y `publicar_nube.sh` escriben `docs/equipo/ultima_publicacion.json`, con el commit, el sitio, cada batería con su resultado, los errores de consola y la carga inicial. Va en el mismo commit `Sitio: publica`. | `tools/build/publicar_mac.sh`, `tools/build/publicar_nube.sh` | Con una publicación en seco (sin push), el JSON queda escrito y coincide con `reporte-test.json` |
| CG-3 | libre | **E2E caminando, caps. 2 a 6.** Cada capítulo de punta a punta **sin teleport** (`S.step` ni posiciones forzadas), solo con la entrada del jugador, en ES y en EN. Toma como base `tests/qa/ep2_e2e.js`. Lo que no se pueda hacer a pie es un bug y va a `BUGS.md` | `tests/qa/ep3_e2e.js` … `ep6_e2e.js` (nuevos) | Las 4 pruebas nuevas en verde con `--extra`, o un bug apuntado por cada paso que no se pueda hacer a pie |
| CG-4 | libre | **Cazar bugs en móvil 375×812 (táctil), caps. 1 a 6:** textos tapados, botones pequeños, diálogos, Diario, misiones, Retos. Arreglar lo que sea de UI. | `src/ui/`, CSS de `src/game/*.js` (solo estilos) | Lista en `BUGS.md` con captura; arreglos con prueba |
| CG-5 | **no es de este carril** | La investigación de los datos educativos la hace Kelvin con ChatGPT o Gemini (`docs/equipo/INVESTIGACION_KELVIN.md`). Grok no la toma. | — | — |
| CG-6 | hecha · 1e7c8d6 · vista de arranque en la nube: 106 draw calls, 130,8 MB (SwiftShader, calidad baja); solo avisos | **Tope de presupuestos en las pruebas (solo avisos).** La carga inicial ya mide el heap. Añade al informe de `test.sh` los draw calls y la memoria de texturas de la vista de arranque, con aviso si pasan de 150 draw calls o de 300 MB de texturas. **No** hacen fallar la build: los topes que fallan los decide Kelvin. | `tools/build/avtest.py` (solo la parte del informe) | El informe muestra las dos cifras y el aviso |

## Ya no son de este carril
- **Modo creador de mundos:** espera a que el juego esté terminado (Kelvin, 2-nov).
- **BM116, BM119 y BM121:** son de la Mac (`tools/agente_api/cola.txt`).
- **Pieles y documentos desfasados:** son del agente web (ronda 10).
