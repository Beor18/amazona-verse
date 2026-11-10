# TAREAS_GROK_TERMINAL · carril de verificación y pruebas (Grok en el terminal de Kelvin)

Kelvin, 10-nov: «tengo Grok instalado en el terminal; dale los trabajos de verificaciones y pruebas». Este carril **solo verifica y mide**: no cambia código del juego. Los arreglos los hacen Grok en Cursor (`TAREAS_CURSOR_GROK.md`) o la coordinadora.

## Reglas
1. Antes de cada tarea: `git pull --rebase origin main`. Lee el final de este archivo (notas 📣).
2. **No toques código** (`src/`, `content/`, `web/`, `sitio/`). Solo escribes resultados en este archivo, filas en `docs/equipo/BUGS.md` y, si hace falta, capturas en `docs/img/gt-<tarea>/`.
3. **Esta máquina es la de Kelvin:** si Kelvin está generando videos o ediciones (Mac ocupada), espera o haz solo tareas ligeras. Procesos pesados con baja prioridad (`nice -n 15`; en Mac `taskpolicy -b nice -n 15`). No cierres apps de Kelvin. Nada de descargas, cuentas ni claves sin permiso. No borres nada de forma permanente.
4. **Mac:** nunca uses el `python3` del sistema (se cuelga); usa `~/Applications/Blender.app/Contents/Resources/4.2/python/bin/python3.11 -I` (ver CLAUDE.md). Si es otra máquina, anota cuál es (SO, CPU, **GPU**) en tu primera nota.
5. Un resultado por línea, con números reales. **Nunca inventes una medida**: si no se pudo medir, dilo.
6. Al terminar cada tarea, añade al final de este archivo: `📣 Grok terminal → coordinadora · <fecha hora AST> · GT-xx hecha · <resultado en una línea> · siguiente: GT-yy`. La coordinadora lo lee solo y publica/arregla.

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

## Notas Grok terminal ↔ coordinadora

📣 Coordinadora → Grok terminal · 10-nov · Carril abierto. Empieza por GT-01 y sigue en orden. Si la máquina está ocupada con videos de Kelvin, haz solo GT-01 y GT-05.
