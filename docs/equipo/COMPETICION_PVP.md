# COMPETICION_PVP · «Batallas» de las 36 cotorras (y la fauna) sin violencia

Propuesta breve, 2026-10-26, para decidir. Nada implementado. Pedido de los directores de producto: «batallas PvP de las 36 cotorras, y con los animales: lagartos, culebras». Reglas que manda `CLAUDE.md`: diversión primero, todas las edades, **sin violencia ni armas**, sin anillos, sin cajas de botín, y protección de menores (`COMUNIDAD_PROPUESTA.md`, `SEGURIDAD_INFANTIL.md`: sin chat abierto, sin perfiles públicos ni rankings públicos de menores).

**Idea central:** una «batalla» es un **duelo de habilidad con revancha inmediata** («Otra vez» en 1 s, como en Retos). La emoción sale del marcador ajustado, la cuenta atrás, el público del bosque (coquíes y bandada que celebran) y el «mejor de 3». Nadie golpea, nadie pierde vida; se pierde la ronda y se vuelve a intentar. La fauna participa como **obstáculo o juez**, nunca como enemigo ni como víctima.

## 1. Cinco formatos de duelo

| # | Formato | Cómo se juega | Dónde está la emoción | Fauna |
|---|---|---|---|---|
| 1 | **Duelo de canto** | Por turnos, tipo Simon: una cotorra «canta» una secuencia de 3–7 notas (Acción + dirección = 4 notas; el audio `co`/`qui` y las notas de `musica.js` ya existen) y la rival la repite y añade una. Quien falla pierde la ronda. Mejor de 3. | Suspense creciente, se juega en un solo teclado o mando por turnos, perfecto para hermanos. | Los coquíes hacen de coro: a partir de 5 notas se suman (gag del «coro desafinado» de BOSQUE_VIVO). |
| 2 | **Carrera aérea 1 vs 1** (o 2 vs 2) | La Carrera de El Yunque con un rival humano en vez de IA: mismos 6 puntos de control, corrientes y meta. Variante relevo: cada jugador vuela 3 tramos. | Codo a codo, goma suave solo en los dos primeros tramos; cerca de la meta gana quien vuela mejor (ya es así). | El lagartijo de la salida da la señal con sus flexiones (3-2-1). |
| 3 | **Captura del fruto** | Arena de la colina del Banquete: 2 nidos, 1 fruto dorado en el centro. Llevarlo a tu nido sin tocar el suelo suma 1; si tocas el suelo el fruto se cae y queda libre (como el combo del Banquete). 90 s. Sin robar del pico: el fruto solo se suelta al tocar suelo o al pasar por una ráfaga. | Ida y vuelta, remontadas, decidir si arriesgar la ruta de las copas. | **Esquiva la boa:** una boa dormida en la rama corta la ruta de las copas; si te posas en su rama, levanta la cabeza y te hace perder 2 s (vuelves a despegar). Nunca ataca. |
| 4 | **Rey de la copa** | Una rama alta en el ceibo. Quien está posado suma 1 punto/s; el viento (`'viento'` de `fisica.js`) sopla cada 10–15 s y hay que volver a posarse; la rama solo admite una cotorra (quien llega primero se queda). 60 s. | Ritmo de «ahora me toca a mí», muy legible a los 5 años. | Lagartijos en el tronco: si un jugador pasa a < 2 m, hacen flexiones y la pantalla lo celebra («el lagartijo te apoya»). |
| 5 | **Acrobacias puntuadas** | Por turnos, 20 s cada uno: rizos, pasadas rasantes sobre el río, posarse en el punto marcado. Puntúa un **jurado de animales** (coquí, lagartijo, boa) con reglas fijas y visibles: altura, variedad, aterrizaje limpio. Mejor de 3 turnos. | Público, estilo, «mira lo que hago yo». Sin mirar al rival, no hay contacto. | La boa es la jueza seria que da siempre un punto menos (el gag de BOSQUE_VIVO). |

Todos: sin colisión jugador–jugador (atraviesan), sin quitar nada al otro, marcador grande y revancha al instante. **[KELVIN]** cuáles de los cinco entran primero y si «batalla» se dice así en pantalla o «duelo» / «desafío».

## 2. Las 36 especies: identidad sin romper el balance

- **Rasgos suaves, tres ejes, ±5 % como máximo:** agilidad (giro), canto (una nota extra o un timbre propio en el duelo de canto) y planeo (cuánto conserva la velocidad en las corrientes). Suma de los tres **siempre cero**: quien planea mejor gira un poco peor. Así cualquier especie puede ganar y se nota la diferencia sin que haya una «mejor».
- **De datos reales o nada:** `content/comun/especies.js` hoy tiene rasgos descriptivos (color, destello en vuelo) y fuentes, pero **no** tamaño ni peso. Para asignar los ejes hacen falta longitud y masa por especie con fuente (Wikipedia EN / BirdLife), en una tabla nueva `content/comun/especies_duelo.js`; lo que no se verifique queda neutro (0, 0, 0). Regla del repo: nada de memoria.
- **Lo que se ve, no lo que suma:** cada especie tiene su **grito de victoria** y su **gesto de revancha** (clips del rig ya existentes, sin modelos nuevos), más el «destello rojo en las secundarias» y rasgos del catálogo como pose de presentación.
- **Las rarezas no cuentan:** igual que en Retos, `G.rareza.mult()` es 1 y `tiene()` es false en cualquier duelo. Tampoco cuentan trajes ni accesorios del ropero. Las dos extintas se juegan con una viñeta de respeto al elegirlas.
- **[KELVIN]** si Vittata lleva un bono de «anfitriona» (recomendado: no; todas iguales) y si las extintas entran.

## 3. Modos, de más seguro a más complejo

| Modo | Qué es | Riesgo / exige | Recomendación |
|---|---|---|---|
| **A. Local** | Misma pantalla por turnos (formatos 1 y 5: un teclado o mando) y **pantalla dividida** (2, 3, 4) con dos mandos o teclado + mando. Récords en el «libro de la casa» de `records.js`, por nombre de cotorra. | Ninguno de privacidad. Pantalla dividida: el motor dibuja dos veces (coste gráfico; en «bajo» solo turnos). | **Primero.** Es lo que piden los hijos: jugar entre ellos y con sus amigos en la misma Mac. |
| **B. Fantasmas con código** | Tu mejor carrera, captura o acrobacia se graba como ya hace `retos.js` (fantasma en base 36) y se convierte en un **código corto** (p. ej. `YUNQ-7K3M-…`, ~1–2 KB) para copiar, pegar o leer en QR. Quien lo pega compite contra esa cotorra translúcida. Sin cuentas, sin servidor, sin chat: el código solo lleva ruta y especie, nunca nombre ni texto libre. | Puerta para adultos al compartir (ya existe en `records.js`). Coste cero. Limita el canto (se puede: secuencia grabada). | **Segundo.** Es la «revancha con el primo de Caguas» sin exponer a nadie. |
| **C. En línea en tiempo real** | Emparejamiento y partida sincronizada. | Servidor con WebSocket/WebRTC y sincronía de físicas (reescribir la red del motor: no existe); emparejamiento; moderación 24/7 aunque no haya chat (nombres, patrones de acoso); COPPA: consentimiento parental verificable antes de cualquier identificador persistente, política legal revisada; coste mensual de servidores y una persona responsable; riesgo de que una mala experiencia online rompa el tono familiar. | **No por ahora.** Solo si A y B gustan y Kelvin decide que vale el coste. Si algún día: sin chat, sin voz, nombres solo de las listas, emparejamiento solo por código de amigo (nunca con desconocidos). |

## 4. Reutiliza / nuevo, tamaño y orden

| Pieza | Reutiliza | Nuevo | Tamaño |
|---|---|---|---|
| Carrera 1 vs 1 local | ruta, banderines, corrientes, HUD, goma, medallas de `retos.js`; `records.js` para el libro de la casa | segundo jugador humano en `input.js` (mando/teclas) y pantalla dividida (dos cámaras, dos viewports en `renderer.js`) | **M** (L si la pantalla dividida pide tocar el streaming) |
| Duelo de canto | audio `co`/`qui`, notas de `musica.js`, gestos del rig, coquíes de `fauna.js` | lógica Simon por turnos, UI de notas, marcador; sin segunda cámara | **S** |
| Captura del fruto | arena, frutos instanciados y regla del combo de `banquete.js`; boa de BOSQUE_VIVO | 2 nidos, estado del fruto, marcador, pantalla dividida | **M** |
| Rey de la copa | percha (`G.solidos.percha`), evento `'viento'`, lagartijos | rama exclusiva, contador, pantalla dividida | **S+** |
| Acrobacias | detección de rizos y rasantes (parte en la tormenta y el Banquete), gestos | jurado con reglas, UI de puntuación por turnos | **M** |
| Fantasma con código | codificador base 36 y cotorra translúcida de `retos.js`, puerta de adultos de `records.js` | serializar a código corto + especie, pegar/leer, QR opcional | **S** |
| Rasgos por especie | `especies.js`, `rareza.js` (patrón de `mult`) | tabla `especies_duelo.js` con fuentes y los tres ejes | **S** (la verificación de datos es lo que cuesta) |
| Menú «Duelos» | menú y flujo entrar/salir de Retos (instantánea de la partida, `G.quiet`) | pestaña nueva, elección de especie por jugador | **S** |

**Orden recomendado:** 1.º duelo de canto (S, por turnos, cero riesgo técnico, se prueba en una tarde) → 2.º rey de la copa (prueba la pantalla dividida con lo mínimo) → 3.º carrera 1 vs 1 → 4.º fantasmas con código → 5.º captura del fruto → 6.º acrobacias. Rasgos por especie en paralelo cuando haya datos verificados. Total aproximado: 2–3 semanas de un agente para A completo + B. **[KELVIN]** aprobar la pantalla dividida (toca `renderer.js`: cambio de arquitectura mediano) o quedarse en turnos.

## 5. Riesgos para niños y cómo evitarlos

- **Toxicidad:** no hay chat, voz, ni texto libre; los nombres salen de las listas de `creador.js`; el código de fantasma no lleva nombre. Sin rankings públicos (`COMUNIDAD_PROPUESTA.md` §3): solo el libro de la casa. Nada de burlas automáticas: el perdedor recibe una frase amable y concreta («te faltó un punto: la ráfaga del tramo 4»).
- **Frustración:** mejor de 3 siempre; goma suave en los dos primeros tramos; modo relajado (`G.accesibilidad.relajado()`) también en duelos (sin reloj en el canto, secuencias más cortas); «desempate de la suerte» prohibido: si empatan, empatan y celebran los dos. Entre hermanos de edades distintas, **ventaja declarada**: el jugador mayor puede elegir «dar 2 s» o «dar 1 nota» y se muestra en pantalla como gesto de deportividad, no como castigo.
- **Presión:** sin rachas diarias, sin recompensas por jugar más, sin perder nada por perder. Lo que se gana en duelos son viñetas para el cómic y récords de la casa; nunca huevos, rarezas ni cosas del ropero (eso sería una caja de botín encubierta). Sesiones de 1–3 minutos con «Volver a la historia» siempre visible.
- **Fauna:** la boa y los lagartijos nunca reciben daño ni lo hacen; el texto del álbum sigue siendo de respeto. **[KELVIN]** si la boa entra como obstáculo (algunos padres no querrán verla sin aviso, como ya se anotó en BOSQUE_VIVO).

**Siguiente paso si se aprueba:** ficha `TAREAS_*` para el duelo de canto por turnos (S) y una prueba con los directores de producto antes de tocar la pantalla dividida.
