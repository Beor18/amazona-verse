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
- Texturas: las 16 originales con normales en un atlas 4×4 de 2048 px (`tex_hd/hd_ancient.jpg` y `_n`, celdas de 512 px con margen de 16) y **un solo material `AV_HD_Ancient`**, es decir, **un draw call por modelo**. La UV2 guarda la celda; el shader (streaming.js `atlasHD`) envuelve la UV con `fract()` y elige el mipmap con la UV sin envolver, sin costuras.
- Se guarda ya comprimido con el gltfpack de la build. Las texturas van en `tex_hd/` y no en `tex/`, porque la build pasa `tex/` a WebP y no reescribe las uris de un glTF ya comprimido.
- Streaming: se pide con la zona en nivel cerca, en calidad media (hasta 40 m) o alta (hasta 90 m), con WebGL2 y cuando el jugador ya se movió. En calidad baja se queda el ligero. Los grandes (más de 10 m de radio) cuentan la distancia desde su mitad cercana, tanto en el LOD como en el _hd.
- **Colisiones, pisos y vanos salen siempre del ligero**: son iguales en todos los equipos.

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

**Calidad.** Bajo no usa _hd. Medio lo usa hasta 40 m y alto, hasta 90 m. Hace falta WebGL2.

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

**Peso.** La build pasa de 28,6 a 36,6 MB y 420 archivos (límites: 64 MB y 511). Supera el objetivo de 30 MB: son los `_hd` de las aldeas y su atlas, todo por streaming.

Capturas: `docs/img/ciudad_r2_*` (móvil 375×812 en calidad media y escritorio en alta).

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
- Atlas HD de 2048 (celda 512) a **4096 (celda 1024, margen 32)**. La fracción margen/atlas es la misma (16/2048), así que la UV2 de los `_hd` no se rehizo. Van en WebP (`tex_hd/hd_ancient.webp`, `hd_ancient_n.webp`, `hd_savage.webp`, `hd_savage_n.webp`): el JPEG de las normales a 4096 pesaba 14 MB y el tope por archivo es 16 MB.
- Paleta ligera de 512 a **1024**, desde las mismas 4K, y cada `kb3d_*.jpg` tiene su `kb3d_*_n.jpg`. El glTF ligero la referencia; `streaming.js` la aplica (antes el normal solo existía en el `_hd`).
- El atlas 4K se pide solo en calidad **alta**, y solo después de que Vittata se mueve (no entra en la descarga inicial ni en el móvil, que se queda en la paleta de 1024). Pedido de la coordinadora en `PEDIDOS.md`.
- El lod del atlas mira el eje corto cuando la pared se ve de lado, sin salirse del margen de la celda.
- `edificios_hd_atlas.py` acepta Pillow si no hay OpenImageIO. `edificios_build.py` vuelve a enganchar la normal al regenerar.

**Qué no entró, y por qué.**
- No hay otra ciudad dentro del `.max`. Releerlo no añade edificios.
- Palmeras, Archmodels, hierba y losas pintadas vienen de carpetas `Torrents/` o del plugin. No son el kit y la licencia no está confirmada. No se copiaron.
- `canoa.jpg` sigue en 512. La foto de Drive es la misma fuente, y la licencia sigue sin verificar.
- Los mapas de brillo (gloss) de Savage no tienen canal en el sombreador. Quedan fuera hasta que se decida si el relieve extra vale otro atlas.
- Rope (3600×1375) y la difusa de WoodHewn (3572) se estiran a la celda cuadrada, como ya hacía el pipeline.
