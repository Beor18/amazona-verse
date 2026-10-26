# Minijuegos: auditoría de lo reutilizable, Amazona Flight y expansiones (C14)

Directiva maestra de Kelvin, 26-oct-2026: «expansión de minijuegos con reutilización de recursos existentes». Fase 1 (esta auditoría) y
fase 2 (prototipo de **Amazona Flight**, `src/game/flight.js`, oculto en `?mini=flight`). Amazona Maze y River Rush solo se documentan
(§5). La fase 3 (pruebas reales, menú, Retos) la deciden Kelvin y Fernando. Reutiliza `ARQUITECTURA.md`, `MOVIMIENTO.md`,
`ENTORNO_KIT.md`, `EDIFICIOS.md`, `UI_SYSTEM.md`, `BANDA_SONORA.md` y el encabezado de cada módulo; no es una re-auditoría del repo.

## 1. Qué hay y cómo se reutiliza

Leyenda: **tal cual** = se usa sin tocar el archivo; **adaptar** = hace falta una envoltura o un gancho pequeño (sin cambiar el módulo
para el resto del juego); **falta** = lo mínimo que no existe.

| Recurso | Dónde | Para un minijuego | Notas |
|---|---|---|---|
| Vittata: modelo, rig, caras, proporciones | `src/personaje/character.js`, `assets/models/vittata.glb` | **tal cual** | No se toca (regla de Kelvin). `actores.js` anima con lo que lee cada cuadro: `S.pos`, `S.vy`, `S.facing`, `MOVE.flying/speed/vx/vz/fase/grounded`. Un minijuego solo escribe eso. |
| Animaciones: aleteo, planeo, despegue, aterrizaje, cernido | `character.js` (`ANIM.wings`: fly, flap, hover, takeoff, glide, land), `actores.js` (`wingMode`) | **tal cual** | `MOVE.fase = 'despegue'` da el aleteo fuerte (Flight lo usa 0,22 s por toque); `'cernido'` las alas de hover; `S.vy < 0` + velocidad → glide. |
| Especies y pieles | `pieles.js`, `wardrobe.js`, `content/comun/especies.js` | **tal cual** | El jugador vuela con su cotorra y ropa (`applyLook`); los rivales de la carrera ya se hacen con `AVCharacter.create` + otra piel. |
| Terreno | `src/engine/terreno.js` (`height`, `normalAt`, mapa R1) | **tal cual** | `G.terreno.height(x, z)`; el agua con `G.agua.levelAt`. Flight vuela sobre el mar frente a la playa (POI `playa`, +27 m al sur, fondo a −1,3…−11 m). |
| Bosque: árboles, plantas, rocas, troncos | `src/engine/vegetacion.js` + kit `assets/models/entorno/*.glb` (`ENTORNO_KIT.md`) | **adaptar** (kit tal cual) | Los InstancedMesh de `vegetacion.js` son del mapa (no se pueden «prestar» instancias). Un minijuego carga las piezas del kit con `G.assets.loadGLB` (mismo cargador y caché b64) y hace sus propias InstancedMesh con pool. Flight: `tronco_caido`, `roca_musgo_a`, `bambu`, `palma_sierra_joven` (4 piezas, 6 draw calls). Materiales Phong/Lambert como los del kit para que el look los gradúe igual. |
| Ríos y el río Amazonas | `src/engine/agua.js` (`levelAt`, `ripple`, `splash`, `spray`, `tormenta`), `src/game/rio_vivo.js`, mapa `agua.rio.puntos` | **tal cual** | `mapa.agua.rio.puntos` es una polilínea (> 40 puntos, ancho 4,4 m) que Retos ya usa como spline en «Contrarreloj del río» (`datosRio`). Sirve para River Rush (§5). |
| Ruinas y edificios | `src/engine/streaming.js`, `mundo.js` (`G.mundo.edificio(nombre, { pos, rotY, escala })`), kit `EDIFICIOS.md` | **adaptar** | `ruina_pilar` (394 tris), `ruina_portal` (2 621), `ruina_altar`, `ruina_mirador`, `canoa` (432 tris, propia). `edificio()` devuelve un Group que comparte materiales y no se libera: para instanciar en un minijuego hay que clonar su geometría una vez (pendiente, opcional para Flight v2 con puertas de ruina). |
| Frutas | `src/game/banquete.js` (InstancedMesh por fruto, `recoger`, `entregar`, `modoRetos`) | **tal cual** | Patrón de minijuego ya dentro de Retos: `modoRetos(compartido)` recibe lo que comparte retos.js (UI, resultados, sonar, cámara) y devuelve `{ iniciar, update, render, terminar }`. |
| Efectos | `src/engine/fx.js` (`burst`, `drops`, `ringFx`, `recoger`, `saltar`, `descubrimiento`), `src/game/clima.js` (`fijar`) | **tal cual** | Flight: `burst(x, y, z, 'feathers', 3)` por toque, `agua.spray` al chapuzón, `camara.shake`. Las partículas viven ~1 s y no son del pool (cuentan como geometrías mientras viven). |
| Cámaras | `src/engine/camara.js` (`follow`, `fov`, `draw`, `place`, `CAM`, `juice`) | **adaptar** | Tercera persona detrás del jugador. Retos cambia `CAM` (distancia, altura, follow). Una vista lateral o cenital sustituye `follow/fov/draw` por envolturas reversibles (Flight lo hace y las repone al salir); `renderer.js` llama a esas tres cada cuadro, así que no hay que tocar el bucle. |
| Física y colisiones | `src/engine/fisica.js` (`MOVE`, `TUNING`, `step`, `tryJump`…), `src/engine/solidos.js` (`G.solidos.suelo/bloquea/techo/dentro`) | **adaptar** | Vuelo libre: tal cual (Retos). Física propia (Flight: impulso 7,5 m/s y gravedad 22 m/s², los mismos valores que el salto): se envuelve `F.step` y se anulan `tryJump/releaseJump/tryDash/toggleFly/land/startFlying` mientras dura. Colisiones contra sólidos del mapa: `G.solidos`; contra obstáculos propios: cajas en el plano del carril (Flight). |
| Entrada | `src/engine/input.js` (`keys`, `stick`, `jumpHeld`, botones `#b-jump/#b-dive/#b-fly/#b-dash`, remapeo) | **adaptar** | Vuelo y carrera: tal cual. Un toque en toda la pantalla: capa DOM propia con `pointerdown` (sin retrasos) + `keydown` en captura; input.js no se toca. |
| Misiones y eventos | `src/game/misiones.js`, `eventos.js`, `G.on/emit` con prioridad | **tal cual** | Un minijuego vive con `G.ui.busy = () => true` (la historia ve el mundo ocupado) y `G.quiet` (sin viñetas), como Retos. |
| Puntuación, cronómetros, medallas | `src/game/retos.js` (`reloj`, medallas por puesto/tiempo), `marcador.js` (capítulo) | **tal cual** | Medallas: oro/plata/bronce por tiempo (río, rescate) o por puntos (tormenta ≥ 1500/800, banquete ≥ 1200/600). Flight: puntos = obstáculos; umbrales propuestos 60/25 (decisión de Kelvin). |
| «Mis récords» | `src/game/records.js` (`anotar` por gancho `retosResultado`, libro de la casa por nombre de cotorra, tarjeta para compartir) | **adaptar** (una rama por modo) | `anotar()` es un `switch` por `modo`: cada minijuego nuevo añade su rama (~6 líneas) y lee `<almacen>.retos`. Flight: clave `flight: { mejor, jugadas }`; la tarjeta solo sale si se ha jugado. Propuesta §4: una rama genérica por declaración. |
| Guardado | `src/engine/guardado.js` (`instantanea`, `suspender`, `restaurar`) | **tal cual** | La partida no se toca: instantánea al entrar y `restaurar` al salir (Retos, Flight). |
| Compartir (cómic y tarjetas, puerta para adultos) | `records.js` (`compartirRecord`, `puerta`) | **tal cual** | La tarjeta de récord dibuja carrera y tormenta; añadir un minijuego a la tarjeta = una línea en `records.js` (pendiente, opcional). |
| Música y SFX | `src/game/musica.js`, `src/engine/audio.js` (`play`, `define`, `sample`) | **tal cual** | musica.js elige por `body.retos-on` o `G.retosApi.activo` (HEAD) y, con la banda sonora de C13 (en curso), por `reto` → pista `carrera`. Flight pone `retos-on` y suena la de Retos/carreras sin reiniciar por obstáculo. SFX: `jump`, `tick`, `land`, `splash`, `unlock`. |
| Menú «¿Cómo quieres jugar?» | `src/game/menu_modos.js` + `#modos` en `index.html` | **adaptar** (fase 3) | Cada tarjeta abre lo que ya existe; una tarjeta nueva = un `<button value="…">` y una línea en `menu_modos.js`. No se añade sin la revisión de Kelvin y Fernando. |
| Modo Retos | `src/game/retos.js` (`entrar/salir`, envolturas, `resultados`, «Otra vez», `jugar(reto)`, `compartido`) | **tal cual** (patrón) | Es el patrón natural: Banquete ya es un modo externo (`modoRetos`). Flight repite el mismo ciclo entrar → jugar → resultados → salir con su propia UI; para entrar en el menú de Retos solo hace falta su tarjeta y `modo = G.flightApi.modoRetos(compartido)` (fase 3). |
| Memoria y escenas | `src/engine/streaming.js` (zonas), `renderer.js` (`info.memory`, `stats()`, `calidad`) | **tal cual** | Flight no mueve a Vittata: el streaming no carga zonas nuevas y las draw calls son estables. `R.stats()` y `renderer.info.memory` sirven para medir fugas. |

## 2. Plan técnico de Amazona Flight (hecho en fase 2)

- **Carga perezosa** (`boot.js`, 2 líneas): `AV.flight()`, `AV.flightTest()`, `?mini=flight` (abre al cerrar la portada). No suma a la descarga inicial.
- **Entrar/salir** = Retos: instantánea de `G.S`, guardado suspendido, `G.quiet`, envolturas reversibles (`G.ui.busy`, `F.step`, acciones de vuelo, `G.interaccion.action`, `camara.follow/fov/draw/manual`, FOV 56), compañero oculto, clases `flight-on` y `retos-on`. Al salir se repone todo, `G.guardado.restaurar` y se libera el pool.
- **Vittata fija, el mundo se mueve**: los obstáculos avanzan hacia ella a la velocidad de vuelo (9 → 12 m/s). Sin streaming nuevo, sin cargar la isla. La orilla con palmas que pasan vende el avance. La cámara, a 20 m mar adentro y algo adelantada: vista lateral un poco 3D, con la isla de fondo.
- **Obstáculos** (instancias del kit, pool creado una vez al entrar): columna de abajo = `tronco_caido` de pie (eje largo a Y, grosor fijo) sobre `roca_musgo_a`, con una mata de `bambu`; columna de arriba = `tronco_caido` colgando hasta fuera del encuadre. Capacidad: 40 troncos, 20 rocas, 20 bambús, 12 palmas; solo cambia `instanceMatrix`.
- **Generador justo**: módulos `puerta`, `suelo`, `techo`, `túnel` (3 puertas iguales, hueco ≥ 5,2 m), `escalera` (3 puertas que suben o bajan). Cada obstáculo se ajusta al anterior con los parámetros reales: subida sostenida tocando cada 0,3 s (`impulso − g·0,15 = 4,2 m/s`), bajada llegando «frenada» (último toque ≥ 0,25 s antes de cruzar), banda de cruce ±0,6 m, radio del cuerpo 0,55 + margen 0,35, 80 % de seguridad y al menos 1 m de hueco alcanzable. Al máximo (hueco de 3,4 m cada 0,92 s) se puede subir 3,1 m y bajar 1,9 m entre huecos. Lo comprueba `flightTest` con 300 obstáculos (todos los pares superables) y un robot que toca como un niño (≥ 0,12 s entre toques) y pasa 300 obstáculos sin chocar con 3 semillas.
- **Colisión clara**: Vittata es un círculo de 0,55 m en el plano del carril; las columnas, cajas de ±0,5 m. Chocar = «¡Uy!» (chapuzón, tronco o rama), sin daño; resultados a los 0,35 s; «Otra vez» con Enter, Espacio o un toque tras 0,45 s (un toque reflejo no reinicia sin ver el resultado).
- **Puntuación** = obstáculos superados; HUD con puntos y «mejor»; récord en `<almacen>.retos.flight` y gancho `retosResultado { modo: 'flight', puntos }` → «Mis récords» (tarjeta solo si se ha jugado).
- **Controles**: Espacio, flecha arriba, W, Enter o cualquier letra o cifra (PC); un toque en toda la pantalla (capa propia, `touch-action: none`); botón «Salir» arriba a la derecha; Esc abre la pausa (solo con «Sonido»).
- **Todas las edades**: sin violencia, sin vidas, sin presión; textos amables en ES (EN pendiente, fase 3). Sin arte, sonido ni UI copiados de Flappy Bird: piezas y sonidos del juego, HUD con los tokens de `tokens.css`.

### Medidas (`tools/build/flight_medidas.py`, build `c14-4a23967`, calidad automática, clima sol; Chrome sin interfaz con GPU Metal, M4)

| | Escritorio (alto, DPR 2) | Móvil emulado |
|---|---|---|
| Cernida antes del primer toque: ms media / mediana / p90 | 16,7 / 16,7 / 16,7 (60 FPS, tope de vsync) | pendiente (`--movil`) |
| Partida de 14 s con piloto automático: ms media / p90 · obstáculos | 16,7 / 16,7 · 9 superados | pendiente |
| Draw calls · triángulos · texturas estimadas | 84 → 86 con el vuelo (+2 sobre el mundo quieto) · 278 k · 199 MB (el mundo; el kit del vuelo son 4 texturas) | pendiente |
| 50 reinicios (213 ms): geometrías y texturas del renderer | 204 → 204 · 100 → 100 (sin fugas) | pendiente |
| Al salir: geometrías y texturas vs antes de entrar | 196 = 196 · 90 = 90 (el pool se libera; nada queda en la escena) | pendiente |

Capturas: `docs/img/c14_flight_listo.jpg`, `c14_flight_juego.jpg` (la mejor), `c14_flight_fin.jpg`. Medidas en `docs/img/c14_flight_medidas.json`.
Pendiente (por el tope semanal, pedido del coordinador): la corrida con `--movil`, y un reparto de draw calls por pieza; en escritorio el vuelo
va a tope de vsync con 2 draw calls más que el mundo quieto, así que no se espera un problema en el móvil (calidad baja no cambia el pool).

## 3. Dependencias que necesitan adaptación y estimación

| Qué | Imprescindible / opcional | Estado | Coste |
|---|---|---|---|
| Gancho de `flight` en `records.js` (rama en `anotar`, lectura, tarjeta) | imprescindible (récord sin sistema paralelo) | hecho (C14) | 14 líneas |
| Envolturas de cámara lateral (follow/fov/draw) | imprescindible | hecho, dentro de `flight.js` | — |
| Capa de toque y teclas propias | imprescindible | hecho, dentro de `flight.js` | — |
| Pista de música propia del minijuego | opcional | hoy usa la de Retos (clase `retos-on`); con C13, `reto: 'flight'` → `carrera` si se añade a `RETO_MOMENTO` (una línea, pedir a C13) | 1 línea |
| Tarjeta en «¿Cómo quieres jugar?» y en el menú de Retos | fase 3 (Kelvin y Fernando) | no hecho a propósito | ~20 líneas + tarjeta en `index.html` |
| Textos en inglés (`G.idioma`) | fase 3 | pendiente | ~10 cadenas |
| Puertas de ruina (`ruina_portal`) como obstáculo | opcional | pendiente (clonar la geometría del Group de `G.mundo.edificio`) | ~40 líneas |
| Tarjeta de compartir con el récord de Flight | opcional | pendiente | ~5 líneas en `records.js` |

## 4. Propuesta: «declaración de minijuego» compartida (extiende Retos, no una arquitectura paralela)

Cada minijuego expone `DECL` (Flight ya lo hace, `G.flightApi.DECL`) y una fábrica `modoRetos(compartido)` como Banquete:

```js
DECL = {
  id: 'flight', nombre: 'Amazona Flight', nombreEn: 'Amazona Flight', descripcion: '…',
  recursos: { kit: ['tronco_caido', 'roca_musgo_a', 'bambu', 'palma_sierra_joven'], personaje: 'vittata (original)', zona: 'mar frente a la playa' },
  camara: 'lateral, un poco 3D (fija al jugador; el mundo avanza)',
  controles: { pc: 'Espacio, flecha arriba, W o cualquier letra: impulso', movil: 'un toque: impulso', resultados: 'Enter, Espacio o un toque: otra vez' },
  inicio: 'el primer toque arranca', victoria: null, derrota: 'tocar un tronco, una rama o el agua («¡Uy!», sin daño)',
  puntuacion: 'obstáculos superados', musica: 'retos/carreras (sin reiniciar por obstáculo)',
  resultados: ['puntos', 'mejor', 'nuevoRecord'], records: { clave: 'flight', campos: ['mejor', 'jugadas'], gancho: 'retosResultado' },
  oculto: true,
};
```

Con eso, lo genérico sale de la declaración y no se repite: **retos.js** monta la tarjeta del menú (`nombre`, `descripcion`, `data-rec` con `records.clave`) y llama a `jugar(id)` → `modoRetos(compartido)`; **records.js** puede anotar cualquier `modo` declarado con `records.campos` (`mejor` por puntos o por tiempo según `puntuacion`) y pintar su tarjeta; **menu_modos.js** añade la tarjeta de la portada con `nombre` y `descripcion`; **musica.js** (C13) mapea `id` → momento. Qué toca cada archivo para un minijuego nuevo: su propio `src/game/<id>.js`, una línea en `boot.js`, una entrada en la lista de declaraciones de `retos.js` (fase 3). Nada más.

## 5. Expansiones futuras (solo documentadas; no se construye nada)

**Amazona Maze (laberinto).** Reutilizaría: terreno y `G.solidos` (paredes = `bloque_piedra` y `ruina_pilar`/`ruina_portal` del kit de edificios instanciados, o setos con `bambu`/`helecho_arboreo` del kit de entorno), cámara cenital o de tres cuartos (envoltura de `camara.js` como Flight), movimiento a pie de `fisica.js` tal cual (caminar, saltar, planeo corto; `MOVE.flying = false`), minimapa (`src/game/minimapa.js`) como mapa del laberinto, cronómetro y medallas por tiempo de Retos (`reloj`, medallas del río), frutos de `banquete.js` como objetivos (nunca anillos), `records` con `{ mejor (ms), medalla, jugadas }`. Generador: laberinto perfecto por DFS sobre una rejilla de 3 m; justo por construcción (siempre hay camino). Falta: nada de arte; solo el módulo y, si se quiere, un dosel para la vista cenital.

**River Rush (descenso del río).** El río Amazonas del mapa (`mapa.agua.rio.puntos`, polilínea de > 40 puntos, 4,4 m de ancho, nivel por `G.agua.levelAt`) **sí sirve como spline**: Retos ya la recorre en «Contrarreloj del río» (`construirRuta` con `datosRio`, proyección `enRuta/proyectar`). **Hay modelo tipo canoa**: `canoa` en el kit de edificios (`assets/models/edificios/canoa_lejos_glb.js`, propio, 432 tris, 32 instancias decorativas en el mapa; `EDIFICIOS.md` § Catálogo). Reutilizaría además: `piedras_rio` y `roca_musgo_b` como obstáculos en el cauce, `agua.ripple/splash/spray`, `rio_vivo.js` (peces) de ambiente, cámara detrás de Retos con `CAM` ajustado, entrada izquierda/derecha (`keys`/`stick`), la música de carreras y los récords por tiempo. Decisión abierta para Kelvin: Vittata en canoa (remando, con el clip de brazos del rig) o volando a ras del agua por el cauce (como el reto actual, sin canoa).

## 6. Decisiones abiertas para Kelvin

1. Arte de las «ramas»: hoy la columna de arriba es un tronco colgando desde fuera del encuadre (lee bien en el juego, pero es una licencia). Alternativas con lo que hay: dosel de `yagrumo`/`palma` invertido o `bambu` colgante; o una pieza nueva (liana) para fase 3.
2. Umbrales de medalla de Flight en «Mis récords»: bronce al primer récord, plata desde 25 obstáculos, oro desde 60 (puestos en `records.js`; se cambian en una línea).
3. Zona: mar frente a la playa (fondo de mar, isla detrás). Otra opción: el río bajo el dosel (más «bosque», pero obliga a mover a Vittata y al streaming).
4. Entrada en el menú y en Retos (fase 3) y textos en inglés.

## 7. Pendiente (no alcanzó por el tope semanal)

- Medidas en móvil emulado (`flight_medidas.py --movil`) y capturas `_movil`.
- Pulido: dosel o liana para las «ramas» (decisión 1), chispas al superar un obstáculo, inglés.
- `RETO_MOMENTO.flight` en `musica.js` cuando C13 cierre (hoy suena la de Retos por la clase `retos-on`).
- Corrida final de test.sh (build `c14-4a23967`): 38 de 39 baterías en verde, 0 errores de consola, flightTest 35/35, recordsTest 47/47; movementTest 42/43 por un collider de edificio (`portal_madera_b@kelvin_aldea_rio_este_3#1 se mete 8`, zona G6), ajeno al vuelo: en la corrida anterior (`c14-74b518b`, mismo código salvo la liberación del pool) salió 43/43.
