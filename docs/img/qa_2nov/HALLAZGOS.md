# BM121 · QA visual con GPU (2-nov-2026)

Capturas con el Chrome de Metal de `tools/build/qa_2nov.py` (los pasos son los de la sesión; cada PNG se ve en esta carpeta).

| Revisado | Captura | Resultado |
|---|---|---|
| Familia de Iguaca en el refugio de la colina (cap. 1) | `qa2nov_familia_refugio.png` | Bien: la Abuela y el Papá quedan en la puerta (+1,5 / −1,5 m, +2,2 m), visibles, con el refugio y las estacas de B. El vuelo de llegada (3 s) no se capturó: es una animación. |
| Retratos en los diálogos (Abuela, Papá, Iguaca, Vittata, Guardián, Voz) | `ret0`–`ret5.png` | Bien. El de Iguaca queda recortado a la izquierda (se ve más el cuerpo que la cara): arte provisional, ya en CANON_REGISTRY. |
| Piel verde v4 de Vittata en el juego y en el creador | `qa2nov_flora_fundido.png`, `creador_vittata.png`, `creador_piel_v4.png` | Bien, mismo verde en ambos. |
| Las pieles en el creador | `qa2nov_pieles_creador.png` (34 plumajes), `c_aestiva`, `c_ventralis`, `c_oratrix` | **Fallo, arreglado:** solo se veían las 7 especies de `SPECIES` (oratrix, amazonica, guildingii, versicolor, festiva, albifrons, agilis); las otras 27 (aestiva, ventralis, finschi…) volvían a vittata en `applyLook` y en los retratos porque `normalizeLook` de `character.js` no conocía las especies con piel. Ahora las conserva (`character.js`, 1 línea) y `pielesTest` lo comprueba (aestiva). |
| Fundido de la flora (B1) | `qa2nov_flora_fundido.png`, `qa2nov_flora_sin_fundido.png` | Bien: la palma entre la cámara y Vittata se ve con tramado. |
| Máquina, transmisor (apagado y encendido), banco y coquí | `qa2nov_maquina.png`, `qa2nov_transmisor_*.png`, `qa2nov_banco.png`, `qa2nov_coqui.png` | Bien. El banco solo se ve tras la mejora (`bench.visible`), como debe. |

Pruebas con el arreglo: 13 baterías en verde salvo `movementTest` 47/49 y luego 48/49 («Corriendo cuesta abajo no se despega del suelo», 40 % de cuadros en el suelo; la primera vez también «Cernido»). Es de tiempos con la Mac cargada y no toca esta zona (solo cambió `normalizeLook`); la sesión principal repite antes de publicar.
