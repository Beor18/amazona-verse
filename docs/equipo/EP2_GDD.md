# GDD Episodio 2 · «Un lugar para todos» (15–20 min)

Estado: **PROPUESTA** para producir en la fase 1 (`ROADMAP.md`). Historia: `EP2_NARRATIVA.md`. Misiones y lecciones: `EP2_MISIONES.md`. Canon pendiente: §10.

**Idea en una frase:** Vittata aprende que una casa para todos se diseña escuchando: lee el terreno, pregunta a dos residentes, construye, prueba con la tormenta y mejora.

## 1. Core loop (30–60 s)
**Observar o preguntar → anotar en el Diario (tabla del terreno, tarjeta de necesidad) → decidir → ver la consecuencia → mejorar.** El objetivo sigue siempre visible (haz y flecha del ep. 1).

## 2. Ritmo
| Min | Beat | Habilidad |
|---|---|---|
| 0–1 | Gancho: la Voz avisa de otra tormenta | — |
| 1–6 | M1 Lee la tierra | volar, agarrar, posarse |
| 6–10 | M2 Escuchar primero | hablar |
| 10–16 | M3 Casa que aguanta, tormenta | construir, volar |
| 16–18 | Giro, fiesta de techado, gancho al ep. 3 | — |
| +3 | «Iguaca te pregunta» | hablar |

## 3. Qué se reutiliza (sin código de motor nuevo salvo §4)
| Sistema | Archivo | Uso en el ep. 2 |
|---|---|---|
| Pack de contenido | `content/cap2/*` (nuevo), mismo esquema que `content/cap1` | `AVE.registerPack({ id: 'cap2', meta: { capitulo: 2, almacen: 'amazonaverse' } })` |
| Misiones por datos | `src/game/misiones.js` | M1–M3 con `hasta: { marca, evento, mision, cerca }` |
| Perchas y Observar | `content/cap1/educativa.js` | Patrón para M1 (pendiente y viento) |
| Agarre | `src/engine/agarre.js` | Cubo de agua en M1 |
| Diálogo | `src/game/dialogo.js` | M2 y escenas; elecciones que cambian la frase |
| Ropero | `pack.ropa` + `assets/models/ropa/*` | Piezas ya modeladas: `lentes_binoculares`, `mano_cuaderno`, `casco_constructor`, `botas_constructor` (sin modelos nuevos) |
| Criadero | `src/game/criadero.js`, `content/comun/huevos.js` | `obtener.cap2` en las cápsulas; la cría del ep. 1 acompaña |
| Cómic | `src/game/comic.js` | `EVENT_DEFS` y `vinetas` del pack (§6) |
| Guardado | `src/engine/guardado.js` | Clave del pack `cap2`; importa del ep. 1 materiales, sitio (río/colina) y ropa |
| Aula | `src/game/aula.js` | Lecciones `cap2`, Nivel 1 y 2, reporte local |
| Tormenta | `fx`, crecida del ep. 1 | Prueba de M3, sin castigo |
| Mapa | Escena de Kelvin (`assets/data/mapa_cap1*`) | Villa Raíz y la colina; 3 sitios nuevos marcados (decisión 2) |

## 4. Lo nuevo
| Pieza | Pri | Dónde |
|---|---|---|
| Construcción por piezas (base, paredes, techo, anclaje) y casa de dos niveles | P0 | `content/cap2/construccion.js` (pack); usa los sólidos de `solidos.js` para que Vittata se pose y entre |
| Prueba de tormenta con «parte débil» determinista (sin azar) | P0 | `content/cap2/construccion.js` |
| Tabla 3×3 del terreno y tarjetas de necesidades en el Diario | P0 | Extensión de `src/game/diario.js` por datos del pack |
| Dos residentes (renders oficiales en billboard, como Iguaca y el Guardián) | P0 | `content/cap2/historia.js` |
| Importar la partida del ep. 1 | P1 | `pack.guardado.importar` (lee `amazonaverse` del ep. 1; si no hay, valores por defecto) |
| Fiesta de techado: bandada pequeña y música | P2 | Reutiliza la bandada de P2-1 de `CAP1_PENDIENTE.md` si se hace |

## 5. Decisiones del jugador y consecuencias
- **Sitio (M1):** cualquiera es válido. El sitio débil hace que falle la base en la prueba 1; nunca bloquea el final.
- **Escuchar (M2):** "elegir a uno" se corrige con diálogo; no hay final malo.
- **Diseño (M3):** la parte que falla depende de las decisiones; siempre hay una mejora que la arregla.
- Ninguna opción maximiza todo (regla de la biblia): la casa de planta ancha es más fácil para la abuela y la torre protege mejor el nido.

## 6. Eventos y cómic (`EVENT_DEFS` del pack)
| Clave | Tipo genérico | Escena de viñeta |
|---|---|---|
| `StormWarning` | `QuestAccepted` | Mirador de noche, luz en la niebla |
| `TerrainRead` / `SiteChosen` | `LocationDiscovered` / `LandDecisionMade` | Parcela vista desde arriba |
| `ResidentsMet` | `CharacterMet` | Vittata con los dos residentes |
| `ListenChoice` | `DialogueChoiceMade` | La frase que eligió el jugador |
| `StormTested` / `HomeImproved` | `BuildingDamaged` / `BuildingRepaired` | Antes y después |
| `NestPlaced` | `BuildingConstructed` | El papá y el hueco del nido |
| `Chapter2Completed` | `ChapterCompleted` | Fiesta de techado |

Viñetas solo de eventos reales, con el look de ese momento (regla del cómic). Portada: «Capítulo 2 · Un lugar para todos».

## 7. Móvil y accesibilidad
Mismos controles del ep. 1 (Acción contextual, Bucear, Agarrar). Las tarjetas de M2 son botones de 56 px. Modo relajado: la prueba de tormenta sin sacudida; `prefers-reduced-motion` apaga destellos; subtítulos de sonido para lluvia y viento. Texto y contraste según D2, teclas según D3.

## 8. Producción (estimación, a afinar al cerrar el ep. 2)
| Rol | Trabajo |
|---|---|
| Gameplay | `content/cap2/*`, construcción y prueba, Diario por datos |
| Level designer | 3 sitios y la casa en la colina de la escena de Kelvin |
| Educativo | `lecciones.js` del cap2 con fuentes; indicadores DEPR |
| Narrativa | `dialogos_cap2.js` en ES/EN |
| QA | `missionTest`/`eduTest` del cap2 y E2E |
Sin modelos nuevos de ropa ni de personajes. 1–3 semanas según el ROADMAP.

## 9. Riesgos
| Riesgo | Mitigación |
|---|---|
| Que construir sea lento en una clase de 45 min | 4 decisiones, sin colocar piezas a mano |
| Que la prueba de tormenta frustre | Falla una sola parte, se marca y tiene arreglo |
| Datos de suelos y cajas nido sin cita | Por verificar; el juego muestra lo observado, no la cifra |
| Desplazamiento tratado con poca delicadeza | Residentes con agencia; revisión de `SEGURIDAD_INFANTIL.md` |
| Dependencia del ep. 1 | El ep. 2 arranca también sin partida previa |

## 10. Decisiones de canon para Kelvin (no decididas aquí)
1. **Los dos residentes:** especie (¿del género *Amazona*, de los 36?), nombre, edad y relación con Villa Raíz. Propuesta en `EP2_NARRATIVA.md` solo como placeholder.
2. **Dónde está el hogar permanente:** la colina del ep. 1, otro punto de Villa Raíz o una zona nueva del mapa.
3. **Para quién es la casa:** ¿de Vittata, de Iguaca, de los residentes o comunitaria?
4. **La Voz y la luz de la niebla:** qué dice en el ep. 2 y si se revela algo (o nada) sobre quién es.
5. **La medalla del Guardián:** ¿la muestra en el ep. 2 o se guarda hasta el ep. 5? Y el conflicto abierto: ¿el Guardián es cotorra, humano u otra forma?
6. **Martinicana y violacea como consejeras:** ¿aparecen ya en el ep. 2 o más tarde?
7. **El huevo del papá:** ¿nace en el ep. 2, en el ep. 3 o queda abierto? ¿Tiene relación con el criadero del jugador? (propuesta: no, es suyo).
8. **Fiesta de techado y la décima de la abuela:** ¿se usan como elementos culturales del canon?
9. **Continuidad del sitio del ep. 1:** si el jugador eligió el río, ¿el ep. 2 lo menciona o arranca igual para todos?
10. **Papel del aprendiz del jugador** en el ep. 2 (¿habla, ayuda a construir, entrevista a un residente?).
