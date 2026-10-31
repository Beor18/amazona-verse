# Inventario de los GLB de Kelvin (31-oct) — BM77

**Estado: COMPLETO (BM77 hecha 31-oct).** La sección «edificios.glb» y «Piezas separadas» al final son lo nuevo; el texto de abajo sobre `mapa.glb` (antes en `~/Downloads`, ahora `glb_kelvin/mapa/mapa.glb`) sigue válido. *(Aviso antiguo:* `~/AmazonaVerse/glb_kelvin/mapa/` y `~/AmazonaVerse/glb_kelvin/edificios/` **no existen** en la Mac (ni en `COORDINACION_VIVO.md` hay otra ruta). Búsqueda de `*.glb` posteriores al 29-oct fuera de los repos: solo `~/Downloads/mapa.glb` (112 MB, 31-oct 16:18). **No hay GLB de edificios ni de asentamientos**; hasta que Kelvin los deje en una carpeta y la anote en `COORDINACION_VIVO.md`, BM78–BM80 no pueden empezar. No se copió nada al repo (112 MB).

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


## `~/AmazonaVerse/glb_kelvin/edificios/edificios.glb` (1 127 940 197 B)
KHR_materials_specular; 1828 nodos, 1535 mallas, 28 materiales, 62 texturas (≈0,87 GB de imágenes), **30,1 M triángulos** en total. Es una **escena entera ya colocada**: 377 nodos raíz con su traslación en coordenadas de mapa (pos en el JSON), eje +Y, unidades de 3ds Max (≈ las del terreno: 0,255 m/u según BM77-mapa; sin verificar con un edificio real). Pivote: en el origen de cada raíz; `yoff` en el JSON = mínimo Y de la pieza respecto al pivote (casi todas apoyan en ≈0). Inventario por pieza (tris, materiales, texturas, MB, tamaño, posición, escala): `docs/equipo/GLB_KELVIN_31OCT_edificios.json` (y `_mapa.json`).

| Familia (nodos) | Piezas | Tris (mín / mediana / máx) | Alto u | Huella máx u | Qué parece / encaja |
|---|---|---|---|---|---|
| `savage_*` | 201 | 3 282 / 47 040 / 588 919 | 2–77 | 10–120 | Paquete «savage» (poblado tribal): chozas, palisadas, tótems, props. **Candidato** a bohíos/caneyes/campamentos de los 14 asentamientos, pero estilo africano/oceánico genérico: revisar uno a uno. Muchas piezas de 588 k tris repetidas (savage_164/169): inviables sin decimar. |
| `ancient_*` | 78 | 740 / 4 032 / 462 218 | 7–140 | 6–150 | Ruinas/templos «antiguos» (piedra). Candidato a `ruinas_yunque` (2 ruinas) y bloque_piedra; el más grande ≈140 u. |
| `SavageG1_V*` | 39 | 2 380 / 3 282 / 188 504 | 6–34 | 15–54 | Variantes de bohío/choza savage; ~3 k tris = **aptos para LOD medio** del juego. |
| `MediumJ_*` | 8 | 84 288 (todas iguales) | 57–62 | 52–59 | Muros/columnas modulares idénticos; sirven como muralla/templo si se decima. |
| `Box042…Box090` | 49 | 12–108 | 2–76 | ≤139 | Cajas de colisión/relleno, sin textura propia: **no encajan** (descartar). |
| `Group001` | 1 | 1 123 118 | 97 | 205 | Conjunto grande (204 MB de textura): una «ciudad/templo» entera. Candidato a Ciudad de los 36 sólo tras decimar; hoy inviable (1,1 M tris, 28 texturas). |
| `LargeJ_SculptMd` | 1 | 24 | 0 | 0 | Plano degenerado: descartar. |

**Veredicto:** *Mejora directa* de algo existente: ningún nodo trae nombre de pieza del juego (bohio_*, caney_*, campamento_*, bloque_piedra…), así que la correspondencia es por parecido visual, a decidir en BM78 al renderizar contactos de `SavageG1_V*`, `savage_*` ligeros y `ancient_*`. *Nuevo:* ruinas `ancient_*` y la torre/templo grandes. *No encaja:* `Box*`, `LargeJ_SculptMd`, y cualquier pieza >100 k tris sin LOD (≈30 % de los tris del archivo son 4 piezas). Presupuesto del juego: ~3 k tris por edificio medio → sólo las ligeras valen tal cual. Ninguna usa `vibrant_toon`; todas PBR con textura grande (≈130 MB de textura mediana por pieza savage/ancient: **hay que reducir texturas a 512–1024 px**).

## Piezas separadas (fuera del repo)
`~/AmazonaVerse/glb_kelvin/piezas/edificios/piezas/<nodo>.glb` (377) y `.../piezas/mapa/piezas/<nodo>.glb` (12). Cada pieza es su subárbol (nodos, mallas, materiales) con **la traslación del nodo raíz puesta a 0** (la posición original está en el JSON); rotación/escala se conservan. Las texturas están **compartidas** en `piezas/<edificios|mapa>/texturas/tex_NNN.{jpg,png}` y cada GLB las referencia con `uri ../texturas/…` (sin eso, duplicadas ocupaban >9,5 GB). Para usar una pieza fuera de esa carpeta hay que copiar también `texturas/`. Total en disco ≈0,9 GB (edificios) + 0,05 GB (mapa). `piezas/_vacios/` guarda 0-byte restos de un primer intento (se pueden borrar a mano). Script reproducible: `tools/glb/bm77_separar.py <glb> <carpeta_salida> <etiqueta>` (con `$AV_PYTHON`, sin Blender). Nota: el GLB `Group001` ensambla 28 texturas; el tamaño del GLB (46 MB) no incluye las imágenes externas.
