# K4-06 · Textos de la V18 para niños de 7 a 10 años

Revisión de los avisos, paneles y botones de `src/game/v18/*.js` (objetos `TXT`) y su inglés en `content/cap1/en.js`. Base: `origin/main` en `93984fc6` (6-nov). **Solo propuesta:** no se cambió código. La coordinadora decide qué se aplica. Si cambia un texto en español, hay que cambiar también su clave en `en.js` y las pruebas que lo comparan (por ejemplo `minigolf.js:828` usa `TXT.usado`).

Criterio: un niño de 7 años lee despacio y un aviso dura de 1,2 a 4 s. Se marca lo **largo** (más de unas 12 palabras en un aviso corto), lo **técnico** (palabras de adulto o de golf), lo **confuso** (dos ideas en una frase o términos que cambian) y lo **incoherente** (el mismo término traducido de dos maneras). Los nombres propios y de poderes («Grito del Yunque», «Eco Protector», «Tuerca», «Campeona») no se tocan: son canon de Kelvin.

## 1. Lo más urgente (afecta a varias pantallas)

| # | Texto actual | Problema | Propuesta ES | Propuesta EN |
|---|---|---|---|---|
| G1 | «Grito del Yunque» → `El Yunque Call` (`en.js:1795`) y «¡Grito del Yunque!» → `Yunque Shout!` (`en.js:1947`); «Grito» → `Shout` en el minigolf y `call` en niveles y duelo | **Incoherente:** el mismo poder tiene tres nombres en inglés. Un niño no sabe si son el mismo. | (sin cambio) | Elegir uno solo, p. ej. `Yunque Shout` / `Shout` en todo. **Decide Kelvin** (nombre de poder). |
| G2 | «Impulso» → `Dash` (`en.js:1774`) y `Boost` (`en.js:1789`) | **Incoherente:** el mismo botón táctil con dos nombres. | (sin cambio) | `Boost` en las dos (el botón ya se llama así en otras pantallas; comprobar en `src/ui/`). |
| G3 | «Fuerza» (barra del minigolf) → `Power` (`en.js:1953`) | **Confuso:** en inglés choca con «Poder» → `Power`, que es otra cosa (el botón de poder). | (sin cambio) | `Strength` o `Force` (o `Swing`). |

## 2. Duelo (`combate.js` y `duelo2.js`)

| # | Texto actual | Problema | Propuesta ES | Propuesta EN |
|---|---|---|---|---|
| D1 | «Dos personas en esta computadora. Gana quien le quite las 5 plumas a la otra. Es un juego: no da premios.» (`duelo2.js:29`) | **Largo** (3 ideas); «computadora» no vale en tableta. | «Dos jugadores, un aparato. ¡Quita las 5 plumas a tu rival! (Sin premios: es para divertirse.)» | `Two players, one device. Take your rival's 5 feathers! (No prizes, just fun.)` |
| D2 | «Jugador 1: W A S D mover · E ala · F semilla (mantener: poder) · G poder» y la del Jugador 2 (`duelo2.js:31-32`) | **Largo y técnico:** «(mantener: poder)» y «G poder» repiten «poder» con dos sentidos. Ya existe la versión con `<kbd>` (l. 34); estas cadenas solo deberían quedar de respaldo. | Quitar el paréntesis: «F semilla · mantén F: poder fuerte · G poder» | `F seed · hold F: big power · G power` |
| D3 | «semilla (mantener: poder)» (`duelo2.js:34`) | **Confuso** para 7 años: no se entiende qué se mantiene. | «semilla (déjala pulsada: poder)» | `seed (hold it: power)` |
| D4 | «Con un mando conectado, juega el Jugador 2: X ala · B semilla · Y poder · A saltito» (`duelo2.js:35`) | **Largo.** | «Mando = Jugador 2: X ala · B semilla · Y poder · A salto» | `Gamepad = Player 2: X wing · B seed · Y power · A hop` |
| D5 | «Duelo de 2 jugadores · Esc para salir» (`duelo2.js:36`) | Bien. «Esc» no existe en táctil, pero el duelo de 2 es solo con teclado. | (sin cambio) | (sin cambio) |
| D6 | «¡El escudo aguantó parte del grito!» (`combate.js:38`, `duelo2.js:37`) | **Largo** para un aviso flotante de 0,8 s. | «¡El escudo frenó el grito!» | `Shield blocked some!` |
| D7 | «¡Interrumpida!» | **Técnico/confuso:** no dice qué pasó. | «¡Le cortaste el poder!» | `You stopped her power!` |
| D8 | «¡Ganaste 2 maderas y 1 piedra! Con eso se repara el puente colgante: sigue la bandera verde del mapa.» (`combate.js:35`) | **Largo** (21 palabras, dos órdenes). | «¡Ganaste 2 maderas y 1 piedra! Sigue la bandera verde para reparar el puente.» | `You won 2 wood and 1 stone! Follow the green flag to fix the bridge.` |
| D9 | «¡Ganaste 2 maderas y 1 piedra! El puente ya está reparado: guárdalas para lo que venga.» | Algo largo. | «¡2 maderas y 1 piedra! Guárdalas para más adelante.» | `2 wood and 1 stone! Save them for later.` |
| D10 | «¡Ganaste otra vez! Los materiales ya te los llevaste; busca más por el bosque.» | Punto y coma; frase rara. | «¡Ganaste otra vez! Busca más materiales en el bosque.» | `You won again! Find more materials in the forest.` |
| D11 | «Ala: Acción · Semilla: Impulso · Poder: mantén Impulso» | Ver G2. Bien de largo. | (sin cambio) | `Wing: Action · Seed: Boost · Power: hold Boost` |

## 3. Minigolf (`minigolf.js`)

| # | Texto actual | Problema | Propuesta ES | Propuesta EN |
|---|---|---|---|---|
| M1 | Panel fijo «Par 3» (`minigolf.js:51`) | **Técnico:** solo se explica una vez, en el primer aviso (`empiezaPar`). Después el panel dice «Par 3» sin más. | «Meta: 3 golpes» | `Goal: 3 strokes` |
| M2 | «¡Hoyo 1, par 3! Par 3 quiere decir que lo ideal es meterla en el nido en 3 golpes.» (`minigolf.js:46`) | **Largo** (18 palabras, 4,2 s) y repite «par 3». | «¡Hoyo 1! Intenta llegar al nido en 3 golpes.» | `Hole 1! Try to reach the nest in 3 strokes.` |
| M3 | «¡Hoyo 1, par 3! Lleva la semilla gigante al nido con los menos golpes.» (`minigolf.js:45`) | «con los menos golpes» suena raro. | «¡Hoyo 1! Lleva la semilla al nido con pocos golpes.» | `Hole 1! Get the seed into the nest in few strokes.` |
| M4 | «← → o arrastra: apuntar · Mantén Espacio: fuerza · G: Grito · R: reiniciar · Esc: salir» (`minigolf.js:47`) | **Largo:** 5 instrucciones en una línea. | Partir en dos líneas: «← → apunta · Mantén Espacio y suelta» / «G Grito · R otra vez · Esc salir» | `← → aim · Hold Space, let go` / `G Shout · R retry · Esc leave` |
| M5 | «Minigolf de Villa Raíz: lleva la semilla gigante hasta el nido. Pulsa Acción junto a ella.» | Algo largo. | «¡Minigolf! Ponte junto a la semilla gigante y pulsa Acción.» | `Mini golf! Stand by the giant seed and press Action.` |
| M6 | «El Grito empuja la semilla mientras rueda.» (sale si pulsas G con la semilla quieta) | **Confuso:** no dice qué hacer ahora. | «Primero golpea. Usa el Grito cuando ruede.» | `Hit first. Shout while it rolls.` |
| M7 | «El Grito del Yunque ya se usó en este hoyo.» | Largo para 1,8 s. | «Ya usaste el Grito en este hoyo.» | `Shout already used on this hole.` |
| M8 | «¡La semilla se salió! Vuelve a su sitio (+1 golpe).» | Bien. | (sin cambio) | `The seed went out! Back to its spot (+1 stroke).` (sin cambio) |
| M9 | «¡10 golpes! Cuenta como terminado.» | Bien; «cuenta como» algo seco. | «¡10 golpes! Hoyo terminado.» | `10 strokes! Hole over.` |
| M10 | «En partidas por turnos no hay premios ni récord» | **Técnico** («partidas por turnos», «récord»). | «Jugando por turnos no hay premios.» | `No prizes when taking turns.` |
| M11 | «Por turnos, en este mismo aparato» | Bien. | (sin cambio) | (sin cambio) |
| M12 | «¡Primer hoyo completado! Ganaste 3 fibras: sirven igual que la madera para reparar.» | Largo; «fibras» es nuevo. | «¡Primer hoyo! Ganaste 3 fibras para reparar cosas.» | `First hole! You got 3 fibers to fix things.` |
| M13 | «Récord: —» → `Best: —` | El guion solo no dice nada a un niño. | «Récord: todavía no» | `Best: none yet` |
| M14 | «Golpes: {}» → `Strokes: {}` | `Strokes` es palabra de golf poco conocida a los 7 años. | (sin cambio) | `Hits: {}` (y lo mismo en M2, M3, M9) |

## 4. Niveles (`evolucion.js`)

| # | Texto actual | Problema | Propuesta ES | Propuesta EN |
|---|---|---|---|---|
| N1 | «+{} XP» / «Tu aventura cuenta: +{} XP para tu cotorra.» | **Técnico:** «XP» es jerga de videojuego; muchos niños la conocen, pero no está explicada en pantalla (el Diario sí tiene «De dónde sale la XP», `en.js:264`). | «+{} XP» se puede quedar; el segundo: «¡Tu aventura suma +{} XP!» | `Your adventure adds +{} XP!` |
| N2 | «Nv {}» → `Lv {}` | **Técnico/abreviado.** | «Nivel {}» si cabe en la etiqueta. | `Level {}` |
| N3 | «Ya puedes elegir la variante del grito en Pausa → Mis cotorras.» | «variante» es palabra de adulto. | «¡Tu grito tiene otra forma! Elígela en Pausa → Mis cotorras.» | `Your call has a new style! Pick it in Pause → My parrots.` |
| N4 | «Variante del grito» (panel) | Igual que N3. | «Forma del grito» | `Call style` |
| N5 | «Vittata grita y la cotorra de Dominica la cubre con un escudo de plumas. En el duelo: tecla H o el botón Eco Protector.» | **Largo** (22 palabras, dos ideas). | «Vittata grita y la cotorra de Dominica la protege. En el duelo: H o Eco Protector.» | `Vittata calls and the Dominica parrot shields her. In the duel: H or Protective Echo.` |
| N6 | «La Campeona quiere entrenarte con una alianza: gánale con Vittata interrumpiéndola 2 veces con tu grito.» | **Largo y confuso** («interrumpiéndola»). | «Reto de la Campeona: gánale con Vittata y córtale el poder 2 veces con tu grito.» | `Champion's challenge: beat her with Vittata and stop her power twice with your call.` |
| N7 | «Alianza Eco Protector: Vittata en nivel 10 y la cotorra de Dominica en tu bandada.» | Es un requisito, se lee como frase cortada. | «Para Eco Protector necesitas: Vittata nivel 10 y la cotorra de Dominica.» | `For Protective Echo you need: Vittata level 10 and the Dominica parrot.` |
| N8 | «Alianza Eco Protector: gana a la Campeona con Vittata interrumpiéndola 2 veces.» | Ver N6. | «Eco Protector: gana a la Campeona con Vittata y córtale el poder 2 veces.» | `Protective Echo: beat the Champion with Vittata and stop her power twice.` |
| N9 | «Modo de prueba de la evolución» | **Falta en `en.js`** (solo se ve en la prueba, no en juego normal; baja prioridad). | (sin cambio) | `Evolution test mode` |

## 5. Puerto de La Mina (`puerto.js`)

| # | Texto actual | Problema | Propuesta ES | Propuesta EN |
|---|---|---|---|---|
| P1 | «Mi jefe le compró a Tuerca esta perforadora para hacer escalones a toda prisa. Se trabó y ahora tapa la única subida a pie.» | **Largo** (24 palabras) y «perforadora» es técnica. Diálogo: se puede partir en dos burbujas. | «Mi jefe le compró esta máquina a Tuerca para hacer escalones rápido.» / «¡Se trabó y tapa la subida!» | `My boss bought this machine from Tuerca to make steps fast.` / `It jammed and blocks the way up!` |
| P2 | «Tus ojos ven lo que otros no: las pistas brillan y una ruta dorada lleva al engranaje.» | Largo. | «¡Tus ojos ven más! Sigue el brillo dorado hasta las pistas.» | `Your eyes see more! Follow the golden glow to the clues.` |
| P3 | «¡Ya sé! El engranaje está trabado. Con tu poder lo aflojamos: tres veces.» | «engranaje» y «trabado» pueden no conocerse; «tres veces» suelto. | «¡Ya sé! La rueda dentada está atascada. Dale 3 veces con tu poder.» | `I know! The gear is stuck. Hit it 3 times with your power.` |
| P4 | «{}: mira al engranaje y pulsa Acción o G» | Bien; si se adopta P3, cambiar «engranaje» por «rueda». | (opcional) «{}: mira la rueda y pulsa Acción o G» | `{}: face the gear and press Action or G` (sin cambio) |
| P5 | «Tú sostén el freno, la palanca roja del costado, hasta que se pare.» | Incisos largos. | «Tú agarra la palanca roja hasta que se pare.» | `Hold the red lever until it stops.` |
| P6 | «Sostén el freno… {}%» | «%» es abstracto a los 7 años; ya hay barra. | «Sostén el freno…» (solo la barra) | `Hold the brake…` |
| P7 | «¡Listo, apagada! Para la escalera faltan 3 tablas y una cuerda: quedaron tiradas por la obra.» | Largo. | «¡Apagada! Ahora busca 3 tablas y 1 cuerda por la obra.» | `It's off! Now find 3 boards and 1 rope around the site.` |
| P8 | «Faltan materiales: {}/4. Busca las tablas y la cuerda por la obra.» | Bien de idea; algo largo. | «Tienes {}/4. ¡Faltan tablas o la cuerda!» | `You have {}/4. Find the boards and rope!` |
| P9 | «Escudo de plumas: ábrelo cuando la máquina sople (Acción o G)» | Bien. | (sin cambio) | (sin cambio) |
| P10 | «En Puerto de La Mina retumba una máquina… La bandera verde del mapa te lleva.» | «retumba» puede no conocerse; bonito, se puede quedar. | «¡Algo hace mucho ruido en Puerto de La Mina! Sigue la bandera verde.» | `Something's making a racket at Puerto de La Mina! Follow the green flag.` |
| P11 | Pistas «Una tuerca suelta del engranaje…», «El plano de la obra…», «Aceite en el suelo…» | En `en.js` existen solo con el sufijo « ({}/3)»; está bien si el código siempre lo añade. Comprobar con la demo en inglés. | (sin cambio) | (sin cambio) |
| P12 | «Construir rápido no es construir bien… Esta vez miré primero quién vive aquí.» | Bien: es el mensaje del capítulo y es corto. | (sin cambio) | (sin cambio) |

## 6. Otros avisos de la V18 (menos vistos)

| # | Texto actual | Problema | Propuesta ES | Propuesta EN |
|---|---|---|---|---|
| O1 | «Dicen que en el bosque canta una cotorra de otra isla. Encuéntrala, síguela y prueba su poder en el duelo: la bandera verde del mapa te lleva.» (`ciclo.js:20`) | **Largo** (28 palabras, 3 órdenes). | «Una cotorra de otra isla canta en el bosque. ¡Sigue la bandera verde!» | `A parrot from another island is singing in the forest. Follow the green flag!` |
| O2 | «Reto extra: gana otra vez a la Campeona, ahora con esta cotorra: {}. Cámbiala en Mis cotorras; con otro poder el duelo se juega distinto.» (`ciclo.js:21`) | **Largo**, punto y coma. | «Reto extra: gana a la Campeona con {}. Cámbiala en Mis cotorras.» | `Bonus challenge: beat the Champion with {}. Switch in My parrots.` |
| O3 | «Cambia tu poder en el duelo. Tú sigues siendo tú.» (`descubrir.js:38`) | Bonito pero ambiguo: ¿cambio de cotorra o de poder? | «Juegas el duelo con su poder. ¡Sigues siendo tú!» | `You duel with its power. You're still you!` |
| O4 | «Te alejaste: la Sombra de Tormenta se queda esperando.» y similares | Bien. | (sin cambio) | (sin cambio) |
| O5 | «Lanza una semilla (Acción) cuando abra la boca al roncar» (`sapo.js:24`) | Algo largo, pero claro y gracioso. | «Cuando abra la boca, ¡lánzale una semilla! (Acción)» | `When it opens its mouth, throw a seed! (Action)` |

## Resumen

- 3 incoherencias de términos en inglés (G1 a G3); G1 toca el nombre de un poder y la decide Kelvin.
- 49 filas en las zonas prioritarias (incoherencias, duelo, minigolf, niveles y puerto) y 5 en las demás. La mayoría tienen propuesta corta; las marcadas «sin cambio» ya están bien.
- Falta en `en.js`: «Modo de prueba de la evolución» (solo se ve en la prueba).
- Lo más visible y fácil de aplicar: M1 («Par 3» → «Meta: 3 golpes»), M2, M4, D1, D8 y N6.
- Archivos ocupados ahora (`minigolf.js`, `evolucion.js`, `combate.js`): aplicar cuando se liberen.
