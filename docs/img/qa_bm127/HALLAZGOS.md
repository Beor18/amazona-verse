# BM127 · QA visual con GPU de los caps. 5 y 6 con el mapa real (2-nov-2026)

Chrome con Metal, calidad alto, `?pack=ep5|ep6&mapa=real#fps`, 1280×720, vista a vista con teleport (`tools/build/qa_2nov.py --url`). Una captura por vista clave de `MUNDO_UNICO.md`; el FPS es el de la Mac con otras ventanas en marcha (orientativo, no móvil).

| Vista | Captura | FPS (triáng.) |
|---|---|---|
| Cap. 5 · taller | `e5_taller.png` | 27 (1,5 M) |
| loma baja | `e5_loma.png` | 15 (2,6 M) |
| torre | `e5_torre.png` | 12 (3,1 M) |
| mirador | `e5_mirador.png` | 14 (2,2 M) |
| pilar | `e5_pilar.png` | 23 (3,2 M) |
| Puerta del Yunque (Guardián) | `e5_puerta.png` | 15 (3,4 M) |
| portal | `e5_portal.png` | 25 (3,4 M) |
| Cap. 6 · río (aparición) | `e6_rio.png` | 25 |
| muelle | `e6_muelle.png` | 13 |
| puente | `e6_puente.png` | 8 (3,7 M) |
| canoas | `e6_canoas.png` | 11 |
| plaza (Ciudad) | `e6_plaza.png` | 10 (3,4 M) |
| mirador | `e6_mirador.png` | 12 |
| Guardián | `e6_guardian.png` | 26 |

## Hallazgos (para Kimi; no se arregla aquí)
1. **FPS bajos con el mapa real:** 8–27 fps, casi siempre < 15, con 1,5–3,7 M triángulos y 90–155 draw calls. Peor: puente y plaza del cap. 6 (8–10 fps) y torre del cap. 5 (12). Es el peso de la meseta y la isla completa; en móvil será peor. Coincide con la espera de KIMI-Task-001 a 003.
2. **Cap. 5 se ve de día:** `S.hora` = 21 pero el cielo y la luz de las capturas son de sol pleno (la URL llevaba `calidad=alto` y no forzaba clima; no se probó si `?clima=` pisa la hora). Revisar que la noche del cap. 5 se vea de noche con el mapa real.
3. **Piezas sobre el suelo:** ninguna flota ni queda metida (cap. 5: 12 interacciones, cap. 6: 20, altura dentro de 0,6 m del terreno real). Solo `percha_v` y `colocar` del cap. 6 quedan sobre el agua, como estaba previsto (puente).
4. **Flora en el agua:** ninguna vista del río (cap. 6: río, muelle, puente, canoas) muestra palmas ni arbustos dentro del agua; las orillas se ven limpias.
5. **Cap. 5 taller:** la vista deja el taller entre la escalera de piedra y el borde; el HUD y el diálogo tapan parte, pero el sitio es jugable. Sin errores de consola en ninguna de las dos pasadas.
