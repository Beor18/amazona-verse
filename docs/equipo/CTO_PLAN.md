# CTO_PLAN · Amazona Verse · 24 oct 2026

Revisión de solo lectura. Tamaños medidos; draw calls estimadas.

## 1. Auditoría

**Arquitectura.**
- Cuatro IIFE que se comunican por `window.AV*`, sin build.
- `game.js` tiene 2.046 líneas y mezcla datos, mundo, física, UI, guardado, cómic/PDF, creador y unas 230 líneas de pruebas que se publican con el juego.
- La carga "primero .glb y, si falla, base64" está copiada tres veces. En el artifact, cada carga recibe primero un 404 y luego usa el base64.

**Rendimiento.**
- Draw calls: unas 90–110. Árboles y palmas son `InstancedMesh`. Las piezas fijas (estacas, mirador, taller) suman unas 38 llamadas; cada personaje, unas 10.
- Materiales: unas 45 instancias y 8–10 shaders. Las lentes usan `MeshPhysicalMaterial`, caro en móvil.
- Sombras: el juego no activa `shadowMap` y usa sombras falsas, lo cual es correcto. Los `castShadow` de `character.js` son código muerto.
- El taller usa PCFSoft de 1024, y el juego sigue renderizando debajo: dos escenas por cuadro.
- Color: el juego renderiza en lineal y el creador en sRGB+ACES, así que Vittata se ve distinta en cada uno.

**Tamaños en tiempo de ejecución (medidos), ≈ 4,8 MB en total:**
- Librerías CDN: 712 KB.
- Código propio: 225 KB.
- Modelos base64: **2,75 MB**, el 57 % del total (vittata 1,75 MB, camisa 650 KB, isla 350 KB).
- Texturas: 327 KB.
- PNG: 760 KB.

`assets/` ocupa 18 MB, pero 12,4 MB son GLB que el juego no usa (`vittata_base.glb`, `_lod1`, `terreno_amazonas`) y no deberían estar ahí. `vittata.glb` (1,31 MB) tiene la geometría sin cuantizar, índices de 32 bits y 216 KB de JSON por 900 canales de animación. Con gzip baja a 618 KB.

**Robustez en móvil.**
- `preserveDrawingBuffer: true`, DPR 2 y MSAA juntos son caros. `capture()` lee el canvas en la misma tarea, así que no necesita esa opción.
- Hasta 4 contextos WebGL a la vez.
- No se escucha `webglcontextlost`: en iOS la pantalla puede quedar negra.
- Fugas de GPU: `applyLook` quita piezas sin `dispose`, `wardrobe.js` crea una `CanvasTexture` en cada montaje y `showcase.unmount` no libera la escena.

**Deuda técnica.**
- Dos sistemas de apariencia: el 2D heredado (`OUTFITS`, `legacyFields`, `drawPortrait`) y el 3D.
- No hay medidor de FPS ni de draw calls.

## 2. WebAssembly: veredicto

- **Rapier: no.** Pesa 1.991 KB (727 KB gz) y necesita init async. Las colisiones son círculos y cajas contra unos 130 colliders más un heightfield analítico: microsegundos en JS.
- **Draco: no.** El wasm (195 KB) y el wrapper (54 KB) suman ≈ 71 KB gz. El `DRACOLoader` de r128 descarga el decodificador por red y usa Workers desde Blob, lo que choca con la regla de no hacer fetch externo.
- **Meshopt: sí.** `three@0.128.0/examples/js/libs/meshopt_decoder.js` pesa **21,7 KB (5,8 KB gz)** con el wasm embebido. Se carga con `<script>` desde jsdelivr, sin fetch ni Workers, y `GLTFLoader.setMeshoptDecoder` ya existe en r128.
  - Estimación con `gltfpack -cc -kn -km`: los base64 bajan de 2,75 MB a unos 0,7–0,9 MB.
  - Son ≈ 1,9 MB menos por 22 KB de decodificador. Falta confirmarlo con gltfpack.
- **KTX2/Basis: no.** El transcoder pesa más de 200 KB para solo 327 KB de texturas.

## 3. Los 6 cambios de mayor impacto

1. **Meshopt + cuantización + cargador único.**
   - Qué: pasar los GLB por `gltfpack -cc -kn -km`. `-kn` conserva los huesos y los `mount_*`; `-km` conserva los materiales TELA/ACENTO/PAJA/VIDRIO. Crear `assets.js` con `loadGLB(name)`, que en el artifact va directo al base64. Sacar de `assets/` los 12,4 MB sin uso.
   - Dónde: `index.html`; `character.js` `loadGLTF`, `loadRopa`; `game.js` `loadIslandGeometry`; `tools/blender/ropa_lib.py`.
   - Esfuerzo: **M**. Riesgo: **medio** (piel cuantizada y nombres); se valida con `accessoryTest`.
2. **Presupuesto de render en móvil.**
   - Qué: DPR máximo de 1,5 en táctil, bajándolo si un cuadro pasa de 20 ms. Sin MSAA cuando el DPR es 2 o más. `preserveDrawingBuffer: false`. No renderizar el mundo mientras `overlayOpen()` sea verdadero.
   - Dónde: `game.js`, creación del renderer (l. 168), `frame`, `render`, `resize`.
   - Esfuerzo: **S**. Riesgo: **bajo**.
3. **Contextos WebGL.**
   - Qué: un renderer fuera de pantalla compartido por retrato y miniaturas (de 4 contextos a 3). `webglcontextlost`/`restored` con autosave y aviso. Liberar la escena del taller al desmontarlo.
   - Dónde: `character.js` `renderPortrait`; `game.js` `accessoryThumb`; `showcase.js` `unmount`.
   - Esfuerzo: **M**. Riesgo: **medio**.
4. **Fugas de memoria.**
   - Qué: `dispose` de la geometría, los materiales sin caché y las `CanvasTexture` al quitar una pieza; caché para las texturas de banderas y parches.
   - Dónde: `character.js` `applyLook`; `wardrobe.js` (l. 216, 247, 275).
   - Esfuerzo: **S**. Riesgo: **bajo**.
5. **Color y draw calls.**
   - Qué: sRGB+ACES en el juego, igual que en el creador. Fusionar las piezas fijas (unas 30 llamadas menos). Lentes con Standard. Quitar los `castShadow` muertos. Medir `renderer.info` en `selfTest`.
   - Dónde: `game.js` `parcelMarker`, bloques del mirador y del taller; `character.js` `buildAccessory`.
   - Esfuerzo: **S-M**. Riesgo: **bajo-medio**, porque hay que reajustar colores.
6. **Partir `game.js`.**
   - Qué: separarlo en `world.js`, `story.js`, `ui.js`, `comic.js` y `save.js`, más `tests.js`, que solo se carga con `?test=1`. Unificar las apariencias 2D y 3D.
   - Dónde: `game.js` (`selfTest`, `accessoryTest`, `renderComic`, `buildPdf`, `save`/`load`, `legacyFields`).
   - Esfuerzo: **L**. Riesgo: **medio**, por el estado compartido `S`.

**Orden sugerido:** 2 → 4 → 1 → 3 → 5 → 6. Después de cada paso, correr `AV.selfTest()` y `accessoryTest` y probar en un iPhone real.
