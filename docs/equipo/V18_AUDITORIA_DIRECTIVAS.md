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

## V18.2

Auditoría de `docs/DIRECTIVA_V18_2.md` frente al código (a182, 8-nov-2026, base `1ea9d249`). Hecha leyendo el código y las baterías, sin fiarse de los documentos.
Las líneas son las del commit de esta auditoría. «EVO» = `v18EvolucionTest` (`src/game/v18/evolucion.js`, función `test`). «EXP» = `v18ExplorarTest`. «MM» = `menuModosTest`. «REC» = la batería de `records.js`. Entre comillas va el inicio del nombre del check.

| § | Punto | Estado | Dónde (archivo:línea) | Prueba (batería · check) |
|---|---|---|---|---|
| 1, 16 | No cambian de especie ni de modelo; sin híbridos ni modelos nuevos | Hecho | `evolucion.js:355` (`ajustar`: `Object.create` con números; no toca modelos ni rigs) | EVO · «Sin f.nivel (IA, duelo de 2…) el motor recibe el mismo objeto» |
| 2 | 34 especies progresan; Mara y Vela (martinicana, violacea) siguen de consejeras y fuera | Hecho (**reforzado aquí**) | `nuevas.js:809` (`NO_PODER`); `evolucion.js:48` y `:225` (`dar()` no les da XP, **nuevo**) | EVO · «Las 34 especies del catálogo base tienen poder propio…» (sin las 2) y «§2: las dos especies históricas… no ganan XP» (**nuevo**); nuevas · «Mara y Vela no se pueden elegir» |
| 2 | Cada especie conserva su poder de la matriz V18.1 | Hecho | `evolucion.js:371-379` (solo su propio poder, nunca el de otra) | EVO · «Las 34 especies…» y «Sin f.nivel…» |
| 3 | Niveles 1–40 y cuatro etapas (Aprendiz, Despertar, Guardián, Maestro) | Hecho | `evolucion.js:50-52` (curva `T(n)`, tope 40), `:72-77` (`ETAPAS_ESP`), `:79-88` (`MEJORA`, `SECUNDARIA`) | EVO · «Curva: T(10)=396…», «Niveles 1–40…», «Guardián (nv 20): PICO deshace semillas…», «Duelo real: Quiebro nv 20…» |
| 3 | Cada etapa se nota y se usa (no solo números) | Hecho | Despertar ×1,12 y menos espera; Guardián, secundaria por técnica (`:347`); Maestro, destellos (`:346`) en el duelo y **ahora también explorando** (`explorar.js:172`) | EVO · «Guardián (nv 20)…»; EXP · «Explorando, la espera del poder es la de la etapa» y «Explorando, el poder en la etapa Maestro (nv 30) suelta destellos dorados» (**nuevo**) |
| 4 | Vittata: Grito del Yunque → Eco Amplificado → Eco Dirigido → Grito Maestro, mismo rig | Hecho | `evolucion.js:60-70` (`ETAPAS`), `:357-364`, topes `:71` | EVO · «Etapas: nv 1 = el grito de hoy…», «Topes en todas las etapas…», «Alcance medido…», «Empuje e interrupción medidos…», «Precisión medida…» |
| 4 | Eco Dirigido: más precisión e interacción extra con obstáculos | Hecho en el duelo / parcial explorando | Deshace las semillas de la rival en su cono (`ETAPAS[2].desvia`). Explorando, el grito solo se ve más grande (`explorar.js:62`); no hay obstáculos del mundo que reaccionen | EVO · «Eco Dirigido (nv 20) deshace la semilla rival…» |
| 4 | Grito Maestro: variante avanzada, efecto especial y mejora táctica | Hecho (**prueba nueva**) | `evolucion.js:68` (11 m, cono de ±35°, desvía, destellos) | EVO · «Grito Maestro (nv 30) medido…» (**nuevo**: antes ninguna prueba medía el nivel 30 del grito) |
| 5 | Cuatro familias técnicas como base; sin motor por especie | Hecho | `evolucion.js:88` (`SECUNDARIA` por técnica), `habilidades.js:628` (`ver`: el motor pregunta y no decide) | EVO · «Guardián (nv 20)…» |
| 6 | Elementos de fantasía (fuego, agua, viento, naturaleza, luz, eco) que enriquecen sin sustituir | Parcial (lo que pide un prototipo) | Un elemento por alianza (`evolucion.js:90-108`). Los poderes individuales no tienen variante elemental propia | EVO · «Hay 6 alianzas… un elemento distinto» |
| 7 | Alianza: temporal, con coste, recarga y duración; sin híbridos | Hecho | `evolucion.js:394` (Eco Protector: coste 60, recarga 14 s, 2 s), `:418` (`ALI_BASE` de las otras 5) | EVO · «Tecla H…», «Duración: el escudo dura 2 s…», «Recarga: a los 13,5 s…», «Coste: con 50 de energía…», «Alianza X: requisitos → … ≤ 1 pluma» (×6) |
| 7 | Vittata + Arausiaca = Eco Protector (onda + escudo) | Hecho | `evolucion.js:394-407` | EVO · «Tecla H…», «Su escudo para UN golpe normal…», «Ala fuerte rompe su escudo…» |
| 8 | Activación: descubrir las dos, nivel, reto, desbloquear, elegir y usar | Hecho | `evolucion.js:303` (`revisarAlianza`), `:312`, `:322` (`elegirAlianza`), `:654-672` (reto al ganar) | EVO · «Alianza: bloqueada sin la cotorra de Dominica…», «Desafío: ganar con 1 interrupción no la desbloquea…», «Con la alianza elegida, el duelo trae Eco Protector…» |
| 8 | La juega una cotorra y la compañera aporta apoyo visual | Hecho | `combate.js:405` (retrato y texto de apoyo); `evolucion.js:482` (apoyo explorando) | EVO · «Apoyo visual de la cotorra de Dominica…», «Alianza X…» (apoyo con retrato y explorando) |
| 9 | Seis alianzas, la primera Vittata + Arausiaca; no prometer las 630 | Hecho (las 5 parejas, nombres y elementos son provisionales) | `evolucion.js:90-108` | EVO · «Hay 6 alianzas…» |
| 10 | XP de actividades existentes: exploración, descubrimientos, misiones V18, duelos, desafíos, minigolf, reparación | Hecho | `evolucion.js:268` (`hitos`), `:654` (duelos), `:677` (minigolf); `arco.js:454`, `muelle.js:295`, `puerto.js:604`, `fiesta.js:381`, `chispa.js:72`, `moon.js:74`, `guardian.js:79` | EVO · «XP de cada actividad…», «Ritmo (sesión simulada…)»; puerto «13b · XP V18.2», muelle «7c», fiesta «7b», arco «10b» |
| 10 | Carreras y misiones del capítulo 1 fuera de la V18 (Amazona Flight, River Rush, tren, misiones de `misiones.js`) | No hecho | Solo pagan la carrera de Chispa y las misiones V18. Repartir XP es decisión de Kelvin | — |
| 10 | Sin farmeo, sin compras ni azar | Hecho | `evolucion.js:53-54` (topes 160/300 al día, mitad desde la 3.ª victoria, 3 nidos) | EVO · «20 victorias en un día…», «Derrota sin quitar plumas = 0…», «Minigolf: 15 por nido…», «Tope global de lo repetible…», «Los hitos no se repiten…» |
| 11 | Motivación larga: niveles, alianzas y récords; nada regalado al inicio | Hecho | `records.js:269` (`v18De`: niveles, etapas, alianzas, duelos por etapa); `menu_modos.js:229` (Mis cotorras con XP) | REC · «V18 · Duelos ganados (4) con quién, nivel más alto…», «V18 · Duelos por etapa…»; MM · «V18 · Mis cotorras: encima del menú, cada cotorra con su poder, su nivel…» |
| 12 | Nivel alto más capaz pero no invencible; la habilidad compite | Hecho | `combate.js:51-66` (`DIFICULTAD` por etapa, sin tocar aquí); duelo de 2 sin niveles | EVO · «Equilibrio: la jugadora media gana entre el 55 y el 75 %…», «Primera victoria posible en el nivel 1…», «La Campeona sube con la etapa…» |
| 12 | Sin invulnerabilidad permanente, poderes sin recarga ni ataques imposibles de esquivar; alianzas que no ganan solas | Hecho | Topes del grito `evolucion.js:71`; escudos ≤ 2 s; recarga 14 s | EVO · «Topes en todas las etapas… esquivable», «Duración…», «No gana sola…», «Con un escudo ya puesto no sale» |
| 12 | Se mantienen las 5 plumas | Hecho | `combate.js:40` (`PLUMAS = 5`, no depende del nivel) | EVO · «Empuje e interrupción medidos… nunca quita plumas», «Grito Maestro (nv 30) medido…» |
| 13 | Módulo propio que reutiliza habilidades, fx, combate y guardado | Hecho | `evolucion.js` entero; `progreso.js:44` (`migrar`), `:80` (`cambiarEvo`) | EVO · «Partida V18 vieja (v1 sin evolución)…» |
| 13 | Guardar por especie: nivel, XP, mejoras, poderes y alianzas | Parcial | Por especie se guardan `xp`, `nivel`, `mejoras` y `variante` (`evolucion.js:170-185`). Las alianzas se guardan juntas (`evo.alianzas`), no por especie, y los poderes se deducen del nivel en vez de guardarse. Funciona igual | EVO · «Guardar → recargar conserva nivel, XP, variante, alianza…», «Evolución corrupta se sanea…», «Migración: la partida del prototipo…», «Vuelta atrás…» |
| 14.1–14.5 | Prototipo: Vittata en 3 etapas, Arausiaca, XP y subida, desbloqueo visible, Eco Protector | Hecho | Ver §4, §7 y §8 | EVO · «Ganar a la Campeona con 370 XP: +40 XP y sube a nivel 10…», «En el siguiente duelo ya es Eco Amplificado», «Avisos al jugar…» |
| 14.6 | Rival de IA | Hecho | La Campeona (`combate.js`) | EVO · los checks de duelo |
| 14.7 | Guardar y recuperar | Hecho | `progreso.js`, `evolucion.js:170` | EVO · «Guardar → recargar…» |
| 14.8 | Controles en móvil y en computadora | Hecho (táctil simulado) | Tecla G/H; botón Poder (`explorar.js`), botón `.vd-ali` ≥ 56 px (`combate.js:597`) | EVO · «Táctil: el botón Eco Protector se ve, mide ≥ 56 px…», «El botón (también con el dedo) la lanza igual»; EXP · «QA-185: el botón táctil no pisa Impulso» |
| 15.1 | Diseño técnico breve | Hecho | `docs/equipo/V18_2_DISENO.md` | — |
| 15.3–15.4 | Video real de una subida de nivel y de Eco Protector | No hecho (necesita persona) | — | — |
| 15.5 | Pruebas de combate y equilibrio | Hecho con bots; falta con niños | `evolucion.js:741` (`medirEquilibrio`) | EVO · «Equilibrio…» |
| 15.6 | Pruebas de guardado y carga | Hecho | — | EVO · «Guardar → recargar…», «Migración…» |
| 15.7 | Validación en un móvil real | No hecho (necesita persona) | Solo táctil simulado | — |
| 16 | Sin rankings online ni cuentas; Mara y Vela intactas; sin identidad por regiones | Hecho | Todo es local (`progreso.js`); no hay red en `evolucion.js` | nuevas · «Mara y Vela no se pueden elegir» |
| 16 | No perjudicar el rendimiento móvil | Sin prueba propia | Usa los objetos y efectos que ya existen, sin asignaciones por cuadro en lo nuevo | — |

### Construido en esta auditoría (commit `6a800d68`)
1. **Grito Maestro medido en el duelo real** (§4). El nivel 30 del grito no tenía ninguna prueba. El check nuevo de EVO comprueba que acierta a 11 m y no a 13; que a 30° acierta (el Eco Dirigido no) y a 38° no; que deshace la semilla rival, nunca quita plumas y lleva los destellos dorados.
2. **Destellos de Maestro también explorando** (§3, «efecto visual especial»). Antes solo salían en el duelo. Ahora cualquier cotorra en el nivel 30 o más suelta destellos dorados al usar su poder con G o con el botón Poder. Check nuevo en EXP: en el nivel 30 sí salen y en el 20 no.
3. **Mara y Vela fuera de la progresión** (§2). `dar()` ya no da XP a martinicana ni a violacea, aunque alguien la pida. Check nuevo en EVO.

No se tocó `DIFICULTAD` del duelo ni el reparto de XP.

### Decisiones de Kelvin (anotadas, no construidas)
- Nombres definitivos de las 6 alianzas y de las etapas, las 5 parejas después de Eco Protector y qué elemento lleva cada una (§6, §9). Hoy son provisionales.
- Si las carreras y misiones del capítulo 1 fuera de la V18 (Flight, River Rush, tren, `misiones.js`) deben dar XP, y cuánta (§10, reparto de XP).
- Si los poderes individuales deben tener variantes elementales, y cuál le toca a cada especie (§6, canon y arte).
- Qué «obstáculos» del mundo debe mover el Eco Dirigido explorando (§4). No hay un obstáculo del mundo que encaje sin diseño nuevo.
- Videos (§15.3–15.4) y validación en un móvil real (§15.7): necesitan una persona.
