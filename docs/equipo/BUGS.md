# Tablero de bugs · QA

Dueño del tablero: QA / troubleshooting. Cada dueño cambia el **estado** de sus filas (o se lo dice a QA) y QA lo verifica con la batería. Junto a este tablero: `TEAM_AUDIT.md` (estado por rol) y `PRODUCTION_DASHBOARD.md` (build estable, tareas y riesgos).

**Última corrida:** 2026-10-24 22:50 (hora local) sobre **v19-publicada = 19d152a**, en un worktree limpio servido aparte, con `index.html?qa=1`, Chrome 152 en Apple M4, 1950×1110, DPR 2. El informe queda en `tests/out/qa_report.md` y `.json` del servidor donde corre.

| Métrica (v19) | Valor |
|---|---|
| Pruebas | En main 227f99e también pasan saveTest 27/27 y comicTest 19/19 (11 baterías, 0 errores de consola; QA-16 verificado). En v19: selfTest 52/52 · missionTest 35/35 · accessoryTest 12/12 · templateTest 19/19 · eduTest 63/63 · maestroTest 22/22 · criaderoTest 32/32 · movementTest 22/22 · **e2eTest 13/13** |
| E2E en v18-publicada (f4a31d1) | 8/13: el creador no deja empezar (QA-17) |
| Consola | 0 errores de JS · 0 warnings · 1 recurso que falla (QA-16, ya corregido en main 9f970d5) |
| Draw calls / triángulos, calidad alta | taller 112 / 398 k · villa 97 / 363 k · A 99 / 391 k (el post-proceso se suma por diferencias de `info`) |
| FPS | Sin medir en v19 (el panel del navegador estaba oculto). En main 227f99e, ya pintando: taller **24,8** (QA-20), villa 48, A 60 |
| Memoria, 10 cambios de ropa | fuga 0 en geometrías, texturas, programas y objetos (si una vuelta sube, se repite antes de declarar fuga) |
| Carga en frío | personaje 3D a 1,5 s · 15,1 MB en 125 peticiones (presupuesto 8 MB) |
| Publicable | 35,5 MB (presupuesto 30 MB) |

**Re-correr:** abre `index.html?qa=1` con la pestaña al frente; corre todas las `AV.*Test` del pack y el E2E al final. Desde la consola: `(d => { const s = d.createElement('script'); s.src = 'tests/qa/qa.js?' + Date.now(); d.head.appendChild(s); })(document)` y luego `await AVQA.done`. El E2E se puede correr solo: inyecta `tests/qa/e2e.js` y llama `await AV.e2eTest()`. Para probar una rama o etiqueta sin tocar la copia de nadie: `git worktree add --detach <carpeta> <rama>` y sírvela con `tests/server.py <puerto>`.

## Abiertos y recientes

| id | severidad | pasos | causa raíz probable (archivo:línea) | dueño | estado |
|---|---|---|---|---|---|
| QA-17 | **bloqueante** | v18-publicada (f4a31d1), partida nueva: el creador muestra el nombre con dos listas vacías y «Empezar la aventura» responde «Escribe un nombre inventado…». El jugador no sale del creador; en el E2E pasa de 13/13 a 8/13 | b44a44e cambió `index.html` (los selects #p-name-a y #p-name-b y el output #p-name), pero `src/game/creador.js` no los llena hasta 10f9671 (`git show v18-publicada:src/game/creador.js \| grep -c p-name-a` da 0) | Seguridad infantil (cambio) y coordinador (publicación) | **Resuelto en v19-publicada** (19d152a, E2E 13/13) |
| QA-20 | media | `?qa=1` en main (227f99e + copia de trabajo), con la pestaña pintándose: el taller da **24,8 FPS** de media (mín 4,6) con 70 tirones en 5 s, en calidad alta; villa 48 y A 60. El coste sintético en el taller es el doble que en A (34 ms frente a 17) | Mientras se mide se suben 20 texturas nuevas y la resolución dinámica baja el DPR de 2 a 1,5 y luego a 1: el taller es la primera vista y la más cargada (estructuras, flora y post). En un M4; en un Chromebook será peor | Programador gráfico | Abierto |
| QA-16 | baja | Al abrir un diálogo sin retrato, la consola dice «no cargó IMG http://…/?qa=1» y el navegador vuelve a pedir index.html | `src/game/dialogo.js:37`: `$('d-img').src = l.img` incluso con `''` | Programador de gameplay | **Cerrado** en main 9f970d5; verificado por QA (0 errores de consola en la batería de 227f99e) |
| QA-02 | media | Warning de Three por `flatShading` en MeshLambertMaterial | `content/cap1/educativa.js` (roca) | Programador de gameplay | **Cerrado** (ahora Phong con flatShading); verificado: 0 warnings |
| QA-03 | media | Tirones en la primera visita a la parcela A (mundo viejo) | Mundo viejo; el mapa de El Yunque precarga todo y la calidad adaptativa espera | Programador gráfico | **Cerrado por cambio de mundo.** Nuevo riesgo: el cambio de preset (57 shaders) congela unos segundos el taller (18 FPS); se puede fijar con `?calidad=` |
| QA-04 | media | Partida nueva con teclado: Tab desde «Jugar» entra al creador tapado; tras «Jugar» el foco cae en BODY | `index.html:15`, `<dialog open>` no modal; `src/game/creador.js`, `open()` no enfoca el creador | Programador de gameplay | Abierto |
| QA-05 | media | En móvil de 375 px, `#prompt` corta el texto a mitad de palabra | `src/ui/ui.css` `#prompt`: flex con `text-overflow` sobre texto suelto | Programador de gameplay | Abierto |
| QA-06 | baja | En móvil, el HUD de arriba ocupa ~38 % del alto | `src/ui/ui.css` (`@media` de móvil) | Programador de gameplay | Abierto |
| QA-07 | baja | Al abrir el Diario el foco no entra a la tarjeta | `src/game/diario.js` (`showCard` sin foco) | Programador de gameplay | Abierto |
| QA-08 | baja | El error del creador no se anuncia a lectores de pantalla | `index.html` `#p-error` sin `role="alert"` | Programador de gameplay; coordinador por `index.html` | Abierto |
| QA-10 | baja | Lo publicable pesa 35,5 MB (presupuesto 30) y la descarga inicial 15,1 MB (presupuesto 8) | `*_glb.js` de ropa (11,9 MB), edificios (10,6) y entorno (4,0); el mapa precarga todo al arrancar | Coordinador, con gráfico, traits y edificios | Abierto (PRODUCTION_DASHBOARD H2) |
| QA-18 | baja | selfTest «El aprendiz aparece en el mundo» falló en 0e25e91 | El compañero pasó a ser la cría del criadero (0e25e91) y la prueba no estaba al día | Programador de gameplay | **Cerrado** en cc176a4 (selfTest 52/52 en v19) |
| QA-19 | baja | movementTest falla «Aterrizar (V)» si antes corren otras pruebas, y da 12/22 con el creador abierto | La cámara giraba sola (seguimiento perezoso) y la prueba no preparaba el mundo | Movimiento | **Cerrado** en b7182ce y 0e25e91; 22/22 en la batería de v19 |
| QA-09 | baja | Módulos sin enlazar en `index.html` | — | Coordinador | **Cerrado**: ya no queda ninguno (aula.css se inyecta desde aula.js, y la batería ahora cuenta lo inyectado) |
| QA-11 | alta (entorno) | El vigilante bajaba de prioridad el servidor arrancado con el python de Blender | `tools/sys/vigilante.sh` buscaba por subcadena de la ruta | QA (arreglo) y técnico PC | **Cerrado**: commit 3675a5a; el vigilante corre con el arreglo (pid 55685) y los servidores tienen nice 0 |
| QA-01, QA-12, QA-13, QA-14, QA-15 | — | Ver el historial de git de este archivo (c86dffa) | — | — | Cerrados o informativos |

## Matriz móvil emulada (v19, 2026-10-24 22:40)
Hecha en el navegador integrado con `resize_window`. El panel estaba oculto, así que rAF no corrió y **no hay FPS reales**: el coste sintético (update + render + lectura de 1 píxel) con la GPU relegada solo orienta.

| Ancho | Emulación | Controles | Maquetación | Volar / Aterrizar | Agua | Calidad y DPR |
|---|---|---|---|---|---|---|
| 375×812 | móvil (`pointer: coarse`) | joystick, Saltar, Volar, Impulso y Acción visibles; 0 botones menores de 44 px | sin solapes, nada fuera de pantalla, sin scroll horizontal | táctil OK (Volar → Aterrizar → Volar), sin errores | Bucear sustituye a Volar | medio, DPR 1,5 |
| 768×1024 | tablet sin táctil (el emulador no la da) | sin controles táctiles (es lo esperado sin `pointer: coarse`) | sin solapes ni desbordes | OK por PointerEvent, sin errores | OK | alto, DPR 2 |
| 1366×768 | escritorio | HUD y ayuda de teclas | sin solapes ni desbordes | OK, sin errores | — | alto, DPR 2; lienzo de 2732×1536; sintético 30 ms (p95 61) |

Pendiente de verdad: iPad (táctil a 768 px), Chromebook y Android con FPS reales (PRODUCTION_DASHBOARD H3).

## Jugado sin hallazgos (sesión del 21:40, mundo viejo)
Caminar, correr, salto doble, planeo, vuelo hasta el techo, impulso, nado y buceo; los gestos 1–7; el creador por teclado; el Diario; la pausa con Esc y P; y la historia hasta el paso 6 con «La ruta de la gota» completa. 0 errores de JS.
