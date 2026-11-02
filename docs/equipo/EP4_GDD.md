# GDD Episodio 4 · «El precio del progreso» (15–20 min)

Estado: **PROPUESTA** (tarea AH1), producida en AH2 (`content/ep4/`, `ep4Test`; capturas `docs/img/ah2_ep4_*.jpg`). Historia: `EP4_NARRATIVA.md`. Misiones y lecciones: `EP4_MISIONES.md`. Canon pendiente: §10. Todo lo que no esté CONFIRMADO en `docs/CANON_REGISTRY.md` va con `[KELVIN]`.

**Idea en una frase:** Villa Raíz y la comunidad del otro lado del río quieren unirse por tierra; Vittata descubre que cada forma de cruzar el río da algo y cuesta algo, y que el trabajo de una líder no es encontrar la opción perfecta, sino decidir con todos y cuidar lo que se pierde.

**Premisa de la biblia:** proyecto de desarrollo con beneficios y costos; sin una sola respuesta correcta. Encaja con el tema confirmado (conservación, vivienda y desplazamiento) y prepara la consulta comunitaria de la temporada 3.

**Canon confirmado que se respeta:** Vittata es la protagonista; su defecto es querer hacerlo todo sola. El aprendiz del jugador la acompaña, no la reemplaza. Los guardianes nunca se capturan ni se venden. Ninguna decisión lo maximiza todo (regla narrativa).

## 1. Core loop (30–60 s)
**Observar (qué vive aquí, qué se gana) → anotar una tarjeta de beneficio o de costo en la Balanza del Diario → probar una opción en la maqueta → ver qué gana y qué pierde → conversar y ajustar.** La Balanza nunca da puntos ni un «ganador»: muestra lo que cada opción da y cuesta, con iconos. El objetivo sigue siempre visible (haz y flecha del ep. 1).

## 2. Ritmo
| Min | Beat | Habilidad |
|---|---|---|
| 0–1 | Gancho: la abuela no puede cruzar el río para visitar a la otra comunidad; Vittata ya dibujó un puente | — |
| 1–6 | M1 Lo que hay en la orilla | volar, posarse, observar, bucear (visor de peces) |
| 6–11 | M2 Todas las voces | hablar |
| 11–17 | M3 La maqueta y el acuerdo | agarrar, construir, hablar |
| 17–19 | Construir lo acordado, cuidar lo que costó; giro y gancho al ep. 5 | volar |
| +3 | «Iguaca te pregunta» | hablar |

## 3. Qué se reutiliza (sin código de motor nuevo salvo §4)
| Sistema | Archivo | Uso en el ep. 4 |
|---|---|---|
| Pack de contenido | `content/ep4/*` (nuevo), mismo esquema que `content/ep2` y `content/plantilla` | `AVE.registerPack({ id: 'ep4', meta: { titulo: 'El precio del progreso', capitulo: 4, almacen: 'ep4' } })`; se abre con `?pack=ep4` |
| Misiones por datos | `src/game/misiones.js` | M1–M3 con `hasta: { marca, evento, mision, cerca }` |
| Río Amazonas del mapa | `mapa.agua.rio.puntos`, `G.agua.levelAt`, `agua.ripple/splash` | El cruce: 3 tramos del río marcados como sitios A, B y C (ancho real ~11 m tras R1) |
| Peces y visor | `src/game/rio_vivo.js` | M1: contar peces a la sombra de la orilla en cada tramo |
| Perchas y Observar | `content/cap1/educativa.js` | M1: posarse en el bosquecillo y contar huecos de nido y frutos |
| Fauna y bandada | `src/game/fauna.js`, `src/game/bandada.js` | Vida del bosquecillo; al final, la bandada vuelve (o tarda) según lo elegido |
| Kit de edificios | `G.mundo.edificio()` con `puente_madera`, `muelle_troncos`, `canoa`, `bloque_piedra`, `losa_piedra` | Las tres opciones a escala real y en maqueta (escala 0,1); sin modelos nuevos |
| Kit de entorno | `tabonuco`, `yagrumo`, `ceiba`, `tronco_caido`, `yagrumo_joven` | El bosquecillo; tocones = `tronco_caido` corto; replantar = `yagrumo_joven` |
| Diálogo | `src/game/dialogo.js` | M2 (consulta) y la asamblea de M3; elecciones que cambian la frase, no el desenlace |
| Diario | `src/game/diario.js` | La Balanza (tarjetas de beneficio y costo por opción) por datos del pack, como la tabla 3×3 del ep. 2 |
| Agarre | `src/engine/agarre.js` | M3: llevar las piezas de la maqueta a la mesa de la orilla |
| Personajes del ep. 2 y del ep. 3 | `content/ep2`, `content/ep3` (AG2) | La abuela, el papá y quien navega del ep. 3 (renders oficiales en billboard) |
| Ropero | `pack.ropa` + `assets/models/ropa/*` | Piezas ya modeladas (`lentes_binoculares`, `mano_cuaderno`, `casco_constructor`); sin modelos nuevos |
| Criadero | `src/game/criadero.js`, `content/comun/huevos.js` | `obtener.ep4` en una cápsula (propuesta: la del bosque, ligada a replantar) |
| Cómic | `src/game/comic.js` | `EVENT_DEFS` y `vinetas` del pack (§6) |
| Guardado | `src/engine/guardado.js` | Clave del pack `ep4`; importa del ep. 3 si existe (si quien navega es amigo), si no, valores por defecto |
| Aula | `src/game/aula.js` | Lecciones `ep4`, Nivel 1 y 2, reporte local `amazonaverse.aula.cap4` |
| Música | `src/game/musica.js` | Pistas existentes de la banda sonora; la asamblea usa la calmada |

## 4. Lo nuevo
| Pieza | Pri | Dónde |
|---|---|---|
| Balanza de beneficios y costos: 3 opciones × 4 ejes (Conexión, Bosque, Río, Esfuerzo), cada eje con 1 a 3 hojas; sin suma ni ganador | P0 | `content/ep4/balanza.js` (pack), pintada en el Diario por datos |
| Maqueta en la orilla: colocar la opción a escala y ver una simulación corta determinista (canoa que pasa o no, árboles que se quitan, crecida de prueba) | P0 | `content/ep4/maqueta.js` (pack), reutiliza `edificio()` con escala y la crecida del ep. 1 |
| Asamblea: cada personaje dice qué le importa; el jugador propone una opción y un cuidado | P0 | `content/ep4/historia.js` con `dialogo.js` |
| Cuidados (mitigaciones): replantar, cajas nido, dejar un paso de canoas, sendero a la sombra; se elige uno y se ve en el mundo | P1 | `content/ep4/maqueta.js` |
| Mundo que cambia según lo elegido (tocones, puente o muelle a escala real, bandada que vuelve) | P1 | `G.mundo.edificio()` y el kit de entorno |
| Importar la partida del ep. 3 | P2 | `pack.guardado.importar` (sin partida previa, valores por defecto) |

## 5. Las tres opciones (ninguna lo maximiza todo)
Valores del juego, no datos del mundo real. Hojas en la Balanza: ●●● mucho, ●● medio, ● poco.

| Opción | Conexión | Bosque | Río | Esfuerzo (menos es mejor) | Lo que la hace especial |
|---|---|---|---|---|---|
| **A. Puente en el estrecho** (`puente_madera` + `bloque_piedra`) | ●●● la abuela cruza a pie, todo el año | ● hay que quitar el bosquecillo de la orilla (huecos de nido, sombra) | ●● bajo: las canoas pasan solo con el río bajo | ●● corto, pero muchas vigas | Lo más rápido para cruzar |
| **B. Puente alto río abajo** (`puente_madera` sobre `losa_piedra`, más largo) | ●● el camino es más largo; la abuela necesita descansos | ●●● casi no se corta nada | ●●● alto: las canoas pasan siempre | ● mucho trabajo y muchos días | Lo que menos cambia la orilla |
| **C. Muelles y canoas** (`muelle_troncos` + `canoa`) | ● depende de que alguien reme; con crecida no se cruza | ●●● no se corta nada | ●● los muelles dan sombra, pero hay ir y venir | ●●● poco trabajo | Une a las dos comunidades en el oficio de navegar |

- Todas se pueden elegir y todas terminan el capítulo. La consecuencia se ve en el mundo y en el diálogo, nunca como castigo.
- Cada opción admite **un cuidado** (§4) que mejora un eje sin arreglarlo del todo: la regla «ninguna decisión lo maximiza todo» se mantiene con el cuidado puesto.
- Nivel 2 del Aula: el jugador puede combinar (por ejemplo, A con paso de canoas), lo que sube el Esfuerzo.

## 6. Eventos y cómic (`EVENT_DEFS` del pack)
| Clave | Tipo genérico | Escena de viñeta |
|---|---|---|
| `BridgeIdea` | `QuestAccepted` | Vittata con el plano del puente y la abuela mirando la otra orilla |
| `ShoreSurveyed` | `LocationDiscovered` | El bosquecillo desde una percha, con huecos y frutos |
| `VoicesHeard` | `CharacterMet` | La mesa de la orilla con todos alrededor |
| `TradeoffSeen` | `DialogueChoiceMade` | La Balanza con la frase que eligió el jugador |
| `ModelTested` | `BuildingDamaged` | La maqueta con la canoa de juguete atascada (o pasando) |
| `AgreementMade` | `LandDecisionMade` | Manos (alas) sobre la maqueta |
| `CareChosen` / `ProjectBuilt` | `BuildingRepaired` / `BuildingConstructed` | Lo construido y lo que se cuidó |
| `Chapter4Completed` | `ChapterCompleted` | El primer cruce, con la abuela delante |

Viñetas solo de eventos reales, con el look de ese momento (regla del cómic). Portada: «Capítulo 4 · El precio del progreso».

## 7. Móvil y accesibilidad
Mismos controles del ep. 1 (Acción contextual, Bucear, Agarrar). La Balanza y las tarjetas de la asamblea son botones de 56 px, legibles a 375×812; los ejes llevan icono **y** palabra (no solo color). Modo relajado: la crecida de la maqueta sin sacudida; `prefers-reduced-motion` apaga destellos; subtítulos de sonido para el río y la asamblea. Texto y contraste según D2, teclas según D3.

## 8. Producción (estimación para AH2)
| Rol | Trabajo |
|---|---|
| Gameplay | `content/ep4/*`: Balanza, maqueta, asamblea, cuidados |
| Level designer | 3 tramos del río y el bosquecillo en la escena de Kelvin, lejos de los puentes ya colocados |
| Educativo | `lecciones.js` del ep4 con fuentes; indicadores DEPR por verificar |
| Narrativa | Diálogos ES/EN (`{ es, en }`) |
| QA | `ep4Test` E2E (las 3 opciones × con y sin cuidado), móvil 375×812 |
Sin modelos nuevos. Si AG2 (ep. 3) no está aún, quien navega usa un placeholder `[KELVIN]`.

## 9. Riesgos
| Riesgo | Mitigación |
|---|---|
| Que el niño busque «la respuesta buena» y se frustre | La Balanza no suma; Iguaca lo dice en voz alta: «aquí no hay una sola respuesta» |
| Que cortar árboles se viva como culpa | El costo se nombra con calma y siempre hay un cuidado; los tocones se replantan |
| Que la asamblea sea lenta en clase | 5 voces, 1 tarjeta cada una; la asamblea son 3 elecciones |
| Datos de bosque ribereño sin cita | Por verificar; el juego muestra solo lo que el jugador cuenta |
| Mensaje de «progreso malo» | Los beneficios son reales y se celebran (la abuela vuelve a ver a su familia) |
| Dependencia del ep. 3 | El ep. 4 arranca también sin partida previa |

## 10. Decisiones de canon para Kelvin (no decididas aquí)
Mientras Kelvin decide, el pack usa la opción por defecto que se indica en cada punto, marcada `[KELVIN]` en `nota` o comentario (nunca en el texto del jugador).
1. **[KELVIN] La otra comunidad:** ¿es la misma del ep. 3 (llegaron en bote) y por eso ahora quieren un camino por tierra? ¿Cómo se llama y quién la representa? *Por defecto:* la misma del ep. 3; el gancho nombra el plano de la Vecina (`TEMPORADA1_HILO.md` §5.2) y la comunidad no tiene nombre.
2. **[KELVIN] El proyecto:** ¿puente, como se propone, u otro (camino, presa pequeña, muelle grande)? El diseño sirve para cualquier proyecto con 3 opciones × 4 ejes.
3. **[KELVIN] Quién decide:** ¿asamblea de todos (propuesta), Vittata con consejo, o el jugador solo? ¿Hay voto o consenso?
4. **[KELVIN] El bosquecillo:** ¿tiene huecos de nido de alguno de los 36? Si sí, ¿de quién? (propuesta: del papá del ep. 2 no, su nido ya está en la casa).
5. **[KELVIN] Quien navega:** nombre, especie y voz (personaje del ep. 3). *Por defecto:* es de Villa Raíz y habla por el río y las canoas, no por la otra comunidad (`TEMPORADA1_HILO.md` §5.4).
6. **[KELVIN] El Guardián:** ¿qué recuerda de cómo se cruzaba antes de la Gran Ruptura? (pista para el ep. 5, sin revelar). Conflicto abierto: ¿es cotorra, humano u otra forma?
7. **[KELVIN] La Voz:** ¿dice algo en el ep. 4? Propuesta: una frase corta sobre «lo que se construyó antes» que conecta con el relevo del ep. 5. *Por defecto en el pack:* la Voz no habla; el transmisor solo da estática desde este capítulo (`TEMPORADA1_HILO.md` §5.5) y es el Guardián quien **recuerda** (no oye) que alguien de antes cruzó aquí y los llamaba por el aparato (§5.10: la Voz solo llega por el transmisor y la luz).
8. **[KELVIN] Martinicana y violacea como consejeras:** ¿asoman ya o se guardan para el ep. 5 (donde se revelan)? Propuesta: se guardan.
9. **[KELVIN] Continuidad:** ¿la opción elegida queda en el mapa de los capítulos 5 y 6?
10. **[KELVIN] Papel del aprendiz** en la asamblea (¿habla por alguien, lleva la maqueta, propone el cuidado?).
