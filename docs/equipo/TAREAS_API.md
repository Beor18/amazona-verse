# Tareas para la sesión de terminal (créditos de la API)

Esta sesión de Claude Code corre en la terminal con la cuenta de la API de Kelvin y reparte la carga con la sesión principal de la app, que usa el plan Max. **Para no gastar de más, usa Sonnet por defecto** (`/model sonnet`). Usa Opus solo si una tarea lo necesita de verdad.

## Reglas (obligatorias)
- **Repo y rama:** el repo es `~/AmazonaVerse/Juego` y hay **una sola rama, `main`**. No crees ramas ni worktrees.
- **Antes de empezar:** lee `docs/equipo/COORDINACION.md` (dueños de cada archivo y reglas) y `ROADMAP.md`.
- **Commits:** pequeños, solo de tus archivos o líneas (`git add` de rutas concretas, revisa con `git diff --cached`). Prohibido `checkout`, `reset` o `stash` sobre archivos ajenos.
- **No publiques:** no toques `sitio/` ni hagas push. La sesión principal publica después de revisar.
- **Pruebas** antes de cada commit de código:
  - `tools/build/build.sh HEAD` y después `tools/build/test.sh tools/build/salida/<ref>/ --extra`.
  - Las 13 baterías tienen que quedar en verde, con 0 errores de consola.
- **Recursos de la Mac:**
  - Procesos pesados con `taskpolicy -b nice -n 15`.
  - Nunca `python3` del sistema: usa `~/Applications/Blender.app/Contents/Resources/4.2/python/bin/python3.11 -I`.
  - No cierres apps de Kelvin. No borres nada de forma permanente: a la Papelera.
- **Seguridad:**
  - Sin descargas ni cuentas nuevas sin que Kelvin lo apruebe.
  - Nunca escribas claves ni contraseñas.
- **Al terminar cada tarea:** márcala abajo como hecha, con el commit y una línea de resultado.

## Tareas, en orden
1. **QA-30, `contextTest` intermitente** (`src/engine/renderer.js`). Dentro de la batería a veces da 12/13 por umbrales justos de píxeles. Hazla estable sin bajar lo que comprueba: que la batería completa dé 13/13 tres veces seguidas.
2. **Fundido de la flora entre la cámara y Vittata** (`src/engine/vegetacion.js`). Cuando una planta queda entre la cámara y la cotorra, debe hacerse translúcida y no tapar la vista. Haz 2 capturas, antes y después, en `docs/img/`.
3. **P2 de movimiento** (`src/engine/fisica.js`, `solidos.js` y `camara.js`):
   - el toldo bajo no debe rozarle la cabeza a Vittata;
   - la cuerda del puente colgante debe servir de percha.
   Añade casos a `movementTest`.
4. **Documentación de arquitectura** (`docs/ARQUITECTURA.md`): agrega secciones breves sobre:
   - el streaming de edificios (`streaming.js`);
   - la compresión meshopt y WebP en la build;
   - la recuperación del contexto WebGL;
   - el sitio publicable (`tools/build/sitio.sh` y `sitio/`).

   Sin relleno, con rutas de archivo.

## Estado
| Tarea | Estado | Commit | Resultado |
|---|---|---|---|
| 1 | pendiente | | |
| 2 | pendiente | | |
| 3 | pendiente | | |
| 4 | pendiente | | |
