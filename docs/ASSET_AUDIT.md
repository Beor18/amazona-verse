# ASSET_AUDIT · 24 oct 2026

| Activo | Formato | Estado verificado |
|---|---|---|
| Piloto Cotorra.blend | Blender 2.80 | **Solo trae la cabeza** de la cotorra (con ojos y lengua aparte), no el cuerpo, alas ni patas: los grupos de vértices de brazos, dedos, patas y cola están vacíos. Las texturas originales estaban en `E:/cotorras/Nueva carpeta/Blends/Materials/Amazona brasiliensis 001/`. Inspeccionado con Blender 4.2: cabeza de cotorra (225k triángulos) + cuerpo con traje negro de piloto, guantes y botas. **Sin texturas** (apuntan a `E:/cotorras/…`), **sin esqueleto** (falta RigCotorra), 12 animaciones huérfanas. Ver `ASSET_CONVERSION_PLAN.md` |
| vittata_base.glb / _lod1.glb | glTF binario | Exportados y verificados: 370k y 20k triángulos (10.4 MB y 473 KB), color verde plano sustituto |
| Renders de 34 especies | PNG 2048 con transparencia | En uso como sprites (Vittata, Luma, Guardián) y presets del creador (8) |
| Hojas de poses (14) | Capturas de Finder | Solo referencia visual |
| AV3DMaxTerrainExport.zip / .max | 3ds Max 2015 | **Descarga incompleta** en Safari (102/161 MB y 112/135 MB). Lo legible del ZIP: el .max, MAXFILES.TXT y texturas. Hecho por el usuario de Windows "danie" con CityBuilderPlugin. **No trae FBX/OBJ**; el .max no se abre en Mac ni en Blender |
| Dependencias del mapa | Texturas | Vienen de **KitBash3D "Ancient Temples"** y **Archmodels Vol. 61**, guardados en una carpeta `D:\Torrents\`. **Riesgo de derechos**: no usar comercialmente sin licencia |
| Referencias propias del mapa | JPG/PSD | `WORK/Amazonas/references/canoa.jpg`, `maps/trees.psd` (por extraer cuando termine la descarga) |
| AV3DMaxExportBuildings.zip | ZIP 1.3 GB | En Google Drive, no descargado |
| Cotorras cosplay (15) | PNG | En Drive; personajes de terceros, no comercializar |
