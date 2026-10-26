# Tareas para el ejecutor del Agent SDK (créditos de la API)

Las corre `tools/agente_api/ejecutar.sh` con los créditos promocionales de la API de Kelvin ($200, vencen el 29-oct-2026), y no con el plan Max. Hay **4 carriles que pueden correr en paralelo**, uno por pestaña de Terminal, porque cada carril toca archivos distintos. Dentro de un carril, las tareas van en orden.

## Reglas (obligatorias)
- **Repo y rama:** el repo es `~/AmazonaVerse/Juego` y hay **una sola rama, `main`**. Nada de ramas ni worktrees.
- **Antes de empezar:** lee `docs/equipo/COORDINACION.md` y `ROADMAP.md`.
- **Tu zona:** quédate en los archivos de tu carril. Si necesitas tocar otro, hazlo en un commit aparte y mínimo, y explícalo en el resultado.
- **Commits:**
  - Pequeños, solo de tus archivos (`git add` de rutas concretas; revisa con `git diff --cached`).
  - Si git dice `index.lock`, espera 20 s y reintenta: hay otros carriles haciendo commit.
  - Prohibido `checkout`, `reset` y `stash`.
- **No publiques:** nada de push ni de `sitio/`. La sesión principal revisa y publica.
- **Pruebas** antes de cada commit de código:
  - `taskpolicy -b nice -n 15 tools/build/build.sh HEAD tools/build/salida/<tarea>-<sha>` (siempre en una carpeta propia: QA-35) y luego `tools/build/test.sh <esa carpeta>/ --extra`.
  - Las 13 baterías tienen que quedar en verde, con 0 errores de consola.
- **Recursos:**
  - Nunca `python3` del sistema: usa `~/Applications/Blender.app/Contents/Resources/4.2/python/bin/python3.11 -I`.
  - Nada de descargas, cuentas ni claves.
  - No borres nada de forma permanente.
- **Datos:** nada de datos inventados. Lo educativo lleva fuente verificable, y lo que no se pueda verificar va como «por verificar».
- **Público:** el juego es **para todas las edades**. Nunca escribas «grados 3 a 6». Los niveles del Aula son «Nivel 1» y «Nivel 2».
- **Al terminar cada tarea:** márcala en la tabla «Estado» con su commit y una línea de resultado.

## Carril A: motor, rendimiento y CI
**A1 · QA-30, `contextTest` intermitente** (`src/engine/renderer.js`). Dentro de la batería a veces da 12/13. Hazla estable sin bajar lo que comprueba: la batería completa debe dar 13/13 tres veces seguidas.

**A2 · Integración continua** (`.github/workflows/pruebas.yml`, nuevo). Un workflow en `macos-latest` que, en cada push a `main`, haga lo siguiente:
- Instale gltfpack 1.2 del release oficial de zeux/meshoptimizer y verifique su SHA256 contra `docs/equipo/BUILD.md`.
- Corra `tools/build/build.sh HEAD` y `tools/build/test.sh … --extra` con el Chrome del runner.
- Falle si alguna batería falla.

No lo puedes probar en GitHub: déjalo validado con `actionlint` mental y explícalo en el resultado.

**A3 · Calidad automática en equipos modestos** (`src/engine/renderer.js`). Detecta GPU o equipos débiles (Chromebook, móvil) por `WEBGL_debug_renderer_info`, núcleos, memoria y FPS de los primeros segundos, y arranca en calidad baja o media. Sin cambios en equipos potentes. Añade casos a `contextTest`, o una prueba propia expuesta para que la sesión principal la enlace en `boot.js`.

## Carril B: movimiento, cámara y flora
**B1 · Fundido de la flora entre la cámara y Vittata** (`src/engine/vegetacion.js`). La planta que tapa a la cotorra se vuelve translúcida. Haz 2 capturas, antes y después, en `docs/img/`.

**B2 · P2 de movimiento** (`src/engine/fisica.js`, `solidos.js`, `camara.js`):
- el toldo bajo no le roza la cabeza;
- la cuerda del puente colgante sirve de percha.

Añade casos a `movementTest` (`src/pruebas/movimiento.js`).

**B3 · Posarse en piezas decorativas** (estacas, empalizadas, canoas, postes de la escena de Kelvin), en `solidos.js`. Que tengan una superficie para posarse sin volver a la colisión maciza. Añade un caso en `movementTest`.

**B4 · Interiores de edificios grandes** (`src/engine/solidos.js`, `streaming.js` solo si hace falta). Los edificios por los que no se puede entrar no se ven macizos al acercarse: el umbral de la puerta queda bloqueado de forma visible, con una puerta cerrada o una tela, para que Vittata no atraviese nada. Haz 1 captura.

## Carril C: contenido educativo y especies
**C1 · Especies en el Diario** (`src/game/diario.js`, `content/comun/especies.js` solo para leerlo).
- Muestra una sección «Amazonas del mundo» con las especies que tienen datos verificados: nombre común (ES y EN), nombre científico, distribución, estado UICN y fuente.
- Las 13 especies de `docs/equipo/ESPECIES_DISCREPANCIAS.md` van **sin estado UICN** hasta que Kelvin decida.
- Añade casos de prueba.

**C2 · Diseño del episodio 2, «Un lugar para todos»** (`docs/equipo/EP2_*.md`, solo documentos). Prepara el GDD, la narrativa y 3 misiones con lecciones alineadas. Tienen que encajar con `docs/STORY_BIBLE.md` y reutilizar el motor, el ropero, el criadero y el cómic. Deja al final una lista de decisiones de canon para Kelvin, sin decidirlas tú.

**C3 · Paradas de aprendizaje en la escena de Kelvin** (`content/cap1/paradas.js` y `assets/data/mapa_cap1.js` solo para la posición).
- 5 paradas nuevas de ciencia o cultura de Puerto Rico, con datos verificados y fuente, en ES y EN.
- Cada una a 5 m o más de otros puntos interactivos.
- `eduTest` en verde.

## Carril D: interfaz, accesibilidad y documentación
**D1 · Documentación de arquitectura** (`docs/ARQUITECTURA.md`). Agrega secciones breves, con rutas de archivo, sobre:
- el streaming de edificios;
- meshopt y WebP en la build;
- la recuperación de contexto WebGL;
- `tools/build/sitio.sh` y `sitio/`;
- el ejecutor `tools/agente_api`.

**D2 · Ajustes de accesibilidad** (`src/ui/*`, `src/game/*` del menú de pausa).
- Tamaño de texto en 3 niveles y alto contraste.
- Se guardan en la partida, y en el móvil no desbordan nada.
- Añade casos de prueba.

**D3 · Remapeo de teclas** (`src/engine/input.js` y la UI de ajustes). Que se puedan cambiar las teclas de mover, volar, aterrizar y acción, con un botón para restablecerlas. Las teclas elegidas se guardan.

**D4 · Accesibilidad que pide el GDD** (P1-7 de `docs/equipo/CAP1_PENDIENTE.md`; va después de D2 y en sus mismos archivos: `src/game/accesibilidad.js`, `src/ui/ui.css`, y `input.js` solo para el modo zurdo).
- Subtítulos de sonido generales: lluvia, trueno, río, martillazos, BIP del transmisor y coquíes. Hoy solo el Simon los tiene.
- Modo relajado: guía siempre visible y sin límites de tiempo.
- Modo zurdo en táctil.
- Se guarda como D2. Añade casos de prueba.
- Ojo: otro agente está haciendo ahora un icono y un panel de controles para teclado (`src/game/guia_controles.js`). No lo dupliques.

## Carril E: capítulo 1, contenido y documentos
**E1 · Validar los 12 textos del Diario de Campo** (P1-5; `content/cap1/coleccionables.js`, solo los textos). Son coquí, San Pedrito, reinita mariposera, dajao, jicotea, manatí, maraca, güiro, cuatro, petroglifo de Caguana, vejigante y pava.
- Cada dato lleva una fuente fiable (DRNA, USFWS, ICP, Smithsonian, UICN o publicaciones académicas; puedes leer páginas web).
- Lo que no se pueda verificar se quita o queda «por verificar».
- Entrega `docs/equipo/DIARIO_VALIDACION.md`, una tabla con: hallazgo, dato, fuente con URL, veredicto y texto corregido en ES y EN si existe.
- Aplica las correcciones y quita «Textos pendientes de validar» del encabezado si todo queda validado.
- `eduTest` y `missionTest` en verde.

**E2 · Documentos del capítulo 1 al día** (P1-8).
- Actualiza `docs/equipo/GDD_CAP1.md`, `docs/CHAPTER_01_GAMEPLAY.md` y `docs/equipo/EDUCATIVO.md` al estado real, con `docs/equipo/CAP1_PENDIENTE.md` como guía.
- Crea `docs/COMO_SE_JUEGA.md`, de una página y en lenguaje para Kelvin y para familias: la meta del juego, qué hace el jugador minuto a minuto, los controles, el Modo Retos (si ya está en main) y el progreso (Diario, ropa, cómic).
- Para todas las edades, sin «grados 3 a 6»; lo educativo no es el gancho. Solo documentos.

## Carril F: herramientas que ahorran tiempo de máquina
**F1 · Pruebas más baratas y sin choques** (`tools/build/build.sh`, `tools/build/test.sh` y `docs/equipo/BUILD.md`).
- **QA-35:** que `build.sh` sin carpeta de salida use una propia y única (por ejemplo `salida/<ref>-<pid>`), así dos agentes no se pisan.
- **Chrome huérfanos:** `test.sh` dejaba Chrome sin ventana vivos al fallar o al agotar el tiempo (el 25-oct había 22, algunos de 18 h, y subían la carga a 44). Que cierre su Chrome y su perfil temporal en cualquier salida, con `trap` en EXIT, INT y TERM, y añade `--limpiar`, que cierre solo los Chrome `avtest-chrome-*` huérfanos (padre 1) con más de 30 min.
- **E2E tras recargar** (`tests/qa/e2e.js`): después de `location.reload()` espera 500 ms y `abrir()` puede agarrar la ventana vieja (`W.AV` undefined, e2eTest 25/26 con carga alta). Que espere a una ventana nueva, por condición.
- **Opción nueva** `test.sh <build> --solo bateria1,bateria2`: corre solo esas baterías, siempre con la medida de consola y de red, y deja la batería completa para QA.
- Documenta las dos cosas en `BUILD.md` y en la sección «Pruebas» de este archivo.
- Comprueba que `--extra` sin `--solo` da exactamente el mismo resultado que hoy.

**F2 · La landing cuenta lo nuevo** (`web/index.html`, `web/assets/` solo si hace falta).
- Añade una sección breve y atractiva del **Modo Retos** (carrera en El Yunque y ¡Escapa de la tormenta!) con las capturas `docs/img/retos_carrera.png` y `retos_tormenta.png`, optimizadas a WebP o JPG de 1200 px como mucho.
- Menciona los récords de la casa y el cómic para compartir, sin prometer lo que no esté en main.
- Para todas las edades. Lo educativo no es el gancho («Vuela, explora y salva tu isla»).
- No toques los créditos del pie.
- **No publiques:** publica la sesión principal.

## Carril G: pulido del juego
**G1 · Fundido de la flora entre la cámara y Vittata** (la antigua B1, en `src/engine/vegetacion.js`).
- La planta que tapa a la cotorra se vuelve translúcida.
- Hay cambios a medias, sin commit, de una corrida anterior en `vegetacion.js`: revísalos y continúa.
- 2 capturas, antes y después, en `docs/img/`. Añade un caso de prueba.

**G2 · Controles táctiles en teléfonos de 320 px** (`src/ui/ui.css`, sección de controles táctiles).
- A 320×568 el joystick y los botones no caben uno al lado del otro, con o sin modo zurdo.
- Que quepan sin taparse y con botones de 44 px o más.
- Añade el caso a `accesibilidadTest`, en su maqueta móvil de `src/game/accesibilidad.js`.

## Carril H: episodio 2
**H1 · Prototipo jugable del episodio 2** (`content/ep2/`, nuevo; antes era la E2-1 de `TAREAS_EQUIPO2.md`).
1. Lee `docs/equipo/EP2_GDD.md`, `EP2_NARRATIVA.md` y `EP2_MISIONES.md`.
2. Crea el pack `content/ep2` a partir de `content/plantilla`. Ese es el modelo de cómo un pack reutiliza el motor: no copies código del motor.
3. Que arranque con `index.html?pack=ep2`, con:
   - una zona jugable;
   - la **primera misión completa**;
   - diálogos;
   - una parada con un dato verificable y su fuente.
4. Lo que dependa del canon de Kelvin (la lista está al final de `EP2_GDD.md`) va con **marcadores neutros** `[KELVIN]`.
5. Añade su prueba al estilo de `templateTest`: el pack arranca y la misión se completa.
6. El capítulo 1 tiene que seguir intacto.

## Carril K: más Retos (`src/game/retos.js`; el resto del juego no se toca)
**K1 · Modo relajado y fantasma de tu mejor carrera.**
- Con `G.accesibilidad.relajado()`:
  - la carrera no tiene reloj límite;
  - la tormenta es de práctica: no se pierden plumas de vida y se sigue sumando.
- **Fantasma:** graba la trayectoria de tu mejor carrera (muestras cada ~0,1 s, en su propia clave) y en la siguiente vuela a tu lado una cotorra translúcida con esa ruta. Se puede apagar.
- Que pese poco: comprime la ruta.
- Casos nuevos en `retosTest`.

**K2 · Reto nuevo «Contrarreloj del río».**
- Vuelo bajo siguiendo el cauce del río por puntos marcados con flores o banderines, **sin anillos**, contra el reloj, con medallas, récord y fantasma (el de K1).
- Que aparezca en el menú de Retos y lo lea «Mis récords» (gancho `retosResultado`).
- Casos nuevos en `retosTest`.

## Carril L: que abra más rápido
**L1 · Descarga inicial de 8 MB o menos** (hoy 8,16 MB, con aviso en `test.sh`).
- Mide qué baja al arrancar y deja para después lo que no hace falta en la portada: módulos que se pueden cargar perezosos, texturas o audio que se piden al usarlos.
- Sin quitar nada del juego y sin bajar la calidad visible.
- Mide también el tiempo hasta la portada y el primer cuadro jugable, antes y después.
- Archivos: `index.html`, `src/boot.js`, `tools/build/config.json` y los módulos que hagas perezosos. Toca `index.html` con un hunk mínimo y relee antes: otros agentes también lo tocan.

## Carril M: un mundo con vida
**M1 · Bandada de cotorras** (módulo nuevo `src/game/bandada.js`; enganche mínimo en `boot.js`).
- 12 a 20 cotorras con pieles de distintas especies (`AVE.pieles`) que vuelan en bandada sobre El Yunque.
- Salen en momentos bonitos: al despertar a lo lejos, al terminar una misión y de vez en cuando por la tarde.
- Si Vittata se acerca, la acompañan un rato.
- Rendimiento: instancias, LOD y respeto a la calidad automática de `renderer.js` (pocas o ninguna en equipos modestos). Mide FPS y draw calls con `#fps`.
- No toques `content/cap1/historia.js` ni `mundo.js`, que los usan otros agentes. Engánchate a eventos que ya existan (`G.on`).
- `bandadaTest` y 2 capturas en `docs/img/`.

## Carriles N, O y P: bosque vivo (diseño cerrado en `docs/equipo/BOSQUE_VIVO_DISENO.md`; implementar la ficha tal cual)
**N1 · Fauna que reacciona** (ficha 2): `src/game/fauna.js` y `content/cap1/fauna.js`, con el lagartijo, la mariposa, el coquí visible y la boa opcional dormida, más el álbum con fuentes. Las decisiones `[KELVIN]` van con la opción neutra que propone la ficha. `faunaTest` y capturas.

**O1 · Clima de El Yunque** (ficha 1): `src/game/clima.js`, perezoso, con sol, llovizna, aguacero y neblina, presupuesto de gotas según la calidad, y sin interferir con la crecida. `climaTest` y capturas. Mide los FPS en calidad baja.

**P1 · «Save the Parrot»** (ficha 3): `src/game/rescate.js`, rescate repetible con récord en `records.js` (modo `rescate`). Sin choques con `banquete.js`. `rescateTest` y capturas.

## Carril Q: episodio 2
**Q1 · Misiones 2 y 3 del episodio 2** (`content/ep2/`, que ya tiene el prototipo de H1). Sigue `docs/equipo/EP2_MISIONES.md`: las misiones «Escuchar primero» y «Casa que aguanta», jugables de principio a fin, con marcadores neutros `[KELVIN]` para el canon. El personaje que antes se llamaba Luma ahora se llama **Iguaca**. Para todas las edades, diversión primero. Amplía su prueba. El capítulo 1 sigue intacto.

**Para todos:**
- Cada tarea en sus propios archivos.
- En `index.html` y `boot.js`, solo enganches mínimos releyendo antes.
- Build en carpeta propia y `test.sh --extra` en verde antes de cada commit.

## Carril R: mapa, fase A (`docs/equipo/MAPA_COMPLETO.md`)
**R1 · Caminos originales y el río Amazonas.**
- Recupera los caminos entre aldeas del mapa original (máscara `trees.psd` del terreno de Kelvin; el diagnóstico está en `MAPA_COMPLETO.md`) como senderos visibles, sin flora encima.
- Ensancha el «Río de los Meandros» hacia los 11 m del original y renómbralo en los textos visibles **«Río Amazonas»**.
- Sin romper el capítulo 1: misiones, la crecida, la ruta de la gota y las paradas tienen que seguir funcionando; ajusta sus posiciones si el río las toca.
- Archivos: `tools/blender/mapa_build.py`, `assets/data/mapa_cap1.js` (regenerado), `src/engine/terreno.js` y `vegetacion.js` con hunks mínimos.
- Capturas de antes y después.

## Carril T: ríos vivos (V9.1, `docs/equipo/V9_BOSQUE_VIVO.md`, punto 5)
**T1 · Peces nativos con visor.**
- 3 peces nativos (sirajo *Sicydium*, dajao *Agonostomus monticola* y guabina *Gobiomorus dormitor*) nadando en el río y las pozas, con instancias.
- Un «visor» que se usa al volar bajo o posada junto al agua: Vittata no bucea como un pez, aunque el buceo del capítulo 1 se queda.
- Cada pez observado entra al álbum con un dato verificado y su fuente (USGS o DRNA, con URL). Lo no verificable queda «por verificar».
- Nada de pesca. Para todas las edades.
- Código en `src/game/rio_vivo.js`, `rioVivoTest` y capturas.

## Carril U: inglés
**U1 · Inglés completo, listo para activarse.**
- La historia, el HUD, los diálogos, las misiones, los Retos, el Banquete, el minimapa, el menú de modos y los avisos tienen que tener su texto EN junto al ES, con la misma estructura `{ es, en }` o `data-l` que ya usa el juego.
- Hoy solo el Aula y la misión educativa están en EN.
- Traducción natural para niños y familias, no literal. Iguaca se queda como «Iguaca».
- El idioma por defecto sigue en español; el cambio de idioma ya existe o se añade en la pausa.
- Prueba: ningún texto visible sin EN (`idiomaTest`).
- No toques la lógica.

## Carril V: playtest automático
**V1 · Recorrido de 10 minutos como un niño** (`tests/qa/`, sin tocar el juego).
- Una prueba nueva, `playtest10`, que juegue en este orden: menú de modos, vuelo, coquí, comer un fruto, lluvia (si existe el clima), rescate («Save the Parrot»), río y peces con el visor, una foto para el cómic, guardar y reabrir.
- Que mida el tiempo de cada tramo, los FPS, la memoria y los errores.
- Que escriba `docs/equipo/PLAYTEST10.md` con dónde se atasca o se aburre (segundos sin acción) y 5 mejoras concretas.
- Si algo del juego está roto, lo anota en `BUGS.md` con el archivo y la línea, sin arreglarlo.

## Modernización 2026 (`docs/equipo/MODERNIZACION_2026.md`; implementar cada ficha tal cual, con capturas de antes y después)
**Carril W, renderizado (en orden, porque comparten `renderer.js`)**
- **W1 · Ficha 26-A:** posproceso por niveles: bloom a 1/4 y viñeta en calidad media, gradación en todas.
  - **NO cambies `DEFECTO` en `look.js`:** el look lo decide Kelvin.
- **W2 · Ficha 26-B:** cielo vivo, con degradado, disco solar, nubes en 2 capas y rayos en calidad alta.

**Carril Z, sensación de juego (en orden)**
- **Z1 · Fichas 26-G y 26-I:** cámara con vida (inclinación en vuelo, FOV según la velocidad, plano de descubrimiento) y efectos al recoger o descubrir algo (sprites con brillo, hit-stop, contador que salta), en `camara.js` y `fx.js`.
- **Z2 · Ficha 26-H:** UI 2026, con tipografía y micro-animaciones, sin romper la accesibilidad (`accesibilidadTest`).
  - Fuente: solo una de licencia libre (OFL), autoalojada, con su licencia en `assets/`. Si hay que descargar algo, NO lo hagas: déjalo preparado y anótalo.

**Carriles X e Y: solo cuando R1 (caminos y río) esté «hecha»**, porque tocan `terreno.js`, `vegetacion.js` y `agua.js`.
- **X1 · Fichas 26-C y 26-D:** agua estilizada y vegetación.
- **Y1 · Fichas 26-E y 26-F:** zonas con identidad de color y ambiente (`ambiente.js`).

## PRIORIDAD (Kelvin, 26-oct): primero terminar los capítulos de la temporada 1 y corregir bugs; los minijuegos van después
La temporada 1 tiene 6 capítulos (`docs/STORY_BIBLE.md`, «Temporada 1, episodios»). El 1 es jugable y el 2 es un prototipo (`content/ep2/`, `EP2_GDD.md`, `EP2_MISIONES.md`, `EP2_NARRATIVA.md`). Del 3 al 6 no hay nada.

**Reglas de los capítulos:**
- **Reutiliza el motor, el mapa, los personajes y los sistemas que ya existen.** Cada capítulo es un pack de contenido como `content/ep2/` (mira también `content/plantilla/`); no construyas mundos nuevos.
- **El canon lo decide Kelvin.** Todo lo que no esté CONFIRMADO en `docs/CANON_REGISTRY.md` va con marcadores `[KELVIN]`, como en el episodio 2. Respeta lo confirmado: Vittata, Iguaca, el Guardián, las voces de los dos guardianes extintos (que hablan «desde ahora») y el pacto de los 36.
- **Diversión primero, para todas las edades:**
  - nada de violencia, villanos caricaturescos, chat ni compras;
  - datos educativos con fuente o «por verificar»;
  - ninguna decisión lo maximiza todo (regla narrativa).
- **Cada capítulo, jugable de principio a fin** con prueba E2E (`epNTest`), en ES y EN y con capturas. Que se pueda abrir desde el menú cuando esté listo.

**Carril AD, capítulo 2 «Un lugar para todos» terminado** (AD1 y AD2, arriba): de punta a punta, pulido y con entrada en el menú.

**Carril AG, capítulo 3 «Más allá de la bahía»** (construir el primer bote y llegar a otra comunidad; confiar en quien navega):
- **AG1:** diseño en `docs/equipo/EP3_GDD.md`, `EP3_MISIONES.md` y `EP3_NARRATIVA.md`, con el mismo formato que el episodio 2:
  - 3 misiones y una formativa;
  - qué se reutiliza (el modelo `canoa` del kit, el río y el mar, las aldeas existentes como «otra comunidad»).
- **AG2:** implementación jugable en `content/ep3/`, con `ep3Test` E2E, ES y EN, y entrada en el menú.

**Carril AH, capítulo 4 «El precio del progreso»** (un proyecto con beneficios y costos; sin una sola respuesta correcta):
- **AH1:** diseño `EP4_*`.
- **AH2:** implementación jugable en `content/ep4/` con `ep4Test`.

**Carril AI, capítulos 5 y 6:**
- **AI1:** diseño de `EP5_*`, «Las voces olvidadas»: mensajes del transmisor, ruinas, un relevo de comunicación y la memoria incompleta del Guardián. Aquí se revela a las dos voces extintas: deja `[KELVIN]` en cómo se presentan.
- **AI2:** diseño de `EP6_*`, «El pacto de los 36»: puzzle cooperativo; la fuerza de Vittata es ayudar a otros a trabajar juntos.
- Si sobra crédito, implementa el capítulo 5 en `content/ep5/`.

**Carril AJ, bugs:**
- **AJ1:** cierra los bugs abiertos de `docs/equipo/BUGS.md` (QA-30, 32, 33, 35 y los que estén sin cerrar). Cada uno se reproduce, se arregla y se cierra con su commit; si no se reproduce, se explica.
- **AJ2:** los 2 errores intermitentes «THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN» que a veces frenan la publicación con la Mac cargada. Encuentra el módulo con `console.trace` en una build bajo carga, arréglalo y añade una prueba.
- **AJ3:** una ronda de QA de jugador nuevo en escritorio y en móvil a 375×812: aventura, capítulos, Retos, Flight, criadero y menú. Arregla lo roto y anota el resto en `BUGS.md`.

## Ronda del 26-oct (tarde): minijuegos y episodio 2
**Antes de empezar, obligatorio:**
- **Lee y sigue `AGENTS.md`.** Los commits se hacen con índice temporal: Grok, en Cursor, y Claude hacen commits a la vez.
- **Apúntate.** Añade tu fila en `docs/equipo/TRABAJO_SIMULTANEO.md` (Para «API», quién y hora, en curso) y haz commit solo de esa fila.
- **No toques archivos apuntados por otros.** En concreto:
  - `src/game/flight.js`, de C15;
  - `src/engine/streaming.js` y `terreno.js`, de G9;
  - `content/cap1/en.js`, solo con cambios mínimos y aparte.
- **Una tarea no está hecha si queda trabajo sin commit.**
- **Para todas las edades:** sin violencia, armas, chat ni compras. Nada de Pac-Man ni de otras marcas.
- **Lee `docs/equipo/MINIJUEGOS.md`.** Tiene la auditoría y la «declaración de minijuego» (`DECL`, en `src/game/flight.js`) que debes reutilizar.

**Carril AB, Amazona Maze (prototipo; era la G13 de Grok)**
- **AB1:** laberinto de recolección de frutas con una persecución amable de «guardianes» ficticios.
  - Si te alcanzan, «¡te encontraron!» y pierdes el combo. Nunca hay daño.
  - Cámara superior o isométrica.
  - Reutiliza las frutas de `banquete.js` (solo lee su API, no edites el archivo), a Vittata, raíces, rocas, árboles y estructuras existentes.
  - Recorridos válidos garantizados.
  - Puntuación con récord en «Mis récords», mediante el gancho `retosResultado` (modo `maze`).
  - Oculto en `?mini=maze`, con `AV.maze()`.
  - Batería `mazeTest`: recorridos, frutas, persecución, puntuación, récord y sin fugas tras 50 reinicios.
  - Mide en escritorio y en móvil a 375×812: Vittata y el laberinto tienen que verse bien en vertical.
  - Archivos: `src/game/maze.js` (nuevo) y una línea en `src/boot.js`, en un commit mínimo aparte.

**Carril AC, River Rush (prototipo)**
- **AC1:** descenso por el río Amazonas del mapa. Usa `mapa.agua.rio.puntos` como spline (`MINIJUEGOS.md` explica cómo) y el modelo `canoa` del kit de edificios.
  - Esquivas troncos y rocas existentes y recoges objetos para sumar puntos.
  - La dificultad sube con la velocidad.
  - Control de un dedo: izquierda y derecha arrastrando, o teclas.
  - Cámara detrás y por encima, encuadrada bien en vertical: Vittata y la canoa grandes y visibles desde el primer cuadro.
  - Récord en «Mis récords» (modo `rio_rush`).
  - Oculto en `?mini=river`, con `AV.riverRush()`.
  - Batería `riverTest`: sigue el cauce, colisiones, puntuación, récord y sin fugas.
  - Archivos: `src/game/river_rush.js` (nuevo) y una línea en `src/boot.js`, en un commit aparte.

**Carril AD, episodio 2 de punta a punta**
- **AD1:** juega el episodio 2 completo con una prueba automática, desde la entrada hasta el final.
  - Mide cuánto dura y dónde se atasca.
  - Arregla lo que esté roto o confuso en `content/ep2/*`.
  - Completa el inglés de sus textos.
  - Añade capturas en `docs/img/ad1_ep2_*.jpg`.
  - Deja un informe breve en `docs/equipo/EP2_PLAYTEST.md`.
  - Archivos: `content/ep2/*` y `tests/qa/` (prueba nueva).

**Más tareas complejas para gastar el crédito hoy** (decisión de Kelvin del 26-oct; cada carril, en orden)
- **AB2 · Amazona Maze completo, solo después de AB1:**
  - Tarjeta en «¿Cómo quieres jugar?» y en Retos, siguiendo el patrón de Flight (`menu_modos.js`, `retos.js`: relee antes de editar, porque AC2 también toca esos archivos; cambios mínimos y en tu sección).
  - Inglés, medallas, el «casi» y la siguiente meta (G12b).
  - Publicar en el ranking con `reto: 'maze'` (el servidor ya lo acepta) y su pestaña en el top de la web (`web/index.html`, solo el array `RETOS` del bloque `top-records`).
  - Música de carreras.
  - `mazeTest` ampliado.
- **AC2 · River Rush completo, solo después de AC1:** lo mismo que AB2, para River Rush (`reto: 'rio_rush'`), más dos modalidades:
  - contrarreloj;
  - contra tu fantasma (reutiliza el fantasma de Retos).
- **AD2 · Episodio 2, lo prioritario del informe de AD1:** arregla y pule lo que `EP2_PLAYTEST.md` marque como más importante: encuadres, escenas, ritmo y textos. Si el episodio 2 no se puede abrir desde el menú, añade su entrada (cambios mínimos en el menú). Con capturas.
- **AE1 · Web de minijuegos y para compartir:**
  - En `web/index.html` (solo la sección `#retos`; no toques el bloque `top-records` salvo su array `RETOS`), una ficha por minijuego con captura real del juego actual: Flight, Banquete, tormenta, carrera, Maze y River Rush cuando existan.
  - Una imagen `og:image` y una tarjeta para compartir el minijuego.
  - Textos en ES y EN, para todas las edades.
  - Revísalo a 375 px y a escritorio.
- **AF1 · Rendimiento en el móvil de cada modo:**
  - Mide FPS y el peor cuadro de aventura, Flight, Banquete, tormenta, carrera y criadero a 375×812, con CPU ×4 más lenta (`tools/build/look_capturas.py --movil` o `avtest`).
  - Optimiza lo peor de los módulos de `src/game/*` (instancias, materiales compartidos, menos partículas en «bajo», calidad automática).
  - No toques `src/engine/streaming.js`, `terreno.js` ni `mundo.js` (son de G9 de Grok).
  - Informe en `docs/equipo/RENDIMIENTO_MOVIL.md`, con las medidas de antes y después.

**Pruebas de cada tarea:** `taskpolicy -b nice -n 15 tools/build/build.sh HEAD tools/build/salida/<tarea>-<sha>`, y después `tools/build/test.sh <esa carpeta>/ --extra`. Todo en verde, con 0 errores de consola.

## Estado
| Tarea | Estado | Commit | Resultado |
|---|---|---|---|
| A1 | hecha | 35a426d (+ 0e82a09) | Causa: el haz guía y su flecha laten con `performance.now()` aunque el mundo esté en pausa, y con el haz a la vista cambiaban del 2 al 5 % de los píxeles entre la foto de antes y la de después (reproducido con el código anterior: 1 de 3 en rojo, con un 4,8 %). Arreglo en `contextTest`: durante la prueba se congelan el haz y la calidad adaptativa, el mundo se asienta contando cuadros y no milisegundos, se acota la espera del streaming (con el jugador quieto, `terminar()` no acababa y la prueba se colgaba) y las esperas de la pérdida y la vuelta del contexto son por condición y más largas. Comprueba lo mismo que antes. Resultado: 3 corridas seguidas en HEAD 9e5bdcb, con 16/16 baterías y 0 errores. Añadido por el coordinador: `retosTest` (semillas y combo) fallaba 7 de cada 30 veces porque un solo paso alcanzaba dos semillas; con 0e82a09 falla 0 de 40 y da 3 corridas seguidas de 17/17. Aparte, un rojo de `e2eTest` con la carga en 243: hay una carrera en la recarga del iframe de `tests/qa/e2e.js`. |
| A2 | hecha | 642ffc8 | `.github/workflows/pruebas.yml`: push a `main` → macos-latest, Python 3.11 + numpy/OpenImageIO como `AV_PYTHON`, gltfpack 1.2 con SHA256 del zip y del binario leídos de `BUILD.md`, `build.sh HEAD`, `test.sh --extra` con el Chrome del runner y un paso que lee `reporte-test.json` y falla si cualquier batería (también las extra) no pasa; sube los reportes. Sin probar en GitHub: YAML parseado con Ruby, greps de SHA y chequeo de baterías probados en local (13/13). Riesgo: que el runner no tenga GPU Metal para `--use-angle=metal`. Sin baterías: no toca nada de la build. |
| A3 | hecha | cf90162 | `src/engine/renderer.js`: `perfilEquipo` (GPU por `WEBGL_debug_renderer_info`, `hardwareConcurrency`, `deviceMemory`, móvil o ChromeOS) elige el nivel inicial: bajo con GPU por software, 2 núcleos o menos o 2 GB o menos, y en Chromebook o móvil con 4 núcleos o 4 GB o menos; medio con GPU integrada o 4 núcleos/4 GB; si no, alto, así que los equipos potentes no cambian. `decidirArranque` mide los FPS de los primeros 3 s jugando y solo baja, una vez (menos del 50 % del objetivo va directo a bajo; menos del 85 %, un nivel). `calidadTest` (14 casos con equipos simulados) se expone en `G.renderer` y corre dentro de `contextTest` (25/25). Las 13 baterías pasan con 0 errores de consola. Las líneas A1 que había sin commit en `renderer.js` siguen sin commit. |
| B1 | pendiente | | |
| B2 | hecha | e29f59d (+ bd5e282) | Toldo: `solidos.libre()` mide el espacio sobre los pies; con menos de 1,8 m se agacha (`MOVE.agachada`, cuerpo de 1,15 m, mira adelante, más lenta) y la cámara baja; pose `crouchPose` en `character.js` + 1 línea en `actores.js` (commit aparte bd5e282, mismo rol). Cuerda: ya sostenía; ahora `que()` la llama 'cuerda' (suena como rama). `movementTest` 29/29: cuerda (fino, deriva 0) y toldo real con la cabeza 0,30 m bajo la lona medida en vértices deformados. 14/14 baterías, 0 errores. |
| B3 | hecha | 6c3e6af | Medidas en el juego: las 25 empalizadas y las 32 canoas (`decorativo`, streaming) ya tenían superficie en todas sus celdas; las que no tenían sólido eran las estacas y el letrero de los terrenos (su grupo está en el origen y las 4 estacas son un InstancedMesh), así que seguían con el cilindro `post` sin alto. `solidos.js`: `agregar()` va instancia a instancia y `contenido()` encuentra el grupo por la pieza más cercana, así que los 2 collider `post` se sustituyen. `que()` mide sobre el agua (una canoa a flote ya no es «techo»). `movementTest` 30/30: se posa en una estaca a 1,19 m (`fino`, `poste`, deriva 0, collider sustituido); el caso va detrás del toldo, porque antes de él dejaba el streaming en otra zona y el toldo fallaba. 14/14 baterías, 0 errores de consola. |
| B4 | hecha | 46febea | `solidos.js` `cerrarVanos`: al cargar un modelo completo (gancho de 1 línea en `streaming.js`, procesar) busca en su planta los vanos (franja de 0,3 a 1,1 sobre la base; cierre morfológico 2D con radio 0,45→1,3; interior libre, cubierto ≥ 70 % y encerrado; vano = lo tapado en el camino corto interior→exterior; ancho 0,6–4, alto ≥ 1, máx. 6) y funde en una parte del modelo un panel fino que entra en jambas y dintel: tablas (WoodPlanks) o tela (Tarp) del propio modelo. Se dibuja con las instancias y entra en los sólidos, así que el umbral bloquea (medido en el bohío: `bloquea` en toda la línea del umbral). Lo tienen bohio_redondo (45 instancias, también el taller y el refugio), casa_paja_a/b, caney_largo, carpa_d, corral, monumento_a y campamento_f; los macizos quedan «cerrados» y los abiertos (portales, toldos, ruinas) «sin interior», sin tocar. Caché por modelo (`G.solidos.vanos`), 5–130 ms una vez por modelo. Captura `docs/img/b4_puerta_bohio.jpg`. 13/13 obligatorias, contextTest 25/25, streamingTest 10/10, 0 errores de consola; retosTest (extra) 48/50 en puntos y combo de semillas, de `retos.js`, que tiene cambios sin commit de otro carril. El commit lleva «Opus 5.5» en el Co-Authored-By, no «Sonnet 5.5». |
| C1 | hecha | 86b8a25 (+ 0f9f3fe) | `src/game/diario.js`: sección plegable «Amazonas del mundo» (33 de las 36 especies de `especies.js`; faltan `tresmariae`, `kawalli` y `guatemalae` por no tener nombre común en español verificado) con nombre ES y EN, científico, distribución, estado UICN y fuente en texto, sin enlaces; `G.diario.especies()` la expone. Las 13 de `ESPECIES_DISCREPANCIAS.md` dicen «por verificar» (se callan las que no coinciden con el catálogo de Kelvin, así que al cambiar `catalogo.uicn` o `uicn.categoria` se mostrarán solas). La cita de la evaluación va corta («BirdLife International (2020), Lista Roja UICN e.T…»). El CSS de la sección va inyectado desde `diario.js` porque `ui.css` es de otro carril; puede pasar allí. `eduTest` 79/79 (13 discrepancias, ES/EN, extinta, cita). 15/15 baterías, 0 errores de consola. |
| C2 | hecha | 6740bb8 | `docs/equipo/EP2_GDD.md`, `EP2_NARRATIVA.md` y `EP2_MISIONES.md`: tres misiones (Lee la tierra, Escuchar primero, Casa que aguanta) con objetivos NGSS, formativa, Modo Maestro y Nivel 1/2. Reutiliza misiones por datos, perchas, agarre, diálogo, ropero (4 piezas ya modeladas), criadero (`obtener.cap2`) y cómic (`EVENT_DEFS`). DEPR y datos de suelos y cajas nido quedan «por verificar». Hay 10 decisiones de canon para Kelvin en el GDD §10. Solo docs, sin baterías. |
| C3 | hecha | b6c2e94 | `content/cap1/paradas.js`: 5 paradas de 3 opciones, ES y EN, con su fuente a la vista y la ficha «verificado» que desbloquean: cotorra (USFWS), palma de sierra (USDA FS, Drew et al. 2009), nido (USFWS), María (USFWS) y flamboyán (USDA FS, manual de semillas). Datos releídos en el PDF de USFWS (feb. 2026) y en el resumen de Drew et al. Posiciones medidas sobre el mapa (pendiente ≤ 10°, seco, ≥ 3 m de los edificios de Kelvin, ≥ 12 m de otros puntos); las de la corrida anterior caían dentro de dos casas y en una ladera de 28°. Sin tocar `mapa_cap1.js` (lo genera `mapa_build.py`). `eduTest` 79/79: 8 paradas separadas 5 m o más, fuente visible y ninguna se aparta de su sitio. Por revisar: la ficha `palma_sierra` de `lecciones.js` dice «creció más que cualquier otra especie» (EN: «grew in more than…»), y el resumen de Drew et al. dice que era la más abundante en 2005 y que sus plantas nuevas superaron a las de las demás desde 1976; la parada usa lo segundo. |
| D1 | hecha | 8808c5a | `docs/ARQUITECTURA.md`: secciones nuevas de meshopt/WebP en la build, contexto WebGL, `sitio.sh`/`sitio/` y `tools/agente_api`; el streaming ya estaba documentado. Solo docs, sin baterías. |
| D2 | hecha | 920bc30 | `src/game/accesibilidad.js` y sección 7b de `src/ui/ui.css`: en el menú de pausa, «Texto» Normal, Grande (×1,15) y Muy grande (×1,3), y «Alto contraste» (negro y blanco, texto ≥ 7:1). Escalan los `--fs-*` y también el aviso, el aviso de acción, los gestos y la pista de teclas, que traían píxeles. Se guardan en la partida (`profile.a11y`) y «Comenzar de cero» los conserva. Móvil: menú en 2 columnas, objetivo sin cortar, texto largo del diálogo con desplazamiento propio (el retrato ya no se recorta), aviso fuera de la columna de botones y gestos en una columna a 320 px; sin guiones automáticos. `AV.accesibilidadTest` con maqueta móvil (iframe de 375×812 y de 320×568 con el CSS real y copias del HUD, en los 3 niveles): 14/14. 17 baterías en verde, 0 errores de consola. |
| D3 | hecha | 0fb8bbd | `src/engine/input.js`: sección «Teclas» en el menú de pausa (oculta en táctil, reusa estilos de la ayuda) para mover, volar, aterrizar (nueva, X, solo baja) y acción; pulsar y luego la tecla, Esc cancela, una tecla ocupada se intercambia, las fijas (Espacio, C, F, Q, R, 1–7, flechas, Enter) se rechazan; «Restablecer teclas». Se guarda en el dispositivo (`amazonaverse.teclas`, aparte de la partida). `keys` sigue con WASD canónicas: fisica.js intacto. Ayuda y pista del HUD siguen el mapa; `ui.js` salta el texto con la tecla de acción. `AV.teclasTest` 17/17 (línea en `boot.js`). Baterías: 13/13 en el candidato con todo menos el formato del resultado de teclasTest; en el final, 12/13 dos veces con maestroTest 21/22 (caso del portapapeles con `espera(150)`, carga 27 por otras corridas) y 22/22 al correrlo solo. Recomiendo darle más margen a ese caso en `content/cap1/pruebas.js`. |
| D4 | hecha | 62f7208 | `src/game/accesibilidad.js`, `src/ui/ui.css`, el gancho `G.audio.alSonar` (4 líneas en `src/engine/audio.js`) y la guía en `src/engine/fx.js`. Sección «Accesibilidad» del menú de pausa; los ajustes se guardan como los de D2. Subtítulos de sonido (apagados de entrada) de lluvia, trueno, río, martillazos, BIP del transmisor y coquíes, más el resto de los sonidos de la historia, en ES y EN, arriba bajo el objetivo, máximo 3 líneas, aun con el sonido apagado y sin animación con «reducir movimiento». Modo relajado: la flecha de guía se ve a más de 1,5 m (antes 4 m), ×1,4, el haz ×1,8 y el objetivo del móvil no se corta; el capítulo no tiene tiempos. Modo zurdo (solo táctil): joystick a la derecha y botones a la izquierda, solo CSS (`input.js` intacto). `accesibilidadTest` 36/36, con maqueta móvil de 375×812, 320×568, 412×915, 812×375, 800×600 y 1280×720. 17 baterías en verde, 0 errores. Pendiente para el dueño de `src/game/retos.js`: la carrera (180 s) y la tormenta (90 s) tienen reloj y pueden leer `G.accesibilidad.relajado()`. |
| E1 | hecha | ee215a9 | 12/12 textos del Diario de Campo con fuente y URL en `docs/equipo/DIARIO_VALIDACION.md` (DRNA, USFWS, USGS, ICP, Smithsonian, UICN/ISSG, Cornell Lab, Ley 154-2003, tesis UAGM y artículos): 7 corregidos (coquí ya no «solo vive» en PR, dajao, jicotea, maraca, güiro, cuatro, pava) y 5 verificados y precisados (San Pedrito, reinita, manatí, petroglifo, vejigante). Solo textos y el encabezado de `coleccionables.js`; nada queda «por verificar» en el juego; no existen textos EN (la tabla trae una propuesta). Baterías 15/15 con 0 errores de consola (eduTest 78/78, missionTest 55/55, e2eTest 42/42). Para Kelvin: el USFWS propuso en 2025 pasar el manatí antillano a «en peligro», sin regla final encontrada; el texto dice «protegido por ley». |
| E2 | hecha | 487085d | `GDD_CAP1.md`, `CHAPTER_01_GAMEPLAY.md` y `EDUCATIVO.md` al estado real de `main` (ruta de la gota en vez de anillos, Diario validado, apertura en escena, Voz neutra, panel final con Seguir explorando, Modo Retos, accesibilidad por estado; EDUCATIVO ya no dice «grados 3–6»: todas las edades, Nivel 1 y Nivel 2) y `docs/COMO_SE_JUEGA.md` nuevo, una página para familias (meta, minuto a minuto, controles de teclado y táctil, Modo Retos y progreso). Fuente: `CAP1_PENDIENTE.md` y `DIVERSION_CAP1.md`; sin nombres del equipo fundador. Solo documentos, sin baterías. |
| F1 | hecha | 25-oct | build.sh con salida única (<ref>-<commit7>-<pid>); test.sh con trap EXIT/INT/TERM y --limpiar; e2e espera ventana nueva tras recargar; test.sh --extra pasa (e2eTest 42/42) |
| F2 | hecha | 25-oct | Sección «Modo Retos» en la landing (`#retos`): capturas de la carrera y de la tormenta en JPG, récords de la casa, cómic para compartir, enlace en el menú; ES y EN, probada a 375 px y a escritorio. |
| G1 | hecha (integrada 26-oct) | f5c1f99 | Fundido por tramado de la flora entre la cámara y Vittata (`vegetacion.js`: cono cámara→Vittata, `FUNDIDO.fuerza` 0,7; se apaga con la cámara pegada); caso en movementTest (a0efb31). Trabajo de un carril de la API que estaba sin commit; lo integró la sesión de integración. |
| G2 | hecha (integrada 26-oct) | 05f2969 | `ui.css` a 360 px o menos (320×568): joystick y botones compactos lado a lado, con y sin modo zurdo (≥ 44 px); la maqueta 320×568 entra en accesibilidadTest (37/37). |
| H1 | hecha | 11ecc7c | Pack `content/ep2` (desde la plantilla, sin tocar el motor): `index.html?pack=ep2`, zona con 3 sitios, misión 1 «Lee la tierra» completa, diálogos, parada del nido con fuente (USFWS), marcadores `[KELVIN]`; `AV.ep2Test` 19/19 y las 13 baterías en verde. |
| K1 | hecha | 0fd6b3f | Relajado: la carrera sin reloj límite y la tormenta de práctica (golpe sin perder plumas ni combo, se sigue sumando); fantasma de la mejor carrera (muestras cada 0,1 s en decímetros, diferencias base 36, ~5 KB/min, clave `.retos.fantasma`, cotorra translúcida y botón para apagarlo); retosTest 64/64, las otras 12 baterías verdes; e2eTest 2/3 falla ya en HEAD (`G.dialogo.activo`, ajeno). Pendiente: «Nuevo estudiante» (boot.js) no borra la clave del fantasma. |
| K2 | hecha | c36abe6 | Contrarreloj del río: ruta por el cauce (mapa.agua.rio, ~970 m) a 4,5 m del agua, 7 flores con banderín y meta en la desembocadura, sin anillos, rivales ni corrientes; medallas por tiempo, récord y fantasma propio (`.retos.fantasma.rio`); en el menú de Retos, en «Mis récords» (records.js, retosResultado modo 'rio') y en el cómic del primer récord; retosTest 87/87, recordsTest 47/47, las 13 baterías verdes. Pendiente: «Nuevo estudiante» (boot.js) no borra las claves de fantasma. |
| L1 | hecha | ef915cc | Descarga inicial 8,27 → 8,04 MB (no llegó a 8: faltan ~44 KB; el aviso de `test.sh` sigue, pero ya con otros 4 módulos de otros carriles dentro de la medida). Diferido: `pruebas.js` del cap1 (79 KB, `pack.pruebasDiferidas`), el relieve de las islas (100 KB, tras el primer gesto, con los conos de respaldo hasta entonces) y banquete, minimapa, bandada y marcador (en el primer gesto, no por temporizador; `alPrimerGesto` en `boot.js`). Las 11 baterías obligatorias en verde, 0 errores de consola; las extra no se pudieron repetir con la máquina saturada (carga 23-43, 85 Chrome). Tiempo hasta jugable: 35,0 s antes y 6,3 s después, pero con cargas de máquina muy distintas, no comparable. Lo que sigue: `especies.js` (53 KB, el Diario y `records.js` la leen en síncrono) y `educativa.js` (64 KB) pedirían carga asíncrona. Los módulos nuevos de `boot.js` aún sin commit (rescate, clima, rio_vivo) usan temporizadores de 3 a 6 s y cuentan en la medida: que usen `alPrimerGesto`. |
| M1 | hecha | 31b8952 | `src/game/bandada.js` (carga perezosa desde `boot.js`, 5 líneas): 12 (medio) o 20 (alto) cotorras, ninguna con calidad baja; el color de cada una es la media de la piel de hasta 6 especies de `AVE.pieles` (se bajan solo si sale la bandada). Salen al despertar (a lo lejos, 6 s tras `apply`), al terminar una misión (`aprendizaje` tipo `mision`, más cerca) y por la tarde (cada 2,5 a 5 min de juego); si Vittata queda a menos de 30 m la acompañan 18 s en círculo y se van. Dos `InstancedMesh` (LOD: 126 vértices de cerca, 528 a menos de 55 m, aleteo en el vertex shader), +2 draw calls como máximo medidos con `stats()`. Hallazgo: `cullPequenos` de `renderer.js` mandaba la malla a la capa 31 por su caja en el origen; se evita con `userData.sinCulling`. `bandadaTest` 14/14 (extra); 23/23 baterías con 0 errores de consola. Capturas `docs/img/m1_bandada_lejos.jpg` y `m1_bandada_acompana.jpg` (colocadas a mano cerca de la cámara; sin medir FPS en equipo real). Los colores salen casi todos verdes: las pieles lo son. |
| N1 | hecha (integrada 26-oct) | 9071784 | `src/game/fauna.js` + `content/cap1/fauna.js`: lagartijo, mariposa cebra, coquí visible y boa dormida opcional (`fauna.boa: true`, [KELVIN]), álbum «Fauna de El Yunque» con fuentes y «por verificar»; viñetas del cómic; faunaTest 22/22 tras los arreglos de integración (44851b4, 1 commit más). |
| O1 | hecha (integrada 26-oct) | 9071784 | `src/game/clima.js`: sol, llovizna, aguacero y neblina, perezoso, presupuesto de gotas por calidad, sin tocar la crecida; ráfagas en la flora; capturas `docs/img/o1_clima_*.jpg`; climaTest 31/31. |
| P1 | hecha (integrada 26-oct) | 9071784 | `src/game/rescate.js`: rescate repetible con récord (`records.js` modo `rescate`), cápsula «Pichón rescatado» en `huevos.js`; QA-36 arreglado (linMat con el material); rescateTest 32/32 tras los arreglos de integración. |
| Q1 | hecha (integrada 26-oct) | 30e7bfe | Misiones 2 y 3 del episodio 2 en `content/ep2/pack.js` (Iguaca, abuela y papá, tarjetas, construcción y tormenta), marcadores [KELVIN]; ep2Test 35/35. Estaba sin commit; lo integró la sesión de integración. |
| R1 | hecha | 2afade5 (+ docs) | Sendas: `tools/blender/mapa_sendas_kelvin.py` saca de `trees.psd` el esqueleto de los tramos estrechos (cruza los claros pequeños de las aldeas, no las mesetas): 1,9 km en `mapa_sendas_kelvin.json`. `mapa_lib.py` las pinta de tierra, las saca de la máscara `libre` (sin plantas ni pasto) y sin copas encima; no se tallan ni mueven edificios, se cortan junto al agua y en paredes de más de 33°. Río: de 8,3 a 11,1 m de ancho medio (el cañón del puente igual), «Río Amazonas» en la zona y en `agua.rio.nombre`; jicotea, madera m5 y la marca de crecida se apartan solas de la orilla. Datos regenerados sobre un HEAD limpio; en la escena de Kelvin solo cambian las piezas junto al río (los templos y el complejo, que ya derivan al regenerar HEAD, quedan como estaban). `terreno.js` y `vegetacion.js` sin tocar. Capturas `docs/img/r1_sendas_*.jpg` y `r1_rio_*.jpg`. Build ee9ac8a: 13/13 obligatorias, 0 errores de consola; banqueteTest (extra) 42/43, oscila 42–43 en el mismo build. Una variante con palmas de sierra sobre las sendas daba movementTest 32/38 (una palma joven sobre el sitio de prueba bloquea el salto): la prueba elige el sitio sin mirar la flora cercana. |
| T1 | hecha (integrada 26-oct) | 9071784 | `src/game/rio_vivo.js`: sirajo, dajao y guabina con instancias, visor al volar bajo o posada junto al agua, álbum «Peces del río» con fuentes USGS/DRNA; clave `peces` del guardado (QA-37); rioVivoTest 23/23. |
| U1 | hecha | 0c93a87 | Inglés completo sin tocar la lógica: `src/game/idioma.js` + diccionario `content/cap1/en.js` (1.211 textos ES→EN, solo se descarga con EN; traduce nodos de texto y title/aria-label/alt con un observador que existe solo en EN y restaura al volver a ES; default ES; cambio en el Aula de la pausa); pies de viñeta del cómic y nombres del minimapa traducidos; `AV.idiomaTest` 13/13, las 13 baterías verdes y 0 errores de consola. Límites: lo no traducido queda en ES; el texto de los pasos sueltos con datos armados a trozos se cubre por frases; ep2 sin traducir (prototipo). 
| V1 | hecha | 136da45 | `tests/qa/playtest10.js` (`AV.playtest10()`, se inyecta como e2e.js): 10,1 min de juego en 10 tramos con las teclas de verdad, 21/23 en verde, 0 errores de consola en el iframe y memoria estable (84,5→83,7 MB en el paseo). Informe en `docs/equipo/PLAYTEST10.md` con 5 mejoras; en `BUGS.md`: QA-36 (`rescate.js:101`, `linMat` recibe un texto: el rescate no arranca), QA-37 (`'peces'` falta en `claves` de `pack.js:76`: no se guarda) y QA-38 (`huevos.js:175`, sintaxis en la copia de trabajo). Corrida sobre la copia de trabajo porque clima, rescate y río no están en HEAD; las 13 baterías de HEAD en verde. |
| W1 | hecha (integrada 26-oct) | f01c9f8 | Ficha 26-A: post por niveles (medio bloom a 1/4 + viñeta, alto a 1/2; gradación en todas, en bajo dentro del tone mapping); contextTest 30/30; capturas `docs/img/m26_A_*`. `DEFECTO` de look.js sin tocar. |
| W2 | hecha | 49af9d1 | Ficha 26-B (cielo vivo, hecha como C1 del tablero simultáneo por Claude Fable): degradado de tres paradas con horizonte cálido hacia el sol, halo y disco del sol, nubes en dos capas (baja densa y rápida, alta fina y lenta, contorno que ondea; una llamada) y rayos de luz solo en alto (`RayosPass` en el composer: máscara de cielo claro estirada hacia el sol, 2 pases radiales de 8 muestras a 1/4, sumada en la gradación solo donde el píxel no es cielo; se apagan de espaldas al sol y bajan con lluvia y neblina). `clima.js` y `look.js` siguen mandando sobre `uCenit`/`uHorizonte`/`uSolCol`; la gradación de 26-A no cambia; `mundo.post.rayos` (0 los apaga) y `mundo.cielo.nubesAltas`. Build c1-prueba3: 35 baterías en verde, 0 errores de consola. Rayos ≈ +1 ms (1920×1080, dpr 1,5) solo mirando al sol; móvil emulado igual. Capturas `docs/img/c1_cielo_*.jpg`. |
| Z1 | hecha (integrada 26-oct) | a0efb31 | Fichas 26-G y 26-I: cámara con vida (roll, FOV por velocidad, dolly, plano de descubrimiento) y efectos al recoger o descubrir (sprites, anillo, cifra que salta, acorde `descubrir`); reduced-motion lo apaga; movementTest 43/43 (el FOV de crucero quedó en fovMin en 44851b4). |
| Z2 | hecha | 00d67bf | Fredoka (títulos, botones y cifras) y Atkinson ya estaban autoalojadas en `assets/vendor/fonts/` con `font-display: swap`; nada que descargar. Se añade su licencia (`OFL.txt`, texto SIL OFL 1.1; las líneas de copyright vienen de los metadatos publicados y quedan «por verificar» contra la tabla name de los .woff2). `tokens.css`: `--c-line` más luminoso, `--c-highlight`, `--c-shine`, `--r-panel` 18 px, `--glow-k`, `--dur-shine`. `ui.css`: paneles con borde de 2 px y filo de luz, botones con sombra de su color (`color-mix`, con respaldo) que crece al pasar el ratón, brillo que recorre `.progress` y el segmento del objetivo, icono que salta en todos los avisos y destello dorado que sube del contador del inventario al cambiar (en `::after` sin texto: no lo leen los lectores ni cambia la cifra). No cambia colores de texto (AA intacto); con «reducir movimiento» se apaga todo. `docs/UI_SYSTEM.md` al día. `index.html` sin tocar. 31/31 baterías (`accesibilidadTest` 36/36, con 375, 320 y otras maquetas) y 0 errores de consola. Ojo: Z1 sigue pendiente; Z2 no depende de sus archivos. Las líneas de G2 en `ui.css` siguen sin commit. |
| X1 | hecha (integrada 26-oct) | f5c1f99 | Fichas 26-C y 26-D: agua con turquesa más puro, espuma de borde duro y destellos (medio y alto); pasto a 14/26/34 m con tramado al borde y tinte base→punta en las hojas. |
| Y1 | hecha (integrada 26-oct) | f5c1f99 | Fichas 26-E y 26-F: `src/engine/ambiente.js` (mapa de zonas 64×64 y partículas en 1 draw call), identidad de color por zona y musgo en el suelo (`terreno.js`), rim suave en NPC y fauna (`actores.rim`). |
| AB1 | pendiente | | |
| AC1 | pendiente | | |
| AD1 | en curso por la otra sesión de la API (`--carriles AD,AG,AH,AI,AJ`) | ed28fbf | Dos sesiones la hacían a la vez; esta paró y dejó sus cambios sin commit y lo medido en PEDIDOS.md (recorrido completo, 2–5,5 min, 177 textos sin EN). |
| AB2 | pendiente | | |
| AC2 | pendiente | | |
| AD2 | pendiente | | |
| AE1 | pendiente | | |
| AF1 | pendiente | | |
| AG1 | pendiente | | |
| AG2 | pendiente | | |
| AH1 | pendiente | | |
| AH2 | pendiente | | |
| AI1 | hecha | 19a4a1c (+ 38d38f7) | `EP5_GDD.md`, `EP5_MISIONES.md` y `EP5_NARRATIVA.md` con el formato del ep. 2: M1 «Mensajes en pedazos» (dos voces en el transmisor, patrones de la luz de la niebla), M2 «Lo que recuerdan las piedras» (las 8 ruinas que ya están en el mapa llenan los huecos de la memoria del Guardián; «sé o supongo»; fichas de martinicana y violacea con las fuentes de `especies.js`), M3 «El relevo» (luz, sonido o tela, ninguno lo maximiza todo; línea de vista determinista; Vittata tiene que pedir ayuda) y formativa q1–q6. NGSS 4-PS4-3, 1-PS4-4, 3-LS4-1, 3-5-ETS1-2 (DEPR por verificar). Se revela quiénes son las voces; 10 decisiones `[KELVIN]` (cómo se presentan, por qué hablan desde ahora, nombres, memoria del Guardián, ruinas…). Solo documentos, sin baterías. 38d38f7 repara 19a4a1c, que se llevó por error cosas que otro carril tenía en el índice (fila C15, 5 filas del tablero y 5 capturas c15): ahora HEAD es igual que cc76d68 más los 3 documentos. |
| AI2 | hecha | dfabd3f | `EP6_GDD.md`, `EP6_MISIONES.md` y `EP6_NARRATIVA.md` con el formato de los eps. 2 y 5: M1 «Cada quien con lo suyo» (visitantes con tarjetas «sabe hacer / necesita», parejas que se cubren), M2 «Nadie lo levanta solo» (tablero del plan con simulación determinista: si Vittata se asigna todo, la tabla queda a medio levantar sin castigo; puestos simultáneos y carga entre dos; planes rápido, que enseña o que descansa, ninguno lo maximiza todo), M3 «El círculo» (mediación en 3 pasos y 36 asientos en 6×6, 4×9, 3×12 o anillo) y formativa q1–q6. NGSS 3-LS2-1, 3-5-ETS1-1, 3-5-ETS1-3, MS-ETS1-4; CCSS 3.OA.A.1, 4.OA.B.4 (DEPR por verificar; conducta en bandada por verificar). 11 decisiones `[KELVIN]` (quiénes llegan, qué es el pacto, asientos de las dos voces, título de Vittata, gancho a la temporada 2…). Solo documentos, sin baterías. |
| AJ1 | pendiente | | |
| AJ2 | pendiente | | |
| AJ3 | pendiente | | |
