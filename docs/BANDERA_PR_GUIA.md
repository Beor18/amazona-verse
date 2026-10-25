# Guía de la bandera de Puerto Rico · OBLIGATORIA para todo el arte

Dueño: game designer de huevos. Aplica a texturas, modelos, UI, web, cómic y merch. Si una pieza no cumple, no se publica.

## 1. La regla (Ley Núm. 1 de 24 de julio de 1952, sección 1)
> "…rectangular de cinco franjas horizontales alternadas, tres rojas y dos blancas y junto al asta un triángulo equilátero azul con una estrella blanca de cinco puntas."

La ley añade que el triángulo "abarca toda la anchura" (el alto) de la bandera. No fija la proporción ni los tonos.

## 2. Construcción (alto = H, ancho = 1,5 H)

| Elemento | Medida |
|---|---|
| Proporción | **2:3** (la de uso oficial y común) |
| Franjas | 5 iguales de H/5: **rojo, blanco, rojo, blanco, rojo** (rojo arriba y abajo) |
| Triángulo | Equilátero, base en el asta (0,0)–(0,H) y punta en **(0,866 H; 0,5 H)**, o sea al 57,7 % del ancho |
| Estrella | Blanca, 5 puntas, **una punta hacia arriba**, centro en el baricentro **(0,2887 H; 0,5 H)** |
| Tamaño de la estrella | Radio exterior **H/6** (diámetro 1/3 del alto; se admite hasta 1/2). Radio interior = **0,382** del exterior (estrella regular) |

Fórmula para código (lienzo `x, y, w, h`, con `w = 1,5 h`): punta del triángulo `x + h·0,866`; estrella en `(x + h·0,2887, y + h/2)`, radio `h/6`, interior `0,382`. `AVWardrobe.prFlag` ya la usa (TA, 24 oct 2026). Plantilla vectorial: `docs/img/bandera_pr_referencia.svg`.

## 3. Colores (sRGB; el renderer los pasa a lineal)

La ley nombra los colores, pero no sus tonos. Hay tres azules históricos y el tono es un tema político:

| Variante | Azul | Rojo | Uso |
|---|---|---|---|
| **Azul medio (de facto desde 1995)** | **#0044FF** (≈ Pantone 2387 C) | **#EE0000** | **El del juego** |
| Azul oscuro (gobierno desde 1952) | #0038A7 (Pantone 293 C) | #CE1127 | Solo en la ficha de historia |
| Azul claro o celeste (1895) | #87CEFA | #CE0000 | Solo en la ficha de historia |

Blanco: #FFFFFF. En 2022 un proyecto del Senado para oficializar un "azul real" no se aprobó.

**Recomendación (decidida):** todo el arte usa **un solo juego**, el azul medio: #EE0000 · #FFFFFF · #0044FF. Es el tono de uso oficial actual y el más neutral entre las dos posturas. Es una escuela: el niño no escoge el azul, y el juego no toma partido. La historia de los tres azules se enseña en el Diario y en el Modo Maestro: "La ley nombra los colores, pero no el tono. Por eso verás varios azules, y todos son nuestra bandera".

Revísalo bajo la luz del juego (ACES): el azul tiene que leerse como azul medio, ni morado ni marino. Si no se lee así, se corrige con el material (rugosidad), no cambiando el tono.

## 4. Por pieza

| Pieza | Así sí | Así no |
|---|---|---|
| **Textura de tela** (camisa, pañuelo) | Bandera completa, plana y 2:3, como estampado pequeño en una zona sin costura (pecho o esquina) | Estirada alrededor del torso, cortada por la costura, en espejo o repetida a medias |
| **Gorra** | Parche plano 3:2 al frente, con la textura fiel (material `BANDERA`) | La bandera envuelta sobre la copa, que la deforma; visera azul con franjas sueltas |
| **Tenis** | Parche plano en el lateral o el talón; o solo estrellas blancas regulares de 5 puntas | Bandera envuelta en la puntera; franjas sin triángulo |
| **Mochila** | Parche plano 2:3 en la solapa; o colores sueltos rojo/blanco/azul sin imitar la bandera | Estrella cambiada por un pentágono; solapa azul con una "estrella" encima, que pasa por media bandera |
| **Bandera en mano** | Paño 2:3 en asta, con el triángulo pegado al asta en las dos caras y la estrella hacia arriba | Triángulo del lado libre; bandera al revés (en la otra cara, el triángulo también va en el asta) |
| **Huevo PR** (criadero) | La cápsula lleva una banderita plana 2:3 en un asta junto al nido; la cáscara solo con estrellas sueltas | La bandera estirada sobre la cáscara curva o partida en pétalos |
| **UI y web** | El SVG de referencia, escalado sin deformar | Emoji o clip-art con otras proporciones, o con la estrella ladeada |

**Siempre:**
- 5 franjas.
- Estrella regular, con una punta arriba.
- Triángulo equilátero en el asta.
- Nada escrito encima de la bandera (texto, números ni logos).

**Nunca:**
- 4, 6 o 13 franjas.
- Estrella de 6 puntas, rellena de color o rotada.
- Triángulo más corto o más largo que el equilátero.
- Bandera recortada o en partes.
- Mezclarla con otra bandera en el mismo paño.

Inspiración de colores (por ejemplo, una mochila roja con correas azules) está bien si no imita media bandera.

## 5. Lista de control (QA y autor)
1. Cuenta las franjas: 5, con rojo arriba y abajo.
2. ¿La punta del triángulo llega al 57,7 % del ancho (2:3)?
3. ¿La estrella está centrada en el triángulo, con una punta hacia arriba?
4. ¿Su diámetro es ≥ 1/3 del alto?
5. ¿Los colores son #EE0000, #FFFFFF y #0044FF?
6. Mírala en el juego, en el modelo y con su luz. La textura plana no basta.
7. Mírala por las dos caras si es un paño.

## 6. Riesgo legal (para Kelvin y el abogado, no para el arte)
- La ley de 1952 faculta al Departamento de Estado a reglamentar el uso de la bandera, y violar ese reglamento es **delito menos grave**.
- Según fuentes secundarias, el **Reglamento 5282 (3 ago 1995)** prohíbe imprimirla en trajes, uniformes o vestidos, y usarla para vestir animales o en propaganda comercial o mercancía. **Falta leer el texto oficial.**
- En la cultura boricua la ropa con la bandera es común, pero el juego es para escuelas y tiene tienda.
- **Mientras el abogado no lo revise:**
  - las piezas con la bandera **se ganan jugando y nunca se venden**;
  - no hay merch con la bandera;
  - nada de anuncios con la bandera.

Fuentes: [Ley 1-1952 (OGP)](https://bvirtualogp.pr.gov/ogp/Bvirtual/leyesreferencia/PDF/1-1952.pdf) · [Wikipedia: Flag of Puerto Rico (colores, construcción, protocolo)](https://en.wikipedia.org/wiki/Flag_of_Puerto_Rico) · [SVG de referencia en Wikimedia](https://upload.wikimedia.org/wikipedia/commons/2/28/Flag_of_Puerto_Rico.svg) · [FOTW](https://www.fotw.info/flags/pr.html) · [Senado PR, P. del S. 957 (2022)](https://senado.pr.gov/document_vault/legislative_measures/3170/document/ps0957-22.pdf)
