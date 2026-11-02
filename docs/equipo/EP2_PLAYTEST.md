# Episodio 2 «Un lugar para todos»: playtest automático de punta a punta (AD1, 26-oct-2026)

**Cómo se mide.** `tests/qa/ep2_e2e.js` (`AV.ep2e2eTest`) abre `index.html?pack=ep2` como un jugador nuevo y juega todo el episodio: portada, creador y escena de inicio. Luego sigue la flecha de la guía caminando con las teclas de verdad (W y Mayús), pulsa Acción ante lo que la guía señala, pasa cada línea con Acción y pulsa los botones reales de las tarjetas, hasta la fiesta, la pantalla final, «Seguir explorando» e «Iguaca te pregunta».

Se equivoca a propósito una vez donde un niño suele equivocarse: una pregunta cerrada, una tarjeta mal ordenada, elegir solo a la abuela, el nido abajo, arreglar otra parte y «Ahora no» a las preguntas.

Corre en español y en inglés. En inglés apunta todo texto que siga en español en pantalla en cada línea, tarjeta, aviso y objetivo, y comprueba aparte todos los textos fijos del pack (también las ramas que no salen en una partida).

- **Dónde corre:** en `tools/build/test.sh --extra`, que la inyecta desde `config.json`.
- **Capturas:** `tests/qa/ep2_capturas.py` juega lo mismo en una pestaña visible y las saca (escritorio, móvil a 375×812 e inglés).
- **Duración:** el modelo es el de la E2E del capítulo 1 y da cotas inferiores; no sustituye medir con niños.
  - **Mínimo:** segundos de juego + (líneas + clics) × 0,8 s.
  - **Leyendo:** segundos de juego + caracteres de líneas y tarjetas / 15 por segundo + 1 s por clic.

## Resultado
- **Se juega de principio a fin sin atascos**, en ES y en EN, con 0 errores de consola: 34/34 comprobaciones en ES y 37/37 en EN.
- **Duración de la historia** (sin el extra):
  - **1,8 min** solo pulsando y **9,2 min** leyendo (9,3 en inglés);
  - 33 s de juego caminando, 146 m;
  - 58 líneas de diálogo, 33 clics y 6 errores a propósito.
- **Extra después del final:** «Iguaca te pregunta» suma unos **4 min** leyendo (21 clics).
- **Lo que pesa:** caminar es casi nada; el episodio es diálogo y tarjetas.
  - Los pasos más largos son preguntar a los residentes (141 s leyendo) y ordenar las tarjetas (147 s; antes de AD1, 178).
  - La guía del aula reserva 25 min de juego (`modo_maestro.guia_45_min.durante`), así que el episodio se queda corto.

| Paso | Juego (s) | Metros | Usos | Líneas | Caracteres | Clics | Errores | Leyendo (s) |
|---|---|---|---|---|---|---|---|---|
| 0 · Portada, creador e inicio | 1,6 | 0 | 0 | 2 | 84 | 2 | 0 | 9 |
| 1 · Habla con Iguaca | 1,4 | 3 | 1 | 2 | 180 | 0 | 0 | 13 |
| 2 · Lee la tierra: observa los 3 sitios y elige uno | 9,5 | 59 | 4 | 5 | 344 | 0 | 0 | 32 |
| 3 · Cuéntale a Iguaca lo que elegiste | 2,8 | 17 | 1 | 5 | 374 | 0 | 0 | 28 |
| 4 · Enséñale tu plano a la abuela | 2,3 | 12 | 1 | 5 | 233 | 0 | 0 | 18 |
| 5 · Pregunta a la abuela y al papá qué necesitan | 5 | 22 | 2 | 16 | 1916 | 8 | 1 | 141 |
| 6 · Ordena las tarjetas en la mesa | 3,2 | 15 | 1 | 7 | 1980 | 12 | 2 | 147 |
| 7 · Dibuja y construye la casa en tu sitio | 2,8 | 18 | 1 | 1 | 567 | 5 | 0 | 46 |
| 8 · Arma el nido del papá | 1,2 | 0 | 1 | 3 | 473 | 4 | 1 | 37 |
| 9 · Prueba la casa: espera la tormenta | 1 | 0 | 1 | 3 | 205 | 0 | 0 | 15 |
| 10 · Cambia solo lo que falló | 1,1 | 0 | 1 | 3 | 538 | 2 | 1 | 39 |
| 11 · Prueba otra vez | 1,1 | 0 | 1 | 6 | 372 | 0 | 0 | 26 |
| Extra · Seguir explorando e «Iguaca te pregunta» | 4,5 | 17 | 2 | 2 | 3090 | 21 | 1 | 232 |

**Baterías** (build `ad1-5499804`, `test.sh --extra`):
- Las 13 obligatorias pasan, salvo `maestroTest`, que dio 25/26 («Preparando el archivo…», la Mac iba cargada); corrida sola en la misma build, 26/26.
- `ep2Test` (selfTest del pack) da 59/59.
- `ep2e2eTest` dio 69/71: la escena de inicio llegó tarde bajo carga y la espera pasó de 4 a 20 s.

## Arreglado en AD1 (`content/ep2/*`)
1. **Inglés completo.**
   - El ep. 2 se abría en inglés y el diccionario no llegaba a cargar: `pack.idioma` pedía `content/ep2/en.js`, que no existía, y la carga se rechazaba.
   - Ahora `content/ep2/en.js` tiene todo lo que el jugador lee, también las ramas que no salen en cada partida: otros sitios, la torre, la piedra, el trenzado y las fallas de cada sitio.
   - También entran los chips del HUD («· Pendiente, suelo y viento»), el botón «Cuaderno 0/6», los avisos «Acción: …» y los verbos del botón de Acción.
   - `src/game/idioma.js` acepta una lista en `pack.idioma` y la carga en orden: primero el diccionario de cap1 y luego el del episodio. Va en un commit aparte de 2 líneas.
2. **La guía ya no empuja hacia un sitio.** Con los 3 sitios leídos, la flecha iba siempre a «el llano» (el primero de la lista): el jugador estaba en el claro con «Elegir el claro» en pantalla y la flecha lo mandaba al otro lado. Ahora señala el sitio más cercano.
3. **Se dice cómo elegir.** Al observar el tercer sitio, Vittata añade: «Ya miré los tres sitios. Ahora elijo uno: voy al que me convenza y pulso Acción».
4. **La mesa repetía la misma definición 9 veces.** La definición completa sale en las 2 primeras tarjetas; luego, «¿Criterio o restricción?».
5. **«Le pregunto a el papá…»** pasa a «Le pregunto al papá…».
6. **Heredado de la otra sesión de la API**, que paró al ver la tarea duplicada y lo dejó sin commit; revisado y conservado:
   - Las notas `[KELVIN]` salen del texto que lee el jugador y van al campo `nota` de la escena o a un comentario.
   - Las frases de los sitios concuerdan («pendiente empinada; …; mucho viento»).
   - Si falla el techo, valen las dos opciones que dicen «techo». Antes, «Reforzar el techo: más amarras» se rechazaba con el techo sin amarrar.

## Lo prioritario para AD2 (de más a menos importante)
1. **La tormenta no se ve.**
   - La lluvia de `G.fx.rain` apenas se distingue, el cielo sigue soleado y no hay viento.
   - El techo que «falla» se levanta tan cerca de la cámara que tapa media pantalla con un plano rosado (`ad1_ep2_tormenta.jpg`).
   - Es el momento central del episodio: hace falta oscurecer, meter viento y encuadrar la casa entera durante la prueba.
2. **Construir es solo elegir en tarjetas.**
   - La casa (cajas) aparece de golpe y la cámara no la encuadra mientras cambia.
   - Hay que encuadrar la obra en cada decisión y hacer que algo se monte a la vista: pilotes, paredes, techo y nido.
3. **Mucho texto en las tarjetas.** Preguntar (1.900 caracteres) y la mesa (2.000) son los pasos más largos. Conviene acortar las respuestas o poner un icono por tarjeta (criterio, restricción).
4. **Corto para el aula.** Unos 9 min leyendo frente a 25 min de juego en la guía. Los 6 hallazgos del Cuaderno son opcionales y la prueba no los recorre; podrían entrar en el camino o tener una pista visible.
5. **Interrupción del criadero.**
   - Justo después de elegir sitio, camino de Iguaca, salta «¡Vittata, mira! Aquí cerca hay un nido con una cápsula…».
   - Corta el hilo «cuéntale a Iguaca»: mejor tras cerrar la M1 con Iguaca o al terminar la M2.
   - Es de `src/game/criadero.js` con `criadero.desde`, no de `content/ep2`.
6. **El episodio 2 no se abre desde el menú.** La portada solo enlaza al Capítulo 1 y al Episodio 3 (`index.html`, `title-episodios`).
7. **Canon `[KELVIN]`:**
   - el Papá usa el retrato de Vittata y la Abuela el de *agilis*;
   - quiénes son, si el Guardián habla en el plano y si hay huevo en la fiesta (EP2_GDD.md §10).

## Inglés: lo que queda fuera del episodio (motor; para G11)
- «Gestos» (botón del HUD en `index.html`) y «Nido» (botón del criadero) no están en `content/cap1/en.js`.
- «Flor de El Yunque» (criadero) sale a medias como «Flor of El Yunque», y `idiomaTest` del cap. 1 marca el aviso del nido del criadero («¡Vittata, mira! En la Station de Conservación…»).
- «Objetivo N de M» sale de CSS (`#steps li.now::after` en `ui.css`) y el observador de `idioma.js` no lo puede traducir.
- La pista «Pulsa <kbd>Espacio</kbd> para volar» va en 3 nodos de texto: «Pulsa {} para volar» existe, pero no casa con los trozos.

## Capturas
- **Escritorio, español** (`docs/img/ad1_ep2_*.jpg`): `portada`, `creador`, `inicio`, `iguaca`, `sitios`, `eleccion`, `plano`, `preguntas`, `mesa`, `construir`, `nido`, `tormenta`, `mejora`, `fiesta` y `fin`.
- **Móvil a 375×812** (`*_movil.jpg`): inicio, sitios, preguntas, mesa, construir, tormenta y fin.
- **Inglés** (`*_en.jpg`): inicio, sitios, mesa, mejora y fin.
- **Para repetirlas:** `<python3.11> -I tests/qa/ep2_capturas.py [--movil] [--idioma en] [--momentos …]`.
