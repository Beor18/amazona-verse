# Trabajo simultáneo: tablero de tareas y archivos apuntados

Varios agentes trabajan a la vez en `main`: Claude (sesión coordinadora y subagentes), los carriles de la API y Grok desde Cursor. Reglas en `AGENTS.md` y `CLAUDE.md`.

**Cómo se usa**
- **Apuntarse:** pon tu nombre y la hora en «Quién», y haz commit de esa línea antes de programar.
- **Archivos:** un archivo apuntado es de ese agente hasta que la tarea quede «hecha».
- **Si necesitas un archivo ajeno:** pídelo en `docs/equipo/PEDIDOS.md`.
- **Publicar:** solo la sesión coordinadora publica en amazonaverse.com, y solo con todas las baterías en verde.

## Tareas

| Id | Tarea | Archivos (apuntados) | Sugerida para | Quién · hora | Estado | Commit y resultado |
|---|---|---|---|---|---|---|
| S1 | **Final del capítulo (P0-1 de `CAP1_PENDIENTE.md`):** al acabar, poder seguir volando por el mundo; «Jugar de nuevo» pide confirmación y no borra la partida sin avisar | `src/game/misiones.js` (`showEnd`), bloque `#end` de `index.html` | Grok | | libre | |
| S2 | Clima y rescate arrancan con `alPrimerGesto` en vez de `setTimeout(6 s)` (pendiente de L1) | `src/game/clima.js`, `src/game/rescate.js` | Grok | | libre | |
| S3 | **Ganchos de rareza de los huevos** (`docs/equipo/HUEVOS_RAREZA.md`): vuelo e impulso, vista del Banquete y canto de la bandada. Efectos pequeños, sin ventaja de pago | `src/engine/fisica.js` (solo el gancho), `src/game/banquete.js`, `src/game/bandada.js`, `src/game/rareza.js` | Grok | | libre | |
| S4 | Bajar la descarga inicial de 8,24 MB a menos de 8 MB, sin perder calidad visible (carga perezosa o compresión) | `tools/build/*` (empaquetado); pídelo antes si toca `src/boot.js` | Grok o Claude | | libre | |
| C1 | **Cielo vivo (W2, ficha 26-B):** degradado, disco solar, nubes en 2 capas y rayos en calidad alta | `src/engine/renderer.js` (cielo), archivo nuevo de cielo | Claude | Claude Fable · 08:05 | en curso | |
| C2 | Prueba E2E que recorre el capítulo 1 completo con la build publicada (P0-5) | `tests/qa/*` | Claude | Claude Sonnet · 08:03 | hecha | `adf1319` e2e.js: tiempo por paso y resumen del primer fallo (el recorrido completo ya existía). 45/45, 0 errores |
| C3 | **La Voz con su propio retrato (P0-2).** Necesita que Kelvin decida el arte o canon de la Voz | `content/cap1/pack.js`, `content/cap1/historia.js` | Kelvin decide | | bloqueada | |

## Zonas que no se tocan sin pedirlas
- **Solo la sesión coordinadora:** `sitio/`, `.github/`, `src/boot.js` e `index.html`; fuera de S1, el bloque `#end` de `index.html` también.
- **Vittata:** su modelo y su rig, `src/personaje/` y `assets/models/vittata*`.
- **Mapa:** `assets/data/mapa_cap1*` y `assets/models/mapa/*` se generan con `tools/blender/mapa_*`. No se editan a mano.
