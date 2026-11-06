# Capturas de la demo V18.1 (BM147)

Build de `origin/main` (0feef5ab), `index.html?v18=1&calidad=medio`, 1440×900, vista del jugador con el HUD visible. Generador: `tools/build/bm147_capturas.py` (las 6 en una sola partida nueva; la cámara siempre mira a Vittata, que en las dos primeras queda fuera de plano).

- `docs/img/v18/cotorra.jpg`: la cotorra de Dominica posada en su copa del borde del bosque, cerca de Villa Raíz (piel provisional verde con frente roja).
- `docs/img/v18/reto.jpg`: empieza el reto de seguirla («¡Síguela de copa en copa! Tienes 50 segundos.»); ella ya vuela hacia la primera percha.
- `docs/img/v18/duelo.jpg`: el duelo de entrenamiento contra la Campeona de la Explanada, con el HUD de energía, los botones Ala / Semilla / Grito del Yunque y las plumas de cada una.
- `docs/img/v18/puente_roto.jpg`: el puente colgante de El Yunque en su estado inicial, con el centro sin tablas y los dos tramos de las orillas.
- `docs/img/v18/puente_reparado.jpg`: el mismo puente tras repararlo (estado `reparado`), con el tablero completo.
- `docs/img/v18/corriente.jpg`: Vittata volando sobre el centro del puente reparado, donde está la corriente que la sube (se ve ya a 23 m, frente a los 11 m del tablero).

Notas: en `puente_roto` y `puente_reparado` el aviso «Descubriste Orilla del río…» y el de la pista de la cotorra pueden verse arriba; en `duelo` el diálogo de Iguaca se cerró solo. El puente roto sigue siendo el `puente.glb` con triángulos ocultos (BM138 y BM146 aún no están conectados a `reparar.js`).

## Demo nueva con GPU real (BM153)

Build de `HEAD` (c738728), `index.html?v18=1&clima=sol&calidad=medio`, 1440×900 con Metal (GPU real), HUD visible. Generador: `tools/build/bm153_capturas.py` (una sola partida; las escenas se fuerzan con `iniciar({ forzar: true })` y la cámara siempre sigue a Vittata, verde provisional).

- `docs/img/v18/demo2_sombra_antes.jpg`: la Sombra de Tormenta sobre el río, nube oscura con ojos amarillos y el HUD de 3 aciertos.
- `docs/img/v18/demo2_sombra_dispersa.jpg`: la Sombra disolviéndose (fase `disuelve` a 0,35 s, forzada a mano): queda una bruma azulada sobre el agua.
- `docs/img/v18/demo2_serpiente.jpg`: la Serpiente de la Maraña en espiral con los 2 primeros nudos sueltos y el siguiente dorado.
- `docs/img/v18/demo2_sapo.jpg`: el Sapo Encantado (roca verde, ojos y boca oscura forzada abierta en `abierta=5`) junto a la Poza Honda; el HUD de la Sombra no aplica.
- `docs/img/v18/demo2_duelo_quiebro.jpg`, `demo2_duelo_lluvia.jpg`, `demo2_duelo_ojo.jpg`, `demo2_duelo_ala.jpg`: duelo de entrenamiento justo tras usar Quiebro (agilis), Lluvia de semillas (barbadensis), Ojo del cenote (xantholora) y Ala fuerte (farinosa).
- `docs/img/v18/demo2_minigolf.jpg`: el minigolf de Villa Raíz (hoyo 1, par 3) con la semilla, el nido y los 2 troncos, ya elegido «1 jugador».
- `docs/img/v18/demo2_poder_abanico.jpg` y `demo2_poder_semilla_rio.jpg`: Abanico de colores (guildingii) y Semilla de río (diadema) recién usados.

Notas: en las capturas de duelo Vittata mantiene su piel verde (no cambia por especie) y la rival queda a ~2 m por el despliegue forzado; en el sapo el árbol cercano a veces tapa un poco el cuerpo. En `demo2_minigolf` se ve arriba el aviso de lugar descubierto. Salen 11 (no 10) porque la Sombra lleva dos.
