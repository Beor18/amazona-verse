# Versión 1: capítulo 1 listo para jugar

La meta es que niños, jóvenes y familias jueguen el capítulo 1 completo, se diviertan, guarden sus récords y compartan su cómic. Diversión primero (V8.0). Publicar cada versión que pase todas las pruebas está aprobado por Kelvin para esta ronda.

## Lista de cierre
| # | Qué | Estado | Dónde se comprueba |
|---|---|---|---|
| 1 | El capítulo se juega de principio a fin | **Hecho** | e2eTest 42/42 |
| 2 | Final en escena: tormenta, Voz neutra, plano del bote, luz ×3 | **Hecho** | missionTest 55/55 |
| 3 | Nada se borra salvo «Comenzar de cero» (también partida dañada al arrancar y Aula) | **Hecho** | saveTest 45/45, maestroTest 25/25 |
| 4 | Modo Retos: carrera y tormenta, con récord | **Hecho y publicado** | retosTest 50/50 |
| 5 | Controles claros en la computadora (icono fijo y panel), «no eleva», no quedar encajada; botón Acción en móvil | **Hecho** (Acción: en pruebas) | movementTest 38/38, controlesTest 19/19 |
| 6 | «Mis récords» (de la casa, locales) y compartir el cómic y el récord con una puerta para adultos | **Hecho** | recordsTest 46/46 |
| 7 | La ciudad de Kelvin completa y fiel (edificios cercanos de alta fidelidad) | en curso | streamingTest, capturas |
| 8 | Pieles de las 22 especies (rivales de Retos y creador; crías sin especie hasta que decida Kelvin) | **Hecho** | pielesTest 13/13 |
| 9 | Accesibilidad: texto, contraste, subtítulos, modo relajado y modo zurdo | **Hecho** · falta: los Retos no leen el modo relajado; a 320 px no caben joystick y botones (de antes) | accesibilidadTest 36/36 |
| 10 | Diario: datos validados con fuente; especies y 5 paradas | **Hecho** | eduTest 79/79, DIARIO_VALIDACION.md |
| 11 | Pruebas estables (contextTest y retosTest) | **Hecho** · el E2E tras recargar va en F1 | 3 corridas seguidas de 16/16 y 17/17 |
| 12 | Mejoras de diversión de Fable (las 5 ★ de `DIVERSION_CAP1.md`) | en curso (Fable; Kelvin pidió «terminar lo más posible») | casos de cada mejora |
| 13 | Jugarlo con 2–3 niños de verdad: duración, dónde se traban, qué les divierte | **Kelvin** (Android y niños) | notas en `BUGS.md` |
| 14 | Canon pendiente (Guardián, Voz, máquina, medalla) | sale con marcadores neutros; decide Kelvin | `[KELVIN-n]` en `historia.js` |

## Fuera de la versión 1
Trajes del ropero (aparcado), episodio 2, la Comunidad web (propuesta en `COMUNIDAD_PROPUESTA.md`) y tablas de récords en línea (no, por la privacidad de los niños).
