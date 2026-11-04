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

## KIMI-017 · lag en móvil al moverse (4-nov, en curso)

Medido por Kimi 3. Herramienta nueva: `node tools/build/kimi3_017.js [--etiqueta X] [--tramos N]`
(móvil 375×812 dpr 3, UA iPhone, CPU ×4, GPU real de la PC; jugador nuevo en cap1; mide la
apertura tras «Empezar» y un vuelo por tramos con teleports: Villa Raíz → camino oeste →
colina de lonas → lomas → río oeste → ciudad del tepuy → meseta; sin drenar el streaming, que
reacciona como en el juego).

**Cambios en `streaming.js` (ambos sin tocar la visibilidad de las mallas):**
- `subirTex`: al fundir una zona/lote/global, las texturas de sus materiales se suben a la GPU
  de una en una con la cola de trabajos (`renderer.initTexture`, presupuesto `CFG.msCuadro`),
  no dentro del primer cuadro que dibuja la malla. Antes: hasta 21 MB de atlas (2048²) en un
  solo cuadro al entrar en una zona.
- Precarga hacia adelante (`CFG.precargaVuelo` 2,5 s × velocidad, tope 120 m, solo si
  Vittata vuela a > 15 m/s): pide el lejano de las zonas que va a entrar en alcance y el kit
  (`cerca`) de la gran ciudad antes de llegar; las referencias se sueltan al tomar el relevo o
  al dejar de acercarse. A pie no precarga (los gags del cómic capturan a velocidad baja).
- Descartado: «estreno» escalonado por visibilidad (retrasar `visible` de las mallas nuevas
  de 2 en 2 por cuadro). Mejoraba los números pero las viñetas del cómic hacen fotos del mundo
  en cualquier momento: una malla aún invisible sale en blanco en la viñeta (comicTest 61/67
  con fallos de apariencia; también riesgo real en el juego).

**p95 por tramo (ms), misma máquina y ruta:**

| tramo | antes | ahora | peor antes | peor ahora |
|---|---|---|---|---|
| camino_oeste | 2986 | 215 | 2986 | 2028 |
| colina_lonas | 826 | 445 | 868 | 1167 |
| lomas | 576 | 278 | 1167 | 1278 |
| rio_oeste | 132 | 104 | 1313 | 160 |
| ciudad_tepuy | 160 | 90 | 236 | 243 |
| meseta | 417 | 146 | 847 | 195 |

Media de p95: **850 → 213 ms (×4)**. rio_oeste, ciudad y meseta sin cuadros > 200 ms.
Draw calls en los tramos: 23–66 (igual que antes del cambio); 0 errores de consola.

**Queda (por eso sigue EN CURSO):** los picos de los dos primeros tramos tras teleport lejano
(camino_oeste 2028 ms, lomas 1278 ms): fetch+parse de varios GLB seguidos con
`CFG.descargas: 1` en caliente; en vuelo real continuo la precarga los adelanta, pero el
teleport repentino no da tiempo. La contención de la PC (otras sesiones de Kimi con decenas
de Chrome headless) envenena las comparaciones: en la misma sesión, cuadros ajenos de
2,5–4,4 s en la apertura con el jugador quieto (y HEAD puro da la misma varianza).
**Pendiente:** re-medir con la PC libre y valorar `CFG.descargas: 2` fuera de arranque.

### Re-medición con la PC libre (4-nov ~06:00 UTC)

La sesión anterior quedó cortada por un corte de luz/PC con ~120 procesos Chrome headless
zombi (`Temp\kimi*`) que tenían la RAM al 100 % (965 MB libres de 24 GB). Tras matarlos
(20 GB libres) se repitió la medición, 2 rondas por configuración, mismo móvil simulado
(375×812 dpr 3, CPU ×4, GPU real). Archivos: `mediciones-base-pclibre.json` y
`mediciones-descargas2.json` en `docs/img/kimi017/`.

p95 / peor por tramo (ms), ronda 1 y ronda 2:

| tramo | base r1 | base r2 | descargas:2 r1 | descargas:2 r2 |
|---|---|---|---|---|
| apertura (Empezar) | 1660 / 1660 | 1597 / 1597 | 1653 / 1653 | 1590 / 1590 |
| camino_oeste | 451 / 1333 | 201 / 500 | 458 / 1333 | 347 / 583 |
| colina_lonas | 181 / 479 | 63 / 431 | 417 / 1090 | 90 / 167 |
| lomas | 42 / 507 | 111 / 1264 | 90 / 389 | 139 / 451 |
| rio_oeste | 69 / 646 | 63 / 264 | 56 / 104 | 49 / 125 |
| ciudad_tepuy | 160 / 465 | 90 / 431 | 97 / 271 | 118 / 479 |
| meseta | 70 / 528 | 83 / 521 | 70 / 160 | 104 / 160 |

**Conclusiones:**
- `CFG.descargas: 2` en caliente mejora los tramos con varios GLB en cadena: rio_oeste
  (peor 646→104 y 264→125) y meseta (peor 528→160 en ambas rondas) quedan sin cuadros
  > 200 ms. Se queda en 2 (el arranque ya usaba 3).
- El pico de camino_oeste (1333 ms, ronda 1 de las dos configuraciones) NO era de
  descargas: sobrevive igual con 2 concurrentes; es el primer teleport tras el spawn,
  dominado por fundir/estrenar la zona nueva (trabajo de cola ya presupuestado, no red).
- La apertura tras «Empezar» tiene **un cuadro constante de ~1600 ms** (p50 90 ms) en
  las 4 rondas y las 2 configuraciones: no es de descargas ni de la contención. Es el
  primer cuadro visible del mundo tras pulsar Empezar (precalentado de `renderer.js`,
  carril de KIMI-012/Kimi 2): que lo miren ellos; anotado en BUGS.md QA-53.
- Draw calls 41–68 en los tramos (igual que antes); 0 errores de consola en las 4 rondas.

**Baterías:** iguales que HEAD puro en las mismas corridas (mismo código de edificios):
movementTest 43/48, criaderoTest 17/18, e2eTest 28/31 y comicTest intermitente (61–65/67;
HEAD puro 2× dio 63/67 con los mismos fallos). Esos rojos son preexistentes en main (no son
del cambio); comicTest se verificó 6 veces hoy con y sin cambios.

## Recomendaciones (sin hacer, deciden Kelvin/Fernando)

- PC: nada urgente. El presupuesto de 200 calls / 50 FPS se cumple con margen en las 24 tomas.
- iPad: seguir la línea de KIMI-011 (LOD por distancia ya en medio/bajo); la meseta del tepuy
  en alto seguirá siendo pesada para la GPU del iPad.
- Los picos de giro se atajan precargando las zonas colindantes al aterrizar (misma familia que
  la precarga de la caleta del coquí, C4); es trabajo de `streaming.js`/`terreno.js` (carril D,
  coordinar con la otra sesión de Kimi).
