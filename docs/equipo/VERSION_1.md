# Versión 1: capítulo 1 listo para jugar

La meta es que niños, jóvenes y familias jueguen el capítulo 1 completo, se diviertan, guarden sus récords y compartan su cómic. Diversión primero (V8.0). Publicar cada versión que pase todas las pruebas está aprobado por Kelvin para esta ronda.

## Lista de cierre
| # | Qué | Estado | Dónde se comprueba |
|---|---|---|---|
| 1 | El capítulo se juega de principio a fin | **Hecho** | e2eTest 42/42 |
| 2 | Final en escena: tormenta, Voz neutra, plano del bote, luz ×3 | **Hecho** | missionTest 55/55 |
| 3 | Nada se borra salvo «Comenzar de cero» (también partida dañada al arrancar y Aula) | **Hecho** | saveTest 45/45, maestroTest 25/25 |
| 4 | Modo Retos: carrera y tormenta, con récord | **Hecho y publicado** | retosTest 50/50 |
| 5 | Controles claros en la computadora (icono fijo y panel), «no eleva», no quedar encajada | en curso | movementTest |
| 6 | «Mis récords» (de la casa, locales) y compartir el cómic con una puerta para adultos | en curso | recordsTest |
| 7 | La ciudad de Kelvin completa y fiel (edificios cercanos de alta fidelidad) | en curso | streamingTest, capturas |
| 8 | Pieles de las 22 especies (criadero y rivales) | en curso | pielesTest |
| 9 | Accesibilidad: texto, contraste, subtítulos, modo relajado y modo zurdo | en curso | casos D2 y D4 |
| 10 | Diario: datos validados con fuente; especies y 5 paradas | especies y paradas **hechas** · validación en curso | eduTest 79/79 |
| 11 | Pruebas estables (contextTest) | en curso | 3 corridas seguidas en verde |
| 12 | Mejoras de diversión de Fable (★ en `DIVERSION_CAP1.md`) | **elige Kelvin** cuáles entran | según cada mejora |
| 13 | Jugarlo con 2–3 niños de verdad: duración, dónde se traban, qué les divierte | **Kelvin** (Android y niños) | notas en `BUGS.md` |
| 14 | Canon pendiente (Guardián, Voz, máquina, medalla) | sale con marcadores neutros; decide Kelvin | `[KELVIN-n]` en `historia.js` |

## Fuera de la versión 1
Trajes del ropero (aparcado), episodio 2, la Comunidad web (propuesta en `COMUNIDAD_PROPUESTA.md`) y tablas de récords en línea (no, por la privacidad de los niños).
