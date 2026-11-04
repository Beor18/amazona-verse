# EDUCATIVO_EP2_EP6 · datos educativos de ep2 a ep6, con fuente

Tarea BM71 de `docs/equipo/TAREAS_API.md`. Como BM44 con el capítulo 1 (`DIARIO_VALIDACION.md`). Fecha: 30 de octubre de 2026.

**Cómo se verificó.** `fws.gov`, `si.edu`, `noaa.gov` y también `usgs.gov`, `nrcs.usda.gov`, `weather.gov` y `rae.es` no resuelven desde esta red (WebFetch falla), así que solo se pudo leer lo que devuelve el buscador. Criterio: **verificado** = la fuente oficial o académica citada dice el dato (leído en el extracto del buscador o ya verificado antes en el repo); **parcial** = el dato es correcto y hay fuente, pero el texto oficial no se pudo abrir o la fuente es secundaria; **por verificar** = no se encontró fuente; nada inventado.

**Decisión sobre el estado en el juego.** Las 6 fichas de cada capítulo ep2–ep4 llevan `verificacion: "por_verificar"` y sus pruebas (`AU.fichas().length === 0`, `ep2Test`, `ep3Test`, `ep4Test`, `ep6Test`) exigen eso. Ninguna se pasa a «verificado» aquí: hacerlo publicaría las fichas en el Diario y obliga a cambiar las pruebas; lo decide Kelvin con esta tabla. No se cambió ningún archivo de `content/`. **Actualización BM126 (2-nov):** con la verificación de Kelvin, 18 fichas pasan a `verificado` y sus pruebas se ajustaron (ver «Resultado»).

## Tabla (31 datos)

| Dato | Cap. | Archivo | Fuente (enlace) | Estado |
|---|---|---|---|---|
| Por lo general el agua se filtra más rápido en suelo arenoso que en arcilloso; si no entra, puede formar charcos | ep2 | `lecciones.js` `charco` | USDA NRCS, *Rangeland Processes Handbook* https://directives.nrcs.usda.gov/sites/default/files2/1712930328/33930.pdf | verificado · Kelvin 2-nov (1, con matiz) · enlace comprobado (BM126) |
| En pendientes más empinadas la lluvia puede correr con más fuerza y arrastrar más suelo | ep2 | `cinta_lluvia` | USGS, *Sediment characteristics of North Carolina streams, 1970–79* https://pubs.usgs.gov/of/1987/0701/report.pdf | verificado · Kelvin 2-nov (2, correcta) · enlace comprobado (BM126) |
| El viento suele sentirse más fuerte en lugares expuestos; detrás de árboles de barrera puede soplar más suave | ep2 | `poste_viento` | USDA Forest Service, *Windbreaks* https://research.fs.usda.gov/centers/nac/windbreaks ; NWS https://www.weather.gov/ama/fire_weather_wind_tool | verificado · Kelvin 2-nov (3, con matiz) · enlace comprobado (BM126) (las dos) |
| Texto neutro: «Al levantar el piso de una construcción, queda un espacio entre la vivienda y el terreno.» Se retiró la afirmación histórica de los zocos en PR; en el mundo, «Postes viejos» | ep2 | `zocos` (y `pack.js`/`en.js` «Zocos viejos» → «Postes viejos») | Sin fuente. Contexto insuficiente: Ortiz Colom, *La casa criolla de Puerto Rico* https://prcr.cobimet.org/items/e4e82545-a1c3-42c4-8b01-e23ca0bc39dd (abre; no menciona zocos) | narrativo · Kelvin 2-nov (4, SIN FUENTE: «no detenerse; texto neutro o narrativo») · publicada 2-nov como ficha narrativa «En esta historia…» (`verificacion: "narrativo"`, fuente «Relato del juego (no es un dato histórico)»); el objeto sigue siendo «Postes viejos» |
| Techo de dos aguas; muchas casas del campo con planchas de zinc | ep2 | `techo_zinc` | NPS, registro NRHP 90000767: casa criolla con cubierta a dos o cuatro aguas, teja o zinc corrugado https://npgallery.nps.gov/NRHP/GetAsset/NRHP/90000767_text ; UPRM (zinc criollo) https://scholar.uprm.edu/entities/publication/cd0da037-f4b9-47b3-a8ca-afbcad32b461 | verificado (la parte «correr la lluvia hacia los dos lados» es geometría) · publicada 2-nov; el registro NPS describe la casa criolla urbana, así que la ficha dice «la casa criolla» y no «las casas del campo» [KELVIN: revisar] |
| Los taínos construían bohíos con materiales del entorno, como palmas y bejucos (sin postes de madera) | ep2 | `bohio` | Smithsonian NMAI, guía *Taíno* https://americanindian.si.edu/nk360/pdf/Taino-Gallery-Guide-Spanish.pdf | verificado · Kelvin 2-nov (5, con matiz) · enlace comprobado (BM126) (con curl; WebFetch da 403) |
| Parada del nido: la cotorra anida en cavidades naturales y artificiales; las cajas nido ayudan | ep2, ep4 | `pack.js` (`FUENTE`, parada del nido; ep4 también el bosquecillo) | USFWS, programa de la cotorra puertorriqueña (ya citado en `EDUCATIVO.md` y `EP2_MISIONES.md`); la ficha fws.gov no resuelve; ver `DATOS_VERIFICADOS.md`. BM84: *Artificial Cavities and Nest Site Selection by Puerto Rican Parrots* (SORA, Ornitología Neotropical) https://sora.unm.edu/sites/default/files/journals/on/v015s/p0467-p0476.pdf ; AFA https://parrots.org/projects/puerto-rican-amazons-increasing-breeding-success/ ; desde 2001 todo el anidamiento silvestre conocido ocurre en cavidades artificiales (extracto del buscador) | verificado (BM84, por extractos) |
| Un objeto flota si es menos denso que el agua; la forma del casco cambia el agua que aparta | ep3 | `flota_hunde` | Univ. de Hawái, *Exploring Our Fluid Earth* https://manoa.hawaii.edu/exploringourfluidearth/node/148 ; OpenStax, Arquímedes https://openstax.org/books/college-physics-ap-courses-2e/pages/11-7-archimedes-principle | verificado (no se halló NOAA/NASA; estas fuentes bastan) |
| De día el viento sopla del mar a la tierra; de noche, al revés | ep3 | `brisa_mar` | NWS JetStream, CIMSS https://cimss.ssec.wisc.edu/sage/oceanography/lesson3/ocean/lb_circ.htm (texto no leído). BM84: UCAR https://au1.ucar.edu/what-are-land-breezes (ciclo diario de temperatura y presión; la tierra se calienta y enfría más rápido que el agua) | verificado (BM84, por extracto) |
| El coco flota y puede viajar por el mar a otra costa, donde a veces germina | ep3 | `semilla_viajera` | Cáscara fibrosa >2 cm da flotación; viabilidad ~100–110 días en mar cálido; hay brotes de cocos varados (Te Ara https://teara.govt.nz/node/5451 ; NZPCN https://btsnew.nzpcn.org.nz/site/assets/files/22807/abj58_1_2003-80-83-coconut.pdf). Las cifras de largo alcance son discutidas: el texto «a veces» es prudente | verificado |
| «Canoa» viene del taíno; los taínos viajaban entre islas en canoas de troncos ahuecados | ep3 | `canoa_taina` | RAE, DLE «canoa» https://dle.rae.es/canoa ; NPS https://www.nps.gov/places/taino-settlement.htm | verificado · Kelvin 2-nov (6, correcta) · DLE no abre desde la nube (BM126) [Reportado: Kelvin]; NPS comprobado |
| El cayuco es una embarcación tradicional caribeña de una pieza, más pequeña que la canoa y movida con canalete (sin «de pesca») | ep3 | `cayuco` (`pack.js` ya sin «de pesca» desde BM85) | RAE, DLE «cayuco» https://dle.rae.es/cayuco | verificado · Kelvin 2-nov (7, con matiz) · no abre desde la nube (BM126) [Reportado: Kelvin] |
| Una nasa es una trampa de pesca: los peces entran y les resulta difícil salir; puede hacerse de distintos materiales | ep3 | `nasa` | NOAA Fisheries, *Traps and Pots* https://www.fisheries.noaa.gov/national/bycatch/fishing-gear-traps-and-pots ; PR: https://www.fisheries.noaa.gov/inport/item/24255 | verificado · Kelvin 2-nov (8, con matiz) · enlace comprobado (BM126) (las dos) |
| Las raíces de los árboles de la orilla sujetan la tierra | ep4 | `raices` | Servicio Forestal de Maryland https://dnr.maryland.gov/forests/Pages/publications/buffers.aspx ; USDA NRCS norma 391 https://www.nrcs.usda.gov/sites/default/files/2025-07/391_ND_GD_Riparian_Forest_Buffer-Fact_Sheet_2018.pdf | verificado |
| La sombra puede mantener más fresca el agua de un arroyo; algunos peces buscan zonas más frescas | ep4 | `sombra` | USDA FS, GTR SRS-109 https://www.srs.fs.usda.gov/pubs/gtr/gtr_srs109.pdf ; USGS https://pubs.usgs.gov/publication/sir20235140/full | verificado · Kelvin 2-nov (9, con matiz) · USDA no abre desde la nube (BM126) [Reportado: Kelvin]; USGS comprobado (refugios térmicos) |
| Las hojas que caen al río alimentan a animales pequeños del agua | ep4 | `hoja_seca` | NRCS 391: la vegetación de la orilla aporta hojarasca que sirve de nutriente a peces y otros organismos acuáticos (misma ficha 2018 de arriba) | verificado |
| Algunas balsas y transbordadores cruzan ríos guiados por cables sujetos a las orillas (ejemplo de EE. UU., no tradición de PR) | ep4 | `soga` | NPS, *Green River Ferry Navigational System Repairs* https://www.nps.gov/articles/000/green-river-ferry-navigational-system-repairs.htm | verificado · Kelvin 2-nov (10, con matiz) · enlace comprobado (BM126) |
| Los taínos navegaban entre islas y por aguas costeras en canoas de troncos ahuecados (sin «ríos») | ep4 | `remo` | NPS, *Islands on the Horizon* https://www.nps.gov/places/islands-on-the-horizon.htm | verificado · Kelvin 2-nov (11, con matiz) · enlace comprobado (BM126) |
| En algunos senderos hay piedras colocadas para ayudar a cruzar arroyos pequeños | ep4 | `piedras` | NPS, *Rock Spring, Milepost 330.2* https://www.nps.gov/places/rock-spring-milepost-330-2.htm | verificado · Kelvin 2-nov (12, con matiz) · enlace comprobado (BM126) |
| Un espejo puede reflejar la luz del Sol y producir un destello visible a distancia si llega hasta quien lo observa | ep5 | `espejo` | NASA Science, *Wave Behaviors* https://science.nasa.gov/ems/03_behaviors/ | verificado · Kelvin 2-nov (13, con matiz) · enlace comprobado (BM126) |
| El sonido puede rodear algunos obstáculos; al alejarnos suele escucharse más débil | ep5 | `tambor` | The Physics Classroom https://www.physicsclassroom.com/class/sound/Lesson-3/Reflection%2C-Refraction%2C-and-Diffraction ; complemento https://www.physicsclassroom.com/calcpad/sound/Equation-Overview | verificado · Kelvin 2-nov (14, con matiz) · enlace comprobado (BM126) (con curl); el complemento abre pero no se halló el texto [Reportado: Kelvin] |
| Las banderas sirven para señales de día; de noche se necesitan señales iluminadas | ep5 | `banderas` | U.S. Naval Undersea Museum, *Semaphore!* https://www.history.navy.mil/content/dam/museums/undersea/education/Semaphore.pdf | verificado · Kelvin 2-nov (15, correcta) · no abre desde la nube (BM126) [Reportado: Kelvin] |
| En el juego, las piedras muestran un 36, dos cotorras, un camino, un fuego y una mano | ep5 | `marcas` | Es canon del juego, no un dato del mundo real | no aplica (canon de Kelvin) |
| *Amazona martinicana* y *A. violacea* extintas según la UICN; relatos de Labat (1742) y Du Tertre (1654); sin restos | ep5 | `especies`; `pack.js` (nota «especies» y diálogo) | BirdLife International (2021 y 2016), Lista Roja UICN https://www.iucnredlist.org/species/22728705/194903850 ; ya «verificado» en la ficha y en `content/comun/especies.js` | verificado (ya tenía fuente) |
| En la piedra está el 36; el pacto se llama de los 36 | ep5 | `treinta` | Canon de la historia | no aplica (canon de Kelvin) |
| Algunas cotorras Amazona vuelan en bandadas; cuando una detecta un peligro puede dar la alarma y otras reaccionan | ep6 | `tarjetas` | *Bird Conservation International*, liberación de Amazona confiscadas https://www.cambridge.org/core/journals/bird-conservation-international/article/successful-release-of-confiscated-amazona-parrots-using-freeflight-training/87194DBDC5F6D29B2212E04D335D5786 | verificado · Kelvin 2-nov (16, con matiz) · enlace comprobado (BM126) |
| Un buen plan de diseño explica qué queremos lograr y qué límites tenemos; después se prueba y se mejora | ep6 | `plan` | NGSS 3-5-ETS1-1 y 3-5-ETS1-3 https://www.nextgenscience.org/dci-arrangement/3-5-ets1-engineering-design (la búsqueda ?keys=3-5-ETS1-1 abre vacía sin JavaScript) | verificado · Kelvin 2-nov (17, con matiz) · enlace comprobado (BM126) (página 3-5-ETS1) |
| Para mover una pieza larga o difícil, puede ser más seguro coordinarse y pedir ayuda, o usar equipo adecuado | ep6 | `tabla` | CDC/NIOSH, *Materials Handling: Lifting and Carrying* (2026) https://www.cdc.gov/niosh/media/pdfs/2026/09/2026-119.pdf | verificado · Kelvin 2-nov (18, con matiz) · enlace comprobado (BM126) |
| Repetir con tus propias palabras lo que otro dijo ayuda a comprobar si lo entendiste y a descubrir puntos en común | ep6 | `acuerdo` | FEMA, IS-242.c https://emilms.fema.gov/is_0242c/groups/21.html | verificado · Kelvin 2-nov (19, con matiz) · enlace comprobado (BM126) |
| 36 = 1×36, 2×18, 3×12, 4×9, 6×6; 35 = 1×35, 5×7 | ep6 | `forma` | Aritmética (pares de factores): comprobada | verificado |
| El género *Amazona* tiene 36 especies en el catálogo: 34 vivas y 2 extintas | ep6 | `esperan` | Catálogo del juego `content/comun/especies.js` (Lista Roja UICN, BirdLife); las 13 discrepancias de `ESPECIES_DISCREPANCIAS.md` siguen sin estado | por verificar (cifra del catálogo propio; depende de la decisión de Kelvin) |

## Resultado (actualizado en BM126, 2 de noviembre de 2026)

Kelvin verificó los 19 datos pendientes en `VERIFICACION_EDUCATIVA_EP2_EP6_02NOV.md` (veredicto, extracto, enlace y «Texto para el juego»). BM126 puso ese texto en las fichas (ES y EN), la fuente y el enlace, y pasó a `verificado` las 18 correctas o con matiz: desde ahora salen al Diario. Cada enlace se abrió desde la nube (WebFetch, y curl + pdftotext para los PDF): **14 comprobados** con el extracto (o su sustancia), **4 no abren desde la nube** (DLE «canoa» y «cayuco», USDA FS GTR SRS-109, Navy *Semaphore!*: cuentan como [Reportado: Kelvin]), **0 no coinciden**. Zocos: SIN FUENTE, ficha con texto neutro que sigue `por_verificar`.

- **Datos:** 31. **Verificados: 27** (9 de antes + 18 de Kelvin; el cayuco ya estaba). **Parciales: 0.** **Por verificar: 1** (la cifra 36 del catálogo). **Narrativo: 1** (zocos). **No aplica (canon): 2.** Ojo: 6 datos que esta tabla ya daba por verificados (`techo_zinc`, `flota_hunde`, `brisa_mar`, `semilla_viajera`, `raices`, `hoja_seca`) seguían `por_verificar` en el juego (no estaban en la lista de Kelvin); el 2-nov se publicaron con la fuente de esta tabla (ver «Cerrado»).
- `depr_2022` sigue «por verificar» (fuera del alcance de BM126).
- **Cerrado (2-nov, aprobado por Kelvin):** las fichas de los caps. 2–6 se ganan jugando: cada una con su hallazgo del mundo (mismo id) o con el momento de la misión en que se vive (`G.aula.enlazar` en `src/game/aula.js`; el mapa `FICHA_VIA` está en cada `content/epN/pack.js`). Se guardan en `S.edu.fichas` y una partida de antes las recupera sola. Las 6 de arriba que la tabla ya daba por verificadas (`techo_zinc`, `flota_hunde`, `brisa_mar`, `semilla_viajera`, `raices`, `hoja_seca`) se publicaron con esa fuente, y `zocos` como ficha narrativa. Publicadas: ep2 6, ep3 6, ep4 6, ep5 4, ep6 5. Siguen sin publicar: `marcas`, `treinta` (canon) y `esperan` (cifra del catálogo).

## Resultado anterior (BM84, 31 de octubre de 2026)

- **Datos:** 31. **Verificados: 10** (+3: brisa de mar, cavidades y cajas nido, cayuco). **Parciales: 9** (viento con la altura y sonido con la distancia pasan de «por verificar» a parcial). **Por verificar: 10.** **No aplica (canon): 2.** **Corregidos: 0** en esta ronda (el cayuco ya se corrigió en `b5cbdb4`).
- Fuentes nuevas: UCAR, SORA/Ornitología Neotropical, AFA, USGS (publicación sobre vegetación y temperatura), Forest Research, LibreTexts, NASA NTRS, Aust. J. Zool. Todo por extractos del buscador; fws, si, noaa, usgs.gov y rae.es siguen sin abrir.
- **Sin dato hallado** (siguen por verificar): zocos, nasa, soga, piedras, espejo, banderas, tabla, acuerdo, tarjetas (*Amazona* en bandadas), cifra 36 del catálogo. ICP, DRNA y Archivo General no dieron nada sobre bohío, zocos, nasa ni cayuco.
- **Datos nuevos en ep2–ep6:** ninguno fuera de la tabla. Para BM85: `pack.js` ep3 aún dice «bote pequeñito de pesca» (el DLE no dice «de pesca»).
- Ninguna ficha pasa a «verificado» en el juego: eso las publicaría en el Diario y las pruebas exigen `por_verificar`. Decisión de Kelvin.

## Verificación 4-nov-2026 · respuestas de ChatGPT y Gemini

Kelvin pasó la lista de 19 datos a ChatGPT y a Gemini (4-nov). Cada cita se abrió en su página (curl + pdftotext, o WebFetch) y solo cuenta como **VERIFICADA** si la frase está en la página. **PARCIAL**: la página dice algo parecido (se copia la frase real) o solo se vio en el extracto del buscador. **FALSA / NO ENCONTRADA**: la página no existe, no dice eso, o no se pudo abrir y la frase no se pudo ver. Bloqueados desde esta red: `dle.rae.es` y todo `rae.es` (Cloudflare), `fws.gov`, `americanindian.si.edu` (HTML), `transportation.gov`, `nrcs.usda.gov` (no responde), `srs.fs.usda.gov`, `history.navy.mil`, `web.archive.org`.

| N.º | Ficha | Texto antes | Texto ahora | Fuente verificada (URL + frase literal) | Estado |
|---|---|---|---|---|---|
| 1 | `charco` | Por lo general, el agua se filtra más rápido en suelos arenosos que en suelos arcillosos. Si el agua no logra entrar al suelo, puede formar charcos. | Igual | USDA NRCS, *Rangeland Processes Handbook* https://directives.nrcs.usda.gov/sites/default/files2/1712930328/33930.pdf: «Water moves faster through sandy soils than it does through clayey soils.» y «the ability of the surface to detain or pond water». También USGS https://www.usgs.gov/special-topics/water-science-school/science/infiltration-and-water-cycle: «Some soils, such as clays, absorb less water at a slower rate than sandy soils.» | VERIFICADA |
| 2 | `cinta_lluvia` | En pendientes más empinadas, el agua de lluvia puede correr con más fuerza y arrastrar más suelo. | Igual | USGS (misma página de infiltración): «Water falling on steeply sloped land runs off quicker and infiltrates less than water falling on flat land.» USGS https://pubs.usgs.gov/of/1987/0701/report.pdf: «High runoff velocity associated with steep slopes is the most dynamic factor affecting erosion and subsequent sediment transport.» | VERIFICADA |
| 3 | `poste_viento` | El viento suele sentirse más fuerte en lugares expuestos; detrás de árboles que sirven de barrera puede soplar más suave. | Igual | USDA FS https://research.fs.usda.gov/centers/nac/windbreaks: «The primary purpose of most windbreaks is to slow the wind». NWS https://www.weather.gov/ama/fire_weather_wind_tool: «UNSHELTERED FUELS: Fuel exposed directly to the wind.» | VERIFICADA |
| 4 | `zocos` | En esta historia, cuatro postes levantaron una casa del suelo. Al levantar el piso, queda un espacio entre la vivienda y el terreno. | Igual (ficha narrativa, sin dato histórico) | Ninguna. El DLE no abre; el *Diccionario de americanismos* (https://www.asale.org/damer/zoco) solo trae «Co. Cantidad grande» y «Pa. … brazos amputados»: ninguna acepción de PR sobre pilotes | SIN FUENTE (narrativa) |
| 5 | `bohio` | Los taínos construían bohíos con materiales del entorno, como palmas y bejucos. | Igual | Smithsonian NMAI https://americanindian.si.edu/nk360/pdf/Taino-Gallery-Guide-Spanish.pdf: «Bohío: es una casa tradicional indígena que se construye con materiales locales resistentes al clima, como palmas y bejucos.» | VERIFICADA |
| 6 | `canoa_taina` | La palabra «canoa» viene del taíno. Los taínos viajaban entre islas en canoas hechas de troncos ahuecados. | La palabra «canoa» viene de una lengua indígena de las Antillas. Los taínos viajaban entre islas en canoas hechas de troncos ahuecados. | ASALE y RAE, *Diccionario de americanismos* https://www.asale.org/damer/canoa: «canoa. (De or. ind. antillano)». NPS https://www.nps.gov/places/taino-settlement.htm: «Traveling between islands in dugout canoes» y https://www.nps.gov/places/islands-on-the-horizon.htm: «Taíno communities traveled these waters in large dugout canoes». El «De or. taíno» del DLE no se pudo ver | PARCIAL → texto ajustado a lo verificado |
| 7 | `cayuco` | El cayuco es una embarcación tradicional caribeña de una pieza, más pequeña que la canoa y movida con canalete. | El cayuco es una canoa pequeña hecha de un tronco ahuecado. | Merriam-Webster https://www.merriam-webster.com/dictionary/cayuco: «a small native fishing dugout of Central and South America». El texto del DLE que citó ChatGPT solo se vio en el extracto del buscador | PARCIAL → texto ajustado (sin «de pesca») |
| 8 | `nasa` | Una nasa es una trampa de pesca: los peces entran y les resulta difícil salir. Puede construirse con distintos materiales. | Igual | NOAA Fisheries https://www.fisheries.noaa.gov/national/bycatch/fishing-gear-traps-and-pots: «three-dimensional wire or wood devices that permit organisms to enter the enclosure but make escape extremely difficult or impossible.» | VERIFICADA |
| 9 | `sombra` | La sombra de los árboles puede mantener más fresca el agua de un arroyo. Algunos peces buscan zonas más frescas cuando el agua se calienta. | Igual (enlace cambiado: el del USDA no abre) | USGS SIR 2023-5140 https://pubs.usgs.gov/publication/sir20235140/full: «Experimental riparian shading reduces surface water temperatures up to 4 °C (…) in small streams.» y «There is some evidence that fish use some of the cooler water inputs.» OSTI (Fuller y otros, 2022, con el USDA FS) https://www.osti.gov/pages/biblio/1982921: «Local shading by riparian vegetation can cool water temperatures» | VERIFICADA |
| 10 | `soga` | Algunas balsas y transbordadores cruzan ríos guiados por cables sujetos a las orillas. | Igual | NPS https://www.nps.gov/articles/000/green-river-ferry-navigational-system-repairs.htm: «Replacement of navigational cables that guide the vessel across the river.» | VERIFICADA |
| 11 | `remo` | Los taínos navegaban entre islas y por aguas costeras en canoas hechas de troncos ahuecados. | Igual | NPS https://www.nps.gov/places/islands-on-the-horizon.htm: «Taíno communities traveled these waters in large dugout canoes» | VERIFICADA |
| 12 | `piedras` | En algunos senderos hay piedras colocadas para ayudar a cruzar arroyos pequeños. | Igual | NPS https://www.nps.gov/places/rock-spring-milepost-330-2.htm: «The trails and stepping stones in the area lead you across Colbert Creek» | VERIFICADA |
| 13 | `espejo` | Un espejo puede reflejar la luz del Sol y producir un destello visible a distancia si llega hasta quien lo observa. | Las superficies muy lisas, como los espejos, reflejan casi toda la luz que les llega. Así, un espejo puede devolver la luz del Sol. | NASA https://science.nasa.gov/ems/03_behaviors/: «Very smooth surfaces such as mirrors reflect almost all incident light.» Lo del destello «a distancia» no tiene fuente oficial abierta: se quitó | VERIFICADA (texto ajustado) |
| 14 | `tambor` | El sonido puede rodear algunos obstáculos, por eso a veces oímos un tambor aunque no lo veamos. Al alejarnos suele escucharse más débil. | Igual (fuente nueva: dice las dos cosas) | FHWA https://www.fhwa.dot.gov/environment/noise/noise_barriers/design_construction/design/design03.cfm: «Diffraction, or the bending of sound waves around an obstacle, can occur both at the top of the barrier and around the ends.» y «sound levels measured from a point source decrease at a rate of 6 dB(A) per doubling of distance.» | VERIFICADA |
| 15 | `banderas` | Las banderas pueden servir para enviar señales de día. De noche se necesitan señales iluminadas para que puedan verse. | Igual (enlace al PDF que sí abre) | U.S. Naval Undersea Museum https://www.navalunderseamuseum.org/wp-content/uploads/2020/04/Semaphore.pdf: «acceptable for emergency communication in daylight or using lighted wands instead of flags, at night.» | VERIFICADA |
| 16 | `tarjetas` | Algunas cotorras Amazona vuelan en bandadas. Cuando una detecta un peligro, puede dar una alarma y otras reaccionan. | Igual | *Bird Conservation International* https://www.cambridge.org/core/journals/bird-conservation-international/article/successful-release-of-confiscated-amazona-parrots-using-freeflight-training/87194DBDC5F6D29B2212E04D335D5786: «one or more birds give alarm calls, and the entire group takes flight and flies as a single flock» | VERIFICADA |
| 17 | `plan` | Un buen plan de diseño explica qué queremos lograr y qué límites tenemos. Después probamos la solución y la mejoramos. | Igual | NGSS https://www.nextgenscience.org/dci-arrangement/3-5-ets1-engineering-design: «Define a simple design problem that can be solved through the development of an object, tool, process, or system and includes several criteria for success and constraints on materials, time, or cost.» y «Tests are often designed to identify failure points or difficulties, which suggest the elements of the design that need to be improved.» | VERIFICADA |
| 18 | `tabla` | Para mover una pieza larga o difícil de manejar, puede ser más seguro coordinarse y pedir ayuda, o usar equipo adecuado. | Igual | CDC/NIOSH https://www.cdc.gov/niosh/media/pdfs/2026/09/2026-119.pdf: «Ask for help with heavy or awkward objects.» y «Use lifting equipment like a dolly or powered equipment» | VERIFICADA |
| 19 | `acuerdo` | Repetir con tus propias palabras lo que otra persona dijo ayuda a comprobar si la entendiste y a descubrir puntos en común. | Repetir con tus propias palabras lo que otra persona dijo ayuda a comprobar si la entendiste bien. | FEMA https://emilms.fema.gov/is_0242c/groups/21.html: «Use paraphrasing or clarifying questions to confirm that you received the intended message.» La FEMA no habla de «puntos en común»: se quitó | VERIFICADA (texto ajustado) |

Inglés: el texto de cada ficha está en la misma ficha (`dato.en`, `corto.en`); los nombres de fuente nuevos con palabras en español tienen su traducción en `content/ep3/en.js`, `ep4/en.js` y `ep5/en.js`. Todas siguen `verificado` (las pruebas `ep3Test`–`ep6Test` lo exigen); `zocos` sigue `narrativo`.

### Cada cita de las IA, comprobada

**ChatGPT** (sin URL; se buscó la página que nombra):

| N.º | Página que nombra | Estado | Nota |
|---|---|---|---|
| 1 | USGS Ground Water | PARCIAL | La frase «…sandy soils than silty or clay soils» no se encontró. La página de infiltración del USGS dice «Some soils, such as clays, absorb less water at a slower rate than sandy soils.» |
| 2 | USGS Infiltration | VERIFICADA | Literal |
| 3 | USDA FS Windbreaks | VERIFICADA | Literal |
| 4 | (zocos sin fuente) | — | De acuerdo: sin fuente |
| 5 | Smithsonian NMAI, guía taína | VERIFICADA | Literal, pág. 2 |
| 6 | RAE «canoa» «De or. taíno.» / NPS | PARCIAL | El DLE no abre; el *Diccionario de americanismos* dice «De or. ind. antillano». NPS literal |
| 7 | RAE «cayuco» | PARCIAL | Solo visto en el extracto del buscador (coincide con la cita); la página no abre |
| 8 | NOAA Traps and Pots | VERIFICADA | Literal |
| 9 | USDA FS, investigación 2022 | VERIFICADA | Literal en OSTI (Fuller y otros, *Restoration Ecology* 2022, con autores del USDA FS) |
| 10 | NPS Green River Ferry | VERIFICADA | Literal |
| 11 | NPS Islands on the Horizon | VERIFICADA | Literal |
| 12 | NPS Rock Spring | VERIFICADA | Literal |
| 13 | NASA Wave Behaviors | VERIFICADA | Literal (no dice nada de distancia) |
| 14 | FHWA Noise Barrier Design Handbook | VERIFICADA | Literal, cap. 3 |
| 15 | U.S. Naval Undersea Museum, Semaphore | VERIFICADA | Literal, en navalunderseamuseum.org |
| 16 | Bird Conservation International | VERIFICADA | Literal |
| 17 | NGSS 3-5-ETS1 | VERIFICADA | Las dos frases, literales |
| 18 | CDC/NIOSH Lifting and Carrying | VERIFICADA | Literal |
| 19 | FEMA Active Listening | VERIFICADA | Literal |

**Gemini** (con URL):

| N.º | URL | Estado | Qué hay de verdad |
|---|---|---|---|
| 1 | nrcs.usda.gov …/Soil Properties Fact Sheet.pdf | NO ENCONTRADA | El servidor no responde desde esta red (503 / corte); la frase no se pudo ver |
| 2 | nrcs.usda.gov …/Erosion Fact Sheet.pdf | NO ENCONTRADA | Igual que la 1 |
| 3 | weather.gov …/wind_profile.html | FALSA | La página no existe (404) |
| 4 | dle.rae.es/zoco («m. PR. … pilotes») | FALSA (probable) | El DLE no abre. El extracto del buscador de dle.rae.es/zoco solo trae «Lugar en que se celebra un zoco» y «desus. Plaza de una población», y el *Diccionario de americanismos* no tiene ninguna acepción de PR |
| 5 | dle.rae.es/bohío («Cabaña de América…») | NO ENCONTRADA | El DLE no abre |
| 6 | dle.rae.es/canoa («Del taíno canoa… hecha comúnmente de un solo tronco») | NO COINCIDE | El DLE no abre; según el extracto del buscador, el DLE dice «Embarcación de remo muy estrecha, ordinariamente de una pieza, sin quilla y sin diferencia de forma entre proa y popa»: no es el texto de Gemini |
| 7 | dle.rae.es/cayuco («(Del caribe o taíno)… fondo plano… a remo») | NO COINCIDE | El extracto del buscador dice otra cosa (la cita de ChatGPT) |
| 8 | dle.rae.es/nasa («Artilugio de pesca…») | NO ENCONTRADA | El DLE no abre |
| 9 | usgs.gov …/water-temperature-and-water-quality | FALSA | La página no existe (404) |
| 10 | transportation.gov/bridge-ferry-definitions | NO ENCONTRADA | Acceso denegado (403) |
| 11 | americanindian.si.edu/nk360/caribbean/canoes | NO ENCONTRADA | No abre (403 / «temporarily unavailable») |
| 13 | weather.gov/safety/safetymirrors | FALSA | La página no existe (404) |
| 14 | osha.gov/noise/hearing-conservation (difracción en lomas) | FALSA | La página no existe (404) |
| 15 | nextgenscience.org/pe/4-ps4-2… | FALSA | La página abre y no tiene esa frase. Dice: «An object can be seen when light reflected from its surface enters the eyes.» Además 4-PS4-2 no habla de banderas |
| 16 | fws.gov/species/puerto-rican-parrot-amazona-vittata (vigilancia en bandada) | FALSA | La página no existe (404) |
| 17 | nextgenscience.org/pe/3-5-ets1-1… | PARCIAL | Abre, pero la frase está cambiada. Dice: «Define a simple design problem that can be solved through the development of an object, tool, process, or system and includes several criteria for success and constraints on materials, time, or cost.» |
| 18 | cdc.gov/niosh/docs/2007-131 («Long loads should be handled by two or more people…») | NO ENCONTRADA | La página sale vacía o da 403; la frase no se pudo ver |
| 19 | casel.org …/what-is-the-casel-framework (escucha activa) | FALSA | La página abre y no dice «active listening», «paraphrasing» ni «reflecting back». Solo dice «communicate clearly, listen actively, cooperate…» |

### Indicadores DEPR 2022

Se abrió el PDF oficial: *Estándares de Contenido y Expectativas de Grado, Programa de Ciencias* (DEPR, julio 2022, 119 págs.), https://dedigital.dde.pr/mod/resource/view.php?id=2854 → https://dedigital.dde.pr/pluginfile.php/145100/mod_resource/content/4/Est%C3%A1ndares%20y%20Expectativas%20Programa%20de%20Ciencias.pdf. Los 23 códigos que ahora tienen los objetivos están en el PDF (se comprobó uno por uno). Los que nombró ChatGPT existen todos (1.CT2.1, 4.CT2.2, 4.IT1.6, 4.IT1.7, 5.IT1.1, 4.CF4.7, 1.CF4.1), pero no todos encajan: 1.CT2.1 habla de los materiales del suelo, no de la infiltración, y no se usó. La correspondencia objetivo ↔ indicador es una propuesta: que la revise un maestro.

| Cap. | Objetivo | depr_2022 |
|---|---|---|
| 2 | E1 terreno | 4.CT2.2 (erosión por agua y viento), 4.CT2.6 |
| 2 | E2 criterios y restricciones | 3.IT1.7, 4.IT1.6 (definir un problema de diseño) |
| 2 | E3 probar y mejorar | 3.IT1.7, 4.IT1.6, 4.IT1.7, 3.CT2.4 (prepararse ante un fenómeno del tiempo) |
| 2 | E4 hábitat | 3.CB2.6, 3.CB2.8 |
| 3 | E1 materiales que flotan | 3.CF1.1, 4.CF1.1 (flotabilidad) |
| 3 | E2 equilibrio del bote | 3.CF2.6, 3.IT1.7, 4.IT1.7 |
| 3 | E3 código de señales | 4.CF4.8 (información codificada, clave morse) |
| 3 | E4 leer el agua y el tiempo | 3.CT2.3 |
| 4 | E1 observar | 3.CB2.3, 3.CB2.6 |
| 4 | E2 beneficios y costos | 4.IT1.6, 4.CA1.7 |
| 4 | E3 decidir y cuidar | 4.IT1.7, 3.CA1.3 |
| 4 | E4 hábitat | 3.CB2.8, 3.CA1.1 |
| 5 | E1 patrones de destellos | 4.CF4.8 |
| 5 | E2 evidencia | 3.IT1.4 (observación, inferencia) |
| 5 | E3 relevo con luz, sonido o tela | 1.CF4.1, 4.CF4.6, 4.CF4.8, 4.IT1.7 |
| 5 | E4 cooperar | por verificar (sin indicador de Ciencias claro) |
| 6 | F1 vivir en grupo | 3.CB2.4 («Explica que algunos animales forman grupos para sobrevivir») |
| 6 | F2 diseñar con criterios | 4.IT1.6, 5.IT1.1, 5.IT1.6 |
| 6 | F3 grupos iguales (36) | por verificar (es de Matemáticas, no está en este PDF) |
| 6 | F4 escuchar y acordar | por verificar (socioemocional, no está en este PDF) |

**Aparte (no es de esta tarea):** en `main` la ficha `esperan` (ep6) vuelve a decir «36 especies… 34 vivas y 2 extintas» porque el cambio de CG-39 se revirtió (`e4356a9f`). La tabla de arriba y la sección CG-39 lo dan por suavizado. Sigue `por_verificar` y no sale al Diario. [KELVIN: decidir].
