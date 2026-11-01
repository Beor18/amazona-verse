# Auditoría de edificios · 1-nov-2026 (solo lectura)

Revisión de los 64 modelos de `assets/models/edificios/kit.js` en sus tres versiones (ligero, `_hd`, `_lejos`): 190 archivos, todos cargan. Render con three r128, `GLTFLoader` y meshopt del repo, y con el **material real del juego**: `material()` de `src/engine/streaming.js` (crema, paleta de madera y teja, atlas `_hd`), más `look.js` en `vibrant_toon`. Swiftshader, 3 ángulos por versión, con la misma escala en las tres filas. La cuarta columna es una pasada de caras: rojo = se ve la cara trasera (un hueco o una normal al revés).

Repo en `c2e9b35`. No se tocó nada del repo.

## Los edificios que siguen rotos (gravedad alta)

**1. Restauración Kimi: el ligero es otro edificio.** Los 18 modelos tienen un ligero (y, en los templos, también el HD) hecho con la plantilla paramétrica de Kimi. El HD y el lejano de las ruinas siguen siendo el original de KitBash. El juego usa el ligero para **todas las colisiones** y lo dibuja mientras baja el HD. En las torres chicas (radio < 10 m) también lo dibuja entre la distancia de LOD y la del HD: de 60 a 120 m en calidad alta. Al acercarse, el edificio cambia de forma dos veces, y Vittata choca con paredes que no se ven.
- `muro_templo` (8 en el Yunque): el ligero es un bloque macizo de 15,8 × 5,6 × 17,4 m y el HD un muro reticulado. La colisión es un bloque donde se ve un muro con huecos.
- `ruina_altar` (pirámide frente a arco redondo), `ruina_portal` (pórtico frente a arco dentado), `ruina_mirador` (caja con columnas frente a arco-puente) y `ruina_pilar` (columna clásica frente a poste).
- `ruina_torre_b`, `_c`, `_e` y `_f`: las cuatro tienen **el mismo ligero de 316 tris**, solo escalado. El HD y el lejano son cuatro torres distintas (lisa, prisma, troncocónica, cilindro).
- Los 9 templos (`templo_grande`, `_a`, `_d`, `_e`, `_f`; `templo_mediano`, `_f`, `_g`, `_h`): ligero y HD son la misma caja escalonada genérica, de aspecto básico. Los 4 medianos tienen el mismo ligero de 432 tris. El lejano es la silueta original de torres de KitBash: en calidad baja y media, de lejos se ve otro templo. Las tapas de las plataformas tienen la cara al revés (40–50 % de cara trasera visible; el material doble cara lo disimula).

**2. HD boca abajo (eje vertical invertido).** Son `_hd` del lector `.max` (26-oct): la lona, el techo o la choza cuelgan por debajo, y las rocas quedan abiertas por arriba.
- `corral`, `campamento_a` y `monumento_b`. QA-71 los había apagado; el commit `4c844b3` («Mantener activo el HD de los templos originales», 1-nov) volvió a poner `hd: true` en todo el kit y los reactivó.
- `monumento_d`, `monumento_e`, `monumento_g`, `muro_roca` (9 instancias) y `tienda_pequena`: ya estaban activos así desde el 26-oct.

**3. Ligero incompleto, con piezas flotando.**
- `carpa_b` (4 instancias): el ligero y el lejano no tienen techo; solo queda el muro de tablas y una pieza alta flotando. El HD sí está completo.
- `monumento_b` y `monumento_d`: el ligero y el lejano son un anillo con el 77–95 % de las aristas abiertas y una plataforma flotando sin soportes.

**4. La Ciudad de los 36 (`complejo_ruinas`).**
- El lejano está roto: una mancha girada de 30,9 × 38,7 × 20,3 m donde la ciudad mide 59 × 27 × 39 m (17 m de diferencia). Viene de BM105 (`ba0b2d8`) y se ve en calidad baja y media.
- De cerca sigue BM98: decimación, con el 45–50 % de aristas abiertas y cientos de piezas sueltas.

**Otros hallazgos que afectan a todo el kit:**
- `kit.js` **no lleva `restaurado: true`** en ningún modelo, aunque `docs/EDIFICIOS.md` dice que sí. Tampoco está en `7847993`: nunca entró. En los 18 restaurados, `tris` y `mats` siguen siendo los de antes. Por ejemplo, `templo_mediano` declara 3906 tris y tiene 432.
- Los `_hd` «originales» de TransferNow (`campamento_c`, `carpa_a`, `carpa_e`, `carpa_f`, `toldo_pequeno` y todas las `ruina_*`) tienen materiales con nombres como `Fabric_KB3D_TarpFabricDamaged_diffuse`. `streaming.js` no los reconoce, así que salen sin la paleta del juego: lona **marrón oscura** junto al salmón del ligero y piedra ocre en vez de crema (`ruina_torre_c`). Además usan de 3 a 7 materiales, es decir, de 3 a 7 draw calls por instancia en vez de 1. Eso contribuye a los 222 draw calls de las ruinas del Yunque.
- En esos 5 modelos de lona, el `_lejos` no se regeneró: es más chico o de otra pieza (diferencia de caja de 1 a 4,6 m).
- Texturas: no hay ninguna que falte, ni magentas, blancas planas o negras. Las de más de 1024 px son solo los 4 atlas `tex_hd/*.jpg` de 4096, que es lo previsto. Las 62 de `tex_original/` son de 1024 (lo de lookTest, 313 MB, es por la cantidad, no por el tamaño). `AV_Restaurado_Huecos` (sin mapa, marrón casi negro) es intencional: puertas y ventanas. Los `AV_Lejos` sin mapa usan color de vértice, que es lo previsto.

## Cómo leer la tabla
- Los tris son los medidos en el archivo, no los de `kit.js`.
- La gravedad cuenta lo que ve el jugador: alta = se ve roto, otro edificio o una colisión equivocada; media = color o lejano mal; baja = solo en el lejano y poco visible.
- Métricas completas por versión (caja, componentes, aristas abiertas, piezas sueltas, % de cara trasera por vista, texturas): `datos/<id>.json`. Hojas: `hojas/<id>.png`.

## Tabla de los 64 modelos

| id | restaurado (Kimi) | tris ligero | tris HD | tris lejano | problemas | gravedad |
|---|---|---|---|---|---|---|
| campamento_a | no | 702 | 34.036 | 131 | HD boca abajo (la lona queda debajo de la plataforma, 68 % trasera visible) y sogas que lo ensanchan a 8,9 m (Δcaja 2,9 m). Reactivado el 1-nov (QA-71 lo había apagado). | alta |
| carpa_b | no | 925 | 188.504 | 224 | Ligero y lejano sin techo: solo queda el muro de tablas y una pieza alta flotando. El HD (188 504 tris) sí trae la casa completa. 4 instancias. | alta |
| complejo_ruinas | no | 15.190 | 41.179 | 4440 | La Ciudad de los 36. Lejano roto (BM105, ba0b2d8): mancha girada de 30,9 × 38,7 × 20,3 m frente a 59 × 27 × 39 m (Δcaja 17 m); se ve en calidad baja y media. Cerca: BM98 (decimado; 50 % aristas abiertas en el ligero, 45 % en el HD, cientos de piezas sueltas). | alta |
| corral | no | 4017 | 253.910 | 467 | HD boca abajo (eje vertical invertido: la lona cuelga bajo la cerca, 36 % trasera visible). Estaba apagado por QA-71 y el commit 4c844b3 (1-nov) lo volvió a activar. | alta |
| monumento_b | no | 1588 | 136.457 | 384 | HD boca abajo (el techo cónico cuelga debajo). El ligero y el lejano están incompletos: anillo con 95 % de aristas abiertas y la parte alta flotando. Reactivado el 1-nov. | alta |
| monumento_d | no | 1905 | 322.423 | 459 | HD boca abajo (la plataforma queda arriba sobre pilares y el anillo colgando). Ligero y lejano: plataforma flotando sin soportes, 77 % aristas abiertas, 45 % trasera visible. HD activo desde el 26-oct. | alta |
| monumento_e | no | 3198 | 140.900 | 539 | HD boca abajo (rocas abiertas por arriba, techo de lona en el suelo). Activo desde el 26-oct. | alta |
| monumento_g | no | 2864 | 203.558 | 570 | HD boca abajo (la choza y la escalera cuelgan debajo; rocas abiertas arriba). Activo desde el 26-oct. | alta |
| muro_roca | no | 871 | 34.140 | 175 | HD boca abajo (las rocas se afinan hacia abajo y quedan abiertas arriba: 22 % trasera visible desde arriba). 9 instancias. | alta |
| muro_templo | sí | 180 | 84.288 | 1634 | Ligero (Kimi, 180 tris) = bloque macizo de 15,8 × 5,6 × 17,4 m; HD y lejano = muro reticulado abierto (84 288 tris). La colisión sale del bloque: Vittata choca con aire en los huecos del muro. 8 instancias en las ruinas del Yunque. | alta |
| ruina_altar | sí (HD TransferNow) | 88 | 4108 | 1224 | Ligero (Kimi) = pirámide escalonada con ídolo; HD y lejano = arco redondo con escalera: otro edificio. Colisión ≠ lo que se ve; cambia de forma al acercarse. | alta |
| ruina_mirador | sí (HD TransferNow) | 292 | 1916 | 2314 | Ligero (Kimi) = caja sobre 4 columnas; HD y lejano = arco/puente curvo. Colisión ≠ lo que se ve. HD con Δcaja 0,39 m (QA-71 sigue). 10 instancias. | alta |
| ruina_pilar | sí (HD TransferNow) | 100 | 740 | 474 | Ligero (Kimi) = columna clásica; HD y lejano = poste con muescas. Fuste del ligero con normales hacia dentro (40 % trasera visible). 12 instancias. | alta |
| ruina_portal | sí (HD TransferNow) | 212 | 4032 | 2878 | Ligero (Kimi) = pórtico rectangular; HD y lejano = arco dentado. 7 instancias. HD con 7 materiales (7 draw calls). | alta |
| ruina_torre_b | sí (HD TransferNow) | 316 | 1086 | 1140 | Ligero (Kimi) = torre con puerta y cornisas, plantilla de 316 tris idéntica a _c, _e y _f (solo cambia la escala); HD y lejano = torre lisa con aspillera. 12 instancias. | alta |
| ruina_torre_c | sí (HD TransferNow) | 316 | 9006 | 2162 | Ligero = la misma plantilla Kimi de 316 tris; HD = prisma ocre oscuro (textura original sin la crema del juego); lejano retorcido (30 % trasera visible, 1,3 m más bajo). | alta |
| ruina_torre_e | sí (HD TransferNow) | 316 | 4632 | 1380 | Ligero = plantilla Kimi de 316 tris; HD y lejano = torre troncocónica con cornisas: otra forma. | alta |
| ruina_torre_f | sí (HD TransferNow) | 316 | 10.020 | 1740 | Ligero = plantilla Kimi de 316 tris (prisma con puerta); HD y lejano = cilindro: otra forma. 3 instancias en la ciudad. | alta |
| templo_grande | sí | 2340 | 15.638 | 8016 | Ligero y HD son la plantilla genérica de Kimi (bloque escalonado, aspecto básico); el lejano es la silueta original de KitBash: de lejos es otro edificio. Tapas de las plataformas con la cara al revés (≈40 % de cara trasera visible; el material doble cara lo disimula). 5 draw calls por instancia. HD = ligero + almenas y ventanas (las almenas quedan sueltas sobre el techo). | alta |
| templo_grande_a | sí | 884 | 11.846 | 8456 | Ligero y HD son la plantilla genérica de Kimi (bloque escalonado, aspecto básico); el lejano es la silueta original de KitBash: de lejos es otro edificio. Tapas de las plataformas con la cara al revés (≈40 % de cara trasera visible; el material doble cara lo disimula). 5 draw calls por instancia. El lejano además está deshecho (piezas sueltas, Δcaja 2 m). | alta |
| templo_grande_d | sí | 1612 | 12.686 | 5278 | Ligero y HD son la plantilla genérica de Kimi (bloque escalonado, aspecto básico); el lejano es la silueta original de KitBash: de lejos es otro edificio. Tapas de las plataformas con la cara al revés (≈40 % de cara trasera visible; el material doble cara lo disimula). 5 draw calls por instancia. El lejano está deshecho (masa fundida). | alta |
| templo_grande_e | sí | 1740 | 17.958 | 9434 | Ligero y HD son la plantilla genérica de Kimi (bloque escalonado, aspecto básico); el lejano es la silueta original de KitBash: de lejos es otro edificio. Tapas de las plataformas con la cara al revés (≈40 % de cara trasera visible; el material doble cara lo disimula). 5 draw calls por instancia. Lejano 4,2 m más largo (Δcentro 2,2 m). | alta |
| templo_grande_f | sí | 988 | 10.118 | 9542 | Ligero y HD son la plantilla genérica de Kimi (bloque escalonado, aspecto básico); el lejano es la silueta original de KitBash: de lejos es otro edificio. Tapas de las plataformas con la cara al revés (≈40 % de cara trasera visible; el material doble cara lo disimula). 5 draw calls por instancia. | alta |
| templo_mediano | sí | 432 | 7716 | 5150 | Ligero y HD son la plantilla genérica de Kimi (bloque escalonado, aspecto básico); el lejano es la silueta original de KitBash: de lejos es otro edificio. Tapas de las plataformas con la cara al revés (≈40 % de cara trasera visible; el material doble cara lo disimula). 5 draw calls por instancia. Los 4 templos medianos tienen el mismo ligero de 432 tris. | alta |
| templo_mediano_f | sí | 432 | 7892 | 5008 | Ligero y HD son la plantilla genérica de Kimi (bloque escalonado, aspecto básico); el lejano es la silueta original de KitBash: de lejos es otro edificio. Tapas de las plataformas con la cara al revés (≈40 % de cara trasera visible; el material doble cara lo disimula). 5 draw calls por instancia. Mismo ligero que templo_mediano. | alta |
| templo_mediano_g | sí | 432 | 5348 | 5144 | Ligero y HD son la plantilla genérica de Kimi (bloque escalonado, aspecto básico); el lejano es la silueta original de KitBash: de lejos es otro edificio. Tapas de las plataformas con la cara al revés (≈40 % de cara trasera visible; el material doble cara lo disimula). 5 draw calls por instancia. Mismo ligero que templo_mediano. | alta |
| templo_mediano_h | sí | 432 | 7716 | 8642 | Ligero y HD son la plantilla genérica de Kimi (bloque escalonado, aspecto básico); el lejano es la silueta original de KitBash: de lejos es otro edificio. Tapas de las plataformas con la cara al revés (≈40 % de cara trasera visible; el material doble cara lo disimula). 5 draw calls por instancia. Mismo ligero que templo_mediano. 6 instancias. | alta |
| tienda_pequena | no | 942 | 47.196 | 217 | HD boca abajo: la tienda es una V (82 % trasera visible). | alta |
| campamento_c | no (HD TransferNow) | 1375 | 3282 | 332 | HD original de TransferNow: lona marrón rojiza (sin la paleta del juego) frente al salmón del ligero. Lejano no regenerado: 3,1 × 1,4 × 2,4 m frente a 5,5 × 2,4 × 5,9 m. | media |
| carpa_a | no (HD TransferNow) | 1041 | 2380 | 251 | HD original: lona marrón rojiza (sin paleta). Lejano más pequeño (Δcaja 1,9 m). HD con 5 draw calls. | media |
| carpa_e | no (HD TransferNow) | 1411 | 3282 | 341 | HD original: lona marrón oscura (sin paleta). Lejano con otra forma (Δcaja 1,9 m). 17 instancias. | media |
| carpa_f | no (HD TransferNow) | 1411 | 3282 | 341 | HD original: lona marrón oscura. Lejano de otra pieza: 6,6 × 3,8 × 5,1 m frente a 11,6 × 5 × 12,3 m (Δcaja 4,6 m). | media |
| carpa_g | no | 1038 | — | 246 | Patas del ligero en trozos sueltos bajo la lona; sin HD (por decisión documentada); lejano 2,6 m más chico. | media |
| casa_plataforma | no | 3568 | 15.694 | 513 | Lejano deshecho (palos sueltos, 28 % trasera visible, Δcaja 1,9 m). | media |
| mirador_escalonado | no | 3685 | 12.143 | 456 | Lejano = cono salmón sin el andamio (Δcaja 2 m). | media |
| monumento_a | no | 4397 | 28.119 | 542 | Lejano sin la mitad de arriba: 9 m de alto frente a 17 m (Δcaja 8,2 m). Ligero y HD bien. | media |
| monumento_c | no | 3705 | 24.509 | 577 | Ligero con 45 % aristas abiertas y 113 piezas flotando; HD 1,2 m más estrecho que el ligero (QA-71: apagado antes, reactivado el 1-nov). | media |
| ruina_torre | no (HD TransferNow) | 1924 | 7250 | 2330 | No es de los 18 (Fernando la devolvió a la original con su cavidad). Ligero, HD y caja coinciden. El lejano está deformado (cuerpo retorcido, 1,15 m más bajo, 14 % normales invertidas). | media |
| toldo_pequeno | no (HD TransferNow) | 1176 | 3282 | 285 | HD original: lona marrón oscura. Lejano más pequeño (Δcaja 1 m). 13 instancias. | media |
| bohio_puntiagudo | no | 3269 | 7384 | 586 | Lejano 2,6 m más chico (perdió los palos laterales). | baja |
| caney_largo | no | 1936 | 17.060 | 450 | HD con 18 % de normales al revés respecto al giro (sin efecto visible con doble cara). | baja |
| casa_paja_b | no | 3503 | 8226 | 550 | Lejano con 23 % trasera visible. | baja |
| cercado_redondo | no | 2957 | 8376 | 572 | Lejano con 39 % trasera visible (palos sueltos). | baja |
| empalizada | no | 1008 | 7384 | 248 | Lejano con huecos (faltan estacas, Δcaja 1,3 m). | baja |
| monumento_f | no | 2736 | 38.160 | 511 | Ligero con 50 % aristas abiertas; lejano deshecho. HD correcto. | baja |
| muelle_troncos | no | 1008 | — | 248 | Sin HD; lejano con troncos que faltan. | baja |
| muralla_atalaya_a | no | 4171 | 10.012 | 510 | Lejano deshecho (láminas sueltas, 18 % trasera visible). | baja |
| portal_madera_a | no | 4110 | 7938 | 576 | Lejano con 18 % trasera visible. | baja |
| portal_madera_c | no | 3298 | 10.008 | 586 | Lejano con huecos (Δcaja 0,9 m). | baja |
| portal_puas | no | 2732 | 9247 | 543 | Lejano con 23 % trasera visible. | baja |
| torre_vigia | no | 4452 | 11.788 | 560 | Lejano con el barril abierto (43 % trasera visible, Δcaja 1,7 m). | baja |
| bloque_piedra | no (HD TransferNow) | 12 | 12 | 12 | Sin problemas visibles. Ligero, HD y lejano coinciden. | — |
| bohio_redondo | no | 3282 | 6388 | 590 | Sin problemas visibles. Ligero, HD y lejano coinciden. | — |
| campamento_f | no | 921 | 66.500 | 216 | Sin problemas visibles. Ligero, HD y lejano coinciden. | — |
| canoa | no (HD TransferNow) | 432 | 108 | 104 | Sin problemas visibles. Ligero, HD y lejano coinciden. | — |
| carpa_c | no | 882 | 66.806 | 209 | Sin problemas visibles. Ligero, HD y lejano coinciden. | — |
| carpa_d | no | 1054 | 47.202 | 254 | Sin problemas visibles. Ligero, HD y lejano coinciden. | — |
| casa_paja_a | no | 3480 | 7868 | 558 | Sin problemas visibles. Ligero, HD y lejano coinciden. | — |
| losa_piedra | no (HD TransferNow) | 12 | 12 | 12 | Sin problemas visibles. Ligero, HD y lejano coinciden. | — |
| muralla_atalaya_b | no | 3165 | 7883 | 580 | Sin problemas visibles. Ligero, HD y lejano coinciden. | — |
| plataforma_piedra | no (HD TransferNow) | 12 | 12 | 12 | Sin problemas visibles. Ligero, HD y lejano coinciden. | — |
| portal_madera_b | no | 4607 | 10.170 | 583 | Sin problemas visibles. Ligero, HD y lejano coinciden. | — |
| puente_madera | no | 3237 | 21.345 | 591 | Sin problemas visibles. Ligero, HD y lejano coinciden. | — |
| torre_vigia_b | no | 3463 | 12.592 | 565 | Sin problemas visibles. Ligero, HD y lejano coinciden. | — |

## Archivos
- `hojas/<id>.png`: una hoja por modelo (64). Filas: ligero / HD / lejano; columnas: frente, 3/4 desde arriba, lado y pasada de caras.
- `peores.png`: los 10 peores (ligero | HD | lejano | caras).
- `datos/<id>.json`: métricas; `estructura.json`: materiales, texturas y generador de cada archivo.
- `render.html` + `run.js`: el banco de render (reutilizable: `NODE_PATH=$(npm root -g) node run.js todos`). `volteo.js` detecta los HD boca abajo.
- `juego/`: el intento de captura dentro del juego (build de HEAD en `build/`) quedó sin terminar: la cámara salió a ras del agua y cada vista tardaba unos 7 minutos con swiftshader. Queda pendiente, con GPU real.

## Límites de esta auditoría
- Swiftshader, no GPU real; sin medir FPS.
- El lejano se pinta con el material `AV_Lejos` de color de vértice, sin el recoloreado `piedraLejos`/`techar`/`lonar` de `streaming.js` (no exportado): el color del lejano no es exacto, la forma sí.
- «Piezas flotando» y «aristas abiertas» son métricas automáticas: en lonas, sogas y empalizadas hay muchas legítimas. Para la gravedad se usaron las hojas, no los números solos.
