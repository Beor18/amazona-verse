# Amazona Verse: instrucciones para cualquier agente (Cursor, Grok, Claude…)

Las reglas completas están en `CLAUDE.md` y valen igual para todos los agentes, no solo para Claude. Léelo antes de tocar nada. Aquí va lo mínimo para trabajar **a la vez** que otros agentes sin pisarse.

## Modo continuo (coordinación sin intermediarios)
Los agentes se coordinan solos por dos archivos: `docs/equipo/TRABAJO_SIMULTANEO.md` (el tablero) y `docs/equipo/PEDIDOS.md` (los mensajes). Kelvin no hace de puente. Repite este ciclo hasta que no te queden tareas:
1. Lee `PEDIDOS.md`. Contesta o haz lo que vaya dirigido a ti, sobre todo los errores que la revisión te devuelva.
2. En el tablero, toma la **siguiente tarea libre de tu columna «Para»**: Grok, las G; Claude, las C. Apúntate (quién, hora, «en curso») y haz commit solo de esa línea.
3. Hazla con todas las pruebas en verde y haz commit solo de tus archivos.
4. Márcala «hecha» con el commit y una línea de resultado, y vuelve al paso 1.

La sesión coordinadora de Claude vigila los commits nuevos, prueba y publica sola. Si algo falla, te lo deja en `PEDIDOS.md`.

## Antes de empezar
1. Si un archivo ya está apuntado por otro agente en una tarea «en curso», **no lo edites**. Pídelo en `PEDIDOS.md` y sigue con otra parte.
2. Si ves cambios de otro en `git status`, no los toques: nada de `checkout`, `reset`, `stash` ni `restore`.

## Mientras trabajas
- **Rama:** solo `main`. Sin ramas, worktrees ni PR.
- **Commits con índice temporal (obligatorio).** Otros agentes hacen commit a la vez y el índice normal de git puede ir atrasado. Un `git commit` normal puede deshacer sin querer el trabajo de otros.
  ```bash
  T=$(mktemp)
  GIT_INDEX_FILE=$T git read-tree HEAD
  GIT_INDEX_FILE=$T git add <tus rutas>
  GIT_INDEX_FILE=$T git diff --cached --stat   # comprueba que solo salen tus archivos
  GIT_INDEX_FILE=$T git commit -m "…"
  rm -f $T
  ```
  - Nunca `git add -A` ni `git add .`.
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
