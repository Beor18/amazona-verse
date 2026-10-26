# Banda sonora de Amazona Verse (C13)

Cinco temas originales de Kelvin, hechos con Suno. Suenan en el juego en lugar de la música sintética donde el tema encaja; la sintética de `src/game/musica.js` se queda como alternativa (si un tema falta, no carga o el navegador no lo deja sonar) y para la portada, el creador y el final del capítulo.

## Licencia y origen

Temas creados por Kelvin García con Suno en plan pagado (Pro/Premier), 26-oct-2026; uso comercial según los términos de Suno para planes de pago. Los MP3 originales (48 kHz, ~185–198 kb/s) se quedan en la computadora de Kelvin (`~/Downloads/soundtrack/`); en el repo solo van las copias recodificadas. El id de cada pista sale del comentario del MP3 (`mdls -name kMDItemComment`):

| Archivo en el repo | Tema (archivo original) | Id de Suno | Creado (UTC) | Duración |
|---|---|---|---|---|
| `assets/audio/musica/exploracion.m4a` | El Yunque Awakens — Exploración y aventura | `4fffdf55-e4a8-455d-a72b-6550f23d4d01` | 2026-10-26 14:23 | 177,2 s |
| `assets/audio/musica/carrera.m4a` | yunque («Carrera sobre El Yunque», la que Kelvin ya probó y aprobó) | `db2eea9a-62fb-4e31-87e7-e1709dc02d81` | 2026-10-26 13:57 | 167,2 s |
| `assets/audio/musica/criadero.m4a` | The Golden Hatch — El huevo legendario | `52806a31-1a8f-4273-a59c-b0e2ba201d20` | 2026-10-26 14:29 | 167,2 s |
| `assets/audio/musica/tormenta.m4a` | Guardians of Borikén — Desafíos y jefes | `bafc1974-807e-4cb2-be77-1059d29cd9db` | 2026-10-26 14:32 | 162,2 s |
| `assets/audio/musica/arena.m4a` | El Yunque battle | `11024525-5f0e-4386-9e36-ff1df7376445` | 2026-10-26 14:27 | 153,6 s |

## Asignación

| Momento del juego | Pista |
|---|---|
| Mundo libre: Modo Aventura, Vuelo libre, descubrir zonas, ríos, montañas y ruinas | **exploracion** |
| Lluvia del clima (no es peligro) | **exploracion** (antes: tensión sintética) |
| Modo Retos: su menú, carrera contra las cotorras, contrarreloj del río (y su fantasma), «¡Banquete!» | **carrera** |
| Criadero abierto (huevos, cuidado, colección, rarezas; también «Mi nido» encima de la portada) | **criadero** |
| Eclosión de un huevo | **criadero** a 0,35 de volumen; el efecto de la eclosión suena aparte (SFX `eclosion_huevo`) |
| «¡Escapa de la tormenta!» de Retos | **tormenta** |
| La crecida del capítulo 1 (20 s: el río sube y arrastra cosas que se pueden salvar) | **tormenta**: es peligro ambiental y un desafío fuerte de la historia. Al acabar, vuelve la exploración tras 5 s de calma |
| Amazona Arena | **arena**: solo registrada (pista futura). No hay modo Arena: nada la pide y la build no publica el archivo |
| Portada («¿Cómo quieres jugar?») y creador | sintética **alegre** (sin tema asignado; queda para Kelvin) |
| Panel de fin de capítulo y el cómic tras él | sintética **final** |

Prioridad cuando coinciden: final > criadero > portada o creador > arena > Retos > crecida > lluvia > mundo.

## Cómo suena (reglas)

- **Una pista a la vez.** Al cambiar de momento, fundido cruzado de 1,5 s (`fundido`). Si se cambia varias veces seguidas, las que salen se apuran en ~0,3 s: nunca hay dos temas completos sonando.
- **Sin reinicios por cambios pequeños.** Cambiar de momento sin cambiar de pista no toca nada: menú de Retos → carrera, resultados, **«Otra vez»** (la carrera sigue sonando: decisión, para no oír la intro cada 90 s), carrera → río, elegir otro huevo, la eclosión.
- **Volver a un tema** antes de 120 s (`recordar`) sigue donde iba (p. ej. exploración → criadero → exploración); más tarde, empieza desde el principio.
- **Al salir de un modo** su tema baja con el fundido, se para y suelta el archivo; vuelve el de exploración (o el que toque).
- **Volumen del jugador:** el deslizador «Música» de la pausa y «Sonido: no» valen igual que antes (los temas cuelgan del mismo bus). Con el sonido apagado, la música a 0, la pestaña oculta o la calidad «bajo», el `<audio>` se pausa (no baja datos ni gasta CPU). Los efectos van por su bus, aparte.
- **Ducking:** baja a 0,45 mientras habla la voz del Aula (el mismo gancho `voz` de antes) y a 0,35 durante la eclosión; baja en ~0,3 s y vuelve en ~1 s.
- **Autoplay:** nada suena antes del primer gesto (el módulo se carga con `alPrimerGesto`). Si el navegador no deja sonar el `<audio>` sin gesto (iOS), suena la alternativa sintética y el siguiente toque lo vuelve a intentar dentro del gesto.
- **Si un tema no carga** (error o más de 4 s, `esperaCarga`), suena su alternativa sintética y el juego sigue; si el tema termina de cargar después, entra con su fundido. Un tema que dio error no se vuelve a pedir en esa sesión.

## Peso y carga

- AAC-LC estéreo **96 kb/s** CBR, 48 kHz, con el índice (`moov`) al principio para empezar a sonar sin bajar todo: exploracion 2,16 MB · carrera 2,05 MB · criadero 2,04 MB · tormenta 1,98 MB · arena 1,88 MB (10,1 MB en el repo).
- La build publica los 4 en uso (**8,24 MB**); Arena no se publica hasta que exista su modo. El sitio pasa de 51,6 a 59,5 MB (límite de la build: 64 MB).
- **No entran en la descarga inicial:** se piden por streaming (`<audio preload=auto>` + `MediaElementSource`) solo cuando toca y solo el que toca (si cambias de momento antes de que cargue, la petición se suelta). Sin gesto no se pide ninguno (lo comprueba `musicaTest`).

**Medidas (26-oct, build de prueba, Chrome con móvil emulado 375×812, táctil, modo de música «ligero»):** vuelo libre → carrera → «Otra vez» → criadero → exploración. Cada tema bajó una vez (2,1 / 2,0 / 2,0 MB) y empezó a sonar en menos de 2 s; nunca más de 2 `<audio>` vivos (1 sonando + 1 saliendo durante el fundido); heap de JS 39,5 → 40,7 MB; 0 tareas largas (>50 ms) y el reloj del hilo principal con ≤ 3 ms de retraso durante los cambios; 0 errores de consola. Con «Sonido: no» la posición se queda quieta (pausado) y al volver sigue. La descarga inicial medida por `test.sh` no cambia (9,31 MB en 166 archivos, igual que la build sin C13: la subida de 8,18 a 9,31 MB viene del atlas de edificios de G6, ya pedida en `PEDIDOS.md`).

## Puntos de bucle

Los temas tienen intro y final, así que el bucle no va de punta a punta: cuando el tema llega a `bucle[1]` entra otra copia del mismo tema en `bucle[0]` con un fundido de igual potencia de 2,5 s (`fundidoBucle`) centrado en la costura; 12 s antes se precarga. La primera vuelta suena completa desde la intro; el final del tema no se oye en bucle.

Los puntos se eligieron por similitud de croma y bandas en ventanas de 8 s (`tools/audio/banda_sonora.sh` lo imprime) y se afinaron a mano: nivel parecido a ambos lados de la costura y pulso alineado.

| Pista | bucle[0] → bucle[1] | Vuelta | Nota |
|---|---|---|---|
| exploracion | 59,81 → 152,93 s | 93 s | nivel 0,14 / 0,12 a cada lado |
| carrera | 59,66 → 138,62 s | 79 s | pulso alineado (correlación 0,50) |
| criadero | 23,80 → 135,93 s | 112 s | |
| tormenta | 59,65 → 133,07 s | 73 s | el reto dura 90 s: casi nunca llega a la costura |
| arena | 59,27 → 128,38 s | 69 s | para cuando exista el modo |

## Cómo cambiar la tabla

Todo está en `BANDA_SONORA`, arriba de `src/game/musica.js`:
- `momentos`: qué pista suena en cada momento. Puede ser un tema (`exploracion`, `carrera`, `criadero`, `tormenta`, `arena`) o una sintética (`alegre`, `explora`, `retos`, `tension`, `final`). Por ejemplo, para que la portada suene con el tema de exploración: `portada: 'exploracion'`.
- `pistas.<id>`: `archivo`, `titulo`, `dur`, `bucle`, `nivel` (para que suene como las demás; `banda_sonora.sh` lo sugiere) y `alternativa`.
- `fundido`, `fundidoBucle`, `esperaCarga`, `recordar`, `eclosion`.
- **Amazona Arena:** el día que exista el modo, ponle a `pistas.arena` su `archivo` (la ruta completa, como los demás), quita `futura` y haz que el modo ponga la clase `arena-on` en `<body>` (o cambia `leerEntradas`).
- Tema nuevo: recodifícalo con `tools/audio/banda_sonora.sh` (añádelo a su lista), mira su nivel y sus bucles y añade la fila.

Para oír un momento a mano: `AV.G.musicaApi.simular({ retos: true, reto: 'tormenta' })` (y `simular(null)` para volver). `AV.G.musicaApi.estado().banda` dice qué suena, qué carga, cuántos `<audio>` hay vivos y los fallos.

## Pruebas

`AV.musicaTest()` (sección 10): tabla completa; los 4 `.m4a` abren en el navegador y su duración cuadra; ninguno se pide sin gesto; y el reproductor con un contexto y un `<audio>` de mentira: carga perezosa, una sola pista subiendo, duración del fundido, «Otra vez» sin reinicio, la que sale se para y suelta el archivo, volver sigue donde iba, silencio, bucle, cambios rápidos, alternativa por error, por tiempo y por autoplay bloqueado. Más los momentos (qué reto, criadero, eclosión) y el ducking de la eclosión.

## Para que Kelvin lo valide (escuchar)

1. **Exploración:** entrar en Aventura o Vuelo libre y volar ~2 min 35 s seguidos: en el segundo 152,9 está la costura del bucle (vuelve al 59,8). ¿Se nota?
2. **Carrera:** Retos → carrera contra las cotorras; terminarla y pulsar «Otra vez»: la música no debe cortarse ni empezar de nuevo. Costura en 138,6 s.
3. **Criadero:** abrir el criadero, cambiar de huevo varias veces (no se reinicia) y ver una eclosión: la música baja y el «pop» del huevo se oye encima.
4. **Tormenta:** «¡Escapa de la tormenta!» completo (90 s) y salir: la tormenta se funde y vuelve la exploración.
5. **Crecida (cap. 1):** al colocar el refugio empieza la crecida con el tema de la tormenta; ¿encaja ahí o prefieres la exploración?
6. **Cambio rápido:** abrir y cerrar el criadero varias veces seguidas: nunca deben oírse dos temas a la vez.
