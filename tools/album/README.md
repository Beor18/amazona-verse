# Retratos del Álbum de las 36

Retratos de tarjeta coleccionable para el «Álbum de las 36» del Diario (`src/game/album.js`), hechos con **el modelo real de
Vittata** (`assets/models/vittata.glb`, `src/personaje/character.js`) y **la piel de cada especie** (`src/personaje/pieles.js`,
`assets/textures/pieles/<id>.jpg`). No hay modelos nuevos ni cambios en el modelo o el rig: solo cambia la textura.

**Se dibujan en el juego de verdad** (canon de Kelvin, 1-nov, `docs/CANON_REGISTRY.md`: el color tal como se ve en el juego).
`retratos.js` abre `index.html?look=vibrant_toon&calidad=alto&clima=sol`, pasa Jugar → Empezar como un jugador nuevo e inyecta
`en_juego.js`: el ave sale del renderer del juego (ACES, exposición, gradación y borde de luz de `vibrant_toon`, composer con
bloom) con su sol y su cielo hemisférico; no hay luces propias. Comparación: `docs/img/retratos/comparacion_juego.jpg`
(`--comparar`): el cuadro real del juego, el jugador en el mundo con la cámara del retrato, el retrato nuevo y el anterior.

## Uso
```sh
NODE_PATH=$(npm root -g) node tools/album/retratos.js [--out carpeta] [--jpg] [--var variantes.json] [id …]   # sin ids: las 36
NODE_PATH=$(npm root -g) node tools/album/retratos.js --silueta                                             # la silueta de las cerradas
NODE_PATH=$(npm root -g) node tools/album/retratos.js --comparar docs/img/retratos/comparacion_juego.jpg    # juego frente a retrato
NODE_PATH=$(npm root -g) node tools/album/hoja.js docs/img/retratos/hoja_36.jpg [--cols 6] [id …]          # hoja de contacto
```
- Salida: `<out>/<id>.webp` (256×320, ≤ 25 KB) y `<out>/2x/<id>.webp` (512×640, ≤ 60 KB). Por defecto `assets/retratos_album/`.
  El 2x va en una carpeta y no como `<id>@2x.webp` porque la poda de la build (`tools/build/avbuild.py`, carpetas dinámicas) solo
  alcanza los archivos cuyo nombre es un token del código (el id de la especie).
- En el juego: `src/game/album.js` (`retrato()`) los pone en las tarjetas abiertas con `srcset` 1x/2x y `loading="lazy"`; solo se
  piden al abrir el Diario. Las cerradas (y Mara y Vela antes del cap. 5) llevan `silueta.webp`: la misma ave, misma pose y
  encuadre, en gris liso; es igual para las 36, así que no delata la especie. Las 36 + silueta pesan ≈ 1,4 MB en total (1x + 2x: unos 12 KB + 29 KB cada uno).
  La calidad baja sola de 0,94 en pasos de 0,04 hasta caber en el tope (`salida.maxKB1/maxKB2` en `retratos.json`).
- Chromium de Playwright (`/opt/pw-browsers/chromium`, SwiftShader). Sin descargas ni APIs. En la nube, envolver en `turno.sh`.
- `--var`: lista `[{"nombre":…, "yaw":…, "encuadre":{…}, "luces":{…}, "region":…}]` que pisa `retratos.json`; cada
  variante sale en `<out>/<nombre>/`. Sirve para afinar encuadre y luz sin tocar la configuración.
- Sale con código 2 si hubo errores de consola.

## Archivos
| Archivo | Qué hace |
|---|---|
| `retratos.json` | Todo lo común: pose, encuadre, dirección de la clave, tamaños, región de cada especie y la lista de pieles provisionales |
| `en_juego.js` | Dentro del juego: una Vittata nueva con la piel de la especie, cámara de retrato girada con el sol del juego, dibujo con el renderer del juego (sin el mundo, sin viñeta ni rayos) y fondo sacado por diferencia (negro y gris) |
| `componer.js` | Fondo de la región + ave + acabado, WebP 1x/2x, la silueta y la lámina de comparación |
| `fondos.js` | Fondos vectoriales por región (canvas 2D, con semilla: salen iguales cada vez) |
| `retratos.js` | Lanza Chromium, sirve el repo, arranca el juego y escribe los archivos |
| `hoja.html` / `hoja.js` | Hoja de contacto: la sección real del Diario (`html()` de `album.js` y su CSS) con los retratos; la de las 36 está en `docs/img/retratos/hoja_36.jpg` |

## Receta (igual para las 36)
- **Pose y encuadre:** pose `Idle` (t = 0,3), giro de ¾ (yaw −0,6), plano medio (cabeza, pecho y hombros, con aire arriba):
  cámara un poco por encima (elevación 0,08), FOV 24°, alto visible = 98 % del ave, centro al 66 % de su altura. La caja se mide
  una vez (mismo modelo y misma pose), así que las 36 salen al mismo tamaño y en la misma posición.
- **Luz:** la del juego, sin añadidos: su sol (color e intensidad de `vibrant_toon`), su cielo hemisférico, su exposición, su
  gradación y el borde de luz de los personajes. La cámara y el ave se giran juntas para que el sol quede arriba a la izquierda y
  por delante (`clave` en `retratos.json`), así las 36 tienen la misma luz. (Hasta el 4-nov llevaban una luz de 3 puntos propia;
  Kelvin pidió el verde del juego.)
- **Fondo:** cielo en degradado (cenit saturado, horizonte claro) + sol suave arriba a la izquierda (del lado de la luz clave)
  + motivo lejano de la región, desenfocado y con bruma, con el horizonte bajo para que asome a los lados + halo cálido detrás
  de la cabeza (con un 10 % del color propio de la especie, de `PALETA` en `album.js`) + dos nubes desenfocadas + sombra suave
  del ave + viñeta (solo sobre el fondo: el ave conserva el color del juego). Sin texto en la imagen (la tarjeta lleva los nombres ES/EN). Sin rarezas, brillos de «legendaria» ni marcos
  distintos: todas las tarjetas son iguales.
- **Regiones** (agrupación visual sacada del campo `distribucion` de `content/comun/especies.js`; no es un dato que se
  muestre): `caribe` (mar e islas con palmas), `centro` (México y Centroamérica: volcanes), `amazonia` (río y dosel),
  `andes` (cordillera con nieve), `atlantico` (bosque atlántico y sur: araucarias). Kelvin puede mover especies en `retratos.json`.
- Supermuestreo ×2 (render a 1024×1280) y reducción por mitades.

## Pieles provisionales (para mejorar más adelante)
Las 21 restantes salen de los `.blend` de Kelvin. Estas se pintaron después sobre el UV (`tools/pieles/`, fuentes en
`docs/equipo/pieles_fuentes/<id>.md`); la lista está en `retratos.json` → `provisionales`:
- con el render de Kelvin como guía: arausiaca, collaria, agilis, albifrons, festiva;
- hay render de Kelvin en `docs/referencias/renders_especies/` pero la nota no dice que se cotejó: finschi, lilacina, ventralis;
- solo con fuentes (sin render de Kelvin): pretrei, tucumana, vinacea, autumnalis;
- extintas, aspecto canon de Kelvin (Mara y Vela): martinicana, violacea;
- vittata: textura del modelo recoloreada al verde v4 (aprobada por Kelvin el 1-nov).

Si se repinta una piel, basta con volver a correr `retratos.js <id>`.
