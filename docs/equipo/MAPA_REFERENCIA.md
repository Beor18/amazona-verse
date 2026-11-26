# Mapa · inventario contra la referencia (25-nov)

Decisión de Kelvin (18-nov, vigente el 25-nov): el mapa se queda como está, en **vibrant toon**. No se mueve el río, ni las ciudades, ni los caminos, ni los objetivos. Solo se agrega lo que falta o no se ve. La referencia (`docs/img/referencia_mapa_kelvin.jpg` y `docs/img/referencia_logo_antes.jpg`) es arte propio y sirve para la distribución, no para copiar el render.

Medido en los datos, sin GPU: `assets/data/mapa_cap1.js`, `assets/data/escena_kelvin_cap1.json` (376 instancias, 375 en `compacto`) y `assets/models/edificios/kit.js`. SwiftShader no cambia qué entra en la escena.

## Banderas

| Bandera | Qué hace con el mapa |
|---|---|
| `?expansion=1` | Ya no existe. La patrulla y Construir salen al jugar (`invasoras.js`, `construir.js`). |
| `?interiores=1` | Enciende interiores (`?interiores=0` los apaga). No esconde los edificios de fuera. |
| `?hd400=1` | Fuerza el `_hd` de 400 mil triángulos de `complejo_ruinas`. En escritorio va encendido; en teléfono pequeño, apagado. `?hd400=0` lo quita. No quita piezas del mapa. |
| `?menu=completo` | Devuelve el menú de antes (`G.menuRecorte`). No toca edificios, puentes ni el río. |

Ningún asentamiento del capítulo 1 está apagado por una de estas banderas.

## Qué pide la referencia y qué modelo ya hay

| De la referencia | Modelo del kit | Dónde está hoy | Por qué no se lee igual |
|---|---|---|---|
| Ciudad de torres color crema sobre peñasco | `templo_grande`, `templo_mediano_*`, `ruina_torre*`, `ruina_mirador` | `kelvin_ruinas_yunque` (57) y `kelvin_ruinas_yunque_2` (23), sobre el tepuy | Ya está. El estilo es vibrant toon, no el render de la referencia. No se mueve a las esquinas. |
| Aldea de techos rojos, torres de punta y puente | `bohio_redondo`, `bohio_puntiagudo`, `casa_paja_*`, `torre_vigia`, `puente_madera` | Río del este (Villa Raíz, 42), río del este 2 (29), meandros (25) | Los tejados son del kit Savage. Varias aldeas no tienen torre de punta ni un puente que cruce el agua. |
| Chozas redondas de paja | `bohio_redondo` | 45 en seis aldeas | Lomas, Colina, Yunque, meandros 2, río del este 3 y río del oeste 2 no tienen ninguna. |
| Fuerte de piedra oscura | `muralla_atalaya_a/b`, `muro_roca`, `portal_puas` | Río del este, oeste, Colina, Yunque, La Mina 2 | Ya está en esas aldeas. No se añade muralla nueva (el radio del modelo es grande y taparía camino). |
| Casa rectangular con patio | `casa_paja_a/b`, `casa_plataforma`, `caney_largo` | Río del este, meandros, Yunque, La Mina | Ya está. No se duplica en Villa Raíz. |
| Templo o pagoda gris | `templo_*` del kit Ancient | Las dos ruinas del tepuy y piezas en el río del este 2 y la Colina | Ya está sobre el peñasco. |

## Por asentamiento

«En escena» = `escena_kelvin_cap1.json`. «Se ve» = entra en `compacto` y el streaming lo dibuja (cerca por instancia, lejos en la malla de la zona). No hace falta GPU para saber si está en la lista.

| Asentamiento | Datos | En escena | Se ve | Hueco respecto a la referencia |
|---|---|---|---|---|
| Ruinas · El Yunque (`kelvin_ruinas_yunque`) | 57 piezas Ancient (torres, templos, muros, losas) | 57 | 57 | La ciudad del peñasco. No se mueve. |
| Ruinas · El Yunque 2 | 23 piezas Ancient | 23 | 23 | Segunda ciudad de piedra. No se mueve. |
| Río del este · Villa Raíz | 42: 13 bohíos, empalizadas, 3 casas, murallas, 2 torres, 1 `puente_madera` en seco (126,7, 78,1) | 42 | 42 | El puente colgante de la historia es el de `estructuras.puente` (157,9, 136,5). **No se toca.** |
| Río del este 2 | 29: 12 bohíos, 7 torres en ruina, templos, 1 bohío de punta | 29 | 29 | Aldea con techos y torres. Sin puente sobre el agua. |
| Río del este 3 | 21: 6 `puente_madera`, torres, muralla | 21 | 21 | `k367` nació en el río (76,2, 15,9) y el ajuste lo dejó en seco, a 19,5 m. El hueco del cruce sigue vacío. |
| Río del oeste | 35: 8 canoas, bohíos, murallas, carpas | 35 | 35 | Canoas ya en el agua. Sin choza de punta. |
| Río del oeste 2 | 18, casi todo campamento; 1 canoa | 18 | 18 | Sin bohío redondo. |
| Lomas del Oeste | 34: 11 torres de vigía y carpas | 34 | 34 | Sin choza redonda. |
| La Mina | 25 en el JSON, 24 en `compacto` | 25 | 25 | `k187` (`monumento_c`) ya no está oculto: va al lado del sendero `la_mina`, en 94,28 , −68,5 (27,5 m al norte del sitio original). La huella queda a 3,7 m del eje y fuera de la quebrada. |
| La Mina 2 | 23: torres, canoas, muralla, 1 casa | 23 | 23 | Canoas en el río. |
| Meandros | 25: 10 bohíos, 9 canoas, 1 de punta, casas | 25 | 25 | Aldea de techos junto al río. |
| Meandros 2 | 11 y 1 `puente_madera` | 11 | 11 | `k368` nació en el río (−85,9, −46,8) y quedó en seco. Casi no hay casas. |
| Colina | 22: losas, murallas, complejo | 22 | 22 | Fuerte de piedra, sin choza redonda. |
| Yunque (puerta) | 11: torres, murallas, 1 casa, 1 canoa | 11 | 11 | Sin bohío de punta. |

## Caminos y el río

Los 15 senderos de `mapa_cap1.js` no entran en el polígono del río ni de la quebrada (el más cercano, `puente_sur`, queda a 2 m del agua: es la cabecera del puente de Villa Raíz). `mapa_sendas_kelvin.json` se generó sin el río, así que tampoco lo cruza.

Los dos cruces que el layout sí tenía, y que hoy no se ven, son los `puente_madera` apartados del agua:

| Id | Dónde nació (sobre el río) | Dónde está ahora | Ancho del río |
|---|---|---|---|
| `k367` | 76,2 , 15,9 · nivel 5 m | 58,2 , 23,4 · en seco, a 13 m de la orilla | 12,1 m |
| `k368` | −85,9 , −46,8 · nivel 12 m | −82,5 , −55,1 · a 6 m de la orilla | 10,8 m |

No se mueven esas piezas (ya forman parte de la aldea) ni el puente de Villa Raíz. El puente nuevo va en el hueco, con el mismo modelo.

## Qué se agregó (mismos modelos, sin textura nueva)

Entra en `reubicar` de `content/cap1/mundo.js` (`faltanB1`), una vez, como las plazas. `yExacta` solo en el agua: si no, el lecho se traga el puente. La casa usa la altura del terreno. Nada de esto está en Villa Raíz ni mueve un camino.

| Pieza | Zona | Dónde | Escala |
|---|---|---|---|
| `puente_madera` | río del este 3 | 76,43 , 5,0 , 15,88 · cruza el hueco de `k367` | 1,68 (largo ~16,5 m, el río mide 12,1) |
| `puente_madera` | meandros 2 | −88,01 , 15,3 , −44,62 · cruza el hueco de `k368`; las dos orillas están a 15,6 m | 1,54 |
| `canoa` | río del oeste | −169,3 , 14,0 , 54,3 · tramo sin canoa a 28 m | 0,84 |
| `canoa` | meandros | −51,4 , 11,0 , 47,6 | 0,84 |
| `bohio_redondo`, `bohio_puntiagudo`, `torre_vigia` | meandros 2 | −81,7/−65,1 · −77,4/−75,6 · −68,9/−81,1 | 0,84 |
| `bohio_redondo` | río del oeste 2 | −137,4 , −53,1 | 0,84 |
| `bohio_redondo` | Lomas | −105,6 , 95,8 | 0,84 |
| `bohio_redondo` | Colina | −8,4 , 148,6 | 0,84 |
| `bohio_puntiagudo` | Yunque | −13,0 , −70,3 | 0,84 |

Las zonas no crecen de radio (cada pieza cabe en el radio que ya tenía), así que el cerca del arranque no pide un modelo nuevo. El criterio de la noche es la vista de arranque de `test.sh` (draw calls y MB de texturas), no el FPS.

Medido en SwiftShader, misma config de nube, dpr 0,5:

| | Draw calls | Texturas |
|---|---:|---:|
| Antes (`d822c594`, solo la medida) | 112 | 48,9 MB |
| Después (`03b9d9f6`, las 12) | 112 | 48,9 MB |

En las vistas del río, al mirar el puente nuevo, las llamadas no suben (92 y 60, igual que antes) y las texturas siguen en 378,9 MB. En la aldea de meandros 2, con el bohío de punta y la torre a la vista, suben 3 llamadas (74→77 en el aire, 114→117 en el suelo): son lotes de modelos que esa vista no tenía cerca. Las texturas no cambian.

Capturas SwiftShader, mismo encuadre: `docs/img/mapa_antes_*.png` y `docs/img/mapa_despues_*.png` (aire y suelo del cruce del este, aire del meandro y suelo de meandros 2).

## Lo que no se agrega

- Aves nuevas como colonia del álbum: `album.js` exige exactamente esos 9 lugares. El 26-nov se añadieron 3 cruces de 4 aves en las mismas 2 mallas (`EXTRA`), sin colonia nueva. Capturas: `docs/img/mapa_antes_aves_rio.png` y `docs/img/mapa_despues_aves_rio.png`.
- El monumento `k187` ya está al lado del camino (26-nov). Capturas: `docs/img/mapa_antes_k187_aire.png`, `mapa_antes_k187_suelo.png`, `mapa_despues_k187_aire.png`, `mapa_despues_k187_suelo.png`.
- Murallas o templos nuevos: el modelo es grande y el fuerte y la ciudad ya están.
- Nada en `kelvin_aldea_rio_este` (Villa Raíz): esa zona entra en el cerca del arranque y el puente de la historia es de ahí.
