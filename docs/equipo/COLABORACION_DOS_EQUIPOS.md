# Dos equipos, un solo juego: cómo no duplicar (30-oct)

**Equipo API (la Mac de Kelvin):** trabajadores del ejecutor de la API. Lo gráfico, el motor y todo lo que necesita GPU real. Sus tareas se llaman **BM** y están en `docs/equipo/TAREAS_API.md` y `tools/agente_api/cola.txt`.
**Equipo Apoyo (otra cuenta de Claude, web):** historia, contenido, interfaz, web y QA sin GPU. Sus tareas se llaman **AP** y están en `docs/equipo/TAREAS_APOYO.md`.

## Regla de oro
Cada equipo toma **solo** sus tareas (BM el API, AP el Apoyo) y **solo** toca los archivos de su zona. Si una tarea te obliga a tocar la zona del otro, no lo hagas: déjalo escrito en tu tarea y sigue.

## Zonas de archivos
| Zona | Dueño |
|---|---|
| `src/engine/*` (terreno, streaming, vegetación, dosel, mundo, renderer, sólidos, cámara, física, audio), `src/game/look.js`, `assets/`, `tools/blender/`, `tools/build/`, `tools/agente_api/`, `sitio/` | **API** |
| `content/*` (historia, diálogos, misiones, textos ES/EN de los 6 capítulos), `src/ui/*`, `src/game/*` salvo `look.js`, `src/engine/input.js`, `web/`, `docs/equipo/` de QA y de los capítulos | **Apoyo** |
| `docs/equipo/PEDIDOS.md`, `docs/DECISION_LOG.md` | Los dos, solo añadiendo al final |

Vittata (modelo y rig), la bandera, el canon, el arte, el dinero y lo legal no se tocan: se anotan para Kelvin en `docs/DECISION_LOG.md`.

## Dónde trabaja cada uno
- **API:** `~/AmazonaVerse/juego_api` en la Mac. Los commits los sube `subir.sh` a `Beor18/amazona-verse` (a `main` o a una rama `api-*`). **Publica solo el publicador** (`tools/build/publicar_mac.sh --continuo`), con las 13 baterías y GPU real.
- **Apoyo:** mientras su cuenta no tenga permiso de escritura en `Beor18/amazona-verse`, trabaja en su repo privado, carpeta `amazona-verse/`, siempre **sobre el main real**:
  1. Antes de cada punto: traer el main real (`git fetch https://github.com/Beor18/amazona-verse main`, repo público) y rebasar su carpeta sobre él.
  2. Un punto = **un solo commit** cuyo título empieza por «Sobre el main real <sha>: …» y que toca solo archivos de su zona.
  3. Al acabar, Kelvin le dice a la sesión coordinadora «trae lo del otro» y esta lo aplica al repo real con `git am --3way`. Nada de copiar carpetas enteras.
  4. Cuando Fernando (dueño de la cuenta Beor18) la añada como colaboradora, trabaja **directo en `main` del repo real**, con commits pequeños, `git pull --rebase` antes de empezar y push al terminar cada punto; nunca `--force`.
- **Pruebas del Apoyo:** en la nube sin GPU: la batería que toque y, al cerrar un punto, `tools/build/publicar_nube.sh --probar`. **Nunca publica** ni toca `sitio/`.

## Cómo se evitan los choques
- Las tareas BM y AP viven en archivos distintos; el ejecutor de la API solo toma BM.
- Si un AP descubre un fallo gráfico o de motor, lo anota al final de `docs/equipo/PEDIDOS.md` («para la API») y no lo arregla. Si un BM descubre un fallo de contenido, historia o interfaz, lo anota («para Apoyo») y no lo arregla.
- Antes de empezar una tarea: leer su fila en la tabla «Estado» de su archivo; si dice «en curso» o «hecha», no se repite.
