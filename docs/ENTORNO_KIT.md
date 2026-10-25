# ENTORNO_KIT · Flora de El Yunque

Lámina: `docs/img/entorno_kit.png`. Scripts (Blender 4.2 sin ventana, en orden): `tools/blender/entorno_texturas.py`, `entorno_modelos.py` y `entorno_lamina.py`.

## Piezas (`assets/models/entorno/<nombre>.glb` + `<nombre>_glb.js`)
| Pieza | Alto m | Tris | Dato |
|---|---|---|---|
| palma_sierra | 8.0 | 1018 | Tras Hugo y Georges fue la que más creció en un estudio de El Yunque. |
| yagrumo | 8.0 | 1776 | Pionero: llena los claros; su envés plateado brilla con el viento. |
| tabonuco | 11.5 | 2062 | Da nombre al bosque más bajo de El Yunque. |
| helecho_arboreo | 5.3 | 902 | Un helecho del tamaño de un árbol. |
| arbol_enano | 3.4 | 1304 | En las cumbres, viento y niebla lo mantienen bajo. |
| palma_sierra_joven | 4.6 | 728 | Brota rápido en los claros. |
| yagrumo_joven | 3.7 | 1064 | De los primeros en ocupar un claro. |
| ceiba | 14.5 (copa 19) | 5674 | Sus raíces en tabla la sostienen. |
| flamboyan | 9.2 (copa 12) | 2864 | No es nativo: viene de Madagascar. |
| bambu | 7.0 | 2171 | Hierba gigante introducida. |
| heliconia | 1.7 | 352 | Los colibríes visitan sus brácteas. |
| bromelia | 0.6 | 448 | Guarda agua; el coquí pone allí sus huevos. |
| helecho_suelo | 0.6 | 312 | Se reproduce con esporas. |
| pasto | 0.5 | 56 | Sus raíces sujetan la orilla. |
| hojarasca | parche 2.1 | 36 | Los descomponedores la vuelven abono. |
| roca_musgo_a / _b | 0.7 / 0.5 | 320 | El musgo retiene agua. |
| piedras_rio | 0.3 | 360 | El agua las redondea. |
| tronco_caido | largo 4.3 | 304 | Alimenta hongos e insectos. |

Total: 2.9 MB; el .glb más pesado (ceiba) pesa 458 KB. Las variantes jóvenes comparten materiales con el adulto. `entorno_kit.json` trae ancho, KB, `radio_colision` y la `ficha` del Diario.

## Escala
La cotorra mide 1.4 m (unas 4.5 veces su tamaño real). Los árboles miden ≈1/3 de su altura real; las plantas, ≈1:1. Pivote en la base, metros, Y arriba.

## Materiales
- `HOJA_<especie>`: PNG ≤512 px con alfa (MASK 0.5 → `alphaTest: 0.5`), doble cara. Excepciones de una sola cara: yagrumo (su envés plateado es una segunda capa) y hojarasca. Las normales son esféricas: quitar `normal *= faceDirection`.
- `CORTEZA_<especie>` y `ROCA_<pieza>`: JPG con normal map, opacos.
- `COLOR_0` no es color: R = AO, G = viento (0 en la base, 1 en las puntas), B = fase.

## Instanciar
```js
const u8 = Uint8Array.from(atob(AV_ENTORNO_B64.ceiba), c => c.charCodeAt(0));
new THREE.GLTFLoader().parse(u8.buffer, '', g => g.scene.traverse(o => {
  if (!o.isMesh) return;
  o.material.vertexColors = false;   // COLOR_0 se lee en onBeforeCompile
  scene.add(new THREE.InstancedMesh(o.geometry, o.material, N)); // una por primitiva
}));
```
En el shader: `diffuse *= mix(0.12, 1.0, R)` y `pos.xz += dir * sin(t*1.7 + B*6.283 + pos.x*0.3) * G*G * amp`.

## Texturas (`assets/tex/entorno/`, horneadas en Cycles)
- Hojas `hoja_*.png`; cortezas `corteza_*.jpg` con su `_n.jpg`.
- Cuatro suelos tileables de 1024 px con normal map: `suelo_tierra_hojarasca`, `suelo_musgo`, `suelo_roca` y `suelo_arena_rio`. Repetirlos cada ≈2.2 m.
