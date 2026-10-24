# Guía: modelar el ropero de Amazona Verse en Blender

Objetivo: cada pieza del ropero (gorras, lentes, pañuelo, pantalones, calzado, mochilas, objetos en la mano) modelada en Blender
con calidad (biseles, suavizado, proporciones de las láminas de Kelvin), exportada como `.glb` con piel sobre el mismo esqueleto
de Vittata, para que el juego la cargue y la mueva con el personaje.

Referencias visuales (ideas, NO modelos): `~/AmazonaVerse/03_Traits_y_Fondos/Traits_PNG_2026-10-24/*.png` y
`~/AmazonaVerse/03_Traits_y_Fondos/Boricua_PNG_2026-10-24/*.png` (00_lamina_completa.png muestra todo). Estilo: caricatura
amigable para niños, formas redondeadas y limpias, nada realista ni de marcas comerciales.

## Cómo se trabaja
- Blender 4.2: `~/Applications/Blender.app/Contents/MacOS/Blender`. Siempre sin ventana y abriendo el rig:
  `cd ~ && ~/Applications/Blender.app/Contents/MacOS/Blender -b ~/AmazonaVerse/04_Blender_3D/vittata_rig_final.blend --python ~/AmazonaVerse/Juego/tools/blender/ropa_<pieza>.py`
  (no guardes encima de `vittata_rig_final.blend`).
- Librería común: `tools/blender/ropa_lib.py` (léela). Funciones: `mat(name,color)`, `hexrgb('#rrggbb')`, `lathe`, `tube_between`,
  `wrap_outside`, `weights_from_body`, `limb_weights`, `rigid(obj, bone)`, `join`, `cyl_uv`, `shade_smooth`, `add_armature`,
  `export([objs], nombre)` (escribe `assets/models/ropa/<nombre>.glb` y `<nombre>_glb.js`), `preview([objs], nombre, views)`
  (renders en `tests/out/ropa/`). Ejemplo completo: `tools/blender/ropa_camisa.py`.
- Un script por pieza o por familia: `tools/blender/ropa_<familia>.py`. Revisa SIEMPRE los renders de `preview` (frente y lado)
  con el cuerpo visible antes de dar algo por bueno; corrige lo que atraviese la cabeza, los ojos, el pico o el cuerpo.
- Mira el resultado de cada render con la herramienta de leer imágenes. Si la pieza no se distingue del cuerpo, dale un color
  de prueba distinto en Blender (el juego pone el color final).

## Sistema de coordenadas (Blender, en metros)
Z arriba, el personaje mira hacia **-Y**, pies en z=0, alto 1.40. Pose de reposo = pose T (brazos horizontales en ±X).
(Equivalencias con glTF/juego: x = x, z_blender = y_gltf, y_blender = -z_gltf.)

| Parte | Medidas |
|---|---|
| Cabeza | tope z=1.40; a z=1.385 ancho ±0.113, y de -0.045 (frente) a +0.149; z=1.35 ±0.155, y -0.112…+0.19; z=1.315 ±0.208, y -0.156…+0.239; z=1.28 ±0.223, y -0.21…+0.375 (atrás hay un mechón de plumas); z=1.245 ±0.248; z=1.21 ±0.259, y -0.219 frente |
| Ojos (pintados, sobresalen 2.2 cm) | centros (±0.150, -0.105, 1.200), radio 0.066; normal hacia afuera (±0.446, -0.893, -0.058). Nada debe tocarlos salvo lentes, que van POR FUERA (>1 cm). El anillo del ojo llega a z≈1.27. |
| Pico | tope z=1.187, punta al frente y=-0.445; mandíbula inferior se mueve (hueso `pico`). No tapar el pico. |
| Montajes | cabeza arriba (0, -0.078, 1.375); ojos (0, -0.216, 1.203); cuello (0, -0.176, 0.663); pecho (0, -0.221, 0.566); espalda (0, +0.092, 0.628) |
| Cuello | z 0.66–0.74: medio ancho ≈0.09, centro y≈-0.03, medio fondo ≈0.13 |
| Torso | ver perfil `T` en ropa_camisa.py (z 0.29–0.70); espalda en z≈0.5 está en y≈+0.2 |
| Patas (izq. = +X; der. espejo) | cadera (0.140, -0.062, 0.319) → rodilla (0.170, -0.045, 0.237) → tobillo alto (0.174, 0.017, 0.189) → tobillo (0.195, -0.001, 0.042). Dedos: 2 adelante hasta y=-0.224 y 2 atrás hasta y=+0.13; ancho del pie x 0.112–0.235; z 0–0.19 |
| Brazo izq. (pose T) | hombro (0.162, -0.017, 0.670) → codo (0.380, -0.010, 0.644) → muñeca (0.608, 0, 0.689); mano ≈ (0.70, -0.05, 0.688), dedos hasta x≈0.80. El puño agarra a lo largo de **-Y** (adelante). |

## Huesos (nombres de Blender)
`cabeza.001` (cabeza, para gorras y lentes), `cabeza` (cuello), `espalda2` (pecho/espalda alta), `espalda1` (cadera),
`pieL1/pieL2/pieL3` (pierna izquierda: muslo, rodilla, tarso) y `pieL1.001/pieL2.001/pieL3.001` (derecha),
`armL1/armL2` (brazo izq.: hombro, antebrazo) y `armL1.001/armL2.001` (derecho). Piezas rígidas: `rigid(obj, 'cabeza.001')`
(o el hueso que toque). Pieza con dos lados (zapatos): un objeto por lado, `rigid` a su hueso, luego `join`.

## Materiales (el juego los cambia por NOMBRE)
- `TELA` → recibe el color y el estampado que elige el jugador (bandera PR, hawaiana, coquí, camuflaje…). Necesita UV:
  usa `cyl_uv(obj)` (frente en u=0.5) o una UV propia razonable.
- `ACENTO` → recibe el color elegido (sin estampado).
- `PAJA` → textura de paja del juego.
- `VIDRIO` → el juego lo vuelve transparente (lentes).
- Cualquier otro nombre (p. ej. `CUERO_OSCURO`, `METAL`, `SUELA`, `MADERA`, `BLANCO`) conserva el color que le pongas en Blender
  con `mat('NOMBRE', hexrgb('#…'), rough, metal)`.

## Calidad que se espera
- Formas con volumen y grosor (Solidify), bordes biselados (Bevel), Subdivision Surface nivel 1–2 aplicada, shade smooth.
- Detalles que se lean a distancia: costuras/ribetes como tubos finos, botones, hebillas, suela separada, cordones simples.
- Presupuesto: ≤ 6 000 triángulos por pieza (≤ 10 000 si son dos zapatos); archivos `.glb` ≤ 600 KB.
- Las piezas rígidas NO deben atravesar la cabeza: siéntalas por fuera de las medidas de arriba (unos 5–8 mm de holgura).

## Entrega
- Archivos: `assets/models/ropa/<nombre>.glb` (+ `<nombre>_glb.js`, lo crea `export`), script en `tools/blender/`,
  renders en `tests/out/ropa/<nombre>_*.png`.
- No toques `game.js`, `character.js` ni `wardrobe.js` (los integra el coordinador). Disco casi lleno: no generes archivos grandes
  fuera de lo pedido, borra temporales.
