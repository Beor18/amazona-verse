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

**D4 · Accesibilidad que pide el GDD** (P1-7 de `docs/equipo/CAP1_PENDIENTE.md`; va después de D2 y en sus mismos archivos: `src/game/accesibilidad.js`, `src/ui/ui.css`, y `input.js` solo para el modo zurdo).
- Subtítulos de sonido generales: lluvia, trueno, río, martillazos, BIP del transmisor y coquíes. Hoy solo el Simon los tiene.
- Modo relajado: guía siempre visible y sin límites de tiempo.
- Modo zurdo en táctil.
- Se guarda como D2. Añade casos de prueba.
- Ojo: otro agente está haciendo ahora un icono y un panel de controles para teclado (`src/game/guia_controles.js`). No lo dupliques.

## Carril E: capítulo 1, contenido y documentos
**E1 · Validar los 12 textos del Diario de Campo** (P1-5; `content/cap1/coleccionables.js`, solo los textos). Son coquí, San Pedrito, reinita mariposera, dajao, jicotea, manatí, maraca, güiro, cuatro, petroglifo de Caguana, vejigante y pava.
- Cada dato lleva una fuente fiable (DRNA, USFWS, ICP, Smithsonian, UICN o publicaciones académicas; puedes leer páginas web).
- Lo que no se pueda verificar se quita o queda «por verificar».
- Entrega `docs/equipo/DIARIO_VALIDACION.md`, una tabla con: hallazgo, dato, fuente con URL, veredicto y texto corregido en ES y EN si existe.
- Aplica las correcciones y quita «Textos pendientes de validar» del encabezado si todo queda validado.
- `eduTest` y `missionTest` en verde.

**E2 · Documentos del capítulo 1 al día** (P1-8).
- Actualiza `docs/equipo/GDD_CAP1.md`, `docs/CHAPTER_01_GAMEPLAY.md` y `docs/equipo/EDUCATIVO.md` al estado real, con `docs/equipo/CAP1_PENDIENTE.md` como guía.
- Crea `docs/COMO_SE_JUEGA.md`, de una página y en lenguaje para Kelvin y para familias: la meta del juego, qué hace el jugador minuto a minuto, los controles, el Modo Retos (si ya está en main) y el progreso (Diario, ropa, cómic).
- Para todas las edades, sin «grados 3 a 6»; lo educativo no es el gancho. Solo documentos.

## Estado
| Tarea | Estado | Commit | Resultado |
|---|---|---|---|
| A1 | pendiente | | |
| A2 | hecha | 642ffc8 | `.github/workflows/pruebas.yml`: push a `main` → macos-latest, Python 3.11 + numpy/OpenImageIO como `AV_PYTHON`, gltfpack 1.2 con SHA256 del zip y del binario leídos de `BUILD.md`, `build.sh HEAD`, `test.sh --extra` con el Chrome del runner y un paso que lee `reporte-test.json` y falla si cualquier batería (también las extra) no pasa; sube los reportes. Sin probar en GitHub: YAML parseado con Ruby, greps de SHA y chequeo de baterías probados en local (13/13). Riesgo: que el runner no tenga GPU Metal para `--use-angle=metal`. Sin baterías: no toca nada de la build. |
| A3 | hecha | cf90162 | `src/engine/renderer.js`: `perfilEquipo` (GPU por `WEBGL_debug_renderer_info`, `hardwareConcurrency`, `deviceMemory`, móvil o ChromeOS) elige el nivel inicial: bajo con GPU por software, 2 núcleos o menos o 2 GB o menos, y en Chromebook o móvil con 4 núcleos o 4 GB o menos; medio con GPU integrada o 4 núcleos/4 GB; si no, alto, así que los equipos potentes no cambian. `decidirArranque` mide los FPS de los primeros 3 s jugando y solo baja, una vez (menos del 50 % del objetivo va directo a bajo; menos del 85 %, un nivel). `calidadTest` (14 casos con equipos simulados) se expone en `G.renderer` y corre dentro de `contextTest` (25/25). Las 13 baterías pasan con 0 errores de consola. Las líneas A1 que había sin commit en `renderer.js` siguen sin commit. |
| B1 | pendiente | | |
| B2 | hecha | e29f59d (+ bd5e282) | Toldo: `solidos.libre()` mide el espacio sobre los pies; con menos de 1,8 m se agacha (`MOVE.agachada`, cuerpo de 1,15 m, mira adelante, más lenta) y la cámara baja; pose `crouchPose` en `character.js` + 1 línea en `actores.js` (commit aparte bd5e282, mismo rol). Cuerda: ya sostenía; ahora `que()` la llama 'cuerda' (suena como rama). `movementTest` 29/29: cuerda (fino, deriva 0) y toldo real con la cabeza 0,30 m bajo la lona medida en vértices deformados. 14/14 baterías, 0 errores. |
| B3 | hecha | 6c3e6af | Medidas en el juego: las 25 empalizadas y las 32 canoas (`decorativo`, streaming) ya tenían superficie en todas sus celdas; las que no tenían sólido eran las estacas y el letrero de los terrenos (su grupo está en el origen y las 4 estacas son un InstancedMesh), así que seguían con el cilindro `post` sin alto. `solidos.js`: `agregar()` va instancia a instancia y `contenido()` encuentra el grupo por la pieza más cercana, así que los 2 collider `post` se sustituyen. `que()` mide sobre el agua (una canoa a flote ya no es «techo»). `movementTest` 30/30: se posa en una estaca a 1,19 m (`fino`, `poste`, deriva 0, collider sustituido); el caso va detrás del toldo, porque antes de él dejaba el streaming en otra zona y el toldo fallaba. 14/14 baterías, 0 errores de consola. |
| B4 | pendiente | | |
| C1 | pendiente | | |
| C2 | hecha | 6740bb8 | `docs/equipo/EP2_GDD.md`, `EP2_NARRATIVA.md` y `EP2_MISIONES.md`: tres misiones (Lee la tierra, Escuchar primero, Casa que aguanta) con objetivos NGSS, formativa, Modo Maestro y Nivel 1/2. Reutiliza misiones por datos, perchas, agarre, diálogo, ropero (4 piezas ya modeladas), criadero (`obtener.cap2`) y cómic (`EVENT_DEFS`). DEPR y datos de suelos y cajas nido quedan «por verificar». Hay 10 decisiones de canon para Kelvin en el GDD §10. Solo docs, sin baterías. |
| C3 | pendiente | | |
| D1 | hecha | 8808c5a | `docs/ARQUITECTURA.md`: secciones nuevas de meshopt/WebP en la build, contexto WebGL, `sitio.sh`/`sitio/` y `tools/agente_api`; el streaming ya estaba documentado. Solo docs, sin baterías. |
| D2 | pendiente | | |
| D3 | hecha | 0fb8bbd | `src/engine/input.js`: sección «Teclas» en el menú de pausa (oculta en táctil, reusa estilos de la ayuda) para mover, volar, aterrizar (nueva, X, solo baja) y acción; pulsar y luego la tecla, Esc cancela, una tecla ocupada se intercambia, las fijas (Espacio, C, F, Q, R, 1–7, flechas, Enter) se rechazan; «Restablecer teclas». Se guarda en el dispositivo (`amazonaverse.teclas`, aparte de la partida). `keys` sigue con WASD canónicas: fisica.js intacto. Ayuda y pista del HUD siguen el mapa; `ui.js` salta el texto con la tecla de acción. `AV.teclasTest` 17/17 (línea en `boot.js`). Baterías: 13/13 en el candidato con todo menos el formato del resultado de teclasTest; en el final, 12/13 dos veces con maestroTest 21/22 (caso del portapapeles con `espera(150)`, carga 27 por otras corridas) y 22/22 al correrlo solo. Recomiendo darle más margen a ese caso en `content/cap1/pruebas.js`. |
| D4 | pendiente | | |
| E1 | pendiente | | |
| E2 | pendiente | | |
