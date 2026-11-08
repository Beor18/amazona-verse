# Datos verificados (AQ1, 27-oct-2026)

Barrido de `grep -rn "por verificar" content src` (y `por_verificar` en las lecciones). Para cada dato del mundo real se buscó
una fuente de las aceptadas en TAREAS_API (USFWS, DRNA, IUCN, eBird/Cornell, artículos científicos, Archivo General de PR).
Regla: solo pasa a «verificado» si la fuente dice el dato tal cual. **Resultado: ningún texto del juego cambió de estado.**
Ningún dato se pudo confirmar palabra por palabra en una fuente aceptada. Abajo queda lo que se encontró, para el Educativo.

No se tocaron `content/ep3` ni `content/ep4`. Además, `content/ep2`, `ep4`, `ep5` y `ep6` tienen `pack.js` con cambios de otros sin
commit. Las pruebas de ep2, ep3 y ep6 (`pack.js`) exigen hoy que las fichas sigan en `por_verificar`. Si una ficha cambia de estado,
hay que cambiar esa prueba en el mismo commit.

## Datos del juego

| Dato | Archivo | Fuente encontrada | Estado |
|---|---|---|---|
| Cartel del rescate: la cotorra anida en huecos de árboles (sobre todo palo colorado) y en cajas nido; los pichones salen del nido a los 60–65 días | `src/game/rescate.js:51-55`, `content/cap1/en.js:1246` | La ficha USFWS (fws.gov/species/puerto-rican-amazon-amazona-vittata) solo trae la dieta en el texto que se pudo leer. Hay un documento del USDA Forest Service (fs.usda.gov, fseprd699773.pdf) que, según el buscador, dice «palo colorado is the primary tree species used for nesting» y «60-65 days for the chicks to fledge», pero el enlace da 404. Artículos sobre nidos artificiales en SORA (Wilson Bulletin 108(1):164-166) redirigen sin dar el texto. | por verificar (candidata: USFS / plan de recuperación USFWS 2009) |
| El coquí canta «del atardecer al amanecer» (que es nocturno ya está verificado con USGS NAS) | `content/cap1/misiones.js:80`, `src/game/atardecer.js:3` (comentarios) | Beard et al., eLife 2022 («The big potential of the small frog *Eleutherodactylus coqui*», elifesciences.org/articles/73401) dice «small, nocturnal, terrestrial frogs» y «peak calling in males is between dusk and midnight» (Woolbright 1985). No dice «hasta el amanecer». Una ficha sin autor en un servidor federal (SE ARMI) dice «dusk to dawn», pero sin autoría confirmada. No hay página del DRNA. | por verificar (lo nocturno ya está verificado) |
| A principios del siglo XX un tren de vía estrecha rodeaba casi toda la isla y llevaba la caña a las centrales; empresa: American Railroad Company of Porto Rico | `src/game/tren.js:117` | Solo fuentes secundarias: Wikipedia, «American Railroad Company» y «Rail transport in Puerto Rico», con vía de un metro. No se consultó el Archivo General de PR. | por verificar (secundaria: Wikipedia) |
| El servicio de pasajeros del tren terminó a mediados del siglo XX | `src/game/tren.js:119` | Wikipedia («American Railroad Company»): pasajeros hasta 1953 y fin de toda operación en 1957. Un blog da 1951. «Mediados del siglo XX» encaja, pero la fuente es secundaria. | por verificar (secundaria; si se confirma, 1953) |
| Ficha del Diario sobre la conducta en bandada de *Amazona* | `content/ep6/lecciones.js:54` | No se buscó: `ep6/pack.js` tiene cambios sin commit y su prueba exige `por_verificar`. Candidatas: Cornell Birds of the World, USFWS. | por verificar |
| Fichas del Diario del ep. 2: arena y barro, pendiente, viento, zocos, techo de zinc, bohío | `content/ep2/lecciones.js:53-58` | No se buscaron, por la prueba de `ep2/pack.js:820` (cambios ajenos sin commit). Fuentes propuestas en cada ficha: USDA/USGS/ICP. | por verificar |
| Fichas del Diario del ep. 3: flotar, brisa, coco, canoa, cayuco, nasa | `content/ep3/lecciones.js:52-57` | Regla de la ronda: ep3 no se toca. | por verificar |
| Fichas del Diario del ep. 4 | `content/ep4/lecciones.js` | Regla de la ronda: ep4 tiene cambios sin commit, así que no se toca. | por verificar |
| Fichas del Diario del ep. 5: espejo, tambor, banderas (las marcas y el 36 son canon del juego) | `content/ep5/lecciones.js:45-50` | Son fichas de física básica con fuente NGSS «pendiente». No se buscó fuente externa, porque `ep5/pack.js` tiene cambios ajenos. | por verificar |
| Indicadores DEPR 2022 de cada lección | `content/ep2`, `ep3`, `ep4`, `ep5`, `ep6/lecciones.js` (`depr_2022`) | Hay que sacarlos del documento oficial del DEPR (dedigital.dde.pr). No se pudo leer sin cuenta. | por verificar |
| Estado UICN del loro imperial en el Diario | `content/cap1/pruebas.js:731`, `src/game/diario.js:63` | Es intencional: la prueba exige que *A. imperialis* muestre «por verificar» hasta confirmarlo en iucnredlist.org. | por verificar (a propósito) |

## Lo que ya estaba verificado y se confirmó en esta revisión

| Dato | Archivo | Fuente | Estado |
|---|---|---|---|
| La cotorra puertorriqueña come sobre todo frutos silvestres, en especial de la palma de sierra | `src/game/banquete.js:38-40` | USFWS, ficha de *Amazona vittata*: «This bird feeds chiefly on wild fruits, particularly the sierra palm» (consultada el 27-oct-2026) | verificado |
| La cotorra está en peligro según la ley federal (dato de contexto; el juego no lo afirma) | — | USFWS, 2009: «federally listed as an endangered species in 1967» (fws.gov/story/2009-06/puerto-rican-parrot-recovery-plan-available) | verificado |
| El coquí es nocturno | `content/cap1/misiones.js:80` | USGS NAS («nocturnal insectivores») y eLife 2022 («nocturnal, terrestrial frogs») | verificado |

## Siguiente paso sugerido
- Rescate: conseguir el PDF del plan de recuperación de USFWS (2009) en ecos.fws.gov, o la ficha del USFS. Si dice «palo colorado»
  y «60-65 days», cambiar la cita de `rescate.js` y `en.js` a esa fuente, sin «por verificar».
- Coquí: cambiar el texto a «canta sobre todo del atardecer a la medianoche» (eLife 2022) o confirmar «hasta el amanecer» con el DRNA.
- Tren: pedir al Archivo General de PR o al ICP una fuente primaria para la red de vía estrecha y para el fin del servicio en 1953.

## Segunda ronda (8-nov-2026, tarea BM84 de seguimiento)

Estado real de las fichas de BM84 (`EDUCATIVO_EP2_EP6.md`, 31 datos): **27 verificadas, 1 narrativa (zocos), 2 canon, 1 cifra del catálogo (36; Kelvin la mantiene como canon, E3)**. Los «9 parciales» y «10 por verificar» del ROADMAP ya estaban cerrados el 2-nov y el 4-nov. Quedaban los datos de esta página; se investigaron con búsqueda web. Consultado el 8-nov-2026. Sin cambios en los textos del juego (ningún dato resultó erróneo).

| Dato | Veredicto | Fuente (título, URL) | Nota |
|---|---|---|---|
| Rescate: la cotorra anida en huecos de árboles, sobre todo de palo colorado | parcial | American Federation of Aviculture, *Puerto Rican Amazon* https://parrots.org/encyclopedia/puerto-rican-amazon: «palo colorado *Cyrilla racemiflora* zone, important for nesting»; temporada «February-June in tree cavities». Las cajas nido: ver BM84 (SORA / AFA) en `EDUCATIVO_EP2_EP6.md` | La fuente habla de la zona de palo colorado, no de «el árbol». Texto del juego razonable, sin cambio. Falta USFWS/USFS (fs.usda.gov da 404; webarchive.unt.edu da 503) |
| Rescate: los pichones salen del nido a los 60–65 días | parcial | AFA, misma página: edad al dejar el nido «About 9 weeks» (≈63 días) | Compatible con 60–65. Sigue «por verificar» en USFWS; la cifra en días solo la da el extracto del buscador del USFS |
| Coquí: canta «del atardecer al amanecer» (comentarios de `atardecer.js`, `misiones.js`) | parcial | NWF, *Puerto Rican Coquí* https://nwf.org/Educational-Resources/Wildlife-Guide/Amphibians/Puerto-Rican-Coqui: «can be heard from dusk until dawn all over the island»; eLife 2022 (Beard et al.) https://elifesciences.org/articles/73401: «peak calling in males is between dusk and midnight» | Sin fuente oficial (USGS NAS da 403, DRNA sin página). Si el juego lo dijera a niños: «canta sobre todo de noche» es lo seguro |
| Tren: red de vía estrecha, American Railroad Company of Porto Rico | sin fuente primaria | Wikipedia, *American Railroad Company* https://en.wikipedia.org/wiki/American_Railroad_Company y *Rail transport in Puerto Rico* https://en.wikipedia.org/wiki/Rail_transport_in_Puerto_Rico | Solo secundarias. Sigue «por verificar» |
| Tren: pasajeros terminan a mediados del siglo XX | sin fuente primaria (consistente) | Wikipedia (mismas): pasajeros hasta 1953, toda operación hasta 1957. Un blog (trenopedia) dice 1954 | «Mediados del siglo XX» es correcto con cualquiera de las fechas |
| Estado UICN de *A. imperialis* en el Diario | verificado | BirdLife DataZone, *Imperial Amazon* https://datazone.birdlife.org/species/factsheet/imperial-amazon-amazona-imperialis: En peligro crítico (2019: C2a(i,ii); D; 2021: A4acd; C1+2a(i,ii); D) | Ficha UICN e.T22686411A154800996. Ver `ESPECIES_DISCREPANCIAS.md` |
| Fichas de ep2–ep6 que aquí figuraban «por verificar» | cerradas | Ver `EDUCATIVO_EP2_EP6.md` (2-nov y 4-nov) | 18 verificadas por Kelvin + 6 publicadas con fuente |
| Indicadores `depr_2022` | sin verificar | — | Requieren el documento del DEPR (sin acceso) |

Recuento de esta ronda: **verificado 1 (imperialis), parcial 3 (cartel de nido, 60–65 días, coquí), sin fuente primaria 2 (tren), sin verificar 1 (depr_2022), corregidos 0.**
Bloqueados desde esta red: fs.usda.gov (404), webarchive.unt.edu (503), nas.er.usgs.gov (403), corpora.tika.apache.org y digitalcommons.usf.edu/SORA (sin acceso o redirección).
