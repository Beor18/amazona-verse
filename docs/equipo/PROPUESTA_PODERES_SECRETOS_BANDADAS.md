# PROPUESTA · Dones de las 36 cotorras, secretos por capítulo y Bandadas

Propuesta para que Kelvin decida, 2-nov-2026. **No hay nada implementado.** No se tocó código ni se hizo ningún build. Todo lo
que se cita (archivos, funciones, constantes y coordenadas) se leyó del repo en esta fecha. Las decisiones de canon, arte,
dinero y legal van marcadas **[KELVIN]**.

Reglas que se respetan en todo el documento:
- Diversión primero.
- Vittata no cambia: ni el modelo ni el rig. Los efectos son partículas, sonido, cámara y multiplicadores de física.
- Sin anillos, sin cajas de botín, sin azar en lo que se gana y sin presión de compra.
- Sin violencia, sin chat ni texto libre, y COPPA siempre presente.
- Los datos reales llevan fuente. Lo que es fantasía se presenta como fantasía y nunca como dato.

---

## Resumen en 6 líneas

1. **A · Dones:** las 36 especies se agrupan en **6 familias por geografía**, que es un dato verificable porque sale de `especies.js`. Cada familia tiene 5 ejes de ±1 paso con **suma cero**. Cada familia tiene además **un don de fantasía**, que se activa **manteniendo Impulso** (sin botones nuevos). Por especie solo cambian el color de la estela y el timbre del grito.
2. Vittata **aprende** cada don al hacerse amiga de una «mentora» de esa familia, una por capítulo. La cotorra que el jugador hizo en el creador trae los ejes de su familia. En Retos todo es 1 por defecto, como `rareza.mult()`. Habrá un modo aparte, «Con dones», con récords separados que nunca van al ranking en línea.
3. **B · Secretos:** 24 ideas, de 4 en 4 por capítulo y con coordenadas reales. Todas se montan sobre sistemas que ya existen: perchas, `agarre`, `fondo: true`, `grutas`, `corrientes`, `S.hora`, clima, fauna, Diario y viñetas. Las une un hilo: el **Mapa en pedazos**, con 6 fragmentos que se juntan en el cap. 6.
4. **D · Bandadas:** la fase 0 es solo local o con códigos. Incluye la «Bandada de la casa» (sobre `records.js`), metas cooperativas contra la «Maraña» (una amenaza de fantasía, sin animales enemigos), relevos y duelos sin contacto. La fase 1 añade «códigos de desafío» compartidos detrás de la puerta de adultos.
5. Las bandadas entre casas, el emparejamiento, las cuentas y el juego en tiempo real necesitan **servidor, cuentas, consentimiento parental y moderación**. Se quedan para el día legal de Kelvin. El ranking actual tiene pendientes abiertos (`SEGURIDAD_INFANTIL.md` §5), así que no se amplía hasta resolverlos.
6. **Orden recomendado:** primero los ejes y 2 dones baratos (Llamada y Ojo de cumbre); después 2 o 3 secretos por capítulo y la Bandada de la casa; los códigos de desafío; y al final el modo «Con dones» de Retos. El detalle está en la tabla final.

---

## A · Poderes especiales: «los dones de las 36»

### A.1 Lo que ya existe y se reutiliza

| Pieza | Dónde | Cómo sirve |
|---|---|---|
| Multiplicadores de física con apagado en Retos | `src/game/rareza.js` `mult(poder)` / `tiene(poder)` / `enReto()`, que devuelve 1 o false con `body.retos-on` o `body.duelo-on`. Lo leen `fisica.js:143` (despegue), `:330` (crucero), `:455` (subida del despegue) y `banquete.js:285` (vista). | El patrón ya está probado. `G.poderes.mult(eje)` se multiplica junto a `G.rareza.mult(eje)` en los mismos puntos y respeta el mismo `enReto()`. |
| Constantes de vuelo | `fisica.js` `TUNING`: `fly 12`, `flyAccel 3.5`, `flyBrake 2.6`, `climbV 5.5`, `diveV 7`, `glideSink 0.45`, `dash 19`, `dashTime 0.2`, `dashCooldown 0.7`, `takeoffV 7.5`, `swim 4.5`, `run 10.5`. | `FLY_SPEED`, `RUN_SPEED` y `DASH_SPEED` se copian al arrancar (`:88-89`). Los cambios por especie tienen que ser **multiplicadores en el punto de uso**, nunca reescribir `T`. Los valores `T.flyAccel` (`:349`), `T.glideSink` (`:459`), `T.climbV` (`:457`) y `T.dashCooldown` (`:159`) se leen en cada cuadro, así que admiten un factor sin más. |
| Controles | `input.js`: F hace impulso con `tryDash` al pulsar. Espacio sube o salta, C baja, V vuela o aterriza, X aterriza, E es Acción, 1–7 son gestos, Q y R giran la cámara (`fisica.js:315`). En táctil están `#b-dash`, `#b-jump`, `#b-fly`, `#b-act`, `#b-dive` y `#b-emotes`. `RESERVADAS` impide remapear F, Q, R, C, Espacio y 1–7. | **No hace falta tecla nueva.** Mantener Impulso (F o `#b-dash`) 0,6 s activa el don. El toque corto sigue siendo el impulso de siempre, que sale al pulsar como hoy. |
| Guía de controles | `guia_controles.js`: pistas en contexto la primera vez y `<almacen>.guia.hecho` | Se añade una pista nueva, «Mantén F para usar tu don», con `hecho.don`. |
| Gestos | `actores.js` `EMOTES`: saludar, celebrar, bailar, idea, enojo, pelea, molestia | El «grito de victoria» de cada especie va sobre «celebrar». **Ningún don usa «pelea» ni «enojo».** |
| Pieles y color medio de cada especie | `pieles.js` (36 pieles; `aplicar`, `cargar`); `bandada.js` ya calcula el color medio de una piel | El color de la estela del don sale de la piel de la especie, sin arte nuevo. |
| Especies | `content/comun/especies.js`: 34 vivas y 2 extintas (`martinicana`, `violacea`), con distribución y fuente | La familia se deduce de `distribucion`, un dato con fuente. **No se inventan tamaño ni peso**, que el catálogo no tiene. |
| Bandada ambiental | `bandada.js` `pedir('canto', { en: 1 })` y `G.on('canto')` | Es la base del don «Llamada». |
| Corrientes de aire | `AV_MAPA_CAP1.corrientes` (`{x, z, r, fuerza}`), hoy aplicadas solo en `retos.js` | Son la base del don «Columna de nube». Requieren una versión pequeña fuera de Retos. |
| Fauna que reacciona | `fauna.js`: el lagartijo se esconde a < 6 m, las mariposas se dispersan y la boa despierta si te posas; `rescate.js`: un zorzal se aburre si ladeas | Son la base de «sigilo» y del don «Plumas de hoja». |

### A.2 Las 6 familias (36 especies, por distribución de `especies.js`)

Agrupar por geografía tiene tres ventajas: se puede verificar, enseña el mapa de las Amazonas sin una lección y no promete biología falsa. Ningún eje se presenta como «la especie X es más rápida de verdad». En pantalla se dice «don de fantasía de la familia».

| # | Familia (nombre de trabajo) **[KELVIN]** | Especies (id) | n |
|---|---|---|---|
| 1 | **Isleñas** · Antillas Mayores y Bonaire | vittata, ventralis, leucocephala, agilis, collaria, barbadensis | 6 |
| 2 | **Montañeras** · Antillas Menores | imperialis, arausiaca, guildingii, versicolor + las extintas martinicana y violacea | 6 |
| 3 | **Del norte** · México | finschi, oratrix, tresmariae, viridigenalis, xantholora, albifrons | 6 |
| 4 | **Cordilleranas** · Pacífico y Andes | auropalliata, guatemalae, autumnalis, lilacina, mercenarius | 5 |
| 5 | **Del gran río** · Amazonía y Guayanas | diadema, kawalli, festiva, dufresniana, ochrocephala, amazonica, farinosa | 7 |
| 6 | **Del bosque del sur** · Bosque atlántico, Paraguay y Argentina | rhodocorytha, vinacea, brasiliensis, pretrei, tucumana, aestiva | 6 |

Notas:
- **Casos dudosos.** `barbadensis` está en Bonaire, en el Caribe, por eso va con las Isleñas. `farinosa` y `autumnalis` tienen áreas amplias y se ponen donde está la mayor parte de su `distribucion`. Si Kelvin prefiere otro reparto, es solo una tabla en el archivo de datos.
- **Extintas.** Siguen la regla de `COMPETICION_PVP.md` §2: se juegan con la viñeta de respeto. Su ficha dice «extinta» con su fuente UICN. **[KELVIN]** si dan don o solo piel.
- **Visitantes del cap. 6.** Los seis (Mira·versicolor, Roca·guildingii, Marea·arausiaca, Nudo·leucocephala, Eco·collaria, Brote·barbadensis, en `content/ep6/pack.js:63-72`) son todos de las familias 1 y 2. Sus `sabe` («ver lejos», «conocer el agua», «avisar fuerte», «dar sombra con su hoja»…) **riman con los dones**. Ver A.5.

### A.3 Parámetros: 5 ejes, ±1 paso, suma cero

Cada familia reparte pasos entre 5 ejes y **la suma es siempre 0**: quien gana en un eje pierde en otro. Con esto ninguna familia es «la mejor».

| Eje | 1 paso = | Dónde se aplica (punto de uso) |
|---|---|---|
| **Velocidad** | ×1,03 crucero y carrera (12 → 12,36 m/s) | `fisica.js:329-330`, el mismo `sp *=` que usa la rareza |
| **Giro** (maniobra) | ×1,06 `flyAccel` y `turnAccel` (radio de giro ≈ fly/flyAccel: 3,43 → 3,30 m) | `fisica.js:349` |
| **Aguante** | ×0,90 `glideSink` (pierde menos altura planeando) y ×1,05 `climbV` | `fisica.js:457-459` |
| **Vista** | ×1,15 en el radio de brillo de hallazgos, frutos y secretos | `banquete.js:285`, el Diario y los secretos de la parte B |
| **Sigilo** | ×0,8 en la distancia a la que la fauna reacciona (lagartijo: 6 → 4,8 m) y el zorzal de `rescate.js` se aburre 1 s antes | `fauna.js`, `rescate.js` |

| Familia | Vel. | Giro | Aguante | Vista | Sigilo | Cómo se siente |
|---|---|---|---|---|---|---|
| 1 Isleñas | 0 | 0 | 0 | 0 | 0 | La de referencia, equilibrada. Su ventaja es social (el don) |
| 2 Montañeras | −1 | −1 | +2 | 0 | 0 | Sube y planea lejos, gira más amplio |
| 3 Del norte | +1 | +1 | −1 | 0 | −1 | Rápida y ágil; cae antes y espanta a la fauna |
| 4 Cordilleranas | 0 | −1 | +1 | +1 | −1 | Ve lejos y aguanta |
| 5 Del gran río | +1 | 0 | 0 | −1 | 0 | Rápida (y mejor en el agua con su don) |
| 6 Del bosque del sur | −1 | 0 | −1 | +1 | +1 | Tranquila; la fauna no se esconde |

- **Tope.** Ningún eje pasa de ±2 pasos, así que la velocidad varía como mucho un ±3 %, dentro del ±5 % de `COMPETICION_PVP.md`. En la historia, si se suma la rareza de la cría (vuelo ×1,12 en legendaria), el total de `vuelo` se limita a **×1,15** con `Math.min` en `G.poderes.mult`.
- **Lo que no cambia** con la familia: el techo de vuelo, el despegue, el nado base y el radio del cuerpo. Así ninguna especie llega a sitios que otra no alcanza. Lo que se consigue con dones (parte B) siempre tiene otra ruta.

### A.4 El don de cada familia (fantasía)

**Activar.** Se mantiene Impulso 0,6 s (F o `#b-dash`). Alrededor del botón se llena un anillo de carga y se oye un sonido de carga que sube. El impulso normal sale igual al pulsar, así que el don es «un impulso que se carga».
- **Duración y espera.** Cada don dura de 4 a 10 s. La recarga va de 20 a 40 s y se ve como un relleno radial en el mismo botón.
- **Sin recursos que gastar.** No hay energía, ni maná, ni compras, ni nada que baje con el tiempo. Faltar no quita nada.
- **Cambios de código.** En `input.js` hay que medir cuánto se mantiene F o `#b-dash` (hoy solo hay `keydown` para F). Son unas 15 líneas en el carril Movimiento.

| Familia | Don | Qué hace (números) | Sobre qué sistema | Coste |
|---|---|---|---|---|
| 1 Isleñas | **Llamada de la bandada** | Grito, y llega la bandada (`bandada.js pedir('canto', { en: 1, n: 12 })`). Durante 8 s, volar dentro de la bandada da **rebufo** (×1,08 de crucero) y una cotorra se adelanta hacia el secreto más cercano sin descubrir (≤ 80 m). Espera 40 s. | `bandada.js`, `G.on('canto')` y la lista de secretos (B) | **S** |
| 2 Montañeras | **Columna de nube** | Sale una corriente ascendente bajo la cotorra (r 6 m, fuerza 6, 6 s), igual que las del mapa. Sirve para remontar acantilados y llegar a perchas altas. Espera 30 s. | Las `corrientes` de Retos llevadas a un módulo pequeño `G.corrientes` en el mundo, más la neblina de `fx.js` | **M** |
| 3 Del norte | **Ráfaga doble** | Durante 5 s, `dashCooldown` pasa de 0,7 a 0,25 y el impulso en el aire se recarga solo. Permite encadenar 3 o 4 impulsos y atravesar corredores. Espera 25 s. | Factor sobre `T.dashCooldown` y `MOVE.airDash` | **S** |
| 4 Cordilleranas | **Ojo de cumbre** | Una onda (`fx.ringFx`) recorre 60 m y marca durante 6 s, con un destello dorado que se ve a través del follaje, los hallazgos del Diario aún no vistos, los secretos y la fauna. Espera 30 s. | `fx.js`, `pack.diario.entradas`, `fauna.js` y la lista de secretos | **S** |
| 5 Del gran río | **Rasante de río** | Durante 8 s, a menos de 1,5 m del agua (`G.agua.levelAt`): crucero ×1,25, sin chapuzón al rozar, estela de gotas (`agua.spray`) y, al bucear, nado ×1,3. Espera 30 s. | `fisica.js` (un factor en `sp` si el agua está cerca) y `agua.js` | **M** |
| 6 Del bosque del sur | **Plumas de hoja** | Durante 10 s, un remolino de hojas (partículas, **sin tocar el material de Vittata**). La fauna no reacciona: el lagartijo no se esconde, una mariposa se posa, la boa no despierta. Algunos secretos solo aparecen así (B). Espera 35 s. | Ganchos en `fauna.js`, más `rescate.js` | **M** |

**Lo propio de cada especie (cosmético, barato).** Las 36 comparten el don de su familia, pero cada una cambia en tres cosas:
- **Color de la estela** del don: el color medio de su piel, como hace `bandada.js`.
- **Timbre del grito:** el mismo `G.audio.define` con otra altura o filtro, unas 36 líneas de datos.
- **Pose de presentación** en el creador: uno de los gestos que ya existen.

Si una especie tiene un rasgo de vuelo con fuente en `especies.js` (por ejemplo `diadema`: «destello rojo en las secundarias al volar»), se muestra **como dato** en su ficha y **nunca como poder**.

### A.5 Cómo los consigue el jugador (Vittata sigue siendo la protagonista)

Hay dos capas:
1. **Ejes de familia (pasivos).** Los lleva la cotorra que se juega, según la especie que tenga en el creador (`creador.js`, `J.especie`). Vittata es Isleña (0 en todo). Cambiar de especie cambia los ejes. No hay que ganar nada y no hay una especie «mala».
2. **Dones (activos): Vittata los aprende.** Cada capítulo tiene una **mentora** de una familia, posada en un sitio de su zona. Es una cotorra hecha con `AVCharacter.create` y `AVE.pieles.aplicar`, como las rivales de Retos.
   - **El desafío.** Si te posas a su lado (2 s, la misma regla de «observar» de `fauna.js`), te reta a un **«sígueme»** de 30–45 s. Es una ruta grabada con el formato de fantasma de `retos.js`, sin reloj que castigue. Si te quedas atrás, ella espera.
   - **El premio.** Al terminar, «Vittata aprendió **Llamada de la bandada**». Sale una viñeta del cómic y la carta de la especie en el Álbum.
   - **Un don activo a la vez.** Se cambia en la pausa, en la pestaña «Dones». Así la interfaz queda simple y se mantiene el equilibrio.
   - **Si la mentora es otra especie.** Si el jugador lleva una especie de otra familia, la mentora le enseña igual: el don aprendido es de Vittata y vale para cualquier piel.

| Cap. | Mentora (familia, propuesta) **[KELVIN]** | Dónde (x, z) | Por qué encaja |
|---|---|---|---|
| 1 | Isleñas: **Llamada**. La bandada de 20 que pasa al terminar M3 (`wow.js`) se queda a enseñarla | Plaza de Villa Raíz (150, 170) | Ya existe el momento |
| 2 | Del bosque del sur: **Plumas de hoja** | Caney del Meandro, junto al poste con cinta (−11, 53) | «Escuchar primero»: observar sin espantar |
| 3 | Del gran río: **Rasante de río** | Desembocadura, baranda de la brisa (195.6, 204.4) | Capítulo del agua |
| 4 | Del norte: **Ráfaga doble** | Tramo recto del río al este de Villa Raíz (x ≈ 205, z ≈ 160) | «El precio del progreso»: ir rápido, con su coste (aguante −1) |
| 5 | Cordilleranas: **Ojo de cumbre** | Mirador de Los Miradores (−63, −146), de noche | El relevo de señales es ver lejos |
| 6 | Montañeras: **Columna de nube** | Borde norte del tepuy, mirador (−40, −117) | Sube a la Ciudad de los 36; Mira y Roca son Montañeras |

**Posible remate de canon [KELVIN].** En el cap. 6, cada visitante reconoce el don que «sabe»: Mira por el Ojo, Brote por las Plumas de hoja, Marea por el Rasante y Eco por la Llamada. Es una línea de diálogo por visitante, sin mecánica nueva.

### A.6 Equilibrio y justicia en Retos

| Modo | Regla | Récords |
|---|---|---|
| **Clásico** (por defecto, hoy) | Todo se queda como ahora: `G.poderes.mult()` es 1, ni ejes ni dones, igual que `rareza.enReto()`. | Los de siempre: `<almacen>.retos`, `records.js` y el ranking en línea (`RANK_RETOS`) |
| **Con dones** (nuevo, opcional) | Solo en Carrera, Banquete y Tormenta. Cada jugador elige familia (no especie). El don tiene **1 carga por partida** y no se recarga. Los ejes se aplican. | Clave aparte, `<almacen>.retos.dones`, y libro de la casa por familia. **Nunca se publica en el ranking en línea**: no entra en `RANK_RETOS`. |

**Verificación del equilibrio** (prueba, antes de abrir «Con dones»):
- Se añade `AV.poderesTest()`. Hace volar la IA de la carrera (la spline de `retos.js`, sin goma) con los ejes de cada familia y sin don.
- **Criterio:** el tiempo de las 6 familias queda dentro de **±1,5 %** de la media. Con un don usado una vez, dentro de ±3 %.
- Si una familia se pasa, se baja su paso. Los números viven en un solo archivo de datos, `content/comun/dones.js`.

**Entre hermanos.** Se mantiene la «ventaja declarada» de `COMPETICION_PVP.md`: el mayor puede «dar el don», es decir, jugar sin él, y eso se muestra como gesto deportivo. El modo relajado acorta la espera de los dones a la mitad.

### A.7 Interfaz

- **Botón Impulso** (`#b-dash`) y pastilla de la tecla F en `guia_controles`: glifo de la familia, anillo de carga y relleno de espera. Sin números.
- **Pausa → «Dones»:** 6 cartas. Las aprendidas en color, las que faltan en silueta con la pista «Una cotorra de la desembocadura sabe algo…». Se toca una para elegir el don activo. Los ejes se muestran con 5 puntos y frases («planea un poquito más»), nunca con porcentajes.
- **Creador:** al elegir especie, una línea con «Familia: Del gran río» y su mapa pequeño (de `distribucion`).
- **Accesibilidad:**
  - Ajuste «Dones con doble toque» para quien no puede mantener pulsado.
  - Con `prefers-reduced-motion`, sin cambio de FOV y con menos partículas.
  - `aria-live` anuncia «Don listo».
- **Textos.** Son de lista, en ES y EN (`en.js`), y siempre con la palabra «fantasía» cerca la primera vez.

### A.8 Barato y caro

| Barato (S) | Medio (M) | Caro (L) |
|---|---|---|
| `content/comun/dones.js` (familias, ejes, textos) y `src/game/poderes.js` (`G.poderes = { familia, mult, don, activar, listo, test }`), con carga perezosa como `rareza.js` | Columna de nube (corrientes fuera de Retos) | El «sígueme» de las 6 mentoras, con rutas medidas sobre el suelo real (M cada una, L todas) |
| 4 llamadas `mult()` en `fisica.js`, junto a las de rareza | Rasante de río | El modo «Con dones» en Retos, con equilibrio y récords aparte |
| Llamada (bandada), Ráfaga doble y Ojo de cumbre | Plumas de hoja (ganchos en `fauna.js` y `rescate.js`) | 36 gritos con timbre propio grabados (si se quiere audio real y no síntesis) **[KELVIN]** si hay gasto |
| Estela por color de piel; mantener Impulso en `input.js` | Pestaña «Dones» y carta en el creador | Cualquier animación nueva del rig (**no se hace**: se usa lo procedural) |

### A.9 Plan por etapas

| Etapa | Qué | Prueba de que funciona |
|---|---|---|
| A0 | **[KELVIN]** nombres de familia, reparto, extintas, mentoras y si Vittata «aprende» | — |
| A1 (S) | `dones.js` y `poderes.js` con ejes pasivos; los factores en `fisica.js`; `poderesTest` (suma cero, tope, 1 en Retos) | 13 baterías en verde; `retosTest` sin cambios |
| A2 (S–M) | Mantener Impulso, la interfaz del botón y Llamada + Ojo de cumbre, desbloqueados con `?dones=todos` para playtest | Playtest: ¿lo usan sin explicación? ¿Se ríen con la bandada? |
| A3 (M) | Mentora del cap. 1 y pestaña «Dones» | E2E: aprender Llamada en la partida del cap. 1 |
| A4 (M–L) | Los otros 4 dones y las mentoras 2–6, a medida que cada capítulo se muda al mapa real | `epNTest` por capítulo |
| A5 (M) | Retos «Con dones» con `AV.poderesTest` de equilibrio | Dispersión ≤ 1,5 % |

### A.10 Riesgos

- **Poder acumulado** (rareza + ejes + don): se resuelve con el tope de ×1,15 en `vuelo` y con prohibir que dos dones vayan a la vez.
- **«Mi especie es mala»:** la suma cero, frases positivas y ningún ranking por especie.
- **Confundir fantasía con biología:** la etiqueta «fantasía» y los datos reales solo en la ficha con fuente (regla de `especies.js`: «lo que no se pudo verificar va en null»).
- **Pulsación larga en móvil:** puede chocar con el gesto del sistema. Se usa `pointerdown` con `preventDefault`, como ya hacen los botones, y hay alternativa con doble toque.
- **Rendimiento:** las partículas siguen la calidad de `renderer.js` (en bajo, solo destello). La bandada ya se apaga en bajo, así que en ese nivel la Llamada usa 4 cotorras-sprite.
- **Carril.** `fisica.js` e `input.js` son del carril Movimiento (`COORDINACION.md`); los cambios se coordinan allí.
- **Canon:** las mentoras y el «aprender» de Vittata son **[KELVIN]**.

---

## B · Más acertijos y descubrimientos (capítulos 1–6)

### B.0 Reglas comunes y piezas que se reutilizan

- **Las piezas:**
  - `fisica.addPercha({x, z, r, y})`: perchas que solo sostienen desde arriba.
  - `interaccion.add({ use })` y la tecla Acción.
  - `agarre.agarrar/soltar`: llevar cosas, en las patas si se vuela.
  - `objetos` con `recursos[{ fondo: true }]`: solo se ven buceando.
  - `AV_MAPA_CAP1.grutas`, `corrientes` y `agua`.
  - `S.hora` (atardecer de 17,5 a 19; noche desde las 19).
  - `clima.fijar` (neblina o llovizna) y `fauna.js` (observar 2 s).
  - `lugares.js` (G.emit `'lugar'`) y `pack.diario.entradas`.
  - `momentos.js` y `pack.vinetas` (viñetas graciosas con 3 textos de lista).
  - `G.emit('aprendizaje', { tipo: 'secreto', id })`: da XP al nido. Hay que añadir `secreto` como tipo en `criadero.js`.
- **Un solo registro nuevo.** Va en `S.secretos` (ids, en la partida, con migración vacía como `S.lugares`). La cuenta «Secretos 3/24» va en el Diario y en la pausa, sobre el mismo patrón de `descubrir.js`.
- **Premios** (siempre fijos y sin azar):
  - **Cosmético:** pieza del ropero. Hay que confirmar con `TRAITS_V2.md` cuáles existen; las nuevas piden arte **[KELVIN]**.
  - **Carta del Diario.** Si trae un dato, el dato va con fuente en `lecciones.js`/`DIARIO_VALIDACION.md`. Si no lo tiene, entra en una categoría nueva, «Leyendas de Vittata», sin datos.
  - **Viñeta del cómic.**
  - **Carta de álbum:** «Fauna de El Yunque» ya existe; el «Álbum de las Amazonas» está en `DIVERSION_CAP1` mejora 10.
- **Sin castigo.** Ningún secreto se pierde ni caduca. Si se requiere noche o neblina, la pista lo dice y el reloj del mundo llega solo.
- **El hilo de la temporada: «El mapa en pedazos».** Cada capítulo esconde 1 fragmento de un mapa viejo (6 en total). En el cap. 6 se juntan en la mesa del taller (45, −60) y descubren un último lugar (B.6-2). Qué dibuja el mapa y quién lo hizo es **[KELVIN]**: una pista del Guardián o de la Gran Ruptura, sin revelar el canon.
- **Tamaños:** S < medio día · M 1–2 días · L más (como `DIVERSION_CAP1.md`).

Coordenadas: `assets/data/mapa_cap1.js` (`pois`, `agua`, `grutas`, `corrientes`) y los `pack.js` de cada capítulo con el mapa real (`EN(relleno, mapa)`).

### B.1 Capítulo 1 · El día que el cielo se rompió (Villa Raíz y la isla)

| # | Idea | Dónde (x, y, z) | Cómo funciona (sistemas actuales) | Premio | Tam. |
|---|---|---|---|---|---|
| 1 | **Los tres pilares de la hacienda** | Ruinas de la hacienda (198, 44, −4) | 3 perchas (`addPercha`) sobre piedras con una marca tallada (1, 2 o 3 rayas). Posarse en orden hace sonar una nota de `musica.js`, y la tercera abre un hueco con el **fragmento 1 del mapa**. Si el orden falla, no pasa nada y las notas se repiten para que se oiga el patrón. | Fragmento 1 y viñeta «La hacienda guarda algo» | M |
| 2 | **Detrás de la cascada** | Cascada de La Mina (74.5, 10.5–19.5, −102.3) y Gruta de La Mina (65.5, 9.7, −98.5 → 61, 10.5, −109) | Se vuela a través de la cortina de agua (`agua.spray` al cruzar) y se entra por la gruta como atajo hacia la Poza. Dentro hay una flor de maga que brilla (el mismo prop que los banderines de Retos) y `lugares.js` cuenta «Tras la cascada». Es una ruta alternativa a la ruta de vuelo «Río arriba hasta La Mina». | Carta «Leyendas»; pieza del ropero «gotas en el ala» **[arte]** | S |
| 3 | **La percha más alta** | Los Picachos (60, 90.4, −231) | Se llega montando la corriente de la cumbre (−32, −150, fuerza 7, hoy solo en Retos: va con `G.corrientes` de A.4) o con la Columna de nube. Arriba hay un nido vacío con una pluma de nube. Con la cumbre al lado (96 m), es la ruta sin dones. | Viñeta «¡En la cima!» (de `momentos.js`); cosmético «pluma de nube» | S (con `G.corrientes`) |
| 4 | **La Cueva del Mar de noche** | Cueva del Mar (232, 1.5, −3; gruta a [240, 1.2, −3] → [224, 1.8, −5]) | Con `S.hora` ≥ 19, el fondo de la cueva brilla. Al bucear (C) aparecen 3 caracolas con `fondo: true`. Si se lleva la tercera (`agarre`) al muelle (150, 0, 205), una niña la pone al oído y «se oye el mar»: viñeta graciosa. | Viñeta y cosmético «caracola» (mano) | S–M |
| 5 | **Escribe con luz** (opcional) | Bahía bioluminiscente (−160, −1, 207, r 24) | `maravillas.js` ya pinta la estela azul al nadar de noche. Nadar un círculo completo dentro de la bahía (se detecta con la suma de ángulos alrededor del centro) deja un anillo azul 5 s, y la cámara sube para que se vea. El dato del brillo ya tiene fuente (NOAA, en el propio archivo). | Viñeta «Dibujé con luz» | M |

### B.2 Capítulo 2 · Un lugar para todos (Caney del Meandro, centro −14, 17)

| # | Idea | Dónde | Cómo funciona | Premio | Tam. |
|---|---|---|---|---|---|
| 1 | **La cometa en el techo** | La cinta del poste (−11, 53) señala hacia donde va el viento. Siguiéndola a favor, hay una cometa enganchada en el techo de un bohío de Kelvin, a unos 20 m (se mide al construir). | Hay que posarse en el techo (perchas de `solidos`) y agarrarla (`agarre`, con el pico). Se devuelve al niño de la aldea, junto a la Abuela, y él la hace volar sobre la loma (0, 60). | Cosmético «cometa» (espalda) **[arte]**; viñeta | M |
| 2 | **El barquito de papel** | Cinta de lluvia (−3, 56) | Tras la llovizna (`clima.fijar('llovizna')`, que ya suena en el capítulo), aparece un barquito de papel que baja por el hilo de agua. Si se sigue en rasante hasta el meandro sin perderlo de vista (≤ 8 m), se queda varado junto al charco (−30, 27). | Viñeta y carta «Leyendas» | S–M |
| 3 | **Los postes que cantan** | Postes viejos, «zocos» (−17, 22) | Cuatro perchas a distinta altura. Posarse de la más baja a la más alta toca una escala de 4 notas; de la más alta a la más baja, otra. Las dos escalas seguidas abren la caja de herramientas de la Abuela. El dato de los zocos sigue sin publicar (Kelvin, 2-nov), así que **esto no afirma nada cultural**. | Cosmético «martillo de la Abuela» (mano) | S |
| 4 | **Huellas en el barro** | Charco del llano (−30, 27) | Al día siguiente de la tormenta de prueba (paso `StormTested`), hay huellas pequeñas en el barro. Si se siguen (marcas en el suelo cada 3 m, decal sencillo), se llega a un lagartijo de `fauna.js` que hace sus flexiones «para ti» (y cuenta como observado). | Carta de fauna, si no la tenía, y viñeta | S |
| 5 | **Fragmento 2 del mapa** | Bajo el techo de zinc (−29, 8.5) | Solo se ve agachada: hay que meterse bajo el alero bajo (`MOVE.agachada`, que ya existe). | Fragmento 2 | S |

### B.3 Capítulo 3 · Más allá de la bahía (desembocadura x ≈ 194–210, z ≈ 165–210, y playa del oeste)

| # | Idea | Dónde | Cómo funciona | Premio | Tam. |
|---|---|---|---|---|---|
| 1 | **La botella de la barra** | Barra de arena del atajo (la ruta «bajío» de la canoa, en `content/ep3/pack.js`) | Tras la primera botadura, una botella sube y baja con las olas sobre el bajío. Se agarra en vuelo rasante (`agarre`, en las patas). Dentro está el **fragmento 3**. | Fragmento 3 y viñeta | S |
| 2 | **Lo que hay bajo el arrecife** | Playa y arrecife (170, 0.37, 205) | 4 objetos `fondo: true` (una ancla vieja, un cántaro, dos conchas) que solo se ven buceando. Cada uno da una carta «Leyendas». Si se quiere dato del arrecife, que vaya **con fuente** (DRNA o NOAA) **[verificar]**. | Cosmético «gafas de buceo» (ojos) | S |
| 3 | **Saludo al faro** | Playa del oeste (la otra comunidad) | Posarse en el mástil o techo más alto y hacer el gesto «Saludar» (1). La lancha de la otra comunidad responde con tres destellos (los de `luzMirador.parpadear` del cap. 1) y luego aparece a saludar en la escena final. | Viñeta «Me contestaron» | S |
| 4 | **La ruta larga por la costa** | La ruta «costa» de la canoa (mar abierto) | Si se elige la ruta larga, a mitad de camino una tortuga marina asoma 3 s junto a la canoa. Si se mira (cámara hacia ella), da una carta del álbum de fauna. El dato del tinglar **solo con fuente** (DRNA o USFWS) **[verificar]**. Es una recompensa a elegir la ruta lenta, sin castigar la rápida. | Carta de fauna | M |

### B.4 Capítulo 4 · El precio del progreso (tramo recto del río real, x ≈ 200–211, z ≈ 130–190)

| # | Idea | Dónde | Cómo funciona | Premio | Tam. |
|---|---|---|---|---|---|
| 1 | **Las piedras de paso a pie** | Piedras de paso (entrada `piedras`, `M({x: −8, z: −9})`) | Cruzar a pie, solo saltando (Espacio y doble salto, sin volar: `MOVE.flying` false todo el cruce). Cada piedra es una percha. Al otro lado hay un símbolo tallado. Si se cae al agua, nada: se nada a la orilla y se vuelve a intentar. | Viñeta «Sin alas» y cosmético «chancletas» (si existen en `TRAITS_V2`) | M |
| 2 | **Bajo el puente colgante** | Puente colgante (157.9, 11.7, 136.5) | Pasar volando por debajo, a menos de 1,5 m del agua (como el «rasante» de DIVERSION mejora 6). La primera vez aparece, atada bajo el tablón, la nota del constructor viejo con el **fragmento 4**. | Fragmento 4 | S |
| 3 | **La Vittata de la maqueta** | La maqueta de la misión «La maqueta y el acuerdo» | Al terminar M3, la maqueta tiene una Vittata diminuta escondida (un sprite o el retrato del creador en miniatura). Se ve posándose encima y pulsando Acción, y entonces aparece la línea de humor «¿Esa soy yo? Me hicieron el pico enorme». | Viñeta graciosa | S |
| 4 | **Lo que se llevó el río** | Poza Honda (187.8, 3, 115; profundidad 3,8 m) | 3 objetos de la comunidad (un remo pequeño, un juguete, una olla) con `fondo: true`. Cada uno se lleva a su dueño (`agarre` y `soltar({ en })` junto a un NPC). Es la consecuencia amable de la crecida del cap. 1. | Cosmético y «Gracias» en el Diario | M |

### B.5 Capítulo 5 · Las voces olvidadas (Los Miradores, el tepuy y la Puerta del Yunque, de noche)

| # | Idea | Dónde | Cómo funciona | Premio | Tam. |
|---|---|---|---|---|---|
| 1 | **El sexto espejo** | El pilar (−59, −102), que hoy queda detrás del borde, 3,5 m bajo la línea de vista | Después del relevo, se lleva un espejo de repuesto (`agarre`) desde el taller (−42, −120) al pilar. Así la luz llega a la Puerta del Yunque y enciende el farol viejo junto al Guardián (−19, −79), que recuerda «una cosa más». Qué recuerda es canon **[KELVIN]**: una frase que no revele nada. | Fragmento 5 y viñeta | M |
| 2 | **El ritmo de las marcas** | Marcas en la piedra (−46, −140) y el tambor (−12, −80) | Las 5 marcas tienen largos distintos (largo-corto-corto-largo-corto). Tocar el tambor con Acción con ese ritmo enciende el portal del kit (−34, −147) con luz de luciérnagas (los `Points` de `wow.js`) durante 20 s. | Viñeta «El portal respondió» y carta «Leyendas» | M |
| 3 | **Las luciérnagas guía** | De la Puerta del Yunque (−21, −70) a un nicho de las ruinas (−74, −132) | De noche, una fila de luciérnagas (reutiliza las de `maravillas.js`/`wow.js`) se enciende tramo a tramo si se va detrás a menos de 10 m. Al final hay un nicho con una pluma azul. | Cosmético «pluma azul» | S–M |
| 4 | **El eco que contesta** | Portal (−34, −147) | El gesto «Saludar» junto al portal produce un eco con **otra voz** (otro timbre de `audio.define`). Si se repite 3 veces, la tercera respuesta es de una de las dos especies de «Dos de las islas del sur» (entrada `especies`, −17, −85). Ojo con las extintas: «con cuidado científico» (STORY_BIBLE). | Carta del álbum | S |

### B.6 Capítulo 6 · El pacto de los 36 (río al pie del tepuy y Ciudad de los 36)

| # | Idea | Dónde | Cómo funciona | Premio | Tam. |
|---|---|---|---|---|---|
| 1 | **El nudo perdido** | Bajo el puente nuevo de M2 (de 30.5 a 14.5, −50; tablero a 11 m sobre agua a 9 m) | Hay solo 2 m de hueco, así que se pasa nadando o buceando (C). Abajo está la soga favorita de Nudo, enganchada en un pilote. Si se le lleva, el gag es que la ata en un nudo tan bonito que no se puede desatar. | Viñeta graciosa | S |
| 2 | **El mapa completo** | Mesa del taller (45, −60) y después un borde del tepuy (cerca del mirador, −40, −117) | Con los 5 fragmentos anteriores y el 6.º (ver idea 4), el mapa se arma en la mesa y marca un **nido de los guardianes** en un saliente del tepuy. Allí, `wow.despegue()` hace la apertura de cámara y aparece la bandada. Sin los fragmentos, el capítulo se termina igual. | Cosmético de legado («corona de hojas») **[arte]** y viñeta de cierre | M |
| 3 | **Los seis asientos** | Círculo de los 36 (centro −40, −131) | En cada asiento de un visitante, hacer un gesto distinto (1–7). Cada visitante responde con su propia pose. Con los 6 hechos, sale la «foto de grupo» al cómic (DIVERSION mejora 5). | Viñeta de grupo | S |
| 4 | **Fragmento 6 entre las luces** | Mirador (−40, −117), mirando las 14 luces que esperan | Una de las 14 luces parpadea distinto. Si se vuela hacia ella hasta el viento del techo, cae una hoja de papel: el fragmento 6. **Las 14 luces siguen esperando** (gancho «La tripulación», [KELVIN-8] de `ep6/pack.js`): esto no las enciende. | Fragmento 6 | S |
| 5 | **El álbum en el círculo** (si existe el Álbum de las Amazonas) | Círculo de los 36 | Cada carta de especie conseguida en la temporada (mentoras, bandada, rivales) pone su piel en el asiento que le toque dentro de los 22 que llegaron. Es solo una vista para mirar. | Que el círculo se vea completo | L (depende del Álbum) |

### B.7 Cómo se construye una vez y sirve para todos

- **Un módulo genérico** `src/game/secretos.js` lee `pack.secretos = [{ id, tipo: 'perchas'|'llevar'|'fondo'|'gesto'|'ritmo'|'rasante'|'seguir', ... , premio }]`. Cada tipo es una receta de 30–80 líneas sobre los sistemas de B.0, y cada capítulo solo pone datos en su `pack.js`.
- **Pistas en tres niveles**, sin botón de «resolver»:
  - El Ojo de cumbre (A.4) marca el sitio.
  - La Llamada manda una cotorra hacia allí.
  - Iguaca suelta una frase si se lleva 10 min en la zona sin encontrar nada.
- **Prueba nueva**, `AV.secretosTest()`, para cada secreto:
  - el sitio está sobre suelo real y fuera del agua (o dentro, si es `fondo`);
  - se puede alcanzar sin dones;
  - el premio es fijo;
  - se guarda en `S.secretos`.

---

## D · Bandadas (equipos), misiones contra amenazas y «PvP» sin violencia

### D.0 Qué hay hoy (hechos)

- **`bandada.js` no es un sistema de equipos.** Es la bandada que cruza el cielo, de ambiente. Para no confundir, el sistema de equipos se llamaría `src/game/equipos.js` y en pantalla «Tu bandada» **[KELVIN]**.
- **Récords locales.**
  - `records.js` guarda el libro de la casa por nombre de cotorra (`<almacen>.records.jugadores`).
  - La puerta de adultos (`puerta()`) protege «Compartir».
  - Las tarjetas PNG no salen a ningún servidor.
- **Retos.**
  - Fantasma propio en base 36 (`<almacen>.retos.fantasma`, una muestra cada 0,1 s).
  - Medallas, «Otra vez» y modo relajado.
  - El fantasma de un amigo **todavía no existe**.
- **Ranking en línea** (`publicarRanking`, Supabase `amazona-records`):
  - Es opcional y solo usa un apodo de lista.
  - Guarda en el servidor un hash del dispositivo y de la IP.
  - **No tiene puerta de adulto.**
  - El texto «Todo se guarda solo en este dispositivo» de `records.js` (`TX.local`) ya no es exacto.
  - La decisión está en `PENDIENTES_KELVIN.md` §0.3.

  **Recomendación:** no construir nada encima del ranking hasta que Kelvin lo decida.
- **Duelos.** `COMPETICION_PVP.md` ya propone 5 duelos (canto, carrera 1 contra 1, captura del fruto, rey de la copa y acrobacias) con modos A (local), B (fantasmas con código) y C (en línea, no por ahora). **Esta propuesta los reutiliza y no los repite.**

### D.1 Fase 0 · Sin servidor y sin datos fuera del dispositivo (se puede empezar ya)

**1. La Bandada de la casa** (S–M)
- **Qué es.** Las cotorras del libro de la casa (`records.js`) forman una bandada.
- **Nombre y emblema.** El nombre sale de dos listas (p. ej. «Bandada del Coquí Valiente») y el emblema de 8 glifos y 6 colores. Nada de texto libre. La bandera de PR, si sale, sigue `BANDERA_PR_GUIA.md`.
- **Dónde se guarda.** En `<almacen>.equipos` (local), con `{ nombre: [i, j], emblema, miembros: [nombres de cotorra] }`. «Nuevo estudiante» lo borra, como borra los récords.
- **Dónde se ve.** En «Mis récords», una pestaña «Bandada» con la suma de lo hecho por todos y el récord de cada uno.

**2. Metas cooperativas contra «la Maraña»** (M)
- **La amenaza.** Es **de fantasía**: una enredadera gris que dejó la Gran Ruptura y tapa perchas, huecos de nido y senderos en las zonas ya jugadas. No es un animal ni una persona, y nadie sale herido. **[KELVIN]** si entra en canon.
- **Cómo se juega.**
  - **Desenredar** (S–M): posarse y mantener Acción 1,5 s. Usa `agarre.usar()`, el gesto de uso que ya existe.
  - **Llevar semillas** a los claros que quedan.
  - **Rescatar** un pichón que no puede salir: `rescate.js` con otro sitio.
- **La meta de la bandada.** Es una barra que suman todos los de la casa, por ejemplo «Entre todos: 30 perchas libres en Villa Raíz». Cuando se llena, la zona se ve más viva (más flores y mariposas de `fauna.js`) y sale una viñeta «Lo hicimos juntos».
- **Sin presión.** No caduca, no hay rachas y no hay «vuelve mañana».
- **Amenazas reales (si las hay).** Una especie invasora o un problema real para la cotorra entra **solo** con fuente verificada (USFWS o DRNA) en `lecciones.js` y como ficha del Diario, **nunca** como enemigo que se ataca. Hay que verificar antes qué documentan las fuentes oficiales. Aquí no se afirma ninguna.

**3. El relevo de la casa** (S)
- **Qué es.** La contrarreloj del río o la carrera dividida en 3 tramos. Cada miembro vuela uno, por turnos en el mismo dispositivo.
- **Cómo se cuenta.** El tiempo total va a la bandada. El fantasma de cada tramo es el del miembro que lo voló, en su piel.
- **Qué hay que hacer.** Partir `jugar('rio')` por puntos de control y añadir una pantalla de «pasa el mando».

**4. Duelos locales** (de `COMPETICION_PVP.md`, en su orden)
- Duelo de canto (S), Rey de la copa (S+) y Carrera 1 contra 1 por turnos o con fantasma.
- **Nuevos formatos sin violencia:**
  - **«Casa que aguanta» (M).** Se basa en el cap. 2: cada jugador construye su casa con las mismas piezas y pasa la misma tormenta de prueba (determinista). Gana la que aguanta con menos piezas, y si empatan, ganan los dos.
  - **«Rescate a dos» (M).** El `rescate.js` de siempre: el pichón aparece a la vez para los dos jugadores, cada uno en su turno con el mismo sitio (semilla fija), y gana el menor tiempo.
  - **«Despeja la Maraña» (S).** Quién libera más perchas en 60 s.

**5. Vuelo del día local** (S)
- Una semilla por fecha (`AAAAMMDD`) elige ruta, viento y frutos (DIVERSION mejora 7).
- Todos los de la casa juegan el mismo vuelo ese día.
- No da nada por jugar seguido y no quita nada por faltar.

### D.2 Fase 1 · Códigos, todavía sin servidor (detrás de la puerta de adultos)

**Código de desafío dictable** (S)
- **Formato.** `RIO-NUBE-AZUL-0142-K7`: reto, nombre de listas, tiempo en décimas, especie o familia y un dígito de control.
- **Qué hace.** Quien lo escribe compite contra una rival de IA (la de `retos.js`) **que va a ese ritmo**. No viaja la ruta, así que el código es corto y se puede dictar por teléfono o escribir en un papel de la clase.
- **Qué no lleva.** Ni texto libre ni datos personales.

**Fantasma completo por archivo o QR** (M)
- **Por qué no se dicta.** El fantasma de hoy (10 Hz, 90 s) pesa varios KB.
- **Cómo se reduce.** Se baja a 2 Hz y se reconstruye con la spline de la ruta. Queda en ≈ 0,6–1 KB.
- **Cómo viaja.** Por un PNG con QR o un archivo `.avfantasma` que se comparte con la misma puerta de adultos de `records.js` (`compartirRecord`).

**Código de bandada** (S)
- **Qué lleva.** Nombre de lista, emblema y récords agregados de la bandada (mejor por reto), en ~30 caracteres.
- **Para qué.** Otra casa o la clase lo pega y ve «Bandada del Coquí Valiente: río 1:12, banquete 1340» en su tabla local de «bandadas amigas».
- **Sin comunicación.** No hay mensajes ni respuestas: solo números.

**La clase.** En el Modo Maestro, «Bandadas de la clase» junta los códigos que dictan los grupos en una tabla local del equipo del maestro, sin nombres reales (`SEGURIDAD_INFANTIL.md` #10).

### D.3 Lo que necesita servidor, cuentas o moderación (espera al día legal de Kelvin)

| Función | Qué exige | Riesgo para menores |
|---|---|---|
| Bandadas entre casas con miembros persistentes (unirse, invitar) | Identificador persistente por niño, que con COPPA supone **consentimiento parental verificable**; base de datos; borrado a petición | Un perfil de menor visible para otros |
| Tabla en línea de bandadas o retos semanales | La misma función que el ranking de hoy, pero ampliada; antes hay que decidir la puerta de adulto y la política publicada | Rankings públicos de menores (`COMUNIDAD_PROPUESTA.md` §3 los prohíbe) |
| Metas cooperativas globales («toda la isla desenreda 10 000 perchas») | Un contador en el servidor, más antitrampas | Bajo, si es anónimo y agregado; aun así sale una petición desde el niño (su IP) |
| Duelo o carrera en tiempo real | WebSocket o WebRTC y sincronía de la física (**no existe en el motor**), emparejamiento, servidores y su coste mensual | Contacto con desconocidos, aunque no haya chat |
| Cualquier texto, emoji libre, voz, regalo o intercambio de objetos | **No se recomienda nunca.** El intercambio abre una economía (riesgo de botín encubierto) | Alto |

**Requisitos mínimos antes de la fase 2** (de `SEGURIDAD_INFANTIL.md` §4 y `COMUNIDAD_PROPUESTA.md` §4):
- política de privacidad publicada en ES y EN;
- revisión del abogado de COPPA;
- puerta de adulto antes de publicar nada;
- retención y borrado escritos;
- una persona responsable de moderar, con plazo;
- emparejamiento solo por código de amigo, nunca con desconocidos;
- nombres solo de listas.

**[KELVIN]** sobre el coste y el proveedor.

### D.4 Por qué «PvP» sin violencia funciona aquí

- **La emoción.** Sale del marcador ajustado, la revancha en 1 s, el mejor de 3 y el público del bosque (coquíes y lagartijos que celebran). No hace falta golpear a nadie.
- **Sin contacto.** Las cotorras se atraviesan, nadie le quita nada a otro y quien pierde recibe una frase concreta y amable.
- **Qué se gana.** Viñetas y récords de la casa. **Nunca** huevos, rarezas, dones ni piezas del ropero: eso sería una caja de botín encubierta.
- **Cómo se nombra.** «Duelo» o «desafío», no «batalla» **[KELVIN]** (abierto en `COMPETICION_PVP.md`).

---

## Tabla final priorizada

Valor = diversión esperada (★ a ★★★★★). Coste: S < medio día · M 1–2 días · L más.

Quién lo hace:
- **Agentes en la nube** (Claude): lógica JS, datos y pruebas.
- **Cursor+Grok:** gameplay e interfaz en su carril. No tocan edificios, terreno ni mapa.
- **Kimi:** 3D: edificios, terreno, nichos, props y LOD.
- **Arte del ropero:** pipeline `tools/blender/`, con decisión de Kelvin.

| # | Idea | Valor | Coste | Dependencias | Quién |
|---|---|---|---|---|---|
| 1 | Ejes de familia pasivos (`dones.js`, `poderes.js`, 4 factores en `fisica.js`, `poderesTest`) | ★★★ | S | A0 (decisión de familias); coordinar con el carril Movimiento | Agente en la nube |
| 2 | Mantener Impulso y la interfaz del botón y la pista | ★★★ | S | 1; `input.js` (carril Movimiento) | Cursor+Grok o agente en la nube |
| 3 | Don «Llamada de la bandada» | ★★★★★ | S | 2; `bandada.js` | Agente en la nube |
| 4 | Don «Ojo de cumbre» | ★★★★ | S | 2; lista de secretos (8) | Agente en la nube |
| 5 | Módulo `secretos.js` y `S.secretos`, cuenta y prueba | ★★★★ | M | — | Agente en la nube |
| 6 | Secretos del cap. 1 (B.1-1, 2, 3, 4) | ★★★★★ | S–M c/u | 5; `G.corrientes` para B.1-3 | Cursor+Grok (lógica); Kimi (hueco en las ruinas, si es 3D) |
| 7 | Mapa en pedazos (6 fragmentos y la mesa del cap. 6) | ★★★★ | M | 5; **[KELVIN]** qué dibuja el mapa | Agente en la nube; arte 2D del mapa (Kelvin) |
| 8 | Bandada de la casa (`equipos.js` y pestaña en «Mis récords») | ★★★★ | S–M | `records.js` | Agente en la nube |
| 9 | Mentora del cap. 1 con «sígueme» (ruta en formato fantasma) | ★★★★ | M | 1–3; pieles; **[KELVIN]** canon | Cursor+Grok |
| 10 | Código de desafío dictable (rival de IA a tu ritmo) | ★★★★ | S | Retos; puerta de adultos | Agente en la nube |
| 11 | Duelo de canto y Rey de la copa (de `COMPETICION_PVP.md`) | ★★★★ | S y S+ | **[KELVIN]** aprobar los duelos | Cursor+Grok |
| 12 | Secretos de los caps. 2–4 (B.2, B.3, B.4) | ★★★★ | S–M c/u | 5; capítulos ya mudados al mapa real | Cursor+Grok; Kimi para la cometa o el puente si hacen falta props |
| 13 | `G.corrientes` en el mundo y el don «Columna de nube» | ★★★★ | M | Corrientes de `retos.js` | Agente en la nube (Opus: física) |
| 14 | Dones «Ráfaga doble», «Rasante de río» y «Plumas de hoja» | ★★★★ | S, M, M | 1–2; `agua.js`, `fauna.js` | Agente en la nube |
| 15 | Metas contra la Maraña y «Despeja la Maraña» | ★★★★ | M | 8; **[KELVIN]** canon; prop «enredadera» | Agente en la nube (lógica) y Kimi (enredadera 3D con LOD) |
| 16 | Relevo de la casa | ★★★ | S | 8; Retos | Agente en la nube |
| 17 | Secretos de los caps. 5–6 (B.5, B.6) | ★★★★ | S–M c/u | 5; caps. 5 y 6 con `MAPA_REAL = true` (KIMI-Task-001 a 003) | Cursor+Grok; Kimi (nicho, portal) |
| 18 | Mentoras de los caps. 2–6 y la pestaña «Dones» | ★★★★ | L | 9; cada capítulo en el mapa real | Cursor+Grok |
| 19 | Fantasma completo por QR o archivo, y código de bandada | ★★★ | M | 10; puerta de adultos | Agente en la nube |
| 20 | Retos «Con dones» y la prueba de equilibrio | ★★★ | M | 1–14 | Agente en la nube (Opus) |
| 21 | Cosméticos nuevos (gotas en el ala, cometa, martillo, corona de hojas…) | ★★★ | M c/u | **[KELVIN]** arte; `TRAITS_V2.md` | Pipeline de arte del ropero (Kelvin y Blender); no lo hace Kimi |
| 22 | Álbum en el círculo de los 36 (B.6-5) | ★★★ | L | Álbum de las Amazonas (DIVERSION mejora 10) | Agente en la nube; arte de las cartas (Kelvin) |
| — | Bandadas en línea, tablas de bandadas y juego en tiempo real | ★★★★ | L o más, con coste mensual | Día legal de Kelvin, COPPA, moderación, política y decisión sobre el ranking actual | **No ahora** |

**Las primeras dos semanas** (si Kelvin aprueba A0 y el canon mínimo):
- Semana 1: 1 → 2 → 3 → 4 → 5.
- Semana 2: 6 (dos secretos) → 8 → 10.

Con eso, el jugador ya tiene un don que hace reír (la bandada), una razón para mirar detrás de la cascada y una bandada en casa, sin servidor y sin tocar a Vittata.

## Decisiones para Kelvin (resumen)

1. Familias por geografía (A.2): los nombres, el reparto de los casos dudosos y si las extintas dan don.
2. Si Vittata «aprende» dones de mentoras (A.5), qué mentora va en cada capítulo y si los visitantes del cap. 6 los reconocen.
3. Si los dones van solo en la historia o también en Retos «Con dones», con récords aparte y sin ranking.
4. Qué dibuja el Mapa en pedazos y qué recuerda el Guardián con el sexto espejo (B.5-1).
5. Si «la Maraña» entra en canon como amenaza de fantasía, y si se incluye alguna amenaza real con fuente.
6. El arte de los cosméticos nuevos y el de las cartas del Álbum.
7. El ranking en línea actual (`PENDIENTES_KELVIN.md` §0.3) antes de cualquier función en línea de bandadas.
8. Cómo se llaman en pantalla: «Tu bandada» o «equipo», y «duelo» o «desafío».
