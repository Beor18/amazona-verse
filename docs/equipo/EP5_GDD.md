# GDD Episodio 5 · «Las voces olvidadas» (15–20 min)

Estado: **PROPUESTA** (tarea AI1). Historia: `EP5_NARRATIVA.md`. Misiones y lecciones: `EP5_MISIONES.md`. Canon pendiente: §10. Todo lo que no esté CONFIRMADO en `docs/CANON_REGISTRY.md` va con `[KELVIN]`.

**Idea en una frase:** Vittata descifra los mensajes rotos del transmisor, lee en las ruinas lo que el Guardián ya no recuerda y arma con otros un relevo de señales hasta oír con claridad a las dos voces extintas, que hablan «desde ahora».

**Canon confirmado que se respeta:** la Voz del transmisor son los dos guardianes extintos (inspirados en *Amazona martinicana* y *Amazona violacea*); en el cap. 1 salió con retrato neutro y Vittata dijo «esa voz es de ahora». Aquí se revela **quiénes** son; **cómo se presentan** (una voz o dos, su aspecto) y **por qué** hablan desde el presente quedan para Kelvin (§10). Vittata es la protagonista; su defecto es querer hacerlo todo sola.

## 1. Core loop (30–60 s)
**Escuchar o buscar una pista → anotarla en el Diario (fragmento de mensaje o de memoria) → probar una hipótesis (qué dice, dónde va la siguiente estación) → ver si la señal mejora → corregir.** El objetivo sigue siempre visible (haz y flecha del ep. 1).

## 2. Ritmo
| Min | Beat | Habilidad |
|---|---|---|
| 0–1 | Gancho: el transmisor capta a la vez dos voces que se pisan | — |
| 1–6 | M1 Mensajes en pedazos | hablar, observar |
| 6–11 | M2 Lo que recuerdan las piedras | volar, posarse, observar |
| 11–17 | M3 El relevo | volar, agarrar, posarse, hablar |
| 17–19 | Revelación: las dos voces se oyen enteras; gancho al ep. 6 | — |
| +3 | «Iguaca te pregunta» | hablar |

## 3. Qué se reutiliza (sin código de motor nuevo salvo §4)
| Sistema | Archivo | Uso en el ep. 5 |
|---|---|---|
| Pack de contenido | `content/ep5/*` (nuevo), mismo esquema que `content/ep2` y `content/plantilla` | `AVE.registerPack({ id: 'ep5', meta: { titulo: 'Las voces olvidadas', capitulo: 5, almacen: 'ep5' } })` |
| Misiones por datos | `src/game/misiones.js` | M1–M3 con `hasta: { marca, evento, mision, cerca }` |
| Transmisor y luz de la niebla | `content/cap1/mundo.js` (`TRX`, `luzMirador.parpadear(n)`) | El transmisor del taller (con la antena doblada del cap. 1) es el centro de M1 y M3; la luz parpadea con patrones |
| Ruinas del mapa | `assets/data/mapa_cap1.js` (ya colocadas: 2 `ruina_torre`, 2 `ruina_mirador`, 2 `ruina_pilar`, 1 `ruina_portal`, 1 `ruina_altar`) | Escenario de M2 y estaciones del relevo de M3; sin modelos nuevos |
| Mirador | `content/cap1/mundo.js` (`PLACES.mirador`, plataforma) | Última estación del relevo y escena final |
| Perchas y Observar | `content/cap1/educativa.js` | Leer marcas en las ruinas (M2) y comprobar la línea de vista (M3) |
| Agarre | `src/engine/agarre.js` | Llevar las piezas del relevo (espejo, tela, tambor) a cada estación |
| Diálogo | `src/game/dialogo.js` | Escenas, elecciones que cambian la frase y no el desenlace |
| Personajes | billboards de renders oficiales (como Iguaca y el Guardián) | Los dos residentes del ep. 2 y quien navega del ep. 3 atienden estaciones del relevo [KELVIN: si salen] |
| Ropero | `pack.ropa` + `assets/models/ropa/*` | Piezas ya modeladas: `mano_linterna` (M1), `mano_lupa` (M2), `mano_bandera` (M3, bandera de PR fiel según `BANDERA_PR_GUIA.md`); sin modelos nuevos |
| Criadero | `src/game/criadero.js`, `content/comun/huevos.js` | `obtener.ep5` en una cápsula; la cría del ep. 1 acompaña (`almacen: 'amazonaverse'`, como el ep. 2) |
| Cómic | `src/game/comic.js` | `EVENT_DEFS` y viñetas del pack (§6) |
| Guardado | `src/engine/guardado.js` | Partida propia `ep5`; importa del ep. 1 la ropa y la cría si existen |
| Aula | `src/game/aula.js` | Lecciones `ep5`, Nivel 1 y 2, reporte local |
| Especies | `content/comun/especies.js` (`extintas`) | Fichas de *A. martinicana* y *A. violacea* ya con fuentes (UICN, Du Tertre 1654, Labat 1742) |

## 4. Lo nuevo
| Pieza | Pri | Dónde |
|---|---|---|
| Sintonizar el transmisor: una rueda de 5 posiciones (no un dial fino), cada una devuelve un fragmento distinto; tarjetas de fragmentos en el Diario | P0 | `content/ep5/transmisor.js` (pack), panel con botones de 56 px |
| Ordenar fragmentos y patrones (corto-largo, número de destellos) para reconstruir un mensaje | P0 | `content/ep5/transmisor.js`; tarjetas como las de necesidades del ep. 2 |
| Marcas de las ruinas: 5 «recuerdos» del Guardián, uno por ruina, que completan frases suyas con huecos | P0 | `content/ep5/historia.js`; decal o sprite sobre las ruinas existentes |
| Relevo de 3 estaciones con línea de vista determinista (sin azar): la señal pasa si no hay un obstáculo del mapa entre dos estaciones | P0 | `content/ep5/relevo.js`; usa la altura del terreno (`mapa_cap1_altura.js`) para el rayo |
| Tres códigos a elegir (luz, sonido, tela), cada uno con una ventaja y un costo | P0 | `content/ep5/relevo.js` |
| Retratos de las dos voces | P1 | `pack.js` (`RETRATO_VOZ`); **hasta que Kelvin decida**, siguen neutros (onda) aunque ya se diga quiénes son |
| Coro final de señales: las estaciones se encienden en cadena hacia la niebla | P2 | reutiliza `luzMirador` y los sprites aditivos del cap. 1 |

## 5. Decisiones del jugador y consecuencias
- **Orden de los fragmentos (M1):** se puede probar cualquier orden; uno incorrecto da una frase sin sentido que Iguaca comenta con humor. Nunca bloquea.
- **Qué recuerdo leer primero (M2):** libre; el orden cambia qué hueco de la memoria del Guardián se llena antes, no el desenlace.
- **Dónde poner las estaciones (M3):** hay más alturas que estaciones. Una estación sin línea de vista se marca y se mueve; no hay castigo.
- **Qué código usar (M3):** ninguna opción lo maximiza todo (regla de la biblia):
  - **luz** (espejo o fuego): llega lejos, pero no atraviesa la niebla y de día cuesta verla;
  - **sonido** (tambor o silbido): pasa la niebla y los árboles, pero llega corto y el viento lo lleva;
  - **tela** (banderas): se ve de día y no se pierde con el ruido, pero es lenta y de noche no sirve.
  El mensaje llega con cualquiera; cambia cuántas estaciones hacen falta y qué parte del mensaje se oye primero.
- **Pedir ayuda (M3):** Vittata no puede atender tres estaciones a la vez. Si intenta hacerlo sola, la señal se corta en la estación vacía (sin castigo) y alguien se ofrece. Es el puente al ep. 6.

## 6. Eventos y cómic (`EVENT_DEFS` del pack)
| Clave | Tipo genérico | Escena de viñeta |
|---|---|---|
| `TwoVoicesHeard` | `QuestAccepted` | El transmisor con dos ondas que se pisan |
| `FragmentsOrdered` | `PuzzleSolved` | Las tarjetas del mensaje en la mesa del taller |
| `RuinsRead` | `LocationDiscovered` | Vittata posada en una ruina, la marca a la vista |
| `GuardianRemembered` | `CharacterMoment` | El Guardián con un recuerdo a medias [KELVIN: cómo se ve el Guardián] |
| `RelayBuilt` | `BuildingConstructed` | Las tres estaciones vistas desde arriba |
| `CodeChosen` | `DialogueChoiceMade` | El código que eligió el jugador |
| `HelpAsked` | `CharacterMet` | Quién atiende cada estación |
| `VoicesRevealed` | `StoryRevealed` | La revelación (retrato según §10.1) |
| `Chapter5Completed` | `ChapterCompleted` | La cadena de luces hacia la niebla |

Viñetas solo de eventos reales, con el look de ese momento (regla del cómic). Portada: «Capítulo 5 · Las voces olvidadas». `PuzzleSolved`, `CharacterMoment` y `StoryRevealed` son propuestas: si no existen entre los tipos genéricos del motor, se usa el genérico más cercano (`DialogueChoiceMade`) en vez de tocar el motor.

## 7. Móvil y accesibilidad
Mismos controles del ep. 1 (Acción contextual, Bucear, Agarrar). La rueda del transmisor y las tarjetas son botones de 56 px. **Todo lo sonoro tiene equivalente visual:** cada fragmento de la Voz sale con subtítulo y con su onda; el código de sonido se ve también como pulsos en pantalla, así que un jugador sordo o sin audio puede terminar con cualquier código. Los patrones de luz respetan `prefers-reduced-motion` (destellos suaves, sin parpadeo rápido, nunca más de 3 por segundo). Modo relajado: el relevo marca dónde hay línea de vista desde el principio. Texto y contraste según D2, teclas según D3.

## 8. Producción (estimación)
| Rol | Trabajo |
|---|---|
| Gameplay | `content/ep5/*`: transmisor, recuerdos, relevo y su línea de vista |
| Level designer | Marcar las ruinas existentes que se usan y 5 alturas candidatas del relevo (sin mover el mapa) |
| Educativo | `lecciones.js` del ep. 5 con fuentes; indicadores DEPR por verificar |
| Narrativa | `dialogos` ES/EN, con los `[KELVIN]` de §10 |
| QA | `ep5Test` E2E de principio a fin, ES y EN, capturas en escritorio y 375×812 |
Sin modelos nuevos de ropa ni de personajes.

## 9. Riesgos
| Riesgo | Mitigación |
|---|---|
| Revelar demasiado del canon antes de que Kelvin decida | Se dice **quiénes** son (confirmado); lo demás, `[KELVIN]` y retrato neutro |
| Tratar la extinción con tristeza excesiva o con datos inventados | Cuidado científico: solo lo que dicen las fichas de `especies.js`; las causas de su extinción van **por verificar**; tono de memoria y esperanza, no de culpa |
| Que un puzzle de sonido excluya a quien no oye | Equivalente visual de todo (§7) |
| Que el relevo sea tedioso en una clase de 45 min | 3 estaciones, alturas marcadas, mover una estación es un solo gesto |
| Línea de vista confusa | El rayo entre estaciones se dibuja; si choca, se ve dónde |
| Dependencia de los eps. 2–4 | El ep. 5 arranca sin partida previa; quien atiende las estaciones tiene un sustituto (Iguaca, el aprendiz del jugador) |

## 10. Decisiones de canon para Kelvin (no decididas aquí)
1. **[KELVIN] Cómo se presentan las dos voces:** ¿una voz a coro o dos voces distintas? ¿Se ven (render de su especie, silueta, onda de dos colores) o solo se oyen? ¿Dicen su nombre? Hoy en el juego son el retrato neutro de la Voz.
2. **[KELVIN] Por qué hablan «desde ahora»:** el ep. 5 deja la pista sin explicarla (propuesta: el «porqué» se guarda para la temporada 5, «El secreto de los guardianes»). ¿Se insinúa algo aquí?
3. **[KELVIN] Nombres de los dos guardianes extintos** (si los tienen) y si se llaman como su especie.
4. **[KELVIN] Qué recuerda y qué olvidó el Guardián**, y por qué tiene la memoria incompleta. Conflicto abierto del registro: ¿el Guardián es cotorra, humano u otra forma?
5. **[KELVIN] La medalla del Guardián** (ep. 1, colgada en la puerta en la propuesta del ep. 2): ¿se explica aquí?
6. **[KELVIN] Las ruinas:** ¿son de los guardianes, de la gente de antes de la Gran Ruptura o de otra cosa? ¿Qué dicen las marcas?
7. **[KELVIN] La luz de la niebla:** ¿la encienden las dos voces? ¿Es la «otra comunidad» del ep. 3?
8. **[KELVIN] Martinicana y violacea como consejeras** (idea PROVISIONAL de Kelvin): ¿empieza aquí ese papel?
9. **[KELVIN] Quién atiende las estaciones del relevo:** los residentes del ep. 2, quien navega del ep. 3, Iguaca, el aprendiz del jugador.
10. **[KELVIN] Qué piden las voces al final** (propuesta: reunir a los que quedan del pacto de los 36, gancho al ep. 6).
