# Research técnico y de mercado: Amazona Verse

Fecha: 2026-10-24. Los tamaños de archivo se midieron en jsDelivr; el resto viene de blogs y guías de terceros (marcado "no verificado" cuando es dudoso).

## 1. WebAssembly

| Opción | Carga desde CDN | Con Three r128 | Tamaño | Veredicto |
|---|---|---|---|---|
| Rapier `@dimforge/rapier3d-compat` 0.21.0 | jsDelivr: sí, pero solo `dist/rapier.mjs` (ESM, WASM en base64). No hay UMD. | Independiente de Three (solo sincronizas posiciones). Requiere `<script type="module">`. | 4,34 MB crudo; ~1,5 MB con brotli | No por ahora |
| Jolt `jolt-physics` 1.1.1 (`jolt-physics.wasm-compat.js`) | jsDelivr: sí, WASM embebido | Independiente de Three | 3,23 MB crudo; ~627 KB con brotli | No por ahora |
| Draco (`three@0.128.0/examples/js/libs/draco`) | Archivos disponibles en jsDelivr, pero el `DRACOLoader` los pide con `fetch` en ejecución, y el artifact lo bloquea | Compatible (UMD r128) | wasm 281 KB (76 KB brotli) + wrapper 54 KB + loader 13 KB | Solo si el decoder se incrusta en base64 (~375 KB) |
| Meshopt (`examples/js/libs/meshopt_decoder.js`) | jsDelivr: sí, un único JS con WASM en línea | Compatible: el `GLTFLoader` r128 trae `setMeshoptDecoder` | 21,8 KB crudo; 5,8 KB gzip | **Sí** |
| KTX2/Basis | r128 no incluye `KTX2Loader` (404); solo el `BasisTextureLoader` antiguo | Mala | `basis_transcoder.wasm` 440 KB (219 KB gzip) | No |

Análisis:
- La física del juego (cápsula sobre terreno, planeo, colisiones simples) no necesita un motor de cuerpos rígidos. `game.js` no usa ninguna librería de física. Rapier o Jolt añadirían 1,5 MB o más de descarga sin ganancia visible para un niño.
- Los 16 MB de `assets/models` son el problema real de peso. Meshopt es la única opción barata: 6 KB de decoder y reduce el peso de los GLB (medir con `gltfpack`).
- Draco decodifica más lento y exige el wasm aparte. KTX2 no existe en r128. Para texturas, baja la resolución y usa WebP/JPEG; en `assets/tex` ya hay solo 328 KB.

**Recomendación:** adoptar meshopt (`gltfpack -cc`) para los GLB, y mantener la física propia. Reevaluar Rapier solo si aparecen puzles con objetos empujables.

Fuentes: [Meshopt/zeux](https://zeux.io/2019/03/11/small-fast-web/), [meshoptimizer en jsDelivr](https://cdn.jsdelivr.net/npm/meshoptimizer@1.1.1/README.md), [README Rapier](https://unpkg.com/@dimforge/rapier3d@0.17.3/README.md), [archivos Rapier compat](https://data.jsdelivr.com/v1/packages/npm/@dimforge/rapier3d-compat@0.21.0?structure=flat), [archivos Jolt](https://data.jsdelivr.com/v1/packages/npm/jolt-physics@1.1.1?structure=flat), [Draco r128](https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/draco/draco_decoder.wasm), [Basis r128](https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/basis/basis_transcoder.wasm).

## 2. WebGPU frente a WebGL2, y migrar Three

| Aspecto | Hallazgo |
|---|---|
| Soporte | Chrome/Edge en escritorio. Safari 26 (iOS 26, macOS 26) lo activa por defecto. Android y iPhones antiguos son desiguales. |
| Three actual | npm `three@latest` = 0.186.1. `WebGPURenderer` tiene respaldo automático a WebGL2. Hay desacuerdo entre fuentes sobre si ya es estable (no verificado). |
| Costo de migrar desde r128 | Alto: no se encontraron notas oficiales de migración. Desde r148 desaparecen los scripts `examples/js` UMD y quedan los módulos ESM. Además cambian el color y la iluminación. Habría que reescribir el cargado de loaders. |
| Beneficio para este juego | Bajo. El juego tiene pocos objetos y no usa compute shaders. La fuente de rendimiento será el número de draw calls, no la API gráfica. |

**Recomendación:** quedarse en r128 + WebGL2. No migrar durante el capítulo 1. Revisar la migración (a un Three ESM fijado con importmap de jsDelivr) cuando se necesiten sombras o partículas pesadas, y tras probar en dispositivos reales.

Fuentes: [Manual WebGPURenderer](https://threejs.org/manual/en/webgpurenderer), [WebGPU vs WebGL 2026](https://app.cinevva.com/guides/webgpu-vs-webgl-games), [OpenReplay](https://blog.openreplay.com/webgpu-vs-webgl-industry-moving/), [Guía de migración](https://www.utsubo.com/blog/webgpu-threejs-migration-guide).

## 3. Presupuestos para móvil

Las cifras salen de blogs y foros, no de benchmarks oficiales. Valídalas con `renderer.info` en un teléfono de gama media.

| Recurso | Presupuesto sugerido |
|---|---|
| Draw calls | menos de 100 para 60 fps; con más de unos cientos, la gama media sufre |
| Triángulos por escena | cientos de miles; personaje principal de 10.000 a 30.000 |
| Texturas | una de 2048x2048 RGBA pesa 16 MB sin comprimir; usar 1024 o 512 en móvil |
| Memoria WebGL | 128-256 MB en móvil (no verificado) |
| Pixel ratio | limitar a 1,5-2: duplicarlo cuadruplica los píxeles |

**Recomendación:** fijar un tope de ~100 draw calls en móvil y medir los triángulos. Fusionar o instanciar decorado (`InstancedMesh`). Aprovechar el LOD que ya existe (`vittata_base_lod1.glb`). Limitar el pixel ratio y añadir un selector de calidad automático. Probar con calor sostenido.

Fuentes: [Foro Three.js](https://discourse.threejs.org/t/webgl-performance-in-all-devices/22234), [Guía de optimización](https://www.hontran.dev/blog/three-js-performance-optimization), [Interaction budget](https://hackernoon.com/the-interaction-budget-keeping-webgl-interfaces-usable-on-real-devices).

## 4. Juegos infantiles de referencia

| Referencia | Qué hace bien | Monetización |
|---|---|---|
| PBS Kids | Marca confiable, control editorial total, sin publicidad de terceros | Financiación pública |
| ABCmouse | Currículo estructurado y progresión | Suscripción desde ~9,95 USD/mes |
| ABCya! | Catálogo grande, juego gratis inmediato | Freemium: suscripción quita anuncios y da más contenido |
| Funbrain | Juegos simples por edad y materia | Gratis con publicidad |
| Poki (portal) | Distribución masiva de HTML5 | Reparto de ingresos: 50/50 con su tráfico; límite de descarga inicial de 8 MB (según guía de terceros) |

**Recomendación:** modelo freemium sin anuncios dentro del juego: capítulo 1 gratis y capítulos o ropa de Vittata como compra de padres (alineado con COPPA y con la confianza de las familias). Poki sirve como canal de distribución, pero obliga a una descarga inicial pequeña, que es otra razón para comprimir con meshopt.

Fuentes: [Tinybeans](https://tinybeans.com/best-online-educational-games-for-kids/), [Funbrain en Wikipedia](https://www.wikipedia.org/wiki/Funbrain), [Guía Poki](https://app.cinevva.com/guides/publish-game-poki), [Monetización web](https://app.cinevva.com/guides/web-game-monetization).
