# Coordinación viva — Mac (API) + agente web

Esta hoja la leen y actualizan **los dos equipos** antes y después de cada tarea. Es la única fuente de verdad para no duplicar trabajo y para retomar después de un corte, una desconexión o una recarga de crédito.

## Carriles (no se pisan)
- **Mac (API, GPU real):** gráficos y motor. Archivos: `src/engine/*` de render (`terreno, streaming, vegetacion, dosel, mundo, renderer, solidos`), `src/game/look.js`, `tools/blender/*`, y las pruebas de movimiento/visual. Cola en `tools/agente_api/cola.txt`.
- **Web (cryptochefpr, sin GPU):** todo lo demás — contenido (`content/*`), texto, inglés, datos educativos (con fuente), accesibilidad, bugs no gráficos, pruebas de esos. Tareas en `TAREAS_API.md` «Carril del agente web».

## Regla de oro
**Nadie espera al otro.** Si tu carril se queda sin trabajo real, para y deja nota aquí; NO te metas en el carril del otro. Si el crédito de uno se agota, el otro sigue con lo suyo.

## Protocolo de reanudar (tras corte, reinicio, desconexión o recarga de crédito)
1. `git pull --rebase origin main`.
2. Lee esta hoja y la tabla **Estado** de `TAREAS_API.md`.
3. Toma la primera tarea de TU carril que NO esté «hecha» ni marcada «EN CURSO» por otro aquí abajo.
4. Márcala «EN CURSO · <equipo> · <hora>» en la sección de abajo y haz un commit rápido solo de esta hoja.
5. Trabaja, prueba, haz commit de tu trabajo y súbelo (a `main` o a tu rama `api-*`, que se une sola).
6. Marca la tarea «HECHA · commit» aquí y en la tabla Estado.
Así un corte nunca duplica ni pierde trabajo: el que vuelva toma lo siguiente libre.

## Publicación
La hace la Mac con `tools/build/publicar_mac.sh` (GPU real) o Kelvin; publica `sitio/` cuando las 13 baterías están verdes en `main`. El publicador NO usa crédito de API (es build + git), así que debe seguir aunque la API se quede sin crédito.

## Estado vivo (lo actualizan los equipos)
- 30-oct: backlog BM49–BM75 HECHO y en `main`. Falta PUBLICAR (la web sigue en 09b62ed).
- Mac: cuando haya crédito, retoma el protocolo; si la cola está vacía, abre lote nuevo de `VISUAL_*` solo si hay problema real.
- Web: cuando haya cuota (se reinicia cada 5 h), retoma ronda 2 (BM70–75) o abre lo que quede real; si todo está hecho, para y deja nota aquí.
- 30-oct 18:36 AST · **HECHA · web (este commit)** · cayuco del ep. 3: quitar «de pesca» del dato (DLE; propuesto por BM71), en `content/ep3/lecciones.js`, `pack.js` y `en.js`.
- 30-oct 18:36 AST · **HECHA · web · 93573c6 (D11), e61a8a6 (D32)** · D11 (lo elegido en un capítulo se queda en los siguientes) y D32 completo (en el ep. 6 llegan los guardianes encontrados): resto de BM55, con un registro de temporada compartido entre capítulos (`src/game/` + `content/ep*`). La Mac no lo toma (es contenido).
- 30-oct 19:09 AST · **web sin trabajo real pendiente**: ronda 2 (BM70–75), BM55 completo (con D11 y D32), cayuco y Modo Maestro en EN hechos y en main. Queda para Kelvin: D2 (las voces se ven: arte), revisar las frases nuevas de historia ([DECIDIDO-EQUIPO] y D11/D32) y pasar fichas educativas a «verificado». Para reabrir fuentes educativas hace falta permitir en la red usgs.gov, noaa.gov, fws.gov, rae.es. El web espera tareas nuevas en TAREAS_API.
- 31-oct 15:39 AST · **HECHA · web · b1f3755** (pedido de Kelvin) · cámara: poder mirar hacia arriba (el cielo) al volar y en el suelo; `src/engine/camara.js` (+ input si hace falta). La Mac no lo toma.
- 31-oct 16:20 AST · **Kelvin trae el mapa y los edificios en GLB** en la Mac, fuera del repo: `~/AmazonaVerse/glb_kelvin/mapa/` y `~/AmazonaVerse/glb_kelvin/edificios/` (si cambia la carpeta, se anota aquí). Tareas para la Mac: BM77 (inventario) → BM78 (edificios) → BM79 (Ciudad de los 36) → BM80 (14 asentamientos) → BM81 (terreno y elementos), después de BM76 y antes del backlog visual. Detalle en `TAREAS_API.md`.
- 31-oct 17:12 AST · **Maze congelado (Kelvin):** fuera del menú, de Retos, de la web y de Mis récords (salvo si ya se jugó). Nadie trabaja en Maze hasta nuevo aviso; las pruebas `mazeTest` quedan como estaban (49–51/51, intermitente).
