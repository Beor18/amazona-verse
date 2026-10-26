# Minimapa (P0 de Kelvin: «el jugador nunca debe sentirse perdido»)

Estado ANTES de construir (se marcó primero; lo que no era EXISTE se construyó en `src/game/minimapa.js`):

1. Posición y orientación (flecha que gira): **PARCIAL**. Hay flecha y haz en 3D (`fx.guide`), `S.pos` y `S.facing`; ningún mapa.
2. Objetivo principal con icono amarillo y metros: **PARCIAL**. `G.misiones.guideTarget()` da el punto; no hay icono ni distancia.
3. Marcadores por tipo (misión «!», parada «?», Retos, frutos, lugares): **PARCIAL**. Los datos existen (`G.interaccion.list`, `lugares.js`, `banquete.js`, `retosApi`); nada se dibuja.
4. Destino verde y ruta opcional: **PENDIENTE**.
5. Relieve, agua y flora precalculados (canvas 2D): **PARCIAL**. `terreno.height`, `agua.levelAt` y `vegetacion.instancias` existen; ninguna imagen.
6. HUD compacto en una esquina libre: **PENDIENTE** (hueco medido: bajo el inventario y los botones del sistema).
7. Mapa grande con toque o tecla M: **PENDIENTE**.
8. Alto contraste, texto grande y zurdo: **EXISTE** el sistema (`accesibilidad.js`: clases `a11y-*`, `--fs-k`, `maqueta()`); **PENDIENTE** aplicarlo al minimapa.
9. ~10 Hz, sin bajar FPS y carga perezosa: **PENDIENTE** (el patrón de carga tras el arranque **EXISTE** en `boot.js`).
10. `minimapaTest`: **PENDIENTE** (la maqueta móvil de accesibilidad **EXISTE**).

## Qué hace ahora
- **Compacto** (`#minimapa`): norte arriba; flecha blanca con el rumbo; 55 m a la redonda andando y 85 m volando; «● 128 m» al objetivo (sin objetivo, el lugar más cercano). Móvil: a la izquierda de la columna de botones; escritorio: bajo los botones del sistema. Se oculta con la portada, el creador, el cómic, el final, los Gestos y el objetivo desplegado.
- **Grande** (`#mapa-grande`): toda la isla; un toque en el compacto o **M**; se cierra con M, Esc, «Cerrar» o tocando fuera. Pausa el mundo mientras está abierto. Un toque en el mapa fija el **destino verde**; otro sobre él lo quita. «Ruta» activa la línea hacia el destino (o el objetivo); se guarda en este dispositivo.
- **Marcadores** (forma y glifo propios, no solo color): objetivo (estrella amarilla; fuera de vista, punta pegada al borde), misión «!» (naranja), parada «?» (azul), Reto (rombo morado; carrera/río: puntos de la ruta, la meta es el destino verde; Banquete: frutos; tormenta: la arena), fruto (punto rojo, los 14 más cercanos), lugar descubierto (cuadrado blanco con nombre en el grande).
- **Rendimiento:** relieve con sombreado a 192×192, agua y flora a 96×96, calculados una vez en trozos de ≤5 ms y solo cuando hace falta; luego solo se recorta y se escala. Redibuja ~10 veces por segundo y solo si se ve. Sin archivos nuevos en la descarga inicial: se carga a los 3 s del arranque (`boot.js`).
- **Accesibilidad:** texto con `--fs-k`; alto contraste = fondo negro, borde blanco, mapa oscurecido, marcas más gruesas; zurdo = los botones del mapa grande pasan al otro lado (el compacto queda arriba a la derecha porque la izquierda es del objetivo; el modo zurdo mueve los pulgares, que están abajo). Los subtítulos de sonido se estrechan para dejarle sitio.

## Decisiones menores (registradas)
- El destino verde lo fija el jugador (o es la meta de la carrera): no inventé una «salida» de canon. Si Kelvin quiere una salida fija por zona, es un dato de canon.
- Los Retos se leen de `G.retosApi._dev` (solo lectura); `retos.js` no se tocó. Una API `objetivo()` en `retos.js` sería más limpia (pendiente del carril de Retos).
- El minimapa no se dibuja con las baterías (`G.quiet`) salvo en un Reto.
- Límite conocido: 320×568 con texto grande y un aviso de 2 líneas; el aviso (z superior) pasa por encima del minimapa, nunca al revés.

Pruebas: `AV.minimapaTest()` (flecha y rumbo, distancia, marcadores por tipo, abrir/cerrar con toque, M y Esc, destino y ruta, ritmo de 10 Hz, coste por dibujo, y maqueta de accesibilidad en 375×812, 320×568 —también con texto grande, alto contraste y zurdo—, 812×375 y 1280×720). Capturas: `docs/img/minimapa_*.png`.
