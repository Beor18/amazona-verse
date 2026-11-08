# V18.3 · Auditoría narrativa de los seis personajes históricos (puesta al día con la resolución de Kelvin)

**Estado (6-nov):** la fase 1 se escribió antes de las decisiones de Kelvin; este documento ya refleja `docs/DIRECTIVA_V18_3_RESOLUCION.md`, que prevalece sobre `DIRECTIVA_V18_3.md`. Humanos aprobados, seis personajes al mundo abierto, capítulos intactos. Constructor, Ingeniera y la primera misión ya están implementados (ver §7). Inventario técnico: `docs/equipo/MODELOS_KELVIN.md` (BM158). Diseño de la misión: `docs/equipo/V18_3_DISENO.md`.

Los nombres de los seis (Constructor de Sombras, Ingeniera de la Esperanza, Tuerca, Chispa, Maestro Moon, Guardián del Primer Vuelo) están **aprobados como base de diseño**. Los choques con el canon que detecté antes se conservan como «riesgos a vigilar».

---

## 0. Lo esencial

1. **Humanos: aprobados.** Antes no los había en el canon (`CANON_REGISTRY.md:13`, `:24`); ahora es decisión tomada de Kelvin. Sigue pendiente pasarlos al canon y fijar sus fichas.
2. **Los seis van al mundo abierto**, con el arco completo en la **temporada 3** («El costo de construir», `STORY_BIBLE.md:14`). Los seis capítulos **no se tocan** («sin villano», `STORY_BIBLE.md:27`). Los humanos viven en la capa V18, no dentro de las historias de los caps. 1–6. Riesgo a vigilar: el cap. 4 ya trata el desarrollo sin culpables (`EP4_NARRATIVA.md:11`, `:58`); el Constructor no debe aparecer ahí.
3. **El padre guía es el Papá del capítulo 2**, no el Guardián ni el Piloto Cotorra.
4. **Riesgos de nombres a vigilar:** «Constructor» ya es algo bueno en el canon (el Guardián Constructor, `CHAPTER_01_SCRIPT.md:13`; Vittata constructora, `STORY_BIBLE.md:7`) y «Sombra» ya es la Sombra de Tormenta (`V18_AMENAZAS.md:13`). «Maestro» coincide con el «Modo Maestro» del Aula (`content/ep4/pack.js:3`). «Esperanza» es también el nombre de una canoa del cap. 3 (`content/ep3/pack.js:670`). Hay que cuidar el contexto para que no se confundan.
5. **Piloto Cotorra / Guardián del Primer Vuelo:** mentor de vuelo (tutoriales, carreras, navegación). Riesgo: su malla es la de Vittata con traje (`COTORRAS_22_INFORME.md:10`); usar otra especie y piel (`src/personaje/pieles.js`) para no confundirlo con ella ni con el Guardián.
6. **Mentor y rival ya tenían dueño** (Guardián y mentoras de los dones; Campeona de la Explanada, `combate.js:3`). Maestro Moon (precisión y esquiva) y Chispa (carreras cómicas) necesitan una función propia que no los pise.
7. **Primera misión implementada:** «El puerto que volvió a vivir», en Puerto de La Mina (§3).
8. **Un solo sistema de NPC** (`npc.js` + `personajes_v18.js`), estado en `G.v18.mundo` sin cambiar el esquema del guardado.

---

## 1. Mapa del canon que ya existe

### 1.1 Personajes establecidos

| Personaje | Qué es | Dónde sale | Estado y fuente |
|---|---|---|---|
| **Vittata** | Protagonista: inventora, constructora y líder. Su defecto es querer hacerlo todo sola. Su arco va de «yo sola» a «ayudo a que se junten» | Caps. 1–6 | CONFIRMADO · `STORY_BIBLE.md:7`, `CANON_REGISTRY.md:10-11`, `EP6_NARRATIVA.md:22` |
| Aprendiz del jugador | Acompaña a Vittata sin reemplazarla | Caps. 1–6 | PROVISIONAL · `CANON_REGISTRY.md:23` |
| **Iguaca** (id `luma`) | *A. vittata* de otra familia, más madura; la amiga con iniciativa | Caps. 1–6 | CONFIRMADO · `CANON_REGISTRY.md:20`, `:30`, `:47` |
| **El Guardián** | Cotorra mayor *A. imperialis*, sabia y protectora; «constructor que perdió muchas obras»; tiene la memoria incompleta y la medalla | Caps. 1–6 | APROBADO · `CANON_REGISTRY.md:24-25`, `CHAPTER_01_SCRIPT.md:13`, `EP5_NARRATIVA.md:24` |
| **La Abuela** y **el Papá** | Familia de Iguaca (*A. vittata*). Vittata los salva en el cap. 1 y en el cap. 2 les hace la casa. El huevo del Papá nace en el ep. 5 | Caps. 1, 2, 4–6 | CONFIRMADO · `CANON_REGISTRY.md:40`, `DECISION_LOG.md:226`, `:325` |
| **Nayara** | La navegante, *A. ventralis* de La Española; vive en el muelle de Villa Raíz | Caps. 3–6 | APROBADO · `CANON_REGISTRY.md:26`, `DECISION_LOG.md:280` |
| **La Vecina** | Habla por Villa Mangle | Caps. 3–5 | PROPUESTA · `EP3_NARRATIVA.md:29` |
| **Mara** y **Vela** | La Voz del transmisor: *A. martinicana* y *A. violacea*, las dos extintas. Solo son voces y luces | Caps. 1–6 (con nombre en el 5) | APROBADO · `CANON_REGISTRY.md:9`, `:22`, `DECISION_LOG.md:334` (A4) |
| **Mira, Roca, Marea, Nudo, Eco, Brote** | Los seis visitantes del pacto, cada uno con lo que sabe hacer y lo que necesita | Cap. 6 | APROBADO · `CANON_REGISTRY.md:29`, `content/ep6/pack.js:70-81` |
| Mentoras de los dones (Vinacea, Festiva, Oratrix, Lilacina, Versicolor, más Iguaca) | Enseñan cada don con una pista | Capa de juego | CONFIRMADO · `CANON_REGISTRY.md:47`, `PROPUESTA_MENTORAS_24C.md` |
| Campeona de la Explanada | Rival de IA del duelo; es una cotorra existente con otra piel | Capa V18 | Kelvin 5-nov · `combate.js:3`, `DECISION_LOG.md:345` (punto 4) |
| Vecinos que no son cotorras (coquí, lagartijo, mariposa) | Fauna ambiental real de Puerto Rico | Villa Raíz y Ciudad de los 36 | CONFIRMADO · `CANON_REGISTRY.md:43`, `src/game/vecinos.js` |

**Aclaración sobre nombres:** **Esperanza, Ceiba y Yagrumo no son personajes.** Son opciones de nombre para la canoa del cap. 3 (`content/ep3/pack.js:670`). Además, «Esperanza» es el título de una sección de cada capítulo (por ejemplo, `NARRATIVA_CAP1.md:11`).

**El «padre guía»** es el Papá del cap. 2 (decisión de Kelvin, directiva §5), no el Guardián.

### 1.2 Lo autobiográfico o fundamental (no se toca)

- El arco de Vittata («Vittata puede ser como yo», Kelvin: `CANON_REGISTRY.md:30`) y su defecto y su cambio (`STORY_BIBLE.md:7`, `:25`).
- El tema del cap. 1: «perder algo que construiste no significa perder tu capacidad de volver a crear» (`CHAPTER_01_SCRIPT.md:6`). También la Ruptura vivida «como un huracán que no termina de irse» (`NARRATIVA_CAP1.md:9`). Que sea personal no está verificado, pero se trata como fundamental.
- El Guardián como constructor que perdió sus obras (`CHAPTER_01_SCRIPT.md:13`) y su medalla, que se gana (`CANON_REGISTRY.md:25`).
- El mapa es el terreno propio de Kelvin y sus paquetes pagados (`CANON_REGISTRY.md:34`, `DECISION_LOG.md:46`).
- Los nombres taínos y la regla de no usar nombres que recuerden empresas reales (Luma → Iguaca, `CANON_REGISTRY.md:20`).
- Las reglas de la biblia: ninguna decisión lo maximiza todo; los guardianes no se capturan ni se venden (`STORY_BIBLE.md:27`).

### 1.3 Antagonistas y amenazas que ya existen

| Amenaza | Qué es | Dónde | Estado |
|---|---|---|---|
| La Gran Ruptura | Catástrofe, no villano; su causa está sin revelar | Toda la temporada | PROVISIONAL · `CANON_REGISTRY.md:19`, `NARRATIVA_CAP1.md:45` |
| Tormentas y crecidas | Inundan el refugio del río y ponen a prueba la casa | Caps. 1 y 2 | `NARRATIVA_CAP1.md:23`, `EP2_NARRATIVA.md:41` |
| La Maraña | Misterio de fantasía con 5 rastros y cara | Mapa | APROBADA · `CANON_REGISTRY.md:46`, `src/game/marana.js:1` |
| Sombra de Tormenta | Nubarrón que **tapa caminos**; se gana con el Grito del Yunque | Camino de Villa Raíz al puente | Aprobada y programada · `V18_AMENAZAS.md:13-23`, `src/game/v18/amenaza.js:3` |
| Serpiente de la Maraña | **Enreda paradas**; se gana desenredando nudos | Rastros de la Maraña | Aprobada y programada · `V18_AMENAZAS.md:25-35`, `src/game/v18/serpiente.js` |
| Sapo Encantado | **Tapa una poza**; se despierta con semillas | Poza Honda | Aprobado y programado · `V18_AMENAZAS.md:37-47`, `src/game/v18/sapo.js` |
| Maraña junto al puente roto | Vigila el puente mientras está roto | Puente colgante | Programada · `src/game/v18/misterio.js:1-7` |
| Campeona de la Explanada | Rival deportiva de IA, no mala | Explanada de Villa Raíz | Programada · `combate.js:3` |

**Consecuencia:** cerca de Villa Raíz ya hay cuatro amenazas que bloquean caminos, paradas, pozas o un puente. Un quinto bloqueo sin más «duplicaría antagonistas» (`DIRECTIVA_V18_3.md:310`). Lo único que el antagonista humano aporta y que hoy no existe es **un daño causado por una decisión** (responsabilidad), no por la naturaleza ni por la fantasía.

### 1.4 Destrucción y reconstrucción en cada capítulo

| Cap. | Qué se rompe | Qué se reconstruye | Lugar (código) | Fuente |
|---|---|---|---|---|
| 1 | El taller de Vittata y el árbol de la familia de Iguaca | Refugio (colina o río) y transmisor | Villa Raíz: taller (133, 178), estación y refugio (167, 183), mirador Yokahú (14, 172) | `NARRATIVA_CAP1.md:9-29`, `assets/data/mapa_cap1.js` |
| 2 | El refugio ya no aguanta | Casa permanente de dos niveles, probada contra la tormenta | Caney del Meandro (−15, 34) | `EP2_NARRATIVA.md:11`, `:41-42`, `src/game/zonas.js:21` |
| 3 | El bote de la navegante se perdió | La primera canoa, y llegar a Villa Mangle | Desembocadura y laguna (187, 208) | `EP3_NARRATIVA.md:22`, `:36`, `zonas.js:22` |
| 4 | La Ruptura se llevó el paso del río | Puente o muelles, con un costo (el bosquecillo) | Río de Villa Raíz (200, 157) | `EP4_NARRATIVA.md:11`, `:41`, `zonas.js:23` |
| 5 | Antena doblada y comunicación caída | El relevo de torres | Los Miradores y Puerta del Yunque | `EP5_NARRATIVA.md:10`, `:40-41`, `zonas.js:25` |
| 6 | El pacto, «roto cuando dejamos de hablarnos» | Puente con todos y pacto renovado | Ciudad de los 36 y río del tepuy | `EP6_NARRATIVA.md:37-47`, `zonas.js:27` |
| V18 | Puente colgante roto | Reparado con materiales (atajo y corriente) | Puente (157.9, 136.5) | `src/game/v18/reparar.js:1-12` |

### 1.5 Lugares que no usa ningún capítulo (candidatos)

Las zonas de los capítulos están en `src/game/zonas.js:20-28`; los nombres, en `content/cap1/asentamientos.js`; las posiciones, en `assets/data/mapa_cap1.js` (pois).

| Lugar | Posición | Qué tiene | ¿Libre? |
|---|---|---|---|
| **Puerto de La Mina** | (78, −106) | Bohíos y canoas entre tres torres antiguas (`asentamientos.js:31`), un bohío amueblado y abierto (BM13, `src/engine/mundo.js:303`), la Poza y Cascada La Mina (72, −91.5) y la Gruta de La Mina (65.5, −98.5) | Sí. **Riesgo:** en H18 Kelvin aprobó «cap. 3: Puerto de La Mina», pero el código usa la desembocadura (`ESTADO_REAL.md:224`). Si el cap. 3 se muda, hay choque |
| **Atalayas del Oeste** | (−87, 91) | «Once torres vigía entre muros de roca» (`asentamientos.js:25`) | Sí |
| **Campamento de los Toldos** | (−134, −40) | «Un campamento para quien todavía no tiene casa» (`asentamientos.js:49`) | Sí (tema delicado: desplazamiento) |
| **Embarcadero de las Canoas** | (−134, 27) | Canoas y murallas; ahí está la rutina de la otra orilla (`comunidades.js`) | Sí |
| **Mirador Yokahú** | (14, 172) | Final del cap. 1 y meta de la Carrera en El Yunque (`retos.js:2-4`) | Lo usa el cap. 1 solo en el final; Retos lo usa siempre |
| Ruinas de la hacienda | (198, −4) | Ruinas | Se descarta: lo histórico pide verificar (`DECISION_LOG.md:332`, E6/E7) |

---

## 2. Matriz de los seis personajes (§12 Fase 1, §15 puntos 1–8 y 11)

Complejidad = narrativa y código, sin contar el Blender: **S** (≤ 2 días) · **M** (3–6 días) · **L** (más de 6 días). Es una estimación, no una medición.

| | **Piloto Cotorra** | **Human** | **Girl** | **Shiba** | **Monkey** | **Cat Superior Moon** |
|---|---|---|---|---|---|---|
| **Rol que propone Kelvin** | Mentor histórico, «Guardián del Primer Vuelo» | Antagonista: constructor irresponsable | Aliada: trabaja para el Constructor y cambia de lado | Rival cómico y luego compañero | Antagonista secundario que puede cambiar de lado | Mentor misterioso de habilidades |
| **¿Choca o duplica algo?** | **Sí.** (a) Reservado para un minijuego, «no es la Vittata de la historia» (`CANON_REGISTRY.md:14`). (b) Su malla es la de Vittata con traje (`DECISION_LOG.md:29`, `COTORRAS_22_INFORME.md:10`): se confundiría con ella. (c) «Rutas antiguas y recuerdos» es lo del Guardián (`EP4_NARRATIVA.md:44`, `EP5_NARRATIVA.md:24`). (d) Enseñar poderes es lo de las mentoras (`CANON_REGISTRY.md:47`) | **Sí.** (a) No hay humanos en el canon (§0.1). (b) La regla «sin villano» (§0.2). (c) Duplica el tema del cap. 4 (`EP4_NARRATIVA.md:11`). (d) Su nombre choca con el Guardián Constructor, con Vittata constructora y con la Sombra de Tormenta (§0.4). (e) Bloquear caminos ya lo hace la Sombra (`V18_AMENAZAS.md:17`) | **En parte.** (a) Es humana (§0.1). (b) Una «ingeniera que repara» pisa el oficio de Vittata (`STORY_BIBLE.md:7`) y podría desplazarla. (c) La amiga con iniciativa ya es Iguaca (`CANON_REGISTRY.md:47`). (d) «Esperanza» es el nombre de una canoa (`content/ep3/pack.js:670`) | **En parte.** El rival de IA es la Campeona (`combate.js:3`). La carrera tiene 3 rivales cotorras (`retos.js:2`). Festiva es la mentora de «todo es una carrera» (`PROPUESTA_MENTORAS_24C.md`). Los perros no aparecen en el canon | **En parte.** Poner obstáculos ya lo hacen la Maraña y la Serpiente (`V18_AMENAZAS.md:29-31`). No se debe volver enemiga a la fauna (`DIRECTIVA_V18_3.md:441`). En Puerto Rico hay macacos introducidos (dato **por citar con fuente**): no puede parecer fauna real | **Sí.** (a) Enseñar habilidades es lo de las mentoras de los dones (`CANON_REGISTRY.md:47`). (b) El mentor sabio es el Guardián. (c) «Maestro» ya es el «Modo Maestro» del Aula (`content/ep4/pack.js:3`). (d) Lleva katana (`DECISION_LOG.md:396`). (e) Un gato como maestro de cotorras: el depredador real de aves es un tema **a revisar con fuente** antes de usarlo, ni como chiste ni como dato |
| **Dónde encaja mejor** | **Anfitrión de Modo Retos**, coherente con `CANON_REGISTRY.md:14`. En el Mirador Yokahú (14, 172), donde termina la Carrera en El Yunque | **Capa V18, Puerto de La Mina** (78, −106). No dentro de los caps. 1–6. Como semilla de la temporada 3 | Puerto de La Mina, con Human. Es la que **sabe cómo funciona la máquina** y lo explica; repara Vittata | **Contrarreloj del río** (`retos.js:8-10`): del tramo medio a la desembocadura. O en el Embarcadero de las Canoas (−134, 27) | Puerto de La Mina, en la **Gruta de La Mina** (65.5, −98.5) como su taller | **Atalayas del Oeste** (−87, 91): las once torres sirven para pruebas de precisión y equilibrio |
| **Primera misión (con lo que ya existe)** | «Vuelo de prueba»: la Carrera en El Yunque con él de instructor. Al ganar se prueba un poder ALAS (Quiebro o Ala fuerte, `src/game/v18/nuevas.js:3-4`) | Implementada (§3): «El puerto que volvió a vivir», con poderes V18.1 y `reparar.js` | «La palanca escondida» (fase 3): ella dice dónde mirar y el poder OJOS (Ojo del cenote, `nuevas.js:6`) revela el mecanismo; Vittata repara con materiales del inventario (`S.inv`) | «Carrera contra Chispa»: el contrarreloj del río con él como rival de IA en la spline (`retos.js`). La primera vez hace una trampa visible; la revancha es limpia | «El puente que se mueve» (fase 4): plataformas que él mueve. ALAS para alcanzarlas y el Grito para pararlas, con el patrón de amenaza de `amenaza.js` | «Las once atalayas»: posarse con precisión en perchas y esquivar ráfagas (patrón de `amenaza.js`) con Escudo de plumas (PLUMAS) o Quiebro (ALAS) |
| **Variantes visuales** (§6) | Aviador (gafas y chaleco) y veterano. Piel de **otra especie** (`src/personaje/pieles.js`), nunca la de vittata | Constructor (casco y chaleco), supervisor, explorador, reconciliado | Aprendiz, ingeniera, rescatista, constructora | Corredor, competidor, compañero | Inventor, operador, reparador | Maestro, entrenador, guardián de desafíos |
| **Plan de animación** (§15.6) | Despegue, aterrizaje, saludo, idle. Tiene `RigCotorra` con actions: es el que más cerca está del pipeline de Vittata | Idle, hablar, señalar, enojo o frustración, sorpresa | Idle, hablar, explicar (gesto), usar herramienta, sorpresa. Ya trae una action de pelo | Idle, correr, celebrar, enfado cómico | Idle, martillar, celebrar, frustración | Idle, equilibrio, gesto de «otra vez», reverencia |
| **Modelo y animaciones** | Inventario BM158 (`MODELOS_KELVIN.md`): `RigCotorra` (0 huesos contados), 12 acciones de cámara/área, no de personaje; 369 730 tris con subdivisión. Sin GLB todavía | **Hecho (BM159):** `constructor.glb`, 14 932 tris, 1,75 m, 0 texturas, 15 materiales lisos; mallas Casco/Chaleco/GuanteL/R/Botas/Mochila; acciones Idle/Hablar/Señalar/Enfadado (falta `Reparar`, BM164) | **Hecho (BM160):** `ingeniera.glb`, 13 658 tris, 1,62 m, colores lisos; mallas Chaqueta/Cinturon/Mochila/GuanteL/R; acciones Idle/Hablar/Reparar | Sin rig ni acciones; 180 512 tris con subdivisión; sin GLB | No encontrado en `modelos/` (BM158); sin GLB | Sin rig ni acciones; 295 904 tris con subdivisión; lleva katana; sin GLB |
| **Texturas** | Faltan 3 (BaseColor, Normal, Roughness de `cotorrofiver`). Autoría por confirmar (afecta a Vittata) | Resueltas: sin texturas externas, Real Madrid fuera | Resueltas: foto personal y camiseta fuera | Faltan 2 (`Texture.jpg`, camiseta); revisar que no imite a un personaje | — | Faltan 6 (`Attachment_*`, camiseta); katana, a quitar |
| **Riesgos** | Que se lea como un doble de Vittata o un segundo Guardián | Canon (humanos), tono (villano), nombre, escala frente a las cotorras (el mundo está a 1,4 m, `DECISION_LOG.md:40`), estilo cyberpunk frente al toon vibrante (`DECISION_LOG.md:334`) | Desplazar a Vittata; privacidad (foto de una persona real); que el cambio de lado sea gratis | Copiar la función de la Campeona; corre a pie mientras los demás vuelan (la ruta necesita una variante en el suelo) | Duplicar a la Maraña; que parezca un animal real de Puerto Rico | Arma; derechos de terceros; duplicar a las mentoras |
| **Complejidad** | S–M (rig compatible; texturas nuevas) | M (módulo de NPC 3D + misión) | M (fase 3, encima del sistema de Human) | M (variante de ruta en el suelo en `retos.js`) | M–L (plataformas móviles nuevas) | M (percha y ráfaga existen; falta el circuito) |
| **Prioridad** | 4 (en lo técnico es fácil, pero en la historia aporta poco) | **1** (según la directiva, **si Kelvin acepta humanos**) | **2** | 3 | 5 | 6 |

**Humanos aprobados:** el Constructor y la Ingeniera abren el arco. Monkey (Tuerca) es el antagonista secundario que puede pasar a aliado; su máquina ya existe en la misión. Ningún cambio de bando sin causa narrativa en la misión.

### 2.1 ¿Pueden sustituir a algún NPC genérico? (§8.5)

- **Sí:** los 3 rivales cotorras de la Carrera (`retos.js:2`) → Shiba, en una carrera extra; los otros tres modos no cambian.
- **Sí, con cuidado:** el anfitrión de Retos, que hoy no existe → Piloto Cotorra.
- **No:** los personajes con nombre de los caps. 1–6 (decisión del 2-nov: «no quitar personajes», `DECISION_LOG.md:276`), ni la Campeona, porque es la rival del ciclo V18.1 que ya está probado.

### 2.2 Ubicación dentro de los seis capítulos (§15.3)

| Cap. | ¿Entra alguno de los seis? | Por qué |
|---|---|---|
| 1 | No en la historia; sí en la capa V18 del mundo abierto (después de terminar) | Su arco está cerrado y es fundamental (§1.2) |
| 2 | No | «Escuchar también es liderar»: los residentes ya cumplen (`EP2_NARRATIVA.md:17-28`) |
| 3 | No | `ESTADO_REAL.md:224`: hoy el cap. 3 usa la desembocadura. Si se muda a Puerto de La Mina, habría que revisar la misión |
| 4 | **No** | El tema es justo el desarrollo sin villano (`EP4_NARRATIVA.md:58`) |
| 5 | No | Memoria y voces; nada de miedo (`EP5_NARRATIVA.md:66`) |
| 6 | No | Los asientos son de los 36 guardianes; los visitantes «no son premios» (`EP6_NARRATIVA.md:73`) |
| Temporada 3 | **Sí: arco completo de los seis** (decisión de Kelvin) | «El costo de construir: crecimiento, pertenencia y desplazamiento» (`STORY_BIBLE.md:14`). Antes de eso, solo prototipos y misiones adicionales en el mundo abierto |

### 2.3 Estado de los derechos

| Elemento | Estado | Qué falta |
|---|---|---|
| Los seis `.blend` | Kelvin participó en su desarrollo con un modelador 3D (directiva §10) | Confirmación escrita de cesión o licencia; la participación de Kelvin no prueba sola la titularidad |
| FeixZero: modelador 3D de los personajes (procedencia interna, fuera del canon) | Procedencia interna, fuera del canon. Solo se registra aquí como dato de derechos; no es personaje ni se investiga | Conservar nombres de carpetas y metadatos tal cual, sin ponerlos en el juego |
| Textura del Real Madrid | Quitada en Constructor e Ingeniera (0 texturas externas); sigue en Shiba y Cat | Cambiarla en los demás |
| Foto personal en Girl | Quitada en `ingeniera.glb` (BM160) | Nada |
| «cotorrofiver» en Piloto Cotorra | Es el `.blend` del que sale la Vittata del juego | Confirmar autoría; afecta a Vittata |
| Katana y funda (Cat) | Fuera de la versión jugable (directiva §6E, §11) | Quitarla al preparar el GLB |
| Imagen de referencia de 500×500 (Cat) | Externa | No se publica |

---

## 3. Primera misión: «El puerto que volvió a vivir» (implementada)

Lugar: Puerto de La Mina. Los 9 pasos son los de la directiva §7. La implementación (`puerto.js`) difiere de la propuesta original de esta auditoría («El bohío de La Mina»): en vez del bohío usa la ladera entre la plaza y la meseta de las tres torres, **añade** una escalera a pie y no tapa río, poza, gruta, ruta de la gota, sendero ni puerta del bohío. Estado en `G.v18.mundo.puerto_mina` (obra → descubierto → investigado → desactivado → reparado; solo avanza). Requisito: puente de Villa Raíz reparado. Reutiliza V18.1 (PICO, OJOS), `reparar.js`, `ciclo.js` y da 150 XP V18.2 una vez. Detalle y distancias medidas: `V18_3_DISENO.md`.

**Sistema de NPC (implementado, no como en la propuesta de esta auditoría):** un solo módulo `npc.js` con datos en `personajes_v18.js`; estado `G.v18.mundo('personaje:<id>')` que solo avanza por transiciones declaradas, sin cambiar el esquema del guardado; carga diferida (< 90 m, libera a > 150 m, máximo 2 a la vez); un modelo y varias apariencias (mallas, colores, accesorios); sin personajes escritos en el código.

---

## 5. Orden de integración (directiva §12)

1. Hecho: Constructor (BM159), Ingeniera (BM160), `npc.js` y la misión del puerto.
2. Siguiente: animación `Reparar` del Constructor (BM164) y revisión de Kelvin sobre capturas.
3. Fase 5: Monkey/Tuerca (la máquina ya existe en la misión) → Shiba/Chispa (Retos) → Piloto Cotorra (Retos, vuelo) → Cat/Maestro Moon (Atalayas del Oeste). Cada uno solo añade una fila de datos y su GLB.

---

## 6. Decisiones de Kelvin

**Respondidas** (`DIRECTIVA_V18_3_RESOLUCION.md`, 6-nov):

1. **Humanos en el mundo: SÍ** (§2). Altura: la ingeniera mide 1,62 m y el constructor 1,75 m en los GLB; queda como está salvo que Kelvin pida otra escala.
2. **Padre guía = el Papá del capítulo 2** (§5). No es el Guardián ni el Piloto Cotorra.
3. **Nombres aprobados como base de diseño** (§6): Constructor de Sombras, Ingeniera de la Esperanza, Tuerca, Chispa, Maestro Moon, Guardián del Primer Vuelo. Los choques de §2 pasan a «riesgos a vigilar».
4. **Los seis van al mundo abierto**, con el arco completo en la temporada 3; los seis capítulos no se modifican (§3, §4).
5. **Piloto Cotorra** = mentor histórico de vuelo, sin sustituir al Papá ni a Vittata (§5, §6F). Falta fijar especie y piel para que no se confunda con Vittata.
6. **Lugar de la primera misión: Puerto de La Mina** (directiva §7), sin tocar el capítulo asociado.
7. **Girl** = aliada con iniciativa propia que ayuda a reparar (§6B).
8. **Cat y Monkey**: aprobados con katana fuera y sin armas realistas (§6E, §11).
9. **Estilo**: adaptar al estilo visual de Amazona Verse (§10.8); ya aplicado en los dos GLB (colores lisos).
10. **Retirar** Real Madrid, foto personal y katana: aprobado (§10, §11); hecho en Constructor e Ingeniera.

**Siguen abiertas:**

- **Derechos de los seis modelos:** Kelvin confirma que participó, pero la cesión o licencia con el modelador, por escrito, sigue sin comprobarse (§10: «verificar su autorización antes de publicarlo»). Se hace aparte, sin entrar en la historia.
- **Procedencia de «cotorrofiver»** (material de Piloto Cotorra y `.blend` del que sale la Vittata del juego): confirmar autoría; afecta a la procedencia de Vittata.
- **Componentes externos** de Shiba, Cat y Monkey (texturas, imagen de referencia de 500×500): registrar y verificar antes de usarlos.
- **Monkey**: BM158 no lo encontró, pero Kelvin confirmó el 6-nov que «Piloto CiberPunk Monkey.blend» (6 MB) está en `~/AmazonaVerse/modelos/` de la Mac. Falta inventariarlo (geometría, rig, texturas).
- **Pasar a canon** las fichas, los nombres en pantalla definitivos («el Constructor» / «la Ingeniera» son provisionales en pantalla) y el arco de cada uno en la temporada 3.
- **Si el cap. 3 se muda** a Puerto de La Mina (`ESTADO_REAL.md:224`): hoy está en la desembocadura y no hay choque.

---

## 7. Diseñado, programado y probado (estado al 6-nov, según el repo)

| | Estado |
|---|---|
| **Diseñado** | Este documento (auditoría de canon y matriz) y `V18_3_DISENO.md` (la misión y el sistema de NPC). Las decisiones de Kelvin están en `docs/DIRECTIVA_V18_3_RESOLUCION.md` |
| **Programado** | Sistema único de NPC `src/game/v18/npc.js` (298 líneas), datos `content/comun/personajes_v18.js` (solo Ingeniera y Constructor), misión `src/game/v18/puerto.js` (826 líneas, los 9 pasos de la directiva §7) y modelos `constructor.glb` y `ingeniera.glb` con sus `_glb.js`. Cableado en `src/boot.js:125-127` (carga a demanda; solo con la bandera V18; `AV.v18PuertoTest`). Los seis capítulos no se tocan |
| **Probado** | `AV.v18PuertoTest()` (registrada en `tools/build/kimi1_106.js:107`): 42/42 con 0 errores de consola en la corrida 5 de KIMI-130 (móvil emulado 375×812 y 390×844, CPU ×4; `docs/img/kimi106r/`, `TAREAS_KIMI.md`). Cubre npc.js a través de la misión; **no hay prueba propia de npc.js**. No consta que esté entre las 13 baterías de `test.sh --extra`: se mide con el arnés de Kimi. **No** hay pruebas en un móvil físico ni revisión de Kelvin sobre capturas |
| **Hecho (8-nov)** | Misión 2 del arco, «Los faroles de las Atalayas» (`src/game/v18/arco.js`, Atalayas del Oeste): Tuerca con fila de datos y estado guardado (operador → inventor → aliado), el Constructor «vecino» y la Ingeniera «rescate» con el mismo modelo. `AV.v18ArcoTest` 39/39 y `v18PuertoTest` 47/47 con las 12 baterías en verde (VM sin GPU). Detalle: `V18_3_DISENO.md` §10 |
| **Hecho (8-nov, 2)** | Misión 3 del arco, «El muelle de la otra orilla» (`src/game/v18/muelle.js`, Embarcadero de las Canoas): primera obra buena del Constructor con la Ingeniera; apariencias «maestro de obra» y «jefa de obra». `v18ArcoTest` 63/63 (las dos misiones). Detalle: `V18_3_DISENO.md` §11 |
| **Hecho (8-nov, 3)** | Misión 4, final del arco: «La fiesta de la colina» (`src/game/v18/fiesta.js`, Templos de la Colina), con la tarjeta «¡Arco completo!» y la placa guardada; el Constructor termina «aliado» con ropa de reparador. `v18ArcoTest` 87/87 en escritorio y en un móvil emulado de 390×844 táctil. El arco se para hasta el visto bueno de Kelvin. Detalle: `V18_3_DISENO.md` §12 |
| **No hecho** | Tuerca, Chispa, Maestro Moon y Piloto Cotorra (fase 5: sin fila de datos y sin modelo propio). Animación `Reparar` del Constructor (BM164, libre; hoy señala). Arco completo de los seis (temporada 3). Retratos finales (la fila usa `assets/retratos/v18/*.jpg`) |
| **Cambios de esta revisión** | Solo este archivo |