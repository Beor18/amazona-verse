# Recorrido visual del capítulo 1 · 30-oct (BM50)

Build `HEAD-be8a52f` (sin cambios de código; árbol de trabajo sin los cambios ajenos), Chrome con GPU real (Metal), calidad «alto», sol, 1280×800.
90 capturas = 6 sitios × 5 alturas × 3 rumbos, mismas vistas que BM33 (`tools/build/bm33_vistas.json`): `docs/img/bm50_<sitio>_<suelo|a5|a20|a60|a150>_<r0|r1|r2>.jpg`
(medidas en `docs/img/bm50_medidas.json`). Comparar con `docs/img/bm33_*` (mismo nombre) y con `docs/img/kelvin_29oct/` (en la carpeta `amazona-verse/`, 5 láminas).
Revisé a ojo una muestra de 8 láminas por problema (no las 90 una a una); lo que digo de las demás es por extensión y puede fallar.

| Sitio / problema del 29-oct | Ahora (30-oct) |
|---|---|
| Embarcadero: tienda roja como red (`embarcadero_suelo_r2`) | **Arreglado**: se ve tela con costuras y remiendos. Sigue flojo: cuerdas muy finas atravesando el suelo. |
| Embarcadero y río: agua en bloques | **Mejor**: río (`villa_a60_r0`) liso con orilla de arena clara; mar con olas finas. |
| Tepuy: cascada y agua (`tepuy_suelo_r1`) | **Mejor, no resuelto**: ya hay espuma y brillos, pero la cascada sigue en escalones de ángulos rectos y los bordes de orilla en picos. |
| Ciudad: interior (`ciudad_suelo_r0`, `miradores_a5_r0`) | **Mejor**: piedra con losas y a escala de mundo, sombras claras. Flojo: columnas largas que se cruzan, esferas verdes «sandía» cortadas por vigas, bordes de bloque muy rectos. |
| Ciudad lejana (`villa_a60_r0`, `colina_a150_r0`) | **Flojo**: de lejos sigue blanca y sin detalle (maqueta de espuma), más clara que la crema de cerca. |
| Piezas flotantes (miradores, tepuy, colina) | **Flojo**: en `miradores_a5_r0` hay bloques y una torre colgando sin apoyo a la izquierda; en `colina_suelo_r0` la cámara queda dentro de una losa (pantalla de piedra lisa). |
| Mar a 150 m (`villa_a150_r1`, `colina_a150_r1`) | **Flojo**: horizonte con curvatura clara y cielo sin bandas notorias (mejor), pero los islotes menta siguen: discos lisos de palmas pálidas flotando sobre el mar. |
| Bosque de Villa Raíz a 60 m | **Bien**: copas con volumen, sin piruletas; la mejora más clara respecto a Kelvin 29-oct. |
| Zonas casi negras bajo el follaje | **Mejor**: relleno visible en `embarcadero_suelo_r2` (sombras suaves). |

## Lo que sigue flojo (para aprobar o devolver)

1. Ciudad lejana blanca (LOD `_lejos`), a 60–150 m. · RESUELTO (BM56): el tope de BM38 se había perdido en BM43; restaurado y con tinte cálido (`docs/img/bm56_ciudad_lejos_antes.png` / `_despues.png`): ahora marfil crema, algo caqui.
2. Piezas flotantes y la cámara dentro de la losa en `colina_suelo_r0` (0, 170).
3. Islotes menta lisos en el mar.
4. Cascada en escalones y orillas en pico.
5. Sandías verdes de la ciudad cortadas por las vigas, aristas demasiado rectas.

Sin esto no está aprobado el mapa: Kelvin decide sobre las láminas.
