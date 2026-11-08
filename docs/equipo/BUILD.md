# Build y publicación del artifact (dueño: Build/Release Engineer)

- **Build:** `tools/build/build.sh <ref> [<salida>] --anterior <lista>`. Exporta `<ref>` con `git archive`, sin tocar la copia de trabajo. Después:
  - quita los `.glb` y `.blend`;
  - marca `index.html` con `<meta name="ave:sin-glb">`, así `loadGLB` va directo al `*_glb.js`, sin 404 de sondeo;
  - poda lo que nada carga, recomprime texturas sin pérdida visible (PSNR ≥ 40 dB) y valida.
  - Salida por defecto: `tools/build/salida/<ref>-<commit7>-<pid>/` (única por corrida, así dos agentes no se pisan).
  - `test.sh` cierra su Chrome y su perfil al salir (EXIT, INT, TERM); `test.sh --limpiar` cierra solo los Chrome `avtest-chrome-*` huérfanos (padre 1) con más de 30 min.
- **Qué sale:** `site/`, que es lo que se publica; `manifiesto.json`, con ruta, bytes y sha256 de cada archivo; y `reporte-build.md`.
- **Lista exacta:** `manifiesto.artifact.files_map` va tal cual al parámetro `files` del Artifact tool, con `root` = `site/`. Con `--anterior`, cada archivo publicado que ya no está va como `null`, así no quedan huérfanos.
- **`--anterior`:** la salida de Artifact `action: "list"`, `scope: "files"` del artifact publicado, guardada en un `.txt`, o el `manifiesto.json` de la publicación anterior.
- **Pruebas:** `tools/build/test.sh <salida>` abre un Chrome sin interfaz propio (GPU Metal, perfil temporal, puerto libre) y:
  - comprueba el manifiesto;
  - recorre el flujo de jugador nuevo: Jugar → creador → Empezar;
  - mide la descarga inicial, el heap y el base64 residente;
  - inyecta `tests/qa/e2e.js` y corre las 11 baterías.
  - Falla con cualquier 404, error de consola o base64 retenido. Con `--solo-medir`, no corre las baterías.
- **Publicar (solo el coordinador):** `file_path` = `site/index.html`, `files` = `files_map` y la `url` del artifact. No se pasa `capabilities`, para conservar `downloads`.
- **Entorno:** el Python de Blender (`lib.sh` lo busca; también sirve `AV_PYTHON`), nunca `python3` del sistema. Ajustes en `tools/build/config.json`. `salida/` no se versiona.
- **Límites de build (CG-61):** `archivos_max` 1100, `total_max_mb` 460 y `archivo_max_mb` 40. `build.sh` falla si se pasan. Un `0` en cualquiera de esos tres lo apaga. `objetivo_mb` sigue en 0 (no es un tope). La carga inicial la falla `test.sh`: `pruebas.presupuestos.descarga_inicial_mb` 28, y está en `fallan`. El mismo 28 está en `limites.carga_inicial_max_mb` para que el número viva en un solo sitio; `build.sh` no lo mide. Medido aquí: 371,34 MB, 871 archivos, mayor archivo 20,13 MB (`templo_mediano_h_hd_glb.js`), carga inicial 10,46 MB. La última publicación anotada trae 19,95 MB de carga. La nota de la tarea citaba 300,7 MB y 5,86 MB: con compresión de geometría la build baja, y estos topes también la dejan pasar.

## Compresión de geometría y WebP (QA-10)
- **Paso `geometria` de la build** (`avbuild.py`, `config.json` → `geometria`; se desactiva con `--sin-geometria`):
  - Antes de gltfpack, pasa a WebP q85, con OpenImageIO (el Python de Blender), las texturas embebidas de la flora (no los mapas de normales) y la paleta externa de edificios (`edificios/tex/*.webp`).
  - Luego pasa cada `*_glb.js` de `assets/models/` por gltfpack: `-c -ce ext -kn -km -ke -kv -tr -vtf -vn 10 -af 0 -ac -ar 16`.
  - Valida la salida y la guarda en caché en `~/Library/Caches/amazonaverse-build/geo`.
  - En el juego, `assets.js` le pasa `MeshoptDecoder` al GLTFLoader y convierte a Float32 los atributos cuantizados al cargar. Así el resto del motor lee lo mismo que antes.
- **gltfpack 1.2** (meshoptimizer, binario de macOS arm64):
  - Origen: `https://github.com/zeux/meshoptimizer/releases/download/v1.2/gltfpack-macos.zip`, 1 657 609 bytes, SHA256 `9f5288a6ad585bef3befbc2907c9f9b9fdeeb0b5a29eaa57f0fe15521b82eb28`.
  - Se descomprime en `tools/build/bin/gltfpack` (3 252 584 bytes, SHA256 `037336fafa46f342fe118ce8d17877fecb3deb1cd6dd8f62ee2a95bfaf2b79df`, el mismo que comprueba `config.json`). Si llega en cuarentena, `xattr -d com.apple.quarantine`.
  - `bin/` no se versiona y nunca entra en el sitio. Se ejecuta con `taskpolicy -b nice -n 15`.
  - Sin el binario, la build avisa y sale sin comprimir: funciona, pero pesa el doble.
- **MeshoptDecoder 1.2.0** (npm `meshoptimizer`):
  - Origen: `https://cdn.jsdelivr.net/npm/meshoptimizer@1.2.0/meshopt_decoder.cjs`, guardado como `assets/vendor/meshopt/meshopt_decoder.js`.
  - 29 400 bytes, SHA256 `fedf06f101ff2ba59d66335578230b7e8f5fac5057dee084be64c67444ac6c12`.
  - Se carga local desde `index.html`, sin CDN en tiempo de juego.
  - Usa WebAssembly: al publicar, comprobar en el artifact que cargan los modelos, con 0 errores de consola.
- **Los `_hd` de edificios ya van comprimidos en el repo** (8-nov, 03d0516e): la build de la nube no tiene el binario de macOS y los publicaba sin comprimir. `tools/build/meshopt_hd.js` (gltfpack 1.2 de npm, `-vp 16`, solo geometría) comprime y verifica cada modelo (nombres, materiales, uris, triángulos, caja ≤0,4 mm) antes de reescribir `.glb` y `_glb.js`; la build los deja «ya comprimido». Un `_hd` nuevo: `GLTFPACK=<ruta> node tools/build/meshopt_hd.js --todos --escribir`. Vuelta atrás: `git show 03d0516e^:<ruta>`.
- **Medido** (`build.sh HEAD` 0751c92 y `test.sh --extra`): descarga inicial de 7,98 MB (antes 13,33 MB), lo publicable 17,3 MB (antes 37,8) y las 13 baterías en verde.

## Texturas KTX2 (Basis Universal) en «bajo» y Modo Escuela (QA-181, QA-110)
Aprobado por Kelvin el 8-nov con condiciones: solo `calidad` «bajo» y `calidad.escuela`; medio y alto no cambian.
- **Qué hace:** el difuso LQ del atlas de edificios (`hd_<kit>_lq.jpg` 2048² y `hd_<kit>_lq1024.jpg` del móvil pequeño) se usa como `.ktx2` Basis ETC1S. La GPU lo recibe comprimido (ETC2, ETC1, BC1 o PVRTC según el equipo: 0,5 B/px) en vez de RGBA (4 B/px).
- **Originales intactos:** cada `.ktx2` va junto a su JPEG, que sigue siendo la fuente. `tools/build/ktx2.json` guarda el SHA256 de la fuente, de las opciones y del `.ktx2`.
- **Un solo codificador y un solo transcoder (misma versión):**
  - Codificador: `basisu` 1.15 (basis_universal, commit `7f0a00a`, compilado desde el código fuente con cmake) en `tools/build/bin/basisu` (no se versiona).
  - Transcoder: `basis_transcoder.js/.wasm` de three r136 (`assets/vendor/three/examples/js/libs/basis/`, wasm SHA256 `79ae97d7…070f`, el mismo commit `7f0a00a`).
  - Loader: `KTX2Loader.js` y `utils/WorkerPool.js` de three r136 (`examples/js` clásicos, sin cambios). r128 solo trae KTX2Loader como módulo ES que depende de `BasisTextureLoader`; el de r136 usa solo API que r128 ya tiene (`CompressedTexture`, `FileLoader.loadAsync`, los formatos comprimidos).
  - Todo se sirve local, sin CDN. El transcoder (~0,55 MB) se carga solo en «bajo» o Modo Escuela, y el worker se suelta 15 s después de la última carga.
- **Build (`paso_ktx2`, `config.json` → `ktx2`):** comprueba cada `.ktx2` contra `ktx2.json`. Si está al día, lo lista en `<meta name="ave:ktx2">`. Si no lo está y hay `tools/build/bin/basisu` 1.15, lo vuelve a codificar (con caché). Si no hay codificador, lo quita con aviso y el juego usa el JPEG. Sin la marca (desarrollo), nada cambia.
- **Regenerar en el repo:** `python3 -I tools/build/ktx2_texturas.py --escribir`. Sin `--escribir`, solo comprueba.
- **En el juego:** `assets.js` (`ktx2De`, `texKTX2`, `planoKit`) y `streaming.js` (`comprimidaModo`, `ajustarComprimida`, `materialAtlas`).
  - Mientras llega el KTX2, el material lleva un 2×2 del color medio del kit, así el JPEG no se baja dos veces.
  - Si la GPU no tiene ETC2, ETC1, BC1 ni PVRTC, o si el transcoder o el `.ktx2` fallan, se pone el JPEG de hoy (aviso en consola, no error).
  - Si la calidad sube a medio o alto en escritorio, `subirAtlasA4096` sigue igual. Si se sale del modo en el móvil, vuelve al JPEG.

**Elección por textura** (criterio de Kelvin: ETC1S para escenario y vegetación, UASTC donde importa la fidelidad, fuera lo que pierde o gana poco)
| Textura | En bajo/escuela | Modo | Decisión |
|---|---|---|---|
| Atlas de edificios, difuso LQ (`hd_<kit>_lq.jpg`, 2048²) | 21,3 MB de GPU | ETC1S q255 | **Sí:** 21,3 → 2,7 MB de GPU, `.ktx2` 0,84 y 0,90 MB frente a JPEG de 1,33 y 1,60 MB |
| Atlas de edificios, difuso LQ móvil (`_lq1024.jpg`, 1024²) | 5,3 MB | ETC1S q255 | **Sí:** 5,3 → 0,7 MB de GPU |
| Normal del atlas (`_n_lq.jpg`) | no se baja (normal plana 2×2) | — | No aplica |
| Atlas 4096² (`hd_<kit>.jpg`) | solo medio/alto de escritorio | — | Fuera de alcance (ver recomendación) |
| Flora (hojas, corteza, pasto) | 20,4 MB, embebidas en los GLB (WebP) | ETC1S (candidata) | **No por ahora:** el GLTFLoader de r128 no lee `KHR_texture_basisu`; habría que reempaquetar los GLB y ampliar el loader (cambio de arquitectura) |
| Kit de edificios embebido (KB3D, «generadas») | 10,8 MB, embebidas | ETC1S (candidata) | **No por ahora:** mismo motivo |
| Vittata y personajes (`Vittata_1/2` 1024², pieles 512²) | 12 MB | UASTC (candidata) | **No:** las de Vittata van embebidas en su GLB (modelo intocable, `character.js` de otro agente); las pieles ahorrarían ~3 MB en total, poco para el riesgo en la protagonista |
| Impostores de la flora | 5,3 MB | — | No aplica: se dibujan en la GPU (render target) |
| UI, cómic, retratos | — | — | No aplica: son imágenes del DOM, no texturas de la GPU |

**Medido** (8-nov; builds de `e407f49a` sin y con el cambio; Chrome 153 sin interfaz con SwiftShader, ventana 1280×800 a deviceScaleFactor 1; el móvil es 390×844 táctil; mismo guion: portada → creador → Empezar, red quieta y 45 s de cuadros; `AV.look.medir()`)
| Escenario (URL) | Texturas en GPU | Atlas en GPU | Descarga (archivos pedidos, tamaño en disco) |
|---|---|---|---|
| Escritorio `?calidad=bajo` | 67,5 → **48,8 MB** | 21,3 → 2,7 | 23,37 → **22,74 MB** (sin los 2 JPEG LQ, con 1,74 MB de `.ktx2` y 0,55 MB de transcoder) |
| Escritorio `?calidad=bajo&escuela=1` | 67,5 → **48,8 MB** | 21,3 → 2,7 | 23,37 → **22,74 MB** |
| Móvil 390×844 `?calidad=bajo` | 51,5 → **46,8 MB** | 5,3 → 0,7 | 21,14 → **21,49 MB** (+0,35: el transcoder pesa más que lo que ahorran los JPEG de 1024) |
| Escritorio `?calidad=medio` | 370,8 → **370,8 MB** (igual, mismo reparto) | 213,3 → 213,3 | mismos `tex_hd` pedidos; ni `.ktx2` ni transcoder |
| Escritorio `?calidad=alto` | 524,8 → **524,8 MB** (igual) | 213,3 → 213,3 | mismos `tex_hd` pedidos (72,21 → 72,22 MB); ni `.ktx2` ni transcoder |
- **Descarga con la medida de `test.sh --solo-medir`** (la misma de la puerta, tope 28 MB): 21,76 → 22,47 MB (193 → 197 archivos). Esa medida cuenta lo que llega hasta la red quieta y varía con lo que se cargue antes; la suma por archivo de arriba es la cuenta exacta de lo que se cambia: −2,93 MB de JPEG y +2,30 MB de `.ktx2`, transcoder y loader.
- **Imagen** (escritorio `?calidad=bajo`, deviceScaleFactor 1): en la misma sesión y el mismo cuadro, 3 vistas del atlas Ancient dibujadas con el KTX2 (ETC2 en SwiftShader, 12 mipmaps) y con el JPEG de hoy. Píxeles con alguna diferencia de canal > 8: 0,96 %, 0,81 % y 4,49 % (la vista 3 es un primer plano de roca). PSNR: 44,7, 45,5 y 38,0 dB. Diferencia media: 0,54, 0,49 y 2,19 niveles; máxima: 40, 37 y 32. El ruido de repetir la misma vista con la misma textura es 0. A 1:1, en el primer plano de roca se ven bloques 4×4 muy suaves; a distancia normal no se distinguen. En «bajo» se juega a DPR 0,75.
- **FPS y tiempos de cuadro:** con SwiftShader (GPU por software) y otra prueba en la misma máquina, el juego va a 0,2–0,6 FPS (mediana de 1,5 a 4,3 s por cuadro) antes y después. Esos números no sirven para comparar. La medida de FPS, de los tiempos de cuadro (mediana, p95 y p99) y de los tirones de más de 50 ms la hacen Kimi 1 (perfil Chromebook) y Kimi 2 (móvil) con GPU real. Lo que sí se sabe: el transcoder corre en un worker, fuera del hilo principal, y subir 2,7 MB comprimidos cuesta menos que subir 21 MB en RGBA.
- **Pruebas:** con `test.sh` 12/12 baterías, 0 errores de consola, 1 170 peticiones sin 404. lookTest 44/44. streamingTest no terminó en 600 s con SwiftShader.

**Recomendación para medio y alto (no se hace ahora).** En la GPU, el atlas 4096² de escritorio ocupa 85 MB por textura en RGBA; en ETC1S serían ~10,7 MB. Además, `hd_<kit>.jpg` (4,1 y 5,2 MB) bajaría a unos 3,5 a 4,5 MB en `.ktx2`. Es el mayor ahorro de memoria que queda. Antes de extenderlo hace falta:
- la evidencia de Kimi 1 y Kimi 2 con GPU real (memoria, estabilidad y tirones);
- una comparación de imagen en alta, donde el atlas se ve de cerca a DPR 1,5 y quizá convenga UASTC.

La flora y el kit embebido necesitan `KHR_texture_basisu` en el GLTFLoader: es un cambio de arquitectura y lo decide Kelvin.
