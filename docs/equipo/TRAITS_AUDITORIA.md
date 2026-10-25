# Auditoría de traits en la cotorra (24 oct 2026)

**Hecha por:** el artista de traits. **Método:** cada pieza puesta en Vittata dentro del juego real
(`localhost:8765`, `AVCharacter.create` + `applyLook`, con un WebGLRenderer propio). Para cada pieza hay una lámina de
frente, lado, 3/4 y espalda en Idle, más Walk, dance y swim. La holgura con el cuerpo se midió con la piel calculada por
CPU (`RF.clearance` y `RF.sweep`, 5 instantes por animación). Las láminas están en `tests/out/aud_*.png` (antes) y
`tests/out/v2_*.png` (después). La lámina final es `docs/img/traits_final.png`.

**Puntuación:** P/S/D/C = proporción, silueta, detalle y choques, de 1 a 5. Las piezas con 4 o más quedaron como
estaban.

| Pieza | Antes P/S/D/C | Problema | Después | Cambio |
|---|---|---|---|---|
| gorra | 4/4/4/5 | — (estilo pr: bandera envuelta en la copa) | 4/4/5/5 | Parche BANDERA 3:2 de 11 × 7,3 cm al frente, solo visible con el estilo pr |
| gorra_reves | 3/3/4/5 | La copa flotaba alta y pequeña | 4/4/4/5 | El borde baja por los lados como la gorra normal |
| gorra_trucker, pava, sombrero paja/tropical/vaquero, cascos (3) | 4/4/4/5 | — | = | Sin cambios |
| sombrero_pescador | 3/3/4/5 | El ala caía 8,5 cm y tapaba los ojos | 4/4/4/5 | Base 1 cm más alta, copa −10 %, ala 3,5 cm al frente y 7 cm atrás |
| lentes_sol | 4/4/3/5 | Patillas de 1,1 cm que de lejos desaparecían | 4/4/4/5 | Montura de 1,6 cm, patilla de Ø 1,7 cm y bisagra mayor |
| lentes_redondas | 4/3/2/5 | Aro de alambre (0,7 cm), invisible | 4/4/4/5 | Aro de Ø 1,3 cm y patilla de Ø 1,1 cm |
| lentes_deportivas | 4/4/4/5 | — | = | Sin cambios |
| lentes_buceo | 4/4/3/5 | El snorkel parecía una pajita | 4/4/4/5 | Tubo de Ø 3,2 cm con remate, boquilla y clip más grandes |
| panuelo (TA) | 4/4/4/4 | 6 172 triángulos (supera los 6 000) | 4/4/4/4 | Diseño intacto. Forma 'camisa' regenerada sobre la camisa nueva: Idle +1 mm y Walk +2 mm; dance y swim, roces de −11 mm que no se ven |
| camisa | 4/2/3/1 | Los costados seguían al ala: con las alas bajadas la tela entraba 16 cm y dejaba ver la piel; la cola atravesaba la espalda | 4/4/4/4 | Mangas pesadas al brazo solo sobre la axila; bajo de atrás en arco (+17 cm) sobre la cola; 5 632 triángulos (antes 13 824). Vértices dentro en Idle: de 784 a 33 (peor −2 cm, cara interior) |
| pantalon_corto | 4/4/4/3 | Pico de tela bajo el asiento al andar | 4/4/4/3 | Pesos por pierna, sin cola ni dedos. **Pendiente:** el pliegue en punta sigue en Walk (ver abajo) |
| pantalon_largo | 2/3/4/3 | Acababa en z 0,15 y se leía como otro corto | 4/4/4/4 | Bajo en el tobillo (z 0,07), sobre el eje del tarso; dobla con rodilla y tarso |
| botas aventura/constructor/militar/espacial/tenis | 3/3/3/4 | Pantuflas largas y planas, cordones finos | 4/4/4/4 | Puntera abombada, punta levantada, suelas de 2,4–3,2 cm, cordones Ø 6 mm. Caña de la militar más baja y abierta |
| botas_buzo | 4/3/3/3 | Aletas de papel, de 7 mm | 4/4/4/3 | Aletas de 11 mm con rieles gruesos y 2 cm más cortas. Al nadar la mano roza la aleta (−3,7 cm, un instante) |
| botas_tenis_pr | 3/4/3/5 | Estrellas sueltas, "media bandera" | 4/4/5/5 | Parche BANDERA 3:2 de 8,4 × 5,6 cm por fuera de cada zapatilla, que se lee bien desde fuera |
| botas_chancletas | 4/4/4/5 | — | 4/4/4/5 | Suela y tira algo más gruesas |
| equipo_mochila_pr | 2/3/3/2 | De juguete (40 % de la espalda); correas rígidas metidas 2 cm en el hombro | 4/4/5/4 | 0,31 × 0,29 × 0,17 m con ribete, parche BANDERA de 16 × 10,7 cm y correas con pesos de piel |
| equipo_cuatro | 3/4/4/3 | Pequeño; el clavijero tocaba la cabeza | 4/4/4/4 | ×1,04, más bajo y abierto a 46° |
| equipo_tanques | 2/3/4/2 | Botellas de juguete; correas y manguera dentro del hombro | 4/4/4/4 | Botellas de 0,27 × Ø 0,126 m; arnés y manguera con pesos de piel |
| equipo_jetpack | 2/3/4/2 | Pequeño; correas dentro del hombro | 4/4/4/4 | ×1,22; correas con pesos de piel |
| mano_bandera | 3/3/3/4 | Pequeña; en Idle quedaba horizontal con la cara oscura; triángulo y estrella atravesados por la onda | 4/4/5/4 | 22 × 33 cm (2:3) en asta de 0,69 m. Vertical hacia afuera, de cara a la luz, con ondulación suave. Triángulo y estrella pegados al paño por las dos caras, estrella con la punta arriba y colores de la guía |
| mano_martillo | 2/3/3/4 | Parecía de alambre | 4/4/4/4 | Mango de Ø 3,4 cm, cabeza de 5,2 cm y uña gruesa |
| mano_linterna | 3/4/4/4 | Pequeña | 4/4/4/4 | ×1,2 |
| mano_coqui | 3/4/4/5 | No se distinguía en la mano | 4/4/4/5 | ×1,4 |
| mano_maracas, mano_mapa | 4/4/4/4 | — | 4/4/4/4 | Tubos con 6 lados y sombreado suave a 75° (antes se veían facetados) |

**Límites:** todas las piezas quedan en ≤ 6 000 triángulos (la camisa bajó de 13 824 a 5 632; la más cargada es pantalon_largo,
con 5 808), salvo el pañuelo del TA (6 172, un 3 % por encima; queda para el TA). Pares de zapatos ≤ 9 240 y archivos ≤ 434 KB.

## Pendientes y pedidos
- **pantalon_corto:** al andar, cuando la pierna va atrás, sale un pliegue en punta bajo el asiento. Ya estaba antes.
  Probé pesos por lado, sin cola, tiro a la cadera y corto solo de muslo, y nada lo quita. Viene de la tela entre las
  piernas: el cuerpo de Vittata acaba a la altura de la rodilla (z≈0,22). Siguiente intento: rehacer el tiro con un
  refuerzo propio (gusset) en vez de la malla del rayo.
- **Choques que dependen de la animación (código del TA):** en dance, la bandera de mano cruza el pico (pedido abierto
  en `TRAITS_PEDIDOS.md`). Al nadar con equipo de espalda ya está resuelto con `SWIM_BACK_SHIFT`. Quedan roces leves
  de la cabeza con el canto de la mochila al bailar.
- **TRAITS_V2 (criadero):** P0 de modelos nuevos (binoculares, cuaderno de campo y lupa). Están sin empezar.
