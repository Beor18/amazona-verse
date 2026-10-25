# Tablero de producción · Amazona Verse

Lo mantiene QA como validador independiente. Las tareas solo pasan a APROBADO con evidencia de QA (batería o E2E). Actualizado el 2026-10-24 a las 22:55 (hora local).

## Build estable
| | |
|---|---|
| Rama `estable` | **19d152a = v19-publicada**. El reflog la muestra pasando por d978bd0 (v16), 4559da5 (v17), 85db4f0, 0e25e91, f4a31d1 (v18) y 19d152a (v19) |
| E2E de aceptación (`AV.e2eTest`) | v19: **13/13** · v18: **8/13**, el creador no deja empezar (QA-17) |
| Batería `tests/qa` en v19 | selfTest 52/52 · missionTest 35/35 · accessoryTest 12/12 · templateTest 19/19 · eduTest 63/63 · maestroTest 22/22 · criaderoTest 32/32 · movementTest 22/22 · e2eTest 13/13 |
| Consola | v19: 0 errores de JS y 1 recurso que falla (QA-16). main 227f99e: 0, con QA-16 cerrado en 9f970d5 |
| Memoria | 10 cambios de ropa: fuga 0 en geometrías, texturas, programas y objetos |
| Carga en frío (local) | personaje 3D a 1,5 s · **15,1 MB** en 125 peticiones (presupuesto 8 MB) |
| Publicable | **35,5 MB**, presupuesto 30 MB (ropa 11,9, edificios 10,6, entorno 4,0) |
| Draw calls (calidad alta) | 97–112 por cuadro, con post-proceso y sombras |
| FPS (M4, 1950×1110) | En v19 sin medir (el panel no pintaba). En main 227f99e, pintando y en calidad alta: **taller 24,8** con 70 tirones (QA-20), villa 48 y A 60 |

## Tareas por estado
| Estado | Tarea | Dueño | Evidencia o causa |
|---|---|---|---|
| APROBADO | Personaje y ropero sin cambiar la cotorra | TA de personaje | E2E pasos 1–2; accessoryTest; fuga 0 |
| APROBADO | Motor reutilizable y plantilla | Arquitecto | templateTest 19/19 |
| APROBADO | Movimiento, vuelo, nado y agarre | Movimiento | movementTest 22/22 en la batería; táctil sin errores a 375, 768 y 1366 px |
| APROBADO | Guardar y recargar (perfil, misión, refugio, criadero) | Save & Cómic y gameplay | E2E paso 5 |
| APROBADO | Cómic: viñeta del evento y exportar PNG | Save & Cómic y gameplay | E2E paso 6; selfTest |
| APROBADO | Vigilante de memoria y disco con el arreglo QA-11 | Técnico PC | pid 55685; servidores con nice 0 |
| PRUEBAS | Criadero: huevo, eclosión con patitas y compañero | Game designer de huevos | criaderoTest 32/32 y E2E paso 3. Falta una entrada para el jugador fuera de `?criadero=1` y del Modo Maestro |
| PRUEBAS | «La ruta de la gota», aula y Modo Maestro | Gameplay | eduTest 63/63, maestroTest 22/22 |
| PRUEBAS | Mapa de El Yunque: terreno, flora, agua y edificios | Gráfico, level, entorno, edificios | Hay draw calls; faltan FPS en equipo real y bajar la descarga de 15 MB |
| PRUEBAS | Sin terceros y sin texto libre | Seguridad infantil | maestroTest comprueba que no se pide nada a otro origen; el nombre y el cómic salen de listas |
| INTEGRACIÓN | Web con video del pitch | Web lead y editor | `videos.json` con `pitch: null`; el MP4 v1 existe en `~/AmazonaVerse/Pitch` |
| EN CURSO | Accesibilidad con teclado y HUD móvil (QA-04 a QA-08) | Gameplay | BUGS.md |
| EN CURSO | Guardado (`guardado.js` modificado sin commit) | Save & Cómic | `git status` |
| EN CURSO | Build de publicación | Build/Release | `tools/build/config.json` sin commit; no hay build |
| BACKLOG | Bajar la descarga inicial a ≤ 8 MB y lo publicable a ≤ 30 MB | Gráfico, traits, edificios y coordinador | QA-10; CTO_PLAN (gltfpack, carga diferida) |
| BACKLOG | Medir FPS en Chromebook y móvil reales | QA, con el gráfico | Este entorno no pinta con el panel oculto |
| BLOQUEADO | — | — | No hay tareas bloqueadas en v19 |

## Riesgos
1. **Publicar sin E2E:** v18 salió rota para jugadores nuevos. Regla: `estable` se mueve solo con `AV.e2eTest` y la batería en verde, con el informe adjunto.
2. **Peso:** 15,1 MB al arrancar y 35,5 MB publicables; en la red de una escuela eso son decenas de segundos.
3. **Rendimiento sin medir en equipos de escuela.** Además hay cinco contextos WebGL y dos controladores de FPS que pueden pelearse.
4. **Edición cruzada de archivos de otros dueños:** `index.html`, `boot.js`, `comic.js`, `creador.js`, `aula.js` y `character.js` (TEAM_AUDIT.md).
5. **Entregas sin commit:** `docs/pitch`, `tools/video`, `tools/build` y `guardado.js`. Se pierden con una limpieza.
6. **Entorno de trabajo:** swap de 5,8 de 7,2 GB, varios Blender a la vez y el panel del navegador oculto. Hace las cargas lentas y las medidas de FPS inválidas.

## Próximos hitos
- **H1 · v20:** publicar main con QA-16 (ya está), QA-04, QA-05 y QA-20, con el E2E y las 11 baterías en verde (hoy pasan saveTest 27/27 y comicTest 19/19).
- **H2 · Peso:** descarga inicial ≤ 8 MB (carga diferida de ropa, edificios y flora; gltfpack).
- **H3 · Rendimiento real:** matriz de FPS en Chromebook, iPad y Android, con `?calidad=bajo|medio|alto`.
- **H4 · Criadero accesible para el jugador** y el compañero visible en la historia.
- **H5 · Web con el video del pitch v1** y enlace a la build publicada.
