# Trabajo simultáneo: tablero de tareas y archivos apuntados

Varios agentes trabajan a la vez en `main` y **se coordinan solos por este archivo y por `docs/equipo/PEDIDOS.md`**:
- Claude: la sesión coordinadora y sus subagentes.
- Grok, desde Cursor.

Kelvin no hace de puente. Las reglas están en `AGENTS.md` y `CLAUDE.md`.

## Cómo se usa
- **Cada uno toma solo tareas de su columna «Para».** Grok toma las G y Claude las C. Así nunca chocan.
- **Apuntarse:** pon tu nombre y la hora en «Quién», cambia el estado a «en curso» y haz commit de esa línea antes de programar.
- **Archivos:** un archivo apuntado por una tarea «en curso» es de ese agente hasta que la tarea quede «hecha». Si necesitas uno ajeno, pídelo en `PEDIDOS.md` y sigue con otra parte.
- **Revisión y publicación:** la hace Claude, sesión coordinadora, sola. Vigila los commits nuevos y corre todas las baterías:
  - si pasan, publica en amazonaverse.com;
  - si no, escribe el error en `PEDIDOS.md`, dirigido a quien hizo el commit.
- **Orden:** dentro de cada columna, de arriba abajo, salvo que una tarea esté bloqueada.

## Tareas

| Id | Para | Tarea | Archivos | Quién · hora | Estado | Commit y resultado |
|---|---|---|---|---|---|---|
| G1 | Grok | **Final del capítulo (P0-1 de `CAP1_PENDIENTE.md`).**<br>• Botón «Seguir explorando» que cierra `#end` y deja el mundo libre (Diario, nido y cómic desde el menú; la guía queda apagada).<br>• El panel solo se abre solo la primera vez.<br>• «Jugar de nuevo» con confirmación de dos pasos, para no borrar la partida por accidente.<br>• Casos nuevos en `missionTest`. | `src/game/misiones.js` (`showEnd`, `apply`), `src/engine/guardado.js` (`b-again`), `src/engine/ui.js` (`overlayOpen`), bloque `#end` de `index.html` (en commit mínimo aparte), `content/cap1/pruebas.js` | | libre | |
| G2 | Grok | **Final con imagen (P1-1).**<br>• La luz que parpadea tres veces en la niebla: un punto emisivo durante la escena del mirador, con gancho `onShow`.<br>• El plano de la embarcación como lienzo dibujado (igual que `drawSymbol`), visible al desbloquearlo y en la viñeta final del cómic. | `content/cap1/historia.js` (`useMirador`), `content/cap1/mundo.js`, `content/cap1/pack.js` (`decorar`) | | libre | |
| G3 | Grok | **Apertura de unos 30 s (P1-3).**<br>• Fundido desde negro, viento sintético, brillo de las nubes y la onda en el cielo antes de dar el control.<br>• Se salta con un toque.<br>• El fundido va como capa DOM que inyecta el pack: **no** toques `renderer.js` ni `ui.css`. | `content/cap1/historia.js` (`inicio`), `content/cap1/pack.js` (`audio.define`) | | libre (después de G2) | |
| G4 | Grok | **Sonido de la historia (P1-4).**<br>• Lluvia y trueno suave durante la crecida (`S.event`).<br>• Golpes de madera al colocar el refugio.<br>• Un ambiente mínimo.<br>Todo con `audio.define` del pack; `src/engine/audio.js` solo si hace falta un bucle. | `content/cap1/historia.js`, `content/cap1/pack.js`, `src/engine/audio.js` (mínimo) | | libre (después de G3) | |
| G5 | Grok | **Maravillas (GDD §6): bahía bioluminiscente de noche y coro de coquíes con luciérnagas al atardecer.**<br>• Instanciado y barato en el móvil: mide con `tools/build/look_capturas.py --movil`.<br>• Dato con fuente: la bioluminiscencia la producen dinoflagelados, *Pyrodinium bahamense* (cita DRNA o NOAA; si no, «por verificar»).<br>• Archivo nuevo con carga perezosa, como `fauna.js`.<br>• Capturas en `docs/img/g5_*.jpg`. | `src/game/maravillas.js` (nuevo), una línea en `src/boot.js` (en commit mínimo aparte) | | libre | |
| C1 | Claude | **Cielo vivo (W2, ficha 26-B):** degradado, disco solar, nubes en 2 capas y rayos en calidad alta. | `src/engine/renderer.js` (cielo), archivo nuevo de cielo | Claude Fable · 08:05 | en curso | |
| C2 | Claude | Prueba E2E que recorre el capítulo 1 completo con la build publicada (P0-5). | `tests/qa/*` | Claude Sonnet · 08:03 | hecha | `adf1319`: `e2e.js` mide el tiempo por paso y dice cuál es el primer paso que falla (el recorrido completo ya existía). 45/45, 0 errores |
| C3 | Kelvin | **La Voz con su propio retrato (P0-2).** Necesita que Kelvin decida el arte o el canon de la Voz. | `content/cap1/pack.js`, `content/cap1/historia.js` | | bloqueada | |
| C4 | Claude | **Mejoras 1, 2 y 4 de `PLAYTEST10.md`.**<br>• Pista del coquí con neblina.<br>• Pista del visor de peces la primera vez.<br>• Precarga de la zona del río y del coquí a unos 120 m, para quitar el tirón: peor cuadro por debajo de 100 ms. | `src/game/fauna.js`, `src/game/rio_vivo.js` | | libre | |
| C5 | Claude | **Clima y rescate.**<br>• Arrancan con `alPrimerGesto` en vez de `setTimeout(6 s)`.<br>• QA-39: `rescateTest` cambia `G.S.edu`.<br>• «Save the Parrot» se puede jugar con frutos en las patas (mejora 3 de `PLAYTEST10.md`). | `src/game/clima.js`, `src/game/rescate.js` | | libre | |
| C6 | Claude | **Ganchos de rareza de los huevos** (`HUEVOS_RAREZA.md`): vuelo e impulso, vista en el Banquete y canto de la bandada. Efectos pequeños, nunca ventaja de pago. | `src/engine/fisica.js` (solo el gancho), `src/game/banquete.js`, `src/game/bandada.js`, `src/game/rareza.js` | | libre | |
| C7 | Claude | **Episodio 2, secciones 5, 6 y 7 de `EP2_MISIONES.md`:** «Iguaca te pregunta», el Modo Maestro y el Diario y el criadero del episodio 2. Lleva marcadores `[KELVIN]` para el canon. | `content/ep2/*` | | libre | |
| C8 | Claude | Bajar la descarga inicial de 8,24 MB a menos de 8 MB, sin perder calidad visible. | `tools/build/*` | | libre | |

## Zonas que no se tocan sin pedirlas
- **Solo la sesión coordinadora:** `sitio/` y `.github/`. Ni `src/boot.js` ni `index.html`, salvo en el commit mínimo que permita una tarea.
- **Vittata:** su modelo y su rig, `src/personaje/` y `assets/models/vittata*`.
- **Mapa:** `assets/data/mapa_cap1*` y `assets/models/mapa/*` se generan con `tools/blender/mapa_*`. No se editan a mano.
