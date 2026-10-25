# PERFORMANCE_BASELINE · Amazona Verse v20 (auditoría AV-ENGINE-AUDITOR)

Línea base medida sobre `estable` = `f3ed616` (v20) el 2026-10-24, con servidores propios: 8780 (con `.glb`) y 8781 (sin `.glb`, igual que el artifact: `poc/tools/srv_artifact.py`).

## Entorno de medida y validez
| | |
|---|---|
| Equipo | MacBook con Apple M4 (8 núcleos, GPU con Metal 4), 16 GB, macOS 26.6.2 |
| Navegador | Panel integrado de Claude (Chrome 152.0.7977.167, ANGLE Metal) |
| Ventana | Emulada a 1280×720 (`resize_window`), DPR 2 |
| **Validez de los FPS** | `tabs_context` dijo que **el panel estaba oculto**. Aun así, rAF corrió a 51–60 Hz: 51 llamadas en 1 s con la portada, y 300 cuadros en 5 s en villa y en A. Los FPS de abajo son **indicativos de un M4 de escritorio** y no valen como dato de equipo escolar |
| Herramienta | La batería de QA `tests/qa/qa.js` inyectada a mano, más mediciones propias con Resource Timing y `performance.memory` |

## 1. Pruebas automáticas (v20)
- **Resultado global:** 11 baterías, **316/316** comprobaciones, 0 errores ni warnings en consola, 49 s en total.
- **Tiempo por batería:**
  - e2eTest: 8,0 s;
  - maestroTest: 1,8 s;
  - criaderoTest: 1,2 s;
  - el resto: menos de 0,8 s cada una.

## 2. FPS, draw calls y GPU (calidad «alto», DPR dinámico bajó a 1)
| Punto | FPS medio | Mín | 1 % bajo | Tirones > 33 ms | ms/cuadro sintético (p95) | Draw calls | Triángulos | Programas | Texturas |
|---|---|---|---|---|---|---|---|---|---|
| taller (primera vista) | **47,8** | 10 | 20 | **20** | 14,7 (16,5) | 112 | 374.484 | 39 | 98 (13 nuevas al medir) |
| villa | 60 | 57,5 | 58,5 | 0 | 15,3 (17,0) | 97 | 347.356 | 39 | 98 |
| parcela A | 60 | 57,1 | 58,5 | 0 | 14,3 (16,5) | 99 | 366.978 | 39 | 98 |

- **Pasadas por cuadro en «alto»:** 15 (sombras y post).
- **El tirón del taller:**
  - Se produce porque la primera vista sube 13 texturas nuevas mientras se mide. Coincide con QA-20, que se dio por cerrado en 8196c65 con el precalentado.
  - En v20, con el panel oculto, reaparecen 20 tirones. Lo dejo como observación: no puedo distinguir si es regresión o efecto del panel oculto.
- **Coste sintético:** de 14 a 15 ms por cuadro en un M4. Con ese margen, una GPU integrada de escuela (Chromebook, iPad de 2019) probablemente necesite la calidad «medio» o «bajo». Es inferencia: no está medido.

## 3. Memoria
| Medida | Valor |
|---|---|
| Heap de JS al empezar la batería (vía `.glb`) | 34,2 MB |
| Heap tras 10 cambios de ropa | 48,2 MB, con una caché que creció 10,3 MB y se estabilizó |
| Fuga en 10 cambios de ropa | **0** geometrías · 0 texturas · 0 programas · 0 objetos de escena |
| Objetos de GPU (`renderer.info`) | 192 geometrías y 98 texturas al empezar; 240 y 110 ya calentado |
| Heap de JS ~9 s después de cargar | Entre 60 y 180 MB según el momento del GC (cinco muestras en las dos vías). **No es comparable** sin forzar el GC, así que no saco conclusiones de él |
| Cadenas base64 residentes tras decodificar (vía artifact) | **15,2 MB** en 42 cadenas (`AV_MAPA_B64.*`, `AV_EDIFICIOS_B64.*`, `AV_ISLA_B64`…) que nunca se liberan. Es un dato determinista |

**Hallazgo:**
- En el modo publicado quedan 15,2 MB de base64 en `window` durante toda la sesión.
- La primera estimación de «~110 MB más de heap» se descartó: al repetir la medida, el heap varía con el GC.
- La mejora M-2 de `ENGINE_AUDIT.md`, aplicada en esta rama, deja **0 MB** residentes. Ver §7.

## 4. Carga
| Vía | Peticiones | MB transferidos | Detalle |
|---|---|---|---|
| Local con `.glb` (QA, carga en frío) | 127 | **15,43** | Modelos `.glb` 11,9 MB, `.js` 1,97, imágenes 1,78. Primer cuadro a los 641 ms y personaje 3D a los 1.031 ms (localhost) |
| **Como el artifact (sin `.glb`)** | 172 | **19,37** | `_glb.js` 15,5 MB, `.js` 1,94, `.jpg` 1,28 y `.png` 0,46. **46 peticiones 404** de sondeo `.glb` antes de cada `_glb.js`. Red terminada a los 3,9 s en localhost |

**Estimación aritmética** para 19,4 MB, sin latencia ni CDN; no es una medida:

| Ancho de banda efectivo | Tiempo de descarga |
|---|---|
| 10 Mbps | ≈ 15,5 s |
| 25 Mbps | ≈ 6,2 s |
| 50 Mbps | ≈ 3,1 s |

Con 25 dispositivos compartiendo el ancho de banda de un aula, hay que multiplicar.

## 5. Tamaño de los assets
| Medida | Valor |
|---|---|
| Publicable (lo que va al artifact) | **35,51 MB** en 320 archivos |
| Por carpeta | `_glb.js`: ropa 11,6 MB, edificios 10,6 y entorno 4,0. Texturas 3,1. Vittata 1,7. Mapa 2,1 |
| GLB en el repo | 94 archivos, 35,7 MB y 777.848 triángulos en total. 38 con piel; 1 con animaciones (vittata) |
| Compresión en los GLB | **Ninguna.** Ni `KHR_mesh_quantization` ni `EXT_meshopt_compression` ni texturas KTX2. Extensiones usadas: `KHR_materials_specular` (20), `emissive_strength` (3) e `ior` (1) |
| `vittata.glb` | 1,31 MB: 28.268 triángulos, 60 huesos y 5 clips × 180 canales. JSON de **216 KB** (las pistas de animación sin optimizar). Índices de 16 bits |
| Sin uso en el repo (no se publican) | `vittata_base.glb` (10,9 MB, 369.730 triángulos, sin esqueleto), `vittata_base_lod1.glb` (0,5 MB) y `terreno_amazonas.glb` (0,97 MB) |
| Edificios | ~0,4–0,6 MB por GLB con solo 3–5 mil triángulos: el peso está en **las texturas embebidas** (4–7 imágenes por edificio) |
| Artifact publicado | 231 archivos, con huérfanos de versiones viejas: `game.js` (177 KB), `character.js`, `wardrobe.js` y `showcase.js` en la raíz, y `assets/data/lecciones_cap1.json` |

## 6. Lo que no se pudo medir y por qué
| Medida | Por qué no |
|---|---|
| FPS en Chromebook, iPad, iPhone o Android | No hay dispositivos en este entorno. La emulación de Chrome no emula la GPU |
| Safari/WebKit | No está instalado ningún WebKit controlable desde aquí |
| FPS con el panel visible | El panel estaba oculto, y un agente no puede mostrarlo: tiene que hacerlo Kelvin (Cmd+Shift+B). Repetirlo con el panel visible confirmaría las cifras |
| Tiempo de carga real en el visor de claude.ai | No jugué dentro del visor. Las cifras de la vía artifact son con el servidor local |
| Consumo de batería y temperatura | Sin instrumentación |
| Memoria de GPU en bytes | WebGL no la expone. Solo hay recuentos de `renderer.info` |

## 7. Mejora aplicada en esta rama (`src/engine/assets.js`)
Medido con el servidor que imita el artifact (8781). Estas cifras son deterministas: no dependen de la carga del equipo.

| Medida | v20 | Rama con M-1 y M-2 |
|---|---|---|
| Peticiones | 172 | **127** |
| 404 de sondeo `.glb` | 46 | **1** |
| Base64 residente | 15,2 MB | **0** |
| Personaje 3D | Sí | Sí |
| Errores de consola | 0 | 0 |

- **Tiempo hasta terminar la red:** 10,5 s con v20 y 7,4 s con la rama.
- Lo mido con load average de 21–27 (otros agentes con Blender), así que no es fiable.
- **Batería completa sobre la rama: no corrida.** El panel quedó oculto y sin rAF. Es lo primero que hay que hacer antes de integrar.

## 8. Godot (PoC): cifras de la corrida aprobada
Condiciones de la corrida:
- ventana propia de 1280×720, renderer Compatibility (GL), en el M4;
- `nice -n 15` sin `-b`, aprobado por Kelvin para una sola corrida;
- el panel del navegador estaba oculto;
- 4 procesos de Blender `-b` de otros agentes y load average de 21–23.

Resultados:

| Medida | Valor |
|---|---|
| FPS medio | **77,9** (mín 52) |
| Draw calls | 15,6 |
| Primitivas | 40.562 |
| Memoria estática | 42 MB |
| Memoria de video | 19,8 MB |
| RSS máximo | 214 MB |

- La misma corrida con `taskpolicy -b` dio 27,4 FPS: no es comparable.
- **La escena web equivalente no se pudo medir.**
  - El panel oculto dejó rAF en 0.
  - Chrome con ventana bajo `-b` no informó en 120 s.
  - Es una escena de juguete, así que su FPS no decide nada. El dato útil del motor actual es el del juego real: 60 FPS con 97–112 draw calls en El Yunque (§2).

## 9. Cómo repetir
1. Arranca el servidor:
   ```
   ~/Applications/Blender.app/Contents/Resources/4.2/python/bin/python3.11 -I -m http.server 8780 --bind 127.0.0.1 --directory <repo>
   ```
2. Para la vía artifact, arranca este otro:
   ```
   …python3.11 -I ~/AmazonaVerse/_auditoria_motores/poc/tools/srv_artifact.py <repo> 8781
   ```
3. En la consola de la pestaña, ejecuta:
   ```
   window.AVQA_OPTS={save:false}; (d=>{const s=d.createElement('script');s.src='tests/qa/qa.js?'+Date.now();d.head.appendChild(s)})(document); await AVQA.done; AVQA.last
   ```
