# Build y publicación del artifact (dueño: Build/Release Engineer)

- **Build:** `tools/build/build.sh <ref> [<salida>] --anterior <lista>`. Exporta `<ref>` con `git archive`, sin tocar la copia de trabajo. Después:
  - quita los `.glb` y `.blend`;
  - marca `index.html` con `<meta name="ave:sin-glb">`, así `loadGLB` va directo al `*_glb.js`, sin 404 de sondeo;
  - poda lo que nada carga, recomprime texturas sin pérdida visible (PSNR ≥ 40 dB) y valida.
  - Salida por defecto: `tools/build/salida/<ref>-<commit7>/`.
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
