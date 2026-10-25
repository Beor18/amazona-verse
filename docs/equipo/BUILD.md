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
- **Medido** (`build.sh HEAD` 0751c92 y `test.sh --extra`): descarga inicial de 7,98 MB (antes 13,33 MB), lo publicable 17,3 MB (antes 37,8) y las 13 baterías en verde.
