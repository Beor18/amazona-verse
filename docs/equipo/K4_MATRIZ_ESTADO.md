# K4-09 · Los 36 poderes frente al código (6-nov)

Solo lectura. Compara `docs/equipo/V18_MATRIZ_36.md` (propuesta, pendiente de Kelvin) con `src/game/v18/habilidades.js`, `nuevas.js`, `evolucion.js`, `combate.js`, `duelo2.js` y `amenaza.js` en `origin/main` del 6-nov. Las pruebas son de navegador (`AV.v18NuevasTest()`, `AV.v18CombateTest()`, `AV.v18AmenazaTest()`); aquí no se ejecutaron porque la nube no tiene GPU. Lo que se dice de ellas sale de leer sus `check(...)`.

## Resumen

- **10 de 36 poderes funcionan en el duelo contra la IA**, con prueba propia: #1, #4, #5, #6, #7, #9, #10, #17, #24 y #29. Todos están en `habilidades.js`; `nuevas.js` solo dice cómo se consigue cada especie y tiene la prueba.
- **Faltan 26:** 12 de coste B, 13 de coste M y 1 de coste A (#14 Imitación).
- **Se consiguen así:** Vittata se tiene desde el inicio. Arausiaca se descubre en su árbol y se desbloquea con su reto de 4 perchas (`descubrir.js`, `ciclo.js`). Las otras 8 llegan con hitos de `nuevas.js` (tabla abajo).
- **Extra que no está en la matriz:** la alianza **Eco Protector** (Vittata + arausiaca, `evolucion.js:205`). Se activa con Vittata en nivel 10 y arausiaca en la bandada.
- **La parte de explorar solo existe para #1 y #7.** El Grito asusta a la Sombra de Tormenta y el Escudo aguanta su ráfaga (`amenaza.js`). Las 8 nuevas usan el Grito contra la Sombra (`amenaza.js:91`, comprobado en `amenaza.js:417`). Su columna «Explorando» de la matriz todavía no se juega.

## Tabla

Estado: **hecho** = registrado en `habilidades.js` y probado en el duelo. **falta** = no hay código. En «Prueba», N = `AV.v18NuevasTest()` (`nuevas.js`), C = `AV.v18CombateTest()` (`combate.js`) y A = `AV.v18AmenazaTest()` (`amenaza.js`).

| # | Especie | Técnica | Poder | Coste | Estado | Prueba | Cómo se consigue | Notas frente a la matriz |
|---|---|---|---|---|---|---|---|---|
| 1 | *vittata* | PICO | Grito del Yunque | — | **hecho** | C, A | Desde el inicio | Espera de 5 s en el código; la matriz dice 8 s. Tiene etapas V18.2 (`evolucion.js`). |
| 2 | *ventralis* | PICO | Eco de la Cordillera | B | falta | — | Sale como rival de la IA si juegas una Montañera (`combate.js:168`), pero con el Grito heredado | |
| 3 | *leucocephala* | PLUMAS | Capa de palma | M | falta | — | — | |
| 4 | *agilis* | ALAS | Quiebro | B | **hecho** | N | Ganar el primer duelo | Falta la **pluma señuelo** que ataca la IA. Espera de 4 s (matriz: 6 s). |
| 5 | *collaria* | OJOS | Ojo de sol | M | **hecho** | N | Ganar 3 duelos en total | Marca 5 s y las semillas la siguen a media fuerza. |
| 6 | *barbadensis* | PICO | Lluvia de semillas | B | **hecho** | N | Dispersar la Sombra de Tormenta | Espera de 6 s (matriz: 8 s). |
| 7 | *arausiaca* | PLUMAS | Escudo de plumas | — | **hecho** | C, A | Descubrirla y pasar su reto (`descubrir.js`) | Espera de 7 s (matriz: 10 s). |
| 8 | *imperialis* | ALAS | Columna de nube | M | falta | — | — | |
| 9 | *guildingii* | PLUMAS | Abanico de colores | B | **hecho** | N | Deshacer la Serpiente de la Maraña | |
| 10 | *versicolor* | OJOS | Mirada del Pitón | M | **hecho** | N | Primera medalla de oro del minigolf | En el duelo de 2 solo frena el grito; las semillas no (ver abajo). |
| 11 | *martinicana* (extinta) | OJOS | Recuerdo | M | falta | — | No se puede elegir: es consejera (Mara) | Kelvin aún no decide si tendrá poder (pregunta 3 de la matriz). |
| 12 | *violacea* (extinta) | PLUMAS | Plumas de ceniza | M | falta | — | No se puede elegir: es consejera (Vela) | Ídem. |
| 13 | *finschi* | ALAS | Ráfaga | B | falta | — | — | |
| 14 | *oratrix* | PICO | Imitación | A | falta | — | — | |
| 15 | *tresmariae* | ALAS | Viento de islas | B | falta | — | — | |
| 16 | *viridigenalis* | PICO | Chillido de bandada | B | falta | — | — | |
| 17 | *xantholora* | OJOS | Ojo del cenote | B | **hecho** | N | Ganar un duelo con otra cotorra que no sea Vittata | **Distinto de la matriz.** El código marca 4 s y las semillas la siguen, que es la idea de la #5. La matriz pedía ver a través de la niebla y la sombra escondida. |
| 18 | *albifrons* | PLUMAS | Pluma rebote | M | falta | — | — | |
| 19 | *auropalliata* | PICO | Voz de volcán | B | falta | — | — | |
| 20 | *guatemalae* | OJOS | Vista de cumbre | B | falta | — | — | Necesita HUD en `combate.js` |
| 21 | *autumnalis* | ALAS | Remolino | M | falta | — | — | Ya existe `desviar` (Eco Dirigido), que se puede reutilizar |
| 22 | *lilacina* | PLUMAS | Plumas de manglar | M | falta | — | — | |
| 23 | *mercenarius* | ALAS | Vuelo de niebla | M | falta | — | — | |
| 24 | *diadema* | PICO | Semilla de río | M | **hecho** | N | Despertar al Sapo Encantado | En el duelo de 2 no bota (ver abajo). |
| 25 | *kawalli* | OJOS | Ojo de selva | M | falta | — | — | |
| 26 | *festiva* | ALAS | A ras del agua | B | falta | — | — | Hay que detectar el choque mientras se mueve |
| 27 | *dufresniana* | PLUMAS | Gota de lluvia | B | falta | — | — | |
| 28 | *ochrocephala* | PICO | Canto real | B | falta | — | — | |
| 29 | *farinosa* | ALAS | Ala fuerte | B | **hecho** | N | Reparar el puente colgante | Además rompe el Escudo de plumas (`rompeEscudo`), cosa que la matriz no decía. Espera de 7 s (matriz: 9 s). |
| 30 | *amazonica* | OJOS | Ojo de bandada | B | falta | — | — | Necesita HUD en `combate.js` |
| 31 | *rhodocorytha* | PLUMAS | Hojas que envuelven | M | falta | — | — | |
| 32 | *vinacea* | PICO | Semilla de piña | M | falta | — | — | |
| 33 | *brasiliensis* | OJOS | Ojo de manglar | B | falta | — | — | |
| 34 | *pretrei* | ALAS | Vuelta de pino | M | falta | — | — | |
| 35 | *tucumana* | PLUMAS | Plumas de aliso | M | falta | — | — | |
| 36 | *aestiva* | PICO | Cuento | B | falta | — | — | Necesita IA; en el duelo de 2 no hay IA a la que distraer |

**Por técnica, hechos y total:** PICO 3 de 10 · OJOS 3 de 8 · PLUMAS 2 de 9 · ALAS 2 de 9.

**Por grupo:** Isleñas 4 de 6 · Montañeras 3 de 6 · Del norte 1 de 6 · Del gran río 2 de 6 · Cordilleranas 0 de 6 · Del bosque del sur 0 de 6.

## Lo que encontré al leer el código (sin tocarlo)

1. **El duelo de 2 jugadores (`duelo2.js`) no aplica 3 efectos que `combate.js` sí aplica:**
   - **Mirada del Pitón** no frena las semillas: `combate.js:646` las frena y `duelo2.js` no lee `lenta`.
   - **Semilla de río** no sale en arco ni bota: `combate.js:650-653` lo hace y `duelo2.js` no lee `arco` ni `botes`.
   - **Ojo de sol** sigue a la rival con la fuerza del Ojo del cenote: `duelo2.js:429` no usa `marcaK`.

   Ninguna prueba cubre estos poderes en el duelo de 2. Propuesta: copiar esas 3 líneas de `combate.js` en el movimiento de semillas de `duelo2.js` y añadir un `check` por poder.
2. **Las esperas del código son más cortas que las de la matriz** en #1, #4, #6, #7 y #29 (de 2 a 3 s menos). Seguramente es balance hecho a propósito, pero hay que poner la matriz al día o anotarlo.
3. **Herencia por familia:** una especie sin poder propio hereda el de su familia (Isleñas: Grito; Montañeras: Escudo; las demás, Grito) por `poderDe` en `habilidades.js`. Hoy no se nota, porque solo se pueden elegir las 10 que tienen poder.

## Orden propuesto para los siguientes 6 (por coste)

Todos son de coste B, salen de piezas que ya existen y cubren las 4 técnicas. También llevan poderes a los 2 grupos que aún no tienen ninguno (Cordilleranas y Del bosque del sur).

| Orden | # | Poder (especie, grupo) | Técnica | Por qué ahora | Piezas |
|---|---|---|---|---|---|
| 1 | 27 | Gota de lluvia (*dufresniana*, Del gran río) | PLUMAS | Es solo otros números del Escudo de plumas (dura más, para menos) | `escudo` + `recibir` con su propia reducción |
| 2 | 16 | Chillido de bandada (*viridigenalis*, Del norte) | PICO | Otros números del Grito: más alcance y menos empuje | `onda` + `golpear` (como `grito_yunque`) |
| 3 | 13 | Ráfaga (*finschi*, Del norte) | ALAS | Dos impulsos con `despues`; se apoya en el código del Quiebro | `kb` ×2 + `despues` + `golpear` al tocar |
| 4 | 33 | Ojo de manglar (*brasiliensis*, Del bosque del sur) | OJOS | Reutiliza el estado `lenta` de la Mirada del Pitón, pero solo para las semillas y con la semilla más grande | `lenta` + escala de la bala |
| 5 | 19 | Voz de volcán (*auropalliata*, Cordilleranas) | PICO | Grito con 1 s de carga: se ve venir y la rival puede responder | `onda` + `despues(1)` + `golpear` |
| 6 | 15 | Viento de islas (*tresmariae*, Del norte) | ALAS | Control del espacio sin daño; es el primer poder que empuja hacia el borde | `onda` ancha + `golpear` con 0 plumas |

**Después, también de coste B:** #2, #26 y #28. Los #20, #30 y #36 son B en la matriz, pero necesitan HUD o exponer la IA en `combate.js`, así que en la práctica cuestan más.

**Para implementarlos hay que tener en cuenta:**
- `habilidades.js` y `combate.js` están **ocupados** por otra sesión (`TAREAS_KIMI_NUBE.md`, Reglas): hay que esperar a que se liberen.
- Cada especie nueva necesita **un hito para conseguirla** en `nuevas.js`. Qué hito es (qué hace el jugador para ganarse cada cotorra) es una **decisión de Kelvin**; aquí no se propone ninguno.
- La matriz sigue siendo una **propuesta pendiente de aprobación** (sus 4 preguntas a Kelvin siguen abiertas).
