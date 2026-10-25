# Tablero de bugs · QA

Dueño del tablero: QA / troubleshooting. Cada dueño cambia el **estado** de sus filas (o se lo dice a QA) y QA lo verifica con la batería.

**Última corrida:** 2026-10-24 21:49 (hora local), `index.html?qa=1`, Chrome 152 en Apple M4, 1024×768, DPR 2. Informe: `tests/out/qa_report.md` y `.json`.

| Métrica | Valor |
|---|---|
| Pruebas | selfTest 46/46 · missionTest 35/35 · accessoryTest 12/12 · templateTest 19/19 |
| Consola | 0 errores · 1 warning de Three (QA-02) |
| FPS medio / mín (5 s por punto) | taller 60 / 56 · villa 59 / 29 · parcela A (río) 48 / 12 (QA-03) |
| Draw calls / triángulos | 60 / 138 k · 71 / 139 k · 70 / 139 k (una pasada por cuadro) |
| Memoria, 10 cambios de ropa | fuga 0 geometrías, 0 texturas, 0 programas, 0 objetos (la caché crece +44 geometrías y +9 texturas la 1.ª vez, como se espera) |
| Carga en frío | personaje 3D a los 0,6 s · 4,28 MB en 66 peticiones · 0 fallidas |
| `<script>` de index.html | 44, todos 200 |
| Publicable (`*_glb.js`, texturas, js, html/css) | 34,7 MB en 299 archivos (QA-10) |

**Re-correr:** abre `http://localhost:8765/?qa=1` (o cualquier puerto servido por `tests/server.py`) con la pestaña al frente. Desde la consola de una pestaña del juego:
`(d => { const s = d.createElement('script'); s.src = 'tests/qa/qa.js?' + Date.now(); d.head.appendChild(s); })(document)` y luego `await AVQA.done`.
`?qa=1` necesita el `tests/server.py` nuevo: el servidor de 8765 que corre desde antes (pid 31752) no inyecta hasta que se reinicie. QA corrió en un servidor propio en 8766 (mismos archivos, otro origen) para no pisar la partida guardada que comparten las pestañas de los demás en 8765.

## Abiertos y recientes

| id | severidad | pasos | causa raíz probable (archivo:línea) | dueño | estado |
|---|---|---|---|---|---|
| QA-01 | alta | `AV.selfTest()` daba 30/45 y `missionTest()` 33/35 después de enlazar la misión educativa | `content/cap1/historia.js`: el paso `terrenos` pide `mision: 'educativa'` y las pruebas no jugaban "La ruta de la gota" (`content/cap1/pruebas.js:31`) | Programador de gameplay | **Resuelto** 21:49 (añadió `jugarRutaGota`); verificado por QA |
| QA-02 | media | Abrir el juego y mirar la consola: `THREE.MeshLambertMaterial: 'flatShading' is not a property of this material.` | `content/cap1/educativa.js:327` (roca con `MeshLambertMaterial({ flatShading: true })`; en r128 Lambert no lo admite: Phong/Standard con `flatShading` o quitar la opción). El mismo warning en `src/engine/terreno.js:115` ya estaba corregido a las 21:49 | Programador de gameplay | Abierto |
| QA-03 | media | `?qa=1`: en la primera visita a la parcela A (20, 6, junto al río) los FPS bajan a 24, 27 y 48 de media con 20 a 32 tirones de más de 33 ms en 5 s (3 de 3 corridas). Al volver, 60 FPS estables; taller y villa, de 57 a 60 | Por confirmar. No aparecen programas ni texturas nuevas mientras se mide, así que no es compilación de shaders: apunta a trabajo en el hilo principal al llegar (decodificar o instanciar GLB de entorno o vegetación cerca del río) o a la GPU compartida con los renders de Blender (`tools/blender/mapa_render.py`) que corrían a la vez. Hay que confirmarlo con el panel Performance y sin Blender | Programador gráfico | Abierto |
| QA-04 | media | Partida nueva, solo teclado: la portada pone el foco en «Jugar», Tab salta al nombre del creador, que está tapado detrás, y Enter no hace nada visible. Tras «Jugar» el foco cae en `BODY` | `index.html:15`: `<dialog id="title" open>` no es modal y no vuelve inerte lo de atrás; el creador (`index.html:232`) sigue enfocable. `src/game/creador.js:159`: `open()` no lleva el foco a `#p-name` | Programador de gameplay (UI y creador); si cambia `index.html`, coordinador | Abierto |
| QA-05 | media | Móvil de 375 px, junto al refugio: el aviso «Acción: Desarmar el refugio y recuperar ma» se corta a mitad de palabra y sin puntos suspensivos | `src/ui/ui.css:299-305`: `#prompt` es flex, y `text-overflow: ellipsis` no se aplica al texto suelto de un flex. Envolver el texto en un span con `min-width: 0` o permitir 2 líneas en móvil | Programador de gameplay | Abierto |
| QA-06 | baja | Móvil de 375 px: el HUD de arriba (objetivo, chips, indicadores e inventario) ocupa unos 310 de 812 px (38 %) y tapa el mundo | `src/ui/ui.css`, bloque `@media` de móvil | Programador de gameplay | Abierto (propuesta: plegar chips e indicadores en móvil) |
| QA-07 | baja | Abrir el Diario con Enter sobre «Diario»: el foco se queda en el botón, no entra a la tarjeta (Esc la cierra bien) | `src/game/diario.js:61` (`showCard` sin mover el foco) | Programador de gameplay | Abierto |
| QA-08 | baja | En el creador, guardar con un nombre no válido: el error se ve, pero el lector de pantalla no lo anuncia | `index.html:251`: `#p-error` sin `role="alert"` ni `aria-live` | Programador de gameplay; coordinador por `index.html` | Abierto |
| QA-09 | baja | La batería avisa de módulos que existen en disco pero `index.html` no carga: `src/engine/vegetacion.js`, `src/engine/mundo.js` y `src/ui/aula.css`. pausa, aula, ui.js, lecciones y educativa ya se enlazaron a las 21:3x | `index.html` (etiquetas `<script>` y `<link>`) | Coordinador, con el programador gráfico (vegetacion, mundo) y el de gameplay (aula.css) | Abierto (puede ser trabajo en curso) |
| QA-10 | baja | Lo publicable pesa 34,7 MB, por encima del presupuesto de 30 MB: `*_glb.js` de ropa 11,9 MB, edificios 10,6 MB y entorno 4,0 MB. La descarga inicial (4,3 MB) está bien | `assets/models/ropa/*_glb.js` y `assets/models/edificios/*_glb.js` (base64 sin cuantizar; CTO_PLAN propone gltfpack) | Coordinador (publicación), con el artista de traits y el TA de edificios | Abierto, a decidir |
| QA-11 | alta (entorno) | Arrancar `tests/server.py` con el python de Blender.app, como manda el procedimiento: el vigilante le hace `renice +15` y `taskpolicy -b` (log: pid 48938 y 49265). Con memoria por debajo del 12 % y sin un Blender que pausar, el servidor era candidato a SIGSTOP y el juego se habría quedado colgado cargando | `tools/sys/vigilante.sh:64-71`: `list_blender` y `pid_ok` buscaban "blender" en toda la ruta del ejecutable | Sin dueño (técnico PC), así que lo arregló QA | **Corregido en disco**: ahora solo cuenta el nombre del ejecutable (probado: los Blender sí, el python y el servidor no). El vigilante en marcha (pid 40975) usa la versión vieja hasta que alguien lo reinicie; QA no lo reinició. Sin commit, porque el archivo no es de QA |
| QA-12 | baja | accessoryTest dio 11/12 una vez (21:33): «lentes:sol→ojo, lentes:redondas→ojo» | Cambios sin commit en `src/personaje/character.js` en ese momento; con el commit del TA vuelve a 12/12 | TA de personaje | Resuelto; vigilar |
| QA-13 | info (entorno) | El Blender pid 48948 está abierto con interfaz, sin argumentos, huérfano (PPID 1) y quieto en su bucle de eventos (`wm_window_events_process`); su RSS bajó de 150 a 26 MB | No está colgado; parece abierto a mano o con `open` | Kelvin o quien lo abrió | No se tocó |
| QA-14 | info (entorno) | Con el panel del navegador oculto, las pestañas dejan de pintarse: rAF baja a cerca de 1 FPS aunque `visibilityState` diga "visible", y las capturas salen viejas | Entorno (navegador integrado) | — | La batería ya no se cuelga: lo marca como aviso y mide el coste sintético por cuadro |
| QA-15 | info (entorno) | El servidor QA de 8766 (de QA) se cerró a las 21:47 con código 144, el mismo que da un SIGTERM aquí; no aparece en el log del vigilante | Otro proceso le mandó TERM (¿un agente que limpia servidores?) | QA | Reiniciado y luego detenido por QA al terminar; vigilar si le pasa al de 8765 |

## Jugado sin hallazgos (10 min, entradas simuladas y teclado real)
Caminar, correr con Shift, doble salto, planeo, vuelo con V hasta el techo (26 m) y bajada con C, impulso F, nado en el río y buceo en la poza hasta el fondo; los gestos 1–7; el creador por teclado (rechaza `<b>x</b>`, guarda «Nube QA» y cambia la ropa); el Diario; la pausa con Esc y con P (congela el mundo e ignora el salto); y la historia hasta el paso 6 de 8, incluida «La ruta de la gota» completa (4 perchas, terrenos desde arriba, vapor, gota, buceo y explicación a Luma), la crecida y el refugio dañado. 0 errores de JavaScript durante la sesión.
