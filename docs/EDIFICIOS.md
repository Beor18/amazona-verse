# Edificios (kit web)

Fuente: `04_Mapa_3D/AV3DMaxExportBuildings/AV3DMaxExportBuildings.max` (3ds Max 2015, 2,4 GB), leído por streaming sin 3ds Max (pico 0,9 GB). Lámina: `docs/img/edificios_kit.png`.

## Convenciones

- Metros, Y arriba, pivote en el centro de la base (y = 0). El frente es el del kit original.
- 1 unidad Max = 0,3048 m; escalas normalizadas para un jugador de 1,8 m.
- ≤ 5 000 tris, 1 malla, materiales simples: color base JPG 512/256 px, rugosidad 0,9.
- `<nombre>_glb.js` define `window.AV_EDIFICIOS_B64["<nombre>"]`.

## Catálogo

| nombre | kit · pieza KB3D | tris | KB glb/js | ancho×alto×fondo m |
|---|---|---|---|---|
| bohio_redondo | Savage · Hut_RoundThatched | 3368 | 415/553 | 6,3×3,6×6,4 |
| bohio_puntiagudo | Savage · Hut_RoundPointed | 3343 | 446/595 | 9,4×5,9×6,1 |
| casa_paja_a | Savage · BldgA | 3567 | 421/561 | 8,3×5,3×8,5 |
| casa_paja_b | Savage · BldgB | 3579 | 389/519 | 14,9×5,4×14,6 |
| casa_plataforma | Savage · HutWithDeck | 3682 | 450/601 | 15,0×7,8×11,0 |
| caney_largo | Savage · Hall_Long | 3471 | 557/743 | 22,3×7,1×6,9 |
| cercado_redondo | Savage · Hall_Round | 4029 | 483/644 | 14,4×4,8×14,4 |
| torre_vigia | Savage · TowerA | 4542 | 452/602 | 8,2×7,9×4,8 |
| mirador_escalonado | Savage · TieredLookout | 4292 | 534/713 | 10,8×11,1×10,8 |
| puente_madera | Savage · Bridge | 3320 | 458/611 | 9,8×6,0×2,6 |
| muelle_troncos | Savage · Wall_PikesSM (acostada, como en la escena) | 1680 | 185/247 | 7,2×0,6×3,9 |
| empalizada | Savage · Wall_PikesSM | 1680 | 185/247 | 7,2×3,9×0,6 |
| toldo_pequeno | Savage · CampB | 3246 | 255/340 | 3,4×3,3×3,3 |
| canoa | propia del .max (Box + TurboSmooth) | 432 | 97/130 | 3,8×0,6×1,0 |
| ruina_torre | Ancient Temples · Component_TowerA | 3770 | 474/632 | 6,5×14,1×6,5 |
| ruina_mirador | Ancient Temples · Component_Lookout | 1916 | 241/322 | 5,5×10,4×14,8 |
| ruina_pilar | Ancient Temples · Component_PillarC | 740 | 247/330 | 2,5×8,8×2,7 |
| ruina_portal | Ancient Temples · Component_GateB | 2641 | 349/466 | 7,3×9,5×3,4 |
| ruina_altar | Ancient Temples · Component_Altar | 2408 | 331/442 | 2,0×2,0×1,7 |
| templo_mediano | Ancient Temples · MediumE | 4043 | 438/585 | 10,7×9,8×12,4 |
| templo_grande | Ancient Temples · LargeB | 4212 | 509/679 | 38,0×21,8×27,8 |

Optimización: sin `Lashing`, `Debris` ni piezas diminutas (templos: tampoco `Damage`, `Deco`, `Beams`, `Sculpt`, `Bricks`); troncos `Pikes` re-topologizados como prismas; el resto con *collapse decimate*.

## Migración fiel (fuera del juego)

`04_Mapa_3D/migrado/` (478 MB): 74 `.glb` con toda la geometría (8,6 M tris, suavizado, UV, multi/sub, TurboSmooth y UVW Map re-aplicados) y texturas referenciadas por URI relativa a los originales. `escena_layout.json` coloca las 377 instancias; `lamina_migrado.png` las muestra.

## Licencias

- KitBash3D *Savage* y *Ancient Temples*: licencia confirmada por Kelvin.
- `canoa` usa `canoa.jpg` (`WORK/Amazonas/references`), de origen desconocido: verificar o reemplazar.
