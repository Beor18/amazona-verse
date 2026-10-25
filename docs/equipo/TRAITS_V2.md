# TRAITS_V2 · Catálogo integrado (ropero actual + lámina de Kelvin + criadero)

Referencias: lámina de traits de Kelvin (idea, no modelo), `src/personaje/wardrobe.js` y `character.js` (TA), `docs/ACCESSORY_CATALOG.md`, `content/comun/huevos.js`.

**¿Existe?**
- **sí:** la pieza ya está en el ropero.
- **estilo nuevo:** una entrada nueva en `styles` de una pieza existente (textura o variante procedural del TA); no hace falta modelo.
- **modelo nuevo:** el artista de traits la modela en Blender con su `_glb.js`.

**Etapa:** B bebé, J juvenil, A adulto. Al bebé solo le caben piezas pequeñas.

**Prioridad:**
- **P0:** criadero v1 y capítulo 1.
- **P1:** la siguiente iteración.
- **P2:** capítulos futuros.

**Reglas de todo el catálogo:**
- Todo se gana jugando. Nada aleatorio.
- Las piezas con la bandera de Puerto Rico nunca se venden (`docs/BANDERA_PR_GUIA.md`).
- Una tienda familiar opcional, solo de compra directa, puede vender a lo sumo variantes de color de piezas ya ganadas. Nunca vende cápsulas ni rarezas, y nunca aparece en modo escuela.

## Cabeza (`head`)
| Trait | Slot | ¿Existe? | Etapa | Cómo se gana | Prio |
|---|---|---|---|---|---|
| Sombrero explorador | head | sí (`sombrero`) | J A | Cápsula de nido · adulto | P0 |
| Gorra (clásica, PR, criolla, playera, hacia atrás, trucker) | head | sí (`gorra`) | J A | Ropa del cap1 (gorra PR: 4 animales del Diario) | P0 |
| Pava jíbara | head | sí (`pava`) | J A | "La ruta de la gota"; cápsula boricua · juvenil | P0 |
| Sombrero tropical, de paja, vaquero o pescador | head | sí (`sombrero2`) | J A | Cápsula tropical · juvenil (tropical) | P0 |
| Casco de constructor, marinero o pirata | head | sí (`casco`) | A | Hitos futuros de construcción | P1 |
| **Cascarón-gorro** | head (criadero) | modelo nuevo (hecho con primitivas en `criadero.js`) | B | Nacer: el pedazo blanco de su propio huevo | P0 |
| Casco espacial (burbuja) | head | modelo nuevo | B J A | Cápsula espacial · bebé | P1 |
| Sombrero futurista | head | modelo nuevo | A | Capítulo espacial | P2 |
| Casco de piloto (cuero, con orejeras) | head | modelo nuevo | J A | Misión de vuelo de un capítulo futuro | P2 |
| Gorro de buzo (neopreno) | head | estilo nuevo (`casco`) | J A | Bucear 3 pozas | P1 |
| Casco de dosel (biólogo trepador) | head | modelo nuevo | A | Lección de las capas del bosque (O1) | P1 |

## Ojos (`eyes`)
| Trait | Slot | ¿Existe? | Etapa | Cómo se gana | Prio |
|---|---|---|---|---|---|
| Gafas de inventor | eyes | sí (`gafas`) | J A | Por defecto; cápsula de nido · juvenil; doradas en la cápsula dorada · adulto | P0 |
| Lentes de sol, redondas, deportivas y máscara de buceo | eyes | sí (`lentes`) | B J A | Cápsula de playa (bebé: redondas; juvenil: buceo) | P0 |
| **Binoculares** | eyes | modelo nuevo | J A | Cápsula del bosque · juvenil. Hoy su respaldo son las lentes redondas | P0 |
| Gafas de aviador | eyes | estilo nuevo (`lentes`, lente de gota) | J A | Primer planeo largo | P1 |
| Monóculo | eyes | estilo nuevo (`lentes`, una lente con cadena) | A | Diario de cultura completo | P1 |
| **Visor solar** (gafas de eclipse) | eyes | estilo nuevo (`lentes`, banda) | J A | Cápsula de cristal · juvenil. Ficha: "nunca mires el Sol directamente" | P1 |
| Visor nocturno | eyes | modelo nuevo | A | Misión de noche (coquíes) | P2 |
| Gafas de esquí | eyes | estilo nuevo (`lentes`, marco de buceo sin tubo) | J A | Capítulo de montaña o nieve | P2 |
| Visor espacial | eyes | modelo nuevo (va con el casco) | A | Cápsula espacial · adulto | P2 |
| Gafas futuristas | eyes | estilo nuevo (`lentes`) | A | Capítulo espacial | P2 |

## Cuello (`neck`)
| Trait | Slot | ¿Existe? | Etapa | Cómo se gana | Prio |
|---|---|---|---|---|---|
| Pañuelo liso de 6 colores | neck | sí (`panuelo`) | B J A | Por defecto; nido (naranja), bosque (verde) | P0 |
| Pañuelo camuflaje | neck | sí (estilo `camuflaje`) | B J A | Hallazgos de fauna | P0 |
| Pañuelo caribeño | neck | sí (estilo `caribe`) | B J A | Cápsula tropical · bebé | P0 |
| Pañuelo coquí | neck | sí (estilo `coqui`) | B J A | Cápsula boricua · bebé | P0 |
| Pañuelo PR | neck | sí (estilo `pr`, bandera pequeña y completa) | J A | Hito de cultura. **Nunca a la venta** | P1 |
| Bufanda | neck | modelo nuevo | J A | Capítulo de montaña (bosque enano, frío) | P2 |

## Torso (`torso`, `chest`)
| Trait | Slot | ¿Existe? | Etapa | Cómo se gana | Prio |
|---|---|---|---|---|---|
| Camisa lisa, PR, hawaiana, guayabera, deportiva 787 o camuflaje | torso | sí (`camisa`) | J A | Ropa del cap1; hawaiana en la cápsula tropical · adulto; guayabera en la boricua · adulto | P0 |
| Chaleco explorador | torso | sí (estilo `chaleco`) | J A | Cápsula del bosque · adulto | P0 |
| Chaleco de inventor (bolsillos con herramientas) | torso | estilo nuevo (`camisa`) | J A | Reparar el transmisor (historia) | P1 |
| Uniforme de Guardián (de la historia, sin logos de agencias reales) | torso | estilo nuevo (`camisa`) | A | Terminar el capítulo 1 | P1 |
| Chaleco de anillador (biólogo de campo) | torso | estilo nuevo (`camisa`) | A | Liberar una cotorra | P1 |
| Bata de científico | torso | modelo nuevo (falda larga) | A | Todas las fichas de ciencia verificadas | P2 |
| Brújula colgante | chest | sí (`brujula`) | B J A | Cápsula de nido · adulto; dorada en la dorada · bebé | P0 |
| **Cristal colgante** | chest | modelo nuevo | B J A | Cápsula de cristal · bebé | P1 |
| Insignia de constelaciones | chest | modelo nuevo | A | Capítulo espacial | P2 |

## Espalda (`back`)
| Trait | Slot | ¿Existe? | Etapa | Cómo se gana | Prio |
|---|---|---|---|---|---|
| Mochila PR, cuatro, tanques o jetpack | back | sí (`equipo`) | J A | Playa · adulto (tanques); espacial · adulto (jetpack) | P0 |
| Mochila de exploración | back | modelo nuevo (hoy `mochila` es un sustituto) | J A | Visitar todos los lugares del mapa | P1 |
| Mochila de inventor | back | modelo nuevo | A | Reto de construcción | P1 |
| **Kit científico** (frascos de muestras de agua) | back | modelo nuevo | A | Cápsula de cristal · adulto (O3, ciclo del agua) | P1 |
| Tabla de surf | back | modelo nuevo | A | Cápsula de playa · adulto | P2 |
| Mochila-nido (lleva al pichón) | back | modelo nuevo | A | Tener dos crías | P2 |

## Mano (`hand`)
| Trait | Slot | ¿Existe? | Etapa | Cómo se gana | Prio |
|---|---|---|---|---|---|
| Bandera de PR, maracas, linterna, martillo, mapa o coquí de peluche | hand | sí (`mano`) | J A | Ropa del cap1; coquí en la cápsula boricua · adulto. La bandera de esa cápsula va en asta junto al nido (**nunca a la venta**) | P0 |
| **Cuaderno de campo** (libreta) | hand | modelo nuevo | J A | Cápsula del bosque · adulto. Hoy su respaldo es el mapa | P0 |
| **Lupa** | hand | modelo nuevo | B J A | Cápsula dorada · adulto; primera ficha de ciencia | P0 |
| Cámara | hand | modelo nuevo | J A | Primer cómic exportado | P1 |
| Pluviómetro | hand | modelo nuevo | A | "La ruta de la gota" en 5.º y 6.º (O3) | P1 |
| Pala de siembra y plántula nativa | hand | modelo nuevo | A | Lección de reforestación (yagrumo, O6) | P1 |
| Llave inglesa (herramientas) | hand | estilo nuevo (`mano`) | A | Reparar el transmisor | P1 |
| Cantimplora | hand | modelo nuevo | J A | Explorar el río completo | P1 |
| Antena de telemetría (radio) | hand | modelo nuevo | A | Liberación, cuando el DRNA valide el dato del radiotransmisor | P2 |
| Telescopio | hand | modelo nuevo | A | Capítulo espacial | P2 |
| Cuerda | hand | modelo nuevo | A | Casco de dosel | P2 |
| Red de muestreo de agua (nunca para atrapar animales) | hand | modelo nuevo | A | Kit científico | P2 |
| Cristal | hand | modelo nuevo | A | Cápsula de cristal | P2 |

## Alas, patas y especie
| Trait | Slot | ¿Existe? | Etapa | Cómo se gana | Prio |
|---|---|---|---|---|---|
| Brazaletes de constructor | wings | sí (`brazaletes`) | J A | Cápsula dorada · juvenil | P0 |
| Coderas | wings | estilo nuevo (`brazaletes`, acolchadas) | J A | Primer aterrizaje perfecto | P1 |
| Protectores de ala | wings | estilo nuevo (`brazaletes`) | A | Capítulo de vuelo | P2 |
| **Anillo de anillamiento científico** | patas (criadero, hueso `pieL3`) | modelo nuevo (hecho con primitivas en `criadero.js`) | A | Toda cría adulta, con el color de su cápsula. Ficha: así se identifica a cada ave | P0 |
| Pantalón corto, de playa, cargo, militar o mezclilla | legs | sí (`pantalon`) | J A | Ropa e hitos | P0 |
| Pantalón con rodilleras | legs | estilo nuevo (`pantalon`) | A | Reto de construcción | P2 |
| Calzado (8 estilos, tenis PR incluidos) | feet | sí (`botas`) | J A | Playa · adulto (buzo); espacial · juvenil; tropical · adulto (chancletas) | P0 |
| Botas de lluvia | feet | estilo nuevo (`botas`) | J A | Capítulo de El Yunque (bosque pluvial, O3) | P1 |
| **Plumón** | piel (criadero, cascarones) | hecho en `criadero.js` | B J | Etapa (bebé con 4 capas, juvenil con 2) | P0 |
| Plumón por cápsula (musgo, arena, destellos, dorado, iridiscente) | piel | estilo nuevo (color en `huevos.js`) | B | Su cápsula | P1 |
| Especies de *Amazona* (hay 8; la lámina pide 34) | especie (máscara de color) | estilo nuevo (`SPECIES`, sin modelo) | todas | Ficha de cada especie en el Diario; colores validados con fuente | P2 |

## Pedido al artista de traits (P0 nuevos)
1. Binoculares (eyes).
2. Cuaderno de campo (hand).
3. Lupa (hand).

El cascarón, el anillo y el plumón ya están hechos con primitivas en el criadero. Si el artista los modela en Blender, el criadero los cambia por su `_glb.js` sin tocar los datos.
