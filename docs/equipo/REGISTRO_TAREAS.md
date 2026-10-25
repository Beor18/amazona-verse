# Registro de tareas y consumo (directiva V8.0)

Cada tarea se anota al terminar: objetivo, responsable y modelo, consumo, tiempo, archivos, pruebas y un resultado que se pueda verificar. Un documento largo o muchos tokens no cuentan como resultado.

**De dónde salen los números:**
- **Plan Max:** el porcentaje de la ventana semanal (`get_usage`).
- **Agentes del plan Max:** los tokens y el tiempo de su aviso de cierre.
- **API:** `tools/agente_api/ejecutor.py --gastos`, que tiene registro desde el 25-oct-2026, 17:30. Lo anterior solo está en console.anthropic.com → Billing.

## Auditoría al 25-oct-2026, 17:30

**Plan Max 20x**
| Ventana | Uso |
|---|---|
| Semana, todos los modelos | 38 % (se reinicia el 31-oct) |
| Semana, Fable | 0 % |
| 5 horas | 13 % |

- El tope semanal acordado es el 75 %.
- No está documentado si lo que gasta Fable descuenta también de «todos los modelos». Se comprueba con la tarea de Fable en curso.
- Uso adicional de pago: **desactivado**, y sigue así.

**API (créditos promocionales de $200 que vencen el 29-oct, más $20 comprados)**
- **Antes del registro:** gastos sin medir aquí. Corrieron los carriles A, C y D (tope de $50 cada uno), además del B, que sigue corriendo con tope de $50. Ese gasto hay que leerlo en la Console.
- **Topes desde ahora:** `tools/agente_api/limites.json`, total y por día, con alerta al 80 %. Hoy están **en 0**, así que no corre nada hasta que Kelvin los fije. La propuesta es $40 en total y $20 al día.
- **Claves:** no se guardan en ningún archivo. El ejecutor las pide sin mostrarlas.

**Agentes activos**
| Tarea | Responsable | Modelo | Estado |
|---|---|---|---|
| Cierre del cap. 1 y «Comenzar de cero» (paquete A) | agente | Sonnet | en curso |
| Modo Retos: carrera y tormenta | agente | Opus | en curso |
| Controles en PC (icono y panel), «no eleva», encajada en la torre | agente | Opus | en curso |
| Pieles de las 22 especies sobre Vittata | agente | Opus | en curso |
| Auditoría de diversión, plan familiar y propuesta de Comunidad | agente | Fable | en curso |
| Carril B de la API (B3 y B4) | ejecutor API | Opus | en curso (empezó antes del registro) |
| Carriles A, C, D y E de la API | ejecutor API | — | **detenidos** hasta que Kelvin apruebe los topes |

**Desperdicio y duplicados encontrados**
1. **Revisión de «New Folder»:** se pidió, se canceló y la hice yo en 2 minutos. Hubo un solapamiento pequeño.
2. **Carriles A, C y D de la API:** se pararon a medias (A1, C1, C3, D2) y dejaron cambios sin commit en `renderer.js`, `diario.js`, `paradas.js`, `accesibilidad.js` y `ui.css`. Hay riesgo de que otro los pise o los rehaga.
3. **Tareas E2-2 y E2-3:** pasaron del equipo 2 a la API y quedaron sin correr. No hubo gasto, pero sí ruido.
4. **Build y pruebas repetidas:** cada agente compila y corre las 13–14 baterías completas. Con la carga en 19, el E2E falla por timeout y se repite: es el mayor gasto de tiempo de máquina.
5. **Contexto del coordinador:** pasa de 300 000 tokens. Cada turno lo relee de caché.

**Medidas**
- **(a) Pruebas:** que cada agente corra solo sus baterías. La batería completa la corre QA una vez por ronda. Falta una opción `--solo` en `test.sh`: es una tarea S.
- **(b) Carriles:** no relanzar un carril sin antes cerrar lo que dejó a medias.
- **(c) Coordinador:** sesión nueva con un documento de traspaso al cerrar el capítulo 1.
- **(d) Agentes:** como mucho 4 o 5 a la vez en esta Mac.
- **(e) Auditorías:** no repetirlas; leer los documentos que ya existen (`CAP1_PENDIENTE`, `COTORRAS_22_INFORME`, `DIVERSION_CAP1`).

## Reparto de modelos
| Modelo | Para qué | Ejemplos |
|---|---|---|
| **Fable** (cuota semanal propia) | planificación compleja y evaluación creativa | auditoría de diversión, diseño de bucles, revisión de propuestas |
| **Opus** | implementación y diagnóstico complejos | motor, física, gráficos, Blender, retos |
| **Sonnet** | tareas habituales | contenido, documentos, pruebas, arreglos acotados |
| **Haiku** | verificaciones sencillas | leer registros, comprobar enlaces, resúmenes de pruebas |
| **API** (con topes) | trabajo en paralelo bien definido | carriles de `TAREAS_API.md` |

## Tareas
| Fecha | Tarea | Responsable · modelo | Consumo | Tiempo | Archivos | Pruebas | Resultado verificable |
|---|---|---|---|---|---|---|---|
| 25-oct | Final del cap. 1 en escena (paquete B) | agente · Sonnet | 430 000 tokens, 212 herramientas | 68 min | `content/cap1/historia.js`, `pack.js`, `mundo.js`, `pruebas.js` | build y test.sh --extra: 14/14 | d7fcec5: apertura, sonidos, plano del bote, luz ×3; missionTest 35→55 |
| 25-oct | Revisión de los 22 .blend | agente · Sonnet | 263 000 tokens, 95 herramientas | 49 min | `docs/equipo/COTORRAS_22_INFORME.md`, lámina | — (solo documento) | e02f5ce: un modelo con 22 pieles; rig incompatible; opciones B/D/E |
| 25-oct | Destrabar el push (CI a `tools/ci/`) | coordinador · Opus | pequeño | 10 min | historial sin publicar, `DECISION_LOG.md` | push correcto | 46cb979 en GitHub |
| 25-oct | Topes, alertas y registro en el ejecutor | coordinador · Opus | pequeño | 15 min | `tools/agente_api/ejecutor.py`, `limites.json` | `--gastos` y prueba de bloqueo con tope 0 | el ejecutor no corre sin topes aprobados |
| 25-oct | Auditoría de diversión del cap. 1, plan familiar y propuesta de Comunidad | agente · Fable | 268 000 tokens, 41 herramientas (Fable semanal: 0 → 2 %) | 12 min | `docs/equipo/DIVERSION_CAP1.md`, `docs/equipo/COMUNIDAD_PROPUESTA.md` | — (solo documentos) | c1aa283: las 9 preguntas con minuto y archivo; 10 mejoras, 5 ★; no al PvP ni a los autos |
| 25-oct | Modo Retos: carrera en El Yunque y ¡Escapa de la tormenta! | agente · Opus | 546 000 tokens, 223 herramientas | 53 min | `src/game/retos.js` (carga perezosa), enganches en `index.html` y `boot.js`, capturas | build y test.sh --extra: 15/15, retosTest 50/50, 0 errores | 27355c7, 22b720e, 69df5d3: carrera de 41–67 s según el piloto; tormenta de 90 s; la partida queda intacta |
| 25-oct | Cierre del cap. 1 y «Comenzar de cero» (paquete A) | agente · Sonnet | (ver aviso de cierre) | — | `src/game/misiones.js`, `src/engine/guardado.js`, `index.html`, `content/cap1/pruebas.js` | build y test.sh --extra: 14 baterías en verde (selfTest 82/82, saveTest 31) | d4738d9, 4ee6856, 0d5e762: partida y cómic solo se borran con «Comenzar de cero»; «Sí» del menú con dos toques; el almacén lleno ya no borra fotos del cómic |
| 25-oct | C1 «Amazonas del mundo» en el Diario y C3 cinco paradas de ciencia de Puerto Rico (carril C del ejecutor) | agente · Sonnet | — | — | `src/game/diario.js`, `content/cap1/paradas.js`, `content/cap1/pruebas.js`, `docs/equipo/TAREAS_API.md` | build y test.sh --extra: 15/15 (eduTest 79/79), 0 errores de consola | 86b8a25, 0f9f3fe, b6c2e94: 33 especies con fuente y 13 sin estado UICN; 5 paradas con datos releídos en USFWS y USDA FS y posiciones medidas (las anteriores caían dentro de dos casas) |
| 25-oct | C1 especies en el Diario y C3 cinco paradas | agente · Sonnet | 272 000 tokens, 124 herramientas | 20 min | `src/game/diario.js`, `content/cap1/paradas.js`, `pruebas.js` | 15/15, eduTest 79/79 | 86b8a25, 0f9f3fe, b6c2e94: 33 especies con fuente; 5 paradas de 3 opciones |
| 25-oct | Partida dañada sin borrar, Aula «Comenzar de cero» y doc de seguridad | agente · Sonnet | 464 000 tokens en total, 156 herramientas (cierre del capítulo y ajustes) | 96 min | `core.js`, `guardado.js`, `aula.js`, `SEGURIDAD_INFANTIL.md` | saveTest 45/45, maestroTest 25/25 | 7232117, b8b68f4, bdb893f: copias con fecha, aviso suave, nada se borra solo |
| 25-oct | E1 Diario validado y E2 documentos y Cómo se juega | agente · Fable | 310 000 tokens, 139 herramientas | 25 min | `coleccionables.js` (textos), `DIARIO_VALIDACION.md`, `GDD_CAP1.md`, `CHAPTER_01_GAMEPLAY.md`, `EDUCATIVO.md`, `COMO_SE_JUEGA.md` | 15/15, eduTest 78/78 | ee215a9, 487085d: 12 textos con fuente, 7 corregidos |
| 25-oct | E2E del capítulo completo y duración (paquete C) | agente · Sonnet | 441 000 tokens, 151 herramientas | 151 min | `tests/qa/e2e.js`, `BUGS.md`, `CAP1_PENDIENTE.md` | e2eTest 42/42 (rama A) y 40/40 (rama B) | fa29fcc: el capítulo llega al final; piso de duración de 6 min sin leer y 8,5 min leyendo; QA-35 (carpeta de build compartida) |
| 25-oct | Controles en PC (icono, panel «¡Así se juega!»), «no eleva» y encaje en la torre | agente · Opus | 599 000 tokens, 267 herramientas | 78 min | `fisica.js`, `input.js`, `src/game/guia_controles.js`, `movimiento.js`, docs | 15 baterías en verde, movementTest 38/38, controlesTest 19/19 | 00e8516, 486aa79, 8266362: 4 causas de «no eleva» corregidas; red de seguridad contra encajes |
| 25-oct | Botón Acción en móvil (iOS) | coordinador · Opus | pequeño | 15 min | `input.js`, `interaccion.js` | caso nuevo en teclasTest; batería completa en curso | fa5a62b: pointerdown, aviso si no hay nada cerca, botón atenuado |
| 25-oct | D2 y D4 del ejecutor de la API: accesibilidad (texto en 3 niveles, alto contraste, subtítulos de sonido, modo relajado y modo zurdo) | agente · Sonnet | — | — | `src/game/accesibilidad.js`, `src/ui/ui.css`, `src/engine/audio.js`, `src/engine/fx.js`, enganches en `index.html` y `boot.js` | build y test.sh --extra: 17 baterías en verde, accesibilidadTest 36/36, 0 errores de consola | 920bc30 (D2) y 62f7208 (D4): los ajustes se guardan en la partida y sobreviven a «Comenzar de cero»; subtítulos de 15 sonidos; una maqueta móvil prueba 375×812 y 320×568 en los 3 niveles de texto |

## Reparto de recursos (25-oct, 19:00) · «terminar lo más posible»
Medido: la semana va por el 43 % de todos los modelos (tope 75 %, quedan 32 puntos para 6 días) y por el **4 % de Fable**. Unos 580 000 tokens de Fable movieron su ventana 4 puntos, mientras «todos los modelos» subía sobre todo por los agentes de Opus y Sonnet: **Fable tiene mucho margen y no parece gastar la cuota general**.
- **Fable** pasa también a implementar: las mejoras de diversión 1, 3 y 4, y 2 y 5 (dos agentes).
- **Opus**, solo donde ya trabaja: ciudad, pieles y pruebas estables.
- **Sonnet**: récords y compartir, accesibilidad.
- **Mac**: como mucho 7 agentes pesados a la vez; cada uno compila en su propia carpeta (QA-35).
- **API** ($40 en total, $20 por día): carriles bien definidos cuando Kelvin pueda pegar la clave en la Mac.
- **Coordinador**: al cerrar la versión 1, documento de traspaso y una sesión nueva (si la app lo permite, con Fable) para no releer un contexto de 480 000 tokens en cada turno.
