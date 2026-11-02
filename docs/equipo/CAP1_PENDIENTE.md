# CAP1_PENDIENTE · qué falta para cerrar el capítulo 1

**Estado al 2-nov-2026: capítulo 1 al 100 %.** El veredicto y la sección 1 son de la revisión del 25-oct (con los estados actualizados); las secciones 2 a 4 están al día.

Capítulo 1, «El día que el cielo se rompió». Revisión del productor senior, 2026-10-25, sobre `main` en f497112 (con cambios sin commit de otros carriles; ver al final). Solo lectura: no se editó código.

**Método.** Cada estado sale de leer `content/cap1/`, `src/game/` y `src/engine/`, y de buscar en el código cada elemento del diseño (`docs/CHAPTER_01_GAMEPLAY.md`, `CHAPTER_01_SCRIPT.md`, `docs/equipo/GDD_CAP1.md`, `NARRATIVA_CAP1.md`, `STORY_BIBLE.md`, `BACKLOG.md`, `ROADMAP.md`, `BUGS.md`, `TAREAS_API.md`). En el navegador integrado confirmé que el juego arranca con 8 pasos de historia, 3 misiones (`m1`, `educativa`, `m3`), 12 hallazgos del Diario y 3 islas, y probé el cierre del capítulo (hallazgo P0-1). **No volví a correr las baterías:** los conteos de pruebas (selfTest, missionTest, eduTest, etc.) vienen de `BUGS.md` y `PRODUCTION_DASHBOARD.md` (v21 a v25).

## Veredicto

La historia es jugable de principio a fin y cada paso tiene su escena, su prueba y su guardado. Lo que impide darlo por cerrado no es contenido nuevo grande:

1. **El final no deja seguir jugando** y «Jugar de nuevo» borra la partida sin avisar (P0-1).
2. **La Voz misteriosa sale con la cara del Guardián** (P0-2), lo contrario del guion.
3. **No hay medidas reales**: ni duración con jugadores ni FPS en equipos de escuela (P0-3, P0-4), y ninguna prueba automática recorre el capítulo completo con la build publicada (P0-5).
4. Hay momentos del final que existen solo como diálogo (la luz que parpadea tres veces, el plano del bote) y un bloque de «wow» del GDD que no se hizo.

## 1. Hitos del capítulo según el diseño

Estados: **Hecho** (localizado en código y cubierto por prueba), **Parcial** (existe, pero falta una parte del diseño), **Falta** (no hay rastro en el código). Las pruebas citadas son de `content/cap1/pruebas.js` (`missionTest` salvo que se diga otra).

| # | Hito (fuente) | Estado | Evidencia |
|---|---|---|---|
| 1 | Crear personaje: nombre de listas, plumaje, pañuelo, accesorio; aprendiz que acompaña (GAMEPLAY 0) | Hecho | `src/game/creador.js`; `pruebas.js:36-41`; E2E pasos 1-2 (`tests/qa/e2e.js`) |
| 2 | Gancho y Ruptura: negro con viento, taller con luz, ZZZT, onda en el cielo (SCRIPT p.1-3; NARRATIVA «Gancho») | Hecho | AP1 (30-oct): apertura completa del guion y se puede saltar (cualquier tecla o «Saltar»); missionTest 75/75 (antes: `historia.js:54` `inicio(G)`: 3 escenas de Narrador y Vittata, sacudida de cámara y sonido `zzzt`; prueba `pruebas.js:20…) |
| 3 | Despertar y examinar la máquina y el transmisor (SCRIPT p.3-4) | Hecho | `historia.js:89` `examine()`; `pruebas.js:59`. El taller solo se ve por fuera (el bohío no tiene interior; GAMEPLAY lo anota) |
| 4 | Iguaca pide ayuda; Vittata cede: «¿me ayudas?» (SCRIPT p.4; NARRATIVA M1) | Hecho | `historia.js:103` `talkLuma()`; escenas `c1_luma_llama` y `c1_acepta_ayuda`; `pruebas.js:61`; la familia da 3 tablas (`historia.js:13`) |
| 5 | M1 «Fondo del río» (nadar a por la pieza de metal; botas) (GDD §3) | Hecho | `content/cap1/misiones.js:19` (`m1`); pieza `c1` con `fondo: true` en `mundo.js`; `pruebas.js:221-225` |
| 6 | Recolectar madera, piedra y metal; «restos son posibilidades» (SCRIPT p.5) | Hecho | paso `recolectar` en `historia.js`; evento `ResourcesCollected`; `pruebas.js:64` |
| 7 | Dos terrenos y «La ruta de la gota» (SCRIPT p.6; GDD §3 M2, que ahora es la misión educativa) | Hecho, con desvío | `misiones.js:25` (`educativa`, pasos p1-p8), `content/cap1/educativa.js` (942 líneas), `lecciones.js`; eduTest. Los anillos de vuelo del GDD los rechazó el fundador y ya no existen (`pruebas.js:234`) |
| 8 | Construir el refugio con fantasma verde/rojo (SCRIPT p.8) | Hecho | `historia.js:174` `placeRefuge()`; `pruebas.js:73-77` |
| 9 | Crecida: río sube, daña el refugio en el terreno A, se puede desarmar y mover a la colina (NARRATIVA M2; GDD wow 5) | Hecho | `historia.js:205` `finishRainEvent()`, `:230` `dismantle()`; cámara que tiembla; `pruebas.js:78-87`. Sin sonido de lluvia (ver P1-4) |
| 10 | Techo con el engranaje de la máquina rota: Vittata sacrifica lo suyo (NARRATIVA M2 cierre) | Hecho | BM24 (5aa518b): `S.gearRoof`, la máquina con hueco y el engranaje en el techo (30-oct, Claude web; antes: Solo la línea `c1_engranaje`. La máquina del taller (`mundo.js:279`) no cambia y el refugio no muestra ningún engranaje…) |
| 11 | El Guardián llega y presenta el refugio; regala el banco (SCRIPT p.7-9) | **Hecho** | 962e809 (BM47): el Guardián sigue el guion (llega al paso de construir, ayuda con la pieza, regala el banco tras la crecida). 843f93d (1-nov, decidido por Kelvin): la familia de Iguaca, la Abuela y el Papá, llega volando al refugio de la colina y da las gracias (SCRIPT p.9); en el cap. 2 reconocen a Vittata. Baterías en verde en la Mac (558da9f) |
| 12 | M3 «Co-quí»: Simon de 3 coquíes con opción «Pasar» tras 2 fallos; elección con Iguaca (GDD §3) | Hecho | `misiones.js:30`, `:71` `startChorus`, `:84` `startSimon`; `pruebas.js:260-273`. El coro «al atardecer con luciérnagas» no existe (ver 20) |
| 13 | Reparar el transmisor, símbolo de 36 fragmentos y la Voz (SCRIPT p.10) | Hecho, con un fallo de canon | `historia.js:265` `useTransmitter()`, `showSymbol/drawSymbol`; escena `c1_voz` («viene otra tormenta»); `pruebas.js:94`. **La Voz usa el retrato del Guardián** (`pack.js:95-96` y `historia.js:278`) |
| 14 | El Guardián reconoce el emblema (SCRIPT p.11; NARRATIVA «Giro»: la pieza igual a su medalla) | Hecho, con texto por validar | BM24 (5aa518b): escena `c1_guardian_medalla` y retrato con medalla; texto [KELVIN] en DECISION_LOG (30-oct, Claude web; antes: Escena `c1_guardian_calla`: reconoce el símbolo y calla. No hay medalla en diálogo ni en su sprite (`grep medalla` solo da accesorios del cr…) |
| 15 | Mirador: islas en la niebla, plano de embarcación, luz que parpadea tres veces, cliffhanger al cap. 2 (SCRIPT p.12; NARRATIVA «Final») | Hecho | BM24 (5aa518b): mirador y plano ya existían; missionTest 73/73 (30-oct, Claude web; antes: `historia.js:287` `useMirador()`; 3 islas en `terreno.js:528-559` y `ISLANDS` del mapa; escenas `c1_plano_bote`, `c1_mirador`, `c1_cliffhang…) |
| 16 | Pantalla de capítulo completo y salida al cómic | Hecho | BM25 (f29d186, ae89614): «Seguir explorando», «Ver mi cómic» con EN y botones ≥ 44 px (30-oct, Claude web; antes: `src/game/misiones.js:118` `showEnd`, `index.html:190` `#end`; `pruebas.js:99`. Defecto de cierre: ver P0-1…) |
| 17 | Cómic personal editable y exportable con eventos reales (GAMEPLAY) | Hecho | `pack.js:105` (4 viñetas de historia) más las de eventos de juego en `src/game/comic.js`; comicTest 19/19; E2E paso 6; PNG 1080×1520 en `pruebas.js:135-137` |
| 18 | Diario de Campo: 12 hallazgos por proximidad (GDD §4) | Hecho, con texto por validar | `coleccionables.js` (6 fauna, 6 cultura); `pruebas.js:245-251`. El encabezado del archivo dice «Textos pendientes de validar con una fuente cultural» |
| 19 | Ropa desbloqueable por hitos (GDD §5) | Hecho, con un desvío | `coleccionables.js` bloque `ropa`; `pruebas.js:225,271`. La `pava` la da la misión educativa, no M2 de anillos |
| 20 | Momentos «wow» (GDD §6): despegue del mirador, bahía bioluminiscente, coro con luciérnagas, bandada de 20 cotorras, crecida | **Hecho** | Revisado 1-nov (nube): los 5 existen y tienen prueba. Despegue del mirador y coro con luciérnagas en `src/game/wow.js` (BM20, `wowTest` 13/13); bahía bioluminiscente de noche en `src/game/maravillas.js` (`maravillasTest` 27/27); bandada de 20 cotorras en `src/game/bandada.js` (`bandadaTest` 17/17); crecida en `historia.js`. Atardecer del coro en `atardecer.js` (`atardecerTest` 17/17). Cifras del reporte del publicador de la Mac, 1-nov |
| 21 | Feedback «juicy» (GDD §7): sonido, cámara, partículas | Hecho | BM22 (polvo, salpicadura, hojas) y e6ddad1 (música a 0,6 en los diálogos; «Reducir movimiento» suaviza trueno, crecida y martillazos). Lluvia, trueno, crecida y martillazos en `content/cap1/pack.js` (30-oct, Claude web; antes: Sonido sintético (`src/engine/audio.js`, 5 muestras nuevas), FOV y sacudida (`camara.js:117-122`), `burst` en `fx`. Lluvia, trueno, crecida …) |
| 22 | Móvil (GDD §8): Acción contextual, Bucear táctil, botones grandes | Hecho, sin probar en un teléfono real | Modo zurdo (G2; AP3 30-oct: accesibilidadTest 39/39 a 375×812, 412×915, 812×375 y 320×568), Acción contextual, Bucear táctil, botones ≥ 44 px. Falta solo probar en un iPhone/Android real (NEEDS CREATOR) |
| 23 | Accesibilidad (GDD §9) | Hecho | Texto en 3 niveles, alto contraste, subtítulos de sonido, modo relajado y zurdo (`accesibilidad.js`, accesibilidadTest 37/37); remapeo de teclas D3 (0fb8bbd, teclasTest 17/17) (30-oct, Claude web; antes: Reducir movimiento (`renderer.js:27`, `camara.js:117`), «Pasar» en el Simon, HUD con ✓. En curso sin commit: texto en 3 niveles y alto contr…) |
| 24 | Guardado, migraciones y recuperación | Hecho | `pack.js` guardado v5; saveTest 27/27 |
| 25 | Idioma | Hecho | `content/cap1/en.js` y `ep2..ep6/en.js`; idiomaTest 16/16; QA-65 cerrado (30-oct, Claude web; antes: La misión educativa y el Aula son ES/EN (33 líneas con `en:` en `educativa.js`); historia, HUD y diálogos (`historia.js`, `misiones.js`, `di…) |
| 26 | Duración 10-15 min (GDD) / 20-30 min (GAMEPLAY) / 45 min de clase (EDUCATIVO) | **Hecho** | 1-nov: los sobrinos de Kelvin jugaron el cap. 1 como jugadores nuevos hasta «Capítulo completo» en **16 min** («les encantó»). Dentro de la meta del diseño (10–15 min del GDD; 20–30 de GAMEPLAY) y por encima del mínimo automático (5 min 42 s sin leer) |
| 27 | Rendimiento en equipos de escuela | **Hecho** | Medido por Kelvin el 1-nov con `#fps`, volando sobre la selva en calidad «medio»: **Android** (Chrome, DPR 1,5) 89 FPS, mín 40, 186 draw calls, 1,1 M triángulos; **iPad** (Safari, DPR 1,0) 39 FPS, mín 36, 133 draw calls, 689 k triángulos. Los dos por encima de 30 y estables |
| 28 | Calidad visual de los objetos de la historia | **Hecho** | 1-nov (Kelvin autorizó): máquina experimental (caldera de cobre, aspa, engranaje, manivela, indicador y luces que fallan), transmisor (radio de madera con altavoz, dial, antena; el piloto parpadea cuando habla la Voz), banco tallado y coquí pardo con discos en los dedos, en geometría de three.js (1,6–2,9 k triángulos cada uno) en lugar de primitivas; `docs/img/hito28/`. Diseño provisional de máquina y transmisor marcado [KELVIN-6]. Iguaca, Abuela y Papá ya con retrato 3D vibrant_toon |

## 2. Lo que faltaba para cerrar el capítulo (al día, 2-nov-2026)

**Estado: el capítulo 1 está al 100 %.** Todo lo de esta sección está hecho; lo único abierto son decisiones de Kelvin (sección 3). Las evidencias salen de la tabla de la sección 1, de `git log` y de `docs/equipo/BUGS.md`; los textos largos de la revisión del 25-oct se quitaron porque ya no describen el estado.

### P0
| # | Qué | Estado | Evidencia |
|---|---|---|---|
| P0-1 | Cierre: «Seguir explorando» y «Comenzar de cero» con pregunta | Hecho | BM25 (ae89614, f29d186); `docs/CHAPTER_01_GAMEPLAY.md` («P0-1 cerrado»); `saveTest` |
| P0-2 | La Voz sin la cara del Guardián | Hecho | QA-34 cerrado; la Voz y el Narrador llevan retratos neutros (`content/cap1/pack.js`) |
| P0-3 | Duración con jugadores | Hecho | 1-nov: los sobrinos de Kelvin, **16 min** hasta «Capítulo completo» (hito 26; c307d16). Piso automático 5 min 42 s sin leer, en el paso «T» de `e2eTest` |
| P0-4 | FPS en equipos reales | Hecho (falta un Chromebook) | 1-nov, Kelvin: Android 89 FPS (mín 40), iPad 39 FPS (mín 36) (hito 27; b84a3e8) |
| P0-5 | Recorrido completo hasta `ChapterCompleted` con la build | Hecho | `tests/qa/e2e.js`; `e2eTest` 47/47 en el playtest BM122 (2-nov) |

### P1
| # | Qué | Estado | Evidencia |
|---|---|---|---|
| P1-1 | Luz de la niebla y plano del bote en escena | Hecho | BM24 (5aa518b), hito 15 |
| P1-2 | El Guardián ayuda y la familia de Iguaca entra | Hecho | BM47 (962e809) y 843f93d, hito 11 |
| P1-3 | Apertura con negro, viento y onda | Hecho | AP1, hito 2 (se puede saltar) |
| P1-4 | Sonido de la crecida y de construir | Hecho | Hito 21 |
| P1-5 | Los 12 textos del Diario con fuente | Hecho | `docs/equipo/DIARIO_VALIDACION.md`, `FUENTES_CAP1.md` (BM120, 894e439) |
| P1-6 | Máquina y transmisor con calidad comercial | Hecho (diseño provisional) | Hito 28 (92fe4b2); diseño marcado [KELVIN-6] |
| P1-7 | Accesibilidad: subtítulos de sonido, modo relajado, zurdo, remapeo | Hecho | Hitos 22 y 23 (`accesibilidadTest`, `teclasTest`) |
| P1-8 | Documentos del cap. 1 al día | Hecho en lo esencial | `GDD_CAP1.md` y `CHAPTER_01_GAMEPLAY.md` ya sin los anillos; `EDUCATIVO.md` para todas las edades |

### P2
| # | Qué | Estado |
|---|---|---|
| P2-1 | Los «wow» del GDD §6 | Hecho (hito 20: despegue, bahía, coro con luciérnagas, bandada, crecida) |
| P2-2 | Engranaje visible | Hecho (BM24, hito 10) |
| P2-3 | Taller con interior | Fuera del capítulo 1, decidido «después» (`DECISION_LOG.md`) |
| P2-4 | Cómic con más viñetas | No se hizo; no bloquea (comicTest 19/19 con las 4 viñetas de historia más las de eventos) |
| P2-5 | Modelos 3D de Iguaca y el Guardián | Iguaca, la Abuela y el Papá ya con retrato 3D vibrant_toon (hito 28); el Guardián sigue pendiente de su forma (sección 3, punto 1) |
| P2-6 | Bugs de `BUGS.md` que no bloqueaban | Ver `BUGS.md`; solo QA-85 (intermitente, cap. 2) está abierto de peso |

## 3. Decisiones de Kelvin

Las abiertas están consolidadas en `docs/equipo/PENDIENTES_KELVIN.md` (BM123); no se repiten aquí. Estado de las nueve de la revisión:

| # | Tema | Estado |
|---|---|---|
| 1 | Aprobar el guion; forma del Guardián | Abierta (`PENDIENTES_KELVIN.md` §1) |
| 2 | Orden del Guardián | Decidida (KELVIN-2): sigue el guion; implementado en BM47 |
| 3 | Medalla del Guardián | En el juego (BM24, BM53) con texto por validar; sigue en `PENDIENTES_KELVIN.md` §1 |
| 4 | La Voz | Decidido que son las dos extintas (KELVIN-4); falta cómo se presenta (`PENDIENTES_KELVIN.md` §1) |
| 5 | Iguaca y el Guardián en 2D | Iguaca ya en 3D; el Guardián abierto |
| 6 | Diseño de máquina y transmisor | Hecho con diseño provisional [KELVIN-6]; pendiente de confirmar |
| 7 | Alcance y duración | Medida en 16 min; los «wow» están en el juego |
| 8 | Idioma | Bilingüe ES/EN en todo el juego |
| 9 | Taller con interior | Después del cap. 1 |

Siguen dependiendo de Kelvin: revisión legal de la bandera (Reglamento 5282), revisión de privacidad infantil (COPPA), citas DRNA/USFWS y el día de legal y monetización (`PENDIENTES_KELVIN.md` §0). Ninguna bloquea el trabajo técnico.

## 4. Paquetes de trabajo

Los paquetes A (cierre), B (final en escena), C (medición y E2E), D (contenido verificado y documentos) y E (accesibilidad y móvil) están **cerrados**. No queda trabajo propio del capítulo 1. Lo que sigue son los otros capítulos en el mapa real (`docs/equipo/MUNDO_UNICO.md`) y el rendimiento de las ruinas (`docs/equipo/TAREAS_KIMI.md`).
