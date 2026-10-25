# Tareas del equipo 2: segunda cuenta Max, en paralelo

Lee primero `CLAUDE.md`, que tiene el contexto y las reglas. Después lee `docs/equipo/COORDINACION.md` y `ROADMAP.md`.

**Tu zona:** el **episodio 2** y la documentación del capítulo 1. **No toques** lo que están haciendo otras sesiones:
- motor (`renderer.js`, `vegetacion.js`, `fisica.js`, `solidos.js`, `camara.js`, `streaming.js`, `input.js`);
- `src/ui/*`;
- `content/cap1/historia.js`, `pack.js`, `mundo.js`, `paradas.js` y `diario.js`;
- `src/engine/guardado.js`.

**Modelo:** usa **Sonnet**. Pasa a Opus solo si una tarea lo necesita de verdad.

## E2-1 · Prototipo jugable del episodio 2 (`content/ep2/`, nuevo)
1. Lee `docs/equipo/EP2_GDD.md`, `EP2_NARRATIVA.md` y `EP2_MISIONES.md`.
2. Crea el pack `content/ep2` a partir de `content/plantilla`. Ese es el modelo de cómo un pack reutiliza el motor: no copies código del motor.
3. Que arranque con `index.html?pack=ep2`, con:
   - una zona jugable;
   - la **primera misión completa**;
   - diálogos;
   - una parada de aprendizaje con un dato verificable y su fuente.
4. **Lo que dependa de las decisiones de canon de Kelvin** (la lista está al final de `EP2_GDD.md`) va con **marcadores neutros** y anotado. No lo decidas tú.
5. Añade su prueba al estilo de `templateTest`, que el pack arranca y la misión se completa, y deja las 13 baterías en verde.

## E2-2 · Validar los textos del Diario del capítulo 1 (solo documento)
Revisa las 12 entradas del Diario del capítulo 1 (`content/cap1/lecciones.js` y `docs/equipo/EDUCATIVO.md`). Para cada dato, indica:
- la fuente;
- si es verificable;
- el texto corregido, si hace falta.

Entrégalo en `docs/equipo/DIARIO_VALIDACION.md`, **sin tocar el código**. La sesión principal lo aplica después.

## E2-3 · Documentación del capítulo 1 al día
Actualiza `docs/equipo/GDD_CAP1.md`, `docs/CHAPTER_01_GAMEPLAY.md` y `docs/equipo/EDUCATIVO.md` al estado real del juego. Usa `docs/equipo/CAP1_PENDIENTE.md` como guía. Recuerda: es para todas las edades, sin «grados 3 a 6», y lo educativo no es el gancho.

## Estado
| Tarea | Estado | Commit | Resultado |
|---|---|---|---|
| E2-1 | pendiente | | |
| E2-2 | pasa a la API (tarea E1 de TAREAS_API.md) | | |
| E2-3 | pasa a la API (tarea E2 de TAREAS_API.md) | | |
