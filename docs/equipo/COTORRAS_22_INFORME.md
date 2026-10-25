# Las 22 cotorras: revisión técnica y comparación con la Vittata del juego

Revisión del Technical Artist, 25 oct 2026. **No se modificó nada**: ni los 22 `.blend` de `~/Downloads/cotorras/` ni el juego. Todo se midió abriendo cada archivo en Blender 4.2 sin ventana, de uno en uno, sin guardar. Los scripts y los datos crudos están en `_trabajo_claude/cotorras_revision/` (fuera del repo). Regla de Kelvin: **«no cambies nuestra cotorra»**. Este informe solo describe y recomienda; cualquier reemplazo lo decide Kelvin.

Lámina: `docs/img/cotorras_22_lamina.png` (Vittata actual del juego a la izquierda y 6 de las 22 a su derecha; fila de cuerpo, fila de cara y fila con la textura de color de cada una).

## Veredicto

1. **Las 22 son un solo modelo con 22 pieles.** Los 22 archivos tienen la misma malla (11 551 vértices), el mismo UV, el mismo esqueleto y la misma animación (comprobado por hash de vértices, de caras y de UV, y por nombres y posiciones de huesos). Solo cambian las texturas de color, relieve (Normal y Height) y, en 5 casos, la rugosidad.
2. **Respecto a la Vittata del juego es un modelo distinto, pero con el mismo diseño.** Altura, ancho en T y silueta coinciden con `cotorrofiver.blend` (distancia media entre superficies: 0,57 % de la diagonal; 95 % de los puntos a menos de 1,6 %; mismos límites de caja). Pero la malla es otra (11 551 vs 14 181 vértices), el UV es otro y el esqueleto es otro (`RigCotorra`, 125 huesos, frente a los 51 del original). Parece la Vittata rehecha con menos polígonos, otro rig y texturas de 4096.
3. **El esqueleto no es compatible.** De los 47 huesos que nombra el código del juego, solo 20 existen con el mismo nombre en `RigCotorra`: las patas y `armL1`/`armL2`. Faltan columna, cabeza, cola, pico, dedos, brazo derecho y las 7 monturas.
4. **Pasar las pieles a la Vittata actual es posible** porque las formas coinciden (cocción de textura de un UV al otro). Es la opción barata (M). **Adoptar el modelo nuevo como final es L** y toca ropero, animaciones y criadero.
5. **Ninguna de las 22 es *Amazona vittata*.** La protagonista no tiene piel propia en estos archivos.

## Lo que tienen en común los 22 archivos

| Qué | Valor |
|---|---|
| Objetos | 227 por archivo, pero solo 9 son reales: la cotorra, `RigCotorra`, `rig`, `CotorroHP`, una malla auxiliar oculta (`Cube.001`), un suelo, la cámara y 2 luces. Los otros 218 son formas de control de un Rigify humano (`WGT-rig_*`) que no se usan |
| Malla jugable `Amazon parrots` | 11 551 vértices, 11 566 caras, **23 004 triángulos**, 1 UV (`UVMap`), 1 material, escala de objeto 0,5638 |
| Subdivisión | Lleva un modificador *Subdivision* nivel 2: así se ve en Blender y así salen los renders de la lámina. Evaluado son **184 734 vértices y 369 088 triángulos**: no sirve para el navegador. Nivel 0 son los 23 004 triángulos |
| `CotorroHP` | Esculpido de alta resolución (14 343 vértices, 4 niveles Multires), en una colección excluida. Es el origen del relieve (Normal/Height). No hace falta para el juego |
| Esqueleto que deforma | `RigCotorra`: 125 huesos, 92 deformantes, 99 grupos de vértices en la malla (7 no son huesos: `Plumas`, `Largo Plumas`, `Group`, `Left`, `Left-Down`, `Right`, `Right Down`) |
| Rig sobrante | `rig`: Rigify humano de 702 huesos que no mueve la cotorra |
| Expresiones | 14 *shape keys* (cejas, párpados, mejillas, ceño) + huesos de pico (`PicoUp`/`PicoDown`), párpados, ojos, lengua, cola |
| Animación | 1 acción, `RigCotorraAction`: 22 fotogramas (1–23 a 24 fps, ≈ 0,9 s), 76 huesos animados. Sin nombre que diga qué es (al abrir el archivo la cotorra queda en pose de vuelo). Más acciones de cámara y luces (no sirven) |
| Influencias por vértice | 393 vértices (3,4 %) con más de 4 huesos; el original de la Vittata tenía 1 148 (8,1 %). Los exportadores a glTF recortan a 4 |
| Escena | Sin unidades métricas (unidad de Blender = 1). Altura en T: **4,14 u** y ancho en T: **4,82 u**, idénticos al original. El juego la lleva a 1,4 m (factor 0,338) |
| Texturas | 4 imágenes de **4096×4096**, **todas empaquetadas dentro del `.blend`** (Color, Height, Normal, Rugosidad). Las rutas externas (`//../Materials/Amazona … 001/…png`) no existen en disco, pero no hacen falta: nada se pierde al abrirlos en otro equipo |
| Material | Principled con Color, Rugosidad, Normal y Height (desplazamiento). Motor de escena: Cycles |

## Tabla por especie

Pesos de las texturas 4096² en PNG, tal como están empaquetadas. Total de los 22 archivos: **3,6 GB**; solo el Normal pesa 1,18 GB en total.

| # | Archivo (*Amazona …*) | .blend MB | Material dentro | Color 4K | Normal 4K | Height 4K | Rugosidad 4K | Color 1024 JPEG q85 | Color medio | En el juego hoy |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | *aestiva* | 162.3 | aestiva.001 | 5.72 MB | 53.81 MB | 10.3 MB | compartida | 127 KB | #618b34 | ficha de catálogo, sin modelo propio |
| 2 | *amazonica* | 160.3 | amazonica001 (sin punto) | 3.88 MB | 53.7 MB | 10.23 MB | compartida | 115 KB | #62864c | tinte de máscara |
| 3 | *auropalliata* | 166.2 | auropalliata.001 | 9.4 MB | 53.91 MB | 10.35 MB | compartida | 138 KB | #838941 | ficha de catálogo, sin modelo propio |
| 4 | *barbadensis* | 165.2 | barbadensis.001 | 8.04 MB | 54.15 MB | 10.52 MB | propia (0.19 MB) | 134 KB | #88873a | ficha de catálogo, sin modelo propio |
| 5 | *brasiliensis* | 159.5 | brasiliensis.001 | 3.07 MB | 53.7 MB | 10.23 MB | compartida | 128 KB | #6d7838 | ficha de catálogo, sin modelo propio |
| 6 | *diadema* | 166.2 | Diadema.001 | 9.44 MB | 53.92 MB | 10.35 MB | compartida | 140 KB | #6d7d43 | ficha de catálogo, sin modelo propio |
| 7 | *dufresniana* | 166.4 | dufresniana.001 | 9.7 MB | 53.83 MB | 10.34 MB | compartida | 134 KB | #789344 | ficha de catálogo, sin modelo propio |
| 8 | *farinosa* | 166.8 | farinosa.001 | 10.24 MB | 53.73 MB | 10.28 MB | propia (0.2 MB) | 144 KB | #8c9b50 | ficha de catálogo, sin modelo propio |
| 9 | *guatemalae* | 165.2 | guatemalae.001 | 8.61 MB | 53.8 MB | 10.3 MB | compartida | 122 KB | #6b8d5e | ficha de catálogo, sin modelo propio |
| 10 | *guildingii* | 160.8 | guildingii.001 | 4.38 MB | 53.71 MB | 10.24 MB | compartida | 121 KB | #7f854b | tinte de máscara |
| 11 | *imperialis* | 159.3 | imperialis.001 | 2.85 MB | 53.7 MB | 10.23 MB | compartida | 103 KB | #567949 | ficha de catálogo, sin modelo propio |
| 12 | *kawalli* | 164.4 | kawalli.001 | 7.96 MB | 53.7 MB | 10.24 MB | propia (0.18 MB) | 168 KB | #829735 | ficha de catálogo, sin modelo propio |
| 13 | *leucocephala* | 164.7 | leucocephala.001 | 8.2 MB | 53.7 MB | 10.23 MB | propia (0.19 MB) | 125 KB | #798249 | ficha de catálogo, sin modelo propio |
| 14 | *mercenarius* | 163.5 | mercenarius.001 | 7.05 MB | 53.7 MB | 10.23 MB | propia (0.19 MB) | 139 KB | #7b7927 | ficha de catálogo, sin modelo propio |
| 15 | *ochrocephala* | 159.6 | ochrocephala.001 | 3.15 MB | 53.7 MB | 10.23 MB | compartida | 120 KB | #6a7125 | ficha de catálogo, sin modelo propio |
| 16 | *ochrocephala panamensis* | 160.2 | ochrocephala panamensis.001 | 3.79 MB | 53.71 MB | 10.24 MB | compartida | 120 KB | #68803c | subespecie, sin id propio |
| 17 | *oratrix* | 165.2 | oratrix.001 | 8.63 MB | 53.8 MB | 10.3 MB | compartida | 122 KB | #86922c | tinte de máscara |
| 18 | *rhodocorytha* | 163.5 | xantholora.001 ⚠ nombre de otra especie | 7.1 MB | 53.7 MB | 10.23 MB | compartida | 122 KB | #758a2b | ficha de catálogo, sin modelo propio |
| 19 | *versicolor* | 164.6 | Versicolor.001 | 8.21 MB | 53.7 MB | 10.23 MB | compartida | 142 KB | #83883c | tinte de máscara |
| 20 | *viridigenalis* | 165.4 | viridigenalis.001 | 7.46 MB | 54.5 MB | 10.97 MB | compartida | 124 KB | #69823d | ficha de catálogo, sin modelo propio |
| 21 | *xantholora* | 162.5 | xantholora.001 | 6.09 MB | 53.7 MB | 10.23 MB | compartida | 131 KB | #8d9740 | ficha de catálogo, sin modelo propio |
| 22 | *tresmariae* | 165.8 | tresmariae.001 | 9.03 MB | 53.91 MB | 10.35 MB | compartida | 125 KB | #9d9134 | ficha de catálogo, sin modelo propio |

Notas:
- **Color y relieve son propios de cada especie** (los 22 hashes de Color, Height y Normal son distintos). La rugosidad se repite en 17 archivos.
- **Cada especie lleva 67–74 MB de texturas** (el Normal, 54 MB, es ≈ 75 %).
- ⚠ `Rhodocorytha.blend` trae el material llamado *xantholora.001*. La textura es distinta de la de Xantholora (rojo y amarillo en la cara), así que probablemente es solo el nombre mal puesto. Kelvin o quien hizo los archivos debe confirmarlo.
- 21 de las 22 coinciden con un `id` de `content/comun/especies.js`. *Ochrocephala panamensis* es una subespecie y el catálogo no la tiene aparte.
- Hoy el juego solo tiene cuatro de estas especies como **tinte de color** sobre la Vittata (amazonica, oratrix, versicolor, guildingii). *agilis*, *albifrons* y *festiva* están en el juego como tinte, pero no tienen archivo entre las 22.
- Los colores medios son solo orientativos (promedio del atlas, en sRGB).

## Comparación con la Vittata actual

| | Vittata del juego (de `cotorrofiver.blend`, 2021) | Las 22 (modelo nuevo) |
|---|---|---|
| Malla | `Cube.002`: 14 181 vértices, 28 268 triángulos (en el GLB: 15 278 vértices por las costuras de UV) | `Amazon parrots`: 11 551 vértices, **23 004 triángulos** (−19 %); con Subdivisión 2: 369 088 |
| UV | Atlas 1024×1024 (distinto) | Atlas 4096×4096 (distinto) |
| Mismos vértices / UV | No | No (la forma coincide, la malla no) |
| Esqueleto | 51 huesos (60 articulaciones en el GLB: + raíz, `pico` y 7 montajes) | `RigCotorra`: 125 huesos, 92 deformantes |
| Nombres en común | 20 de 51 | 20 de 125 |
| Patas | `pieL1…8` y `.001`, 18 huesos | **Mismos nombres y misma posición** (diferencia máxima 1,2 % de la altura) |
| Alas | `armL1/2/3`, 12 huesos de dedos `armL2.0xx`, `Bone.00x` | `armL1`, `armL2`, `handL` y dedos `FingerBase`, `Thumb`, `FiggerPoint`… con IK; brazo derecho `armR1/2` |
| Columna y cabeza | `espalda1`, `espalda2`, `cabeza`, `cabeza.001`, cola `espalda1.001` | `Abdomen`, `Pecho`, `Cuello`, `Cabeza`, cola `Rabadilla`, `ColaL/R` |
| Pico, ojos | 1 hueso `pico`, párpados por script (`eyes.py`) | `PicoUp`, `PicoDown`, `ParpadoUp/Down` L/R, `OjoL/R`, `Mirada`, lengua, 14 shape keys |
| Montajes del ropero | 7 huesos `mount_*` (los añade el pipeline) | No existen |
| Animaciones | 5 clips en el GLB (Celebrate, Curious, Idle, Walk, Welcome) más las procedurales | 1 acción de 22 fotogramas, sin nombre de uso |
| Altura y ancho en T | 4,14 u × 4,82 u | 4,14 u × 4,82 u |
| Textura | 1024×1024 (41 KB en el GLB) + máscara de color 1024 | 4096×4096 × 4 mapas (≈ 70 MB por especie) |
| Peso del modelo | `vittata.glb` 1,3 MB (+ 1,75 MB en base64 para hosts sin .glb) | Sin medir: la geometría sola rondaría 1–2 MB; los 14 shape keys pueden sumar varios MB (estimación, sin exportar) |

**Misma malla u otro modelo.** Otro modelo, con el mismo diseño: la forma de superficie coincide (0,57 % de la diagonal), pero ningún vértice ni UV es el mismo, así que no se puede cambiar la textura sin más. Las 22 comparten entre sí malla, UV y esqueleto.

**Cómo se ve.** En la lámina las 6 especies nuevas comparten exactamente la silueta de la Vittata (cabeza, alas en T, patas), con plumas en relieve (Normal de 4K), ojos y pico con más detalle. La Vittata de la lámina es el `vittata.glb` tal cual sale de Blender: dentro del juego se le aplican máscaras y tintes, así que allí los colores cambian. Los renders nuevos usan la Subdivisión nivel 2 y el relieve de 4K; con la malla base de 23 004 triángulos la silueta sería más facetada (no se renderizó para compararlo).

## ¿Qué tan fácil sería pasar cada piel a la Vittata del juego?

La forma coincide, así que se puede **cocer** (bake) cada textura del UV nuevo al UV de la Vittata con la malla del juego como destino. No se probó (no se construyó nada): es una estimación.
- **Solo color (M para el primer script, S por cada especie después):** una cocción de color de 4096 a 1024 por especie, con el UV del juego. Salen 22 JPEG de ≈ 130 KB (**2,8 MB en total**, medido a 1024 y calidad 85). Esqueleto, animaciones, ropero y criadero quedan intactos.
- **Con relieve (L):** hay que cocer también el Normal (del espacio de objeto al tangente de la malla del juego) y el juego tendría que cargar un segundo mapa por especie.
- Riesgos: costuras, ojos y pico (la Vittata del juego tiene el pico como material aparte); el sistema actual de máscaras (`vittata_masks.png`) y tintes por especie quedaría sin uso para esas especies, y el shader tendría que aceptar «piel completa» en lugar de «base + máscara».

## Impacto si se adopta el modelo nuevo como final

| Pieza | Qué pasa | Esfuerzo |
|---|---|---|
| **Ropero** (40 piezas) | Las 40 prendas están ligadas a las 60 articulaciones de la Vittata (80 archivos: 40 `.glb`, 9,7 MB, más sus `_glb.js`, 22 MB en total). La ropa ajustada (camisa, pantalón, correas) se recorta del cuerpo con los mismos vértices y pesos: con otra malla hay que rehacerla con los 7 scripts `ropa_*.py`. Las 7 monturas (`mount_head_top`, `mount_eyes`, `mount_neck`, `mount_chest`, `mount_back`, `mount_wing_L/R`) hay que crearlas y medirlas de nuevo (`mkjson.py`, `eyes.py`). Cada prenda se vuelve a exportar y a probar | **L** |
| **Animaciones procedurales** | `character.js` (1 096 líneas) mueve huesos por nombre y con ejes medidos en el rig actual (alas, dedos, patas, pico, columna, mirada, agacharse, posarse). Solo 20 de los 47 huesos que nombra existen en `RigCotorra`. Los 5 clips del GLB no sirven. Se aprovecha la IK de patas (mismos nombres y posiciones) | **L** |
| **Criadero** (bebé y juvenil) | `content/comun/huevos.js` escala por huesos: `cabeza001`, `armL1`, `armL1001`, `pieL1`, `pieL1001`, `pieL4/7/8` (+001) y `espalda1001`. En `RigCotorra`: `Cabeza` (sin `.001`), `armL1` y `armR1`, patas igual, cola `Rabadilla/ColaL/ColaR`. Hay que cambiar la tabla y volver a afinar proporciones y los cascarones de plumón. Los tests que fijan «cabeza ×1,42» también | **M** |
| **Peso en el navegador** | Ganan: −19 % de triángulos y una cabeza con expresiones. Pierden: las texturas de 4096 (≈ 70 MB por especie; en la tarjeta gráfica un mapa 4096² con mipmaps son ≈ 85 MB, así que cuatro mapas rondan 350 MB por especie, inviable en equipos de escuela). A 1024² cada mapa son ≈ 5 MB en memoria. Hay que bajar texturas (1024 el color; el Normal, solo si se mide) y quitar la Subdivisión | **M** |
| **Regla de Kelvin** | La regla «no cambies nuestra cotorra» se rompería: el modelo y el rig dejarían de ser los de Kelvin | decisión de Kelvin |

## Opciones

| Opción | Qué es | Esfuerzo |
|---|---|---|
| **A. No cambiar nada** | Vittata y tintes como hoy | S (cero) |
| **B. Pieles de color en la Vittata actual** | Cocer las 22 pieles a 1024 sobre el UV de la Vittata; las especies pasan de tinte a piel real. Sin tocar modelo, rig, ropero ni criadero | **M** (script + selector de piel + shader) |
| **C. B con relieve** | B más el Normal cocido por especie | **L** |
| **D. Vitrina de especies con el modelo nuevo** | Exportar el modelo nuevo (nivel 0, texturas 1024) solo para una vitrina o enciclopedia 3D de las 22 (Diario, Aula), sin ropero ni procedural. Vittata sigue siendo la protagonista | **M** |
| **E. Adoptar el modelo nuevo como final** | Cambiar malla y rig de todo el juego | **L+** (ropero, animación, criadero, pruebas) |

## Recomendación

1. **No hacer E** antes de cerrar el capítulo 1. Rompe la regla de Kelvin y toca todo lo que ya funciona (ropero, movimiento, criadero).
2. **Pedir a Kelvin que apruebe un piloto de B con 3 especies** (por ejemplo, *oratrix*, *versicolor* y *aestiva*, para comparar contra los tintes). Medir la calidad de la cocción y el peso antes de hacer las 22.
3. Dejar **D** como segunda fase si Kelvin quiere enseñar las 22 con más detalle que un tinte.
4. Lo que hay que corregir en los archivos antes de usarlos: el nombre del material de *Rhodocorytha*, y al exportar, dejar fuera el Rigify humano (702 huesos, 218 formas) y el esculpido.

## Decisiones que tiene que tomar Kelvin

1. ¿La Vittata (modelo y rig) se queda tal cual? (Recomendado: sí.)
2. ¿Las especies pasan de **tinte** a **piel real**, empezando por las 4 que ya existen (amazonica, oratrix, versicolor, guildingii)? ¿Y qué pasa con *agilis*, *albifrons* y *festiva*, que hoy tienen tinte y no tienen archivo?
3. ¿Se aprueba el **piloto de B** con 3 especies y un tope de textura de 1024 para clase?
4. ¿El modelo nuevo se usa solo como **vitrina** (D) o es candidato a reemplazo (E)? Si es E, ¿después del capítulo 1?
5. **Origen y derechos:** los archivos no dicen quién hizo las texturas ni con qué licencia. Es decisión legal de Kelvin antes de usarlos en el juego.
6. ¿*Ochrocephala panamensis* (subespecie) entra en el catálogo como ficha propia? Hoy no tiene `id`.
7. *Amazona vittata* no está entre las 22: ¿quién hace su piel con el modelo nuevo, si algún día se usa?

## Lo que no se verificó

- No se exportó el modelo nuevo a GLB ni se midió su peso real; las cifras de GLB son estimaciones.
- No se probó la cocción de pieles; se midió solo la distancia entre superficies.
- Los renders de la lámina usan la Subdivisión nivel 2 y pose de reposo (T) para poder comparar con la Vittata del juego. De las 22 solo se renderizaron 6 (amazonica, oratrix, versicolor, guildingii, aestiva, imperialis); las otras 16 se revisaron por datos y por la miniatura de su textura.
- La lista de huesos que usa el código (47) sale de buscar los nombres en `character.js` y `huevos.js`; no se ejecutó el juego.
