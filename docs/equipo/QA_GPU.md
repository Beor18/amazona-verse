# QA con GPU real (BM1)

Mac con Chrome 156 headless (`--use-angle=metal --enable-gpu`). Las pruebas de la nube no miden tiempos ni streaming; esto sí. Se repite cada 4 horas.

## Ronda 1 · 28-oct · HEAD `4df4f8a` (build `tools/build/salida/bm1-head`)
Ojo: durante la ronda había otros 2 agentes usando la Mac (carga alta), así que los tiempos son un techo.

### `test.sh --extra` entero (19 min 55 s)
- **Obligatorias:** todas en verde salvo `movementTest` 46/47 → **QA-67** (`losa_piedra@kelvin_aldea_rio_este_2#0` se mete 10).
- **Extras en rojo:** `streamingTest` 19/20 (151 draw calls en `kelvin_ruinas_yunque`, tope 150 → QA-68), `lookTest` 39/44 y `banqueteTest` 43/44 (QA-69), `ep2e2eTest` 42/51, `bohiosTest` (tiempo agotado a 600 s) y `ep5Test` (`null.click` en `content/ep5/pack.js:805`) → QA-70.
- Verdes con tiempos: `contextTest` 28/28 en 10,0 s, `streamingTest` 42,8 s, `retosTest` 115/115 en 15,3 s, `climaTest` 31/31 en 13,0 s, `flightTest` 57/57 en 8,2 s.
- Red: 2954 archivos locales ok, 0 con 404, 0 externas; consola: 0 errores, 1 aviso. Carga inicial 4,82 MB en 170 archivos; heap 44,6 MB (13,3 MB tras GC).

### FPS y tirones (`qa_movil.py`, cap. 1; cuadros en ms: p50 / p95 / peor / cuadros >100 ms)
| Escena | Móvil 375×812 dpr 3, CPU ×4 | Escritorio 1280×800 dpr 1, CPU ×1 |
|---|---|---|
| portada | 117 / 2083 / 2083 / 4 | 83 / 1767 / 1767 / 3 |
| «Empezar» (jugar) | 233 / 1017 / 1017 / 5 | 167 / 733 / 733 / 3 |
| apertura 6 s | 50 / 133 / 150 / 37 | 50 / 133 / 200 / 24 |
| apertura 30 s | 50 / 133 / 267 / 127 | 83 / 117 / 183 / 95 |
| paseo 15 s | 50 / 167 / 533 / 66 | 33 / 133 / 333 / 57 |
| pausa | 50 / 117 / 150 / 4 | 50 / 150 / 167 / 6 |
| capítulo completo (`missionTest` 70/70) | 117 / 3267 / 9916 / 22 | no se jugó (`--sin-fin`) |

Memoria: heap 34 → 82 MB, texturas 93 → 174 MB. 0 errores de consola; ninguna escena falla.
Nota: el medidor es el de `qa_movil.py` (cuadros reales del navegador, sin el panel `?fps=1`); el escritorio con la Mac cargada da p50 de 33–83 ms (12–30 fps), por debajo de lo que dará una Mac libre.

### QA-53 (congelón al pulsar «Empezar») con `--perfil`
- Peor cuadro de «Empezar» en el móvil emulado: **1017 ms** (era 6016 ms antes de G22; 2,4–3,7 s en la ronda de BC2). En escritorio, 733 ms. Mejora confirmada; no llega aún a menos de 250 ms.
- Perfil de CPU (apertura): `getProgramParameter` 1209 ms (compilación de shaders síncrona: 606 ms en `conCapa31`, 445 ms en `capturarManga`, 158 ms en `draw`), `solidos.js` `block`/`insert`/`tri` 461 + 271 + 205 ms, `triQuery` (`terreno.js:129`) 137 ms, recolector 321 ms, `vegetacion.actualizar` 93 ms.
- Lo que queda: la compilación en `capturarManga` y `conCapa31` (programas que se enlazan al primer uso) y los sólidos. Va a `PEDIDOS.md` para el carril A.
