# V18.3 · Diseño técnico breve: NPC reutilizables y «El puerto que volvió a vivir»

**Estado (6-nov): IMPLEMENTADO en `src/game/v18/npc.js`, `src/game/v18/puerto.js` y `content/comun/personajes_v18.js` (prueba `AV.v18PuertoTest()`); lo probado y lo pendiente, al final (§9).** El texto de abajo es el diseño de partida. Se basa en `docs/DIRECTIVA_V18_3_RESOLUCION.md` (§6–§9, §12–§13) y en `docs/equipo/V18_3_AUDITORIA.md` (§3–§4). Lo marcado **[KELVIN]** es una decisión suya.

## 0. Puerto de La Mina: medido en el mapa real (`assets/data/mapa_cap1.js` + `mapa_cap1_altura.js`)
- **Aldea** `kelvin_aldea_mina` (POI 78,−106). La plaza está en (73,6, −75,2) con r 6,2 (`content/cap1/mundo.js:70`), a cota ~5, en la orilla del **Río Amazonas**. Al este hay una **meseta** a cota 10–12, con las tres `ruina_torre_b` en (88,−80), (92,−68) y (102,−74), una empalizada en (82–86, −79…−92) y dos toldos en (75,1, −76,7) y (88,6, −70,7). Los bohíos, con el amueblado BM13, están en la loma (88–98, −133…−142).
- **Lo que no se puede tocar ni tapar:**
  - El **río**: lo recorren River Rush, el «Contrarreloj del río» (`retos.js:820`) y `rio_vivo.js`.
  - La quebrada, la poza (72,−91,5, r 10) y la cascada de La Mina: son un punto de Retos (`retos.js:806`).
  - La **Gruta** (65,5,−98,5→61,−109), el secreto «cascada» (61,−109) y la maraca de FIELD.
  - La corriente de la neblina (72,−104, r 9).
  - La **ruta de la gota** del cap. 1 (`misiones.rutaGota.escorrentia`: 78,−129 → 66,−70).
  - El **sendero `la_mina`**: baja de (126,−60) a (86,−86).
  - La puerta del bohío BM13: `bohios.js` comprueba que esté abierta.
- **Ningún capítulo usa este sitio.** Las zonas de `zonas.js` quedan a ≥ 69 m: la más cercana es la del cap. 6 (11,−76, r 20). El riesgo de H18 («cap. 3 en La Mina») sigue anotado en la auditoría: si el cap. 3 se muda aquí, hay que reubicar la misión.
- **Sitio elegido:** la **ladera entre la plaza y la meseta de las torres**. No tiene sendero, ni agua, ni misiones.
  - Eje provisional de la escalera: de **A (77,−73,5)**, cota ~5,5, a **B (86,−74,5)**, cota ~11,8. Son 9 m de recorrido y 6,3 m de subida.
  - Distancias: el toldo queda a ≥ 3,7 m; las torres, a ≥ 5,8 m; el sendero, a ≥ 9 m; el borde del río, a ≥ 5 m; la ruta de la gota, a ≥ 11 m.
  - Hoy, para subir a la meseta desde el puerto, se vuela o se rodea. La misión **añade** un acceso a pie: no quita nada.
  - **Medición en el juego:** las coordenadas se confirman al cargar con `sitio()`, como `combate.js` y `minigolf.js`, y con la misma lista de exclusiones que arriba (`enSeco` de `reparar.js`). La prueba comprueba todas las distancias.

## 1. `src/game/v18/npc.js` → `G.v18npc` (un solo sistema para los seis)
- **Datos:** `content/comun/personajes_v18.js` define `window.AV_NPC_V18`. El sistema no lleva datos dentro, para que la fase 5 añada filas sin tocar código. Cada fila tiene:
  `{ id, nombre:{es,en}, rol, glb, respaldo, alto, anim:{idle,hablar,trabajar,senalar}, apariencias:{…}, estados:[…], porEstado:{ <estado>: { apariencia, anim, dialogo } }, transiciones:{ de:{ a:true } }, aparece(V) → bool, retrato }`.
- **Modelo:** `G.assets.loadGLB('assets/models/personajes/<glb>.glb', { script: '…_glb.js', b64: () => (window.AV_PERSONAJES_B64||{})[glb] })`.
  - Hay un GLTF en caché por `glb`, y cada NPC hace `scene.clone(true)` y clona sus materiales para poder teñirlos.
  - `ingeniera.glb` no tiene skin. Sus mallas son rígidas y cuelgan de los nodos `Cabeza`, `HombroL` y `HombroR`, que son los que animan `Idle`, `Hablar` y `Reparar`. Basta con un `THREE.AnimationMixer` sobre el clon.
  - El modelo mide 1,62 m y la escala viene en la raíz (0,1757). La altura junto a las cotorras de 1,4 m la decide Kelvin **[KELVIN]**.
- **Constructor provisional (BM159 sin entregar):** la fila tiene `glb: null, respaldo: 'ingeniera'`.
  - Mientras tanto se carga la malla de la Ingeniera con otra paleta, el `Pelo` oculto y accesorios primitivos: casco industrial (media esfera amarilla en `Cabeza`) y chaleco naranja con bandas, a 1,08×. Se marca `provisional: true`.
  - Cuando llegue `constructor.glb`, basta con poner `glb: 'constructor'` en la fila de datos. **No se toca código.**
  - No se intenta cargar un archivo que no existe: un 404 contaría como error de consola en las baterías.
- **Carga diferida:**
  - Solo se instancia un NPC si se cumple `aparece()` y Vittata está a < 90 m de su sitio. Se libera, quitando el clon pero dejando la caché, a > 150 m.
  - El mixer y el «mirar a Vittata» solo corren a < 60 m. Como máximo hay `MAX_ACTIVOS = 2` instancias.
  - El primer GLB no se pide hasta que se cumple la condición de la misión: no se carga nada en la portada ni en Villa Raíz.
  - Calidad «bajo»: sin mixer; queda la pose de `Idle` en el fotograma 0.
- **Apariencia:** `apariencia(id, nombre)` aplica `{ mallas visibles, colores por nombre de material, accesorios }`.
  - Las mallas se encienden y apagan con `node.visible`. Los grupos vienen en `extras.variantes` de la raíz del GLB: `aprendiz` = Guantes + Cinturón, `ingeniera` = Chaqueta, Cinturón, Mochila y Guantes.
  - Los colores cambian `material.color` sobre los materiales clonados (`MONO`, `CHAQUETA`, …). **Nunca se crea un modelo nuevo por estado** (§8).
- **Estado narrativo:** se guarda en `G.v18.mundo('personaje:<id>')`.
  - Lo lee `estado(id)`: si no hay valor o es desconocido, vale `estados[0]`.
  - `cambiarEstado(id, e)` solo acepta lo que está en `transiciones`, así que nunca se retrocede ni se cambia de bando sin causa (§8). Solo lo llama la misión.
- **Interacción:** `G.interaccion.add({ id: 'v18npc_<id>', r: 2.6, visible: () => instanciado && libre, label, use })`. Por defecto, Acción reproduce el diálogo del estado. La misión puede sustituir `label` y `use` con `npc.alUsar(id, fn)`.
- **Globo de diálogo:** se reutiliza `G.dialogo.say(lineas, fin, opts)` con `{ who, text, img: retrato }`.
  - Las charlas de misión van en caja (`{ caja: true }`). Los comentarios al pasar van en bocadillo (`{ libre: true }`), uno por cada 20 s como máximo.
  - Durante `Hablar` el NPC gira para mirar a Vittata.
  - El inglés va en `content/cap1/en.js` (es→en, como el resto de V18).
- **API:** `G.v18npc = { registrar, def, estado, cambiarEstado, apariencia, instancia, alUsar, decir, test }`.

## 2. `src/game/v18/puerto.js` → `G.v18puerto`: los 9 pasos de §7
**Condición de aparición:** `G.V18`, pack del cap. 1 con mapa real y `G.v18.mundo('puente_villa') === 'reparado'`, para que el jugador ya sepa reparar. Una vez por sesión sale un aviso («En Puerto de La Mina retumba una máquina…») y la bandera del minimapa, igual que en `ciclo.js`.

| # | Qué pasa en el juego | Estado `puerto_mina` | Piezas |
|---|---|---|---|
| 1 | **Obra irresponsable:** en la ladera hay un andamio a medias y escombros tirados. Arriba está el Constructor (supervisor), que ignora el aviso de la Ingeniera: «Las cotorras se mudan un ratito y ya». | `obra` (por defecto) | Primitivas y piezas del kit (`muelle.glb`, `tronco_caido`): sin asset nuevo |
| 2 | **Máquina de Tuerca:** una perforadora de escalones (cuerpo, engranaje que gira, brazo y luces; primitivas como las de `minigolf.js`) se atascó al pie de la ladera, junto a A, y tapa la subida. Tiene collider y suelta bocanadas de polvo cada 5 s: empujan suave y no quitan nada. Tuerca solo se nombra; todavía no aparece. | — | `G.fisica.colliders`, `G.fx` (dust) |
| 3 | **Vittata lo descubre:** a 14 m de la máquina, la Ingeniera (aprendiz) cuenta qué pasó. | `descubierto` | `G.v18npc.decir` |
| 4 | **Investigar con poderes:** hay 3 pistas con Acción (tuerca suelta, plano roto, mancha de aceite). Si la especie elegida tiene un poder **OJOS**, las pistas y una ruta de puntos dorados al engranaje brillan; si no, la Ingeniera señala la tercera, para que nadie se atasque. Después, **3 aciertos** con el poder de la especie elegida sobre el engranaje trabado, con el patrón de `amenaza.js`: `H.luchador`, `H.usar(j, j.poder, ctx)` y `ctx.golpear` sobre el engranaje. Cuenta como acierto: PICO (el Grito del Yunque apuntado, lluvia o semilla), ALAS (empujar la palanca con Quiebro o Ala fuerte), PLUMAS (llegar a la palanca protegida durante la bocanada) u OJOS (usarlo a ≤ alcance + 1 m mirando al engranaje). | `investigado` | `G.v18hab` (solo se lee), `G.v18fx.onda` |
| 5 | **La Ingeniera desactiva:** camina al panel y hace `Reparar` durante 3 s. El jugador «sostiene el freno» con Acción mientras ella trabaja. Las luces se apagan, el engranaje se para y la máquina retrocede 3 m, así que la subida queda libre de collider. | `desactivado` | `npc.alUsar`, `G.interaccion` |
| 6 | **Recuperar materiales:** 3 tablas y 1 cuerda salen del andamio y de los escombros. Se colocan con `enSeco` y se recogen con Acción. Son de la misión: **no** gastan `S.inv` y no tocan el margen del cap. 1. | claves `v18_puerto_tabla_1..3` y `v18_puerto_cuerda` = `recogida` | Patrón de `recogerMaterial` (`reparar.js:218`) |
| 7 | **Reparar el acceso:** con 4/4, en A sale «Reparar la escalera con la Ingeniera». Primero se guarda el estado del mundo y después se lanzan los efectos (orden de `reparar.js:239`). | `reparado` | `V.cambiarMundo` |
| 8 | **Transformación visible:** una escalera de tablas con barandas, dos faroles y banderines lisos de colores (ninguna bandera de país). Pasa a ser un piso caminable de A a B con `T.addPlatform({ tipo: 'rampa', a, b, ancho: 2, id: 'v18_escalera_mina' })`, como el piso del puente (`terreno.js:237`). La máquina queda reconvertida (verde, con una maceta y un farol encima). El Constructor pasa a `reparador` y la Ingeniera a `responsable`, con frases nuevas. | — | `aplicar()` |
| 9 | **Persistente:** `aplicar()` corre al iniciar, en `G.on('apply')` y con cada evento `v18` de tipo `mundo` cuyo id empiece por `puerto_` o `v18_puerto_`. Es el mismo patrón que `reparar.js:380-395`. | — | `G.v18` |

**Controles** (§6 del encargo):
- **PC:** Acción = E, como siempre; poder = G o mantener Impulso, igual que en la Sombra de Tormenta.
- **Táctil:** el botón Acción de siempre y un botón «Poder» de ≥ 44 px en el HUD `#v18-puerto` (estilo de `#v18-amenaza`). Solo sale a < 16 m de la máquina en el paso 4.
- **Encuentro:** dentro de ese radio, `G.interaccion.modo` se toma igual que en `amenaza.js:217` y se devuelve al salir. No hay teclas nuevas y el duelo de 2 no interviene.

## 3. Apariencias: un modelo, varias apariencias
| NPC | Estado → apariencia | Cómo |
|---|---|---|
| Constructor | `supervisor` → `reparador` | **Supervisor:** casco amarillo, chaleco naranja, paleta gris oscuro y `Señalar` (en el provisional, `Hablar`). **Reparador:** sin chaleco, con mochila y guantes, paleta cálida, casco con franja verde y `Reparar` junto a la escalera. Con su GLB definitivo, las mallas `Casco` y `Chaleco` sustituyen a los accesorios primitivos. «Explorador» queda reservado. |
| Ingeniera | `aprendiz` → `responsable` | **Aprendiz:** variante `aprendiz` (guantes y cinturón) y mono claro. **Responsable:** variante `ingeniera` (chaqueta, cinturón, mochila y guantes), insignia primitiva en la chaqueta y `Idle` en el panel de la plaza. |

Las transiciones solo existen en el paso 8 y no tienen vuelta. «Reparador» no es «redimido»: su arco completo es de la temporada 3 **[KELVIN]**.

## 4. Guardado
- Todo va en `G.v18.mundo` (`progreso.js`, **v2 sin cambios de esquema**):
  - `puerto_mina`: `obra`, `descubierto`, `investigado`, `desactivado` o `reparado`.
  - `v18_puerto_tabla_1..3` y `v18_puerto_cuerda`: `recogida`.
  - `personaje:constructor` y `personaje:ingeniera`.
  - Las pistas del paso 4 viven solo en la sesión: rehacerlas no cuesta nada.
- **Migración:** no hace falta. Una partida vieja no tiene claves, así que empieza en `obra` (y antes del puente ni aparece).
  - El estado solo avanza: `avanzar(e)` compara posiciones en la lista y no baja nunca.
  - Si `puerto_mina === 'reparado'` y falta la clave de personaje, se deduce `reparador`/`responsable`.
  - Un valor desconocido se trata como `obra`, salvo que ya esté `reparado`.
- Una build anterior sin `puerto.js` conserva las claves sin tocarlas: `mundo` es un mapa libre.
- `G.v18.otorgar('puerto_mina', 'puerto_mina', 1)` es la marca idempotente de que la misión está terminada.

## 5. XP V18.2
Al llegar a `reparado`, si existe `G.v18evo` y `!V.otorgado('xp_puerto')`, se ejecuta `V.otorgar('xp_puerto', 'xp_puerto', 1)` y luego `G.v18evo.dar(V.seleccionada() || 'vittata', 150, 'puerto')`. Son 150 XP, lo mismo que la Sombra. Si `evolucion.js` todavía no se había cargado, el mismo chequeo se repite al cargar `puerto.js` y con el evento `v18` de tipo `evo`. Así el pago llega una sola vez y también en partidas viejas. **No se toca `evolucion.js`.** Aviso: los 4 materiales `recogida` ya pagan 10 XP cada uno por `hitos()` (`evolucion.js:134`). Es el comportamiento esperado y es coherente con el puente.

## 6. Carga (`src/boot.js`, 2 líneas, detrás de la bandera)
`const npc18 = aDemanda('src/game/v18/npc.js','AVV18Npc'), puerto18 = aDemanda('src/game/v18/puerto.js','AVV18Puerto'), cargarV18Puerto = () => Promise.all([cargarV18Reparar(), hab18(), cargarV18Fx()]).then(npc18).then(puerto18); AV.v18PuertoTest = o => cargarV18Puerto().then(p => p.test(o)); if (v18On) alPrimerGesto(cargarV18Puerto);`

- `npc.js` carga sus datos con `AVE.assets.script('content/comun/personajes_v18.js')`. `puerto.js` espera a `G.mundo.listo` y, si el pack no es el del cap. 1 con mapa real, no hace nada. Sin `?v18=1` no se carga nada.

## 7. Prueba `AV.v18PuertoTest()` (lista) y riesgos
1. Sin bandera no existen `G.v18npc` ni `G.v18puerto`, y no se pidió ningún GLB de personaje.
2. Antes del puente no aparece nada. Con el puente reparado, sale el aviso y la bandera del minimapa.
3. El sitio medido cumple las distancias de §0: río, poza, gruta, secreto, ruta de la gota, sendero, torres, toldos y plaza. Además, A y B están en seco y la pendiente es ≤ 40°.
4. Lejos (> 150 m) no hay instancias; a 60 m hay 2 como máximo. Al alejarse se liberan y no quedan mallas ni mixers (con `AV.fugasTest`).
5. La Ingeniera carga `ingeniera.glb` con `Idle`, `Hablar` y `Reparar`. El Constructor usa el respaldo con `provisional: true`, sin peticiones 404.
6. `apariencia()` cambia la visibilidad de mallas y los colores sin crear geometría nueva: el número de geometrías no cambia.
7. Los pasos 1→9 se pueden jugar con Vittata, con el Grito apuntado (un grito de espaldas no cuenta), y con arausiaca, con el Escudo durante la bocanada.
8. La máquina tiene collider antes y no después. La rampa `v18_escalera_mina` sostiene: se sube a pie de A a B sin volar y sin rescate de atasco, como `cruzarAPie` de `reparar.js`.
9. Los materiales no se duplican y `S.inv` no cambia durante la misión.
10. Reparar sin 4/4 no funciona. Con 4/4 se guarda `reparado` antes de los efectos.
11. **Tras recargar** (`V.recargar()` + `apply`), siguen la escalera, la máquina reconvertida, las dos apariencias y los diálogos nuevos.
12. Una partida v1/v2 sin claves sigue igual, y un valor basura en `puerto_mina` no rompe nada.
13. La XP se paga una sola vez, también si `evolucion.js` se carga después.
14. **Táctil:** el botón Poder y Acción funcionan; al salir del radio se devuelve `G.interaccion.modo`. Los textos tienen inglés en `en.js` y en ningún texto aparece «FeixZero».
15. Las 13 baterías quedan en verde, con 0 errores de consola.

**Riesgos:** (a) La pendiente de 38° puede ser demasiado empinada para el motor a pie. **Mitigación:** tramo en dos rampas con un descanso. (b) Las coordenadas son provisionales hasta medirlas en el juego. **Mitigación:** la prueba 3. (c) El retrato está en `docs/img/v18_3/`, y hay que comprobar que `sitio.sh` lo publique. Si no, se mueve a `assets/`, sin duplicarlo. (d) Un Constructor que use la malla de la Ingeniera puede leerse como un clon. Por eso es provisional y lleva accesorios distintos, hasta BM159. (e) Puede chocar con otros `G.interaccion.modo`. La Sombra, el Sapo y el minigolf están a más de 150 m, y solo se toma el modo dentro del radio. (f) Si el cap. 3 se muda a La Mina (H18), hay que reubicar la misión. (g) La escala humana junto a las cotorras **[KELVIN]**. (h) Rendimiento en móvil: 2 NPC de 13,7 k triángulos y un mixer. Hay que medirlo en un teléfono real.

## 8. Lo que queda para la fase 5
- Los modelos y las filas de datos de **Tuerca** (que pasará de operador a reparador, y cuya máquina ya existe), **Chispa** (Retos o carrera), **Maestro Moon** (sin katana) y **Piloto Cotorra**, con el mismo `npc.js`. Cambiar al `constructor.glb` (BM159): es una línea de datos. El arco del Constructor más allá de `reparador` y la misión propia de la Ingeniera. Una bandada que vuelva al puerto, si `comunidades.js` lo permite sin tocarlo. Las pruebas en dispositivos móviles reales. **[KELVIN]:** los nombres finales («Constructor de Sombras» choca con el Guardián Constructor y con la Sombra de Tormenta; ver la auditoría, §0.4), la altura, la publicación y la atribución de los modelos (§10).

## 9. Implementación (6-nov)
- **Hecho:** `npc.js` (G.v18npc, datos en `content/comun/personajes_v18.js`), `puerto.js` (G.v18puerto, los 9 pasos), 2 líneas en `src/boot.js` detrás de la bandera, textos EN en `content/cap1/en.js`, retrato de la Ingeniera copiado a `assets/retratos/v18/ingeniera.jpg` (la build no publica `docs/img`; el original sigue en `docs/img/v18_3/`).
- **Cambios frente al diseño:** el eje de la escalera empieza en la plaza, A (74,4, −73,25) → B (85,6, −74,45), porque desde (77, −73,5) el primer tramo salía de 40°. La escalera es la envolvente superior del terreno: 3 rampas, 32° como máximo, y se sube a pie con el motor (prueba 14c). Distancias medidas en el juego (prueba 4): toldo de la plaza 2,3 m, canoa 3,0, torre más cercana 4,6, ruta de la gota 6,3, sendero, poza, gruta y secreto a más de 17. El freno se «sostiene» quedándose junto a la palanca 3 s (mantener E no es fiable en teclado ni existe en táctil). El poder es con G o Acción (no con Impulso mantenido, como la Sombra). El Constructor provisional lleva una insignia SVG como retrato hasta que llegue el de BM159.
- **Pendiente:** BM159 (`constructor.glb`: cambiar `modelo/script/b64` en su fila y quitar `respaldo`/`provisional`; poner su `retrato`); probar en un teléfono real; **[KELVIN]** nombres definitivos, escala humana junto a las cotorras, atribución de los modelos.
