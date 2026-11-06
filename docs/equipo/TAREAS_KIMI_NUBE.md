# Tareas de Kimi 4 (en la nube, sin tarjeta gráfica)

Kimi 4 trabaja desde la web, con acceso al repo y **sin GPU**. Lo que necesita tarjeta gráfica (FPS, videos, pruebas con el juego abierto, edificios 3D) es de Kimi 1, 2 y 3 en la PC (`TAREAS_KIMI.md`). Kimi 4 hace lo que se puede con texto y código.

## Antes de empezar
1. Lee `CLAUDE.md` (reglas de Kelvin y cómo se trabaja) y este archivo entero.
2. `git pull --rebase origin main` antes de cada tarea y antes de cada `git push`.
3. Toma la primera tarea `libre` de la tabla, cambia su estado a `EN CURSO - Kimi 4 - <fecha y hora UTC>`, haz commit y push de ese cambio. Así nadie la repite.
4. Al terminar, escribe en el estado: `hecha · <commit> · <una línea de resultado>`.

## Reglas
- **Rama única:** `main`. Commits pequeños y solo de tus archivos (`git add` con rutas concretas). Si el push falla, `git pull --rebase` y reintenta; nunca `--force`.
- **No toques:** `sitio/` (solo se publica desde la coordinadora), `src/engine/` (motor), modelos 3D, `assets/`, nada de Supabase, claves ni gastos.
- **No toques archivos que otra sesión tiene EN CURSO:** mira `TAREAS_WEB.md` (otra cuenta de Claude), `TAREAS_KIMI.md` y `TAREAS_API.md` (Mac).
  - Ahora mismo están ocupados: `src/game/v18/minigolf.js`, `src/game/v18/evolucion.js`, `src/game/v18/habilidades.js` y `combate.js`.
- **Decisiones de Kelvin:** canon, historia, arte, datos educativos y lo legal son suyos. Tú **propones** en un documento; no cambias el contenido del juego por tu cuenta.
- **Público:**
  - Nunca escribas «grados 3 a 6».
  - Los datos educativos van siempre con fuente verificable, sin inventar nada.
- **Si tocas código del juego**, explica en la fila cómo lo comprobaste. La coordinadora pasa las pruebas con navegador antes de publicar.
- Registra cada tarea terminada en `docs/equipo/REGISTRO_TAREAS.md` (una línea).

## Tareas

| Id | Estado | Qué | Criterio de cierre |
|---|---|---|---|
| K4-01 | libre | **«grados 3-6» en los datos.** `content/*/lecciones.js` tiene campos `"grados": "3-6"`. Busca si ese texto se muestra en algún lugar del juego, del Aula, del Modo Maestro, de la web (`web/`) o de las exportaciones. | Informe en `docs/equipo/K4_GRADOS.md`: dónde aparece, si se ve en pantalla y la propuesta (cambiar a «Nivel 1 / Nivel 2» o borrarlo). Si se ve en pantalla, arréglalo y di cómo lo comprobaste. |
| K4-02 | libre | **Fuentes para las fichas educativas sin verificar.** Cap. 1: 15 de 23 fichas en «parcial» o «por_verificar» (`content/cap1/lecciones.js`). Cap. 2: la casa criolla (E9). Cap. 3: la etimología de «canoa» y CG-51. Cap. 6: la ficha «esperan». | Por ficha: la afirmación, una o dos fuentes verificables (enlace + qué dice) y tu propuesta de estado, en `docs/equipo/K4_FUENTES.md`. **No cambies las fichas:** decide Kelvin. |
| K4-03 | libre | **Revisión del inglés** de `content/ep2/en.js`, `ep3/en.js` y `ep5/en.js`. Los episodios 4 y 6 ya se revisaron el 5-nov. Busca frases en español sin traducir, errores de gramática y tono raro para niños. | Arreglos menores directos (uno por commit); lo dudoso, en una lista al final de la fila. Marca y Eco, Nudo, Brote y Marea se quedan en español cuando son nombres propios (DECISION_LOG 6-nov). |
| K4-04 | libre | **Documentos desfasados.** Ponlos al día con el código y los commits reales, sin inventar: `docs/equipo/V18_TABLERO.md` (faltan el minigolf, las cotorras del 5 y 6-nov y la V18.2), `ROADMAP.md` (sección «Dónde estamos», 3-nov) y las filas de `BUGS.md` ya resueltas pero sin marcar (por ejemplo QA-89 o QA-156 b). Usa `docs/equipo/ESTADO_REAL.md` (6-nov) como guía. | Un commit por documento, cada cambio con su commit de respaldo. |
| K4-05 | libre | **Revisión de código de `src/game/v18/`** (solo lectura, excepto los archivos ocupados): `progreso.js`, `reparar.js`, `amenaza.js`, `descubrir.js`, `ciclo.js`, `nuevas.js` y `duelo2.js`. Busca errores reales: variables sin definir, fugas de oyentes, guardados que pueden duplicar premios o textos sin inglés. | Hallazgos en `BUGS.md` con id nuevo (mira el último QA-1xx), archivo:línea y propuesta. No arregles en archivos ocupados. |
| K4-06 | libre | **Textos para niños de 7 a 10 años en la V18.1.** Avisos y paneles de `src/game/v18/*.js` y sus traducciones en `content/cap1/en.js`. Marca lo largo, lo técnico o lo confuso (por ejemplo «Par 3» sin explicar). | Lista con propuesta de texto corto en `docs/equipo/K4_TEXTOS_V18.md`; la coordinadora decide qué aplicar. |
| K4-07 | libre | **Guía para el playtest con niños** (permiso de los padres, sin datos personales): qué observar en cada capítulo y en la demo `?v18=1`, preguntas sencillas al final y una hoja para anotar sin nombres. Usa `docs/equipo/GUIA_DEMO_V18_1.md`. | `docs/equipo/GUIA_PLAYTEST_NINOS.md`, de 2 páginas como máximo. |

Cuando acabes todas, escribe al final de este archivo: «📣 Kimi 4 → coordinadora: tanda terminada», con la fecha. Así se te prepara la siguiente.
