# TAREAS_KIMI · tareas 3D para Kimi (y Fernando)

**Este es el único lugar de las tareas de Kimi.** Antes de empezar, lee siempre este archivo en `main` (`git pull --rebase origin main`).
Carril de Kimi/Fernando: **edificios, ciudad, terreno y mapa** (modelos 3D, LOD, texturas de edificios, alturas). Nadie más los toca
sin que Fernando lo diga (regla de Kelvin, 1-nov). Coordinación general: `docs/equipo/COORDINACION_VIVO.md`.

## Cómo se trabaja
1. Toma la primera tarea **libre** de la tabla de abajo (en orden) y cámbiala a `EN CURSO · Kimi · <fecha y hora>` en un commit
   pequeño de este archivo. Una tarea a la vez.
2. Trabaja en tus archivos: `assets/models/edificios/`, `assets/models/mapa/`, `assets/data/mapa_cap1_altura.js`, `tools/blender/`,
   `docs/EDIFICIOS.md`. Si una tarea exige tocar el motor (`src/engine/streaming.js`, `mundo.js`, `solidos.js`), dilo en la tarea.
3. Antes de subir: `tools/blender/edificios_restaurados_test.py` y la build `tools/build/build.sh HEAD tools/build/salida/kimi-<sha>`
   (debe decir PASA). Si puedes, `tools/build/test.sh <salida> --extra`. Las 13 baterías tienen que quedar en verde, sobre todo
   **movementTest** (colisiones), **streamingTest** y **lookTest**.
4. Entrega: commit en `main` con `KIMI-Task-00X` en el mensaje, capturas antes/después en `docs/img/kimi/`, y la tarea `HECHA ·
   <commit> · <una línea de resultado>`. Publica la Mac sola cada 20 min si las pruebas pasan: no hace falta publicar.

## Reglas (siempre)
- Vittata (modelo y rig) no se toca. Bandera de PR solo según `docs/BANDERA_PR_GUIA.md`.
- Conserva las **posiciones** validadas de los edificios y los apoyos funcionales (la torre con su parapeto, perchas, puertas).
- Calidad comercial, look `vibrant_toon`, y que se vea igual de cerca y de lejos. Móvil y iPad de escuela: ≤ 150 draw calls y
  texturas ≤ 1024 px salvo justificación.
- Licencias: assets de terceros (KitBash3D, Archmodels, Savage) solo con licencia confirmada por Kelvin; anótalo en `docs/EDIFICIOS.md`.
- Archivos de menos de 100 MB. Nada de claves en el repo.

## Tareas
| ID | Estado | Qué | Cómo se sabe que está hecha |
|---|---|---|---|
| KIMI-Task-001 | libre | **Draw calls de las ruinas del Yunque: 222 → ≤ 150.** La vista más cargada de `streamingTest` (kelvin_ruinas_yunque, giro 4,7) da 222 draw calls; 109 son edificios (68 instancias cerca, 37 `_hd` sueltos, 17 zonas). Agrupar los `_hd` por material/atlas o instanciarlos. | `streamingTest`: «Draw calls de la vista más cargada ≤ 150» en verde (medido 1-nov: 222). |
| KIMI-Task-002 | libre | **Texturas de edificios: 313 MB → menos de 100 MB.** Las 35 texturas grandes de `assets/models/edificios/tex_original/` (KB3D) no bajan a 512 px con el look y ocupan 313 MB de memoria gráfica: en iPad de escuela puede cerrar el juego. Pasarlas a 1024 px (o 512 en las lejanas) y JPG/WebP comprimido, sin perder el aspecto. | `lookTest`: «Look vibrant_toon: las texturas grandes del mundo bajan a 512 px» en verde, o memoria de texturas < 100 MB en el reporte. |
| KIMI-Task-003 | libre | **BM98 · La Ciudad de los 36 de cerca se ve «rota».** Causa medida: decimación excesiva (Group001 de la escena original 1,12 M tris; en el juego `complejo_ruinas` 41 k HD / 15 k cerca; `ancient_*` hasta 20× reducido). Partir el HD en trozos, atlas, y un cercano fiel al original sobre los 18 Ancient ya restaurados. | Capturas de cerca en `docs/img/kimi/` que se vean como la escena original de Kelvin; ≥ 50 FPS en la Mac con `#fps`; `streamingTest` sin empeorar. |
| KIMI-Task-004 | libre | **BM90 · Color de las ruinas.** Hoy salen crema lavado y casi sin sombra propia; la meta (`docs/img/ciudad_tepuy_meta_kelvin.jpg`) es dorado cálido con relieve sobre selva oscura. | Captura del tepuy y la Ciudad de los 36 junto a la meta, aprobada por Kelvin. |
| KIMI-Task-005 | libre | **QA-71 · `_hd` que no coinciden con el ligero** (colisiones): `templo_grande`, `templo_grande_f`, `ruina_mirador` (lista `PENDIENTE_HD` de `streamingTest`). Reexportar con el mismo pivote y extensión (≤ 0,3 m). | `streamingTest` sin modelos en `PENDIENTE_HD`. |
| KIMI-Task-006 | libre | **Árboles y piedras en el mar.** Tras la integración de TransferNow (28694db/842452c) el terreno visible y la altura de juego (`assets/data/mapa_cap1_altura.js`) no coinciden: la flora se siembra sobre la altura vieja y queda flotando. Regenerar la altura desde el terreno nuevo (o al revés), conservando las alturas jugables de las misiones. | Capturas sin flora sobre el agua; `floraTest`, `missionTest`, `e2eTest` y `movementTest` en verde. |
| KIMI-Task-007 | libre | **Edificios que siguen rotos (auditoría 1-nov).** La lista sale de `docs/equipo/AUDITORIA_EDIFICIOS.md` (la sube la coordinadora en cuanto termine la revisión modelo por modelo): huecos, piezas sueltas, texturas que faltan, LOD que no coinciden. Uno por commit. | Cada modelo de la lista marcado arreglado en la auditoría, con captura antes/después. |
