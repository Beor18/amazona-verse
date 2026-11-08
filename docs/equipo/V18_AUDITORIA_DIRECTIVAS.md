# Auditoría de las directivas V18

## V18.1

Auditoría de `docs/DIRECTIVA_V18_1.txt` contra el código (no contra los documentos), hecha el 8-nov-2026 sobre main `1ad2cff2` (agente a181). Las líneas son las de ese commit más el de esta auditoría. «Prueba» = `AV.<batería>()` y nombre del check. **[CONSTRUIDO a181]** marca lo que se hizo en esta tarea.

### §0 · Definición de éxito y §2 · Alcance del demo

| # | Punto | Estado | Dónde (archivo:línea) | Prueba que lo cubre |
| --- | --- | --- | --- | --- |
| 0 | Ciclo completo sin comandos de desarrollador, en zona existente | Hecho | `src/boot.js:103` (bandera V18 encendida por defecto; `?v18=0` la apaga); `src/game/v18/ciclo.js:88` `alGanar` y `:73` `pistaExtra` | `v18Test` «Bandera V18 por defecto encendida…»; `v18CicloTest` pasos 1 a 9 |
| 2.1 | Encuentro con pista clara | Hecho | `src/game/v18/descubrir.js:232` `descubrir`; pista de canto y marca del minimapa en el mismo archivo (arranque, l. 320–345) | `v18DescubrirTest` «Pista: marca en el minimapa y Acción…», «A menos de 80 m sale la pista del canto», «Al acercarse se descubre…» |
| 2.2 | Reto de desbloqueo; descubierta ≠ desbloqueada ≠ seleccionada | Hecho (**reforzado [CONSTRUIDO a181]**) | Reto de 4 copas `descubrir.js:191` `empezarReto`; estados `src/game/v18/progreso.js:18`; **nuevo:** la descubierta sin desbloquear sale apagada en «Mis cotorras» con su pista (`descubrir.js` `pendiente()` y `abrirSeleccion`) | `v18DescubrirTest` «Descubierta no es elegible todavía», «Seguirla por las 4 copas la desbloquea», «Elegir en la tarjeta…»; **nuevo** «V18.1 §2.2: «Mis cotorras» enseña la descubierta apagada, con su pista, sin poder elegirla» |
| 2.3 | Poder nuevo, visible y con efecto mecánico | Hecho | Motor `src/game/v18/habilidades.js:33` `registrar`; Grito `:68`, Escudo `:91`; FX `src/game/v18/fx_poderes.js`; fuera del duelo `src/game/v18/explorar.js` | `v18CombateTest` «Grito: la onda empuja a la rival, la interrumpe…», «Escudo: bloquea un golpe de ala…»; `v18FxTest`; `v18ExplorarTest` «La G dispara el poder en exploración…» |
| 2.4 | Combate PvE: ataque, defensa/evasión, impacto, victoria y derrota | Hecho | `src/game/v18/combate.js:800` `iniciar`, `:881` `pasoIA`, `terminar` (l. 825); golpe con escudo/mareo l. 265–292 | `v18CombateTest` «La IA se mueve hacia ti, ataca y se defiende», «Telegrafía: si te apartas al ver el «!», el golpe falla», «Sin plumas, la rival se marea: victoria…», «Si te quedas sin plumas: mareo breve…» |
| 2.5 | Recompensa definida (no puntos sueltos) | Hecho | `combate.js:220` `PREMIO = { madera: 2, piedra: 1 }` en `S.inv`; marca idempotente `G.v18.otorgar('combate_1')` (`progreso.js:64`) | `v18CombateTest` «Ganar otra vez no da los materiales de nuevo»; `v18CicloTest` «5 · Recibe 2 maderas y 1 piedra (S.inv)» |
| 2.6 | La recompensa repara una estructura existente, con utilidad | Hecho | Puente colgante `src/game/v18/reparar.js:240` `reparar`, coste `:23`; utilidad: se cruza a pie y abre la Sombra (`amenaza.js`) y el puerto | `v18RepararTest` «Con materiales repara y descuenta exactamente 2 maderas y 1 piedra», «Utilidad: caminando desde la cabecera de Villa Raíz se llega a la otra orilla…»; `v18AmenazaTest` «Con el puente sin reparar no sale» |
| 2.7 | Persistencia tras recargar | Hecho | `progreso.js:25` leer / `:45` guardar en `<almacen>.v18`; versión y migración `:44` | `v18CicloTest` «8 · Tras recargar: arausiaca sigue elegida, materiales gastados, puente reparado», «8 · Guardado <almacen>.v18 coherente»; `v18RepararTest` «Tras recargar no vuelve a cobrar» |
| 2.8 | Pista de un segundo objetivo opcional | Hecho | `ciclo.js:73` `pistaExtra` (buscar la de Dominica o ganar con la otra cotorra) | `v18CicloTest` «7 · Pista del segundo objetivo opcional…», «9 · Con dos cotorras distintas el reto extra queda cumplido (una vez)» |
| min | 2 especies con poderes distintos | Hecho (y más) | `habilidades.js`: 36 registros = 2 básicos + 34 poderes; llegada por hitos en `src/game/v18/nuevas.js` | `v18CombateTest` «Vittata tiene Grito del Yunque (PICO) y arausiaca Escudo de plumas (PLUMAS)»; `v18NuevasTest` «Cada una tiene su poder propio»; `v18PoderesTest` |
| min | 1 rival IA · 1 zona · 1 estructura persistente | Hecho | Campeona de la Explanada (`combate.js` sitio QA-174), Villa Raíz, puente colgante | Ver 2.4, 2.6, 2.7 |
| min | Motor configurable por especie, ampliable a 36 | Hecho | `habilidades.js:33` `registrar({ id, especies, familias, coste, cooldown, efecto })`, `poderDe` en `:688` | `v18PoderesTest` (los 34 poderes, uno a uno) |
| fuera | PvP en línea, cuentas, economía, editor | No hecho, correcto (fuera de alcance) | — | — |
| sec. | PvP local 1v1 con dos entradas humanas reales | Hecho (prototipo, solo computadora) | `src/game/v18/duelo2.js` | `v18Duelo2Test` «Flecha arriba mueve al Jugador 2…», «Sin recompensa: ni inventario, ni progreso V18, ni guardado», «En táctil no aparece la opción…» |

### §1, §3, §4 · Reutilización, frentes y arquitectura

| Punto | Estado | Dónde | Prueba |
| --- | --- | --- | --- |
| Proteger capítulos, guardados, vuelo, criadero… (sin rehacer) | Hecho | V18 vive aparte en `src/game/v18/`, se carga a demanda (`boot.js:115–164`); el inventario es el de siempre (`S.inv`) | `selfTest`, `missionTest`, `e2eTest`, `saveTest` (pasada final) |
| «Batalla de Bandadas» y PvP no se venden como terminados | Hecho | Ninguna cadena «Batalla de Bandadas» en `src/`, `content/` ni `web/` (grep) | — (comprobado con grep, sin check automático) |
| Frente A: básicos comunes golpe de ala, semilla y grito | Parcial por decisión de Kelvin | `habilidades.js:3-4`: Kelvin (5-nov) dejó el grito como poder de Vittata, no básico | `v18CombateTest` «Básicos de todas: solo golpe de ala y semilla (el grito ya no es básico)» |
| Frente A: matriz preliminar de 36 | Hecho (documento) | `docs/equipo/V18_MATRIZ_36.md` | — |
| Frente B: objeto reparable con guardado; recogibles sin pelear | Hecho | `reparar.js:151`, `:224` | `v18RepararTest` «El puente se paga sin pelear…», «Tras recargar siguen recogidos…» |
| Frente C: estados no_descubierta → seleccionada; partidas viejas no pierden cotorras | Hecho | `progreso.js:18`, QA-165 en `progreso.js` | `v18Test` «Perfil creado después de leer el progreso: su especie entra elegible (QA-165)»; `v18DescubrirTest` «Partida vieja: la especie del perfil es elegible…» |
| §4 contratos: speciesId, abilityId, eventos hit/damage/win/loss/rewardGranted, worldChangeId, versionado | Hecho | Eventos `combate.js:16-17, 92`; `progreso.js:13` (`recompensa` = rewardGranted, `mundo` = worldChangeId); versión `:44` | `v18CombateTest` «Emite hit y damage»; `v18Test` «Recompensa idempotente…», «V18.2: una partida v1 migra a v2 sin perder nada…» |
| Regresión en móvil de lo nuevo | Parcial | Checks táctiles en duelo, exploración y puente | `v18CombateTest` «Táctil: el entreno nombra los botones…»; `v18ExplorarTest` «QA-185: el botón táctil no pisa Impulso…»; `v18RepararTest` «Juego de niño: con W sola…». Falta video en iPhone/iPad real (tarea humana) |

### §5 a §9 · Cronograma, tablero, checklist y prueba de diversión

| Punto | Estado | Dónde | Prueba / nota |
| --- | --- | --- | --- |
| Tablero con Función/Frente/Estado/commit/demo/prueba | Hecho | `docs/equipo/V18_TABLERO.md` | — |
| Video auténtico semanal | Parcial | Video de computadora fuera del repo (según el tablero) | Falta el de móvil real: tarea humana |
| Checklist §7: recompensa no duplicable, recarga sin pérdida | Hecho | Ver 2.5 y 2.7 | `v18CicloTest` «9 · Ganar otra vez no da materiales» |
| Checklist §7: sin errores críticos | Hecho | — | `v18CicloTest` «Sin errores de consola en todo el ciclo» |
| §8: combate sin sangre, 1v1 contra IA primero | Hecho | Mareo con estrellitas, «nadie se hace daño» (`combate.js` `terminar`) | `v18CombateTest` «El mareo final se pasa solo» |
| §8: nombre «Batalla de Bandadas», enemigos nuevos, Ciudad de los 36 | Decisión de Kelvin | No se usa el nombre; no se inventan enemigos | — |
| §9: «entiende por qué ganó» | Hecho **[CONSTRUIDO a181]** | `combate.js` `consejo()` y nodo `finTip` del panel final: al ganar dice por qué (y si ayudó el poder, con su nombre); al perder da un consejo según lo que pasó (no usó el poder → «usa tu poder» con su nombre y tecla o botón táctil; casi no le quitó plumas → aletazo de cerca y semilla de lejos; si no → apártate del «!») | `v18CombateTest` «V18.1 §9: al perder, el panel da un consejo…» |
| §9: ronda con niños con permiso parental | No hecho (tarea humana) | — | Necesita a Kelvin y permiso parental; sin telemetría |
| §5 D21/D30: prueba con el fundador, demo accesible | Parcial | Demo publicada con la bandera encendida por defecto | La prueba con Kelvin y la ronda observada quedan pendientes (humanas) |

**Construido en esta tarea (a181):** 2 piezas pequeñas y sin canon nuevo: (1) consejo al terminar el duelo (§9); (2) cotorra descubierta pero sin desbloquear visible y apagada en «Mis cotorras», con la pista para conseguirla, y el botón de la pausa sale ya con ella (§2.2 y §2.8). Textos solo en español; Kelvin decide su traducción (no se tocó `content/cap1/en.js`).

**Arreglo de prueba (a181):** `v18CicloTest` estaba en rojo (11/24) en main desde `e9d8494e` (el primer duelo abre ahora el entreno guiado y la prueba esperaba la cuenta atrás). La prueba pulsa «Saltar entreno» como haría un niño y vuelve a 24/24 (`src/game/v18/ciclo.js`, paso 4).

**Resultados (Chrome sin GPU, 8-nov):** v18CombateTest 74/74 · v18DescubrirTest 28/28 · v18CicloTest 24/24 · selfTest 108/108 · missionTest 79/79 · e2eTest 49/49 · menuModosTest 84/84 sola (83/84 en la tanda tras e2eTest: «Amazona Flight abierto desde el mundo…», no toca V18; en main sin estos cambios también pasa sola) · 0 errores de consola.

**Decisiones de Kelvin pendientes:** traducción de los 6 textos nuevos (`porGana`, `porGanaPoder`, `tPoder`, `tPoderT`, `tCerca`, `tEsquiva` en `combate.js`; `bloq` en `descubrir.js`); nombre definitivo «Batalla de Bandadas»; si se aprueban los 34 poderes de la matriz para producción (§8 pide aprobación antes de la producción masiva).
