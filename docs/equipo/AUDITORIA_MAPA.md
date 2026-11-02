# Auditoría visual del mapa · 28 oct 2026, 16:45 UTC

Carril L (G26). Solo mide: no hay cambio de código. Las tomas son del árbol `eaab2f3`. Después, `d4d5e54` agranda los bohíos de Villa Raíz (×1,75, carril M): esa escala no está en estas fotos. Look de fábrica `vibrant_toon` (sin `?look=`), calidad alto, clima sol. Referencia: `docs/img/mapa_audit_original_2022.jpg`.

28 tomas en `docs/img/auditoria_mapa_20261028/` (`<id>_aire.jpg` y `<id>_camino.jpg`). Números en `medidas.json`. 0 errores de consola. La cámara de aire mira al centro de las piezas, desde fuera. La siguiente pasada toca a las 22:45 UTC.

«Flota» en los números es el pivote a más de 3 m del suelo de esa x,z. En un acantilado el valle cuenta como suelo y el número miente. Lo que vale es la foto.

Entra lo que ya está en `eaab2f3`: las copas del llano ya no son nenúfares gigantes (`e41237b`) y el lejano Ancient y el de la madera pasaron a crema y a tejado rojo (`11dade4`, `77d79ca`, `aa9b4b4`). Esta pasada no repite la vista lejana `ciudad_tepuy`.

## Lo que se repite

1. **El bosque del llano son árboles sueltos de copa redonda y el suelo se ve.** Ya no son las hojas planas de varios metros. En 2022 es un dosel cerrado. En el borde del tepuy siguen las matas redondas, grandes, en fila. Carril D.
2. **Un bloque blanco sin textura**, a veces con un círculo, está en el claro de Villa Raíz, Los Portales, el Campamento y se intuye en más de una aldea. No es un bohío. Carril K.
3. **Las ciudades de piedra, de cerca, son crema y no doradas** (Ciudad de los 36: crema 865, dorado 3, con el `_hd` puesto). Se leen como esqueleto o masa blanca, no como el conjunto de cúpulas, cornisas y almenas de `docs/img/ciudad_tepuy_meta_kelvin.jpg`.
4. **El rojo teja se lee** en Villa Raíz, las Atalayas, el Embarcadero, Los Monumentos y la Ladera.

## Tabla

| Asentamiento | Carril del pedido | Kit real | Qué se ve | Para quién |
|---|---|---|---|---|
| Ciudad de los 36 | C | Ancient, 61 | Crema, no dorada. Andamios blancos sobre el tepuy, con piezas que salen por el cantil. El grupo de la izquierda es una masa redonda, no torres claras. Copas redondas en el borde. | C la forma. D el borde. |
| Los Miradores | J | Ancient, 26 | Dos torres huecas, crema, y la ciudad al fondo también en esqueleto. Losas sueltas y matas redondas. | J |
| Templos de la Colina | J | Ancient + carpas, 25 | Desde el aire, ciudad blanca en el claro, con tejados rojos al lado. Desde el camino la cámara **entra en el muro**: suelo de losas y pared verde. | J el complejo. E si la cámara no debe entrar. |
| La Otra Orilla | K en el pedido | Ancient + Savage, 32 | Ciudad blanca hueca en el tepuy oriental y **una torre beige** al lado. Abajo, bohíos con tejado rojo. | J la piedra y la torre beige. K los bohíos. |
| Atalayas del Oeste | J en el pedido | Savage, 38 | Fuerte de madera con tejados y banderas rojas. Alguna torre queda en el borde del cantil. No es piedra. | J: el encargo es piedra y el kit es madera. K el rojo. |
| Los Monumentos | J en el pedido | Savage + monumentos, 26 | Aldea de tejados rojos junto al río. Los cuatro monumentos de piedra no se leen. | J el nombre. K el tejado. |
| Puerta del Yunque | J en el pedido | Savage, 13 | Muralla y tejado rojo al pie de la pared. No se ve la puerta del camino a la cumbre. | J: es madera. |
| Ladera de los Cuatro | J en el pedido | Savage, 13 | Toldos rojos y chozas. Las cuatro piedras no se leen. | J el encargo. K los toldos. |
| Villa Raíz | K | Savage, 46 | Tejados rojos junto al río. **Un tramo de empalizada flota** en el aire, detrás del claro. Bloque blanco con un círculo. | K |
| Los Portales del Río | K | Savage, 24 | Hay empalizada, un puente y tejados, repartidos. No se lee como el paso de los seis puentes. Bloque blanco. | K |
| Caney del Meandro | K | Savage, 28 | Caney y bohíos en la península, con canoas. El rojo se lee de cerca. | K |
| Embarcadero de las Canoas | K | Savage, 39 | Corral, tejados rojos y la orilla. Es la aldea que más se parece al render, aunque los árboles la tapan. | K |
| Puerto de La Mina | K | Savage + 3 torres, 27 | Manda la cascada. Arriba, unos bohíos. Las tres torres antiguas no salen. | K |
| Campamento de los Toldos | K | Savage, 21 | Los toldos están **planos en el suelo**, como hojas marrones. Bloque blanco al lado. | K |

## Para cada carril

**C.** A esta distancia la Ciudad de los 36 es crema mate. Sigue siendo un esqueleto que se sale del acantilado, sin la cúpula y las almenas de la meta. El grupo de la izquierda no se lee como torres sobre la roca. La vista lejana `ciudad_tepuy` no está en esta pasada.

**J.** De las seis del pedido, solo Los Miradores y Templos de la Colina son Ancient. Atalayas, Monumentos, Puerta y Ladera son Savage: la crema del Ancient no les toca. La Otra Orilla, puesta en K, es la ciudad de piedra del este y conserva una torre beige. Templos se lee desde el aire; desde el suelo la cámara atraviesa el muro (`kelvin_aldea_colina_camino.jpg`).

**K.** El tejado rojo se ve. Falta la empalizada que flota en Villa Raíz (`kelvin_aldea_rio_este_camino.jpg`), el bloque blanco, Los Portales como paso, Puerto de La Mina como embarcadero con sus tres torres, y los toldos del Campamento, que están tumbados. El Embarcadero es el que mejor se lee.

**D.** En el llano ya no están las hojas gigantes. Siguen los árboles sueltos y el suelo a la vista, y en el borde del tepuy las matas redondas. No es el dosel continuo de 2022.

No se publicó `sitio/`.
