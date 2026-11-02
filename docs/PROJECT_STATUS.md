# PROJECT_STATUS · 2 nov 2026

Estado corto y verificable. El detalle vivo está en `docs/equipo/COORDINACION_VIVO.md`, la tabla «Estado» de `docs/equipo/TAREAS_API.md`, `ROADMAP.md` y `docs/equipo/BUGS.md`. Qué versión está en línea: míralo en la hoja viva (último «Sitio: publica …» en `git log`).

**Ahora:** capítulo 1 al **100 %** (`docs/equipo/CAP1_PENDIENTE.md`). Temporada 1 (caps. 2 a 6) con contenido y pruebas; quedan por cerrar los caps. 5 y 6 en el mapa real. Rama única: `main`.

| Área | Estado | Nota |
|---|---|---|
| Capítulo 1 | Hecho | Jugable de principio a fin; los 28 hitos de `CAP1_PENDIENTE.md` cerrados. Los sobrinos de Kelvin lo jugaron en 16 min (1-nov) |
| Cap. 2 (Caney del Meandro) | En el mapa real | BM111, d027b6b |
| Cap. 3 (río de Villa Raíz, desembocadura y laguna) | En el mapa real | BM112, e72f153 |
| Cap. 4 (río al este de Villa Raíz; los Portales del Río son un cañón y no sirven) | En el mapa real | BM113, ff3a738 |
| Caps. 5 y 6 | En su mundo pequeño; ya en el mapa real tras un interruptor apagado | `MAPA_REAL` en el pack o `?mapa=real`; se enciende cuando Kimi termine KIMI-Task-001 a 003 (`docs/equipo/MUNDO_UNICO.md`) |
| Mundo único | Hecho (caps. 1 a 4) | `src/game/zonas.js` (BM114): lo cerrado se ve de lejos; el viento no deja pasar y avisa |
| Pieles de especie | 31 especies con piel (BM109); 3 más en curso (BM124) | Quedan sin piel martinicana y violacea (solo propuesta) |
| Criadero «Mi nido» | En el menú | Los huevos son de fantasía (decisión de Kelvin, 2-nov) |
| Minimapa | Hecho | `src/game/minimapa.js`, ver `docs/equipo/MINIMAPA.md` |
| Ranking en línea | Existe, opcional | `docs/equipo/SEGURIDAD_INFANTIL.md` §5; la decisión es de Kelvin (`PENDIENTES_KELVIN.md` §0) |
| Cómic oficial, bote, Family Quest, builds nativos | Pendientes | Bote: el plano se desbloquea al final del cap. 1 |

**Pruebas:** 12 baterías obligatorias en verde en la publicación 2d6257b / aa35ad7 (nube); `temporadaE2eTest` 31/31. Detalle y cómo correrlas: `docs/TEST_REPORT.md`.
**Bugs abiertos de peso:** QA-85 (intermitente, sin reproducir). Lista completa en `docs/equipo/BUGS.md`.
**Medido en equipos reales (1-nov, Kelvin, `#fps`):** Android 89 FPS (mín 40) e iPad 39 FPS (mín 36). Falta un Chromebook escolar. Kimi trabaja en bajar draw calls y texturas de las ruinas (`docs/equipo/TAREAS_KIMI.md`).
**Pendiente de Kelvin:** `docs/equipo/PENDIENTES_KELVIN.md` (canon, arte, datos, producto y el día de legal y monetización).
**No probado:** Safari de escritorio, Chromebook, niños fuera de la familia de Kelvin.
