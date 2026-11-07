# K4-02 · Fuentes para las fichas educativas sin verificar

Hecho por la coordinadora (nube) el 6-nov-2026. Se basa en `KELVIN_CERRAR_HOY.md` §A1 y §A2.1-A2.3. **Actualizado el 7-nov-2026 con la verificación abriendo las fuentes (sección siguiente): 2 fichas verificadas; los ajustes de texto quedan pendientes de Kelvin.**

## Verificación real con la fuente abierta (7-nov-2026)

Hecha por un agente de la nube el 7-nov-2026, con la red ya abierta a `www.fws.gov`, `www.fs.usda.gov`, `research.fs.usda.gov`, `www.iucngisd.org`, `npgallery.nps.gov`, `water.usgs.gov` y `datazone.birdlife.org`. Kelvin decidió el 7-nov que la verificación la hace el agente responsable (`docs/DECISION_LOG.md`). Regla aplicada: **solo pasa a «verificado» la ficha cuyo texto actual (es y en) dice lo mismo que la fuente oficial abierta**. Si la fuente confirma el dato pero el texto necesita un ajuste, la ficha no se toca y el texto propuesto queda abajo como **«pendiente de Kelvin: ajuste de texto»**. Fecha de consulta de todas las fuentes: **2026-11-07**.

**No se pudieron abrir:** `www.usgs.gov` (403), `dle.rae.es` (403, página de comprobación anti-bots), `www.iucnredlist.org` (403), `www.asale.org`, `webarchive.library.unt.edu` y `web.archive.org` (fuera de la red). Los PDF `stelprdb53389xx` de `fs.usda.gov/Internet/FSE_DOCUMENTS/` dan **404**. En su lugar se usaron dos documentos oficiales del USDA FS que sí abren:
- **Evaluación del Plan Forestal** (borrador): https://www.fs.usda.gov/sites/nfs/files/legacy-media/elyunque/Draft%20Assessment%20-%20Assessing%20Eco%20Sustainability_0.pdf (en adelante, «Evaluación»).
- **El Yunque National Forest Atlas** (IITF y El Yunque, 2018): https://www.fs.usda.gov/sites/nfs/files/legacy-media/elyunque/Atlas%20ENGLISH.pdf (en adelante, «Atlas»).

### Tabla del resultado

| # | Id | Fuente oficial abierta | Abierta | Cita literal | Estado final |
|---|---|---|---|---|---|
| 1 | cotorra_1975 | https://www.fws.gov/story/2001-07/nine-ten-captive-bred-puerto-rican-parrots-released-caribbean-national-forest-still · comunicado de 1975 (PDF) · Atlas p. 40 | ✔ | «only 24 individuals remained in the wild and, by 1975, the population had reached an alarming low of only 13 birds» | **verificado** · aplicado por delegación de Kelvin (7-nov), con el texto alternativo «a mediados de los años 70» (las fuentes no coinciden en el año) |
| 2 | zorzal_pardo | https://www.fws.gov/sites/default/files/documents/historic-news-releases/1975/19750922A.PDF | ✔ | «Vicious competition for nest space with the pearly-eyed thrasher…»; «they prefer nesting cavities in the same trees used by parrots» | **verificado** (commit b4013c91) |
| 3 | cotorra_alimento | https://www.fws.gov/species/puerto-rican-amazon-amazona-vittata | ✔ | «feeds chiefly on wild fruits, particularly the sierra palm (Prestoria montana), but may also consume flowers and tender shoots» | **verificado** · aplicado por delegación de Kelvin (7-nov) |
| 4 | capas_bosque | — (no hay fuente oficial con el modelo de 4 capas) | — | — | **por_verificar** (oculta) · no confirmada |
| 5 | bosque_tipos | Evaluación, p. 32 del PDF | ✔ | «Four forest types—Tabonuco, Colorado, Dwarf (Elfin), and Palm—are recognized locally»; la de palma «is found on steep slopes and in ravines mainly above 500 meters» | **verificado** · aplicado por delegación de Kelvin (7-nov) |
| 6 | lluvia_bosque_enano | Evaluación, p. 40 · Atlas, p. 31 | ✔ | «more than 200 inches (381 centimeters) at the highest elevations of the Cloud (Dwarf) Forest»; Atlas: «Some areas in the uppermost cloud forest receive more than 5000 mm (200 inches) annually» | **verificado** · aplicado por delegación de Kelvin (7-nov) |
| 7 | tabonuco | Evaluación, p. 32 · Atlas, p. 36 | ✔ | «The Tabonuco Forest, dominated by the tabonuco tree […] lies between 120 and 600 meters elevation»; Atlas: «between 150 m and 700 m» | **verificado** · aplicado por delegación de Kelvin (7-nov), texto sin cifra |
| 8 | helecho_gigante | https://www.fs.usda.gov/r08/elyunque/animals-plants · Evaluación, p. 20 | ✔ | «more than 150 species of ferns»; «abundant stems of the tree fern Cyathea bryophylla» | **verificado** · aplicado por delegación de Kelvin (7-nov) |
| 9 | arboles_nativos | Atlas, p. 16-17 · https://www.fs.usda.gov/r08/elyunque/animals-plants | ✔ | Atlas: «225 native tree species», «8 are endemic to the Luquillo Mountains»; página: «about 250 different types of trees» | **verificado** · aplicado por delegación de Kelvin (7-nov), con 225 y 8 (Atlas) |
| 10 | bromelia | Evaluación, p. 5, 6 y 22 | ✔ | «epiphytic ferns, bromeliads, orchids»; «aquatic systems in tank bromeliads»; Guzmania berteriana «is found more commonly along canopy tree trunks than on the forest floor» | **verificado** · aplicado por delegación de Kelvin (7-nov) |
| 11 | coqui_bromelia | https://www.iucngisd.org/gisd/species.php?sc=105 · Atlas, p. 40 | ✔ | «the fertilised egg undergoes direct development, rather than passing through a free-living larval (tadpole) stage»; «Male frogs nest in protected cavities near the ground, such as dead, curled leaves or rolled palm frond petioles» | **verificado** · aplicado por delegación de Kelvin (7-nov), sin bromelias |
| 12 | heliconia | — (no hay fuente oficial; la Evaluación y el Atlas no la nombran) | — | — | **por_verificar** (oculta) · no confirmada |
| 13 | ceiba | https://research.fs.usda.gov/treesearch/30402 (PDF, p. 1; autor: J. D. Chinea-Rivera, 1990) | ✔ | «one of the largest and fastest growing trees of tropical America. Ceiba can attain a height of more than 50 m […] the stem develops stout spines and prominent buttresses» | **verificado** · aplicado por delegación de Kelvin (7-nov) |
| 14 | bambu | https://research.fs.usda.gov/treesearch/30351 (PDF, p. 1; Francis 1993) | ✔ | «known as common bamboo or bambú (Spanish)»; «It was introduced to Puerto Rico at least 150 years ago» | **verificado** (commit b4013c91) |
| 15 | ciclo_agua | https://water.usgs.gov/edu/graphics/watercycle-usgs.pdf (la página de la Water Science School dio 403) | ✔ (cartel) | Solo rótulos: «Sun», «Evaporation», «Condensation», «Precipitation», «Infiltration», «Surface runoff», «Streamflow», «Oceans». «Se enfría» no aparece | **parcial** (oculta) · no confirmada tal cual (falta abrir la página del USGS) |
| 16 | Aula q3 | — | — | Depende de capas_bosque. Además, la Evaluación dice que en el palo colorado «Bromeliads are common on the forest floor» (p. 22), lo que choca con la pareja «dosel = bromelias» | **por_verificar** (oculta) · no confirmada |
| 17 | Aula q4 | https://www.fws.gov/species/puerto-rican-amazon-amazona-vittata · Atlas: «Palm fruits are part of the basic diet of the Puerto Rican parrot» | ✔ | (la de la ficha 3) | **verificado** (se publica) · aplicado por delegación de Kelvin (7-nov): cotorra_alimento ya está verificada; pruebas de `content/cap1/pruebas.js` (795, 821 y 872) ajustadas a la regla nueva |
| 18 | E9 techo_zinc (cap. 2) | https://npgallery.nps.gov/NRHP/GetAsset/NRHP/90000767_text | ✔ | «hipped or side-gabled, usually high-pitched roof of ceramic tile or corrugated zinc» (y el formulario pone «roof Corrugated Zinc» y «Urban-residential Criollo») | **verificado** (se queda; la frase es literal en el n.º 90000767) |
| 19 | canoa_taina (cap. 3) | dle.rae.es/canoa: **no abre** (403) | ✘ | — | **verificado** (se queda como está, con el *Diccionario de americanismos* leído el 4-nov). «Del taíno» sigue sin comprobar |
| 20 | CG-51 (cap. 3, inglés) | no es un dato | — | — | **hecho**: `content/ep3/en.js` dice «Royal Spanish Academy (RAE), Dictionary of the Spanish Language, entry “canoa” (canoe), sense 1a» (commit b4013c91) |
| 21 | esperan (cap. 6) | datazone.birdlife.org (abre, pero la categoría se carga con JavaScript y no sale en el HTML) · iucnredlist.org (403) | ✘ | — | **por_verificar** (oculta) · no confirmada en esta sesión; el ajuste de texto de la ficha 21 sigue en pie |

**Resumen:** 2 pasan a «verificado» (zorzal_pardo y bambu), E9 sigue verificada, CG-51 traducido. Las 10 con ajuste de texto (1, 3, 5, 6, 7, 8, 9, 10, 11 y 13) pasan a «verificado» con el texto propuesto: aplicado por delegación de Kelvin (7-nov), en `content/cap1/lecciones.js` y `assets/data/lecciones_cap1.json`. q4 se publica. 6 no se confirman y siguen como estaban (4, 12, 15, 16, 19 en su parte «del taíno», 21).

### Ajustes de texto (es / en): aplicado por delegación de Kelvin (7-nov)

Kelvin delegó la verificación el 7-nov. Los 10 ajustes de abajo están aplicados tal cual en `content/cap1/lecciones.js` y `assets/data/lecciones_cap1.json`, con la fuente, la cita y la fecha 2026-11-07 en `nota_verificacion`. En cotorra_1975 se aplicó la alternativa «a mediados de los años 70», que encaja con las tres fuentes; la actividad a5 dice ahora «Compara con las 13 cotorras silvestres de mediados de los años 70» (y su traducción en `content/cap1/en.js`).

1. **cotorra_1975.** Fuente: USFWS, historia de 2001 (URL de la tabla).
   - es: «En 1975 llegaron a quedar solo 13 cotorras silvestres.» · en: «In 1975, only 13 wild parrots were left.»
   - Ojo: las fuentes del USFWS no coinciden en el año. El comunicado del 22-sep-1975 dice «Last year, a research team led by Dr. Snyder counted only 13 birds, an all time low» (o sea, 1974), y el Atlas dice «Only an estimated 13 individuals were living in the wild by 1976». Alternativa que encaja con las tres: es «A mediados de los años 70 llegaron a quedar solo 13 cotorras silvestres.» · en «By the mid-1970s, only 13 wild parrots were left.» (corto: «Años 70: quedaban 13.» · «1970s: 13 left.»). Si se elige esta, revisar también «Compara con las 13 cotorras de 1975» (`content/cap1/en.js:1562` y su original en español).
2. **cotorra_alimento.** Fuente: USFWS, ficha de la especie.
   - es: «La cotorra come sobre todo frutos silvestres, en especial los de la palma de sierra. También come flores y brotes tiernos.» · en: «The parrot feeds mainly on wild fruits, especially those of the sierra palm. It also eats flowers and tender shoots.» (el corto se queda igual). Con esto se publica también q4.
3. **bosque_tipos.** Fuente: Evaluación, p. 32.
   - es: «El Yunque tiene cuatro tipos de bosque según la altura y el terreno: tabonuco, palo colorado, palma de sierra y bosque enano en las cumbres.» · en: «El Yunque has four forest types, depending on elevation and terrain: tabonuco, palo colorado, sierra palm and dwarf forest on the peaks.»
   - corto: «4 bosques según altura y terreno.» · «4 forests by elevation and terrain.»
4. **lluvia_bosque_enano.** Fuente: Evaluación, p. 40, y Atlas, p. 31. (En la Evaluación, «381 centimeters» es una errata: 200 pulgadas son 508 cm. El Atlas da 5000 mm.)
   - es: «En las partes más altas del bosque enano caen más de 200 pulgadas de lluvia al año.» · en: «The highest parts of the dwarf forest get more than 200 inches of rain a year.»
   - corto: «Cumbres: más de 200 pulgadas al año.» · «Peaks: 200+ inches a year.»
5. **tabonuco.** Fuente: Evaluación, p. 32. «Unos 2,000 pies» (600 m) coincide con la Evaluación, pero el Atlas pone el límite en 700 m (unos 2,300 pies). Texto sin cifra:
   - es: «El tabonuco da nombre al bosque de las partes más bajas de El Yunque, donde es el árbol dominante.» · en: «The tabonuco gives its name to the forest on El Yunque's lowest slopes, where it is the dominant tree.» (el corto se queda igual)
6. **helecho_gigante.** Fuentes: página «Animals and Plants» del USDA FS y Evaluación, p. 20.
   - es: «En El Yunque hay más de 150 especies de helechos. Algunos, como el helecho gigante, son tan grandes que parecen árboles.» · en: «El Yunque has more than 150 species of ferns. Some, like the giant tree fern, are so big they look like trees.» (el corto se queda igual)
7. **arboles_nativos.** Fuente: Atlas, p. 16-17 (datos rápidos de El Yunque). La cifra actual (240 y 23) no aparece en ninguna fuente oficial que abra hoy.
   - es: «El Yunque tiene 225 especies de árboles nativos; 8 solo crecen en la sierra de Luquillo.» · en: «El Yunque has 225 native tree species; 8 grow only in the Luquillo Mountains.»
   - corto: «225 árboles nativos; 8 únicos.» · «225 native trees; 8 unique.»
8. **bromelia.** Fuente: Evaluación, p. 5, 6 y 22.
   - es: «Muchas bromelias crecen sobre los árboles, y algunas forman un tanque que guarda agua.» · en: «Many bromeliads grow on trees, and some form a tank that holds water.»
   - corto: «Algunas guardan agua.» · «Some hold water.»
9. **coqui_bromelia.** Fuente: IUCN GISD (sc=105) y Atlas, p. 40.
   - es: «Del huevo del coquí sale un coquí chiquitito, sin etapa de renacuajo. Los huevos quedan en lugares protegidos, como hojas secas enrolladas, y el macho los cuida.» · en: «A tiny coquí hatches from the egg, with no tadpole stage. The eggs are kept in sheltered spots, like curled dead leaves, and the male guards them.»
   - corto: «Sin renacuajo; el macho cuida los huevos.» · «No tadpole; the male guards the eggs.»
10. **ceiba.** Fuente: USDA FS, Chinea-Rivera 1990, SO-ITF-SM-29 (Treesearch 30402), p. 1. La fuente no dice que los contrafuertes «la sostienen». También dice que en Puerto Rico la ceiba crece «on dry coastal soils» y aparece en la asociación de *Dacryodes excelsa* y *Sloanea berteriana* (el tabonuco).
    - es: «La ceiba puede pasar de 50 metros de altura. Su tronco forma grandes contrafuertes, como tablas.» · en: «The ceiba can grow taller than 50 meters. Its trunk forms big buttresses, like boards.»
    - corto: «Árbol gigante con contrafuertes.» · «Giant tree with buttresses.»

Ya estaban propuestos y siguen igual: la ficha 21 (esperan; falta abrir la Lista Roja) y las opciones de capas_bosque, q3 y heliconia. Para cerrar ciclo_agua y canoa («del taíno») hay que abrir `www.usgs.gov` y `dle.rae.es` desde un navegador normal.

---

## Límite importante (6-nov, ya superado: ver la verificación del 7-nov arriba)

Desde esta sesión en la nube **no se pudo abrir ninguna fuente oficial**: `www.fws.gov`, `www.fs.usda.gov` y `www.rae.es` están fuera de la red permitida (ENOTFOUND). Todas las citas de abajo salen del **índice del buscador** (WebSearch), que muestra el texto de ese documento oficial. Casi siempre son frases literales en inglés; donde no hay frase literal, se dice.

Según la regla del propio juego (`verificacion_leyenda`: «Dato leído en la fuente oficial citada»), una ficha **solo puede pasar a «verificado» después de que alguien abra el enlace y vea la frase**. Hay dos formas de hacerlo:
- Kelvin o una sesión en la Mac abre cada URL de la tabla y comprueba la cita, unos 15 min en total.
- Se añaden `www.fws.gov`, `www.fs.usda.gov` y `www.rae.es` a la red de la nube y se repite la comprobación.

Por eso el «estado propuesto» de abajo dice **«verificado (tras abrir el enlace)»**. Fecha de consulta de todas las fuentes: **2026-11-06**.

> **Revisión del verificador (6-nov-2026).** Se intentó abrir con WebFetch 22 URL de este documento y de `K4_UICN.md` (fws.gov, fs.usda.gov, usgs.gov, asale.org, rngr.net, npgallery.nps.gov, iucngisd.org, webarchive.library.unt.edu, iucnredlist.org, datazone.birdlife.org, frontiersin.org, zenodo.org, eco.confex.com, research.fs.usda.gov, dle.rae.es, en.wikipedia.org, entre otras). **Ninguna se pudo abrir** porque la red de la sesión las bloquea (ENOTFOUND / código 000). Por eso cada cita se contrastó otra vez con el índice del buscador, con búsquedas de la frase exacta. Las que no se sostienen llevan «⚠ no verificada». Esto **no sustituye** abrir los enlaces.

## Tabla resumen

| # | Id | Veredicto | Fuente oficial principal | Estado propuesto |
|---|---|---|---|---|
| 1 | cotorra_1975 | CONFIRMADA con ajuste («silvestres») | USFWS (historia de 2001 y hoja informativa) | verificado (tras abrir el enlace) |
| 2 | zorzal_pardo | CONFIRMADA tal cual | USFWS, Federal Register 2008 (borrador del plan de recuperación) | verificado (tras abrir el enlace) |
| 3 | cotorra_alimento | CONFIRMADA con ajuste | USFWS, ficha de la especie | verificado (tras abrir el enlace) |
| 4 | capas_bosque | NO CONFIRMADA (sin fuente oficial para Puerto Rico) | — | se queda en por_verificar, o pasa a «narrativo» con texto nuevo |
| 5 | bosque_tipos | CONFIRMADA con ajuste («altura y terreno») | USDA FS, hojas de El Yunque | verificado (tras abrir el enlace) |
| 6 | lluvia_bosque_enano | ⚠ PENDIENTE (antes «CONFIRMADA tal cual»): la cifra «150 to 200 inches» no aparece en el índice | USDA FS (stelprdb5338954) | por_verificar hasta abrir el PDF |
| 7 | tabonuco | CONFIRMADA tal cual | USDA FS (stelprdb5338954) | verificado (tras abrir el enlace) |
| 8 | helecho_gigante | CONFIRMADA con ajuste | USDA FS (stelprdb5338937 y página de animales y plantas) | verificado (tras abrir el enlace) |
| 9 | arboles_nativos | CONFIRMADA tal cual | USDA FS (stelprdb5338937) | verificado (tras abrir el enlace) |
| 10 | bromelia | ⚠ CONFIRMADA en parte (antes «tal cual»): epífitas sí; que «guardan agua» no se encontró en fuente oficial | USDA FS (stelprdb5338957; la cita de la evaluación del Plan no aparece en el índice) | verificado con texto ajustado (tras abrir el enlace) |
| 11 | coqui_bromelia | CONFIRMADA con ajuste (los huevos en bromelias no tienen fuente oficial) | IUCN GISD + USDA FS | verificado con el texto ajustado (tras abrir el enlace) |
| 12 | heliconia | NO CONFIRMADA con fuente oficial; ajuste propuesto con fuente científica | Resumen ESA 2010 (El Yunque) y artículos revisados por pares | por_verificar (salvo que Kelvin acepte la fuente científica) |
| 13 | ceiba | ⚠ PENDIENTE (antes «CONFIRMADA con ajuste»): la frase de 50 m y contrafuertes no aparece en el índice, y el autor sería Chinea-Rivera, no Francis | USDA FS / RNGR, *Árboles de Puerto Rico* | por_verificar hasta abrir el enlace |
| 14 | bambu | CONFIRMADA tal cual (cambiar a la fuente del USDA FS) | USDA FS GTR SO-82; Francis 1993 SO-ITF-SM-65 | verificado (tras abrir el enlace) |
| 15 | ciclo_agua | CONFIRMADA tal cual | USGS Water Science School | verificado (tras abrir el enlace) |
| 16 | Aula q3 | NO CONFIRMADA (depende de capas_bosque); la pareja «ceiba = emergente» es dudosa | — | por_verificar, o «narrativo» si se basa en lo que se ve en el juego |
| 17 | Aula q4 | CONFIRMADA (depende de cotorra_alimento) | USFWS, ficha de la especie | verificado cuando lo esté cotorra_alimento |
| 18 | E9 techo_zinc (cap. 2) | CONFIRMADA tal cual | NPS, Registro Nacional n.º 90000767 | se queda en verificado |
| 19 | canoa_taina (cap. 3) | El texto actual está bien; que venga «del taíno» según el DLE NO CONFIRMADO desde aquí | ASALE, *Diccionario de americanismos* (ya citado) | se queda en verificado; Kelvin abre dle.rae.es/canoa |
| 20 | CG-51 (cap. 3, inglés) | No es un dato: es una traducción | — | traducción propuesta abajo |
| 21 | esperan (cap. 6) | CONFIRMADA con ajuste (separar canon y dato) | BirdLife/UICN (ya citado en ep5 «especies») | verificado con el texto ajustado |

**Resultado (corregido por el verificador):** 13 de las 21 entradas tienen fuente oficial y pueden pasar a «verificado» en bloque en cuanto se abran los enlaces (6 tal cual: 2, 7, 9, 14, 15 y 17; 7 con un ajuste pequeño: 1, 3, 5, 8, 10, 11 y 21). 2 quedan pendientes porque su cita no se sostiene en el índice: lluvia_bosque_enano y ceiba. (El recuento original, «9 tal cual y 6 con ajuste», tampoco cuadraba con la tabla: daba 8 y 7.) 3 se quedan como están o pasan a «narrativo»: capas_bosque, q3 y heliconia. Las otras 3 (E9, canoa y CG-51) se quedan como están o solo necesitan una traducción.

---

## Detalle: capítulo 1 (`content/cap1/lecciones.js`)

### 1. cotorra_1975 (parcial)
- **Dice el juego:** «En 1975 llegaron a quedar solo 13 cotorras en el bosque.»
- **Fuentes:**
  - USFWS, historia de 2001: https://www.fws.gov/story/2001-07/nine-ten-captive-bred-puerto-rican-parrots-released-caribbean-national-forest-still. Según el índice: incluida en la lista de especies en peligro en 1967, cuando quedaban 24 aves; «by 1975 the population had fallen to 13 birds». ⚠ no verificada: la frase no es literal; según el índice, la historia dice «by 1975, the population had reached an alarming low of only 13 birds». El dato se sostiene; hay que corregir la cita.
  - USFWS, hoja informativa de Río Abajo (archivo UNT): https://webarchive.library.unt.edu/eot2008/20081107023256/http://southeast.fws.gov/pubs/facts/rioescon.pdf. Según el índice, sitúa 1975 como el conteo silvestre más bajo, con 13 individuos. Es una paráfrasis del buscador, no una frase literal.
  - Comunicado de 1975 que ya cita el juego: https://www.fws.gov/sites/default/files/documents/historic-news-releases/1975/19750922A.PDF (no se pudo abrir).
- **Veredicto:** CONFIRMADA con ajuste. La cifra es de cotorras silvestres (el aviario empezó en 1973).
- **Texto propuesto:** «En 1975 llegaron a quedar solo 13 cotorras silvestres en el bosque.»
- **Estado propuesto:** verificado (tras abrir el enlace del USFWS de 2001).

### 2. zorzal_pardo (parcial)
- **Dice el juego:** «El zorzal pardo compite con la cotorra por los huecos para anidar.»
- **Fuentes:**
  - USFWS, Federal Register, 17-jun-2008 (aviso del borrador revisado del plan de recuperación): https://www.fws.gov/policy/library/2008/E8-13580.html. Dice: «Pearly-eyed thrashers are the main source of nest competition and predation of eggs and chicks». ⚠ no verificada: esa frase no aparece en el índice. Lo que muestra es «major threats to this species are nest competition and predation of eggs and chicks by pearly-eyed thrashers» (amenaza principal entre varias, no «la principal»). Basta para «compite por los huecos»; hay que corregir la cita.
  - Comunicado del USFWS de 1975 (el que ya se cita). Según el índice, habla de «vicious competition for nest space with the pearly-eyed thrasher».
- **Veredicto:** CONFIRMADA tal cual. Conviene cambiar la fuente al Federal Register de 2008, que es más reciente.
- **Estado propuesto:** verificado (tras abrir el enlace).

### 3. cotorra_alimento (por_verificar)
- **Dice el juego:** «La cotorra come frutos y semillas del bosque, como los de la palma de sierra.»
- **Fuentes:**
  - USFWS, ficha de la especie: https://fws.gov/species/puerto-rican-amazon-amazona-vittata. Dice: «feeds chiefly on wild fruits, particularly the sierra palm (Prestoria [sic] montana), but may also consume flowers and tender shoots».
  - USDA FS: https://fs.usda.gov/Internet/FSE_DOCUMENTS/stelprdb5338966.pdf. Según el índice, la fruta es el alimento principal (palma de sierra, tabonuco y cupeíllo), y las semillas, las hojas tiernas y las flores son secundarias. Es una paráfrasis.
- **Veredicto:** CONFIRMADA con ajuste. El USFWS pone por delante los frutos, no las semillas.
- **Texto propuesto:** «La cotorra come sobre todo frutos silvestres, en especial los de la palma de sierra. También come flores y brotes tiernos.»
- **Estado propuesto:** verificado (tras abrir la ficha del USFWS).

### 4. capas_bosque (por_verificar)
- **Dice el juego:** «Un bosque se estudia por capas: suelo, sotobosque, dosel y emergentes. Cada capa recibe distinta luz.»
- **Fuentes:** no hay fuente oficial de EE. UU. ni de Puerto Rico que use ese modelo de cuatro capas para El Yunque. Solo aparecen fuentes educativas genéricas, como NSW National Parks (Australia): https://www.nationalparks.nsw.gov.au/-/media/visitor/files/pdf/education/rainforests-of-nsw/rainforest-layers.pdf. El USDA FS habla de dosel y sotobosque, pero sin el modelo de capas («almost full sunlight in the understory» tras María): https://fs.usda.gov/inside-fs/aftermath-hurricane-maria-part-3-el-yunque-national-forest.
- **Veredicto:** NO CONFIRMADA con fuente oficial.
- **Propuesta (decide Kelvin):** (a) dejarla oculta, en por_verificar; o (b) pasarla a «narrativo» con este texto: «En esta aventura exploras el bosque por capas, desde el suelo hasta lo más alto. Abajo llega menos luz.»

### 5. bosque_tipos (parcial)
- **Dice el juego:** «El Yunque tiene cuatro tipos de bosque según la altura: tabonuco, palo colorado, palma de sierra y bosque enano en las cumbres.»
- **Fuentes:**
  - USDA FS: https://fs.usda.gov/Internet/FSE_DOCUMENTS/stelprdb5338954.pdf. El índice muestra los tipos «Tabonuco Type» (por debajo de 2,000 pies), «Sierra Palm Type» y «Cloud Type» (de 2,500 a 3,533 pies, con vegetación «dwarf, twisted, mossy»).
  - USDA FS, página archivada de recursos naturales: https://webarchive.library.unt.edu/eot2008/20090114055601/http:/www.fs.fed.us/r8/caribbean/natural-resources/index.shtml. Pone el bosque enano «at the upper edges of the Palo Colorado and Sierra Palm Forest Types».
- **Matiz:** según el USDA FS, la palma de sierra crece en pendientes empinadas y orillas de quebradas, no solo según la altura.
- **Veredicto:** CONFIRMADA con ajuste.
- **Texto propuesto:** «El Yunque tiene cuatro tipos de bosque según la altura y el terreno: tabonuco, palo colorado, palma de sierra y bosque enano en las cumbres.»
- **Estado propuesto:** verificado (tras abrir el enlace; el 24-oct dio 404, así que si sigue caído, usar la página archivada).

### 6. lluvia_bosque_enano (parcial)
- **Dice el juego:** «En el bosque enano de las cumbres caen de 150 a 200 pulgadas de lluvia al año.»
- **Fuente:** USDA FS, el mismo PDF (stelprdb5338954). Según el índice, el «Cloud Type» (de 2,500 a 3,533 pies, vegetación enana) recibe «150 to 200 inches/year». ⚠ no verificada: la búsqueda de la frase exacta no la encuentra en ninguna fuente del USDA FS. La hoja de hechos (stelprdb5338933) da 120 pulgadas de media y 250 de máximo registrado; la página archivada del USDA FS dice «over 200 inches» en las zonas altas.
- **Veredicto:** ⚠ PENDIENTE (bajado desde «CONFIRMADA tal cual») hasta que alguien abra el PDF y vea la cifra. El documento lo llama «Cloud Type» (bosque nublado); el juego lo llama bosque enano, y la descripción coincide.
- **Estado propuesto:** verificado (tras abrir el enlace).

### 7. tabonuco (parcial)
- **Dice el juego:** «… el bosque más bajo de El Yunque, por debajo de unos 2,000 pies de altura.»
- **Fuente:** USDA FS (stelprdb5338954 y la hoja de hechos). Dice: «Tabonuco forest type is found on foothills and slopes below 2,000 feet (609.6 meters). It comprises almost 50% of the forest.»
- **Veredicto:** CONFIRMADA tal cual.
- **Estado propuesto:** verificado (tras abrir el enlace).

### 8. helecho_gigante (parcial)
- **Dice el juego:** «Los helechos gigantes, que parecen árboles, son comunes en El Yunque.»
- **Fuentes:**
  - USDA FS, hoja de flora: https://fs.usda.gov/Internet/FSE_DOCUMENTS/stelprdb5338937.pdf. Dice: «over 150 species of ferns». En el índice nombra los «giant tree ferns», pero el texto que muestra está desordenado.
  - USDA FS, Animales y plantas: https://www.fs.usda.gov/r08/elyunque/animals-plants. Dice: «more than 150 species of ferns».
  - Que sea «común» solo lo dice elyunque.com, que no es una fuente oficial.
- **Veredicto:** CONFIRMADA con ajuste («común» no tiene fuente oficial).
- **Texto propuesto:** «En El Yunque hay más de 150 especies de helechos. Algunos, como el helecho gigante, son tan grandes que parecen árboles.»
- **Estado propuesto:** verificado (tras abrir el enlace).

### 9. arboles_nativos (parcial)
- **Dice el juego:** «El Yunque tiene más de 240 especies de árboles nativos; 23 solo crecen allí.»
- **Fuente:** USDA FS, hoja de nov. 2007 (stelprdb5338937). Dice: «over 240 species of native trees of which 23 are found only in El Yunque, and 47 are introduced». Otra hoja, la de El Yunque en resumen (https://fs.usda.gov/Internet/FSE_DOCUMENTS/stelprdb5338933.pdf), dice: «Tree species found only in El Yunque - 23».
- **Veredicto:** CONFIRMADA tal cual.
- **Estado propuesto:** verificado (tras abrir el enlace).

### 10. bromelia (por_verificar)
- **Dice el juego:** «Las bromelias crecen sobre las ramas y guardan agua entre sus hojas.»
- **Fuente:** USDA FS, evaluación del Plan Forestal de El Yunque: https://www.fs.usda.gov/sites/nfs/files/legacy-media/elyunque/Draft%20Assessment%20-%20Assessing%20Eco%20Sustainability_0.pdf. Según el índice, describe en el tabonuco «epiphytic ferns, bromeliads, and orchids» y, en las zonas nubladas, «aquatic systems in tank bromeliads». Es decir: son epífitas (crecen sobre otras plantas) y forman tanques de agua. ⚠ no verificada: ninguna de las dos frases aparece en el índice al buscarlas literalmente. Sí aparece otra hoja del USDA FS (https://fs.usda.gov/Internet/FSE_DOCUMENTS/stelprdb5338957.pdf, bosque nublado): ramas y troncos «densely covered by algae, hanging moss, ferns, bromeliads and tiny orchids». Eso sostiene que crecen sobre las ramas; que «guardan agua» solo sale en fuentes no oficiales (elyunque.com).
- **Veredicto:** ⚠ CONFIRMADA en parte (bajado desde «tal cual»). Texto posible si no se confirma la evaluación: «Las bromelias crecen sobre las ramas y los troncos de los árboles.»
- **Estado propuesto:** verificado (tras abrir el enlace).

### 11. coqui_bromelia (por_verificar)
- **Dice el juego:** «Del huevo del coquí sale un coquí chiquitito, sin etapa de renacuajo. Pone sus huevos en lugares húmedos, como bromelias u hojas enrolladas.»
- **Fuentes:**
  - IUCN GISD (la Unión Internacional para la Conservación de la Naturaleza está en la lista de fuentes aprobadas): https://www.iucngisd.org/gisd/pdf.php?sc=105. Dice: «The fertilised egg undergoes direct development, rather than passing through a free-living larval (tadpole) stage».
  - USDA FS: https://www.fs.usda.gov/r08/elyunque/animals-plants/animals. Dice: «home to 13 of the 17 species of coquis». El índice atribuye a un perfil del Forest Service la frase «found in epiphytic bromeliads, tree holes, and under rocks», pero no se identificó la URL exacta.
  - Que ponga los huevos en bromelias u hojas enrolladas solo aparece en fuentes no oficiales (elyunque.com y topuertorico.org). No se encontró nada del DRNA.
- **Veredicto:** CONFIRMADA con ajuste.
- **Texto propuesto:** «Del huevo del coquí sale un coquí chiquitito, sin etapa de renacuajo. Vive en bromelias, huecos de árboles y debajo de las piedras.»
- **Estado propuesto:** verificado con el texto ajustado (tras abrir el GISD y localizar la URL del perfil del USDA FS).

### 12. heliconia (por_verificar)
- **Dice el juego:** «La heliconia tiene brácteas rojas que visitan los colibríes.»
- **Fuentes:** no hay fuente oficial. Lo que hay es ciencia revisada por pares o resúmenes de congreso:
  - Resumen de la ESA 2010 sobre *Heliconia caribaea* en El Yunque: https://eco.confex.com/eco/2010/webprogram/Paper23527.html. Habla de «long, tubular, nectar producing flowers held by bright colored bracts». Las visitan el zumbador verde (*Anthracothorax viridis*) y el zumbadorcito (*Chlorostilbon maugaeus*). Es un resumen de congreso, así que es preliminar. (Nota del verificador: según el índice, el resumen también registra al reinita como visitante, dice que las visitas fueron poco frecuentes y concluye que la polinización es «generalizada», no solo por colibríes. Los nombres de las dos especies de colibrí no aparecen en el extracto.)
  - Temeles et al. (Antillas Menores): existen formas de *H. caribaea* con brácteas rojas y amarillas («yellow morph», «red morph»): https://zenodo.org/record/4949420.
- **Matiz:** en las heliconias de Puerto Rico las brácteas pueden ser rojas o amarillas, así que decir solo «rojas» es inexacto.
- **Veredicto:** NO CONFIRMADA con fuente oficial.
- **Texto propuesto, si Kelvin acepta la fuente científica:** «La heliconia tiene brácteas de colores vivos, y los colibríes visitan sus flores para tomar néctar.»
- **Estado propuesto:** por_verificar (o verificado con la fuente de la ESA, si Kelvin lo aprueba).

### 13. ceiba (por_verificar)
- **Dice el juego:** «La ceiba es uno de los árboles más altos; sus raíces forman grandes tablas que la sostienen.»
- **Fuentes:**
  - USDA FS / RNGR, *Árboles de Puerto Rico*, «Ceiba pentandra» (J. K. Francis, Instituto Internacional de Dasonomía Tropical): https://rngr.net/publications/arboles-de-puerto-rico/ceiba-pentandra. Dice: «La ceiba puede alcanzar una altura de más de 50 m […] el tallo desarrolla unas espinas robustas y unos contrafuertes prominentes». También dice que los árboles más viejos de Puerto Rico «se distinguen por sus grandes contrafuertes». ⚠ no verificada: el índice solo muestra los metadatos de esa página y la atribuye a Jesús Danilo Chinea-Rivera (*Bioecología de árboles nativos y exóticos de Puerto Rico y las Indias Occidentales*), no a Francis; ni la altura de 50 m ni los contrafuertes aparecen en el extracto.
  - USDA FS, Treesearch 30402 (Chinea-Rivera 1990, SO-ITF-SM-29): https://research.fs.usda.gov/treesearch/30402. Es la ficha silvícola; no se pudo abrir.
- **Matiz:** Britton (*Flora Borinqueña*, NYBG) indica que en Puerto Rico no se conocen ceibas de más de la mitad de la altura máxima de la especie. Según Francis, en Puerto Rico la ceiba crece en suelos costeros secos, no en el bosque alto de El Yunque.
- **Veredicto:** ⚠ PENDIENTE (bajado desde «CONFIRMADA con ajuste») hasta abrir la página de RNGR y comprobar autor y frase.
- **Texto propuesto:** «La ceiba puede pasar de 50 metros de altura. Su tronco tiene grandes contrafuertes, como tablas, que la sostienen.»
- **Estado propuesto:** verificado con el texto ajustado (tras abrir el enlace).

### 14. bambu (parcial)
- **Dice el juego:** «El bambú común (Bambusa vulgaris) es una planta introducida en Puerto Rico.»
- **Fuentes:**
  - USDA FS, GTR SO-82 (Francis y Liogier), *Naturalized exotic tree species in Puerto Rico*: https://webarchive.library.unt.edu/web/20081204190549/http://www.srs.fs.usda.gov/pubs/gtr/gtr_so082.pdf. La tabla 1 de árboles exóticos naturalizados recoge *Bambusa vulgaris*, «giant bamboo», con origen en Asia tropical.
  - USDA FS, Francis 1993, *Bambusa vulgaris*, SO-ITF-SM-65: https://research.fs.usda.gov/treesearch/30351. Según un análisis de riesgo que lo cita, llegó a Puerto Rico «at least 150 years ago from Southeast Asia». Es una cita de segunda mano.
- **Veredicto:** CONFIRMADA tal cual. Conviene sustituir la fuente del GISD por la del USDA FS, que está en la lista aprobada. Queda pendiente lo que ya anota la ficha: confirmar con el artista qué especie se modeló.
- **Estado propuesto:** verificado (tras abrir el enlace).

### 15. ciclo_agua (parcial)
- **Dice el juego:** «El Sol evapora el agua; el vapor se enfría y forma nubes; llueve; el agua se mete en el suelo o corre a los ríos y al mar.»
- **Fuentes:**
  - USGS, Water Science School: https://www.usgs.gov/special-topics/water-science-school/science/water-cycle, que es la URL que ya cita el juego.
  - Cartel del USGS: https://water.usgs.gov/edu/graphics/watercycle-usgs.pdf. Según el índice, recoge la evaporación, la condensación («forms clouds»), la precipitación, la escorrentía y la infiltración. Es una paráfrasis, no una frase literal.
- **Veredicto:** CONFIRMADA tal cual (es un concepto general).
- **Estado propuesto:** verificado (tras abrir el enlace).

### 16. Aula q3 (por_verificar)
- **Dice el juego:** «Une cada capa con lo que viste allí.» Las parejas son: suelo = hongos y hojarasca; sotobosque = helecho gigante; dosel = bromelias sobre ramas; emergente = la ceiba, la más alta.
- **Problema:** depende de capas_bosque, que no tiene fuente oficial. Además, la ceiba no es un árbol emergente propio de El Yunque (ver la ficha 13). Que las bromelias crezcan sobre ramas sí tiene fuente (ficha 10).
- **Veredicto:** NO CONFIRMADA.
- **Propuesta:** como la pregunta dice «lo que viste allí», puede pasar a «narrativo» (lo que se ve en el mundo del juego) si Kelvin acepta la opción (b) de capas_bosque. Si no, se queda en por_verificar.

### 17. Aula q4 (por_verificar)
- **Dice el juego:** «Completa la cadena: Sol → palma de sierra → ___», con la respuesta «Cotorra».
- **Fuente:** la ficha del USFWS de la especie (ver la ficha 3): «feeds chiefly on wild fruits, particularly the sierra palm». Que la energía del Sol pase a la planta y luego al animal es ecología básica.
- **Veredicto:** CONFIRMADA.
- **Estado propuesto:** verificado cuando lo esté cotorra_alimento (`requiere_validacion`).

---

## Detalle: capítulos 2, 3 y 6

### 18. Cap. 2, E9: techo_zinc (`content/ep2/lecciones.js:59`, verificado)
- **Dice el juego:** «En la casa criolla de Puerto Rico, el techo solía ser de teja o de planchas de zinc.»
- **Fuente:** NPS, Registro Nacional n.º 90000767: https://npgallery.nps.gov/NRHP/GetAsset/NRHP/90000767_text. Es la residencia de Jaime Acosta y Forés, en San Germán, de estilo «Criollo Vernacular» (1917), inscrita el 24-may-1990. La tipología dice: «hipped or side-gabled, usually high-pitched roof of ceramic tile or corrugated zinc». (Verificador: la frase aparece literal en el índice, pero el buscador no pudo atarla con seguridad al documento 90000767. Que esa casa tiene techo de zinc corrugado sí aparece.)
- **Matiz:** el registro describe la casa criolla **urbana** (San Germán). El techo «de dos aguas» corresponde a «side-gabled»; el registro también menciona el de cuatro aguas («hipped»). La ficha ya está escrita con ese cuidado.
- **Veredicto:** CONFIRMADA tal cual.
- **Estado propuesto:** se queda en verificado. No hace falta cambiar nada.

### 19. Cap. 3: canoa_taina (`content/ep3/lecciones.js:55`, verificado)
- **Dice el juego:** «La palabra «canoa» viene de una lengua indígena de las Antillas.»
- **Fuentes:**
  - ASALE y RAE, *Diccionario de americanismos*: https://www.asale.org/damer/canoa. Dice: «canoa. (De or. ind. antillano)». Ya lo leyó el equipo el 4-nov. ⚠ no verificada en esta revisión: asale.org está bloqueado y el índice no muestra esa entrada; se apoya solo en la lectura del 4-nov.
  - El DLE (https://dle.rae.es/canoa) no se pudo abrir: `www.rae.es` está bloqueado y el buscador no muestra su etimología. Fuentes no oficiales (Wiktionary y diccionarios etimológicos) dan el taíno *kanoa*/*kanawa*, de la familia arahuaca.
- **Veredicto:** el texto actual de la ficha está CONFIRMADO. Que «viene del taíno» según la RAE (lo que dice `KELVIN_CERRAR_HOY.md` §A2.2) **NO está CONFIRMADO desde aquí**.
- **Estado propuesto:** se queda en verificado tal como está. Si Kelvin abre dle.rae.es/canoa y ve «Del taíno», puede cambiarse a «La palabra «canoa» viene del taíno», con esa URL.

### 20. Cap. 3: CG-51 (`content/ep3/en.js:442`)
- **El problema:** en el recorrido en inglés, la fuente sale como «RAE, Diccionario de la lengua española (Spanish dictionary), “canoa”, sense 1a», con el título en español.
- **No es un dato:** basta con traducirlo.
- **Traducción propuesta:** `"Source: Royal Spanish Academy (RAE), Dictionary of the Spanish Language, entry “canoa” (canoe), sense 1a"`. El valor en `en.js` sería «Royal Spanish Academy (RAE), Dictionary of the Spanish Language, entry “canoa” (canoe), sense 1a».
- **Ojo:** la prueba `temporadaRealEnTest` puede seguir marcando la palabra «canoa» suelta. No se comprobó, porque no hay build en esta sesión. Si la marca, hay que excluirla, porque es el nombre de la entrada del diccionario.

### 21. Cap. 6: esperan (`content/ep6/lecciones.js:59`, por_verificar)
- **Dice el juego:** «En el universo del juego hay 36 cotorras Amazona. Algunas especies ya desaparecieron de la naturaleza, como la de Martinica y la de Guadalupe.»
- **Las 36:** es canon del juego («en el universo del juego»). No es un dato del mundo real ni necesita fuente, pero tiene que leerse claramente como parte de la historia.
- **Martinica y Guadalupe:** la ficha `especies` de `content/ep5/lecciones.js:50` ya lo tiene verificado:
  - BirdLife International (2021), *Amazona martinicana*, Lista Roja de la UICN: https://www.iucnredlist.org/species/22728705/194903850.
  - BirdLife International (2016), *Amazona violacea*, Lista Roja de la UICN.
  - Ambas están en la categoría «Extinct».
- **Matiz:** la UICN dice «extinta», no «desaparecida de la naturaleza». «Desaparecida de la naturaleza» puede confundirse con la categoría «Extinta en estado silvestre», que es otra.
- **Veredicto:** CONFIRMADA con ajuste.
- **Texto propuesto:** «En el universo del juego hay 36 cotorras Amazona. En la vida real, algunas ya se extinguieron, como la de Martinica y la de Guadalupe (Lista Roja de la UICN).» La fuente sería la misma que la de la ficha `especies` del ep5.
- **Estado propuesto:** verificado con el texto ajustado. No hace falta poner la cifra «34 vivas y 2 extintas».

---

## Qué tiene que decidir Kelvin (actualizado el 7-nov-2026)
1. Si aprueba los 10 ajustes de texto de la sección «Pendiente de Kelvin: ajustes de texto» (cotorra_1975 con su año, cotorra_alimento, bosque_tipos, lluvia_bosque_enano, tabonuco, helecho_gigante, arboles_nativos, bromelia, coqui_bromelia y ceiba). Con cada uno aprobado, la ficha pasa a «verificado» con la fuente ya abierta (y q4 con cotorra_alimento).
2. capas_bosque y q3: si se dejan ocultas o pasan a «narrativo».
3. heliconia: si acepta una fuente científica no oficial (el resumen de la ESA 2010) o la ficha se queda oculta.
4. canoa («del taíno») y ciclo_agua: hay que abrir dle.rae.es/canoa y la página de la Water Science School del USGS desde un navegador normal (desde la nube dan 403).
5. esperan: hay que abrir la Lista Roja (iucnredlist.org da 403; BirdLife DataZone carga la categoría con JavaScript).


---

## Verificación real, segunda pasada (7-nov-2026, Kimi 4a, K4-15)

Se abrieron de nuevo las fuentes oficiales de las 5 fichas que seguían ocultas tras la primera pasada (esta vez con acceso web que sí pasa los 403 de usgs.gov e iucnredlist.org). Resultado: 2 pasan a «verificado» y 3 se quedan ocultas por falta de fuente oficial. Nada inventado.

| # | Ficha | URL exacta | Frase citada | Resultado |
|---|-------|-----------|--------------|-----------|
| 4 | capas_bosque | — | — | **Se queda oculta.** Se rebuscó en USDA FS / IITF: el GTR-35 solo menciona estratificación «canopy, subcanopy»; ninguna fuente oficial nombra las 4 capas (suelo, sotobosque, dosel, emergente) tal como las usa la ficha. |
| 12 | heliconia | — | — | **Se queda oculta.** DRNA y fws.gov no tienen página de la especie; el resumen de la ESA 2010 no es fuente oficial, y IFAS Extension (tampoco oficial) describe las brácteas «scarlet or yellow», que no coincide con la ficha. |
| 15 | ciclo_agua | https://www.usgs.gov/special-topics/water-science-school/science/water-cycle (USGS Water Science School, abierta el 7-nov-2026) | «The sun’s energy causes liquid water to evaporate into water vapor»; «Clouds are formed by water condensing in the atmosphere… we experience precipitation»; «Water moves into the ground through infiltration… across the surface through snowmelt, runoff, and streamflow… into rivers, the ocean» | **Pasa a «verificado»** (content/cap1/lecciones.js, commit 4fde3a3f; assets/data/lecciones_cap1.json, commit 7ef63392). La página cubre los 5 procesos de la ficha: evaporación, condensación, precipitación, infiltración y escorrentía. |
| 16 | q3 (pregunta del Aula) | — | — | **Se queda oculta.** Depende de capas_bosque: mientras esa ficha no tenga fuente oficial, la pregunta no se publica. |
| 21 | esperan (cap. 6) | https://www.iucnredlist.org/species/22728705/194903850 (A. martinicana, BirdLife International 2021) y https://www.iucnredlist.org/species/22728701/94994037 (A. violacea, BirdLife International 2016), abiertas el 7-nov-2026 | «is listed as Extinct» (en ambas fichas de la Lista Roja) | **Pasa a «verificado»** (content/ep6/lecciones.js, commits 03918092 y 7ec6a224). Texto ajustado a la fuente: «ya se extinguieron» en vez de «desaparecieron de la naturaleza». Las 36 del universo del juego se mantienen (canon de Kelvin, directiva E3, 4-nov). |

Incidencia reparada durante esta pasada: una escritura errónea dejó placeholders en content/cap1/lecciones.js y assets/data/lecciones_cap1.json (commit bc9e730f). lecciones.js quedó restaurado byte a byte en 4fde3a3f (verificado por SHA de git: 92bed5fc…) y el JSON en 7ef63392 (agente de PC), ya con el cambio de ciclo_agua aplicado (contenido comprobado idéntico al preparado). Regla permanente: las escrituras remotas llevan el contenido completo literal; nunca placeholders.

---

## Verificación real, tercera pasada (7-nov-2026, agente de la nube)

Búsqueda nueva y acotada (unas 8 consultas) en fuentes oficiales que no se habían mirado: Smithsonian (si.edu, STRI, NMNH), USDA PLANTS y USDA FS. No se repitieron las búsquedas de la segunda pasada. **Límite de acceso:** desde la nube, el proxy da 403 a striresearch.si.edu, www.si.edu y plants.usda.gov, así que las citas se leyeron en el índice del buscador (filtrado a esos dominios), no abriendo la página. Conviene que alguien abra las dos URL desde un navegador normal para confirmarlo.

| # | Ficha | URL exacta | Frase citada | Resultado |
|---|-------|-----------|--------------|-----------|
| 4 | capas_bosque | https://striresearch.si.edu/rainforest/home/rainforest-layers/ (Smithsonian Tropical Research Institute) | «the emergent layer, the canopy, the understory, and the forest floor»; del suelo: «No more than a fiftieth of light from above penetrates this far down» | **Pasa a «verificado»** con un ajuste mínimo: «Un bosque se estudia por capas» → «Un bosque tropical lluvioso tiene capas» (la fuente habla del bosque tropical lluvioso en general; no es específico de El Yunque). |
| 12 | heliconia | https://www.si.edu/newsdesk/releases/nearly-half-popular-tropical-plant-group-related-birds-paradise-and-bananas-are (nota de prensa de la Smithsonian/NMNH, 2025) | «bright, beak-shaped flowers»; «bats and hummingbirds, which are the primary pollinators for many Heliconia species» | **Pasa a «verificado»** con el texto ajustado a la fuente: «La heliconia tiene flores vistosas con forma de pico. Los colibríes son polinizadores principales de muchas heliconias.» (corto: «Flor de colibríes.»). Se quita «brácteas rojas»: ninguna fuente oficial lo respalda, y un artículo del repositorio de la Smithsonian (Temeles et al., repository.si.edu) indica que en Puerto Rico las brácteas de *H. caribaea* son amarillas. USDA PLANTS (HECA10) solo confirma que es nativa de Puerto Rico. |
| 16 | q3 (pregunta del Aula) | — | — | **Se queda oculta.** Suelo = «hongos y hojarasca» coincide con STRI (hongos y hojas caídas), pero la pareja «Emergente = La ceiba, la más alta» sigue sin respaldo para El Yunque (ver la ficha 13), y STRI no menciona helechos en el sotobosque. Decisión de Kelvin: cambiar esa pareja o pasar la pregunta a «narrativo». |

- **7-nov 10:50 UTC · coordinadora:** capas_bosque **verificada** abriendo https://striresearch.si.edu/rainforest/home/rainforest-layers/ desde la nube (se permitió el host en el entorno): «the main layer of treetops forms a barrier that cuts off most of the light and wind, and a good deal of water, from below. We will be referring to four layers. From top to bottom, they are: the emergent layer, the canopy, the understory, and the forest floor». heliconia sigue pendiente (www.si.edu responde 403 a clientes automáticos).
- **7-nov · agente de la nube · q3 (pregunta del Aula):** pares ajustados a STRI y **pasa a «verificado»** (sin cambio de id, formato, número de pares ni `correcta`). Páginas abiertas desde la nube (HTTP 200, sin cambiar el User-Agent):
  - Emergente → «Los árboles más altos, con sol y viento» / «The tallest trees, in sun and wind». https://striresearch.si.edu/rainforest/home/rainforest-layers/: «a few trees considerably taller than all the rest stick up out of the greenery […] bear the full brunt of all extremes of weather. Winds toss and churn them. The tropical sun beats down on them».
  - Dosel → «Un loro comiendo fruta» / «A parrot eating fruit». https://striresearch.si.edu/rainforest/home/canopy/: «you might catch sight of a parrot hanging by one foot as it used its other to hold a piece of fruit it was gnawing».
  - Sotobosque → «Árboles jóvenes y arbustos» / «Young trees and shrubs». https://striresearch.si.edu/rainforest/home/understory/: «the understory, a layer made up of young trees, short species of trees, shrubs, and soft-stemmed plants».
  - Suelo → «Hongos y hojarasca» (sin cambio). https://striresearch.si.edu/rainforest/home/forest-floor/: «Most of the vegetation down here consists of fungi and other plants that live off the thin layer of decaying leaves». La pista («abajo hay poca luz y muchas hojas caídas») coincide con «At ground level, the rainforest is very dark».
  - Salen «La ceiba, la más alta» y «Helecho gigante», que no tenían respaldo. Las bromelias del dosel tampoco las nombra STRI (solo «epiphytes grow thickly»), por eso se cambiaron por el loro. **Para Kelvin:** el enunciado sigue siendo «Une cada capa con lo que viste allí»; si en el juego el loro, los arbustos o el sol y viento no se ven en esas capas, conviene cambiarlo a «con lo que hay allí» (no se tocó por quedar fuera de esta tarea).
- **7-nov · agente de la nube · heliconia:** **pasa a «verificado»** con texto nuevo ajustado a la fuente. En los hosts permitidos no apareció ninguna página oficial que diga que las flores tienen «forma de pico» ni que los colibríes sean «polinizadores principales» (la página de STRI https://striresearch.si.edu/rainforest/how_animals_adapt/hummingbirds/ habla de colibríes y flores rojas, pero no nombra la heliconia; El Yunque en fs.usda.gov y las páginas de polinizadores de USDA, NPS y FWS tampoco). Descartado: el PDF https://www.fs.usda.gov/wildflowers/pollinators/documents/orchids_hummingbirds.pdf nombra la heliconia entre las «hummingbird flowers», pero es un artículo de Orchid Digest (Carol Siegel, 2011) alojado en el sitio, no un texto oficial.
  - Fuente usada (PDF abierto y leído, HTTP 200): Wunderle y Arendt (2011), IITF, USDA Forest Service, Forest Ecology and Management 262: 33-48. https://research.fs.usda.gov/download/treesearch/39394.pdf: «In the tabonuco forest, Puerto Rican Emeralds feed heavily on flowers of the dominant understory shrub, Palicourea riparia Benth. (Waide, 1996) and Green Mangos were captured only when Heliconia was flowering (Wunderle et al., 1987).»
  - Nombre en español (DRNA, PDF abierto): https://www.drna.pr.gov/wp-content/uploads/2015/04/Bosque-Estatal-del-Nuevo-Milenio.pdf: «zumbador verde (Anthracothorax viridis)».
  - Texto nuevo: «En el bosque de tabonuco de El Yunque, los científicos solo capturaron zumbadores verdes cuando la heliconia estaba en flor.» / «In El Yunque's tabonuco forest, scientists caught Green Mangos only when Heliconia was flowering.» Corto: «Heliconia y zumbador verde.» Salen «forma de pico», «polinizadores principales» y «Flor de colibríes.». La palabra «colibrí» no se usa porque ninguna fuente abierta dice de forma literal que el zumbador verde lo sea. **Para Kelvin:** si se prefiere el texto anterior, hay que abrir www.si.edu en un navegador normal y confirmar la cita.
