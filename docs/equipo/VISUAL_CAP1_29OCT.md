# Recorrido visual del capítulo 1 · 29-oct (BM33)

Build `HEAD-87504dd` (sin cambios de código), Chrome 156 con GPU real (Metal), calidad «alto», clima sol, 1280×800 en JPG.
90 capturas = 6 sitios × 5 alturas sobre el suelo (suelo, 5, 20, 60 y 150 m) × 3 rumbos (r0 = yaw 0, r1 = 120°, r2 = 240°):
`docs/img/bm33_<sitio>_<altura>_<rumbo>.jpg` (alturas: `suelo`, `a5`, `a20`, `a60`, `a150`). Vistas en `tools/build/bm33_vistas.json`,
lanzadas con `look_capturas.py --vistas-json … --raiz <build>/site --prefijo bm33_` (la cámara es la normal del juego, con Vittata en cuadro).

| Sitio | x, z |
|---|---|
| villa (Villa Raíz y aldea) | 125, 150 |
| embarcadero (Canoe Landing) | -134, 30 |
| colina (parcela de la colina, ruinas) | 0, 170 |
| miradores | -72, -130 |
| tepuy (cara sur y cascada) | 52, -84 |
| ciudad (ruinas del tepuy) | -10, -140 |

**Nota de método:** no se pudo juzgar el pixelado fino a 1280 px ni mover la cámara libre; los hallazgos son lo visible en las láminas. Rendimiento medido
con la Mac cargada por otras ventanas y `taskpolicy -b`: 5–41 FPS en Villa Raíz (1,0 M triángulos, 126 draw calls, 500 MB de texturas); no son cifras limpias.

## Lo que está mal, de más a menos visible

1. **Ciudad lejana en blanco puro y de cerca en crema.** `villa_a60_r0` y `villa_a150_r0` (125, 150; 60/150 m; rumbo 0) y `colina_a150_r0`, `tepuy_a60_r2`,
   `embarcadero_a60_r2`: la ciudad aparece blanca y plana como maqueta (`_lejos`); `embarcadero_a150_r0` (−134, 30; 150 m) y `miradores_a60_r2` la muestran ya crema.
   El cambio de tono entre LOD sigue siendo evidente a 60–150 m, pese a BM32 (el `_lejos` no se ajustó igual).
2. **Piezas de piedra flotando o atravesadas.** `miradores_a5_r0` (−72, −130; 5 m): disco gris plano suspendido sobre la plaza; `miradores_suelo_r0/r1`: columnas y vigas que se
   cruzan sin apoyo; `tepuy_a60_r0` (52, −84; 60 m, rumbo 0): dos monolitos blancos pegados a la pared del risco, sin base; `colina_suelo_r0`: losa gris plana
   que sobresale del terreno (coincide con las candidatas de BM30: `complejo_ruinas` (−18,5; 177,2) y losas en ladera).
3. **Interior de la ciudad y de la colina: caras enormes lisas con costuras y cortes.** `ciudad_suelo_*`, `ciudad_a5_*` (−10, −140), `colina_suelo_r1/r2` y `colina_a5_*`: paredes de color
   uniforme muy estiradas, losas con rejilla de textura ampliada hasta verse borrosa, aristas que se cortan en planos y sombras de gran bloque. Es lo primero que ve el jugador al entrar.
4. **Agua con facetas y borde dentado.** `tepuy_suelo_r0/r1/r2` (52, −84), `embarcadero_a20_r2`, `villa_suelo_r1/r2`, `villa_a5_r2`: la superficie se ve en bloques cuadrados de azul pálido,
   la espuma de orilla es blanca con dientes de sierra y la cascada (`tepuy_suelo_r1`) tiene escalones de rectángulos; el agua del río no casa con la de mar (mucho más fina).
5. **Bandas de color en cielo y nubes** en todas las capturas de 60 y 150 m (p. ej. `ciudad_a150_r0`, `miradores_a150_r0`): el cielo y las nubes salen posterizados en franjas. Falta ruido de dither en el gradiente.
6. **Islotes lisos de color menta en el mar** (`villa_a60_r1`, `miradores_a60_r1`, `ciudad_a150_r2`): discos planos sin relieve ni espuma, flotando sobre el agua.
7. **Hoja pegada a la cámara y tramado visible sobre Vittata:** `tepuy_a5_r1`, `tepuy_a5_r2` (52, −84; 5 m): una copa ocupa la pantalla y el fundido por tramado de Vittata se ve como círculo punteado.
8. **Zonas casi negras bajo el follaje:** `tepuy_a20_r1`, `villa_suelo_r0`, `embarcadero_a5_r1`: sombras de copa/roca sin relleno.
9. **Tiendas rojas con textura de red** (`embarcadero_suelo_r2`, `embarcadero_a5_*`, −134, 30): el entramado se ve como malla de colores, no como tela.
10. **A 150 m a rumbos hacia el mar** (`*_a150_r1/r2` en varios sitios): un tercio a media pantalla de mar vacío; sin horizonte con isla lejana ni niebla de distancia.

## Arreglos de BM33

Ninguno de código en esta pasada: los archivos gráficos (`terreno.js`, `streaming.js`, `renderer.js`, `vegetacion.js`, `mundo.js`) tienen cambios sin commit de otras ventanas
y un commit mío habría mezclado trabajo ajeno. Quedan como tareas (numeradas desde BM38 porque BM34–BM37 ya existen):

- **BM38**: tono único de la ciudad en todos los LOD (`_lejos` igual de crema que el cercano; hallazgo 1).
- **BM39**: piezas flotantes de miradores, tepuy y colina: bajarlas o darles base (hallazgos 2; lista de BM30 y coordenadas arriba).
- **BM40**: interior de ciudad y colina: textura a escala de mundo (triplanar con tamaño fijo) y menos caras lisas (hallazgo 3).
- **BM41**: agua: facetas, espuma de orilla y escalones de cascada (hallazgo 4).
- **BM42**: dither en el degradado de cielo y nubes (hallazgo 5); islotes menta del mar (6).
- **BM43**: copa pegada a la cámara y tramado de Vittata (7); luz de relleno bajo el follaje (8); textura de la tela roja (9).
