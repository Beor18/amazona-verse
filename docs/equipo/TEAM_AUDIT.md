# Auditoría del equipo · validador independiente (QA)

Foto del 2026-10-24 a las 22:50 (hora local), con la validación de Save & Cómic y QA-20 a las 23:05, sobre `main` = `estable` = v19-publicada = 19d152a (antes, v18-publicada = f4a31d1). El repo cambia minuto a minuto: todo se puede comprobar con el hash o el comando citado. QA no aprueba su propia entrega.

**Escala:** no localizada → entregada (hay archivos o commits) → integrada (el juego o el canal publicado la carga) → probada (una prueba automática la cubre y pasa) → aprobada (QA la validó de forma independiente: batería y E2E sobre la build, sin bugs altos abiertos en esa área).

Roles en `~/AmazonaVerse/_trabajo_claude/equipo_ids.md`: 20 más el coordinador (no 27). Si faltan estados, no están en ese archivo.

| Rol | Estado | Evidencia | Huecos y riesgos |
|---|---|---|---|
| Programador gráfico | **integrada** | f89b5b6 (El Yunque en el juego), 3433a6b, a54424f, 4559da5, a5a72ac. index.html carga terreno, agua, fx, renderer, mundo y vegetacion | Sin prueba propia. En la batería de main: descarga inicial de 15,1 MB en 125 peticiones (presupuesto 8 MB). QA-20 cerrado en 8196c65: el taller da 60 FPS en calidad alta (mín 53, 0 tirones). Hay dos controladores de FPS en `renderer.js`: `adaptDPR` en la línea 30 y los presets de calidad en la línea 61 |
| TA de personaje | **aprobada** (personaje y ropero, en main) | 4ff0217, 99f5900, ed8a54f. accessoryTest 12/12. Fuga de memoria 0 tras 10 cambios de ropa. E2E paso 1: el protagonista y el compañero tienen la misma firma que el modelo base (17 146 vértices, 6 mallas, 60 huesos) | `character.js` lo editan dos dueños (TA y movimiento: d03bcd6, 4e654de). El catálogo de accesorios está partido entre `character.js` y `wardrobe.js` |
| Artista de traits | **probada** | Ropa de f854d76 a 0a78d42: 37 .glb más sus _glb.js, todos en los mapas glb de `wardrobe.js`. accessoryTest monta todas las piezas y estilos. Todas cargan en menos de 10 s | La ropa pesa 11,9 MB en _glb.js (QA-10). Hay un `.pyc` versionado en `tools/blender/__pycache__` |
| Programador de gameplay | **probada** | c6cd555, 821e9e2, 331f451, 3f3fe35, d978bd0 y cc176a4. QA lo confirmó en v19: selfTest 52/52, missionTest 35/35, eduTest 63/63 y maestroTest 22/22. E2E pasos 4 y 6 bien | QA-04, QA-05, QA-06, QA-07 y QA-08 (accesibilidad y móvil) siguen abiertos. Error de consola: `dialogo.js:37` asigna `src=''` a `#d-img` y el navegador pide la propia página (QA-16) |
| Game designer de huevos | **probada** | a7c270b, f338cfc, 6a1cb3c y 19d152a. criaderoTest 32/32. E2E paso 3: se obtiene el huevo, las patitas pasan de escala 0,001 a 1 y la cápsula queda nacida. El compañero está conectado: `G.on('companero')` en `actores.js:338` (0e25e91) | El jugador solo entra con `?criadero=1` o desde el Modo Maestro; no encontré otra entrada. f338cfc también tocó `index.html` y `boot.js`, que son del coordinador. Usa su propio WebGLRenderer (`criadero.js:500`) |
| Level designer | **integrada** | b195d34 y 1f57462. `assets/models/mapa` (13 GLB) y `assets/data/mapa_cap1*.js`, cargados por terreno, agua y mundo | Sin prueba propia. El E2E usa su POI `poza_honda` y funciona. No verifiqué qué estructuras propias se ven en pantalla |
| Artista de entorno | **integrada** | 81a38ea y b6ab163. Kit de 21 GLB que usa `vegetacion.js` | 37 de las 45 texturas de `assets/tex/entorno` no las referencia nadie (los GLB llevan sus propias imágenes), unos 3 MB muertos |
| QA | **probada** (no se aprueba a sí misma) | c86dffa, 6790883 y este lote: `tests/qa/qa.js`, `e2e.js`, `BUGS.md` | Hace falta otro rol que revise la batería |
| Arquitecto (terminado) | **aprobada** | 4ff0217, 4fcbd43, f6c9fb3 y 498aa36. templateTest 19/19 en main (otro pack arranca con el mismo motor) | — |
| UI/UX (terminado) | **integrada** | 4d0191e y bbc0012: tokens.css, ui.css, ui.js y pausa.js, todos enlazados | Sin prueba propia. Sus bugs de accesibilidad y móvil pasaron a gameplay |
| TA de edificios (terminado) | **integrada** | d5a23ac: 21 GLB que `mundo.js` carga desde `mapa_cap1.js`, por grupos al acercarse (4559da5) | 10,6 MB en _glb.js (QA-10). Sin prueba |
| Técnico PC (terminado) | **aprobada** | 3675a5a: `vigilante.sh` y TECNICO_PC.md. El vigilante corre (pid 55685) con el arreglo QA-11: los servidores con el python de Blender ya no se bajan de prioridad (nice 0, comprobado con `ps`) | Es una herramienta del sistema, no del producto |
| Web lead | **entregada** | `~/AmazonaVerse/Web`, repo propio: e836503, 868646e y ee0b2dd | `assets/video/videos.json` tiene `"pitch": null` y `"hero": null`: no hay video conectado. No encontré enlace al juego. Sin pruebas |
| Comité de pitch | **entregada, sin commit** | `docs/pitch/GUION.md`, `TOMAS.json` y `VO.txt` están sin versionar (`git status`: `??`) | Se pierden si alguien limpia la copia de trabajo |
| Editor de video | **entregada, sin commit** | `tools/video/*` sin versionar. `~/AmazonaVerse/Pitch/AmazonaVerse_Pitch_v1.mp4` y la versión `_ligero` | El video no está en la Web (`videos.json` en null) |
| Ingeniero de sonido | **entregada** | cc866cb (`tools/audio/*` y `AUDIO.md`) | La mezcla del pitch no la usa ni la Web ni el juego; el juego sintetiza su sonido con WebAudio en `audio.js` |
| Movimiento y animación | **aprobada** | ea77350, f4b5c55, d03bcd6, a58d907, 4e654de, b7182ce y 0e25e91. movementTest 22/22 en la batería de v19, después de las demás pruebas (antes dependía del orden; corregido en b7182ce). En táctil, Volar/Aterrizar funciona sin errores a 375, 768 y 1366 px. El IK cuesta 0,17 ms por cuadro | a58d907 tocó `index.html` y `boot.js`. MOVIMIENTO.md existe (7ab8e5b) |
| Build/Release engineer | **entregada, sin commit** | `tools/build/config.json` (2,9 KB, 22:35) sin versionar | No hay build generada ni script |
| Save & Cómic engineer | **aprobada** (c3b44e8 guardado v5 y 92f5364 cómic) | Validado por QA en un worktree limpio de 8196c65 con la ventana a 1280×720: saveTest 27/27, saveTest({ iframe: true }) 28/28 y comicTest 19/19, con localStorage y G.S idénticos antes y después. A mano: con el almacén bloqueado arranca, deja crear personaje y avisa sin errores; una partida corrupta va a `.unreadable` y se recupera `.prev` con aviso; una de versión futura (v99) se aparta igual; exportar PNG sin la capacidad downloads muestra la imagen con Descargar, Abrir y Copiar. E2E pasos 5 y 6 bien | No verificable aquí: la ventana de downloads del visor de artifacts. QA-21 (captura vacía con la ventana en 0×0) es compartido con el gráfico |
| Seguridad infantil | **integrada** | 46a3535 (auditoría), 48524f5 (three.js propio), b44a44e (fuentes propias), 647ebfd y 10f9671 (nombre y cómic desde listas, sin texto libre) | **b44a44e dejó roto el creador** hasta 10f9671 (BLOQUEANTE en v18-publicada, QA-17). Editó archivos de gameplay (`aula.js`, `creador.js`, `aula.css`, `pruebas.js`), de Save & Cómic (`comic.js`) y del coordinador (`index.html`) |
| Coordinador | **integrada** | 3675a5a, b10f99e, bc4f047, e3df587 y f4a31d1. Etiquetas v16 a v19. v19-publicada (19d152a) pasa el E2E 13/13 y la batería completa (QA, 22:50) | v18-publicada salió sin pasar el E2E y estaba rota para jugadores nuevos (QA-17, corregido en v19). Regla propuesta: `estable` solo se mueve con el E2E en verde |

## Duplicaciones y conflictos
- **Archivos editados por quien no es su dueño:**
  - `index.html` y `src/boot.js`, del coordinador: f89b5b6, d978bd0, 3f3fe35, bbc0012, 9167c8f, a58d907, f338cfc y b44a44e.
  - `comic.js` y `guardado.js`, de Save & Cómic: 647ebfd y 10f9671.
  - `creador.js` y `aula.js`, de gameplay: 647ebfd y 10f9671.
  - `character.js`, de TA y movimiento a la vez.
  - El caso de b44a44e fue grave: el markup del nombre llegó a `index.html` antes que su JS (QA-17).
- **Cinco WebGLRenderer:** `renderer.js:26`, `creador.js:118`, `criadero.js:500`, `character.js:1025` (retrato) y `showcase.js:92`. En móvil, cada contexto WebGL cuenta.
- **Dos controladores de FPS** en `renderer.js`: la resolución dinámica del TA y los presets de calidad del gráfico. Los dos reaccionan a los mismos cuadros lentos.
- **Catálogo de accesorios en dos sitios:** `character.js` (gafas, sombrero, pañuelo, brújula, mochila, brazaletes) y `wardrobe.js` (lentes, sombrero2, equipo…), con piezas parecidas por ranura.
- **Archivos sin dueño en la tabla de COORDINACION.md:** `vegetacion.js`, `core.js`, `assets.js`, `audio.js`, `pausa.js`, `src/engine/ui.js`, `src/pruebas/*`, y en `content/cap1` historia, educativa, pack, pruebas, coleccionables y dialogos.

## Sin conectar
- `assets/models/vittata_base.glb` (10,9 MB, versionado), `vittata_base_lod1.glb` (0,5 MB) y `terreno_amazonas.glb` (0,9 MB): nada los referencia.
- 37 texturas de `assets/tex/entorno`.
- El video y la mezcla del pitch no están conectados a la Web.
- El criadero no tiene entrada para el jugador fuera de `?criadero=1` y el Modo Maestro.
