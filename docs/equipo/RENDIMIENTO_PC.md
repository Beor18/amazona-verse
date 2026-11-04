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

**FPS delta ON−SIN: sin concluir** (la PC tenía a las otras dos sesiones de Kimi midiendo a la
vez y los stalls de streaming ajenos envenenaban las ventanas de 8 s). **Re-medición CPU
(--micro, inmune al GPU) · 04-11 ~09:00 UTC, Kimi 2**: `paso()+pintar()` forzando `paso(0.016,'todo')`
(sin escalonado por distancia: caso peor), móvil 375×812 dpr 3, CPU ×4, mediana de 5 lotes × 200
llamadas: **ciudad viva 0,031 ms/cuadro en medio (10 aves) y 0,062 en alto (16 aves); vecinos
0,012 ms/cuadro en medio (6) y 0,02 en alto (12)** — peor caso 0,082 ms/cuadro, ~6× por debajo
del umbral de 0,5 ms. 0 errores de consola. Evidencia: `tools/build/salida/kimi2-vecinos/resultado.json`.

**Conclusión (4-nov):** memoria sin cambio, +2 draw calls y ≤ 2,5 k triángulos de margen
(negligible frente a los 460–890 k de la vista), CPU escalonada por distancia con apagado
lejos y **confirmado con `--micro`: `paso()+pintar()` cuesta ≤ 0,082 ms/cuadro con CPU ×4 en el
peor caso** (< 0,5 ms exigido). Con estos números **no hay nada que recortar antes de ampliar**
los vecinos/la ciudad viva.

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

### Diagnóstico con atribución y troceo de trabajos (4-nov ~06:30–07:30 UTC)

`kimi3_017.js` crece con `--fases` (reparte los cuadros largos: update / ganchos render /
calentado / dibujo, vía `?fases=1` de renderer.js) y con atribución de trabajos de streaming
> 25 ms (`G.trabajosLentos`, nombre por `encolar(fn, nombre)`).

Medición limpia (PC sin otras sesiones, `mediciones-fases-r1.json`): el pico de
camino_oeste (1076 ms) se reparte así — trabajos de cola: **subirTex 467 ms en UN solo
trabajo** (la fusión nueva subía todas sus texturas de golpe; el troceo por malla no era
suficiente), fundirPaso 35+108 ms, fundirLejosGlobal 97 ms; y en tramos posteriores
fundirHD 421 ms (kelvin_aldea_colina) y fundirCerca 148 ms: fusiones de zona monolíticas.

Fix en `streaming.js` (KIMI-017):
- `subirTex`: UNA textura por trabajo de cola (antes, todas las de la malla en uno).
- `fundirHD` / `fundirCercaZona` / `fundirSombraZona`: en tandas de ~6 ms por trabajo
  (mismo patrón que `fundirPaso` del lejano). Mientras se refunde, la zona dibuja los lotes
  por instancia (más draw calls unos cuadros, mismo aspecto; `terminar()` sigue drenando
  la cola, las baterías no cambian).
- Bug propio del troceo: hay mapas «placeholder» sin `userData` (construir/crearLote en
  frío); el chequeo de `avSubida` ahora los crea. Sin este fix el mundo no arrancaba en
  frío (streamingTest 0/1 «corre sin excepciones»).

Verificación post-fix: streamingTest 22/23 (el rojo es el conocido alto/ciudadVista-650;
draw calls 146 ≤ 150 en la peor vista) y movementTest 48/48 (colisiones, vuelo, toldos).

**Pendiente:** re-medición de los tramos con la PC libre. La corrida post-fix
(`mediciones-troceado-r1r2.json`) coincidió con las otras dos sesiones de Kimi en la PC
(8+ Chrome headless ajenos): picos de hasta 5,3 s con solo 28 draw calls y 39 k tris (GPU
robada, no representativa); en los datos, los trabajos de streaming > 25 ms ya no pasan de
~190 ms (fundirPaso de una instancia grande) y subirTex quedó en ≤ 27 ms por trabajo.

### Re-medición limpia post-troceo (4-nov ~07:00 UTC, PC sin contención)

Antes de medir se mataron 18 Chrome headless zombi `Temp\kimi*` de vueltas anteriores
(0 procesos Chrome ajenos al medir). `node tools/build/kimi3_017.js --etiqueta pclibre-r3
--rondas 2 --fases` (móvil 375×812 dpr 3, CPU ×4, GPU real; `mediciones-pclibre-r3.json`):

| tramo | r1 p95 / peor | r2 p95 / peor | cuadros >200 ms (r1+r2) |
|---|---|---|---|
| apertura (Empezar) | 375 / 1695 | 181 / 1646 | 10 + 6 (QA-53, `renderer.js`) |
| camino_oeste | 118 / 188 | 77 / 167 | 0 |
| colina_lonas | 63 / 174 | 56 / 104 | 0 |
| lomas | 42 / 97 | 42 / 104 | 0 |
| rio_oeste | 42 / 90 | 42 / 56 | 0 |
| ciudad_tepuy | 42 / 167 | 49 / 90 | 0 |
| meseta | 42 / 97 | 49 / 97 | 0 |

**Conclusiones:**
- **El troceo (5bbc465e) cierra el pico del teleport:** camino_oeste pasa de peor
  1333 ms a 188/167 ms y **ningún tramo del vuelo tiene cuadros > 200 ms** en ninguna
  ronda. La «precarga de la zona del teleport» que quedaba pendiente **no hace falta**: el
  pico no era falta de anticipo (un teleport no se puede anticipar), eran los trabajos
  monolíticos de la cola (subirTex de golpe, fundir* sin trocear), ya repartidos.
- Trabajos > 25 ms que quedan: el parse de los GLB `_hd` de los templos grandes al
  teleport al oeste (`procesar:templo_grande_d:hd` 159/142 ms, `procesar:templo_mediano_h:hd`
  99/95 ms; GLTFLoader.parse es atómico) y `fundirHD` suelto de la ciudad en la meseta
  (38–65 ms). Bajo el meta de 200 ms; trocear el parse sería cirugía mayor sin beneficio
  claro. p95 < 50 ms cumplido en lomas/río/ciudad/meseta; camino_oeste p95 118/77 ms
  arrastra esos parses (p50 28–35 ms).
- Apertura: sigue **1 cuadro constante de ~1600–1695 ms** (QA-53, primer cuadro visible;
  carril `renderer.js`). El resto de la apertura va a p50 56–63 ms.
- Draw calls 48–84 por tramo; 184–528 k tris; 0 errores de consola en las 2 rondas.

**Baterías con este estado de main** (`kimi3_baterias.js --baterias`, corrida con Chrome
de la medición aún vivos): verdes selfTest 103/103, missionTest 76/76, accessoryTest 12/12,
templateTest 19/19, eduTest 79/79, maestroTest 26/26, criaderoTest 51/51, saveTest 45/45
y lookCapitulosTest 12/12; movementTest 44/48 y comicTest 59/67 con cuadros de física y
viñetas que **re-corridos en limpio dan 48/48 y 67/67** (`kimi2_una_bateria.js`): los
rojos de la corrida gruesa eran contención, no código.

## KIMI-023 · medidas reales V17 (4-nov, hecha · vuelo re-medido con PC libre)

Medido por Kimi 1 (PC Windows de Kelvin, Chrome headless=new con GPU AMD real RX 5700 XT vía
ANGLE/D3D11, **móvil emulado 390×844 dpr 3, CPU ×4, calidad auto = bajo**, partida sembrada de
cap1 sin creador, look de fábrica). Herramienta nueva `node tools/build/kimi1_v17.js`
(--etiqueta r --solo carga-frio|carga-cache|vuelo): CDP sin librerías, sirve la copia de trabajo
en local e inyecta instrumentación (cuadros rAF, heap cada 0,5 s, mundoListo, jugable =
`worldHidden()===false` con draw calls > 5, bytes de `resource timing`). Flujo de carga =
el del jugador: portada → clic en tarjeta **Aventura** → barra de carga (`#carga`) → mundo.
Ojo: con UA de iPhone la entrada directa `?cap=` **no** entra sola (lleva al menú de modos):
hay que pulsar Aventura (la herramienta lo hace). Datos: `docs/img/kimi023/v17-r*.json`.

### Pantalla de carga, frío vs caché (r3; tiempos en s desde la navegación, en la página)

| Escenario | portada→clic | barra visible | mundoListo | jugable | peor cuadro | p95 | heap máx | bytes |
|---|---|---|---|---|---|---|---|---|
| frío (perfil nuevo) | 0,7 | 3,7 → 26,3 | 17,6 | **26,0** | 2861 ms | 209 ms | 174,9 MB | **42,8 MB** (250 recursos) |
| caché (mismo perfil, 2.ª visita) | 0,5 | 2,9 → 23,6 | 16,1 | **23,6** | 2826 ms | 181 ms | 245,0 MB (pico, acaba 144) | **0 MB** (todo de caché HTTP) |

- La caché HTTP quita **los 42,8 MB de descarga** por completo, pero la barra solo acorta
  ~2,4 s (26,0 → 23,6 s hasta jugable): **la carga es de CPU (parse/construcción), no de red**.
- El peor cuadro de la carga (~2,8–2,9 s) y el p95 (181–209 ms) son el precalentado/compilación
  dentro de la barra (misma familia que QA-53; en bajo con GPU real).
- heap: 109–175 MB en frío según la contención de la PC (r2 dio 109,4 MB con menos carga);
  en caché hay un pico de 245 MB a mitad de carga que el GC baja a 144 MB al final. Coincide
  con la medición de QA-152 (148,1 MB en la pantalla de carga, cap1).
- Al llegar al mundo (bajo): ~55 draw calls / ~0,2 M tris / 75 geometrías / ~140 texturas /
  41–42 programas.
- **Contención:** Kimi 2 medía en la misma PC durante r3 (varios Chrome vivos): los tiempos
  totales son conservadores. La conclusión «la red no es el cuello» se sostiene (bytes 0 con
  tiempos casi iguales).

### Vuelo por la Ciudad de los 36 — re-medido con PC libre (v17-pclibre.json)

Escenario: semilla cap1 → teleport (-20,-133) +36 m → `ST.terminar()` completa (sin tope)
→ círculo de 45 s (r=50 m, h=36±3 m) centrado en la ciudad (-33,-136), cámara mirando al
centro, calidad auto = **bajo**, GPU real AMD RX 5700 XT, **0 procesos ajenos** (13:58 UTC;
Kimi 2 y Kimi 3 ya habían terminado sus vueltas). Herramienta endurecida tras r3/r4: altura
de vuelo subida de 22→36 m (a 22 m la cámara terminaba dentro de la copa de una palma y el
anti-atasco del juego reubicaba a Vittata), memoria muestreada cada 3 s, captura a mitad
de vuelo + al final, `posFin` registrado.

| Métrica (vuelo 45 s) | Valor |
|---|---|
| FPS med / p50 / p10 | **15,6 / 28,6 / 13,0** |
| Peor cuadro / p95 | 3778 ms / 160 ms |
| Draw calls / triángulos (al aterrizar el círculo) | 40 / 194 k |
| Geometrías GPU | 214 → 249 (estables desde el s ~12) |
| Texturas / programas GPU | ~152 / 55→58 (estables) |
| Heap JS | **711 → 885 (pico) → 845 MB** |
| `ST.terminar()` | completó sin tope (ya con el fix 54e24e9a) |

- La media (15,6) la arrastra la primera mitad del círculo: el drenado forzado de **toda**
  la ciudad (terminar) y las fusiones de zonas siguen activos; la mediana (28,6 FPS) refleja
  mejor el vuelo ya cargado. Los 40 calls / 194 k tris finales muestran una vista asentada.
- **Hipótesis de fuga de geometría descartada:** las geometrías suben 214→249 mientras se
  cargan las zonas del círculo y se estabilizan (~245) al volar sobre lo ya cargado; no hay
  crecimiento monotónico en la segunda mitad. tex/prog estables.
- **El heap JS de 711–885 MB sí se reproduce con PC libre** (misma magnitud que las corridas
  contaminadas r3/r4, 727–860): no era contención. Coincide con QA-152 (los ArrayBuffers
  retenidos: atributos Float32Array, promesas con binario crudo y cuerpos GLB): forzar el
  drenado de toda la ciudad de golpe retiene ~700 MB de binarios parseados. En juego real
  (carga progresiva al acercarse) el efecto es el mismo por zona pero repartido; es la
  magnitud lo que el drenado expone. Evidencia cruzada en BUGS.md (QA-152/QA-153).
- El peor cuadro (3,8 s) cae en la fase de drenado/fundido justo tras el teleport; el p95
  (160 ms) ya es jugable-en-móvil-emulado con CPU ×4.
- Capturas: `v17-pclibre-vuelo_mitad.jpg` (vista aérea limpia de la ciudad a 36 m: se ve la
  ciudad, el río y el mar — el fix de altura funciona) y `v17-pclibre-vuelo_ciudad.jpg` (al
  final del 1.er círculo a 30 m aún rozó una copa y saltó el aviso «Vittata se había
  atascado»: por eso el círculo definitivo va a 36±3 m; el anti-atasco actuó una sola vez
  y no corrompió las medidas de la primera mitad).

## CG-67 · basura por cuadro en los módulos de juego (4-nov, avance · Kimi 1)

Herramienta nueva `tools/build/kimi1_cg67.js` (Chrome propio + CDP, móvil 390×844 dpr 3,
CPU ×4, GPU real RX 5700 XT, partida sembrada cap 1; `--js-flags=--expose-gc` para GC
determinista). Dos fases: **A** — sampler de asignaciones de V8 (`HeapProfiler`) en un paseo
de 30 s por Villa Raíz y la Ciudad de los 36, atribuido por archivo de módulo; **B** — basura
determinista por módulo: K = 2000 pasos reales de `paso()` entre lecturas de heap con `gc()`,
basura/cuadro = (H1−H0−retenido)/K, mediana de 3 repeticiones (todo dentro de un eval síncrono:
sin interferencia del bucle del juego). Calidad **bajo** (lo que arranca el iPhone). Evidencia:
`docs/img/kimi067/cg67-{base,post}.json`.

**Tabla (fase B, bytes/cuadro, mediana de 3):**

| módulo | antes | después | qué se quitó |
|---|---|---|---|
| comunidades | 1679 | 1043 | objeto del `EXTRA.push` por persona → persistente; `ids = {}` por cuadro → `Set` persistente |
| ciudad_viva | 2661 | 2675 (sin cambio medible) | cierre de `LOD.find` y objeto del `EXTRA.push` por ave (son ~300 B dentro de una varianza de ±2 kB: los estados vuela/juega dominan; el ms/cuadro 11–33 en CPU ×4 es CPU de `tope()`, no basura) |
| humor | 96 | 48 | cierre de `FLORES.some()` por cuadro |
| sorpresas | 116 | 56 | `centro()` alojaba `{x,z,r}` cada cuadro → caché por identidad del sitio (sampler: 17,4 kB → 0) |
| trucos | 10 | 9 | ya limpio |
| vecinos | 0,04 | 0,04 | apagado en bajo por diseño (0 activos) |
| escondite | 0,03 | 0,03 | inline de `cerca()` sin objeto por cuadro (mide sin partida activa; durante la partida quedaba `{d,quien}` + cierre `every`) |
| marana | 0,04 | 0,04 | apagado en bajo por diseño |
| familia | n/d | n/d | no exporta `paso`: su coste es DOM por evento de UI, no por cuadro |

**Fase A (sampler, 30 s, 441 cuadros):** basura total del juego entero ≈ 3,58 MB (~8,1 kB/cuadro);
los 10 módulos del listado aportan ~66 kB (1,8 %): ciudad_viva 65,8 kB y sorpresas 0 (era 17,4 kB).
El grueso (renderer/streaming/terreno) es de otros carriles. Draw calls 55 · 278 k tris ·
0 errores de consola en ambas corridas.

Verificación: vecinosTest 10/10 · humorTest 4/4 · trucosTest 7/7 · esconditeTest 5/5 ·
maranaTest 5/5 · sorpresasTest 10/10 · comunidadesTest 19/19 · ciudadVivaTest 20/20 en la corrida
post; familiaTest se comprueba aparte (ver fila de la tarea).

## QA-110-mem · atribución de las «texturas generadas» y la flora sobre la Ciudad de los 36 (4-nov, hecha · Kimi 1)

Herramienta nueva `tools/build/kimi1_qa110.js` (entrada con partida sembrada, sin creador; iPhone
emulado 390×844 dpr 3 + UA iOS + táctil + CPU ×4, GPU real RX 5700 XT; ancla (-33,-136) a +30 m
mirando a la ciudad; `ST.terminar()` con el fix de 54e24e9a; `AV.look.medir()` + volcado de todas
las texturas sin URL con su malla/material/slot). Evidencia: `docs/img/kimi110/qa110_{r6,r7}.json`
y capturas `qa110_r7_*_{villa,ciudad}.jpg`.

Matiz del emulador: con `?calidad=` forzado en escritorio, `setCalidad` conserva el `texMax` del
perfil inicial (`keep.texMax`, renderer.js:771) → el tope queda 0 y nada se encoge (r6: 318–575 MB
«generadas», no representa un iPhone). Con UA de iPhone el perfil arranca en bajo (texMax 512) y el
tope sí aplica: los números de abajo son lo que ve un iPhone.

**Ciudad de los 36 drenada, iPhone emulado (estimación w·h·4·4/3 por objeto de textura):**

| grupo | bajo | qué es |
|---|---|---|
| KB3D kit restaurado | 161,4 MB (38 t @1024², map+normal) | texturas de los edificios del kit (`DecoMd_KB3D_*`…); el look NO las encoge: `encoger()` se salta los CanvasTexture que no sean flora (look.js:209, decisión «no se recorta lo gráfico») |
| atlas `_hd` | 21,2 MB (4 t @1024²) | ya en suelo de iPhone (MOVIL_PEQ, 63376aae); en escritorio 2048²/4096² |
| flora | 40,7 MB (44 t) | de ellas **27,8 MB en 30 texturas de la banda `:sombra`**, que en bajo no se dibuja (`sombraFlora:false`) |
| Vittata | 11,9 MB (3 t: 2×1024² + 1×512²) | jugador + segunda copia (familia CG-62); candidata a dedupe |
| suelo + otros | ~18 MB | splat del terreno + cielo/agua |
| **total estimado** | **281 MB** | medio: 282 MB (mismo tope 512 heredado del perfil bajo) |
| heap JS | 271 MB | mecanismo de QA-153 (GLB retenidos en JS); geo GPU 20 estables |

Solo 73 (bajo) / 87 (medio) texturas llegan a subir a la GPU: para Safari manda la medición real
por GPU de QA-110 (pico 129–193 MB en ruta); esta estimación incluye imágenes retenidas en JS
(canvases del look + ImageBitmaps cerrados/retentidos).

**Recortes posibles (decisión):** (a) kit KB3D a 512 en bajo → ~40 MB (ahorro ~120 MB): cambia la
imagen de los edificios de cerca → **Kelvin** (es el mismo pedido del rojo conocido de lookTest).
(b) flora `:sombra` → placeholder 1×1 cuando `sombraFlora:false` (bajo): ~28 MB de JS/decodificación,
sin cambio visual → seguro, carril `vegetacion.js` (Kimi 1). (c) dedupe de la textura de
Vittata/familia: ~6–10 MB → carril personaje.

## Recomendaciones (sin hacer, deciden Kelvin/Fernando)

- PC: nada urgente. El presupuesto de 200 calls / 50 FPS se cumple con margen en las 24 tomas.
- iPad: seguir la línea de KIMI-011 (LOD por distancia ya en medio/bajo); la meseta del tepuy
  en alto seguirá siendo pesada para la GPU del iPad.
- Los picos de giro se atajan precargando las zonas colindantes al aterrizar (misma familia que
  la precarga de la caleta del coquí, C4); es trabajo de `streaming.js`/`terreno.js` (carril D,
  coordinar con la otra sesión de Kimi).
