# V18.1 · Matriz de los 36 poderes (propuesta para Kelvin)

**Estado: propuesta, pendiente de aprobación de Kelvin.** Viene de la respuesta 13 del 5-nov (`docs/DECISION_LOG.md`): un poder por especie, sobre 4 familias técnicas (PICO, OJOS, PLUMAS, ALAS), y primero 2 poderes balanceados. Esos 2 ya están hechos: el **Grito del Yunque** de Vittata y el **Escudo de plumas** de *arausiaca*. Antes la tenía KIMI-065; desde la ronda 2 la hace la otra cuenta.

**Reglas:**
- **Los poderes son de fantasía.** El nombre y el estilo se inspiran en la isla o la región de cada especie, pero el poder no es un dato del animal. Lo educativo sigue en el catálogo verificado (`content/comun/especies.js`).
- **Cada poder cambia cómo se juega,** en el duelo y explorando («que se jueguen diferente»). Ninguno es solo un color nuevo.
- **Nada nuevo de arte para empezar.** Cada poder se arma con piezas que ya existen:
  - del motor de habilidades (`src/game/v18/habilidades.js`): `onda`, `escudo`, `lanzar`, `golpear` y `despues`;
  - de los dones de familia (`src/game/dones.js`): llamada, ojo, ráfaga, columna, rasante y hojas;
  - de `fx.js`: feathers, leaves, stars y gold;
  - y de `fx_poderes.js`: los anillos y las plumas de luz.
- **Grupos:** las 6 familias de `dones.js` (Isleñas, Montañeras, Del norte, Cordilleranas, Del gran río y Del bosque del sur), con 6 especies cada una: 34 vivas y las 2 extintas (martinicana y violacea, que Kelvin quiere como consejeras, H4).
- **Balance de partida:** 100 de energía, con recarga de 12 por segundo, como el motor actual. Los poderes cuestan de 30 a 50 y esperan de 6 a 12 s. Ninguno da invulnerabilidad ni gana solo.

**Coste técnico:**
- **B (bajo):** cambia parámetros de algo que ya existe.
- **M (medio):** combina dos efectos que ya existen.
- **A (alto):** necesita lógica nueva en combate o en física.

## Las 4 familias técnicas

| Técnica | Idea | Contra qué va bien | Contra qué va mal |
|---|---|---|---|
| **PICO** | Sonido y proyectiles: ondas, gritos, semillas especiales | Rivales quietas o que cargan un poder (interrumpe) | Escudos; rivales rápidas que esquivan |
| **OJOS** | Ver y anticipar: marcar, ralentizar el tiempo y descubrir cosas escondidas | Rivales que se esconden o fintan | Golpes cuerpo a cuerpo seguidos |
| **PLUMAS** | Defender y devolver: escudos, plumas que paran golpes o se pegan | Proyectiles y gritos | Rivales que esperan a que se acabe |
| **ALAS** | Moverse: embestidas, remolinos, subir y bajar en el aire | Rivales lentas; espacios abiertos | Espacios cerrados; quedan cansadas si fallan |

## La matriz

| # | Especie | Grupo | Técnica | Poder (nombre provisional) | En el duelo | Explorando | Ventaja / Debilidad | Espera | Reutiliza | Coste |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Cotorra puertorriqueña (*vittata*) | Isleñas | PICO | **Grito del Yunque** ✅ hecho | Ondas hacia delante que empujan e interrumpen; hay que apuntar | Asusta a la Sombra de Tormenta (KIMI-064) | Corta poderes / no atraviesa el escudo entero | 8 s | `onda`, anillos | — |
| 2 | Cotorra de La Española (*ventralis*) | Isleñas | PICO | Eco de la Cordillera | Grito corto que rebota una vez en la rival y vuelve como segunda onda más débil | Revela un secreto cercano con el eco | Dos golpes en uno / corto alcance | 9 s | `onda` + `despues` | B |
| 3 | Loro cubano (*leucocephala*) | Isleñas | PLUMAS | Capa de palma | Escudo frontal: para una semilla y la devuelve | Planea sin perder altura 5 s | Castiga a quien dispara / no para golpes por detrás | 10 s | `escudo` + `lanzar` | M |
| 4 | Amazona de pico negro (*agilis*) | Isleñas | ALAS | Quiebro | Esquiva rápida a un lado que deja una pluma señuelo; la IA ataca al señuelo | Esquiva ramas en el vuelo rasante | La más ágil / no hace daño por sí sola | 6 s | impulso + `fx` feathers | B |
| 5 | Amazona de pico amarillo (*collaria*) | Isleñas | OJOS | Ojo de sol | Marca a la rival 4 s: tus semillas la persiguen un poco | Marca en el minimapa la cotorra o el objeto más cercano | Puntería / sin daño extra | 9 s | don «ojo» + `lanzar` | M |
| 6 | Cotorra cabeciamarilla (*barbadensis*) | Isleñas | PICO | Lluvia de semillas | Tres semillas en abanico | Tumba tres frutas a la vez | Abarca espacio / cada semilla empuja poco | 8 s | `lanzar` ×3 | B |
| 7 | Amazona gorgirroja (*arausiaca*) | Montañeras | PLUMAS | **Escudo de plumas** ✅ hecho | Para un golpe; el grito lo reduce sin anularlo | Aguanta un golpe de la amenaza | Defensa / poco tiempo | 10 s | `escudo`, plumas de luz | — |
| 8 | Loro imperial (*imperialis*) | Montañeras | ALAS | Columna de nube | Sube en vertical y cae en picada: si cae encima, marea más | Sube muy alto sin corriente (don «columna») | Ataque desde arriba / lenta en subir | 11 s | don «columna» + `golpear` | M |
| 9 | Loro de San Vicente (*guildingii*) | Montañeras | PLUMAS | Abanico de colores | Abre la cola: la rival queda deslumbrada 1 s y falla su siguiente tiro | Asusta a la Maraña: un nudo se suelta solo | Corta combos / no empuja | 9 s | `fx` stars + estado | B |
| 10 | Loro de Santa Lucía (*versicolor*) | Montañeras | OJOS | Mirada del Pitón | Ralentiza la semilla y el grito de la rival 3 s | Ve los rastros de la Maraña de lejos | Defensa contra proyectiles / nada contra golpes | 10 s | don «ojo» + tiempo | M |
| 11 | Loro de Martinica (*martinicana*, extinta) | Montañeras | OJOS | Recuerdo | Muestra 1 s antes por dónde atacará la rival (sombra azul) | Muestra un camino olvidado (pista de consejera) | Leer a la rival / tienes que reaccionar tú | 10 s | `fx` + IA expuesta | M |
| 12 | Amazona de Guadalupe (*violacea*, extinta) | Montañeras | PLUMAS | Plumas de ceniza | Nube que te esconde 2 s: la IA pierde de vista dónde estás | Pasa sin que te vea la amenaza | Escapar / no ataca | 11 s | niebla de `clima.js` + `fx` | M |
| 13 | Loro corona lila (*finschi*) | Del norte | ALAS | Ráfaga | Dos impulsos seguidos (don «ráfaga»); el segundo empuja si toca | Cruza rápido de copa en copa | Velocidad / se cansa: cuesta más energía | 7 s | don «ráfaga» | B |
| 14 | Loro cabeza amarilla (*oratrix*) | Del norte | PICO | Imitación | Copia el último poder que usó la rival, a media fuerza | Repite el canto de una cotorra y la atrae | Versátil / depende de la rival | 12 s | registro de poderes | A |
| 15 | *tresmariae* | Del norte | ALAS | Viento de islas | Empuja a la rival hacia el borde de la explanada sin daño | Corriente propia corta para planear | Control del espacio / sin daño | 9 s | `onda` ancha sin daño | B |
| 16 | Loro tamaulipeco (*viridigenalis*) | Del norte | PICO | Chillido de bandada | Grito que llega lejos pero empuja poco | Llama a la bandada (don «llamada») | Alcance / poca fuerza | 8 s | `onda` larga | B |
| 17 | Loro yucateco (*xantholora*) | Del norte | OJOS | Ojo del cenote | Ve a través de la niebla y marca la sombra de la rival escondida | Encuentra agua o secretos bajo tierra | Contra la #12 y la #36 / nada contra la #6 | 9 s | don «ojo» | B |
| 18 | Loro frente blanca (*albifrons*) | Del norte | PLUMAS | Pluma rebote | La siguiente semilla que te dé vuelve a la rival | Las ramas no te frenan 5 s | Castiga / solo un rebote | 10 s | `escudo` + `lanzar` | M |
| 19 | Loro de nuca amarilla (*auropalliata*) | Cordilleranas | PICO | Voz de volcán | Grito que tarda 1 s en cargar y empuja mucho | Mueve una piedra que tapa un paso | Mucho empuje / se ve venir | 11 s | `onda` + carga | B |
| 20 | *guatemalae* | Cordilleranas | OJOS | Vista de cumbre | Ves a la rival en el minimapa del duelo y tus golpes de ala alcanzan un poco más | Ve desde la cumbre (don «ojo») | Precisión / poca defensa | 9 s | don «ojo» | B |
| 21 | Loro de cachetes amarillos (*autumnalis*) | Cordilleranas | ALAS | Remolino | Gira en el sitio: aparta semillas y empuja a quien esté pegada | Levanta hojas y destapa objetos | Defensa activa / quieta mientras gira | 9 s | `fx` leaves + `onda` en círculo | M |
| 22 | Loro de lores rojas (*lilacina*) | Cordilleranas | PLUMAS | Plumas de manglar | Siembra tres plumas en el suelo: la rival que las pisa va más lenta | Marca un camino de vuelta | Trampas / hay que preparar | 10 s | `lanzar` quieto + estado | M |
| 23 | Loro mercenario (*mercenarius*) | Cordilleranas | ALAS | Vuelo de niebla | Atraviesa a la rival sin chocar y le quita una pluma al pasar | Cruza la neblina sin perderse | Sorpresa / si falla queda detrás y cansada | 10 s | impulso + `golpear` | M |
| 24 | Loro diadema (*diadema*) | Del gran río | PICO | Semilla de río | Semilla lenta que bota en el suelo dos veces | Sirve para el Sapo Encantado (bota hasta su boca) | Difícil de esquivar / lenta | 8 s | `lanzar` con rebote | M |
| 25 | *kawalli* | Del gran río | OJOS | Ojo de selva | Durante 4 s, la rival se ve en dorado aunque esté detrás de algo | Ve frutas y objetos escondidos en la copa | Seguir a la rival / sin daño | 9 s | `fx` gold + contorno | M |
| 26 | Loro de lomo rojo (*festiva*) | Del gran río | ALAS | A ras del agua | Vuelo rasante muy rápido en línea recta; si choca, empuja | Vuela a ras del río (don «rasante») | Velocidad / solo en línea recta | 8 s | don «rasante» | B |
| 27 | Loro de cachetes azules (*dufresniana*) | Del gran río | PLUMAS | Gota de lluvia | Escudo pequeño que dura más pero para menos | Te seca y no te frena la lluvia | Constante / débil | 9 s | `escudo` largo | B |
| 28 | Loro real amazónico (*ochrocephala*) | Del gran río | PICO | Canto real | Grito que también te devuelve 20 de energía si acierta | Despierta a las cotorras dormidas | Ritmo / poca fuerza | 10 s | `onda` + energía | B |
| 29 | Loro corona azul (*farinosa*) | Del gran río | ALAS | Ala fuerte | Golpe de ala cargado: más empuje y mareo | Rompe ramas secas que tapan un paso | Mucho daño / hay que estar cerca | 9 s | `golpear` cargado | B |
| 30 | Loro guaro (*amazonica*) | Del gran río | OJOS | Ojo de bandada | Ves la energía de la rival y avisa cuando va a usar su poder | Ve cuántas cotorras hay en la zona | Información / sin daño | 8 s | HUD + `fx` | B |
| 31 | Loro de cejas rojas (*rhodocorytha*) | Del bosque del sur | PLUMAS | Hojas que envuelven | Te envuelven hojas 3 s: el siguiente golpe solo marea, no quita pluma | Las hojas te esconden (don «hojas») | Aguantar / no ataca | 10 s | don «plumas» + `escudo` | M |
| 32 | Loro vináceo (*vinacea*) | Del bosque del sur | PICO | Semilla de piña | Semilla grande que, al caer, suelta tres pequeñas | Abre una piña o una fruta grande | Área / lenta de lanzar | 10 s | `lanzar` + `despues` | M |
| 33 | Papagayo de cara roja (*brasiliensis*) | Del bosque del sur | OJOS | Ojo de manglar | Durante 3 s, ves la semilla de la rival más lenta y grande | Ve animales escondidos en el manglar | Esquivar / no sirve contra golpes | 9 s | estado + tiempo | B |
| 34 | Loro de anteojos rojos (*pretrei*) | Del bosque del sur | ALAS | Vuelta de pino | Vuelta en el aire hacia atrás: esquiva y queda mirando a la rival | Gira en seco sin perder velocidad | Esquiva más ataque / poco tiempo | 7 s | impulso + giro | M |
| 35 | Loro alisero (*tucumana*) | Del bosque del sur | PLUMAS | Plumas de aliso | Plumas que se pegan a la rival: pierde algo de energía 3 s | Las ramas sueltan semillas al pasar | Agotar a la rival / lenta | 10 s | `lanzar` + estado | M |
| 36 | Loro hablador (*aestiva*) | Del bosque del sur | PICO | Cuento | Habla sin parar: la IA se distrae 1,5 s y no ataca | Habla con los vecinos y saca una pista | Gana tiempo / no hace daño | 11 s | `fx` + IA | B |

## Resumen y orden propuesto

- **Reparto:** 10 PICO, 8 OJOS, 9 PLUMAS y 9 ALAS. Cada grupo tiene al menos 3 de las 4 técnicas. Hay 17 de coste B, 16 de coste M y 1 de coste A (la #14, Imitación). Las #1 y #7 ya están hechas.
- **Siguientes 4, los más baratos y distintos de los que ya hay:** #4 Quiebro (ALAS), #6 Lluvia de semillas (PICO), #17 Ojo del cenote (OJOS) y #29 Ala fuerte (ALAS). Con esto hay una especie de cada técnica para probar el balance.
- **Lo que necesita el motor, una vez para todos los poderes:**
  - estados sobre la rival (lenta, deslumbrada, marcada, distraída), dentro de `golpear` y `paso`;
  - un rebote para `lanzar`;
  - avisos de la IA (`pensar` expuesto).
  
  Eso es de combate.js (frente A) y no es de render: no toca la parte de Kimi.

## Lo que Kelvin tiene que decidir

1. ¿Apruebas la matriz como base, con los nombres provisionales?
2. ¿Te parecen bien los 4 siguientes (#4, #6, #17 y #29)?
3. ¿Las extintas (#11 y #12) tienen poderes que se juegan, o solo salen como consejeras (H4)?
4. ¿Algún nombre debe llevar un lugar real distinto? Hoy usan Yunque, Cordillera, Pitón y cenote.
