# Tareas para el ejecutor del Agent SDK (créditos de la API)

Las corre `tools/agente_api/ejecutar.sh` con los créditos promocionales de la API de Kelvin ($200, vencen el 29-oct-2026), y no con el plan Max. Hay **4 carriles que pueden correr en paralelo**, uno por pestaña de Terminal, porque cada carril toca archivos distintos. Dentro de un carril, las tareas van en orden.

## Reglas (obligatorias)
- **Repo y rama:** el repo es `~/AmazonaVerse/Juego` y hay **una sola rama, `main`**. Nada de ramas ni worktrees.
- **Antes de empezar:** lee `docs/equipo/COORDINACION.md` y `ROADMAP.md`.
- **Tu zona:** quédate en los archivos de tu carril. Si necesitas tocar otro, hazlo en un commit aparte y mínimo, y explícalo en el resultado.
- **Commits:**
  - Pequeños, solo de tus archivos (`git add` de rutas concretas; revisa con `git diff --cached`).
  - Si git dice `index.lock`, espera 20 s y reintenta: hay otros carriles haciendo commit.
  - Prohibido `checkout`, `reset` y `stash`.
- **No publiques:** nada de push ni de `sitio/`. La sesión principal revisa y publica.
- **Pruebas** antes de cada commit de código:
  - `taskpolicy -b nice -n 15 tools/build/build.sh HEAD` y luego `tools/build/test.sh tools/build/salida/<ref>/ --extra`.
  - Las 13 baterías tienen que quedar en verde, con 0 errores de consola.
- **Recursos:**
  - Nunca `python3` del sistema: usa `~/Applications/Blender.app/Contents/Resources/4.2/python/bin/python3.11 -I`.
  - Nada de descargas, cuentas ni claves.
  - No borres nada de forma permanente.
- **Datos:** nada de datos inventados. Lo educativo lleva fuente verificable, y lo que no se pueda verificar va como «por verificar».
- **Público:** el juego es **para todas las edades**. Nunca escribas «grados 3 a 6». Los niveles del Aula son «Nivel 1» y «Nivel 2».
- **Al terminar cada tarea:** márcala en la tabla «Estado» con su commit y una línea de resultado.

## Carril A: motor, rendimiento y CI
**A1 · QA-30, `contextTest` intermitente** (`src/engine/renderer.js`). Dentro de la batería a veces da 12/13. Hazla estable sin bajar lo que comprueba: la batería completa debe dar 13/13 tres veces seguidas.

**A2 · Integración continua** (`.github/workflows/pruebas.yml`, nuevo). Un workflow en `macos-latest` que, en cada push a `main`, haga lo siguiente:
- Instale gltfpack 1.2 del release oficial de zeux/meshoptimizer y verifique su SHA256 contra `docs/equipo/BUILD.md`.
- Corra `tools/build/build.sh HEAD` y `tools/build/test.sh … --extra` con el Chrome del runner.
- Falle si alguna batería falla.

No lo puedes probar en GitHub: déjalo validado con `actionlint` mental y explícalo en el resultado.

**A3 · Calidad automática en equipos modestos** (`src/engine/renderer.js`). Detecta GPU o equipos débiles (Chromebook, móvil) por `WEBGL_debug_renderer_info`, núcleos, memoria y FPS de los primeros segundos, y arranca en calidad baja o media. Sin cambios en equipos potentes. Añade casos a `contextTest`, o una prueba propia expuesta para que la sesión principal la enlace en `boot.js`.

## Carril B: movimiento, cámara y flora
**B1 · Fundido de la flora entre la cámara y Vittata** (`src/engine/vegetacion.js`). La planta que tapa a la cotorra se vuelve translúcida. Haz 2 capturas, antes y después, en `docs/img/`.

**B2 · P2 de movimiento** (`src/engine/fisica.js`, `solidos.js`, `camara.js`):
- el toldo bajo no le roza la cabeza;
- la cuerda del puente colgante sirve de percha.

Añade casos a `movementTest` (`src/pruebas/movimiento.js`).

**B3 · Posarse en piezas decorativas** (estacas, empalizadas, canoas, postes de la escena de Kelvin), en `solidos.js`. Que tengan una superficie para posarse sin volver a la colisión maciza. Añade un caso en `movementTest`.

**B4 · Interiores de edificios grandes** (`src/engine/solidos.js`, `streaming.js` solo si hace falta). Los edificios por los que no se puede entrar no se ven macizos al acercarse: el umbral de la puerta queda bloqueado de forma visible, con una puerta cerrada o una tela, para que Vittata no atraviese nada. Haz 1 captura.

## Carril C: contenido educativo y especies
**C1 · Especies en el Diario** (`src/game/diario.js`, `content/comun/especies.js` solo para leerlo).
- Muestra una sección «Amazonas del mundo» con las especies que tienen datos verificados: nombre común (ES y EN), nombre científico, distribución, estado UICN y fuente.
- Las 13 especies de `docs/equipo/ESPECIES_DISCREPANCIAS.md` van **sin estado UICN** hasta que Kelvin decida.
- Añade casos de prueba.

**C2 · Diseño del episodio 2, «Un lugar para todos»** (`docs/equipo/EP2_*.md`, solo documentos). Prepara el GDD, la narrativa y 3 misiones con lecciones alineadas. Tienen que encajar con `docs/STORY_BIBLE.md` y reutilizar el motor, el ropero, el criadero y el cómic. Deja al final una lista de decisiones de canon para Kelvin, sin decidirlas tú.

**C3 · Paradas de aprendizaje en la escena de Kelvin** (`content/cap1/paradas.js` y `assets/data/mapa_cap1.js` solo para la posición).
- 5 paradas nuevas de ciencia o cultura de Puerto Rico, con datos verificados y fuente, en ES y EN.
- Cada una a 5 m o más de otros puntos interactivos.
- `eduTest` en verde.

## Carril D: interfaz, accesibilidad y documentación
**D1 · Documentación de arquitectura** (`docs/ARQUITECTURA.md`). Agrega secciones breves, con rutas de archivo, sobre:
- el streaming de edificios;
- meshopt y WebP en la build;
- la recuperación de contexto WebGL;
- `tools/build/sitio.sh` y `sitio/`;
- el ejecutor `tools/agente_api`.

**D2 · Ajustes de accesibilidad** (`src/ui/*`, `src/game/*` del menú de pausa).
- Tamaño de texto en 3 niveles y alto contraste.
- Se guardan en la partida, y en el móvil no desbordan nada.
- Añade casos de prueba.

**D3 · Remapeo de teclas** (`src/engine/input.js` y la UI de ajustes). Que se puedan cambiar las teclas de mover, volar, aterrizar y acción, con un botón para restablecerlas. Las teclas elegidas se guardan.

## Estado
| Tarea | Estado | Commit | Resultado |
|---|---|---|---|
| A1 | pendiente | | |
| A2 | hecha | 642ffc8 | `.github/workflows/pruebas.yml`: push a `main` → macos-latest, Python 3.11 + numpy/OpenImageIO como `AV_PYTHON`, gltfpack 1.2 con SHA256 del zip y del binario leídos de `BUILD.md`, `build.sh HEAD`, `test.sh --extra` con el Chrome del runner y un paso que lee `reporte-test.json` y falla si cualquier batería (también las extra) no pasa; sube los reportes. Sin probar en GitHub: YAML parseado con Ruby, greps de SHA y chequeo de baterías probados en local (13/13). Riesgo: que el runner no tenga GPU Metal para `--use-angle=metal`. Sin baterías: no toca nada de la build. |
| A3 | pendiente | | |
| B1 | pendiente | | |
| B2 | pendiente | | |
| B3 | pendiente | | |
| B4 | pendiente | | |
| C1 | pendiente | | |
| C2 | pendiente | | |
| C3 | pendiente | | |
| D1 | hecha | 8808c5a | `docs/ARQUITECTURA.md`: secciones nuevas de meshopt/WebP en la build, contexto WebGL, `sitio.sh`/`sitio/` y `tools/agente_api`; el streaming ya estaba documentado. Solo docs, sin baterías. |
| D2 | pendiente | | |
| D3 | pendiente | | |
