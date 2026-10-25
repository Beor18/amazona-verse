# CURRENT_ARCHITECTURE · Amazona Verse (auditoría AV-ENGINE-AUDITOR)

- **Fecha:** 2026-10-24.
- **Base auditada:** rama `estable` = `f3ed616` = **v20-publicada**, en el worktree aislado `auditoria-motores`.
- **Fuera de alcance:** `main` (`abee75c`), 15 archivos por delante (video del pitch, QA-21 y renderer). No cambia la arquitectura.
- **Método:** cada sistema se clasifica con el archivo que lo implementa y una prueba que **yo ejecuté**: batería `tests/qa/qa.js` completa sobre v20, capturas propias, inspección de GLB y .blend con scripts propios (`poc/tools/glbsum.py`, `blendinv.py`) y listado de archivos del artifact publicado.
- **Fuentes no tomadas como evidencia:** lo que dicen `CTO_PLAN.md`, `TEAM_AUDIT.md` o `PRODUCTION_DASHBOARD.md` se usa solo como pista.

**Escala de estados:**
- **Funcional:** existe, está integrado y lo vi funcionar.
- **Parcial:** funciona, pero le falta algo concreto.
- **Prototipo:** existe, pero no está listo para producción.
- **No implementado.**
- **No verificable:** no pude comprobarlo desde aquí, y se dice por qué.

## 1. Respuesta a la pregunta 1

> ¿Qué tecnología usa realmente Amazona Verse hoy, qué partes funcionan y qué mejoras concretas se pueden introducir sin rehacer lo construido?

**Tecnología real**
- **Juego web 3D en JavaScript puro:**
  - scripts clásicos, sin bundler, sin npm y sin TypeScript;
  - **Three.js r128 vendorizado**: `assets/vendor/three/build/three.min.js`, `REVISION "128"`, 589 KB, ya no viene de un CDN;
  - motor propio "AVE" de 28 módulos, con contenido en "packs" de datos.
- **Pipeline de arte:**
  - Blender 4.2 sin ventana con scripts Python (`tools/blender`, ~10.100 líneas);
  - sale glTF binario y una copia base64 en `*_glb.js`, porque el visor de artifacts no sirve `.glb`.
- **Publicación:** artifact multiarchivo de claude.ai, 231 archivos y capacidad `downloads`, verificado con `Artifact list scope=files`.
- **Lo que no hay:** ni motor de terceros ni física de terceros. Tampoco build, CI ni servidor.

**Qué funciona (verificado)**
- **Batería completa sobre v20, 316/316 comprobaciones:**

  | Prueba | Resultado |
  |---|---|
  | selfTest | 52/52 |
  | missionTest | 35/35 |
  | accessoryTest | 12/12 |
  | templateTest | 19/19 |
  | eduTest | 63/63 |
  | maestroTest | 22/22 |
  | criaderoTest | 32/32 |
  | movementTest | 22/22 |
  | saveTest | 27/27 |
  | comicTest | 19/19 |
  | e2eTest | 13/13 |

- **Consola:** 0 errores.
- **Capítulo 1 jugable de punta a punta:**
  - creador 3D, mundo de El Yunque, misiones, construcción del refugio, crecida, Guardián y mirador;
  - cómic exportable, aula, Modo Maestro y criadero de huevos con eclosión;
  - guardado v5 con migraciones.

**Qué no está**
- Hay **1 modelo 3D** de cotorra con esqueleto, no 34: las otras 33 especies existen solo como renders PNG.
- No hay exportación nativa (iOS, Android, escritorio).
- No se recupera la pérdida de contexto WebGL.
- No hay CI.
- La descarga inicial es grande: 19,4 MB por la vía del artifact.
- No se ha medido en equipos de escuela.

**Mejoras sin rehacer (detalle en `ENGINE_AUDIT.md` §Mejoras):**
- cuantización y meshopt de los GLB, con carga diferida;
- liberar las cadenas base64 después de decodificarlas (≈ 110 MB de heap medidos);
- `webglcontextlost`;
- runner headless en CI, que ya está a medias en `tools/build` sin commit;
- pipeline de Vittata reproducible, porque hoy depende de `/private/tmp`;
- texturas por especie sobre el mismo modelo.

## 2. Pila técnica

| Capa | Qué hay | Evidencia |
|---|---|---|
| Lenguaje | JavaScript (ES2017+), CSS y HTML. Python 3.11 (el de Blender) en las herramientas | `index.html` carga 49 `<script>` clásicos (líneas 268–316) |
| Render | Three.js r128 (WebGLRenderer, WebGL2 en Chrome con ANGLE Metal), GLTFLoader, SkeletonUtils, EffectComposer y UnrealBloom (post en calidad alta) | `assets/vendor/three/*`; `AVQA.last.scripts.globals.three = "128"` |
| Motor propio (AVE) | `AVE.module(nombre, fábrica)`, contexto `G`, ganchos `G.on/emit` con prioridad, packs `AVE.registerPack` | `src/engine/core.js` (91 líneas); `AVE.modules()` devuelve 28 módulos |
| Contenido | `content/cap1` (10 archivos), `content/plantilla` (otro juego con el mismo motor), `content/comun/huevos.js` | templateTest 19/19 |
| Tamaño del código propio | engine 4.481 líneas · game 3.286 · personaje 1.807 · ui 1.359 · pruebas 410 · content 3.494 · tests 902 | `wc -l` |
| Herramientas | `tools/blender` (10.093 líneas: Vittata, ropa, mapa, entorno), `tools/audio` (3.109 líneas: síntesis del pitch), `tools/sys/vigilante.sh` | Lectura de cabeceras |
| Persistencia | `localStorage`: sobre del motor (formato 2) y versión del pack (v5), escritura atómica `.tmp`→`.prev`→principal | `src/engine/guardado.js`; saveTest 27/27 |
| Audio | Sintetizado con WebAudio en el juego (72 líneas); sin archivos de audio | `src/engine/audio.js` |
| Build y CI | **No hay en `estable`.** En la copia de trabajo de `main` hay `tools/build/` sin commit (avbuild.py y avtest.py: poda, recompresión y Chrome headless por DevTools) | `git status` en `~/AmazonaVerse/Juego`: `?? tools/build/` |
| Control de versiones | git, 120 commits (todos del 2026-10-24, de 13:44 a la noche), etiquetas v16–v20 y worktrees por agente | `git log` |
| Publicación | Artifact multiarchivo: 231 archivos, sin `.glb`, con `*_glb.js` | `Artifact list scope=files` de `Bme89hzz2bA5f25BcRRexM` |

### Discrepancias con la documentación
- **`ARQUITECTURA.md`** dice "Three.js r128 (CDN)". Hoy está vendorizado en local, desde 48524f5.
- **`CTO_PLAN.md`** describe un `game.js` de 2.046 líneas y un `castShadow` muerto. `game.js` ya no existe en el repo: se partió en módulos.
  - Sigue publicado en el artifact como **archivo huérfano**, con 177 KB, junto a `character.js`, `wardrobe.js` y `showcase.js` viejos en la raíz.
  - Causa: un republish sin `files: null` conserva los archivos que no se mencionan.
- **`docs/equipo/BUILD.md`** no existe ni en `estable` ni en `main`.
- **`PROJECT_STATUS.md`** dice que la expresión facial está en NOT STARTED. Ya hay párpados (`character.js:476`), parpadeo (`:706`) y pico que habla (`ANIM.mouthMax`).

## 3. Inventario por sistema

### 3.1 Arquitectura y motor
| Sistema | Estado | Archivo | Prueba |
|---|---|---|---|
| Núcleo de módulos, ganchos y packs | Funcional | `src/engine/core.js` | templateTest 19/19: la plantilla arranca otro juego con el mismo motor |
| Cargador único de GLB (`.glb` y, si falla, `_glb.js`) | Funcional | `src/engine/assets.js` | En el servidor sin `.glb` (`poc/tools/srv_artifact.py`) carga los 46 `_glb.js` y el personaje 3D, sin errores |
| Separación entre motor y contenido | Funcional | `src/*` frente a `content/*` | templateTest. `content/cap1` no edita `src/` (revisado con grep) |
| Calidad adaptativa (presets y DPR dinámico) | Funcional, con una salvedad | `src/engine/renderer.js:30` (adaptDPR) y `:61` (presets) | En la medición, DPR 2→1 y calidad «alto». Hay dos controladores que reaccionan a los mismos cuadros lentos |
| Pérdida de contexto WebGL | **No implementado** | — | `grep webglcontextlost src` da 0 resultados |
| Contextos WebGL | 5 renderers | `renderer.js:26`, `creador.js:118`, `criadero.js:500`, `character.js:1025`, `showcase.js:92` | grep |
| Build reproducible | **No implementado** en `estable` | `tools/build` sin commit en `main` | `git status` |
| CI | **No implementado** | — | No hay `.github` ni runner. Las pruebas se corren a mano en la consola o con `qa.js` |

### 3.2 Gameplay
| Sistema | Estado | Archivo | Prueba |
|---|---|---|---|
| Movimiento: caminar, correr, salto variable, doble salto, planeo, vuelo, nado y buceo | Funcional | `src/engine/fisica.js`, `input.js` | movementTest 22/22 |
| Cámara en tercera persona (seguimiento perezoso, anti-terreno, FOV al volar) | Funcional | `src/engine/camara.js` | movementTest y e2eTest |
| Colisiones (círculos y cajas, heightfield exacto por triángulo, perchas) | Funcional | `fisica.js`, `terreno.js`, `mundo.js` | selfTest y movementTest. Sin motor de física, por diseño |
| Física de cuerpos rígidos | No implementado (no hace falta hoy) | — | — |
| Interacciones y agarre (pico, mano, brazos y patas al volar) | Funcional | `src/game/interaccion.js`, `src/engine/agarre.js` | selfTest y movementTest |
| Misiones data-driven (`hasta`: tiene, evento, cerca…) | Funcional | `src/game/misiones.js`, `content/cap1/misiones.js` | missionTest 35/35 |
| Construcción | **Funcional dentro de cap1** (colocar el refugio con validación, costo, inundación y reconstrucción). No es un sistema genérico del motor | `content/cap1/historia.js:150-211` | selfTest: «Construcción fuera del terreno rechazada», «Refugio construido…», «Reconstruido en la colina» |
| Inventario (recursos y costos) | Funcional, básico | `src/game/objetos.js` | selfTest: «Recursos recolectados» |
| Progreso de la historia | Funcional | `content/cap1/historia.js`, `misiones.js` | selfTest: «Capítulo completo» |
| Guardado v5 (migraciones v1→v5, corrupción, versión futura, almacén bloqueado) | Funcional | `src/engine/guardado.js` | saveTest 27/27 |
| Diario y fichas | Funcional | `src/game/diario.js` | missionTest y eduTest |

### 3.3 Personajes
| Sistema | Estado | Archivo | Prueba |
|---|---|---|---|
| Modelo de Vittata con esqueleto | Funcional | `assets/models/vittata.glb`: 28.268 triángulos, 1 skin de **60 huesos** (incluye 7 `mount_*`), 5 clips (Celebrate, Curious, Idle, Walk y Welcome) y 1 textura JPEG de 1024 | `poc/tools/glbsum.py`. Viene de la malla original `cotorrofiver.blend` (14.181 vértices, igual que en `vittata_rig_final.blend`) |
| Animación | Funcional | 5 clips hechos por script (`tools/blender/s4_anim.py`) y locomoción, alas, pico, mirada, parpadeo, IK de patas y poses de carga procedurales (`character.js`, tabla `ANIM`) | accessoryTest, movementTest y captura propia |
| Personalización y accesorios | Funcional | `src/personaje/wardrobe.js` y `character.js`: 37 piezas `.glb` de ropa con piel sobre el mismo rig, 7 ranuras de montaje | accessoryTest 12/12. En 10 cambios de ropa hay **0 fugas** de geometrías, texturas o programas (medido) |
| Creador de personaje (Taller 3D) | Funcional | `src/game/creador.js`, `src/personaje/showcase.js` | Captura propia `img/v20_creador.jpg` y e2eTest |
| Especies | **Parcial** | `character.js:46`: 8 plumajes por tinte con máscara (`vittata_masks.png`) sobre la textura de Vittata. Las otras 26 especies del catálogo no están en 3D | Revisado el código. Ver `ASSET_REUSE_REPORT.md` |
| Expresión facial | Parcial | Pico con apertura y sílabas, párpados procedurales y parpadeo. Sin blendshapes | `character.js:476, 706` |
| Retrato 3D para el cómic | Funcional | `character.js:1025` (`renderPortrait`, su propio WebGLRenderer) | comicTest 19/19 |

### 3.4 Sistemas especiales
| Sistema | Estado | Archivo | Prueba |
|---|---|---|---|
| Hatch Eggs (huevo, incubación, eclosión con patitas, cuidado) | **Funcional, pero integración parcial.** El huevo y las patitas son geometría procedural (`LatheGeometry`), no un modelo de artista | `src/game/criadero.js` (1.397 líneas), `content/comun/huevos.js` | criaderoTest 32/32; e2eTest paso 3; captura `img/v20_criadero.jpg`. **Solo se entra con `?criadero=1` o el Modo Maestro**: ningún archivo fuera de `criadero.js` llama a `criadero.abrir` (grep) |
| Evolución (bebé → juvenil → adulto por XP de aprendizaje) | Funcional, dentro del criadero | `criadero.js` (`etapaDeNivel`), `huevos.js` | criaderoTest (comprueba los umbrales de nivel y etapa) |
| Compañero (la cría sigue al jugador) | Funcional | `src/engine/actores.js` | selfTest: «Con una cría aparece en el mundo con la escala de su etapa» |
| Cómic personal (PNG verificado y PDF sin librerías) | Funcional | `src/game/comic.js` | comicTest 19/19 y selfTest (PNG 1080×1520 decodificado, PDF válido) |
| Narrativa por eventos | Funcional | `src/game/eventos.js`, `dialogo.js`, `content/cap1/dialogos_cap1.js` (27 escenas) | selfTest: «Todos los eventos cumplen el esquema» y «dialogos_cap1.js carga las 27 escenas» |
| Herramientas educativas (Aula ES/EN, voz, texto corto, preguntas, Modo Maestro y reporte CSV/JSON) | Funcional en lo técnico | `src/game/aula.js`, `content/cap1/educativa.js`, `lecciones.js` | eduTest 63/63 y maestroTest 22/22. La validación del contenido por el DRNA o un docente no es técnica y no está hecha (ROADMAP_CEO §2) |
| Construcción de islas | **No implementado** como sistema. Solo existe el refugio del cap1. Las `islas` del terreno analítico son decoración de la plantilla | `src/engine/terreno.js` (modo analítico) | grep |

### 3.5 Mundo y render
| Sistema | Estado | Archivo | Prueba |
|---|---|---|---|
| Terreno de El Yunque (4 trozos GLB, splat con shader propio y altura exacta) | Funcional | `src/engine/terreno.js`, `assets/models/mapa/*` | Captura `img/v20_mundo.jpg`; FPS medidos en 3 puntos |
| Agua (río, mar, nado) | Funcional | `src/engine/agua.js` | selfTest («La crecida sube el agua») y movementTest |
| Vegetación instanciada (viento, impostores, LOD, pasto) | Funcional | `src/engine/vegetacion.js` (21 GLB del kit) | Captura; 97–112 draw calls |
| Edificios de Kelvin (21 GLB, fundidos por grupo, colisión desde la geometría) | Funcional | `src/engine/mundo.js` | Captura; e2eTest usa sus POI |
| Post-proceso, sombras y niebla | Funcional en «alto» | `renderer.js` | 15 pasadas por cuadro en «alto» (`AVQA`) |

### 3.6 Plataformas y compatibilidad
| Plataforma | Estado | Motivo |
|---|---|---|
| Chrome 152 de escritorio en Mac M4 | Funcional | Batería y capturas propias |
| Visor de artifacts de claude.ai | Funcional (publicado) | 231 archivos; no lo jugué dentro del visor |
| Safari, iPad, Android y Chromebook reales | **No verificable** | No hay dispositivos aquí. QA solo emuló tamaños |
| Apps nativas (iOS, Android, Windows o macOS) | No implementado | No hay Xcode, Android SDK ni empaquetador |
| Sin conexión (PWA o service worker) | No implementado | grep `serviceWorker` sin resultados |

## 4. Las 34 cotorras originales: qué son de verdad

| Fuente | Qué es | Esqueleto | Animaciones | Texturas |
|---|---|---|---|---|
| `04_Blender_3D/cotorro_original/cotorro/cotorrofiver.blend` (2021; igual al de `cotorro.rar`) | **El único modelo 3D original con esqueleto.** Malla de 14.181 vértices (`Cube.002`, 54 grupos de vértices) | Sí: metarig `Armature` (51 huesos) y rig Rigify `rig` (49 huesos, ORG-*) | **No** (0 acciones) | Rutas a `D:/spinter/`. Las JPG están al lado, en la carpeta: `cuerpo_Base_color.jpg` y `Material.001_Base_color.jpg`, más `cuerpo_Base_color_mejorada.png` |
| `04_Blender_3D/Piloto Cotorra.blend` | Versión de alta densidad, «Amazon parrots» (113.060 vértices), con traje de piloto (`Cuerpo`, `Brazo.*`) | **Roto:** el modificador Armature apunta a `RigCotorra`, que no existe en el archivo | 4 acciones de `RigCotorra` (1.799 curvas, 2 a 23 cuadros), sin rig al que aplicarlas | Rutas a `E:/cotorras/.../Amazona brasiliensis 001/cotorrofiver-1LP_*` (BaseColor, Normal y Roughness), **no disponibles** en la Mac |
| `04_Blender_3D/vittata_rig_final.blend` (2026-10-24, del equipo) | La malla de cotorrofiver con un esqueleto nuevo de 60 huesos (con `mount_*` y `pico`) | Sí | 5 clips hechos por script | Apunta a `/private/tmp/.../cuerpo_Base_color_mejorada.png` (no está empaquetada) |
| `01_Personajes_Especies/diferentes cotorras 2/*.png` (35 archivos; 34 especies + `Ochrocephala2`) | **Renders PNG 2048×2048** de la misma malla y la misma pose con otra textura por especie (comprobado a la vista con Vittata e Imperialis) | — | — | La textura de cada especie **no está** en la Mac; solo el render |
| `07_ZIPs_Originales/diferentes cotorras.zip` | Los mismos PNG (74 entradas, solo imágenes) | — | — | — |
| `01_Personajes_Especies/*.png` (15) | Renders de 4857×2879 (p. ej. «Vittata.png» con ~22 poses) | — | — | — |

**Conclusión:**
- Existe **un** modelo 3D original con esqueleto, la malla base común. Las 34 «cotorras» son **34 texturas aplicadas a esa malla**, y de ellas solo se conservan los renders PNG.
- Los mapas de textura por especie (`cotorrofiver-1LP_Material.001_*`) estaban en un disco `E:` que no está en esta Mac.
- Llevar las 34 especies al juego en 3D **no exige modelos nuevos**: hay que recuperar esas texturas (Google Drive o el disco viejo de Kelvin) o repintar 33 texturas sobre el UV existente usando los renders como referencia.
- Esto vale igual en cualquier motor, así que no favorece a ninguno.

## 5. Riesgos de arquitectura observados
1. **Peso de la descarga:**
   - 19,4 MB en frío por la vía del artifact (172 peticiones, 46 de ellas son 404 de sondeo `.glb`) y 15,4 MB con `.glb` servidos.
   - Cerca de 15,2 MB de cadenas base64 quedan **residentes** en `window.AV_*_B64` después de decodificarse.
   - Ver `PERFORMANCE_BASELINE.md`.
2. **Sin recuperación de contexto WebGL** y con 5 renderers. En iOS, el riesgo es una pantalla negra.
3. **Pipeline de Vittata no reproducible:**
   - 15 scripts de `tools/blender` dependen de `/private/tmp/claude-501/vittata_build`;
   - el `.blend` final no trae la textura empaquetada.
4. **Sin CI.** Las pruebas existen y son buenas (316 comprobaciones), pero se corren a mano. El runner headless está sin commit.
5. **Artifact con archivos huérfanos:** `game.js`, `character.js`, `wardrobe.js` y `showcase.js` en la raíz, de versiones viejas.
