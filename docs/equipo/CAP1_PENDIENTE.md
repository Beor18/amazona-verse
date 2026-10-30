# CAP1_PENDIENTE · qué falta para cerrar el capítulo 1

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
| 2 | Gancho y Ruptura: negro con viento, taller con luz, ZZZT, onda en el cielo (SCRIPT p.1-3; NARRATIVA «Gancho») | **Parcial** | `historia.js:54` `inicio(G)`: 3 escenas de Narrador y Vittata, sacudida de cámara y sonido `zzzt`; prueba `pruebas.js:207-209`. No hay pantalla negra, viento, brillo de nubes ni onda: el juego abre sobre el taller ya roto |
| 3 | Despertar y examinar la máquina y el transmisor (SCRIPT p.3-4) | Hecho | `historia.js:89` `examine()`; `pruebas.js:59`. El taller solo se ve por fuera (el bohío no tiene interior; GAMEPLAY lo anota) |
| 4 | Iguaca pide ayuda; Vittata cede: «¿me ayudas?» (SCRIPT p.4; NARRATIVA M1) | Hecho | `historia.js:103` `talkLuma()`; escenas `c1_luma_llama` y `c1_acepta_ayuda`; `pruebas.js:61`; la familia da 3 tablas (`historia.js:13`) |
| 5 | M1 «Fondo del río» (nadar a por la pieza de metal; botas) (GDD §3) | Hecho | `content/cap1/misiones.js:19` (`m1`); pieza `c1` con `fondo: true` en `mundo.js`; `pruebas.js:221-225` |
| 6 | Recolectar madera, piedra y metal; «restos son posibilidades» (SCRIPT p.5) | Hecho | paso `recolectar` en `historia.js`; evento `ResourcesCollected`; `pruebas.js:64` |
| 7 | Dos terrenos y «La ruta de la gota» (SCRIPT p.6; GDD §3 M2, que ahora es la misión educativa) | Hecho, con desvío | `misiones.js:25` (`educativa`, pasos p1-p8), `content/cap1/educativa.js` (942 líneas), `lecciones.js`; eduTest. Los anillos de vuelo del GDD los rechazó el fundador y ya no existen (`pruebas.js:234`) |
| 8 | Construir el refugio con fantasma verde/rojo (SCRIPT p.8) | Hecho | `historia.js:174` `placeRefuge()`; `pruebas.js:73-77` |
| 9 | Crecida: río sube, daña el refugio en el terreno A, se puede desarmar y mover a la colina (NARRATIVA M2; GDD wow 5) | Hecho | `historia.js:205` `finishRainEvent()`, `:230` `dismantle()`; cámara que tiembla; `pruebas.js:78-87`. Sin sonido de lluvia (ver P1-4) |
| 10 | Techo con el engranaje de la máquina rota: Vittata sacrifica lo suyo (NARRATIVA M2 cierre) | Hecho | BM24 (5aa518b): `S.gearRoof`, la máquina con hueco y el engranaje en el techo (30-oct, Claude web; antes: Solo la línea `c1_engranaje`. La máquina del taller (`mundo.js:279`) no cambia y el refugio no muestra ningún engranaje…) |
| 11 | El Guardián llega y presenta el refugio; regala el banco (SCRIPT p.7-9) | **Parcial** | `historia.js:240` `talkGuardian()`; banco visible (`mundo.js:301`); `pruebas.js:89`. Difiere del guion: aparece después de la crecida (no antes), no ayuda a construir (p.8) y no hay familia de Iguaca entrando al refugio (p.9) |
| 12 | M3 «Co-quí»: Simon de 3 coquíes con opción «Pasar» tras 2 fallos; elección con Iguaca (GDD §3) | Hecho | `misiones.js:30`, `:71` `startChorus`, `:84` `startSimon`; `pruebas.js:260-273`. El coro «al atardecer con luciérnagas» no existe (ver 20) |
| 13 | Reparar el transmisor, símbolo de 36 fragmentos y la Voz (SCRIPT p.10) | Hecho, con un fallo de canon | `historia.js:265` `useTransmitter()`, `showSymbol/drawSymbol`; escena `c1_voz` («viene otra tormenta»); `pruebas.js:94`. **La Voz usa el retrato del Guardián** (`pack.js:95-96` y `historia.js:278`) |
| 14 | El Guardián reconoce el emblema (SCRIPT p.11; NARRATIVA «Giro»: la pieza igual a su medalla) | Hecho, con texto por validar | BM24 (5aa518b): escena `c1_guardian_medalla` y retrato con medalla; texto [KELVIN] en DECISION_LOG (30-oct, Claude web; antes: Escena `c1_guardian_calla`: reconoce el símbolo y calla. No hay medalla en diálogo ni en su sprite (`grep medalla` solo da accesorios del cr…) |
| 15 | Mirador: islas en la niebla, plano de embarcación, luz que parpadea tres veces, cliffhanger al cap. 2 (SCRIPT p.12; NARRATIVA «Final») | Hecho | BM24 (5aa518b): mirador y plano ya existían; missionTest 73/73 (30-oct, Claude web; antes: `historia.js:287` `useMirador()`; 3 islas en `terreno.js:528-559` y `ISLANDS` del mapa; escenas `c1_plano_bote`, `c1_mirador`, `c1_cliffhang…) |
| 16 | Pantalla de capítulo completo y salida al cómic | Hecho | BM25 (f29d186, ae89614): «Seguir explorando», «Ver mi cómic» con EN y botones ≥ 44 px (30-oct, Claude web; antes: `src/game/misiones.js:118` `showEnd`, `index.html:190` `#end`; `pruebas.js:99`. Defecto de cierre: ver P0-1…) |
| 17 | Cómic personal editable y exportable con eventos reales (GAMEPLAY) | Hecho | `pack.js:105` (4 viñetas de historia) más las de eventos de juego en `src/game/comic.js`; comicTest 19/19; E2E paso 6; PNG 1080×1520 en `pruebas.js:135-137` |
| 18 | Diario de Campo: 12 hallazgos por proximidad (GDD §4) | Hecho, con texto por validar | `coleccionables.js` (6 fauna, 6 cultura); `pruebas.js:245-251`. El encabezado del archivo dice «Textos pendientes de validar con una fuente cultural» |
| 19 | Ropa desbloqueable por hitos (GDD §5) | Hecho, con un desvío | `coleccionables.js` bloque `ropa`; `pruebas.js:225,271`. La `pava` la da la misión educativa, no M2 de anillos |
| 20 | Momentos «wow» (GDD §6): despegue del mirador, bahía bioluminiscente, coro con luciérnagas, bandada de 20 cotorras, crecida | **Parcial** | Solo la crecida. Búsquedas sin resultado: `bandada`, `bioluminisc` y luciérnagas en el mundo (solo hay «polen y luciérnagas» en la escena del criadero, `criadero.js:562`, reutilizable). El cielo es fijo, «media mañana» (`mundo.js:100`), sin ciclo de día |
| 21 | Feedback «juicy» (GDD §7): sonido, cámara, partículas | Hecho | BM22 (polvo, salpicadura, hojas) y e6ddad1 (música a 0,6 en los diálogos; «Reducir movimiento» suaviza trueno, crecida y martillazos). Lluvia, trueno, crecida y martillazos en `content/cap1/pack.js` (30-oct, Claude web; antes: Sonido sintético (`src/engine/audio.js`, 5 muestras nuevas), FOV y sacudida (`camara.js:117-122`), `burst` en `fx`. Lluvia, trueno, crecida …) |
| 22 | Móvil (GDD §8): Acción contextual, Bucear táctil, botones grandes | **Parcial** | `interaccion.js:51`, `input.js:56`; matriz 375×812 sin botones < 44 px (`BUGS.md`, v21). Falta modo zurdo y probar en un iPhone/Android real (BACKLOG 1, NEEDS CREATOR) |
| 23 | Accesibilidad (GDD §9) | Hecho | Texto en 3 niveles, alto contraste, subtítulos de sonido, modo relajado y zurdo (`accesibilidad.js`, accesibilidadTest 37/37); remapeo de teclas D3 (0fb8bbd, teclasTest 17/17) (30-oct, Claude web; antes: Reducir movimiento (`renderer.js:27`, `camara.js:117`), «Pasar» en el Simon, HUD con ✓. En curso sin commit: texto en 3 niveles y alto contr…) |
| 24 | Guardado, migraciones y recuperación | Hecho | `pack.js` guardado v5; saveTest 27/27 |
| 25 | Idioma | Hecho | `content/cap1/en.js` y `ep2..ep6/en.js`; idiomaTest 16/16; QA-65 cerrado (30-oct, Claude web; antes: La misión educativa y el Aula son ES/EN (33 líneas con `en:` en `educativa.js`); historia, HUD y diálogos (`historia.js`, `misiones.js`, `di…) |
| 26 | Duración 10-15 min (GDD) / 20-30 min (GAMEPLAY) / 45 min de clase (EDUCATIVO) | **Falta (sin medir)** | No hay ninguna sesión con jugadores. El Aula ya registra `minutos_mision` (`educativa.js:390`), pero nadie lo ha leído de un niño. **Piso medido por el E2E (QA): 5 min 42 s a 5 min 55 s** de recorrido mínimo automático, que no mide a ningún jugador (ver P0-3) |
| 27 | Rendimiento en equipos de escuela | **Falta (sin medir)** | `ROADMAP.md` Fase 0 y `BUGS.md`: FPS no medibles; el único valor válido es de un M4. Descarga inicial 7,98 MB (cumple) |
| 28 | Calidad visual de los objetos de la historia | **Parcial** | Máquina, transmisor, banco y coquíes son primitivas (`mundo.js:279-301`, `misiones.js` `preparar`). Iguaca y el Guardián son sprites 2D de renders sustitutos (CANON_REGISTRY), junto a una Vittata 3D |

## 2. Lo que falta para cerrar el capítulo

Tamaños: S = menos de medio día, M = 1 a 2 días, L = más. «Choque» se refiere a los carriles A-D de `TAREAS_API.md`. En el momento de esta revisión hay cambios sin commit de esos carriles en `content/cap1/pruebas.js`, `index.html`, `src/boot.js`, `src/engine/renderer.js`, `src/engine/vegetacion.js`, `src/game/diario.js`, `src/ui/ui.css` y `src/game/accesibilidad.js` (nuevo).

### P0 · sin esto no se puede decir que el capítulo está cerrado

**P0-1 · Cierre del capítulo: poder seguir jugando y no borrar por accidente.** (S-M)
- Lo verifiqué en el navegador: con `S.complete`, el panel `#end` queda abierto, `G.ui.busy()` es verdadero (`src/engine/ui.js:17`, input y física bloqueados), Esc no lo cierra, y al recargar vuelve a abrirse (`misiones.js:123`). Los únicos botones son «Crear mi cómic» y «Jugar de nuevo».
- «Jugar de nuevo» llama `reset()` sin confirmar (`src/engine/guardado.js:343`) y borra la partida, con el cómic y el perfil. Un toque accidental destruye lo que el niño acaba de crear.
- Qué hacer: botón «Seguir explorando» que cierre `#end` y deje el mundo libre (Diario 12/12, nido, cómic desde el menú; la guía queda apagada); que el panel solo se abra solo la primera vez; confirmación de dos pasos en «Jugar de nuevo».
- Archivos: `src/game/misiones.js` (`showEnd`, `apply`), `src/engine/guardado.js` (`b-again`), `src/engine/ui.js` (`overlayOpen`), `index.html` (botón en `#end`, commit mínimo aparte), casos nuevos en `missionTest`.
- Choque: ninguno con A-D, pero `index.html` y `pruebas.js` los tocan D2 y otros; commit mínimo y relee antes de editar.

**P0-2 · La Voz no puede mostrar la cara del Guardián.** (S)
- `pack.js:95-96` mapea `Voz` a `assets/guardian.png` y el texto de respaldo de `historia.js:278` usa `IMG.G`. Con ese retrato el jugador entiende que el Guardián habla por el transmisor. El guion dice que la identidad de la Voz no se revela en el cap. 1 y la propia Vittata dice «esa voz es de ahora».
- Qué hacer: retrato neutro para la Voz (silueta u onda de señal dibujada en canvas, como el símbolo de 36, sin necesitar arte nuevo), y que «Narrador» no use a Vittata. Arte definitivo: decisión de Kelvin (sección 3).
- Archivos: `content/cap1/pack.js`, `content/cap1/historia.js`. Sin choque.

**P0-3 · Medir la duración real con jugadores.** (M, depende de personas)
- El diseño da tres metas distintas y ninguna está medida. Sesión cronometrada con 3 a 5 jugadores nuevos de edades distintas y un docente, leyendo `minutos_mision` y el tiempo total; dejar el resultado en `docs/equipo/` y decidir si se recorta o se añade (decisión 4 de la sección 3).
- Archivos: ninguno de código (a lo sumo un contador de tiempo total en el estado). Sin choque.
- **Duración: mínimo del recorrido automático (QA, paquete C, 2026-10-25).** El E2E (`tests/qa/e2e.js`) recorre el capítulo con la build publicada `HEAD-37e15c5` y mide, sin leer ni explorar, cuánto dura **como mínimo**: segundos de juego simulado (esperas del juego: crecida, vapor, gota, buceo) + trayectos (distancia de los teleports a la velocidad de carrera de 10,5 m/s o de vuelo de 12 m/s) + 0,8 s por pulsación (línea de diálogo o botón de tarjeta).

  | Recorrido | Mínimo sin leer | Leyendo (15 caracteres/s) | Juego simulado | Trayectos | Líneas de diálogo | Clics en tarjetas |
  |---|---|---|---|---|---|---|
  | Rama B (colina directa) | **5 min 42 s** | 8 min 18 s | 2 min 13 s | 2 min 5 s (937 m a pie + 435 m en vuelo) | 64 (3109 caracteres) | 40 |
  | Rama A (río, crecida y corrección) | **5 min 55 s** | 8 min 41 s | 2 min 19 s | 2 min 7 s (949 m + 435 m) | 70 (3330 caracteres) | 41 |

  Por tramo (rama B, segundos): inicio 6 · taller 6 · Iguaca 8 · recolección y M1 30 · **la ruta de la gota 185** · construir y crecida 32 · Guardián 12 · transmisor y coquíes 44 · mirador y final 20. La ruta de la gota es el 54 % del mínimo, y 114 s son esperas del propio juego (vapor, gota y crecida del río).
  - **Qué es y qué no.** Es un piso, no una estimación: un jugador real también lee, se equivoca, explora, esquiva obstáculos y repite el Simon. «Leyendo» solo cuenta los diálogos, a la velocidad de un adulto (~180 palabras por minuto); el texto de las tarjetas no se cuenta. No incluye el creador, el nido ni el cómic.
  - **No reemplaza medir con jugadores reales** (la sesión de arriba): con este piso no se puede decir que el capítulo cumpla 10-15, 20-30 ni 45 minutos. Sirve para vigilar, versión a versión, si el recorrido mínimo se alarga o se acorta (la prueba lo repite y lo anota en su paso «T»), y como cota inferior cuando Kelvin decida la meta de duración (decisión 7 de la sección 3).
  - Cómo repetirla: `tools/build/test.sh <build>` y leer el paso «T · Duración simulada» de `AV.e2eTest` en `reporte-test.json`.

**P0-4 · FPS y controles en equipos reales.** (S-M, depende de dispositivos)
- Android de Kelvin, un Chromebook y un iPad/iPhone con `?fps=1` y `?calidad=` (`ROADMAP.md` Fase 0; BACKLOG 1; PRODUCTION_DASHBOARD H3). Anotar fallos de controles y de lectura.
- Choque: **A3** (calidad automática en `renderer.js`). Medir después de A3, para no medir dos veces; QA-33 (`renderer.js:529`) también espera a A.

**P0-5 · Recorrido completo hasta `ChapterCompleted` con la build publicada.** (M)
- **Hecho (QA, paquete C, 2026-10-25).** `tests/qa/e2e.js` recorre el capítulo completo con la build publicada: portada → creador → gancho → las 8 etapas (ruta de la gota, refugio, crecida y corrección, Guardián, coquíes, transmisor, mirador) → panel final → «Jugar de nuevo» con pregunta → cómic y PNG → «Seguir explorando» → guardar y recargar. Sobre `HEAD-37e15c5`: e2eTest **42/42** (rama A) y 40/40 (rama B), y las 11 baterías de `test.sh` en verde. Detalle, límites y cómo correrlo: `BUGS.md`, «E2E del capítulo 1 completo».
- Cada avance sale de `G.interaccion.action()` ante el objeto real o del botón de la tarjeta; no se llama a `advanceTo` ni se escribe el estado. Atajos dichos en cada evidencia: teleport en vez de caminar y vuelo a puntos de la ruta de la gota.
- **Queda fuera:** caminar con teclado o dedo reales entre los puntos (no hay prueba de que el camino esté libre), móvil y FPS (P0-4).
- Tolera «Seguir explorando» y, si el panel final pregunta antes de borrar, lo comprueba. Su hallazgo, QA-34 (la Voz con la cara del Guardián = P0-2), ya está cerrado.

### P1 · para un piloto escolar con la historia completa

**P1-1 · Los dos momentos del final que solo son texto.** (S-M)
- La luz que parpadea tres veces en la niebla: un punto emisivo y su parpadeo durante la escena del mirador (gancho `onShow`, igual que la sacudida de `inicio`).
- El plano de la embarcación: tarjeta o lienzo como el símbolo de 36 (`drawSymbol`), visible al desbloquearlo y en la viñeta final del cómic.
- Archivos: `content/cap1/historia.js` (`useMirador`), `content/cap1/mundo.js`, `content/cap1/pack.js` (`decorar`). Sin choque.

**P1-2 · Beats del guion que el juego omitió (p.8 y p.9): el Guardián ayudando y la familia de Iguaca entrando.** (M)
- Es la recompensa emocional del refugio («Pensé que hoy lo habíamos perdido todo»). Hoy solo habla Iguaca. Depende de las decisiones 2 y 5 de la sección 3.
- Archivos: `content/cap1/mundo.js` (`npcs`), `historia.js`, `pack.js`. Sin choque.

**P1-3 · Apertura con pantalla negra, viento y la onda.** (M)
- NARRATIVA pide 30 s de gancho; hoy son tres cuadros de diálogo. Fundido desde negro, viento sintético, brillo de las nubes y la onda antes de dar el control.
- Archivos: `content/cap1/historia.js` (`inicio`), `audio.define` en el pack. Hacer el fundido como capa DOM inyectada por el pack, **no** en `renderer.js` ni `ui.css`, para no chocar con A y D2.

**P1-4 · Sonido de la crecida y de construir.** (S-M)
- Lluvia y trueno suave durante `S.event`, golpes al colocar el refugio (hoy suena `unlock`) y un ambiente mínimo. Es BACKLOG 7. Hay que comprobarlo de oído en un dispositivo real (`ROADMAP.md` Fase 0).
- Archivos: `content/cap1/historia.js` (`audio.define`); `src/engine/audio.js` solo si se añade un bucle de ambiente. Sin choque.

**P1-5 · Validar con fuente los 12 textos del Diario de Campo.** (S-M)
- Coquí, San Pedrito, reinita mariposera, dajao, jicotea, manatí, maraca, güiro, cuatro, petroglifo (Caguana), vejigante y pava. Regla del proyecto: sin datos inventados; lo no verificable va como «por verificar». El juego ya está publicado con ellos.
- Archivos: `content/cap1/coleccionables.js`. Choque leve con **C1** (toca `diario.js`, no este archivo).

**P1-6 · Máquina experimental y transmisor con calidad comercial.** (L, arte)
- Son los dos objetos que el niño examina en el primer minuto y hoy son un cilindro con una aspa y una caja con una antena. Hay que modelarlos (Blender, `assets/models/`) con el diseño de Vittata como canon. Los coquíes y el banco pueden esperar.
- Archivos: `tools/blender/`, `assets/models/`, `content/cap1/mundo.js`. Depende de la decisión 6. Sin choque.

**P1-7 · Accesibilidad que el GDD pide y no está en ningún carril.** (M)
- Subtítulos de sonido generales (hoy solo el Simon trae «[Canta un coquí…]»), modo relajado (guía siempre visible y sin tiempos) y modo zurdo.
- Choque: **D2** (`src/game/accesibilidad.js`, `ui.css`) y **D3** (`input.js`). Hacerlo cuando D2 y D3 estén con commit.

**P1-8 · Documentos al día.** (S)
- `docs/equipo/GDD_CAP1.md` (§3 M2 de anillos, §5 y §10) describe lo que el fundador rechazó. `docs/CHAPTER_01_GAMEPLAY.md` sigue con la recolección 5/4/2 y no menciona la ruta de la gota, las paradas, el nido ni el Diario de ciencia. `docs/equipo/EDUCATIVO.md` aún se titula «grados 3–6», contra la regla de «todas las edades».
- Archivos: esos tres documentos. Choque leve con C2 (crea `EP2_*.md`, otros archivos).

### P2 · pulido y deseables

**P2-1 · Los «wow» del GDD §6.** Despegue del mirador con FOV (S), bandada de 20 cotorras con `InstancedMesh` (M), luciérnagas al atardecer (M), bahía bioluminiscente (L: necesita un ambiente nocturno que no existe). Recomiendo diferir los dos últimos al episodio 2 (decisión 7). Archivos: `content/cap1/mundo.js` y `fx`; sin tocar `renderer.js`, que es de A.

**P2-2 · Engranaje visible.** El techo del refugio de la colina con el engranaje y la máquina del taller sin hélice tras construir. (S) `historia.js`, `mundo.js`.

**P2-3 · Taller con interior.** Vittata despierta dentro del taller (SCRIPT p.3). (L) `DECISION_LOG` lo dejó como P2 «después del capítulo 1». Choque: **B4** (`solidos.js`, umbrales de edificios grandes).

**P2-4 · Cómic con más viñetas.** Guardián y banco, y coro de coquíes; más la viñeta de Diario 12/12 que el GDD §10 deja en P2. (M) `pack.js`, `comic.js`, `pruebas.js` (la prueba afirma 4 viñetas en `pruebas.js:109`).

**P2-5 · Modelos 3D de Iguaca y el Guardián** (BACKLOG 3e). (L) Depende de archivos de Kelvin y de la decisión 5.

**P2-6 · Bugs conocidos de `BUGS.md` que no bloquean:** QA-30 (contextTest intermitente; es **A1**), QA-33 (`renderer.js:529`; esperar a A), QA-32 (foto de la viñeta de rama sin Vittata; Save & Cómic con Movimiento) y la pieza con hueco `complejo_ruinas@kelvin_aldea_colina#0` (QA-28).

## 3. Decisiones que solo Kelvin puede tomar

1. **Aprobar el guion del cap. 1.** `CHAPTER_01_SCRIPT.md` sigue «PROPUESTO… pendiente de aprobación final» y Iguaca y el Guardián son PROVISIONALES (`CANON_REGISTRY.md`). Conflicto abierto: ¿el Guardián es cotorra, humano u otra forma? De eso depende su retrato y su modelo.
2. **Orden del Guardián.** El guion lo hace llegar antes de construir y ayudar (p.7-8); el juego y NARRATIVA lo hacen llegar tras la crecida. ¿Se queda como está o se cambia?
3. **La medalla del Guardián** (NARRATIVA «Giro»: una pieza del emblema es igual a su medalla). ¿Es canon? Si sí: una línea más y un detalle visible en su figura. Si no, solo calla.
4. **La Voz.** ¿Qué cara lleva (silueta, onda o ninguna) y se confirma que es alguien del pacto de los 36 sin nombrarlo? Tapa el P0-2 definitivo.
5. **Iguaca y el Guardián como sprites 2D de renders sustitutos** junto a una Vittata 3D: ¿se publica así el piloto o se espera a los modelos 3D? ¿Tiene Kelvin los archivos?
6. **Diseño de la máquina experimental y del transmisor antiguo** (los objetos canónicos del taller): ¿cómo son? Bloquea P1-6.
7. **Alcance de «capítulo completo»:** duración meta (10-15 min del GDD, 20-30 de GAMEPLAY o la clase de 45 min) y si los «wow» de bahía y luciérnagas son obligatorios o pasan al episodio 2.
8. **Idioma.** ¿El capítulo es bilingüe en historia y HUD (hoy solo la misión educativa y el Aula lo son) o español con inglés solo en el Aula?
9. **Taller con interior** en el cap. 1 o después (hoy decidido «después»).

No son de canon pero solo Kelvin los destraba para el piloto: los dispositivos reales y los niños para las medidas P0-3 y P0-4, la revisión legal de la bandera (Reglamento 5282), la de privacidad infantil (COPPA) y las citas DRNA/USFWS (`ROADMAP.md`, «Legal y datos»). El estado UICN de 13 especies ya está pendiente de él y no frena el capítulo.

## 4. Paquetes de trabajo en paralelo

Cada paquete tiene archivos propios; ninguno comparte archivos con otro ni con los carriles A-D salvo lo señalado.

| Paquete | Contenido | Archivos propios | Tamaño | Notas |
|---|---|---|---|---|
| **A · Cierre del capítulo** | P0-1 | `src/game/misiones.js`, `src/engine/guardado.js`, `src/engine/ui.js`, botón en `index.html` (commit aparte), casos nuevos en `content/cap1/pruebas.js` | S-M | `index.html` y `pruebas.js` los tocan otros carriles: relee y commit mínimo |
| **B · Final de la historia en escena** | P0-2, P1-1, P1-2, P1-3, P1-4, P2-2 | `content/cap1/historia.js`, `mundo.js`, `pack.js`, `dialogos_cap1.json` y `.js` (regenerar) | M-L | Es el dueño único de esos cuatro archivos. P1-2 espera las decisiones 2 y 5; empezar por P0-2 y P1-1 |
| **C · Medición y recorrido E2E** | P0-3, P0-4, P0-5 | `tests/qa/e2e.js`, `tests/qa/qa.js`, `docs/equipo/BUGS.md`, informe nuevo en `docs/equipo/` | M | Medir FPS después de A3; el E2E nuevo espera a que A cierre el «Seguir explorando» |
| **D · Contenido verificado y documentos** | P1-5, P1-8 | `content/cap1/coleccionables.js`, `docs/CHAPTER_01_GAMEPLAY.md`, `docs/equipo/GDD_CAP1.md`, `docs/equipo/EDUCATIVO.md` | S-M | Sin choque con C1 (otro archivo) ni C2 |
| **E · Accesibilidad y móvil que falta** | P1-7 | `src/game/accesibilidad.js`, `src/ui/*.css`, `src/engine/input.js` | M | **Bloqueado** hasta que D2 y D3 tengan commit: los mismos archivos |

No incluidos por ahora: P1-6 (arte, espera la decisión 6), P2-1, P2-3, P2-4 y P2-5 (esperan las decisiones 3, 5, 7 y 9).

**Orden sugerido:** A, B (P0-2 y P1-1) y D arrancan hoy; C arranca con A3 y A ya integrados; E cuando terminen D2 y D3. Con A y B listos, el capítulo queda cerrado salvo las medidas reales de C.
