# Interacción de Vittata con los elementos del mundo

Pedido de Kelvin: Vittata es un ave y tiene que poder pararse y posarse sobre los edificios y los elementos del mundo. Dueño: rol Movimiento y animación. Código: `src/engine/solidos.js` (nuevo), `fisica.js`, `camara.js` y la pose de posarse de `character.js`.

## Cómo funciona ahora

- **Colisión de la geometría real.** `solidos.js` rasteriza los triángulos de los GLB ya colocados en la escena, sin cajas a mano. Usa un mapa de alturas por capas (2,5D) con celdas de 0,3 m; cada celda tiene hasta 2 tramos [bajo, alto] y la pendiente de su cara de arriba.
  - **Fuentes:** edificios `edificios:*` (también InstancedMesh y `G.solidos.agregar()` para el streaming), estructuras `estructura:*`, el taller y las estacas, rocas, troncos caídos y la corteza de los árboles. Las hojas no cuentan.
  - **Paredes:** chocan y se desliza por ellas. Un paso nunca mete más el cuerpo en un sólido, tampoco al subir o bajar un escalón.
  - **Arriba:** techos, cornisas, cumbreras, rocas y ramas son suelo para quien llega desde arriba (`suelo`). Al subir, la cabeza no atraviesa un techo (`techo`).
  - **Lo fino:** se detecta un tramo estrecho con caída a ambos lados (`fino`): rama, baranda, poste, cumbrera o punta de un techo cónico. Al bajar cerca (0,6 m), una ayuda la centra encima. Ahí `MOVE.posado = 'fino'` y la pose de posarse: agachada, patas juntas, dedos cerrados agarrando si no lleva calzado y un leve balanceo.
  - **Huecos:** los del modelo vistos desde arriba se tapan, como la punta abierta de los bohíos. Ya no se cae dentro por ahí.
  - **Colliders a mano:** los de kind `edificio`, `estructura`, `arbol`, `taller` y `post` se ignoran donde hay sólido; si no, empujarían fuera de un techo.
  - **Perchas del diseño** (la ruta de la gota): su columna de aire manda sobre las ramas.
  - **Cámara:** no se mete dentro de edificios ni rocas.
- **Presupuesto (móvil):**
  - **Memoria:** 13 bytes por celda. Edificios, estructuras y contenido ocupan 0,44 MB. La flora va por regiones de 24 m en 40 m alrededor del jugador (0,2–0,6 MB) y se descarga al alejarse.
  - **Construcción:** por tandas de 5 ms por cuadro.
  - **Consultas:** `fisica.step` cuesta 0,024 ms por cuadro con los sólidos (medido) y cada consulta de suelo o pared, ~1,3 µs.
- **Ajuste:** `G.solidos.SO` (escalón 0,45 m, cuerpo 1,5 m, radio 0,32 m, caída para "fino" 0,45 m, regiones) y `TUNING.perchAssist` en fisica.js.

## Matriz (auditoría automática, 31 edificios de Kelvin + elementos)

**Columnas:**
- **Choca:** 8 entradas caminando desde 10 m hacia el centro; "sí" = nunca se mete (penetración máx. ≤ 2 de 11).
- **Se para:** aterriza con V desde 4 m sobre lo más alto y se queda 3 s; Δ = cuánto se mueve en esos 3 s.
- **Se posa:** `posado` resultante: fino = pose de posarse.
- **Despega:** V desde ahí.

| Elemento | Choca | Se para (alto) | Se posa | Despega | Problema encontrado | Arreglo |
|---|---|---|---|---|---|---|
| Bohío redondo (×2) | sí | sí (2,5–3,4 m, Δ 0) | fino en la punta | sí | Caía dentro por la punta abierta del techo | Huecos rellenados |
| Bohío puntiagudo | sí | sí (5,6 m) | fino en la punta | sí | Collider de cilindro: no se podía subir | Sólido real |
| Casa de paja (×2) | sí | sí (5,0–5,1 m) | fino en la cumbrera | sí | Ídem | Ídem |
| Caney largo | sí | sí (6,7 m) | fino en la cumbrera | sí | Ídem | Ídem |
| Toldo pequeño | roza (4/11 bajo el toldo) | sí (3,1 m) | fino | sí | Al pasar por debajo, la cabeza roza la lona | Aceptado: el toldo es bajo (P2: agacharse) |
| Casa plataforma (refugio) | sí | sí (6,4 m) | fino | sí | Subiendo la rampa se metía bajo el techo del porche | Paso que mete más el cuerpo, revertido |
| Mirador escalonado | sí | sí (10,5 m) | fino | sí | Solo chocaba su núcleo | Sólido real; sus pisos siguen como plataformas |
| Torre vigía | sí | sí (7,2 m) | alto | sí | Collider de caja: no se podía subir | Sólido real |
| Templo mediano / grande | sí | sí (9,8 / 21,4 m) | alto / fino | sí | Ídem; interiores cerrados | Sólido real; interiores P2 (macizos) |
| Ruinas: portal, torre, mirador, altar (×2) | sí | sí (2,0–14,1 m) | alto o fino | sí | Ídem | Ídem |
| Pilares de ruina (×4) | sí | sí (8,5–8,8 m) | fino | sí | Bajando la cuesta junto al pilar se metía en la base | Comprobación también al bajar |
| Empalizada (×3, cerca) | sí | sí (3,7 m) | fino en las puntas | sí | Collider de caja | Sólido real |
| Canoas (×2, botes) | sí | sí (0,6–1,0 m) | alto | sí | Sin colisión (excluidas a propósito) | Sólido real |
| Muelle de troncos (×4) | sí | sí, sobre la cubierta | posa en los pilotes | sí | — | La cubierta sigue como plataforma; pilotes, sólidos |
| Puente de madera y puente colgante | sí | sí (cubierta) | fino en el pasamanos rígido | sí | Postes con colliders de 0,3 m | Sólido real. La cuerda floja no es percha (P2) |
| Taller de Vittata | sí | sí (3,4 m) | fino en la punta | sí | Su collider la empujaba fuera del techo | Collider `taller` sustituido por el sólido |
| Estacas y letreros de los terrenos (postes) | sí | sí (hasta 5,9 m) | fino | sí | Collider sin altura | Collider `post` sustituido. Una estaca (72,177) sigue con su collider: su grupo está lejos del punto |
| Rocas con musgo (a, b) | sí | sí (0,3–7,5 m) | alto o fino | sí | Sin colisión | Sólido real |
| Piedras del río | sí | bajo el agua: nada | — | sí | — | Correcto (están sumergidas) |
| Troncos caídos | sí | sí | alto | sí | Sin colisión | Sólido real |
| Árboles (ceiba, tabonuco, flamboyán, yagrumo, árbol enano, palma, helecho arbóreo, bambú) | sí (tronco) | sí, en ramas de 2,8 a 8,6 m | fino, con pose de posarse | sí | Solo un cilindro en el tronco; ni ramas ni copa | Corteza rasterizada por regiones |
| Grutas | sí | — | — | — | — | Sólido real (rocas de la gruta) |

Capturas para Kelvin: `docs/img/mov_techo.png` (parada en el techo del taller y en la cumbrera del caney) y `docs/img/mov_rama.png` (posada en una rama de tabonuco y en un pilar de las ruinas).

Pruebas nuevas en `AV.movementTest` (26 de 26): aterrizar en el techo de un edificio y quedarse 3 s sin moverse (Δ 0), despegar desde el techo, no atravesar una pared (penetración 0) y posarse en una rama. También pasan `selfTest` 52/52, `eduTest` 63/63, `missionTest` 35/35, `accessoryTest` 12/12, `maestroTest` 22/22, `saveTest` 27/27, `comicTest` 19/19 y `templateTest` 19/19.

## Pendiente (P2)

- Interiores de los edificios grandes: ahora son macizos. No se atraviesan, pero no se puede entrar.
- Agacharse bajo toldos bajos.
- Posarse en cuerdas y lonas (puente colgante, toldo): no son rígidas.
- Con viento, las ramas se mueven en el shader y la colisión no, así que pueden separarse unos centímetros. Se puede calmar el viento cerca de Vittata cuando está posada.
- Coordinación: el streaming de edificios (InstancedMesh `edificiosInst:*`) llamará `G.solidos.agregar(grupo)` por instancia. El level designer puede usar InstancedMesh `edificios:*`, que se recorre instancia a instancia.
