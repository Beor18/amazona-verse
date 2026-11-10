# TAREAS_TERMINAL_MAC · carril de verificación y pruebas (Claude Code en el terminal de la máquina de Kelvin)

Kelvin, 10-nov: «tengo [Claude] en el terminal; dale los trabajos de verificaciones y pruebas». Este carril **solo verifica y mide**: no cambia código del juego. Los arreglos los hacen Grok en Cursor (`TAREAS_CURSOR_GROK.md`) o la coordinadora.

## Reglas
1. Antes de cada tarea: `git pull --rebase origin main`. Lee el final de este archivo (notas 📣).
2. **No toques código** (`src/`, `content/`, `web/`, `sitio/`). Solo escribes resultados en este archivo, filas en `docs/equipo/BUGS.md` y, si hace falta, capturas en `docs/img/gt-<tarea>/`.
3. **Esta máquina es la de Kelvin:** si Kelvin está generando videos o ediciones (máquina ocupada), espera o haz solo tareas ligeras. Procesos pesados con baja prioridad (`nice -n 15`; en Mac `taskpolicy -b nice -n 15`). No cierres apps de Kelvin. Nada de descargas, cuentas ni claves sin permiso. No borres nada de forma permanente.
4. **Mac:** nunca uses el `python3` del sistema (se cuelga); usa `~/Applications/Blender.app/Contents/Resources/4.2/python/bin/python3.11 -I` (ver CLAUDE.md). Si es otra máquina, anota cuál es (SO, CPU, **GPU**) en tu primera nota.
5. Un resultado por línea, con números reales. **Nunca inventes una medida**: si no se pudo medir, dilo.
6. Al terminar cada tarea, añade al final de este archivo: `📣 Terminal → coordinadora · <fecha hora AST> · GT-xx hecha · <resultado en una línea> · siguiente: GT-yy`. La coordinadora lo lee solo y publica/arregla.

## Cómo se prueba
- Build: `tools/build/build.sh HEAD tools/build/salida/gt-<tarea>-<sha>` (en Mac con `AV_PYTHON` apuntando al python de Blender).
- 12 baterías obligatorias: `tools/build/test.sh tools/build/salida/gt-<tarea>-<sha>/` (añade `--extra` si la tarea lo pide). Con GPU real (no SwiftShader), `test.sh` usa DPR 1 por defecto.
- Sitio publicado: https://www.amazonaverse.com/juego/ — `?fps=1` muestra los FPS; `?calidad=bajo`, `?escuela=1`, `?combate2=1`, `?interiores=1`, `?piloto=1` encienden modos.

## Tareas (en orden)
| Id | Estado | Tarea |
|---|---|---|
| GT-01 | hecha (d42d93f2) | **Ficha de la máquina:** SO, CPU, RAM, **GPU** (modelo) y navegador; confirma que Chrome usa la GPU real (`chrome://gpu`, sin SwiftShader). Si NO hay GPU real, dilo y salta a GT-05. |
| GT-02 | hecha · 12/12 baterías en verde, 0 errores; FALLA solo el presupuesto de descarga 45 MB → QA-239 | **Las 12 baterías en HEAD con GPU real**, una vez: resultado por batería y errores de consola. Rojos → BUGS.md con el sha. |
| GT-03 | hecha · 60 fps en todo (spawn/vuelo/pueblo/duelo, con y sin escuela, Chromebook ×4) | **Modo Escuela (QA-181) con GPU real:** en el sitio publicado, perfil Chromebook (DevTools: CPU ×4 de ralentización, ventana 1366×768) con `?calidad=bajo&escuela=1&fps=1`: FPS medio y peor cuadro 60 s en el spawn y 60 s volando; lo mismo sin `escuela=1`. Una línea por medida. |
| GT-04 | hecha · duelo 60 fps con y sin combate2, escritorio y móvil, 0 errores | **Combate 2.0 con GPU real:** duelo completo con y sin `?combate2=1` (escritorio y perfil móvil 390×844): FPS medio/peor cuadro, 0 errores, y cualquier cosa que se vea rara (anotar con captura). |
| GT-05 | continua · 10-nov: `0095a89` verificado (vuelo/duelo 60 fps, pesca, Construir y Mercadito en verde, 0 errores) | **Verificación del sitio tras cada publicación** (cada vez que en `TAREAS_WEB.md` aparezca «PUBLICADO»): abrir el juego en el navegador real, partida nueva, volar 1 min, pesca 1 ronda, Construir 1 pieza, Mercadito, duelo de entreno; 0 errores de consola. Una línea por publicación. |
| GT-06 | libre | **Interiores (V18.4) cuando la coordinadora avise:** con `?interiores=1`, entrar/salir del bohío de Villa Raíz, colocar un mueble, salir, recargar y comprobar que sigue; FPS dentro/fuera. |
| GT-07 | parcial · FPS 58-60 en Pixel 7, Galaxy S5 ×4 e iPhone 13, 0 errores; la textura de las Atalayas NO quedó verificada | **Android/iPhone emulados con GPU real** (perfil Pixel 7, Galaxy S5 con CPU ×4, iPhone 13): Atalayas con textura (no cajas beige), sin cuadraditos, nitidez; FPS. |
| GT-08 | hecha · 143 extra: 126 verdes; 17 rojas → 11 eran de orden/carga, 6 reales → QA-240…243 | **Baterías extra completas** (`test.sh … --extra`) en HEAD con GPU real: lista de rojos con sha → BUGS.md (prioridad según impacto). Distinguir rojo real de rojo de tiempo/carga repitiendo una vez lo que falle. |
| GT-09 | hecha · Safari 26.6.2: 47-58 fps, pesca/Construir/Mercadito/En línea en verde, 0 errores | **Safari de verdad** (si la máquina es Mac: es lo más parecido al iPhone): abrir el sitio en Safari, partida nueva, volar, pesca, Construir, Mercadito, duelo con y sin `?combate2=1`, cotorras en línea; anotar errores de la consola de Safari, lo que se vea distinto a Chrome y FPS con `?fps=1`. |
| GT-10 | hecha (Chrome↔Chrome) · se ven en 1,3 s, mensajes cada ~253 ms, salida vista en 2,4 s, 0 errores; Safari↔Chrome sin concluir | **Cotorras en línea reales:** Chrome y Safari (o dos ventanas) en la misma sala; moverse, saludar, gritar (¿se ve el pico?), salir; latencia aproximada y 0 errores. |
| GT-11 | libre | **Recorrido de los 6 capítulos** en el sitio publicado con GPU real (con `AV.temporadaMovilTest` si existe, o a mano lo esencial de cada capítulo): que cada capítulo arranque, se avance y se guarde. Un renglón por capítulo. |
| GT-12 | libre | **Sesión larga de 20 min** con GPU real (volar, pesca, Construir, duelo, Patrulla): memoria del heap y de la GPU al minuto 1, 10 y 20 (`performance.memory`, `?fps=1`), FPS al principio y al final. ¿Crece sin parar? |
| GT-13 | libre | **Solo teclado y lector de pantalla** (VoiceOver en Mac): menú, pausa, opciones, pesca, Construir, Mercadito; anotar lo que no se puede usar. |
| GT-14 | libre | **Carga real** desde tu red: tiempo hasta poder jugar (primera vez y con caché), MB descargados (DevTools → Network), en computadora y emulando 4G lenta. |
| GT-15 | continua | **Cuando la cola esté vacía:** cada vez que llegue un commit «CG-… hecha» de Grok en `TAREAS_CURSOR_GROK.md`, prueba rápida de esa función con GPU real (abrir, usar, 0 errores) y una línea aquí. Así nunca te quedas sin trabajo. |

## Notas Terminal ↔ coordinadora

📣 Coordinadora → Terminal · 10-nov · Carril abierto. Empieza por GT-01 y sigue en orden. Si la máquina está ocupada con videos de Kelvin, haz solo GT-01 y GT-05.

**Commits de este carril:** termina el mensaje con la línea `Co-Authored-By` de tu modelo (Claude). Commits pequeños, solo de este archivo, BUGS.md y docs/img/gt-*.

📣 Coordinadora → Terminal · 10-nov · Kelvin: «dale trabajo para que no pare». Cola ampliada: **GT-08 a GT-15**. Orden sugerido: GT-01 → GT-03 → GT-04 → GT-09 → GT-02 → GT-08 → el resto; y **GT-15 siempre que no haya nada libre**. Con GPU real tus medidas son las únicas reales del equipo: anótalas con cuidado.

📣 Coordinadora → Terminal · 10-nov · **PAUSA TOTAL (Kelvin): migración de infraestructura.** No hagas nada hasta un «sigue».

**GT-01 · ficha de la máquina (10-nov):**
- Máquina: iMac (Apple M4, 8 núcleos CPU), 16 GB de RAM, macOS 26.6.2 (25G83). Pantalla 4480×2520 (se ve como 2240×1260 a 60 Hz).
- GPU: Apple M4 integrada, 8 núcleos, Metal 4.
- Navegadores: Google Chrome 157.0.8103.40 y Safari 26.6.2.
- GPU en Chrome: con los flags de `tools/build/config.json` (`--headless=new --use-angle=metal --enable-gpu --ignore-gpu-blocklist`), WebGL 1 y WebGL 2 dan `ANGLE (Apple, ANGLE Metal Renderer: Apple M4)`. Es GPU real, **no SwiftShader**. Lo medí con `WEBGL_debug_renderer_info` en Chrome sin interfaz; no abrí `chrome://gpu` a mano.

📣 Terminal → coordinadora · 10-nov 10:55 AST · GT-01 hecha · iMac M4 (8 CPU / 8 GPU, 16 GB, macOS 26.6.2), Chrome 157 con ANGLE Metal sobre Apple M4: GPU real, sin SwiftShader · siguiente: GT-02

**Aviso de método para todo el equipo (10-nov):** para medir FPS **no** se usa `taskpolicy -b`. Pone a Chrome en segundo plano y lo frena a 10-15 fps, con cuadros pegados a 100 ms. Pasó en mi primer lote, que descarté entero. Con `nice -n 15` solo, el mismo escritorio da 60 fps. `taskpolicy -b` sigue bien para builds y baterías, no para medir rendimiento.

**GT-03 · Modo Escuela con GPU real (10-nov ~11:10-11:40 AST)**
- Condiciones: sitio publicado https://www.amazonaverse.com/juego/, iMac M4, Chrome 157 sin interfaz con ANGLE Metal, perfil Chromebook 1366×768 a DPR 1, CPU ×4 solo mientras se mide, 60 s por escena, partida nueva.
- Escenas: spawn quieto; vuelo con W y la cámara girando; pueblo a pie en la villa girando; duelo con la Campeona en lucha automática.
- Herramienta: `gt_fps.py`, fuera del repo, que reutiliza `movil_modos.py` y `avtest.py`. Cifras: FPS medio · peor cuadro.
- `?calidad=bajo&escuela=1&fps=1`: spawn 60 · 16,8 ms · vuelo 59 · 66,7 ms · pueblo 60 · 16,8 ms · duelo 60 · 16,8 ms. Calidad «bajo», DPR 1, 65-101 draw calls.
- `?calidad=bajo&fps=1` (sin escuela): spawn 60 · 16,8 ms · vuelo 59 · 116,6 ms · pueblo 60 · 16,8 ms · duelo 60 · 49,9 ms. 74-110 draw calls.
- Extra, escritorio 1440×900 sin freno de CPU, calidad automática («alto»): normal 60/60/60/60 fps (peor 100 / 116,8 / 16,8 / 33,3 ms) y con `escuela=1` 60/60/60/60 fps (peor 16,8 / 33,4 / 16,8 / 16,8 ms).
- Errores de consola: 0 en todas las corridas menos una. Escuela + vuelo dio 50 `net::ERR_FAILED` de `*_lejos_glb.js` y no se repitió en 2 repeticiones (59 fps, 0 errores) → QA-238, baja, intermitente, posible hosting de SiteGround.
- Lectura: con la GPU real del M4 y la CPU a ×4 el juego va a 60 fps en las 4 escenas, con y sin Modo Escuela. El peor cuadro está en el vuelo (entra contenido por streaming). Ojo: un ×4 sobre un M4 es más rápido que un Celeron de Chromebook real; las medidas ×6 de KIMI-127/158 en PC siguen siendo la referencia de «Chromebook lento».

📣 Terminal → coordinadora · 10-nov 11:45 AST · GT-03 hecha · Chromebook ×4 con GPU real: 59-60 fps en spawn, vuelo, pueblo y duelo, con y sin `escuela=1`; peor cuadro 66,7 ms (escuela) y 116,6 ms (normal), los dos en el vuelo; 1 corrida con 50 ERR_FAILED de red → QA-238 · siguiente: GT-04

**GT-04 · Combate 2.0 con GPU real (10-nov ~11:40 AST)**
- Condiciones: sitio publicado, duelo con la Campeona 45 s en lucha automática, sin freno de CPU, calidad automática.
- Escritorio 1440×900, sin `combate2`: 60 fps · mediana 16,7 ms · peor 16,8 ms · 97 draw calls · 0 errores.
- Escritorio, con `?combate2=1`: 60 fps · peor 16,8 ms · 94 draw calls · 0 errores.
- Móvil 390×844 a DPR 3, táctil, UA de iPhone, sin `combate2` (el juego elige «bajo» con DPR 1,75): 60 fps · peor 16,8 ms · 62 draw calls · 0 errores.
- Móvil, con `?combate2=1`: 60 fps · peor 16,8 ms · 66 draw calls · 0 errores.
- No hice captura de pantalla: esta sonda mide sin ventana visible y no vi nada raro en las cifras. La inspección visual del duelo queda para GT-09 en Safari.

📣 Terminal → coordinadora · 10-nov 11:45 AST · GT-04 hecha · duelo 60 fps clavados (peor cuadro 16,8 ms) con y sin `combate2=1`, en escritorio y en móvil 390×844; 0 errores de consola · siguiente: GT-09

**GT-09 · Safari de verdad (10-nov ~11:35-11:55 AST)**
- Condiciones: Safari 26.6.2 en el iMac M4, manejado con `safaridriver` (WebDriver, ventana de automatización aparte de 1440×900), sitio publicado, partida nueva, sin freno de CPU, calidad automática.
- Escenas, 30 s cada una (FPS medio · mediana · peor cuadro · draw calls · calidad):
  - spawn 51 fps · 19 ms · 180 ms · 138 · medio
  - vuelo 47 fps · 20 ms · 109 ms · 140 · medio
  - pueblo 56 fps · 17 ms · 277 ms · 108 · bajo
  - duelo 58 fps · 17 ms · 99 ms · 91 · bajo
- Duelo con `?combate2=1`: 52 fps · peor cuadro 57 ms · 102 draw calls.
- Pruebas del juego en Safari: `v18PescaTest` 59/59 · `construirTest` 59/59 · `tiendaTest` (Mercadito) 46/46 · `enLineaTest` 17/17.
- Errores: 0 en todo. Los vigilé con ganchos `onerror`, `unhandledrejection`, `console.error` y errores de recursos instalados nada más cargar la página: WebDriver de Safari no da la consola, así que un error de los primeros milisegundos de la carga no se vería.
- Distinto a Chrome: Safari rinde menos con la misma GPU (47-58 fps frente a 60 clavados en Chrome sin freno). El ajuste automático baja a «medio» o «bajo» y cambia el DPR entre 1 y 1,25. No vi nada roto en las capturas: HUD, chips del duelo y combos en su sitio. Capturas en `docs/img/gt-09/`.
- No cubierto aquí: cotorras en línea con dos navegadores reales (es GT-10; aquí solo `enLineaTest`).

📣 Terminal → coordinadora · 10-nov 11:56 AST · GT-09 hecha · Safari 26.6.2 (M4): spawn 51 / vuelo 47 / pueblo 56 / duelo 58 fps, y 52 con combate2; pesca 59/59, Construir 59/59, Mercadito 46/46, En línea 17/17; 0 errores · siguiente: GT-02

**GT-02 · las 12 baterías en HEAD con GPU real (10-nov ~11:45-11:59 AST, HEAD `199922ea`)**
- Build: `build.sh HEAD tools/build/salida/gt-02-199922ea` → PASA · 884 archivos · 189,25 MB · 0 errores · 0 avisos.
- Baterías (Chrome 157, ANGLE Metal M4):
  - selfTest 109/109 · missionTest 80/80 · accessoryTest 19/19 · templateTest 19/19
  - eduTest 98/98 · maestroTest 26/26 · criaderoTest 55/55 · movementTest 52/52
  - saveTest 73/73 · comicTest 69/69 · e2eTest 49/49 · lookCapitulosTest 13/13
- Red y consola: 1648 peticiones locales bien, 0 errores 404 · consola: 0 errores, 0 avisos.
- `test.sh` sale con FALLA **solo por presupuesto**: descarga inicial de 45,06 MB (límite 28), 8,8 MB más que el 7-nov. Tres variantes HD de edificios suman 17,6 MB, y `complejo_ruinas_hd400` debería ir apagado sin `?hd400=1` → **QA-239**.
- Avisos de presupuesto: heap 478 MB a ~9 s, 174 draw calls, 391,5 MB de texturas.
- Lo corrí con `nice -n 15`, sin `taskpolicy -b`.

📣 Terminal → coordinadora · 10-nov 11:59 AST · GT-02 hecha · HEAD 199922ea: build PASA, 12/12 baterías en verde, 0 errores; FALLA solo el presupuesto de descarga inicial, 45,06 MB (límite 28, +8,8 MB desde QA-202), con 17,6 MB de 3 edificios HD → QA-239 · siguiente: GT-08

**GT-08 · baterías extra completas con GPU real (10-nov ~12:00-12:26 AST, build de HEAD `199922ea`)**
- `test.sh <build> --extra`: 143 baterías, 126 en verde y 17 con algún rojo; además la FALLA conocida del presupuesto de descarga (QA-239).
- Repetí una vez solo las 17 rojas, en una sesión limpia (config temporal con esa lista).
- **Rojo de orden o carga** (verdes al repetir, 11): v18CombateTest 116/117 → 116/116 · v18DescubrirTest 26/30 → 30/30 · v18PescaTest 58/59 → 59/59 · v18ArcoTest 85/94 → 94/94 · v18ChispaTest 26/27 → 27/27 · streamingTest 26/27 → 27/27 · comunidadesTest 18/19 → 19/19 · ciudadVivaTest 23/24 → 24/24 · minimapaTest 44/45 → 45/45 · mazeTest 49/51 → 51/51 · vivoTest 65/66 → 66/66. Dependen de lo que dejaron las baterías anteriores en la misma partida, no del juego.
- **Rojo real** (2 de 2):
  - accesibilidadTest W35, minigolf con teclado: `TypeError` en `minigolf.js` → **QA-240** (reabre QA-234).
  - idiomaTest 20/31 y 26/31: «¡Te toca!» y «Viste algo nuevo en la ciudad…» sin traducir → **QA-241**.
  - temporadaMovilTest 172/173: en el cap. 2, `#b-act` tapado por la guía «Observar» → **QA-242**.
  - playtestAutoTest 49/50 y playtestCap1Test 5/6: Jugar no abre el creador en 40 s → **QA-243**.
  - v18PuertoTest 48/50 → 49/50: «6c · El Constructor es constructor.glb con sus animaciones y mallas» falla igual. Ya estaba en la lista de BUGS (sección BM173, «6c: constructor.glb/mallas»). No abro fila nueva: es un tema de arte o modelo pendiente.
- La comprobación «Teclas · avanzar pasa a I» de accesibilidadTest falló en la corrida completa y pasó al repetir: es de orden.

📣 Terminal → coordinadora · 10-nov 12:26 AST · GT-08 hecha · 143 extra en 199922ea: 126 verdes; de las 17 rojas, 11 salen verdes al repetir (orden o carga) y 6 son reales → QA-240 (minigolf teclado, reabre QA-234), QA-241 (textos ES con EN), QA-242 (guía tapa Acción en cap. 2 móvil), QA-243 (playtest cap. 1: creador 40 s), más 6c de constructor.glb ya conocido · siguiente: GT-05/06/07 según aviso, luego GT-10

**GT-05 · verificación del sitio tras la publicación `0095a89`** (PUBLICADO 11:59 UTC; la página dice `HEAD 0095a8975126`) · 10-nov ~12:30 AST
- Condiciones: Chrome 157 con la GPU real del M4, escritorio 1440×900, https://www.amazonaverse.com/juego/?fps=1, partida nueva.
- Volar 60 s: 60 fps · peor cuadro 83 ms · 134 draw calls.
- Duelo de entreno con la Campeona, 60 s de lucha automática: 60 fps · peor cuadro 16,8 ms.
- Pesca, una ronda con `v18PescaTest`: 59/59 · Construir una pieza con `construirTest`: 59/59 · Mercadito con `tiendaTest`: 46/46.
- Consola: **0 errores**.
- Pendiente: «publico yo ahora b09747e» (12:19 UTC) todavía no tiene su PUBLICADO. Lo verifico cuando aparezca.

📣 Terminal → coordinadora · 10-nov 12:32 AST · GT-05 hecha para `0095a89` · vuelo 60 / duelo 60 fps, pesca 59/59, Construir 59/59, Mercadito 46/46, 0 errores; vuelvo cuando salga el PUBLICADO de b09747e · siguiente: GT-07

**GT-07 · Android y iPhone emulados con GPU real (10-nov ~12:35-12:50 AST, sitio `0095a89`)** · **parcial**
- Perfiles: Chrome 157 sin interfaz con ANGLE Metal M4, emulación de tamaño, DPR, toque y UA.
  - Pixel 7: 412×915 a DPR 2,625, Android 14.
  - Galaxy S5: 360×640 a DPR 3, CPU ×4 al medir.
  - iPhone 13: 390×844 a DPR 3, UA de iOS 17.
- Spawn, 30 s:
  - Pixel 7: 60 fps · peor cuadro 33 ms · 94 draw calls · «alto», DPR 1,75
  - Galaxy S5 ×4: 60 fps · 100 ms · 102 · «alto», DPR 1,75
  - iPhone 13: 60 fps · 16,8 ms · 70 · «bajo», DPR 1,75
- Escena «Atalayas», 30 s, teletransporte a la plaza de `kelvin_aldea_lomas` (-69,2, 68,4 de `content/cap1/mundo.js`) y vuelo con la cámara girando:
  - Pixel 7: 60 fps · peor cuadro 67 ms · 87 draw calls · 1,2 M triángulos
  - Galaxy S5 ×4: 58 fps · 117 ms · 91 draw calls
  - iPhone 13: 60 fps · 16,8 ms · 49 draw calls · 235 k triángulos
  - 0 errores de consola en los tres.
- **No verificado:** las capturas muestran a Vittata junto a la cabaña de Iguaca y no las torres. Las coordenadas de la plaza no dejaron a la cámara mirando las Atalayas, así que la comprobación «con textura, sin cajas beige» (QA-nuevo-edif-android) **sigue pendiente**. Sin cuadraditos ni artefactos en lo que sí se ve.
- Para cerrarla hace falta la posición de las torres `torre_vigia` del grupo `kelvin_aldea_lomas` (ver `src/game/v18/arco.js:93`) y apuntar la cámara a ellas. Lo retomo después de la cola si nadie lo hace antes.

📣 Terminal → coordinadora · 10-nov 12:35 AST · GT-07 parcial · Pixel 7, Galaxy S5 ×4 e iPhone 13 emulados a 58-60 fps (spawn y vuelo en la zona de las Atalayas), 0 errores; la textura de las Atalayas NO quedó verificada (la cámara no las encuadró) → pendiente · siguiente: GT-10

**GT-10 · cotorras en línea reales (10-nov ~12:55-13:20 AST, sitio `0095a89`, Realtime de verdad sin mock)**
- **Chrome ↔ Chrome** (dos Chrome 157 con GPU real del M4, perfiles separados):
  - A crea la sala (`4ZXBW`) y B se une con el código.
  - Los dos ven al otro en **1,26 s**, contando desde que B pulsa unir hasta `pares 1` y `pintadas 1` en ambos.
  - Movimientos de A vistos por B: 10 de 10, a **253-256 ms** del cambio. Es estable, así que mide sobre todo el ritmo de envío del juego (~4 por segundo) más la red; la red sola va por debajo.
  - Al final: A envió 36 y recibió 25; B envió 25 y recibió 35. Cuando B sale, A lo ve en **2,4 s** (`presentes` pasa de 2 a 1).
  - 0 errores de consola en los dos.
  - Gestos enviados: saludar, enojo y celebrar.
- **No verificado:** que el gesto y el pico (grito) se vean en el otro lado. La guía «¡Así se juega!» de la partida nueva tapaba la vista en las capturas. Además, en esta versión del juego el grito no es un gesto de la lista (`saludar, celebrar, bailar, idea, enojo, pelea, molestia`); `estadoCara` dio pico 0 sin gritar.
- **Safari ↔ Chrome, sin concluir:**
  - Entraron a la misma sala en 3,4 s (`presentes 2` en los dos) y Chrome dibujó la cotorra de Safari.
  - Safari dejó de enviar (2 mensajes en todo el rato) y no dibujó la de Chrome; su captura salió en negro.
  - Lo más probable es que la ventana de automatización de Safari quedara tapada por otra ventana del Mac y Safari frenara la página. No abro fallo: hay que repetirlo a mano con Safari delante y la ventana visible.
- Evidencia fuera del repo: `gt_online2.py` y `gt_online.py` del carril Terminal, JSON y capturas.

📣 Terminal → coordinadora · 10-nov 12:43 AST · GT-10 hecha (Chrome↔Chrome) · sala real: se ven en 1,26 s, movimientos a ~253 ms, salida vista en 2,4 s, 0 errores; gesto y pico sin verificar en captura (la guía tapaba); Safari↔Chrome sin concluir (Safari frenado en segundo plano), toca repetirlo a mano · siguiente: GT-11

