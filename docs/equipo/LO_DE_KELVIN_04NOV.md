# Lo que solo puede resolver Kelvin (4-nov-2026)

Lista única para trabajar con otra IA. Junta lo abierto de `PENDIENTES_KELVIN.md`, `DECISIONES_KELVIN_LISTA.md`, `BUGS.md` y la Directiva V17. Las respuestas K del 4-nov («K8 C, K25 B… todas las demás A») ya están aplicadas y no se repiten aquí.

**4-nov ~21:00 UTC · Kelvin contestó P, L, E, H y A:** respuestas completas en `docs/DIRECTIVA_PLEHA_04NOV.txt` y resumen en `docs/DECISION_LOG.md`. Siguen abiertas solo las pruebas físicas P1–P4 y A9 (capturas de BM133/BM134).

**Cómo devolverlo:** escribe el número y la letra, por ejemplo «P3 a, E2 b, D7 sí». Si un punto no se contesta, se queda como está hoy.

---

## Prompt para pegarle a ChatGPT

> Soy Kelvin García, creador de Amazona Verse, un juego 3D de aventura para niños y familias sobre las cotorras del Caribe. La protagonista es Vittata, la cotorra puertorriqueña. Debajo tienes las decisiones que me tocan. Ayúdame a decidir cada una con estas reglas:
> 1. Dame una recomendación corta por punto y el porqué en una línea.
> 2. En los puntos de datos educativos (sección E), **solo vale una fuente verificable**: enlace a la página oficial (DRNA, USFWS, UICN/Lista Roja, BirdLife, Registro Nacional de Lugares Históricos). Si no encuentras la fuente exacta, dilo y no inventes.
> 3. No me propongas cambiar el modelo de Vittata, las 36 especies, los seis capítulos ni las mecánicas que ya existen.
> 4. Nada de loot boxes ni presión de compra. Es para niños.
> 5. Devuélveme al final una sola línea con mis respuestas en el formato «P1 a, P2 b…».

---

## P · Pruebas en aparatos de verdad (solo tú las puedes hacer)

| # | Qué | Cómo |
|---|---|---|
| P1 | **iPhone (QA-110)**: ¿ya no se cierra? | Abre `amazona-verse.vercel.app/juego/#fps`. Despega, vuela a la ciudad, entra y sal. Anota si hubo pantalla blanca y qué FPS marca. |
| P2 | **iPad (QA-106)**: antes iba a 28 FPS con 8,1 M de triángulos | Igual, con `#fps`, volando de Villa Raíz al tepuy. Manda una foto del contador. |
| P3 | **Android**: confirmar | Ya iba a 60 FPS. Solo confirma que el cap. 1 llega al final. |
| P4 | **Prueba con tu hijo** (cap. 1) | Cronometra cuánto tarda y dónde se atasca. Lo de «bajar de 30 s el primer paso» depende de lo que veas. |
| P5 | **Router de casa** | El router bloquea github.com en la Mac. Entra a `http://192.168.1.1` y busca «Control parental», «Filtro de sitios» o «Access Control». Mientras tanto, la Mac usa el hotspot del iPhone. |

## L · Legal y dinero

| # | Decisión | Opciones |
|---|---|---|
| L1 | Licencias de las piezas 3D de terceros: KitBash3D Savage y Ancient, Archmodels vol. 61, palmeras, hierba, losas y `canoa.jpg` | (a) archivar los recibos que ya tienes; (b) comprar o sustituir lo que no tenga recibo |
| L2 | Política «solo CC0» | (a) ampliarla a lo comprado con licencia (KitBash3D, Suno); (b) sustituir lo que no sea CC0 |
| L3 | COPPA y privacidad infantil | (a) contratar ya la revisión de un abogado; (b) después del piloto cerrado |
| L5 | Google Fonts: Google ve la IP del niño | (a) servir las fuentes desde el juego, recomendado; (b) dejarlas como están |
| L6 | Bandera de PR en ropa y ventas (Ley 5282) | (a) revisión legal formal; (b) seguir como hasta ahora |
| L7 | Precios, licencia escolar y fondos (`MODELO_NEGOCIO.md`) | (a) fijar precios; (b) seguir sin cifras públicas |
| L8 | Cartas del Álbum en pixel art: ¿se venden? | (a) lo defines tú; (b) por ahora no |
| L9 | Modo creador: ¿se comparte lo creado? | (a) solo en el dispositivo; (b) compartir con moderación, lo que exige la revisión COPPA antes |
| L10 | Tamaño de la build (~223 MB) | (a) sin límite; (b) poner topes |

## E · Datos educativos (cada uno necesita fuente oficial)

| # | Dato | Si no hay fuente |
|---|---|---|
| E1 | Cotorra: 2 a 4 huevos, 24 a 28 días de incubación, radiotransmisores. Falta la cita DRNA o USFWS | Se deja con la fuente secundaria actual |
| E2 | Coquí «canta del atardecer al amanecer». Falta la cita del DRNA | (b) se deja; (c) se suaviza la frase |
| E3 | Cap. 6: «34 vivas y 2 extintas» de las 36. Confirmar con la Lista Roja de la UICN | Sigue «por verificar» y no se dice en voz alta |
| E4 | Estado UICN de 13 especies en las que el catálogo y BirdLife no coinciden (`ESPECIES_DISCREPANCIAS.md`) | (a) usar BirdLife; (b) usar el catálogo; (c) decidir especie por especie |
| E5 | Mariposa del cap. 1: ¿la cebra es común en El Yunque? (la arlequín no es de El Yunque) | Sigue la cebra, con nota |
| E6 | Canoa taína y nasa taína (cap. 3): ¿herencia taína verificada? | (a) verificar antes de publicar; (b) quitar el dato |
| E7 | Fiesta de techado y la décima (cap. 2): ¿costumbre real? | (a) verificar; (b) quitarla |
| E8 | Zocos (cap. 2): ¿hay fuente histórica? | Se queda como «narrativo», la casa del juego |
| E9 | «La casa criolla» (teja o zinc). La fuente es el Registro Nacional n.º 90000767 | Se queda la ficha como está |

## H · Historia y canon (capítulos 2 a 6)

| # | Decisión | Opciones |
|---|---|---|
| H1 | Guion del cap. 1 (`CHAPTER_01_SCRIPT.md` sigue «propuesto») | (a) aprobar tal cual; (b) aprobar con cambios; (c) pendiente |
| H2 | Guardián (K35 B): llega después de la crecida. Verificado: cambiar el orden rompe la misión del cap. 1 | (a) se queda como hoy; (b) reescribir la misión para que llegue después |
| H3 | Por qué las voces hablan «desde ahora» | (a) pista sin explicar hasta la temporada 5; (b) insinuarlo en el ep. 6; (c) cambiar la línea |
| H4 | Martinicana y violacea como consejeras | (a) desde el ep. 5, formales en el 6; (b) asoman ya en el ep. 2; (c) no son consejeras |
| H5 | Qué recuerda el Guardián | (a) recuerda que eran 36 y las torres, y olvida el río y los nombres; (b) lo recuerda todo y calla; (c) otra |
| H6 | El pacto antiguo | (a) una promesa en tres partes, sin objeto; (b) un objeto: el emblema; (c) sin texto |
| H7 | La Voz en el ep. 4 | (a) una frase corta por el transmisor; (b) calla |
| H8 | Quién enciende la luz de la niebla | (a) las dos voces; (b) la otra comunidad del ep. 3 |
| H9 | Símbolo de los 36 en la otra comunidad | (a) lo tienen y su mitad del mensaje encaja; (b) no lo tienen |
| H10 | Cap. 2: el hogar | (a) comunitario; (b) de Vittata e Iguaca |
| H11 | Cap. 3: la canoa | Nombre (sin nombre o una lista); ¿el Guardián despide o va?; ¿qué se intercambia? |
| H12 | Cap. 5: las torres | (a) de los guardianes; (b) de «la gente de antes». ¿Qué piden las voces al final? |
| H13 | Cap. 6: mediación y cierre (los seis visitantes ya se quedan) | Lo que falta, en las notas KELVIN-1 a 11 de `content/ep6/pack.js` |
| H14 | El aprendiz y el huevo del papá | Aprendiz: (a) acompaña sin hablar; (b) tiene líneas. Huevo: ¿nace en el ep. 5 o antes? |
| H15 | Continuidad entre partidas | (a) cada capítulo arranca igual; (b) lo elegido queda en el mapa |
| H16 | Idioma | (a) se queda bilingüe, como hoy; (b) español, con inglés solo en el Aula |
| H17 | Duración meta de un capítulo | 10-15, 20-30 o 45 min |
| H18 | Zonas por capítulo (`MUNDO_UNICO.md`): Caney del Meandro (2), Puerto de La Mina (3), río al este de Villa Raíz (4), Los Miradores de noche (5), Ciudad de los 36 (6) | (a) confirmar; (b) cambiar |
| H19 | «14 capítulos / multiverso» | (a) lo describes tú; (b) se sigue con las 6 temporadas de `STORY_BIBLE.md` |
| H20 | Amazona Maze y el tren, fuera del menú | (a) siguen fuera; (b) volver a mostrarlos |

## A · Arte (aprobar o mandar tus archivos)

| # | Decisión | Opciones |
|---|---|---|
| A1 | Arte definitivo del Guardián (*imperialis*) y de su medalla (K34, K36) | ¿Tienes los diseños? Si no, (a) se queda el actual |
| A2 | Retratos de Iguaca, el Guardián y demás: sprites 2D junto a una Vittata 3D | (a) publicar así; (b) esperar tus modelos |
| A3 | Familia de Iguaca (la Abuela y el Papá): ¿el aspecto de los retratos actuales es el definitivo? | (a) sí; (b) cambiar |
| A4 | Las extintas: martinicana y violacea | (a) usar las pieles propuestas; (b) tu diseño; (c) no se ven |
| A5 | La máquina experimental y el transmisor | (a) se quedan los genéricos; (b) tus modelos |
| A6 | Retrato del aprendiz | (a) genérico; (b) el personaje que crea el jugador; (c) diseño propio |
| A7 | Pieles de *pretrei* y *tucumana* hechas solo con fuentes | (a) se quedan; (b) revisarlas; (c) tus renders |
| A8 | Ropero (15 trajes) | (a) aparcado; (b) retomarlo ya |
| A9 | Color de la Ciudad de los 36 contra tu imagen meta | Aprobar la captura cuando BM133 y BM134 la suban |
