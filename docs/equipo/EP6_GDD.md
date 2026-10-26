# GDD Episodio 6 · «El pacto de los 36» (15–20 min)

Estado: **PROPUESTA** (tarea AI2). Historia: `EP6_NARRATIVA.md`. Misiones y lecciones: `EP6_MISIONES.md`. Canon pendiente: §10. Todo lo que no esté CONFIRMADO en `docs/CANON_REGISTRY.md` va con `[KELVIN]`.

**Idea en una frase:** guardianes de otras islas llegan a Villa Raíz por la cadena de señales del ep. 5, y Vittata descubre que no tiene que hacerlo todo ella: su fuerza es repartir el trabajo, juntar a quien no se conoce y ayudar a que se escuchen hasta encender juntos el círculo del pacto.

**Canon confirmado que se respeta:** Vittata es la protagonista, inventora y líder; su defecto es querer hacerlo todo sola. El pacto unía a 36 guardianes, inspirados en las 36 especies del género *Amazona* (34 vivas, más martinicana y violacea, extintas). La Voz del transmisor son los dos guardianes extintos y hablan «desde ahora». El aprendiz del jugador acompaña a Vittata y no la reemplaza. Los guardianes se conocen y se ayudan; nunca se capturan ni se venden.

## 1. Core loop (30–60 s)
**Conocer a alguien (qué sabe hacer y qué necesita) → anotarlo en una tarjeta del Diario → armar un plan repartiendo tareas → ver el plan en marcha → si algo se atasca, ver dónde y reacomodar.** El objetivo sigue siempre visible (haz y flecha del ep. 1). Vittata coordina más de lo que hace: el jugador pasa de «hago yo» a «¿quién lo hace mejor?».

## 2. Ritmo
| Min | Beat | Habilidad |
|---|---|---|
| 0–1 | Gancho: al amanecer llegan los primeros visitantes siguiendo la cadena de señales | — |
| 1–6 | M1 Cada quien con lo suyo | hablar, observar |
| 6–12 | M2 Nadie lo levanta solo | volar, agarrar, posarse |
| 12–17 | M3 El círculo | hablar, posarse, observar |
| 17–19 | El pacto renovado; cómic de cierre de temporada; gancho a la temporada 2 | — |
| +3 | «Iguaca te pregunta» | hablar |

## 3. Qué se reutiliza (sin código de motor nuevo salvo §4)
| Sistema | Archivo | Uso en el ep. 6 |
|---|---|---|
| Pack de contenido | `content/ep6/*` (nuevo), mismo esquema que `content/ep2` y `content/plantilla` | `AVE.registerPack({ id: 'ep6', meta: { titulo: 'El pacto de los 36', capitulo: 6, almacen: 'ep6' } })` |
| Misiones por datos | `src/game/misiones.js` | M1–M3 con `hasta: { marca, evento, mision, cerca }` |
| Plaza, muelles y puentes del mapa | `assets/data/mapa_cap1.js` (ya colocados: 1 `plaza`, 8 `muelle`, puentes de madera) | Llegadas por los muelles (la canoa del ep. 3), obra de M2 en un puente o en la plaza, círculo de M3 en la plaza; sin mover el mapa |
| Ruinas y relevo | `assets/data/mapa_cap1.js` (`ruina_altar`, `ruina_torre`…), relevo del ep. 5 | Las estaciones del relevo siguen encendidas y guían a los visitantes; el `ruina_altar` es candidato a «piedra del pacto» [KELVIN] |
| Mirador y luz de la niebla | `content/cap1/mundo.js` (`PLACES.mirador`, `luzMirador.parpadear(n)`) | Señal de bienvenida y escena final |
| Agarre | `src/engine/agarre.js` | Piezas que se cargan entre dos (M2) |
| Perchas y Observar | `content/cap1/educativa.js` | Puestos que hay que ocupar a la vez (M2) y asientos del círculo (M3) |
| Diálogo | `src/game/dialogo.js` | Presentaciones, plan, mediación; elecciones que cambian la frase y el camino, no el desenlace |
| Tarjetas | tarjetas de necesidades del ep. 2 y de fragmentos del ep. 5 | Tarjetas de «sabe hacer / necesita» de cada visitante |
| Personajes | billboards de renders oficiales de cada especie (como Iguaca y el Guardián) | Visitantes inspirados en especies vivas del catálogo [KELVIN: cuáles]; los residentes del ep. 2 y quien navega del ep. 3 vuelven si existen |
| Especies | `content/comun/especies.js` | Nombre común, científico, distribución y UICN de cada visitante, solo con lo que ya tiene fuente |
| Ropero | `pack.ropa` + `assets/models/ropa/*` | Piezas ya modeladas: `mano_mapa` (M1), `mano_cuaderno` (M2, el plan), `pava` o `mano_maracas` (M3, la fiesta) [KELVIN: cuál]; sin modelos nuevos |
| Criadero | `src/game/criadero.js`, `content/comun/huevos.js` | `obtener.ep6` en una cápsula; la cría acompaña (`almacen: 'amazonaverse'`, como el ep. 2) |
| Cómic | `src/game/comic.js` | `EVENT_DEFS` del pack (§6) y cómic de cierre de temporada con lo mejor de los 6 capítulos que la partida tenga |
| Guardado | `src/engine/guardado.js` | Partida propia `ep6`; importa del ep. 1 (y de los eps. 2–5 si existen) la ropa, la cría y el código del relevo |
| Aula | `src/game/aula.js` | Lecciones `ep6`, Nivel 1 y 2, reporte local |

## 4. Lo nuevo
| Pieza | Pri | Dónde |
|---|---|---|
| Tarjetas de visitante: «sabe hacer» (2 iconos) y «necesita» (1 icono); se llenan hablando con cada uno | P0 | `content/ep6/visitantes.js`; mismo panel que las tarjetas del ep. 2 |
| Tablero del plan: tareas en una columna, ayudantes en otra; se arrastra o se toca para asignar; botón «Probar el plan» | P0 | `content/ep6/plan.js`, botones de 56 px |
| Simulación determinista del plan (sin azar): cada tarea dura lo que dice su tarjeta; si alguien tiene dos tareas a la vez, se ve la espera; si una tarea no es para esa persona, se ve dónde se atasca | P0 | `content/ep6/plan.js`; sobre el mapa, con los billboards caminando o volando a su puesto |
| Puestos simultáneos: dos o tres perchas que hay que ocupar a la vez para levantar una pieza (un ayudante en cada una) | P0 | `content/ep6/obra.js` sobre `educativa.js` |
| Carga entre dos: una pieza larga que solo se mueve si hay alguien en cada punta (Vittata o el aprendiz con un ayudante) | P1 | `content/ep6/obra.js` sobre `agarre.js` |
| Mediación: rueda de 3 pasos (escuchar a A, escuchar a B, decir lo que comparten) antes de proponer | P0 | `content/ep6/historia.js` con `dialogo.js` |
| Círculo de 36 asientos con formas posibles (6×6, 4×9, 3×12, anillo) | P0 | `content/ep6/circulo.js`; marcas en el suelo de la plaza |
| Coro final: cada asiento ocupado se enciende; los vacíos quedan con una luz tenue «esperando» | P2 | reutiliza los sprites aditivos del cap. 1 y `luzMirador` |

## 5. Decisiones del jugador y consecuencias
- **A quién conocer primero (M1):** libre; cambia el orden de las tarjetas, no el desenlace.
- **Cómo repartir el trabajo (M2):** hay varias soluciones buenas. Ninguna lo maximiza todo (regla de la biblia):
  - **la más rápida** pone a cada uno en lo que mejor sabe hacer, pero el más nuevo se queda mirando;
  - **la que enseña** pone al nuevo junto a quien sabe, y tarda un poco más;
  - **la que descansa** reparte para que nadie haga dos cosas seguidas, y necesita una persona más.
  El plan termina con cualquiera; cambia qué frase dice cada ayudante al final y qué viñeta sale.
- **Hacerlo sola (M2):** si el jugador se asigna todas las tareas a Vittata, el plan se prueba igual: Vittata vuela de un lado a otro, la pieza se queda a medio levantar (sin castigo, sin tiempo límite) y alguien se ofrece. Es el eco del «No lo hagas sola» del ep. 5.
- **Cómo sentar a los 36 (M3):** cualquier forma vale y todas suman 36:
  - **6×6:** cabe justa en la plaza, pero los de atrás no ven a los de adelante;
  - **4×9 o 3×12:** caben junto al río, pero los de las puntas quedan lejos;
  - **anillo:** todos se ven, pero ocupa toda la plaza y no queda sitio para el público.
- **Qué propuesta llevar (M3):** la de un grupo, la del otro o una mezcla. La mezcla tarda más y deja a todos un poco incómodos; las otras dos dejan a un grupo contento y al otro paciente. Nadie se va.

## 6. Eventos y cómic (`EVENT_DEFS` del pack)
| Clave | Tipo genérico | Escena de viñeta |
|---|---|---|
| `GuestsArrived` | `QuestAccepted` | Las primeras canoas y vuelos llegando a los muelles por la cadena de señales |
| `CardsFilled` | `CharacterMet` | La mesa del taller llena de tarjetas de visitantes |
| `PlanMade` | `DialogueChoiceMade` | El tablero del plan con las tareas repartidas |
| `PlanStuck` | `CharacterMoment` | Vittata sola con una pieza a medio levantar (solo si pasó) |
| `RaisedTogether` | `BuildingConstructed` | La pieza levantada entre varios, vista desde arriba |
| `GroupsListened` | `DialogueChoiceMade` | Los dos grupos frente a frente, Vittata en medio escuchando |
| `CircleFormed` | `PuzzleSolved` | La forma del círculo que eligió el jugador |
| `PactRenewed` | `StoryRevealed` | Los asientos encendidos y los vacíos esperando |
| `Chapter6Completed` | `ChapterCompleted` | Vittata de espaldas, mirando las luces de las islas que faltan |

Viñetas solo de eventos reales, con el look de ese momento (regla del cómic). Portada: «Capítulo 6 · El pacto de los 36». **Cómic de cierre de temporada (P1):** al terminar, se ofrece armar un cómic con las mejores viñetas reales de los capítulos 1–6 que tenga la partida (los que no se jugaron no salen). `PuzzleSolved`, `CharacterMoment` y `StoryRevealed` son propuestas: si no existen entre los tipos genéricos del motor, se usa el genérico más cercano (`DialogueChoiceMade`) en vez de tocar el motor.

## 7. Móvil y accesibilidad
Mismos controles del ep. 1 (Acción contextual, Bucear, Agarrar). Tarjetas, tablero y rueda de mediación con botones de 56 px; asignar es tocar ayudante y luego tarea (no hace falta arrastrar). La simulación del plan se puede pausar y repetir paso a paso. Las tarjetas usan icono **y** texto, nunca solo color. Los puestos simultáneos no exigen precisión de tiempo: basta con que estén ocupados a la vez. Respeta `prefers-reduced-motion` (sin destellos rápidos en el coro final). Modo relajado: el tablero sugiere una asignación posible al abrirlo. Texto y contraste según D2, teclas según D3.

## 8. Producción (estimación)
| Rol | Trabajo |
|---|---|
| Gameplay | `content/ep6/*`: tarjetas, plan y su simulación, puestos simultáneos, mediación, círculo |
| Level designer | Marcar en la plaza las 36 marcas de asiento (por forma) y el puente o la pieza de la obra de M2 (sin mover el mapa) |
| Educativo | `lecciones.js` del ep. 6 con fuentes; indicadores DEPR por verificar |
| Narrativa | `dialogos` ES/EN, con los `[KELVIN]` de §10 |
| Save & Cómic | Cómic de cierre de temporada (P1) |
| QA | `ep6Test` E2E de principio a fin, ES y EN, capturas en escritorio y 375×812 |
Sin modelos nuevos de ropa ni de personajes.

## 9. Riesgos
| Riesgo | Mitigación |
|---|---|
| 36 personajes es demasiado para un episodio | En pantalla, solo los visitantes con tarjeta [KELVIN: cuántos, propuesta 6]; el resto son asientos que se encienden o quedan esperando |
| Que «cooperar» se sienta como un sermón | Es un puzzle: el plan malo se ve fallar y el bueno se ve funcionar; nadie lo dice en voz alta antes de que se vea |
| Que Vittata pierda su papel de líder | Lidera de otra forma: es quien conoce a todos, arma el plan y sostiene la mediación; el aprendiz sigue acompañando, no la reemplaza |
| Mediación con un «bando malo» | Los dos grupos tienen razones buenas; ninguno es villano; nadie se va enojado |
| Tratar a las dos extintas como «personajes desbloqueados» | No se coleccionan ni se sientan como premio; su lugar en el círculo es `[KELVIN]` (§10) |
| Que el puzzle del plan sea confuso en una clase de 45 min | Máximo 5 tareas y 4 ayudantes; la simulación marca el atasco con un icono y una frase |
| Dependencia de los eps. 2–5 | El ep. 6 arranca sin partida previa: un resumen de 20 s («la cadena de señales llamó a los que quedan») y sustitutos para residentes y quien navega |

## 10. Decisiones de canon para Kelvin (no decididas aquí)
1. **[KELVIN] Quiénes llegan:** cuántos guardianes de los 36 aparecen en el ep. 6 (propuesta: 6 con tarjeta y voz) y de qué especies vivas se inspiran.
2. **[KELVIN] Qué es el pacto:** ¿tiene un texto, una promesa, un objeto? ¿Qué se «renueva» al final? Propuesta de frase en `EP6_NARRATIVA.md`, sin decidir.
3. **[KELVIN] Las dos voces extintas en el círculo:** ¿tienen asiento? ¿Se encienden, quedan vacíos o se presentan de otra forma? Depende de cómo se presentan (pendiente del ep. 5).
4. **[KELVIN] Dónde es el encuentro:** la plaza de Villa Raíz, el mirador o la ruina del altar como «piedra del pacto».
5. **[KELVIN] Los dos grupos de la mediación:** ¿de qué islas vienen y en qué no se ponen de acuerdo? (propuesta: dónde reunirse y cuándo volver; nada que tenga un culpable).
6. **[KELVIN] El papel del Guardián:** ¿preside, recuerda el pacto antiguo o se aparta para que lo lleven otros? Conflicto abierto del registro: ¿es cotorra, humano u otra forma?
7. **[KELVIN] El título de Vittata:** ¿queda nombrada de alguna forma en el pacto o el cambio es solo suyo, sin cargo?
8. **[KELVIN] Cuántos asientos quedan vacíos** al final y qué gancho dejan para la temporada 2, «Las islas olvidadas».
9. **[KELVIN] Martinicana y violacea como consejeras** (idea PROVISIONAL): ¿se formaliza aquí?
10. **[KELVIN] La pieza de ropa de recompensa del final** (`pava`, `mano_maracas` u otra) y si la fiesta lleva música de Puerto Rico concreta.
11. **[KELVIN] Cómic de cierre de temporada:** ¿se hace en el ep. 6 o se deja para la temporada 6, «El mundo que elegimos», que trae el «cómic de legado»?
