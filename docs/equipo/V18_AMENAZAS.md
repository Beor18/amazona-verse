# V18.1 · Las 3 amenazas de fantasía (propuesta para Kelvin)

**Estado: propuesta, pendiente de aprobación de Kelvin.** Viene de la respuesta 10 del 5-nov (`docs/DECISION_LOG.md`): tres amenazas de fantasía, con **una sola en el primer prototipo**, reutilizable. La 11 dice: Maraña con cara y personalidad, sin personaje 3D nuevo para empezar.

**Reglas que cumplen las tres:**
- **Son fantasía.** No son animales reales de Puerto Rico ni dicen nada de ellos. En el Diario y en el Aula llevan la marca «criatura de fantasía» y nunca un dato educativo. Ni serpientes, ni sapos, ni tormentas reales salen como malos: la boa puertorriqueña y los anfibios reales no se tocan.
- **Aptas para niños:** no matan ni hay sangre. Se ganan «deshaciendo» la amenaza (se dispersa, despierta o se aclara) y nunca destruyendo a un ser.
- **Con lo que ya existe:** partículas de `src/engine/fx.js`, el clima de `src/game/clima.js` (lluvia, neblina), los rastros de `src/game/marana.js` (CG-46), la música `assets/audio/musica/tormenta.m4a`, los poderes de la V18.1 (Grito del Yunque y Escudo de plumas) y los ataques básicos (golpe de ala y semilla).
- **Se ganan con el poder, no con más daño.** Cada una pide usar bien uno de los poderes: «que se jueguen diferente».

---

## 1 · Sombra de Tormenta (la del prototipo; la programa Kimi 3, KIMI-064)

| | |
|---|---|
| **Qué es** | Un nubarrón que se cree dueño del cielo y tapa los caminos. Gruñe como un trueno lejano y se ríe con ráfagas. |
| **Aspecto** | Niebla oscura de `clima.js` concentrada en una bola de ~15 m, partículas de lluvia y hojas de `fx.js` girando, dos ojos luminosos amarillos y un destello de rayo de vez en cuando (el brillo que ya avisa del rayo en «¡Escapa de la tormenta!»). Sin malla nueva. |
| **Comportamiento** | Se pone encima de un camino cerca de Villa Raíz (por ejemplo, el del puente roto). Sopla viento que empuja a Vittata hacia atrás y la frena si vuela a través. Cada 6–8 s avisa con un brillo y suelta una ráfaga: si la toca, pierde una pluma de resistencia (las mismas 5 del Duelo), se marea un momento y sigue. |
| **Cómo se gana** | **Grito del Yunque** apuntado al centro: cada grito que acierta la deshace un tercio. Con tres aciertos, la niebla se abre, sale el sol y queda un arcoíris corto. El Escudo de plumas aguanta una ráfaga. |
| **Recompensa** | Materiales del inventario que ya existe (fibras o madera, respuesta 9) y el camino despejado. |
| **Dónde sale** | Una sola vez en la demo, cerca de Villa Raíz. Después puede volver otro día en otros caminos (reutilizable). |
| **Frase** | «¡Este cielo es mío!» / al irse: «Bueno… el sol también tiene derecho.» |

## 2 · Serpiente de la Maraña

| | |
|---|---|
| **Qué es** | La Maraña (CG-46) cuando se junta. No es una serpiente de verdad: es un enredo de bejucos grises que se mueve como una serpiente. Es gruñona, le gusta lo enredado y odia el orden. |
| **Aspecto** | Las esferas grises de los rastros de `marana.js` en fila (malla instanciada, 1 draw call), con forma de cuerpo ondulado, más dos ojos luminosos verdes (respuesta 11) y hojas secas de `fx.js` al moverse. Voz: un susurro con eco. |
| **Comportamiento** | Se enrosca en un árbol, un puente o una parada y la «enreda»: la parada no se puede usar. Si Vittata se acerca a pie, lanza un bejuco que la frena 2 s. |
| **Cómo se gana** | **Golpe de ala** para cortar los nudos uno a uno (3 a 5, marcados con brillo) y **semilla** para los nudos altos. Al soltar el último nudo, la Maraña se deshace en hojas y vuelve a ser rastro limpio (el mismo «limpio» que ya guarda `marana.js`). |
| **Recompensa** | Fibras, y se limpia el rastro en el Diario. |
| **Dónde sale** | En los 5 rastros de `marana.js` (loma, poza, mirador, río, meseta). |
| **Frase** | «Shhh… todo está mejor enredado.» / al irse: «Ya vendré a enredar otro día…» |

## 3 · Sapo Encantado

| | |
|---|---|
| **Qué es** | Un sapo de fantasía hecho de piedra y musgo, dormido desde hace mucho. Cuando ronca, el suelo tiembla y las piedras se mueven. No es un sapo real ni el coquí: el coquí sigue siendo amigo y dato verdadero. |
| **Aspecto** | Un peñasco de las piezas de roca que ya existen, con musgo y dos ojos luminosos que se abren y cierran. Burbujas de `fx.js` al roncar. Sin rig nuevo: «salta» moviendo la pieza entera. |
| **Comportamiento** | Duerme encima de una poza o una salida de agua y la tapa. Cada ronquido manda una onda por el suelo: si Vittata está posada, rebota y pierde el equilibrio (mareo corto). En vuelo no le afecta. |
| **Cómo se gana** | Despertarlo con cariño: **tres semillas** en la boca cuando la abre al roncar (hay que apuntar a tiempo). Despierta, bosteza, se aparta de un salto y deja correr el agua. El Escudo de plumas aguanta una onda. |
| **Recompensa** | Piedra, y la poza destapada. |
| **Dónde sale** | En una poza o quebrada que ya existe (por ejemplo, la «poza» de los rastros, x −20, z 60). |
| **Frase** | «Zzz… cinco minutitos más…» / al irse: «¡Ay, qué hambre tenía! Gracias, cotorrita.» |

---

## Lo que Kelvin tiene que decidir

1. ¿Apruebas las tres fichas así, con cambios o no?
2. ¿Los nombres y las frases te gustan? Las frases están en español de Puerto Rico; el inglés iría a `content/cap1/en.js`.
3. Orden después de la Sombra de Tormenta: propongo la **Serpiente de la Maraña** segunda, porque ya tiene rastros, guardado y Diario hechos. El Sapo Encantado iría tercero.
