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
