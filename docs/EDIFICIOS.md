# Edificios de Kelvin (kit web)

Fuente: `04_Mapa_3D/AV3DMaxExportBuildings/AV3DMaxExportBuildings.max` (3ds Max 2015, 2,4 GB), leída por streaming sin 3ds Max.
- Migración fiel: `04_Mapa_3D/migrado/`, con 74 GLB y `escena_layout.json` (377 instancias).
- Kit web: 64 modelos, que cubren 73 de los 74 assets y 376 de las 377 instancias. `ancient_largej_sculptmd` se descarta: tiene 12 caras y mide 0.
- Pipeline: `tools/blender/edificios_*` (lotes con `edificios_lotes.sh`).
- Lámina: `docs/img/edificios_kit.png`.

## Convenciones
- Metros, Y arriba y pivote en el centro de la base (y = 0). 1 unidad Max = 0,3048 m.
- Tris: ≤5 000 en edificios y ≤1 500 en props (carpas, campamentos, losas, pilares, torres pequeñas, muros). La media es de 201 KB por `_glb.js`.
- Texturas compartidas en `tex/`: 14 JPG de 512 px en repetición, referenciados por uri.
  - Un material por textura, con el mismo nombre en todos los modelos y 1–3 materiales por modelo.
  - Paleta Savage: RoofThatched, WoodPlanks, WoodHewn, BarkNew, TarpFabricDamaged, RockSharp, MudRocky.
  - Paleta Ancient: stoneM, wallL, pillarsM, floorM, mudM, beams. Más `canoa`.
  - No hay un atlas único porque las UV de KitBash repiten hasta 30 veces.
- Lejano: `<nombre>_lejos(.glb|_glb.js)` con la clave `<nombre>_lejos`. Tiene ≤25 % de los tris y ≤600, un solo material `AV_Lejos` con color de vértice, y el mismo pivote.
- `kit.js` define `window.AV_EDIFICIOS_KIT`: tris, trisLejos, radio, alto, kb y mats.
- `conversion.json` da, por asset migrado, `M` (web = M·p_migrado), `k` y `c`. Las variantes `_v2` reutilizan su base; las losas `_v4`…`_v7` usan una M no uniforme.
- Retopología:
  - Savage: los troncos `Pikes` pasan a prismas; las sogas (`Lashing`) y los escombros (`Debris`) se quitan.
  - Ancient: remallado por vóxeles de las piezas que el decimado no reduce.
  - templo_grande_a, _d y _f y complejo_ruinas: modelo entero con *solidify*, remallado por vóxeles (0,15 m; 0,3 m en el complejo), plano y colapso a ≤5 000 tris. El material es el de la cara original más cercana y la textura del kit va reproyectada en caja.

## Catálogo
| nombre | kit · pieza KB3D | tris | KB js | tris lejano | instancias |
|---|---|---|---|---|---|
| bloque_piedra | propio · Box | 12 | 3 | 12 | 4 |
| bohio_puntiagudo | Savage · Hut_RoundPointed | 3269 | 200 | 586 | 4 |
| bohio_redondo | Savage · Hut_RoundThatched | 3282 | 180 | 590 | 45 |
| campamento_a | Savage · CampA | 702 | 70 | 131 | 1 |
| campamento_c | Savage · CampC | 1375 | 70 | 332 | 4 |
| campamento_f | Savage · CampF | 921 | 55 | 216 | 1 |
| caney_largo | Savage · Hall_Long | 1936 | 228 | 450 | 2 |
| canoa | propio · Box | 432 | 24 | 104 | 32 |
| carpa_a | Savage · SavageG1_V | 1041 | 88 | 251 | 6 |
| carpa_b | Savage · SavageG1_V | 925 | 84 | 224 | 4 |
| carpa_c | Savage · SavageG1_V | 882 | 89 | 209 | 4 |
| carpa_d | Savage · SavageG1_V | 1054 | 89 | 254 | 6 |
| carpa_e | Savage · SavageG1_V | 1411 | 72 | 341 | 17 |
| carpa_f | Savage · SavageG1_V | 1411 | 71 | 341 | 1 |
| carpa_g | Savage · SavageG1_V | 1038 | 85 | 246 | 1 |
| casa_paja_a | Savage · BldgA | 3480 | 198 | 558 | 4 |
| casa_paja_b | Savage · BldgB | 3503 | 215 | 550 | 3 |
| casa_plataforma | Savage · HutWithDeck | 3568 | 292 | 513 | 3 |
| cercado_redondo | Savage · Hall_Round | 2957 | 298 | 572 | 2 |
| complejo_ruinas | Ancient Temples · Group001 (torres y templos unidos) | 4711 | 473 | 582 | 1 |
| corral | Savage · Pen_Fabric001 | 4017 | 328 | 467 | 1 |
| empalizada | Savage · Wall_PikesSM | 1008 | 81 | 248 | 25 |
| losa_piedra | propio · Box | 12 | 3 | 12 | 9 |
| mirador_escalonado | Savage · TieredLookout | 3685 | 330 | 456 | 3 |
| monumento_a | Savage · MonumentA | 4397 | 339 | 542 | 9 |
| monumento_b | Savage · MonumentB | 1588 | 215 | 384 | 1 |
| monumento_c | Savage · MonumentC | 3705 | 289 | 577 | 2 |
| monumento_d | Savage · MonumentD | 1905 | 236 | 459 | 1 |
| monumento_e | Savage · MonumentE | 3198 | 300 | 539 | 1 |
| monumento_f | Savage · MonumentF | 2736 | 268 | 511 | 2 |
| monumento_g | Savage · MonumentG | 2864 | 292 | 570 | 1 |
| muelle_troncos | Savage · Wall_PikesSM | 1008 | 81 | 248 | 0 |
| muralla_atalaya_a | Savage · Wall_WatchtowerA | 4171 | 340 | 510 | 6 |
| muralla_atalaya_b | Savage · Wall_WatchtowerB | 3165 | 319 | 580 | 16 |
| muro_roca | Savage · Wall_Rock | 871 | 80 | 175 | 9 |
| muro_templo | Ancient Temples · MediumJ_WallM | 1410 | 112 | 340 | 8 |
| plataforma_piedra | propio · Box | 12 | 3 | 12 | 4 |
| portal_madera_a | Savage · EntranceA | 4110 | 323 | 576 | 3 |
| portal_madera_b | Savage · EntranceB | 4607 | 355 | 583 | 4 |
| portal_madera_c | Savage · EntranceC | 3298 | 333 | 586 | 3 |
| portal_puas | Savage · Entrance_Spiked | 2732 | 304 | 543 | 2 |
| puente_madera | Savage · Bridge | 3237 | 307 | 591 | 8 |
| ruina_altar | Ancient Temples · Component_Altar | 1107 | 86 | 245 | 1 |
| ruina_mirador | Ancient Temples · Component_Lookout | 1916 | 98 | 463 | 10 |
| ruina_pilar | Ancient Temples · Component_PillarC | 394 | 33 | 95 | 12 |
| ruina_portal | Ancient Temples · Component_GateB | 2621 | 154 | 577 | 7 |
| ruina_torre | Ancient Temples · Component_TowerA | 1924 | 117 | 466 | 12 |
| ruina_torre_b | Ancient Temples · Component_TowerB | 948 | 61 | 228 | 12 |
| ruina_torre_c | Ancient Temples · Component_TowerC | 1088 | 61 | 261 | 1 |
| ruina_torre_e | Ancient Temples · Component_TowerE | 1156 | 105 | 276 | 1 |
| ruina_torre_f | Ancient Temples · Component_TowerF | 1445 | 90 | 348 | 3 |
| templo_grande | Ancient Temples · LargeB | 2742 | 300 | 575 | 3 |
| templo_grande_a | Ancient Temples · LargeA | 4662 | 436 | 581 | 3 |
| templo_grande_d | Ancient Temples · LargeD | 4665 | 507 | 579 | 1 |
| templo_grande_e | Ancient Temples · LargeE | 3772 | 348 | 557 | 2 |
| templo_grande_f | Ancient Temples · LargeF | 4723 | 433 | 573 | 1 |
| templo_mediano | Ancient Temples · MediumE | 3906 | 301 | 594 | 1 |
| templo_mediano_f | Ancient Temples · MediumF | 4436 | 344 | 578 | 1 |
| templo_mediano_g | Ancient Temples · MediumG | 3917 | 333 | 578 | 1 |
| templo_mediano_h | Ancient Temples · MediumH | 3941 | 291 | 565 | 6 |
| tienda_pequena | Savage · TentSM | 942 | 56 | 217 | 1 |
| toldo_pequeno | Savage · CampB | 1176 | 63 | 285 | 13 |
| torre_vigia | Savage · TowerA | 4452 | 297 | 560 | 14 |
| torre_vigia_b | Savage · TowerB | 3463 | 260 | 565 | 7 |

## Licencias
- KitBash3D *Savage* y *Ancient Temples*: licencia confirmada por Kelvin.
- `canoa` usa `canoa.jpg` (`WORK/Amazonas/references`), de origen desconocido: hay que verificarla o reemplazarla.
