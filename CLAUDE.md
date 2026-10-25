# Amazona Verse: contexto para cualquier sesión de Claude

Juego 3D de aventura en el navegador, creado por **Kelvin García** (proyecto de Puerto Rico, en marcha desde 2012). La protagonista es **Vittata**, la cotorra puertorriqueña. Es **para niños y jóvenes de todas las edades**. Lo educativo está dentro del juego, pero el gancho es la aventura: «Vuela, explora y salva tu isla con Vittata».

Publicado en https://amazona-verse.vercel.app (juego en `/juego/`). Repo: github.com/Beor18/amazona-verse.

**Equipo fundador:** los nombres y cargos van solo en los créditos de la web (`web/index.html`), por decisión de Kelvin. No los copies en documentos del repo.

**Diversión primero (directiva V8.0).** Es un videojuego de aventura, exploración, creatividad, humor y experiencias en familia. La diversión manda sobre lo educativo: el capítulo 1 no es un curso. Lo educativo sale del juego de forma natural y se ampliará más adelante.

## Reglas de Kelvin (siempre)
- **Público:** nunca escribas «grados 3 a 6» ni vendas el juego como «aprende ciencia». En el Aula los niveles son «Nivel 1» y «Nivel 2».
- **Vittata:** no se cambia, ni el modelo ni el rig.
- **Bandera de Puerto Rico:** siempre fiel, según `docs/BANDERA_PR_GUIA.md`.
- **Calidad comercial:** nada pixelado ni básico. Los anillos de vuelo no van. Sin loot boxes ni presión de compra.
- **Datos educativos:** siempre verificables y con fuente. Nada inventado.
- **Decisiones de canon, historia, arte, dinero y legal:** son de Kelvin. Déjalas anotadas, no las tomes tú.

## Cómo se trabaja
- **Rama:** una sola, **`main`**. Nada de ramas ni worktrees.
  - Si trabajas desde otra computadora, haz `git pull --rebase` antes de empezar y `git push` al terminar cada tarea.
- **Tu tarea:** está en un archivo `docs/equipo/TAREAS_*.md` que te indican al empezar. Quédate en los archivos de tu tarea; los dueños de cada zona están en `docs/equipo/COORDINACION.md`.
- **Commits:** pequeños y solo de tus archivos (`git add` de rutas concretas). Termina el mensaje con la línea `Co-Authored-By` de tu modelo. Si aparece `index.lock`, espera 20 s y reintenta.
- **Pruebas antes de cada commit de código:**
  - `taskpolicy -b nice -n 15 tools/build/build.sh HEAD tools/build/salida/<tu-tarea>-<sha>`, siempre con una carpeta de salida propia. Si dos agentes comparten `salida/HEAD-<sha>`, uno pisa al otro y salen rojos falsos (QA-35).
  - `tools/build/test.sh tools/build/salida/<ref>/ --extra`

  Las 13 baterías tienen que quedar en verde, con 0 errores de consola.
- **Publicación:** solo la hace la sesión coordinadora de Kelvin, y **con su aprobación** (un push a GitHub o a Vercel es público). No toques `sitio/`; se regenera con `tools/build/sitio.sh`.
- **Sin aprobación de Kelvin no hay:** gastos nuevos (créditos de la API incluidos; los topes están en `tools/agente_api/limites.json`), cambios grandes de arquitectura ni cambios de canon. Nunca pongas claves de la API en documentos, mensajes ni archivos del repo.
- **Eficiencia:**
  - No repitas auditorías completas del repo: reutiliza los documentos, las pruebas y los componentes que ya existen.
  - Que dos agentes no investiguen ni hagan lo mismo.
  - Registra cada tarea en `docs/equipo/REGISTRO_TAREAS.md`.
  - Un documento largo no es un resultado: lo que cuenta es lo verificable.
- **Mac:**
  - Nunca uses `python3` del sistema (se cuelga). Usa `~/Applications/Blender.app/Contents/Resources/4.2/python/bin/python3.11 -I`.
  - Procesos pesados con `taskpolicy -b nice -n 15`.
  - No cierres apps de Kelvin.
  - No borres nada de forma permanente: a la Papelera.
  - Nada de descargas, cuentas ni claves sin aprobación de Kelvin.
- **Modelo:**
  - **Fable:** planificación compleja y evaluación creativa.
  - **Opus:** implementación y diagnóstico complejos (motor, gráficos).
  - **Sonnet:** tareas habituales.
  - **Haiku:** verificaciones sencillas.

  Sé breve: lee solo lo necesario.

## Mapa del repo
| Ruta | Qué es |
|---|---|
| `src/engine/` | Motor propio (Three.js r128): render, terreno, física, cámara, streaming, guardado, audio |
| `src/game/` | Gameplay: misiones, Diario, Aula, cómic, criadero, creador |
| `src/personaje/` | Vittata, ropero y accesorios |
| `src/ui/` | Interfaz |
| `content/cap1/` | Contenido del capítulo 1: historia, misiones, diálogos, paradas, lecciones, mundo |
| `content/comun/` | Datos compartidos (huevos, especies) |
| `web/` | Landing del producto |
| `sitio/` | Lo que publica Vercel (generado) |
| `tools/build/` | Build y pruebas |
| `tools/agente_api/` | Ejecutor con créditos de API |
| `tools/blender/` | Pipeline de arte |

**Documentos que conviene leer:**
- `ROADMAP.md`: qué falta y fechas.
- `docs/COMO_TRABAJAMOS_CON_IA.md`: cómo pedir cosas a la IA, los límites y cómo funciona el consumo.
- `docs/equipo/CAP1_PENDIENTE.md`: lo que falta para cerrar el capítulo 1.
- `docs/equipo/BUGS.md`
- `docs/ARQUITECTURA.md`
- `docs/STORY_BIBLE.md`: la historia y la temporada 1.
- `docs/DECISION_LOG.md`

## Al terminar
Marca tu tarea como hecha en su archivo `TAREAS_*.md`, con el commit y una línea de resultado, y avisa a Kelvin con un resumen de 3 líneas.
