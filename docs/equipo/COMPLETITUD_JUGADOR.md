# Completitud y descubrimiento, desde el jugador (10-nov)

Pedido de Kelvin (10-nov): «Tenemos varias cotorras, el mono que todavía ni lo he visto en todo el juego, el piloto… Está incompleto
muchas de las áreas». Su hijo, además, se quedó atascado volando («no podía salir»).

Este documento no es una auditoría del código. Responde a una sola pregunta: **¿un jugador normal llega a cada cosa?** Eso significa
una partida nueva, sin banderas en la URL, en teléfono (390×844) y en computadora. Cada fila dice cómo se llega y qué falta.

**Método.** Leí cómo se carga y cómo se anuncia cada personaje y actividad, sobre `main` 3c862e7: `src/boot.js` (`conMarca`,
`cuandoToque`, `cerca()`), `src/game/menu_modos.js`, `src/game/minimapa.js`, `src/game/v18/*.js` y `content/comun/personajes_v18.js`.
Después lo comprobé en la build de 3c862e7 con Chrome (Playwright, partida nueva, sin banderas), en 1280×800 y en 390×844 táctil.
Hice esto:
- leí las tarjetas del menú, el minimapa y la Pausa;
- entré en cada actividad desde el menú, como un jugador;
- probé Volar y Aterrizar;
- probé cómo se sale de cada actividad.

Hubo **0 errores de consola** en las dos pasadas. Las capturas están en el scratchpad de la sesión (`completo/`). Lo que solo sale del
código lo dice la fila.

## Dos aclaraciones primero
- **«El mono» es Tuerca**, no Maestro Moon. Tuerca es el «cyberpunk monkey» de `docs/DIRECTIVA_V18_3_RESOLUCION.md` §C
  (`personajes_v18.js`: «inventor mono»). **Maestro Moon es un gato mentor** (`moon.js`). Tuerca solo sale en la cadena de misiones
  del arco, y esa cadena se abre **después de reparar el puente**. Por eso Kelvin no lo ha visto.
- **«El piloto» puede ser dos cosas.** Puede ser el **Guardián del Primer Vuelo**, la cotorra piloto: está en el juego, con marcador y
  tarjeta en el menú. O puede ser la **Escuela de Vuelo del Guardián y su show aéreo** (`piloto.js`, CG-108), que **solo sale con
  `?piloto=1`**: ningún jugador la ve.

## Tabla

Leyenda de «¿Lo encuentra?»: **sí** = está a la vista desde el principio (menú, pausa, HUD o minimapa) · **difícil** = existe, pero
hay que saber dónde buscar o cumplir antes algo que nadie anuncia · **no** = solo con una bandera en la URL o por consola.

| Elemento | Existe en código | ¿Lo encuentra un jugador? | Cómo se llega | Qué falta | Prioridad |
|---|---|---|---|---|---|
| **Tuerca (el mono)** | sí: `puerto.js`, `arco.js`, `personajes_v18.js` | **difícil** (casi no) | Ganar el duelo a la Campeona → 2 maderas + 1 piedra → reparar el puente de Villa Raíz → aviso «En Puerto de La Mina retumba una máquina…» y bandera verde → misión del puerto (73.6, −75.2). Nada lo anuncia antes del puente. No tiene tarjeta en el menú ni marcador hasta entonces. | Una pista visible desde el principio (marcador «?» o «Próximamente: Puerto de La Mina, tras reparar el puente»). Una entrada en un panel «Qué hay para hacer». El taller de Tuerca (`taller_tuerca.js`) solo con `?interiores=1`. | **Alta** |
| **El Constructor y la Ingeniera** | sí: `puerto.js`, `arco.js`, `muelle.js`, `fiesta.js` | **difícil** | La misma cadena que Tuerca. Luego van en orden: puerto → faroles de las Atalayas (−69, 68) → muelle (−128, 8) → fiesta de la colina (5, 104). Cada misión se carga cuando termina la anterior. | Lo mismo que Tuerca. Además, el aviso del puerto sale **una vez por sesión**: si se cierra, solo queda la bandera verde. | **Alta** |
| **Maestro Moon (gato)** | sí: `moon.js` (−138, 162) | **sí, pero lejos** (visto) | Luna violeta en el minimapa desde el principio (`conMarca`, solo en el cap. 1) y la tarjeta «Retos con amigos» del menú, que te lleva allí. El modelo se carga a menos de 130 m. Está a unos 200 m de Villa Raíz, en las Lomas del Oeste. | **No tiene botón «Salir» en pantalla**: se sale con Esc, alejándose más de 45 m o volando alto 3 s. En el teléfono no hay forma clara de dejar el entreno. Su retrato es una insignia provisional. En la captura, el panel del entreno **tapa a Moon**: casi no se le ve. | **Alta** (salida táctil) |
| **Guardián del Primer Vuelo (piloto cotorra)** | sí: `guardian.js` (−63, −37) | **sí** (visto) | Ala celeste en el minimapa y «Retos con amigos». | Tiene botón «Salir» (`.vg-x`). Retrato provisional. | Baja |
| **Escuela de Vuelo y show aéreo** | sí: `piloto.js` | **no** (`?piloto=1`) | Solo por URL. | La decide Kelvin: apagada «hasta que vea fotos». Si es «el piloto» que busca, hay que enseñársela. | Media (decisión de Kelvin) |
| **Chispa (shiba, carrera)** | sí: `chispa.js` (45.8, 54.3) | **sí** (visto) | Rayo naranja en el minimapa y «Retos con amigos». | **No tiene botón «Salir» en pantalla**: se sale con Esc o alejándose más de 70 m. En el teléfono, el niño que vuela en la carrera no ve cómo dejarla. Es candidata al «no podía salir». | **Alta** (salida táctil) |
| **Campeona (duelo)** | sí: `combate.js` | **sí** (visto) | Tarjeta «Duelo» del menú y la rival en la explanada (186, 172), con marca naranja de misión sin nombre. | **Mientras se lucha no hay botón Salir** y **Esc no saca** (visto: abre la Pausa y el duelo sigue). Se sale alejándose o con Pausa → Cambiar de juego. | **Alta** |
| **Duelo de 2** | sí: `duelo2.js` | **sí en PC / no en táctil** (a propósito) | Tarjeta del menú y el círculo de la explanada. Con `pointer: coarse` no se carga. | Nada (decisión 14 de Kelvin). En la tarjeta del teléfono no se explica por qué no está. | Baja |
| **Minigolf** | sí: `minigolf.js` | **sí** | Tarjeta del menú y banderín verde del minimapa. Los hoyos 2 y 3 se abren al jugar. | Tiene Salir y Reiniciar. | Baja |
| **Pesca** | sí: `pesca.js` (202.7, 140.6) | **sí** (menú y pausa; visto) | Tarjeta «Pesca» del menú y botón «Pesca» de la Pausa. | **No sale en el minimapa** (sin `mapa()`). Quien explora no sabe que en el río se puede pescar. | Media |
| **Construir** | sí: `construir.js` | **sí** | Tarjeta del menú, botón junto a Pausa y tecla B. | Nada. | Baja |
| **Mercadito** | sí: `tienda.js` | **sí** | Pausa y Mi personaje. | Hay que pescar para tener conchitas; nada lo dice antes de abrirlo. | Baja |
| **Patrulla invasora (iguana, tilapias, plecos, pez león)** | sí: `invasoras.js` | **difícil** | Arriba a la izquierda, la chapa «Patrulla 0/4» (visto). En el minimapa, 4 marcas naranjas de «Misión» sin nombre (visto), mezcladas con las de la historia. El reporte se hace en la Estación de Villa Raíz. | No tiene tarjeta ni entrada en la Pausa. La iguana no apareció cerca de su sitio (152.7, 150.1) en las capturas de la landing (TAREAS_WEB, 10-nov). | Media |
| **Family Quest (Aventuras en familia)** | sí: `familia_aventuras.js` | **difícil** | Solo desde el Diario, sección «Recuerdos en familia» → botón «Aventuras en familia». | Ponerla en el menú y en la Pausa, junto a «En familia» (`b-familia`, CG-53, que sí está en la Pausa). | **Alta** (la web la anuncia) |
| **Modo familia por turnos (CG-53)** | sí: `familia.js` | **sí** | Botón de la Pausa. | Dos entradas «familia» distintas, en sitios distintos: confunde. | Media |
| **Cotorras en línea** | sí: `en_linea.js` | **sí** | «Jugar en línea», en la Pausa. | Nada para descubrirla. | Baja |
| **Criadero / Mi nido** | sí: `criadero.js` | **sí** | Botón Mi nido del HUD y tarjeta del menú. | Nada. | Baja |
| **Mis cotorras** | sí: `descubrir.js`, `evolucion.js`, `nuevas.js` | **sí** (menú; visto) | Tarjeta del menú. Con una partida nueva dice «Aún no tienes cotorras aquí»: no enseña cuáles hay ni cómo se consiguen. En la Pausa, «Mis cotorras» sale oculto. | Ver abajo («Cotorras»). | Media |
| **Álbum de las 36** | sí: `album.js` | **sí** | Tarjeta del menú y el Diario. | Nada. | Baja |
| **Cómic** | sí: `comic.js` | **sí** | Pausa y panel final. | Las viñetas solo existen si ocurrió su evento: al principio está casi vacío. | Baja |
| **Sombra de Tormenta → Serpiente → Sapo** | sí: `amenaza.js`, `serpiente.js`, `sapo.js` | **difícil** | En cadena: la Sombra sale tras reparar el puente; la Serpiente, tras la Sombra; el Sapo, tras la Serpiente (`cuandoToque`). No tienen tarjeta. | Una pista «lo siguiente» tras cada una. Hoy la Serpiente y el Sapo no tienen marcador propio en el minimapa. | Media |
| **Los 6 capítulos** | sí: `content/cap1`, `ep2` a `ep6` | **sí** | Botón «Capítulos» en la portada y en la Pausa. Ninguno está cerrado. | Nada que bloquee. | Baja |
| **Retos, Tormenta, Banquete, Flight, River, Libre, Récords** | sí | **sí** (visto) | Una tarjeta cada uno en «¿Cómo quieres jugar?». | Son 16 tarjetas más «Construir»: en el teléfono hay que bajar mucho, y Chispa, Moon y el Guardián quedan dentro de «Retos con amigos». | Media |
| **El tren de Vittata y Amazona Maze** | sí: `tren.js`, `maze.js` | **no** (visto: tarjeta oculta en PC y teléfono) | Ocultas a propósito: Kelvin las sacó del menú y congeló su desarrollo (`docs/DECISION_LOG.md`, 29-oct y 31-oct). | Nada, salvo que Kelvin cambie de idea. | — |
| **Escondite, trucos, rescate del pichón, retos del día** | sí | **difícil** | Escondite y trucos: en el mundo. Rescate: en el cartel del nido, desde el paso 6 de la historia. Retos del día: en la Pausa. | No hay una lista de lo que hay. | Media |
| **Interiores, Casa editable, taller de Tuerca** | sí: `interiores*.js`, `taller_tuerca.js` | **no** (`?interiores=1`) | Solo por URL. | Kelvin decide (V18.4 en curso). | — |
| **Combat Animation 2.0** | sí | **no** (`?combate2=1`) | Solo por URL. | Kelvin decide. | — |

### Cotorras (especies jugables)
- **Desde el principio:** Vittata, más la cotorra de Dominica (*A. arausiaca*), que canta en un árbol cerca de Villa Raíz y se
  desbloquea con su reto (`descubrir.js`).
- **Por hitos** (`nuevas.js`), 12:
  - primer duelo → agilis;
  - puente → farinosa;
  - Sombra → barbadensis;
  - duelo con otra cotorra → xantholora;
  - Serpiente → guildingii;
  - Sapo → diadema;
  - oro en el minigolf → versicolor;
  - 3 duelos → collaria;
  - completar el hoyo → leucocephala;
  - duelo sin perder plumas → albifrons;
  - puente y Serpiente → rhodocorytha;
  - piedras y fibras → kawalli.
- **Por el Álbum:** 9 o más, con un hito provisional que decide Kelvin: brasiliensis, auropalliata, tresmariae, dufresniana,
  viridigenalis, finschi…
- **Qué falta:**
  - «Mis cotorras» dice qué hito falta, pero **no lleva al sitio** («Ir»).
  - Más de la mitad de los hitos dependen del puente o de la cadena de amenazas, que no se anuncian.

## Vuelo: «no podía salir» (candidatos, del código)
1. **El botón Volar alterna, no aterriza.** En el teléfono, el botón dice «Aterrizar» mientras vuelas. Al pulsarlo empieza a bajar y
   **el texto cambia a «Volar»** (`input.js` `syncSwimButtons`: `land = flying && !landing`). Si el niño vuelve a tocarlo porque
   «no baja», **cancela el aterrizaje** (`fisica.js` `toggleFly`) y sigue volando. Saltar también cancela el aterrizaje
   (`fisica.js:132`). Un niño que toca dos veces, o que mantiene Saltar, no aterriza nunca.
2. **Volando, rozar el suelo no termina el vuelo** (`fisica.js`: «sigue rasante»). Solo se posa al pulsar Aterrizar (X), al bajar
   con C o al tocar el suelo despacio. En el teléfono no hay botón para bajar (C) fuera del agua.
3. **Chispa y Moon no tienen «Salir» en pantalla.** En el teléfono solo se sale de la carrera o del entreno alejándose (70 m / 45 m) o
   desde Pausa → «Cambiar de juego». El Guardián sí tiene Salir.
4. **En Retos el botón Volar se oculta** (`retos.js`: `body.retos-on #b-fly`), porque el vuelo va forzado. Se sale desde la Pausa o el
   panel del reto (QA-214).
5. **Sobre el agua, aterrizar es nadar.** Volando sobre el río o el mar, Aterrizar te mete en el agua.

**Lo visto en el teléfono (390×844 táctil, partida nueva, junto al taller de Villa Raíz):**

| Toque | Estado | Texto del botón |
|---|---|---|
| Volar | vuela | «Aterrizar» |
| Aterrizar (1 s después) | aterrizando | **«Volar»** |
| Otra vez (niño impaciente) | **vuelve a volar** (cernido) | «Aterrizar» |
| Aterrizar y esperar **8 s** | **sigue en el aire**, en fase de aterrizaje, a 1 m del suelo | **«Volar»** |

Es decir, se reproduce: tras 8 s sigue sin posarse y el botón invita a «Volar». En computadora, V y X no hicieron nada mientras
corría la intro: el mundo está en pausa, así que no es un fallo, pero la prueba de vuelo en PC queda por repetir tras la intro.

**Lo visto al salir de cada actividad** (entrando desde el menú):

| Actividad | ¿Botón «Salir» en pantalla? | ¿Esc saca? (PC) |
|---|---|---|
| Chispa | **no** (PC y teléfono) | sí |
| Moon | **no** (PC y teléfono) | sí |
| Guardián | sí | sí |
| **Duelo** | **no mientras se lucha** | **no**: Esc abre la Pausa y el duelo sigue en «lucha» |
| Minigolf | sí («Salir · Esc») | sí |
| Pesca | sí («Salir · Esc») | sí |

La Pausa se ve siempre, y su «Cambiar de juego» cancela cualquiera de estas actividades, pero un niño no lo sabe.

## Los arreglos que más cambian (en orden)
1. **Panel «Qué hay para hacer»** (Pausa y portada): todas las actividades y personajes con su estado («Listo», «Se abre al reparar
   el puente», «Solo en computadora») y un botón **«Ir»**, que reusa `lanzar18` y `llevar()` de `menu_modos.js`. Ahí entran el
   puerto (Tuerca, el Constructor y la Ingeniera), la Pesca, la Patrulla invasora, Family Quest, las amenazas y los retos del mundo.
2. **Marcadores para todo en el minimapa**: un «?» gris para lo bloqueado (el puerto, las Atalayas, el muelle, la fiesta y las amenazas)
   con la pista de cómo abrirlo; un pez para la Pesca; un ojo para la Patrulla invasora.
3. **Aterrizar de verdad en el teléfono:** mientras baja, el botón sigue diciendo «Aterrizando…» y no cancela. O, mejor, un toque
   aterriza y para volver a volar hay que tocar otra vez ya en el suelo. Saltar no cancela el aterrizaje en táctil.
4. **Botón «Salir» visible en Chispa, Moon y el duelo**, como el `.vg-x` del Guardián, con su texto en inglés en `content/cap1/en.js`.
   Además, que Esc saque del duelo.
5. **Nombres en las marcas naranjas.** Visto en una partida nueva: el minimapa ya tiene **18 marcas naranjas de «Misión» sin nombre**.
   Son 5 de la historia, la cotorra de Dominica, 7 del puente y sus materiales, la rival y las 4 de la Patrulla. No se distingue qué es cada una. Hay que
   darles nombre y color propio («Puente roto», «Patrulla») y decir que el puente abre el Puerto de La Mina, con Tuerca.
6. **Family Quest en el menú y en la Pausa**, junto a «En familia».
7. **Kelvin decide:** encender o enseñar `?piloto=1` (Escuela de Vuelo) y `?interiores=1` (taller de Tuerca); el hito definitivo de
   las cotorras del Álbum; los retratos definitivos de Moon y del Guardián.
8. **Repetir en PC la prueba de vuelo después de la intro**, y probar la salida de las amenazas (Sombra, Serpiente y Sapo) con el
   progreso real del puente.
