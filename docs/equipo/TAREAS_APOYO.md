# Tareas del equipo Apoyo (AP): historia, contenido, interfaz, web y QA sin GPU

Lee primero `CLAUDE.md` y `docs/equipo/COLABORACION_DOS_EQUIPOS.md` (zonas de archivos y cómo entregar). Estas tareas son tuyas; las BM son de la API. Todo lo que ya figura «Hecho» en `docs/equipo/CAP1_PENDIENTE.md` no se repite. Diversión primero; lo que el guion no resuelva es decisión de Kelvin: anótalo en `docs/DECISION_LOG.md` como [KELVIN] y sigue con el resto.

- **AP1, el Gancho y la Ruptura del capítulo 1 (`CAP1_PENDIENTE.md` hito 2; `docs/CHAPTER_01_SCRIPT.md` p.1-3 y `NARRATIVA_CAP1.md` «Gancho»).** Hoy el juego abre con 3 escenas de texto. Haz la apertura que dice el guion: pantalla negra con viento, el taller que se enciende, el «ZZZT» de la máquina y una onda que cruza el cielo, en `content/cap1/historia.js` `inicio(G)`. Efectos sencillos (CSS, audio sintético de `src/engine/audio.js` sin editar el motor: pide el sonido nuevo en `PEDIDOS.md` para la API si hace falta); se puede saltar con cualquier tecla; no aparece con `G.quiet`; respeta «Reducir movimiento». Caso en `pruebas.js`.
- **AP2, el Guardián como dice el guion (hito 11; SCRIPT p.7-9).** Hoy aparece tras la crecida y no ayuda a construir. Ajusta su llegada y su ayuda según el guion (la familia de Iguaca entrando al refugio, p.9). Si el guion contradice la historia de la temporada (`docs/STORY_BIBLE.md`), no lo decidas: [KELVIN] en `DECISION_LOG.md`. Casos en `missionTest`/`e2eTest`.
- **AP3, modo zurdo en móvil (hito 22).** Opción en el menú y en Ajustes que espeja los controles táctiles (`src/engine/input.js`, CSS de `src/ui`), se guarda en el perfil, botones ≥ 44 px a 375×812. Caso en `accesibilidad`.
- **AP4, duración real del capítulo 1 (hito 26).** Un script de QA que corre el recorrido completo de `tests/qa/e2e.js` y deja en `docs/equipo/DURACION_CAP1.md` los minutos de un jugador «rápido», «normal» (con lectura de diálogos a 15 caracteres por segundo) y «explorador»; con los `minutos_mision` que ya guarda el Aula.
- **AP5, portada de la web GAME-FIRST (`web/index.html` solamente; `docs/GAME_FIRST.md` §6).** «Vuela, explora y salva tu isla con Vittata»; el juego primero, lo educativo dentro. Nunca «grados 3 a 6» ni «aprende ciencia». Sin el tren (está oculto hasta que Kelvin decida). Revisa en 375 px y en escritorio, ES y EN.

## Estado
| ID | Estado | Commit | Resultado |
|---|---|---|---|
| AP1 | pendiente | | |
| AP2 | pendiente | | |
| AP3 | pendiente | | |
| AP4 | pendiente | | |
| AP5 | pendiente | | |
