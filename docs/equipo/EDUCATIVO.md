# EDUCATIVO · Capítulo 1 como unidad didáctica (para todas las edades)

**Estado: EN EL JUEGO** (`main`, 25 de octubre de 2026). Lo que aquí se describe está programado en `content/cap1/educativa.js` (misión «La ruta de la gota»), `content/cap1/lecciones.js` y `assets/data/lecciones_cap1.json` (objetivos, fichas, preguntas, guía del docente), `content/cap1/paradas.js` (paradas de aprendizaje), `src/game/aula.js` (Aula y Modo Maestro) y `src/game/diario.js` (Diario de ciencia y «Amazonas del mundo»). Sustituyó a la M2 de anillos del GDD original sin cambiar el guion.

**Principio (directiva V8.0): diversión primero.** Amazona Verse es un juego de aventura para niños y jóvenes de todas las edades; lo educativo sale del juego de forma natural y no es el gancho. En el Aula los niveles se llaman **Nivel 1** y **Nivel 2** (así los ve el docente; los códigos internos del archivo son otra cosa y no se muestran). Este documento es para docentes, familias y el equipo: no se usa en textos públicos.

## 1. Objetivos medibles

Estándares: DEPR, *Estándares de Contenido y Expectativas de Grado: Ciencias* (2022), citados por su código, y NGSS. «Logrado» = evidencia en el primer o segundo intento. Cada parada de `paradas.js` se liga a uno de estos objetivos.

| Obj. | El jugador… | Evidencia | DEPR 2022 | NGSS |
|---|---|---|---|---|
| O1 Capas | nombra las 4 capas del bosque y ubica en cada una un organismo observado | 4/4 perchas, q3 | 3.CB2.3, 3.CB2.6, 4.CT2.5, 6.CB2.5 | 3-LS4-3 |
| O2 Cadena | ordena una cadena alimentaria desde el Sol y explica el origen de la energía | p3, q4 | 5.CB2.3, 5.CB2.4, 6.CB2.7–10 | 5-LS2-1, 5-PS3-1, MS-LS2-3 |
| O3 Agua | ordena 5 procesos del ciclo del agua y los usa para explicar la crecida | p8, q1, q2 | 3.CT1.2, 5.CT2.2, 5.CT2.9, 5.CT2.10 | 5-ESS2-1, MS-ESS2-4 |
| O4 Adaptaciones | explica cómo dos rasgos o conductas ayudan a sobrevivir | q5, 2 fichas | 3.CB2.5, 4.CB2.1–3, 6.CB2.13 | 4-LS1-1 |
| O5 Conservación | usa datos de población para explicar por qué la cotorra sigue en peligro y nombra dos acciones | q6, R5 | 3.CA1.4, 5.CB4.4, 6.CB2.16, 6.CB2.19 | 3-LS4-4, 5-ESS3-1, MS-LS2-5 |
| O6 Huracanes | describe el efecto de un huracán y elige con evidencia dónde construir | predicción contrastada, boleto de salida | 3.CT2.4, 3.CA1.2, 4.CA1.6, 6.CB2.20 | 3-ESS3-1, 4-ESS3-2, MS-LS2-4 |

Para el ciclo del agua del Nivel 2, el DEPR 2022 no trae indicador propio: se usa NGSS MS-ESS2-4.

## 2. Misión M2 · «La ruta de la gota» (hecha)

**Encaje:** en «Tierra firme», Luma lee las marcas de agua y Vittata no escucha. En esta misión Vittata aprende a observar: sigue el agua y vuelve con evidencia. La crecida ocurre siempre, como en el canon; la ciencia informa la elección del terreno, pero no la impone. Desbloquea la `pava`. Duración: sin medir con jugadores (el E2E la recorre en ≈2 minutos sin leer).

| Paso | Habilidad | Qué pasa |
|---|---|---|
| p1 Predecir | hablar | Luma: «¿De dónde salió tanta agua?» Se elige mar, lluvia en la montaña o subsuelo, sin juicio. |
| p2 Capas | volar | Cuatro perchas en flora real: suelo (hojarasca junto al **tabonuco**), sotobosque (**helecho gigante**, **heliconia**), dosel (**yagrumo**, **palma de sierra**, **bromelias**) y emergente (**ceiba**). Posarse, Observar y elegir lo que se ve. |
| p3 Cadena | hablar | En la palma se ordena Sol → palma → cotorra. En el Nivel 2 se añaden los descomponedores. |
| p4 Ojos de cotorra | volar | Compara los dos terrenos desde arriba. Mantiene `S.evaluated`. |
| p5 Nace la gota | volar | Sigue el vapor desde la poza hasta la nube de la cumbre y hace una segunda predicción. |
| p6 Sigue la gota | volar | La gota cae en una bromelia, se infiltra en la colina o corre por la quebrada hasta el río, que crece. |
| p7 La poza | nadar | Bucea hasta la gota y la marca de crecida en la roca. El ciclo se cierra. |
| p8 Explícale a Luma | hablar | Cuenta el ciclo eligiendo frases en orden. Luma compara la predicción con lo visto y luego se elige el terreno. |

Hallazgos opcionales: **flamboyán** y **bambú** (nativas frente a introducidas). Mejora de diseño propuesta, no hecha: que p5–p8 se vuelen en vez de acompañar una partícula (`DIVERSION_CAP1.md`, mejora 8); la lección y las fichas no cambiarían.

## 3. Aprendizaje integrado (hecho)

- **Observar antes del dato:** cada percha pide mirar algo (la luz, lo que crece en las ramas).
- **Predecir:** dos predicciones (p1 y p5) que no se castigan. El cierre muestra «Predije / Vi».
- **Diario de Campo · Ciencia:** cada ficha trae un dato de una línea y la etiqueta de la fuente («Fuente: USFWS»). Las URL solo aparecen en el Modo Maestro, para que el jugador no tenga enlaces externos. Solo se publican las fichas con `verificacion: "verificado"`.
- **Paradas de aprendizaje** (`paradas.js`): 3 de repaso en la aldea (el agua corre cuesta abajo, dónde construir, el claro del bosque) y 5 de ciencia de Puerto Rico (cotorra, palma de sierra, nido, María, flamboyán), en ES/EN, cada una con una pregunta corta, su fuente y una ficha que desbloquea.
- **Diario de Campo Boricua:** los 12 hallazgos (6 fauna, 6 cultura) tienen texto validado con fuente (`DIARIO_VALIDACION.md`), y el Diario trae «Amazonas del mundo» con las especies verificadas.
- **Formativa final:** «Luma te pregunta», de 5 a 7 ítems (≈3 min), con retroalimentación inmediata, pista en el segundo intento y sin puntaje visible.

## 4. Modo Maestro (hecho) y guía de uso (propuesta)

**Acceso:** desde el menú de pausa, resolviendo una suma (no es contraseña ni cuenta). **Ajustes del dispositivo:** idioma de la lección (ES/EN), texto corto (frases de 8 palabras o menos e iconos), lectura en voz alta (`speechSynthesis`, con voces locales si las hay), **Nivel 1** o **Nivel 2**, y una etiqueta de estación. **Reporte:** progreso por pasos, perchas, intentos por pregunta y objetivos logrados, en CSV o JSON; un botón borra todo.

**Guía de 45 minutos (propuesta para el docente; sin probar en un aula):**
- **Antes (10):** pregunta guía, predicción en el Diario impreso y vocabulario con imágenes. Parejas de piloto y científico, que cambian de rol en la poza.
- **Durante (25):** 20 min de misión mientras el docente circula con 3 preguntas de sondeo; 5 min de formativa en el juego.
- **Después (10):** el ciclo en la pizarra, boleto de salida («Construiría en ___ porque ___») y descarga del reporte.

**Sin pantalla:** mural del bosque en cuatro pisos; ciclo del agua en una bolsa; red de estambre con un «huracán»; nido a prueba de tormenta (abanico y regadera); gráfica de cotorras silvestres con datos de USFWS. La «Incubadora de la clase» del criadero está en `HUEVOS_GDD.md` §7.

**Rúbrica** (4 niveles): observación y registro, modelo del ciclo del agua, cadena alimentaria, argumento con evidencia y conservación.

**Sin datos personales (hecho):** el progreso se guarda solo en el dispositivo (`localStorage`, clave `amazonaverse.aula.cap1`); no hay red, analítica ni servicios de terceros; sin cuentas, nombres, voz, imagen ni identificador de dispositivo; el jugador no tiene campos de texto libre. COPPA: el juego no recoge información personal. FERPA: no guarda expedientes; si el docente añade nombres, el archivo lo controla la escuela. Falta la revisión del abogado (`ROADMAP.md`, «Legal y datos»; `SEGURIDAD_INFANTIL.md`).

## 5. Exactitud

La lista viva está en `content/cap1/lecciones.js` (campo `verificacion` de cada ficha): hoy **8 verificadas, 9 parciales y 7 por verificar**. Solo las verificadas se muestran al jugador; las parciales y las «por verificar» esperan la reconfirmación del enlace o la consulta al DRNA.

**Verificado:**
- USFWS (2026): la cotorra está en peligro desde 1967 y es el único loro nativo de EE. UU. María eliminó a toda la población silvestre de El Yunque, y Río Abajo perdió el 40 %. Hoy hay más de 900 cotorras en tres bosques y dos aviarios. Anida en cavidades naturales y artificiales.
- USDA FS (Drew et al. 2009): el yagrumo llena los claros tras un huracán y la palma de sierra es la especie que más creció después de Hugo y Georges.
- USDA FS: el flamboyán es originario de Madagascar.
- **Diario de Campo Boricua, 12/12** (`DIARIO_VALIDACION.md`): coquí, San Pedrito, reinita mariposera, dajao, jicotea, manatí, maraca, güiro, cuatro, petroglifo de Caguana, vejigante y pava, con DRNA, USFWS, USGS, ICP, Smithsonian, UICN, Cornell Lab, Ley 154-2003 y publicaciones académicas.
- **Paradas de ciencia de Puerto Rico (5):** salen de fichas verificadas (USFWS, USDA Forest Service).

**Parcial** (enlace por reconfirmar o fuente secundaria): 13 cotorras en 1975, zorzal pardo, tipos de bosque, lluvia del bosque enano, tabonuco, helechos gigantes, 240 árboles nativos, bambú introducido, ciclo del agua.

**Por verificar** (no se publica): dieta de la cotorra, modelo de 4 capas en El Yunque, bromelia que guarda agua, coquí sin renacuajo, heliconia y ceiba. Validar con el DRNA.

## 6. Qué cambió en el código (hecho)

- `RINGS` pasó a ser `PERCHAS` (mismas coordenadas, más un campo `capa`); los anillos de vuelo no existen.
- La pista de la `pava` es «la ruta de la gota».
- Los textos visibles de la misión, las preguntas, las fichas y las paradas van en `{es, en}` (`eduTest` lo comprueba).
- No se muestran las fichas `por_verificar` ni `parcial`.
- El progreso del Aula nunca hace `fetch`.
- Pendiente de Kelvin: si la historia, el HUD y los diálogos del capítulo también serán bilingües (decisión 8 de `CAP1_PENDIENTE.md`).

Fuentes: [DEPR 2022](https://dedigital.dde.pr/mod/resource/view.php?id=2854) · [NGSS](https://www.nextgenscience.org/) · [USFWS](https://www.fws.gov/sites/default/files/documents/2026-02/20240402_puerto-rican-parrot-inter-agency-program-english.pdf) · [USFWS 1975](https://www.fws.gov/sites/default/files/documents/historic-news-releases/1975/19750922A.PDF) · [USDA FS 2009](https://research.fs.usda.gov/treesearch/35359) · [USDA FS Delonix](https://www.fs.usda.gov/nsl/Wpsm/Delonix.pdf) · Diario de Campo: `docs/equipo/DIARIO_VALIDACION.md`
