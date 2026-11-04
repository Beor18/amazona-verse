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
  - templo_grande_a, _d y _f: modelo entero con *solidify*, remallado por vóxeles (0,15 m), plano y colapso a ≤5 000 tris. El material es el de la cara original más cercana y la textura del kit va reproyectada en caja. En calidad media y alta se ven con su `_hd` (§ Ciudad completa).
  - complejo_ruinas: se rehízo desde las piezas originales recolocadas (`edificios_complejo.py`). Es la excepción al ≤5 000: son 12 templos.

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
| complejo_ruinas | Ancient Temples · Group001 (LargeG, H y J, 8 MediumC y TowerE), reconstruido (§ Ciudad completa) | 15954 | 1418 | 1954 | 1 |
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

## Ciudad completa (25-oct-2026)
Kelvin: «terminar los edificios que faltan… la ciudad era hermosa». Su captura (torre antigua de paredes planas color arena, bordes recortados y piezas rotas) es el modelo ligero de `ruina_torre` y de los templos remallados por vóxeles.

**Referencia del original.** Render de la escena de 3ds Max (ene-2022): `09_Capturas_Investigacion/Screen Shot 2022-01-28 at 3.34.21 PM.png` y `3.44.43 PM.png`, copia reducida en `docs/img/ciudad_referencia_2022.jpg`. Templos color crema con torres altas, bloques, frisos y pilares; aldeas Savage con tejados rojos. La portada del juego de 2022 (`2022-01-27 at 3.44.15 PM.png`) muestra el complejo de ruinas.

**Diagnóstico.**
- a) **No hay más ciudad.** En el proyecto solo están `AV3DMaxExportBuildings.max` (377 instancias; 376 en el juego) y `AV3DMaxTerrainExport.max` (terreno). No hay otros .max, .fbx, .obj ni .blend de la ciudad. El paquete Ancient Temples del proyecto solo trae texturas (16 materiales de 4K con normales) y Savage, 10.
- b) **Lo que se ve sin terminar** (tabla). Causas comunes: el ligero usa 6 de las 16 texturas Ancient a 512 px, sin mapas de normales y, en los remallados, proyectadas en caja. Además, el complejo de ruinas llegó roto desde la migración.
- c) **`ancient_largej_sculptmd`** es el nodo `LargeJ_SculptMd`: una caja de 12 caras de tamaño 0 en (−2, 9, −821) m, a 600 m fuera de la escena (que va de x −236 a 230 y de z −197 a 222). Es un resto suelto del .max, sin geometría que recuperar. No es un edificio de la ciudad y sigue descartado.
- d) **Sogas y escombros.** En Savage, las sogas (`Rope`) son la mayor parte de los triángulos: `monumento_a` 208 000 de 272 000, `puente_madera` 333 000 de 589 000, `torre_vigia` 44 000 y `muralla_atalaya_b` 25 000. El ligero las quitó junto con los escombros (`Debris`) y cambió los troncos por prismas. En Ancient, los escombros (`damageM`, `mudDarkM`) se conservan en el _hd, reducidos.

| Zona | Qué falta | Qué se ve mal | Prioridad | Estado |
|---|---|---|---|---|
| Ruinas de El Yunque (`kelvin_ruinas_yunque`, 57; `_2`, 23) | Nada | Templos A, B, E y F remallados: torres «derretidas», picos rotos, `muro_templo` en tablas sueltas, arena plana | P1 | Lote 1: _hd |
| Torres sueltas (`ruina_torre` ×12, `_b` ×12, `_c`, `_e`, `_f` ×3) | Nada | Paredes planas color arena (wallL/mudM), sin frisos ni ladrillos: «de cartón» (captura de Kelvin) | P1 | Lote 1: _hd |
| Ruinas del este (`kelvin_aldea_rio_este_2`: templo D, 3 medianos H, 7 torres) | Nada | Templo D en vóxeles; la base de roca del mediano H recortada en planos sueltos; piezas que flotan | P1 | Lote 1: _hd |
| La Colina (`kelvin_aldea_colina`: complejo de ruinas) | **Las posiciones de sus 12 templos** | El migrado perdió las traslaciones del grupo: LargeG, H, J, 8 MediumC y TowerE apilados en el origen con giros distintos. Es la masa rota junto al mirador | P1 | Lote 2: reconstruido |
| Aldeas Savage (7 zonas) | Sogas y escombros | Troncos en prisma, sin amarres; materiales planos sin normales | P2 | Ronda 2: lote 3 (_hd con sogas) |
| Lejanos Ancient | — | Salen del vóxel: siluetas de vela derretida a más de 60 m | P2 | El _hd de los templos llega a 90 m; el lejano sigue siendo el de antes (salvo el complejo) |
| Losas, plataformas y bloques de piedra | — | Cajas de 12 tris con `floorM` | P3 | Sin cambios |

**Versión cercana de alta fidelidad (`<modelo>_hd`).** La generan `tools/blender/edificios_hd.py` y `edificios_hd_atlas.py`.
- Geometría y UV originales del migrado, sin vóxeles. Solo se reduce lo que pasa del presupuesto:
  - disolución plana que respeta UV y normales;
  - colapso por material: la arquitectura pesa 3 veces más que el escombro;
  - y, en el escombro, se quitan las piezas sueltas más pequeñas.
- Las normales son suaves en lo orgánico y con aristas vivas a 40° en la piedra labrada. Las caras de nodos en espejo se invierten.
- Texturas: las 16 originales con normales en un atlas 4×4 de 4096 px (`tex_hd/hd_ancient.jpg` y `_n`, celdas de 1024 px con margen de 32; la fracción es la misma que 512/16) y **un solo material `AV_HD_Ancient`** en los modelos con atlas; los restaurados pueden tener varios materiales con nombre. La UV2 guarda la celda; el shader (streaming.js `atlasHD`) envuelve la UV con `fract()` y elige el mipmap con la UV sin envolver, sin costuras. Al fundir, los materiales Ancient y Savage se reasignan a su celda del atlas; los que no tienen equivalente conservan el suyo. Las zonas cercanas se funden por material y los modelos cercanos, los `_hd` y los lejanos de varias zonas se vuelven a fundir globalmente; los modelos aún no cargados conservan su lote de respaldo.
- Se guarda ya comprimido con el gltfpack de la build. Las texturas van en `tex_hd/` y no en `tex/`, porque la build pasa `tex/` a WebP y no reescribe las uris de un glTF ya comprimido.
- Streaming: se pide con la zona en nivel cerca, en calidad media (hasta 40 m) o alta (hasta 90 m), con WebGL2 y cuando el jugador ya se movió. En calidad baja se queda el ligero. Los grandes (más de 10 m de radio) cuentan la distancia desde su mitad cercana, tanto en el LOD como en el _hd.
- **Colisiones, pisos y vanos salen siempre del ligero**: son iguales en todos los equipos.
- **Lonas (KIMI-Task-010, 3-nov).** Los `_hd` de `carpa_a`, `carpa_e` y `carpa_f` vinieron de la integración de TransferNow
  (`integrar_originales.py`) con los materiales crudos (3-5 por modelo, texturas embebidas): colores distintos al ligero y
  3-7 draw calls por modelo. `tools/blender/edificios_lonas_atlas.js` (Node, sin dependencias) los convirtió al formato del
  atlas: 1 material `AV_HD_Savage`, TEXCOORD_1 con la celda y texturas por URI `tex_hd/`. Los `_lejos` de las cinco lonas
  (`campamento_c`, `carpa_a`, `carpa_e`, `carpa_f`, `toldo_pequeno`) quedaron más chicos que el ligero: el mismo script los
  reescala a su caja exacta (≤ 0,3 m). `campamento_c` y `toldo_pequeno` tienen `hd: false`: su `_hd` es otra forma
  distorsionada por el fit del integrador; toca rehacerlos con `edificios_hd.py` (Blender) desde el migrado.
  - **Diagnóstico 4-nov (Kimi 3, PC):** los `_hd` actuales de `campamento_c` y `toldo_pequeno` no son una lona
    distorsionada sino **otro modelo**: un muro de púas `Multi_Pikes` de 3 282 tris con 3 materiales crudos
    (`Fabric_KB3D_TarpFabricDamaged_diffuse`, `Multi_Pikes_KB3D_WoodHewn_Diffuse`,
    `Multi_Pikes.001_KB3D_BarkCharred_diffuse`) y 6 texturas de `tex_original` referenciadas; cajas
    16,4 × 17,4 × 7,1 m y 9,4 × 8,9 × 8,8 m frente al ligero 5,5 × 2,4 × 5,9 m y 3,5 × 3,3 × 3,3 m. El juego no los
    carga nunca (`streaming.js` solo pide `_hd` cuando `kit[id].hd === true`), así que son inertes y la imagen
    cercana la da el ligero. **Falta reexportarlos en la Mac** (tiene Blender y el migrado):
    `Blender -b --python tools/blender/edificios_hd.py -- --ids campamento_c,toldo_pequeno --out assets/models/edificios --kit`
    (de paso pone `hd: true` y los `trisHD` nuevos en kit.js). En la PC de Kelvin no es posible: no están
    `~/AmazonaVerse/04_Mapa_3D/migrado` ni Blender/gltfpack. Invariante de regresión repetible:
    `node tools/build/kimi3_hd_audit.js` (falla si un `_hd` hd:true vuelve a traer materiales `Fabric_*`/`Multi_*`).
  Verificación con GPU real (Chrome headless, 1920×1080, calidad alta, `tools/build/kimi3_lonas.js`, 3-nov):
  auditoría de materiales en las 3 aldeas con lonas sin materiales crudos (solo `AV_HD_Savage`/`AV_HD_Ancient`);
  95–139 draw calls y 0,74–1,79 M tris a ~142–143 FPS en lomas/colina/rio_oeste_2. `streamingTest` 21/23 y
  `lookTest` 42/44 (los rojos son los conocidos: QA-81 draw calls 152–163 en kelvin_ruinas_yunque + «el kit del
  tepuy al volver», y QA-81 texturas grandes a 512 px). Capturas y medidas en `docs/img/kimi010/`.

| _hd | tris ligero → _hd | KB del _hd (js) |
|---|---|---|
| templo_grande (B) | 2742 → 21 363 | 664 |
| templo_grande_a | 4662 → 23 117 | 505 |
| templo_grande_d | 4665 → 20 493 | 495 |
| templo_grande_e | 3772 → 33 016 | 741 |
| templo_grande_f | 4723 → 34 252 | 765 |
| templo_mediano (E, F, G) | 3906, 4436, 3917 → 14 101, 13 639, 13 857 | 333, 289, 375 |
| templo_mediano_h | 3941 → 23 360 | 509 |
| muro_templo | 1410 → 11 900 | 251 |
| ruina_torre (A, B, C, E, F) | 1924, 948, 1088, 1156, 1445 → 5622, 417, 7516, 2388, 7265 | 106, 15, 140, 67, 119 |
| ruina_altar, _mirador, _pilar, _portal | 1107, 1916, 394, 2621 → 2562, 1202, 588, 2566 | 47, 20, 15, 45 |
| complejo_ruinas | 4711 → 41 657 | 1038 |

En total, el _hd suma 6,5 MB de js (streaming, nada en la descarga inicial) más el atlas, de 2,8 MB.

**Complejo reconstruido (lote 2).** Lo hace `tools/blender/edificios_complejo.py`.
- Las traslaciones salen del inventario de la migración (`_trabajo_claude/av_max/assets.json`, `members[].local`).
- Las piezas se recolocan con la misma x y z del grupo que tenían en el migrado, y la base va sobre la loma (35,75 m, la cota de las losas).
- Con la geometría y la UV originales salen sus tres versiones:
  - _hd: 41 657 tris;
  - ligero: 15 954 tris, con la paleta del kit y que también da las colisiones;
  - lejano: 1954 tris, por vóxeles desde el ligero.
- La escena no cambia. La corrección está en el modelo y en `conversion.json` (M del complejo).
- Mide 51 × 35 m (antes, 34 × 20 m de masa rota), así que sobresale de la meseta por el oeste unos metros sobre la ladera. **Decisión de Kelvin:** dejarlo así, moverlo o quitar alguno de los MediumC del borde.

**Capturas** (calidad alta, mismas cámaras, Chrome sin interfaz con GPU Apple M4; `docs/img/ciudad_<vista>_{antes,despues}.png`). Antes = build 920bc30; después = build d90e631. Son cifras del cuadro entero.

| Vista | draw calls | triángulos | FPS |
|---|---|---|---|
| torre antigua (El Yunque) | 112 → 89 | 363 000 → 765 000 | 60 → 60 |
| ruinas de El Yunque, desde arriba | 123 → 105 | 422 000 → 730 000 | 60 → 60 |
| complejo de la Colina | 88 → 85 | 284 000 → 322 000 | 60 → 60 |
| ruinas del este | 87 → 81 | 323 000 → 423 000 | 60 → 60 |

La vista más cargada de streamingTest (ruinas de El Yunque) queda en 137 draw calls (≤ 150). La build pasa de 17,6 a 28,6 MB, de los que unos 10 MB son de los _hd y del atlas. Suma 42 archivos (390 de 511). La descarga inicial no cambia (8,2 MB, igual que HEAD).

**Calidad.** Bajo lo usa hasta 45 m, medio hasta 70 m y alto hasta 90 m, cuando el edificio está en el LOD cercano (los grandes, también más allá). Hace falta WebGL2. Se pide también antes de moverse si ya estás en la zona.

**Pendiente.**
- Lote 3, Savage: sogas y escombros en un _hd con el atlas `hd_savage`. El atlas está en el pipeline y falta generarlo.
- Lejanos Ancient desde la geometría original.
- Decisión sobre el borde oeste del complejo.

## Ciudad completa, ronda 2 (25-oct-2026, noche)
Kelvin: «no veo los otros edificios» y la ciudad «tipo Asgard, antigua pero moderna». Delegó las decisiones.

**¿Falta ciudad en el .max?** No.
- `AV3DMaxExportBuildings.max` tiene 1828 nodos: 1516 Editable Poly, 293 Dummy, 17 Box y 2 Editable Mesh. No hay ninguna clase de plugin.
- Sus DLL son las de Autodesk más V-Ray. CityBuilderPlugin es un script de MAXScript: solo aparece por las rutas de 7 texturas de MAXFILES.TXT (palmeras, agua y plano), no por objetos.
- Los 1535 nodos de geometría cuelgan, todos, de alguna de las 377 instancias exportadas. No hay capas con nombre ni grupos sin exportar.
- `AV3DMaxTerrainExport.max` tiene 17 nodos: 11 Editable Poly (terreno) y un MultiScatter (vegetación de Archmodels), sin edificios.
- La «ciudad tipo Asgard» son los templos y las torres de KitBash3D Ancient Temples en la cumbre de El Yunque (`ruinas_yunque` y `_2`), más las ruinas del este y el complejo. Es el grupo dorado de la izquierda en el render de 2022.

**Por qué no se veía.** La distancia de dibujo de los edificios era de 150 m en calidad baja, 190 m en media y 320 m en alta, medida al borde de cada zona. La isla mide 470 m.
- Desde el inicio, en el móvil (calidad media), solo se dibujaban 9 de las 17 zonas: ni las dos ruinas de El Yunque (a 269 y 328 m) ni 6 aldeas. La cumbre se veía vacía (`ciudad_r2_vuelo_movil_antes.png`).
- En alta faltaban 2 zonas.
- Con calidad baja, el LOD y el `far` de la cámara no influían: el `far` es de 1600 m y la niebla atmosférica pasa de 3 km.

**Arreglo.** En `streaming.js`, `CFG.zonaLejos` = 650 m en todas las calidades, solo para las mallas lejanas fundidas por zona: un draw call por zona. Los edificios sueltos siguen con `CFG.dibujo`.
- Ahora se ven las 17 zonas desde cualquier punto.
- En el móvil (calidad media, desde el inicio), +4 draw calls (55 → 59) y +54 000 triángulos (283 000 → 337 000), a 60 FPS.
- La descarga inicial no cambia: los lejanos que pasan de 150 m esperan a que el jugador se mueva.

**Lejanos de los templos** (`tools/blender/edificios_lejos.py`). Salen de la geometría original (la misma del `_hd`), con grosor y remallado por vóxeles a diagonal/110. Tienen entre 1070 y 2000 tris y color de vértice del atlas. Antes salían del vóxel del ligero: las torres «derretidas» medían 33 m en lugar de 42 y les faltaban las coronas.

El color medio del atlas es arena plana a más de 90 m. `tools/blender/edificios_lejos_tono.py` deja dos tonos en ese COLOR_0: piedra en la cara que mira al cielo y sombra en la que mira al suelo y en los huecos (oclusión por la posición de los vecinos). Solo usa la normal vertical, así el rotY de la pieza no gira la luz. La malla lejana recibe la sombra del sol y no la proyecta.

**Lote 3, aldeas Savage** (`edificios_hd.py`, atlas `tex_hd/hd_savage*.jpg`). Llevan `_hd` 21 modelos con sogas y escombros:
- torres, murallas con atalaya, monumentos A, C y F, puente, portales, mirador escalonado, casa con plataforma, bohíos, caney, casas de paja, cercado y empalizada.
- Las sogas reciben casi un tercio del presupuesto y no se quitan como escombro.
- Entre 6400 y 38 000 tris por modelo; 5,3 MB de js en total, todo por streaming.

**Complejo de La Colina** (decisión delegada):
- fuera los 3 templos del borde oeste que quedaban en el aire sobre la ladera (MediumC 007 y 008 y TowerE);
- 4 m al este, con 2 m libres hasta el mirador;
- la base de los templos (mediana de sus bases) a ras de las losas: antes flotaban unos 4 m;
- mudDarkM y floorDarkM pasan a su versión clara, que coincide con el color crema del render de 2022 y ya no se ve negro a contraluz;
- 41 179 tris en el `_hd`, 15 190 en el ligero y 1732 en el lejano.
- Sin caja de colisión gruesa (`mundo.js`): era una caja de 42 × 28 m sobre 12 templos con plazas entre ellos. Lo detienen sus sólidos reales, como a los demás.

**Peso.** La build pasa de 28,6 a 36,6 MB y 420 archivos (límite de archivos: 511). Supera el objetivo de 30 MB: son los `_hd` de las aldeas y su atlas, todo por streaming. Kelvin retiró el tope de 64 MB el 26-oct-2026: el peso se mide y ya no rechaza la publicación.

Capturas: `docs/img/ciudad_r2_*` (móvil 375×812 en calidad media y escritorio en alta).

## Restauración paramétrica Ancient (31-oct-2026)
- `tools/blender/edificios_restaurados.py` aplica el flujo paramétrico de Kimi 3D Make a 18 modelos Ancient: templos grandes y medianos, muro, cuatro torres, altar, mirador, pilar y portal. El ligero usa edificios completos con escaleras, columnas, muros, cornisas biseladas, dentados, relieves y coronas; `ruina_torre` conserva la geometría original con su cavidad interior validada. La fusión conserva también las mejoras posteriores de geometría, pivotes, HD y lejanos de `main`.
- Conserva la caja, el centro de la base, la orientación y las instancias del kit. No cambia Vittata, los modelos Savage ni el mapa original de 3ds Max.
- Los materiales reutilizan las texturas licenciadas del proyecto: sillares `wallM`, frisos `decoM`, `floorM` y `stoneM`, con mapas de normales. Las celdas originales se extraen del atlas `tex_hd/hd_ancient*.jpg`.
- LOD: el ligero tiene 88–2340 tris (colisiones y calidad baja), el HD 152–84288 tris y el lejano 88–9542 tris. `kit.js` lleva `restaurado: true` en los modelos paramétricos.
- Colocación: se conservan las posiciones validadas de `main`, incluida la torre con su espacio interior y su plataforma. `relocate()` queda solo como utilidad de análisis; no se aplica globalmente porque podía cambiar apoyos funcionales.
- Verificación: `python3 tools/blender/edificios_restaurados_test.py` comprueba estructura conectada, presupuestos de los tres LOD y la posición validada de `ruina_torre`.

## Integración del paquete TransferNow (01-nov-2026)

- Fuente: `edificios.glb` y `mapa.glb` del enlace entregado por Kelvin. El conversor reproducible es `tools/blender/integrar_originales.py`; no necesita Blender ni añade dependencias.
- Integración mixta: 18 recursos ligeros usan la geometría y los materiales originales (`original: true` en `kit.js`); los modelos pesados conservan el HD optimizado que ya funcionaba y lo mantienen activado (`hd: true`). Las texturas originales están en `tex_original/` y se cargan por URI externa.
- Al dividir la escena se elimina la transformación completa de cada instancia, no solo su posición. Cada modelo se ajusta a la caja y al pivote del kit validado, de modo que conserva su escala, orientación, apoyo y colocación en el juego. Las losas se ajustan a sus cajas rectangulares existentes.
- El terreno original se publica en cuatro trozos con 80 000 triángulos en total. Conserva su malla en planta, pero adapta la altura de sus vértices al heightmap validado del juego para mantener misiones, edificios y apoyos en su sitio. `mapa_cap1_altura.js` conserva exactamente esas alturas de referencia. Escala del terreno: 0,255.
- Se exportan también seis árboles originales como recursos opcionales en `assets/models/entorno/*_original.glb`; el bosque activo sigue siendo la flora procedural para no multiplicar el coste de cada vista.
- `python3 tools/blender/integrar_originales_test.py` comprueba los recursos originales, sus URI, el HD conservado, el terreno, el heightmap y las dimensiones/pivotes frente al kit anterior. No hay límite de tamaño de archivo ni de descarga en la build; el presupuesto de 20 000 triángulos del conversor es únicamente el criterio para elegir entre el original ligero y el HD ya optimizado. Las referencias fijas hacen la conversión repetible.
- Capturas de la build real: `docs/img/integracion_original_ciudad_20261101.png`, `integracion_original_villa_20261101.png` e `integracion_original_mapa_20261101.png`. La activación del HD de los templos se comprueba en `docs/img/hd_templos_corregido_20261101.png`.

## Heightmap regenerado desde el terreno (03-nov-2026, KIMI-Task-006/008)
- Tras la integración, el terreno visible (malla original con sus vértices deformados a la referencia) y `mapa_cap1_altura.js` (mapa viejo de 2 m de la malla procedural) eran superficies distintas: en las orillas la flora se sembraba con altura de terreno que no estaba dibujado (árboles y piedras en el mar: 1 094 celdas sembrables de las 1 557 sin malla) y en las laderas del tepuy la diferencia llegaba a ±7 m, con vegetación enterrada o en el aire según el ángulo.
- `node tools/blender/altura_desde_terreno.js` remuestrea los cuatro trozos GLB en la misma rejilla de 265×265 a 2 m, con la misma consulta por triángulo que `terreno.js` (la cara más alta de la columna). El heightmap pasa a ser la superficie visible con error medio de 0,001 m; el agua (espuma y profundidad de `agua.js`) usa la misma fuente, así que orillas y fondo cuadran con lo dibujado.
- Donde la malla no llega (mar abierto, 14 120 celdas) se conserva el fondo marino viejo y la tierra vieja sin terreno pasa a −0,6 m (bajo el mar): ni suelo invisible para caminar ni flora flotante. En un radio de 6 m de 56 puntos de misión (spawn, lugares, perchas, pozas, paradas, recursos) se conserva el valor validado si la malla se aparta más de 0,5 m; hoy la diferencia medida es ~0,0 m (la malla ya se deformó a esas alturas en 842452c), así que el seguro no mezcla nada en la práctica.
- El terreno visible no cambia: siguen siendo los mismos `terreno_*.glb` de 80 000 triángulos. Cambia solo el dato de altura que usa la flora, el agua y la reserva de suelo. Capturas antes/después en `docs/img/kimi/k006_*`.

## Licencias
- KitBash3D *Savage* y *Ancient Temples*: licencia confirmada por Kelvin.
- `canoa` usa `canoa.jpg` (`WORK/Amazonas/references`), de origen desconocido: hay que verificarla o reemplazarla.

## Texturas 4K de Drive (26-oct-2026)
Kelvin pasó tres archivos. No son un kit nuevo: son las fuentes de 2021 que el documento ya describe.

| Archivo | Qué es | Qué entró al juego |
|---|---|---|
| `AV3DMaxExportBuildings.zip` (1,3 GB) | `AV3DMaxExportBuildings.max` (2,4 GB, 15,8 millones de caras, 377 instancias) y las JPG 4K de KitBash | El `.max` ya estaba migrado (64 modelos, `_hd` y lejanos). Entraron las texturas. |
| `AV3DMaxTerrainExport.zip` | El mismo `.max` de terreno más plantas, `trees.psd` y cuatro JPG Ancient | Nada nuevo: el terreno ya está en el mapa (`MAPA_COMPLETO.md`). |
| `AV3DMaxTerrainExport.max` | El mismo terreno, suelto | Igual que la fila de arriba. |

**Qué cambió en el kit.**
- El atlas que se publica es el de **4096 (celda 1024, margen 32)**, JPG, las 16 de Ancient y las 10 de Savage, desde las 4K del Drive. Kelvin, 26-oct-2026: en el juego tiene que estar el kit completo; no se recorta por calidad ni por el tope de peso (ese tope ya no está). La paleta ligera del arranque sigue en 512: es el respaldo mientras llega el `_hd`, no lo que se ve junto al edificio.
- El look de fábrica no encoge `tex_hd/`. `?tex=512` sigue pudiendo medirlo chico. El `_hd` se pide en bajo (45 m), medio (70 m) y alto (90 m), también antes de moverse si ya estás en la zona. De lejos, la torre chica sigue en silueta; el templo grande no.
- El lod del atlas mira el eje corto cuando la pared se ve de lado, sin salirse del margen de la celda.
- `edificios_hd_atlas.py` acepta Pillow si no hay OpenImageIO. `edificios_build.py` engancha la normal del kit ligero si el archivo existe.

**Qué no entró, y por qué.**
- No hay otra ciudad dentro del `.max`. Releerlo no añade edificios. El `.max` de 2,4 GB no se abre: no hay 3ds Max.
- Palmeras, Archmodels, hierba y losas pintadas vienen de carpetas `Torrents/` o del plugin. No son el kit y la licencia no está confirmada. No se copiaron.
- `canoa.jpg` sigue en 512. La foto de Drive es la misma fuente, y la licencia sigue sin verificar.
- Los 9 mapas de brillo de Savage no entran. En el tejado el brillo es parejo y alto (media 121 de 255); con el toon de fábrica el especular de Phong queda como un punto plástico. El sombreador del `_hd` tampoco tiene ese canal. No se fuerzan.

## Lectura del .max sin 3ds Max (26-oct-2026, noche)

No hay 3ds Max ni Blender en esta máquina (el `python3.11` de Blender es un enlace al Python del sistema). El `.max` tampoco lo abre Assimp. Se releyó con el lector OLE que ya está en el repo (`tools/blender/edificios_maxscene.py` y `edificios_maxindex.py`): el flujo `Scene` (2,4 GB), 27 885 objetos, 1 828 nodos, 1 516 Editable Poly, 293 Dummy, 17 Box, 2 Editable Mesh y 15 778 860 caras de malla base. Son las mismas 377 raíces. No aparece un edificio que no esté ya en el catálogo. `LargeJ_SculptMd` sigue siendo una caja de 12 caras y se deja fuera. Las losas, bloques y plataformas son primitivas Box del propio archivo: no hay una losa labrada que copiar. La canoa es un Editable Poly de 54 caras con TurboSmooth; el juego ya tiene las 432 de esa suavidad y no se rehizo (hace falta Blender para el modificador). `canoa.jpg` no se tocó.

Los `_hd` que ya estaban usan las 16 celdas Ancient y las 10 Savage (UV2 decodificada con el meshopt del repo). El ligero sigue en la paleta corta, sin normales.

Lo que el ligero no dibujaba y el `.max` sí tiene, y ahora entra como `_hd` (misma escala y pivote que el modelo ligero; la lona o el muro que el ligero conservó encaja a menos de 5 cm):

| modelo | tris del ligero → `_hd` | qué vuelve |
|---|---|---|
| ruina_torre_b | 948 → 1086 (antes el `_hd` tenía 417) | las 543 caras del `.max`: stoneM, wallL, pillarsM, decoM |
| campamento_a | 702 → 34 036 | sogas (Rope), picos y corteza |
| campamento_c | 1375 → 3 282 | lona y corteza quemada |
| campamento_f | 921 → 66 500 | sogas |
| toldo_pequeno | 1176 → 3 282 | la lona entera (el ligero había quedado en una lámina de unos 7 cm) |
| tienda_pequena | 942 → 47 196 | sogas |
| muro_roca | 871 → 34 140 | sogas |
| corral | 4017 → 253 910 | sogas, barro y lona. Siete caras de `BuildingMesh` no tenían bitmap del kit y no se copiaron |
| monumento_b | 1588 → 136 457 | sogas y RockSmooth. La malla entera (355 733 tris) pasa de 16 MB; se agrupó a 8,5 cm para caber |
| monumento_d | 1905 → 322 423 | sogas y RockSmooth |
| monumento_e | 3198 → 140 900 | sogas y tablas |
| monumento_g | 2864 → 203 558 | sogas |
| carpa_a, _c, _d, _e, _f | ver catálogo | la lona del `.max`, con sogas donde la pieza las trae |
| carpa_b | 925 → 188 504 | sogas |

No entró `carpa_g`: la única pieza que quedaba en el `.max` mide unas 2,5 veces el modelo del juego y no encaja en su sitio. El muelle no tiene instancias; es la misma malla que `empalizada`, que ya tiene `_hd`. Los gloss de Savage siguen fuera. Palmeras, Archmodels y el scatter del terreno no se copiaron (licencia no confirmada). El `.max` del terreno no trae edificios ni píxeles nuevos.
- Rope (3600×1375) y la difusa de WoodHewn (3572) se estiran a la celda cuadrada, como ya hacía el pipeline.
- El `.max` del terreno no trae píxeles nuevos. No se integró.

## Torres de las ruinas, malla completa (26-oct-2026)

De cerca, en `kelvin_ruinas_yunque`, el atlas de piedra ya se veía y la geometría no: cilindros sin suelo, aros, muros abiertos y la base recortada. No era el lod mezclado con el `_hd` (cada instancia dibuja una sola malla). El `_hd` de esas piezas venía del migrado ya reducido y le faltaban caras que el `.max` sí tiene. El ligero no se toca: sigue dando colisiones y pisos de juego.

Se reescribieron desde el Editable Poly del `.max` (lector OLE, misma escala y el mismo pivote que el `_hd` anterior), sin decimar:

| modelo | tris del `_hd` anterior → ahora | qué vuelve |
|---|---|---|
| ruina_torre | 5622 → 7250 | peldaños de la base, suelo, muro y pilares enteros |
| ruina_torre_c | 7516 → 9006 | el suelo del pie (el cilindro ya no queda abierto abajo) |
| ruina_torre_e | 2388 → 4632 | la base ancha y el muro (antes quedaba en un cuarto) |
| ruina_torre_f | 7265 → 10020 | el disco del suelo: antes solo quedaba el aro |
| ruina_mirador | 1202 → 1916 | los muros curvos de los lados |
| ruina_portal | 2566 → 4032 | vigas y barro que el colapso había quitado |
| ruina_pilar | 588 → 740 | las vigas alrededor del fuste |
| ruina_altar | 2562 → 4108 | el barro y la piedra |
| muro_templo | 11900 → 84288 | el muro entero (84 288 tris del `.max`; el `_hd` anterior dejaba el 67 % de las aristas sueltas) |

`ruina_torre_b` ya era la malla completa (1086 tris) y no se rehizo. Los templos grandes siguen en su `_hd` anterior. Las losas y plataformas siguen siendo las cajas del archivo.

## Verificación contra el .max (27-oct-2026)

Se volvió a leer `AV3DMaxExportBuildings.max` (2,3 GB, 16-oct-2021) con el lector OLE que ya está en el repo. No hay 3ds Max en esta máquina. Las capturas de la izquierda son el `_hd` (la malla del `.max`) y las de la derecha el ligero: `docs/img/edificios_max_torre_a.jpg`, `edificios_max_torre_f.jpg`, `edificios_max_mirador.jpg`, `edificios_max_campamento_a.jpg`, `edificios_max_corral.jpg`.

**Qué estaba mal armado, con números.**

| modelo | qué medía el archivo | qué se corrigió |
|---|---|---|
| corral `_hd` | el sólido visible mide 16,61 × 4,39 × 6,45 m, pero el centro Z quedaba en −1,44 m. Siete caras sin bitmap, en un punto (x −4,5, z 4,5), estiraban la caja hasta Z 4,66 y el recentrado las contaba | centro XZ en 0, base en y = 0. 253 910 tris, igual que antes |
| campamento_a `_hd` | 34 036 tris, 8,94 × 3,43 × 8,11 m, base en y = 0,60. El alineado a la lona del ligero subió los postes | postes en y = 0. La lona sigue en el XZ del ligero (4,39 × 3,42 m). Las sogas del `.max` sí llegan a 8,94 m de ancho |
| campamento_c `_hd` | hundido 0,17 m (3 282 tris, 5,53 × 2,37 × 5,86 m) | base en y = 0 |
| campamento_f `_hd` | corrido 7 cm en X y 19 cm en Z | centrado, base en y = 0. 66 500 tris |
| tienda_pequena `_hd` | corrido 4 / 7 / 7 cm | centrado, base en y = 0 |
| ruina_torre_b `_hd` | corrido 3 cm en X y 9 cm en Z | centrado. 1 086 tris, la malla entera del `.max` |
| ruina_torre `_hd` | 7 250 tris, misma caja que el `.max` (6,46 × 14,11 × 6,46). El disco del centro (r < 1,5 m) tenía la normal hacia abajo; el aro de piedra (r 1,94–2,70, y = 0,22) miraba hacia arriba | el disco mira hacia arriba. No se añadieron caras. La torre sigue abierta por arriba: así está el Editable Poly |
| ruina_torre_f `_hd` | 10 020 tris. 430 caras del disco (y = 0,19, normal −1) | esas caras miran hacia arriba. El aro de arriba es el borde, no un disco que faltara |
| ruina_torre_c, _e y ruina_mirador | el mismo caso: lámina de la base con la normal hacia abajo | dadas vuelta solo esas caras, sin cambiar el número de tris |

`ruina_torre` del `.max` y el `_hd` tienen los mismos 7 250 tris y la misma caja. El ligero tiene 1 924 y la misma caja: es la retopología, no otra pieza.

**Qué no es un error de armado.**

- Losas, bloques y plataformas son primitivas Box del propio `.max` (12 tris). No hay una losa labrada que copiar.
- `carpa_g` no entra. La malla del `.max` mide 13,0 × 5,0 × 11,8 m (34 036 tris, casi todas sogas) y el ligero 7,73 × 4,20 × 7,02 m. No es 2,5 veces el modelo entero: ese número salía de un solo primitivo de 5,14 m.
- `canoa`: Editable Poly de 54 caras con TurboSmooth. El juego ya tiene las 432 de esa suavidad. Sin Blender no se rehace el modificador. `canoa.jpg` sigue sin licencia verificada.
- Los 9 mapas de brillo de Savage no entran: con el toon de fábrica el tejado queda plástico. Palmeras, Archmodels y el scatter del terreno tampoco (licencia no confirmada).
- `LargeJ_SculptMd` sigue siendo una caja de 12 caras, fuera de la escena.

**Templos, leídos del mismo `.max` y no reescritos.** La altura coincide con el `_hd` (misma escala). Lo que falta es profundidad, porque el `_hd` ya venía decimado:

| modelo | tris del `.max` | caja del `.max` (m) | tris del `_hd` | caja del `_hd` |
|---|---|---|---|---|
| templo_grande | 184 792 | 38,0 × 22,7 × 33,3 | 21 363 | 38,0 × 22,7 × 29,1 |
| templo_grande_a | 89 477 | 26,7 × 42,5 × 20,6 | 23 117 | 31,2 × 42,5 × 16,8 |
| templo_grande_d | 212 822 | 19,7 × 20,6 × 28,3 | 20 493 | 21,3 × 20,5 × 23,8 |
| templo_grande_e | 128 423 | 27,6 × 25,2 × 38,5 | 33 016 | 29,8 × 24,8 × 32,1, centro Z −2,1 m |
| templo_grande_f | 144 286 | 18,5 × 29,6 × 20,8 | 34 252 | 18,8 × 28,9 × 18,8 |
| templo_mediano | 57 875 | 10,0 × 9,8 × 15,4 | 14 101 | 10,7 × 9,8 × 13,4 |
| templo_mediano_f | 67 090 | 11,4 × 14,4 × 20,4 | 13 639 | 12,7 × 14,4 × 15,7, 30 cm bajo tierra |
| templo_mediano_g | 64 495 | 8,9 × 9,7 × 8,6 | 13 857 | 8,9 × 9,7 × 7,6 |
| templo_mediano_h | 462 218 | 7,8 × 9,0 × 10,1 | 23 360 | 8,2 × 9,0 × 9,6 |

`templo_mediano_h` no cabe entero en 16 MB (a razón del muro, 84 288 tris ocupan 4,3 MB). No se inventó una malla intermedia.

**Qué se ve cuando el `_hd` no está.** En `streaming.js`, la torre chica (radio < 10 m) usa el `_hd` solo dentro de la distancia de LOD. Entre esa distancia y la del `_hd` (45 / 70 / 90 m) se dibuja el ligero, que es la retopología. Más lejos, el lejano de color de vértice, sin textura. No se tocó `streaming.js` (lo tiene la otra sesión). El lejano no se regeneró: el script pide Blender y aquí no está.

## Presupuesto de texturas originales (2-nov-2026)

- Los 62 JPG de `tex_original` quedaron a un máximo de 512 px, conservando nombres, rutas, formato y proporción. La memoria estimada con RGBA y mipmaps baja de 322,20 a 80,60 MiB; su tamaño en disco baja de 26,26 a 5,83 MiB.
- `integrar_originales.py` vuelve a exportar con el mismo tope de 512 px. Los ocho HD desactivados por KIMI-Task-009 se conservan en `DISABLED_HD`.
- `tools/blender/texturas_edificios_test.py` comprueba el límite de 1024 px por textura, el presupuesto total inferior a 100 MiB y el tope del generador.
- En la misma vista de la Ciudad de los 36 (`docs/img/kimi/kimi_task_002_{antes,despues}.png`), las texturas originales visibles bajan de 197,9 a 75,4 MiB y las texturas grandes de 47 a 16. Se conservan 109 draw calls, 1 551 525 triángulos y 0 errores de consola. Las medidas completas están en los JSON homónimos.

## Visibilidad de la fusión global HD (2-nov-2026)

- La vista aérea de Villa Raíz en calidad media dibujaba `edificiosZonaHDGlobal:AV_HD_Ancient` aunque ninguna zona contribuyente usaba HD: eran 4 600 625 triángulos de una malla global activada solo por su caja envolvente.
- `streaming.js` ahora activa cada fusión global HD únicamente cuando una zona que sí usa HD tiene esa materia en vista o proyectando sombra. La prueba integrada comprueba que no quede una fusión global visible sin una zona HD visible.
- A/B en la misma vista, calidad media y Linux (`docs/img/kimi/kimi_task_011_{antes,despues}.png`): 5 365 191 → 733 545 triángulos, 89 draw calls y 37 → 56 FPS medidos, con 0 errores de consola. Las medidas y el desglose de mallas están en los JSON homónimos. La medición en iPad sigue siendo una comprobación aparte del dispositivo.

## Piedra dorada de las ruinas (2-nov-2026)

- La paleta cercana y del atlas pasa de sombra `0,54/0,45/0,34` y luz `0,94/0,85/0,70` a `0,50/0,40/0,26` y `0,90/0,76/0,52`. Las celdas restauradas conservan su textura y reciben además el factor cálido `1,06/0,94/0,70`; no se cambia la geometría, el LOD ni el sombreado normal.
- Comparación en `docs/img/kimi/kimi_task_004_comparacion.png`, con la meta de Kelvin, el antes y el después en el mismo encuadre y calidad alta. Las capturas y medidas individuales son `kimi_task_004_{antes,despues}.{png,json}`: 6 344 703 triángulos y 90 draw calls en ambas, con 0 errores de consola. Los FPS de estas ejecuciones Linux no son comparables por la carga concurrente del equipo.
- Kelvin aprobó la lámina y la publicación de esta paleta el 2-nov-2026.

## LOD por distancia de las fusiones (KIMI-Task-011, 3-nov-2026)

- **Causa de los 8,1 M triángulos del iPad.** Las mallas fundidas por zona (`edificiosZonaHD:*`, `edificiosZonaCerca:*`) y sus globales (`edificiosZonaHDGlobal:*`, `edificiosZonaCercaGlobal:*`, `edificiosZona:global:*`) se dibujaban enteras en cuanto su caja estaba a la vista (650 m). Así salía el `_hd` de toda la ciudad (hasta 462 000 triángulos por templo) desde Villa Raíz, el lejano debajo del cercano (doble dibujo) y, en el lejano global, las zonas solo Ancient fundidas con el color de vértice: blancas (el parche blanco de la pared).
- **Ahora** cada fusión guarda un tramo del índice por instancia (por zona en el lejano global) y se dibuja con grupos: solo los tramos de las instancias que este cuadro quieren esa versión. Nada se dibuja dos veces. Los modelos con `_hd` entran también en la fusión del ligero.
- **Distancias:** el `_hd` llega a 45 / 90 / 120 m (bajo / medio / alto), como antes. En la ciudad, a 45 / 150 / 700 m (`CFG.ciudadHD`); antes, a 340 / 450 / 700 m. Más allá se ve el ligero con textura hasta `ciudadMalla`. En «alto» no cambia nada.
- **Tope de `_hd` a la vista:** 400 000 / 900 000 triángulos en bajo / medio (`CFG.hdTris`; sin tope en alto). Entran primero los más cercanos. El más cercano entra siempre, y los que ya iban en `_hd` tienen 10 m de ventaja para que no parpadeen. El resto se ve con el ligero.
- **Medidas** (`tools/build/tris_medir.py`, SwiftShader: triángulos y draw calls valen, FPS no). Mismas cámaras antes y después, 0 errores de consola:

| vista | medio antes | medio después | bajo antes | bajo después |
|---|---|---|---|---|
| ipad (Villa Raíz a 40 m, mirando al tepuy) | 1,60 M · 110 | 0,64 M · 119 | 1,35 M · 66 | 0,64 M · 68 |
| ciudad (sobre la ciudad, 116 m) | 7,05 M · 90 | 1,33 M · 106 | 6,75 M · 55 | 0,75 M · 58 |
| kelvin_villa (a ~300 m de la ciudad) | 6,74 M · 93 | 0,67 M · 102 | 5,65 M · 48 | 0,50 M · 73 |
| aldea | 6,79 M · 119 | 0,69 M · 109 | 5,64 M · 77 | 0,38 M · 79 |
| tepuy (cap. 5, a pie en la meseta) | 6,91 M · 81 | 1,41 M · 110 | 6,74 M · 47 | 0,73 M · 82 |
| tepuy_aire (meseta, 25 m) | 6,91 M · 79 | 1,45 M · 114 | 6,74 M · 45 | 0,72 M · 79 |

- **Lo que se ve distinto:** de cerca, nada. Entre 150 y 450 m, las torres de la ciudad usan el ligero (más macizo que el `_hd`: sin los calados). Se probó el lejano con atlas como paso intermedio y no sirve: algunos salen crema o con otra forma. Un LOD intermedio fiel del `_hd` es trabajo de arte (Blender) y queda anotado para Kelvin y Fernando. Capturas: `docs/img/kimi/kimi_task_011_{ipad,ciudad}_{antes,despues}.jpg`.
- Flora y terreno no cambian: en estas vistas suman 0,25–0,35 M (flora con su tope por calidad, terreno 4 × 20 000).

## Validación del `_hd` de 400 k de complejo_ruinas (KIMI-022, 4-nov-2026)

- **Qué es:** la Mac subió `complejo_ruinas_hd400` (5,5 MB GLB / 7,3 MB `_glb.js`, ~400 k triángulos frente a los 41 k del `_hd` viejo; la pieza es el gran complejo de la colina, instancia única en (−18,5; 35,7; 177,2), zona `kelvin_aldea_colina`). Interruptor en `streaming.js` (~l.834): APAGADO por defecto; `?hd400=1` lo enciende.
- **Método:** herramienta nueva `tools/build/kimi1_022.js` (Chrome headless propio + CDP, GPU real RX 5700 XT). Semilla cap1 → portada → Aventura → teleport junto al complejo → `ST.terminar()` (drenado presupuestado) → órbita lenta r = 38 m a +18 m durante 12–16 s → FPS p50/p10/peor, draw calls, triángulos, `info.memory`, heap, `look.medir`, captura. Ojo: hay que agrandar el búfer de Resource Timing a 100 000 entradas (`performance.setResourceTimingBufferSize`) — con la ciudad drenada el búfer por defecto (250) evicta al `complejo_ruinas_*` y da falsos «no cargó».
- **Resultado (04-11 ~22:15–22:40 UTC), medido CON CONTENCIÓN** (Kimi 2 corría `kimi2_qa53.js` + `kimi2_empezar.js --solo movementTest` en la misma PC; los FPS son techo, no cifra limpia). Escritorio 1600×900 dpr 1 CPU ×1:

| condición | FPS med · p50 · p10 | calls | ktris | heap MB | hd400 cargado |
|---|---|---|---|---|---|
| medio · OFF | 60,5 · 71,4 · 35,7 | 186 | 799 | 836 | 0 |
| medio · ON | 18,8 · 23,8 · 11,1 | 199 | 1077 | 619 | 1 |
| alto · ON | 28,9 · 28,6 · 20,4 | 156 | 2986 | 895 | 1 |
| alto · OFF | 21,8 · 20,4 · 14,3 | 169 | 4669 | 858 | 0 |
| medio · OFF (A/B a) | 28,6 · 47,6 · 15,9 | 207 | 811 | 985 | 0 |
| medio · ON (A/B b) | 20,1 · 20,4 · 11,9 | 199 | 716 | 748 | 1 |
| medio · OFF (A/B c) | 28,7 · 35,7 · 15,9 | 204 | 773 | 816 | 0 |

- Móvil emulado iPhone 390×844 dpr 3 CPU ×4 (calidad «bajo» natural): heap 144,5 (OFF) vs 141,9 MB (ON), geo 227 vs 231, tex 121 = 121, y `cargadoHd400: 0` en ambas — **en «bajo» el interruptor es inerte** (la guarda de QA-158 no funde HD de zona y el `_hd` por instancia tampoco se pide: `modelosHD: 0`, `visiblesHD: 0` verificado en el volcado de zonas). **El pico de móvil no sube.**
- **Lectura:** la matriz primera es inválida como comparación (el alto-OFF sale peor que el alto-ON: varianza pura de contención). Lo consistente es el A/B entrelazado: con la misma contención media, hd400 ON cuesta ~30 % de FPS (20,1 frente a 28,6/28,7) **sin** subir triángulos a la vista (snapshot 716 k frente a 811/773 k): el coste no es de raster, y la cifra absoluta no permite certificar «≥ 50 FPS en medio».
- **Re-medición LIMPIA (04-11 ~22:56–23:00 UTC, matriz «limpia-*» de `tools/build/kimi1_022_matriz.sh`)**: tras 2 intentos fallidos de ventana limpia (Kimi 2 y Kimi 3 lanzaban tareas en cadena en la PC), se mataron los Chrome huérfanos `kimi2-*` huérfanos y la matriz corrió en una ventana casi libre (par A) con contención creciente después (Kimi 3 `qa156a2` r3 + Kimi 2 `qa53` durante el par B y el alto). Escritorio 1600×900 dpr 1 CPU ×1, GPU real RX 5700 XT:

| condición | FPS med · p50 · p10 | peor ms | calls | ktris | heap MB | hd400 |
|---|---|---|---|---|---|---|
| medio · OFF (a) | 119,0 · 142,9 · 71,4 | 201 | 187 | 810 | 830 | 0 |
| medio · ON (a) | **111,8** · 142,9 · 71,4 | 243 | 185 | 1065 | 931 | 1 |
| medio · OFF (b) | 88,5 · 142,9 · 47,6 | 278 | 185 | 706 | 838 | 0 |
| medio · ON (b) | 66,8 · 71,4 · 35,7 | 320 | 186 | 1157 | 872 | 1 |
| alto · OFF | 52,4 · 71,4 · 28,6 | 528 | 188 | 706 | 573 | 0 |
| alto · ON | 54,1 · 142,9 · 35,7 | 1236 | 140 | 503 | 136 | 1 |

- **Lectura de la matriz limpia:** el par A es el más limpio (p50 142,9 = tope de pantalla en ambas condiciones; el ON pierde solo ~6 % de fpsMed). El par B y el alto ya corrieron con las otras dos sesiones encima (fpsMed deprimidos en AMBAS condiciones; la celda alto-ON quedó a medio drenar —heap 136 MB, calls 140— y su peor cuadro 1236 ms no es representativo). Verificación funcional del valor por defecto (`--hd400 auto`, sin parámetro en la URL): escritorio carga `complejo_ruinas_hd400` (auto-escritorio-medio: cargado=1); móvil táctil emulado (390×844, touch ON → `pointer: coarse`) NO lo carga en medio forzado (auto-movil-medio-tactil: cargado=0, corte `MOVIL_PEQ` efectivo). Ojo: sin emular touch, headless no activa `pointer: coarse` y el móvil emulado se comporta como escritorio.
- **Decisión final:** el criterio de encendido **se cumple** (medio-ON limpio 111,8 fpsMed ≥ 50, p50 en tope). **PERO** al dejarlo ON por defecto para escritorio/tablet, `streamingTest` cayó a **21/24** con dos interacciones sin diagnosticar a tiempo: «16/17 modelos _hd listos» en kelvin_ruinas_yunque (un modelo no llega a 'listo' en la ventana de la prueba) y «AV_HD_Ancient ausente (sin material)» en la vista aérea de la ciudad — con `?hd400=0` en la misma contención la batería da 23/24 (solo el QA-81 intermitente conocido, 158 calls). El GLB `_hd400` trae su material ya nombrado `AV_HD_Ancient` (no pasa por `convertirAtlas` por nombre `KB3D_*`), sospechoso en la segunda interacción. **Se mantiene APAGADO por defecto** (`streaming.js` intacto, comportamiento = HEAD) hasta diagnosticar las dos interacciones; evidencia en `docs/img/kimi022/` (k022-limpia-*, auto-*) y el A/B de batería reproducible con `node tools/build/kimi2_una_bateria.js streamingTest [--url-extra "hd400=0|1"]`. Siguiente paso: diagnóstico fino (¿el 400 k tarda más de la ventana en 'listo' bajo contención? ¿el material crudo `AV_HD_Ancient` del hd400 roba el nombre al singleton del atlas en la fusión global?).
- **Ojo si se enciende algún día:** `kit.js` sigue diciendo `trisHD: 41179` para `complejo_ruinas`, pero el modelo real son ~400 k: la cuenta del tope `CFG.hdTris` (900 k en medio) quedaría deshonesta (~2× triángulos de los presupuestados pasarían). Habría que actualizar `trisHD`/`kbHD` al encenderlo.
- Evidencia: `docs/img/kimi022/k022-*.json` + `k022-*.jpg` (0 errores de consola en todas las corridas; las capturas hd0/hd1 renderizan igual de bien, sin artefactos).
