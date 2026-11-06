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
| flora | 40,7 MB (44 t) | ⚠ **corrección (4-nov ~15:30 UTC, Kimi 1): no hay 28 MB ociosos**. Las 30 entradas `:sombra` del volcado son los MISMOS objetos de textura que usa la banda `lejos` (material compartido por cerca/lejos/lod en `crearMallas`): la herramienta los contó una sola vez y los atribuyó a `:sombra` solo porque esa malla se añade primero a la escena (recorrido en orden). Toda la flora ~41 MB está en uso; un placeholder en `:sombra` ahorraría 0 MB (y rompería la banda visible si sustituyera el mapa compartido) |
| Vittata | 11,9 MB (3 t: 2×1024² + 1×512²) | jugador + segunda copia (familia CG-62); candidata a dedupe |
| suelo + otros | ~18 MB | splat del terreno + cielo/agua |
| **total estimado** | **281 MB** | medio: 282 MB (mismo tope 512 heredado del perfil bajo) |
| heap JS | 271 MB | mecanismo de QA-153 (GLB retenidos en JS); geo GPU 20 estables |

Solo 73 (bajo) / 87 (medio) texturas llegan a subir a la GPU: para Safari manda la medición real
por GPU de QA-110 (pico 129–193 MB en ruta); esta estimación incluye imágenes retenidas en JS
(canvases del look + ImageBitmaps cerrados/retentidos).

**Recortes posibles (decisión):** (a) kit KB3D a 512 en bajo → ~40 MB (ahorro ~120 MB): cambia la
imagen de los edificios de cerca → **Kelvin** (es el mismo pedido del rojo conocido de lookTest).
(b) ~~flora `:sombra` → placeholder~~ **hecho en otra forma (4-nov ~15:45 UTC, commit de esta
vuelta):** el placeholder ahorraba 0 MB (arriba); el recorte real fue crear perezosamente las bandas
`cerca` (la `:sombra`, que proyecta sombra con su `customDepthMaterial`) y `lod` de cada primitiva de
árbol: solo existen desde el primer `actualizar` que las usa (`sombraR>0` = 'alto'; `medio` no vacío =
medio/alto). En bajo no se reservan sus buffers de instancia (n×76 B por banda): **1,6 MB exactos**
(7 307 árboles × 3 bandas × 228 B) y 30 InstancedMesh menos en la escena; medido en A/B con
`tools/build/kimi1_qa110b.js` (bajo ciudad: bandas 0/0 tras el fix, 20/10 en HEAD; heap 63,5 vs 69,8
MB en el contexto de drenado forzado, ±ruido de carga; en alto tras `setCalidad` en marcha se crean
solas 20 `:sombra` + 7 `:lod` y `sombraR`/`dSombra` quedan idénticos a HEAD). floraTest 18/19 =
HEAD (el rojo B1 GPU preexiste, mismo número en HEAD), movementTest 48/48, streamingTest 22/23
(rojo conocido), lookTest 42/44 (rojos conocidos), 0 errores de consola. Sin cambio de imagen ni de
draw calls/tris (mismas mallas y materiales, solo cambia el momento de creación). (c) dedupe de la
textura de Vittata/familia: ~6–10 MB → carril personaje.

## KIMI-025 · clave de calor por material (parche 0j.2) en móvil con GPU real (4-nov, hecha · Kimi 3)

Medición local pendiente de la fila KIMI-024: ¿cuánto ahorra de verdad el caché de la clave de
calor por material (`c8fbbb7f`) en esta PC con GPU real? Herramienta nueva
`tools/build/kimi3_calor.js`: móvil 375×812 dpr 3, CPU ×4, GPU real RX 5700 XT (ANGLE/D3D11),
jugador nuevo, asentado en la Ciudad de los 36 ((-33,-136) +8 m, yaw π, cola de streaming agotada
con `ST.terminar()`), ventana de 8 s de juego con FPS por cuadro + CPU profile (CDP) atribuyendo
self-time. A/B: HEAD (con parche) contra `c8fbbb7f^` (`renderer.js` previo al parche, todo lo demás
idéntico; swap temporal del archivo verificado por SHA-256 antes y después). 2 rondas por variante,
misma escena en las 4 corridas (65 draw calls / 500 k tris / 95 programas / 157 texturas /
827 dibujables / heap 786–805 MB — el retenido conocido de la ciudad, QA-153, no del parche).
Evidencia: `docs/img/kimi025/calor-{despues,antes}-x4.json`. 0 errores de consola en las 4 rondas.

Self-time del escaneo de dibujables por cuadro (siguienteCalor + ocultarPendientes + texturasPendientes + idCalor/objPendiente):

| Variante | Ronda | Cuadros en 8 s | Escaneo total | ms/cuadro | dt p50 | dt p95 | peor |
|---|---|---|---|---|---|---|---|
| sin parche (c8fbbb7f^) | 1 | 177 | 716,7 ms | 4,05 | 41,7 ms | 62,5 ms | 76,4 ms |
| sin parche | 2 | 166 | 670,4 ms | 4,04 | 48,6 ms | 62,6 ms | 104,2 ms |
| con parche (HEAD) | 1 | 201 | 397,6 ms | 1,98 | 34,8 ms | 48,7 ms | 55,6 ms |
| con parche | 2 | 191 | 415,6 ms | 2,18 | 41,6 ms | 55,5 ms | 62,6 ms |

**Resultado: el escaneo baja de ~4,04 a ~2,08 ms/cuadro con CPU ×4 (−49 %, −1,96 ms/cuadro;
a CPU ×1 ≈ −0,5 ms/cuadro).** Mismo orden que el micro-banco de la nube que escribió el parche
(4000 dibujables ×2 pasadas: ~8 → ~1,5 ms CPU ×4). Consecuencia directa: +24/+25 cuadros renders
en la misma ventana de 8 s (166–177 → 191–201) y p50 ~7 ms más ligero en las dos rondas. Las
funciones que armaban la clave con cadenas nuevas (`siguienteCalor` 335–350 → 176–178 ms y
`ocultarPendientes` 307–337 → 80–104 ms en la ventana) son las que agarran el ahorro;
`texturasPendientes` queda en ruido de muestreo (9,6–137,6 ms entre rondas, misma semántica en
ambas versiones). El resto del cuadro no cambia (mismas calls/tris, misma imagen; las 12 baterías
ya estaban verdes en KIMI-024). El cuadro de móvil CPU ×4 en la ciudad sigue dominado por otros
costes (`triQuery` ~500–600 ms, `insert` de sólidos ~450–530 ms, `(program)` ~1,2 s en la ventana):
el parche es un ahorro real pero parcial dentro de ese presupuesto.

## KIMI-030 · QA-153: heap al soltar la Ciudad de los 36, medido con vuelta a la villa (4-nov, avance · Kimi 3)

Herramienta: `tools/build/kimi3_vuelo.js --heap --alejar [--precalentar]` (Chrome headless propio, GPU real RX 5700 XT,
móvil 375×812 dpr 3, UA iPhone, CPU ×4, PC libre tras matar 2 zombis `Temp\kimi*`). El modo `--alejar`, nuevo:
tras el drenado de la ciudad a +30 m (`ST.terminar()`) y el gc, teletransporta a la villa (134,182), espera 28 s
(la gracia de descarga son 3 s), vuelve a forzar gc y re-mide heap + geometría viva en escena (bytes de atributos
e índices de cada malla) + posición real.

| corrida | precalentar | heap base | pico | retenido en ciudad (gc) | **vuelta villa +28 s + gc** | geo viva en villa | calls |
|---|---|---|---|---|---|---|---|
| k030-r1 | sí | 878 | 858 | 762 | (fallo de instrumentación, sin número) | — | — |
| k030-r2 | no | 117 | 767 | 761 | **650** | 602 MB / 659 mallas | 62 |
| k030-r3 | no | (id.) | — | — | **650** · pos verificada (134,7,182) | 602 MB / 659 mallas | 62 |
| k030-atrib-r2 | no | 97 | 766 | 761 | **650** | 602 MB / 659 mallas | 62 |
| **k030-fix-r1** (ciudadGracia 8 s) | no | 108 | 767 | 761 | **356** | 308 MB / 520 mallas | 62 |
| k030-villar2 (villa asentida, **sin** visitar la ciudad) | no | — | — | — | **348** | 308 MB / 520 mallas | 67 |

**Raíz (atribución por prefijo, `repro-k030-atrib-r{1,2}.json`):** lo retenido eran las fusiones
`edificiosZonaHD:kelvin_ruinas_yunque` (126 MB), `edificiosZonaHDGlobal:AV_HD_Ancient` (194 MB),
`…:AV_HD_Savage` (29 MB) y las de cerca/sombra/globales — la bandera `ciudad` no se apagaba: la salida era
`d < ciudadVista.bajo(220) + histéresis(30)` y la villa está a d=228 m: la banda [220, 250] la contenía entera,
así que tras una visita el kit de la ciudad quedaba cargado para siempre en «bajo». **Fix (commit de esta fila):**
gracia de tiempo `CFG.ciudadGracia` 8 s en `streaming.js` en vez de histéresis pura de distancia; fuera de la
banda se suelta ya. Con el fix, `kelvin_ruinas_yunque` vuelve a la villa con `ciudad:false` y sus fusiones fuera;
lo residual (308 MB) es línea de diseño: `kelvin_aldea_rio_este_2` (d=87) y `kelvin_aldea_colina` (d=66) son
zonas-ciudad dentro de `ciudadVista.bajo` de la villa y retienen su kit por diseño aprobado (1-nov), como un
spawn asentido. **Retención cero demostrada:** la villa asentida sin visitar la ciudad da 348 MB / 308 MB / 520
mallas (`repro-k030-villar2.json`, quieto roto con un teleport de ~14 m) — los mismos números que tras visitarla
y volver (356 / 308 / 520). 0 errores de consola.

## Recomendaciones (sin hacer, deciden Kelvin/Fernando)

- PC: nada urgente. El presupuesto de 200 calls / 50 FPS se cumple con margen en las 24 tomas.
- iPad: seguir la línea de KIMI-011 (LOD por distancia ya en medio/bajo); la meseta del tepuy
  en alto seguirá siendo pesada para la GPU del iPad.
- Los picos de giro se atajan precargando las zonas colindantes al aterrizar (misma familia que
  la precarga de la caleta del coquí, C4); es trabajo de `streaming.js`/`terreno.js` (carril D,
  coordinar con la otra sesión de Kimi).

## KIMI-031 · peor cuadro de 3,8 s al entrar en la Ciudad de los 36 (4-nov · Kimi 3)

Escenario V17 de Kimi 1 (`tools/build/kimi1_v17.js --solo vuelo`): semilla cap1 → teleport
(-20,-133) +36 m → `ST.alrededor()` + `ST.terminar()` → círculo 45 s sobre la ciudad (-33,-136,
r=50 m, h=36±3). Móvil emulado 390×844 dpr 3, CPU ×4, GPU real RX 5700 XT, PC sin contención.
Diagnóstico con la herramienta nueva `tools/build/kimi3_031.js` (mismo escenario con `?fases=1`
+ ventana de fases por peor cuadro + `G.trabajosLentos` con sello de tiempo + `--perfil` de CPU):

**Base (HEAD):** peor cuadro **4097/3799 ms** (dos corridas), p95 229/167 ms, p50 42/35 ms.
El cuadro malo cae en la fase de drenado de `terminar()` y las fases no lo explican (update 14 ms,
dibujo ≤320 ms): el hueco era trabajo síncrono de la cola de streaming. Perfil de CPU (ventana
terminar): `fundirTex · streaming.js:451` **4050 ms**, `fundirHDPaso · streaming.js:1081` 1777 ms,
`avanzar · streaming.js:510` 1162 ms, getX/getY/setFromBufferAttribute/computeBoundingSphere
~4000 ms más (las mismas fusiones, por dentro).

**Causa:** los cierres de fusión seguían monolíticos a pesar de los troceos de KIMI-017/020:
`fundirHDPaso` troceaba entre grupos pero fundía cada grupo de golpe (`fundirTex`, el grupo
`AV_HD_Ancient` de la ciudad son todas las partes HD con atlas); `fundirCercaPaso` fundía todos
los grupos en un solo trabajo sin presupuesto; `fundirSombraPaso` y `fundirCerrar` (lejos de zona)
también; y `fusionLenta` (usada por las fusiones globales) no interrumpía una geometría grande
(la fusión global HD era un trabajo de 370–720 ms) y cerraba con `computeBoundingSphere/Box`
monolíticos (~700–900 ms en el mismo trabajo).

**Fix (`streaming.js`):** los cuatro cierres usan `fusionLenta` reanudable (un grupo por trabajo,
invalidación si la zona se suelta a medias: `Z.hdF !== F` etc.) y `fusionLenta` trocea también
dentro de la geometría (slices de 24576 vértices, reloj por slice) y calcula boundingBox/Sphere
durante la copia (sin pases extra). Los `fundir`/`fundirTex` monolíticos quedan solo en el parseo
por modelo (trabajos `procesar:*` de 25–160 ms, aceptables).

**Después (dos corridas):** peor cuadro **396/500 ms** (era 4097), p95 118/132 ms, p50 35/42 ms
(sin bajar), fpsMed 24,2/19,3 (era 11,2), `terminar()` 8,4–11,7 s (los trabajos ahora son más
pequeños y la cola se bombea con el mismo presupuesto), asentado 45 calls / 188 k tris, 0 errores
de consola. Los peores cuadros que quedan son `dibujo` de 300–410 ms por compilación de programas
al dibujar variantes nuevas (familia QA-53 «enlaces del primer dibujo», carril nube/`renderer.js`,
ya repartido de 2 en 2 por el precalentado) y trabajos `procesar:*` de ≤111 ms.
Evidencia: `docs/img/kimi031/k031-{base-r1,base-r2,fix-r1,fix-r3,fix-r4}.json`.

## KIMI-034 · basura por cuadro del motor en vuelo (4-nov, avance · Kimi 3)

**Medición** (`tools/build/kimi3_basura.js`, nueva; móvil 375×812 dpr 3, CPU ×4, GPU real RX 5700 XT,
gc() determinista `--expose-gc`; asentado ST.terminar en (-33,-136) y vuelo en círculo de 55 m a +12 m,
ventanas de 10 s con gc; sampler V8 de asignaciones SOLO durante el vuelo; evidencia
`docs/img/kimi034/basura-{r1,quieto-r1,bahia-r1,vuelo-r2,vuelo-r3,post-fix-r1}.json`):

| escenario | basura | retenido (neto) |
|---|---|---|
| vuelo ciudad (60 s, 5 ventanas) | 272–414 KB/cuadro (360–596 MB en 60 s) | ≈ 0 (oscila con descargas) |
| quieto en la ciudad tras asentar | **4–12 KB/cuadro** (estado estacionario limpio) | ≈ 0 |
| vuelo bahía norte (60 s) | 134 KB/cuadro | ≈ 0 |

El bucle de render/update por cuadro está limpio; la basura la genera el **movimiento**: churn de
re-rasterización de regiones de `solidos.js` (`insert`/`encolar`/`spans`, 34–38 % del sampler del
vuelo; los bloques estáticos crecieron +700 en 60 s de vuelo y `tris` rasterizados +163 k) más
atributos de three.js (`renderBufferDirect`, matrices) al cruzar fronteras de zona/LOD (`retenido`
osciló ±280 MB por ventana: cargas y liberaciones grandes continuas). La cola de flora se queda con
~2300 trabajos pendientes sin procesar durante el vuelo (regiones nuevas entrando más rápido que
los 5 ms/cuadro de presupuesto; los bloques no se hacen, tampoco se descargan).

**Fixes de higiene aplicados (este commit):** `streaming.js` — `colocar()` usa la nueva
`solidos.agregarPartes(partes, matriz, modelo)` en vez de construir un `THREE.Group` + un `Mesh`
desechables por parte solo para encolar (mismo filtro de material que `valida()`); `tramos()` con
runs reutilizados y comparación estructural (era array + objetos + string de clave nuevos por malla
visible en cada cuadro); `despachar`, `quiereHD/quiereCerca`, `globalFus` y el predicado de
`lejosGlobal` elevados a nivel de módulo (era 4–6 closures nuevas por cuadro) y `[...G2.zonas]` una
vez por global y cuadro (era por malla). Baterías: streamingTest 23/24 (rojo = QA-81 intermitente
conocido, 158 en banda 152–163), movementTest 48/48, 0 errores de consola.

**Verificación post-fix:** la basura por segundo NO bajó (590 MB/60 s ≈ 9,8 MB/s, igual que antes):
las closures/objetos recortados eran poca cosa frente al churn estructural. El grueso queda en:
(1) re-rasterización continua de regiones de sólidos al volar (diseño: regiones de 24 m que se
hacen al acercarse y se tiran al alejarse; en vuelo cruzas ~14 regiones/vuelta); (2) fronteras de
zona/LOD (`ajustarHD`, fundir/quitar) que cargan y sueltan geometría grande por umbral — candidato
real para QA-158 (memoria acumulada en vuelo largo). Siguiente palanca: amortiguar el flapping de
umbral (histéresis mayor / contador de estabilidad) o repartir la re-rasterización de regiones en
tandas con techo de trabajos pendientes.


## KIMI-037 · basura en vuelo: higiene de `solidos.js` (4-nov · Kimi 3; renumerada desde KIMI-035 — ese ID quedó asignado a la flora de Kimi 1)

**Cambios** (`src/engine/solidos.js`): (1) el estado de `triEmpezar` se reutiliza (era 1 objeto nuevo por
cada triángulo rasterizado; en vuelo hay cientos por cuadro — solo puede haber un triángulo a medias por
cola, así que un slot basta); (2) pool de `Matrix4` para los trabajos de región de `colaFlora` (el
`clone()` por instancia encolada era basura en ráfagas al entrar regiones; los trabajos estáticos siguen
clonándose porque `matricesDe`/`matricesPorModelo` los retienen para los paneles de puerta); (3)
`floraCerca` sin strings por cuadro: las coordenadas de región van empaquetadas en el valor del mapa
(antes `k.split(',').map(Number)` por región y cuadro) y sin array nueva por región vacía
(`|| SIN_ITEMS`); (4) el guarda de descarga ya no barre la cola: contador `pendReg` región → trabajos
pendientes (antes `colaFlora.some(...)` por región y cuadro: O(~49 regiones × ~2000 trabajos) ≈ 100 k
comparaciones/cuadro en vuelo, ahora ~50 lookups). Semántica de colisiones intacta: mismos bloques, mismos
tramos, mismo `version`, mismos sólidos.

**Medición** (`tools/build/kimi3_basura.js` — tree-kill del Chrome añadido: antes el primer Chrome podía
quedar zombi robando GPU a las corridas siguientes; móvil 375×812 dpr 3, CPU ×4, GPU real RX 5700 XT,
gc() determinista, vuelo de 60 s en círculo de 55 m a +12 m sobre la Ciudad de los 36; A/B con worktree de
HEAD (`wt-k035-base`); evidencia `docs/img/kimi034/basura-k035-{base,base2,post,post2}.json`):

| corrida | ventanas KB/cuadro | media | v2–4 (vuelo asentado) |
|---|---|---|---|
| base r1 (HEAD) | 88, 36, 365, 368, 344, 91 | 210 | 359 |
| base r2 (HEAD) | 16, 77, 315, 312, 330, 141 | 199 | 319 |
| post r1 | 1569*, 267, 100, 404, 414, 261 | 497 | 306 |
| post r2 | 98, 156, 291, 336, 345, 425 | 277 | 324 |

\* la ventana 0 incluye el asentado residual y su tamaño depende del estado del GC al inicio (en las base
salió pequeña por casualidad; en post r1 no — por eso las medias totales no comparan: mírense las v2–4).

**Lectura:** la banda de vuelo asentado queda en 306–359 KB/cuadro con y sin fix (mediana de ventanas:
post 315 vs base 339). El grueso de la basura en vuelo es el ciclo crear/destruir **bloques de región**
(los 5 typed arrays por bloque nuevo, que el sampler atribuye a `insert`: 794–1248 KB muestreados por
corrida) — datos necesarios del mapa de colisiones, no desperdicio. Lo recortado aquí era poca cosa en KB
pero **CPU segura por cuadro** (el guarda de descarga pasa de ~100 k comparaciones a ~50 lookups y el
rasterizado deja de asignar objetos/matrices por triángulo e instancia). 0 errores de consola en las 4
corridas. La palanca que moverá el total sigue siendo estructural: **KIMI-038** (histéresis de frontera
zona/LOD en `streaming.js`, la que dispara las re-colocaciones estáticas: +700 bloques estáticos y +163 k
tris rasterizados en 60 s de vuelo, KIMI-034).

**Baterías (GPU real, móvil 375×812 dpr 3, CPU ×4):** streamingTest **23/24** (rojo = QA-81
intermitente conocido: 158 draw calls en la banda histórica 152–163, rojo también en HEAD; verdes
«las colisiones siguen activas tras liberar», «sin fugas», y el kit de la ciudad) · movementTest
**48/48** (todos los de sólidos: estaca real, torre maciza 9,75 m, techo, rama, cuerda, toldo,
«173 edificios: no se atraviesan y tienen dónde pararse»). 0 errores de consola.


## KIMI-038 · anti-flapping de frontera zona/HD en `streaming.js` (4-nov · Kimi 3)

**Cambios** (`src/engine/streaming.js`): (1) las **bajadas** de nivel de zona (`nivelZona`) y de la bandera
`_hd` de la zona (`ajustarHD`) se diferencian: solo se aplican si la petición se mantiene `CFG.bajarEspera`
s (1,5 s) seguidos; una **subida** es inmediata y cancela la bajada pendiente (contador `bajasEvitadas`).
Rozar una frontera en vuelo ya no destruye y refunde la fusión de la zona en cada cruce. Las subidas y la
colocación/colisiones no cambian (inmediatas), así que al jugador no se le nota. (2) Las bajadas pendientes
se resuelven al momento en los asentados: `terminar()` y `liberarYa()` llaman a
`aplicarBajasPendientes()` (nivel + HD), que es lo que los tests y herramientas exigen tras teleportar.
(3) **Bug del avance 3f36ab20 corregido:** los contadores `transNivel`/`transHD` vivían dentro de
`iniciar()` pero `streaming.transiciones()` (API de diagnóstico del módulo) los referencia desde fuera:
cualquier llamada daba `ReferenceError: transNivel is not defined` (nunca se había llamado desde tests).
Movidos al scope del módulo; `kimi3_basura.js` ahora los captura por segundo y acumulados (`transFin`,
`dbgRes`).

**Medición** (`tools/build/kimi3_basura.js --etiqueta k038-post2`, móvil 375×812 dpr 3, CPU ×4, GPU real,
vuelo de 60 s en círculo de 55 m a +12 m sobre la Ciudad; evidencia
`docs/img/kimi034/basura-k038-{base,base2,post,post2}.json`; **ojo: la corrida post2 compartió PC con la
sesión de Kimi 1 — sus KB/cuadro y tiempos no son comparables con las base en PC libre; los contadores de
transiciones son deterministas y sí comparan**): ráfaga inicial de asentado al despegar (t≈1 s: 25 nivel +
12 HD) y después **≈1 transición nivel + 1 HD por segundo** durante todo el vuelo (transFin: nivel 44 · hd
35 · **evitadas 0**).

**Lectura:** en el escenario de círculo **no hay flapping**: cada zona se cruza una vez por banda y de
forma monótona (la cancelación del diferido no aporta aquí, `evitadas=0`). La hipótesis de KIMI-034/037 de
que el umbral zona/LOD era la palanca de la basura en vuelo **no se confirma con este escenario**: el churn
medido viene del ciclo crear/destruir bloques de región de `solidos.js` (datos necesarios, KIMI-037). El
diferido queda como **protección de borde sin coste medible** (hover en un umbral: villa a d=228 m del
`ciudadVista.bajo=220`, vuelo orbital a distancia fija ≈ Rc/`hdLim`), complementaria a la histéresis de
distancia existente (H=30 m). No baja la basura por cuadro en vuelo: la palabra grande sigue siendo el
techo de trabajos de región (flora/`colaFlora`, carril Kimi 1).

**Baterías:** streamingTest **23/24** en página limpia (único rojo = QA-81 intermitente conocido: 158
draw calls en giro 4.7, banda histórica 152–163, rojo también en HEAD puro); verdes los de liberación de
zona («Al salir de su radio…», «Fuera de la vista…» — los que la primera pasada del fix rompió por no
flushar la bajada HD pendiente) y «sin fugas». movementTest: **2 intentos sin veredicto** — el navegador
del arnés murió a mitad de la batería (familia QA-111) con la PC compartida con Kimi 1; re-correr en PC
libre (`node tools/build/kimi2_una_bateria.js movementTest`); el cambio no toca la lógica de colisiones
(`colocar`/sólidos inalterados: las bajadas solo aplazan la liberación de recursos).

## KIMI-054 · QA-53 (resto): drenado de texturas «stale» y ráfaga del flip de calidad (5-nov · Kimi 1)

Qué había antes: al conmutar la calidad (`setCalidad`), look.js recorta las texturas por `texMax`
(`encoger`: lienzo nuevo + `needsUpdate`) y las que ya estaban en la GPU se re-subían **dentro del
primer dibujo que las tocaba** (el drenado `subirTexturas` por cuadro solo recogía texturas nunca
subidas), y el gancho `calidad` de renderer.js pagaba una ráfaga de 24 texturas / 30 ms de golpe.

Qué cambió (`src/engine/renderer.js`): `texturasPendientes()` ahora también devuelve las texturas
subidas a otra versión (`__version !== t.version`), con `isVideoTexture` excluida (su versión cambia
en cada cuadro); el gancho `calidad` baja su ráfaga a 8 texturas / 8 ms y el resto lo reparte el
drenado por cuadro (4 tex / 6 ms). El re-subido por `needsUpdate` deja de pagarse en el dibujo.

Medido (`tools/build/kimi1_qa53v.js`, móvil 375×812 dpr 3, CPU ×4, GPU real RX 5700 XT; corridas
con otras sesiones de Kimi activas en la PC — números con contención, veredictos de estado):
el `setCalidad` en sí bloquea ~0,4–0,5 s (`evMs` 367–535 ms: encoger de look.js + ráfaga + la
vegetación), y con el `?fases=1` (la herramienta ahora vuelca `fases`+`evMs`) se vio el **primer
cuadro tras el flip dibujando 968 ms** en BASE: son las ~30 re-subidas «stale» visibles que el drenado
(4 tex / 6 ms por cuadro más la ráfaga de 8) no llega a adelantar — el trabajo GL total (~40 texturas
× ~25 ms a CPU ×4 ≈ 1 s) es irreducible en el hilo; repartirlo en serio exige el corte perezoso de
`encoger` en look.js (cola de recortes por cuadro) = palabra siguiente. El flip de vuelta bajo→medio,
que re-sube más bytes (1024), no tiene ningún cuadro >111 ms: las re-subidas solas no explican el pico,
es la concentración en el primer dibujo. Con el precalentado de la variante contraria (POST), la
tormenta de re-enlaces de programas desaparece (BASE sin ella: `warm` 281 ms + `draw` 299 ms en el
2.º cuadro; POST: n200=1 frente a n200=6-7 de BASE).
p50 del flip 14–28 ms, fps 20–38 en contención; 0 errores de consola en las 5 corridas.

Evidencia: `docs/img/kimi053/qa53v_k054-r{1..r5}.json` (+capturas `qa53v_k054-*_flip1.jpg`).
Palabra siguiente de la fila: corte perezoso de `encoger` (look.js) para repartir el re-subido en
~40 cuadros y la medición limpia del flip con la PC libre.

## KIMI-055 · QA-53 (resto): corte perezoso de `encoger` en look.js (5-nov · Kimi 1)

Qué había antes: el gancho `calidad` de look.js llamaba a `barrer`/`recortar`, que recortaban TODAS
las texturas de la escena dentro del mismo evento (`encoger`: un lienzo + `drawImage` por textura,
además de la ráfaga de re-subidas que recoge el drenado de KIMI-054).

Qué cambió (`src/game/look.js`): con `diferirRec` activo solo durante el evento `calidad`, `encoger`
apunta `{textura, tope}` en una cola en vez de recortar; `pasarColaRec()` (en el gancho `render`,
mismo prioridad 90) ejecuta los recortes con tope de ~3 ms por cuadro (mínimo 1). `aplicar`/`quitar`
invalidan la cola (`recGen`) para no pisar un recorte más reciente. El re-subido a la GPU sale de
la cola del drenado (KIMI-054) de forma escalonada.

Medido (`kimi1_qa53v.js --etiqueta k055-r1`, mismo perfil; PC con Kimi 2 y Kimi 3 activos): POST
flip medio→bajo `evMs` 393 ms (BASE 419) frente a 415/431 de las corridas con `encoger` síncrono
(r3/r4) — o sea, el bloqueo del evento (~0,4 s) NO era de `encoger`: es la reconstrucción de
vegetación (`actualizar(true)` + `actualizarPasto(true)` en su gancho `calidad`). Métricas de
cuadros POST: p50 21 / p95 56 / peor 1549 ms / n200=1 (r4: 28/63/1715/1) — dentro del ruido de
contención. Conclusión honesta: sin mejora medible en esta escena; el cambio queda como higiene
(consistente con KIMI-054: el trabajo pesado no corre dentro del evento) y la palabra real del flip
es diferir la reconstrucción de vegetación (carriles `vegetacion.js`, Kimi 1). Verificación del
enganche de la cola: probe `tools/build/kimi1_k055probe.js` (cuenta lienzos creados dentro/fuera del
evento) — la primera corrida quedó ahogada por contención; queda para la re-medición limpia.

Verificación en la PC (página sembrada, GPU real, CPU ×4): selfTest 103/103 · movementTest aislado
52/52 (0 errores de consola). En corrida acumulada con contención: movementTest 46/52 (Vittata
clavada a 37,9 m en el spawn: flake de entrada/streaming QA-111) y comicTest 62/67 (banda
documentada 61–67 de estado acumulado: «Mis escenas»/gags) — mismas familias de HEAD, no atribuibles
a look.js (no toca dibujo, física ni streaming). 0 errores de consola en todas las corridas.
Evidencia: `docs/img/kimi053/qa53v_k055-r1.json` (+capturas).

## KIMI-126 · iPad emulado en el tepuy del cap. 5 (6-nov · Kimi 3; KIMI-Task-011 pendiente)

Contexto: el iPad de Kelvin daba 31 FPS (mín. 16) y 6,9 M tris en el tepuy de la Ciudad de los 36
(2-nov, calidad media). La pregunta de KIMI-126 era si en HEAD hacía falta bajar triángulos/draw
calls en calidad **baja** para ≥ 30 FPS. Medición con GPU real (RX 5700 XT) emulando el iPad de
Kelvin (820×1180 CSS @ DPR 1,5, UA iPad, táctil, CPU ×4), `?pack=ep5&mapa=real&calidad=bajo`,
herramienta `tools/build/kimi3_126.js`, evidencia `docs/img/kimi126/k126_ipad-bajo-r6.{json,jpg×4}`.

**Vuelo continuo 40 s** (miradores → cumbre → ciudad → aire, a ~17 m/s): FPS **p50=50 · p10=32 ·
mín=14** (un tirón aislado de streaming, familia QA-53/158) · triángulos med=356 k (máx 435 k;
−94 % frente a los 6,9 M del 2-nov: el trabajo lo hizo el LOD KIMI-011) · draw calls med=122
(máx 132) · heap 126–156 MB · **0 contextos WebGL perdidos · 0 errores de consola**.

**Tomas asentadas** (ST.terminar + look.medir):

| vista | calls | tris | tex | heap | fps |
|---|---|---|---|---|---|
| cumbre_N | 139 | 0,36 M | 187 MB | 115 MB | **44** |
| cumbre_E | 96 | 0,19 M | 187 MB | 115 MB | **56** |
| miradores_NE | 57 | 0,18 M | 187 MB | 120 MB | **61** |
| aire_ciudad | 137 | 0,36 M | 187 MB | 118 MB | **51** |

**Conclusión: en calidad baja el tepuy YA cumple ≥ 30 FPS con margen (todas las tomas asentadas
≥ 44 FPS a CPU ×4): no hace falta recortar triángulos ni draw calls ni tocar el look.** Los
números son techo (PC compartida: otra sesión grababa la demo en paralelo); los veredictos son
estructurales (tris en vista ≤ 0,36 M). Falta la prueba física en el iPad de Kelvin (0r: la
medición emulada la sustituye hasta entonces, precedente KIMI-053). «Medio» de referencia sin medir
(opcional). Nota técnica para futuras semillas de cap5: el save vive en `ep5.save` (meta.almacen)
y `validSave` exige `v:1` (SAVE_VERSION = pack.guardado.version) — lo mismo que falló el intento
ep5 de KIMI-111.

## KIMI-124 · FPS de lo nuevo con GPU real: minigolf y V18.2 (6-nov · Kimi 1)

Tarea 1d (PLAN ULTRA): demo `?v18=1`, minigolf (hoyo de Villa Raíz, 1 jugador y por turnos) y la
V18.2 (subida de nivel —duelo a nv 20, «Eco Amplificado» de etapa máxima— y Eco Protector con la
alianza elegida), en PC 1080p y móvil emulado 390×844 CPU ×4, en bajo/medio/alto. Los escenarios
duelo/puente/Sombra de la demo ya tenían medición limpia con PC libre (KIMI-088: bajo base 37 ·
duelo 52 · Sombra 38 · puente 56; KIMI-083: escritorio medio/alto del duelo de 2 a ≥140 fps):
aquí se cierran las partes que faltaban (minigolf y V18.2). Herramienta nueva
`tools/build/kimi1_124.js` (carga manual de los módulos v18 con la cadena de boot.js —los
`aDemanda` internos no son accesibles y el gesto `alPrimerGesto` no llegó a cargarlos en el
headless—, escenarios por API pública sin tocar el juego, alianza de verdad con
`v18progreso.desbloquear('arausiaca')` + `v18evo.dar/elegirAlianza`, driver de supervivencia que
orbita el sitio del duelo para que la pelea dure la ventana). Evidencia
`docs/img/kimi124/k124_{movil-r2,pc-r1}.{json,log,jpg×6}`. **0 errores de consola en las dos
corridas.**

**Móvil 390×844 dpr 3 CPU ×4 (perfil real del iPhone; números techo: otras sesiones activas en la
PC — la base del spawn quedó en 24 fps frente a los 37 de la referencia limpia de KIMI-088; los
veredictos son escenario-vs-base de la MISMA corrida):**

| escenario | bajo fpsMed (min) | medio fpsMed (min) | alto fpsMed (min) |
|---|---|---|---|
| base (spawn villa) | 24 (22) | 12* (1*) | 12 (9) |
| minigolf 1 jugador | **34 (23)** | **23 (20)** | **18 (16)** |
| minigolf 2 jug. por turnos | **36 (29)** | **24 (19)** | **19 (16)** |
| duelo evo nv 20 (Eco Amplif.) | **26 (23)** | **18 (16)** | **17 (14)** |
| duelo + Eco Protector (alianza) | **26 (23)** | **18 (17)** | **17 (15)** |

*medio/base quedó contaminada por el flip bajo→medio de la propia corrida (peor cuadro 1640 ms;
familia QA-53/KIMI-054, irreducible en hilo documentado); los escenarios de medio se midieron tras
el asentado. Draw calls escenario-vs-base (bajo/medio/alto): golf +2/+2/−33 (la cámara del hoyo
mira el claro del bosque: menos flora), duelos +4…+5/−22…−9/−36…−29 — **nada sube calls por
encima de su base**; el Eco Protector costó Δ0 sobre el duelo nv 20 en las tres calidades
(uso real confirmado `alianza:"eco_protector"`, 1 uso por ventana de 8 s = su cadencia real:
cooldown 14 s + 60 de energía).

**Escritorio 1920×1080 CPU ×1 (GPU real RX 5700 XT):**

| escenario | bajo fpsMed (min) | medio fpsMed (min) | alto fpsMed (min) |
|---|---|---|---|
| base (spawn villa) | 104 | 82 (68) | 121 (94) |
| minigolf 1 jugador | **128 (103)** | **108 (100)** | **138 (127)** |
| minigolf 2 jug. por turnos | **136 (124)** | **108 (96)** | **130 (115)** |
| duelo evo nv 20 | **115 (67)** | **94 (59)** | **126 (91)** |
| duelo + Eco Protector | **129 (103)** | **133 (70)** | **119 (89)** |

**Conclusión: nada nuevo baja de su propia base en ningún perfil — sin fix en render/streaming.**
En «bajo» (el contrato móvil) cada escenario nuevo queda **igual o por encima** de su base medida
en la misma corrida, y la referencia limpia (KIMI-088, PC libre) ya certificó ≥30 con margen para
la base de la demo (37) y sus escenarios (52/38/56); los contenidos v18 cuestan ~0 (mismas
conclusiones de KIMI-061/082: FX instanciados a 1–2 draw calls con Δ0 medido). En escritorio todo
asienta ≥89 fps salvo transitorios aislados de streaming (mín. puntual 5 en bajo/base, peor cuadro
267 ms — asentado del mundo, no de los escenarios). Límites honestos: móvil = techo por contención
(re-medición opcional con PC libre, `node tools/build/kimi1_124.js --etiqueta libre`); el grito
dentro del minigolf no llegó a dispararse en las ventanas de 8 s (el driver priorizaba tirar; su
FX es el mismo ya medido con Δ0 en KIMI-061/082); Eco Protector se mide con 1 uso real por
ventana (dura 2 s). El juego no se tocó (herramienta + docs solamente).

## KIMI-127 · Chromebook escolar simulado (6-nov, hecha · Kimi 1)

**Primera medición de Chromebook** (pendiente desde BUGS.md «Pendiente de verdad»: iPad/Chromebook/Android).
Herramienta nueva `tools/build/kimi1_127.js`: Chrome headless 1366×768 @ DPR 1 (desktop, sin UA ni
touch), **CPU ×6** (N4000/Celeron de escuela ≈ hilo muy lento), calidad **baja** manual, GPU real
RX 5700 XT; partida sembrada sin creador en el almacén de cada pack (`amazonaverse.save` v6 cap1 /
`<pack>.save` v1 ep2…ep6 — el save «lleno» de campos de otros packs rompe la validación de cap1:
lo descubrió esta herramienta), SIN `?qa=1` (batería concurrente = contamina, KIMI-052). En cada
villa: carga (s hasta `listo_js` / hasta entrada real), luego 12 s quietas en el spawn natural tras
asentar el streaming, FPS por rAF + `renderer.stats()` 1/s + `look.medir()` + captura. La demo
`?v18=1` usa el driver de escenarios por API pública de `kimi1_085` (base/duelo/Sombra/puente).
Corrida `cb-r3` (06-nov ~05:22-05:30 UTC, **0 errores de consola** en las 7 páginas; PC compartida
con otra sesión Kimi — números techo, veredictos válidos; re-medición libre:
`node tools/build/kimi1_127.js --etiqueta libre`).

**Las 6 villas, spawn natural (calidad baja):**

| cap | carga lista/entrada (s) | fps med (mín) | peor cuadro | draw calls | tris | tex GPU | heap |
|---|---|---|---|---|---|---|---|
| cap1 | 4,7 / 27,6 | **19 (18)** | 112 ms | 62 | 0,27 M | 154,8 MB | ~132 MB |
| ep2 | 5,9 / 27,9 | **21 (17)** | 99 ms | 58 | 0,27 M | 150,9 MB | ~146 MB |
| ep3 | 5,7 / 27,5 | **12 (1)** | 2789 ms | 91 | 0,55 M | 160,2 MB | ~97 MB |
| ep4 | 6,0 / 27,2 | **11 (2)** | 3042 ms | 112 | 0,56 M | 156,2 MB | ~111 MB |
| ep5 | 6,3 / 29,9 | **20 (17)** | 87 ms | 102 | 0,24 M | 186,9 MB | ~159 MB |
| ep6 | 5,9 / 27,9 | **21 (16)** | 134 ms | 86 | 0,22 M | 168,2 MB | ~153 MB |

Ningún capítulo llega a 25 FPS de mediana a CPU ×6 (rango 11-21). Los mínimos 1-2 y los peores
cuadros de ~3 s de ep3/ep4 son el **asentado post-entrada** (streaming de la villa + enlaces de
programas, familia QA-53) cayendo dentro de la ventana de muestreo: esos episodios son también los
de más triángulos (0,55-0,56 M) y más calls (91-112) en su spawn. Carga: boot rápido (4,7-6,3 s) y
entrada ~27-30 s en todas.

**La demo `?v18=1` (calidad baja, misma corrida):**

| escenario | fps med (mín) | peor cuadro | p95 | calls med | ktris med | heap |
|---|---|---|---|---|---|---|
| base explanada | 8 (0) | 8559 ms | 188 ms | 128 | 493 | 163 MB |
| duelo (Campeona, FX) | **17 (11)** | 198 ms | 97 ms | 85 | 260 | 178 MB |
| Sombra (poderes 0,9 s) | **16 (14)** | 126 ms | 88 ms | 79 | 248 | 138 MB |
| puente colgante | **20 (14)** | 138 ms | 80 ms | 80 | 258 | 126 MB |

La «base» quedó contaminada por el asentado del propio teleport (peor 8,5 s = drenado/streaming,
inválida como cifra); el comparativo válido es escenario-vs-escenario seguidos: duelo 17 / Sombra
16 / puente 20 fps de mediana. Los contenidos V18 no añaden draw calls (85/79/80 frente a 62 del
spawn de cap1: la cámara de la explanada/el río mira zonas abiertas).

**Lectura:** la GPU va sobrada en un Chromebook (calls 58-128 y ≤0,56 M tris a 1366×768 — el
presupuesto «escolar» de 150 calls se cumple en todas las vistas); **el cuello es el hilo principal
a ×6**. Ojo: el adaptativo del juego reacciona a cuadros ≥200 ms sostenidos y a 19 FPS los cuadros
son ~53 ms, así que el juego se queda en «bajo» para siempre sin escalar más (hueco del escalón de
emergencia de QA-53-variantes). **Conclusión: hace falta la calidad «escuela»** — propuesta con
palancas concretas y siguiente paso (perfil de CPU) en **BUGS.md QA-181**. Evidencia:
`docs/img/kimi127/k127_cb-r3.{json,log}` + `k127_cb-r3_<pack>_villa.jpg` ×6 + `k127_cb-r3_demo_*.jpg` ×4.
El juego no se tocó (herramienta + docs solamente).

## KIMI-132 · QA-181 paso 3 · Perfil de CPU del Chromebook (atribución del hilo, 06-nov)

Perfil CDP (self-time por samples+timeDeltas) en el spawn asentado, 1366×768 @ DPR 1,
CPU ×6, calidad baja, GPU real RX 5700 XT; ventana 15-17 s por pack; entrada real sembrada
sin creador. Evidencia `docs/img/kimi132/k132_r1.{json,log}` + capturas. PC compartida con
otra sesión Kimi durante la medición: los % de self-time (throttling por proceso) son válidos;
los tiempos absolutos son techo.

| pack | fps med | calls | ktris | heap | three.js | nativo | renderer | sólidos | streaming | vegetación | física | terreno | game |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| cap1 | 17 | 62 | 268 | 152 MB | 35,2 % | 24,1 % | 9,9 % | 0,4 % | 3,1 % | **0,3 %** | 1,9 % | 1,3 % | 9,5 % |
| ep3 | 11 | 91 | 553 | 140 MB | 28,5 % | 19,1 % | 5,3 % | **20,2 %** | 4,6 % | **0,7 %** | 1,4 % | 2,1 % | 5,2 % |

Top funciones cap1: updateMatrixWorld 5,9 · (program) nativo 24,1 · multiplyMatrices 3,1 ·
getProgramCacheKey 2,5 · objPendiente (renderer) 2,6 · cuadro (streaming) 2,4 · traverse ·
renderBufferDirect. Top ep3: (program) 19,1 · muestraVanos 5,9 · filtro 3,1 · triSeguir 2,6 ·
block 2,3 · updateMatrixWorld 3,0 · triQuery 1,7 · avanzar (streaming) 1,6.

**Lectura:** el hilo lo dominan three.js (grafo de escena: updateMatrixWorld/traverse/
multiplyMatrices/getProgramCacheKey) + el submit nativo ANGLE (~60 % entre ambos en cap1).
La vegetación es despreciable (0,3-0,7 %): la palanca «impostores de flora» del borrador
«escuela» queda descartada por medición. En ep3 el segundo coste es el trabajo de vanos de
`solidos.js` (muestraVanos/filtro/triSeguir, 20 %). El mecanismo de calor de renderer.js ya es
barato (objPendiente 2,6 % + calentarPresupuesto 1,1 % + texturasDe 1,0 %). El nivel «escuela»
debe recortar resolución (0,75) + post, el trabajo de vanos en reposo y calls/estado por cuadro;
la puerta de entrada sigue siendo el escalón por fps sostenido (<25 durante ~8 s), propuesta
completa en BUGS.md QA-181. El juego no se tocó (herramienta `tools/build/kimi1_132.js` + docs).

## KIMI-136 · QA-181 paso 4 · Re-medición LIMPIA del Chromebook (06-nov)

Repetición de KIMI-127 con la PC libre (0 node/0 chrome kimi; la `cb-r3` de KIMI-127
compartía PC con otra sesión y sus cifras eran techo). Misma herramienta
(`node tools/build/kimi1_127.js --etiqueta libre-r1`), mismo perfil: 1366×768 @ DPR 1,
**CPU ×6**, calidad baja, GPU real RX 5700 XT, semilla por almacén de pack, sin `?qa=1`.
HEAD f502ef8e (los 3 commits de juego encima de 43e17f56 validado son docs + 3 líneas de
`aula.js` K4-01, nada de gráficos/render). **0 errores de consola en las 7 páginas.**

| cap | carga lista/entrada (s) | fps med (mín ventana) | serie por segundo (asentado → asentido) | peor cuadro | calls | ktris | dpr |
|---|---|---|---|---|---|---|---|
| cap1 | 4,3 / 26,9 | **29 (28)** | 28-30 constante | 67 ms | 63 | 268 | **0,75** |
| ep2 | 4,0 / 25,1 | **33 (24)** | 24-37 | 61 ms | 59 | 270 | **0,75** |
| ep3 | 4,0 / 19,9 | **20 (2)** | 2-20 (7 s) → **31-34** | 2495 ms | 91 | 455 | **0,75** |
| ep4 | 4,2 / 23,2 | **23 (3)** | 3-23 (6 s) → **28-32** | 2567 ms | 113 | 459 | **0,75** |
| ep5 | 4,3 / 27,7 | **24 (2)** | 2-21 (6 s) → **30-33** | 1825 ms | 105 | 234 | **0,75** |
| ep6 | 4,3 / 25,8 | **34 (31)** | 31-37 constante | 54 ms | 86 | 217 | **0,75** |

**Lectura:** con la PC libre el Chromebook simulado **asienta 28-37 fps en las 6 villas**.
Las medianas de ventana 20-24 de ep3/ep4/ep5 se las baja el **asentado post-entrada**: los
primeros ~6-7 s a 2-20 fps con peores cuadros de 1,8-2,6 s son el streaming de la villa +
los enlaces de programas (familia QA-53), y la cifra asentida son los últimos segundos de
cada serie. **Escalón de KIMI-133 verificado: dpr=0,75 en el 100 % de las muestras de las
6 villas** (la resolución dinámica baja sola en «bajo»). Las cifras techo de cb-r3
(11-21 fps) eran de contención, no del juego.

**Demo `?v18=1` (misma corrida):**

| escenario | fps med (mín) | peor cuadro | calls med | ktris med | dpr |
|---|---|---|---|---|---|
| base explanada | 7 (2) — contaminada por el asentado del teleport (peor 7,6 s), inválida como cifra | — | 135 | 495 | 0,75 |
| duelo (Campeona, FX) | **20 (16)** | 180 ms | 82-87 | 260 | 0,75 |
| Sombra (poderes 0,9 s) | **14 (12)** | 137 ms | 79 | 248 | 0,75 |
| puente colgante | **26 (25)** | 75 ms | 80 | 258 | 0,75 |

La **Sombra es el escenario más flojo del Chromebook a ×6** (12-16 fps sostenidos): la
pelea cuesta hilo propio (la niebla en «bajo» ya costaba 0 draw calls, KIMI-088/094 — es
CPU, no raster). Para el nivel «escuela» (decisión de Kelvin, BUGS.md QA-181) la lectura
limpia cambia el alcance: solo quedarían por recortar el **tramo de asentado** (~7 s
post-entrada a <25 fps en ep3/ep4/ep5, familia QA-53: precarga de la villa o reparto de
enlaces) y la **Sombra de la demo**; las villas asentidas ya cumplen ≥25 fps. El juego no
se tocó (medición + docs). Evidencia: `docs/img/kimi127/k127_libre-r1.{json,log}` +
`k127_libre-r1_<pack>_villa.jpg` ×6 + `k127_libre-r1_demo_*.jpg` ×4.
