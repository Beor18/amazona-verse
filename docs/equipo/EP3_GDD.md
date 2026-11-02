# GDD Episodio 3 · «Más allá de la bahía» (15–20 min)

Estado: **PROPUESTA** (AG1, 26-oct). Historia: `EP3_NARRATIVA.md`. Misiones y lecciones: `EP3_MISIONES.md`. Canon pendiente: §10, con el marcador `[KELVIN]`. Implementación: AG2, en `content/ep3/` (sale de `content/plantilla/`, como `content/ep2/`).

**Idea en una frase:** Vittata construye con todos su primer bote y aprende que, para llegar lejos, a veces el timón lo lleva quien sabe leer el agua: prueba qué flota, acuerda señales con la navegante y cruza la bahía hasta otra comunidad.

**Por qué un bote si Vittata vuela:** la abuela vuela poco, el huevo del papá no se lleva en el pico y Villa Raíz quiere llevar carga (semillas, fibra, herramientas) para intercambiar. El bote es de todos.

## 1. Core loop (30–60 s)
**Probar o preguntar → anotar en el Diario (tabla de flotación, código de señales) → decidir → ver la consecuencia en el agua → ajustar.** El objetivo sigue siempre visible (haz y flecha del ep. 1). En el agua, el bucle es más corto: leer la señal de la navegante → girar o remar → ver cómo responde la canoa.

## 2. Ritmo
| Min | Beat | Habilidad |
|---|---|---|
| 0–1 | Gancho: el plano del bote en la mesa de todos; la luz de la niebla, ahora sobre el mar | — |
| 1–6 | M1 ¿Qué flota? | agarrar, bucear, construir |
| 6–11 | M2 Leer el agua | hablar, posarse, remar (práctica en el río) |
| 11–17 | M3 Más allá de la bahía | remar, seguir señales, hablar |
| 17–19 | Llegada, intercambio y gancho al ep. 4 | hablar |
| +3 | «Iguaca te pregunta» | hablar |

## 3. Qué se reutiliza (sin código de motor nuevo salvo §4)
| Sistema | Archivo | Uso en el ep. 3 |
|---|---|---|
| Pack de contenido | `content/ep3/pack.js` y `lecciones.js`, mismo esquema que `content/ep2/` | `AVE.registerPack({ id: 'ep3', meta: { capitulo: 3, almacen: 'amazonaverse' } })`; se abre con `?pack=ep3`; `ep3Test` en `boot.js` como `ep2Test` |
| Misiones por datos | `src/game/misiones.js` | M1–M3 con `hasta: { marca, evento, mision, cerca }` |
| Agarre y buceo | `src/engine/agarre.js`, buceo del ep. 1 | M1: soltar materiales en la poza y bucear a recoger los que se hunden |
| Construcción por decisiones | patrón de la casa del ep. 2 (`content/ep2/pack.js`) | M1: 3 decisiones del bote, sin colocar piezas a mano |
| Prueba con «parte débil» determinista | `content/ep2/pack.js` | M1: la primera botadura falla en una sola parte y tiene arreglo |
| Postes con cintas de viento | `content/ep2/pack.js` (`poste_viento`) | M2: leer el viento antes de salir |
| Modelo `canoa` del kit | `assets/models/edificios/canoa*` (propio, 432 tris; `EDIFICIOS.md`), ya en el kit y 32 veces en `escena_kelvin_cap1.json` | El primer bote es una canoa; se instancia con `G.mundo.edificio('canoa', …)` clonando la geometría (nota de `MINIJUEGOS.md`). Las variantes de casco son tamaño, color y si lleva batanga, no geometría nueva |
| Canoas del mapa | `escena_kelvin_cap1.json` (`"modelo":"canoa"`, decorativas) | Las de la otra comunidad son la pista de que allí ya saben navegar |
| Río como ruta | `mapa.agua.rio.puntos`, `construirRuta`/`proyectar` de `src/game/retos.js` («Contrarreloj del río») | M2: práctica río abajo; la canoa sigue la polilínea |
| Controles de canoa | `src/game/river_rush.js` (carril AC, si ya está hecho; solo se lee su API) | Izquierda/derecha con un dedo o teclas, cámara detrás y por encima; si AC no está, la ruta y la cámara de Retos |
| Mar, laguna y arrecife | `mapa.agua.mar` (nivel 0; laguna y arrecife al sur, caída a −9 m), `G.agua.levelAt`, `agua.ripple/splash/spray` | M3: la travesía por la bahía |
| POIs y aldeas | `muelle` (150, 205), `playa`, `mirador`; aldeas `kelvin_aldea_colina` (−5, 141, junto a la laguna del sur), `kelvin_aldea_rio_este` (112, 97), `kelvin_aldea_rio_oeste` (−134, 27) | El muelle es el astillero; una aldea existente, tal cual, es la otra comunidad (§10, decisión 2) |
| Caleta bioluminiscente | `mapa.agua.bahiaBio` (−160, 207), `src/game/maravillas.js` | P2: regreso de noche con la estela azul detrás de la canoa |
| Tormenta | `fx` y la tormenta del ep. 2 | M3: un chubasco en la bahía, sin castigo |
| Diálogo | `src/game/dialogo.js` | Escenas; elecciones que cambian la frase y no el desenlace |
| Ropero | `pack.ropa` + `assets/models/ropa/*` | Piezas ya modeladas: `casco_marinero`, `mano_bandera`, `sombrero_pescador`, `mano_mapa` (sin modelos nuevos) |
| Criadero | `src/game/criadero.js`, `content/comun/huevos.js` | `pack.criadero.almacen = 'amazonaverse.criadero'` como el ep. 2: la cría sigue a Vittata |
| Cómic | `src/game/comic.js` | `EVENT_DEFS` y `vinetas` del pack (§6) |
| Guardado | `src/engine/guardado.js` | Partida aparte (`ep3.save`); importa del ep. 2 la casa y la mejora (solo para frases) |
| Aula | `src/game/aula.js` | Lecciones `ep3`, Nivel 1 y 2, reporte local; pestaña «Progreso ep. 3» con `G.aula.pestana` como el ep. 2 |
| Personajes | renders oficiales en billboard (Iguaca, Guardián, abuela y papá del ep. 2) | La navegante y la gente de la otra comunidad usan renders de su especie (§10) |

## 4. Lo nuevo
| Pieza | Pri | Dónde |
|---|---|---|
| Prueba de flotación: soltar 6 materiales en la poza y anotar flota/se hunde (valores del juego, deterministas; no hay física nueva) | P0 | `content/ep3/pack.js`; el objeto se agarra con `agarre.js` y se coloca frente a `G.agua.levelAt` |
| Bote por decisiones y botadura con parte débil | P0 | `content/ep3/pack.js` (mismo patrón que la casa del ep. 2) |
| Canoa en ruta: Vittata sentada en la `canoa`, que sigue una polilínea; el jugador gira y rema, sin física de navegación | P0 | `content/ep3/pack.js` con la ruta de Retos o los controles de `river_rush.js` (§3) |
| Código de señales: el jugador asigna 3 señales (bandera, silbido, gesto) a 3 órdenes | P0 | Tarjetas del Diario por datos del pack, como las del ep. 2 |
| Ruta de la bahía: puntos por datos del muelle a la otra comunidad (muelle → boca de la bahía → bajío → aldea) | P0 | `content/ep3/pack.js`; el level designer la mide sobre la escena (§9) |
| Importar la partida del ep. 2 | P1 | `pack.guardado.importar` (lee `ep2.save`; si no hay, valores por defecto) |
| Regreso de noche por la caleta | P2 | `maravillas.js` tal cual; solo se lleva al jugador cerca |
| Vela (un plano con la tela de B4 sobre la canoa) | P2 | Solo si sobra tiempo; el bote funciona a remo |

## 5. Decisiones del jugador y consecuencias
- **Bote (M1):** casco de tronco (aguanta golpes, pesa y es lento), de bambú atado (ligero y rápido, se abre si el amarre es flojo) o de tablas (carga más, necesita sellar las juntas); con o sin batanga (estable y lenta, o rápida y se ladea con carga). Cualquiera llega; cambia qué falla en la botadura y cómo se siente al remar.
- **Señales (M2):** bandera (se ve, no se oye en la niebla), silbido (se oye, el viento lo tapa) o gesto (rápido, solo de cerca). Con lluvia, la que dependa del oído o de la vista falla una vez y se ajusta, sin castigo.
- **Quién lleva el timón (M2):** Vittata o la navegante. Las dos llegan; cambia el diálogo y una parada de la travesía.
- **Ruta (M3):** el atajo de Vittata (corto, viento de frente: la carga se moja) o la ruta de la navegante por la costa (larga y seca: se llega al atardecer).
- **El bajío (M3):** la navegante se equivoca una vez; retroceder con ella o buscar otro paso. Los dos funcionan.
- Ninguna opción lo maximiza todo (regla de la biblia): el bote rápido moja la carga, el estable es lento; la ruta corta ahorra tiempo y pide más atención.

## 6. Eventos y cómic (`EVENT_DEFS` del pack)
| Clave | Tipo genérico | Escena de viñeta |
|---|---|---|
| `BlueprintShared` | `QuestAccepted` | El plano en la mesa, todos alrededor |
| `MaterialsTested` | `LocationDiscovered` | Materiales flotando y hundidos en la poza |
| `BoatBuilt` / `BoatLaunched` | `BuildingConstructed` / `BuildingRepaired` | La primera botadura y la segunda |
| `NavigatorMet` | `CharacterMet` | Vittata y la navegante en el muelle |
| `SignalsAgreed` | `DialogueChoiceMade` | El código de señales que eligió el jugador |
| `HelmChosen` | `DialogueChoiceMade` | Quién lleva el timón |
| `BayCrossed` | `LocationDiscovered` | La canoa en la boca de la bahía, con la ruta elegida |
| `CommunityReached` | `CharacterMet` | La llegada a la otra comunidad |
| `Chapter3Completed` | `ChapterCompleted` | El intercambio en el muelle de la otra comunidad |

Viñetas solo de eventos reales, con el look de ese momento (regla del cómic). Portada: «Capítulo 3 · Más allá de la bahía».

## 7. Móvil y accesibilidad
Mismos controles del ep. 1 (Acción contextual, Bucear, Agarrar). En la canoa, un dedo: arrastrar a izquierda o derecha para girar y tocar para remar (o teclas); nada de dos sticks. Las señales de la navegante salen a la vez como icono grande, texto y sonido: nunca dependen de un solo sentido. Tarjetas de 56 px. Modo relajado: la canoa no se sale de la ruta y el chubasco no balancea la cámara; `prefers-reduced-motion` quita el balanceo, los destellos y la estela; subtítulos de sonido para olas, viento y silbido. Si Vittata cae al agua, nada como en el ep. 1. Texto y contraste según D2, teclas según D3. Se mide en vertical a 375×812: Vittata y la canoa grandes desde el primer cuadro.

## 8. Producción (estimación, a afinar en AG2)
| Rol | Trabajo |
|---|---|
| Gameplay | `content/ep3/*`: flotación, bote por decisiones, canoa en ruta, señales |
| Level designer | Poza de pruebas junto al muelle, tramo del río para practicar, ruta de la bahía y el muelle de la aldea elegida; comprobar que la ruta no atraviesa terreno |
| Educativo | `lecciones.js` del ep. 3 con fuentes; DEPR por verificar |
| Narrativa | Diálogos ES/EN de la navegante y de la otra comunidad |
| QA | `ep3Test` E2E de la entrada al final, ES y EN, móvil y capturas `docs/img/ag2_ep3_*.jpg` |
Sin modelos nuevos de ropa, personajes ni botes. 1–2 semanas.

## 9. Riesgos
| Riesgo | Mitigación |
|---|---|
| Que la ruta de la bahía choque con la escena (bajíos, rocas, el muelle a 0 m) | Ruta por datos medida con `G.terreno.height` y `G.agua.levelAt`; prueba en `ep3Test` de que cada punto tiene agua |
| Que la aldea elegida no tenga orilla navegable | Plan B: la Colina, junto a la laguna del sur; la canoa atraca en la playa; decisión 2 para Kelvin |
| Que remar sea pesado en una clase de 45 min | Canoa sobre raíles; la travesía dura unos 4 min, máximo 90 s por tramo, y se puede saltar en modo relajado |
| Mareo en móvil | Cámara fija respecto a la canoa, sin balanceo en modo relajado |
| Choque con River Rush (carril AC) | Se lee su API, no se edita `river_rush.js`; si cambia, el pack usa la ruta de Retos |
| Datos de flotación, corrientes y navegación sin cita | Por verificar; el juego muestra lo que el jugador ve, no la cifra (`EP3_MISIONES.md` §2–4) |
| Que «confiar» se lea como «obedecer» | La navegante también se equivoca una vez y lo dice; el jugador decide quién lleva el timón |
| Retratar a la otra comunidad como «exótica» o necesitada | Comunidad con saber propio (ya saben navegar); intercambio entre iguales; revisión de `SEGURIDAD_INFANTIL.md` |
| Dependencia de los eps. 1 y 2 | El ep. 3 arranca también sin partida previa |

## 10. Decisiones de canon para Kelvin (no decididas aquí)
1. **La navegante:** especie (¿una de las 36?), nombre, edad y de dónde viene. ¿Vive en Villa Raíz, llega por mar o es de la otra comunidad? Placeholder en `EP3_NARRATIVA.md`.
2. **La otra comunidad:** cuál de las aldeas del mapa (propuesta: la Colina, junto a la laguna del sur; alternativa: el río del este), su nombre y quiénes viven allí. Las islas del horizonte quedan fuera: pedirían streaming nuevo.
3. **El bote definitivo** (`KELVIN-7` de `content/cap1/historia.js`): el plano del ep. 1 tiene casco, mástil y dos velas. Propuesta: el primer bote es una canoa a remo y la vela queda para más adelante. ¿Lleva nombre? Si sí, ¿lo elige la comunidad o el jugador de una lista (sin texto libre)?
4. **La Voz:** qué se oye en el ep. 3, si la otra comunidad también la escucha y si se oyen una o dos voces (la revelación es del ep. 5).
5. **La luz de la niebla:** ¿se ve desde el mar? ¿Se acerca el bote o queda para el ep. 5?
6. **El Guardián y el mar:** ¿va en el bote, se queda o despide desde el muelle? ¿Sabe algo de la otra comunidad que no cuenta?
7. **Qué se intercambia y elementos culturales:** propuesta: Villa Raíz lleva el saber de la casa que aguanta y fibra trenzada; la otra comunidad enseña a tejer redes o nasas. Canoa y batanga taínas y villas pesqueras de PR como inspiración (todo **por verificar**).
8. **El gancho al ep. 4:** propuesta: la otra comunidad prepara el proyecto de desarrollo del ep. 4 (un muelle grande, un camino o una represa). ¿Cuál?
9. **El huevo del papá** (pendiente del ep. 2): ¿ya nació? ¿Viaja la cría? Y el símbolo de 36 fragmentos del ep. 1: ¿la otra comunidad tiene uno?
10. **Papel del aprendiz del jugador:** ¿rema, lleva la bandera de las señales o se queda con la abuela?
