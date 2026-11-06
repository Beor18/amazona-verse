# V18.3 · Fase 1 · Auditoría narrativa de los seis personajes históricos

**Estado: solo diseño, para que Kelvin decida.** No se ha programado nada (ver §7). Directiva: `docs/DIRECTIVA_V18_3.md` (§8, §9, §12 Fase 1, §15 puntos 1–8, 11 y 12). La auditoría técnica de los `.blend` es de la Mac (**BM158**, `docs/equipo/TAREAS_API.md:960`). Donde aquí dice «pendiente BM158», la respuesta la dará esa tarea.

Los nombres de los seis («Constructor de Sombras», «Chispa», «Tuerca», «Maestro Moon», etc.) son **provisionales** (`DIRECTIVA_V18_3.md:33`, `:310`). En este documento se usan solo como etiqueta.

---

## 0. Lo esencial en 8 líneas

1. **En el canon no hay humanos.** Todos los personajes con nombre son cotorras (`CANON_REGISTRY.md:13`, `:24`, `:26`, `:29`, `:30`). La única vez que se planteó un humano, para el Guardián, Kelvin eligió una cotorra (`TEMPORADA1_HILO.md:126`, `CANON_REGISTRY.md:24`). Meter a Human y a Girl es la **primera decisión de canon** y es de Kelvin.
2. **Los seis capítulos son «sin villano».** Esa regla está en la biblia (`STORY_BIBLE.md:27`) y en cada capítulo (`NARRATIVA_CAP1.md:45`, `EP2_NARRATIVA.md:57`, `EP3_NARRATIVA.md:62`, `EP4_NARRATIVA.md:58`, `EP5_NARRATIVA.md:65`, `EP6_NARRATIVA.md:70`). Un antagonista humano dentro de un capítulo la rompe. Se recomienda ponerlos en la **capa V18** del mundo abierto, no dentro de las historias de los caps. 1–6.
3. **El cap. 4 («El precio del progreso») ya trata el desarrollo sin culpables** (`EP4_NARRATIVA.md:11`, `:58`). Poner ahí al «constructor irresponsable» duplicaría y contradiría su tema. Su temporada natural es la **3, «El costo de construir»** (`STORY_BIBLE.md:14`).
4. **«Constructor de Sombras» choca dos veces.** En el canon «constructor» es algo bueno: el Guardián Constructor (`CHAPTER_01_SCRIPT.md:13`, `CANON_REGISTRY.md:19`) y Vittata, constructora (`STORY_BIBLE.md:7`). «Sombra» ya es la Sombra de Tormenta (`V18_AMENAZAS.md:13`). Hace falta otro nombre.
5. **Piloto Cotorra está reservado para un minijuego** (`CANON_REGISTRY.md:14`, `DECISION_LOG.md:32`), y su malla es la de la Vittata del juego con traje de piloto (`DECISION_LOG.md:29`, `COTORRAS_22_INFORME.md:10`). Como mentor de historia chocaría con el Guardián. Encaja como **anfitrión de Retos**.
6. **Los roles de mentor y de rival ya están ocupados.** De mentores están el Guardián y las mentoras de los dones, Cat incluido (`CANON_REGISTRY.md:47`, `src/game/dones.js`). De rival, la Campeona de la Explanada, con la que choca Shiba (`src/game/v18/combate.js:3`). Cada uno necesita una función propia que no pise a nadie.
7. **Para la fase 2 se propone «El bohío de La Mina»** en Puerto de La Mina (78, −106). Es una aldea real del mapa, fuera de las zonas de los capítulos, y tiene un bohío amueblado (BM13). Reutiliza `G.v18`, el Grito del Yunque, `reparar.js` y `agarre.js`.
8. **Sistema de NPC:** un solo módulo de datos que guarda el estado en `G.v18.mundo` con la clave `personaje:<id>`. No cambia el esquema del guardado, así que las partidas viejas siguen sirviendo.

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

**El «padre guía» de la directiva** (`DIRECTIVA_V18_3.md:310`) **no existe con ese nombre en el canon.** Puede ser el Guardián (mentor que trata a Vittata de «mija», `NARRATIVA_CAP1.md:40`) o el Papá del cap. 2. Kelvin tiene que aclararlo (§6, decisión 2).

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
| **Primera misión (con lo que ya existe)** | «Vuelo de prueba»: la Carrera en El Yunque con él de instructor. Al ganar se prueba un poder ALAS (Quiebro o Ala fuerte, `src/game/v18/nuevas.js:3-4`) | §3, «El bohío de La Mina»: PICO (Grito del Yunque) + `reparar.js` + `agarre.js` | «La palanca escondida» (fase 3): ella dice dónde mirar y el poder OJOS (Ojo del cenote, `nuevas.js:6`) revela el mecanismo; Vittata repara con materiales del inventario (`S.inv`) | «Carrera contra Chispa»: el contrarreloj del río con él como rival de IA en la spline (`retos.js`). La primera vez hace una trampa visible; la revancha es limpia | «El puente que se mueve» (fase 4): plataformas que él mueve. ALAS para alcanzarlas y el Grito para pararlas, con el patrón de amenaza de `amenaza.js` | «Las once atalayas»: posarse con precisión en perchas y esquivar ráfagas (patrón de `amenaza.js`) con Escudo de plumas (PLUMAS) o Quiebro (ALAS) |
| **Variantes visuales** (§6) | Aviador (gafas y chaleco) y veterano. Piel de **otra especie** (`src/personaje/pieles.js`), nunca la de vittata | Constructor (casco y chaleco), supervisor, explorador, reconciliado | Aprendiz, ingeniera, rescatista, constructora | Corredor, competidor, compañero | Inventor, operador, reparador | Maestro, entrenador, guardián de desafíos |
| **Plan de animación** (§15.6) | Despegue, aterrizaje, saludo, idle. Tiene `RigCotorra` con actions: es el que más cerca está del pipeline de Vittata | Idle, hablar, señalar, enojo o frustración, sorpresa | Idle, hablar, explicar (gesto), usar herramienta, sorpresa. Ya trae una action de pelo | Idle, correr, celebrar, enfado cómico | Idle, martillar, celebrar, frustración | Idle, equilibrio, gesto de «otra vez», reverencia |
| **Modelo y animaciones** | pendiente BM158. Se sabe: Blender 2.80, armature `RigCotorra` con actions | pendiente BM158. Se sabe: Blender 2.80 con armature, sin actions | pendiente BM158. Se sabe: Blender 2.80 con armature y una action de pelo | pendiente BM158. Se sabe: Blender 2.80 con armature, sin actions | pendiente BM158. Se sabe: Blender 2.80 con armature, sin actions | pendiente BM158. Se sabe: Blender 2.80 con armature, sin actions; imagen de referencia externa de 500×500 (`DECISION_LOG.md:396`) |
| **Texturas** | Externas y faltan. Material «cotorrofiver»: es el nombre del `.blend` de 2021 del que sale la **Vittata del juego** (`COTORRAS_22_INFORME.md:10`, `:71`). Confirmar su autoría afecta también a la procedencia de Vittata | Externas y faltan. Posible textura del Real Madrid (pendiente BM158) | Externas y faltan. **Foto personal**: se quita antes de nada (`DIRECTIVA_V18_3.md:128`) | Externas y faltan. Posible Real Madrid (pendiente BM158) | Externas y faltan. Posible Real Madrid (pendiente BM158) | Externas y faltan. Referencias «FeixZero» de un tercero y katana |
| **Riesgos** | Que se lea como un doble de Vittata o un segundo Guardián | Canon (humanos), tono (villano), nombre, escala frente a las cotorras (el mundo está a 1,4 m, `DECISION_LOG.md:40`), estilo cyberpunk frente al toon vibrante (`DECISION_LOG.md:334`) | Desplazar a Vittata; privacidad (foto de una persona real); que el cambio de lado sea gratis | Copiar la función de la Campeona; corre a pie mientras los demás vuelan (la ruta necesita una variante en el suelo) | Duplicar a la Maraña; que parezca un animal real de Puerto Rico | Arma; derechos de terceros; duplicar a las mentoras |
| **Complejidad** | S–M (rig compatible; texturas nuevas) | M (módulo de NPC 3D + misión) | M (fase 3, encima del sistema de Human) | M (variante de ruta en el suelo en `retos.js`) | M–L (plataformas móviles nuevas) | M (percha y ráfaga existen; falta el circuito) |
| **Prioridad** | 4 (en lo técnico es fácil, pero en la historia aporta poco) | **1** (según la directiva, **si Kelvin acepta humanos**) | **2** | 3 | 5 | 6 |

**Si Kelvin no acepta humanos en el mundo:** el orden cambia a Shiba (rival en Retos), Monkey (taller en Puerto de La Mina, con «Tuerca» como responsable de la obra), Piloto Cotorra y Cat. El papel de antagonista con motivo lo haría Monkey, y Human y Girl quedarían para la temporada 3.

### 2.1 ¿Pueden sustituir a algún NPC genérico? (§8.5)

- **Sí:** los 3 rivales cotorras de la Carrera (`retos.js:2`) → Shiba, en una carrera extra; los otros tres modos no cambian.
- **Sí, con cuidado:** el anfitrión de Retos, que hoy no existe → Piloto Cotorra.
- **No:** los personajes con nombre de los caps. 1–6 (decisión del 2-nov: «no quitar personajes», `DECISION_LOG.md:276`), ni la Campeona, porque es la rival del ciclo V18.1 que ya está probado.

### 2.2 Ubicación dentro de los seis capítulos (§15.3)

| Cap. | ¿Entra alguno de los seis? | Por qué |
|---|---|---|
| 1 | No en la historia; sí en la capa V18 del mundo abierto (después de terminar) | Su arco está cerrado y es fundamental (§1.2) |
| 2 | No | «Escuchar también es liderar»: los residentes ya cumplen (`EP2_NARRATIVA.md:17-28`) |
| 3 | No (salvo que se mude a Puerto de La Mina; entonces Puerto de La Mina dejaría de servir para la capa V18) | `ESTADO_REAL.md:224` |
| 4 | **No** | El tema es justo el desarrollo sin villano (`EP4_NARRATIVA.md:58`) |
| 5 | No | Memoria y voces; nada de miedo (`EP5_NARRATIVA.md:66`) |
| 6 | No | Los asientos son de los 36 guardianes; los visitantes «no son premios» (`EP6_NARRATIVA.md:73`) |
| Temporada 3 | **Sí, el sitio natural de Human y Girl** | «El costo de construir: crecimiento, pertenencia y desplazamiento» (`STORY_BIBLE.md:14`) |

### 2.3 Estado de los derechos (§15.11)

| Elemento | Estado | Qué falta |
|---|---|---|
| Los seis `.blend` | Kelvin los hizo con un colaborador (`DIRECTIVA_V18_3.md:11`) | Confirmación escrita del colaborador sobre la cesión o licencia. La participación de Kelvin no prueba sola la titularidad (`:370`) |
| Textura del Real Madrid (5 archivos, según la petición) | **No se puede usar** | BM158 lo confirma archivo por archivo; materiales originales |
| Foto personal en Girl | **No se puede usar** (`:128`) | Quitarla; textura original |
| «FeixZero» en Cat | Un tercero, desconocido | Saber qué pieza es y su licencia, o quitarla |
| «cotorrofiver» en Piloto Cotorra | Es el `.blend` del que sale la Vittata del juego | Confirmar el autor; afecta a la procedencia de Vittata |
| Katana y funda (Cat) | Fuera de la versión infantil (`:214`) | Quitarla del GLB |
| Imagen de referencia de 500×500 (Cat) | Externa | No se publica |

---

## 3. Recomendación para la fase 2: primer antagonista (Human)

**Condición:** que Kelvin acepte humanos en el mundo y dé otro nombre (decisiones 1 y 3). Prototipo **aislado**, detrás de la bandera V18. No cambia ningún capítulo.

### «El bohío de La Mina» (nombre provisional)

**Lugar:** Puerto de La Mina (78, −106), en el bohío amueblado de BM13 (`G.bohiosAmueblados`, `src/engine/mundo.js:333`). Las coordenadas exactas se miden en el mapa real, como hace `combate.js` para buscar su explanada.

**Por qué un refugio y no un camino:** caminos ya bloquea la Sombra de Tormenta (§1.3). El refugio dañado por una obra es la consecuencia nueva: la causa una decisión y le toca el tema confirmado de vivienda y desplazamiento (`CANON_REGISTRY.md:18`).

1. **Pista.** Requisito propuesto: el puente ya reparado (`G.v18.mundo('puente_villa') === 'reparado'`), así el jugador ya sabe reparar. Sale un aviso («En Puerto de La Mina retumba una máquina…») y la bandera verde del minimapa (`G.minimapa.fijarDestino`, como en `ciclo.js`).
2. **Encuentro.** El humano, con casco y chaleco, junto a una máquina que excava. Dice 2 o 3 líneas en las que **ignora un aviso** («Las cotorras se mudan un ratito y ya»). No es malo por construir (`DIRECTIVA_V18_3.md:73`).
3. **El problema se ve.** El techo del bohío está agrietado y hay escombros en la puerta (2 o 3 piezas con collider). Las cotorras de la aldea esperan fuera.
4. **Parar la máquina.** El Grito del Yunque se apunta a la palanca y cada acierto le cambia el ritmo (el mismo patrón de 3 aciertos de `amenaza.js`). Como «otra cotorra que aporta» (`:251`), el Escudo de plumas de *arausiaca* para las astillas.
5. **Despejar.** Con la máquina apagada, los escombros se cargan y se sueltan lejos con `agarre.js` (agarrar, llevar, soltar).
6. **Reparar.** 2 maderas y 1 piedra del inventario de siempre (`G.objetos.has/pay`), como el puente en `reparar.js:22-23`.
7. **Cambio que se guarda.** `G.v18.mundo('bohio_la_mina')` pasa de `roto` a `despejado` y luego a `reparado`. La máquina queda apagada y con cinta, y las cotorras vuelven a entrar. El humano pasa a `personaje:human` = `advertido` y su frase cambia en la visita siguiente. **No se redime** (`:98`).
8. **Recompensa y retorno.** Una marca idempotente (`G.v18.otorgar('bohio_la_mina')`) y la pista de la fase 3: «Alguien de la obra dejó un plano en la gruta…» (Girl).

**Sistemas que reutiliza** (no se modifican, solo se usan):

| Pieza | Archivo |
|---|---|
| Estado del mundo y del personaje, recompensa sin duplicados | `src/game/v18/progreso.js` (`mundo`, `cambiarMundo`, `otorgar`) |
| Grito del Yunque y sus efectos | `src/game/v18/habilidades.js` (`G.v18hab`), `src/game/v18/fx_poderes.js` (`G.v18fx.onda`) |
| Patrón de aciertos apuntados y cambio de ritmo | `src/game/v18/amenaza.js` (se copia el patrón) |
| Coste en materiales y aplicar el estado al cargar | `src/game/v18/reparar.js` (`G.objetos.has/pay`, `G.on('apply')`) |
| Pista y bandera del minimapa | `src/game/v18/ciclo.js`, `src/game/minimapa.js` |
| Cargar y soltar escombros | `src/engine/agarre.js` |
| Hablar y diálogo | `src/game/interaccion.js`, `src/game/dialogo.js` (`say`) |
| El bohío y las cotorras de la aldea | `src/engine/mundo.js:303-333` (BM13), `src/game/comunidades.js` |
| Cargar el GLB y animarlo | `src/engine/assets.js` (`loadGLB`) + `THREE.AnimationMixer` (como `src/personaje/character.js:447`) |
| Textos en inglés | `content/cap1/en.js` |
| Carga detrás de la bandera | `src/boot.js` |

**Código nuevo (pequeño):** `src/game/v18/personajes.js` (el sistema de §4), `content/comun/personajes.js` (los datos), `src/game/v18/la_mina.js` (la misión) y su prueba `AV.v18LaMinaTest()`. La máquina se hace con piezas primitivas o del kit, como las de `minigolf.js`: sin asset nuevo.

**Lo mínimo que tiene que entregar la Mac** (después de BM158):

- `human.glb`, que cargue en three r128 y pase por gltfpack. Objetivo para móvil: **≤ 15 000 triángulos** (como referencia, `vittata_base_lod1.glb` tiene 20 000, `DECISION_LOG.md:29`), 1–2 materiales y un atlas de **≤ 1024** px.
- Armature exportada con dos actions en bucle: **Idle** (2–4 s) y **Hablar** (gestos de brazos y cabeza; el rig no tiene cara, `DIRECTIVA_V18_3.md:296`). Opcionales: Señalar y Frustración.
- Variante de constructor como **nodos que se encienden y se apagan** (Casco, Chaleco), sin un modelo aparte (`:281`).
- Texturas **originales**: nada del Real Madrid ni de fuentes externas sin licencia.
- Escala en metros, con Y hacia arriba. La altura respecto a las cotorras (1,4 m) la decide Kelvin.
- Retrato de diálogo de **512×512** px en PNG con transparencia, sacado del mismo GLB (como los retratos de las cotorras, `CANON_REGISTRY.md:41`).
- El `.blend` original intacto; se trabaja sobre una copia (`:355`).

---

## 4. Propuesta de un sistema de NPC reutilizable (§10)

**Qué existe hoy:**
- Los NPC de la historia son sprites con sombra y collider (`src/engine/actores.js:25-31`, datos `pack.npcs`).
- Los únicos NPC 3D animados son cotorras clonadas del rig de Vittata (`AVCharacter.create`: `combate.js:184-189`, `descubrir.js`, `retos.js`).
- El mundo vivo usa mallas instanciadas sin estado narrativo (`ciudad_viva.js`, `residentes.js`, `comunidades.js`).
- El único almacén de progreso de la V18 es `G.v18` (`progreso.js:1-11`).

No hay un NPC 3D genérico (con un GLB que no sea Vittata) ni estados por personaje.

**Propuesta: un solo módulo, `src/game/v18/personajes.js`, que lee datos de `content/comun/personajes.js`:**

```js
// content/comun/personajes.js (ejemplo de forma, no es canon)
{ id: 'human', nombre: '[KELVIN]', modelo: 'assets/models/personajes/human.glb', retrato: 'assets/personajes/human.png',
  sprite: 'assets/personajes/human.png',              // respaldo en calidad baja o si el GLB falla (actores.js)
  escala: 1.0, radio: 0.6,
  variantes: { constructor: ['Casco', 'Chaleco'], base: [] },   // nodos del GLB que se encienden
  anim: { idle: 'Idle', hablar: 'Hablar' },
  estados: ['antagonista', 'advertido'],               // solo los que use; el primero es el de partida
  porEstado: {
    antagonista: { variante: 'constructor', donde: 'la_mina', dialogo: 'human_antes' },
    advertido:   { variante: 'constructor', donde: 'la_mina', dialogo: 'human_despues' } },
  transiciones: { antagonista: { advertido: { mundo: { bohio_la_mina: 'reparado' } } } },  // nunca al azar (§3)
  aparece: { v18: true, mundo: { puente_villa: 'reparado' }, fueraDeZonas: true } }
```

| Pieza | Cómo, con lo que existe |
|---|---|
| **Guardado** | Solo el estado si cambia el progreso: `G.v18.cambiarMundo('personaje:human', 'advertido')`. No cambia el esquema (`progreso.js` sigue en `v: 1`), emite el evento `v18` de tipo `mundo` y, si no hay nada, toma el primer estado. Así las partidas viejas no se rompen |
| **Estados** | Los cinco de la directiva (`neutral`, `aliado`, `rival`, `antagonista`, `reconciliado`) más los intermedios que haga falta (`advertido`). Cada personaje declara solo los suyos (`:353`). Solo se cambia por `transiciones` con una condición del mundo cumplida |
| **Aparición** | `aparece`: bandera V18, estados de `G.v18.mundo`, capítulos terminados (`AVTemporada.leer().terminados`, `src/game/temporada.js`), hora (`S.hora`). `fueraDeZonas` usa `G.zonas.zonaEn` (`zonas.js`) para no caer dentro de la zona de un capítulo |
| **Cuerpo** | GLB con `AVE.assets.loadGLB` y `AnimationMixer`. Se apaga lejos de la cámara, igual que `ciudad_viva.js` (más de 170 m) y que el LOD por distancia. En calidad «bajo», o si el GLB no carga, el sprite de `actores.js` |
| **Hablar** | Un interactuable de `G.interaccion.add`. Las líneas del estado van a `G.dialogo.say` con el retrato, y el inglés va en `en.js` |
| **Comportamiento** | Mínimo: mirar a Vittata al acercarse y reproducir la animación del estado. Lo de cada misión vive en su archivo (`la_mina.js`), no en el sistema |
| **Prueba** | `AV.v18PersonajesTest()`: aparece o no según los requisitos; la transición solo con su condición; tras recargar sigue el estado; una partida vieja sin claves sigue igual |

---

## 5. Priorización de la integración (§15.8)

1. Kelvin decide §6, puntos 1–4.
2. La Mac cierra BM158 y entrega `human.glb` con las piezas de §3.
3. Fase 2: `personajes.js` + «El bohío de La Mina» + pruebas (13 baterías en verde).
4. Fase 3: Girl en la misma aldea («La palanca escondida»).
5. Fase 4: Shiba (Retos) → Piloto Cotorra (Retos) → Monkey (Gruta de La Mina) → Cat (Atalayas del Oeste). El orden va por impacto y esfuerzo: los dos primeros reutilizan `retos.js` casi tal cual.

---

## 6. Decisiones que solo puede tomar Kelvin

1. **¿Hay humanos en el mundo de Amazona Verse?** Hoy todos los personajes son cotorras. Si la respuesta es sí: ¿qué altura tienen frente a las cotorras (1,4 m)?
2. **¿Quién es el «padre guía»** de la directiva: el Guardián, el Papá del cap. 2 u otro?
3. **Los nombres definitivos.** Se propone no usar «Constructor» ni «Sombra» para Human, ni «Maestro» para Cat (§2). También faltan los de Girl, Shiba, Monkey y Piloto.
4. **¿Van los seis solo en la capa V18 y en la temporada 3**, sin tocar los caps. 1–6? Es la recomendación.
5. **Piloto Cotorra:** ¿lo dejamos de anfitrión de Retos (minijuego, como dice `CANON_REGISTRY.md:14`) o lo quieres como mentor de la historia? ¿Con qué especie y piel, para que no se confunda con Vittata?
6. **El lugar de la fase 2:** ¿Puerto de La Mina? Y sobre el cap. 3: ¿se queda en la desembocadura? (`ESTADO_REAL.md:224`)
7. **La función de Girl:** ¿la que conoce la máquina y lo explica (recomendado), en vez de la que repara, para no pisar a Vittata?
8. **Cat y Monkey:** ¿te parece bien un gato mentor de cotorras y un mono que hace obstáculos, con la etiqueta «fantasía» y sin datos de fauna real?
9. **Derechos:** confirmar por escrito con el colaborador la cesión o licencia de los seis `.blend`; qué es «FeixZero»; quién hizo «cotorrofiver» (afecta también a Vittata). Y aprobar que se quiten el Real Madrid, la foto personal y la katana.
10. **El estilo:** los modelos son «cyberpunk». ¿Se pasan al toon vibrante del juego (`DECISION_LOG.md:334`) o se queda un toque tecnológico?

---

## 7. Diseñado, programado y probado

| | Estado |
|---|---|
| **Diseñado** | Este documento: auditoría del canon, la matriz, la misión de la fase 2 y el sistema de NPC. Es una propuesta y no es canon |
| **Programado** | **Nada.** No hay código, ni assets, ni cambios en los capítulos ni en el guardado |
| **Probado** | **Nada.** No hay nada que probar todavía; tampoco hay pruebas en móvil (§15.10 queda para la fase 2) |
| **Cambios realizados** (§15.12) | Solo este archivo |
| **Pendiente** | Las decisiones de §6; BM158 (técnica de los `.blend`); `human.glb`; la fase 2 |
