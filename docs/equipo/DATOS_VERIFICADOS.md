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
