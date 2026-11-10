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
| GT-01 | libre | **Ficha de la máquina:** SO, CPU, RAM, **GPU** (modelo) y navegador; confirma que Chrome usa la GPU real (`chrome://gpu`, sin SwiftShader). Si NO hay GPU real, dilo y salta a GT-05. |
| GT-02 | libre | **Las 12 baterías en HEAD con GPU real**, una vez: resultado por batería y errores de consola. Rojos → BUGS.md con el sha. |
| GT-03 | libre | **Modo Escuela (QA-181) con GPU real:** en el sitio publicado, perfil Chromebook (DevTools: CPU ×4 de ralentización, ventana 1366×768) con `?calidad=bajo&escuela=1&fps=1`: FPS medio y peor cuadro 60 s en el spawn y 60 s volando; lo mismo sin `escuela=1`. Una línea por medida. |
| GT-04 | libre | **Combate 2.0 con GPU real:** duelo completo con y sin `?combate2=1` (escritorio y perfil móvil 390×844): FPS medio/peor cuadro, 0 errores, y cualquier cosa que se vea rara (anotar con captura). |
| GT-05 | libre | **Verificación del sitio tras cada publicación** (cada vez que en `TAREAS_WEB.md` aparezca «PUBLICADO»): abrir el juego en el navegador real, partida nueva, volar 1 min, pesca 1 ronda, Construir 1 pieza, Mercadito, duelo de entreno; 0 errores de consola. Una línea por publicación. |
| GT-06 | libre | **Interiores (V18.4) cuando la coordinadora avise:** con `?interiores=1`, entrar/salir del bohío de Villa Raíz, colocar un mueble, salir, recargar y comprobar que sigue; FPS dentro/fuera. |
| GT-07 | libre | **Android/iPhone emulados con GPU real** (perfil Pixel 7, Galaxy S5 con CPU ×4, iPhone 13): Atalayas con textura (no cajas beige), sin cuadraditos, nitidez; FPS. |
| GT-08 | libre | **Baterías extra completas** (`test.sh … --extra`) en HEAD con GPU real: lista de rojos con sha → BUGS.md (prioridad según impacto). Distinguir rojo real de rojo de tiempo/carga repitiendo una vez lo que falle. |
| GT-09 | libre | **Safari de verdad** (si la máquina es Mac: es lo más parecido al iPhone): abrir el sitio en Safari, partida nueva, volar, pesca, Construir, Mercadito, duelo con y sin `?combate2=1`, cotorras en línea; anotar errores de la consola de Safari, lo que se vea distinto a Chrome y FPS con `?fps=1`. |
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
