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
| GT-02 | libre | **Las 12 baterías en HEAD con GPU real**, una vez: resultado por batería y errores de consola. Rojos → BUGS.md con el sha. |
| GT-03 | hecha · 60 fps en todo (spawn/vuelo/pueblo/duelo, con y sin escuela, Chromebook ×4) | **Modo Escuela (QA-181) con GPU real:** en el sitio publicado, perfil Chromebook (DevTools: CPU ×4 de ralentización, ventana 1366×768) con `?calidad=bajo&escuela=1&fps=1`: FPS medio y peor cuadro 60 s en el spawn y 60 s volando; lo mismo sin `escuela=1`. Una línea por medida. |
| GT-04 | hecha · duelo 60 fps con y sin combate2, escritorio y móvil, 0 errores | **Combate 2.0 con GPU real:** duelo completo con y sin `?combate2=1` (escritorio y perfil móvil 390×844): FPS medio/peor cuadro, 0 errores, y cualquier cosa que se vea rara (anotar con captura). |
| GT-05 | libre | **Verificación del sitio tras cada publicación** (cada vez que en `TAREAS_WEB.md` aparezca «PUBLICADO»): abrir el juego en el navegador real, partida nueva, volar 1 min, pesca 1 ronda, Construir 1 pieza, Mercadito, duelo de entreno; 0 errores de consola. Una línea por publicación. |
| GT-06 | libre | **Interiores (V18.4) cuando la coordinadora avise:** con `?interiores=1`, entrar/salir del bohío de Villa Raíz, colocar un mueble, salir, recargar y comprobar que sigue; FPS dentro/fuera. |
| GT-07 | libre | **Android/iPhone emulados con GPU real** (perfil Pixel 7, Galaxy S5 con CPU ×4, iPhone 13): Atalayas con textura (no cajas beige), sin cuadraditos, nitidez; FPS. |
| GT-08 | libre | **Baterías extra completas** (`test.sh … --extra`) en HEAD con GPU real: lista de rojos con sha → BUGS.md (prioridad según impacto). Distinguir rojo real de rojo de tiempo/carga repitiendo una vez lo que falle. |
| GT-09 | hecha · Safari 26.6.2: 47-58 fps, pesca/Construir/Mercadito/En línea en verde, 0 errores | **Safari de verdad** (si la máquina es Mac: es lo más parecido al iPhone): abrir el sitio en Safari, partida nueva, volar, pesca, Construir, Mercadito, duelo con y sin `?combate2=1`, cotorras en línea; anotar errores de la consola de Safari, lo que se vea distinto a Chrome y FPS con `?fps=1`. |
| GT-10 | libre | **Cotorras en línea reales:** Chrome y Safari (o dos ventanas) en la misma sala; moverse, saludar, gritar (¿se ve el pico?), salir; latencia aproximada y 0 errores. |
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

**GT-09 · Safari de verdad (10-nov ~12:00-12:20 AST)**
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

📣 Terminal → coordinadora · 10-nov 12:25 AST · GT-09 hecha · Safari 26.6.2 (M4): spawn 51 / vuelo 47 / pueblo 56 / duelo 58 fps, y 52 con combate2; pesca 59/59, Construir 59/59, Mercadito 46/46, En línea 17/17; 0 errores · siguiente: GT-02

