# TEMPORADA 1 · El hilo de los 6 capítulos

Estado: **PROPUESTA** (tarea AM1, 26-oct-2026). Une en una sola historia el cap. 1 (jugable) y los diseños de los eps. 2 a 6. Lo CONFIRMADO viene de `docs/CANON_REGISTRY.md`; lo demás es PROVISIONAL y lo dudoso lleva `[KELVIN]`. Las decisiones pendientes están todas juntas al final («Decisiones para Kelvin»).

Fuentes: `docs/STORY_BIBLE.md`, `docs/CANON_REGISTRY.md`, `docs/DECISION_LOG.md` (26-oct: canon de la Voz), `docs/CHAPTER_01_SCRIPT.md`, `docs/equipo/NARRATIVA_CAP1.md`, `content/cap1/historia.js` y `dialogos_cap1.js`, `docs/equipo/EP2_*`, `EP3_*`, `EP4_GDD.md` (el ep. 4 solo tiene GDD), `EP5_*`, `EP6_*`, y los packs `content/ep2`, `ep3` y `ep4` (solo leídos; no se tocan).

**Canon CONFIRMADO que manda en todo el hilo:** Vittata es la protagonista, inventora y líder, y su defecto es querer hacerlo todo sola. El aprendiz del jugador la acompaña, no la reemplaza. Los 36 del pacto se inspiran en las 36 especies del género *Amazona* (34 vivas, más *Amazona martinicana* y *Amazona violacea*, extintas). La Voz del transmisor son esos dos guardianes extintos; en el cap. 1 no se revela (retrato neutro) y la frase de Vittata «esa voz es de ahora» se queda como pista: hablan desde el presente, y el porqué se revela más adelante (propuesta: temporada 5). Reglas: sin villano, ninguna decisión lo maximiza todo, los guardianes se conocen y se ayudan y nunca se capturan ni se venden, y las dos especies extintas se tratan con cuidado científico.

## 1. La temporada en una página

| Cap. | Título | Qué aprende Vittata | Cómo termina | Gancho que abre el siguiente |
|---|---|---|---|---|
| 1 | El día que el cielo se rompió | De «yo puedo sola» a «¿me ayudas?» | Refugio en pie; el transmisor habla en vivo; símbolo de 36; plano de un bote en el mirador | La luz de la niebla contesta tres veces. El Guardián: «Antes de buscarlos, hay que tener dónde esperar la tormenta. Y esa tormenta llega pronto» |
| 2 | Un lugar para todos | De «yo sé» a «cuéntame» | Casa de dos niveles que aguanta la tormenta; el huevo del papá en su nido; fiesta de techado | El plano del bote va a la mesa de todos. El papá: «Falta alguien que sepa navegar». La luz, otra vez |
| 3 | Más allá de la bahía | De «cuéntame» a «llévalo tú» | Canoa de todos; travesía con la navegante; llegada a la comunidad de la otra orilla; las dos comunidades oyen la misma Voz | La Vecina enseña un plano para unir las dos orillas: «hay que cortar mucho bosque». Vittata, por primera vez: «Déjame pensarlo» |
| 4 | El precio del progreso | De «lo decido yo» a «lo decidimos con todos y cuidamos lo que cuesta» | Se construye lo acordado (puente, puente alto o muelles) con su cuidado; la abuela cruza | El Guardián: «Antes también se cruzaba este río… pero no recuerdo cómo». El transmisor vuelve a hablar, y esta vez son dos |
| 5 | Las voces olvidadas | De «déjame a mí» a «sostén tú esta» | Relevo de señales de Villa Raíz a la niebla; las dos voces responden enteras: son las dos guardianas extintas y «hablan desde ahora» | Más allá de la niebla se enciende una luz, y luego otra. «No los vas a poder juntar tú sola.» «No. Pero sí puedo ayudar a que se junten» |
| 6 | El pacto de los 36 | De «sostén tú esta» a «¿quién lo hace mejor?» | Llegan los que quedan del pacto; círculo de 36 asientos; los de quienes no llegaron quedan con luz tenue | «Las islas olvidadas no oyen el relevo.» Vittata escribe una columna de nombres: «La tripulación». Fin de la temporada 1; abre la temporada 2 |

Regla del arco: en cada capítulo Vittata vuelve a caer en su defecto, pero en un terreno nuevo (construir, diseñar, navegar, decidir, recordar, coordinar), y cada vez cede un poco antes. Nunca se castiga; siempre hay salida.

## 2. Capítulo por capítulo

### Cap. 1 · El día que el cielo se rompió (jugable; `content/cap1`)
- **Cómo termina (lo que hoy se ve en el juego):** tras la crecida, el Guardián regala su banco; Vittata repara el transmisor y una voz en vivo dice «Si alguien puede escucharme… …el pacto… viene otra tormenta…». Aparece el símbolo de 36 fragmentos. Vittata: «¿Qué pacto? ¡Un símbolo dividido en 36 piezas! Esa voz no es vieja. ¡Es de ahora!». El Guardián: «No veía ese símbolo desde hace mucho. Esta historia es más grande de lo que imaginamos». En el mirador Vittata dibuja el plano de una embarcación («Empezando por un bote. ¡Pa'lante!»); la luz de la niebla parpadea tres veces; el Guardián: «Antes de buscarlos, hay que tener dónde esperar la tormenta. Y esa tormenta llega pronto».
- **Qué sabe Vittata de las dos voces:** que hay *una* voz, que es de ahora (no una grabación), que habla de «el pacto», que el símbolo tiene 36 piezas, que el Guardián reconoce el símbolo y calla, y que algo en la niebla contesta con luz. No sabe quién es ni cuántos son.
- **Personajes:** Vittata, Iguaca, el Guardián Constructor, la Voz (retrato neutro de onda), el Narrador, el aprendiz del jugador. Pendientes del cap. 1 (`PENDIENTES_KELVIN` de `historia.js`): forma del Guardián (KELVIN-1), la medalla (KELVIN-3, **hoy no está en el juego**), la cara de la Voz (KELVIN-4), la familia de Iguaca (KELVIN-5), el diseño del bote (KELVIN-7) y quién contesta con la luz (KELVIN-8).
- **Lugares y sistemas:** taller, río y colina (dos terrenos), refugio, mirador, transmisor (`TRX`), luz de la niebla (`luzMirador.parpadear(3)`), símbolo de los 36, plano del bote, criadero, cómic. Mapa: El Yunque (escena de Kelvin).

### Cap. 2 · Un lugar para todos (`EP2_*`; prototipo `content/ep2`)
- **Cómo abre:** esa misma noche, desde el mirador, la luz parpadea otra vez; el transmisor: «…otra tormenta… tres días…». Amanece; el refugio no aguanta otra; Vittata deja el bote para después: «Un techo de verdad, no».
- **Cómo termina:** la casa de dos niveles aguanta la segunda prueba; el papá pone el huevo en el nido; la abuela entra sin trepar; fiesta de techado (dato cultural **por verificar**). Vittata lleva el plano del bote a la mesa de todos: «¿Qué le falta?». El papá: «Alguien que sepa navegar». Corte a la luz de la niebla.
- **Qué sabe Vittata de las dos voces:** la Voz conoce Villa Raíz por su nombre y dice «**tenemos**»: primera pista de que son más de una (nadie lo comenta todavía). Dice una palabra que nadie entiende (`[KELVIN]`, propuesta: el nombre de una isla del sur, que vuelve en el ep. 5). El Guardián saca una medalla que nadie le había visto y la vuelve a guardar sin explicar; Iguaca lo nota.
- **Personajes:** Vittata, Iguaca (M1 y la formativa), el Guardián (una línea en M2 y el giro), la abuela y el papá con su huevo (nuevos, placeholders `[KELVIN]`), la Voz (solo audio), el aprendiz.
- **Lugares y sistemas:** tres sitios del terreno (llano, loma y claro en el prototipo), la casa con sus piezas, la tormenta de prueba, el nido, el transmisor y la luz del cap. 1, Diario (tabla 3×3 y tarjetas), criadero (la cría del cap. 1 acompaña), Aula. Reutiliza perchas y Observar de `educativa.js`.

### Cap. 3 · Más allá de la bahía (`EP3_*`; prototipo `content/ep3`)
- **Cómo abre:** mañana en la casa nueva; el plano del bote lleva notas de todos («que no se vire», «amarre doble»); la luz de la niebla parpadeó sobre el agua, más allá de la bahía; el transmisor: «…del otro lado… ¿nos oyen?…». Vittata: «Pues vamos a contestar en persona». El plano de velas del cap. 1 se queda en la pared: lo primero es lo que flota (una canoa a remo, `[KELVIN]`, EP3 §10.3).
- **Cómo termina:** la canoa es «de las dos»; atracan en la comunidad de la otra orilla; Vittata pregunta antes de contar; intercambio (la casa que aguanta o la fibra del papá a cambio de una nasa). La Vecina enseña un plano para unir las dos orillas: «Ayudaría a todos… pero hay que cortar mucho bosque». Vittata, por primera vez, no dice «¡pa'lante!»: «Déjame pensarlo».
- **Qué sabe Vittata de las dos voces:** la Voz dice «**nos** oyen» (segunda pista de que son más de una). La otra comunidad también tiene transmisor y también oye «una voz»; lo que oyó cada una encaja como dos mitades: la Voz llama a todos y llega a pedazos (semilla de «Mensajes en pedazos», ep. 5). El Guardián, al oírlo, se toca la medalla.
- **Personajes:** Vittata, la navegante (nueva, placeholder `[KELVIN]`; por defecto vive en Villa Raíz), el papá y la abuela (M1 y la despedida), el Guardián (en el muelle), la Vecina y su comunidad (nuevos, `[KELVIN]`), Iguaca (se queda en Villa Raíz con la abuela y el huevo; hace la formativa al volver), el aprendiz y la cría del jugador (viajan en la canoa).
- **Lugares y sistemas:** poza de pruebas, astillero y muelle, postes con cintas de viento (del ep. 2), el río y la bahía (la canoa va sobre raíles: nadie se cae), la aldea de la otra orilla, Diario (tabla de flotación y código de señales), criadero, Aula. Reutiliza la canoa del kit de edificios.

### Cap. 4 · El precio del progreso (solo `EP4_GDD.md`; prototipo `content/ep4`)
- **Cómo abre:** la abuela quiere cruzar el río a ver a su familia (que quedó en la otra orilla cuando la Ruptura se llevó el paso, `[KELVIN]`). Vittata ya redibujó el plano de la Vecina como un puente «en el sitio más corto». Iguaca: «Antes de dibujarlo, mira lo que ya hay en la orilla».
- **Cómo termina:** la Balanza (3 opciones × 4 ejes, sin ganador), la maqueta y la asamblea; se construye lo acordado con su cuidado (replantar, cajas nido, paso de canoas o sendero a la sombra); la abuela cruza: «Mi familia me esperaba con café». Giro: el Guardián, en la orilla, «Antes también se cruzaba este río… pero no recuerdo cómo» (primera vez que se ve que **no recuerda**, no que calla). Gancho: el transmisor vuelve a hablar `[KELVIN]`, EP4 §10.7; propuesta: una frase corta sobre «lo que se construyó antes», y por primera vez se oye que son dos.
- **Qué sabe Vittata de las dos voces:** nada nuevo seguro; sí aprende que la memoria del Guardián tiene huecos, y que «antes» las dos orillas estaban unidas. Queda para el ep. 5 la pregunta: ¿quién construyó lo de antes?
- **Personajes:** Vittata, Iguaca, la abuela, el papá, la navegante (habla por el río y las canoas), la Vecina o alguien de la otra orilla `[KELVIN]`, el Guardián, el aprendiz. Las dos extintas **no** asoman todavía (EP4 §10.8, propuesta: se guardan).
- **Lugares y sistemas:** tres tramos del río (estrecho, remanso y río abajo), el bosquecillo con huecos de nido, la mesa de la orilla, Balanza y maqueta (nuevos, por datos), asamblea con `dialogo.js`, visor de peces de `rio_vivo.js`, kit de edificios (`puente_madera`, `muelle_troncos`, `canoa`), criadero, Aula.

### Cap. 5 · Las voces olvidadas (`EP5_*`; implementación G14)
- **Cómo abre:** noche en el taller; el transmisor, que desde el ep. 4 solo daba estática, se enciende solo: dos voces que se pisan. Vittata: «No. Esa voz es de ahora… y la otra también».
- **Cómo termina:** el relevo (luz, sonido o tela) cruza de torre en torre hasta la niebla; Vittata pide ayuda sin explicar antes su plan («¿Me ayudas a sostener esta?»); las dos voces responden enteras. Más allá de la niebla se encienden otras luces. «No los vas a poder juntar tú sola.» «No. Pero sí puedo ayudar a que se junten.»
- **Qué sabe Vittata de las dos voces (revelación):** que son **dos**; que en la última ruina hay dos cotorras dibujadas junto al 36; que el Guardián recuerda «Eran dos. Las de las islas del sur»; que, según las fichas de `content/comun/especies.js`, el loro de Martinica (*Amazona martinicana*) y la amazona de Guadalupe (*Amazona violacea*) existieron y hoy no existen (BirdLife/UICN, citadas allí; causas y fechas, por verificar y fuera del juego); y que las voces dicen «hablamos desde ahora, igual que ustedes» (pago de la pista del cap. 1). **No sabe por qué** hablan desde ahora: eso se guarda (propuesta: temporada 5). Piden: «Busquen a los que quedan».
- **Personajes:** Vittata, Iguaca (lleva el Diario y el «sé o supongo»), el Guardián (memoria incompleta), las dos voces (retrato neutro con dos ondas de color hasta que Kelvin decida), los ayudantes del relevo (abuela, papá, navegante, la Vecina, el aprendiz; `[KELVIN]`), la cría del jugador.
- **Lugares y sistemas:** taller y transmisor, las 8 ruinas ya colocadas en el mapa (`ruina_torre`, `ruina_mirador`, `ruina_pilar`, `ruina_portal`, `ruina_altar`), el mirador y la luz de la niebla con patrones, perchas y Observar, agarre, Diario, criadero (sin huevos de las extintas), Aula.

### Cap. 6 · El pacto de los 36 (`EP6_*`; implementación AL1)
- **Cómo abre:** amanecer en el mirador; la cadena de señales sigue encendida; Iguaca cuenta luces («once, doce»); una canoa asoma por el río y una silueta vuela bajo. Vittata: «Yo preparo el puente, la comida, los sitios…». Iguaca: «¿Tú sola?».
- **Cómo termina:** tarjetas «sabe hacer / necesita», plan repartido, mediación entre dos grupos, círculo de 36 asientos: los ocupados se encienden, los de quienes no llegaron quedan con luz tenue. El Guardián: «Lo recuerdo a pedazos. Mejor así: ahora lo recordamos entre todos». Vittata se sienta en un asiento cualquiera. De noche, ninguna luz nueva responde; «Las islas olvidadas no oyen el relevo». Vittata escribe «La tripulación». Fin de la temporada 1.
- **Qué sabe Vittata de las dos voces:** las voces acompañan desde el transmisor («Treinta y seis no es un número. Es una forma de sentarse», `[KELVIN]`). Si Kelvin lo aprueba, tienen dos asientos con luz tenue (no apagada: esperan). Sigue sin saberse el porqué de «desde ahora». Las islas olvidadas (temporada 2) son las que no oyen el relevo.
- **Personajes:** Vittata, Iguaca, el aprendiz, el Guardián, los visitantes (`[KELVIN]`, propuesta: 6 con tarjeta y voz), los dos grupos de la mediación, las dos voces, y los de casa: abuela, papá, navegante y la Vecina (reciben con Vittata; son el modelo de «sabe hacer / necesita»).
- **Lugares y sistemas:** muelles, puente o plaza del mapa, `ruina_altar` como posible «piedra del pacto», mirador y luz, relevo del ep. 5 encendido, agarre entre dos, tablero del plan con simulación determinista, Diario de tarjetas, criadero (la cría tiene asiento entre el público), cómic de cierre de temporada `[KELVIN]`.

## 3. El misterio de las dos voces, pista a pista

| Cap. | Lo que se oye o se ve | Lo que entiende Vittata |
|---|---|---|
| 1 | «Si alguien puede escucharme… el pacto… viene otra tormenta». Símbolo de 36. Luz que contesta tres veces | «Esa voz es de ahora» (pista confirmada). Alguien del pacto sigue despierto |
| 2 | «…Villa Raíz… ¿siguen ahí? …**tenemos**…» y una palabra desconocida. La medalla del Guardián | Saben nuestro nombre. (La pista del plural pasa sin comentario) |
| 3 | «…del otro lado… ¿**nos** oyen?…». La otra comunidad oye lo mismo; dos mitades que encajan | Llama a todos, no solo a Villa Raíz; llega a pedazos |
| 4 | El Guardián no recuerda cómo se cruzaba el río. (Propuesta) el transmisor: «lo que se construyó antes», dos voces por primera vez | El Guardián olvida; «antes» hubo algo que unía |
| 5 | Dos ondas de dos colores; dos cotorras y un 36 en la piedra; «Eran dos. Las de las islas del sur»; fichas de martinicana y violacea; «hablamos desde ahora, igual que ustedes» | **Quiénes son.** No por qué hablan desde ahora |
| 6 | «Treinta y seis es una forma de sentarse». Dos asientos con luz tenue | Su lugar en el pacto. El porqué queda para más adelante |

Reglas: la Voz solo se oye por el transmisor y se ve como luz en la niebla (nunca «en el aire»); nunca asusta ni se lamenta; las dos extintas no se consiguen ni se coleccionan.

## 4. Quién aparece dónde

| Personaje | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| Vittata | ● | ● | ● | ● | ● | ● |
| Iguaca | ● | ● | ● (se queda en Villa Raíz) | ● | ● | ● |
| El Guardián | ● | ● (una línea, medalla) | ● (muelle) | ● (no recuerda) | ● (memoria) | ● (recuerda entre todos) |
| El aprendiz y la cría | ● | ● | ● (en la canoa) | ● | ● (una estación) | ● (asiento) |
| La abuela | | ● | ● (M1, despedida) | ● (cruza) | ● (estación `[KELVIN]`) | ● (de casa) |
| El papá y el huevo | | ● (huevo al nido) | ● (M1; el huevo se queda) | ● | ● (`[KELVIN]` si el pichón ya nació) | ● (de casa) |
| La navegante | | | ● | ● (habla por el río) | ● (estación `[KELVIN]`) | ● (de casa) |
| La Vecina y su comunidad | | | ● | ● (`[KELVIN]`) | ● (`[KELVIN]`) | ● (de casa, dos grupos `[KELVIN]`) |
| La(s) Voz / las dos voces | ● (una) | ● (audio) | ● (audio) | (`[KELVIN]`) | ● (reveladas) | ● (acompañan) |
| Los visitantes del pacto | | | | | luces lejanas | ● |

Todos los personajes nuevos usan los renders oficiales de su especie (canon confirmado); nombre, especie y aspecto los decide Kelvin.

## 5. Incoherencias encontradas y corrección

| # | Dónde | Qué no cuadraba | Corrección (hecha en `EP*_NARRATIVA.md` o pedida) |
|---|---|---|---|
| 1 | `EP2_NARRATIVA` giro, `EP3` giro, `EP5` revelación, `EP5_GDD` §10.5 | La medalla del Guardián: el ep. 2 decía «la medalla del ep. 1» y la **colgaba en la puerta**; los eps. 3 y 5 hacen que «se toque la medalla» (la lleva encima). Además, en el cap. 1 jugable **no hay medalla** (`KELVIN-3` sigue abierto) | **Hecha:** en el ep. 2 la saca por primera vez, la mira junto a la puerta y la **vuelve a guardar**; se queda con él. El cap. 1 no se toca (la medalla sigue siendo propuesta). `EP5_GDD` §10.5 habla de «colgada en la puerta»: pedido de una línea cuando alguien edite el GDD |
| 2 | `EP3_NARRATIVA` final y `EP4_GDD` | El ep. 3 se llega a la otra comunidad **por mar**, más allá de la bahía (y el GDD propone «la Colina, junto a la laguna del sur»); el ep. 4 la pone **al otro lado del río**, a un puente de distancia. Y en el ep. 3 el plano lo propone la otra comunidad («déjame pensarlo»), mientras el ep. 4 abre con Vittata diciendo «¡Ya dibujé un puente!» | **Hecha (ep. 3):** la comunidad vive en la otra orilla del río, donde se abre a la bahía; desde la Ruptura no hay paso por tierra y por eso se llega bordeando en canoa. Vittata se lleva el plano de la Vecina y el ep. 4 arranca con ella redibujándolo como puente. **Pedido (ep. 4, cuando exista `EP4_NARRATIVA.md`):** el gancho debe nombrar el plano de la Vecina |
| 3 | `EP3_NARRATIVA` | Iguaca no aparecía en todo el episodio, pero el prototipo (`content/ep3`) la deja en Villa Raíz y hace la formativa al volver | **Hecha:** Iguaca se queda en Villa Raíz con la abuela y el huevo; se dice en personajes, en M1 y en la voz |
| 4 | `EP3_NARRATIVA` y `content/ep4` | La navegante «pescaba en la bahía» (de Villa Raíz), pero el ep. 4 la llama «quien navega **del otro lado**» | **Hecha (ep. 3):** por defecto es de Villa Raíz y en el ep. 4 habla por el río y las canoas, no por la otra comunidad (a la otra comunidad la representa la Vecina). `[KELVIN]`. Pedido para `content/ep4`: ajustar la línea de Iguaca |
| 5 | `EP5_NARRATIVA` gancho | «El transmisor, **olvidado** en su banco» y «las voces llevan **cinco** episodios llamando»: el transmisor se usó en los eps. 2 y 3 (giro y gancho) y estamos en el quinto | **Hecha:** «que desde el ep. 4 solo daba estática» y «llaman desde el día que se rompió el cielo» |
| 6 | `NARRATIVA_CAP1` giro frente a `EP5` | En el cap. 1 el Guardián «no lo dice todo» (calla por prudencia); en el ep. 5 «no recuerda». Las dos cosas se contradicen si no se explica | **Hecha (ep. 5):** se dice en el conflicto que lo que parecía prudencia eran huecos, y que el ep. 4 ya lo mostró («no recuerdo cómo»). El cap. 1 no cambia |
| 7 | `EP2_NARRATIVA` y `EP4_GDD`/`content/ep4` | La abuela «lo perdió todo en la Ruptura» y llega sola; en el ep. 4 tiene familia «del otro lado del río» que la espera con café | **Hecha (ep. 2):** su familia quedó en la otra orilla cuando la Ruptura se llevó el paso; por eso llegó sola a Villa Raíz. `[KELVIN]`. Así el ep. 4 tiene motivo desde el ep. 2 |
| 8 | `EP6_NARRATIVA` | Los de casa (abuela, papá, navegante, Vecina) desaparecían en el ep. 6 | **Hecha:** fila «Los de casa» en personajes; reciben con Vittata |
| 9 | `content/ep4/pack.js` líneas 81, 86 y 89 | Marcadores `[KELVIN: …]` **dentro del texto que lee el jugador** (regla de los packs: solo en `nota` o comentario; `ep2Test` lo comprueba) | **Pedido** para quien construye `content/ep4`: mover los tres marcadores a `nota` |
| 10 | `content/ep4/pack.js` línea 89 | El Guardián «oye otra voz **en el río**», sin transmisor. En todo el hilo la Voz solo se oye por el transmisor y se ve como luz | **Pedido** para `content/ep4`: que el Guardián recuerde (no que oiga), o que la frase venga del transmisor. Decisión en `EP4_GDD` §10.7 |
| 11 | `EP2_NARRATIVA` giro | La Voz dice «tenemos» y nadie lo nota; faltaba decir que es la primera pista del plural, para que el ep. 5 la pague | **Hecha:** una frase en el giro del ep. 2 y en el giro del ep. 3 («nos oyen»); pistas sin comentario de los personajes |
| 12 | `EP3_NARRATIVA` gancho y `KELVIN-7` | El plano del cap. 1 tiene casco, mástil y dos velas; el ep. 3 construye una canoa a remo sin decir qué pasó con las velas | **Hecha:** una frase: el plano de velas se queda en la pared; lo primero es lo que flota. Decisión en `EP3_GDD` §10.3 |
| 13 | `EP2_GDD` §10.6, `EP4_GDD` §10.8, `EP5_GDD` §10.8, `EP6_GDD` §10.9 | La misma pregunta («martinicana y violacea como consejeras, ¿cuándo?») repetida en cuatro documentos | **Unificada** abajo en una sola decisión (D7) |
| 14 | `EP2_GDD` §10.7, `EP3_GDD` §10.9 y silencio en 4–6 | El huevo del papá: nadie dice cuándo nace ni vuelve a mencionarse | **Unificada** en una decisión (D9) con una línea de tiempo propuesta |
| 15 | `content/ep2`, `ep3`, `ep4` frente a `EP5_GDD` y `EP6_GDD` | Los eps. 2–4 corren en mundos analíticos pequeños; los eps. 5 y 6 planean usar las ruinas, la plaza y los muelles del mapa de El Yunque (`mapa_cap1.js`) | No es contradicción de historia, pero sí de continuidad visual. **Pedido** al CTO: decidir si los eps. 5 y 6 van en el mapa grande o en mundo propio con las mismas piezas |

Nada de lo confirmado cambió. Los documentos `EP*_GDD.md` y `EP*_MISIONES.md` no se tocaron (no hizo falta en MISIONES; `EP4_GDD.md` lo está escribiendo otro carril).

## 6. Línea de tiempo (propuesta)

Día 0: la Ruptura y el refugio (cap. 1). Día 1 a 3: la casa y la tormenta (cap. 2). Día 4 a 6: la canoa, la práctica y la travesía (cap. 3). Semana 2: la orilla, la asamblea y la obra (cap. 4). Semana 3 o 4: el transmisor, las ruinas y el relevo (cap. 5); con 24–28 días de incubación (**por verificar** con DRNA/USFWS, `DECISION_LOG` 24-oct) el huevo del papá nacería alrededor del ep. 5. Semana 5: llegan los visitantes (cap. 6).

## Decisiones para Kelvin

Cada línea: **decisión · opción por defecto (la que usan los documentos si no dices nada) · alternativa**. Las letras D1… sirven para citarlas; entre paréntesis, de dónde vienen.

**Que cruzan toda la temporada**
- **D1 · Forma del Guardián** (KELVIN-1; EP2 §10.5; EP4 §10.6; EP5 §10.4; EP6 §10.6) · por defecto: cotorra mayor con el render de *imperialis* como sustituto · alternativa: humano u otra forma (pide arte nuevo).
- **D2 · Cómo se presentan las dos voces** (KELVIN-4; EP5 §10.1; EP6 §10.3) · por defecto: dos voces distintas, retrato neutro con dos ondas de color, sin verse · alternativa: una voz a coro, o se ven con el render de su especie.
- **D3 · Nombres de las dos extintas** (EP5 §10.3) · por defecto: sin nombre propio; se las llama «las de Martinica y Guadalupe» por su especie · alternativa: nombres propios inventados.
- **D4 · Por qué hablan «desde ahora»** (EP5 §10.2) · por defecto: no se explica en la temporada 1; se guarda para la temporada 5 · alternativa: una insinuación en el ep. 6.
- **D5 · La medalla del Guardián** (KELVIN-3; EP2 §10.5; EP5 §10.5) · por defecto: existe, es una pieza del emblema de 36; aparece en el ep. 2 y se explica en el ep. 5 · alternativa: no hay medalla (quitar las tres menciones).
- **D6 · Qué recuerda y qué olvidó el Guardián** (EP4 §10.6; EP5 §10.4) · por defecto: recuerda que eran 36 y que las torres hablaban de isla en isla; olvidó cómo se cruzaba el río y los nombres · alternativa: lo recuerda todo y calla por una razón (cambia el ep. 5).
- **D7 · Martinicana y violacea como consejeras** (EP2 §10.6; EP4 §10.8; EP5 §10.8; EP6 §10.9) · por defecto: empieza en la revelación del ep. 5 y se formaliza en el ep. 6 con dos asientos de luz tenue · alternativa: asoman ya en el ep. 2 (rompe la revelación).
- **D8 · Papel del aprendiz del jugador** (EP2 §10.10; EP3 §10.10; EP4 §10.10) · por defecto: acompaña y ocupa un puesto (rema, sostiene una estación, lleva la maqueta); no habla por nadie · alternativa: tiene líneas propias en las asambleas.
- **D9 · El huevo del papá** (EP2 §10.7; EP3 §10.9) · por defecto: es del papá (no del criadero); se queda en la casa en el ep. 3; nace alrededor del ep. 5 y el pichón tiene asiento en el ep. 6 · alternativa: nace en el ep. 2 o no vuelve a mencionarse.
- **D10 · La luz de la niebla, quién la enciende** (KELVIN-8; EP3 §10.5; EP5 §10.7) · por defecto: las dos voces, desde más allá de la niebla; en el ep. 5 otras luces (los visitantes) responden · alternativa: es la otra comunidad del ep. 3.
- **D11 · Continuidad entre partidas** (EP2 §10.9; EP4 §10.9) · por defecto: cada capítulo arranca igual para todos y solo importa lo elegido para las frases, nunca para el desenlace · alternativa: lo elegido (río o colina, puente o muelles) queda en el mapa de los capítulos siguientes.

**Cap. 1**
- **D12 · Familia de Iguaca** (KELVIN-5) · por defecto: no se ve; Iguaca habla por ella · alternativa: diseñar dos o tres personajes y la escena de entrar al refugio.
- **D13 · Máquina, transmisor y bote definitivos** (KELVIN-6, KELVIN-7) · por defecto: dibujos genéricos; el bote del plano es con velas y el primero que se construye es una canoa a remo · alternativa: modelos propios en Blender.
- **D14 · Orden de llegada del Guardián** (KELVIN-2) · por defecto: llega tras la crecida, como hoy en el juego · alternativa: antes de construir, como en el guion (p. 7–8).

**Cap. 2**
- **D15 · Los dos residentes** (EP2 §10.1) · por defecto: una abuela que vuela poco y un papá con un huevo, de dos especies de los 36 que Kelvin elija · alternativa: otros dos vecinos.
- **D16 · Dónde está el hogar y de quién es** (EP2 §10.2 y §10.3) · por defecto: en Villa Raíz, en uno de tres sitios, y es comunitario (abuela y papá viven ahí) · alternativa: es de Vittata o de Iguaca.
- **D17 · Qué dice la Voz en el ep. 2 y la palabra nueva** (EP2 §10.4) · por defecto: «Villa Raíz… ¿siguen ahí?… tenemos…» y el nombre de una isla del sur · alternativa: no habla en el ep. 2.
- **D18 · Fiesta de techado y la décima de la abuela** (EP2 §10.8) · por defecto: se usan, con la costumbre **por verificar** y una décima original · alternativa: fiesta sin nombre y sin décima.

**Cap. 3**
- **D19 · La navegante** (EP3 §10.1; EP4 §10.5) · por defecto: de Villa Raíz, pescaba en la bahía antes de la Ruptura; especie y nombre de Kelvin · alternativa: es de la otra comunidad.
- **D20 · La otra comunidad** (EP3 §10.2; EP4 §10.1) · por defecto: en la otra orilla del río, donde se abre a la bahía; sin nombre todavía; la representa la Vecina · alternativa: la aldea de la Colina del sur (entonces el ep. 4 necesita otro proyecto).
- **D21 · Nombre de la canoa** (EP3 §10.3) · por defecto: sin nombre · alternativa: lo elige el jugador de una lista.
- **D22 · El Guardián y el mar** (EP3 §10.6) · por defecto: despide desde el muelle y se queda · alternativa: va en la canoa.
- **D23 · Qué se intercambia** (EP3 §10.7) · por defecto: la casa que aguanta o la fibra del papá a cambio de una nasa (canoa y nasa taínas, **por verificar**) · alternativa: otro saber.
- **D24 · Símbolo de 36 en la otra comunidad** (EP3 §10.9) · por defecto: sí, y su mitad del mensaje encaja con la de Villa Raíz · alternativa: no lo tienen.

**Cap. 4**
- **D25 · El proyecto** (EP3 §10.8; EP4 §10.2) · por defecto: unir las dos orillas; tres opciones (puente en el estrecho, puente alto, muelles y canoas) · alternativa: camino, represa pequeña o muelle grande.
- **D26 · Quién decide** (EP4 §10.3) · por defecto: asamblea de todos, por consenso, sin voto · alternativa: Vittata con consejo, o el jugador solo.
- **D27 · El bosquecillo** (EP4 §10.4) · por defecto: tiene huecos de nido de aves de la orilla, de ninguno de los 36 con nombre · alternativa: nido de uno de los 36.
- **D28 · La Voz en el ep. 4** (EP4 §10.7) · por defecto: una frase corta por el transmisor sobre «lo que se construyó antes», en la que por primera vez se oyen dos · alternativa: la Voz calla en el ep. 4.

**Cap. 5**
- **D29 · Las ruinas** (EP5 §10.6) · por defecto: torres del sistema de comunicación de antes de la Ruptura, hechas por los guardianes · alternativa: de la gente de antes, sin relación con el pacto.
- **D30 · Quién atiende el relevo** (EP5 §10.9) · por defecto: abuela, papá, navegante, Vecina y el aprendiz · alternativa: solo Iguaca y el aprendiz.
- **D31 · Qué piden las voces al final** (EP5 §10.10) · por defecto: «Busquen a los que quedan» (gancho al ep. 6) · alternativa: piden otra cosa (cambia el ep. 6).

**Cap. 6**
- **D32 · Quiénes llegan** (EP6 §10.1) · por defecto: 6 visitantes con tarjeta y voz, de especies vivas de los 36, más luces lejanas · alternativa: más o menos visitantes.
- **D33 · Qué es el pacto y si tiene texto** (EP6 §10.2) · por defecto: una promesa de tres partes («nos conocemos, nos ayudamos y nos seguimos buscando»), sin objeto · alternativa: un objeto (el emblema completo) o sin texto.
- **D34 · Dónde es el encuentro** (EP6 §10.4) · por defecto: la plaza de Villa Raíz · alternativa: el mirador o la ruina del altar.
- **D35 · Los dos grupos de la mediación** (EP6 §10.5) · por defecto: de dos islas distintas, discuten dónde reunirse y cuándo volver · alternativa: otro desacuerdo (siempre sin culpable).
- **D36 · El título de Vittata** (EP6 §10.7) · por defecto: sin cargo; el cambio es solo suyo · alternativa: la nombran de alguna forma.
- **D37 · Asientos vacíos y gancho a la temporada 2** (EP6 §10.8) · por defecto: quedan vacíos los de las islas olvidadas, que no oyen el relevo; Vittata escribe «La tripulación» · alternativa: otro gancho.
- **D38 · Ropa de recompensa y música del final** (EP6 §10.10) · por defecto: `pava` y la pista de exploración de la banda sonora · alternativa: `mano_maracas` u otra pieza; música de Puerto Rico concreta (con derechos).
- **D39 · Cómic de cierre de temporada** (EP6 §10.11) · por defecto: sí, en el ep. 6, con las viñetas reales de los capítulos jugados · alternativa: se deja para la temporada 6.

Total: **39 decisiones**. Si Kelvin no dice nada, el equipo produce con la opción por defecto y lo marca en el texto.

**Resueltas por el equipo (AP10/BM48, 30-oct, lote 1: )** · [DECIDIDO-EQUIPO · pendiente de revisión de Kelvin]; detalle en `docs/DECISION_LOG.md`. Ya no son preguntas abiertas para Kelvin (salvo D1 y D13, que son de arte y siguen suyas).

**Resueltas por el equipo (AP10/BM48, 30-oct, lote 2: D1 a D10)** · [DECIDIDO-EQUIPO · pendiente de revisión de Kelvin]; detalle en `docs/DECISION_LOG.md`. Ya no son preguntas abiertas para Kelvin (salvo D1 y D13, que son de arte y siguen suyas).
