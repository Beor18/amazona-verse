# F3 · Construir 2.0: de «poner piezas» a «hacer cosas que sirven» (diseño)

Claude web B (Fable) · 16-nov-2026 · **solo diseño; no hay código tocado.** Responde a Kelvin (15-nov): «que las construcciones sean mejores y no tan sencillas». Se implementa en N3.

## 1. La idea en tres líneas

- Hoy el niño coloca piezas y el mundo no se entera. En 2.0, **el mundo responde**: lo que construyes trae aves, visitas, luz, fruta o un camino nuevo.
- No hay puntos ni «nivel del rincón». Hay un **Libro de visitas** en el Diario: quién vino y qué lo trajo. Eso es lo que da ganas de construir otra cosa.
- No cambia el gesto (fantasma, imán, Acción), ni el guardado de lo ya construido, ni el tope de 40 piezas (24 en «bajo»).

## 2. Qué hay hoy (punto de partida)

| | Estado |
|---|---|
| Piezas | 7 base (nido, techo de hojas, bromelia, flores, piedras, tronco, banderines), 7 de casa con imán (piso, pared, puerta, ventana, muro, tejado, maceta), 6 del Mercadito (helecho, cerca de bambú, farol, comedero, mesa de dominó, hamaca) |
| En marcha (C9) | escalera, baranda, techo a dos aguas, farol de piedra, cerca de tablas, banco, huerto |
| Plantillas (C10) | Casita rápida, Bohío, Torre de vigía, Puente pequeño, Nido grande |
| Guardado | `S.construir = { v: 1, piezas: [{ t, x, z, r }] }` (sin altura ni color) |
| Foto | PNG que se baja al dispositivo; no va a ningún álbum |
| Efecto en el mundo | **ninguno**: las piezas no son perchas, no atraen nada y no se pueden poner sobre el agua |

## 3. Obras: qué hace cada construcción

Una **obra** es una pieza o un grupo de piezas que el juego reconoce y que desde ese momento hace algo. Al completarla suena un acorde, salta el aviso «¡Obra lista: {nombre}!» y se apunta en el Libro de visitas.

| Obra | Cómo se hace | Efecto real en el mundo | Sistema que reutiliza |
|---|---|---|---|
| **Comedero con visitas** | 1 comedero. Mejor con flores o bromelia a menos de 3 m | Al rato (jugando, no por reloj real) baja una pareja de cotorras **del hábitat de ese lugar**, come y se va. Verla a menos de 8 m durante 2 s la apunta en el Álbum de las 36, como cualquier residente | `residentes.js` (especies por hábitat, ya tiene «especies del lugar más cercano»), `album.ver()` |
| **Caja nido** (pieza nueva) | 1 caja nido en poste. Mejor bajo un techo o junto a un árbol | Una pareja la adopta: se posa, entra y sale. Con comedero cerca se quedan más. Tras varias visitas aparece un pichón asomado (solo se mira) | `rescate.js` ya dibuja una caja nido; `residentes.js` |
| **Jardín de mariposas** | 3 o más flores, bromelias o macetas juntas | Llega una nube de mariposas cebra; si Vittata se queda quieta, una se le posa en el pico (ya existe) | `fauna.js` (mariposa cebra) |
| **Huerto que da fruta** | 1 huerto (C9) | Crece en 3 etapas con el tiempo de juego. Maduro: Acción «Cosechar» da 1–3 frutos que suben XP del nido | `banquete.js` → `G.criadero.dar('fruta', id)` |
| **Rincón con luz** | farol o farol de piedra | Al atardecer se enciende solo (brillo real). Con luz, las visitas de la tarde se quedan | `atardecer.js`, material emisivo; como mucho 2 luces reales |
| **Sitio de descanso** | banco, hamaca o mesa de dominó | Vittata puede sentarse (gesto). De vez en cuando un vecino viene, se sienta y suelta una frase | `vecinos.js`, `humor.js`, gestos (E17) |
| **Percha y mirador** | Torre de vigía (plantilla) o cualquier tejado | Te puedes **posar encima** (hoy no). Desde la torre, «Mirar» enseña en el minimapa lo que hay sin descubrir alrededor durante 20 s | `fisica.addPercha`, `minimapa.js`, `secretos.js` |
| **Puente con atajo** | Plantilla «Puente pequeño» en un **vado** (2–3 sitios marcados en la quebrada) | El puente encaja solo de orilla a orilla, se puede caminar por él, sale en el minimapa y los vecinos empiezan a cruzar: aparecen visitas en la otra orilla | `solidos.js` (suelo caminable), `minimapa.js`, `vecinos.js` |
| **Mi casa** | Bohío o Casita con puerta | «Volver a mi casa» en la Pausa (aparece ahí). Más adelante la puerta entra a la Casa editable de V18.4 | `pausa.js`, `interiores.js` (piloto) |

**Reglas de las obras.**
- Nunca al azar entre las 34 especies: viene quien vive en ese hábitat (`docs/equipo/MUNDO_VIVO_ECOLOGIA.md`). Las dos extintas no salen jamás.
- Nada se pierde ni se muere: si quitas el comedero, las aves simplemente dejan de venir. Sin relojes reales, sin «vuelve mañana».
- Como mucho 2 visitas a la vez por rincón (rendimiento y calma). En «bajo» y Modo Escuela: 1.
- La primera obra de cada tipo enseña su efecto con un aviso corto. Después, sin texto.

**Naturaleza y fuentes.**
- La caja nido se apoya en lo que el juego ya dice en el cartel del Rescate: la cotorra anida en huecos de árboles y en cajas nido. Fuente, tal como la cita `docs/equipo/DATOS_VERIFICADOS.md`: ficha «Puerto Rican Amazon» de parrots.org/encyclopedia/puerto-rican-amazon («February-June in tree cavities»). Allí figura como **parcial**: lo de las cajas nido no tiene aún fuente primaria leída. Por eso la obra **no añade texto de dato**; es una pieza de juego.
- El «nido de ramitas» de suelo se queda como decoración: no se dice que las cotorras aniden así.
- Mariposa cebra, peces y demás: solo los animales que ya tienen ficha con fuente. Ninguna obra añade un dato nuevo.

## 4. Piezas nuevas (pocas, y todas con función)

| Pieza | Para qué | Nota |
|---|---|---|
| Caja nido en poste | obra «Caja nido» | misma forma que la de `rescate.js` |
| Bebedero de piedra | segunda forma de atraer visitas; con lluvia se llena | geometría simple |
| Percha de rama | las visitas se posan aquí en vez de en el suelo; Vittata también | registra una percha |
| Letrero | el niño elige 1 de 8 dibujos (cotorra, flor, casa, estrella…), **sin texto libre** | privacidad infantil: nada escrito por el niño |
| Arco de entrada | marca «la puerta» del rincón; por ahí llegan los vecinos | familia de imán `pared` |

Las de C9 no cambian. Total tras 2.0: 32 tipos; el presupuesto de dibujo sigue siendo una llamada por tipo con piezas.
**Para Kelvin:** las piezas nuevas se le enseñan por foto antes de encenderlas (regla del 9-nov).

## 5. Plantillas

Las de C10 pasan a ser **obras de un toque**: se colocan, ya funcionan y se pueden cambiar pieza a pieza.

| Plantilla | Obra que activa |
|---|---|
| Casita rápida, Bohío | Mi casa (el Bohío, además: huerto y sitio de descanso) |
| Torre de vigía | Percha y mirador, y Rincón con luz |
| Puente pequeño | Puente con atajo (solo en un vado; fuera de un vado es decoración y lo dice: «Aquí queda bonito. En un vado, además, sirve para cruzar») |
| Nido grande | pasa a llevar una caja nido → Caja nido y Jardín de mariposas |
| **Nueva: Merendero** | comedero + bebedero + percha + 2 flores → Comedero con visitas |
| **Nueva: Placita** | banco + mesa de dominó + farol + banderines → Sitio de descanso y Rincón con luz |

## 6. Colores: 6 de la naturaleza de la isla (C11)

| # | Nombre | Color | De dónde sale en el juego |
|---|---|---|---|
| 0 | Natural | (sin pintar) | por defecto |
| 1 | Verde cotorra | `#3fa34d` | Vittata |
| 2 | Rojo flamboyán | `#e2452f` | los pétalos de `juice.js` |
| 3 | Amarillo guineo | `#f4c430` | `guineo.js` |
| 4 | Turquesa de playa | `#1fb5b0` | el mar; ya está en el ropero |
| 5 | Violeta atardecer | `#7a4fb3` | `atardecer.js`; ya está en el ropero |
| 6 | Arena | `#cbb48a` | la playa; ya está en el ropero |

- **Cómo se pinta:** botón «Pintar» (brocha) en la barra; se elige el color y se toca la pieza bajo el fantasma. Teclado: `P` y 0–6.
- **Qué se pinta:** solo las superficies «de pintura» (tablas de pared, puerta, ventana, baranda, cerca, banco, banderines, caja nido, letrero). La paja, la piedra y las plantas no cambian: así nada queda feo.
- **Técnica:** la pieza guarda `c` (0–6, opcional): `{ t, x, z, r, c }`. Cada vértice lleva una marca «pintable»; el material mezcla el color de la pieza con el color elegido solo donde hay marca (un atributo por instancia, misma llamada de dibujo). Las partidas viejas se leen igual (`c` ausente = Natural).
- **Todos gratis desde el principio.** Los nombres y tonos son arte: los aprueba Kelvin.

## 7. Foto al Álbum

- El botón «Foto» ya encuadra el rincón sin Vittata delante (T40). Ahora, además de poder bajarla, ofrece **«Guardar en Mis rincones»**.
- **Mis rincones:** sección nueva del Diario, al lado del Álbum de las 36. Hasta 6 fotos (JPEG 320×240, como los recuerdos de «Aventuras en familia»), cada una con marco, las estampas de las obras que salen en ella y las aves que estaban de visita. La séptima pregunta cuál cambiar.
- En el dispositivo, aparte de la partida (`<almacen>.rincones`). Sin nombres, sin subir nada, sin compartir automático.
- La foto con una visita dentro del encuadre gana la estampa «¡Con visita!»: es la razón para esperar al ave y disparar a tiempo.

## 8. Plan por fases

Cada fase se publica sola, deja las baterías en verde y se puede apagar con una bandera.

| Fase | Qué entra | Archivos | Prueba | Esfuerzo |
|---|---|---|---|---|
| **0 · Cerrar C9–C11** | piezas y plantillas en marcha; pintar con `c` | `src/game/construir.js`, `content/cap1/en.js` | `AV.construirTest` (ya existe): leer `c`, pintar, deshacer pintura | 1–1,5 días |
| **1 · Obras que traen vida** | detector de obras, Libro de visitas, Comedero con visitas, Jardín de mariposas, caja nido, plantilla Merendero | **nuevo** `src/game/obras.js` (carga a demanda); `construir.js` (un `G.emit('construirCambio')` al guardar y la pieza nueva); `residentes.js` (`invitar({ x, z })`: una pareja del hábitat va y vuelve); `fauna.js` (`nube(x, z)`); `diario.js` vía `G.diario.seccion`; `boot.js`; `en.js` | **nueva** `AV.obrasTest`: reconoce cada obra, quitar la pieza la apaga, la especie invitada es del hábitat, nunca una extinta, tope de visitas, guardado dañado = vacío | 3 días |
| **2 · Foto al Álbum** | «Mis rincones», estampas, «¡Con visita!» | `construir.js` (`foto()`), `obras.js`, guardado de fotos como en `familia_aventuras.js` | 6 fotos como tope, sin red, sin enlaces, cabe en 390×844 | 1,5 días |
| **3 · Rincón útil** | huerto que crece y se cosecha, farol que se enciende, sentarse, visitas de vecinos, plantilla Placita, perchas en tejados y torre | `obras.js`, `construir.js` (perchas con `G.fisica.addPercha`), `criadero.js` (solo se llama a `dar`), `atardecer.js` (lee la hora), `vecinos.js` (`visitar({ x, z })`) | cosecha suma XP una vez por maduración; posarse en la torre; el farol no pasa de 2 luces | 3 días |
| **4 · Puente y mirador** | vados, puente caminable, «Mirar» desde la torre, marca en el minimapa, «Volver a mi casa» | `obras.js`, `construir.js` (permitir la plantilla sobre el agua solo en un vado), `solidos.js`, `minimapa.js`, `pausa.js`; vados en `content/cap1/mundo.js` | cruzar a pie de orilla a orilla; fuera del vado no encaja; no toca el puente de la historia | 3–4 días |
| **5 · Encargos (opcional)** | un vecino pide algo («un banco junto al río»); al hacerlo, viene a usarlo y lo agradece. Dan dirección a quien no sabe qué construir | `obras.js`, `vecinos.js`, textos | 6 encargos, ninguno obligatorio | 2 días |

**Orden:** 0 → 1 → 2 son el corazón (lo que Kelvin pidió se nota ya en la fase 1). 3 y 4 se pueden intercambiar. La 5 solo si las anteriores gustan.

## 9. Teléfono e inglés

- **390×844:** la barra de arriba ya va llena. «Pintar» y «Plantillas» comparten un solo botón que abre una fila (como hoy las plantillas). El aviso de obra lista es un toast de 2 líneas; el Libro de visitas vive en el Diario, no en el HUD.
- **844×390:** la barra en una fila con desplazamiento lateral; la paleta, en vertical a la derecha, encima del botón Acción.
- Todo con teclado y botones de 44 px o más (F22).

| ES | EN |
|---|---|
| ¡Obra lista: {nombre}! | Build complete: {name}! |
| Comedero con visitas | Feeder with visitors |
| Caja nido | Nest box |
| Jardín de mariposas | Butterfly garden |
| Huerto · Cosechar | Garden patch · Harvest |
| Puente con atajo | Shortcut bridge |
| Mi casa · Volver a mi casa | My home · Back to my home |
| Libro de visitas | Guest book |
| Hoy vino: {ave} | Today's visitor: {bird} |
| Pintar | Paint |
| Guardar en Mis rincones | Save to My Corners |
| ¡Con visita! | With a visitor! |
| Aquí queda bonito. En un vado, además, sirve para cruzar | It looks nice here. At a ford it also lets you cross |

## 10. Para Kelvin (no bloquea las fases 0–2)

1. **Las 5 piezas nuevas y los 6 colores:** por foto, antes de encenderlos.
2. **Los vados del puente** (fase 4): son 2–3 puntos de la quebrada. No se toca el puente ni el taller de la historia (T49 sigue siendo su decisión).
3. **¿Las obras gastan algo?** Propuesta: no. Todo gratis desde el principio, como decidió el 9-nov; el Mercadito se queda como está.
4. **Pichón en la caja nido:** ¿solo se mira (propuesta), o se enlaza con el criadero? Lo segundo toca el canon de los huevos.
5. **Vecinos que visitan:** qué personajes pueden aparecer en el rincón del jugador.

## 11. Riesgos

| Riesgo | Cómo se evita |
|---|---|
| Rendimiento en el teléfono (T46) | visitas = mallas que ya existen (residentes: 2 llamadas de dibujo), tope de 2, nada si el rincón está a más de 130 m |
| Piezas sin altura (el puente) | los vados fijan la altura; no se añade un eje Y libre a todas las piezas |
| Que parezca «granja con relojes» | todo avanza con tiempo de juego, sin fechas, sin avisos de «vuelve», sin nada que se pierda |
| Pisar a quien lleva C9–C11 y C12 | `obras.js` es un archivo aparte; `construir.js` solo gana el evento, `c`, las perchas y las piezas nuevas |
