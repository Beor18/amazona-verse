# F2 · Cuatro minijuegos nuevos (diseño)

Claude web B (Fable) · 16-nov-2026 · **solo diseño; no hay código tocado.** Se implementan en N2, uno por uno.

**Criterio de selección.** Cada uno usa un verbo que hoy no existe en «Más juegos»:

| Ya existe (no se repite) | Verbo |
|---|---|
| Sigue el canto | memorizar |
| Escondite, Rescate | buscar / cargar |
| Banquete, Semillas al vuelo (D13) | recoger |
| Tormenta, Flight, Moon | esquivar |
| Carreras, Chispa, River Rush, Planeo entre nubes (D14) | llegar antes / más lejos |
| ¿Quién canta? (D15) | reconocer |

| Nuevo | Verbo | Dura | Esfuerzo |
|---|---|---|---|
| 1. ¡Sígueme, bandada! | guiar una fila | 2 min | M (2–3 días) |
| 2. Foto relámpago | encontrar y encuadrar | 2 min | M (2 días) |
| 3. Alas al compás | llevar el ritmo | 1–2 min | S (1–1,5 días) |
| 4. Sembradora del cielo | apuntar y soltar | 90 s | M (2 días) |

Orden recomendado para implementar: **3 → 1 → 2 → 4** (del más barato al que más piezas nuevas pide).

## Reglas comunes (las cuatro)

- Tarjeta en «Más juegos» (`menu_modos.js`: `MODOS`, `MAS`, `TX`, `index.html`), carga a demanda en `boot.js` (`aDemanda`), como `canto.js` y `semillas.js`.
- Panel final único: puntos, récord, «Otra vez» y «Salir» (≥ 54 px en táctil). Esc abre la Pausa. Fallar nunca castiga: «¡Casi!».
- Récord en el dispositivo: `<almacen>.<id>` = `{ v: 1, mejor, jugadas }`, y `G.emit('retosResultado', { modo })` para que `records.js` lo anote a nombre de la cotorra (igual que `flight` y `maze`). Sin cuentas ni rankings.
- Sin anillos, sin monedas, sin cajas, sin relojes de espera. El premio es el récord y, si acaso, una estampa en «Mis récords» (E19).
- «Reducir movimiento»: sin sacudidas ni FOV; los avisos importantes también suenan.
- Prueba propia `AV.<id>Test()` con: abre desde la tarjeta, se puede ganar un punto con teclado y con táctil, «Otra vez» reinicia limpio, «Salir» vuelve a la portada sin pausa colgada, cabe en 390×844 y 844×390, y no queda texto en español con el idioma en inglés.
- Presupuesto: como mucho 4 mallas instanciadas nuevas por juego, sin modelos ni texturas nuevas, sin descargas.

---

## 1. ¡Sígueme, bandada! · *Follow Me, Flock!*

**La regla en una frase:** vuela cerca de las cotorras sueltas para que se pongan en fila detrás de ti y llévalas al dormidero sin que la fila se rompa.

**Bucle de 30 s.** Ves una cotorra posada con un «¿?» encima → pasas a menos de 6 m → se une a la cola con un silbido que sube de tono → la fila te sigue con retraso, calcando tu trayectoria → un giro brusco o rozar una copa suelta a las últimas (se quedan dando vueltas y se pueden recuperar) → pasas por el dormidero (un árbol grande con brillo) y «entregas» la fila: puntos = cotorras × multiplicador de la fila.

**Decisión divertida:** entregar ya (seguro) o ir por dos más (la fila larga puntúa mucho más, pero se rompe fácil).

**Dificultad que sube.**
- 0–40 s: cotorras cerca y en campo abierto.
- 40–80 s: aparecen entre árboles y sobre el río; la fila larga obliga a girar ancho.
- 80–120 s: ráfagas de viento avisadas con hojas (empujan la cola) y cotorras «dormilonas» que hay que rodear una vez para despertarlas.
- Multiplicador: ×1 (1–3), ×2 (4–6), ×3 (7–9), ×4 (10 o más).

**Récord:** puntos en 2 minutos y «fila más larga». Medallas: bronce 30, plata 70, oro 120 (ajustar jugando).

**Teléfono.**
- 390×844: joystick abajo a la izquierda y los botones de vuelo de siempre; no hay botón nuevo. Arriba, una sola franja: reloj · puntos · fila (iconos de cotorra, máx. 10 y «+N»). La cámara se aleja un poco cuando la fila pasa de 6 para que se vea entera.
- 844×390: la misma franja pegada arriba al centro; el dormidero se marca con la flecha de guía que ya existe.

**Textos (ES → EN).**
| ES | EN |
|---|---|
| ¡Sígueme, bandada! | Follow Me, Flock! |
| Junta cotorras y llévalas al dormidero | Gather parrots and lead them to the roost |
| ¡Se unió! | Joined! |
| ¡Fila de {n}! | Line of {n}! |
| Giro muy cerrado: se soltaron {n} | Too sharp a turn: {n} let go |
| Llévalas al árbol que brilla | Lead them to the glowing tree |
| ¡Bandada a salvo! +{p} | Flock safe! +{p} |
| Fila más larga: {n} | Longest line: {n} |

**Reutiliza:** `bandada.js` (malla instanciada de cotorra con aleteo en el shader, pieles de las especies), `fx.guide` (flecha), `juice.js` (estela), `clima.js` (hojas de las ráfagas), `records.js`, el panel de `semillas.js`.
**Nuevo:** `src/game/sigueme.js` (~350 líneas): cola de posiciones de Vittata (buffer circular; cada seguidora lee la posición de hace *k* cuadros), rotura por curvatura y por colisión con `G.fisica.colliders`.
**Naturaleza:** no afirma ningún dato. Las pieles son las del Álbum; ver una de cerca puede llamar a `album.ver()` como ya hace la bandada.
**Riesgo:** rendimiento en «bajo» → tope de 10 seguidoras visibles (el resto cuenta como «+N»).

---

## 2. Foto relámpago · *Snap Safari*

**La regla en una frase:** te sale la tarjeta de un animal del Diario; encuéntralo y sácale una foto bien encuadrada antes de que se acabe su tiempo.

**Bucle de 30 s.** Tarjeta «Busca: mariposa cebra» con su silueta y una pista de lugar («cerca de la plaza») → vuelas o caminas hasta allí → entras en modo cámara (botón grande) → el visor muestra un marco; cuanto más centrado, más cerca y más quieta estés, más estrellas (1–3) → *clic*, la foto aparece como estampa y sale la siguiente tarjeta, en otra zona.

**Decisión divertida:** foto rápida de 1 estrella o acercarte despacio por las 3 (el lagartijo se esconde si llegas deprisa: ya lo hace `fauna.js`).

**Dificultad que sube.**
- Tarjetas 1–2: animales grandes y quietos cerca del punto de salida.
- Tarjetas 3–5: animales que reaccionan (lagartijo que se esconde, mariposas que se dispersan, peces que solo se ven volando bajo).
- Tarjeta 6 en adelante: «foto con condición» (en vuelo, posada, con dos animales en el marco).
- Cada tarjeta da 25 s; acertar suma 10 s al reloj general (2 min de base).

**Récord:** estrellas en una partida, y «rollo perfecto» (todas de 3). Las fotos **no se guardan** (solo la estampa del animal): cero almacenamiento y cero privacidad que cuidar.

**Teléfono.**
- 390×844: la tarjeta-objetivo es una píldora arriba (icono + nombre, 2 líneas como mucho). El botón Acción pasa a ser «Foto» (cámara); en modo cámara el joystick encuadra y el botón dispara. El marco ocupa el centro; las estrellas se encienden en vivo.
- 844×390: píldora arriba a la izquierda, marco al centro, «Foto» abajo a la derecha (pulgar).

**Textos (ES → EN).**
| ES | EN |
|---|---|
| Foto relámpago | Snap Safari |
| Encuentra al animal y sácale su mejor foto | Find the animal and take its best photo |
| Busca: {animal} | Find: {animal} |
| Pista: {lugar} | Hint: {place} |
| Acércate despacio… | Get closer, slowly… |
| ¡Fotaza! | Great shot! |
| Buena foto | Nice photo |
| Salió movida | A bit blurry |
| Rollo perfecto | Perfect roll |

**Reutiliza:** `fauna.js` (lagartijo, mariposa cebra, coquí, boa), `rio_vivo.js` (sirajo, dajao, guabina), `invasoras.js` (ya detecta «Foto» con `G.emit('foto')` a 1,5 radios), `residentes.js` (cotorras), el flash y el marco de `invasoras.js`, `content/cap1/fauna.js` para nombres en ES/EN.
**Nuevo:** `src/game/foto_safari.js` (~300 líneas): baraja de objetivos, medida del encuadre (proyección del animal a pantalla: distancia al centro, tamaño y velocidad de Vittata), una función pequeña en cada módulo de animales que devuelva «dónde hay uno ahora» (`fauna.cerca(id)`, etc.; hoy esas posiciones son internas).
**Naturaleza y fuentes:** solo animales que **ya tienen ficha con fuente** en el juego (USGS NAS, DRNA, USFWS; ver `docs/equipo/FUENTES_CAP1.md` y `content/cap1/invasoras.js`). El minijuego no añade ningún dato: al acertar muestra el nombre y, la primera vez, abre la ficha que ya existe. El coquí solo entra en la baraja si hay neblina o llovizna (así lo muestra `fauna.js`).
**Riesgo:** depender de que el animal esté cargado (streaming). Solución: la baraja solo saca objetivos de la zona ya cargada alrededor del punto de salida.

---

## 3. Alas al compás · *Wings on the Beat*

**La regla en una frase:** aletea justo cuando suena el tambor para subir; cada golpe a tiempo te eleva y cada racha te lleva a una capa más alta del bosque.

**Bucle de 30 s.** Suena un patrón de tambor de 4 tiempos y se ve venir como hojas que bajan hacia una línea → tocas a tiempo → Vittata da un aletazo y sube un tramo (perfecto = tramo doble y estela) → 8 seguidos = «¡Racha!», cambia el paisaje de fondo (sotobosque → copas → nubes → cielo abierto) y entra un instrumento más → un fallo no te hace caer: planeas y pierdes solo la racha.

**Decisión divertida:** hay golpes «dobles» opcionales entre tiempos; ir por ellos sube más, pero arriesga la racha.

**Dificultad que sube.**
- Capa 1: negras a 90 pulsos por minuto.
- Capa 2: 105 y aparecen silencios (no tocar también es acertar).
- Capa 3: 120 con contratiempos.
- Capa 4: 132 y patrones de 2 compases; sin tope: se repite subiendo 4 pulsos cada vuelta.
- Ventana de acierto generosa (±120 ms perfecto, ±220 ms bien) y calibración automática en los 4 primeros golpes (mide el retraso del toque del niño y lo compensa).

**Récord:** altura alcanzada en metros (cifra de juego, sin pretensión de dato real) y racha más larga.

**Teléfono.**
- 390×844: se juega con **un dedo, en cualquier parte de la pantalla**. Vittata a la izquierda del centro, la línea de golpe debajo de ella, las hojas llegan desde la derecha. Arriba: altura y racha. Es el más cómodo de los cuatro en vertical.
- 844×390: igual, con más carril visible. Teclado: Espacio, flecha arriba o cualquier letra.

**Textos (ES → EN).**
| ES | EN |
|---|---|
| Alas al compás | Wings on the Beat |
| Aletea con el tambor y sube al cielo | Flap with the drum and climb to the sky |
| ¡Perfecto! | Perfect! |
| ¡Bien! | Good! |
| ¡Casi! | Almost! |
| ¡Racha de {n}! | {n} in a row! |
| Llegaste a las copas | You reached the treetops |
| Sobre las nubes | Above the clouds |
| Altura: {m} m | Height: {m} m |

**Reutiliza:** `canto.js` casi entero (panel, pausa del mundo `G.pausa`, sonidos sintetizados con `G.audio.define`, récord), `flight.js` (cámara lateral con Vittata fija y fondo que se mueve), `juice.js` (estela), fondos del kit que ya usa Flight.
**Nuevo:** `src/game/compas.js` (~250 líneas). **El reloj es el del audio** (`AudioContext.currentTime`), no el de los cuadros: así no se desincroniza a 20 FPS.
**Naturaleza:** ninguna afirmación. **Para Kelvin:** el tambor es sintetizado y sin género declarado; si quiere que sea un ritmo puertorriqueño concreto o una pista de Suno, lo decide él (música = su decisión).
**Riesgo:** latencia de audio en Android. La calibración inicial y la ventana ancha lo cubren; si no hay audio, las hojas siguen marcando el tiempo.

---

## 4. Sembradora del cielo · *Sky Planter*

**La regla en una frase:** vuela sobre los claros y suelta cada semilla en el momento justo para que caiga en la tierra blanda y brote un árbol.

**Bucle de 30 s.** Llevas 5 semillas → ves un claro con un parche de tierra oscura → la sombra de «dónde caería» va delante de ti sobre el suelo → sueltas (Acción) cuando la sombra pisa el parche → la semilla cae en arco, *plop*, y el árbol brota en 1 s con hojas volando → centro del parche = brote grande y +3; borde = +1; fuera = rebota y se pierde → sin semillas, pasas por el saco (junto a la salida) y recargas.

**Decisión divertida:** bajar y frenar para apuntar fácil, o pasar rápido y alto encadenando parches (racha ×2, ×3).

**Dificultad que sube.**
- 0–30 s: parches grandes y sin viento.
- 30–60 s: parches medianos y viento lateral (la sombra se desplaza: lo que ves es lo que pasa, no hay que calcular).
- 60–90 s: parches pequeños en ladera y parches que «se secan» (se achican en 8 s).
- La velocidad de vuelo multiplica: soltar a más de 8 m/s da +1.

**Récord:** árboles sembrados y mejor racha en 90 s. Al final, la cámara sube y enseña el claro reverdecido (el momento «lo hice yo»); los árboles del minijuego se van al salir (no cambian el mapa ni el canon).

**Teléfono.**
- 390×844: vuelo normal; el botón Acción dice «Soltar». Arriba: reloj · árboles · semillas (5 puntos). La sombra-diana lleva un borde claro para verse sobre la hierba.
- 844×390: lo mismo; es donde mejor se ve venir el siguiente parche.

**Textos (ES → EN).**
| ES | EN |
|---|---|
| Sembradora del cielo | Sky Planter |
| Suelta semillas desde el aire y reverdece el claro | Drop seeds from the air and green the clearing |
| Soltar | Drop |
| ¡En el centro! | Bullseye! |
| ¡Brotó! | It sprouted! |
| Rebotó fuera | Bounced away |
| Sin semillas: vuelve al saco | Out of seeds: back to the sack |
| ¡Racha ×{n}! | Streak ×{n}! |
| Sembraste {n} árboles | You planted {n} trees |

**Reutiliza:** el arco y la sombra de caída de `semillas.js` (D13) al revés, las ráfagas de `clima.js`, `G.fx.burst` (hojas), `vegetacion.js` o una malla instanciada propia de 3 tamaños de brote, un claro que ya existe en el mapa (por ejemplo el de las mariposas de `fauna.js`).
**Nuevo:** `src/game/sembradora.js` (~320 líneas): proyección balística simple (posición + velocidad de Vittata + viento) pintada cada cuadro como sombra; parches como una malla instanciada.
**Naturaleza y fuentes:**
- El juego **no dice** que las cotorras siembren o dispersen semillas: no hay fuente verificada en el repo para eso, así que no se afirma. Es fantasía de juego («Vittata ayuda a reverdecer»).
- Los árboles se llaman como ya se llaman en el juego: palma de sierra y tabonuco (`banquete.js`).
- Dato opcional, una sola vez, ya verificado: la cotorra puertorriqueña «se alimenta sobre todo de frutos silvestres, en especial de la palma de sierra» · USFWS, ficha de *Amazona vittata*, fws.gov/species/puerto-rican-amazon-amazona-vittata (`docs/equipo/DATOS_VERIFICADOS.md`).
**Riesgo:** leer la profundidad en el teléfono. La sombra-diana siempre en el suelo y una línea fina de Vittata a la sombra lo resuelven.

---

## Qué necesita cada uno fuera de su archivo

| Archivo | Cambio (igual para los cuatro) |
|---|---|
| `src/boot.js` | una línea `aDemanda` + `AV.<id>` y `AV.<id>Test` |
| `index.html` | una tarjeta `data-modo` con su dibujo SVG |
| `src/game/menu_modos.js` | `MODOS`, `MAS`, `TX`, `SALIR_EN`/`elegir`/`volver`, y el CSS de «Más juegos» (hoy lista los juegos uno por uno: conviene cambiarlo a un atributo `data-mas` para no tocarlo cada vez) |
| `src/game/records.js` | lectura de `<almacen>.<id>` y tarjeta en «Mis récords» |
| `content/cap1/en.js` | los textos de las tablas de arriba |
| `tools/build/test.sh` | la batería nueva en `--extra` |

**Para Kelvin (no bloquea):** los cuatro nombres; si el tambor lleva un ritmo o pista concretos; medallas definitivas tras jugarlos.

**Reserva (si alguno no convence jugando):** «La chiringa»: Vittata remolca una chiringa y hay que mantenerla en la franja de viento; un dedo, 60 s.
