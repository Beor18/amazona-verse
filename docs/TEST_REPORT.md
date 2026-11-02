# TEST_REPORT · 2 nov 2026

**Entorno:** `tools/build/test.sh` abre Chrome sin pantalla sobre una build (con GPU real en la Mac; con SwiftShader en la nube). Three.js r128.

## Baterías obligatorias (12)
Salen de `tools/build/config.json` (`pruebas.baterias`). Si una falla, o hay un error de consola, no se publica.

| Batería | Qué cubre |
|---|---|
| `selfTest` | Creador, capítulo completo, eventos, cómic, guardado y migraciones |
| `missionTest` | Misiones y escenas del capítulo 1 |
| `accessoryTest` | Accesorios 3D del ropero |
| `templateTest` | Plantillas del motor |
| `eduTest` | Misión educativa y lecciones |
| `maestroTest` | Aula y Modo Maestro |
| `criaderoTest` | Criadero «Mi nido» |
| `movementTest` | Movimiento, colisiones y vuelo |
| `saveTest` | Guardado y recuperación |
| `comicTest` | Cómic y exportación |
| `e2eTest` | Recorrido completo del capítulo 1 con la build |
| `lookCapitulosTest` | Aspecto de los capítulos |

Antes de las baterías se inyectan `tests/qa/e2e.js`, `ep2_e2e.js`, `temporada_e2e.js` y `zonas56.js`.

## Baterías extra
`test.sh <carpeta> --extra` corre además toda `AV.*Test` disponible que no sea obligatoria: por ejemplo `temporadaE2eTest`, `ep2e2eTest`, `ep2Test` a `ep6Test`, `zonasTest`, `zonas56Test`, `idiomaTest`, `streamingTest`, `contextTest`, `minimapaTest`, `recordsTest`. No bloquean la publicación, pero un rojo nuevo se investiga.

## Cómo se corren
- Build en carpeta propia: `tools/build/build.sh HEAD tools/build/salida/<tarea>-<sha>`.
- Pruebas: `tools/build/test.sh tools/build/salida/<ref>/ --extra`.
- Publicar con pruebas: la nube con `tools/build/publicar_nube.sh` (`--probar` para no publicar); la Mac con `tools/build/publicar_mac.sh`. Siempre con las pruebas obligatorias en verde.
- Cada publicación guarda su informe de pruebas (CG-2) y mide draw calls y texturas de la vista de arranque (CG-6, solo aviso).

## Último resultado conocido
- **12 de 12 en verde** en la publicación **2d6257b** y en la **aa35ad7** (nube), 0 errores de consola.
- `temporadaE2eTest` **31/31** (caps. 1 a 4 en el mundo único, zonas activas); cap. 1 `e2eTest` 47/47.
- `ep2e2eTest` 71/71 en escritorio (ES y EN); en móvil 375×812 dio 70/71 una vez: **QA-85**, intermitente, sin reproducir (`docs/equipo/BUGS.md`).
- Publicaciones con la Mac y GPU real: 4a79ce1 («Sitio: publica 4a79ce1»); su mensaje habla de «13 baterías», cuenta anterior a la lista actual de 12.

## No probado
iPhone y Android con las baterías (solo FPS a mano), Safari de escritorio, Chromebook, lectores de pantalla, niños fuera de la familia de Kelvin.
