# Coordinación del equipo — Amazona Verse

Kelvin (fundador) pidió que **todos los roles decidan entre sí** para entregar un producto de calidad. Este es el protocolo.

## Quién es dueño de qué
| Rol | Dueño de |
|---|---|
| Programador gráfico | `src/engine/terreno.js`, `agua.js`, `fx.js`, `renderer.js` (menos color/AA/pixelRatio), `src/engine/mundo*.js`, `content/cap1/mundo.js` |
| TA de personaje | `src/personaje/*` (código, materiales, color, patrones), color/AA/pixelRatio de `renderer.js` |
| Artista de traits | `tools/blender/ropa_*.py`, `assets/models/ropa/*` |
| Programador de gameplay | `src/game/*` (salvo criadero), `src/ui/*` (salvo criadero.css), `content/cap1/misiones*`, `lecciones*` |
| Game designer de huevos | `src/game/criadero.js`, `src/ui/criadero.css`, `content/comun/huevos.js`, `docs/BANDERA_PR_GUIA.md` |
| Level designer | `assets/models/mapa/*`, `assets/data/mapa_cap1*`, `tools/blender/mapa_*` |
| Artista de entorno | `assets/models/entorno/*`, `assets/tex/entorno/*`, `tools/blender/entorno_*` |
| QA / troubleshooting | `tests/qa/*`, `docs/equipo/BUGS.md` |
| Movimiento y animación | `src/engine/fisica.js`, `input.js`, `camara.js`, `actores.js`, `src/engine/agarre.js`, animación procedural de `src/personaje/character.js` (locomoción, cara, gestos, alas, pico, IK, poses de carga) |
| Comité de pitch (CEO/CTO/Growth) | `docs/pitch/GUION.md`, `TOMAS.json`, `VO.txt`; supervisa la web |
| Editor de video / Ingeniero de sonido | `tools/video/*` / `tools/audio/*`, `docs/pitch/VIDEO.md` / `AUDIO.md` |
| Web lead | `~/AmazonaVerse/Web/*` |
| Coordinador (CEO/producción) | `index.html` y `src/boot.js` en conflicto, publicación, `docs/DECISION_LOG.md` |

## Cómo se decide
1. **Lo tuyo lo decides tú**, con criterio senior y las reglas fijas de abajo.
2. **Si afecta a otro rol**, propónselo directamente: `SendMessage` al agente (ids en `~/AmazonaVerse/_trabajo_claude/equipo_ids.md`) o escribe en `docs/equipo/PEDIDOS.md` (`para · de · qué · por qué`). El dueño responde y aplica, o contrapropone. Un mensaje y una respuesta deberían bastar; sé breve.
3. **Desacuerdo**: gana la opción que mejor sirve al estudiante y a la calidad visible. Si siguen trabados, el coordinador decide.
4. **Toda decisión que cambie el producto** se anota en una línea en `docs/DECISION_LOG.md` (fecha · decisión · quién · por qué).
5. **Solo se consulta a Kelvin** por canon de la historia, dinero, licencias y legal.

## Reglas fijas de Kelvin
- Juego **educativo para escuelas**; todo debe enseñar o servir al aprendizaje.
- **No cambiar nuestra cotorra** (modelo y rig de Vittata intocables).
- **Bandera de Puerto Rico fiel** siempre (ver `docs/BANDERA_PR_GUIA.md`).
- Gráficos y UI de **calidad comercial**; nada pixelado ni básico.
- Los anillos de vuelo **no van**. Sin loot boxes ni presión de compra.
- **Base reutilizable**: motor separado del contenido.
- Trabajo **continuo**: no pausar por confirmaciones menores.

## Calidad antes de entregar
- `AV.selfTest`, `missionTest`, `accessoryTest`, `templateTest` (y los tuyos) pasan; consola sin errores.
- Revisa tus capturas con ojo de cliente exigente.
- Pide a QA que corra `tests/qa` sobre tu cambio si toca algo compartido.
- Relee cualquier archivo compartido justo antes de editarlo. Commits pequeños solo de tus archivos.
