# Amazona Verse: instrucciones para cualquier agente (Cursor, Grok, Claude…)

Las reglas completas están en `CLAUDE.md` y valen igual para todos los agentes, no solo para Claude. Léelo antes de tocar nada. Aquí va lo mínimo para trabajar **a la vez** que otros agentes sin pisarse.

## Antes de empezar
1. Abre `docs/equipo/TRABAJO_SIMULTANEO.md`, elige una tarea libre y **apúntate**: tu nombre de agente, la hora y los archivos que vas a tocar. Haz un commit solo de esa línea antes de programar.
2. Si un archivo ya está apuntado por otro agente, **no lo edites**. Pídelo en `docs/equipo/PEDIDOS.md` o elige otra tarea.
3. `git status` debe salir limpio en tus archivos. Si ves cambios de otro, no los toques (nada de `checkout`, `reset`, `stash` ni `restore` sobre archivos ajenos).

## Mientras trabajas
- **Rama:** solo `main`. Sin ramas, worktrees ni PR.
- **Commits pequeños** y solo de tus rutas: `git add <ruta> <ruta>` y después `git commit`. Nunca `git add -A` ni `git add .`.
  - Firma el mensaje con tu modelo, por ejemplo: `Co-Authored-By: Grok <noreply@x.ai>`.
- **Pruebas antes de cada commit de código** (Mac): `tools/build/build.sh HEAD tools/build/salida/<tu-tarea>-<sha>` (carpeta propia) y `tools/build/test.sh tools/build/salida/<tu-tarea>-<sha>/ --extra`. Todas las baterías en verde y 0 errores de consola.
- **Si trabajas desde otra computadora:** `git pull --rebase` antes de empezar y `git push` solo cuando las pruebas pasen.

## Lo que nunca se hace
- **Publicar:** no toques `sitio/` ni `.github/`. Publica solo la sesión coordinadora de Kelvin.
- **Claves:** nunca pongas claves de API, contraseñas ni tokens en archivos, commits o mensajes.
- **Vittata:** no se cambia, ni su modelo ni su rig.
- **Contenido:** el juego es para niños de todas las edades. Nada de violencia, armas, chat libre, loot boxes, presión de compra ni anillos de vuelo.
- **Datos educativos:** van con fuente; si no se puede verificar, se marca «por verificar».
- **Nombres:** no escribas los nombres de la familia fundadora en el repo; solo van en la web.
- **Canon, arte, dinero, legal y gastos nuevos:** los decide Kelvin. Anótalos y no los decidas tú.
- **Borrar, descargar y cerrar:** no borres nada de forma permanente (a la Papelera), no hagas descargas sin aprobación y no cierres apps de Kelvin.

## Al terminar
- Marca la tarea como **hecha** en `TRABAJO_SIMULTANEO.md`, con el commit y una línea de resultado.
- Libera tus archivos.
- Añade una fila en `docs/equipo/REGISTRO_TAREAS.md`.
