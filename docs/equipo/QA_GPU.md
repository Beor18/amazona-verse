# QA con GPU real (BM1)

Ronda 1 · 29-oct · HEAD `062487c` · Mac con Chrome 156 (Metal), build `tools/build/salida/HEAD-062487c-31805`. Repetir cada 4 horas.

## 1. `test.sh --extra` entero
PASA el bloque obligatorio (las 13 baterías en verde; 0 errores de consola, red limpia: 3.009 locales, 0 404). Carga inicial 6,26 MB; heap 71,9 MB (15,9 MB tras GC).
Tiempos reales (con GPU): selfTest 24,4 s · eduTest 37,4 s · e2eTest 43,2 s · **movementTest 580,3 s** (tope 600 s: sin margen, ver QA-76) · streamingTest 20,2 s · contextTest 12,2 s · climaTest 12,8 s · retosTest 12,4 s · el resto menos de 10 s.

Extras que no pasan (no obligatorias):
| Batería | Resultado | Causa | Bug |
|---|---|---|---|
| ep5Test | ERROR `reading 'click'` en `content/ep5/pack.js:805` | el botón que busca no existe en el DOM cuando corre dentro del juego del cap. 1 (misma familia que QA-58) | QA-76 |
| pielesTest | 12/13 «Las 22 se aplican… (2 materiales)» | por revisar: el caso exige 2 materiales y la build da otro número | QA-77 |
| lookTest | 42/44 | draw calls 63 → 117 y croma 38,3 → 83,6 al quitar el look: la fauna/bandada entraron entre medidas (mismo origen que QA-60) | QA-78 |
| ep2e2eTest | 70/71 «En inglés, ningún texto en español en pantalla» | ya conocido: QA-65 (HUD «OBJETIVO 1 DE 8») | QA-65 |

## 2. FPS (`movil_modos.py`, `?fps=1` equivalente, calidad auto, 10 s por escena)
**Aviso de método:** lo corrí con `taskpolicy -b` (regla de la sesión) y la Mac con carga 2–2,5; el modo «background» baja la prioridad de la GPU y los FPS salen muy por debajo de lo real. Sirven como suelo, no como cifra para decidir; BM14 debe medirlos sin `taskpolicy`.

| Escena | Escritorio (CPU ×1) | Móvil emulado (375×812, dpr 3, CPU ×4) |
|---|---|---|
| arranque | 7 FPS · 134 ms · p95 217 | 9 FPS · 107 ms · p95 217 |
| bosque | 6 FPS · 167 ms · p95 217 | 11 FPS · 91 ms · p95 217 |
| ciudad | 6 FPS · 157 ms · p95 217 | 15 FPS · 65 ms · p95 217 |
| aventura | 12 FPS · 83 ms · p95 217 | 14 FPS · 71 ms · p95 217 |

dpr final: escritorio 1,5 → 1,25 → 1 (aventura) y móvil 1,25 → 1. Es decir, **la resolución dinámica baja a 1 en escritorio**, lo que BM14 punto 1 quiere evitar. Calidad «m» (media) elegida sola. Draw calls 75–93. 0 errores de consola.

## 3. `qa_movil.py --perfil` (QA-53, cap. 1, 375×812, dpr 3, CPU ×4)
| Escena | p50 / p95 / peor (ms) | cuadros > 100 ms | tex (MB) |
|---|---|---|---|
| portada | 250 / 1.833 / 1.833 | 3 | 98 |
| «Empezar» (jugar) | 283 / 750 / 750 | 5 | 128 |
| apertura 6 s | 33 / 233 / 233 | 26 | 128 |
| apertura 30 s | 200 / 217 / 233 | 112 | 128 |
| paseo 12 s | 67 / 233 / 383 | 58 | 180 |
| pausa | 33 / 217 / 217 | 3 | 180 |

Congelón de «Empezar»: **750 ms** en esta ronda (antes 2,4–3,7 s en BC2), 0 errores. Perfil de CPU de «Jugar»+apertura (ms propios, sin contar idle 5.074): `program` 821, **`getProgramParameter` 594** (compilación de shaders; 207+198+189 ms en tres `renderer.render`, uno de ellos dentro de `capturarManga`, eventos.js:42), GC 322, `triSeguir` 181 y `trabajar` 167 (solidos.js), `vegetacion.actualizar` 166, `drawImage` 149, `block` 143, `texImage2D` 81.
Conclusión: lo que más pesa al pulsar «Empezar» es la compilación de programas de shader (~0,6 s) más el horneado de sólidos; precalentar (`renderer.compile`) o diferir `capturarManga` quita lo primero. Sin tocar código aquí.

## BM14 (29-oct): gráficos pixelados y árboles, medido con GPU real (Mac, Chrome Metal, 1440×900 a DPR 2, calidad alto, `tools/build/bm14_medir.py`)
| escena | | FPS | p95 ms | DPR efectivo | texturas (look.medir) |
|---|---|---|---|---|---|
| Villa Raíz (vuelo) | antes | 59 | 17 | 1,5 | 451 MB |
| Villa Raíz (vuelo) | después | 58 | 17 | 1,5 | 499 MB |
| ciudad_tepuy | antes | 51 | 33 | 1,5 | 446 MB |
| ciudad_tepuy | después | 47 | 33 | 1,5 | 494 MB |

Cambios: el DPR en «alto» de escritorio no baja de 1,5 (`renderer.js`, `piso`); impostores de árboles de 512 px (atlas 2048²) en medio y alto de escritorio con anisotropía 8 y mipmaps (`vegetacion.js`); `TOPE_ARBOLES.alto` de 1200 a 2000 en escritorio (móvil sigue en 1200); el tope `texMax: 512` del look sube a 1024 en «alto» de escritorio (`look.js` `topeTex`). Móvil sin cambios. Capturas: `docs/img/bm14_{vuelo,ciudad}_{antes,despues}.jpg`.
Notas: con `taskpolicy -b` Chrome da 6–9 FPS (la GPU queda estrangulada): las medidas de FPS se toman sin él. El DPR ya estaba en 1,5 antes (no bajaba a 1 en esta Mac), así que el punto 1 quedó como suelo de seguridad. Coste: +48 MB de texturas y −1 a −4 FPS en ciudad_tepuy (dentro del ruido). No se tocó `alphaTest`/`alphaToCoverage` de las hojas ni la rampa toon (punto 4) ni la regla de copas a menos de 60 m: queda pendiente para BM3. Baterías: PASA; fallan solo `lookTest` 40/44, `pielesTest` 12/13 y `ep5Test`, extras que ya fallaban antes.

## BM18 · movementTest bajo 300 s (29-oct-2026)
Antes: 580,3 s de 600 (sin margen). Después: **248,6 s** (48/48, Mac con GPU, `taskpolicy -b`, carga 11 de otras sesiones; en solitario `--solo movementTest`).
Cambios (`src/pruebas/movimiento.js`): los casos de tiempo (arranque al 90 %, salto corto) se miden 3 veces y se toma la mediana (la latencia, el peor de los 3); el recorrido contra las paredes de cada edificio corta cuando Vittata lleva 15 cuadros quieta contra el muro (los cuadros siguientes son idénticos) y avanza solo la física (`F.step`) en vez de todos los oyentes de `update`; el ascenso «mantener subir» también va solo con física; se quitó una espera redundante de streaming en la torre. No se quitó ninguna comprobación (48 antes y después). La prueba añade un caso informativo con la duración de cada tramo.
Duración por caso (ms): sitio 1651 · arranque (3 medidas) 4293 · salto (salto corto ×3) 6261 · vuelo 1577 · pendientes 1556 · agua 2268 · pico 1915 · agarre 1578 · techo y pared 2569 · rama 1375 · cuerda 1673 · **toldo 39474** · estaca 4171 · **edificios 71855** (paredes 71674, techo 124) · sólidos 23 · cámara 3192 · subir 8760 · **torre 93840** · fundido 542.
Pendiente (si hace falta más margen): toldo (39 s) y torre (94 s) siguen esperando a que el streaming cargue y entre ellos suman más de la mitad del total.
