# Inventario de los GLB de Kelvin (31-oct) — BM77

**Estado: PARCIAL.** `~/AmazonaVerse/glb_kelvin/mapa/` y `~/AmazonaVerse/glb_kelvin/edificios/` **no existen** en la Mac (ni en `COORDINACION_VIVO.md` hay otra ruta). Búsqueda de `*.glb` posteriores al 29-oct fuera de los repos: solo `~/Downloads/mapa.glb` (112 MB, 31-oct 16:18). **No hay GLB de edificios ni de asentamientos**; hasta que Kelvin los deje en una carpeta y la anote en `COORDINACION_VIVO.md`, BM78–BM80 no pueden empezar. No se copió nada al repo (112 MB).

## `~/Downloads/mapa.glb` (112 100 968 B)
Exportado con Khronos glTF Blender I/O 5.2.39; extensiones `KHR_materials_specular`, `KHR_materials_ior`. 12 nodos/mallas, 25 materiales, 24 texturas (23 imágenes JPEG/PNG), **1 188 098 triángulos**. Sin animaciones medidas. Eje arriba: **+Y** (glTF); los ejes de terreno/agua llevan rotación 180° en Y (`[0,-1,0,~0]`).

| Nodo | Tris | Prims | Extensión local (x/y/z) | Escala del nodo | Encaja con |
|---|---|---|---|---|---|
| TerrainBuilderSurface | 80 000 | 1 | 1792 × 154,5 × 1920 u, pivote en el centro, base y=0 | 1 | **Mejora directa** de `terreno_ne/no/se/so.glb` (cap. 1). Es el mismo terreno de `04_Mapa_3D/AV3DMaxTerrainExport.max`; el juego ya lo usa a 0,255 m/u (→ 457×490 m, coincide con la isla de `mapa_cap1.js`, 528 m de lado con costa). Unidades del GLB ≈ unidades de 3ds Max, **no metros**: hay que aplicar 0,255. |
| WATER OCEAN | 12 | 1 | 2172 × 583 × 2774 u (plano grande, y ±292) | y≈0,02 | Equivale a `agua.glb`; geometría trivial (4 quads). Con el shader de agua actual no aporta; solo marca el nivel del mar (y=−5 local). |
| 033_Lodoicea maldivica | 183 684 | 2 | alto 396 u | 0,0127 → ≈5 m | **Nuevo** (palma de coco de mar, Seychelles): no es flora de Puerto Rico. No encaja con el cap. 1. |
| 035_Citrus limon | 256 503 | 4 | alto 1169 u | 0,0127 → ≈15 m | **Nuevo / no encaja**: limonero, 256 k tris. |
| 039_Quercus petraea | 279 884 | 3 | alto 1255 u | 0,0127 → ≈16 m | No encaja (roble europeo). |
| Arch_061_050_07 | 29 112 | 3 | alto 1006 u | 0,0127 → ≈13 m | Por identificar (modelo Archmodels vol. 61). |
| Archmodels61_006_00 | 193 096 | 2 | alto 993 u | 0,0127 | Por identificar. |
| Archmodels61_023_00 | 89 293 | 2 | alto 1708 u | 0,0127 → ≈22 m | Por identificar. |
| Archmodels61_029_00 | 73 158 | 5 | alto 1502 u, ancho ~2000 | 0,0127 | Por identificar. |
| nature1 / nature4 / nature5 | 1 186 / 1 146 / 1 024 | 2 c/u | alto 41 / 32 / 30 u | 0,60 / 0,36 / 0,60 → 23 / 11 / 17 m | Candidatos baratos (≈1 k tris) para árboles de LOD medio; revisar especie. |

Los 7 `Archmodels61_*` están colocados en una **fila de muestrario** (x 595–682, z −1153…−1212, y 57), fuera de la isla: son una paleta de árboles de Archmodels vol. 61 (licencia por revisar antes de publicar), no un mapa. Pivote de cada uno: en la base (y mín ≈ −30…−50 u, o sea casi 0 tras escala).

## Veredicto
- **Mejora directa:** solo el terreno (`TerrainBuilderSurface`, 80 k tris). Pero el juego ya parte de ese mismo relieve; un reemplazo solo aportaría si Kelvin lo retocó (no se pudo comparar sin el original de 04_Mapa_3D en GLB). Próximo paso si se quiere: comparar alturas con `mapa_cap1.js` (altMax 103 m vs 154,5 u×0,255 = 39 m: **no coinciden**, el juego aplica montaña en terrazas encima).
- **Nuevo / no encaja:** los 7 árboles de Archmodels (1,1 M tris en total, especies que no son de El Yunque) y el océano.
- **Falta:** edificios, Ciudad de los 36, 14 asentamientos, vibrant_toon (ningún material se llama así; todos son PBR con texturas).
