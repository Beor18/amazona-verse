# DIVERSION_CAP1 · por qué el capítulo 1 se siente vacío y qué hacer

Director de diseño de juego, 2026-10-25, según la directiva V8.0 de Kelvin: **la diversión manda; lo educativo sale solo del juego.** Solo lectura de `content/cap1/`, `src/game/`, `src/engine/fisica.js`, los GDD y las capturas. Nada implementado. Los minutos son estimaciones (caminar 6,5 m/s, volar 12 m/s; distancias de `assets/data/mapa_cap1.js`): la medida real con jugadores sigue pendiente (P0-3).

**En tres líneas.** El capítulo pide leer y caminar el 65 % del tiempo y volar con habilidad menos del 10 %. El mundo no se mueve (ninguna otra cotorra, nada que perseguir, nada que salga mejor si lo haces bien) y lo que se gana (ropa, huevo, cartas) llega tarde o en otra pantalla. No hace falta otro juego: hace falta que volar sea el juego desde el minuto 1 y que el mundo responda.

---

## 1. Diagnóstico: las 9 preguntas

| # | Pregunta | Hoy (minuto y archivo) | Veredicto |
|---|---|---|---|
| 1 | **Primeros 30 s** | Portada → creador obligatorio: nombre de dos listas, 8 tintes de especie, ropa (`src/game/creador.js` `open`). Al guardar, 300 ms después, pantalla negra con viento y 2 líneas del Narrador (`content/cap1/historia.js` `inicio`). | El niño que va rápido por el creador pasa el segundo 30 en negro leyendo. Ningún control del juego. |
| 2 | **Primeros 3 min** | 0–1: apertura de 6 líneas (ZZZT, onda, fundido). 1–2: E en la máquina y E en el transmisor (2+2 líneas), grito de Luma, 15 m, 5 líneas, «+3 madera» (`historia.js` `examine`, `talkLuma`). 2–3: 1 madera y 2 piedras al pasar (`src/game/objetos.js`), 50 m a pie hasta la poza, nadar, mantener C y bucear (`mundo.js` recurso `c1` `fondo: true`). | Primera acción con habilidad: **bucear, minuto ≈3**. Hasta ahí, menús, texto y caminar. Aquí nace «veo la cotorra sola sin hacer nada». |
| 3 | **Qué hace divertida la primera misión** (M1 «Fondo del río», `misiones.js`) | Nadar a las burbujas, bajar con C, la pieza brilla, cofre inmediato con las botas azules (`src/game/misiones.js` `grant`, `fx.rewardChest`). | Lo bueno: habilidad + premio al instante. Lo malo: dura 30 s, bajo el agua no hay nada más, y los 50 m hasta allí son pradera vacía. |
| 4 | **Primera sorpresa** | Si construye junto al río: la crecida, minuto ≈8–9 (`historia.js` `finishRainEvent`). Si construye en la colina: ninguna hasta la Voz del transmisor, minuto ≈10. La apertura es cine, no sorpresa jugada. | **Demasiado tarde.** Hace falta una en el minuto 1 (algo vivo que pasa volando) y otra antes del 5. |
| 5 | **Cuándo puede volar** | Desde el primer segundo con control: V, o Espacio tres veces (`src/engine/fisica.js` `startFlying`; `MOVIMIENTO.md` §3). Pero nadie lo pide: solo el pie del HUD «Espacio: Saltar y volar». El primer vuelo **obligatorio** es p2 de la ruta de la gota, minuto ≈4–5 (`educativa.js` perchas). | Un niño que no lee el pie llega al minuto 3 sin haber volado. El icono y panel de controles de PC (en marcha) ayudan, pero la historia tiene que pedirlo. |
| 6 | **Cuándo personaliza su cotorra** | Minuto 0 (creador) y siempre con «Mi personaje» (`b-char`). Lo bloqueado se ve apagado con su pista. Primera pieza ganada: botas, minuto ≈3; en total 7 piezas en el capítulo (`coleccionables.js` `ropa`). | Bien al inicio. Después, nadie celebra la combinación: no hay foto, ni conjunto con nombre, ni álbum. Las 22 pieles van a crías y rivales; el aprendiz sigue con 8 tintes (`character.js` `SPECIES`). |
| 7 | **Cuándo descubre un huevo** | Al terminar M1 (minuto ≈3–4): aparece el nido junto a la Estación, Luma lo presenta cuando estás a < 30 m y sale el botón «Nido» (`src/game/criadero.js` 1263–1381). La cápsula de nido se incuba sola; nace a 104 XP (26 «días» × 4 XP) si el niño entra a ver la eclosión. | El momento está bien puesto. El problema: la XP sube en silencio; el niño no ve que el huevo crece salvo un chasquido lejano. |
| 8 | **Qué lo motiva a seguir** | La guía (haz y flecha, `fx.guide`), la barra de 8 pasos, los cofres, Luma. Tras el final: «Seguir explorando» con Diario 12/12 y cómic. | Todo es motivo de la historia, ninguno propio del jugador: no hay récord, ni «me falta una», ni algo que mejorar. Al terminar, no queda nada que hacer. |
| 9 | **Qué comparte con su familia** | El cómic en PNG/PDF (`src/game/comic.js`), el pichón del criadero (tocarlo salta y aletea), el Modo Maestro para el docente. | No hay nada para dos personas: ni turnos, ni reto de la casa, ni algo que un hermano haga en la misma partida. |

**Reparto estimado de una sesión de 15 min:** leer y pulsar «Seguir» 5 min · caminar y esperar 4,5 min · volar, bucear, posarse, construir, Simon 4 min · decidir 1,5 min. Para un niño de 8 que lee despacio, «leer» se duplica.

---

## 2. Las mecánicas, una por una

| Mecánica | Lo que ya está (y vale) | Lo que falta para que sea divertida |
|---|---|---|
| **Vuelo** | Se siente bien: crucero 12 m/s, ladeo, cernido, aterrizaje con flare, amerizaje, posarse en ramas y techos (`fisica.js`, `MOVIMIENTO.md`). El mapa tiene cumbre, cascada, playa, muelle, ruinas y una torre de 12,9 m. | **Descubrimiento:** la historia no manda a ningún sitio bonito y llegar a uno no se nota (los POIs ya tienen nombre: falta «Descubriste: Poza Honda»). **Obstáculos:** se choca, no se esquiva con intención; el viento del techo de vuelo es una base para corrientes de aire (ráfagas con hojas, nunca anillos). **Retos:** cero en la historia; el Modo Retos está en marcha. **Maestría:** nada premia volar bien: rasante, picado y remonte, aterrizaje perfecto. |
| **Huevos** | Cápsula que tiembla, grietas, patitas zigodáctilas que pasean, hatch con cascarón-gorro, 6 posturas + 2 de cuidado, cambia sola cada 5,5 s, al tocarlo salta o aletea, vuelta con chispas al crecer; el bebé sigue a Vittata a saltitos (`criadero.js`, `HUEVOS_GDD.md`). 8 cápsulas con traits, sin azar ni compra. | **Personalidad:** nombre fijo y ningún «quiere»: no reacciona al mundo. **Torpeza y gags:** no tropieza, no se cae, no se duerme sobre un hallazgo, no imita a Vittata. **Evolución:** se ve en el overlay, poco en el mundo. Lo cómico hoy son poses, no situaciones. |
| **Personalización** | 40 piezas en 10 ranuras, estilos y colores, 7 desbloqueos en el capítulo, miniaturas 3D, cría con traits por cápsula y etapa. | **Cotorras originales:** las 22 pieles solo en crías y rivales; el aprendiz, 8 tintes. **Combinaciones divertidas:** posibles (casco pirata, chancletas, jetpack) pero nadie las celebra: ni foto, ni conjunto con nombre. **Álbum de traits:** no existe; la ropa es una lista al final del Diario. |
| **Construcción** | Un refugio, dos terrenos, fantasma verde/rojo, desarmar y mover (`historia.js` `startBuild`). Es la única decisión con consecuencia y funciona. | **Decorar y experimentar:** no hay nada que elegir salvo el sitio. Para el cap. 1 basta un toque (elegir el color del techo, colocar el engranaje de la máquina, P2-2). La construcción grande es de las temporadas 3–4 (`STORY_BIBLE.md`): no meterla aquí. |
| **Retos** | Carrera contra 3 cotorras y «Escapa de la tormenta» (en marcha). | Récords locales, contrarreloj con «Otra vez» a un toque, fantasma propio, fantasma de un amigo por código, Vuelo del día. Todo local, nombres de las dos listas, sin chat ni mensajes (sección 3, mejora 7). |
| **Cómic** | 4 viñetas de historia + 4 del motor (techo, rama alta, nido, eclosión), textos de listas, PNG/PDF (`comic.js`, `pack.js`). | Los hechos se cuentan como informe («Aprendí que construir rápido no siempre es construir bien»). Faltan las viñetas de lo gracioso (el chapuzón, el aterrizaje torpe, el pichón que se cayó, el récord) y opciones de texto con humor, siempre de listas. |
| **Familia** | Nada dentro del juego salvo compartir el cómic. «Family Quest» está en el roadmap para después de la temporada 1. | Cooperativo local asíncrono: récords de la casa, fantasma del hermano, foto con pose de los dos, el huevo de papel de 26 días. Sección 4. |

**Nada de mecánicas repetitivas para retener:** sin rachas, sin energía, sin recompensas por entrar, sin temporizadores que castiguen. El «vuelve mañana» es un recorrido distinto o un huevo a punto, y faltar no quita nada.

---

## 3. Diez mejoras, por impacto en diversión, costo y facilidad

★ = **alto impacto y bajo costo** (las cinco que haría primero). Tamaños: S < medio día, M 1–2 días, L más. Nada toca a Vittata, ni mete anillos, compras ni violencia. Archivos de otro carril: se coordina, no se pisa.

| # | Mejora | Qué cambia para el jugador | Archivos | Tam. | Cómo saber que funcionó |
|---|---|---|---|---|---|
| 1 ★ | **Luma llama desde arriba** | Al abrir los ojos, Luma está en la copa del flamboyán de la plaza (o el techo del taller): para hablarle hay que despegar y posarse. A los 60 s el niño ya voló porque quiso llegar a alguien. Máquina y transmisor pasan a después. | `historia.js` (`talkLuma`, orden de pasos), `mundo.js` (`npcs.luma` con altura; es sprite con `flota: true`) | S | E2E: primer `MOVE.flying` < 90 s. Playtest: todos vuelan antes del minuto 2 sin que se lo digan. [KELVIN] si Luma vuela o solo flota. |
| 2 ★ | **Lo que gano se ve** | Bajo el objetivo, «Próximo: Botas azules · bucea en la poza» (las `pista` ya existen). El nido desde la charla con Luma (minuto 2) y «+25 XP al nido» con un huevo en el HUD. «Descubriste: Poza Honda» al llegar a un POI con nombre. | `src/game/misiones.js` (`renderQuest`), `criadero.js` (momento del nido, aviso de XP), `src/engine/terreno.js` POIs → toast, `ui.css` | S | ≥ 60 % de las primeras sesiones ven nacer el pichón. Lugares descubiertos por sesión ≥ 4. |
| 3 ★ | **Diálogo que no bloquea, 2 líneas** | La exposición (Narrador, Guardián, Voz) sale en bocadillos mientras la cotorra sigue volando; solo bloquean las decisiones. Regla: ninguna escena de más de 2 líneas sin algo que hacer. | `src/game/dialogo.js` (`{ libre: true }` sin `ui.busy`), `src/engine/ui.js`, `dialogos_cap1.json` (marcar y recortar; regenerar `.js`), `historia.js` | S–M | Segundos con `ui.busy()` por diálogo < 20 % de la sesión; E2E en verde. [KELVIN] qué líneas son intocables. |
| 4 ★ | **La crecida se juega** | El río sube 20 s (hoy 8) y se lleva tres cosas (las tablas de Luma, el coquí, un hallazgo): se agarran en vuelo (`agarre.js` ya existe) y se sueltan en la colina. Lo salvado se conserva; lo demás se recupera después, sin castigo. Es «Escapa de la tormenta» dentro de la historia. | `historia.js` (`S.event`, objetos que siguen `G.agua.setLevel`), `src/engine/fx.js` | S–M | Acciones durante el evento > 0 en todos los niños del playtest; ≥ 1 rescate en el 70 % de las partidas. |
| 5 ★ | **Cómic con humor y foto con pose** | Viñetas nuevas por hechos reales que ya se registran (chapuzón, aterrizaje torpe, pichón caído, primer récord) con 3 textos graciosos a elegir, de listas. Botón «Foto»: uno de los 7 gestos y captura al cómic. | `pack.js` (`vinetas`, `opciones`), `comic.js` (viñeta libre), `src/engine/actores.js` (gestos, ya existen) | S | Viñetas por partida de 4–6 a ≥ 8; cómics exportados por sesión suben. |
| 6 | **Juice de vuelo: rasante, picado, aterrizaje perfecto** | Estela y tono al ir a < 1 m del río o la hierba («rasante ×4» en el HUD), velocidad al picar y remonte sin aletear, pop «¡Aterrizaje perfecto!» a < 2 m/s (da las coderas de TRAITS_V2), pétalos al cruzar un flamboyán. Sin castigo. | `fx.js`, `camara.js` (FOV), `audio.js`, `fisica.js` solo `G.emit` (carril Movimiento), `misiones.js` contador | M | Telemetría: segundos en fase vuelo del ≈10 % a > 35 % de la sesión. |
| 7 | **Retos en el mundo con récords, fantasma y código** | La rival de la carrera está posada en la plaza desde el minuto 3; «Escapa de la tormenta» junto al refugio; el Vuelo del día (semilla por fecha) en el mirador. Al terminar: tiempo, récord de la casa, «Otra vez», tu fantasma (posición a 5 Hz, ≈3 KB). Fantasma de un amigo con un código dictable `NUBE-AZUL-0142-P7` (nombre de listas + centésimas + piel + control): una rival recorre el trazado en ese tiempo. Tabla de la clase en el Modo Maestro por códigos. Sin chat ni red. | Archivos del Modo Retos (su dueño), `mundo.js` (marcadores), `historia.js` (desbloqueo por paso), `guardado.js` (`<almacen>.records`), `aula.js` (pestaña) | M | ≥ 60 % de las partidas hacen un reto en la primera sesión; ≥ 2 repeticiones por reto. [KELVIN] nombres y pieles de las 3 rivales. |
| 8 | **La ruta de la gota se vuela** | p5: el vapor sube en ráfagas y hay que remontar con él hasta la nube. p6: la gota baja en tramos de rasante por la quebrada. p8: una tarjeta por pregunta con el mundo detrás y la cotorra posada junto a Luma. La lección y las fichas no cambian; cambia que el jugador vuela en vez de acompañar una partícula a 6 m/s. | `educativa.js` (`iniciarVapor`, tramos de `T.gota`, `RUTA.velocidad`, `espera`), `aula.css` | M | `minimoLeyendoSeg` del E2E baja ≥ 25 % en p5–p8; nadie suelta el mando entre p5 y p7. |
| 9 | **Pichón con gags en el mundo** | Fuera del overlay, el bebé hace cosas: se cae de un borde y se sacude, persigue una mariposa, se duerme encima de un hallazgo escondido (y así lo señala), imita el gesto de Vittata. Cada gag es un hecho para el cómic. | `criadero.js` (`companero()`, con las posturas que ya hay), `actores.js` (seguimiento) | M | Gags vistos por sesión ≥ 3; en el playtest, risas (apuntarlas). |
| 10 | **Mundo vivo y Álbum de las Amazonas** | 4–6 cotorras con las pieles de otras especies rondan Villa Raíz entre perchas; si la sigues 8 s o te posas a su lado, te da su carta. Una bandada de 20 cruza el valle una vez por sesión (GDD §6). Pestaña «Álbum» en el Diario con 36 cartas en el pixel art de Kelvin (solo en la interfaz): 6–8 se ganan en el capítulo, los huecos son el motivo para volver. | Nuevo `src/game/bandada.js`, `content/cap1/fauna.js`, `diario.js` (pestaña), `especies.js` (`carta`), `assets/cartas/` | L | FPS en el Chromebook (P0-4) no baja > 10 %; lo primero que el niño persigue sin que se lo pidan es una cotorra. [KELVIN] especies, nombres y carácter; si las 36 Amazonas son los 36 guardianes; el arte de las cartas. |

**Transversal (S):** telemetría local en `S.tele` (segundos en vuelo, en diálogo, caminando, quieto; retos; primer vuelo; lugares; gags), exportada en el CSV del Modo Maestro, sin red ni nombres. Sin esto, las 10 se evalúan a ojo.

**Orden:** 1, 2, 3 (una semana: el primer minuto cambia) → 4, 5 → 6, 7 → 8, 9 → 10 cuando haya arte y decisiones de Kelvin.

---

## 4. Plan de participación familiar (breve)

Cooperativo local y asíncrono, para edades distintas, sin red:
- **Récords de la casa:** varias partidas en el mismo dispositivo compiten por reto con nombre de aventurero y piel; el fantasma del hermano vuela contigo (mejora 7).
- **Turnos con sentido:** el pequeño vuela y bucea; el mayor o el adulto decide el terreno, ordena la cadena y responde a Luma. Basta una línea en pantalla: «¿Quién decide esta vez?» (sin cambiar sistemas).
- **Foto en familia:** la viñeta «Foto» admite dos personajes (el aprendiz y la cría con pose) y va al cómic que se imprime (mejora 5).
- **El huevo de papel:** calendario de 26 días para la casa, igual que la «Incubadora de la clase» de `HUEVOS_GDD.md` §7; el día 26 coincide con ver nacer al pichón en el juego.
- **Modo adulto:** el Modo Maestro ya muestra progreso y fichas con fuente; renombrar la pestaña a «Familias y docentes» para que el adulto sepa qué preguntar sin convertir la sala en clase.

---

## 5. Qué NO hacer

| No | Por qué |
|---|---|
| PvP de pelea | Rompe «sin violencia» y «todas las edades», exige servidor, cuentas y moderación (COPPA), y tira lo único que nadie más tiene: Vittata, El Yunque y el vuelo de ave. El aburrimiento no es por falta de rival; es por falta de cosas que se muevan y de habilidad que premiar. Competir sí: contra cotorras y fantasmas, por tiempo. |
| Juego de autos | La cotorra ya tiene el mejor vehículo: vuela a 12 m/s con ladeo y picado. Un auto necesita carreteras, física y arte nuevos y no tiene que ver ni con la historia ni con el nombre. La sensación que se busca (velocidad, carrera, récord) la dan los Retos de vuelo. |
| Anillos de vuelo | Rechazados por Kelvin; además convierten el mundo en circuito. Perchas, copas, río y otras cotorras hacen lo mismo y son de El Yunque. |
| Más diálogo o más lección para arreglarlo | Es la causa. Cada línea es un segundo de cotorra quieta. |
| Vidas, oxígeno, tiempo que hace perder, daño | Todas las edades y la regla del criadero (nada baja, nada muere). Los retos tienen tiempo para mejorar, no para perder. |
| Cajas de botín, rachas, premios por entrar, tienda con presión | Reglas de Kelvin y de `HUEVOS_GDD.md`. |
| Chat, nombres libres, tablas en línea, perfiles | COPPA y `SEGURIDAD_INFANTIL.md`. Los códigos de fantasma y los nombres de listas dan la emoción social sin el riesgo. |
| Tocar a Vittata o meter pixel art en el mundo 3D | Reglas de Kelvin. El pixel art de los traits vive en las cartas del Álbum (interfaz). |
| Mapa más grande o construcción libre en el cap. 1 | Falta densidad y vida en los 200 m que la historia usa, no extensión. La construcción grande es de las temporadas 3–4. |
| Episodio 2 antes de que el 1 enganche | Cada episodio hereda el bucle; si el de 30 s no funciona aquí, tampoco allá. |

---

## 6. Decisiones de Kelvin

- **[KELVIN]** si Luma vuela o solo flota (mejora 1); qué líneas del guion no se recortan (mejora 3).
- **[KELVIN]** nombres y pieles de las 3 cotorras rivales (mejora 7); si el aprendiz puede llevar una de las 22 pieles.
- **[KELVIN]** qué especies vuelan en el cap. 1, su nombre y carácter, si las 36 Amazonas son los 36 guardianes del pacto, y el arte de las 36 cartas (mejora 10).
- **[KELVIN]** los trajes del ropero (`TRAJES_ROPERO.md`, aparcado): si entran como premio de récords o se quedan para después.
