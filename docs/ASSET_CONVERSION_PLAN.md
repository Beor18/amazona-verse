# ASSET_CONVERSION_PLAN · 24 oct 2026

Conversión del modelo original `04_Blender_3D/Piloto Cotorra.blend` a glTF para el juego. El original no se modificó; todo se hizo sobre una copia en `/private/tmp/claude-501/blender_work/`. Herramienta: Blender 4.2.3 LTS en modo headless.

## 1. Qué contiene el .blend (verificado)

Escena única `Scene`, sistema métrico, escala 1.0, metros, frames 1–250 a 24 fps. Una colección (`Collection`). No hay cámaras ni luces. No hay bibliotecas enlazadas.

| Objeto | Tipo | Malla (base) | Tris tras modificadores | Modificadores | Material | Qué es |
|---|---|---|---|---|---|---|
| `Amazon parrots` | MESH | 113 060 verts / 225 746 tris | 225 746 | `RigCotorra` (Armature, **objeto vacío**) | `Amazona brasiliensis.001` | Cabeza de cotorra (pico, ojos, cejas en la misma malla). 61 vertex groups (Cabeza, PicoUp, PicoDown, OjoL, OjoR, Lengua, dedos, pies, cola…). Atributo de color `Col` (todo blanco) |
| `Brazo.000` | MESH | 612 verts / 1 220 tris | 19 504 | Subdivision 2 | `Black` | Mano/guante izquierdo (escala −1 en X) |
| `Brazo.001` | MESH | 612 verts / 1 220 tris | 19 504 | Subdivision 2 | `Black` | Mano/guante derecho |
| `Cuerpo` | MESH | 3 321 verts / 6 638 tris | 104 976 | Subdivision 2 | `Material` | Cuerpo con traje de piloto, botas incluidas |
| **Total** | | | **369 730** | | | Altura total ≈ 9,4 m (pies en z = 0) |

Materiales:

| Material | Configuración | Estado |
|---|---|---|
| `Amazona brasiliensis.001` | Principled BSDF con 3 texturas: BaseColor, Normal, Roughness (`cotorrofiver-1LP_Material.001_*.png`) | **Texturas faltantes**: rutas absolutas `E:/cotorras/Nueva carpeta/Blends/Materials/...` (disco de Windows), no empaquetadas, no encontradas en este Mac |
| `Black` | Principled, color (0,004; 0,004; 0,004), rugosidad 0,5 | OK |
| `Material` | Principled, color (0,017; 0,017; 0,017), rugosidad 0,4 | OK |

Rig y animaciones:

- **No hay ningún objeto Armature en el archivo** (0 armatures). El modificador `RigCotorra` de la cabeza apunta a nada.
- Hay 12 acciones huérfanas (fake user): 4 del rig (`...RigCotorraAction...` frames 1–23, `...CameraAction.001...` 1–8, `...AreaAction...` y `...AreaAction.002...` 1–2; 1 799 F-curves cada una, sobre huesos como Cabeza, Cuello, CejaIn/Out, Cola, dedos) y 8 de cámaras (`Camera.001/.002`, solo `lens`). Sin el armature no se pueden reproducir ni exportar.
- Solo la cabeza tiene vertex groups; cuerpo y manos no tienen pesos.
- Sin shape keys. Sin constraints. Sin drivers.

## 2. Qué se exportó y cómo

Cambios aplicados solo en la copia antes de exportar:

1. Se eliminó el modificador Armature vacío.
2. En `Amazona brasiliensis.001` se quitaron los nodos de imagen faltantes y el Normal Map; se puso un **verde provisional** (lineal 0,10; 0,45; 0,08), rugosidad 0,6. Materiales renombrados: `Parrot_Feathers`, `Suit_Arms`, `Suit_Body`.
3. Sombreado suave en todas las caras.
4. LOD1: las manos y el cuerpo usan la malla base sin Subdivision; la cabeza lleva Decimate (Collapse, ratio 0,05).

Comandos (scripts en `/private/tmp/claude-501/blender_work/`, fuera del repo):

```
B=~/Applications/Blender.app/Contents/MacOS/Blender
$B -b cotorra_copy.blend --python export.py -- base assets/models/vittata_base.glb
$B -b cotorra_copy.blend --python export.py -- lod1 assets/models/vittata_base_lod1.glb 0.05
```

Opciones de `export_scene.gltf`: `export_format='GLB'`, `export_apply=True` (aplica modificadores), `export_yup=True`, sin animaciones/skins/morph/cámaras/luces, normales y UV sí, `export_vertex_color='NONE'`.

| Archivo | Objetos | Triángulos | Vértices | Tamaño |
|---|---|---|---|---|
| `assets/models/vittata_base.glb` | 4 | 369 730 | 233 025 | 10 949 376 B (10,4 MB) |
| `assets/models/vittata_base_lod1.glb` | 4 | 20 364 | 11 395 | 484 160 B (473 KB) |

Orientación en glTF: Y arriba, el personaje mira hacia +Z (hacia la cámara por defecto de Three.js). Unidades sin escalar: mide ≈ 9,4 unidades de alto.

## 3. Verificación

Reimportado cada .glb en una escena vacía de Blender (headless):

- Base: 4 objetos, 4 mallas, 369 730 tris, 3 materiales, 0 acciones, 0 armatures, 0 imágenes.
- LOD1: 4 objetos, 4 mallas, 20 364 tris, 3 materiales, 0 acciones, 0 armatures, 0 imágenes.
- Bounding box idéntico en ambos (≈ 4,1 × 5,3 × 9,4).

Render de comprobación (EEVEE, 800×800, fondo transparente, vista 3/4 frontal): `docs/img/vittata_base_preview.png`. Muestra una cabeza de cotorra caricaturesca (pico grande curvo, ojos, cejas) sobre un cuerpo humanoide con traje de piloto negro, guantes y botas. **No** es un cuerpo redondo verde con patas grises: el cuerpo es un traje negro. Toda la cabeza (incluidos pico y ojos) sale del mismo verde plano porque faltan las texturas. El LOD1 se ve casi igual a esa distancia.

## 4. Problemas encontrados

1. **Texturas faltantes** (BaseColor/Normal/Roughness en `E:/...`). Sin ellas la cabeza es de un solo color. Bloquea el aspecto final.
2. **Falta el rig** `RigCotorra`. Las acciones existen pero no tienen a qué aplicarse. No hay animación utilizable en el juego.
3. La cabeza es de una sola malla y un solo material: pico, ojos y plumas no se pueden recolorear por separado sin trabajo adicional.
4. Malla base demasiado pesada para móvil (370 k tris, 10,4 MB). Usar el LOD1.
5. Escala ≈ 9,4 m de alto; hay que escalar en el juego.
6. El objeto `Brazo.000` tiene escala negativa (espejo); en el reimport se ve bien, pero vigilar normales en Three.js.

## 5. Próximos pasos recomendados (Three.js r128)

1. Pedir al creador la carpeta `Materials/Amazona brasiliensis 001` (los 3 PNG) y, si existe, el .blend que contiene el armature `RigCotorra`. Con eso se reexporta con textura y animaciones (la animación de 23 frames parece la principal).
2. Cargar el LOD1 en el juego:

```html
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
```
```js
new THREE.GLTFLoader().load('assets/models/vittata_base_lod1.glb', (gltf) => {
  const m = gltf.scene;
  m.scale.setScalar(1.8 / 9.4);           // ajustar a la altura del jugador
  m.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  scene.add(m);
  // si en el futuro hay animaciones: new THREE.AnimationMixer(m) + gltf.animations
});
```

Nota: el juego carga scripts sueltos; `GLTFLoader` de la carpeta `examples/js` de r128 funciona con `<script>` y crea `THREE.GLTFLoader`. Con `file://` el navegador bloquea la carga del .glb; hace falta un servidor local.

3. Para menos peso: comprimir el LOD1 con Draco/meshopt solo si se añade también `DRACOLoader`; con 473 KB no es urgente.

## 6. Recolor por especie

Los materiales llegan como `MeshStandardMaterial` con nombre. Cambiar color en tiempo de ejecución:

```js
m.traverse(o => {
  if (!o.isMesh) return;
  if (o.material.name === 'Parrot_Feathers') { o.material = o.material.clone(); o.material.color.set(especie.plumaje); }
});
```

Hoy solo hay tres zonas recoloreables (cabeza entera, manos, cuerpo). Para separar cabeza/frente/cara/pecho/pico/ojos según las notas de color de cada especie hay dos caminos:

- **A (recomendado si llegan las texturas):** usar la BaseColor original en escala de grises o con máscara RGB (R = frente, G = cara, B = pecho) y teñir en shader (`onBeforeCompile`) o generar una textura por especie.
- **B (sin texturas):** en Blender, separar la cabeza en materiales usando los vertex groups existentes (`PicoUp`, `PicoDown`, `OjoL`, `OjoR`, `Cabeza`, `Lengua`) y exportar con varios materiales (`Beak`, `Eyes`, `Feathers`…). No verificado todavía si esos grupos cubren limpiamente cada zona. No existe grupo para frente ni pecho: habría que pintarlos.

La clonación del material es necesaria para que dos especies en pantalla no compartan color.

## 7. Vittata 3D original (cotorrofiver.blend)

**Fuente:** `04_Blender_3D/cotorro_original/cotorro/cotorrofiver.blend` (se trabajó sobre una copia). Personaje = `Cube.002` (cuerpo completo con alas-mano con dedos y patas, 14.181 vértices, 28.268 tris) + su `Armature` original de 51 huesos. Se excluyeron `Cube.000` (duplicado sin rig), `Cube.001` (proxy low-poly subsurf+mirror), el metarig Rigify `rig`/`WGT-rig_root`, cámara, luces y plano. Se dejó un solo modificador Armature (había 4 duplicados). La versión anterior "cabeza original + cuerpo reconstruido" quedó descartada.

**Textura:** se usa la textura mejorada `cuerpo_Base_color_mejorada.png` (atlas limpio). Encaja directamente en el `UVMap` de `Cube.002` para ambos materiales (pico incluido); no hizo falta transferir UVs ni hornear. Los JPG viejos (ojos marrones, pico rosado) y la imagen faltante `Untitled` (`D:/descargas/loro_body.png`) no se usan. En el GLB va embebida como JPEG 1024 px.

**Salida:** `assets/models/vittata.glb` (1,31 MB), 28.268 tris, altura 1,40 m, Y-up, mira hacia +Z, patas en y=0. Materiales (nombres originales): `cuerpo` (plumas, parche rojo, anillos de los ojos, ojos, patas y garras) y `Material.001` (pico). Ambos usan el mismo atlas.

**Máscaras para recolorear:** `assets/models/vittata_masks.png` (1024 px, mismas UVs): R = parche rojo de la frente, G = anillo blanco de los ojos, B = pico. Las tres zonas son regiones separadas del atlas, así que cada especie se puede teñir en shader (`onBeforeCompile`) o generando una textura por especie.

**Rig:** 51 huesos originales + `root` nuevo (en el suelo, padre de `espalda1`; la cola `espalda1.001` pasó a ser hija de `espalda1`) + 7 huesos de montaje. Pesos limitados a 4 influencias y normalizados. Equivalencias: espalda1 = cadera, espalda2 = pecho, cabeza = cuello, cabeza.001 = cabeza; armL1/armL2/armL3 (+`.001` en el ala derecha) = brazo/antebrazo/mano, con los dedos `armL2.0xx`/`Bone.00x`; pieL1–pieL8 = pierna y dedos; espalda1.001 = cola. No hay huesos de pico ni de ojos, así que no se puede abrir el pico ni parpadear.

**Montajes** (deform=off; +Z local hacia afuera, +Y local hacia arriba; en las alas +Y va a lo largo del antebrazo): `mount_head_top` y `mount_eyes` → cabeza.001; `mount_neck`, `mount_chest` y `mount_back` → espalda2; `mount_wing_L` → armL2; `mount_wing_R` → armL2.001. Las posiciones, los ejes, la holgura frente al pico y los ojos, la esfera de la cabeza, la caja del pico y el alto del modelo están en `assets/models/vittata_mounts.json`. Todas las posiciones son de la pose de reposo (T-pose). Ojo: `mount_eyes` queda sobre el puente del pico, con solo 1,7 cm de holgura.

**Animaciones** (30 fps; todas empiezan y terminan en la pose Idle): `Idle` 3,0 s (en bucle; respira, inclina la cabeza, alas relajadas abajo), `Welcome` 2,0 s (abre las alas hacia el frente), `Celebrate` 1,5 s (salto de unos 13 cm con dos aleteos), `Curious` 2,0 s (se inclina hacia delante, ladea la cabeza y mira a los lados), `Walk` 1,0 s (en bucle, en el sitio, contoneo). En Walk y Curious las garras atraviesan el suelo como mucho entre 1 y 1,3 cm.

**Previews:** `docs/img/vittata3d_idle.png`, `vittata3d_welcome.png`, `vittata3d_celebrate.png` y `vittata3d_mounts.png`, todas renderizadas desde el GLB reimportado.

**Diferencias con la referencia:** el modelo es fiel en forma y colores: parche rojo, anillos blancos, pico y patas amarillos, alas con dedos. Hay tres diferencias: el verde es más lima/claro que en la referencia, los ojos son azules (en la referencia son marrón claro) y el parche rojo sube más hacia la coronilla. El pico es amarillo limón en vez de naranja. Todo eso viene de la textura nueva y no se repintó.

**Scripts:** `/private/tmp/claude-501/vittata_build/` (o1_prep, o3_build, s4_anim (poses), o6_final, o7_maskfix, mkjson, verify).
