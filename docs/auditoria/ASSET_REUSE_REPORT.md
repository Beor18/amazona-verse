# ASSET_REUSE_REPORT · qué se reutiliza si se migra (y si no)

Los tamaños y recuentos salen de `wc -l` y de `poc/tools/glbsum.py`. Las 34 cotorras están detalladas en `CURRENT_ARCHITECTURE.md` §4.

| Clase | Si se queda en el motor actual | Si migra a Godot o Unity |
|---|---|---|
| **Código reutilizable tal cual** | Todo: engine (4.481 líneas), game (3.286), personaje (1.807), ui (1.359), content (3.494) y pruebas (1.312) | Nada del JS se ejecuta en GDScript ni en C# |
| **Código que hay que adaptar** | Solo si se actualiza three r128 → r18x: `examples/js` desaparece en r148, la UMD en r160 y la gestión de color cambia en r152. Afecta a renderer, loaders y post | — |
| **Lógica portable (datos y reglas que se traducen sin rediseño)** | — | Packs de contenido (misiones, historia, diálogos y lecciones, que ya son datos); esquema de guardado v5; reglas del criadero (`huevos.js`); tablas de `ANIM` (movimiento); contratos de eventos y cómic |
| **Recursos 3D reutilizables tal cual** | 94 GLB (35,7 MB) | **Los mismos GLB:** Godot importó `vittata.glb`, gorra y sombrero con sus 60 huesos, 5 clips y piel sin pérdida (PoC 24/24). Unity: NV |
| **Recursos que hay que convertir** | Ninguno. Se recomienda cuantizar y comprimir (M-1) | Shaders propios (splat del terreno, viento de la vegetación, agua) a GLSL de Godot o Shader Graph; el recoloreo de la ropa por nombre de material; la paleta lineal (AVColor) |
| **Sistemas que hay que reescribir** | — | Todos los de `src/`: física y movimiento (311 líneas, ajuste fino de 22 pruebas), cámara, terreno y altura exacta, vegetación instanciada con impostores, agua, edificios fundidos con colisión, ropero (606 + 1.061 líneas), cómic con PNG/PDF, aula y Modo Maestro, criadero (1.397), guardado con migraciones y las 11 baterías de prueba (316 comprobaciones) |
| **Funciones que se podrían perder** | — | La **publicación como artifact de claude.ai**: el `.wasm` de Godot (~42 MB, cifra comunitaria) supera el límite de 15 MB por archivo, y Unity WebGL también pesa varios MB. Además: la voz con `speechSynthesis`, la entrega de archivos por la capacidad `downloads` del visor y el arranque sin instalación en Chromebook |

## Las 34 cotorras
- **Qué existe:** una sola malla con esqueleto, la de `cotorrofiver.blend`. Las 34 son esa malla con otra textura, y de esas texturas solo se conservan los renders PNG.
- **Qué hace falta en cualquier motor:**
  1. Recuperar los mapas `cotorrofiver-1LP_Material.001_*` del disco E: viejo o de Google Drive. Si no aparecen, repintar 33 texturas de 1024 px sobre el UV existente usando los renders como guía.
  2. Usar la misma malla, el mismo rig de 60 huesos y la misma ropa para todas. No hacen falta modelos nuevos.
- **Piloto Cotorra.blend:**
  - no se puede reutilizar tal cual: la malla de 113.000 vértices no tiene rig (`RigCotorra` no existe) y le faltan las texturas;
  - sus 4 acciones de 1.799 curvas no tienen esqueleto al que aplicarse.
- **No se reemplaza nada** con personajes generados.
