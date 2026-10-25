# Tablero de producción · Amazona Verse

Lo mantiene QA como validador independiente. Las tareas solo pasan a APROBADO con evidencia de QA (batería o E2E). Actualizado el 2026-10-25 a las 00:45 (hora local), con la validación de v21.

## Build estable y candidato
| | |
|---|---|
| Rama `estable` | **f3ed616 = v20-publicada** (antes 19d152a = v19) |
| Candidato v21 | **c6fe45d**, armado con `tools/build/build.sh c6fe45d`: PASA, 216 archivos, **29,35 MB** (cumple los 30 MB), sin .glb y con `ave:sin-glb` |
| Batería `tests/qa` en v21 | selfTest 52/52 · missionTest 35/35 · accessoryTest 12/12 · templateTest 19/19 · eduTest 66/66 · maestroTest 22/22 · criaderoTest 40/40 · movementTest 27/27 · saveTest 27/27 · comicTest 19/19 · **e2eTest 14/14** |
| contextTest (1386aec) | No concluyente con el panel oculto: 10/11 y 10/12 (QA-24) |
| Consola | v21: 0 errores, 0 warnings, 0 recursos que fallan y 0 peticiones a terceros |
| Memoria | 10 cambios de ropa: fuga 0. Sólidos: 0,63–0,66 MB (edificios + flora) |
| Carga en frío (local) | **15,25 MB** en 154 peticiones (presupuesto 8 MB, QA-10) |
| Draw calls (calidad alta) | 81–94 por cuadro (v19: 97–112) |
| FPS (M4) | v21 **sin medir**: panel oculto y compartido. Última medida válida: main 8196c65, 60 en taller, villa y A |

## Tareas por estado
| Estado | Tarea | Dueño | Evidencia o causa |
|---|---|---|---|
| APROBADO (v21) | Sólidos de la geometría real: chocar, pararse en techos y posarse (6cc3f16, 5f0c6e4, f26be1b) | Movimiento | movementTest 27/27 con el caso genérico; vuelo manual con V hasta los postes de la casa plataforma, posado fino y Δ 0; 0,63 MB y 0,029 ms por paso en móvil |
| APROBADO (v21) | Criadero en el juego normal: nido tras M1 y botón «Nido» (d4a7a45) | Huevos | criaderoTest 40/40; E2E 14/14 con el paso nuevo; a mano: presentación única, HUD, acción E y persistencia |
| APROBADO (v21) | Paradas de aprendizaje en la aldea (a125977) | Gameplay | eduTest 66/66; a mano: respuesta, registro y XP. QA-23 (pista duplicada) es baja |
| APROBADO (v21) | Accesibilidad y HUD móvil, QA-04 a QA-08 (f3ed616) | Gameplay | Foco en creador y Diario, `role="alert"`, objetivo de 45 px y aviso sin cortes a 375×812 |
| APROBADO (v21) | Build de publicación reproducible (`build.sh`, cf88cdd y 0962f07) | Build/Release | La build sale en 29,35 MB y el juego corre desde ella con las 11 baterías en verde |
| PRUEBAS | Recuperar el contexto WebGL (1386aec) | Gráfico | QA-24: repetir contextTest con el panel visible |
| EN CURSO | El haz de objetivo tapa media pantalla con la cámara cerca (QA-22) | Gráfico | BUGS.md |
| APROBADO | Personaje y ropero sin cambiar la cotorra | TA de personaje | E2E pasos 1–2; accessoryTest; fuga 0 |
| APROBADO | Motor reutilizable y plantilla | Arquitecto | templateTest 19/19 |
| APROBADO | Movimiento, vuelo, nado y agarre | Movimiento | movementTest 22/22 en la batería; táctil sin errores a 375, 768 y 1366 px |
| APROBADO | Guardado v5: escritura atómica, recuperación y migraciones (c3b44e8) | Save & Cómic | saveTest 27/27 y 28/28 con iframe; corrupción, versión futura y almacén bloqueado probados a mano; E2E paso 5 |
| APROBADO | Cómic con la apariencia del jugador y PNG verificado (92f5364) | Save & Cómic | comicTest 19/19; E2E paso 6; exportar sin downloads muestra la imagen con Descargar, Abrir y Copiar |
| APROBADO | Mundo sin tirones en el taller (QA-20, 8196c65) | Programador gráfico | 60 FPS en taller, villa y A con calidad alta en un M4, pintando |
| APROBADO | Vigilante de memoria y disco con el arreglo QA-11 | Técnico PC | pid 55685; servidores con nice 0 |
| PRUEBAS | «La ruta de la gota», aula y Modo Maestro | Gameplay | eduTest 63/63, maestroTest 22/22 |
| PRUEBAS | Mapa de El Yunque: terreno, flora, agua y edificios | Gráfico, level, entorno, edificios | Hay draw calls; faltan FPS en equipo real y bajar la descarga de 15 MB |
| PRUEBAS | Sin terceros y sin texto libre | Seguridad infantil | maestroTest comprueba que no se pide nada a otro origen; el nombre y el cómic salen de listas |
| INTEGRACIÓN | Web con video del pitch | Web lead y editor | `videos.json` con `pitch: null`; el MP4 v1 existe en `~/AmazonaVerse/Pitch` |
| EN CURSO | Guardado (`guardado.js` modificado sin commit) | Save & Cómic | `git status` |
| BACKLOG | Bajar la descarga inicial a ≤ 8 MB (lo publicable ya cumple: 29,35 MB) | Gráfico, traits, edificios y coordinador | QA-10; CTO_PLAN (gltfpack, carga diferida) |
| BACKLOG | Medir FPS en Chromebook y móvil reales | QA, con el gráfico | Este entorno no pinta con el panel oculto |
| BLOQUEADO | — | — | No hay tareas bloqueadas en v21 (c6fe45d) |

## Riesgos
1. **Publicar sin E2E:** v18 salió rota para jugadores nuevos. Regla: `estable` se mueve solo con `AV.e2eTest` y la batería en verde, con el informe adjunto.
2. **Peso:** 15,1 MB al arrancar y 35,5 MB publicables; en la red de una escuela eso son decenas de segundos.
3. **Rendimiento sin medir en equipos de escuela.** Además hay cinco contextos WebGL y dos controladores de FPS que pueden pelearse.
4. **Edición cruzada de archivos de otros dueños:** `index.html`, `boot.js`, `comic.js`, `creador.js`, `aula.js` y `character.js` (TEAM_AUDIT.md).
5. **Entregas sin commit:** `docs/pitch`, `tools/video`, `tools/build` y `guardado.js`. Se pierden con una limpieza.
6. **Entorno de trabajo:** swap de 5,8 de 7,2 GB, varios Blender a la vez y el panel del navegador oculto. Hace las cargas lentas y las medidas de FPS inválidas.

## Próximos hitos
- **H1 · v20:** publicar main (8196c65 o posterior) con QA-16 y QA-20 ya cerrados, y si da tiempo QA-04 y QA-05. Requisito: el E2E y las 11 baterías en verde con la ventana con tamaño (QA-21).
- **H2 · Peso:** descarga inicial ≤ 8 MB (carga diferida de ropa, edificios y flora; gltfpack).
- **H3 · Rendimiento real:** matriz de FPS en Chromebook, iPad y Android, con `?calidad=bajo|medio|alto`.
- **H4 · Criadero accesible para el jugador** y el compañero visible en la historia.
- **H5 · Web con el video del pitch v1** y enlace a la build publicada.
