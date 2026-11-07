# ESTADO REAL DE AMAZONA VERSE · 6 de noviembre de 2026

Preparado por: sesión coordinadora en la nube (Claude), a pedido de Kelvin García. Corte: origin/main en `9c3372f5` (6-nov-2026).

Base de comparación: el informe del 4-nov (corte `6f778914`, 4-nov 04:11 UTC). Entre los dos cortes hay **711 commits** [Comprobado: `git log --oneline 6f778914..HEAD | wc -l`].

**Cómo leer las etiquetas**
- **[Comprobado]**: lo vi en el código, en un commit, en un archivo de medidas o en el informe de pruebas que guarda cada publicación (`docs/equipo/ultima_publicacion.json`).
- **[Reportado]**: lo dice un documento del repo, el mensaje de un commit o el informe de otro agente, y no lo volví a comprobar.
- **[No verificado]**: inferencia, o no encontré evidencia.
- Datos privados: este informe no incluye facturas, precios, cuentas, correos, claves ni el origen de compra de los recursos. Lo legal se nombra solo como «pendiente de Kelvin».

Novedades de hoy: Kelvin **confirmó la matriz de 36 poderes** como base, con nombres provisionales, y **aprobó la V18.2** (evolución, niveles y alianzas) para diseño y prototipo. La V18.2 todavía no tiene código en main [Comprobado: `docs/DECISION_LOG.md` 6-nov; `9139b6c4`; `9c3372f5`; `ls src/game/v18/` no muestra `evolucion.js`].

---

## 0. Cómo vamos en una tabla

Todos los % salen de una lista que se puede contar. La base va al lado. Los tiempos son días de trabajo del equipo actual (3 Kimi, la Mac y 2 cuentas de Claude en la nube) y no incluyen las esperas por Kelvin.

| Área | % real | Base | Estado | Falta | Tiempo estimado |
|---|---|---|---|---|---|
| **Temporada 1 en conjunto** | **74 %** | 40 de 54 criterios de cierre (6 caps. × 9 criterios, ver §3) | Los 6 capítulos se juegan de punta a punta; ninguno está cerrado del todo | Playtest con niños en 5 caps.; decisiones de Kelvin en 3; fichas de datos en 3; bugs propios en 2; inglés en 1 | Equipo: 5 a 9,5 días (2 a 3 semanas de calendario compartiendo con V18). Kelvin: 1 sesión de playtest de 2 a 3 h y unas 6 decisiones cortas |
| Cap. 1 · El día que el cielo se rompió | **78 %** de cierre (**100 %** de hitos) | 7 de 9 criterios (faltan C7 y C8) · 28 de 28 hitos de `CAP1_PENDIENTE.md` | Cerrado en hitos; con recorrido móvil 29/29 | 15 de 23 fichas «parcial» o «por_verificar»; 2 decisiones abiertas (guion H1 c y mariposa K46); playtest tras el recorte a 6 pasos | Equipo: 1 a 2 días. Kelvin: guion (H1 c), mariposa (K46), prueba con su hijo (P4) |
| Cap. 2 · Un lugar para todos | **89 %** | 8 de 9 criterios (falta C6) | Casi cerrado (con los 5 criterios del 4-nov: de ≈ 60 % a 80 %) | Playtest; revisar la fuente de la ficha de la casa criolla (E9) | Equipo: 0,5 días. Kelvin: playtest |
| Cap. 3 · Más allá de la bahía | **56 %** | 5 de 9 criterios (fallan C4, C6, C7 y C9) | Jugable; con los 5 criterios del 4-nov sigue en 60 % | CG-51 (fuente en español en inglés); etimología de «canoa»; la zona del código no es la que Kelvin aprobó en H18; playtest | Equipo: 0,5 a 1 día (+3 a 5 si se muda a Puerto de La Mina). Kelvin: confirmar zona y etimología |
| Cap. 4 · El precio del progreso | **89 %** | 8 de 9 criterios (falta C6) | Casi cerrado (5 criterios del 4-nov: de ≈ 60 % a 80 %) | Solo el playtest | Equipo: 0 días. Kelvin: playtest |
| Cap. 5 · Las voces olvidadas | **78 %** | 7 de 9 criterios (fallan C6 y C8) | Jugable (5 criterios del 4-nov: de ≈ 60 % a 80 %) | 2 fichas de canon en «por_verificar» que pueden pasar a «juego»; medir en iPad; playtest | Equipo: 0,5 días. Kelvin: playtest |
| Cap. 6 · El pacto de los 36 | **56 %** | 5 de 9 criterios (fallan C6, C7, C8 y C9) | Jugable; con los 5 criterios del 4-nov sigue en 60 % | Cotorras vivas feas (KIMI-122); aprobación de la Ciudad (A9); QA-153; ficha «esperan»; emblema; playtest | Equipo: 2,5 a 5,5 días. Kelvin: A9, emblema, playtest |
| V18.1 «El mundo que cambia contigo» | **74 %** | 17 de 23 criterios de la directiva (los 7 elementos del «Alcance mínimo» de la §2 y los hitos de la §5: alcance 7/7, D7 4/4, D14 4/4, D21 1/3, D30 1/5) | D7 y D14 cumplidos el 5-nov, con 6 y 13 días de adelanto. Publicado detrás de `?v18=1` | Regresión con la bandera (KIMI-106); videos (KIMI-121); prueba con Kelvin; ronda con niños; informe; decisión final | Equipo: 3 a 5 días para cerrar D30. El resto depende de Kelvin |
| Minigolf «La Ruta de las Semillas» | **77 %** (hoyo 1) | 17 de 22 (13 de 14 puntos de la §5 + 4 de 8 entregables de la §15) | Hoyo 1 jugable en computadora, publicado detrás de `?v18=1` | Video; confirmación en el móvil; lista de problemas; estimación de 6 hoyos; validación de Kelvin | Hoyo 1: 1 a 2 días. 6 hoyos: 7 a 11 días-cuenta, solo después de que Kelvin valide el hoyo 1 |
| Piloto escolar | **23 %** | 3 de 13 puntos del checklist de `ROADMAP.md` (2, 4 y 6) | Lo técnico va en 3 de 6; lo de Kelvin y lo legal en 0 de 5 | Chromebook sin medir; edificios graves; iPad en el tepuy; playtest con informe; revisión legal pendiente de Kelvin; UICN; canon | Técnico: 4 a 8 días. Lo legal y de Kelvin: no se puede estimar |
| Gráficos y edificios | **54 %** de los graves arreglados [Reportado] | 15 de 28 edificios de gravedad alta con arreglo reportado en filas de `TAREAS_API.md` (12 siguen mal, 1 dudoso); sin auditoría que lo compruebe | Sin auditoría nueva desde el 1-nov; cotorras vivas son la prioridad 1 de Kelvin | 9 templos, `monumento_g`, `corral`, `complejo_ruinas` (A9); KIMI-122; 23 edificios de gravedad media y baja sin revisar | KIMI-122: 1 a 3 días. Templos y otros: 3 a 6 días |
| Rendimiento en aparatos reales | **75 %** de los aparatos con alguna medida | 3 de 4 aparatos objetivo medidos al menos una vez (Android, iPad, iPhone; **Chromebook nunca**) | Juego publicado: iPad 56 FPS, Android 60, iPhone 60 (mín. 45). La V18.1 y el minigolf: 0 medidas en aparato real | Chromebook; demo V18.1 en iPhone/iPad; iPad en el tepuy; Sombra en «medio»; Android por capítulo | 1 a 2 días de equipo, pero **depende de los aparatos de Kelvin** |

**Lectura rápida**
- **El juego publicado está sano.** 12 de 12 baterías obligatorias en verde, 0 errores de consola, 6,6 MB de carga inicial. Desde la última publicación (`9e691e67`) entró código nuevo en main: el minigolf por turnos y 2 cotorras más (`9d488aec`, de la otra cuenta). Sale en la próxima publicación [Comprobado: `git log 9e691e67..origin/main -- src`].
- **La V18.1 va adelantada en código** (D7 y D14 hechos el 5-nov). Lo que falta para D21 y D30 es sobre todo trabajo con personas: Kelvin, niños y aparatos reales.
- **Los caps. 2 y 4 están a un playtest de cerrarse.** El cuello de botella de la temporada es la prueba con niños (C6), que ninguna prueba automática sustituye.
- **Lo más visible está feo:** las cotorras vivas (KIMI-122, prioridad 1 de Kelvin) y 12 de 28 edificios graves. Es el riesgo n.º 1 contra la regla de calidad comercial.
- **Varios documentos van por detrás de main** (tablero V18, `BUGS.md`, `PENDIENTES_KELVIN.md`, `ROADMAP.md`). Las cifras de este informe se cotejaron con commits.

---

## 1. Lo que se está construyendo ahora

| Carril | Base contable | Avance | En curso ahora | Fuente |
|---|---|---|---|---|
| Kimi, tanda «1c» (KIMI-100 a 122) | 12 tareas: 8 hechas, 2 en curso, 2 pendientes | **67 %** (8 de 12) | KIMI-111 (parche blanco de noche en iPad, QA-106); KIMI-122 lo lleva otra cuenta y Kimi valida | [Comprobado: `TAREAS_KIMI.md`] |
| · Kimi 1 (KIMI-100 a 106) | 7 tareas, 6 hechas | 86 % (6 de 7) | KIMI-106 pendiente: regresión de los 6 caps. y móvil con y sin `?v18=1` | [Comprobado] |
| · Kimi 2 (KIMI-110 y 111) | 2 tareas, 1 hecha | 50 % (1 de 2) | KIMI-111 | [Comprobado] |
| · Kimi 3 (KIMI-120 y 121) | 2 tareas, 1 hecha | 50 % (1 de 2) | KIMI-121 pendiente: 2 videos reales (ciclo V18 y un hoyo de minigolf) | [Comprobado] |
| Mac, tanda BM141 a BM156 | 16 tareas, 13 hechas | **81 %** (13 de 16) | BM153 (10 capturas con GPU real), BM155 (retratos de guildingii y diadema), BM156 (más edificios en «bajo»). La rama de la Mac (`origin/api-Kelvins-iMac`, último commit `ffad4df1`, 5-nov 21:05 UTC) está 214 commits por detrás de main: necesita `git pull` [Comprobado: `git rev-list --count origin/api-Kelvins-iMac..HEAD`] | [Comprobado: `TAREAS_API.md`, `tools/agente_api/cola.txt`, `7437e616`] |
| Web, otra cuenta (W1 a W21) | 21 filas, 18 «hecha» | **86 %** (18 de 21; 20 de 21 si se cuentan W19 y W20, cerradas solo en un aviso) | W18 (su fila dice «sigue con QA-156 (b)», pero `BUGS.md:52` ya marca (b) resuelto en `83344922`: la fila parece desfasada), W26 (seguridad del ranking apagado: solo documento y diff). W22 a W25 sin commits [No verificado: si siguen vivas] | [Comprobado: `TAREAS_WEB.md`; `0b65e755`; `46108f5a`] |
| Tablero V18.1 (funciones en alcance) | 12 funciones: 10 VERIFICADO, 2 DEMOSTRABLE | **83 %** (10 de 12) | El tablero no incluye aún el minigolf ni las 2 cotorras del 5-nov por la noche | [Comprobado: `V18_TABLERO.md`] |
| Cursor/Grok (CG-1 a CG-68) | 68 filas cerradas: 65 hechas, 3 descartadas, canceladas o de otro carril (CG-1, CG-5, CG-39) | **100 %** cerradas (68 de 68); 96 % hechas (65 de 68) | Parado: sin commits desde el 4-nov a mediodía (UTC) | [Comprobado: `TAREAS_CURSOR_GROK.md`, `eecdd5e7`] |
| Nube coordinadora (N1 a N17) | 17 de 17 hechas | **100 %** | Prototipo V18.2 (`src/game/v18/evolucion.js`): aún sin fila ni código | [Comprobado: `TAREAS_NUBE.md`; `ls src/game/v18/`] |

**Tareas abiertas, con estimación**

| Id | Quién | Qué | Siguiente paso | Estimación (días de trabajo) |
|---|---|---|---|---|
| KIMI-122 | Otra cuenta de Claude; Kimi valida con GPU | Cotorras vivas que parezcan cotorras (bandada, residentes, comunidades, ciudad viva). Hoy son «bolas verdes arrugadas» | Revisar el horneado de `vittata_base_lod1.glb` o rehornear desde el personaje, sin tocar Vittata; mantener 2 draw calls; antes/después en bajo, medio y alto | 1 a 2 + 0,5 de validación. El visto bueno es de Kelvin |
| KIMI-111 | Kimi 2 | Parche blanco brillante de noche en el iPad (QA-106) | Comparación A/B de día y noche | 0,5 a 1. Toca el look aprobado: decide Kelvin o la coordinadora |
| KIMI-106 | Kimi 1 | Regresión de los 6 caps. y móvil con y sin `?v18=1` | Tabla con y sin bandera; lo nuevo, a `BUGS.md` | 1 a 1,5 |
| KIMI-121 | Kimi 3 | 2 videos reales a 1080p | Grabar en `docs/img/kimi121/` | 0,5 a 1 |
| BM153, BM155, BM156 | Mac | Capturas, 2 retratos, edificios en «bajo» | Actualizar la Mac (suele hacerlo Kelvin a mano) | 0,5 + 0,3 a 0,5 + 0,5 |
| W18 | Otra cuenta | Bugs abiertos no gráficos (la fila aún nombra QA-156 (b), ya resuelto en `83344922`) | Actualizar la fila o tomar el siguiente bug | 0,5 |
| W26 | Otra cuenta | Propuesta de seguridad del ranking (apagado) | Documento y diff, sin desplegar | 0,5 a 1. Encenderlo: pendiente de Kelvin |
| Prototipo V18.2 | Coordinadora | Vittata con 3 etapas, Arausiaca, experiencia y nivel, alianza Eco Protector, rival IA, guardado y móvil | Primer módulo detrás de la bandera | 2 a 4 [No verificado: no hay plan con hitos]. Niveles y equilibrio: Kelvin |

Supuestos: el ritmo es el del 5-nov (Kimi 1 cerró KIMI-100 a 105 en menos de 2 h [Comprobado: `adcc4408` a `50805cd6`]); los 3 Kimi en paralelo; la Mac con 1 trabajador; no cuentan las esperas por Kelvin.

---

## 2. Lo nuevo: V18.1 y el Minigolf

El informe del 4-nov no tenía esta sección: la V18.1 arrancó el 5-nov (D1). Todo lo que sigue es nuevo. Lo de la V18.1 está publicado detrás de `?v18=1`; para el público el juego es el de antes [Comprobado: `DECISION_LOG` 5-nov, respuesta 18].

**Aviso:** el tablero V18 (última edición `0ac2ecf5`) dice que lo publicado es `0c3d4dcc` y que QA-165, QA-173 y QA-174 siguen abiertos. Sus arreglos (`a5f3caa9`, `cc0e3414`, `b2af0d27`) ya están en `9e691e67`, que es lo publicado [Comprobado: `git merge-base --is-ancestor`].

### Estado por función

Las cifras de las pruebas V18 son las últimas reportadas por el equipo. `ultima_publicacion.json` solo guarda las 12 obligatorias.

| Función | Estado | Prueba (último resultado) | Evidencia | Qué falta |
|---|---|---|---|---|
| Progreso compartido y bandera `?v18=1` | VERIFICADO | `v18Test` 7/7 [Reportado] | `350205b5`, `81eeea0e`, `a5f3caa9` | Pasar QA-165 a resuelto en el tablero |
| Poderes de las 2 especies base | VERIFICADO | `v18CombateTest` 37/37; `v18FxTest` 17/17 [Reportado] | `1e70823a`, `856286bf`, `9d776596` | — |
| Cotorras nuevas con poder | VERIFICADO | `v18NuevasTest` 22/22 [Reportado] | `aaf79783`, `2acad2d8` | Retratos de guildingii y diadema (BM155) |
| Combate contra la IA | VERIFICADO | `v18CombateTest` 37/37; `v18CicloTest` 22/22 [Reportado] | `4506726e`, `cc0e3414`, `b2af0d27` | Video en iPhone o iPad real |
| Desbloqueo persistente | VERIFICADO | `v18DescubrirTest` 21/21 [Reportado] | `2c4887de` | — |
| Reparación persistente (puente) | VERIFICADO | `v18RepararTest` 30/30 [Reportado] | `0c3d4dcc`, `8f07c0aa`, `4113234d` | Video del cruce a pie (KIMI-121) |
| Sombra de Tormenta (amenaza 1) | VERIFICADO | `v18AmenazaTest` 21/21 [Reportado] | `519608c5`, `ae551d24`, `eab1f18a` | — |
| Serpiente de la Maraña y Sapo Encantado | EN CÓDIGO, sin cifra | 14 y 16 comprobaciones en el código [Comprobado: grep]; sin resultado [No verificado] | `25c9ca65` | Pasarlas al tablero con su resultado |
| Recompensa conectada | VERIFICADO | `v18CicloTest` 22/22 [Reportado] | `d3c3eb8f` | — |
| Ciclo dentro del mapa | DEMOSTRABLE | `v18CicloTest` 22/22 | Video de 1 min 16 s en computadora, fuera del repo [Reportado] | Video en aparato real; prueba con Kelvin |
| Duelo de 2 en la misma computadora | VERIFICADO (prototipo) | `v18Duelo2Test` 23/23 [Reportado] | `33e8d838`, `a94442d1` | No es puerta de D30. La Semilla de río no bota en el duelo [Reportado] |
| Minigolf, hoyo 1 | DEMOSTRABLE en computadora | `v18MinigolfTest` 29/29 [Reportado] | `2acad2d8`, `f8955179`, `9e691e67` | Video, móvil y validación de Kelvin |
| PvP online | FUERA DE ALCANCE | — | Directiva V18.1 §2 y §7 | Roadmap (V20-V21) |

### Las 36 especies: cuántas tienen poder funcional

**8 de 36 (22 %)**, o **8 de 34 (24 %)** sobre las que se pueden elegir en la temporada 1 (las 2 históricas no se eligen) [Comprobado: `src/game/v18/habilidades.js` l. 63-158; `nuevas.js`; `DECISION_LOG` 5-nov].

| # matriz | Especie | Poder | Coste | Cuándo llega |
|---|---|---|---|---|
| 1 | vittata | Grito del Yunque | — | Desde el inicio |
| 7 | arausiaca | Escudo de plumas | — | Se descubre en el ciclo |
| 4 | agilis | Quiebro | B | Primera victoria en duelo |
| 29 | farinosa | Ala fuerte | B | Puente reparado |
| 6 | barbadensis | Lluvia de semillas | B | Sombra dispersada |
| 17 | xantholora | Ojo del cenote | B | Victoria con otra cotorra |
| 9 | guildingii | Abanico de colores | B | Serpiente desatada |
| 24 | diadema | Semilla de río | M | Sapo despierto |

Quedan 26 para la temporada 1: 12 de coste B, 13 de coste M y 1 de coste A (#14, Imitación) [Comprobado: `V18_MATRIZ_36.md` menos las 8 hechas]. Kelvin confirmó la matriz el 6-nov [Comprobado: `DECISION_LOG` 6-nov].

### % real de la directiva V18.1

| Bloque | Criterios | Cumplidos | Lo que falta |
|---|---|---|---|
| Alcance mínimo (§2) | 7 | **7** | — |
| D7 (§5) | 4 | **4** | — (hecho el 5-nov) |
| D14 (§5) | 4 | **4** | — (hecho el 5-nov, `d3c3eb8f`) |
| D21 (§5) | 3 | **1** | Regresión de los 6 caps. y móvil con la bandera (KIMI-106); prueba con el fundador [No verificado: no consta en el repo] |
| D30 (§5) | 5 | **1** | Demo «estable» (depende de KIMI-106); ronda con niños (revisión legal pendiente de Kelvin); informe de qué divierte; decisión de Kelvin |
| **Total** | **23** | **17** | **74 % (17 de 23)** |

### % real del Minigolf

- **Puntos de la §5: 13 de 14 (93 %).** Del 1 al 13 tienen su comprobación en `v18MinigolfTest` (incluida la física con paso fijo: el mismo golpe acaba igual a 30 y a 144 FPS) [Comprobado: `minigolf.js` l. 595-705]. El 14 (controles en móvil) está programado pero sin comprobación ni prueba en un móvil.
- **Entregables de la §15: 4 de 8 (50 %).** Hechos: ubicación, enlace jugable, commit y pruebas. Faltan: video (KIMI-121), confirmación en móvil, lista de problemas conocidos y estimación de 6 hoyos (la doy abajo).
- **Minigolf en conjunto: 17 de 22 (77 %).**

### Hitos

| Hito | Fecha | Estado | Situación |
|---|---|---|---|
| D7 | 11-nov | 4 de 4 | **6 días adelantado** [Comprobado: commits del 5-nov] |
| D14 | 18-nov | 4 de 4 | **13 días adelantado** [Comprobado: `d3c3eb8f`] |
| D21 | 25-nov | 1 de 3 | A tiempo. KIMI-106 asignada; la prueba con Kelvin depende de él |
| D30 | 4-dic | 1 de 5 | A tiempo. Lo que falta es trabajo con personas, no código |

### Tiempos

| Objetivo | Trabajo técnico | Supuestos | Depende de Kelvin |
|---|---|---|---|
| 6 hoyos de minigolf (faltan 5) | 7 a 11 días-cuenta (5 a 8 de calendario) | Hoyos 2, 4 y 6: 1 a 1,5 días cada uno; hoyo 3 (rampas): 2 a 3, porque la física de hoy es 2D; hoyo 5 (noche): 1 a 2; cerrar el hoyo 1: 1 a 2 | La directiva pide validar el hoyo 1 antes de ampliar (§10 y §16). Sin eso no se empieza |
| Matriz de 36 (faltan 26) | 12 a 18 días-cuenta (7 a 12 de calendario con 2 cuentas) | B ≈ 0,25 día, M ≈ 0,5, A ≈ 1,5, más 1 a 2 de motor común. El 5-nov salieron 6 poderes en un día. Repartir por familias para no chocar en `habilidades.js` | Cómo se descubre cada especie, nombres de lugares reales, balance final. La V18.2 se apoya en estos poderes |
| Cerrar D30 | 3 a 5 días | KIMI-106 1 a 2; KIMI-121 1; arreglos 1 a 2; informe 0,5 | Video en aparato real, prueba con el fundador, ronda con niños (revisión legal pendiente de Kelvin) y decisión final |

---

## 3. Los seis capítulos

**Cómo se calcula el %.** Cada capítulo se mide con los mismos **9 criterios de cierre**, 1 punto cada uno. Mide qué tan cerca está de poder cerrarse, no cuánto contenido tiene.

| # | Criterio |
|---|---|
| C1 | Historia y misiones jugables, con la prueba del capítulo en verde |
| C2 | Se juega en el mapa real y tiene zona en `src/game/zonas.js` |
| C3 | Hay un recorrido a pie (sin teletransporte) en verde |
| C4 | En inglés no sale texto en español |
| C5 | Se termina en el móvil con toques reales (CG-66) |
| C6 | ~~Se midió con personas reales~~ **No cuenta para el % (Kelvin, 7-nov: la prueba con personas se hace cuando todo esté terminado y jugable). Total: 8 criterios por capítulo, 48.** |
| C7 | No quedan decisiones de Kelvin abiertas propias del capítulo |
| C8 | Ninguna ficha del Diario del capítulo está en «por_verificar» |
| C9 | No hay bugs abiertos propios en `BUGS.md` |

Para comparar con el 4-nov también doy el % con los **5 criterios de entonces** (a: jugable con prueba; b: mapa real; c: a pie; d: medido con personas y en equipo real; e: canon sin [KELVIN] abiertos).

**Marcas [KELVIN].** Conté con `grep -o '\[KELVIN' -r content/<cap>/` sobre `9c3372f5` y leí cada una. La mayoría ya no son decisiones abiertas: son encabezados, comprobaciones de prueba o decisiones ya tomadas el 4-nov (lista CG-59 y preguntas P, L, E, H y A) [Comprobado: `DECISION_LOG` 4-nov; `DIRECTIVA_PLEHA_04NOV.txt`]. Con el mismo método, el total bajó de 86 a 48.

| Cap. | 4-nov | Hoy | Encabezado o prueba | Ya decidida | **Abiertas de verdad** |
|---|---|---|---|---|---|
| 1 | 16 | 12 | 3 | 8 | **1** (mariposa, K46) |
| 2 | 12 | 7 | 5 | 1 | **1** (fuente de la casa criolla, E9) |
| 3 | 10 | 6 | 5 | 0 | **1** (origen de «canoa») |
| 4 | 9 | 6 | 6 | 0 | **0** |
| 5 | 14 | 4 | 4 | 0 | **0** |
| 6 | 25 | 13 | 5 | 7 | **1** (ficha «esperan») |

Nota: otro lector contó con `grep -c` (líneas, no apariciones) y obtuvo 5, 4, 5, 2 y 11 para los caps. 2 a 6. La diferencia es solo de método; las «abiertas de verdad» no cambian.

**Común a los seis:** 6 pasos por capítulo desde el 3-nov [Reportado: CG-38; las pruebas de ep2, ep3 y ep6 comprueban 6 pasos, Comprobado: `content/ep2/pack.js:812`, `ep3/pack.js:915`, `ep6/pack.js:860`]. Solo el recorrido del cap. 1 (`e2eTest` 49/49) está entre las obligatorias; los de los caps. 2 a 6 son extras con cifras reportadas. Objetivo de Kelvin: 20 a 30 min por capítulo (H17) [Comprobado: `DIRECTIVA_PLEHA_04NOV.txt:85`]. Solo el cap. 1 tiene duración medida.

### Capítulo 1 · «El día que el cielo se rompió»

**Hitos: 100 % (28 de 28 de `CAP1_PENDIENTE.md`)** [Comprobado: `sitio/estado.json`] · **Cierre: 78 % (7 de 9; faltan C7 y C8)** · con los 5 criterios del 4-nov: 80 % (4 de 5).

**Construido**
- 6 pasos: vuelo, taller, recolectar, ruta de la gota, refugio y Guardián, transmisor y mirador [Reportado: `RECORTE_PASOS.md`]. 7.458 líneas de contenido (eran 7.113) [Comprobado: `wc -l`].
- Zona Villa Raíz; el cap. 1 es mundo abierto [Comprobado: `zonas.js:19`].
- `e2eTest` 49/49 (era 48/48) [Comprobado: `ultima_publicacion.json`]. Recorrido sin atajos con el pulgar `temporadaMovilTest` 29/29, con guardado y recarga [Reportado: CG-66]. Inglés `idiomaTest` 31/31 [Reportado: CG-34].
- Nuevo desde el 4-nov: faroles (KIMI-018, `bcf48954`); cerrados PLAYTEST-cap1-paso1 (`d091fa9c`), QA-154 y QA-155 [Comprobado].

**Falta**
- **C7, 2 decisiones abiertas:** guion (H1 c: «provisional», pendiente de revisión final) y mariposa cebra o arlequín (K46, `fauna.js:31`, en «Textos educativos», que Kelvin se reservó). Ya decididas: bote (K40, `historia.js:188`), nombres de asentamientos (K44, `asentamientos.js:2` y `pack.js:151`) y boa (K45, `fauna.js:12`) quedaron en A con «Todas las demás A» del 4-nov; máquina y transmisor (`mundo.js:218`) con A5 A; [KELVIN-8] (`mundo.js:771`) con H8 [Comprobado: `DECISIONES_KELVIN_LISTA.md` l. 13, 71, 75, 102, 120; `DIRECTIVA_PLEHA_04NOV.txt` l. 69, 76, 97].
- **C8, datos:** de 23 fichas, 8 «verificado», 9 «parcial» y 6 «por_verificar» (estas no salen al Diario); además 2 preguntas del Aula (q3, q4) en «por_verificar». Igual que el 4-nov [Comprobado: `content/cap1/lecciones.js` l. 312-334, 382, 394; `git show 6f778914`].
- Playtest: 16 min con niños de la familia el 1-nov, **antes** del recorte a 6 pasos. La prueba con el hijo de Kelvin (P4) sigue pendiente [Reportado: `CAP1_PENDIENTE.md`; `DECISION_LOG` 4-nov].
- Arte: el Guardián sigue pendiente de forma [Reportado: `CAP1_PENDIENTE.md` §2].
- Bugs propios: ninguno. QA-53 (congelado al pulsar «Empezar») afecta a todos [Comprobado: `BUGS.md:158`].

**Tiempo:** equipo 1 a 2 días (fuentes de las 15 fichas, o pasarlas a «juego» si son fantasía). Kelvin: guion (H1 c), mariposa (K46) y P4 (una sesión de unos 30 min).

### Capítulo 2 · «Un lugar para todos»

**89 % (8 de 9; falta C6)** · 5 criterios: 80 % (4 de 5); el 4-nov, con esos 5 criterios, era ≈ 60 %.

**Construido:** 6 pasos; 1.641 líneas; zona Caney del Meandro, confirmada en H18 A [Comprobado: `zonas.js:20`]. `ep2e2e` 87/87 a pie [Reportado: CG-38]; inglés 37/37 y móvil 71/71 tres veces seguidas [Reportado: `TAREAS_WEB.md:81-83`]. Fichas: 5 «verificado», 1 «narrativo», 0 «por_verificar» [Comprobado]. Nuevo: familia de Iguaca con escala y retrato (`cba8f99f`); PLAYTEST-cap2-paso2 cerrado (`7fedc901`) [Comprobado].

**Falta:** playtest; revisar la fuente de «Techo de dos aguas» (`lecciones.js:59`, E9; Kelvin ya decidió conservarla provisional). Sin bugs ni arte pendiente [Comprobado].

**Tiempo:** equipo 0,5 días. Kelvin: el playtest.

### Capítulo 3 · «Más allá de la bahía»

**56 % (5 de 9; fallan C4, C6, C7 y C9)** · 5 criterios: 60 % (3 de 5), igual que el 4-nov.

**Construido:** 6 pasos; 1.794 líneas; zona «la desembocadura y la laguna» [Comprobado: `zonas.js:21`]. `ep3e2e` 43/43 [Reportado]. 6 de 6 fichas «verificado» [Comprobado]. Nuevo: aplicadas K6 a K11; la Vecina con piel *agilis* (`d86749be`); QA-107 corregido [Comprobado].

**Falta**
- **Zona por aclarar con Kelvin.** En H18 A aprobó «Capítulo 3: Puerto de La Mina» [Comprobado: `DIRECTIVA_PLEHA_04NOV.txt:86`], pero el código usa la desembocadura (BM112), y Puerto de La Mina está en otro sitio [Comprobado: `MUNDO_UNICO.md:14`]. Probablemente la pregunta copió la propuesta del 1-nov [No verificado].
- **CG-51:** en inglés la ficha «canoa» muestra «Source: RAE, Diccionario…» (`temporadaRealEnTest` 9/10) [Comprobado: `BUGS.md:96`].
- Etimología de «canoa» (`lecciones.js:55`, más E6 a: verificar la herencia taína).
- Playtest.

**Tiempo:** equipo 0,5 a 1 día; **3 a 5 días más** si se muda a Puerto de La Mina (rutas sobre agua, zona y pruebas). Kelvin: confirmar zona y etimología (5 min) y playtest.

### Capítulo 4 · «El precio del progreso»

**89 % (8 de 9; falta C6)** · 5 criterios: 80 % (4 de 5); el 4-nov, con esos 5 criterios, era ≈ 60 %.

**Construido:** 6 pasos; 1.314 líneas; zona «el río de Villa Raíz», confirmada en H18 A [Comprobado: `zonas.js:22`]. `ep4e2e` 43/43 y `ep4GuardadoTest` 61/61 en español e inglés [Reportado: CG-38, CG-65 `542f1c77`]. Fichas: 6 de 6 «verificado»; las 5 marcadas «juego» son preguntas del Aula, no fichas [Comprobado: `content/ep4/lecciones.js` l. 70-98]. Nuevo: QA-141, QA-128, QA-132 y QA-152 cerrados [Comprobado: `BUGS.md`].

**Falta:** solo el playtest. 0 marcas abiertas y 0 bugs propios. Limpieza: marcar el n.º 47 de `PENDIENTES_KELVIN.md` como resuelto.

**Tiempo:** equipo 0 días. Kelvin: el playtest.

### Capítulo 5 · «Las voces olvidadas»

**78 % (7 de 9; fallan C6 y C8)** · 5 criterios: 80 % (4 de 5); el 4-nov, con esos 5 criterios, era ≈ 60 %.

**Construido:** 6 pasos; 1.809 líneas; zona Los Miradores más la Puerta del Yunque [Comprobado: `zonas.js:24`]. `ep5e2e` 41/41 [Reportado]. Inglés sin español (W1, QA-137) [Reportado]. Las marcas son encabezado y pruebas; H12 decidida [Comprobado: `ep5/pack.js:4, 846`]. Nuevo: franja gris del cielo nocturno (`f60c07b7`); objetivos del relevo más claros [Comprobado].

**Falta**
- **C8:** las fichas «marcas» y «treinta» en «por_verificar»; el propio archivo dice que «son canon del juego» [Comprobado: `ep5/lecciones.js:5, 49, 51`]. Pueden pasar a «juego» si Kelvin confirma que son canon.
- Playtest.
- Rendimiento: es el pico de triángulos del juego y no se volvió a medir en iPad después de KIMI-011 [Reportado].

**Tiempo:** equipo 0,5 días. Kelvin: playtest y, si quiere, una medida en su iPad.

### Capítulo 6 · «El pacto de los 36»

**56 % (5 de 9; fallan C6, C7, C8 y C9)** · 5 criterios: 60 % (3 de 5), igual que el 4-nov.

**Construido:** 6 pasos; 1.771 líneas; zona del río al pie del tepuy más la Ciudad de los 36 [Comprobado: `zonas.js:26`]. `ep6e2e` 43/43, `ep6Test` 90/90 con GPU real, inglés 53/53, móvil 28/28 [Reportado: CG-38, KIMI-039, W1, CG-66]. Retratos de los 6 visitantes y del Aprendiz (`c36f94b`). Nuevo: cómic de cierre al terminar la temporada (`d5c54bb6`); cierre en la ciudad (CG-63); textos prudentes sobre las 36 (`90b6c8b1`); QA-108 arreglado en `790346cd` [Comprobado], aunque `BUGS.md:111` no lo marca cerrado.

**Falta**
- **Arte, prioridad 1 de Kelvin:** KIMI-122, cotorras vivas feas en la Ciudad de los 36 [Comprobado: `TAREAS_KIMI.md`; `7d68097e`]. Aprobación de la Ciudad (A9) y dibujo final del emblema (K23) [Comprobado: `TAREAS_API.md:12-14`; `ep6/pack.js:15-16`].
- **C7:** la aprobación visual de la Ciudad (A9, «pendiente de capturas») y el dibujo final del emblema (K23: «el dibujo final es de Kelvin»). Ya no cuentan: QA-89, cerrado por Kelvin el 2-nov (se lleva volando, bajito; hecho en `ep6/pack.js`) aunque la última columna de la fila no se actualizó [Comprobado: `BUGS.md:128`], y el Aprendiz, decidido A provisional en A6 [Comprobado: `DIRECTIVA_PLEHA_04NOV.txt:98`].
- **C8:** ficha «esperan» en «por_verificar», fuente «Pendiente (UICN, Lista Roja)» [Comprobado: `ep6/lecciones.js:59`].
- **C9:** QA-153 (memoria al soltar la Ciudad) «en avance» [Comprobado: `BUGS.md:55`].
- Playtest.

**Tiempo:** equipo 2,5 a 5,5 días (KIMI-122 1 a 3; QA-153 1 a 2; «esperan» 0,5). Kelvin: A9, emblema y playtest.

### Resumen de capítulos

| Capítulo | % | Base | Tiempo de equipo | Depende de Kelvin |
|---|---|---|---|---|
| 1 | 78 % cierre · 100 % hitos | 7 de 9 · 28 de 28 | 1 a 2 días | Guion (H1 c), mariposa (K46), P4 |
| 2 | 89 % | 8 de 9 | 0,5 días | Playtest |
| 3 | 56 % | 5 de 9 | 0,5 a 1 (+3 a 5 si se muda) | Zona y etimología |
| 4 | 89 % | 8 de 9 | 0 días | Playtest |
| 5 | 78 % | 7 de 9 | 0,5 días | Playtest |
| 6 | 56 % | 5 de 9 | 2,5 a 5,5 días | A9, emblema, playtest |
| **Temporada** | **74 %** | **40 de 54** | **5 a 9,5 días** | 1 sesión de playtest (2 a 3 h) y unas 6 decisiones |

Supuestos: con 40 a 60 % de la capacidad dedicada a capítulos (la V18.1 y el prototipo V18.2 siguen en paralelo), son **2 a 3 semanas** de calendario. C6 solo se cumple con niños reales [Comprobado: P4, `DECISION_LOG` 4-nov]. La V18.2 no cambia la estructura de los capítulos [Comprobado: `DIRECTIVA_V18_2_EVOLUCION.md:13`].

---

## 4. Lo que se construyó desde el 4-nov

**711 commits** entre `6f778914` y `9c3372f5`. Reparto aproximado por archivos y título:

| Tema | Commits | Hitos |
|---|---|---|
| V18.1: demo, amenazas, minigolf, cotorras | 68 | Bandera y progreso (`350205b5`); FX del Grito y el Escudo (`856286bf`); duelo de 2 (`33e8d838`); Sombra de Tormenta (`ae551d24`); puente a pie (`0c3d4dcc`); demo publicada (`75d87eb3`); Serpiente y Sapo (`25c9ca65`); minigolf y 2 cotorras (`2acad2d8`); puente sin atascos (`8f07c0aa`) |
| Kimi: rendimiento, motor, GPU, pruebas | 139 | QA-158: heap en vuelo de +13,6 a +0,06 MB/min (`b3c7031e`, `2d87dde8`); QA-153: de 765 a 105 MB retenidos (`3901d115`); cotorras horneadas y población 20/32/48 (`4224f9be`); QA-81: fondo marino de 16 planos a 1 (`25a4f21c`); lookTest diferencial (`61a441c5`) |
| Gameplay de la temporada y mundo vivo | 29 | Ciudad viva (`10fedb64`); especies por capítulo (`3059f5dd`); Vittata mueve el pico al hablar (`81a612d6`); joystick del iPhone (`97a3a93f`); cap. 1 con el pulgar (`7b3762eb`) |
| Cursor/Grok: bugs y accesibilidad | 55 | QA-116 a QA-151; la pista ya no tapa Impulso (`c67f416c`); decisiones K aplicadas (CG-63) |
| Web, ranking y privacidad | 24 | Ranking en línea apagado (`58b9b290`); ranking de clase local en el Modo Maestro (`257d4785`); landing sin fuentes externas (`cab363a0`); pruebas en paralelo de 17 a 10,5 min (`b73b9786`) |
| Mac: Blender, capturas, edificios | 13 | Video de la portada (`a9e54be6`); retratos de cotorras nuevas (`7c7d5806`); `monumento_e` y `carpa_g` (`6cdc91a8`, `153f22aa`) |
| Publicaciones | 27 | Última: `9fc604a5` (publica `9e691e6`, 5-nov 23:50 UTC) |
| Uniones (merge) | 15 | Ramas de la Mac |
| Coordinación y documentos | 341 | Directiva V18.1 y tablero; `V18_MATRIZ_36.md` (`5b43a808`); directiva del minigolf (`2d992dea`); matriz confirmada (`9139b6c4`); directiva V18.2 (`9c3372f5`) |

Commits de trámite: unos 104 de 711 (15 %); el 4-nov eran el 18 % [Comprobado: grep sobre títulos].

**Ritmo por día (UTC)**

| Día | Commits | Claude | Cursor | Kimi | Mac | Publicaciones |
|---|---|---|---|---|---|---|
| 3-nov | 192 | 86 | 67 | 20 | 18 | 19 |
| 4-nov | 458 | 142 | 132 | 172 | 12 | 16 |
| 5-nov | 354 | 132 | 0 | 176 | 33 | 15 |
| 6-nov (hasta 00:17) | 4 | 4 | 0 | 0 | 0 | 0 |

[Comprobado: `TZ=UTC git log`]. Cursor/Grok está parado desde el 4-nov a mediodía.

**Bugs cerrados desde el 4-nov: 56** (50 ids nuevos de 62, más 6 de los 9 abiertos del informe anterior: QA-107, QA-108, QA-109, QA-111, QA-81 y QA-53). Serían **60** contando QA-162, QA-163, QA-164 y QA-176, arreglados en commits pero con la fila sin actualizar [Comprobado: `BUGS.md` en `6f778914` frente a HEAD].

---

## 5. Bugs abiertos

| Id | Severidad | Qué es | Dueño | Estado |
|---|---|---|---|---|
| QA-158 | crítica | Pantalla blanca o recarga en el iPhone en vuelos largos | Kimi 2 | Arreglo publicado; vuelo de 14 min sin subir el heap. **Falta la prueba física de Kelvin** [Comprobado: `dce8d692`] |
| QA-110 | crítica (mitigado) | Picos de memoria en el iPhone al despegar | Nube / Kimi 1 | Mitigado. La fila pide el iPhone de Kelvin, aunque la validación móvil del 5-nov ya está aprobada [Reportado: `DECISION_LOG` 5-nov] |
| QA-106 | alta (parcial) | iPad: rendimiento resuelto (56 FPS); queda el parche blanco de noche | Kimi 2 (KIMI-111) | En curso |
| QA-153 | — | Memoria al soltar la Ciudad de los 36 (cap. 6) | Kimi | En avance, con arreglo subido y sin cerrar [Comprobado: `BUGS.md:55`] |
| QA-156 (b) | media | Cap. 1: ruta de la gota con el pulgar | Otra cuenta (W18) | (a) resuelto; (b) falta volver a correr la prueba |
| QA-160 | media (intermitente) | Retención en `streamingTest` | Kimi 3 | Diagnosticado; 24/24 en 4 de 4 corridas tras el arreglo |
| QA-111 (fila de Kimi) | alta (herramienta) | Creador o guardado en el arnés | Kimi 2 | Mitigado en el arnés (`70c6c83e`) |
| CG-51 | baja | Ficha «canoa» en inglés con fuente en español | Kelvin (texto educativo) | Abierto, pendiente de Kelvin |
| QA-159 | baja | Aislamiento de baterías | Kimi 1 | Anotado |
| QA-152 | baja (aviso) | Memoria en «alto» | Kimi 3 | Anotado; la fase 8 dice «cerrado» |
| QA-139 | info | Cifras de rendimiento de la ciudad (fila duplicada) | Kimi 1 | Anotado |

**Filas de `BUGS.md` desfasadas** [Comprobado]:
- QA-162, 163 y 164: dicen «abierto», ya están arreglados (`4b9ffb3c`, `81eeea0e`).
- QA-172 a 177: dicen «local, sin push», pero están publicados (`0c3d4dcc`, `cc0e3414`, `b2af0d27`, `8f07c0aa`).
- QA-81 y QA-53 empiezan por «abierto» aunque la fila dice arreglado más abajo.
- QA-108: arreglado en `790346cd`, la fila dice «diagnosticado».
- QA-165 (arreglado en `a5f3caa9`) no tiene fila. QA-170 está repetido (HUD del duelo y Sombra invisible). QA-175 es «no es bug».

---

## 6. Calidad, rendimiento y plataformas

### Publicación actual

| Dato | 6-nov | 4-nov | Fuente |
|---|---|---|---|
| Código publicado | `9e691e67` (5-nov, 23:49 UTC) | `85ee868` | [Comprobado: `ultima_publicacion.json`, `9fc604a5`] |
| Baterías obligatorias | **100 % (12 de 12)**, 614 de 614 comprobaciones | 12 de 12 | [Comprobado] |
| Errores de consola | 0 (2 avisos) | 0 | [Comprobado] |
| Carga inicial | 6,6 MB (+0,7) | 5,86 MB | [Comprobado] |
| Heap | 110,6 MB (+24,7). El aviso salta en 120 MB | 85,9 MB | [Comprobado; QA-152] |
| Código del juego sin publicar | Ninguno | Sí había | [Comprobado: `git diff --stat 9e691e67..HEAD -- src content assets`] |
| Publicaciones desde el corte anterior | 27 | 48 (2 a 4-nov) | [Comprobado] |

Notas: CLAUDE.md habla de 13 baterías; el arnés de publicación exige 12. La 13.ª (`lookTest`) va en los extras con su rojo conocido QA-176 [Comprobado]. El campo `"sitio"` de `ultima_publicacion.json` está en `null`.

### Rendimiento por plataforma

| Plataforma | Escena | Resultado | Fecha | Etiqueta |
|---|---|---|---|---|
| PC con GPU real (1080p) | 6 caps., alto y medio | 138–144 FPS; pico de 2,2 M triángulos en el tepuy | 3-nov | [Reportado: `RENDIMIENTO_PC.md`] |
| PC con GPU real | Duelo de 2 (V18.1) | 141–147 FPS | 5-nov | [Reportado: KIMI-083] |
| Android de Kelvin (medio) | Juego publicado | 60 FPS (mín. 60) | 4-nov | [Reportado: `8b258d01`] |
| iPad de Kelvin (medio) | Cap. 1, vuelo | **56 FPS (mín. 50)**; antes 28 (mín. 6) | 5-nov | [Reportado: QA-106] |
| iPhone de Kelvin | Juego publicado | 60 FPS (mín. 45), «sin trancarse» | 5-nov | [Reportado: `DECISION_LOG.md:339`] |
| iPhone emulado (GPU real, CPU ×4) | Demo V18.1 | Bajo: todo ≥ 30. **Medio: la Sombra da 27 (mín. 24)** | 5-nov | [Reportado: KIMI-088] |
| Móvil emulado (bajo) | Ciudad de los 36 | Mediana 28,6 FPS; jugable a los 26 s | 4-nov | [Reportado: KIMI-023] |
| **Chromebook escolar** | — | **Nunca medido** | — | [Comprobado: no hay medida en el repo] |

**Falta medir en aparato real:** el Chromebook (plataforma del piloto); la demo V18.1 y el minigolf en iPhone o iPad; el iPad en el tepuy (cap. 5) después de KIMI-011; la Sombra en «medio» en un móvil real (la cifra de 45–55 FPS es una extrapolación [No verificado]); Android por capítulo.

### Gráficos

**Edificios.** `AUDITORIA_EDIFICIOS.md` no se repasa desde el 1-nov, así que no hay cifra comprobada sobre los 64. Sobre los **28 de gravedad alta**, según las filas de tareas [Reportado: `TAREAS_API` BM134, BM145, BM151, BM154]:
- **15 de 28 (54 %) arreglados o «se ven bien»** (carpas, monumentos b/d/e, tienda, campamento, muro de roca y 8 ruinas).
- **12 de 28 (43 %) siguen mal:** `complejo_ruinas` (espera A9), `monumento_g`, `corral` y **los 9 templos**, que ninguna tarea ha tocado.
- 1 dudoso (`muro_templo`). Los 23 de gravedad media y baja no se han revisado.
- Los 8 modelos `_hd` siguen apagados: son demasiado pesados para «bajo» y el móvil sin decimar [Reportado: BM139].

**Ciudad de los 36.** El `_hd` de 400 k está integrado pero apagado (`?hd400=1`, `970b37af`). Las 8 capturas para A9 están en `docs/img/bm134_ciudad_*`. **Falta la aprobación de Kelvin** [Comprobado].

**Cotorras vivas (KIMI-122).** Prioridad 1 de Kelvin. En curso desde el 6-nov 00:30. Requisitos: 2 draw calls, sin tocar Vittata ni su rig, y `bandadaTest`, `vivoTest`, `ciudadVivaTest` y las baterías en verde [Comprobado: `TAREAS_KIMI.md`, `b4c94f1f`, `7d68097e`].

### Piloto escolar (checklist de `ROADMAP.md`)

`ROADMAP.md` es del 3-nov y marca 2 de 13. Con lo que hay hoy:

| # | Punto | Estado | Fuente |
|---|---|---|---|
| 1 | FPS reales en Android, Chromebook e iPad | No: falta el Chromebook | QA-106, `8b258d01` |
| 2 | Ruinas a 150 draw calls y texturas a 81 MiB | **Sí** | `b5bf103`, `8586f72` |
| 3 | Edificios, Ciudad y flora | No: 12 de 28 graves, A9 pendiente | `TAREAS_API` |
| 4 | Mapa real en caps. 5 y 6 | **Sí** | `cf88e2ab` |
| 5 | iPad en el tepuy | No: sin medida tras KIMI-011 | `TAREAS_API` |
| 6 | Rojos por orden de baterías (BM116) | **Sí** (ROADMAP no lo marca) | `6f4604e9` |
| 7 | Prueba con niños | No: Kelvin jugó la demo con sus hijos el 5-nov, sin informe en el repo | [Reportado: `TAREAS_WEB`] |
| 8 | Privacidad infantil | No: revisión legal pendiente de Kelvin | `DECISION_LOG` 5-nov |
| 9 | Bandera, requisitos legales | No: pendiente de Kelvin | `PENDIENTES` n.º 44 |
| 10 | Datos educativos de BM84 | No: sin recuento nuevo desde el 3-nov | ROADMAP l. 44 |
| 11 | Estado UICN de 13 especies | No: Kelvin las revisa una a una (E4 c) | `DECISION_LOG` |
| 12 | Voces, navegante, extintas y canon | No: avance parcial | `DECISION_LOG` |
| 13 | Escala de bohíos, contacto, pitch, hosting, modo creador | No | `PENDIENTES` n.º 39–40 |

**Piloto: 23 % (3 de 13).** Lo técnico (puntos 1 a 6): 3 de 6. Lo de Kelvin y lo legal (8, 9, 11 a 13): 0 de 5.

---

## 9. Riesgos y prioridades

| # | Riesgo | Por qué | Prioridad propuesta |
|---|---|---|---|
| 1 | **Lo más visible está feo: cotorras vivas y edificios** | KIMI-122 sale en cada escena con bandada; quedan 12 de 28 edificios graves, incluidos 9 templos sin dueño. Choca con la regla de calidad comercial | Cerrar KIMI-122 primero; después, dar dueño a los templos |
| 2 | **Chromebook sin medir y V18.1 sin probar en móvil real** | Es la plataforma del piloto. En emulación, la Sombra en «medio» ya baja a 27 FPS | Conseguir un Chromebook; videos y `#fps` en el iPhone o iPad de Kelvin |
| 3 | **Muchos frentes a la vez** | V18.1 (D21 y D30), minigolf, prototipo V18.2, cierre de la temporada y piloto, con el mismo equipo y Cursor/Grok parado | Orden propuesto: KIMI-122 → KIMI-106 (regresión) → playtest de los caps. 2 a 6 → resto de la matriz. El minigolf solo tras la validación del hoyo 1 |
| 4 | **Decisiones y legal acumulados** | 6 de 6 puntos de legal y dinero, pendientes de Kelvin. Bloquean el piloto aunque no frenen lo técnico | Un «día de legal» de Kelvin |
| 5 | **Documentos desfasados** | Tablero V18, `BUGS.md`, `ROADMAP.md` (3-nov), `PENDIENTES_KELVIN.md` (4-nov), `AUDITORIA_EDIFICIOS.md` (1-nov). Riesgo de repetir trabajo o informar mal | Una pasada corta de limpieza (0,5 días): ver §12 |
| 6 | **Cap. 3: zona distinta de la aprobada** | Si Kelvin quiere Puerto de La Mina, son 3 a 5 días más | Preguntárselo ya (5 min) |

---

## 10. Lo que espera a Kelvin

Ordenado por lo que más desbloquea.

| # | Decisión o acción | Qué desbloquea | Tiempo de Kelvin |
|---|---|---|---|
| 1 | Visto bueno de las cotorras vivas cuando KIMI-122 tenga antes/después | Prioridad 1; caps. 1 a 6 | 5 min |
| 2 | **Playtest con niños** de los caps. 2 a 6 (y el cap. 1 tras el recorte, P4) | C6 en 5 capítulos: la temporada pasaría de 74 % a 83 % (45 de 54) | 2 a 3 h |
| 3 | Probar la demo V18.1 y el minigolf en su iPhone o iPad (video y `#fps`) | D21, D30 y entregables del minigolf | 30 min |
| 4 | Validar el hoyo 1 del minigolf (¿es divertido?) | Empezar los 5 hoyos restantes | 15 min |
| 5 | Zona del cap. 3 (desembocadura o Puerto de La Mina) y etimología de «canoa» | Cap. 3 (C7) | 5 min |
| 6 | Aprobar la Ciudad de los 36 (A9) | Cap. 6, edificios, piloto punto 3 | 10 min |
| 7 | Dibujo del emblema (K23) | Cap. 6 (C7) | El dibujo |
| 8 | Cap. 1: revisión final del guion (H1 c) y mariposa (K46) | Cap. 1 (C7) | 30 min |
| 9 | QA-173: si cambia la tecla G | Pulido de la V18.1 | 2 min |
| 10 | Visto bueno de los árboles quitados en la explanada y el puente (`b2af0d27`, `8f07c0aa`) | Pulido de la V18.1 | 5 min |
| 11 | Matriz de 36: cómo se descubre cada especie, nombres de lugares, balance | Las 26 especies restantes y la V18.2 | 1 h |
| 12 | Estado UICN de 13 especies, una a una (E4 c) | Fichas «esperan» y datos del piloto | 1 h |
| 13 | Piel provisional de las históricas (`a188c4e9`) | Arte | 5 min |
| 14 | Recorte de arte en el iPhone (kit a 512 en «bajo») | Rendimiento móvil | 5 min |
| 15 | Conseguir un Chromebook para medir | Piloto punto 1 | — |
| 16 | Actualizar la Mac (`git pull`) | BM153, BM155, BM156 | 5 min |
| 17 | Privacidad infantil, licencias, bandera, ronda con niños de la V18.1, ranking en línea | Piloto y D30 | Revisión legal pendiente de Kelvin |

`PENDIENTES_KELVIN.md` dice 42 de 49 puntos sin marcar, pero no se toca desde el 4-nov y no recoge las respuestas PLEHA (4-nov) ni las 18 del 5-nov. La cifra real es menor y **no hay recuento al día** [Comprobado: `9fc4c660`; `DECISION_LOG`].

---

## 11. Calendario estimado

Días de trabajo del equipo actual (3 Kimi, Mac, 2 cuentas de Claude). Las fechas son de calendario y suponen que lo de Kelvin llega a tiempo.

| Hito | Fecha estimada | Supuestos | Depende de |
|---|---|---|---|
| KIMI-122 (cotorras vivas) | 7 a 9-nov | 1 a 3 días con validación de Kimi | Visto bueno de Kelvin |
| Cap. 4 cerrado | Al día siguiente del playtest | 0 días de equipo | Playtest de Kelvin |
| Cap. 2 y cap. 5 cerrados | 8 a 12-nov | 0,5 días cada uno | Playtest de Kelvin |
| Primer módulo del prototipo V18.2 | 8 a 12-nov | 2 a 4 días de la coordinadora [No verificado: no hay plan con hitos] | Niveles y equilibrio de Kelvin |
| D7 y D14 de la V18.1 | **Hechos** (5-nov) | — | — |
| Hoyo 1 del minigolf cerrado | 8 a 10-nov | Video y móvil, 1 a 2 días | Aparato de Kelvin y su validación |
| Cap. 1 cerrado | 8 a 14-nov | 1 a 2 días de fuentes | Guion (H1 c), mariposa (K46) y P4 |
| Cap. 3 cerrado | 8 a 14-nov (o 14 a 21-nov si se muda) | 0,5 a 1 día (+3 a 5) | Zona y etimología |
| Cap. 6 cerrado | 12 a 20-nov | 2,5 a 5,5 días, Kimi compartido con la V18.1 | A9, emblema, playtest |
| D21 de la V18.1 | Antes del 25-nov | KIMI-106 en 1 a 1,5 días | Prueba con Kelvin |
| **Temporada 1 cerrada (9 de 9 en los 6 caps.)** | **20 a 27-nov** | 5 a 9,5 días con 40 a 60 % de la capacidad | Playtest y unas 6 decisiones de Kelvin |
| 6 hoyos de minigolf | 15 a 25-nov | 5 a 8 días de calendario tras validar el hoyo 1 | Validación del hoyo 1 y zonas |
| Matriz de 36 (temporada 1) | 15 a 25-nov | 7 a 12 días de calendario con las 2 cuentas | Descubrimiento, nombres y balance |
| D30 de la V18.1 | 25-nov a 4-dic | 3 a 5 días de equipo | Prueba con el fundador, ronda con niños (revisión legal pendiente de Kelvin), decisión final |
| Piloto escolar | No se puede estimar | Lo técnico: 4 a 8 días | Chromebook, revisión legal y decisiones pendientes de Kelvin |

---

## 12. Lo que no pude verificar

- **Pruebas V18 y de los caps. 2 a 6:** las cifras (`v18*Test`, `ep2e2e` a `ep6e2e`, `temporadaMovilTest`) son reportadas. Solo las 12 obligatorias quedan guardadas en `ultima_publicacion.json`.
- **Serpiente y Sapo:** el código tiene sus comprobaciones, pero no hay resultado reportado.
- **Prueba de Kelvin con la demo V18.1:** se dice que la jugó con sus hijos el 5-nov; no hay informe ni anotación en el repo.
- **Zona del cap. 3:** si H18 («Puerto de La Mina») fue intencionado o copió la propuesta del 1-nov.
- **W22 a W25:** asignadas el 5-nov, sin commits con esos ids. No sé si siguen vivas.
- **Plan del prototipo V18.2:** no hay plan con hitos; la estimación de 2 a 4 días es mía.
- **Sombra de Tormenta en «medio» en un móvil real:** la cifra de 45–55 FPS es una extrapolación.
- **Estado de los 64 edificios:** no hay auditoría desde el 1-nov; el recuento sale de las filas de tareas.
- **Recuento real de `PENDIENTES_KELVIN.md`:** el archivo no recoge las decisiones del 4 y 5-nov.

**Documentos que conviene corregir (0,5 días):** `BUGS.md` (QA-108, 162 a 165, 172 a 177, 81, 53); `V18_TABLERO.md` (publicación actual, QA-165/173/174, minigolf, 2 cotorras, Serpiente y Sapo); `PENDIENTES_KELVIN.md` (n.º 47 y 48, resueltos por H18; respuestas del 4 y 5-nov); `ROADMAP.md` (BM116 hecha); `TAREAS_NUBE.md` (fila del prototipo V18.2).
