# Rendimiento en PC con GPU real (KIMI-Task-015)

Medido el 3-nov-2026 por Kimi 2 (PC Windows de Kelvin, Chrome con GPU AMD real vía ANGLE/D3D11,
headless=new, 1920×1080, dpr 1, look de fábrica `vibrant_toon`, jugador nuevo por toma).
Herramienta: `node tools/build/kimi2_rendimiento.js` (Node/CDP, sirve la copia de trabajo;
réplica de escritorio de `tools/build/tris_medir.py`). Datos y capturas: `docs/img/kimi015/`
(`resultados.json` + `<pack>_<calidad>_<fase>.jpg`).

Método por toma: `?pack=<id>&mapa=real&calidad=<nivel>` → portada → creador → Empezar →
asentar streaming en la villa de aparición → 12 s de medición en dos fases: **aparición**
(vista quieta del spawn) y **giro** (rotación de cámara de 360°, que entra en zonas nuevas).
Lecturas: FPS medio y peor cuadro de `requestAnimationFrame`, draw calls y triángulos de
`AV.G.renderer.stats()` (el `renderer.info.render` de three solo cuenta el último pase, el post).

**Condiciones:** la otra sesión de Kimi (006/008/013) corría a la vez en esta PC; los números
son conservadores (contención de CPU). 24 tomas seguidas, 0 errores de consola.

## Tabla (antes)

| Capítulo (villa/zona de aparición) | Calidad | FPS aparición | peor cuadro aparición | draw calls | triángulos | FPS giro | peor cuadro giro |
|---|---|---|---|---|---|---|---|
| cap1 · Villa Raíz (134, 183) | alto | 142,8 | 27,9 ms | 164 | 918 k | 142,2 | 27,8 ms |
| cap1 · Villa Raíz | medio | 143,8 | 20,9 ms | 143 | 528 k | 143,6 | 20,9 ms |
| ep2 · Caney del Meandro (−20, 34) | alto | 143,7 | 20,8 ms | 138 | 839 k | 138,4 | 104,1 ms |
| ep2 · Caney del Meandro | medio | 143,8 | 20,9 ms | 123 | 497 k | 140,5 | 20,9 ms |
| ep3 · desembocadura (172, 174) | alto | 143,7 | 21,0 ms | 113 | 891 k | 139,5 | 104,1 ms |
| ep3 · desembocadura | medio | 143,8 | 20,9 ms | 98 | 475 k | 143,4 | 20,9 ms |
| ep4 · río de Villa Raíz (191, 165) | alto | 143,8 | 20,9 ms | 142 | 865 k | 143,4 | 20,9 ms |
| ep4 · río de Villa Raíz | medio | 143,7 | 20,8 ms | 128 | 463 k | 143,6 | 20,9 ms |
| ep5 · meseta del tepuy (−46, −121) | alto | 143,8 | 20,9 ms | 115 | **2201 k** | 140,5 | 62,5 ms |
| ep5 · meseta del tepuy | medio | 143,8 | 20,8 ms | 107 | **1250 k** | 143,4 | 13,9 ms |
| ep6 · Ciudad de los 36, río (44, −62) | alto | 143,8 | 20,7 ms | 124 | 677 k | 142,8 | 27,7 ms |
| ep6 · Ciudad de los 36 | medio | 143,8 | 20,9 ms | 105 | 385 k | 141,1 | 83,3 ms |

## Conclusiones (3-nov)

- **Ninguna villa pasa de 200 draw calls ni baja de 50 FPS** en alta (máximo 164 calls,
  mínimo 138,4 FPS). No se disparan recortes de draw calls en esta PC.
- Los peores cuadros (62–104 ms) aparecen **solo en la fase giro**, al entrar zonas nuevas al
  streaming durante el primer 360° (carga de piezas al vuelo). Es el tirón conocido de carga
  (G9 no lo reprodujo en SwiftShader; QA-53 lo tiene anotado como carril D para 006+008).
  La fase aparición queda siempre ≤ 28 ms: el tirón de «Empezar» (QA-53) sigue corregido.
- **ep5 (meseta) es el pico de triángulos del juego: 2,2 M en alto, 1,25 M en medio** con solo
  115 draw calls. La PC lo mueve sobrada; la vista que manda en iPad (KIMI-011 ya bajó
  medio/bajo a 1,41 M/0,73 M en el tepuy, `33fb0e2`). Si hay que recortar más triángulos en
  alto, la palanca es el tope `hdTris` de `streaming.js`, no los draw calls.
- cap1 alto 164 calls / 918 k tris cuadra con la medición de QA-53 (116–121 calls en la zona
  de aparición tras 20 s de juego; aquí 164 con el vuelo/giro y el dosel a la vista).

## KIMI-019 · vecinos (CG-44) y ciudad viva (N17) en móvil (4-nov)

Medido por Kimi 2. Herramienta nueva: `node tools/build/kimi2_vecinos.js [--micro|--simple]`
(móvil 375×812 dpr 3, UA iPhone, CPU ×4, GPU real; A/B **en página** porque no existe
`?vecinos=0`: `G.quiet` apaga los dos sistemas y al quitarlo se repueblan solos;
`ciudadViva.pausa(true)` + limpiar las entradas `ciudad` de `G.bandada.EXTRA` aísla la ciudad
viva; la malla instanciada `vecinos` se apaga con `count=0` y se restaura con `estado().n`).

**Coste de GPU (exacto, de las pruebas de entrega CG-44/N17 y verificado en código):**

| sistema | calidad media | calidad alta | se apaga |
|---|---|---|---|
| vecinos (CG-44) | +1 call · +840 tris (6) | +1 call · +1,7 k tris (12) | > 90 m de sus sitios, en bajo o en `quiet` |
| ciudad viva (N17) | +1 call · +1,5 k tris (10) | +1 call · +2,4 k tris (16) | > 190 m de la ciudad (LOD: paso cada 1/3/6 cuadros por distancia) |
| **ambos (ciudad)** | **+2 calls · ≤ 2,5 k tris** | +2 calls · ≤ 4 k tris | — |

Mallas: vecinos = 1 `InstancedMesh` de esferas con `instanceColor` (sin textura); ciudad viva =
reutiliza las 2 mallas instanciadas que ya usa la bandada (0 mallas nuevas). **0 texturas nuevas
en ambos** → la memoria de GPU no sube por ellos.

**Memoria móvil medida (texGPU, ambos activos):** ~377 MB en Villa Raíz y ~403 MB en la Ciudad;
el delta Villa→ciudad es el streaming de la zona (edificios/terreno), no de estos sistemas.
Heap JS: el del mundo en ambas vistas. 0 errores de consola en las 3 corridas.

**FPS delta ON−SIN: sin concluir.** La PC tenía a las otras dos sesiones de Kimi midiendo a la
vez (hasta 60 Chrome headless) y los stalls de streaming ajenos (hasta 19 s en una toma)
envenenan las ventanas de 8 s. Las tomas válidas tras asentar quedaron: Villa media ON 101
calls / 496 k tris (cuadro p50 42 ms) y ciudad media ON 110–122 calls / 772–835 k tris
(p50 28–56 ms), pero no son comparables cara a cara. **Pendiente: re-medir cuando la PC esté
libre** — `--simple` (Villa+ciudad de día, ON/SIN/ON con asentamiento) y `--micro` (ms/cuadro
de CPU de `paso()+pintar()` forzando `paso(0.016,'todo')`, inmune al GPU).

**Conclusión (4-nov):** memoria sin cambio, +2 draw calls y ≤ 2,5 k triángulos de margen
(negligible frente a los 460–890 k de la vista) y CPU escalonada por distancia con apagado
lejos. Con estos números **no hay nada que recortar antes de ampliar** los vecinos/la ciudad
viva; la única condición pendiente es confirmar con `--micro` que `paso()+pintar()` cuesta
< 0,5 ms/cuadro con CPU ×4.

## Recomendaciones (sin hacer, deciden Kelvin/Fernando)

- PC: nada urgente. El presupuesto de 200 calls / 50 FPS se cumple con margen en las 24 tomas.
- iPad: seguir la línea de KIMI-011 (LOD por distancia ya en medio/bajo); la meseta del tepuy
  en alto seguirá siendo pesada para la GPU del iPad.
- Los picos de giro se atajan precargando las zonas colindantes al aterrizar (misma familia que
  la precarga de la caleta del coquí, C4); es trabajo de `streaming.js`/`terreno.js` (carril D,
  coordinar con la otra sesión de Kimi).
