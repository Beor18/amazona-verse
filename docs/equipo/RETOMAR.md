# Cómo retomar Amazona Verse desde cualquier sesión (web o Mac)

Actualizado: 28-oct-2026, por la sesión coordinadora de Claude en la web (claude.ai/code).

## Foto del 29-oct, 00:40 AST (Kelvin se va a dormir; todo en marcha continua)

- **Grok volvió con crédito (29-oct)** y confirmó que **nada quedó a medias** (C, D, J, K y A: «nada pendiente»). Reparto vigente, tabla al principio de `docs/equipo/GROK_AGENTES.md`: E = BM6 colisiones y cámara; D = BM14 gráficos pixelados + copas a escala; J = BM8 piezas en el aire y aldeas; H = BM9 capítulos 2–6 en móvil; F = BM10 minijuegos; A = BM12 (tras BM6); M = BM13 (tras BM4). El detalle de cada BM está en `docs/equipo/TAREAS_API.md`. Carril L: G29 (capturas para el tráiler) en `respaldo/grok-g29-29oct`, pendiente de repetir `movementTest` sola y pasar a `main`.
- **La API de la Mac** (`~/AmazonaVerse/juego_api`, una ventana por trabajador: `tools/agente_api/ejecutar.sh --cola 1 --total 60`) se queda solo con lo de Blender/GPU: BM2, BM3, BM4, BM5, BM1, BM11 (cola en `tools/agente_api/cola.txt`). Crédito ~$141 (Kelvin recargó $100; tope total 461). Al cerrar esta foto no había subido nada; si las ventanas no imprimen nada tras `######## BMn`, probar `--prueba` (tope $0,50) para ver si la API contesta.
- **La coordinadora (esta sesión)** corre una **ronda cada 2 horas** (`trig_01FUhw3GkY99gH6xEoMViTJ5`): une, prueba, publica, revisa capturas y rellena la cola. Publicado hoy hasta `857a941` (edificios y luz). Teaser v6 montado (`docs/equipo/AUDIOVISUAL_GROK.md` §9); Kelvin le pone voz en CapCut.
- **Pendiente de Kelvin:** aprobar lo visual en el juego; decidir si las empalizadas y toldos tumbados de su escena se enderezan; subir el teaser a la portada («súbelo»); las decisiones C de `GAME_FIRST.md` §5; Remote Control de la Mac (la carpeta `juego_api` no aparece todavía en la lista).

## Foto del 28-oct por la tarde (se retoma el sábado 31-oct)

**Por qué se para:** el uso de Grok (los agentes de Cursor) llegó al 100 % el 28-oct y se reinicia en ~5 días (**~2-nov**). Kelvin: «seguimos el sábado». La coordinación automática está **pausada** (`trig_01BKiinrvnVh6Brsi6g9MSFF`) y hay **una sola ronda programada el sábado 31-oct a las 8:23 a.m. de Puerto Rico** (`trig_01FNFzXEUUQpXpc9mR1KkzvM`).

**Publicado:** amazonaverse.com sirve `e2315a5` (commit de sitio `ad6234c`, 28-oct 18:08 UTC), con las 12 baterías obligatorias en verde en la nube. Entró hoy: el arreglo de la charla de Iguaca (missionTest y eduTest), QA-61 (el zoom de la cámara y el pellizco en el móvil), QA-53 primera y segunda parte (el congelón de «Empezar» bajó de 6 s a menos de 1 s; el troceo de terreno y sólidos, G22), QA-41 (la capa negra de los Retos), los minijuegos (QA-49, QA-50, QA-51), la descarga inicial en ~5 MB (QA-10), Amazona Maze en el menú, los tejados rojos (F2.2), F2.1 (el `_hd` a 90 m en media y 120 m en alta), la Ciudad de los 36 en marfil, las copas a escala en el tepuy, la piedra crema de las ciudades (G24), las aldeas de madera desde el aire (G25), los bohíos de Villa Raíz a ×1,75 con uno que se puede entrar (G27) y el creador con nombre propio, filtro y 🎲 (G28).

**Lo que quedó a medias (pausado, en el tablero con lo que falta):**
- **G18 · Ciudad de los 36:** marfil desde el aire; faltan sombra y oclusión, cúpulas, cornisas y almenas, y el conjunto de la izquierda. BM2 (API) rehace sus lejanos.
- **G19 · Selva y bosque:** copas a escala solo en el tepuy; faltan en el resto del mapa (la colina y los miradores siguen con discos gigantes) y el dosel continuo. BM3 (API) hornea el dosel.
- **G24 · Ciudades de piedra:** crema plana como yeso, rocas pintadas de crema y piezas en el aire.
- **G22 · QA-53:** el código está publicado; falta medirlo en el móvil (BM1).
- **Audiovisual (G29–G32):** sin empezar; los 4 paquetes de producción están listos (`docs/equipo/av/paquetes.json`).

**La API en la Mac:** cola con BM2, BM3, BM4, BM5 y BM1 (`tools/agente_api/cola.txt`), arrancada desde la copia limpia `~/AmazonaVerse/juego_api` con `--cola 2 --total 19`. Al cerrar esta foto **no había subido nada** a GitHub. La carpeta vieja `~/AmazonaVerse/juego` quedó con un merge a medias del corte de luz: no se toca hasta respaldarla.

**Plan del sábado 31-oct (Grok vuelve ~2-nov):**
1. Ver qué subió la API (BM2 y BM3 sobre todo) y publicar lo que haya.
2. Con el crédito de Claude recién reiniciado, **Claude toma los carriles C, D y J** (la ciudad, las copas en todo el mapa y la sombra de la piedra) hasta que vuelva Grok, con las mismas reglas y pruebas.
3. El ~2-nov, reactivar los carriles de Grok por orden: C, D, J, K, luego H (bugs) y el audiovisual (G29–G32).
4. En cuanto Kelvin apruebe el mapa: tráiler (`docs/equipo/AUDIOVISUAL_GROK.md`) y la portada GAME-FIRST (`docs/GAME_FIRST.md` §6).

**Pendiente de Kelvin:** aprobar lo visual (la ciudad, la selva, las aldeas y los bohíos ×1,75); las 14 decisiones marcadas C en `docs/GAME_FIRST.md` §5; K1–K4 de `AUDIOVISUAL_GROK.md` §15 (quién pulsa «generar» en Grok Imagine; la biblia visual y el storyboard; los resultados de las pruebas; los términos de xAI); el logo vectorial; el correo de contacto; los 13 estados UICN; si recarga $50 de la API después de ver BM2.

**28-oct: Kelvin pasó el control a la sesión coordinadora de la web.** Desde aquí se revisa lo de Grok, se capturan las vistas en vivo y se dejan los pedidos. El build ya corre en la nube (comprobado: 6f45cda en 24 s) y las 13 baterías se están probando ahí, con `AV_PYTHON` = el python3 del contenedor y `AV_CHROME` = un envoltorio del Chromium de Playwright, que cambia `--use-angle=metal` por SwiftShader. Sin GPU, cada captura tarda unos 15 minutos. La Mac (supervisor) puede seguir uniendo y publicando; si las dos publican, gana el último push y nadie hace `--force`.

**Pruebas en la nube (comprobado el 28-oct sobre 6f45cda/2905a27, sesión «Organizar archivos Amazona Verse»):** `AV_PYTHON=/usr/bin/python3` y `AV_CHROME` = un envoltorio de `/opt/pw-browsers/chromium` con `--no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`. Resultado: 28 baterías en verde (selfTest, missionTest, e2eTest, ep2–ep6, accesibilidad, récords…); `movementTest` 42/43 solo por el tiempo de arranque (467 ms frente a 180 ms, por el render por software), y `streamingTest` agota los 600 s y corta las extra que van detrás. O sea: la nube sirve para ver si algo se rompe en la lógica, pero las medidas de tiempo y de streaming hay que mirarlas en la Mac o en un teléfono real.

## Quién hace qué
- **Grok (Cursor)** hace todo el trabajo pendiente: la API ya no se usa (queda poco crédito). Sus pedidos están en `docs/equipo/PEDIDOS.md` (el último manda).
- **La sesión coordinadora de Claude** une el trabajo de Grok, revisa la calidad visual (en vivo, contra las referencias de Kelvin) y publica.
- **Kelvin** decide el canon, el dinero y aprueba todo lo visual.

## Dónde está cada cosa
| Qué | Dónde |
|---|---|
| Tablero y tareas | `docs/equipo/TRABAJO_SIMULTANEO.md` (Grok), `docs/equipo/TAREAS_API.md` (historial de la API) |
| Pedidos entre agentes | `docs/equipo/PEDIDOS.md` |
| Bugs | `docs/equipo/BUGS.md` (QA-53 sigue abierto) |
| Plan del mapa | `docs/equipo/MAPA_PLAN_COMPLETO.md`; vistas de captura en `tools/build/mapa_vistas.json` (la buena de la ciudad es `ciudad_tepuy`) |
| Metas visuales de Kelvin | `docs/img/ciudad_tepuy_meta_kelvin.jpg` (la gran ciudad), `docs/img/mapa_audit_original_2022.jpg` (todo el mapa), `docs/img/referencia_manga_toon.webp` (cómic, en pausa) |
| Historia | `docs/equipo/TEMPORADA1_HILO.md` (39 decisiones [KELVIN] pendientes al final) |
| Estándar visual | `docs/equipo/ESTANDAR_VISUAL.md` |
| Trabajo a medias del último reinicio | `refs/respaldo/20261027-2108` en GitHub (`git fetch origin 'refs/respaldo/*:refs/respaldo/*'`) |

## Pendiente para el lanzamiento, en orden
1. **La gran ciudad del tepuy como la imagen de Kelvin** (Grok, G18): blanca y crema, con cúpulas, sin torres raras.
2. **La selva sobre el tepuy alrededor de la ciudad** (Grok, G19 = BL1).
3. **QA-53:** la pantalla se congela en el móvil al pulsar «Empezar».
4. **Las aldeas con tejados rojos** legibles desde el aire (F2.2) y el `_hd` a más distancia (F2.1).
5. Revisar en vivo **Amazona Flight** (BK1: Vittata de 3/4 + los árboles de la primera versión) y enseñárselo a Kelvin.
6. Las **39 decisiones de canon** de Kelvin.
7. **QA final** en teléfonos reales.

**En pausa por orden de Kelvin:** el cómic Manga Toon (no gastar más ahí) y los minijuegos nuevos.

## Cómo se publica
- **Desde el 28-oct se publica sin pedir permiso a Kelvin** (DECISION_LOG) en cuanto las pruebas obligatorias pasan. **En la nube:** `tools/build/publicar_nube.sh` hace todo (pull, build de HEAD, pruebas con SwiftShader y tiempos máximos de nube, `sitio.sh`, commit de `sitio/` con índice temporal y push). Con `--probar` no publica. Solo tolera el fallo de tiempo de arranque de `movementTest`; cualquier otra falla, tiempo agotado o error de consola no publica. Si no publica, deja la falla en `PEDIDOS.md` para el carril que corresponda. La Mac de Kelvin está apagada desde el corte de luz del 27-oct.
- `tools/build/build.sh HEAD <carpeta>`, luego `tools/build/test.sh <carpeta>/ --extra` y luego `tools/build/sitio.sh <carpeta>/site`.
- Haz commit de `sitio/` con un índice temporal y push a `main`. Vercel publica amazonaverse.com en 1–2 minutos.
- Solo publica si las pruebas obligatorias están en verde.
- En la Mac de Kelvin esto lo hacen solos `~/AmazonaVerse/_herramientas/coordinacion/supervisor.sh`, `publicar.sh` y `unir_grok.sh`.

## Reglas que no cambian
Las de `AGENTS.md`:
- una sola rama, `main`;
- commits con índice temporal y solo de tus archivos;
- nada en segundo plano sin esperar el resultado;
- nunca detener el trabajo de otro;
- nada visual se da por hecho sin que Kelvin lo vea;
- todas las edades, sin violencia, chat ni compras.
