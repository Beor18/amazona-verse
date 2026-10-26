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
| 25-oct | A1: `contextTest` estable (QA-30) y `retosTest` estable | agente · Opus | — | 60 min | `src/engine/renderer.js`; `src/game/retos.js` (solo la prueba) | build en carpeta propia y test.sh --extra: 3 corridas seguidas de 16/16 en 9e5bdcb y otras 3 de 17/17 con retos, 0 errores de consola | 35a426d: el haz guía y la calidad quedan quietos durante la prueba, el mundo se asienta por cuadros y la prueba ya no se cuelga con el jugador quieto · 0e82a09: semillas y combo, de 7 fallos en 30 a 0 en 40 |

## Reparto de recursos (25-oct, 19:00) · «terminar lo más posible»
Medido: la semana va por el 43 % de todos los modelos (tope 75 %, quedan 32 puntos para 6 días) y por el **4 % de Fable**. Unos 580 000 tokens de Fable movieron su ventana 4 puntos, mientras «todos los modelos» subía sobre todo por los agentes de Opus y Sonnet: **Fable tiene mucho margen y no parece gastar la cuota general**.
- **Fable** pasa también a implementar: las mejoras de diversión 1, 3 y 4, y 2 y 5 (dos agentes).
- **Opus**, solo donde ya trabaja: ciudad, pieles y pruebas estables.
- **Sonnet**: récords y compartir, accesibilidad.
- **Mac**: como mucho 7 agentes pesados a la vez; cada uno compila en su propia carpeta (QA-35).
- **API** ($40 en total, $20 por día): carriles bien definidos cuando Kelvin pueda pegar la clave en la Mac.
- **Coordinador**: al cerrar la versión 1, documento de traspaso y una sesión nueva (si la app lo permite, con Fable) para no releer un contexto de 480 000 tokens en cada turno.
| 25-oct | Pieles de las 22 especies sobre Vittata | agente · Opus | 360 000 tokens, 163 herramientas | 83 min | `tools/blender/pieles_cocer.py`, `assets/textures/pieles/` (1,5 MB, carga perezosa), `especies.js` (`piel`), `src/personaje/pieles.js`, enganches | 18/18, pielesTest 13/13, retosTest 50/50 | 4e0c2f1, 3598338, 521097d: 22 pieles al 0,042 % de distancia; rivales y creador ya las usan |
| 25-oct | «Mis récords» (de la casa), compartir el cómic y el récord con puerta para adultos | agente · Sonnet | (ver aviso de cierre) | — | `src/game/records.js` (perezoso), enganches en `comic.js`, `retos.js`, `index.html`, `boot.js` | 19 baterías en verde, recordsTest 46/46 | 1d29508: todo local; compartir con el menú del sistema o descargar el PNG |
| 25-oct | Diversión cap. 1, mejoras 2 («Lo que gano se ve») y 5 («Cómic con humor y foto con pose») de DIVERSION_CAP1 | agente · Fable | (ver aviso de cierre) | — | `src/game/lugares.js` y `src/game/momentos.js` (nuevos), `misiones.js` (Próximo), `criadero.js` (nido desde Luma, +XP y huevo en el HUD, brinco), `actores.js` (Foto), `content/cap1/pack.js` (clave `lugares`, eventos y 5 viñetas), `index.html` | build fable25-d8637c1: 21 baterías en verde (e2e 42/42, criaderoTest 49/49, lugaresTest 12/12, momentosTest 20/20, accesibilidadTest 36/36), 0 errores de consola | 23bdfb5 y d8637c1: el nido entra en el minuto 2 con «+N XP al nido» y huevo con días; «Próximo: premio · pista»; «Descubriste: lugar» una vez por lugar (guardado); viñetas del chapuzón, aterrizaje torpe, brinco, primer récord y Foto con pose. Provisional: textos de humor y 8 XP por lugar |
| 25-oct | Diversión cap. 1, mejoras 1 («Luma llama desde arriba»), 3 («Diálogo que no frena») y 4 («La crecida se juega») de DIVERSION_CAP1 | agente · Fable | (ver aviso de cierre) | — | `src/game/dialogo.js` (bocadillos libres), `src/pruebas/motor.js` (drain), `content/cap1/historia.js` (orden de pasos, percha de Luma, escenas libres, crecida de 20 s con rescate), `content/cap1/pruebas.js`, `tests/qa/e2e.js` | build fable134-a9af309: 21 baterías en verde (e2e 44/44, selfTest 94/94, missionTest 62/62), 0 errores de consola | 3 commits (uno por mejora): primer vuelo a los 3 s del E2E (antes minuto 4–5); diálogo que para el juego 70 líneas / 222 s → 21 / 103 s; crecida con 3 cosas que se salvan al vuelo (evento FloodRescue, el hallazgo entra al Diario). Provisional: frases de Luma del rescate y pista del taller; [KELVIN] si Luma vuela o solo flota |
| 25-oct | Música y ambiente sintetizados | agente · Sonnet | 379 000 tokens, 109 herramientas | 35 min | `src/game/musica.js` (perezoso), `audio.js` (+1 línea), `boot.js` | 22/22, musicaTest 47/47 | f15aa26: 5 pistas (alegre, explora, retos, tensión, final), ambiente por zona; volúmenes en la pausa |
| 25-oct | Ciudad completa: edificios de alta fidelidad (lote 1, ruinas antiguas; lote 2, complejo de la Colina) | agente · Opus | (ver aviso de cierre) | ~6 h | `src/engine/streaming.js` (_hd), `tools/blender/edificios_hd*.py` y `edificios_complejo.py` (nuevos), `assets/models/edificios/*_hd*`, `tex_hd/` y el complejo, `docs/EDIFICIOS.md` § Ciudad completa | 22/22, streamingTest 11/11, movementTest 38/38, e2eTest 44/44 | 7aeb6a0 y a9b541a: 20 modelos _hd y el complejo reconstruido; capturas `docs/img/ciudad_*`; pendiente lote 3 (sogas de Savage) |
| 25-oct | Mapa completo: diagnóstico del terreno original (AV3DMaxTerrainExport.max) frente al juego | agente · Opus | (ver aviso de cierre) | ~1 h | `tools/blender/mapa_original_diag.py` (nuevo), `docs/equipo/MAPA_COMPLETO.md`, `docs/img/mapa_original_vs_juego*.png` | sin código del juego (no aplica batería) | 17 nodos: un solo terreno (100 % de su huella está bajo la isla; 88,7 % en tierra), mar y bosque MultiScatter con máscara de sendas; sin ciudad ni otra región. Fase 2 no aplica: una región «río Amazonas» necesita mundo con regiones (propuesta para Kelvin) |
| 25-oct | Banquete en la selva (V9 punto 1): frutos en palmas y tabonucos, recoger en vuelo, comer posada en la rama (P1 de Kelvin), llevar al nido con XP, minijuego «¡Banquete!» y dato USFWS | agente · Fable | (ver aviso de cierre) | — | `src/game/banquete.js` (nuevo, perezoso), hunks mínimos en `retos.js`, `records.js`, `boot.js`, `criadero.js` (+fuente `fruta`) | 25 baterías en verde, banqueteTest 43/43, 0 errores de consola | capturas `docs/img/banquete_*.png`; estado EXISTE/PARCIAL/PENDIENTE en `V9_BOSQUE_VIVO.md` |
| 25-oct | Ciudad completa, ronda 2: visibilidad desde lejos, lote 3 (Savage con sogas) y complejo | agente · Opus | (ver aviso de cierre) | ~3 h | `streaming.js` (zonaLejos), `mundo.js` (1 condición), `tools/blender/edificios_lejos.py` (nuevo), `edificios_hd.py`, `edificios_complejo.py`, 21 `_hd` Savage, 9 lejanos, `docs/EDIFICIOS.md` | requeridas en verde (movement 38/38, streaming 11/11, e2e 44/44); 4 errores de consola ajenos (ui.js:51) | 7b72f4e: 17 de 17 zonas visibles en el móvil (antes 9) |
